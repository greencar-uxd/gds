'use strict';
// 원본(canon) → 개발자 배포용 토큰 파일 (CSS / SCSS / JSON)
// 확정되지 않았거나 충돌하는 값은 내보내지 않고, 주석으로 이유를 남깁니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const C = D.canon;
const OUT = path.join(ROOT, 'dist', 'tokens');

// "Gray Scale/Gray 000" → gray-000  (연속 중복 낱말 제거)
const { slug, colorKey } = require('./slug.js');

// ---------- 색 ----------
// 확정 결정(data/color-decisions.json)이 적용된 뷰를 씁니다 — 원본 .fig 는 고칠 수 없습니다.
const VIEW = require('./canon-view.js');
if (VIEW.integrity.missing.length) {
  throw new Error(`color-decisions.json 이 낡았습니다 — 원본에 없는 이름: ${VIEW.integrity.missing.join(', ')}`);
}
if (VIEW.integrity.hexMismatch.length) {
  throw new Error(`color-decisions.json 의 HEX 가 원본과 다릅니다: ${VIEW.integrity.hexMismatch.map(h => `${h.from} ${h.hex}≠${h.actual}`).join(', ')}`);
}
if (VIEW.integrity.overrideMissing.length || VIEW.integrity.overrideStale.length) {
  throw new Error(`valueOverrides 가 원본과 어긋납니다 — 없는 토큰: ${VIEW.integrity.overrideMissing.join(', ')} · 원본 값 불일치: ${VIEW.integrity.overrideStale.map(o => o.token).join(', ')}`);
}
if (VIEW.integrity.additionUnknown.length) {
  throw new Error(`additions 가 Figma 변수 스냅샷에 없는 이름을 가리킵니다: ${VIEW.integrity.additionUnknown.join(', ')}`);
}
if (VIEW.integrity.additionStale.length) {
  throw new Error(`additions 의 값이 Figma 원본과 다릅니다: ${VIEW.integrity.additionStale.join(', ')}`);
}
if (VIEW.integrity.additionCollision.length) {
  throw new Error(`additions 의 편입 이름이 이미 원본에 있습니다: ${VIEW.integrity.additionCollision.join(', ')}`);
}
const STEP_EXC = new Set(VIEW.stepExceptions ? VIEW.stepExceptions.value : []);
const colors = VIEW.colors.map(s => {
  const [group, name] = s.name.includes('/') ? [s.name.split('/')[0], s.name.split('/').slice(1).join('/')] : ['', s.name];
  return {
    key: colorKey(s.name), name: s.name, group, hex: s.hex,
    was: s.renamed ? s.originalName : null, isMain: s.isMain,
    stepException: STEP_EXC.has(s.name),
    wasHex: s.overridden ? s.originalHex : null,
    added: !!s.added, sourceName: s.sourceName || null,
    alpha: s.alpha != null ? s.alpha : null,
    nameDerived: !!s.nameDerived,
  };
});
// 같은 키가 겹치면 뒤에 번호를 붙이지 않고 그대로 노출(중복은 정리 대상이므로 숨기지 않습니다)
const colorDupKeys = colors.map(c => c.key).filter((k, i, a) => a.indexOf(k) !== i);

// ---------- 타이포 ----------
const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const FONT = TDEC.fontFamily && TDEC.fontFamily.status === 'confirmed' ? TDEC.fontFamily : null;
const LH = TDEC.lineHeight && TDEC.lineHeight.status === 'confirmed' ? TDEC.lineHeight : null;
// Figma Auto == CSS line-height:normal (둘 다 폰트 메트릭 기준). iOS/Android 도 기본값이 이에 해당합니다.
const LH_CSS = LH && LH.value === 'Auto' ? 'normal' : (LH ? LH.value : null);
const LS = TDEC.letterSpacing && TDEC.letterSpacing.status === 'confirmed' ? TDEC.letterSpacing : null;
const USAGE = TDEC.usage && TDEC.usage.status === 'confirmed' ? TDEC.usage.map : null;
if (USAGE) {
  const missing = (C.typography.scale || []).map(t => t.token).filter(t => !USAGE[t]);
  if (missing.length) throw new Error(`type-decisions.json 의 usage 에 빠진 토큰: ${missing.join(', ')}`);
}
const types = (C.typography.scale || []).map(t => ({
  key: slug(t.token), token: t.token, size: t.size,
  weight: /Bold/i.test(t.weight || '') ? 700 : /Medium/i.test(t.weight || '') ? 500 : 400,
  lineHeight: t.lineHeight,
  usage: USAGE ? USAGE[t.token] : null,
}));

// ---------- 간격 ----------
const spConflict = new Set((C.spacing.conflicts || []).map(c => c.token));
const spacing = (C.spacing.scale || []).map(s => ({ token: s.token, px: s.px, conflict: spConflict.has(s.token) }));

// ---------- 반경 ----------
const radius = [
  { key: '4', px: 4 }, { key: '8', px: 8 }, { key: '10', px: 10 },
  { key: '12', px: 12 }, { key: '16', px: 16 }, { key: '20', px: 20 },
  { key: 'full', px: 9999 },
];

// ---------- 엘리베이션 ----------
const E = C.elevation;
const shadowCss = st => st.layers
  .map(l => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(0,0,0,${l.alpha})`).join(', ');
const elevation = E ? E.scale.map(st => ({ key: st.name.replace(/^Elevation_/, ''), name: st.name, was: st.was, value: shadowCss(st), layers: st.layers })) : [];

const HEAD = `/* GDS — G car Design System 토큰
 * 생성: ${D.meta.source} (export ${String(D.meta.exported).slice(0, 10)})
 * 출처: ✅ Foundation 페이지 원본. 레거시 스타일(현황)은 포함하지 않습니다.
 * 자동 생성 파일입니다 — 직접 수정하지 마세요.
 */`;

// ---------- CSS ----------
// 별칭 — 값이 같은 무리에서 단계 그룹의 칸이 원본이고, 역할 이름은 그것을 가리킵니다 (GAP-5).
// 값을 두 번 적으면 한쪽만 바뀔 때 조용히 어긋나므로 별칭은 var() 로 원본을 참조합니다.
const AL = VIEW.colorAliases;
const aliasOf = {};      // 별칭 키 → { baseKey, baseName, rule }
const crossRef = {};     // 판정 불가 무리 → 서로를 가리키는 주석
if (AL) {
  for (const d of AL.duplicates) {
    if (d.decidable) {
      for (const a of d.aliases) aliasOf[a.key] = { baseKey: d.base.key, baseName: d.base.name, rule: d.rule };
    } else {
      for (const m of d.members) {
        crossRef[m.key] = d.members.filter(x => x.key !== m.key).map(x => x.name);
      }
    }
  }
}

let css = HEAD + '\n:root {\n  /* Color */\n';
for (const c of colors) {
  const notes = [];
  if (colorDupKeys.includes(c.key)) notes.push('⚠ 키 중복 — 원본 스타일명 정리 필요');
  if (c.was) notes.push(`구 ${c.was}`);
  if (c.isMain) notes.push('메인 색상');
  if (c.stepException) notes.push('보조 단계 — 10단위 규칙 예외(승인됨)');
  if (c.wasHex) notes.push(`구 값 ${c.wasHex} — 명도 순서 정정`);
  if (c.added) notes.push(`Figma 변수 ${c.sourceName} 편입${c.nameDerived ? ' · 이름은 표기 규칙 적용' : ''}`);
  if (c.alpha != null) notes.push(`알파 ${Math.round(c.alpha * 100)}%`);
  const al = aliasOf[c.key];
  if (al) notes.unshift(`${al.baseName} 의 별칭 — 값은 원본이 갖습니다`);
  if (crossRef[c.key]) notes.push(`값이 ${crossRef[c.key].join(' · ')} 와 같습니다 — 원본을 정하지 못해 따로 둡니다(GAP-5)`);
  const value = al ? `var(--gds-color-${al.baseKey})` : c.hex;
  css += `  --gds-color-${c.key}: ${value};${notes.length ? `  /* ${notes.join(' · ')} */` : ''}\n`;
}
if (VIEW.mainStyle) {
  css += `  --gds-color-primary-main: var(--gds-color-${colorKey(VIEW.mainStyle.name)});`
    + `  /* = ${VIEW.mainStyle.name} ${VIEW.mainStyle.hex} · 강민관 확정 ${VIEW.DEC.decidedAt} */\n`;
}
// 시맨틱 — 프리미티브를 var() 로 참조합니다. 값을 직접 쓰지 않습니다.
if (VIEW.semantic) {
  css += '\n  /* Semantic — 원본 규칙에서 끌어낸 별칭 */\n';
  for (const t of VIEW.semantic.tokens) {
    const key = slug(t.token.replace(/^Semantic\//, '').replace(/\//g, ' '));
    css += `  --gds-${key}: var(--gds-color-${colorKey(t.ref)});  /* ${t.ref} · ${t.evidence} */\n`;
  }
}
// 타이포 시맨틱 — ✅ Type scale 의 Usage 열에서 계산. 프리미티브 타이포 변수를 var() 로 참조합니다.
if (VIEW.typeSemantic) {
  css += '\n  /* Semantic (타이포) — ✅ Type scale Usage 열에서 계산 */\n';
  for (const t of VIEW.typeSemantic.tokens) {
    const k = t.role, p = slug(t.refCanon);
    css += `  --gds-type-semantic-${k}-size: var(--gds-type-${p}-size);`
      + `  /* ${t.refCanon} · Usage "${t.usage}" */\n`;
    css += `  --gds-type-semantic-${k}-weight: var(--gds-type-${p}-weight);\n`;
  }
}
// Layout — Guidelines 계층
if (VIEW.layout) {
  css += '\n  /* Layout — Guidelines 계층 */\n';
  for (const grp of ['screen', 'margin', 'safeArea', 'header']) {
    for (const l of (VIEW.layout[grp] || [])) {
      css += `  --gds-layout-${slug(l.token)}: ${l.value}${l.unit || 'px'};`
        + `${l.rule || l.platform ? `  /* ${[l.platform, l.rule].filter(Boolean).join(' · ')} */` : ''}\n`;
    }
  }
}
// 효과 — Elevation 이 아닌 것들. 키가 겹치는 것은 정해질 때까지 내보내지 않습니다.
if (VIEW.effects && VIEW.effects.emitted.length) {
  css += '\n  /* Effect — Elevation 이 아닌 효과 (컴포넌트 전용 · 재질) */\n';
  for (const e of VIEW.effects.emitted) {
    css += `  --gds-effect-${e.key}: ${e.css};  /* ${e.name} */\n`;
  }
  for (const b of VIEW.effects.items.filter(i => i.blocked)) {
    css += `  /* --gds-effect-${b.key}: 보류 — ${b.name} · ${b.blocked} */\n`;
  }
}
css += '\n  /* Typography */\n';
if (FONT) {
  css += `  --gds-font-family: "${FONT.value}", sans-serif;`
    + `  /* GDS 폰트 단일 · 강민관 확정 ${TDEC.decidedAt} */\n`;
}
if (LH) css += `  --gds-type-line-height: ${LH_CSS};  /* 행간 = Figma ${LH.value} · 팀 합의 ${TDEC.decidedAt} — 단계별 값을 따로 두지 않습니다 */\n`;
if (LS) css += `  --gds-type-letter-spacing: ${LS.value === '0' ? '0' : LS.value};  /* 자간 — Figma 변수 typo/letter-spacing/0 · 단계별 값을 따로 두지 않습니다 */\n`;
for (const t of types) {
  css += `  --gds-type-${t.key}-size: ${t.size}px;${t.usage ? `  /* ${t.usage.join(' · ')} */` : ''}\n`;
  css += `  --gds-type-${t.key}-weight: ${t.weight};\n`;
}
css += '\n  /* Spacing */\n';
const spDone = new Set();
for (const s of spacing) {
  if (s.conflict) {
    if (spDone.has(s.token)) continue;
    spDone.add(s.token);
    const vals = ((C.spacing.conflicts.find(c => c.token === s.token) || {}).values || []).join('px / ');
    css += `  /* ⚠ ${s.token}: ${vals}px — 같은 이름이 두 값을 가져 어느 쪽이 옳은지 판단 불가. 이름 정리 후 출력합니다. */\n`;
    continue;
  }
  css += `  --gds-spacing-${slug(s.token).replace(/^spacing-/, '')}: ${s.px}px;\n`;
}
css += '\n  /* Radius */\n';
for (const r of radius) css += `  --gds-radius-${r.key}: ${r.px === 9999 ? '9999px' : r.px + 'px'};\n`;
css += '\n  /* Elevation */\n';
if (elevation.length) {
  css += `  /* ${E.renumbered ? '재넘버링 반영됨 — 구 1~5 → 2~6, 신규 1 추가' : ''} */\n`;
  for (const e of elevation) css += `  --gds-elevation-${e.key}: ${e.value};${e.was ? `  /* 구 ${e.was} */` : '  /* 신규 */'}\n`;
} else {
  css += '  /* 데이터 없음 */\n';
}
css += '}\n';

// ---------- SCSS ----------
let scss = HEAD + '\n';
// SCSS 변수는 선언 순서를 지킵니다 — 별칭이 원본보다 먼저 나오면 컴파일이 깨집니다.
const colorPos = {};
colors.forEach((c, i) => { colorPos[c.key] = i; });
for (const [k, a] of Object.entries(aliasOf)) {
  if (colorPos[a.baseKey] > colorPos[k]) {
    throw new Error(`별칭 ${k} 이 원본 ${a.baseKey} 보다 먼저 선언됩니다 — SCSS 출력 순서를 고치세요`);
  }
}
for (const c of colors) {
  const al = aliasOf[c.key];
  scss += `$gds-color-${c.key}: ${al ? `$gds-color-${al.baseKey}` : c.hex};`
    + `${c.isMain ? '  // 메인 색상' : ''}${al ? `  // ${al.baseName} 의 별칭` : ''}\n`;
}
if (VIEW.mainStyle) scss += `$gds-color-primary-main: $gds-color-${colorKey(VIEW.mainStyle.name)};\n`;
if (VIEW.semantic) for (const t of VIEW.semantic.tokens) {
  scss += `$gds-${slug(t.token.replace(/^Semantic\//, '').replace(/\//g, ' '))}: $gds-color-${colorKey(t.ref)};\n`;
}
if (VIEW.layout) for (const grp of ['screen', 'margin', 'safeArea', 'header']) {
  for (const l of (VIEW.layout[grp] || [])) scss += `$gds-layout-${slug(l.token)}: ${l.value}${l.unit || 'px'};\n`;
}
if (VIEW.effects) for (const e of VIEW.effects.emitted) scss += `$gds-effect-${e.key}: ${e.css};\n`;
scss += '\n';
if (FONT) scss += `$gds-font-family: "${FONT.value}", sans-serif;\n`;
if (LH) scss += `$gds-type-line-height: ${LH_CSS};\n`;
if (LS) scss += `$gds-type-letter-spacing: ${LS.value};\n`;
for (const t of types) scss += `$gds-type-${t.key}-size: ${t.size}px;\n$gds-type-${t.key}-weight: ${t.weight};\n`;
// 타이포 시맨틱은 프리미티브 뒤에 와야 합니다 — SCSS 변수는 선언 순서를 지킵니다.
if (VIEW.typeSemantic) for (const t of VIEW.typeSemantic.tokens) {
  scss += `$gds-type-semantic-${t.role}-size: $gds-type-${slug(t.refCanon)}-size;\n`;
  scss += `$gds-type-semantic-${t.role}-weight: $gds-type-${slug(t.refCanon)}-weight;\n`;
}
scss += '\n';
for (const s of spacing) if (!s.conflict) scss += `$gds-spacing-${slug(s.token).replace(/^spacing-/, '')}: ${s.px}px;\n`;
scss += '\n';
for (const r of radius) scss += `$gds-radius-${r.key}: ${r.px === 9999 ? '9999px' : r.px + 'px'};\n`;
scss += '\n';
for (const e of elevation) scss += `$gds-elevation-${e.key}: ${e.value};\n`;

// ---------- JSON (DTCG 형태) ----------
const json = {
  $description: 'GDS 원본 토큰 — ✅ Foundation 페이지 기준',
  color: {}, type: {}, spacing: {}, radius: {}, elevation: {},
  $notes: {
    excluded: [],
    elevationRenumbered: E ? E.renumbered : false,
    conflicts: C.spacing.conflicts || [],
    colorKeyDuplicates: [...new Set(colorDupKeys)],
  },
};
for (const c of colors) {
  const al = aliasOf[c.key];
  json.color[c.key] = {
    // 별칭은 DTCG 참조 문법 {color.<원본>} 으로 나갑니다 — 값을 두 번 적지 않습니다.
    $value: al ? `{color.${al.baseKey}}` : c.hex, $type: 'color', $description: c.name,
    $extensions: {
      gds: {
        status: 'confirmed',
        ...(al ? { aliasOf: al.baseName, aliasRule: al.rule, resolvedValue: c.hex } : {}),
        ...(crossRef[c.key] ? { sameValueAs: crossRef[c.key], sameValueNote: '원본을 정하지 못해 따로 둡니다 (GAP-5)' } : {}),
        ...(c.was ? { renamedFrom: c.was, renamedAt: VIEW.DEC.decidedAt } : {}),
        ...(c.isMain ? { role: 'primary-main' } : {}),
        ...(c.stepException ? { stepException: true } : {}),
        ...(c.wasHex ? { valueChangedFrom: c.wasHex, valueChangedAt: VIEW.DEC.decidedAt } : {}),
        ...(c.added ? { addedFromFigmaVariable: c.sourceName, addedAt: (VIEW.figmaSync || {}).checkedAt, nameDerived: c.nameDerived } : {}),
        ...(c.alpha != null ? { alpha: c.alpha } : {}),
      },
    },
  };
}
// ── 시맨틱 계층 ── 원본 규칙에서 끌어낸 별칭. 프리미티브를 참조만 합니다.
if (VIEW.semanticMissing.length) {
  throw new Error(`시맨틱 토큰이 원본에 없는 이름을 가리킵니다: ${VIEW.semanticMissing.join(', ')}`);
}
if (VIEW.semantic) {
  json.semantic = {};
  for (const t of VIEW.semantic.tokens) {
    const key = slug(t.token.replace(/^Semantic\//, '').replace(/\//g, ' '));
    json.semantic[key] = {
      $value: `{color.${slug(t.ref.replace('/', ' '))}}`,
      $type: 'color',
      $description: `${t.token} → ${t.ref}. 근거 — ${t.evidence}`,
      $extensions: { gds: { layer: 'semantic', ref: t.ref, evidence: t.evidence } },
    };
  }
}
// ── 효과 — Elevation 밖 ──
if (VIEW.effects) {
  const EF = VIEW.effects;
  json.effect = {};
  for (const e of EF.emitted) {
    const it = EF.items.find(x => x.key === e.key);
    json.effect[e.key] = {
      $value: e.css, $type: it.axis === 'material' ? 'other' : 'shadow',
      $description: `${e.name} — ${EF.axes[it.axis]}`,
      $extensions: { gds: { axis: it.axis, source: e.name } },
    };
  }
  json.$notes.effects = {
    rule: EF.rule, axes: EF.axes, counts: EF.counts,
    blocked: EF.items.filter(i => i.blocked).map(i => ({ name: i.name, why: i.blocked })),
    caseCollisions: EF.caseCollisions,
    unmeasured: EF.counts.unmeasured,
  };
}
// ── 색 별칭 · 면색/선색 짝 ── 값이 겹치는 이름을 이은 기록 (GAP-5 · GAP-8).
if (AL) {
  json.$notes.colorAliases = {
    rule: AL.rule,
    scaleGroups: AL.scaleGroups,
    counts: AL.counts,
    aliases: AL.duplicates.filter(d => d.decidable)
      .flatMap(d => d.aliases.map(a => ({ alias: a.name, base: d.base.name, hex: d.hex }))),
    undecided: AL.duplicates.filter(d => !d.decidable)
      .map(d => ({ hex: d.hex, members: d.members.map(m => m.name), reason: d.reason, handling: d.handling })),
    splitPairs: AL.splitPairs.map(p => ({ fill: p.fill, line: p.line, finding: p.finding, precedent: p.precedent })),
  };
}
// ── 타이포 시맨틱 계층 ── ✅ Type scale 의 Usage 열에서 계산했습니다.
if (VIEW.typeSemantic) {
  const stepMissing = VIEW.typeSemantic.tokens.filter(t => !types.some(x => x.token === t.refCanon));
  if (stepMissing.length) {
    throw new Error(`타이포 시맨틱이 없는 단계를 가리킵니다: ${stepMissing.map(t => t.refCanon).join(', ')}`);
  }
  json.semanticType = {};
  for (const t of VIEW.typeSemantic.tokens) {
    json.semanticType[t.role] = {
      $value: `{type.${slug(t.refCanon)}}`,
      $type: 'typography',
      $description: `${t.token} → ${t.refCanon}. 근거 — ${t.evidence}`,
      $extensions: { gds: { layer: 'semantic', ref: t.refCanon, libraryName: t.ref, usage: t.usage, evidence: t.evidence } },
    };
  }
  // 계열(family) — 원본이 여러 단계에 같은 쓰임새를 적어 두어 토큰으로 굳히지 못한 것들.
  json.$notes.typeSemantic = {
    rule: VIEW.typeSemantic.rule,
    source: VIEW.typeSemantic.source,
    tokens: VIEW.typeSemantic.counts.tokens,
    families: VIEW.typeSemantic.families.map(f => ({ usage: f.usage, steps: f.steps, why: f.why })),
  };
}
// ── 간격 — 시맨틱 계층이 «없다»는 사실도 근거와 함께 남깁니다 ──
if (VIEW.spacingCensus) {
  const SC = VIEW.spacingCensus;
  json.$notes.spacingSemantic = {
    exists: false,
    why: '원본에 간격의 쓰임새 이름이 없습니다. Spacing system ✅ 표는 열이 Spacing · px · 배수 셋뿐이고, ✅ 컴포넌트 페이지의 간격 주석에도 이름이 붙어 있지 않습니다.',
    evidence: `tools/spacing-census.js — ✅ 페이지 ${SC.pages.length}곳 · 주석 ${SC.counts.annotations}건 조사`,
    layerInstead: '간격의 쓰임새 수준 이름은 Layout ✅ 의 Guidelines 토큰이 유일합니다(--gds-layout-*).',
    census: {
      pages: SC.pages,
      annotations: SC.counts.annotations,
      onScale: SC.summary.filter(x => x.onScale).reduce((a, x) => a + x.count, 0),
      offScale: SC.summary.filter(x => !x.onScale).map(x => ({ value: x.value, count: x.count })),
      unreadableCallouts: SC.counts.unreadable,
    },
  };
}
// ── Layout (Guidelines 계층) ──
if (VIEW.layout) {
  json.layout = {};
  for (const grp of ['screen', 'margin', 'safeArea', 'header']) {
    for (const l of (VIEW.layout[grp] || [])) {
      json.layout[slug(l.token)] = {
        $value: `${l.value}${l.unit || 'px'}`, $type: 'dimension',
        $description: [l.rule, l.platform ? `대상 ${l.platform}` : ''].filter(Boolean).join(' · '),
        $extensions: { gds: { layer: 'guidelines', group: grp, ...(l.platform ? { platform: l.platform } : {}) } },
      };
    }
  }
}
if (VIEW.mainStyle) {
  json.color.$main = {
    $value: `{color.${slug(VIEW.mainStyle.name.replace('/', ' '))}}`,
    $type: 'color',
    $description: `메인 색상 — ${VIEW.mainStyle.name} (${VIEW.mainStyle.hex}). ${VIEW.DEC.main.note}`,
  };
}
json.$notes.colorDecisions = {
  decidedBy: VIEW.DEC.decidedBy, decidedAt: VIEW.DEC.decidedAt,
  stepRule: VIEW.DEC.rules.step.value, canonBasis: VIEW.canonBasis && VIEW.canonBasis.value,
  stepExceptions: VIEW.stepExceptions ? VIEW.stepExceptions.value : [],
  valueOverrides: VIEW.valueOverrides.map(o => ({ token: o.token, from: o.from, to: o.to })),
  closed: VIEW.closedDecisions.map(o => ({ id: o.id, resolution: o.resolution })),
  renames: VIEW.renames.map(r => ({ from: r.from, to: r.to })),
  open: VIEW.openDecisions.map(o => ({ id: o.id, question: o.question })),
  figmaSync: VIEW.figmaSync,
  additions: VIEW.additions.map(a => ({ id: a.id, sourceName: a.sourceName, hex: a.hex, action: a.action, token: a.token || a.target || null, status: a.status })),
  sourceDefects: VIEW.sourceDefects ? VIEW.sourceDefects.items.map(d => ({ id: d.id, problem: d.problem })) : [],
};
// 차기 라이브러리 이름을 타이포 토큰에 함께 실어, 라이브러리 반영 때 대조할 수 있게 합니다.
const LIBNAME = new Map((VIEW.typeLib ? VIEW.typeLib.styles : []).map(s => [s.canonToken, s]));
for (const t of types) json.type[t.key] = {
  $value: {
    ...(FONT ? { fontFamily: FONT.value } : {}),
    fontSize: `${t.size}px`, fontWeight: t.weight,
    lineHeight: LH_CSS || t.lineHeight,
    ...(LS ? { letterSpacing: LS.value } : {}),
  },
  $type: 'typography',
  $description: t.usage ? `${t.token} — ${t.usage.join(' · ')}` : t.token,
  $extensions: {
    gds: {
      status: 'confirmed',
      ...(LH ? { lineHeightSource: `Figma ${LH.value}` } : {}),
      ...(t.usage ? { usage: t.usage } : {}),
      ...(LIBNAME.has(t.token) ? {
        libraryName: LIBNAME.get(t.token).name,
        currentLibraryName: LIBNAME.get(t.token).currentLibraryName,
        libraryStatus: 'to-be — 저장소에서 먼저 만들고 원본에 반영합니다',
      } : {}),
    },
  },
};
if (FONT) json.$notes.fontFamily = { value: FONT.value, single: FONT.single, decidedBy: TDEC.decidedBy, decidedAt: TDEC.decidedAt, note: FONT.note };
if (LH) json.$notes.lineHeight = { value: LH.value, css: LH_CSS, decidedBy: TDEC.decidedBy, decidedAt: TDEC.decidedAt, note: LH.note };
if (LS) json.$notes.letterSpacing = { value: LS.value, decidedBy: LS.decidedBy, decidedAt: LS.decidedAt, note: LS.note, evidence: LS.evidence };
if (USAGE) {
  // 값이 같은 토큰은 용도로 구분합니다 — 어떤 쌍이 그런지 명시
  const bySpec = {};
  for (const t of types) (bySpec[`${t.size}/${t.weight}`] = bySpec[`${t.size}/${t.weight}`] || []).push(t);
  json.$notes.usage = {
    note: TDEC.usage.$note, decidedAt: TDEC.decidedAt,
    sameSpecPairs: Object.entries(bySpec).filter(([, a]) => a.length > 1)
      .map(([spec, a]) => ({ spec, tokens: a.map(t => ({ token: t.token, usage: t.usage })) })),
  };
}
json.$notes.typeOpen = (TDEC.open || []).filter(o => o.status === 'open').map(o => ({ id: o.id, question: o.question }));
for (const s of spacing) if (!s.conflict) json.spacing[slug(s.token).replace(/^spacing-/, '')] = { $value: `${s.px}px`, $type: 'dimension' };
for (const r of radius) json.radius[r.key] = { $value: r.px === 9999 ? '9999px' : `${r.px}px`, $type: 'dimension' };
for (const e of elevation) json.elevation[e.key] = { $value: e.value, $type: 'shadow', $description: e.was ? `구 ${e.was}` : '신규' };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'gds.css'), css);
fs.writeFileSync(path.join(OUT, 'gds.scss'), scss);
fs.writeFileSync(path.join(OUT, 'gds.tokens.json'), JSON.stringify(json, null, 2));

console.log(`토큰 생성 → dist/tokens/`);
console.log(`  색 ${colors.length} · 타이포 ${types.length} · 간격 ${spacing.filter(s => !s.conflict).length}(충돌 ${spacing.filter(s => s.conflict).length} 제외) · 반경 ${radius.length} · 엘리베이션 ${elevation.length}`);
if (colorDupKeys.length) console.log(`  ⚠ 색 키 중복 ${new Set(colorDupKeys).size}종 — 원본 스타일명 정리 필요`);

module.exports = { colors, types, spacing, radius, elevation, colorDupKeys };
