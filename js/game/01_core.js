// the page's own source, captured before anything touches the DOM (used to save the dev tool copy)
// single-file build: the page keeps a copy of itself (game windows = srcdoc, dev tool download). Split build (GitHub Pages, window.SITE_MULTI):
// game windows load index.html?app=... and the dev tool is assembled from the split files on download.
// dev tool window of the split build: index.html?app=apvp&dev=1 (the single-file build injects window.APVP_DEV instead)
if (!window.APVP_DEV && /[?&]dev=1(&|$)/.test(location.search)) window.APVP_DEV = 1;
const SELF_HTML = window.SITE_MULTI ? '' : (() => { try { return '<!DOCTYPE html>\n' + document.documentElement.outerHTML; } catch (e) { return ''; } })();
// dev tool prompt / result / mod API version: bump whenever the prompt or API changes (shown on the prompt, dev panel, every result txt)
const DEV_VER = 3;
'use strict';
// ===================== util =====================
const TPS = 20;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const choice = a => a[Math.floor(Math.random() * a.length)];
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const lerpA = (a, b, t) => a + wrapA(b - a) * t;
const D2R = Math.PI / 180;
const r1 = v => Math.round(v * 100) / 100;
function dist3(a, b) { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function distH(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
// MC yaw: 0 = +z (south), 90deg = -x (west). pitch + = down
function lookVec(yaw, pitch) { const cp = Math.cos(pitch); return { x: -Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp }; }
function yawTo(dx, dz) { return Math.atan2(-dx, dz); }
function uid(n = 5) { const c = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

// ===================== mat4 (column-major) =====================
const M4 = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  lookAt(e, c, u) {
    let zx = e.x - c.x, zy = e.y - c.y, zz = e.z - c.z; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = u.y * zz - u.z * zy, xy = u.z * zx - u.x * zz, xz = u.x * zy - u.y * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[4] = xy; m[8] = xz; m[1] = yx; m[5] = yy; m[9] = yz; m[2] = zx; m[6] = zy; m[10] = zz;
    m[12] = -(xx * e.x + xy * e.y + xz * e.z); m[13] = -(yx * e.x + yy * e.y + yz * e.z); m[14] = -(zx * e.x + zy * e.y + zz * e.z); m[15] = 1; return m;
  },
  T(m, x, y, z) { return M4.mul(m, Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1)); },
  S(m, x, y, z) { return M4.mul(m, Float32Array.of(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1)); },
  RY(m, a) { const c = Math.cos(a), s = Math.sin(a); return M4.mul(m, Float32Array.of(c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1)); },
  RX(m, a) { const c = Math.cos(a), s = Math.sin(a); return M4.mul(m, Float32Array.of(1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1)); },
  RZ(m, a) { const c = Math.cos(a), s = Math.sin(a); return M4.mul(m, Float32Array.of(c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)); },
  tp(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
};

// ===================== blocks =====================
// tiles: 0 white,1 concrete,2 quartz,3 stonebrick,4 smoothstone,5 logside,6 logtop,7 planks,8 glass,9 ladder,10 snow,11 lava,12 ice,13 sandstone,14 diorite,15 bars,16 face,17 trapdoor,18 gold,19 spiderface,20 sign,21 red,22 cavespiderface
const C = (r, g, b) => [r / 255, g / 255, b / 255];
const BL = [];
function defB(id, o) { BL[id] = Object.assign({ id, solid: true, full: true, opaque: true, tile: 1, col: [1, 1, 1], boxes: null, alpha: 1, trans: false, emis: false }, o); }
defB(0, { name: 'air', solid: false, full: false, opaque: false });
defB(1, { name: '밝은 회색 콘크리트', col: C(125, 125, 115) });
defB(2, { name: '회색 콘크리트', col: C(54, 57, 61) });
defB(3, { name: '흰색 콘크리트', col: C(207, 213, 214) });
defB(4, { name: '주황색 콘크리트', col: C(224, 97, 1) });
defB(5, { name: '빨간색 콘크리트', col: C(142, 33, 33), pad: 'red' });
defB(6, { name: '연두색 콘크리트', col: C(94, 169, 24), pad: 'lime' });
defB(7, { name: '보라색 콘크리트', col: C(100, 32, 156), pad: 'purple' });
defB(8, { name: '파란색 콘크리트', col: C(45, 47, 143), pad: 'blue' });
defB(9, { name: '매끄러운 석영', tile: 2 });
const SLAB_B = [[0, 0, 0, 1, .5, 1]], SLAB_T = [[0, .5, 0, 1, 1, 1]];
const STAIR = { e: [[0, 0, 0, 1, .5, 1], [.5, .5, 0, 1, 1, 1]], w: [[0, 0, 0, 1, .5, 1], [0, .5, 0, .5, 1, 1]], n: [[0, 0, 0, 1, .5, 1], [0, .5, 0, 1, 1, .5]], s: [[0, 0, 0, 1, .5, 1], [0, .5, .5, 1, 1, 1]] };
const shp = (b) => ({ full: false, opaque: false, boxes: b });
defB(10, Object.assign({ tile: 2 }, shp(SLAB_B))); defB(11, Object.assign({ tile: 2 }, shp(SLAB_T)));
[12, 13, 14, 15].forEach((id, i) => defB(id, Object.assign({ tile: 2 }, shp(STAIR['ewns'[i]]))));
defB(16, Object.assign({ tile: 7, col: C(184, 148, 95) }, shp(SLAB_B))); defB(17, Object.assign({ tile: 7, col: C(184, 148, 95) }, shp(SLAB_T)));
defB(18, { tile: 5, tileTop: 6, col: C(171, 132, 84) });
defB(19, { tile: 8, opaque: false, trans: true });
defB(20, { tile: 3 });
defB(21, Object.assign({ tile: 3 }, shp(SLAB_B))); defB(22, Object.assign({ tile: 3 }, shp(SLAB_T)));
[23, 24, 25, 26].forEach((id, i) => defB(id, Object.assign({ tile: 3 }, shp(STAIR['ewns'[i]]))));
defB(27, Object.assign({ tile: 13 }, shp(SLAB_B)));
defB(28, Object.assign({ tile: 14 }, shp(SLAB_T))); defB(29, Object.assign({ tile: 14 }, shp(SLAB_B)));
const LT = 3 / 16;
defB(30, Object.assign({ tile: 9, ladder: true, cut: true }, shp([[0, 0, 0, LT, 1, 1]])));
defB(31, Object.assign({ tile: 9, ladder: true, cut: true }, shp([[1 - LT, 0, 0, 1, 1, 1]])));
defB(32, Object.assign({ tile: 9, ladder: true, cut: true }, shp([[0, 0, 1 - LT, 1, 1, 1]])));
defB(33, Object.assign({ tile: 9, ladder: true, cut: true }, shp([[0, 0, 0, 1, 1, LT]])));
defB(34, Object.assign({ tile: 18, solid: false }, shp([[.25, .25, .25, .75, .9, .75], [.45, .9, .45, .55, 1, .55]])));
defB(35, Object.assign({ tile: 17 }, shp([[0, 0, 0, 1, LT, 1]])));
defB(36, Object.assign({ tile: 20, solid: false }, shp([[.06, 0, .4, .94, .6, .6]])));
defB(37, { name: '매끄러운 돌', tile: 4 });
defB(38, { name: '가루눈', tile: 10, solid: false, snow: true });
defB(39, { name: '용암', tile: 11, solid: false, lava: true, emis: true });
defB(40, { name: '얼음', tile: 12, opaque: false, trans: true, ice: true });
for (let m = 0; m < 16; m++) {
  const b = [[7 / 16, 0, 7 / 16, 9 / 16, 1, 9 / 16]];
  if (m & 1) b.push([7 / 16, 0, 0, 9 / 16, 1, 7 / 16]); if (m & 4) b.push([7 / 16, 0, 9 / 16, 9 / 16, 1, 1]);
  if (m & 2) b.push([9 / 16, 0, 7 / 16, 1, 1, 9 / 16]); if (m & 8) b.push([0, 0, 7 / 16, 7 / 16, 1, 9 / 16]);
  defB(48 + m, Object.assign({ tile: 15, col: C(160, 160, 165) }, shp(b)));
}
for (let i = 0; i < 64; i++) if (!BL[i]) defB(i, { solid: false, full: false, opaque: false });

// ===================== world =====================
const CH = 16;
class World {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz; this.b = new Uint8Array(sx * sy * sz);
    this.cx = Math.ceil(sx / CH); this.cy = Math.ceil(sy / CH); this.cz = Math.ceil(sz / CH);
    this.dirty = new Set(); this.onSet = null;
  }
  inB(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  get(x, y, z) { if (!this.inB(x, y, z)) return 0; return this.b[(y * this.sz + z) * this.sx + x]; }
  set(x, y, z, v) {
    if (!this.inB(x, y, z)) return; const i = (y * this.sz + z) * this.sx + x; if (this.b[i] === v) return; this.b[i] = v;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const X = x + dx, Y = y + dy, Z = z + dz; if (!this.inB(X, Y, Z)) continue;
      this.dirty.add(((Y / CH | 0) * this.cz + (Z / CH | 0)) * this.cx + (X / CH | 0));
    }
  }
  loadRLE(b64) {
    const bin = atob(b64); let p = 0, i = 0; const N = this.b.length;
    while (p < bin.length && i < N) { const v = bin.charCodeAt(p++); let run = 0, sh = 0, c; do { c = bin.charCodeAt(p++); run |= (c & 127) << sh; sh += 7; } while (c & 128); this.b.fill(v, i, i + run); i += run; }
  }
  // collision AABBs in region
  boxes(x0, y0, z0, x1, y1, z1, out) {
    out.length = 0;
    for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++) for (let z = Math.floor(z0); z <= Math.floor(z1); z++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
      const id = this.get(x, y, z); if (!id) continue; const d = BL[id]; if (!d.solid) continue;
      if (d.full) out.push([x, y, z, x + 1, y + 1, z + 1]);
      else for (const b of d.boxes) out.push([x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]]);
    }
    return out;
  }
  solidAt(x, y, z) { const d = BL[this.get(Math.floor(x), Math.floor(y), Math.floor(z))]; if (!d.solid) return false; if (d.full) return true; const fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z); for (const b of d.boxes) if (fx >= b[0] && fx <= b[3] && fy >= b[1] && fy <= b[4] && fz >= b[2] && fz <= b[5]) return true; return false; }
  // DDA raycast against block shapes. returns {x,y,z,t,id,nx,ny,nz} or null
  ray(o, d, maxT, filter) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tmx = d.x === 0 ? 1e9 : ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx);
    let tmy = d.y === 0 ? 1e9 : ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy);
    let tmz = d.z === 0 ? 1e9 : ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz);
    for (let i = 0; i < 300; i++) {
      const id = this.get(x, y, z);
      if (id && (filter ? filter(BL[id]) : BL[id].solid)) {
        const bx = BL[id].full ? [[0, 0, 0, 1, 1, 1]] : BL[id].boxes;
        let best = null;
        for (const b of bx) { const h = rayBox(o, d, x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]); if (h && h.t <= maxT && (!best || h.t < best.t)) best = h; }
        if (best) return { x, y, z, t: best.t, id, nx: best.nx, ny: best.ny, nz: best.nz };
      }
      const tmin = Math.min(tmx, tmy, tmz); if (tmin > maxT) return null;
      if (tmx === tmin) { x += sx; tmx += tdx; } else if (tmy === tmin) { y += sy; tmy += tdy; } else { z += sz; tmz += tdz; }
      if (y < -2 || y > this.sy + 40) return null;
    }
    return null;
  }
}
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -1e9, tmax = 1e9, nx = 0, ny = 0, nz = 0;
  const ax = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (let i = 0; i < 3; i++) {
    const [oo, dd, a, b] = ax[i];
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) { tmin = t1; nx = ny = nz = 0; const n = dd > 0 ? -1 : 1; if (i === 0) nx = n; else if (i === 1) ny = n; else nz = n; }
    if (t2 < tmax) tmax = t2; if (tmin > tmax) return null;
  }
  if (tmax < 0) return null; return { t: Math.max(0, tmin), nx, ny, nz };
}

// ===================== physics move (MC style AABB) =====================
const _bx = [];
// e: {x,y,z (feet center), w, h}, moves by (dx,dy,dz). returns {dx,dy,dz,hx,hz,vy}
function moveAABB(world, e, dx, dy, dz, step) {
  const hw = e.w / 2;
  const box = [e.x - hw, e.y, e.z - hw, e.x + hw, e.y + e.h, e.z + hw];
  const doMove = (b, mx, my, mz) => {
    const lo = [Math.min(b[0], b[0] + mx), Math.min(b[1], b[1] + my), Math.min(b[2], b[2] + mz)];
    const hi = [Math.max(b[3], b[3] + mx), Math.max(b[4], b[4] + my), Math.max(b[5], b[5] + mz)];
    const bs = world.boxes(lo[0] - .01, lo[1], lo[2] - .01, hi[0] + .01, hi[1], hi[2] + .01, []);
    const c = b.slice();
    // Y
    for (const o of bs) if (c[0] < o[3] - 1e-7 && c[3] > o[0] + 1e-7 && c[2] < o[5] - 1e-7 && c[5] > o[2] + 1e-7) {
      if (my > 0 && c[4] <= o[1] + 1e-7) my = Math.min(my, o[1] - c[4]); else if (my < 0 && c[1] >= o[4] - 1e-7) my = Math.max(my, o[4] - c[1]);
    }
    c[1] += my; c[4] += my;
    for (const o of bs) if (c[1] < o[4] - 1e-7 && c[4] > o[1] + 1e-7 && c[2] < o[5] - 1e-7 && c[5] > o[2] + 1e-7) {
      if (mx > 0 && c[3] <= o[0] + 1e-7) mx = Math.min(mx, o[0] - c[3]); else if (mx < 0 && c[0] >= o[3] - 1e-7) mx = Math.max(mx, o[3] - c[0]);
    }
    c[0] += mx; c[3] += mx;
    for (const o of bs) if (c[1] < o[4] - 1e-7 && c[4] > o[1] + 1e-7 && c[0] < o[3] - 1e-7 && c[3] > o[0] + 1e-7) {
      if (mz > 0 && c[5] <= o[2] + 1e-7) mz = Math.min(mz, o[2] - c[5]); else if (mz < 0 && c[2] >= o[5] - 1e-7) mz = Math.max(mz, o[5] - c[2]);
    }
    c[2] += mz; c[5] += mz;
    return { c, mx, my, mz };
  };
  let r = doMove(box, dx, dy, dz);
  const hitH = Math.abs(r.mx - dx) > 1e-6 || Math.abs(r.mz - dz) > 1e-6;
  const landed = dy < 0 && Math.abs(r.my - dy) > 1e-6;
  if (step > 0 && hitH && (e.onGround || landed)) {
    let s1 = doMove(box, 0, step, 0); let s2 = doMove(s1.c, dx, 0, dz); let s3 = doMove(s2.c, 0, -(s1.my) + (dy < 0 ? dy : 0), 0);
    const d1 = r.mx * r.mx + r.mz * r.mz, d2 = s2.mx * s2.mx + s2.mz * s2.mz;
    if (d2 > d1 + 1e-6) r = { c: s3.c, mx: s2.mx, my: s3.c[1] - box[1], mz: s2.mz };
  }
  e.x = (r.c[0] + r.c[3]) / 2; e.y = r.c[1]; e.z = (r.c[2] + r.c[5]) / 2;
  return { hx: Math.abs(r.mx - dx) > 1e-6, hz: Math.abs(r.mz - dz) > 1e-6, hy: Math.abs(r.my - dy) > 1e-6, ground: dy < 0 && Math.abs(r.my - dy) > 1e-6, my: r.my };
}
function aabbBlocks(world, e, pred) {
  const hw = e.w / 2 - .001;
  for (let y = Math.floor(e.y + .001); y <= Math.floor(e.y + e.h - .001); y++) for (let z = Math.floor(e.z - hw); z <= Math.floor(e.z + hw); z++) for (let x = Math.floor(e.x - hw); x <= Math.floor(e.x + hw); x++) { const d = BL[world.get(x, y, z)]; if (pred(d, x, y, z)) return true; }
  return false;
}
function rayAABB(o, d, e, maxT, grow = 0) { const hw = e.w / 2 + grow; const h = rayBox(o, d, e.x - hw, e.y - grow, e.z - hw, e.x + hw, e.y + e.h + grow, e.z + hw); return h && h.t <= maxT ? h.t : null; }
