// game hooks: NET serves whichever app runs in this page (4중인격 = G, 랜덤블록 서바이벌 = RG)
const NG = () => APP === 'rbs' ? RG : G;
const NB = d => APP === 'rbs' ? RG.onBlob(d) : UPJ.onBlob(d);
// ===================== networking (artifact room presence / BroadcastChannel / offline) =====================
const NET = {
  mode: 'off', status: '오프라인', rc: 'main', peerKey: null, peers: new Map(), out: [], seq: 0, seen: {}, room: null, bc: null, filter: false, onChange: null,
  gen: 0, peer: null, conns: new Map(), hostConn: null, isHost: false, latest: new Map(), dirty: new Set(), byes: [], online: false,
  set(st, ok) { this.status = st; if (ok !== undefined) this.online = ok; if (this.online) this.busy = false; if (this.onChange) this.onChange(); },
  isArtifact() { return !!(window.claude && typeof window.claude.use === 'function'); },
  async connect(code) {
    this.rc = (code || 'main').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'main';
    this.disconnect(); const gen = ++this.gen; this.busy = true; // busy: connecting / reconnecting (랜덤블록 shows a splash)
    this.set('연결 확인 중…', false);
    for (let i = 0; i < 30 && !this.isArtifact(); i++) await new Promise(r => setTimeout(r, 100));
    if (gen !== this.gen) return;
    if (this.isArtifact()) return this.connectRoom(gen);
    // standalone (hosted elsewhere / opened as file): P2P via PeerJS, else same-browser tabs
    if (await this.loadPeer()) { if (gen !== this.gen) return; this.mode = 'p2p'; this.peerKey = uid(10); this.hostId = (APP === 'rbs' ? 'rbs2p2-' : 'apvp4-') + this.rc.replace(/[^a-z0-9]/g, '') + '-host'; this.tryHost(gen); this.watchArtifact(gen); return true; }
    let bc = null; try { if (window.BroadcastChannel) bc = new BroadcastChannel((APP === 'rbs' ? 'rbs2p2-' : 'apvp-') + this.rc); } catch (e) { bc = null; }
    if (bc) {
      this.mode = 'bc'; this.peerKey = uid(10); this.bc = bc;
      bc.onmessage = e => { const d = e.data; if (!d || d.peer === this.peerKey) return; if (d.blob) { NB(d.blob); return; } if (d.bye) this.leave(d.peer); else this.recv(d.peer, d.pres); };
      this.set('같은 브라우저 탭끼리만 연결 · 방 ' + this.rc, true); this.watchArtifact(gen); return true;
    }
    this.mode = 'off'; this.busy = false; this.set('오프라인 (연습 모드만 가능)', false); this.watchArtifact(gen); return false;
  },
  watchArtifact(gen) { const t = setInterval(() => { if (gen !== this.gen) return clearInterval(t); if (this.isArtifact()) { clearInterval(t); this.connect(this.rc); } }, 1000); },
  async connectRoom(gen) {
    this.mode = 'room'; this.set('실시간 방에 연결 중…', false);
    let room = null; try { room = await window.claude.use('room'); } catch (e) { room = null; }
    if (gen !== this.gen) return;
    if (!room) { this.mode = 'off'; this.busy = false; this.set('⚠ 실시간 연결을 쓸 수 없어요. 공개 링크로 열었거나 로그인하지 않은 경우예요. 공유받은 Claude 계정으로 로그인해서 열어 주세요. (연습 모드는 가능)', false); return false; }
    let nr = null; this.filter = false;
    try { nr = await room.join((APP === 'rbs' ? 'rbs2p2-' : 'apvp-') + this.rc); } catch (e) { nr = room; this.filter = true; }
    if (gen !== this.gen) { if (nr && nr.leave && !this.filter) nr.leave().catch(() => { }); return; }
    this.room = nr;
    const err = e => { const c = e && e.code; if (gen !== this.gen) return; this.busy = false; this.set(c === 'not_granted' || c === 'revoked' ? '⚠ 이 계정/링크는 실시간 방에 들어갈 수 없어요 (' + c + '). 공개 링크가 아니라, 공유받은 사람으로 로그인해서 열어야 해요.' : '⚠ 연결 오류 (' + c + ') · 잠시 후 다시 시도해 주세요', false); };
    try {
      nr.onPeers(ch => {
        if (gen !== this.gen) return;
        for (const p of ch.joined.concat(ch.updated)) { if (p.isMe && p.sameTab) { this.peerKey = p.peer; continue; } this.recv(p.peer, p.presence); }
        for (const p of ch.left) this.leave(p.peer);
        this.roomStatus();
      }, err);
      nr.onConnection(ok => { if (gen !== this.gen) return; clearTimeout(this.offT); if (ok) { this.online = true; this.roomStatus(); } else this.offT = setTimeout(() => { if (gen === this.gen) { this.online = false; this.roomStatus(); } }, 2000); }, err);
    } catch (e) { err({ code: 'exception' }); }
    return true;
  },
  roomStatus() { if (this.mode !== 'room') return; const n = this.countPeers(); this.set(this.online ? '🟢 온라인 · 방 ' + this.rc + ' · 나 포함 ' + (n + 1) + '명' : '재연결 중…'); },
  countPeers() { let n = 0; for (const p of this.peers.values()) if (p.pres && p.pres.nid) n++; return n; },
  // ---------- PeerJS (standalone hosting) ----------
  loadPeer() {
    if (window.Peer) return Promise.resolve(true);
    const urls = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
    return new Promise(res => {
      let i = 0; const next = () => { if (window.Peer) return res(true); if (i >= urls.length) return res(false); const sc = document.createElement('script'); sc.src = urls[i++]; sc.onload = () => res(!!window.Peer); sc.onerror = next; document.head.appendChild(sc); };
      next(); setTimeout(() => res(!!window.Peer), 9000);
    });
  },
  tryHost(gen) {
    if (gen !== this.gen) return; this.isHost = false; this.set('P2P 연결 중… · 방 ' + this.rc, false);
    let pr; try { pr = new Peer(this.hostId, { debug: 0 }); } catch (e) { return this.p2pFail(gen); }
    this.peer = pr;
    pr.on('open', () => { if (gen !== this.gen) return pr.destroy(); this.isHost = true; this.conns.clear(); this.p2pStatus(); });
    pr.on('connection', conn => {
      conn.on('open', () => { if (gen !== this.gen) return; this.conns.set(conn.connectionId, conn); try { conn.send({ b: [...this.latest.entries()] }); } catch (e) { } this.p2pStatus(); });
      conn.on('data', d => { if (gen !== this.gen || !d || !d.peer) return; conn.pk = d.peer; conn.last = performance.now(); if (d.blob) { for (const c of this.conns.values()) if (c !== conn && c.open) { try { c.send({ blob: d.blob }); } catch (e) { } } NB(d.blob); return; } if (d.pres) { this.latest.set(d.peer, d.pres); this.dirty.add(d.peer); this.recv(d.peer, d.pres); } });
      conn.drop = () => drop(); const drop = () => { if (!this.conns.has(conn.connectionId)) return; this.conns.delete(conn.connectionId); if (conn.pk) { this.latest.delete(conn.pk); this.byes.push(conn.pk); this.leave(conn.pk); } this.p2pStatus(); };
      conn.on('close', drop); conn.on('error', drop);
    });
    pr.on('error', e => {
      if (gen !== this.gen) return;
      if (e.type === 'unavailable-id') { try { pr.destroy(); } catch (x) { } this.joinHost(gen); }
      else if (!this.isHost) { try { pr.destroy(); } catch (x) { } this.p2pFail(gen); }
    });
    pr.on('disconnected', () => { if (gen === this.gen && this.isHost) { try { pr.reconnect(); } catch (e) { } } });
  },
  joinHost(gen) {
    if (gen !== this.gen) return; let pr; try { pr = new Peer({ debug: 0 }); } catch (e) { return this.p2pFail(gen); }
    this.peer = pr; this.isHost = false;
    pr.on('open', () => {
      if (gen !== this.gen) return pr.destroy();
      const conn = pr.connect(this.hostId, { serialization: 'json', reliable: true }); this.hostConn = conn;
      const to = setTimeout(() => { if (!conn.open && gen === this.gen) { try { pr.destroy(); } catch (e) { } this.retryHost(gen); } }, 8000);
      conn.on('open', () => { clearTimeout(to); this.lastHost = performance.now(); this.p2pStatus(); });
      conn.on('data', d => { if (gen !== this.gen || !d) return; this.lastHost = performance.now(); if (d.blob) { NB(d.blob); return; } if (d.b) for (const [pk, pres] of d.b) if (pk !== this.peerKey) this.recv(pk, pres); if (d.bye) for (const pk of d.bye) this.leave(pk); });
      conn.lost = () => { if (gen !== this.gen || conn._lost) return; conn._lost = true; clearTimeout(to); for (const k of [...this.peers.keys()]) this.leave(k); try { pr.destroy(); } catch (e) { } this.retryHost(gen); };
      conn.on('close', conn.lost);
    });
    pr.on('disconnected', () => { if (gen === this.gen) { try { pr.reconnect(); } catch (e) { } } });
    pr.on('error', e => { if (gen !== this.gen) return; if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') { if (this.hostConn && this.hostConn.open) return; } try { pr.destroy(); } catch (x) { } this.retryHost(gen); });
  },
  retryHost(gen) { this.hostConn = null; this.busy = true; this.set('방장이 나가서 다시 연결 중…', false); setTimeout(() => this.tryHost(gen), 400 + Math.random() * 1600); },
  p2pFail(gen) { this.busy = true; this.set('⚠ P2P 서버에 연결하지 못했어요. 다시 시도 중…', false); setTimeout(() => this.tryHost(gen), 4000); },
  p2pStatus() { const n = this.countPeers(); this.set('🟢 온라인(P2P' + (this.isHost ? '·방장' : '') + ') · 방 ' + this.rc + ' · 나 포함 ' + (n + 1) + '명', true); },
  disconnect() {
    this.gen++;
    if (this.room && this.room.leave && !this.filter) { try { const p = this.room.leave(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
    if (this.bc) { try { this.bc.postMessage({ peer: this.peerKey, bye: 1 }); this.bc.close(); } catch (e) { } }
    if (this.peer) { try { this.peer.destroy(); } catch (e) { } }
    this.room = null; this.bc = null; this.peer = null; this.hostConn = null; this.conns.clear(); this.latest.clear(); this.dirty.clear(); this.isHost = false;
    for (const k of [...this.peers.keys()]) this.leave(k); this.mode = 'off'; this.online = false; this.busy = false;
  },
  // side channel for big one-off data (uploaded job files): not part of presence (that one is limited to ~4KB)
  blob(d) {
    if (this.mode === 'bc' && this.bc) { try { this.bc.postMessage({ peer: this.peerKey, blob: d }); } catch (e) { } }
    else if (this.mode === 'p2p') {
      if (this.isHost) { for (const c of this.conns.values()) { try { if (c.open) c.send({ blob: d }); } catch (e) { } } }
      else if (this.hostConn && this.hostConn.open) { try { this.hostConn.send({ peer: this.peerKey, blob: d }); } catch (e) { } }
    }
  },
  emit(ev) {
    if (this.mode === 'off') return; ev.i = ++this.seq; ev.ts = NG().tick; this.out.push(ev);
  },
  send(pres) {
    if (this.mode === 'off') return;
    // drop old events
    const now = NG().tick; this.out = this.out.filter(e => now - e.ts < 30);
    pres.e = this.out.map(e => { const o = Object.assign({}, e); delete o.ts; return o; });
    pres.rc = this.rc; pres.v = 3;
    const enc = this.enc || (this.enc = new TextEncoder()); const sz = x => enc.encode(x).length;
    let s = JSON.stringify(pres);
    const LIM = APP === 'rbs' && this.mode !== 'room' ? 60000 : 3800;
    while (sz(s) > LIM && pres.e.length) { pres.e.shift(); this.out.shift(); s = JSON.stringify(pres); }
    if (sz(s) > LIM) { pres.m = []; s = JSON.stringify(pres); }
    const obj = JSON.parse(s);
    if (this.mode === 'room') { if (this.room) { try { const pr = this.room.presence(obj); if (pr && pr.catch) pr.catch(e => { if (e && e.code === 'invalid_argument') console.warn('presence', e.message); }); } catch (e) { } } }
    else if (this.bc) { try { this.bc.postMessage({ peer: this.peerKey, pres: obj }); } catch (e) { } }
    else if (this.mode === 'p2p') {
      if (this.isHost) {
        this.latest.set(this.peerKey, obj); this.dirty.add(this.peerKey);
        if (this.conns.size) { const ent = [...this.dirty].map(k => [k, this.latest.get(k)]).filter(e => e[1]); const byes = this.byes.splice(0);
          for (const c of this.conns.values()) { const b = ent.filter(e => e[0] !== c.pk); try { if (c.open) c.send(byes.length ? { b, bye: byes } : { b }); } catch (e) { } } }
        this.dirty.clear();
      } else if (this.hostConn && this.hostConn.open) { try { this.hostConn.send({ peer: this.peerKey, pres: obj }); } catch (e) { } }
    }
  },
  recv(peer, pres) {
    if (!pres || pres.v !== 3) return; if (this.filter && pres.rc !== this.rc) return;
    const first = !this.peers.has(peer);
    this.peers.set(peer, { pres, t: performance.now() });
    if (first) { if (this.mode === 'room') this.roomStatus(); else if (this.mode === 'p2p' && this.online) this.p2pStatus(); }
    const nid = pres.nid; if (!nid || (NG().me && nid === NG().me.id)) return;
    const evs = (pres.e || []).slice().sort((a, b) => a.i - b.i);
    if (this.seen[nid] === undefined) { this.seen[nid] = evs.length ? evs[evs.length - 1].i : 0; }
    else for (const ev of evs) if (ev.i > this.seen[nid]) { this.seen[nid] = ev.i; try { NG().onEvent(ev, nid); } catch (e) { console.error(e); } }
    NG().onPresence(peer, pres, first);
  },
  leave(peer) { const p = this.peers.get(peer); this.peers.delete(peer); if (p) { NG().onLeave(peer, p.pres); if (this.mode === 'room') this.roomStatus(); else if (this.mode === 'p2p' && this.online) this.p2pStatus(); } },
  tickTimeouts() {
    if (this.mode === 'p2p') {
      const now = performance.now();
      if (!this.isHost && this.hostConn && this.hostConn.open && this.hostConn.lost && now - (this.lastHost || now) > 12000) this.hostConn.lost();
      if (this.isHost) for (const c of [...this.conns.values()]) if (c.last && now - c.last > 20000 && c.drop) { try { c.close(); } catch (e) { } c.drop(); }
    }
    if (this.mode !== 'bc' && this.mode !== 'p2p') return; const now = performance.now(); for (const [k, p] of this.peers) if (now - p.t > 15000) this.leave(k); },
  others() { return [...this.peers.values()].map(p => p.pres); },
};

// ===================== remote players =====================
class Remote {
  constructor(peer, pres) { this.peer = peer; this.id = pres.nid; this.kind = 'player'; this.local = false; this.buf = []; this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.pitch = 0; this.trail = []; this.alive = true; this.dist = 0; this.upd(pres); }
  upd(p) {
    this.name = p.n || '플레이어'; this.skin = p.sk || ''; this.persona = p.pe | 0; this.job = p.j; this.jt = p.jt || 0; this.ph = p.ph; if (p.hs) this.hs = p.hs; this.H = p.H | 0; this.deaths = p.d | 0; this.mobs = Array.isArray(p.m) ? p.m : [];
    const s = p.s; if (!s) return;
    this.buf.push({ t: performance.now(), x: s[0], y: s[1], z: s[2], yaw: s[3], pitch: s[4] }); if (this.buf.length > 20) this.buf.shift();
    this.hp = s[5]; this.maxHp = s[6]; this.flags = s[7]; this.swingN = s[8]; this.heldId = s[9]; this.scale = s[10] || 1; this.offId = s[11]; this.armorType = s[12] || null; this.drawT = s[13] || 0;
    this.spectator = !!(this.flags & 16); this.sneaking = !!(this.flags & 1); this.blocking = !!(this.flags & 2); this.glowing = !!(this.flags & 4); this.protF = !!(this.flags & 128); this.rewindF = !!(this.flags & 256); this.alive = !(this.flags & 512); // 512: dead, waiting for the 권총 컷씬 to end
    if (this.flags & 8) { if (!this._hurtF) this.hurtTime = 10; this._hurtF = true; } else this._hurtF = false;
    if (this.swingN !== this._lastSwing) { this._lastSwing = this.swingN; this.swingT = 6; }
    if (!this.buf[1]) { this.x = s[0]; this.y = s[1]; this.z = s[2]; }
  }
  get w() { return 0.6 * this.scale; } get h() { return (this.sneaking ? 1.5 : 1.8) * this.scale; } get eye() { return 1.62 * this.scale; }
  interp() {
    const rt = performance.now() - 110; const b = this.buf; if (!b.length) return;
    let a = b[0], c = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) if (b[i].t <= rt && b[i + 1].t >= rt) { a = b[i]; c = b[i + 1]; break; }
    if (rt >= c.t) a = c;
    const t = a === c ? 1 : clamp((rt - a.t) / (c.t - a.t), 0, 1);
    const ox = this.x, oz = this.z;
    this.x = lerp(a.x, c.x, t); this.y = lerp(a.y, c.y, t); this.z = lerp(a.z, c.z, t); this.yaw = lerpA(a.yaw, c.yaw, t); this.pitch = lerp(a.pitch, c.pitch, t);
    this.dist += Math.hypot(this.x - ox, this.z - oz);
  }
}
