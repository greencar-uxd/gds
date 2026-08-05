# GDS 타이포 정본 (v0.2)

> **정본 21단계가 유일한 기준입니다.** 레거시 텍스트 스타일은 정본으로 통폐합될 대상이라 이 문서의 판단 근거가 아닙니다.
> **근거.** `GDS(Greencar Design System).fig` (export 2026-07-23) 실측 + 정본 Typography system 페이지의 Usage 열.
> **생성.** `npm run audit`

---

## 1. 확정된 것

| 항목 | 값 | 반영 |
|---|---|---|
| 폰트 | **Noto Sans KR 단일** | `--gds-font-family` · `$gds-font-family` · DTCG `type.*.$value.fontFamily` |
| 행간 | **Figma Auto** (웹 `line-height: normal`) | `--gds-type-line-height` |
| 단계 | **21단계** | `--gds-type-{토큰}-size` / `-weight` |
| 구분축 | **용도(Usage)** — 크기·굵기가 같아도 쓰이는 자리로 구분 | CSS 주석 · DTCG `$extensions.gds.usage` |

전부 강민관 확정 2026-08-04.

---

## 2. 정본 21단계

| 토큰 | 굵기 | 크기 | 행간 | 용도 |
|---|---|---|---|---|
| `Display 1` | Bold(700) | 24px | Auto | Graphic |
| `Title 1` | Medium(500) | 24px | Auto | Time picker_number |
| `Title 2` | Medium(500) | 22px | Auto | Time picker_date |
| `Display 2` | Bold(700) | 20px | Auto | Graphic |
| `Title 3` | Medium(500) | 20px | Auto | Contents_title · Modal |
| `Heading 1` | Bold(700) | 20px | Auto | Contents_heading |
| `Title 4` | Medium(500) | 18px | Auto | Contents_title |
| `Heading 2` | Bold(700) | 18px | Auto | Contents_heading |
| `Display 3` | Bold(700) | 16px | Auto | Graphic |
| `Title 5` | Medium(500) | 16px | Auto | Top app bar · Button_label · Bottom sheet |
| `Body 1` | Regular(400) | 16px | Auto | Contents_body |
| `Heading 3` | Bold(700) | 16px | Auto | Contents_heading |
| `Title 6` | Medium(500) | 14px | Auto | Contents_title |
| `Body 2` | Regular(400) | 14px | Auto | Contents_body |
| `Heading 4` | Bold(700) | 14px | Auto | Contents_heading |
| `Caption 1` | Regular(400) | 12px | Auto | Contents_caption |
| `Body 3` | Regular(400) | 12px | Auto | Contents_body |
| `Title 7` | Medium(500) | 12px | Auto | Contents_title · Bottom navigation_label |
| `Caption 2` | Regular(400) | 10px | Auto | Contents_caption |
| `Title 8` | Medium(500) | 10px | Auto | Badge_label |
| `Body 4` | Regular(400) | 10px | Auto | Contents_body |

---

## 3. 크기·굵기가 같은 4쌍 — 용도로 구분합니다

폰트가 단일이고 행간이 Auto 로 통일돼 있어, 이 4쌍은 **값만 보면 구분되지 않습니다.** 용도가 유일한 구분축입니다.

| 스펙 | 토큰 | 용도 |
|---|---|---|
| 20px / 700 | `Display 2` | Graphic |
|  | `Heading 1` | Contents_heading |
| 16px / 700 | `Display 3` | Graphic |
|  | `Heading 3` | Contents_heading |
| 12px / 400 | `Caption 1` | Contents_caption |
|  | `Body 3` | Contents_body |
| 10px / 400 | `Caption 2` | Contents_caption |
|  | `Body 4` | Contents_body |

개발자가 값으로 고르면 안 되고 **자리로 골라야 합니다** — 그래픽 영역이면 `Display`, 반복되는 구역 머리글이면 `Heading`, 본문이면 `Body`, 캡션이면 `Caption`.

---

## 4. 플랫폼 대응

| 플랫폼 | 폰트 | 행간 |
|---|---|---|
| 웹 | `font-family: "Noto Sans KR", sans-serif` | `line-height: normal` |
| iOS | Noto Sans KR | 폰트 메트릭 기본값 |
| Android | Noto Sans KR | 폰트 메트릭 기본값 |

폰트가 하나로 고정됐으므로 메트릭도 하나입니다 — 플랫폼 간 행간이 갈릴 여지가 줄어듭니다. `[해석]`

---

## 5. 확인하지 못한 것 `[투명성]`

1. **자간(letterSpacing)은 정본에 정의가 없습니다** (정의 0건). 용도로 구분이 되므로 당장 막히지는 않지만, 값 차원의 구분이 필요해지면 여기부터 정해야 합니다.
2. **정본 단계별 실사용 횟수를 세지 않았습니다** `[미확인]`.
3. `.fig` 스냅샷 2026-07-23 기준입니다.
4. 정본 페이지에는 원래 폰트·용도 지정이 없었고, 이번 결정으로 채웠습니다 — 원본 `.fig` 반영은 디자인팀 몫입니다.
