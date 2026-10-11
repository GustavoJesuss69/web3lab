// Guided walkthrough for the video: everything is a pure function of video time v.
import { STARTS } from './content.js';
import { E, ramp, clamp, lerp, OTHERS } from './sim.js';
const S = STARTS;
export const FPS = 30;
export const VKEYS = [[0, 0], [1.4, 0], [8.4, 7], [14.4, 13], [17.5, 16.1], [21.4, 16.1], [24.2, 18.6], [26.9, 18.6], [29.6, 21], [36.6, 28], [43.4, 34.8], [47.2, 34.8], [48.4, 36], [55.4, 43], [58, 43]];
export const DURATION = 58;
export const vToT = (v) => { for (let i = 1; i < VKEYS.length; i++) { const [v0, t0] = VKEYS[i - 1], [v1, t1] = VKEYS[i]; if (v <= v1) return lerp(t0, t1, clamp((v - v0) / (v1 - v0))); } return VKEYS[VKEYS.length - 1][1]; };
export const tToV = (T) => { for (let i = 1; i < VKEYS.length; i++) { const [v0, t0] = VKEYS[i - 1], [v1, t1] = VKEYS[i]; if (t1 > t0 && T >= t0 && T <= t1) return v0 + (T - t0) / (t1 - t0) * (v1 - v0); } return null; };
const FEE = [[0, 42], [17.5, 42], [18.7, 5], [19.5, 5], [20.7, 88]];
const feeAt = (v) => { for (let i = 1; i < FEE.length; i++) { const [a, fa] = FEE[i - 1], [b, fb] = FEE[i]; if (v <= b) return lerp(fa, fb, E.io(clamp((v - a) / (b - a)))); } return 88; };
const CHAIN = [[-99, 'g'], [37.7, 'e'], [43.9, 's'], [47.0, 'e']];
const NONCE = [[24.3, true], [25.9, false]];
// clicks: [time, selector]
export const CLICKS = [[1.3, '#bPlay'], [8.35, '#nav-1'], [14.35, '#nav-2'], [24.3, '#togNonce'], [25.9, '#togNonce'], [29.55, '#nav-3'], [36.55, '#nav-4'], [37.7, '#chain-e'], [43.9, '#chain-s'], [47.0, '#chain-e'], [48.35, '#nav-5'], [53.3, '#copyBtn']];
const DRAG_STAGE = [10.3, 11.7]; const DRAG_FEE = [17.5, 20.7];
const center = (sel) => { const e = document.querySelector(sel); if (!e) return { x: 960, y: 540 }; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const thumb = (fee) => { const r = document.getElementById('feeSlider').getBoundingClientRect(); return { x: r.left + r.width * fee / 100, y: r.top + r.height / 2 }; };
const stageP = () => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left + r.width * 0.62, y: r.top + r.height * 0.7 }; };
// cursor keyframes: [arriveTime, posFn]; moves start after previous hold
function cursorKeys() {
  const k = [[0, () => ({ x: 1380, y: 760 })], [1.15, () => center('#bPlay')], [2.4, () => center('#bPlay')], [3.6, () => center('#step-1')], [7.4, () => center('#step-2')], [8.2, () => center('#nav-1')], [8.9, () => center('#nav-1')],
    [10.2, stageP], [10.3, stageP], [11.7, () => { const p = stageP(); return { x: p.x - 230, y: p.y - 30 }; }], [12.4, () => { const p = stageP(); return { x: p.x - 230, y: p.y - 30 }; }],
    [14.2, () => center('#nav-2')], [15.0, () => center('#nav-2')], [17.3, () => thumb(42)], [17.5, () => thumb(42)], [20.7, () => thumb(88)], [21.4, () => thumb(88)],
    [24.1, () => center('#togNonce')], [26.2, () => center('#togNonce')], [29.4, () => center('#nav-3')], [30.0, () => center('#nav-3')], [32.5, () => center('#step-1')], [35.0, () => center('#step-2')],
    [36.4, () => center('#nav-4')], [36.9, () => center('#nav-4')], [37.55, () => center('#chain-e')], [43.0, () => center('#chain-e')], [43.75, () => center('#chain-s')], [46.3, () => center('#chain-s')], [46.85, () => center('#chain-e')], [47.4, () => center('#chain-e')],
    [48.2, () => center('#nav-5')], [49.2, () => center('#nav-5')], [51.2, () => center('#step-2')], [53.15, () => center('#copyBtn')], [54.6, () => center('#copyBtn')], [55.6, () => ({ x: 1700, y: 700 })], [58, () => ({ x: 1700, y: 700 })]];
  return k;
}
let KEYS = null;
function cursorAt(v) {
  KEYS ||= cursorKeys();
  if (v >= DRAG_FEE[0] && v <= DRAG_FEE[1]) return thumb(feeAt(v));
  for (let i = 1; i < KEYS.length; i++) { const [t0, f0] = KEYS[i - 1], [t1, f1] = KEYS[i]; if (v <= t1) { const a = f0(), b = f1(); const u = E.io(clamp((v - t0) / (t1 - t0))); const bow = Math.sin(Math.PI * u) * Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.08); return { x: lerp(a.x, b.x, u) + bow * 0.3, y: lerp(a.y, b.y, u) - bow }; } }
  return KEYS[KEYS.length - 1][1]();
}
export function scriptState(v) {
  const T = vToT(v);
  let chain = 'g', chainStamp = -99; for (const [t, c] of CHAIN) if (v >= t) { chain = c; chainStamp = t; }
  let failNonce = false, nonceStamp = -99; for (const [t, x] of NONCE) if (v >= t) { failNonce = x; nonceStamp = t; }
  const kN = failNonce ? E.io(ramp(v - nonceStamp, 0, 0.5)) : 1 - E.io(ramp(v - nonceStamp, 0, 0.5));
  // stage orbit drag
  const camAz = v < DRAG_STAGE[0] ? 0 : v < DRAG_STAGE[1] ? 26 * E.io(ramp(v, DRAG_STAGE[0], DRAG_STAGE[1])) : 26 * (1 - E.io(ramp(v, 14.4, 15.9)));
  const camEl = v < DRAG_STAGE[0] ? 0 : v < DRAG_STAGE[1] ? 6 * E.io(ramp(v, DRAG_STAGE[0], DRAG_STAGE[1])) : 6 * (1 - E.io(ramp(v, 14.4, 15.9)));
  let press = null; let lastClick = null;
  for (const [t, sel] of CLICKS) { if (v >= t && v < t + 0.16) press = sel; if (v >= t) lastClick = [t, sel]; }
  const down = CLICKS.some(([t]) => v >= t - 0.05 && v < t + 0.1) || (v >= DRAG_FEE[0] && v <= DRAG_FEE[1]) || (v >= DRAG_STAGE[0] && v <= DRAG_STAGE[1]);
  const copyStamp = v >= 53.3 ? 53.3 : -99;
  return {
    T, playing: v >= 1.3 && v < 55.4 && !(v > 17.5 && v < 21.4) && !(v > 24.2 && v < 26.9) && !(v > 43.4 && v < 47.2), chain, fee: feeAt(v), failNonce, failFee: false, failNonceK: kN, failFeeK: 0,
    camAz, camEl, camZoom: 1, now: v, idle: v, stamps: { chain: chainStamp, copy: copyStamp }, press, endK: E.in(ramp(v, 55.5, 56.2)),
    cursor: { ...cursorAt(v), down, click: lastClick && v - lastClick[0] < 0.45 ? v - lastClick[0] : -1 },
  };
}
export function cues() {
  const c = [];
  CLICKS.forEach(([t, sel]) => c.push({ t, type: 'click', x: center(sel).x }));
  [8.35, 14.35, 29.55, 36.55, 48.35].forEach((t) => c.push({ t: t + 0.05, type: 'whoosh' }));
  // fee drag ticks when rank changes
  let prev = null; for (let v = DRAG_FEE[0]; v <= DRAG_FEE[1]; v += 1 / 60) { const f = feeAt(v); const r = OTHERS.filter((o) => o > f).length; if (prev !== null && r !== prev) c.push({ t: v, type: 'tick', x: thumb(f).x }); prev = r; }
  c.push({ t: 24.3 + 0.05, type: 'error' });
  const tv = (T) => tToV(T);
  c.push({ t: tv(S[1] + 0.1), type: 'send' });
  c.push({ t: tv(S[3] + 3.3), type: 'thump' }); c.push({ t: tv(S[3] + 5.8), type: 'lock' });
  [3.0, 3.8, 4.6].forEach((o) => c.push({ t: tv(S[4] + o), type: 'blip' }));
  c.push({ t: tv(S[4] + 5.4), type: 'final' });
  c.push({ t: 53.3, type: 'pop' }); c.push({ t: 55.5, type: 'end' });
  return c.sort((a, b) => a.t - b.t);
}
