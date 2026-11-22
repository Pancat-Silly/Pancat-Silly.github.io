// ===================== skills =====================
const otherPlayers = (p, r) => G.players().filter(t => t.id !== p.id && !t.spectator && t.alive && !G.sameTeam(t.id, p.id) && (r === undefined || dist3(t, p) <= r));
// area attacks: enemy players plus enemy spiders / dogs (local or remote)
const otherTargets = (p, r) => G.targets().filter(t => t.id !== p.id && !(t.kind === 'mob' && t.owner === p.id) && !G.sameTeam(t.id, p.id) && (r === undefined || dist3(t, p) <= r));
const nearestOf = (p, list) => { let b = null, bd = 1e9; for (const t of list) { const d = dist3(t, p); if (d < bd) { bd = d; b = t; } } return b; };
const SK = {
  // ---------- generic (직업별 능력은 js/jobs/<직업>.js 가 Object.assign(SK, {...}) 로 넣는다) ----------
  passive(p) {
    if (p.st.dance) SK.danceTick(p);
    if (p.job === 'bilcorner') SK.bilTick(p);
    if (p.st.trailUntil > G.tick) SK.trailTick(p);
    if (p.st.droneUp && p.vy <= 0) { p.st.droneUp = false; if (p.st.spinArmed) SK.spinStart(p); }
    if (p.st.spin) SK.spinTick(p);
    if (p.job === 'mefab3' || (p.st.aiSteal && p.st.aiSteal.ids.grab !== undefined)) SK.grabPassive(p); // stolen grab charges too
    if (p.st.aiPiece && G.tick % 10 === 0) { const c = p.st.aiPiece; G.particles('totem', c.x, c.y + .8, c.z, 2); SK.srRing(c.x, c.y + .1, c.z, .7, [.3, .8, 1], 10); }
    if (p.st.grab) SK.grabTick(p);
  },
  envTick(p) {
    const W = G.world, fx = Math.floor(p.x), fy = Math.floor(p.y - 0.5), fz = Math.floor(p.z); const under = W.get(fx, fy, fz);
    if (under === 37 && p.onGround) { p.yaw += 10 * D2R; if (p === G.me) AU.loop('360song', true); p._spin = true; }
    else if (p._spin) { p._spin = false; if (p === G.me) AU.loop('360song', false); }
    const pad = BL[under].pad, P = pad && PAD_POS[pad]; // only the 2x2 spawn pads, not every block of that colored concrete in the map
    p.onPad = P && p.onGround && fy === P[1] - 1 && Math.abs(fx - P[0]) <= 1 && Math.abs(fz - P[2]) <= 1 ? pad : null;
  },
  onDeath(p) { if (p === G.me) AU.loop('360song', false); SK.danceEnd(p, false); },
  crossbow(p) {
    if (p.count('arrow') < 1) { p.actionbar('§c화살이 없습니다'); return false; }
    p.take('arrow', 1);
    const eye = { x: p.x, y: p.y + p.eye - .1, z: p.z };
    [-10, 0, 10].forEach((a, i) => { const v = lookVec(p.yaw + a * D2R, p.pitch); G.spawnArrow(p, eye, v, 3.15, { burst: true, noPick: true }); });
    p.addItem('arrow', 1); // tag success -> refund 1
    AU.sfx('bow', p, 1, 1.3); return true;
  },
  shootBow(p, drawT) {
    const f = drawT / 20; const pw = Math.min(1, (f * f + 2 * f) / 3); if (pw < 0.1 || p.count('arrow') < 1) return;
    p.take('arrow', 1); const eye = { x: p.x, y: p.y + p.eye - .1, z: p.z };
    G.spawnArrow(p, eye, lookVec(p.yaw, p.pitch), 3 * pw, { crit: pw >= 1 }); AU.sfx('bow', p, 1, 1 / (0.9 + Math.random() * .4) + pw * .5);
  },
  canSee(a, t) { const e = { x: a.x, y: a.y + a.eye, z: a.z }, c = { x: t.x, y: t.y + t.h * .6, z: t.z }, d = dist3(e, c) || 1; return !G.world.ray(e, { x: (c.x - e.x) / d, y: (c.y - e.y) / d, z: (c.z - e.z) / d }, d); },
  aimTarget(p, max) { const o = { x: p.x, y: p.y + p.eye, z: p.z }, d = lookVec(p.yaw, p.pitch); const wall = G.world.ray(o, d, max, B => B.solid); const lim = wall ? wall.t : max; let best = null, bt = lim;
    for (const t of otherTargets(p, max + 2)) { const hw = t.w / 2 + .1; const h = rayAABB(o, d, { x0: t.x - hw, y0: t.y, z0: t.z - hw, x1: t.x + hw, y1: t.y + t.h, z1: t.z + hw }); if (h !== null && h < bt) { bt = h; best = t; } } return best; },
  srRing(x, y, z, r, col, n) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; G.particles('dust', x + Math.cos(a) * r, y, z + Math.sin(a) * r, 1, col); } },
  srLine(a, b, col, step) { const L = dist3(a, b); for (let s = 0; s <= L; s += step) { const k = L ? s / L : 0; G.particles('dust', a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, 1, col); } },
  // ---------- shared helpers (same behavior as the dev tool's mod API, for jobs ported from dev-tool results) ----------
  // damage t from entity `by`, knocked away from `from` (or the attacker); type 'melee' | 'magic' | 'explosion' | 'fire'
  deal(t, amt, by, type = 'magic', kb = 0, from) {
    if (!t || !t.alive) return; const f = from || by; let dx, dz; if (f) { dx = t.x - f.x; dz = t.z - f.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    G.damage(t, Math.max(0, +amt || 0), { type, by: by ? by.id : undefined, dx, dz, kbx: +kb || 0, nokb: !f, fx: f ? f.x : undefined, fz: f ? f.z : undefined });
  },
  near(p, x, y, z, r) { return otherTargets(p).filter(t => Math.hypot(t.x - x, t.y + t.h / 2 - y, t.z - z) <= r + t.w / 2); }, // enemies around a point
  // explosion at (x, y, z): every enemy in r takes dmg (falloff: less at the edge), knockback kb
  blast(p, x, y, z, r, dmg, kb = 1.2, falloff = true) {
    const hit = SK.near(p, x, y, z, r); for (const t of hit) { const d = Math.hypot(t.x - x, t.z - z), f = falloff ? clamp(1 - d / (r + .5), .35, 1) : 1; SK.deal(t, dmg * f, p, 'explosion', kb, { x, z }); }
    G.fx('explosion', x, y, z); G.sound('explode_', { x, y, z }, 24, 1); return hit;
  },
  effOn(t, name, amp, sec) { if (!t || t.kind === 'mob') return; if (t.local) t.addEff(name, amp, sec); else G.applyFx(t, [[name, amp, sec]]); }, // effect on anyone (remote players too)
  maxHpOf(t) { return !t ? 0 : typeof t.maxHp === 'function' ? t.maxHp() : t.maxHp || 0; },
  addMaxHp(p, n) { if (!p || !p.local) return; p.st.modHp = clamp((p.st.modHp || 0) + (+n || 0), -18, 80); p.hp = Math.min(p.hp, p.maxHp()); }, // this life only (p.st resets on death)
  title(p, a, b) { if (p === G.me) UI.title(a, b || '', { fi: 5, st: 40, fo: 15 }); },
  solid(x, y, z) { return !!BL[G.world.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid; },
  // straight-line teleport up to dist blocks on the ground plane, stopping before walls; returns the distance moved
  blink(p, dist) {
    const d = lookVec(p.yaw, 0); let k = 0; for (let s = .5; s <= dist; s += .5) { const x = p.x + d.x * s, z = p.z + d.z * s; if (G.world.solidAt(x, p.y + .1, z) || G.world.solidAt(x, p.y + 1.5, z)) break; k = s; }
    p.x = p.px = p.x + d.x * k; p.py = p.y; p.z = p.pz = p.z + d.z * k; p.vx = p.vy = p.vz = 0; p.fallDist = 0; return k;
  },
  // ---------- effects everyone sees (G.emitAndApply → every client draws the same thing) ----------
  // one-shot: ops ['p', type, x, y, z, n, col] particles · ['l', ax, ay, az, bx, by, bz, col, step] line · ['r', x, y, z, r, col, n] ring
  vfx(...ops) { G.emitAndApply({ k: 'jfx', o: ops.map(o => o.map(v => typeof v === 'number' ? r1(v) : v)) }); },
  vfxRun(ops) { for (const o of ops || []) { if (o[0] === 'p') G.particles(o[1], o[2], o[3], o[4], o[5], o[6]); else if (o[0] === 'l') SK.srLine({ x: o[1], y: o[2], z: o[3] }, { x: o[4], y: o[5], z: o[6] }, o[7], o[8] || .4); else if (o[0] === 'r') SK.srRing(o[1], o[2], o[3], o[4], o[5], o[6] || 24); } },
  np(type, x, y, z, n, col) { SK.vfx(['p', type, x, y, z, n, col]); },
  nl(a, b, col, step) { SK.vfx(['l', a.x, a.y, a.z, b.x, b.y, b.z, col, step]); },
  nr(x, y, z, r, col, n) { SK.vfx(['r', x, y, z, r, col, n]); },
  nsyn(d, at) { G.emitAndApply({ k: 'syn', d, p: at ? [r1(at.x), r1(at.y), r1(at.z)] : 0 }); }, // AU.synth heard by everyone nearby
  // lasting visuals of one player (vex circling, gauge orbs …): s = small state, null = off. Every client calls JOB_HOOK[job].vis(e, s, age, tick) each tick
  // (s holds durations in ticks from now: age = ticks since it was sent). Cleared on death.
  jv(p, s) { G.emitAndApply({ k: 'jv', id: p.id, j: p.job, s: s || null }); },
  jvisTick() {
    for (const [id, v] of G.jvis) { const e = G.entity(id); if (!e || e.job !== v.j) { G.jvis.delete(id); continue; } /* gone / switched job */ if (!e.alive || e.spectator) continue; const H = JOB_HOOK[v.j]; if (H && H.vis) H.vis(e, v.s, G.tick - v.t0, G.tick); }
  },
  // visual copy of a projectile on every client (the owner simulates the real one and ends the copy): v = per-tick velocity
  _vbN: 0,
  vbolt(p, pos, v, col, n, life, g) { const id = p.id + ':v' + (++SK._vbN); G.emitAndApply({ k: 'vb', id, p: [r1(pos.x), r1(pos.y), r1(pos.z)], v: [r1(v.x), r1(v.y), r1(v.z)], c: col, n, l: life, g: g || 0 }); return id; },
  vboltSet(id, pos, v) { G.emitAndApply({ k: 'vbu', id, p: [r1(pos.x), r1(pos.y), r1(pos.z)], v: [r1(v.x), r1(v.y), r1(v.z)] }); },
  vboltEnd(id) { if (id) G.emitAndApply({ k: 'vbx', id }); },
  vboltTick() {
    const W = G.world;
    for (const b of G.vbolts) { b.age++; for (let s = 0; s < 4 && !b.dead; s++) { b.vy -= b.g / 4; b.x += b.vx / 4; b.y += b.vy / 4; b.z += b.vz / 4; if (W.solidAt(b.x, b.y, b.z)) b.dead = true; } if (b.age > b.life) b.dead = true; if (!b.dead) G.particles('dust', b.x, b.y, b.z, b.n, b.col); }
    G.vbolts = G.vbolts.filter(b => !b.dead);
  },
  // simple magic projectile, simulated by the owner's client (everyone sees its trail: SK.vbolt): o = { speed, gravity, size, life (ticks), damage, type, kb, color, trail, pierce, onHit(t, pos) }
  bolts: [],
  bolt(p, o) {
    const d = o.dir || lookVec(p.yaw, p.pitch), sp = o.speed || 1.2, e = { x: p.x, y: p.y + p.eye, z: p.z };
    SK.bolts.push({ owner: p, x: e.x + d.x * .6, y: e.y + d.y * .6 - .1, z: e.z + d.z * .6, vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, gravity: o.gravity || 0, size: o.size || .3, damage: o.damage || 0, type: o.type || 'magic', kb: o.kb || 0,
      life: o.life || 60, color: o.color || [1, .6, .2], trail: o.trail || 2, pierce: !!o.pierce, onHit: o.onHit, hitIds: new Set(), age: 0 });
    const q = SK.bolts[SK.bolts.length - 1]; q.vid = SK.vbolt(p, q, { x: q.vx, y: q.vy, z: q.vz }, q.color, q.trail, q.life + 1, q.gravity); // everyone sees the trail
  },
  boltTick() {
    const W = G.world;
    for (const q of SK.bolts) {
      if (q.dead) continue; q.age++; const sub = 4;
      for (let s = 0; s < sub && !q.dead; s++) {
        q.vy -= q.gravity / sub; q.x += q.vx / sub; q.y += q.vy / sub; q.z += q.vz / sub;
        if (W.solidAt(q.x, q.y, q.z)) { q.dead = true; break; }
        for (const t of otherTargets(q.owner, 60)) { if (q.hitIds.has(t.id)) continue; const hw = t.w / 2 + q.size; if (Math.abs(t.x - q.x) < hw && Math.abs(t.z - q.z) < hw && q.y > t.y - q.size && q.y < t.y + t.h + q.size) {
          q.hitIds.add(t.id); if (q.damage) SK.deal(t, q.damage, q.owner, q.type, q.kb, { x: q.x - q.vx, z: q.z - q.vz });
          if (q.onHit) q.onHit(t, { x: q.x, y: q.y, z: q.z });
          if (!q.pierce) { q.dead = true; break; } } }
      }
      if (!q.dead && q.age >= q.life) q.dead = true;
      if (q.dead) SK.vboltEnd(q.vid);
    }
    SK.bolts = SK.bolts.filter(q => !q.dead);
  },
};

// ===================== mobs =====================
const MOBT = {
  spider: { hp: 7, atk: 2, kb: .3, spd: .35, sc: .6, w: 1.4, h: .9 },
  cave: { hp: 1, atk: 1, kb: .1, spd: .35, sc: .3, w: .7, h: .5 },
  big: { hp: 40, atk: 4, kb: 0, spd: .25, sc: 1.5, w: 1.4, h: .9 },
  dog: { hp: 15, atk: 3, kb: .3, spd: .5, sc: 1, w: .6, h: .85 },
};
class Mob {
  constructor(id, type, owner, x, y, z) {
    const T = MOBT[type]; this.id = id; this.type = type; this.owner = owner; this.kind = 'mob'; this.local = true; this.alive = true;
    this.hp = T.hp; this.maxHp = T.hp; this.w = T.w * T.sc; this.h = T.h * T.sc; this.x = x; this.y = y; this.z = z; this.px = x; this.py = y; this.pz = z;
    this.vx = 0; this.vy = 0; this.vz = 0; this.yaw = 0; this.onGround = false; this.atkCd = 10; this.life = -1; this.invul = 0; this.hurtTime = 0; this.target = null; this.age = 0;
  }
  tick() {
    const T = MOBT[this.type]; this.px = this.x; this.py = this.y; this.pz = this.z; this.age++;
    if (this.life > 0 && --this.life === 0) { this.alive = false; G.fx('poof', this.x, this.y, this.z); this.burst(); return; }
    if (this.invul > 0) this.invul--; if (this.hurtTime > 0) this.hurtTime--; if (this.atkCd > 0) this.atkCd--;
    const dog = this.type === 'dog', own = dog ? G.entity(this.owner) : null;
    const ownD = own && own.alive && !own.spectator ? Math.hypot(own.x - this.x, own.z - this.z) : 0; const leash = dog && ownD > 12;
    if (leash) this.target = null;
    if (!leash && (this.age % 10 === 1 || !this.target || !this.target.alive || this.target.spectator)) {
      let b = null, bd = dog ? 16 : 40;
      // dogs: a spider right next to the dog (3 blocks) first, then whatever the summoner last hit / was hit by,
      // then the nearest enemy player within 16 blocks, then the nearest spider within 16 blocks
      let near = null, far = null;
      if (dog) { let nd = 3, fd = 16; for (const m of [...G.mobs, ...G.rmobs.values()]) { if (m === this || m.type === 'dog' || !m.alive || m.owner === this.owner || G.sameTeam(m.owner, this.owner)) continue; const d = dist3(m, this); if (d < nd) { nd = d; near = m; } if (d < fd) { fd = d; far = m; } } b = near; }
      const mk = own && own.st && own.st.dogMark; if (!b && mk && G.tick < mk.until) { const e = G.entity(mk.id); if (e && e.alive && !e.spectator && dist3(e, this) < 24 && !G.sameTeam(e.id, this.owner)) b = e; }
      if (!b) for (const t of G.players()) { if (t.id === this.owner || t.spectator || !t.alive || G.sameTeam(t.id, this.owner)) continue; const d = dist3(t, this); if (d < bd) { bd = d; b = t; } }
      if (!b && dog) b = far;
      this.target = b;
    }
    const t = this.target; let ix = 0, iz = 0; let fast = 1;
    const stun = this.hurtTime > 2; // MC-like: knocked back, pauses, then comes again
    if (t && !stun) {
      const dx = t.x - this.x, dz = t.z - this.z, d = Math.hypot(dx, dz) || 1; ix = dx / d; iz = dz / d; this.yaw = yawTo(dx, dz);
      const reach = Math.sqrt((2 * this.w) ** 2 + (t.w || .6)) + .2;
      if (d < reach && t.y < this.y + this.h + .1 && t.y + t.h > this.y - .1 && this.atkCd === 0) { // MC: attack box is not grown vertically
        const vsSpider = dog && t.kind === 'mob' && t.type !== 'dog';
        this.atkCd = vsSpider ? 10 : dog ? 30 : 20; // dogs bite players every 1.5 s
        G.damage(t, vsSpider ? 10 : T.atk, { type: 'mob', by: this.owner, dx: ix, dz: iz, kbx: T.kb, fx: this.x, fz: this.z, mob: 1 });
        if (dog) G.sound('ukchuk_2b', this, 16);
      }
      if (this.onGround && d > 2 && d < 4 && Math.random() < .05) { this.vy = .4; this.vx += ix * .3; this.vz += iz * .3; }
    }
    else if (!t && !stun && dog && own && own.alive && !own.spectator) { // follow the summoner (always, whenever not fighting)
      const dx = own.x - this.x, dz = own.z - this.z, d = Math.hypot(dx, dz); if (d > 6) fast = 1.5;
      if (d > 16 || Math.abs(own.y - this.y) > 8) { this.x = this.px = own.x; this.y = this.py = own.y + .1; this.z = this.pz = own.z; this.vx = this.vy = this.vz = 0; }
      else if (d > 3) { ix = dx / d; iz = dz / d; this.yaw = yawTo(dx, dz); }
    }
    const g0 = this.onGround; const acc = g0 ? T.spd * 0.295 * fast : 0.02;
    this.vx += ix * acc; this.vz += iz * acc;
    const r = moveAABB(G.world, this, this.vx, this.vy, this.vz, 0.6);
    this.onGround = r.ground; const bump = (r.hx || r.hz) && (ix || iz);
    if (bump && !dog) this.vy = 0.2; // spiders climb walls
    else if (bump && this.onGround) this.vy = 0.42; // dogs only jump
    else { if (r.hy && this.vy > 0) this.vy = 0; if (this.onGround && this.vy < 0) this.vy = 0; this.vy = (this.vy - 0.08) * 0.98; }
    if (r.hx) this.vx = 0; if (r.hz) this.vz = 0;
    const fr = g0 ? 0.546 : 0.91; this.vx *= fr; this.vz *= fr;
    if (aabbBlocks(G.world, this, d => d.lava) || this.y < -20) this.hurt(4, { type: 'lava', nokb: true });
  }
  burst() { if (this.type !== 'big' || this._burst) return; this._burst = true; const o = G.entity(this.owner) || { id: this.owner }; for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2; const c = G.spawnMob('cave', o, this.x, this.y + .3, this.z); c.vx = Math.cos(a) * .35; c.vz = Math.sin(a) * .35; c.vy = .35; c.life = 81; } }
  hurt(a, src) {
    if (!this.alive) return false;
    if (src.by && G.sameTeam(src.by, this.owner)) return false;
    if (this.type !== 'dog' && src.by && !src.mob && G.players().some(p => p.id === src.by)) a = Math.max(a, this.hp); // 스파이더's spiders die in one hit from a player
    if (this.invul > 10) return false; this.invul = 20; this.hurtTime = 10; this.hp -= a;
    if (!src.nokb && src.dx !== undefined) { const one = s => { this.vx = this.vx / 2 + src.dx * s; this.vz = this.vz / 2 + src.dz * s; if (this.onGround) this.vy = Math.min(.4, this.vy / 2 + s); }; one(.4); if (src.kbx) one(src.kbx * .5); }
    if (this.type === 'dog') AU.sfx(PACK.on ? 'wolfhurt' : 'hurt', this, .5, PACK.on ? 1 : 1.7); else AU.sfx('spider', this, .6, 1.4);
    if (this.hp <= 0) {
      this.alive = false; G.fx('poof', this.x, this.y + .3, this.z);
      this.burst();
    }
    return true;
  }
}

// ===================== arrows =====================
class Arrow {
  constructor(id, owner, o, v, sp, opt = {}) { this.id = id; this.owner = owner; this.x = o.x; this.y = o.y; this.z = o.z; this.vx = v.x * sp; this.vy = v.y * sp; this.vz = v.z * sp; this.stuck = false; this.life = 600; this.burst = !!opt.burst; this.crit = !!opt.crit; this.noPick = !!opt.noPick; this.potion = !!opt.potion; this.local = !!opt.local; this.age = 0; this.dead = false; }
  tick() {
    this.age++;
    if (this.stuck) { if (--this.life <= 0) this.dead = true; if (this.local) this.checkBurst(); if (this.local && !this.noPick && !this.burst) { const o = G.entity(this.owner); if (o && o.local && dist3(o, this) < 1.5 && this.age > 10) { o.addItem('arrow', 1); this.dead = true; AU.sfx('pop', o, .5); } } return; }
    const sp = Math.hypot(this.vx, this.vy, this.vz); const d = { x: this.vx / sp, y: this.vy / sp, z: this.vz / sp };
    const bh = G.world.ray(this, d, sp);
    if (this.local) {
      let best = null, bt = bh ? bh.t : sp;
      for (const t of G.targets()) { if (t.id === this.owner && this.age < 5) continue; const tt = rayAABB(this, d, t, bt, .3); if (tt !== null && tt < bt) { bt = tt; best = t; } }
      if (best && this.potion) { this.x += d.x * bt; this.y += d.y * bt; this.z += d.z * bt; this.splash(); return; }
      if (best) {
        let dmg = Math.ceil(sp * 2); if (this.crit) dmg += randi(0, Math.floor(dmg / 2 + 1));
        const l = Math.hypot(this.vx, this.vz) || 1;
        G.damage(best, dmg, { type: 'proj', by: this.owner, dx: this.vx / l, dz: this.vz / l, kbx: 0, fx: this.x, fz: this.z });
        AU.sfx('arrowhit', best); this.dead = true; G.emit({ k: 'ae', id: this.id }); return;
      }
    }
    if (bh && this.potion) { this.x += d.x * bh.t; this.y += d.y * bh.t; this.z += d.z * bh.t; if (this.local) this.splash(); else { this.dead = true; G.particles('potion', this.x, this.y, this.z); AU.sfx('glass', this, .5); } return; }
    if (bh) { this.x += d.x * bh.t; this.y += d.y * bh.t; this.z += d.z * bh.t; this.stuck = true; AU.sfx('arrowhit', this, .5); if (this.local) this.checkBurst(); return; }
    this.x += this.vx; this.y += this.vy; this.z += this.vz; this.vx *= .99; this.vy = this.vy * .99 - .05; this.vz *= .99;
    if (this.crit && this.age % 2 === 0) G.particles('crit', this.x, this.y, this.z, 1);
    if (this.local) this.checkBurst();
    if (this.y < -25) this.dead = true;
  }
  // splash potion of harming II: 6 to everyone within 3 blocks of the impact (thrower excluded)
  splash() {
    for (const t of G.targets()) { if (t.id === this.owner) continue; const c = { x: t.x, y: t.y + t.h / 2, z: t.z }; if (dist3(c, this) <= 3) G.damage(t, 6, { type: 'magic', by: this.owner, nokb: true }); }
    G.particles('potion', this.x, this.y, this.z); AU.sfx('glass', this, .5); this.dead = true;
  }
  checkBurst() {
    if (!this.burst || this.dead) return;
    const id = G.world.get(Math.floor(this.x), Math.floor(this.y - .5), Math.floor(this.z));
    if (!id || !BL[id].solid && !BL[id].snow) { if (!this.stuck) return; }
    let b = null, bd = 3; for (const t of G.targets()) { if (t.id === this.owner || G.sameTeam(t.id, this.owner)) continue; const dd = dist3(t, this); if (dd <= bd) { bd = dd; b = t; } }
    if (b) G.damage(b, 8, { type: 'explosion', by: this.owner, nokb: true, fx: this.x, fz: this.z });
    G.fx('flame', this.x, this.y, this.z); this.dead = true; G.emit({ k: 'ae', id: this.id });
  }
}
