// ===================== 수수 (susu) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 이벤트 → JOB_HOOK · 봇 행동 → BOT_JOB
// 개발 도구 결과물(tools/modjobs_done/susu/)을 게임 코드로 옮긴 것. 동작은 결과물 코드와 같다
// 각도 게이지(p.st.angle, 0~180°): 능력마다 60° 소모 · 0°면 전투불능 5초 뒤 180°로 회복 · 각도가 낮을수록 받는 피해 감소
JOBS.susu = { name: '수수', icon: '🔺', desc: '미완성 직업 · 딜러형 · 삼각형 각도 게이지', kit: [['ss_shot'], ['ss_leap'], ['ss_half'], ['ss_ult']], maxHp: 20, wip: true };

Object.assign(ITEMS, {
  ss_shot: { name: '삼각형의 한 꼭짓점', icon: '▲', use: 'skill', cd: 3, group: 'ss_shot', cast: 'ssShot', lore: '각도 60° 소모 · 피해 6 (헤드샷 ×1.5) · 180° 레이저+폭발 / 120° 머리 유도 / 60° 직선' },
  ss_leap: { name: '삼각 도약', icon: '💠', use: 'skill', cd: 10, group: 'ss_leap', cast: 'ssLeap', lore: '각도 60° 소모 · 8칸 순간이동 · 180° 신속 2·재생 2·투명화 2 / 120° 신속 1 / 60° 사용 불가' },
  ss_half: { name: '절반 조각기', icon: '✂️', use: 'skill', cd: 15, group: 'ss_half', cast: 'ssHalf', lore: '현재 체력의 50%만큼 최대 체력 감소 (이번 목숨 동안) · 각도 180° 회복 (체력 6 이상 · 전투불능 중 사용 가능)' },
  ss_ult: { name: '일루미나티 파워', icon: '👁️', use: 'skill', cd: 20, group: 'ss_ult', cast: 'ssUlt', lore: '모든 각도 소모 · 즉시 전투불능 · 40칸 안 모든 적에게 피할 수 없는 4 피해 + 구속 II · 나는 재생 III 3초 · 맞은 인원당 최대 체력 +4' },
});
Object.assign(ITEM_ART, {
  ss_shot: { l: [['item/spectral_arrow']] }, ss_leap: { l: [['item/ender_pearl']] }, ss_half: { l: [['item/amethyst_shard']] }, ss_ult: { l: [['item/end_crystal']] },
});

Object.assign(SK, {
  SS_CYAN: [.2, .9, 1], SS_DOWN_T: 100, SS_LOCK_T: 60, // 전투불능 5초 · 부활 후 삼각형의 한 꼭짓점 불가 3초
  SS_BOLT_SPEED: 1.3, SS_BOLT_LIFE: 50, SS_HOMING_T: 10, SS_HOMING_R: 15, SS_HEAD_Y: 1.4, // 투사체 속도(틱당 칸) · 최대 비행 2.5초 · 120° 유도 0.5초 · 유도 반경 · 발에서 이 높이 이상이면 헤드샷
  ssNorm(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; },
  // 삼각형 모양 링 잔상 (선 3개)
  ssTri(x, y, z, r, col) { const pts = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * Math.PI * 2 / 3; return { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r }; }); return [0, 1, 2].map(i => { const a = pts[i], b = pts[(i + 1) % 3]; return ['l', a.x, a.y, a.z, b.x, b.y, b.z, col, .3]; }); }, // line ops for SK.vfx
  // 전투불능: 5초 · 이동 매우 느림 · 나약함 · 발광
  ssDown(p) {
    p.st.down = G.tick + SK.SS_DOWN_T; p.addEff('slowness', 4, 5); p.addEff('weakness', 2, 5); p.addEff('glowing', 0, 5);
    SK.title(p, '§c전투불능', '§7절반 조각기만 사용 가능 (5초)'); SK.np('dust', p.x, p.y + 1, p.z, 10, [.5, .5, .6]);
  },
  ssSync(p) { SK.jv(p, { a: Math.round(p.st.angle) }); }, // gauge orbs everyone sees (vis)
  ssUp(p) { p.st.down = null; p.clearEff('slowness'); p.clearEff('weakness'); p.clearEff('glowing'); },
  // 각도가 0°면 전투불능, 각도가 생기면 해제
  ssCheck(p) { const st = p.st, empty = st.angle <= 0; if (empty && !st.down) SK.ssDown(p); else if (!empty && st.down) { SK.ssUp(p); p.actionbar && p.actionbar('§b전투불능 해제'); } },
  // (x, y, z) 지점에 적이 있는지 (몸통 반경 0.65, 높이 -0.2 ~ 2.0)
  ssHitAt(p, x, y, z) { for (const t of SK.near(p, x, y, z, 2.5)) { const dy = y - t.y; if (dy < -.2 || dy > 2) continue; if (Math.hypot(x - t.x, z - t.z) > .65) continue; return { t, head: dy >= SK.SS_HEAD_Y }; } return null; },
  ssDeal(p, h, dmg) { // 헤드샷이면 피해 ×1.5
    const fin = h.head ? dmg * 1.5 : dmg; SK.deal(h.t, fin, p, 'melee', .3); SK.np('dust', h.t.x, h.t.y + 1, h.t.z, 8, SK.SS_CYAN);
    if (h.head) { G.fx('crit', h.t.x, h.t.y + 1.7, h.t.z); p.actionbar && p.actionbar('§c헤드샷! §f' + fin.toFixed(1)); }
  },
  // 180°: 레이저처럼 즉시 도달 (벽에 막힘) + 맞으면 반경 3칸 폭발
  ssLaser(p, dmg) {
    const d = lookVec(p.yaw, p.pitch); let x = p.x + d.x * .5, y = p.y + p.eye - .2 + d.y * .5, z = p.z + d.z * .5; const start = { x, y, z }; let end = null, hit = null;
    for (let i = 0; i < 120; i++) { x += d.x * .5; y += d.y * .5; z += d.z * .5; if (SK.solid(x, y, z)) { end = { x, y, z }; break; } const h = SK.ssHitAt(p, x, y, z); if (h) { hit = h; end = { x, y, z }; break; } }
    if (!end) end = { x, y, z };
    SK.vfx(['l', start.x, start.y, start.z, end.x, end.y, end.z, SK.SS_CYAN, .3], ['p', 'glow', end.x, end.y, end.z, 6, SK.SS_CYAN]);
    if (hit) { SK.ssDeal(p, hit, dmg); SK.nr(end.x, end.y - .5, end.z, 3, SK.SS_CYAN, 32); SK.blast(p, end.x, end.y, end.z, 3, 3, .8, false); }
  },
  // 120° · 60° 투사체 이동: 120°는 0.5초 동안 머리를 따라가고 이후 직선
  ssBolts(p) {
    const st = p.st; if (!st.bolts || !st.bolts.length) return;
    for (let i = st.bolts.length - 1; i >= 0; i--) {
      const b = st.bolts[i]; b.age++; let dead = false;
      if (b.homing && b.age <= SK.SS_HOMING_T) {
        let best = null, bestD = 1e9; for (const t of SK.near(p, b.x, b.y, b.z, SK.SS_HOMING_R)) { const dd = Math.hypot(t.x - b.x, t.y + 1.6 - b.y, t.z - b.z); if (dd < bestD) { best = t; bestD = dd; } }
        if (best) { const w = SK.ssNorm({ x: best.x - b.x, y: best.y + 1.6 - b.y, z: best.z - b.z }); const nd = SK.ssNorm({ x: b.dx * .65 + w.x * .35, y: b.dy * .65 + w.y * .35, z: b.dz * .65 + w.z * .35 }); b.dx = nd.x; b.dy = nd.y; b.dz = nd.z; SK.vboltSet(b.vid, b, { x: b.dx * SK.SS_BOLT_SPEED, y: b.dy * SK.SS_BOLT_SPEED, z: b.dz * SK.SS_BOLT_SPEED }); } // 머리 쪽 (everyone's copy turns too)
      }
      const step = SK.SS_BOLT_SPEED / 2;
      for (let s = 0; s < 2 && !dead; s++) {
        const nx = b.x + b.dx * step, ny = b.y + b.dy * step, nz = b.z + b.dz * step;
        if (SK.solid(nx, ny, nz)) { SK.np('dust', b.x, b.y, b.z, 6, SK.SS_CYAN); dead = true; break; }
        const h = SK.ssHitAt(p, nx, ny, nz); if (h) { SK.ssDeal(p, h, b.dmg); dead = true; break; }
        b.x = nx; b.y = ny; b.z = nz;
      }
      if (b.age > SK.SS_BOLT_LIFE) dead = true; if (dead) { SK.vboltEnd(b.vid); st.bolts.splice(i, 1); } // the trail everyone sees is SK.vbolt
    }
  },
  ssShot(p) {
    const st = p.st, now = G.tick, bar = m => { p.actionbar && p.actionbar(m); };
    if (st.down) { bar('§c전투불능 중에는 사용할 수 없습니다'); return false; }
    if (now < st.lock) { bar('§7부활 직후에는 사용할 수 없습니다 (' + Math.ceil((st.lock - now) / 20) + '초)'); return false; }
    if (st.angle < 60) { SK.ssCheck(p); return false; }
    const tier = st.angle >= 180 ? 3 : st.angle >= 120 ? 2 : 1; let dmg = 6;
    if (p.sneaking && p.hp > 1) { SK.deal(p, Math.min(3, p.hp - 1), p, 'magic'); dmg += 2; G.fx('red', p.x, p.y + 1, p.z); bar('§c자해 강화 §f피해 +2'); } // 웅크린 채로 쓰면 나에게 3 피해, 대신 피해 +2
    st.angle = Math.max(0, st.angle - 60); SK.ssSync(p);
    if (tier === 3) { SK.nsyn({ wave: 'sawtooth', freq: 1200, to: 600, dur: .15, vol: .4 }, p); SK.ssLaser(p, dmg); }
    else {
      const d = lookVec(p.yaw, p.pitch); st.bolts = st.bolts || [];
      const b = { x: p.x + d.x * .5, y: p.y + p.eye - .2 + d.y * .5, z: p.z + d.z * .5, dx: d.x, dy: d.y, dz: d.z, age: 0, dmg, homing: tier === 2 }; st.bolts.push(b);
      b.vid = SK.vbolt(p, b, { x: d.x * SK.SS_BOLT_SPEED, y: d.y * SK.SS_BOLT_SPEED, z: d.z * SK.SS_BOLT_SPEED }, SK.SS_CYAN, 3, SK.SS_BOLT_LIFE + 1);
      SK.nsyn({ wave: 'triangle', freq: 700, to: 1100, dur: .15, vol: .4 }, p);
    }
    SK.ssCheck(p); return true;
  },
  ssLeap(p) {
    const st = p.st;
    if (st.down) { p.actionbar && p.actionbar('§c전투불능 중에는 사용할 수 없습니다'); return false; }
    if (st.angle < 120) { p.actionbar && p.actionbar('§c각도가 120° 이상이어야 사용할 수 있습니다'); return false; }
    const tier = st.angle >= 180 ? 3 : 2, fx = p.x, fy = p.y, fz = p.z;
    const d = SK.blink(p, 8); if (!d || d < 1) { p.actionbar && p.actionbar('§7벽에 막혀 이동할 수 없습니다'); return false; }
    st.angle = Math.max(0, st.angle - 60); SK.ssSync(p);
    if (tier === 3) { p.addEff('speed', 1, 2); p.addEff('regeneration', 1, 2); } else p.addEff('speed', 0, 2); // 투명화 2는 게임에 없는 효과
    SK.vfx(...SK.ssTri(fx, fy + .1, fz, 1.3, SK.SS_CYAN), ...SK.ssTri(p.x, p.y + .1, p.z, 1.3, SK.SS_CYAN), ['p', 'dust', p.x, p.y + 1, p.z, 8, SK.SS_CYAN]);
    SK.nsyn({ wave: 'sine', freq: 500, to: 1200, dur: .2, vol: .4 }, p); SK.ssCheck(p); return true;
  },
  ssHalf(p) {
    if (p.hp < 6) { p.actionbar && p.actionbar('§c체력이 6 이상이어야 사용할 수 있습니다'); return false; }
    const cost = p.hp * .5; if (p.maxHp() - cost < 4) { p.actionbar && p.actionbar('§c최대 체력이 너무 낮아 사용할 수 없습니다'); return false; }
    SK.addMaxHp(p, -cost); const excess = p.hp - p.maxHp(); if (excess > 0) SK.deal(p, excess, p, 'magic'); // 현재 체력의 절반만큼 최대 체력 감소
    p.st.angle = 180; SK.ssSync(p); SK.ssCheck(p);
    SK.np('dust', p.x, p.y + 1, p.z, 12, SK.SS_CYAN); SK.nsyn({ wave: 'triangle', freq: 300, to: 900, dur: .3, vol: .4 }, p);
    p.actionbar && p.actionbar('§b절반 조각기 §c최대 체력 -' + cost.toFixed(1) + ' §f각도 180°'); return true;
  },
  ssUlt(p) {
    const st = p.st;
    if (st.down) { p.actionbar && p.actionbar('§c전투불능 중에는 사용할 수 없습니다'); return false; }
    if (st.angle <= 0) { p.actionbar && p.actionbar('§c각도가 없습니다'); return false; }
    const list = otherTargets(p, 40); if (!list.length) { p.actionbar && p.actionbar('§7주변에 적이 없습니다'); return false; }
    SK.nsyn({ wave: 'sawtooth', freq: 200, to: 800, dur: .5, vol: .5 }, p); const ops = [...SK.ssTri(p.x, p.y + .1, p.z, 2.5, SK.SS_CYAN), ...SK.ssTri(p.x, p.y + 2.2, p.z, 1.5, SK.SS_CYAN)];
    let n = 0;
    for (const t of list) { // 피할 수 없는 투사체: 벽과 상관없이 즉시 명중
      ops.push(['l', p.x, p.y + 1.5, p.z, t.x, t.y + 1, t.z, SK.SS_CYAN, .6], ['p', 'dust', t.x, t.y + 1, t.z, 8, SK.SS_CYAN]); SK.deal(t, 4, p, 'magic');
      if (t.kind !== 'mob') { SK.effOn(t, 'slowness', 1, 3); n++; } // Darkness 3초는 게임에 없는 효과
    }
    SK.vfx(...ops); if (n > 0) SK.addMaxHp(p, 4 * n); p.addEff('regeneration', 2, 3);
    SK.title(p, '§b일루미나티 파워', '§f적 ' + n + '명 명중 · 최대 체력 +' + (4 * n) + ' · 재생 III');
    st.angle = 0; SK.ssSync(p); SK.ssCheck(p); return true;
  },
});

JOB_HOOK.susu = {
  tick(p) {
    const st = p.st, now = G.tick; if (st.angle === undefined) { st.angle = 180; st.lock = now + SK.SS_LOCK_T; SK.ssSync(p); }
    SK.ssBolts(p);
    if (st.down && now >= st.down) { st.angle = 180; SK.ssSync(p); SK.ssUp(p); p.actionbar && p.actionbar('§b삼각형 재정렬 §f각도 180°'); } // 전투불능 5초 뒤 각도 자동 회복
    if (now % 10 === 0) { // 게이지
      const segs = Math.ceil(Math.max(0, st.angle) / 60); let bar = '§b' + '■'.repeat(segs) + '§8' + '■'.repeat(3 - segs) + ' §f' + Math.round(st.angle) + '°';
      if (st.angle >= 180) bar += ' §b[레이저]'; else if (st.angle >= 120) bar += ' §e[유도]'; else if (st.angle >= 60) bar += ' §7[직선]';
      const pct = Math.min(36, Math.max(0, (180 - st.angle) / 5)); if (pct > 0) bar += ' §7(피해 -' + Math.round(pct) + '%)';
      if (st.down) bar += ' §c전투불능 ' + Math.ceil((st.down - now) / 20) + '초'; else if (now < st.lock) bar += ' §7사격 잠김 ' + Math.ceil((st.lock - now) / 20) + '초';
      p.actionbar && p.actionbar(bar);
    }
  },
  // every client: gauge orbs over the head, one per 60°
  vis(e, s, age, now) { if (now % 5) return; const n = Math.ceil(Math.max(0, s.a) / 60); for (let i = 0; i < n; i++) { const a = now * .1 + i * Math.PI * 2 / 3; G.particles('dust', e.x + Math.cos(a) * .6, e.y + 2.3, e.z + Math.sin(a) * .6, 1, SK.SS_CYAN); } },
  // 패시브: 삼각형의 무게중심 — 받는 피해가 (180 - 각도) / 5 % 감소 (최대 36%)
  hurt(p, amount, src) {
    if (!p.alive || p.hp <= 0) return; if (!src || src.by == null || src.by === p.id) return; // 환경 · 자해 피해는 제외
    if (p.st.angle === undefined) return; const pct = Math.min(36, Math.max(0, (180 - p.st.angle) / 5)); if (pct > 0) p.heal(amount * pct / 100);
  },
  respawn(p) { p.st.angle = 180; p.st.lock = G.tick + SK.SS_LOCK_T; SK.ssSync(p); p.actionbar && p.actionbar('§b수수 §7- 각도 180° (3초 뒤 삼각형의 한 꼭짓점 사용 가능)'); },
};

BOT_JOB.susu = (b, I, ai, t, dist) => {
  const st = b.st;
  if (st.down && b.hp >= 10) botUse(b, 'ss_half'); if (dist < 35 && (st.angle || 0) >= 180 && b.hp >= 14) botUse(b, 'ss_ult'); if (dist < 40) botUse(b, 'ss_shot');
  if (dist > 12 && (st.angle || 0) >= 120) botUse(b, 'ss_leap'); if ((st.angle || 0) <= 60 && b.hp >= 10) botUse(b, 'ss_half');
};
