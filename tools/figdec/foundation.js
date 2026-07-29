'use strict';
// Foundation 데이터 추출 — 색·타이포·반경·그림자·구조를 원본에서 직접 읽어 JSON으로 출력
const { loadFig } = require('./kiwi');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const FIG = process.env.FIG_PATH || path.join(ROOT,'canvas.fig');
const KEEP = ['guid', 'parentIndex', 'type', 'name', 'styleType', 'isSoftDeletedStyle', 'styleDescription',
  'fillPaints', 'strokePaints', 'effects', 'fontSize', 'fontName', 'lineHeight', 'letterSpacing',
  'size', 'cornerRadius', 'rectangleCornerRadiiIndependent',
  'rectangleTopLeftCornerRadius', 'rectangleTopRightCornerRadius',
  'rectangleBottomLeftCornerRadius', 'rectangleBottomRightCornerRadius'];

const g2s = g => (g ? `${g.sessionID}:${g.localID}` : null);
const { doc } = loadFig(FIG, { NodeChange: KEEP });
const nodes = new Map();
for (const c of doc.nodeChanges || []) { const id = g2s(c.guid); if (id) nodes.set(id, Object.assign(nodes.get(id) || {}, { _id: id }, c)); }
for (const [id, n] of nodes) n._p = n.parentIndex ? g2s(n.parentIndex.guid) : null;

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ---------- 페이지 ----------
const pages = [...nodes.values()].filter(n => n.type === 'CANVAS')
  .map(n => ({ id: n._id, name: n.name || '', mark: /✅/.test(n.name || '') ? 'done' : /🚧/.test(n.name || '') ? 'wip' : 'none' }));

// ---------- 색 스타일 ----------
const colors = [];
for (const n of nodes.values()) {
  if (n.styleType !== 'FILL' || n.isSoftDeletedStyle) continue;
  const p = (n.fillPaints || []).find(x => x.type === 'SOLID' && x.color) || (n.fillPaints || [])[0];
  if (!p || !p.color) continue;
  colors.push({
    id: n._id, name: n.name || '(무명)', hex: hex(p.color),
    opacity: round(p.opacity === undefined ? 1 : p.opacity, 3),
    alpha: round(p.color.a, 3),
  });
}

// ---------- 타이포 스타일 ----------
const types = [];
for (const n of nodes.values()) {
  if (n.styleType !== 'TEXT' || n.isSoftDeletedStyle) continue;
  types.push({
    id: n._id, name: n.name || '(무명)',
    family: n.fontName ? n.fontName.family : null,
    style: n.fontName ? n.fontName.style : null,
    size: n.fontSize === undefined ? null : round(n.fontSize),
    lineHeight: n.lineHeight ? { v: round(n.lineHeight.value), u: n.lineHeight.units } : null,
    letterSpacing: n.letterSpacing ? { v: round(n.letterSpacing.value, 3), u: n.letterSpacing.units } : null,
  });
}

// ---------- 그림자(EFFECT) 스타일 ----------
const effects = [];
for (const n of nodes.values()) {
  if (n.styleType !== 'EFFECT' || n.isSoftDeletedStyle) continue;
  effects.push({
    id: n._id, name: n.name || '(무명)',
    layers: (n.effects || []).map(e => ({
      type: e.type,
      x: e.offset ? round(e.offset.x) : 0, y: e.offset ? round(e.offset.y) : 0,
      blur: round(e.radius || 0), spread: round(e.spread || 0),
      hex: e.color ? hex(e.color) : null, alpha: e.color ? round(e.color.a, 3) : null,
    })),
  });
}

// ---------- 반경 분포 ----------
const radiiHist = new Map();
let radiusShapes = 0;
for (const n of nodes.values()) {
  const rs = (n.rectangleCornerRadiiIndependent
    ? [n.rectangleTopLeftCornerRadius, n.rectangleTopRightCornerRadius, n.rectangleBottomLeftCornerRadius, n.rectangleBottomRightCornerRadius]
    : [n.cornerRadius]).filter(v => typeof v === 'number' && v > 0);
  if (!rs.length) continue;
  radiusShapes++;
  for (const v of rs) if (Number.isInteger(v)) radiiHist.set(v, (radiiHist.get(v) || 0) + 1);
}

// ---------- 그림자 불투명도 분포 ----------
const shadowHist = new Map(); let shadowTotal = 0;
for (const n of nodes.values()) {
  for (const e of n.effects || []) {
    if (!/SHADOW/.test(String(e.type)) || !e.color) continue;
    const p = round(e.color.a * 100, 1); shadowHist.set(p, (shadowHist.get(p) || 0) + 1); shadowTotal++;
  }
}

const out = {
  meta: {
    source: 'GDS(Greencar Design System).fig',
    exported: '2026-07-23T04:20:10.332Z',
    generated_from: 'canvas.fig · 자체 kiwi 디코더',
    nodeChanges: (doc.nodeChanges || []).length,
    pages: pages.length,
    variables: [...nodes.values()].filter(n => n.type === 'VARIABLE').length,
    styles: { FILL: colors.length, TEXT: types.length, EFFECT: effects.length },
  },
  pages,
  colors: colors.sort((a, b) => a.name.localeCompare(b.name)),
  types: types.sort((a, b) => (b.size || 0) - (a.size || 0)),
  effects: effects.sort((a, b) => a.name.localeCompare(b.name)),
  radius: {
    shapes: radiusShapes,
    hist: [...radiiHist].sort((a, b) => b[1] - a[1]),
  },
  shadow: { total: shadowTotal, hist: [...shadowHist].sort((a, b) => b[1] - a[1]) },
};
fs.writeFileSync(path.join(ROOT,'data','foundation-data.json'), JSON.stringify(out));
console.log('페이지', out.pages.length, '| 색', out.colors.length, '| 타이포', out.types.length, '| 그림자스타일', out.effects.length);
console.log('반경 도형', out.radius.shapes, '| 그림자 효과', out.shadow.total);
console.log('\n색 이름 샘플:', out.colors.slice(0, 12).map(c => `${c.name}=${c.hex}`).join(', '));
console.log('\n타이포 샘플:', out.types.slice(0, 10).map(t => `${t.name}(${t.family}/${t.style}/${t.size})`).join(', '));
