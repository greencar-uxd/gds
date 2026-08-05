'use strict';
/**
 * 색 감사 — 명명 규칙 진단 + 중복 집계.
 * 입력: data/foundation-data.json (정본 canon.color.styles 53 + 레거시 colors 649)
 * 출력: data/color-audit.json (기계 판독용), docs/color-duplicates.csv, docs/color-naming-map.csv
 *
 * 규칙: 이 파일 밖에서 손으로 숫자를 적지 않습니다. 문서 수치는 전부 여기서 나온 값입니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));

// ---------- 공통 ----------
const splitName = n => (n.includes('/') ? [n.split('/')[0], n.split('/').slice(1).join('/')] : ['(그룹없음)', n]);
const normGroup = g => g.toLowerCase().replace(/[^a-z0-9]/g, ''); // 대소문자·공백 무시 비교용

// 상대 휘도 (WCAG 2.1)
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const v = m[1];
  const ch = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ============================================================
// 1. 레거시 649 — 그룹명 변형 충돌
// ============================================================
const legacy = D.colors.map(s => { const [g, n] = splitName(s.name); return { ...s, group: g, leaf: n }; });

const groupCount = {};
for (const s of legacy) groupCount[s.group] = (groupCount[s.group] || 0) + 1;

const groupVariants = {}; // 정규화키 → { 표기: 건수 }
for (const [g, n] of Object.entries(groupCount)) {
  const k = normGroup(g);
  (groupVariants[k] = groupVariants[k] || {})[g] = n;
}
const variantCollisions = Object.entries(groupVariants)
  .filter(([, v]) => Object.keys(v).length > 1)
  .map(([k, v]) => ({
    key: k,
    variants: Object.entries(v).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    total: Object.values(v).reduce((a, b) => a + b, 0),
  }))
  .sort((a, b) => b.total - a.total);

// ============================================================
// 2. 레거시 649 — 완전 동일 이름 중복 / 이름-값 충돌
// ============================================================
const byName = {};
for (const s of legacy) (byName[s.name] = byName[s.name] || []).push(s);

const sameNameDup = Object.entries(byName).filter(([, a]) => a.length > 1)
  .map(([name, a]) => ({
    name,
    count: a.length,
    hexes: [...new Set(a.map(s => s.hex))],
    ids: a.map(s => s.id),
  })).sort((a, b) => b.count - a.count);

// 같은 이름인데 값이 다른 것 = 가장 위험 (어느 쪽이 옳은지 판정 불가)
const nameValueConflict = sameNameDup.filter(d => d.hexes.length > 1);

// ============================================================
// 3. 레거시 649 — HEX 중복
// ============================================================
const byHex = {};
for (const s of legacy) (byHex[s.hex] = byHex[s.hex] || []).push(s);
const uniqueHex = Object.keys(byHex).length;
const hexDup = Object.entries(byHex).filter(([, a]) => a.length > 1)
  .map(([hex, a]) => ({
    hex,
    count: a.length,
    names: [...new Set(a.map(s => s.name))],
    nameCount: new Set(a.map(s => s.name)).size,
    canon: null, // 아래에서 채움
  })).sort((a, b) => b.count - a.count);

// ============================================================
// 4. 정본 53 — 명명 규칙 진단
// ============================================================
const canon = D.canon.color.styles.map(s => {
  const [g, n] = splitName(s.name);
  return { ...s, group: g, leaf: n, lum: luminance(s.hex) };
});

// 정본 HEX 를 레거시 HEX 중복 표에 표시
const canonHex = new Set(canon.map(s => s.hex));
for (const r of hexDup) r.canon = canonHex.has(r.hex);

// 4-1. 단계형 그룹 (leaf 가 "Hue NNN" 형태)
const STEP_RE = /^(.+?)\s+(\d{2,3})$/;
const scaleGroups = {};
for (const s of canon) {
  const m = STEP_RE.exec(s.leaf);
  if (!m) continue;
  const hue = m[1];
  (scaleGroups[s.group] = scaleGroups[s.group] || []).push({ ...s, hue, step: Number(m[2]), stepRaw: m[2] });
}

const namingFindings = [];

for (const [g, list] of Object.entries(scaleGroups)) {
  // (a) hue 표기 대소문자 흔들림
  const hueVariants = {};
  for (const s of list) (hueVariants[s.hue.toLowerCase()] = hueVariants[s.hue.toLowerCase()] || new Set()).add(s.hue);
  for (const [k, set] of Object.entries(hueVariants)) {
    if (set.size > 1) {
      const arr = [...set];
      const counts = arr.map(v => ({ v, n: list.filter(s => s.hue === v).length })).sort((a, b) => b.n - a.n);
      namingFindings.push({
        code: 'CN-1', group: g, kind: '대소문자 흔들림',
        detail: `${g} 그룹의 색상명이 ${arr.map(v => `"${v}"`).join(' / ')} 로 갈림`,
        minority: counts.slice(1).flatMap(c => list.filter(s => s.hue === c.v).map(s => s.name)),
        fix: `소수 표기를 "${counts[0].v}" 로 통일`,
      });
    }
  }

  // (b) 단계 자릿수/체계 혼용 — 명도 순서 기준으로 기대 단계와 대조
  const ordered = [...list].sort((a, b) => b.lum - a.lum); // 밝은 → 어두운
  const stepsAsc = ordered.map(s => s.step);
  const monotone = stepsAsc.every((v, i, a) => i === 0 || v > a[i - 1]);
  if (!monotone) {
    // 명도 순서상 위치에서 기대되는 단계값을 추정: 다수 체계(10단위 3자리) 기준
    const suspects = [];
    for (let i = 0; i < ordered.length; i++) {
      const prev = i > 0 ? ordered[i - 1].step : -Infinity;
      const next = i < ordered.length - 1 ? ordered[i + 1].step : Infinity;
      if (!(ordered[i].step > prev && ordered[i].step < next)) suspects.push(ordered[i]);
    }
    namingFindings.push({
      code: 'CN-2', group: g, kind: '단계 번호 체계 혼용',
      detail: `명도 순으로 정렬하면 단계 번호가 단조 증가하지 않음 — ${ordered.map(s => s.stepRaw).join(' → ')}`,
      suspects: suspects.map(s => ({ name: s.name, hex: s.hex })),
      fix: null, // 그룹별로 아래에서 개별 제안
    });
  }

  // (c) 결번 — 2자리(10~90) 주 체계 안에서만 판정.
  //     3자리 이상 값은 CN-2(체계 혼용)의 결과이므로 결번 계산에서 제외합니다.
  const mixed = namingFindings.some(f => f.code === 'CN-2' && f.group === g);
  const present = new Set(list.map(s => s.step).filter(v => v % 10 === 0 && v <= 100));
  const min = Math.min(...present), max = Math.max(...present);
  const missing = [];
  for (let v = min; v <= max; v += 10) if (!present.has(v)) missing.push(v);
  if (missing.length) {
    namingFindings.push({
      code: 'CN-3', group: g, kind: '단계 결번',
      detail: `${String(min).padStart(3, '0')}~${String(max).padStart(3, '0')} 사이에 ${missing.map(v => String(v).padStart(3, '0')).join(', ')} 없음`,
      missing, derived: mixed,
      fix: mixed
        ? 'CN-2(번호 체계 혼용)를 먼저 정리하면 이 결번은 자동으로 메워집니다'
        : '결번을 그대로 둘지(비어 있음이 의도) 채울지 결정 필요',
    });
  }

  // (d) 명도 역전 — 단계 번호 순서와 실제 명도 순서 불일치
  const mixed4 = namingFindings.some(f => f.code === 'CN-2' && f.group === g);
  const byStep = [...list].sort((a, b) => a.step - b.step);
  for (let i = 1; i < byStep.length; i++) {
    if (byStep[i].lum > byStep[i - 1].lum) {
      // 3자리 이상 값이 끼어 생긴 역전은 CN-2 의 결과입니다.
      const derived = mixed4 && (byStep[i].step > 100 || byStep[i - 1].step > 100);
      namingFindings.push({
        code: 'CN-4', group: g, kind: '명도 역전',
        detail: `${byStep[i - 1].name}(${byStep[i - 1].hex}) 보다 ${byStep[i].name}(${byStep[i].hex}) 이 더 밝음 — 단계가 커질수록 어두워야 하는 규칙에 어긋남`,
        pair: [byStep[i - 1].name, byStep[i].name], derived,
        fix: derived ? 'CN-2 정리 시 자동 해소' : '원본 확인 필요 — 값이 뒤바뀐 것인지 의도인지 판단 불가',
      });
    }
  }
}

// 4-2. 의미형 그룹 (Badge / Map Marker / Brand / System) — 표기 규칙
const semantic = canon.filter(s => !STEP_RE.test(s.leaf));
const semanticIssues = semantic.filter(s => /[_]/.test(s.leaf) || /\s{2,}/.test(s.leaf))
  .map(s => ({ name: s.name, issue: /_/.test(s.leaf) ? '언더스코어 사용 (다른 이름은 공백)' : '중복 공백' }));

// 4-3. 스와치 ↔ 라벨 불일치 (g11)
const labelMismatch = canon.filter(s => s.label && s.hex && s.label.toUpperCase() !== s.hex.toUpperCase())
  .map(s => ({ name: s.name, swatch: s.hex, label: s.label }));

// 4-4. 정본 안의 값 중복 (서로 다른 이름 · 같은 HEX)
const canonByHex = {};
for (const s of canon) (canonByHex[s.hex] = canonByHex[s.hex] || []).push(s.name);
const canonHexDup = Object.entries(canonByHex).filter(([, a]) => a.length > 1)
  .map(([hex, names]) => ({ hex, names }));

// ============================================================
// 5. Red 300/400/500 가설 검증
// ============================================================
const red = (scaleGroups['Primary'] || []).filter(s => /red/i.test(s.hue)).sort((a, b) => b.lum - a.lum);
const redHypothesis = {
  ordered: red.map(s => ({ name: s.name, hex: s.hex, step: s.stepRaw })),
  // 명도 순 i 번째 → 기대 단계 = (i+1)*10
  expected: red.map((s, i) => ({ name: s.name, hex: s.hex, actual: s.stepRaw, expected: String((i + 1) * 10).padStart(3, '0') })),
  docText: D.canon.color.hierarchy && D.canon.color.hierarchy.primary || null,
};
redHypothesis.mismatched = redHypothesis.expected.filter(e => e.actual !== e.expected);
// 문서가 언급한 단계에 해당하는 실제 HEX
const stepToHex = {};
for (const e of redHypothesis.expected) stepToHex[e.expected] = e.hex;
redHypothesis.docRefs = { 'Red 050': stepToHex['050'] || null, 'Red 040': stepToHex['040'] || null };
const brandRed = canon.find(s => /G car Red/i.test(s.name));
redHypothesis.brandRedHex = brandRed ? brandRed.hex : null;
redHypothesis.brandMatchesRed050 = brandRed ? brandRed.hex.toUpperCase() === (stepToHex['050'] || '').toUpperCase() : null;
// 접근성: 흰 배경 대비
if (redHypothesis.docRefs['Red 040']) redHypothesis.red040OnWhite = Number(contrast(redHypothesis.docRefs['Red 040'], '#FFFFFF').toFixed(2));
if (redHypothesis.docRefs['Red 050']) redHypothesis.red050OnWhite = Number(contrast(redHypothesis.docRefs['Red 050'], '#FFFFFF').toFixed(2));

// ============================================================
// 6. 병합 시뮬레이션 — 정본으로 흡수 가능한 레거시
// ============================================================
const canonByHexSet = new Map();
for (const s of canon) if (!canonByHexSet.has(s.hex)) canonByHexSet.set(s.hex, s.name);
const legacyAbsorbable = legacy.filter(s => canonByHexSet.has(s.hex));
const legacyOrphanHex = [...new Set(legacy.filter(s => !canonByHexSet.has(s.hex)).map(s => s.hex))];

const result = {
  meta: {
    generated_from: 'tools/audit/color_audit.js',
    source: D.meta.source,
    exported: D.meta.exported,
  },
  legacy: {
    styles: legacy.length,
    uniqueHex,
    duplicateStyleCount: legacy.length - uniqueHex,
    groups: Object.keys(groupCount).length,
    groupVariantCollisions: variantCollisions.length,
    groupVariantCollisionStyles: variantCollisions.reduce((a, b) => a + b.total, 0),
    sameNameDupNames: sameNameDup.length,
    sameNameDupStyles: sameNameDup.reduce((a, b) => a + b.count, 0),
    nameValueConflicts: nameValueConflict.length,
    absorbable: legacyAbsorbable.length,
    orphanHex: legacyOrphanHex.length,
  },
  canon: {
    styles: canon.length,
    uniqueHex: new Set(canon.map(s => s.hex)).size,
    hexDupGroups: canonHexDup.length,
    namingFindings: namingFindings.length,
    labelMismatch: labelMismatch.length,
    semanticIssues: semanticIssues.length,
  },
  details: {
    variantCollisions, sameNameDup: sameNameDup.slice(0, 40), nameValueConflict,
    hexDupTop: hexDup.slice(0, 30), namingFindings, semanticIssues, labelMismatch,
    canonHexDup, redHypothesis, legacyOrphanHex,
  },
};

fs.writeFileSync(path.join(ROOT, 'data', 'color-audit.json'), JSON.stringify(result, null, 2));

// ---------- CSV ----------
const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
let csv = 'hex,스타일수,고유이름수,정본포함,이름들\n';
for (const r of hexDup) csv += [esc(r.hex), r.count, r.nameCount, r.canon ? 'Y' : 'N', esc(r.names.join(' | '))].join(',') + '\n';
fs.writeFileSync(path.join(ROOT, 'docs', 'color-duplicates.csv'), csv);

let csv2 = '구분,현행 이름,HEX,진단,제안\n';
for (const f of namingFindings) {
  const targets = f.minority || (f.suspects || []).map(s => s.name) || [];
  if (targets.length) for (const t of targets) {
    const s = canon.find(x => x.name === t);
    csv2 += [f.code, esc(t), esc(s ? s.hex : ''), esc(f.kind + ' — ' + f.detail), esc(f.fix || '')].join(',') + '\n';
  } else csv2 += [f.code, esc(f.group), '', esc(f.kind + ' — ' + f.detail), esc(f.fix || '')].join(',') + '\n';
}
for (const s of semanticIssues) csv2 += ['CN-5', esc(s.name), esc((canon.find(x => x.name === s.name) || {}).hex || ''), esc(s.issue), esc('공백 표기로 통일')].join(',') + '\n';
for (const m of labelMismatch) csv2 += ['CN-6', esc(m.name), esc(m.swatch), esc(`스와치 ${m.swatch} vs 표기 라벨 ${m.label}`), esc('원본 확인 필요')].join(',') + '\n';
fs.writeFileSync(path.join(ROOT, 'docs', 'color-naming-map.csv'), csv2);

// ---------- 콘솔 ----------
console.log('색 감사 완료 → data/color-audit.json · docs/color-duplicates.csv · docs/color-naming-map.csv');
console.log(`  레거시 ${result.legacy.styles}개 스타일 → 고유 HEX ${result.legacy.uniqueHex}종 (중복 ${result.legacy.duplicateStyleCount})`);
console.log(`  그룹 ${result.legacy.groups}개 중 표기 변형 충돌 ${result.legacy.groupVariantCollisions}묶음 (${result.legacy.groupVariantCollisionStyles}개 스타일)`);
console.log(`  같은 이름 중복 ${result.legacy.sameNameDupNames}종 / 그중 값까지 다른 것 ${result.legacy.nameValueConflicts}종`);
console.log(`  정본 ${result.canon.styles}개 — 명명 지적 ${result.canon.namingFindings}건 · 라벨 불일치 ${result.canon.labelMismatch}건`);

module.exports = result;
