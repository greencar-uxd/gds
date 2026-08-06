# GDS — G car Design System · Foundation

원본 Figma 파일에서 **직접 측정한 값**으로 만드는 정적 디자인 시스템 사이트입니다.
손으로 적은 숫자는 없습니다 — 모든 수치는 스크립트가 계산하고 `npm run check`가 기계 검사합니다.

**외부 의존성 0개.** Node 표준 라이브러리만 씁니다.

---

## 제1원칙

> **GDS 는 Figma 파일을 기반으로 이 저장소에 선구축한다.**

### 작업 순서

```
① 원본 Figma 읽기  →  ② 저장소에서 차기 라이브러리를 만든다  →  ③ 라이브러리 반영  →  ④ Figma 원본에 덮어쓴다
                        ← 지금 여기 (①~②)                        아직 안 함
```

저장소는 **기록장이 아니라 차기 라이브러리 그 자체**입니다. 모자란 곳을 찾으면 "원본이 이러니 기록만"이 아니라
**고친 정의를 여기서 먼저 만들고**, 그다음 라이브러리 → Figma 원본 순서로 반영합니다.

그래서 이 저장소는 이렇게 동작합니다.

- 확정된 결정은 원본을 고치지 않고 **추출 결과 위에 덮어씁니다**
  (`data/color-decisions.json` · `data/type-decisions.json` → `build/canon-view.js`).
  원본이 나중에 바뀌어도 결정은 그대로 살아남고, 어긋나면 빌드가 실패합니다.
- 차기 라이브러리에 넣을 정의는 `to-be` 로 표시하고 **현재 이름을 함께 싣습니다** —
  예: 타이포 토큰의 `$extensions.gds.libraryName`(차기) / `currentLibraryName`(현재).
  반영할 때 무엇을 무엇으로 바꾸는지가 토큰만 봐도 드러납니다.
- 원본 `.fig` 자체의 오류는 **지금은 고치지 않고 기록**합니다
  (`data/color-decisions.json` 의 `sourceDefects`, 노드 ID 포함). ④ 단계에서 함께 반영합니다.
- Figma 는 **현재 읽기 전용으로만** 씁니다 — 변수 조회, 스크린샷, 변경 감지.

---

## 정본이 무엇인가 (2026-08-05 정정)

> **정본 = «GDS (그린카 디자인 시스템)» 라이브러리 + ✅ 표시된 페이지.**

원본 파일에는 라이브러리가 **6개** 물려 있습니다. 정본은 그중 하나뿐입니다.

| 라이브러리 | |
|---|---|
| **`GDS (그린카 디자인 시스템)`** | **정본** |
| `그린카 App v2.0` · `G car APP v1.0` · `(사용 X) 그린카 App` | 레거시 앱 |
| `[공유] Foundation` | 외부 시맨틱 토큰셋 (`border/*` `fill/*` `text/*` `bg/*`) |
| `작업 파일 공유` · `무버스 디자인 (피그마)` | 다른 목적 |

**색 판정 기준은 색차(ΔE)가 아니라 라이브러리 소속입니다.** GDS 라이브러리에 없으면 정본이 아니고, 레거시의 값·이름은 판단 근거로 쓰지 않습니다.

이전에는 ✅ Color system 페이지의 **스와치 그림**에서 정본을 뽑았습니다. 그림에 그려지지 않은 7종이 빠져 있었습니다 — `Badge/ODA` · `Map Marker/Active`(흰색) · `Brand/ODA Line` · `System/Dim Layer` · `System/Info Box BG` · `System/Input Line` · `Map Marker/Shadow`. **정본은 53종이 아니라 60종입니다.**

레거시 649개 스타일 기반의 통폐합 판정·orphan 묶음·`CQ-4/5/6/11` 은 전제가 레거시였으므로 **전량 철회**했습니다.

정본 인벤토리는 `data/gds-library.json`, 조회 방법은 그 파일의 `method` 에 있습니다.

---

## 디자인 시스템으로서 모자란 곳

정본을 옮겨 적는 것이 아니라, **✅ 항목이 디자인 시스템으로서 모자란 곳을 찾아 메우는 것**이 이 저장소의 일입니다. `data/gds-gaps.json` 에 기록했고 `/gds/decisions` 에서 볼 수 있습니다.

**30건 중 16건 해소 · 14건 남음**

### 메운 것 16건

| | |
|---|---|
| **`GAP-17`** | **4계층 구조 신설** — `data/gds-structure.json`. 35개 항목에 Figma 상태(`done`/`wip`/`none`)와 저장소 반영 상태(`tokens`/`docs`/`measured`/`none`)를 붙였습니다 |
| **`GAP-13`** | **Layout 토큰화** — `data/layout-tokens.json` → `--gds-layout-*` 10개. 영역 3종·버튼 동작 2종도 기록 |
| **`GAP-23`** | **색 역할 축 7종 + 시맨틱 토큰 11종** — 토큰마다 ✅ 페이지 근거를 `evidence` 로 답니다 |
| **`GAP-21`** | **`docs/GDS-uiux-guide.md` 생성** — `build/guide.js` 가 데이터에서 뽑아 씁니다 |
| **`GAP-14`** | Foundation 을 **6요소**로 확정(다수 근거). `[Foundation]` 본문의 4개 표기는 `conflict` 로 보존 |
| `GAP-4` | `Map Marker/Shadow` `#E2E2E2` → `#0000001A` 값 교체 |
| `GAP-6` | `System/Dim Layer` → `060`·`080` 분리, 8자리 HEX 출력 |
| `GAP-7` | `Navy/navy 040` → `Navy/Navy 040` 표기 통일 |
| `GAP-9` | `(X)` 폐기 표시 스타일 2종을 정본에서 제외 |
| `GAP-11` | 반경 7단계 값 실측 |
| **`GAP-1`·`GAP-2`·`GAP-3`** | **텍스트 스타일 21종 정의** — `data/typography-library.json`. 라이브러리 5종은 스타일이 아니라 **그룹**이었고 이름에 단계 번호가 빠져 충돌한 것이었습니다 |
| **`GAP-18`** | **✅ 컴포넌트를 전부 실측** — 구조도 25종의 Figma 상태는 ✅ 6 · 🚧 11 · — 8 입니다. **원본이 완성한 6종을 전부** 넣었고(✅ 중 6/6), 마지막 하나였던 `Border` ✅ 를 이번에 읽었습니다. 사이트에 **Components 섹션** 신설 |
| **`GAP-12`** | **3계층이 어디까지 서는지 확정** — 색 60+11 · 타이포 21+8 · 간격 14+Guidelines 10. **간격의 시맨틱 계층은 «없음»으로 확정**했고, 그게 우리 누락이 아니라 정본에 근거가 없어서라는 것을 `tools/spacing-census.js` 로 입증했습니다 (✅ 페이지 5곳 · 주석 192건) |
| **`GAP-27`** | **Rubik 은 정본에 없습니다** — `Typography system` ✅ 페이지 레이어 이름 3,492개 중 Rubik 0건. `TQ-6`(Noto Sans KR 단일) 유지, Picker 본문 쪽이 낡은 참조라 `SD-18` 로 기록 |

### 남은 것 15건

높음 0건 — 남은 것은 중간 10건 · 낮음 5건입니다.

중간 9건 — **✅ 페이지 간격 주석 192건 중 21건이 스케일 밖(`GAP-30`)** · 같은 값 두 이름 6쌍 · ODA 색이 Badge/Brand 로 분리 · 그림자 효과가 Elevation 밖에 9종 더 · Icon 규칙이 두 곳으로 흩어짐 · ✅ 페이지끼리 AOS/Web 폭 불일치(360 vs 365) · ✅ 인데 미해결 메모가 남은 페이지 · Bottom sheet 정의가 Picker ✅ 안에 · **Title 8단계 중 2개가 라이브러리에 없음**

낮음 5건 — `Frosted Glass` 체계 밖 · 간격 배수 열 구멍 · 목차 오타 다수 · 히스토리 파일 위치 미기록 · 색 축약 표기

### 차기 라이브러리 — 텍스트 스타일 21종

라이브러리 5종은 **스타일이 아니라 그룹**입니다. 그룹별 단계 수와 published 수가 맞아떨어집니다 — `Display` 3단계/3개, `Body` 4단계/4개. 이름에 **단계 번호가 빠져** 있어서 같은 이름이 여러 값으로 published 된 것이었습니다.

| 그룹 | 단계 | 굵기 | 현재 이름 | 차기 이름 |
|---|---|---|---|---|
| Display | 3 | Bold | `noto_sans/display/bold` | `noto_sans/display/1~3` |
| Heading | 4 | Bold | `noto_sans/heading/bold` | `noto_sans/heading/1~4` |
| Title | 8 | Medium | `noto_sans/title/medium` (6개만) | `noto_sans/title/1~8` |
| Body | 4 | Regular | `noto_sans/boby/regular` (오타) | `noto_sans/body/1~4` |
| Caption | 2 | Regular | `noto_sans/caption/regular` | `noto_sans/caption/1~2` |

굵기는 그룹이 결정하므로 이름에서 뺐습니다. 정의는 `data/typography-library.json`, 토큰에는 `$extensions.gds.libraryName`(차기) / `currentLibraryName`(현재)로 실립니다.

값 중복·표기 변형·명도 역전은 **손으로 적지 않고 스크립트가 계산**합니다.

### 타이포 시맨틱 — 쓰임새 13종 중 8종만 토큰

`Type scale` ✅ 표에는 **Usage 열**이 붙어 있습니다. 그 열을 뒤집으면 «쓰임새 → 단계» 표가 되고, 그게 타이포의 시맨틱 계층입니다. `tools/build-typography-semantic.js` 가 계산합니다 — 이름을 손으로 짓지 않습니다.

| | 쓰임새 | 정본 단계 |
|---|---|---|
| 토큰 | `Time picker_number` | Title 1 (24 / Medium) |
| 토큰 | `Time picker_date` | Title 2 (22 / Medium) |
| 토큰 | `Modal` | Title 3 |
| 토큰 | `Top app bar` · `Button_label` · `Bottom sheet` | Title 5 |
| 토큰 | `Bottom navigation_label` | Title 7 |
| 토큰 | `Badge_label` | Title 8 |
| 계열 | `Graphic` | Display 1~3 |
| 계열 | `Contents_heading` | Heading 1~4 |
| 계열 | `Contents_title` | Title 3 · 4 · 6 · 7 |
| 계열 | `Contents_body` | Body 1~4 |
| 계열 | `Contents_caption` | Caption 1~2 |

**계열은 토큰으로 굳히지 않았습니다.** 정본이 여러 단계에 같은 쓰임새를 적어 두어, 그 중 어느 단계를 고를지에 대한 규칙이 정본에 없기 때문입니다. `$notes.typeSemantic.families` 로 남깁니다.

출력은 `--gds-type-semantic-<쓰임새>-size|weight` (프리미티브를 `var()` 로 참조) 와 DTCG `semanticType` 블록입니다.

### GDS 4계층 구조 (`[Guidelines]` ✅ · `Getting started` ✅)

```
Guidelines (가이드라인) — 방향성과 기준정의의 토대
  Principle · UI/UX Guide · Layout for ios/aos/web · Component overview
Foundation (파운데이션) — 디자인의 기본 재료
  Color · Typography · Spacing · Icon · Elevation · Radius
Components (컴포넌트) — 완성형 단위
  Buttons · Bottom sheet · Input · Bottom navigation · Border · Picker · Modal · Check box … 25개
Template (템플릿) — 상위 조합 단위
  (원본에 "설명 추가 예정")
```

저장소가 쓰는 **프리미티브 → 시맨틱 → 컴포넌트 3계층은 토큰 계층**이고, 위 4계층은 **문서 계층**입니다. 둘은 별개 축이며, 이제 `data/gds-structure.json` 에 항목별 반영 상태와 함께 들어 있습니다.

**문서화 규칙도 원본에 있습니다** — 현재 사용 중인 요소는 **포함**, 사용되지 않는 요소는 **제외(히스토리 파일)**, 변경은 `As is / To be` 주석. 레거시를 판단 근거에서 빼는 것이 이 저장소만의 방침이 아니라 **정본 규칙**이었습니다.

### ✅ 페이지 본문에서 읽은 것

등록된 스타일 목록만 봐서는 안 보이던 정의입니다 — `data/gds-library.json` 의 `pages`.

| | |
|---|---|
| **반경 7단계 확정** | `xs`4 `sm`8 `md`10 `lg`12 `xl`16 `xxl`20 `full`원형. 용도까지 — 4 버튼 xsmall · 8 버튼/Input/info_box · 10 (As-is에서) 기본 · 12·16 카드 · 20 모달 팝업 |
| **Layout** | iOS `375×812` · AOS/Web `360×800` · 마진 20px 통일 · **iOS 하단만 0px**(홈 인디케이터 자동 노출 대응) · 헤더 하단 1px 라인 · 홈 인디케이터 34px · 버튼 스티키/픽스 |
| **Spacing** | 기본 단위 2px · 14단계 · 원본 이름 중복 3건(`Spacing_700`·`900`·`1000` 이 각각 두 값) |
| **Foundation 정의** | 각 요소는 서로 종속되지 않고 각자 규칙을 가지며, 단독 배치로는 맥락이 완성되지 않음 |
| **UX 라이팅 규칙** | 어투(구어체·비격식체 + 정중) · 헤더 타이틀(`~하기`/명사형) · 문장형 타이틀(하오체, 3줄 이내, **마침표 금지**) · 본문 마침표 · 플레이스홀더 · 알림 버튼명 |
| **그래픽 3단계** | `Lv.1` 시스템 아이콘(단일 정보·기능 수행) · `Lv.2` 커스텀 아이콘(설명 구조) · `Lv.3` 일러스트(상황+행동+흐름). 분류는 **정보 구조**로, 선택은 **맥락**으로, 밀도는 표현 강도. **2D 원칙 · 3D 지양** |
| **컴포넌트 정의** | 텍스트·그래픽·인터랙션 요소가 결합되어 하나의 기능 또는 정보를 전달하는 UI 단위 |
| **색 역할 축** | `Primary`=Red · `Secondary`=Gray(보조·지지) · `Tertiary`=Navy(리브랜딩 이전 Secondary). 브랜드 속성 **Clean · Comfort · Easy** |
| **색 용도 규칙** | **텍스트는 모두 Gray scale 이 원칙** · **Navy 는 뱃지·지도 핀처럼 색 자체가 정보인 요소에만**, 그 외 폰트·컴포넌트는 Gray scale |
| **Modal** | `Alert`(정보 전달·확인 하나) / `Confirm`(선택 필요·확인+취소). 구조 `Top · Body · Action`. **기본 알럿 = Dim layer 1 · 풀스크린 알럿 = Dim layer 2** — CQ-9 로 나눈 `060`/`080` 의 용도가 여기 있습니다. 텍스트 박스 327px, 딤 내부 마진 24px |
| **Checkbox** | `Icon`(박스 24×24) / `Capsule`(박스 16×16), 체크 아이콘 **9×12 통일**. 형태 `basic`·`round`·`with text` |
| **Bottom navigation** | 높이 **70** · 상단 여백 20 · 아이콘 32×32(굵기 1.5) · 아이콘–레이블 간격 4 · 레이블 `Caption 2`. 미선택 `Gray 040` / 선택 `Gray 080` |
| **Picker** | `Time picker`(스크롤로 시간 선택) / `Calendar picker`(달력으로 날짜 선택). 하위 컴포넌트 `Picker icon button` |
| **Bottom sheet** | 정의·구조가 **Picker ✅ 안에** 있습니다 — 페이징 없이 현재 화면에서 조작을 끝낼 때. `Top·Body·Action`, Action 은 `Button` 또는 `Button + Text button`. `Elevation_Bottom sheet` 사용 |

---

## 문서 사이트 설계 — 레퍼런스 21곳을 직접 열어 보고 (2026-08-06)

강민관이 준 목록 + 그린카 공식 사이트를 **Claude in Chrome 으로 실제로 열어** 기록했습니다. 추측이 아니라 화면에서 본 것과 페이지에서 `getComputedStyle` 로 뽑은 값만 적었습니다 — `data/reference-sites.json`.

브라우저 도메인 정책으로 **4곳은 열리지 않았습니다** — Adobe Spectrum · 토스 · LINE · Mews. 나머지 17곳을 봤습니다.

### 공통으로 하고 있던 것

| | 어디서 봤나 |
|---|---|
| **네비는 영문, 본문은 한글** | SOCAR · Gmarket · KT · 코드잇 · 11번가 — 국내 다섯 곳이 전부 |
| **제품명 옆에 버전** | SOCAR(칩) · KT/신한(드롭다운) · Gmarket(사이드바 바닥) · Workday |
| **크롬에는 브랜드색을 쓰지 않는다** | 11번가 · KT · Workday · Fluent · Gmarket |
| **상단 가로 네비 + 좌측은 그 섹션 안만** | KT · KRDS · 신한 · BBC |
| **사이드바 최상단에 Filter/Search** | Apple · Shopify · Fluent · Gmarket |
| **상위 페이지는 목차가 아니라 카드 그리드** | Apple · Skyscanner · Gmarket · 신한 · 11번가 |
| **제목 밑 고정 메타 3줄** | Workday(`Version · Sources · Install`) |
| **항목마다 버전·갱신일** | BBC GEL · Gmarket |

### 그린카 공식 사이트에서 확인한 것 (팩트)

`getComputedStyle` 집계 결과입니다.

- 기업 아이덴티티는 **네이비 + 그린**입니다. 빨강이 한 번도 나오지 않습니다 — `#133B55` · `#00C88C` · `#00DC9A`
- **`#00C88C` 는 GDS 정본 `System/Success` 와 HEX 가 같습니다.**
- 본문 서체는 **Pretendard**, 라틴은 **Outfit** 입니다. GDS 정본 서체(`TQ-6` Noto Sans KR)와 다릅니다 — 다른 표면이므로 충돌은 아닙니다. **문서 사이트는 정본 Noto Sans KR 을 그대로 씁니다** (`TQ-8` 확정 2026-08-06). 견본이 정본과 다른 글꼴로 렌더되면 문서가 스스로를 반증하기 때문입니다.

### 그래서 고친 것

| 무엇이 문제였나 | 어떻게 고쳤나 |
|---|---|
| **히어로가 전면 빨강 그라디언트**, 활성 표시가 빨강 알약. 면적이 과했습니다 | 히어로는 종이 배경 + 정본 색 띠 한 줄로. **크롬 accent 는 빨강 유지** — `Primary/Red 040`(메인 색) · `010`, 다크는 `030` · `080`. G car 의 디자인 시스템이므로 G car 메인 색을 씁니다 (강민관 확정 2026-08-06). 레퍼런스 다섯 곳은 크롬에 브랜드색을 안 쓰지만, 그것과 다른 선택을 한 것입니다 |
| **사이드바 한 단**. 컴포넌트 25종이 들어오면 못 버팁니다 | **2단** — 가로 `Get started · Foundation · Semantic · Guidelines` + 좌측은 그 섹션 안만 |
| **버전 표기 없음** | 제품명 옆 칩 `v0.1.0 · 2026-07-23` |
| **검색 없음** | `/` 또는 `⌘K` 찾기 팔레트. 페이지 + 색 60 + 타이포 21 + 간격 14 + Layout 10 + 시맨틱 19 를 한 색인에서 찾고, Enter 로 이동 + 변수명 복사 |
| **근거 표기 위치가 페이지마다 달랐음** | 제목 밑 **«출처 · 근거 · 토큰 · 갱신»** 고정 4줄 (Workday 형태) |
| 메뉴명이 한글 | UI 크롬 영문 · 본문 한글 (국내 다섯 곳과 같은 형태) |

브라우저에서 그려지는 페이지라 문법 오류 하나면 전체가 빈 화면이 됩니다. 인라인 스크립트를 **실행하지 않고 파싱만** 하는 검사와, 네비 항목 ↔ 뷰 함수 1:1 검사를 넣었습니다. 검증 **237개**.

---

## 간격에는 왜 시맨틱 계층이 없는가 (2026-08-06)

색과 타이포에는 정본에 **«쓰임새 → 값» 표**가 있습니다.

- 색 — `Color system` ✅ 본문의 역할 규칙 → 시맨틱 11종
- 타이포 — `Type scale` ✅ 표의 **Usage 열** → 시맨틱 8종 + 계열 5종

**간격에는 그 표가 없습니다.** `Spacing system` ✅ 표의 열은 `Spacing` · `px` · `배수` 셋뿐입니다.

그래서 «우리가 안 만든 것»이 아니라 «정본에 없는 것»임을 조사로 확인했습니다 — `tools/spacing-census.js`.

원본 ✅ 컴포넌트 페이지에는 디자이너가 간격 자리마다 **`Spacing` 이라는 이름의 주석 프레임**을 깔아 두었습니다. 그 프레임의 짧은 변이 곧 간격 값입니다. 5곳에서 **192건**을 기계로 읽었습니다.

| | |
|---|---|
| 조사한 ✅ 페이지 | Buttons · Checkbox · Bottom navigation · Modal · Picker |
| 주석 | **192건** · 값 19종 |
| 스케일 안 | 171건 — `20`(61) · `24`(35) · `8`(28) · `16`(21) · `4`(10) · `32`(7) · `28`(6) · `12`(3) |
| 스케일 밖 | **21건 · 11종** — `7` `13` `19` `29` `31` `34` `42` `50` `78` `80` `190` → **`GAP-30`** |
| 읽지 못함 | 말풍선 17건 — 컴포넌트 인스턴스라 라벨 숫자가 metadata 에 안 나옵니다. **값으로 세지 않았습니다** |

**값은 나오지만 이름이 하나도 없습니다.** 담고 있는 프레임 이름도 대부분 `Group 2147227…` 같은 자동 이름입니다. 없는 이름을 지어내면 그 순간 이 문서는 정본이 아니라 추측이 됩니다.

그래서 간격은 **프리미티브 14 + Guidelines 10**(`Layout` ✅)까지만 서고, 시맨틱 계층은 «없음»으로 확정합니다. 그 사실과 근거를 토큰 파일 `$notes.spacingSemantic` 에도 싣습니다.

조사 방법의 한계도 같이 적어 둡니다 — 띠와 말풍선을 태그로 구분하는데, 처음에는 말풍선의 라벨 상자 크기(23×32 등)를 간격으로 잘못 읽어 «스케일 밖 12종»이라는 틀린 수를 냈습니다. 인스턴스는 값으로 세지 않도록 고쳤고, 그 규칙을 `check.js` 가 봅니다.

---

## 컴포넌트는 몇 개까지 왔나 (2026-08-06)

`GAP-18` 은 «Components 25개 중 실측 6개»였습니다. 그 수가 **무엇을 세는 수인지**부터 갈랐습니다.

| Figma 상태 | 수 | 저장소 |
|---|---|---|
| ✅ 완성 | **6** | **6종 전부 실측** |
| 🚧 작업 중 | 11 | `Bottom sheet` 1종만 (Picker ✅ 안에서 읽힌 만큼) |
| — 시작 전 | 8 | 없음 |

**원본이 완성한 컴포넌트는 6종뿐입니다.** 그 6종을 전부 넣었습니다. 마지막 하나였던 `Border` ✅ 는 ✅ 인데 저장소에 없던 유일한 컴포넌트였고, 이번에 `Line`/`Divider` 의 정의·두께(1px)·폭(소속 영역 100% / Device width)·높이(8px)·컬러 쓰임(Gray scale 20 = 강조, 10 = 구분)까지 읽어 넣었습니다.

**남은 19종은 우리 누락이 아닙니다.** 원본이 아직 🚧 이거나 시작 전이라 저장소가 먼저 만들 수 없습니다. 지어내지 않고 «원본 대기»로 표시합니다.

`tools/build-components.js` 가 매번 **«✅ 인데 저장소에 없는 것»** 을 세고, **0이 아니면 `check.js` 가 실패**합니다 — 원본이 새 컴포넌트를 ✅ 로 올리는 순간 빌드가 우리에게 숙제를 알려 줍니다.

사이트에 **Components 섹션**을 만들어 25종 목록과 실측 7종의 구조·치수·상태·컬러·간격 주석을 실었습니다. ✅ 인데 미해결 메모가 남은 컴포넌트(`Checkbox` 2건 · `Bottom navigation` 1건)는 해당 컴포넌트 바로 아래에 경고로 보입니다.

---

## 빠른 시작

```bash
npm run build     # data/ + site/ → dist/index.html
npm run check     # 기계 검증 (실패 시 exit 1)
open dist/index.html
```

`npm install`은 필요 없습니다. 의존성이 없습니다.

**Node 22.15 이상**이 필요합니다 — `.fig` 문서 블록이 zstd로 압축돼 있어
`zlib.zstdDecompressSync`를 씁니다.

---

## 원본이 바뀌었을 때

Figma에서 `.fig`를 새로 내려받은 뒤:

```bash
# .fig 는 zip 입니다. 안의 canvas.fig 를 꺼내 저장소 루트에 둡니다
unzip -o "GDS(Greencar Design System).fig" canvas.fig

npm run extract   # canvas.fig → data/foundation-data.json
npm run build
npm run check
```

`canvas.fig`는 `.gitignore`에 있습니다. **원본 파일은 커밋하지 않습니다** (17MB).
저장소에는 추출된 `data/foundation-data.json`(약 110KB)만 들어갑니다.

다른 위치의 파일을 쓰려면 `FIG_PATH`로 넘깁니다.

```bash
FIG_PATH=~/Downloads/_gds_tmp/canvas.fig npm run extract
```

---

## 폴더 구조

```
tools/figdec/     자체 제작 .fig 디코더 (외부 의존성 0)
  kiwi.js           kiwi 바이너리 스키마·메시지 디코더 + zstd/deflate 자동 판별
  index.js          공용 인덱스 빌더 — 모든 측정 스크립트가 공유(수치 불일치 방지)
  foundation.js     색·타이포·그림자·반경 추출 → data/foundation-data.json
  r3_impact.js      표 B 대비 마스터 반경 대조 → docs/r3-change-list.csv
  census_radius.js  반경 전역 census

data/             추출된 측정 데이터 (커밋 대상)
site/canon.html     사이트 템플릿 — __DATA__ 자리에 JSON 이 주입됩니다
build/canon-view.js 정본(GDS 라이브러리) + 확정 결정을 합친 단일 뷰
build/site.js       canon.html + data → dist/index.html
build/check.js      기계 검증
docs/               결정 기록·측정 결과
.github/workflows/  push → 빌드 → 검증 → Pages 배포
```

---

## 근거 표기 규약

문서·사이트 어디서나 아래 4가지를 문장 단위로 구분해 표기합니다.

| 태그 | 의미 |
|---|---|
| `[팩트]` | 측정·확인된 것 |
| `[해석]` | 근거에서 내린 판단 |
| `[추론]` | 근거는 있으나 미확인 |
| `[미확인]` | 검증 수단이 없는 것 |

이전 문서의 수치가 재현되지 않으면 **"틀렸다"고 단정하지 않고 재현 안 됨을 그대로 노출**하고 실측치를 병기합니다.

---

## 확정된 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 색 체계 | Primary = Red | 사용자 직접 확인 |
| 대상 플랫폼 | 웹 + 앱(iOS · Android) | — |
| 토큰 구조 | 프리미티브 → 시맨틱 → 컴포넌트 3계층 | 컴포넌트의 프리미티브 HEX 직접 바인딩 금지 |
| **문서 구조** | **Guidelines → Foundation → Components → Template 4계층** — 토큰 계층과 별개 축 | 2026-08-05 · `[Guidelines]` ✅ 구조도 |
| **색 역할 축** | **Primary=Red · Secondary=Gray · Tertiary=Navy** · 텍스트는 Gray scale 원칙 | 2026-08-05 · `Color system` ✅ 본문 |
| R-1 | 로컬 7단계 반경 스케일 `4/8/10/12/16/20/원형` | 2026-07-27 승인 |
| **R-3** | **반경 상한 20px (표 B 채택)** | **2026-07-29 확인** |
| **E-2** | **Elevation 6단계 재넘버링** — 구 1~5 → 2~6, 신규 1단계 추가(X0 Y1 blur2 spread0 #000000 15%) | **2026-07-29 확인.** ⚠ "불투명도 15% 일괄 적용"은 오독이었습니다 — 15%는 새 1단계 한 단계의 값입니다 |
| **색 단계 규칙** | **3자리 10단위 (010~100)** — `Primary/Red 300·400·500` → `030·040·050` | 2026-08-04 강민관 |
| **Primary 메인** | **`Primary/Red 040` (`#F14950`)** — 정본 설명문대로. 브랜드 레드 `#ED1C24` 와는 다른 값 | 2026-08-04 강민관 |
| **메인 색 접근성** | **별도 처리 없음** — 흰 배경 3.62:1 로 본문 AA 미달이나 그대로 사용 | 2026-08-04 강민관 |
| **정본 기준** | **«GDS (그린카 디자인 시스템)» 라이브러리 + ✅ 페이지** — 레거시 라이브러리는 판단 근거에서 배제 | 2026-08-05 강민관 |
| **정본 폰트** | **Noto Sans KR 단일** | 2026-08-04 강민관 |
| **행간** | **Figma Auto** — 배수·px 정의하지 않음. 웹 `line-height: normal` | 2026-08-04 팀 합의 |
| **타이포 구분축** | **용도(Usage)** — 크기·굵기가 같은 4쌍은 쓰이는 자리로 구분 | 2026-08-04 강민관 |
| **Navy 090 / 100** | **값 교체** — 090 `#060809` · 100 `#020609`. 명도 역전 정정 | 2026-08-04 강민관 |
| **자간** | **0 단일** — 단계별로 자간을 따로 두지 않음 | 2026-08-05 · Figma 변수 `typo/letter-spacing/0` |
| **변수 처분** | `Gcar_logo_text`·`Gcar_color`·`Map marker_Shadow`·`color/text/bolder` 전부 폐기 — 라이브러리에 published 된 스타일이 아니거나 외부 소유 | 2026-08-05 |
| **CQ-9** 알파 토큰화 | **A 채택** — `System/Dim Layer 060`(`#00000099`) · `080`(`#000000CC`) 신설, `Info Box BG` 는 060 으로 흡수 | 2026-08-05 |
| **CQ-10** 역할 별칭 | **C 채택** — `color/text/bolder` 는 외부 라이브러리 «[공유] Foundation» 소유라 복제하지 않습니다 | 2026-08-05 |
| **`Map Marker/Shadow`** | **값 교체** `#E2E2E2` → `#0000001A` — 그림자는 알파여야 겹침에서 맞습니다 (GAP-4) | 2026-08-05 |
| **`Navy/navy 040`** | **표기 통일** → `Navy/Navy 040` (GAP-7) | 2026-08-05 |

사이트도 정본 폰트로 렌더됩니다 — `build/font.js` 가 빌드 시 모든 페이지의 본문 폰트 선언을 정본으로 교체하고, `assets/fonts/` 의 서브셋 woff2(weight 당 약 40 KB)를 base64 로 임베드합니다. 외부 폰트 요청은 없습니다. 서브셋 재생성은 `tools/font/README.md` 참고 — `npm run check` 의 `서브셋 글리프 누락 없음` 이 실패하면 필요합니다.
| 빌드 의존성 | Node 표준 라이브러리만 | 외부 패키지 의도적 미설치 |

확정 결정의 기계 판독본은 `data/color-decisions.json` · `data/type-decisions.json` 입니다. 원본 `.fig` 를 편집하지 않으므로, 이 파일들이 추출 결과 위에 덮어써집니다(`build/canon-view.js`). 열려 있는 안건은 같은 파일의 `open` 배열과 `/gds/decisions` 페이지에 있습니다.

### 감사 · 결정 안건

```bash
npm run build    # 정본 사이트 + /gds/decisions
npm run check    # 정본·결정·산출물 기계 대조 (167개 항목)
```

| 산출물 | 내용 |
|---|---|
| `/gds/decisions` | 결정 기록 — 정본 기준 · 확정 결정 · 모자란 곳 12건 |
| `data/gds-library.json` | 정본 인벤토리 — GDS 라이브러리 60종 + 효과·텍스트·반경 |
| `data/gds-gaps.json` | 디자인 시스템으로서 모자란 곳 — 해소·미해소 상태 포함 |
| `data/gds-structure.json` | GDS 4계층 구조 + 항목별 Figma/저장소 반영 상태 |
| `data/layout-tokens.json` | Layout 토큰 (Guidelines 계층) |
| `data/typography-library.json` | 차기 라이브러리 텍스트 스타일 21종 (생성물) |
| `data/typography-semantic.json` | 타이포 시맨틱 — 토큰 8 · 계열 5 (생성물) |
| `data/reference-sites.json` | 레퍼런스 디자인 시스템 17곳 + 그린카 공식 사이트 관찰 기록 |
| `data/spacing-census.json` | ✅ 페이지 간격 주석 192건 조사 (생성물) |
| `data/components.json` | 컴포넌트 25종 목록 + 실측 7종 (생성물) |
| `docs/GDS-uiux-guide.md` | UX 라이팅 규칙 + 그래픽 3단계 (생성물) |
| `docs/GDS-typo-v0.2.md` | 타이포 정리안 |

---

## 컴포넌트 — Buttons (2026-08-05)

Foundation 이 닫혀 첫 컴포넌트로 `Buttons (버튼) ✅` 페이지를 실측했습니다. 결과는 `data/component-buttons.json`.

**버튼 8종** — Default · Icon · Text · Floating action · Capsule · Split · List · Thumbnail

**원본은 이미 3계층을 씁니다.** README 확정 결정의 "프리미티브 → 시맨틱 → 컴포넌트 3계층"이 원본에서 실제로 구현돼 있는 것을 확인했습니다.

```
Components/Buttons/Default/Primary
  → Semantic/Color/Background/Filled/{Default · Pressed · Disabled}
Components/Buttons/Default/Secondary
  → Semantic/Color/Background/Outlined/{Default · Pressed · Disabled}
```

**실측으로 드러난 것 3가지**

| | |
|---|---|
| 반경 변수 존재 | 라이브러리에 `Radius/xs·sm·md·lg·xl·xxl·full` **7단계**가 있습니다. R-1 의 7단계와 개수는 같고 이름 체계가 다릅니다 (GAP-11) |
| **Elevation_2 확인** | 원본 변수값이 저장소 값과 **정확히 일치**(2겹). 지금까지 추론이던 것이 팩트가 됐습니다 |
| 행간 | 고정 px 를 쓰던 `Text styles/*` 는 **레거시 라이브러리 소속**이라 무시합니다. 정본 `noto_sans/*` 는 `lineHeight 100` — `TQ-7` **확정: `Auto` 유지** |

---

## 이 사이트가 보여주는 것 / 보여주지 않는 것

**보여주는 것** — 원본 `.fig`의 **현재 상태**입니다. 색 스타일 649개, 타이포 254개는
정리가 끝난 값이 아니라 **정리 대상 현황**입니다. 649개 중 고유 색은 138개뿐이고
511개가 같은 값의 중복입니다.

**보여주지 않는 것** — 확정된 GDS 토큰 273개(프리미티브 113 · 시맨틱 56 · 컴포넌트 104)는
아직 이 저장소에 없습니다. `tokens/`가 들어오면 각 섹션에 「정본」 축이 추가됩니다.

**반경·엘리베이션만** 회의 결정이 반영된 정본입니다.

---

## 제약

- **Figma 원본은 쓰지 않습니다.** 제1원칙에 따라 원본 `.fig` 수정은 이 작업의 범위가 아닙니다.
  2026-08-05 부터 읽기 권한은 Full seat 이지만 읽기로만 씁니다.
  원본 수정이 필요해 보이는 항목은 근거와 함께 기록까지만 하고, 반영 여부·시점은 디자인팀이 판단합니다.
- `build/check.js`의 앵커 값(`nodeChanges` 192,610 등)은 **원본이 바뀌면 함께 갱신**해야 합니다.
  의도치 않은 변화를 잡기 위한 장치이므로, 갱신할 때는 왜 바뀌었는지 커밋 메시지에 남깁니다.

---

## GitHub Pages 켜기 (최초 1회)

1. 저장소 → **Settings → Pages**
2. **Source**를 `GitHub Actions`로 변경
3. `main`에 push하면 자동 배포됩니다

PR에서는 빌드·검증만 돌고 배포는 하지 않습니다.
