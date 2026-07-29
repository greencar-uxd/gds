'use strict';
// 교차 검증 — REST 경로와 .fig 경로가 같은 값을 내는지 대조
// 두 경로가 어긋나면 자동화를 신뢰할 수 없으므로, 여기가 첫 관문입니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = path.join(ROOT, 'data', 'foundation-data.json');
const REST = path.join(ROOT, 'data', 'foundation-data.rest.json');

for (const p of [FIG, REST]) {
  if (!fs.existsSync(p)) { console.error(`없음: ${path.relative(ROOT, p)}`); process.exit(2); }
}
const A = JSON.parse(fs.readFileSync(FIG, 'utf8'));   // .fig
const B = JSON.parse(fs.readFileSync(REST, 'utf8'));  // REST

let diff = 0;
const line = (label, a, b) => {
  const same = a === b;
  if (!same) diff++;
  console.log(`  ${same ? 'OK  ' : 'DIFF'} ${label.padEnd(22)} .fig=${String(a).padStart(6)}  REST=${String(b).padStart(6)}`);
};

console.log('\n[개수 대조]');
line('페이지', A.pages.length, B.pages.length);
line('색 스타일', A.colors.length, B.colors.length);
line('타이포 스타일', A.types.length, B.types.length);
line('그림자 스타일', A.effects.length, B.effects.length);
line('페이지 ✅', A.pages.filter(p => p.mark === 'done').length, B.pages.filter(p => p.mark === 'done').length);
line('페이지 🚧', A.pages.filter(p => p.mark === 'wip').length, B.pages.filter(p => p.mark === 'wip').length);

console.log('\n[이름 기준 값 대조 — 양쪽에 다 있는 것만]');
const idx = (arr) => new Map(arr.map(x => [x.name, x]));

// 색
const ca = idx(A.colors), cb = idx(B.colors);
let both = 0, hexDiff = [];
for (const [name, a] of ca) {
  const b = cb.get(name); if (!b) continue;
  both++;
  if (a.hex !== b.hex) hexDiff.push(`${name}: .fig=${a.hex} REST=${b.hex}`);
}
console.log(`  색 공통 ${both}개 · HEX 불일치 ${hexDiff.length}개`);
hexDiff.slice(0, 10).forEach(s => console.log(`    ${s}`));
if (hexDiff.length) diff++;

// 타이포
const ta = idx(A.types), tb = idx(B.types);
let tboth = 0, tDiff = [];
for (const [name, a] of ta) {
  const b = tb.get(name); if (!b) continue;
  tboth++;
  if (a.size !== b.size || a.family !== b.family)
    tDiff.push(`${name}: .fig=${a.family}/${a.size} REST=${b.family}/${b.size}`);
}
console.log(`  타이포 공통 ${tboth}개 · 불일치 ${tDiff.length}개`);
tDiff.slice(0, 10).forEach(s => console.log(`    ${s}`));
if (tDiff.length) diff++;

// 그림자
const ea = idx(A.effects), eb = idx(B.effects);
let eboth = 0, eDiff = [];
for (const [name, a] of ea) {
  const b = eb.get(name); if (!b) continue;
  eboth++;
  const key = x => x.layers.map(l => `${l.type}|${l.x},${l.y},${l.blur},${l.spread}|${l.alpha}`).join(' + ');
  if (key(a) !== key(b)) eDiff.push(`${name}\n      .fig: ${key(a)}\n      REST: ${key(b)}`);
}
console.log(`  그림자 공통 ${eboth}개 · 불일치 ${eDiff.length}개`);
eDiff.slice(0, 6).forEach(s => console.log(`    ${s}`));
if (eDiff.length) diff++;

console.log('\n[한쪽에만 있는 것]');
const only = (m1, m2, label) => {
  const names = [...m1.keys()].filter(k => !m2.has(k));
  console.log(`  ${label}: ${names.length}개`);
  names.slice(0, 8).forEach(nm => console.log(`    ${nm}`));
};
only(ca, cb, '색 — .fig 에만');
only(cb, ca, '색 — REST 에만');
only(ea, eb, '그림자 — .fig 에만');
only(eb, ea, '그림자 — REST 에만');

console.log('\n[스냅샷 시점]');
console.log(`  .fig  export      : ${A.meta.exported}`);
console.log(`  REST  lastModified: ${B.meta.exported} (version ${B.meta.figma_version || '?'})`);
console.log('  ※ 시점이 다르면 차이가 나는 것이 정상입니다. 차이를 "틀림"으로 단정하지 않습니다.');

console.log(`\n${diff === 0 ? '일치' : '차이 있음'} — 불일치 항목 ${diff}종`);
process.exit(0); // 대조는 정보 제공용이므로 실패로 처리하지 않습니다
