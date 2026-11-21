// ===================== rendering =====================
const R = {
  gfx: null, bo: null, bt: null, bg: null, bv: null, third: 0, fov: 70, camShake: 0,
  init(cv) { this.gfx = new Gfx(cv); this.bs = new Batch(6000); this.frameN = 0; this.bo = new Batch(); this.bt = new Batch(20000); this.bg = new Batch(8000); this.bv = new Batch(2000); this.cv = cv; },
  rebuild(max = 99) {
    const W = G.world; let n = 0;
    for (const k of [...W.dirty]) { if (n++ >= max) break; W.dirty.delete(k); const cx = k % W.cx, cz = Math.floor(k / W.cx) % W.cz, cy = Math.floor(k / (W.cx * W.cz)); this.gfx.upload(k, meshChunk(W, cx, cy, cz)); }
  },
  itemCol(id) { const D = ITEMS[id]; if (!D) return null; if (D.col) return D.col; if (D.use === 'shield') return [.6, .45, .3]; return [.95, .8, .3]; },
  // bow: dt = ticks drawn (0 = idle). Aim layout: arrow along item +y, limbs along z (MC pull frames: <0.65 / <0.9 / full)
  drawBow(b, m, dt) {
    const pull = Math.min(1, dt / 20), A = ART.get('bow');
    if (A) { const F = dt > 0 ? (ART.get('_bow' + (pull < .65 ? 0 : pull < .9 ? 1 : 2)) || A) : A; this.drawArt(b, m, F, dt > 0); return; }
    const mm = dt > 0 ? m : M4.RY(M4.RX(M4.T(m, 0, .2, 0), 1), 0), wood = [.55, .38, .2], str = [.9, .9, .9];
    for (let i = 0; i < 6; i++) { const z0 = -.36 + i * .12, z1 = z0 + .12, zc = (z0 + z1) / 2; const y = .1 * Math.cos(zc / .36 * Math.PI / 2); b.box(mm, -.025, y - .025, z0, .025, y + .025, z1, wood); }
    const ys = -.01 - pull * .16;
    if (pull > 0) { b.box(mm, -.008, ys, -.34, .008, ys + .012, .34, str); b.box(mm, -.012, ys, -.012, .012, ys + .62, .012, [.6, .45, .3]); b.box(mm, -.03, ys + .58, -.03, .03, ys + .66, .03, [.75, .75, .78]); }
    else b.box(mm, -.008, -.02, -.34, .008, -.008, .34, str);
  },
  drawArt(b, m, A, aim) {
    if (A.banner) { const s = .02, top = .95, w = 20 * s / 2; const pole = [.55, .4, .25]; b.box(m, -.02, -.25, -.02, .02, top + .06, .02, pole); b.box(m, -.02, top, -w - .03, .02, top + .03, w + .03, pole);
      for (const [x0, x1, y, c] of A.runs) b.box(m, -.012, top - (y + 1) * s, -w + x0 * s, .012, top - y * s, -w + x1 * s, c); return; }
    if (A.cube) { b.box(m, -.14, 0, -.14, .14, .28, .14, [1, 1, 1], A.cube[0]); b.box(m, -.141, .28, -.141, .141, .282, .141, [1, 1, 1], A.cube[1]); return; }
    const s = A.h ? .045 : .032; let mm = aim ? M4.RX(M4.T(m, 0, .1, 0), Math.PI / 4) : A.h ? M4.RX(M4.T(m, 0, .3, 0), -Math.PI / 4) : M4.T(m, 0, .26, 0);
    for (const [x0, x1, y, c] of A.runs) b.box(mm, -s / 2, (7 - y) * s, (x0 - 8) * s, s / 2, (8 - y) * s, (x1 - 8) * s, c);
  },
  drawItem(b, m, id, big, dt = 0) {
    const D = ITEMS[id]; if (!D) return; const c = this.itemCol(id);
    if (D.use === 'bow') return this.drawBow(b, m, dt);
    const A = ART.get(id); if (A) { this.drawArt(b, m, A); return; } // original item model (banner / vanilla pack sprite)
    if (D.sword) { b.box(m, -.03, -.05, -.05, .03, .65, .05, c); b.box(m, -.04, .02, -.14, .04, .07, .14, [.4, .3, .2]); }
    else if (D.axe) { b.box(m, -.025, -.1, -.025, .025, .6, .025, [.45, .32, .2]); b.box(m, -.03, .4, 0, .03, .62, .2, c); }
    else if (D.hammer) { b.box(m, -.03, -.1, -.03, .03, .55, .03, [.45, .32, .2]); b.box(m, -.07, .45, -.16, .07, .62, .16, c); }
    else if (D.mace || id === 'stick_mace' || id === 'baton') { b.box(m, -.03, -.1, -.03, .03, .55, .03, id === 'baton' ? c : [.45, .32, .2]); b.box(m, -.08, .5, -.08, .08, .7, .08, id === 'baton' ? [.1, .1, .12] : c); }
    else if (D.use === 'shield') { b.box(m, -.04, -.25, -.2, .04, .45, .25, c); b.box(m, -.05, .05, -.05, .05, .15, .05, [.7, .7, .7]); }
    else if (D.use === 'bow' || D.use === 'crossbow') { b.box(m, -.02, -.25, -.02, .02, .45, .02, c); b.box(m, -.02, .08, .02, .02, .12, .25, [.85, .85, .85]); if (D.use === 'crossbow') b.box(m, -.25, .05, -.02, .25, .09, .02, c); }
    else if (id === 'rod0' || id === 'rod6' || id === 'rodwood') { b.box(m, -.02, -.1, -.02, .02, .8, .02, c); b.box(m, -.005, .3, -.005, .005, .8, .005, [.9, .9, .9]); }
    else if (D.staff) { b.box(m, -.025, -.15, -.025, .025, .6, .025, [.35, .25, .18]); b.box(m, -.06, .58, -.06, .06, .7, .06, [.85, .75, .3]); b.box(m, -.045, .64, -.045, .045, .76, .045, c); }
    else if (id === 'breeze_rod') { b.box(m, -.035, -.1, -.035, .035, .6, .035, c); }
    else { const s = big ? .12 : .1; b.box(m, -s, .05 - s, -s, s, .05 + s, s, c); }
  },
  drawPlayer(b, e, alpha, glowB, sb, sk) {
    const x = e.local ? lerp(e.px, e.x, alpha) : e.x, y = e.local ? lerp(e.py, e.y, alpha) : e.y, z = e.local ? lerp(e.pz, e.z, alpha) : e.z;
    const sc = e.scale || 1; const k = sc * 0.9375 / 16;
    const P = PERSONAS[e.persona] || PERSONAS[0];
    const job = e.job; let shirt = P.rgb.map(c => c * .7 + .1), pants = [.2, .22, .55], skin = [.8, .6, .45], boots = null, helm = null;
    const at = e.armorType; const ac = at ? ARMOR[at][2] : null; if (ac) { shirt = ac; pants = ac.map(c => c * .9); helm = ac; boots = ac; }
    if (job === 'rusher') boots = [.35, .9, .9];
    const hurt = e.hurtTime > 0; const tint = c => hurt ? [Math.min(1, c[0] * .6 + .5), c[1] * .5, c[2] * .5] : c;
    const sneak = e.sneaking; const swingP = e.swingT > 0 ? 1 - e.swingT / 6 : 0;
    // MC WalkAnimationState (once per frame per entity)
    if (e._af !== this.frameN) {
      e._af = this.frameN; const ft = Math.min(5, (this.dt || 16.7) / 50);
      let dtick; if (e.local) dtick = Math.hypot(e.x - e.px, e.z - e.pz); else { dtick = e._lx === undefined ? 0 : Math.hypot(e.x - e._lx, e.z - e._lz) / Math.max(ft, .05); e._lx = e.x; e._lz = e.z; }
      const tgt = Math.min(1, dtick * 4 / sc); e.walkA = (e.walkA || 0) + (tgt - (e.walkA || 0)) * (1 - Math.pow(0.6, ft)); e.walkP = (e.walkP || 0) + e.walkA * ft;
    }
    const legA = Math.cos(e.walkP * 0.6662) * 1.4 * e.walkA, armA = Math.cos(e.walkP * 0.6662) * e.walkA;
    const dd = G.dancers.get(e.id), D = dd ? DANCE.pose('gangnam', (performance.now() - dd.t0) / 1000) : null; // dude 댄스: 강남스타일
    let base = M4.T(M4.id(), x, y, z); base = M4.RY(base, -(dd ? dd.yaw : e.yaw)); base = M4.S(base, k, k, k);
    if (sneak) base = M4.T(base, 0, -2, 0);
    if (D) { base = M4.RY(base, D.yaw); base = M4.T(base, D.off[0], D.off[1], D.off[2]); }
    const S = !!(sb && sk && !glowB); const W1 = tint([1, 1, 1]);
    // body part: skin-textured (with overlay layer) or flat colored
    const part = (m, x0, y0, z0, x1, y1, z1, uv, ov, flat, front) => {
      if (glowB) { glowB.box(m, x0, y0, z0, x1, y1, z1, [1, 1, 1]); return; }
      if (S) { const w = x1 - x0, h = y1 - y0, d = z1 - z0; sb.skinBox(m, x0, y0, z0, x1, y1, z1, uv[0], uv[1], w, h, d, W1); if (ov) { const g = ov[2] || .25; sb.skinBox(m, x0 - g, y0 - g, z0 - g, x1 + g, y1 + g, z1 + g, ov[0], ov[1], w, h, d, W1); } }
      else b.box(m, x0, y0, z0, x1, y1, z1, tint(flat), 0, front === undefined ? -1 : front);
    };
    const armor = (m, x0, y0, z0, x1, y1, z1, c) => { if (!glowB && c) b.box(m, x0, y0, z0, x1, y1, z1, tint(c)); };
    // legs
    for (const sd of [-1, 1]) {
      let m = M4.T(base, sd * 2, 12, sneak ? -2 : 0); m = D ? DANCE.rot(m, sd < 0 ? D.rleg : D.lleg) : M4.RX(m, sd * legA);
      part(m, -2, -12, -2, 2, 0, 2, sd < 0 ? [0, 16] : [16, 48], sd < 0 ? [0, 32] : [0, 48], pants);
      if (S && ac) armor(m, -2.5, -9, -2.5, 2.5, .3, 2.5, ac);
      if (boots) armor(m, -2.6, -12.3, -2.6, 2.6, -8.5, 2.6, boots);
    }
    // body
    let bm = M4.T(base, 0, 12, 0); if (sneak) bm = M4.RX(bm, .5); if (D) bm = DANCE.rot(bm, D.body);
    part(bm, -4, 0, -2, 4, 12, 2, [16, 16], [16, 32], shirt);
    if (S && ac) armor(bm, -4.6, -.3, -2.6, 4.6, 12.4, 2.6, ac);
    // arms (slim skins: 3px)
    const slim = S && sk.slim, aw = slim ? 3 : 4, ao = slim ? 5.5 : 6;
    const heldId = e.local ? (e.inv[e.sel] ? e.inv[e.sel].id : null) : e.heldId; const offId = e.local ? (e.off ? e.off.id : null) : e.offId;
    const aiming = e.drawT > 0;
    for (const sd of [-1, 1]) {
      let m = M4.T(bm, sd * ao, 10, 0);
      let ax = -sd * armA; if (sd === -1 && swingP > 0) ax -= Math.sin(swingP * Math.PI) * 1.4; if (aiming) ax = -Math.PI / 2 - e.pitch;
      if (sd === 1 && e.blocking) ax = -.9;
      m = D ? DANCE.rot(m, sd < 0 ? D.rarm : D.larm) : M4.RX(m, ax);
      part(m, -aw / 2, -10, -2, aw / 2, 2, 2, sd < 0 ? [40, 16] : [32, 48], sd < 0 ? [40, 32] : [48, 48], skin);
      if (ac) armor(m, -aw / 2 - .6, -3, -2.6, aw / 2 + .6, 2.6, 2.6, ac);
      const iid = sd === -1 ? heldId : offId;
      if (iid && !glowB && ITEMS[iid]) { let im = M4.T(m, 0, -9, 1); im = M4.S(im, 16 / .9375, 16 / .9375, 16 / .9375); im = M4.RX(im, Math.PI / 2 * (ITEMS[iid].use === 'shield' ? 0 : 1)); if (ITEMS[iid].use === 'shield') im = M4.RY(im, Math.PI / 2); this.drawItem(b, im, iid, false, e.drawT || 0); }
    }
    // head
    let hm = M4.T(bm, 0, 12, 0); if (sneak) hm = M4.RX(hm, -.5); hm = D ? DANCE.rot(hm, D.head) : M4.RX(hm, e.pitch);
    if (S) { part(hm, -4, 0, -4, 4, 8, 4, [0, 0], [32, 0, .5]); if (helm) armor(hm, -4.7, 4.2, -4.7, 4.7, 8.8, 4.7, helm); }
    else if (glowB) glowB.box(hm, -4, 0, -4, 4, 8, 4, [1, 1, 1]);
    else { b.box(hm, -4, 0, -4, 4, 8, 4, tint([.8, .6, .45]), 0, 16); b.box(hm, -4.2, 6, -4.2, 4.2, 8.3, 4.2, tint(helm || [.3, .2, .1])); if (!helm) b.box(hm, -4.2, 5, -4.2, 4.2, 8.3, -2, tint([.3, .2, .1])); }
  },
  // dude 댄스 frogs: Frog Marauder mesh (js/data/frog.js, tools/mkfrog.py), skinned to 6 parts (2 parts per vertex) posed by the shared DANCE clips
  frogTex: null, frogM: null, bf: null,
  frogInit() {
    if (this.frogM || typeof FROG === 'undefined') return !!this.frogM;
    const v = FROG.v, n = v.length / 8, a = new Float32Array(n * 8); for (let i = 0; i < n * 8; i++) a[i] = v[i] / ((i % 8) < 6 ? 100 : 10000);
    const parts = FROG.pn.map(k => { const P = FROG.parts[k], f = P.f; return { k, p: P.p, a: P.a, F: new Float32Array([f[0], f[3], f[6], 0, f[1], f[4], f[7], 0, f[2], f[5], f[8], 0, 0, 0, 0, 1]) }; });
    this.frogM = { v: a, n, w: FROG.w, i: FROG.i, parts, ix: Object.fromEntries(FROG.pn.map((k, i) => [k, i])) };
    this.bf = new Batch(60000); this.bf.i = new Uint16Array(60000 * 6); const im = new Image(); im.onload = () => { this.frogTex = this.gfx.makeTex(im); }; im.src = FROG.tex; return true;
  },
  drawFrog(b, x, y, z, yaw, t, sc) {
    const k = sc / 16, P = DANCE.pose('gangnam', t), M = this.frogM, pi = M.parts, ix = M.ix; let base = M4.T(M4.id(), x, y, z); base = M4.RY(base, -yaw); base = M4.S(base, k, k, k);
    if (P) { base = M4.RY(base, P.yaw); base = M4.T(base, P.off[0], P.off[1], P.off[2]); }
    const at = (m, p) => M4.T(m, p[0], p[1], p[2]), R = (m, e) => P ? DANCE.rot(m, e) : m, pose = {};
    pose.body = R(at(base, pi[ix.body].p), P && P.body);
    for (const s of ['rleg', 'lleg']) pose[s] = R(at(base, pi[ix[s]].p), P && P[s]);
    for (const s of ['rarm', 'larm', 'head']) pose[s] = R(at(pose.body, pi[ix[s]].p), P && P[s]);
    const W = pi.map(q => { const a = q.a; return M4.T(M4.mul(pose[q.k], q.F), -a[0], -a[1], -a[2]); }); // model space -> world for each part
    const v = M.v, w = M.w, out = b.v, nv0 = b.nv; let o = nv0 * 9; const L0 = .32, L1 = .86, L2 = .4;
    for (let i = 0; i < M.n; i++) {
      const j = i * 8, x0 = v[j], y0 = v[j + 1], z0 = v[j + 2], nx0 = v[j + 3], ny0 = v[j + 4], nz0 = v[j + 5], A = W[w[i * 3]], B = W[w[i * 3 + 1]], wa = w[i * 3 + 2] / 100, wb = 1 - wa;
      out[o++] = wa * (A[0] * x0 + A[4] * y0 + A[8] * z0 + A[12]) + wb * (B[0] * x0 + B[4] * y0 + B[8] * z0 + B[12]);
      out[o++] = wa * (A[1] * x0 + A[5] * y0 + A[9] * z0 + A[13]) + wb * (B[1] * x0 + B[5] * y0 + B[9] * z0 + B[13]);
      out[o++] = wa * (A[2] * x0 + A[6] * y0 + A[10] * z0 + A[14]) + wb * (B[2] * x0 + B[6] * y0 + B[10] * z0 + B[14]);
      out[o++] = v[j + 6]; out[o++] = v[j + 7];
      const nx = wa * (A[0] * nx0 + A[4] * ny0 + A[8] * nz0) + wb * (B[0] * nx0 + B[4] * ny0 + B[8] * nz0), ny = wa * (A[1] * nx0 + A[5] * ny0 + A[9] * nz0) + wb * (B[1] * nx0 + B[5] * ny0 + B[9] * nz0), nz = wa * (A[2] * nx0 + A[6] * ny0 + A[10] * nz0) + wb * (B[2] * nx0 + B[6] * ny0 + B[10] * nz0), nl = Math.hypot(nx, ny, nz) || 1;
      const s = .55 + .45 * Math.max(0, (nx * L0 + ny * L1 + nz * L2) / nl); out[o++] = s; out[o++] = s; out[o++] = s; out[o++] = 1;
    }
    const I = b.i, src = M.i; let q = b.ni; for (let i = 0; i < src.length; i++) I[q++] = nv0 + src[i]; b.ni = q; b.nv += M.n;
  },
  drawFrogs() {
    if (!G.dancers.size || !this.frogInit() || !this.frogTex) return; const b = this.bf, M = this.frogM, now = performance.now(); b.reset();
    const flush = () => { if (!b.ni) return; this.gfx.bind(this.frogTex); this.gfx.drawBatch(b); this.gfx.bind(); b.reset(); };
    for (const d of G.dancers.values()) for (const f of d.frogs) {
      if (b.nv + M.n > b.cap || b.ni + M.i.length > b.i.length) flush(); // vertex AND index room (indices overflowed with many frogs)
      const pop = clamp((now - f.s0) / 250, 0, 1); this.drawFrog(b, f.x, f.y, f.z, f.yaw, (now - d.t0) / 1000, .8 * (pop < 1 ? pop * (1.15 - .15 * pop) : 1));
    }
    flush();
  },
  drawDog(b, m, x, y, z) {
    const k = .85 / 17; let base = M4.T(M4.id(), x, y, z); base = M4.RY(base, -m.yaw); base = M4.S(base, k, k, k);
    const hurt = m.hurtTime > 0, C = c => hurt ? [Math.min(1, c[0] * .6 + .45), c[1] * .45, c[2] * .45] : c;
    const fur = C([.86, .85, .82]), dark = C([.62, .58, .55]);
    const mv = m.local ? Math.hypot(m.x - m.px, m.z - m.pz) : Math.hypot(m.tx - m.x, m.tz - m.z) * 2; const sw = Math.min(1, mv * 6) * Math.sin((m.local ? m.age : G.tick) * .9) * .7;
    for (const [lx, lz, ph] of [[-1.8, 3, 1], [1.8, 3, -1], [-1.8, -4.5, -1], [1.8, -4.5, 1]]) { let lm = M4.T(base, lx, 8, lz); lm = M4.RX(lm, sw * ph); b.box(lm, -1, -8, -1, 1, 0, 1, dark); }
    b.box(base, -3, 7, -6, 3, 13, 2, fur); b.box(base, -4, 6.5, 1, 4, 14, 6, fur);
    b.box(base, -3.2, 8.5, 5.6, 3.2, 9.6, 6.4, C([.75, .1, .1]));
    const hm = M4.T(base, 0, 12, 6);
    b.box(hm, -3, -3, 0, 3, 3, 4, fur); b.box(hm, -1.5, -3, 4, 1.5, 0, 7, dark);
    b.box(hm, -3, 3, 1, -1, 5, 2, dark); b.box(hm, 1, 3, 1, 3, 5, 2, dark);
    b.box(hm, -2.2, .5, 4, -1, 1.5, 4.2, [.08, .08, .08]); b.box(hm, 1, .5, 4, 2.2, 1.5, 4.2, [.08, .08, .08]);
    let tm = M4.T(base, 0, 12, -6); tm = M4.RX(tm, -.9 + Math.sin(G.tick * .5) * .15); b.box(tm, -1, -8, -1, 1, 0, 1, fur);
  },
  // 성진이: MC pig model (body 10x8x16, head 8x8x8, snout, 4 legs), pink
  drawPig(b, x, y, z, yaw) {
    const k = 1 / 16; let m = M4.T(M4.id(), x, y, z); m = M4.RY(m, -yaw); m = M4.S(m, k, k, k);
    const pk = [.96, .67, .68], dk = [.86, .52, .55], sn = [.93, .5, .55];
    for (const [lx, lz] of [[-3, -5], [3, -5], [-3, 5], [3, 5]]) b.box(m, lx - 2, 0, lz - 2, lx + 2, 6, lz + 2, dk);
    b.box(m, -5, 6, -8, 5, 14, 8, pk); b.box(m, -4, 8, 8, 4, 16, 16, pk); b.box(m, -2, 9, 16, 2, 12, 17, sn);
    b.box(m, -3.5, 13, 16, -1.5, 14.5, 16.2, [.1, .1, .1]); b.box(m, 1.5, 13, 16, 3.5, 14.5, 16.2, [.1, .1, .1]);
  },
  // evoker-fang style silver triangular pyramid; k: 0..1 how far it has risen out of the ground
  drawFang(b, f, k) {
    const h = .95, rad = .34, by = f.y - (1 - k) * h, top = [f.x, by + h, f.z]; const uv = tUV(0);
    const P = [0, 1, 2].map(i => { const a = f.r + i * 2.0944; return [f.x + Math.cos(a) * rad, by, f.z + Math.sin(a) * rad]; });
    const S = [1, .78, .6];
    for (let i = 0; i < 3; i++) { const p0 = P[i], p1 = P[(i + 1) % 3], c = [.82 * S[i], .84 * S[i], .9 * S[i]]; b.quad(p0, p1, top, top, uv, c); b.quad(p1, p0, top, top, uv, c); }
  },
  drawMob(b, m, alpha, glowB) {
    const x = m.local ? lerp(m.px, m.x, alpha) : m.x, y = m.local ? lerp(m.py, m.y, alpha) : m.y, z = m.local ? lerp(m.pz, m.z, alpha) : m.z;
    if (m.type === 'dog') return this.drawDog(glowB || b, m, x, y, z);
    const T = MOBT[m.type]; const k = T.sc * 1.4 / 22; const cave = m.type === 'cave';
    let body = cave ? [.12, .3, .35] : [.25, .2, .18]; if (m.type === 'big') body = [.3, .18, .15]; if (m.hurtTime > 0) body = [.8, .2, .2];
    let base = M4.T(M4.id(), x, y, z); base = M4.RY(base, -m.yaw); base = M4.S(base, k, k, k);
    const B = glowB || b;
    B.box(base, -4, 5, 2, 4, 13, 10, body, 0, cave ? 22 : 19);
    B.box(base, -3, 6, -2, 3, 12, 2, body.map(c => c * .8));
    B.box(base, -5, 4, -14, 5, 13, -2, body.map(c => c * .9));
    const t = (m.local ? m.age : G.tick) * .6;
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
      let lm = M4.T(base, sd * 3, 9, 2 - i * 3); lm = M4.RY(lm, sd * (-.6 + i * .4) + Math.sin(t + i) * .2); lm = M4.RZ(lm, sd * -.6);
      B.box(lm, sd > 0 ? 0 : -15, -1, -1, sd > 0 ? 15 : 0, 1, 1, body.map(c => c * .7));
    }
  },
  frame(alpha, dtMs) {
    this.dt = dtMs; this.frameN++;
    const gfx = this.gfx, gl = gfx.gl, cv = this.cv; const me = G.me;
    const dpr = Math.min(window.devicePixelRatio || 1, UI.mobile ? 1.5 : 2) * (UI.resScale || 1);
    const W = Math.floor(cv.clientWidth * dpr), H = Math.floor(cv.clientHeight * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H);
    this.rebuild(G.phase === 'game' ? 6 : 99);
    for (const r of G.remotes.values()) r.interp();
    { const now = performance.now(); for (const [id, o] of G.rmobs) if (o.seen && now - o.seen > 4000) G.rmobs.delete(id); }
    for (const o of G.rmobs.values()) { o.x = lerp(o.x, o.tx, .35); o.y = lerp(o.y, o.ty, .35); o.z = lerp(o.z, o.tz, .35); if (o.hurtTime > 0) o.hurtTime--; }
    // camera
    let eye, yaw, pitch, roll = 0;
    if (G.phase === 'game' && me) {
      const x = lerp(me.px, me.x, alpha), y = lerp(me.py, me.y, alpha), z = lerp(me.pz, me.z, alpha);
      yaw = me.yaw; pitch = me.pitch; eye = { x, y: y + me.eye, z };
      if (me.hurtTime > 0) roll = Math.sin(me.hurtTime / 10 * Math.PI) * .12;
      const ft = Math.min(5, (this.dt || 16.7) / 50); const bob = me.onGround && !me.spectator ? Math.hypot(me.x - me.px, me.z - me.pz) / me.scale : 0; this.bobP = (this.bobP || 0) + bob * 0.6 * Math.PI * ft; this.bobA = (this.bobA || 0) + (Math.min(1, bob * 5) - (this.bobA || 0)) * (1 - Math.pow(0.6, ft));
      if (!this.third && UI.bob) { eye.y += Math.abs(Math.cos(this.bobP)) * .07 * this.bobA * me.scale; }
      const dd = G.dancers.get(me.id);
      if (dd) { // dude 댄스: behind the dancer (back of the head), 5.5 back and 1.6 up, looking at them
        const f = lookVec(dd.yaw, 0), head = { x: eye.x, y: eye.y, z: eye.z }, dir = { x: -f.x * 5.5, y: 1.6, z: -f.z * 5.5 }, L = Math.hypot(5.5, 1.6);
        const u = { x: dir.x / L, y: dir.y / L, z: dir.z / L }, h = G.world.ray(head, u, L), dl = h ? Math.max(.5, h.t - .2) : L;
        eye = { x: head.x + u.x * dl, y: head.y + u.y * dl, z: head.z + u.z * dl }; yaw = yawTo(head.x - eye.x, head.z - eye.z); pitch = Math.atan2(eye.y - head.y + .4, Math.hypot(head.x - eye.x, head.z - eye.z));
      } else if (this.third) {
        const d = lookVec(yaw, pitch); const sgn = this.third === 1 ? -1 : 1; const dist = 4 * Math.max(1, me.scale * .8);
        const dir = { x: d.x * sgn, y: d.y * sgn, z: d.z * sgn }; const h = G.world.ray(eye, dir, dist); const dd = h ? Math.max(.3, h.t - .2) : dist;
        eye = { x: eye.x + dir.x * dd, y: eye.y + dir.y * dd, z: eye.z + dir.z * dd }; if (this.third === 2) { yaw += Math.PI; pitch = -pitch; }
      }
    } else { const t = performance.now() / 1000 * .06; eye = { x: 36 + Math.cos(t) * 34, y: 38, z: 35 + Math.sin(t) * 34 }; yaw = yawTo(36 - eye.x, 35 - eye.z); pitch = .45; }
    G.camPos = eye; this.cam = { eye, yaw, pitch }; G.dogLoops();
    let fov = this.fov; if (me && G.phase === 'game') { const f = clamp(me.moveSpeed() / me.baseSpd, .5, 3); this.fovS = lerp(this.fovS || 1, me.sprinting ? 1.1 * (1 + (f - 1) * .25) : 1 + (f - 1) * .25, .15); fov *= this.fovS; if (me.drawT > 0) fov *= 1 - .15 * Math.min(1, me.drawT / 20); }
    this.cam.fov = fov; this.cam.asp = W / H;
    const proj = M4.persp(fov * D2R, W / H, .05, 400); const d = lookVec(yaw, pitch);
    const up = { x: Math.sin(roll) * Math.cos(yaw), y: Math.cos(roll), z: Math.sin(roll) * Math.sin(yaw) };
    const view = M4.lookAt(eye, { x: eye.x + d.x, y: eye.y + d.y, z: eye.z + d.z }, up); const vp = M4.mul(proj, view);
    this.vp = vp; this.W = W; this.H = H;
    gl.clearColor(gfx.sky[0], gfx.sky[1], gfx.sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gfx.setU(vp, eye, 70, 160);
    gl.disable(gl.BLEND); gl.depthMask(true); gfx.drawChunks('o', eye);
    // dynamic opaque
    const b = this.bo; b.reset(); const bg = this.bg; bg.reset(); const bt = this.bt; bt.reset();
    for (const p of G.players()) {
      if (p.spectator) continue;
      if (p === me && !this.third && !G.dancers.has(me.id)) { if (p.job === 'suno' && p.st.rewind) { const r = p.st.rewind, i0 = r.path.length - 1 - 2 * r.k, i1 = Math.max(0, r.path.length - 65); for (let i = i0; i >= i1; i -= 3) { const q = r.path[i]; bt.cube(q[0], q[1] + .1, q[2], .06, [1, .1, .1], 0, .9); } } continue; }
      if ((p.local ? G.tick < (p.prot || 0) : p.protF) && (performance.now() / 120 | 0) % 2) continue;
      const sk = SKIN.get(p.skin);
      if (sk) { this.bs.reset(); this.drawPlayer(b, p, alpha, null, this.bs, sk); gfx.bind(sk.tex); gfx.drawBatch(this.bs); gfx.bind(); }
      else this.drawPlayer(b, p, alpha);
      const glow = p.local ? p.eff('glowing') : p.glowing; if (glow && p !== me) this.drawPlayer(b, p, alpha, bg);
      if (p.job === 'suno') { // path shown only while 공부좀 하고옴 is rewinding
        if (p.local && p.st.rewind) { const r = p.st.rewind, i0 = r.path.length - 1 - 2 * r.k, i1 = Math.max(0, r.path.length - 65); for (let i = i0; i >= i1; i -= 3) { const q = r.path[i]; bt.cube(q[0], q[1] + .1, q[2], .06, [1, .1, .1], 0, .9); } }
        else if (!p.local && p.rewindF && p.trail) for (let i = 0; i < p.trail.length; i += 2) { const q = p.trail[i]; bt.cube(q[0], q[1], q[2], .06, [1, .1, .1], 0, .9); }
      }
    }
    for (const m of G.mobs) this.drawMob(b, m, alpha); for (const m of G.rmobs.values()) this.drawMob(b, m, alpha);
    for (const a of G.arrows) { if (a.potion) { const t = (G.tick + alpha) * .4; let m = M4.T(M4.id(), a.x, a.y, a.z); m = M4.RY(m, t); m = M4.RX(m, t * .7); b.box(m, -.1, -.12, -.1, .1, .08, .1, [.45, .05, .12]); b.box(m, -.04, .08, -.04, .04, .16, .04, [.8, .8, .85]); continue; } const sp = Math.hypot(a.vx, a.vy, a.vz) || 1; let m = M4.T(M4.id(), a.x, a.y, a.z); m = M4.RY(m, -yawTo(a.vx, a.vz)); m = M4.RX(m, -Math.asin(clamp(a.vy / sp, -1, 1))); if (a.stuck) { } b.box(m, -.025, -.025, -.45, .025, .025, .05, [.55, .4, .25]); b.box(m, -.06, -.01, -.45, .06, .01, -.3, [.95, .95, .95]); b.box(m, -.05, -.05, .02, .05, .05, .1, [.6, .6, .65]); }
    for (const g of G.pigs) { const a = G.tick + alpha - g.t0; if (a > 29) continue; const h = a <= 20 ? 4 + Math.sin(a * .3) * .08 : 4 * (1 - Math.pow(Math.min(1, (a - 20) / 8), 2)); this.drawPig(b, g.x, g.y + h, g.z, g.yaw); }
    for (const f of G.fangs) { const tt = G.tick + alpha; if (tt < f.at) continue; const k = clamp(Math.min((tt - f.at) / 3, (f.end - tt) / 3), 0, 1); if (k > 0) this.drawFang(b, f, k); }
    for (const dr of G.drops) { const t = (G.tick + alpha) * .1; let m = M4.T(M4.id(), dr.x, dr.y + .15 + Math.sin(t) * .05, dr.z); m = M4.RY(m, t); b.box(m, -.12, -.12, -.12, .12, .12, .12, [.45, .85, .35]); }
    for (const c of G.chains) { const tip = Math.min(c.l === undefined ? 20 : c.l, c.t <= 10 ? 2 * c.t : 20 - 2 * (c.t - 10)); for (let s = 0; s <= tip; s += .8) { let m = M4.T(M4.id(), c.o.x + c.d.x * s, c.o.y + c.d.y * s, c.o.z + c.d.z * s); m = M4.RY(m, -yawTo(c.d.x, c.d.z) + (s * 1.3 % 2 > 1 ? Math.PI / 2 : 0)); b.box(m, -.04, -.12, -.2, .04, .12, .2, [.35, .37, .42]); } }
    for (const p of G.parts) b.cube(p.x, p.y, p.z, p.s * (p.life < 5 ? p.life / 5 : 1), p.col, 0);
    gfx.drawBatch(b); this.drawFrogs();
    // transparent
    gl.enable(gl.BLEND); gl.depthMask(false); gfx.drawChunks('t', eye);
    for (const v of G.vigs) if (v.t < 45 + VIG_N) { const F = [[0, 1], [-1, 0], [0, -1], [1, 0]][v.d]; const L = [-F[1], F[0]];
      for (let kk = 0; kk <= Math.min(VIG_N - 1, v.t); kk++) { if (v.t >= 45 + kk) continue; const fw = kk + 1; const cx = v.x + F[0] * fw + .5, cz = v.z + F[1] * fw + .5; const hx = Math.abs(L[0]) * (VIG_W + .5) + Math.abs(F[0]) * .5, hz = Math.abs(L[1]) * (VIG_W + .5) + Math.abs(F[1]) * .5; bt.box(null, cx - hx, v.y - 20, cz - hz, cx + hx, v.y + 21, cz + hz, [1, .1, .1], 21, -1, .28, false); } }
    gfx.drawBatch(bt); bt.reset();
    // dash afterimage: the player's own model + skin, frozen in that pose and fading out (cursor-trail style)
    for (const g of G.ghosts) {
      const e = g.e; if (!e || e.spectator || Math.hypot(e.x - g.x, e.z - g.z) < .7) continue; const am = .5 * g.life / 10;
      const q = Object.create(e); Object.assign(q, { local: true, x: g.x, y: g.y, z: g.z, px: g.x, py: g.y, pz: g.z, yaw: g.yaw, pitch: g.pitch, walkP: g.walkP, walkA: g.walkA, _af: this.frameN, hurtTime: 0, swingT: 0, sneaking: false });
      const sk = SKIN.get(e.skin); bt.am = am;
      if (sk) { const sb = this.bs; sb.reset(); sb.am = am; this.drawPlayer(bt, q, alpha, null, sb, sk); gfx.bind(sk.tex); gfx.drawBatch(sb); gfx.bind(); sb.am = 1; }
      else this.drawPlayer(bt, q, alpha);
      bt.am = 1;
    }
    gfx.drawBatch(bt);
    // glowing silhouettes
    if (bg.ni) { gl.disable(gl.DEPTH_TEST); gl.uniform1f(gfx.u.uFlat, 1); gl.uniform4f(gfx.u.uTint, 1, 1, .85, 1); gfx.drawBatch(bg); gl.uniform1f(gfx.u.uFlat, 0); gl.uniform4f(gfx.u.uTint, 0, 0, 0, 0); gl.enable(gl.DEPTH_TEST); }
    gl.depthMask(true); gl.disable(gl.BLEND);
    // view model
    if (G.phase === 'game' && me && !this.third && !me.spectator && !G.dancers.has(me.id)) {
      gl.clear(gl.DEPTH_BUFFER_BIT); const bv = this.bv; bv.reset();
      const vproj = M4.persp(70 * D2R, W / H, .01, 10); const vview = M4.lookAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 });
      gfx.setU(M4.mul(vproj, vview), { x: 0, y: 0, z: 0 }, 100, 200);
      const sw = me.swingT > 0 ? Math.sin((1 - me.swingT / 6) * Math.PI) : 0; const bobx = Math.sin(this.bobP || 0) * .03 * (this.bobA || 0), boby = -Math.abs(Math.cos(this.bobP || 0)) * .03 * (this.bobA || 0);
      const id = me.inv[me.sel] ? me.inv[me.sel].id : null;
      let m = M4.T(M4.id(), -.42 + bobx - sw * .1, -.48 + boby + sw * .1, .7 + sw * .1);
      const eq = Math.max(0, (UI.equip || 0)); m = M4.T(m, 0, -eq * .5, 0);
      if (id) {
        let im = M4.T(m, -.08, .02, .15); im = M4.S(im, .6, .6, .6);
        if (ITEMS[id].use === 'shield') { im = M4.RY(im, me.blocking ? .9 : 1.3); if (me.blocking) im = M4.T(im, -.2, .15, 0); }
        else if (ITEMS[id].use === 'bow' && me.drawT > 0) { const V = [.05, .22, 0, 1.45, -.35, -.25]; im = M4.T(im, V[0], V[1], V[2]); im = M4.RY(im, V[4]); im = M4.RX(im, V[3]); im = M4.RZ(im, V[5]); const sh = me.drawT >= 20 ? Math.sin(G.tick * 1.3) * .006 : 0; im = M4.T(im, sh, 0, sh); } // drawing: arrow points forward
        else if (ITEMS[id].use === 'crossbow') { im = M4.RZ(im, .5); im = M4.RX(im, .2 - sw); }
        else { im = M4.RX(im, .55 - sw * 1.3); im = M4.RZ(im, .35); im = M4.RY(im, .3); }
        this.drawItem(bv, im, id, true, me.drawT || 0);
      }
      else { let am = M4.T(m, -.05, -.08, .1); am = M4.RX(am, -1.25 - sw * .8); am = M4.RY(am, -.35); const sk = SKIN.get(me.skin);
        if (sk) { const sb = this.bs; sb.reset(); let a2 = M4.RX(am, Math.PI / 2); a2 = M4.S(a2, .03, .03, .03); const aw = sk.slim ? 3 : 4; sb.skinBox(a2, -aw / 2, -12, -2, aw / 2, 2, 2, 40, 16, aw, 14, 4, [1, 1, 1]); gfx.bind(sk.tex); gfx.drawBatch(sb); gfx.bind(); }
        else bv.box(am, -.06, -.06, -.1, .06, .06, .45, [.8, .6, .45]); }
      if (me.off && ITEMS[me.off.id].use === 'shield') { let om = M4.T(M4.id(), .5, -.55 + (me.blocking ? .2 : 0), .7 - (me.blocking ? .15 : 0)); om = M4.RY(om, me.blocking ? .5 : .1); this.drawItem(bv, om, me.off.id, true); }
      if (me.hurtTime > 0) gl.uniform4f(gfx.u.uTint, .8, 0, 0, .3 * me.hurtTime / 10);
      gfx.drawBatch(bv); gl.uniform4f(gfx.u.uTint, 0, 0, 0, 0);
    }
  },
  // world ray through a screen point (CSS px of the canvas)
  rayAt(sx, sy) {
    const c = this.cam; if (!c) return null; const w = this.cv.clientWidth, h = this.cv.clientHeight; const nx = 2 * sx / w - 1, ny = 1 - 2 * sy / h; const t = Math.tan(c.fov * D2R / 2);
    const f = lookVec(c.yaw, c.pitch); let rx = -f.z, rz = f.x; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const ux = -rz * f.y, uy = rz * f.x - rx * f.z, uz = rx * f.y; // up = right x forward
    const dx = f.x + rx * nx * t * c.asp + ux * ny * t, dy = f.y + uy * ny * t, dz = f.z + rz * nx * t * c.asp + uz * ny * t; const l = Math.hypot(dx, dy, dz);
    return { o: c.eye, d: { x: dx / l, y: dy / l, z: dz / l } };
  },
  project(x, y, z) { const m = this.vp; const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15]; if (cw <= .1) return null; return { x: (cx / cw * .5 + .5) * this.cv.clientWidth, y: (1 - (cy / cw * .5 + .5)) * this.cv.clientHeight, d: cw }; },
};
