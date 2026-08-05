'use strict';
/**
 * docs/GDS-uiux-guide.md 생성 — ✅ UI/UX guide 페이지 본문에서 읽은 규칙.
 * 손으로 적지 않고 data/gds-library.json 의 pages.uiuxGuide 에서 뽑습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEW = require('./canon-view.js');
const G = VIEW.LIB.pages.uiuxGuide;
const S = VIEW.structure;

const W = G.uxWriting;
const md = `# GDS — UI/UX Guide

> **근거.** ✅ UI/UX guide 페이지 (\`${G.node}\`) 본문. 원본을 옮겨 적은 것이며 손으로 지어낸 문장은 없습니다.
> **계층.** Guidelines — ${(S ? S.layers[0].role : '')}
> **생성.** \`node build/guide.js\` · 데이터는 \`data/gds-library.json\` 의 \`pages.uiuxGuide\`

---

## 1. UX 라이팅

| 항목 | 규칙 |
|---|---|
| 어투 | ${W.어투} |
| 헤더 타이틀 | ${W.헤더타이틀} |
| 문장형 타이틀 | ${W.문장형타이틀} |
| 본문 | ${W.본문} |
| 플레이스홀더 | ${W.플레이스홀더} |
| 알림 · 버튼 | ${W.알림버튼} |

---

## 2. 그래픽 (GUI)

**정의.** ${G.graphic.정의}

### 2-1. 단계

정보 구조를 기준으로 나눕니다. 외형적 스타일이 기준이 아닙니다.

| 단계 | 이름 | 정보 구조 | 예 |
|---|---|---|---|
${G.graphic.levels.map(l => `| Lv. ${l.lv} | ${l.name} | ${l.구조} | ${l.예} |`).join('\n')}

### 2-2. 기준 3가지

| | |
|---|---|
| 선택 기준 | ${G.graphic.기준.선택} |
| 예외 기준 | ${G.graphic.기준.예외} |
| 밀도 기준 | ${G.graphic.기준.밀도} |

### 2-3. 원칙

${G.graphic.원칙.map(p => `- ${p}`).join('\n')}

---

## 3. 컴포넌트 정의

${G.componentDefinition}

---

## 4. 저장소 반영 상태

이 문서는 \`GAP-21\` 을 메우기 위한 것입니다. 아이콘 분류 기준(Lv. 1~3)은 Foundation 의 **Icon** 항목이 근거로 삼습니다 — Icon system 페이지는 아직 🚧 이라 이 문서가 유일한 기준입니다(\`GAP-22\`).
`;

fs.writeFileSync(path.join(ROOT, 'docs', 'GDS-uiux-guide.md'), md);
console.log(`  UI/UX 가이드 → docs/GDS-uiux-guide.md (라이팅 ${Object.keys(W).length}항목 · 그래픽 ${G.graphic.levels.length}단계 · 원칙 ${G.graphic.원칙.length})`);
module.exports = { writingRules: Object.keys(W).length, levels: G.graphic.levels.length };
