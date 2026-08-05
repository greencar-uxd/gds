'use strict';
/**
 * CQ-5 · CQ-9 · CQ-10 확정 기록 + CQ-5 근거로 처분되는 색 2종 추가.
 * 1회성 생성기입니다 — 숫자는 전부 추출 데이터에서 계산합니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const VIEW = require(path.join(ROOT, 'build', 'canon-view.js'));
const D = VIEW.D;
const CANON = VIEW.colors;

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

const AT = '2026-08-05';
const legacy = D.colors.map(s => ({ ...s, hexU: s.hex.toUpperCase() }));
const canonByName = new Map(CANON.map(c => [c.name, c]));
const p = path.join(ROOT, 'data', 'color-decisions.json');
const DEC = JSON.parse(fs.readFileSync(p, 'utf8'));

// ── CQ-5 근거로 처분되는 색 2종 ──────────────────────────────
const CQ5_DISPOSE = [
  ['#143C56', 'Navy/Navy 060', '같은 자리를 가리키는 이름 `Second Navy/navy060_Default Btn` 의 충돌 판정에서 이미 정본 값 `#0A3C5C`(Navy 060)이 채택되고 이 값은 폐기로 결정됐습니다. 이름만 다른 `Default Btn` 에도 같은 판정을 적용합니다 — CQ-5 확정 ' + AT + '.'],
  ['#40535E', 'Navy/Navy 060', '`Default Btn` 의 다른 값입니다. 정본에 Default Btn 에 해당하는 색은 Navy 060 하나뿐이므로 같은 자리로 보냅니다 — CQ-5 확정 ' + AT + '.'],
];
const existing = new Set((DEC.orphanDispositions || []).map(o => o.hex.toUpperCase()));
for (const [hexRaw, target, reason] of CQ5_DISPOSE) {
  const hex = hexRaw.toUpperCase();
  if (existing.has(hex)) throw new Error(`이미 처분됨: ${hex}`);
  const rows = legacy.filter(s => s.hexU === hex);
  if (!rows.length) throw new Error(`레거시에 없음: ${hex}`);
  const t = canonByName.get(target);
  if (!t) throw new Error(`치환 대상이 정본에 없음: ${target}`);
  DEC.orphanDispositions.push({
    hex, action: 'retire', cluster: 'CQ-5',
    target: t.name, targetHex: t.hex, deltaE: Number(dE(hex, t.hex).toFixed(2)),
    legacyStyles: rows.length, legacyNames: [...new Set(rows.map(s => s.name))],
    reason,
    caution: '기본 버튼 색이 바뀝니다. 이 묶음은 치환 후 실제 화면 확인이 필요한 항목입니다.',
    status: 'confirmed',
  });
}

// ── CQ-5 이름 충돌 4건 확정 기록 ─────────────────────────────
DEC.conflictDecisions = {
  $description: 'CQ-5 — 같은 이름이 두 값을 갖는 건 중 정본으로 자동 판정되지 않은 4종의 확정 기록.',
  decidedAt: AT,
  items: [
    {
      id: 'CF-1', name: 'Default Btn', values: ['#40535E', '#143C56'],
      resolution: '두 값 모두 폐기 — 둘 다 Navy/Navy 060(#0A3C5C)으로 치환합니다.',
      basis: '정본 기준 통폐합 규칙. 같은 자리를 가리키는 `Second Navy/navy060_Default Btn` 이 이미 Navy 060 으로 판정됐습니다.',
      followUp: '치환 후 기본 버튼 화면 확인 필요.',
    },
    {
      id: 'CF-2', name: 'Second Navy/navy090', values: ['#020609', '#0A1E2B'],
      resolution: '이름을 폐기하고 값별로 갈라 보냅니다 — #020609 → Navy/Navy 100, #0A1E2B → Navy/Navy 080.',
      basis: '두 값 모두 정본에 실재합니다. 이름이 090 인데 값은 100 과 080 을 가리키고 있어, 이름이 아니라 값이 맞습니다. 정본 Navy 090 은 #060809 로 따로 있습니다.',
      followUp: '',
    },
    {
      id: 'CF-3', name: 'First Green/g600_G press', values: ['#007E54', '#009669'],
      resolution: '두 값 모두 폐기 — Primary/Red 060 으로 치환합니다.',
      basis: 'CQ-6 / OC-2(구 브랜드 그린 스케일) 전량 폐기 결정에 포함됩니다. 구 Primary/600 자리이므로 Primary/Red 060.',
      followUp: '',
    },
    {
      id: 'CF-4', name: 'Map Marker/active', values: ['#E50012', '#00AD73'],
      resolution: '이름을 폐기합니다. #E50012 는 롯데 브랜드 색이라 GDS 밖으로 분리하고, #00AD73 은 구 브랜드 그린입니다.',
      basis: '정본 Map Marker 그룹에는 active 가 없습니다(Corporation · Active Line · Disabled Line · Disabled Text · Free Zone · Free Zone Line · Shadow). 두 값 모두 다른 출처에서 흘러든 잔재라 어느 쪽도 근거가 되지 못합니다.',
      followUp: 'active 마커의 채움색이 실제로 필요한지는 별도 안건 CQ-11 로 분리했습니다.',
    },
  ],
};

// ── CQ-6 묶음 결정 기록 ─────────────────────────────────────
DEC.clusterDecisions = {
  $description: 'CQ-6 — orphan 묶음(OC-1~OC-8)별 결정 상태. 처분 내역 자체는 orphanDispositions 에 있습니다.',
  decidedAt: AT,
  items: [
    { id: 'OC-1', status: 'closed', resolution: '이미 처분된 색입니다. 새로 결정할 것이 없습니다.' },
    { id: 'OC-2', status: 'closed', resolution: '전량 폐기. 구 Primary 스케일은 현재 Primary/Red 의 같은 단계로, 상태 표시(Posi_Press)는 System/Success 로, Gray/* 이름은 Gray Scale 로 보냅니다. 뱃지·마커 2종(#00AD73 · #00AD79)은 색이 곧 정보라 남깁니다.' },
    { id: 'OC-3', status: 'closed', resolution: 'GDS 밖으로 분리. iOS UIKit 7종 · Material 2종은 OS·프레임워크가 값을 관리하므로 복제하지 않습니다. 제휴사 4종(코레일 3 · 롯데 1)도 분리하되, 제휴 확정 시 Brand 그룹 편입을 다시 검토합니다.' },
    { id: 'OC-4', status: 'open', resolution: '', note: '#143C56 · #40535E 는 CQ-5 로 처분됐습니다. 남은 것 중 #10131C(border/input/default · 12개 스타일)가 가장 큽니다 — 실제 화면 확인이 필요합니다.' },
    { id: 'OC-5', status: 'closed', resolution: '일괄 치환. 다만 이름이 $-primary-* 인 2종은 구 Primary 스케일이라 Gray 가 아니라 Primary/Red 로 보냅니다. #FCF8E8(level/gold/num)은 등급 표시색이라 남깁니다.' },
    { id: 'OC-6', status: 'closed', resolution: '일괄 치환. $-primary-* 7종은 값 기준 최근접 Primary/Red 단계로, Secondary/timedeal 과 freezone 2종은 값이 아니라 용도를 따라 Badge/Time Deal · Map Marker/Free Zone 으로 보냅니다.' },
    { id: 'OC-7', status: 'open', resolution: '', note: '뱃지·마커는 색이 곧 정보입니다. ODA 계열(주황)과 파랑 계열은 정본에 대응 뱃지가 없어 신규 단계 추가 여부부터 정해야 합니다.' },
    { id: 'OC-8', status: 'open', resolution: '', note: '규칙으로 묶이지 않는 잔여분입니다. #303E47(Def_Press · 6개)부터 봐야 합니다.' },
  ],
};

// ── CQ-9 · CQ-10 확정 ───────────────────────────────────────
const cq9 = DEC.open.find(o => o.id === 'CQ-9');
cq9.status = 'closed';
cq9.settledTitle = '알파를 토큰에 포함합니다 — System/Dim Layer 060 · 080';
cq9.resolution = `A 확정 ${AT}. System/Dim Layer 060(#00000099) · System/Dim Layer 080(#000000CC) 2종으로 쪼개고, System/Info Box BG 는 060 으로 흡수합니다. 이미 확정된 Map Marker/Shadow(#0000001A)와 같은 8자리 HEX 규칙입니다. 불투명도 값의 근거는 원본 변수가 아니라 정본 스와치 캡션이므로 alphaSource 로 표시했습니다.`;

const cq10 = DEC.open.find(o => o.id === 'CQ-10');
cq10.status = 'closed';
cq10.settledTitle = 'color/text/bolder 는 폐기합니다 — 시맨틱 계층은 이미 원본에 있습니다';
cq10.resolution = `C 확정 ${AT}. 레거시 649 스타일에서 사용 0건이라 옮길 자리가 없고, 값(#131416)도 정본 어느 단계와도 맞지 않습니다. 시맨틱 계층 자체는 원본 Buttons 페이지에서 이미 쓰고 있는 것을 확인했으므로(Semantic/Color/Background/*), 계층을 새로 만들 이유가 이 변수 하나에는 없습니다.`;

// ── 새 안건 CQ-11 ───────────────────────────────────────────
DEC.open.push({
  id: 'CQ-11',
  question: '지도 active 마커의 채움색을 정본에 새로 둘 것인가',
  detail: '정본 Map Marker 그룹에는 선·비활성·프리존·그림자만 있고 활성 마커의 채움색이 없습니다. 레거시 `Map Marker/active` 는 두 값(롯데 빨강 #E50012 · 구 브랜드 그린 #00AD73)을 갖고 있었는데 둘 다 다른 출처의 잔재라 CQ-5 에서 이름째 폐기했습니다. 실제 지도 화면에 활성 마커 채움색이 필요한지, 필요하다면 어떤 색인지가 남았습니다.',
  options: [
    'A — Primary/Red 050 을 그대로 씁니다. 브랜드 주색이라 활성 상태 표현으로 자연스럽고 새 토큰이 필요 없습니다.',
    'B — Map Marker/Active 를 신규 토큰으로 정의합니다. 마커 색은 지도에서 정보라 Primary 와 분리하는 편이 안전할 수 있습니다.',
    'C — 필요 없습니다. 활성 마커를 채움색이 아니라 크기·그림자로 구분한다면 토큰을 추가하지 않습니다.',
  ],
  recommendation: '실제 지도 화면을 봐야 정할 수 있습니다. 화면에서 활성 마커가 색으로 구분되고 있으면 B, 아니면 C 입니다.',
  blocks: [],
  status: 'open',
  from: 'CQ-5 / CF-4',
});

// ── additions 처분 확정 ─────────────────────────────────────
const ad = id => DEC.additions.find(a => a.id === id);

const ad4 = ad('AD-4');
ad4.action = 'drop';
delete ad4.blockedBy;
ad4.status = 'confirmed';
ad4.reason = 'CQ-10 C 확정 — 레거시 649 스타일에서 사용 0건이고 값도 정본 어느 단계와 맞지 않습니다. 치환 대상 없이 폐기합니다.';
ad4.evidence = 'Figma get_variable_defs 2026-08-05 · 레거시 649 스타일에 #131416 사용 0건';

const ad5 = ad('AD-5');
ad5.action = 'adopt';
delete ad5.blockedBy;
ad5.status = 'confirmed';
ad5.alphaSource = 'canon-swatch';
ad5.tokens = [
  { token: 'System/Dim Layer 060', hex: '#00000099', alpha: 0.6 },
  { token: 'System/Dim Layer 080', hex: '#000000CC', alpha: 0.8 },
];
ad5.nameDerived = true;
ad5.reason = 'CQ-9 A 확정 — 변수는 1개지만 정본 스와치가 60% · 80% 두 단계라 토큰 2종으로 나눕니다. 불투명도는 변수가 아니라 스와치 캡션에서 왔으므로 alphaSource 로 표시하고, 원본 대조는 앞 6자리(#000000)로만 합니다.';
ad5.evidence = 'Figma get_variable_defs 2026-08-05 (#000000) · get_screenshot 43246:9911 스와치 캡션 60% · 80%';

const ad6 = ad('AD-6');
ad6.action = 'retire';
delete ad6.blockedBy;
ad6.status = 'confirmed';
ad6.target = 'System/Dim Layer 060';
ad6.targetHex = '#00000099';
ad6.deltaE = 0;
ad6.reason = 'CQ-9 A 확정 — 정본 스와치 캡션이 Dim layer 01 과 같은 검정 60% 이고, 원본 설명문에도 25.06.08 기준 Info box bg 를 Dim layer 하위로 재분류한다고 적혀 있습니다. 별도 토큰을 두지 않고 System/Dim Layer 060 으로 흡수합니다.';

fs.writeFileSync(p, JSON.stringify(DEC, null, 2) + '\n');
console.log('CQ-5 · CQ-9 · CQ-10 확정 기록 완료');
console.log(`  orphanDispositions: ${DEC.orphanDispositions.length}종`);
console.log(`  열린 안건: ${DEC.open.filter(o => o.status === 'open').map(o => o.id).join(', ') || '없음'}`);
