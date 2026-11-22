// ===================== 그랩 (mefab3) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.mefab3 = { name: '그랩', icon: '⛓️', desc: '끌어오기형 · 웅크려 차징', kit: [['stick_mace'], ['grab'], ['grabex']] };

Object.assign(ITEMS, {
  stick_mace: { name: '철퇴', icon: '🔨', dmg: 6, spd: 1, kb: 2, col: [.4, .3, .2], lore: '날카로움 IX · 밀치기 II' },
  grab: { name: '그랩', icon: '⛓️', use: 'skill', cd: 5, group: 'grab', cast: 'grab', lore: '웅크려서 완충 후 사용' },
  grabex: { name: '그랩 폭발', icon: '🧨', use: 'skill', cd: 15, group: 'grabex', cast: 'grabex', lore: '다음 그랩 종료 시 폭발 6' },
});

Object.assign(SK, {
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
});

BOT_JOB.mefab3 = (b, I, ai, t, dist, r, wantYaw) => {
  if (b.cdLeft('grabex') === 0) botUse(b, 'grabex');
  if (!ai.sneak && dist > 4 && dist < 19 && b.cdLeft('grab') === 0 && ai.t - (ai.lastGrab || -999) > 200 && Math.random() < .04 && SK.canSee(b, t)) { ai.sneak = true; ai.lastGrab = ai.t; }
  if (ai.sneak) { I.sneak = true; I.sprint = false; if ((b.st.charge || 0) >= 23) { botUse(b, 'grab'); ai.sneak = false; I.sneak = false; } } else I.sneak = false;
};
