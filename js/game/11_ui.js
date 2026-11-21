// ===================== UI / HUD / input =====================
const $ = id => document.getElementById(id);
const DEV_JOBS = new Set(['seryong', 'ai', 'dude', 'jemwenti', 'yuntomman']); // shown under the 개발중 divider
const MCC = { '0': '#000', '1': '#00A', '2': '#0A0', '3': '#0AA', '4': '#A00', '5': '#A0A', '6': '#FA0', '7': '#AAA', '8': '#555', '9': '#55F', 'a': '#5F5', 'b': '#5FF', 'c': '#F55', 'd': '#F5F', 'e': '#FF5', 'f': '#FFF' };
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function mcfmt(s, user) {
  let out = '', col = null, bold = false, buf = '';
  const flush = () => { if (buf) { out += '<span style="' + (col ? 'color:' + col + ';' : '') + (bold ? 'font-weight:800;' : '') + '">' + esc(buf) + '</span>'; buf = ''; } };
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '§' && i + 1 < s.length) {
      const c = s[i + 1].toLowerCase();
      if (c === 'x' && s[i + 2] === '#' && !user) { flush(); col = s.substr(i + 2, 7); i += 8; continue; }
      if (MCC[c] && !user) { flush(); col = MCC[c]; bold = false; i++; continue; }
      if (c === 'l' && !user) { flush(); bold = true; i++; continue; }
      if (c === 'r' && !user) { flush(); col = null; bold = false; i++; continue; }
    }
    buf += s[i];
  }
  flush(); return out;
}
const UI = {
  name: '', persona: 0, job: null, mobile: false, deathMode: 'simple', pcLock: true, assist: true, ASSIST: { grow: .4, cone: .3 }, sens: 1, bob: true, showHp: true, resScale: 1, keys: {}, menuDirty: true,
  mouse: { l: false, r: false }, touch: { f: 0, s: 0, use: false, jump: false, sneak: false, attackHold: false }, sneakToggle: false, sprintToggle: false, lastW: 0,
  titleS: null, abS: null, chatLines: [], tagPool: [], botCount: 3, botLv: 1,
  init() {
    this.kbLoad(); setTimeout(() => this.mcPause(), 0);
    this.mobile = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    document.body.classList.toggle('mobile', this.mobile);
    try { const s = JSON.parse(localStorage.getItem('apvp') || '{}'); this.name = s.name || ''; this.skinName = s.skin || ''; this.deathMode = s.death || 'simple'; this.persona = s.persona | 0; this.sens = s.sens || 1; this.pcLock = s.pcLock !== false; R.fov = clamp(+s.fov || 70, 30, 110); this.vol = s.vol === undefined ? .8 : s.vol; AU.vSfx = s.vSfx === undefined ? 1 : +s.vSfx; AU.vAb = s.vAb === undefined ? 1 : +s.vAb; this.room = s.room || 'main'; this.botLv = s.botLv === undefined ? 1 : clamp(s.botLv | 0, 0, 2); } catch (e) { this.room = 'main'; this.vol = .8; }
    if (!this.name) this.name = '플레이어' + randi(100, 999);
    $('nick').value = this.name; $('skinName').value = this.skinName || ''; $('room').value = this.room; $('sens').value = this.sens; $('pFov').value = R.fov; $('fovv').textContent = R.fov; $('vol').value = this.vol; $('vSfx').value = AU.vSfx; $('vAb').value = AU.vAb;
    this.buildMenu(); this.bindInput(); this.buildHotbar(); this.layout();
    setInterval(() => { if (G.phase === 'menu' && this.menuDirty) { this.menuDirty = false; this.refreshMenu(); } }, 300);
    NET.onChange = () => { this.menuDirty = true; };
  },
  modeUI() { this.modeSync(); this.menuDirty = true; },
  upStatus() { const el = $('upList'); if (!el) return; const L = [...UPJ.files.values()].filter(f => f.ok); el.textContent = L.length ? '업로드된 직업: ' + L.map(f => f.name).join(', ') : ''; },
  modeSync() {
    const host = G.isHost(); { const u = $('upBtn'); if (u) u.classList.toggle('dis', NET.mode !== 'off' && !host); }
    for (const k of ['mode', 'pMode']) { const el = $(k); if (el) { el.value = G.ffa ? 'ffa' : 'team'; el.disabled = !host; } }
    for (const k of ['uniq', 'pUniq']) { const el = $(k); if (el) { el.value = G.uniq ? '1' : '0'; el.disabled = !host; } }
    for (const k of ['roomNote', 'pRoomNote']) { const el = $(k); if (el) el.textContent = host ? '👑 방장: 내가 정해요' : '방장만 바꿀 수 있어요'; }
  },
  pickRoom(ffa, uniq) {
    if (!G.isHost()) { this.modeUI(); return; }
    G.setMode(ffa, 0, uniq); NET.emit({ k: 'mode', ffa: G.ffa, uniq: G.uniq, t: G.modeT });
    UI.chat('§e방 설정: ' + (G.ffa ? '개인전 (모두가 적)' : '팀전 (같은 인격끼리 아군)') + ' · ' + (G.uniq ? '직업당 1명' : '직업 중복 가능'));
  },
  jobVar: {}, // last-picked variant per job card
  addJobButton(id) {
    const jb = $('jobs'); if (!jb) return; const J = JOBS[id]; const old = jb.querySelector('.job[data-id="' + id + '"]'); if (old) old.remove();
    const b = document.createElement('button'); b.className = 'mcbtn job'; b.dataset.id = id; b.innerHTML = '<b>' + J.icon + ' ' + esc(J.name) + (J.uploaded ? ' <small class="upl">업로드됨</small>' : J.wip ? ' <small class="wip">' + (J.custom && !J.builtin ? '커스텀' : '미완성') + '</small>' : '') + '</b><small class="desc">' + esc(J.desc) + '</small>' + (J.vars ? '<span class="jvars">' + J.vars.map(v => '<span class="jvar" data-v="' + v[0] + '">' + v[1] + '</span>').join('') + '</span>' : '') + '<small class="taken"></small>';
    // variants (dude New/old): click the toggle while the card is selected -> switch to the other variant; card click picks the last-used variant
    if (J.vars) b.querySelector('.jvars').onclick = e => { e.stopPropagation(); if (b.classList.contains('taken')) return; const vs = J.vars.map(v => v[0]), cur = vs.indexOf(this.job);
      this.job = cur >= 0 ? vs[(cur + 1) % vs.length] : (this.jobVar[id] || id); this.jobVar[id] = this.job; this.jobT = Date.now(); AU.init(); AU.sfx('click'); this.refreshMenu(); };
    b.onclick = () => { if (b.classList.contains('taken')) return; const pick = J.vars ? (this.jobVar[id] || id) : id; const on = this.job === id || (J.vars && J.vars.some(v => v[0] === this.job)); this.job = on ? null : pick; this.jobT = Date.now(); AU.init(); AU.sfx('click'); if (this.job && JOBS[id].uploaded) this.chat('§b' + JOBS[id].name + '§f: 방장이 임의로 업로드한 직업이며, 원활하게 작동되지 않을 수도 있어요'); this.refreshMenu(); };
    const dev = DEV_JOBS.has(id) || J.custom || J.uploaded || J.builtin; const ref = dev ? $('btnNewJob') : $('jobSep'); if (ref) jb.insertBefore(b, ref); else jb.appendChild(b);
  },
  // practice / dev tool test options: 무적 (I take no damage) and 봇 AI 끄기 (bots stand still as training dummies)
  god: false, botAI: true,
  setTest(k, v) {
    if (k === 'god') this.god = !!v; if (k === 'noai') this.botAI = !v;
    for (const id of ['devGod', 'pGod']) { const c = $(id); if (c) c.checked = this.god; } for (const id of ['devNoAI', 'pNoAI']) { const c = $(id); if (c) c.checked = !this.botAI; }
    if (G.phase === 'game') this.chat('§e테스트 옵션: 무적 ' + (this.god ? '켜짐' : '꺼짐') + ' · 봇 AI ' + (this.botAI ? '켜짐' : '꺼짐'));
  },
  packStatus(msg) {
    const st = $('packSt'); if (!st) return; const on = $('packOn'), del = $('packDel'), get = $('packGet'); get.disabled = PACK.busy; get.textContent = PACK.has ? '🔄 바닐라 리소스팩 다시 받기' : '⬇️ 바닐라 리소스팩 받아서 적용';
    on.disabled = !PACK.has || PACK.busy; on.checked = PACK.on; del.disabled = !PACK.has || PACK.busy;
    if (msg) { st.textContent = msg; return; }
    st.textContent = PACK.has ? ('저장됨: ' + (PACK.data.name || 'ZIP') + ' · 텍스처 ' + PACK.data.nt + '개 · 소리 ' + PACK.data.ns + '개 · ' + (PACK.on ? '사용 중' : '꺼짐')) : '불러온 리소스팩 없음 · 기본 텍스처/효과음 사용 중';
  },
  initPack() {
    $('packGet').onclick = () => PACK.download();
    $('packOn').onchange = e => { AU.init(); PACK.setOn(e.target.checked); };
    $('packDel').onclick = () => { if (confirm('저장된 리소스팩을 지울까요?')) PACK.clear(); };
    PACK.boot();
  },
  // ---------- PC key bindings (조작 설정): action -> KeyboardEvent.code or Mouse0/1/2 ----------
  BINDS: [['attack', '공격', 'Mouse0'], ['use', '사용', 'Mouse2'], ['fwd', '앞으로', 'KeyW'], ['back', '뒤로', 'KeyS'], ['left', '왼쪽', 'KeyA'], ['right', '오른쪽', 'KeyD'], ['jump', '점프', 'Space'], ['sneak', '웅크리기', 'ShiftLeft'], ['sprint', '달리기', 'ControlLeft'],
    ['spawn', '스폰 설정', 'KeyE'], ['swap', '보조손 교체', 'KeyF'], ['view', '시점 전환', 'KeyV'], ['list', '점수판', 'Tab'], ['chat', '채팅', 'KeyT']],
  kb: null,
  kbLoad() { this.kb = {}; for (const [a, , d] of this.BINDS) this.kb[a] = d; try { Object.assign(this.kb, JSON.parse(localStorage.getItem('apvp_keys') || '{}')); } catch (e) { } },
  kbSave() { try { localStorage.setItem('apvp_keys', JSON.stringify(this.kb)); } catch (e) { } },
  kd(a) { return !!this.keys[this.kb[a]]; },
  keyName(c) { if (!c) return '없음'; const M = { Mouse0: '왼쪽 클릭', Mouse1: '휠 클릭', Mouse2: '오른쪽 클릭', Mouse3: '마우스 4', Mouse4: '마우스 5', Space: '스페이스', ShiftLeft: '왼쪽 Shift', ShiftRight: '오른쪽 Shift', ControlLeft: '왼쪽 Ctrl', ControlRight: '오른쪽 Ctrl', AltLeft: '왼쪽 Alt', AltRight: '오른쪽 Alt', Tab: 'Tab', CapsLock: 'Caps Lock', Enter: 'Enter', Backquote: '`', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
    if (M[c]) return M[c]; if (/^Key[A-Z]$/.test(c)) return c.slice(3); if (/^Digit\d$/.test(c)) return c.slice(5); if (/^Numpad/.test(c)) return '숫자패드 ' + c.slice(6); return c; },
  // pressing / releasing a bound key or mouse button
  press(c) { const b = this.kb, me = G.me;
    if (c === b.attack) { this.mouse.l = true; me && me.attack(); }
    if (c === b.use) { this.mouse.r = true; me && me.usePress(); }
    if (c === b.list) { this.tabOpen = true; $('tab').classList.remove('hide'); }
    if (c === b.view) R.third = (R.third + 1) % 3;
    if (c === b.spawn) this.setSpawn();
    if (c === b.swap && me) { const t = me.off; me.off = me.inv[me.sel]; me.inv[me.sel] = t; }
    if (c === b.chat) { this.openChat(); return true; }
    if (c === b.fwd) { const n = performance.now(); if (n - this.lastW < 280) this.sprintW = true; this.lastW = n; }
  },
  release(c) { const b = this.kb; if (c === b.attack) this.mouse.l = false; if (c === b.use) this.mouse.r = false; if (c === b.list) { this.tabOpen = false; $('tab').classList.add('hide'); } },
  save() { try { localStorage.setItem('apvp', JSON.stringify({ name: this.name, skin: this.skinName, death: this.deathMode, persona: this.persona, sens: this.sens, pcLock: this.pcLock, botLv: this.botLv, fov: R.fov, vol: this.vol, vSfx: AU.vSfx, vAb: AU.vAb, room: this.room })); } catch (e) { } },
  // ---------- menu ----------
  buildMenu() {
    const pe = $('personas'); pe.innerHTML = '';
    PERSONAS.forEach((P, i) => { const b = document.createElement('button'); b.className = 'mcbtn persona'; b.innerHTML = '<span style="color:' + P.color + '">■</span> ' + P.name; b.onclick = () => { this.persona = i; AU.init(); AU.play(P.snd); this.refreshMenu(); NET.connected && 0; }; b.dataset.i = i; pe.appendChild(b); });
    const jb = $('jobs'); jb.innerHTML = ''; const sep = document.createElement('div'); sep.id = 'jobSep'; sep.className = 'jobsep'; sep.textContent = '🛠 개발중'; jb.appendChild(sep);
    const nb = document.createElement('button'); nb.className = 'mcbtn jobnew'; nb.id = 'btnNewJob'; nb.innerHTML = '<b>＋ 능력 새로 추가하기</b><small class="desc">(또는 시스템 수정하기) · 내 AI로 직업을 만들어 테스트</small>';
    nb.onclick = () => { AU.init(); AU.sfx('click'); if (DEV.on) { $('devPanel').classList.remove('fold'); $('devPanel').scrollIntoView({ block: 'nearest' }); return; } $('newJobPop').classList.remove('hide'); }; jb.appendChild(nb);
    JOB_ORDER.forEach(id => this.addJobButton(id));
    $('njDown').onclick = () => { const ok = SITE.openDev(); $('njMsg').textContent = !ok ? '✔ apvp4_devtool.html 을 저장했어요 (다운로드 폴더). 그 파일을 열면 개발 도구가 켜져요.' : SITE.inFrame ? '✔ 바탕화면에 개발 도구 창을 열었어요' : '✔ 새 탭에 개발 도구를 열었어요'; };
    $('njClose').onclick = () => $('newJobPop').classList.add('hide');
    $('nick').oninput = e => { this.name = e.target.value.slice(0, 16); this.save(); };
    $('skinName').oninput = e => { clearTimeout(this._skT); this._skT = setTimeout(() => { this.skinName = e.target.value.trim().slice(0, 16); SKIN.retry(this.skinName); this.save(); if (G.me) G.me.skin = this.skinName; SKIN.get(this.skinName); this.onSkin(this.skinName); }, 500); };
    setTimeout(() => { if (this.skinName) { SKIN.get(this.skinName); this.onSkin(this.skinName); } }, 300);
    $('room').onchange = e => { this.room = e.target.value.trim().toLowerCase() || 'main'; this.save(); this.connect(); };
    $('btnPlay').onclick = () => this.enter(false);
    $('btnPractice').onclick = () => this.enter(true);
    $('botLv').value = String(this.botLv); $('botLv').onchange = e => { this.botLv = +e.target.value; this.save(); };
    $('botn').oninput = e => { this.botCount = +e.target.value; $('botv').textContent = this.botCount; };
    $('btnHelp').onclick = () => $('help').classList.toggle('hide');
    $('sens').oninput = e => { this.sens = +e.target.value; this.save(); };
    for (const k of ['mode', 'pMode']) $(k).onchange = e => this.pickRoom(e.target.value === 'ffa', G.uniq);
    for (const k of ['uniq', 'pUniq']) $(k).onchange = e => this.pickRoom(G.ffa, e.target.value === '1');
    $('upFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; await UPJ.upload(f); this.refreshMenu(); };
    $('pGod').onchange = e => this.setTest('god', e.target.checked); $('pNoAI').onchange = e => this.setTest('noai', e.target.checked);
    $('pFov').oninput = e => { R.fov = +e.target.value; $('fovv').textContent = R.fov; this.save(); };
    $('vol').oninput = e => { this.vol = +e.target.value; AU.setVol('vol', this.vol); this.save(); };
    for (const k of ['vSfx', 'vAb']) $(k).oninput = e => { AU.setVol(k, +e.target.value); this.save(); };
    $('pResume').onclick = () => this.resume();
    $('pStart').onclick = () => { G.startMatch(true); this.resume(); };
    $('pView').onclick = () => { R.third = (R.third + 1) % 3; };
    $('pLobby').onclick = () => this.toLobby();
    $('pRes').onchange = e => { this.resScale = +e.target.value; };
    $('pDeath').value = this.deathMode; $('pDeath').onchange = e => { this.deathMode = e.target.value; this.save(); };
    $('pHp').onchange = e => { this.showHp = e.target.checked; };
    $('pBob').onchange = e => { this.bob = e.target.checked; };
    $('pAssist').onchange = e => { this.assist = e.target.checked; };
    this.pcLock = SITE.autoFs(); $('pLock').checked = this.pcLock; $('pLock').onchange = e => this.setAutoFs(e.target.checked);
    // 자동 전체화면: entering the game goes browser-fullscreen + keyboard lock (Ctrl+W protection). Off: never forced
    this.setAutoFs = v => { this.pcLock = !!v; SITE.setAutoFs(this.pcLock); this.save(); for (const id of ['pLock', 'setFs']) { const c = $(id); if (c) c.checked = this.pcLock; } if (typeof DESK !== 'undefined') DESK.refreshStart(); if (!this.pcLock) { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (x) { } if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { }); } };
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (x) { } } });
    $('pHelp').onclick = () => $('help2').classList.toggle('hide');
    // settings from the job selection screen (⚙️) reuse the pause panel without the in-game rows
    $('mGear').onclick = () => this.openSettings(); $('pClose').onclick = () => this.closeSettings();
    $('pP2P').checked = SITE.p2pNow(); $('pP2P').onchange = e => { SITE.setP2PNow(e.target.checked); if (DEV.on) return; if (e.target.checked) { if (!G.practice) this.connect(); } else { NET.disconnect(); NET.status = '🔒 P2P 멀티플레이 꺼짐 · ⚙️ 설정에서 켤 수 있어요 (연습 모드는 가능)'; G.remotes.clear(); this.menuDirty = true; } };
    document.body.classList.toggle('inframe', SITE.inFrame);
    $('pWinMode').onclick = () => { this.resume(); SITE.toParent({ t: 'win' }); };
    const toDesk = () => { try { document.exitPointerLock(); } catch (x) { } SITE.toParent({ t: 'close' }); }; $('btnDesk').onclick = toDesk; $('pDeskX').onclick = toDesk;
    addEventListener('message', e => { const m = e.data; if (!m || !m.site) return; if (m.t === 'blur' && G.phase === 'game' && !this.paused) { this.pause(); try { document.exitPointerLock(); } catch (x) { } } });
  },
  // a remote holds a job if it is in the arena with it, or picked it before me (ties: lower id wins)
  onSkin(n) {
    if (n !== this.skinName) return; const st = SKIN.state(n), el = $('skinStat'), pv = $('skinPrev'), g = pv.getContext('2d'); g.clearRect(0, 0, 32, 32);
    el.textContent = !n ? '비우면 기본 모습' : st === 'ok' ? '✔ 적용됨' : st === 'fail' ? '✖ 찾을 수 없음 (기본 모습)' : '불러오는 중…';
    const s = SKIN.cache.get((n || '').toLowerCase()); if (st === 'ok' && s) { g.imageSmoothingEnabled = false; g.drawImage(s.cv, 8, 8, 8, 8, 0, 0, 32, 32); g.drawImage(s.cv, 40, 8, 8, 8, 0, 0, 32, 32); }
  },
  takenJobs() {
    const t = {}; if (!G.uniq) return t; // host allowed duplicate jobs
    for (const r of G.remotes.values()) {
      if (!r.job || !r.ph) continue;
      if (r.job === this.job && r.ph !== 'game') { const rt = r.jt || 0, mt = this.jobT || 0; const mine = mt && (mt < rt || (mt === rt && G.nid < r.id)); if (mine) continue; }
      t[r.job] = r.name;
    }
    return t;
  },
  refreshMenu() {
    document.querySelectorAll('.persona').forEach(b => b.classList.toggle('sel', +b.dataset.i === this.persona));
    const taken = NET.mode !== 'off' ? this.takenJobs() : {};
    document.querySelectorAll('.job').forEach(b => { const id = b.dataset.id; const tk = taken[id]; b.classList.toggle('sel', this.job === id || !!(this.job && JOBS[this.job] && JOBS[this.job].varOf === id)); b.querySelectorAll('.jvar').forEach(s => s.classList.toggle('on', s.dataset.v === this.job)); b.classList.toggle('taken', !!tk); b.querySelector('.taken').textContent = tk ? '사용 중: ' + tk : ''; if (tk && this.job === id) { this.job = null; this.chatToast = '§c' + tk + ' 님이 먼저 ' + JOBS[id].name + '을(를) 골랐어요'; } });
    if (this.chatToast) { $('jobinfo').innerHTML = mcfmt(this.chatToast); this.chatToast = null; return; }
    $('netstat').textContent = NET.status; this.modeSync();
    const list = [...G.remotes.values()]; $('plist').innerHTML = list.length ? list.map(r => '<div>' + mcfmt('§x' + PERSONAS[r.persona].color + '■ ') + esc(r.name) + ' <small>' + (r.job ? JOBS[r.job] ? JOBS[r.job].name : '' : '직업 미선택') + ' · ' + (r.ph === 'game' ? '경기 중' : '로비') + '</small></div>').join('') : '<small>아직 같은 방에 아무도 없어요. 이 페이지를 공유한 사람이 같은 방 코드로 들어오면 여기에 표시돼요.</small>';
    const J = this.job ? JOBS[this.job] : null;
    $('jobinfo').innerHTML = J ? (J.uploaded ? '<div class="uplwarn">⚠ 이 직업은 방장이 임의로 업로드한 직업이며, 원활하게 작동되지 않을 수도 있어요.</div>' : '') + '<b>' + J.icon + ' ' + J.name + '</b> — ' + J.desc + '<ul>' + J.kit.filter(Boolean).map(k => { const D = ITEMS[k[0]]; return '<li>' + ART.iconHTML(k[0]) + ' <b>' + D.name + '</b>' + (D.cd ? ' <small>(쿨타임 ' + D.cd + '초)</small>' : '') + (D.lore ? ' — ' + D.lore : '') + '</li>'; }).join('') + (J.off ? '<li>' + ITEMS[J.off].icon + ' ' + ITEMS[J.off].name + ' (보조손)</li>' : '') + '</ul>' : '직업을 선택하세요. ' + (G.uniq ? '한 판에 직업당 1명만 고를 수 있어요.' : '이 방은 같은 직업을 여러 명이 고를 수 있어요.') + '';
    $('btnPlay').disabled = !this.job; $('btnPractice').disabled = !this.job;
  },
  async connect() { if (!DEV.on && !SITE.p2pNow()) { NET.disconnect(); NET.status = '🔒 P2P 멀티플레이 꺼짐 · ⚙️ 설정에서 켤 수 있어요 (연습 모드는 가능)'; this.menuDirty = true; return; } if (DEV.on) { NET.disconnect(); NET.status = '🛠 개발 도구: 오프라인 (연습 모드만)'; this.menuDirty = true; return; } NET.status = '연결 중…'; this.menuDirty = true; G.remotes.clear(); G.rmobs.clear(); await NET.connect(this.room); this.menuDirty = true; },
  enter(practice) {
    document.body.classList.toggle('practice', !!practice || DEV.on);
    if (!this.job) return; AU.init(); this.name = ($('nick').value || this.name).slice(0, 16); this.save();
    if (!this.jobT) this.jobT = Date.now();
    this.resetInput();
    G.practice = practice; G.bots = []; G.mobs = []; G.arrows = []; G.drops = []; G.chains = []; G.vigs = []; G.match = false; G.kills = {};
    if (practice) { NET.disconnect(); NET.status = '연습 모드'; G.remotes.clear(); G.rmobs.clear(); }
    G.resetWorld();
    const me = new Player(G.nid, this.name, this.persona, this.job); me.skin = this.skinName; G.me = me; me.respawn();
    if (practice) {
      const pool = JOB_ORDER.filter(j => j !== this.job).sort(() => Math.random() - .5);
      for (let i = 0; i < this.botCount; i++) { const b = new Player('bot' + i, BOT_NAMES[i % BOT_NAMES.length], randi(0, 4), pool[i % pool.length], true); b.skin = BOT_SKINS[i % BOT_SKINS.length]; b.pad = (me.pad + 1 + i) % 4; b.respawn(); G.bots.push(b); }
      G.match = true;
    }
    G.phase = 'game'; $('menu').classList.add('hide'); $('hud').classList.remove('hide'); this.layout();
    this.buildHotbar(); this.chat('§e[' + JOBS[this.job].name + '] §f직업으로 입장했습니다. ' + (practice ? '봇 ' + this.botCount + '명과 대전합니다.' : '바닥의 색 콘크리트 위에서 §e' + (this.mobile ? '[스폰]' : '[E]') + '§f로 스폰포인트를 찍을 수 있어요.'));
    if (!practice) this.chat('§7메뉴(' + (this.mobile ? '☰' : 'Esc') + ') → "경기 시작"을 누르면 모두의 사망 수가 초기화되고 경기가 시작돼요.');
    if (!this.mobile) this.lock();
  },
  resetInput() { this.paused = false; this.keys = {}; this.mouse.l = this.mouse.r = false; Object.assign(this.touch, { f: 0, s: 0, use: false, jump: false, sprint: false, attackHold: false, sneak: false }); this.sneakToggle = false; this.sprintW = false; const ts = $('tSneak'); if (ts) ts.classList.remove('lock'); const j = $('joy'); if (j) j.style.display = 'none'; if (this.chatOpen) this.closeChat(); if (this.resetTouch) this.resetTouch(); if (this.closeMenu) this.closeMenu(); },
  toLobby() {
    this.resetInput();
    G.phase = 'menu'; G.me = null; G.bots = []; G.mobs = []; G.arrows = []; G.match = false; AU.loop('360song', false);
    $('pause').classList.add('hide'); $('hud').classList.add('hide'); $('menu').classList.remove('hide'); this.job = null; this.menuDirty = true; this.layout();
    if (document.exitPointerLock) document.exitPointerLock();
    try { navigator.keyboard && navigator.keyboard.unlock(); } catch (x) { } if (!this.mobile && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { }); if (!this.mobile) SITE.toParent({ t: 'unfs' });
    if (G.practice) { G.practice = false; this.connect(); }
  },
  openSettings() { this.modeSync(); $('pP2P').checked = SITE.p2pNow(); document.body.classList.add('setmenu'); $('pause').classList.remove('hide'); this.mcPage('set'); },
  // Minecraft-style options: every row becomes one stone button — toggles read "이름: 켜짐", choices cycle on click, sliders fill the button
  mcPause() {
    const pct = new Set(['vol', 'vSfx', 'vAb']);
    for (const lb of document.querySelectorAll('#pause .inner > label')) {
      const inp = lb.querySelector('input,select'); if (!inp) continue;
      const name = [...lb.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      const nm0 = inp.id === 'sens' ? (this.mobile ? '터치 감도' : '마우스 감도') : null;
      const sp = document.createElement('span'); sp.className = 'mcl'; lb.prepend(sp); [...lb.childNodes].forEach(n => { if (n.nodeType === 3) n.remove(); });
      lb.classList.add('mcw'); const kind = inp.tagName === 'SELECT' ? 'sel' : inp.type === 'range' ? 'rng' : 'chk'; if (kind === 'rng') lb.classList.add('mcr');
      const show = () => { let v; if (kind === 'chk') v = inp.checked ? '켜짐' : '꺼짐'; else if (kind === 'sel') v = inp.options[inp.selectedIndex] ? inp.options[inp.selectedIndex].text : ''; else { const x = +inp.value; v = pct.has(inp.id) ? Math.round(x * 100) + '%' : inp.step && +inp.step < 1 ? x.toFixed(2) : String(Math.round(x)); }
        sp.textContent = (nm0 || name) + ': ' + v; lb.classList.toggle('dis', !!inp.disabled); };
      inp.addEventListener('input', show); inp.addEventListener('change', show);
      if (kind === 'sel') lb.addEventListener('click', e => { if (inp.disabled || e.target === inp) return; e.preventDefault(); inp.selectedIndex = (inp.selectedIndex + 1) % inp.options.length; inp.dispatchEvent(new Event('change', { bubbles: true })); show(); try { AU && AU.click && AU.click(); } catch (_) { } });
      lb._mcShow = show; show();
    }
    // staged screens like Minecraft: 게임 메뉴 -> 설정... -> 화면 설정... / 조작 설정... ; 완료 is pinned at the bottom and goes back one step
    const inner = document.querySelector('#pause .inner'); const mid = document.createElement('div'); mid.className = 'pmid'; const grid = document.createElement('div'); grid.className = 'pgrid'; mid.appendChild(grid);
    inner.insertBefore(mid, $('pClose')); inner.appendChild($('pClose'));
    const byIn = id => { const e = $(id); return e && (e.closest('label') || e); };
    const nav = (txt, pg, cls) => { const b = document.createElement('button'); b.className = 'mcbtn' + (cls ? ' ' + cls : ''); b.textContent = txt; b.onclick = () => this.mcPage(pg); return b; };
    $('help2').remove(); $('pHelp').remove(); // 조작법 is gone: the key list lives in 조작 설정
    const sensL = byIn('sens'); if (sensL && sensL._mcShow) { sensL.dataset.nm = 1; }
    const kbBox = []; if (!this.mobile) { for (const [a, nm] of this.BINDS) { const bt = document.createElement('button'); bt.className = 'mcbtn mckb pconly'; bt.dataset.act = a; bt.onclick = () => this.kbAsk(bt); kbBox.push(bt); }
      const rs = document.createElement('button'); rs.className = 'mcbtn pconly'; rs.textContent = '키 설정 초기화'; rs.onclick = () => { localStorage.removeItem('apvp_keys'); this.kbLoad(); this.kbShow(); }; kbBox.push([rs, 'pfull']); }
    this.PAGES = {
      main: { t: '게임 메뉴', up: null, el: [[$('pResume'), 'pfull'], nav('경기 설정...', 'match', 'gameonly'), $('pStart'), $('pView'), nav('설정...', 'set'), $('pDeskX'), $('pWinMode'), [$('pLobby'), 'pfull']] },
      match: { t: '경기 설정', up: 'main', el: [byIn('pGod'), byIn('pNoAI'), byIn('pMode'), byIn('pUniq')] },
      set: { t: '설정', up: 'main', el: [byIn('pFov'), nav('볼륨 설정...', 'sound'), byIn('pP2P'), byIn('pLock'), nav('화면 설정...', 'video'), nav('조작 설정...', 'ctrl')] },
      sound: { t: '볼륨 설정', up: 'set', el: [[byIn('vol'), 'pfull'], byIn('vSfx'), byIn('vAb')] },
      video: { t: '화면 설정', up: 'set', el: [byIn('pRes'), byIn('pHp'), byIn('pBob'), byIn('pDeath')] },
      ctrl: { t: '조작 설정', up: 'set', el: [[sensL, this.mobile ? '' : 'pfull'], byIn('pAssist'), byIn('pCtl'), byIn('pMove'), byIn('pSneakM'), $('pEdit'), ...kbBox] },
    };
    for (const k in this.PAGES) this.PAGES[k].el = this.PAGES[k].el.map(e => { const [el, cls] = Array.isArray(e) ? e : [e]; if (!el) return null; if (cls) el.classList.add(cls); el.dataset.pg = k; grid.appendChild(el); return el; }).filter(Boolean);
    for (const el of [...inner.children]) if (el !== mid && el !== $('pClose') && el !== $('pTitle')) el.remove(); // nothing left outside the pages
    $('pClose').onclick = () => { const P = this.PAGES[this.pg]; const top = document.body.classList.contains('setmenu') ? 'set' : 'main'; if (!P || this.pg === top) { if (top === 'set') this.closeSettings(); else this.resume(); } else this.mcPage(P.up); };
  },
  mcPage(pg) { this.pg = pg; const P = this.PAGES[pg]; $('pTitle').textContent = P.t; for (const k in this.PAGES) for (const el of this.PAGES[k].el) el.classList.toggle('pon', k === pg);
    const top = document.body.classList.contains('setmenu') ? 'set' : 'main'; $('pClose').classList.toggle('phide', pg === 'main'); $('pClose').textContent = '완료'; this.mcRefresh(); const g = document.querySelector('#pause .pgrid'); if (g) g.scrollTop = 0; },
  mcRefresh() { for (const lb of document.querySelectorAll('#pause .mcw')) if (lb._mcShow) lb._mcShow(); this.kbShow(); },
  kbShow() { for (const bt of document.querySelectorAll('#pause .mckb')) { const a = bt.dataset.act; const nm = this.BINDS.find(x => x[0] === a)[1]; const c = this.kb[a]; const dup = c && Object.entries(this.kb).some(([k, v]) => k !== a && v === c);
    bt.innerHTML = this.kbWait === bt ? '<span style="color:#ffff60">&gt; ' + nm + ': 키를 누르세요 &lt;</span>' : '<span>' + nm + ': <span style="color:' + (dup ? '#ff5555' : '#fff') + '">' + this.keyName(c) + '</span></span>'; } },
  // MC style: click a binding, then press any key or mouse button (Esc = 없음 / cancel)
  kbAsk(bt) { if (this.kbWait) return; this.kbWait = bt; this.kbShow();
    const done = c => { removeEventListener('keydown', kd, true); removeEventListener('mousedown', md, true); setTimeout(() => { this.kbWait = null; this.kbShow(); }, 0); if (c !== undefined) { this.kb[bt.dataset.act] = c; this.kbSave(); } this.keys = {}; };
    const kd = e => { e.preventDefault(); e.stopPropagation(); done(e.code === 'Escape' ? '' : e.code); };
    const md = e => { if (e.target === bt && e.button === 0 && !this._kbArm) return; e.preventDefault(); e.stopPropagation(); done('Mouse' + e.button); };
    this._kbArm = false; setTimeout(() => { this._kbArm = true; addEventListener('mousedown', md, true); }, 0); addEventListener('keydown', kd, true); },
  closeSettings() { document.body.classList.remove('setmenu'); $('pause').classList.add('hide'); },
  pause() { if (G.phase !== 'game') return; document.body.classList.remove('setmenu'); setTimeout(() => this.mcPage('main'), 0); this.modeSync(); $('pause').classList.remove('hide'); this.paused = true; this.keys = {}; this.mouse.l = this.mouse.r = false; },
  resume() { $('pause').classList.add('hide'); this.paused = false; if (!this.mobile) this.lock(); },
  lock() { const cv = $('cv'); this.keyLock(); try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  keyLock() {
    if (SITE.inFrame) { if (!this.mobile && SITE.autoFs()) SITE.toParent({ t: 'fs', lock: true, auto: 1 }); return; } // the top page goes browser-fullscreen + keyboard lock (Ctrl+W protection); the window keeps its size
    if (this.mobile || !SITE.autoFs() || !(navigator.keyboard && navigator.keyboard.lock)) return;
    const keys = [...new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyT', 'KeyN', 'KeyR', 'KeyQ', 'KeyE', 'KeyF', 'KeyV', 'Tab', 'Space', 'ControlLeft', 'ControlRight', 'Escape', ...Object.values(this.kb || {}).filter(c => !c.startsWith('Mouse'))])];
    const doLock = () => { try { const q = navigator.keyboard.lock(keys); if (q && q.catch) q.catch(() => { }); } catch (e) { } };
    const d = document, el = d.documentElement;
    if (d.fullscreenElement) { doLock(); return; }
    try { const p = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(doLock).catch(() => { }); } catch (e) { }
  },
  // ---------- HUD ----------
  chat(t, user) { const d = document.createElement('div'); d.innerHTML = user ? mcfmt(t.split('§f> ')[0] + '§f> ') + esc(t.split('§f> ').slice(1).join('§f> ')) : mcfmt(t); d.dataset.t = performance.now(); $('chat').appendChild(d); while ($('chat').children.length > 8) $('chat').firstChild.remove(); },
  title(t, s, o = {}) { const fi = (o.fi ?? 10) * 50, st = (o.st ?? 70) * 50, fo = (o.fo ?? 20) * 50; this.titleS = { t0: performance.now(), fi, st, fo }; $('tt').innerHTML = mcfmt(t || ''); $('ts').innerHTML = mcfmt(s || ''); },
  folPop(n, txt, cls) { // 창찬: "+n 팔로워" (or txt, e.g. "출혈이 있다" in red) at a random spot on screen, rising and fading out
    const hud = $('hud'); if (!hud || hud.querySelectorAll('.folpop').length > 30) return;
    const e = document.createElement('div'); e.className = 'folpop' + (cls ? ' ' + cls : ''); e.textContent = txt || '+' + n + ' 팔로워';
    e.style.left = (8 + Math.random() * 78) + '%'; e.style.top = (15 + Math.random() * 60) + '%';
    hud.appendChild(e); setTimeout(() => e.remove(), 1300);
  },
  actionbar(t) { $('actionbar').innerHTML = mcfmt(t); this.abS = performance.now(); this._abArmed = false; },
  hurtFlash() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = .55; requestAnimationFrame(() => { h.style.transition = 'opacity .5s'; h.style.opacity = 0; }); },
  buildHotbar() {
    const hb = $('hotbar'); hb.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('div'); s.className = 'slot'; s.innerHTML = '<span class="ic"></span><span class="cnt"></span><span class="cd"></span><span class="dur"><i></i></span><span class="key">' + (i + 1) + '</span>';
      let lastTap = 0;
      s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!G.me) return; const now = performance.now(); if (G.me.sel === i && now - lastTap < 350) { G.me.usePress(); } G.me.sel = i; this.equip = 1; lastTap = now; });
      hb.appendChild(s);
    }
  },
  drawHearts(me) {
    const cv = $('heartsC'); const max = me.maxHp(), hp = Math.max(0, me.hp); const n = Math.ceil(max / 2); const rows = Math.ceil(n / 10);
    const key = Math.ceil(hp) + '/' + max + '/' + me.eff('poison') + '/' + (me.hurtTime > 0 ? 1 : 0) + '/' + (G.tick >> 2 & 1) * (hp <= 4 ? 1 : 0); if (key === this._hk) return; this._hk = key;
    const S = this.mobile ? 2 : 3, P = 8; cv.width = 10 * P * S + S; cv.height = (rows * (P + 1) + 1) * S; const g = cv.getContext('2d');
    const H = ['.XX.XX.', 'XrwXrrX', 'XwrrrrX', 'XrrrrrX', '.XrrrX.', '..XrX..', '...X...'];
    const red = me.eff('poison') ? '#8A9A1E' : '#E01818';
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 10), col = i % 10; const ox = col * P * S, oy = (rows - 1 - row) * (P + 1) * S + ((hp <= 4 && (G.tick + i) % 4 < 2) ? -S : 0);
      const v = clamp(hp - i * 2, 0, 2);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const c = H[y][x]; if (c === '.') continue; let f;
        if (c === 'X') f = me.hurtTime > 0 ? '#fff' : '#111';
        else { const filled = v >= 2 || (v >= 1 && x <= 3); f = filled ? (c === 'w' ? '#FFB0B0' : red) : '#3a1010'; }
        g.fillStyle = f; g.fillRect(ox + x * S, oy + y * S, S, S);
      }
    }
  },
  hud(dt) {
    const me = G.me; if (!me) return; const now = performance.now();
    this.drawHearts(me);
    // hotbar
    const hb = $('hotbar').children;
    for (let i = 0; i < 9; i++) {
      const s = me.inv[i], el = hb[i]; const D = s ? ITEMS[s.id] : null;
      el.classList.toggle('sel', me.sel === i);
      const ic = D ? ART.iconHTML(s.id) : ''; if (el._ic !== ic) { el._ic = ic; el.children[0].innerHTML = ic; el.title = D ? D.name : ''; }
      el.children[1].textContent = s && (s.count > 1 || D.stack) ? s.count : '';
      const cd = D && D.group ? me.cdLeft(D.group) : 0; const cl = D && D.group ? me.cdLen[D.group] || 1 : 1; el.children[2].style.height = (cd > 0 ? cd / cl * 100 : 0) + '%';
      el.children[3].style.display = s && s.dur !== undefined ? 'block' : 'none'; if (s && s.dur !== undefined) { const f = s.dur / s.max; el.children[3].firstChild.style.width = f * 100 + '%'; el.children[3].firstChild.style.background = f > .5 ? '#3f3' : f > .2 ? '#fd2' : '#f33'; }
    }
    const off = $('offhand'); const oi = me.off ? ART.iconHTML(me.off.id) : ''; off.style.visibility = me.off ? 'visible' : 'hidden'; if (off._ic !== oi) { off._ic = oi; off.firstChild.innerHTML = oi; }
    const sd = me.inv[me.sel]; const sn = sd ? ITEMS[sd.id].name : ''; if (sn !== this._sn) { this._sn = sn; this._snT = now; $('itemname').textContent = sn; } $('itemname').style.opacity = now - this._snT < 1500 ? 1 : Math.max(0, 1 - (now - this._snT - 1500) / 500);
    this.equip = Math.max(0, (this.equip || 0) - dt / 150);
    // armed abilities: persistent actionbar (other messages still show first, then it comes back)
    const armed = me.job === 'bilcorner' && !me.spectator ? (me.st.awaken ? '§6쉰팝 모드 §f· 팔로워 : ' + (me.st.fol || 0) + ' 명' : (me.st.follow100 ? '§c' : '§f') + '팔로워 : ' + (me.st.fol || 0) + ' 명') : me.st.spinArmed ? '§d360도 회전 활성화됨' : me.st.grabArmed ? '§a그랩 폭발 활성화됨' : null;
    if (armed && (this._abArmed || !this.abS || now - this.abS > 1800)) { if (this._abTxt !== armed || !this._abArmed) { $('actionbar').innerHTML = mcfmt(armed); this._abTxt = armed; } this.abS = now; this._abArmed = true; }
    else if (!armed) this._abArmed = false;
    // attack indicator
    const ch = me.charge(); $('atkind').style.display = ch < 1 && !me.spectator ? 'block' : 'none'; $('atkind').firstChild.style.width = ch * 100 + '%';
    // title
    const T = this.titleS; let op = 0; if (T) { const e = now - T.t0; if (e < T.fi) op = e / T.fi; else if (e < T.fi + T.st) op = 1; else if (e < T.fi + T.st + T.fo) op = 1 - (e - T.fi - T.st) / T.fo; else this.titleS = null; } $('title').style.opacity = op;
    $('actionbar').style.opacity = this.abS && now - this.abS < 2000 ? 1 : this.abS && now - this.abS < 2500 ? 1 - (now - this.abS - 2000) / 500 : 0;
    // chat fade
    for (const c of $('chat').children) { const age = now - +c.dataset.t; c.style.opacity = this.chatOpen ? 1 : age < 9000 ? 1 : Math.max(0, 1 - (age - 9000) / 1000); }
    // effects
    const ef = Object.entries(me.effects).filter(([n]) => EFF[n]); const ek = ef.map(([n, e]) => n + e.amp + (e.t > 72000 ? '∞' : Math.ceil(e.t / 20))).join(); if (ek !== this._ek) { this._ek = ek; $('effects').innerHTML = ef.map(([n, e]) => '<div style="border-color:' + EFF[n][1] + '"><b style="color:' + EFF[n][1] + '">' + EFF[n][0] + (e.amp > 0 ? ' ' + roman(e.amp) : '') + '</b> ' + (e.t > 72000 ? '∞' : Math.floor(Math.ceil(e.t / 20) / 60) + ':' + String(Math.ceil(e.t / 20) % 60).padStart(2, '0')) + '</div>').join(''); }
    // info
    const ik = JOBS[me.job].name + me.deaths + me.spectator + G.match + NET.status + (me.st.grabArmed ? 1 : 0) + (me.st.spinArmed ? 1 : 0) + Math.max(0, Math.ceil(((me.prot || 0) - G.tick) / 20)); if (ik !== this._ik) { this._ik = ik; $('info').innerHTML = mcfmt('§e' + JOBS[me.job].icon + ' ' + JOBS[me.job].name + '§r  ·  사망 ' + me.deaths + (G.match ? '/10' : '') + (me.spectator ? ' §c(관전)' : '') + (me.st.grabArmed ? '  §a[그랩 폭발 준비]' : '') + (me.st.spinArmed ? '  §d[360도 회전 준비]' : '') + (G.tick < (me.prot || 0) ? '  §b[스폰 보호 ' + Math.ceil((me.prot - G.tick) / 20) + '초 · 공격하면 해제]' : '')) + '<br><small>' + esc(G.practice ? '연습 모드 (봇)' : NET.status) + '</small>'; }
    // pad prompt
    const pr = $('prompt'); if (me.onPad && !me.spectator) { const k = PAD_ORDER.indexOf(me.onPad); pr.style.display = 'block'; pr.innerHTML = me.pad === k ? mcfmt('§a✔ ' + PAD_KO[me.onPad] + ' 스폰포인트') : mcfmt((this.mobile ? '' : '§e[E] ') + '§f' + PAD_KO[me.onPad] + ' 스폰포인트 설정'); pr.onclick = () => this.setSpawn(); } else pr.style.display = 'none';
    $('tSpawn') && ($('tSpawn').style.display = me.onPad && PAD_ORDER.indexOf(me.onPad) !== me.pad ? 'flex' : 'none');
    // crosshair
    const gun = me.inv[me.sel] && ITEMS[me.inv[me.sel].id] && ITEMS[me.inv[me.sel].id].use === 'gun'; // 권총 in hand: crosshair even in PE (it fires straight where you look)
    $('cross').style.display = me.spectator || !me.alive || (this.mobile && TCTL.scheme === 'pe' && !gun) ? 'none' : 'block'; // PE touch mode: no crosshair (Bedrock)
    if (G.tick !== this._ct) { this._ct = G.tick; const on = me.spectator ? false : gun ? !!SK.aimTarget(me, 80) : !!me.findTarget(this.atkOpt()).t; $('cross').classList.toggle('on', on); }
    // dude 댄스 가사 (mine, above the actionbar)
    { const t = G.dancers.has(me.id) ? LYR.of(me.id) : null, h = t === null ? '' : LYR.html(t), el = $('lyrics'); if (el._h !== h) { el._h = h; el.innerHTML = h; } el.style.display = h ? 'block' : 'none'; }
    // tags (hp above head)
    this.tags();
    if (this.tabOpen) this.drawTab();
    if (this.debug) $('debug').textContent = `XYZ: ${(me.x + MAPDATA.origin[0]).toFixed(2)} / ${(me.y + MAPDATA.origin[1]).toFixed(2)} / ${(me.z + MAPDATA.origin[2]).toFixed(2)}  fps ${this.fps | 0}  ent ${G.players().length + G.mobs.length + G.rmobs.size}`;
  },
  tags() {
    let n = 0; const wrap = $('tags');
    for (const p of G.players()) { // job above every head; hp + bar with the 체력 표시 setting
      if (p === G.me || p.spectator) continue; const sc = p.scale || 1; const hp = p.local ? p.hp : p.hp; const mx = p.local ? p.maxHp() : p.maxHp;
      const pr = R.project(p.x, p.y + p.h + .35 * sc, p.z); if (!pr || pr.d > 48) continue;
      const glow = p.local ? p.eff('glowing') : p.glowing;
      if (!glow) { const e = G.camPos; const d = { x: p.x - e.x, y: p.y + p.h - e.y, z: p.z - e.z }; const l = Math.hypot(d.x, d.y, d.z); if (G.world.ray(e, { x: d.x / l, y: d.y / l, z: d.z / l }, l - .3)) continue; }
      let el = this.tagPool[n]; if (!el) { el = document.createElement('div'); el.className = 'tag'; el.innerHTML = '<u></u><em></em><span></span><i><b></b></i>'; wrap.appendChild(el); this.tagPool[n] = el; }
      n++; el.style.display = 'block'; el.classList.toggle('ally', G.sameTeam(p.id, G.me.id)); el.style.transform = `translate(${pr.x}px,${pr.y}px) translate(-50%,-100%) scale(${clamp(8 / pr.d, .55, 1.2)})`;
      { const t = G.dancers.has(p.id) ? LYR.of(p.id) : null, h = t === null ? '' : LYR.html(t), u = el.firstChild; if (u._h !== h) { u._h = h; u.innerHTML = h; } u.style.display = h ? '' : 'none'; } // dude 댄스 가사 above the head
      const J = JOBS[p.job], jt = J ? J.icon + ' ' + J.name : ''; const em = el.children[1]; if (em.textContent !== jt) em.textContent = jt; em.style.display = jt ? '' : 'none';
      const hs = el.children[2], hb = el.lastChild; hs.style.display = hb.style.display = this.showHp ? '' : 'none';
      hs.textContent = ((p.local ? G.tick < (p.prot || 0) : p.protF) ? '🛡 ' : '') + Math.ceil(hp) + ' ❤'; hb.firstChild.style.width = clamp(hp / mx, 0, 1) * 100 + '%';
    }
    for (let i = n; i < this.tagPool.length; i++) this.tagPool[i].style.display = 'none';
  },
  drawTab() {
    const rows = G.players().map(p => ({ n: p.name, pe: p.persona, j: p.job, d: p.deaths, k: G.kills[p.id] || 0, sp: p.spectator, me: p === G.me }));
    $('tab').innerHTML = '<div class="th">4중인격 PvP' + (G.match ? ' · 경기 중' : ' · 자유 대전') + '</div><table><tr><th>플레이어</th><th>직업</th><th>처치</th><th>사망</th></tr>' + rows.map(r => '<tr' + (r.me ? ' class="me"' : '') + '><td>' + mcfmt('§x' + PERSONAS[r.pe].color + '[' + PERSONAS[r.pe].name + '] §f') + esc(r.n) + (r.sp ? ' <small>(관전)</small>' : '') + '</td><td>' + (JOBS[r.j] ? JOBS[r.j].name : '') + '</td><td>' + r.k + '</td><td>' + r.d + '</td></tr>').join('') + '</table>';
  },
  setSpawn() { const me = G.me; if (!me || !me.onPad) return; me.pad = PAD_ORDER.indexOf(me.onPad); this.chat('§a' + PAD_KO[me.onPad] + ' 패드에 스폰포인트를 설정했습니다'); AU.sfx('levelup', null, .5); },
  atkOpt() { return this.mobile && this.assist ? this.ASSIST : {}; },
  // Bedrock-style touch attack: hit what is under the finger, else assisted crosshair attack
  tapAttack(x, y) {
    const me = G.me; if (!me) return;
    const pe = TCTL.scheme === 'pe';
    if (this.assist || pe) { const p = G.pickAt(x, y, this.ASSIST.grow) || (pe ? G.pickNear(x, y) : null); if (p) { me.attack(Object.assign({}, this.ASSIST, p)); if (p.target) this.tapMark(x, y); return; } }
    if (pe) { me.swing++; me.swingT = 6; me.attackTimer = 0; AU.sfx('swing', me, .4); return; } // PE: a tap on nothing is just a swing (no crosshair attack)
    me.attack(this.atkOpt());
  },
  tapMark(x, y) { const m = $('tapmark'); m.style.left = x + 'px'; m.style.top = y + 'px'; m.classList.remove('go'); void m.offsetWidth; m.classList.add('go'); },
  // ---------- landscape / fullscreen ----------
  toggleLand() {
    if (SITE.inFrame) { this.land = !this.land; SITE.toParent({ t: 'land', on: this.land }); $('btnLand').textContent = '📱 가로 전체화면: ' + (this.land ? '켜짐 (게임 화면이 가로로 고정돼요)' : '꺼짐'); $('tLand').classList.toggle('lock', !!this.land); this.layout(); setTimeout(() => this.layout(), 600); return; }
    const d = document, el = d.documentElement; const fs = d.fullscreenElement || d.webkitFullscreenElement;
    if (this.land) {
      this.land = false;
      SITE.landOff(); // back to portrait, out of fullscreen
      this.layout(); setTimeout(() => this.layout(), 700); return;
    }
    this.land = true;
    try {
      const rq = el.requestFullscreen || el.webkitRequestFullscreen;
      if (rq && !fs) { const p = rq.call(el, { navigationUI: 'hide' }); const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => { }); } catch (e) { } setTimeout(() => this.layout(), 300); }; if (p && p.then) p.then(lock).catch(() => { }); else lock(); }
    } catch (e) { }
    this.layout(); setTimeout(() => this.layout(), 600);
  },
  layout() {
    if (typeof DESK !== 'undefined' && DESK.active()) { DESK.sync(); return; }
    const rot = !!this.land && G.phase === 'game' && innerHeight > innerWidth;
    this.rot = rot; document.body.classList.toggle('rot', rot); document.body.classList.toggle('land', !!this.land);
    const a = $('app'); if (rot) { a.style.width = innerHeight + 'px'; a.style.height = innerWidth + 'px'; a.style.left = innerWidth + 'px'; } else { a.style.width = a.style.height = a.style.left = ''; }
    $('btnLand').textContent = '📱 가로 전체화면: ' + (this.land ? '켜짐 (게임 화면이 가로로 고정돼요)' : '꺼짐');
    $('tLand').classList.toggle('lock', !!this.land);
  },
  pt(e) { return this.rot ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }; },
  // ---------- input ----------
  applyInput(me) {
    const k = this.keys, t = this.touch, i = me.inp;
    if (this.paused || this.chatOpen) { i.f = i.s = 0; i.jump = false; i.use = false; i.sprint = false; return; }
    const kb = this.kb, bound = c => Object.values(kb).includes(c);
    i.f = ((this.kd('fwd') || k.ArrowUp) ? 1 : 0) - ((this.kd('back') || k.ArrowDown) ? 1 : 0) + t.f;
    i.s = ((this.kd('right') || k.ArrowRight) ? 1 : 0) - ((this.kd('left') || k.ArrowLeft) ? 1 : 0) + t.s;
    i.jump = this.kd('jump') || t.jump; i.sneak = this.kd('sneak') || (kb.sneak === 'ShiftLeft' && !!k.ShiftRight) || this.sneakToggle || !!t.sneak;
    i.sprint = this.kd('sprint') || (kb.sprint === 'ControlLeft' && !!k.ControlRight) || (!bound('KeyR') && !!k.KeyR) || this.sprintW || t.sprint || (!!this.sprintLock && i.f > 0);
    if (i.f <= 0) this.sprintW = false;
    i.use = this.mouse.r || t.use;
    if (t.attackHold && me.charge() >= 1 && G.tick % 2 === 0) me.attack(this.atkOpt());
  },
  bindInput() {
    const cv = $('cv');
    addEventListener('keydown', e => {
      if (this.kbWait) return;
      if (this.chatOpen) { if (e.code === 'Escape') this.closeChat(); return; }
      if (DESK.hidden()) return; // game window minimised / closed on the virtual desktop
      if (e.target.tagName === 'INPUT') return;
      if (G.phase !== 'game') return;
      if (['Tab', 'Space', 'F3', 'F5', 'ArrowUp', 'ArrowDown'].includes(e.code) || e.ctrlKey || e.metaKey) e.preventDefault();
      if (e.repeat) return;
      this.keys[e.code] = true; const me = G.me;
      if (e.code !== 'Escape' && !this.paused && this.press(e.code)) { e.preventDefault(); return; }
      if (/^Digit[1-9]$/.test(e.code) && me) { me.sel = +e.code[5] - 1; this.equip = 1; }
      if (e.code === 'F5') R.third = (R.third + 1) % 3;
      if (e.code === 'F3') { this.debug = !this.debug; $('debug').style.display = this.debug ? 'block' : 'none'; }
      if (e.code === 'Enter') { e.preventDefault(); this.openChat(); }
      if (e.code === 'Escape') { if (this.paused && this.PAGES && this.pg && this.pg !== 'main') this.mcPage(this.PAGES[this.pg].up); else if (this.paused) this.resume(); else { this.pause(); if (document.exitPointerLock) document.exitPointerLock(); } }
    });
    addEventListener('keyup', e => { if (this.kbWait) return; this.keys[e.code] = false; this.release(e.code); });
    addEventListener('blur', () => { this.keys = {}; this.mouse.l = this.mouse.r = false; });
    // ask before leaving mid-game (accidental Ctrl+W / back gesture)
    addEventListener('beforeunload', e => { if (G.phase === 'game') { e.preventDefault(); e.returnValue = ''; return ''; } });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.phase === 'game' && !this.chatOpen && !this.mobile) this.pause(); });
    cv.addEventListener('mousedown', e => {
      if (G.phase !== 'game' || this.mobile) return; AU.init();
      if (!document.pointerLockElement) { this.lock(); return; }
      const c = 'Mouse' + e.button; this.keys[c] = true; this.press(c);
    });
    addEventListener('mouseup', e => { const c = 'Mouse' + e.button; this.keys[c] = false; this.release(c); });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (!document.pointerLockElement || !G.me || this.paused) return; this.look(e.movementX, e.movementY, .0022); });
    // Ctrl+wheel / Ctrl +,-,0 would zoom the page: in game they are blocked and the wheel still scrolls the hotbar (Ctrl = sprint)
    addEventListener('wheel', e => { if (G.phase !== 'game' || !G.me) return; if (e.ctrlKey) e.preventDefault(); if (this.paused) return; G.me.sel = (G.me.sel + (e.deltaY > 0 ? 1 : 8)) % 9; this.equip = 1; }, { passive: false });
    addEventListener('keydown', e => { if (G.phase === 'game' && (e.ctrlKey || e.metaKey) && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(e.code)) e.preventDefault(); }, { capture: true });
    $('pauseBtn').onclick = () => this.pause();
    $('btnLand').onclick = () => { AU.init(); this.toggleLand(); };
    $('rotBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); if (!this.land) this.toggleLand(); else this.layout(); });
    addEventListener('resize', () => this.layout()); addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
    document.addEventListener('fullscreenchange', () => this.layout()); document.addEventListener('webkitfullscreenchange', () => this.layout());
    $('chatbar').addEventListener('submit', e => { e.preventDefault(); this.sendChat(); });
    $('chatX').addEventListener('click', e => { e.preventDefault(); this.closeChat(); });
    for (const ev of ['pointerdown', 'touchstart', 'keyup']) $('chatbar').addEventListener(ev, e => e.stopPropagation(), { passive: true });
    $('chatbar').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') this.closeChat(); });
    this.bindTouch();
  },
  look(dx, dy, k) { const me = G.me; if (!me || me.st.pulled) return; me.yaw += dx * k * this.sens; me.pitch = clamp(me.pitch + dy * k * this.sens, -Math.PI / 2 + .01, Math.PI / 2 - .01); },
  openChat() { if (NET.mode === 'off') { this.chat('§7(연습 모드에서는 채팅이 혼자 보여요)'); } this.chatOpen = true; document.body.classList.add('chatting'); $('chatbar').classList.remove('hide'); $('chatin').value = ''; try { $('chatin').focus({ preventScroll: true }); } catch (e) { $('chatin').focus(); } if (document.exitPointerLock) document.exitPointerLock(); this.keys = {}; },
  closeChat() { if (!this.chatOpen) return; this.chatOpen = false; document.body.classList.remove('chatting'); $('chatbar').classList.add('hide'); $('chatin').blur(); if (!this.mobile && G.phase === 'game') this.lock(); },
  sendChat() { if (!G.me) return this.closeChat(); const m = $('chatin').value.trim().slice(0, 120); if (m) { NET.emit({ k: 'chat', m }); this.chat('<' + G.nameOf(G.me.id) + '§f> ' + m, true); } this.closeChat(); },
  bindTouch() {
    const btn = (id, down, up) => { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); el.classList.add('on'); down && down(); el.setPointerCapture && el.setPointerCapture(e.pointerId); }); const u = e => { el.classList.remove('on'); up && up(); }; el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); };
    btn('tSpawn', () => this.setSpawn());
    const menu = $('tMenu');
    const closeMenu = () => { menu.classList.add('hide'); for (const e of TCTL.copies('more')) e.classList.remove('on'); clearTimeout(TCTL.menuT); };
    this.closeMenu = closeMenu;
    for (const el of menu.children) el.addEventListener('pointerup', () => setTimeout(closeMenu, 120));
    btn('tTab', () => { this.tabOpen = !this.tabOpen; $('tab').classList.toggle('hide', !this.tabOpen); });
    btn('tView', () => { R.third = (R.third + 1) % 3; });
    $('tChat').addEventListener('pointerdown', e => e.stopPropagation());
    $('tChat').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.openChat(); });
    btn('tLand', () => this.toggleLand());
    btn('tSwap', () => { const me = G.me; if (me) { const t = me.off; me.off = me.inv[me.sel]; me.inv[me.sel] = t; } });
    btn('tEditM', () => { this.pause(); TCTL.openEditor(); });
    TCTL.init();
  },
};
