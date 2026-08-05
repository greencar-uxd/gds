'use strict';
/**
 * 타이포 감사 — 정본 21단계 스펙 충돌 + 레거시 254 스타일 중복/이름 재사용 진단.
 * 출력: data/type-audit.json, docs/type-collisions.csv
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));

const canon = D.canon.typography.scale;
const legacy = D.types;

const weightNum = w => (/Bold/i.test(w) ? 700 : /Medium/i.test(w) ? 500 : /Regular/i.test(w) ? 400 : null);
const styleNum = s => (/Bold/i.test(s) ? 700 : /Medium|Semi/i.test(s) ? 500 : 400);

// ============================================================
// 1. 정본 — 같은 (size, weight) 를 갖는 토큰 = 개발자가 구분 불가
// ============================================================
const specKey = t => `${t.size}/${weightNum(t.weight)}`;
const bySpec = {};
for (const t of canon) (bySpec[specKey(t)] = bySpec[specKey(t)] || []).push(t.token);
const specCollisions = Object.entries(bySpec).filter(([, a]) => a.length > 1)
  .map(([k, tokens]) => ({ size: Number(k.split('/')[0]), weight: Number(k.split('/')[1]), tokens }))
  .sort((a, b) => b.size - a.size);

// 2. 정본 — 행간 정의 여부
const lhDefined = canon.filter(t => t.lineHeight && !/auto/i.test(String(t.lineHeight)));
const lhAuto = canon.filter(t => /auto/i.test(String(t.lineHeight)));

// 3. 정본 — 자간 필드 자체가 없음
const lsDefined = canon.filter(t => t.letterSpacing != null);

// 4. 정본 — 폰트 패밀리 미지정
const famDefined = canon.filter(t => t.family != null);

// ============================================================
// 5. 레거시 — 폰트 패밀리 census + 대소문자 중복
// ============================================================
const famCount = {};
for (const s of legacy) famCount[s.family] = (famCount[s.family] || 0) + 1;
const famNorm = {};
for (const [f, n] of Object.entries(famCount)) {
  const k = f.toLowerCase().replace(/\s+/g, ' ').trim();
  (famNorm[k] = famNorm[k] || []).push({ name: f, count: n });
}
const famCaseDup = Object.entries(famNorm).filter(([, a]) => a.length > 1)
  .map(([k, a]) => ({ key: k, variants: a.sort((x, y) => y.count - x.count), total: a.reduce((s, x) => s + x.count, 0) }));

// ============================================================
// 6. 레거시 — 정본 토큰명 재사용 충돌
//    같은 토큰 이름인데 정본 스펙과 레거시 스펙이 다름 = 개발자 혼동의 직접 원인
// ============================================================
const leaf = n => (n.includes('/') ? n.split('/').pop() : n);
const nameCore = n => leaf(n).split('ㅣ')[0].split('|')[0].trim();

const reuse = [];
for (const t of canon) {
  const re = new RegExp('^' + t.token.replace(/\s+/g, '\\s*') + '$', 'i');
  const hits = legacy.filter(s => re.test(nameCore(s.name)));
  if (!hits.length) continue;
  const variants = [];
  for (const h of hits) {
    const k = `${h.size}/${styleNum(h.style)}`;
    if (!variants.some(v => v.key === k)) variants.push({ key: k, size: h.size, weight: styleNum(h.style), sample: h.name, family: h.family });
  }
  const canonKey = specKey(t);
  const conflicting = variants.filter(v => v.key !== canonKey);
  if (conflicting.length) {
    reuse.push({
      token: t.token,
      canon: { size: t.size, weight: weightNum(t.weight) },
      legacyVariants: variants.map(v => ({ size: v.size, weight: v.weight, sample: v.sample, family: v.family })),
      conflictCount: conflicting.length,
      hits: hits.length,
    });
  }
}

// 7. 레거시 — 완전 동일 이름 중복
const byName = {};
for (const s of legacy) (byName[s.name] = byName[s.name] || []).push(s);
const nameDup = Object.entries(byName).filter(([, a]) => a.length > 1)
  .map(([name, a]) => ({
    name, count: a.length,
    specs: [...new Set(a.map(s => `${s.family} ${s.style} ${s.size}`))],
  })).sort((a, b) => b.count - a.count);
const nameDupConflicting = nameDup.filter(d => d.specs.length > 1);

// 8. 레거시 — 행간 단위 혼용
const lhUnits = {};
for (const s of legacy) { const u = s.lineHeight ? s.lineHeight.u : 'NONE'; lhUnits[u] = (lhUnits[u] || 0) + 1; }

const result = {
  meta: { generated_from: 'tools/audit/type_audit.js', source: D.meta.source, exported: D.meta.exported },
  canon: {
    tokens: canon.length,
    uniqueSpecs: Object.keys(bySpec).length,
    specCollisionGroups: specCollisions.length,
    specCollisionTokens: specCollisions.reduce((a, b) => a + b.tokens.length, 0),
    lineHeightDefined: lhDefined.length,
    lineHeightAuto: lhAuto.length,
    letterSpacingDefined: lsDefined.length,
    familyDefined: famDefined.length,
  },
  legacy: {
    styles: legacy.length,
    families: Object.keys(famCount).length,
    familyCaseDupGroups: famCaseDup.length,
    familyCaseDupStyles: famCaseDup.reduce((a, b) => a + b.total, 0),
    nameDupNames: nameDup.length,
    nameDupConflicting: nameDupConflicting.length,
    lineHeightUnits: lhUnits,
    tokenNameReuse: reuse.length,
  },
  details: { specCollisions, famCount, famCaseDup, reuse, nameDupConflicting: nameDupConflicting.slice(0, 30) },
};

fs.writeFileSync(path.join(ROOT, 'data', 'type-audit.json'), JSON.stringify(result, null, 2));

const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
let csv = '구분,토큰,정본 스펙,충돌 내용,비고\n';
for (const c of specCollisions) {
  csv += ['TY-1', esc(c.tokens.join(' = ')), esc(`${c.size}px / ${c.weight}`), esc('크기·굵기가 완전히 동일 — 행간도 Auto 라 구분 근거 없음'), esc('용도 구분을 행간/자간으로 정의하거나 토큰 통합')].join(',') + '\n';
}
for (const r of reuse) {
  csv += ['TY-2', esc(r.token), esc(`${r.canon.size}px / ${r.canon.weight}`),
    esc('레거시 동명 스타일: ' + r.legacyVariants.map(v => `${v.size}px/${v.weight}`).join(', ')),
    esc(`레거시 ${r.hits}개 — 같은 이름이 다른 크기를 가리킴`)].join(',') + '\n';
}
for (const f of famCaseDup) {
  csv += ['TY-3', esc(f.variants.map(v => v.name).join(' vs ')), '', esc('대소문자만 다른 폰트 패밀리 중복'), esc(f.variants.map(v => `${v.name}(${v.count})`).join(' / '))].join(',') + '\n';
}
fs.writeFileSync(path.join(ROOT, 'docs', 'type-collisions.csv'), csv);

console.log('타이포 감사 완료 → data/type-audit.json · docs/type-collisions.csv');
console.log(`  정본 ${result.canon.tokens}단계 → 고유 스펙 ${result.canon.uniqueSpecs}종 · 완전 동일 ${result.canon.specCollisionGroups}쌍(${result.canon.specCollisionTokens}토큰)`);
console.log(`  정본 행간 정의 ${result.canon.lineHeightDefined}/${result.canon.tokens} · 자간 ${result.canon.letterSpacingDefined} · 폰트 ${result.canon.familyDefined}`);
console.log(`  레거시 ${result.legacy.styles}개 · 패밀리 ${result.legacy.families}종(대소문자 중복 ${result.legacy.familyCaseDupGroups}묶음) · 토큰명 재사용 충돌 ${result.legacy.tokenNameReuse}건`);

module.exports = result;
