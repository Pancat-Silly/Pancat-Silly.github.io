// ===================== 비글 (viggle) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.viggle = { name: '비글', icon: '🚀', desc: '파괴형 · 철거 해머 + 드론 / 다 부셔버려 / 360도 회전', kit: [['hammer'], ['drone'], ['destroy'], ['spinpot']] };

Object.assign(ITEMS, {
  hammer: { name: '철거 해머', icon: '🔨', dmg: 7, spd: 1.2, kb: 1, hammer: true, col: [.75, .2, .15], lore: '비글 전용 · 공격력 7 · 밀치기 I' },
  drone: { name: '드론', icon: '🚀', use: 'skill', cd: 6.5, group: 'drone', cast: 'drone', lore: '솟구치며 주변 4칸 6 피해' },
  destroy: { name: '다 부셔버려', icon: '💥', use: 'skill', cd: 1, group: 'destroy', cast: 'destroy', lore: '정면 9×41×23 구역 파괴(구역 안 적 6 피해) 후 복구' },
  spinpot: { name: '360도 회전', icon: '💫', use: 'skill', cd: 15, group: 'spinpot', cast: 'spinArm', lore: '다음 드론 최고점에서 0.5초 360° 회전, 방향이 바뀔 때마다 앞뒤 아래로 피해 포션(6) 투척' },
});

Object.assign(SK, {
  drone(p) {
    p.vy = 1.5; p.onGround = false; p.st.noFall = true; p.fallDist = 0; p.st.droneUp = true;
    for (const t of otherTargets(p, 4)) G.damage(t, 6, { type: 'explosion', by: p.id, nokb: true });
    G.fx('explosion', p.x, p.y + .5, p.z); G.sound('thisdrone', p); G.sound('explode_', p); return true;
  },
  spinArm(p) { p.st.spinArmed = true; p.actionbar('§d360도 회전 활성화됨'); AU.sfx('drink', p, .6); return true; },
  // at the drone's apex: small hop, 360 degrees in 0.5s, splash damage potions to the front (start) and back (half-turn)
  spinStart(p) {
    p.st.spinArmed = false; p.vy = 0.3; p.st.noFall = true; p.st.spin = { t: 0 };
    G.sound('360degreespin', p); SK.throwPotion(p);
  },
  // 10 steps of 36 degrees; every step throws one potion forward and one backward
  spinTick(p) {
    const s = p.st.spin; s.t++; p.yaw += Math.PI * 2 / 10;
    if (s.t < 10) SK.throwPotion(p); else p.st.spin = null;
  },
  throwPotion(p) {
    const o = { x: p.x, y: p.y + p.eye * .5, z: p.z };
    for (const a of [0, Math.PI]) G.spawnArrow(p, o, lookVec(p.yaw + a, 65 * D2R), 0.35, { potion: true });
    AU.sfx('bow', p, .5, .7);
  },
  destroy(p) {
    if (G.tick < (p.st.destroyUntil || 0)) { p.actionbar('§c아직 복구 중입니다'); return false; }
    const di = ((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4; p.yaw = di * Math.PI / 2;
    G.emitAndApply({ k: 'vig', x: Math.floor(p.x), y: Math.floor(p.y + .1), z: Math.floor(p.z), d: di, by: p.id });
    p.st.destroyUntil = G.tick + 120 + VIG_N; G.sound('destroyall2b', p, 20, .75); return true;
  },
});

BOT_JOB.viggle = (b, I, ai, t, dist, r, wantYaw) => {
  botUse(b, 'spinpot');
  if (dist < 4 || (b.st.spinArmed && dist < 9)) botUse(b, 'drone');
  if (dist < 13 && dist > 3 && Math.abs(wrapA(wantYaw - Math.round(wantYaw / (Math.PI / 2)) * Math.PI / 2)) < .25) botUse(b, 'destroy');
};
