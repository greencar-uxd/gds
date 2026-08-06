'use strict';
/**
 * Text field — 🚧 페이지를 직접 읽습니다.
 *
 * 저장소는 이 컴포넌트를 «원본 대기»로 비워 두고 있었습니다. 목차에는 Input, 실제 페이지 이름은
 * Text field 라 이름이 어긋난다는 것만 기록해 둔 상태였습니다.
 * 페이지를 열어 보니 정의 · 유형 4가지 · 유형별 구조 · 스페이싱 값 · 변형 42종이 전부 있었습니다.
 *
 * 입력: data/figma-pages/text-field.json
 * 출력: data/textfield-page.json
 *
 * 지어내지 않는 규칙:
 *   · 문서화 템플릿의 Style 절은 Buttons 페이지 문장이 그대로 남아 있습니다. 그것을 Text field 의
 *     스타일 정의로 옮겨 적지 않습니다. «남의 문장이 남아 있다»로 기록합니다.
 *   · 변형 이름의 대소문자 흔들림(License/license)도 고치지 않고 셉니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGE = require(path.join(ROOT, 'data', 'figma-pages', 'text-field.json'));
const DOC_FRAME = 'Components_Text field';

const doc = PAGE.texts.filter(t => (t.in[0] || '') === DOC_FRAME).map(t => ({ ...t, text: t.text.trim() }));
const D = doc.map(t => t.text);

// ── ① 정의
const definition = D.find(t => /^Text Field \(텍스트필드\)는 사용자가/.test(t)) || null;

// ── ② 유형 4가지 — «➊ 이름 설명» 한 줄에 붙어 있습니다.
const MARKS = ['➊', '➋', '➌', '➍'];
const typeLine = /^([➊➋➌➍])\s*(.+?\))\s*(.+)$/;
const types = D.map(t => t.match(typeLine)).filter(Boolean)
  .map(m => ({ mark: m[1], name: m[2].trim(), summary: m[3].trim() }))
  .filter((v, i, a) => a.findIndex(x => x.mark === v.mark) === i);

// ── ③ 유형별 절 — «[➊ 이름]» 부터 다음 «[➋ …]» 전까지.
const secIdx = MARKS.map(m => D.findIndex(t => t.startsWith(`[${m} `)));
const PARTS = /^(Label|Hint text|Background|Icon|Password masking)\b/;
const sections = MARKS.map((mark, i) => {
  if (secIdx[i] < 0) return null;
  const end = i + 1 < MARKS.length && secIdx[i + 1] > 0 ? secIdx[i + 1] : D.length;
  const rows = D.slice(secIdx[i], end);
  return {
    mark,
    title: rows[0],
    描: undefined,
    desc: rows.find(r => /입니다\.|입력형입니다/.test(r) && r.length > 40) || null,
    parts: rows.filter(r => PARTS.test(r)),
    spacing: rows.filter(r => /^\d+$/.test(r)).map(Number),
    spacingLabelled: rows.includes('스페이싱 값'),
  };
}).filter(Boolean).map(s => { delete s.描; return s; });

// ── ④ 원본 결함 — ➍ 절의 설명문이 ➌ 절 것과 같습니다.
const defects = [];
const d3 = sections.find(s => s.mark === '➌');
const d4 = sections.find(s => s.mark === '➍');
if (d3 && d4 && d3.desc && d3.desc === d4.desc) {
  defects.push({
    id: 'TF-1',
    what: '➍ Area text field 절의 설명문이 ➌ Split text field 것과 글자 그대로 같습니다',
    evidence: d4.desc,
    why: '복사해 놓고 고쳐 쓰지 않은 것으로 보입니다. Area 유형의 설명은 페이지에 없는 셈입니다.',
    fix: '원본에서 고칠 일입니다. 저장소는 ➍ 의 설명을 «없음»으로 둡니다 — 지어내지 않습니다.',
  });
}

// ── ⑤ 원본 결함 — Style 절에 Buttons 페이지 문장이 그대로 남아 있습니다.
const buttonLeftovers = D.filter(t => /Default button|Icon button|Capsule button|Components\/Buttons\//.test(t));
if (buttonLeftovers.length) {
  defects.push({
    id: 'TF-2',
    what: `Style 절이 Buttons 페이지 내용 그대로입니다 (${buttonLeftovers.length}줄)`,
    evidence: buttonLeftovers.slice(0, 3),
    why: '문서화 템플릿을 Buttons 에서 복사해 오면서 Style 절을 바꾸지 않았습니다. Text field 의 스타일 정의는 이 페이지에 아직 없습니다.',
    fix: '저장소는 이 문장들을 Text field 의 스타일로 옮겨 적지 않습니다.',
  });
}

// ── ⑥ 토큰 이름 규칙 — 남의 절이지만 «3계층 이름 규칙»의 실례라 사실로는 남깁니다.
const tokenNaming = {
  note: 'Buttons 절이 남아 있어 읽힌 것입니다. Text field 의 값이 아니라 이름 규칙의 실례로만 씁니다.',
  examples: [...new Set(D.filter(t => /^(Components|Semantic)\//.test(t)))].sort(),
  shape: 'Components/<컴포넌트>/<유형>/<위계>  ←  Semantic/Color/Background/<채움>/<상태>',
};

// ── ⑦ 변형 — 42종. 축 이름이 «Property 1/2» 그대로라 무엇을 가르는지 이름만으로는 모릅니다.
const CS = PAGE.componentSets;
const axisNames = Object.keys(CS.axes);
const kinds = Object.keys(CS.axes['Property 1'] || {});
const states = Object.keys(CS.axes['Property 2'] || {});
if (axisNames.some(a => /^Property \d$/.test(a))) {
  defects.push({
    id: 'TF-3',
    what: `변형 축 이름이 «${axisNames.join(' · ')}» 로 남아 있습니다`,
    why: 'Figma 기본 이름 그대로라, 어느 축이 «유형»이고 어느 축이 «상태»인지 이름만 봐서는 알 수 없습니다. 값을 보고 유추할 뿐입니다.',
    fix: '원본에서 축 이름을 붙이는 일입니다. 저장소는 값으로 미루어 «유형 / 상태»로 읽되 그렇게 읽었다는 사실을 밝힙니다.',
  });
}
if (CS.caseCollisions.length) {
  defects.push({
    id: 'TF-4',
    what: `대소문자만 다른 변형 값이 있습니다 — ${CS.caseCollisions.map(c => c.forms.join(' / ')).join(' · ')}`,
    why: '같은 것을 두 가지로 적었습니다. 도구가 다른 값으로 셉니다.',
    fix: '원본에서 하나로 맞출 일입니다.',
  });
}

// 상태 축에 상태가 아닌 값이 섞였는지 — date/field/focus 는 나머지(Default/Typing/Focus Out/Error)와 결이 다릅니다.
const STATE_LIKE = /^(Default|Typing|Focus Out|Error|Timeout)$/;
const oddStates = states.filter(s => !STATE_LIKE.test(s));
if (oddStates.length) {
  defects.push({
    id: 'TF-5',
    what: `상태 축에 상태가 아닌 값이 섞여 있습니다 — ${oddStates.join(' · ')}`,
    why: `나머지 ${states.filter(s => STATE_LIKE.test(s)).join(' · ')} 과 결이 다릅니다. date 무리만 다른 축을 쓰고 있습니다.`,
    fix: '원본에서 date 무리의 축을 맞출 일입니다.',
  });
}

// ── ⑧ 이름 어긋남 — 목차는 Input, 페이지는 Text field.
const naming = {
  inToc: 'Input',
  pageName: PAGE.source.pageName,
  note: '구조도(목차)와 실제 페이지 이름이 다릅니다. 저장소는 페이지 이름을 씁니다.',
};

const out = {
  $description: 'Text field 🚧 페이지를 직접 읽은 결과입니다. «원본 대기»로 비워 두었던 자리에 정의·유형·구조·변형이 전부 있었습니다.',
  generatedFrom: 'tools/build-textfield-page.js ← data/figma-pages/text-field.json',
  correction: {
    at: '2026-08-06',
    what: 'Input(Text field)을 «원본이 아직 안 그려서 저장소가 먼저 만들 수 없다»고 적었던 것을 철회합니다.',
    howFound: '🚧 라는 표시만 보고 페이지를 열지 않았습니다. 열어 보니 문서화 템플릿이 절반 이상 채워져 있었습니다.',
  },
  source: PAGE.source,
  naming,
  definition,
  types,
  sections,
  variants: {
    total: CS.total,
    axisNames,
    kinds,
    states,
    readAs: '값으로 미루어 Property 1 = 유형, Property 2 = 상태로 읽었습니다. 원본이 축 이름을 붙여 두지 않았습니다.',
    items: CS.items,
  },
  tokenNaming,
  defects,
  stillEmpty: {
    why: '템플릿 칸은 있으나 채우지 않았거나 남의 내용이 들어 있는 자리입니다.',
    sections: ['Style — Buttons 내용이 그대로', 'Usage', '➍ Area text field 의 설명'],
    stubCount: PAGE.counts.templateStubs,
  },
  counts: {
    types: types.length,
    sections: sections.length,
    variants: CS.total,
    kinds: kinds.length,
    states: states.length,
    defects: defects.length,
    buttonLeftovers: buttonLeftovers.length,
  },
};

// ── 무결성
if (!definition) throw new Error('정의문을 찾지 못했습니다');
if (types.length !== 4) throw new Error(`유형이 4가지가 아닙니다: ${types.length}`);
if (sections.length !== 4) throw new Error(`유형별 절이 4개가 아닙니다: ${sections.length}`);
if (sections.some(s => !s.parts.length)) {
  throw new Error(`구조 항목이 비어 있는 절: ${sections.filter(s => !s.parts.length).map(s => s.mark).join(', ')}`);
}
if (CS.total !== CS.items.length) throw new Error('변형 수가 목록 길이와 다릅니다');
const declared = D.find(t => /(\d)가지 유형으로 구분합니다/.test(t));
if (declared && +declared.match(/(\d)가지/)[1] !== types.length) {
  throw new Error(`원본이 선언한 유형 수와 실제 나열이 다릅니다: ${declared}`);
}

fs.writeFileSync(path.join(ROOT, 'data', 'textfield-page.json'), JSON.stringify(out, null, 2) + '\n');

console.log('Text field 페이지 → data/textfield-page.json');
console.log(`  유형 ${types.length}가지 — ${types.map(t => t.name).join(' · ')}`);
console.log(`  유형별 구조 ${sections.length}절 · 변형 ${CS.total}종 (유형 ${kinds.length} × 상태 ${states.length})`);
console.log(`  원본 결함 ${defects.length}건 — ${defects.map(d => d.id).join(' · ')}`);
