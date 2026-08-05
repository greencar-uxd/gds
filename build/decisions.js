'use strict';
/**
 * 결정 안건 브리핑 페이지 — dist/decisions/index.html → /gds/decisions
 * 회의에서 "눈으로 보고 정하는" 용도. 모든 수치·색은 감사 데이터에서 주입됩니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'foundation-data.json'), 'utf8'));
const CA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-audit.json'), 'utf8'));
const TA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-audit.json'), 'utf8'));
const MG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'color-merge.json'), 'utf8'));
const OCPath = path.join(ROOT, 'data', 'orphan-clusters.json');
const OC = fs.existsSync(OCPath) ? JSON.parse(fs.readFileSync(OCPath, 'utf8')) : null;
const VIEW = require('./canon-view.js');
const DEC = VIEW.DEC;
const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const MT = MG.totals;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const red = CA.details.redHypothesis;
const EXPORT = String(D.meta.exported).slice(0, 10);

const swatch = (hex, label, sub) =>
  `<div class="sw"><div class="chip" style="background:${hex}"></div><div class="info"><div class="nm">${esc(label)}</div><div class="hx">${hex}</div>${sub ? `<div class="vr">${esc(sub)}</div>` : ''}</div></div>`;

// ── 안건 정의 ────────────────────────────────────────────────
const items = [
  {
    id: 'CQ-1', group: '색', title: `색 단계는 ${DEC.rules.step.value} — Red 300·400·500 은 030·040·050 입니다`,
    question: 'Red 300/400/500 을 030/040/050 으로 리네이밍할 것인가',
    weight: '확정', tag: '확정',
    decided: `<b>10단위 3자리 체계(010~100)</b>로 확정 — 강민관 ${DEC.decidedAt}. 토큰에 반영 완료: <code>--gds-color-primary-red-030 / 040 / 050</code>. 구 이름은 CSS 주석과 <code>$extensions.gds.renamedFrom</code> 에 남겼습니다.`,
    body: `
<p>Primary/Red 9단계를 <b>밝은 순</b>으로 세우면 단계 번호가 이렇게 흐릅니다.</p>
<div class="steps">${red.ordered.map(o => `<span class="${Number(o.step) > 100 ? 'bad' : ''}">${o.step}</span>`).join('<i>›</i>')}</div>
<p>010·020 다음에 300·400·500 이 오고 다시 060 으로 돌아옵니다. 자리로 보면 <b>030·040·050 이 있어야 할 칸</b>입니다.</p>
<div class="swatches">${red.ordered.map(o => swatch(o.hex, o.name.split('/').pop(), Number(o.step) > 100 ? '→ Red ' + red.expected.find(e => e.name === o.name).expected : '')).join('')}</div>
<div class="note"><b>근거 2.</b> 정본 페이지 설명문이 030/040/050 체계를 씁니다 — “Red 050이 브랜드 색상에 가장 가깝지만, 가독성과 접근성을 고려하여 Red 040을 메인 색상으로 사용합니다.” 여기의 <b>Red 050</b>은 표대로면 <code>${red.docRefs['Red 050']}</code>, 정본 <code>Brand/G car Red</code>(<code>${red.brandRedHex}</code>)와 ${red.brandMatchesRed050 ? '정확히 일치합니다' : '다릅니다'}.</div>`,
  },
  {
    id: 'CQ-2', group: '색', title: `Primary 메인은 ${DEC.main.token} (${DEC.main.hex}) 입니다`,
    question: 'Primary 메인 색상을 무엇으로 할 것인가',
    weight: '확정', tag: '확정',
    decided: `<b>${DEC.main.token} (<code>${DEC.main.hex}</code>)</b> — 강민관 ${DEC.decidedAt}. 정본 설명문의 “가독성과 접근성을 고려하여 Red 040을 메인 색상으로 사용합니다”를 그대로 채택했습니다. 토큰: <code>--gds-color-primary-main</code> · JSON <code>$extensions.gds.role = "primary-main"</code>.`,
    body: `<div class="swatches">${swatch(DEC.main.hex, '메인 — ' + DEC.main.token, '확정')}${swatch(red.brandRedHex, 'Brand / G car Red', '브랜드 레드 — 별개')}</div>
<p class="muted">메인(<code>${DEC.main.hex}</code>)과 브랜드 레드(<code>${red.brandRedHex}</code>)는 <b>서로 다른 값</b>입니다. 브랜드 레드는 <code>Brand/G car Red</code> · <code>${DEC.main.token.replace(/\d+$/, '050')}</code> 로 남아 있습니다.</p>`,
  },
  {
    id: 'CQ-4', group: '색', title: '중복 색은 ✅ Color system 정본 기준으로 통폐합합니다',
    question: '중복 색을 무슨 기준으로 통폐합할 것인가',
    weight: '확정', tag: '확정',
    decided: `<b>✅ Color system 정본에 명시된 값·이름 기준</b>으로 통폐합 — 강민관 ${DEC.decidedAt}. 이 기준으로 레거시 ${MT.legacyStyles}개를 전수 판정했습니다.`,
    body: `<div class="stats"><div><b>${MT.absorb}</b><span>ABSORB — 값 동일</span></div><div><b>${MT.resolve}</b><span>RESOLVE — 정본 값 채택</span></div><div><b>${MT.near}</b><span>NEAR — 흡수 권고</span></div><div class="hl"><b>${MT.review}</b><span>REVIEW — 개별 판단</span></div></div>
<p>기계 판정만으로 <b>${MT.mergeable}개</b>(${((MT.mergeable / MT.legacyStyles) * 100).toFixed(1)}%)가 정리되고, 사람 판단이 필요한 것이 <b>${MT.review}개</b> 남습니다. 전수는 <code>docs/color-merge-map.csv</code>.</p>
<table><thead><tr><th>HEX</th><th>스타일 수</th><th>서로 다른 이름</th><th>정본</th></tr></thead><tbody>
${CA.details.hexDupTop.slice(0, 8).map(x => `<tr><td><span class="dot" style="background:${x.hex}"></span><code>${x.hex}</code></td><td>${x.count}</td><td>${x.nameCount}종</td><td>${x.canon ? '✅' : '—'}</td></tr>`).join('')}
</tbody></table>`,
  },
  {
    id: 'CQ-5', group: '색', title: `같은 이름인데 값이 다른 ${MT.conflictNames}종 — ${MT.conflictNames - MT.conflictAutoResolved}종이 남았습니다`,
    weight: '차단', tag: '팩트',
    body: `<p>정본 기준 통폐합으로 <b>${MT.conflictAutoResolved}종은 자동 판정</b>됐습니다. 나머지 ${MT.conflictNames - MT.conflictAutoResolved}종은 <b>양쪽 다 정본에 없거나 양쪽 다 정본에 있어</b> 근거가 없습니다.</p>
<table><thead><tr><th>스타일 이름</th><th>값 A</th><th>값 B</th><th>판정</th></tr></thead><tbody>
${MG.conflictResolution.map(c => `<tr><td><code>${esc(c.name)}</code></td><td><span class="dot" style="background:${c.values[0]}"></span><code>${c.values[0]}</code></td><td><span class="dot" style="background:${c.values[1]}"></span><code>${c.values[1]}</code></td><td class="${c.adopt ? '' : 'no'}">${c.adopt ? `${c.adopt.token} 채택` : esc(c.verdict)}</td></tr>`).join('')}
</tbody></table>`,
  },
  {
    id: 'CQ-6', group: '색', title: OC
      ? `정본에 없는 ${MT.orphanHex}종 — 개별 판단 ${MT.orphanReview}종을 ${OC.clusters.length}묶음으로 줄였습니다`
      : `정본에 없는 ${MT.orphanHex}종 — ${MT.orphanReview}종이 개별 판단 대상`,
    weight: '차단', tag: '해석',
    body: `<p>색차(ΔE ≤ ${MG.meta.nearLimit}, 육안 구분 한계)로 갈랐습니다. <b>${MT.orphanNear}종은 정본으로 흡수해도 화면이 달라 보이지 않습니다.</b> 나머지 ${MT.orphanReview}종은 그대로 치환하면 눈에 띄게 달라집니다.</p>
${MT.orphanRetired ? `<h4 style="font-size:13px;margin:16px 0 6px;color:var(--ok)">✅ 제거 확정 ${MT.orphanRetired}종</h4>
<table><thead><tr><th>레거시</th><th>→ 치환</th><th>ΔE</th><th>스타일</th></tr></thead><tbody>
${VIEW.orphanDispositions.map(o => `<tr><td><span class="dot" style="background:${o.hex}"></span><code>${o.hex}</code></td><td><span class="dot" style="background:${o.targetHex}"></span><code>${esc(o.target)}</code></td><td>${o.deltaE}</td><td>${o.legacyStyles}개 · 이름 ${o.legacyNames.length}종</td></tr>`).join('')}
</tbody></table>
<p class="muted">${VIEW.orphanDispositions.map(o => esc(o.caution)).join('<br>')}</p>` : ''}
<h4 style="font-size:13px;margin:16px 0 6px;color:var(--text2)">흡수 권고 ${MT.orphanNear}종 — 바꿔도 화면이 같습니다</h4>
<table><thead><tr><th>레거시</th><th>→ 정본</th><th>ΔE</th></tr></thead><tbody>
${MG.orphans.filter(o => o.delta <= MG.meta.nearLimit).map(o => `<tr><td><span class="dot" style="background:${o.hex}"></span><code>${o.hex}</code> <span class="muted">${esc(o.sample)}</span></td><td><span class="dot" style="background:${o.targetHex}"></span><code>${esc(o.target)}</code></td><td>${o.delta}</td></tr>`).join('')}
</tbody></table>
${OC ? `
<h4 style="font-size:13px;margin:22px 0 6px;color:var(--brand)">개별 판단 ${OC.totalOrphanReview}종 · ${OC.totalStyles}개 스타일 → ${OC.clusters.length}묶음</h4>
<p class="muted">하나씩 보면 ${OC.totalOrphanReview}번 판단해야 합니다. 같은 이유로 생긴 색이 뭉쳐 있어서, <b>묶음 단위로 정하면 ${OC.clusters.length}번</b>이면 됩니다. 분류는 <code>tools/audit/orphan_clusters.js</code> 가 계산합니다 — 출처가 이름에 드러난 것, 색상환 위치, 가장 가까운 정본 그룹 순으로 봅니다.</p>
${OC.clusters.map(c => `<div class="ocl">
  <div class="ochd"><span class="pill id">${c.id}</span><b>${esc(c.name)}</b>
    <span class="ocnum">${c.hexCount}종 · ${c.styleCount}개 스타일 · ΔE ${c.deltaMin}~${c.deltaMax}</span>
    <span class="ocact${/폐기|밖으로/.test(c.action) ? ' warn' : /권고/.test(c.action) ? ' ok' : ''}">${esc(c.action)}</span></div>
  <div class="chips">${c.items.map(o => `<span class="mini" title="${o.hex} · ${esc(o.names[0] || '')} · ${o.styles}개 · 가장 가까운 정본 ${esc(o.target)} ΔE${o.delta}" style="background:${o.hex}"></span>`).join('')}</div>
  <p class="muted" style="margin:8px 0 0">${esc(c.why)}</p>
  <div class="note" style="margin:10px 0 0"><b>권고.</b> ${esc(c.recommend)}</div>
  <details><summary>${c.hexCount}종 전체 보기</summary>
    <table><thead><tr><th>HEX</th><th>스타일</th><th>대표 이름</th><th>가장 가까운 정본</th><th>ΔE</th></tr></thead><tbody>
    ${c.items.map(o => `<tr><td><span class="dot" style="background:${o.hex}"></span><code>${o.hex}</code></td><td>${o.styles}</td><td class="muted">${esc((o.names[0] || o.sample || '').slice(0, 34))}${o.foreign ? ` <b style="color:var(--warn)">${esc(o.foreign)}</b>` : ''}${o.ios ? ` <b style="color:var(--warn)">${esc(o.ios)}</b>` : ''}</td><td><span class="dot" style="background:${o.targetHex}"></span><code>${esc(o.target)}</code></td><td>${o.delta}</td></tr>`).join('')}
    </tbody></table>
  </details>
</div>`).join('')}
<p class="muted">전수는 <code>docs/color-merge-map.csv</code> · 묶음 데이터는 <code>data/orphan-clusters.json</code>.</p>
` : `<div class="chips">${MG.orphans.filter(o => o.delta > MG.meta.nearLimit).map(o => `<span class="mini" title="${o.hex}" style="background:${o.hex}"></span>`).join('')}</div>`}`,
  },
  ...VIEW.closedDecisions.map(o => ({
    id: o.id, group: '색', title: (o.settledTitle || o.question), question: o.question,
    weight: '확정', tag: '확정',
    decided: esc(o.resolution),
    body: `<p>${esc(o.detail)}</p>` + (o.id === 'CQ-3' ? `
<table><thead><tr><th>색</th><th>HEX</th><th>흰 배경 대비</th><th>AA 본문 4.5:1</th><th>AA 큰글자 3:1</th></tr></thead><tbody>
<tr><td>메인 — Red 040</td><td><code>${DEC.main.hex}</code></td><td>${DEC.main.accessibility.contrastOnWhite}:1</td><td class="no">미달</td><td>통과</td></tr>
<tr><td>Red 050 (브랜드)</td><td><code>${red.docRefs['Red 050']}</code></td><td>${red.red050OnWhite}:1</td><td class="no">미달</td><td>통과</td></tr>
</tbody></table>
<div class="sample"><div style="color:${DEC.main.hex}">메인 Red 040 으로 쓴 본문 — 가나다라 ABC 123</div></div>
<p class="muted"><b>잔여 리스크.</b> ${esc(DEC.main.accessibility.residualRisk)}</p>` : ''),
  })),
  ...VIEW.openDecisions.map(o => ({
    id: o.id, group: '색', title: o.question, weight: '차단', tag: '팩트',
    body: `<p>${esc(o.detail)}</p>`
      + (o.options ? `<ol class="opts">${o.options.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '')
      + (o.recommendation ? `<div class="note"><b>권고.</b> ${esc(o.recommendation)}</div>` : '')
      + (o.blocks ? `<p class="muted">이 결정이 막고 있는 편입 항목: ${o.blocks.map(b => `<code>${esc(b)}</code>`).join(' · ')} — <code>data/color-decisions.json</code> 의 <code>additions</code>.</p>` : ''),
  })),
  ...(TDEC.open || []).filter(o => o.status === 'closed').map(o => ({
    id: o.id, group: '타이포', title: (o.settledTitle || o.question), question: o.question,
    weight: '확정', tag: '확정',
    decided: esc(o.resolution),
    body: `<p>${esc(o.detail)}</p>`,
  })),
  {
    id: 'TQ-5', group: '타이포', title: `정본 폰트는 ${TDEC.fontFamily.value} 단일입니다`,
    question: 'GDS 정본 폰트는 무엇인가',
    weight: '확정', tag: '확정',
    decided: `<b>${TDEC.fontFamily.value} 단일</b> — 강민관 ${TDEC.decidedAt}. 토큰(<code>--gds-font-family</code> · <code>$gds-font-family</code> · DTCG <code>type.*.$value.fontFamily</code>)과 <b>이 사이트의 렌더링까지</b> 정본으로 통일했습니다.`,
    body: (() => {
      const fam = TA.details.famCount;
      const CANON = TDEC.fontFamily.value;
      const total = Object.values(fam).reduce((a, b) => a + b, 0);
      const keep = fam[CANON] || 0;
      const clean = total - keep;
      const others = Object.entries(fam).filter(([f]) => f !== CANON).sort((a, b) => b[1] - a[1]);
      return `<div class="stats">
<div class="ok"><b>1</b><span>정본 폰트 — ${esc(CANON)}</span></div>
<div><b>${keep}</b><span>이미 정본을 쓰는 스타일 (${(keep / total * 100).toFixed(1)}%)</span></div>
<div class="hl"><b>${clean}</b><span>교체 대상 스타일 (${(clean / total * 100).toFixed(1)}%)</span></div>
<div><b>${others.length}</b><span>없앨 폰트 종수</span></div>
</div>
<p><b>아래 표는 "GDS 가 쓰는 폰트 목록"이 아니라 레거시 텍스트 스타일 ${total}개의 <u>현재 상태</u>입니다.</b> 정본은 ${esc(CANON)} 하나이고, 나머지 ${others.length}종 ${clean}개는 전부 <b>${esc(CANON)} 로 교체할 대상</b>입니다.</p>
<h4 style="font-size:13px;margin:16px 0 6px;color:var(--ok)">✅ 유지 — 정본</h4>
<table><thead><tr><th>패밀리</th><th>스타일 수</th></tr></thead><tbody>
<tr><td><code>${esc(CANON)}</code></td><td>${keep}</td></tr>
</tbody></table>
<h4 style="font-size:13px;margin:16px 0 6px;color:var(--brand)">✕ 교체 대상 — ${others.length}종 ${clean}개</h4>
<table><thead><tr><th>패밀리</th><th>스타일 수</th><th>→</th></tr></thead><tbody>
${others.map(([f, n]) => `<tr><td><code>${esc(f)}</code></td><td>${n}</td><td class="no">${esc(CANON)}</td></tr>`).join('')}
</tbody></table>
<p class="muted">${TA.details.famCaseDup.map(f => f.variants.map(v => `<code>${esc(v.name)}</code>(${v.count})`).join(' vs ')).join(' / ')} 는 <b>대소문자만 다른 같은 폰트</b>입니다 — 교체하면 함께 사라집니다.</p>
<p class="muted">정본 ✅ 페이지에는 원래 폰트 지정이 없었고(정의 ${TA.canon.familyDefined}건), 이 결정으로 채웠습니다.</p>`;
    })(),
  },
];

const open = items.filter(i => i.weight !== '확정');
const settled = items.filter(i => i.weight === '확정');
const blocking = items.filter(i => i.weight === '차단').length;

const html = `<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GDS — 결정 안건</title>
<style>
:root{--bg:#fff;--surface:#fbfbfc;--surface2:#f2f3f5;--line:#e7e9ec;--line-soft:#f1f2f4;
--text:#0d0f11;--text2:#5a616a;--text3:#939aa3;--brand:#F14950;--brand-deep:#ED1C24;--brand-soft:#FBD2D3;
--ok:#00C88C;--warn:#FF8159;--maxw:980px;
--r3:16px;--r4:22px;
--sh1:0 1px 2px rgba(13,15,17,.06);
--sh2:0 4px 16px rgba(13,15,17,.07),0 1px 3px rgba(13,15,17,.05);
--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:72px}
[data-theme=dark]{--bg:#0b0c0e;--surface:#131518;--surface2:#1b1e22;--line:#262a2f;--line-soft:#1a1d21;
--text:#f2f4f6;--text2:#9aa2ab;--text3:#6c747d;--brand:#F4777C;--brand-deep:#F14950;--brand-soft:#3a1214;
--sh1:0 1px 2px rgba(0,0,0,.5);--sh2:0 4px 16px rgba(0,0,0,.5),0 1px 3px rgba(0,0,0,.4)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-size:15px;line-height:1.7;-webkit-font-smoothing:antialiased;
font-family:"Noto Sans KR",sans-serif}
a{color:inherit}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;background:var(--surface2);padding:2px 6px;border-radius:5px}
.wrap{max-width:var(--maxw);margin:0 auto;padding:var(--s8) var(--s5) var(--s8)}
.bar{display:flex;gap:var(--s2);align-items:center;padding:var(--s3) var(--s5);
border-bottom:1px solid var(--line-soft);position:sticky;top:0;z-index:9;
background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(160%) blur(12px)}
.bar .grow{flex:1}
button{font:inherit;font-size:13px;color:var(--text2);background:transparent;border:1px solid var(--line);border-radius:7px;padding:5px 11px;cursor:pointer}
button:hover{color:var(--text);background:var(--surface)}
h1{font-size:clamp(30px,4vw,42px);font-weight:800;letter-spacing:-.035em;margin:0 0 var(--s3);line-height:1.15}
.lead{font-size:17px;color:var(--text2);max-width:62ch;margin-bottom:var(--s6)}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--brand);margin-bottom:var(--s3)}
.muted{color:var(--text2);font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--s3);margin:var(--s4) 0}
.stats>div{border:1px solid var(--line);border-radius:var(--r3);padding:var(--s3) var(--s4);background:var(--surface)}
.stats b{display:block;font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.stats span{font-size:12px;color:var(--text3)}
.stats .hl b{color:var(--brand)}
.stats .ok b{color:var(--ok)}
.card.done{background:var(--surface);border-color:var(--line)}
.decided{border-left:3px solid var(--ok);background:var(--surface2);padding:var(--s3) var(--s4);border-radius:0 9px 9px 0;margin:0 0 var(--s4);font-size:14px}
.decided b{color:var(--ok);margin-right:6px}
.asked{font-size:12.5px;color:var(--text3);margin:-6px 0 var(--s3)}
.settled-note{margin:var(--s7) 0 0;padding:var(--s4) var(--s5);border:1px solid var(--line);border-left:3px solid var(--ok);
  border-radius:0 11px 11px 0;background:var(--surface);font-size:14px;color:var(--text2)}
.settled-note b{color:var(--text)}
.settled-note a{text-decoration:underline}
.settled-list{display:flex;flex-direction:column;gap:4px;margin-top:var(--s3);font-size:13px;color:var(--text3)}
.settled-list b{color:var(--ok);font-family:ui-monospace,Menlo,monospace;font-size:11.5px;margin-right:6px}
h2.sec{font-size:19px;font-weight:800;letter-spacing:-.02em;margin:var(--s8) 0 var(--s4);padding-bottom:var(--s2);border-bottom:2px solid var(--line)}
h2.sec.open{border-bottom-color:var(--brand)}
h2.sec.ok{border-bottom-color:var(--ok)}
.pill.ok{background:var(--ok);color:#04231a}
h4{margin:var(--s4) 0 var(--s2)}
.card{border:1px solid var(--line);border-radius:var(--r4);padding:var(--s5) var(--s5) var(--s4);
margin:var(--s5) 0;background:var(--bg);box-shadow:var(--sh1);transition:.16s}
.card:hover{box-shadow:var(--sh2)}
.card>h3{margin:0 0 var(--s3);font-size:18px;font-weight:700;letter-spacing:-.02em;line-height:1.4}
.meta{display:flex;gap:var(--s2);align-items:center;margin-bottom:var(--s3);flex-wrap:wrap}
.pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;letter-spacing:.02em}
.pill.id{background:var(--text);color:var(--bg)}
.pill.blk{background:var(--brand-soft);color:#8E1116}
[data-theme=dark] .pill.blk{color:#FBD2D3}
.pill.exe{background:var(--surface2);color:var(--text2)}
.pill.tag{border:1px solid var(--line);color:var(--text3)}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin:var(--s3) 0}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line-soft)}
th{font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text3);font-weight:700}
td.no{color:var(--brand);font-weight:600}
.dot{display:inline-block;width:11px;height:11px;border-radius:99px;margin-right:6px;vertical-align:-1px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.25)}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:var(--s2);margin:var(--s3) 0}
.sw{border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--surface)}
.sw .chip{height:56px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.14)}
.sw .info{padding:8px 10px 10px}
.sw .nm{font-size:12px;font-weight:600;line-height:1.35}
.sw .hx{font-size:11px;color:var(--text3);font-family:ui-monospace,Menlo,monospace}
.sw .vr{font-size:11px;color:var(--brand);font-weight:600;margin-top:3px}
.steps{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-family:ui-monospace,Menlo,monospace;font-size:13px;margin:var(--s3) 0}
.steps span{padding:3px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface)}
.steps span.bad{border-color:var(--brand);color:var(--brand);font-weight:700}
.steps i{color:var(--text3);font-style:normal}
.note{border-left:3px solid var(--line);padding:var(--s2) 0 var(--s2) var(--s4);color:var(--text2);font-size:14px;margin:var(--s3) 0}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:var(--s3) 0}
.mini{width:22px;height:22px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.25)}
.sample{margin:var(--s3) 0;font-size:16px;line-height:1.9}
.tycmp{display:grid;grid-template-columns:96px 1fr;gap:var(--s4);align-items:center;padding:var(--s3) 0;border-bottom:1px solid var(--line-soft)}
.tycmp .spec{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--text3)}
.tycmp .toks div{line-height:1.5;letter-spacing:-.02em}
.tycmp .tk{color:var(--brand);font-weight:700;font-size:12px;font-family:ui-monospace,Menlo,monospace;margin-right:8px}
.opts{margin:var(--s3) 0;padding-left:20px;font-size:14px;color:var(--text2)}
.ocl{border:1px solid var(--line);border-radius:var(--r3);padding:var(--s4);margin:var(--s3) 0;background:var(--surface)}
.ochd{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)}
.ochd b{font-size:15px;letter-spacing:-.01em}
.ocnum{font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums}
.ocact{margin-left:auto;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
  background:var(--surface2);color:var(--text2)}
.ocact.ok{background:var(--ok);color:#04231a}
.ocact.warn{background:var(--brand-soft);color:#8E1116}
[data-theme=dark] .ocact.warn{color:#FBD2D3}
.ocl details{margin-top:var(--s3)}
.ocl summary{cursor:pointer;font-size:12.5px;color:var(--text3);user-select:none}
.ocl summary:hover{color:var(--text)}
.opts li{margin-bottom:6px}
.sync{margin:var(--s7) 0 0;padding:var(--s5);border:1px solid var(--line);border-radius:var(--r4);background:var(--surface)}
.sync h3{margin:0 0 var(--s2);font-size:17px;font-weight:700;letter-spacing:-.02em}
.sync .sub{font-size:13.5px;color:var(--text2);margin:0 0 var(--s3)}
.defect{margin:var(--s5) 0 0;padding:var(--s5);border:1px solid var(--line);border-left:3px solid var(--warn);border-radius:0 var(--r4) var(--r4) 0;background:var(--surface)}
.defect h3{margin:0 0 var(--s2);font-size:17px;font-weight:700;letter-spacing:-.02em}
td.act-adopt{color:var(--ok);font-weight:600}
td.act-retire{color:var(--text3)}
td.act-defer{color:var(--brand);font-weight:600}
footer{margin-top:var(--s8);padding-top:var(--s5);border-top:1px solid var(--line);color:var(--text3);font-size:13px}
</style></head>
<body>
<div class="bar"><b style="font-size:14px">GDS</b><span class="muted">결정 안건</span><span class="grow"></span>
<a href="../"><button>정본</button></a><a href="../diagnostics.html"><button>진단</button></a>
<button id="th">◐ 테마</button></div>
<div class="wrap">
<div class="eyebrow">Decisions</div>
<h1>아직 정해야 할 것 — ${open.length}건</h1>
<p class="lead">색·타이포 감사에서 나온 안건 중 <b>결정이 남은 것만</b> 모았습니다. 확정된 ${settled.length}건은 토큰·사이트에 반영을 마쳐 이 목록에서 뺐습니다. 각 항목은 Figma 원본 실측 기반이며, 실행(원본 수정)은 디자인팀 몫입니다.</p>
<div class="stats">
<div class="hl"><b>${open.length}</b><span>남은 안건</span></div>
<div class="ok"><b>${settled.length}</b><span>확정 — 반영 완료</span></div>
<div><b>${items.length}</b><span>전체</span></div>
<div><b>${EXPORT}</b><span>.fig 스냅샷</span></div>
</div>
${(() => {
  const card = i => `<div class="card" id="${i.id}">
<div class="meta"><span class="pill id">${i.id}</span><span class="pill ${i.weight === '차단' ? 'blk' : 'exe'}">${i.weight}</span><span class="pill tag">${i.group}</span><span class="pill tag">${i.tag}</span></div>
<h3>${esc(i.title)}</h3>
${i.body}
</div>`;
  return open.map(card).join('\n');
})()}
${VIEW.figmaSync ? `<div class="sync">
<h3>Figma 원본 대조 — ${VIEW.figmaSync.checkedAt}</h3>
<p class="sub">${esc(VIEW.figmaSync.note)}</p>
<div class="stats">
<div><b>${VIEW.figmaSync.figmaVariables}</b><span>Figma 변수</span></div>
<div><b>${VIEW.figmaSync.canonStyles}</b><span>기존 정본</span></div>
<div class="ok"><b>0</b><span>값 불일치</span></div>
<div class="hl"><b>${VIEW.undocumented.length}</b><span>문서화 안 된 변수</span></div>
</div>
<table><thead><tr><th>Figma 변수</th><th>값</th><th>판정</th><th>근거</th></tr></thead><tbody>
${VIEW.typeHandled.map(t => `<tr>
<td><code>${esc(t.sourceName)}</code></td>
<td><code>${esc(t.value)}</code></td>
<td class="act-adopt">확정 → <code>--gds-type-letter-spacing</code></td>
<td class="muted">${esc(t.note)}</td></tr>`).join('')}
${VIEW.additions.map(a => `<tr>
<td><code>${esc(a.sourceName)}</code></td>
<td><span class="dot" style="background:${a.hex}"></span><code>${a.hex}</code></td>
<td class="act-${a.action}">${a.action === 'adopt' ? `편입 → ${esc(a.token)}` : a.action === 'retire' ? `폐기 → ${esc(a.target)}` : `보류 (${esc(a.blockedBy)})`}</td>
<td class="muted">${esc(a.reason)}</td></tr>`).join('')}
</tbody></table>
<p class="muted">스냅샷 원본 <code>data/figma-variables.json</code> — 손으로 쓴 값이 아니라 <code>get_variable_defs</code> 응답 그대로입니다. 빌드가 이 스냅샷과 결정 파일을 대조해 어긋나면 실패합니다.</p>
</div>` : ''}
${VIEW.sourceDefects ? `<div class="defect">
<h3>원본 .fig 자체의 오류 ${VIEW.sourceDefects.items.length}건</h3>
<p class="sub">${esc(VIEW.sourceDefects.$description)}</p>
<table><thead><tr><th>ID</th><th>문제</th><th>실제</th><th>노드</th></tr></thead><tbody>
${VIEW.sourceDefects.items.map(d => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(d.problem)}</td><td class="muted">${esc(d.actual)}</td><td class="muted"><code>${esc(d.node)}</code></td></tr>`).join('')}
</tbody></table>
</div>` : ''}
<div class="settled-note">
<b>✅ 확정 ${settled.length}건은 이 페이지에서 뺐습니다.</b> 이미 토큰·사이트에 반영돼 있어 논의 대상이 아닙니다 — 값은 <a href="../">정본 사이트</a>, 근거는 <code>data/color-decisions.json</code> · <code>data/type-decisions.json</code> 과 <code>README.md</code> 의 확정 결정표에 있습니다.
<div class="settled-list">${settled.map(i => `<span><b>${i.id}</b> ${esc(i.title)}</span>`).join('')}</div>
</div>
<footer>
근거 원본 <code>${esc(D.meta.source)}</code> · export ${EXPORT} · 수치는 <code>tools/audit/*.js</code> 계산, <code>npm run check</code> 대조.<br>
확정 결정 — <code>data/color-decisions.json</code> · <code>data/type-decisions.json</code><br>
상세 문서 — <code>docs/GDS-color-naming-v0.1.md</code> · <code>docs/GDS-color-merge-v0.1.md</code> · <code>docs/GDS-typo-v0.2.md</code>
</footer>
</div>
<script>
document.getElementById('th').onclick=function(){var h=document.documentElement;
h.dataset.theme=h.dataset.theme==='dark'?'light':'dark';};
</script>
</body></html>`;

const FONT = require('./font.js');
const dir = path.join(ROOT, 'dist', 'decisions');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), FONT.applyFont(html));
console.log(`  결정 안건 → dist/decisions/index.html (${Math.round(html.length / 1024)} KB · 남은 ${open.length}건 · 확정 ${settled.length}건 제외)`);

module.exports = { items, open, settled, blocking };
