// ===================== 얼빙 (ice_wizard) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.ice_wizard = { name: '얼빙', icon: '🧊', desc: '제어형 · 서리 검 + 얼음 감옥', kit: [['frost'], ['icejail']] };

Object.assign(ITEMS, {
  frost: { name: '서리 검', icon: '❄️', dmg: 6, spd: 1.6, sword: true, frost: true, col: [.6, .85, 1], lore: '얼빙 전용 · 공격력 6 · 완충 공격 시 구속 I 1초' },
  icejail: { name: '얼음 감옥', icon: '🧊', use: 'skill', cd: 10, group: 'ice', cast: 'icejail', lore: '15칸 내 가장 가까운 플레이어 가두기 · 감옥 안: 나는 힘 I, 적은 나약함 I' },
});

Object.assign(SK, {
  icejail(p) {
    AU.sfx('anvil', p, .8);
    const t = nearestOf(p, otherPlayers(p, 15)); if (!t) { p.actionbar('§715칸 안에 대상이 없습니다'); return true; }
    G.emitAndApply({ k: 'ice', x: Math.floor(t.x), y: Math.floor(t.y + .1), z: Math.floor(t.z), by: p.id });
    G.sound('anvil_', t);
    return true;
  },
});

BOT_JOB.ice_wizard = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 14) botUse(b, 'icejail');
};
