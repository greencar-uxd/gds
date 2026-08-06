'use strict';
/**
 * 아이콘 — 흩어져 있던 근거를 한 곳으로 모읍니다 (GAP-22).
 *
 * 왜 필요한가:
 *   Icon 은 Foundation 요소인데 Icon system 페이지가 🚧 입니다.
 *   정작 아이콘을 가르는 규칙(Lv.1~3 · 밀도)은 Guidelines 계층인
 *   ✅ UI/UX guide 안에 있고, 실제 치수(32×32 · 굵기 1.5 …)는
 *   ✅ 컴포넌트 페이지 본문에 흩어져 있습니다.
 *   개발자는 «아이콘을 어떻게 쓰나»를 물을 곳이 없습니다.
 *
 * 무엇을 하는가 — 근거가 있는 것만 모읍니다. 지어내지 않습니다.
 *   ① 분류 체계   ← ✅ UI/UX guide (Guidelines 계층임을 명시)
 *   ② 실측 치수   ← ✅ 컴포넌트 페이지 본문에서 «아이콘» 이 들어간 항목을 긁습니다
 *   ③ 관련 토큰   ← 라이브러리 스타일 이름에 Icon 이 들어간 것
 *   ④ 없는 것     ← Icon system 🚧 이라 없는 항목을 이름만 적습니다
 *
 * 실측 치수는 손으로 옮기지 않습니다 — 키 이름에 «아이콘» 이 들어간 항목을
 * 기계로 훑습니다. 컴포넌트가 늘면 따라옵니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));
const LIB = VIEW.LIB;
const STRUCT = VIEW.structure;

// ── ① 분류 체계 — Guidelines 계층에 있는 것을 그대로 씁니다.
const G = LIB.pages.uiuxGuide;
if (!G || !G.graphic) throw new Error('UI/UX guide ✅ 의 graphic 절을 찾지 못했습니다');

// ── ② 실측 치수 — ✅ 컴포넌트 페이지 본문에서 «아이콘» 항목만 긁습니다.
const ICON_KEY = /아이콘|icon/i;
const COMP = LIB.pages.components || {};
const measured = [];
for (const [key, spec] of Object.entries(COMP)) {
  if (!spec || typeof spec !== 'object') continue;
  const node = spec.node || null;
  // 스펙·상태 안의 «아이콘» 이 들어간 항목만. 값이 없는 것은 담지 않습니다.
  const collect = (obj, where) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (!ICON_KEY.test(k)) continue;
      if (v == null || (typeof v === 'object')) continue;
      measured.push({ component: key, where, item: k, value: String(v), node });
    }
  };
  collect(spec['스펙'], '스펙');
  collect(spec, '본문');
  for (const st of (spec.states || [])) collect(st, `상태 «${st.name || ''}»`);
}

// ── ③ 관련 토큰 — 라이브러리 스타일 이름에 Icon 이 들어간 것.
const iconTokens = [...new Set(
  Object.values(COMP).flatMap(s => (s && s.tokens) || [])
    .concat(Object.values(COMP).map(s => s && s['하위컴포넌트'] && s['하위컴포넌트'].token).filter(Boolean))
    .filter(t => /Icon/i.test(t))
)].sort();

// ── ④ 원본 상태 — 구조도가 적어 둔 Icon 항목.
const foundation = STRUCT ? STRUCT.layers.find(l => /^Foundation$/i.test(l.name)) : null;
const iconItem = foundation ? foundation.items.find(i => i.name === 'Icon') : null;
if (!iconItem) throw new Error('구조도 Foundation 에 Icon 항목이 없습니다');

// 없는 것 — «있어야 하는데 원본에 아직 없는» 항목입니다. 이름만 적고 내용을 짓지 않습니다.
// 무엇이 없는지는 다른 Foundation 요소가 갖춘 것과 대보면 나옵니다.
const missing = [
  { item: '아이콘 그리드', why: 'Icon system 페이지가 🚧 입니다 — 기준 캔버스·여백·정렬 규칙이 원본에 없습니다.' },
  { item: '아이콘 이름 규칙', why: '다른 Foundation 요소는 이름 체계가 정본에 있습니다(예: 색 010~100). 아이콘은 없습니다.' },
  { item: '아이콘 전체 목록', why: '라이브러리에 published 된 아이콘 컴포넌트 목록을 정본이 정의하지 않습니다.' },
  { item: '단계별 크기 스케일', why: 'Lv.1~3 은 정보 구조로만 갈리고, 단계마다 몇 px 인지는 정해져 있지 않습니다. 실측치는 컴포넌트마다 따로 있습니다.' },
];

const out = {
  $description: '아이콘 — Foundation 요소인데 규칙이 Guidelines 에, 치수가 컴포넌트 페이지에 흩어져 있던 것을 모은 것입니다.',
  generatedFrom: 'tools/build-icons.js ← data/gds-library.json (uiuxGuide · components) · data/gds-structure.json',
  rule: '근거가 있는 것만 모읍니다. Icon system 페이지가 🚧 이므로 없는 것은 «없음 + 이유»로 남깁니다.',
  layerNote: {
    belongsTo: 'Foundation',
    rulesLiveIn: 'Guidelines — ✅ UI/UX guide',
    why: '아이콘을 가르는 기준이 Foundation 이 아니라 Guidelines 안에 있습니다. Icon system 페이지가 ✅ 가 되면 그때 대조합니다 (GAP-22).',
    figmaStatus: iconItem.figma,
    figmaNote: iconItem.note || null,
  },
  classification: {
    source: G.node,
    scope: G.graphic['정의'],
    levels: G.graphic.levels,
    criteria: G.graphic['기준'],
    principles: G.graphic['원칙'],
    caution: '이 체계는 아이콘만이 아니라 그래픽 전체(일러스트 포함)를 가릅니다. Lv.1~2 가 아이콘, Lv.3 은 일러스트입니다.',
  },
  measured,
  iconTokens,
  missing,
  counts: {
    levels: G.graphic.levels.length,
    principles: G.graphic['원칙'].length,
    measured: measured.length,
    measuredComponents: [...new Set(measured.map(m => m.component))].length,
    iconTokens: iconTokens.length,
    missing: missing.length,
  },
};

// ── 무결성
if (out.counts.levels !== 3) throw new Error(`그래픽 단계가 3개가 아닙니다: ${out.counts.levels}`);
if (measured.some(m => !m.node)) throw new Error('실측 항목에 출처 노드가 없습니다');
for (const m of measured) {
  if (!ICON_KEY.test(m.item)) throw new Error(`아이콘 항목이 아닌 것이 섞였습니다: ${m.item}`);
}
if (iconItem.figma === 'done') {
  throw new Error('Icon system 페이지가 ✅ 가 됐습니다 — 이 도구의 전제가 바뀌었으니 원본과 대조하세요 (GAP-22)');
}

fs.writeFileSync(path.join(ROOT, 'data', 'icons.json'), JSON.stringify(out, null, 2) + '\n');

console.log('아이콘 → data/icons.json');
console.log(`  분류 ${out.counts.levels}단계 · 원칙 ${out.counts.principles}개 (출처 ${out.classification.source})`);
console.log(`  실측 ${out.counts.measured}건 / 컴포넌트 ${out.counts.measuredComponents}종`);
for (const m of measured) console.log(`   ${m.component.padEnd(18)} ${m.item.padEnd(16)} ${m.value}`);
console.log(`  관련 토큰 ${out.counts.iconTokens}종 · 원본에 없는 것 ${out.counts.missing}가지`);
