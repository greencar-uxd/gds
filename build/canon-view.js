'use strict';
/**
 * 정본(canon) + 확정 결정(data/color-decisions.json) 을 합친 단일 뷰.
 * 토큰 생성 · 통폐합 매핑 · 사이트 · 검증이 전부 이걸 통해서만 정본 색을 읽습니다.
 * (원본 .fig 는 View 권한이라 고칠 수 없으므로, 결정은 추출 결과 위에 덮어씁니다)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const DEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));

const renameMap = new Map();
for (const r of DEC.renames) {
  if (r.status !== 'confirmed') continue;
  renameMap.set(r.from, r);
}

const raw = (((D.canon || {}).color || {}).styles) || [];

// 값 교체 (data/color-decisions.json · valueOverrides) — 원본 .fig 를 못 고치므로 여기서 덮어씁니다.
const overrideMap = new Map();
for (const o of (DEC.valueOverrides || [])) {
  if (o.status !== 'confirmed') continue;
  overrideMap.set(o.token, o);
}
const overrideMissing = [...overrideMap.keys()].filter(n => !raw.some(s => s.name === n));
const overrideStale = [...overrideMap.values()].filter(o => {
  const s = raw.find(x => x.name === o.token);
  return s && s.hex.toUpperCase() !== o.from.toUpperCase();
});

// 결정이 가리키는 이름이 실제로 정본에 있는지 — 없으면 결정 파일이 낡은 것입니다.
const missing = [...renameMap.keys()].filter(n => !raw.some(s => s.name === n));
const hexMismatch = [];
for (const r of renameMap.values()) {
  const s = raw.find(x => x.name === r.from);
  if (s && r.hex && s.hex.toUpperCase() !== r.hex.toUpperCase()) hexMismatch.push({ ...r, actual: s.hex });
}

// 추가 편입 (data/color-decisions.json · additions) — 원본 Figma 변수에는 있는데
// 정본 추출본에 빠져 있던 것들. 스냅샷은 data/figma-variables.json 이며 여기와 대조합니다.
const FIGVARS = (() => {
  const p = path.join(ROOT, 'data', 'figma-variables.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
const additions = DEC.additions || [];
// 편입은 변수 1개 → 토큰 1개가 기본이지만, 하나의 변수가 정본 스와치에서
// 불투명도로 갈라져 있으면 tokens[] 로 여러 토큰을 만듭니다 (CQ-9 · Dim Layer 060/080).
const expand = a => (a.tokens && a.tokens.length)
  ? a.tokens.map(t => ({ ...a, ...t, multi: true }))
  : [a];
const adopted = additions.filter(a => a.action === 'adopt' && a.status === 'confirmed').flatMap(expand);
// 결정이 실재하지 않는 변수를 가리키면 파일이 낡은 것입니다.
const additionUnknown = FIGVARS
  ? additions.filter(a => !(a.sourceName in FIGVARS.variables)).map(a => a.sourceName) : [];
// alphaSource 가 붙은 항목은 불투명도가 변수가 아니라 정본 스와치에서 온 것이라
// 8자리 HEX 의 앞 6자리(원색)만 원본과 대조합니다.
const baseHex = a => (a.alphaSource ? a.hex.slice(0, 7) : a.hex).toUpperCase();
const additionStale = FIGVARS
  ? additions.flatMap(expand).filter(a => (a.sourceName in FIGVARS.variables)
      && String(FIGVARS.variables[a.sourceName]).toUpperCase() !== baseHex(a))
      .map(a => `${a.sourceName} ${a.hex}≠${FIGVARS.variables[a.sourceName]}`) : [];
// 편입한 이름이 이미 정본에 있으면 충돌입니다.
const additionCollision = adopted.filter(a => raw.some(s => s.name === a.token)).map(a => a.token);

const colors = raw.concat(adopted.map(a => ({
  name: a.token, hex: a.hex, label: a.token.split('/').pop(),
  added: true, sourceName: a.sourceName, additionId: a.id,
  alpha: a.alpha != null ? a.alpha : null, nameDerived: !!a.nameDerived,
}))).map(s => {
  const r = renameMap.get(s.name);
  const ov = overrideMap.get(s.name);
  return {
    ...s,
    hex: ov ? ov.to : s.hex,
    originalHex: ov ? ov.from : null,
    overridden: !!ov,
    overrideReason: ov ? ov.reason : null,
    name: r ? r.to : s.name,
    originalName: s.name,
    renamed: !!r,
    renameReason: r ? r.reason : null,
    isMain: DEC.main && DEC.main.status === 'confirmed' && (r ? r.to : s.name) === DEC.main.token,
  };
});

const mainStyle = colors.find(c => c.isMain) || null;

module.exports = {
  D, DEC, colors, mainStyle,
  renames: [...renameMap.values()],
  integrity: { missing, hexMismatch, overrideMissing, overrideStale, additionUnknown, additionStale, additionCollision },
  figmaSync: DEC.figmaSync || null,
  figmaVariables: FIGVARS,
  additions, adopted,
  // 정본에 없던 Figma 변수 전체 — 색은 additions, 그 외(자간 등)는 type-decisions 에서 처분합니다.
  undocumented: FIGVARS ? Object.keys(FIGVARS.variables).filter(n => !raw.some(s => s.name === n)) : [],
  typeHandled: (() => {
    if (!FIGVARS) return [];
    const TD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
    const out = [];
    for (const [k, v] of Object.entries(TD)) {
      if (!v || typeof v !== 'object' || typeof v.evidence !== 'string') continue;
      for (const n of Object.keys(FIGVARS.variables)) {
        if (v.evidence.includes(n)) out.push({ sourceName: n, value: FIGVARS.variables[n], field: k, note: v.note, status: v.status });
      }
    }
    return out;
  })(),
  deferredAdditions: additions.filter(a => a.action === 'defer'),
  retiredAdditions: additions.filter(a => a.action === 'retire' && a.status === 'confirmed'),
  // drop — 치환 대상 없이 폐기. 레거시 사용이 0건이라 옮길 곳이 없는 경우입니다.
  droppedAdditions: additions.filter(a => a.action === 'drop' && a.status === 'confirmed'),
  sourceDefects: DEC.sourceDefects || null,
  valueOverrides: [...overrideMap.values()],
  openDecisions: (DEC.open || []).filter(o => o.status === 'open'),
  closedDecisions: (DEC.open || []).filter(o => o.status === 'closed'),
  stepExceptions: (DEC.rules.stepExceptions && DEC.rules.stepExceptions.status === 'confirmed')
    ? DEC.rules.stepExceptions : null,
  orphanDispositions: (DEC.orphanDispositions || []).filter(o => o.status === 'confirmed'),
};
