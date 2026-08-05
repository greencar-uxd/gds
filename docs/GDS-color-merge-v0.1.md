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
| `RETIRE` | 133 | **시스템에서 제거 확정** — 지정된 정본 토큰으로 치환 후 삭제 |
| `REVIEW` | 62 | 정본에 없고 색차도 큼 — **개별 판단 필요** |
| **합계** | **649** | 정본 57색 기준 |

기계 판정만으로 정리되는 것이 **587개**(90.4%), 사람 판단이 필요한 것이 **62개**입니다.

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

### 3-0. ✅ 제거 확정 — 49종

**`#D9DDDF` → `Gray Scale/Gray 020` (`#E2E2E2`) · ΔE 2.67** · 레거시 24개 스타일(이름 9종)

정본에 추가하지 않고 시스템에서 제거 — 강민관 결정 2026-08-04. 치환 대상은 색차가 가장 가까운 Gray Scale/Gray 020(ΔE 2.67). 이름은 Navy 계열을 가리키지만 용도(비활성 버튼·입력선·보조 텍스트)가 정본 Tertiary 방침('네이비는 색 자체가 정보인 요소에만, 그 외 폰트·컴포넌트는 Gray scale')에 해당하므로 Gray 로 보냅니다.

> ⚠️ ΔE 2.67 은 흡수 권고선(2.3) 을 넘습니다 — 나란히 놓으면 미세하게 구분됩니다. 치환 후 비활성 버튼·입력선을 실제 화면에서 확인하세요.

해당 스타일: `dot` · `info input text` · `Second Navy/gray025` · `System Color/input_line` · `Disabled Btn` · `Navy 020 *Disabled Btn` · `sub text` · `Gray/902` · `System/Input Line`

**`#2C0809` → `Primary/Red 090` (`#2F0607`) · ΔE 2.68** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-800 — 값이 가장 가까운 정본 단계입니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-800`

**`#636366` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Default/SystemGray/02/Dark`

**`#AEAEB2` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Default/SystemGray/02/Light`

**`#EBEBF5` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Label Color/Dark/Secondary`

**`#143C56` → `Navy/Navy 060` (`#0A3C5C`) · ΔE 4.03** · CQ-5 · 레거시 12개 스타일(이름 8종)

같은 자리를 가리키는 이름 `Second Navy/navy060_Default Btn` 의 충돌 판정에서 이미 정본 값 `#0A3C5C`(Navy 060)이 채택되고 이 값은 폐기로 결정됐습니다. 이름만 다른 `Default Btn` 에도 같은 판정을 적용합니다 — CQ-5 확정 2026-08-05.

> ⚠️ 기본 버튼 색이 바뀝니다. 이 묶음은 치환 후 실제 화면 확인이 필요한 항목입니다.

해당 스타일: `$-G_Default Btn-500` · `$-gray-500` · `Brand Color/Overnight Gray` · `Default Btn` · `Navy scale/Navi070` · `Overnight Gray` · `Second Navy/navy060_Default Btn` · `Untitled/$-DefaultBtn_N-500`

**`#545458` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Separator Color/Dark/With Transparency`

**`#EFD2D3` → `Primary/Red 010` (`#FBD2D3`) · ΔE 4.68** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-100 — 값이 가장 가까운 정본 단계입니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-100`

**`#565C63` → `Gray Scale/Gray 070` (`#5C5C5C`) · ΔE 4.88** · OC-5 · 레거시 1개 스타일(이름 1종)

구 Gray/07 — 최근접 정본 단계. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `Gray/07`

**`#073B62` — GDS 밖으로 분리 (코레일 제휴 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

코레일 제휴 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ 제휴가 확정되면 정본 Brand 그룹(Brand/L.POINT · Brand/T Membership 선례) 편입을 다시 검토할 수 있습니다.

해당 스타일: `Korail(Pending)/코레일_text_button`

**`#FF5555` → `Badge/Time Deal` (`#FF8159`) · ΔE 21.87** · OC-6 · 레거시 1개 스타일(이름 1종)

Secondary/timedeal — 정본에 같은 용도의 Badge/Time Deal 이 있습니다. 값이 아니라 용도를 따릅니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

> ⚠️ 색이 #FF5555 → #FF8159 로 바뀝니다(주황 쪽). 타임딜 뱃지 화면 확인이 필요합니다.

해당 스타일: `Secondary/timedeal`

**`#120304` → `Primary/Red 090` (`#2F0607`) · ΔE 18.06** · OC-5 · 레거시 3개 스타일(이름 1종)

이름이 $-primary-900 입니다 — 무채색에 가깝지만 구 Primary 스케일의 최하단이라 Primary/Red 090 이 용도상 맞습니다. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `$-primary-900`

**`#581012` → `Primary/Red 080` (`#5F0B0E`) · ΔE 5.42** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-700 — 값이 가장 가까운 정본 단계입니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-700`

**`#3C3C43` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 2개 스타일(이름 2종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Label Color/Light/Secondary` · `Separator Color/Light/With Transparency`

**`#F8E9EA` → `Primary/Red 010` (`#FBD2D3`) · ΔE 11.53** · OC-5 · 레거시 3개 스타일(이름 1종)

이름이 $-primary-50 — 구 Primary 스케일 최상단. Primary/Red 010. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `$-primary-50`

**`#E50012` — GDS 밖으로 분리 (롯데 제휴 소유)** · OC-3 · 레거시 2개 스타일(이름 2종)

롯데 제휴 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ 제휴가 확정되면 정본 Brand 그룹(Brand/L.POINT · Brand/T Membership 선례) 편입을 다시 검토할 수 있습니다.

해당 스타일: `Brand Color/lotte rental` · `Map Marker/active`

**`#1E1B13` — GDS 밖으로 분리 (Material / 외부 토큰셋 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

Material / 외부 토큰셋 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `material-theme/sys/light/on-surface`

**`#031109` → `Gray Scale/Gray 100` (`#000000`) · ΔE 7.01** · OC-2 · 레거시 1개 스타일(이름 1종)

이름이 Gray/900 입니다 — 값만 초록빛이 돌 뿐 용도는 무채색 최상단입니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Gray/900`

**`#CDE0EE` — GDS 밖으로 분리 (코레일 제휴 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

코레일 제휴 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ 제휴가 확정되면 정본 Brand 그룹(Brand/L.POINT · Brand/T Membership 선례) 편입을 다시 검토할 수 있습니다.

해당 스타일: `Korail(Pending)/코레일_bg_button_normal dim`

**`#202A2F` → `Gray Scale/Gray 080` (`#2F2E2E`) · ΔE 6.44** · OC-5 · 레거시 1개 스타일(이름 1종)

구 Gray/908 — 최근접 정본 단계. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `Gray/908`

**`#E9F7EF` → `Primary/Red 010` (`#FBD2D3`) · ΔE 22.34** · OC-2 · 레거시 1개 스타일(이름 1종)

구 Primary/50 — 가장 옅은 단계이므로 Primary/Red 010. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Primary/50`

**`#494F51` → `Gray Scale/Gray 070` (`#5C5C5C`) · ΔE 6.56** · OC-5 · 레거시 1개 스타일(이름 1종)

GRAYSCALE/gray_009 — 최근접 정본 단계. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `GRAYSCALE/gray_009`

**`#4B4E53` → `Gray Scale/Gray 070` (`#5C5C5C`) · ΔE 6.88** · OC-5 · 레거시 1개 스타일(이름 1종)

Gray/DarkGray — 최근접 정본 단계. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `Gray/DarkGray`

**`#84171B` → `Primary/Red 070` (`#8E1116`) · ΔE 7.02** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-600 — 값이 가장 가까운 정본 단계입니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-600`

**`#2D303A` → `Gray Scale/Gray 080` (`#2F2E2E`) · ΔE 7.04** · OC-5 · 레거시 1개 스타일(이름 1종)

static/bk_stronger — 최근접 정본 단계. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `static/bk_stronger`

**`#8C989E` → `Gray Scale/Gray 060` (`#898989`) · ΔE 7.44** · OC-5 · 레거시 9개 스타일(이름 5종)

보조 텍스트(Second Text) 가 대부분입니다. 정본 방침상 폰트는 Gray scale 로 갑니다. CQ-6 / OC-5 묶음 결정 2026-08-05.

해당 스타일: `Gray/904` · `navy040` · `Second Text` · `Second text` · `Sub Navy/Navy 040 *Second Text`

**`#E6FAF4` → `Primary/Red 010` (`#FBD2D3`) · ΔE 24.27** · OC-2 · 레거시 2개 스타일(이름 1종)

FirstRed/g50 — 이름은 Red 인데 값은 그린입니다(리브랜딩 중간 상태). 단계상 Primary/Red 010. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `FirstRed/g50`

**`#4F4D55` — GDS 밖으로 분리 (Material / 외부 토큰셋 소유)** · OC-3 · 레거시 1개 스타일(이름 1종)

Material / 외부 토큰셋 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Global / Neutral Grey / 1000`

**`#0066B3` — GDS 밖으로 분리 (코레일 제휴 소유)** · OC-3 · 레거시 2개 스타일(이름 2종)

코레일 제휴 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ 제휴가 확정되면 정본 Brand 그룹(Brand/L.POINT · Brand/T Membership 선례) 편입을 다시 검토할 수 있습니다.

해당 스타일: `Korail(Pending)/코레일_text_blue_b` · `코레일_bg_button_normal/dim`

**`#33D3A3` → `Primary/Red 040` (`#F14950`) · ΔE 119.26** · OC-2 · 레거시 1개 스타일(이름 1종)

구 First Green/g400 — 단계 그대로 Primary/Red 040. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `First Green/g400`

**`#40535E` → `Navy/Navy 060` (`#0A3C5C`) · ΔE 18.03** · CQ-5 · 레거시 6개 스타일(이름 4종)

`Default Btn` 의 다른 값입니다. 정본에 Default Btn 에 해당하는 색은 Navy 060 하나뿐이므로 같은 자리로 보냅니다 — CQ-5 확정 2026-08-05.

> ⚠️ 기본 버튼 색이 바뀝니다. 이 묶음은 치환 후 실제 화면 확인이 필요한 항목입니다.

해당 스타일: `Default Btn` · `Gray/906 Gray` · `Navy 060 *Default Btn` · `navy060`

**`#B01F24` → `Primary/Red 060` (`#BE161D`) · ΔE 9.2** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-500 — 구 스케일과 신 스케일의 단계 수가 달라 한 칸 밀립니다. 이름(500)이 아니라 값을 따릅니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-500`

**`#EDB8B8` → `Map Marker/Free Zone` (`#FD8484`) · ΔE 31.96** · OC-6 · 레거시 1개 스타일(이름 1종)

freezone — 정본에 같은 용도의 Map Marker/Free Zone 이 있습니다. 값이 아니라 용도를 따릅니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

> ⚠️ 색이 눈에 띄게 진해집니다. 프리존 마커 화면 확인이 필요합니다.

해당 스타일: `freezone`

**`#DFA5A7` → `Primary/Red 020` (`#F8A4A7`) · ΔE 10.82** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-200 — 값이 가장 가까운 정본 단계입니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

해당 스타일: `$-primary-200`

**`#00A870` → `Primary/Red 050` (`#ED1C24`) · ΔE 128.36** · OC-2 · 레거시 3개 스타일(이름 3종)

구 브랜드 주색(First Green g500 · Brand color GR060). 리브랜딩으로 Primary 가 Red 로 바뀌었으므로 같은 자리인 Primary/Red 050 으로 보냅니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

> ⚠️ System/g500_45% 는 투명도가 걸린 상태 표시용입니다 — 이 용도는 System/Success 로 따로 옮겨야 합니다.

해당 스타일: `Brand color/GR060` · `First Green/g500_Default` · `System/g500_45%`

**`#4DB778` → `Primary/Red 040` (`#F14950`) · ΔE 110.18** · OC-2 · 레거시 2개 스타일(이름 2종)

구 Primary/400 — 단계 그대로 Primary/Red 040. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `400` · `Primary/400`

**`#D2EDDD` → `Primary/Red 010` (`#FBD2D3`) · ΔE 26.6** · OC-2 · 레거시 1개 스타일(이름 1종)

구 Primary/100 — Primary/Red 010. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Primary/100`

**`#D0797C` → `Primary/Red 020` (`#F8A4A7`) · ΔE 15.62** · OC-6 · 레거시 3개 스타일(이름 1종)

구 $-primary-300 — 값 기준으로는 020 이 가장 가깝습니다. 200 과 같은 자리로 합쳐집니다. CQ-6 / OC-6 묶음 결정 2026-08-05.

> ⚠️ 구 200·300 두 단계가 정본 020 하나로 합쳐집니다. 두 색을 나란히 쓰던 화면이 있으면 확인이 필요합니다.

해당 스타일: `$-primary-300`

**`#20A556` → `Primary/Red 050` (`#ED1C24`) · ΔE 127.48** · OC-2 · 레거시 7개 스타일(이름 2종)

구 Primary/500 main — 리브랜딩 후 메인은 Primary/Red 050 입니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

> ⚠️ Default 라는 이름으로 6번 복제돼 있습니다. 치환 후 기본 상태 색이 전부 레드로 바뀌므로 화면 확인이 필요합니다.

해당 스타일: `Default` · `Primary/500 main`

**`#007AFF` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 2개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Default/SystemBlue/Light`

**`#66DEBA` → `Primary/Red 030` (`#F4777C`) · ΔE 92.94** · OC-2 · 레거시 1개 스타일(이름 1종)

구 g300 — Primary/Red 030. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `g300`

**`#082916` → `Primary/Red 080` (`#5F0B0E`) · ΔE 55.71** · OC-2 · 레거시 1개 스타일(이름 1종)

구 Primary/800 — Primary/Red 080. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Primary/800`

**`#009669` → `Primary/Red 060` (`#BE161D`) · ΔE 111.47** · OC-2 · 레거시 1개 스타일(이름 1종)

구 First Green/g600_G press — Primary/Red 060. 같은 이름의 다른 값 #007E54 와 함께 폐기되므로 CQ-5 의 이름 충돌도 같이 풀립니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `First Green/g600_G press`

**`#0A84FF` — GDS 밖으로 분리 (iOS UIKit 소유)** · OC-3 · 레거시 2개 스타일(이름 1종)

iOS UIKit 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / OC-3 묶음 결정 2026-08-05.

> ⚠️ OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.

해당 스타일: `Default/SystemBlue/Dark`

**`#79C99A` → `Primary/Red 030` (`#F4777C`) · ΔE 83.97** · OC-2 · 레거시 4개 스타일(이름 3종)

구 Primary/300 — 단계 그대로 Primary/Red 030. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `green040` · `Primary/300` · `Secondary/economy`

**`#A6DBBB` → `Primary/Red 020` (`#F8A4A7`) · ΔE 55.43** · OC-2 · 레거시 1개 스타일(이름 1종)

구 Primary/200 — Primary/Red 020. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Primary/200`

**`#007E54` → `Primary/Red 060` (`#BE161D`) · ΔE 106.32** · OC-2 · 레거시 1개 스타일(이름 1종)

구 First Green/g600_G press 의 다른 값 — 위와 같은 자리로 보냅니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `First Green/g600_G press`

**`#187C41` → `System/Success` (`#00C88C`) · ΔE 30.33** · OC-2 · 레거시 2개 스타일(이름 2종)

Posi_Press — 긍정 상태의 눌림 색입니다. 구 Primary/600 이름도 함께 붙어 있지만 상태 표시가 우선입니다. CQ-6 / OC-2 묶음 결정 2026-08-05.

> ⚠️ 정본에는 상태 색의 눌림 단계가 없습니다. System/Success 하나로 합쳐집니다.

해당 스타일: `Posi_Press` · `Primary/600`

**`#10532B` → `Primary/Red 070` (`#8E1116`) · ΔE 81.37** · OC-2 · 레거시 1개 스타일(이름 1종)

구 Primary/700 — Primary/Red 070. CQ-6 / OC-2 묶음 결정 2026-08-05.

해당 스타일: `Primary/700`

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

### 3-2. 개별 판단 — 26종

가까운 정본 색을 함께 적었지만, 색차가 커서 **그대로 치환하면 화면이 달라 보입니다.** 정본에 추가할지 폐기할지 결정이 필요합니다.

| 레거시 HEX | 대표 스타일 | 가장 가까운 정본 | ΔE |
|---|---|---|---|
| `#181A1D` | `Font_Icon/Default` | `Brand/G car Logo Text` (`#1A1A1A`) | 2.42 |
| `#EEF1F8` | `System Color/main_bg` | `Navy/Navy 010` (`#E8ECEF`) | 2.84 |
| `#111111` | `BG/Black_Color` | `Navy/Navy 090` (`#060809`) | 3.04 |
| `#101518` | `Gray/909` | `Brand/G car Logo Text` (`#1A1A1A`) | 4.13 |
| `#2F75BE` | `Main 050 *default` | `Brand/L.POINT 2` (`#0079C3`) | 4.3 |
| `#050F16` | `$-G_Default Btn-800` | `Navy/Navy 100` (`#020609`) | 4.34 |
| `#1794FA` | `fill/brand/tertairy` | `Brand/L.POINT` (`#009BFA`) | 5.92 |
| `#10131C` | `border/input/default` | `Navy/Navy 100` (`#020609`) | 6.99 |
| `#DF1B35` | `text/color/red` | `System/Alarm` (`#D32828`) | 8.16 |
| `#FCF8E8` | `level/gold/num` | `Gray Scale/Gray 005` (`#F8F8F8`) | 8.27 |
| `#9B9EAE` | `Navy scale/Navi040` | `Navy/Navy 030` (`#A1B1BB`) | 8.37 |
| `#3C536F` | `Navy scale/Navi060` | `Navy/Navy 050` (`#436378`) | 8.39 |
| `#66757E` | `Gray/905` | `Navy/Navy 040` (`#728A9A`) | 9.15 |
| `#303E47` | `Def_Press` | `Brand/G car Gray` (`#3E3A39`) | 9.8 |
| `#467BCE` | `Service Color/economy` | `Brand/L.POINT 2` (`#0079C3`) | 9.9 |
| `#00AD73` | `Map Marker/active` | `System/Success` (`#00C88C`) | 10.16 |
| `#00AD79` | `Badge Color/logo` | `System/Success` (`#00C88C`) | 10.89 |
| `#1B69F1` | `fill/brand/primary` | `Badge/New Car` (`#5B68FE`) | 12.22 |
| `#68A0DA` | `First Blue/Main 040` | `Badge/Clean` (`#59BBF2`) | 13.09 |
| `#C04C50` | `$-primary-400` | `Map Marker/Free Zone Line` (`#EB6565`) | 13.31 |
| `#ED9A1E` | `Badge Color/ODA` | `Badge/New Zone` (`#FD9F4D`) | 15.34 |
| `#246BEB` | `primary/primary-50` | `Badge/New Car` (`#5B68FE`) | 16.02 |
| `#004A98` | `Interaction Color/FB060` | `Map Marker/Corporation` (`#005E97`) | 18.21 |
| `#BF7200` | `Brand Color/ODA_line` | `Badge/New Zone` (`#FD9F4D`) | 20.01 |
| `#42C0C0` | `Brand color/42C0C0` | `Navy/Navy 030` (`#A1B1BB`) | 30.38 |

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

### CQ-11. 지도 active 마커의 채움색을 정본에 새로 둘 것인가

정본 Map Marker 그룹에는 선·비활성·프리존·그림자만 있고 활성 마커의 채움색이 없습니다. 레거시 `Map Marker/active` 는 두 값(롯데 빨강 #E50012 · 구 브랜드 그린 #00AD73)을 갖고 있었는데 둘 다 다른 출처의 잔재라 CQ-5 에서 이름째 폐기했습니다. 실제 지도 화면에 활성 마커 채움색이 필요한지, 필요하다면 어떤 색인지가 남았습니다.

- A — Primary/Red 050 을 그대로 씁니다. 브랜드 주색이라 활성 상태 표현으로 자연스럽고 새 토큰이 필요 없습니다.
- B — Map Marker/Active 를 신규 토큰으로 정의합니다. 마커 색은 지도에서 정보라 Primary 와 분리하는 편이 안전할 수 있습니다.
- C — 필요 없습니다. 활성 마커를 채움색이 아니라 크기·그림자로 구분한다면 토큰을 추가하지 않습니다.

## 6. 한계 `[투명성]`

1. **색차는 CIE76(ΔE\*ab)** 입니다. CIEDE2000 보다 채도 높은 영역에서 과대평가하는 경향이 있습니다 — 경계선(ΔE 2~4)에 있는 것은 눈으로 확인하세요. `[해석]`
2. **스타일별 실사용 횟수를 세지 않았습니다.** 치환 순서·우선순위는 이 표만으로 정할 수 없습니다. `[미확인]`
3. **`.fig` 스냅샷 2026-07-23 기준**입니다.
4. 흡수 권고(`NEAR`)는 **색만 보고 낸 판단**입니다. 색 자체가 정보인 요소(뱃지·지도 핀)는 값이 같아도 의미가 다를 수 있습니다.
