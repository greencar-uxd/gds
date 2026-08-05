'use strict';
/**
 * 컴포넌트 목록 — 흩어져 있던 실측 결과를 한 표로 모읍니다.
 *
 * 왜 필요한가 (GAP-18):
 *   ✅ [Components] 구조도는 25종을 세는데, 저장소가 실측한 것은 몇 개인지
 *   한눈에 볼 곳이 없었습니다. 실측 결과도 두 파일에 흩어져 있었습니다
 *   (data/component-buttons.json · data/gds-library.json pages.components).
 *
 * 무엇을 하는가:
 *   구조도의 25종을 기준으로, 각 항목에
 *     · Figma 상태(✅ / 🚧 / —)
 *     · 저장소 실측 내용(있으면)
 *     · 간격 주석 건수(data/spacing-census.json)
 *   를 붙여 하나의 목록으로 만듭니다.
 *
 * 지어내지 않습니다 — 원본에 없는 컴포넌트는 «원본이 아직 안 그렸음»으로 남깁니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const rd = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n), 'utf8'));

const STRUCT = rd('gds-structure.json');
const LIB = rd('gds-library.json');
const BTN = rd('component-buttons.json');
const CENSUS = (() => { try { return rd('spacing-census.json'); } catch { return null; } })();

const layer = STRUCT.layers.find(l => /^Components$/i.test(l.name));
if (!layer) throw new Error('gds-structure.json 에 Components 계층이 없습니다');

// 구조도 이름 → 실측 데이터. 이름이 원본 표기라 철자가 흔들려서(Bage, Pasing, Tap app bar) 여기서 이어 붙입니다.
const LINK = {
  'Buttons': { key: 'buttons', ko: '버튼' },
  'Modal': { key: 'modal', ko: '모달' },
  'Check box': { key: 'checkbox', ko: '체크박스', display: 'Checkbox' },
  'Bottom navigation': { key: 'bottomNavigation', ko: '바텀 네비게이션' },
  'Picker': { key: 'picker', ko: '피커' },
  'Border': { key: 'border', ko: '보더' },
  'Bottom sheet': { key: 'bottomSheet', ko: '바텀시트' },
};

// 간격 주석은 조사한 ✅ 페이지 이름으로 들어옵니다 — 컴포넌트 이름과 이어 붙입니다.
const censusOf = name => {
  if (!CENSUS) return null;
  const rows = CENSUS.rows.filter(r => r.page.replace(/\s*✅$/, '').toLowerCase() === name.toLowerCase());
  if (!rows.length) return null;
  const byValue = {};
  for (const r of rows) byValue[r.value] = (byValue[r.value] || 0) + 1;
  return {
    annotations: rows.length,
    values: Object.entries(byValue).map(([v, c]) => ({ value: +v, count: c }))
      .sort((a, b) => b.count - a.count),
  };
};

const items = layer.items.map(it => {
  const link = LINK[it.name];
  const spec = link
    ? (link.key === 'buttons' ? BTN : (LIB.pages.components || {})[link.key])
    : null;
  const censusName = link && link.key === 'bottomNavigation' ? 'Bottom navigation'
    : (link ? (link.display || it.name) : it.name);
  return {
    name: link && link.display ? link.display : it.name,
    sourceName: it.name,
    ko: link ? link.ko : null,
    figma: it.figma,                       // done | wip | none
    documented: !!spec,
    where: it.where || null,
    node: spec ? (spec.node || (spec.source && spec.source.page) || null) : null,
    definition: spec ? (spec['정의'] || (spec.types && spec.types[0] && spec.types[0].definition) || null) : null,
    kinds: spec ? (spec['종류'] || spec.types || null) : null,
    anatomy: spec ? (spec['구성'] || spec['구조'] || null) : null,
    specs: spec ? (spec['스펙'] || spec['치수'] || null) : null,
    states: spec ? (spec.states || null) : null,
    colors: spec ? (spec['컬러'] || null) : null,
    openMemos: spec ? (spec['미해결메모'] || null) : null,
    spacing: censusOf(censusName),
  };
});

const done = items.filter(i => i.figma === 'done');
const out = {
  $description: '컴포넌트 목록 — ✅ [Components] 구조도 25종에 Figma 상태와 저장소 실측 내용을 붙인 것입니다.',
  generatedFrom: 'tools/build-components.js ← gds-structure.json · gds-library.json · component-buttons.json · spacing-census.json',
  rule: '원본이 아직 안 그린 것(🚧 · —)은 저장소가 지어내지 않습니다. «원본 대기»로 남깁니다.',
  counts: {
    total: items.length,
    figmaDone: done.length,
    documented: items.filter(i => i.documented).length,
    documentedOfDone: done.filter(i => i.documented).length,
    wip: items.filter(i => i.figma === 'wip').length,
    notStarted: items.filter(i => i.figma === 'none').length,
    // ✅ 인데 저장소에 없는 것 — 이게 0이 아니면 우리 숙제가 남은 것입니다.
    doneButUndocumented: done.filter(i => !i.documented).map(i => i.name),
  },
  items,
};

// 무결성 — 구조도 항목 수가 곧 목록 수여야 합니다.
if (out.counts.total !== layer.items.length) throw new Error('구조도 항목 수와 목록 수가 다릅니다');
for (const i of items) {
  if (i.documented && !i.node) throw new Error(`실측했다면 출처 노드가 있어야 합니다: ${i.name}`);
}

fs.writeFileSync(path.join(ROOT, 'data', 'components.json'), JSON.stringify(out, null, 2) + '\n');

console.log('컴포넌트 목록 → data/components.json');
console.log(`  구조도 ${out.counts.total}종 · Figma ✅ ${out.counts.figmaDone} · 🚧 ${out.counts.wip} · — ${out.counts.notStarted}`);
console.log(`  저장소 실측 ${out.counts.documented}종 (✅ 중 ${out.counts.documentedOfDone}/${out.counts.figmaDone})`);
if (out.counts.doneButUndocumented.length) {
  console.log(`  ✅ 인데 저장소에 없음: ${out.counts.doneButUndocumented.join(', ')}`);
} else {
  console.log('  ✅ 페이지는 전부 저장소에 있습니다.');
}
for (const i of items.filter(x => x.documented)) {
  console.log(`   ${i.figma === 'done' ? '✅' : '🚧'} ${i.name.padEnd(20)} ${i.spacing ? `간격주석 ${i.spacing.annotations}건` : ''}`);
}
