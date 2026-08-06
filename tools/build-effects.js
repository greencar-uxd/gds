'use strict';
/**
 * 효과 분류 — Elevation 밖에 흩어져 있던 그림자·블러를 축으로 가릅니다 (GAP-15).
 *
 * 왜 필요한가:
 *   정본 라이브러리의 EFFECT 스타일은 Elevation_1~6 만이 아닙니다.
 *   Bottom Sheet 계열 4종 · Frosted Glass · level/gold/* 3종이 체계 밖에 있습니다.
 *   «Elevation 이 아니면 무엇인가»를 정하지 않으면 개발자가 쓸 수 없습니다.
 *
 * 어떻게 가르는가 — 이름과 값에서 읽히는 것만으로 판정합니다. 지어내지 않습니다.
 *   elevation   Elevation_N            표면 높이 6단계
 *   deprecated  as-is_ / (X) 표시       원본이 폐기 표시한 것
 *   material    BACKGROUND_BLUR 값      그림자가 아니라 재질(블러)
 *   component   그 밖                    특정 컴포넌트 전용 효과
 *
 * 충돌도 같이 셉니다 — 소문자로 접었을 때 이름이 겹치는 것.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LIB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gds-library.json'), 'utf8'));
// 확정 결정 — 원본은 고치지 않고 추출 결과 위에 덮어씁니다 (색·타이포와 같은 방식).
const DEC = (() => {
  const p = path.join(ROOT, 'data', 'effect-decisions.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { keyCollisions: [], styleRefs: [] };
})();
const WINNER = {};   // 겹치는 키 → 살릴 이름
for (const c of (DEC.keyCollisions || [])) if (c.status === 'confirmed') WINNER[c.key] = c;

const classify = e => {
  if (/^Elevation_\d+$/.test(e.name)) return 'elevation';
  if (e.deprecated || /^as-is_/.test(e.name) || /\(X\)/.test(e.name)) return 'deprecated';
  if (/BACKGROUND_BLUR/i.test(e.value || '')) return 'material';
  return 'component';
};

// 값 문자열 «N겹 — #HEX x/y/blur/spread + …» 또는 «#HEX x/y/blur/spread» 를 층으로 쪼갭니다.
const parseLayers = v => {
  if (!v) return null;
  if (/BACKGROUND_BLUR/i.test(v)) {
    const m = v.match(/BACKGROUND_BLUR\s+(\d+)/i);
    return m ? { kind: 'blur', radius: +m[1] } : null;
  }
  const body = v.replace(/^\d+겹\s*—\s*/, '');
  const layers = body.split('+').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(#[0-9A-Fa-f]{6,8})\s+(-?[\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)$/);
    return m ? { hex: m[1], x: +m[2], y: +m[3], blur: +m[4], spread: +m[5] } : null;
  });
  return layers.every(Boolean) ? { kind: 'shadow', layers } : null;
};

// #RRGGBBAA → rgba()
const toRgba = hex => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = h.length >= 8 ? +(parseInt(h.slice(6, 8), 16) / 255).toFixed(3) : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const items = LIB.effect.map(e => {
  const axis = classify(e);
  const parsed = parseLayers(e.value);
  return {
    name: e.name,
    axis,
    value: e.value || null,
    parsed,
    // 값이 있는 것만 CSS 로 낼 수 있습니다. 값이 없으면 «측정 안 됨»입니다.
    css: parsed && parsed.kind === 'shadow'
      ? parsed.layers.map(l => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${toRgba(l.hex)}`).join(', ')
      : (parsed && parsed.kind === 'blur' ? `blur(${parsed.radius}px)` : null),
    key: slug(e.name),
    note: e.caseDuplicate ? `«${e.caseDuplicate}» 와 대소문자만 다릅니다` : null,
  };
});

// 토큰 키가 겹치는 것 — 겹치면 CSS 변수 하나를 두 스타일이 덮어씁니다.
// 어느 값을 살릴지는 사람이 정할 일이라, 정해질 때까지 «둘 다 내보내지 않습니다».
const keyCount = {};
for (const i of items) keyCount[i.key] = (keyCount[i.key] || 0) + 1;
const keyCollisions = Object.entries(keyCount).filter(([, n]) => n > 1)
  .map(([k]) => ({ key: k, names: items.filter(i => i.key === k).map(i => i.name) }));
for (const i of items) {
  const usable = !!i.css && i.axis !== 'elevation' && i.axis !== 'deprecated';
  const win = WINNER[i.key];
  if (keyCount[i.key] === 1) {
    i.emit = usable;
  } else if (win) {
    // 겹치는 키에 확정이 있으면 이긴 쪽만 나갑니다. 진 쪽은 키를 내주고 막힙니다.
    i.emit = usable && win.winner === i.name;
    if (!i.emit && i.css) {
      i.blocked = `«${win.winner}» 이 이 키를 씁니다 — ${win.loser && win.loser.handling ? win.loser.handling : '정본에서 제외'}`;
      i.decidedAgainst = { winner: win.winner, decidedBy: DEC.decidedBy, decidedAt: DEC.decidedAt };
    }
    if (i.emit) i.decided = { reason: win.reason, decidedBy: DEC.decidedBy, decidedAt: DEC.decidedAt };
  } else {
    i.emit = false;
    if (i.css) i.blocked = '토큰 키가 겹칩니다 — 어느 값을 살릴지 정해질 때까지 내보내지 않습니다 (GAP-31)';
  }
}
// 확정이 실제 스타일을 가리키는지 — 낡은 결정이 조용히 남지 않게 합니다.
for (const c of Object.values(WINNER)) {
  if (!items.some(i => i.name === c.winner)) throw new Error(`확정된 이름이 라이브러리에 없습니다: ${c.winner}`);
  if (c.loser && !items.some(i => i.name === c.loser.name)) throw new Error(`확정에 적힌 이름이 라이브러리에 없습니다: ${c.loser.name}`);
  const actual = items.find(i => i.name === c.winner);
  if (c.winnerValue && actual.value !== c.winnerValue) {
    throw new Error(`확정된 값이 원본과 다릅니다: ${c.winner}\n  결정 ${c.winnerValue}\n  원본 ${actual.value}`);
  }
}

// 대소문자만 다른 이름 — 소문자로 접어서 셉니다.
const folded = {};
for (const i of items) (folded[i.name.toLowerCase()] = folded[i.name.toLowerCase()] || []).push(i);
const caseCollisions = Object.entries(folded).filter(([, g]) => g.length > 1).map(([k, g]) => ({
  folded: k,
  names: g.map(x => x.name),
  values: g.map(x => x.value || null),
  // 값이 같으면 순수 중복, 다르면 «서로 다른 두 스타일이 같은 이름을 쓰는» 상태입니다.
  sameValue: new Set(g.map(x => x.value || '')).size === 1,
}));

const byAxis = a => items.filter(i => i.axis === a);
const out = {
  $description: '효과 분류 — 정본 EFFECT 스타일을 Elevation / 컴포넌트 / 재질 / 폐기 네 축으로 가른 것입니다.',
  generatedFrom: 'tools/build-effects.js ← data/gds-library.json (effect)',
  rule: '이름과 값에서 읽히는 것만으로 판정합니다. Elevation_N=elevation · as-is_/(X)=deprecated · BACKGROUND_BLUR=material · 나머지=component.',
  axes: {
    elevation: '표면의 높이. 6단계 스케일이며 --gds-elevation-* 로 나갑니다.',
    component: '특정 컴포넌트 전용 효과. 높이 스케일이 아니라서 Elevation 에 넣으면 안 됩니다.',
    material: '그림자가 아니라 재질(블러). 다른 축입니다.',
    deprecated: '원본이 폐기 표시한 것. 정본에서 제외합니다.',
  },
  counts: {
    total: items.length,
    elevation: byAxis('elevation').length,
    component: byAxis('component').length,
    material: byAxis('material').length,
    deprecated: byAxis('deprecated').length,
    measured: items.filter(i => i.css).length,
    unmeasured: items.filter(i => !i.css && i.axis !== 'deprecated').map(i => i.name),
  },
  caseCollisions,
  keyCollisions: keyCollisions.map(k => {
    const win = WINNER[k.key];
    return win
      ? { ...k, resolved: true, winner: win.winner, reason: win.reason, loser: win.loser, decidedBy: DEC.decidedBy, decidedAt: DEC.decidedAt }
      : { ...k, resolved: false };
  }),
  decisions: DEC,
  emitted: items.filter(i => i.emit).map(i => ({ key: i.key, name: i.name, css: i.css })),
  items,
};

// 무결성 — 축 합이 전체와 같아야 합니다.
const sum = out.counts.elevation + out.counts.component + out.counts.material + out.counts.deprecated;
if (sum !== items.length) throw new Error(`축 합 ${sum} ≠ 전체 ${items.length}`);
if (out.counts.elevation !== 6) throw new Error(`Elevation 이 6단계가 아닙니다: ${out.counts.elevation}`);

fs.writeFileSync(path.join(ROOT, 'data', 'effects.json'), JSON.stringify(out, null, 2) + '\n');

console.log('효과 분류 → data/effects.json');
console.log(`  전체 ${items.length}종 — elevation ${out.counts.elevation} · component ${out.counts.component} · material ${out.counts.material} · 폐기 ${out.counts.deprecated}`);
console.log(`  값이 측정된 것 ${out.counts.measured}종 · 값 미측정 ${out.counts.unmeasured.length}종`);
for (const i of items.filter(x => x.axis !== 'elevation')) {
  console.log(`  ${i.axis.padEnd(10)} ${i.name.padEnd(28)} ${i.css || '(값 미측정)'}`);
}
console.log(`  토큰으로 내보내는 것 ${items.filter(i=>i.emit).length}종 · 막힌 것 ${items.filter(i=>i.blocked).length}종`);
for (const c of caseCollisions) {
  console.log(`  ⚠ 대소문자 충돌 ${c.names.join(' / ')} — 값 ${c.sameValue ? '같음' : '다름'}`);
}
