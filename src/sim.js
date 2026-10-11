import { CHAPTERS, STARTS, chapterAt, stepAt } from './content.js';
export const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ramp = (x, a, b) => clamp((x - a) / (b - a));
// easings (motion.ts equivalents)
const bez = (x1, y1, x2, y2) => (t) => { // cubic-bezier solve
  if (t <= 0) return 0; if (t >= 1) return 1; let u = t;
  for (let i = 0; i < 8; i++) { const cx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - t; const d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u; if (Math.abs(d) < 1e-6) break; u = clamp(u - cx / d); }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3; };
export const E = { in: bez(0.16, 1, 0.3, 1), out: bez(0.6, 0, 0.9, 0.35), io: bez(0.65, 0, 0.35, 1), land: bez(0.55, 0, 0.2, 1.12) };

export const CAP = 10; // example block capacity (txs) in this sim
const r = rng(42);
export const OTHERS = Array.from({ length: 24 }, () => Math.round(clamp(Math.pow(r(), 1.9) * 100, 1, 99)));
export const BASE_GWEI = 12, MAXFEE_GWEI = 30;

export function derive(st) {
  const c = st.chain;
  const ch = chapterAt(st.T), lt = st.T - STARTS[ch], step = stepAt(ch, lt);
  const pos = 1 + OTHERS.filter((o) => o > st.fee).length;
  const tipG = st.fee / 20; // 0..5 gwei
  const cuPrice = Math.round(st.fee * 1000); // micro-lamports per CU
  const fits = pos <= CAP;
  const included = !st.failNonce && !st.failFee && fits;
  let reason = '', reasonShort = '';
  if (st.failNonce) {
    reason = c === 's' ? 'Recent blockhash is older than 151 blocks. Dropped, never processed, safe to re-sign.' : c === 'e' ? 'Sent nonce 10, account expects 9. Held in the queue until the gap is filled.' : 'Counter skips a number. Held until the missing one arrives.';
    reasonShort = c === 's' ? 'EXPIRED' : 'NONCE GAP';
  } else if (st.failFee) {
    reason = c === 's' ? 'Fee payer can\'t cover the 5,000 lamport base fee. Rejected before processing.' : c === 'e' ? `maxFeePerGas 9 gwei is below the ${BASE_GWEI} gwei base fee. Not eligible for inclusion.` : 'Offered fee is under the minimum. Not eligible for inclusion.';
    reasonShort = c === 's' ? 'NO FEE' : 'UNDERPRICED';
  } else if (!fits) {
    reason = `Position ${pos}, this block fits ${CAP} (example). Waits for a later block.`; reasonShort = 'WAITING';
  } else reason = `Position ${pos} of 25, inside the next block.`;
  const feeText = c === 's' ? `${cuPrice.toLocaleString('en-US')} µL/CU` : c === 'e' ? `${tipG.toFixed(2)} gwei` : `${tipG.toFixed(2)}`;
  const feeLabel = c === 's' ? 'Compute unit price' : 'Priority fee (tip)';
  // receipt numbers (example)
  const effGwei = BASE_GWEI + tipG; const feeEth = 21000 * effGwei * 1e-9;
  const prioLamports = Math.ceil(cuPrice * 1000 / 1e6); // CU limit 1,000 (example)
  return { ch, lt, step, pos, tipG, cuPrice, fits, included, reason, reasonShort, feeText, feeLabel, effGwei, feeEth, prioLamports, chapter: CHAPTERS[ch] };
}
