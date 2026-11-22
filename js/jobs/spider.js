// ===================== 스파이더 (spider) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.spider = { name: '스파이더', icon: '🕷️', desc: '소환형 · 사슬 갑옷 · 벽 타기', kit: [['colony'], ['egg']], armor: 'chain' };

Object.assign(ITEMS, {
  colony: { name: '군락', icon: '🕷️', use: 'skill', cd: 20, group: 'colony', cast: 'colony', lore: '거미 4마리 → 3.35초 뒤 동굴거미 13마리(약 3초)' },
  egg: { name: '알', icon: '🥚', use: 'skill', cd: 20, group: 'egg', cast: 'egg', lore: '큰 거미(HP 40) 소환 · 최대 6초 · 사라지면 작은 거미 13마리(약 4초)' },
});

Object.assign(SK, {
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
});

BOT_JOB.spider = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 14) botUse(b, 'colony'); if (dist < 8) botUse(b, 'egg');
};
