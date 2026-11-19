// ===================== mobile touch controls: 기존 / 마크 PE + user button layout editor =====================
// Layout = { key: { x, y, s } }, x/y = button centre as a fraction of the game area, s = size scale. Keys missing = hidden.
// 기존: attack/use buttons, tap = attack (finger target, else crosshair).
// PE (Bedrock): tap ON the enemy = attack (no crosshair needed), tap on nothing = swing.
// Both: move with the floating joystick (left-bottom drag) or the D-pad buttons; sneak as toggle or hold.
// D-pad (centre = sneak, ↖ ↗ appear while forward is held, double-tap ▲ = sprint), jump button,
//      drag anywhere = camera, tap = attack, press and hold = use item (bow / shield / food), release = stop.
const TCTL = {
  KEYS: {
    dpad: { name: 'PE 방향키' }, atk: { ic: '⚔️', name: '공격' }, use: { ic: '✋', name: '사용/방어' }, jump: { ic: '⤒', name: '점프' },
    sneak: { ic: '⇩', name: '웅크리기' }, sprint: { ic: '»', name: '달리기' }, more: { ic: '⋯', name: '메뉴', sm: 1 }, chat: { ic: '💬', name: '채팅', sm: 1 },
    tab: { ic: '📋', name: '점수판', sm: 1 }, view: { ic: '👁', name: '시점', sm: 1 }, swap: { ic: '⇄', name: '보조손', sm: 1 }, land: { ic: '⛶', name: '가로 전체화면', sm: 1 },
    slotL: { ic: '◀', name: '이전 칸', sm: 1 }, slotR: { ic: '▶', name: '다음 칸', sm: 1 },
  },
  DEF: {
    classic: { atk: { x: .92, y: .6, s: 1.2 }, use: { x: .8, y: .64, s: 1 }, jump: { x: .92, y: .84, s: 1 }, sneak: { x: .8, y: .87, s: 1 }, more: { x: .9, y: .17, s: 1 } },
    pe: { dpad: { x: .13, y: .7, s: 1 }, jump: { x: .9, y: .8, s: 1.15 }, more: { x: .9, y: .17, s: 1 } },
  },
  scheme: 'classic', lay: null, els: {}, editing: false, sel: null, sneakHold: false, // sneakHold: 웅크리기 = 누르는 동안만 (false = 토글)
  load() {
    try { this.scheme = localStorage.getItem('apvp_ctl') === 'pe' ? 'pe' : 'classic'; this.sneakHold = localStorage.getItem('apvp_sneakhold') === '1'; } catch (e) { }
    let L = null; try { L = JSON.parse(localStorage.getItem('apvp_tlay_' + this.scheme) || 'null'); } catch (e) { }
    this.lay = L && typeof L === 'object' ? L : JSON.parse(JSON.stringify(this.DEF[this.scheme]));
  },
  save() { try { localStorage.setItem('apvp_ctl', this.scheme); localStorage.setItem('apvp_tlay_' + this.scheme, JSON.stringify(this.lay)); } catch (e) { } },
  setScheme(s) { this.save(); this.scheme = s === 'pe' ? 'pe' : 'classic'; try { localStorage.setItem('apvp_ctl', this.scheme); } catch (e) { } this.load(); this.build(); this.syncPause(); },
  moveStyle() { return this.lay.dpad ? 'dpad' : 'joy'; },
  setMove(v) { if (v === 'dpad' && !this.lay.dpad) this.lay.dpad = { x: .13, y: .7, s: 1 }; if (v === 'joy') delete this.lay.dpad; this.save(); this.build(); },
  setSneakHold(v) { this.sneakHold = !!v; UI.sneakToggle = false; UI.touch.sneak = false; try { localStorage.setItem('apvp_sneakhold', v ? '1' : '0'); } catch (e) { } this.lockSync(); },
  syncPause() { const a = $('pMove'), b = $('pSneakM'), c = $('pCtl'); if (a) a.value = this.moveStyle(); if (b) b.value = this.sneakHold ? 'hold' : 'toggle'; if (c) c.value = this.scheme; },
  area() { return UI.rot ? { w: innerHeight, h: innerWidth } : { w: innerWidth, h: innerHeight }; },
  // ---------- DOM ----------
  build() {
    const tz = $('touch'); for (const k in this.els) this.els[k].remove(); this.els = {};
    for (const k in this.lay) { if (!this.KEYS[k]) continue; const el = k === 'dpad' ? this.mkDpad() : this.mkBtn(k); el.dataset.k = k; tz.appendChild(el); this.els[k] = el; this.bind(k, el); }
    this.place(); UI.closeMenu && UI.closeMenu();
  },
  mkBtn(k) { const K = this.KEYS[k], el = document.createElement('div'); el.className = 'tb tdyn' + (K.sm ? ' tsm' : ''); el.innerHTML = K.ic + (K.sm ? '' : '<small>' + K.name + '</small>'); return el; },
  mkDpad() {
    const el = document.createElement('div'); el.className = 'dpad tdyn';
    for (const [c, r, k, t] of [[0, 0, 'ul', '◤'], [1, 0, 'up', '▲'], [2, 0, 'ur', '◥'], [0, 1, 'left', '◀'], [1, 1, 'mid', '⇩'], [2, 1, 'right', '▶'], [1, 2, 'down', '▼']]) { const d = document.createElement('div'); d.className = 'dc dc-' + k; d.style.left = c * 56 + 'px'; d.style.top = r * 56 + 'px'; d.textContent = t; el.appendChild(d); }
    return el;
  },
  place() { for (const k in this.els) { const L = this.lay[k], el = this.els[k]; el.style.left = (L.x * 100) + '%'; el.style.top = (L.y * 100) + '%'; el.style.transform = 'translate(-50%,-50%) scale(' + L.s + ')'; el.classList.toggle('esel', this.editing && this.sel === k); } document.body.classList.toggle('tedit', this.editing); },
  // ---------- actions ----------
  bind(k, el) {
    const T = UI.touch, down = {
      atk: () => { T.attackHold = true; G.me && G.me.attack(UI.atkOpt()); }, use: () => { T.use = true; G.me && G.me.usePress(); }, jump: () => { T.jump = true; },
      sneak: () => { if (this.sneakHold) T.sneak = true; else { UI.sneakToggle = !UI.sneakToggle; this.lockSync(); } }, sprint: () => { UI.sprintLock = !UI.sprintLock; this.lockSync(); },
      more: () => { const m = $('tMenu'); if (m.classList.contains('hide')) { m.classList.remove('hide'); el.classList.add('on'); clearTimeout(this.menuT); this.menuT = setTimeout(() => UI.closeMenu(), 5000); } else UI.closeMenu(); },
      chat: () => setTimeout(() => UI.openChat(), 50), tab: () => { UI.tabOpen = !UI.tabOpen; $('tab').classList.toggle('hide', !UI.tabOpen); }, view: () => { R.third = (R.third + 1) % 3; },
      swap: () => { const me = G.me; if (me) { const t = me.off; me.off = me.inv[me.sel]; me.inv[me.sel] = t; } }, land: () => UI.toggleLand(),
      slotL: () => { const me = G.me; if (me) me.sel = (me.sel + 8) % 9; }, slotR: () => { const me = G.me; if (me) me.sel = (me.sel + 1) % 9; },
    }[k], up = { atk: () => { T.attackHold = false; }, use: () => { T.use = false; }, jump: () => { T.jump = false; }, sneak: () => { if (this.sneakHold) T.sneak = false; } }[k];
    if (k === 'dpad') return this.bindDpad(el);
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); if (this.editing) return this.dragStart(k, e); AU.init();
      el.classList.add('on'); down && down(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
    });
    const u = () => { if (this.editing) return; if (k !== 'more') el.classList.remove('on'); up && up(); }; el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
  },
  lockSync() { if (this.els.sneak) this.els.sneak.classList.toggle('lock', UI.sneakToggle); if (this.els.sprint) this.els.sprint.classList.toggle('lock', !!UI.sprintLock); const m = this.els.dpad && this.els.dpad.querySelector('.dc-mid'); if (m) m.classList.toggle('lock', UI.sneakToggle); },
  bindDpad(el) {
    const T = UI.touch; let pid = null, cur = null, lastUp = 0;
    const cellAt = (e) => { const L = this.lay.dpad, a = this.area(), q = UI.pt(e); const c = 56 * L.s, dx = q.x - L.x * a.w, dy = q.y - L.y * a.h; if (Math.abs(dx) > c * 1.9 || Math.abs(dy) > c * 1.9) return null; const col = dx < -c / 2 ? 0 : dx > c / 2 ? 2 : 1, row = dy < -c / 2 ? 0 : dy > c / 2 ? 2 : 1; return [['ul', 'up', 'ur'], ['left', 'mid', 'right'], [null, 'down', null]][row][col]; };
    const set = (k, first) => {
      T.sneak = this.sneakHold && k === 'mid';
      if (k === 'mid') { if (first && !this.sneakHold) { UI.sneakToggle = !UI.sneakToggle; this.lockSync(); } for (const d of el.children) d.classList.toggle('on', d.classList.contains('dc-mid') && this.sneakHold); T.f = T.s = 0; cur = 'mid'; el.classList.remove('fwd'); return; }
      if ((k === 'ul' || k === 'ur') && cur !== 'up' && cur !== 'ul' && cur !== 'ur' && first) k = null; // diagonals only while going forward
      if (k === 'up' && first) { if (performance.now() - lastUp < 300) T.sprint = true; lastUp = performance.now(); }
      cur = k; const f = { up: 1, ul: 1, ur: 1, down: -1 }[k] || 0, s = { left: -1, ul: -1, right: 1, ur: 1 }[k] || 0;
      T.f = f; T.s = s; if (f <= 0) T.sprint = false;
      el.classList.toggle('fwd', f > 0); for (const d of el.children) d.classList.toggle('on', d.classList.contains('dc-' + k));
    };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (this.editing) return this.dragStart('dpad', e); AU.init(); if (pid !== null) return; pid = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (x) { } set(cellAt(e), true); });
    el.addEventListener('pointermove', e => { if (e.pointerId !== pid || this.editing) return; const k = cellAt(e); if (k !== cur) set(k === 'mid' && !this.sneakHold ? null : k, false); });
    const end = e => { if (e.pointerId !== pid) return; pid = null; set(null, false); T.sprint = false; T.sneak = false; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    this.resetDpad = () => { pid = null; cur = null; };
  },
  // ---------- screen area: camera / tap = attack / PE hold = use / classic joystick ----------
  bindZone() {
    const tz = $('touch'), joy = $('joy'), knob = $('knob'), T = UI.touch; let jId = null, jx = 0, jy = 0, jt = 0, jm = 0, lookId = null, lx = 0, ly = 0, lt = 0, lmove = 0, holdT = 0, holding = false;
    tz.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || this.editing) return; AU.init(); const q = UI.pt(e), a = this.area();
      if (!this.lay.dpad && q.x < a.w * .42 && q.y > a.h * .35 && jId === null) { jId = e.pointerId; jx = q.x; jy = q.y; jt = performance.now(); jm = 0; joy.style.display = 'block'; joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else if (lookId === null) {
        lookId = e.pointerId; lx = q.x; ly = q.y; lt = performance.now(); lmove = 0; holding = false; clearTimeout(holdT);
        if (this.scheme === 'pe') holdT = setTimeout(() => { if (lookId !== null && lmove < 14 && G.me) { holding = true; T.use = true; G.me.usePress(); UI.tapMark(lx, ly); } }, 300);
      }
    });
    tz.addEventListener('pointermove', e => {
      const q = UI.pt(e);
      if (e.pointerId === jId) { let dx = q.x - jx, dy = q.y - jy; jm = Math.max(jm, Math.hypot(dx, dy)); const R0 = 55, l = Math.hypot(dx, dy); if (l > R0) { dx *= R0 / l; dy *= R0 / l; } knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; T.f = -dy / R0; T.s = dx / R0; T.sprint = l > R0 * 1.15 && -dy > R0 * .7; }
      if (e.pointerId === lookId) { const dx = q.x - lx, dy = q.y - ly; lx = q.x; ly = q.y; lmove += Math.abs(dx) + Math.abs(dy); UI.look(dx, dy, .0055); }
    });
    UI.resetTouch = () => { jId = null; lookId = null; holding = false; clearTimeout(holdT); this.resetDpad && this.resetDpad(); };
    const end = e => {
      if (e.pointerId === jId) { if (performance.now() - jt < 200 && jm < 12 && G.me) UI.tapAttack(jx, jy); jId = null; joy.style.display = 'none'; T.f = T.s = 0; T.sprint = false; }
      if (e.pointerId === lookId) { lookId = null; clearTimeout(holdT); if (holding) { holding = false; T.use = false; } else if (performance.now() - lt < 250 && lmove < 14 && G.me) UI.tapAttack(lx, ly); }
    };
    tz.addEventListener('pointerup', end); tz.addEventListener('pointercancel', end);
  },
  // ---------- editor ----------
  openEditor() {
    if (!UI.mobile) return; this.editing = true; this.sel = null; UI.paused = true; $('pause').classList.add('hide'); $('tEdit').classList.remove('hide'); UI.closeMenu && UI.closeMenu();
    for (const k in this.KEYS) if (!this.lay[k]) { /* listed in the add menu */ }
    this.editBar(); this.place();
  },
  editBar() {
    const add = $('teAdd'); add.innerHTML = '<option value="">＋ 버튼 추가…</option>' + Object.keys(this.KEYS).filter(k => !this.lay[k]).map(k => '<option value="' + k + '">' + (this.KEYS[k].ic || '✚') + ' ' + this.KEYS[k].name + '</option>').join('');
    $('teSel').textContent = this.sel ? (this.KEYS[this.sel].ic || '✚') + ' ' + this.KEYS[this.sel].name + ' · 크기 ' + Math.round(this.lay[this.sel].s * 100) + '%' : '버튼을 끌어서 옮기고, 눌러서 고르세요';
    $('teScheme').value = this.scheme;
  },
  dragStart(k, e) {
    this.sel = k; this.editBar(); this.place(); const el = this.els[k]; const L = this.lay[k], a = this.area(); const q0 = UI.pt(e), x0 = L.x, y0 = L.y;
    try { el.setPointerCapture(e.pointerId); } catch (x) { }
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; const q = UI.pt(ev); L.x = clamp(x0 + (q.x - q0.x) / a.w, .03, .97); L.y = clamp(y0 + (q.y - q0.y) / a.h, .05, .95); this.place(); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  },
  size(d) { if (!this.sel) return; const L = this.lay[this.sel]; L.s = clamp(Math.round((L.s + d) * 10) / 10, .5, 2.5); this.place(); this.editBar(); },
  remove() { if (!this.sel) return; delete this.lay[this.sel]; this.sel = null; this.build(); this.editBar(); },
  addKey(k) { if (!k || this.lay[k]) return; this.lay[k] = { x: .5, y: .45, s: k === 'dpad' ? 1 : (this.KEYS[k].sm ? 1 : 1) }; this.sel = k; this.build(); this.editBar(); },
  reset() { this.lay = JSON.parse(JSON.stringify(this.DEF[this.scheme])); this.sel = null; this.build(); this.editBar(); },
  closeEditor() { this.editing = false; this.sel = null; this.save(); this.syncPause(); $('tEdit').classList.add('hide'); this.place(); UI.paused = false; UI.resetInput(); },
  init() {
    this.load(); this.build(); this.bindZone();
    $('teMinus').onclick = () => this.size(-.1); $('tePlus').onclick = () => this.size(.1); $('teDel').onclick = () => this.remove(); $('teReset').onclick = () => { if (confirm('이 조작 방식의 버튼 배치를 처음 상태로 되돌릴까요?')) this.reset(); };
    $('teDone').onclick = () => this.closeEditor(); $('teAdd').onchange = e => { this.addKey(e.target.value); e.target.value = ''; };
    $('teScheme').onchange = e => { this.setScheme(e.target.value); $('pCtl').value = this.scheme; this.sel = null; this.editBar(); };
    $('pCtl').value = this.scheme; $('pCtl').onchange = e => { this.setScheme(e.target.value); UI.chat('§e모바일 조작: ' + (this.scheme === 'pe' ? '마크 PE (방향키 · 길게 눌러 사용)' : '기존 (조이스틱 · 버튼)')); };
    $('pEdit').onclick = () => this.openEditor();
    $('pMove').onchange = e => { this.setMove(e.target.value); UI.chat('§e이동: ' + (e.target.value === 'dpad' ? '방향키 버튼' : '조이스틱 (왼쪽 아래를 끌기)')); };
    $('pSneakM').onchange = e => { this.setSneakHold(e.target.value === 'hold'); UI.chat('§e웅크리기: ' + (this.sneakHold ? '누르는 동안만' : '한 번 누르면 켜짐/꺼짐')); };
    this.syncPause();
    addEventListener('resize', () => this.place());
  },
};
