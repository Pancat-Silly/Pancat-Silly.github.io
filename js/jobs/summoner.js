// ===================== 소환사 (summoner) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.summoner = { name: '소환사', icon: '🐕', desc: '미완성 직업 · 지팡이 + 개 2마리 / 송곳니(직선·원형)', kit: [['sstaff'], ['dogs'], ['fangl'], ['fangc']], wip: true };

Object.assign(ITEMS, {
  sstaff: { name: '소환사의 지팡이', icon: '🪄', dmg: 5, spd: 1.6, staff: true, col: [.55, .4, .75], lore: '소환사 전용 · 공격력 5 · 맞힌 적을 개가 우선 공격' },
  dogs: { name: '개 소환', icon: '🐕', use: 'skill', cd: 30, group: 'dogs', cast: 'dogs', lore: '개 2마리 소환 (10초) · 플레이어는 1.5초마다 물기 · 바로 옆에 거미가 있으면 거미 우선 (10 피해 · 0.5초마다)' },
  fangl: { name: '송곳니 (직선)', icon: '🦷', use: 'skill', cd: 6, group: 'fangl', cast: 'fangLine', lore: '가까운 적에게 유도되며 뻗는 12칸 송곳니 · 2초 유지 · 3 피해 + 구속 II·나약함 I 3초' },
  fangc: { name: '송곳니 (원형)', icon: '⭕', use: 'skill', cd: 6, group: 'fangc', cast: 'fangCircle', lore: '주위 반경 3칸 원형 · 1초 유지 · 3 피해 + 구속 II·나약함 I 3초' },
});

Object.assign(SK, {
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
});

BOT_JOB.summoner = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 16) botUse(b, 'dogs'); if (dist < 3) botUse(b, 'fangc'); else if (dist < 12 && r < .3) botUse(b, 'fangl');
};
