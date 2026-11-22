// ===================== Random Block Survival: input (keyboard / mouse / touch) and per-tick actions =====================
const RIN = {
  keys: {}, lmb: false, rmb: false, atkQ: 0, useQ: 0, target: null, wTap: 0, sprintT: false, mineDelay: 0, placeCd: 0,
  touch: { f: 0, s: 0, jump: false, sneak: false, sprint: false, hold: false, use: false },
  bind(cv) {
    addEventListener('keydown', e => this.key(e, true)); addEventListener('keyup', e => this.key(e, false));
    cv.addEventListener('mousedown', e => { RAU.init(); if (RUI.gui || RUI.paused) return; if (!document.pointerLockElement && !RUI.mobile) { this.lock(); return; } if (e.button === 0) { this.lmb = true; this.atkQ++; } if (e.button === 2) { this.rmb = true; this.useQ++; } if (e.button === 1) this.pick(); });
    addEventListener('mouseup', e => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
    addEventListener('contextmenu', e => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; e.preventDefault(); }); // right click that opens a menu (핫바 멀티플레이 설정) lands on the menu, not the canvas
    addEventListener('mousemove', e => { if (document.pointerLockElement !== cv || RUI.gui || RG.gs.ph === 'win') return; const k = .0022 * RUI.sens; const me = RG.me; me.yaw += e.movementX * k; me.pitch = clamp(me.pitch + e.movementY * k, -1.55, 1.55); });
    addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); // Ctrl+wheel must not zoom the page, but still scrolls the hotbar (Ctrl = sprint, like 4중인격)
      if (RUI.gui || !document.pointerLockElement) return; const me = RG.me; if (me.spectator) { RUI.specNext(e.deltaY > 0 ? 1 : -1); return; } me.sel = (me.sel + (e.deltaY > 0 ? 1 : 8)) % 9; }, { passive: false });
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement && (RUI.gui || RUI.paused || RUI.chatOpen)) { document.exitPointerLock(); return; } // a late lock must never hide the cursor over a screen
      if (!document.pointerLockElement && !RUI.gui && !RUI.chatOpen && !RUI.paused && !RUI.mobile && RUI.started) RUI.pause(true); }); // already in the menu (e.g. 핫바 멀티플레이 설정 opened page 'multi'): don't reset it to the main page
    addEventListener('blur', () => { this.keys = {}; this.lmb = this.rmb = false; });
    addEventListener('message', e => { const m = e.data; if (m && m.site && m.t === 'blur') { this.keys = {}; this.lmb = this.rmb = false; if (document.pointerLockElement) document.exitPointerLock(); } });
  },
  lock() { const cv = $('rcv'); try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } if (!RUI.mobile && SITE.autoFs()) SITE.toParent({ t: 'fs', lock: true, auto: 1 }); }, // browser fullscreen only (the window keeps its size)
  key(e, down) {
    if (e.ctrlKey && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'KeyW', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) e.preventDefault();
    if (RUI.splash && down) return; // first-run 외부 다운로드 screen is up
    if (!down) this.keys[e.code] = false; // a release is always recorded, even over a menu / chat / gui (or the key stays "held" after closing it)
    if (RUI.chatOpen || RUI.promptOpen) { if (down && e.code === 'Escape') RUI.closeChat(); return; }
    const c = e.code; if (down && (c === 'Tab' || c === 'Space' || c === 'F5' || c === 'F1' || c.startsWith('Arrow'))) e.preventDefault();
    if (RUI.gui) { if (down && (c === 'Escape' || c === 'KeyE')) { RUI.close(); e.preventDefault(); } if (down && /^Digit[1-9]$/.test(c)) RUI.hotkey(+c.slice(5) - 1); if (down && c === 'KeyQ') RUI.dropHover(e.ctrlKey); return; }
    if (RUI.paused) { if (down && c === 'Escape') RUI.menuBack(); return; }
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
    if (c === 'KeyM') RUI.pause(true);
    if (c === 'Escape') RUI.pause(true);
    if (c === 'F1') RUI.hideHud = !RUI.hideHud;
  },
  // ---------- per tick ----------
  apply(me) {
    if (RUI.mobile) RTCTL.tick();
    const K = this.keys, T = this.touch; const inp = me.inp;
    if (RUI.gui || RUI.paused || RUI.chatOpen || RUI.netWait || RUI.splash) { inp.f = inp.s = 0; inp.jump = false; inp.sprint = false; if (!RUI.mobile) inp.sneak = false; this.lmb = this.rmb = false; }
    else {
      inp.f = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) + T.f; inp.s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + T.s; inp.jump = !!K.Space || T.jump; inp.sneak = !!(K.ShiftLeft || K.ShiftRight) || T.sneak;
      inp.sprint = !!(K.ControlLeft || K.ControlRight) || this.sprintT || T.sprint; if (inp.f <= 0) this.sprintT = false;
    }
    if (me.spectator) { if (inp.sneak && RUI.follow && !this._sn) { RUI.follow = null; } this._sn = inp.sneak; if (this.atkQ) { this.atkQ = 0; RUI.specNext(1); } if (this.useQ) { this.useQ = 0; RUI.specNext(-1); } return; }
    if (RG.gs.ph === 'win') { inp.f = inp.s = 0; inp.jump = inp.sneak = inp.sprint = false; this.target = null; this.atkQ = this.useQ = 0; return; } // victory cutscene: no input
    const aim = RUI.mobile ? RTCTL.aimDir() : null; // 마크 PE has no crosshair: nothing is selected until a finger touches the screen
    this.target = RUI.mobile && RTCTL.scheme === 'pe' && !aim ? null : this.pickTarget(me, aim);
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
    if (RUI.mobile) RTCTL.tapDone();
    // eating
    const s = me.held(), I = s && RIT[s.id];
    if (me.useT) { if (!useHeld || !I || !I.food) me.useT = 0; else { me.useT++; if (me.useT % 4 === 0) RAU.at('eat', me); if (me.useT >= 32) { me.food = Math.min(20, me.food + I.food[0]); me.sat = Math.min(me.food, me.sat + I.food[1]); if (I.gold) { me.addEff('regeneration', 1, 5); me.addEff('absorption', 0, 120); } s.n--; if (!s.n) me.inv[me.sel] = null; me.useT = 0; RAU.at('burp', me); } } }
    // shield: raised while holding use with nothing usable in hand, or while sneaking (Bedrock)
    if (me.shieldCd > 0) me.shieldCd--;
    const sh = me.off && RIT[me.off.id] && RIT[me.off.id].shield && !me.shieldCd; const handUse = I && (I.place || I.food || I.use);
    me.blocking = !!(sh && ((useHeld && !handUse) || me.sneaking));
  },
  after(me) { },
  pickTarget(me, dir) { // dir: a touch ray (마크 PE) instead of the crosshair
    const eye = { x: me.x, y: me.y + me.eye, z: me.z }; const d = dir || lookVec(me.yaw, me.pitch);
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

};
