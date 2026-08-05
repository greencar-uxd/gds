'use strict';
/**
 * CQ-6 묶음 결정을 orphanDispositions 항목으로 옮겨 적는 1회성 생성기.
 *
 * 손으로 적는 숫자를 없애기 위한 스크립트입니다 — 레거시 스타일 수·이름 목록·ΔE 는
 * 전부 추출 데이터에서 계산하고, 사람이 정한 것(치환 대상 · 사유)만 아래 표에 있습니다.
 *
 * 실행: node tools/audit/make_dispositions.js
 *   → data/color-decisions.json 의 orphanDispositions 를 갱신합니다(기존 항목 유지).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));
const D = VIEW.D;
const CANON = VIEW.colors;

// ---------- ΔE (CIE76) — merge_map.js 와 같은 식 ----------
function rgb(hex) { const v = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); }
function lab(hex) {
  let [r, g, b] = rgb(hex).map(c => c / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => { const [x, y, z] = lab(a), [p, q, r] = lab(b); return Math.hypot(x - p, y - q, z - r); };

const DECIDED_AT = '2026-08-05';

// ────────────────────────────────────────────────────────────
// 사람이 정한 부분만 여기 있습니다.
//
// 원칙 — 기계가 고른 "가장 가까운 색"이 아니라 **이름이 드러내는 용도**로 보냅니다.
//   · 구 Primary 스케일(리브랜딩 이전 그린) → 현재 Primary/Red 의 같은 단계
//   · 상태 표시(성공·긍정)               → System/Success
//   · 이름이 Gray/*                      → Gray Scale 최근접
//   · 뱃지·마커처럼 색이 곧 정보인 것       → 처분하지 않고 남깁니다
// ────────────────────────────────────────────────────────────
const PLAN = [
  // ---- OC-2 구 브랜드 그린 스케일 (리브랜딩 이전 Primary) ----
  ['#00A870', 'OC-2', 'Primary/Red 050', '구 브랜드 주색(First Green g500 · Brand color GR060). 리브랜딩으로 Primary 가 Red 로 바뀌었으므로 같은 자리인 Primary/Red 050 으로 보냅니다.', 'System/g500_45% 는 투명도가 걸린 상태 표시용입니다 — 이 용도는 System/Success 로 따로 옮겨야 합니다.'],
  ['#79C99A', 'OC-2', 'Primary/Red 030', '구 Primary/300 — 단계 그대로 Primary/Red 030.', ''],
  ['#4DB778', 'OC-2', 'Primary/Red 040', '구 Primary/400 — 단계 그대로 Primary/Red 040.', ''],
  ['#20A556', 'OC-2', 'Primary/Red 050', '구 Primary/500 main — 리브랜딩 후 메인은 Primary/Red 050 입니다.', 'Default 라는 이름으로 6번 복제돼 있습니다. 치환 후 기본 상태 색이 전부 레드로 바뀌므로 화면 확인이 필요합니다.'],
  ['#187C41', 'OC-2', 'System/Success', 'Posi_Press — 긍정 상태의 눌림 색입니다. 구 Primary/600 이름도 함께 붙어 있지만 상태 표시가 우선입니다.', '정본에는 상태 색의 눌림 단계가 없습니다. System/Success 하나로 합쳐집니다.'],
  ['#031109', 'OC-2', 'Gray Scale/Gray 100', '이름이 Gray/900 입니다 — 값만 초록빛이 돌 뿐 용도는 무채색 최상단입니다.', ''],
  ['#E9F7EF', 'OC-2', 'Primary/Red 010', '구 Primary/50 — 가장 옅은 단계이므로 Primary/Red 010.', ''],
  ['#E6FAF4', 'OC-2', 'Primary/Red 010', 'FirstRed/g50 — 이름은 Red 인데 값은 그린입니다(리브랜딩 중간 상태). 단계상 Primary/Red 010.', ''],
  ['#33D3A3', 'OC-2', 'Primary/Red 040', '구 First Green/g400 — 단계 그대로 Primary/Red 040.', ''],
  ['#D2EDDD', 'OC-2', 'Primary/Red 010', '구 Primary/100 — Primary/Red 010.', ''],
  ['#66DEBA', 'OC-2', 'Primary/Red 030', '구 g300 — Primary/Red 030.', ''],
  ['#082916', 'OC-2', 'Primary/Red 080', '구 Primary/800 — Primary/Red 080.', ''],
  ['#009669', 'OC-2', 'Primary/Red 060', '구 First Green/g600_G press — Primary/Red 060. 같은 이름의 다른 값 #007E54 와 함께 폐기되므로 CQ-5 의 이름 충돌도 같이 풀립니다.', ''],
  ['#A6DBBB', 'OC-2', 'Primary/Red 020', '구 Primary/200 — Primary/Red 020.', ''],
  ['#007E54', 'OC-2', 'Primary/Red 060', '구 First Green/g600_G press 의 다른 값 — 위와 같은 자리로 보냅니다.', ''],
  ['#10532B', 'OC-2', 'Primary/Red 070', '구 Primary/700 — Primary/Red 070.', ''],

  // ---- OC-3 외부에서 들어온 색 ----
  ['#3C3C43', 'OC-3', null, 'iOS UIKit'],
  ['#636366', 'OC-3', null, 'iOS UIKit'],
  ['#AEAEB2', 'OC-3', null, 'iOS UIKit'],
  ['#EBEBF5', 'OC-3', null, 'iOS UIKit'],
  ['#545458', 'OC-3', null, 'iOS UIKit'],
  ['#007AFF', 'OC-3', null, 'iOS UIKit'],
  ['#0A84FF', 'OC-3', null, 'iOS UIKit'],
  ['#1E1B13', 'OC-3', null, 'Material / 외부 토큰셋'],
  ['#4F4D55', 'OC-3', null, 'Material / 외부 토큰셋'],
  ['#0066B3', 'OC-3', null, '코레일 제휴'],
  ['#073B62', 'OC-3', null, '코레일 제휴'],
  ['#CDE0EE', 'OC-3', null, '코레일 제휴'],
  ['#E50012', 'OC-3', null, '롯데 제휴'],

  // ---- OC-5 그레이 변종 ----
  ['#8C989E', 'OC-5', 'Gray Scale/Gray 060', '보조 텍스트(Second Text) 가 대부분입니다. 정본 방침상 폰트는 Gray scale 로 갑니다.', ''],
  ['#565C63', 'OC-5', 'Gray Scale/Gray 070', '구 Gray/07 — 최근접 정본 단계.', ''],
  ['#120304', 'OC-5', 'Primary/Red 090', '이름이 $-primary-900 입니다 — 무채색에 가깝지만 구 Primary 스케일의 최하단이라 Primary/Red 090 이 용도상 맞습니다.', ''],
  ['#F8E9EA', 'OC-5', 'Primary/Red 010', '이름이 $-primary-50 — 구 Primary 스케일 최상단. Primary/Red 010.', ''],
  ['#202A2F', 'OC-5', 'Gray Scale/Gray 080', '구 Gray/908 — 최근접 정본 단계.', ''],
  ['#494F51', 'OC-5', 'Gray Scale/Gray 070', 'GRAYSCALE/gray_009 — 최근접 정본 단계.', ''],
  ['#4B4E53', 'OC-5', 'Gray Scale/Gray 070', 'Gray/DarkGray — 최근접 정본 단계.', ''],
  ['#2D303A', 'OC-5', 'Gray Scale/Gray 080', 'static/bk_stronger — 최근접 정본 단계.', ''],

  // ---- OC-6 레드 변종 ----
  ['#2C0809', 'OC-6', 'Primary/Red 090', '구 $-primary-800 — 값이 가장 가까운 정본 단계입니다.', ''],
  ['#EFD2D3', 'OC-6', 'Primary/Red 010', '구 $-primary-100 — 값이 가장 가까운 정본 단계입니다.', ''],
  ['#581012', 'OC-6', 'Primary/Red 080', '구 $-primary-700 — 값이 가장 가까운 정본 단계입니다.', ''],
  ['#84171B', 'OC-6', 'Primary/Red 070', '구 $-primary-600 — 값이 가장 가까운 정본 단계입니다.', ''],
  ['#B01F24', 'OC-6', 'Primary/Red 060', '구 $-primary-500 — 구 스케일과 신 스케일의 단계 수가 달라 한 칸 밀립니다. 이름(500)이 아니라 값을 따릅니다.', ''],
  ['#DFA5A7', 'OC-6', 'Primary/Red 020', '구 $-primary-200 — 값이 가장 가까운 정본 단계입니다.', ''],
  ['#D0797C', 'OC-6', 'Primary/Red 020', '구 $-primary-300 — 값 기준으로는 020 이 가장 가깝습니다. 200 과 같은 자리로 합쳐집니다.', '구 200·300 두 단계가 정본 020 하나로 합쳐집니다. 두 색을 나란히 쓰던 화면이 있으면 확인이 필요합니다.'],
  ['#FF5555', 'OC-6', 'Badge/Time Deal', 'Secondary/timedeal — 정본에 같은 용도의 Badge/Time Deal 이 있습니다. 값이 아니라 용도를 따릅니다.', '색이 #FF5555 → #FF8159 로 바뀝니다(주황 쪽). 타임딜 뱃지 화면 확인이 필요합니다.'],
  ['#EDB8B8', 'OC-6', 'Map Marker/Free Zone', 'freezone — 정본에 같은 용도의 Map Marker/Free Zone 이 있습니다. 값이 아니라 용도를 따릅니다.', '색이 눈에 띄게 진해집니다. 프리존 마커 화면 확인이 필요합니다.'],
];

// 남기는 것 — 색이 곧 정보라 자동 치환하면 의미가 바뀝니다.
const HELD = {
  '#00AD73': 'Map Marker/active — CQ-5 이름 충돌 항목입니다. 마커 색은 정보라 따로 판단합니다.',
  '#00AD79': 'Badge Color/logo — 뱃지 색은 정보입니다. 정본에 대응 뱃지가 없어 신설 여부부터 정해야 합니다.',
  '#FCF8E8': 'level/gold/num — 등급 표시색입니다. Gray 로 보내면 등급 구분이 사라집니다.',
};

// ────────────────────────────────────────────────────────────
const legacy = D.colors.map(s => ({ ...s, hexU: s.hex.toUpperCase() }));
const canonByName = new Map(CANON.map(c => [c.name, c]));

const DEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));
const existing = new Set((DEC.orphanDispositions || []).map(o => o.hex.toUpperCase()));

const made = [];
for (const [hexRaw, cluster, target, arg4, arg5] of PLAN) {
  const hex = hexRaw.toUpperCase();
  if (existing.has(hex)) throw new Error(`이미 처분된 색입니다: ${hex}`);
  if (HELD[hex]) throw new Error(`남기기로 한 색을 처분 목록에 넣었습니다: ${hex}`);
  const rows = legacy.filter(s => s.hexU === hex);
  if (!rows.length) throw new Error(`레거시에 없는 색입니다: ${hex}`);
  const names = [...new Set(rows.map(s => s.name))];

  if (target === null) {
    // 외부 소유 — 치환 대상 없음
    made.push({
      hex, action: 'external', owner: arg4, cluster,
      target: null, targetHex: null, deltaE: null,
      legacyStyles: rows.length, legacyNames: names,
      reason: `${arg4} 가 소유한 색입니다. GDS 토큰으로 복제하면 원 소유자가 값을 바꿀 때 어긋나므로 시스템 밖으로 분리합니다 — CQ-6 / ${cluster} 묶음 결정 ${DECIDED_AT}.`,
      caution: /제휴/.test(arg4)
        ? '제휴가 확정되면 정본 Brand 그룹(Brand/L.POINT · Brand/T Membership 선례) 편입을 다시 검토할 수 있습니다.'
        : 'OS·프레임워크가 값을 관리합니다. 화면에서는 플랫폼 기본값을 그대로 쓰세요.',
      status: 'confirmed',
    });
    continue;
  }

  const t = canonByName.get(target);
  if (!t) throw new Error(`치환 대상이 정본에 없습니다: ${target}`);
  made.push({
    hex, action: 'retire', cluster,
    target: t.name, targetHex: t.hex,
    deltaE: Number(dE(hex, t.hex).toFixed(2)),
    legacyStyles: rows.length, legacyNames: names,
    reason: `${arg4} CQ-6 / ${cluster} 묶음 결정 ${DECIDED_AT}.`,
    caution: arg5 || '',
    status: 'confirmed',
  });
}

DEC.orphanDispositions = (DEC.orphanDispositions || []).concat(made);
fs.writeFileSync(path.join(ROOT, 'data', 'color-decisions.json'), JSON.stringify(DEC, null, 2) + '\n');

const byCluster = {};
for (const m of made) byCluster[m.cluster] = (byCluster[m.cluster] || 0) + 1;
console.log(`처분 ${made.length}종 추가 → data/color-decisions.json`);
for (const [k, v] of Object.entries(byCluster)) console.log(`  ${k}: ${v}종`);
console.log(`  남김: ${Object.keys(HELD).length}종 — ${Object.keys(HELD).join(' ')}`);
console.log(`  치환 스타일 합계: ${made.reduce((a, m) => a + m.legacyStyles, 0)}개`);
