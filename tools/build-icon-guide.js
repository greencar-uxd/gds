'use strict';
/**
 * 아이콘 제작 가이드라인 — 원본 Icon system 페이지에서 꺼냅니다.
 *
 * 2026-08-06 두 번째 정정.
 *   첫 번째 정정에서 «페이지를 직접 읽었다»고 했지만, 실제로 읽은 것은 컴포넌트 «이름»뿐이었습니다.
 *   tools/parse-icon-page.js 가 Icon/system/* 노드 이름만 훑었기 때문입니다.
 *   그래서 «아이콘 그리드가 원본에 없다»고 적고 레퍼런스로 메웠는데, 강민관이 «그리드 그려져 있다»고
 *   확인해 주어 페이지를 통째로(tools/parse-figma-page.js) 다시 읽었습니다.
 *   00_Size ~ 08_Color 여덟 절짜리 제작 가이드라인이 통째로 있었습니다.
 *
 * 교훈: «페이지를 읽었다»는 것은 노드 이름을 훑는 것이 아니라 본문 텍스트를 읽는 것입니다.
 *
 * 입력: data/figma-pages/icon-system-full.json (tools/parse-figma-page.js 산출)
 * 출력: data/icon-guide.json
 *
 * 지어내지 않는 규칙: 원본 문장을 그대로 옮기고 오타도 고치지 않습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGE = require(path.join(ROOT, 'data', 'figma-pages', 'icon-system-full.json'));
const T = PAGE.texts;
const txt = i => (T[i] ? T[i].text.replace(/\s+/g, ' ').trim() : '');

/** 제목 텍스트의 위치를 찾습니다. 없으면 세웁니다 — 조용히 빈 절을 만들지 않습니다. */
function at(re) {
  const i = T.findIndex(t => re.test(t.text.trim()));
  if (i < 0) throw new Error(`원본에서 절을 찾지 못했습니다: ${re}`);
  return i;
}
/** 제목 다음부터 다음 제목 전까지의 본문 줄. */
const HEAD = /^(\d\d_[A-Za-z]|\[(정의|네이밍 규칙|종류|확장자|제작 가이드라인|사용 가이드))/;
function body(i) {
  const out = [];
  for (let k = i + 1; k < T.length; k++) {
    if (HEAD.test(T[k].text.trim())) break;
    const s = T[k].text.replace(/\s+/g, ' ').trim();
    if (s) out.push({ text: s, node: T[k].id });
  }
  return out;
}
const first = (rows, re) => (rows.find(r => re.test(r.text)) || {}).text || null;
const pair = (rows, label) => {
  const k = rows.findIndex(r => r.text === label);
  return k >= 0 && rows[k + 1] ? rows[k + 1].text : null;
};

// ── 문서화 템플릿을 복사만 하고 안 채운 자리. «있다»로 세면 안 됩니다.
const STUB = /^(설명글|Usage guildlines|지카 디자인 시스템 문서화 템플릿|Reference|Guidelines|Type|Export)$/;
const filled = rows => rows.filter(r => !STUB.test(r.text));

// ── ① 제작 가이드라인 00~08 ──────────────────────────────────
const SECTIONS = [
  ['00_Size (사이즈)', /^00_Size/],
  ['01_Layout (레이아웃)', /^01_Layout/],
  ['02_Key line shape (키라인 쉐입)', /^02_Key line shape/],
  ['03_Stroke (스트로크 두께)', /^03_Stroke/],
  ['04_Corner radius (코너 레디어스)', /^04_Corner radius/],
  ['05_End cap (선 끝 처리)', /^05_End cap/],
  ['06_Off slash (꺼짐)', /^06_Off slash/],
  ['07_Stack (겹친 형태)', /^07_Stack/],
  ['08_Color (색상)', /^08_Color/],
];
const guide = SECTIONS.map(([title, re]) => {
  const i = at(re);
  const rows = filled(body(i));
  return {
    title,
    node: T[i].id,
    lead: rows.length ? rows[0].text : null,
    rows: rows.slice(1).map(r => r.text),
    empty: rows.length === 0,
  };
});
const S = t => guide.find(g => g.title.startsWith(t));

// ── ② 절에서 «값»을 뽑습니다. 문장이 아니라 표 칸에서만 뽑습니다.
const key = S('02_Key').rows;
const keyline = {
  frame: pair(S('02_Key').rows.map(t => ({ text: t })), '프레임 크기'),
  square: pair(key.map(t => ({ text: t })), 'Square 키라인'),
  circle: pair(key.map(t => ({ text: t })), 'Circle 키라인'),
  rectangular: pair(key.map(t => ({ text: t })), 'Rectangular 키라인'),
  safeZone: pair(key.map(t => ({ text: t })), '세이프존 여백'),
  scaling: pair(key.map(t => ({ text: t })), '적용 방식'),
  shapes: key.filter(r => /^(Square|Circle|Rectangular) \(/.test(r)),
};
const strokeRows = S('03_Stroke').rows;
const stroke = {
  value: pair(strokeRows.map(t => ({ text: t })), '스트로크 두께'),
  tolerance: pair(strokeRows.map(t => ({ text: t })), '허용 오차'),
  samples: strokeRows.filter(r => /^\d(\.\d)?px$/.test(r)),
  why: S('03_Stroke').lead,
};
const radius = {
  value: pair(S('04_Corner').rows.map(t => ({ text: t })), '코너 레디어스'),
  samples: S('04_Corner').rows.filter(r => /^r=/.test(r)),
  why: S('04_Corner').lead,
};
const endCapRows = S('05_End cap').rows;
const endCap = {
  base: pair(endCapRows.map(t => ({ text: t })), '기본 Cap'),
  exception: pair(endCapRows.map(t => ({ text: t })), '교차 지점 예외'),
  notes: endCapRows.filter(r => /Cap$/.test(r)),
  confirmedBy: '강민관 2026-08-06 — «End cap 은 둥글게가 맞아용»',
};

// ── ③ 크기별 스트로크 — [40*40] 같은 제목 바로 뒤에 Icon/system/line_<굵기> 가 옵니다.
const sizeStroke = [];
T.forEach((t, i) => {
  const m = t.text.trim().match(/^\[(\d+)\*(\d+)\]$/);
  if (!m || m[1] !== m[2]) return;
  const nx = txt(i + 1).match(/^Icon\/system\/line_([\d.]+)$/);
  if (!nx) return;
  if (sizeStroke.some(s => s.px === +m[1])) return;
  sizeStroke.push({ px: +m[1], stroke: +nx[1], layerName: txt(i + 1), node: t.id });
});
sizeStroke.sort((a, b) => b.px - a.px);

// ── ④ 이름 규칙 · 종류 · 확장자
const naming = {
  rule: first(body(at(/^\[네이밍 규칙\]$/)), /^Icon\/\{/),
  parts: body(at(/^\[네이밍 규칙\]$/)).map(r => r.text).filter(r => /^(Icon|category|name|style|scale)$/.test(r)),
  node: T[at(/^\[네이밍 규칙\]$/)].id,
  note: '원본이 스스로 선언한 규칙입니다. 앞서 «다수 표기에서 읽었다»고 한 Icon/system/<이름>/<line|fill>/<크기> 와 같은 꼴입니다 — system 이 카테고리, line|fill 이 스타일입니다.',
};
const kindsRows = filled(body(at(/^\[종류\]$/)));
const kinds = {
  lead: kindsRows.length ? kindsRows[0].text : null,
  items: kindsRows.map(r => r.text).filter(r => /icon \(.*아이콘\)화면에서/.test(r)),
};
const exportRule = {
  lead: filled(body(at(/^\[확장자\]$/))).map(r => r.text)[0] || null,
  format: 'SVG',
  scale: '1X',
};

// ── ⑤ 원본 결함 — 고치지 않고 셉니다.
const defects = [];
if (S('05_End cap').lead && S('05_End cap').lead === S('04_Corner').lead) {
  defects.push({
    id: 'IG-1',
    what: '05_End cap 절의 설명문이 04_Corner radius 것과 글자 그대로 같습니다',
    evidence: S('05_End cap').lead,
    why: '복사해 놓고 고쳐 쓰지 않았습니다. End cap 의 설명문은 페이지에 없는 셈입니다 — 다만 표 칸(기본 Cap / 교차 지점 예외)은 채워져 있어 값은 읽힙니다.',
    fix: '원본에서 고칠 일입니다. 저장소는 설명문을 지어내지 않고 표 칸 값만 씁니다.',
  });
}
const TYPOS = [
  { found: '20ox', should: '20px', where: '00_Size' },
  { found: '넒은', should: '넓은', where: '00_Size' },
  { found: '일돤된', should: '일관된', where: '[정의]' },
  { found: '백터 기밤', should: '벡터 기반', where: '[확장자]' },
];
const typos = TYPOS.map(t => ({ ...t, nodes: T.filter(x => x.text.includes(t.found)).map(x => x.id) }))
  .filter(t => t.nodes.length);

// 미작성 사용 가이드
const usageGuides = T.filter(t => /^\[사용 가이드/.test(t.text.trim()))
  .map(t => {
    const i = T.findIndex(x => x.id === t.id);
    const rows = filled(body(i));
    return { title: t.text.trim(), node: t.id, filled: rows.length > 0, lead: rows.length ? rows[0].text : null };
  });

// ── ⑥ 원본 안에서 어긋나는 곳 — 가이드 vs 컴포넌트 실측
const ICONS = require(path.join(ROOT, 'data', 'icons.json'));
const bn = (ICONS.measured || []).find(m => /굵기/.test(m.item));
const internalConflicts = [];
if (bn) {
  const g32 = sizeStroke.find(s => s.px === 32);
  if (g32 && String(g32.stroke) !== String(bn.value)) {
    internalConflicts.push({
      id: 'IG-2',
      what: '32px 아이콘의 굵기가 제작 가이드와 컴포넌트 실측에서 다릅니다',
      guide: `${g32.stroke} (${g32.layerName} · ${g32.node})`,
      measured: `${bn.value} (${bn.node})`,
      why: '제작 가이드는 32×32 에 1.6 을 배정했는데 Bottom navigation ✅ 본문은 1.5 라고 적습니다. 어느 쪽이 맞는지 원본이 말해 주지 않습니다.',
      decided: false,
    });
  }
}

// ── ⑦ 출처 대조 — 원본 문장이 KRDS 원문 그대로인지 기계로 봅니다.
// 손으로 «비슷하다»고 적으면 안 됩니다. 문장을 정규화해 겹치는 길이로 잽니다.
const REF = (() => {
  const p = path.join(ROOT, 'data', 'icon-reference.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
})();
const norm = s => String(s)
  .replace(/[.,·()（）\s]/g, '')
  .replace(/합니다|한다|됩니다|된다|입니다|이다|습니다/g, '')   // 문체 차이는 지웁니다
  .toLowerCase();
/** 두 문장에서 가장 긴 공통 부분문자열의 길이 (문체 제거 후). */
function longestCommon(a, b) {
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  let best = 0;
  const prev = new Array(B.length + 1).fill(0);
  for (let i = 1; i <= A.length; i++) {
    let diag = 0;
    for (let j = 1; j <= B.length; j++) {
      const tmp = prev[j];
      prev[j] = A[i - 1] === B[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = tmp;
    }
  }
  return best;
}
const provenance = REF ? REF.quotes.map(q => {
  let best = { section: null, ratio: 0, overlap: 0 };
  for (const g of guide) {
    for (const line of [g.lead, ...g.rows].filter(Boolean)) {
      const ov = longestCommon(q.text, line);
      const ratio = ov / Math.max(1, norm(q.text).length);
      if (ratio > best.ratio) best = { section: g.title, ratio: +ratio.toFixed(3), overlap: ov, line };
    }
  }
  const verdict = best.ratio >= 0.8 ? 'verbatim' : best.ratio >= 0.4 ? 'partial' : 'independent';
  // partial 이 나오는 이유가 «다른 문장»이 아니라 «원본 오타»일 수 있습니다. 그것부터 봅니다.
  const inSection = best.line || '';
  const brokenBy = verdict === 'partial'
    ? TYPOS.filter(t => inSection.includes(t.found)).map(t => `${t.found}(→${t.should})`)
    : [];
  return {
    quote: q.id,
    source: q.source,
    claimedMatch: q.matchOriginal,
    bestMatch: best.section,
    overlapRatio: best.ratio,
    verdict,
    brokenByTypo: brokenBy.length ? brokenBy : null,
    note: q.note || null,
  };
}) : [];
const verbatim = provenance.filter(p => p.verdict === 'verbatim');

const out = {
  $description: '아이콘 제작 가이드라인 — 원본 Icon system 페이지 본문에서 그대로 옮긴 것입니다. 레퍼런스가 아니라 원본입니다.',
  generatedFrom: 'tools/build-icon-guide.js ← data/figma-pages/icon-system-full.json',
  correction: {
    at: '2026-08-06',
    order: 2,
    what: '«아이콘 그리드가 원본에 없다»고 적고 레퍼런스로 메웠던 것을 철회합니다. 원본에 00_Size ~ 08_Color 여덟 절짜리 제작 가이드라인이 통째로 있습니다.',
    whyWrong: '첫 정정에서 «페이지를 직접 읽었다»고 했지만 실제로는 Icon/system/* 노드 «이름»만 훑었습니다(tools/parse-icon-page.js). 본문 텍스트를 읽지 않았습니다.',
    howFound: '강민관 2026-08-06 — «그리드 그려져 있고 End cap은 둥글게가 맞아용». 확인을 받고 페이지를 통째로 다시 읽었습니다.',
    lesson: '«페이지를 읽었다»는 노드 이름을 훑는 것이 아니라 본문 텍스트를 읽는 것입니다.',
  },
  source: PAGE.source,
  definition: filled(body(at(/^\[정의\]$/))).map(r => r.text)[0] || null,
  naming,
  kinds,
  export: exportRule,
  guidelineLead: filled(body(at(/^\[제작 가이드라인\]$/))).map(r => r.text)[0] || null,
  guide,
  values: { keyline, stroke, radius, endCap, sizeStroke },
  usageGuides,
  defects,
  internalConflicts,
  typos,
  provenance: {
    why: '원본 문장 중 일부는 KRDS 원문 그대로입니다. 어디가 옮겨 온 것이고 어디가 G car 고유 판단인지 기계로 갈랐습니다 — 문체를 지우고 가장 긴 공통 부분문자열 비율로 잽니다.',
    method: 'tools/build-icon-guide.js — norm() 으로 «합니다/한다» 문체와 구두점을 지운 뒤 최장 공통 부분문자열 / 인용문 길이. 0.8 이상이면 verbatim.',
    items: provenance,
    verbatimSections: [...new Set(verbatim.map(p => p.bestMatch))],
    ownJudgements: [
      { what: '스트로크 1.2px', why: 'KRDS 는 1.6px 을 권합니다. 원본은 «1.5px 이상은 곡선이 많은 형태(자동차 등)에서 뭉쳐 보이는 착시»라는 이유를 달아 1.2 로 정했습니다 — 카셰어링 아이콘의 사정입니다.' },
      { what: '크기별 굵기 5단계', why: '40:2 · 32:1.6 · 24:1.2 · 20:1 · 16:1. 두 참고 어느 쪽에도 이런 표는 없습니다.' },
      { what: 'End cap 교차 지점 예외 (Butt + 1px offset)', why: 'KRDS 는 «둥근 형태»까지만 말합니다. 예외 규칙은 원본이 더 자세합니다.' },
      { what: '세이프존 여백 최소 2', why: 'M3 의 padding 2dp 와 값은 같으나 «최소»라는 하한 표현은 원본 것입니다.' },
    ],
  },
  notInOriginal: REF ? REF.notInOriginal : null,
  counts: {
    sections: guide.length,
    emptySections: guide.filter(g => g.empty).length,
    sizeStroke: sizeStroke.length,
    usageGuides: usageGuides.length,
    usageGuidesFilled: usageGuides.filter(u => u.filled).length,
    defects: defects.length,
    internalConflicts: internalConflicts.length,
    typos: typos.length,
    quotesCompared: provenance.length,
    verbatim: verbatim.length,
    ownJudgements: 4,
  },
};

// ── 무결성
if (guide.length !== 9) throw new Error(`제작 가이드라인 절이 9개가 아닙니다: ${guide.length}`);
if (guide.some(g => g.empty)) throw new Error(`본문이 비어 있는 절: ${guide.filter(g => g.empty).map(g => g.title).join(', ')}`);
if (!keyline.frame || !keyline.square || !keyline.circle || !keyline.rectangular) {
  throw new Error('키라인 값을 다 읽지 못했습니다');
}
if (stroke.value !== '1.2px') throw new Error(`스트로크 기준값이 1.2px 이 아닙니다: ${stroke.value}`);
if (radius.value !== '2px') throw new Error(`코너 반경이 2px 이 아닙니다: ${radius.value}`);
if (endCap.base !== 'Round') throw new Error(`기본 Cap 이 Round 가 아닙니다: ${endCap.base}`);
if (sizeStroke.length !== 5) throw new Error(`크기별 굵기가 5단계가 아닙니다: ${sizeStroke.length}`);
// 크기별 굵기는 크기가 커질수록 굵어져야 합니다 — 뒤집혀 읽혔으면 파서가 틀린 것입니다.
for (let i = 1; i < sizeStroke.length; i++) {
  if (sizeStroke[i].stroke > sizeStroke[i - 1].stroke) {
    throw new Error(`크기별 굵기가 크기 순서와 어긋납니다: ${sizeStroke.map(s => `${s.px}:${s.stroke}`).join(' ')}`);
  }
}
// 24px 의 굵기는 03_Stroke 가 선언한 기준값과 같아야 합니다.
const s24 = sizeStroke.find(s => s.px === 24);
if (!s24 || `${s24.stroke}px` !== stroke.value) {
  throw new Error(`24px 굵기(${s24 && s24.stroke})가 기준값(${stroke.value})과 다릅니다`);
}

fs.writeFileSync(path.join(ROOT, 'data', 'icon-guide.json'), JSON.stringify(out, null, 2) + '\n');

console.log('아이콘 제작 가이드라인 → data/icon-guide.json');
console.log(`  원본 절 ${out.counts.sections}개 (00_Size ~ 08_Color) · 전부 본문 있음`);
console.log(`  그리드 — 프레임 ${keyline.frame} · Square ${keyline.square} · Circle ${keyline.circle} · Rect ${keyline.rectangular} · 세이프존 ${keyline.safeZone}`);
console.log(`  스트로크 ${stroke.value} (허용 오차 ${stroke.tolerance}) · 코너 ${radius.value} · 기본 Cap ${endCap.base} / 예외 ${endCap.exception}`);
console.log(`  크기별 굵기 ${sizeStroke.map(s => `${s.px}:${s.stroke}`).join(' · ')}`);
console.log(`  사용 가이드 ${out.counts.usageGuides}절 중 ${out.counts.usageGuidesFilled}절만 작성됨`);
console.log(`  원본 결함 ${out.counts.defects}건 · 원본 안 모순 ${out.counts.internalConflicts}건 · 오타 ${out.counts.typos}건`);
console.log(`  출처 대조 ${out.counts.quotesCompared}건 중 KRDS 원문 그대로 ${out.counts.verbatim}건 — ${out.provenance.verbatimSections.join(' · ')}`);
