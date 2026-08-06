'use strict';
/**
 * Elevation — 🚧 페이지를 직접 읽어 정의를 꺼냅니다.
 *
 * 2026-08-06 이전에는 «Elevation system 페이지가 🚧 이므로 정의가 없다»고 적었고,
 * 라이브러리 EFFECT 스타일 Elevation_1~6 만 인벤토리에 담았습니다.
 * 페이지를 열어 보니 레벨 정의·dp·그림자 수치·적용 범위·인용 출처가 전부 있었습니다.
 *
 * 입력: data/figma-pages/elevation-system.json (tools/parse-figma-page.js 산출)
 * 출력: data/elevation-page.json
 *
 * 규칙: 페이지에 적힌 것만 옮깁니다. 라이브러리 값과 어긋나면 «맞춘다»가 아니라 «어긋난다»로 적습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGE = require(path.join(ROOT, 'data', 'figma-pages', 'elevation-system.json'));
const EFFECTS = require(path.join(ROOT, 'data', 'effects.json'));

const T = PAGE.texts.map(t => t.text.trim());

// ── ① 레벨 표 — «Leverl N → Ndp» 다음 줄이 «X Y Blur Spread Color%» 입니다.
//    «Leverl» 은 원본 오타입니다. 고치지 않고 그대로 두되 표기 오류로 셉니다.
const LEVEL_RE = /^Le(?:ve|ver)rl?\s*(\d+)\s*→\s*(\d+)dp$/i;
const SHADOW_RE = /^(-?\d+)\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s+(\d+)%$/;

const levels = [];
const seen = new Set();
for (let i = 0; i < PAGE.texts.length - 1; i++) {
  const m = PAGE.texts[i].text.trim().match(LEVEL_RE);
  if (!m) continue;
  const s = PAGE.texts[i + 1].text.trim().match(SHADOW_RE);
  if (!s) continue;
  const level = +m[1];
  if (seen.has(level)) continue;      // 같은 표가 페이지에 여러 번 그려져 있습니다
  seen.add(level);
  levels.push({
    level,
    dp: +m[2],
    x: +s[1], y: +s[2], blur: +s[3], spread: +s[4], alphaPct: +s[5],
    css: `${s[1]}px ${s[2]}px ${s[3]}px ${s[4]}px rgba(0, 0, 0, ${(+s[5] / 100).toFixed(2)})`,
    node: PAGE.texts[i].id,
    labelInSource: PAGE.texts[i].text.trim(),
  });
}
levels.sort((a, b) => a.level - b.level);

// ── ② 별도 지정 — 표준 스케일 밖의 한 건.
const extraIdx = PAGE.texts.findIndex(t => /^0 0 6 0 15%$/.test(t.text.trim()));
const extra = extraIdx < 0 ? null : {
  value: PAGE.texts[extraIdx].text.trim(),
  css: '0px 0px 6px 0px rgba(0, 0, 0, 0.15)',
  node: PAGE.texts[extraIdx].id,
  label: T.find(t => /^Bottom Sheet .*버튼$/.test(t)) || null,
  why: '페이지가 «표준 / 별도 지정» 두 칸으로 나눠 그렸고, 이 값은 별도 지정 칸에 있습니다.',
};

// ── ③ 레벨 0 — 그림자가 없는 배경 레벨. 표에는 수치 행이 없습니다.
const level0 = T.some(t => /^Level 0$/.test(t)) ? {
  level: 0,
  dp: 0,
  shadow: null,
  role: T.find(t => /^\[Background \(배경\)\]$/.test(t)) ? 'Background (배경)' : null,
  desc: T.find(t => /가장 기본 배경으로/.test(t)) || null,
  why: '표에 수치 행이 없습니다 — 그림자가 없는 레벨이라 X/Y/Blur 를 적을 것이 없습니다.',
} : null;

// ── ④ 레벨별 역할 설명 — [..] 대괄호 제목과 바로 뒤 설명문이 짝입니다.
const roles = [];
for (let i = 0; i < T.length - 1; i++) {
  const m = T[i].match(/^\[(.+)\]$/);
  if (!m) continue;
  const prev = T[i - 1] || '';
  if (!/^Level \d$/.test(prev)) continue;
  roles.push({ level: +prev.split(' ')[1], role: m[1], desc: T[i + 1] || null });
}

// ── ⑤ 표현 방법 · 적용 범위 · 인용 출처
const method = T.find(t => /그림자\(1\)/.test(t)) || null;
const applications = T.filter(t => /^적용 ?범위:/.test(t)).map(t => {
  const m = t.match(/^적용 ?범위:\s*(.+?)\s{2,}Level (\d)\s*\((\d+)dp\)$/);
  return m ? { target: m[1].trim(), level: +m[2], dp: +m[3], raw: t } : { raw: t };
});
const citation = T.find(t => /m3\.material\.io/.test(t)) || null;
const citedText = T.find(t => /^머티리얼은 6단계의 높이를 사용하며/.test(t)) || null;
const workNote = T.find(t => /엘리베이션 시스템 정의 완료/.test(t)) || null;

// ── ⑥ 라이브러리와 대조 — 여기서 «맞추지» 않습니다. 어긋나는 것을 적습니다.
const libElev = (EFFECTS.items || []).filter(i => i.axis === 'elevation');
const conflicts = [];
if (libElev.length !== levels.length) {
  conflicts.push({
    id: 'EP-1',
    what: '개수가 다릅니다',
    page: `Level 1~${levels.length} (${levels.length}단계) + Level 0(그림자 없음)`,
    library: `${libElev.map(i => i.name).join(' · ')} (${libElev.length}종)`,
    why: '페이지는 그림자 있는 레벨을 5단계로 정의했고, 라이브러리에는 EFFECT 스타일이 6종 published 돼 있습니다. '
      + '어느 스타일이 어느 레벨인지 원본이 대응표를 적어 두지 않았습니다.',
    decided: false,
  });
}
const measured = libElev.filter(i => i.css);
for (const m of measured) {
  const n = +(m.name.match(/(\d+)$/) || [])[1];
  const lv = levels.find(l => l.level === n);
  if (!lv) continue;
  if (m.css !== lv.css) {
    conflicts.push({
      id: `EP-2-${n}`,
      what: `${m.name} 의 실측값이 페이지 표와 다릅니다`,
      page: `${lv.css} (Level ${lv.level} · ${lv.dp}dp)`,
      library: m.css,
      why: '이름의 숫자만 보고 레벨을 맞춘 비교입니다. 대응표가 없으므로 이 비교 자체가 가정 위에 있습니다. '
        + '라이브러리 쪽은 2겹이고 페이지 표는 1겹이라, 같은 것을 다르게 적은 것인지 다른 것인지 원본이 말해 주지 않습니다.',
      decided: false,
    });
  }
}

// 별도 지정 값이 이미 방출 중인 Bottom Sheet 효과 안에 있는지 — 있으면 페이지가 그 3겹을 뒷받침합니다.
const bs = (EFFECTS.items || []).find(i => i.name === 'Bottom Sheet');
const extraCorroborates = !!(extra && bs && bs.css && /0px 0px 6px 0px/.test(bs.css));

// ── ⑦ 원본 표기 오류 — 고치지 않고 셉니다.
const typos = [];
const leverl = PAGE.texts.filter(t => /Leverl/.test(t.text));
if (leverl.length) typos.push({ found: 'Leverl', should: 'Level', count: leverl.length, nodes: leverl.map(t => t.id) });
const spreas = PAGE.texts.filter(t => /^Spreas$/.test(t.text.trim()) || /\bSpreas\b/.test(t.text));
if (spreas.length) typos.push({ found: 'Spreas', should: 'Spread', count: spreas.length, nodes: spreas.map(t => t.id) });

const out = {
  $description: 'Elevation system 🚧 페이지를 직접 읽은 결과입니다. 라이브러리 EFFECT 스타일 목록에는 없던 정의·dp·적용 범위가 여기 있습니다.',
  generatedFrom: 'tools/build-elevation-page.js ← data/figma-pages/elevation-system.json · data/effects.json',
  correction: {
    at: '2026-08-06',
    what: '«Elevation system 페이지가 🚧 라 정의가 없다»고 적었던 것을 철회합니다. 페이지에 레벨 정의·수치·적용 범위가 전부 있습니다.',
    howFound: '등록된 스타일 목록이 아니라 페이지를 직접 열었습니다.',
  },
  source: PAGE.source,
  definition: T.find(t => /^Elevation \(엘리베이션\)은/.test(t)) || null,
  method,
  methodAxes: T.filter(t => /^➊ 그림자$|^➋ 딤 레이어$/.test(t)).map(t => t.replace(/^[➊➋]\s*/, '')),
  levels,
  level0,
  roles,
  extra,
  extraCorroborates,
  applications,
  reference: {
    citation,
    citedText,
    why: '원본이 스스로 밝힌 인용입니다. 우리가 다른 디자인 시스템을 뒤져 온 것이 아닙니다.',
  },
  workNote,
  conflicts,
  typos,
  stillEmpty: {
    why: '페이지에 칸은 있으나 «설명글»·«레벨 값» 문구 그대로 남아 있는 자리입니다. 채워진 것으로 세면 안 됩니다.',
    sections: ['[레벨_색상]', '[레벨_딤 레이어]', '[레벨_스트로크]', 'Usage — Select · Tip · Modal · Info box'],
    stubCount: PAGE.counts.templateStubs,
  },
  counts: {
    levels: levels.length,
    roles: roles.length,
    applications: applications.length,
    conflicts: conflicts.length,
    typos: typos.reduce((a, t) => a + t.count, 0),
  },
};

// ── 무결성
if (!levels.length) throw new Error('레벨 표를 읽지 못했습니다 — 파서가 페이지 구조를 놓쳤습니다');
if (levels.some(l => l.alphaPct !== 30)) throw new Error('표준 레벨의 알파가 30% 가 아닌 것이 있습니다 — 확인 필요');
for (let i = 0; i < levels.length; i++) {
  if (levels[i].level !== i + 1) throw new Error(`레벨 번호가 연속이 아닙니다: ${levels.map(l => l.level).join(',')}`);
}
if (!out.definition) throw new Error('정의문을 찾지 못했습니다');
if (!applications.length) throw new Error('적용 범위를 찾지 못했습니다');

fs.writeFileSync(path.join(ROOT, 'data', 'elevation-page.json'), JSON.stringify(out, null, 2) + '\n');

console.log('Elevation 페이지 → data/elevation-page.json');
console.log(`  레벨 ${levels.length}단계 — ${levels.map(l => `L${l.level} ${l.dp}dp`).join(' · ')}${level0 ? ' (+ Level 0 그림자 없음)' : ''}`);
console.log(`  적용 범위 ${applications.length}건 · 역할 설명 ${roles.length}건 · 별도 지정 ${extra ? 1 : 0}건${extraCorroborates ? ' (Bottom Sheet 3겹의 셋째 겹과 일치)' : ''}`);
console.log(`  라이브러리와 어긋남 ${conflicts.length}건 · 원본 표기 오류 ${out.counts.typos}건`);
