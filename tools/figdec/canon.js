'use strict';
// ✅ Foundation 페이지에서 "원본" 정의를 읽어 data/foundation-data.json 에 canon 블록으로 병합합니다.
// 레거시 스타일(현황)과 달리, 여기 있는 값이 팀이 정의한 기준입니다.
const { loadFig } = require('./kiwi');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = process.env.FIG_PATH || path.join(ROOT, 'canvas.fig');
const DATA = path.join(ROOT, 'data', 'foundation-data.json');
const KEEP = ['guid', 'parentIndex', 'type', 'name', 'size', 'transform', 'textData', 'fillPaints', 'fontSize', 'styleIdForFill'];

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

// ---------- Spacing 원본 스케일 ----------
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

// 원본의 토큰명 충돌 기록 (재명명 근거로 남깁니다)
const byToken = new Map();
for (const s of spacing) { if (!byToken.has(s.token)) byToken.set(s.token, []); byToken.get(s.token).push(s.px); }
const spacingConflicts = [...byToken].filter(([, v]) => new Set(v).size > 1)
  .map(([token, v]) => ({ token, values: [...new Set(v)].sort((a, b) => a - b) }));

// ---------- 간격 재명명 (강민관 결정 2026-07-29) ----------
// px 오름차순으로 0 · 100 · 200 … 100단위 순차 부여. 중복 이름이 사라집니다.
// 32px 이상은 기존 이름에서 한 칸씩 밀립니다 — was 에 이전 이름을 남겨 대조표를 만듭니다.
const spacingRenamed = spacing.map((s, i) => ({
  token: `Spacing_${i === 0 ? 0 : i * 100}`,
  was: s.token,
  px: s.px,
  mul: s.mul,
  moved: s.token !== `Spacing_${i === 0 ? 0 : i * 100}`,
}));

// ---------- Color 원본 팔레트 ----------
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

// ---------- Typography 원본 스케일 ----------
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


// ---------- 원본 스타일 이름 (Color system ✅ 페이지가 실제로 참조하는 스타일) ----------
// 중복 정리에서 "어느 이름을 남길지"의 근거가 됩니다.
const canonStyles = [];
{
  const seen = new Set();
  for (const nd of nodes.values()) {
    if (pgOf.get(nd._id) !== PAGES.color || nd.type !== 'TEXT') continue;
    const txt = nd.textData && nd.textData.characters ? nd.textData.characters.trim() : '';
    if (!/^#[0-9A-Fa-f]{6}$/.test(txt)) continue;
    let cell = nodes.get(nd._p); if (cell) cell = nodes.get(cell._p);
    if (!cell || !cell.styleIdForFill || !cell.styleIdForFill.guid) continue;
    const st = nodes.get(g2s(cell.styleIdForFill.guid));
    if (!st || !st.name || seen.has(st.name)) continue;
    seen.add(st.name);
    const pnt = (st.fillPaints || []).find(x => x.type === 'SOLID' && x.color);
    if (!pnt) continue;
    canonStyles.push({
      name: st.name,
      hex: '#' + [pnt.color.r, pnt.color.g, pnt.color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase(),
      label: txt.toUpperCase(),
    });
  }
}


// ---------- Elevation ----------
// 07-23 스냅샷 이후 Figma 에서 재넘버링됨 (구 1~5 → 2~6, 신규 1 추가).
// data/elevation-override.json 이 있으면 그것을 원본으로 씁니다.
// .fig 를 새로 내려받아 npm run extract 를 돌리면 override 를 지우고 원본 값을 쓰면 됩니다.
let elevation = null;
{
  const ovPath = path.join(ROOT, 'data', 'elevation-override.json');
  if (fs.existsSync(ovPath)) {
    const ov = JSON.parse(fs.readFileSync(ovPath, 'utf8'));
    elevation = {
      source: ov._source,
      note: ov._note,
      renumbered: !!ov.renumbered,
      confidence: ov._confidence,
      scale: ov.styles,
    };
  }
}

const canon = {
  elevation,
  typography: {
    scale: typo,
    conflicts: typoConflicts,
    source: 'Typography system (타이포 시스템) ✅ · 42066:25472',
  },
  g11,
  spacing: {
    unit: '1 unit = 2px',
    scale: spacingRenamed.map(({ token, was, px, mul, moved }) => ({ token, was, px, mul, moved })),
    conflicts: [],                       // 재명명으로 해소됨
    originalConflicts: spacingConflicts, // 재명명 근거 (원본 상태)
    renamed: true,
    renamedNote: '강민관 결정 2026-07-29 — px 오름차순 100단위 순차 부여',
    definition: spacingDef ? spacingDef.t : null,
    source: 'Spacing system (스페이싱 시스템) ✅ · 42066:25438',
  },
  color: {
    palette: paletteUniq,
    paletteCount: palette.length,
    styles: canonStyles,
    hierarchy,
    source: 'Color system (컬러 시스템) ✅ · 42066:25436',
  },
  // 주의: 스와치↔라벨 좌표 대조(G-11)는 이 스크립트로 신뢰할 수 없습니다.
  // 오토레이아웃 안에서 transform 만으로 절대 좌표가 복원되지 않아, 열 위치가 뭉갭니다.

};

const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
D.canon = canon;
fs.writeFileSync(DATA, JSON.stringify(D));

console.log('=== Spacing 원본 ===');
canon.spacing.scale.forEach(s => console.log(`  ${s.token.padEnd(14)} ${String(s.px + 'px').padStart(6)}  ${s.mul || ''}`));
console.log(`\n원본 토큰명 충돌 ${spacingConflicts.length}건 → 재명명으로 해소`);
console.log('=== 재명명 결과 ===');
spacingRenamed.forEach(s => console.log(`  ${String(s.px + 'px').padStart(6)}  ${s.was.padEnd(14)} → ${s.token}${s.moved ? '  [변경]' : ''}`));
if (elevation) console.log(`\n=== Elevation ===\n  ${elevation.scale.length}단계 (재넘버링 반영: ${elevation.renumbered ? '예' : '아니오'})`);
console.log(`\n=== Color 원본 ===\n  HEX 라벨 ${palette.length}개 · 고유 ${paletteUniq.length}개 · 참조 스타일 ${canonStyles.length}개`);
console.log(`\ndata/foundation-data.json 에 canon 블록 병합 완료`);
