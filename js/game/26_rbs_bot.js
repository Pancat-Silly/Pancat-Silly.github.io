// ===================== Random Block Survival: bots (simulated by the host) =====================
// Lobby: always ready, wander near the spawn. Arena / deathmatch: chase the nearest player, dig through blocks in the
// way, jump up steps, hit when in reach — only with a clear line of sight (no hitting through walls). Bots get no free items.
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
  think(b) {
    const I = b.inp; I.f = 0; I.s = 0; I.jump = false; I.sneak = false; I.sprint = false; b.blocking = false;
    if (!b.alive) return; if (RUI.botAI === false) return;
    const ph = RG.gs.ph, ar = RG.area(b);
    if (ar === 'lobby' || ar === 'winner' || ar === 'dmspec' || ar === 'other') { // idle wander
      if (RG.tick % 60 === 0) b.wander = Math.random() < .5 ? rand(-Math.PI, Math.PI) : null;
      if (b.wander !== null && b.wander !== undefined) { b.yaw = lerpA(b.yaw, b.wander, .1); I.f = .6; if (b.hx) I.jump = true; }
      return;
    }
    if (ph === 'start' || (ph === 'dm' && RG.hostNow() < RG.gs.t + 7500)) return; // frozen in the spawn pocket / countdown
    // target: nearest other living player in the same area
    let tg = null, bd = 1e9; for (const p of RG.players()) { if (p === b || p.id === b.id || p.spectator || p.alive === false || RG.area(p) !== ar) continue; const d = Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z); if (d < bd) { bd = d; tg = p; } }
    if (!tg) return;
    const dx = tg.x - b.x, dz = tg.z - b.z, dy = tg.y - b.y; const want = Math.atan2(-dx, dz); b.yaw = lerpA(b.yaw, want, .35); b.pitch = clamp(-Math.atan2(dy + .3, Math.hypot(dx, dz)), -1.2, 1.2);
    const hd = Math.hypot(dx, dz);
    const see = this.los(b, tg); b.seeT = see;
    if (bd < 3.1 && RG.pvpAt(b) && see) { // fight (only when the target is actually visible)
      I.f = bd > 1.6 ? 1 : 0; if (b.atkCd <= 0) { b.tryAttack(tg); b.atkCd = randi(6, 11); }
      if (b.onGround && Math.random() < .08) I.jump = true; // jump-crit
      return;
    }
    I.f = 1; I.sprint = hd > 5;
    // dig through: block in front at feet / head, or the block above when the target is higher
    if (b.mode === 'survival') {
      const fx = -Math.sin(b.yaw), fz = Math.cos(b.yaw); const [mx, my, mz] = RG.mcOf(b);
      const ax = Math.abs(fx) > Math.abs(fz) ? Math.sign(fx) : 0, az = ax ? 0 : Math.sign(fz);
      const cand = [];
      if (dy < -1.5 && hd < 1.5) cand.push([Math.floor(mx), Math.floor(my) - 1, Math.floor(mz)]);
      else { cand.push([Math.floor(mx) + ax, Math.floor(my), Math.floor(mz) + az], [Math.floor(mx) + ax, Math.floor(my) + 1, Math.floor(mz) + az]); if (dy > 1.5) cand.push([Math.floor(mx), Math.floor(my) + 2, Math.floor(mz)]); }
      let target = null; for (const c of cand) { const id = RW.getM(c[0], c[1], c[2]); if (id && BL[id].solid && !BL[id].unbreak && RG.canEditBot(c[0], c[1], c[2])) { target = c; break; } }
      if (target) {
        const k = target.join(','); if (!b.dig || b.dig.k !== k) b.dig = { k, p: 0 };
        const B = BL[RW.getM(target[0], target[1], target[2])]; b.dig.p += b.breakSpeed(B) * 1.6 + .004; b.swingAnim();
        if (b.dig.p >= 1) { RG.breakBlock(b, target[0], target[1], target[2], false); b.dig = null; }
        if (target[1] === Math.floor(my) - 1) I.f = 0; else if (b.hx) I.f = 0;
      } else if (b.hx) I.jump = true;
      // pillar up when the target is far above and nothing to dig
      if (dy > 2.5 && hd < 2 && !target && b.onGround && RG.tick % 12 === 0) { I.jump = true; const bx = Math.floor(mx), by = Math.floor(my), bz = Math.floor(mz); setTimeout(() => { if (RW.getM(bx, by, bz) === 0 && RG.canEditBot(bx, by, bz)) RG.setBlock(bx, by, bz, RBLK.K('cobblestone')); }, 250); }
    } else if (b.hx) I.jump = true;
  },
};
RG.canEditBot = (x, y, z) => { const ph = RG.gs.ph, R = RW.R(RG.gs.big); if (ph === 'game' && x >= -R && x <= R && y >= 201 && y <= 215 && z >= -R && z <= R) return true; if (ph === 'dm' && RG.gs.opts.build && (RG.gs.big ? x >= -3 && x <= 12 && y >= 61 && y <= 65 && z >= -6 && z <= 9 : x >= -2 && x <= 9 && y >= 73 && y <= 78 && z >= -5 && z <= 6)) return true; return false; };
