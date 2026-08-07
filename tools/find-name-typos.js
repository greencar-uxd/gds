'use strict';
/**
 * 원본 페이지 이름의 영문 오타를 찾아 근거와 함께 셉니다 (GAP-19).
 *
 * 왜 있는가 (2026-08-06):
 *   GAP-19 를 정리하면서 «Getting stared(started)» 항목을 «근거 노드 ID 가 없다»며 뺐습니다.
 *   그런데 근거는 data/foundation-data.json 페이지 목록에 처음부터 있었습니다 —
 *   gds-structure.json 만 찾아보고 없다고 결론지은 것입니다.
 *   손으로 적은 항목을 못 믿겠다고 뺄 것이 아니라, 기계가 찾을 수 있는 자리를 먼저 봤어야 합니다.
 *
 * 이 도구가 하는 일 — 오타 «판정»은 사람이, «위치와 실재»는 기계가.
 *   · 사전으로 오타를 자동 판별하지는 못합니다. 그래서 (틀린 꼴 → 바른 꼴) 짝은 사람이 적습니다.
 *   · 대신 그 «틀린 꼴»이 원본 데이터에 지금도 실재하는지를 기계가 확인합니다.
 *     원본이 고쳐지면 found 가 사라져 검사가 실패합니다 — 낡은 목록이 남지 않습니다.
 *   · 짝을 적지 않은 이름은 건드리지 않습니다. 지어내지 않습니다.
 *
 * 입력: data/foundation-data.json (페이지 목록) · data/components.json (구조도 목차)
 *       · data/figma-pages/*.json (본문 원문)
 * 출력: data/name-typos.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const COMP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'components.json'), 'utf8'));

/** 본문 원문 — 페이지 이름이 아니라 문장 안에 있는 오타(«Componenets» 등)를 위해서. */
const PG_DIR = path.join(ROOT, 'data', 'figma-pages');
const bodyTexts = [];
for (const f of fs.readdirSync(PG_DIR).filter(x => x.endsWith('.json')).sort()) {
  const pg = JSON.parse(fs.readFileSync(path.join(PG_DIR, f), 'utf8'));
  for (const t of pg.texts || []) bodyTexts.push({ page: f.replace(/\.json$/, ''), node: t.id, text: String(t.text) });
}

/** 사람이 적은 짝. 여기 적은 «found» 가 원본에 없으면 검사가 실패합니다. */
const PAIRS = [
  { found: 'Getting stared', should: 'Getting started', what: '페이지 제목' },
  { found: 'Bage', should: 'Badge', what: '페이지 제목' },
  { found: 'Pasing', should: 'Paging', what: '페이지 제목' },
  { found: 'Tap (탭)', should: 'Tab (탭)', what: '페이지 제목 — Tap app bar 의 Tap 과는 다른 낱말입니다' },
  { found: 'Tap app bar', should: 'Top app bar', what: '구조도 목차' },
  { found: 'Componenets', should: 'Components', what: '본문 — Components overview 정의' },
];

const pages = D.pages.map(p => ({ id: p.id, name: p.name, mark: p.mark }));
const tocNames = (COMP.items || []).map(i => i.sourceName || i.name).filter(Boolean);

const items = PAIRS.map(p => {
  const inPages = pages.filter(pg => pg.name.includes(p.found));
  const inToc = tocNames.filter(n => n.includes(p.found));
  const inBody = bodyTexts.filter(t => t.text.includes(p.found));
  return {
    ...p,
    foundInPages: inPages.map(pg => ({ node: pg.id, name: pg.name, mark: pg.mark })),
    foundInToc: inToc,
    foundInBody: inBody.slice(0, 3).map(t => ({ page: t.page, node: t.node, text: t.text.slice(0, 60) })),
    stillPresent: inPages.length > 0 || inToc.length > 0 || inBody.length > 0,
    evidence: inPages.length ? `data/foundation-data.json › pages ${inPages.map(x => x.id).join(', ')}`
      : inBody.length ? `data/figma-pages/${inBody[0].page}.json › ${inBody.map(x => x.node).join(', ')}`
      : inToc.length ? 'data/components.json › items' : null,
  };
});

const gone = items.filter(i => !i.stillPresent);
const withNode = items.filter(i => i.foundInPages.length > 0);

const out = {
  $description: 'GAP-19 — 원본 이름의 영문 오타. 저장소는 바른 표기를 쓰고 원본 표기를 나란히 남깁니다.',
  why: '오타 «판정»은 사람이 하고, «어디에 있고 지금도 있는가»는 기계가 확인합니다. '
    + '손으로 적은 목록만 두면 원본이 고쳐져도 낡은 채로 남습니다.',
  rule: [
    '짝(found → should)은 사람이 적습니다. 사전으로 자동 판별하지 않습니다.',
    '적은 found 가 원본 데이터에 실재하는지는 기계가 확인합니다 — 사라지면 검사가 실패합니다.',
    '짝을 적지 않은 이름은 건드리지 않습니다. 지어내지 않습니다.',
    '원본을 고치지 않습니다. 저장소가 바른 표기를 쓰고 원본 표기를 함께 실을 뿐입니다.',
  ],
  builtAt: '2026-08-06',
  correction: 'GAP-19 정리 때 «Getting stared» 를 «근거 노드 ID 가 없다»며 뺐습니다. '
    + '근거는 data/foundation-data.json 페이지 목록(42066:27863)에 처음부터 있었고, '
    + 'gds-structure.json 만 보고 없다고 결론지은 것이 잘못이었습니다. 되살렸습니다.',
  items,
  counts: {
    pairs: items.length,
    stillPresent: items.filter(i => i.stillPresent).length,
    gone: gone.length,
    withNodeId: withNode.length,
  },
  reading: null,
};
out.reading = `오타 ${out.counts.pairs}건 중 ${out.counts.stillPresent}건이 원본에 지금도 있습니다`
  + `(그중 ${out.counts.withNodeId}건은 페이지 노드 ID 로 짚입니다).`
  + (gone.length ? ` ${gone.length}건은 원본에서 사라졌습니다 — ${gone.map(g => g.found).join(', ')}.` : '');

fs.writeFileSync(path.join(ROOT, 'data', 'name-typos.json'), JSON.stringify(out, null, 2) + '\n');
console.log('이름 오타 → data/name-typos.json');
console.log(`  ${out.reading}`);
for (const i of items) {
  const where = i.foundInPages.length ? i.foundInPages.map(x => x.node).join(', ')
    : i.foundInBody.length ? i.foundInBody.map(x => x.node).join(', ')
    : i.foundInToc.length ? '목차' : '(원본에 없음)';
  console.log(`    ${i.stillPresent ? '있음' : '없음'}  ${i.found.padEnd(16)} → ${i.should.padEnd(18)} ${where}`);
}
