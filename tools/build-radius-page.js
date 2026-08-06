'use strict';
/**
 * Radius — 🚧 페이지를 직접 읽습니다.
 *
 * 저장소는 이미 반경 7단계(4/8/10/12/16/20/원형)와 쓰임새 라벨을 갖고 있었습니다.
 * 페이지를 열어 보니 그 표 말고 세 가지가 더 있었습니다.
 *   ① 원본이 스스로 적어 둔 «바꿔야 함» 메모 — 10 단계를 8 또는 8/12 로 바꾸자는 것
 *   ② KRDS(대한민국 정부 디자인 시스템) 형태 가이드를 통째로 옮겨 붙인 프레임
 *   ③ 채우지 않은 문서화 템플릿 — Text field 템플릿을 복사해 놓고 문장이 끊겨 있습니다
 *
 * ②는 «다른 디자인 시스템»입니다. 우리가 뒤져 온 것이 아니라 원본 안에 붙어 있는 것이라
 * 있는 그대로 기록하되, GDS 값으로 편입하지 않습니다.
 *
 * 입력: data/figma-pages/radius-system.json
 * 출력: data/radius-page.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGE = require(path.join(ROOT, 'data', 'figma-pages', 'radius-system.json'));
const LIB = require(path.join(ROOT, 'data', 'gds-library.json'));
// build/tokens.js 는 require 만 해도 파일을 씁니다 — 읽기 전용 도구라 라이브러리 원자료를 직접 봅니다.
const LIB_RADIUS = Object.keys(LIB.variables.radiusUsage).map(Number).sort((a, b) => a - b);

const inFrame = name => PAGE.texts.filter(t => (t.in[0] || '') === name);

// ── ① 실사용 스케일 — «Radius» 프레임의 머리행(y=47)과 쓰임새행(y=91)을 x 로 짝짓습니다.
const R = inFrame('Radius');
const head = R.filter(t => t.y === 47 && /^\d+$/.test(t.text.trim()));
const use = R.filter(t => t.y === 91);
const scale = head.map(h => {
  const u = use.find(x => Math.abs(x.x - h.x) < 4);
  return { px: +h.text.trim(), usage: u ? u.text.trim() : null, x: h.x, node: h.id };
}).sort((a, b) => a.px - b.px);

// ── ② 원본이 적어 둔 미결 메모. 우리가 판단하지 않고 그대로 옮깁니다.
const PENDING = /변경|정의:|케이스/;
const pending = R.filter(t => PENDING.test(t.text) && t.text.length < 60)
  .map(t => ({ note: t.text.trim(), node: t.id, at: { x: t.x, y: t.y } }));

// ── ③ 외부 인용 프레임 — KRDS 형태 가이드.
const SG = inFrame('스타일가이드_형태');
const krdsSentence = SG.map(t => t.text).find(t => /정부가 주는 신뢰감/.test(t)) || null;
// Level / Usage / Container size / Radius size / Apply components 표를 «수준 이름»으로 자릅니다.
const LEVELS = ['Xsmall', 'Small', 'Medium', 'Large', 'Xlarge'];
const idx = LEVELS.map(l => SG.findIndex(t => t.text.trim() === l));
const krdsTable = LEVELS.map((name, i) => {
  if (idx[i] < 0) return null;
  const end = i + 1 < LEVELS.length && idx[i + 1] > 0 ? idx[i + 1] : SG.length;
  const rows = SG.slice(idx[i] + 1, end).map(t => t.text.trim());
  const pairs = [];
  for (let k = 0; k < rows.length - 1; k++) {
    if (/^\d+\*\d+$/.test(rows[k]) && /^\d+px( \(max\))?$/.test(rows[k + 1])) {
      pairs.push({ container: rows[k], radius: rows[k + 1] });
    }
  }
  return {
    level: name,
    usage: rows.find(r => /사용한다/.test(r)) || null,
    sizes: pairs,
    applyComponents: rows.find(r => /^[A-Z][A-Za-z]+( [A-Za-z-]+)+$/.test(r) && !/^\d/.test(r)) || null,
  };
}).filter(Boolean);

const krdsRadii = [...new Set(krdsTable.flatMap(l => l.sizes.map(s => parseInt(s.radius, 10))))]
  .sort((a, b) => a - b);

// ── ④ 우리 스케일과의 차이 — 편입하지 않되 무엇이 다른지는 적습니다.
const ours = LIB_RADIUS;
const onlyInKrds = krdsRadii.filter(p => !ours.includes(p));
const onlyInOurs = ours.filter(p => !krdsRadii.includes(p));

// ── ⑤ 문서화 템플릿 — 채우지 않은 채 Text field 것을 복사해 둔 상태입니다.
const DOC = inFrame('Foundation_Radius system');
const docTexts = DOC.map(t => t.text.trim());
const truncated = docTexts.filter(t => /^Radius system \(레디어스 시스템\)은$/.test(t));
const borrowed = docTexts.filter(t => /Text field|텍스트필드/.test(t));

const out = {
  $description: 'Radius system 🚧 페이지를 직접 읽은 결과입니다. 실사용 스케일 말고도 원본의 미결 메모와 외부 인용 프레임이 있었습니다.',
  generatedFrom: 'tools/build-radius-page.js ← data/figma-pages/radius-system.json · data/gds-library.json',
  source: PAGE.source,
  scale: {
    steps: scale,
    note: '머리행이 값, 아래 행이 쓰임새입니다. 이 표는 이미 data/gds-library.json 의 variables.radiusUsage 로 반영돼 있습니다.',
    matchesLibrary: JSON.stringify(scale.map(s => s.px)) === JSON.stringify(ours),
    libraryScale: ours,
  },
  pending: {
    why: '원본 캔버스에 디자이너가 적어 둔 미결 메모입니다. 우리가 판단할 것이 아니라 원본의 다음 결정입니다.',
    items: pending,
    reading: pending.length
      ? '10 단계를 8 또는 8/12 로 바꾸자는 메모가 여러 곳에 있습니다. 아직 바뀌지 않았으므로 토큰은 10 을 유지합니다.'
      : null,
  },
  externalQuote: {
    what: 'KRDS(대한민국 정부 디자인 시스템) 형태(Shape) 스타일 가이드를 프레임째 옮겨 붙여 두었습니다.',
    evidence: krdsSentence,
    verifiedAgainst: 'https://www.krds.go.kr/html/site/style/style_04.html (2026-08-06 대조 — 문장이 원문과 같습니다)',
    frame: '스타일가이드_형태',
    table: krdsTable,
    radiiInQuote: krdsRadii,
    ruleApplied: 'GDS 값으로 편입하지 않습니다. 원본 안에 있다는 사실만 기록합니다 — 우리 스케일의 근거는 Radius 프레임입니다.',
    diffVsOurs: { onlyInQuote: onlyInKrds, onlyInOurs },
    caution: 'KRDS 표준형은 최대 12px 인데 옮겨 적힌 표에는 14·20px 이 있습니다. 원문 그대로가 아니라 값을 바꿔 채운 칸이 섞여 있습니다.',
  },
  documentationFrame: {
    state: 'unfilled',
    why: 'Text field 문서화 템플릿을 복사해 두고 채우지 않았습니다.',
    truncatedSentences: truncated,
    borrowedFromTextField: [...new Set(borrowed)],
    stubCount: PAGE.counts.templateStubs,
  },
  counts: {
    steps: scale.length,
    pending: pending.length,
    krdsLevels: krdsTable.length,
    krdsRadii: krdsRadii.length,
    borrowed: [...new Set(borrowed)].length,
  },
};

// ── 무결성
if (scale.length !== 6) throw new Error(`Radius 프레임에서 읽은 단계가 6개가 아닙니다: ${scale.length}`);
if (scale.some(s => !s.usage)) throw new Error(`쓰임새가 안 붙은 단계가 있습니다: ${scale.filter(s => !s.usage).map(s => s.px).join(', ')}`);
if (!out.scale.matchesLibrary) {
  throw new Error(`페이지 스케일과 토큰 스케일이 다릅니다 — 페이지 ${scale.map(s => s.px).join('/')} · 토큰 ${ours.join('/')}`);
}
if (!krdsSentence) throw new Error('외부 인용 판정 근거 문장을 찾지 못했습니다 — 프레임 구조가 바뀌었는지 확인하세요');
if (krdsTable.length !== 5) throw new Error(`인용 표의 레벨이 5개가 아닙니다: ${krdsTable.length}`);

fs.writeFileSync(path.join(ROOT, 'data', 'radius-page.json'), JSON.stringify(out, null, 2) + '\n');

console.log('Radius 페이지 → data/radius-page.json');
console.log(`  실사용 스케일 ${scale.length}단계 — ${scale.map(s => `${s.px}(${s.usage})`).join(' · ')}`);
console.log(`  원본 미결 메모 ${pending.length}건`);
console.log(`  외부 인용 — KRDS 형태 가이드 ${krdsTable.length}레벨 · 값 ${krdsRadii.join('/')} (편입하지 않음)`);
console.log(`  문서화 템플릿 미작성 — Text field 문구 ${out.counts.borrowed}개가 그대로 남아 있음`);
