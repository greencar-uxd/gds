'use strict';
/**
 * 정본 폰트 주입 — 사이트가 GDS 정본 폰트(Noto Sans KR)로 렌더되도록 강제합니다.
 *
 * 왜 필요한가. 정본 폰트를 Noto Sans KR 단일로 확정했는데(data/type-decisions.json)
 * 사이트가 Pretendard 로 렌더되면 타이포 견본이 정본과 다른 폰트로 보입니다.
 * 문서가 스스로를 반증하는 상태라, 빌드 단계에서 폰트 스택을 정본으로 교체합니다.
 *
 * 자기완결 제약. 외부 리소스 참조가 금지돼 있으므로(build/check.js) 웹폰트 CDN 을 쓸 수 없습니다.
 * assets/fonts/ 에 서브셋(사용 문자만) woff2 를 넣어 두고 base64 로 임베드합니다.
 * 서브셋 재생성은 tools/font/README.md 참고 — 네트워크가 필요하므로 빌드에는 들어가지 않습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const FAMILY = TDEC.fontFamily.value;
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const WEIGHTS = [400, 500, 700];

// 정본 폰트 하나만 선언합니다. sans-serif 만 최종 폴백으로 둡니다.
const STACK = `"${FAMILY}",sans-serif`;

function faceCss() {
  return WEIGHTS.map(w => {
    const file = path.join(FONT_DIR, `noto-sans-kr-${w}.woff2`);
    const b64 = fs.readFileSync(file).toString('base64');
    return `@font-face{font-family:"${FAMILY}";font-style:normal;font-weight:${w};font-display:swap;`
      + `src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  }).join('\n');
}

// 본문 폰트 스택 선언(= 모노스페이스가 아닌 font-family) 을 전부 정본으로 바꿉니다.
// 모노(ui-monospace 로 시작하는 선언)는 코드 표기용이라 그대로 둡니다.
function applyFont(html) {
  let out = html.replace(/font-family:\s*(?!ui-monospace)([^;}]*?)(?=[;}])/g, (m, decl) => {
    if (/monospace/i.test(decl)) return m;
    return `font-family:${STACK}`;
  });
  const faces = faceCss();
  const i = out.indexOf('<style>');
  if (i === -1) throw new Error('<style> 블록이 없어 폰트를 주입할 수 없습니다');
  out = out.slice(0, i + 7) + '\n' + faces + '\n' + out.slice(i + 7);
  return out;
}

// 페이지에 쓰인 문자가 서브셋 안에 전부 있는지 — 없으면 두부(tofu)로 렌더됩니다.
function coverage() {
  return new Set([...fs.readFileSync(path.join(FONT_DIR, 'coverage.txt'), 'utf8')]);
}

function missingGlyphs(html) {
  const cov = coverage();
  const missing = new Set();
  for (const ch of html) {
    if (ch === '\n' || ch === '\r' || ch === '\t') continue;
    const cp = ch.codePointAt(0);
    // 라틴·한글·기호만 검사합니다. 이모지/제어문자는 폰트 대상이 아닙니다.
    const inScope = (cp >= 0x20 && cp < 0x7f) || (cp >= 0xac00 && cp <= 0xd7a3)
      || (cp >= 0x3131 && cp <= 0x318e) || (cp >= 0x2010 && cp <= 0x203a);
    if (inScope && !cov.has(ch)) missing.add(ch);
  }
  return [...missing];
}

module.exports = { FAMILY, STACK, applyFont, coverage, missingGlyphs, WEIGHTS };
