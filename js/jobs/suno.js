// ===================== 수노 (suno) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.suno = { name: '수노', icon: '💿', desc: '되감기형 · wait / 공부좀 하고옴', kit: [['create'], ['wait'], ['study']] };

Object.assign(ITEMS, {
  create: { name: 'create', icon: '🪓', dmg: 9, spd: .9, sharp: 2, kb: 1, axe: true, col: [.2, .2, .25], lore: '밀치기 I · 날카로움 II' },
  wait: { name: 'wait', icon: '💿', use: 'skill', cd: 8, group: 'wait', cast: 'wait', lore: '20칸 내 전원 1초 정지' },
  study: { name: '공부좀 하고옴', icon: '📀', use: 'skill', cd: 15, group: 'study', cast: 'study', lore: '1.6초 전 위치로 되감기' },
  v4: { name: '무료 V4 이용권', icon: '🎫', use: 'skill', cd: 3, group: 'v4', cast: 'v4', consume: true, stack: true, lore: '재생 V 1초 · 리스폰마다 3개로 충전' },
  runsuno: { name: '이제 수노 돌려라', icon: '📢', use: 'skill', cd: 0, group: 'runsuno', cast: 'runsuno', consume: true, lore: '모든 플레이어 발광 5초' },
});

Object.assign(SK, {
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
});

BOT_JOB.suno = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 10 && r < .3) botUse(b, 'wait'); if (b.hp < 8) botUse(b, 'study'); if (b.hp < b.maxHp() - 6) botUse(b, 'v4'); if (r < .005) botUse(b, 'runsuno');
};
