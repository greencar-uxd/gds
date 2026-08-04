'use strict';
// Figma 원본 변경 감지기
// /v1/files/:key?depth=1 로 version 만 확인합니다 — 1회 호출, 응답 수십 KB.
// 저장된 version 과 다르면 exit 10 을 반환하고, 워크플로가 이슈를 엽니다.
//
// 왜 감지만 하고 반영은 안 하는가:
//   REST /v1/files/:key/styles 는 **게시된 라이브러리 스타일만** 반환합니다.
//   GDS 스타일은 로컬 전용이라 0건이 나오고, 노드에 스타일 참조(styles.fill)는 있어도
//   이름 맵이 비어 있어 `Primary/Red 500` 같은 토큰 이름을 복원할 수 없습니다.
//   따라서 값 추출은 .fig 경로(tools/figdec)를 유지하고, REST 는 변경 감지에만 씁니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY || 'kWWJJfJcHKiU6ySvR1YyRr';
const STATE = path.join(ROOT, 'data', 'figma-version.json');

if (!TOKEN) { console.error('FIGMA_TOKEN 이 없습니다.'); process.exit(2); }

const EXIT = { SAME: 0, CHANGED: 10, ERROR: 1 };

(async () => {
  let res;
  for (let i = 0; i < 4; i++) {
    res = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}?depth=1`, {
      headers: { 'X-Figma-Token': TOKEN },
    });
    if (res.status !== 429 && res.status < 500) break;
    const wait = Number(res.headers.get('retry-after') || 0) * 1000 || 2000 * (i + 1);
    console.error(`  ${res.status} — ${wait}ms 후 재시도`);
    await new Promise(r => setTimeout(r, wait));
  }
  if (!res.ok) {
    console.error(`실패: ${res.status} ${res.statusText}`);
    console.error((await res.text()).slice(0, 300));
    process.exit(EXIT.ERROR);
  }
  const j = await res.json();
  const now = {
    version: j.version,
    lastModified: j.lastModified,
    name: j.name,
    pages: (j.document.children || []).length,
    checkedAt: new Date().toISOString(),
  };

  let prev = null;
  if (fs.existsSync(STATE)) {
    try { prev = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { /* 손상 시 새로 기록 */ }
  }

  console.log(`파일: ${now.name}`);
  console.log(`version: ${now.version}`);
  console.log(`lastModified: ${now.lastModified}`);
  console.log(`최상위 페이지: ${now.pages}`);

  if (!prev) {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(now, null, 2) + '\n');
    console.log('\n최초 기록 — 다음 실행부터 비교합니다.');
    process.exit(EXIT.SAME);
  }

  if (prev.version === now.version) {
    console.log(`\n변경 없음 (마지막 확인 ${prev.checkedAt})`);
    process.exit(EXIT.SAME);
  }

  // 변경됨 — 워크플로가 읽을 수 있도록 요약을 남깁니다
  const diff = {
    prevVersion: prev.version, nextVersion: now.version,
    prevModified: prev.lastModified, nextModified: now.lastModified,
    prevPages: prev.pages, nextPages: now.pages,
  };
  fs.writeFileSync(path.join(ROOT, 'data', 'figma-change.json'), JSON.stringify(diff, null, 2) + '\n');
  fs.writeFileSync(STATE, JSON.stringify(now, null, 2) + '\n');

  console.log('\n=== 원본이 변경되었습니다 ===');
  console.log(`  version      ${prev.version} → ${now.version}`);
  console.log(`  lastModified ${prev.lastModified} → ${now.lastModified}`);
  if (prev.pages !== now.pages) console.log(`  페이지        ${prev.pages} → ${now.pages}  ⚠`);
  process.exit(EXIT.CHANGED);
})().catch(e => { console.error('실패:', e.message); process.exit(EXIT.ERROR); });
