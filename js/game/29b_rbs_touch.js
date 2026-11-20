// ===================== Random Block Survival: mobile touch controls (modelled on 4중인격's TCTL, 11b_touch.js) =====================
// Two schemes like 4중인격: 기존 (floating joystick + buttons, crosshair: tap = hit what's in the crosshair, else use / place,
// press and hold = mine it) and 마크 PE (D-pad, no crosshair: tap / press and hold act on whatever is under the finger).
// Drag anywhere = camera. Every button can be moved, resized,
// removed and added again in the layout editor — the same button more than once too ('key#2', 'key#3' …).
// Layout = { key: { x, y, s } } (centre as a fraction of the screen, size scale), saved per scheme in rbs_tlay2_<scheme>
// (4중인격 keeps its own layouts in apvp_tlay_<scheme>: every game has its own button layout).
const RTCTL = {
  KEYS: {
    dpad: { name: 'PE 방향키' }, atk: { ic: '⚔️', name: '공격/캐기' }, use: { ic: '✋', name: '사용/놓기' }, jump: { ic: '⤒', name: '점프' },
    sneak: { ic: '⇩', name: '웅크리기' }, sprint: { ic: '»', name: '달리기' }, inv: { ic: '🎒', name: '인벤토리', sm: 1 }, drop: { ic: '⇣', name: '버리기', sm: 1 },
    pause: { ic: '☰', name: '메뉴', sm: 1 }, chat: { ic: '💬', name: '채팅', sm: 1 }, tab: { ic: '👥', name: '플레이어 목록', sm: 1 }, view: { ic: '👁', name: '시점', sm: 1 },
    swap: { ic: '⇄', name: '왼손 교체', sm: 1 }, land: { ic: '⛶', name: '가로 전체화면', sm: 1 }, slotL: { ic: '◀', name: '이전 칸', sm: 1 }, slotR: { ic: '▶', name: '다음 칸', sm: 1 },
  },
  DEF: {
    classic: { atk: { x: .94, y: .42, s: 1 }, use: { x: .852, y: .47, s: 1 }, jump: { x: .932, y: .63, s: 1.2 }, sneak: { x: .847, y: .68, s: 1 }, inv: { x: .768, y: .936, s: 1 }, drop: { x: .229, y: .936, s: 1 },
      pause: { x: .968, y: .156, s: 1 }, chat: { x: .911, y: .156, s: 1 }, view: { x: .854, y: .156, s: 1 }, tab: { x: .797, y: .156, s: 1 }, land: { x: .74, y: .156, s: 1 } },
    pe: { dpad: { x: .14, y: .68, s: 1 }, jump: { x: .932, y: .63, s: 1.2 }, inv: { x: .768, y: .936, s: 1 }, drop: { x: .229, y: .936, s: 1 },
      pause: { x: .968, y: .156, s: 1 }, chat: { x: .911, y: .156, s: 1 }, view: { x: .854, y: .156, s: 1 }, tab: { x: .797, y: .156, s: 1 }, land: { x: .74, y: .156, s: 1 } },
  },
  scheme: 'classic', lay: null, els: {}, editing: false, sel: null, sneakHold: false, sneakOn: false, sprintOn: false,
  base(k) { return String(k).split('#')[0]; },
  copies(b) { return Object.keys(this.els).filter(k => this.base(k) === b).map(k => this.els[k]); },
  load() {
    try { this.scheme = localStorage.getItem('rbs_ctl') === 'pe' ? 'pe' : 'classic'; this.sneakHold = localStorage.getItem('rbs_sneakhold') === '1'; } catch (e) { }
    let L = null; try { L = JSON.parse(localStorage.getItem('rbs_tlay2_' + this.scheme) || 'null'); } catch (e) { }
    this.lay = L && typeof L === 'object' ? L : JSON.parse(JSON.stringify(this.DEF[this.scheme]));
  },
  save() { try { localStorage.setItem('rbs_ctl', this.scheme); localStorage.setItem('rbs_tlay2_' + this.scheme, JSON.stringify(this.lay)); } catch (e) { } },
  setScheme(s) { this.save(); this.scheme = s === 'pe' ? 'pe' : 'classic'; try { localStorage.setItem('rbs_ctl', this.scheme); } catch (e) { } this.load(); this.build(); document.body.classList.toggle('rbpe', this.scheme === 'pe'); },
  moveStyle() { return this.lay.dpad ? 'dpad' : 'joy'; },
  setMove(v) { if (v === 'dpad' && !this.lay.dpad) this.lay.dpad = { x: .14, y: .68, s: 1 }; if (v === 'joy') delete this.lay.dpad; this.save(); this.build(); },
  setSneakHold(v) { this.sneakHold = !!v; this.sneakOn = false; RIN.touch.sneak = false; try { localStorage.setItem('rbs_sneakhold', v ? '1' : '0'); } catch (e) { } this.lockSync(); },
  pt(e) { return { x: e.clientX, y: e.clientY }; },
  area() { return { w: innerWidth, h: innerHeight }; },
  // ---------- DOM ----------
  build() {
    const tz = $('rbTouch'); for (const k in this.els) this.els[k].remove(); this.els = {};
    for (const k in this.lay) { if (!this.KEYS[this.base(k)]) continue; const el = k === 'dpad' ? this.mkDpad() : this.mkBtn(this.base(k)); el.dataset.k = k; tz.appendChild(el); this.els[k] = el; this.bind(k, el); }
    this.place(); this.lockSync();
  },
  mkBtn(k) { const K = this.KEYS[k], el = document.createElement('div'); el.className = 'rtb rtdyn' + (K.sm ? ' rtsm' : ''); el.innerHTML = K.ic; el.title = K.name; return el; },
  mkDpad() {
    const el = document.createElement('div'); el.className = 'rdpad rtdyn';
    for (const [c, r, k, t] of [[0, 0, 'ul', '◤'], [1, 0, 'up', '▲'], [2, 0, 'ur', '◥'], [0, 1, 'left', '◀'], [1, 1, 'mid', '⇩'], [2, 1, 'right', '▶'], [1, 2, 'down', '▼']]) { const d = document.createElement('div'); d.className = 'rdc rdc-' + k; d.style.left = c * 56 + 'px'; d.style.top = r * 56 + 'px'; d.textContent = t; el.appendChild(d); }
    return el;
  },
  place() { for (const k in this.els) { const L = this.lay[k], el = this.els[k]; el.style.left = (L.x * 100) + '%'; el.style.top = (L.y * 100) + '%'; el.style.transform = 'translate(-50%,-50%) scale(' + L.s + ')'; el.classList.toggle('rtsel', this.editing && this.sel === k); } document.body.classList.toggle('rtedit', this.editing); },
  // ---------- actions ----------
  bind(k, el) {
    const T = RIN.touch, b = this.base(k), me = () => RG.me;
    const down = {
      atk: () => { RIN.atkQ++; T.hold = true; }, use: () => { RIN.useQ++; T.use = true; }, jump: () => { T.jump = true; },
      sneak: () => { if (this.sneakHold) T.sneak = true; else { this.sneakOn = !this.sneakOn; T.sneak = this.sneakOn; this.lockSync(); } }, sprint: () => { this.sprintOn = !this.sprintOn; this.lockSync(); },
      inv: () => { if (!me().spectator) RUI.open('inv'); }, drop: () => RIN.drop(false), pause: () => RUI.pause(true), chat: () => setTimeout(() => RUI.openChat(), 50), tab: () => RUI.tab(true),
      view: () => { if (me().spectator && RUI.follow) RUI.followThird = !RUI.followThird; else RR.third = (RR.third + 1) % 3; }, swap: () => RIN.swapOff(), land: () => RUI.toggleLand(),
      slotL: () => { me().sel = (me().sel + 8) % 9; }, slotR: () => { me().sel = (me().sel + 1) % 9; },
    }[b], up = { atk: () => { T.hold = false; }, use: () => { T.use = false; }, jump: () => { T.jump = false; }, sneak: () => { if (this.sneakHold) T.sneak = false; }, tab: () => RUI.tab(false) }[b];
    if (k === 'dpad') return this.bindDpad(el);
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); if (this.editing) return this.dragStart(k, e); RAU.init();
      el.classList.add('on'); down && down(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
    });
    const u = e => { if (this.editing) return; el.classList.remove('on'); up && up(); }; el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
  },
  lockSync() { for (const e of this.copies('sneak')) e.classList.toggle('lock', this.sneakOn); for (const e of this.copies('sprint')) e.classList.toggle('lock', this.sprintOn); const m = this.els.dpad && this.els.dpad.querySelector('.rdc-mid'); if (m) m.classList.toggle('lock', this.sneakOn); },
  bindDpad(el) {
    const T = RIN.touch; let pid = null, cur = null, lastUp = 0;
    const cellAt = e => { const L = this.lay.dpad, a = this.area(), q = this.pt(e); const c = 56 * L.s, dx = q.x - L.x * a.w, dy = q.y - L.y * a.h; if (Math.abs(dx) > c * 1.9 || Math.abs(dy) > c * 1.9) return null; const col = dx < -c / 2 ? 0 : dx > c / 2 ? 2 : 1, row = dy < -c / 2 ? 0 : dy > c / 2 ? 2 : 1; return [['ul', 'up', 'ur'], ['left', 'mid', 'right'], [null, 'down', null]][row][col]; };
    const set = (k, first) => {
      if (this.sneakHold) T.sneak = k === 'mid';
      if (k === 'mid') { if (first && !this.sneakHold) { this.sneakOn = !this.sneakOn; T.sneak = this.sneakOn; this.lockSync(); } for (const d of el.children) d.classList.toggle('on', d.classList.contains('rdc-mid') && this.sneakHold); T.f = T.s = 0; cur = 'mid'; el.classList.remove('fwd'); return; }
      if ((k === 'ul' || k === 'ur') && cur !== 'up' && cur !== 'ul' && cur !== 'ur' && first) k = null; // diagonals only while going forward
      if (k === 'up' && first) { if (performance.now() - lastUp < 300) T.sprint = true; lastUp = performance.now(); }
      cur = k; const f = { up: 1, ul: 1, ur: 1, down: -1 }[k] || 0, s = { left: -1, ul: -1, right: 1, ur: 1 }[k] || 0;
      T.f = f; T.s = s; if (f <= 0) T.sprint = false;
      el.classList.toggle('fwd', f > 0); for (const d of el.children) d.classList.toggle('on', d.classList.contains('rdc-' + k));
    };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (this.editing) return this.dragStart('dpad', e); RAU.init(); if (pid !== null) return; pid = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (x) { } set(cellAt(e), true); });
    el.addEventListener('pointermove', e => { if (e.pointerId !== pid || this.editing) return; const k = cellAt(e); if (k !== cur) set(k === 'mid' && !this.sneakHold ? null : k, false); });
    const end = e => { if (e.pointerId !== pid) return; pid = null; set(null, false); T.sprint = false; if (this.sneakHold) T.sneak = false; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    this.resetDpad = () => { pid = null; cur = null; };
  },
  // ---------- screen area: camera / tap = hit or use / hold = mine / classic joystick ----------
  bindZone() {
    const tz = $('rbTouch'), joy = $('rbJoy'), knob = $('rbKnob'), T = RIN.touch; let jId = null, jx = 0, jy = 0, lookId = null, lx = 0, ly = 0, lt = 0, lmove = 0, holdT = 0;
    tz.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || this.editing || e.target !== tz) return; RAU.init(); const q = this.pt(e), a = this.area();
      if (!this.lay.dpad && q.x < a.w * .42 && q.y > a.h * .35 && jId === null) { jId = e.pointerId; jx = q.x; jy = q.y; joy.style.display = 'block'; joy.style.left = (jx - 60) + 'px'; joy.style.top = (jy - 60) + 'px'; knob.style.transform = 'translate(0,0)'; }
      else if (lookId === null) { lookId = e.pointerId; lx = q.x; ly = q.y; lt = performance.now(); lmove = 0; clearTimeout(holdT); this.holdPt = null;
        holdT = setTimeout(() => { if (lookId !== null && lmove < 12) { if (this.scheme === 'pe') { this.holdPt = { x: lx, y: ly }; const tg = RIN.pickTarget(RG.me, this.dirAt(lx, ly)); if (tg && tg.ent) RIN.atkQ++; } T.hold = true; } }, 280); }
      try { tz.setPointerCapture(e.pointerId); } catch (x) { }
    });
    tz.addEventListener('pointermove', e => {
      const q = this.pt(e);
      if (e.pointerId === jId) { let dx = q.x - jx, dy = q.y - jy; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; T.s = dx / m; T.f = -dy / m; T.sprint = this.sprintOn || -dy / m > .95; }
      if (e.pointerId === lookId) { const dx = q.x - lx, dy = q.y - ly; lx = q.x; ly = q.y; lmove += Math.abs(dx) + Math.abs(dy); if (this.holdPt) this.holdPt = { x: lx, y: ly }; // PE: while holding, the spot under the finger is mined and the camera still turns (like Bedrock)
        const k = .0045 * RUI.sens, me = RG.me; me.yaw += dx * k; me.pitch = clamp(me.pitch + dy * k, -1.55, 1.55); }
    });
    this.resetZone = () => { jId = null; lookId = null; clearTimeout(holdT); T.hold = false; this.holdPt = this.tapPt = null; joy.style.display = 'none'; this.resetDpad && this.resetDpad(); };
    const end = e => {
      if (e.pointerId === jId) { jId = null; joy.style.display = 'none'; T.f = T.s = 0; T.sprint = false; }
      if (e.pointerId === lookId) { clearTimeout(holdT); const short = performance.now() - lt < 280 && lmove < 12;
        if (short && !T.hold) { const pe = this.scheme === 'pe'; if (pe) this.tapPt = { x: lx, y: ly }; const tg = RG.me.spectator ? null : RIN.pickTarget(RG.me, pe ? this.dirAt(lx, ly) : null); if (tg && tg.ent) RIN.atkQ++; else RIN.useQ++; } // 기존: crosshair · PE: the tapped spot
        T.hold = false; this.holdPt = null; lookId = null; }
    };
    tz.addEventListener('pointerup', end); tz.addEventListener('pointercancel', end);
  },
  // 마크 PE aiming: the ray through the finger (held = mining spot, tapped = one hit / use on the next tick); 기존 = crosshair (null)
  dirAt(x, y) { const c = $('rcv').getBoundingClientRect(); return RR.screenDir((x - c.left) / c.width, (y - c.top) / c.height); },
  aimDir() { if (this.scheme !== 'pe') return null; const p = this.tapPt || this.holdPt; return p ? this.dirAt(p.x, p.y) : null; },
  tapDone() { this.tapPt = null; },
  // Bedrock-style break indicator: a white ring at the finger, a white disc inside it grows with the block's break progress
  // (full disc = broken). mix-blend-mode: difference inverts the picture underneath, like the PE touch circle.
  ringTick() {
    const r = $('rbRing'); if (!r) return; const p = this.holdPt, me = RG.me;
    if (!p || this.editing || RUI.gui || RUI.paused || me.spectator) { if (r.style.display !== 'none') r.style.display = 'none'; return; }
    const k = me.dig ? clamp(me.dig.p, 0, 1) : 0; r.style.display = 'block'; r.style.left = p.x + 'px'; r.style.top = p.y + 'px';
    r.firstChild.style.transform = 'scale(' + (0.12 + k * .88).toFixed(3) + ')'; r.firstChild.style.opacity = me.dig ? 1 : 0;
  },
  // the 달리기 button locks sprint for the D-pad / joystick until pressed again
  tick() { if (this.sprintOn && RIN.touch.f > .5) RIN.touch.sprint = true; },
  // ---------- editor ----------
  openEditor() {
    if (!RUI.mobile) return; RUI.menuTo(() => { }); RUI.paused = true; this.editing = true; this.sel = null; this.resetZone && this.resetZone();
    $('rbTEdit').classList.remove('hide'); this.editBar(); this.place();
  },
  editBar() {
    const add = $('rteAdd'); add.innerHTML = '<option value="">＋ 버튼 추가…</option>' + Object.keys(this.KEYS).filter(k => k !== 'dpad' || !this.lay.dpad).map(k => '<option value="' + k + '">' + (this.KEYS[k].ic || '✚') + ' ' + this.KEYS[k].name + '</option>').join('');
    const SK = this.sel && this.KEYS[this.base(this.sel)];
    $('rteSel').textContent = this.sel ? (SK.ic || '✚') + ' ' + SK.name + ' · 크기 ' + Math.round(this.lay[this.sel].s * 100) + '%' : '버튼을 끌어서 옮기고, 눌러서 고르세요 · 같은 버튼도 여러 개 넣을 수 있어요';
    $('rteScheme').value = this.scheme;
  },
  dragStart(k, e) {
    this.sel = k; this.editBar(); this.place(); const el = this.els[k]; const L = this.lay[k], a = this.area(); const q0 = this.pt(e), x0 = L.x, y0 = L.y;
    try { el.setPointerCapture(e.pointerId); } catch (x) { }
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; const q = this.pt(ev); L.x = clamp(x0 + (q.x - q0.x) / a.w, .03, .97); L.y = clamp(y0 + (q.y - q0.y) / a.h, .05, .95); this.place(); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  },
  size(d) { if (!this.sel) return; const L = this.lay[this.sel]; L.s = clamp(Math.round((L.s + d) * 10) / 10, .5, 2.5); this.place(); this.editBar(); },
  remove() { if (!this.sel) return; delete this.lay[this.sel]; this.sel = null; this.build(); this.editBar(); },
  addKey(k) { if (!k || !this.KEYS[k] || (k === 'dpad' && this.lay.dpad)) return; if (this.lay[k]) { let n = 2; while (this.lay[k + '#' + n]) n++; k = k + '#' + n; } this.lay[k] = { x: .5, y: .45, s: 1 }; this.sel = k; this.build(); this.editBar(); },
  reset() { this.lay = JSON.parse(JSON.stringify(this.DEF[this.scheme])); this.sel = null; this.build(); this.editBar(); },
  closeEditor() { this.editing = false; this.sel = null; this.save(); $('rbTEdit').classList.add('hide'); this.place(); RUI.paused = false; },
  init() {
    const bar = document.createElement('div'); bar.id = 'rbTEdit'; bar.className = 'hide';
    bar.innerHTML = '<select id="rteScheme"><option value="classic">기존 조작</option><option value="pe">마크 PE 조작</option></select><select id="rteAdd"></select><button id="rteMinus">크기 −</button><button id="rtePlus">크기 ＋</button><button id="rteDel">🗑 빼기</button><button id="rteReset">초기화</button><button id="rteDone">✔ 완료</button><div id="rteSel"></div>';
    $('rbs').appendChild(bar); const ring = document.createElement('div'); ring.id = 'rbRing'; ring.innerHTML = '<i></i>'; $('rbs').appendChild(ring);
    this.load(); this.build(); this.bindZone(); document.body.classList.toggle('rbpe', this.scheme === 'pe');
    $('rteMinus').onclick = () => this.size(-.1); $('rtePlus').onclick = () => this.size(.1); $('rteDel').onclick = () => this.remove(); $('rteReset').onclick = () => { if (confirm('이 조작 방식의 버튼 배치를 처음 상태로 되돌릴까요?')) this.reset(); };
    $('rteDone').onclick = () => this.closeEditor(); $('rteAdd').onchange = e => { this.addKey(e.target.value); e.target.value = ''; };
    $('rteScheme').onchange = e => { this.setScheme(e.target.value); this.sel = null; this.editBar(); };
    addEventListener('resize', () => this.place());
  },
};
const RTCTL_CSS = `
.rtdyn{position:absolute;touch-action:none;user-select:none;-webkit-user-select:none}
.rtb.rtdyn{width:58px;height:58px;border-radius:10px;background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.35);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.rtb.rtsm{width:42px;height:42px;font-size:17px}
#rbRing{position:absolute;display:none;width:clamp(52px,19vmin,150px);height:clamp(52px,19vmin,150px);transform:translate(-50%,-50%);border-radius:50%;border:3px solid #fff;box-sizing:border-box;mix-blend-mode:difference;pointer-events:none;z-index:12}
#rbRing i{position:absolute;inset:3px;border-radius:50%;background:#fff;transform:scale(.12);transition:transform .06s linear}body.rbmob.rbpe #rbCross{display:none}
.rtb.on,.rtb.lock,.rdc.on,.rdc.lock{background:rgba(255,255,255,.4)}
.rdpad{width:168px;height:168px;margin:0}.rdc{position:absolute;width:52px;height:52px;border-radius:8px;background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.35);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center}
.rdpad .rdc-ul,.rdpad .rdc-ur{opacity:0}.rdpad.fwd .rdc-ul,.rdpad.fwd .rdc-ur{opacity:1}
body.rtedit .rtdyn{outline:2px dashed rgba(255,255,0,.6)}body.rtedit .rtdyn.rtsel{outline:3px solid #ff0}body.rtedit #rbHud{opacity:.4}
#rbTEdit{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:40;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;align-items:center;background:rgba(0,0,0,.75);padding:6px;border-radius:8px;max-width:96vw;color:#fff;font-size:13px}
#rbTEdit.hide{display:none}#rbTEdit button,#rbTEdit select{font-size:13px;padding:6px 8px;background:#6f6f6f;color:#fff;border:2px solid;border-color:#aaa #333 #333 #aaa}#rteSel{flex-basis:100%;text-align:center;font-size:12px;color:#ff8}
`;
