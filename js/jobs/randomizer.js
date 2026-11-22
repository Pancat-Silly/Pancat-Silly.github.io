// ===================== 랜더마이져 (randomizer) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.randomizer = { name: '랜더마이져', icon: '🎲', desc: '랜덤형 · 철 검 + 활 + 럭키 박스', kit: [['iron_sword'], ['bow'], ['luckybox']] };

Object.assign(ITEMS, {
  luckybox: { name: '럭키 박스', icon: '🎲', use: 'skill', cd: 5, group: 'lucky', cast: 'lucky', lore: '8칸 중 하나 랜덤' },
  baghak: { name: '백학 개인정보', icon: '🗺️', use: 'skill', cd: 1, group: 'baghak', cast: 'baghak', consume: true, stack: true, lore: '신속 III·힘 II·저항 II + 적 1명 발광' },
  pot_res: { name: '즉시 적용 저항포션', icon: '🧪', use: 'skill', cd: 5, group: 'pot_res', cast: 'pot_res', consume: true, stack: true, lore: '저항 II 5초' },
  pot_spd: { name: '즉시 적용 신속포션', icon: '🧪', use: 'skill', cd: 5, group: 'pot_spd', cast: 'pot_spd', consume: true, stack: true, lore: '신속 II 5초' },
});

Object.assign(SK, {
  lucky(p) {
    let r = randi(0, 7); if (r === 6 && p.gotShield) r = choice([0, 1, 2, 3, 4, 5, 7]); let msg;
    if (r <= 1) { p.addItem('baghak', 1); msg = '백학 개인정보'; }
    else if (r <= 3) { p.addItem('arrow', 5); msg = '화살 5개'; }
    else if (r === 4) { p.addItem('pot_res', 1); msg = '즉시 적용 저항포션'; }
    else if (r === 5) { p.addItem('pot_spd', 1); msg = '즉시 적용 신속포션'; }
    else if (r === 6) { if (!p.addItem('shield', 1)) msg = null; else { p.gotShield = true; const s = p.off && p.off.id === 'shield' ? p.off : null; if (s) { s.dur = 25; s.max = 25; } msg = '방패 (내구도 25)'; } }
    else { const ex = p.inv.find(s => s && s.id === 'dia_sword'); if (ex) ex.count++; else if (p.addItem('dia_sword', 1)) { const s = p.inv.find(s => s && s.id === 'dia_sword'); s.dur = 5; s.max = 5; } msg = '다이아몬드 검 (내구도 5)'; }
    if (msg) p.msg('§6[럭키 박스] §f' + msg + ' 획득!');
    G.sound('whatforme', p, 'rnd');
    return true;
  },
  baghak(p) {
    p.addEff('speed', 2, 5); p.addEff('strength', 1, 10); p.addEff('resistance', 1, 10);
    const c = otherPlayers(p, 25); if (c.length) G.applyFx(choice(c), [['glowing', 0, 10]]);
    G.stopSound('whatforme'); G.sound('baghakpersonalinformation', null); AU.sfx('eat', p); return true;
  },
  pot_res(p) { p.addEff('resistance', 1, 5); AU.sfx('drink', p); return true; },
  pot_spd(p) { p.addEff('speed', 1, 5); AU.sfx('drink', p); return true; },
});

BOT_JOB.randomizer = (b, I, ai, t, dist, r, wantYaw) => {
  botUse(b, 'luckybox'); if (b.hp < 12) { botUse(b, 'pot_res'); botUse(b, 'baghak'); } if (dist < 8) botUse(b, 'pot_spd');
  if (dist > 7 && dist < 30 && b.count('arrow') > 0) { const bi = b.inv.findIndex(s => s && s.id === 'bow'); if (bi >= 0) { b.sel = bi; I.use = true; b.pitch -= dist * .01; if (b.drawT >= 20) I.use = false; } }
  else if (b.drawT > 0) I.use = false;
};
