'use strict';
/**
 * 통폐합 매핑 — 레거시 색 스타일 649개를 정본 기준으로 어디로 보낼지 전수 판정.
 * 결정: "중복되는 색상은 현재 문서(✅ Color system 정본)에 명시된 것 기준으로 통폐합" (강민관, 2026-08-04)
 *
 * 출력: data/color-merge.json · docs/color-merge-map.csv · docs/GDS-color-merge-v0.1.md
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));
const D = VIEW.D;
const CANON = VIEW.colors;

// ---------- 색차 (CIE76 ΔE — Lab 유클리드 거리) ----------
function rgb(hex) { const v = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); }
function lab(hex) {
  let [r, g, b] = rgb(hex).map(c => c / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => { const [x, y, z] = lab(a), [p, q, r] = lab(b); return Math.hypot(x - p, y - q, z - r); };

// ---------- 정본 인덱스 ----------
const canonByHex = new Map();
for (const c of CANON) if (!canonByHex.has(c.hex.toUpperCase())) canonByHex.set(c.hex.toUpperCase(), c);
const nearest = hex => CANON
  .map(c => ({ c, d: dE(hex, c.hex) }))
  .sort((a, b) => a.d - b.d)[0];

// ---------- 레거시 전수 판정 ----------
// 판정 코드
//  ABSORB   정본과 값이 정확히 같음 → 정본 토큰으로 치환 후 삭제
//  RESOLVE  같은 이름이 두 값을 가짐 → 정본에 있는 쪽 채택 (정본 기준 통폐합)
//  NEAR     정본에 없으나 육안 구분이 어려운 근사값(ΔE ≤ 2.3) → 정본으로 흡수 권고
//  RETIRE   정본에 없고, 시스템에서 빼기로 결정된 색 → 지정된 정본 토큰으로 치환 후 삭제
//  REVIEW   정본에 없고 색차도 큼 → 개별 판단 필요
const NEAR_LIMIT = 2.3; // JND — 이 값 이하는 일반적으로 구분되지 않습니다

const legacy = D.colors.map(s => ({ ...s, hexU: s.hex.toUpperCase() }));

// 같은 이름이 여러 값을 갖는 케이스 파악
const byName = new Map();
for (const s of legacy) { if (!byName.has(s.name)) byName.set(s.name, []); byName.get(s.name).push(s); }
const conflictNames = new Set([...byName.entries()]
  .filter(([, a]) => new Set(a.map(x => x.hexU)).size > 1).map(([n]) => n));

// 확정된 폐기 처분 (data/color-decisions.json · orphanDispositions)
const DISPOSE = new Map();
for (const o of VIEW.orphanDispositions) DISPOSE.set(o.hex.toUpperCase(), o);
const badDispose = [...DISPOSE.values()].filter(o => !CANON.some(c => c.name === o.target));
if (badDispose.length) throw new Error(`orphanDispositions 의 치환 대상이 정본에 없습니다: ${badDispose.map(o => o.target).join(', ')}`);

const rows = legacy.map(s => {
  const disp = DISPOSE.get(s.hexU);
  if (disp) {
    const t = CANON.find(c => c.name === disp.target);
    return {
      style: s.name, id: s.id, hex: s.hex,
      verdict: 'RETIRE', target: t.name, targetHex: t.hex, delta: disp.deltaE,
      note: `시스템에서 제거 확정 (${VIEW.DEC.decidedAt}) — ${disp.target} 으로 치환`,
    };
  }
  const exact = canonByHex.get(s.hexU);
  const conflicted = conflictNames.has(s.name);
  if (exact) {
    return {
      style: s.name, id: s.id, hex: s.hex,
      verdict: conflicted ? 'RESOLVE' : 'ABSORB',
      target: exact.name, targetHex: exact.hex, delta: 0,
      note: conflicted ? '같은 이름의 다른 값은 정본에 없음 — 이 값을 채택' : '',
    };
  }
  const n = nearest(s.hex);
  return {
    style: s.name, id: s.id, hex: s.hex,
    verdict: n.d <= NEAR_LIMIT ? 'NEAR' : 'REVIEW',
    target: n.c.name, targetHex: n.c.hex, delta: Number(n.d.toFixed(2)),
    note: n.d <= NEAR_LIMIT ? '육안 구분 한계 이하 — 정본으로 흡수 권고' : '정본과 색차 큼 — 개별 판단',
  };
});

const count = v => rows.filter(r => r.verdict === v).length;

// ---------- 이름-값 충돌 판정 결과 ----------
const conflictResolution = [...conflictNames].map(name => {
  const vals = [...new Set(byName.get(name).map(s => s.hexU))];
  const inCanon = vals.filter(h => canonByHex.has(h));
  return {
    name, values: vals, count: byName.get(name).length,
    canonSide: inCanon,
    verdict: inCanon.length === 1 ? '정본 값 채택' : inCanon.length === 0 ? '양쪽 다 정본에 없음 — 개별 판단' : '양쪽 다 정본에 있음 — 개별 판단',
    adopt: inCanon.length === 1 ? { hex: inCanon[0], token: canonByHex.get(inCanon[0]).name } : null,
    drop: inCanon.length === 1 ? vals.filter(h => h !== inCanon[0]) : [],
  };
}).sort((a, b) => b.count - a.count);

const autoResolved = conflictResolution.filter(c => c.adopt).length;

// ---------- 정본에 없는 고유 HEX ----------
const orphanHexes = [...new Set(rows.filter(r => r.verdict !== 'ABSORB' && r.verdict !== 'RESOLVE').map(r => r.hex.toUpperCase()))];
const retiredHexes = new Set([...DISPOSE.keys()]);
const orphans = orphanHexes.map(h => {
  const n = nearest(h);
  const styles = [...new Set(legacy.filter(s => s.hexU === h).map(s => s.name))];
  return { hex: h, styles: styles.length, sample: styles[0], target: n.c.name, targetHex: n.c.hex, delta: Number(n.d.toFixed(2)) };
}).sort((a, b) => a.delta - b.delta);

const retired = orphans.filter(o => retiredHexes.has(o.hex));
const nearOrphans = orphans.filter(o => !retiredHexes.has(o.hex) && o.delta <= NEAR_LIMIT);
const reviewOrphans = orphans.filter(o => !retiredHexes.has(o.hex) && o.delta > NEAR_LIMIT);

const result = {
  meta: {
    generated_from: 'tools/audit/merge_map.js',
    basis: VIEW.DEC.rules.mergeBase.value,
    decidedBy: VIEW.DEC.decidedBy, decidedAt: VIEW.DEC.decidedAt,
    source: D.meta.source, exported: D.meta.exported,
    nearLimit: NEAR_LIMIT, deltaFormula: 'CIE76 (Lab 유클리드)',
  },
  totals: {
    legacyStyles: rows.length,
    absorb: count('ABSORB'), resolve: count('RESOLVE'), near: count('NEAR'),
    retire: count('RETIRE'), review: count('REVIEW'),
    mergeable: count('ABSORB') + count('RESOLVE') + count('NEAR') + count('RETIRE'),
    canonStyles: CANON.length,
    orphanHex: orphans.length, orphanNear: nearOrphans.length,
    orphanRetired: retired.length, orphanReview: reviewOrphans.length,
    conflictNames: conflictResolution.length, conflictAutoResolved: autoResolved,
  },
  conflictResolution, orphans, retired,
};

fs.writeFileSync(path.join(ROOT, 'data', 'color-merge.json'), JSON.stringify(result, null, 2));

const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
let csv = '판정,레거시 스타일,node_id,HEX,정본 대상,정본 HEX,색차(ΔE),비고\n';
for (const r of rows.sort((a, b) => a.verdict.localeCompare(b.verdict) || b.delta - a.delta)) {
  csv += [r.verdict, esc(r.style), esc(r.id), esc(r.hex), esc(r.target), esc(r.targetHex), r.delta, esc(r.note)].join(',') + '\n';
}
fs.writeFileSync(path.join(ROOT, 'docs', 'color-merge-map.csv'), csv);

// ---------- 문서 ----------
const T = result.totals;
const md = `# GDS 색 통폐합 매핑 (v0.1)

> **기준.** 중복 색은 **✅ Color system 정본에 명시된 값·이름**으로 통폐합합니다 — 강민관 결정 ${VIEW.DEC.decidedAt}.
> **단계 규칙.** ${VIEW.DEC.rules.step.value}. **메인 색상** = \`${VIEW.DEC.main.token}\` (\`${VIEW.DEC.main.hex}\`).
> **생성.** \`npm run audit\` · 전수 표 \`docs/color-merge-map.csv\`
> **실행 주체.** Figma 원본 수정은 디자인팀 몫입니다 — Claude 는 View 권한뿐입니다.

## 1. 전수 판정

| 판정 | 스타일 수 | 뜻 |
|---|---|---|
| \`ABSORB\` | ${T.absorb} | 정본과 값이 **정확히 같음** → 정본 토큰으로 치환 후 삭제 |
| \`RESOLVE\` | ${T.resolve} | 같은 이름이 두 값을 가짐 → **정본에 있는 쪽 채택** |
| \`NEAR\` | ${T.near} | 정본에 없으나 **ΔE ≤ ${NEAR_LIMIT}** — 육안 구분 한계 이하, 흡수 권고 |
| \`RETIRE\` | ${T.retire} | **시스템에서 제거 확정** — 지정된 정본 토큰으로 치환 후 삭제 |
| \`REVIEW\` | ${T.review} | 정본에 없고 색차도 큼 — **개별 판단 필요** |
| **합계** | **${T.legacyStyles}** | 정본 ${T.canonStyles}색 기준 |

기계 판정만으로 정리되는 것이 **${T.mergeable}개**(${((T.mergeable / T.legacyStyles) * 100).toFixed(1)}%), 사람 판단이 필요한 것이 **${T.review}개**입니다.

## 2. 이름-값 충돌 ${T.conflictNames}종 — 정본 기준 판정

| 스타일 이름 | 채택 | 폐기 | 근거 |
|---|---|---|---|
${conflictResolution.map(c => `| \`${c.name}\` | ${c.adopt ? `\`${c.adopt.hex}\` → \`${c.adopt.token}\`` : '—'} | ${c.drop.length ? c.drop.map(h => `\`${h}\``).join(', ') : '—'} | ${c.verdict} |`).join('\n')}

${T.conflictAutoResolved}/${T.conflictNames} 종이 정본 기준으로 자동 판정됩니다. 나머지는 정본에 근거가 없어 **개별 판단**이 필요합니다.

## 3. 정본에 없는 고유 HEX ${T.orphanHex}종

### 3-0. ✅ 제거 확정 — ${T.orphanRetired}종

${retired.map(o => { const d = VIEW.orphanDispositions.find(x => x.hex.toUpperCase() === o.hex); return `**\`${o.hex}\` → \`${d.target}\` (\`${d.targetHex}\`)** · ΔE ${d.deltaE} · 레거시 ${d.legacyStyles}개 스타일(이름 ${d.legacyNames.length}종)

${d.reason}

> ⚠️ ${d.caution}

해당 스타일: ${d.legacyNames.map(n => `\`${n}\``).join(' · ')}`; }).join('\n\n') || '없음'}

### 3-1. 흡수 권고 — ΔE ≤ ${NEAR_LIMIT} · ${T.orphanNear}종

육안으로 구분되지 않는 수준입니다. 정본 색으로 바로 흡수해도 화면이 달라 보이지 않습니다. \`[해석]\`

| 레거시 HEX | 대표 스타일 | → 정본 | ΔE |
|---|---|---|---|
${nearOrphans.map(o => `| \`${o.hex}\` | \`${o.sample}\` | \`${o.target}\` (\`${o.targetHex}\`) | ${o.delta} |`).join('\n') || '| — | — | — | — |'}

### 3-2. 개별 판단 — ${T.orphanReview}종

가까운 정본 색을 함께 적었지만, 색차가 커서 **그대로 치환하면 화면이 달라 보입니다.** 정본에 추가할지 폐기할지 결정이 필요합니다.

| 레거시 HEX | 대표 스타일 | 가장 가까운 정본 | ΔE |
|---|---|---|---|
${reviewOrphans.slice(0, 25).map(o => `| \`${o.hex}\` | \`${o.sample}\` | \`${o.target}\` (\`${o.targetHex}\`) | ${o.delta} |`).join('\n')}

전수는 \`docs/color-merge-map.csv\` (\`REVIEW\` 행) 또는 \`data/color-merge.json\`.

## 4. 확정된 이름 변경

| 현행 | 변경 | 사유 |
|---|---|---|
${VIEW.renames.map(r => `| \`${r.from}\` | \`${r.to}\` | ${r.reason} |`).join('\n')}

토큰 산출물에는 이미 반영돼 있습니다 — \`--gds-color-primary-red-050\` · \`--gds-color-primary-main\`. 구 이름은 CSS 주석과 \`$extensions.gds.renamedFrom\` 에 남겼습니다.

## 5. 아직 열려 있는 것

${VIEW.openDecisions.map(o => `### ${o.id}. ${o.question}\n\n${o.detail}\n${o.options ? '\n' + o.options.map(x => `- ${x}`).join('\n') : ''}`).join('\n\n')}

## 6. 한계 \`[투명성]\`

1. **색차는 CIE76(ΔE\\*ab)** 입니다. CIEDE2000 보다 채도 높은 영역에서 과대평가하는 경향이 있습니다 — 경계선(ΔE 2~4)에 있는 것은 눈으로 확인하세요. \`[해석]\`
2. **스타일별 실사용 횟수를 세지 않았습니다.** 치환 순서·우선순위는 이 표만으로 정할 수 없습니다. \`[미확인]\`
3. **\`.fig\` 스냅샷 ${String(D.meta.exported).slice(0, 10)} 기준**입니다.
4. 흡수 권고(\`NEAR\`)는 **색만 보고 낸 판단**입니다. 색 자체가 정보인 요소(뱃지·지도 핀)는 값이 같아도 의미가 다를 수 있습니다.
`;
fs.writeFileSync(path.join(ROOT, 'docs', 'GDS-color-merge-v0.1.md'), md);

console.log('통폐합 매핑 완료 → data/color-merge.json · docs/color-merge-map.csv · docs/GDS-color-merge-v0.1.md');
console.log(`  ABSORB ${T.absorb} · RESOLVE ${T.resolve} · NEAR ${T.near} · REVIEW ${T.review} (합 ${T.legacyStyles})`);
console.log(`  이름-값 충돌 ${T.conflictNames}종 중 ${T.conflictAutoResolved}종 정본 기준 자동 판정`);
console.log(`  정본에 없는 HEX ${T.orphanHex}종 — 흡수 권고 ${T.orphanNear} · 개별 판단 ${T.orphanReview}`);

module.exports = result;
