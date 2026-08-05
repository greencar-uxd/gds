# GDS 색 통폐합 매핑 (v0.1)

> **기준.** 중복 색은 **✅ Color system 정본에 명시된 값·이름**으로 통폐합합니다 — 강민관 결정 2026-08-04.
> **단계 규칙.** 3자리 10단위 (010~100). **메인 색상** = `Primary/Red 040` (`#F14950`).
> **생성.** `npm run audit` · 전수 표 `docs/color-merge-map.csv`
> **실행 주체.** Figma 원본 수정은 디자인팀 몫입니다 — Claude 는 View 권한뿐입니다.

## 1. 전수 판정

| 판정 | 스타일 수 | 뜻 |
|---|---|---|
| `ABSORB` | 424 | 정본과 값이 **정확히 같음** → 정본 토큰으로 치환 후 삭제 |
| `RESOLVE` | 16 | 같은 이름이 두 값을 가짐 → **정본에 있는 쪽 채택** |
| `NEAR` | 14 | 정본에 없으나 **ΔE ≤ 2.3** — 육안 구분 한계 이하, 흡수 권고 |
| `RETIRE` | 24 | **시스템에서 제거 확정** — 지정된 정본 토큰으로 치환 후 삭제 |
| `REVIEW` | 171 | 정본에 없고 색차도 큼 — **개별 판단 필요** |
| **합계** | **649** | 정본 55색 기준 |

기계 판정만으로 정리되는 것이 **478개**(73.7%), 사람 판단이 필요한 것이 **171개**입니다.

## 2. 이름-값 충돌 6종 — 정본 기준 판정

| 스타일 이름 | 채택 | 폐기 | 근거 |
|---|---|---|---|
| `Second Navy/navy060_Default Btn` | `#0A3C5C` → `Navy/Navy 060` | `#143C56` | 정본 값 채택 |
| `Brand color/GR060` | `#00C88C` → `System/Success` | `#00A870` | 정본 값 채택 |
| `Default Btn` | — | — | 양쪽 다 정본에 없음 — 개별 판단 |
| `Second Navy/navy090` | — | — | 양쪽 다 정본에 있음 — 개별 판단 |
| `First Green/g600_G press` | — | — | 양쪽 다 정본에 없음 — 개별 판단 |
| `Map Marker/active` | — | — | 양쪽 다 정본에 없음 — 개별 판단 |

2/6 종이 정본 기준으로 자동 판정됩니다. 나머지는 정본에 근거가 없어 **개별 판단**이 필요합니다.

## 3. 정본에 없는 고유 HEX 87종

### 3-0. ✅ 제거 확정 — 1종

**`#D9DDDF` → `Gray Scale/Gray 020` (`#E2E2E2`)** · ΔE 2.67 · 레거시 24개 스타일(이름 9종)

정본에 추가하지 않고 시스템에서 제거 — 강민관 결정 2026-08-04. 치환 대상은 색차가 가장 가까운 Gray Scale/Gray 020(ΔE 2.67). 이름은 Navy 계열을 가리키지만 용도(비활성 버튼·입력선·보조 텍스트)가 정본 Tertiary 방침('네이비는 색 자체가 정보인 요소에만, 그 외 폰트·컴포넌트는 Gray scale')에 해당하므로 Gray 로 보냅니다.

> ⚠️ ΔE 2.67 은 흡수 권고선(2.3) 을 넘습니다 — 나란히 놓으면 미세하게 구분됩니다. 치환 후 비활성 버튼·입력선을 실제 화면에서 확인하세요.

해당 스타일: `dot` · `info input text` · `Second Navy/gray025` · `System Color/input_line` · `Disabled Btn` · `Navy 020 *Disabled Btn` · `sub text` · `Gray/902` · `System/Input Line`

### 3-1. 흡수 권고 — ΔE ≤ 2.3 · 12종

육안으로 구분되지 않는 수준입니다. 정본 색으로 바로 흡수해도 화면이 달라 보이지 않습니다. `[해석]`

| 레거시 HEX | 대표 스타일 | → 정본 | ΔE |
|---|---|---|---|
| `#2E2E2E` | `Gray scale/Gray080` | `Gray Scale/Gray 080` (`#2F2E2E`) | 0.48 |
| `#FAFAFA` | `Korail(Pending)/코레일_bg_table_sub` | `Gray Scale/Gray 005` (`#F8F8F8`) | 0.69 |
| `#2D2D2D` | `gray/gray-80` | `Gray Scale/Gray 080` (`#2F2E2E`) | 0.74 |
| `#0A090B` | `Global / Neutral Grey / 1300` | `Navy/Navy 090` (`#060809`) | 1.05 |
| `#ECEEEF` | `Gray/901` | `Gray Scale/Gray 010` (`#F1F1F1`) | 1.46 |
| `#E2E2E5` | `Navy scale/Navi020` | `Gray Scale/Gray 020` (`#E2E2E2`) | 1.56 |
| `#1D1A1A` | `gray scale/gray 090` | `Brand/G car Logo Text` (`#1A1A1A`) | 1.59 |
| `#D4D6D9` | `BlueGray/BlueGray04` | `Gray Scale/Gray 030` (`#D4D4D4`) | 1.83 |
| `#5F6062` | `Gcar_logo_sud text` | `Gray Scale/Gray 070` (`#5C5C5C`) | 2.07 |
| `#F8F7FB` | `bg/sunken/subtle` | `Gray Scale/Gray 005` (`#F8F8F8`) | 2.08 |
| `#EAF0F6` | `First Blue/Main 010` | `Navy/Navy 010` (`#E8ECEF`) | 2.13 |
| `#C9C9CC` | `Global / Neutral Grey / 700` | `Gray Scale/Gray 040` (`#C5C5C5`) | 2.2 |

### 3-2. 개별 판단 — 74종

가까운 정본 색을 함께 적었지만, 색차가 커서 **그대로 치환하면 화면이 달라 보입니다.** 정본에 추가할지 폐기할지 결정이 필요합니다.

| 레거시 HEX | 대표 스타일 | 가장 가까운 정본 | ΔE |
|---|---|---|---|
| `#181A1D` | `Font_Icon/Default` | `Brand/G car Logo Text` (`#1A1A1A`) | 2.42 |
| `#2C0809` | `$-primary-800` | `Primary/Red 090` (`#2F0607`) | 2.68 |
| `#EEF1F8` | `System Color/main_bg` | `Navy/Navy 010` (`#E8ECEF`) | 2.84 |
| `#111111` | `BG/Black_Color` | `Navy/Navy 090` (`#060809`) | 3.04 |
| `#636366` | `Default/SystemGray/02/Dark` | `Gray Scale/Gray 070` (`#5C5C5C`) | 3.49 |
| `#AEAEB2` | `Default/SystemGray/02/Light` | `Gray Scale/Gray 050` (`#B7B7B7`) | 3.88 |
| `#EBEBF5` | `Label Color/Dark/Secondary` | `Navy/Navy 010` (`#E8ECEF`) | 3.9 |
| `#143C56` | `$-G_Default Btn-500` | `Navy/Navy 060` (`#0A3C5C`) | 4.03 |
| `#545458` | `Separator Color/Dark/With Transparency` | `Gray Scale/Gray 070` (`#5C5C5C`) | 4.07 |
| `#101518` | `Gray/909` | `Brand/G car Logo Text` (`#1A1A1A`) | 4.13 |
| `#2F75BE` | `Main 050 *default` | `Brand/L.POINT 2` (`#0079C3`) | 4.3 |
| `#050F16` | `$-G_Default Btn-800` | `Navy/Navy 100` (`#020609`) | 4.34 |
| `#EFD2D3` | `$-primary-100` | `Primary/Red 010` (`#FBD2D3`) | 4.68 |
| `#565C63` | `Gray/07` | `Gray Scale/Gray 070` (`#5C5C5C`) | 4.88 |
| `#073B62` | `Korail(Pending)/코레일_text_button` | `Navy/Navy 060` (`#0A3C5C`) | 4.97 |
| `#FF5555` | `Secondary/timedeal` | `Primary/Red 040` (`#F14950`) | 4.97 |
| `#120304` | `$-primary-900` | `Gray Scale/Gray 100` (`#000000`) | 5.06 |
| `#581012` | `$-primary-700` | `Primary/Red 080` (`#5F0B0E`) | 5.42 |
| `#3C3C43` | `Label Color/Light/Secondary` | `Brand/G car Gray` (`#3E3A39`) | 5.59 |
| `#F8E9EA` | `$-primary-50` | `Gray Scale/Gray 010` (`#F1F1F1`) | 5.64 |
| `#E50012` | `Brand Color/lotte rental` | `Primary/Red 050` (`#ED1C24`) | 5.75 |
| `#1794FA` | `fill/brand/tertairy` | `Brand/L.POINT` (`#009BFA`) | 5.92 |
| `#1E1B13` | `material-theme/sys/light/on-surface` | `Brand/G car Logo Text` (`#1A1A1A`) | 5.94 |
| `#031109` | `Gray/900` | `Navy/Navy 090` (`#060809`) | 5.98 |
| `#CDE0EE` | `Korail(Pending)/코레일_bg_button_normal dim` | `Navy/Navy 020` (`#D0D8DD`) | 6.29 |

전수는 `docs/color-merge-map.csv` (`REVIEW` 행) 또는 `data/color-merge.json`.

## 4. 확정된 이름 변경

| 현행 | 변경 | 사유 |
|---|---|---|
| `Primary/Red 300` | `Primary/Red 030` | 10단위 체계 확정 — 명도 순 3번째 칸 |
| `Primary/Red 400` | `Primary/Red 040` | 10단위 체계 확정 — 명도 순 4번째 칸 |
| `Primary/Red 500` | `Primary/Red 050` | 10단위 체계 확정 — 명도 순 5번째 칸. 메인 색상 |
| `Navy/navy 040` | `Navy/Navy 040` | 표기 정리 — 같은 그룹 안 대소문자 통일. 값·단계 변화 없음 |
| `Map Marker/Active_Line` | `Map Marker/Active Line` | 표기 정리 — 의미형 이름은 공백만 사용. 값 변화 없음 |

토큰 산출물에는 이미 반영돼 있습니다 — `--gds-color-primary-red-050` · `--gds-color-primary-main`. 구 이름은 CSS 주석과 `$extensions.gds.renamedFrom` 에 남겼습니다.

## 5. 아직 열려 있는 것

### CQ-9. Dim Layer / Info Box BG 의 알파 단계를 어떻게 토큰화할 것인가

원본 변수는 System/Dim Layer · System/Info Box BG 2개인데, 정본 스와치는 Dim layer 01(검정 60%) · Dim layer 02(검정 80%) · Info_Box(검정 60%) 3개입니다. 값은 셋 다 #000000 이고 차이는 불투명도뿐입니다. 원본 설명문에는 25.06.08 기준 Info box bg 를 Dim layer 의 하위로 재분류했다고 적혀 있습니다.

- A — 알파를 토큰에 포함: System/Dim Layer 060(#00000099) · System/Dim Layer 080(#000000CC) 2종으로 쪼개고 Info Box BG 는 060 으로 흡수. Map Marker/Shadow(#0000001A) 와 같은 방식이라 일관됩니다.
- B — 색 토큰은 #000000 하나만 두고 불투명도는 컴포넌트에서 지정. 토큰 수는 줄지만 60/80 이 어디서 쓰이는지가 시스템에 남지 않습니다.
- C — 현행 유지(변수 2개, 알파 미문서화). 지금 상태로, 개발자가 값을 알 수 없습니다.

### CQ-10. 역할 별칭(semantic alias) 계층을 GDS 에 둘 것인가

원본에 color/text/bolder(#131416) 라는 변수가 있습니다. 소문자·역할 기반 이름으로, Gray Scale/Primary 같은 원시 색 계층과 이름 규칙이 다릅니다. 현재 GDS 정본 53종은 전부 원시 색이고 역할 별칭은 하나도 없습니다. 이 변수 하나 때문에 계층을 새로 만들지, 아니면 원시 색으로 편입할지 결정이 필요합니다.

- A — 별칭 계층을 만든다: color/text/bolder 같은 역할 토큰을 원시 색을 가리키게 정의. 다만 #131416 은 정본 어떤 원시 색과도 일치하지 않아 원시 색부터 추가해야 합니다.
- B — 원시 색으로 편입: Gray Scale 에 새 단계로 넣는다. 다만 #131416 은 Gray 100(#000000) 과 Gray 080(#2F2E2E) 사이라 10단위 규칙상 들어갈 자리가 090(현재 결번)입니다.
- C — 폐기: 레거시 649 스타일에서 사용 0건이므로 시스템에 넣지 않는다.

## 6. 한계 `[투명성]`

1. **색차는 CIE76(ΔE\*ab)** 입니다. CIEDE2000 보다 채도 높은 영역에서 과대평가하는 경향이 있습니다 — 경계선(ΔE 2~4)에 있는 것은 눈으로 확인하세요. `[해석]`
2. **스타일별 실사용 횟수를 세지 않았습니다.** 치환 순서·우선순위는 이 표만으로 정할 수 없습니다. `[미확인]`
3. **`.fig` 스냅샷 2026-07-23 기준**입니다.
4. 흡수 권고(`NEAR`)는 **색만 보고 낸 판단**입니다. 색 자체가 정보인 요소(뱃지·지도 핀)는 값이 같아도 의미가 다를 수 있습니다.
