// ===================== game state =====================
const MOB_TYPES = ['spider', 'cave', 'big', 'dog'];
const VIG_W = 3, VIG_N = 23; // 다 부셔버려: half-width (7 wide) and length
const PAD_POS = { red: [21, 21, 13], lime: [66, 21, 24], purple: [9, 21, 46], blue: [48, 21, 59] };
const PAD_ORDER = ['red', 'lime', 'purple', 'blue'];
const PAD_KO = { red: '빨강', lime: '연두', purple: '보라', blue: '파랑' };
const G = {
  tick: 0, phase: 'menu', world: null, me: null, bots: [], remotes: new Map(), mobs: [], rmobs: new Map(), arrows: [], drops: [], chains: [], parts: [], timers: [], ices: [], vigs: [], pigs: [], dancers: new Map(), cut: null, domains: [], ghosts: [], dashFx: new Map(), fangs: [], fangLines: [], zones: [], fangHit: new Map(),
  match: false, winShown: false, kills: {}, mobN: 0, fangN: 0, arrowN: 0, dropN: 0, practice: false, nid: uid(6),
  pads: PAD_ORDER.map(k => ({ x: PAD_POS[k][0], y: PAD_POS[k][1], z: PAD_POS[k][2], k })),
  initWorld() { const [sx, sy, sz] = MAPDATA.size; this.world = new World(sx, sy, sz); this.world.loadRLE(MAPDATA.rle); this.orig = this.world.b.slice(); },
  resetWorld() { this.world.b.set(this.orig); for (let i = 0; i < this.world.cx * this.world.cy * this.world.cz; i++) this.world.dirty.add(i); this.ices = []; this.vigs = []; this.fangs = []; this.fangLines = []; this.zones = []; this.fangHit.clear(); MOD.proj = []; this.pigs = []; this.dancers.clear(); this.cut = null; this.domains = []; this.ghosts = []; this.dashFx.clear(); },
  // ---------- entity queries ----------
  players() {
    const a = []; if (this.phase === 'game' && this.me) a.push(this.me); for (const b of this.bots) a.push(b);
    for (const r of this.remotes.values()) if (r.ph === 'game') a.push(r); return a;
  },
  targets() { const a = this.players().filter(p => p.alive && !p.spectator); for (const m of this.mobs) if (m.alive) a.push(m); for (const m of this.rmobs.values()) a.push(m); return a; },
  entity(id) { if (!id) return null; for (const p of this.players()) if (p.id === id) return p; for (const m of this.mobs) if (m.id === id) return m; return this.rmobs.get(id) || null; },
  // room settings, decided by the room host (방장): ffa = 개인전 (everyone is an enemy) / 팀전 (same persona = allies),
  // uniq = 직업당 1명 (first pick wins) / 여러 명 가능
  ffa: false, uniq: true, modeT: 0, since: Date.now(),
  setMode(ffa, t, uniq) { this.ffa = !!ffa; if (uniq !== undefined) this.uniq = !!uniq; this.modeT = t || Date.now(); UI.modeUI(); },
  roomArr() { return [this.ffa ? 1 : 0, this.modeT, this.uniq ? 1 : 0]; },
  // host: P2P host peer; otherwise whoever has been connected the longest; offline / practice: me
  isHost() {
    if (this.practice || NET.mode === 'off') return true; if (NET.mode === 'p2p') return NET.isHost;
    for (const r of this.remotes.values()) if (r.hs && (r.hs < this.since || (r.hs === this.since && r.id < this.nid))) return false; return true;
  },
  teamOf(id) {
    if (!id) return null; const p = this.players().find(p => p.id === id); if (p) return this.ffa ? p.id : p.persona;
    const m = this.mobs.find(m => m.id === id) || this.rmobs.get(id); if (m) return this.teamOf(m.owner);
    const r = [...this.remotes.values()].find(r => r.id === id); return r ? (this.ffa ? r.id : r.persona) : null;
  },
  sameTeam(a, b) { const ta = this.teamOf(a), tb = this.teamOf(b); return ta !== null && ta !== undefined && ta === tb; },
  jobOf(id) { const p = this.players().find(p => p.id === id) || [...this.remotes.values()].find(r => r.id === id); return p && JOBS[p.job] ? JOBS[p.job].name : '?'; },
  nameOf(id) {
    if (!id) return '?'; const e = this.players().find(p => p.id === id) || [...this.remotes.values()].find(r => r.id === id);
    if (!e) { const m = this.mobs.find(m => m.id === id) || this.rmobs.get(id); return m ? (m.type === 'dog' ? '개' : '거미') : '알 수 없음'; }
    const P = PERSONAS[e.persona] || PERSONAS[0]; return '§' + 'x' + P.color + '[' + P.name + '] §f' + e.name;
  },
  after(n, fn) { this.timers.push({ at: this.tick + n, fn }); },
  // ---------- messaging ----------
  emit(ev) { NET.emit(ev); },
  emitAndApply(ev) { this.onEvent(ev, this.me ? this.me.id : null, true); NET.emit(ev); },
  send(t, ev) { if (!t) return; if (t.local) this.localEvent(t, ev); else { ev.t = t.id; NET.emit(ev); } },
  localEvent(p, ev) {
    switch (ev.k) {
      case 'pol': if (p === this.me) SK.policeWarn(); break;
      case 'snd': AU.play(ev.n, p === this.me ? {} : { pos: p }); break;
      case 'pull': if (!p.st.rewind) p.st.pulled = { by: ev.by, t: 0 }; break;
      case 'suck': if (!p.st.rewind && !p.spectator) p.st.sucked = { by: ev.by, c: { x: ev.x, y: ev.y, z: ev.z }, t: 0 }; break;
      case 'fx': if (G.tick - (p.spawnT || -99) < 4) break; for (const e of ev.e) p.addEff(e[0], e[1], e[2]); break; // a hit that killed must not leave its debuff on the respawned player
    }
  },
  applyFx(t, effs) { if (!t || t.kind !== 'player') return; this.send(t, { k: 'fx', e: effs }); },
  sound(name, ent, mode, vol) {
    const pos = ent ? { x: ent.x, y: ent.y, z: ent.z } : null;
    const range = typeof mode === 'number' ? mode : 20;
    if (name.endsWith('_')) AU.sfx(name.slice(0, -1), pos, vol || 1); else AU.play(name, { pos, range, gain: vol });
    NET.emit({ k: 'snd', n: name, p: pos ? [r1(pos.x), r1(pos.y), r1(pos.z)] : 0, r: range !== 20 ? range : undefined, v: vol });
  },
  stopSound(name) { AU.stop(name); NET.emit({ k: 'sst', n: name }); },
  broadcastTitle(t, s, o) { UI.title(t, s, o); NET.emit({ k: 'title', a: t, b: s, o }); },
  fx(type, x, y, z) { this.particles(type, x, y, z); NET.emit({ k: 'pt', y: type, p: [r1(x), r1(y), r1(z)] }); },
  damage(t, amt, src) {
    if (!t || !t.alive) return;
    if (t.local) t.hurt(amt, src);
    else NET.emit({ k: 'd', t: t.id, a: r1(amt), s: { y: src.type, b: src.by, dx: r1(src.dx || 0), dz: r1(src.dz || 0), kx: r1(src.kbx || 0), ax: src.axe ? 1 : 0, fx: src.fx !== undefined ? r1(src.fx) : null, fz: src.fz !== undefined ? r1(src.fz) : null, nk: src.nokb || src.dx === undefined ? 1 : 0, nb: src.dx === undefined ? 1 : 0 } });
    if (this.me && src.by === this.me.id && src.type === 'melee') { AU.sfx(src.crit ? 'crit' : 'hit', t, .9); }
    if (amt >= 1) this.particles('hit', t.x, t.y + t.h * .6, t.z, 3);
  },
  // touch targeting: what is under the finger (generous hitbox)
  // PE touch: if the finger ray just misses, take the enemy closest to it (within ~15°) that is in melee reach
  pickNear(sx, sy) {
    const r = R.rayAt(sx, sy), me = this.me; if (!r || !me) return null; let best = null, ba = .26;
    for (const t of this.targets()) {
      if (t === me || t.id === me.id || this.sameTeam(t.id, me.id) || me.reachTo(t) > me.reach + .4) continue;
      const c = { x: t.x - r.o.x, y: t.y + t.h * .5 - r.o.y, z: t.z - r.o.z }, l = Math.hypot(c.x, c.y, c.z) || 1;
      const a = Math.acos(clamp((c.x * r.d.x + c.y * r.d.y + c.z * r.d.z) / l, -1, 1)); if (a < ba) { ba = a; best = t; }
    }
    return best ? { target: best } : null;
  },
  pickAt(sx, sy, grow) {
    const r = R.rayAt(sx, sy), me = this.me; if (!r || !me) return null;
    const bh = this.world.ray(r.o, r.d, 80, B => B.solid || B.ice);
    let best = null, bt = bh ? bh.t : 80;
    for (const t of this.targets()) { if (t === me || t.id === me.id) continue; const tt = rayAABB(r.o, r.d, t, bt, grow); if (tt !== null && tt < bt) { bt = tt; best = t; } }
    if (best) return { target: best };
    if (bh && bh.id === 40 && dist3({ x: bh.x + .5, y: bh.y + .5, z: bh.z + .5 }, { x: me.x, y: me.y + me.eye, z: me.z }) <= me.blockReach + .5) return { ice: bh };
    return null;
  },
  // ---------- spawners ----------
  spawnMob(type, owner, x, y, z) { const m = new Mob(owner.id + ':m' + (++this.mobN), type, owner.id, x, y, z); this.mobs.push(m); return m; },
  spawnArrow(owner, o, v, sp, opt) {
    const id = owner.id + ':a' + (++this.arrowN); const a = new Arrow(id, owner.id, o, v, sp, Object.assign({ local: true }, opt)); this.arrows.push(a);
    NET.emit({ k: 'arrow', id, o: [r1(o.x), r1(o.y), r1(o.z)], v: [r1(v.x * sp), r1(v.y * sp), r1(v.z * sp)], c: opt.crit ? 1 : 0, pt: opt.potion ? 1 : 0 });
  },
  spawnDrop(x, y, z, owner) { this.emitAndApply({ k: 'ball', id: owner.id + ':b' + (++this.dropN), p: [r1(x), r1(y), r1(z)] }); },
  breakIce(x, y, z, net) { if (this.world.get(x, y, z) !== 40) return; this.world.set(x, y, z, 0); this.particles('ice', x + .5, y + .5, z + .5, 8); AU.sfx('glass', { x, y, z }, .8); if (net) NET.emit({ k: 'iceb', x, y, z }); },
  // knockback without damage (mod api.knockback): MC knock + optional lift
  applyKb(e, o) { if (e.knock) e.knock(o.s, o.dx, o.dz, 0); else { const l = Math.hypot(o.dx, o.dz) || 1; e.vx += o.dx / l * o.s; e.vz += o.dz / l * o.s; } if (o.up) { e.vy = Math.max(e.vy, o.up); e.onGround = false; } },
  // ---------- events ----------
  onEvent(ev, from, self) {
    const me = this.me;
    const forMe = ev.t && me && ev.t === me.id;
    switch (ev.k) {
      case 'kb': { const e = forMe ? me : this.mobs.find(m => m.id === ev.t); if (e) G.applyKb(e, ev); break; }
      case 'd': {
        const s = ev.s || {}; const src = { type: s.y, by: s.b, kbx: s.kx, axe: !!s.ax, nokb: !!s.nk };
        if (!s.nb) { src.dx = s.dx; src.dz = s.dz; } if (s.fx !== null && s.fx !== undefined) { src.fx = s.fx; src.fz = s.fz; }
        if (forMe) me.hurt(ev.a, src);
        else { const m = this.mobs.find(m => m.id === ev.t); if (m) m.hurt(ev.a, src); }
        break;
      }
      case 'fx': case 'pol': case 'pull': case 'suck': if (forMe) this.localEvent(me, ev); break;
      case 'snd':
        if (ev.t && !forMe) break;
        if (ev.t) { AU.play(ev.n, {}); break; }
        { const pos = ev.p ? { x: ev.p[0], y: ev.p[1], z: ev.p[2] } : null; if (ev.n.endsWith('_')) AU.sfx(ev.n.slice(0, -1), pos, ev.v || 1); else AU.play(ev.n, { pos, range: ev.r || 20, gain: ev.v }); }
        break;
      case 'sst': AU.stop(ev.n); break;
      case 'title': UI.title(ev.a, ev.b, ev.o); break;
      case 'pt': this.particles(ev.y, ev.p[0], ev.p[1], ev.p[2]); break;
      case 'ice': this.placeIce(ev.x, ev.y, ev.z, ev.by); break;
      case 'iceb': this.breakIce(ev.x, ev.y, ev.z, false); break;
      case 'fang': SK.fangSpawn(ev); break;
      case 'rmark': this.zones.push({ x: ev.x, y: ev.y, z: ev.z, r: SK.MARK_R, by: ev.by, t0: this.tick }); break; // 러셔 번개 자국
      case 'dance': // dude 댄스 on/off (t0: local clock, so the dance + song start together on every client)
        if (ev.on) this.dancers.set(ev.by, { t0: performance.now(), yaw: ev.yaw || 0, frogs: [] });
        else { const d = this.dancers.get(ev.by); if (d) for (const f of d.frogs) this.particles('poof', f.x, f.y + .6, f.z, 6); this.dancers.delete(ev.by); }
        break;
      case 'gshot': SK.srLine({ x: ev.a[0], y: ev.a[1], z: ev.a[2] }, { x: ev.b[0], y: ev.b[1], z: ev.b[2] }, [1, .92, .6], .35); this.particles('crit', ev.b[0], ev.b[1], ev.b[2], 4); break;
      case 'gcut': { // 권총 hit: the shooter and the target see the 컷씬, everyone else just hears the shot
        const mine = me && (ev.by === me.id || ev.tid === me.id), pos = { x: ev.b[0], y: ev.b[1], z: ev.b[2] };
        if (mine) { this.cut = { t0: performance.now(), by: ev.by, tid: ev.tid, a: ev.a, b: ev.b }; if (ev.tid === me.id) { me.st.cutUntil = this.tick + Math.round((SK.CUT_T[0] + SK.CUT_T[1] + SK.CUT_T[2]) * 20); if (!self) this.after(3, () => { if (me.alive && me.st.cutUntil > this.tick) this.emitAndApply({ k: 'gcutx', by: ev.by, tid: me.id }); }); } AU.play('dudeshot', {}); } // the shot (sent right after) didn't kill me -> cancel
        else AU.play('dudeshot', { pos, range: 40 });
        break;
      }
      case 'gcutx': SK.onGunCancel(ev); break;
      case 'dfrog': { const d = this.dancers.get(ev.by); if (d && d.frogs.length < 40) { d.frogs.push({ x: ev.x, y: ev.y, z: ev.z, yaw: ev.yaw || 0, s0: performance.now() }); this.particles('poof', ev.x, ev.y + .4, ev.z, 5); } break; }
      case 'srpig': this.pigs.push({ x: ev.x, y: ev.y, z: ev.z, by: ev.by, yaw: ev.yaw || 0, t0: this.tick }); break;
      case 'srbeam': SK.srLine({ x: ev.a[0], y: ev.a[1], z: ev.a[2] }, { x: ev.b[0], y: ev.b[1], z: ev.b[2] }, ev.c || [1, .15, .15], .3); this.particles('glow', ev.b[0], ev.b[1], ev.b[2]); break;
      case 'srdomain': this.domains = this.domains.filter(d => d.by !== ev.by); this.domains.push({ x: ev.x, y: ev.y, z: ev.z, r: 5, by: ev.by, tid: ev.tid, t0: this.tick }); break;
      case 'dfx': this.dashFx.set(ev.id, this.tick + 8); break;
      case 'vig': this.vigs.push({ x: ev.x, y: ev.y, z: ev.z, d: ev.d, t: 0, backup: [], by: ev.by, hit: new Set() }); break;
      case 'chain': this.chains.push({ o: { x: ev.o[0], y: ev.o[1], z: ev.o[2] }, d: { x: ev.d[0], y: ev.d[1], z: ev.d[2] }, l: ev.l === undefined ? 20 : ev.l, t: 0 }); break;
      case 'arrow': if (!self) { const a = new Arrow(ev.id, from, { x: ev.o[0], y: ev.o[1], z: ev.o[2] }, { x: ev.v[0], y: ev.v[1], z: ev.v[2] }, 1, { crit: ev.c, potion: ev.pt }); this.arrows.push(a); } break;
      case 'ae': { const a = this.arrows.find(a => a.id === ev.id); if (a) a.dead = true; break; }
      case 'ball': this.drops.push({ id: ev.id, x: ev.p[0], y: ev.p[1], z: ev.p[2], vy: .3, born: this.tick, life: 100 }); break;
      case 'bp': this.drops = this.drops.filter(d => d.id !== ev.id); break;
      case 'gex': {
        const c = { x: ev.x, y: ev.y, z: ev.z };
        for (const t of [this.me, ...this.bots]) { if (!t || t.id === ev.by || !t.alive || t.spectator) continue;
          if (G.sameTeam(t.id, ev.by)) continue;
          if (t.st.pulled && t.st.pulled.by === ev.by) t.st.pulled.ex = c; else if (dist3(t, c) <= 3) SK.gexHit(t, c, ev.by); }
        for (const m of this.mobs) if (m.alive && dist3(m, c) <= 3) m.hurt(6, { type: 'explosion', by: ev.by, nokb: true });
        break;
      }
      case 'death': this.deathMsg(ev.v, ev.by, ev.c, ev.p ? { x: ev.p[0], y: ev.p[1], z: ev.p[2] } : null); break;
      case 'start': if (ev.fm) this.setMode(ev.fm[0], ev.fm[1], ev.fm[2]); this.startMatch(false); break;
      case 'mode': if (!this.isHost()) this.setMode(ev.ffa, ev.t, ev.uniq); break;
      case 'chat': UI.chat('<' + this.nameOf(from) + '§f> ' + String(ev.m).slice(0, 120), true); break;
    }
  },
  onPresence(peer, pres, first) {
    if (pres.fm && pres.H && !this.isHost() && (pres.fm[0] !== (this.ffa ? 1 : 0) || pres.fm[2] !== (this.uniq ? 1 : 0))) this.setMode(pres.fm[0], pres.fm[1], pres.fm[2]); // follow the host's room settings
    if (pres.uj) UPJ.onPresence(pres);
    let r = this.remotes.get(peer);
    if (!r) { r = new Remote(peer, pres); this.remotes.set(peer, r); }
    else { const was = r.ph; r.upd(pres); if (was !== 'game' && r.ph === 'game' && this.phase === 'game') UI.chat('§e' + r.name + ' 님이 아레나에 들어왔습니다'); }
    // remote mobs
    const keep = new Set();
    for (const m of (r.ph === 'game' ? r.mobs : [])) {
      const id = r.id + ':m' + m[0]; keep.add(id); let o = this.rmobs.get(id);
      const type = MOB_TYPES[m[1]]; const T = MOBT[type]; if (!T) continue;
      if (!o) { o = { id, type, owner: r.id, kind: 'mob', local: false, alive: true, x: m[2], y: m[3], z: m[4], yaw: m[5], w: T.w * T.sc, h: T.h * T.sc, tx: m[2], ty: m[3], tz: m[4], hurtTime: 0 }; this.rmobs.set(id, o); }
      o.tx = m[2]; o.ty = m[3]; o.tz = m[4]; o.yaw = m[5]; o.seen = performance.now(); if (m[6]) o.hurtTime = 6;
    }
    for (const [id, o] of this.rmobs) if (o.owner === r.id && !keep.has(id)) this.rmobs.delete(id);
    UI.menuDirty = true;
  },
  onLeave(peer, pres) {
    const r = this.remotes.get(peer); if (!r) return; this.remotes.delete(peer);
    for (const j of this.ices) if (j.by === r.id) { this.clearIce(j, true); j.dead = true; } this.ices = this.ices.filter(j => !j.dead);
    for (const [id, o] of this.rmobs) if (o.owner === r.id) this.rmobs.delete(id);
    if (this.phase === 'game' && r.ph === 'game') UI.chat('§e' + r.name + ' 님이 나갔습니다');
    UI.menuDirty = true;
  },
  deathMsg(vid, kid, c, pos) {
    if (kid) this.kills[kid] = (this.kills[kid] || 0) + 1;
    this.domains = this.domains.filter(d => d.by !== vid); // 세룡이's space ends when its owner dies
    if (kid && kid !== vid) { const k = [this.me, ...this.bots].find(q => q && q.id === kid); if (k) { if (k.job === 'seryong') SK.srKill(k, pos); if (MOD.defs[k.job]) MOD.fire(k, 'kill', this.players().find(q => q.id === vid) || { id: vid }, pos || null); } }
    // 세룡이's space also ends when the enemy trapped in it dies (after srKill above, so the in-space kill bonus still counts):
    // the space disappears on every client and its owner loses the space's Regeneration III / Strength II
    for (const dm of this.domains) if (dm.tid === vid) {
      const o = [this.me, ...this.bots].find(q => q && q.id === dm.by && q.effects);
      if (o) { for (const [n, amp] of [['regeneration', 2], ['strength', 1]]) { const e = o.effects[n]; if (e && e.amp === amp) { if (e.hidden && e.hidden.t > 0) o.effects[n] = e.hidden; else delete o.effects[n]; } } o.actionbar && o.actionbar('§7귀멸의 세명컴고: 갇힌 적이 쓰러져서 공간이 사라졌어요'); }
    }
    this.domains = this.domains.filter(d => d.tid !== vid);
    if (UI.deathMode === 'hide') return;
    if (UI.deathMode !== 'full') {
      const tag = id => { const e = this.players().find(p => p.id === id) || [...this.remotes.values()].find(r => r.id === id); const P = PERSONAS[e ? e.persona : 0] || PERSONAS[0]; return '§x' + P.color + '[' + (e ? e.name : '?') + ']§7(' + this.jobOf(id) + ')§f'; };
      UI.chat(kid ? tag(kid) + ' -> ' + tag(vid) + ' 처치' : tag(vid) + ' 사망'); return;
    }
    const v = this.nameOf(vid), k = kid ? this.nameOf(kid) : null; let m;
    if (c === 'fall') m = k ? v + '§f이(가) ' + k + '§f에 의해 추락했습니다' : v + '§f이(가) 높은 곳에서 떨어졌습니다';
    else if (c === 'lava') m = k ? v + '§f이(가) ' + k + '§f에게서 도망치려다 용암에서 수영하려 했습니다' : v + '§f이(가) 용암에서 수영하려 했습니다';
    else if (c === 'fire') m = v + '§f이(가) 불에 타 죽었습니다';
    else if (c === 'void') m = v + '§f이(가) 세계 밖으로 떨어졌습니다';
    else if (c === 'explosion') m = k ? v + '§f이(가) ' + k + '§f에 의해 폭사했습니다' : v + '§f이(가) 폭발했습니다';
    else if (c === 'follower') m = v + '§f이(가) 팔로워 100명을 찍었습니다';
    else if (c === 'magic') m = k ? v + '§f이(가) ' + k + '§f의 마법에 살해당했습니다' : v + '§f이(가) 마법으로 살해당했습니다';
    else if (c === 'mob') { const ke = kid && (this.players().find(p => p.id === kid) || [...this.remotes.values()].find(r => r.id === kid)); m = ke && ke.job === 'summoner' ? v + '§f이(가) ' + k + '§f의 개에게 물려 죽었습니다' : v + '§f이(가) ' + (k || '') + '§f의 거미에게 살해당했습니다'; }
    else m = k ? v + '§f이(가) ' + k + '§f에게 살해당했습니다' : v + '§f이(가) 죽었습니다';
    UI.chat(m);
  },
  onDeath(p, killer, type) {
    const pos = { x: r1(p.x), y: r1(p.y), z: r1(p.z) }; this.deathMsg(p.id, killer, type, pos); NET.emit({ k: 'death', v: p.id, by: killer, c: type, p: [pos.x, pos.y, pos.z] });
    const hold = (p.st.cutUntil || 0) - this.tick; // 권총 컷씬 victim: still looks alive until the 컷씬 ends -> poof then
    if (hold > 0) this.after(hold, () => { this.particles('poof', p.x, p.y + 1, p.z, 12); AU.sfx('death', p); });
    else { this.particles('poof', p.x, p.y + 1, p.z, 12); AU.sfx('death', p); }
    if (p === this.me) { UI.hurtFlash(); if (UI.deathMode !== 'hide') UI.chat('§7사망 ' + (p.deaths + 1) + '회' + (this.match ? ' (11번째 사망 시 탈락)' : '')); }
    this.after(1, () => this.checkWin());
  },
  checkWin() {
    if (!this.match || this.winShown) return; const ps = this.players(); if (ps.length < 2) return;
    const alive = ps.filter(p => !p.spectator); if (!alive.length) return;
    const key = p => this.ffa ? p.id : p.persona;
    const teams = new Set(alive.map(key)); if (teams.size !== 1 || new Set(ps.map(key)).size < 2) return;
    this.winShown = true; const T = PERSONAS[alive[0].persona] || PERSONAS[0];
    UI.title(alive.length === 1 ? '§6' + alive[0].name + ' 승리!' : '§x' + T.color + T.name + ' §6팀 승리!', '§e마지막 생존' + (alive.length === 1 ? '자' : ' 팀'), { fi: 10, st: 100, fo: 20 }); AU.sfx('levelup', null);
  },
  startMatch(local) {
    if (local) NET.emit({ k: 'start', fm: this.roomArr() });
    this.match = true; this.winShown = false; this.kills = {};
    for (const p of [this.me, ...this.bots]) { if (!p) continue; p.deaths = 0; p.spectator = false; p.cds = {}; p.effects = {}; p.giveKit(true); p.respawn(); }
    this.mobs = []; this.arrows = []; this.drops = []; this.resetWorld();
    UI.title('§a경기 시작!', '부활 10회 · 11번째 사망 시 관전', { fi: 5, st: 50, fo: 15 }); AU.sfx('levelup', null);
  },
  // ice jail: lasts 98 ticks (4.9 s, wall-clock so it also expires while this tab is in the menu / throttled) and is
  // removed right away when its 얼빙 leaves the arena. Inside it: the owner gets Strength I, enemies get Weakness I.
  placeIce(x, y, z, by) {
    const cells = []; for (let h = 0; h < 4; h++) for (let k = -2; k <= 2; k++) { cells.push([x - 3, y + h, z + k], [x + k, y + h, z + 3], [x + 3, y + h, z + k], [x + k, y + h, z - 3]); }
    const placed = []; for (const [cx, cy, cz] of cells) if (this.world.get(cx, cy, cz) === 0) { this.world.set(cx, cy, cz, 40); placed.push([cx, cy, cz]); }
    AU.sfx('anvil', { x, y, z }, .6);
    this.ices.push({ x, y, z, by, placed, end: this.tick + 98, until: Date.now() + 4900 });
  },
  clearIce(j, fx) { for (const [cx, cy, cz] of j.placed) if (this.world.get(cx, cy, cz) === 40) { this.world.set(cx, cy, cz, 0); if (fx && Math.random() < .4) this.particles('ice', cx + .5, cy + .5, cz + .5, 3); } if (fx) AU.sfx('glass', { x: j.x, y: j.y, z: j.z }, .8); },
  iceTick() {
    if (!this.ices.length) return; const now = Date.now();
    const gone = j => this.tick >= j.end || now > j.until + 400 || (j.by && j.by !== (this.me && this.me.id) && !this.players().some(p => p.id === j.by));
    for (const j of this.ices) if (gone(j)) { this.clearIce(j, true); j.dead = true; }
    this.ices = this.ices.filter(j => !j.dead); if (this.phase !== 'game') return;
    for (const j of this.ices) for (const t of [this.me, ...this.bots]) {
      if (!t || !t.alive || t.spectator) continue;
      if (Math.abs(t.x - (j.x + .5)) >= 3 || Math.abs(t.z - (j.z + .5)) >= 3 || t.y < j.y - 1 || t.y >= j.y + 4) continue;
      if (t.id === j.by) { if (t.eff('strength') <= 1) t.addEff('strength', 0, 1.1); }
      else if (!this.sameTeam(t.id, j.by)) { if (t.eff('weakness') <= 1) t.addEff('weakness', 0, 1.1); }
    }
  },
  vigCells(v, k, f) {
    const F = [[0, 1], [-1, 0], [0, -1], [1, 0]][v.d]; const L = [-F[1], F[0]]; const fw = k + 1;
    for (let l = -VIG_W; l <= VIG_W; l++) for (let h = -20; h <= 20; h++) f(v.x + F[0] * fw + L[0] * l, v.y + h, v.z + F[1] * fw + L[1] * l);
  },
  tickVig(v) {
    v.t++; const W = this.world;
    if (v.t >= 45 && v.t < 45 + VIG_N) {
      const k = v.t - 45; let n = 0;
      this.vigCells(v, k, (x, y, z) => { const id = W.get(x, y, z); if (id && id !== 39 && y > 2 && x > 0 && z > 0 && x < W.sx - 1 && z < W.sz - 1) { v.backup.push([x, y, z, id, k]); W.set(x, y, z, 0); if (n++ % 9 === 0) this.particles('block', x + .5, y + .5, z + .5, 1, BL[id].col); } });
      if (k % 4 === 0) AU.sfx('explode', { x: v.x, y: v.y, z: v.z }, .4);
      const own = this.entity(v.by);
      if (own && own.local) { const F = [[0, 1], [-1, 0], [0, -1], [1, 0]][v.d], L = [-F[1], F[0]];
        for (const t of this.targets()) { if (t.id === v.by || v.hit.has(t.id)) continue; const dx = Math.floor(t.x) - v.x, dz = Math.floor(t.z) - v.z; const fw = dx * F[0] + dz * F[1], lat = dx * L[0] + dz * L[1];
          if (fw === k + 1 && Math.abs(lat) <= VIG_W && t.y >= v.y - 20 && t.y <= v.y + 21) { v.hit.add(t.id); this.damage(t, 6, { type: 'explosion', by: v.by, nokb: true }); this.fx('explosion', t.x, t.y + .5, t.z); } } }
    }
    // restore one slice per tick, in the same order it was destroyed
    if (v.t >= 120 && v.t < 120 + VIG_N) {
      const k = v.t - 120; for (const c of v.backup) if (c[4] === k && W.get(c[0], c[1], c[2]) === 0) W.set(c[0], c[1], c[2], c[3]);
      for (const p of [this.me, ...this.bots]) { if (!p || p.spectator) continue; let g = 0; while (aabbBlocks(W, p, d => d.solid) && g++ < 45) p.y += 1; }
      for (const m of this.mobs) { let g = 0; while (aabbBlocks(W, m, d => d.solid) && g++ < 45) m.y += 1; }
      if (k % 4 === 0) AU.sfx('click', { x: v.x, y: v.y, z: v.z }, .5);
    }
    if (v.t === 120 + VIG_N) {
      for (const p of [this.me, ...this.bots]) { if (!p || p.spectator) continue; let g = 0; while (aabbBlocks(W, p, d => d.solid) && g++ < 45) p.y += 1; }
      for (const m of this.mobs) { let g = 0; while (aabbBlocks(W, m, d => d.solid) && g++ < 45) m.y += 1; }
      v.done = true;
    }
  },
  // ---------- particles ----------
  particles(type, x, y, z, n, col) {
    const P = this.parts; if (P.length > 700) return;
    const add = (o) => P.push(Object.assign({ x, y, z, vx: 0, vy: 0, vz: 0, life: 20, max: 20, s: .06, g: 0, col: [1, 1, 1], a: 1 }, o));
    switch (type) {
      case 'hit': for (let i = 0; i < (n || 3); i++) add({ vx: rand(-.1, .1), vy: rand(0, .15), vz: rand(-.1, .1), col: [.7, .05, .05], g: .02, life: 12, s: .05 }); break;
      case 'crit': for (let i = 0; i < (n || 10); i++) add({ vx: rand(-.3, .3), vy: rand(-.1, .3), vz: rand(-.3, .3), col: [.95, .95, .8], life: 14, s: .04 }); break;
      case 'sweep': for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; add({ x: x + Math.cos(a), z: z + Math.sin(a), col: [.9, .9, .9], life: 6, s: .12, a: .7 }); } break;
      case 'explosion': for (let i = 0; i < 18; i++) add({ x: x + rand(-1, 1), y: y + rand(-.5, 1), z: z + rand(-1, 1), vx: rand(-.1, .1), vy: rand(0, .1), vz: rand(-.1, .1), col: [.85, .85, .85].map(c => c * rand(.7, 1)), life: randi(10, 22), s: rand(.15, .35) }); break;
      case 'poof': for (let i = 0; i < (n || 8); i++) add({ x: x + rand(-.4, .4), y: y + rand(-.3, .3), z: z + rand(-.4, .4), vx: rand(-.05, .05), vy: rand(0, .08), vz: rand(-.05, .05), col: [.95, .95, .95], life: 16, s: .1 }); break;
      case 'flame': for (let i = 0; i < 14; i++) add({ x: x + rand(-1, 1), y: y + rand(0, .3), z: z + rand(-1, 1), vy: rand(.02, .08), col: [1, rand(.4, .7), .1], life: 18, s: .07 }); add({ col: [.9, .9, .9], s: .4, life: 6 }); break;
      case 'ice': for (let i = 0; i < (n || 6); i++) add({ x: x + rand(-.4, .4), y: y + rand(-.4, .4), z: z + rand(-.4, .4), vx: rand(-.1, .1), vy: rand(0, .2), vz: rand(-.1, .1), g: .04, col: [.6, .8, 1], life: 18, s: .07 }); break;
      case 'slime': for (let i = 0; i < 16; i++) add({ x: x + rand(-1.5, 1.5), y: y + rand(-.5, .5), z: z + rand(-1.5, 1.5), vy: rand(0, .2), g: .04, col: [.45, .85, .35], life: 16, s: .08 }); break;
      case 'red': add({ col: [1, .1, .1], life: 10, s: .05 }); break;
      case 'heart': for (let i = 0; i < 4; i++) add({ x: x + rand(-.4, .4), z: z + rand(-.4, .4), vy: .05, col: [1, .2, .3], life: 20, s: .09 }); break;
      case 'spit': for (let i = 0; i < 8; i++) add({ vx: rand(-.1, .1), vy: rand(0, .1), vz: rand(-.1, .1), col: [.95, .95, .9], life: 12, s: .06, g: .02 }); break;
      case 'block': add({ vx: rand(-.15, .15), vy: rand(0, .3), vz: rand(-.15, .15), g: .05, col: col || [.6, .6, .6], life: 20, s: .12 }); break;
      case 'glow': add({ col: [1, 1, .6], life: 10, s: .04 }); break;
      case 'dust': for (let i = 0; i < (n || 1); i++) add({ x: x + rand(-.08, .08), y: y + rand(-.08, .08), z: z + rand(-.08, .08), vx: rand(-.01, .01), vy: rand(0, .02), vz: rand(-.01, .01), col: col || [1, 1, 1], life: 12, s: .07 }); break;
      case 'totem': for (let i = 0; i < 40; i++) add({ x: x + rand(-.5, .5), y: y + rand(-.5, 1), z: z + rand(-.5, .5), vx: rand(-.25, .25), vy: rand(.1, .45), vz: rand(-.25, .25), g: .02, col: Math.random() < .5 ? [.95, .85, .2] : [.4, .9, .3], life: randi(20, 35), s: .08 }); break;
      case 'suck': for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, r = rand(2, 7.5); add({ x: x + Math.cos(a) * r, y: y + rand(-.5, 1.5), z: z + Math.sin(a) * r, vx: -Math.cos(a) * r / 12, vz: -Math.sin(a) * r / 12, col: [.25, .05, .35], life: 12, s: .1 }); } break;
      case 'potion': for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = rand(.2, 2.5); add({ x: x + Math.cos(a) * r, y: y + rand(0, .8), z: z + Math.sin(a) * r, vy: rand(.02, .1), col: [.45, .05, .1].map(c => c * rand(.8, 1.4)), life: randi(14, 24), s: .09 }); } break;
    }
  },
  // MC footsteps (vanilla pack only): one step sound per ~1.67 blocks walked on the ground (moveDist += d*0.6, next = +1)
  footsteps() {
    const W = this.world;
    for (const e of this.players()) {
      if (!e.alive || e.spectator) { e._fx = undefined; continue; }
      if (e._fx === undefined) { e._fx = e.x; e._fz = e.z; e._wd = 0; e._ns = 1; continue; }
      const d = Math.hypot(e.x - e._fx, e.z - e._fz); e._fx = e.x; e._fz = e.z; if (d > 2) continue;
      const ground = e.local ? e.onGround : BL[W.get(Math.floor(e.x), Math.floor(e.y - .2), Math.floor(e.z))].solid;
      const lad = BL[W.get(Math.floor(e.x), Math.floor(e.y + .01), Math.floor(e.z))].ladder || e.wallClimb;
      if ((!ground && !lad) || e.sneaking) continue;
      e._wd += (lad && !ground ? Math.abs(e.y - (e._fy || e.y)) + d : d) * .6; e._fy = e.y;
      if (e._wd > e._ns) { e._ns = e._wd + 1; const id = lad && !ground ? 30 : W.get(Math.floor(e.x), Math.floor(e.y - .2), Math.floor(e.z)); const k = STEP_OF(id) || 'st_stone'; AU.sfx(k, e === this.me ? null : e, e === this.me ? .15 : .3); }
    }
  },
  // one seamless ukchuk_1b loop per summoner, following whichever of their dogs is closest to the camera
  dogLoops() {
    const best = new Map(), cam = this.camPos;
    if (this.phase === 'game' && cam) for (const m of [...this.mobs, ...this.rmobs.values()]) { if (m.type !== 'dog' || !m.alive) continue; const d = dist3(m, cam), b = best.get(m.owner); if (!b || d < b.d) best.set(m.owner, { d, m }); }
    for (const [o, b] of best) AU.posLoop('dog:' + o, 'ukchuk_1b', { x: b.m.x, y: b.m.y + .5, z: b.m.z }, 20, .8);
    // dude 댄스: the song plays at each dancer (heard around them); dancers who left / died / became spectators stop
    for (const [id, d] of this.dancers) { const p = this.phase === 'game' && this.players().find(q => q.id === id); if (!p || !p.alive || p.spectator) { this.dancers.delete(id); continue; } AU.posLoop('dance:' + id, 'dude_dance', { x: p.x, y: p.y + 1, z: p.z }, 40, 1); }
    AU.endLoops();
  },
  // ---------- presence ----------
  buildPresence() {
    const me = this.me; const o = { fm: this.roomArr(), H: this.isHost() ? 1 : 0, uj: this.isHost() && UPJ.files.size ? UPJ.list() : undefined, hs: this.since, nid: this.nid, n: UI.name, sk: UI.skinName || '', pe: UI.persona, j: UI.job, jt: UI.job ? (UI.jobT || 0) : 0, ph: this.phase };
    if (this.phase === 'game' && me) {
      let fl = 0; if (me.sneaking) fl |= 1; if (me.blocking) fl |= 2; if (me.eff('glowing')) fl |= 4; if (me.hurtTime > 5) fl |= 8; if (me.spectator) fl |= 16; if (me.sprinting) fl |= 32; if (me.fire > 0) fl |= 64; if (G.tick < (me.prot || 0)) fl |= 128; if (me.st.rewind) fl |= 256; if (!me.alive) fl |= 512;
      o.s = [r1(me.x), r1(me.y), r1(me.z), r1(me.yaw), r1(me.pitch), r1(me.hp), me.maxHp(), fl, me.swing % 100, me.inv[me.sel] ? me.inv[me.sel].id : 0, r1(me.scale), me.off ? me.off.id : 0, me.armorType || 0, me.drawT];
      o.d = me.deaths; o.m = this.mobs.filter(m => m.alive).slice(0, 48).map(m => [+m.id.split(':m')[1], MOB_TYPES.indexOf(m.type), r1(m.x), r1(m.y), r1(m.z), r1(m.yaw), m.hurtTime > 5 ? 1 : 0]);
    }
    else { o.s = null; o.m = null; o.d = null; }
    return o;
  },
  // ---------- main step ----------
  step() {
    this.tick++; this.lastStep = performance.now();
    this.iceTick();
    const due = this.timers.filter(t => t.at <= this.tick); this.timers = this.timers.filter(t => t.at > this.tick);
    for (const t of due) { try { t.fn(); } catch (e) { console.error(e); } }
    if (this.phase === 'game' && this.me) {
      UI.applyInput(this.me);
      for (const b of this.bots) botThink(b);
      this.me.tick(); for (const b of this.bots) b.tick();
      for (const m of this.mobs) m.tick(); this.mobs = this.mobs.filter(m => m.alive);
      // dogs push other mobs apart (MC Entity.push) so they don't stack inside each other
      for (let i = 0; i < this.mobs.length; i++) for (let j = i + 1; j < this.mobs.length; j++) {
        const a = this.mobs[i], c = this.mobs[j]; if (a.type !== 'dog' && c.type !== 'dog') continue;
        let dx = c.x - a.x, dz = c.z - a.z; const rr = (a.w + c.w) / 2; if (Math.abs(dx) >= rr || Math.abs(dz) >= rr || Math.abs(a.y - c.y) > 1) continue;
        if (Math.abs(dx) < .01 && Math.abs(dz) < .01) { const q = Math.random() * 6.28; dx = Math.cos(q) * .02; dz = Math.sin(q) * .02; }
        let m = Math.sqrt(Math.max(Math.abs(dx), Math.abs(dz))); const k = Math.min(1, 1 / m) * .08 / m; a.vx -= dx * k; a.vz -= dz * k; c.vx += dx * k; c.vz += dz * k;
      }
      for (const a of this.arrows) a.tick(); this.arrows = this.arrows.filter(a => !a.dead);
      for (const d of this.drops) {
        d.life--; d.vy -= .04; d.y += d.vy; if (this.world.solidAt(d.x, d.y, d.z) || BL[this.world.get(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z))].snow) { d.y = Math.floor(d.y) + 1; d.vy = 0; }
        if (this.tick - d.born >= 20 && !d.dead) for (const p of [this.me, ...this.bots]) if (p.alive && !p.spectator && Math.abs(p.x - d.x) < p.w / 2 + 1 && Math.abs(p.z - d.z) < p.w / 2 + 1 && d.y > p.y - .5 && d.y < p.y + p.h + .5) { if (p.addItem('slimeball', 1)) { d.dead = true; NET.emit({ k: 'bp', id: d.id }); AU.sfx('pop', p, .6); break; } }
      }
      this.drops = this.drops.filter(d => d.life > 0 && !d.dead);
      // original: a repeating command block plays block.chain.step to everyone within 15 blocks EVERY tick while the chain
      // flies out and back (continuous rattle), then block.chain.place when it is done
      { let rattle = false, done = false; const cp = this.camPos;
        for (const c of this.chains) { c.t++; const near = !cp || dist3(cp, c.o) <= 15; if (near && c.t <= 20) rattle = true; if (near && c.t === 20) done = true; }
        if (rattle) AU.sfx('chain', null, .55, .85 + Math.random() * .3); if (done) AU.sfx('chainplace', null, .7); }
      this.chains = this.chains.filter(c => c.t <= 20);
      for (const r of this.remotes.values()) { if (r.hurtTime > 0) r.hurtTime--; if (r.swingT > 0) r.swingT--; if (r.spectator || r.ph !== 'game') r.hurtTime = 0; } // remotes: hurt flash/swing count down here (they have no own tick) -> no permanent red skin
      SK.fangTick(); if (MOD.proj.length) MOD.projTick(); if (this.pigs.length) SK.srPigTick(); if (this.domains.length) SK.srDomainTick(); if (this.zones.length) SK.zoneTick();
      if (PACK.on) this.footsteps();
      // 창찬 dash afterimages: a fading copy every tick while dashing (works for remote players too)
      for (const [id, until] of this.dashFx) { if (this.tick >= until) { this.dashFx.delete(id); continue; } const e = this.players().find(q => q.id === id); if (!e) continue; const lg = this.ghosts[this.ghosts.length - 1]; if (lg && lg.id === id && Math.hypot(lg.x - e.x, lg.z - e.z) < .4) continue; this.ghosts.push({ id, e, x: e.x, y: e.y, z: e.z, yaw: e.yaw, pitch: e.pitch, walkP: e.walkP || 0, walkA: e.walkA || 0, life: 10 }); }
      for (const g of this.ghosts) g.life--; this.ghosts = this.ghosts.filter(g => g.life > 0);
      for (const v of this.vigs) this.tickVig(v); this.vigs = this.vigs.filter(v => !v.done);
      // suno trails / low hp
      for (const p of this.players()) if (p.job === 'suno' && !p.local && !p.spectator && !p.rewindF && this.tick % 2 === 0) { p.trail = p.trail || []; p.trail.push([p.x, p.y + .1, p.z]); if (p.trail.length > 40) p.trail.shift(); }
      if (this.tick % 20 === 0) this.checkWin();
    }
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy -= p.g; p.vx *= .92; p.vz *= .92; p.life--; }
    this.parts = this.parts.filter(p => p.life > 0);
    if (NET.mode !== 'off') NET.send(this.buildPresence());
    NET.tickTimeouts();
  },
};
