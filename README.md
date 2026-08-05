# GDS — 그린카 디자인 시스템 Foundation

원본 Figma 파일에서 **직접 측정한 값**으로 만드는 정적 디자인 시스템 사이트입니다.
손으로 적은 숫자는 없습니다 — 모든 수치는 스크립트가 계산하고 `npm run check`가 기계 검사합니다.

**외부 의존성 0개.** Node 표준 라이브러리만 씁니다.

---

## 제1원칙

> **GDS 는 Figma 파일을 기반으로 이 저장소에 선구축한다.**

우선순위는 **원본 Figma 파일을 읽어 저장소에 정리하는 것**입니다. 원본 `.fig` 를 고치는 일은
이 작업의 일부가 아닙니다 — 읽기 권한이 있든 없든 마찬가지입니다.

그래서 이 저장소는 이렇게 동작합니다.

- 확정된 결정은 원본을 고치지 않고 **추출 결과 위에 덮어씁니다**
  (`data/color-decisions.json` · `data/type-decisions.json` → `build/canon-view.js`).
  원본이 나중에 바뀌어도 결정은 그대로 살아남고, 어긋나면 빌드가 실패합니다.
- 원본 `.fig` 자체의 오류는 **고치지 않고 기록만** 합니다
  (`data/color-decisions.json` 의 `sourceDefects`, 노드 ID 포함).
  원본 반영 여부는 디자인팀이 별도로 판단할 사안이지 이 저장소의 대기 작업이 아닙니다.
- Figma 는 **읽기 전용으로만** 씁니다 — 변수 조회, 스크린샷, 변경 감지.

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
site/template.html  사이트 템플릿 — __DATA__ 자리에 JSON 이 주입됩니다
build/site.js       template + data → dist/index.html
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
| R-1 | 로컬 7단계 반경 스케일 `4/8/10/12/16/20/원형` | 2026-07-27 승인 |
| **R-3** | **반경 상한 20px (표 B 채택)** | **2026-07-29 확인** |
| **E-2** | **Elevation 6단계 재넘버링** — 구 1~5 → 2~6, 신규 1단계 추가(X0 Y1 blur2 spread0 #000000 15%) | **2026-07-29 확인.** ⚠ "불투명도 15% 일괄 적용"은 오독이었습니다 — 15%는 새 1단계 한 단계의 값입니다 |
| **색 단계 규칙** | **3자리 10단위 (010~100)** — `Primary/Red 300·400·500` → `030·040·050` | 2026-08-04 강민관 |
| **Primary 메인** | **`Primary/Red 040` (`#F14950`)** — 정본 설명문대로. 브랜드 레드 `#ED1C24` 와는 다른 값 | 2026-08-04 강민관 |
| **메인 색 접근성** | **별도 처리 없음** — 흰 배경 3.62:1 로 본문 AA 미달이나 그대로 사용 | 2026-08-04 강민관 |
| **색 통폐합 기준** | **✅ Color system 정본에 명시된 값·이름** | 2026-08-04 강민관 |
| **정본 폰트** | **Noto Sans KR 단일** | 2026-08-04 강민관 |
| **행간** | **Figma Auto** — 배수·px 정의하지 않음. 웹 `line-height: normal` | 2026-08-04 팀 합의 |
| **타이포 구분축** | **용도(Usage)** — 크기·굵기가 같은 4쌍은 쓰이는 자리로 구분 | 2026-08-04 강민관 |
| **Navy 090 / 100** | **값 교체** — 090 `#060809` · 100 `#020609`. 명도 역전 정정 | 2026-08-04 강민관 |
| **자간** | **0 단일** — 단계별로 자간을 따로 두지 않음 | 2026-08-05 · Figma 변수 `typo/letter-spacing/0` |
| **미문서 변수 처분** | `Gcar_logo_text` → `Brand/G car Logo Text` 편입 · `Map marker_Shadow` → `Map Marker/Shadow` 편입(알파 10%) · `Gcar_color` 폐기(= `Brand/G car Red`) | 2026-08-05 · 확정된 표기·통폐합 규칙 적용 |

사이트도 정본 폰트로 렌더됩니다 — `build/font.js` 가 빌드 시 모든 페이지의 본문 폰트 선언을 정본으로 교체하고, `assets/fonts/` 의 서브셋 woff2(weight 당 약 40 KB)를 base64 로 임베드합니다. 외부 폰트 요청은 없습니다. 서브셋 재생성은 `tools/font/README.md` 참고 — `npm run check` 의 `서브셋 글리프 누락 없음` 이 실패하면 필요합니다.
| 빌드 의존성 | Node 표준 라이브러리만 | 외부 패키지 의도적 미설치 |

확정 결정의 기계 판독본은 `data/color-decisions.json` · `data/type-decisions.json` 입니다. 원본 `.fig` 를 편집하지 않으므로, 이 파일들이 추출 결과 위에 덮어써집니다(`build/canon-view.js`). 열려 있는 안건은 같은 파일의 `open` 배열과 `/gds/decisions` 페이지에 있습니다.

### Figma 원본 대조 (2026-08-05)

회사 계정 재연결로 Greencar 팀 **Full seat** 를 확보해 원본 변수를 전수 조회했습니다. **읽기만 사용합니다** — 원본 `.fig` 는 쓰지 않기로 했습니다(강민관 지시 2026-08-05).

| | |
|---|---|
| Figma 변수 | 60종 |
| 기존 정본 | 53종 |
| 값 불일치 | **0건** — 정본 추출은 정확했습니다 |
| 문서화 안 된 변수 | 7종 (색 6 · 자간 1) |

### 타이포 · 간격 · 엘리베이션 대조 (2026-08-05)

색과 같은 방식으로 나머지 Foundation 도 ✅ 페이지의 정의 표를 직접 읽어 대조했습니다. 결과는 `data/figma-foundation-sync.json`.

| 영역 | 판정 |
|---|---|
| 타이포그래피 | **21/21 완전 일치** — 이름·굵기·크기·행간(Auto)·용도 전부 |
| 간격 | **값 14/14 일치** — 원본은 이름 중복 3건, 저장소가 `Spacing_0~1300` 순차로 해소 |
| 엘리베이션 | **체계 상이** — 원본 문서는 `Level 0~5`(Material 인용 개념도), 저장소는 `Elevation_1~6`(그림자 스타일 실측) |

대조 중 발견한 것이 `TQ-6` 안건으로 열려 있습니다 — 정본은 Time picker 숫자를 `Title 1`(Noto Sans KR 24px)로 잡는데, 파일 안 다른 페이지와 레거시 스타일에는 **Rubik 50px** 이 실재합니다.

조회 응답 원본은 `data/figma-variables.json` 에 그대로 저장돼 있고, `npm run check` 의 `[8]` 절이 결정 파일과 이 스냅샷을 대조합니다 — 결정이 실재하지 않는 변수를 가리키거나 값이 어긋나면 빌드가 실패합니다.

원본 `.fig` 자체의 오류 15건(스와치 캡션 HEX 오류 2건, `Success` 이름 중복, `#00000` 5자리 오타 3곳, 복붙 잔재 레이어명, `Info_Box` 스와치 값 미적용)은 `data/color-decisions.json` 의 `sourceDefects` 에 노드 ID 와 함께 기록만 해 뒀습니다. 토큰 값에는 영향이 없습니다.

### 감사 · 결정 안건

```bash
npm run audit    # 색·타이포 감사 + 통폐합 매핑 + 문서 생성
npm run build    # 정본 사이트 + 진단 + /gds/decisions
npm run check    # 문서 수치 ↔ 감사 데이터 기계 대조
```

| 산출물 | 내용 |
|---|---|
| `/gds/decisions` | 결정 안건 브리핑 — 확정된 것과 아직 정해야 할 것 |
| `docs/GDS-color-naming-v0.1.md` | 색 명명 규칙 진단 + 규칙안 |
| `docs/GDS-color-merge-v0.1.md` | 정본 기준 통폐합 전수 판정 |
| `docs/GDS-typo-v0.2.md` | 타이포 정리안 |
| `docs/color-merge-map.csv` | 레거시 색 스타일 → 정본 토큰 전수 매핑 |
| `data/orphan-clusters.json` | CQ-6 보조 — 정본에 없는 색을 묶음 단위로 판단하도록 분류 |

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
| 반경 변수 존재 | 원본에 `Radius/sm`=8 · `Radius/xl`=16 · `Radius/xxl`=20 이 있습니다. 저장소는 숫자 스케일이라 이름 체계가 다릅니다 |
| **Elevation_2 확인** | 원본 변수값이 저장소 값과 **정확히 일치**(2겹). 지금까지 추론이던 것이 팩트가 됐습니다 |
| 행간 충돌 | 원본 타이포 변수에 `100` · 고정 px · 배수 `1.5` 세 방식이 공존 — 확정한 `Auto` 와 다릅니다 → `TQ-7` |

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
