# Bottom sheet 컴포넌트 실측 · 원본 대조 — 마케팅 배포물 검토에서 파생

> 작성 2026-08-05 · 작성자 Claude (Cowork) · 대상 강민관
> 원본: Figma `Gx9UHfQdhSdHzr1j8Kp1Ab` — MCP 직접 조회 (`.fig` 재추출 아님)
> 근거 표기: `[팩트]` 측정/확인 · `[해석]` 내 판단 · `[추론]` 근거는 있으나 미확인 · `[미확인]` 검증 수단 없음

---

## 0. 이번에 한 일

마케팅 커뮤니케이션실이 UXD 검토 없이 Braze로 배포한 **8월 멤버십 쿠폰 안내 팝업**을 검토하면서,
근거로 삼을 GDS `Bottom sheet` 컴포넌트를 실측했습니다. 그 과정에서 나온 측정치와
**저장소 원본(`data/foundation-data.json` → `canon`)과의 대조 결과**를 기록합니다.

산출물 3개를 이 저장소에 넣습니다.

| 파일 | 내용 |
|---|---|
| `data/component-bottom-sheet.json` | Bottom sheet · coupon · Large 버튼 실측 스펙 + 원본 토큰 매핑 |
| `docs/assets/braze-bottom-sheet-notice.html` | 마케팅실 배포용 베이스 HTML (Notice 안내형) |
| `docs/assets/bottom-sheet-spacing.png` | 스페이싱 명세 도면 |

`build/check.js`에 `[5] data/component-bottom-sheet.json` 블록을 추가했습니다.
새 스펙의 모든 색·간격·타이포·반경이 원본 안에 있는지 기계 검사합니다.

---

## 1. Figma 접근 조건이 바뀌었습니다 `[팩트]`

README 「제약」의 **"Figma 권한은 View 전용입니다"**는 이번 세션에서 더 이상 해당하지 않습니다.

`whoami` 결과 — 계정 `531879@lotte.net`, plan **Greencar / seat Full**.
`use_figma`로 `getLocalTextStylesAsync()` 같은 Plugin API 실행까지 가능했습니다. `[팩트]`

처음에는 다른 계정(`차세대's Starter team` / seat View)으로 붙어 403이 났고, 커넥터를 회사 계정으로
다시 연결해서 해소했습니다. **커넥터에 붙은 OAuth 계정이 무엇이냐가 접근 가능 범위를 결정합니다.** `[해석]`

원본 수정(마스터 통합·노드 삭제·라벨 수정)까지 할 수 있는지는 별개 문제이므로,
README의 제약 문구는 **"쓰기 작업은 디자인팀 확인 후"** 정도로 완화하는 편이 정확합니다. `[해석]`

---

## 2. 구조 실측 `[팩트]`

`Components_Bottom sheet`(43207:45522) 하위 9개 섹션 전수 확인.

| 영역 | 값 |
|---|---|
| 시트 상단 코너 | 20 |
| Elevation | `Bottom Sheet` (3겹) |
| **➊ Top(상단)** | 높이 56 · 좌우 패딩 20 · 닫기 아이콘 24×24 **좌측** · 하단 구분선 1px |
| Top 종류 | Title + Icon / Title / Handle **3종** |
| **➋ Body(중단)** | 좌우 20 · 상단 24 |
| Body 종류 | Text / Text + Image / Action item **3종** |
| **➌ Action(하단)** | 시트 최하단 고정 · 버튼 간 16 · 하단 24 |
| Action 종류 | Button / Button + Text button **2종** |
| Body → Action | 32 |
| Variant | Notice(안내형) / 입력형 / Select(선택형) / Image(이미지형) **4종** |

**Dim layer는 사용하지 않습니다.** `Usage guidelines`(43912:54015)에 명시 — 강제성이 필요하면 Modal. `[팩트]`

`Top`에 **컬러 헤더 타입은 없습니다.** 3종이 전부입니다. `[팩트]`

---

## 3. 원본 대조 — 전 항목 일치 `[팩트]`

실측치를 `canon`과 대조했습니다. **간격·반경·타이포·색 모두 원본 안에 있습니다.**

### 3-1. 간격 — `canon.spacing` (1 unit = 2px)

| 실측 | 원본 토큰 |
|---|---|
| 4 | `Spacing_200` |
| 8 | `Spacing_300` |
| 16 | `Spacing_500` |
| 20 | `Spacing_600` |
| 24 | `Spacing_700` |
| 32 | `Spacing_900` |

2026-07-29 재명명(강민관 결정) 이후 스케일과 어긋나는 값이 없습니다. `[팩트]`

### 3-2. 반경 — R-3 준수

| 대상 | 실측 | 토큰 |
|---|---|---|
| 시트 상단 | 20 | `Radius/xxl` |
| 쿠폰 카드 | 16 | `Radius/xl` |
| 버튼 | 8 | `Radius/sm` |
| 태그·배지 | 원형 | `Radius/full` |

**최대값이 20**이므로 R-3(상한 20px, 2026-07-28 회의) 안에 들어옵니다. `[팩트]`

### 3-3. 타이포 — `canon.typography` 21토큰

| 대상 | 실측 | 원본 토큰 |
|---|---|---|
| 시트 타이틀 | 16 / 500 | `Title 5` |
| Body 리드 | 16 / 400 | `Body 1` |
| 쿠폰 상태 태그 | 10 / 500 | `Title 8` |
| 쿠폰 타이틀 | 16 / 500 | `Title 5` |
| 쿠폰 설명 | 12 / 400 | `Body 3` |
| 유효기간 | 14 / 400 | `Body 2` |
| D-DAY 배지 | 10 / 500 | `Title 8` |
| CTA 라벨 | 16 / **700** | `Display 3` 또는 `Heading 3` |

**Figma 로컬 Text Style(22개)과 원본(21토큰)은 다른 체계입니다.** `[팩트]`
로컬은 `noto_sans/{역할}/{weight}` 이고 이름에 사이즈가 없어 `noto_sans/title/medium`이 8개(24~10px) 중복합니다.
원본은 사이즈별로 이름이 갈리므로(`Title 1`~`Title 8`) **이 중복은 원본에서 이미 해소된 상태**입니다. `[해석]`

한 건 미확정 — **16/700 원본이 `Display 3`과 `Heading 3` 둘 다**라 CTA 라벨이 어느 쪽인지 정할 수 없습니다. `[미확인]`

### 3-4. 색 — `canon.color.palette` 57색

| 대상 | 실측 | 원본 스타일 |
|---|---|---|
| CTA 배경 | `#F14950` | `Primary/Red 400` |
| CTA Pressed · 상태 태그 | `#ED1C24` | `Primary/Red 500` |
| 시트 배경 | `#FFFFFF` | `Gray Scale/Gray 000` |
| 시트 텍스트 | `#2F2E2E` | `Gray Scale/Gray 080` |
| Top 구분선 | `#E2E2E2` | `Gray Scale/Gray 020` |
| 쿠폰 텍스트 | `#0F2D41` | `Navy/Navy 070` |
| 유효기간 | `#728A9A` | `Navy/navy 040` |
| 쿠폰 테두리 | `#D0D8DD` | `Navy/Navy 020` |
| D-DAY default | `#0A3C5C` | `Navy/Navy 060` |
| D-DAY soon | `#D32828` | `System/Alarm` |

#### 검토 중 냈던 판단 2건을 정정합니다

**정정 ①** — 쿠폰 카드 색을 "레거시 팔레트"로 보고 시트(Gray Scale)와 **팔레트가 이원화됐다**고 판단했었습니다.
원본 대조 결과 `#0F2D41`·`#728A9A`·`#D0D8DD`·`#0A3C5C`는 **전부 `Navy` 계열 원본 스타일**입니다.
이원화가 아니라 **하나의 팔레트 안에서 Gray Scale과 Navy를 쓰는 것**입니다. 앞선 판단을 기각합니다. `[팩트]`

**정정 ②** — 재구성 HTML이 처음에 쓴 `#1E1D1D`(본문)와 `#D9DDDF`(Top 구분선)는
**원본 팔레트 57색 밖입니다.** Figma 노드에서 읽은 렌더값을 그대로 쓴 결과였습니다.
`Gray Scale/Gray 080 #2F2E2E`와 `Gray Scale/Gray 020 #E2E2E2`로 교체했습니다. `[팩트]`
`#2F2E2E`의 흰 배경 대비는 13.54:1로 WCAG AA를 충분히 넘습니다. `[팩트]`

> `#D9DDDF`는 Figma에서 `System/Input Line`이라는 이름으로 읽혔으나 원본 팔레트에 없습니다.
> 원본에 넣을지, Gray 020으로 흡수할지 판단이 필요합니다. `[미확인]`

---

## 4. Elevation — `Bottom Sheet` 스타일이 4종 값으로 9개 `[팩트]`

`data/foundation-data.json`의 EFFECT 스타일 40개 중 바텀시트 관련만 뽑으면:

| 이름 | 개수 | 겹 | alpha |
|---|---|---|---|
| `Bottom Sheet` (43190:24225) | 1 | **3** | 0.15 / 0.30 / 0.15 |
| `bottom sheet` | 3 | 1 | 0.15 |
| `Bottom Sheet shadow` | 3 | 1 | 0.20 |
| `as-is_Shadow/(X)Bottom Sheet` | 1 | 1 | 0.08 |

컴포넌트 문서가 지정하는 것은 **3겹짜리 `Bottom Sheet`** 하나입니다. `[팩트]`

E-2(그림자 불투명도 15%, 2026-07-28 회의) 대비 — 3겹 중 2겹은 15%지만 **2번째 겹이 30%**입니다.
`0.20`·`0.08` 계열은 E-2 밖입니다. 통합 대상으로 봅니다. `[해석]`

`Elevation_1`~`6` 재넘버링된 원본 스케일과 `Bottom Sheet`의 관계는 문서에 없습니다. `[미확인]`

---

## 5. coupon 컴포넌트 `[팩트]`

`coupon` COMPONENT_SET(6957:66723, 6 variant)이 **이미 존재합니다.**

구조 — 상태 태그(pill) → 할인 타이틀 → 설명 → 조건 → 유효기간 + D-DAY 배지, 우측 32×32 다운로드 아이콘.
`radius 16` · `border 1px Navy/Navy 020` · `padding 16/20` · 유효기간 표기 `YYYY.MM.DD ~ YYYY.MM.DD`.

**좌측 컬러 바도, 매수 배지도 없습니다.** `[팩트]`
(매수는 `pass mall_cupon`의 리스트 행에만 있습니다.)

이 컴포넌트가 **신규 GDS 페이지에 미편입**입니다. 레거시 페이지에만 있고 신규 쪽에는 24px 아이콘만 있습니다. `[팩트]`

---

## 6. 배포물 검토 결과 — 불일치 15건 `[팩트]`

마케팅실 배포 HTML을 위 기준으로 검토한 결과입니다. 상세는 별도 가이드 문서로 전달했습니다.

| 등급 | 건수 | 대표 항목 |
|---|---|---|
| 치명 | 4 | Top이 규격 밖(컬러 헤더) · 3분할 미준수 · 세이프에어리어 미처리 · 닫기 터치 타깃 25×25 |
| 높음 | 5 | 팔레트 밖 색 6종 · 타이포 스케일 무시(11/16.5/19.5px) · 웹폰트 로딩 실패 · 간격 체계 · 버튼 규격 |
| 보통 | 5 | 구분선 누락 · 접근성 대응 없음 · JS 오류 가능 · 죽은 마크업 · Liquid 파싱 위험 |
| 정보 | 1 | Dim layer 미사용 — **규칙상 올바름** |

웹폰트 건은 원인이 명확합니다 — `.otf` 파일에 `format('woff2')`를 선언해 브라우저가 거부하고
시스템 폰트로 폴백하고 있었습니다. `[팩트]`

---

## 7. 원본에 반영이 필요한 것

| # | 항목 | 상태 |
|---|---|---|
| 1 | `#D9DDDF`(System/Input Line) 원본 편입 또는 Gray 020 흡수 | 판단 필요 |
| 2 | 16/700 — `Display 3` / `Heading 3` 용도 구분 | 판단 필요 |
| 3 | `Bottom Sheet` EFFECT 4종 9개 → 1개로 통합 | 원본 작업 |
| 4 | `coupon` COMPONENT_SET 신규 GDS 페이지 편입 | 원본 작업 |
| 5 | `3. Button` 문서의 Large 높이 표기 56 → 60 정정 | 원본 작업 |
| 6 | line-height 원본 규칙 신설 (현재 21토큰 전부 Auto) | 결정 필요 |

---

## 8. 재현 방법

이 문서의 수치는 `.fig` 재추출이 아니라 **Figma MCP 직접 조회**로 얻었습니다.
`npm run extract` 계열 스크립트로는 재현되지 않습니다.

원본 대조는 기계 검사가 대신합니다.

```bash
npm run check     # [5] 블록이 component-bottom-sheet.json 을 canon 과 대조
```

베이스 HTML은 브라우저에서 바로 열립니다. Liquid 태그(`{%- assign ... -%}`)는
Braze가 발송 시 치환하므로, 로컬에서 열면 그대로 노출되는 것이 정상입니다. `[팩트]`
