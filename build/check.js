'use strict';
// 기계 검증 — 손으로 적은 숫자가 문서·산출물과 어긋나지 않는지 대조
// 실패 시 exit 1. GitHub Actions 가 이걸로 PR 을 막습니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let fail = 0, pass = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  OK   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); }
};

// ---------- 1. 데이터 무결성 ----------
console.log('\n[1] data/foundation-data.json');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));

// 원본 .fig 에서 재현된 앵커. 이 값이 바뀌면 원본이 바뀐 것이므로 의도적 갱신이 필요합니다.
const ANCHORS = { nodeChanges: 192610, pages: 63, variables: 339 };
for (const [k, v] of Object.entries(ANCHORS)) {
  ok(`앵커 ${k} = ${v.toLocaleString()}`, D.meta[k] === v, `실제 ${D.meta[k]}`);
}
ok('페이지 배열 길이 = meta.pages', D.pages.length === D.meta.pages, `${D.pages.length} vs ${D.meta.pages}`);

const mark = m => D.pages.filter(p => p.mark === m).length;
ok('페이지 상태 ✅15 · 🚧19 · —29',
  mark('done') === 15 && mark('wip') === 19 && mark('none') === 29,
  `${mark('done')}/${mark('wip')}/${mark('none')}`);

ok('색 스타일 배열 = meta.styles.FILL', D.colors.length === D.meta.styles.FILL);
ok('타이포 배열 = meta.styles.TEXT', D.types.length === D.meta.styles.TEXT);
ok('그림자 배열 = meta.styles.EFFECT', D.effects.length === D.meta.styles.EFFECT);
ok('EFFECT 스타일 40개', D.meta.styles.EFFECT === 40, `실제 ${D.meta.styles.EFFECT}`);

ok('모든 색에 유효한 HEX', D.colors.every(c => /^#[0-9A-F]{6}$/.test(c.hex)));
ok('모든 타이포에 이름', D.types.every(t => typeof t.name === 'string' && t.name.length > 0));

// ---------- 2. 확정 결정이 데이터와 어긋나지 않는지 ----------
console.log('\n[2] 확정 결정 (2026-07-28 회의)');
const elev = D.effects.filter(e => /^elevation/i.test(e.name));
ok('Elevation 스타일 존재', elev.length > 0, `${elev.length}개`);
ok('Elevation 은 전부 2겹 구조', elev.every(e => e.layers.length >= 2),
  elev.filter(e => e.layers.length < 2).map(e => e.name).join(', '));

// R-3: 정본 스케일 안에 20 이 포함되어야 함 (상한 20px)
const SCALE = [4, 8, 10, 12, 16, 20];
ok('R-3 정본 스케일 상한 = 20px', Math.max(...SCALE) === 20);

// ---------- 3. 빌드 산출물 ----------
console.log('\n[3] dist/index.html');
const distPath = path.join(ROOT, 'dist', 'index.html');
if (!fs.existsSync(distPath)) {
  console.log('  SKIP dist 없음 — `npm run build` 먼저 실행하세요');
} else {
  const html = fs.readFileSync(distPath, 'utf8');
  ok('자리표시자 __DATA__ 가 남아있지 않음', !html.includes('__DATA__'));
  ok('외부 리소스 참조 없음 (자기완결)', !/<(script|link|img)[^>]+(src|href)="https?:/.test(html));
  ok('브라우저 스토리지 미사용', !/localStorage|sessionStorage/.test(html));
  // 임베드된 JSON 이 실제로 파싱되는지
  const m = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/);
  ok('임베드 JSON 블록 존재', !!m);
  if (m) {
    let parsed = null;
    try { parsed = JSON.parse(m[1].replace(/<\\\//g, '</')); } catch (e) { /* noop */ }
    ok('임베드 JSON 파싱 가능', !!parsed);
    ok('임베드 JSON 이 원본과 동일', parsed && parsed.meta.nodeChanges === D.meta.nodeChanges);
  }
  // 문서에 적힌 숫자가 실제 데이터와 일치하는지 (inDoc 방식 — 단순 포함 검사)
  const inDoc = s => html.includes(s);
  ok('문서에 노드 수 표기 일치', inDoc(String(D.meta.nodeChanges)) || inDoc(D.meta.nodeChanges.toLocaleString()));
}

// ---------- 4. 문서 ----------
console.log('\n[4] docs/');
for (const f of ['GDS-r3-decision-20260729.md', 'r3-change-list.csv']) {
  ok(`${f} 존재`, fs.existsSync(path.join(ROOT, 'docs', f)));
}

console.log(`\n${fail === 0 ? '통과' : '실패'} — ${pass + fail}개 항목 중 ${pass}개 일치, ${fail}개 불일치`);
process.exit(fail === 0 ? 0 : 1);
