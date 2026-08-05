'use strict';
/**
 * 타이포 시맨틱 계층 — ✅ Typography system 의 Usage 열에서 그대로 계산합니다.
 *
 * 정본 Type scale 표는 21행이고 각 행에 Usage 셀이 붙어 있습니다.
 * 그 Usage 를 뒤집으면 «쓰임새 → 단계» 표가 되고, 그게 시맨틱 계층입니다.
 * 손으로 이름을 짓지 않습니다 — 정본에 없는 쓰임새는 여기서 만들지 않습니다.
 *
 *   쓰임새가 한 단계만 가리키면  → 시맨틱 토큰 (Semantic/type/<role>)
 *   여러 단계를 가리키면        → 계열(family). 단계를 고르는 규칙이 정본에 없으므로
 *                                토큰으로 만들지 않고 «미해결»로 남깁니다.
 *
 * 출처: Typography system (타이포 시스템) ✅ · 42066:25472 · Type scale 표
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const LIB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'typography-library.json'), 'utf8'));

// 쓰임새 → 단계 역색인
const byUsage = new Map();
for (const s of LIB.styles) {
  for (const u of (s.usage || [])) {
    if (!byUsage.has(u)) byUsage.set(u, []);
    byUsage.get(u).push(s);
  }
}
if (!byUsage.size) throw new Error('Usage 열이 비어 있습니다 — data/typography-library.json 을 먼저 만드세요.');

// 이름 규칙: 정본 셀 문자열을 소문자 kebab 으로만 옮깁니다. 뜻을 바꾸지 않습니다.
const slug = u => u.trim().toLowerCase()
  .replace(/[_\s]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

const tokens = [];
const families = [];
for (const [usage, styles] of [...byUsage.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const entry = {
    usage,
    role: slug(usage),
    steps: styles.map(s => s.canonToken),
    evidence: `Typography system ✅ 42066:25472 · Type scale 표 Usage 열 "${usage}"`,
  };
  if (styles.length === 1) {
    tokens.push({ ...entry, token: `Semantic/type/${entry.role}`, ref: styles[0].name, refCanon: styles[0].canonToken });
  } else {
    families.push({ ...entry, why: '정본 Usage 가 여러 단계에 같은 쓰임새를 적어 두어, 단계를 고르는 규칙이 정본에 없습니다.' });
  }
}

// 무결성 — 이름 충돌과 유실을 빌드에서 잡습니다.
const names = tokens.map(t => t.token);
if (new Set(names).size !== names.length) throw new Error('시맨틱 타이포 이름이 겹칩니다: ' + names.join(', '));
const covered = tokens.length + families.length;
if (covered !== byUsage.size) throw new Error(`쓰임새 ${byUsage.size}개 중 ${covered}개만 처분했습니다.`);
for (const t of tokens) {
  if (!LIB.styles.some(s => s.name === t.ref)) throw new Error(`시맨틱이 없는 스타일을 가리킵니다: ${t.ref}`);
}

const out = {
  $description: '타이포 시맨틱 계층 — ✅ Typography system 의 Usage 열에서 계산. 손으로 적지 않았습니다.',
  generatedFrom: 'tools/build-typography-semantic.js ← data/typography-library.json',
  source: 'Typography system (타이포 시스템) ✅ · 42066:25472 · Type scale 표 21행 Usage 열',
  rule: '쓰임새가 한 단계만 가리키면 시맨틱 토큰, 여러 단계를 가리키면 계열(family)로 남깁니다.',
  status: 'confirmed',
  tokens,
  families,
  counts: { usages: byUsage.size, tokens: tokens.length, families: families.length },
};
fs.writeFileSync(path.join(ROOT, 'data', 'typography-semantic.json'), JSON.stringify(out, null, 2) + '\n');

console.log('타이포 시맨틱 → data/typography-semantic.json');
console.log(`  쓰임새 ${byUsage.size}종 · 토큰 ${tokens.length} · 계열 ${families.length}`);
for (const t of tokens) console.log(`  토큰  ${t.token.padEnd(38)} → ${t.refCanon}`);
for (const f of families) console.log(`  계열  ${f.usage.padEnd(24)} → ${f.steps.join(', ')}`);
