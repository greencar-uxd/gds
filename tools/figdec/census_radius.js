'use strict';
// Radius 전역 census — 핸드오프 §7 앵커(11,043 도형 / circular 29.4% = 3,248) 재현 시도
const { build, radiiOf } = require('./index');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = process.env.FIG_PATH || path.join(ROOT,'canvas.fig');
const ix = build(FIG);

const CIRC = 9999; // circular-shape 관례값
let shapes = 0, circular = 0;
const valueHist = new Map();
const byType = new Map();
const rows = [];

for (const n of ix.nodes.values()) {
  const rs = radiiOf(n);
  if (!rs.length) continue;
  // 반경이 전부 0이면 "반경 사용 도형"이 아님
  const nz = rs.filter(v => v > 0);
  if (!nz.length) continue;
  shapes++;
  byType.set(n.type, (byType.get(n.type) || 0) + 1);
  const isCirc = nz.some(v => v >= CIRC);
  if (isCirc) circular++;
  for (const v of nz) valueHist.set(v, (valueHist.get(v) || 0) + 1);
  rows.push({ id: n._id, type: n.type, name: n.name || '', page: ix.pageOf.get(n._id), radii: rs, max: Math.max(...nz) });
}

console.log('반경 사용 도형 총계 :', shapes);
console.log('circular(>=9999)   :', circular, `(${(circular / shapes * 100).toFixed(1)}%)`);
console.log('\n타입별:');
for (const [k, v] of [...byType].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
console.log('\n반경 값 분포(상위 25, circular 제외):');
const hist = [...valueHist].filter(([v]) => v < CIRC).sort((a, b) => b[1] - a[1]).slice(0, 25);
for (const [v, c] of hist) console.log(`  ${String(v).padStart(10)} px  ${c}`);

fs.writeFileSync('/tmp/radius_rows.json', JSON.stringify(rows));
console.log('\n행 저장: /tmp/radius_rows.json (' + rows.length + '행)');
