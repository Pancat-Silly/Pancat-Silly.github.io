// ===================== 창찬 (bilcorner) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.bilcorner = { name: '창찬', icon: '📱', desc: '미완성 직업 · 스킬마다 팔로워↑ · 100명이면 자멸 · 50% 쉰팝 각성', kit: [['chang'], ['gather'], ['bdash'], ['squid'], ['drug']], wip: true };

Object.assign(ITEMS, {
  chang: { name: '창', icon: '💧', dmg: 4, spd: 1.6, chang: true, col: [.4, .75, 1], lore: '창찬 주무기 · 맞히면 주위에 "창!"' },
  gather: { name: '전원 집합', icon: '🕳️', use: 'skill', cd: 12, group: 'gather', cast: 'gather', lore: '7.5칸 안 적을 끌어모은 뒤 폭발(6)로 날려 보냄' },
  bdash: { name: '돌진', icon: '🏃', use: 'skill', cd: 5, group: 'bdash', cast: 'bdash', lore: '앞으로 10칸 돌진, 닿은 적에게 5 피해 + 약한 넉백' },
  squid: { name: '오징어튀김', icon: '🦑', use: 'skill', cd: 6, group: 'squid', cast: 'squid', lore: '체력 6 회복' },
  harder: { name: '더 세게', icon: '💢', use: 'skill', cd: 6, group: 'squid', cast: 'harder', lore: '쉰팝 전용 · 주위 4 피해 + 넉백, 힘 +1단계' },
  drug: { name: '약물 복용', icon: '💊', use: 'skill', cd: 15, group: 'drug', cast: 'drug', lore: '신속 III · 힘 I · 저항 II 6초' },
});

Object.assign(SK, {
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
});

BOT_JOB.bilcorner = (b, I, ai, t, dist, r, wantYaw) => {
  if (b.hp < b.maxHp() - 6) { botUse(b, 'squid'); botUse(b, 'harder'); } if (dist < 3.5) botUse(b, 'harder'); if (dist < 7) botUse(b, 'gather'); if (dist > 2.5 && dist < 7 && r < .3) botUse(b, 'bdash'); if (dist < 8 && r < .1) botUse(b, 'drug');
};
