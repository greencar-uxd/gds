'use strict';
// 정본(canon) → 개발자 배포용 토큰 파일 (CSS / SCSS / JSON)
// 확정되지 않았거나 충돌하는 값은 내보내지 않고, 주석으로 이유를 남깁니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const C = D.canon;
const OUT = path.join(ROOT, 'dist', 'tokens');

// "Gray Scale/Gray 000" → gray-000  (연속 중복 낱말 제거)
function slug(s) {
  const parts = String(s).toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ').trim().split(/\s+/);
  const out = [];
  for (const p of parts) if (!out.includes(p)) out.push(p);
  return out.join('-');
}

// ---------- 색 ----------
// 확정 결정(data/color-decisions.json)이 적용된 뷰를 씁니다 — 원본 .fig 는 고칠 수 없습니다.
const VIEW = require('./canon-view.js');
if (VIEW.integrity.missing.length) {
  throw new Error(`color-decisions.json 이 낡았습니다 — 정본에 없는 이름: ${VIEW.integrity.missing.join(', ')}`);
}
if (VIEW.integrity.hexMismatch.length) {
  throw new Error(`color-decisions.json 의 HEX 가 정본과 다릅니다: ${VIEW.integrity.hexMismatch.map(h => `${h.from} ${h.hex}≠${h.actual}`).join(', ')}`);
}
if (VIEW.integrity.overrideMissing.length || VIEW.integrity.overrideStale.length) {
  throw new Error(`valueOverrides 가 정본과 어긋납니다 — 없는 토큰: ${VIEW.integrity.overrideMissing.join(', ')} · 원본 값 불일치: ${VIEW.integrity.overrideStale.map(o => o.token).join(', ')}`);
}
if (VIEW.integrity.additionUnknown.length) {
  throw new Error(`additions 가 Figma 변수 스냅샷에 없는 이름을 가리킵니다: ${VIEW.integrity.additionUnknown.join(', ')}`);
}
if (VIEW.integrity.additionStale.length) {
  throw new Error(`additions 의 값이 Figma 원본과 다릅니다: ${VIEW.integrity.additionStale.join(', ')}`);
}
if (VIEW.integrity.additionCollision.length) {
  throw new Error(`additions 의 편입 이름이 이미 정본에 있습니다: ${VIEW.integrity.additionCollision.join(', ')}`);
}
const STEP_EXC = new Set(VIEW.stepExceptions ? VIEW.stepExceptions.value : []);
const colors = VIEW.colors.map(s => {
  const [group, name] = s.name.includes('/') ? [s.name.split('/')[0], s.name.split('/').slice(1).join('/')] : ['', s.name];
  return {
    key: slug(group + ' ' + name), name: s.name, group, hex: s.hex,
    was: s.renamed ? s.originalName : null, isMain: s.isMain,
    stepException: STEP_EXC.has(s.name),
    wasHex: s.overridden ? s.originalHex : null,
    added: !!s.added, sourceName: s.sourceName || null,
    alpha: s.alpha != null ? s.alpha : null,
    nameDerived: !!s.nameDerived,
  };
});
// 같은 키가 겹치면 뒤에 번호를 붙이지 않고 그대로 노출(중복은 정리 대상이므로 숨기지 않습니다)
const colorDupKeys = colors.map(c => c.key).filter((k, i, a) => a.indexOf(k) !== i);

// ---------- 타이포 ----------
const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const FONT = TDEC.fontFamily && TDEC.fontFamily.status === 'confirmed' ? TDEC.fontFamily : null;
const LH = TDEC.lineHeight && TDEC.lineHeight.status === 'confirmed' ? TDEC.lineHeight : null;
// Figma Auto == CSS line-height:normal (둘 다 폰트 메트릭 기준). iOS/Android 도 기본값이 이에 해당합니다.
const LH_CSS = LH && LH.value === 'Auto' ? 'normal' : (LH ? LH.value : null);
const LS = TDEC.letterSpacing && TDEC.letterSpacing.status === 'confirmed' ? TDEC.letterSpacing : null;
const USAGE = TDEC.usage && TDEC.usage.status === 'confirmed' ? TDEC.usage.map : null;
if (USAGE) {
  const missing = (C.typography.scale || []).map(t => t.token).filter(t => !USAGE[t]);
  if (missing.length) throw new Error(`type-decisions.json 의 usage 에 빠진 토큰: ${missing.join(', ')}`);
}
const types = (C.typography.scale || []).map(t => ({
  key: slug(t.token), token: t.token, size: t.size,
  weight: /Bold/i.test(t.weight || '') ? 700 : /Medium/i.test(t.weight || '') ? 500 : 400,
  lineHeight: t.lineHeight,
  usage: USAGE ? USAGE[t.token] : null,
}));

// ---------- 간격 ----------
const spConflict = new Set((C.spacing.conflicts || []).map(c => c.token));
const spacing = (C.spacing.scale || []).map(s => ({ token: s.token, px: s.px, conflict: spConflict.has(s.token) }));

// ---------- 반경 ----------
const radius = [
  { key: '4', px: 4 }, { key: '8', px: 8 }, { key: '10', px: 10 },
  { key: '12', px: 12 }, { key: '16', px: 16 }, { key: '20', px: 20 },
  { key: 'full', px: 9999 },
];

// ---------- 엘리베이션 ----------
const E = C.elevation;
const shadowCss = st => st.layers
  .map(l => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(0,0,0,${l.alpha})`).join(', ');
const elevation = E ? E.scale.map(st => ({ key: st.name.replace(/^Elevation_/, ''), name: st.name, was: st.was, value: shadowCss(st), layers: st.layers })) : [];

const HEAD = `/* GDS — 그린카 디자인 시스템 토큰
 * 생성: ${D.meta.source} (export ${String(D.meta.exported).slice(0, 10)})
 * 출처: ✅ Foundation 페이지 정본. 레거시 스타일(현황)은 포함하지 않습니다.
 * 자동 생성 파일입니다 — 직접 수정하지 마세요.
 */`;

// ---------- CSS ----------
let css = HEAD + '\n:root {\n  /* Color */\n';
for (const c of colors) {
  const notes = [];
  if (colorDupKeys.includes(c.key)) notes.push('⚠ 키 중복 — 원본 스타일명 정리 필요');
  if (c.was) notes.push(`구 ${c.was}`);
  if (c.isMain) notes.push('메인 색상');
  if (c.stepException) notes.push('보조 단계 — 10단위 규칙 예외(승인됨)');
  if (c.wasHex) notes.push(`구 값 ${c.wasHex} — 명도 순서 정정`);
  if (c.added) notes.push(`Figma 변수 ${c.sourceName} 편입${c.nameDerived ? ' · 이름은 표기 규칙 적용' : ''}`);
  if (c.alpha != null) notes.push(`알파 ${Math.round(c.alpha * 100)}%`);
  css += `  --gds-color-${c.key}: ${c.hex};${notes.length ? `  /* ${notes.join(' · ')} */` : ''}\n`;
}
if (VIEW.mainStyle) {
  css += `  --gds-color-primary-main: var(--gds-color-${slug(VIEW.mainStyle.name.replace('/', ' '))});`
    + `  /* = ${VIEW.mainStyle.name} ${VIEW.mainStyle.hex} · 강민관 확정 ${VIEW.DEC.decidedAt} */\n`;
}
css += '\n  /* Typography */\n';
if (FONT) {
  css += `  --gds-font-family: "${FONT.value}", sans-serif;`
    + `  /* 정본 폰트 단일 · 강민관 확정 ${TDEC.decidedAt} */\n`;
}
if (LH) css += `  --gds-type-line-height: ${LH_CSS};  /* 행간 = Figma ${LH.value} · 팀 합의 ${TDEC.decidedAt} — 단계별 값을 따로 두지 않습니다 */\n`;
if (LS) css += `  --gds-type-letter-spacing: ${LS.value === '0' ? '0' : LS.value};  /* 자간 — Figma 변수 typo/letter-spacing/0 · 단계별 값을 따로 두지 않습니다 */\n`;
for (const t of types) {
  css += `  --gds-type-${t.key}-size: ${t.size}px;${t.usage ? `  /* ${t.usage.join(' · ')} */` : ''}\n`;
  css += `  --gds-type-${t.key}-weight: ${t.weight};\n`;
}
css += '\n  /* Spacing */\n';
const spDone = new Set();
for (const s of spacing) {
  if (s.conflict) {
    if (spDone.has(s.token)) continue;
    spDone.add(s.token);
    const vals = ((C.spacing.conflicts.find(c => c.token === s.token) || {}).values || []).join('px / ');
    css += `  /* ⚠ ${s.token}: ${vals}px — 같은 이름이 두 값을 가져 어느 쪽이 옳은지 판단 불가. 이름 정리 후 출력합니다. */\n`;
    continue;
  }
  css += `  --gds-spacing-${slug(s.token).replace(/^spacing-/, '')}: ${s.px}px;\n`;
}
css += '\n  /* Radius */\n';
for (const r of radius) css += `  --gds-radius-${r.key}: ${r.px === 9999 ? '9999px' : r.px + 'px'};\n`;
css += '\n  /* Elevation */\n';
if (elevation.length) {
  css += `  /* ${E.renumbered ? '재넘버링 반영됨 — 구 1~5 → 2~6, 신규 1 추가' : ''} */\n`;
  for (const e of elevation) css += `  --gds-elevation-${e.key}: ${e.value};${e.was ? `  /* 구 ${e.was} */` : '  /* 신규 */'}\n`;
} else {
  css += '  /* 데이터 없음 */\n';
}
css += '}\n';

// ---------- SCSS ----------
let scss = HEAD + '\n';
for (const c of colors) scss += `$gds-color-${c.key}: ${c.hex};${c.isMain ? '  // 메인 색상' : ''}\n`;
if (VIEW.mainStyle) scss += `$gds-color-primary-main: $gds-color-${slug(VIEW.mainStyle.name.replace('/', ' '))};\n`;
scss += '\n';
if (FONT) scss += `$gds-font-family: "${FONT.value}", sans-serif;\n`;
if (LH) scss += `$gds-type-line-height: ${LH_CSS};\n`;
if (LS) scss += `$gds-type-letter-spacing: ${LS.value};\n`;
for (const t of types) scss += `$gds-type-${t.key}-size: ${t.size}px;\n$gds-type-${t.key}-weight: ${t.weight};\n`;
scss += '\n';
for (const s of spacing) if (!s.conflict) scss += `$gds-spacing-${slug(s.token).replace(/^spacing-/, '')}: ${s.px}px;\n`;
scss += '\n';
for (const r of radius) scss += `$gds-radius-${r.key}: ${r.px === 9999 ? '9999px' : r.px + 'px'};\n`;
scss += '\n';
for (const e of elevation) scss += `$gds-elevation-${e.key}: ${e.value};\n`;

// ---------- JSON (DTCG 형태) ----------
const json = {
  $description: 'GDS 정본 토큰 — ✅ Foundation 페이지 기준',
  color: {}, type: {}, spacing: {}, radius: {}, elevation: {},
  $notes: {
    excluded: [],
    elevationRenumbered: E ? E.renumbered : false,
    conflicts: C.spacing.conflicts || [],
    colorKeyDuplicates: [...new Set(colorDupKeys)],
  },
};
for (const c of colors) {
  json.color[c.key] = {
    $value: c.hex, $type: 'color', $description: c.name,
    $extensions: {
      gds: {
        status: 'confirmed',
        ...(c.was ? { renamedFrom: c.was, renamedAt: VIEW.DEC.decidedAt } : {}),
        ...(c.isMain ? { role: 'primary-main' } : {}),
        ...(c.stepException ? { stepException: true } : {}),
        ...(c.wasHex ? { valueChangedFrom: c.wasHex, valueChangedAt: VIEW.DEC.decidedAt } : {}),
        ...(c.added ? { addedFromFigmaVariable: c.sourceName, addedAt: (VIEW.figmaSync || {}).checkedAt, nameDerived: c.nameDerived } : {}),
        ...(c.alpha != null ? { alpha: c.alpha } : {}),
      },
    },
  };
}
if (VIEW.mainStyle) {
  json.color.$main = {
    $value: `{color.${slug(VIEW.mainStyle.name.replace('/', ' '))}}`,
    $type: 'color',
    $description: `메인 색상 — ${VIEW.mainStyle.name} (${VIEW.mainStyle.hex}). ${VIEW.DEC.main.note}`,
  };
}
json.$notes.colorDecisions = {
  decidedBy: VIEW.DEC.decidedBy, decidedAt: VIEW.DEC.decidedAt,
  stepRule: VIEW.DEC.rules.step.value, canonBasis: VIEW.canonBasis && VIEW.canonBasis.value,
  stepExceptions: VIEW.stepExceptions ? VIEW.stepExceptions.value : [],
  valueOverrides: VIEW.valueOverrides.map(o => ({ token: o.token, from: o.from, to: o.to })),
  closed: VIEW.closedDecisions.map(o => ({ id: o.id, resolution: o.resolution })),
  renames: VIEW.renames.map(r => ({ from: r.from, to: r.to })),
  open: VIEW.openDecisions.map(o => ({ id: o.id, question: o.question })),
  figmaSync: VIEW.figmaSync,
  additions: VIEW.additions.map(a => ({ id: a.id, sourceName: a.sourceName, hex: a.hex, action: a.action, token: a.token || a.target || null, status: a.status })),
  sourceDefects: VIEW.sourceDefects ? VIEW.sourceDefects.items.map(d => ({ id: d.id, problem: d.problem })) : [],
};
for (const t of types) json.type[t.key] = {
  $value: {
    ...(FONT ? { fontFamily: FONT.value } : {}),
    fontSize: `${t.size}px`, fontWeight: t.weight,
    lineHeight: LH_CSS || t.lineHeight,
    ...(LS ? { letterSpacing: LS.value } : {}),
  },
  $type: 'typography',
  $description: t.usage ? `${t.token} — ${t.usage.join(' · ')}` : t.token,
  $extensions: {
    gds: {
      status: 'confirmed',
      ...(LH ? { lineHeightSource: `Figma ${LH.value}` } : {}),
      ...(t.usage ? { usage: t.usage } : {}),
    },
  },
};
if (FONT) json.$notes.fontFamily = { value: FONT.value, single: FONT.single, decidedBy: TDEC.decidedBy, decidedAt: TDEC.decidedAt, note: FONT.note };
if (LH) json.$notes.lineHeight = { value: LH.value, css: LH_CSS, decidedBy: TDEC.decidedBy, decidedAt: TDEC.decidedAt, note: LH.note };
if (LS) json.$notes.letterSpacing = { value: LS.value, decidedBy: LS.decidedBy, decidedAt: LS.decidedAt, note: LS.note, evidence: LS.evidence };
if (USAGE) {
  // 값이 같은 토큰은 용도로 구분합니다 — 어떤 쌍이 그런지 명시
  const bySpec = {};
  for (const t of types) (bySpec[`${t.size}/${t.weight}`] = bySpec[`${t.size}/${t.weight}`] || []).push(t);
  json.$notes.usage = {
    note: TDEC.usage.$note, decidedAt: TDEC.decidedAt,
    sameSpecPairs: Object.entries(bySpec).filter(([, a]) => a.length > 1)
      .map(([spec, a]) => ({ spec, tokens: a.map(t => ({ token: t.token, usage: t.usage })) })),
  };
}
json.$notes.typeOpen = (TDEC.open || []).filter(o => o.status === 'open').map(o => ({ id: o.id, question: o.question }));
for (const s of spacing) if (!s.conflict) json.spacing[slug(s.token).replace(/^spacing-/, '')] = { $value: `${s.px}px`, $type: 'dimension' };
for (const r of radius) json.radius[r.key] = { $value: r.px === 9999 ? '9999px' : `${r.px}px`, $type: 'dimension' };
for (const e of elevation) json.elevation[e.key] = { $value: e.value, $type: 'shadow', $description: e.was ? `구 ${e.was}` : '신규' };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'gds.css'), css);
fs.writeFileSync(path.join(OUT, 'gds.scss'), scss);
fs.writeFileSync(path.join(OUT, 'gds.tokens.json'), JSON.stringify(json, null, 2));

console.log(`토큰 생성 → dist/tokens/`);
console.log(`  색 ${colors.length} · 타이포 ${types.length} · 간격 ${spacing.filter(s => !s.conflict).length}(충돌 ${spacing.filter(s => s.conflict).length} 제외) · 반경 ${radius.length} · 엘리베이션 ${elevation.length}`);
if (colorDupKeys.length) console.log(`  ⚠ 색 키 중복 ${new Set(colorDupKeys).size}종 — 원본 스타일명 정리 필요`);

module.exports = { colors, types, spacing, radius, elevation, colorDupKeys };
