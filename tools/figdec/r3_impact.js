'use strict';
// R-3(표 B · 20px 상한) 채택에 따른 변경 대상 산출
// 표 B 는 Radius system 🚧 페이지(42415:11358) 원문에서 읽은 값입니다. [팩트]
const { loadFig } = require('./kiwi');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = process.env.FIG_PATH || path.join(ROOT,'canvas.fig');
const KEEP = ['guid', 'parentIndex', 'type', 'name', 'size', 'symbolData', 'componentKey',
  'cornerRadius', 'rectangleCornerRadiiIndependent',
  'rectangleTopLeftCornerRadius', 'rectangleTopRightCornerRadius',
  'rectangleBottomLeftCornerRadius', 'rectangleBottomRightCornerRadius'];

// 표 B — Level / 컨테이너 크기 / 반경 / 적용 컴포넌트
const TABLE_B = [
  { level: 'Xsmall', sizes: [8, 12, 16], radii: [4, 4, 8], apply: 'Element' },
  { level: 'Small', sizes: [20, 24, 32], radii: [8, 10, 10], apply: 'Chips, Checkbox, Radio button, Switch, Tag' },
  { level: 'Medium', sizes: [40, 48, 56, 64], radii: [12, 12, 14, 14], apply: 'Button, Text input, Textarea, Select, Carousel-Number, Step indicator, Pagination' },
  { level: 'Large', sizes: [72, 80], radii: [16, 16], apply: 'Card, Dialog' },
  { level: 'Xlarge', sizes: [96, 120], radii: [20, 20], apply: 'Banner, Dialog, Bottom sheet' },
];
// 컨테이너 크기 = min(width,height) 기준으로 가장 가까운 구간에 배정
const STOPS = [];
for (const b of TABLE_B) b.sizes.forEach((s, i) => STOPS.push({ size: s, radius: b.radii[i], level: b.level, apply: b.apply }));
STOPS.sort((a, b) => a.size - b.size);

function targetB(dim) {
  if (!(dim > 0)) return null;
  let best = STOPS[0], bd = Infinity;
  for (const s of STOPS) { const d = Math.abs(s.size - dim); if (d < bd) { bd = d; best = s; } }
  return best;
}

const g2s = g => (g ? `${g.sessionID}:${g.localID}` : null);
const { doc } = loadFig(FIG, { NodeChange: KEEP });
const nodes = new Map();
for (const c of doc.nodeChanges || []) { const id = g2s(c.guid); if (id) nodes.set(id, Object.assign(nodes.get(id) || {}, c)); }
for (const [id, n] of nodes) { n._id = id; n._p = n.parentIndex ? g2s(n.parentIndex.guid) : null; }

// 페이지 귀속
const pgOf = new Map(), pgName = new Map();
for (const [id, n] of nodes) if (n.type === 'CANVAS') pgName.set(id, n.name);
function page(id, seen) {
  if (pgOf.has(id)) return pgOf.get(id);
  const n = nodes.get(id); if (!n) return null;
  if (n.type === 'CANVAS') { pgOf.set(id, id); return id; }
  const s = seen || new Set();
  if (!n._p || s.has(id)) { pgOf.set(id, null); return null; }
  s.add(id); const p = page(n._p, s); pgOf.set(id, p); return p;
}
for (const id of nodes.keys()) page(id);

function radii(n) {
  if (n.rectangleCornerRadiiIndependent) {
    return [n.rectangleTopLeftCornerRadius, n.rectangleTopRightCornerRadius,
    n.rectangleBottomLeftCornerRadius, n.rectangleBottomRightCornerRadius].filter(v => typeof v === 'number');
  }
  return typeof n.cornerRadius === 'number' ? [n.cornerRadius] : [];
}

// 마스터별 인스턴스 수
const instOfMaster = new Map();
for (const n of nodes.values()) {
  if (n.type !== 'INSTANCE' || !n.symbolData) continue;
  const sid = g2s(n.symbolData.symbolID);
  if (!sid) continue;
  if (!instOfMaster.has(sid)) instOfMaster.set(sid, []);
  instOfMaster.get(sid).push(n._id);
}

// 컴포넌트 페이지(✅/🚧 마크가 있는 페이지)만 대상 — R-3 범위가 "Radius 컴포넌트"이므로
const rows = [];
for (const n of nodes.values()) {
  if (n.type !== 'SYMBOL') continue;
  const pid = pgOf.get(n._id);
  const pname = pid ? pgName.get(pid) : null;
  if (!pname || !/[✅🚧]/.test(pname)) continue;
  const rs = radii(n).filter(v => v > 0);
  if (!rs.length) continue;
  if (rs.some(v => v >= 888)) continue;               // circular 관례는 radius-max 토큰, 표 B 대상 아님
  if (!rs.every(Number.isInteger)) continue;           // 비정수는 스케일 아티팩트로 보고 제외
  const w = n.size ? n.size.x : 0, h = n.size ? n.size.y : 0;
  const dim = Math.min(w || Infinity, h || Infinity);
  const t = targetB(dim);
  if (!t) continue;
  const cur = Math.max(...rs);
  const insts = (instOfMaster.get(n._id) || []).length;
  rows.push({
    id: n._id, name: n.name || '', page: pname,
    w: Math.round(w), h: Math.round(h), cur, target: t.radius, level: t.level,
    change: cur !== t.radius, instances: insts,
  });
}

const changed = rows.filter(r => r.change);
const instTotal = changed.reduce((a, r) => a + r.instances, 0);

console.log('=== R-3(표 B · 20px 상한) 영향 ===');
console.log('컴포넌트 페이지 내 반경 보유 마스터 :', rows.length);
console.log('표 B 목표값과 다른 마스터(변경 대상):', changed.length);
console.log('그 마스터를 쓰는 인스턴스(자동 추종):', instTotal);
console.log('\n--- 변경 대상 마스터 ---');
console.log('노드ID'.padEnd(16), '현재→목표'.padEnd(12), '크기'.padEnd(12), '인스턴스'.padEnd(8), '페이지 / 이름');
for (const r of changed.sort((a, b) => b.instances - a.instances)) {
  console.log(r.id.padEnd(16), `${r.cur} → ${r.target}`.padEnd(12), `${r.w}x${r.h}`.padEnd(12),
    String(r.instances).padEnd(8), `${r.page} / ${r.name}`.slice(0, 60));
}
fs.writeFileSync(path.join(ROOT,'docs','r3-change-list.json'), JSON.stringify({ table_b: TABLE_B, rows }, null, 1));
const csv = ['node_id,page,name,width,height,current_radius,target_radius,level,instances,change'];
for (const r of rows) csv.push([r.id, `"${r.page}"`, `"${(r.name || '').replace(/"/g, "'")}"`, r.w, r.h, r.cur, r.target, r.level, r.instances, r.change].join(','));
fs.writeFileSync(path.join(ROOT,'docs','r3-change-list.csv'), csv.join('\n'));
console.log('\n저장: r3-change-list.json / r3-change-list.csv');
