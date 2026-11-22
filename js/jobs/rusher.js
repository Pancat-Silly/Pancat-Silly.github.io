// ===================== 러셔 (rusher) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.rusher = { name: '러셔', icon: '⚡', desc: '돌진형 · 신속의 장화(이동속도 +30%) · 번개 자국', kit: [['breeze_rod'], ['rush'], ['rzone']], boots: 'dia', speedMul: 1.3, kbRes: -2, step: .4 };

Object.assign(ITEMS, {
  breeze_rod: { name: '바람 막대기', icon: '🌀', dmg: 1, spd: 4, sharp: 3, kb: 3, reach: .2, col: [.9, .85, .5], lore: '밀치기 III · 날카로움 III · 사거리 +20%' },
  rush: { name: '러셔', icon: '⚡', use: 'skill', cd: 10, group: 'rush', cast: 'rush', lore: '신속 X 1.5초' },
  rzone: { name: '번개 자국', icon: '🌩️', use: 'skill', cd: 14, group: 'rzone', cast: 'rzone', lore: '5초 동안 지나간 자리에 번개 자국을 남김 (자국 5초 유지) · 자국을 밟은 적은 구속 II + 1초마다 1 피해' },
});

Object.assign(SK, {
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
});

BOT_JOB.rusher = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist > 6 && dist < 25) botUse(b, 'rush'); if (dist < 10) botUse(b, 'rzone');
};
