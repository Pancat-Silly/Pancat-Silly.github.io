// ===================== dude (old) (dude) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.dude = { name: 'dude', icon: '🎣', desc: '미완성 직업 · 철퇴 + 낚시 크레이트', kit: [['mace'], ['rodwood']], maxHp: 40, wip: true, vars: [['dude_new', 'New'], ['dude', 'old']] };

Object.assign(ITEMS, {
  mace: { name: '철퇴(밀도 I)', icon: '🔨', dmg: 6, spd: .6, mace: true, col: [.45, .45, .5], lore: '낙하 공격 추가 피해' },
  rodwood: { name: '나무 낚싯대', icon: '🎣', use: 'skill', cd: 20, group: 'fishingrod', cast: 'fish', col: [.5, .35, .2] },
  crate: { name: '진주나무 크레이트', icon: '📦', use: 'skill', cd: 0, group: 'crate', cast: 'crate', consume: true, stack: true },
  pot_heal: { name: '소형 회복 포션', icon: '❤️', use: 'skill', cd: 20, group: 'hp_drink', cast: 'pot_heal', consume: true, stack: true, lore: '즉시 회복 (4)' },
  pot_turtle: { name: '철피부 포션', icon: '🐢', use: 'skill', cd: 10, group: 'pot_t', cast: 'pot_turtle', consume: true, lore: '구속 IV + 저항 III 20초' },
  pot_fire: { name: '흑요석 피부 포션', icon: '🔥', use: 'skill', cd: 10, group: 'pot_f', cast: 'pot_fire', consume: true, lore: '화염 저항 3분' },
  pot_swift: { name: '신속 포션', icon: '💨', use: 'skill', cd: 10, group: 'pot_s', cast: 'pot_swift', consume: true, lore: '신속 I 3분' },
  aglet: { name: '애글릿', icon: '🔗', aglet: true, lore: '들고 있으면 이동속도 +0.05' },
  boots: { name: '돛새치 부츠', icon: '👢', use: 'skill', cd: 0, group: 'boots', cast: 'equipboots', consume: true, lore: '착용: 이동속도 +0.1' },
  fish: { name: '물고기', icon: '🐟', stack: true },
});

Object.assign(SK, {
  maceBonus(fd) { let b = 0; b += 4 * Math.min(3, fd); if (fd > 3) b += 2 * Math.min(5, fd - 3); if (fd > 8) b += fd - 8; return b + 0.5 * fd; },
  maceSmash(p, tgt) {
    G.fx('explosion', tgt.x, tgt.y + .2, tgt.z); AU.sfx('smash', p);
    for (const t of G.targets()) if (t !== tgt && t.id !== p.id && dist3(t, tgt) < 3.5) { const dx = t.x - tgt.x, dz = t.z - tgt.z, l = Math.hypot(dx, dz) || 1; G.damage(t, 0.01, { type: 'melee', by: p.id, dx: dx / l, dz: dz / l, kbx: 1, fx: tgt.x, fz: tgt.z }); }
  },
  fish(p) {
    AU.sfx('reel', p); const f = choice(['생대구', '생대구', '생대구', '생연어', '생연어', '복어', '열대어']);
    p.msg('§b[낚시] §f' + f + '을(를) 낚았습니다');
    if (Math.random() < 0.33) { p.addItem('crate', 1); p.msg('§6진주나무 크레이트를 얻었습니다!'); AU.sfx('levelup', p); }
    return true;
  },
  crate(p) {
    const r = randi(0, 15); let m;
    if (r <= 10) { const n = 15 - r; p.addItem('pot_heal', n); m = '소형 회복 포션 ×' + n; }
    else if (r === 11) { p.addItem('pot_turtle'); m = '철피부 포션'; } else if (r === 12) { p.addItem('pot_fire'); m = '흑요석 피부 포션'; }
    else if (r === 13) { p.addItem('pot_swift'); m = '신속 포션'; } else if (r === 14) { p.addItem('aglet'); m = '애글릿'; } else { p.addItem('boots'); m = '돛새치 부츠'; }
    p.msg('§6[크레이트] §f' + m); AU.sfx('pop', p); return true;
  },
  pot_heal(p) { p.heal(4); AU.sfx('drink', p); G.fx('heart', p.x, p.y + 2, p.z); return true; },
  pot_turtle(p) { p.addEff('slowness', 3, 20); p.addEff('resistance', 2, 20); AU.sfx('drink', p); return true; },
  pot_fire(p) { p.addEff('fire_resistance', 0, 180); AU.sfx('drink', p); return true; },
  pot_swift(p) { p.addEff('speed', 0, 180); AU.sfx('drink', p); return true; },
  equipboots(p) { p.bootsBonus = 0.1; p.msg('§b돛새치 부츠를 착용했습니다'); AU.sfx('pop', p); return true; },
});

BOT_JOB.dude = (b, I, ai, t, dist, r, wantYaw) => {
  botUse(b, 'rodwood'); botUse(b, 'crate'); if (b.hp < 28) botUse(b, 'pot_heal'); botUse(b, 'boots'); if (r < .01) { botUse(b, 'pot_swift'); botUse(b, 'pot_turtle'); }
};
