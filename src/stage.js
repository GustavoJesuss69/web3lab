import * as THREE from 'three';
import { STARTS } from './content.js';
import { clamp, lerp, ramp, E, OTHERS, CAP, rng } from './sim.js';
import { voteFrac } from './charts.js';

const COL = { ground: '#0b1016', grid: '#141c26', body: '#1b2530', body2: '#222e3b', top: '#2a3746', edge: '#33414f', link: '#1c2631',
  amber: '#ffb547', teal: '#45d4c3', green: '#5ee08f', red: '#ff6b6b', other: '#5d6e80', fin: '#1e3a2c' };
const S = STARTS;
export const NODES = [
  { id: 'wallet', kind: 'wallet', p: [-7.2, 0, 3.0] },
  { id: 'rpc', kind: 'rpc', p: [-4.0, 0, 1.4] },
  { id: 'p0', kind: 'peer', p: [-1.6, 0, 3.8] },
  { id: 'p1', kind: 'val', p: [-0.9, 0, -0.6] },
  { id: 'p2', kind: 'peer', p: [1.0, 0, 2.6] },
  { id: 'p3', kind: 'val', p: [2.4, 0, 0.1] },
  { id: 'p4', kind: 'val', p: [0.4, 0, -2.6] },
  { id: 'p5', kind: 'val', p: [4.6, 0, 2.7] },
  { id: 'p6', kind: 'peer', p: [5.0, 0, -1.2] },
  { id: 'p7', kind: 'val', p: [-3.4, 0, -2.2] },
  { id: 'p8', kind: 'val', p: [7.0, 0, 0.9] },
];
const N = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
const EDGES = [['rpc', 'p0'], ['rpc', 'p1'], ['rpc', 'p7'], ['p0', 'p2'], ['p1', 'p2'], ['p1', 'p4'], ['p1', 'p7'], ['p2', 'p3'], ['p3', 'p4'], ['p3', 'p5'], ['p3', 'p6'], ['p5', 'p6'], ['p6', 'p8'], ['p5', 'p8'], ['p4', 'p6'], ['p0', 'p1'], ['p2', 'p5']].map(([a, b]) => [N[a], N[b]]);
const VALS = NODES.map((n, i) => (n.kind === 'val' ? i : -1)).filter((i) => i >= 0);
export const PROPOSER = N.p3, NEXTLEADER = N.p5;
const V = (a) => new THREE.Vector3(...a);
const blockX = (i) => -6 + i * 2.0; const CHAIN_Z = -5.8;
export const blockPos = (i) => new THREE.Vector3(blockX(i), 0.45, CHAIN_Z);
export const towerBase = (chain) => (chain === 's' ? new THREE.Vector3(3.5, 0, -1.7) : new THREE.Vector3(-2.1, 0, 1.3));
const TILE_H = 0.1;

// BFS gossip tree from rpc
const adj = NODES.map(() => []); EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
const depth = NODES.map(() => -1); const parent = NODES.map(() => -1); depth[N.rpc] = 0; { const q = [N.rpc]; while (q.length) { const u = q.shift(); for (const v of adj[u]) if (depth[v] < 0 && v !== N.wallet) { depth[v] = depth[u] + 1; parent[v] = u; q.push(v); } } }
export const GOSSIP = NODES.map((n, i) => (parent[i] >= 0 ? { from: parent[i], to: i, d: depth[parent[i]] } : null)).filter(Boolean);
export const GOSSIP_T0 = 3.0, HOP = 0.55;

export function createStage(canvas, opts) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.render, powerPreference: 'high-performance' });
  renderer.setPixelRatio(opts.render ? 1 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0a0e13'); scene.fog = new THREE.Fog('#0a0e13', 22, 48);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight('#b8c8d8', '#0a0e13', 1.25));
  const sun = new THREE.DirectionalLight('#ffffff', 1.5); sun.position.set(6, 12, 8); scene.add(sun);
  const mats = {};
  const lam = (c) => (mats['l' + c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const basic = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1 });
  const edgeMat = new THREE.LineBasicMaterial({ color: COL.edge, transparent: true, opacity: 0.9 });
  const outline = (mesh, mat = edgeMat) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), mat); mesh.add(l); return l; };

  // ground + grid
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), lam(COL.ground)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  { const pts = []; for (let i = -24; i <= 24; i++) { pts.push(i, 0.002, -24, i, 0.002, 24, -24, 0.002, i, 24, 0.002, i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: COL.grid }))); }

  // nodes
  const nodeObjs = NODES.map((n) => {
    const g = new THREE.Group(); g.position.set(...n.p); scene.add(g);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.12, 6), lam('#121a22')); plinth.position.y = 0.06; g.add(plinth); outline(plinth);
    let body;
    if (n.kind === 'wallet') {
      body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.36, 0.12), lam(COL.body2)); body.position.y = 0.86; body.rotation.y = 0.35; body.rotation.x = -0.12; g.add(body); outline(body);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.12), basic('#101820')); scr.position.z = 0.062; body.add(scr);
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), basic(COL.amber)); key.position.set(0, -0.32, 0.066); body.add(key);
      g.userData.key = key;
    } else if (n.kind === 'rpc') {
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), lam(k === 2 ? COL.top : COL.body)); b.position.y = 0.3 + k * 0.33; g.add(b); outline(b);
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.01), basic(COL.teal)); led.position.set(0.24, 0, 0.405); b.add(led); }
      body = g.children[g.children.length - 1];
    } else if (n.kind === 'val') {
      body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.66, 6), lam(COL.body2)); body.position.y = 0.45; g.add(body); outline(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 6), lam(COL.top)); cap.position.y = 0.8; g.add(cap); outline(cap);
    } else {
      body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), lam(COL.body)); body.position.y = 0.37; g.add(body); outline(body);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 48), basic(COL.amber, 0.9)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; ring.visible = false; g.add(ring);
    const has = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), lam(COL.amber)); has.position.y = n.kind === 'val' ? 1.02 : n.kind === 'rpc' ? 1.32 : 0.82; has.visible = false; g.add(has);
    return { g, ring, has, body };
  });
  // links
  const linkObjs = EDGES.map(([a, b]) => {
    const pa = V(NODES[a].p), pb = V(NODES[b].p); pa.y = pb.y = 0.03;
    const m = new THREE.LineBasicMaterial({ color: COL.link, transparent: true, opacity: 1 });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), m); scene.add(l); return { l, m, a, b };
  });
  const walletLink = (() => { const pa = V(NODES[N.wallet].p), pb = V(NODES[N.rpc].p); pa.y = pb.y = 0.03;
    const m = new THREE.LineDashedMaterial({ color: '#3a4858', dashSize: 0.18, gapSize: 0.14 }); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), m); l.computeLineDistances(); scene.add(l); return { l, m }; })();
  // solana direct beams
  const beams = [PROPOSER, NEXTLEADER].map((to) => { const pa = V(NODES[N.rpc].p), pb = V(NODES[to].p); pa.y = 0.9; pb.y = 0.9;
    const m = new THREE.LineDashedMaterial({ color: COL.amber, dashSize: 0.2, gapSize: 0.16, transparent: true, opacity: 0 }); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), m); l.computeLineDistances(); scene.add(l); return { l, m, to }; });

  // packets
  const pk = (c, s = 0.17) => { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), lam(c)); outline(m, new THREE.LineBasicMaterial({ color: '#0a0e13', transparent: true, opacity: 0.6 })); m.visible = false; scene.add(m); return m; };
  const mine = pk(COL.amber, 0.26);
  const clones = GOSSIP.map(() => pk(COL.amber, 0.16));
  const solPk = [pk(COL.amber, 0.18), pk(COL.amber, 0.18)];
  const ambient = Array.from({ length: 12 }, () => pk(COL.other, 0.13));
  const voteGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const votes = Array.from({ length: VALS.length * 2 }, () => { const m = new THREE.Mesh(voteGeo, lam(COL.teal)); m.visible = false; scene.add(m); return m; });

  // mempool tiles (index 24 = mine)
  const tileGeo = new THREE.BoxGeometry(0.82, 0.055, 0.5);
  const tileMats = { other: lam('#2c3a4a'), fit: lam('#2f6f69'), mine: lam(COL.amber), red: lam(COL.red) };
  const tiles = Array.from({ length: 25 }, (_, i) => { const m = new THREE.Mesh(tileGeo, i === 24 ? tileMats.mine : tileMats.other); outline(m, new THREE.LineBasicMaterial({ color: '#0a0e13', transparent: true, opacity: 0.7 })); m.visible = false; scene.add(m); return m; });
  const cut = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.01, 0.78), basic(COL.teal, 0.12)); cut.visible = false; scene.add(cut); outline(cut, new THREE.LineBasicMaterial({ color: COL.teal }));
  const lanePad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.66), lam('#2a1719')); lanePad.visible = false; scene.add(lanePad);
  const towerPad = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.74), lam('#141c25')); towerPad.visible = false; scene.add(towerPad); outline(towerPad);

  // blocks
  const blockGeo = new THREE.BoxGeometry(1.3, 0.8, 1.0);
  const blocks = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(blockGeo, new THREE.MeshLambertMaterial({ color: COL.body2, flatShading: true }));
    const em = new THREE.LineBasicMaterial({ color: COL.edge, transparent: true }); outline(m, em); m.userData.em = em;
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 0.01), basic('#33465a')); s.position.set(0, 0.22 - k * 0.14, 0.505); m.add(s); }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 0.012), basic(COL.amber)); stripe.position.set(0, -0.2, 0.506); stripe.visible = false; m.add(stripe); m.userData.stripe = stripe;
    m.position.copy(blockPos(i)); m.visible = i < 4; scene.add(m); return m; });
  const chainLinks = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), lam('#3a4a5a')); m.position.set(blockX(i) + 1.0, 0.45, CHAIN_Z); m.visible = i < 3; scene.add(m); return m; });
  const voteRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 96, 1, Math.PI / 2, Math.PI * 2), basic(COL.teal, 0.95)); voteRing.material.side = THREE.DoubleSide; voteRing.renderOrder = 2; voteRing.rotation.x = -Math.PI / 2; voteRing.position.set(blockX(4), 0.02, CHAIN_Z); voteRing.visible = false; scene.add(voteRing);
  const voteRingBg = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 96), basic('#1c2631')); voteRingBg.rotation.x = -Math.PI / 2; voteRingBg.position.set(blockX(4), 0.015, CHAIN_Z); voteRingBg.visible = false; scene.add(voteRingBg);
  const thirds = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.28), basic('#e8eef4')); thirds.visible = false; scene.add(thirds);

  // ------- helpers -------
  const arc = (a, b, t, h) => new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t) + Math.sin(Math.PI * t) * h, lerp(a.z, b.z, t));
  const nodeTop = (i) => { const n = NODES[i]; const y = n.kind === 'wallet' ? 1.75 : n.kind === 'rpc' ? 1.32 : n.kind === 'val' ? 1.05 : 0.82; return new THREE.Vector3(n.p[0], y, n.p[2]); };
  const col = new THREE.Color();
  let W = 1, H = 1;
  const anchors = {};

  function sizeTo(w, h) { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  // camera presets [tx,ty,tz, az, el, dist]
  const PRE = (chain) => [
    [-4.6, 0.9, 2.0, 20, 22, 10.8],
    [-1.4, 0.4, 0.8, 12, 38, 16.5],
    chain === 's' ? [2.6, 1.0, 0.9, 16, 30, 12] : [-1.8, 1.4, 1.4, 22, 24, 10.5],
    [0.9, 0.7, -2.0, 10, 34, 15],
    [2.2, 0.6, -4.2, 6, 30, 14.5],
    [3.6, 0.7, -5.4, -6, 24, 10.5],
  ];

  function update(st, d) {
    const T = st.T, c = st.chain, ch = d.ch, lt = d.lt; const I = st.idle ?? T;
    // ---- camera ----
    const P = PRE(c); const cur = P[ch], prev = P[Math.max(0, ch - 1)];
    const k = ch === 0 ? 1 : E.io(ramp(lt, 0, 1.5));
    const cp = cur.map((v, i) => lerp(prev[i], v, k));
    const az = (cp[3] + 2.2 * Math.sin(I * 0.22) + (st.camAz || 0)) * Math.PI / 180;
    const el = clamp(cp[4] + (st.camEl || 0), 8, 75) * Math.PI / 180;
    const dist = cp[5] * (st.camZoom || 1);
    const tgt = new THREE.Vector3(cp[0], cp[1], cp[2]);
    camera.position.set(tgt.x + dist * Math.sin(az) * Math.cos(el), tgt.y + dist * Math.sin(el), tgt.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(tgt);
    camera.setViewOffset(W, H, -W * 0.07, -H * 0.09, W, H);
    camera.updateMatrixWorld();

    // ---- nodes ----
    nodeObjs.forEach((o, i) => { o.ring.visible = false; o.has.visible = false; o.g.scale.setScalar(1); });
    const ringOn = (i, color, a) => { const o = nodeObjs[i]; o.ring.visible = a > 0.01; o.ring.material.color.set(color); o.ring.material.opacity = a; const s = 1 + 0.05 * Math.sin(I * 4); o.ring.scale.setScalar(s); };
    if (ch === 0) ringOn(N.wallet, COL.amber, E.in(ramp(lt, 0, 0.6)));
    if (ch === 1 && lt < 3.2) ringOn(N.rpc, COL.teal, E.in(ramp(lt, 1.2, 1.8)) * (1 - ramp(lt, 3.0, 3.2)));
    const leaderOn = (c === 's' && T >= S[1] + 2.6) || T >= S[3];
    if (leaderOn && T < S[4] + 0.2) ringOn(PROPOSER, COL.amber, E.in(ramp(T, c === 's' && T < S[3] ? S[1] + 2.6 : S[3], (c === 's' && T < S[3] ? S[1] + 2.6 : S[3]) + 0.6)));
    if (c === 's' && T >= S[1] + 2.6 && T < S[3]) ringOn(NEXTLEADER, '#7d8b99', 0.8 * E.in(ramp(T, S[1] + 2.8, S[1] + 3.4)));
    // wallet key pulse in ch0
    const key = nodeObjs[N.wallet].g.userData.key; key.material.color.set(ch === 0 && lt > 2.6 && lt < 4.2 ? (Math.sin(lt * 18) > 0 ? '#ffd28a' : COL.amber) : COL.amber);

    // ---- links ----
    linkObjs.forEach((L) => { L.m.color.set(COL.link); L.m.opacity = 1; });
    walletLink.m.color.set(ch <= 1 ? '#3f4f60' : '#26313d');
    beams.forEach((b) => { b.m.opacity = 0; });

    // ---- my packet ----
    mine.visible = false; mine.scale.setScalar(1);
    const wTop = nodeTop(N.wallet), rTop = nodeTop(N.rpc).add(new THREE.Vector3(0, 0.25, 0));
    anchors.wallet = new THREE.Vector3(...NODES[N.wallet].p).add(new THREE.Vector3(0, 0.9, 0));
    anchors.walletTop = wTop.clone().add(new THREE.Vector3(0, 0.35, 0));
    anchors.rpc = rTop.clone().add(new THREE.Vector3(0, 0.25, 0));
    anchors.proposer = nodeTop(PROPOSER).add(new THREE.Vector3(0, 0.4, 0));
    anchors.next = nodeTop(NEXTLEADER).add(new THREE.Vector3(0, 0.4, 0));
    const spin = I * 1.6;
    if (ch === 0 && lt >= 5.0) { mine.visible = true; mine.position.copy(wTop).add(new THREE.Vector3(0, 0.2 + 0.05 * Math.sin(T * 3), 0)); mine.scale.setScalar(E.land(ramp(lt, 5.0, 5.5))); mine.rotation.set(spin * 0.3, spin, 0); }
    if (ch === 1) {
      mine.visible = true; mine.rotation.set(spin * 0.3, spin, 0);
      if (lt < 1.6) { const t = E.io(ramp(lt, 0.1, 1.6)); mine.position.copy(arc(wTop.clone().add(new THREE.Vector3(0, 0.2, 0)), rTop, t, 1.2)); }
      else mine.position.copy(rTop).add(new THREE.Vector3(0, 0.04 * Math.sin(T * 3), 0));
      if (lt < 1.6) walletLink.m.color.set(COL.amber);
    }
    // gossip / forward
    clones.forEach((m) => (m.visible = false)); solPk.forEach((m) => (m.visible = false));
    const gT = T - S[1] - GOSSIP_T0;
    if (c !== 's' && T >= S[1] + GOSSIP_T0 && T < S[3] + 3.2) {
      GOSSIP.forEach((gq, i) => {
        const t0 = gq.d * HOP, tt = ramp(gT, t0, t0 + HOP * 0.92);
        const a = nodeTop(gq.from), b = nodeTop(gq.to);
        if (tt > 0 && tt < 1) { const m = clones[i]; m.visible = true; m.position.copy(arc(a, b, E.io(tt), 0.5)); m.rotation.set(spin, spin * 0.7, 0);
          const L = linkObjs.find((L) => (L.a === gq.from && L.b === gq.to) || (L.b === gq.from && L.a === gq.to)); if (L) L.m.color.set('#8a6a35'); }
        if (tt >= 1) { const o = nodeObjs[gq.to]; const fade = T >= S[3] ? 1 - ramp(T, S[3] + 2.0, S[3] + 3.2) : 1; if (fade > 0) { o.has.visible = true; o.has.scale.setScalar(fade * E.land(ramp(gT, t0 + HOP, t0 + HOP + 0.3))); o.has.rotation.y = spin; } }
      });
      if (T < S[3] + 2.0) { const o = nodeObjs[N.rpc]; o.has.visible = ch >= 2; o.has.rotation.y = spin; }
    }
    if (c === 's' && ch === 1 && lt >= GOSSIP_T0) {
      beams.forEach((b, i) => { b.m.opacity = 0.7 * E.in(ramp(lt, GOSSIP_T0, GOSSIP_T0 + 0.3));
        [0, 2.0].forEach((off, rep) => { const tt = ramp(lt, GOSSIP_T0 + off + i * 0.12, GOSSIP_T0 + off + i * 0.12 + 0.8); if (tt > 0 && tt < 1 && (rep === 0 || true)) { const m = solPk[i]; m.visible = true; m.position.copy(arc(rTop, nodeTop(b.to), E.io(tt), 0.25)); m.rotation.set(spin, spin, 0); } });
        if (lt > GOSSIP_T0 + 0.9) { const o = nodeObjs[b.to]; o.has.visible = true; o.has.rotation.y = spin; o.has.scale.setScalar(E.land(ramp(lt, GOSSIP_T0 + 0.9, GOSSIP_T0 + 1.2))); }
      });
    }
    if (c === 's' && ch >= 2 && T < S[3] + 2.0) { [PROPOSER].forEach((i) => { const o = nodeObjs[i]; o.has.visible = true; o.has.rotation.y = spin; }); }

    // ---- ambient traffic ----
    ambient.forEach((m, i) => {
      const per = 1.6 + (i % 5) * 0.37, ph = i * 0.53; const cyc = Math.floor((I + ph) / per); const t = ((I + ph) / per) % 1;
      const r = rng(cyc * 31 + i * 7)(); const e = EDGES[Math.floor(r * EDGES.length)]; const dir = r > 0.5;
      const vis = T > 0.5 && T < S[4] && t < 0.8; m.visible = vis;
      if (vis) { const a = nodeTop(dir ? e[0] : e[1]), b = nodeTop(dir ? e[1] : e[0]); m.position.copy(arc(a, b, E.io(t / 0.8), 0.35)); m.rotation.set(I + i, I * 1.3, 0); }
    });

    // ---- mempool tower ----
    const tb = towerBase(c);
    anchors.tower = tb.clone().add(new THREE.Vector3(0, 25 * TILE_H + 0.65, 0));
    anchors.lane = tb.clone().add(new THREE.Vector3(1.55, 0.9, 0));
    anchors.cut = tb.clone().add(new THREE.Vector3(-0.7, 0.3 + (25 - CAP) * TILE_H, 0.3));
    const towerIn = ramp(T, S[2], S[2] + 1.2);
    const towerVis = T >= S[2] && T < S[4] + 0.5;
    const towerFade = 1 - ramp(T, S[4] - 0.4, S[4] + 0.5);
    towerPad.visible = towerVis && towerFade > 0.02; towerPad.position.copy(tb).add(new THREE.Vector3(0, 0.03, 0)); towerPad.scale.setScalar(Math.max(0.01, E.in(towerIn)));
    const fee = st.fee;
    // continuous rank: others shifted below me smoothly
    const sorted = OTHERS.map((o, i) => ({ o, i })).sort((a, b) => b.o - a.o);
    const kN = st.failNonceK || 0, kF = st.failFeeK || 0, kFail = Math.max(kN, kF);
    const myRankC = sorted.reduce((s, x) => s + 1 / (1 + Math.exp(-(x.o - fee) * 1.2)), 0); // continuous count of others above me
    const slotY = (rank) => tb.y + 0.14 + (24 - rank) * TILE_H; // rank 0 at top
    // ranks among the 25 for inclusion
    const myRankInt = sorted.filter((x) => x.o > fee).length; // 0-based
    const incl = d.included;
    const slotAbove = (r) => r; // helper
    const pickT0 = S[3] + 2.0;
    const blockAt = S[3] + 3.3;
    tiles.forEach((m) => (m.visible = false)); cut.visible = false; lanePad.visible = false;
    if (towerVis) {
      sorted.forEach((x, k) => {
        const m = tiles[x.i];
        const below = kFail > 0.5 ? 0 : 1 / (1 + Math.exp(-(fee - x.o) * 1.2)); // I'm above this one
        const rankC = k + (1 - kFail) * below * 0 + (kFail > 0 ? 0 : 0);
        // others: rank among others k, +1 if I'm above them (when I'm in tower)
        const rk = k + below * (1 - kFail);
        const drop = ramp(towerIn, k * 0.025, k * 0.025 + 0.35);
        const p = new THREE.Vector3(tb.x, slotY(rk + (kFail > 0 ? 0.5 * kFail : 0)) + (1 - E.in(drop)) * 1.2, tb.z);
        // integer rank among all 25 (for inclusion)
        const rInt = k + (fee > x.o && !(st.failNonce || st.failFee) ? 1 : 0);
        let vis = drop > 0;
        if (T >= pickT0 && rInt < CAP) { const tt = ramp(T, pickT0 + rInt * 0.09, pickT0 + rInt * 0.09 + 0.7); if (tt >= 1) vis = false; else if (tt > 0) p.copy(arc(p, nodeTop(PROPOSER).add(new THREE.Vector3(0, 0.3, 0)), E.io(tt), 1.0)); }
        m.material = rInt < CAP ? tileMats.fit : tileMats.other; m.visible = vis && towerFade > 0.02; m.position.copy(p); m.scale.setScalar(Math.max(0.01, towerFade)); m.rotation.y = 0;
      });
      // mine
      const m = tiles[24];
      const enter = ramp(T, S[2] + 0.4, S[2] + 1.4);
      const src = c === 's' ? nodeTop(PROPOSER).add(new THREE.Vector3(0, 0.3, 0)) : rTop;
      const inTower = new THREE.Vector3(tb.x, slotY(myRankC), tb.z);
      const lane = new THREE.Vector3(tb.x + 1.55, tb.y + 0.12 + 0.06, tb.z);
      let p = inTower.clone().lerp(lane, E.io(kFail));
      if (c === 's' && kFail > 0) p.y -= 0; // dropped look handled by fade
      if (enter < 1) p = arc(src, p, E.io(enter), 0.8);
      let vis = enter > 0;
      if (T >= pickT0 && incl) { const tt = ramp(T, pickT0 + myRankInt * 0.09, pickT0 + myRankInt * 0.09 + 0.7); if (tt >= 1) vis = false; else if (tt > 0) p = arc(p, nodeTop(PROPOSER).add(new THREE.Vector3(0, 0.3, 0)), E.io(tt), 1.0); }
      const sDrop = c === 's' ? kFail : 0;
      m.visible = vis && towerFade > 0.02 && sDrop < 0.98; m.position.copy(p); m.position.y -= sDrop * 0.0;
      m.material = kFail > 0.3 ? tileMats.red : tileMats.mine; m.scale.set(1 + 0.08 * (1 - kFail), 1.6, 1).multiplyScalar(Math.max(0.01, towerFade * (1 - sDrop * 0.6)));
      anchors.myTile = p.clone().add(new THREE.Vector3(0.55, 0.0, 0.32));
      lanePad.visible = kFail > 0.02 && c !== 's' && towerFade > 0.02; lanePad.position.copy(lane).add(new THREE.Vector3(0, -0.12, 0)); lanePad.scale.setScalar(Math.max(0.01, E.in(kFail)));
      cut.visible = towerIn > 0.6 && towerFade > 0.02 && T < pickT0 + 1.2; cut.position.set(tb.x, slotY(CAP - 0.5), tb.z); cut.scale.setScalar(E.in(ramp(towerIn, 0.6, 1)));
    }

    // ---- block production ----
    const nb = blocks[4];
    nb.visible = T >= blockAt; nb.userData.stripe.visible = incl;
    if (T >= blockAt) {
      const grow = E.land(ramp(T, blockAt, blockAt + 0.7)); const mv = E.io(ramp(T, S[3] + 4.5, S[3] + 5.8));
      const above = nodeTop(PROPOSER).add(new THREE.Vector3(0, 0.9, 0));
      nb.position.copy(arc(above, blockPos(4), mv, 1.4)); nb.scale.setScalar(Math.max(0.01, grow)); nb.rotation.y = (1 - mv) * 0.6;
    }
    anchors.newBlock = nb.position.clone().add(new THREE.Vector3(0, 0.75, 0));
    const linkG = ramp(T, S[3] + 5.8, S[3] + 6.5);
    chainLinks.forEach((l, i) => { if (i < 3) return; if (i === 3) { l.visible = linkG > 0; l.scale.x = Math.max(0.01, E.in(linkG)); l.position.x = blockX(3) + 0.65 + 0.35 * E.in(linkG) * 1; } });
    chainLinks[3].position.x = blockX(3) + 0.65 + 0.35 * E.in(linkG); chainLinks[3].scale.x = Math.max(0.01, 0.7 * E.in(linkG));
    for (let i = 0; i < 3; i++) { chainLinks[i].scale.x = 0.7; chainLinks[i].position.x = blockX(i) + 1.0; }
    // confirmations
    const confT = [S[4] + 3.0, S[4] + 3.8, S[4] + 4.6];
    for (let j = 0; j < 3; j++) { const b = blocks[5 + j]; const t = ramp(T, confT[j], confT[j] + 0.6); b.visible = t > 0; b.userData.stripe.visible = false;
      const pp = blockPos(5 + j); b.position.set(pp.x + (1 - E.in(t)) * 2.5, pp.y + (1 - E.in(t)) * 0.0, pp.z); b.scale.setScalar(Math.max(0.01, E.in(t)));
      const l = chainLinks[4 + j]; const lt2 = ramp(T, confT[j] + 0.4, confT[j] + 0.8); l.visible = lt2 > 0; l.scale.x = Math.max(0.01, 0.7 * E.in(lt2)); l.position.x = blockX(4 + j) + 1.0; }
    // finality tint
    const finT = S[4] + 5.4;
    blocks.forEach((b, i) => {
      let f = 0; if (i <= 4) f = E.io(ramp(T, finT + i * 0.14, finT + i * 0.14 + 0.5));
      if (i < 4 && T < finT) f = 0;
      col.set(COL.body2).lerp(new THREE.Color(COL.fin), f); b.material.color.copy(col);
      b.userData.em.color.set(f > 0.5 ? COL.green : i === 4 && T >= blockAt ? COL.teal : COL.edge);
      const dim = ch === 5 && i !== 4 ? 0.55 : 1; b.material.color.multiplyScalar(dim);
    });
    const rise = (i) => E.in(ramp(T, S[3] + 0.2 + i * 0.12, S[3] + 0.8 + i * 0.12));
    for (let i = 0; i < 4; i++) { const r = rise(i); blocks[i].visible = r > 0.001; blocks[i].scale.setScalar(Math.max(0.01, r)); blocks[i].position.y = 0.45 - (1 - r) * 0.6; }
    for (let i = 0; i < 3; i++) { chainLinks[i].visible = rise(i + 1) > 0.5; }
    anchors.blocks = blocks.map((b) => b.position.clone().add(new THREE.Vector3(0, 0.62, 0)));
    // votes
    votes.forEach((m) => (m.visible = false));
    voteRing.visible = voteRingBg.visible = thirds.visible = false;
    if (T >= S[4] && T < S[5] + 0.5) {
      const vl = T - S[4];
      VALS.forEach((vi, j) => { for (let rep = 0; rep < 2; rep++) { const t0 = 0.3 + j * 0.3 + rep * 1.25; const tt = ramp(vl, t0, t0 + 0.8);
        if (tt > 0 && tt < 1) { const m = votes[j * 2 + rep]; m.visible = true; m.position.copy(arc(nodeTop(vi), blockPos(4).add(new THREE.Vector3(0, 0.5, 0)), E.io(tt), 1.6)); m.rotation.set(vl * 3, vl * 2, 0); } } });
      const frac = voteFrac(Math.min(T, S[5])); voteRing.visible = voteRingBg.visible = true;
      voteRing.geometry.dispose(); voteRing.geometry = new THREE.RingGeometry(1.15, 1.3, 96, 1, Math.PI / 2 - Math.PI * 2 * Math.max(0.001, frac), Math.PI * 2 * Math.max(0.001, frac));
      voteRing.material.color.set(T >= finT ? COL.green : COL.teal);
      const a = Math.PI / 2 - Math.PI * 2 * (2 / 3); thirds.visible = true; thirds.position.set(blockX(4) + Math.cos(a) * 1.225, 0.03, CHAIN_Z - Math.sin(a) * 1.225); thirds.rotation.y = a;
    }
    anchors.ring = blockPos(4).add(new THREE.Vector3(1.2, 0.05, 0.9));
  }

  function project(v) { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, ok: p.z < 1 }; }
  function render() { renderer.render(scene, camera); }
  return { sizeTo, update, render, project, anchors, camera, renderer };
}
