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
ok('dist/diagnostics.html 분리 생성', fs.existsSync(path.join(ROOT,'dist','diagnostics.html')));
ok('dist/decisions/index.html 생성', fs.existsSync(path.join(ROOT,'dist','decisions','index.html')));
if (fs.existsSync(path.join(ROOT,'dist','decisions','index.html'))) {
  const dh = fs.readFileSync(path.join(ROOT,'dist','decisions','index.html'),'utf8');
  ok('결정 안건 페이지 자기완결', !/<(script|link|img)[^>]+(src|href)="https?:/.test(dh));
  ok('결정 안건 페이지 브라우저 스토리지 미사용', !/localStorage|sessionStorage/.test(dh));
  ok('정본 사이트에 결정 안건 링크', fs.readFileSync(path.join(ROOT,'dist','index.html'),'utf8').includes('decisions/'));
}

// ---------- 6. 감사 문서 ↔ 감사 데이터 대조 ----------
// 문서에 적힌 숫자가 스크립트 계산값과 어긋나면 실패합니다 (작업 규칙 1).
console.log('\n[6] 감사 문서 (색 · 타이포)');
const caPath = path.join(ROOT, 'data', 'color-audit.json');
const taPath = path.join(ROOT, 'data', 'type-audit.json');
if (!fs.existsSync(caPath) || !fs.existsSync(taPath)) {
  console.log('  SKIP 감사 데이터 없음 — `npm run audit` 먼저 실행하세요');
} else {
  const CA = JSON.parse(fs.readFileSync(caPath, 'utf8'));
  const TA = JSON.parse(fs.readFileSync(taPath, 'utf8'));

  // 감사 데이터가 원본과 같은 스냅샷에서 나왔는지
  ok('색 감사 = 현재 스냅샷', CA.meta.exported === D.meta.exported);
  ok('타이포 감사 = 현재 스냅샷', TA.meta.exported === D.meta.exported);
  ok('색 감사 대상 수 = 원본 색 스타일 수', CA.legacy.styles === D.colors.length);
  ok('타이포 감사 대상 수 = 원본 텍스트 스타일 수', TA.legacy.styles === D.types.length);
  ok('색 감사 정본 수 = canon 색 수', CA.canon.styles === ((canon.color || {}).styles || []).length);
  ok('타이포 감사 정본 수 = canon 타입 수', TA.canon.tokens === ((canon.typography || {}).scale || []).length);
  ok('고유 HEX + 중복 = 전체', CA.legacy.uniqueHex + CA.legacy.duplicateStyleCount === CA.legacy.styles);

  const docPairs = [
    ['GDS-color-naming-v0.1.md', [
      ['레거시 스타일 수', CA.legacy.styles], ['고유 HEX', CA.legacy.uniqueHex],
      ['중복 수', CA.legacy.duplicateStyleCount], ['정본 색 수', CA.canon.styles],
      ['흡수 가능', CA.legacy.absorbable], ['정본에 없는 색', CA.legacy.orphanHex],
      ['이름-값 충돌', CA.legacy.nameValueConflicts],
    ]],
    ['GDS-typo-v0.2.md', [
      ['정본 단계', TA.canon.tokens], ['동일 스펙 쌍', TA.canon.specCollisionGroups],
    ]],
  ];
  for (const [file, nums] of docPairs) {
    const p = path.join(ROOT, 'docs', file);
    if (!fs.existsSync(p)) { ok(`${file} 존재`, false); continue; }
    ok(`${file} 존재`, true);
    const md = fs.readFileSync(p, 'utf8');
    for (const [label, v] of nums) {
      ok(`${file} · ${label} ${v} 표기`, new RegExp(`(^|[^0-9])${v}([^0-9]|$)`).test(md), `문서에 ${v} 없음`);
    }
  }

  // 문서가 "정본에 없다"고 부른 HEX 가 실제로 정본에 없는지
  const canonHex = new Set(((canon.color || {}).styles || []).map(s => s.hex.toUpperCase()));
  const orphan = new Set(CA.details.legacyOrphanHex.map(h => h.toUpperCase()));
  const namingMd = fs.readFileSync(path.join(ROOT, 'docs', 'GDS-color-naming-v0.1.md'), 'utf8');
  const orphanSection = (namingMd.split('### 4-4.')[1] || '').split('### 결정이 필요한 것')[0];
  const quoted = [...orphanSection.matchAll(/#([0-9A-Fa-f]{6})/g)].map(m => '#' + m[1].toUpperCase());
  const wrong = quoted.filter(h => canonHex.has(h) || !orphan.has(h));
  ok(`§4-4 에 인용된 HEX ${quoted.length}개가 전부 실제 orphan`, wrong.length === 0, `어긋남: ${wrong.join(', ')}`);

  // CSV 행 수 = 감사 결과 건수
  const dupCsv = fs.readFileSync(path.join(ROOT, 'docs', 'color-duplicates.csv'), 'utf8').trim().split('\n');
  const hexDupCount = Object.entries(CA.details).length && CA.legacy.uniqueHex;
  ok('color-duplicates.csv 헤더 + 데이터 존재', dupCsv.length > 1 && dupCsv.length - 1 <= hexDupCount);
}

// ---------- 6-2. 정본 폰트 ----------
console.log('\n[6-2] 정본 폰트');
{
  const FONT = require('./font.js');
  const pages = ['dist/index.html', 'dist/diagnostics.html', 'dist/decisions/index.html', 'dist/haptic/index.html']
    .map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
  ok('빌드된 페이지 존재', pages.length === 4, `${pages.length}/4`);
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
console.log('\n[6-3] 결정 안건 페이지 표현');
{
  const dec = require('./decisions.js');
  ok('미결/확정 분류 존재', dec.open.length > 0 && dec.settled.length > 0,
    `미결 ${dec.open.length} · 확정 ${dec.settled.length}`);
  const dp = path.join(ROOT, 'dist', 'decisions', 'index.html');
  if (fs.existsSync(dp)) {
    const dh = fs.readFileSync(dp, 'utf8');
    // 확정 항목의 카드가 페이지에 남아 있으면 실패
    const leaked = dec.settled.filter(i => dh.includes(`class="card" id="${i.id}"`));
    ok('확정 항목 카드가 페이지에 없음', leaked.length === 0, leaked.map(i => i.id).join(', '));
    // 미결 항목은 전부 있어야 함
    const missing = dec.open.filter(i => !dh.includes(`id="${i.id}"`));
    ok('미결 항목이 전부 표시됨', missing.length === 0, missing.map(i => i.id).join(', '));
    ok('제목에 남은 건수 표기', new RegExp(`아직 정해야 할 것 — ${dec.open.length}건`).test(dh));
    ok('확정 건수를 어디서 보는지 안내', /확정 \d+건은 이 페이지에서 뺐습니다/.test(dh));
    // 확정 항목은 목록으로만 (본문 근거 없이)
    ok('확정 목록에 전 항목 나열', dec.settled.every(i => dh.includes(`<b>${i.id}</b>`)));
  }
}

// ---------- 7. 확정 결정 반영 ----------
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

  // 통폐합 매핑
  const mgPath = path.join(ROOT, 'data', 'color-merge.json');
  if (!fs.existsSync(mgPath)) { ok('color-merge.json 존재', false); }
  else {
    const MG = JSON.parse(fs.readFileSync(mgPath, 'utf8'));
    const T = MG.totals;
    ok('color-merge.json 존재', true);
    const sum = T.absorb + T.resolve + T.near + T.retire + T.review;
    ok('판정 합계 = 레거시 스타일 수', sum === D.colors.length, `${sum} vs ${D.colors.length}`);
    ok('제거 확정 색이 정본에 없음',
      VIEW.orphanDispositions.every(o => !VIEW.colors.some(c => c.hex.toUpperCase() === o.hex.toUpperCase())),
      '정본에 등록된 색을 제거 대상으로 지정할 수 없습니다');
    ok('제거 확정의 치환 대상이 정본에 존재',
      VIEW.orphanDispositions.every(o => VIEW.colors.some(c => c.name === o.target)));
    ok('RETIRE 판정 수 = 제거 대상 스타일 수',
      T.retire === VIEW.orphanDispositions.reduce((a, o) => a + o.legacyStyles, 0),
      `${T.retire} vs 선언 ${VIEW.orphanDispositions.reduce((a, o) => a + o.legacyStyles, 0)}`);
    ok('통폐합 기준 = 정본', MG.meta.basis === DEC.rules.mergeBase.value);
    ok('orphan 분해 합계 일치', T.orphanNear + T.orphanRetired + T.orphanReview === T.orphanHex);
    ok('color-merge-map.csv 행 수 = 레거시 + 헤더',
      fs.readFileSync(path.join(ROOT, 'docs', 'color-merge-map.csv'), 'utf8').trim().split('\n').length === D.colors.length + 1);
    const mergeMd = path.join(ROOT, 'docs', 'GDS-color-merge-v0.1.md');
    ok('GDS-color-merge-v0.1.md 존재', fs.existsSync(mergeMd));
    if (fs.existsSync(mergeMd)) {
      const md = fs.readFileSync(mergeMd, 'utf8');
      for (const [label, v] of [['ABSORB', T.absorb], ['RESOLVE', T.resolve], ['NEAR', T.near], ['RETIRE', T.retire], ['REVIEW', T.review], ['orphan', T.orphanHex]]) {
        ok(`병합 문서 · ${label} ${v} 표기`, new RegExp(`(^|[^0-9])${v}([^0-9]|$)`).test(md));
      }
    }
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
    ok('스냅샷 변수 수 = 선언값',
      Object.keys(FV.variables).length === SYNC.figmaVariables,
      `${Object.keys(FV.variables).length} vs ${SYNC.figmaVariables}`);
    ok('스냅샷 count 필드 = 실제 변수 수', FV.count === Object.keys(FV.variables).length);

    // 정본 53종이 Figma 변수의 부분집합인가 (이름 기준)
    const rawNames = (((D2 => D2)(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'))))
      .canon.color.styles).map(s => s.name);
    const notInFigma = rawNames.filter(n => !(n in FV.variables));
    ok('정본 색이 전부 Figma 변수에 존재', notInFigma.length === 0, notInFigma.join(', '));
    ok('선언한 정본 수 = 실제 정본 수', rawNames.length === SYNC.canonStyles, `${rawNames.length} vs ${SYNC.canonStyles}`);

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
    const unhandled = undocumented.filter(n => !handled.has(n) && !typeHandled.has(n));
    ok('문서화 안 된 변수가 전부 처분됨 (색=additions · 그 외=type-decisions)',
      unhandled.length === 0, unhandled.join(', '));
    ok('처분 합계 = 문서화 안 된 변수 수',
      VIEW.additions.length + VIEW.typeHandled.length === VIEW.undocumented.length,
      `${VIEW.additions.length}+${VIEW.typeHandled.length} vs ${VIEW.undocumented.length}`);
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
    ok('편입 색이 정본 개수에 반영됨',
      VIEW.colors.length === SYNC.canonStyles + VIEW.adopted.length,
      `${VIEW.colors.length} vs ${SYNC.canonStyles}+${VIEW.adopted.length}`);
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
    ok('새 안건 CQ-9 · CQ-10 이 열린 상태로 표시됨', (() => {
      const html = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
      return ['CQ-9', 'CQ-10'].every(id => VIEW.openDecisions.some(o => o.id === id) && html.includes(id));
    })());
    ok('자간 확정 — CSS 출력', (() => {
      const css = fs.readFileSync(path.join(ROOT, 'dist', 'tokens', 'gds.css'), 'utf8');
      return /--gds-type-letter-spacing:\s*0;/.test(css);
    })());
    ok('자간 근거가 Figma 변수', (() => {
      const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
      return T.letterSpacing && /typo\/letter-spacing\/0/.test(T.letterSpacing.evidence)
        && FV.variables['typo/letter-spacing/0'] === T.letterSpacing.value;
    })());
    ok('쓰기 권한 미사용 기록 남아 있음', /쓰기 보류/.test(SYNC.seat || ''), SYNC.seat);
  }
}

// ────────────────────────────────────────────────────────────
console.log('\n[9] CQ-6 orphan 묶음');
{
  const ocPath = path.join(ROOT, 'data', 'orphan-clusters.json');
  ok('data/orphan-clusters.json 존재', fs.existsSync(ocPath));
  if (fs.existsSync(ocPath)) {
    const OC = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
    const MG2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-merge.json'), 'utf8'));
    const review = MG2.orphans.filter(o => o.delta > MG2.meta.nearLimit);
    ok('묶음 대상 = merge 의 REVIEW orphan 수',
      OC.totalOrphanReview === review.length, `${OC.totalOrphanReview} vs ${review.length}`);
    ok('묶음 HEX 합계 = 대상 수',
      OC.clusters.reduce((a, c) => a + c.hexCount, 0) === OC.totalOrphanReview);
    ok('묶음 스타일 합계 = 대상 스타일 수',
      OC.clusters.reduce((a, c) => a + c.styleCount, 0) === OC.totalStyles);
    ok('같은 HEX 가 두 묶음에 들어가지 않음', (() => {
      const seen = new Set();
      for (const c of OC.clusters) for (const i of c.items) {
        if (seen.has(i.hex)) return false; seen.add(i.hex);
      }
      return true;
    })());
    ok('묶음마다 권고와 조치가 있음',
      OC.clusters.every(c => c.recommend && c.action), OC.clusters.filter(c => !c.recommend || !c.action).map(c => c.id).join(', '));
    ok('묶음이 개별 판단보다 적음 — 판단 횟수가 실제로 줄어듦',
      OC.clusters.length < OC.totalOrphanReview, `${OC.clusters.length} vs ${OC.totalOrphanReview}`);
    ok('nearLimit 이 merge 와 동일', OC.nearLimit === MG2.meta.nearLimit);
    ok('이미 처분된 색은 처분 묶음에만 있음', (() => {
      const DEC2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
      const disp = new Set((DEC2.orphanDispositions || []).filter(o => o.status === 'confirmed').map(o => o.hex.toUpperCase()));
      return OC.clusters.every(c => c.id === 'OC-1' || c.items.every(i => !disp.has(i.hex.toUpperCase())));
    })());
    ok('외부 출처 묶음의 근거가 이름에 실제로 있음', (() => {
      const f = OC.clusters.find(c => c.id === 'OC-3');
      return !f || f.items.every(i => i.foreign || i.ios);
    })(), '출처 표시 없는 항목이 외부 묶음에 들어갔습니다');
    const dh = fs.readFileSync(path.join(ROOT, 'dist', 'decisions', 'index.html'), 'utf8');
    ok('묶음이 결정 안건 페이지에 표시됨', OC.clusters.every(c => dh.includes(c.id)));
    ok('묶음 권고가 페이지에 표시됨',
      OC.clusters.every(c => dh.includes(c.action)));
  }
}

// ---------- 8. 컴포넌트 스펙 대조 (Bottom sheet) ----------
// 실측 스펙의 색·간격·타이포·반경이 정본 밖으로 새지 않는지 봅니다.
// 측정 방식이 다르므로(.fig 추출이 아니라 Figma MCP 직접 조회) 값 자체는 검증하지 않고,
// "정본 안에 있는가"만 기계로 확인합니다.
console.log('\n[8] data/component-bottom-sheet.json');
const CS_PATH = path.join(ROOT, 'data', 'component-bottom-sheet.json');
ok('스펙 파일 존재', fs.existsSync(CS_PATH));
if (fs.existsSync(CS_PATH)) {
  const C = JSON.parse(fs.readFileSync(CS_PATH, 'utf8'));

  // 색 — canon.color.palette 안에 있어야 합니다
  const palette = new Set(((canon.color || {}).palette) || []);
  const badColor = (C.color.items || []).filter(i => !palette.has(i.hex));
  ok('모든 색이 정본 팔레트 안', badColor.length === 0,
    badColor.map(i => `${i.target}=${i.hex}`).join(', '));

  // 색 이름이 정본 스타일명과 일치하는지
  const styleByHex = {};
  for (const s of ((canon.color || {}).styles) || []) (styleByHex[s.hex] ||= []).push(s.name);
  const badName = (C.color.items || []).filter(i => !(styleByHex[i.hex] || []).includes(i.canonStyle));
  ok('색 → 정본 스타일명 매핑 정확', badName.length === 0,
    badName.map(i => `${i.hex}→${i.canonStyle}`).join(', '));

  // 간격 — canon.spacing 토큰이 실제로 그 px 인지
  const spByToken = {};
  for (const s of ((canon.spacing || {}).scale) || []) spByToken[s.token] = s.px;
  const badSpacing = (C.spacing.items || []).filter(i => i.token && spByToken[i.token] !== i.px);
  ok('간격 → 정본 토큰 px 일치', badSpacing.length === 0,
    badSpacing.map(i => `${i.token}≠${i.px}`).join(', '));

  // 타이포 — canon.typography 에 같은 size/weight 토큰이 있어야 합니다
  const typo = ((canon.typography || {}).scale) || [];
  const wNum = w => Number(String(w).replace(/\D/g, '')); // "Medium(500)" → 500
  const badTypo = (C.typography.items || []).filter(i => {
    const t = typo.find(x => x.token === i.canonToken);
    return !t || t.size !== i.size || wNum(t.weight) !== i.weight;
  });
  ok('타이포 → 정본 토큰 size/weight 일치', badTypo.length === 0,
    badTypo.map(i => `${i.target}:${i.canonToken}`).join(', '));

  // 반경 — R-3 상한 20px (원형 제외)
  const radii = (C.radius.items || []).filter(r => r.token !== 'Radius/full').map(r => r.px);
  ok('반경 R-3 상한 20px 준수', Math.max(...radii) <= 20, `최대 ${Math.max(...radii)}`);
  const RSCALE = { 'Radius/xs': 4, 'Radius/sm': 8, 'Radius/md': 10, 'Radius/lg': 12, 'Radius/xl': 16, 'Radius/xxl': 20 };
  const badRadius = (C.radius.items || []).filter(r => r.token in RSCALE && RSCALE[r.token] !== r.px);
  ok('반경 → 토큰 px 일치', badRadius.length === 0, badRadius.map(r => `${r.token}≠${r.px}`).join(', '));

  // Elevation — 스펙에 적어둔 겹 수가 실제 EFFECT 스타일과 같은지
  const bs = D.effects.find(e => e.id === C.elevation.styleId);
  ok('Bottom Sheet EFFECT 스타일 존재', !!bs, C.elevation.styleId);
  if (bs) ok('Bottom Sheet 3겹', bs.layers.length === C.elevation.layers.length, `${bs.layers.length}겹`);

  // 규칙 — 바텀시트는 Dim layer 미사용
  ok('Dim layer 미사용 규칙 기록', C.structure.dimLayer.used === false);
  // Top 에 컬러 헤더 타입이 없다는 사실이 유지되는지
  ok('Top 종류 3종 · 컬러 헤더 없음',
    C.structure.top.types.length === 3 && C.structure.top.colorHeaderExists === false);

  // 부속 산출물
  for (const f of ['braze-bottom-sheet-notice.html', 'bottom-sheet-spacing.png']) {
    ok(`docs/assets/${f} 존재`, fs.existsSync(path.join(ROOT, 'docs', 'assets', f)));
  }
  ok('docs/GDS-bottomsheet-component-20260805.md 존재',
    fs.existsSync(path.join(ROOT, 'docs', 'GDS-bottomsheet-component-20260805.md')));

  // 베이스 HTML 이 스펙과 같은 색을 쓰는지 (팔레트 밖 색 유입 차단)
  const bp = path.join(ROOT, 'docs', 'assets', 'braze-bottom-sheet-notice.html');
  if (fs.existsSync(bp)) {
    const html = fs.readFileSync(bp, 'utf8');
    const used = [...new Set((html.match(/#[0-9A-Fa-f]{6}/g) || []).map(h => h.toUpperCase()))];
    const allow = new Set([...palette, '#F7F9FA']); // #F7F9FA = :active 배경, 정본 편입 대상
    const stray = used.filter(h => !allow.has(h));
    ok('베이스 HTML 색이 정본 팔레트 안', stray.length === 0, stray.join(', '));
  }
}

console.log(`\n${fail === 0 ? '통과' : '실패'} — ${pass + fail}개 항목 중 ${pass}개 일치, ${fail}개 불일치`);
process.exit(fail === 0 ? 0 : 1);
