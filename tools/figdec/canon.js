'use strict';
// ✅ Foundation 페이지에서 "정본" 정의를 읽어 data/foundation-data.json 에 canon 블록으로 병합합니다.
// 레거시 스타일(현황)과 달리, 여기 있는 값이 팀이 정의한 기준입니다.
const { loadFig } = require('./kiwi');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = process.env.FIG_PATH || path.join(ROOT, 'canvas.fig');
const DATA = path.join(ROOT, 'data', 'foundation-data.json');
const KEEP = ['guid', 'parentIndex', 'type', 'name', 'size', 'transform', 'textData', 'fillPaints', 'fontSize'];

const PAGES = { color: '42066:25436', spacing: '42066:25438', typo: '42066:25472' };

const g2s = g => (g ? `${g.sessionID}:${g.localID}` : null);
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

const { doc } = loadFig(FIG, { NodeChange: KEEP, TextData: ['characters'] });
const nodes = new Map();
for (const c of doc.nodeChanges || []) { const id = g2s(c.guid); if (id) nodes.set(id, Object.assign(nodes.get(id) || {}, { _id: id }, c)); }
for (const [id, nd] of nodes) nd._p = nd.parentIndex ? g2s(nd.parentIndex.guid) : null;

const pgOf = new Map();
function page(id, seen) {
  if (pgOf.has(id)) return pgOf.get(id);
  const nd = nodes.get(id); if (!nd) return null;
  if (nd.type === 'CANVAS') { pgOf.set(id, id); return id; }
  const s = seen || new Set();
  if (!nd._p || s.has(id)) { pgOf.set(id, null); return null; }
  s.add(id); const p = page(nd._p, s); pgOf.set(id, p); return p;
}
for (const id of nodes.keys()) page(id);

// transform 은 부모 기준이라, 표의 행/열을 맞추려면 조상 체인을 누적해야 합니다.
const absCache = new Map();
function abs(id, depth = 0) {
  if (absCache.has(id)) return absCache.get(id);
  const nd = nodes.get(id);
  if (!nd || depth > 60) return { x: 0, y: 0 };
  const t = nd.transform || {};
  const local = { x: t.m02 || 0, y: t.m12 || 0 };
  const parent = nd._p ? nodes.get(nd._p) : null;
  const r = (!parent || parent.type === 'CANVAS') ? local
    : (p => ({ x: p.x + local.x, y: p.y + local.y }))(abs(nd._p, depth + 1));
  absCache.set(id, r);
  return r;
}

function texts(pageId) {
  const out = [];
  for (const nd of nodes.values()) {
    if (pgOf.get(nd._id) !== pageId || nd.type !== 'TEXT') continue;
    if (!nd.textData || !nd.textData.characters) continue;
    const t = nd.textData.characters.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const a = abs(nd._id);
    out.push({ t, x: round(a.x), y: round(a.y) });
  }
  return out;
}

// ---------- Spacing 정본 스케일 ----------
// 표는 [토큰명][px][배수] 3열이 같은 행(y)에 놓입니다.
const spTexts = texts(PAGES.spacing);
const spacing = [];
for (const t of spTexts.filter(x => /^Spacing_\d+$/.test(x.t))) {
  const row = spTexts.filter(x => x !== t && Math.abs(x.y - t.y) < 12 && x.x > t.x).sort((a, b) => a.x - b.x);
  const px = row.find(x => /^\d+px$/.test(x.t));
  const mul = row.find(x => /^\d+X$/i.test(x.t));
  if (!px) continue;
  spacing.push({ token: t.t, px: parseInt(px.t, 10), mul: mul ? mul.t : null, y: t.y });
}
spacing.sort((a, b) => a.px - b.px);

// 같은 토큰명이 서로 다른 px 를 갖는지 — 정본 내부 충돌
const byToken = new Map();
for (const s of spacing) { if (!byToken.has(s.token)) byToken.set(s.token, []); byToken.get(s.token).push(s.px); }
const spacingConflicts = [...byToken].filter(([, v]) => new Set(v).size > 1)
  .map(([token, v]) => ({ token, values: [...new Set(v)].sort((a, b) => a - b) }));

// ---------- Color 정본 팔레트 ----------
const colorTexts = texts(PAGES.color);
const palette = colorTexts.filter(t => /^#[0-9A-Fa-f]{6}$/.test(t.t))
  .map(t => t.t.toUpperCase());
const paletteUniq = [...new Set(palette)];

// 위계 정의 문장 (Primary/Secondary/Tertiary)
const grab = re => (colorTexts.find(t => re.test(t.t)) || {}).t || null;
const hierarchy = {
  primary: grab(/Primary \(프라이머리\) 색상은/),
  secondary: grab(/Secondary \(세컨더리\) 색상은/),
  tertiary: grab(/Tertiary \(터셔리\) 색상은/),
  definition: grab(/^Color \(색상\)은/),
};
const spacingDef = spTexts.find(t => /^Spacing\(스페이싱\)은/.test(t.t));

// ---------- Typography 정본 스케일 ----------
// 표 한 행 = [토큰명] [굵기] [크기] [행간] [사용영역]
const tyTexts = texts(PAGES.typo);
const TOKEN_RE = /^(Display|Title|Body|Caption|Heading|Label)\s*\d+$/i;
const typo = [];
for (const t of tyTexts.filter(x => TOKEN_RE.test(x.t))) {
  const row = tyTexts.filter(x => x !== t && Math.abs(x.y - t.y) < 10 && x.x > t.x).sort((a, b) => a.x - b.x);
  const weight = row.find(x => /^(Bold|Semibold|Medium|Regular|Light)\s*\(\d+\)$/i.test(x.t));
  const size = row.find(x => /^\d{1,3}px$/.test(x.t));
  const lh = row.find(x => /^(Auto|\d{1,3}(px|%))$/i.test(x.t) && x !== size);
  const usage = row.filter(x => x !== weight && x !== size && x !== lh).slice(-1)[0];
  if (!size && !weight) continue;
  typo.push({
    token: t.t.replace(/\s+/g, ' '),
    weight: weight ? weight.t : null,
    size: size ? parseInt(size.t, 10) : null,
    lineHeight: lh ? lh.t : null,
    usage: usage ? usage.t.slice(0, 40) : null,
  });
}
// 같은 토큰명이 서로 다른 크기를 갖는지
const tyBy = new Map();
for (const t of typo) { if (!tyBy.has(t.token)) tyBy.set(t.token, []); tyBy.get(t.token).push(t.size); }
const typoConflicts = [...tyBy].filter(([, v]) => new Set(v.filter(Boolean)).size > 1)
  .map(([token, v]) => ({ token, values: [...new Set(v.filter(Boolean))].sort((a, b) => a - b) }));
typo.sort((a, b) => (b.size || 0) - (a.size || 0));

// ---------- G-11: 스와치 ↔ 라벨 대조 (구조 기반) ----------
// 좌표 대신 조상 체인을 씁니다. 팔레트 셀 = HEX 라벨과 색면을 함께 담은 프레임.
const childrenOf = new Map();
for (const nd of nodes.values()) {
  if (!nd._p) continue;
  if (!childrenOf.has(nd._p)) childrenOf.set(nd._p, []);
  childrenOf.get(nd._p).push(nd._id);
}
function descendants(id, out = [], depth = 0) {
  if (depth > 6) return out;
  for (const c of childrenOf.get(id) || []) { out.push(c); descendants(c, out, depth + 1); }
  return out;
}
function solidFillHex(nd) {
  const p = (nd.fillPaints || []).find(x => x.type === 'SOLID' && x.color);
  if (!p || !nd.size) return null;
  if (nd.size.x * nd.size.y < 2000) return null;   // 아이콘·선 제외, 팔레트 칩 크기만
  return '#' + [p.color.r, p.color.g, p.color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const g11 = { checked: 0, match: 0, mismatch: [], unpaired: 0 };
for (const nd of nodes.values()) {
  if (pgOf.get(nd._id) !== PAGES.color || nd.type !== 'TEXT') continue;
  const txt = nd.textData && nd.textData.characters ? nd.textData.characters.trim() : '';
  if (!/^#[0-9A-Fa-f]{6}$/.test(txt)) continue;
  // 조상을 한 단계씩 올라가며, 색면을 가진 형제/자손을 찾습니다
  let cur = nd._p, found = null;
  for (let up = 0; up < 4 && cur && !found; up++) {
    for (const d of descendants(cur)) {
      if (d === nd._id) continue;
      const h = solidFillHex(nodes.get(d) || {});
      if (h) { found = h; break; }
    }
    cur = (nodes.get(cur) || {})._p;
  }
  if (!found) { g11.unpaired++; continue; }
  g11.checked++;
  if (found === txt.toUpperCase()) g11.match++;
  else g11.mismatch.push({ label: txt.toUpperCase(), swatch: found, node: nd._id });
}

const canon = {
  typography: {
    scale: typo,
    conflicts: typoConflicts,
    source: 'Typography system (타이포 시스템) ✅ · 42066:25472',
  },
  g11,
  spacing: {
    unit: '1 unit = 2px',
    scale: spacing.map(({ token, px, mul }) => ({ token, px, mul })),
    conflicts: spacingConflicts,
    definition: spacingDef ? spacingDef.t : null,
    source: 'Spacing system (스페이싱 시스템) ✅ · 42066:25438',
  },
  color: {
    palette: paletteUniq,
    paletteCount: palette.length,
    hierarchy,
    source: 'Color system (컬러 시스템) ✅ · 42066:25436',
  },
  // 주의: 스와치↔라벨 좌표 대조(G-11)는 이 스크립트로 신뢰할 수 없습니다.
  // 오토레이아웃 안에서 transform 만으로 절대 좌표가 복원되지 않아, 열 위치가 뭉갭니다.

};

const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
D.canon = canon;
fs.writeFileSync(DATA, JSON.stringify(D));

console.log('=== Spacing 정본 ===');
canon.spacing.scale.forEach(s => console.log(`  ${s.token.padEnd(14)} ${String(s.px + 'px').padStart(6)}  ${s.mul || ''}`));
console.log(`\n토큰명 충돌 ${spacingConflicts.length}건`);
spacingConflicts.forEach(c => console.log(`  ${c.token}: ${c.values.join('px / ')}px`));
console.log(`\n=== Color 정본 ===\n  HEX 라벨 ${palette.length}개 · 고유 ${paletteUniq.length}개`);
console.log(`\ndata/foundation-data.json 에 canon 블록 병합 완료`);
