// ===================== Player (local human or bot) =====================
class Player {
  constructor(id, name, persona, job, isBot = false) {
    this.id = id; this.name = name; this.persona = persona; this.job = job; this.isBot = isBot; this.local = true; this.kind = 'player';
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.yaw = 0; this.pitch = 0;
    this.px = 0; this.py = 0; this.pz = 0; // prev tick pos for interpolation
    this.onGround = false; this.fallDist = 0; this.hx = false; this.jumpCd = 0;
    this.effects = {}; this.invul = 0; this.lastHurt = 0; this.hurtTime = 0; this.fire = 0;
    this.inp = { f: 0, s: 0, jump: false, sneak: false, sprint: false, use: false };
    this.sprinting = false; this.sneaking = false; this.attackTimer = 100; this.swing = 0; this.swingT = 0;
    this.blocking = false; this.blockT = 0; this.shieldOff = 0; this.drawT = 0; this.useHeld = false;
    this.deaths = 0; this.spectator = false; this.pad = randi(0, 3); this.alive = true;
    this.lastAtk = null; this.st = {}; // job states
    this.rec = []; this.sel = 0; this.cds = {}; this.cdLen = {};
    this.giveKit(true);
    this.hp = this.maxHp(); this.updAttr();
  }
  get w() { return 0.6 * this.scale; } get h() { return (this.sneaking ? 1.5 : 1.8) * this.scale; } get eye() { return (this.sneaking ? 1.27 : 1.62) * this.scale; }
  giveKit(first) {
    const J = JOBS[this.job]; this.inv = new Array(9).fill(null); this.off = J.off ? mkSlot(J.off) : null;
    J.kit.forEach((k, i) => { if (k) this.inv[i] = mkSlot(k[0], k[1] || 1); });
    this.armorType = J.armor || null; this.bootsBonus = 0; this.st = {}; this.gotShield = false;
    if (first !== false) this.roundItems();
  }
  roundItems() { // items given once per round
    if (this.job === 'suno') this.refillV4();
    if (this.job === 'randomizer') { const r = choice([20, 10, 5, 2, 0]); if (r) this.addItem('arrow', r); else this.msg('§7아쉽지만 다음 기회에'); }
  }
  addItem(id, n = 1) {
    const D = ITEMS[id];
    if (D.use === 'shield' && !this.off) { this.off = mkSlot(id); this.off.dur = 25; this.off.max = 25; return true; }
    if (D.stack || id === 'runsuno') for (const s of this.inv) if (s && s.id === id) { s.count += n; return true; }
    for (let i = 0; i < 9; i++) if (!this.inv[i]) { this.inv[i] = mkSlot(id, n); return true; }
    return false;
  }
  count(id) { let n = 0; for (const s of this.inv) if (s && s.id === id) n += s.count; return n; }
  take(id, n = 1) { for (let i = 0; i < 9; i++) { const s = this.inv[i]; if (s && s.id === id) { s.count -= n; if (s.count <= 0) this.inv[i] = null; return true; } } return false; }
  held() { const s = this.inv[this.sel]; return s ? ITEMS[s.id] : ITEMS.fist; }
  heldSlot() { return this.inv[this.sel]; }
  msg(t) { if (this === G.me) UI.chat(t); }
  title(t, sub, opt) { if (this === G.me) UI.title(t, sub, opt); }
  actionbar(t) { if (this === G.me) UI.actionbar(t); }
  eff(n) { return this.effects[n] ? this.effects[n].amp + 1 : 0; }
  // MC rules: weaker never replaces stronger; same level keeps the longer duration;
  // a stronger-but-shorter effect hides the longer one, which comes back when it ends
  addEff(n, amp, sec, hide) {
    const t = Math.round(sec * 20); const e = this.effects[n];
    if (e && e.t > 0) {
      if (amp < e.amp) return;
      if (amp === e.amp) { if (t > e.t) { e.t = t; e.max = t; } }
      else this.effects[n] = { amp, t, max: t, hidden: e.t > t ? e : (e.hidden || null) };
    } else this.effects[n] = { amp, t, max: t };
    if (n === 'regeneration' && amp >= 200) this.hp = this.maxHp();
  }
  // slime: sprint-jump boost and air control scale with body size like every other slime stat (a 0.5-size slime no longer flies 2x as far as a normal player)
  sizeK() { return this.job === 'slime' ? this.scale : 1; }
  clearEff(n) { if (n) delete this.effects[n]; else this.effects = {}; }
  maxHp() { const J = JOBS[this.job]; const base = this.st && this.st.awaken ? 12 : J && J.maxHp ? J.maxHp : this.job === 'slime' || this.job === 'dude' ? 40 : 20; return base + 4 * this.eff('health_boost') + (this.st && this.st.srHp || 0) + (this.st && this.st.modHp || 0); }
  cdLeft(g) { return Math.max(0, (this.cds[g] || 0) - G.tick); }
  setCd(g, sec) { this.cds[g] = G.tick + Math.round(sec * 20); this.cdLen[g] = Math.round(sec * 20); }
  updAttr() {
    const J = JOBS[this.job]; const hp = clamp(this.hp, 1, 40);
    const sl = this.job === 'slime';
    this.scale = sl ? 0.1 * hp : 1;
    this.gravity = sl ? 0.008 * hp : 0.08;
    this.jumpStr = sl ? 0.042 * hp : 0.42;
    let step = sl ? 0.06 * hp : 0.6; if (J.step) step += J.step; if (this.held().step) step += this.held().step; this.step = step;
    this.safeFall = sl ? 0.3 * hp : 3;
    this.reach = sl ? 0.3 * hp : 3 * (1 + (this.held().reach || 0));
    this.blockReach = sl ? 0.3 * hp : 4.5;
    let spd = sl ? 0.01 * hp : 0.1; if (J.speedMul) spd *= J.speedMul; spd += this.bootsBonus; if (this.held().aglet) spd += 0.05; this.baseSpd = spd;
    this.sneakSpd = sl ? 0.03 * hp : 0.3;
    this.atkBase = sl ? 0.1 * hp : 1;
    this.kbAtk = sl ? (hp >= 10 ? 0.1 * (hp - 9) : 0) : 0;
    let ar = 0, tough = 0; if (this.armorType) ar += ARMOR[this.armorType][0]; if (J.boots === 'dia' || this.bootsBonus) { ar += 3; tough += 2; }
    this.armor = ar; this.tough = tough;
    this.kbRes = clamp(J.kbRes || 0, 0, 1); // MC clamps knockback_resistance to [0,1]
  }
  moveSpeed() {
    let s = this.baseSpd; const sp = this.eff('speed'), sl = this.eff('slowness');
    s *= 1 + 0.2 * sp; s *= Math.max(0, 1 - 0.15 * sl); return s;
  }
  // ---------- tick ----------
  tick() {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    if (this.spectator) { this.hurtTime = 0; this.specMove(); return; }
    this.updAttr();
    if (this.job === 'dude') this.addEff('jump_boost', 1, 11);
    this.tickEff();
    if (MOD.defs[this.job] && this.alive) MOD.fire(this, 'tick');
    if (this.hurtTime > 0) this.hurtTime--; if (this.invul > 0) this.invul--; this.attackTimer++; if (this.swingT > 0) this.swingT--;
    if (this.jumpCd > 0) this.jumpCd--;
    // sneak / sprint state
    const wasSneak = this.sneaking; this.sneaking = !!this.inp.sneak && !this.st.rewind;
    if (this.sneaking && !wasSneak && !this.isBot) { }
    const canSprint = this.inp.f > 0.5 && !this.sneaking && !this.useHeld;
    if (this.inp.sprint && canSprint) this.sprinting = true; if (!canSprint || this.hx) this.sprinting = false;
    // use held items
    this.tickUse();
    SK.passive(this);
    { const hs = Math.ceil(this.hp); if (hs >= 1 && hs <= 2 && !this.lowHp) { this.lowHp = true; G.sound('abouttodie', this, 10); } else if (hs >= 3) this.lowHp = false; }
    if (this.st.rewind) { SK.rewindTick(this); this.after(); return; }
    if (this.st.dash) { SK.dashTick(this); this.after(); return; }
    this.physics();
    this.after();
  }
  after() {
    this.rec.push([this.x, this.y, this.z]); if (this.rec.length > 80) this.rec.shift();
    if (this.y < -30) this.hurt(1000, { type: 'void' });
  }
  tickEff() {
    for (const n in this.effects) {
      const e = this.effects[n];
      if (n === 'regeneration') { const iv = Math.max(1, 50 >> Math.min(e.amp, 30)); if (e.t % iv === 0 && this.hp < this.maxHp()) this.heal(1); }
      if (n === 'poison') { const iv = Math.max(1, 25 >> Math.min(e.amp, 30)); if (e.t % iv === 0 && this.hp > 1) this.hurt(1, { type: 'magic', nokb: true, noinvul: true }); }
      if (!this.effects[n]) continue; e.t--;
      if (e.t <= 0) { if (e.hidden) { e.hidden.t -= e.max; if (e.hidden.t > 0) { this.effects[n] = e.hidden; continue; } } delete this.effects[n]; if (n === 'health_boost') this.hp = Math.min(this.hp, this.maxHp()); }
    }
    if (this.fire > 0) { this.fire--; if (this.fire % 20 === 0 && !this.eff('fire_resistance')) this.hurt(1, { type: 'fire', nokb: true }); }
  }
  heal(n) { this.hp = Math.min(this.maxHp(), this.hp + n); }
  // ---------- movement ----------
  physics() {
    const W = G.world; const inp = this.inp;
    const inLava = aabbBlocks(W, this, d => d.lava);
    const inSnow = aabbBlocks(W, this, d => d.snow) && this.job !== 'spider_' ;
    const fx = Math.floor(this.x), fz = Math.floor(this.z);
    const onLadder = BL[W.get(fx, Math.floor(this.y + .01), fz)].ladder || BL[W.get(fx, Math.floor(this.y + 1), fz)].ladder || this.wallClimb; // spider job: MC Spider.onClimbable = against a wall
    let f = inp.f, s = inp.s; const ml = Math.hypot(f, s); if (ml > 1) { f /= ml; s /= ml; }
    if (this.sneaking) { f *= this.sneakSpd; s *= this.sneakSpd; }
    if (this.useHeld && (this.blocking || this.drawT > 0)) { f *= 0.2; s *= 0.2; }
    f *= 0.98; s *= 0.98;
    if (this.st.pulled) { SK.pullTick(this); return; }
    if (this.st.sucked) { SK.suckTick(this); return; }
    // jump
    if (inp.jump) {
      if (inLava) this.vy += 0.04;
      else if (this.onGround && this.jumpCd === 0) {
        this.vy = this.jumpStr + 0.1 * this.eff('jump_boost'); this.jumpCd = 10;
        if (this.sprinting) { const jb = 0.2 * this.sizeK(); this.vx += -Math.sin(this.yaw) * jb; this.vz += Math.cos(this.yaw) * jb; }
      }
    } else this.jumpCd = 0;
    const g0 = this.onGround; const slip = g0 ? (W.get(Math.floor(this.x), Math.floor(this.y - 0.5), Math.floor(this.z)) === 40 ? 0.98 : 0.6) : 1;
    let acc = g0 ? this.moveSpeed() * (0.21600002 / (slip * slip * slip)) : (this.sprinting ? 0.026 : 0.02) * this.sizeK();
    if (inLava) acc = 0.02;
    if (this.sprinting) acc *= g0 ? 1.3 : 1;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.vx += (-sy * f - cy * s) * acc; this.vz += (cy * f - sy * s) * acc;
    if (onLadder) { this.vx = clamp(this.vx, -.15, .15); this.vz = clamp(this.vz, -.15, .15); this.vy = Math.max(this.vy, -0.15); if (this.sneaking) this.vy = Math.max(this.vy, 0); this.fallDist = 0; }
    let mx = this.vx, my = this.vy, mz = this.vz;
    if (inSnow) { mx *= .9; my *= 1.5; mz *= .9; this.fallDist = 0; }
    // sneak edge guard
    if (this.sneaking && this.onGround && my <= 0) {
      const sup = (dx, dz) => W.boxes(this.x + dx - this.w / 2 + .01, this.y - this.step - .01, this.z + dz - this.w / 2 + .01, this.x + dx + this.w / 2 - .01, this.y - .001, this.z + dz + this.w / 2 - .01, []).some(b => b[4] > this.y - this.step - .01 && b[4] <= this.y + .001);
      if (!sup(mx, mz)) { if (sup(mx, 0)) mz = 0; else if (sup(0, mz)) mx = 0; else { mx = 0; mz = 0; } }
    }
    const wasGround = this.onGround; const prevY = this.y;
    const r = moveAABB(W, this, mx, my, mz, this.step);
    this.hx = r.hx || r.hz;
    if (this.job === 'spider') { const h = this.w / 2 + .2; this.wallClimb = this.hx && this.x - h > 1 && this.z - h > 1 && this.x + h < W.sx - 1 && this.z + h < W.sz - 1; } else this.wallClimb = false; // not the arena's outer wall
    if (r.hx) this.vx = 0; if (r.hz) this.vz = 0;
    this.onGround = r.ground;
    if (onLadder && this.hx) this.vy = 0.2;
    // fall
    const dy = this.y - prevY;
    if (this.onGround) {
      if (this.fallDist > 0) this.land();
      this.fallDist = 0;
    } else if (dy < 0) this.fallDist -= dy;
    if (this.eff('slow_falling')) this.fallDist = 0;
    if (r.hy && my > 0 && this.vy > 0) this.vy = 0; // ceiling only (a floor hit must not cancel ladder/wall climbing)
    if (this.onGround && this.vy < 0) this.vy = 0;
    // gravity & friction
    let g = this.gravity; if (this.eff('slow_falling') && this.vy <= 0) g = Math.min(g, 0.01);
    if (inLava) { this.vx *= .5; this.vz *= .5; this.vy = this.vy * .5 - 0.02; this.fallDist *= .5; }
    else if (inSnow) { this.vx = 0; this.vz = 0; this.vy = 0; this.vy -= g; }
    else { this.vy = (this.vy - g) * 0.98; const fr = g0 ? slip * 0.91 : 0.91; this.vx *= fr; this.vz *= fr; }
    if (Math.abs(this.vx) < 0.003) this.vx = 0; if (Math.abs(this.vz) < 0.003) this.vz = 0;
    // environment
    if (inLava) { this.fire = 300; if (!this.eff('fire_resistance') && G.tick % 10 === 0) this.hurt(4, { type: 'lava', nokb: true }); if (G.tick % 15 === 0 && this === G.me) AU.sfx('fizz', this); }
    SK.envTick(this);
  }
  land() {
    if (this.st.noFall) { this.st.noFall = false; return; }
    const W = G.world; const under = BL[W.get(Math.floor(this.x), Math.floor(this.y - .2), Math.floor(this.z))];
    if (under.snow) return;
    const d = Math.ceil(this.fallDist - this.safeFall - this.eff('jump_boost'));
    if (d > 0) { this.hurt(d, { type: 'fall', nokb: true }); if (PACK.on) AU.sfx(d > 4 ? 'bigfall' : 'smallfall', this, 1); else AU.sfx('hurt', this, 1, .7); }
  }
  specMove() {
    const inp = this.inp; const v = lookVec(this.yaw, this.pitch); const sp = 0.6;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.x += (v.x * inp.f - cy * inp.s) * sp; this.z += (v.z * inp.f - sy * inp.s) * sp; this.y += v.y * inp.f * sp + (inp.jump ? sp : 0) - (inp.sneak ? sp : 0);
    this.x = clamp(this.x, 1, G.world.sx - 1); this.z = clamp(this.z, 1, G.world.sz - 1); this.y = clamp(this.y, -5, 70);
  }
  // ---------- combat ----------
  atkCdTicks() { const h = this.held(); return Math.max(1, 20 / (h.spd || 4)); }
  charge() { return clamp((this.attackTimer + 0.5) / this.atkCdTicks(), 0, 1); }
  // distance from my eye to the closest point of t's hitbox
  reachTo(t) { const ex = this.x, ey = this.y + this.eye, ez = this.z, hw = t.w / 2; const cx = clamp(ex, t.x - hw, t.x + hw), cy = clamp(ey, t.y, t.y + t.h), cz = clamp(ez, t.z - hw, t.z + hw); return Math.hypot(cx - ex, cy - ey, cz - ez); }
  // opt.grow: extra hitbox margin, opt.cone: aim-assist angle (rad). returns {t, ice}
  findTarget(opt = {}) {
    const eye = { x: this.x, y: this.y + this.eye, z: this.z }; const d = lookVec(this.yaw, this.pitch); const g = opt.grow || 0;
    const bh = G.world.ray(eye, d, this.blockReach, B => B.solid || B.ice);
    let best = null, bt = 1e9;
    for (const t of G.targets()) {
      if (t === this || t.id === this.id) continue;
      const tt = rayAABB(eye, d, t, this.reach + g, g); if (tt !== null && tt < bt) { bt = tt; best = t; }
    }
    if (bh && bh.t < bt) return { ice: bh.id === 40 ? bh : null };
    if (!best && opt.cone) {
      let ba = opt.cone;
      for (const t of G.targets()) {
        if (t === this || t.id === this.id) continue; if (this.reachTo(t) > this.reach + g) continue;
        const c = { x: t.x - eye.x, y: t.y + t.h / 2 - eye.y, z: t.z - eye.z }; const l = Math.hypot(c.x, c.y, c.z) || 1;
        const a = Math.acos(clamp((c.x * d.x + c.y * d.y + c.z * d.z) / l, -1, 1)); if (a >= ba) continue;
        const wb = G.world.ray(eye, { x: c.x / l, y: c.y / l, z: c.z / l }, l - t.w / 2); if (wb) continue;
        ba = a; best = t;
      }
    }
    return { t: best };
  }
  attack(opt = {}) {
    if (this.spectator || !this.alive || this.st.rewind) return;
    this.prot = 0; this.swing++; this.swingT = 6;
    let best = null;
    if (opt.target && opt.target.alive && this.reachTo(opt.target) <= this.reach + (opt.grow || 0)) best = opt.target;
    else if (opt.ice) { G.breakIce(opt.ice.x, opt.ice.y, opt.ice.z, true); this.attackTimer = 0; return; }
    else { const f = this.findTarget(opt); if (f.ice) { G.breakIce(f.ice.x, f.ice.y, f.ice.z, true); this.attackTimer = 0; return; } best = f.t; }
    if (!best) { this.attackTimer = 0; return; }
    const h = this.held(); const ch = this.charge();
    let dmg = this.atkBase + ((h.dmg || 1) - 1) + 3 * this.eff('strength') - 4 * this.eff('weakness');
    let ench = h.sharp ? 0.5 * h.sharp + 0.5 : 0; if (this.job === 'seryong' && this.st.srKills && this.held().sword) ench += 0.5 * this.st.srKills + 0.5; if (this.st.modDmg) ench += this.st.modDmg; // 세명컴고 입학증: +1 sharpness per kill · mod api.bonusDamage
    dmg = Math.max(0, dmg) * (0.2 + ch * ch * 0.8) + ench * ch;
    const crit = ch > 0.9 && this.fallDist > 0 && !this.onGround && !this.sprinting;
    if (crit) dmg *= 1.5;
    if (h.mace && this.fallDist > 1.5) { dmg += SK.maceBonus(this.fallDist); this.fallDist = 0; this.vy = 0.01; SK.maceSmash(this, best); }
    let kbx = (h.kb || 0) + this.kbAtk; const sprintHit = this.sprinting && ch > 0.9; if (sprintHit) kbx += 1;
    const dx = best.x - this.x, dz = best.z - this.z, dl = Math.hypot(dx, dz) || 1;
    if (this.inv[this.sel] && this.inv[this.sel].id === 'ai_prompt') { const pre = best.hp || 0; dmg = Math.max(dmg, (pre <= 5 ? 2 : pre * .25) * (0.2 + ch * ch * 0.8)); G.particles('crit', best.x, best.y + 1, best.z); } // 프롬프트: 25% of the target's current health
    G.damage(best, dmg, { type: 'melee', by: this.id, dx: dx / dl, dz: dz / dl, kbx, axe: !!h.axe, fx: this.x, fz: this.z, crit });
    if (MOD.defs[this.job]) MOD.fire(this, 'hit', best, dmg);
    if (PACK.on) AU.sfx(crit ? 'atk_crit' : sprintHit ? 'atk_kb' : ch > .9 ? 'atk_strong' : 'atk_weak', this, .8);
    if (h.chang) G.sound('chang', this);
    if (this.job === 'summoner' && !G.sameTeam(best.id, this.id)) this.st.dogMark = { id: best.id, until: G.tick + 200 };
    if (h.frost && ch > 0.9 && !G.sameTeam(best.id, this.id)) { G.applyFx(best, [['slowness', 0, 1]]); G.particles('ice', best.x, best.y + best.h * .6, best.z, 5); }
    if (sprintHit) { this.vx *= 0.6; this.vz *= 0.6; this.sprinting = false; }
    // sweep
    if (h.sword && ch > 0.9 && this.onGround && !this.sprinting && !crit) {
      const sw = 1 + dmg * ((h.sweep || 0) / ((h.sweep || 0) + 1));
      for (const t of G.targets()) { if (t === best || t.id === this.id) continue; if (distH(t, best) < 1.5 && Math.abs(t.y - best.y) < 1 && dist3(t, this) < 3.5) G.damage(t, sw, { type: 'melee', by: this.id, dx: dx / dl, dz: dz / dl, kbx: 0.4, fx: this.x, fz: this.z }); }
      G.particles('sweep', best.x, best.y + 1, best.z);
    }
    if (crit) G.particles('crit', best.x, best.y + best.h * .6, best.z);
    { const w = this.inv[this.sel]; if (w && w.dur !== undefined) { w.dur--; if (w.dur <= 0) { if (w.count > 1) { w.count--; w.dur = w.max; } else this.inv[this.sel] = null; AU.sfx('shieldbreak', this); this.msg('§c다이아몬드 검이 부서졌습니다'); } } }
    this.attackTimer = 0;
  }
  // use: called on press
  usePress() {
    if (this.spectator || !this.alive || this.st.rewind) return;
    const slot = this.inv[this.sel]; const D = slot ? ITEMS[slot.id] : null;
    if (D && D.use === 'skill') {
      if (this.cdLeft(D.group) > 0) return;
      const ok = SK[D.cast](this, slot); if (ok === false) { if (this.st.aiSteal) SK.aiAfterUse(this, slot, ok); return; } this.prot = 0;
      if (this.job === 'bilcorner' && SK.BIL_SKILLS.has(D.cast)) SK.addFollowers(this);
      if (D.cd && ok !== 'nocd') this.setCd(D.group, D.cd);
      if (D.consume) { slot.count--; if (slot.count <= 0) this.inv[this.sel] = null; }
      if (this.st.aiSteal) SK.aiAfterUse(this, slot, ok); // Ai: stolen one-use skills
      this.swing++; this.swingT = 6;
      return 'used';
    }
    if (D && D.use === 'crossbow') { if (this.cdLeft(D.group) > 0) return; const ok = SK.crossbow(this); if (this.st.aiSteal) SK.aiAfterUse(this, slot, ok ? true : false); if (ok) { this.setCd(D.group, D.cd); this.prot = 0; } return 'used'; }
  }
  tickUse() {
    const slot = this.inv[this.sel]; const D = slot ? ITEMS[slot.id] : null;
    const held = this.inp.use && this.alive;
    this.useHeld = false; let block = false;
    if (held) {
      if (D && D.use === 'bow') { if (this.count('arrow') > 0) { this.drawT++; this.useHeld = true; } }
      else if (D && D.use === 'shield') block = true;
      else if (!D || !D.use || (D.use === 'skill' && this.cdLeft(D.group) > 0) || (D.use === 'crossbow' && this.cdLeft(D.group) > 0)) { if (this.off && ITEMS[this.off.id].use === 'shield') block = true; }
    }
    if (!held && this.drawT > 0) { SK.shootBow(this, this.drawT); this.drawT = 0; this.prot = 0; }
    if (block && G.tick >= this.shieldOff) { this.blockT++; this.useHeld = true; } else this.blockT = 0;
    this.blocking = this.blockT >= 5;
    this.sprinting = this.sprinting && !this.useHeld;
  }
  // ---------- damage ----------
  hurt(amt, src) {
    if (this === G.me && UI.god && (G.practice || DEV.on) && src.type !== 'void') return false; // 무적 (practice / dev tool only)
    if (!this.alive || this.spectator || G.phase !== 'game') return false;
    if (G.tick < (this.prot || 0) && src.type !== 'void') return false;
    if (src.by && src.by !== this.id && G.sameTeam(src.by, this.id)) return false;
    if (this.st.rewind && src.type !== 'void') { }
    const blockable = src.type === 'melee' || src.type === 'proj' || src.type === 'explosion' || src.type === 'mob';
    if (blockable && this.blocking && src.fx !== undefined) {
      const lv = lookVec(this.yaw, 0); const tx = src.fx - this.x, tz = src.fz - this.z;
      if (lv.x * tx + lv.z * tz > 0) {
        AU.sfx('shield', this);
        if (src.axe) { this.shieldOff = G.tick + 100; this.blockT = 0; this.blocking = false; AU.sfx('shieldbreak', this); }
        const sh = this.off && ITEMS[this.off.id].use === 'shield' ? this.off : (this.inv[this.sel] && ITEMS[this.inv[this.sel].id].use === 'shield' ? this.inv[this.sel] : null);
        if (sh && sh.dur !== undefined && amt >= 3) { sh.dur -= 1 + Math.floor(amt); if (sh.dur <= 0) { if (sh === this.off) this.off = null; else this.inv[this.sel] = null; AU.sfx('shieldbreak', this); this.msg('§c방패가 부서졌습니다'); } }
        return false;
      }
    }
    let a = amt;
    const bypassArmor = src.type === 'fall' || src.type === 'magic' || src.type === 'void' || src.type === 'fire' || src.type === 'follower';
    if (!bypassArmor && !src.exact && this.armor > 0) { const ar = this.armor, tg = this.tough; a = a * (1 - clamp(Math.max(ar / 5, ar - a / (2 + tg / 4)), 0, 20) / 25); }
    const res = this.eff('resistance'); if (src.type !== 'void' && !src.exact) a *= Math.max(0, 1 - 0.2 * res);
    if (a <= 0 && src.type !== 'void') return false;
    let full = true;
    if (!src.noinvul) {
      if (this.invul > 10) { if (amt <= this.lastHurt) return false; a = a * (amt - this.lastHurt) / amt; this.lastHurt = amt; full = false; }
      else { this.lastHurt = amt; this.invul = 20; }
    }
    this.hp -= a;
    if (src.by && src.by !== this.id) { this.lastAtk = { id: src.by, t: G.tick }; if (this.job === 'summoner') this.st.dogMark = { id: src.by, until: G.tick + 200 }; }
    if (full) {
      this.hurtTime = 10;
      if (!src.nokb && src.dx !== undefined) this.knock(0.4, src.dx, src.dz, src.kbx || 0);
      if (this === G.me) { AU.sfx('hurt', null, .9); UI.hurtFlash(); }
      else AU.sfx('hurt', this, .8);
    }
    if (MOD.defs[this.job]) MOD.fire(this, 'hurt', a, src);
    if (this.hp <= 0) this.die(src);
    return true;
  }
  // MC LivingEntity.knockback: v = v/2 + dir*s, vertical only from the ground (capped 0.4).
  // The hurt knockback (0.4) and the attack's extra knockback (level*0.5, sprint +0.5) are two separate calls.
  knock(str, dx, dz, extra) {
    const one = s => { s *= (1 - this.kbRes); if (s <= 0) return; const l = Math.hypot(dx, dz) || 1; this.vx = this.vx / 2 + dx / l * s; this.vz = this.vz / 2 + dz / l * s; if (this.onGround) this.vy = Math.min(0.4, this.vy / 2 + s); };
    one(str); if (extra > 0) one(extra * 0.5);
  }
  die(src) {
    if (SK.bilRevive(this)) return;
    this.hp = 0; const killer = (this.lastAtk && G.tick - this.lastAtk.t < 100) ? this.lastAtk.id : (src.by || null);
    G.onDeath(this, killer, src.type);
    this.deaths++;
    SK.onDeath(this); if (MOD.defs[this.job]) MOD.fire(this, 'death');
    this.effects = {}; this.fire = 0; this.vx = this.vy = this.vz = 0; this.fallDist = 0; this.lastAtk = null; this.blockT = 0; this.drawT = 0; this.st = {};
    this.updAttr();
    if (G.match && this.deaths >= 11) { this.spectator = true; this.alive = true; this.hp = this.maxHp(); if (this === G.me) UI.title('§c탈락', '관전자 모드로 전환되었습니다'); G.checkWin(); return; }
    this.respawn();
  }
  refillV4() { const s = this.inv.find(s => s && s.id === 'v4'); if (s) s.count = 3; else this.addItem('v4', 3); }
  respawn() {
    this.hurtTime = 0; this.swingT = 0;
    if (this.job === 'ai' && this.inv) { for (let i = 0; i < 9; i++) { const s = this.inv[i]; if (s && !JOBS.ai.kit.some(k => k && k[0] === s.id)) this.inv[i] = null; } SK.aiRestore(this, false); } // stolen skills don't survive death; glasses come back
    if (this.job === 'bilcorner' && this.inv) { const s = this.inv.find(s => s && s.id === 'harder'); if (s) s.id = 'squid'; }
    if (this.job === 'suno' && this.inv) this.refillV4();
    const p = G.pads[this.pad]; this.x = p.x + rand(-.3, .3); this.y = p.y; this.z = p.z + rand(-.3, .3); this.px = this.x; this.py = this.y; this.pz = this.z;
    this.hp = this.maxHp(); this.alive = true; this.invul = 0; this.updAttr(); this.prot = G.tick + 60; this.spawnT = G.tick;
    this.yaw = yawTo(G.world.sx / 2 - this.x, G.world.sz / 2 - this.z);
    if (MOD.defs[this.job]) MOD.fire(this, 'respawn');
  }
}
