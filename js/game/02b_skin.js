// ===================== Minecraft skins by username =====================
// two sources in order; a failure retries a minute later instead of sticking forever.
// skins are cleaned the way Minecraft does it: legacy 64x32 conversion (mirrored limbs), opaque base layers and
// Notch's hat transparency hack (a fully opaque hat layer = no hat) — that last one fixes "the head is black".
const SKIN = {
  cache: new Map(),
  valid: n => typeof n === 'string' && /^[A-Za-z0-9_]{2,16}$/.test(n),
  state(n) { if (!this.valid(n)) return 'none'; const s = this.cache.get(n.toLowerCase()); return s ? s.state : 'none'; },
  get(n) {
    if (!this.valid(n) || !R.gfx) return null; const k = n.toLowerCase(); let s = this.cache.get(k);
    if (s && s.state === 'fail' && Date.now() - s.t > 60000) s = null; // try again a minute later
    if (!s) { s = { state: 'loading' }; this.cache.set(k, s); this.load(n, s); }
    return s.state === 'ok' ? s : null;
  },
  retry(n) { if (this.valid(n)) { const s = this.cache.get(n.toLowerCase()); if (s && s.state === 'fail') this.cache.delete(n.toLowerCase()); } },
  async fetchT(url, ms = 7000) { const c = new AbortController(); const to = setTimeout(() => c.abort(), ms); try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return r; } finally { clearTimeout(to); } },
  img(src) { return new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; const to = setTimeout(() => no(new Error('timeout')), 8000); im.onload = () => { clearTimeout(to); ok(im); }; im.onerror = () => { clearTimeout(to); no(new Error('img')); }; im.src = src; }); },
  async blobImg(url) { const b = await (await this.fetchT(url)).blob(); if (!/^image\//.test(b.type) && b.size < 100) throw new Error('not image'); const u = URL.createObjectURL(b); try { return await this.img(u); } finally { setTimeout(() => URL.revokeObjectURL(u), 1000); } },
  sources(n) { // the original two: mc-heads.net, then minotar.net
    return [
      async () => ({ im: await this.img('https://mc-heads.net/skin/' + n) }),
      async () => ({ im: await this.img('https://minotar.net/skin/' + n) }),
    ];
  },
  async load(n, s) {
    for (const src of this.sources(n)) {
      try { const r = await src(); this.process(r.im, s, r.slim); s.state = 'ok'; if (UI.onSkin) UI.onSkin(n); return; }
      catch (e) { /* next source */ }
    }
    s.state = 'fail'; s.t = Date.now(); if (UI.onSkin) UI.onSkin(n);
  },
  process(img, s, slimHint) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    if (!(W >= 64 && W % 64 === 0 && (H === W || H * 2 === W))) throw new Error('size'); // HD skins are scaled down
    const legacy = H * 2 === W;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, W, H, 0, 0, 64, legacy ? 32 : 64);
    const id = g.getImageData(0, 0, 64, 64), d = id.data; // throws if the image is cross-origin tainted -> next source
    const px = (x, y) => (y * 64 + x) * 4;
    if (legacy) { // Minecraft's legacy conversion: left arm/leg = mirrored copies of the right ones
      const copy = (sx, sy, dx, dy, w, h) => { const tmp = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = px(sx + x, sy + y); tmp.push([x, y, d[i], d[i + 1], d[i + 2], d[i + 3]]); }
        for (const [x, y, r, gg, b, a] of tmp) { const j = px(sx + dx + (w - 1 - x), sy + dy + y); d[j] = r; d[j + 1] = gg; d[j + 2] = b; d[j + 3] = a; } };
      for (const c of [[4, 16, 16, 32, 4, 4], [8, 16, 16, 32, 4, 4], [0, 20, 24, 32, 4, 12], [4, 20, 16, 32, 4, 12], [8, 20, 8, 32, 4, 12], [12, 20, 16, 32, 4, 12],
        [44, 16, -8, 32, 4, 4], [48, 16, -8, 32, 4, 4], [40, 20, 0, 32, 4, 12], [44, 20, -8, 32, 4, 12], [48, 20, -16, 32, 4, 12], [52, 20, -8, 32, 4, 12]]) copy(...c);
    }
    s.slim = slimHint !== undefined ? slimHint : !legacy && d[px(54, 20) + 3] === 0;
    const noAlpha = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[px(x, y) + 3] = 255; };
    noAlpha(0, 0, 32, 16); noAlpha(0, 16, 64, 32); noAlpha(16, 48, 48, 64);
    // hat layer that is completely opaque (old skins / blank fills) -> treat as no hat, otherwise it covers the face (black head)
    const clearIfOpaque = (x0, y0, x1, y1, uniformOnly) => {
      let c0 = null, uni = true; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = px(x, y); if (d[i + 3] < 128) return; const c = d[i] << 16 | d[i + 1] << 8 | d[i + 2]; if (c0 === null) c0 = c; else if (c !== c0) uni = false; }
      if (uniformOnly && !uni) return; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[px(x, y) + 3] = 0;
    };
    if (legacy) clearIfOpaque(32, 0, 64, 16, false);
    else { clearIfOpaque(32, 0, 64, 16, true); clearIfOpaque(0, 32, 64, 48, true); clearIfOpaque(0, 48, 16, 64, true); clearIfOpaque(48, 48, 64, 64, true); }
    g.putImageData(id, 0, 0);
    s.cv = cv; s.tex = R.gfx.makeTex(cv);
  },
};
