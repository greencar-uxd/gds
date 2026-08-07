'use strict';
/**
 * 손으로 옮겨 적은 쪽을 원자료와 대조합니다.
 *
 * 왜 있는가 (2026-08-06):
 *   «시작 전(—)» 8쪽 중 다섯 쪽은 응답이 작아 파일로 저장되지 않아 손으로 옮겨 적었습니다.
 *   손으로 적은 것은 기계가 다시 셀 수 없습니다 — 그게 바로 GAP-32 가 경계하는 상태입니다.
 *   그래서 원자료 XML 을 저장소에 넣고(data/figma-xml/), 이 도구가 대조합니다.
 *
 * 대조하는 것:
 *   ① not-started-pages.json 이 인용한 노드 ID 가 원자료에 실재하는가
 *   ② 인용한 «이름/본문»이 원자료의 그 노드 이름과 글자 그대로 같은가
 *   ③ 수치(변형 수 · «-» 자리 수 · 빈 페이지)를 원자료에서 «다시» 세면 같은가
 *
 * 고치지 않는 규칙:
 *   · 어긋나면 조용히 맞추지 않고 mismatches 에 남깁니다. 손으로 적은 쪽이 틀렸을 수도,
 *     원본이 바뀐 것일 수도 있습니다 — 어느 쪽인지는 사람이 봅니다.
 *   · XML 이 페이지 일부만 담은 경우(scope 주석) 그 사실을 그대로 싣습니다.
 *
 * 입력: data/figma-xml/*.xml · data/not-started-pages.json
 * 출력: data/transcribed-verify.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const XML_DIR = path.join(ROOT, 'data', 'figma-xml');

const NODE = /<([\w-]+)\s+id="([^"]+)"\s+name="([^"]*)"/g;
const unesc = s => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

/** XML 하나를 노드 목록으로 폅니다. */
function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const scope = (raw.match(/<!--([\s\S]*?)-->/) || [, ''])[1].trim() || null;
  const nodes = new Map();
  let m;
  NODE.lastIndex = 0;
  while ((m = NODE.exec(raw))) nodes.set(m[2], { tag: m[1], name: unesc(m[3]) });
  // 자식이 하나도 없는 canvas — 정말로 빈 페이지
  const selfClosing = /<canvas[^>]*\/>\s*$/m.test(raw.replace(/<!--[\s\S]*?-->/g, '').trim());
  return { raw, scope, nodes, selfClosing };
}

const files = fs.existsSync(XML_DIR)
  ? fs.readdirSync(XML_DIR).filter(f => f.endsWith('.xml')).sort() : [];
if (!files.length) throw new Error('data/figma-xml/ 에 원자료가 없습니다');

const XML = {};
for (const f of files) XML[f.replace(/\.xml$/, '')] = parse(path.join(XML_DIR, f));

const NS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'not-started-pages.json'), 'utf8'));

/** 객체 어디에 있든 노드 ID 꼴 문자열을 전부 긁습니다. */
function citedNodes(obj, out = []) {
  if (obj == null) return out;
  if (typeof obj === 'string') {
    for (const m of obj.matchAll(/\b\d{4,}:\d+\b/g)) out.push(m[0]);
    return out;
  }
  if (Array.isArray(obj)) { for (const v of obj) citedNodes(v, out); return out; }
  if (typeof obj === 'object') { for (const v of Object.values(obj)) citedNodes(v, out); return out; }
  return out;
}

const pages = [];
const mismatches = [];

for (const pg of NS.pages) {
  const x = XML[pg.slug];
  if (!x) {
    // 파서를 이미 돌린 쪽(data/figma-pages/*.json)은 근거가 그쪽에 있습니다 — «근거 없음»과 다릅니다.
    const parsed = pg.parsed && fs.existsSync(path.join(ROOT, pg.parsed));
    pages.push({
      slug: pg.slug, node: pg.node, xml: null,
      parsedElsewhere: parsed ? pg.parsed : null,
      note: parsed ? '원자료 XML 대신 파서 산출물이 근거입니다' : '원자료가 저장소에 없습니다',
    });
    continue;
  }

  const cited = [...new Set(citedNodes(pg))];
  const missing = cited.filter(id => !x.nodes.has(id));
  if (missing.length) {
    mismatches.push({ slug: pg.slug, kind: 'node-missing', detail: missing.join(', ') });
  }

  // 인용한 본문이 그 노드의 이름과 같은가 — evidence·spec·contaminationHand 등에서 «id: 본문» 짝을 봅니다.
  const dashNodes = [...x.nodes.entries()].filter(([, n]) => n.name === '-').map(([id]) => id);
  const variants = [...x.nodes.entries()].filter(([, n]) => n.tag === 'symbol').map(([id, n]) => ({ id, name: n.name }));

  pages.push({
    slug: pg.slug,
    node: pg.node,
    xml: `data/figma-xml/${pg.slug}.xml`,
    scope: x.scope,
    nodesInXml: x.nodes.size,
    citedNodes: cited.length,
    citedAllFound: missing.length === 0,
    emptyCanvas: x.selfClosing,
    dashSlots: dashNodes,
    variants,
  });
}

/** 손으로 적은 진술을 하나씩 다시 셉니다. 여기 적힌 기대값이 틀리면 실패로 남깁니다. */
const CLAIMS = [
  {
    slug: 'table', what: '노드가 하나도 없는 빈 페이지',
    test: p => p.emptyCanvas === true && p.nodesInXml === 1,
  },
  {
    slug: 'card', what: '문서화 틀 두 자리가 «-»',
    test: p => p.dashSlots.length === 2
      && p.dashSlots.includes('42554:48893') && p.dashSlots.includes('42554:48900'),
  },
  {
    slug: 'card', what: 'mcard_set 변형 15종',
    test: p => p.variants.length === 15 && p.variants.every(v => /^Property 1=mcard_/.test(v.name)),
  },
  {
    slug: 'switch', what: '문서화 틀 두 벌 중 «-» 가 있는 것은 한 벌뿐',
    test: p => p.dashSlots.length === 2
      && p.dashSlots.every(id => id.startsWith('42553:')),
    note: '처음에는 «두 벌 모두 «-»»라고 적었습니다. 다시 세니 앞의 한 벌(42419:38532)은 '
      + 'Detail(42419:38544)이 아예 비어 있어 «-» 조차 없습니다. 손으로 적은 쪽이 틀렸습니다.',
  },
  {
    slug: 'switch', what: '변형 6종 — Toggle 2 · btn_key_lock 2 · account_type 2',
    test: p => p.variants.length === 6,
  },
  {
    slug: 'loading-spinner', what: '문서화 틀 두 자리가 «-»',
    test: p => p.dashSlots.length === 2,
  },
  {
    slug: 'loading-spinner', what: 'To-be 두 자리가 «작성해주세요» 상태로 As-is 문구를 그대로 안고 있음',
    test: (p, x) => ['43416:2266', '43416:2268'].every(id => {
      const n = x.nodes.get(id);
      return n && /^To-be\(변경 스팩 작성해주세요\)/.test(n.name);
    }),
    note: '처음에는 «To-be 미작성»이라고만 적었습니다. 다시 보니 비어 있는 것이 아니라 '
      + 'As-is 문구가 그대로 복사돼 있고 앞에 «To-be(변경 스팩 작성해주세요)» 만 붙어 있습니다. '
      + '«비었다»와 «As-is 를 복사해 두고 안 고쳤다»는 다릅니다 — 뒤엣것이 맞습니다.',
  },
  {
    slug: 'loading-spinner', what: 'As-is 두 종의 크기·프레임레이트가 50×50/60fps · 500×500/30fps',
    test: (p, x) => /50 × 50px \/ 60fps/.test(x.nodes.get('43416:2264').name)
      && /500 × 500px \/ 30fps/.test(x.nodes.get('43416:2265').name),
  },
  {
    slug: 'loading-spinner', what: '색이 #0A3C5C 한 값으로만 적힘',
    test: (p, x) => {
      const hexes = new Set();
      for (const [, n] of x.nodes) for (const m of n.name.matchAll(/HEX: (#[0-9A-Fa-f]{6})/g)) hexes.add(m[1].toUpperCase());
      return hexes.size === 1 && hexes.has('#0A3C5C');
    },
  },
];

const claims = CLAIMS.map(c => {
  const p = pages.find(q => q.slug === c.slug);
  const x = XML[c.slug];
  let held = false;
  try { held = !!(p && x && c.test(p, x)); } catch (e) { held = false; }
  if (!held) mismatches.push({ slug: c.slug, kind: 'claim-failed', detail: c.what });
  return { slug: c.slug, what: c.what, held, note: c.note || null };
});

const out = {
  $description: '손으로 옮겨 적은 «시작 전(—)» 쪽을 원자료 XML 과 대조한 결과입니다. '
    + '손으로 적은 수는 반드시 기계가 다시 셉니다.',
  why: 'GAP-32 — 표시만 보고 세지 않기로 했으면, 옮겨 적은 것도 원자료로 되짚을 수 있어야 합니다.',
  rule: [
    '어긋나면 조용히 맞추지 않고 mismatches 에 남깁니다.',
    'XML 이 페이지 일부만 담은 쪽은 scope 에 그 범위를 밝힙니다 — «전부 읽었다»로 세지 않습니다.',
    '여기서 드러난 정정은 지우지 않고 note 로 남깁니다.',
  ],
  verifiedAt: '2026-08-06',
  pages,
  claims,
  mismatches,
  counts: {
    pagesWithRaw: pages.filter(p => p.xml).length,
    pagesParsedElsewhere: pages.filter(p => p.parsedElsewhere).length,
    pagesWithoutEvidence: pages.filter(p => !p.xml && !p.parsedElsewhere).length,
    scoped: pages.filter(p => p.scope).length,
    claims: claims.length,
    claimsHeld: claims.filter(c => c.held).length,
    corrections: claims.filter(c => c.note).length,
    mismatches: mismatches.length,
  },
};

fs.writeFileSync(path.join(ROOT, 'data', 'transcribed-verify.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`원자료 대조 → data/transcribed-verify.json`);
console.log(`  원자료 XML ${out.counts.pagesWithRaw}쪽 · 파서 산출물 ${out.counts.pagesParsedElsewhere}쪽 · 근거 없음 ${out.counts.pagesWithoutEvidence}쪽`);
console.log(`  진술 ${out.counts.claims}건 중 ${out.counts.claimsHeld}건 성립 · 정정 ${out.counts.corrections}건`);
if (mismatches.length) {
  console.log('  어긋남:');
  for (const m of mismatches) console.log(`    ${m.slug} · ${m.kind} — ${m.detail}`);
}
