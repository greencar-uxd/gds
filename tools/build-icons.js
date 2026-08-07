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
//
// 2026-08-06 두 번째 정정 — 이 둘도 원본에 있었습니다.
// 레퍼런스로 «메웠던» 것을 걷어내고, 원본 제작 가이드라인(data/icon-guide.json)으로 대체했습니다.
// 레퍼런스는 이제 «메우는 것»이 아니라 «원본 문장이 어디서 왔는지 대조하는 것»으로만 씁니다.
const REF = (() => {
  const p = path.join(ROOT, 'data', 'icon-reference.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
const GUIDE = (() => {
  const p = path.join(ROOT, 'data', 'icon-guide.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
if (!GUIDE) throw new Error('data/icon-guide.json 이 없습니다 — tools/build-icon-guide.js 를 먼저 돌리세요');

// 원본을 다 읽고도 남은 것. 두 참고에는 있는데 원본에는 없는 축입니다.
const missing = (GUIDE.notInOriginal ? GUIDE.notInOriginal.items : []).map(i => ({
  item: i.item,
  why: i.note || (REF ? (REF.quotes.find(q => q.id === i.quote) || {}).note : null)
    || '원본 제작 가이드라인 00~08 어디에도 없습니다.',
  seenIn: i.quote || null,
  stillMissingInSource: true,
  filledWith: null,   // 메우지 않습니다 — 원본에 없는 축을 참고로 채우면 그게 오염입니다.
}));

// ── 00_Size 가 정한 «주요 크기»와 실제 노드가 선언한 크기의 차이.
// 강민관 2026-08-06 — «일단 36 50 56은 냅 두시고». 정리하지 않고 기록만 합니다.
const GUIDE_SIZES = GUIDE.values.sizeStroke.map(s => s.px).sort((a, b) => a - b);
const declaredAll = Object.keys(PAGE.declaredSizes).map(Number).sort((a, b) => a - b);
const offScale = declaredAll.filter(px => !GUIDE_SIZES.includes(px))
  .map(px => ({ px, count: PAGE.declaredSizes[String(px)], multipleOf4: px % 4 === 0, multipleOf8: px % 8 === 0 }));
const sizeGap = {
  guideSizes: GUIDE_SIZES,
  declaredSizes: declaredAll,
  offScale,
  rule: (GUIDE.guide[0].rows.find(r => /배수/.test(r)) || GUIDE.guide[0].lead || ''),
  decision: {
    by: '강민관',
    at: '2026-08-06',
    what: '유지 — 정리하지 않습니다',
    quote: '일단 36 50 56은 냅 두시고',
    why: '원본 00_Size 의 주요 크기 다섯(16·20·24·32·40) 밖에 있는 크기들입니다. 쓰이는 건수가 적고(각 5·1·1건) 지금 정리할 사안이 아니라는 판단입니다.',
  },
};

const retracted = [
  { item: '아이콘 이름 규칙', why: `있습니다 — 원본이 스스로 «${GUIDE.naming.rule}» 로 선언합니다. 실제 노드도 이 꼴이 ${PAGE.naming.conforming}건으로 다수입니다.`, round: 1 },
  { item: '아이콘 전체 목록', why: `있습니다 — 아이콘 ${PAGE.counts.icons}종 / Icon/system/* 노드 ${PAGE.counts.nodes}개.`, round: 1 },
  { item: '단계별 크기 스케일', why: `있습니다 — 문서 프레임에 ${PAGE.sizeTiers.tiers.map(t => `${t.name} ${t.px}px`).join(' · ')}. 다만 컴포넌트 선언 크기와 축이 다릅니다.`, round: 1 },
  {
    item: '아이콘 그리드',
    why: `있습니다 — 02_Key line shape 절에 프레임 ${GUIDE.values.keyline.frame} · Square ${GUIDE.values.keyline.square} · Circle ${GUIDE.values.keyline.circle} · Rectangular ${GUIDE.values.keyline.rectangular} · 세이프존 여백 ${GUIDE.values.keyline.safeZone}. 01_Layout 이 Live area / Padding / Keyline 구조까지 정의합니다.`,
    round: 2,
  },
  {
    item: '크기 단계의 용도 배정',
    why: `있습니다 — 00_Size 절이 «${GUIDE.guide[0].lead}» 라고 적고, 크기별 굵기까지 ${GUIDE.values.sizeStroke.map(s => `${s.px}:${s.stroke}`).join(' · ')} 로 배정해 두었습니다.`,
    round: 2,
  },
];

const out = {
  $description: '아이콘 — Foundation 요소인데 규칙이 Guidelines 에, 목록이 🚧 페이지에, 치수가 컴포넌트 페이지에 흩어져 있던 것을 모은 것입니다.',
  generatedFrom: 'tools/build-icons.js ← data/icon-guide.json · data/figma-pages/icon-system.json · data/gds-library.json · data/gds-structure.json',
  rule: '근거의 종류를 구분해서 답니다 — ✅ 페이지 / 🚧 페이지 직접 읽기 / 컴포넌트 실측. 없는 것만 «없음»으로 남깁니다.',
  correction: {
    at: '2026-08-06',
    rounds: 2,
    what: '두 번 틀렸습니다. ① 🚧 라는 이유로 페이지를 열지 않고 «이름 규칙·목록·크기 스케일 없음»이라 단정. ② 열었다고 했지만 실제로는 노드 «이름»만 훑어서 «그리드·크기 용도 없음»이라 단정하고 레퍼런스로 메움.',
    whyWrongTwice: '첫 번째는 페이지를 안 봐서, 두 번째는 페이지의 «본문»을 안 봐서입니다. 파서(tools/parse-icon-page.js)가 Icon/system/* 노드 이름만 모으고 문서 프레임 텍스트를 버렸습니다.',
    fixedBy: '페이지를 통째로 다시 읽는 파서(tools/parse-figma-page.js)로 갈아탔습니다. 이제 본문 텍스트 1,356줄이 data/figma-pages/icon-system-full.json 에 그대로 남습니다.',
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
  sizeGap,
  guide: GUIDE,
  reference: REF,
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
    guideSections: GUIDE.counts.sections,
    sizeStroke: GUIDE.counts.sizeStroke,
    referenceQuotes: REF ? REF.quotes.length : 0,
    referenceSources: REF ? REF.sources.length : 0,
    verbatimFromKrds: GUIDE.counts.verbatim,
    offScaleSizes: offScale.length,
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
if (offScale.length !== 3) throw new Error(`00_Size 밖 크기가 3개가 아닙니다: ${offScale.map(o => o.px).join('/')}`);
if (!sizeGap.decision.quote) throw new Error('유지 결정의 근거 문장이 없습니다');
if (iconItem.figma === 'done') {
  throw new Error('Icon system 페이지가 ✅ 가 됐습니다 — 다시 읽어 대조하세요 (GAP-22)');
}

// ── 참고 자료가 원본으로 둔갑하지 않도록 하는 규칙 ──
// 두 번 틀린 자리입니다. 여기서 막지 않으면 «출처 없는 숫자»가 조용히 토큰까지 흘러갑니다.
if (REF) {
  if (REF.status !== 'comparison') {
    throw new Error(`참고 자료는 comparison 상태여야 합니다 — 메우는 용도가 아닙니다: ${REF.status}`);
  }
  if (!REF.retracted || !REF.retracted.why) throw new Error('참고 자료의 철회 경위가 없습니다');
  const ids = new Set(REF.sources.map(s => s.id));
  for (const s of REF.sources) {
    if (!/^https:\/\//.test(s.url || '')) throw new Error(`출처에 URL 이 없습니다: ${s.name}`);
    if (!(s.whyThisOne || '').length) throw new Error(`출처를 고른 이유가 없습니다: ${s.name}`);
  }
  for (const q of REF.quotes) {
    if (!ids.has(q.source)) throw new Error(`인용의 출처가 등록되지 않았습니다: ${q.id}`);
    if (!(q.text || '').length) throw new Error(`인용문이 비어 있습니다: ${q.id}`);
  }
  // 참고 값이 원본 값을 덮어쓰지 않았는지 — 가이드의 값은 전부 원본 노드에서 와야 합니다.
  const V = GUIDE.values;
  if (V.stroke.value !== '1.2px') {
    throw new Error(`스트로크가 원본 값(1.2px)이 아닙니다 — 참고(KRDS 1.6 / M3 2)로 덮어쓰였는지 확인하세요: ${V.stroke.value}`);
  }
  if (V.endCap.base !== 'Round') throw new Error(`기본 Cap 이 원본 값(Round)이 아닙니다: ${V.endCap.base}`);
  // 원본에 없는 축을 참고로 채우지 않았는지.
  if (missing.some(m => m.filledWith)) {
    throw new Error(`원본에 없는 축을 참고로 채웠습니다: ${missing.filter(m => m.filledWith).map(m => m.item).join(', ')}`);
  }
  if (!missing.every(m => m.stillMissingInSource === true)) {
    throw new Error('«원본에 없음» 표시가 사라진 항목이 있습니다');
  }
  // 출처 대조는 손이 아니라 기계가 판정해야 합니다.
  if (!GUIDE.provenance || !GUIDE.provenance.items.length) throw new Error('출처 대조 결과가 없습니다');
  for (const it of GUIDE.provenance.items) {
    if (!['verbatim', 'partial', 'independent'].includes(it.verdict)) {
      throw new Error(`출처 대조 판정이 이상합니다: ${it.quote} → ${it.verdict}`);
    }
  }
}

fs.writeFileSync(path.join(ROOT, 'data', 'icons.json'), JSON.stringify(out, null, 2) + '\n');

console.log('아이콘 → data/icons.json');
console.log(`  분류 ${out.counts.levels}단계 · 원칙 ${out.counts.principles}개 (출처 ${out.classification.source})`);
console.log(`  페이지 직접 읽기 — 아이콘 ${out.counts.icons}종 · 이름 규칙 맞는 것 ${out.counts.namingConforming} / 어긋난 것 ${out.counts.namingNonConforming}`);
console.log(`  실측 ${out.counts.measured}건 / 컴포넌트 ${out.counts.measuredComponents}종 · 관련 토큰 ${out.counts.iconTokens}종`);
console.log(`  원본 제작 가이드라인 ${out.counts.guideSections}절 · 크기별 굵기 ${out.counts.sizeStroke}단계`);
console.log(`  00_Size 밖 크기 ${offScale.map(o => `${o.px}(${o.count}건)`).join(' · ')} — ${sizeGap.decision.what} (${sizeGap.decision.by} ${sizeGap.decision.at})`);
if (REF) {
  console.log(`  출처 대조(참고 ${out.counts.referenceQuotes}인용 / ${out.counts.referenceSources}곳) — KRDS 원문 그대로 ${out.counts.verbatimFromKrds}절`);
}
console.log(`  철회한 «없음» 판정 ${out.counts.retracted}건 · 실제로 없는 것 ${out.counts.missing}가지`);
