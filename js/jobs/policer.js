// ===================== 폴리셔 (policer) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.policer = { name: '폴리셔', icon: '🚓', desc: '경고 후 강화 · 철 갑옷 + 진압 방패', kit: [['baton']], off: 'riot_shield', armor: 'iron' };

Object.assign(ITEMS, {
  baton: { name: '진압봉', icon: '🏏', dmg: 6, spd: 2, use: 'skill', cd: 7, group: 'baton', cast: 'baton', step: .4, col: [.15, .15, .2], lore: '공격력 +5 · "경찰이 온다"' },
  riot_shield: { name: '진압 방패', icon: '🛡️', use: 'shield', kb: 1, col: [.6, .45, .3] },
});

Object.assign(SK, {
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
});

BOT_JOB.policer = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 10) botUse(b, 'baton');
};
