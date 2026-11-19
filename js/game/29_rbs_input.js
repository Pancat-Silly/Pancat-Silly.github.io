// ===================== Random Block Survival: input (keyboard / mouse / touch) and per-tick actions =====================
const RIN = {
  keys: {}, lmb: false, rmb: false, atkQ: 0, useQ: 0, target: null, wTap: 0, sprintT: false, mineDelay: 0, placeCd: 0,
  touch: { f: 0, s: 0, jump: false, sneak: false, sprint: false, hold: false, use: false },
  bind(cv) {
    addEventListener('keydown', e => this.key(e, true)); addEventListener('keyup', e => this.key(e, false));
    cv.addEventListener('mousedown', e => { RAU.init(); if (RUI.gui || RUI.paused) return; if (!document.pointerLockElement && !RUI.mobile) { this.lock(); return; } if (e.button === 0) { this.lmb = true; this.atkQ++; } if (e.button === 2) { this.rmb = true; this.useQ++; } if (e.button === 1) this.pick(); });
    addEventListener('mouseup', e => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (document.pointerLockElement !== cv || RUI.gui) return; const k = .0022 * RUI.sens; const me = RG.me; me.yaw += e.movementX * k; me.pitch = clamp(me.pitch + e.movementY * k, -1.55, 1.55); });
    addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); return; } if (RUI.gui || !document.pointerLockElement) return; const me = RG.me; if (me.spectator) { RUI.specNext(e.deltaY > 0 ? 1 : -1); return; } me.sel = (me.sel + (e.deltaY > 0 ? 1 : 8)) % 9; }, { passive: false });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && !RUI.gui && !RUI.chatOpen && !RUI.mobile && RUI.started) RUI.pause(true); });
    addEventListener('blur', () => { this.keys = {}; this.lmb = this.rmb = false; });
    addEventListener('message', e => { const m = e.data; if (m && m.site && m.t === 'blur') { this.keys = {}; this.lmb = this.rmb = false; if (document.pointerLockElement) document.exitPointerLock(); } });
  },
  lock() { const cv = $('rcv'); try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } if (RUI.autoFs && !RUI.mobile) SITE.toParent({ t: 'fs', lock: true }); },
  key(e, down) {
    if (e.ctrlKey && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'KeyW', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) e.preventDefault();
    if (RUI.chatOpen || RUI.promptOpen) { if (down && e.code === 'Escape') RUI.closeChat(); return; }
    const c = e.code; if (down && (c === 'Tab' || c === 'Space' || c === 'F5' || c === 'F1' || c.startsWith('Arrow'))) e.preventDefault();
    if (RUI.gui) { if (down && (c === 'Escape' || c === 'KeyE')) { RUI.close(); e.preventDefault(); } if (down && /^Digit[1-9]$/.test(c)) RUI.hotkey(+c.slice(5) - 1); if (down && c === 'KeyQ') RUI.dropHover(e.ctrlKey); return; }
    if (RUI.paused) { if (down && c === 'Escape') RUI.pause(false); return; }
    this.keys[c] = down; const me = RG.me;
    if (!down) { if (c === 'Tab') RUI.tab(false); return; }
    if (c === 'KeyW' && !e.repeat) { const n = performance.now(); if (n - this.wTap < 280) this.sprintT = true; this.wTap = n; }
    if (/^Digit[1-9]$/.test(c)) { if (me.spectator) RUI.specJump(+c.slice(5) - 1); else me.sel = +c.slice(5) - 1; }
    if (c === 'KeyE' && !me.spectator) RUI.open('inv');
    if (c === 'KeyQ') this.drop(e.ctrlKey);
    if (c === 'KeyF') this.swapOff();
    if (c === 'F5' || c === 'KeyV') { if (me.spectator && RUI.follow) RUI.followThird = !RUI.followThird; else RR.third = (RR.third + 1) % 3; }
    if (c === 'KeyT' || c === 'Enter') { e.preventDefault(); RUI.openChat(); }
    if (c === 'Slash') { e.preventDefault(); RUI.openChat('/'); }
    if (c === 'Tab') RUI.tab(true);
    if (c === 'KeyM') RUI.open('menu');
    if (c === 'Escape') RUI.pause(true);
    if (c === 'F1') RUI.hideHud = !RUI.hideHud;
  },
  // ---------- per tick ----------
  apply(me) {
    const K = this.keys, T = this.touch; const inp = me.inp;
    if (RUI.gui || RUI.paused || RUI.chatOpen) { inp.f = inp.s = 0; inp.jump = false; inp.sprint = false; if (!RUI.mobile) inp.sneak = false; this.lmb = this.rmb = false; }
    else {
      inp.f = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) + T.f; inp.s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + T.s; inp.jump = !!K.Space || T.jump; inp.sneak = !!(K.ShiftLeft || K.ShiftRight) || T.sneak;
      inp.sprint = !!(K.ControlLeft || K.ControlRight) || this.sprintT || T.sprint; if (inp.f <= 0) this.sprintT = false;
    }
    if (me.spectator) { if (inp.sneak && RUI.follow && !this._sn) { RUI.follow = null; } this._sn = inp.sneak; if (this.atkQ) { this.atkQ = 0; RUI.specNext(1); } if (this.useQ) { this.useQ = 0; RUI.specNext(-1); } return; }
    this.target = this.pickTarget(me);
    // attack (one hit per click / tap; Bedrock has no attack cooldown)
    if (this.atkQ) { this.atkQ = 0; if (this.target && this.target.ent) me.tryAttack(this.target.ent); else me.swingAnim(); }
    // mining
    const T2 = this.target; const holding = this.lmb || T.hold;
    if (this.mineDelay > 0) this.mineDelay--;
    if (holding && T2 && T2.block && me.alive && !this.mineDelay) {
      const [x, y, z] = RW.mc(T2.x, T2.y, T2.z); const id = RW.w.get(T2.x, T2.y, T2.z), B = BL[id];
      if (RG.canEdit(x, y, z) && !B.unbreak && !B.liquid) {
        if (!me.dig || me.dig.x !== x || me.dig.y !== y || me.dig.z !== z) me.dig = { x, y, z, p: 0, t: 0 };
        me.dig.p += B.hard <= 0 ? 1 : me.breakSpeed(B); me.dig.t++; if (me.dig.t % 4 === 0) { me.swingAnim(); RAU.blk('hit', B.snd, RW.P(x + .5, y + .5, z + .5)); RG.hitParts(x, y, z, RW.getM(x, y, z)); }
        if (me.dig.p >= 1) { RG.breakBlock(me, x, y, z); me.dig = null; this.mineDelay = 5; }
      } else { me.dig = null; if (me.tickN = (me.tickN || 0) + 1, me.tickN % 5 === 0) me.swingAnim(); }
    } else me.dig = null;
    // use / place
    if (this.placeCd > 0) this.placeCd--;
    const useHeld = this.rmb || T.use;
    if (this.useQ) { this.useQ = 0; this.use(me, true); } else if (useHeld && !this.placeCd && !me.useT) this.use(me, false);
    // eating
    const s = me.held(), I = s && RIT[s.id];
    if (me.useT) { if (!useHeld || !I || !I.food) me.useT = 0; else { me.useT++; if (me.useT % 4 === 0) RAU.at('eat', me); if (me.useT >= 32) { me.food = Math.min(20, me.food + I.food[0]); me.sat = Math.min(me.food, me.sat + I.food[1]); if (I.gold) { me.addEff('regeneration', 1, 5); me.addEff('absorption', 0, 120); } s.n--; if (!s.n) me.inv[me.sel] = null; me.useT = 0; RAU.at('burp', me); } } }
    // shield: raised while holding use with nothing usable in hand, or while sneaking (Bedrock)
    if (me.shieldCd > 0) me.shieldCd--;
    const sh = me.off && RIT[me.off.id] && RIT[me.off.id].shield && !me.shieldCd; const handUse = I && (I.place || I.food || I.use);
    me.blocking = !!(sh && ((useHeld && !handUse) || me.sneaking));
  },
  after(me) { },
  pickTarget(me) {
    const eye = { x: me.x, y: me.y + me.eye, z: me.z }; const d = lookVec(me.yaw, me.pitch);
    const bh = RW.w.ray(eye, d, 6, B => (B.solid || B.cross || (!B.full && B.boxes) || B.cut || B.use) && !B.liquid && !B.invisible);
    let best = null, bt = 3.2; // entity reach
    for (const p of RG.players()) { if (p === me || p.spectator || p.alive === false) continue; const t = rayAABB(eye, d, p, bt, .1); if (t !== null && t < bt) { bt = t; best = p; } }
    if (best && (!bh || bt < bh.t)) return { ent: best };
    if (bh) return Object.assign({ block: true }, bh); return null;
  },
  use(me, click) {
    if (!me.alive) return; const T = this.target; const s = me.held(); const I = s && RIT[s.id];
    if (T && T.block && click && !me.sneaking) { const [x, y, z] = RW.mc(T.x, T.y, T.z); if (RUI.interact(x, y, z)) return; }
    if (I && I.place && T && T.block) {
      const [hx, hy, hz] = RW.mc(T.x, T.y, T.z); const hb = BL[RW.w.get(T.x, T.y, T.z)];
      let px = hx, py = hy, pz = hz; if (!hb.repl || hb.air) { px += T.nx; py += T.ny; pz += T.nz; }
      if (!BL[RW.getM(px, py, pz)].repl) return; if (!RG.canEdit(px, py, pz)) return;
      let key = I.place; const dx = -Math.sin(me.yaw), dz = Math.cos(me.yaw); const facePl = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
      if (key === 'log') key = 'log|' + I.wood + '|' + (T.nx ? 'x' : T.nz ? 'z' : 'y');
      else if (key === 'furnace' || key === 'blast_furnace' || key === 'chest') key += '|' + facePl;
      else if (key === 'anvil') key = 'anvil|' + (Math.abs(dx) > Math.abs(dz) ? 'z' : 'x');
      else if (key === 'ladder') { if (T.ny) return; key = 'ladder|' + (T.nx > 0 ? 'e' : T.nx < 0 ? 'w' : T.nz > 0 ? 's' : 'n'); }
      if (RG.placeBlock(me, px, py, pz, key)) { me.swingAnim(); s.n--; if (!s.n) me.inv[me.sel] = null; this.placeCd = 4; }
      return;
    }
    if (!click && !(I && I.food)) return;
    if (I && I.use === 'throw') { RG.throwProj(me, I.proj); s.n--; if (!s.n) me.inv[me.sel] = null; me.swingAnim(); this.placeCd = 5; return; }
    if (I && I.food && !me.useT) { me.useT = 1; return; }
    if (I && I.menu) { RUI.menuAct(I.menu); this.placeCd = 6; return; }
    if (I && I.use === 'book') RUI.open('book');
  },
  drop(all) { const me = RG.me; if (me.spectator || !me.alive) return; const s = me.held(); if (!s || (RIT[s.id] && RIT[s.id].menu)) return; const n = all ? s.n : 1; const d = lookVec(me.yaw, me.pitch); RG.dropStack(Object.assign({}, s, { n }), me.x, me.y + me.eye - .3, me.z, d.x * .3, d.y * .3 + .1, d.z * .3, true); s.n -= n; if (!s.n) me.inv[me.sel] = null; me.swingAnim(); },
  swapOff() { const me = RG.me; const s = me.held(); if (s && !(RIT[s.id] && RIT[s.id].shield)) return; const o = me.off; me.off = s || null; me.inv[me.sel] = o || null; },
  pick() { },
  // ---------- touch ----------
  bindTouch() {
    const el = $('rbTouch'); if (!el) return; const T = this.touch; const me = () => RG.me; let joy = null, look = null;
    const stick = $('rbJoy'), knob = $('rbKnob');
    el.addEventListener('touchstart', e => { RAU.init(); for (const t of e.changedTouches) {
      const tgt = t.target; if (tgt.closest && tgt.closest('.rtb')) continue;
      if (t.clientX < innerWidth * .4 && !joy) { joy = { id: t.identifier, x: t.clientX, y: t.clientY }; stick.style.display = 'block'; stick.style.left = (t.clientX - 60) + 'px'; stick.style.top = (t.clientY - 60) + 'px'; knob.style.transform = 'translate(0,0)'; }
      else if (!look) { look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now(), moved: 0 }; look.timer = setTimeout(() => { if (look && look.moved < 12) T.hold = true; }, 280); }
    } e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', e => { for (const t of e.changedTouches) {
      if (joy && t.identifier === joy.id) { let dx = t.clientX - joy.x, dy = t.clientY - joy.y; const l = Math.hypot(dx, dy); const m = 50; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; T.s = dx / m; T.f = -dy / m; T.sprint = -dy / m > .95; }
      if (look && t.identifier === look.id) { const dx = t.clientX - look.x, dy = t.clientY - look.y; look.x = t.clientX; look.y = t.clientY; look.moved += Math.abs(dx) + Math.abs(dy); const k = .0045 * RUI.sens; me().yaw += dx * k; me().pitch = clamp(me().pitch + dy * k, -1.55, 1.55); }
    } e.preventDefault(); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) {
      if (joy && t.identifier === joy.id) { joy = null; T.f = T.s = 0; T.sprint = false; stick.style.display = 'none'; }
      if (look && t.identifier === look.id) { clearTimeout(look.timer); const short = performance.now() - look.t < 280 && look.moved < 12; if (short && !T.hold) { // tap: hit what's in the crosshair, otherwise use / place
          const tg = RG.me.spectator ? null : this.pickTarget(RG.me); if (tg && tg.ent) this.atkQ++; else this.useQ++; }
        T.hold = false; look = null; }
    } };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    const btn = (id, down, up) => { const b = $(id); if (!b) return; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); RAU.init(); down(); b.classList.add('on'); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); if (up) up(); b.classList.remove('on'); }, { passive: false }); };
    btn('rtJump', () => T.jump = true, () => T.jump = false);
    btn('rtSneak', () => { T.sneak = !T.sneak; $('rtSneak').classList.toggle('lit', T.sneak); });
    btn('rtAtk', () => this.atkQ++);
    btn('rtUse', () => { this.useQ++; T.use = true; }, () => T.use = false);
    btn('rtInv', () => RUI.open('inv')); btn('rtDrop', () => this.drop(false)); btn('rtChat', () => RUI.openChat()); btn('rtPause', () => RUI.pause(true)); btn('rtMenu', () => RUI.open('menu'));
    btn('rtView', () => { if (RG.me.spectator && RUI.follow) RUI.followThird = !RUI.followThird; else RR.third = (RR.third + 1) % 3; });
    btn('rtTab', () => RUI.tab(true), () => RUI.tab(false));
    btn('rtLand', () => RUI.toggleLand());
  },
};
