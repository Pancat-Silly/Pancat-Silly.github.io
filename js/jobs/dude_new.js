// ===================== dude (New) (dude_new) =====================
// 직업 정의 → JOBS · 아이템 → ITEMS · 능력 → SK · 봇 행동 → BOT_JOB. 게임 엔진 쪽 훅(맞을 때·그리기 등)은 05~10 모듈에 그대로 있다
JOBS.dude_new = { name: 'dude', icon: '🎣', desc: '미완성 직업 · New · 댄스 (개구리를 모아 버프) + 권총', kit: [['stone_sword'], ['dance'], ['pistol']], maxHp: 40, wip: true, varOf: 'dude' }; // New variant of dude: picked on the dude card (not in JOB_ORDER)

Object.assign(ITEMS, {
  dance: { name: '댄스', icon: '🕺', use: 'skill', cd: 15, group: 'dance', cast: 'dance', col: [.35, .75, .3], lore: '누르면 춤 시작 / 다시 누르면 그만 · 1초마다 개구리가 모여 같이 춤춤 · 그만두면 모은 개구리만큼 신속·힘·회복·체력 증가 + 개구리당 5% 총알' },
  dude_bullet: { name: '총알', icon: '🔸', stack: true, col: [.85, .7, .3], lore: '권총에 쓰는 총알 (댄스로 얻음)' },
  pistol: { name: '권총', icon: '🔫', use: 'gun', col: [.22, .22, .25], lore: '총알 1개 · 꾹 누르면 느려지며 조준, 떼면 일직선으로 발사 · 플레이어를 맞히면 컷씬 후 즉사' },
});

Object.assign(SK, {
  // ---------- dude New: 댄스 ----------
  // toggle: dance in place (no moving / attacking, other skills locked) to the song while a frog joins every second;
  // stopping gives buffs for the frogs gathered. Everyone sees it through 'dance' / 'dfrog' events (G.dancers, R.drawFrogs).
  DANCE_MAX: 30, DANCE_FX_SEC: 30,
  dance(p) {
    if (p.st.dance) return SK.danceEnd(p, true);
    p.st.dance = { t: G.tick, yaw: p.yaw, n: 0 }; p.sprinting = false; p.vx = p.vz = 0;
    G.emitAndApply({ k: 'dance', by: p.id, on: 1, yaw: r1(p.yaw) });
    p.actionbar('§a댄스 시작! §7다시 누르면 그만두고 버프를 받아요'); return 'nocd';
  },
  danceTick(p) {
    const d = p.st.dance; const a = G.tick - d.t; // the body keeps facing d.yaw (G.dancers); p.yaw is free for the orbit camera
    if (a > 0 && a % 20 === 0 && d.n < SK.DANCE_MAX) {
      for (let k = 0; k < 8; k++) { // a random free spot on the ground around the dancer
        const ang = Math.random() * Math.PI * 2, r = rand(2, 5.5), x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r, gy = SK.fangY(x, p.y + 1, z);
        if (gy === null || Math.abs(gy - p.y) > 3) continue;
        d.n++; G.emitAndApply({ k: 'dfrog', by: p.id, x: r1(x), y: r1(gy), z: r1(z), yaw: r1(d.yaw + rand(-.35, .35)) }); break;
      }
      p.actionbar('§a🐸 개구리 ' + d.n + '마리' + (d.n >= SK.DANCE_MAX ? ' §7(최대)' : ''));
    }
  },
  // reward: n frogs -> 신속 (max IV), 힘 (max II), 회복 (2 HP per frog, up to full), 체력 증가 (+4 HP per 3 frogs, max +20), each frog 5% -> 총알
  danceEnd(p, reward) {
    const d = p.st && p.st.dance; if (!d) return false; p.st.dance = null; G.emitAndApply({ k: 'dance', by: p.id, on: 0 });
    if (!reward) return false;
    const n = d.n, T = SK.DANCE_FX_SEC, spd = Math.min(4, Math.ceil(n / 4)), str = Math.min(2, Math.floor(n / 6)), hb = Math.min(5, Math.floor(n / 3));
    if (spd) p.addEff('speed', spd - 1, T); if (str) p.addEff('strength', str - 1, T); if (hb) p.addEff('health_boost', hb - 1, T);
    p.heal(n * 2); let ammo = 0; for (let i = 0; i < n; i++) if (Math.random() < .05) ammo++; if (ammo) p.addItem('dude_bullet', ammo);
    const R = ['I', 'II', 'III', 'IV'];
    p.msg('§a[댄스] §f개구리 ' + n + '마리' + (n ? ' → ' + [spd && '신속 ' + R[spd - 1], str && '힘 ' + R[str - 1], hb && '체력 +' + hb * 4, '회복 ' + n * 2].filter(Boolean).join(' · ') + (ammo ? ' · §6총알 ' + ammo + '개' : '') : ''));
    if (n) AU.sfx('levelup', p); p.setCd('dance', ITEMS.dance.cd); return 'nocd';
  },
  // ---------- dude New: 권총 ----------
  // one bullet, hitscan in a straight line (aim time doesn't matter). Hitting a player starts the 컷씬 for the shooter and the target
  // (G.cut, R.cutFrame: camera eases to the side 0.977s -> black 0.088s -> red 1.167s with the target falling back), then the target dies.
  CUT_T: [0.977, 0.088, 1.167],
  gunFire(p) {
    if (p.count('dude_bullet') < 1) return; p.take('dude_bullet', 1);
    if (p.st.aiSteal && p.st.aiSteal.ids.pistol !== undefined) SK.aiAfterUse(p, p.inv.find(s => s && s.id === 'pistol'), true); // Ai: stolen 권총 is one-use
    const o = { x: p.x, y: p.y + p.eye - .1, z: p.z }, d = lookVec(p.yaw, p.pitch), MAX = 80; const wall = G.world.ray(o, d, MAX, B => B.solid); let lim = wall ? wall.t : MAX, hit = null;
    for (const t of otherPlayers(p, MAX + 2)) { const h = rayAABB(o, d, t, lim, .05); if (h !== null && h < lim) { lim = h; hit = t; } }
    const e = { x: o.x + d.x * lim, y: o.y + d.y * lim, z: o.z + d.z * lim };
    G.emitAndApply({ k: 'gshot', a: [r1(o.x), r1(o.y), r1(o.z)], b: [r1(e.x), r1(e.y), r1(e.z)] });
    const safe = hit && ((hit.local ? G.tick < (hit.prot || 0) : hit.protF) || G.sameTeam(p.id, hit.id)); // won't die -> no 컷씬
    if (!hit || safe) { AU.sfx('explode', p, .35, 2); return; }
    // the target dies right away (respawn waits for the 컷씬 to end, Player.die), the shooter blinks in place, invulnerable (prot)
    const n = Math.round((SK.CUT_T[0] + SK.CUT_T[1] + SK.CUT_T[2]) * 20); p.st.cutUntil = G.tick + n; p.prot = G.tick + n; if (hit.local) hit.st.cutUntil = G.tick + n;
    G.emitAndApply({ k: 'gcut', by: p.id, tid: hit.id, a: [r1(p.x), r1(p.y), r1(p.z), r1(yawTo(hit.x - p.x, hit.z - p.z))], b: [r1(hit.x), r1(hit.y), r1(hit.z), r1(yawTo(p.x - hit.x, p.z - hit.z))] });
    G.damage(hit, 1000, { type: 'magic', by: p.id, nokb: true, exact: true, noinvul: true });
    if (hit.local && hit.alive) G.emitAndApply({ k: 'gcutx', by: p.id, tid: hit.id }); // survived (revive, resistance…) -> no 컷씬; a remote target checks itself (09_game 'gcut')
  },
  onGunCancel(ev) { // 'gcutx': the target didn't die -> stop the 컷씬, free the shooter + target
    if (G.cut && G.cut.tid === ev.tid) { G.cut = null; document.body.classList.remove('apvpcut'); }
    for (const q of [G.me, ...G.bots]) { if (!q) continue; if (q.id === ev.tid) q.st.cutUntil = 0; if (q.id === ev.by) { q.st.cutUntil = 0; q.prot = 0; } }
  },
});

BOT_JOB.dude_new = (b, I, ai, t, dist, r, wantYaw) => {
  const d = b.st.dance; if (!d ? dist > 12 && r < .05 : dist < 6 || d.n >= 12) botUse(b, 'dance'); // dance while nobody is near, stop when someone comes or 12 frogs
};
