'use strict';
// 공용 인덱스 빌더 — 모든 측정 스크립트가 이걸 공유한다(수치 불일치 방지)
const { loadFig } = require('./kiwi');

const KEEP = [
  'guid', 'parentIndex', 'type', 'name', 'size', 'visible',
  'symbolData', 'componentKey', 'isStateGroup', 'overriddenSymbolID',
  'cornerRadius', 'rectangleCornerRadiiIndependent',
  'rectangleTopLeftCornerRadius', 'rectangleTopRightCornerRadius',
  'rectangleBottomLeftCornerRadius', 'rectangleBottomRightCornerRadius',
];

const g2s = g => (g ? `${g.sessionID}:${g.localID}` : null);

function build(figPath) {
  const { doc, defs } = loadFig(figPath, { NodeChange: KEEP });
  const changes = doc.nodeChanges || [];
  const nodes = new Map();
  for (const c of changes) {
    const id = g2s(c.guid);
    if (!id) continue;
    // 같은 guid가 여러 번 나오면 뒤엣것이 이깁니다(마지막 상태가 최종)
    const prev = nodes.get(id);
    nodes.set(id, prev ? Object.assign(prev, c) : c);
  }
  // 부모 링크 + 자식 목록
  const children = new Map();
  for (const [id, n] of nodes) {
    const p = n.parentIndex && g2s(n.parentIndex.guid);
    n._id = id; n._parent = p || null;
    if (p) { if (!children.has(p)) children.set(p, []); children.get(p).push(id); }
  }
  // 각 노드의 소속 페이지(CANVAS) 찾기
  const pageOf = new Map();
  function findPage(id, seen) {
    if (pageOf.has(id)) return pageOf.get(id);
    const n = nodes.get(id);
    if (!n) return null;
    if (n.type === 'CANVAS') { pageOf.set(id, id); return id; }
    if (!n._parent || (seen && seen.has(id))) { pageOf.set(id, null); return null; }
    const s = seen || new Set(); s.add(id);
    const p = findPage(n._parent, s);
    pageOf.set(id, p);
    return p;
  }
  for (const id of nodes.keys()) findPage(id);

  return { doc, defs, nodes, children, pageOf, rawCount: changes.length, g2s };
}

// 노드의 실효 반경들(코너별 독립이면 4개, 아니면 단일값)
function radiiOf(n) {
  if (n.rectangleCornerRadiiIndependent) {
    return [
      n.rectangleTopLeftCornerRadius, n.rectangleTopRightCornerRadius,
      n.rectangleBottomLeftCornerRadius, n.rectangleBottomRightCornerRadius,
    ].filter(v => typeof v === 'number');
  }
  return typeof n.cornerRadius === 'number' ? [n.cornerRadius] : [];
}

module.exports = { build, radiiOf, KEEP };
