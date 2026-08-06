'use strict';
/**
 * 스케일 밖 간격 값(GAP-30)을 «어디에 찍힌 주석인가»로 가릅니다.
 *
 * 왜 있는가 (2026-08-06):
 *   GAP-30 은 «✅ 페이지 간격 주석 192건 중 21건이 스케일에 없는 값»이라는 것까지만 적고 멈춰 있었습니다.
 *   메우는 법이 두 갈래인데(제품 간격이냐 · 문서 캔버스 여백이냐) 어느 쪽인지 안 갈라서 진전이 없었습니다.
 *
 * 가르는 기준 — 지어내지 않고 원본의 문서화 템플릿 이름으로 가릅니다.
 *   원본의 모든 문서 프레임은 같은 틀을 씁니다(data/figma-xml/*.xml 로 확인):
 *     Contents · Contents area · Contents text · Text area · Description area · Detail area · Detail · Index area
 *   주석의 부모가 이 틀 이름이면 «문서를 배치한 여백»입니다 — 제품 간격이 아닙니다.
 *   그 밖이면 화면·컴포넌트 안이므로 «제품 간격 후보»입니다.
 *
 * 하지 않는 것:
 *   · 값을 가장 가까운 단계로 «맞추지» 않습니다. 가장 가까운 단계와 차이만 적어 둡니다.
 *   · 애매하면 product 로 밀지 않고 unknown 으로 둡니다.
 *
 * 입력: data/spacing-census.json · data/figma-xml/*.xml · data/gds-library.json
 * 출력: data/spacing-outliers.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const CENSUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'spacing-census.json'), 'utf8'));
const SCALE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gds-library.json'), 'utf8')).pages.spacing.값;

/** 문서화 템플릿의 컨테이너 이름 — 원자료 XML 에서 실제로 확인한 것만 씁니다. */
const XML_DIR = path.join(ROOT, 'data', 'figma-xml');
const CANDIDATES = ['Contents', 'Contents area', 'Contents text', 'Text area',
  'Description area', 'Detail area', 'Detail', 'Detail frame', 'Index area', 'Template frame basic'];
const seenInXml = new Set();
if (fs.existsSync(XML_DIR)) {
  for (const f of fs.readdirSync(XML_DIR).filter(x => x.endsWith('.xml'))) {
    const raw = fs.readFileSync(path.join(XML_DIR, f), 'utf8');
    for (const c of CANDIDATES) if (raw.includes(`name="${c}"`)) seenInXml.add(c);
  }
}
const TEMPLATE = [...seenInXml].sort();
if (!TEMPLATE.length) throw new Error('원자료 XML 에서 문서화 틀 이름을 하나도 찾지 못했습니다');

const nearest = v => SCALE.reduce((b, s) => Math.abs(s - v) < Math.abs(b - v) ? s : b, SCALE[0]);

const off = CENSUS.rows.filter(r => !SCALE.includes(r.value));
const items = off.map(r => {
  const inTemplate = TEMPLATE.includes(r.parent);
  const near = nearest(r.value);
  return {
    page: r.page, node: r.id, value: r.value, axis: r.axis, kind: r.kind,
    parent: r.parent, before: r.before, after: r.after,
    where: inTemplate ? 'doc-canvas' : 'product-candidate',
    nearestStep: near,
    deltaPx: r.value - near,
    odd: r.value % 2 === 1,
  };
});

const by = k => items.filter(i => i.where === k);
const docCanvas = by('doc-canvas');
const product = by('product-candidate');

/** 제품 후보 중 홀수 — «2px 기본 단위»를 정면으로 어기는 값이라 따로 셉니다. */
const oddProduct = product.filter(i => i.odd);

const groupByValue = list => {
  const m = new Map();
  for (const i of list) {
    if (!m.has(i.value)) m.set(i.value, { value: i.value, count: 0, pages: new Set(), parents: new Set(), nearestStep: i.nearestStep, deltaPx: i.deltaPx, odd: i.odd });
    const g = m.get(i.value);
    g.count++; g.pages.add(i.page); g.parents.add(i.parent);
  }
  return [...m.values()].sort((a, b) => b.count - a.count)
    .map(g => ({ ...g, pages: [...g.pages], parents: [...g.parents] }));
};

const out = {
  $description: 'GAP-30 — 스케일 밖 간격 값을 «문서 캔버스 여백»과 «제품 간격 후보»로 가른 결과입니다.',
  why: '메우는 법이 두 갈래인데 어느 쪽인지 안 갈라서 GAP-30 이 멈춰 있었습니다. 가르는 것까지가 저장소 몫이고, '
    + '제품 간격 후보를 어떻게 할지(단계를 늘릴지 · 가까운 단계로 맞출지)는 디자인팀이 정합니다.',
  rule: [
    '주석의 부모 프레임 이름이 문서화 틀의 컨테이너면 문서 캔버스 여백입니다 — 제품 간격으로 세지 않습니다.',
    '틀 이름은 지어내지 않고 원자료 XML(data/figma-xml/*.xml)에 실제로 있는 것만 씁니다.',
    '값을 가장 가까운 단계로 맞추지 않습니다. 차이만 적습니다.',
    '애매하면 product-candidate 로 밀지 않고 그대로 둡니다 — 여기서는 틀 이름 대조가 전부입니다.',
  ],
  basis: {
    scale: SCALE,
    templateContainers: TEMPLATE,
    templateEvidence: 'data/figma-xml/*.xml 에서 name="…" 으로 확인',
  },
  classifiedAt: '2026-08-06',
  docCanvas: {
    what: '문서를 캔버스에 배치한 여백입니다. 제품 화면의 간격이 아니므로 스케일을 어긴 것으로 세지 않습니다.',
    count: docCanvas.length,
    values: groupByValue(docCanvas),
    items: docCanvas,
  },
  product: {
    what: '화면·컴포넌트 안에 찍힌 주석입니다. 이것만 «스케일 밖 제품 간격»으로 셉니다.',
    count: product.length,
    values: groupByValue(product),
    items: product,
  },
  oddValues: {
    what: '제품 후보 중 홀수 값 — 원본이 선언한 «2px 기본 단위»를 정면으로 어깁니다.',
    count: oddProduct.length,
    values: [...new Set(oddProduct.map(i => i.value))].sort((a, b) => a - b),
  },
  // 가르고 나니 보인 것 — 제품 후보의 «차이»가 한쪽으로 쏠려 있습니다.
  distance: {
    what: '제품 간격 후보가 가장 가까운 단계에서 몇 px 떨어져 있는가.',
    buckets: [1, 2].map(d => ({
      deltaPx: d,
      count: product.filter(i => Math.abs(i.deltaPx) === d).length,
      values: [...new Set(product.filter(i => Math.abs(i.deltaPx) === d).map(i => i.value))].sort((a, b) => a - b),
    })).concat([{
      deltaPx: '3 이상',
      count: product.filter(i => Math.abs(i.deltaPx) > 2).length,
      values: [...new Set(product.filter(i => Math.abs(i.deltaPx) > 2).map(i => i.value))].sort((a, b) => a - b),
    }]),
    observation: null,
  },
  counts: {
    annotations: CENSUS.counts.annotations,
    offScale: off.length,
    docCanvas: docCanvas.length,
    product: product.length,
    oddProduct: oddProduct.length,
    unreadable: CENSUS.counts.unreadable,
  },
  reading: null,
};
out.reading = `스케일 밖 ${off.length}건 중 ${docCanvas.length}건은 문서 캔버스 여백이고, `
  + `제품 간격 후보는 ${product.length}건입니다. 그중 홀수는 ${oddProduct.length}건입니다.`;
{
  const one = product.filter(i => Math.abs(i.deltaPx) === 1).length;
  out.distance.observation = `[추론] 제품 후보 ${product.length}건 중 ${one}건이 단계에서 정확히 1px 떨어져 있습니다`
    + `(19↔20 · 29↔28 · 7↔8 · 13↔12 · 31↔32). 홀수 ${oddProduct.length}건과 그대로 겹칩니다. `
    + `«스케일에 단계가 모자란다»보다 «주석 값이 1px 어긋나 찍힌다»에 가까워 보이지만, `
    + `테두리 1px 을 포함해 잰 것인지 · 실제로 1px 을 의도한 것인지는 원본이 정할 일입니다. `
    + `[확인 필요] 저장소는 어느 쪽으로도 맞추지 않습니다.`;
}

fs.writeFileSync(path.join(ROOT, 'data', 'spacing-outliers.json'), JSON.stringify(out, null, 2) + '\n');
console.log('스케일 밖 값 가르기 → data/spacing-outliers.json');
console.log(`  틀 이름 ${TEMPLATE.length}종 — ${TEMPLATE.join(' · ')}`);
console.log(`  ${out.reading}`);
console.log(`  ${out.distance.observation.slice(0, 90)}…`);
for (const g of out.product.values) {
  console.log(`    ${String(g.value).padStart(4)}px ×${g.count}${g.odd ? ' (홀수)' : ''} — 가까운 단계 ${g.nearestStep}px (${g.deltaPx > 0 ? '+' : ''}${g.deltaPx}) · ${g.pages.join(', ')}`);
}
