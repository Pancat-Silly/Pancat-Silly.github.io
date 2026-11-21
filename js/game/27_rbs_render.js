// ===================== Random Block Survival: renderer =====================
const RR = {
  gfx: null, third: 0, cam: null,
  init(cv) {
    this.cv = cv; this.gfx = new Gfx(cv); const g = this.gfx; g.atlasCv = RTEX.cv; for (let i = 0; i < 10; i++) RTEX.T('destroy_stage_' + i); g.refreshAtlas(); RTEX.dirty = false; R.gfx = g; // skins (02b_skin) upload through R.gfx
    this.bo = new Batch(); this.bt = new Batch(20000); this.bs = new Batch(6000); this.bh = new Batch(6000);
    // first mesh: every chunk that has blocks
    const W = RW.w; const seen = new Set(); const b = W.b; const sx = W.sx, sz = W.sz;
    for (let i = 0; i < b.length; i++) if (b[i]) { const x = i % sx, z = Math.floor(i / sx) % sz, y = Math.floor(i / (sx * sz)); seen.add(((y / CH | 0) * W.cz + (z / CH | 0)) * W.cx + (x / CH | 0)); }
    for (const k of seen) W.dirty.add(k);
    this.signTex = [];
  },
  // ---------- visibility ----------
  // The areas sit one above another in the same world (arena y200+, playground 84-105, deathmatch 61-81, lobby 29-43, winner podium 5-16).
  // Only the band the camera is in is drawn (blocks, players, items, particles); between bands (nothing is built there) everything is.
  // Inside a band, chunks outside the view frustum or past the fog are skipped too.
  ZONES: [[190, 1e9], [82, 125], [55, 82], [22, 55], [-1e9, 22]],
  zoneOf(y) { const Z = this.ZONES; for (let i = 0; i < Z.length; i++) if (y >= Z[i][0] && y < Z[i][1]) return i; return -1; },
  sameZone(y) { const z = this.camZ; return z === undefined || z < 0 || this.zoneOf(y) === z; },
  planes(m) { const r = i => [m[i], m[4 + i], m[8 + i], m[12 + i]], R0 = r(0), R1 = r(1), R2 = r(2), R3 = r(3), P = [];
    for (const [a, s] of [[R0, 1], [R0, -1], [R1, 1], [R1, -1], [R2, 1], [R2, -1]]) P.push([R3[0] + s * a[0], R3[1] + s * a[1], R3[2] + s * a[2], R3[3] + s * a[3]]); return P; },
  boxVis(x0, y0, z0, x1, y1, z1) { const F = this.fr; if (!F) return true; for (const p of F) if (p[0] * (p[0] > 0 ? x1 : x0) + p[1] * (p[1] > 0 ? y1 : y0) + p[2] * (p[2] > 0 ? z1 : z0) + p[3] < 0) return false; return true; },
  chunkVis(k) { const W = RW.w, cx = k % W.cx, cz = Math.floor(k / W.cx) % W.cz, cy = Math.floor(k / (W.cx * W.cz)); const y0 = cy * CH, y1 = y0 + CH;
    const z = this.camZ; if (z >= 0) { const Z = this.ZONES[z]; if (y1 <= Z[0] || y0 >= Z[1]) return false; }
    const x0 = cx * CH, z0 = cz * CH, e = this.cam.eye;
    if (z === 0) { const rd = RUI.rdist || 8; if (Math.max(Math.abs(cx - Math.floor(e.x / CH)), Math.abs(cz - Math.floor(e.z / CH)), Math.abs(cy - Math.floor(e.y / CH))) > rd) return false; } /* 설정 '경기장 렌더 거리' (chunks around the camera's chunk) */ const dx = Math.max(x0 - e.x, 0, e.x - x0 - CH), dy = Math.max(y0 - e.y, 0, e.y - y1), dz = Math.max(z0 - e.z, 0, e.z - z0 - CH); if (dx * dx + dy * dy + dz * dz > this.fogB * this.fogB) return false;
    return this.boxVis(x0, y0, z0, x0 + CH, y1, z0 + CH); },
  // particles are only made where this player can see them (same area, close, roughly on screen): a round start breaks the
  // blocks around every spawn at once, which used to build thousands of particles nobody could see
  fxOk(x, y, z) { const pm = RUI.pmax === undefined ? 3000 : RUI.pmax; if (RG.parts.length >= pm) return false; if (!this.cam) return true; if (!this.sameZone(y)) return false; /* 설정 '파티클' = max count */ const e = this.cam.eye; if ((x - e.x) ** 2 + (y - e.y) ** 2 + (z - e.z) ** 2 > 32 * 32) return false; const m = 1.5; return this.boxVis(x - m, y - m, z - m, x + m, y + m, z + m); },
  rebuild(max = 99) { const W = RW.w; let n = 0; for (const k of [...W.dirty]) { if (n++ >= max) break; W.dirty.delete(k); const cx = k % W.cx, cz = Math.floor(k / W.cx) % W.cz, cy = Math.floor(k / (W.cx * W.cz)); this.gfx.upload(k, RMESH.chunk(W, cx, cy, cz)); } },
  // box with a tile per face [S,N,W,E,U,D] (block items, held blocks)
  boxT(b, m, x0, y0, z0, x1, y1, z1, tiles, col = [1, 1, 1], a = 1) {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(p => m ? M4.tp(m, p[0], p[1], p[2]) : p);
    const F = [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [7, 6, 2, 3], [0, 1, 5, 4]], S = [.8, .8, .6, .6, 1, .5];
    for (let f = 0; f < 6; f++) { const q = F[f]; b.quad(c[q[0]], c[q[1]], c[q[2]], c[q[3]], tUV(tiles[f]), [col[0] * S[f], col[1] * S[f], col[2] * S[f]], a); }
  },
  itemTiles(id) { const I = RIT[id]; if (!I) return null; if (I.block) { const B = BL[RBLK.K(I.block)]; return B && !B.air ? { block: B } : null; } if (I.tex) return { sprite: RTEX.T(I.tex.includes('/') ? I.tex : I.tex) }; return null; },
  // flat sprite (front + back) in local xy plane, size 1, centered
  sprite(b, m, tile, col = [1, 1, 1]) { const [u0, v0, s] = tUV(tile); const p = (x, y) => M4.tp(m, x, y, 0); const P = [p(-.5, -.5), p(.5, -.5), p(.5, .5), p(-.5, .5)];
    b.quadUV(P[0], P[1], P[2], P[3], u0, v0, u0 + s, v0 + s, col); b.quadUV(P[1], P[0], P[3], P[2], u0 + s, v0, u0, v0 + s, col.map(c => c * .8)); },
  drawItem(b, m, id, scale = 1) {
    const T = this.itemTiles(id); if (!T) { if (RIT[id] && RIT[id].img) { const mm = M4.S(m, scale, scale, scale); this.sprite(b, mm, RTEX.T('item/book')); } return; }
    if (T.block) { const B = T.block; const s = .25 * scale; if (B.full || B.use === 'chest') this.boxT(b, m, -s, -s, -s, s, s, s, B.tiles); else this.boxT(b, m, -s, -s, -s, s, 0, s, B.tiles); }
    else this.sprite(b, M4.S(m, .5 * scale, .5 * scale, .5 * scale), T.sprite);
  },
  // victory cutscene: winners dance one of the shared clips; the phase start time picks it, so every client shows the same dance in sync
  danceOf(e) { const gs = RG.gs; if (gs.ph !== 'win' || !gs.win || !gs.win.ids.includes(e.id)) return null; const nm = DANCE.pick(Math.floor(gs.t / 1000)); return nm ? DANCE.pose(nm, Math.max(0, RG.hostNow() - gs.t - 600) / 1000) : null; },
  ARMC: { iron: [.85, .85, .85], golden: [.98, .82, .25], diamond: [.35, .9, .88] },
  drawPlayer(b, e, alpha, sb, sk) {
    const x = e.local ? lerp(e.px, e.x, alpha) : e.x, y = e.local ? lerp(e.py, e.y, alpha) : e.y, z = e.local ? lerp(e.pz, e.z, alpha) : e.z; const k = .9375 / 16;
    const hurt = e.hurtTime > 0; const tint = c => hurt ? [Math.min(1, c[0] * .6 + .5), c[1] * .5, c[2] * .5] : c;
    const sneak = e.sneaking; const swingP = e.swingT > 0 ? 1 - e.swingT / 6 : 0;
    if (e._af !== this.frameN) { e._af = this.frameN; const ft = Math.min(5, (this.dt || 16.7) / 50); let dt; if (e.local) dt = Math.hypot(e.x - e.px, e.z - e.pz); else { dt = e._lx === undefined ? 0 : Math.hypot(e.x - e._lx, e.z - e._lz) / Math.max(ft, .05); e._lx = e.x; e._lz = e.z; } const tg = Math.min(1, dt * 4); e.walkA = (e.walkA || 0) + (tg - (e.walkA || 0)) * (1 - Math.pow(.6, ft)); e.walkP = (e.walkP || 0) + e.walkA * ft; }
    const legA = Math.cos(e.walkP * .6662) * 1.4 * e.walkA, armA = Math.cos(e.walkP * .6662) * e.walkA;
    let base = M4.T(M4.id(), x, y, z); base = M4.RY(base, -e.yaw); base = M4.S(base, k, k, k); if (sneak) base = M4.T(base, 0, -2, 0);
    const D = this.danceOf(e); if (D) { base = M4.RY(base, D.yaw); base = M4.T(base, D.off[0], D.off[1], D.off[2]); } // winner dance (shared clips, js/game/01b_dance.js)
    const S = !!(sb && sk); const W1 = tint([1, 1, 1]);
    const ids = e.local ? e.armor.map(a => a ? a.id : '') : (e.armorIds || []); const ac = i => { const id = ids[i]; if (!id) return null; const t = id.split('_')[0]; return this.ARMC[t] || [.8, .8, .8]; };
    const part = (m, x0, y0, z0, x1, y1, z1, uv, ov, flat, front) => { if (S) { const w = x1 - x0, h = y1 - y0, d = z1 - z0; sb.skinBox(m, x0, y0, z0, x1, y1, z1, uv[0], uv[1], w, h, d, W1); if (ov) { const g = ov[2] || .25; sb.skinBox(m, x0 - g, y0 - g, z0 - g, x1 + g, y1 + g, z1 + g, ov[0], ov[1], w, h, d, W1); } } else b.box(m, x0, y0, z0, x1, y1, z1, tint(flat), 0, front === undefined ? -1 : front); };
    const armor = (m, x0, y0, z0, x1, y1, z1, c) => { if (c) b.box(m, x0, y0, z0, x1, y1, z1, tint(c)); };
    for (const sd of [-1, 1]) { let m = M4.T(base, sd * 2, 12, sneak ? -2 : 0); m = D ? DANCE.rot(m, sd < 0 ? D.rleg : D.lleg) : M4.RX(m, sd * legA); part(m, -2, -12, -2, 2, 0, 2, sd < 0 ? [0, 16] : [16, 48], sd < 0 ? [0, 32] : [0, 48], [.25, .25, .6]); armor(m, -2.5, -9, -2.5, 2.5, .3, 2.5, ac(2)); armor(m, -2.6, -12.3, -2.6, 2.6, -8.5, 2.6, ac(3)); }
    let bm = M4.T(base, 0, 12, 0); if (sneak) bm = M4.RX(bm, .5); if (D) bm = DANCE.rot(bm, D.body);
    part(bm, -4, 0, -2, 4, 12, 2, [16, 16], [16, 32], [.1, .65, .7]); armor(bm, -4.6, -.3, -2.6, 4.6, 12.4, 2.6, ac(1));
    const slim = S && sk.slim, aw = slim ? 3 : 4, ao = slim ? 5.5 : 6; const held = e.local ? (e.held() ? e.held().id : '') : e.heldId; const off = e.local ? (e.off ? e.off.id : '') : e.offId;
    for (const sd of [-1, 1]) {
      let m = M4.T(bm, sd * ao, 10, 0); let ax = -sd * armA; if (sd === -1 && swingP > 0) ax -= Math.sin(swingP * Math.PI) * 1.4; if (sd === 1 && e.blocking) ax = -.9; if (sd === -1 && (e.useT || e.using)) ax = -1.1;
      m = D ? DANCE.rot(m, sd < 0 ? D.rarm : D.larm) : M4.RX(m, ax); part(m, -aw / 2, -10, -2, aw / 2, 2, 2, sd < 0 ? [40, 16] : [32, 48], sd < 0 ? [40, 32] : [48, 48], [.8, .6, .45]); armor(m, -aw / 2 - .6, -3, -2.6, aw / 2 + .6, 2.6, 2.6, ac(1));
      const iid = sd === -1 ? held : off; if (iid) { let im = M4.T(m, 0, -10, -1); im = M4.S(im, 16 / .9375, 16 / .9375, 16 / .9375); im = M4.RX(im, -Math.PI / 2); if (RIT[iid] && !RIT[iid].block) { im = M4.RY(im, Math.PI / 2); im = M4.T(im, 0, .25, 0); im = M4.RZ(im, -.7); } this.drawItem(b, im, iid, .8); }
    }
    let hm = M4.T(bm, 0, 12, 0); if (sneak) hm = M4.RX(hm, -.5); hm = D ? DANCE.rot(hm, D.head) : M4.RX(hm, e.pitch);
    if (S) part(hm, -4, 0, -4, 4, 8, 4, [0, 0], [32, 0, .5]); else { b.box(hm, -4, 0, -4, 4, 8, 4, tint([.8, .6, .45])); b.box(hm, -4.2, 6, -4.2, 4.2, 8.3, 4.2, tint([.25, .17, .08])); b.box(hm, -2.5, 3.5, 4.01, -1, 4.5, 4.05, [.3, .3, .8]); b.box(hm, 1, 3.5, 4.01, 2.5, 4.5, 4.05, [.3, .3, .8]); }
    armor(hm, -4.7, 4.2, -4.7, 4.7, 8.8, 4.7, ac(0));
  },
  // ---------- frame ----------
  // victory cutscene (win phase): the camera stays straight in front of the winner on the podium and slowly moves in from far and high.
  // Same timeline on every client (host clock); nobody is moved by it, the HUD hides (body.rbcut) and input is ignored.
  cutCam() {
    const gs = RG.gs; if (gs.ph !== 'win') return null; const t = clamp((RG.hostNow() - gs.t) / 7000, 0, 1), e = t * t * (3 - 2 * t);
    const c = RW.P(RV.podium[0], RV.podium[1], RV.podium[2]); const hx = c.x, hy = c.y + 1.5, hz = c.z; // the winner's head; they face +x (the audience)
    const a = 0, r = lerp(9, 3.4, e), h = lerp(3, .2, e); // always facing the winner head-on
    const eye = { x: hx + Math.cos(a) * r, y: hy + h, z: hz + Math.sin(a) * r }; const dx = hx - eye.x, dy = hy - eye.y, dz = hz - eye.z;
    return { eye, yaw: Math.atan2(-dx, dz), pitch: -Math.atan2(dy, Math.hypot(dx, dz)) };
  },
  frame(alpha, dtMs) {
    if (RTEX.dirty) { RTEX.dirty = false; this.gfx.refreshAtlas(); } // tiles first used after start-up (crack stages, new items)
    this.dt = dtMs; this.frameN = (this.frameN || 0) + 1; const g = this.gfx, gl = g.gl, cv = this.cv; const me = RG.me;
    const dpr = Math.min(window.devicePixelRatio || 1, RUI.mobile ? 1.5 : 2) * (RUI.res || 1); const W = Math.floor(cv.clientWidth * dpr), H = Math.floor(cv.clientHeight * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H); this.rebuild(RG.gs.ph === 'prep' ? 40 : 8);
    for (const r of RG.remotes.values()) { r.interp(); if (r.bots) for (const b of r.bots) b.interp(); }
    // camera: me / third person / spectator following someone
    if (RUI.follow && me.spectator && !RUI.specOk(RG.byId(RUI.follow))) RUI.specNext(1); // the followed player left the match (died, back to the lobby): next one, or free camera
    let eye, yaw, pitch, roll = 0; const fol = RUI.follow ? RG.byId(RUI.follow) : null; const cut = this.cutCam();
    if (cut) { eye = cut.eye; yaw = cut.yaw; pitch = cut.pitch; } // victory cutscene: everyone's camera flies to the winner on the podium
    else if (fol && me.spectator && fol.alive !== false) { const fx = fol.local ? lerp(fol.px, fol.x, alpha) : fol.x, fy = fol.local ? lerp(fol.py, fol.y, alpha) : fol.y, fz = fol.local ? lerp(fol.pz, fol.z, alpha) : fol.z; eye = { x: fx, y: fy + (fol.sneaking ? 1.27 : 1.62), z: fz }; yaw = fol.yaw || 0; pitch = fol.pitch || 0; if (RUI.followThird) { const d = lookVec(yaw, pitch); const h = RW.w.ray(eye, { x: -d.x, y: -d.y, z: -d.z }, 4); const dd = h ? Math.max(.3, h.t - .2) : 4; eye = { x: eye.x - d.x * dd, y: eye.y - d.y * dd, z: eye.z - d.z * dd }; } }
    else {
      eye = { x: lerp(me.px, me.x, alpha), y: lerp(me.py, me.y, alpha) + me.eye, z: lerp(me.pz, me.z, alpha) }; yaw = me.yaw; pitch = me.pitch;
      if (me.hurtTime > 0) roll = Math.sin(me.hurtTime / 10 * Math.PI) * .1;
      const bob = me.onGround && !me.spectator ? Math.hypot(me.x - me.px, me.z - me.pz) : 0; const ft = Math.min(5, dtMs / 50); this.bobP = (this.bobP || 0) + bob * .6 * Math.PI * ft; this.bobA = (this.bobA || 0) + (Math.min(1, bob * 5) - (this.bobA || 0)) * .2;
      if (!this.third && RUI.bob) eye.y += Math.abs(Math.cos(this.bobP)) * .06 * this.bobA;
      if (this.third) { const d = lookVec(yaw, pitch); const sg = this.third === 1 ? -1 : 1; const dir = { x: d.x * sg, y: d.y * sg, z: d.z * sg }; const h = RW.w.ray(eye, dir, 4); const dd = h ? Math.max(.3, h.t - .2) : 4; eye = { x: eye.x + dir.x * dd, y: eye.y + dir.y * dd, z: eye.z + dir.z * dd }; if (this.third === 2) { yaw += Math.PI; pitch = -pitch; } }
    }
    this.cam = { eye, yaw, pitch }; this.camZ = this.zoneOf(eye.y);
    const area = RG.area({ x: eye.x, y: eye.y, z: eye.z }); const nether = area === 'dm' || area === 'dmspec';
    g.sky = nether ? [.33, .08, .06] : area === 'arena' ? [.08, .08, .1] : area === 'winner' ? [.1, .1, .12] : [.53, .72, 1];
    let fov = RUI.fov; this.fovS = lerp(this.fovS || 1, me.sprinting ? 1.12 : 1, .2); fov *= this.fovS;
    const proj = M4.persp(fov * D2R, W / H, .05, 300); const d = lookVec(yaw, pitch);
    const up = { x: Math.sin(roll) * Math.cos(yaw), y: Math.cos(roll), z: Math.sin(roll) * Math.sin(yaw) };
    const vp = M4.mul(proj, M4.lookAt(eye, { x: eye.x + d.x, y: eye.y + d.y, z: eye.z + d.z }, up)); this.vp = vp; this.W = W; this.H = H; this.proj = proj; this.rayF = { d, up, t: Math.tan(fov * D2R / 2), asp: W / H };
    gl.clearColor(g.sky[0], g.sky[1], g.sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let fogA = nether ? 40 : 90, fogB = nether ? 110 : 220; if (this.camZ === 0) { fogB = Math.min(fogB, (RUI.rdist || 8) * CH); fogA = Math.min(fogA, fogB * .6); } /* arena: fog ends at the render distance */ g.setU(vp, eye, fogA, fogB); g.bind();
    this.fr = this.planes(vp); this.fogB = fogB; const vis = new Set(); for (const k of g.chunks.keys()) if (this.chunkVis(k)) vis.add(k); const visF = k => vis.has(k); this.visN = vis.size;
    gl.disable(gl.BLEND); gl.depthMask(true); g.drawChunks('o', eye, visF);
    const b = this.bo; b.reset(); const bt = this.bt; bt.reset();
    // players
    for (const p of RG.players()) {
      if (p.spectator || p.alive === false || !this.sameZone(p.y)) continue; if (p === me && !this.third && !cut) continue; if (fol && p === fol && !RUI.followThird && me.spectator && !cut) continue;
      const sk = SKIN.get(p.skin);
      if (sk) { this.bs.reset(); this.drawPlayer(b, p, alpha, this.bs, sk); g.bind(sk.tex); g.drawBatch(this.bs); g.bind(); } else this.drawPlayer(b, p, alpha);
    }
    // dropped items / xp orbs
    const tt = (RG.tick + alpha);
    for (const e of RG.items.values()) {
      if (!this.sameZone(e.y)) continue;
      if (e.st.id === 'xp') { const s = .08 + Math.min(.08, e.st.n * .006); b.cube(e.x, e.y + .15, e.z, s, [.5 + .4 * Math.sin(tt * .3), 1, .3]); continue; }
      // Minecraft ItemEntityRenderer: spin = (age + partialTick) / 20 rad + a random start angle per item, bob = sin(t / 10 + start) * .1 + .1 (smooth, ticks not frames)
      const hs = e.hs !== undefined ? e.hs : (e.hs = Math.random() * Math.PI * 2), ta = e.age + alpha;
      let m = M4.T(M4.id(), e.x, e.y + .1 + Math.sin(ta / 10 + hs) * .1 + .1, e.z); m = M4.RY(m, ta / 20 + hs); this.drawItem(b, m, e.st.id, .7);
    }
    // falling blocks (sand / gravel / anvil)
    for (const f of RG.falls) { const B = BL[f.id]; if (!B) continue; const P = RW.P(f.x, lerp(f.py, f.y, alpha), f.z); const bx = B.full ? [[0, 0, 0, 1, 1, 1]] : (B.boxes || [[0, 0, 0, 1, 1, 1]]); for (const q of bx) this.boxT(b, null, P.x + q[0], P.y + q[1], P.z + q[2], P.x + q[3], P.y + q[4], P.z + q[5], B.tiles); }
    for (const o of RG.projs) { let m = M4.T(M4.id(), o.x, o.y, o.z); const cy = this.cam.yaw; m = M4.RY(m, -cy); this.sprite(b, M4.S(m, .35, .35, .35), RTEX.T(o.kind === 'xp' ? 'item/experience_bottle' : 'item/splash_potion')); }
    for (const p of RG.parts) { if (b.full()) break; if (p.tex) { const u = p.tex[0] / RTEX.cv.width, v = p.tex[1] / RTEX.cv.width, s = 4 / RTEX.cv.width; const cy = this.cam.yaw; const r = p.s; const ax = Math.cos(cy) * r, az = Math.sin(cy) * r; b.quadUV([p.x - ax, p.y - r, p.z - az], [p.x + ax, p.y - r, p.z + az], [p.x + ax, p.y + r, p.z + az], [p.x - ax, p.y + r, p.z - az], u, v, u + s, v + s, [1, 1, 1]); b.quadUV([p.x + ax, p.y - r, p.z + az], [p.x - ax, p.y - r, p.z - az], [p.x - ax, p.y + r, p.z - az], [p.x + ax, p.y + r, p.z + az], u, v, u + s, v + s, [.8, .8, .8]); } else b.cube(p.x, p.y, p.z, p.s * (p.life < 5 ? p.life / 5 : 1), p.col, 0); }
    // selection outline
    const sel = RIN.target; if (sel && sel.block && !me.spectator) { const [x, y, z] = [sel.x, sel.y, sel.z]; const B = BL[RW.w.get(x, y, z)]; const bx = B.full ? [[0, 0, 0, 1, 1, 1]] : (RW.w.shape(x, y, z, B) || [[0, 0, 0, 1, 1, 1]]); const e = .002, t = .012, c = [.05, .05, .05];
      for (const q of bx) { const x0 = x + q[0] - e, y0 = y + q[1] - e, z0 = z + q[2] - e, x1 = x + q[3] + e, y1 = y + q[4] + e, z1 = z + q[5] + e;
        for (const [a0, a1] of [[[x0, y0, z0], [x1, y0, z0]], [[x0, y1, z0], [x1, y1, z0]], [[x0, y0, z1], [x1, y0, z1]], [[x0, y1, z1], [x1, y1, z1]]]) b.box(null, a0[0], a0[1] - t, a0[2] - t, a1[0], a0[1] + t, a0[2] + t, c);
        for (const [a0, a1] of [[[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]], [[x0, y0, z1], [x0, y1, z1]], [[x1, y0, z1], [x1, y1, z1]]]) b.box(null, a0[0] - t, a0[1], a0[2] - t, a0[0] + t, a1[1], a0[2] + t, c);
        for (const [a0, a1] of [[[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y1, z0], [x0, y1, z1]], [[x1, y1, z0], [x1, y1, z1]]]) b.box(null, a0[0] - t, a0[1] - t, a0[2], a0[0] + t, a0[1] + t, a1[2], c); } }
    g.drawBatch(b);
    // signs (text textures), crack overlay, water
    this.drawSigns();
    gl.enable(gl.BLEND); gl.depthMask(false);
    { // crack overlay (destroy_stage_0..9) for every player digging, fitted to the block's shape
      const D = []; if (me.dig && me.dig.p > 0) D.push([me.dig.x, me.dig.y, me.dig.z, Math.min(9, Math.floor(me.dig.p * 10))]);
      for (const p of RG.players()) { if (p === me) continue; if (p.dig && p.dig.k && p.dig.p > 0) D.push(p.dig.k.split(',').map(Number).concat(Math.min(9, Math.floor(p.dig.p * 10)))); else if (p.dg) D.push(p.dg); }
      if (D.length) { bt.reset(); for (const [x, y, z, st] of D) { const P = RW.P(x, y, z); const B = BL[RW.w.get(P.x, P.y, P.z)]; if (!B || B.air) continue; const tl = RTEX.T('destroy_stage_' + st); const bx = B.full ? [[0, 0, 0, 1, 1, 1]] : (RW.w.shape(P.x, P.y, P.z, B) || [[0, 0, 0, 1, 1, 1]]); const e = .004;
        for (const q of bx) bt.box(null, P.x + q[0] - e, P.y + q[1] - e, P.z + q[2] - e, P.x + q[3] + e, P.y + q[4] + e, P.z + q[5] + e, [1, 1, 1], tl, -1, 1, false); } g.drawBatch(bt); }
    }
    g.drawChunks('t', eye, visF); gl.depthMask(true); gl.disable(gl.BLEND);
    if (me.spectator && !cut) { this.drawGlow(alpha, fol); g.setU(vp, eye, fogA, fogB); g.bind(); }
    // first person hand / held item
    if (!this.third && !cut && !me.spectator && me.alive) this.drawHand(alpha);
    RUI.tags(vp, W / dpr, H / dpr);
  },
  // spectators: players in the match that are far away (12+ blocks) or behind blocks get a white outline drawn through walls
  // (like Minecraft's glowing effect). Stencil: mark the player's silhouette, then draw a slightly grown copy (about 2 px on
  // screen at any distance) only outside it.
  drawGlow(alpha, fol) {
    const g = this.gfx, gl = g.gl; if (!g.stencil) return; const e = this.cam.eye, T = [];
    for (const p of RUI.specList()) { if (!this.sameZone(p.y) || (fol === p && !RUI.followThird)) continue;
      const hx = p.x, hy = p.y + 1.5, hz = p.z, d = Math.hypot(hx - e.x, hy - e.y, hz - e.z); if (d < .5) continue;
      let show = d > 12; if (!show) { const h = RW.w.ray(e, { x: (hx - e.x) / d, y: (hy - e.y) / d, z: (hz - e.z) / d }, d); show = !!(h && h.t < d - .6); }
      if (show) T.push([p, d]); }
    if (!T.length) return;
    const b = this.bg || (this.bg = new Batch(6000)); const px = 2 * Math.tan(RUI.fov * D2R / 2) / this.H * 2.2 * Math.min(window.devicePixelRatio || 1, 2);
    gl.enable(gl.STENCIL_TEST); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.uniform2f(g.u.uFR, 1e5, 2e5); g.bind();
    for (const [p, d] of T) {
      b.reset(); this.drawPlayer(b, p, alpha); if (!b.ni) continue; gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.colorMask(false, false, false, false); gl.stencilFunc(gl.ALWAYS, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); gl.uniform1f(g.u.uFlat, 0); g.drawBatch(b);
      const ex = px * d, cx = p.x, cy = p.y + (p.sneaking ? .75 : .9), cz = p.z, sx = 1 + ex / .4, sy = 1 + ex / .95, v = b.v; // grow around the body centre
      for (let i = 0; i < b.nv; i++) { const o = i * 9; v[o] = cx + (v[o] - cx) * sx; v[o + 1] = cy + (v[o + 1] - cy) * sy; v[o + 2] = cz + (v[o + 2] - cz) * sx; }
      gl.colorMask(true, true, true, true); gl.stencilFunc(gl.NOTEQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); gl.uniform4f(g.u.uTint, 1, 1, 1, 1); gl.uniform1f(g.u.uFlat, 2); g.drawBatch(b);
    }
    gl.disable(gl.STENCIL_TEST); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.uniform1f(g.u.uFlat, 0); gl.uniform4f(g.u.uTint, 0, 0, 0, 0);
  },
  drawHand(alpha) {
    const g = this.gfx, gl = g.gl, me = RG.me; gl.clear(gl.DEPTH_BUFFER_BIT);
    const proj = M4.persp(70 * D2R, this.W / this.H, .01, 10); g.setU(proj, { x: 0, y: 0, z: 0 }, 50, 60); g.bind();
    const b = this.bh; b.reset(); const sw = me.swingT > 0 ? 1 - (me.swingT - alpha) / 6 : 0; const s1 = Math.sin(sw * Math.PI), s2 = Math.sin(Math.sqrt(sw) * Math.PI);
    const bob = Math.cos(this.bobP || 0) * .02 * (this.bobA || 0); const eat = me.useT ? Math.sin(me.useT * .9) * .03 : 0;
    let m = M4.T(M4.id(), .56 - s2 * .25, -.52 + bob - s1 * .15 + (me.useT ? .15 : 0) + eat, -.72 - s1 * .1); const held = me.held();
    if (held) { m = M4.RY(m, -.3 - s2 * .5); m = M4.RX(m, -s1 * .6); const I = RIT[held.id]; if (I && I.block) { m = M4.RY(m, .7); this.drawItem(b, m, held.id, 1.1); } else { m = M4.T(m, .06, .06, 0); m = M4.RY(m, -1.25); m = M4.RZ(m, .4); this.drawItem(b, m, held.id, .78); } }
    else { m = M4.RX(m, -1.2 - s1 * .8); m = M4.RY(m, -.25); const sk = SKIN.get(me.skin); if (sk) { const k = .062; const mm = M4.S(m, k, k, k); this.bs.reset(); this.bs.skinBox(mm, -2, -12, -2, 2, 0, 2, 40, 16, 4, 12, 4, [1, 1, 1]); g.drawBatch(b); b.reset(); g.bind(sk.tex); g.drawBatch(this.bs); g.bind(); return; } b.box(m, -.12, -.75, -.12, .12, 0, .12, [.8, .6, .45]); }
    if (me.off && RIT[me.off.id] && RIT[me.off.id].shield) { let o = M4.T(M4.id(), -.62, -.45 + (me.blocking ? .2 : 0), -.85); o = M4.RY(o, me.blocking ? .9 : 1.3); this.sprite(b, M4.S(o, .7, .7, .7), RTEX.T('item/shield')); }
    g.drawBatch(b);
  },
  // sign texts: drawn into a small canvas texture per sign, a quad just in front of the board.
  // Wall signs face the side stored in their key. Standing signs lost their rotation in the map conversion (every straight
  // one came out as the same axis), so their facing is worked out here once: away from a wall right next to them, else toward
  // the side with the most room; the board block is turned to match and the text goes on both faces of the board.
  signFix() {
    const D = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }, seen = new Set(), out = [];
    for (const s of RB_SIGNS) {
      const [x, y, z] = s, k = x + ',' + y + ',' + z; if (seen.has(k)) continue; seen.add(k);
      const key = RB_KEYS[RW.getM(x, y, z)] || ''; const p = key.split('|');
      if (p[0] === 'wsign') { out.push({ s, f: p[2], stand: false }); continue; }
      if (p[0] !== 'ssign') continue;
      const open = f => { let d = 0; for (; d < 6; d++) { const B = BL[RW.getM(x + D[f][0] * (d + 1), y, z + D[f][1] * (d + 1))]; if (B.solid) break; } return d; };
      const r = { n: open('n'), s: open('s'), w: open('w'), e: open('e') }; const opp = { n: 's', s: 'n', w: 'e', e: 'w' };
      let f = Object.keys(r).find(d => r[d] === 0 && r[opp[d]] > 0); f = f ? opp[f] : Object.keys(r).sort((a, b) => r[b] - r[a])[0];
      const want = 'ssign|' + p[1] + '|' + (f === 'e' || f === 'w' ? 'x' : 'z'), id = RBLK.K(want); if (id && want !== key) RW.setM(x, y, z, id);
      out.push({ s, f, stand: true });
    }
    return out;
  },
  drawSigns() {
    if (!this.signTex.length) { for (const o of this.signs || (this.signs = this.signFix())) { // 256x128 text texture, regular weight, smoothed (LINEAR + mipmaps)
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#1a1208'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = o.s[4].replace(/랜덤블록 서바이벌 V2[^\n]*/g, '랜덤블록 서바이벌').split('\n').slice(0, 4); while (lines.length < 4) lines.push('');
      lines.forEach((l, i) => { const t = l.replace(/§./g, ''); let fs = 24; do { x.font = '500 ' + fs + "px 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"; } while (fs-- > 12 && x.measureText(t).width > 244); x.fillText(t, 128, 18 + i * 30); }); // long lines shrink to fit the board
      if (o.s[4].trim()) this.signTex.push(Object.assign(o, { tex: this.gfx.makeTex(c, true) })); } if (!this.signTex.length) this.signTex.push({ none: true }); }
    const g = this.gfx; const b = this.bs;
    // quad on the face of a board that faces f: wall board = back 2/16 of the cell (y .3-.85), standing board = middle (y .5-1)
    const quad = (P, f, d, y0, y1) => { const o = d + .004;
      if (f === 'n') return [[P.x + 1, y0, P.z + 1 - o], [P.x, y0, P.z + 1 - o], [P.x, y1, P.z + 1 - o], [P.x + 1, y1, P.z + 1 - o]];
      if (f === 's') return [[P.x, y0, P.z + o], [P.x + 1, y0, P.z + o], [P.x + 1, y1, P.z + o], [P.x, y1, P.z + o]];
      if (f === 'w') return [[P.x + 1 - o, y0, P.z], [P.x + 1 - o, y0, P.z + 1], [P.x + 1 - o, y1, P.z + 1], [P.x + 1 - o, y1, P.z]];
      return [[P.x + o, y0, P.z + 1], [P.x + o, y0, P.z], [P.x + o, y1, P.z], [P.x + o, y1, P.z + 1]]; };
    const opp = { n: 's', s: 'n', w: 'e', e: 'w' };
    for (const o of this.signTex) { if (o.none) continue; const [x, y, z] = o.s; const P = RW.P(x, y, z); if (Math.hypot(P.x - this.cam.eye.x, P.y - this.cam.eye.y, P.z - this.cam.eye.z) > 24) continue;
      b.reset();
      if (!o.stand) { const q = quad(P, o.f, 2 / 16, P.y + .3, P.y + .85); b.quadUV(q[0], q[1], q[2], q[3], 0, 0, 1, 1, [1, 1, 1]); }
      else for (const f of [o.f, opp[o.f]]) { const q = quad(P, f, 9 / 16, P.y + .52, P.y + .98); b.quadUV(q[0], q[1], q[2], q[3], 0, 0, 1, 1, [1, 1, 1]); } // board 7/16..9/16: text 1/16 off its faces
      g.bind(o.tex); g.drawBatch(b); }
    g.bind();
  },
  // screen projection for name tags / floating texts
  // direction of the ray through a screen point (sx, sy in 0..1 of the canvas) — touch aiming in 마크 PE mode
  screenDir(sx, sy) { const F = this.rayF; if (!F) return null; const f = F.d, u0 = F.up; let r = { x: f.y * u0.z - f.z * u0.y, y: f.z * u0.x - f.x * u0.z, z: f.x * u0.y - f.y * u0.x }; const rl = Math.hypot(r.x, r.y, r.z) || 1; r = { x: r.x / rl, y: r.y / rl, z: r.z / rl };
    const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x }; const nx = (sx * 2 - 1) * F.t * F.asp, ny = (1 - sy * 2) * F.t;
    const v = { x: f.x + r.x * nx + u.x * ny, y: f.y + r.y * nx + u.y * ny, z: f.z + r.z * nx + u.z * ny }; const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; },
  project(x, y, z) { const m = this.vp; const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15]; if (cw <= .05) return null; return [(cx / cw * .5 + .5), (1 - (cy / cw * .5 + .5)), cw]; },
};
