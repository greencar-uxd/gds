'use strict';
/**
 * Figma 페이지를 «직접» 읽은 결과를 구조로 옮깁니다.
 *
 * 왜 있는가 (2026-08-06):
 *   등록된 스타일·에셋 목록만 보고 «🚧 이니 내용이 없다»고 단정했다가 Icon system 에서
 *   세 가지를 틀렸습니다. 🚧 는 «미완»이지 «빈 페이지»가 아닙니다.
 *   그래서 🚧 페이지도 전부 열어 읽고, 읽은 것을 이 파서로 구조화합니다.
 *
 * 입력  — MCP get_metadata(fileKey, nodeId) 결과 XML 을 파일로 저장한 것.
 *         (MCP 호출은 스크립트에서 못 하므로 «읽어서 저장 → 파싱» 두 단계입니다.)
 * 출력  — data/figma-pages/<slug>.json
 *
 * 지어내지 않는 규칙:
 *   · 노드 이름을 그대로 옮깁니다. 오타도 고치지 않고 typos 로 따로 셉니다.
 *   · 텍스트 노드의 «이름»은 Figma 에서 본문 문자열입니다. 본문이 없으면 자동 이름(Frame 123)입니다.
 *   · 템플릿을 복사만 하고 안 채운 자리는 stubs 로 셉니다 — «있다»고 세면 안 되는 것들입니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// 채우지 않은 문서화 템플릿의 흔적. 이걸 «내용»으로 세면 안 됩니다.
const STUB = /^(설명글|설명|레벨 값|Reference|Type|Level|Usage|Structure|Style|Component|\[\]|Glossary|지카 디자인 시스템 문서화 템플릿)$/;
// Figma 가 자동으로 붙인 이름 — 사람이 지은 이름이 아닙니다.
const AUTONAME = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Component|Instance|Union|Subtract)[\s_]?\d*$/i;

const NODE_RE = /^(\s*)<(\w+) id="([^"]+)" name="([^"]*)"(?:[^>]*?)x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/;

function unescapeXml(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** XML 을 평평한 노드 배열로. depth 로 계층을 유지합니다. */
function parseNodes(xml) {
  const out = [];
  for (const line of xml.split('\n')) {
    const m = line.match(NODE_RE);
    if (!m) continue;
    out.push({
      depth: m[1].length / 2,
      type: m[2],
      id: m[3],
      name: unescapeXml(m[4]),
      x: +m[5], y: +m[6], w: +m[7], h: +m[8],
    });
  }
  return out;
}

/** 각 노드의 조상 사슬(이름) — 텍스트가 어느 프레임 안에 있었는지 잃지 않기 위함입니다. */
function withPaths(nodes) {
  const stack = [];
  for (const n of nodes) {
    while (stack.length && stack[stack.length - 1].depth >= n.depth) stack.pop();
    n.path = stack.map(s => s.name);
    stack.push(n);
  }
  return nodes;
}

/** 하위 노드를 depth 로 잘라냅니다. */
function subtree(nodes, i) {
  const base = nodes[i].depth;
  const out = [nodes[i]];
  for (let j = i + 1; j < nodes.length && nodes[j].depth > base; j++) out.push(nodes[j]);
  return out;
}

/** «Property 1=Long, Property 2=Focus Out» 같은 변형 이름을 축으로 가릅니다. */
function variantAxes(symbols) {
  const axes = {};
  const unparsed = [];
  for (const s of symbols) {
    if (!/=/.test(s.name)) { unparsed.push(s.name); continue; }
    for (const part of s.name.split(',')) {
      const [k, ...v] = part.split('=');
      if (!v.length) { unparsed.push(s.name); continue; }
      const key = k.trim(), val = v.join('=').trim();
      (axes[key] = axes[key] || {});
      axes[key][val] = (axes[key][val] || 0) + 1;
    }
  }
  return { axes, unparsed };
}

/** 대소문자만 다른 이름 — 원본 표기 흔들림입니다. 고치지 않고 셉니다. */
function caseCollisions(values) {
  const byLower = {};
  for (const v of values) (byLower[v.toLowerCase()] = byLower[v.toLowerCase()] || new Set()).add(v);
  return Object.entries(byLower)
    .filter(([, set]) => set.size > 1)
    .map(([lower, set]) => ({ lower, forms: [...set].sort() }));
}

function parsePage(xml, meta) {
  const nodes = withPaths(parseNodes(xml));
  const canvas = xml.match(/<canvas id="([^"]+)" name="([^"]*)"/);
  const byType = {};
  for (const n of nodes) byType[n.type] = (byType[n.type] || 0) + 1;

  const tops = nodes.filter(n => n.depth === 1)
    .map(n => ({ type: n.type, id: n.id, name: n.name, w: n.w, h: n.h }));

  const texts = nodes.filter(n => n.type === 'text');
  const named = texts.filter(t => !AUTONAME.test(t.name));
  const stubs = named.filter(t => STUB.test(t.name.trim()));

  const symbols = nodes.filter(n => n.type === 'symbol')
    .map(n => ({ id: n.id, name: n.name, w: n.w, h: n.h, in: n.path[n.path.length - 1] || null }));
  const va = variantAxes(symbols);

  return {
    $description: `${meta.title} 페이지를 MCP get_metadata 로 직접 읽은 결과입니다. 노드 이름을 그대로 옮겼고 오타도 고치지 않았습니다.`,
    source: {
      file: 'Gx9UHfQdhSdHzr1j8Kp1Ab',
      node: canvas ? canvas[1] : meta.node,
      pageName: canvas ? unescapeXml(canvas[2]) : meta.title,
      figmaStatus: meta.status,
      how: 'mcp__Figma__get_metadata(fileKey, nodeId) → XML 저장 → tools/parse-figma-page.js',
    },
    readAt: meta.readAt,
    counts: {
      nodes: nodes.length,
      byType,
      topLevel: tops.length,
      texts: texts.length,
      namedTexts: named.length,
      templateStubs: stubs.length,
      symbols: symbols.length,
    },
    topFrames: tops,
    componentSets: symbols.length ? {
      total: symbols.length,
      axes: va.axes,
      unparsed: va.unparsed,
      caseCollisions: caseCollisions(symbols.flatMap(s =>
        s.name.split(',').map(p => (p.split('=')[1] || '').trim()).filter(Boolean))),
      items: symbols,
    } : null,
    templateStubs: {
      why: '문서화 템플릿을 복사만 하고 채우지 않은 자리입니다. «내용 있음»으로 세면 안 됩니다.',
      items: [...new Set(stubs.map(s => s.name.trim()))].sort(),
      count: stubs.length,
    },
    // 본문 텍스트를 조상 사슬과 함께 그대로 남깁니다 — XML 없이도 이 파일만으로 재현됩니다.
    texts: named.map(t => ({ id: t.id, text: t.name, in: t.path.slice(1), x: t.x, y: t.y })),
    _nodes: nodes,   // 페이지별 추출기가 쓰는 원자료. 저장 시 뺍니다.
  };
}

/** 프레임 이름으로 하위 텍스트만 뽑습니다 — 페이지별 추출기가 씁니다. */
function textsUnder(page, frameName) {
  const i = page._nodes.findIndex(n => n.name === frameName);
  if (i < 0) return [];
  return subtree(page._nodes, i).filter(n => n.type === 'text' && !AUTONAME.test(n.name));
}

function save(page, slug) {
  const out = { ...page };
  delete out._nodes;
  const dir = path.join(ROOT, 'data', 'figma-pages');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, slug + '.json'), JSON.stringify(out, null, 2) + '\n');
  return path.join('data', 'figma-pages', slug + '.json');
}

module.exports = { parsePage, textsUnder, subtree, save, AUTONAME, STUB, unescapeXml };

if (require.main === module) {
  const [file, slug, title, status, node] = process.argv.slice(2);
  if (!file || !slug) {
    console.error('사용법: node tools/parse-figma-page.js <XML경로> <slug> [제목] [상태] [노드ID]');
    process.exit(1);
  }
  const page = parsePage(fs.readFileSync(file, 'utf8'), {
    title: title || slug, status: status || 'wip', node: node || '', readAt: '2026-08-06',
  });
  const p = save(page, slug);
  console.log(`${page.source.pageName} → ${p}`);
  console.log(`  노드 ${page.counts.nodes} · 최상위 ${page.counts.topLevel} · 텍스트 ${page.counts.namedTexts}(빈 템플릿 ${page.counts.templateStubs}) · 변형 ${page.counts.symbols}`);
}
