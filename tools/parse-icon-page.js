'use strict';
/**
 * Icon system 페이지를 직접 읽습니다 (GAP-22 재작업).
 *
 * 왜 다시 하는가:
 *   처음에는 «Icon system 페이지가 🚧 이니 내용이 없다»고 보고, ✅ 페이지와
 *   낡은 .fig 스냅샷만으로 «아이콘 이름 규칙 없음 · 크기 스케일 없음 · 목록 없음»
 *   이라고 적었습니다. 페이지를 열어 보니 전부 틀렸습니다.
 *   등록된 스타일 목록만 보지 말고 페이지를 직접 읽어야 합니다.
 *
 * 입력:
 *   Figma MCP get_metadata(42066:25437) 결과 XML 을 파일로 저장한 것.
 *   경로를 인자로 주거나 ICON_PAGE_XML 환경변수로 넘깁니다.
 *   MCP 호출은 스크립트에서 못 하므로 «읽은 것을 저장 → 파싱» 두 단계로 나눕니다.
 *
 * 출력: data/figma-pages/icon-system.json
 *
 * 이름 규칙 판정 — 원본이 선언한 꼴은 «Icon/system/<이름>/<line|fill>/<크기>» 입니다.
 * 여기서 벗어난 것을 «지어내지 않고» 유형별로 세어 남깁니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const SRC = process.argv[2] || process.env.ICON_PAGE_XML;
if (!SRC || !fs.existsSync(SRC)) {
  console.error('사용법: node tools/parse-icon-page.js <get_metadata 결과 XML 경로>');
  console.error('  Figma MCP get_metadata(fileKey=Gx9UHfQdhSdHzr1j8Kp1Ab, nodeId=42066:25437) 결과를 저장해서 넘기세요.');
  process.exit(1);
}
const txt = fs.readFileSync(SRC, 'utf8');

const NODE = '42066:25437';
if (!txt.includes(`id="${NODE}"`)) throw new Error(`Icon system 페이지(${NODE}) 가 아닌 것 같습니다`);

// ── ① 문서 프레임의 크기 단계 — «5. Icon» 안에 «이름 + Npx» 짝으로 적혀 있습니다.
const iconFrame = (() => {
  const i = txt.indexOf('<frame id="42066:26405"');
  if (i < 0) return '';
  const m = /\n  <\/frame>/.exec(txt.slice(i));
  return m ? txt.slice(i, i + m.index) : txt.slice(i);
})();
const tierNames = [...iconFrame.matchAll(/<text id="[^"]+" name="([^"]+)"[^>]*width="175|<text id="[^"]+" name="([^"]+)"/g)];
const tiers = [];
{
  const labels = [...iconFrame.matchAll(/<text id="[^"]+" name="([^"]+)"/g)].map(m => m[1]);
  for (let i = 0; i < labels.length - 1; i++) {
    if (/^\d+px$/.test(labels[i + 1]) && !/^\d+px$/.test(labels[i]) && labels[i] !== 'Icon') {
      tiers.push({ name: labels[i], px: parseInt(labels[i + 1], 10) });
    }
  }
}

// ── ② 컴포넌트 이름 — 규칙에 맞는 것과 벗어난 것을 가릅니다.
const RULE = /^Icon\/system\/(.+?)\/(line|fill)\/(\d+)$/;
const allNames = [...new Set([...txt.matchAll(/name="([Ii]con\/system\/[^"]+)"/g)].map(m => m[1]))];
const conforming = [];
const nonConforming = [];
for (const n of allNames) (RULE.test(n) ? conforming : nonConforming).push(n);

const icons = {};
for (const n of conforming) {
  const [, name, variant, size] = RULE.exec(n);
  icons[name] = icons[name] || { name, line: [], fill: [] };
  const arr = icons[name][variant];
  if (!arr.includes(+size)) arr.push(+size);
}
for (const v of Object.values(icons)) { v.line.sort((a, b) => a - b); v.fill.sort((a, b) => a - b); }

// 벗어난 것 유형 — 무엇이 어떻게 어긋났는지 이름만으로 판정합니다.
const bucketOf = n =>
  /^icon\//.test(n) ? 'lowercasePrefix'
    : /^Icon\/system\/(line|fill)\//.test(n) ? 'variantBeforeName'
      : /^Icon\/system\/[^/]+$/.test(n) ? 'noVariantNoSize'
        : /\/(line|fill)$/.test(n) ? 'noSize'
          : 'other';
const BUCKET_KO = {
  lowercasePrefix: '소문자 «icon/» 으로 시작 — 규칙은 «Icon/»',
  variantBeforeName: '변형(line·fill)이 이름보다 앞 — 규칙은 «이름/변형/크기»',
  noVariantNoSize: '변형과 크기가 없음',
  noSize: '크기가 없음',
  other: '그 밖의 어긋남',
};
const nonConformingByBucket = {};
for (const n of nonConforming) {
  const b = bucketOf(n);
  (nonConformingByBucket[b] = nonConformingByBucket[b] || []).push(n);
}
for (const v of Object.values(nonConformingByBucket)) v.sort();

// ── ③ 선언된 크기 분포 — 이름에 적힌 크기입니다(실제 렌더 크기가 아닙니다).
const declaredSizes = {};
for (const v of Object.values(icons)) {
  for (const s of [...v.line, ...v.fill]) declaredSizes[s] = (declaredSizes[s] || 0) + 1;
}

// ── ④ 페이지 안 큰 프레임 — 어디에 무엇이 있는지 길잡이.
const bigFrames = [...txt.matchAll(/^  <frame id="([^"]+)" name="([^"]+)" x="[^"]*" y="[^"]*" width="([\d.]+)" height="([\d.]+)"/gm)]
  .map(m => ({ node: m[1], name: m[2], w: Math.round(+m[3]), h: Math.round(+m[4]) }))
  .filter(f => f.w * f.h > 400000 && !/^Group \d+$/.test(f.name))
  .sort((a, b) => b.w * b.h - a.w * a.h);

const out = {
  $description: 'Icon system 페이지를 직접 읽은 것. 등록된 스타일 목록이 아니라 페이지 내용입니다.',
  source: { fileKey: 'Gx9UHfQdhSdHzr1j8Kp1Ab', node: NODE, page: 'Icon system (아이콘 시스템) 🚧' },
  readAt: '2026-08-06',
  method: 'Figma MCP get_metadata 로 페이지 전체를 읽고 tools/parse-icon-page.js 로 파싱. 읽기 전용.',
  caution: '페이지 표시는 🚧 입니다. 확정된 규격이 아니라 «작업 중인 원본 내용»으로 읽어야 합니다.',
  sizeTiers: {
    source: '42066:26405 «5. Icon» 문서 프레임',
    tiers,
    note: '문서 프레임이 적어 둔 단계입니다. 아래 «선언된 크기»와 겹치지 않습니다 — 같은 축이 아닐 수 있습니다.',
  },
  naming: {
    rule: 'Icon/system/<이름>/<line|fill>/<크기>',
    ruleEvidence: `이 꼴을 따르는 이름이 ${conforming.length}건으로 가장 많습니다 — 규칙을 지어낸 것이 아니라 다수 표기에서 읽어낸 것입니다.`,
    conforming: conforming.length,
    nonConforming: nonConforming.length,
    buckets: Object.entries(nonConformingByBucket).map(([k, names]) => ({
      kind: k, ko: BUCKET_KO[k], count: names.length, names,
    })).sort((a, b) => b.count - a.count),
  },
  icons: Object.values(icons).sort((a, b) => a.name.localeCompare(b.name)),
  declaredSizes,
  bigFrames,
  counts: {
    nodes: [...txt.matchAll(/name="[Ii]con\/system\/[^"]+"/g)].length,
    uniqueNames: allNames.length,
    icons: Object.keys(icons).length,
    conforming: conforming.length,
    nonConforming: nonConforming.length,
    sizeTiers: tiers.length,
  },
};

// ── 무결성
if (!tiers.length) throw new Error('크기 단계를 하나도 읽지 못했습니다 — 파서가 페이지 구조와 어긋났습니다');
if (!out.counts.icons) throw new Error('아이콘을 하나도 읽지 못했습니다');
if (out.counts.conforming + out.counts.nonConforming !== out.counts.uniqueNames) {
  throw new Error('규칙 판정 합이 고유 이름 수와 다릅니다');
}
for (const b of out.naming.buckets) {
  if (b.count !== b.names.length) throw new Error(`유형 집계가 실제와 다릅니다: ${b.kind}`);
}

fs.mkdirSync(path.join(ROOT, 'data', 'figma-pages'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'figma-pages', 'icon-system.json'), JSON.stringify(out, null, 2) + '\n');

console.log('Icon system 페이지 → data/figma-pages/icon-system.json');
console.log(`  크기 단계 ${tiers.length}개 — ${tiers.map(t => `${t.name} ${t.px}px`).join(' · ')}`);
console.log(`  Icon/system/* 노드 ${out.counts.nodes}개 · 고유 이름 ${out.counts.uniqueNames}개 · 아이콘 ${out.counts.icons}종`);
console.log(`  이름 규칙 «${out.naming.rule}» — 맞는 것 ${out.counts.conforming} · 어긋난 것 ${out.counts.nonConforming}`);
for (const b of out.naming.buckets) console.log(`    ${String(b.count).padStart(3)}건  ${b.ko}`);
console.log(`  이름에 선언된 크기 — ${Object.entries(declaredSizes).sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}px×${n}`).join(' · ')}`);
