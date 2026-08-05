'use strict';
/**
 * 결정 기록 페이지 — dist/decisions/index.html → /gds/decisions
 *
 * 근거는 «GDS (그린카 디자인 시스템)» 라이브러리 + ✅ 페이지 하나뿐입니다.
 * 레거시 라이브러리 기반 판정(통폐합·orphan 묶음)은 2026-08-05 전량 철회했습니다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEW = require('./canon-view.js');
const D = VIEW.D;
const DEC = VIEW.DEC;
const LIB = VIEW.LIB;
const GAPS = VIEW.GAPS;
const TDEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'type-decisions.json'), 'utf8'));
const rd = n => { const p = path.join(ROOT, 'data', n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const BT = rd('component-buttons.json');
const FS_ = rd('figma-foundation-sync.json');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const EXPORT = String(D.meta.exported).slice(0, 10);
const sev = s => s === '높음' ? 'blk' : s === '중간' ? 'exe' : 'tag';

const settled = []
  .concat(VIEW.closedDecisions.map(o => ({ ...o, group: '색' })))
  .concat((TDEC.open || []).filter(o => o.status === 'closed').map(o => ({ ...o, group: '타이포' })));
const open = []
  .concat(VIEW.openDecisions.map(o => ({ ...o, group: '색' })))
  .concat((TDEC.open || []).filter(o => o.status === 'open').map(o => ({ ...o, group: '타이포' })));

const groups = [...new Set(VIEW.colors.map(c => c.name.split('/')[0]))];
const gapsDone = GAPS ? GAPS.items.filter(g => g.status === 'resolved') : [];
const gapsOpen = GAPS ? GAPS.items.filter(g => g.status !== 'resolved') : [];
const ST = VIEW.structure;
const TS = VIEW.typeSemantic;

const html = `<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GDS — 결정 기록</title>
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
<div class="bar"><b style="font-size:14px">GDS</b><span class="muted">결정 기록</span><span class="grow"></span>
<a href="../"><button>정본</button></a>
<button id="th">◐ 테마</button></div>
<div class="wrap">
<div class="eyebrow">Decisions</div>
<h1>정본의 근거 — GDS 라이브러리</h1>
<p class="lead">${esc(VIEW.canonBasis ? VIEW.canonBasis.note : '')}</p>

<div class="stats">
<div class="ok"><b>${VIEW.colors.length}</b><span>정본 색</span></div>
<div><b>${groups.length}</b><span>그룹</span></div>
<div class="ok"><b>${settled.length}</b><span>확정 결정</span></div>
<div class="${open.length ? 'hl' : 'ok'}"><b>${open.length}</b><span>남은 안건</span></div>
</div>

<div class="sync">
<h3>판단 기준</h3>
<p class="sub">색 판정 기준은 <b>색차(ΔE)가 아니라 라이브러리 소속</b>입니다. 아래 라이브러리들은 같은 파일에 물려 있지만 정본이 아니므로 판단 근거로 쓰지 않습니다.</p>
<table><thead><tr><th>라이브러리</th><th>왜 제외하나</th></tr></thead><tbody>
${VIEW.excludedLibraries.map(l => `<tr><td><code>${esc(l.name)}</code></td><td class="muted">${esc(l.why)}</td></tr>`).join('')}
</tbody></table>
${VIEW.missedBySwatch.length ? `<p class="sub" style="margin-top:14px"><b>✅ 스와치 그림만 봤을 때 빠졌던 ${VIEW.missedBySwatch.length}종</b> — ${VIEW.missedBySwatch.map(n => `<code>${esc(n)}</code>`).join(' · ')}. 흰색이거나 그림에 그려지지 않은 것들입니다.</p>` : ''}
</div>

${GAPS ? `<div class="eyebrow" style="margin-top:40px">Gaps</div>
<h2 style="font-size:22px;margin:6px 0 4px">디자인 시스템으로서 모자란 곳 — ${GAPS.items.length}건 중 ${gapsDone.length}건 메움</h2>
<p class="lead">${esc(GAPS.principle)}</p>
<div class="stats">
<div class="ok"><b>${gapsDone.length}</b><span>메운 것</span></div>
<div class="hl"><b>${gapsOpen.filter(g => g.severity === '높음').length}</b><span>남은 것 · 높음</span></div>
<div><b>${gapsOpen.filter(g => g.severity === '중간').length}</b><span>중간</span></div>
<div><b>${gapsOpen.filter(g => g.severity === '낮음').length}</b><span>낮음</span></div>
</div>
${gapsDone.length ? `<h4 style="font-size:13px;margin:22px 0 6px;color:var(--ok)">✅ 메운 것 ${gapsDone.length}건</h4>
<table><thead><tr><th>ID</th><th>영역</th><th>무엇이 모자랐나</th><th>어떻게 메웠나</th></tr></thead><tbody>
${gapsDone.map(g => `<tr><td><code>${g.id}</code></td><td class="muted">${esc(g.area)}</td><td>${esc(g.finding.slice(0, 90))}…</td><td>${esc(g.resolution)}</td></tr>`).join('')}
</tbody></table>` : ''}
<h4 style="font-size:13px;margin:22px 0 6px;color:var(--brand)">남은 것 ${gapsOpen.length}건</h4>
${gapsOpen.map(g => `<div class="card" id="${g.id}">
<div class="meta"><span class="pill id">${g.id}</span><span class="pill ${sev(g.severity)}">${g.severity}</span><span class="pill tag">${esc(g.area)}</span></div>
<h3>${esc(g.finding)}</h3>
<p class="muted"><b>근거.</b> ${esc(g.evidence)}</p>
<div class="note"><b>메우는 법.</b> ${esc(g.fix)}</div>
${g.progress ? `<p class="muted"><b>진행.</b> ${esc(g.progress)}</p>` : ''}
</div>`).join('')}
<div class="sync">
<h3>계산으로 찾은 것</h3>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody>
${GAPS.computed.duplicateValues.map(d => `<tr><td><span class="dot" style="background:${d.hex.slice(0, 7)}"></span><code>${d.hex}</code></td><td>같은 값 두 이름 — ${d.names.map(n => `<code>${esc(n)}</code>`).join(' = ')}</td></tr>`).join('')}
${GAPS.computed.caseInconsistent.map(n => `<tr><td>표기 변형</td><td><code>${esc(n)}</code> — 그룹에서 혼자 소문자</td></tr>`).join('')}
${GAPS.computed.luminanceInversion.map(i => `<tr><td>명도 역전</td><td>${esc(i.detail)}</td></tr>`).join('')}
</tbody></table>
</div>` : ''}

${ST ? `<div class="eyebrow" style="margin-top:40px">Structure</div>
<h2 style="font-size:22px;margin:6px 0 4px">GDS 4계층 — 저장소 반영 상태</h2>
<p class="lead">${esc(ST.note)}</p>
${ST.layers.map(l => `<div class="sync">
<h3>${l.name} (${l.ko}) — ${esc(l.role)}</h3>
${l.정의 ? `<p class="sub">${esc(l.정의)}</p>` : ''}
${l.items.length ? `<table><thead><tr><th>항목</th><th>Figma</th><th>저장소</th><th>어디에</th></tr></thead><tbody>
${l.items.map(i => `<tr><td>${esc(i.name)}</td>
<td>${i.figma === 'done' ? '✅' : i.figma === 'wip' ? '🚧' : '—'}</td>
<td class="${i.repo === 'none' ? 'no' : ''}">${i.repo === 'none' ? '없음' : i.repo === 'tokens' ? '토큰' : i.repo === 'docs' ? '문서' : '실측'}</td>
<td class="muted">${esc(i.where || i.note || '')}</td></tr>`).join('')}
</tbody></table>` : `<p class="muted">${esc(l.note || '')}</p>`}
${l.conflict ? `<div class="note"><b>불일치.</b> ${esc(l.conflict)}</div>` : ''}
</div>`).join('')}` : ''}

${TS ? `<div class="eyebrow" style="margin-top:40px">Semantic · Type</div>
<h2 style="font-size:22px;margin:6px 0 4px">타이포 시맨틱 — 쓰임새 ${TS.counts.usages}종 중 ${TS.counts.tokens}종만 토큰</h2>
<p class="lead">${esc(TS.rule)} 출처는 ${esc(TS.source)} 입니다 — 손으로 이름을 짓지 않았습니다.</p>
<div class="sync">
<h3>토큰 ${TS.tokens.length}종 — 쓰임새가 단계 하나만 가리킴</h3>
<table><thead><tr><th>토큰</th><th>정본 단계</th><th>차기 라이브러리 이름</th><th>정본 Usage 셀</th></tr></thead><tbody>
${TS.tokens.map(t => `<tr><td><code>${esc(t.token)}</code></td><td>${esc(t.refCanon)}</td><td><code>${esc(t.ref)}</code></td><td class="muted">${esc(t.usage)}</td></tr>`).join('')}
</tbody></table>
</div>
<div class="sync">
<h3>계열 ${TS.families.length}종 — 토큰으로 굳히지 못함</h3>
<table><thead><tr><th>정본 Usage 셀</th><th>가리키는 단계</th></tr></thead><tbody>
${TS.families.map(f => `<tr><td><code>${esc(f.usage)}</code></td><td>${f.steps.map(s => esc(s)).join(' · ')}</td></tr>`).join('')}
</tbody></table>
<div class="note"><b>왜 남겼나.</b> ${esc(TS.families[0] ? TS.families[0].why : '')}</div>
</div>` : ''}

${open.length ? `<div class="eyebrow" style="margin-top:40px">Open</div>
<h2 style="font-size:22px;margin:6px 0 12px">아직 정해야 할 것 — ${open.length}건</h2>
${open.map(o => `<div class="card" id="${o.id}">
<div class="meta"><span class="pill id">${o.id}</span><span class="pill blk">차단</span><span class="pill tag">${o.group}</span></div>
<h3>${esc(o.question)}</h3>
<p>${esc(o.detail || '')}</p>
${o.options ? `<ol class="opts">${o.options.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
${o.recommendation ? `<div class="note"><b>권고.</b> ${esc(o.recommendation)}</div>` : ''}
</div>`).join('')}` : ''}

<div class="eyebrow" style="margin-top:40px">Settled</div>
<h2 style="font-size:22px;margin:6px 0 12px">확정된 결정 — ${settled.length}건</h2>
${settled.map(o => `<div class="card" id="${o.id}">
<div class="meta"><span class="pill id">${o.id}</span><span class="pill exe">확정</span><span class="pill tag">${o.group}</span></div>
<h3>${esc(o.settledTitle || o.question)}</h3>
<p>${esc(o.resolution || '')}</p>
${o.detail ? `<p class="muted">${esc(o.detail)}</p>` : ''}
</div>`).join('')}

<div class="sync">
<h3>정본 위에 덮어쓴 것</h3>
<p class="sub">원본 <code>.fig</code> 는 고치지 않습니다(제1원칙). 아래는 저장소 정본에서만 적용되는 재정의입니다.</p>
<table><thead><tr><th>종류</th><th>대상</th><th>결과</th><th>사유</th></tr></thead><tbody>
${VIEW.renames.map(r => `<tr><td>이름</td><td><code>${esc(r.from)}</code></td><td><code>${esc(r.to)}</code></td><td class="muted">${esc(r.reason)}</td></tr>`).join('')}
${VIEW.valueOverrides.map(o => `<tr><td>값</td><td><code>${esc(o.token)}</code> ${o.from}</td><td><code>${o.to}</code></td><td class="muted">${esc(o.reason)}</td></tr>`).join('')}
${VIEW.splits.map(s => `<tr><td>분리</td><td><code>${esc(s.token)}</code></td><td>${s.into.map(t => `<code>${esc(t.token)}</code> ${t.hex}`).join(' · ')}</td><td class="muted">${esc(s.reason)}</td></tr>`).join('')}
${VIEW.canonRetires.map(r => `<tr><td>흡수</td><td><code>${esc(r.token)}</code></td><td><code>${esc(r.into)}</code></td><td class="muted">${esc(r.reason)}</td></tr>`).join('')}
${VIEW.additions.map(a => `<tr><td>변수 처분</td><td><code>${esc(a.sourceName)}</code> ${a.hex}</td><td class="${a.action === 'drop' ? 'act-defer' : ''}">${a.action === 'drop' ? '폐기' : a.action === 'retire' ? `→ <code>${esc(a.target)}</code>` : esc(a.action)}</td><td class="muted">${esc(a.reason)}</td></tr>`).join('')}
</tbody></table>
</div>

${FS_ ? `<div class="sync">
<h3>타이포 · 간격 · 엘리베이션 대조 — ${esc(FS_.checkedAt || '2026-08-05')}</h3>
<table><thead><tr><th>영역</th><th>판정</th></tr></thead><tbody>
<tr><td>타이포그래피</td><td>${FS_.typography.matched}/${FS_.typography.total} 일치 · 행간 ${esc(FS_.typography.lineHeight)}</td></tr>
<tr><td>간격</td><td>값 ${FS_.spacing.valuesMatch ? '일치' : '불일치'} · 원본 이름 중복 ${FS_.spacing.originalDuplicateNames}건</td></tr>
<tr><td>엘리베이션</td><td>${esc(FS_.elevation.verdict)}</td></tr>
</tbody></table>
</div>` : ''}

${BT ? `<div class="sync">
<h3>컴포넌트 — Buttons ✅</h3>
<p class="sub">버튼 ${BT.types.length}종. 원본이 이미 프리미티브 → 시맨틱 → 컴포넌트 3계층을 씁니다.</p>
<table><thead><tr><th>#</th><th>종류</th></tr></thead><tbody>
${BT.types.map(t => `<tr><td>${t.no}</td><td>${esc(t.name)}</td></tr>`).join('')}
</tbody></table>
</div>` : ''}

${VIEW.sourceDefects ? `<div class="sync">
<h3>원본 기록 — ${VIEW.sourceDefects.items.length}건</h3>
<p class="sub">고치지 않고 노드 ID 와 함께 기록만 해 둡니다. 토큰 값에는 영향이 없습니다.</p>
<table><thead><tr><th>ID</th><th>어디</th><th>무엇</th></tr></thead><tbody>
${VIEW.sourceDefects.items.map(d => `<tr><td><code>${d.id}</code></td><td class="muted">${esc(d.where)}</td><td>${esc(d.problem)}</td></tr>`).join('')}
</tbody></table>
</div>` : ''}

<footer>
정본 근거 — <code>data/gds-library.json</code> (GDS 라이브러리 ${LIB.counts.fill}종) · 모자란 곳 <code>data/gds-gaps.json</code><br>
확정 결정 — <code>data/color-decisions.json</code> · <code>data/type-decisions.json</code> · 대조는 <code>npm run check</code><br>
.fig 스냅샷 ${EXPORT} · 라이브러리 조회 ${esc(LIB.checkedAt)}
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
console.log(`  결정 기록 → dist/decisions/index.html (${Math.round(html.length / 1024)} KB · 확정 ${settled.length}건 · 남은 ${open.length}건 · 모자란 곳 ${GAPS ? GAPS.items.length : 0}건)`);

module.exports = { settled, open, gaps: GAPS ? GAPS.items : [], gapsDone, gapsOpen };
