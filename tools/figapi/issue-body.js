'use strict';
// 변경 감지 이슈 본문을 만듭니다. YAML 안에 heredoc 을 두면 들여쓰기가 깨지므로 분리했습니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figma-change.json'), 'utf8'));

const rows = [
  ['version', d.prevVersion, d.nextVersion],
  ['lastModified', d.prevModified, d.nextModified],
  ['최상위 페이지', d.prevPages, d.nextPages],
];
const table = ['| 항목 | 이전 | 현재 |', '|---|---|---|']
  .concat(rows.map(([k, a, b]) => `| ${k} | ${a} | ${b}${String(a) !== String(b) ? ' ⚠' : ''} |`))
  .join('\n');

const body = `## Figma 원본이 변경되었습니다

아래 절차로 반영해 주세요. **자동 반영은 하지 않습니다** — REST API 가 게시되지 않은
로컬 스타일의 이름을 내려주지 않아, 토큰 이름(\`Primary/Red 500\` 등)은 \`.fig\` 에서만
복원할 수 있기 때문입니다.

### 감지 내역

${table}

### 반영 절차

\`\`\`bash
# 1. Figma 에서 .fig 를 새로 내려받아 저장소 루트에 canvas.fig 로 둡니다
unzip -o "GDS(Greencar Design System).fig" canvas.fig

# 2. 재추출 → 토큰 → 사이트 → 검증
npm run canon
npm run tokens
npm run build
npm run check
\`\`\`

\`npm run check\` 의 앵커(노드 수 · 페이지 수 · 변수 수)가 **실패하는 것이 정상**입니다.
무엇이 왜 바뀌었는지 확인한 뒤 \`build/check.js\` 의 \`ANCHORS\` 를 갱신하고,
그 이유를 커밋 메시지에 남겨 주세요.

---
<sub>이 이슈는 \`.github/workflows/figma-watch.yml\` 이 30분마다 자동 생성합니다.</sub>
`;

fs.writeFileSync('/tmp/issue.md', body);
console.log(body);
