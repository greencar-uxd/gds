'use strict';
/**
 * 색 별칭 · 면색/선색 짝 — 같은 값이 여러 이름으로 흩어진 것을 잇습니다 (GAP-5 · GAP-8).
 *
 * 왜 필요한가:
 *   정본 60색 안에 «값이 똑같은데 이름이 둘»인 것이 있습니다.
 *   지금은 둘 다 HEX 를 직접 물고 있어서, 한쪽 값이 바뀌면 다른 쪽은 조용히 남습니다.
 *   개발자는 두 변수가 원래 같은 색이었다는 사실을 알 수 없습니다.
 *
 * 어떻게 판정하는가 — 이름과 값에서 읽히는 것만으로 정합니다. 지어내지 않습니다.
 *
 *   ① 값이 같은 무리를 모읍니다(HEX 완전 일치).
 *   ② 그 무리에 «단계 그룹»(숫자 단계를 가진 스케일) 소속이 정확히 하나면
 *      그것이 원본이고 나머지는 별칭입니다. 별칭은 var() 로 원본을 가리킵니다.
 *   ③ 단계 그룹 소속이 없거나 둘 이상이면 «누가 원본인지 정할 수 없음»으로 둡니다.
 *      한쪽으로 묶지 않고, 서로를 가리키는 상호 참조만 남깁니다.
 *
 *   단계 그룹은 «세 칸 이상이 010·020… 꼴»인 그룹으로 자동 판별합니다.
 *   목록을 손으로 적지 않습니다 — 그룹이 늘거나 줄어도 따라옵니다.
 *
 * 면색/선색 짝 — 이름이 «X» 와 «X Line» 인 쌍을 찾습니다.
 *   두 이름이 다른 그룹에 흩어져 있으면 표시합니다. 같은 그룹에 있는 쌍이 선례입니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));

// 토큰 키는 방출 쪽과 반드시 같아야 합니다 — build/slug.js 한 곳에서만 만듭니다.
const { colorKey } = require(path.join(ROOT, 'build', 'slug.js'));
const keyOf = c => colorKey(c.name);

// ── ① 단계 그룹 자동 판별 — 숫자 단계 이름이 3칸 이상인 그룹.
const byGroup = {};
for (const c of VIEW.colors) (byGroup[c.group] = byGroup[c.group] || []).push(c);
const isStepName = c => /\s\d{3}$/.test(c.name);
const scaleGroups = Object.entries(byGroup)
  .filter(([, arr]) => arr.filter(isStepName).length >= 3)
  .map(([g]) => g);

// ── ② 값이 같은 무리
const byHex = {};
for (const c of VIEW.colors) (byHex[c.hex.toUpperCase()] = byHex[c.hex.toUpperCase()] || []).push(c);

const duplicates = Object.entries(byHex)
  .filter(([, g]) => g.length > 1)
  .map(([hex, g]) => {
    const scaleMembers = g.filter(c => scaleGroups.includes(c.group) && isStepName(c));
    if (scaleMembers.length === 1) {
      const base = scaleMembers[0];
      return {
        hex,
        decidable: true,
        base: { name: base.name, key: keyOf(base) },
        aliases: g.filter(c => c !== base).map(c => ({ name: c.name, key: keyOf(c) })),
        rule: `«${base.group}» 는 단계 그룹이고 ${base.name} 이 그 안의 한 칸입니다. 역할 이름은 이 칸을 가리키는 별칭입니다.`,
      };
    }
    return {
      hex,
      decidable: false,
      members: g.map(c => ({ name: c.name, key: keyOf(c), group: c.group })),
      reason: scaleMembers.length === 0
        ? '단계 그룹에 속한 이름이 없습니다 — 어느 쪽이 원본인지 값과 이름만으로는 정할 수 없습니다.'
        : `단계 그룹 소속이 ${scaleMembers.length}개입니다 — 원본이 하나로 좁혀지지 않습니다.`,
      handling: '한쪽으로 묶지 않습니다. 두 토큰 모두 값을 그대로 두고, 주석으로 서로를 가리킵니다. 값이 같은 것이 우연일 수 있기 때문입니다.',
    };
  })
  .sort((a, b) => a.hex.localeCompare(b.hex));

// ── ③ 면색 / 선색 짝
const nameSet = new Map(VIEW.colors.map(c => [c.name.replace(/^[^/]+\//, ''), c]));
const linePairs = [];
for (const c of VIEW.colors) {
  const label = c.name.replace(/^[^/]+\//, '');
  if (!/ Line$/.test(label)) continue;
  const stem = label.replace(/ Line$/, '');
  const fill = nameSet.get(stem);
  if (!fill) { linePairs.push({ line: c.name, fill: null, note: `면색 «${stem}» 이 정본에 없습니다 — 짝이 아니라 단독 선색입니다.` }); continue; }
  // 개명으로 그룹이 옮겨진 쪽이 있으면 «전에는 갈려 있었다»는 사실을 함께 남깁니다.
  const moved = [c, fill].filter(x => x.regrouped)
    .map(x => ({ token: x.name, from: x.originalGroup, was: x.originalName, reason: x.renameReason }));
  linePairs.push({
    line: c.name, lineHex: c.hex, lineGroup: c.group,
    fill: fill.name, fillHex: fill.hex, fillGroup: fill.group,
    sameGroup: fill.group === c.group,
    ...(moved.length ? { moved } : {}),
  });
}
const paired = linePairs.filter(p => p.fill);
const split = paired.filter(p => !p.sameGroup);
const together = paired.filter(p => p.sameGroup);

const out = {
  $description: '색 별칭과 면색/선색 짝 — 같은 값이 여러 이름으로 흩어진 것을 잇습니다.',
  generatedFrom: 'tools/build-color-aliases.js ← build/canon-view.js (정본 60색)',
  rule: '값이 같은 무리에 단계 그룹 소속이 정확히 하나면 그것이 원본이고 나머지는 별칭입니다. 아니면 정하지 않습니다.',
  scaleGroups,
  scaleGroupRule: '숫자 단계 이름(예: Red 040)이 3칸 이상인 그룹을 «단계 그룹»으로 봅니다. 목록을 손으로 적지 않습니다.',
  counts: {
    duplicateValues: duplicates.length,
    decidable: duplicates.filter(d => d.decidable).length,
    undecidable: duplicates.filter(d => !d.decidable).length,
    aliasTokens: duplicates.filter(d => d.decidable).reduce((n, d) => n + d.aliases.length, 0),
    linePairs: paired.length,
    linePairsSplit: split.length,
    linePairsMoved: paired.filter(p => p.moved).length,
  },
  duplicates,
  linePairs,
  splitPairs: split.map(p => ({
    ...p,
    finding: `«${p.fill}» 과 «${p.line}» 은 한 쌍인데 그룹이 갈려 있습니다 (${p.fillGroup} / ${p.lineGroup}).`,
    precedent: together.length
      ? `같은 정본 안에 붙어 있는 쌍이 ${together.length}건 있습니다 — ${together.map(t => t.fill).join(' · ')}. 전부 면색과 선색이 한 그룹입니다.`
      : '정본에 같은 그룹으로 붙어 있는 쌍이 없습니다.',
  })),
};

// ── 무결성
for (const d of duplicates.filter(x => x.decidable)) {
  if (!VIEW.colors.some(c => c.name === d.base.name)) throw new Error(`원본이 정본에 없습니다: ${d.base.name}`);
  for (const a of d.aliases) {
    if (!VIEW.colors.some(c => c.name === a.name)) throw new Error(`별칭이 정본에 없습니다: ${a.name}`);
  }
}
const aliasKeys = duplicates.filter(d => d.decidable).flatMap(d => d.aliases.map(a => a.key));
if (new Set(aliasKeys).size !== aliasKeys.length) throw new Error('별칭 키가 겹칩니다');
if (aliasKeys.some(k => duplicates.some(d => d.decidable && d.base.key === k))) {
  throw new Error('원본이 동시에 별칭이 될 수 없습니다');
}

fs.writeFileSync(path.join(ROOT, 'data', 'color-aliases.json'), JSON.stringify(out, null, 2) + '\n');

console.log('색 별칭 → data/color-aliases.json');
console.log(`  단계 그룹 ${scaleGroups.join(' · ')}`);
console.log(`  값이 겹치는 무리 ${duplicates.length}건 — 판정 가능 ${out.counts.decidable} · 판정 불가 ${out.counts.undecidable}`);
for (const d of duplicates) {
  if (d.decidable) console.log(`  ${d.hex}  ${d.base.name}  ← ${d.aliases.map(a => a.name).join(' · ')}`);
  else console.log(`  ${d.hex}  판정 불가 — ${d.members.map(m => m.name).join(' · ')}`);
}
console.log(`  면색/선색 짝 ${paired.length}건 — 그룹이 갈린 것 ${split.length}건`);
for (const p of split) console.log(`  ⚠ ${p.fill} (${p.fillGroup}) / ${p.line} (${p.lineGroup})`);
for (const p of paired.filter(x => x.moved)) {
  console.log(`  ↪ ${p.fill} / ${p.line} — ${p.moved.map(m => `${m.was} → ${m.token}`).join(' · ')} 로 합쳐짐`);
}
