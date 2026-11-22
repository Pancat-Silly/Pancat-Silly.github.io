// ===================== Random Block Survival: bots (simulated by the host) =====================
// Lobby: always ready, wander near the spawn. Arena: play like a person — break the blocks around the spawn pocket, mine
// what it needs with the right tool (wood -> stone -> iron -> diamond), pick up drops, loot chests, craft at a crafting
// table (crafts and places its own when none is near), smelt raw iron in a furnace, put armor on, then go fight once
// geared up (or when attacked, when an enemy is right there, or when time is running out). Deathmatch: fight.
// Bots get no free items and only hit with a clear line of sight (no hitting through walls).
const RBOT = {
  NAMES: ['레모니봇', '블록봇', '랜덤봇', '광부봇', '다이아봇', '곡괭이봇', '모루봇', '용광로봇'],
  manage() {
    const want = clamp(RG.gs.opts.bots | 0, 0, 24);
    while (RG.bots.length < want) { const n = RG.bots.length; const b = new RPlayer('bot' + RG.nid.slice(0, 4) + n + uid(3), this.NAMES[n % 8] + (n >= 8 ? (n / 8 | 0) + 1 : ''), true); RG.tp(b, [rand(-3, 3), 31, rand(-3, 3)]); b.yaw = rand(-3, 3); RG.bots.push(b); }
    while (RG.bots.length > want) RG.bots.pop();
  },
  // line of sight: eye -> target eye / chest, blocked by any solid block (same rule as a player's crosshair)
  los(b, t) {
    const e = { x: b.x, y: b.y + b.eye, z: b.z };
    for (const hy of [t.eye || 1.62, .9]) { const dx = t.x - e.x, dy = t.y + hy - e.y, dz = t.z - e.z; const L = Math.hypot(dx, dy, dz); if (L < .01) return true;
      const h = RW.w.ray(e, { x: dx / L, y: dy / L, z: dz / L }, L, B => B.solid && !B.liquid && !B.invisible); if (!h || h.t >= L - .05) return true; }
    return false;
  },
  // 봇 난이도 (host option opts.botLv): 2 어려움 = the original speed. 1 보통 / 0 쉬움 make a decision only every 2nd / 4th
  // tick (keeping the last inputs and the block being dug in between), turn slower, swing slower and hit back later.
  LV: [{ every: 4, turn: .45, atk: 2, react: 16 }, { every: 2, turn: .7, atk: 1.5, react: 8 }, { every: 1, turn: 1, atk: 1, react: 0 }],
  lv() { const v = RG.gs.opts.botLv; return this.LV[v === undefined ? 1 : clamp(v | 0, 0, 2)]; },
  think(b) {
    const I = b.inp, L = this.lv(), A0 = b.ai;
    if (A0 && A0.last && b.alive && RUI.botAI !== false && (RG.tick + A0.off) % L.every !== 0) { // between decisions: same inputs, keep digging the same block
      Object.assign(I, A0.last); if (A0.digG && b.dig && b.dig.k === this.key(...A0.digG)) this.dig(b, A0.digG); return; }
    this.L = L; I.f = 0; I.s = 0; I.jump = false; I.sneak = false; I.sprint = false; b.blocking = false;
    if (!b.alive) return; if (RUI.botAI === false) return;
    const ph = RG.gs.ph, ar = RG.area(b);
    if (ar === 'lobby' || ar === 'winner' || ar === 'dmspec' || ar === 'other') { // idle wander
      b.ai = null;
      if (RG.tick % 60 === 0) b.wander = Math.random() < .5 ? rand(-Math.PI, Math.PI) : null;
      if (b.wander !== null && b.wander !== undefined) { b.yaw = lerpA(b.yaw, b.wander, .1); I.f = .6; if (b.hx) I.jump = true; }
      return;
    }
    if (ph !== 'game' && ph !== 'dm') return; // countdown / time over
    if (ph === 'dm' && RG.hostNow() < RG.gs.t + 7500) return; // frozen until "pvp!!"
    if (b.ai) b.ai.digG = null;
    this.brain(b, I, ph, ar);
    if (b.ai) b.ai.last = { f: I.f, s: I.s, jump: false, sneak: I.sneak, sprint: I.sprint };
  },

  // ---------- inventory helpers ----------
  key(x, y, z) { return x + ',' + y + ',' + z; },
  cnt(b, f) { let n = 0; for (const s of b.inv) if (s && f(s.id)) n += s.n; return n; },
  planks(b) { return this.cnt(b, id => /_planks$/.test(id)); },
  logs(b) { return this.cnt(b, id => /_log$/.test(id)); },
  bestTool(b, type) { let i = -1, tier = 0; b.inv.forEach((s, k) => { const T = s && RIT[s.id] && RIT[s.id].tool; if (T && T.type === type && T.tier > tier) { tier = T.tier; i = k; } }); return { i, tier }; },
  wScore(s) { const I = s && RIT[s.id]; if (!I || !I.dmg) return 1; return I.dmg + (I.sword ? .5 : 0) + (s.en && s.en.sharpness ? 1.25 * s.en.sharpness : 0); },
  bestWeapon(b) { let i = -1, d = 1; b.inv.forEach((s, k) => { const v = this.wScore(s); if (v > d) { d = v; i = k; } }); return { i, d }; },
  hold(b, i) { if (i < 0 || i === b.sel) return; if (i < 9) { b.sel = i; return; } const t = b.inv[b.sel]; b.inv[b.sel] = b.inv[i]; b.inv[i] = t; },
  equip(b) { // wear the best armor piece for every slot
    for (let i = 0; i < 36; i++) { const s = b.inv[i], A = s && RIT[s.id] && RIT[s.id].armor; if (!A) continue; const c = b.armor[A.slot]; if (!c || RIT[c.id].armor.pts < A.pts) { b.armor[A.slot] = s; b.inv[i] = c || null; RAU.at('pop', b); } }
  },
  near(b, r, f) { // nearest block within r (minecraft coords) whose BL passes f
    const [mx, my, mz] = RG.mcOf(b).map(Math.floor); let best = null, bd = 1e9;
    for (let y = my - 2; y <= my + 3; y++) for (let z = mz - r; z <= mz + r; z++) for (let x = mx - r; x <= mx + r; x++) { const id = RW.getM(x, y, z); if (!id || !f(BL[id])) continue; const d = (x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2; if (d < bd) { bd = d; best = [x, y, z]; } }
    return best;
  },
  reach(b, g) { const c = RW.P(g[0] + .5, g[1] + .5, g[2] + .5); return Math.hypot(c.x - b.x, c.y - (b.y + b.eye), c.z - b.z) <= 4.5; },
  placeNear(b, item) { // put a block item down next to the bot
    const key = RIT[item] && RIT[item].block; if (!key) return null; const [mx, my, mz] = RG.mcOf(b).map(Math.floor);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1], [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1]]) {
      const x = mx + dx, y = my + dy, z = mz + dz; if (RW.getM(x, y, z) !== 0 || !RG.canEditBot(x, y, z)) continue;
      if (RG.placeBlock(b, x, y, z, key)) { b.take(item, 1); b.swingAnim(); return [x, y, z]; }
    }
    return null;
  },

  // ---------- building: a cheap full block from the bag (cobblestone / dirt / stone …, planks only when there's plenty of wood) ----------
  blk(b) {
    for (const id of this.PILLAR) if (b.count(id) && (!/_planks$/.test(id) || this.planks(b) > 12)) return id;
    for (const s of b.inv) { if (!s) continue; const I = RIT[s.id]; if (!I || !I.block || /ore|_block$|_log$|_planks$|table|bookshelf|glass|leaves/.test(s.id)) continue; const B = BL[RBLK.K(I.block)]; if (B && B.solid && B.full && !B.use && !B.fall && !B.liquid) return s.id; }
    return null;
  },
  // put a building block at (x,y,z) (minecraft coords) if it's empty, editable and touches something
  putAt(b, x, y, z) {
    const it = this.blk(b); if (!it || RW.getM(x, y, z) !== 0 || !RG.canEditBot(x, y, z)) return false;
    if (![[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => RW.getM(x + dx, y + dy, z + dz))) return false;
    if (!RG.placeBlock(b, x, y, z, RIT[it].block)) return false; b.take(it, 1); b.swingAnim(); return true;
  },
  // wall off an enemy: block the 2 cells (feet + head) right next to the bot on the enemy's side
  wallOff(b, A, tg) {
    if (A.wallT > RG.tick) return; A.wallT = RG.tick + 6;
    const dx = tg.x - b.x, dz = tg.z - b.z, [mx, my, mz] = RG.mcOf(b), bx = Math.floor(mx), by = Math.floor(my + .01), bz = Math.floor(mz);
    const sx = Math.abs(dx) > Math.abs(dz) ? Math.sign(dx) : 0, sz = sx ? 0 : Math.sign(dz);
    this.putAt(b, bx + sx, by, bz + sz); this.putAt(b, bx + sx, by + 1, bz + sz);
  },

  // ---------- crafting (same recipes as the crafting grid; 3x3 ones need a crafting table within reach) ----------
  rec(out) { return RREC.find(r => r.out === out); },
  need(r) { const m = {}; for (const row of r.rows) for (const ch of row) if (ch !== '.') m[ch] = (m[ch] || 0) + 1; return Object.entries(m).map(([ch, n]) => [r.keys[ch], n]); },
  canMake(b, out) { const r = this.rec(out); if (!r) return null; for (const [k, n] of this.need(r)) if (this.cnt(b, id => RCRAFT.tagOk(k, id)) < n) return null; return r; },
  small(r) { return r.rows.length <= 2 && r.rows[0].length <= 2; },
  make(b, r) {
    for (const [k, n] of this.need(r)) { let left = n; for (let i = 0; i < 36 && left > 0; i++) { const s = b.inv[i]; if (s && RCRAFT.tagOk(k, s.id) && !s.d && !s.en) { const t = Math.min(left, s.n); s.n -= t; left -= t; if (!s.n) b.inv[i] = null; } } }
    const left = b.give({ id: r.out, n: r.n }); if (left) RG.dropStack({ id: r.out, n: left }, b.x, b.y + 1, b.z); b.swingAnim();
  },
  WISH: ['wooden_pickaxe', 'wooden_sword', 'stone_pickaxe', 'stone_sword', 'iron_sword', 'iron_pickaxe', 'shield', 'iron_chestplate', 'iron_leggings', 'iron_helmet', 'iron_boots', 'diamond_sword', 'diamond_chestplate', 'diamond_leggings', 'diamond_helmet', 'diamond_boots'],
  better(b, out) {
    const I = RIT[out]; if (!I) return false;
    if (I.armor) { const c = b.armor[I.armor.slot]; return !c || RIT[c.id].armor.pts < I.armor.pts; }
    if (I.sword) return this.bestWeapon(b).d < I.dmg + .5 - .01;
    if (I.tool && I.tool.type === 'pickaxe') return this.bestTool(b, 'pickaxe').tier < I.tool.tier;
    if (out === 'shield') return !!RG.gs.opts.shield && !b.off;
    return false;
  },
  // a crafting table within reach: true. Otherwise craft / place one, or walk to one nearby (false = not yet)
  table(b, A) {
    if (this.near(b, 4, B => B.use === 'craft')) return true;
    if (b.count('crafting_table')) { this.placeNear(b, 'crafting_table'); return false; }
    const far = this.near(b, 9, B => B.use === 'craft'); if (far) { A.use = far; return false; }
    const rt = this.canMake(b, 'crafting_table'); if (rt) this.make(b, rt);
    return false;
  },
  craftStep(b, A) { // one crafting action per call; true if something happened
    const logs = this.logs(b), planks = this.planks(b);
    if (logs && planks < 12) { const r = RREC.find(r => r.rows.length === 1 && r.rows[0].length === 1 && /_log$/.test(r.keys.L || '') && b.count(r.keys.L)); if (r) { this.make(b, r); return true; } }
    for (const out of this.WISH) {
      if (!this.better(b, out)) continue; const r = this.rec(out); if (!r) continue;
      const st = this.need(r).find(([k]) => k === 'stick');
      if (st && b.count('stick') < st[1]) { const rs = this.canMake(b, 'stick'); if (rs && planks >= 2 + (r.keys.M === '#planks' ? 3 : 0)) { this.make(b, rs); return true; } continue; }
      if (!this.canMake(b, out)) continue;
      if (!this.small(r) && !this.table(b, A)) return true;
      this.make(b, r); this.equip(b); return true;
    }
    return false;
  },
  // ---------- smelting: raw iron -> furnace (placed / crafted if none near) -> collect ingots ----------
  RAW: ['raw_iron', 'iron_ore'],
  fuelFor(b) {
    for (const id of ['coal', 'charcoal']) if (b.count(id)) return [id, b.count(id)];
    const p = b.inv.find(s => s && /_planks$/.test(s.id)); if (p && this.planks(b) > 9) return [p.id, Math.min(p.n, this.planks(b) - 9)];
    const l = b.inv.find(s => s && /_log$/.test(s.id)); if (l && this.logs(b) > 1) return [l.id, this.logs(b) - 1];
    return null;
  },
  smelt(b, A) {
    const raw = this.RAW.find(id => b.count(id));
    const f = this.near(b, 4, B => B.use === 'furnace');
    if (f) {
      const d = RG.beGet(f[0], f[1], f[2]); if (!d) return false; let ch = false;
      if (d.inv[2]) { const left = b.give(d.inv[2]); d.inv[2] = left ? Object.assign({}, d.inv[2], { n: left }) : null; ch = true; }
      if (raw && (!d.inv[0] || d.inv[0].id === raw)) { const have = d.inv[0] ? d.inv[0].n : 0, put = Math.min(b.count(raw), 64 - have); if (put > 0) { b.take(raw, put); d.inv[0] = { id: raw, n: have + put }; ch = true; } }
      if (d.inv[0] && !d.inv[1] && d.burn <= 0) { const fu = this.fuelFor(b); if (fu) { const n = Math.min(fu[1], 16); b.take(fu[0], n); d.inv[1] = { id: fu[0], n }; ch = true; } }
      if (ch) { RG.beSave(f[0], f[1], f[2], d); b.swingAnim(); }
      A.furn = d.inv[0] || d.inv[2] || d.burn > 0 ? f : null; return ch;
    }
    if (!raw || !this.fuelFor(b)) return false;
    if (b.count('furnace')) { this.placeNear(b, 'furnace'); return true; }
    const far = this.near(b, 9, B => B.use === 'furnace'); if (far) { A.use = far; return false; }
    const rf = this.canMake(b, 'furnace'); if (rf) { if (this.table(b, A)) { this.make(b, rf); } return true; }
    return false;
  },
  loot(b, A, g) { // take everything useful out of a chest (look again in 30 s: someone may have put things in); an emptied chest gets broken
    const k = this.key(...g), d = RG.beGet(g[0], g[1], g[2]); A.looted.set(k, RG.tick + 600); if (!d || !d.inv) return; let ch = false;
    RAU.at('chest_open', b);
    d.inv.forEach((s, i) => { if (!s || this.JUNK.has(s.id)) return; const left = b.give(s); if (left < s.n) { d.inv[i] = left ? Object.assign({}, s, { n: left }) : null; ch = true; } });
    if (ch) { RG.beSave(g[0], g[1], g[2], d); RAU.at('pop', b); } b.swingAnim(); this.equip(b);
    if (k !== A.stash && !d.inv.some(s => s && !this.JUNK.has(s.id))) A.brk = g.slice(); // nothing left: break it (the chest is fuel / a stash of its own)
  },
  // bag full: put junk into its own chest (placed from the bag, or crafted) instead of throwing it on the floor
  stashJunk(b, A, junk) {
    let g = A.stash && A.stash.split(',').map(Number);
    if (!g || BL[RW.getM(...g)].use !== 'chest' || !this.reach(b, g)) {
      g = null; if (!b.count('chest')) { const r = this.canMake(b, 'chest'); if (r && this.table(b, A)) this.make(b, r); }
      if (b.count('chest')) { g = this.placeNear(b, 'chest'); if (g) { A.stash = this.key(...g); A.looted.set(A.stash, 1e12); } }
    }
    if (!g) return junk; const d = RG.beGet(g[0], g[1], g[2]); if (!d || !d.inv) return junk;
    const rest = []; for (const i of junk) { const s = b.inv[i], j = d.inv.findIndex(x => !x); if (j < 0) { rest.push(i); continue; } d.inv[j] = s; b.inv[i] = null; }
    RG.beSave(g[0], g[1], g[2], d); RAU.at('chest_open', b); b.swingAnim(); return rest;
  },

  JUNK: new Set(['dirt', 'gravel', 'sand', 'oak_leaves', 'flint', 'book', 'bookshelf', 'redstone', 'lapis_lazuli', 'experience_bottle', 'enchanting_table', 'anvil', 'chest', 'glass', 'iron_nugget', 'gold_nugget', 'raw_gold', 'blast_furnace']),
  tidy(b, A) { // over 27 slots used: drop junk and tools / weapons worse than the best one held
    if (b.inv.filter(Boolean).length <= 27) return;
    const pick = this.bestTool(b, 'pickaxe'), wpn = this.bestWeapon(b); let tables = 0; const J = [];
    for (let i = 0; i < 36; i++) {
      const s = b.inv[i]; if (!s) continue; const I = RIT[s.id] || {};
      let junk = this.JUNK.has(s.id) && s.id !== 'chest';
      if (I.tool && I.tool.type === 'pickaxe' && i !== pick.i) junk = true;
      if (I.dmg && !I.tool && i !== wpn.i) junk = true;
      if (s.id === 'crafting_table' && (++tables > 1 || s.n > 1)) junk = true;
      if (s.id === 'chest' && s.n > 2) junk = true;
      if (junk) J.push(i);
    }
    for (const i of this.stashJunk(b, A, J)) { const s = b.inv[i]; if (!s) continue; const e = RG.dropStack(s, b.x, b.y + 1.2, b.z, rand(-.15, .15), .2, rand(-.15, .15), true); A.badItem.add(e.id); b.inv[i] = null; }
  },
  // ---------- what's worth mining right now ----------
  desire(b, id) {
    const k0 = RB_KEYS[id].split('|')[0], pick = this.bestTool(b, 'pickaxe').tier;
    const wood = this.planks(b) + this.logs(b) * 4, cob = b.count('cobblestone'), iron = b.count('iron_ingot') + b.count('raw_iron');
    switch (k0) {
      case 'log': return wood < 16 ? 10 : wood < 28 ? 2 : 0;
      case 'oak_planks': case 'birch_planks': case 'spruce_planks': return wood < 16 ? 7 : 0;
      case 'stone': case 'cobblestone': return pick >= 1 && cob < 12 ? 6 : 0;
      case 'coal_ore': return pick >= 1 && b.count('coal') + b.count('charcoal') < 4 ? 5 : 0;
      case 'iron_ore': return pick >= 2 ? (iron < 32 ? 9 : 2) : 0;
      case 'diamond_ore': return pick >= 3 ? 11 : 0;
      case 'gold_ore': return pick >= 3 && b.count('raw_gold') < 8 ? 1 : 0;
    }
    return 0;
  },
  scan(b, A) {
    const R = RW.R(RG.gs.big), [mx, my, mz] = RG.mcOf(b), fx = Math.floor(mx), fy = Math.floor(my), fz = Math.floor(mz), r = 7; let best = null, bs = 0;
    for (let y = Math.max(201, fy - 4); y <= Math.min(215, fy + 5); y++) for (let z = Math.max(-R, fz - r); z <= Math.min(R, fz + r); z++) for (let x = Math.max(-R, fx - r); x <= Math.min(R, fx + r); x++) {
      const id = RW.getM(x, y, z); if (!id) continue; const B = BL[id], k = this.key(x, y, z); if ((A.bad[k] || 0) > RG.tick) continue;
      const s = B.use === 'chest' ? ((A.looted.get(k) || 0) > RG.tick ? 0 : 9) : this.desire(b, id); if (!s) continue;
      const sc = s / (1 + Math.hypot(x + .5 - mx, y + .5 - (my + 1), z + .5 - mz) * .35); if (sc > bs) { bs = sc; best = [x, y, z]; }
    }
    A.goal = best; A.scanT = RG.tick;
  },
  USELESS: new Set(['dirt', 'gravel', 'sand', 'oak_leaves', 'birch_leaves', 'flint', 'glass', 'book', 'bookshelf', 'redstone', 'lapis_lazuli', 'experience_bottle', 'enchanting_table', 'anvil', 'xp']),
  itemGoal(b, A) { // nearest useful dropped item in the same area (one it couldn't reach in 4 s is skipped)
    let best = null, bd = 10; const ar = RG.area(b);
    for (const e of RG.items.values()) { if (e.pick > 15 || this.USELESS.has(e.st.id) || (e.st.id === 'chest' && b.count('chest') >= 2) || (e.st.id === 'crafting_table' && b.count('crafting_table')) || RG.area(e) !== ar || A.badItem.has(e.id)) continue; const d = Math.hypot(e.x - b.x, e.y - b.y, e.z - b.z); if (d < bd) { bd = d; best = e; } }
    return best;
  },

  // ---------- moving / digging ----------
  digWay(b, g) { const A = b.ai, k = this.key(...g); if (A && BL[RW.getM(...g)].use === 'chest' && !A.looted.has(k) && !RG.chestBlocked(...g)) { this.loot(b, A, g); return; } this.dig(b, g); },
  dig(b, g) {
    const id = RW.getM(g[0], g[1], g[2]); if (!id) { b.dig = null; return; } const B = BL[id];
    if (B.tool) { const t = this.bestTool(b, B.tool); if (t.i >= 0) this.hold(b, t.i); }
    const k = this.key(...g); if (!b.dig || b.dig.k !== k) b.dig = { k, p: 0 }; if (b.ai) b.ai.digG = g;
    b.dig.p += b.breakSpeed(B) * 1.5 + .002; b.swingAnim();
    if (b.dig.p >= 1) { RG.breakBlock(b, g[0], g[1], g[2], true); b.dig = null; }
  },
  PILLAR: ['cobblestone', 'dirt', 'stone', 'oak_planks', 'birch_planks', 'spruce_planks', 'dark_oak_planks', 'netherrack'],
  // walk toward an engine-space point, digging through whatever is in the way (feet / head / above / below)
  navTo(b, tx, ty, tz, I) {
    if (ty - b.y < -.5) { tx = Math.floor(tx) + .5; tz = Math.floor(tz) + .5; } // going down: aim at the middle of that cell so we drop into the hole instead of standing on its edge
    const dx = tx - b.x, dz = tz - b.z, dy = ty - b.y, hd = Math.hypot(dx, dz);
    b.yaw = lerpA(b.yaw, Math.atan2(-dx, dz), .35 * (this.L || this.LV[2]).turn); b.pitch = clamp(-Math.atan2(dy + .3, hd), -1.2, 1.2);
    I.f = hd > (dy < -.5 ? .08 : .35) ? 1 : 0; I.sprint = hd > 5;
    if (b.mode !== 'survival') { if (b.hx) I.jump = true; return; }
    const fx = -Math.sin(b.yaw), fz = Math.cos(b.yaw), [mx, my, mz] = RG.mcOf(b);
    const ax = Math.abs(fx) > Math.abs(fz) ? Math.sign(fx) : 0, az = ax ? 0 : Math.sign(fz), bx = Math.floor(mx), by = Math.floor(my + .01), bz = Math.floor(mz);
    const cand = [];
    if (dy < -1.5 && hd < 1.5) cand.push([bx, by - 1, bz]);
    else { if (hd > .5) cand.push([bx + ax, by, bz + az], [bx + ax, by + 1, bz + az]); if (dy > 1.5) cand.push([bx, by + 2, bz]); }
    let t = null; for (const c of cand) { const id = RW.getM(c[0], c[1], c[2]); if (id && BL[id].solid && !BL[id].unbreak && RG.canEditBot(c[0], c[1], c[2])) { t = c; break; } }
    if (t) { this.digWay(b, t); if (t[1] === by - 1 || b.hx) I.f = 0; } else if (b.hx) I.jump = true;
    // bridge: walking off an edge with a drop of 2+ (and not wanting to go down) -> sneak and fill the gap ahead
    if (I.f && dy > -1 && b.onGround && hd > 1.2) { const gx = bx + ax, gz = bz + az; if (!RW.getM(gx, by - 1, gz) && !RW.getM(gx, by - 2, gz) && !RW.getM(gx, by, gz)) { I.sneak = true; I.sprint = false; if (!(b.ai && b.ai.bridgeT > RG.tick)) { if (this.putAt(b, gx, by - 1, gz) && b.ai) b.ai.bridgeT = RG.tick + 4; } } }
    // climb: target well above and nothing left to dig -> jump and put a block from the inventory under the feet
    if (dy > 2.5 && hd < 2 && !t && b.onGround && RG.tick % 12 === 0) {
      const it = this.blk(b); if (it) { I.jump = true; setTimeout(() => { if (b.alive && RW.getM(bx, by, bz) === 0 && RG.canEditBot(bx, by, bz) && b.count(it) && RG.placeBlock(b, bx, by, bz, RIT[it].block)) b.take(it, 1); }, 250); }
    }
  },
  // mine / use a block (minecraft coords): when in reach, break whatever is first on the line of sight to it
  work(b, A, I, g, brk) {
    const id = RW.getM(g[0], g[1], g[2]); if (!id) { A.goal = null; return; }
    if (BL[id].use === 'chest' && !brk && RG.chestBlocked(g[0], g[1], g[2])) { const up = [g[0], g[1] + 1, g[2]]; if (BL[RW.getM(...up)].unbreak || !RG.canEditBot(...up)) { A.bad[this.key(...g)] = RG.tick + 600; A.goal = null; return; } g = up; } // blocked chest (full block on top): dig that off first
    const c = RW.P(g[0] + .5, g[1] + .5, g[2] + .5), eye = { x: b.x, y: b.y + b.eye, z: b.z };
    const dx = c.x - eye.x, dy = c.y - eye.y, dz = c.z - eye.z, L = Math.hypot(dx, dy, dz);
    if (L <= 4.5) {
      b.yaw = lerpA(b.yaw, Math.atan2(-dx, dz), .5 * (this.L || this.LV[2]).turn); b.pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -1.5, 1.5);
      const h = RW.w.ray(eye, { x: dx / L, y: dy / L, z: dz / L }, L + .6, B => B.solid);
      if (h) {
        const m = RW.mc(h.x, h.y, h.z);
        if (m[0] === g[0] && m[1] === g[1] && m[2] === g[2]) { const B = BL[RW.getM(...g)]; if (B.use === 'chest' && !brk) { if (!RG.chestBlocked(g[0], g[1], g[2])) this.loot(b, A, g); A.goal = null; return; } if (B.use === 'craft' || B.use === 'furnace') { A.use = null; return; } this.dig(b, g); return; }
        if (BL[h.id].unbreak || !RG.canEditBot(m[0], m[1], m[2])) { A.bad[this.key(...g)] = RG.tick + 600; A.goal = null; return; }
        this.digWay(b, m); return;
      }
    }
    this.navTo(b, c.x, c.y - .5, c.z, I);
  },

  // ---------- the brain ----------
  brain(b, I, ph, ar) {
    const A = b.ai || (b.ai = { goal: null, bad: {}, looted: new Map(), badItem: new Set(), itemSince: new Map(), off: randi(0, 19), pos: [b.x, b.z], posT: RG.tick });
    if ((RG.tick + A.off) % 10 === 0) this.equip(b);
    // heal with a splash potion when low
    if (b.hp < 9 && b.count('splash_potion') && !(A.potT > RG.tick)) { const i = b.inv.findIndex(s => s && s.id === 'splash_potion'); this.hold(b, i); b.pitch = 1.5; RG.throwProj(b, 'heal'); b.take('splash_potion', 1); A.potT = RG.tick + 60; for (const p of RG.players()) if (p !== b && p.alive !== false && !p.spectator && RG.area(p) === RG.area(b) && Math.hypot(p.x - b.x, p.z - b.z) < 5) { A.wallT = 0; this.wallOff(b, A, p); break; } return; }
    // enemies in the same area
    let tg = null, bd = 1e9; for (const p of RG.players()) { if (p === b || p.id === b.id || p.spectator || p.alive === false || RG.area(p) !== ar) continue; const d = Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z); if (d < bd) { bd = d; tg = p; } }
    const gs = RG.gs, el = RG.hostNow() - gs.t, total = gs.end > 0 ? gs.end - gs.t : 600000, left = gs.end > 0 ? gs.end - RG.hostNow() : total - el;
    const late = ph === 'dm' || left < 70000, w = this.bestWeapon(b).d, ap = b.armorPts()[0];
    const ready = w >= 6.5 && (ap >= 6 || w >= 7.5 || el > total * .5), geared = w >= 7.5 && ap >= 10;
    let foe = null;
    if (tg && RG.pvpAt(b)) {
      const see = this.los(b, tg), rt = RG.tick - b.lastByT, atk = b.lastBy && rt < 100 && rt >= (this.L || this.LV[2]).react ? RG.byId(b.lastBy) : null; // 보통/쉬움: notice the hit a little later
      if (atk && atk.alive !== false && RG.area(atk) === ar) foe = atk; // hit back
      else if (late || geared) foe = tg; // hunt, digging through walls if needed
      else if (see && ((bd < 5 && w >= 7.5) || (ready && bd < 16))) foe = tg; // early on only with a good weapon (iron+); the stone-sword kit alone doesn't start fights
      // low and nothing to heal with: back off unless cornered at the end
      if (foe && b.hp < 6 && !late && bd < 8 && !b.count('splash_potion')) A.flee = RG.tick + 40;
    }
    if (A.flee > RG.tick && tg) { if (bd < 6) this.wallOff(b, A, tg); const P = { x: b.x * 2 - tg.x, z: b.z * 2 - tg.z }; this.navTo(b, P.x, b.y, P.z, I); return; }
    if (foe) { A.goal = null; this.fight(b, A, I, foe, Math.hypot(foe.x - b.x, foe.y - b.y, foe.z - b.z)); return; }
    if (ph !== 'game' || ar !== 'arena' || b.mode !== 'survival') return;
    // stuck: barely moved for 2 s while going somewhere -> give up on that goal for a while
    if (RG.tick - A.posT >= 40) { const mv = Math.hypot(b.x - A.pos[0], b.z - A.pos[1]); if (mv < .4 && !b.dig && A.goal) { A.bad[this.key(...A.goal)] = RG.tick + 600; A.goal = null; A.explore = null; } A.pos = [b.x, b.z]; A.posT = RG.tick; }
    // crafting / smelting (instant, like using the grid); throw junk out when the bag gets full
    if ((RG.tick + A.off) % 8 === 0) { if (!this.craftStep(b, A)) this.smelt(b, A); }
    if ((RG.tick + A.off) % 40 === 0) this.tidy(b, A);
    // where to go: a table / furnace to use > the furnace with ingots ready > a dropped item > a block worth mining > explore
    if (A.brk) { const B = BL[RW.getM(...A.brk)]; if (B.use !== 'chest' || (A.bad[this.key(...A.brk)] || 0) > RG.tick) A.brk = null; else { this.work(b, A, I, A.brk, true); return; } }
    if (A.use) { if (!RW.getM(...A.use) || this.reach(b, A.use)) A.use = null; else { this.work(b, A, I, A.use); return; } }
    if (A.furn) { const d = RG.be.get(this.key(...A.furn)); if (!d || !RW.getM(...A.furn)) A.furn = null; else if (d.inv[2] && !this.reach(b, A.furn)) { this.work(b, A, I, A.furn); return; } }
    const it = this.itemGoal(b, A);
    if (it) { const t0 = A.itemSince.get(it.id); if (t0 === undefined) A.itemSince.set(it.id, RG.tick); else if (RG.tick - t0 > 80) A.badItem.add(it.id); this.navTo(b, it.x, it.y, it.z, I); return; }
    if (!A.goal || RG.tick - A.scanT > 30 || !RW.getM(...A.goal)) this.scan(b, A);
    if (A.goal) { this.work(b, A, I, A.goal); return; }
    // nothing good in sight: tunnel toward a random spot of the arena
    const R = RW.R(gs.big); if (!A.explore || A.explore.t < RG.tick) A.explore = { p: RW.P(randi(-R + 2, R - 2) + .5, randi(203, 210), randi(-R + 2, R - 2) + .5), t: RG.tick + 200 };
    this.navTo(b, A.explore.p.x, A.explore.p.y, A.explore.p.z, I);
  },
  fight(b, A, I, tg, bd) {
    const wi = this.bestWeapon(b).i; if (wi >= 0) this.hold(b, wi);
    const dx = tg.x - b.x, dz = tg.z - b.z, dy = tg.y - b.y, hd = Math.hypot(dx, dz);
    const see = this.los(b, tg); b.seeT = see;
    if (bd < 3.1 && RG.pvpAt(b) && see) { // in reach and visible: hit, strafe, jump-crit, raise the shield now and then
      b.yaw = lerpA(b.yaw, Math.atan2(-dx, dz), .35 * (this.L || this.LV[2]).turn); b.pitch = clamp(-Math.atan2(dy + .3, hd), -1.2, 1.2);
      I.f = bd > 1.6 ? 1 : 0; I.s = Math.sin((RG.tick + A.off * 7) / 14) * .7;
      if (b.atkCd <= 0) { b.tryAttack(tg); b.atkCd = Math.round(randi(6, 11) * (this.L || this.LV[2]).atk); }
      else if (b.off && RIT[b.off.id].shield && tg.swingT > 0 && Math.random() < .5) b.blocking = true;
      if (b.onGround && Math.random() < .08) I.jump = true;
      return;
    }
    this.navTo(b, tg.x, tg.y, tg.z, I);
  },
};
RG.canEditBot = (x, y, z) => { const ph = RG.gs.ph, R = RW.R(RG.gs.big); if (ph === 'game' && x >= -R && x <= R && y >= 201 && y <= 215 && z >= -R && z <= R) return true; if (ph === 'dm' && RG.gs.opts.build && (RG.gs.big ? x >= -3 && x <= 12 && y >= 61 && y <= 65 && z >= -6 && z <= 9 : x >= -2 && x <= 9 && y >= 73 && y <= 78 && z >= -5 && z <= 6)) return true; return false; };
