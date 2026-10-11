import { STARTS } from './content.js';
import { OTHERS, CAP, clamp, ramp } from './sim.js';
const S = STARTS;
export function pool(t) { const saw = ((t / 4) % 1 + 1) % 1; return Math.round(17 + 4 * Math.sin(t * 0.7) + 2.5 * Math.sin(t * 1.9 + 1) + 9 * saw); }
export function createCharts(els, dpr) {
  const ctxs = els.map((cv) => { const r = cv.getBoundingClientRect(); cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); const c = cv.getContext('2d'); c.scale(dpr, dpr); return { c, w: cv.clientWidth, h: cv.clientHeight }; });
  const grid = ({ c, w, h }, top = 34) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#131b24'; c.lineWidth = 1; for (let x = 12; x < w; x += 24) { c.beginPath(); c.moveTo(x + 0.5, top); c.lineTo(x + 0.5, h - 10); c.stroke(); } for (let y = top; y < h - 8; y += 18) { c.beginPath(); c.moveTo(12, y + 0.5); c.lineTo(w - 12, y + 0.5); c.stroke(); } };
  function draw(st, d, out) {
    const T = st.T;
    // 1: pending pool scope
    { const g = ctxs[0]; grid(g); const { c, w, h } = g; const x0 = 14, x1 = w - 14, y0 = 40, y1 = h - 14; const win = 14;
      const X = (t) => x0 + (t - (T - win)) / win * (x1 - x0); const Y = (v) => y1 - (v - 8) / 30 * (y1 - y0);
      c.beginPath(); for (let i = 0; i <= 220; i++) { const t = T - win + win * i / 220; const v = pool(t); i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v)); }
      c.strokeStyle = '#45d4c3'; c.lineWidth = 1.6; c.stroke(); c.lineTo(x1, y1); c.lineTo(x0, y1); c.closePath(); c.fillStyle = 'rgba(69,212,195,.07)'; c.fill();
      // my tx in pool window
      const tin = S[2] + 0.4, tout = S[3] + 2.0 + (d.pos - 1) * 0.09;
      if (T > tin) { const a = Math.max(tin, T - win), b = d.included ? Math.min(T, tout) : T; if (b > a) { c.fillStyle = d.included || T < S[3] ? 'rgba(255,181,71,.16)' : 'rgba(255,107,107,.16)'; c.fillRect(X(a), y0 - 4, X(b) - X(a), y1 - y0 + 4); c.fillStyle = d.included || T < S[3] ? '#ffb547' : '#ff6b6b'; c.font = '10px GMono'; if (X(b) - X(a) > 40) c.fillText('YOUR TX', X(a) + 6, y0 + 8); } }
      c.fillStyle = '#ffb547'; c.beginPath(); c.arc(x1, Y(pool(T)), 3, 0, 7); c.fill();
      out.c1 = String(pool(T)); }
    // 2: fee bids bars
    { const g = ctxs[1]; grid(g); const { c, w, h } = g; const x0 = 14, x1 = w - 14, y0 = 40, y1 = h - 16;
      const all = OTHERS.map((o) => ({ o, me: false })).concat([{ o: st.fee, me: true }]).sort((a, b) => b.o - a.o || (a.me ? -1 : 1));
      const bw = (x1 - x0) / 25; const failed = st.failNonce || st.failFee;
      all.forEach((x, i) => { const bh = Math.max(2, x.o / 100 * (y1 - y0)); c.fillStyle = x.me ? (failed ? '#ff6b6b' : '#ffb547') : i < CAP ? '#2f6f69' : '#273342'; c.fillRect(x0 + i * bw + 1.5, y1 - bh, bw - 3, bh); });
      const cx = x0 + CAP * bw; c.strokeStyle = '#45d4c3'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cx + 0.5, y0 - 4); c.lineTo(cx + 0.5, y1 + 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#45d4c3'; c.font = '10px GMono'; c.fillText('NEXT BLOCK', x0 + 2, y1 + 12); c.fillStyle = '#586674'; c.fillText('LATER', cx + 6, y1 + 12);
      out.c2 = failed ? (st.failNonce ? d.reasonShort : d.reasonShort) : '#' + d.pos; }
    // 3: stake voted
    { const g = ctxs[2]; grid(g); const { c, w, h } = g; const x0 = 14, x1 = w - 14, y0 = 40, y1 = h - 16; const t0 = S[4], t1 = S[5];
      const X = (t) => x0 + (t - t0) / (t1 - t0) * (x1 - x0); const Y = (v) => y1 - v * (y1 - y0);
      c.strokeStyle = '#e8eef4'; c.globalAlpha = 0.5; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x0, Y(2 / 3) + 0.5); c.lineTo(x1, Y(2 / 3) + 0.5); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      c.fillStyle = '#8796a5'; c.font = '10px GMono'; c.fillText('2/3 STAKE', x1 - 62, Y(2 / 3) - 5);
      if (T >= t0) { const te = Math.min(T, t1); c.beginPath(); for (let i = 0; i <= 120; i++) { const t = t0 + (te - t0) * i / 120; const v = voteFrac(t); i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v)); }
        const fin = T >= S[4] + 5.4; c.strokeStyle = fin ? '#5ee08f' : '#45d4c3'; c.lineWidth = 1.8; c.stroke();
        c.fillStyle = fin ? '#5ee08f' : '#45d4c3'; c.beginPath(); c.arc(X(te), Y(voteFrac(te)), 3, 0, 7); c.fill();
        [3.0, 3.8, 4.6].forEach((o, i) => { if (T >= t0 + o) { c.fillStyle = '#8796a5'; c.fillRect(X(t0 + o) - 0.5, y1 - 8, 1.5, 8); c.fillText('+' + (i + 1), X(t0 + o) - 6, y1 - 12); } });
        if (fin) { c.fillStyle = '#5ee08f'; c.fillText('FINALIZED', X(t0 + 5.4) + 4, y0 + 2); c.fillRect(X(t0 + 5.4), y0 - 4, 1.5, y1 - y0 + 4); } }
      else { c.fillStyle = '#586674'; c.font = '11px GMono'; c.fillText('WAITING FOR A BLOCK', x0 + 4, (y0 + y1) / 2 + 4); }
      out.c3 = T >= t0 ? Math.round(voteFrac(Math.min(T, t1)) * 100) + '%' : '—'; }
  }
  return { draw };
}
export function voteFrac(t) { const lt = t - S[4]; if (lt <= 0.3) return 0; const a = clamp((lt - 0.3) / 2.9); const e = a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2; return 0.92 * e; }
