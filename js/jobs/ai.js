// ===================== Ai (ai) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.ai = { name: 'Ai', icon: '🤖', desc: '미완성 직업 · 해킹형 · 프롬프트 + 능력 훔치기 레이저 + 순간이동', kit: [['ai_prompt'], ['ai_glasses'], ['big_data']], wip: true };

Object.assign(ITEMS, {
  ai_prompt: { name: '프롬프트', icon: '⌨️', dmg: 1, spd: 1.6, sword: true, col: [.35, .8, 1], lore: '공격 시 상대 현재 체력의 25% 피해 (상대 체력 5 이하면 2)' },
  ai_glasses: { name: 'ai 안경', icon: '🥽', use: 'skill', cd: 10, group: 'ai_glasses', cast: 'aiGlasses', lore: '피해 없는 40칸 레이저 · 맞은 플레이어의 능력을 전부 1회용으로 훔침 (같은 상대 30초 제한 · 빗나가면 1초) · 다 쓰면 안경 복귀' },
  big_data: { name: '빅데이터', icon: '💾', use: 'skill', cd: 30, group: 'big_data', cast: 'aiData', lore: '지금 위치에 조각 설치 → 다시 쓰면 조각으로 순간이동 + 체력 6 회복' },
});

Object.assign(SK, {
  // ai 안경: 40-block harmless beam (aim assist ~10°); steals every ability of the player hit as one-use items
  AI_BASE: new Set(['iron_sword', 'dia_sword', 'bow', 'arrow', 'shield', 'ai_prompt', 'ai_glasses', 'big_data']),
  aiGlasses(p) {
    if (p.st.aiSteal) return false;
    const eye = { x: p.x, y: p.y + p.eye, z: p.z }, d = lookVec(p.yaw, p.pitch); const wall = G.world.ray(eye, d, 40, B => B.solid); const lim = wall ? wall.t : 40;
    let t = null, bd = .985;
    for (const q of otherPlayers(p, 42)) { const vx = q.x - eye.x, vy = q.y + 1 - eye.y, vz = q.z - eye.z, dd = Math.hypot(vx, vy, vz) || 1; const dot = (vx * d.x + vy * d.y + vz * d.z) / dd; if (dot > bd && dd <= lim + 1) { t = q; bd = dot; } }
    const a = { x: eye.x + d.x * .5, y: eye.y - .25 + d.y * .5, z: eye.z + d.z * .5 }, b = t ? { x: t.x, y: t.y + 1.2, z: t.z } : { x: eye.x + d.x * lim, y: eye.y + d.y * lim, z: eye.z + d.z * lim };
    G.emitAndApply({ k: 'srbeam', a: [r1(a.x), r1(a.y), r1(a.z)], b: [r1(b.x), r1(b.y), r1(b.z)], c: [.3, .9, 1] }); if (t) G.sound('ai1', p, 30); // sound only when the beam hits a player
    const fail = m => { p.actionbar && p.actionbar(m); p.setCd('ai_glasses', 1); return 'nocd'; };
    if (!t) return fail('§7[ai 안경] 빗나감! 1초 뒤 다시 사용 가능');
    const last = (p.st.aiLast || (p.st.aiLast = {}))[t.id]; if (last !== undefined && G.tick - last < 600) return fail('§c[ai 안경] ' + t.name + ' 다시 훔치기까지 ' + Math.ceil((600 - (G.tick - last)) / 20) + '초');
    // what the target has: its real inventory (bots / me) or, for other players, its job kit
    const src = t.inv ? t.inv.slice(1).map(s => s && s.id) : ((JOBS[t.job] || {}).kit || []).slice(1).map(k => k && k[0]);
    const got = [...new Set(src.filter(id => id && ITEMS[id] && (ITEMS[id].use === 'skill' || ITEMS[id].use === 'crossbow' || ITEMS[id].use === 'gun') && !SK.AI_BASE.has(id) && !p.inv.some(s => s && s.id === id)))];
    if (!got.length) return fail('§7[ai 안경] ' + t.name + '에게 훔칠 능력이 없어요');
    p.st.aiLast[t.id] = G.tick; const ids = {};
    const gi = p.inv.findIndex(s => s && s.id === 'ai_glasses'); if (gi >= 0) p.inv[gi] = null; // glasses leave while the stolen skills are out
    for (const id of got) { const i = gi >= 0 && !p.inv[gi] ? gi : p.inv.findIndex(s => !s); if (i < 0) break; p.inv[i] = mkSlot(id, 1); ids[id] = 0; if (ITEMS[id].group) delete p.cds[ITEMS[id].group]; if (ITEMS[id].use === 'gun') p.addItem('dude_bullet', 1); } // a stolen 권총 comes with one bullet
    p.st.aiSteal = { ids };
    G.particles('glow', p.x, p.y + 1, p.z, 20); G.particles('poof', t.x, t.y + 1, t.z, 10);
    p.actionbar && p.actionbar('§a[ai 안경] ' + t.name + '의 능력 ' + Object.keys(ids).length + '개를 1회용으로 가져왔어요!');
    return 'nocd';
  },
  // after using a stolen skill: success = used up; a failed use (condition not met) counts, and the 3rd failed try uses it up too
  aiAfterUse(p, slot, ok) {
    const S = p.st.aiSteal; if (!S || !slot || S.ids[slot.id] === undefined) return;
    if (slot.id === 'dance' && p.st.dance) return; // stolen 댄스: used up when the dance stops, not when it starts
    const failed = ok === false || (ok === 'nocd' && slot.id === 'grab');
    if (failed) { S.ids[slot.id]++; if (S.ids[slot.id] < 3) { p.actionbar && p.actionbar('§7[ai 안경] 사용 실패 ' + S.ids[slot.id] + '/3 — 3번 실패하면 사용한 걸로 쳐요'); return; } }
    const i = p.inv.indexOf(slot); if (i >= 0) p.inv[i] = null; delete S.ids[slot.id];
    if (!Object.keys(S.ids).length) SK.aiRestore(p, true);
  },
  aiRestore(p, msg) {
    if (p.st.aiSteal) for (const id in p.st.aiSteal.ids) { const i = p.inv.findIndex(s => s && s.id === id); if (i >= 0) p.inv[i] = null; }
    p.st.aiSteal = null;
    if (!p.inv.some(s => s && s.id === 'ai_glasses')) { const i = p.inv[1] ? p.inv.findIndex(s => !s) : 1; if (i >= 0) p.inv[i] = mkSlot('ai_glasses', 1); }
    if (msg) { p.setCd('ai_glasses', 10); p.actionbar && p.actionbar('§b[ai 안경] 훔친 능력을 모두 썼어요 · 안경이 돌아왔어요 (쿨타임 10초)'); }
  },
  // 빅데이터: 1st use drops a piece here, 2nd use teleports back to it and heals 6
  aiData(p) {
    if (!p.st.aiPiece) { p.st.aiPiece = { x: p.x, y: p.y, z: p.z }; AU.sfx('click', p); G.particles('totem', p.x, p.y + .5, p.z, 12); SK.srRing(p.x, p.y + .1, p.z, 1, [.3, .8, 1], 20); p.actionbar && p.actionbar('§b[빅데이터] 조각을 두었어요. 다시 쓰면 이곳으로 돌아와요'); p.setCd('big_data', 1); return 'nocd'; }
    const c = p.st.aiPiece; p.st.aiPiece = null; G.particles('poof', p.x, p.y + 1, p.z, 15);
    p.x = c.x; p.y = c.y; p.z = c.z; p.px = p.x; p.py = p.y; p.pz = p.z; p.vx = p.vy = p.vz = 0; p.fallDist = 0;
    p.heal(6); G.sound('ai2', p, 30); G.particles('heart', c.x, c.y + 1.5, c.z, 6); G.particles('totem', c.x, c.y + 1, c.z, 20); SK.srRing(c.x, c.y + .1, c.z, 1.5, [.3, 1, .6], 24);
    p.actionbar && p.actionbar('§a[빅데이터] 조각 위치로 복귀! 체력 +6'); return true;
  },
});

BOT_JOB.ai = (b, I, ai, t, dist, r, wantYaw) => {
  if (dist < 30) botUse(b, 'ai_glasses');
  const S = b.st.aiSteal;
  if (S && S.ids.grab !== undefined && dist > 3 && dist < 19) { I.sneak = true; I.sprint = false; if ((b.st.charge || 0) >= 23) { botUse(b, 'grab'); I.sneak = false; } }
  else if (S && dist < 15 && Math.random() < .05) for (const id of Object.keys(S.ids)) if (id !== 'grab' && botUse(b, id)) break;
  if (!b.st.aiPiece && dist < 10) botUse(b, 'big_data'); else if (b.st.aiPiece && b.hp < 10) botUse(b, 'big_data');
};
