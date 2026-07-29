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

const canon = {
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
  g11_note: '스와치↔라벨 대조는 좌표 복원 한계로 미수행 [미확인]',
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
