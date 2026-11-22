// ===================== 윤톰맨 (yuntomman) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 이벤트 → JOB_HOOK · 봇 행동 → BOT_JOB
// 개발 도구 결과물(tools/modjobs_done/yuntomman/)을 게임 코드로 옮긴 것. 동작은 결과물 코드와 같다
JOBS.yuntomman = { name: '윤톰맨', icon: '💣', desc: '미완성 직업 · 자폭형 · 폭발 + 폭탄 설치 + 30초 자폭', kit: [['yt_blast'], ['yt_surprise'], ['yt_bomb'], ['yt_ult']], maxHp: 15, speedMul: 1.1, wip: true };
SOUNDS['윤톰맨'] = 'sounds/jobs/yuntomman/윤톰맨.mp3'; // 사용자가 보낸 효과음 (모든 능력에 씀)

Object.assign(ITEMS, {
  yt_blast: { name: '폭발', icon: '💥', dmg: 1, spd: .6, sword: true, col: [.75, .75, .8], lore: '잃은 체력이 많을수록 강해짐 (3 + 잃은 체력×0.8, 최대 12) · 나에게 4 피해 · 공격 시 자폭 시간 +1초' },
  yt_surprise: { name: '서프라이즈', icon: '🎁', use: 'skill', cd: 12, group: 'yt_surprise', cast: 'ytSurprise', lore: '40칸 안의 모든 적에게 방어 무시 3 마법 피해 + 위치 표시 · 적중 시 자폭 시간 +1초' },
  yt_bomb: { name: '폭탄 설치', icon: '🧨', use: 'skill', cd: 20, group: 'yt_bomb', cast: 'ytBomb', lore: '나에게 3 피해 · 내 모든 능력 피해 영구 +30% (최대 3중첩 · 사망 시 사라짐)' },
  yt_ult: { name: '윤톰맨!', icon: '🦞', use: 'skill', cd: 45, group: 'yt_ult', cast: 'ytUlt', lore: '자폭 시간 10초로 단축 · 적에게 돌격 (가까워질수록 이속 증가) · 닿으면 최대체력 40% 피해 · 체력 50% 미만이면 즉시 처치 · 이후 나도 사망' },
});
Object.assign(ITEM_ART, {
  yt_blast: { cube: ['block/tnt_side', 'block/tnt_top'] }, yt_surprise: { l: [['item/firework_rocket']] }, yt_bomb: { l: [['item/gunpowder']] }, yt_ult: { l: [['item/fire_charge']] },
});

Object.assign(SK, {
  YT_BOOM_T: 600, YT_INV_T: 60, YT_CHASE_T: 200, // 자폭까지 30초 · 자폭 3초 전부터 무적 · 윤톰맨! 사용 시 자폭 시간 10초
  ytMult(p) { return 1 + .3 * ((p.st && p.st.bombs) || 0); }, // 폭탄 설치 중첩: 피해 +30% × 중첩
  ytSnd(p) { G.sound('윤톰맨', p, 30, 1); },
  ytSelfHurt(p, n) { const a = Math.min(n, p.hp - 1); if (a > 0) SK.deal(p, a, p, 'magic'); }, // 체력 1 아래로는 안 내려감
  // 스스로 죽기 전에 무적(저항)을 풀고 죽는다
  ytDie(p) { const st = p.st; st.dying = true; st.inv = false; st.chase = null; p.clearEff('resistance'); p.clearEff('speed'); SK.deal(p, 999, p, 'magic'); },
  ytBoom(p) {
    const st = p.st; st.dying = true; st.boomAt = G.tick + 99999; // 중복 폭발 방지
    SK.ytSnd(p); SK.srRing(p.x, p.y + .1, p.z, 12, [1, .4, .1], 48); SK.srRing(p.x, p.y + 1.5, p.z, 12, [1, .2, .1], 48); G.fx('explosion', p.x, p.y + 1, p.z);
    SK.blast(p, p.x, p.y + .5, p.z, 12, 10 * SK.ytMult(p), 1.5, false);
    SK.title(p, '§c자폭!', '§7윤톰맨은 오늘도 일했다'); SK.ytDie(p);
  },
  // 윤톰맨! 돌격이 적에게 닿았을 때: 체력 50% 미만이면 즉시 처치, 아니면 최대 체력 40% 피해, 0.3초 뒤 나도 사망
  ytChaseHit(p, t) {
    const st = p.st; st.dying = true; st.inv = false; st.chase = null; p.clearEff('speed'); p.clearEff('resistance');
    const maxH = SK.maxHpOf(t); if (t.hp / maxH < .5) SK.deal(t, t.hp + 100, p, 'magic'); else SK.deal(t, maxH * .4 * SK.ytMult(p), p, 'melee', 1);
    G.fx('explosion', t.x, t.y + 1, t.z); G.fx('flame', t.x, t.y + 1, t.z); SK.ytSnd(p);
    G.after(6, () => { if (p.alive) { p.clearEff('resistance'); SK.deal(p, 999, p, 'magic'); } });
  },
  ytSurprise(p) {
    const list = otherTargets(p, 40); if (!list.length) { p.actionbar && p.actionbar('§7주변에 적이 없습니다'); return false; }
    SK.ytSnd(p); const dmg = 3 * SK.ytMult(p); let hitPlayer = false;
    for (const t of list) { SK.deal(t, dmg, p, 'magic'); if (t.kind !== 'mob') { SK.effOn(t, 'glowing', 0, 2); hitPlayer = true; } G.fx('explosion', t.x, t.y + 1, t.z); G.fx('crit', t.x, t.y + 1.5, t.z); }
    if (hitPlayer && p.st.boomAt !== undefined) p.st.boomAt += 20; // 공격 시 자폭 +1초
    SK.title(p, '§e서프라이즈!', ''); return true;
  },
  ytBomb(p) {
    const n = p.st.bombs || 0;
    if (n >= 3) { p.actionbar && p.actionbar('§7폭탄 설치는 최대 3중첩입니다'); return false; }
    if (p.hp <= 3) { p.actionbar && p.actionbar('§c체력이 부족해서 설치할 수 없습니다'); return false; }
    SK.ytSnd(p); SK.deal(p, 3, p, 'magic'); p.st.bombs = n + 1; G.fx('flame', p.x, p.y + 1, p.z); G.fx('poof', p.x, p.y + .5, p.z);
    p.actionbar && p.actionbar('§c폭탄 설치! §f피해량 +' + (p.st.bombs * 30) + '% §7(' + p.st.bombs + '/3)'); return true;
  },
  ytUlt(p) {
    const t = SK.aimTarget(p, 30) || nearestOf(p, otherTargets(p, 30)); if (!t) { p.actionbar && p.actionbar('§7대상이 없습니다'); return false; }
    const now = G.tick; SK.ytSnd(p);
    p.st.boomAt = Math.min(p.st.boomAt === undefined ? now + SK.YT_CHASE_T : p.st.boomAt, now + SK.YT_CHASE_T); // 자폭 시간을 10초로 (이미 더 짧으면 그대로)
    p.st.chase = { t, until: now + SK.YT_CHASE_T };
    SK.srLine({ x: p.x, y: p.y + 1, z: p.z }, { x: t.x, y: t.y + 1, z: t.z }, [1, .4, .1], .4);
    const d = lookVec(p.yaw, 0); p.vx += d.x; p.vy += .2; p.vz += d.z; p.onGround = false; p.fallDist = 0; // 앞으로 돌진
    SK.title(p, '§c윤톰맨!', '§710초 안에 닿아라'); return true;
  },
});

JOB_HOOK.yuntomman = {
  // 특성: 자폭 타이머 + 3초 전 무적 + 윤톰맨! 돌격
  tick(p) {
    const st = p.st, now = G.tick; if (st.dying) return;
    if (st.boomAt === undefined) st.boomAt = now + SK.YT_BOOM_T;
    const c = st.chase; // 윤톰맨! 돌격: 가까워질수록 이동 속도 증가
    if (c) {
      const t = c.t, d = t ? dist3(p, t) : 999;
      if (!t || t.hp <= 0 || t.alive === false || now > c.until || d > 45) { st.chase = null; p.clearEff('speed'); }
      else { const lv = d > 20 ? 1 : d > 14 ? 2 : d > 9 ? 3 : d > 5 ? 4 : 5; if (now % 4 === 0) p.addEff('speed', lv - 1, 1); if (now % 2 === 0) G.fx('flame', p.x, p.y + .4, p.z); if (d <= 2.5) { SK.ytChaseHit(p, t); return; } }
    }
    const left = st.boomAt - now; if (left <= 0) { SK.ytBoom(p); return; }
    if (left <= SK.YT_INV_T) { // 자폭 3초 전부터 무적
      if (!st.inv) { st.inv = true; p.addEff('resistance', 4, 1); SK.title(p, '§6무적!', '§c곧 폭발합니다'); } else if (now % 4 === 0) p.addEff('resistance', 4, 1);
      if (now % 4 === 0) G.fx('totem', p.x, p.y + 1, p.z);
    } else if (st.inv) { st.inv = false; p.clearEff('resistance'); } // 공격으로 시간이 늘어 3초 밖으로 나가면 무적 해제
    if (now % 10 === 0) { const sec = Math.ceil(left / 20); p.actionbar && p.actionbar((sec <= 5 ? '§c' : '§e') + '자폭까지 §f' + sec + '초' + (st.inv ? ' §6[무적]' : '') + (st.bombs ? ' §7| §c폭탄 ' + st.bombs + '/3' : '')); }
    if (left <= 100 && left % 20 === 0) { AU.synth({ wave: 'square', freq: 880, dur: .08, vol: .4 }, p); SK.srRing(p.x, p.y + .1, p.z, 2, [1, .2, .1], 16); }
  },
  // 기본 무기: 잃은 체력이 많을수록 강해짐 (3 + 잃은 체력 × 0.8, 최대 12) + 자해 4 + 자폭 시간 +1초
  hit(p, t) {
    const now = G.tick; if (p.st.lastBlast !== undefined && now - p.st.lastBlast < 30) return; p.st.lastBlast = now; // 공속 0.6 근사
    const lost = Math.max(0, p.maxHp() - p.hp), dmg = Math.min(12, 3 + lost * .8) * SK.ytMult(p);
    SK.ytSnd(p); SK.deal(t, dmg, p, 'melee', .5); G.fx('explosion', t.x, t.y + 1, t.z); if (lost >= 6) G.fx('flame', p.x, p.y + 1, p.z);
    if (t.kind !== 'mob' && p.st.boomAt !== undefined) p.st.boomAt += 20;
    SK.ytSelfHurt(p, 4);
  },
  // 패시브: 마학 2008 — 남은 체력 비율 × 50% 확률로 회피 / 무적 중에는 피해를 되돌림
  hurt(p, amount, src) {
    if (!p.alive || p.hp <= 0) return; if (src && src.by === p.id) return;
    if (p.st.inv && !p.st.dying) { p.heal(amount); return; }
    if (!src || src.by == null) return;
    const chance = clamp((p.hp + amount) / p.maxHp(), 0, 1) * 50;
    if (Math.random() * 100 < chance) { p.heal(amount); G.fx('poof', p.x, p.y + 1, p.z); G.fx('totem', p.x, p.y + 1.5, p.z); p.actionbar && p.actionbar('§b마학 2008 §f회피!'); AU.synth({ wave: 'sine', freq: 600, to: 1200, dur: .12, vol: .3 }, p); }
  },
  kill(p) { if (p.st.dying) return; p.st.boomAt = (p.st.boomAt || G.tick) + 200; p.actionbar && p.actionbar('§a처치! §f자폭 타이머 +10초'); }, // 적을 처치하면 자폭 타이머 +10초
  respawn(p) { p.st.boomAt = G.tick + SK.YT_BOOM_T; p.st.bombs = 0; p.actionbar && p.actionbar('§c윤톰맨 §7- 30초 뒤 자폭합니다'); },
};

BOT_JOB.yuntomman = (b, I, ai, t, dist) => {
  if (dist < 40) botUse(b, 'yt_surprise'); if ((b.st.bombs || 0) < 3 && b.hp > 9) botUse(b, 'yt_bomb'); if (dist < 15 && t.hp / SK.maxHpOf(t) < .5) botUse(b, 'yt_ult');
};
