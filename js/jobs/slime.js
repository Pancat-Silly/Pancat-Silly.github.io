// ===================== 슬라임 (slime) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.slime = { name: '슬라임', icon: '🟦', desc: 'HP 연동 스케일형 · 최대 HP 20', kit: [['slime_axe'], ['cutter']], maxHp: 20 }; // no armor / shield (removed on request)

Object.assign(ITEMS, {
  slime_axe: { name: '돌 도끼', icon: '🪓', dmg: 7, spd: .8, axe: true, slime: true, col: [.55, .55, .55] },
  slime_shield: { name: '방패', icon: '🛡️', use: 'shield', col: [.6, .45, .3] },
  cutter: { name: '절단기', icon: '✂️', use: 'skill', cd: .5, group: 'cutter', cast: 'cutter', lore: '주변 슬라임볼 드롭 + 1 피해(자신 포함)' },
  slimeball: { name: '슬라임볼', icon: '🟢', use: 'skill', cd: .5, group: 'slime', cast: 'slimeball', consume: true, stack: true, lore: 'HP 반 칸(1) 회복 + 저항 I 2.5초' },
});

Object.assign(SK, {
  cutter(p) {
    p.addEff('speed', 0, 3);
    for (const t of G.targets()) if (dist3(t, p) <= 3) G.spawnDrop(t.x, t.y + 1, t.z, p);
    for (const t of G.targets()) if (dist3(t, p) <= 4) { if (t === p) p.hurt(1, { type: 'explosion', nokb: true, exact: true }); else G.damage(t, 1, { type: 'explosion', by: p.id, nokb: true }); }
    AU.sfx('splat', p); G.fx('slime', p.x, p.y + 1, p.z); return true;
  },
  slimeball(p) { p.heal(1); p.addEff('resistance', 0, 2.5); G.particles('heart', p.x, p.y + p.h, p.z); AU.sfx('eat', p); return true; },
});

BOT_JOB.slime = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 3.5 && r < .3) botUse(b, 'cutter'); if (b.hp < 30) botUse(b, 'slimeball');
};
