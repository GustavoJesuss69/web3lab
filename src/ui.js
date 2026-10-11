import { CHAPTERS, CHAINS, STARTS, TOTAL, pick } from './content.js';
import { E, ramp, clamp, OTHERS, CAP, BASE_GWEI, MAXFEE_GWEI } from './sim.js';
const $ = (id) => document.getElementById(id);
const S = STARTS;
const CHECK = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export const SORTED = OTHERS.slice().sort((a, b) => b - a);
export const CUT_FEE = SORTED[CAP - 1]; // need fee > this to fit

export function buildUI(handlers) {
  // chain seg
  $('chainSeg').innerHTML = CHAINS.map((c) => `<button data-chain="${c.id}" id="chain-${c.id}">${c.label}</button>`).join('');
  $('navList').innerHTML = CHAPTERS.map((c, i) => `<button class="navitem" id="nav-${i}" data-ch="${i}"><span class="n">0${i + 1}</span><span class="t"></span><span class="s"></span><span class="bar"><i></i></span></button>`).join('');
  $('segs').innerHTML = CHAPTERS.map((c, i) => `<div class="sg" id="seg-${i}" style="flex:${c.dur}"><i></i>${c.steps.slice(1).map((s) => `<em style="left:${(s.at / c.dur) * 100}%"></em>`).join('')}<span>0${i + 1} ${pick(c.title, 'g').toUpperCase()}</span></div>`).join('');
  $('tTot').textContent = fmt(TOTAL);
  $('steps').innerHTML = [0, 1, 2].map((i) => `<div class="step" id="step-${i}"><div class="num">${i + 1}</div><div class="st"></div><div class="sb"><div class="sbi" style="padding-top:6px"></div></div><div class="sp"><i></i></div></div>`).join('');
  $('feeCut').style.left = CUT_FEE + '%';
  return {};
}
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };
const cache = new Map();
const setT = (el, v) => { if (cache.get(el) !== v) { cache.set(el, v); el.textContent = v; } };
const setH = (el, v) => { if (cache.get(el) !== v) { cache.set(el, v); el.innerHTML = v; } };
const words = (el, text, key) => { if (cache.get(el) !== key) { cache.set(el, key); el.innerHTML = text.split(' ').map((w) => `<span>${w} </span>`).join(''); } return el.children; };
const animWords = (spans, t, stagger, dur = 0.45, dy = 14) => { for (let i = 0; i < spans.length; i++) { const a = E.in(ramp(t, i * stagger, i * stagger + dur)); spans[i].style.opacity = a; spans[i].style.transform = `translateY(${(1 - a) * dy}px)`; } };
const labelPool = new Map();
function labels(list, stage) {
  const host = $('labels'); const seen = new Set();
  for (const L of list) {
    let el = labelPool.get(L.id); if (!el) { el = document.createElement('div'); el.className = 'lbl3d'; host.appendChild(el); labelPool.set(L.id, el); }
    seen.add(L.id); const p = stage.project(L.pos);
    setH(el, L.text); const cls = 'lbl3d ' + (L.cls || ''); if (el.className !== cls) el.className = cls;
    el.style.left = Math.round(p.x + (L.dx || 0)) + 'px'; el.style.top = Math.round(p.y + (L.dy || 0)) + 'px'; el.style.opacity = p.ok ? L.a ?? 1 : 0;
    el.style.display = '';
  }
  for (const [id, el] of labelPool) if (!seen.has(id)) el.style.display = 'none';
}
const ovPool = new Map();
function ov(id, html, x, y, a, w, key) {
  let el = ovPool.get(id); if (!el) { el = document.createElement('div'); el.className = 'ov'; $('overlays').appendChild(el); ovPool.set(id, el); }
  if (key === undefined) key = html; if (cache.get(el) !== key) { cache.set(el, key); el.innerHTML = html; }
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.width = w ? w + 'px' : ''; el.style.opacity = a; el.style.transform = `translateY(${(1 - a) * 12}px)`; el.style.display = a > 0.001 ? '' : 'none';
  return el;
}
const hideOv = (keep) => { for (const [id, el] of ovPool) if (!keep.has(id)) el.style.display = 'none'; };

export function renderUI(st, d, stage, out) {
  const c = st.chain, ch = d.ch, lt = d.lt, C = d.chapter, now = st.now;
  const chainAge = now - (st.stamps.chain ?? -99);
  // top
  CHAINS.forEach((x) => $('chain-' + x.id).classList.toggle('on', x.id === c));
  setT($('simClock'), `T+${st.T.toFixed(1).padStart(4, '0')}s`);
  // nav
  CHAPTERS.forEach((cc, i) => { const el = $('nav-' + i); el.classList.toggle('on', i === ch); el.classList.toggle('done', i < ch);
    setT(el.children[1], pick(cc.title, c)); setT(el.children[2], pick(cc.sub, c));
    el.children[3].firstChild.style.width = (clamp((st.T - S[i]) / cc.dur) * 100).toFixed(2) + '%';
    setT($('seg-' + i).querySelector('span'), `0${i + 1} ${pick(cc.title, c).toUpperCase()}`); $('seg-' + i).classList.toggle('on', i === ch);
    $('seg-' + i).firstChild.style.width = (clamp((st.T - S[i]) / cc.dur) * 100).toFixed(2) + '%'; });
  setT($('navCount'), `0${ch + 1} / 06`);
  // stage head
  const ht = Math.min(ch === 0 ? lt + 3 : lt, chainAge + 0.15);
  setT($('chKicker'), `CHAPTER 0${ch + 1} / 06`);
  const ttl = pick(C.title, c); animWords(words($('chTitle'), ttl, ttl + ch), ht, 0.09, 0.5, 22);
  const sub = pick(C.sub, c); animWords(words($('chSub'), sub, sub + ch), ht - 0.15, 0.04, 0.4, 10);
  const lede = pick(C.lede, c); animWords(words($('chLede'), lede, lede + ch + c), ht - 0.3, 0.025, 0.4, 8);
  // steps
  setT($('stepCount'), `${d.step + 1} / ${C.steps.length}`);
  C.steps.forEach((s, i) => {
    const el = $('step-' + i); const next = C.steps[i + 1]?.at ?? C.dur;
    el.classList.toggle('on', i === d.step); el.classList.toggle('past', i < d.step);
    setT(el.children[1], pick(s.title, c)); const bi = el.children[2].firstChild; setT(bi, pick(s.body, c));
    const full = bi.offsetHeight; const open = i === d.step ? E.io(ramp(lt - s.at, 0, 0.35)) * (i === 0 && ch === 0 ? 1 : 1) : i === d.step - 1 ? 1 - E.io(ramp(lt - next, 0, 0.3)) : 0;
    const openA = (i === 0 && lt < 0.35 && ch >= 0) ? Math.max(open, i === d.step ? E.io(ramp(lt, -0.01, 0.35)) : 0) : open;
    el.children[2].style.height = (full * openA).toFixed(1) + 'px'; bi.style.opacity = openA;
    el.children[3].firstChild.style.width = (clamp((lt - s.at) / (next - s.at)) * 100).toFixed(1) + '%';
  });
  // controls
  setT($('feeLbl'), d.feeLabel); setT($('feeVal'), d.feeText);
  $('feeThumb').style.left = st.fee + '%'; $('feeFill').style.width = st.fee + '%';
  const failed = st.failNonce || st.failFee;
  setT($('qPos'), failed ? (c === 's' ? 'Not scheduled' : 'Out of the queue') : `Queue position ${d.pos} of 25`);
  const qf = $('qFit'); setT(qf, failed ? d.reasonShort.toLowerCase() : d.fits ? 'fits next block' : 'misses next block'); qf.className = failed || !d.fits ? 'bad' : 'ok';
  $('togNonce').classList.toggle('on', st.failNonce); $('togFee').classList.toggle('on', st.failFee);
  setT($('togNonceL'), c === 's' ? 'Expired blockhash' : c === 'e' ? 'Wrong nonce' : 'Wrong counter');
  setT($('togFeeL'), c === 's' ? 'No SOL for fee' : c === 'e' ? 'maxFee < base fee' : 'Fee too low');
  const oc = $('outcome'); setT(oc, d.reason); oc.className = 'outcome ' + (d.included ? 'ok' : 'bad');
  // note
  const nt = C.note[c] || C.note.g; setT($('noteT'), nt[0]); setT($('noteB'), nt[1]); setT($('noteChain'), CHAINS.find((x) => x.id === c).label.toUpperCase());
  const na = E.in(ramp(Math.min(chainAge, lt + 1), 0, 0.4)); $('note').style.opacity = 0.35 + 0.65 * na;
  // transport
  $('playhead').style.left = (st.T / TOTAL * 100).toFixed(3) + '%';
  setT($('tNow'), fmt(st.T));
  setH($('playIcon'), st.playing ? '<path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" fill="currentColor"/>' : '<path d="M6 4l10 6-10 6z" fill="currentColor"/>');
  setT($('c1k'), c === 's' ? 'LEADER QUEUE · PENDING' : 'PENDING POOL · TXS');
  setT($('c3k'), c === 's' ? 'STAKE VOTED · COMMITMENT' : 'STAKE VOTED · FINALITY');
  setT($('c1v'), out.c1); setT($('c2v'), out.c2); setT($('c3v'), out.c3);
  // press states
  document.querySelectorAll('.press').forEach((e) => e.classList.remove('press'));
  if (st.press) { const e = document.querySelector(st.press); if (e) e.classList.add('press'); }

  // ---------- stage overlays & labels ----------
  const A = stage.anchors; const L = []; const keep = new Set();
  const sw = $('stage').clientWidth, sh = $('stage').clientHeight;
  const tip = d.tipG.toFixed(2);
  if (ch <= 1) L.push({ id: 'wal', pos: A.wallet.clone().setY(0.1), text: 'YOU · WALLET', dy: 34, a: 1 });
  if (ch === 1) L.push({ id: 'rpc', pos: A.rpc, text: c === 's' ? 'RPC NODE · sendTransaction' : 'RPC NODE', cls: ch === 1 ? 'teal' : '', dy: -8 });
  if (ch === 0) {
    const t = lt; const a = E.in(ramp(t, 0.1, 0.5));
    const rows = c === 's'
      ? [['to', '7xKX…9fQa'], ['instruction', 'transfer 1.0 SOL'], ['recentBlockhash', 'EkSn…3Lqv'], ['fee payer', 'you'], ['CU price', d.cuPrice.toLocaleString('en-US') + ' µL']]
      : [['to', '0x3f5c…a91e'], ['value', c === 'e' ? '1.0 ETH' : '1.0'], ['nonce', '9'], ['gasLimit', '21,000'], [c === 'e' ? 'maxFeePerGas' : 'max fee', MAXFEE_GWEI + (c === 'e' ? ' gwei' : '')], [c === 'e' ? 'maxPriorityFee' : 'tip', tip + (c === 'e' ? ' gwei' : '')]];
    const sig = c === 's' ? [['signature', '5VERv8…xQ2u']] : [['v · r · s', '0x1 · 0x2a9f… · 0x6c1e…'], ['tx hash', '0x9b3e…c41d']];
    const typed = (s, t0) => s.slice(0, Math.round(s.length * clamp((t - t0) / 0.35)));
    let html = `<div class="k"><span>TRANSACTION · DRAFT</span>${t >= 4.2 ? '<span class="stamp">SIGNED</span>' : '<span class="dim">example</span>'}</div><div class="kv">`;
    rows.forEach((r, i) => { const t0 = 0.3 + i * 0.3; html += `<span class="a">${t >= t0 ? r[0] : ''}</span><span class="b">${typed(r[1], t0)}</span>`; });
    sig.forEach((r, i) => { const t0 = 2.9 + i * 0.5; html += `<span class="a">${t >= t0 ? r[0] : ''}</span><span class="b amber">${typed(r[1], t0)}</span>`; });
    html += '</div>';
    const p = stage.project(A.walletTop);
    const el = ov('draft', html, clamp(p.x + 90, 20, sw - 380), clamp(p.y - 150, 250, sh - 300), a, 350, html); keep.add('draft');
    el.style.borderColor = t >= 4.2 ? 'rgba(255,181,71,.6)' : '';
    if (t >= 2.6) L.push({ id: 'key', pos: A.wallet, text: t >= 5 ? 'PRIVATE KEY · NEVER SENT' : 'PRIVATE KEY · STAYS HERE', cls: 'amber', dx: -150, dy: 12, a: E.in(ramp(t, 2.6, 3.0)) });
    if (t >= 5.0) L.push({ id: 'signed', pos: A.walletTop, text: 'SIGNED TX', cls: 'amber', dy: -26, a: E.in(ramp(t, 5.1, 5.5)) });
  }
  if (ch === 1) {
    const t = lt; const a = E.in(ramp(t, 1.7, 2.1)) * (1 - E.out(ramp(t, 5.4, 5.9)));
    const items = c === 's' ? ['signatures valid', 'blockhash within 150 blocks', 'simulation passed'] : ['signature valid', 'balance covers value + fee', c === 'e' ? 'nonce 9 is next' : 'counter is next'];
    const bad = [false, c !== 's' && st.failFee, st.failNonce];
    if (c === 's') { bad[1] = st.failNonce; bad[2] = st.failFee; }
    let html = `<div class="k"><span>${c === 'e' ? 'EXECUTION CLIENT' : c === 's' ? 'PREFLIGHT' : 'NODE CHECKS'}</span></div>`;
    items.forEach((it, i) => { const on = t >= 2.0 + i * 0.3; html += `<div class="row" style="gap:8px;margin:5px 0;font-size:13px;color:${on ? (bad[i] ? '#ff6b6b' : '#c3ccd5') : '#3a4756'}"><span style="color:${bad[i] ? '#ff6b6b' : '#45d4c3'};opacity:${on ? 1 : 0}">${bad[i] ? CROSS : CHECK}</span>${it}</div>`; });
    const p = stage.project(A.rpc); ov('checks', html, clamp(p.x - 120, 20, sw - 280), clamp(p.y + 70, 250, sh - 150), a, 250); keep.add('checks');
    if (t >= GOS && c !== 's') L.push({ id: 'gos', pos: A.proposer, text: 'GOSSIP · PEER TO PEER', cls: 'amber', dy: -14, a: E.in(ramp(t, 3.4, 3.8)) });
    if (t >= 2.6 && c === 's') { L.push({ id: 'ldr', pos: A.proposer, text: 'LEADER · NOW', cls: 'amber', dy: -10, a: E.in(ramp(t, 2.6, 3.0)) }); L.push({ id: 'nxt', pos: A.next, text: 'NEXT LEADER', dy: -10, a: E.in(ramp(t, 2.8, 3.2)) }); }
  }
  if (ch === 2 || (ch === 3 && lt < 2.6)) {
    const a = E.in(ramp(st.T, S[2] + 0.8, S[2] + 1.3)) * (ch === 3 ? 1 - ramp(lt, 2.0, 2.6) : 1);
    L.push({ id: 'pool', pos: A.tower, text: c === 's' ? 'LEADER QUEUE · TPU' : c === 'e' ? 'MEMPOOL · EVERY NODE HAS ONE' : 'PENDING POOL', dy: -6, a });
    const failed = st.failNonce || st.failFee;
    L.push({ id: 'mine', pos: A.myTile, text: failed ? d.reasonShort : d.fits ? 'YOUR TX · #' + d.pos : 'YOUR TX · #' + d.pos + ' · WAITS', cls: failed || !d.fits ? 'red' : 'amber', dx: 70, dy: 12, a: a * E.in(ramp(st.T, S[2] + 1.3, S[2] + 1.6)) });
    L.push({ id: 'cut', pos: A.cut, text: `NEXT BLOCK FITS ${CAP}`, cls: 'teal', dx: -150, dy: 14, a: a * (ch === 2 ? 1 : 0) });
    if (c === 's' && ch === 2) L.push({ id: 'ldr', pos: A.proposer, text: 'LEADER · NOW', cls: 'amber', dy: -10, a: 1 });
  }
  if (ch === 3) {
    const nm = c === 'e' ? 'PROPOSER · SLOT' : c === 's' ? 'LEADER · 4 SLOTS' : 'BLOCK PRODUCER';
    L.push({ id: 'prop', pos: A.proposer, text: nm, cls: 'amber', dy: -10, a: E.in(ramp(lt, 0.2, 0.6)) * (1 - ramp(lt, 4.2, 4.6)) });
    if (lt >= 3.4) L.push({ id: 'blk', pos: A.newBlock, text: c === 's' ? 'SLOT 371,204,880' : 'BLOCK #23,481,116', cls: 'teal', dy: -8, a: E.in(ramp(lt, 3.4, 3.8)) });
    if (lt >= 5.9) L.push({ id: 'par', pos: A.blocks[3], text: c === 's' ? 'PREV BLOCKHASH 9f2c…' : 'PARENT HASH 0x9f2c…', dy: -8, a: E.in(ramp(lt, 5.9, 6.3)) });
    // state change card
    const a2 = E.in(ramp(lt, 2.2, 2.6)) * (1 - E.out(ramp(lt, 6.4, 6.9)));
    const fee = c === 's' ? (5000 + d.prioLamports) / 1e9 : d.feeEth;
    const unit = c === 's' ? ' SOL' : c === 'e' ? ' ETH' : '';
    const html = d.included
      ? `<div class="k"><span>STATE CHANGE</span><span class="dim">example</span></div><div class="kv"><span class="a">you</span><span class="b amber">−${(1 + fee).toFixed(c === 's' ? 6 : 6)}${unit}</span><span class="a">${c === 's' ? '7xKX…9fQa' : '0x3f5c…a91e'}</span><span class="b green">+1.000000${unit}</span><span class="a">fee</span><span class="b">${fee.toFixed(6)}${unit}</span></div>`
      : `<div class="k"><span>STATE CHANGE</span></div><div class="kv"><span class="a">your tx</span><span class="b red">not in this block</span><span class="a">balance</span><span class="b">unchanged</span></div>`;
    ov('state', html, sw - 330, 250, a2, 300); keep.add('state');
  }
  // ladder (consensus)
  const lad = $('ladder');
  if (ch === 4) {
    const R = { g: [['Included', 'in a block'], ['Confirmed', 'votes + blocks on top'], ['Finalized', 'reverting would burn stake']],
                e: [['Head of chain', 'proposed in a 12 s slot'], ['Justified', 'checkpoint with 2/3 stake'], ['Finalized', '~2 epochs ≈ 12.8 min real time']],
                s: [['processed', '~400 ms slot, can roll back'], ['confirmed', '>2/3 of stake voted'], ['finalized', '≥32 slots after confirmed, ~13 s']] }[c];
    const lv = !d.included ? -1 : lt >= 5.4 ? 2 : lt >= 2.5 ? 1 : 0;
    const key = c + lv + d.included;
    if (cache.get(lad) !== key) { cache.set(lad, key); lad.innerHTML = `<div class="k" style="padding:0 2px 2px">${d.included ? 'YOUR TX STATUS' : 'YOUR TX IS NOT IN THIS BLOCK'}</div>` + R.map((r, i) => `<div class="rung ${i <= lv ? (lv === 2 ? 'fin' : 'on') : ''}"><span class="dot"></span><span class="rt">${r[0]}</span><span class="rs">${r[1]}</span></div>`).join(''); }
    const a = E.in(ramp(lt, 0.3, 0.8)); lad.style.opacity = a; lad.style.transform = `translateX(${(1 - a) * 20}px)`; lad.style.display = '';
    L.push({ id: 'ring', pos: A.ring, text: `STAKE VOTED ${out.c3}`, cls: lt >= 5.4 ? 'green' : 'teal', dx: 70, dy: 18, a: E.in(ramp(lt, 0.6, 1.0)) });
    [0, 1, 2].forEach((j) => { if (lt >= 3.2 + j * 0.8) L.push({ id: 'cf' + j, pos: A.blocks[5 + j], text: '+' + (j + 1), dy: -6, a: E.in(ramp(lt, 3.2 + j * 0.8, 3.6 + j * 0.8)) }); });
    if (lt >= 5.6) L.push({ id: 'fin', pos: A.blocks[2], text: 'FINALIZED', cls: 'green', dy: -6, a: E.in(ramp(lt, 5.6, 6.0)) });
  } else lad.style.display = 'none';
  // explorer
  if (ch === 5) {
    const a = E.in(ramp(lt, 0.2, 0.7));
    const hi = (k) => (d.step === k ? 'background:rgba(255,181,71,.08);' : '');
    const inc = d.included;
    let rows;
    if (c === 's') {
      rows = [['signature', '5VERv8…xQ2u', 'amber', 2], ['slot', inc ? '371,204,880' : '—', ''], ['result', inc ? 'Ok' : st.failNonce ? 'blockhash expired' : st.failFee ? 'rejected' : 'not processed yet', inc ? 'green' : 'red', 0], ['confirmationStatus', inc ? 'finalized' : '—', inc ? 'green' : '', 0],
        ['base fee', inc ? '5,000 lamports' : '—', '', 1], ['priority fee', inc ? d.prioLamports + ' lamports' : '—', '', 1], ['burned / validator', inc ? '2,500 / ' + (2500 + d.prioLamports).toLocaleString('en-US') : '—', '', 1]];
    } else {
      const u = c === 'e' ? ' gwei' : ''; const eu = c === 'e' ? ' ETH' : '';
      rows = [['tx hash', '0x9b3e…c41d', 'amber', 2], ['status', inc ? '1 · Success' : st.failNonce ? 'pending · nonce gap' : st.failFee ? 'pending · underpriced' : 'pending', inc ? 'green' : 'red', 0], ['block', inc ? '23,481,116' : '—', '', 0], ['gasUsed', inc ? '21,000' : '—', '', 1],
        ['effectiveGasPrice', inc ? `${BASE_GWEI} + ${d.tipG.toFixed(2)}${u}` : '—', '', 1], ['fee', inc ? d.feeEth.toFixed(6) + eu : '—', '', 1], ['burned / tip', inc ? `${(21000 * BASE_GWEI * 1e-9).toFixed(6)} / ${(21000 * d.tipG * 1e-9).toFixed(6)}` : '—', '', 1]];
    }
    const copied = now - (st.stamps.copy ?? -99) < 1.6;
    let html = `<div class="k"><span>EXPLORER · ${c === 's' ? 'SIGNATURE' : 'TRANSACTION'}</span><span class="dim">example</span></div><div class="kv" style="grid-template-columns:150px 1fr">`;
    rows.forEach((r, i) => { const ra = E.in(ramp(lt, 0.4 + i * 0.12, 0.8 + i * 0.12)); html += `<span class="a" style="opacity:${ra};${hi(r[3])}padding:2px 4px;border-radius:4px">${r[0]}</span><span class="b ${r[2]}" style="opacity:${ra};${hi(r[3])}padding:2px 4px;border-radius:4px">${r[1]}</span>`; });
    html += `</div><div class="row" style="margin-top:12px;gap:8px"><button class="xbtn" id="copyBtn" style="font-family:GMono;font-size:11px;letter-spacing:.12em;padding:7px 10px;border:1px solid #263240;border-radius:7px;color:${copied ? '#5ee08f' : '#c3ccd5'};pointer-events:auto">${copied ? 'COPIED' : 'COPY HASH'}</button><span style="font-size:12px;color:#586674">same answer from any node</span></div>`;
    const el = ov('explorer', html, sw - 470, 210, a, 440, html); keep.add('explorer');
    if (!el._wired) { el._wired = true; }
    L.push({ id: 'yb', pos: A.newBlock, text: inc ? 'YOUR BLOCK' : 'NOT INCLUDED', cls: inc ? 'green' : 'red', dy: -8, a: E.in(ramp(lt, 0.4, 0.8)) });
  }
  hideOv(keep);
  labels(L, stage);
  // toast
  const toast = $('toast'); const endK = st.endK || 0; const cop = now - (st.stamps.copy ?? -99);
  if (endK > 0) { setT(toast, 'Episode 01 done · open the lab and drag the fee yourself'); toast.style.opacity = endK; toast.style.transform = `translateX(-50%) translateY(${(1 - endK) * 10}px)`; toast.style.borderColor = 'rgba(255,181,71,.45)'; }
  else if (cop >= 0 && cop < 1.6) { setT(toast, 'Hash copied, paste it into any explorer'); const k = E.in(ramp(cop, 0, 0.25)) * (1 - ramp(cop, 1.3, 1.6)); toast.style.opacity = k; toast.style.transform = `translateX(-50%) translateY(${(1 - k) * 10}px)`; toast.style.borderColor = ''; }
  else toast.style.opacity = 0;
}
const GOS = 3.0;
