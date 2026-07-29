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
const colors = (C.color.styles || []).map(s => {
  const [group, name] = s.name.includes('/') ? [s.name.split('/')[0], s.name.split('/').slice(1).join('/')] : ['', s.name];
  return { key: slug(group + ' ' + name), name: s.name, group, hex: s.hex };
});
// 같은 키가 겹치면 뒤에 번호를 붙이지 않고 그대로 노출(중복은 정리 대상이므로 숨기지 않습니다)
const colorDupKeys = colors.map(c => c.key).filter((k, i, a) => a.indexOf(k) !== i);

// ---------- 타이포 ----------
const types = (C.typography.scale || []).map(t => ({
  key: slug(t.token), token: t.token, size: t.size,
  weight: /Bold/i.test(t.weight || '') ? 700 : /Medium/i.test(t.weight || '') ? 500 : 400,
  lineHeight: t.lineHeight,
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

const HEAD = `/* GDS — 그린카 디자인 시스템 토큰
 * 생성: ${D.meta.source} (export ${String(D.meta.exported).slice(0, 10)})
 * 출처: ✅ Foundation 페이지 정본. 레거시 스타일(현황)은 포함하지 않습니다.
 * 자동 생성 파일입니다 — 직접 수정하지 마세요.
 */`;

// ---------- CSS ----------
let css = HEAD + '\n:root {\n  /* Color */\n';
for (const c of colors) css += `  --gds-color-${c.key}: ${c.hex};${colorDupKeys.includes(c.key) ? '  /* ⚠ 키 중복 — 원본 스타일명 정리 필요 */' : ''}\n`;
css += '\n  /* Typography */\n';
for (const t of types) {
  css += `  --gds-type-${t.key}-size: ${t.size}px;\n`;
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
css += `\n  /* Elevation — 재넘버링 반영 전이고 E-2(그림자 불투명도) 미결이라 출력하지 않습니다 */\n}\n`;

// ---------- SCSS ----------
let scss = HEAD + '\n';
for (const c of colors) scss += `$gds-color-${c.key}: ${c.hex};\n`;
scss += '\n';
for (const t of types) scss += `$gds-type-${t.key}-size: ${t.size}px;\n$gds-type-${t.key}-weight: ${t.weight};\n`;
scss += '\n';
for (const s of spacing) if (!s.conflict) scss += `$gds-spacing-${slug(s.token).replace(/^spacing-/, '')}: ${s.px}px;\n`;
scss += '\n';
for (const r of radius) scss += `$gds-radius-${r.key}: ${r.px === 9999 ? '9999px' : r.px + 'px'};\n`;

// ---------- JSON (DTCG 형태) ----------
const json = {
  $description: 'GDS 정본 토큰 — ✅ Foundation 페이지 기준',
  color: {}, type: {}, spacing: {}, radius: {},
  $notes: {
    excluded: ['elevation — 재넘버링 반영 전 · E-2 미결'],
    conflicts: C.spacing.conflicts || [],
    colorKeyDuplicates: [...new Set(colorDupKeys)],
  },
};
for (const c of colors) json.color[c.key] = { $value: c.hex, $type: 'color', $description: c.name };
for (const t of types) json.type[t.key] = { $value: { fontSize: `${t.size}px`, fontWeight: t.weight, lineHeight: t.lineHeight }, $type: 'typography', $description: t.token };
for (const s of spacing) if (!s.conflict) json.spacing[slug(s.token).replace(/^spacing-/, '')] = { $value: `${s.px}px`, $type: 'dimension' };
for (const r of radius) json.radius[r.key] = { $value: r.px === 9999 ? '9999px' : `${r.px}px`, $type: 'dimension' };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'gds.css'), css);
fs.writeFileSync(path.join(OUT, 'gds.scss'), scss);
fs.writeFileSync(path.join(OUT, 'gds.tokens.json'), JSON.stringify(json, null, 2));

console.log(`토큰 생성 → dist/tokens/`);
console.log(`  색 ${colors.length} · 타이포 ${types.length} · 간격 ${spacing.filter(s => !s.conflict).length}(충돌 ${spacing.filter(s => s.conflict).length} 제외) · 반경 ${radius.length}`);
if (colorDupKeys.length) console.log(`  ⚠ 색 키 중복 ${new Set(colorDupKeys).size}종 — 원본 스타일명 정리 필요`);

module.exports = { colors, types, spacing, radius, colorDupKeys };
