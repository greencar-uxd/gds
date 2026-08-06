'use strict';
/**
 * 아이콘 — 흩어져 있던 근거를 한 곳으로 모읍니다 (GAP-22).
 *
 * 2026-08-06 재작업. 처음에는 «Icon system 페이지가 🚧 이니 내용이 없다»고 보고
 * ✅ 페이지와 컴포넌트 실측만으로 «이름 규칙 없음 · 크기 스케일 없음 · 목록 없음»
 * 이라고 적었습니다. 페이지를 열어 보니 셋 다 있었습니다.
 * 등록된 스타일 목록이 아니라 «페이지»를 읽어야 합니다.
 *
 * 무엇을 모으는가 — 근거의 종류를 구분해서 답니다.
 *   ① 분류 체계   ← ✅ UI/UX guide (Guidelines 계층)
 *   ② 페이지 내용 ← 🚧 Icon system 페이지 직접 읽기 (data/figma-pages/icon-system.json)
 *   ③ 실측 치수   ← ✅ 컴포넌트 페이지 본문에서 «아이콘» 항목을 긁습니다
 *   ④ 없는 것     ← 위 셋 어디에도 없는 것만. 이름과 이유만 적습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));
const LIB = VIEW.LIB;
const STRUCT = VIEW.structure;

const PAGE = (() => {
  const p = path.join(ROOT, 'data', 'figma-pages', 'icon-system.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
if (!PAGE) throw new Error('data/figma-pages/icon-system.json 이 없습니다 — tools/parse-icon-page.js 를 먼저 돌리세요');

// ── ① 분류 체계 — Guidelines 계층에 있는 것을 그대로 씁니다.
const G = LIB.pages.uiuxGuide;
if (!G || !G.graphic) throw new Error('UI/UX guide ✅ 의 graphic 절을 찾지 못했습니다');

// ── ③ 실측 치수 — ✅ 컴포넌트 페이지 본문에서 «아이콘» 항목만 긁습니다.
const ICON_KEY = /아이콘|icon/i;
const COMP = LIB.pages.components || {};
const measured = [];
for (const [key, spec] of Object.entries(COMP)) {
  if (!spec || typeof spec !== 'object') continue;
  const node = spec.node || null;
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

const iconTokens = [...new Set(
  Object.values(COMP).flatMap(s => (s && s.tokens) || [])
    .concat(Object.values(COMP).map(s => s && s['하위컴포넌트'] && s['하위컴포넌트'].token).filter(Boolean))
    .filter(t => /Icon/i.test(t))
)].sort();

const foundation = STRUCT ? STRUCT.layers.find(l => /^Foundation$/i.test(l.name)) : null;
const iconItem = foundation ? foundation.items.find(i => i.name === 'Icon') : null;
if (!iconItem) throw new Error('구조도 Foundation 에 Icon 항목이 없습니다');

// ── 페이지가 쓰는 크기와 컴포넌트 실측 크기를 대봅니다.
const declared = Object.keys(PAGE.declaredSizes).map(Number).sort((a, b) => a - b);
const tierPx = PAGE.sizeTiers.tiers.map(t => t.px);
const tierVsDeclared = {
  tiers: tierPx,
  declared,
  overlap: tierPx.filter(p => declared.includes(p)),
  finding: '문서 프레임의 단계(XL 96 · L 56 · M 40)와 컴포넌트 이름에 선언된 크기가 거의 겹치지 않습니다. '
    + '단계는 «전시용 크기», 선언 크기는 «실제 쓰는 크기»로 보입니다 — 같은 축인지 원본이 말해 주지 않습니다.',
};

// ── ④ 없는 것 — 위 어디에도 없는 것만 남깁니다.
// 페이지를 읽고 나서 실제로 남은 것만입니다. 처음에 적었던 «이름 규칙 없음 · 크기 없음 · 목록 없음»은
// 페이지를 안 읽고 단정한 것이라 철회했습니다.
const missing = [
  {
    item: '아이콘 그리드',
    why: '기준 캔버스·여백·선 굵기 정렬 규칙이 페이지 metadata 에서 읽히지 않습니다. 실제로 없는지 이미지로만 그려져 있는지는 화면을 봐야 압니다.',
    fillWith: '레퍼런스로 채울 후보 — Material Design 3 · Apple HIG 의 아이콘 그리드 규격. 채울 때는 «참고»로 표시하고 원본에서 온 것과 구분합니다.',
  },
  {
    item: '크기 단계의 용도 배정',
    why: '어느 자리에 24px 을 쓰고 어느 자리에 16px 을 쓰는지가 원본에 적혀 있지 않습니다. 컴포넌트 실측으로 몇 자리만 알 수 있습니다(Bottom navigation 32 · Checkbox 체크 9×12).',
  },
];

const retracted = [
  { item: '아이콘 이름 규칙', why: `있습니다 — «${PAGE.naming.rule}». 이 꼴이 ${PAGE.naming.conforming}건으로 다수입니다.` },
  { item: '아이콘 전체 목록', why: `있습니다 — 아이콘 ${PAGE.counts.icons}종 / Icon/system/* 노드 ${PAGE.counts.nodes}개.` },
  { item: '단계별 크기 스케일', why: `있습니다 — 문서 프레임에 ${PAGE.sizeTiers.tiers.map(t => `${t.name} ${t.px}px`).join(' · ')}. 다만 컴포넌트 선언 크기와 축이 다릅니다.` },
];

const out = {
  $description: '아이콘 — Foundation 요소인데 규칙이 Guidelines 에, 목록이 🚧 페이지에, 치수가 컴포넌트 페이지에 흩어져 있던 것을 모은 것입니다.',
  generatedFrom: 'tools/build-icons.js ← data/figma-pages/icon-system.json · data/gds-library.json · data/gds-structure.json',
  rule: '근거의 종류를 구분해서 답니다 — ✅ 페이지 / 🚧 페이지 직접 읽기 / 컴포넌트 실측. 없는 것만 «없음»으로 남깁니다.',
  correction: {
    at: '2026-08-06',
    what: '처음 판에서 «원본에 없다»고 적은 3가지가 전부 틀렸습니다. Icon system 페이지가 🚧 라는 이유로 열어 보지 않고 단정했습니다.',
    retracted,
  },
  layerNote: {
    belongsTo: 'Foundation',
    rulesLiveIn: 'Guidelines — ✅ UI/UX guide',
    inventoryLivesIn: `🚧 Icon system 페이지 (${PAGE.source.node})`,
    why: '아이콘을 가르는 기준은 Guidelines 안에, 실제 아이콘 목록은 아직 🚧 인 Icon system 페이지 안에 있습니다. 세 곳을 여기서 모읍니다 (GAP-22).',
    figmaStatus: iconItem.figma,
    figmaNote: iconItem.note || null,
    caution: PAGE.caution,
  },
  classification: {
    source: G.node,
    scope: G.graphic['정의'],
    levels: G.graphic.levels,
    criteria: G.graphic['기준'],
    principles: G.graphic['원칙'],
    caution: '이 체계는 아이콘만이 아니라 그래픽 전체(일러스트 포함)를 가릅니다. Lv.1~2 가 아이콘, Lv.3 은 일러스트입니다.',
  },
  page: {
    source: PAGE.source,
    readAt: PAGE.readAt,
    sizeTiers: PAGE.sizeTiers,
    naming: PAGE.naming,
    counts: PAGE.counts,
    declaredSizes: PAGE.declaredSizes,
    tierVsDeclared,
    icons: PAGE.icons,
    bigFrames: PAGE.bigFrames,
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
    retracted: retracted.length,
    icons: PAGE.counts.icons,
    namingConforming: PAGE.naming.conforming,
    namingNonConforming: PAGE.naming.nonConforming,
  },
};

// ── 무결성
if (out.counts.levels !== 3) throw new Error(`그래픽 단계가 3개가 아닙니다: ${out.counts.levels}`);
if (measured.some(m => !m.node)) throw new Error('실측 항목에 출처 노드가 없습니다');
for (const m of measured) {
  if (!ICON_KEY.test(m.item)) throw new Error(`아이콘 항목이 아닌 것이 섞였습니다: ${m.item}`);
}
if (out.counts.namingConforming + out.counts.namingNonConforming !== PAGE.counts.uniqueNames) {
  throw new Error('이름 규칙 집계가 페이지 읽기 결과와 다릅니다');
}
if (iconItem.figma === 'done') {
  throw new Error('Icon system 페이지가 ✅ 가 됐습니다 — 다시 읽어 대조하세요 (GAP-22)');
}

fs.writeFileSync(path.join(ROOT, 'data', 'icons.json'), JSON.stringify(out, null, 2) + '\n');

console.log('아이콘 → data/icons.json');
console.log(`  분류 ${out.counts.levels}단계 · 원칙 ${out.counts.principles}개 (출처 ${out.classification.source})`);
console.log(`  페이지 직접 읽기 — 아이콘 ${out.counts.icons}종 · 이름 규칙 맞는 것 ${out.counts.namingConforming} / 어긋난 것 ${out.counts.namingNonConforming}`);
console.log(`  실측 ${out.counts.measured}건 / 컴포넌트 ${out.counts.measuredComponents}종 · 관련 토큰 ${out.counts.iconTokens}종`);
console.log(`  철회한 «없음» 판정 ${out.counts.retracted}건 · 실제로 없는 것 ${out.counts.missing}가지`);
