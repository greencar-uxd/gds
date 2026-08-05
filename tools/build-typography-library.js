'use strict';
/**
 * 차기 라이브러리용 텍스트 스타일 정의를 생성합니다 — data/typography-library.json
 *
 * 저장소는 «기록»이 아니라 «차기 라이브러리 자체»를 만듭니다.
 * 여기서 만든 21종을 라이브러리에 반영한 뒤, 그다음 Figma 원본에 덮어씁니다.
 *
 * 숫자는 손으로 적지 않습니다 — 정본 21단계(data/foundation-data.json)와
 * 확정 결정(data/type-decisions.json)에서 계산합니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const LIB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gds-library.json'), 'utf8'));

const scale = D.canon.typography.scale;
const usage = T.usage.map;

// 현재 라이브러리 이름 — 그룹당 하나뿐이라 단계가 구분되지 않습니다.
const CUR = {
  Display: { name: 'noto_sans/display/bold', published: 3 },
  Heading: { name: 'noto_sans/heading/bold', published: null },
  Title: { name: 'noto_sans/title/medium', published: 6 },
  Body: { name: 'noto_sans/boby/regular', published: 4, typo: 'boby → body' },
  Caption: { name: 'noto_sans/caption/regular', published: null },
};
const SLUG = { Display: 'display', Heading: 'heading', Title: 'title', Body: 'body', Caption: 'caption' };
const WEIGHT_WORD = { 700: 'bold', 500: 'medium', 400: 'regular' };

const byGroup = {};
for (const s of scale) {
  const g = s.token.replace(/ \d+$/, '');
  (byGroup[g] = byGroup[g] || []).push(s);
}

// 그룹당 굵기가 하나인지 — 하나여야 이름에서 굵기를 뺄 수 있습니다.
const weightPerGroup = {};
for (const [g, items] of Object.entries(byGroup)) {
  const ws = [...new Set(items.map(i => i.weightNum || (String(i.weight).match(/\((\d+)\)/) || [])[1]))];
  if (ws.length !== 1) throw new Error(`${g} 그룹에 굵기가 여러 개입니다: ${ws.join(', ')}`);
  weightPerGroup[g] = Number(ws[0]);
}

const styles = [];
for (const [g, items] of Object.entries(byGroup)) {
  items.sort((a, b) => Number(a.token.match(/(\d+)$/)[1]) - Number(b.token.match(/(\d+)$/)[1]));
  for (const s of items) {
    const n = s.token.match(/(\d+)$/)[1];
    styles.push({
      name: `noto_sans/${SLUG[g]}/${n}`,
      canonToken: s.token,
      group: g,
      step: Number(n),
      fontFamily: T.fontFamily.value,
      size: s.size,
      weight: weightPerGroup[g],
      weightWord: WEIGHT_WORD[weightPerGroup[g]],
      lineHeight: T.lineHeight.value,
      letterSpacing: T.letterSpacing.value,
      usage: usage[s.token] || [],
      currentLibraryName: CUR[g].name,
    });
  }
}

const groups = Object.entries(byGroup).map(([g, items]) => ({
  group: g, slug: SLUG[g], steps: items.length, weight: weightPerGroup[g],
  weightWord: WEIGHT_WORD[weightPerGroup[g]],
  currentLibraryName: CUR[g].name,
  currentPublished: CUR[g].published,
  missing: CUR[g].published == null ? null : items.length - CUR[g].published,
  ...(CUR[g].typo ? { typo: CUR[g].typo } : {}),
}));

const out = {
  $description: '차기 GDS 라이브러리에 넣을 텍스트 스타일 정의 21종. 저장소에서 먼저 만들고, 그다음 Figma 원본에 반영합니다.',
  generatedFrom: 'tools/build-typography-library.js — data/foundation-data.json(정본 21단계) + data/type-decisions.json(확정 결정)',
  checkedAt: LIB.checkedAt,
  problem: '현재 라이브러리 텍스트 스타일은 5종뿐인데 정본은 21단계입니다. 5종은 스타일이 아니라 «그룹»이고 이름에 단계 번호가 빠져 있어서, 같은 이름으로 여러 개가 published 돼 값이 충돌합니다.',
  evidence: '그룹별 단계 수와 published 수가 맞아떨어집니다 — Display 3단계/3개 · Body 4단계/4개. Title 은 8단계인데 6개만 published 라 2개가 빠져 있습니다.',
  namingRule: 'noto_sans/<group>/<step> — 굵기는 그룹이 결정하므로(Display·Heading=Bold, Title=Medium, Body·Caption=Regular) 이름에서 뺍니다. 대신 weight 로 싣습니다.',
  fixes: [
    'boby → body 오타 정정 (GAP-3)',
    '이름에 단계 번호를 넣어 21종을 고유하게 만듭니다 (GAP-1 · GAP-2)',
    '행간은 Auto, 자간은 0 — 확정 결정 그대로',
  ],
  groups,
  styles,
  counts: { groups: groups.length, styles: styles.length, canonSteps: scale.length },
};

if (out.styles.length !== scale.length) throw new Error(`단계 수 불일치 — ${out.styles.length} vs ${scale.length}`);
if (new Set(out.styles.map(s => s.name)).size !== out.styles.length) throw new Error('이름 중복');

fs.writeFileSync(path.join(ROOT, 'data', 'typography-library.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`차기 라이브러리 텍스트 스타일 → data/typography-library.json`);
console.log(`  ${out.counts.styles}종 · 그룹 ${out.counts.groups}`);
for (const g of groups) console.log(`  ${g.group.padEnd(8)} ${g.steps}단계 · ${g.weightWord.padEnd(7)} · 현재 ${g.currentLibraryName}${g.missing ? ` (${g.missing}개 누락)` : ''}`);
module.exports = out;
