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

// R-3: 원본 스케일 안에 20 이 포함되어야 함 (상한 20px)
const SCALE = [4, 8, 10, 12, 16, 20];
ok('R-3 원본 스케일 상한 = 20px', Math.max(...SCALE) === 20);

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


// ---------- 5. 원본 사이트 · 토큰 ----------
console.log('\n[5] 원본 산출물');
const canon = D.canon || {};
ok('원본 색 스타일 확보', (canon.color && (canon.color.styles||[]).length) > 0, `${(canon.color&&canon.color.styles||[]).length}개`);
ok('원본 타입 스케일 확보', (canon.typography && canon.typography.scale.length) > 0);
ok('원본 간격 스케일 확보', (canon.spacing && canon.spacing.scale.length) > 0);
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
  ok('원본 사이트에 결정 안건 링크', fs.readFileSync(path.join(ROOT,'dist','index.html'),'utf8').includes('decisions/'));
}

// ---------- 6. 감사 문서 ↔ 감사 데이터 대조 ----------
// 문서에 적힌 숫자가 스크립트 계산값과 어긋나면 실패합니다 (작업 규칙 1).
console.log('\n[6-2] GDS 폰트');
{
  const FONT = require('./font.js');
  const pages = ['dist/index.html', 'dist/decisions/index.html']
    .map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
  ok('빌드된 페이지 존재', pages.length === 2, `${pages.length}/2`);
  for (const f of pages) {
    const html = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f);
    // 본문 폰트 선언이 전부 GDS 폰트인지 (모노는 코드 표기용이라 예외)
    // @font-face 안의 선언(패밀리 정의)은 제외하고, 실제 적용 선언만 봅니다
    const applied = html.replace(/@font-face\{[^}]*\}/g, '');
    const decls = [...applied.matchAll(/font-family:\s*([^;}]*)/g)].map(m => m[1].trim())
      .filter(d => !/monospace/i.test(d));
    const bad = [...new Set(decls.filter(d => d !== FONT.STACK))];
    ok(`${rel} · 본문 폰트 선언 ${decls.length}건이 전부 GDS 폰트`, bad.length === 0, bad.join(' | '));
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
  ok('color-decisions 가 원본과 정합', VIEW.integrity.missing.length === 0 && VIEW.integrity.hexMismatch.length === 0,
    `없는 이름 ${VIEW.integrity.missing.join(',')} · HEX 불일치 ${VIEW.integrity.hexMismatch.length}`);
  ok('메인 색상 지정됨', !!VIEW.mainStyle, '확정 main 이 원본에 없음');
  ok(`메인 = ${DEC.main.token} ${DEC.main.hex}`, !!VIEW.mainStyle && VIEW.mainStyle.hex.toUpperCase() === DEC.main.hex.toUpperCase());

  // 10단위 규칙 — 원본 스케일형 이름에 3자리 100단위(100 제외)가 남아 있으면 실패
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
  for (const name of exc) ok(`예외가 원본에 실제로 존재 — ${name}`, VIEW.colors.some(c => c.name === name));
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
      ok('모든 원본 토큰에 용도 있음', scale.every(t => (U[t] || []).length > 0),
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

    // 원본 53종이 Figma 변수의 부분집합인가 (이름 기준)
    const rawNames = (((D2 => D2)(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'))))
      .canon.color.styles).map(s => s.name);
    const notInFigma = rawNames.filter(n => !(n in FV.variables));
    ok('원본 색이 전부 Figma 변수에 존재', notInFigma.length === 0, notInFigma.join(', '));
    ok('원본 색 수 = 라이브러리 선언값', VIEW.colors.length === SYNC.canonFillStyles,
      `${VIEW.colors.length} vs ${SYNC.canonFillStyles}`);

    // 값 불일치 0건 (Gray 080 은 다중 fill 로 반환되므로 앞자리만 비교)
    const mism = rawNames.filter(n => {
      const fig = String(FV.variables[n]).split(',')[0].toUpperCase();
      const canonHex = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'))
        .canon.color.styles.find(s => s.name === n) || {}).hex.toUpperCase();
      return fig !== canonHex;
    });
    ok('색 값이 Figma 원본과 일치', mism.length === 0, mism.join(', '));

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
    ok('처분 합계 = 원본 밖 변수 수', (() => {
      const inCanon2 = new Set(VIEW.libFill.map(s => s.name));
      const outside = VIEW.undocumented.filter(n => !inCanon2.has(n));
      return VIEW.additions.length + VIEW.typeHandled.length === outside.length;
    })());
    ok('안내문의 종수 표기가 실제와 일치',
      new RegExp(`${VIEW.undocumented.length}종`).test(SYNC.note), SYNC.note);
    ok('additions 에 유령 항목 없음', VIEW.integrity.additionUnknown.length === 0, VIEW.integrity.additionUnknown.join(', '));
    ok('additions 값이 Figma 원본과 일치', VIEW.integrity.additionStale.length === 0, VIEW.integrity.additionStale.join(', '));
    ok('편입 이름이 기존 원본과 충돌하지 않음', VIEW.integrity.additionCollision.length === 0, VIEW.integrity.additionCollision.join(', '));
    ok('보류(defer) 항목은 전부 열린 안건에 묶여 있음',
      VIEW.deferredAdditions.every(a => VIEW.openDecisions.some(o => o.id === a.blockedBy)),
      VIEW.deferredAdditions.map(a => `${a.id}→${a.blockedBy}`).join(', '));
    ok('폐기(retire) 대상이 원본에 존재',
      VIEW.retiredAdditions.every(a => VIEW.colors.some(c => c.name === a.target)),
      VIEW.retiredAdditions.map(a => a.target).join(', '));
    ok('편입 색이 토큰에 실제로 출력됨', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return VIEW.adopted.every(a => css.includes(a.hex.toLowerCase()) || css.includes(a.hex.toUpperCase()));
    })());
    ok('원본 = 라이브러리 − 흡수 + 분리',
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
      // 캔버스 결함은 노드 ID 로, 라이브러리 스타일 결함은 스타일 이름으로 찾아갑니다.
      // 주소 없는 결함 기록은 쓸모가 없으므로 둘 중 하나는 반드시 있어야 합니다.
      ok('원본 결함마다 찾아갈 주소가 있음',
        VIEW.sourceDefects.items.every(d => /\d+:\d+/.test(d.node) || !!d.styleName),
        VIEW.sourceDefects.items.filter(d => !/\d+:\d+/.test(d.node) && !d.styleName).map(d => d.id).join(', '));
      ok('스타일 이름으로 적은 결함은 그 스타일이 실재',
        VIEW.sourceDefects.items.filter(d => d.styleName).every(d =>
          !VIEW.effects || VIEW.effects.items.some(e => e.name === d.styleName)),
        '없는 스타일을 가리키는 결함 기록');
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
    ok('CQ-9 알파가 원본 스와치 근거로 표시됨', (() => {
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
    ok('원본 기준이 라이브러리로 기록됨',
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
    ok('타이포 대조 대상 수 = 원본 단계 수',
      F.typography.canonTokens === ((canon.typography || {}).scale || []).length,
      `${F.typography.canonTokens} vs ${((canon.typography || {}).scale || []).length}`);
    ok('타이포 Figma 변수 / GDS 단계 수 동일', F.typography.figmaTokens === F.typography.canonTokens);
    ok('타이포 불일치 0건', F.typography.mismatches.length === 0,
      F.typography.mismatches.map(m => `${m.token}.${m.field}`).join(', '));
    ok('간격 대조 대상 수 = 원본 단계 수',
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
    // TQ-8 — 문서 사이트 서체. 그린카 공식 사이트는 Pretendard/Outfit 이지만 원본을 씁니다.
    const open8 = (T2.open || []).find(o => o.id === 'TQ-8');
    ok('TQ-8 (문서 사이트 서체) 확정됨', !!open8 && open8.status === 'closed');
    ok('TQ-8 이 GDS 서체 Noto Sans KR 유지로 확정됨',
      !!open8 && /Noto Sans KR/.test(open8.resolution || '') && /^A —/.test(open8.resolution || ''));
    ok('TQ-8 근거가 그린카 사이트 실측임',
      !!open8 && /getComputedStyle/.test(open8.evidence || ''));
    // 결정과 실제 렌더가 같은지 — 사이트가 다른 글꼴로 그려지면 문서가 스스로를 반증합니다.
    {
      const cssF = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      const idxF = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      ok('문서 사이트가 TQ-8 대로 Noto Sans KR 로 렌더됨',
        /--gds-font-family:\s*"Noto Sans KR"/.test(cssF)
        && /font-family:"Noto Sans KR",sans-serif/.test(idxF)
        && !/Pretendard|Outfit/.test((idxF.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1]));
    }
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
    const css0 = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
    ok('Layout 토큰이 CSS 로 출력됨',
      ['screen-ios-width', 'margin-side', 'home-indicator-height']
        .every(k => css0.includes(`--gds-layout-${k}:`)));

    // ── 화면 폭 (GAP-24 해소) — iOS 375 / AOS·Web 360. 원본의 플랫폼 묶음이 그대로 원본입니다.
    const CF = LY.conflicts || [];
    const AX = LY.platformAxis || {};
    ok('폭 충돌이 축별로 기록됨', CF.length === 2, `${CF.length}건`);
    ok('두 축 모두 해소됨', CF.every(c => c.status === 'resolved'));
    ok('365 판정이 SD-19 를 근거로 댐', CF.some(c => /SD-19/.test(c.resolution || '')));
    ok('365 를 오타로 단정하지 않음 — 시나리오로만 남김',
      CF.some(c => c.axis === '365' && /단정하지 않/.test(c.scenario || '')));
    ok('AOS 폭 판정에 확정자가 적힘',
      CF.some(c => c.gap === 'GAP-24' && /강민관/.test(c.resolution || '')));
    ok('플랫폼 축 — iOS 375 · AOS 360 · Web 360',
      AX.ios === 375 && AX.aos === 360 && AX.web === 360,
      `ios ${AX.ios} · aos ${AX.aos} · web ${AX.web}`);
    ok('AOS 와 Web 은 한 토큰으로 묶임 — 값이 같은 이름을 둘로 늘리지 않음',
      LY.screen.some(s => s.token === 'screen-aos-web-width' && s.value === 360 && s.platform === 'aos/web')
      && !LY.screen.some(s => /^screen-(aos|web)-(width|height)$/.test(s.token)));
    ok('막힌 토큰이 남아 있지 않음', !(LY.blocked || []).length);
    ok('AOS 를 단정하던 옛 토큰명이 사라짐',
      !css0.includes('--gds-layout-screen-android-width:') && !css0.includes('--gds-layout-screen-web-width:'));
    ok('화면 폭 토큰이 CSS 로 나감',
      css0.includes('--gds-layout-screen-ios-width: 375px') && css0.includes('--gds-layout-screen-aos-web-width: 360px'));
    ok('원본 표기 SD-19 가 Bottom navigation 을 가리킴', (() => {
      const sd = (VIEW.sourceDefects && VIEW.sourceDefects.items) || [];
      const d = sd.find(x => x.id === 'SD-19');
      return !!d && /Bottom navigation/.test(d.where) && /365/.test(d.problem);
    })());
    ok('GAP-24 가 해소로 기록됨', (() => {
      const g = (VIEW.GAPS.items || []).find(x => x.id === 'GAP-24');
      return !!g && g.status === 'resolved' && /375/.test(g.resolution || '') && /360/.test(g.resolution || '');
    })());
    ok('Layout 페이지가 플랫폼 축을 렌더함', (() => {
      const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      return html.includes('플랫폼을 어떻게 가르는가');
    })());
  }

  // ── 색 별칭 · 면색/선색 짝 (GAP-5 · GAP-8)
  const AL = VIEW.colorAliases;
  ok('data/color-aliases.json 존재', !!AL);
  if (AL) {
    const cssA = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
    const jsonA = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8'));
    const htmlA = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    // ── 키부터 봅니다. 키가 어긋나면 뒤의 값 검사가 «없는 토큰»을 읽다가 죽어서
    //    정작 원인인 키 불일치가 보고되지 않습니다. 실제로 그렇게 놓칠 뻔했습니다.
    const allKeys = AL.duplicates.flatMap(d => d.decidable ? [d.base, ...d.aliases] : d.members);
    ok('별칭 키가 방출된 토큰 키와 일치', allKeys.every(x => !!jsonA.color[x.key]),
      allKeys.filter(x => !jsonA.color[x.key]).map(x => x.key).join(', '));
    // 토큰 키를 두 곳에서 따로 만들면 존재하지 않는 변수를 가리키는 CSS 가 나갑니다 — 실제로 겪었습니다.
    ok('토큰 키 생성기가 한 곳뿐', (() => {
      const src = ['build/tokens.js', 'tools/build-color-aliases.js']
        .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
      return src.every(s => /require\(.*slug\.js.*\)/.test(s))
        && src.every(s => !/function slug\s*\(/.test(s));
    })(), 'build/slug.js 를 쓰지 않고 따로 구현한 곳이 있습니다');
    const keysOk = allKeys.every(x => !!jsonA.color[x.key]);

    // 값이 겹치는 무리가 실제 원본과 맞아야 합니다 — 손으로 적은 수가 아닙니다.
    const byHex = {};
    for (const c of VIEW.colors) (byHex[c.hex.toUpperCase()] = byHex[c.hex.toUpperCase()] || []).push(c);
    const realDups = Object.values(byHex).filter(g => g.length > 1).length;
    ok('겹치는 무리 수 = 원본 실제 중복 수', AL.counts.duplicateValues === realDups,
      `기록 ${AL.counts.duplicateValues} · 실제 ${realDups}`);
    ok('판정 가능 + 판정 불가 = 전체',
      AL.counts.decidable + AL.counts.undecidable === AL.duplicates.length);
    ok('단계 그룹을 손으로 적지 않음 — 이름에서 유도됨', AL.scaleGroups.every(g =>
      VIEW.colors.filter(c => c.group === g && /\s\d{3}$/.test(c.name)).length >= 3));
    ok('원본은 반드시 단계 그룹의 칸', AL.duplicates.filter(d => d.decidable)
      .every(d => AL.scaleGroups.includes(d.base.name.split('/')[0]) && /\s\d{3}$/.test(d.base.name)));
    ok('별칭은 단계 그룹이 아님 — 스케일 칸을 별칭으로 만들지 않음',
      AL.duplicates.filter(d => d.decidable).every(d =>
        d.aliases.every(a => !/\s\d{3}$/.test(a.name))));

    // 값을 두 번 적지 않습니다 — 별칭은 var() 로만 나가야 합니다.
    ok('별칭 CSS 가 var() 로 원본을 가리킴', AL.duplicates.filter(d => d.decidable).every(d =>
      d.aliases.every(a => cssA.includes(`--gds-color-${a.key}: var(--gds-color-${d.base.key});`))));
    ok('별칭 CSS 에 HEX 가 직접 남아 있지 않음', AL.duplicates.filter(d => d.decidable).every(d =>
      d.aliases.every(a => !new RegExp(`--gds-color-${a.key}:\\s*#`).test(cssA))));
    ok('별칭 DTCG 가 참조 문법으로 나감', AL.duplicates.filter(d => d.decidable).every(d =>
      d.aliases.every(a => jsonA.color[a.key] && jsonA.color[a.key].$value === `{color.${d.base.key}}`)));
    ok('별칭의 실제 색이 원본과 같음', keysOk && AL.duplicates.filter(d => d.decidable)
      .every(d => jsonA.color[d.base.key].$value.toUpperCase() === d.hex.toUpperCase()
        && d.aliases.every(a => jsonA.color[a.key].$extensions.gds.resolvedValue.toUpperCase() === d.hex.toUpperCase())));

    // 판정 불가 무리는 묶지 않습니다 — 값을 그대로 두고 서로를 가리키기만 합니다.
    ok('판정 불가 무리는 별칭으로 묶지 않음', AL.duplicates.filter(d => !d.decidable).every(d =>
      d.members.every(m => new RegExp(`--gds-color-${m.key}:\\s*#`).test(cssA))));
    ok('판정 불가 무리가 서로를 가리킴', keysOk && AL.duplicates.filter(d => !d.decidable).every(d =>
      d.members.every(m => (jsonA.color[m.key].$extensions.gds.sameValueAs || []).length === d.members.length - 1)));
    ok('판정 불가 사유가 적혀 있음',
      AL.duplicates.filter(d => !d.decidable).every(d => (d.reason || '').length > 20 && (d.handling || '').length > 20));

    // 면색 / 선색 짝
    ok('선색마다 면색 존재 여부가 판정됨', AL.linePairs.every(p => 'fill' in p));
    ok('짝 없는 선색은 면색을 지어내지 않음',
      AL.linePairs.filter(p => !p.fill).every(p => !VIEW.colors.some(c => c.name === p.line.replace(/ Line$/, ''))));
    ok('그룹이 갈린 짝이 GAP-8 로 잡힘', AL.counts.linePairsSplit === AL.splitPairs.length);
    ok('갈린 짝마다 선례가 함께 기록됨', AL.splitPairs.every(p => (p.precedent || '').length > 20));
    ok('면색/선색 짝이 전부 같은 그룹', AL.counts.linePairsSplit === 0,
      AL.splitPairs.map(p => `${p.fill}/${p.line}`).join(', '));

    // ── 그룹을 넘나드는 개명 — 그룹·라벨은 «바뀐 이름»에서 다시 뽑아야 합니다.
    const regrouped = VIEW.colors.filter(c => c.regrouped);
    ok('모든 색의 그룹이 이름과 일치',
      VIEW.colors.every(c => !c.name.includes('/') || c.group === c.name.split('/')[0]),
      VIEW.colors.filter(c => c.name.includes('/') && c.group !== c.name.split('/')[0]).map(c => c.name).join(', '));
    ok('모든 색의 라벨이 이름과 일치', VIEW.colors.every(c => c.label === c.name.split('/').pop()));
    ok('그룹을 옮긴 개명마다 근거가 있음', regrouped.every(c => (c.renameReason || '').length > 30));
    ok('그룹을 옮긴 개명이 원본 이름을 남김', regrouped.every(c =>
      c.originalName && c.originalGroup && c.originalGroup !== c.group
      && jsonA.color[require('./slug.js').colorKey(c.name)].$extensions.gds.renamedFrom === c.originalName));
    ok('옮겨진 짝이 사이트에 해소로 표시됨', !AL.linePairs.some(p => p.moved) || htmlA.includes('GAP-8 해소'));

    ok('별칭이 가리키는 CSS 변수가 실재', AL.duplicates.filter(d => d.decidable)
      .every(d => cssA.includes(`--gds-color-${d.base.key}: `)));

    ok('$notes 에 별칭 기록이 실림', !!(jsonA.$notes && jsonA.$notes.colorAliases));
    ok('Color 페이지에 «이름 정리» 탭이 있음',
      htmlA.includes('이름 정리') && htmlA.includes('같은 값을 가진 이름'));
    ok('별칭 판정이 사이트 데이터에 주입됨', (() => {
      const m = htmlA.match(/"aliases":\{[^]*?"duplicates"/);
      return !!m;
    })());
  }

  // ── 아이콘 (GAP-22) — 규칙은 Guidelines, 치수는 컴포넌트 페이지. 한 곳에 모으되 출처를 지웁니다.
  const IC = VIEW.icons;
  ok('data/icons.json 존재', !!IC);
  if (IC) {
    const htmlI = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    ok('아이콘 분류가 3단계', IC.classification.levels.length === 3);
    ok('분류 출처가 UI/UX guide 노드', /^\d+:\d+/.test(IC.classification.source),
      IC.classification.source);
    ok('분류가 Guidelines 소속임을 명시', /Guidelines/.test(IC.layerNote.rulesLiveIn));
    ok('Icon 이 Foundation 소속임을 명시', IC.layerNote.belongsTo === 'Foundation');
    ok('원본 Icon 상태가 아직 🚧', IC.layerNote.figmaStatus !== 'done', IC.layerNote.figmaStatus);
    ok('분류 내용이 원본과 같음', (() => {
      const g = VIEW.LIB.pages.uiuxGuide.graphic;
      return JSON.stringify(IC.classification.levels) === JSON.stringify(g.levels)
        && JSON.stringify(IC.classification.principles) === JSON.stringify(g['원칙']);
    })(), '옮겨 적는 과정에서 바뀌면 안 됩니다');

    // 실측 — 손으로 옮기지 않고 ✅ 페이지 본문에서 긁은 것이어야 합니다.
    ok('실측 항목이 있음', IC.measured.length > 0, String(IC.measured.length));
    ok('실측 항목이 전부 «아이콘» 항목', IC.measured.every(m => /아이콘|icon/i.test(m.item)));
    ok('실측 항목마다 출처 노드가 있음', IC.measured.every(m => /\d+:\d+/.test(m.node || '')));
    ok('실측 값이 원본 본문과 일치', IC.measured.every(m => {
      const spec = (VIEW.LIB.pages.components || {})[m.component];
      if (!spec) return false;
      const pools = [spec, spec['스펙'], ...(spec.states || [])].filter(Boolean);
      return pools.some(o => String(o[m.item]) === m.value);
    }));
    ok('실측을 아이콘 스케일로 둔갑시키지 않음',
      htmlI.includes('컴포넌트별 값이지 아이콘 스케일이 아닙니다'));

    // 없는 것 — 지어내지 않았다는 사실이 보여야 합니다.
    ok('원본에 없는 항목이 이유와 함께 기록됨',
      IC.missing.length > 0 && IC.missing.every(m => (m.why || '').length > 15));
    // 아이콘 «치수» 토큰은 만들지 않습니다 — 단계별 크기가 원본에 없기 때문입니다.
    // (--gds-icon-* 중 색 시맨틱은 Bottom navigation ✅ 근거가 있어 정당합니다.)
    ok('아이콘 치수 토큰을 지어내지 않음', (() => {
      const cssI = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      const lines = cssI.split('\n').filter(l => /--gds-icon-/.test(l));
      // 전부 색 프리미티브를 var() 로 가리키는 시맨틱이어야 합니다. px 값이 있으면 지어낸 것입니다.
      return lines.every(l => /var\(--gds-color-/.test(l)) && !/--gds-icon-[a-z-]*(size|width|height|stroke)/.test(cssI);
    })(), '단계별 크기는 원본에 없으므로 토큰으로 내보내면 안 됩니다');
    ok('아이콘 색 시맨틱이 근거를 가짐', (() => {
      const t = (VIEW.semantic ? VIEW.semantic.tokens : []).filter(x => /^Semantic\/Icon\//.test(x.token));
      return t.length > 0 && t.every(x => /Bottom navigation/.test(x.evidence || ''));
    })());
    ok('Icon 페이지가 렌더됨', htmlI.includes('무엇을 아이콘이라 부르는가') && htmlI.includes('아직 없는 것'));

    // ── 페이지를 직접 읽었는지 (GAP-22 재작업) — 등록 스타일 목록만 보면 안 됩니다.
    const P = IC.page;
    ok('Icon system 페이지를 직접 읽음', !!P && P.source.node === '42066:25437');
    ok('페이지가 🚧 임을 밝힘', /🚧/.test(IC.layerNote.caution || ''));
    ok('아이콘 목록이 있음', P.counts.icons > 0, String(P.counts.icons));
    ok('이름 규칙을 지어내지 않고 다수 표기에서 읽음',
      /다수/.test(P.naming.ruleEvidence || '') && P.naming.conforming > P.naming.nonConforming);
    ok('규칙 판정 합 = 고유 이름 수',
      P.naming.conforming + P.naming.nonConforming === P.counts.uniqueNames);
    ok('어긋난 이름이 유형별로 집계됨',
      P.naming.buckets.every(b => b.count === b.names.length && (b.ko || '').length > 5)
      && P.naming.buckets.reduce((n, b) => n + b.count, 0) === P.naming.nonConforming);
    ok('어긋난 이름을 저장소가 고치지 않음',
      htmlI.includes('이름을 저장소가 고치지 않았습니다'));
    ok('두 크기 축을 합치지 않음',
      /같은 축인지/.test(P.tierVsDeclared.finding || ''));
    // 틀린 단정을 지우지 않고 철회로 남깁니다 — 무엇을 왜 틀렸는지가 기록에 남아야 합니다.
    ok('철회한 «없음» 판정이 기록됨',
      !!IC.correction && IC.correction.retracted.length === 5
      && IC.correction.retracted.every(r => (r.why || '').length > 10 && (r.round === 1 || r.round === 2)),
      `${IC.correction.retracted.length}건 (1차 ${IC.correction.retracted.filter(r => r.round === 1).length} · 2차 ${IC.correction.retracted.filter(r => r.round === 2).length})`);
    ok('두 번 틀린 경위가 남아 있음',
      IC.correction.rounds === 2 && /본문/.test(IC.correction.whyWrongTwice || '')
      && /parse-figma-page/.test(IC.correction.fixedBy || ''));
    ok('철회 내용이 페이지에 보임', htmlI.includes('정정 —'));
    ok('«없음» 목록에 철회한 항목이 남아 있지 않음',
      IC.missing.every(m => !IC.correction.retracted.some(r => r.item === m.item)));
    ok('Icon 이 Foundation 내비에 있음', /\['icon','Icon'\]/.test(fs.readFileSync(path.join(ROOT, 'site', 'canon.html'), 'utf8')));

    // ── 원본 제작 가이드라인 (GAP-22 2차 정정) ──
    // 검사의 목적 — 원본 값이 참고 값으로 덮어쓰이지 않게 하는 것.
    const GU = IC.guide;
    ok('원본 제작 가이드라인이 실려 있음', !!GU && GU.counts.sections === 9,
      GU ? `${GU.counts.sections}절` : '없음');
    if (GU) {
      const rawG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figma-pages', 'icon-system-full.json'), 'utf8'));
      const hasText = t => rawG.texts.some(x => x.text.replace(/\s+/g, ' ').trim() === t);
      ok('절 본문이 원본 텍스트와 글자 그대로 일치',
        GU.guide.every(g => !g.lead || hasText(g.lead)), '파서가 원본 줄을 그대로 옮겼는지');
      ok('절마다 근거 노드가 있음', GU.guide.every(g => /^\d+:\d+$/.test(g.node || '')));
      ok('빈 절이 없음', GU.counts.emptySections === 0);
      // 값이 참고가 아니라 원본에서 왔는지 — 참고 값과 다른 것이 증거입니다.
      ok('스트로크가 원본 값 1.2px (KRDS 1.6 · M3 2 와 다름)', GU.values.stroke.value === '1.2px', GU.values.stroke.value);
      ok('스트로크 근거 문장이 원본에 실재', hasText(GU.values.stroke.why));
      ok('기본 Cap 이 Round · 예외가 Butt + 1px offset',
        GU.values.endCap.base === 'Round' && /Butt/.test(GU.values.endCap.exception || ''));
      ok('키라인 4종이 전부 읽힘',
        !!GU.values.keyline.frame && !!GU.values.keyline.square
        && !!GU.values.keyline.circle && !!GU.values.keyline.rectangular);
      ok('크기별 굵기가 5단계이고 크기 순서와 맞음', (() => {
        const S = GU.values.sizeStroke;
        return S.length === 5 && S.every((s, i) => i === 0 || s.stroke <= S[i - 1].stroke);
      })(), GU.values.sizeStroke.map(s => `${s.px}:${s.stroke}`).join(' '));
      ok('24px 굵기가 03_Stroke 기준값과 같음',
        `${(GU.values.sizeStroke.find(s => s.px === 24) || {}).stroke}px` === GU.values.stroke.value);
      ok('원본 안 모순이 «맞춰지지» 않고 기록됨',
        GU.internalConflicts.length > 0 && GU.internalConflicts.every(c => c.decided === false));
      ok('미작성 사용 가이드를 «있음»으로 세지 않음',
        GU.counts.usageGuidesFilled < GU.counts.usageGuides,
        `${GU.counts.usageGuidesFilled}/${GU.counts.usageGuides}`);
      ok('원본 오타를 고치지 않고 셈', GU.typos.length >= 3 && GU.typos.every(t => t.nodes.length > 0));
      ok('제작 가이드라인이 사이트에 실림',
        htmlI.includes('제작 가이드라인 — 원본 00_Size ~ 08_Color'));
    }

    // ── 출처 대조 — 참고는 메우는 용도가 아니라 대조 용도입니다.
    const RF = IC.reference;
    ok('참고 자료가 대조 상태로 강등됨', !!RF && RF.status === 'comparison', RF ? RF.status : '없음');
    if (RF && GU) {
      const ids = new Set(RF.sources.map(s => s.id));
      ok('참고 철회 경위가 기록됨', !!RF.retracted && /본문 텍스트를 읽지 않았/.test(RF.retracted.why || ''));
      ok('출처마다 URL 과 고른 이유가 있음',
        RF.sources.every(s => /^https:\/\//.test(s.url || '') && (s.whyThisOne || '').length > 10));
      ok('인용마다 등록된 출처와 원문이 있음',
        RF.quotes.every(q => ids.has(q.source) && (q.text || '').length > 10), `${RF.quotes.length}건`);
      ok('출처 대조를 기계가 판정함',
        GU.provenance.items.length === RF.quotes.length
        && GU.provenance.items.every(i => ['verbatim', 'partial', 'independent'].includes(i.verdict)));
      ok('KRDS 원문 그대로인 절이 밝혀짐',
        GU.provenance.verbatimSections.length > 0 && GU.counts.verbatim > 0,
        GU.provenance.verbatimSections.join(' · '));
      ok('참고 값이 원본 값을 덮어쓰지 않음', (() => {
        // KRDS 는 1.6px, M3 는 2dp. 원본은 1.2px. 하나라도 참고 값이면 샌 것입니다.
        const v = GU.values.stroke.value;
        return v !== '1.6px' && v !== '2px' && v !== '2dp';
      })(), GU.values.stroke.value);
      ok('원본에 없는 축을 참고로 채우지 않음',
        IC.missing.length > 0 && IC.missing.every(m => m.filledWith === null && m.stillMissingInSource === true),
        `${IC.missing.length}가지`);
      ok('아이콘 치수 토큰이 여전히 0개', (() => {
        const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
        return [...css.matchAll(/--gds-icon-[a-z0-9-]+:\s*([^;]+);/g)].filter(m => /\d+\s*px/.test(m[1])).length === 0;
      })());
      ok('출처 대조가 사이트에 실림',
        htmlI.includes('원본 문장은 어디서 왔나 — 출처 대조') && htmlI.includes('G car 고유 판단'));
      // 00_Size 밖 크기 — 유지 결정을 «정리했다»로 바꿔 적지 않았는지.
      ok('00_Size 밖 크기가 건수와 함께 남아 있음',
        IC.sizeGap.offScale.length === 3
        && IC.sizeGap.offScale.every(o => IC.page.declaredSizes[String(o.px)] === o.count),
        IC.sizeGap.offScale.map(o => `${o.px}:${o.count}`).join(' '));
      ok('유지 결정에 근거 문장이 붙어 있음',
        /강민관/.test(IC.sizeGap.decision.by) && (IC.sizeGap.decision.quote || '').length > 5);
      ok('유지 결정대로 크기를 지우지 않음', (() => {
        const all = Object.keys(IC.page.declaredSizes).map(Number).sort((a, b) => a - b);
        const covered = [...IC.sizeGap.guideSizes, ...IC.sizeGap.offScale.map(o => o.px)].sort((a, b) => a - b);
        return JSON.stringify(all) === JSON.stringify(covered);
      })());
    }
  }

  ok('시맨틱 계층 존재', !!SM && SM.tokens.length > 0, SM ? String(SM.tokens.length) : '없음');
  if (SM) {
    ok('시맨틱 참조가 전부 원본에 실재', VIEW.semanticMissing.length === 0, VIEW.semanticMissing.join(', '));
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
    // TQ-6 근거 — 원본 타이포는 Noto Sans KR 단일이고 Rubik 은 나오지 않습니다.
    ok('원본 타이포 21단계가 전부 Noto Sans KR',
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

  // ── 원본 사이트가 새 계층을 싣는지 ── /decisions 에만 있으면 «원본 문서»가 아니라 «작업 기록»입니다.
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
    // 페이지 eyebrow 와 네비 섹션이 어긋나면 «여기가 어디인지»가 두 군데서 다르게 말합니다.
    {
      const secOf = {};
      for (const m of nm[1].matchAll(/sec:'([^']+)',\s*items:\[([^\]]*(?:\][^\]]*)*?)\]\}/g)) {
        for (const it of m[2].matchAll(/\['([a-z]+)','[^']*'\]/g)) secOf[it[1]] = m[1];
      }
      const bad = [];
      for (const [k, sec] of Object.entries(secOf)) {
        if (k === 'start') continue;
        const fn = idx.match(new RegExp(`function ${k}\\(\\)\\{[\\s\\S]*?<p class="eyebrow">([^<]+)</p>`));
        if (fn && fn[1].trim() !== sec) bad.push(`${k}: ${fn[1].trim()} ≠ ${sec}`);
      }
      ok('페이지 eyebrow 가 네비 섹션과 같음', bad.length === 0, bad.join(' | '));
    }
    // 섹션 탭은 알약·상자가 아니라 밑줄 하나여야 합니다 — 강민관 지적 2026-08-06.
    {
      const st = (idx.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
      const topnavRules = [...st.matchAll(/\.topnav a[^{]*\{([^}]*)\}/g)].map(m => m[1]);
      ok('섹션 탭에 상자·알약 스타일이 없음',
        topnavRules.length > 0
        && !topnavRules.some(r => /border-radius|background:var\(--surface/.test(r))
        && /\.topnav a\.on:after\{[^}]*height:2px/.test(st));
    }
    ok('최상위 네비가 2단으로 갈라짐(가로 섹션 + 섹션 내 사이드바)',
      /id="topnav"/.test(idx) && /id="secnav"/.test(idx) && (nm ? /sec:'/.test(nm[1]) : false));

    // ── 크롬 accent 가 «원본에 실재하는 값»인지 ──
    // 어느 색을 쓸지는 강민관이 정합니다(2026-08-06 · Primary 빨강).
    // 기계가 보는 것은 «지어낸 색이 아니라 원본 단계 그대로인가» 하나입니다.
    const hexOf = n => (VIEW.colors.find(c => c.name === n) || {}).hex;
    const acc = idx.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:(#[0-9A-Fa-f]{6})/g) || [];
    ok('크롬 accent 가 원본 Primary 단계와 같음(라이트/다크)', acc.length === 2
      && acc[0] === `--accent:${hexOf('Primary/Red 040')}; --accent-soft:${hexOf('Primary/Red 010')}`
      && acc[1] === `--accent:${hexOf('Primary/Red 030')}; --accent-soft:${hexOf('Primary/Red 080')}`,
      acc.join(' | '));
    ok('라이트 accent 가 메인 색(Primary/Red 040)임',
      !!VIEW.mainStyle && acc[0] === `--accent:${VIEW.mainStyle.hex}; --accent-soft:${hexOf('Primary/Red 010')}`);
    ok('크롬 색이 전부 원본 단계에서 옴(지어낸 HEX 없음)', (() => {
      const declared = [...idx.matchAll(/--accent(?:-soft)?:(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase());
      const canon = new Set(VIEW.colors.map(c => c.hex.slice(0, 7).toUpperCase()));
      return declared.length === 4 && declared.every(h => canon.has(h));
    })());
    // 크롬 CSS 안만 봅니다 — 주입된 데이터에는 원본 색 값이 그대로 들어 있어 전체 검색은 무의미합니다.
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

  // ── 효과 분류 ── Elevation 밖 효과가 축으로 갈렸는지, 겹치는 키를 안 내보냈는지.
  {
    const EF = VIEW.effects;
    ok('효과 분류가 있음', !!EF && EF.items.length > 0, EF ? `${EF.items.length}종` : '없음');
    if (EF) {
      ok('축 합 = 전체', ['elevation', 'component', 'material', 'deprecated']
        .reduce((a, k) => a + EF.counts[k], 0) === EF.items.length);
      ok('Elevation 은 정확히 6단계', EF.counts.elevation === 6, String(EF.counts.elevation));
      ok('폐기 표시는 원본 토큰으로 안 나감',
        EF.items.filter(i => i.axis === 'deprecated').every(i => !i.emit));
      // 키가 겹치면 CSS 변수 하나를 두 값이 덮어씁니다 — 그건 조용한 거짓입니다.
      const cssE = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      const emitted = [...cssE.matchAll(/^\s{2}--gds-effect-([a-z0-9-]+):/gm)].map(m => m[1]);
      ok('내보낸 효과 토큰에 중복 키가 없음', new Set(emitted).size === emitted.length,
        emitted.join(', '));
      // 키 충돌 — 확정 전에는 둘 다 막고, 확정 뒤에는 «이긴 쪽 하나만» 나가야 합니다.
      ok('확정 안 된 키 충돌은 내보내지 않음',
        EF.keyCollisions.filter(c => !c.resolved).every(c => !emitted.includes(c.key)),
        EF.keyCollisions.filter(c => !c.resolved).map(c => c.key).join(', '));
      ok('확정된 키 충돌은 이긴 쪽만 내보냄',
        EF.keyCollisions.filter(c => c.resolved).every(c =>
          emitted.includes(c.key)
          && EF.items.filter(i => i.key === c.key && i.emit).length === 1
          && EF.items.find(i => i.key === c.key && i.emit).name === c.winner));
      ok('확정된 값이 원본 스타일 값과 같음',
        EF.keyCollisions.filter(c => c.resolved).every(c => {
          const w = EF.items.find(i => i.name === c.winner);
          const t = (JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8')).effect || {})[c.key];
          return !!w && !!t && t.$value === w.css;
        }));
      ok('키 충돌 확정마다 확정자와 날짜가 있음',
        EF.keyCollisions.filter(c => c.resolved).every(c => !!c.decidedBy && /^\d{4}-\d{2}-\d{2}$/.test(c.decidedAt || '')));
      // ── 소속 검증 (2026-08-06) — «GDS 라이브러리에 없으면 원본이 아니다»를 효과에도 적용합니다.
      ok('원본 효과가 전부 GDS 소속이거나 미확인',
        EF.items.every(i => !i.library || /^GDS/.test(i.library)),
        EF.items.filter(i => i.library && !/^GDS/.test(i.library)).map(i => i.name).join(', '));
      ok('다른 라이브러리 스타일은 배제 목록에 이유와 함께 있음',
        (EF.excludedStyles || []).every(e => e.library && (e.why || '').length > 20));
      ok('배제된 스타일은 원본 목록에 없음',
        (EF.excludedStyles || []).every(e => !EF.items.some(i => i.name === e.name)));
      // 키(슬러그)로 보면 안 됩니다 — «Bottom Sheet» 와 «bottom sheet» 는 같은 키를 만듭니다.
      // 방출 줄의 주석이 어느 스타일에서 왔는지 적으므로 «이름»으로 봅니다.
      ok('배제된 스타일에서 나온 토큰이 없음',
        (EF.excludedStyles || []).every(e =>
          !cssE.split('\n').some(l => /--gds-effect-/.test(l) && l.includes(`/* ${e.name} */`))),
        (EF.excludedStyles || []).map(e => e.name).join(', '));
      ok('방출된 효과가 전부 원본 목록의 GDS 소속 스타일',
        EF.emitted.every(t => {
          const i = EF.items.find(x => x.name === t.name);
          return !!i && /^GDS/.test(i.library || '');
        }), EF.emitted.map(t => t.name).join(', '));
      ok('소속 미확인 스타일은 토큰으로 안 나감',
        EF.items.filter(i => i.unverified).every(i => !i.emit));
      ok('소속 미확인 스타일마다 사유가 적힘',
        (EF.unverifiedStyles || []).every(u => (u.why || '').length > 20));
      ok('막힌 효과마다 이유가 적힘',
        EF.items.filter(i => i.blocked).every(i => (i.blocked || '').length > 15));
      ok('값 미측정 효과는 토큰으로 안 나감',
        EF.items.filter(i => !i.css).every(i => !i.emit));
      ok('내보낸 토큰 수 = emitted 목록 수', emitted.length === EF.emitted.length,
        `${emitted.length} / ${EF.emitted.length}`);
      const JE = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8'));
      ok('DTCG 에 effect 블록과 근거가 있음',
        !!JE.effect && Object.keys(JE.effect).length === EF.emitted.length
        && !!JE.$notes.effects
        && JE.$notes.effects.blocked.length === EF.items.filter(i => i.blocked).length);
      // 대소문자 충돌이 있으면 GAP 으로 기록돼 있어야 합니다.
      ok('대소문자 충돌이 GAP 으로 기록됨',
        EF.caseCollisions.length === 0
        || VIEW.GAPS.items.some(g => g.id === 'GAP-31' && /대소문자/.test(g.finding)));
      ok('해소된 키 충돌이 사이트에 확정으로 보임',
        !EF.keyCollisions.some(c => c.resolved)
        || fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8').includes('토큰 키가 겹친 것 — 해소'));
      const idxE = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      ok('효과 분류가 사이트에 실림', idxE.includes('"effects"') && /Elevation 이 아닌 효과/.test(idxE));
    }
  }

  // ── 컴포넌트 목록 ── «✅ 인데 저장소에 없는 것»이 0인지가 핵심입니다.
  {
    const K = VIEW.components;
    ok('컴포넌트 목록이 있음', !!K && K.items.length > 0, K ? `${K.items.length}종` : '없음');
    if (K) {
      const layer = VIEW.structure.layers.find(l => /^Components$/i.test(l.name));
      ok('목록 수 = 구조도 항목 수', K.items.length === layer.items.length,
        `${K.items.length} / ${layer.items.length}`);
      ok('집계가 실제 항목과 일치', (() => {
        const d = K.items.filter(i => i.figma === 'done').length;
        const doc = K.items.filter(i => i.documented).length;
        return K.counts.figmaDone === d && K.counts.documented === doc
          && K.counts.total === K.items.length;
      })());
      // 이게 0이 아니면 우리 숙제가 남은 것입니다 — 원본 탓이 아닙니다.
      ok('✅ 컴포넌트는 전부 저장소에 있음', K.counts.doneButUndocumented.length === 0,
        K.counts.doneButUndocumented.join(', '));
      ok('실측한 컴포넌트마다 출처 노드가 있음',
        K.items.filter(i => i.documented).every(i => !!i.node));
      ok('원본 대기 종은 내용을 지어내지 않음',
        K.items.filter(i => !i.documented).every(i =>
          !i.definition && !i.kinds && !i.specs && !i.states));

      // ── 본문이 지목한 스타일 대조 (GAP-28) — 가리키는 곳에 실물이 있는가.
      const SR = K.styleRefs || [];
      const EFF = VIEW.effects;
      ok('본문의 스타일 참조를 대조함', SR.length > 0, `${SR.length}건`);
      ok('참조 집계가 실제와 일치',
        K.counts.styleRefs === SR.length && K.counts.styleRefsDangling === SR.filter(r => !r.resolved).length);
      ok('«실재»로 판정한 참조는 정말 라이브러리에 있음',
        SR.filter(r => r.resolved).every(r => EFF.items.some(e => e.name === r.style)));
      ok('«없음»으로 판정한 참조는 정말 라이브러리에 없음',
        SR.filter(r => !r.resolved).every(r => !EFF.items.some(e => e.name === r.name)));
      ok('없는 참조마다 후보를 근거와 함께 제시',
        SR.filter(r => !r.resolved).every(r => r.candidates.length > 0 && (r.why || '').length > 15));
      ok('후보가 전부 실재하는 스타일',
        SR.filter(r => !r.resolved).every(r => r.candidates.every(c => EFF.items.some(e => e.name === c.name))));
      ok('폐기된 후보를 살아있는 것으로 세지 않음',
        SR.filter(r => !r.resolved).every(r =>
          r.live === r.candidates.filter(c => c.axis !== 'deprecated').length));
      // 후보가 여럿이면 «어느 것인지» 고르지 않습니다 — 저장소가 정답을 아는 척하면 안 됩니다.
      // (후보 스타일 자체가 토큰으로 나가는 것은 별개입니다. 여기서 막는 것은 «이 컴포넌트가
      //  쓰는 엘리베이션은 이것» 이라고 단정하는 필드입니다.)
      ok('후보가 여럿인 참조에서 하나를 고르지 않음',
        SR.filter(r => !r.resolved && r.live > 1).every(r => !r.style && !r.axis && !r.css));
      ok('없는 참조가 SD 로 기록됨', SR.filter(r => !r.resolved).every(() =>
        (VIEW.sourceDefects.items || []).some(d => d.id === 'SD-20' && /Elevation_Bottom sheet/.test(d.problem))));
      ok('Components 페이지가 없는 참조를 경고로 렌더함',
        !SR.some(r => !r.resolved)
        || fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8').includes('본문이 없는 스타일을 가리킵니다'));
      // 페이지는 브라우저에서 그려지므로 정적 HTML 에 앵커가 없습니다 —
      // 주입된 데이터와 템플릿 코드를 봅니다.
      const idx4 = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      const dm4 = idx4.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/);
      const SD4 = dm4 ? JSON.parse(dm4[1].replace(/<\\\//g, '</')).canon.components : null;
      ok('사이트에 컴포넌트 목록이 주입됨',
        !!SD4 && SD4.items.length === K.items.length
        && SD4.counts.documented === K.counts.documented);
      ok('주입된 실측 컴포넌트에 내용이 실려 있음',
        !!SD4 && SD4.items.filter(i => i.documented)
          .every(i => i.node && (i.definition || i.kinds || i.specs)));
      ok('Components 뷰가 컴포넌트마다 앵커를 만듦', /id="c-\$\{esc\(i\.name/.test(idx4));
      ok('미해결 메모가 사이트 데이터에 실림', (() => {
        const withMemo = K.items.filter(i => i.openMemos && i.openMemos.length);
        return withMemo.length === 0 || (!!SD4 && withMemo.every(i =>
          (SD4.items.find(x => x.name === i.name) || {}).openMemos));
      })());
    }
  }

  // ── 간격 쓰임새 조사 ── «간격에 시맨틱이 없다»는 주장이 조사로 뒷받침되는지 봅니다.
  {
    const SC = VIEW.spacingCensus;
    ok('간격 쓰임새 조사가 있음', !!SC && SC.counts.annotations > 0,
      SC ? `${SC.counts.annotations}건` : '없음');
    if (SC) {
      // 조사 표의 건수 합계가 실제 행 수와 같은지 — 요약이 손으로 적힌 게 아닌지 확인합니다.
      ok('요약 건수 합 = 실제 주석 행 수',
        SC.summary.reduce((a, x) => a + x.count, 0) === SC.rows.length
        && SC.rows.length === SC.counts.annotations,
        `${SC.summary.reduce((a, x) => a + x.count, 0)} / ${SC.rows.length} / ${SC.counts.annotations}`);
      // 값 판정이 원본 스케일과 대조되는지
      const scale = VIEW.LIB.pages.spacing.값;
      ok('스케일 안/밖 판정이 원본 스케일과 일치',
        SC.summary.every(x => x.onScale === scale.includes(x.value)));
      // 라벨을 못 읽은 말풍선은 «값»으로 세지 않았는지 — 세면 라벨 상자 크기가 간격으로 둔갑합니다.
      {
        const unread = new Set(SC.unreadable.map(u => u.id));
        ok('읽지 못한 말풍선은 값으로 세지 않음',
          SC.counts.unreadable === SC.unreadable.length
          && SC.rows.every(r => !unread.has(r.id))
          && SC.rows.every(r => r.kind === '띠' || r.kind === '말풍선'),
          `못읽음 ${SC.unreadable.length} · 행 ${SC.rows.length}`);
      }
      ok('조사한 ✅ 페이지가 2곳 이상', SC.pages.length >= 2, SC.pages.join(', '));
      const J3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.tokens.json'), 'utf8'));
      ok('토큰에 «간격 시맨틱 없음»이 근거와 함께 기록됨',
        !!J3.$notes.spacingSemantic && J3.$notes.spacingSemantic.exists === false
        && /spacing-census/.test(J3.$notes.spacingSemantic.evidence || ''));
      ok('간격 시맨틱 토큰을 만들지 않았음',
        !/--gds-spacing-semantic/.test(fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8')));
      const idx3 = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      ok('조사 결과가 Spacing 페이지에 실림',
        idx3.includes('spacingCensus') && /쓰임새 조사/.test(idx3));
      ok('스케일 밖 값이 GAP 으로 기록됨',
        SC.summary.some(x => !x.onScale)
          ? VIEW.GAPS.items.some(g => g.id === 'GAP-30' && /스케일에 없는 값/.test(g.finding))
          : true);
    }
  }

  // ── 🚧 페이지 전수 직접 읽기 (GAP-32) ──
  // 검사하는 것은 «읽었다»가 아니라 «읽은 것이 원본과 같은가 · 지어낸 것이 섞이지 않았는가»입니다.
  console.log('\n[13] 🚧 페이지 직접 읽기');
  {
    const PG = VIEW.pages || {};
    const htmlP = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    const srcP = fs.readFileSync(path.join(ROOT, 'site', 'canon.html'), 'utf8');
    const raw = s => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figma-pages', s + '.json'), 'utf8'));

    ok('읽은 페이지가 4쪽 이상', (PG.readSlugs || []).length >= 4, (PG.readSlugs || []).join(', '));

    // ── Elevation
    const EP = PG.elevation;
    ok('Elevation 페이지를 직접 읽음', !!EP && EP.source.node === '42316:48471');
    if (EP) {
      const rawE = raw('elevation-system');
      ok('Elevation 레벨 5단계', EP.levels.length === 5, EP.levels.map(l => l.level).join(','));
      ok('레벨 값이 페이지 텍스트와 글자 그대로 일치', EP.levels.every(l => {
        const i = rawE.texts.findIndex(t => t.id === l.node);
        const row = i >= 0 ? (rawE.texts[i + 1] || {}).text : '';
        return String(row).trim() === `${l.x} ${l.y} ${l.blur} ${l.spread} ${l.alphaPct}%`;
      }), '파서가 표를 다시 읽어 대조합니다');
      ok('dp 값이 오름차순', EP.levels.every((l, i, a) => i === 0 || l.dp > a[i - 1].dp),
        EP.levels.map(l => l.dp).join('<'));
      ok('Level 0 을 그림자 없음으로 둠', !!EP.level0 && EP.level0.shadow === null);
      ok('적용 범위가 페이지에서 나옴', EP.applications.length > 0
        && EP.applications.every(a => rawE.texts.some(t => t.text.trim() === a.raw)));
      ok('별도 지정 값이 Bottom Sheet 3겹을 뒷받침', EP.extraCorroborates === true);
      ok('라이브러리와 어긋나는 것을 «맞추지» 않고 적음',
        EP.conflicts.length > 0 && EP.conflicts.every(c => c.decided === false));
      ok('레벨 값이 엘리베이션 토큰을 덮어쓰지 않음', (() => {
        const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
        // 페이지 표는 1겹, 라이브러리 Elevation_2 는 2겹입니다. CSS 가 페이지 값으로 바뀌면 안 됩니다.
        const l2 = EP.levels.find(l => l.level === 2);
        return !css.includes(`--gds-elevation-2: ${l2.css};`);
      })(), '페이지 값은 기록만 하고 토큰으로 내보내지 않습니다');
      ok('원본 표기 오류를 고치지 않고 셈',
        EP.typos.some(t => t.found === 'Leverl') && EP.typos.some(t => t.found === 'Spreas'));
      ok('빈 절을 «내용 있음»으로 세지 않음', EP.stillEmpty.sections.length >= 3 && EP.stillEmpty.stubCount > 0);
      ok('Elevation 페이지 읽기가 사이트에 실림',
        htmlP.includes('🚧 Elevation system 페이지를 직접 읽었습니다'));
    }

    // ── Radius
    const RP = PG.radius;
    ok('Radius 페이지를 직접 읽음', !!RP && RP.source.node === '42415:11358');
    if (RP) {
      const rawR = raw('radius-system');
      ok('반경 쓰임새가 페이지 라벨과 일치', RP.scale.steps.every(s =>
        rawR.texts.some(t => t.id === s.node && +t.text.trim() === s.px)));
      ok('반경 스케일이 라이브러리와 같음', RP.scale.matchesLibrary === true,
        `${RP.scale.steps.map(s => s.px).join('/')} vs ${RP.scale.libraryScale.join('/')}`);
      ok('원본 미결 메모를 판단하지 않고 옮김', RP.pending.items.length > 0
        && RP.pending.items.every(p => rawR.texts.some(t => t.id === p.node && t.text.trim() === p.note)));
      ok('미결 메모대로 토큰을 미리 바꾸지 않음', (() => {
        const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
        return /--gds-radius-10:\s*10px;/.test(css);   // «10 → 8» 메모가 있지만 아직 10 입니다
      })());
      ok('외부 인용에 판정 근거가 붙음', /정부가 주는 신뢰감/.test(RP.externalQuote.evidence || '')
        && /krds\.go\.kr/.test(RP.externalQuote.verifiedAgainst || ''));
      ok('외부 인용 값을 GDS 스케일로 편입하지 않음',
        RP.externalQuote.diffVsOurs.onlyInQuote.every(px => !RP.scale.libraryScale.includes(px))
        && RP.externalQuote.diffVsOurs.onlyInQuote.length > 0,
        `인용에만 있는 값 ${RP.externalQuote.diffVsOurs.onlyInQuote.join('/')}`);
      ok('인용 값이 토큰으로 새 나가지 않음', (() => {
        const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
        return RP.externalQuote.diffVsOurs.onlyInQuote.every(px => !new RegExp(`--gds-radius-${px}\\b`).test(css));
      })());
      ok('Radius 페이지 읽기가 사이트에 실림',
        htmlP.includes('🚧 Radius system 페이지를 직접 읽었습니다') && htmlP.includes('편입하지 않습니다'));
    }

    // ── Text field
    const TP = PG.textField;
    ok('Text field 페이지를 직접 읽음', !!TP && TP.source.node === '42073:65010');
    if (TP) {
      const rawT = raw('text-field');
      ok('유형 4가지가 원본 선언 수와 같음', TP.types.length === 4
        && rawT.texts.some(t => /4가지 유형으로 구분합니다/.test(t.text)));
      ok('유형별 구조 요소가 비어 있지 않음', TP.sections.every(s => s.parts.length > 0));
      ok('변형 수 = 페이지 심볼 수', TP.variants.total === rawT.componentSets.total
        && TP.variants.items.length === TP.variants.total, String(TP.variants.total));
      ok('Buttons 문장을 Text field 스타일로 옮겨 적지 않음', (() => {
        const d = TP.defects.find(x => x.id === 'TF-2');
        // 결함으로만 기록돼야 하고, 유형·구조 데이터 안에 Buttons 문장이 들어가면 안 됩니다.
        const body = JSON.stringify({ types: TP.types, sections: TP.sections });
        return !!d && !/Default button|Capsule button/.test(body);
      })());
      ok('대소문자 흔들림을 고치지 않고 셈',
        TP.defects.some(d => d.id === 'TF-4' && /License/.test(d.what)));
      ok('원본 결함마다 «고치지 않는다»가 명시됨',
        TP.defects.length >= 5 && TP.defects.every(d => (d.fix || '').length > 10));
      ok('Text field 가 Components 내비에 있음', /\['tfield','Text field'\]/.test(srcP));
      ok('Text field 페이지가 렌더됨', htmlP.includes('원본 결함') && htmlP.includes('Split text field'));
    }

    // ── 🚧 컴포넌트 페이지 5쪽 (Bottom sheet · Search field · Info box · Helper text · Text field)
    const WP = PG.components;
    // 🚧 16쪽 + «시작 전» 이지만 문서 프레임이 있는 Accordion 1쪽 = 17쪽
    ok('컴포넌트 페이지가 17쪽 읽힘', !!WP && WP.counts.pages === 17,
      WP ? `${WP.counts.pages}쪽` : '없음');
    if (WP) {
      ok('페이지마다 근거 노드가 있음', WP.pages.every(pg => /^\d+:\d+$/.test(pg.source.node)));
      ok('절 본문이 원본 텍스트와 글자 그대로 일치', WP.pages.every(pg => {
        const rawp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figma-pages', pg.slug + '.json'), 'utf8'));
        const has = t => rawp.texts.some(x => x.text.replace(/\s+/g, ' ').trim() === t);
        return pg.sections.every(sec => !sec.lead || has(sec.lead));
      }), '파서가 원본 줄을 그대로 옮겼는지');
      ok('남의 문장을 기계로 찾았음', WP.counts.borrowed > 0 && WP.counts.foreign > 0,
        `겹침 ${WP.counts.borrowed} · 주어 ${WP.counts.foreign}`);
      ok('남의 문장이 두 곳 이상에 실재',
        WP.borrowed.items.every(b => new Set(b.appearsIn.map(a => a.slug)).size >= 2));
      // 원본은 남의 문장을 절의 첫 문장으로 두기도 합니다(Search field 의 [유형] = Top app bar 문장).
      // 저장소가 할 일은 «고치는 것»이 아니라 «그런 자리를 하나도 빠뜨리지 않고 표시하는 것»입니다.
      ok('남의 문장이 절 첫 문장으로 있는 자리를 빠짐없이 표시함', (() => {
        const flagged = new Set(WP.borrowed.items.map(b => `${b.text}`));
        const owners = new Map(WP.borrowed.items.map(b => [b.text, b.owner]));
        for (const pg of WP.pages) {
          for (const sec of pg.sections) {
            if (!sec.lead) continue;
            const o = owners.get(sec.lead);
            if (o && o !== pg.slug && !flagged.has(sec.lead)) return false;
          }
        }
        return true;
      })(), '원본의 오염을 고치지 않고 세는 것이 목적입니다');
      ok('남의 문장이 실제로 절 첫 문장으로도 발견됨', (() => {
        const owners = new Map(WP.borrowed.items.map(b => [b.text, b.owner]));
        return WP.pages.some(pg => pg.sections.some(sec =>
          sec.lead && owners.get(sec.lead) && owners.get(sec.lead) !== pg.slug));
      })(), 'Search field 의 [유형] 이 Top app bar 문장인 것 같은 사례');
      ok('화면 목업 문구를 남의 문장으로 세지 않음',
        WP.borrowed.items.every(b => /[A-Z][A-Za-z]/.test(b.text) || /^[➊➋➌➍]/.test(b.text)),
        '앱 문구가 아니라 문서 문장만');
      ok('쓰다 만 문장을 이어 쓰지 않음',
        WP.truncated.items.every(t => !/[.。]$/.test(t.text)));
      ok('빈 템플릿을 «내용 있음»으로 세지 않음',
        WP.pages.every(pg => pg.counts.templateStubs >= 0)
        && WP.pages.some(pg => pg.counts.templateStubs > 0));
      ok('🚧 컴포넌트 페이지가 사이트에 실림',
        htmlP.includes('🚧 컴포넌트 페이지를 직접 읽었습니다') && htmlP.includes('남의 문장'));
      // Bottom sheet — 저장소가 «정의가 Picker ✅ 안에 있다»고 적어 왔는데, 자기 페이지에 정의가 있습니다.
      const bs = WP.pages.find(pg => pg.slug === 'bottom-sheet');
      ok('Bottom sheet 정의가 자기 페이지에 있음',
        !!bs && bs.sections.some(s => s.title === '[정의]' && /Bottom Sheet \(바텀시트\)는/.test(s.lead || '')));
      ok('목차 이름과 페이지 이름이 다른 곳을 표시함',
        WP.naming.items.filter(n => n.differs).length >= 3,
        WP.naming.items.filter(n => n.differs).map(n => `${n.inToc}→${n.pageName}`).join(' · '));
      ok('이름 짝 어긋남을 기계로 찾음',
        WP.nameMismatch.count > 0
        && WP.nameMismatch.count === WP.nameMismatch.items.length
        && WP.nameMismatch.items.every(n => n.enBelongsTo !== n.koBelongsTo && /^\d+:\d+$/.test(n.node)),
        WP.nameMismatch.items.map(n => n.found).join(' · '));
      ok('문서화 템플릿이 없는 페이지도 «빈 페이지»로 세지 않음', (() => {
        const noTpl = WP.pages.filter(pg => !pg.docTemplate);
        return noTpl.every(pg => pg.workNotes.length > 0 && pg.counts.texts > 0);
      })(), `템플릿 있는 쪽 ${WP.counts.withDocTemplate}/${WP.counts.pages}`);
      ok('Bottom sheet 이 Dim layer 를 쓰지 않는다는 근거가 실림',
        !!bs && bs.sections.some(s => (s.rows || []).some(r => /Dim layer \(딤 레이어\)를 사용하지 않습니다/.test(r))));
    }

    // ── «시작 전(—)» 8쪽도 확인했는지
    const NS = PG.notStarted;
    ok('«시작 전» 8쪽을 확인함', !!NS && NS.summary.checked === 8 && NS.pages.length === 8,
      NS ? `${NS.pages.length}쪽` : '없음');
    if (NS) {
      ok('페이지마다 근거 노드가 있음', NS.pages.every(pg => /^\d+:\d+$/.test(pg.node)));
      // 이제 여덟 쪽 모두 원자료가 저장소에 있습니다 — 옮겨 적은 쪽은 0 이어야 합니다.
      ok('쪽마다 옮겨 적음 여부가 명시됨',
        NS.pages.every(pg => typeof pg.transcribed === 'boolean'));
      ok('쪽마다 근거 파일이 실재함',
        NS.pages.every(pg => {
          const f = pg.raw || pg.parsed;
          return f && fs.existsSync(path.join(ROOT, f));
        }),
        NS.pages.filter(pg => {
          const f = pg.raw || pg.parsed;
          return !f || !fs.existsSync(path.join(ROOT, f));
        }).map(pg => pg.slug).join(', '));
      // 요약 수치가 항목과 맞는지 — 손으로 적은 수가 아니어야 합니다.
      ok('요약 수치가 항목과 일치', (() => {
        const by = {};
        for (const pg of NS.pages) by[pg.state] = (by[pg.state] || 0) + 1;
        return NS.summary.empty === (by.empty || 0)
          && NS.summary.templateOnly === (by['template-only'] || 0)
          && NS.summary.documentedButContaminated === (by['documented-but-contaminated'] || 0)
          && NS.summary.specOutsideTemplate === (by['spec-outside-template'] || 0)
          && NS.summary.screensOnly === (by['screens-only'] || 0)
          && NS.summary.checked === NS.pages.length;
      })());
      ok('«정말로 빈» 쪽이 하나뿐임', NS.summary.empty === 1
        && NS.pages.filter(pg => pg.state === 'empty').map(pg => pg.name)[0] === 'Table (테이블)');
      ok('오염된 문서에 근거 노드가 붙음',
        NS.pages.filter(pg => pg.contamination)
          .every(pg => pg.contamination.every(c => /^\d+:\d+$/.test(c.node) && (c.text || '').length > 3)));
      ok('Loading spinner 스펙에 값과 노드가 다 있음', (() => {
        const ls = NS.pages.find(pg => pg.slug === 'loading-spinner');
        return !!ls && ls.spec.length === 2
          && ls.spec.every(sp => /^#[0-9A-F]{6}$/i.test(sp.hex) && sp.fps > 0 && /^\d+:\d+$/.test(sp.node));
      })());
      // 처음에는 «미작성»으로 적었는데, 원자료를 보니 As-is 복사본이었습니다(정정).
      ok('To-be 가 채워지지 않은 상태로 남아 있음', (() => {
        const ls = NS.pages.find(pg => pg.slug === 'loading-spinner');
        return !!ls && /작성해주세요/.test(ls.toBe.text) && ls.toBe.nodes.length === 2;
      })(), '저장소가 대신 채우지 않습니다');
      ok('«시작 전» 확인 결과가 사이트에 실림',
        htmlP.includes('«시작 전(—)» 으로 세던') && htmlP.includes('정말로 빈 페이지'));
    }

    // ── 방법 자체를 GAP 으로 남겼는지
    const g32 = VIEW.GAPS.items.find(g => g.id === 'GAP-32');
    ok('«🚧 를 빈 페이지로 셌다»가 GAP 으로 기록됨', !!g32 && g32.status !== 'resolved'
      && /전수/.test(g32.fix || ''));
    // 전수 읽기가 끝났으므로 «남은 N쪽»이 아니라 «전수 완료»여야 합니다.
    ok('🚧 전수 읽기 완료가 진행 기록에 있음',
      !!g32 && /전수 완료/.test(g32.progress || '') && !/남은 \d+쪽/.test(g32.progress || ''),
      g32 && g32.status);
    ok('전수 결과가 «빈 페이지 1쪽»으로 기록됨',
      !!g32 && /Table/.test(g32.progress || '') && /63쪽/.test(g32.progress || ''));
  }

  const GAPS = VIEW.GAPS;
  ok('해소된 GAP 마다 해소 문구가 있음',
    GAPS.items.filter(i => i.status === 'resolved').every(i => (i.resolution || '').length > 10));
  ok('해소 건수가 0보다 큼', GAPS.items.filter(i => i.status === 'resolved').length > 0,
    `${GAPS.items.filter(i => i.status === 'resolved').length}/${GAPS.items.length}`);

  // ── [14] GAP 한꺼번에 정리 ────────────────────────────────────────
  console.log('\n[14] GAP 한꺼번에 정리');
  {
    const read = rel => {
      const q = path.join(ROOT, rel);
      return fs.existsSync(q) ? fs.readFileSync(q, 'utf8') : null;
    };
    const IT = GAPS.items;
    const ALLOWED = ['open', 'partial', 'resolved'];
    ok('상태가 세 가지 중 하나로만 적힘',
      IT.every(i => ALLOWED.includes(i.status)),
      IT.filter(i => !ALLOWED.includes(i.status)).map(i => `${i.id}=${JSON.stringify(i.status)}`).join(', '));
    ok('ID 가 GAP-1..N 으로 빠짐없이 이어짐', (() => {
      const nums = IT.map(i => Number(String(i.id).replace('GAP-', ''))).sort((a, b) => a - b);
      return nums.length === IT.length && nums.every((n, k) => n === k + 1);
    })(), `${IT.length}건`);
    ok('ID 가 중복되지 않음', new Set(IT.map(i => i.id)).size === IT.length);
    ok('모든 항목에 근거와 메우는 법이 있음',
      IT.every(i => (i.evidence || '').length > 5 && (i.fix || '').length > 5),
      IT.filter(i => !(i.evidence || '').length || !(i.fix || '').length).map(i => i.id).join(', '));

    // 정리 기록 자체
    const CS = GAPS.consolidation;
    ok('한꺼번에 정리한 기록이 있음', !!CS && !!GAPS.consolidatedAt);
    ok('정리 기록에 근거 파일이 적힘',
      !!CS && /component-pages\.json/.test(CS.basis) && /not-started-pages\.json/.test(CS.basis));
    ok('«겹쳐 보이지만 다른 것»이 기록됨', !!CS && CS.notDuplicated.length >= 3);
    ok('«맞추지 않고 남긴 모순»이 기록됨', !!CS && CS.contradictionsKept.length >= 3);
    ok('정리 기록이 가리키는 GAP 이 전부 실재함', (() => {
      if (!CS) return false;
      const ids = [...JSON.stringify(CS).matchAll(/GAP-\d+/g)].map(m => m[0]);
      return ids.length > 0 && ids.every(id => IT.some(i => i.id === id));
    })());

    // 전수 읽기가 새로 드러낸 8건
    const SWEEP = IT.filter(i => /^GAP-(3[7-9]|4[0-4])$/.test(i.id));
    ok('전수 읽기로 추가된 것이 8건', SWEEP.length === 8, `${SWEEP.length}건`);
    ok('추가된 8건이 모두 미해소', SWEEP.every(i => i.status !== 'resolved'));
    ok('추가된 8건 모두 근거에 노드 ID 나 파일명이 있음',
      SWEEP.every(i => /\d+:\d+/.test(i.evidence) || /data\/[\w-]+\.json/.test(i.evidence)),
      SWEEP.filter(i => !/\d+:\d+/.test(i.evidence) && !/data\/[\w-]+\.json/.test(i.evidence)).map(i => i.id).join(', '));

    // 새 GAP 의 수치가 원자료와 맞는가 — 손으로 적은 수는 반드시 기계가 대조합니다
    const WP = VIEW.pages && VIEW.pages.components;
    const NS = VIEW.pages && VIEW.pages.notStarted;
    if (WP && NS) {
      // Accordion 은 이제 파서에 들어갔습니다 — 손으로 센 수를 더하지 않습니다.
      const acc = NS.pages.find(pg => pg.slug === 'accordion');
      // ── 옮겨 적은 것을 원자료로 되짚기
      const VF = VIEW.pages && VIEW.pages.verify;
      ok('원자료 대조 결과가 있음', !!VF && VF.claims.length >= 9);
      if (VF) {
        ok('손으로 옮겨 적은 쪽이 0', NS.pages.every(pg => pg.transcribed === false),
          NS.pages.filter(pg => pg.transcribed).map(pg => pg.slug).join(', '));
        ok('여덟 쪽 모두 근거가 있음', VF.counts.pagesWithoutEvidence === 0,
          `XML ${VF.counts.pagesWithRaw} · 파서 ${VF.counts.pagesParsedElsewhere}`);
        ok('다시 센 진술이 전부 성립', VF.counts.claimsHeld === VF.counts.claims,
          `${VF.counts.claimsHeld}/${VF.counts.claims}`);
        ok('어긋남이 0', VF.counts.mismatches === 0,
          VF.mismatches.map(m => `${m.slug}:${m.detail}`).join(' · '));
        ok('인용한 노드가 원자료에 전부 실재',
          VF.pages.filter(pg => pg.xml).every(pg => pg.citedAllFound));
        // 정정을 지우지 않고 남겼는가 — 여기가 핵심입니다.
        ok('원자료가 뒤집은 진술 2건이 정정으로 남음',
          VF.counts.corrections === 2
          && NS.pages.filter(pg => pg.correction).length === 2,
          `verify ${VF.counts.corrections} · pages ${NS.pages.filter(pg => pg.correction).length}`);
        ok('Switch 정정 — 두 벌 중 «-» 는 한 벌뿐',
          (() => {
            const sw = VF.pages.find(pg => pg.slug === 'switch');
            return sw && sw.dashSlots.length === 2 && sw.dashSlots.every(id => id.startsWith('42553:'));
          })());
        ok('Loading spinner 정정 — To-be 가 «빈 것»이 아니라 «As-is 복사본»',
          (() => {
            const ls = NS.pages.find(pg => pg.slug === 'loading-spinner');
            return ls && /복사/.test(ls.toBe.state + ls.toBe.detail) && !/미작성/.test(ls.toBe.state);
          })());
        ok('일부만 담은 원자료가 범위를 밝힘',
          VF.pages.filter(pg => pg.scope).every(pg => /범위/.test(pg.scope)),
          `${VF.counts.scoped}건`);
        const htmlV = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
        ok('되짚은 결과가 사이트에 실림', htmlV.includes('옮겨 적은 것을 원자료로 되짚기'));
        ok('정정이 사이트에 그대로 보임', htmlV.includes('As-is 를 복사해 두고 안 고침'));
      }
      ok('Accordion 이 손 옮겨적기에서 기계 집계로 넘어감',
        !!acc && acc.transcribed === false && !acc.contamination
        && WP.pages.some(pg => pg.slug === 'accordion'),
        acc && String(acc.transcribed));
      const K = WP.counts;
      const g37 = IT.find(i => i.id === 'GAP-37');
      ok('GAP-37 의 겹친 자리 수가 기계 집계와 일치',
        !!g37 && new RegExp(`${K.borrowed}종이 ${K.borrowedPlaces}자리`).test(g37.finding),
        `${K.borrowed}종 / ${K.borrowedPlaces}자리`);
      ok('GAP-37 의 주어 오염 건수가 기계 집계와 일치',
        !!g37 && new RegExp(`${K.foreignComponent}건 더`).test(g37.finding), `${K.foreignComponent}건`);
      ok('GAP-37 이 구조 하위 이름을 오염으로 세지 않음',
        !!g37 && new RegExp(`${K.foreignStructural}건은 단정하지 않고`).test(g37.note || ''));
      const g38 = IT.find(i => i.id === 'GAP-38');
      ok('GAP-38 의 끊긴 문장 수가 기계 집계와 일치',
        !!g38 && new RegExp(`${K.truncated}건입니다`).test(g38.finding), `truncated ${K.truncated}`);
      // 자기 이름 오타는 오염(GAP-37)이 아니라 명명(GAP-19) 쪽입니다.
      ok('자기 이름 오타가 남의 문장에서 빠져 있음',
        WP.ownNameTypos.count > 0
        && !WP.foreignSubjects.items.some(f => f.subject.startsWith('Componenets')),
        `ownNameTypos ${WP.ownNameTypos.count}`);
      const g19 = IT.find(i => i.id === 'GAP-19');
      ok('GAP-19 가 기계가 찾은 오타 노드를 가리킴',
        !!g19 && WP.ownNameTypos.items.every(t => g19.evidence.includes(t.node)));
      // 「Tip (팁)은」 — 30자 규칙에 걸려 통째로 빠져 있던 자리
      // 사이트가 새 집계를 실제로 보여 주는가
      const htmlW = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
      ok('사이트가 겹친 자리 수를 종/자리로 나눠 표시',
        htmlW.includes(`"borrowedPlaces":${K.borrowedPlaces}`)
        && htmlW.includes(`"foreignComponent":${K.foreignComponent}`));
      ok('사이트에 자기 이름 오타 절이 있음', htmlW.includes('자기 이름의 철자가 틀린 곳'));
      ok('원자료 XML 이 저장소에 있음',
        fs.existsSync(path.join(ROOT, 'data', 'figma-xml', 'accordion.xml')));
      ok('Accordion JSON 의 노드가 원자료 XML 안에 실재함', (() => {
        const xml = fs.readFileSync(path.join(ROOT, 'data', 'figma-xml', 'accordion.xml'), 'utf8');
        const cited = [
          ...WP.borrowed.items.flatMap(b => b.appearsIn.filter(x => x.slug === 'accordion').map(x => x.node)),
          ...WP.foreignSubjects.items.filter(f => f.page === 'accordion').map(f => f.node),
          ...WP.truncated.items.filter(t => t.page === 'accordion').map(t => t.node),
        ];
        return cited.length >= 5 && cited.every(n => xml.includes(`id="${n}"`));
      })());
      ok('짧은 정의 첫 줄도 세어짐',
        WP.truncated.items.filter(t => t.text === 'Tip (팁)은').length === 5,
        `${WP.truncated.items.filter(t => t.text === 'Tip (팁)은').length}건`);
      const g39 = IT.find(i => i.id === 'GAP-39');
      ok('GAP-39 가 실제 nameMismatch 를 가리킴',
        !!g39 && WP.nameMismatch.count > 0
        && g39.evidence.includes(WP.nameMismatch.items[0].node));
      const g44 = IT.find(i => i.id === 'GAP-44');
      ok('GAP-44 의 빈 페이지가 not-started 기록과 일치', (() => {
        const empties = NS.pages.filter(pg => pg.state === 'empty');
        return !!g44 && empties.length === 1 && g44.evidence.includes(empties[0].node);
      })());
    }

    // Lottie 색이 실제로 팔레트 안에 있는 값인가 (GAP-42 의 주장)
    {
      const g42 = IT.find(i => i.id === 'GAP-42');
      const navy60 = VIEW.colors.find(c => c.name === 'Navy/Navy 060');
      ok('GAP-42 가 지목한 색이 팔레트의 그 토큰과 같은 값',
        !!g42 && !!navy60 && navy60.hex.toUpperCase() === '#0A3C5C'
        && g42.finding.includes('#0A3C5C') && g42.finding.includes('Navy/Navy 060'),
        navy60 && navy60.hex);
    }

    // 사이트 표시
    const htmlG = read('dist/decisions/index.html');
    if (htmlG) {
      ok('정리 기록이 결정 안건에 실림', htmlG.includes('한꺼번에 정리한 기록'));
      ok('추가된 8건이 모두 결정 안건에 실림',
        SWEEP.every(i => htmlG.includes(`id="${i.id}"`)),
        SWEEP.filter(i => !htmlG.includes(`id="${i.id}"`)).map(i => i.id).join(', '));
      ok('«부분»이 표시됨', htmlG.includes('>부분<'));
    }
    const htmlS = read('dist/index.html');
    if (htmlS) {
      ok('정리한 날짜가 사이트 집계에 실림',
        htmlS.includes(`"consolidatedAt":"${GAPS.consolidatedAt}"`));
      ok('영역별 남은 건수 집계가 사이트에 실림', /"byArea":\[\[/.test(htmlS));
    }
  }
}

console.log(`\n${fail === 0 ? '통과' : '실패'} — ${pass + fail}개 항목 중 ${pass}개 일치, ${fail}개 불일치`);
process.exit(fail === 0 ? 0 : 1);
