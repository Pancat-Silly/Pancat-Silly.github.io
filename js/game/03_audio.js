// ===================== audio =====================
const AU = {
  ctx: null, buf: {}, master: null, vol: 0.8, loops: {}, last: {},
  stop(name) { const s = this.last[name]; if (s) { try { s.stop(); } catch (e) { } this.last[name] = null; } },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    const nb = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    setTimeout(() => { PACK.decode(); MOD.decodeAll(); }, 0);
    for (const k in SOUNDS) sndBytes(SOUNDS[k]).then(a => this.ctx.decodeAudioData(a)).then(b => { this.buf[k] = b; }).catch(() => { }); // sounds/apvp/*.mp3
  },
  gainFor(pos, vol = 1, range = 16) {
    if (!pos || !G.me) return vol; const e = G.camPos || G.me; const d = dist3(pos, e); return vol * clamp(1 - d / (range * Math.max(1, vol)), 0, 1);
  },
  // custom voice line
  play(name, opt = {}) {
    if (!this.ctx) return null; const b = this.buf[name]; if (!b) return null;
    const g = this.gainFor(opt.pos, opt.vol || 1, opt.range || 24); if (g <= 0.01) return null;
    const s = this.ctx.createBufferSource(); s.buffer = b; if (opt.rate) s.playbackRate.value = opt.rate;
    const gn = this.ctx.createGain(); gn.gain.value = g * (opt.gain || 1); s.connect(gn); gn.connect(this.master); s.loop = !!opt.loop; s.start(); this.last[name] = s; return s;
  },
  loop(name, on) { if (on) { if (!this.loops[name]) this.loops[name] = this.play(name, { loop: true }); } else if (this.loops[name]) { try { this.loops[name].stop(); } catch (e) { } this.loops[name] = null; } },
  stopAll(name) { this.loop(name, false); },
  // positional seamless loops, refreshed every frame (distance gain + stereo pan); anything not refreshed fades out
  pl: {}, plF: 0,
  posLoop(key, name, pos, range = 20, vol = 1) {
    if (!this.ctx) return; const c = this.ctx; let L = this.pl[key];
    if (!L) {
      const b = this.buf[name]; if (!b) return;
      const s = c.createBufferSource(); s.buffer = b; s.loop = true; const g = c.createGain(); g.gain.value = 0; s.connect(g);
      let pn = null; if (c.createStereoPanner) { pn = c.createStereoPanner(); g.connect(pn); pn.connect(this.master); } else g.connect(this.master);
      s.start(); L = this.pl[key] = { s, g, pn };
    }
    L.f = this.plF + 1; const t = c.currentTime;
    L.g.gain.setTargetAtTime(this.gainFor(pos, vol, range), t, .05);
    if (L.pn && R.cam) { const e = R.cam.eye, f = lookVec(R.cam.yaw, 0); const dx = pos.x - e.x, dz = pos.z - e.z, l = Math.hypot(dx, dz); L.pn.pan.setTargetAtTime(l > .5 ? clamp((dx * -f.z + dz * f.x) / l * .6, -1, 1) : 0, t, .05); }
  },
  endLoops() {
    this.plF++; if (!this.ctx) return;
    for (const k in this.pl) { const L = this.pl[k]; if (L.f === this.plF) continue; try { L.g.gain.setTargetAtTime(0, this.ctx.currentTime, .03); L.s.stop(this.ctx.currentTime + .2); } catch (e) { } delete this.pl[k]; }
  },
  // synth effects
  sfx(kind, pos, vol = 1, pitch = 1) {
    if (!this.ctx) return;
    if (PACK.play(kind, pos, vol, pitch)) return; // vanilla resource pack sound when the player loaded one
    if (kind === 'wolfhurt' || kind === 'bigfall' || kind === 'smallfall') kind = 'hurt'; else if (kind === 'chainplace') kind = 'chain'; else if (kind.startsWith('st_') || kind.startsWith('atk_')) return; // vanilla-only
    const g0 = this.gainFor(pos, vol, 16); if (g0 <= 0.01) return;
    const c = this.ctx, t = c.currentTime; const out = c.createGain(); out.connect(this.master);
    const env = (g, a, d, peak = 1) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak * g0, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const noise = (f, q, type = 'bandpass', a = .005, d = .15, peak = 1, rate = 1) => { const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); env(g, a, d, peak); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + a + d + .05); };
    const tone = (f, type, a, d, peak = .4, f2) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * pitch, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2 * pitch, t + a + d); const g = c.createGain(); env(g, a, d, peak); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + .05); };
    switch (kind) {
      case 'hit': noise(900 * pitch, 1.2, 'bandpass', .003, .12, 1.2); tone(140, 'square', .003, .08, .15, 70); break;
      case 'crit': noise(2500, 2, 'bandpass', .003, .2, 1); noise(800, 1, 'bandpass', .003, .1, .8); break;
      case 'hurt': tone(320, 'square', .005, .12, .25, 160); noise(700, 1, 'bandpass', .003, .1, .6); break;
      case 'swing': noise(1800, .7, 'bandpass', .02, .12, .35, .8); break;
      case 'hat': noise(9000 * pitch, 2, 'highpass', .001, .05, .9); break;
      case 'bass': tone(90 * 1, 'triangle', .005, .25, .6); break;
      case 'anvil': tone(880, 'square', .002, .4, .2); tone(1320, 'square', .002, .3, .15); noise(3000, 3, 'bandpass', .002, .2, .7); break;
      case 'glass': for (let i = 0; i < 3; i++) noise(4000 + i * 1500, 6, 'bandpass', .002 + i * .02, .12, .8); break;
      case 'explode': noise(300, .5, 'lowpass', .005, 1.0, 1.6, .5); tone(60, 'sine', .005, .6, .6, 30); break;
      case 'chain': noise(3800 * pitch, 3, 'bandpass', .002, .05, .5); noise(7000 * pitch, 6, 'bandpass', .001, .03, .35); tone(1900 * pitch + Math.random() * 600, 'triangle', .001, .04, .07); break;
      case 'bow': noise(1200, .8, 'bandpass', .01, .25, .5, .6); break;
      case 'arrowhit': noise(600, 2, 'bandpass', .002, .08, .8); break;
      case 'pop': tone(700, 'sine', .003, .08, .3, 1200); break;
      case 'drink': for (let i = 0; i < 3; i++) tone(300 + i * 40, 'sine', .01 + i * .08, .07, .2); break;
      case 'eat': noise(1500, 1, 'bandpass', .01, .1, .6); break;
      case 'shield': noise(500, 1.5, 'bandpass', .002, .15, 1); tone(220, 'triangle', .002, .1, .3); break;
      case 'shieldbreak': noise(1500, 2, 'bandpass', .002, .4, 1); break;
      case 'click': tone(1200, 'square', .001, .03, .15); break;
      case 'levelup': tone(523, 'square', .01, .15, .2); setTimeout(() => this.sfx('ding2', pos, vol), 150); break;
      case 'ding2': tone(784, 'square', .01, .3, .2); break;
      case 'firework': noise(2500, 1, 'highpass', .002, .4, .9); break;
      case 'fizz': noise(4000, 1, 'highpass', .01, .4, .5); break;
      case 'splat': noise(400, 1, 'lowpass', .005, .2, .9); tone(120, 'sine', .005, .15, .3, 60); break;
      case 'smash': noise(200, .7, 'lowpass', .003, .5, 1.6); tone(80, 'sine', .003, .4, .7, 40); break;
      case 'spider': tone(180, 'sawtooth', .01, .2, .15, 120); noise(2000, 3, 'bandpass', .01, .15, .4); break;
      case 'death': tone(200, 'square', .005, .4, .25, 60); break;
      case 'reel': noise(3000, 2, 'bandpass', .01, .3, .4, 1.5); break;
      case 'siren': tone(700, 'sawtooth', .05, .6, .15, 1100); break;
    }
  },
};
