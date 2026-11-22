// ===================== site shell: the virtual desktop is the main page (PC + mobile) =====================
// Each game runs in its own window as an iframe of this same page (?app=apvp | ?app=rbs), so both games can be open
// at once without sharing globals. Opening a game first shows the P2P consent screen (allow / deny / don't ask again).
// Games talk to the desktop with postMessage ({site:1, t:...}): fullscreen requests, window mode, focus.
const SITE = {
  inFrame: (() => { try { return window.parent !== window; } catch (e) { return true; } })(),
  q: new URLSearchParams(location.search),
  // P2P consent: {allow: bool, remember: bool} in localStorage (shared by both games, same origin)
  getP2P() { try { return JSON.parse(localStorage.getItem('site_p2p') || 'null'); } catch (e) { return null; } },
  setP2P(allow, remember) { const o = this.getP2P() || {}; o.allow = !!allow; if (remember !== undefined) o.remember = !!remember; try { localStorage.setItem('site_p2p', JSON.stringify(o)); } catch (e) { } },
  // inside a game frame: the answer given on the consent screen (URL), changed later by the in-game toggle
  p2pNow() { const v = window.SITE_P2PQ !== undefined ? String(window.SITE_P2PQ) : this.q.get('p2p'); if (this._p2p !== undefined) return this._p2p; if (v === '0' || v === '1') return v === '1'; const s = this.getP2P(); return s ? s.allow !== false : true; },
  setP2PNow(v) { this._p2p = !!v; this.setP2P(!!v); },
  // 자동 전체화면 (PC): clicking into a game makes the BROWSER fullscreen (+ keyboard lock against Ctrl+W); the game window keeps
  // its own size. One site-wide switch (localStorage site_autofs, default on) shared by the desktop settings and both games.
  autoFs() { try { return localStorage.getItem('site_autofs') !== '0'; } catch (e) { return true; } },
  setAutoFs(v) { try { localStorage.setItem('site_autofs', v ? '1' : '0'); } catch (e) { } },
  toParent(m) { if (this.inFrame) try { parent.postMessage(Object.assign({ site: 1 }, m), '*'); } catch (e) { } },
  // 가로 전체화면 끄기 (phones): leave fullscreen right away, inside the tap (waiting for the rotation first left some phones
  // turned portrait but still fullscreen). Ask for portrait at the same moment, retry the exit once, then release the lock.
  landOff() {
    const d = document, o = screen.orientation, isFs = () => d.fullscreenElement || d.webkitFullscreenElement;
    const exit = () => { if (!isFs()) return; try { const ex = d.exitFullscreen || d.webkitExitFullscreen; const p = ex && ex.call(d); if (p && p.catch) p.catch(() => { }); } catch (e) { } };
    try { const q = o && o.lock && isFs() && o.lock('portrait'); if (q && q.catch) q.catch(() => { }); } catch (e) { }
    exit(); setTimeout(exit, 500);
    setTimeout(() => { try { o && o.unlock && o.unlock(); } catch (e) { } }, 700);
  },
  isMobile() { return matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); },
  // ---------- site version ----------
  // SITE_VER (js/data/version.js) = the version this page was loaded with; version.json on the site is bumped on every commit
  // (tools/bump_version.py). Top pages poll it and show a refresh notice when it changes; game windows inside the desktop don't poll.
  VER: typeof SITE_VER !== 'undefined' ? SITE_VER : '',
  // 4중인격 '개발 도구 창 열기': inside the desktop -> a dev tool window next to the game; alone -> 사이트주소/ability_pvp_dev in a new tab
  openDev() {
    if (this.inFrame) { this.toParent({ t: 'dev' }); return true; }
    if (window.SITE_MULTI && /^https?:$/.test(location.protocol)) { window.open(new URL('ability_pvp_dev/nodesktop/', document.baseURI).href, '_blank'); return true; }
    devDownload(); return false; // single file opened from disk: no site to open, save the dev tool copy instead
  },
  verLabel() { return this.VER ? 'v' + this.VER : ''; },
  watchVer() {
    if (this.inFrame || !this.VER || !window.SITE_MULTI || !/^https?:$/.test(location.protocol)) return;
    let shown = '';
    const check = () => fetch(new URL('version.json?t=' + Date.now(), document.baseURI), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !j.ver || j.ver === this.VER || j.ver === shown) return; shown = j.ver; this.verNotice(j.ver);
    }).catch(() => { });
    setTimeout(check, 20000); setInterval(check, 180000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  },
  verNotice(ver) {
    let d = document.getElementById('siteVerNote'); if (d) d.remove();
    d = document.createElement('div'); d.id = 'siteVerNote';
    d.innerHTML = '<div class="svt">새 버전이 나왔어요! <b>v' + ver + '</b></div><div class="svs">지금 버전 v' + this.VER + ' · 새로고침하면 적용돼요 (진행 중인 게임은 끊겨요)</div>'
      + '<div class="svb"><button class="svy">새로고침</button><button class="svn">나중에</button></div>';
    document.body.appendChild(d);
    d.querySelector('.svy').onclick = () => location.reload(); d.querySelector('.svn').onclick = () => d.remove();
  },
};
if (SITE.inFrame && SITE.isMobile()) { const fs = () => SITE.toParent({ t: 'fs', lock: false }); addEventListener('touchend', fs, { once: true, capture: true }); }
const APP = (() => { if (window.APVP_DEV) return 'apvp'; const a = window.SITE_APP || SITE.q.get('app'); return a === 'apvp' || a === 'rbs' ? a : 'desk'; })();

const DESK = {
  TB: 42, TITLE: 32, z: 10, wins: {}, APPS: [], mobile: false,
  addApp(a) { this.APPS.push(Object.assign({ w: 640, h: 440 }, a)); },
  load() { try { const s = JSON.parse(localStorage.getItem('apvp_desk3') || 'null') || {}; this.saved = s.wins || {}; this.wall = s.wall || null; } catch (e) { this.saved = {}; } },
  save() { try { const wins = {}; for (const id in this.wins) { const w = this.wins[id]; wins[id] = { x: w.x, y: w.y, w: w.w, h: w.h, mode: w.mode === 'full' ? 'normal' : w.mode }; } localStorage.setItem('apvp_desk3', JSON.stringify({ wins: Object.assign({}, this.saved, wins), wall: this.wall })); } catch (e) { } },
  // old in-game hooks (apvp code asks these): the desktop only exists in the top page now
  active() { return APP === 'desk'; }, hidden() { return false; }, game() { return null; }, refreshStart() { if ($('dkStartMenu') && !$('dkStartMenu').classList.contains('hide')) this.startMenu(true); },
  init() {
    this.mobile = SITE.isMobile(); this.load(); document.body.classList.add('desk', 'deskonly'); document.body.classList.toggle('dkmob', this.mobile);
    const d = document.createElement('div'); d.id = 'desk';
    d.innerHTML = '<div id="dkWall"></div><div id="dkIcons"></div><div id="dkWins"></div>'
      + '<div id="dkBar"><button id="dkStart">⊞ 시작</button><div id="dkStartMenu" class="hide"></div><div id="dkTasks"></div><div class="dkfill"></div><div id="dkClock"></div><button id="dkExit"></button></div>';
    document.body.insertBefore(d, document.body.firstChild);
    this.setWall(this.wall);
    this.icons();
    $('dkWall').onmousedown = () => { for (const o of document.querySelectorAll('.dkIcon')) o.classList.remove('sel'); this.startMenu(false); this.folder(null); };
    $('dkExit').onclick = () => this.toggleFs();
    $('dkStart').onclick = e => { e.stopPropagation(); this.startMenu(); };
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (x) { } } this.sync(); });
    addEventListener('resize', () => this.sync());
    // clicking into a game iframe doesn't bubble to us: the top window blurs and activeElement becomes that iframe
    addEventListener('blur', () => setTimeout(() => { const f = document.activeElement; if (f && f.tagName === 'IFRAME') { const w = Object.values(this.wins).find(W => W.frame === f); if (w) this.focus(w.id); } }, 0));
    addEventListener('message', e => this.onMsg(e));
    // 자동 전체화면 (PC): any click on the desktop itself also goes browser-fullscreen (game windows ask through {t:'fs', auto:1})
    // skipped on the controls that toggle fullscreen / the setting themselves
    document.addEventListener('mousedown', e => { if (this.mobile || !SITE.autoFs() || document.fullscreenElement) return; const t = e.target; if (!t.closest || t.closest('#dkExit, #dkStartMenu [data-a="fs"], #setFs')) return; const lb = t.closest('label'); if (lb && lb.querySelector('#setFs')) return; this.goFs(false); }, true);
    const tick = () => { const n = new Date(); $('dkClock').innerHTML = n.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) + '<br><small>' + n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') + '</small>'; };
    tick(); setInterval(tick, 5000);
    this.sync();
    // the plain site address shows just the desktop; 바로 들어가기 pages (사이트주소/ability_pvp, /randomblock -> SITE_OPEN) open that game maximised
    const first = window.SITE_OPEN; if (first && this.APPS.some(a => a.id === first)) { this.open(first); this.setMode(first, 'max'); }
  },
  // ---------- desktop icons (apps with `in` live inside a folder app: { folder: true }) ----------
  ico(a) { return a.img ? '<img src="' + a.img + '">' : a.icon; },
  iconHTML(a) {
    const inner = a.folder ? '<div class="dkfgrid">' + this.APPS.filter(b => b.in === a.id).slice(0, 4).map(b => '<span style="background:' + (b.bg || '#3c6a24') + '">' + this.ico(b) + '</span>').join('') + '</div>' : this.ico(a);
    return '<div class="dkIcon' + (a.folder ? ' dkfold' : '') + '" data-app="' + a.id + '" title="' + (a.folder || this.mobile ? '' : '더블클릭해서 열기') + '"><div class="dkimg" style="background:' + (a.folder ? 'rgba(255,255,255,.28)' : a.bg || '#3c6a24') + '">' + inner + '</div><div class="dklbl">' + a.label + '</div></div>';
  },
  bindIcon(el, inFolder) {
    const go = () => { const A = this.APPS.find(a => a.id === el.dataset.app); if (!A) return; if (A.folder) return this.folder(A.id, el); this.folder(null); this.open(A.id); if (this.mobile && A.game) { this.setMode(A.id, 'full'); this.goFs(false); } };
    el.onclick = e => { e.stopPropagation(); const A = this.APPS.find(a => a.id === el.dataset.app); if (this.mobile || inFolder || (A && A.folder)) return go(); for (const o of document.querySelectorAll('.dkIcon')) o.classList.remove('sel'); el.classList.add('sel'); };
    el.ondblclick = () => { if (!this.mobile && !inFolder) { const A = this.APPS.find(a => a.id === el.dataset.app); if (A && !A.folder) go(); } };
  },
  icons() {
    $('dkIcons').innerHTML = this.APPS.filter(a => !a.hidden && !a.in).map(a => this.iconHTML(a)).join('');
    for (const el of document.querySelectorAll('#dkIcons .dkIcon')) this.bindIcon(el, false);
  },
  // Android-style folder: a rounded panel grows out of the folder icon and shows the apps inside; tap outside closes it
  folder(id, from) {
    let P = $('dkFolder');
    if (!id) { if (P && !P.classList.contains('closing')) { P.classList.add('closing'); P.classList.remove('open'); setTimeout(() => P.remove(), 220); } return; }
    if (P) P.remove();
    const F = this.APPS.find(a => a.id === id), apps = this.APPS.filter(a => a.in === id);
    P = document.createElement('div'); P.id = 'dkFolder';
    P.innerHTML = '<div class="dkfpan"><div class="dkfttl">' + F.title + '</div><div class="dkfapps">' + apps.map(a => this.iconHTML(a)).join('') + '</div></div>';
    $('desk').appendChild(P);
    const pan = P.querySelector('.dkfpan'), r = from.querySelector('.dkimg').getBoundingClientRect(), pr = pan.getBoundingClientRect();
    pan.style.transformOrigin = (r.left + r.width / 2 - pr.left) + 'px ' + (r.top + r.height / 2 - pr.top) + 'px';
    pan.style.setProperty('--s0', Math.min(r.width / pr.width, r.height / pr.height).toFixed(3));
    for (const el of P.querySelectorAll('.dkIcon')) this.bindIcon(el, true);
    P.addEventListener('mousedown', e => { if (e.target === P) this.folder(null); });
    P.addEventListener('touchstart', e => { if (e.target === P) { e.preventDefault(); this.folder(null); } }, { passive: false });
    requestAnimationFrame(() => requestAnimationFrame(() => P.classList.add('open')));
  },
  onMsg(e) {
    const m = e.data; if (!m || !m.site) return; const W = Object.values(this.wins).find(w => w.frame && w.frame.contentWindow === e.source); if (!W) return;
    if (m.t === 'fs') {
      if (m.auto && !this.mobile) { if (!SITE.autoFs()) return; if (!document.fullscreenElement) this.goFs(m.lock); else if (m.lock) this.kLock(); return; } // browser only, window untouched
      this.setMode(W.id, 'full'); if (!document.fullscreenElement) this.goFs(m.lock); else if (m.lock) this.kLock(); }
    else if (m.t === 'unfs') { if (W.mode === 'full') this.setMode(W.id, this.mobile ? 'max' : 'normal'); if (document.fullscreenElement) try { document.exitFullscreen(); } catch (x) { } }
    else if (m.t === 'win') { this.setMode(W.id, this.mobile ? 'max' : 'normal'); }
    else if (m.t === 'land') { if (m.on) this.setMode(W.id, 'full'); this.land(!!m.on); }
    else if (m.t === 'dev') { const D = this.wins.apvp_dev, fresh = !D || D.closed; if (fresh && !this.mobile && !this.saved.apvp_dev) { const r = this.defRect(this.APPS.find(a => a.id === 'apvp_dev')); const w = this.mkWin('apvp_dev'); Object.assign(w, r, { mode: 'normal', x: (W.mode === 'normal' ? W.x : r.x) + 48, y: (W.mode === 'normal' ? W.y : r.y) + 36 }); } this.open('apvp_dev'); } // a new window like any app (no side-by-side tiling)
    else if (m.t === 'title') { W.el.querySelector('.dktt').textContent = m.title; }
    else if (m.t === 'close') { this.close(W.id); if (document.fullscreenElement && !Object.values(this.wins).some(w => !w.closed && w.mode === 'full')) try { document.exitFullscreen(); } catch (x) { } }
  },
  land(on) {
    const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => { }); } catch (e) { } };
    if (!on) { SITE.landOff(); return; }
    if (document.fullscreenElement) { lock(); return; } const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen; try { const p = rq && rq.call(el, { navigationUI: 'hide' }); if (p && p.then) p.then(lock).catch(lock); else lock(); } catch (e) { lock(); }
  },
  kLock() { if (!(navigator.keyboard && navigator.keyboard.lock)) return; try { const q = navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyT', 'KeyN', 'KeyR', 'KeyQ', 'KeyE', 'KeyF', 'KeyV', 'Tab', 'Space', 'ControlLeft', 'ControlRight', 'Escape']); if (q && q.catch) q.catch(() => { }); } catch (x) { } },
  goFs(lock) { const el = document.documentElement; try { const p = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(() => { if (lock) this.kLock(); }).catch(() => { }); } catch (x) { } },
  // ---------- windows ----------
  mkWin(id) {
    const A = this.APPS.find(a => a.id === id); if (!A) return null; if (this.wins[id]) return this.wins[id];
    const el = document.createElement('div'); el.className = 'dkWin'; el.dataset.app = id;
    el.innerHTML = '<div class="dkTitle"><span class="dkti">' + (A.img ? '<img src="' + A.img + '">' : A.icon) + '</span><span class="dktt">' + A.title + '</span><span class="dkbtns"><button class="bMin" title="최소화">─</button><button class="bMax" title="최대화">▢</button>' + (A.game ? '<button class="bFull" title="꽉 찬 화면">⛶</button>' : '') + '<button class="bClose" title="닫기">✕</button></span></div><div class="dkBody"></div>'
      + ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(k => '<div class="dkrz dk-' + k + '" data-k="' + k + '"></div>').join('');
    $('dkWins').appendChild(el);
    const sv = this.saved[id] || {}; const W = { id, A, el, body: el.querySelector('.dkBody'), x: sv.x, y: sv.y, w: sv.w, h: sv.h, mode: this.mobile ? (A.game ? 'full' : 'max') : (sv.mode || 'normal'), min: false, closed: true, z: ++this.z };
    if (!W.w) Object.assign(W, this.defRect(A));
    this.wins[id] = W;
    el.querySelector('.bMin').onclick = () => this.minimize(id); el.querySelector('.bMax').onclick = () => this.setMode(id, W.mode === 'max' ? 'normal' : 'max'); el.querySelector('.bClose').onclick = () => this.close(id);
    if (A.game) el.querySelector('.bFull').onclick = () => { this.setMode(id, 'full'); this.goFs(false); };
    const tt = el.querySelector('.dkTitle'); tt.ondblclick = e => { if (e.target.tagName !== 'BUTTON') this.setMode(id, W.mode === 'max' ? 'normal' : 'max'); };
    el.addEventListener('mousedown', () => this.focus(id), true); el.addEventListener('touchstart', () => this.focus(id), { capture: true, passive: true });
    tt.addEventListener('mousedown', e => { if (e.target.tagName !== 'BUTTON') this.drag(W, e, 'move'); });
    for (const h of el.querySelectorAll('.dkrz')) h.addEventListener('mousedown', e => this.drag(W, e, h.dataset.k));
    const tb = document.createElement('button'); tb.className = 'dkTask'; tb.innerHTML = '<span>' + (A.img ? '<img src="' + A.img + '">' : A.icon) + '</span> ' + A.title; tb.onclick = () => { if (W.closed || W.min || this.top() !== W) this.open(id); else this.minimize(id); }; $('dkTasks').appendChild(tb); W.task = tb;
    return W;
  },
  defRect(A) { const SW = innerWidth, SH = innerHeight - this.TB; const w = Math.round(Math.min(A.w || 1280, SW * (A.game ? .78 : .5))), h = Math.round(Math.min(A.h || 800, SH * (A.game ? .8 : .6))); return { x: Math.round((SW - w) / 2), y: Math.round((SH - h - this.TITLE) / 2), w, h }; },
  top() { let b = null; for (const id in this.wins) { const w = this.wins[id]; if (w.closed || w.min) continue; if (!b || w.z > b.z) b = w; } return b; },
  focus(id) { const W = this.wins[id]; if (!W || this.top() === W) return; const prev = this.top(); W.z = ++this.z; if (prev && prev !== W) this.blurApp(prev); this.sync(); },
  open(id) {
    const L = this.APPS.find(a => a.id === id); if (L && L.url) { window.open(L.url, '_blank', 'noopener'); this.startMenu(false); return; } // link apps
    const W = this.wins[id] || this.mkWin(id); if (!W) return; const was = W.closed; const prev = this.top(); W.min = false; W.closed = false; if (W.mode === 'full' && !(this.mobile && W.A.game)) W.mode = this.mobile ? 'max' : 'normal'; if (this.mobile && W.A.game) W.mode = 'full'; W.z = ++this.z; if (prev && prev !== W) this.blurApp(prev);
    this.startMenu(false); this.sync(); this.save();
    if (was) { if (W.A.game) this.gameStart(W); else if (W.A.frame) this.loadFrame(W); else if (W.A.build) W.A.build(W.body, W); }
    else if (W.A.onOpen) W.A.onOpen(W.body, W);
  },
  minimize(id) { const W = this.wins[id]; W.min = true; this.blurApp(W); this.sync(); },
  close(id) { const W = this.wins[id]; if (!W) return; W.closed = true; W.min = false; if (W.frame) { try { W.frame.src = 'about:blank'; } catch (e) { } W.frame.remove(); W.frame = null; } W.body.innerHTML = ''; if (W.mode === 'full') { W.mode = this.mobile && W.A.game ? 'full' : this.mobile ? 'max' : 'normal'; if (document.fullscreenElement) try { document.exitFullscreen(); } catch (e) { } } this.sync(); },
  setMode(id, m) { const W = this.wins[id]; if (!W) return; if (this.mobile && m === 'normal') m = 'max'; if (this.mobile && W.A.game) m = 'full'; W.mode = m; W.min = W.closed = false; W.z = ++this.z; this.sync(); this.save(); },
  blurApp(W) { if (W && W.frame) try { W.frame.contentWindow.postMessage({ site: 1, t: 'blur' }, '*'); } catch (e) { } },
  clampWin(W) { const SW = innerWidth, SH = innerHeight - this.TB; W.w = clamp(W.w, 320, SW); W.h = clamp(W.h, 200, SH - this.TITLE); W.x = clamp(W.x, -W.w + 120, SW - 120); W.y = clamp(W.y, 0, SH - this.TITLE); },
  sync() {
    if (!$('dkWins')) return;
    const SW = innerWidth, SH = innerHeight, top = this.top(); let full = false;
    for (const id in this.wins) {
      const W = this.wins[id], el = W.el; this.clampWin(W); const hide = W.min || W.closed;
      let r; if (W.mode === 'full') r = { x: 0, y: -this.TITLE, w: SW, h: SH + this.TITLE }; else if (W.mode === 'max') r = { x: 0, y: 0, w: SW, h: SH - this.TB }; else r = { x: W.x, y: W.y, w: W.w, h: W.h + this.TITLE };
      if (W.mode === 'full' && !hide) full = true;
      el.style.display = hide ? 'none' : 'block'; Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', zIndex: W.mode === 'full' ? 99990 : W.z * 2 });
      el.classList.toggle('max', W.mode !== 'normal'); el.classList.toggle('full', W.mode === 'full'); el.classList.toggle('act', W === top);
      el.querySelector('.bMax').textContent = W.mode === 'max' ? '❐' : '▢';
      W.task.classList.toggle('on', !hide && W === top); W.task.style.display = W.closed ? 'none' : '';
    }
    document.body.classList.toggle('deskfull', full);
    const fs = !!document.fullscreenElement; $('dkExit').textContent = fs ? '⛶ 전체화면 나가기' : '⛶ 전체화면'; $('dkExit').title = fs ? '브라우저 전체화면 나가기' : '브라우저 전체화면';
  },
  drag(W, e, kind) {
    if (e.button !== 0 || this.mobile) return; e.preventDefault(); this.focus(W.id);
    if (kind === 'move' && W.mode === 'max') { const fx = e.clientX / innerWidth; W.mode = 'normal'; this.clampWin(W); W.x = Math.round(e.clientX - W.w * fx); W.y = 0; this.sync(); }
    if (W.mode !== 'normal') return; const x0 = e.clientX, y0 = e.clientY, r0 = { x: W.x, y: W.y, w: W.w, h: W.h }; document.body.classList.add('dkdrag');
    const mv = ev => { const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (kind === 'move') { W.x = r0.x + dx; W.y = r0.y + dy; }
      else { if (kind.includes('e')) W.w = r0.w + dx; if (kind.includes('s')) W.h = r0.h + dy; if (kind.includes('w')) { W.w = Math.max(320, r0.w - dx); W.x = r0.x + r0.w - W.w; } if (kind.includes('n')) { W.h = Math.max(200, r0.h - dy); W.y = r0.y + r0.h - W.h; } }
      this.sync(); };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); document.body.classList.remove('dkdrag'); this.sync(); this.save(); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  },
  // ---------- game windows: consent screen -> iframe ----------
  gameStart(W) {
    if (W.A.offline) { this.loadGame(W, false); return; } // the dev tool is offline practice only: no P2P question
    const s = SITE.getP2P();
    if (s && s.remember) { this.loadGame(W, s.allow !== false); return; }
    W.body.innerHTML = '<div class="p2pask"><div class="p2pin">'
      + (W.A.img ? '<img class="p2plogo" src="' + W.A.img + '">' : '<div class="p2pico">' + W.A.icon + '</div>')
      + '<div class="p2pq">P2P를 이용한 멀티플레이어 기능을 허용하시겠습니까?</div>'
      + '<div class="p2pd">허용하면 같은 방에 들어온 다른 플레이어의 브라우저와 직접 연결해서 함께 플레이해요 (PeerJS · WebRTC).<br>상대방에게 내 IP 주소가 보일 수 있어요. 허용하지 않으면 혼자(연습 · 봇)만 플레이할 수 있어요.</div>'
      + '<div class="p2pb"><button class="p2pyes">허용</button><button class="p2pno">허용 안함</button></div>'
      + '<label class="p2pr"><input type="checkbox"> 다시 물어보지 않음</label>'
      + '<div class="p2pn">나중에 게임 설정에서 다시 바꿀 수 있어요.</div></div></div>';
    const go = allow => { const rem = W.body.querySelector('.p2pr input').checked; SITE.setP2P(allow, rem); this.loadGame(W, allow); };
    W.body.querySelector('.p2pyes').onclick = () => go(true); W.body.querySelector('.p2pno').onclick = () => go(false);
  },
  loadGame(W, allow) {
    W.body.innerHTML = '<div class="dkload">불러오는 중…</div>';
    const f = document.createElement('iframe'); f.className = 'dkFrame'; f.setAttribute('allow', 'fullscreen; autoplay; keyboard-map; gamepad');
    // the window gets a copy of this very page (already in memory) with the app flag injected: no second request, so it also
    // works when the file is opened from disk or inside a preview where ?app=... can't be loaded (Chrome's broken-page icon)
    const app = W.A.app || W.id, dev = W.A.dev ? 1 : 0;
    const flag = '<script>window.SITE_APP=' + JSON.stringify(app) + ';window.SITE_P2PQ=' + (allow ? 1 : 0) + ';' + (dev ? 'window.APVP_DEV=1;' : '') + '<\/script>';
    if (SELF_HTML && SELF_HTML.length > 1000) f.srcdoc = SELF_HTML.replace(/<head([^>]*)>/i, m => m + flag); else f.src = new URL('index.html', document.baseURI).pathname + '?app=' + app + (dev ? '&dev=1' : '') + '&p2p=' + (allow ? 1 : 0) + (SITE.VER ? '&v=' + encodeURIComponent(SITE.VER) : '');
    f.onload = () => { const l = W.body.querySelector('.dkload'); if (l) l.remove(); };
    W.body.appendChild(f); W.frame = f; setTimeout(() => { try { f.focus(); } catch (e) { } }, 300);
  },
  // plain page apps (`frame`: a page of this site, e.g. lyrics/) in an iframe
  loadFrame(W) { const f = document.createElement('iframe'); f.className = 'dkFrame'; f.setAttribute('allow', 'fullscreen; autoplay; clipboard-write'); f.src = new URL(W.A.frame, document.baseURI).href; W.body.appendChild(f); W.frame = f; },
  // ---------- start menu ----------
  startMenu(show) {
    const m = $('dkStartMenu'); if (show === false) { m.classList.add('hide'); return; } if (show === undefined && !m.classList.contains('hide')) { m.classList.add('hide'); return; }
    const fs = !!document.fullscreenElement;
    m.innerHTML = '<div class="smh">앱</div>' + this.APPS.filter(a => !a.hidden && !a.folder).map(a => '<div data-a="open" data-app="' + a.id + '">' + (a.img ? '<img src="' + a.img + '">' : a.icon) + ' ' + a.title + '</div>').join('')
      + '<div class="smh">화면</div><div data-a="fs">' + (fs ? '↩ 브라우저 전체화면 나가기' : '⛶ 브라우저 전체화면') + '</div>';
    m.onclick = e => { const t = e.target.closest('[data-a]'); if (!t) return; e.stopPropagation(); if (t.dataset.a === 'open') { this.open(t.dataset.app); const A = this.APPS.find(a => a.id === t.dataset.app); if (this.mobile && A && A.game) { this.setMode(A.id, 'full'); this.goFs(false); } } if (t.dataset.a === 'fs') { this.toggleFs(); this.startMenu(false); } };
    m.classList.remove('hide');
  },
  toggleFs() { if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { } return; } this.goFs(false); },
  setWall(d) { this.wall = d || null; const w = $('dkWall'); if (w) w.style.backgroundImage = 'url(' + (this.wall || WALLPAPER) + ')'; },
};
// ---------- apps ----------
// 게임 폴더 (안드로이드식): in: 'games' 앱들은 바탕화면 대신 이 폴더 안에 보인다 (시작 메뉴에는 그대로)
DESK.addApp({ id: 'games', folder: true, icon: '📁', label: '게임', title: '게임' });
DESK.addApp({ id: 'apvp', in: 'games', icon: '⚔️', label: '4중인격<br>PvP', title: '4중인격 PvP', game: true, w: 1280, h: 800, bg: 'linear-gradient(#5b8a3a,#3c6a24)' });
DESK.addApp({ id: 'rbs', in: 'games', icon: '🧱', img: (typeof RB_ICON !== 'undefined' ? RB_ICON : ''), label: '랜덤블록<br>서바이벌 <b class="dkbeta">베타</b>', title: '랜덤블록 서바이벌 · 베타', game: true, w: 1280, h: 800, bg: 'linear-gradient(#3a7bd5,#22427a)' });
// 개발 도구: the 4중인격 game with APVP_DEV, offline only. No icon; opened from the game's '개발 도구 창 열기' or 사이트주소/ability_pvp_dev
DESK.addApp({ id: 'apvp_dev', app: 'apvp', dev: true, offline: true, hidden: true, icon: '🛠', title: '4중인격 개발 도구', game: true, w: 1280, h: 800 });
// 내 정보: a link app — opens pancat-silly.carrd.co in a new browser tab (Carrd can't be shown inside a window: X-Frame-Options: deny)
DESK.addApp({ id: 'me', icon: '🥞', label: '내 정보', title: '내 정보', url: 'https://pancat-silly.carrd.co/', bg: 'linear-gradient(#ffb347,#f0801c)' });
// 가사 맞추기 (베타): 노래 가사를 문장·단어·글자 단위로 TAP해서 시간을 찍는 도구 (lyrics/index.html, 게임과 따로인 한 파일) -> 확장 LRC
DESK.addApp({ id: 'lyrics', icon: '🎵', label: '가사 맞추기 <b class="dkbeta">베타</b>', title: '가사 맞추기 · 베타', frame: 'lyrics/index.html', w: 900, h: 760, bg: 'linear-gradient(#b05cff,#5a2a9a)' });
DESK.addApp({ id: 'github', icon: '🐙', img: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTggMEMzLjU4IDAgMCAzLjU4IDAgOGMwIDMuNTQgMi4yOSA2LjUzIDUuNDcgNy41OS40LjA3LjU1LS4xNy41NS0uMzggMC0uMTktLjAxLS44Mi0uMDEtMS40OS0yLjAxLjM3LTIuNTMtLjQ5LTIuNjktLjk0LS4wOS0uMjMtLjQ4LS45NC0uODItMS4xMy0uMjgtLjE1LS42OC0uNTItLjAxLS41My42My0uMDEgMS4wOC41OCAxLjIzLjgyLjcyIDEuMjEgMS44Ny44NyAyLjMzLjY2LjA3LS41Mi4yOC0uODcuNTEtMS4wNy0xLjc4LS4yLTMuNjQtLjg5LTMuNjQtMy45NSAwLS44Ny4zMS0xLjU5LjgyLTIuMTUtLjA4LS4yLS4zNi0xLjAyLjA4LTIuMTIgMCAwIC42Ny0uMjEgMi4yLjgyLjY0LS4xOCAxLjMyLS4yNyAyLS4yNy42OCAwIDEuMzYuMDkgMiAuMjcgMS41My0xLjA0IDIuMi0uODIgMi4yLS44Mi40NCAxLjEuMTYgMS45Mi4wOCAyLjEyLjUxLjU2LjgyIDEuMjcuODIgMi4xNSAwIDMuMDctMS44NyAzLjc1LTMuNjUgMy45NS4yOS4yNS41NC43My41NCAxLjQ4IDAgMS4wNy0uMDEgMS45My0uMDEgMi4yIDAgLjIxLjE1LjQ2LjU1LjM4QTguMDEzIDguMDEzIDAgMDAxNiA4YzAtNC40Mi0zLjU4LTgtOC04eiIvPjwvc3ZnPg==', label: 'GitHub', title: 'GitHub', url: 'https://github.com/Pancat-Silly/Pancat-Silly.github.io', bg: 'linear-gradient(#3b4250,#161b22)' }); // link app: this site's repository in a new tab
DESK.addApp({ id: 'settings', icon: '⚙️', label: '설정', title: '설정', w: 460, h: 520, bg: 'linear-gradient(#6a7480,#3f4650)',
  build(body) { body.classList.add('dkApp'); this.onOpen(body); },
  onOpen(body) {
    const p = SITE.getP2P();
    body.innerHTML = '<h3>🌐 P2P 멀티플레이</h3>'
      + '<label><input type="checkbox" id="setP2P"' + (!p || p.allow !== false ? ' checked' : '') + '> P2P 멀티플레이 허용 <small>게임 창을 새로 열 때부터 적용돼요. 열려 있는 게임은 게임 안 설정에서 바꿔요</small></label>'
      + '<label><input type="checkbox" id="setAsk"' + (!p || !p.remember ? ' checked' : '') + '> 게임을 열 때마다 허용할지 물어보기</label>'
      + '<h3>🖥️ 화면</h3>'
      + '<label><input type="checkbox" id="setFs"' + (SITE.autoFs() ? ' checked' : '') + '> 자동 전체화면 <small>바탕화면이나 게임 화면을 클릭하면 브라우저를 전체화면으로 바꿔요 (게임 창 크기는 그대로 · PC)</small></label>'
      + '<h3>🖼️ 바탕화면 그림</h3><div class="row"><label class="dkbtn">사진 고르기<input type="file" id="setWallF" accept="image/*" style="display:none"></label><button class="dkbtn" id="setWallR">기본 그림으로</button></div>'
      + '<h3>🪟 창 위치</h3><div class="row"><button class="dkbtn" id="setWinR">모든 창 위치 · 크기 초기화</button></div>'
      + '<p class="dkhint">게임 아이콘을 ' + (DESK.mobile ? '탭' : '더블클릭') + '하면 창으로 열려요. 게임 창 제목줄의 ⛶ 로 꽉 찬 화면을 쓸 수 있어요.</p>';
    body.querySelector('#setP2P').onchange = e => SITE.setP2P(e.target.checked);
    body.querySelector('#setFs').onchange = e => { SITE.setAutoFs(e.target.checked); if (!e.target.checked && document.fullscreenElement) try { document.exitFullscreen(); } catch (x) { } };
    body.querySelector('#setAsk').onchange = e => SITE.setP2P((SITE.getP2P() || {}).allow !== false, !e.target.checked);
    body.querySelector('#setWallF').onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 1600 / img.width); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); DESK.setWall(c.toDataURL('image/jpeg', .6)); DESK.save(); }; img.src = URL.createObjectURL(f); };
    body.querySelector('#setWallR').onclick = () => { DESK.setWall(null); DESK.save(); };
    body.querySelector('#setWinR').onclick = () => { DESK.saved = {}; for (const id in DESK.wins) { const W = DESK.wins[id]; Object.assign(W, DESK.defRect(W.A), { mode: DESK.mobile ? 'max' : 'normal' }); } DESK.sync(); DESK.save(); };
  } });
