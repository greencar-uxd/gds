'use strict';
// data/foundation-data.json + site/template.html → dist/index.html
// 외부 의존성 0 (Node 표준 라이브러리만)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const TEMPLATE = path.join(ROOT, 'site', 'canon.html');       // 정본 사이트 → index.html
const DATA = path.join(ROOT, 'data', 'foundation-data.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

// 하위 경로 섹션 — site/<name>.html → dist/<name>/index.html → /gds/<name>
// 데이터 주입이 필요 없는 정적 섹션입니다. 늘리려면 여기에 이름만 추가하면 됩니다.
const SUBPAGES = [];

const tpl = fs.readFileSync(TEMPLATE, 'utf8');

// 확정 결정을 반영한 정본을 주입합니다 — 사이트가 구 이름(Red 500 등)을 보여주면 안 됩니다.
const VIEW = require('./canon-view.js');
const FONT = require('./font.js');
const injected = JSON.parse(fs.readFileSync(DATA, 'utf8'));
injected.canon.color.styles = VIEW.colors.map(c => ({
  name: c.name, hex: c.hex, label: c.label,
  ...(c.renamed ? { was: c.originalName } : {}),
  ...(c.overridden ? { wasHex: c.originalHex } : {}),
  ...(c.isMain ? { main: true } : {}),
  ...(c.splitFrom ? { splitFrom: c.splitFrom } : {}),
  ...(c.alpha != null ? { alpha: c.alpha } : {}),
}));
injected.canon.color.figmaSync = VIEW.figmaSync;
injected.canon.color.basis = VIEW.canonBasis;
injected.canon.color.library = { name: VIEW.LIB.canonLibrary.name, checkedAt: VIEW.LIB.checkedAt, excluded: VIEW.excludedLibraries };
injected.canon.color.gaps = VIEW.GAPS ? VIEW.GAPS.items : [];
injected.canon.color.decisions = {
  decidedBy: VIEW.DEC.decidedBy, decidedAt: VIEW.DEC.decidedAt,
  step: VIEW.DEC.rules.step.value, basis: VIEW.canonBasis && VIEW.canonBasis.value,
  main: VIEW.DEC.main, renames: VIEW.renames, open: VIEW.openDecisions, settled: VIEW.closedDecisions,
};
const TDEC_SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
injected.canon.typography.decisions = TDEC_SITE;
// 용도(Usage) — 값이 같은 토큰을 구분하는 유일한 축이므로 사이트에도 싣습니다.
if (TDEC_SITE.usage && TDEC_SITE.usage.status === 'confirmed') {
  injected.canon.typography.scale = injected.canon.typography.scale.map(t => ({
    ...t, usage: TDEC_SITE.usage.map[t.token] || null,
  }));
}
// 버전 — 레퍼런스 다섯 곳이 전부 제품명 옆에 버전을 답니다(data/reference-sites.json).
injected.meta.version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
// 정본 사이트에도 새 계층을 싣습니다 — /decisions 에만 있으면 «정본 문서»가 아니라 «작업 기록»이 됩니다.
injected.canon.layout = VIEW.layout || null;
injected.canon.semantic = VIEW.semantic || null;
injected.canon.typography.semantic = VIEW.typeSemantic || null;
injected.canon.typography.library = VIEW.typeLib
  ? { namingRule: VIEW.typeLib.namingRule, groups: VIEW.typeLib.groups, styles: VIEW.typeLib.styles.map(s => ({ name: s.name, canonToken: s.canonToken, currentLibraryName: s.currentLibraryName })) }
  : null;
injected.canon.spacingCensus = VIEW.spacingCensus ? {
  pages: VIEW.spacingCensus.pages,
  counts: VIEW.spacingCensus.counts,
  summary: VIEW.spacingCensus.summary,
  why: VIEW.spacingCensus.why,
} : null;
injected.canon.structure = VIEW.structure || null;
injected.canon.gapSummary = VIEW.GAPS ? {
  total: VIEW.GAPS.items.length,
  resolved: VIEW.GAPS.items.filter(g => g.status === 'resolved').length,
  open: VIEW.GAPS.items.filter(g => g.status !== 'resolved').length,
} : null;

const raw = JSON.stringify(injected);

if (!tpl.includes('__DATA__')) throw new Error('canon.html 에 __DATA__ 자리표시자가 없습니다');

// </script> 가 JSON 문자열 안에 있으면 스크립트 블록이 조기 종료됩니다
const safe = raw.replace(/<\//g, '<\\/');
const html = tpl.replace('__DATA__', () => safe);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, FONT.applyFont(html));
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

for (const name of SUBPAGES) {
  const src = path.join(ROOT, 'site', `${name}.html`);
  if (!fs.existsSync(src)) { console.warn(`  건너뜀: site/${name}.html 없음`); continue; }
  const dir = path.join(OUT_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), FONT.applyFont(fs.readFileSync(src, 'utf8')));
  console.log(`  하위 경로 → dist/${name}/index.html`);
}

require('./guide.js');
require('./decisions.js');

console.log(`  정본 폰트 주입 — ${FONT.FAMILY} ${FONT.WEIGHTS.join('/')} (서브셋 임베드)`);
console.log(`빌드 완료 → dist/index.html (${Math.round(html.length / 1024)} KB)`);
