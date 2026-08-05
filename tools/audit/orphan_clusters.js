'use strict';
/**
 * CQ-6 보조 — 정본에 없는 색(orphan)을 "묶음 단위로 판단 가능한" 형태로 묶습니다.
 *
 * 왜 필요한가:
 *   CQ-6 은 수십 건을 하나씩 보라는 안건이라 회의에서 끝날 수가 없습니다.
 *   실제로는 같은 이유로 생긴 색이 뭉쳐 있어서, 묶음 단위로 결정하면 판단 횟수가 크게 줄어듭니다.
 *
 * 분류 축 (우선순위 순):
 *   1. 이미 처분된 것        — data/color-decisions.json 의 orphanDispositions
 *   2. 구 브랜드 그린 스케일  — 리브랜딩 이전 색. 색상환에서 초록 영역
 *   3. 외부에서 들어온 색     — 이름이 출처를 드러냄(iOS UIKit · Material · 제휴사) 또는 Apple 팔레트와 값 일치
 *   4. 가장 가까운 정본 그룹  — Gray Scale / Navy / Primary / Badge / Map Marker / Brand / System
 *
 * 손으로 적은 숫자는 없습니다. 전부 data/color-merge.json · docs/color-merge-map.csv 에서 계산합니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const MG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-merge.json'), 'utf8'));
const DEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-decisions.json'), 'utf8'));

const NEAR = MG.meta.nearLimit;
const disposed = new Set((DEC.orphanDispositions || [])
  .filter(o => o.status === 'confirmed').map(o => o.hex.toUpperCase()));

// ---------- 색 변환 ----------
function rgb(hex) {
  const v = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
}
function hsl(hex) {
  const [r, g, b] = rgb(hex).map(x => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}

// 각 orphan HEX 를 쓰는 레거시 스타일 이름 전체 — 분류 근거로 씁니다.
// merge.json 의 sample 은 대표 1개뿐이라 판단이 흔들립니다.
const namesByHex = (() => {
  const csv = fs.readFileSync(path.join(ROOT, 'docs', 'color-merge-map.csv'), 'utf8').trim().split('\n').slice(1);
  const m = new Map();
  for (const line of csv) {
    // 값에 쉼표가 들어갈 수 있어 따옴표 인식 파서를 씁니다.
    const f = []; let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { f.push(cur); cur = ''; continue; }
      cur += ch;
    }
    f.push(cur);
    const name = f[1], hex = (f[3] || '').toUpperCase();
    if (!hex) continue;
    if (!m.has(hex)) m.set(hex, []);
    m.get(hex).push(name);
  }
  return m;
})();

// 외부에서 들어온 색 — 이름이 출처를 그대로 드러냅니다.
const FOREIGN = [
  { re: /^Default\/System|^Label Color\/|^Separator Color\/|^Fill Color\/|^Background Color\//i, src: 'iOS UIKit' },
  { re: /material-theme|^md\.|^Global \//i, src: 'Material / 외부 토큰셋' },
  { re: /korail|코레일/i, src: '코레일 제휴' },
  { re: /lotte|롯데|L\.?\s?POINT|엘포인트/i, src: '롯데 제휴' },
  { re: /T\s?Membership|SKT/i, src: 'T멤버십 제휴' },
];
function foreignSource(hex) {
  const names = namesByHex.get(hex.toUpperCase()) || [];
  for (const f of FOREIGN) if (names.some(n => f.re.test(n))) return f.src;
  return null;
}

// iOS 기본 시스템 색 (Apple 공개 팔레트, light 기준)
const IOS = {
  '#007AFF': 'systemBlue', '#34C759': 'systemGreen', '#FF3B30': 'systemRed',
  '#FF9500': 'systemOrange', '#FFCC00': 'systemYellow', '#AF52DE': 'systemPurple',
  '#5856D6': 'systemIndigo', '#FF2D55': 'systemPink', '#5AC8FA': 'systemTeal',
  '#8E8E93': 'systemGray',
};

// ---------- 분류 ----------
const CLUSTERS = [
  { id: 'OC-1', name: '이미 처분됨', why: '확정된 결정으로 처분이 끝난 색입니다.',
    action: '결정 불필요',
    recommend: '이미 끝난 건입니다. 목록에는 합계가 맞는지 보이려고 남겨 둡니다.' },
  { id: 'OC-2', name: '구 브랜드 그린 스케일', why: '리브랜딩 이전 그린 계열입니다. 현재 정본에는 그린 스케일 자체가 없습니다.',
    action: '전량 폐기 권고',
    recommend: '정본에 그린 스케일이 없다는 것 자체가 리브랜딩 결과입니다. 되살릴 근거가 없으면 통째로 폐기하는 게 맞습니다. 다만 상태 표시용 초록이 필요한 자리는 System/Success(#00C88C) 로 보내야 합니다 — 지금 기계 판정이 이 묶음 대부분을 System/Success 로 가리키는 건 "가장 가까운 색"일 뿐 용도가 같아서가 아닙니다.' },
  { id: 'OC-3', name: '외부에서 들어온 색', why: '이름이 출처를 드러냅니다 — iOS UIKit · Material · 제휴사 브랜드. GDS 가 정할 색이 아닙니다.',
    action: 'GDS 밖으로 분리',
    recommend: 'iOS UIKit · Material 값은 OS/프레임워크가 주는 것이라 GDS 토큰으로 복제하면 안 됩니다 — 복제하면 OS 가 값을 바꿀 때 어긋납니다. 제휴사 색(코레일·롯데)은 별개 판단이 필요합니다: 정본에 이미 Brand/L.POINT · Brand/T Membership 선례가 있으므로, 유지한다면 같은 Brand 그룹에 넣는 편이 일관됩니다.' },
  { id: 'OC-4', name: '네이비 변종', why: '가장 가까운 정본이 Navy 계열입니다. 정본 방침상 네이비는 색 자체가 정보인 요소에만 남깁니다.',
    action: '상위 2종만 화면 확인 후 결정',
    recommend: '스타일 수가 가장 많은 묶음입니다. 상위 2종이 절반 이상을 차지하므로 그 둘만 실제 화면에서 확인하면 대부분이 정리됩니다. ΔE 가 4~9 라 나란히 놓으면 구분되므로, 일괄 치환 전에 눈으로 봐야 합니다.' },
  { id: 'OC-5', name: '그레이 변종', why: '가장 가까운 정본이 Gray Scale 입니다. 배경·라인·보조 텍스트가 대부분입니다.',
    action: '일괄 치환 권고',
    recommend: '용도가 배경·구분선·보조 텍스트라 색이 조금 달라져도 의미가 바뀌지 않습니다. 묶음째 정본 Gray 로 보내는 게 안전합니다.' },
  { id: 'OC-6', name: '레드 변종', why: '가장 가까운 정본이 Primary/Red 입니다.',
    action: '일괄 치환 권고',
    recommend: '대부분 구 $-primary-* 스케일 잔재입니다. 정본 Red 단계가 이미 9단계로 촘촘하므로 대응 단계로 보내면 됩니다.' },
  { id: 'OC-7', name: '뱃지 · 마커 변종', why: '가장 가까운 정본이 Badge 또는 Map Marker 입니다. 색 자체가 의미를 갖는 영역입니다.',
    action: '개별 판단 — 자동 치환 금지',
    recommend: '이 영역은 색이 곧 정보라 가까운 색으로 밀면 의미가 바뀝니다. ODA 계열(주황)과 파랑 계열은 정본에 대응하는 뱃지가 없으므로, 신규 Badge 단계로 추가할지 아니면 해당 기능을 접을지부터 정해야 합니다.' },
  { id: 'OC-8', name: '그 외', why: '위 어디에도 들어가지 않습니다. 개별로 봐야 합니다.',
    action: '개별 판단',
    recommend: '규칙으로 묶이지 않는 잔여분입니다. 가장 많이 쓰인 것부터 봐야 합니다.' },
];

function classify(o) {
  const hex = o.hex.toUpperCase();
  if (disposed.has(hex)) return 'OC-1';
  if (IOS[hex] || foreignSource(hex)) return 'OC-3';
  const c = hsl(hex);
  // 초록 영역 — 채도가 있어야 '색'입니다. 무채색은 그레이로 갑니다.
  if (c.h >= 90 && c.h <= 175 && c.s >= 0.15) return 'OC-2';
  const g = String(o.target).split('/')[0];
  if (g === 'Navy') return 'OC-4';
  if (g === 'Gray Scale') return 'OC-5';
  if (g === 'Primary') return 'OC-6';
  if (g === 'Badge' || g === 'Map Marker') return 'OC-7';
  return 'OC-8';
}

const orphans = MG.orphans.filter(o => o.delta > NEAR);
const byCluster = new Map(CLUSTERS.map(c => [c.id, []]));
for (const o of orphans) {
  const c = hsl(o.hex);
  byCluster.get(classify(o)).push({
    ...o,
    hue: Math.round(c.h), sat: +c.s.toFixed(2), lum: +c.l.toFixed(2),
    ios: IOS[o.hex.toUpperCase()] || null,
    foreign: foreignSource(o.hex),
    names: namesByHex.get(o.hex.toUpperCase()) || [],
  });
}

const out = {
  $description: 'CQ-6 보조 — 정본에 없는 색을 묶음 단위로 판단하기 위한 분류. tools/audit/orphan_clusters.js 가 생성합니다.',
  generatedFrom: 'data/color-merge.json',
  nearLimit: NEAR,
  totalOrphanReview: orphans.length,
  totalStyles: orphans.reduce((a, o) => a + o.styles, 0),
  clusters: CLUSTERS.map(c => {
    const items = byCluster.get(c.id).sort((a, b) => b.styles - a.styles || a.delta - b.delta);
    return {
      ...c,
      hexCount: items.length,
      styleCount: items.reduce((a, o) => a + o.styles, 0),
      deltaMin: items.length ? Math.min(...items.map(o => o.delta)) : null,
      deltaMax: items.length ? Math.max(...items.map(o => o.delta)) : null,
      items,
    };
  }).filter(c => c.hexCount > 0),
};

// 합계가 어긋나면 분류에 구멍이 있는 것입니다.
const sum = out.clusters.reduce((a, c) => a + c.hexCount, 0);
if (sum !== orphans.length) throw new Error(`분류 누락 — ${sum} vs ${orphans.length}`);

fs.writeFileSync(path.join(ROOT, 'data', 'orphan-clusters.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`orphan 묶음 → data/orphan-clusters.json`);
console.log(`  ${out.totalOrphanReview}종 · ${out.totalStyles}개 스타일 → ${out.clusters.length}묶음`);
for (const c of out.clusters) {
  console.log(`  ${c.id} ${c.name.padEnd(14)} ${String(c.hexCount).padStart(3)}종 · ${String(c.styleCount).padStart(3)}개`);
}

module.exports = out;
