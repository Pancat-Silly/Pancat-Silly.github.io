// ===================== skills =====================
const otherPlayers = (p, r) => G.players().filter(t => t.id !== p.id && !t.spectator && t.alive && !G.sameTeam(t.id, p.id) && (r === undefined || dist3(t, p) <= r));
// area attacks: enemy players plus enemy spiders / dogs (local or remote)
const otherTargets = (p, r) => G.targets().filter(t => t.id !== p.id && !(t.kind === 'mob' && t.owner === p.id) && !G.sameTeam(t.id, p.id) && (r === undefined || dist3(t, p) <= r));
const nearestOf = (p, list) => { let b = null, bd = 1e9; for (const t of list) { const d = dist3(t, p); if (d < bd) { bd = d; b = t; } } return b; };
const SK = {
  // ---------- generic ----------
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
    const W = G.world; const under = W.get(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z));
    if (under === 37 && p.onGround) { p.yaw += 10 * D2R; if (p === G.me) AU.loop('360song', true); p._spin = true; }
    else if (p._spin) { p._spin = false; if (p === G.me) AU.loop('360song', false); }
    p.onPad = BL[under].pad && p.onGround ? BL[under].pad : null;
  },
  onDeath(p) { if (p === G.me) AU.loop('360song', false); SK.danceEnd(p, false); },
  // ---------- rusher ----------
  rush(p) { p.addEff('speed', 9, 1.5); AU.sfx('firework', p, .6); return true; },
  // 번개 자국: for 5 s the rusher leaves a mark every block it runs (each mark lasts 5 s). Enemies standing on a mark get
  // slowness II (refreshed while they stay on it) and 1 damage per second (once per victim, however many marks overlap). Marks are network events; every client applies them to its own players / bots
  TRAIL_T: 100, MARK_T: 100, MARK_R: .9,
  rzone(p) { p.st.trailUntil = G.tick + SK.TRAIL_T; p.st.trailLast = null; AU.sfx('firework', p, .8, .6); p.swingT = 6; if (p.msg) p.msg('§e번개 자국 §f5초 동안 지나간 자리에 자국이 남아요'); return true; },
  trailTick(p) {
    if (!p.alive || p.spectator) return; const L = p.st.trailLast;
    if (L && Math.hypot(p.x - L.x, p.z - L.z) < 1 && Math.abs(p.y - L.y) < 1) return;
    const gy = Math.floor(p.y + .01); p.st.trailLast = { x: p.x, y: p.y, z: p.z };
    G.emitAndApply({ k: 'rmark', x: r1(p.x), y: gy, z: r1(p.z), by: p.id });
  },
  zoneTick() {
    for (const z of G.zones) {
      const a = G.tick - z.t0, fade = 1 - a / SK.MARK_T;
      if (a % 4 === 0) { for (let i = 0; i < 2; i++) { const q = Math.random() * 6.28, d = Math.random() * z.r; G.particles('dust', z.x + Math.cos(q) * d, z.y + .08, z.z + Math.sin(q) * d, 1, [1, .85 * fade + .1, .2]); } if (a % 12 === 0) G.particles('glow', z.x, z.y + .15, z.z, 1); }
      if (a % 5 !== 0 || G.phase !== 'game') continue;
      const on = t => Math.hypot(t.x - z.x, t.z - z.z) <= z.r && t.y > z.y - .6 && t.y < z.y + 1.2;
      for (const t of [G.me, ...G.bots]) { if (!t || !t.alive || t.spectator || t.id === z.by || G.sameTeam(t.id, z.by) || !on(t)) continue; t.addEff('slowness', 1, 1.5);
        if (!(t.trailHitT > G.tick - 20)) { t.trailHitT = G.tick; t.hurt(1, { type: 'magic', by: z.by, nokb: true, noinvul: true }); G.particles('glow', t.x, t.y + 1, t.z, 2); } }
    }
    G.zones = G.zones.filter(z => G.tick - z.t0 < SK.MARK_T);
  },
  // ---------- policer ----------
  baton(p) {
    const warned = otherPlayers(p, 15);
    for (const t of warned) G.send(t, { k: 'pol' });
    if (p === G.me) SK.policeWarn();
    G.after(28, () => { if (!p.alive) return; p.addEff('speed', 5, 2); p.addEff('glowing', 5, 2); p.addEff('strength', 1, 2); for (const t of warned) G.send(t, { k: 'snd', n: '360b' }); if (p === G.me) AU.play('360b', {}); else AU.play('360b', { pos: p, range: 20 }); });
    G.after(58, () => { p.clearEff('speed'); p.clearEff('glowing'); p.clearEff('strength'); });
    return true;
  },
  policeWarn() { // runs on warned client
    const seq = [[0, '경'], [4, '경찰'], [6, '경찰이'], [8, '경찰이 온'], [12, '경찰이 온다']];
    // original pitches: 경 / 경찰 / 경찰이 / 경찰이 온 = 1, 경찰이 온다 = 0.890899, then 3 = 1, 3 6 = 0.749154, 3 6 0 = 0.890899
    for (const [t, s] of seq) G.after(t, () => { UI.title(s, '', { fi: 0, st: 40, fo: 20 }); AU.sfx('hat', null, 1, s === '경찰이 온다' ? .890899 : 1); });
    const sub = [[16, '§c3 §76 §70', 1], [20, '§c3 §66 §70', .749154], [24, '§c3 §66 §a0', .890899]];
    for (const [t, s, pi] of sub) G.after(t, () => { UI.title('경찰이 온다', s, { fi: 0, st: 40, fo: 20 }); AU.sfx('hat', null, 1, pi); });
  },
  // ---------- spider ----------
  colony(p) {
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    dirs.forEach(([dx, dz], idx) => {
      const m = G.spawnMob('spider', p, p.x, p.y + .2, p.z); m.vx = dx * .1; m.vz = dz * .1; m.vy = .5;
      const kids = idx === 0 ? 4 : 3; // 13 cave spiders total (80% of 16)
      G.after(67, () => {
        if (!m.alive) return; m.alive = false;
        for (const [ex, ez] of dirs.slice(0, kids)) { const c = G.spawnMob('cave', p, m.x, m.y + .1, m.z); c.vx = ex * .1; c.vz = ez * .1; c.vy = .3; c.life = 61; }
        G.fx('poof', m.x, m.y + .3, m.z);
      });
    });
    AU.sfx('spider', p); return true;
  },
  egg(p) { const m = G.spawnMob('big', p, p.x, p.y, p.z); m.life = 120; AU.sfx('spider', p, 1, .7); return true; },
  // ---------- 360 ----------
  rod0(p) {
    AU.sfx('reel', p);
    if (Math.random() < 0.1) {
      G.broadcastTitle('경 * 가천대학교 합격 * 축', '', { fi: 20, st: 20, fo: 20 });
      p.addEff('health_boost', 14, 30); p.addEff('regeneration', 255, 4); p.hp = p.maxHp(); p.addEff('strength', 3, 20); p.addEff('resistance', 1, 60);
      G.sound('360number', null); AU.sfx('levelup', null);
    } else {
      p.actionbar('아 쉽 지 만 예비 360번'); p.addEff('poison', 1, 3); p.addEff('strength', 0, 10); G.sound('360b', null);
    }
    return true;
  },
  rod6(p) {
    AU.sfx('reel', p); p.addEff('speed', 4, 1);
    const t = nearestOf(p, G.targets().filter(t => t.id !== p.id && !G.sameTeam(t.id, p.id))); if (t) { G.damage(t, 3, { type: 'proj', by: p.id, nokb: true }); G.fx('spit', t.x, t.y + t.h * .6, t.z); }
    return true;
  },
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
  // ---------- ice wizard ----------
  icejail(p) {
    AU.sfx('anvil', p, .8);
    const t = nearestOf(p, otherPlayers(p, 15)); if (!t) { p.actionbar('§715칸 안에 대상이 없습니다'); return true; }
    G.emitAndApply({ k: 'ice', x: Math.floor(t.x), y: Math.floor(t.y + .1), z: Math.floor(t.z), by: p.id });
    G.sound('anvil_', t);
    return true;
  },
  // ---------- randomizer ----------
  lucky(p) {
    let r = randi(0, 7); if (r === 6 && p.gotShield) r = choice([0, 1, 2, 3, 4, 5, 7]); let msg;
    if (r <= 1) { p.addItem('baghak', 1); msg = '백학 개인정보'; }
    else if (r <= 3) { p.addItem('arrow', 5); msg = '화살 5개'; }
    else if (r === 4) { p.addItem('pot_res', 1); msg = '즉시 적용 저항포션'; }
    else if (r === 5) { p.addItem('pot_spd', 1); msg = '즉시 적용 신속포션'; }
    else if (r === 6) { if (!p.addItem('shield', 1)) msg = null; else { p.gotShield = true; const s = p.off && p.off.id === 'shield' ? p.off : null; if (s) { s.dur = 25; s.max = 25; } msg = '방패 (내구도 25)'; } }
    else { const ex = p.inv.find(s => s && s.id === 'dia_sword'); if (ex) ex.count++; else if (p.addItem('dia_sword', 1)) { const s = p.inv.find(s => s && s.id === 'dia_sword'); s.dur = 5; s.max = 5; } msg = '다이아몬드 검 (내구도 5)'; }
    if (msg) p.msg('§6[럭키 박스] §f' + msg + ' 획득!');
    G.sound('whatforme', p, 'rnd');
    return true;
  },
  baghak(p) {
    p.addEff('speed', 2, 5); p.addEff('strength', 1, 10); p.addEff('resistance', 1, 10);
    const c = otherPlayers(p, 25); if (c.length) G.applyFx(choice(c), [['glowing', 0, 10]]);
    G.stopSound('whatforme'); G.sound('baghakpersonalinformation', null); AU.sfx('eat', p); return true;
  },
  pot_res(p) { p.addEff('resistance', 1, 5); AU.sfx('drink', p); return true; },
  pot_spd(p) { p.addEff('speed', 1, 5); AU.sfx('drink', p); return true; },
  // ---------- suno ----------
  wait(p) {
    p.addEff('speed', 1, 1); p.addEff('jump_boost', 1, 1);
    for (const t of otherPlayers(p, 20)) G.applyFx(t, [['slowness', 99, 1]]);
    G.sound('wait', null); return true;
  },
  study(p) {
    if (p.rec.length < 2) return false;
    p.st.rewind = { k: 0, path: p.rec.slice() };
    p.addEff('slow_falling', 0, 1); p.addEff('resistance', 5, 1); p.addEff('weakness', 4, 1);
    G.sound('study1b', p); return true;
  },
  rewindTick(p) {
    const r = p.st.rewind; r.k++; const i = r.path.length - 1 - 2 * r.k;
    if (i >= 0) { const q = r.path[i]; p.x = q[0]; p.y = q[1]; p.z = q[2]; }
    p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    if (r.k >= 32 || i <= 0) { if (i <= 0 && r.path[0]) { p.x = r.path[0][0]; p.y = r.path[0][1]; p.z = r.path[0][2]; } p.st.rewind = null; G.sound('study2b', p); if (p.count('runsuno') < 1) { p.addItem('runsuno', 1); p.msg('§e[이제 수노 돌려라] 획득'); } }
  },
  v4(p) { p.addEff('regeneration', 4, 1); AU.sfx('eat', p); return true; },
  runsuno(p) { for (const t of G.players()) G.applyFx(t, [['glowing', 0, 5]]); G.sound('runsuno', null); return true; },
  // ---------- grab ----------
  grabPassive(p) {
    const st = p.st; st.charge = st.charge || 0;
    if (p.sneaking && !st.grab) {
      st.charge++;
      const bar = n => '차징 : ' + '§a' + '▒'.repeat(n) + '§c' + '▒'.repeat(3 - n);
      if (st.charge === 1) p.actionbar(bar(0)); if (st.charge === 8) { p.actionbar(bar(1)); AU.sfx('hat', p, .7, .75); }
      if (st.charge === 15) { p.actionbar(bar(2)); AU.sfx('hat', p, .7, .9); } if (st.charge === 22) { p.actionbar(bar(3)); AU.sfx('hat', p, .7, 1); }
    } else if (st.charge > 0 && !p.sneaking) { p.actionbar('차징 : §c취소됨!'); st.charge = 0; }
  },
  grab(p) {
    if ((p.st.charge || 0) < 22) { p.actionbar('§c아직 차징이 되지 않았습니다!'); AU.sfx('bass', p); p.st.charge = 0; p.setCd('grab', 2); return 'nocd'; }
    p.st.charge = 0;
    const o = { x: p.x, y: p.y + p.eye - .3, z: p.z }, d = lookVec(p.yaw, p.pitch);
    // players: original behaviour (chain ignores walls). bots: only hook targets they can actually see
    const L = 20;
    p.st.grab = { t: 0, o, d, L, los: !!p.isBot, hooked: new Set(), ex: !!p.st.grabArmed };
    G.emitAndApply({ k: 'chain', o: [r1(o.x), r1(o.y), r1(o.z)], d: [r1(d.x), r1(d.y), r1(d.z)], l: r1(L), by: p.id });
    return true;
  },
  grabTick(p) {
    const g = p.st.grab; g.t++;
    if (g.t > 10 && g.t <= 20) {
      const tip = Math.min(g.L, 20 - 2 * (g.t - 10));
      for (const t of otherPlayers(p)) {
        if (g.hooked.has(t.id)) continue;
        const tc = { x: t.x, y: t.y + t.h / 2, z: t.z };
        for (let s = 0; s <= tip; s += 2) {
          const q = { x: g.o.x + g.d.x * s, y: g.o.y + g.d.y * s, z: g.o.z + g.d.z * s }; const dd = dist3(q, tc);
          if (dd <= 5 && (!g.los || SK.canSee(p, t))) { g.hooked.add(t.id); break; }
        }
        if (g.hooked.has(t.id)) { G.damage(t, 5, { type: 'generic', by: p.id, nokb: true }); G.send(t, { k: 'pull', by: p.id }); G.sound('comeon', t, 'near'); G.sound('comeon', p, 'near'); }
      }
    }
    if (g.t >= 20) {
      p.st.grab = null;
      if (g.ex) {
        p.st.grabArmed = false; G.fx('explosion', p.x, p.y + 1, p.z); G.sound('explode_', p);
        G.emitAndApply({ k: 'gex', x: r1(p.x), y: r1(p.y), z: r1(p.z), by: p.id });
      }
    }
  },
  canSee(a, t) { const e = { x: a.x, y: a.y + a.eye, z: a.z }, c = { x: t.x, y: t.y + t.h * .6, z: t.z }, d = dist3(e, c) || 1; return !G.world.ray(e, { x: (c.x - e.x) / d, y: (c.y - e.y) / d, z: (c.z - e.z) / d }, d); },
  grabex(p) { p.st.grabArmed = true; p.actionbar('§a그랩시 폭발 활성화됨'); AU.sfx('firework', p, .5); return true; },
  // grab explosion resolved on the victim's own client (its true position), so ping/interpolation can't make it miss
  gexHit(t, c, by) { const dx = t.x - c.x, dz = t.z - c.z, l = Math.hypot(dx, dz) || 1; t.hurt(6, { type: 'explosion', by, dx: dx / l, dz: dz / l, fx: c.x, fz: c.z }); },
  pullEnd(p) { const s = p.st.pulled; p.st.pulled = null; if (s && s.ex) { const g = G.entity(s.by); const c = g ? { x: g.x, y: g.y, z: g.z } : s.ex; if (dist3(p, c) <= 3.5 || dist3(p, s.ex) <= 3.5) SK.gexHit(p, s.ex, s.by); } },
  pullTick(p) {
    const s = p.st.pulled; s.t++; const g = G.entity(s.by);
    if (!g || s.t > 40 || g.spectator) { SK.pullEnd(p); return; }
    // original C: tp facing grabber's feet, then up to 10x "if block ^ ^ ^0.1 is air -> tp ^ ^ ^0.1"; a non-air block ends the pull
    const tx = g.x - p.x, ty = g.y - p.y, tz = g.z - p.z, d = Math.hypot(tx, ty, tz);
    p.yaw = yawTo(tx, tz); p.pitch = -Math.atan2(ty + (g.h || 1.8) * .8 - p.eye, Math.hypot(tx, tz));
    p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    if (d <= 1) { SK.pullEnd(p); return; }
    const ux = tx / d, uy = ty / d, uz = tz / d, W = G.world;
    for (let i = 0; i < 10; i++) {
      const nx = p.x + ux * .1, ny = p.y + uy * .1, nz = p.z + uz * .1;
      if (W.get(Math.floor(nx), Math.floor(ny), Math.floor(nz)) !== 0) { SK.pullEnd(p); return; }
      p.x = nx; p.y = ny; p.z = nz;
      if (Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z) <= 1) { SK.pullEnd(p); return; }
    }
    p.onGround = false;
  },
  // ---------- slime ----------
  cutter(p) {
    p.addEff('speed', 0, 3);
    for (const t of G.targets()) if (dist3(t, p) <= 3) G.spawnDrop(t.x, t.y + 1, t.z, p);
    for (const t of G.targets()) if (dist3(t, p) <= 4) { if (t === p) p.hurt(1, { type: 'explosion', nokb: true, exact: true }); else G.damage(t, 1, { type: 'explosion', by: p.id, nokb: true }); }
    AU.sfx('splat', p); G.fx('slime', p.x, p.y + 1, p.z); return true;
  },
  slimeball(p) { p.heal(1); p.addEff('resistance', 0, 2.5); G.particles('heart', p.x, p.y + p.h, p.z); AU.sfx('eat', p); return true; },
  // ---------- viggle (WIP) ----------
  drone(p) {
    p.vy = 1.5; p.onGround = false; p.st.noFall = true; p.fallDist = 0; p.st.droneUp = true;
    for (const t of otherTargets(p, 4)) G.damage(t, 6, { type: 'explosion', by: p.id, nokb: true });
    G.fx('explosion', p.x, p.y + .5, p.z); G.sound('thisdrone', p); G.sound('explode_', p); return true;
  },
  spinArm(p) { p.st.spinArmed = true; p.actionbar('§d360도 회전 활성화됨'); AU.sfx('drink', p, .6); return true; },
  // at the drone's apex: small hop, 360 degrees in 0.5s, splash damage potions to the front (start) and back (half-turn)
  spinStart(p) {
    p.st.spinArmed = false; p.vy = 0.3; p.st.noFall = true; p.st.spin = { t: 0 };
    G.sound('360degreespin', p); SK.throwPotion(p);
  },
  // 10 steps of 36 degrees; every step throws one potion forward and one backward
  spinTick(p) {
    const s = p.st.spin; s.t++; p.yaw += Math.PI * 2 / 10;
    if (s.t < 10) SK.throwPotion(p); else p.st.spin = null;
  },
  throwPotion(p) {
    const o = { x: p.x, y: p.y + p.eye * .5, z: p.z };
    for (const a of [0, Math.PI]) G.spawnArrow(p, o, lookVec(p.yaw + a, 65 * D2R), 0.35, { potion: true });
    AU.sfx('bow', p, .5, .7);
  },
  destroy(p) {
    if (G.tick < (p.st.destroyUntil || 0)) { p.actionbar('§c아직 복구 중입니다'); return false; }
    const di = ((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4; p.yaw = di * Math.PI / 2;
    G.emitAndApply({ k: 'vig', x: Math.floor(p.x), y: Math.floor(p.y + .1), z: Math.floor(p.z), d: di, by: p.id });
    p.st.destroyUntil = G.tick + 120 + VIG_N; G.sound('destroyall2b', p, 20, .75); return true;
  },
  // ---------- 빌코너 ----------
  BIL_SKILLS: new Set(['gather', 'bdash', 'squid', 'harder', 'drug']), // only these grow followers
  addFollowers(p, n) {
    if (!n) { p.st.folU = (p.st.folU || 0) + 1; n = Math.round(6.25 * p.st.folU) - Math.round(6.25 * (p.st.folU - 1)); } // 16 skill uses = exactly 100
    p.st.fol = (p.st.fol || 0) + n; if (p === G.me) UI.folPop(n);
    if (p.st.fol >= 100 && !p.st.follow100 && !p.st.awaken) { p.st.follow100 = true; p.st.dotT = 0; p.title('§c팔로워 100명 찍으면 자살한다', '', { fi: 5, st: 50, fo: 15 }); G.sound('chang_9b', p); }
  },
  bilTick(p) { // followers +1~2 every second; at 100: 1 heart per second until death (ignores armor and resistance)
    p.st.folT = (p.st.folT || 0) + 1; if (p.st.folT % 20 === 0 && p.alive && !p.spectator) SK.addFollowers(p, randi(1, 2));
    if (!p.st.follow100 || p.st.awaken) return; p.st.dotT++;
    if (p.st.dotT % 20 === 0) { p.hurt(2, { type: 'follower', exact: true, noinvul: true, nokb: true }); G.particles('red', p.x, p.y + p.h * .6, p.z); G.sound('changchan_follower_hurt', p); if (p === G.me) UI.folPop(0, '출혈이 있다', 'bleed'); } // 팔로워 100명 지속 피해 효과음 (tools/sounds)
  },
  // death while the 100-follower curse is active: 10% totem-like awakening
  bilRevive(p) {
    if (p.job !== 'bilcorner' || !p.st.follow100 || p.st.awaken || Math.random() >= 0.5) return false;
    p.st.follow100 = false; p.st.awaken = true;
    const s = p.inv.find(s => s && s.id === 'squid'); if (s) s.id = 'harder';
    p.effects = {}; p.fire = 0; p.hp = p.maxHp(); p.invul = 20;
    for (const [n, a] of [['glowing', 0], ['strength', 0], ['speed', 0]]) p.effects[n] = { amp: a, t: 2e6, max: 2e6 };
    p.title('§6쉰팝?', '', { fi: 3, st: 40, fo: 15 }); G.sound('chang_14b', p); G.fx('totem', p.x, p.y + 1, p.z);
    return true;
  },
  gather(p) {
    G.sound('chang_5b', p); const c = { x: r1(p.x), y: r1(p.y), z: r1(p.z) };
    for (const t of otherPlayers(p)) if (distH(t, p) <= 7.5 && Math.abs(t.y - p.y) < 6) G.send(t, { k: 'suck', by: p.id, x: c.x, y: c.y, z: c.z });
    G.fx('suck', c.x, c.y + 1, c.z);
    G.after(12, () => {
      G.fx('explosion', c.x, c.y + 1, c.z); G.sound('explode_', c);
      for (const t of otherTargets(p)) if (t.kind === 'mob' && distH(t, c) <= 7.5 && Math.abs(t.y - c.y) < 6) { const dx = t.x - c.x, dz = t.z - c.z, l = Math.hypot(dx, dz) || 1; G.damage(t, 6, { type: 'explosion', by: p.id, dx: dx / l, dz: dz / l, kbx: 3, fx: c.x, fz: c.z }); }
    });
    return true;
  },
  // victim side: pulled into the caster's spot for 0.6s, then the blast hits from where we really are
  suckTick(p) {
    const s = p.st.sucked; s.t++; const c = s.c; const tx = c.x - p.x, ty = c.y - p.y, tz = c.z - p.z, d = Math.hypot(tx, ty, tz);
    const st = Math.min(0.9, Math.max(0, d - 0.9)); if (st > 0) { const r = moveAABB(G.world, p, tx / d * st, ty / d * st, tz / d * st, p.step); p.onGround = r.ground; if (r.hx || r.hz) { p.x += tx / d * st; p.y += ty / d * st; p.z += tz / d * st; } }
    p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    if (s.t >= 12) { p.st.sucked = null; { let g = 0; while (aabbBlocks(G.world, p, B => B.solid) && g++ < 20) p.y += 1; } if (dist3(p, c) <= 3.5) { const dx = p.x - c.x, dz = p.z - c.z, l = Math.hypot(dx, dz) || 1; p.hurt(6, { type: 'explosion', by: s.by, dx: l > .05 ? dx / l : Math.cos(Math.random() * 6.3), dz: l > .05 ? dz / l : Math.sin(Math.random() * 6.3), kbx: 3, fx: c.x, fz: c.z }); } }
  },
  bdash(p) {
    G.emitAndApply({ k: 'dfx', id: p.id }); G.sound('chang_3b', p); p.st.dash = { t: 0, dx: -Math.sin(p.yaw), dz: Math.cos(p.yaw), go: 0 }; p.st.noFall = true; return true;
  },
  dashTick(p) {
    const s = p.st.dash; s.t++; const stp = Math.min(1.5, 10 - s.go); const r = moveAABB(G.world, p, s.dx * stp, 0, s.dz * stp, p.step); s.go += stp;
    for (const t of otherPlayers(p)) {
      if (Math.hypot(t.x - p.x, t.z - p.z) <= p.w / 2 + t.w / 2 + .6 && t.y < p.y + p.h && t.y + t.h > p.y) {
        G.damage(t, 5, { type: 'melee', by: p.id, dx: s.dx, dz: s.dz, kbx: 0, fx: p.x, fz: p.z }); G.sound('hit_', t); p.st.dash = null; break;
      }
    }
    if (p.st.dash && (s.go >= 10 || r.hx || r.hz)) p.st.dash = null;
    p.vx = p.vz = 0; p.vy = 0; p.fallDist = 0;
  },
  squid(p) { if (p.hp >= p.maxHp()) { } p.heal(6); G.sound('chang_6b', p); G.fx('heart', p.x, p.y + 2, p.z); return true; },
  harder(p) {
    G.sound('chang_2b', p);
    for (const t of otherTargets(p, 4)) { const dx = t.x - p.x, dz = t.z - p.z, l = Math.hypot(dx, dz) || 1; G.damage(t, 4, { type: 'melee', by: p.id, dx: dx / l, dz: dz / l, kbx: 2, fx: p.x, fz: p.z }); }
    const cur = p.effects.strength ? p.effects.strength.amp : -1; p.effects.strength = { amp: cur + 1, t: 2e6, max: 2e6 };
    G.fx('explosion', p.x, p.y + 1, p.z); return true;
  },
  drug(p) { p.addEff('speed', 2, 6); p.addEff('strength', 0, 6); p.addEff('resistance', 1, 6); G.sound('chang_12b', p); return true; },
  // ---------- dude (WIP) ----------
  maceBonus(fd) { let b = 0; b += 4 * Math.min(3, fd); if (fd > 3) b += 2 * Math.min(5, fd - 3); if (fd > 8) b += fd - 8; return b + 0.5 * fd; },
  maceSmash(p, tgt) {
    G.fx('explosion', tgt.x, tgt.y + .2, tgt.z); AU.sfx('smash', p);
    for (const t of G.targets()) if (t !== tgt && t.id !== p.id && dist3(t, tgt) < 3.5) { const dx = t.x - tgt.x, dz = t.z - tgt.z, l = Math.hypot(dx, dz) || 1; G.damage(t, 0.01, { type: 'melee', by: p.id, dx: dx / l, dz: dz / l, kbx: 1, fx: tgt.x, fz: tgt.z }); }
  },
  fish(p) {
    AU.sfx('reel', p); const f = choice(['생대구', '생대구', '생대구', '생연어', '생연어', '복어', '열대어']);
    p.msg('§b[낚시] §f' + f + '을(를) 낚았습니다');
    if (Math.random() < 0.33) { p.addItem('crate', 1); p.msg('§6진주나무 크레이트를 얻었습니다!'); AU.sfx('levelup', p); }
    return true;
  },
  crate(p) {
    const r = randi(0, 15); let m;
    if (r <= 10) { const n = 15 - r; p.addItem('pot_heal', n); m = '소형 회복 포션 ×' + n; }
    else if (r === 11) { p.addItem('pot_turtle'); m = '철피부 포션'; } else if (r === 12) { p.addItem('pot_fire'); m = '흑요석 피부 포션'; }
    else if (r === 13) { p.addItem('pot_swift'); m = '신속 포션'; } else if (r === 14) { p.addItem('aglet'); m = '애글릿'; } else { p.addItem('boots'); m = '돛새치 부츠'; }
    p.msg('§6[크레이트] §f' + m); AU.sfx('pop', p); return true;
  },
  pot_heal(p) { p.heal(4); AU.sfx('drink', p); G.fx('heart', p.x, p.y + 2, p.z); return true; },
  pot_turtle(p) { p.addEff('slowness', 3, 20); p.addEff('resistance', 2, 20); AU.sfx('drink', p); return true; },
  pot_fire(p) { p.addEff('fire_resistance', 0, 180); AU.sfx('drink', p); return true; },
  pot_swift(p) { p.addEff('speed', 0, 180); AU.sfx('drink', p); return true; },
  // ---------- dude New: 댄스 ----------
  // toggle: dance in place (no moving / attacking, other skills locked) to the song while a frog joins every second;
  // stopping gives buffs for the frogs gathered. Everyone sees it through 'dance' / 'dfrog' events (G.dancers, R.drawFrogs).
  DANCE_MAX: 30, DANCE_FX_SEC: 30,
  dance(p) {
    if (p.st.dance) return SK.danceEnd(p, true);
    p.st.dance = { t: G.tick, yaw: p.yaw, n: 0 }; p.sprinting = false; p.vx = p.vz = 0;
    G.emitAndApply({ k: 'dance', by: p.id, on: 1, yaw: r1(p.yaw) });
    p.actionbar('§a댄스 시작! §7다시 누르면 그만두고 버프를 받아요'); return 'nocd';
  },
  danceTick(p) {
    const d = p.st.dance; p.yaw = d.yaw; const a = G.tick - d.t;
    if (a > 0 && a % 20 === 0 && d.n < SK.DANCE_MAX) {
      for (let k = 0; k < 8; k++) { // a random free spot on the ground around the dancer
        const ang = Math.random() * Math.PI * 2, r = rand(2, 5.5), x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r, gy = SK.fangY(x, p.y + 1, z);
        if (gy === null || Math.abs(gy - p.y) > 3) continue;
        d.n++; G.emitAndApply({ k: 'dfrog', by: p.id, x: r1(x), y: r1(gy), z: r1(z), yaw: r1(d.yaw + rand(-.35, .35)) }); break;
      }
      p.actionbar('§a🐸 개구리 ' + d.n + '마리' + (d.n >= SK.DANCE_MAX ? ' §7(최대)' : ''));
    }
  },
  // reward: n frogs -> 신속 (max IV), 힘 (max II), 회복 (2 HP per frog, up to full), 체력 증가 (+4 HP per 3 frogs, max +20), each frog 5% -> 총알
  danceEnd(p, reward) {
    const d = p.st && p.st.dance; if (!d) return false; p.st.dance = null; G.emitAndApply({ k: 'dance', by: p.id, on: 0 });
    if (!reward) return false;
    const n = d.n, T = SK.DANCE_FX_SEC, spd = Math.min(4, Math.ceil(n / 4)), str = Math.min(2, Math.floor(n / 6)), hb = Math.min(5, Math.floor(n / 3));
    if (spd) p.addEff('speed', spd - 1, T); if (str) p.addEff('strength', str - 1, T); if (hb) p.addEff('health_boost', hb - 1, T);
    p.heal(n * 2); let ammo = 0; for (let i = 0; i < n; i++) if (Math.random() < .05) ammo++; if (ammo) p.addItem('dude_bullet', ammo);
    const R = ['I', 'II', 'III', 'IV'];
    p.msg('§a[댄스] §f개구리 ' + n + '마리' + (n ? ' → ' + [spd && '신속 ' + R[spd - 1], str && '힘 ' + R[str - 1], hb && '체력 +' + hb * 4, '회복 ' + n * 2].filter(Boolean).join(' · ') + (ammo ? ' · §6총알 ' + ammo + '개' : '') : ''));
    if (n) AU.sfx('levelup', p); p.setCd('dance', ITEMS.dance.cd); return 'nocd';
  },
  // ---------- dude New: 권총 ----------
  // one bullet, hitscan in a straight line (aim time doesn't matter). Hitting a player starts the 컷씬 for the shooter and the target
  // (G.cut, R.cutFrame: camera eases to the side 0.977s -> black 0.088s -> red 1.167s with the target falling back), then the target dies.
  CUT_T: [0.977, 0.088, 1.167],
  gunFire(p) {
    if (p.count('dude_bullet') < 1) return; p.take('dude_bullet', 1);
    const o = { x: p.x, y: p.y + p.eye - .1, z: p.z }, d = lookVec(p.yaw, p.pitch), MAX = 80; const wall = G.world.ray(o, d, MAX, B => B.solid); let lim = wall ? wall.t : MAX, hit = null;
    for (const t of otherPlayers(p, MAX + 2)) { const h = rayAABB(o, d, t, lim, .05); if (h !== null && h < lim) { lim = h; hit = t; } }
    const e = { x: o.x + d.x * lim, y: o.y + d.y * lim, z: o.z + d.z * lim };
    G.emitAndApply({ k: 'gshot', a: [r1(o.x), r1(o.y), r1(o.z)], b: [r1(e.x), r1(e.y), r1(e.z)] });
    if (!hit) { AU.sfx('explode', p, .35, 2); return; }
    const n = Math.round((SK.CUT_T[0] + SK.CUT_T[1] + SK.CUT_T[2]) * 20); p.st.cutUntil = G.tick + n; if (hit.local) hit.st.cutUntil = G.tick + n;
    G.emitAndApply({ k: 'gcut', by: p.id, tid: hit.id, a: [r1(p.x), r1(p.y), r1(p.z), r1(yawTo(hit.x - p.x, hit.z - p.z))], b: [r1(hit.x), r1(hit.y), r1(hit.z), r1(yawTo(p.x - hit.x, p.z - hit.z))] });
    const tid = hit.id; G.after(n, () => { const t = G.entity(tid); if (t && t.alive) G.damage(t, 1000, { type: 'magic', by: p.id, nokb: true }); });
  },
  // ---------- 세룡이 (user-made job from the dev tool, ported natively) ----------
  // 성진이 소환: a pig hovers 4 blocks above the target's spot for 1 s (warning ring), falls in 8 ticks, 5 magic in r 1.6.
  // Everyone sees it (event); each client resolves the landing for its own players / mobs (no ping error).
  srPig(p) {
    const t = SK.aimTarget(p, 30) || nearestOf(p, otherTargets(p, 20)); if (!t) { p.actionbar && p.actionbar('§7대상이 없습니다'); return false; }
    const gy = SK.fangY(t.x, t.y + 1, t.z); G.emitAndApply({ k: 'srpig', x: r1(t.x), y: r1(gy === null ? t.y : gy), z: r1(t.z), by: p.id, yaw: r1(Math.random() * 6.28) });
    G.sound('seryong1', p); return true;
  },
  aimTarget(p, max) { const o = { x: p.x, y: p.y + p.eye, z: p.z }, d = lookVec(p.yaw, p.pitch); const wall = G.world.ray(o, d, max, B => B.solid); const lim = wall ? wall.t : max; let best = null, bt = lim;
    for (const t of otherTargets(p, max + 2)) { const hw = t.w / 2 + .1; const h = rayAABB(o, d, { x0: t.x - hw, y0: t.y, z0: t.z - hw, x1: t.x + hw, y1: t.y + t.h, z1: t.z + hw }); if (h !== null && h < bt) { bt = h; best = t; } } return best; },
  srPigTick() {
    for (const g of G.pigs) {
      const a = G.tick - g.t0;
      if (a <= 20 && a % 4 === 0) SK.srRing(g.x, g.y + .1, g.z, 1.6, [1, .3, .4], 20);
      if (a > 20 && a < 28) SK.srRing(g.x, g.y + .1, g.z, 1.6, [1, .2, .2], 20);
      if (a === 28) {
        G.particles('explosion', g.x, g.y + .5, g.z, 3); G.particles('poof', g.x, g.y + .3, g.z, 12); AU.sfx('anvil', g, .7);
        if (G.phase === 'game') for (const t of [G.me, ...G.bots, ...G.mobs]) {
          if (!t || !t.alive || t.spectator || t.id === g.by || (t.kind === 'mob' && t.owner === g.by) || G.sameTeam(t.id, g.by)) continue;
          if (Math.hypot(t.x - g.x, t.y + t.h / 2 - (g.y + .9), t.z - g.z) > 1.6 + t.w / 2) continue;
          let dx = t.x - g.x, dz = t.z - g.z; const l = Math.hypot(dx, dz) || 1; t.hurt(5, { type: 'magic', by: g.by, dx: dx / l, dz: dz / l, kbx: .5, fx: g.x, fz: g.z });
        }
      }
    }
    G.pigs = G.pigs.filter(g => G.tick - g.t0 < 34);
  },
  srRing(x, y, z, r, col, n) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; G.particles('dust', x + Math.cos(a) * r, y, z + Math.sin(a) * r, 1, col); } },
  srLine(a, b, col, step) { const L = dist3(a, b); for (let s = 0; s <= L; s += step) { const k = L ? s / L : 0; G.particles('dust', a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, 1, col); } },
  // ---------- Ai ----------
  // ai 안경: 40-block harmless beam (aim assist ~10°); steals every ability of the player hit as one-use items
  AI_BASE: new Set(['iron_sword', 'dia_sword', 'bow', 'arrow', 'shield', 'ai_prompt', 'ai_glasses', 'big_data']),
  aiGlasses(p) {
    if (p.st.aiSteal) return false;
    const eye = { x: p.x, y: p.y + p.eye, z: p.z }, d = lookVec(p.yaw, p.pitch); const wall = G.world.ray(eye, d, 40, B => B.solid); const lim = wall ? wall.t : 40;
    let t = null, bd = .985;
    for (const q of otherPlayers(p, 42)) { const vx = q.x - eye.x, vy = q.y + 1 - eye.y, vz = q.z - eye.z, dd = Math.hypot(vx, vy, vz) || 1; const dot = (vx * d.x + vy * d.y + vz * d.z) / dd; if (dot > bd && dd <= lim + 1) { t = q; bd = dot; } }
    const a = { x: eye.x + d.x * .5, y: eye.y - .25 + d.y * .5, z: eye.z + d.z * .5 }, b = t ? { x: t.x, y: t.y + 1.2, z: t.z } : { x: eye.x + d.x * lim, y: eye.y + d.y * lim, z: eye.z + d.z * lim };
    G.emitAndApply({ k: 'srbeam', a: [r1(a.x), r1(a.y), r1(a.z)], b: [r1(b.x), r1(b.y), r1(b.z)], c: [.3, .9, 1] }); if (t) G.sound('ai1', p, 30); // sound only when the beam hits a player
    const fail = m => { p.actionbar && p.actionbar(m); p.setCd('ai_glasses', 1); return 'nocd'; };
    if (!t) return fail('§7[ai 안경] 빗나감! 1초 뒤 다시 사용 가능');
    const last = (p.st.aiLast || (p.st.aiLast = {}))[t.id]; if (last !== undefined && G.tick - last < 600) return fail('§c[ai 안경] ' + t.name + ' 다시 훔치기까지 ' + Math.ceil((600 - (G.tick - last)) / 20) + '초');
    // what the target has: its real inventory (bots / me) or, for other players, its job kit
    const src = t.inv ? t.inv.slice(1).map(s => s && s.id) : ((JOBS[t.job] || {}).kit || []).slice(1).map(k => k && k[0]);
    const got = [...new Set(src.filter(id => id && ITEMS[id] && (ITEMS[id].use === 'skill' || ITEMS[id].use === 'crossbow') && !SK.AI_BASE.has(id) && !p.inv.some(s => s && s.id === id)))];
    if (!got.length) return fail('§7[ai 안경] ' + t.name + '에게 훔칠 능력이 없어요');
    p.st.aiLast[t.id] = G.tick; const ids = {};
    const gi = p.inv.findIndex(s => s && s.id === 'ai_glasses'); if (gi >= 0) p.inv[gi] = null; // glasses leave while the stolen skills are out
    for (const id of got) { const i = gi >= 0 && !p.inv[gi] ? gi : p.inv.findIndex(s => !s); if (i < 0) break; p.inv[i] = mkSlot(id, 1); ids[id] = 0; if (ITEMS[id].group) delete p.cds[ITEMS[id].group]; }
    p.st.aiSteal = { ids };
    G.particles('glow', p.x, p.y + 1, p.z, 20); G.particles('poof', t.x, t.y + 1, t.z, 10);
    p.actionbar && p.actionbar('§a[ai 안경] ' + t.name + '의 능력 ' + Object.keys(ids).length + '개를 1회용으로 가져왔어요!');
    return 'nocd';
  },
  // after using a stolen skill: success = used up; a failed use (condition not met) counts, and the 3rd failed try uses it up too
  aiAfterUse(p, slot, ok) {
    const S = p.st.aiSteal; if (!S || !slot || S.ids[slot.id] === undefined) return;
    const failed = ok === false || (ok === 'nocd' && slot.id === 'grab');
    if (failed) { S.ids[slot.id]++; if (S.ids[slot.id] < 3) { p.actionbar && p.actionbar('§7[ai 안경] 사용 실패 ' + S.ids[slot.id] + '/3 — 3번 실패하면 사용한 걸로 쳐요'); return; } }
    const i = p.inv.indexOf(slot); if (i >= 0) p.inv[i] = null; delete S.ids[slot.id];
    if (!Object.keys(S.ids).length) SK.aiRestore(p, true);
  },
  aiRestore(p, msg) {
    if (p.st.aiSteal) for (const id in p.st.aiSteal.ids) { const i = p.inv.findIndex(s => s && s.id === id); if (i >= 0) p.inv[i] = null; }
    p.st.aiSteal = null;
    if (!p.inv.some(s => s && s.id === 'ai_glasses')) { const i = p.inv[1] ? p.inv.findIndex(s => !s) : 1; if (i >= 0) p.inv[i] = mkSlot('ai_glasses', 1); }
    if (msg) { p.setCd('ai_glasses', 10); p.actionbar && p.actionbar('§b[ai 안경] 훔친 능력을 모두 썼어요 · 안경이 돌아왔어요 (쿨타임 10초)'); }
  },
  // 빅데이터: 1st use drops a piece here, 2nd use teleports back to it and heals 6
  aiData(p) {
    if (!p.st.aiPiece) { p.st.aiPiece = { x: p.x, y: p.y, z: p.z }; AU.sfx('click', p); G.particles('totem', p.x, p.y + .5, p.z, 12); SK.srRing(p.x, p.y + .1, p.z, 1, [.3, .8, 1], 20); p.actionbar && p.actionbar('§b[빅데이터] 조각을 두었어요. 다시 쓰면 이곳으로 돌아와요'); p.setCd('big_data', 1); return 'nocd'; }
    const c = p.st.aiPiece; p.st.aiPiece = null; G.particles('poof', p.x, p.y + 1, p.z, 15);
    p.x = c.x; p.y = c.y; p.z = c.z; p.px = p.x; p.py = p.y; p.pz = p.z; p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    p.heal(6); G.sound('ai2', p, 30); G.particles('heart', c.x, c.y + 1.5, c.z, 6); G.particles('totem', c.x, c.y + 1, c.z, 20); SK.srRing(c.x, c.y + .1, c.z, 1.5, [.3, 1, .6], 24);
    p.actionbar && p.actionbar('§a[빅데이터] 조각 위치로 복귀! 체력 +6'); return true;
  },
  // 세명컴고가: 40-block laser (width 0.8, stops at walls); first enemy player hit is stunned 3 s
  srLaser(p) {
    const eye = { x: p.x, y: p.y + p.eye, z: p.z }, d = lookVec(p.yaw, p.pitch); const wall = G.world.ray(eye, d, 40, B => B.solid); const lim = wall ? wall.t : 40;
    let best = null, bp = 1e9;
    for (const q of otherPlayers(p, 42)) { const vx = q.x - eye.x, vy = q.y + .9 - eye.y, vz = q.z - eye.z, pr = vx * d.x + vy * d.y + vz * d.z; if (pr < 0 || pr > lim) continue; const px = vx - d.x * pr, py = vy - d.y * pr, pz = vz - d.z * pr; if (Math.hypot(px, py, pz) < .8 && pr < bp) { best = q; bp = pr; } }
    const len = best ? bp : lim; const a = { x: eye.x + d.x * .5, y: eye.y - .25 + d.y * .5, z: eye.z + d.z * .5 }, b = { x: eye.x + d.x * len, y: eye.y + d.y * len, z: eye.z + d.z * len };
    G.emitAndApply({ k: 'srbeam', a: [r1(a.x), r1(a.y), r1(a.z)], b: [r1(b.x), r1(b.y), r1(b.z)] }); G.sound('seryong2', p);
    if (best) { G.applyFx(best, [['slowness', 9, 3], ['weakness', 4, 3], ['glowing', 0, 3]]); p.st.srStun = { id: best.id, until: G.tick + 60 }; p.actionbar && p.actionbar('§c세명컴고가 적중! §7(3초 안에 귀멸의 세명컴고 사용 가능)'); G.fx('totem', best.x, best.y + 1, best.z); }
    return true;
  },
  // 귀멸의 세명컴고: needs a target hit by the laser in the last 3 s. Dash next to it and open a 10 s r 5 space:
  // the target can't leave it, every other player is pushed out (each client moves its own players). Owner: Regen III + Strength II.
  srDomain(p) {
    const s = p.st.srStun; const t = s && G.tick <= s.until ? G.players().find(q => q.id === s.id && q.alive && !q.spectator) : null;
    if (!t) { p.actionbar && p.actionbar('§c세명컴고가에 맞은 적이 있어야 사용할 수 있습니다'); return false; }
    let dx = t.x - p.x, dz = t.z - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    SK.srLine({ x: p.x, y: p.y + 1, z: p.z }, { x: t.x, y: t.y + 1, z: t.z }, [.6, .1, .9], .4);
    p.x = p.px = t.x - dx * 1.5; p.y = p.py = t.y; p.z = p.pz = t.z - dz * 1.5; p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    G.emitAndApply({ k: 'srdomain', x: r1(t.x), y: r1(t.y), z: r1(t.z), by: p.id, tid: t.id });
    p.addEff('regeneration', 2, 7); p.addEff('strength', 1, 7); G.sound('seryong_ult', p); G.fx('explosion', t.x, t.y + 1, t.z);
    if (p === G.me) UI.title('귀멸의 세명컴고', '§77초간 탈출 불가', { fi: 5, st: 40, fo: 15 }); p.st.srStun = null;
    return true;
  },
  srDomainTick() {
    for (const dm of G.domains) {
      const a = G.tick - dm.t0; if (a % 10 === 0) for (const h of [.1, 1, 2, 3]) SK.srRing(dm.x, dm.y + h, dm.z, dm.r, [.6, .1, .9], 28);
      if (a % 5 === 0) { const q = Math.random() * 6.28; G.particles('dust', dm.x + Math.cos(q) * dm.r, dm.y + Math.random() * 3, dm.z + Math.sin(q) * dm.r, 3, [.6, .1, .9]); }
      if (G.phase !== 'game') continue;
      for (const t of [G.me, ...G.bots]) {
        if (!t || !t.alive || t.spectator || t.id === dm.by) continue; const dx = t.x - dm.x, dz = t.z - dm.z, d = Math.hypot(dx, dz) || .01;
        if (t.id === dm.tid) { if (d > dm.r - .7) { const out = (t.vx * dx + t.vz * dz) / d; if (out > 0) { t.vx -= dx / d * out; t.vz -= dz / d * out; } t.vx -= dx / d * .12; t.vz -= dz / d * .12; } }
        else if (d < dm.r + .6) { t.vx += dx / d * .3; t.vz += dz / d * .3; if (t.onGround) t.vy = Math.max(t.vy, .2); }
      }
    }
    G.domains = G.domains.filter(dm => G.tick - dm.t0 < 140);
  },
  // a kill by this local 세룡이: sharpness +1 for the rest of this life; inside the open space also max HP +5 and heal 5
  srKill(p, pos) {
    p.st.srKills = (p.st.srKills || 0) + 1; AU.sfx('levelup', p, .6); p.actionbar && p.actionbar('§b세명컴고 입학증 §f날카로움 +' + p.st.srKills);
    const dm = G.domains.find(d => d.by === p.id); if (dm && pos && Math.hypot(pos.x - dm.x, pos.z - dm.z) <= dm.r + .8) { p.st.srHp = (p.st.srHp || 0) + 5; p.hp = Math.min(p.maxHp(), p.hp + 5); p.actionbar && p.actionbar('§c귀멸 처치! §a최대체력 +5 §7(누적 +' + p.st.srHp + ')'); }
  },
  // ---------- 소환사 ----------
  dogs(p) {
    for (const m of G.mobs) if (m.type === 'dog' && m.owner === p.id && m.alive) { m.alive = false; G.fx('poof', m.x, m.y + .3, m.z); }
    for (const sd of [-1.1, 1.1]) { const first = sd < 0;
      const lv = lookVec(p.yaw + sd, 0); const m = G.spawnMob('dog', p, p.x + lv.x * .8, p.y + .1, p.z + lv.z * .8);
      if (aabbBlocks(G.world, m, d => d.solid)) { m.x = m.px = p.x; m.z = m.pz = p.z; }
      m.life = 200; m.yaw = p.yaw; m.atkCd = first ? 0 : 15; m.vx = lv.x * .15; m.vz = lv.z * .15; m.vy = .3; G.fx('poof', m.x, m.y + .4, m.z); // atkCd offset: the 2nd dog's bite isn't swallowed by hurt-immunity
    }
    G.sound('ukchuk_2b', p); return true;
  },
  // line direction: nearest enemy inside the front 120 degrees (14 blocks), otherwise where you look
  fangDir(p) {
    const f = lookVec(p.yaw, 0); let best = null, bd = 14;
    for (const t of otherPlayers(p, 14)) { const dx = t.x - p.x, dz = t.z - p.z, l = Math.hypot(dx, dz); if (l < .3 || (dx * f.x + dz * f.z) / l < .5 || l >= bd) continue; bd = l; best = { x: dx / l, z: dz / l, y: t.y, tid: t.id }; }
    return best || { x: f.x, z: f.z, y: p.y };
  },
  fangLine(p) {
    const d = SK.fangDir(p);
    G.emitAndApply({ k: 'fang', m: 0, by: p.id, id: p.id + ':f' + (++G.fangN), x: r1(p.x), y: r1(Math.max(p.y, d.y)), z: r1(p.z), dx: r1(d.x), dz: r1(d.z), tid: d.tid });
    G.sound('aosonggotnie1b', p); p.swingT = 6; return true;
  },
  fangCircle(p) {
    G.emitAndApply({ k: 'fang', m: 1, by: p.id, id: p.id + ':f' + (++G.fangN), x: r1(p.x), y: r1(p.y), z: r1(p.z) });
    G.sound('aosonggotnie1b', p); return true;
  },
  // top surface of the column under (x,z) near y0 with room above, like the evoker's spell placement
  fangY(x, y0, z) {
    const W = G.world, fx = Math.floor(x), fz = Math.floor(z);
    for (let y = Math.floor(y0) + 1; y >= Math.floor(y0) - 4; y--) {
      const B = BL[W.get(fx, y, fz)]; if (!B.solid) continue;
      let top = y + 1; if (!B.full) { top = y; for (const b of B.boxes) top = Math.max(top, y + b[4]); }
      if (!W.solidAt(x, top + .05, z) && !W.solidAt(x, top + .6, z)) return top;
    }
    return null;
  },
  // straight: 12 fangs one block apart, 2 ticks between each, each stays 2s; like a homing shot the line bends toward its target
  // (max 30 degrees per fang) as it grows. circle: rings r=1,2,3 (6/12/18 fangs), 3 ticks apart, each stays 1s
  FANG_DMG: 3, FANG_DEBUFF: 3, FANG_TURN: 30 * Math.PI / 180,
  fangSpawn(ev) {
    if (ev.m === 0) { (G.fangLines || (G.fangLines = [])).push({ x: ev.x, z: ev.z, y: ev.y, dx: ev.dx, dz: ev.dz, n: 0, next: G.tick, tid: ev.tid, by: ev.by, id: ev.id }); SK.fangLineTick(); return; }
    const pts = [];
    for (let r = 1; r <= 3; r++) { const n = r * 6; for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + r * .5; pts.push([ev.x + Math.cos(a) * r, ev.z + Math.sin(a) * r, (r - 1) * 3]); } }
    for (const [x, z, dl] of pts) {
      const y = SK.fangY(x, ev.y, z); if (y === null) continue;
      G.fangs.push({ x, y, z, at: G.tick + dl, end: G.tick + dl + 20, by: ev.by, id: ev.id, r: Math.random() * 6 });
    }
  },
  // grow every homing line by one fang every 2 ticks, steering toward the target's current position
  fangLineTick() {
    const L = G.fangLines; if (!L || !L.length) return;
    for (const l of L) {
      if (G.tick < l.next || l.n >= 12) continue;
      const t = l.tid !== undefined ? G.entity(l.tid) : null;
      if (t && t.alive && !t.spectator) {
        const tx = t.x - l.x, tz = t.z - l.z;
        if (Math.hypot(tx, tz) > .5) { let a = Math.atan2(tz, tx) - Math.atan2(l.dz, l.dx); a = Math.atan2(Math.sin(a), Math.cos(a)); a = clamp(a, -SK.FANG_TURN, SK.FANG_TURN); const c = Math.atan2(l.dz, l.dx) + a; l.dx = Math.cos(c); l.dz = Math.sin(c); }
      }
      l.x += l.dx; l.z += l.dz; l.n++; l.next = G.tick + 2;
      const y = SK.fangY(l.x, l.y, l.z); if (y === null) continue; l.y = y;
      G.fangs.push({ x: l.x, y, z: l.z, at: G.tick, end: G.tick + 40, by: l.by, id: l.id, r: Math.random() * 6 });
    }
    G.fangLines = L.filter(l => l.n < 12);
  },
  // each client resolves fangs against its own player/bots/mobs (no ping error); one hit per cast per target
  // a swarm (spiders...) touching the fangs together: at most 2 hit sounds per 5 ticks instead of one per mob stacked on top of each other
  fangMobSnd(m) { if (SK._fsT === undefined || G.tick - SK._fsT >= 5 || G.tick < SK._fsT) { SK._fsT = G.tick; SK._fsN = 0; } if (SK._fsN >= 2) return; SK._fsN++; G.sound('aosonggotnie2b', m); },
  fangTick() {
    SK.fangLineTick();
    const F = G.fangs; if (!F.length) return;
    const vict = G.phase === 'game' ? [G.me, ...G.bots].filter(t => t && t.alive && !t.spectator) : [];
    const touch = (t, f) => Math.abs(t.x - f.x) < .35 + t.w / 2 && Math.abs(t.z - f.z) < .35 + t.w / 2 && t.y < f.y + .9 && t.y + t.h > f.y - .1;
    for (const f of F) {
      if (G.tick < f.at || G.tick >= f.end) continue;
      if (G.tick === f.at) G.particles('block', f.x, f.y + .15, f.z, 2, [.75, .75, .8]);
      let hit = G.fangHit.get(f.id); if (!hit) G.fangHit.set(f.id, hit = new Set());
      for (const t of vict) {
        if (t.id === f.by || hit.has(t.id) || G.sameTeam(t.id, f.by) || !touch(t, f)) continue;
        const dz0 = t.deaths; if (t.hurt(SK.FANG_DMG, { type: 'magic', by: f.by })) { hit.add(t.id); if (t.deaths === dz0) { t.addEff('slowness', 1, SK.FANG_DEBUFF); t.addEff('weakness', 0, SK.FANG_DEBUFF); } G.sound('aosonggotnie2b', t); }
      }
      for (const m of G.mobs) { if (!m.alive || m.owner === f.by || hit.has(m.id) || !touch(m, f)) continue; if (m.hurt(SK.FANG_DMG, { type: 'magic', by: f.by, nokb: true })) { hit.add(m.id); SK.fangMobSnd(m); } }
    }
    G.fangs = F.filter(f => G.tick < f.end); if (!G.fangs.length) G.fangHit.clear();
  },
  equipboots(p) { p.bootsBonus = 0.1; p.msg('§b돛새치 부츠를 착용했습니다'); AU.sfx('pop', p); return true; },
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
