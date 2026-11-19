// ===================== mod API (custom jobs made with the player's own AI, tested in the dev tool) =====================
// The dev tool is this same game saved with window.APVP_DEV = 1 (offline practice only). Custom code never runs in the
// online game. Everything a custom job may touch goes through APVP.api so generated code stays small and stable.
// API_DOC is the single source for both the api object's documentation in the AI prompt and the dev log hints.
const MOD = {
  defs: {}, sounds: {}, proj: [], missing: {}, errCount: {}, codeLines: [],
  // map a stack trace back to the pasted code (new Function adds 2 header lines)
  where(e) { const m = String(e && e.stack || '').match(/mod_job\.js:(\d+):(\d+)/); if (!m) return ''; const ln = +m[1] - 2, col = +m[2]; const src = (this.codeLines[ln - 1] || '').trim(); return ' (코드 ' + ln + '번째 줄 ' + col + '번째 칸' + (src ? ': ' + src.slice(0, 120) : '') + ')'; },
  err(where, e) {
    const msg = (e && e.message || String(e)); const key = where + '|' + msg; const n = this.errCount[key] = (this.errCount[key] || 0) + 1;
    if (n <= 3 || n % 100 === 0) { const hint = /is not a function/.test(msg) && /api\./.test(msg) ? ' → API 목록에 없는 함수예요' : /Cannot read properties of (undefined|null)/.test(msg) ? ' → 대상이 없는데(null) 속성을 읽었어요. if (!t) return; 같은 확인이 필요해요' : '';
      DEV.log('error', '[' + where + '] ' + msg + this.where(e) + hint + (n > 1 ? '  (' + n + '번째)' : '')); if (n === 1 && UI.chat) UI.chat('§c모드 오류 [' + where + '] ' + msg.slice(0, 100)); }
    console.error(where, e);
  },
  fire(p, ev, ...a) {
    const D = this.defs[p.job]; const f = D && D[ev]; if (!f) return;
    if (ev === 'death' || ev === 'respawn') DEV.log('event', p.name + ' (' + JOBS[p.job].name + ') ' + (ev === 'death' ? '사망' : '부활') + ' → ' + ev + '() 실행');
    else if (ev === 'hit') DEV.log('event', p.name + ' 근접 적중 → ' + (a[0] && (a[0].name || a[0].type)) + ' ' + (+a[1]).toFixed(1) + ' → hit() 실행', 'hit' + p.id);
    else if (ev === 'hurt') DEV.log('event', p.name + ' 피격 ' + (+a[0]).toFixed(1) + ' (' + (a[1] && a[1].type) + ') → hurt() 실행', 'hurt' + p.id);
    try { f(p, ...a, APVP.api); } catch (e) { this.err(p.job + '.' + ev, e); }
  },
  // which vanilla texture a mod item shows when the resource pack is on: item.mc ('diamond_sword', 'block/tnt', ['block/tnt_side','block/tnt_top'])
  // or a guess from its type / emoji, so every uploaded or dev-tool job also gets real Minecraft items
  EMOJI_MC: { '🗡️': 'iron_sword', '⚔️': 'iron_sword', '🔪': 'iron_sword', '🪓': 'iron_axe', '🏹': 'bow', '🔥': 'fire_charge', '☄️': 'fire_charge', '💣': 'block/tnt', '💥': 'block/tnt', '🧨': 'block/tnt', '❄️': 'snowball', '🧊': 'block/blue_ice', '⚡': 'blaze_rod', '🌩️': 'blaze_rod', '🪄': 'blaze_rod', '🌀': 'ender_eye', '👁️': 'ender_eye', '💨': 'feather', '🪶': 'feather', '🐷': 'porkchop', '🐖': 'porkchop', '🐕': 'bone', '🦴': 'bone', '🧪': 'potion', '⚗️': 'potion', '❤️': 'golden_apple', '💖': 'golden_apple', '🍎': 'apple', '💀': 'skeleton_skull', '☠️': 'skeleton_skull', '🛡️': 'shield', '⭐': 'nether_star', '✨': 'glowstone_dust', '💎': 'diamond', '🔔': 'bell', '📢': 'goat_horn', '🎵': 'music_disc_cat', '🎶': 'music_disc_cat', '💧': 'water_bucket', '🌊': 'heart_of_the_sea', '🕸️': 'cobweb', '🪨': 'block/cobblestone', '🧱': 'block/bricks', '⛓️': 'chain', '🪝': 'tripwire_hook', '🔱': 'trident', '🎣': 'fishing_rod', '🍖': 'cooked_beef', '🥩': 'beef', '🟢': 'slime_ball', '👻': 'phantom_membrane', '🌙': 'phantom_membrane', '☀️': 'sunflower_front', '🌪️': 'wind_charge', '🌬️': 'wind_charge', '📜': 'paper', '📖': 'book', '🔮': 'ender_pearl', '⏳': 'clock_00', '⏱️': 'clock_00', '🧲': 'iron_ingot', '🪤': 'tripwire_hook', '🦷': 'echo_shard', '👊': 'leather', '🥊': 'leather', '🎯': 'target_side', '🧿': 'ender_eye', '🔴': 'redstone', '🔵': 'lapis_lazuli', '🟡': 'gold_nugget', '🟣': 'amethyst_shard', '⚪': 'snowball', '⚫': 'coal', '💜': 'amethyst_shard', '🩸': 'redstone', '🪓': 'iron_axe' },
  artFor(I, type, iid) {
    const BLOCKISH = { shield: 0, skeleton_skull: 0, cobweb: 'block/cobweb', chain: 'item/chain', target_side: 'block/target_side', sunflower_front: 'block/sunflower_front', bell: 'item/bell' };
    let mc = I.mc; if (mc === false || mc === 'none') return null;
    if (!mc) { const e = String(I.icon || '').trim(); mc = this.EMOJI_MC[e] || this.EMOJI_MC[e.replace(/\uFE0F/g, '')] || this.EMOJI_MC[e + '\uFE0F'] || (type === 'weapon' ? 'iron_sword' : type === 'bow' ? 'bow' : 'nether_star'); }
    if (Array.isArray(mc)) { const [a, b] = mc.map(x => String(x).replace(/^minecraft:/, '').replace(/^(?!block\/)/, 'block/')); return { cube: [a, b || a] }; }
    mc = String(mc).replace(/^minecraft:/, '').replace(/^textures\//, '').replace(/\.png$/, '').trim().toLowerCase(); if (!/^[a-z0-9_\/]+$/.test(mc)) throw new Error(mc);
    if (mc in BLOCKISH) { const v = BLOCKISH[mc]; if (!v) mc = type === 'weapon' ? 'iron_sword' : 'nether_star'; else if (v.startsWith('block/')) return { l: [[v]] }; else mc = v.slice(5); }
    if (mc === 'potion' || mc === 'splash_potion') { const c = Array.isArray(I.color) ? (I.color[0] * 255 << 16 | I.color[1] * 255 << 8 | I.color[2] * 255) : 0x8932B8; return POT(c, 'item/' + mc); }
    if (mc.startsWith('block/')) return { cube: [mc, mc] };
    const path = mc.startsWith('item/') ? mc : 'item/' + mc;
    const hand = type === 'weapon' || type === 'bow' || /sword|_axe|pickaxe|shovel|_hoe|rod|mace|trident|bow|stick|bone/.test(path);
    return { l: [[path]], h: hand ? 1 : 0 };
  },
  addJob(def) {
    if (!def || typeof def !== 'object') throw new Error('APVP.addJob({ ... })에 직업 정보를 객체로 넣어 주세요');
    let id = String(def.id || '').toLowerCase(); const origId = id; if (!/^[a-z][a-z0-9_]{1,24}$/.test(id)) throw new Error('직업 id는 영어 소문자로 시작하는 소문자/숫자/_ 2~25자여야 해요: "' + def.id + '"');
    if (JOBS[id] && !JOBS[id].custom) { const nid = id + '_mod'; DEV.log('info', '"' + id + '" 는 이미 게임에 정식으로 들어간 직업이라 "' + nid + '" (모드 버전)으로 따로 불러와요'); id = nid; }
    const JOBKEYS = ['id', 'name', 'icon', 'desc', 'maxHp', 'speed', 'kit', 'items', 'offhand', 'armor', 'boots', 'sounds', 'tick', 'hit', 'hurt', 'kill', 'death', 'respawn', 'bot'];
    for (const k in def) if (!JOBKEYS.includes(k)) DEV.log('warn', '직업 "' + id + '": 알 수 없는 항목 "' + k + '" 은 무시돼요 (쓸 수 있는 항목: ' + JOBKEYS.join(', ') + ')');
    const items = def.items || {}; const kit = []; const ITEMKEYS = ['type', 'name', 'icon', 'lore', 'damage', 'dmg', 'speed', 'spd', 'knockback', 'reach', 'color', 'cooldown', 'cd', 'use', 'consume', 'count', 'mc'];
    for (const iid in items) {
      if (!/^[a-z][a-z0-9_]{1,30}$/.test(iid)) throw new Error('아이템 id는 영어 소문자/숫자/_ 로 해 주세요: "' + iid + '"');
      if (ITEMS[iid] && !ITEMS[iid].custom) throw new Error('이미 있는 기본 아이템 id예요: ' + iid + ' (다른 이름을 써 주세요)');
      const I = items[iid], D = { custom: true, name: I.name || iid, icon: I.icon || '❔', lore: I.lore || '' };
      for (const k in I) if (!ITEMKEYS.includes(k)) DEV.log('warn', '아이템 "' + iid + '": 알 수 없는 항목 "' + k + '" 은 무시돼요');
      const type = I.type || (I.use ? 'skill' : 'weapon');
      if (type === 'weapon') { D.dmg = +I.damage || +I.dmg || 1; D.spd = +I.speed || +I.spd || 1.6; if (I.knockback) D.kb = +I.knockback; if (I.reach) D.reach = clamp(+I.reach, 2, 6) / 3 - 1; /* player reach = 3 * (1 + reach) */ D.sword = true; D.col = I.color || [.75, .75, .8]; }
      else if (type === 'skill') {
        const fn = I.use; if (typeof fn !== 'function') throw new Error(iid + ': type "skill" 아이템에는 use(p, api) 함수가 필요해요');
        const cast = 'mod_' + id + '_' + iid;
        SK[cast] = (p, slot) => { let r; try { r = fn(p, APVP.api, slot); if (r === undefined) r = true; } catch (e) { MOD.err(iid + '.use', e); r = false; }
          DEV.log('skill', p.name + ' → ' + D.name + ' 사용: ' + (r === false ? '실패/취소 (false를 돌려줘서 쿨타임 없음)' : r === 'nocd' ? '사용 (쿨타임 없음)' : '사용, 쿨타임 ' + D.cd + '초')); return r; };
        Object.assign(D, { use: 'skill', cd: +I.cooldown || +I.cd || 0, group: cast, cast, consume: !!I.consume, stack: !!I.consume });
      }
      else if (type === 'bow') { Object.assign(D, { use: 'bow' }); }
      else if (type === 'shield') { Object.assign(D, { use: 'shield' }); }
      else if (type === 'item') { if (I.count) D.stack = true; }
      else throw new Error(iid + ': type은 weapon / skill / bow / shield / item 중 하나예요 (지금: "' + type + '")');
      ITEMS[iid] = D; try { const A = MOD.artFor(I, type, iid); if (A) ITEM_ART[iid] = A; else delete ITEM_ART[iid]; } catch (e) { DEV.log('warn', '아이템 "' + iid + '": mc 텍스처 이름이 이상해요 (' + e.message + ')'); }
    }
    for (const k of def.kit || Object.keys(items)) { const ks = [].concat(k).filter(Boolean); for (const x of ks) if (!ITEMS[x]) throw new Error('kit에 없는 아이템: "' + x + '" (items에 만들었거나 기본 아이템 id여야 해요)'); kit.push(ks.length ? ks : null); }
    if (!kit.length) throw new Error('kit(핫바에 줄 아이템)이 비어 있어요');
    if (kit.length > 9) throw new Error('kit은 최대 9칸이에요');
    JOBS[id] = { custom: true, wip: true, name: (def.name || id) + (id !== origId ? ' (모드)' : ''), icon: def.icon || '✨', desc: '커스텀 · ' + (def.desc || ''), kit, maxHp: def.maxHp ? clamp(+def.maxHp, 2, 100) : undefined, speedMul: def.speed ? clamp(+def.speed, .3, 3) : undefined, off: def.offhand || undefined };
    if (def.armor) JOBS[id].armor = def.armor; if (def.boots) JOBS[id].boots = def.boots;
    this.defs[id] = def; if (!JOB_ORDER.includes(id)) JOB_ORDER.push(id); if (this.upIds) this.upIds.push(id);
    for (const s of def.sounds || []) if (s && s.name && s.data) this.addSound(s.name, s.data);
    const hooks = ['tick', 'hit', 'hurt', 'kill', 'death', 'respawn', 'bot'].filter(h => typeof def[h] === 'function');
    DEV.log('ok', '직업 등록: ' + JOBS[id].icon + ' ' + JOBS[id].name + ' (id ' + id + ') · 체력 ' + (JOBS[id].maxHp || 20) + ' · 이동속도 ×' + (JOBS[id].speedMul || 1) + ' · 이벤트 [' + (hooks.join(', ') || '없음') + ']');
    kit.forEach((k, i) => { if (!k) return; const D = ITEMS[k[0]]; DEV.log('ok', '  ' + (i + 1) + '번 칸: ' + D.icon + ' ' + D.name + ' (' + k[0] + ') · ' + (D.use === 'skill' ? '능력, 쿨타임 ' + D.cd + '초' + (D.consume ? ', 쓰면 1개 소모' : '') : D.use === 'bow' ? '활' : D.use === 'shield' ? '방패' : D.dmg ? '무기, 공격력 ' + D.dmg + ' · 공속 ' + D.spd : '아이템') + (D.custom ? '' : ' [기본 아이템]')); });
    UI.addJobButton && UI.addJobButton(id); UI.menuDirty = true; clearTimeout(this._pe); this._pe = setTimeout(() => PACK.ensure(), 300); // vanilla textures for the new items
    return id;
  },
  async addSound(name, dataURL) {
    name = String(name).replace(/[^a-zA-Z0-9_가-힣]/g, '_').slice(0, 40); this.sounds[name] = dataURL; if (!AU.ctx) return name;
    try { const b = await (await fetch(dataURL)).arrayBuffer(); AU.buf[name] = await AU.ctx.decodeAudioData(b); DEV.log('ok', '효과음 준비됨: ' + name + ' (' + AU.buf[name].duration.toFixed(2) + '초)'); } catch (e) { this.err('효과음 ' + name, e); }
    return name;
  },
  async decodeAll() { for (const n in this.sounds) if (!AU.buf[n]) await this.addSound(n, this.sounds[n]); },
  // custom projectiles (api.projectile): simulated by whoever fired them, drawn as particle trails
  projTick() {
    const W = G.world;
    for (const q of this.proj) {
      if (q.dead) continue; q.age++; const sub = 4;
      for (let s = 0; s < sub && !q.dead; s++) {
        q.vy -= q.gravity / sub; q.x += q.vx / sub; q.y += q.vy / sub; q.z += q.vz / sub;
        if (W.solidAt(q.x, q.y, q.z)) { q.dead = true; if (q.onBlock) try { q.onBlock({ x: q.x, y: q.y, z: q.z }, APVP.api); } catch (e) { MOD.err('projectile.onBlock', e); } break; }
        for (const t of otherTargets(q.owner, 60)) { if (q.hitIds.has(t.id)) continue; const hw = t.w / 2 + q.size; if (Math.abs(t.x - q.x) < hw && Math.abs(t.z - q.z) < hw && q.y > t.y - q.size && q.y < t.y + t.h + q.size) {
          q.hitIds.add(t.id); if (q.damage) APVP.api.damage(t, q.damage, { by: q.owner, type: q.type, from: { x: q.x - q.vx, z: q.z - q.vz }, knockback: q.knockback });
          if (q.onHit) try { q.onHit(t, { x: q.x, y: q.y, z: q.z }, APVP.api); } catch (e) { MOD.err('projectile.onHit', e); }
          if (!q.pierce) { q.dead = true; break; } } }
      }
      if (!q.dead && q.age >= q.life) { q.dead = true; if (q.onExpire) try { q.onExpire({ x: q.x, y: q.y, z: q.z }, APVP.api); } catch (e) { MOD.err('projectile.onExpire', e); } }
      if (!q.dead || q.age < 2) G.particles('dust', q.x, q.y, q.z, q.trail, q.color);
    }
    this.proj = this.proj.filter(q => !q.dead);
  },
  missingApi(name) { if (this.missing[name]) { this.missing[name]++; return; } this.missing[name] = 1; DEV.log('error', '없는 API 호출: api.' + name + '(...) — 무시하고 계속 실행해요. 결과물 txt의 "구현 메모"에 자동으로 적혀요'); },
};
// simple synth for AI-made sound effects: APVP.api.synth({ wave:'square', freq:440, to:220, dur:.2, vol:.4, noise:false }, at)
AU.synth = function (d, pos) {
  if (!this.ctx) return; const c = this.ctx, t = c.currentTime, g0 = this.gainFor(pos, d.vol === undefined ? .5 : d.vol, d.range || 16); if (g0 <= .01) return;
  const g = c.createGain(); g.connect(this.master); const dur = clamp(d.dur || .2, .02, 3), at = clamp(d.attack || .005, .001, 1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + at); g.gain.exponentialRampToValueAtTime(.0001, t + at + dur);
  let src; if (d.noise) { src = c.createBufferSource(); src.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = d.freq || 1000; f.Q.value = d.q || 1; src.connect(f); f.connect(g); }
  else { src = c.createOscillator(); src.type = ['sine', 'square', 'sawtooth', 'triangle'].includes(d.wave) ? d.wave : 'square'; src.frequency.setValueAtTime(d.freq || 440, t); if (d.to) src.frequency.exponentialRampToValueAtTime(Math.max(20, d.to), t + at + dur); src.connect(g); }
  src.start(t); src.stop(t + at + dur + .05);
};
const MOD_PARTICLES = ['hit', 'crit', 'sweep', 'explosion', 'poof', 'flame', 'ice', 'slime', 'red', 'heart', 'spit', 'block', 'glow', 'totem', 'suck', 'potion', 'dust'];
const MOD_SOUNDS = 'hit_ crit_ hurt_ swing_ hat_ bass_ anvil_ glass_ explode_ chain_ bow_ arrowhit_ pop_ drink_ eat_ shield_ shieldbreak_ click_ levelup_ firework_ fizz_ splat_ smash_ spider_ reel_ death_ siren_'.split(' ');
const vec = o => o && typeof o === 'object' && isFinite(o.x) && isFinite(o.z);
const API = {
  // ---------- info ----------
  tick: () => G.tick, me: () => G.me, state: p => p.st,
  players: () => G.players().filter(t => t.alive && !t.spectator),
  isEnemy: (p, t) => !!t && t.id !== p.id && !(t.kind === 'mob' && t.owner === p.id) && !G.sameTeam(t.id, p.id),
  enemies: (p, r = 8) => otherTargets(p, r),
  enemiesAt(p, x, y, z, r = 4) { return otherTargets(p).filter(t => Math.hypot(t.x - x, t.y + t.h / 2 - y, t.z - z) <= r + t.w / 2); },
  allies: (p, r = 16) => G.players().filter(t => t !== p && t.alive && !t.spectator && G.sameTeam(t.id, p.id) && dist3(t, p) <= r),
  nearestEnemy: (p, r = 16) => nearestOf(p, otherTargets(p, r)),
  myMobs: p => [...G.mobs].filter(m => m.alive && m.owner === p.id),
  look: p => lookVec(p.yaw, p.pitch), forward: p => { const v = lookVec(p.yaw, 0); return { x: v.x, y: 0, z: v.z }; },
  eye: p => ({ x: p.x, y: p.y + p.eye, z: p.z }), dist: (a, b) => dist3(a, b), velocity: p => ({ x: p.vx || 0, y: p.vy || 0, z: p.vz || 0 }),
  hp: t => t ? t.hp : 0, maxHp: t => t ? (t.maxHp ? (typeof t.maxHp === 'function' ? t.maxHp() : t.maxHp) : 0) : 0,
  effectLevel: (t, name) => t && t.eff ? t.eff(name) : 0,
  blockAt(x, y, z) { const id = G.world.get(Math.floor(x), Math.floor(y), Math.floor(z)); const B = BL[id] || {}; return { id, solid: !!B.solid, lava: id === 39, air: id === 0 }; },
  groundY(x, z, fromY = 40) { for (let y = Math.floor(fromY); y > 0; y--) if (BL[G.world.get(Math.floor(x), y, Math.floor(z))].solid) return y + 1; return null; },
  raycast(p, maxDist = 20) {
    const o = API.eye(p), d = API.look(p); const wall = G.world.ray(o, d, maxDist, B => B.solid); const lim = wall ? wall.t : maxDist; let best = null, bt = lim;
    for (const t of otherTargets(p, maxDist + 2)) { const hw = t.w / 2 + .1; const h = rayAABB(o, d, { x0: t.x - hw, y0: t.y, z0: t.z - hw, x1: t.x + hw, y1: t.y + t.h, z1: t.z + hw }); if (h !== null && h < bt) { bt = h; best = t; } }
    return best;
  },
  rayBlock(p, maxDist = 30) { const o = API.eye(p), d = API.look(p); const h = G.world.ray(o, d, maxDist, B => B.solid); if (!h) return null; return { x: o.x + d.x * h.t, y: o.y + d.y * h.t, z: o.z + d.z * h.t, dist: h.t, block: { x: h.x, y: h.y, z: h.z } }; },
  // ---------- actions ----------
  damage(t, amount, o = {}) {
    if (!t || !t.alive) { DEV.log('warn', 'api.damage: 대상이 없거나 이미 죽었어요 (무시)', 'dmgnull'); return; }
    const byE = o.by && typeof o.by === 'object' ? o.by : null, by = byE ? byE.id : o.by; const from = vec(o.from) ? o.from : byE;
    let dx, dz; if (from) { dx = t.x - from.x; dz = t.z - from.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    const type = ['melee', 'magic', 'explosion', 'fire', 'mob'].includes(o.type) ? o.type : 'magic';
    G.damage(t, Math.max(0, +amount || 0), { type, by, dx, dz, kbx: +o.knockback || 0, nokb: !from, fx: from ? from.x : undefined, fz: from ? from.z : undefined });
    DEV.log('dmg', (byE ? byE.name : '?') + ' → ' + (t.name || t.type) + ' 피해 ' + (+amount).toFixed(1) + ' (' + type + ')', 'dmg' + by + t.id);
  },
  explode(p, x, y, z, radius = 3, damage = 6, o = {}) {
    const hit = API.enemiesAt(p, x, y, z, radius); for (const t of hit) { const d = Math.hypot(t.x - x, t.z - z), f = o.falloff === false ? 1 : clamp(1 - d / (radius + .5), .35, 1); API.damage(t, damage * f, { by: p, type: 'explosion', from: { x, z }, knockback: o.knockback === undefined ? 1.2 : o.knockback }); }
    if (o.self) { const d = Math.hypot(p.x - x, p.z - z); if (d <= radius) API.damage(p, damage * .5, { type: 'explosion', from: { x, z } }); }
    G.fx('explosion', x, y, z); if (o.sound !== false) G.sound('explode_', { x, y, z }, 24, 1); return hit;
  },
  knockback(t, from, strength = 1, up = 0) { if (!t || !t.alive || !vec(from)) return; const dx = t.x - from.x, dz = t.z - from.z, l = Math.hypot(dx, dz) || 1; const o = { k: 'kb', t: t.id, dx: r1(dx / l), dz: r1(dz / l), s: clamp(+strength || 0, 0, 4), up: clamp(+up || 0, 0, 1.5) }; if (t.local) G.applyKb(t, o); else NET.emit(o); },
  stun(t, seconds = 2) { if (!t || t.kind === 'mob') return; const s = clamp(+seconds || 0, .1, 6); API.effect(t, 'slowness', 10, s); API.effect(t, 'weakness', 5, s); API.effect(t, 'glowing', 1, s); },
  addMaxHp(p, n) { if (!p || !p.local) return; p.st.modHp = clamp((p.st.modHp || 0) + (+n || 0), -18, 80); p.hp = Math.min(p.hp, p.maxHp()); },
  bonusDamage(p, n) { if (!p || !p.local) return; p.st.modDmg = clamp((p.st.modDmg || 0) + (+n || 0), -10, 20); },
  heal(p, n) { if (p && p.local && p.alive) p.hp = Math.min(p.maxHp(), p.hp + (+n || 0)); },
  effect(t, name, level = 1, seconds = 5) { if (!t) return; if (!EFF[name]) { DEV.log('warn', 'api.effect: 없는 효과 이름 "' + name + '" (쓸 수 있는 것: ' + Object.keys(EFF).join(', ') + ')', 'eff' + name); return; } if (t.kind === 'mob') return; if (t.local) t.addEff(name, Math.max(0, level - 1), seconds); else G.applyFx(t, [[name, Math.max(0, level - 1), seconds]]); },
  clearEffect(p, name) { if (p && p.local) p.clearEff(name); }, clearAllEffects(p) { if (p && p.local) p.effects = {}; },
  setFire(t, seconds = 4) { if (t && t.local && t.kind !== 'mob') t.fire = Math.max(t.fire || 0, Math.round(seconds * 20)); },
  push(p, vx, vy, vz) { if (!p || !p.local) return; p.vx += vx || 0; p.vy += vy || 0; p.vz += vz || 0; if (vy > 0) p.onGround = false; p.fallDist = 0; },
  setVelocity(p, vx, vy, vz) { if (!p || !p.local) return; p.vx = vx || 0; p.vy = vy || 0; p.vz = vz || 0; if (vy > 0) p.onGround = false; p.fallDist = 0; },
  dash(p, power = 1.2, up = .25) { const d = lookVec(p.yaw, 0); API.push(p, d.x * power, up, d.z * power); },
  teleport(p, x, y, z) { if (!p || !p.local) return; p.x = p.px = x; p.y = p.py = y; p.z = p.pz = z; p.vx = p.vy = p.vz = 0; p.fallDist = 0; },
  blink(p, dist = 6) { const d = lookVec(p.yaw, 0); let k = 0; for (let s = .5; s <= dist; s += .5) { const x = p.x + d.x * s, z = p.z + d.z * s; if (G.world.solidAt(x, p.y + .1, z) || G.world.solidAt(x, p.y + 1.5, z)) break; k = s; } API.teleport(p, p.x + d.x * k, p.y, p.z + d.z * k); return k; },
  shootArrow(p, power = 3, o = {}) { const d = API.look(p); G.spawnArrow(p, API.eye(p), d, clamp(power, .2, 6), { crit: !!o.crit, potion: !!o.potion, noPick: true }); AU.sfx('bow', p, .7); },
  projectile(p, o = {}) {
    const d = o.dir || API.look(p), sp = clamp(o.speed === undefined ? 1.2 : +o.speed, .05, 4), e = API.eye(p);
    const q = { owner: p, x: e.x + d.x * .6, y: e.y + d.y * .6 - .1, z: e.z + d.z * .6, vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, gravity: o.gravity === undefined ? .01 : +o.gravity, size: clamp(o.size || .3, .05, 2),
      damage: +o.damage || 0, type: o.type || 'magic', knockback: +o.knockback || 0, life: Math.round(clamp(o.life || 3, .1, 10) * 20), color: o.color || [1, .6, .2], trail: o.trail || 2, pierce: !!o.pierce,
      onHit: o.onHit, onBlock: o.onBlock, onExpire: o.onExpire, hitIds: new Set(), age: 0 };
    MOD.proj.push(q); return q;
  },
  spawnMob(type, p, x, y, z, seconds = 15) { if (!MOBT[type]) { DEV.log('warn', 'api.spawnMob: 몹 종류는 spider / cave / big / dog 만 돼요 ("' + type + '")'); return null; } const m = G.spawnMob(type, p, x, y, z); m.life = Math.round(seconds * 20); return m; },
  particles(type, x, y, z, n = 6, color) { if (!MOD_PARTICLES.includes(type)) { DEV.log('warn', 'api.particles: 없는 종류 "' + type + '" → dust로 대신해요 (' + MOD_PARTICLES.join(' ') + ')', 'pt' + type); type = 'dust'; } if (color || type === 'dust') G.particles(type, x, y, z, n, color); else G.fx(type, x, y, z); },
  line(a, b, color = [1, 1, .6], step = .4) { const L = dist3(a, b); for (let s = 0; s <= L; s += step) { const k = L ? s / L : 0; G.particles('dust', a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, 1, color); } },
  ring(x, y, z, r = 2, color = [1, 1, 1], n = 24) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; G.particles('dust', x + Math.cos(a) * r, y, z + Math.sin(a) * r, 1, color); } },
  sound(name, at, range = 20, vol = 1) {
    if (MOD.sounds[name]) { AU.play(name, { pos: at || null, range, gain: vol }); return; }
    const base = String(name).replace(/_$/, ''); if (!SOUNDS[name] && !MOD_SOUNDS.includes(name) && !MOD_SOUNDS.includes(base + '_')) { DEV.log('warn', 'api.sound: 없는 소리 "' + name + '" (기본 효과음은 끝에 _ 가 붙어요: ' + MOD_SOUNDS.slice(0, 8).join(' ') + ' …)', 'snd' + name); return; }
    G.sound(MOD_SOUNDS.includes(base + '_') ? base + '_' : name, at || null, range, vol);
  },
  synth(d, at) { AU.synth(d || {}, at || null); },
  title(p, text, sub = '') { if (p === G.me) UI.title(text, sub, { fi: 5, st: 40, fo: 15 }); },
  actionbar(p, text) { p && p.actionbar && p.actionbar(text); },
  chat(text) { UI.chat(text); DEV.log('chat', String(text).replace(/§./g, '')); },
  log(text) { DEV.log('user', String(text)); },
  after(ticks, fn) { G.after(Math.max(1, ticks | 0), () => { try { fn(); } catch (e) { MOD.err('after', e); } }); },
  addItem(p, id, n = 1) { if (!ITEMS[id]) { DEV.log('warn', 'api.addItem: 없는 아이템 "' + id + '"'); return false; } return p.addItem(id, n); },
  removeItem(p, id, n = 1) { let k = 0; while (k < n && p.take(id, 1)) k++; return k; }, count(p, id) { return p.count(id); },
  cooldown(p, itemId) { const D = ITEMS[itemId]; return D && D.group ? p.cdLeft(D.group) / 20 : 0; },
  setCooldown(p, itemId, sec) { const D = ITEMS[itemId]; if (D && D.group) p.setCd(D.group, sec); else DEV.log('warn', 'api.setCooldown: 쿨타임이 있는 능력 아이템이 아니에요 "' + itemId + '"'); },
  useItem(p, itemId) { if (!p.inv) return false; const i = p.inv.findIndex(s => s && s.id === itemId); if (i < 0) return false; const s0 = p.sel; p.sel = i; const r = p.usePress(); p.sel = s0; return r === 'used'; },
  random: (a = 0, b = 1) => a + Math.random() * (b - a), chance: pct => Math.random() * 100 < pct,
};
// in the dev tool, unknown api.xxx calls are logged (and recorded for the 구현 메모) instead of crashing
const APVP = window.APVP = {
  version: DEV_VER, addJob: d => MOD.addJob(d), addSound: (n, d) => MOD.addSound(n, d),
  api: typeof Proxy === 'function' ? new Proxy(API, { get(o, k) { if (k in o || typeof k === 'symbol' || k === 'then' || k === 'toJSON') return o[k]; MOD.missingApi(String(k)); return () => undefined; } }) : API,
};
// ===================== dev tool panel (only when window.APVP_DEV) =====================
const DEV = {
  on: !!window.APVP_DEV, jobReq: '', sysReq: '', code: '', memo: '', logs: [], last: {},
  ICON: { ok: '✅', error: '❌', warn: '⚠️', skill: '✨', dmg: '💥', event: '📌', chat: '💬', user: '📝', info: 'ℹ️' },
  log(level, msg, key) {
    if (!this.on) return; const t = new Date(), stamp = t.toTimeString().slice(0, 8) + (G.phase === 'game' ? ' t' + G.tick : '');
    if (key) { const L = this.last[key]; if (L && G.tick - L.tick < 20 && L.msg === msg) { L.n++; L.tick = G.tick; this.render(); return; } }
    const e = { stamp, level, msg, n: 1, tick: G.tick }; this.logs.push(e); if (key) this.last[key] = e; if (this.logs.length > 800) this.logs.splice(0, this.logs.length - 800); this.render();
  },
  text(onlyErr) { return this.logs.filter(e => !onlyErr || e.level === 'error' || e.level === 'warn').map(e => '[' + e.stamp + '] ' + (this.ICON[e.level] || '') + ' ' + e.msg + (e.n > 1 ? ' ×' + e.n : '')).join('\n'); },
  render() { const el = $('devLog'); if (!el || this._r) return; this._r = requestAnimationFrame(() => { this._r = 0; const f = $('devFilter') ? $('devFilter').value : 'all'; el.textContent = this.logs.filter(e => f === 'all' || (f === 'err' ? e.level === 'error' || e.level === 'warn' : e.level === f)).slice(-300).map(e => '[' + e.stamp + '] ' + (this.ICON[e.level] || '') + ' ' + e.msg + (e.n > 1 ? ' ×' + e.n : '')).join('\n'); el.scrollTop = el.scrollHeight; }); },
  verOf(txt) { const m = String(txt).slice(0, 400).match(/개발 도구 v(\d+)/); return m ? +m[1] : 0; },
  parse(txt) {
    const MK = ['=====새 직업 요청 원문=====', '=====JS 코드=====', '=====기존 직업·시스템 변경 요청 원문=====', '=====구현 메모=====', '=====효과음=====', '=====필요했던 API', '=====개발 도구 로그', '=====끝====='];
    const sec = a => { const i = txt.indexOf(a); if (i < 0) return null; let j = txt.length; for (const m of MK) { const k = txt.indexOf(m, i + a.length); if (k >= 0 && k < j) j = k; } return txt.slice(i + a.length, j).trim(); };
    let code = sec(MK[1]);
    if (code === null) { const m = txt.match(/```(?:js|javascript)?\s*([\s\S]*?)```/); code = m ? m[1] : (/APVP\.addJob/.test(txt) ? txt : ''); }
    code = (code || '').replace(/^```(?:js|javascript)?\s*/, '').replace(/```\s*$/, '').trim();
    return { job: sec(MK[0]) || '', code, sys: sec(MK[2]) || '', memo: (sec(MK[3]) || '').split(/\n?\[개발 도구 자동/)[0].replace(/^\[AI 메모\]\n/, '').trim(), snd: sec(MK[4]) };
  },
  async apply(txt) {
    const P = this.parse(txt); { const v = DEV.verOf(txt); if (v && v < DEV_VER) this.log('warn', '이 결과물은 예전 프롬프트(v' + v + ')로 만들어졌어요. 지금 최신은 v' + DEV_VER + ' — 새 기능(mc 아이템, 새 API)을 쓰려면 프롬프트를 다시 뽑아서 AI에게 고쳐 달라고 하세요'); else if (v) this.log('ok', '최신 프롬프트(v' + v + ')로 만든 결과물이에요'); }
    this.log('info', '붙여넣은 응답 분석: 새 직업 요청 ' + (P.job ? P.job.length + '자' : '없음') + ' · JS 코드 ' + (P.code ? P.code.split('\n').length + '줄' : '없음') + ' · 변경 요청 ' + (P.sys && P.sys !== '없음' ? P.sys.length + '자' : '없음') + ' · 구현 메모 ' + (P.memo && P.memo !== '없음' ? '있음' : '없음'));
    if (!P.code) { this.log('error', 'JS 코드를 찾지 못했어요. AI 응답 전체(=====새 직업 요청 원문===== 부터 =====끝===== 까지)를 붙여넣어 주세요.'); return false; }
    if (P.memo && P.memo !== '없음') { this.memo = P.memo; this.log('warn', 'AI 구현 메모: ' + P.memo.replace(/\n+/g, ' / ').slice(0, 400)); }
    if (P.snd) for (const line of P.snd.split('\n')) { const m = line.match(/^([^\s:]+)\s*:\s*(data:audio\/[^\s]+)/); if (m) await MOD.addSound(m[1], m[2]); }
    try {
      AU.init(); MOD.codeLines = P.code.split('\n'); const before = new Set(Object.keys(MOD.defs));
      new Function('APVP', 'api', P.code + '\n//# sourceURL=mod_job.js')(APVP, APVP.api);
      const ids = Object.keys(MOD.defs).filter(i => !before.has(i) || true); if (!ids.length) { this.log('error', '코드는 실행됐지만 APVP.addJob(...)이 한 번도 불리지 않았어요'); return false; }
      this.code = P.code; if (P.job) this.jobReq = P.job; if (P.sys) this.sysReq = P.sys; $('devJob').value = this.jobReq; $('devSys').value = this.sysReq;
      for (const m of this.analyze(P.code)) this.log('warn', '코드 분석 ' + m.replace(/^- /, '')); this.log('ok', '적용 완료 → 직업 목록 맨 끝에서 고르거나 "▶ 적용하고 연습 모드"를 누르세요'); UI.refreshMenu(); return true;
    } catch (e) { this.log('error', '코드 실행 오류: ' + e.message + MOD.where(e) + ' — "📋 오류 보고 복사"를 눌러 AI에게 보내면 고쳐 줘요'); return false; }
  },
  // static look at the code for API workarounds (what the AI had to fake) -> listed as needed APIs in the result memo
  analyze(code) {
    const L = [], c = code || ''; const has = re => re.test(c);
    if (has(/api\.damage\([^;]*?,\s*0?\.[0-4]\d*\s*,/)) L.push('- 근사: 아주 작은 피해(0.x)로 밀치기 → 피해 없이 다른 플레이어를 미는 API 필요 (지금은 api.knockback 있음)');
    if (has(/respawn|\.hp\s*<=\s*0|alive\s*===\s*false/) && has(/tick\s*\(/) && has(/api\.players\(\)/) && !has(/\bkill\s*\(/)) L.push('- 근사: 매 틱 플레이어 체력·위치를 비교해서 처치 감지 → 처치 이벤트 필요 (지금은 kill(p, victim, pos) 이벤트 있음)');
    if (has(/'slowness'\s*,\s*([7-9]|\d\d)/)) L.push('- 근사: 높은 구속 효과로 스턴 흉내 → 스턴 API 필요 (지금은 api.stun 있음)');
    if (has(/'health_boost'/) && has(/\d{3,}\s*\)/)) L.push('- 근사: 체력 증가 효과를 긴 시간으로 걸어 최대 체력 증가 흉내 → 최대 체력 API 필요 (지금은 api.addMaxHp 있음)');
    if (has(/hit\s*\([^)]*\)\s*\{[\s\S]{0,400}api\.after\([\s\S]{0,300}api\.damage/)) L.push('- 근사: 근접 적중 뒤 지연 추가 피해로 날카로움 흉내 → 근접 공격력 보너스 API 필요 (지금은 api.bonusDamage 있음)');
    if (has(/particles\([^)]*\)[\s\S]{0,200}particles\([^)]*\)/) && has(/모습|모델|돼지|pig/i)) L.push('- 근사: 입자로 생물/물체 모양 흉내 → 커스텀 3D 모델(블록 모델) API 필요');
    if (has(/setTimeout|setInterval|document\.|window\./)) L.push('- 규칙 위반 의심: setTimeout/document/window 사용 → api.after 등으로 바꿔야 함');
    return L;
  },
  // one list for the developer: which game APIs this job needed (AI memo lines + calls to missing APIs during testing + workarounds found in the code)
  neededApi() {
    const out = [], seen = new Set(), add = t => { t = t.trim(); if (t && !seen.has(t)) { seen.add(t); out.push(t); } };
    for (const l of String(this.memo || '').split('\n')) if (/필요한 API|있으면 좋은 API/.test(l)) add('- [AI] ' + l.replace(/^\s*-\s*/, ''));
    for (const [k, n] of Object.entries(MOD.missing)) add('- [테스트 중 호출됨] api.' + k + '(...) ×' + n + ' — 게임에 없는 함수');
    for (const l of this.analyze(this.code)) add('- [코드 분석] ' + l.replace(/^- /, ''));
    return out.length ? out.join('\n') : '없음 (추가로 필요한 API가 기록되지 않았어요)';
  },
  memoText() {
    const auto = Object.entries(MOD.missing).map(([k, n]) => '- 테스트 중 없는 API 호출: api.' + k + '(...) ×' + n + ' (게임에 이 기능이 필요해요)');
    const ana = this.analyze(this.code);
    const parts = []; if (this.memo && this.memo !== '없음') parts.push('[AI 메모]\n' + this.memo); if (auto.length) parts.push('[개발 도구 자동 기록 · 실행 중]\n' + auto.join('\n')); if (ana.length) parts.push('[개발 도구 자동 분석 · 코드에서 찾은 우회 구현 = 필요했던 API]\n' + ana.join('\n'));
    return parts.join('\n\n') || '없음';
  },
  prompt() {
    const jr = $('devJob').value.trim(), sr = $('devSys').value.trim(); const snds = Object.keys(MOD.sounds);
    return DEV_PROMPT.replace('{{VER}}', DEV_VER).replace('{{JOB}}', jr || '(여기에 만들고 싶은 직업과 능력을 자유롭게 적어 주세요)').replace('{{SYS}}', sr || '없음').replace('{{SOUNDS}}', snds.length ? snds.join(', ') : '(아직 없음)').replace('{{BUILTIN}}', DEV_BUILTIN()).replace('{{EFFECTS}}', Object.keys(EFF).join(', ')).replace('{{PARTICLES}}', MOD_PARTICLES.join(' ')).replace('{{BSOUNDS}}', MOD_SOUNDS.join(' ')).replace('{{ITEMS}}', ['iron_sword', 'dia_sword', 'bow', 'arrow', 'shield', 'slimeball', 'pot_heal', 'pot_swift', 'pot_res', 'pot_fire'].map(i => i + '(' + ITEMS[i].name + ')').join(', '));
  },
  errorReport() {
    return '개발 도구에서 아래 오류/경고가 났어요. 같은 출력 형식(=====새 직업 요청 원문===== … =====끝=====)으로 고친 전체 답을 다시 주세요.\n\n[오류 · 경고 로그]\n' + (this.text(true) || '(없음)') + '\n\n[지금 코드]\n```js\n' + (this.code || $('devResp').value.trim()) + '\n```';
  },
  result() {
    const jr = $('devJob').value.trim() || this.jobReq, sr = $('devSys').value.trim() || this.sysReq;
    return '4중인격 능력 PvP · 커스텀 직업 결과물 (개발 도구 v' + DEV_VER + ' · 프롬프트 v' + DEV_VER + ' · 최신)\n만든 날짜: ' + new Date().toLocaleString() + '\n\n=====새 직업 요청 원문=====\n' + (jr || '(없음)') + '\n\n=====JS 코드=====\n```js\n' + (this.code || $('devResp').value.trim()) + '\n```\n\n=====기존 직업·시스템 변경 요청 원문=====\n' + (sr || '없음') + '\n\n=====구현 메모=====\n' + this.memoText() + '\n\n=====필요했던 API (개발자용 메모)=====\n' + this.neededApi() + '\n\n=====효과음=====\n' + (Object.entries(MOD.sounds).map(([n, d]) => n + ': ' + d).join('\n') || '(없음)') + '\n\n=====개발 도구 로그 (오류 · 경고)=====\n' + (this.text(true) || '(없음)') + '\n=====끝=====\n';
  },
  save(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); },
  async copy(text, what) {
    let ok = false; try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { }
    if (!ok) { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); }
    this.log(ok ? 'ok' : 'error', ok ? what + ' 복사했어요 (' + text.length + '자)' : '복사 실패 — 로그 칸을 길게 눌러 직접 선택해 주세요');
  },
  init() {
    document.body.classList.add('devmode'); $('devPanel').classList.remove('hide'); $('devBanner').classList.remove('hide');
    $('devPrompt').onclick = () => { this.save('apvp4_ai_prompt.txt', this.prompt()); this.log('ok', '프롬프트 txt 저장 (apvp4_ai_prompt.txt). 이 파일을 내 AI에 첨부하거나 내용을 붙여넣으세요.'); };
    $('devCopy').onclick = () => this.copy(this.prompt(), '프롬프트를');
    $('devApply').onclick = () => this.apply($('devResp').value);
    $('devPlay').onclick = async () => { const ok = $('devResp').value.trim() ? await this.apply($('devResp').value) : true; const ids = Object.keys(MOD.defs); if (!ok || !ids.length) return; UI.job = ids[ids.length - 1]; UI.jobT = Date.now(); UI.botCount = +$('devBots').value || 1; this.log('info', '연습 모드 시작: ' + JOBS[UI.job].name + ' · 봇 ' + UI.botCount + '명'); UI.enter(true); };
    $('devResult').onclick = () => { if (!this.code && !$('devResp').value.trim()) { this.log('error', '먼저 AI 응답을 붙여넣고 적용해 주세요'); return; } this.save('apvp4_result_' + (Object.keys(MOD.defs).slice(-1)[0] || 'job') + '.txt', this.result()); this.log('ok', '최종 결과물 txt 저장 — 이 파일을 개발자(Claude)에게 보내 주세요'); };
    $('devSnd').onchange = async e => { for (const f of e.target.files) { if (f.size > 3e6) { this.log('error', f.name + ': 3MB 이하 파일만 넣을 수 있어요'); continue; } const d = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }); AU.init(); const n = await MOD.addSound(f.name.replace(/\.[^.]+$/, ''), d); this.log('ok', '효과음 추가: ' + n + ' → 코드에서 api.sound("' + n + '", p)'); } e.target.value = ''; this.sndList(); };
    $('devVer').textContent = '📌 프롬프트 · 결과물 버전 v' + DEV_VER + ' (최신) — 예전 버전 프롬프트로 만든 결과물은 불러올 때 알려 줘요';
    $('devFold').onclick = () => $('devPanel').classList.toggle('fold');
    $('devFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const txt = await f.text(); this.log('info', '파일 불러옴: ' + f.name + ' (' + Math.round(f.size / 1024) + 'KB)'); $('devResp').value = txt; await this.apply(txt); };
    for (const [id, k] of [['devGod', 'god'], ['devNoAI', 'noai']]) { const c = $(id); c.onchange = () => UI.setTest(k, c.checked); }
    $('devLogCopy').onclick = () => this.copy(this.text(false), '전체 로그를'); $('devErrCopy').onclick = () => this.copy(this.errorReport(), 'AI에게 보낼 오류 보고를');
    $('devLogClear').onclick = () => { this.logs = []; this.last = {}; this.render(); }; $('devFilter').onchange = () => this.render();
    this.log('info', '개발 도구 준비됨 · 게임 버전 ' + document.title + ' · API v' + APVP.version + ' · 효과 ' + Object.keys(EFF).length + '종 · 기본 직업 ' + JOB_ORDER.length + '개');
    this.sndList();
  },
  sndList() { const el = $('devSnds'); el.innerHTML = Object.keys(MOD.sounds).map(n => '<span class="devsnd">🔊 ' + esc(n) + ' <button data-n="' + esc(n) + '" class="dplay">▶</button><button data-n="' + esc(n) + '" class="ddel">✕</button></span>').join('') || '<small>추가한 효과음 없음</small>'; for (const b of el.querySelectorAll('.dplay')) b.onclick = () => { AU.init(); MOD.decodeAll().then(() => AU.play(b.dataset.n, {})); }; for (const b of el.querySelectorAll('.ddel')) b.onclick = () => { delete MOD.sounds[b.dataset.n]; delete AU.buf[b.dataset.n]; this.sndList(); }; },
};
// ---- in-game popup: download the dev tool (this same game + APVP_DEV flag) ----
function devToolHTML() { const src = SELF_HTML || ''; const flag = '<script>window.APVP_DEV=1<\/script>'; return src.replace(/<head([^>]*)>/i, m => m + flag); }
// split build: fetch index.html + every css/js file it links and inline them, so the downloaded dev tool is one self-contained file
async function devToolHTMLMulti() {
  const base = document.baseURI.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); const get = async u => { const r = await fetch(new URL(u, base)); if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); };
  let h = await get('index.html');
  for (const m of [...h.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]) h = h.split(m[0]).join('<style>\n' + await get(m[1]) + '<\/style>');
  const tags = [...h.matchAll(/<script src="([^"]+)"><\/script>\n?/g)]; let code = ''; for (const m of tags) code += await get(m[1]) + '\n';
  h = h.split('<script>window.SITE_MULTI=1<\/script>').join(''); tags.forEach((m, i) => { h = h.split(m[0]).join(i === 0 ? '@@CODE@@' : ''); });
  h = h.split('@@CODE@@').join('<script>\n' + code + '<\/script>\n');
  return h.replace(/<head([^>]*)>/i, m => m + '<script>window.APVP_DEV=1<\/script>');
}
function devDownload() { if (window.SITE_MULTI) { devToolHTMLMulti().then(html => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); a.download = 'apvp4_devtool.html'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }).catch(e => alert('개발 도구를 만들지 못했어요: ' + e.message)); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([devToolHTML()], { type: 'text/html;charset=utf-8' })); a.download = 'apvp4_devtool.html'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); }
function DEV_BUILTIN() {
  const L = [];
  for (const id of JOB_ORDER) { const J = JOBS[id]; if (!J || J.custom) continue; L.push('- ' + J.name + ' (' + id + ', 체력 ' + (id === 'slime' || id === 'dude' ? 40 : 20) + '): ' + J.kit.filter(Boolean).map(k => { const D = ITEMS[k[0]]; return D.name + (D.dmg ? ' 공격력 ' + D.dmg + '/공속 ' + D.spd : '') + (D.cd ? ' 쿨 ' + D.cd + '초' : '') + (D.lore ? ' — ' + D.lore : ''); }).join(' | ')); }
  return L.join('\n');
}
