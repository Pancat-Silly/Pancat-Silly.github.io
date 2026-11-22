// ===================== vanilla resource pack (user-supplied, never bundled) =====================
// One button: the player's own browser fetches only the ~100 textures / sounds this game uses, straight from public
// Minecraft 1.21.4 asset mirrors (nothing is bundled in this HTML), and keeps them in IndexedDB on that device.
// Sources, tried per file in order: GitHub raw (InventivetalentDev/minecraft-assets, branch 1.21.4) -> jsDelivr mirror of the
// same repo -> for sounds, Mojang's own asset server (version manifest -> asset index -> resources.download.minecraft.net).
const PACK_SRC = ['https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/', 'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.4/assets/minecraft/'];
const PACK_MOJANG = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const PACK_BLOCKS = {
  1: 'light_gray_concrete', 2: 'gray_concrete', 3: 'white_concrete', 4: 'orange_concrete', 5: 'red_concrete', 6: 'lime_concrete', 7: 'purple_concrete', 8: 'blue_concrete',
  9: 'quartz_block_bottom', 10: 'quartz_block_bottom', 11: 'quartz_block_bottom', 12: 'quartz_block_bottom', 13: 'quartz_block_bottom', 14: 'quartz_block_bottom', 15: 'quartz_block_bottom',
  16: 'oak_planks', 17: 'oak_planks', 18: ['stripped_jungle_log', 'stripped_jungle_log_top'], 19: 'glass',
  20: 'stone_bricks', 21: 'stone_bricks', 22: 'stone_bricks', 23: 'stone_bricks', 24: 'stone_bricks', 25: 'stone_bricks', 26: 'stone_bricks',
  27: 'sandstone_top', 28: 'diorite', 29: 'diorite', 30: 'ladder', 31: 'ladder', 32: 'ladder', 33: 'ladder', 35: 'birch_trapdoor',
  37: 'smooth_stone', 38: 'powder_snow', 39: 'lava_still', 40: 'ice',
};
// our sound key -> [vanilla sound event, fallback file stems under sounds/]
const PACK_SFX = {
  anvil: ['block.anvil.land', ['random/anvil_land']], arrowhit: ['entity.arrow.hit', ['random/bowhit']], bass: ['block.note_block.bass', ['note/bass']],
  bow: ['entity.arrow.shoot', ['random/bow']], chain: ['block.chain.step', ['block/chain/step']], click: ['ui.button.click', ['random/click']],
  death: ['entity.player.death', ['damage/hit']], drink: ['entity.generic.drink', ['random/drink']], eat: ['entity.generic.eat', ['random/eat']],
  explode: ['entity.generic.explode', ['random/explode']], firework: ['item.firecharge.use', ['mob/ghast/fireball4']], fizz: ['block.fire.extinguish', ['random/fizz']],
  glass: ['block.glass.break', ['random/glass']], hat: ['block.note_block.hat', ['note/hat']], hurt: ['entity.player.hurt', ['damage/hit']],
  levelup: ['entity.player.levelup', ['random/levelup']], pop: ['entity.item.pickup', ['random/pop']], reel: ['entity.fishing_bobber.retrieve', ['entity/bobber/retrieve']],
  shield: ['item.shield.block', ['item/shield/block']], shieldbreak: ['item.shield.break', ['random/break']], smash: ['item.mace.smash_ground_heavy', ['item/mace/smash_ground_heavy']],
  spider: ['entity.spider.hurt', ['mob/spider/say']], wolfhurt: ['entity.wolf.hurt', ['mob/wolf/hurt']], splat: ['entity.slime.squish', ['mob/slime/big']],
  hit: ['entity.player.attack.strong', ['entity/player/attack/strong']], bigfall: ['entity.player.big_fall', ['damage/fallbig']], smallfall: ['entity.player.small_fall', ['damage/fallsmall']],
  atk_strong: ['entity.player.attack.strong', ['entity/player/attack/strong']], atk_weak: ['entity.player.attack.weak', ['entity/player/attack/weak']],
  atk_crit: ['entity.player.attack.crit', ['entity/player/attack/crit']], atk_kb: ['entity.player.attack.knockback', ['entity/player/attack/knockback']],
  st_stone: ['block.stone.step', ['step/stone']], st_wood: ['block.wood.step', ['step/wood']], st_snow: ['block.powder_snow.step', ['block/powder_snow/step']],
  chainplace: ['block.chain.place', ['block/chain/break']], st_ladder: ['block.ladder.step', ['step/ladder']], st_metal: ['block.chain.step', ['block/chain/step']],
};
// footstep group per block id (MC SoundType)
const STEP_OF = id => { const B = BL[id]; if (!B || !B.solid && !B.snow) return null; if (B.snow) return 'st_snow'; if (B.ladder) return 'st_ladder'; if (id >= 48) return 'st_metal'; if (id === 18 || (id >= 16 && id <= 17) || id === 35) return 'st_wood'; return 'st_stone'; };

const IDB = {
  _db: null,
  db() { return this._db || (this._db = new Promise((res, rej) => { const r = indexedDB.open('apvp4', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async op(mode, f) { const d = await this.db(); return new Promise((res, rej) => { const tx = d.transaction('kv', mode); const st = tx.objectStore('kv'); const r = f(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); },
  get(k) { return this.op('readonly', s => s.get(k)); }, set(k, v) { return this.op('readwrite', s => s.put(v, k)); }, del(k) { return this.op('readwrite', s => s.delete(k)); },
};

const PACK = {
  art: {}, on: false, has: false, data: null, bufs: {}, orig: null, busy: false,
  async boot() {
    try { const d = await IDB.get('pack'); if (d && d.tex) { this.data = d; this.has = true; this.on = localStorage.getItem('apvp_pack_on') !== '0'; if (this.on) await this.apply(); } } catch (e) { }
    UI.packStatus();
  },
  async fetchBuf(url) { try { const r = await fetch(url, { mode: 'cors', cache: 'force-cache' }); if (!r.ok) return null; return await r.arrayBuffer(); } catch (e) { return null; } },
  async mojangIndex() { // path -> object URL on Mojang's asset server (sounds only live there)
    if (this._mj !== undefined) return this._mj; this._mj = null;
    try {
      const m = await (await fetch(PACK_MOJANG)).json(); const v = m.versions.find(v => v.id === '1.21.4'); const vj = await (await fetch(v.url)).json(); const ai = await (await fetch(vj.assetIndex.url)).json();
      const o = {}; for (const k in ai.objects) if (k.startsWith('minecraft/')) { const h = ai.objects[k].hash; o[k.slice(10)] = 'https://resources.download.minecraft.net/' + h.slice(0, 2) + '/' + h; } this._mj = o;
    } catch (e) { }
    return this._mj;
  },
  async get(path) {
    for (const b of PACK_SRC) { const d = await this.fetchBuf(b + path); if (d && d.byteLength) return d; }
    if (path.startsWith('sounds')) { const mj = await this.mojangIndex(); if (mj && mj[path]) { const d = await this.fetchBuf(mj[path]); if (d) return d; } }
    return null;
  },
  async download() {
    if (this.busy) return; this.busy = true; AU.init(); UI.packStatus('마인크래프트 에셋 서버에 연결하는 중…');
    try {
      const tex = {}, snd = {}; let nt = 0, ns = 0;
      const names = [...new Set(Object.values(PACK_BLOCKS).flatMap(v => [].concat(v)))];
      let sj = null; const sjb = await this.get('sounds.json'); if (sjb) try { sj = JSON.parse(new TextDecoder().decode(sjb)); } catch (e) { }
      const jobs = [];
      for (const n of names) jobs.push(async () => { const d = await this.get('textures/block/' + n + '.png'); if (d) { tex[n] = new Blob([d], { type: 'image/png' }); nt++; } });
      const itex = {}; for (const pth of ITEM_TEX_PATHS()) jobs.push(async () => { const d = await this.get('textures/' + pth + '.png'); if (d) { itex[pth] = new Blob([d], { type: 'image/png' }); nt++; } });
      for (const k in PACK_SFX) {
        const [ev, stems] = PACK_SFX[k]; let L = [];
        const e = sj && sj[ev]; if (e && e.sounds) for (const s of e.sounds) { const nm = typeof s === 'string' ? s : (s.type === 'event' ? null : s.name); if (nm) L.push('sounds/' + nm.replace(/^minecraft:/, '') + '.ogg'); }
        if (!L.length) for (const st of stems) { L.push('sounds/' + st + '.ogg'); for (let i = 1; i <= 4; i++) L.push('sounds/' + st + i + '.ogg'); }
        for (const f of L.slice(0, 6)) jobs.push(async () => { const d = await this.get(f); if (d) { (snd[k] || (snd[k] = [])).push(d); ns++; } });
      }
      let done = 0; const total = jobs.length; let q = 0;
      await Promise.all(Array.from({ length: 6 }, async () => { while (q < jobs.length) { const j = jobs[q++]; await j(); UI.packStatus('받는 중… ' + (++done) + '/' + total); } }));
      if (!nt && !ns) throw new Error('에셋 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요');
      this.data = { tex, itex, snd, name: '1.21.4 바닐라', nt, ns, at: Date.now() }; this.has = true;
      try { await IDB.set('pack', this.data); } catch (e) { }
      this.on = true; try { localStorage.setItem('apvp_pack_on', '1'); } catch (e) { }
      this.bufs = {}; this.slots = null; await this.apply(); UI.packStatus();
    } catch (e) { UI.packStatus('적용 실패: ' + (e.message || e)); }
    this.busy = false;
  },
  // textures that items added later need (dev-tool / uploaded jobs, new native items) but the saved pack doesn't have yet:
  // fetched once on demand, saved with the pack, then the art is rebuilt
  async ensure() {
    if (!this.has || !this.on || !this.data || this._ens) return; this.tried = this.tried || new Set();
    const T = this.data.itex || (this.data.itex = {}); const miss = ITEM_TEX_PATHS().filter(p => !T[p] && !this.tried.has(p));
    const texOf = A => A.cube ? A.cube : A.l.map(l => l[0]); const stale = () => Object.keys(ITEM_ART).some(id => !this.art[id] && texOf(ITEM_ART[id]).every(p => T[p]));
    if (!miss.length) { if (stale()) await this.apply(); return; }
    this._ens = true; let n = 0;
    try { await Promise.all(miss.map(async p => { this.tried.add(p); try { const d = await this.get('textures/' + p + '.png'); if (d) { T[p] = new Blob([d], { type: 'image/png' }); n++; } } catch (e) { } }));
      if (n) { try { await IDB.set('pack', this.data); } catch (e) { } } if (n || stale()) await this.apply();
      if (DEV.on) DEV.log(n === miss.length ? 'ok' : 'warn', '리소스팩: 새 아이템 텍스처 ' + n + '/' + miss.length + '개 받음' + (n < miss.length ? ' (없는 이름: ' + miss.filter(p => !T[p]).join(', ') + ')' : ''));
    } finally { this._ens = false; }
  },
  async apply() {
    if (!this.data) return; const gfx = R.gfx; if (!gfx || !gfx.atlasCv) return;
    const g = gfx.atlasCv.getContext('2d'); const slot = {}; let next = 64;
    for (const n in this.data.tex) {
      try { const img = await createImageBitmap(this.data.tex[n]); const s = next++; slot[n] = s; const w = img.width, h = Math.min(img.height, img.width); g.clearRect((s % ATL) * TS, Math.floor(s / ATL) * TS, TS, TS); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, w, h, (s % ATL) * TS, Math.floor(s / ATL) * TS, TS, TS); } catch (e) { }
    }
    this.art = {}; try { next = await this.buildArt(g, next); } catch (e) { console.error(e); }
    gfx.refreshAtlas();
    if (!this.orig) { this.orig = {}; for (const id in PACK_BLOCKS) { const B = BL[id]; this.orig[id] = { tile: B.tile, tileTop: B.tileTop, col: B.col }; } }
    for (const id in PACK_BLOCKS) { const v = [].concat(PACK_BLOCKS[id]); const B = BL[id]; if (slot[v[0]] === undefined) continue; B.tile = slot[v[0]]; if (v[1] && slot[v[1]] !== undefined) B.tileTop = slot[v[1]]; B.col = [1, 1, 1]; }
    this.remesh(); await this.decode(); setTimeout(() => this.ensure(), 500);
  },
  async buildArt(g, next) {
    const T = this.data.itex || {}; const img = {}; for (const k in T) try { img[k] = await createImageBitmap(T[k]); } catch (e) { }
    const px = (bm) => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(bm, 0, 0, bm.width, Math.min(bm.width, bm.height), 0, 0, 16, 16); return x.getImageData(0, 0, 16, 16).data; };
    const slotOf = {}; const put = (k) => { if (slotOf[k] !== undefined || !img[k]) return slotOf[k]; const s = next++; const bm = img[k]; g.clearRect((s % ATL) * TS, Math.floor(s / ATL) * TS, TS, TS); g.drawImage(bm, 0, 0, bm.width, Math.min(bm.width, bm.height), (s % ATL) * TS, Math.floor(s / ATL) * TS, TS, TS); return slotOf[k] = s; };
    for (const id in ITEM_ART) {
      const A = ITEM_ART[id];
      if (A.cube) { // isometric icon + atlas tiles for the held cube
        const [sd, tp] = A.cube; if (!img[sd] || !img[tp]) continue;
        const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        const face = (bm, m, dark) => { x.setTransform(...m); x.drawImage(bm, 0, 0, bm.width, Math.min(bm.width, bm.height), 0, 0, 16, 16); if (dark) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(0,0,0,' + dark + ')'; x.fillRect(0, 0, 16, 16); x.globalCompositeOperation = 'source-over'; } };
        face(img[sd], [1, .5, 0, 1, 0, 8], .2); face(img[sd], [1, -.5, 0, 1, 16, 16], .4); face(img[tp], [1, .5, -1, .5, 16, 0], 0); x.setTransform(1, 0, 0, 1, 0, 0);
        this.art[id] = { icon: c.toDataURL(), cube: [put(sd), put(tp)] }; continue;
      }
      if (!A.l.every(l => img[l[0]])) continue;
      const out = new Uint8ClampedArray(16 * 16 * 4);
      for (const [k, tint] of A.l) { const d = px(img[k]); const tr = tint ? [(tint >> 16 & 255) / 255, (tint >> 8 & 255) / 255, (tint & 255) / 255] : [1, 1, 1];
        for (let i = 0; i < 256; i++) { const a = d[i * 4 + 3] / 255; if (a <= 0) continue; for (let c = 0; c < 3; c++) out[i * 4 + c] = d[i * 4 + c] * tr[c] * a + out[i * 4 + c] * (1 - a); out[i * 4 + 3] = Math.max(out[i * 4 + 3], d[i * 4 + 3]); } }
      const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').putImageData(new ImageData(out, 16, 16), 0, 0);
      this.art[id] = { icon: c.toDataURL(), h: !!A.h, runs: ART.runsOf((x, y) => { const i = (y * 16 + x) * 4; return out[i + 3] > 100 ? [out[i], out[i + 1], out[i + 2]] : null; }, 16, 16) };
    }
    return next;
  },
  unapply() {
    if (this.orig) for (const id in this.orig) { const B = BL[id], o = this.orig[id]; B.tile = o.tile; B.col = o.col; if (o.tileTop === undefined) delete B.tileTop; else B.tileTop = o.tileTop; }
    this.remesh();
  },
  remesh() { const W = G.world; if (W) for (let i = 0; i < W.cx * W.cy * W.cz; i++) W.dirty.add(i); },
  async decode() {
    if (!AU.ctx || !this.data || !this.on) return;
    for (const k in this.data.snd) { if (this.bufs[k]) continue; this.bufs[k] = []; for (const ab of this.data.snd[k]) { try { this.bufs[k].push(await AU.ctx.decodeAudioData(ab.slice(0))); } catch (e) { } } }
  },
  async setOn(v) { this.on = !!v && this.has; try { localStorage.setItem('apvp_pack_on', this.on ? '1' : '0'); } catch (e) { } if (this.on) await this.apply(); else this.unapply(); UI.packStatus(); },
  async clear() { this.unapply(); this.on = false; this.has = false; this.data = null; this.bufs = {}; try { await IDB.del('pack'); } catch (e) { } UI.packStatus(); },
  // returns true when a vanilla sound played (then the synthesized one is skipped)
  play(kind, pos, vol, pitch) {
    if (!this.on || !AU.ctx) return false; const L = this.bufs[kind]; if (!L || !L.length) return false;
    const g0 = AU.gainFor(pos, vol, 16); if (g0 <= 0.01) return true;
    const c = AU.ctx, s = c.createBufferSource(); s.buffer = L[Math.random() * L.length | 0]; s.playbackRate.value = pitch * (kind.startsWith('st_') || kind === 'hurt' || kind === 'spider' || kind === 'wolfhurt' ? .9 + Math.random() * .2 : 1);
    const g = c.createGain(); g.gain.value = g0; s.connect(g); g.connect(AU.sfxBus || AU.master); s.start(); return true;
  },
};

// ===================== item art: original item models (from the server's /give commands) =====================
// l: texture layers [path, tint] (bottom first), h: handheld (held diagonally like tools), cube: [side, top] block item
const POT = (c, b = 'item/potion') => ({ l: [['item/potion_overlay', c], [b]] });
const ITEM_ART = {
  breeze_rod: { l: [['item/breeze_rod']], h: 1 }, rush: { l: [['item/light_blue_dye']] }, baton: { l: [['item/chain']] }, colony: { l: [['block/frogspawn']] }, egg: { l: [['item/turtle_egg']] },
  frost: { l: [['item/diamond_sword']], h: 1 }, stone_sword: { l: [['item/stone_sword']], h: 1 }, icejail: { cube: ['block/blue_ice', 'block/blue_ice'] }, iron_sword: { l: [['item/iron_sword']], h: 1 }, bow: { l: [['item/bow']], h: 1 }, arrow: { l: [['item/arrow']] },
  luckybox: { l: [['item/honeycomb']] }, baghak: { l: [['item/filled_map']] }, pot_res: POT(0x9146F0), pot_spd: POT(0x33EBFF), dia_sword: { l: [['item/diamond_sword']], h: 1 },
  create: { cube: ['block/jukebox_side', 'block/jukebox_top'] }, wait: { l: [['item/music_disc_wait']] }, study: { l: [['item/music_disc_chirp']] }, v4: { l: [['item/cooked_cod']] }, runsuno: { l: [['item/music_disc_pigstep']] },
  stick_mace: { l: [['item/mace']], h: 1 }, grab: { l: [['item/tripwire_hook']] }, grabex: { cube: ['block/tnt_side', 'block/tnt_top'] },
  slime_axe: { l: [['item/stone_axe']], h: 1 }, cutter: { cube: ['block/stonecutter_side', 'block/stonecutter_top'] }, slimeball: { l: [['item/slime_ball']] },
  hammer: { l: [['item/mace']], h: 1 }, drone: { l: [['item/firework_rocket']] }, destroy: { cube: ['block/tnt_side', 'block/tnt_top'] }, spinpot: POT(0xA9656A, 'item/splash_potion'),
  mace: { l: [['item/mace']], h: 1 }, rodwood: { l: [['item/fishing_rod']], h: 1 }, dance: { l: [['item/music_disc_cat']] }, dude_bullet: { l: [['item/gold_nugget']] }, crate: { cube: ['block/stripped_birch_log', 'block/stripped_birch_log_top'] },
  pot_heal: POT(0xF82423), pot_turtle: POT(0x8B71A0), pot_fire: POT(0xFF9900), pot_swift: POT(0x33EBFF), aglet: { l: [['item/yellow_candle']] },
  boots: { l: [['item/leather_boots', 0xA06540], ['item/leather_boots_overlay']] }, fish: { l: [['item/tropical_fish']] },
  chang: { l: [['item/ghast_tear']] }, gather: { l: [['item/ender_eye']] }, bdash: { l: [['item/feather']] }, squid: { l: [['item/ink_sac']] }, harder: { l: [['item/blaze_powder']] },
  _bow0: { l: [['item/bow_pulling_0']], h: 1 }, _bow1: { l: [['item/bow_pulling_1']], h: 1 }, _bow2: { l: [['item/bow_pulling_2']], h: 1 },
  ai_prompt: { l: [['item/amethyst_shard']], h: 1 }, ai_glasses: { l: [['item/spyglass']] }, big_data: { l: [['item/recovery_compass_00']] },
  sr_sword: { l: [['item/iron_sword']], h: 1 }, sr_pig: { l: [['item/porkchop']] }, sr_laser: { l: [['item/amethyst_shard']] }, sr_domain: { l: [['item/nether_star']] },
  sstaff: { l: [['item/blaze_rod']], h: 1 }, dogs: { l: [['item/bone']] }, fangl: { l: [['item/totem_of_undying']] }, rzone: { l: [['item/glowstone_dust']] }, fangc: { l: [['item/echo_shard']] }, drug: POT(0x8932B8),
};
const ITEM_TEX_PATHS = () => [...new Set(Object.values(ITEM_ART).flatMap(a => a.cube ? a.cube : a.l.map(l => l[0])).concat(['block/fire_0']))]; // + the burning-screen fire strip (UI.fireOv)
// 360's 3 / 6 / 0 are white banners with blue banner patterns (applied in order) - drawn here, no texture needed
const BANNER_PAT = {
  rod0: ['stripe_right', 'stripe_left', 'stripe_bottom', 'stripe_top', '!border'],
  rod6: ['stripe_right', '!half_horizontal', 'stripe_left', 'stripe_bottom', 'stripe_middle', '!border'],
  xbow3: ['stripe_middle', 'stripe_top', 'stripe_bottom', 'stripe_right', '!border'],
};
function bannerPixels(id) { // 20 x 40, rows of [r,g,b]
  const W = [249, 255, 254], B = [60, 68, 170]; const P = Array.from({ length: 40 }, () => Array.from({ length: 20 }, () => W));
  const fill = (f, c) => { for (let y = 0; y < 40; y++) for (let x = 0; x < 20; x++) if (f(x, y)) P[y][x] = c; };
  const S = { stripe_left: (x) => x < 6, stripe_right: (x) => x >= 14, stripe_top: (x, y) => y < 10, stripe_bottom: (x, y) => y >= 30, stripe_middle: (x, y) => y >= 16 && y < 24, half_horizontal: (x, y) => y < 20, border: (x, y) => x < 2 || x >= 18 || y < 2 || y >= 38 };
  for (const p of BANNER_PAT[id]) { const white = p[0] === '!'; fill(S[white ? p.slice(1) : p], white ? W : B); }
  return P;
}
const ART = {
  cache: {}, // id -> { icon: dataURL, runs: [[x0,x1,y,col]], h, cube: [tileSide, tileTop], w, hgt, banner }
  runsOf(get, w, h) { const R = []; for (let y = 0; y < h; y++) { let x = 0; while (x < w) { const c = get(x, y); if (!c) { x++; continue; } let x1 = x + 1; while (x1 < w) { const d = get(x1, y); if (!d || d[0] !== c[0] || d[1] !== c[1] || d[2] !== c[2]) break; x1++; } R.push([x, x1, y, [c[0] / 255, c[1] / 255, c[2] / 255]]); x = x1; } } return R; },
  banner(id) {
    if (this.cache[id]) return this.cache[id];
    const P = bannerPixels(id); const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; const g = cv.getContext('2d');
    for (let y = 0; y < 40; y++) for (let x = 0; x < 20; x++) { const c = P[y][x]; g.fillStyle = 'rgb(' + c + ')'; g.fillRect(10 + x, y, 1, 1); }
    return this.cache[id] = { icon: cv.toDataURL(), runs: this.runsOf((x, y) => P[y][x], 20, 40), banner: 1 };
  },
  // hand-drawn 16x16 sprites for items vanilla MC has no texture for (권총) - used only while the pack is on, like other item art
  PIX: {
    pistol: { P: { K: [38, 38, 44], D: [66, 66, 74], M: [104, 104, 114], L: [150, 150, 162], B: [112, 74, 42], b: [72, 46, 26] }, S: [
      '................', '................', '................', '................',
      '..KKKKKKKKKKKKK.', '.KLLLLLLLLLLLLMK', '.KMMMMMMMMMMMMDK', '.KDDDDDDDDKKKKK.',
      '..KDDBBKDDK.....', '..KBBbKK.KK.....', '..KBBbK.........', '.KBBbK..........',
      '.KBBbK..........', '.KbbbK..........', '..KKK...........', '................'] },
  },
  pix(id) {
    if (this.cache[id]) return this.cache[id]; const { P, S } = this.PIX[id], at = (x, y) => P[S[y][x]] || null;
    const cv = document.createElement('canvas'); cv.width = cv.height = 16; const g = cv.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = at(x, y); if (c) { g.fillStyle = 'rgb(' + c + ')'; g.fillRect(x, y, 1, 1); } }
    return this.cache[id] = { icon: cv.toDataURL(), runs: this.runsOf(at, 16, 16) };
  },
  get(id) { if (BANNER_PAT[id]) return this.banner(id); if (!PACK.on) return null; return PACK.art[id] || (this.PIX[id] ? this.pix(id) : null); },
  iconHTML(id) { const D = ITEMS[id]; if (!D) return ''; const a = this.get(id); return a ? '<img src="' + a.icon + '" style="width:1.6em;height:1.6em;image-rendering:pixelated;vertical-align:middle" alt="">' : esc(D.icon); },
};
