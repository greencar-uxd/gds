'use strict';
/**
 * 감사 결과 → 문서 생성.
 * 모든 수치는 data/color-audit.json · data/type-audit.json 에서 주입됩니다.
 * (작업 규칙 1 — 손으로 적은 숫자 금지)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-audit.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-audit.json'), 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const DEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));

const EXPORT = String(D.meta.exported).slice(0, 10);
const cd = C.details, td = T.details;
const pct = (a, b) => ((a / b) * 100).toFixed(1);

// ============================================================
// 문서 1 — 색 명명 규칙 · 중복 병합안
// ============================================================
const red = cd.redHypothesis;

let color = `# GDS 색 정리안 — 명명 규칙 + 중복 병합 (v0.1 초안)

> ## ✅ 확정 (강민관 ${DEC.decidedAt})
> - **단계 규칙 = ${DEC.rules.step.value}** — \`Primary/Red 300·400·500\` → \`030·040·050\` 리네이밍 확정. 아래 §1 의 "추론" 은 이 결정으로 종결됐습니다.
> - **메인 색상 = \`${DEC.main.token}\` (\`${DEC.main.hex}\`)** — 정본 설명문대로. 브랜드 레드(\`${red.brandRedHex}\`)와는 **다른 값**입니다.
> - **접근성:** 메인은 흰 배경 ${DEC.main.accessibility.contrastOnWhite}:1 — 본문 AA 미달이나 **별도 처리 없이 그대로 사용**하기로 확정.
> - **통폐합 기준 = ${DEC.rules.mergeBase.value}** (✅ Color system 정본에 명시된 값·이름). 전수 판정은 \`docs/GDS-color-merge-v0.1.md\`.
> 셋 다 토큰 산출물에 반영 완료 — \`dist/tokens/\`. 남은 열린 항목은 §3 끝의 CQ 목록입니다.

> **성격.** 위 확정 3건을 제외한 나머지는 **초안**입니다. 실행(Figma 원본 수정)은 강민관 승인 후 디자인팀 몫입니다 — Claude 는 View 권한뿐입니다.
> **근거.** 전부 \`${D.meta.source}\` (export ${EXPORT}) 실측입니다. 수치는 \`tools/audit/color_audit.js\` 가 계산하고 \`npm run check\` 가 문서와 대조합니다.
> **생성.** \`node tools/audit/color_audit.js && node tools/audit/report.js\`

---

## 0. 한 장 요약

| 대상 | 지금 | 진단 |
|---|---|---|
| 레거시 색 스타일 | ${C.legacy.styles}개 | 고유 HEX **${C.legacy.uniqueHex}종** — 중복 **${C.legacy.duplicateStyleCount}개**(${pct(C.legacy.duplicateStyleCount, C.legacy.styles)}%) |
| 그룹(폴더) | ${C.legacy.groups}개 | 대소문자·공백만 다른 **표기 변형 ${C.legacy.groupVariantCollisions}묶음**, 스타일 ${C.legacy.groupVariantCollisionStyles}개가 여기 걸림 |
| 같은 이름 중복 | ${C.legacy.sameNameDupNames}종 | 그중 **값까지 다른 것 ${C.legacy.nameValueConflicts}종** — 어느 쪽이 옳은지 판정 불가 |
| 정본(✅ Color system) | ${C.canon.styles}개 | 명명 지적 **${C.canon.namingFindings}건** · 스와치↔라벨 불일치 **${C.canon.labelMismatch}건** · 정본 안 HEX 중복 **${C.canon.hexDupGroups}쌍** |
| 정본으로 흡수 가능한 레거시 | ${C.legacy.absorbable}개 | 레거시 ${C.legacy.styles}개 중 ${pct(C.legacy.absorbable, C.legacy.styles)}% 가 정본 HEX 와 정확히 일치 |
| 정본에 없는 레거시 색 | ${C.legacy.orphanHex}종 | 버릴지 정본에 추가할지 **결정 필요** |

---

## 1. ✅ 종결 — Red 300/400/500 → 030/040/050

**확정 (${DEC.decidedAt}).** 아래는 결정의 근거 기록입니다. 당시 판단은 \`[추론]\` 이었고, 근거 3개가 같은 방향을 가리켰습니다.

**근거 1 — 명도 순서.** Primary/Red 9단계를 밝은 순으로 세우면 단계 번호가 이렇게 됩니다.

\`\`\`
${red.ordered.map(o => `${o.step}`).join(' → ')}
\`\`\`

010·020 다음에 갑자기 300·400·500 이 오고, 그 뒤에 다시 060 으로 돌아옵니다. 자리로 보면 **030·040·050 이 있어야 할 칸**입니다.

| 현행 이름 | HEX | 명도 순 위치가 요구하는 이름 |
|---|---|---|
${red.expected.map(e => `| \`${e.name}\` | \`${e.hex}\` | ${e.actual === e.expected ? '— (일치)' : `**Red ${e.expected}**`} |`).join('\n')}

**근거 2 — 정본 페이지의 설명문이 030/040/050 체계를 씁니다.**

> ${red.docText}

여기서 말하는 **Red 050** 을 위 표대로 대응시키면 \`${red.docRefs['Red 050']}\` 이고, 이는 정본의 \`Brand/G car Red\`(\`${red.brandRedHex}\`)와 ${red.brandMatchesRed050 ? '**정확히 일치합니다**' : '일치하지 않습니다'}. 설명문의 "브랜드 색상에 가장 가깝다"와 맞아떨어집니다. \`[팩트]\`

**근거 3 — 나머지 6단계가 전부 2자리 체계입니다.** 010·020·060·070·080·090. 300/400/500 만 3자리 체계입니다.

### ⚠️ 다만 설명문과 실측이 어긋나는 지점이 하나 있습니다 \`[팩트]\`

설명문은 *"가독성과 접근성을 고려하여 Red 040 을 메인 색상으로 사용"* 이라고 되어 있는데, 흰 배경 대비를 재면 방향이 반대입니다.

| 색 | HEX | 흰 배경 대비 | WCAG AA 본문(4.5:1) |
|---|---|---|---|
| Red 040 (메인이라고 적힌 쪽) | \`${red.docRefs['Red 040']}\` | ${red.red040OnWhite}:1 | ❌ 미달 |
| Red 050 (브랜드 레드) | \`${red.docRefs['Red 050']}\` | ${red.red050OnWhite}:1 | ❌ 미달 |

메인으로 지정된 040 이 브랜드 레드 050 **보다 대비가 낮습니다**. 둘 다 본문 텍스트로는 AA 미달입니다. "접근성을 고려해서 040" 이라는 서술의 근거가 무엇인지 확인이 필요합니다 — 텍스트 대비가 아닌 다른 기준(면적 대비, 눈부심 등)일 가능성은 있습니다. \`[미확인]\`

### 결정 상태

| ID | 내용 | 상태 |
|---|---|---|
| CQ-1 | Red 300/400/500 → 030/040/050 리네이밍 | ✅ **확정** — 10단위 3자리 체계 |
| CQ-2 | Primary 메인 색상 | ✅ **확정** — \`${DEC.main.token}\` (\`${DEC.main.hex}\`), 정본 설명문대로 |
| CQ-3 | 메인 색상 AA 미달 처리 | ✅ **확정** — **별도 처리 없음.** ${DEC.main.accessibility.contrastOnWhite}:1 로 본문 AA 미달이나 그대로 사용. 잔여 리스크는 접근성 감사 A 그룹에서 재검토 |

---

## 2. 명명 규칙 진단 — 정본 ${C.canon.styles}색

전수는 \`docs/color-naming-map.csv\`.

${cd.namingFindings.map(f => `### [${f.code}] ${f.group} — ${f.kind}${f.derived ? ' *(CN-2 파생)*' : ''}

${f.detail}${f.minority && f.minority.length ? `\n\n대상: ${f.minority.map(m => `\`${m}\``).join(', ')}` : ''}${f.fix ? `\n\n→ ${f.fix}` : ''}`).join('\n\n')}

### [CN-5] 의미형 이름 표기 흔들림

${cd.semanticIssues.map(s => `- \`${s.name}\` — ${s.issue}`).join('\n')}

### [CN-6] 스와치 색 ↔ 옆에 적힌 HEX 라벨 불일치 \`[미확인]\`

정본 페이지에서 색 견본과 그 옆 텍스트가 서로 다른 값을 말합니다. 셀 대응이 밀린 것인지 실제 불일치인지 원본 확인이 필요합니다.

| 스타일 | 스와치 실제 색 | 옆에 적힌 라벨 |
|---|---|---|
${cd.labelMismatch.map(m => `| \`${m.name}\` | \`${m.swatch}\` | \`${m.label}\` |`).join('\n')}

### [CN-7] 정본 안에서 값이 겹치는 쌍

의도된 별칭일 수도 있습니다 — 삭제 대상이 아니라 **"별칭임을 토큰에 명시할지"** 의 문제입니다.

| HEX | 스타일 |
|---|---|
${cd.canonHexDup.map(x => `| \`${x.hex}\` | ${x.names.map(n => `\`${n}\``).join(' = ')} |`).join('\n')}

---

## 3. 명명 규칙안 (초안)

\`[해석]\` — 아래는 위 진단을 전부 만족시키는 최소 규칙입니다.

\`\`\`
{그룹}/{색상명} {단계}      ← 스케일형 (Primary, Gray Scale, Navy)
{그룹}/{의미 이름}          ← 의미형 (Badge, Map Marker, Brand, System)
\`\`\`

| 규칙 | 내용 | 해소되는 지적 |
|---|---|---|
| R1 | 그룹·색상명·의미 이름은 **Title Case**. 축약·대문자 전체·소문자 시작 금지 | CN-1, 레거시 표기 변형 ${C.legacy.groupVariantCollisions}묶음 |
| R2 | 단계는 **3자리 · 10 단위**(010~100). 2자리·3자리 혼용 금지 | CN-2 |
| R3 | 단계 번호는 **밝은 쪽이 작은 수**. 번호가 커질수록 어두워야 함 | CN-4 |
| R4 | 보조 단계(005 처럼 5 단위)는 **예외로만** 허용하고 문서에 이유를 남김 | ✅ Gray 005 **예외 승인됨** (${DEC.decidedAt}) |
| R5 | 의미형 이름에는 **공백만** 사용. 언더스코어·하이픈 금지 | CN-5 |
| R6 | 결번은 허용하되 **의도된 결번임을 표기**. 채울 계획이면 예약으로 표시 | CN-3 |

### 이 규칙을 적용했을 때 바뀌는 이름

| 현행 | 제안 | 근거 |
|---|---|---|
${red.mismatched.map(m => `| \`${m.name}\` | \`Primary/Red ${m.expected}\` | §1 (CQ-1 결정 필요) |`).join('\n')}
${cd.namingFindings.filter(f => f.code === 'CN-1').flatMap(f => (f.minority || []).map(m => `| \`${m}\` | \`${m.replace(/\/([a-z])/, (_, c) => '/' + c.toUpperCase())}\` | R1 |`)).join('\n')}
${cd.semanticIssues.map(s => `| \`${s.name}\` | \`${s.name.replace(/_/g, ' ')}\` | R5 |`).join('\n')}

**Gray Scale 결정 (${DEC.decidedAt}).** \`Gray 005\` 는 보조 단계 **예외로 유지**합니다 — 재넘버링하지 않고 **Gray 090 결번도 그대로** 둡니다(기존 이름이 한 칸씩 밀리는 것을 피하기 위함). 따라서 CN-3 의 Gray Scale 지적과 R6 는 **의도된 결번으로 종결**됐습니다.

미결로 남는 것: **Navy 090/100 명도 역전**(R3 위반 — 원본 확인, CQ-8).

---

## 4. 중복 병합안

### 4-1. 무엇이 중복인가 \`[팩트]\`

레거시 ${C.legacy.styles}개 색 스타일이 실제로 가리키는 색은 **${C.legacy.uniqueHex}종**뿐입니다. 나머지 ${C.legacy.duplicateStyleCount}개는 같은 색의 다른 이름입니다.

가장 심한 것들:

| HEX | 스타일 수 | 서로 다른 이름 | 정본에 있음 |
|---|---|---|---|
${cd.hexDupTop.slice(0, 10).map(x => `| \`${x.hex}\` | ${x.count} | ${x.nameCount}종 | ${x.canon ? '✅' : '—'} |`).join('\n')}

전수는 \`docs/color-duplicates.csv\`.

### 4-2. 위험한 중복 — 같은 이름인데 값이 다른 ${C.legacy.nameValueConflicts}종 \`[팩트]\`

이건 병합이 아니라 **판정**이 필요합니다. 어느 쪽이 옳은지 데이터로는 알 수 없습니다.

| 스타일 이름 | 값 A | 값 B | 스타일 수 |
|---|---|---|---|
${cd.nameValueConflict.map(v => `| \`${v.name}\` | \`${v.hexes[0]}\` | \`${v.hexes[1]}\` | ${v.count} |`).join('\n')}

### 4-3. 병합 시뮬레이션

| 구분 | 수 | 처리 |
|---|---|---|
| 정본 HEX 와 정확히 일치하는 레거시 스타일 | ${C.legacy.absorbable} | 정본 토큰으로 **치환 후 삭제** 가능 |
| 정본에 없는 색(고유 HEX 기준) | ${C.legacy.orphanHex}종 | **결정 필요** — 아래 4-4 |
| 병합 후 남는 색 스타일 | ${C.canon.styles} + α | α = 4-4 에서 살리기로 한 것 |

### 4-4. 정본에 없는 ${C.legacy.orphanHex}종 — 성격별 분류 \`[해석]\`

이 중 눈에 띄는 묶음:

- **구 Primary(초록) 스케일** — \`#20A556\`(구 \`Primary/500 main\`) 계열. Primary=Red 확정으로 **역할이 사라진 색**입니다. 뱃지·지도처럼 색 자체가 정보인 곳에 남아 있는지 확인 후 삭제 대상. \`[해석]\`
- **iOS 시스템 색** — \`#007AFF\`, \`#0A84FF\`, \`#636366\`, \`#AEAEB2\` 등. OS 기본값이라 GDS 토큰으로 정의하지 않는 편이 맞습니다. \`[해석]\`
- **네이비 변종** — \`#143C56\`(레거시 \`Second Navy/navy060_Default Btn\` 의 다른 쪽 값) 처럼 정본 Navy 와 미세하게 다른 값. §4-2 의 이름-값 충돌과 같은 뿌리입니다.
- **나머지** — 개별 판단 필요. 전수는 \`data/color-audit.json\` 의 \`details.legacyOrphanHex\`.

### 결정 상태

| ID | 내용 | 상태 |
|---|---|---|
| CQ-4 | 통폐합 기준 | ✅ **확정** — 정본 기준. 전수 판정 → \`docs/GDS-color-merge-v0.1.md\` |
| CQ-5 | 이름-값 충돌 ${C.legacy.nameValueConflicts}종 판정 | 🟡 **일부 확정** — 정본 기준으로 자동 판정되는 것 외 나머지는 근거 없음 |
| CQ-6 | 정본에 없는 ${C.legacy.orphanHex}종 처리 | 🟡 **일부 확정** — 색차 ΔE 로 흡수 권고/개별 판단 분리 완료 |
| CQ-7 | Gray Scale 005 보조 단계 | ✅ **확정** — 예외 유지. 재넘버링 없음, Gray 090 결번은 의도된 것으로 종결 |
| CQ-8 | Navy 090/100 명도 역전 | 🔴 **열림** — 원본 확인 필요 |

---

## 5. 이 문서가 확인하지 못한 것 \`[투명성]\`

1. **스타일별 실사용 횟수를 세지 않았습니다.** 병합 우선순위를 정하려면 "이 스타일을 몇 개 노드가 쓰는지"가 필요한데, 이 감사는 스타일 정의만 봤습니다. \`[미확인]\`
2. **\`.fig\` 스냅샷이 ${EXPORT} 기준**입니다. 그 뒤 원본이 바뀌었다면 결과가 달라집니다.
3. **Red 300/400/500 가설은 추론입니다.** 원본을 만든 사람에게 확인해야 확정됩니다.
4. **CN-6 스와치↔라벨 불일치 ${C.canon.labelMismatch}건**은 디코더의 셀 대응 오류일 가능성을 배제하지 못했습니다. \`[미확인]\`
`;

// ============================================================
// 문서 2 — 타이포 정리안
// ============================================================
let typo = `# GDS 타이포 정본 (v0.2)

> **정본 21단계가 유일한 기준입니다.** 레거시 텍스트 스타일은 정본으로 통폐합될 대상이라 이 문서의 판단 근거가 아닙니다.
> **근거.** \`${D.meta.source}\` (export ${EXPORT}) 실측 + 정본 Typography system 페이지의 Usage 열.
> **생성.** \`npm run audit\`

---

## 1. 확정된 것

| 항목 | 값 | 반영 |
|---|---|---|
| 폰트 | **${TDEC.fontFamily.value} 단일** | \`--gds-font-family\` · \`$gds-font-family\` · DTCG \`type.*.$value.fontFamily\` |
| 행간 | **Figma ${TDEC.lineHeight.value}** (웹 \`line-height: normal\`) | \`--gds-type-line-height\` |
| 단계 | **${T.canon.tokens}단계** | \`--gds-type-{토큰}-size\` / \`-weight\` |
| 구분축 | **용도(Usage)** — 크기·굵기가 같아도 쓰이는 자리로 구분 | CSS 주석 · DTCG \`$extensions.gds.usage\` |

전부 강민관 확정 ${TDEC.decidedAt}.

---

## 2. 정본 ${T.canon.tokens}단계

| 토큰 | 굵기 | 크기 | 행간 | 용도 |
|---|---|---|---|---|
${(D.canon.typography.scale || []).map(t => `| \`${t.token}\` | ${t.weight} | ${t.size}px | ${TDEC.lineHeight.value} | ${(TDEC.usage.map[t.token] || []).join(' · ')} |`).join('\n')}

---

## 3. 크기·굵기가 같은 ${td.specCollisions.length}쌍 — 용도로 구분합니다

폰트가 단일이고 행간이 Auto 로 통일돼 있어, 이 ${td.specCollisions.length}쌍은 **값만 보면 구분되지 않습니다.** 용도가 유일한 구분축입니다.

| 스펙 | 토큰 | 용도 |
|---|---|---|
${td.specCollisions.map(c => c.tokens.map((tk, i) => `| ${i === 0 ? `${c.size}px / ${c.weight}` : ''} | \`${tk}\` | ${(TDEC.usage.map[tk] || []).join(' · ')} |`).join('\n')).join('\n')}

개발자가 값으로 고르면 안 되고 **자리로 골라야 합니다** — 그래픽 영역이면 \`Display\`, 반복되는 구역 머리글이면 \`Heading\`, 본문이면 \`Body\`, 캡션이면 \`Caption\`.

---

## 4. 플랫폼 대응

| 플랫폼 | 폰트 | 행간 |
|---|---|---|
| 웹 | \`font-family: "${TDEC.fontFamily.value}", sans-serif\` | \`line-height: normal\` |
| iOS | ${TDEC.fontFamily.value} | 폰트 메트릭 기본값 |
| Android | ${TDEC.fontFamily.value} | 폰트 메트릭 기본값 |

폰트가 하나로 고정됐으므로 메트릭도 하나입니다 — 플랫폼 간 행간이 갈릴 여지가 줄어듭니다. \`[해석]\`

---

## 5. 확인하지 못한 것 \`[투명성]\`

1. **자간(letterSpacing)은 정본에 정의가 없습니다** (정의 ${T.canon.letterSpacingDefined}건). 용도로 구분이 되므로 당장 막히지는 않지만, 값 차원의 구분이 필요해지면 여기부터 정해야 합니다.
2. **정본 단계별 실사용 횟수를 세지 않았습니다** \`[미확인]\`.
3. \`.fig\` 스냅샷 ${EXPORT} 기준입니다.
4. 정본 페이지에는 원래 폰트·용도 지정이 없었고, 이번 결정으로 채웠습니다 — 원본 \`.fig\` 반영은 디자인팀 몫입니다.
`;

fs.writeFileSync(path.join(ROOT, 'docs', 'GDS-color-naming-v0.1.md'), color);
fs.writeFileSync(path.join(ROOT, 'docs', 'GDS-typo-v0.2.md'), typo);
console.log('문서 생성 → docs/GDS-color-naming-v0.1.md · docs/GDS-typo-v0.2.md');
