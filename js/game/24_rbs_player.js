// ===================== Random Block Survival: player (local human or host-simulated bot) =====================
// Inventory: inv[0..8] hotbar, inv[9..35] main, armor[0..3] head..feet, off = offhand (shield only, Bedrock).
// Modes: 'adventure' (lobby / waiting: no block breaking or placing), 'survival' (arena), 'spectator' (관전: fly, invisible).
class RPlayer {
  constructor(id, name, bot) {
    this.id = id; this.name = name; this.isBot = !!bot; this.local = true; this.skin = '';
    this.x = 0; this.y = 0; this.z = 0; this.px = 0; this.py = 0; this.pz = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.yaw = 0; this.pitch = 0;
    this.onGround = false; this.hx = false; this.jumpCd = 0; this.fallDist = 0; this.sneaking = false; this.sprinting = false;
    this.inp = { f: 0, s: 0, jump: false, sneak: false, sprint: false };
    this.hp = 20; this.absorb = 0; this.food = 20; this.sat = 5; this.exh = 0; this.foodT = 0; this.xp = 0; this.lvl = 0;
    this.effects = {}; this.invul = 0; this.hurtTime = 0; this.lastDmg = 0; this.fire = 0; this.swing = 0; this.swingT = 0; this.alive = true;
    this.inv = new Array(36).fill(null); this.armor = [null, null, null, null]; this.off = null; this.sel = 0; this.mode = 'adventure';
    this.dig = null; this.useT = 0; this.blocking = false; this.lastBy = null; this.lastByT = 0; this.atkCd = 0; this.w = .6;
  }
  get h() { return this.sneaking ? 1.5 : 1.8; } get eye() { return this.sneaking ? 1.27 : 1.62; }
  get spectator() { return this.mode === 'spectator'; }
  held() { return this.inv[this.sel]; } heldI() { const s = this.inv[this.sel]; return s ? RIT[s.id] : null; }
  eff(n) { return this.effects[n] ? this.effects[n].amp + 1 : 0; }
  addEff(n, amp, sec) { const t = Math.round(sec * 20), e = this.effects[n]; if (e && (e.amp > amp || (e.amp === amp && e.t > t))) return; this.effects[n] = { amp, t, max: t }; if (n === 'absorption') this.absorb = Math.max(this.absorb, 4 * (amp + 1)); if (n === 'instant_health') this.heal(4 << amp); }
  clearEff() { this.effects = {}; this.absorb = 0; }
  heal(n) { this.hp = Math.min(20, this.hp + n); }
  maxStack(id) { return RITEM.max(id); }
  // ---------- inventory ----------
  give(st) { // merges into existing stacks then empty slots (hotbar first). returns leftover count
    if (!st || !st.n) return 0; const I = RIT[st.id]; let n = st.n; const mx = this.maxStack(st.id);
    if (I && I.armor && !this.armor[I.armor.slot] && false) { }
    if (I && I.shield && !this.off) { this.off = Object.assign({}, st, { n: 1 }); n--; if (!n) return 0; }
    for (const s of this.inv) if (s && RITEM.same(s, st) && s.n < mx) { const k = Math.min(n, mx - s.n); s.n += k; n -= k; if (!n) return 0; }
    for (let i = 0; i < 36; i++) if (!this.inv[i]) { const k = Math.min(n, mx); this.inv[i] = Object.assign({}, st, { n: k }); n -= k; if (!n) return 0; }
    return n;
  }
  room(st) { // how many of st give() could take right now (no side effects)
    const I = RIT[st.id]; const mx = this.maxStack(st.id); let n = I && I.shield && !this.off ? 1 : 0;
    for (let i = 0; i < 36; i++) { const s = this.inv[i]; if (!s) n += mx; else if (RITEM.same(s, st) && s.n < mx) n += mx - s.n; } return n;
  }
  count(id) { let n = 0; for (const s of this.inv) if (s && s.id === id) n += s.n; return n; }
  take(id, n) { for (let i = 0; i < 36 && n > 0; i++) { const s = this.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.inv[i] = null; } } return n === 0; }
  clearInv() { this.inv.fill(null); this.armor = [null, null, null, null]; this.off = null; }
  allItems() { return this.inv.concat(this.armor, [this.off]).filter(Boolean); }
  damageItem(slotRef, n = 1) { // slotRef: {arr, i}
    const s = slotRef.arr[slotRef.i]; if (!s) return; const I = RIT[s.id]; if (!I || !I.dur) return;
    const ub = s.en && s.en.unbreaking || 0; for (let k = 0; k < n; k++) { if (ub && Math.random() > 1 / (ub + 1)) continue; s.d = (s.d || 0) + 1; }
    if (s.d >= I.dur) { slotRef.arr[slotRef.i] = null; RAU.at('break', this); }
  }
  // ---------- stats ----------
  armorPts() { let a = 0, t = 0; for (const s of this.armor) if (s) { const I = RIT[s.id]; a += I.armor.pts; t += I.armor.tough; } return [a, t]; }
  epf() { let e = 0; for (const s of this.armor) if (s && s.en && s.en.protection) e += s.en.protection; return Math.min(20, e); }
  speed() { let s = .1; s *= 1 + .2 * this.eff('speed'); s *= Math.max(0, 1 - .15 * this.eff('slowness')); return s; }
  // ---------- tick ----------
  tick() {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    if (this.hurtTime > 0) this.hurtTime--; if (this.invul > 0) this.invul--; if (this.swingT > 0) this.swingT--; if (this.jumpCd > 0) this.jumpCd--; if (this.atkCd > 0) this.atkCd--;
    if (this.spectator) { this.specMove(); return; }
    this.sneaking = !!this.inp.sneak; const canSprint = this.inp.f > .5 && !this.sneaking && this.food > 6 && !this.useT;
    if (this.inp.sprint && canSprint) this.sprinting = true; if (!canSprint || this.hx) this.sprinting = false;
    this.tickEff(); this.tickFood();
    this.physics();
    if (this.y < -20) this.hurt(1000, { type: 'void' });
  }
  tickEff() {
    for (const n in this.effects) {
      const e = this.effects[n];
      if (n === 'regeneration') { const iv = Math.max(1, 50 >> e.amp); if (e.t % iv === 0 && this.hp < 20) this.heal(1); }
      if (n === 'poison') { const iv = Math.max(1, 25 >> e.amp); if (e.t % iv === 0 && this.hp > 1) this.hurt(1, { type: 'poison', magic: true, noinvul: true, nokb: true }); }
      if (n === 'fatal_poison') { const iv = Math.max(1, 25 >> e.amp); if (e.t % iv === 0) this.hurt(1, { type: 'poison', magic: true, noinvul: true, nokb: true }); } // V2.1: like poison, but it can kill
      if (n === 'wither') { const iv = Math.max(1, 40 >> e.amp); if (e.t % iv === 0) this.hurt(1, { type: 'wither', magic: true, noinvul: true, nokb: true }); }
      if (n === 'saturation') { this.food = 20; this.sat = 20; }
      if (--e.t <= 0) { delete this.effects[n]; if (n === 'absorption') this.absorb = 0; }
    }
    if (this.fire > 0) { this.fire--; if (this.fire % 20 === 0 && !this.eff('fire_resistance')) this.hurt(1, { type: 'fire', nokb: true }); }
  }
  // MC hunger: exhaustion -> saturation -> food; regen at food >= 18 (fast while saturated), starving at 0 (hard difficulty)
  exhaust(v) { if (this.mode === 'survival') this.exh += v; }
  tickFood() {
    if (this.exh >= 4) { this.exh -= 4; if (this.sat > 0) this.sat = Math.max(0, this.sat - 1); else this.food = Math.max(0, this.food - 1); }
    this.foodT++;
    if (this.food >= 20 && this.sat > 0 && this.hp < 20) { if (this.foodT >= 10) { const k = Math.min(this.sat, 6); this.heal(k / 6); this.exh += k; this.foodT = 0; } }
    else if (this.food >= 18 && this.hp < 20) { if (this.foodT >= 80) { this.heal(1); this.exh += 6; this.foodT = 0; } }
    else if (this.food <= 0) { if (this.foodT >= 80) { this.hurt(1, { type: 'starve', magic: true, nokb: true }); this.foodT = 0; } }
    else if (this.foodT > 80) this.foodT = 0;
  }
  physics() {
    const W = RW.w, inp = this.inp;
    const inLava = aabbBlocks(W, this, d => d.lava), inWater = aabbBlocks(W, this, d => d.liquid === 'water');
    const fx = Math.floor(this.x), fz = Math.floor(this.z);
    const B0 = BL[W.get(fx, Math.floor(this.y + .01), fz)], B1 = BL[W.get(fx, Math.floor(this.y + 1), fz)];
    const onLadder = B0.ladder || B1.ladder, inScaf = B0.scaf || B1.scaf;
    let f = inp.f, s = inp.s; const ml = Math.hypot(f, s); if (ml > 1) { f /= ml; s /= ml; }
    if (this.sneaking) { f *= .3; s *= .3; } if (this.useT || this.blocking) { f *= .2; s *= .2; } f *= .98; s *= .98;
    if (inp.jump) {
      if (inLava || inWater) this.vy += .04;
      else if (this.onGround && this.jumpCd === 0) { this.vy = .42 + .1 * this.eff('jump_boost'); this.jumpCd = 10; this.exhaust(this.sprinting ? .2 : .05); if (this.sprinting) { this.vx += -Math.sin(this.yaw) * .2; this.vz += Math.cos(this.yaw) * .2; } }
    } else this.jumpCd = 0;
    const g0 = this.onGround; const slip = .6;
    let acc = g0 ? this.speed() * (.21600002 / (slip * slip * slip)) : (this.sprinting ? .026 : .02);
    if (inWater || inLava) acc = .02; if (this.sprinting) acc *= g0 ? 1.3 : 1;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.vx += (-sy * f - cy * s) * acc; this.vz += (cy * f - sy * s) * acc;
    if (onLadder) { this.vx = clamp(this.vx, -.15, .15); this.vz = clamp(this.vz, -.15, .15); this.vy = Math.max(this.vy, -.15); if (inScaf) { if (this.sneaking) this.vy = -.15; else if (inp.jump) this.vy = .2; } else if (this.sneaking) this.vy = Math.max(this.vy, 0); this.fallDist = 0; } // scaffolding: jump climbs, sneak goes down
    let mx = this.vx, my = this.vy, mz = this.vz;
    if (this.sneaking && this.onGround && my <= 0) { // sneak edge guard
      W.scafEnt = this; const sup = (dx, dz) => W.boxes(this.x + dx - .29, this.y - .61, this.z + dz - .29, this.x + dx + .29, this.y - .001, this.z + dz + .29, []).some(b => b[4] > this.y - .61 && b[4] <= this.y + .001);
      if (!sup(mx, mz)) { if (sup(mx, 0)) mz = 0; else if (sup(0, mz)) mx = 0; else { mx = 0; mz = 0; } } W.scafEnt = null;
    }
    const prevY = this.y; W.scafEnt = this; let r; try { r = moveAABB(W, this, mx, my, mz, .6); } finally { W.scafEnt = null; }
    this.hx = r.hx || r.hz; if (r.hx) this.vx = 0; if (r.hz) this.vz = 0;
    const was = this.onGround; this.onGround = r.ground;
    if (onLadder && this.hx) this.vy = .2;
    const dy = this.y - prevY; if (this.onGround) this.fallDist = 0; else if (dy < 0) this.fallDist -= dy;  // fall damage is off (gamerule falldamage=false)
    if (r.hy && my > 0 && this.vy > 0) this.vy = 0; if (this.onGround && this.vy < 0) this.vy = 0;
    if (inWater || inLava) { const k = inLava ? .5 : .8; this.vx *= k; this.vz *= k; this.vy = this.vy * k - .02; this.fallDist = 0; }
    else { this.vy = (this.vy - .08) * .98; const fr = g0 ? slip * .91 : .91; this.vx *= fr; this.vz *= fr; }
    if (Math.abs(this.vx) < .003) this.vx = 0; if (Math.abs(this.vz) < .003) this.vz = 0;
    if (this.sprinting) this.exhaust(.1 * Math.hypot(this.x - this.px, this.z - this.pz));
    // environment
    if (inLava) { this.fire = Math.max(this.fire, 300); if (RG.tick % 10 === 0) this.hurt(4, { type: 'lava', nokb: true }); }
    if (aabbBlocks(W, this, d => d.fire)) { this.fire = Math.max(this.fire, 160); if (RG.tick % 10 === 0) this.hurt(1, { type: 'fire', nokb: true }); }
    if (inWater) this.fire = 0;
    if (this.onGround && !this.sneaking && BL[W.get(fx, Math.floor(this.y - .2), fz)].magma && RG.tick % 10 === 0) this.hurt(1, { type: 'magma', nokb: true });
    // footsteps
    if (this.onGround && (this === RG.me || this.isBot)) { this.stepD = (this.stepD || 0) + Math.hypot(this.x - this.px, this.z - this.pz); if (this.stepD > 1.7 && !this.sneaking) { this.stepD = 0; const b = BL[W.get(fx, Math.floor(this.y - .2), fz)]; if (b.solid) RAU.step(b.snd, this); } }
  }
  specMove() {
    const inp = this.inp; const v = lookVec(this.yaw, this.pitch); const sp = this.inp.sprint ? .9 : .45; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.x += (v.x * inp.f - cy * inp.s) * sp; this.z += (v.z * inp.f - sy * inp.s) * sp; this.y += v.y * inp.f * sp + (inp.jump ? sp : 0) - (inp.sneak ? sp : 0);
    const W = RW.w; this.x = clamp(this.x, 0, W.sx); this.z = clamp(this.z, 0, W.sz); this.y = clamp(this.y, 0, W.sy + 10);
  }
  // ---------- damage (resolved on the victim's own client; bots on the host) ----------
  hurt(dmg, src = {}) {
    if (!this.alive || this.spectator) return false;
    if (this === RG.me && RUI.god) return false;
    if (src.type !== 'void' && RG.safeAt(this)) return false; // lobby / winner room: no damage
    if (this.eff('resistance') >= 5 && src.type !== 'void') return false;
    // shield: blocks a frontal hit while raised (Bedrock: sneaking or holding use)
    if (src.from && this.blocking && this.off && RIT[this.off.id].shield) {
      const dx = src.from.x - this.x, dz = src.from.z - this.z, l = Math.hypot(dx, dz) || 1; const fx = -Math.sin(this.yaw), fz = Math.cos(this.yaw);
      if ((dx * fx + dz * fz) / l > 0) { RAU.at('shield', this); this.damageItem({ arr: this, i: 'off' }, Math.floor(dmg) + 1); if (src.axe) { this.shieldCd = 100; this.blocking = false; RAU.at('shieldbreak', this); } if (!src.nokb) this.knock(.5, -dx / l, -dz / l); return false; }
    }
    if (!src.noinvul) { if (this.invul > 10) { if (dmg <= this.lastDmg) return false; const d2 = dmg - this.lastDmg; this.lastDmg = dmg; dmg = d2; } else { this.lastDmg = dmg; this.invul = 20; } }
    // armor (MC formula), protection, resistance, absorption
    if (!src.magic && src.type !== 'void') { const [a, t] = this.armorPts(); dmg = dmg * (1 - Math.min(20, Math.max(a / 5, a - dmg / (2 + t / 4))) / 25); for (let i = 0; i < 4; i++) if (this.armor[i]) this.damageItem({ arr: this.armor, i }, Math.max(1, Math.floor(dmg / 4))); }
    if (!src.magic || src.type === 'poison' || src.type === 'wither') { const e = this.epf(); if (e && src.type !== 'void' && src.type !== 'starve') dmg *= 1 - e * 4 / 100; }
    const res = this.eff('resistance'); if (res) dmg *= Math.max(0, 1 - .2 * res);
    if (this.absorb > 0) { const k = Math.min(this.absorb, dmg); this.absorb -= k; dmg -= k; }
    this.hp -= dmg; this.hurtTime = 10; this.exhaust(.1);
    if (src.by) { this.lastBy = src.by; this.lastByT = RG.tick; }
    if (src.fire) this.fire = Math.max(this.fire, src.fire * 80);
    if (!src.nokb && src.kx !== undefined) this.knock(.4 * (src.kb || 1), src.kx, src.kz, src.kbx || 0);
    RAU.at('hurt', this);
    if (this.hp <= 0) RG.die(this, src);
    return true;
  }
  knock(str, dx, dz, extra = 0) { const l = Math.hypot(dx, dz) || 1; this.vx = this.vx / 2 + dx / l * (str + extra * .5); this.vz = this.vz / 2 + dz / l * (str + extra * .5); if (this.onGround || true) this.vy = Math.min(.4, this.vy / 2 + .4); }
  // ---------- attack (Bedrock: no cooldown, crit while falling) ----------
  attackDamage() {
    const I = this.heldI(); let d = I && I.dmg ? I.dmg : 1; const s = this.held(); if (s && s.en && s.en.sharpness) d += 1.25 * s.en.sharpness; // Bedrock sharpness: +1.25 / level
    d += 3 * this.eff('strength'); d -= 4 * this.eff('weakness'); return Math.max(0, d);
  }
  canPvp() { return RG.pvpAt(this); }
  tryAttack(t) {
    if (!t || !this.alive || this.spectator) return;
    this.swingAnim(); if (!RG.pvpAt(this) || !RG.pvpAt(t)) return;
    let dmg = this.attackDamage(); const crit = this.fallDist > 0 && !this.onGround && this.vy < 0 && !this.inWater; if (crit) dmg *= 1.5;
    const s = this.held(); const kbE = s && s.en ? (s.en.knockback || 0) : 0; const fire = s && s.en ? (s.en.fire_aspect || 0) : 0; const kbx = (this.sprinting ? 1 : 0) + kbE;
    const dx = t.x - this.x, dz = t.z - this.z;
    RG.hit(t, dmg, { type: 'melee', by: this.id, kx: dx, kz: dz, kbx, crit, fire, axe: !!(this.heldI() && this.heldI().tool && this.heldI().tool.type === 'axe'), from: { x: this.x, z: this.z } });
    if (crit) RG.particles('crit', t.x, t.y + 1, t.z, 8);
    if (this.sprinting) { this.vx *= .6; this.vz *= .6; this.sprinting = false; }
    const I = this.heldI(); if (I && I.dur) this.damageItem({ arr: this.inv, i: this.sel }, I.sword ? 1 : 2);
    this.exhaust(.1); RAU.at(crit ? 'atk_crit' : 'atk', this);
  }
  swingAnim() { this.swing++; this.swingT = 6; }
  // ---------- mining ----------
  canHarvest(B) { if (!B.tier) return true; const I = this.heldI(); return !!(I && I.tool && I.tool.type === B.tool && I.tool.tier >= B.tier); }
  breakSpeed(B) {
    const I = this.heldI(); let sp = 1; if (I && I.tool && I.tool.type === B.tool) { sp = I.tool.sp; const ef = this.held().en && this.held().en.efficiency || 0; if (ef) sp += ef * ef + 1; }
    if (I && I.sword && B.cut && B.snd === 'grass') sp = 1.5;
    if (B.tool === 'hoe' && I && I.tool && I.tool.type === 'axe') sp = 1; // leaves: no shears/hoe here
    const h = this.eff('haste'); if (h) sp *= 1 + .2 * h;
    let d = sp / B.hard / (this.canHarvest(B) ? 30 : 100);
    if (!this.onGround) d /= 5; if (aabbBlocks(RW.w, { x: this.x, y: this.y + this.eye - .1, z: this.z, w: .1, h: .1 }, b => b.liquid === 'water')) d /= 5;
    return d;
  }
}
