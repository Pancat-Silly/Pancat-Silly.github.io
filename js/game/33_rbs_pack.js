// ===================== Random Block Survival: vanilla resource pack (optional, downloaded by the player) =====================
// Same sources as the 4중인격 pack (PACK.get: GitHub raw -> jsDelivr -> Mojang asset server). Stored in IndexedDB on the
// player's device under its own key. Textures overwrite atlas tiles by name; sounds replace the synthesized stand-ins.
// The original pack's own textures (lucky block "?", nether bedrock) always stay.
const RPACK = {
  has: false, on: false, data: null, busy: false, msg: '',
  KEEP: new Set(['sponge', 'nether_bedrock_rp', 'deny', 'barrier', 'bell', 'chest_front', 'chest_side', 'chest_top']),
  REN: { banner: 'white_wool', 'item/music_disc': 'item/music_disc_cat', 'item/lever': 'block/lever', 'item/tripwire_hook': 'block/tripwire_hook', 'item/ender_eye': 'item/ender_eye' },
  TINT: { grass_block_top: '#91bd59', short_grass: '#91bd59', fern: '#91bd59', tall_grass_bottom: '#91bd59', tall_grass_top: '#91bd59', sugar_cane: '#91bd59', oak_leaves: '#77ab2f', birch_leaves: '#80a755', water_still: '#3f76e4' },
  SND: { // our key -> vanilla sound events
    note: 'block.note_block.harp', toast: 'ui.toast.in', levelup: 'entity.player.levelup', anvil_use: 'block.anvil.use', anvil_land: 'block.anvil.land', bell: 'block.bell.use', fw_launch: 'entity.firework_rocket.launch', fw_blast: 'entity.firework_rocket.large_blast',
    explode: 'entity.generic.explode', chest_open: 'block.chest.open', chest_close: 'block.chest.close', gate_open: 'block.ender_chest.open', gate_close: 'block.ender_chest.close', door_open: 'block.wooden_door.open', door_close: 'block.wooden_door.close', trap_open: 'block.wooden_trapdoor.open', trap_close: 'block.wooden_trapdoor.close', fgate_open: 'block.fence_gate.open', fgate_close: 'block.fence_gate.close', lever: 'block.lever.click', button_on: 'block.wooden_button.click_on', button_off: 'block.wooden_button.click_off', sbutton_on: 'block.stone_button.click_on', sbutton_off: 'block.stone_button.click_off', plate_on: 'block.wooden_pressure_plate.click_on', plate_off: 'block.wooden_pressure_plate.click_off', gas: 'entity.zombie_villager.cure', lava: 'item.bucket.fill_lava',
    piston_out: 'block.piston.extend', piston_in: 'block.piston.contract', pop: 'entity.item.pickup', orb: 'entity.experience_orb.pickup', hurt: 'entity.player.hurt', death: 'entity.player.death', atk: 'entity.player.attack.strong', atk_crit: 'entity.player.attack.crit',
    shield: 'item.shield.block', shieldbreak: 'item.shield.break', break: 'entity.item.break', throw: 'entity.splash_potion.throw', eat: 'entity.generic.eat', burp: 'entity.player.burp', click: 'ui.button.click', drink: 'entity.generic.drink',
  },
  MATS: { stone: 'stone', wood: 'wood', gravel: 'gravel', grass: 'grass', sand: 'sand', glass: 'glass', metal: 'metal', cloth: 'wool', nether: 'netherrack', ladder: 'ladder' },
  label() { return this.busy ? (this.msg || '받는 중…') : !this.has ? '받지 않음' : this.on ? '§a켜짐 (1.21.4 바닐라)' : '§7꺼짐'; },
  async boot() { try { const d = await IDB.get('rbs_pack'); if (d && d.tex) { this.data = d; this.has = true; this.on = localStorage.getItem('rbs_pack_on') !== '0'; if (this.on) await this.apply(); } } catch (e) { } },
  click(b) { if (this.busy) return; if (!this.has || b === 2) { this.download(); return; } this.on = !this.on; try { localStorage.setItem('rbs_pack_on', this.on ? '1' : '0'); } catch (e) { } if (this.on) this.apply(); else this.off(); RUI.refresh(); },
  status(m) { this.msg = m; if (RUI.paused && RUI.pg === 'set') RUI.menuDraw(); },
  path(name) { if (this.REN[name]) { const r = this.REN[name]; return 'textures/' + (r.includes('/') ? r : 'block/' + r) + '.png'; } if (name.startsWith('item/')) return 'textures/' + name + '.png'; return 'textures/block/' + name + '.png'; },
  async download() {
    this.busy = true; RAU.init(); this.status('연결하는 중…');
    try {
      for (const k in RIT) { const I = RIT[k]; if (I.tex) RTEX.T(I.tex); } for (let i = 0; i < 10; i++) RTEX.T('destroy_stage_' + i);
      const names = [...RTEX.map.keys()].filter(n => !this.KEEP.has(n)); const tex = {}, snd = {}; let nt = 0, ns = 0; const jobs = [];
      for (const n of names) jobs.push(async () => { const d = await PACK.get(this.path(n)); if (d) { tex[n] = new Blob([d], { type: 'image/png' }); nt++; } });
      jobs.push(async () => { const d = await PACK.get('textures/entity/chest/normal.png'); if (d) tex.__chest = new Blob([d], { type: 'image/png' }); });
      jobs.push(async () => { const d = await PACK.get(this.path('item/potion_overlay')); if (d) tex['item/potion_overlay'] = new Blob([d], { type: 'image/png' }); });
      let sj = null; const sjb = await PACK.get('sounds.json'); if (sjb) try { sj = JSON.parse(new TextDecoder().decode(sjb)); } catch (e) { }
      const ev = Object.assign({}, this.SND); for (const m in this.MATS) for (const a of ['break', 'place', 'step', 'hit']) ev[a + '_' + m] = 'block.' + this.MATS[m] + '.' + a;
      for (const k in ev) { const e = sj && sj[ev[k]]; if (!e || !e.sounds) continue; const files = e.sounds.map(s => typeof s === 'string' ? s : s.type === 'event' ? null : s.name).filter(Boolean).slice(0, 3); for (const f of files) jobs.push(async () => { const d = await PACK.get('sounds/' + f.replace(/^minecraft:/, '') + '.ogg'); if (d) { (snd[k] || (snd[k] = [])).push(d); ns++; } }); }
      let done = 0, q = 0; const total = jobs.length;
      await Promise.all(Array.from({ length: 6 }, async () => { while (q < jobs.length) { const j = jobs[q++]; try { await j(); } catch (e) { } this.status('받는 중… ' + (++done) + '/' + total); } }));
      if (!nt && !ns) throw new Error('에셋 서버에 연결하지 못했어요');
      this.data = { tex, snd, at: Date.now() }; this.has = true; this.on = true; try { localStorage.setItem('rbs_pack_on', '1'); } catch (e) { } try { await IDB.set('rbs_pack', this.data); } catch (e) { }
      await this.apply(); RUI.chat('§a마인크래프트 바닐라 리소스팩을 적용했어요 (텍스처 ' + nt + '개 · 사운드 ' + ns + '개)');
    } catch (e) { RUI.chat('§c리소스팩 받기 실패: ' + (e.message || e)); }
    this.busy = false; this.status('');
  },
  async apply() {
    const T = this.data && this.data.tex; if (!T) return; const g = RTEX.g; g.imageSmoothingEnabled = false;
    if (!T['item/potion_overlay']) try { const d = await PACK.get(this.path('item/potion_overlay')); if (d) { T['item/potion_overlay'] = new Blob([d], { type: 'image/png' }); IDB.set('rbs_pack', this.data).catch(() => { }); } } catch (e) { } // packs saved before the overlay was fetched
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 16; const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false;
    for (const [name, t] of RTEX.map) {
      const b = T[name]; if (!b || this.KEEP.has(name)) continue; let img; try { img = await createImageBitmap(b); } catch (e) { continue; }
      tg.clearRect(0, 0, 16, 16); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img, 0, 0, img.width, Math.min(img.width, img.height), 0, 0, 16, 16); // animated strips: first frame
      if (this.TINT[name]) { tg.globalCompositeOperation = 'multiply'; tg.fillStyle = this.TINT[name]; tg.fillRect(0, 0, 16, 16); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(img, 0, 0, img.width, Math.min(img.width, img.height), 0, 0, 16, 16); tg.globalCompositeOperation = 'source-over'; }
      if (name === 'item/splash_potion' && T['item/potion_overlay']) try { // MC draws potions as a tinted liquid overlay under the bottle: healing = red #F82423
        const ov = await createImageBitmap(T['item/potion_overlay']); const c2 = document.createElement('canvas'); c2.width = c2.height = 16; const g2 = c2.getContext('2d'); g2.imageSmoothingEnabled = false;
        g2.drawImage(ov, 0, 0, 16, 16); g2.globalCompositeOperation = 'multiply'; g2.fillStyle = '#f82423'; g2.fillRect(0, 0, 16, 16); g2.globalCompositeOperation = 'destination-in'; g2.drawImage(ov, 0, 0, 16, 16);
        g2.globalCompositeOperation = 'source-over'; g2.drawImage(tmp, 0, 0); tg.clearRect(0, 0, 16, 16); tg.drawImage(c2, 0, 0);
      } catch (e) { }
      const [ox, oy] = RTEX.xy(t); g.clearRect(ox, oy, 16, 16); g.drawImage(tmp, ox, oy);
    }
    if (T.__chest) try { const img = await createImageBitmap(T.__chest); const k = img.width / 64; const put = (name, parts) => { const t = RTEX.T(name); const [ox, oy] = RTEX.xy(t); g.clearRect(ox, oy, 16, 16); for (const [sx, sy, w, h, dx, dy] of parts) g.drawImage(img, sx * k, sy * k, w * k, h * k, ox + dx, oy + dy, w, h); };
      put('chest_top', [[14, 0, 14, 14, 1, 1]]); put('chest_front', [[14, 14, 14, 5, 1, 2], [14, 33, 14, 10, 1, 6], [1, 1, 2, 4, 7, 4]]); put('chest_side', [[0, 14, 14, 5, 1, 2], [0, 33, 14, 10, 1, 6]]); } catch (e) { }
    RR.gfx && RR.gfx.refreshAtlas(); RUI.iconCache = {}; RUI._hs = ''; this.decode();
  },
  off() { for (const [name, t] of RTEX.map) { const [ox, oy] = RTEX.xy(t); RTEX.g.clearRect(ox, oy, 16, 16); RTEX.paint(name, t); } RR.gfx && RR.gfx.refreshAtlas(); RUI.iconCache = {}; RUI._hs = ''; RAU.pack = {}; },
  decode() { if (!this.on || !this.data || !this.data.snd || !RAU.ctx) return; for (const k in this.data.snd) { RAU.pack[k] = []; for (const ab of this.data.snd[k]) RAU.ctx.decodeAudioData(ab.slice(0)).then(b => RAU.pack[k].push(b)).catch(() => { }); } },
};
// ===================== Random Block Survival: background music (optional, downloaded by the player) =====================
// Free tracks (YouTube Audio Library + NCS), not inside the game code: the player opts in, then they are fetched from SRC
// (tried in order, needs CORS) into IndexedDB 'rbs_bgm'. Track + artist + source credits are shown on the 외부 다운로드
// screen, in chat after downloading and on 설정 → 배경음악 정보.
const YTAL = 'YouTube 오디오 보관함';
const RBGM = {
  SRC: ['rbs/music/'], // base URLs, <SRC><key>.mp3
  T: { // key: n 곡, a 원작자, use 쓰는 곳, src 출처, mb 크기, cr 원작자 표기 줄
    barge: { n: 'Barge', a: 'Gunnar Olsen', use: '인게임 (기본)', src: YTAL, mb: 2.1 },
    burner: { n: 'Burner', a: 'Gunnar Olsen', use: '인게임', src: YTAL, mb: 2.4 },
    detour: { n: 'Detour', a: 'Gunnar Olsen', use: '인게임', src: YTAL, mb: 2.1 },
    bubble: { n: 'Bubble', a: 'Raven & Kreyn', use: '데스매치', src: 'NCS (NoCopyrightSounds)', mb: 2.8, cr: ['Song: Raven & Kreyn - Bubble [NCS Release]', 'Music provided by NoCopyrightSounds', 'Free Download/Stream: https://ncs.io/bubble'] },
    sleeplessness: { n: 'Sleeplessness', a: 'The Brothers Records', use: '로비 · 놀이터', src: YTAL, mb: 2.4 },
  },
  GAME: ['barge', 'burner', 'detour'], // in-game choices (RUI.bgm); bubble = deathmatch, sleeplessness = lobby
  has: false, data: null, urls: {}, busy: false, msg: '', prog: {}, onProg: null,
  name(k) { return (this.T[k] || this.T.barge).n; },
  totalMb() { return Object.values(this.T).reduce((a, t) => a + t.mb, 0).toFixed(1); },
  credits(sep = ' / ') { return Object.values(this.T).map(t => t.n + ' – ' + t.a).join(sep); },
  // HTML list: 곡 – 원작자 · 쓰는 곳 · 출처 · 크기 (+ progress bar while downloading)
  listHTML(withProg) {
    let h = '<div class="rbgl">';
    for (const k in this.T) {
      const t = this.T[k], p = this.prog[k];
      h += '<div class="rbgi" data-bk="' + k + '"><div class="rbgt"><b>' + esc(t.n) + '</b> – ' + esc(t.a) + '<span>' + esc(t.use) + ' · ' + esc(t.src) + ' · ' + t.mb + 'MB</span></div>'
        + (t.cr ? '<small>' + t.cr.map(esc).join('<br>') + '</small>' : '')
        + (withProg ? '<div class="rbgp"><i style="width:' + Math.round((p ? p.f : 0) * 100) + '%"></i><em>' + this.progText(p) + '</em></div>' : '') + '</div>';
    }
    return h + '</div>';
  },
  progText(p) { return !p ? '대기 중' : p.st === 'ok' ? '✔ 완료' : p.st === 'fail' ? '✖ 실패' : '받는 중 ' + Math.round(p.f * 100) + '%'; },
  label() { return this.busy ? (this.msg || '받는 중…') : this.has ? '§a받음' : '받지 않음 (누르면 받기, ' + this.totalMb() + 'MB)'; },
  async boot() { try { const d = await IDB.get('rbs_bgm'); if (d && d.files && Object.keys(d.files).length) { this.data = d; this.has = true; } } catch (e) { } },
  url(k) { if (this.urls[k]) return this.urls[k]; const b = this.data && this.data.files[k]; return b ? (this.urls[k] = URL.createObjectURL(b)) : null; },
  status(m) { this.msg = m; if (RUI.paused && (RUI.pg === 'set' || RUI.pg === 'music')) RUI.menuDraw(); },
  setProg(k, f, st) { this.prog[k] = { f, st }; if (this.onProg) this.onProg(k); },
  async get(k) { // streamed so the 외부 다운로드 screen can show each track's progress
    for (const base of this.SRC) try {
      const r = await fetch(base + k + '.mp3', { mode: 'cors' }); if (!r.ok) continue;
      const len = +r.headers.get('content-length') || this.T[k].mb * 1048576; let b;
      if (r.body && r.body.getReader) { const rd = r.body.getReader(), parts = []; let got = 0; for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; this.setProg(k, Math.min(.99, got / len), 'run'); } b = new Blob(parts); }
      else b = await r.blob();
      if (b.size > 10000) return new Blob([b], { type: 'audio/mpeg' });
    } catch (e) { }
    return null;
  },
  async download() {
    if (this.busy) return; this.busy = true; this.prog = {}; this.status('연결하는 중…');
    const files = Object.assign({}, this.data && this.data.files), keys = Object.keys(this.T); let n = 0, done = 0;
    await Promise.all(keys.map(async k => { this.setProg(k, 0, 'run'); const b = await this.get(k); if (b) { files[k] = b; n++; this.setProg(k, 1, 'ok'); } else this.setProg(k, 0, 'fail'); this.status('받는 중… ' + (++done) + '/' + keys.length); }));
    if (n) {
      const playing = RAU.bgmKey, rate = RAU.bgm ? RAU.bgm.playbackRate : 1; RAU.stopBgm(); for (const k in this.urls) URL.revokeObjectURL(this.urls[k]); this.urls = {};
      this.data = { files, at: Date.now() }; this.has = true; try { await IDB.set('rbs_bgm', this.data); } catch (e) { }
      RUI.chat('§a배경음악을 받았어요 (' + n + '/' + keys.length + '곡)');
      for (const k of keys) if (files[k]) { const t = this.T[k]; RUI.chat('§7♪ ' + t.n + ' – ' + t.a + ' (' + t.use + ' · ' + t.src + ')'); }
      if (files.bubble) RUI.chat('§7Music provided by NoCopyrightSounds · ncs.io/bubble');
      if (playing === 'bubble') RAU.dmBgm(); else if (playing && playing !== 'sleeplessness') RAU.gameBgm(rate);
    } else RUI.chat('§c배경음악 받기 실패: 음악 서버에 연결하지 못했어요');
    this.busy = false; this.status(''); if (this.onProg) this.onProg(null);
  },
};
// ===================== first-run 외부 다운로드 screen =====================
// Asked once (localStorage rbs_dl_asked): background music + Minecraft resource pack, each opt-in. Both can be changed later in 설정.
// After 받기 the screen stays and shows each track's download progress (and the resource pack's); the player can start meanwhile.
const RDL = {
  need() { try { if (localStorage.getItem('rbs_dl_asked')) return false; } catch (e) { } return !(RBGM.has && RPACK.has); },
  show() {
    if (!this.need()) return; RUI.splash = true; RIN.lmb = RIN.rmb = false; if (document.pointerLockElement) document.exitPointerLock();
    const opt = (id, title, sub, extra) => '<label class="rdlo"><input type="checkbox" id="' + id + '" checked><div><b>' + title + '</b><small>' + sub + '</small></div></label>' + (extra || '');
    const el = document.createElement('div'); el.className = 'rdl'; el.id = 'rbDl';
    el.innerHTML = '<div class="rgw"><h3>📦 외부 다운로드</h3><p>게임에 들어 있지 않은 파일을 이 기기의 브라우저가 외부에서 직접 받아 저장해요.<br>받을 것을 골라 주세요 · 나중에 설정에서도 바꿀 수 있어요.</p>'
      + (RBGM.has ? '' : opt('rdlBgm', '🎵 배경음악 · ' + Object.keys(RBGM.T).length + '곡 · 약 ' + RBGM.totalMb() + 'MB', '무료 음악 (YouTube 오디오 보관함 · NCS) · 인게임 곡은 설정에서 골라요', RBGM.listHTML(false)))
      + (RPACK.has ? '' : opt('rdlPack', '🧱 마인크래프트 리소스팩', '1.21.4 바닐라 텍스처 · 사운드 (공식 미러) · 없으면 직접 만든 텍스처와 합성음을 써요'))
      + '<div class="rdlb"><button class="rbtn" data-dl="0">받지 않기</button><button class="rbtn on" data-dl="1">선택한 것 받기</button></div></div>';
    document.body.appendChild(el);
    for (const b of el.querySelectorAll('[data-dl]')) b.onclick = () => { const go = b.dataset.dl === '1', m = $('rdlBgm'), p = $('rdlPack'); this.start(go && !!m && m.checked, go && !!p && p.checked); };
  },
  start(bgm, pack) {
    try { localStorage.setItem('rbs_dl_asked', '1'); } catch (e) { } RAU.init();
    if (!bgm && !pack) { RUI.chat('§7외부 파일 없이 시작해요 · 설정에서 배경음악 · 리소스팩을 받을 수 있어요'); this.close(); return; }
    const w = $('rbDl').querySelector('.rgw');
    w.innerHTML = '<h3>📦 외부 다운로드 중…</h3><p>받는 동안에도 게임을 시작할 수 있어요 (다운로드는 계속돼요).</p>'
      + (bgm ? '<b class="rdlh">🎵 배경음악</b>' + RBGM.listHTML(true) : '')
      + (pack ? '<b class="rdlh">🧱 마인크래프트 리소스팩</b><div class="rbgp rdlpk"><i style="width:0"></i><em>대기 중</em></div>' : '')
      + '<div class="rdlb"><button class="rbtn" id="rdlGo">받으면서 시작하기</button></div>';
    $('rdlGo').onclick = () => this.close();
    const left = { bgm, pack };
    const fin = () => { if (left.bgm || left.pack) return; const g = $('rdlGo'); if (g) { g.textContent = '✔ 다 받았어요 · 시작하기'; g.classList.add('on'); } const h = w.querySelector('h3'); if (h) h.textContent = '📦 외부 다운로드 완료'; const p = w.querySelector('p'); if (p) p.textContent = '이 기기의 브라우저에 저장했어요 · 다음부터는 다시 받지 않아요.'; };
    if (bgm) {
      RBGM.onProg = k => {
        if (k === null) { left.bgm = false; RBGM.onProg = null; fin(); return; }
        const row = w.querySelector('[data-bk="' + k + '"] .rbgp'); if (!row) return; const p = RBGM.prog[k];
        row.firstChild.style.width = Math.round(p.f * 100) + '%'; row.lastChild.textContent = RBGM.progText(p); row.classList.toggle('ok', p.st === 'ok'); row.classList.toggle('bad', p.st === 'fail');
      };
      RBGM.download();
    }
    if (pack) {
      const pk = w.querySelector('.rdlpk'), st0 = RPACK.status;
      RPACK.status = function (m) {
        st0.call(RPACK, m); const mm = /(\d+)\/(\d+)/.exec(m || '');
        if (mm) pk.firstChild.style.width = Math.round(mm[1] / mm[2] * 100) + '%';
        pk.lastChild.textContent = m || (RPACK.has ? '✔ 완료' : '✖ 실패');
        if (!m) { pk.classList.add(RPACK.has ? 'ok' : 'bad'); pk.firstChild.style.width = RPACK.has ? '100%' : '0'; RPACK.status = st0; left.pack = false; fin(); }
      };
      RPACK.download();
    }
  },
  close() { const el = $('rbDl'); if (el) el.remove(); RUI.splash = false; },
};
