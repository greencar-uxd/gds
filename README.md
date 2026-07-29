# GDS — 그린카 디자인 시스템 Foundation

원본 Figma 파일에서 **직접 측정한 값**으로 만드는 정적 디자인 시스템 사이트입니다.
손으로 적은 숫자는 없습니다 — 모든 수치는 스크립트가 계산하고 `npm run check`가 기계 검사합니다.

**외부 의존성 0개.** Node 표준 라이브러리만 씁니다.

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
| **R-3** | **반경 상한 20px (표 B 채택)** | **2026-07-28 회의** |
| **E-2** | **그림자 불투명도 15%** | **2026-07-28 회의** |
| 빌드 의존성 | Node 표준 라이브러리만 | 외부 패키지 의도적 미설치 |

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

- **Figma 권한은 View 전용입니다.** 원본 수정이 필요한 항목은 목록·제안까지만 만들고,
  실제 반영(마스터 통합, 노드 삭제, 라벨 수정 등)은 디자인팀이 원본에서 직접 합니다.
- `build/check.js`의 앵커 값(`nodeChanges` 192,610 등)은 **원본이 바뀌면 함께 갱신**해야 합니다.
  의도치 않은 변화를 잡기 위한 장치이므로, 갱신할 때는 왜 바뀌었는지 커밋 메시지에 남깁니다.

---

## GitHub Pages 켜기 (최초 1회)

1. 저장소 → **Settings → Pages**
2. **Source**를 `GitHub Actions`로 변경
3. `main`에 push하면 자동 배포됩니다

PR에서는 빌드·검증만 돌고 배포는 하지 않습니다.
