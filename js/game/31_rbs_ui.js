// ===================== Random Block Survival: UI (HUD, chat, containers, menu chest) =====================
const RUI = {
  name: '', skin: '', sens: 1, fov: 70, vol: .8, mvol: 1, res: 1, bob: true, musicOn: true, sfxOn: true, gmuc: 0, winSnd: 'sfx_win_yay', lobbyMusic: false, autoFs: true, room: 'main', // BGM / win sound / lobby music choices removed for now (defaults only). room: 기본 멀티 방 이름
  mobile: false, god: false, botAI: true, gui: null, paused: false, chatOpen: false, promptOpen: false, follow: null, followThird: false, hideHud: false, started: false, cursor: null, iconCache: {},
  load() {
    let s = {}; try { s = JSON.parse(localStorage.getItem('rbs_set') || '{}'); } catch (e) { }
    let ap = {}; try { ap = JSON.parse(localStorage.getItem('apvp') || '{}'); } catch (e) { }
    this.name = s.name || ap.name || ('플레이어' + randi(100, 999)); this.skin = s.skin !== undefined ? s.skin : (ap.skin || '');
    for (const k of ['sens', 'fov', 'vol', 'mvol', 'res', 'bob', 'sfxOn', 'autoFs', 'room']) if (s[k] !== undefined) this[k] = s[k]; if (!this.room) this.room = 'main';
  },
  save() { try { const o = {}; for (const k of ['name', 'skin', 'sens', 'fov', 'vol', 'mvol', 'res', 'bob', 'musicOn', 'sfxOn', 'gmuc', 'winSnd', 'lobbyMusic', 'autoFs', 'room']) o[k] = this[k]; localStorage.setItem('rbs_set', JSON.stringify(o)); } catch (e) { } },
  // ---------- § colour codes ----------
  COL: { 0: '#000', 1: '#00a', 2: '#0a0', 3: '#0aa', 4: '#a00', 5: '#a0a', 6: '#fa0', 7: '#aaa', 8: '#555', 9: '#55f', a: '#5f5', b: '#5ff', c: '#f55', d: '#f5f', e: '#ff5', f: '#fff' },
  fmt(s) { let out = '', col = null, b = false, it = false; const parts = String(s).split('§'); const open = () => { const st = (col ? 'color:' + col + ';' : '') + (b ? 'font-weight:bold;' : '') + (it ? 'font-style:italic;' : ''); return st ? '<span style="' + st + '">' : '<span>'; };
    out += '<span>' + esc(parts[0]); for (let i = 1; i < parts.length; i++) { const c = parts[i][0], rest = parts[i].slice(1); out += '</span>'; if (c in this.COL) { col = this.COL[c]; b = false; it = false; } else if (c === 'l') b = true; else if (c === 'o') it = true; else if (c === 'r') { col = null; b = it = false; } out += open() + esc(rest); }
    return out + '</span>'; },
  init() {
    this.load(); this.mobile = SITE.isMobile();
    const st = document.createElement('style'); st.textContent = RUI_CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'rbs'; d.innerHTML = RUI_HTML; document.body.appendChild(d); document.body.classList.add('rbsapp'); document.body.classList.toggle('rbmob', this.mobile);
    $('rbCredit').innerHTML = 'made by LemonyMEF <b class="rbbeta">BETA</b>' + (SITE.VER ? ' <span class="rbver">' + SITE.verLabel() + '</span>' : '');
    $('rbHot').innerHTML = Array.from({ length: 9 }, (_, i) => '<div class="rhs" data-i="' + i + '"></div>').join('');
    for (const el of document.querySelectorAll('.rhs')) { const f = () => { RG.me.sel = +el.dataset.i; }; el.addEventListener('mousedown', f); el.addEventListener('touchstart', e => { e.preventDefault(); f(); }, { passive: false }); }
    $('rbGui').addEventListener('mousedown', e => this.guiDown(e)); $('rbGui').addEventListener('contextmenu', e => e.preventDefault());
    $('rbGui').addEventListener('touchstart', e => this.guiTouch(e), { passive: false }); $('rbGui').addEventListener('touchend', e => this.guiTouchEnd(e), { passive: false });
    addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; const c = $('rbCursor'); c.style.left = (e.clientX - 18) + 'px'; c.style.top = (e.clientY - 18) + 'px'; this.tipAt(e); });
    $('rbChatF').onsubmit = e => { e.preventDefault(); const v = $('rbChatIn').value.trim(); if (v) this.sendChat(v); this.closeChat(); };
    $('rbChatX').onclick = () => this.closeChat();
    const off = e => { e.preventDefault(); e.stopPropagation(); this.goOffline(); }; $('rbNetOff').addEventListener('click', off); $('rbNetOff').addEventListener('touchend', off, { passive: false });
    addEventListener('keydown', e => { if (!this.netWait || this.paused || e.code !== 'KeyF' || e.repeat) return; const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return; e.preventDefault(); e.stopImmediatePropagation(); this.goOffline(); }, true); // PC: the cursor is locked in the game, so F presses the button
    $('rbPause').addEventListener('click', e => { const a = e.target.closest('[data-p]'); if (!a) return; this.pauseAct(a.dataset.p); });
    if (this.mobile) { const s2 = document.createElement('style'); s2.textContent = RTCTL_CSS; document.head.appendChild(s2); RTCTL.init(); } // touch buttons + layout editor (29b_rbs_touch.js)
    const port = () => document.body.classList.toggle('rbport', innerHeight > innerWidth * 1.05); port(); addEventListener('resize', port);
    $('rbRot').addEventListener('touchstart', e => { e.preventDefault(); if (!this.land) this.toggleLand(); }, { passive: false });
  },
  esc: s => esc(s),
  // landscape: inside a desktop window the top page does fullscreen + orientation lock
  toggleLand() { this.land = !this.land; for (const b of (window.RTCTL ? RTCTL.copies('land') : [])) b.classList.toggle('lock', this.land);
    if (SITE.inFrame) { SITE.toParent({ t: 'land', on: this.land }); return; }
    const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => { }); } catch (e) { } };
    if (this.land) { const el = document.documentElement; try { const p = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(lock).catch(lock); else lock(); } catch (e) { lock(); } } else SITE.landOff(); },
  // ---------- chat / title / actionbar ----------
  chat(m) { const box = $('rbChat'); if (!box) return; for (const line of String(m).split('\n')) { const d = document.createElement('div'); d.className = 'rcl'; d.innerHTML = this.fmt(line); d.dataset.t = performance.now(); box.appendChild(d); } while (box.children.length > 60) box.firstChild.remove(); box.scrollTop = 1e9; },
  sendChat(v) { const m = '<' + this.name + '> ' + v; this.chat(m); RG.emit({ k: 'chat', m }); },
  openChat(pre = '') { this.chatOpen = true; $('rbChatF').classList.remove('hide'); $('rbChat').classList.add('open'); const i = $('rbChatIn'); i.value = pre; setTimeout(() => i.focus(), 10); if (document.pointerLockElement) document.exitPointerLock(); },
  closeChat() { this.chatOpen = false; $('rbChatF').classList.add('hide'); $('rbChat').classList.remove('open'); $('rbChatIn').blur(); if (!this.mobile && !this.gui && !this.paused) RIN.lock(); },
  title(t, s, o = {}) { const el = $('rbTitle'); $('rbTt').innerHTML = this.fmt(t || ''); $('rbTs').innerHTML = this.fmt(s || ''); this.titleUntil = performance.now() + ((o.stay || 50) + 10) * 50; el.style.opacity = 1; },
  actionbar(t) { if (t === this._ab) return; this._ab = t; $('rbAct').innerHTML = t ? this.fmt(t) : ''; },
  mmss(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ' : ' + String(s % 60).padStart(2, '0'); },
  // ---------- icons ----------
  iconURL(id) {
    if (this.iconCache[id]) return this.iconCache[id]; const I = RIT[id]; let url = '';
    if (id === 'blk:air') url = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="#555" stroke-dasharray="2 2"/></svg>');
    else if (I && I.img) url = RB_IMG[I.img];
    else { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const A = RTEX.cv;
      const B = I && I.block ? BL[RBLK.K(I.block)] : id.startsWith('blk:') ? BL[RBLK.K(id.slice(4))] : null;
      if (B && !B.air) { const tile = (t, a, b, cc, d, e, f, shade) => { const [ox, oy] = RTEX.xy(t); g.setTransform(a, b, cc, d, e, f); g.drawImage(A, ox, oy, 16, 16, 0, 0, 16, 16); if (shade) { g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(0, 0, 16, 16); } };
        tile(B.tiles[4], 14 / 16, -7 / 16, 14 / 16, 7 / 16, 2, 9, 0); tile(B.tiles[0], 14 / 16, 7 / 16, 0, 14 / 16, 2, 9, .2); tile(B.tiles[3], 14 / 16, -7 / 16, 0, 14 / 16, 16, 16, .4); g.setTransform(1, 0, 0, 1, 0, 0); }
      else { const tex = I ? I.tex : (id.includes('/') ? id : 'item/' + id); const [ox, oy] = RTEX.xy(RTEX.T(tex)); g.drawImage(A, ox, oy, 16, 16, 0, 0, 32, 32); }
      url = c.toDataURL(); }
    this.iconCache[id] = url; return url;
  },
  slotHTML(s) { if (!s) return ''; const I = RIT[s.id]; let h = '<img class="ric' + ((s.en || s.glow || (I && I.glint)) ? ' glint' : '') + '" src="' + this.iconURL(s.id) + '" draggable="false">'; if (s.n > 1) h += '<b class="rcn">' + s.n + '</b>'; if (I && I.dur && s.d) { const f = 1 - s.d / I.dur; h += '<i class="rdur"><i style="width:' + Math.round(f * 100) + '%;background:hsl(' + Math.round(f * 120) + ',90%,45%)"></i></i>'; } return h; },
  // ---------- P2P connecting splash: covers the game while connecting / changing rooms / reconnecting ----------
  netTick(now) {
    const on = SITE.p2pNow() && !!NET.busy; const el = $('rbNet');
    if (on !== !!this.netWait) { this.netWait = on; el.classList.toggle('hide', !on); if (on) { this.netT0 = now; RIN.lmb = RIN.rmb = false; if (RG.me) RG.me.dig = null; } }
    if (!on) return; const sec = Math.floor((now - this.netT0) / 1000);
    const st = NET.status || '연결 중…'; if (st !== this._nst) { this._nst = st; $('rbNetS').textContent = st; }
    const mode = NET.mode === 'p2p' ? 'P2P (PeerJS · WebRTC)' : NET.mode === 'room' ? '실시간 방' : NET.mode === 'bc' ? '같은 브라우저 탭' : '서버 확인 중';
    const info = '방 코드: ' + NET.rc + ' · ' + mode + ' · ' + sec + '초' + (sec >= 10 ? '<br>오래 걸리면 아래 버튼으로 혼자 플레이할 수 있어요' : '');
    if (info !== this._nin) { this._nin = info; $('rbNetI').innerHTML = info; }
    const lab = '오프라인 모드로 전환' + (this.mobile ? '' : ' (F)'); if ($('rbNetOff').textContent !== lab) $('rbNetOff').textContent = lab;
  },
  goOffline(quiet) {
    SITE.setP2PNow(false); NET.disconnect(); NET.status = 'P2P 꺼짐 (혼자 플레이 · Ready를 누르면 봇 수를 골라요)'; RG.remotes.clear();
    this.netTick(performance.now());
    if (!quiet) { this.chat('§e오프라인 모드로 전환했어요. 핫바 5번 §fReady§e로 봇과 플레이할 수 있어요. (메뉴 → 멀티플레이에서 다시 켤 수 있어요)'); RAU.play('click', 1, false, .5); if (this.paused) this.menuDraw(); }
  },
  // ---------- per-frame HUD ----------
  hud(dt) {
    if (this.mobile) RTCTL.ringTick();
    const me = RG.me; const now = performance.now();
    if (this.titleUntil && now > this.titleUntil) { $('rbTitle').style.opacity = 0; this.titleUntil = 0; }
    for (const l of $('rbChat').children) { const age = now - +l.dataset.t; l.style.opacity = this.chatOpen ? 1 : age > 10000 ? 0 : age > 9000 ? 1 - (age - 9000) / 1000 : 1; }
    this.netTick(now);
    document.body.classList.toggle('rbhide', this.hideHud); document.body.classList.toggle('rbcut', RG.gs.ph === 'win'); document.body.classList.toggle('rbspec', me.spectator); document.body.classList.toggle('rbguiopen', !!this.gui);
    // hotbar (rebuilt only on change)
    const sig = me.inv.slice(0, 9).map(s => s ? s.id + s.n + (s.d || 0) + (s.en ? 'e' : '') + (s.glow ? 'g' : '') : '').join('|') + me.sel + (me.off ? me.off.id + (me.off.d || 0) : '');
    if (sig !== this._hs) { this._hs = sig; const H = $('rbHot').children; for (let i = 0; i < 9; i++) { H[i].innerHTML = this.slotHTML(me.inv[i]); H[i].classList.toggle('sel', i === me.sel); } $('rbOff').innerHTML = this.slotHTML(me.off); $('rbOff').style.display = me.off ? '' : 'none';
      const s = me.held(); const nm = s ? RITEM.name(s) : ''; if (nm !== this._hn) { this._hn = nm; $('rbHeld').innerHTML = this.fmt(nm); $('rbHeld').style.opacity = nm ? 1 : 0; this.heldT = now; } }
    if (this.heldT && now - this.heldT > 2000) { $('rbHeld').style.opacity = 0; this.heldT = 0; }
    // bars
    const bs = Math.ceil(me.hp) + '|' + Math.ceil(me.absorb) + '|' + me.armorPts()[0] + '|' + me.food + '|' + me.lvl + '|' + Math.round(me.xp) + '|' + (me.hurtTime > 0) + '|' + me.mode + '|' + (me.eff('poison') ? 'p' : me.eff('wither') ? 'w' : '');
    if (bs !== this._bs) { this._bs = bs; this.drawBars(); }
    // sidebar (the original scoreboard)
    if ((RG.tick & 7) === 0) { const all = RG.players().filter(p => !p.isBot || true); const rows = [['준비한 플레이어', RG.readyCount()], ['서버 인원', all.length], ['게임중인 플레이어', all.filter(p => !p.spectator && p.alive !== false && RG.area(p) === 'arena').length]].sort((a, b) => b[1] - a[1]);
      const h = '<div class="rsh">랜덤블록 서바이벌</div>' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join(''); if (h !== this._sb) { this._sb = h; $('rbSide').innerHTML = h; }
      const ef = Object.entries(me.effects).filter(([n]) => n !== 'saturation').map(([n, e]) => (this.EFN[n] || n) + ' ' + RITEM.ROMAN[e.amp + 1 > 5 ? 5 : e.amp + 1] + ' <small>' + Math.ceil(e.t / 20) + 's</small>').join('<br>'); if (ef !== this._ef) { this._ef = ef; $('rbEff').innerHTML = ef; }
      if (this.gui) this.guiTick();
      if (me.spectator) { const f = this.follow ? RG.byId(this.follow) : null; $('rbSpecT').innerHTML = '👁 관전 중' + (f ? ' · <b>' + esc(f.name) + '</b> 시점' + (this.followThird ? ' (3인칭)' : '') : ' · 자유 시점') + '<br><small>' + (this.mobile ? '탭: 다음 플레이어 · 웅크리기: 자유 시점 · 메뉴(☰)에서 관전 끝내기' : '클릭: 다음 / 우클릭: 이전 플레이어 · 숫자: 바로 선택 · Shift: 자유 시점 · V: 1/3인칭 · M: 메뉴 (관전 끝내기)') + '</small>'; }
      RAU.lobbyMusic();
    }
  },
  EFN: { regeneration: '재생', absorption: '흡수', poison: '독', fatal_poison: '치명적 독', haste: '성급함', wither: '위더', resistance: '저항', strength: '힘', weakness: '나약함', speed: '신속', slowness: '구속', night_vision: '야간 투시', instant_health: '즉시 회복', fire_resistance: '화염 저항' },
  drawBars() {
    const me = RG.me; const c = $('rbBars'); const W = 364, H = 46; if (c.width !== W) { c.width = W; c.height = H; } const g = c.getContext('2d'); g.clearRect(0, 0, W, H);
    if (me.mode === 'spectator') return;
    const heart = (x, y, fill, col) => { g.fillStyle = '#000'; g.beginPath(); g.arc(x + 4, y + 4, 4.4, 0, 7); g.arc(x + 10, y + 4, 4.4, 0, 7); g.moveTo(x - .5, y + 5); g.lineTo(x + 7, y + 13); g.lineTo(x + 14.5, y + 5); g.fill(); if (!fill) { g.fillStyle = '#3a1010'; g.beginPath(); g.arc(x + 4, y + 4, 3, 0, 7); g.arc(x + 10, y + 4, 3, 0, 7); g.moveTo(x + 1, y + 5); g.lineTo(x + 7, y + 11.5); g.lineTo(x + 13, y + 5); g.fill(); return; }
      g.save(); g.beginPath(); g.rect(x, y - 2, fill === .5 ? 7 : 16, 18); g.clip(); g.fillStyle = col; g.beginPath(); g.arc(x + 4, y + 4, 3, 0, 7); g.arc(x + 10, y + 4, 3, 0, 7); g.moveTo(x + 1, y + 5); g.lineTo(x + 7, y + 11.5); g.lineTo(x + 13, y + 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 2, y + 2, 2, 2); g.restore(); };
    const hp = Math.max(0, me.hp); const hc = me.eff('poison') ? '#7a8f1e' : me.eff('wither') ? '#333' : '#e8231d';
    for (let i = 0; i < 10; i++) { const v = clamp(hp - i * 2, 0, 2); heart(i * 16, 28, v >= 2 ? 1 : v >= 1 ? .5 : 0, hc); }
    for (let i = 0; i < Math.ceil(me.absorb / 2); i++) heart(i * 16, 12, me.absorb - i * 2 >= 2 ? 1 : .5, '#e8c51d');
    const ar = me.armorPts()[0]; if (ar) for (let i = 0; i < 10; i++) { const v = clamp(ar - i * 2, 0, 2); g.fillStyle = '#111'; g.fillRect(i * 16 + 1, me.absorb ? -1 : 12, 13, 13); g.fillStyle = v >= 2 ? '#d8d8d8' : v ? '#8a8a8a' : '#3a3a3a'; g.fillRect(i * 16 + 2, me.absorb ? 0 : 13, 11, 11); }
    for (let i = 0; i < 10; i++) { const v = clamp(me.food - i * 2, 0, 2); const x = W - 16 - i * 16, y = 28; g.fillStyle = '#000'; g.beginPath(); g.arc(x + 7, y + 6, 6, 0, 7); g.fill(); g.fillStyle = v >= 2 ? '#b8743a' : v ? '#7a4c26' : '#3a2a1a'; g.beginPath(); g.arc(x + 7, y + 6, 4.5, 0, 7); g.fill(); g.fillStyle = '#eee'; g.fillRect(x + 9, y, 3, 4); }
    // xp
    const need = me.lvl < 16 ? 2 * me.lvl + 7 : me.lvl < 31 ? 5 * me.lvl - 38 : 9 * me.lvl - 158; $('rbXp').firstChild.style.width = Math.round(me.xp / need * 100) + '%'; $('rbLvl').textContent = me.lvl || ''; $('rbLvl').style.display = me.lvl ? '' : 'none';
  },
  // name tags + floating texts (DOM over the canvas)
  tags(vp, W, H) {
    const box = $('rbTags'); let h = ''; const cam = RR.cam.eye; const me = RG.me;
    for (const p of RG.players()) { if (p === me || p.spectator || p.alive === false || p.sneaking) continue; const pa = RG.area(p); if (!RG.gs.opts.tags && pa !== 'lobby' && pa !== 'playground') continue; /* other players' name tags: always in the lobby / playground, in matches only with the host option (default off) */ if (RUI.follow === p.id && me.spectator && !this.followThird) continue; const d = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z); if (d > 40) continue; const s = RR.project(p.x, p.y + 2.1, p.z); if (!s) continue; h += '<div class="rtag" style="left:' + (s[0] * W | 0) + 'px;top:' + (s[1] * H | 0) + 'px">' + esc(p.name) + (p.isBot ? ' <small>봇</small>' : '') + '</div>'; }
    for (const f of RB_MARK.floating_texts) { const P = RW.P(f.pos[0], f.pos[1] + 1.1, f.pos[2]); const d = Math.hypot(P.x - cam.x, P.y - cam.y, P.z - cam.z); if (d > 18) continue; const s = RR.project(P.x, P.y, P.z); if (!s) continue; h += '<div class="rtag rft" style="left:' + (s[0] * W | 0) + 'px;top:' + (s[1] * H | 0) + 'px">' + this.fmt(f.text) + '</div>'; }
    if (h !== this._tg) { this._tg = h; box.innerHTML = h; }
  },
  tab(on) { const t = $('rbTab'); if (!on) { t.classList.add('hide'); return; } const L = RG.players(); t.innerHTML = '<div class="rth">플레이어 · 이긴횟수</div>' + L.map(p => '<div><span>' + esc(p.name) + (p.isBot ? ' <small>봇</small>' : '') + (p === RG.me ? ' <small>(나)</small>' : '') + '</span><b>' + (p === RG.me ? RG.wins : p.wins || 0) + '</b></div>').join(''); t.classList.remove('hide'); },
  // ---------- the one menu (Esc · ☰ · M): 게임 메뉴 -> 설정 -> 화면 · 조작 / 조작법, 호스트 설정. Minecraft-style stone buttons
  // like 4중인격's pause screen; replaces the old menu chest, the lobby hotbar items and the separate settings chests.
  pg: 'main',
  MPAGE: { main: ['게임 메뉴', null], set: ['설정', 'main'], video: ['화면 · 조작 설정', 'set'], help: ['조작법', 'set'], host: ['호스트 설정', 'main'], multi: ['멀티플레이', null] },
  pause(on, pg) {
    if (on && (this.gui || this.chatOpen || RG.gs.ph === 'win')) return; this.paused = !!on; $('rbPause').classList.toggle('hide', !on);
    if (on) { if (document.pointerLockElement) document.exitPointerLock(); this.pg = pg || 'main'; this.menuDraw(); }
    else if (!this.mobile) RIN.lock();
  },
  menuGo(pg) { this.pg = pg; this.menuDraw(); const g = $('rbPause').querySelector('.rmgrid'); if (g) g.scrollTop = 0; },
  menuBack() { const up = this.MPAGE[this.pg] && this.MPAGE[this.pg][1]; if (up) this.menuGo(up); else this.pause(false); },
  // leave the menu for another screen (book, block palette, bot picker) without grabbing the mouse in between
  // (re-locking and unlocking in the same click left the cursor hidden in fullscreen)
  menuTo(fn) { this.paused = false; $('rbPause').classList.add('hide'); fn(); },
  refresh() { if (this.gui) this.render(); else if (this.paused) this.menuDraw(); },
  menuDraw() {
    if (!this.paused) return; const me = RG.me, host = RG.isHost(), O = RG.gs.opts, ph = RG.gs.ph, pg = this.pg, M = this._mi = [];
    const reg = o => { M.push(o); return M.length - 1; };
    const B = (txt, act, cls, tip) => '<button class="rmb' + (cls ? ' ' + cls : '') + '" data-m="' + reg({ act }) + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + this.fmt(txt) + '</button>';
    const T = (name, v, act, cls, tip) => B(name + ': ' + (v ? '켜짐' : '꺼짐'), act, (v ? 'on ' : '') + (cls || ''), tip);
    const R = (name, min, max, step, v, show, set) => { const i = reg({ set, show, name }); return '<label class="rmb rmr"><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-mr="' + i + '"><i class="rmfill" data-mf="' + i + '" style="width:' + ((v - min) / (max - min) * 100) + '%"></i><span data-mv="' + i + '">' + esc(name + ': ' + show(v)) + '</span></label>'; };
    const X = (name, v, max, set, hint) => '<label class="rmb rmt"><span>' + esc(name) + '</span><input type="text" maxlength="' + max + '" value="' + esc(v || '') + '" placeholder="' + esc(hint || '') + '" data-mt="' + reg({ set }) + '" autocapitalize="off" autocorrect="off" spellcheck="false"></label>';
    const H = (k, v, title) => { if (!host) { this.chat('§c호스트 외 설정 불가능'); RAU.play('anvil_land', 1, true); return; } this.hostSet(k, v, title); };
    const lock = host ? '' : ' dis';
    let h = '';
    if (pg === 'main') {
      const a = RG.area(me), inGame = (a === 'arena' || a === 'dm') && !me.spectator;
      h += B('게임으로 돌아가기', () => this.pause(false), 'full');
      h += B(me.spectator ? '관전 끝내기' : '관전하기', () => { this.pause(false); this.spec(!me.spectator); }, me.spectator ? 'on' : '', '날아다니며 경기를 보거나 플레이어 시점으로 따라가요 (관전 중에는 다음 게임에 참가하지 않아요)');
      h += B('로비로 이동', () => { if (inGame) return; if (me.spectator) this.spec(false); else RG.toSpawn(me); this.pause(false); }, inGame ? 'dis' : '', '스폰 지점으로 돌아가요 (경기 중 경기장에서는 안 돼요)');
      h += B('튜토리얼 & 정보', () => this.menuTo(() => this.open('book', { p: 0 })));
      h += B('시점: ' + ['1인칭', '3인칭 (뒤)', '3인칭 (앞)'][RR.third | 0], () => { RR.third = (RR.third + 1) % 3; this.menuDraw(); });
      h += B('설정...', () => this.menuGo('set'));
      h += B('호스트 설정...', () => this.menuGo('host'), '', host ? '게임 시간 · 옵션 · 봇 난이도 · 블록 커스텀' : '호스트 외 설정 불가능 (보기만 가능)');
      if (SITE.inFrame) h += B('§c게임 끄고 바탕화면으로', () => { RAU.stopBgm(); SITE.toParent({ t: 'close' }); }, 'full');
    } else if (pg === 'set') {
      h += R('효과음 볼륨', 0, 1, .05, this.vol, v => Math.round(v * 100) + '%', v => { this.vol = v; RAU.setVol(); });
      h += R('음악 볼륨', 0, 1, .05, this.mvol, v => Math.round(v * 100) + '%', v => { this.mvol = v; RAU.setVol(); });
      h += T('효과음', this.sfxOn, () => { this.sfxOn = !this.sfxOn; this.save(); this.menuDraw(); });
      if (!this.mobile) h += T('자동 전체화면', SITE.autoFs(), () => { SITE.setAutoFs(!SITE.autoFs()); this.menuDraw(); }, '', '게임 화면을 클릭하면 브라우저를 전체화면으로 바꿔요 (게임 창 크기는 그대로) · 바탕화면 설정과 같은 값');
      h += B('리소스팩: ' + RPACK.label(), () => RPACK.click(0), RPACK.on ? 'on' : '', '마인크래프트 1.21.4 바닐라 텍스처 · 사운드를 이 기기의 브라우저가 공식 미러에서 직접 받아요 (게임에 포함 안 됨)');
      if (RPACK.has) h += B('리소스팩 다시 받기', () => RPACK.click(2));
      h += B('화면 · 조작 설정...', () => this.menuGo('video'));
      h += B('조작법...', () => this.menuGo('help'), 'full');
    } else if (pg === 'multi') { // hotbar slot 4 in the lobby
      h += '<div class="rmnote">' + esc(NET.status || '') + '</div>';
      h += B('P2P 멀티플레이: ' + (SITE.p2pNow() ? '허용' : '꺼짐'), () => { const v = !SITE.p2pNow(); SITE.setP2PNow(v); if (v) NET.connect(this.room); else this.goOffline(true); this.menuDraw(); }, SITE.p2pNow() ? 'on full' : 'full', '다른 플레이어와 직접 연결해서 함께 플레이 (PeerJS · WebRTC)');
      h += X('닉네임', this.name, 16, v => { this.name = v || this.name; RG.me.name = this.name; this.save(); });
      h += X('스킨', this.skin, 16, v => { this.skin = v; RG.me.skin = v; SKIN.retry(v); this.save(); }, '마크 닉네임 (영문, 비우면 기본)');
      h += X('방 코드', this.room, 30, v => { const r = (v || 'main').toLowerCase(); if (r === this.room) return; this.room = r; this.save(); if (SITE.p2pNow()) { RG.remotes.clear(); NET.connect(this.room); } });
    } else if (pg === 'video') {
      h += R(this.mobile ? '터치 감도' : '마우스 감도', .3, 3, .05, this.sens, v => (+v).toFixed(2), v => { this.sens = v; });
      h += R('시야각', 50, 110, 1, this.fov, v => String(Math.round(v)), v => { this.fov = v; });
      const RES = [[1, '기본'], [.75, '낮게 (빠름)'], [.5, '매우 낮게']]; const ri = Math.max(0, RES.findIndex(r => r[0] === this.res));
      h += B('해상도: ' + RES[ri][1], () => { this.res = RES[(ri + 1) % RES.length][0]; this.save(); this.menuDraw(); });
      h += T('화면 흔들림', this.bob, () => { this.bob = !this.bob; this.save(); this.menuDraw(); });
      h += T('HUD 숨기기 (F1)', this.hideHud, () => { this.hideHud = !this.hideHud; this.menuDraw(); });
      if (this.mobile) {
        h += T('가로 전체화면', this.land, () => { this.toggleLand(); this.menuDraw(); });
        h += B('조작 방식: ' + (RTCTL.scheme === 'pe' ? '마크 PE' : '기존'), () => { RTCTL.setScheme(RTCTL.scheme === 'pe' ? 'classic' : 'pe'); this.menuDraw(); }, '', '기존: 조이스틱 + 버튼 / 마크 PE: 방향키 · 버튼 배치는 방식마다 따로 저장돼요');
        h += B('이동: ' + (RTCTL.moveStyle() === 'dpad' ? '방향키 버튼' : '조이스틱'), () => { RTCTL.setMove(RTCTL.moveStyle() === 'dpad' ? 'joy' : 'dpad'); this.menuDraw(); }, '', '조이스틱: 화면 왼쪽 아래를 끌기');
        h += B('웅크리기: ' + (RTCTL.sneakHold ? '누르는 동안만' : '눌러서 켜기/끄기'), () => { RTCTL.setSneakHold(!RTCTL.sneakHold); this.menuDraw(); });
        h += B('버튼 배치 편집...', () => RTCTL.openEditor(), 'full', '버튼을 끌어서 옮기고, 크기를 바꾸고, 빼거나 더할 수 있어요 (같은 버튼 여러 개도 가능)');
      }
    } else if (pg === 'help') {
      h += '<div class="rmhelp">' + this.HELP + '</div>';
    } else if (pg === 'host') {
      if (!host) h += '<div class="rmnote">호스트(가장 먼저 들어온 사람)만 바꿀 수 있어요 · 보기만 가능</div>';
      else if (ph !== 'lobby') h += '<div class="rmnote">경기 중에 바꾼 설정은 다음 판부터 적용돼요</div>';
      const lev = (k, title, tip) => B(title + ': ' + (O[k] ? '§a허용' : '§c비허용'), () => H(k, O[k] ? 0 : 1, title), (O[k] ? 'on' : '') + lock, tip);
      const step = d => { let t = O.time; do t = (t + d + 25) % 25; while (t === 23); return t; };
      h += '<div class="rmb rmpair' + lock + '"><button data-m="' + reg({ act: () => H('time', step(-1), '§a게임시간') }) + '">◀</button><span>' + this.fmt('게임시간: ' + RV.TIME[O.time]) + '</span><button data-m="' + reg({ act: () => H('time', step(1), '§a게임시간') }) + '">▶</button></div>';
      h += B('경기장 인원: ' + (O.big ? '25명' : '9명'), () => H('big', O.big ? 0 : 1, '경기장 인원'), lock, '9명: 33×33 / 25명: 53×53 · 25인 데스매치');
      const LV = ['쉬움', '보통', '어려움'], lv = O.botLv === undefined ? 1 : O.botLv | 0;
      h += B('봇 난이도: ' + ['§a', '§e', '§c'][lv] + LV[lv], () => H('botLv', (lv + 1) % 3, '봇 난이도'), lock, '어려움: 지금까지의 봇 · 보통 / 쉬움: 판단 · 반응 · 공격이 느려요');
      h += lev('tags', '상대 이름표 보이기', '다른 플레이어 머리 위 이름표 (기본: 안 보임)');
      h += lev('kit', '기본템 지급', '경기 시작 때 돌 곡괭이 · 돌 도끼 · 돌 검 + 치유 물약 4개 (봇 포함)');
      h += lev('brk', '시작시 주변블록 파괴', '게임 시작 때 주변 블록을 부숴요');
      h += lev('pvp', '경기장 PvP');
      h += lev('shield', '방패 제작');
      h += lev('build', '데스매치 건축');
      h += lev('lava', '데스매치 용암', '켜면 독가스 대신 45초에 용암이 올라와요');
      if (RG.bots.length) h += T('봇 AI', this.botAI, () => { if (!host) return; this.botAI = !this.botAI; this.menuDraw(); }, lock, '끄면 봇이 가만히 서 있어요 (테스트용)');
      h += B('블록 커스텀...', () => this.menuTo(() => this.open('palette')), '', RG.palInfo().replace(/§./g, '') + ' · 경기장에 나올 블록 종류 · 개수 · 확률');
      h += B('§c게임 초기화', () => { if (!host) return; RG.hostReset(); this.pause(false); }, 'full' + lock, '진행 중인 라운드를 끝내고 모두 로비로 보내요');
    }
    const P = this.MPAGE[pg];
    const el = $('rbPause'); el.innerHTML = '<div class="rmin"><h2>' + P[0] + (pg === 'host' && !host ? ' <small>(보기만 가능)</small>' : '') + '</h2><div class="rmgrid">' + h + '</div>'
      + (pg === 'main' ? '<div class="rmnote">' + esc(NET.status || '') + '</div>' : '<button class="rmb rmdone" data-m="' + reg({ act: () => this.menuBack() }) + '">완료</button>') + '</div>';
    for (const b of el.querySelectorAll('button[data-m]')) b.onclick = e => { e.stopPropagation(); if (b.classList.contains('dis') || b.closest('.dis')) { RAU.play('anvil_land', 1, true, .3); return; } RAU.play('click', 1, false, .4); const o = M[+b.dataset.m]; if (o && o.act) o.act(); };
    for (const r of el.querySelectorAll('[data-mr]')) { const i = +r.dataset.mr, o = M[i]; r.oninput = () => { const v = +r.value; o.set(v); el.querySelector('[data-mv="' + i + '"]').textContent = o.name + ': ' + o.show(v); el.querySelector('[data-mf="' + i + '"]').style.width = ((v - +r.min) / (+r.max - +r.min) * 100) + '%'; }; r.onchange = () => this.save(); }
    for (const t of el.querySelectorAll('[data-mt]')) { const o = M[+t.dataset.mt]; const commit = () => o.set(t.value.trim()); t.onchange = commit; t.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { commit(); t.blur(); } if (e.key === 'Escape') { t.blur(); this.menuDraw(); } }; t.onkeyup = e => e.stopPropagation(); }
  },
  HELP: '<b>PC</b><br>WASD 이동 · 마우스 시점 · 좌클릭(누르고 있기) 공격/블록 캐기 · 우클릭 놓기/사용/상자 열기 · Space 점프 · Shift 웅크리기(방패) · Ctrl 또는 W 두 번 달리기 · E 인벤토리 · Q 버리기(Ctrl+Q 묶음) · F 왼손 교체 · 1~9/휠 핫바 · T 채팅 · Tab 플레이어 목록 · V/F5 시점 · Esc 또는 M 메뉴 · F1 HUD 숨기기<br><br><b>모바일</b><br>왼쪽 드래그 이동 · 오른쪽 드래그 시점 · 탭 공격/놓기 · 길게 누르기 블록 캐기 · ☰ 메뉴',
  // ---------- spectator (관전) ----------
  spec(on, quiet) {
    const me = RG.me;
    if (on) { const ar = RG.area(me); if ((ar === 'arena' || ar === 'dm') && me.mode === 'survival') { this.chat('§c경기 중에는 관전할 수 없어요'); return; } me.mode = 'spectator'; RG.rd = 0; this.follow = null; const ph = RG.gs.ph; if (ph === 'dm') RG.tp(me, [3.5, 80, .5]); else if (ph !== 'lobby' && ph !== 'prep') RG.tp(me, [.5, 213, .5]); this.chat('§b👁 관전 모드 · 클릭하면 플레이어를 따라가요. 메뉴 상자(M)에서 끝낼 수 있어요'); this.specNext(1); }
    else { if (me.mode === 'spectator') { me.mode = 'adventure'; this.follow = null; RG.toSpawn(me); if (!quiet) this.chat('§7관전을 끝냈어요'); } }
  },
  specList() { return RG.players().filter(p => p !== RG.me && !p.spectator && p.alive !== false); },
  specNext(dir) { const L = this.specList(); if (!L.length) { this.follow = null; return; } let i = L.findIndex(p => p.id === this.follow); i = (i + dir + L.length) % L.length; this.follow = L[i].id; },
  specJump(i) { const L = this.specList(); if (L[i]) this.follow = L[i].id; },
  // ---------- interaction with blocks (right click) ----------
  interact(x, y, z) {
    const id = RW.getM(x, y, z), B = BL[id];
    if (B.use === 'chest') { this.open('chest', { x, y, z }); RAU.play('chest_open', 1, false, .6); return true; }
    if (B.use === 'furnace') { this.open('furnace', { x, y, z }); return true; }
    if (B.use === 'craft') { this.open('craft'); return true; }
    if (B.use === 'enchant') { this.open('enchant', { x, y, z }); return true; }
    if (B.use === 'anvil') { this.open('anvil'); return true; }
    if (B.use && RG.useBlock(x, y, z, RG.me)) { RG.me.swingAnim(); return true; }
    return false;
  },
  beChanged(key) { if (this.gui && this.gui.ctx && this.gui.ctx.key === key && !this.gui.dragging) this.render(); },
};
const RUI_CSS = `
body.rbsapp #app,body.rbsapp #newJobPop{display:none!important}body.rbsapp{background:#000;overflow:hidden;font-family:system-ui,'Malgun Gothic',sans-serif;user-select:none;-webkit-user-select:none}
#rbs{position:fixed;inset:0}#rcv{position:absolute;inset:0;width:100%;height:100%;display:block}
#rbHud{position:absolute;inset:0;pointer-events:none;color:#fff;text-shadow:2px 2px 0 #3f3f3f}body.rbhide #rbHud{display:none}body.rbcut #rbHud>:not(#rbTitle),body.rbcut #rbBottom,body.rbcut #rbTouch,body.rbcut #rbRing,body.rbcut #rbHeld,body.rbcut #rbTab{display:none!important}
#rbCross{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;mix-blend-mode:difference}#rbCross:before,#rbCross:after{content:'';position:absolute;background:#ddd}#rbCross:before{left:8px;top:0;width:2px;height:18px}#rbCross:after{top:8px;left:0;height:2px;width:18px}
#rbBottom{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
#rbBars{width:364px;height:46px;image-rendering:pixelated}#rbXp{width:364px;height:6px;background:#111;border:1px solid #000;margin:1px 0 3px;position:relative}#rbXp i{display:block;height:100%;background:#7efc20;width:0}
#rbLvl{position:absolute;left:50%;top:-14px;transform:translateX(-50%);color:#7efc20;font-weight:bold;font-size:15px}
#rbHotW{display:flex;align-items:flex-end;gap:8px;pointer-events:auto}#rbBottom,#rbChatF{z-index:11}#rbHot{display:flex;background:rgba(0,0,0,.45);border:2px solid #222;padding:1px}
.rhs,#rbOff{width:40px;height:40px;border:2px solid #8b8b8b;margin:0;position:relative;box-sizing:border-box}.rhs.sel{border-color:#fff;outline:2px solid #000;z-index:1;transform:scale(1.08)}#rbOff{background:rgba(0,0,0,.45);border-color:#555}
.ric{position:absolute;left:3px;top:3px;width:30px;height:30px;image-rendering:pixelated;pointer-events:none}.ric.glint{filter:drop-shadow(0 0 3px #c58cff) brightness(1.15)}
.rcn{position:absolute;right:2px;bottom:0;font-size:14px;font-weight:bold;color:#fff;text-shadow:2px 2px 0 #3f3f3f;pointer-events:none}.rdur{position:absolute;left:4px;right:4px;bottom:3px;height:3px;background:#000}.rdur i{display:block;height:2px}
#rbHeld{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);font-size:15px;transition:opacity .4s}
#rbTitle{position:absolute;left:0;right:0;top:26%;text-align:center;transition:opacity .5s}#rbTt{font-size:56px;font-weight:bold}#rbTs{font-size:24px;margin-top:6px}
#rbAct{position:absolute;left:0;right:0;bottom:134px;text-align:center;font-size:16px}
#rbChat{position:absolute;left:6px;bottom:150px;width:min(520px,70vw);max-height:44vh;overflow:hidden;font-size:14px;line-height:1.35}#rbChat.open{background:rgba(0,0,0,.4);overflow-y:auto;pointer-events:auto}.rcl{padding:1px 4px;background:rgba(0,0,0,.35);white-space:pre-wrap;transition:opacity .3s}
#rbChatF{position:absolute;left:6px;right:6px;bottom:110px;display:flex;gap:6px;pointer-events:auto}#rbChatF.hide{display:none}#rbChatIn{flex:1;font-size:16px;padding:6px;background:rgba(0,0,0,.6);color:#fff;border:1px solid #888}#rbChatF button{padding:0 12px}
#rbSide{position:absolute;right:4px;top:42%;transform:translateY(-50%);background:rgba(0,0,0,.35);font-size:13px;min-width:180px;text-shadow:none}#rbSide .rsh{text-align:center;padding:2px 6px;background:rgba(0,0,0,.3)}#rbSide>div:not(.rsh){display:flex;justify-content:space-between;gap:12px;padding:1px 6px}#rbSide b{color:#ff5555}
#rbCredit{position:absolute;right:6px;top:4px;font-size:12px;opacity:.85}.rbver{opacity:.8;margin-left:4px}.rbbeta{background:#e8a317;color:#000;font-size:10px;padding:0 4px;border-radius:2px;text-shadow:none;margin-left:4px}
#rbEff{position:absolute;right:6px;top:24px;font-size:13px;text-align:right}
#rbTags .rtag{position:absolute;transform:translate(-50%,-100%);background:rgba(0,0,0,.3);padding:0 4px;font-size:13px;white-space:nowrap;text-shadow:none}#rbTags .rft{background:transparent;text-shadow:2px 2px 0 #222;font-size:14px}
#rbTab{position:absolute;left:50%;top:10px;transform:translateX(-50%);background:rgba(0,0,0,.6);min-width:260px;font-size:14px;padding:4px;text-shadow:none}#rbTab .rth{text-align:center;color:#ff5}#rbTab>div:not(.rth){display:flex;justify-content:space-between;padding:1px 6px}#rbTab b{color:#ff5}#rbTab.hide{display:none}
#rbSpec{position:absolute;left:0;right:0;top:40px;text-align:center;font-size:16px;display:none}body.rbspec #rbSpec{display:block}body.rbspec #rbBottom,body.rbspec #rbCross{display:none}
#rbGui{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(16,16,16,.55);z-index:20}body.rbguiopen #rbGui{display:flex}
.rgw{background:#c6c6c6;border:3px solid;border-color:#fff #555 #555 #fff;border-radius:4px;padding:8px 10px;color:#3f3f3f;font-size:14px;max-height:96vh;overflow:auto;box-shadow:0 0 0 2px #000}
.rgw h4{margin:2px 0 6px;font-size:15px;font-weight:normal;color:#3f3f3f}.rgrow{display:flex;gap:0;flex-wrap:wrap}.rgsp{height:10px}
.rs{width:38px;height:38px;background:#8b8b8b;border:2px solid;border-color:#373737 #fff #fff #373737;position:relative;box-sizing:border-box;cursor:pointer}.rs:hover{background:#a8a8a8}.rs.big{width:50px;height:50px}.rs.big .ric{left:7px;top:7px;width:32px;height:32px}
.rs.act:hover{background:#c8e0a8}.rs .rlab{position:absolute;left:0;right:0;bottom:-15px;font-size:10px;text-align:center;color:#333;white-space:nowrap;pointer-events:none}.rs.on{background:#7ab55c}.rs.off{opacity:.55}
.rgflex{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rarrow{font-size:26px;color:#8b8b8b;min-width:36px;text-align:center}.rfire{color:#e65}.rgnote{font-size:12px;color:#555;max-width:360px}
.rench{display:flex;flex-direction:column;gap:4px;margin-left:8px}.rench button{width:220px;text-align:left;padding:4px 6px;background:#6e5a7a;color:#e8e0b0;border:2px solid #333;font-size:12px;cursor:pointer}.rench button:disabled{background:#4a4a4a;color:#888;cursor:default}
#rbCursor{position:fixed;width:36px;height:36px;pointer-events:none;z-index:50}
#rbTip{position:fixed;z-index:60;background:rgba(16,0,16,.94);border:2px solid #2b0f5a;color:#fff;padding:4px 7px;font-size:13px;pointer-events:none;display:none;max-width:300px;white-space:pre-wrap}
#rbPause{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:30}#rbPause.hide{display:none}
.rpin{display:flex;flex-direction:column;gap:8px;width:min(400px,90vw);color:#fff}.rpin h2{text-align:center;margin:0 0 8px}
.rpin button,.rbtn{background:#6f6f6f;border:2px solid;border-color:#aaa #333 #333 #aaa;color:#fff;font-size:16px;padding:9px;cursor:pointer;text-shadow:1px 1px 0 #333}.rpin button:hover,.rbtn:hover{background:#7f86c0}
#rbPause{cursor:default}.rmin{display:flex;flex-direction:column;width:min(620px,94vw);max-height:94vh;color:#fff}.rmin h2{text-align:center;margin:0 0 10px;font-size:20px;font-weight:normal;text-shadow:2px 2px 0 #3f3f3f}.rmin h2 small{font-size:13px;color:#ccc}
.rmgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px;overflow:auto;padding:2px;min-height:0}.rmgrid .full,.rmgrid .rmpair,.rmgrid .rmhelp,.rmgrid .rmnote{grid-column:1/-1}
.rmb{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;box-sizing:border-box;background:#6f6f6f;border:2px solid;border-color:#aaa #333 #333 #aaa;outline:2px solid #000;outline-offset:-1px;color:#fff;font:15px system-ui,'Malgun Gothic',sans-serif;padding:6px 10px;cursor:pointer;text-shadow:2px 2px 0 #3f3f3f;text-align:center;margin:0}
button.rmb:hover,.rmpair button:hover{background:#7f86c0}.rmb.on{box-shadow:inset 0 -3px 0 #3d9e3d}.rmb.dis,.rmb.dis button{color:#a0a0a0;cursor:default}button.rmb.dis:hover,.rmb.dis button:hover{background:#6f6f6f}
.rmr{padding:0;overflow:hidden;background:#3c3c3c}.rmr input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:2}.rmr span{position:relative;pointer-events:none}.rmfill{position:absolute;left:0;top:0;bottom:0;background:#6f6f6f;border-right:4px solid #c8c8c8}
.rmt{justify-content:space-between;cursor:text}.rmt input{flex:1;min-width:0;background:#000;border:2px solid #a0a0a0;color:#fff;font-size:15px;padding:4px 6px}.rmt input:focus{border-color:#fff;outline:none}
.rmpair{padding:0;justify-content:space-between;cursor:default}.rmpair button{background:#5a5a5a;border:0;border-right:2px solid #333;color:#fff;font-size:15px;width:56px;align-self:stretch;cursor:pointer}.rmpair button:last-child{border:0;border-left:2px solid #333}
.rmhelp{font-size:14px;line-height:1.6;color:#ddd;background:rgba(0,0,0,.35);padding:10px}.rmnote{font-size:12px;color:#bbb;text-align:center;padding:4px}.rmdone{margin-top:10px;width:min(300px,100%);align-self:center}
@media (max-width:560px){.rmgrid{grid-template-columns:1fr}}
.rbook{width:min(420px,92vw);background:#f6efd8;color:#222;padding:18px 22px;font-size:14px;line-height:1.6;min-height:340px;display:flex;flex-direction:column;border-radius:4px;box-shadow:0 0 0 3px #6b4f2a}.rbook .rbp{flex:1;white-space:pre-wrap}.rbook .rbn{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.rform{display:flex;flex-direction:column;gap:8px;min-width:280px}.rform label{display:flex;justify-content:space-between;align-items:center;gap:10px}.rform input[type=text]{flex:1;padding:6px;font-size:15px}
#rbTouch{position:absolute;inset:0;display:none;z-index:10}body.rbmob #rbTouch{display:block}body.rbguiopen #rbTouch{display:none}
#rbJoy{position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);display:none;pointer-events:none}#rbKnob{position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.4)}
.rtb{position:absolute;width:58px;height:58px;border-radius:10px;background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.35);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center}.rtb.on,.rtb.lit{background:rgba(255,255,255,.35)}
#rbRot{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);background:rgba(0,0,0,.75);color:#fff;padding:12px 16px;border-radius:10px;font-size:15px;display:none;z-index:40;text-align:center}body.rbmob.rbport #rbRot{display:block}
body.rbmob #rbSide{left:6px;right:auto;top:6px;transform:none;font-size:11px;min-width:140px}body.rbmob #rbChat{max-height:30vh}body.rbmob #rbBars{width:300px;height:38px}body.rbmob #rbXp{width:300px}body.rbmob .rhs,body.rbmob #rbOff{width:36px;height:36px}body.rbmob .ric{width:26px;height:26px}
body.rbmob #rbTt{font-size:36px}body.rbmob #rbTs{font-size:18px}body.rbmob #rbChat{bottom:120px;font-size:12px}
.rlist{width:min(560px,96vw);max-height:92vh;padding:8px}.rlhead{display:flex;align-items:center;gap:6px;margin-bottom:6px}.rlhead b{flex:1;font-size:16px}.rlhead .rbtn{font-size:13px;padding:6px 10px}
.rli{display:flex;align-items:center;gap:10px;padding:8px;margin:4px 0;background:#8b8b8b;border:2px solid;border-color:#fff #373737 #373737 #fff;color:#111;cursor:pointer}.rli:active{background:#a8a8a8}.rli.on{background:#9a9a9a;box-shadow:inset 8px 0 0 #2f9e2f}.rli.rdesk{background:#b86a6a}
.rli img{width:34px;height:34px;image-rendering:pixelated;flex:none}.rli .rlt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rli .rlt b{font-size:15px;text-shadow:none;color:#111}.rli .rlt b span{text-shadow:1px 1px 0 rgba(0,0,0,.35)}.rli small{font-size:12px;line-height:1.35}.rli small span{color:#2b2b2b!important}.rli:hover{background:#9c9c9c}.rrb{contain:size;min-height:260px}.rrbg{overflow:hidden}.rrbn{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px;font-size:13px}.rrbn .rbtn{padding:2px 10px;font-size:13px}.rrbn .rbtn:disabled{opacity:.4}
.rdollw{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:110px}.rdolln{font-size:11px;color:#444;text-align:center}
.rdoll{width:104px;height:140px;background:#000;border:2px solid;border-color:#373737 #fff #fff #373737;position:relative;perspective:420px;overflow:hidden}
.rdm{position:absolute;left:50%;top:44%;transform-style:preserve-3d;transform:rotateX(-8deg) rotateY(-20deg)}.rdhead,.rdb{position:absolute;left:0;top:0;transform-style:preserve-3d}
.rdb i{position:absolute;left:0;top:0;image-rendering:pixelated;backface-visibility:hidden;background-repeat:no-repeat}.rdb.ov i{pointer-events:none}
.rgwrap{display:flex;gap:6px;align-items:stretch;max-height:96vh}
.rrb{width:226px;display:flex;flex-direction:column;padding:6px}.rrbh{display:flex;align-items:center;gap:6px;margin-bottom:4px}.rrbh b{flex:1;font-size:14px}.rrbh label{font-size:11px;display:flex;align-items:center;gap:2px;cursor:pointer}
.rrbg{display:grid;grid-template-columns:repeat(5,38px);gap:3px;overflow-y:auto;flex:1;min-height:0;align-content:start;padding:2px}
.rrbi{width:38px;height:38px;box-sizing:border-box;background:#9a6a6a;border:2px solid;border-color:#c99 #533 #533 #c99;position:relative;cursor:pointer;opacity:.6}
.rrbi.ok{background:#8b8b8b;border-color:#fff #373737 #373737 #fff;opacity:1}.rrbi.ok:hover{background:#a9c98d}.rrbi.big:not(.ok){background:#777;border-color:#999 #444 #444 #999;opacity:.45}
.rrbi img{position:absolute;left:3px;top:3px;width:28px;height:28px;image-rendering:pixelated;pointer-events:none}.rrbi b{position:absolute;right:1px;bottom:0;font-size:11px;color:#fff;text-shadow:1px 1px 0 #333;pointer-events:none}
.rpal{width:min(620px,96vw)}.rpmode{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:2px 0 6px}.rpmode small{flex-basis:100%;font-size:12px;color:#333}.rbtn.on{background:#3d8a3d}
.rplist{max-height:min(46vh,380px);overflow-y:auto;border:2px solid;border-color:#555 #fff #fff #555;background:#a8a8a8;padding:2px}
.rpr{display:flex;align-items:center;gap:8px;padding:3px 6px;border-bottom:1px solid #8f8f8f}.rpr img{width:26px;height:26px;image-rendering:pixelated}.rpr .rpn{flex:1;font-size:13px;color:#111;min-width:0}
.rpr input{width:76px;font-size:14px;padding:4px;border:2px solid #555;background:#eee}.rpr .rpp{width:72px;font-size:11px;text-align:right;color:#222;line-height:1.2}.rpr .rbtn{padding:3px 8px;font-size:12px}
.rpbtn{flex-wrap:wrap;gap:6px;margin-top:6px}.rpbtn .rbtn{font-size:13px;padding:7px 10px}.rpsave{background:#3d8a3d!important}
.rpick{display:grid;grid-template-columns:repeat(auto-fill,34px);gap:3px;max-height:150px;overflow-y:auto;margin-top:6px;padding:4px;background:#8b8b8b;border:2px solid;border-color:#373737 #fff #fff #373737}
.rpick img{width:32px;height:32px;image-rendering:pixelated;cursor:pointer;background:#9d9d9d}.rpick img:hover{background:#c8e0a8}
.rbotp{width:min(440px,94vw);text-align:center}.rbotp small{display:block;margin:6px 0;color:#333}.rbnrow{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:8px 0}.rbnrow .rbtn{width:44px;font-size:18px}
body.rbmob .rrb{width:180px}body.rbmob .rrbg{grid-template-columns:repeat(4,38px)}
.rli .rbtn{font-size:13px;padding:8px 10px;flex:none}
body.rbmob #rbTip{font-size:13px;max-width:220px}
.hide{display:none}
#rbNet{position:absolute;inset:0;z-index:25;background:#1d1d1d;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:15px system-ui,'Malgun Gothic',sans-serif;text-shadow:2px 2px 0 #000;padding:16px;box-sizing:border-box}
#rbNet.hide{display:none}.rnin{width:min(440px,90vw);text-align:center;margin-top:auto}
.rncube{display:flex;gap:8px;justify-content:center;margin-bottom:18px}.rncube i{width:16px;height:16px;background:#80d850;box-shadow:inset -3px -3px 0 #4a9a2a;animation:rnb 1.2s infinite ease-in-out}.rncube i:nth-child(2){animation-delay:.2s;background:#5aa0e0;box-shadow:inset -3px -3px 0 #2d6aa6}.rncube i:nth-child(3){animation-delay:.4s;background:#e0b050;box-shadow:inset -3px -3px 0 #a87a20}
@keyframes rnb{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}}
.rnt{font-size:20px;font-weight:700;margin-bottom:10px}.rns{min-height:22px;color:#e8e8e8;word-break:keep-all}.rni{margin-top:10px;font-size:13px;color:#9a9a9a;line-height:1.6}
.rnbar{height:6px;background:#333;margin:14px auto 0;width:70%;overflow:hidden;outline:2px solid #000}.rnbar i{display:block;height:100%;width:30%;background:linear-gradient(#80d850,#4a9a2a);animation:rnbar 1.4s infinite linear}
@keyframes rnbar{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}
#rbNetOff{margin-top:auto;margin-bottom:6vh;min-width:min(320px,80vw);font-size:16px;min-height:48px}
body.rbmob #rbNetOff{min-height:56px;font-size:17px}
`;
const RUI_HTML = `<canvas id="rcv"></canvas>
<div id="rbHud"><div id="rbTags"></div><div id="rbCross"></div><div id="rbCredit"></div><div id="rbEff"></div><div id="rbSide"></div><div id="rbSpec"><div id="rbSpecT"></div></div>
<div id="rbTitle"><div id="rbTt"></div><div id="rbTs"></div></div><div id="rbAct"></div><div id="rbChat"></div>
<form id="rbChatF" class="hide" autocomplete="off"><input id="rbChatIn" maxlength="120" placeholder="메시지 입력" enterkeyhint="send"><button class="rbtn">전송</button><button type="button" class="rbtn" id="rbChatX">✕</button></form>
<div id="rbHeld"></div><div id="rbTab" class="hide"></div>
<div id="rbBottom"><canvas id="rbBars"></canvas><div id="rbXp"><i></i><span id="rbLvl"></span></div><div id="rbHotW"><div id="rbOff"></div><div id="rbHot"></div></div></div></div>
<div id="rbTouch"><div id="rbJoy"><div id="rbKnob"></div></div></div><div id="rbRot">📱 가로 화면 권장 · 탭해서 가로 전체화면</div>
<div id="rbGui"></div><div id="rbCursor"></div><div id="rbTip"></div><div id="rbPause" class="hide"></div>
<div id="rbNet" class="hide"><div class="rnin"><div class="rncube"><i></i><i></i><i></i></div><div class="rnt">멀티플레이 서버에 연결하는 중</div><div id="rbNetS" class="rns"></div><div class="rnbar"><i></i></div><div id="rbNetI" class="rni"></div></div><button id="rbNetOff" class="rmb">오프라인 모드로 전환</button></div>`;
