'use strict';
/**
 * 🚧 컴포넌트 페이지를 한꺼번에 읽습니다.
 *
 * 왜 한 파일인가 — 이 페이지들은 «지카 디자인 시스템 문서화 템플릿»을 같이 씁니다.
 * 그래서 같은 방식으로 읽히고, 무엇보다 «서로 베낀 자리»를 찾으려면 한자리에서 봐야 합니다.
 *
 * 이 도구가 하는 일 중 제일 중요한 것: **남의 문장 찾기**.
 *   Text field 의 Style 절에 Buttons 문장이 남아 있던 것(TF-2)이 우연이 아니었습니다.
 *   템플릿을 복사하고 안 고친 자리가 페이지마다 있습니다. 손으로 «비슷하다»고 적지 않고,
 *   페이지끼리 본문을 대조해 «글자 그대로 같은 줄»을 기계로 찾습니다.
 *
 * 입력: data/figma-pages/<slug>.json (tools/parse-figma-page.js 산출)
 * 출력: data/component-pages.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  { slug: 'bottom-sheet', name: 'Bottom sheet (바텀시트)', owns: /Bottom ?[Ss]heet|바텀 ?시트/ },
  { slug: 'search-field', name: 'Search field (서치필드)', owns: /Search field|서치필드/ },
  { slug: 'info-box', name: 'Info box (인포 박스)', owns: /Info box|인포 ?박스/ },
  { slug: 'helper-text', name: 'Helper text (헬퍼 텍스트)', owns: /Helper text|헬퍼 ?텍스트/ },
  { slug: 'text-field', name: 'Text field (텍스트필드)', owns: /Text ?[Ff]ield|텍스트필드/ },
  { slug: 'top-app-bar', name: 'Top app bar (탑앱바)', owns: /Top app bar|탑앱바/ },
  { slug: 'selection-box', name: 'Selection box (셀렉션 박스)', owns: /Selection box|셀렉션 ?박스/ },
  { slug: 'toast', name: 'Toast (토스트)', owns: /Toast|토스트/ },
  { slug: 'badge', name: 'Bage (뱃지)', owns: /Ba[dg]ge|뱃지|배지/ },
  { slug: 'tab', name: 'Tap (탭)', owns: /\bTab\b|\bTap\b|탭/ },
  { slug: 'tip', name: 'Tip (팁)', owns: /\bTip\b|팁/ },
  { slug: 'numbering', name: 'Inline number (인라인 넘버)', owns: /Inline number|인라인 ?넘버|Numbering|넘버링/ },
  { slug: 'paging', name: 'Pasing (페이징)', owns: /Pa[sg]ing|페이징/ },
  { slug: 'smart-key', name: 'Smart key (스마트 키)', owns: /Smart ?key|스마트 ?키/ },
  { slug: 'principle', name: 'Principle (통합 디자인 원칙)', owns: /Principle|디자인 원칙/ },
  { slug: 'components-overview', name: 'Components overview (컴포넌트 오버뷰)', owns: /Components? overview|컴포넌트 ?오버뷰/ },
];

// 목차 이름과 실제 페이지 이름이 다른 곳 — 원본이 페이지를 고쳐 부른 흔적입니다.
const TOC_NAMES = {
  'text-field': 'Input', badge: 'Bage', tab: 'Tap', paging: 'Pasing',
  numbering: 'Numbering', 'top-app-bar': 'Tap app bar',
};

const HEAD = /^(\[.{1,40}\]|\d\d_[A-Za-z].*)$/;
const STUB = /^(설명글|설명|Reference|Type|Level|Usage|Structure|Style|Component|Glossary|지카 디자인 시스템 문서화 템플릿|Usage guildlines|Guidelines|Export|레벨 값|Variant|Detents|Use cases|화면 예시|구조|종류)$/;
const norm = s => String(s).replace(/\s+/g, ' ').trim();

const loaded = PAGES.map(p => {
  const f = path.join(ROOT, 'data', 'figma-pages', p.slug + '.json');
  if (!fs.existsSync(f)) return null;
  return { ...p, page: JSON.parse(fs.readFileSync(f, 'utf8')) };
}).filter(Boolean);
if (loaded.length < 16) throw new Error(`읽은 페이지가 너무 적습니다: ${loaded.length}`);

/** 페이지를 절로 자릅니다. */
function sections(page) {
  const T = page.texts;
  const idx = [];
  T.forEach((t, i) => { if (HEAD.test(norm(t.text))) idx.push({ i, title: norm(t.text), node: t.id }); });
  return idx.map((h, k) => {
    const end = k + 1 < idx.length ? idx[k + 1].i : T.length;
    const rows = T.slice(h.i + 1, end)
      .map(t => ({ text: norm(t.text), node: t.id }))
      .filter(r => r.text && !STUB.test(r.text));
    return { ...h, lead: rows.length ? rows[0].text : null, rows };
  });
}

// ── 문서 문장만 골라냅니다.
// 페이지에는 화면 목업의 앱 문구(«차량내 흡연 …», «최초 T멤버십 …»)가 잔뜩 붙어 있습니다.
// 그건 여러 페이지에 같이 붙어 있어도 «베낀 문서»가 아니라 «같은 목업을 붙인 것»입니다.
// 문서 문장의 표지 — ① «Xxx (한글)» 꼴의 컴포넌트 이름을 담고 있거나 ② ➊➋➌➍ 로 시작.
const BODY_MIN = 30;
const COMPONENT_NAME = /[A-Z][A-Za-z]+(?: [A-Za-z]+)* ?\([가-힣][가-힣 +?]*\)/;
const isDoc = t => t.length >= BODY_MIN && (COMPONENT_NAME.test(t) || /^[➊➋➌➍]/.test(t));

const corpus = new Map();   // 문장 → [{slug, section, node}]
for (const L of loaded) {
  for (const s of sections(L.page)) {
    for (const r of s.rows) {
      if (!isDoc(r.text)) continue;
      if (!corpus.has(r.text)) corpus.set(r.text, []);
      corpus.get(r.text).push({ slug: L.slug, section: s.title, node: r.node });
    }
  }
}

/** 남의 문장 — 한 문장이 두 페이지 이상에 있으면 어느 쪽이 주인인지 이름으로 가릅니다. */
const borrowed = [];
for (const [text, where] of corpus) {
  const slugs = [...new Set(where.map(w => w.slug))];
  if (slugs.length < 2) continue;
  const owner = loaded.find(L => L.owns.test(text));
  borrowed.push({
    text,
    appearsIn: where,
    owner: owner ? owner.slug : null,
    borrowedBy: where.filter(w => !owner || w.slug !== owner.slug).map(w => `${w.slug} › ${w.section}`),
    why: owner
      ? `${owner.name} 을 가리키는 문장인데 다른 페이지에도 그대로 있습니다.`
      : '어느 페이지의 문장인지 이름으로는 가릴 수 없습니다 — 두 곳 이상에 같은 문장이 있다는 사실만 기록합니다.',
  });
}

/** 자기 페이지가 아닌 컴포넌트 이름으로 시작하는 문장 — 템플릿을 복사하고 안 고친 자리. */
const foreign = [];
for (const L of loaded) {
  const secs = sections(L.page);
  // 그 페이지가 스스로 절 제목으로 쓴 이름은 «남»이 아닙니다 — Bottom sheet 의 Body (중단) 같은 하위 영역.
  const ownTitles = secs.map(s => s.title.replace(/^\[|\]$/g, '').replace(/^[➊➋➌➍]\s*/, ''));
  for (const s of secs) {
    for (const r of s.rows) {
      if (r.text.length < 12) continue;
      const m = r.text.match(/^([A-Z][A-Za-z ]+ \([가-힣 ]+\))(은|는|의)/);
      if (!m) continue;
      if (L.owns.test(m[1])) continue;
      if (ownTitles.some(t => t === m[1])) continue;
      foreign.push({ page: L.slug, section: s.title, subject: m[1], text: r.text.slice(0, 160), node: r.node });
    }
  }
}

/** 이름 짝이 어긋난 곳 — «Selection box (헬퍼 텍스트)» 처럼 영문 이름과 괄호 안 한글이 다른 컴포넌트인 경우. */
const KO = {};   // 한글 이름 → slug
for (const L of PAGES) {
  const m = L.name.match(/\(([가-힣 ]+)\)/);
  if (m) KO[m[1].replace(/\s+/g, '')] = L.slug;
}
const EN = {};   // 영문 이름 → slug
for (const L of PAGES) {
  const m = L.name.match(/^([A-Za-z][A-Za-z ]*?) ?\(/);
  if (m) EN[m[1].trim().toLowerCase()] = L.slug;
}
const nameMismatch = [];
for (const L of loaded) {
  for (const s of sections(L.page)) {
    for (const r of s.rows) {
      const m = r.text.match(/([A-Z][A-Za-z]+(?: [A-Za-z]+)*) ?\(([가-힣][가-힣 ]*)\)/);
      if (!m) continue;
      const enSlug = EN[m[1].trim().toLowerCase()];
      const koSlug = KO[m[2].replace(/\s+/g, '')];
      if (!enSlug || !koSlug || enSlug === koSlug) continue;
      nameMismatch.push({
        page: L.slug, section: s.title, node: r.node,
        found: `${m[1]} (${m[2]})`,
        enBelongsTo: enSlug, koBelongsTo: koSlug,
        text: r.text.slice(0, 140),
      });
    }
  }
}

/** 문장이 끊긴 자리 — «~는» 으로 끝나고 마침표가 없는 것. */
const truncated = [];
for (const L of loaded) {
  for (const s of sections(L.page)) {
    for (const r of s.rows) {
      if (!/(은|는|이|가|에서|으로)$/.test(r.text)) continue;
      if (r.text.length < 10 || r.text.length > 60) continue;
      truncated.push({ page: L.slug, section: s.title, text: r.text, node: r.node });
    }
  }
}

const out = {
  $description: '🚧 컴포넌트 페이지 5쪽을 직접 읽고, 페이지끼리 대조해 «남의 문장»을 기계로 찾은 결과입니다.',
  generatedFrom: 'tools/build-component-pages.js ← data/figma-pages/*.json',
  readAt: '2026-08-06',
  rule: [
    '페이지 본문을 그대로 옮깁니다. 오타도 고치지 않습니다.',
    '남의 문장은 그 페이지의 정의로 옮겨 적지 않습니다 — «남의 문장이 남아 있다»로만 기록합니다.',
    '문장이 끊긴 자리는 이어 쓰지 않습니다.',
  ],
  method: `문서 문장(${BODY_MIN}자 이상 + «Xxx (한글)» 이름을 담거나 ➊➋➌ 로 시작)만 골라 페이지끼리 글자 그대로 겹치는 줄을 찾습니다. `
    + '화면 목업의 앱 문구는 여러 페이지에 같이 붙어 있어도 «베낀 문서»가 아니라 «같은 목업»이므로 뺍니다. '
    + '주인은 문장 안의 컴포넌트 이름으로 가리고, 그 페이지가 절 제목으로 쓴 이름은 «남»으로 세지 않습니다.',
  pages: loaded.map(L => {
    const secs = sections(L.page);
    const own = secs.filter(s => s.rows.some(r => L.owns.test(r.text)));
    return {
      slug: L.slug,
      name: L.name,
      source: L.page.source,
      counts: {
        nodes: L.page.counts.nodes,
        texts: L.page.counts.namedTexts,
        templateStubs: L.page.counts.templateStubs,
        variants: L.page.counts.symbols,
        sections: secs.length,
        sectionsWithOwnContent: own.length,
      },
      docTemplate: secs.length > 0,
      sections: secs.map(s => ({
        title: s.title, node: s.node, lead: s.lead,
        rowCount: s.rows.length,
        rows: s.rows.slice(0, 12).map(r => r.text),
      })),
      // 문서화 템플릿이 안 붙은 페이지는 작업 메모만 있습니다. 그것도 원본 내용이라 남깁니다.
      workNotes: secs.length === 0
        ? L.page.texts.filter(t => t.text.replace(/\s+/g, ' ').trim().length >= 40)
            .slice(0, 12).map(t => ({ text: norm(t.text).slice(0, 220), node: t.id, in: t.in.slice(-1)[0] || null }))
        : [],
    };
  }),
  naming: {
    why: '구조도(목차) 이름과 실제 페이지 이름이 다른 곳입니다. 저장소는 페이지 이름을 쓰되 목차 이름을 함께 남깁니다.',
    items: loaded.filter(L => TOC_NAMES[L.slug]).map(L => ({
      slug: L.slug,
      inToc: TOC_NAMES[L.slug],
      pageName: L.page.source.pageName.replace(/\s*🚧\s*$/, ''),
      differs: !L.page.source.pageName.includes(TOC_NAMES[L.slug]),
    })),
  },
  borrowed: {
    why: '템플릿을 복사하고 고치지 않아 다른 컴포넌트의 문장이 남아 있는 자리입니다. 원본에서 고칠 일입니다.',
    count: borrowed.length,
    items: borrowed,
  },
  foreignSubjects: {
    why: '문장의 주어가 그 페이지의 컴포넌트가 아닌 것입니다. 겹치지 않아도(한 곳에만 있어도) 남의 문장입니다.',
    count: foreign.length,
    items: foreign,
  },
  nameMismatch: {
    why: '영문 이름과 괄호 안 한글이 서로 다른 컴포넌트인 곳입니다. 복사한 뒤 한쪽만 고친 흔적입니다.',
    count: nameMismatch.length,
    items: nameMismatch,
  },
  truncated: {
    why: '조사로 끝나고 마침표가 없는 문장 — 쓰다 만 자리입니다. 저장소가 이어 쓰지 않습니다.',
    count: truncated.length,
    items: truncated,
  },
  counts: {
    pages: loaded.length,
    withDocTemplate: loaded.filter(L => sections(L.page).length > 0).length,
    borrowed: borrowed.length,
    foreign: foreign.length,
    truncated: truncated.length,
    nameMismatch: nameMismatch.length,
  },
};

// ── 무결성
if (!out.pages.every(p => /^\d+:\d+$/.test(p.source.node))) throw new Error('페이지에 근거 노드가 없습니다');
// 절이 하나도 없는 페이지는 «문서화 템플릿을 안 붙인 페이지»입니다 — 빈 페이지가 아닙니다.
// 그런 페이지도 작업 메모는 있어야 합니다. 둘 다 없으면 파서가 놓친 것입니다.
for (const pg of out.pages) {
  if (pg.counts.sections === 0 && pg.workNotes.length === 0) {
    throw new Error(`절도 메모도 못 읽은 페이지: ${pg.slug}`);
  }
}
// 남의 문장은 «있다»로 기록만 하고, 그 페이지의 정의로 승격되면 안 됩니다.
for (const b of borrowed) {
  if (!b.borrowedBy.length) throw new Error(`겹친 문장인데 빌린 쪽이 비어 있습니다: ${b.text.slice(0, 40)}`);
}
// 실제로 뭔가 찾았는지 — 0이면 대조가 동작하지 않은 것입니다.
if (borrowed.length + foreign.length === 0) {
  throw new Error('페이지끼리 겹치는 문장을 하나도 못 찾았습니다 — 대조가 동작하지 않았을 수 있습니다');
}

fs.writeFileSync(path.join(ROOT, 'data', 'component-pages.json'), JSON.stringify(out, null, 2) + '\n');

console.log('🚧 컴포넌트 페이지 → data/component-pages.json');
for (const p of out.pages) {
  console.log(`  ${p.name.padEnd(30)} 절 ${String(p.counts.sections).padStart(2)} · 텍스트 ${String(p.counts.texts).padStart(4)} · 변형 ${String(p.counts.variants).padStart(3)} · 빈 템플릿 ${String(p.counts.templateStubs).padStart(2)}${p.docTemplate ? '' : ' · 문서화 템플릿 없음(작업 메모만)'}`);
}
for (const n of out.naming.items.filter(x => x.differs)) {
  console.log(`  이름 어긋남 — 목차 «${n.inToc}» / 페이지 «${n.pageName}»`);
}
if (out.counts.nameMismatch) {
  console.log(`  이름 짝 어긋남 ${out.counts.nameMismatch}건 — ${nameMismatch.map(n => n.found).join(' · ')}`);
}
console.log(`  남의 문장 — 페이지끼리 겹침 ${out.counts.borrowed}건 · 주어가 남인 문장 ${out.counts.foreign}건 · 끊긴 문장 ${out.counts.truncated}건`);
