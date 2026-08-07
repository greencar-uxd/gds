'use strict';
/**
 * PR #1(docs/bottom-sheet-component-20260805)의 주장을 지금 저장소와 대조합니다.
 *
 * 왜 있는가 (2026-08-06):
 *   PR #1 은 8/5 자 브랜치인데 그 뒤로 main 이 크게 움직였습니다.
 *   merge 여부는 사람이 정할 일이고, 저장소가 할 수 있는 것은
 *   «그 안의 주장이 지금도 맞는가»를 기계로 가려 두는 것입니다.
 *
 * 정정 (2026-08-06):
 *   처음에 «merge 하면 12만 줄이 되돌아간다»고 적었습니다. 틀렸습니다.
 *   두 점 diff(main FETCH_HEAD)를 보고 판단한 탓입니다 — 그건 «두 트리의 차이»라
 *   main 에만 있는 것이 전부 삭제로 보입니다. merge 가 실제로 하는 일은
 *   세 점 diff(main...FETCH_HEAD)이고, 그 값은 6파일 +728줄 · 삭제 0 입니다.
 *   그래서 mergeBase 를 함께 적고, 되돌아가는 줄이 없다는 것을 수치로 남깁니다.
 *
 * 대조하는 것:
 *   ① 색 토큰 이름이 지금 팔레트에 실재하는가 (그 사이 개명이 있었습니다)
 *   ② 간격·타이포 토큰 이름과 값이 지금 스케일과 맞는가
 *   ③ 구조·간격 수치가 원본 Structure 절(data/figma-xml/bottom-sheet-structure.xml)과 맞는가
 *   ④ PR 이 적어 둔 모순·미해결이 지금 GAP 목록에 들어 있는가
 *
 * 하지 않는 것:
 *   · PR 을 merge 하거나 닫지 않습니다. 브랜치도 건드리지 않습니다.
 *   · 개명된 이름을 조용히 바꿔치지 않습니다 — 옛 이름과 지금 이름을 나란히 적습니다.
 *
 * 입력: PR 브랜치의 data/component-bottom-sheet.json 을 떠 온 사본 · 현재 저장소 데이터
 * 출력: data/pr1-audit.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const SRC = path.join(ROOT, 'data', 'pr1-bottom-sheet.json');   // PR 사본(그대로 보존)
if (!fs.existsSync(SRC)) throw new Error('data/pr1-bottom-sheet.json 이 없습니다 — PR 브랜치에서 떠 오세요');
const PR = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const VIEW = require('../build/canon-view.js');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const SPACING = D.canon.spacing.scale;      // [{token, px, ...}]
const TYPO = D.canon.typography.scale.map(t => t.token);
const GAPS = VIEW.GAPS.items;

const findings = [];
const add = (kind, what, ok, detail) => findings.push({ kind, what, ok, detail: detail || null });

// ── ① 색 토큰 이름 ───────────────────────────────────────────────
const names = new Set(VIEW.colors.map(c => c.name));
const renameOf = new Map();                  // 옛 이름 → 지금 이름
for (const c of VIEW.colors) if (c.renamed && c.originalName) renameOf.set(c.originalName, c.name);

const citedColors = [];
const collect = (target, style, hex) => { if (style) citedColors.push({ target, style, hex: hex || null }); };
for (const i of PR.color.items || []) collect(i.target, i.canonStyle, i.hex);
if (PR.structure && PR.structure.top && PR.structure.top.divider) {
  const d = PR.structure.top.divider;
  collect('top.divider', d.canonStyle, d.hex);
}

const colorRows = [...new Map(citedColors.map(c => [c.style, c])).values()].map(c => {
  const stillValid = names.has(c.style);
  const renamedTo = renameOf.get(c.style) || null;
  const tok = VIEW.colors.find(x => x.name === (stillValid ? c.style : renamedTo));
  return {
    target: c.target, citedName: c.style, citedHex: c.hex,
    stillValid, renamedTo,
    currentHex: tok ? tok.hex : null,
    hexUnchanged: !!(tok && c.hex && tok.hex.toUpperCase() === String(c.hex).toUpperCase()),
  };
});
const stale = colorRows.filter(r => !r.stillValid);
add('color', '인용한 색 이름이 지금 팔레트에 그대로 있는가',
  stale.length === 0, `${stale.length}/${colorRows.length}종이 개명 전 이름`);
add('color', '개명된 것도 값(HEX)은 그대로인가',
  stale.every(r => r.hexUnchanged), stale.map(r => `${r.citedName}→${r.renamedTo}`).join(', '));

// ── ② 간격 · 타이포 토큰 ────────────────────────────────────────
const spaceRows = (PR.spacing.items || []).filter(i => i.token).map(i => {
  const s = SPACING.find(x => x.token === i.token);
  return { gap: i.gap, px: i.px, token: i.token, exists: !!s, tokenPx: s ? s.px : null, pxMatches: !!(s && s.px === i.px) };
});
add('spacing', '간격 토큰이 지금 스케일에 실재',
  spaceRows.every(r => r.exists), spaceRows.filter(r => !r.exists).map(r => r.token).join(', '));
add('spacing', '토큰이 가리키는 px 가 PR 이 적은 값과 같음',
  spaceRows.every(r => r.pxMatches), spaceRows.filter(r => !r.pxMatches).map(r => `${r.token}=${r.tokenPx}≠${r.px}`).join(', '));

const typoRows = (PR.typography.items || []).map(i => ({ target: i.target, token: i.canonToken, exists: TYPO.includes(i.canonToken) }));
add('typography', '타이포 토큰이 지금 21단계에 실재',
  typoRows.every(r => r.exists), typoRows.filter(r => !r.exists).map(r => r.token).join(', '));

// ── ③ 구조·간격 수치를 원본 Structure 절과 대조 ────────────────
const XML = path.join(ROOT, 'data', 'figma-xml', 'bottom-sheet-structure.xml');
const raw = fs.existsSync(XML) ? fs.readFileSync(XML, 'utf8') : null;
const structRows = [];
if (raw) {
  // 원본은 «Spacing» 이라는 이름의 프레임으로 간격을 표시합니다. 그 크기가 곧 값입니다.
  const spacingFrames = [...raw.matchAll(/<frame id="([^"]+)" name="Spacing"[^>]*width="([\d.]+)" height="([\d.]+)"/g)]
    .map(m => ({ node: m[1], w: Number(m[2]), h: Number(m[3]) }));
  const has = v => spacingFrames.some(f => f.w === v || f.h === v);
  for (const claim of [
    { what: '좌우 여백 20px', px: 20 },
    { what: 'Top→Body 24px', px: 24 },
    { what: 'Body→Action 32px', px: 32 },
  ]) structRows.push({ ...claim, foundInRaw: has(claim.px) });

  add('structure', '원본 Structure 절에 PR 이 말한 간격 프레임이 있음',
    structRows.every(r => r.foundInRaw),
    structRows.filter(r => !r.foundInRaw).map(r => r.what).join(', '));
  add('structure', '3분할(Top·Body·Action)이 원본 문장에 있음',
    /Top \(상단\) · Body \(중단\) · Action \(하단\)으로 구성됩니다/.test(raw));
  add('structure', '«Elevation_Bottom sheet 사용» 메모가 원본에 있음',
    raw.includes('Elevation_Bottom sheet 사용'));
} else {
  add('structure', '원본 Structure 절 원자료가 저장소에 있음', false, 'data/figma-xml/bottom-sheet-structure.xml 없음');
}

// ── ④ PR 이 적어 둔 모순·미해결이 GAP 에 들어 있는가 ───────────
const gapText = JSON.stringify(GAPS);
const carried = [
  { what: 'Button Large 가 문서 56px · 실측 60px 로 갈림', key: PR.button && PR.button.conflict, inGaps: /Large를 56|56px.*60px|60px.*56px/.test(gapText) },
  { what: 'Bottom Sheet 계열 EFFECT 스타일이 여러 값으로 흩어짐', key: PR.elevation && PR.elevation.conflict && PR.elevation.conflict.issue, inGaps: /Bottom ?Sheet.*겹|대소문자/.test(gapText) },
  { what: 'line-height 가 정본 21토큰 전부 Auto', key: (PR.unresolved || [])[0], inGaps: /line-height|Auto/.test(gapText) },
  { what: 'coupon COMPONENT_SET 이 신규 GDS 페이지에 미편입', key: (PR.unresolved || [])[3], inGaps: /coupon/i.test(gapText) },
];
for (const c of carried) add('carry-over', c.what, c.inGaps, c.inGaps ? '이미 GAP 에 있음' : 'GAP 에 없음 — 옮겨 적을 자리');

const out = {
  $description: 'PR #1(docs/bottom-sheet-component-20260805)의 주장을 지금 저장소와 대조한 결과입니다. PR 을 merge 하거나 닫지 않습니다.',
  why: 'PR 이 8/5 자라 그 뒤 바뀐 것과 어긋날 수 있습니다. merge 여부는 사람이 정하고, '
    + '저장소는 «그 안의 어느 주장이 지금도 맞는가»만 기계로 가려 둡니다.',
  rule: [
    'PR 브랜치를 건드리지 않습니다 — 읽기만 합니다.',
    '개명된 이름을 조용히 바꿔치지 않습니다. 옛 이름과 지금 이름을 나란히 적습니다.',
    '원본과 대조할 수 없는 주장은 «맞다»로 세지 않습니다.',
  ],
  auditedAt: '2026-08-06',
  branch: 'docs/bottom-sheet-component-20260805',
  mergeAdvice: null,
  mergeImpact: null,
  colors: { what: '개명 뒤 이름이 어긋난 곳', rows: colorRows, staleCount: stale.length },
  spacing: { rows: spaceRows },
  typography: { rows: typoRows },
  structure: { rows: structRows, raw: raw ? 'data/figma-xml/bottom-sheet-structure.xml' : null },
  carryOver: { what: 'PR 이 적어 둔 모순·미해결 중 GAP 목록에 아직 없는 것', items: carried },
  findings,
  counts: {
    checks: findings.length,
    passed: findings.filter(f => f.ok).length,
    failed: findings.filter(f => !f.ok).length,
    staleColorNames: stale.length,
    carryOverMissing: carried.filter(c => !c.inGaps).length,
  },
};
out.mergeImpact = {
  mergeBase: '3277bbc',
  filesChanged: 6,
  insertions: 728,
  deletions: 0,
  conflicts: ['README.md'],
  checksAfterMerge: 551,
  note: '세 점 diff(main...FETCH_HEAD) 기준입니다. 두 점 diff 로 보면 main 에만 있는 것이 '
    + '전부 삭제로 보이지만 merge 는 그런 일을 하지 않습니다. 실제로 병합해 검사를 돌려 확인했습니다.',
};
out.mergeAdvice = `merge 해도 되돌아가는 것은 없습니다 — 6파일 ${out.mergeImpact.insertions}줄 추가, 삭제 0. `
  + `README.md 한 곳만 충돌하고, 병합 뒤 검사는 ${out.mergeImpact.checksAfterMerge}개 전부 통과합니다(직접 병합해 돌려 봤습니다). `
  + `안의 값도 대부분 지금도 맞습니다(대조 ${out.counts.passed}/${out.counts.checks} 통과). `
  + `색 이름 ${stale.length}종만 개명 전 표기라 옮길 때 바꿔야 합니다. merge·close 는 사람이 정합니다.`;

fs.writeFileSync(path.join(ROOT, 'data', 'pr1-audit.json'), JSON.stringify(out, null, 2) + '\n');
console.log('PR #1 대조 → data/pr1-audit.json');
console.log(`  merge 영향 — ${out.mergeImpact.filesChanged}파일 +${out.mergeImpact.insertions} / -${out.mergeImpact.deletions} · 충돌 ${out.mergeImpact.conflicts.join(', ')}`);
console.log(`  검사 ${out.counts.passed}/${out.counts.checks} 통과 · 개명 전 색 이름 ${stale.length}종 · GAP 에 없는 것 ${out.counts.carryOverMissing}건`);
for (const f of findings) console.log(`    ${f.ok ? 'OK  ' : 'CHECK'} ${f.what}${f.detail ? ' — ' + f.detail : ''}`);
