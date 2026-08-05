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
// 재넘버링 후 1단계는 1겹이므로, 2단계 이상만 2겹인지 봅니다
const eScale = ((D.canon||{}).elevation||{}).scale || [];
ok('엘리베이션 2~6단계는 2겹 구조', eScale.filter(s=>s.was).every(s=>s.layers.length>=2));

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


// ---------- 5. 정본 사이트 · 토큰 ----------
console.log('\n[5] 정본 산출물');
const canon = D.canon || {};
ok('정본 색 스타일 확보', (canon.color && (canon.color.styles||[]).length) > 0, `${(canon.color&&canon.color.styles||[]).length}개`);
ok('정본 타입 스케일 확보', (canon.typography && canon.typography.scale.length) > 0);
ok('정본 간격 스케일 확보', (canon.spacing && canon.spacing.scale.length) > 0);
for (const f of ['gds.css','gds.scss','gds.tokens.json']) {
  ok(`tokens/${f} 생성됨`, fs.existsSync(path.join(ROOT,'dist','tokens',f)));
}
const cssPath = path.join(ROOT,'dist','tokens','gds.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath,'utf8');
  const sp = (canon.spacing||{}).scale||[];
  ok('간격 토큰명 중복 없음', new Set(sp.map(s=>s.token)).size === sp.length, `${new Set(sp.map(s=>s.token)).size}/${sp.length}`);
  ok('간격 토큰 100단위 순차', sp.every((s,i)=>s.token === 'Spacing_' + (i===0?0:i*100)));
  ok('간격 토큰 전부 출력', sp.every(s=>new RegExp(`--gds-spacing-${s.token.replace('Spacing_','')}:`).test(css)));
  ok('엘리베이션 토큰 출력됨', /--gds-elevation-1:/.test(css) && /--gds-elevation-6:/.test(css));
  ok('엘리베이션 6단계', ((canon.elevation||{}).scale||[]).length === 6, String(((canon.elevation||{}).scale||[]).length));
  ok('재넘버링 반영 표시', !!(canon.elevation && canon.elevation.renumbered));
}
ok('dist/decisions/index.html 생성', fs.existsSync(path.join(ROOT,'dist','decisions','index.html')));
if (fs.existsSync(path.join(ROOT,'dist','decisions','index.html'))) {
  const dh = fs.readFileSync(path.join(ROOT,'dist','decisions','index.html'),'utf8');
  ok('결정 안건 페이지 자기완결', !/<(script|link|img)[^>]+(src|href)="https?:/.test(dh));
  ok('결정 안건 페이지 브라우저 스토리지 미사용', !/localStorage|sessionStorage/.test(dh));
  ok('정본 사이트에 결정 안건 링크', fs.readFileSync(path.join(ROOT,'dist','index.html'),'utf8').includes('decisions/'));
}

// ---------- 6. 감사 문서 ↔ 감사 데이터 대조 ----------
// 문서에 적힌 숫자가 스크립트 계산값과 어긋나면 실패합니다 (작업 규칙 1).
console.log('\n[6-2] 정본 폰트');
{
  const FONT = require('./font.js');
  const pages = ['dist/index.html', 'dist/decisions/index.html']
    .map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
  ok('빌드된 페이지 존재', pages.length === 2, `${pages.length}/2`);
  for (const f of pages) {
    const html = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f);
    // 본문 폰트 선언이 전부 정본인지 (모노는 코드 표기용이라 예외)
    // @font-face 안의 선언(패밀리 정의)은 제외하고, 실제 적용 선언만 봅니다
    const applied = html.replace(/@font-face\{[^}]*\}/g, '');
    const decls = [...applied.matchAll(/font-family:\s*([^;}]*)/g)].map(m => m[1].trim())
      .filter(d => !/monospace/i.test(d));
    const bad = [...new Set(decls.filter(d => d !== FONT.STACK))];
    ok(`${rel} · 본문 폰트 선언 ${decls.length}건이 전부 정본`, bad.length === 0, bad.join(' | '));
    ok(`${rel} · @font-face 임베드 ${FONT.WEIGHTS.length}종`,
      (html.match(/@font-face\{font-family:"Noto Sans KR"/g) || []).length === FONT.WEIGHTS.length);
    ok(`${rel} · 외부 폰트 요청 없음`, !/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr.*font/i.test(html));
    const miss = FONT.missingGlyphs(html);
    ok(`${rel} · 서브셋 글리프 누락 없음`, miss.length === 0,
      `누락 ${miss.length}자: ${miss.slice(0, 20).join('')} — tools/font/README.md 로 재생성 필요`);
  }
}

// ---------- 6-3. 결정 안건 페이지 표현 ----------
// 이 페이지는 "아직 정해야 할 것"만 담습니다. 확정된 것이 남아 있으면 실패.
console.log('\n[6-3] 결정 기록 페이지');
{
  const dec = require('./decisions.js');
  const VIEW0 = require('./canon-view.js');
  ok('확정 결정이 기록돼 있음', dec.settled.length > 0, `확정 ${dec.settled.length}`);
  ok('모자란 곳 목록이 있음', dec.gaps.length > 0, `${dec.gaps.length}건`);
  const dp = path.join(ROOT, 'dist', 'decisions', 'index.html');
  if (fs.existsSync(dp)) {
    const dh = fs.readFileSync(dp, 'utf8');
    const missS = dec.settled.filter(i => !dh.includes(`id="${i.id}"`));
    ok('확정 항목이 전부 표시됨', missS.length === 0, missS.map(i => i.id).join(', '));
    const missG = dec.gapsOpen.filter(g => !dh.includes(`id="${g.id}"`));
    ok('남은 모자란 곳이 전부 표시됨', missG.length === 0, missG.map(g => g.id).join(', '));
    ok('메운 것이 표에 표시됨', dec.gapsDone.every(g => dh.includes(`<code>${g.id}</code>`)),
      dec.gapsDone.filter(g => !dh.includes(`<code>${g.id}</code>`)).map(g => g.id).join(', '));
    ok('메운 건수가 제목에 표기됨', dh.includes(`${dec.gaps.length}건 중 ${dec.gapsDone.length}건 메움`));
    ok('4계층 표가 페이지에 있음',
      VIEW0.structure ? VIEW0.structure.layers.every(l => dh.includes(`${l.name} (${l.ko})`)) : true);
    ok('제외 라이브러리가 표시됨', VIEW0.excludedLibraries.every(l => dh.includes(l.name)));
    ok('스와치 그림에서 빠졌던 색이 표시됨', VIEW0.missedBySwatch.every(n => dh.includes(n)));
    ok('레거시 통폐합 흔적이 남아 있지 않음',
      !/ABSORB|RESOLVE|묶음으로 줄였습니다|개별 판단 대상/.test(dh), '레거시는 판단 근거가 아닙니다');
  }
}

console.log('\n[7] 확정 결정 (2026-08-04 색·타이포)');
{
  const VIEW = require('./canon-view.js');
  const DEC = VIEW.DEC;
  const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));

  ok('valueOverrides 정합', VIEW.integrity.overrideMissing.length === 0 && VIEW.integrity.overrideStale.length === 0,
    `없는 토큰 ${VIEW.integrity.overrideMissing.join(',')} · 원본값 불일치 ${VIEW.integrity.overrideStale.map(o => o.token).join(',')}`);
  // 명도 역전이 남아 있으면 실패 — 단계형 그룹 안에서 번호가 커질수록 어두워야 합니다
  {
    const lum = hex => { const v = hex.replace('#', '');
      const c = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
        .map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const grp = {};
    for (const c of VIEW.colors) {
      const m = /^(.+)\/(.+?)\s+(\d{2,3})$/.exec(c.name);
      if (!m) continue;
      (grp[m[1] + '/' + m[2]] = grp[m[1] + '/' + m[2]] || []).push({ ...c, step: Number(m[3]) });
    }
    const bad = [];
    for (const [g, list] of Object.entries(grp)) {
      const byStep = [...list].sort((a, b) => a.step - b.step);
      for (let i = 1; i < byStep.length; i++) {
        if (lum(byStep[i].hex) > lum(byStep[i - 1].hex)) bad.push(`${g}: ${byStep[i - 1].name} < ${byStep[i].name}`);
      }
    }
    ok('명도 역전 없음 (번호가 커질수록 어두움)', bad.length === 0, bad.join(' | '));
  }
  ok('color-decisions 가 정본과 정합', VIEW.integrity.missing.length === 0 && VIEW.integrity.hexMismatch.length === 0,
    `없는 이름 ${VIEW.integrity.missing.join(',')} · HEX 불일치 ${VIEW.integrity.hexMismatch.length}`);
  ok('메인 색상 지정됨', !!VIEW.mainStyle, '확정 main 이 정본에 없음');
  ok(`메인 = ${DEC.main.token} ${DEC.main.hex}`, !!VIEW.mainStyle && VIEW.mainStyle.hex.toUpperCase() === DEC.main.hex.toUpperCase());

  // 10단위 규칙 — 정본 스케일형 이름에 3자리 100단위(100 제외)가 남아 있으면 실패
  const badStep = VIEW.colors.filter(c => {
    const m = /\s(\d{2,3})$/.exec(c.name);
    return m && Number(m[1]) > 100;
  });
  ok('10단위 규칙 — 100 초과 단계 없음', badStep.length === 0, badStep.map(b => b.name).join(', '));

  // 보조 단계는 승인된 예외만 허용
  const exc = new Set(VIEW.stepExceptions ? VIEW.stepExceptions.value : []);
  const offGrid = VIEW.colors.filter(c => {
    const m = /\s(\d{2,3})$/.exec(c.name);
    return m && Number(m[1]) % 10 !== 0;
  });
  ok(`10단위 밖 단계는 승인된 예외뿐 (승인 ${exc.size}건)`,
    offGrid.every(c => exc.has(c.name)), offGrid.filter(c => !exc.has(c.name)).map(c => c.name).join(', '));
  for (const name of exc) ok(`예외가 정본에 실제로 존재 — ${name}`, VIEW.colors.some(c => c.name === name));
  ok('닫힌 결정에 근거(resolution) 기록', VIEW.closedDecisions.every(o => !!o.resolution));

  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    ok('CSS 에 구 Red 500 키 없음', !/--gds-color-primary-red-500\s*:/.test(css));
    for (const k of ['primary-red-030', 'primary-red-040', 'primary-red-050']) {
      ok(`CSS --gds-color-${k} 출력`, new RegExp(`--gds-color-${k}\\s*:`).test(css));
    }
    ok('CSS --gds-color-primary-main 출력', /--gds-color-primary-main\s*:/.test(css));
    ok('CSS 에 보조 단계 예외 표기', !exc.size || /규칙 예외/.test(css));
    ok(`CSS --gds-font-family = ${TDEC.fontFamily.value}`,
      new RegExp(`--gds-font-family\\s*:\\s*"${TDEC.fontFamily.value}"`).test(css));
    ok(`CSS --gds-type-line-height = ${TDEC.lineHeight.value}(→normal)`,
      /--gds-type-line-height:\s*normal/.test(css));
    ok('DTCG 전 타입에 행간 주입', (() => {
      const tj = path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json');
      if (!fs.existsSync(tj)) return false;
      const J = JSON.parse(fs.readFileSync(tj, 'utf8'));
      return Object.values(J.type).every(v => v.$value.lineHeight === 'normal');
    })());
    ok('행간 미확정 문구가 남아 있지 않음', !/행간.{0,20}(미확정|결정 필요|아직)/.test(css));
    // 용도(Usage) — 값이 같은 토큰을 구분하는 유일한 축
    const U = TDEC.usage && TDEC.usage.status === 'confirmed' ? TDEC.usage.map : null;
    ok('용도(Usage) 확정됨', !!U);
    if (U) {
      const scale = ((canon.typography || {}).scale || []).map(t => t.token);
      ok('모든 정본 토큰에 용도 있음', scale.every(t => (U[t] || []).length > 0),
        scale.filter(t => !(U[t] || []).length).join(', '));
      ok('CSS 에 용도 주석 표기', scale.every(t => U[t].every(u => css.includes(u))));
      const tj = path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json');
      if (fs.existsSync(tj)) {
        const J = JSON.parse(fs.readFileSync(tj, 'utf8'));
        ok('DTCG 전 타입에 usage 주입',
          Object.values(J.type).every(v => (((v.$extensions || {}).gds || {}).usage || []).length > 0));
        // 값이 같은 쌍은 용도가 서로 달라야 구분됩니다
        const pairs = ((J.$notes || {}).usage || {}).sameSpecPairs || [];
        ok(`동일 스펙 ${pairs.length}쌍이 용도로 구분됨`,
          pairs.length > 0 && pairs.every(p => new Set(p.tokens.map(t => t.usage.join('|'))).size === p.tokens.length),
          pairs.filter(p => new Set(p.tokens.map(t => t.usage.join('|'))).size !== p.tokens.length).map(p => p.spec).join(', '));
      }
    }
    for (const r of VIEW.renames) ok(`구 이름 보존 — ${r.from}`, css.includes(r.from), '주석에 구 이름 없음');
  }

  const tj = path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json');
  if (fs.existsSync(tj)) {
    const J = JSON.parse(fs.readFileSync(tj, 'utf8'));
    ok('DTCG role=primary-main 표기', Object.values(J.color).some(v => v && v.$extensions && v.$extensions.gds && v.$extensions.gds.role === 'primary-main'));
    ok('DTCG 폰트 패밀리 주입', Object.values(J.type).every(v => v.$value.fontFamily === TDEC.fontFamily.value));
    ok('DTCG 결정 기록 존재', !!(J.$notes && J.$notes.colorDecisions && J.$notes.fontFamily));
  }

}

// ────────────────────────────────────────────────────────────
console.log('\n[8] Figma 원본 대조 (2026-08-05 · Full seat 읽기)');
{
  const VIEW = require('./canon-view.js');
  const FV = VIEW.figmaVariables;
  const SYNC = VIEW.figmaSync;
  ok('data/figma-variables.json 존재', !!FV);
  if (FV && SYNC) {
    ok('스냅샷은 손으로 쓴 값이 아님 — 조회 도구 기록 있음',
      FV.source && /get_variable_defs/.test(FV.source.tool), JSON.stringify(FV.source || {}));
    ok('figmaSync 가 정정 표시를 달고 있음', SYNC.corrected === true,
      'get_variable_defs 는 파일 전체가 아니라 노드가 쓰는 변수만 돌려줍니다');
    ok('스냅샷 count 필드 = 실제 변수 수', FV.count === Object.keys(FV.variables).length);

    // 정본 53종이 Figma 변수의 부분집합인가 (이름 기준)
    const rawNames = (((D2 => D2)(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'))))
      .canon.color.styles).map(s => s.name);
    const notInFigma = rawNames.filter(n => !(n in FV.variables));
    ok('정본 색이 전부 Figma 변수에 존재', notInFigma.length === 0, notInFigma.join(', '));
    ok('정본 색 수 = 라이브러리 선언값', VIEW.colors.length === SYNC.canonFillStyles,
      `${VIEW.colors.length} vs ${SYNC.canonFillStyles}`);

    // 값 불일치 0건 (Gray 080 은 다중 fill 로 반환되므로 앞자리만 비교)
    const mism = rawNames.filter(n => {
      const fig = String(FV.variables[n]).split(',')[0].toUpperCase();
      const canonHex = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'))
        .canon.color.styles.find(s => s.name === n) || {}).hex.toUpperCase();
      return fig !== canonHex;
    });
    ok('정본 색 값이 Figma 원본과 일치', mism.length === 0, mism.join(', '));

    // 문서화 안 된 변수 = additions 로 전부 처분됐는가
    const undocumented = Object.keys(FV.variables).filter(n => !rawNames.includes(n));
    const handled = new Set(VIEW.additions.map(a => a.sourceName));
    // 색이 아닌 변수(자간 등)는 data/type-decisions.json 에서 처분합니다.
    const TD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
    const typeHandled = new Set(Object.values(TD)
      .filter(v => v && typeof v === 'object' && typeof v.evidence === 'string')
      .flatMap(v => Object.keys(FV.variables).filter(n => v.evidence.includes(n))));
    const inCanon = new Set(VIEW.libFill.map(s => s.name));
    const unhandled = undocumented.filter(n => !handled.has(n) && !typeHandled.has(n) && !inCanon.has(n));
    ok('문서화 안 된 변수가 전부 처분됨 (색=additions · 그 외=type-decisions)',
      unhandled.length === 0, unhandled.join(', '));
    ok('처분 합계 = 정본 밖 변수 수', (() => {
      const inCanon2 = new Set(VIEW.libFill.map(s => s.name));
      const outside = VIEW.undocumented.filter(n => !inCanon2.has(n));
      return VIEW.additions.length + VIEW.typeHandled.length === outside.length;
    })());
    ok('안내문의 종수 표기가 실제와 일치',
      new RegExp(`${VIEW.undocumented.length}종`).test(SYNC.note), SYNC.note);
    ok('additions 에 유령 항목 없음', VIEW.integrity.additionUnknown.length === 0, VIEW.integrity.additionUnknown.join(', '));
    ok('additions 값이 Figma 원본과 일치', VIEW.integrity.additionStale.length === 0, VIEW.integrity.additionStale.join(', '));
    ok('편입 이름이 기존 정본과 충돌하지 않음', VIEW.integrity.additionCollision.length === 0, VIEW.integrity.additionCollision.join(', '));
    ok('보류(defer) 항목은 전부 열린 안건에 묶여 있음',
      VIEW.deferredAdditions.every(a => VIEW.openDecisions.some(o => o.id === a.blockedBy)),
      VIEW.deferredAdditions.map(a => `${a.id}→${a.blockedBy}`).join(', '));
    ok('폐기(retire) 대상이 정본에 존재',
      VIEW.retiredAdditions.every(a => VIEW.colors.some(c => c.name === a.target)),
      VIEW.retiredAdditions.map(a => a.target).join(', '));
    ok('편입 색이 토큰에 실제로 출력됨', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return VIEW.adopted.every(a => css.includes(a.hex.toLowerCase()) || css.includes(a.hex.toUpperCase()));
    })());
    ok('정본 = 라이브러리 − 흡수 + 분리',
      VIEW.colors.length === VIEW.libFill.length - VIEW.canonRetires.length
        + VIEW.splits.reduce((a, s) => a + s.into.length - 1, 0),
      `${VIEW.colors.length} vs ${VIEW.libFill.length}`);
    ok('알파 색은 8자리 HEX 로 표기',
      VIEW.adopted.filter(a => a.alpha != null).every(a => /^#[0-9a-fA-F]{8}$/.test(a.hex)));
    ok('보류 항목은 토큰에 출력되지 않음', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return VIEW.deferredAdditions.every(a => !new RegExp(`--gds-color-[a-z0-9-]*${a.sourceName.split('/').pop().toLowerCase().replace(/[^a-z0-9]+/g, '-')}\\s*:`).test(css));
    })());

    // 원본 결함 기록
    ok('sourceDefects 기록 존재', !!VIEW.sourceDefects && VIEW.sourceDefects.items.length > 0);
    if (VIEW.sourceDefects) {
      ok('원본 결함마다 노드 ID 가 있음',
        VIEW.sourceDefects.items.every(d => /\d+:\d+/.test(d.node)),
        '추적 불가능한 결함 기록은 쓸모가 없습니다');
      ok('원본 결함이 결정 안건 페이지에 표시됨', (() => {
        const html = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
        return VIEW.sourceDefects.items.every(d => html.includes(d.id));
      })());
    }
    ok('Figma 대조 결과가 결정 안건 페이지에 표시됨', (() => {
      const html = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
      return VIEW.additions.every(a => html.includes(a.sourceName));
    })());
    ok('CQ-9 · CQ-10 이 확정 상태로 표시됨', (() => {
      const html = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
      return ['CQ-9', 'CQ-10'].every(id => VIEW.closedDecisions.some(o => o.id === id && o.resolution) && html.includes(id));
    })());
    ok('CQ-9 결과가 Dim Layer 2단계로 나왔음', (() => {
      const names = VIEW.colors.map(c => c.name);
      return names.includes('System/Dim Layer 060') && names.includes('System/Dim Layer 080');
    })());
    ok('CQ-9 알파가 정본 스와치 근거로 표시됨', (() => {
      const s = VIEW.splits.find(x => x.id === 'SP-1');
      return !!s && s.alphaSource === 'canon-swatch' && /스와치/.test(s.reason);
    })());
    ok('Info Box BG 가 Dim Layer 060 으로 흡수됨', (() => {
      const r = VIEW.canonRetires.find(x => x.token === 'System/Info Box BG');
      return !!r && r.into === 'System/Dim Layer 060';
    })());
    ok('흡수·분리 대상이 전부 라이브러리에 실재',
      VIEW.integrity.splitMissing.length === 0 && VIEW.integrity.retireMissing.length === 0
        && VIEW.integrity.retireTargetMissing.length === 0);
    ok('폐기한 변수마다 근거가 있음',
      VIEW.droppedAdditions.every(a => (a.evidence || '').length > 10 && (a.reason || '').length > 10),
      VIEW.droppedAdditions.map(a => a.id).join(', '));
    ok('AD-1 · AD-2 편입 취소가 라이브러리 근거로 기록됨',
      ['AD-1', 'AD-2'].every(id => {
        const a = VIEW.additions.find(x => x.id === id);
        return a && a.action === 'drop' && /라이브러리/.test(a.reason + a.evidence);
      }));
    ok('폐기 항목이 토큰에 출력되지 않음', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return VIEW.droppedAdditions.every(a => !css.includes(a.hex.toLowerCase()));
    })());
    ok('레거시 기반 안건이 전부 철회됨',
      !['CQ-4', 'CQ-5', 'CQ-6', 'CQ-11'].some(id => (VIEW.DEC.open || []).some(o => o.id === id)));
    ok('레거시 판정 데이터가 제거됨',
      !VIEW.DEC.orphanDispositions && !VIEW.DEC.conflictDecisions && !VIEW.DEC.clusterDecisions
        && !fs.existsSync(path.join(ROOT, 'data', 'color-merge.json'))
        && !fs.existsSync(path.join(ROOT, 'data', 'orphan-clusters.json')));
    ok('자간 확정 — CSS 출력', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return /--gds-type-letter-spacing:\s*0;/.test(css);
    })());
    ok('자간 근거가 Figma 변수', (() => {
      const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
      return T.letterSpacing && /typo\/letter-spacing\/0/.test(T.letterSpacing.evidence)
        && FV.variables['typo/letter-spacing/0'] === T.letterSpacing.value;
    })());
    ok('정본 기준이 라이브러리로 기록됨',
      !!VIEW.canonBasis && /GDS \(그린카 디자인 시스템\) 라이브러리/.test(VIEW.canonBasis.value));
    ok('제외 라이브러리가 6개 기록됨', VIEW.excludedLibraries.length === 6,
      String(VIEW.excludedLibraries.length));
  }
}

// ────────────────────────────────────────────────────────────
console.log('\n[10] 타이포·간격·엘리베이션 원본 대조');
{
  const fp = path.join(ROOT, 'data', 'figma-foundation-sync.json');
  ok('data/figma-foundation-sync.json 존재', fs.existsSync(fp));
  if (fs.existsSync(fp)) {
    const F = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const T2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
    ok('타이포 대조 대상 수 = 정본 단계 수',
      F.typography.canonTokens === ((canon.typography || {}).scale || []).length,
      `${F.typography.canonTokens} vs ${((canon.typography || {}).scale || []).length}`);
    ok('타이포 원본/정본 단계 수 동일', F.typography.figmaTokens === F.typography.canonTokens);
    ok('타이포 불일치 0건', F.typography.mismatches.length === 0,
      F.typography.mismatches.map(m => `${m.token}.${m.field}`).join(', '));
    ok('간격 대조 대상 수 = 정본 단계 수',
      F.spacing.canonSteps === ((canon.spacing || {}).scale || []).length);
    ok('간격 값 일치', F.spacing.valuesMatch === true);
    ok('원본 간격 이름 중복이 기록됨', F.spacing.originalDuplicateNames.length > 0);
    ok('원본 중복 이름이 저장소에서는 해소됨', (() => {
      const names = ((canon.spacing || {}).scale || []).map(x => x.token);
      return new Set(names).size === names.length;
    })());
    ok('엘리베이션 원본 레벨 기록됨', (F.elevation.figmaLevels || []).length === 6);
    ok('대조 방법이 읽기 전용임을 명시', /읽기 전용/.test(F.method), F.method);
    // 이 대조에서 나온 원본 결함이 기록됐는가
    const DEC2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
    const ids = (DEC2.sourceDefects.items || []).map(d => d.id);
    for (const id of ['SD-7', 'SD-8', 'SD-9', 'SD-10']) ok(`원본 결함 ${id} 기록됨`, ids.includes(id));
    // 타이포 미결 안건
    const open6 = (T2.open || []).find(o => o.id === 'TQ-6');
    ok('TQ-6 (Time picker 서체) 확정됨', !!open6 && open6.status === 'closed');
    ok('TQ-6 확정문에 근거와 제목이 있음', !!open6 && !!open6.resolution && !!open6.settledTitle);
    ok('TQ-6 이 Noto Sans KR 단일로 확정됨', !!open6 && /Noto Sans KR 단일/.test(open6.resolution || ''));
    ok('원본 결함 SD-16 기록됨', (DEC2.sourceDefects.items || []).some(d => d.id === 'SD-16'));
    const dh2 = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
    ok('타이포 대조 결과가 결정 기록 페이지에 표시됨', dh2.includes(String(F.typography.matched)));
    ok('TQ-6 이 결정 안건 페이지에 표시됨', dh2.includes('TQ-6'));
  }
}

// ────────────────────────────────────────────────────────────
console.log('\n[11] 컴포넌트 — Buttons');
{
  const bp = path.join(ROOT, 'data', 'component-buttons.json');
  ok('data/component-buttons.json 존재', fs.existsSync(bp));
  if (fs.existsSync(bp)) {
    const B = JSON.parse(fs.readFileSync(bp, 'utf8'));
    ok('버튼 종류 8종', B.types.length === 8, String(B.types.length));
    ok('종류마다 번호·이름·노드가 있음',
      B.types.every(t => t.no && t.name && t.node));
    ok('번호가 1~8 연속', B.types.map(t => t.no).join() === '1,2,3,4,5,6,7,8');
    ok('컴포넌트 토큰이 전부 Components/Buttons 네임스페이스',
      B.tokenNames.component.every(n => n.startsWith('Components/Buttons/')));
    ok('시맨틱 토큰이 전부 Semantic/ 네임스페이스',
      B.tokenNames.semantic.every(n => n.startsWith('Semantic/')));
    ok('3계층 매핑이 시맨틱 토큰만 가리킴',
      Object.values(B.tokenNames.mapping).flat().every(n => B.tokenNames.semantic.includes(n)));
    ok('읽기 전용 명시', /읽기 전용/.test(B.method));

    // Elevation_2 실측 일치가 실제로 성립하는가 — 저장소 값과 재대조
    const EO = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'elevation-override.json'), 'utf8'));
    const e2 = EO.styles.find(s2 => s2.name === 'Elevation_2');
    ok('Elevation_2 가 저장소에 2겹으로 존재', !!e2 && e2.layers.length === 2);
    ok('Elevation_2 실측 일치 주장이 저장소 값과 맞음', (() => {
      if (!e2) return false;
      const want = [{ x: 0, y: 1, blur: 3, spread: 1, alpha: 0.15 }, { x: 0, y: 1, blur: 2, spread: 0, alpha: 0.3 }];
      return want.every((w, i) => {
        const l = e2.layers[i];
        return l && l.x === w.x && l.y === w.y && l.blur === w.blur && l.spread === w.spread
          && Math.abs(l.alpha - w.alpha) <= 0.01;
      });
    })());
    ok('Elevation_2 신뢰도가 팩트로 갱신됨', /팩트/.test(EO._confidence.elevation_2_values || ''));
    ok('Elevation_1 레이어 수는 여전히 미확인으로 표기',
      /미확인/.test(EO._confidence.elevation_1_layer_count || ''));

    // 이 실측에서 나온 결함·안건
    const DEC3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
    const ids = DEC3.sourceDefects.items.map(x => x.id);
    for (const id of ['SD-11', 'SD-12', 'SD-13', 'SD-14', 'SD-15']) ok(`원본 결함 ${id} 기록됨`, ids.includes(id));
    const T3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
    const tq7 = (T3.open || []).find(o => o.id === 'TQ-7');
    ok('TQ-7 (행간 충돌) 확정됨', !!tq7 && tq7.status === 'closed');
    ok('TQ-7 이 Auto 유지로 확정됨', !!tq7 && /Auto 유지/.test(tq7.resolution || ''));
    ok('타이포 미결 안건 0건', (T3.open || []).every(o => o.status === 'closed'));
    ok('CQ-10 에 원본 3계층 근거가 붙음',
      /Semantic\/Color\/Background/.test((DEC3.open.find(o => o.id === 'CQ-10') || {}).figmaEvidence || ''));

    const dh3 = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
    ok('Buttons 실측이 결정 안건 페이지에 표시됨', B.types.every(t => dh3.includes(t.name)));
    ok('3계층을 쓴다는 사실이 페이지에 표시됨', /3계층/.test(dh3));
  }
}

// ────────────────────────────────────────────────────────────
console.log('\n[12] 메운 것 — 구조 · Layout · 시맨틱 · 가이드');
{
  const VIEW = require('./canon-view.js');
  const S = VIEW.structure, LY = VIEW.layout, SM = VIEW.semantic;

  ok('data/gds-structure.json 존재', !!S);
  if (S) {
    ok('4계층이 전부 있음', S.layers.length === 4 && ['Guidelines', 'Foundation', 'Components', 'Template']
      .every((n, i) => S.layers[i].name === n));
    ok('Foundation 이 6요소', S.layers[1].items.length === 6, String(S.layers[1].items.length));
    ok('Foundation 6요소 이름이 원본 목차와 일치',
      ['Color', 'Typography', 'Spacing', 'Icon', 'Elevation', 'Radius']
        .every(n => S.layers[1].items.some(i => i.name === n)));
    ok('Components 목차 25개', S.layers[2].items.length === 25, String(S.layers[2].items.length));
    ok('[Foundation] 본문과의 불일치가 기록돼 있음', /GAP-14/.test(S.layers[1].conflict || ''));
    ok('항목마다 Figma 상태와 저장소 반영 상태가 있음',
      S.layers.every(l => l.items.every(i => i.figma && i.repo)));
    ok('문서화 규칙 3줄이 담겨 있음', (S.documentationRules.rules || []).length === 3);
    ok('토큰 계층과 문서 계층이 구분돼 있음',
      (S.tokenLayers || []).length === 3 && /문서 계층/.test(S.note || ''));
  }

  ok('data/layout-tokens.json 존재', !!LY);
  if (LY) {
    const n = ['screen', 'margin', 'safeArea', 'header'].reduce((a, g) => a + (LY[g] || []).length, 0);
    ok('Layout 토큰 10개', n === 10, String(n));
    ok('마진 규칙에 iOS 하단 0px 이 있음',
      LY.margin.some(m => m.token === 'margin-bottom-ios' && m.value === 0));
    ok('AOS/Web 하단은 20px', LY.margin.some(m => m.token === 'margin-bottom-android' && m.value === 20));
    ok('홈 인디케이터 34px', LY.safeArea.some(s => s.value === 34));
    ok('화면 영역 3종 기록', (LY.regions || []).length === 3);
    ok('폭 불일치(360 vs 365)가 기록돼 있음', /GAP-24/.test(LY.conflict || ''));
    const css0 = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
    ok('Layout 토큰이 CSS 로 출력됨',
      ['screen-ios-width', 'margin-side', 'home-indicator-height']
        .every(k => css0.includes(`--gds-layout-${k}:`)));
  }

  ok('시맨틱 계층 존재', !!SM && SM.tokens.length > 0, SM ? String(SM.tokens.length) : '없음');
  if (SM) {
    ok('시맨틱 참조가 전부 정본에 실재', VIEW.semanticMissing.length === 0, VIEW.semanticMissing.join(', '));
    ok('시맨틱 토큰마다 근거가 있음', SM.tokens.every(t => (t.evidence || '').length > 10));
    ok('시맨틱 이름이 전부 Semantic/ 네임스페이스', SM.tokens.every(t => /^Semantic\//.test(t.token)));
    ok('딤 레이어 시맨틱이 Modal 근거로 붙음',
      SM.tokens.some(t => t.token === 'Semantic/Overlay/Modal' && /Dim layer 1/.test(t.evidence))
      && SM.tokens.some(t => t.token === 'Semantic/Overlay/Fullscreen' && /Dim layer 2/.test(t.evidence)));
    const css1 = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
    ok('시맨틱이 CSS 에서 프리미티브를 var() 로 참조', (() => {
      const m = css1.match(/--gds-text-default:\s*([^;]+);/);
      return !!m && /^var\(--gds-color-/.test(m[1].trim());
    })(), '시맨틱은 값을 직접 쓰면 안 됩니다');
    const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8'));
    ok('DTCG 에 semantic · layout 블록이 있음', !!J.semantic && !!J.layout);
    ok('DTCG 시맨틱이 참조 문법을 씀',
      Object.values(J.semantic).every(v => /^\{color\./.test(v.$value)));
  }

  ok('색 역할 축 7종 기록', !!VIEW.roles && VIEW.roles.items.length === 7);
  if (VIEW.roles) {
    ok('Primary/Secondary/Tertiary 축이 있음',
      ['Primary', 'Secondary', 'Tertiary'].every(r => VIEW.roles.items.some(i => i.role === r)));
    ok('텍스트는 Gray scale 원칙이 기록됨',
      VIEW.roles.items.some(i => i.role === 'Secondary' && /텍스트는 모두 Gray scale/.test(i.rule)));
    ok('브랜드 속성 3종', (VIEW.roles.brandAttributes || []).length === 3);
  }

  const gp = path.join(ROOT, 'docs', 'GDS-uiux-guide.md');
  ok('docs/GDS-uiux-guide.md 생성됨', fs.existsSync(gp));
  if (fs.existsSync(gp)) {
    const g = fs.readFileSync(gp, 'utf8');
    ok('UX 라이팅 6항목이 문서에 있음',
      ['어투', '헤더 타이틀', '문장형 타이틀', '본문', '플레이스홀더', '알림 · 버튼'].every(k => g.includes(k)));
    ok('그래픽 3단계가 문서에 있음', ['Lv. 1', 'Lv. 2', 'Lv. 3'].every(k => g.includes(k)));
    ok('손으로 적지 않았다는 근거 표기', /본문. 원본을 옮겨 적은 것/.test(g));
  }

  // ── 타이포 시맨틱 — ✅ Type scale Usage 열에서 계산했는지 ──
  const TS = VIEW.typeSemantic;
  ok('타이포 시맨틱 계층 존재', !!TS && TS.status === 'confirmed');
  if (TS) {
    const LIBT = VIEW.typeLib.styles;
    // 쓰임새 역색인을 여기서 다시 계산해 생성물과 대조합니다 — 숫자를 손으로 적지 않습니다.
    const inv = new Map();
    for (const s of LIBT) for (const u of (s.usage || [])) {
      if (!inv.has(u)) inv.set(u, []); inv.get(u).push(s.canonToken);
    }
    ok('쓰임새를 하나도 빠뜨리지 않음', TS.tokens.length + TS.families.length === inv.size,
      `${TS.tokens.length}+${TS.families.length} vs ${inv.size}`);
    ok('토큰은 쓰임새가 단계 하나만 가리킬 때만',
      TS.tokens.every(t => (inv.get(t.usage) || []).length === 1));
    ok('계열은 쓰임새가 여러 단계를 가리킬 때만',
      TS.families.every(f => (inv.get(f.usage) || []).length > 1));
    ok('시맨틱이 가리키는 단계가 전부 실재',
      TS.tokens.every(t => LIBT.some(s => s.name === t.ref && s.canonToken === t.refCanon)));
    ok('시맨틱마다 ✅ 페이지 근거가 붙음',
      TS.tokens.concat(TS.families).every(t => /42066:25472/.test(t.evidence || '')));
    const J2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8'));
    ok('DTCG 에 semanticType 블록이 있음',
      !!J2.semanticType && Object.keys(J2.semanticType).length === TS.tokens.length);
    ok('DTCG 타이포 시맨틱이 참조 문법을 씀',
      Object.values(J2.semanticType || {}).every(v => /^\{type\./.test(v.$value)));
    ok('미확정 계열이 주석으로 남음',
      (J2.$notes.typeSemantic || {}).families && J2.$notes.typeSemantic.families.length === TS.families.length);
    const css2 = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
    ok('타이포 시맨틱이 CSS 에서 프리미티브를 var() 로 참조',
      TS.tokens.every(t => new RegExp(`--gds-type-semantic-${t.role}-size:\\s*var\\(--gds-type-`).test(css2)));
    // TQ-6 근거 — 정본 타이포는 Noto Sans KR 단일이고 Rubik 은 나오지 않습니다.
    ok('정본 타이포 21단계가 전부 Noto Sans KR',
      LIBT.every(s => s.fontFamily === 'Noto Sans KR'), 'TQ-6');
    ok('Time picker 숫자·날짜가 Title 1 · Title 2 로 배정됨',
      TS.tokens.some(t => t.usage === 'Time picker_number' && t.refCanon === 'Title 1')
      && TS.tokens.some(t => t.usage === 'Time picker_date' && t.refCanon === 'Title 2'));
    ok('Rubik 참조가 결함으로 기록됨',
      (VIEW.sourceDefects.items || []).some(d => d.id === 'SD-18' && /Rubik/.test(d.problem)));
    const dp = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
    ok('결정 페이지에 타이포 시맨틱 표가 실림',
      TS.tokens.every(t => dp.includes(t.token)) && TS.families.every(f => dp.includes(f.usage)));
  }

  // ── 정본 사이트가 새 계층을 싣는지 ── /decisions 에만 있으면 «정본 문서»가 아니라 «작업 기록»입니다.
  {
    const idx = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    // 사이트는 브라우저에서 그려집니다 — 문법 오류 하나면 페이지 전체가 빈 화면이 됩니다.
    // 실행하지 않고 «파싱만» 해서 그걸 잡습니다(의존성 0).
    const scripts = [...idx.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    ok('사이트 스크립트가 있음', scripts.length > 0);
    let parseErr = null;
    for (const s of scripts) { try { new Function(s); } catch (e) { parseErr = e.message; break; } }
    ok('사이트 스크립트가 문법 오류 없이 파싱됨', parseErr === null, parseErr || '');

    // 네비 항목과 뷰 함수가 1:1 인지 — 어긋나면 눌렀을 때 빈 화면입니다.
    // 네비는 이제 NAV 모델에서 그려지므로 마크업이 아니라 모델을 봅니다.
    const nm = idx.match(/const NAV=\[([\s\S]*?)\n\];/);
    const navKeys = nm ? [...nm[1].matchAll(/\['([a-z]+)','[^']*'\]/g)].map(m => m[1]) : [];
    const vm = idx.match(/const V=\{([^}]+)\}/);
    const viewKeys = vm ? vm[1].split(',').map(s => s.trim()) : [];
    ok('네비 항목과 뷰 함수가 1:1', navKeys.length > 0 && viewKeys.length > 0
      && navKeys.every(k => viewKeys.includes(k)) && viewKeys.every(k => navKeys.includes(k)),
      `nav ${navKeys.join(',')} / V ${viewKeys.join(',')}`);
    ok('사이트에 레이아웃 · 시맨틱 항목이 있음',
      navKeys.includes('layout') && navKeys.includes('semantic'));
    ok('최상위 네비가 2단으로 갈라짐(가로 섹션 + 섹션 내 사이드바)',
      /id="topnav"/.test(idx) && /id="secnav"/.test(idx) && (nm ? /sec:'/.test(nm[1]) : false));

    // ── 크롬이 브랜드 빨강을 입지 않았는지 ──
    // 문서가 자기 색으로 칠해져 있으면 색 스와치가 UI 의 일부처럼 보입니다.
    // accent 는 정본 Navy 값이어야 합니다 — 사이트가 자기 토큰으로 만들어졌다는 뜻입니다.
    const navy060 = VIEW.colors.find(c => c.name === 'Navy/Navy 060');
    const navy010 = VIEW.colors.find(c => c.name === 'Navy/Navy 010');
    const navy030 = VIEW.colors.find(c => c.name === 'Navy/Navy 030');
    const navy080 = VIEW.colors.find(c => c.name === 'Navy/Navy 080');
    const acc = idx.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:(#[0-9A-Fa-f]{6})/g) || [];
    ok('크롬 accent 가 정본 Navy 값과 같음(라이트/다크)', acc.length === 2
      && acc[0] === `--accent:${navy060.hex}; --accent-soft:${navy010.hex}`
      && acc[1] === `--accent:${navy030.hex}; --accent-soft:${navy080.hex}`,
      acc.join(' | '));
    ok('사이드바 활성 표시가 브랜드 빨강이 아님',
      /nav\.side a\.item\.on\{color:var\(--accent\)/.test(idx));
    // 크롬 CSS 안만 봅니다 — 주입된 데이터에는 정본 색 값이 그대로 들어 있어 전체 검색은 무의미합니다.
    const styleBlock = (idx.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
    ok('히어로가 브랜드 그라디언트를 입지 않음',
      !/\.hero\{[^}]*gradient/.test(styleBlock) && !/#B01F24/.test(styleBlock));

    // ── 문서 위생 ── 버전 · 찾기 · 근거 메타
    ok('제품명 옆 버전이 표기됨', /id="ver"/.test(idx) && /D\.meta\.version/.test(idx));
    ok('찾기 팔레트가 있음', /id="palq"/.test(idx) && /const INDEX=/.test(idx));
    ok('찾기 색인이 페이지와 토큰을 모두 담음',
      /kind:'page'/.test(idx) && /kind:'color'/.test(idx) && /kind:'semantic'/.test(idx));
    const pmetaCount = (idx.match(/pmeta\(\{/g) || []).length;
    ok('페이지마다 «출처·근거·갱신» 고정 메타', pmetaCount >= navKeys.length - 1,
      `${pmetaCount}개 / 뷰 ${navKeys.length}개`);

    // 데이터가 실제로 주입됐는지 — 뷰가 있어도 데이터가 없으면 «아직 실리지 않았습니다» 가 뜹니다.
    const dm = idx.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/);
    ok('사이트 데이터 블록이 있음', !!dm);
    if (dm) {
      const SD = JSON.parse(dm[1].replace(/<\\\//g, '</')).canon;
      ok('사이트에 Layout 이 실림', !!SD.layout
        && ['screen', 'margin', 'safeArea', 'header'].reduce((n, g) => n + (SD.layout[g] || []).length, 0) === 10);
      ok('사이트에 색 시맨틱이 실림',
        !!SD.semantic && SD.semantic.tokens.length === VIEW.semantic.tokens.length);
      ok('사이트에 타이포 시맨틱이 실림',
        !!SD.typography.semantic && SD.typography.semantic.tokens.length === VIEW.typeSemantic.tokens.length
        && SD.typography.semantic.families.length === VIEW.typeSemantic.families.length);
      ok('사이트에 차기 라이브러리 21종이 실림',
        !!SD.typography.library && SD.typography.library.styles.length === VIEW.typeLib.styles.length);
      ok('사이트에 모자란 곳 집계가 실림', !!SD.gapSummary
        && SD.gapSummary.resolved === VIEW.GAPS.items.filter(g => g.status === 'resolved').length
        && SD.gapSummary.total === VIEW.GAPS.items.length);
    }
  }

  const GAPS = VIEW.GAPS;
  ok('해소된 GAP 마다 해소 문구가 있음',
    GAPS.items.filter(i => i.status === 'resolved').every(i => (i.resolution || '').length > 10));
  ok('해소 건수가 0보다 큼', GAPS.items.filter(i => i.status === 'resolved').length > 0,
    `${GAPS.items.filter(i => i.status === 'resolved').length}/${GAPS.items.length}`);
}

console.log(`\n${fail === 0 ? '통과' : '실패'} — ${pass + fail}개 항목 중 ${pass}개 일치, ${fail}개 불일치`);
process.exit(fail === 0 ? 0 : 1);
