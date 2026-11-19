// ===================== Random Block Survival: game state machine + networking + entities =====================
// The host (earliest joiner) runs the round: lobby -> prep (arena generation) -> count (10..GO) -> start (3,2,1,start)
// -> game (timer) -> tover -> dm (deathmatch) -> win (ceremony 7.5 s) -> lobby. Its state rides in its presence (gs);
// every client plays the same timeline locally from gs (titles, sounds, teleports, arena building), so nothing depends
// on single events arriving. Blocks, hits, drops and container contents are events; hits resolve on the victim's client.
const RV = { // markers.json points (minecraft coords)
  spawn: [0.5, 31, 0.5], ret: [0.5, 32, 0.5], dm: [4.5, 73, 0.5], dmSpec: [4.5, 79, 0.5], dm25: [4.5, 61, 1.5], dmSpec25: [4.5, 67, 1.5], miniRet: [5.5, 94, -0.5], mini1: [16.5, 94, 6.5], mini2: [16.5, 94, 0.5], miniCage: [11.5, 92, 7.5], podium: [-45.5, 10, -39.5], aud: [-34.5, 10, -39.5], playground: [2.5, 96, -11.5],
  // V2.1: the arena judge box is the 25-player one in both modes; the deathmatch has a 9-player floor (y72..82) and a new 25-player floor (y60..70)
  AREAS: { arena: [-27, 200, -28, 27, 216, 27], dm: [[-2, 73, -5, 9, 78, 6], [-3, 61, -6, 12, 65, 9]], dmspec: [[-2, 79, -5, 9, 81, 6], [-3, 67, -6, 12, 69, 9]], minizone: [10, 88, -2, 18, 96, 8], lobby: [-21, 29, -21, 21, 43, 21], playground: [-22, 84, -22, 21, 105, 21], winner: [-56, 5, -56, -25, 16, -25] },
  TIME: ['약 0초', '30초', '1분', '1분 30초', '2분', '2분 30초', '3분', '3분 30초', '4분', '4분 30초', '5분', '5분 30초', '6분', '6분 30초', '7분', '7분 30초', '8분', '8분 30초', '9분', '9분 30초', '10분', '영원히 안끝남!', '게임시간도 랜덤!', '5분 30초', '게임 시작 금지!'], // 23 = the old '5분 30초 + 기본템' (kit is its own setting now: opts.kit); skipped when cycling
};
const RG = {
  tick: 0, me: null, nid: null, remotes: new Map(), bots: [], items: new Map(), projs: [], parts: [], be: new Map(), chestType: new Map(),
  since: Date.now(), hostOff: 0, seq: 0, mods: [], rd: 0, wins: 0,
  gs: { ph: 'lobby', t: 0, seed: 1, rnd: 0, end: 0, sp: {}, win: null, dmp: [], big: 0, mini: { ph: 'idle', t: 0 }, opts: { time: 11, kit: 1, brk: 1, build: 0, lava: 1, pvp: 1, shield: 0, typo: 0, bots: 0 } },
  lp: { ph: 'lobby', key: '' }, // local copy of the phase being played + fired steps
  init() {
    RW.init(); this.nid = uid(8);
    try { const s = JSON.parse(localStorage.getItem('rbs_stats') || '{}'); this.wins = s.wins | 0; this.playtime = s.pt | 0; this.ach = s.ach || {}; } catch (e) { this.ach = {}; this.playtime = 0; }
    const me = this.me = new RPlayer(this.nid, RUI.name); me.skin = RUI.skin; this.toSpawn(me);
    try { const o = JSON.parse(localStorage.getItem('rbs_host2') || 'null'); if (o) { if (o.kit === undefined) o.kit = o.time === 23 ? 1 : 0; if (o.time === 23) o.time = 11; Object.assign(this.gs.opts, o); } /* old saves: '5분 30초 / 기본템' -> 5:30 + kit on */ this.gs.opts.typo = 0; this.gs.opts.bots = 0; } catch (e) { }
  },
  saveStats() { try { localStorage.setItem('rbs_stats', JSON.stringify({ wins: this.wins, pt: this.playtime, ach: this.ach })); } catch (e) { } },
  // ---------- helpers ----------
  mcOf(p) { return [p.x - RB_DIM.ox, p.y - RB_DIM.oy, p.z - RB_DIM.oz]; },
  inBox(p, b) { const [x, y, z] = this.mcOf(p); return x >= b[0] && x < b[3] + 1 && y >= b[1] && y < b[4] + 1 && z >= b[2] && z < b[5] + 1; },
  area(p) { for (const k in RV.AREAS) { const B = RV.AREAS[k]; if (k === 'minizone') continue; if (Array.isArray(B[0]) ? B.some(b => this.inBox(p, b)) : this.inBox(p, B)) return k; } return 'other'; },
  itemsClear() { for (const [id, e] of this.items) if (!this.inMini(e)) this.items.delete(id); },
  inMini(p) { return this.inBox(p, RV.AREAS.minizone); },
  dmPt(spec) { return this.gs.big ? (spec ? RV.dmSpec25 : RV.dm25) : (spec ? RV.dmSpec : RV.dm); },
  safeAt(p) { const a = this.area(p); return a === 'lobby' || a === 'winner' || a === 'dmspec'; },
  pvpAt(p) { const a = this.area(p); if (a === 'playground') return true; if (a === 'arena') return this.gs.ph === 'game' && !!this.gs.opts.pvp; if (a === 'dm') return this.gs.ph === 'dm' && this.hostNow() >= this.gs.t + 7500; return false; },
  canEdit(x, y, z) { // minecraft block coords
    const ph = this.gs.ph; if (this.me.mode !== 'survival') return false;
    const R = RW.R(this.gs.big); if (ph === 'game' && x >= -R && x <= R && y >= 201 && y <= 215 && z >= -R && z <= R) return true;
    if (ph === 'dm' && this.gs.opts.build && (this.gs.big ? x >= -3 && x <= 12 && y >= 61 && y <= 65 && z >= -6 && z <= 9 : x >= -2 && x <= 9 && y >= 73 && y <= 78 && z >= -5 && z <= 6)) return true;
    const M = this.gs.mini; if (M && M.ph === 'fight' && (M.a === this.me.id || M.b === this.me.id) && x >= 14 && x <= 18 && y >= 92 && y <= 96 && z >= -2 && z <= 8) return true;
    return false;
  },
  tp(p, m, yawDeg) { const P = RW.P(m[0], m[1], m[2]); p.x = p.px = P.x; p.y = p.py = P.y; p.z = p.pz = P.z; p.vx = p.vy = p.vz = 0; p.fallDist = 0; if (yawDeg !== undefined) p.yaw = yawDeg * D2R; },
  toSpawn(p) { this.tp(p, RV.spawn, 0); p.pitch = 0; },
  isHost() { for (const r of this.remotes.values()) if (r.since && (r.since < this.since || (r.since === this.since && r.id < this.nid))) return false; return true; },
  hostNow() { return Date.now() + (this.isHost() ? 0 : this.hostOff); },
  players() { const a = [this.me]; for (const b of this.bots) a.push(b); for (const r of this.remotes.values()) { a.push(r); if (r.bots) for (const b of r.bots) a.push(b); } return a; },
  byId(id) { if (this.me && id === this.me.id) return this.me; for (const b of this.bots) if (b.id === id) return b; for (const r of this.remotes.values()) { if (r.id === id) return r; if (r.bots) for (const b of r.bots) if (b.id === id) return b; } return null; },
  alivePlayers(area) { return this.players().filter(p => p.alive !== false && !p.spectator && this.area(p) === area); },
  emit(ev) { if (NET.mode !== 'off') NET.emit(ev); },
  chat(m) { RUI.chat(m); }, title(t, s, o) { RUI.title(t, s, o); },
  particles(kind, x, y, z, n = 6, col) {
    const C = { crit: [1, 1, .7], heart: [1, .2, .3], smoke: [.5, .5, .5], splash: [1, .3, .4], xp: [.6, 1, .3], fw: null, water: [.3, .5, 1], gas: [.3, .1, .35], totem: [.9, .9, .2] }; const c0 = col || C[kind] || [1, 1, 1];
    for (let i = 0; i < n; i++) { const c = kind === 'fw' ? [Math.random(), Math.random(), Math.random()] : c0; this.parts.push({ x: x + rand(-.3, .3), y: y + rand(-.3, .3), z: z + rand(-.3, .3), vx: rand(-.12, .12) * (kind === 'fw' ? 3 : 1), vy: rand(0, .15) * (kind === 'fw' ? 2 : 1), vz: rand(-.12, .12) * (kind === 'fw' ? 3 : 1), life: 14 + Math.random() * 14, s: kind === 'block' ? .06 : .05, col: c, g: kind === 'fw' ? .01 : .02 }); }
  },
  // MC: breaking spawns a 4x4x4 grid of terrain particles flying outward from the centre; hitting spawns a few on the hit face
  blockParts(x, y, z, id) { const B = BL[id]; if (!B || B.air) return; const [ox, oy] = RTEX.xy(B.tiles[0] || B.tiles[4] || 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { if (Math.random() < .45) continue; const px = (i + .5) / 4, py = (j + .5) / 4, pz = (k + .5) / 4;
      this.parts.push({ x: x + px, y: y + py, z: z + pz, vx: (px - .5) * rand(.1, .25), vy: (py - .5) * rand(.1, .25) + .05, vz: (pz - .5) * rand(.1, .25), life: 8 + Math.random() * 24, s: rand(.05, .1), tex: [ox + (Math.random() * 12 | 0), oy + (Math.random() * 12 | 0)], g: .04, col: 1 }); } },
  hitParts(x, y, z, id, n = 3) { const B = BL[id]; if (!B || B.air) return; const [ox, oy] = RTEX.xy(B.tiles[0] || B.tiles[4] || 0); const P = RW.P(x, y, z); const cam = RR.cam ? RR.cam.eye : P;
    for (let i = 0; i < n; i++) { let px = P.x + Math.random(), py = P.y + Math.random(), pz = P.z + Math.random(); const dx = cam.x - (P.x + .5), dy = cam.y - (P.y + .5), dz = cam.z - (P.z + .5); const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
      if (ax >= ay && ax >= az) px = P.x + (dx > 0 ? 1.03 : -.03); else if (ay >= az) py = P.y + (dy > 0 ? 1.03 : -.03); else pz = P.z + (dz > 0 ? 1.03 : -.03);
      this.parts.push({ x: px, y: py, z: pz, vx: rand(-.03, .03), vy: rand(0, .06), vz: rand(-.03, .03), life: 6 + Math.random() * 10, s: rand(.04, .07), tex: [ox + (Math.random() * 12 | 0), oy + (Math.random() * 12 | 0)], g: .04, col: 1 }); } },
  // ---------- blocks ----------
  setBlock(x, y, z, id, net = true, quiet = false) { // minecraft coords
    const old = RW.getM(x, y, z); if (old === id) return; RW.setM(x, y, z, id);
    const k = x + ',' + y + ',' + z; if (BL[old].use && !BL[id].use) { this.be.delete(k); }
    if (this.isHost()) this.mods.push([x, y, z, id]);
    if (net) this.emit(quiet ? { k: 'b', p: [x, y, z], id, q: 1 } : { k: 'b', p: [x, y, z], id });
  },
  // gravity blocks (sand, gravel, anvil) drop straight down when the block under them goes away
falls: [], // falling block entities (sand, gravel, anvil) — animated on every client like MC's FallingBlockEntity
  fallCheck(x, y, z) { for (let yy = y + 1; yy < y + 16; yy++) { const id = RW.getM(x, yy, z); if (!BL[id].fall || !BL[RW.getM(x, yy - 1, z)].repl) break; this.setBlock(x, yy, z, 0, true, true); this.startFall(x, yy, z, id, true); } },
  startFall(x, y, z, id, own) { if (own) this.emit({ k: 'fall', p: [x, y, z], id }); this.falls.push({ x, z, y, y0: y, py: y, vy: 0, id, own }); },
  fallTick() {
    for (const f of this.falls) {
      f.py = f.y; f.vy = (f.vy - .04) * .98; let ny = f.y + f.vy; const by = Math.floor(ny);
      if (by < 1) { f.done = true; continue; }
      if (!BL[RW.getM(f.x, by, f.z)].repl) { // landed on the block below
        const ly = by + 1; f.done = true; f.y = ly; const B = BL[f.id]; const P = RW.P(f.x + .5, ly + .5, f.z + .5);
        if (BL[RW.getM(f.x, ly, f.z)].repl) this.setBlock(f.x, ly, f.z, f.id, f.own); else if (f.own && B.item && RIT[B.item]) this.dropStack({ id: B.item, n: 1 }, P.x, P.y, P.z);
        if (B.anvil) { RAU.at('anvil_land', P, 1); const dmg = Math.min(40, Math.max(0, Math.floor((f.y0 - ly - 1) * 2))); if (dmg) for (const q of [this.me, ...(this.isHost() ? this.bots : [])]) { const [mx, my, mz] = this.mcOf(q); if (q.alive && !q.spectator && Math.floor(mx) === f.x && Math.floor(mz) === f.z && my >= ly - .5 && my < ly + 1.2) q.hurt(dmg, { type: 'anvil' }); } }
        else RAU.blk('place', B.snd, P);
        continue;
      }
      f.y = ny;
    }
    this.falls = this.falls.filter(f => !f.done);
  },
  breakBlock(p, x, y, z, drops = true) {
    const id = RW.getM(x, y, z), B = BL[id]; if (!id || B.unbreak) return;
    const k = x + ',' + y + ',' + z; const c = RW.P(x + .5, y + .5, z + .5);
    // container contents spill out
    if (B.use === 'chest' || B.use === 'furnace') { const d = this.beGet(x, y, z); if (d && d.inv) for (const s of d.inv) if (s) this.dropStack(s, c.x, c.y, c.z); this.be.delete(k); this.emit({ k: 'be', key: k, d: null }); }
    this.setBlock(x, y, z, 0); this.blockParts(c.x - .5, c.y - .5, c.z - .5, id); RAU.blk('break', B.snd, c);
    if (drops && p.canHarvest(B)) {
      const fort = (p.held() && p.held().en && p.held().en.fortune) || 0;
      let dr = B.drop === undefined || B.drop === null ? (B.noDrop || B.drop === null && B.glass ? null : B.item) : B.drop; if (typeof dr === 'function') dr = dr(Math.random(), fort);
      if (B.glass) dr = null;
      if (dr && RIT[dr]) { let n = B.dropN ? randi(B.dropN[0], B.dropN[1]) : 1; if (B.fort && fort) n *= Math.max(1, randi(0, fort + 1)); this.dropStack({ id: dr, n }, c.x, c.y, c.z); }
      if (B.xp) this.dropXp(randi(B.xp[0], B.xp[1]), c.x, c.y, c.z);
    }
    const I = p.heldI(); if (I && I.dur && B.hard > 0) p.damageItem({ arr: p.inv, i: p.sel }, I.sword ? 2 : 1);
    p.exhaust(.005); this.fallCheck(x, y, z);
  },
  // round start (시작시 주변블록 파괴): the 3x3x2 around the spawn pocket breaks, drops included
  // 기본템 (host setting opts.kit): stone pickaxe / axe / sword + 4 healing splash potions
  giveKit(p) { for (const id of ['stone_pickaxe', 'stone_axe', 'stone_sword']) p.give({ id, n: 1 }); p.give({ id: 'splash_potion', n: 4 }); },
  breakAround(p) { const [x, y, z] = this.mcOf(p).map(Math.floor); for (let dy = 0; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const id = RW.getM(x + dx, y + dy, z + dz); if (id && !BL[id].unbreak && !(dx === 0 && dz === 0)) this.breakBlock(p, x + dx, y + dy, z + dz, true); } },
  placeBlock(p, x, y, z, key) {
    const id = RBLK.K(key); if (!id) return false; const B = BL[id];
    // never inside a player
    const P = RW.P(x, y, z); if (B.solid) for (const q of this.players()) { if (q.spectator || q.alive === false) continue; const hw = .3; if (q.x + hw > P.x && q.x - hw < P.x + 1 && q.z + hw > P.z && q.z - hw < P.z + 1 && q.y + 1.8 > P.y && q.y < P.y + 1) return false; }
    this.setBlock(x, y, z, id); RAU.blk('place', B.snd, { x: P.x + .5, y: P.y + .5, z: P.z + .5 });
    if (B.fall && BL[RW.getM(x, y - 1, z)].repl) { this.setBlock(x, y, z, 0, true, true); this.startFall(x, y, z, id, true); }
    return true;
  },
  // ---------- block entities (chests, furnaces) ----------
  LOOT: Object.assign(Object.fromEntries(RB_ARENA.filter(e => e.loot).map(e => [e.r, e.loot])), Object.fromEntries(RB_MINI.filter(e => e.loot).map(e => ['m' + e.m, e.loot]))),
  ENCH_ID: { 0: 'protection', 9: 'sharpness', 15: 'efficiency', 17: 'unbreaking', 12: 'knockback', 13: 'fire_aspect', 18: 'fortune' },
  LOOTID: { 'minecraft:cobblestone': 'cobblestone', 'minecraft:splash_potion': 'splash_potion', 'minecraft:experience_bottle': 'experience_bottle', 'minecraft:diamond': 'diamond', 'minecraft:log': 'oak_log', 'minecraft:raw_iron': 'raw_iron', 'minecraft:coal': 'coal', 'minecraft:enchanting_table': 'enchanting_table', 'minecraft:lapis_lazuli': 'lapis_lazuli', 'minecraft:raw_gold': 'raw_gold', 'minecraft:iron_nugget': 'iron_nugget', 'minecraft:enchanted_book': 'enchanted_book' },
  beGet(x, y, z) {
    const k = x + ',' + y + ',' + z; let d = this.be.get(k); if (d) return d;
    const B = BL[RW.getM(x, y, z)];
    if (B.use === 'chest') { const inv = new Array(27).fill(null); const lt = this.chestType.get(k); if (lt && this.LOOT[lt]) this.LOOT[lt].forEach((it, i) => { const id = this.LOOTID[it.id]; if (!id) return; const st = { id, n: it.count }; if (it.ench) { st.en = {}; for (const e of it.ench) { const n = this.ENCH_ID[e.id]; if (n) st.en[n] = e.lvl; } } inv[(String(lt)[0] === 'm' ? [4, 11, 13, 15, 22] : [4, 10, 12, 13, 14, 16, 22])[i] ?? i] = st; }); d = { inv }; }
    else if (B.use === 'furnace') d = { inv: [null, null, null], burn: 0, burnMax: 0, cook: 0 };
    else return null;
    this.be.set(k, d); return d;
  },
  beSave(x, y, z, d) { const k = x + ',' + y + ',' + z; d.own = this.me.id; this.be.set(k, d); this.emit({ k: 'be', key: k, d }); },
  furnTick() { // furnaces owned by me (last one who touched them) smelt
    for (const [k, d] of this.be) {
      if (!d.inv || d.inv.length !== 3 || d.own !== this.me.id) continue; const [x, y, z] = k.split(',').map(Number); const B = BL[RW.getM(x, y, z)]; if (!B || B.use !== 'furnace') continue;
      const inp = d.inv[0], fuel = d.inv[1], out = d.inv[2]; const r = inp && RSMELT[inp.id]; const ok = r && (!B.blast || r[2]) && (!out || (out.id === r[0] && out.n < RITEM.max(out.id)));
      let ch = false;
      if (d.burn <= 0 && ok && fuel && RIT[fuel.id] && RIT[fuel.id].fuel) { d.burn = d.burnMax = RIT[fuel.id].fuel * (B.blast ? .5 : 1); fuel.n--; if (!fuel.n) d.inv[1] = null; ch = true; }
      if (d.burn > 0) { d.burn--; if (ok) { d.cook++; if (d.cook >= (B.blast ? 100 : 200)) { d.cook = 0; inp.n--; if (!inp.n) d.inv[0] = null; if (out) out.n++; else d.inv[2] = { id: r[0], n: 1 }; d.xp = (d.xp || 0) + r[1]; ch = true; } } else d.cook = 0; }
      else if (d.cook > 0) d.cook = Math.max(0, d.cook - 2);
      const on = d.burn > 0; if (on !== !!B.on) { this.setBlock(x, y, z, RBLK.K((B.blast ? 'blast_furnace' : 'furnace') + (on ? '_on|' : '|') + B.dir)); }
      if (ch || this.tick % 20 === 0) this.emit({ k: 'be', key: k, d });
    }
  },
  // ---------- item entities ----------
  dropStack(st, x, y, z, vx, vy, vz, nopick) {
    const id = this.me.id + ':' + (++this.seq); const e = { id, st: Object.assign({}, st), x, y, z, vx: vx ?? rand(-.1, .1), vy: vy ?? .2, vz: vz ?? rand(-.1, .1), age: 0, pick: nopick ? 40 : 10, own: this.me.id };
    this.items.set(id, e); this.emit({ k: 'drop', e }); return e;
  },
  dropXp(n, x, y, z) { while (n > 0) { const v = n >= 17 ? 17 : n >= 7 ? 7 : n >= 3 ? 3 : 1; n -= v; this.dropStack({ id: 'xp', n: v }, x, y, z, rand(-.15, .15), .25, rand(-.15, .15)); } },
  itemTick() {
    const W = RW.w; const me = this.me;
    for (const [id, e] of this.items) {
      e.age++; if (e.pick > 0) e.pick--;
      const xp = e.st.id === 'xp';
      if (xp && me.alive && !me.spectator) { const dx = me.x - e.x, dy = me.y + .8 - e.y, dz = me.z - e.z, d = Math.hypot(dx, dy, dz); if (d < 7.5 && d > .01) { const k = (1 - d / 7.5) ** 2 * .1; e.vx += dx / d * k; e.vy += dy / d * k; e.vz += dz / d * k; } }
      e.vy -= xp ? .03 : .04; const nx = e.x + e.vx, ny = e.y + e.vy, nz = e.z + e.vz;
      if (W.solidAt(nx, e.y + .05, e.z)) e.vx *= -.3; else e.x = nx; if (W.solidAt(e.x, e.y + .05, nz)) e.vz *= -.3; else e.z = nz;
      if (W.solidAt(e.x, ny, e.z)) { e.vy = 0; e.y = Math.floor(ny) + 1; e.vx *= .6; e.vz *= .6; e.ground = true; } else { e.y = ny; e.ground = false; }
      e.vx *= .98; e.vz *= .98; e.vy *= .98;
      if (e.age > 6000 || e.y < -10) { this.items.delete(id); continue; }
      // lobby / spectator box remove dropped items (original: kill @e[type=item] there)
      const ar = this.area(e); if ((ar === 'lobby' || ar === 'dmspec') && e.age > 2) { this.items.delete(id); continue; }
      // dungeon key thrown at the wall spot
      if (e.own === me.id && e.st.id === 'tripwire_hook' && e.ground) { const [mx, my, mz] = this.mcOf(e); if (Math.hypot(mx + 16.5, mz + 18.5) < 1.6 && Math.abs(my - 90) < 1.6) { this.items.delete(id); this.emit({ k: 'pick', i: id }); this.dungeonWall(); continue; } }
      // pickup: me, and on the host my bots too
      if (!e.pick) for (const p of [me, ...this.bots]) {
        if (!p.alive || p.spectator || p.mode === 'spectator') continue;
        const d = Math.hypot(p.x - e.x, p.y + .9 - e.y, p.z - e.z); if (d >= (xp ? 1.2 : 1.6)) continue;
        if (xp) { this.addXp(p, e.st.n); RAU.at('orb', p); this.items.delete(id); this.emit({ k: 'pick', i: id }); break; }
        if (this.area(p) === 'lobby') continue;
        const left = p.give(e.st); if (left < e.st.n) { RAU.at('pop', p); if (left) { e.st.n = left; this.emit({ k: 'drop', e }); } else { this.items.delete(id); this.emit({ k: 'pick', i: id }); break; } }
      }
    }
  },
  addXp(p, n) { p.xp += n; const need = L => L < 16 ? 2 * L + 7 : L < 31 ? 5 * L - 38 : 9 * L - 158; while (p.xp >= need(p.lvl)) { p.xp -= need(p.lvl); p.lvl++; if (p === this.me && p.lvl % 5 === 0) RAU.play('levelup'); } },
  useLevels(p, n) { const need = L => L < 16 ? 2 * L + 7 : L < 31 ? 5 * L - 38 : 9 * L - 158; p.lvl = Math.max(0, p.lvl - n); p.xp = Math.min(p.xp, need(p.lvl) - 1); },
  // ---------- projectiles (splash potions, xp bottles) ----------
  throwProj(p, kind) {
    const d = lookVec(p.yaw, p.pitch - .35); const sp = .5; const o = { i: p.id + ':' + (++this.seq), kind, x: p.x + d.x * .3, y: p.y + p.eye - .1, z: p.z + d.z * .3, vx: d.x * sp + p.vx, vy: d.y * sp + .1, vz: d.z * sp + p.vz, by: p.id, own: p === this.me || p.isBot, life: 200 };
    this.projs.push(o); this.emit({ k: 'proj', o: Object.assign({}, o, { own: false }) }); RAU.at('throw', p);
  },
  projTick() {
    const W = RW.w;
    for (const o of this.projs) {
      o.life--; o.vy -= .05; o.vx *= .99; o.vy *= .99; o.vz *= .99; const nx = o.x + o.vx, ny = o.y + o.vy, nz = o.z + o.vz;
      let hit = W.solidAt(nx, ny, nz); if (!hit && o.life < 196) for (const q of this.players()) { if (q.id === o.by || q.spectator || q.alive === false) continue; if (Math.abs(q.x - nx) < .4 && Math.abs(q.z - nz) < .4 && ny > q.y && ny < q.y + 1.8) { hit = true; break; } }
      if (hit || o.life <= 0) { o.dead = true; if (o.own) this.splash(o, nx, ny, nz); continue; }
      o.x = nx; o.y = ny; o.z = nz;
    }
    this.projs = this.projs.filter(o => !o.dead);
  },
  splash(o, x, y, z) { this.emit({ k: 'splash', kind: o.kind, x, y, z, by: o.by }); this.onSplash(o.kind, x, y, z); if (o.kind === 'xp') this.dropXp(randi(3, 11), x, y, z); },
  onSplash(kind, x, y, z) {
    RAU.blk('break', 'glass', { x, y, z }); this.particles('splash', x, y, z, 18, kind === 'xp' ? [.4, .9, .3] : [1, .25, .4]);
    if (kind !== 'heal') return; for (const p of [this.me, ...this.bots]) { if (!p.alive || p.spectator) continue; const d = Math.hypot(p.x - x, p.y + .9 - y, p.z - z); if (d < 4) p.heal(8 * (1 - d / 4) + .5); } // instant health II
  },
  // ---------- combat routing ----------
  hit(t, dmg, src) {
    if (t.local) { t.hurt(dmg, src); return; } // me or my bots
    this.emit({ k: 'hit', t: t.id, d: dmg, s: { type: src.type, by: src.by, kx: src.kx, kz: src.kz, kbx: src.kbx, fire: src.fire, axe: src.axe, from: src.from } });
    t.hurtTime = 10; // instant feedback; the victim confirms with its own hp
  },
  die(p, src) {
    if (!p.alive) return; const wasArea = this.area(p);
    const killer = src.by ? this.byId(src.by) : (p.lastBy && this.tick - p.lastByT < 200 ? this.byId(p.lastBy) : null);
    const msg = this.deathMsg(p, src, killer);
    this.emit({ k: 'death', m: msg }); this.chat(msg);
    // keepinventory=false: everything drops where you died
    for (const s of p.allItems()) this.dropStack(s, p.x, p.y + .8, p.z, rand(-.2, .2), .25, rand(-.2, .2), true);
    const xpd = Math.min(100, p.lvl * 7); if (xpd) this.dropXp(xpd, p.x, p.y + .5, p.z);
    p.clearInv(); p.xp = 0; p.lvl = 0; p.clearEff(); p.fire = 0; p.hp = 20; p.food = 20; p.sat = 5; p.hurtTime = 0; p.dig = null; p.useT = 0;
    // doimmediaterespawn: lobby (during the deathmatch: its spectator box)
    if (this.gs.ph === 'dm') this.tp(p, this.dmPt(true)); else this.toSpawn(p); p.mode = 'adventure';
    if (p === this.me && (wasArea === 'arena' || wasArea === 'dm') && (this.gs.ph === 'game' || this.gs.ph === 'dm')) { this.chat('§7탈락했어요. 핫바나 메뉴의 §b👁 관전하기§7로 경기를 볼 수 있어요.'); }
  },
  deathMsg(p, src, k) {
    const n = p.name; if (k && k !== p) return n + '님이 ' + k.name + '님에게 살해당했습니다';
    return n + ({ lava: '님이 용암에서 수영하려 했습니다', anvil: '님이 떨어지는 모루에 짓눌렸습니다', fire: '님이 불에 타 죽었습니다', magma: '님이 바닥이 용암인 걸 몰랐습니다', wither: '님이 시들어 죽었습니다', poison: '님이 독가스에 쓰러졌습니다', void: '님이 세상 밖으로 떨어졌습니다', starve: '님이 굶어 죽었습니다' }[src.type] || '님이 사망했습니다');
  },
  // ---------- dungeon (playground easter egg) ----------
  dungeonWall() { RAU.play('explode'); this.particles('smoke', ...Object.values(RW.P(-16.5, 90, -19.5)), 30); this.setBlock(-17, 89, -20, 0); this.setBlock(-17, 90, -20, 0); setTimeout(() => { const c = RBLK.K('cracked_stone_bricks'); this.setBlock(-17, 89, -20, c); this.setBlock(-17, 90, -20, c); }, 5000); },
  // ---------- host block palette ----------
  palDefault() { const m = new Map(); for (const e of RB_ARENA) { const k = e.fixed + (e.loot ? '#' + e.r : ''); m.set(k, (m.get(k) || 0) + 1); } return [...m].map(([k, w]) => { const [b, r] = k.split('#'); return r ? [b, w, +r] : [b, w]; }); },
  palInfo() { const P = this.gs.opts.pal; if (!P || !P.length) return '§7기본 (원작 33칸 · 각 1/33)'; return '§a커스텀 ' + P.filter(e => +e[1] > 0).length + '종 · ' + (this.gs.opts.palN ? '개수 지정' : '확률'); },
  // ---------- hotbar menu items in the lobby (locked in their slots like Bedrock's lock_in_slot; the menu chest still works too) ----------
  KIT: ['menu_ready', 'menu_playground', 'menu_spec', null, 'written_book', null, 'menu_host', 'menu_settings', 'menu_more'],
  kitTick() {
    const me = this.me; const a = this.area(me); const want = me.alive && !me.spectator && me.mode === 'adventure' && (a === 'lobby' || a === 'playground' || a === 'winner');
    for (let i = 0; i < me.inv.length; i++) { const s = me.inv[i]; if (s && RIT[s.id] && RIT[s.id].menu && (!want || this.KIT[i] !== s.id)) me.inv[i] = null; }
    if (me.off && RIT[me.off.id] && RIT[me.off.id].menu) me.off = null;
    if (!want) return;
    this.KIT.forEach((id, i) => { if (!id) return; const s = me.inv[i]; if (s && s.id === id) { s.glow = id === 'menu_ready' && !!this.rd; return; } if (s) { me.inv[i] = null; const l = me.give(s); if (l) this.dropStack(Object.assign({}, s, { n: l }), me.x, me.y + 1, me.z); } me.inv[i] = { id, n: 1 }; });
  },
  // ---------- adventure-mode interactions (doors, trapdoors, fence gates, levers, buttons, pressure plates) ----------
  flipKey(id, i) { const q = RB_KEYS[id].split('|'); q[i] = q[i] === '1' ? '0' : '1'; return RBLK.K(q.join('|')) || id; },
  useBlock(x, y, z, who) {
    const id = RW.getM(x, y, z), B = BL[id], key = RB_KEYS[id] || ''; const P = RW.P(x + .5, y + .5, z + .5); const at = k => RAU.at(k, P);
    switch (B.use) {
      case 'door': { const p = key.split('|'); const oy = p[5] === 'u' ? -1 : 1; const n = this.flipKey(id, 3); this.setBlock(x, y, z, n);
        const o = RW.getM(x, y + oy, z); if ((RB_KEYS[o] || '').startsWith('door|')) this.setBlock(x, y + oy, z, this.flipKey(o, 3));
        at(BL[n].open ? 'door_open' : 'door_close'); return true; }
      case 'trapdoor': { const n = this.flipKey(id, 3); this.setBlock(x, y, z, n); at(RB_KEYS[n].split('|')[3] === '1' ? 'trap_open' : 'trap_close'); return true; }
      case 'gate': { const n = this.flipKey(id, 3); this.setBlock(x, y, z, n); at(RB_KEYS[n].split('|')[3] === '1' ? 'fgate_open' : 'fgate_close'); return true; }
      case 'lever': { const n = this.flipKey(id, 2); this.setBlock(x, y, z, n); const on = BL[n].on; RAU.at('lever', P, on ? .6 : .5); this.power(x, y, z, key.split('|')[1], on); return true; }
      case 'button': { if (B.on) return true; const n = this.flipKey(id, 3); const stone = key.split('|')[1] === 'stone'; this.setBlock(x, y, z, n); at(stone ? 'sbutton_on' : 'button_on');
        setTimeout(() => { if (RW.getM(x, y, z) === n) { this.setBlock(x, y, z, id); at(stone ? 'sbutton_off' : 'button_off'); } }, stone ? 1000 : 1500); return true; }
    }
    return false;
  },
  // levers light the lamps next to them / next to the block they hang on; the playground dungeon lever drives the iron bars
  power(x, y, z, dir, on) {
    const att = { north: [0, 0, 1], south: [0, 0, -1], east: [-1, 0, 0], west: [1, 0, 0] }[dir] || (String(dir).startsWith('up') ? [0, -1, 0] : [0, 1, 0]);
    const ax = x + att[0], ay = y + att[1], az = z + att[2]; const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const [cx, cy, cz] of [[x, y, z], [ax, ay, az]]) for (const d of N) { const k = RB_KEYS[RW.getM(cx + d[0], cy + d[1], cz + d[2])]; if (k === 'redstone_lamp' || k === 'redstone_lamp_on') this.setBlock(cx + d[0], cy + d[1], cz + d[2], RBLK.K(on ? 'redstone_lamp_on' : 'redstone_lamp')); }
    if (x === -17 && y === 90 && z === -12) { // lever -> lamp -> repeater -> impulse "fill air" (-17,90,-9); the redstone torch on it turns off. Off: torch relights -> impulse "fill iron_bars" (-17,90,-7)
      const bars = on ? 0 : RBLK.K('pane|iron_bars'); this.setBlock(-19, 89, -16, bars); this.setBlock(-19, 90, -16, bars);
      const t = RBLK.K('rtorch|north|' + (on ? '0' : '1')); if (t) this.setBlock(-17, 90, -8, t); RAU.play(on ? 'gate_open' : 'gate_close');
    }
  },
  // pressure plates: pressed while a player stands on one (checked by each client for itself and the host's bots)
  plateTick(p) {
    const [mx, my, mz] = this.mcOf(p); const bx = Math.floor(mx), by = Math.floor(my + .01), bz = Math.floor(mz); const id = RW.getM(bx, by, bz); const B = BL[id];
    if (p.plate && (p.plate[0] !== bx || p.plate[1] !== by || p.plate[2] !== bz || !p.alive || p.spectator)) { const [qx, qy, qz] = p.plate; const q = RW.getM(qx, qy, qz); if (BL[q].plate && BL[q].on) { this.setBlock(qx, qy, qz, this.flipKey(q, 2)); RAU.at('plate_off', RW.P(qx + .5, qy, qz + .5)); } p.plate = null; }
    if (B && B.plate && !B.on && p.alive && !p.spectator && p.onGround !== false) { this.setBlock(bx, by, bz, this.flipKey(id, 2)); RAU.at('plate_on', RW.P(bx + .5, by, bz + .5)); p.plate = [bx, by, bz]; }
  },
  // dungeon key furnace (-15,88,-19): original chain — clone 30초(5 s) · 25 · 20 · 15 · 10 · 5(1 s) · 4 · [3초 clone is broken: stays empty] · 2 · 1 · [empty clone] · 재생성됨,
  // with the block removed for 2 ticks between stages. Played from the shared regen time on every client.
  KEYCHAIN: (() => { const a = []; let t = 0; for (const [v, d] of [[30, 100], [25, 100], [20, 100], [15, 100], [10, 100], [5, 20], [4, 20], [null, 20], [2, 20], [1, 20], [null, 20]]) { a.push([t, t + d, v]); t += d + 2; } a.end = t; return a; })(),
  keyStage(d) { if (!d || !d.regen) return { v: 'ready' }; const tk = (this.hostNow() - d.regen) / 50; if (tk >= this.KEYCHAIN.end) return { v: 'ready' }; for (const [a, b, v] of this.KEYCHAIN) if (tk >= a && tk < b) return { v: v === null ? 'gone' : v }; return { v: 'gone' }; },
  keyTick() {
    const d = this.be.get('-15,88,-19'); const st = this.keyStage(d); const want = st.v === 'gone' ? 0 : RBLK.K('furnace|s'); const cur = RW.getM(-15, 88, -19);
    if (cur !== want && (cur === 0 || cur === RBLK.K('furnace|s'))) RW.setM(-15, 88, -19, want);
  },
  // ---------- per tick ----------
  step() {
    this.tick++; const me = this.me;
    RIN.apply(me); me.tick(); RIN.after(me);
    for (const b of this.bots) { RBOT.think(b); b.tick(); }
    if (this.tick % 4 === 0 && this.area(me) === 'playground') { const P = RW.P(-16.5, 101.5, 15.5); this.particles('totem', P.x, P.y, P.z, 2); }
    if (this.tick % 5 === 0) this.kitTick();
    if (this.tick % 4 === 0) for (const p of this.players()) { if (p === me) continue; const d = p.dig && p.dig.k ? p.dig.k.split(',').map(Number) : p.dg; if (!d) continue; const id = RW.getM(d[0], d[1], d[2]); if (!id) continue; const P = RW.P(d[0] + .5, d[1] + .5, d[2] + .5); this.hitParts(d[0], d[1], d[2], id, 2); RAU.blk('hit', BL[id].snd, P); }
    this.plateTick(me); if (this.isHost()) for (const b of this.bots) this.plateTick(b); if (this.tick % 2 === 0) this.keyTick();
    this.itemTick(); this.projTick(); this.furnTick(); this.fallTick();
    for (const p of this.parts) { if (p.col && RW.w.solidAt(p.x, p.y + p.vy - p.s, p.z)) { p.vy = 0; p.vx *= .7; p.vz *= .7; } else p.y += p.vy; p.x += p.vx; p.z += p.vz; p.vy -= p.g; p.vx *= .98; p.vz *= .98; p.life--; } this.parts = this.parts.filter(p => p.life > 0);
    this.areaRules(me); for (const b of this.bots) this.areaRules(b);
    this.phaseTick(); this.miniTick();
    if (this.isHost()) this.hostTick();
    if (this.tick % 20 === 0) { this.playtime++; this.achTick(); if (this.tick % 600 === 0) this.saveStats(); }
    if (NET.mode !== 'off' && this.tick % 2 === 0) NET.send(this.buildPresence());
  },
  areaRules(p) {
    if (!p.alive) return; const a = this.area(p);
    p.addEff('saturation', 0, 2); // original: effect @a saturation (everyone, always)
    if (a === 'arena' && this.gs.ph === 'game' && p.mode !== 'survival' && p.mode !== 'spectator' && !p.spectator) p.mode = 'survival'; // original: gamemode 0 @a[x=17,y=216,z=17,dx=-34,dy=-16,dz=-34,m=!0]
    if (a === 'lobby') { p.fire = 0; if (p.mode === 'survival') p.mode = 'adventure'; p.addEff('weakness', 254, 2); } // V2.1: weakness 255 in the lobby (instead of instant health)
    if (a === 'playground' && this.inMini(p)) { const [x] = this.mcOf(p); if (x < 13 && p.mode !== 'survival') { if (p.hp < 20) p.hp = 20; p.addEff('weakness', 254, 2); } } // mini gallery
    if (a === 'winner') { p.hp = 20; p.fire = 0; if (p.mode === 'survival') p.mode = 'adventure'; }
    if (a === 'dmspec') { p.addEff('resistance', 254, 2); if (p.mode !== 'spectator') { if (p.allItems().length) p.clearInv(); p.mode = 'adventure'; } }
    // playground (outside command blocks): effect @a[x=4,y=87,z=4,dx=-8,dy=2,dz=-8] instant_health 20 100 -> full heal in that box; totem particles at -17 101 15
    if (a === 'playground') { const [x, y, z] = this.mcOf(p); if (x >= -4 && x < 5 && y >= 87 && y < 90 && z >= -4 && z < 5 && p.hp < 20) p.hp = 20; }
    if (p === this.me && p.sneaking) { const [x, y, z] = this.mcOf(p); if (Math.floor(x) === 2 && Math.floor(z) === -12 && y >= 94 && y < 100) { this.tp(p, RV.ret); this.chat('§a로비로 돌아왔어요'); } }
    // deathmatch hazards (V2.1, from pvp start): 900 ticks fatal poison I (lava mode: lava), 1200 ticks fatal poison II (lava mode: fatal poison)
    if (this.gs.ph === 'dm' && a === 'dm' && this.tick % 20 === 0) { const t = this.hostNow() - (this.gs.t + 7500); const lava = this.gs.opts.lava; if (t >= 60000) p.addEff('fatal_poison', lava ? 0 : 1, 3); else if (t >= 45000 && !lava) p.addEff('fatal_poison', 0, 3); }
  },
  // ---------- client timeline (same on every client, driven by the host's gs) ----------
  once(k, f) { if (this.lp.done.has(k)) return; this.lp.done.add(k); f(); },
  phaseTick() {
    const gs = this.gs, me = this.me; const key = gs.ph + ':' + gs.t + ':' + gs.rnd;
    if (this.lp.key !== key) { const prev = this.lp.ph; this.lp = { ph: gs.ph, key, done: new Set(), prev }; this.onPhase(gs.ph, prev); }
    const el = this.hostNow() - gs.t; const O = gs.opts;
    switch (gs.ph) {
      case 'prep': { // V2.1: two rows of stands sweep in from both ends, one layer per tick (9 players 255 ticks, 25 players 405), then the bedrock ceiling
        const N = RW.genTicks(gs.big); if (!this.lp.gen) this.lp.gen = 0; const want = clamp(Math.floor(el / 50) + 1, 1, N);
        while (this.lp.gen < want) { RW.genTick(this.lp.gen, gs.seed, O.pal, O.palN, gs.big); this.lp.gen++; }
        RUI.actionbar('§a게임 준비중 : ' + Math.min(this.lp.gen, N) + ' / ' + (N + 3));
        if (this.lp.gen >= N) this.once('done', () => { RW.ceiling(); this.chat('§aDONE'); RUI.actionbar(''); });
        break;
      }
      case 'count': {
        if (!this.lp.gen || this.lp.gen < RW.genTicks(gs.big)) { RW.walls(gs.big); RW.genAll(gs.seed, O.pal, O.palN, gs.big); RW.ceiling(); this.lp.gen = RW.genTicks(gs.big); }
        const k = Math.floor(el / 1000);
        for (let i = 0; i <= Math.min(k, 10); i++) this.once('c' + i, () => {
          if (el - i * 1000 > 1500) return; // joined late: skip old beeps
          if (i < 10) { const n = 10 - i; this.title('Starting in...', (n > 5 ? '§c' : '§e') + n, { stay: 50 }); RAU.note([.47, .5, .53, .56, .6, .63, .67, .7, .75, .8][i]); }
          else { this.title('Starting in...', '§e§l§oGO!', { stay: 50 }); RAU.play('toast', 1.5); }
        });
        for (let i = 0; i < 4; i++) if (k >= i) this.once('pk' + i, () => RW.pocket(false, gs.big));
        if (k >= 4) this.once('dia', () => RW.pocket(true, gs.big));
        break;
      }
      case 'start': {
        if (!this.lp.gen) { RW.walls(gs.big); RW.genAll(gs.seed, O.pal, O.palN, gs.big); RW.ceiling(); RW.pocket(true, gs.big); this.lp.gen = RW.genTicks(gs.big); }
        const k = Math.floor(el / 1000); const T = ['', '§c3', '§62', '§a1', '§bstart'];
        for (let i = 1; i <= Math.min(k, 4); i++) this.once('s' + i, () => { if (el - i * 1000 < 1500) this.title(T[i], '', { stay: 20 }); });
        break;
      }
      case 'game': {
        const left = gs.end > 0 ? gs.end - this.hostNow() : -1;
        if (left >= 0) { RUI.actionbar('§a남은 시간§r§l ' + RUI.mmss(left)); if (left <= 90000 && gs.end - gs.t > 95000) this.once('hurry', () => { RAU.stopBgm(); RAU.sfx('sfx_hurry', true); this.title('남은시간 1분30초', '§e서두르세요!'); setTimeout(() => { if (this.gs.ph === 'game') RAU.gameBgm(1.5); }, 2000); }); }
        else if (gs.end === -1) RUI.actionbar('§a남은 시간§r§l 9 : 99');
        break;
      }
      case 'tover': RUI.actionbar('§a남은 시간 §c§lTime Over!'); break;
      case 'dm': {
        const S = [[2500, '§e5'], [3500, '§e4'], [4500, '§e3'], [5500, '§e2'], [6500, '§e1']];
        for (const [t, s] of S) if (el >= t) this.once('d' + t, () => { if (el - t < 1500) { this.title('Starting in...', s); RAU.note(.8); } });
        if (el >= 7500) this.once('pvp', () => { this.title('Starting in...', '§cpvp!!'); RAU.play('anvil_use'); if (O.build && this.area(me) === 'dm') me.mode = 'survival'; });
        if (el >= 8500) this.once('warn', () => this.title('§c조심하세요!', O.lava ? '§c몇초 뒤에 용암이 올라옵니다!' : '§c몇초 뒤에 독가스가 퍼집니다!'));
        const t = el - 7500;
        if (t >= 45000) this.once('h1', () => { if (O.lava) { if (gs.big) RW.fill(-3, 61, -6, 12, 61, 9, RBLK.K('lava|0')); else RW.fill(-2, 73, -5, 9, 73, 6, RBLK.K('lava|0')); this.title('§c용암이 생성되었습니다!', '§c다음에는 독가스가 올라옵니다!'); RAU.play('lava'); } else { this.title('§c독가스가 올라왔습니다!', '§c다음에는 독가스의 강도가 더 세집니다!'); RAU.play('gas'); } });
        if (t >= 60000) this.once('h2', () => { this.title('§c독가스가 뿜어져 나왔습니다!', ''); RAU.play('gas'); });
        if (t >= 45000 && !O.lava && this.tick % 4 === 0) { const c = gs.big ? RW.P(4.5, 62, 1.5) : RW.P(3.5, 74, .5); this.particles('gas', c.x + rand(-5, 5), c.y + rand(0, 4), c.z + rand(-5, 5), 2); }
        break;
      }
      case 'win': {
        if (el < 7000 && this.tick % 20 === 0) { const c = RW.P(-41, 13, -40); this.particles('fw', c.x + rand(-4, 4), c.y + rand(0, 3), c.z + rand(-4, 4), 30); RAU.play(this.tick % 40 ? 'fw_launch' : 'fw_blast'); }
        if (el >= 2000) this.once('dry', () => this.setBlock(-46, 10, -40, 0, false));
        break;
      }
    }
  },
  onPhase(ph, prev) {
    const gs = this.gs, me = this.me, O = gs.opts; const el = this.hostNow() - gs.t; const fresh = el < 3000;
    if (ph !== 'game' && ph !== 'tover') RUI.actionbar('');
    switch (ph) {
      case 'lobby':
        if (prev && prev !== 'lobby') { RAU.stopBgm(); if (!me.spectator) { this.tp(me, RV.ret); } else { me.mode = 'spectator'; } me.clearInv(); me.clearEff(); me.xp = me.lvl = 0; me.hp = 20; me.mode = me.mode === 'spectator' ? 'spectator' : 'adventure'; }
        RW.clearArena(); RW.restore(RW.dmSnap); RW.restore(RW.dmSnap25); this.itemsClear(); this.mods = []; RUI.spec(false, true); if (me.mode === 'spectator' && prev && prev !== 'lobby') { me.mode = 'adventure'; this.toSpawn(me); }
        for (const b of this.bots) { b.clearInv(); b.clearEff(); b.mode = 'adventure'; b.hp = 20; this.tp(b, [rand(-3, 3), 31, rand(-3, 3)]); }
        break;
      case 'prep':
        RAU.stopBgm(); if (fresh) this.chat('§a게임시작 준비중입니다...\n §a호스트의 환경에 따라 5~30초가 소요됩니다.');
        RW.clearArena(); RW.restore(RW.dmSnap); RW.restore(RW.dmSnap25); RW.walls(gs.big); this.itemsClear(); this.mods = []; this.lp.gen = 0;
        if (fresh) this.chat(gs.big ? '§e이번 경기장: §c25명 §7(53×53 · 준비가 오래 걸려요)' : '§e이번 경기장: §a9명 §7(33×33)');
        if (!me.spectator && this.area(me) !== 'lobby') this.tp(me, RV.ret);
        this.rd = 0; break;
      case 'start': {
        RAU.gameBgm(1); const sl = gs.sp[me.id]; if (me.spectator) { this.tp(me, [.5, 213, .5]); RUI.specNext(1); }
        if (sl !== undefined && !me.spectator) { const [x, z] = RW.spawns(gs.big)[sl]; this.tp(me, [x + .5, 210, z + .5]); me.clearInv(); me.clearEff(); me.mode = 'adventure'; me.xp = me.lvl = 0; me.hp = 20; }
        for (const b of this.bots) { b.ai = null; const s = gs.sp[b.id]; if (s !== undefined) { const [x, z] = RW.spawns(gs.big)[s]; this.tp(b, [x + .5, 210, z + .5]); b.clearInv(); b.mode = 'adventure'; } }
        break;
      }
      case 'game': {
        const inA = this.area(me) === 'arena' && !me.spectator;
        if (inA) { me.mode = 'survival'; if (O.kit) this.giveKit(me); }
        if (inA && O.brk && fresh) this.breakAround(me);
        for (const b of this.bots) if (this.area(b) === 'arena') { b.mode = 'survival'; if (O.kit && fresh) this.giveKit(b); if (O.brk && fresh) this.breakAround(b); } // bots get the same kit // bots too: 시작시 주변블록 파괴
        if (fresh) { this.chat('§l§b>§5>§a> §r§e이번 라운드 정보 §l§a<§5<§b<'); this.chat('§e시작시 주변블록 파괴 : ' + (O.brk ? '§a활성화' : '§c비활성화')); this.chat('§e기본템 지급 : ' + (O.kit ? '§a활성화' : '§c비활성화')); this.chat('§e방패 제작 유무 : ' + (O.shield ? '§a활성화' : '§c비활성화')); this.chat('§e데스매치 패널티 : ' + (O.lava ? '§c용암' : '§a독가스')); this.chat('§e데스매치 건축 유무 : ' + (O.build ? '§a활성화' : '§c비활성화')); this.chat('§e경기장 pvp 유무 : ' + (O.pvp ? '§a활성화' : '§c비활성화')); }
        break;
      }
      case 'tover': RAU.stopBgm(); if (fresh) { this.title('§cTime over!', ''); RAU.sfx('bell', true); } if (me.mode === 'survival') me.mode = 'adventure'; for (const b of this.bots) b.mode = 'adventure'; break;
      case 'dm': {
        RAU.stopBgm(); RAU.music('bgm_deathmatch_bubble');
        if (me.spectator) { this.tp(me, gs.big ? [4.5, 68, 1.5] : [3.5, 80, .5]); RUI.specNext(1); }
        if (!me.spectator) { if (gs.dmp.includes(me.id) && me.alive) { this.tp(me, this.dmPt()); me.hp = 20; } else this.tp(me, this.dmPt(true)); me.mode = 'adventure'; }
        for (const b of this.bots) { if (gs.dmp.includes(b.id)) { this.tp(b, this.dmPt()); b.hp = 20; } else this.tp(b, this.dmPt(true)); b.mode = 'adventure'; }
        if (fresh) this.title('Starting in...', ''); break;
      }
      case 'win': {
        RAU.stopBgm(); const w = gs.win || { ids: [], names: '' }; const iWon = w.ids.includes(me.id);
        if (me.spectator) { RUI.follow = null; this.tp(me, RV.aud, 90); }
        if (!me.spectator) { if (iWon) this.tp(me, RV.podium, -90); else this.tp(me, RV.aud, 90); me.pitch = 0; me.mode = 'adventure'; me.clearInv(); me.clearEff(); }
        for (const b of this.bots) { if (w.ids.includes(b.id)) this.tp(b, RV.podium, -90); else this.tp(b, RV.aud, 90); b.clearInv(); }
        this.title((w.names || '아무도 없음') + ' 님 승리!', '');
        this.setBlock(-46, 10, -40, RBLK.K('water|0'), false);
        if (fresh) RAU.sfx(w.snd || 'sfx_win_yay');
        if (iWon && fresh) { this.wins++; this.saveStats(); if (this.wins === 1) this.achieve('ac_firstwin', '§5[달콤한 첫 승]§r', 'sfx_rare'); if (this.wins === 5) this.achieve('ac_win5', '§5[5번째 승리]§r', 'sfx_rare'); }
        break;
      }
    }
  },
  achieve(tag, label, snd) { if (this.ach[tag]) return; this.ach[tag] = 1; this.saveStats(); const m = this.me.name + ' 님이 ' + label + ' 도전과제를 달성하였습니다!'; this.chat('* ' + m); this.emit({ k: 'chat', m: '* ' + m }); if (snd === 'levelup') RAU.play('levelup', 1, true); else RAU.sfx(snd, true); },
  achTick() { const pt = this.playtime; if (pt >= 3600) this.achieve('rb_pt1', '§a[1시간의 묘미]§r', 'levelup'); if (pt >= 7200) this.achieve('rb_pt2', '§a[2시간의 묘미]§r', 'levelup'); if (pt >= 21600) this.achieve('rb_pt6', '§5[6시간의 묘미]§r', 'sfx_rare'); if (pt >= 43200) this.achieve('rb_pt12', '§5[랜덤블록 중독자]§r', 'sfx_rare'); },
  // ---------- host: the round state machine ----------
  setPh(ph, extra) { Object.assign(this.gs, { ph, t: Date.now() }, extra || {}); },
  readyCount() { let n = 0, h = 0; for (const p of this.players()) if (!p.spectator && (p === this.me ? this.rd : p.isBot ? (p.local ? 1 : p.rd) : p.rd)) { n++; if (!p.isBot) h++; } return h ? n : 0; }, // bots are always ready, but a round only starts once a person is ready
  hostTick() {
    const gs = this.gs, now = Date.now(), el = now - gs.t, O = gs.opts;
    if (this.gs.ph === 'lobby' && this.gs.opts.bots && this.players().filter(p => !p.isBot).length > 1) { this.gs.opts.bots = 0; this.chat('§7다른 플레이어가 들어와서 봇이 빠졌어요 (봇은 싱글 플레이 전용)'); }
    RBOT.manage(); this.miniHost(now);
    switch (gs.ph) {
      case 'lobby': if (O.time !== 24 && this.readyCount() >= 2) this.setPh('prep', { seed: (Math.random() * 2 ** 31) | 0, rnd: gs.rnd + 1, win: null, sp: {}, dmp: [], big: O.big ? 1 : 0 }); break;
      case 'prep': if (el >= RW.genTicks(gs.big) * 50 + 800) this.setPh('count'); break;
      case 'count': if (el >= 10500) { const L = this.players().filter(p => !p.spectator && p.alive !== false); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } const sp = {}; const NS = RW.spawns(gs.big).length; const sl = [...Array(NS).keys()].sort(() => Math.random() - .5); L.slice(0, NS).forEach((p, i) => sp[p.id] = sl[i]); this.setPh('start', { sp }); } break;
      case 'start': if (el >= 4200) { let t = O.time; if (t === 22) t = randi(0, 20); const ms = t === 21 ? -1 : t === 0 ? 1000 : t === 20 ? 600000 : t === 23 ? 330000 : t * 30000; this.setPh('game', { end: ms === -1 ? -1 : Date.now() + ms }); } break;
      case 'game': { if (el < 1500) break; const a = this.alivePlayers('arena'); if (a.length < 2) this.win(a); else if (gs.end > 0 && now >= gs.end) this.setPh('tover', { dmp: a.map(p => p.id) }); break; }
      case 'tover': if (el >= 2500) this.setPh('dm'); break;
      case 'dm': { if (el < 2000) break; const a = this.alivePlayers('dm'); if (a.length < 2) this.win(a); break; }
      case 'win': if (el >= 7500) this.setPh('lobby', { win: null, sp: {}, dmp: [] }); break;
    }
  },
  // ---------- mini random block survival (V2.1 playground, 1 vs 1) — host side ----------
  // pad (x10..12, y92..94, z6..8) with 2 people -> cage + gather -> 5 layers from the mini palette (5 ticks apart) -> 3,2,1,GO -> 60 s, strength I + haste I -> win / time over
  miniHost(now) {
    const M = this.gs.mini; const el = now - M.t; const set = (ph, x) => { this.gs.mini = Object.assign({}, M, { ph, t: now }, x || {}); };
    const pl = id => this.byId(id);
    switch (M.ph) {
      case 'idle': if (this.tick % 5) break; { const on = this.players().filter(p => !p.isBot && p.alive !== false && !p.spectator && this.inBox(p, [10, 92, 6, 12, 94, 8])); if (on.length >= 2) { const pick = on.slice(0, 2).sort(() => Math.random() - .5); set('cage', { a: pick[0].id, b: pick[1].id, an: pick[0].name, bn: pick[1].name, seed: (Math.random() * 2 ** 31) | 0, n: (M.n | 0) + 1 }); } } break;
      case 'cage': if (el >= 1500) set('gen'); break;
      case 'gen': if (el >= 1600) set('count'); break;
      case 'count': if (el >= 4000) set('fight', { end: now + 60000 }); break;
      case 'fight': { const A = pl(M.a), B = pl(M.b); const inA = A && A.alive !== false && this.inMini(A), inB = B && B.alive !== false && this.inMini(B);
        if (el > 1000 && (!inA || !inB)) { set('end', { win: inA ? M.a : inB ? M.b : null, wn: inA ? M.an : inB ? M.bn : '' }); break; }
        if (now >= M.end) set('end', { win: null, wn: '', tout: 1 }); break; }
      case 'end': if (el >= 2500) set('idle', { a: null, b: null }); break;
    }
  },
  // ---------- mini — every client plays the same timeline ----------
  miniTick() {
    const M = this.gs.mini; if (!M) return; const me = this.me; const key = M.ph + ':' + M.t + ':' + (M.n | 0); const el = this.hostNow() - M.t; const mine = M.a === me.id || M.b === me.id; const near = this.area(me) === 'playground';
    if (this.lmk !== key) { this.lmk = key; this.lmd = new Set(); this.onMini(M, mine, near, el); }
    const once = (k, f) => { if (!this.lmd.has(k)) { this.lmd.add(k); f(); } };
    if (M.ph === 'gen') { const k = Math.min(5, Math.floor(el / 250) + 1); for (let i = 0; i < k; i++) once('L' + i, () => RW.miniLayer(92 + i, M.seed)); if (k >= 5) once('sp', () => RW.miniSpawns()); }
    if (M.ph === 'count') { once('all', () => { if (!this.lmd.has('L4')) { RW.miniClear(); for (let i = 0; i < 5; i++) RW.miniLayer(92 + i, M.seed); RW.miniSpawns(); } }); const k = Math.floor(el / 1000);
      for (let i = 0; i <= Math.min(k, 3); i++) once('c' + i, () => { if (!near || el - i * 1000 > 1500) return; this.title(['§c3', '§62', '§a1', '§bGO!'][i], '', { stay: 18 }); RAU.note(i < 3 ? .6 : 1); }); }
    if (M.ph === 'fight') {
      if (mine && me.alive) { if (this.tick % 20 === 0) { me.addEff('strength', 0, 2); me.addEff('haste', 0, 2); } if (me.mode !== 'survival' && this.inMini(me)) me.mode = 'survival'; }
      const left = Math.max(0, Math.ceil((M.end - this.hostNow()) / 1000));
      if (this.inMini(me)) RUI.actionbar('§a미니 랜덤블록 서바이벌 §r- 승 : ' + (this.miniWins | 0) + ' / 남은 시간 0 : ' + String(left).padStart(2, '0'));
      if (near) { if (left === 30) once('w30', () => this.chat('§e미니 랜덤블록 서바이벌: 30초 남았어요')); if (left === 15) once('w15', () => this.chat('§c미니 랜덤블록 서바이벌: 15초 남았어요')); if (left <= 5 && left > 0 && this.inMini(me)) once('n' + left, () => RAU.note(.8, true)); }
    }
  },
  onMini(M, mine, near, el) {
    const me = this.me; const fresh = el < 2000;
    switch (M.ph) {
      case 'cage': RW.cage(true); if (near && fresh) this.chat('§l§e미니 랜덤블록 서바이벌 §r- §b' + M.an + ' §fVS §c' + M.bn);
        if (mine) { this.tp(me, RV.miniCage); me.clearInv(); me.clearEff(); me.addEff('regeneration', 4, 2); } break;
      case 'gen': RW.miniClear(); break;
      case 'count': if (mine) { this.tp(me, M.a === me.id ? RV.mini1 : RV.mini2, M.a === me.id ? 180 : 0); me.clearInv(); } break;
      case 'fight': RW.cage(false); if (mine) { me.mode = 'survival'; me.hp = 20; } break;
      case 'end': {
        RW.cage(false); if (near && fresh) { if (M.tout) { this.title('§c시간 초과!', ''); RAU.play('explode'); } else this.title((M.wn || '아무도') + ' 님 승리!', '§a미니 랜덤블록 서바이벌'); }
        if (mine) { if (M.win === me.id && fresh) { this.miniWins = (this.miniWins | 0) + 1; RAU.play('levelup', 1, true); } if (this.inMini(me) || this.area(me) === 'playground') this.tp(me, RV.miniRet); me.mode = 'adventure'; me.clearInv(); me.clearEff(); }
        break;
      }
    }
  },
  win(list) { const ids = list.map(p => p.id), names = list.map(p => p.name).join(', '); const w = list[0]; this.setPh('win', { win: { ids, names, snd: 'sfx_win_yay' } }); },
  hostReset() { this.setPh('lobby', { win: null, sp: {}, dmp: [] }); this.chat('§e호스트가 게임을 초기화했어요'); },
  // ---------- network ----------
  buildPresence() {
    const me = this.me; const s = me.held();
    const o = { nid: me.id, n: me.name, sk: me.skin || '', since: this.since, now: Date.now(), s: [r1(me.x), r1(me.y), r1(me.z), r1(me.yaw), r1(me.pitch)], h: Math.ceil(me.hp),
      f: (me.sneaking ? 1 : 0) | (me.sprinting ? 2 : 0) | (me.spectator ? 4 : 0) | (me.blocking ? 8 : 0) | (me.alive ? 16 : 0) | (me.useT ? 32 : 0) | (me.hurtTime > 0 ? 64 : 0),
      hd: s ? s.id : '', ge: s && s.en ? 1 : 0, ar: me.armor.map(a => a ? a.id : ''), of: me.off ? me.off.id : '', sw: me.swing, rd: this.rd, w: this.wins, ws: RUI.winSnd, md: me.mode[0], ph: this.lp.ph, dg: me.dig && me.dig.p > 0 ? [me.dig.x, me.dig.y, me.dig.z, Math.min(9, Math.floor(me.dig.p * 10))] : 0 };
    if (this.isHost()) { o.gs = this.gs; o.H = 1; if (this.bots.length) o.bots = this.bots.map(b => [b.id, b.name, r1(b.x), r1(b.y), r1(b.z), r1(b.yaw), r1(b.pitch), Math.ceil(b.hp), b.held() ? b.held().id : '', b.armor.map(a => a ? a.id : ''), (b.sneaking ? 1 : 0) | (b.alive ? 16 : 0) | (b.hurtTime > 0 ? 64 : 0), b.swing, b.dig ? b.dig.k.split(',').map(Number).concat(Math.min(9, Math.floor(b.dig.p * 10))) : 0]); }
    return o;
  },
  onPresence(peer, pres) {
    const id = pres.nid; let r = this.remotes.get(id);
    if (!r) { r = new RRemote(id); this.remotes.set(id, r); r.peer = peer; this.chat('§e' + (pres.n || '플레이어') + '님이 게임에 참여했어요'); }
    r.upd(pres);
    if (pres.H && pres.gs) {
      this.hostOff = pres.now - Date.now();
      if (!this.isHost()) {
        const g = pres.gs; const newRound = g.rnd !== this.gs.rnd; this.gs = g;
        if (newRound && g.ph !== 'lobby' && g.ph !== 'prep') this.wantWorld(); else if (!this.synced && (this.mods.length === 0)) { this.synced = true; this.wantWorld(); }
      }
    }
    // bots simulated by that peer (host)
    if (pres.bots) { const ids = new Set(); r.bots = r.bots || []; for (const a of pres.bots) { ids.add(a[0]); let b = r.bots.find(x => x.id === a[0]); if (!b) { b = new RRemote(a[0]); b.isBot = true; r.bots.push(b); } b.updBot(a); } r.bots = r.bots.filter(b => ids.has(b.id)); }
    else r.bots = null;
  },
  onLeave(peer, pres) { const id = pres && pres.nid; const r = this.remotes.get(id); if (r) { this.remotes.delete(id); this.chat('§e' + r.name + '님이 나갔어요'); } },
  onEvent(ev, nid) {
    switch (ev.k) {
      case 'fall': { const [x, y, z] = ev.p; if (RW.getM(x, y, z) === ev.id) RW.setM(x, y, z, 0); this.startFall(x, y, z, ev.id, false); break; }
      case 'b': { const [x, y, z] = ev.p; const old = RW.getM(x, y, z); if (old === ev.id) break; RW.setM(x, y, z, ev.id); if (this.isHost()) this.mods.push([x, y, z, ev.id]); const c = RW.P(x + .5, y + .5, z + .5); if (ev.q) { } else if (!ev.id) { this.blockParts(c.x - .5, c.y - .5, c.z - .5, old); RAU.blk('break', BL[old].snd, c); } else if (!BL[old].use || !BL[ev.id].use) RAU.blk('place', BL[ev.id].snd, c); if (!BL[ev.id].use) this.be.delete(x + ',' + y + ',' + z); break; }
      case 'hit': { const t = this.byId(ev.t); if (t && t.local) { t.hurt(ev.d, Object.assign({}, ev.s)); } break; }
      case 'drop': { const e = Object.assign({}, ev.e); const o = this.items.get(e.id); if (o) { o.st = e.st; break; } e.own = e.own || nid; this.items.set(e.id, e); break; }
      case 'pick': this.items.delete(ev.i); break;
      case 'be': if (ev.d) this.be.set(ev.key, ev.d); else this.be.delete(ev.key); RUI.beChanged(ev.key); break;
      case 'proj': this.projs.push(Object.assign({}, ev.o, { own: false })); break;
      case 'splash': this.onSplash(ev.kind, ev.x, ev.y, ev.z); break;
      case 'death': this.chat(ev.m); break;
      case 'chat': this.chat(ev.m); break;
      case 'opt': if (this.isHost()) { } break;
    }
  },
  // late join / new round: ask the host for the arena (seed + every block change + containers)
  wantWorld() { if (this.isHost()) return; this.wantT = this.wantT || 0; if (Date.now() - this.wantT < 3000) return; this.wantT = Date.now(); NET.blob({ want: 'w', to: this.gs.rnd }); },
  onBlob(d) {
    if (!d) return;
    if (d.want === 'w') { if (!this.isHost()) return; const s = JSON.stringify({ rnd: this.gs.rnd, seed: this.gs.seed, typo: this.gs.opts.typo, pal: this.gs.opts.pal || null, palN: this.gs.opts.palN || 0, big: this.gs.big || 0, ph: this.gs.ph, mods: this.mods, be: [...this.be] }); const CH = 15000, n = Math.ceil(s.length / CH), id = uid(5); for (let i = 0; i < n; i++) NET.blob({ wc: { id, i, n, d: s.slice(i * CH, (i + 1) * CH) } }); return; }
    if (d.wc) { const c = d.wc; const p = this.wparts && this.wparts.id === c.id ? this.wparts : (this.wparts = { id: c.id, got: [], cnt: 0, n: c.n }); if (p.got[c.i] === undefined) { p.got[c.i] = c.d; p.cnt++; } if (p.cnt === p.n) { this.wparts = null; try { this.applyWorld(JSON.parse(p.got.join(''))); } catch (e) { console.error(e); } } }
  },
  applyWorld(w) {
    if (this.isHost()) return; RW.clearArena(); RW.restore(RW.dmSnap); RW.restore(RW.dmSnap25);
    if (w.ph !== 'lobby' && w.ph !== 'prep') { RW.walls(w.big); RW.genAll(w.seed, w.pal, w.palN, w.big); RW.ceiling(); RW.pocket(true, w.big); this.lp.gen = RW.genTicks(w.big); }
    for (const [x, y, z, id] of w.mods) RW.setM(x, y, z, id); this.mods = w.mods; this.be = new Map(w.be); this.synced = true;
  },
};
// ---------------- remote players (and the host's bots) ----------------
class RRemote {
  constructor(id) { this.id = id; this.name = '?'; this.x = this.y = this.z = 0; this.tx = this.ty = this.tz = 0; this.yaw = this.pitch = 0; this.hp = 20; this.alive = true; this.local = false; this.w = .6; this.h = 1.8; this.armor = []; this.swing = 0; this.swingT = 0; this.hurtTime = 0; this.mode = 'adventure'; this.seen = 0; }
  get spectator() { return this.mode === 'spectator'; } get eye() { return this.sneaking ? 1.27 : 1.62; }
  upd(p) {
    this.name = p.n || '?'; this.skin = p.sk || ''; this.since = p.since; const s = p.s || [0, 0, 0, 0, 0]; if (!this.seen) { this.x = s[0]; this.y = s[1]; this.z = s[2]; } this.tx = s[0]; this.ty = s[1]; this.tz = s[2]; this.tyaw = s[3]; this.pitch = s[4];
    this.hp = p.h; const f = p.f | 0; this.sneaking = !!(f & 1); this.sprinting = !!(f & 2); this.mode = f & 4 ? 'spectator' : p.md === 's' ? 'survival' : 'adventure'; this.blocking = !!(f & 8); this.alive = !!(f & 16); this.using = !!(f & 32); if (f & 64) this.hurtTime = Math.max(this.hurtTime, 6);
    this.dg = p.dg || null; this.heldId = p.hd; this.heldGlint = !!p.ge; this.armorIds = p.ar || []; this.offId = p.of; if (p.sw !== this.swing) { if (this.seen) this.swingT = 6; this.swing = p.sw; } this.rd = p.rd; this.wins = p.w | 0; this.ws = p.ws; this.seen = performance.now();
    this.h = this.sneaking ? 1.5 : 1.8;
  }
  updBot(a) { this.dg = a[12] || null; this.name = a[1]; if (!this.seen) { this.x = a[2]; this.y = a[3]; this.z = a[4]; } this.tx = a[2]; this.ty = a[3]; this.tz = a[4]; this.tyaw = a[5]; this.pitch = a[6]; this.hp = a[7]; this.heldId = a[8]; this.armorIds = a[9]; const f = a[10]; this.sneaking = !!(f & 1); this.alive = !!(f & 16); if (f & 64) this.hurtTime = Math.max(this.hurtTime, 6); if (a[11] !== this.swing) { if (this.seen) this.swingT = 6; this.swing = a[11]; } this.rd = 1; this.seen = performance.now(); this.skin = ''; this.mode = 'adventure'; }
  interp() { this.x = lerp(this.x, this.tx, .35); this.y = lerp(this.y, this.ty, .35); this.z = lerp(this.z, this.tz, .35); this.yaw = lerpA(this.yaw || 0, this.tyaw || 0, .4); if (this.swingT > 0) this.swingT -= .35; if (this.hurtTime > 0) this.hurtTime -= .35; }
}
