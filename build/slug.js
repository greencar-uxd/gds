'use strict';
/**
 * 토큰 키 만들기 — 이름 하나에서 변수명 하나.
 *
 * 여기 한 곳에만 둡니다. 예전에 도구마다 따로 구현했다가
 * «Navy/Navy 030» 이 한쪽에서 navy-navy-030, 다른 쪽에서 navy-030 이 되어
 * 존재하지 않는 변수를 가리키는 CSS 가 나간 적이 있습니다.
 *
 * 규칙 — 소문자로 낮추고, 한글·영숫자 아닌 것은 구분자로 보고,
 *        같은 낱말이 반복되면 한 번만 남깁니다(그룹명이 이름에도 들어가는 경우).
 *          Navy/Navy 030      → navy-030
 *          Gray Scale/Gray 000 → gray-scale-000
 *          Map Marker/Active   → map-marker-active
 */
function slug(s) {
  const parts = String(s).toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ').trim().split(/\s+/);
  const out = [];
  for (const p of parts) if (!out.includes(p)) out.push(p);
  return out.join('-');
}

// 색 이름 «그룹/이름» → 토큰 키. 토큰 방출과 도구가 반드시 같은 것을 써야 합니다.
function colorKey(fullName) {
  const [group, name] = String(fullName).includes('/')
    ? [String(fullName).split('/')[0], String(fullName).split('/').slice(1).join('/')]
    : ['', fullName];
  return slug(group + ' ' + name);
}

module.exports = { slug, colorKey };
