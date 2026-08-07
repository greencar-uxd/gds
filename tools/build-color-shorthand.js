'use strict';
/**
 * 원본 본문이 쓰는 «색 축약 표기»를 토큰 이름과 잇습니다 (GAP-26).
 *
 * 왜 있는가 (2026-08-06):
 *   컴포넌트 본문은 색을 «Gray scale 40» · «Gray 30» · «navy 40» 처럼 두 자리로 씁니다.
 *   토큰 이름은 «Gray Scale/Gray 040» · «Navy/Navy 040» 세 자리입니다.
 *   값은 맞는데 표기가 달라서, 문서를 읽고 토큰을 찾으려면 사람이 매번 머릿속에서 변환해야 합니다.
 *
 * 하는 일 — 대조표만 만듭니다.
 *   · 원본 문장을 고치지 않습니다. 축약 표기를 그대로 두고 옆에 토큰 이름을 답니다.
 *   · 두 자리 → 세 자리는 «0 을 앞에 붙인다»는 규칙 하나뿐이고, 그 결과가 팔레트에
 *     실재하는 토큰일 때만 이었다고 셉니다. 없으면 unresolved 로 남깁니다.
 *   · 세 자리로 이미 적힌 것(Red 500 등)은 축약이 아니므로 손대지 않습니다.
 *
 * 입력: data/figma-pages/*.json · data/components.json · data/color-decisions.json
 * 출력: data/color-shorthand.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const VIEW = require('../build/canon-view.js');
const COLORS = VIEW.colors;                       // 확정 이름 기준(60색)

/** 축약 표기 — «그룹 이름 + 두 자리». 세 자리는 이미 토큰 표기라 잡지 않습니다. */
const SHORT = /\b(Gray ?scale|Gray|Navy|Red|Primary|Secondary)\s+(\d{2})\b(?!\d)/gi;

/** 축약의 그룹 낱말 → 토큰의 그룹/접두. 원본 팔레트 이름에서 그대로 가져옵니다. */
const GROUP = {
  'grayscale': { group: 'Gray Scale', prefix: 'Gray' },
  'gray': { group: 'Gray Scale', prefix: 'Gray' },
  'navy': { group: 'Navy', prefix: 'Navy' },
  'red': { group: 'Primary', prefix: 'Red' },
  'primary': { group: 'Primary', prefix: 'Red' },
};

const tokenFor = (word, two) => {
  const g = GROUP[word.replace(/\s+/g, '').toLowerCase()];
  if (!g) return null;
  const name = `${g.group}/${g.prefix} 0${two}`;      // 40 → 040
  return COLORS.find(c => c.name === name) || null;
};

/** 문자열 어디에 있든 축약을 찾아냅니다. */
function findIn(text, where, node) {
  const hits = [];
  SHORT.lastIndex = 0;
  let m;
  while ((m = SHORT.exec(text))) {
    const tok = tokenFor(m[1], m[2]);
    hits.push({
      found: m[0], word: m[1], two: m[2],
      token: tok ? tok.name : null,
      hex: tok ? tok.hex : null,
      resolved: !!tok,
      where, node,
      context: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ').trim(),
    });
  }
  return hits;
}

const items = [];

// ① 🚧/시작 전 페이지 원문
const PG_DIR = path.join(ROOT, 'data', 'figma-pages');
for (const f of fs.readdirSync(PG_DIR).filter(x => x.endsWith('.json')).sort()) {
  const pg = JSON.parse(fs.readFileSync(path.join(PG_DIR, f), 'utf8'));
  for (const t of pg.texts || []) items.push(...findIn(String(t.text), `figma-pages/${f.replace(/\.json$/, '')}`, t.id));
}

// ② ✅ 컴포넌트 실측
const COMP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'components.json'), 'utf8'));
(function walk(o, trail) {
  if (typeof o === 'string') { items.push(...findIn(o, `components.json${trail}`, null)); return; }
  if (Array.isArray(o)) { o.forEach((v, i) => walk(v, `${trail}[${i}]`)); return; }
  if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) walk(v, `${trail}.${k}`); }
})(COMP, '');

/** 같은 표기끼리 묶습니다 — 표는 «표기 → 토큰» 한 줄씩이어야 읽힙니다. */
const map = new Map();
for (const i of items) {
  const key = i.found.replace(/\s+/g, ' ');
  if (!map.has(key)) map.set(key, { found: key, token: i.token, hex: i.hex, resolved: i.resolved, count: 0, where: new Set(), examples: [] });
  const g = map.get(key);
  g.count++;
  g.where.add(i.where);
  if (g.examples.length < 3) g.examples.push({ node: i.node, context: i.context });
}
const rows = [...map.values()]
  .map(g => ({ ...g, where: [...g.where].sort() }))
  .sort((a, b) => (a.token || 'zz').localeCompare(b.token || 'zz') || a.found.localeCompare(b.found));

const unresolved = rows.filter(r => !r.resolved);

/** 대소문자까지 제각각인지 — 같은 색을 가리키는 표기가 몇 가지인가. */
const perToken = new Map();
for (const r of rows) if (r.token) {
  if (!perToken.has(r.token)) perToken.set(r.token, []);
  perToken.get(r.token).push(r.found);
}
const multiSpelling = [...perToken.entries()]
  .filter(([, v]) => new Set(v.map(x => x.toLowerCase())).size > 1 || v.length > 1)
  .map(([token, spellings]) => ({ token, spellings: [...new Set(spellings)].sort() }));

const out = {
  $description: 'GAP-26 — 원본 본문의 색 축약 표기와 토큰 이름을 잇는 대조표입니다. 원본 문장은 고치지 않습니다.',
  why: '본문은 두 자리(«Gray scale 40»), 토큰은 세 자리(«Gray Scale/Gray 040»)입니다. '
    + '값은 맞는데 표기가 달라서 문서를 읽고 토큰을 찾으려면 매번 사람이 변환해야 했습니다.',
  rule: [
    '두 자리 → 세 자리는 «앞에 0 을 붙인다» 하나뿐이고, 그 결과가 팔레트에 실재할 때만 이었다고 셉니다.',
    '세 자리로 이미 적힌 것(Red 500 등)은 축약이 아니므로 잡지 않습니다.',
    '원본 문장을 고치지 않습니다 — 축약을 그대로 두고 옆에 토큰 이름을 답니다.',
    '못 이은 표기는 지우지 않고 unresolved 로 남깁니다.',
  ],
  builtAt: '2026-08-06',
  basis: 'data/figma-pages/*.json(원문) · data/components.json(✅ 실측) · 팔레트는 build/canon-view.js 의 확정 60색',
  rows,
  unresolved: { count: unresolved.length, items: unresolved },
  multiSpelling: {
    what: '같은 토큰을 가리키는 표기가 여러 가지인 곳 — 대소문자·띄어쓰기까지 제각각입니다.',
    count: multiSpelling.length,
    items: multiSpelling,
  },
  counts: {
    occurrences: items.length,
    distinct: rows.length,
    resolved: rows.filter(r => r.resolved).length,
    unresolved: unresolved.length,
    tokensReferenced: perToken.size,
  },
  reading: null,
};
out.reading = `축약 표기 ${out.counts.distinct}종(${out.counts.occurrences}건)이 팔레트의 ${out.counts.tokensReferenced}개 토큰을 가리킵니다. `
  + `못 이은 것은 ${out.counts.unresolved}종입니다.`;

fs.writeFileSync(path.join(ROOT, 'data', 'color-shorthand.json'), JSON.stringify(out, null, 2) + '\n');
console.log('색 축약 표기 대조 → data/color-shorthand.json');
console.log(`  ${out.reading}`);
for (const r of rows) console.log(`    ${r.found.padEnd(16)} → ${r.token || '(못 이음)'}${r.hex ? ' ' + r.hex : ''}  ×${r.count}  ${r.where.join(', ')}`);
if (multiSpelling.length) {
  console.log('  같은 토큰을 여러 표기로:');
  for (const m of multiSpelling) console.log(`    ${m.token} ← ${m.spellings.join(' · ')}`);
}
