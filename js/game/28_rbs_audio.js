// ===================== Random Block Survival: audio =====================
// Music: free tracks from the YouTube Audio Library. Not bundled: the player opts in on the first-run 외부 다운로드 screen
//   (RDL, 33_rbs_pack.js) and RBGM downloads them into IndexedDB ('rbs_bgm'). Without them the game runs silent (volume 0.5, loop).
//   Game BGM by player setting RUI.bgm: Barge (default) / Burner / Detour / Getdown. At 1:30 left: stop -> sfx_hurry -> title ->
//   2 s later the same BGM again at pitch 1.5. Deathmatch: Bubble, always, starting at 0:32 with a fade-in (loops back to 0:32).
// Effects: the pack's custom sfx (embedded). Minecraft's own sounds are NOT bundled: with the vanilla resource pack
//   downloaded by the player they come from there, otherwise short synthesized stand-ins are used.
const RAU = {
  ctx: null, master: null, buf: {}, pack: {}, bgm: null, bgmKey: '', fadeK: 1,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; try { this.ctx = new AC(); } catch (e) { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = RUI.vol; this.master.connect(this.ctx.destination);
    for (const k in RB_SFX) sndBytes(RB_SFX[k]).then(a => this.ctx.decodeAudioData(a)).then(b => this.buf[k] = b).catch(() => { }); // sounds/rbs/*.mp3
    RPACK.decode();
  },
  setVol() { if (this.master) this.master.gain.value = RUI.vol; if (this.bgm) this.bgm.volume = .5 * RUI.mvol * (this.fadeK ?? 1); },
  src(buf, vol = 1, rate = 1) { if (!this.ctx || !buf) return; const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(this.master); s.start(); return s; },
  // custom pack sfx (sfx_hurry, sfx_rare, sfx_win_*...). gated = only when the player's 효과음 setting (sef) is on
  sfx(k, gated) { if (gated && !RUI.sfxOn) return; this.init(); if (this.buf[k]) this.src(this.buf[k], 1); else this.synth('toast', 1); },
  // vanilla-style sound: pack sample if downloaded, else synth
  play(k, pitch = 1, gated, vol = 1) { if (gated && !RUI.sfxOn) return; if (!this.ctx) return;
    if (RUI.sndLim) { const n = performance.now(), q = this._rl || (this._rl = {}), r = q[k]; if (r && n - r.t < 80) { if (r.n >= 3) return; r.n++; } else q[k] = { t: n, n: 1 }; } /* setting 같은 소리 제한 (default off): at most 3 of the same sound per 80 ms */ const L = this.pack[k]; if (L && L.length) { this.src(L[Math.floor(Math.random() * L.length)], vol, pitch); return; } this.synth(k, pitch, vol); },
  dist(p) { const c = RR.cam ? RR.cam.eye : p; const d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z); return d > 16 ? 0 : 1 - d / 18; },
  at(k, p, pitch) { const v = p === RG.me ? 1 : this.dist(p); if (v > 0) this.play(k, pitch || (.9 + Math.random() * .2), false, v); },
  blk(kind, mat, p) { const v = this.dist(p); if (v > 0) this.play(kind + '_' + (mat || 'stone'), kind === 'hit' ? .5 : .8 + Math.random() * .1, false, v * (kind === 'hit' ? .3 : .9)); },
  step(mat, p) { const v = p === RG.me ? .3 : this.dist(p) * .3; if (v > 0) this.play('step_' + (mat || 'stone'), 1, false, v); },
  note(pitch) { this.play('note', pitch, false, 1); },
  music(key, rate = 1, from = 0, fade = 0) {
    if (!RUI.musicOn || !key) return; this.stopBgm(); const url = RBGM.url(key); if (!url) return;
    const a = new Audio(); a.src = url; a.loop = !from; a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; a.playbackRate = rate;
    this.fadeK = fade ? 0 : 1; a.volume = .5 * RUI.mvol * this.fadeK;
    const go = () => { try { if (from) a.currentTime = from; } catch (e) { } const p = a.play(); if (p && p.catch) p.catch(() => { }); };
    if (from) { a.addEventListener('loadedmetadata', go, { once: true }); a.onended = () => { if (this.bgm === a) go(); }; } else go(); // starts mid-song: also loops back to that point
    if (fade) { const t0 = performance.now(); const f = () => { if (this.bgm !== a) return; this.fadeK = Math.min(1, (performance.now() - t0) / (fade * 1000)); a.volume = .5 * RUI.mvol * this.fadeK; if (this.fadeK < 1) setTimeout(f, 50); }; setTimeout(f, 50); }
    this.bgm = a; this.bgmKey = key;
  },
  gameBgm(rate) { const k = RBGM.GAME.includes(RUI.bgm) ? RUI.bgm : 'barge'; this.music(k, rate); },
  dmBgm() { this.music('bubble', 1, 32, 4); }, // 데스매치: Bubble from 0:32, 4 s fade-in
  stopBgm() { if (this.bgm) { try { this.bgm.onended = null; this.bgm.pause(); this.bgm.removeAttribute('src'); this.bgm.load(); } catch (e) { } this.bgm = null; this.bgmKey = ''; } },
  lobbyMusic() { return; }, // lobby music (Sleeplessness - The Brothers Records) stays off like the original
  lobbyMusic() { return; if (RUI.lobbyMusic && RUI.musicOn && !this.bgm && RG.gs.ph === 'lobby') this.music('bgm_sleeplessness'); if ((!RUI.lobbyMusic || RG.gs.ph !== 'lobby') && this.bgmKey === 'bgm_sleeplessness') this.stopBgm(); },
  // ---------- synthesized stand-ins (used without the vanilla pack) ----------
  noise(dur) { const n = Math.floor(this.ctx.sampleRate * dur), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; },
  tone(type, f0, f1, dur, vol, t0 = 0) { const c = this.ctx, t = c.currentTime + t0; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02); },
  nz(dur, vol, type, freq, q = 1, t0 = 0) { const c = this.ctx, t = c.currentTime + t0; const s = c.createBufferSource(); s.buffer = this._nb || (this._nb = this.noise(1)); const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .02); },
  MAT: { stone: [900, 2], wood: [420, 3], gravel: [1600, .7], grass: [2200, .5], sand: [3000, .4], glass: [3500, 4], metal: [1400, 8], cloth: [1200, .3], nether: [700, 1.5], ladder: [500, 3] },
  synth(k, p = 1, v = 1) {
    if (!this.ctx) return; const m = k.match(/^(break|place|hit|step)_(\w+)$/);
    if (m) { const [f, q] = this.MAT[m[2]] || this.MAT.stone; const d = m[1] === 'break' ? .18 : m[1] === 'place' ? .12 : m[1] === 'step' ? .06 : .05; this.nz(d, .5 * v, 'bandpass', f * p, q); if (m[2] === 'glass' && m[1] === 'break') { this.tone('triangle', 2400, 1800, .25, .15 * v); this.tone('triangle', 3100, 2600, .2, .1 * v, .03); } return; }
    switch (k) {
      case 'note': this.tone('triangle', 370 * p, 0, .5, .35 * v); this.tone('sine', 740 * p, 0, .25, .1 * v); break;
      case 'toast': this.tone('sine', 880 * p, 0, .18, .25); this.tone('sine', 1320 * p, 0, .3, .2, .1); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, 0, .2, .08, i * .09)); break;
      case 'anvil_use': case 'anvil_land': this.tone('square', 220, 140, .25, .25); this.nz(.3, .4, 'bandpass', 2500, 6); this.tone('triangle', 1650, 1600, .5, .12); break;
      case 'bell': [1, 2.4, 3.9].forEach((h, i) => this.tone('sine', 520 * h, 0, 1.4 - i * .3, .22 / (i + 1))); break;
      case 'fw_launch': this.nz(.5, .25, 'highpass', 1500); this.tone('sine', 300, 900, .4, .06); break;
      case 'fw_blast': this.nz(.7, .5, 'lowpass', 900); this.nz(.4, .2, 'highpass', 3000, 1, .05); break;
      case 'explode': this.nz(1.2, .9, 'lowpass', 500); this.tone('sine', 90, 40, .8, .5); break;
      case 'chest_open': case 'gate_open': this.tone('sawtooth', 160, 110, .35, .12); this.nz(.3, .2, 'bandpass', 500, 2); break;
      case 'chest_close': case 'gate_close': this.nz(.12, .45, 'lowpass', 400); this.tone('sine', 120, 80, .12, .3); break;
      case 'gas': this.tone('sawtooth', 70, 50, 1.2, .2); this.nz(1.2, .2, 'lowpass', 300); break;
      case 'lava': for (let i = 0; i < 6; i++) this.tone('sine', 180 + Math.random() * 200, 80, .15, .12, i * .1); break;
      case 'piston_out': this.nz(.08, .4, 'bandpass', 1200, 2); this.tone('square', 300, 180, .1, .1); break;
      case 'piston_in': this.nz(.08, .4, 'bandpass', 800, 2); this.tone('square', 180, 300, .1, .1); break;
      case 'pop': this.tone('sine', 700 * p, 1300 * p, .07, .2 * v); break;
      case 'orb': this.tone('sine', 1400 + Math.random() * 600, 2200, .08, .15 * v); break;
      case 'hurt': this.nz(.12, .5 * v, 'lowpass', 900); this.tone('square', 200 * p, 120, .12, .12 * v); break;
      case 'death': this.tone('square', 260, 60, .6, .2 * v); break;
      case 'atk': this.nz(.07, .3 * v, 'bandpass', 1800, 1); break; case 'atk_crit': this.nz(.1, .4 * v, 'highpass', 2500); this.tone('square', 900, 600, .08, .08 * v); break;
      case 'shield': this.nz(.1, .5 * v, 'lowpass', 600); this.tone('sine', 160, 100, .12, .3 * v); break; case 'shieldbreak': case 'break': this.nz(.25, .5 * v, 'bandpass', 2000, 3); break;
      case 'throw': this.nz(.15, .25 * v, 'bandpass', 1200, .7); break; case 'eat': this.nz(.08, .35 * v, 'bandpass', 900 + Math.random() * 600, 1.5); break; case 'burp': this.tone('sawtooth', 110, 80, .3, .15); break;
      case 'click': this.tone('square', 1200, 0, .03, .1); break;
      case 'door_open': case 'door_close': case 'trap_open': case 'trap_close': case 'fgate_open': case 'fgate_close': this.nz(.12, .45 * v, 'bandpass', k.endsWith('open') ? 700 : 450, 2); this.tone('square', k.endsWith('open') ? 220 : 160, 90, .08, .06 * v); break;
      case 'lever': case 'button_on': case 'sbutton_on': case 'plate_on': this.tone('square', 900 * p, 0, .025, .12 * v); break; case 'button_off': case 'sbutton_off': case 'plate_off': this.tone('square', 650 * p, 0, .025, .1 * v); break; case 'drink': this.tone('sine', 400, 300, .15, .15); break;
      default: this.tone('sine', 600 * p, 0, .08, .1 * v);
    }
  },
};
