'use strict';
/**
 * 간격 쓰임새 조사 — ✅ 컴포넌트 페이지에서 «간격이 어디에 쓰이는가»를 기계로 뽑습니다.
 *
 * 왜 필요한가:
 *   Spacing system ✅ 표에는 Usage 열이 없습니다(열 = Spacing · px · 배수).
 *   그래서 색·타이포와 달리 간격은 «쓰임새 → 값» 표가 정본에 없습니다(GAP-12).
 *   대신 원본 ✅ 페이지에는 디자이너가 «Spacing» 이라는 이름의 주석 프레임을
 *   실제 간격 자리마다 깔아 두었습니다. 그 프레임의 «크기»가 곧 간격 값입니다.
 *
 * 무엇을 하는가:
 *   저장된 get_metadata XML 에서 name="Spacing" 노드를 전부 찾아
 *     · 값       = 라벨 숫자(있으면) 또는 짧은 변의 길이
 *     · 방향     = 세로 띠(가로 간격) / 가로 띠(세로 간격)
 *     · 어디에   = 부모 이름 + 바로 앞뒤 형제 이름
 *   을 기록합니다. 이름을 지어내지 않습니다 — 원본에 있는 이름만 옮깁니다.
 *
 * 쓰는 법:  node tools/spacing-census.js <metadata.txt>...
 *          (파일명 앞에 `페이지이름=` 을 붙이면 그 이름으로 기록합니다)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const NODE = /^(\s*)<(\w[\w-]*) id="([^"]+)" name="((?:[^"\\]|\\.)*)"(?:[^>]*?)x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)>?/;

function parse(xml) {
  const lines = xml.split('\n');
  const nodes = [];
  const stack = [];
  for (const line of lines) {
    const m = line.match(NODE);
    if (!m) continue;
    const [, indent, tag, id, name, x, y, w, h, tail] = m;
    const depth = indent.length;
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const node = {
      tag, id, name, depth,
      x: +x, y: +y, w: +w, h: +h,
      hidden: /hidden="true"/.test(tail),
      parent: stack.length ? stack[stack.length - 1] : null,
      children: [],
    };
    if (node.parent) node.parent.children.push(node);
    nodes.push(node);
    if (!/\/>\s*$/.test(line)) stack.push(node);
  }
  return nodes;
}

// 라벨 숫자 — 주석 안에 <text name="24"> 같은 게 있으면 그게 값입니다.
function labelOf(n) {
  const out = [];
  (function walk(x) {
    if (x.tag === 'text' && /^\d+$/.test(x.name)) out.push(+x.name);
    x.children.forEach(walk);
  })(n);
  return out.length ? out[0] : null;
}
// «Spacing» 이름은 두 가지로 쓰입니다:
//   띠(band)   — 실제 간격 자리를 덮는 사각형. 짧은 변이 곧 간격 값.
//   말풍선(callout) — 치수를 가리키는 라벨. 안에 «Tag» 그래픽이 있습니다.
// 말풍선의 «크기»는 간격이 아니라 라벨 상자 크기입니다 — 이걸 값으로 읽으면 거짓이 섞입니다.
// 말풍선은 컴포넌트 인스턴스로 놓여 있어 metadata 에 자식이 안 나옵니다.
// 즉 라벨 숫자를 읽을 수 없습니다 — 크기(23×32 같은 라벨 상자)를 값으로 읽으면 거짓이 섞입니다.
function isCallout(n) {
  if (n.tag === 'instance') return true;
  let found = false;
  (function walk(x) { if (x.name === 'Tag') found = true; x.children.forEach(walk); })(n);
  return found;
}
function insideSpacing(n) {
  for (let p = n.parent; p; p = p.parent) if (p.name === 'Spacing') return true;
  return false;
}

// 어디에 놓였는가 — 부모와 바로 앞뒤 형제. 원본 이름 그대로.
function whereOf(n) {
  if (!n.parent) return { parent: null, before: null, after: null };
  const sib = n.parent.children.filter(c => c !== n && !c.hidden);
  const vertical = n.h >= n.w;              // 세로로 긴 띠 = 가로 간격
  const key = vertical ? 'x' : 'y';
  const before = sib.filter(c => c[key] + (vertical ? c.w : c.h) <= n[key] + 0.5).pop() || null;
  const after = sib.find(c => c[key] >= n[key] + (vertical ? n.w : n.h) - 0.5) || null;
  return { parent: n.parent.name, before: before && before.name, after: after && after.name };
}

const args = process.argv.slice(2);
if (!args.length) { console.error('사용법: node tools/spacing-census.js [페이지=]파일.txt ...'); process.exit(1); }

const rows = [];
const unreadable = [];
for (const arg of args) {
  const eq = arg.indexOf('=');
  const page = eq > 0 ? arg.slice(0, eq) : path.basename(arg);
  const file = eq > 0 ? arg.slice(eq + 1) : arg;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const xml = raw.map(x => x.text).join('');
  const nodes = parse(xml);
  for (const n of nodes) {
    if (n.name !== 'Spacing' || insideSpacing(n)) continue;
    const label = labelOf(n);
    const callout = isCallout(n);
    const vertical = n.h >= n.w;
    // 말풍선은 라벨을 읽을 수 있을 때만 씁니다. 못 읽으면 «읽지 못함»으로 셀 뿐 값으로 만들지 않습니다.
    if (callout && label == null) { unreadable.push({ page, id: n.id }); continue; }
    const value = callout ? label : (label != null ? label : Math.round(vertical ? n.w : n.h));
    if (!(value > 0)) continue;
    rows.push({ page, id: n.id, value, axis: vertical ? '가로' : '세로',
      kind: callout ? '말풍선' : '띠', ...whereOf(n) });
  }
}

// 집계 — 같은 (값, 부모) 가 몇 번 나오는지
const byValue = {};
for (const r of rows) {
  const k = String(r.value);
  (byValue[k] = byValue[k] || { value: r.value, count: 0, pages: new Set(), places: {} });
  byValue[k].count++;
  byValue[k].pages.add(r.page);
  const place = r.parent || '(최상위)';
  byValue[k].places[place] = (byValue[k].places[place] || 0) + 1;
}
const SPACING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gds-library.json'), 'utf8')).pages.spacing.값;
const summary = Object.values(byValue).sort((a, b) => b.count - a.count).map(v => ({
  value: v.value,
  onScale: SPACING.includes(v.value),
  count: v.count,
  pages: [...v.pages].sort(),
  places: Object.entries(v.places).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => `${k}×${c}`),
}));

const out = {
  $description: '간격 쓰임새 조사 — ✅ 페이지의 «Spacing» 주석 프레임을 기계로 읽은 것입니다. 이름을 지어내지 않았습니다.',
  generatedFrom: 'tools/spacing-census.js ← Figma get_metadata (✅ 페이지)',
  why: 'Spacing system ✅ 표에 Usage 열이 없어 «쓰임새 → 값» 표가 정본에 없습니다(GAP-12). 원본에서 유일하게 남아 있는 쓰임새 근거가 이 주석 프레임입니다.',
  method: '주석 프레임의 라벨 숫자(있으면) 또는 짧은 변의 길이를 값으로 보고, 부모·앞뒤 형제 이름을 «어디에» 로 기록합니다.',
  pages: [...new Set(rows.map(r => r.page))].sort(),
  counts: { annotations: rows.length, distinctValues: summary.length,
    offScale: summary.filter(s => !s.onScale).length,
    unreadable: unreadable.length },
  unreadable,
  summary,
  rows,
};
fs.writeFileSync(path.join(ROOT, 'data', 'spacing-census.json'), JSON.stringify(out, null, 2) + '\n');

console.log(`간격 쓰임새 조사 → data/spacing-census.json`);
console.log(`  ✅ 페이지 ${out.pages.length}곳 · 주석 ${rows.length}건 · 값 ${summary.length}종 (스케일 밖 ${out.counts.offScale}종) · 읽지 못한 말풍선 ${unreadable.length}건`);
for (const s of summary) {
  console.log(`  ${String(s.value).padStart(4)}px ${s.onScale ? ' ' : '✗'} ${String(s.count).padStart(3)}건  ${s.pages.join(', ')}`);
  console.log(`         ${s.places.join(' · ')}`);
}
