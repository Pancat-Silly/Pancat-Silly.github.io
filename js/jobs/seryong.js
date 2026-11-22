// ===================== 세룡이 (seryong) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.seryong = { name: '세룡이', icon: '🐷', desc: '미완성 직업 · 근접형 · 성진이 낙하 + 레이저 스턴 + 귀멸의 감옥', kit: [['sr_sword'], ['sr_pig'], ['sr_laser'], ['sr_domain']], wip: true };

Object.assign(ITEMS, {
  sr_sword: { name: '세명컴고 입학증', icon: '🗡️', dmg: 6, spd: 1.6, sword: true, col: [.8, .85, .95], lore: '킬을 딸 때마다 날카로움 +1 (이번 목숨 동안 중첩)' },
  sr_pig: { name: '성진이 소환', icon: '🐷', use: 'skill', cd: 7, group: 'sr_pig', cast: 'srPig', lore: '상대 위치 위에 성진이를 1초 띄운 뒤 떨굼 · 반경 1.6 피해 5 (바닥 표시를 보고 피할 수 있음)' },
  sr_laser: { name: '세명컴고가', icon: '🔴', use: 'skill', cd: 9, group: 'sr_laser', cast: 'srLaser', lore: '일직선 레이저(40칸) · 맞은 플레이어 3초 스턴' },
  sr_domain: { name: '귀멸의 세명컴고', icon: '🌀', use: 'skill', cd: 40, group: 'sr_domain', cast: 'srDomain', lore: '세명컴고가에 맞은 적에게 돌진 · 7초 탈출 불가 공간 · 재생 III + 힘 II · 공간 안 처치마다 최대 체력 +5' },
});

Object.assign(SK, {
  // 성진이 소환: a pig hovers 4 blocks above the target's spot for 1 s (warning ring), falls in 8 ticks, 5 magic in r 1.6.
  // Everyone sees it (event); each client resolves the landing for its own players / mobs (no ping error).
  srPig(p) {
    const t = SK.aimTarget(p, 30) || nearestOf(p, otherTargets(p, 20)); if (!t) { p.actionbar && p.actionbar('§7대상이 없습니다'); return false; }
    const gy = SK.fangY(t.x, t.y + 1, t.z); G.emitAndApply({ k: 'srpig', x: r1(t.x), y: r1(gy === null ? t.y : gy), z: r1(t.z), by: p.id, yaw: r1(Math.random() * 6.28) });
    G.sound('seryong1', p); return true;
  },
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
});

BOT_JOB.seryong = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 25) { botUse(b, 'sr_laser'); botUse(b, 'sr_pig'); } if (b.st.srStun && G.tick <= b.st.srStun.until) botUse(b, 'sr_domain');
};
