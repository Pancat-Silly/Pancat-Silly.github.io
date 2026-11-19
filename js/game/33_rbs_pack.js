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
  click(b) { if (this.busy) return; if (!this.has || b === 2) { this.download(); return; } this.on = !this.on; try { localStorage.setItem('rbs_pack_on', this.on ? '1' : '0'); } catch (e) { } if (this.on) this.apply(); else this.off(); RUI.render(); },
  status(m) { this.msg = m; if (RUI.gui && RUI.gui.type === 'settings') RUI.render(); },
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
