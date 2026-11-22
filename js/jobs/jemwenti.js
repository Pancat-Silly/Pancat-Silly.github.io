// ===================== 젬웬티 (jemwenti) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 이벤트 → JOB_HOOK · 봇 행동 → BOT_JOB
// 개발 도구 결과물(tools/modjobs_done/jemwenti/)을 게임 코드로 옮긴 것. 동작은 결과물 코드와 같다
JOBS.jemwenti = { name: '젬웬티', icon: '👻', desc: '미완성 직업 · 원거리 마법형 · 그림자 표식 + 벡스 소환', kit: [['jw_staff'], ['jw_shadow'], ['jw_blast'], ['jw_barrier'], ['jw_ult']], maxHp: 20, wip: true };

Object.assign(ITEMS, {
  jw_staff: { name: '강령술사의 지팡이', icon: '🪄', dmg: 5, spd: 1.6, sword: true, col: [.75, .75, .8], lore: '벡스가 있는 동안 맞힌 적에게 추가타' },
  jw_shadow: { name: '마법 그림자', icon: '🌑', use: 'skill', cd: 5, group: 'jw_shadow', cast: 'jwShadow', lore: '직선 그림자 마법 2 피해 · 맞은 적에게 표식 +1 · 맞히면 쿨타임 2초 감소 · 사용 시 내 디버프 제거' },
  jw_blast: { name: '그림자 폭발', icon: '💥', use: 'skill', cd: 12, group: 'jw_blast', cast: 'jwBlast', lore: '표식이 있는 모든 적에게 3초 뒤 폭발 6 피해 · 표식 5개가 쌓인 적은 처형 · 표식 수만큼 힘 레벨 5초 · 표식 소모' },
  jw_barrier: { name: '그림자 방벽', icon: '🛡️', use: 'skill', cd: 20, group: 'jw_barrier', cast: 'jwBarrier', lore: '6초 동안 다음 1회 피해 무효 · 막은 피해의 50%를 공격자에게 반사' },
  jw_ult: { name: '유령님 한턴해요', icon: '👻', use: 'skill', cd: 45, group: 'jw_ult', cast: 'jwUlt', lore: '하늘을 날고 벽을 통과하는 벡스 3마리 소환 15초 · 받는 피해 50% 대신 맞음 · 내 공격마다 추가타 3' },
});
Object.assign(ITEM_ART, {
  jw_staff: { l: [['item/bone']], h: 1 }, jw_shadow: { l: [['item/echo_shard']] }, jw_blast: { l: [['item/nether_star']] }, jw_barrier: { l: [['item/phantom_membrane']] }, jw_ult: { l: [['item/ghast_tear']] },
});

Object.assign(SK, {
  JW_SKILLS: ['jw_shadow', 'jw_blast', 'jw_barrier', 'jw_ult'], JW_VEX_N: 3, JW_MAX_MARK: 5, JW_MARK_T: 300, // 벡스 수 · 적 한 명당 표식 최대 · 표식 지속 15초
  JW_VEX: [.6, .8, 1], JW_PURPLE: [.5, .1, .8],
  jwVexOn(p) { const v = p.st.vex; return !!v && G.tick < v.until && v.hp > 0; },
  // 벡스 위치: 내 머리 위를 날아다님 (블록과 상관없이 떠다니는 입자)
  jwVexPos(p, i, now) { const a = now * .12 + i * (Math.PI * 2 / SK.JW_VEX_N); return { x: p.x + Math.cos(a) * 1.6, y: p.y + 2.6 + Math.sin(now * .2 + i * 2) * .3, z: p.z + Math.sin(a) * 1.6 }; },
  // 벡스 추가타: 벽을 통과해 날아가서 0.5초 뒤 방어 무시 3 피해 + 내 체력 1 회복 (무적 시간 때문에 바로 주면 무시되므로 10틱 늦춤)
  jwVexStrike(p, t) {
    if (!SK.jwVexOn(p)) return; const v = p.st.vex; v.next = ((v.next || 0) + 1) % SK.JW_VEX_N;
    SK.srLine(SK.jwVexPos(p, v.next, G.tick), { x: t.x, y: t.y + 1.2, z: t.z }, SK.JW_VEX, .5);
    G.after(10, () => { if (!p.alive || !t || t.hp <= 0) return; SK.deal(t, 3, p, 'magic'); p.heal(1); G.particles('dust', t.x, t.y + 1, t.z, 4, SK.JW_VEX); });
  },
  // 마법 그림자에 맞은 적에게 표식 +1
  jwMark(p, t) {
    if (!t || t.kind === 'mob' || t.id === undefined) return; const st = p.st; st.marks = st.marks || {};
    const m = st.marks[t.id] || { t, n: 0, until: 0 }; m.t = t; m.n = Math.min(SK.JW_MAX_MARK, m.n + 1); m.until = G.tick + SK.JW_MARK_T; st.marks[t.id] = m;
    G.particles('dust', t.x, t.y + 2.3, t.z, 4 + m.n * 2, SK.JW_PURPLE); p.actionbar && p.actionbar('§5표식 §f' + m.n + '/' + SK.JW_MAX_MARK + ' §7(' + (t.name || '적') + ')');
  },
  jwVexDown(p) { p.heal(5); p.st.vex = null; G.particles('dust', p.x, p.y + 2.6, p.z, 12, SK.JW_VEX); p.actionbar && p.actionbar('§b벡스가 쓰러졌다 §a체력 +5'); },
  // 마법 그림자: 직선 투사체 2 피해, 맞히면 표식 +1 · 쿨타임 -2초 · 벡스 추가타. 쓸 때 내 디버프 제거
  jwShadow(p) {
    for (const n of ['slowness', 'weakness', 'poison', 'glowing']) p.clearEff(n);
    AU.synth({ wave: 'sawtooth', freq: 420, to: 140, dur: .25, vol: .4 }, p);
    SK.bolt(p, { speed: 1.3, gravity: 0, size: .35, life: 60, damage: 2, type: 'magic', kb: .3, color: [.45, .1, .7], trail: 3,
      onHit(t, pos) { G.particles('dust', pos.x, pos.y, pos.z, 8, [.45, .1, .7]); p.setCd('jw_shadow', Math.max(0, p.cdLeft('jw_shadow') / 20 - 2)); SK.jwMark(p, t); SK.jwVexStrike(p, t); } });
    return true;
  },
  // 그림자 폭발: 표식이 있는 적마다 3초 뒤 폭발 6 (표식 5개면 처형), 표식 수만큼 힘 5초, 표식 소모
  jwBlast(p) {
    const now = G.tick, list = Object.values(p.st.marks || {}).filter(m => m.t && m.t.hp > 0 && now <= m.until && m.n > 0);
    if (!list.length) { p.actionbar && p.actionbar('§7표식이 있는 적이 없습니다'); return false; }
    let total = 0; for (const m of list) total += m.n; const lv = Math.min(SK.JW_MAX_MARK, total);
    p.addEff('strength', lv - 1, 5); p.st.marks = {};
    AU.synth({ wave: 'sine', freq: 200, to: 90, dur: .4, vol: .5 }, p); SK.title(p, '§5그림자 폭발', '§f힘 ' + lv + ' · 표식 ' + total + '개');
    for (const m of list) {
      const t = m.t; let lx = t.x, lz = t.z;
      if (t.kind !== 'mob') SK.effOn(t, 'glowing', 0, 3);
      SK.srRing(t.x, t.y + .1, t.z, 3, SK.JW_PURPLE, 24);
      for (let i = 10; i < 60; i += 10) G.after(i, () => { if (t.hp <= 0) return; lx = t.x; lz = t.z; SK.srRing(t.x, t.y + .1, t.z, 3, SK.JW_PURPLE, 24); G.particles('dust', t.x, t.y + 2.2, t.z, 3, SK.JW_PURPLE); });
      G.after(60, () => {
        if (!p.alive || t.hp <= 0) return; if (Math.hypot(t.x - lx, t.z - lz) > 8) return; // 죽어서 멀리 부활했으면 취소
        if (m.n >= SK.JW_MAX_MARK) { G.particles('dust', t.x, t.y + 1.2, t.z, 30, [.35, 0, .5]); SK.srRing(t.x, t.y + .1, t.z, 1.5, [.8, .1, .9], 30); p.actionbar && p.actionbar('§5§l처형! §f' + (t.name || '적')); SK.deal(t, 1000, p, 'magic'); }
        const hit = SK.blast(p, t.x, t.y + .5, t.z, 3, 6, .8, false); G.particles('dust', t.x, t.y + 1, t.z, 12, SK.JW_PURPLE);
        for (const e of hit) SK.jwVexStrike(p, e);
      });
    }
    return true;
  },
  jwBarrier(p) {
    p.st.barrier = { until: G.tick + 120 }; G.sound('shield_', p, 20, .8);
    SK.srRing(p.x, p.y + .1, p.z, 1.5, [.4, .1, .6], 20); G.particles('dust', p.x, p.y + 1, p.z, 10, [.4, .1, .6]); p.actionbar && p.actionbar('§5그림자 방벽 §f발동 §7(6초)');
    return true;
  },
  jwUlt(p) {
    const now = G.tick; p.st.vex = { since: now, until: now + 300, hp: 40, next: 0 };
    AU.synth({ wave: 'sine', freq: 300, to: 120, dur: .6, vol: .5 }, p); SK.srRing(p.x, p.y + .1, p.z, 2, SK.JW_VEX, 24);
    for (let i = 0; i < SK.JW_VEX_N; i++) { const q = SK.jwVexPos(p, i, now); G.particles('dust', q.x, q.y, q.z, 8, SK.JW_VEX); }
    SK.title(p, '§b유령님 한턴해요!', '§7벡스 ' + SK.JW_VEX_N + '마리 소환');
    return true;
  },
});

JOB_HOOK.jemwenti = {
  tick(p) {
    const st = p.st, now = G.tick;
    const v = st.vex; // 벡스: 입자로 날아다님 / 초당 체력 회복 / 지속시간
    if (v) {
      if (now >= v.until) { st.vex = null; p.actionbar && p.actionbar('§7벡스가 사라졌습니다'); }
      else { if (now % 20 === 0) v.hp = Math.min(40, v.hp + 1); if (now % 2 === 0) for (let i = 0; i < SK.JW_VEX_N; i++) { const q = SK.jwVexPos(p, i, now); G.particles('dust', q.x, q.y, q.z, 2, SK.JW_VEX); if (now % 6 === 0) G.fx('glow', q.x, q.y, q.z); } }
    }
    if (st.marks) for (const id of Object.keys(st.marks)) { // 표식: 지속시간 / 머리 위 표시
      const m = st.marks[id]; if (!m.t || m.t.hp <= 0 || now > m.until) { delete st.marks[id]; continue; }
      if (now % 10 === 0) G.particles('dust', m.t.x, m.t.y + 2.3, m.t.z, m.n * 2, SK.JW_PURPLE);
    }
    const b = st.barrier; // 그림자 방벽
    if (b) { if (now > b.until) { st.barrier = null; p.actionbar && p.actionbar('§7그림자 방벽이 사라졌습니다'); } else if (now % 6 === 0) G.particles('dust', p.x, p.y + 1, p.z, 5, [.4, .1, .6]); }
  },
  hit(p, t) { SK.jwVexStrike(p, t); }, // 벡스가 있으면 추가타
  hurt(p, amount, src) {
    if (!p.alive || p.hp <= 0) return; if (!src || src.by == null || src.by === p.id) return; // 환경 · 자해 피해는 제외
    const b = p.st.barrier; // 그림자 방벽: 다음 1회 피해 무효 + 50% 반사
    if (b && G.tick <= b.until) {
      p.heal(amount); p.st.barrier = null;
      const att = G.players().find(q => q.id === src.by && q.alive && !q.spectator); if (att) SK.deal(att, amount * .5, p, 'magic');
      G.sound('shieldbreak_', p, 20, .7); G.particles('dust', p.x, p.y + 1, p.z, 12, [.4, .1, .6]); p.actionbar && p.actionbar('§5그림자 방벽 §f반사!');
      return;
    }
    if (SK.jwVexOn(p)) { const half = amount * .5; p.heal(half); p.st.vex.hp -= half; G.particles('dust', p.x, p.y + 2.6, p.z, 6, SK.JW_VEX); if (p.st.vex.hp <= 0) SK.jwVexDown(p); } // 벡스가 받는 피해의 50%를 대신 맞음 (공유 체력 40)
  },
  // 특성: 처치하면 영혼 폭발(5칸 3 피해) + 모든 스킬 쿨타임 2초 감소
  kill(p, victim, pos) {
    pos = pos || victim || p; if (victim && p.st.marks) delete p.st.marks[victim.id];
    for (const t of SK.near(p, pos.x, pos.y, pos.z, 5)) { SK.deal(t, 3, p, 'magic'); G.particles('dust', t.x, t.y + 1, t.z, 6, [.5, .2, .8]); }
    SK.srRing(pos.x, pos.y + .1, pos.z, 5, [.5, .2, .8], 32); G.particles('dust', pos.x, pos.y + 1, pos.z, 16, [.5, .2, .8]);
    AU.synth({ wave: 'triangle', freq: 500, to: 150, dur: .4, vol: .4 }, p);
    for (const id of SK.JW_SKILLS) { const c = p.cdLeft(id) / 20; if (c > 0) p.setCd(id, Math.max(0, c - 2)); }
    p.actionbar && p.actionbar('§d영혼 폭발! §7쿨타임 -2초');
  },
  respawn(p) { p.actionbar && p.actionbar('§b젬웬티 §7- 이세계에서도 강령술은 통한다'); },
};

BOT_JOB.jemwenti = (b, I, ai, t, dist) => {
  if (dist < 30) botUse(b, 'jw_shadow'); if (dist < 35) botUse(b, 'jw_blast'); if (dist < 12) botUse(b, 'jw_ult'); if (b.hp < 12) botUse(b, 'jw_barrier');
};
