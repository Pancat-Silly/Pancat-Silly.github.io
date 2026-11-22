// ===================== 360 (360) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS['360'] = { name: '360', icon: '🎰', desc: '도박형 · 3/6/0', kit: [['xbow3'], ['rod6'], ['rod0'], null, null, null, null, null, ['arrow', 1]] };

Object.assign(ITEMS, {
  rod0: { digit: '0', name: '0', icon: '0️⃣', use: 'skill', cd: 100, group: 'rod0', cast: 'rod0', col: [.5, .35, .2], lore: '10% 가천대 합격 / 90% 예비 360번' },
  rod6: { digit: '6', name: '6', icon: '6️⃣', use: 'skill', cd: 6, group: 'rod6', cast: 'rod6', col: [.5, .35, .2], lore: '신속 V 1초 + 가장 가까운 대상 3 피해' },
  xbow3: { digit: '3', name: '3', icon: '3️⃣', use: 'crossbow', cd: 5, group: 'xbow3', col: [.45, .3, .2], lore: '다중 발사 · 착탄 시 폭발 8 피해' },
});

Object.assign(SK, {
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
});

BOT_JOB['360'] = (b, I, ai, t, dist, r, wantYaw) => {
  botUse(b, 'rod6'); if (r < .01) botUse(b, 'rod0');
  if (dist > 4 && dist < 22) { const sp = b.pitch; b.pitch = clamp(-Math.atan2(t.y - (b.y + b.eye), dist) - dist * .012, -1.2, 1.2); botUse(b, 'xbow3'); b.pitch = sp; }
};
