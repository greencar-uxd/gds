'use strict';
/**
 * 원본(canon) + 확정 결정(data/color-decisions.json) 을 합친 단일 뷰.
 * 토큰 생성 · 통폐합 매핑 · 사이트 · 검증이 전부 이걸 통해서만 원본 색을 읽습니다.
 * (원본 .fig 는 View 권한이라 고칠 수 없으므로, 결정은 추출 결과 위에 덮어씁니다)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const DEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
// 원본의 근거는 «GDS (그린카 디자인 시스템)» 라이브러리입니다 — ✅ 페이지의 스와치 그림이 아닙니다.
// 그림에는 흰색(Map Marker/Active)처럼 안 보이는 색이 빠져 있었습니다. 강민관 지시 2026-08-05.
const LIB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gds-library.json'), 'utf8'));
const GAPS = (() => {
  const p = path.join(ROOT, 'data', 'gds-gaps.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();

const renameMap = new Map();
for (const r of DEC.renames) {
  if (r.status !== 'confirmed') continue;
  renameMap.set(r.from, r);
}

const libFill = LIB.fill.map(s => ({ name: s.name, hex: s.hex, group: s.group, label: s.name.split('/').pop() }));

// 저장소 안에서의 재정의 — 원본 .fig 는 고치지 않으므로 여기서 적용합니다.
//  splits       한 스타일을 불투명도 단계로 나눔 (CQ-9 · Dim Layer 060/080)
//  canonRetires 원본 이름 하나를 다른 원본 토큰으로 흡수 (CQ-9 · Info Box BG)
const splits = (DEC.splits || []).filter(s => s.status === 'confirmed');
const canonRetires = (DEC.canonRetires || []).filter(r => r.status === 'confirmed');
const splitFrom = new Set(splits.map(s => s.token));
const retiredNames = new Set(canonRetires.map(r => r.token));
const splitMissing = splits.filter(s => !libFill.some(x => x.name === s.token)).map(s => s.token);
const retireMissing = canonRetires.filter(r => !libFill.some(x => x.name === r.token)).map(r => r.token);

const raw = libFill
  .filter(s => !splitFrom.has(s.name) && !retiredNames.has(s.name))
  .concat(splits.flatMap(s => s.into.map(t => ({
    name: t.token, hex: t.hex, alpha: t.alpha,
    group: s.token.split('/')[0], label: t.token.split('/').pop(),
    splitFrom: s.token, splitId: s.id,
  }))));
// 흡수 대상이 실제로 원본에 있는지 — 없으면 결정 파일이 낡은 것입니다.
const retireTargetMissing = canonRetires.filter(r => !raw.some(x => x.name === r.into)).map(r => r.into);
// ✅ 스와치 그림에서 뽑았던 옛 목록 — 무엇이 빠져 있었는지 보여주려고만 둡니다.
const swatchOnly = (((D.canon || {}).color || {}).styles) || [];
const missedBySwatch = libFill.filter(s => !swatchOnly.some(x => x.name === s.name)).map(s => s.name);

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

// 결정이 가리키는 이름이 실제로 원본에 있는지 — 없으면 결정 파일이 낡은 것입니다.
const missing = [...renameMap.keys()].filter(n => !raw.some(s => s.name === n));
const hexMismatch = [];
for (const r of renameMap.values()) {
  const s = raw.find(x => x.name === r.from);
  if (s && r.hex && s.hex.toUpperCase() !== r.hex.toUpperCase()) hexMismatch.push({ ...r, actual: s.hex });
}

// 추가 편입 (data/color-decisions.json · additions) — 원본 Figma 변수에는 있는데
// 원본 추출본에 빠져 있던 것들. 스냅샷은 data/figma-variables.json 이며 여기와 대조합니다.
const FIGVARS = (() => {
  const p = path.join(ROOT, 'data', 'figma-variables.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
const additions = DEC.additions || [];
// 편입은 변수 1개 → 토큰 1개가 기본이지만, 하나의 변수가 원본 스와치에서
// 불투명도로 갈라져 있으면 tokens[] 로 여러 토큰을 만듭니다 (CQ-9 · Dim Layer 060/080).
const expand = a => (a.tokens && a.tokens.length)
  ? a.tokens.map(t => ({ ...a, ...t, multi: true }))
  : [a];
const adopted = additions.filter(a => a.action === 'adopt' && a.status === 'confirmed').flatMap(expand);
// 결정이 실재하지 않는 변수를 가리키면 파일이 낡은 것입니다.
const additionUnknown = FIGVARS
  ? additions.filter(a => !(a.sourceName in FIGVARS.variables)).map(a => a.sourceName) : [];
// alphaSource 가 붙은 항목은 불투명도가 변수가 아니라 원본 스와치에서 온 것이라
// 8자리 HEX 의 앞 6자리(원색)만 원본과 대조합니다.
const baseHex = a => (a.alphaSource ? a.hex.slice(0, 7) : a.hex).toUpperCase();
const additionStale = FIGVARS
  ? additions.flatMap(expand).filter(a => (a.sourceName in FIGVARS.variables)
      && String(FIGVARS.variables[a.sourceName]).toUpperCase() !== baseHex(a))
      .map(a => `${a.sourceName} ${a.hex}≠${FIGVARS.variables[a.sourceName]}`) : [];
// 편입한 이름이 이미 원본에 있으면 충돌입니다.
const additionCollision = adopted.filter(a => raw.some(s => s.name === a.token)).map(a => a.token);

const colors = raw.concat(adopted.map(a => ({
  name: a.token, hex: a.hex, label: a.token.split('/').pop(),
  added: true, sourceName: a.sourceName, additionId: a.id,
  alpha: a.alpha != null ? a.alpha : null, nameDerived: !!a.nameDerived,
}))).map(s => {
  const r = renameMap.get(s.name);
  const ov = overrideMap.get(s.name);
  const finalName = r ? r.to : s.name;
  return {
    ...s,
    hex: ov ? ov.to : s.hex,
    originalHex: ov ? ov.from : null,
    overridden: !!ov,
    overrideReason: ov ? ov.reason : null,
    name: finalName,
    // 그룹·라벨은 «바뀐 이름»에서 다시 뽑습니다.
    // 그룹을 넘나드는 개명(Badge/ODA → Brand/ODA)이 생기면서 필요해졌습니다 —
    // 원본 그룹을 그대로 들고 있으면 사이트는 Brand 로 부르면서 데이터는 Badge 로 남습니다.
    group: finalName.includes('/') ? finalName.split('/')[0] : (s.group || ''),
    label: finalName.split('/').pop(),
    originalName: s.name,
    originalGroup: s.name.includes('/') ? s.name.split('/')[0] : (s.group || ''),
    renamed: !!r,
    regrouped: !!r && r.to.split('/')[0] !== s.name.split('/')[0],
    renameReason: r ? r.reason : null,
    isMain: DEC.main && DEC.main.status === 'confirmed' && finalName === DEC.main.token,
  };
});

const mainStyle = colors.find(c => c.isMain) || null;

module.exports = {
  D, DEC, LIB, GAPS, colors, mainStyle, missedBySwatch,
  canonBasis: DEC.canonBasis || null,
  libFill, splits, canonRetires,
  roles: (DEC.roles && DEC.roles.status === 'confirmed') ? DEC.roles : null,
  semantic: (DEC.semantic && DEC.semantic.status === 'confirmed') ? DEC.semantic : null,
  // 시맨틱 토큰이 가리키는 원본 이름이 실재하는지 — 없으면 빌드를 세웁니다.
  semanticMissing: (DEC.semantic ? DEC.semantic.tokens : [])
    .filter(t => !colors.some(c => c.name === t.ref)).map(t => `${t.token}→${t.ref}`),
  structure: (() => { const p = path.join(ROOT, 'data', 'gds-structure.json');
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; })(),
  layout: (() => { const p = path.join(ROOT, 'data', 'layout-tokens.json');
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; })(),
  // 차기 라이브러리에 넣을 텍스트 스타일 21종 — 저장소가 먼저 만들고 원본에 반영합니다.
  typeLib: (() => { const p = path.join(ROOT, 'data', 'typography-library.json');
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; })(),
  // 효과 분류 — Elevation 밖 그림자·블러 (tools/build-effects.js).
  effects: (() => { const q = path.join(ROOT, 'data', 'effects.json');
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; })(),
  // 색 별칭 · 면색/선색 짝 — 값이 겹치는 이름을 이은 것 (tools/build-color-aliases.js).
  colorAliases: (() => { const q = path.join(ROOT, 'data', 'color-aliases.json');
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; })(),
  // 아이콘 — 분류는 Guidelines, 치수는 컴포넌트 페이지에 흩어져 있던 것 (tools/build-icons.js).
  icons: (() => { const q = path.join(ROOT, 'data', 'icons.json');
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; })(),
  // 컴포넌트 목록 — 구조도 25종 + 실측 (tools/build-components.js).
  components: (() => { const q = path.join(ROOT, 'data', 'components.json');
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; })(),
  // 🚧 페이지를 직접 읽은 결과 — «🚧 = 빈 페이지»가 아님을 Icon 에서 확인한 뒤 전수 확인 중입니다.
  pages: (() => {
    const load = f => { const q = path.join(ROOT, 'data', f);
      return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; };
    const dir = path.join(ROOT, 'data', 'figma-pages');
    const read = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
    return {
      elevation: load('elevation-page.json'),
      radius: load('radius-page.json'),
      textField: load('textfield-page.json'),
      readSlugs: read.map(f => f.replace(/\.json$/, '')),
    };
  })(),
  // 간격 쓰임새 조사 — ✅ 페이지의 «Spacing» 주석을 기계로 읽은 것 (tools/spacing-census.js).
  spacingCensus: (() => { const q = path.join(ROOT, 'data', 'spacing-census.json');
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; })(),
  // 타이포 시맨틱 — ✅ Type scale 의 Usage 열에서 계산했습니다 (tools/build-typography-semantic.js).
  typeSemantic: (() => { const p = path.join(ROOT, 'data', 'typography-semantic.json');
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; })(),
  excludedLibraries: LIB.excludedLibraries || [],
  renames: [...renameMap.values()],
  integrity: { missing, hexMismatch, overrideMissing, overrideStale, additionUnknown, additionStale, additionCollision, splitMissing, retireMissing, retireTargetMissing },
  figmaSync: DEC.figmaSync || null,
  figmaVariables: FIGVARS,
  additions, adopted,
  // 원본에 없던 Figma 변수 전체 — 색은 additions, 그 외(자간 등)는 type-decisions 에서 처분합니다.
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
  orphanDispositions: [],  // 철회 — 레거시 기반 판정이었습니다
};
