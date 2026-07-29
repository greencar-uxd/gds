'use strict';
// data/foundation-data.json + site/template.html → dist/index.html
// 외부 의존성 0 (Node 표준 라이브러리만)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const TEMPLATE = path.join(ROOT, 'site', 'template.html');
const DATA = path.join(ROOT, 'data', 'foundation-data.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

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

console.log(`빌드 완료 → dist/index.html (${Math.round(html.length / 1024)} KB)`);
