import { CHAPTERS, STARTS, TOTAL } from './content.js';
import { derive, clamp, E, ramp } from './sim.js';
import { createStage } from './stage.js';
import { createCharts } from './charts.js';
import { buildUI, renderUI } from './ui.js';
import { scriptState, cues, FPS, DURATION } from './script.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const root = document.getElementById('root');
let scale = 1;
function fit() { scale = RENDER ? 1 : Math.min(innerWidth / 1920, innerHeight / 1080); root.style.transform = `translate(-50%, -50%) scale(${scale})`; }
fit(); addEventListener('resize', () => { fit(); resize(); });

buildUI();
const stageEl = document.getElementById('stage');
const stage = createStage(document.getElementById('gl'), { render: RENDER });
const dpr = RENDER ? 1 : Math.min(2, devicePixelRatio * scale);
function resize() { stage.renderer.setPixelRatio(RENDER ? 1 : Math.min(2, devicePixelRatio * scale)); stage.sizeTo(stageEl.clientWidth, stageEl.clientHeight); }
resize();
const charts = createCharts(['c1', 'c2', 'c3'].map((id) => document.getElementById(id)), RENDER ? 1 : Math.max(1, Math.min(2, devicePixelRatio * scale)));

const st = { T: 0, playing: false, chain: 'g', fee: 42, failNonce: false, failFee: false, failNonceK: 0, failFeeK: 0, camAz: 0, camEl: 0, camZoom: 1, now: 0, idle: 0, stamps: { chain: -99, nonce: -99, fee: -99, copy: -99 }, press: null };
function frame(s) {
  const d = derive(s); const out = {};
  stage.update(s, d); stage.render();
  charts.draw(s, d, out);
  renderUI(s, d, stage, out);
  if (RENDER) drawCursor(s);
}
function drawCursor(s) {
  {
    const cur = document.getElementById('cursor'); cur.style.display = 'block'; cur.style.transform = `translate(${s.cursor.x - 5}px, ${s.cursor.y - 3}px) scale(${s.cursor.down ? 0.9 : 1})`;
    const rp = document.getElementById('ripple'); const k = s.cursor.click;
    if (k >= 0) { const a = E.in(ramp(k, 0, 0.45)); rp.style.opacity = (1 - a) * 0.9; rp.style.left = s.cursor.x + 'px'; rp.style.top = s.cursor.y + 'px'; rp.style.transform = `scale(${0.4 + a * 1.1})`; } else rp.style.opacity = 0;
  }
}

if (RENDER) {
  window.renderAt = (f) => { const s = scriptState(f / FPS); frame(s); const s2 = scriptState(f / FPS); s.cursor = s2.cursor; drawCursor(s); return s.T; };
  window.getCues = () => cues();
  window.DURATION = DURATION;
  window.ready = document.fonts.ready.then(() => { resize(); frame(scriptState(0)); return true; });
} else {
  // ---------- interactive ----------
  const boundaries = CHAPTERS.flatMap((c, i) => c.steps.map((s) => STARTS[i] + s.at)).concat([TOTAL]);
  const now = () => performance.now() / 1000;
  const setT = (T) => { st.T = clamp(T, 0, TOTAL); };
  let lastCh = 0;
  document.getElementById('bPlay').onclick = () => { if (st.T >= TOTAL - 0.01) st.T = 0; st.playing = !st.playing; };
  document.getElementById('bNext').onclick = () => { const b = boundaries.find((x) => x > st.T + 0.05); setT(b ?? TOTAL); };
  document.getElementById('bPrev').onclick = () => { const b = boundaries.filter((x) => x < st.T - 0.4).pop(); setT(b ?? 0); };
  document.querySelectorAll('.navitem').forEach((el) => (el.onclick = () => { setT(STARTS[+el.dataset.ch] + 0.001); st.playing = true; }));
  document.querySelectorAll('#chainSeg button').forEach((el) => (el.onclick = () => { if (st.chain !== el.dataset.chain) { st.chain = el.dataset.chain; st.stamps.chain = now(); } }));
  document.getElementById('togNonce').onclick = () => { st.failNonce = !st.failNonce; st.stamps.nonce = now(); };
  document.getElementById('togFee').onclick = () => { st.failFee = !st.failFee; st.stamps.fee = now(); };
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('#copyBtn')) { navigator.clipboard?.writeText('0x9b3e…c41d (example hash)').catch(() => {}); st.stamps.copy = now(); } });
  const drag = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); fn(e, true); const mv = (ev) => fn(ev, false); const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); });
  drag(document.getElementById('feeSlider'), (e) => { const r = e.currentTarget.getBoundingClientRect?.() || document.getElementById('feeSlider').getBoundingClientRect(); st.fee = Math.round(clamp((e.clientX - r.left) / r.width) * 100); });
  drag(document.getElementById('scrub'), (e) => { const r = document.getElementById('scrub').getBoundingClientRect(); setT(clamp((e.clientX - r.left) / r.width) * TOTAL); });
  let last = null; const gl = document.getElementById('gl');
  drag(gl, (e, first) => { if (first) { last = [e.clientX, e.clientY]; gl.style.cursor = 'grabbing'; return; } st.camAz -= (e.clientX - last[0]) * 0.25 / scale; st.camEl += (e.clientY - last[1]) * 0.15 / scale; st.camEl = clamp(st.camEl, -18, 40); last = [e.clientX, e.clientY]; st.userCam = now(); });
  gl.addEventListener('pointerup', () => (gl.style.cursor = 'grab'));
  gl.addEventListener('wheel', (e) => { e.preventDefault(); st.camZoom = clamp(st.camZoom * (1 + e.deltaY * 0.001), 0.6, 1.6); }, { passive: false });
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); document.getElementById('bPlay').click(); } if (e.code === 'ArrowRight') document.getElementById('bNext').click(); if (e.code === 'ArrowLeft') document.getElementById('bPrev').click(); });
  let prevT = now();
  const loop = () => {
    const t = now(); const dt = Math.min(0.1, t - prevT); prevT = t;
    if (st.playing) { st.T += dt; if (st.T >= TOTAL) { st.T = TOTAL; st.playing = false; } }
    st.now = t; st.idle = t;
    st.failNonceK = st.failNonce ? E.io(ramp(t - st.stamps.nonce, 0, 0.5)) : 1 - E.io(ramp(t - st.stamps.nonce, 0, 0.5));
    st.failFeeK = st.failFee ? E.io(ramp(t - st.stamps.fee, 0, 0.5)) : 1 - E.io(ramp(t - st.stamps.fee, 0, 0.5));
    const d = derive(st); if (d.ch !== lastCh) { lastCh = d.ch; st.camReturn = t; }
    if (st.camReturn && t - st.camReturn < 1.5) { st.camAz *= 0.93; st.camEl *= 0.93; st.camZoom += (1 - st.camZoom) * 0.07; }
    frame(st); requestAnimationFrame(loop);
  };
  document.fonts.ready.then(() => { resize(); requestAnimationFrame(loop); });
}
