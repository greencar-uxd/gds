'use strict';
// data/foundation-data.json + site/template.html → dist/index.html
// 외부 의존성 0 (Node 표준 라이브러리만)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const TEMPLATE = path.join(ROOT, 'site', 'canon.html');       // 정본 사이트 → index.html
const DIAG = path.join(ROOT, 'site', 'template.html');        // 진단 리포트 → diagnostics.html
const DATA = path.join(ROOT, 'data', 'foundation-data.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');
const OUT_DIAG = path.join(OUT_DIR, 'diagnostics.html');

// 하위 경로 섹션 — site/<name>.html → dist/<name>/index.html → /gds/<name>
// 데이터 주입이 필요 없는 정적 섹션입니다. 늘리려면 여기에 이름만 추가하면 됩니다.
const SUBPAGES = ['haptic'];

const tpl = fs.readFileSync(TEMPLATE, 'utf8');
const raw = fs.readFileSync(DATA, 'utf8');
JSON.parse(raw); // 파싱 실패 시 여기서 중단

if (!tpl.includes('__DATA__')) throw new Error('template.html 에 __DATA__ 자리표시자가 없습니다');

// </script> 가 JSON 문자열 안에 있으면 스크립트 블록이 조기 종료됩니다
const safe = raw.replace(/<\//g, '<\\/');
const html = tpl.replace('__DATA__', () => safe);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

// 진단 리포트 — 레거시 현황. 정본과 섞이지 않도록 별도 페이지로 분리합니다.
const diagTpl = fs.readFileSync(DIAG, 'utf8');
const diag = diagTpl.replace('__DATA__', () => safe);
fs.writeFileSync(OUT_DIAG, diag);

for (const name of SUBPAGES) {
  const src = path.join(ROOT, 'site', `${name}.html`);
  if (!fs.existsSync(src)) { console.warn(`  건너뜀: site/${name}.html 없음`); continue; }
  const dir = path.join(OUT_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), fs.readFileSync(src, 'utf8'));
  console.log(`  하위 경로 → dist/${name}/index.html`);
}

console.log(`빌드 완료 → dist/index.html (${Math.round(html.length / 1024)} KB) · dist/diagnostics.html (${Math.round(diag.length / 1024)} KB)`);
