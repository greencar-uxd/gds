'use strict';
// Figma REST API → data/foundation-data.json
// .fig 바이너리 추출기(tools/figdec/foundation.js)와 **동일한 형태**로 출력합니다.
// 두 경로가 같은 숫자를 내는지는 tools/figapi/compare.js 로 대조합니다.
//
// 사용:  FIGMA_TOKEN=... FIGMA_FILE_KEY=... node tools/figapi/fetch.js
// 토큰은 인자로 받지 않습니다 — 셸 히스토리에 남지 않도록 환경변수만 씁니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY || 'kWWJJfJcHKiU6ySvR1YyRr';
const OUT = process.env.OUT || path.join(ROOT, 'data', 'foundation-data.rest.json');

if (!TOKEN) {
  console.error('FIGMA_TOKEN 환경변수가 없습니다.');
  console.error('  export FIGMA_TOKEN="..."   ← 셸에서 직접 설정하세요');
  process.exit(2);
}

const API = 'https://api.figma.com/v1';
const H = { 'X-Figma-Token': TOKEN };

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(pathname, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(API + pathname, { headers: H });
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after') || 0) * 1000 || 2000 * (i + 1);
      console.error(`  ${res.status} — ${wait}ms 후 재시도 (${i + 1}/${tries})`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${pathname}\n${(await res.text()).slice(0, 300)}`);
    return res.json();
  }
  throw new Error(`재시도 소진: ${pathname}`);
}

// ---------- 1. 버전 확인 (가벼움) ----------
async function version() {
  const j = await api(`/files/${FILE_KEY}?depth=1`);
  return { version: j.version, lastModified: j.lastModified, name: j.name, pages: (j.document.children || []).length };
}

// ---------- 2. 스타일 목록 → 정의 노드 ----------
async function styleNodes() {
  const j = await api(`/files/${FILE_KEY}/styles`);
  const metas = (j.meta && j.meta.styles) || [];
  // 게시된(published) 스타일만 여기 나옵니다. 로컬 전용 스타일은 빠질 수 있습니다.
  return metas.map(s => ({ node_id: s.node_id, name: s.name, styleType: s.style_type, key: s.key }));
}

async function fetchNodes(ids) {
  const out = {};
  const CHUNK = 60; // URL 길이·응답 크기 방어
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    const j = await api(`/files/${FILE_KEY}/nodes?ids=${part.join(',')}`);
    Object.assign(out, j.nodes || {});
    process.stderr.write(`\r  노드 ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
  }
  process.stderr.write('\n');
  return out;
}

// ---------- 3. 매핑 — .fig 추출기와 동일한 형태 ----------
function mapPaint(node) {
  const ps = node.fills || [];
  const p = ps.find(x => x.type === 'SOLID' && x.color) || ps[0];
  if (!p || !p.color) return null;
  return { hex: hex(p.color), opacity: round(p.opacity === undefined ? 1 : p.opacity, 3), alpha: round(p.color.a, 3) };
}

function mapType(node) {
  const t = node.style || {};
  let lh = null;
  if (t.lineHeightUnit === 'PIXELS') lh = { v: round(t.lineHeightPx), u: 'PIXELS' };
  else if (t.lineHeightUnit === 'FONT_SIZE_%') lh = { v: round(t.lineHeightPercentFontSize), u: 'PERCENT' };
  else if (t.lineHeightPx !== undefined) lh = { v: round(t.lineHeightPx), u: 'PIXELS' };
  return {
    family: t.fontFamily || null,
    style: t.fontPostScriptName ? String(t.fontPostScriptName).split('-').slice(1).join('-') || null : (t.fontWeight >= 700 ? 'Bold' : t.fontWeight >= 500 ? 'Medium' : 'Regular'),
    size: t.fontSize === undefined ? null : round(t.fontSize),
    lineHeight: lh,
    letterSpacing: t.letterSpacing === undefined ? null : { v: round(t.letterSpacing, 3), u: 'PIXELS' },
  };
}

function mapEffects(node) {
  return (node.effects || []).map(e => ({
    type: e.type,
    x: e.offset ? round(e.offset.x) : 0,
    y: e.offset ? round(e.offset.y) : 0,
    blur: round(e.radius || 0),
    spread: round(e.spread || 0),
    hex: e.color ? hex(e.color) : null,
    alpha: e.color ? round(e.color.a, 3) : null,
  }));
}

// ---------- 실행 ----------
(async () => {
  console.error('[1] 파일 버전 확인');
  const v = await version();
  console.error(`  ${v.name} · version=${v.version} · lastModified=${v.lastModified} · 최상위 페이지 ${v.pages}`);

  console.error('[2] 스타일 목록');
  const metas = await styleNodes();
  const byType = metas.reduce((a, s) => (a[s.styleType] = (a[s.styleType] || 0) + 1, a), {});
  console.error(`  ${metas.length}개 — ${JSON.stringify(byType)}`);
  if (!metas.length) {
    console.error('  ⚠ 게시된 스타일이 0건입니다 — 로컬 전용 스타일은 이 엔드포인트에 안 나옵니다.');
    console.error('    이 경우 REST 자동화로는 스타일 값을 못 읽습니다(.fig 경로 유지 필요). [확인필요]');
  }

  console.error('[3] 스타일 정의 노드 조회');
  const nodes = await fetchNodes(metas.map(s => s.node_id));

  const colors = [], types = [], effects = [];
  for (const s of metas) {
    const entry = nodes[s.node_id];
    const node = entry && entry.document;
    if (!node) continue;
    if (s.styleType === 'FILL') {
      const p = mapPaint(node);
      if (p) colors.push({ id: s.node_id, name: s.name, ...p });
    } else if (s.styleType === 'TEXT') {
      types.push({ id: s.node_id, name: s.name, ...mapType(node) });
    } else if (s.styleType === 'EFFECT') {
      effects.push({ id: s.node_id, name: s.name, layers: mapEffects(node) });
    }
  }

  // 페이지 목록
  const top = await api(`/files/${FILE_KEY}?depth=1`);
  const pages = (top.document.children || []).map(p => ({
    id: p.id, name: p.name,
    mark: /✅/.test(p.name) ? 'done' : /🚧/.test(p.name) ? 'wip' : 'none',
  }));

  const out = {
    meta: {
      source: `Figma REST API · ${FILE_KEY}`,
      exported: v.lastModified,
      figma_version: v.version,
      generated_from: 'REST /v1/files',
      nodeChanges: null,          // REST 로는 노드 전수를 세지 않습니다
      pages: pages.length,
      variables: null,            // Variables API 는 Enterprise 전용 — 읽을 수 없음
      styles: { FILL: colors.length, TEXT: types.length, EFFECT: effects.length },
    },
    pages,
    colors: colors.sort((a, b) => a.name.localeCompare(b.name)),
    types: types.sort((a, b) => (b.size || 0) - (a.size || 0)),
    effects: effects.sort((a, b) => a.name.localeCompare(b.name)),
    radius: { shapes: null, hist: [] },   // 반경 census 는 .fig 경로에서만
    shadow: { total: null, hist: [] },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.error(`\n저장: ${path.relative(ROOT, OUT)}`);
  console.error(`색 ${colors.length} · 타이포 ${types.length} · 그림자 ${effects.length} · 페이지 ${pages.length}`);
})().catch(e => { console.error('\n실패:', e.message); process.exit(1); });
