// ===================== Random Block Survival: world (dynamic shapes), mesher, arena generation =====================
// Coordinates: engine index = minecraft coordinate + RB_DIM offset. RW.mc(x,y,z) / RW.ix(x,y,z) convert.
class RWorld extends World {
  constructor(sx, sy, sz) { super(sx, sy, sz); this.b = new Uint16Array(sx * sy * sz); } // 16-bit block ids (more than 255 block states)
  loadRLE16(b64) { const bin = atob(b64); let p = 0, i = 0; const N = this.b.length; const vi = () => { let v = 0, sh = 0, c; do { c = bin.charCodeAt(p++); v += (c & 127) * Math.pow(2, sh); sh += 7; } while (c & 128); return v; }; while (p < bin.length && i < N) { const v = vi(), run = vi(); this.b.fill(v, i, i + run); i += run; } }
  shape(x, y, z, B) { return B.dyn ? B.dyn(this, x, y, z) : B.boxes; }
  boxes(x0, y0, z0, x1, y1, z1, out) {
    out.length = 0;
    for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++) for (let z = Math.floor(z0); z <= Math.floor(z1); z++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
      const id = this.get(x, y, z); if (!id) continue; const d = BL[id]; if (!d.solid) continue;
      if (d.full) out.push([x, y, z, x + 1, y + 1, z + 1]);
      else { const hh = d.colH || 1; for (const b of this.shape(x, y, z, d)) out.push([x + b[0], y + b[1], z + b[2], x + b[3], y + (b[4] >= 1 ? hh : b[4]), z + b[5]]); }
    }
    return out;
  }
  solidAt(x, y, z) { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); const d = BL[this.get(X, Y, Z)]; if (!d.solid) return false; if (d.full) return true; const fx = x - X, fy = y - Y, fz = z - Z; for (const b of this.shape(X, Y, Z, d)) if (fx >= b[0] && fx <= b[3] && fy >= b[1] && fy <= b[4] && fz >= b[2] && fz <= b[5]) return true; return false; }
  ray(o, d, maxT, filter) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tmx = d.x === 0 ? 1e9 : ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx), tmy = d.y === 0 ? 1e9 : ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy), tmz = d.z === 0 ? 1e9 : ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz);
    for (let i = 0; i < 300; i++) {
      const id = this.get(x, y, z);
      if (id && (filter ? filter(BL[id]) : BL[id].solid)) {
        const B = BL[id]; const bx = B.full ? [[0, 0, 0, 1, 1, 1]] : B.liquid ? [[0, 0, 0, 1, B.h, 1]] : this.shape(x, y, z, B); let best = null;
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
const RW = {
  w: null,
  ix(x, y, z) { return [x + RB_DIM.ox, y + RB_DIM.oy, z + RB_DIM.oz]; }, // minecraft -> engine
  mc(x, y, z) { return [x - RB_DIM.ox, y - RB_DIM.oy, z - RB_DIM.oz]; },
  P(x, y, z) { return { x: x + RB_DIM.ox, y: y + RB_DIM.oy, z: z + RB_DIM.oz }; }, // minecraft point -> engine point
  getM(x, y, z) { return this.w.get(x + RB_DIM.ox, y + RB_DIM.oy, z + RB_DIM.oz); },
  setM(x, y, z, id) { this.w.set(x + RB_DIM.ox, y + RB_DIM.oy, z + RB_DIM.oz, id); },
  init() {
    const D = RB_DIM; const w = this.w = new RWorld(D.sx, D.sy, D.sz); w.loadRLE16(RB_WORLD); w.dirty.clear();
    // deathmatch snapshot (restored after every round, players may build there)
    this.dmSnap = this.snap(-3, 71, -6, 10, 82, 7); this.dmSnap25 = this.snap(-4, 59, -7, 13, 70, 10);
    this.miniClear(); // the saved world still holds the last mini round
  },
  snap(x0, y0, z0, x1, y1, z1) { const a = []; for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) a.push(this.getM(x, y, z)); return { b: [x0, y0, z0, x1, y1, z1], a }; },
  restore(s) { const [x0, y0, z0, x1, y1, z1] = s.b; let i = 0; for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.setM(x, y, z, s.a[i++]); },
  fill(x0, y0, z0, x1, y1, z1, id) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.setM(x, y, z, id); },
  // ---------- arena (V2.1): 9 players = 33x33 inside bedrock walls at ±17, 25 players = 53x53 inside the permanent box; 15 layers (y201..215) ----------
  SPAWNS: [[10, 10], [-10, -10], [10, -10], [-10, 10], [10, 0], [-10, 0], [0, 10], [0, -10], [0, 0], // s1..s9 (block x,z)
    [-20, -20], [20, -20], [-20, 20], [0, -20], [0, 20], [20, 0], [-20, 0], [10, -20], [-20, -10], [-10, 20], [20, 10], [-10, -20], [-20, 10], [10, 20], [20, -10], [20, 20]], // s10..s24 + s10f (25 players)
  R(big) { return big ? 26 : 16; },
  spawns(big) { return big ? this.SPAWNS : this.SPAWNS.slice(0, 9); },
  genTicks(big) { return (this.R(big) + 1) * 15; }, // 255 / 405 steps of the original sweep (genAll runs them all at once)
  PREP_MS: 2000, // prep phase length: the arena is built at once, this only gives every client time to get the round
  rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; },
  clearArena() { this.fill(-27, 216, -28, 27, 220, 27, 0); this.fill(-26, 201, -26, 26, 215, 26, 0); for (const k of [...RG.be.keys()]) { const y = +k.split(',')[1]; if (y >= 200 && y <= 216) RG.be.delete(k); } RG.chestType.clear(); },
  // 9-player walls (the original fills bedrock at ±17 when a 9-player round starts; 25 players use the whole box)
  walls(big) { const id = big ? 0 : RBLK.K('bedrock'); for (const v of [-17, 17]) { this.fill(v, 200, -17, v, 216, 17, id); this.fill(-17, 200, v, 17, 216, v, id); } },
  // pal: null = the 33-entry V2.1 palette (each 1/33), or the host's custom list [[blockKey, weight, lootR?], ...] (any count, any weights)
  bag(seed, pal, R) { // count mode: exact numbers of each block, the rest air, shuffled with the round seed
    const W = 2 * R + 1; const key = seed + ':' + R + JSON.stringify(pal); if (this._bag && this._bag.key === key) return this._bag; const N = W * W * 15; const a = new Uint16Array(N), lr = new Uint8Array(N); let i = 0;
    for (const e of pal) { const id = e[0] === 'air' ? 0 : RBLK.K(e[0]); let n = Math.max(0, Math.floor(+e[1] || 0)); while (n-- > 0 && i < N) { a[i] = id; lr[i] = e[2] || 0; i++; } }
    const r = this.rng(seed * 131 + 7); for (let j = N - 1; j > 0; j--) { const k = Math.floor(r() * (j + 1)); const t = a[j]; a[j] = a[k]; a[k] = t; const u = lr[j]; lr[j] = lr[k]; lr[k] = u; }
    return this._bag = { key, a, lr };
  },
  // one row of one layer: x -R..R at (y, z). Every cell is decided by (seed, x, y, z) so all clients build the same arena in any order
  genRow(y, z, seed, pal, cnt, R) {
    const set = (x, id, lr) => { this.setM(x, y, z, id); if (id && BL[id].use === 'chest' && lr) RG.chestType.set(x + ',' + y + ',' + z, lr); };
    if (cnt && pal && pal.length) { const W = 2 * R + 1; const B = this.bag(seed, pal, R); let i = ((y - 201) * W + (z + R)) * W; for (let x = -R; x <= R; x++, i++) set(x, B.a[i], B.lr[i]); return; }
    const r = this.rng(seed * 31 + y * 7919 + (z + 64) * 104729);
    if (!pal || !pal.length) { for (let x = -R; x <= R; x++) { const k = Math.floor(r() * 33); set(x, RBLK.K(RB_ARENA[k].fixed) || RBLK.K('oak_planks'), RB_ARENA[k].loot ? RB_ARENA[k].r : 0); } return; }
    const ids = [], cum = []; let tot = 0; for (const e of pal) { const w = Math.max(0, +e[1] || 0); if (!w) continue; tot += w; ids.push([e[0] === 'air' ? 0 : RBLK.K(e[0]), e[2]]); cum.push(tot); }
    for (let x = -R; x <= R; x++) { if (!tot) { set(x, 0); continue; } const v = r() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] > v) hi = m; else lo = m + 1; } set(x, ids[lo][0], ids[lo][1]); }
  },
  // V2.1 sweep: two rows of stands start at z=+R and z=-R, build a 15-high wall slice one layer per tick, then step one block inward
  genTick(k, seed, pal, cnt, big) { const R = this.R(big); const s = Math.floor(k / 15), y = 201 + (k % 15); if (s > R) return; this.genRow(y, R - s, seed, pal, cnt, R); this.genRow(y, -R + s, seed, pal, cnt, R); },
  genAll(seed, pal, cnt, big) { const n = this.genTicks(big); for (let k = 0; k < n; k++) this.genTick(k, seed, pal, cnt, big); },
  ceiling() { this.fill(-27, 216, -27, 27, 216, 27, RBLK.K('bedrock')); },
  pocket(diamond, big) { for (const [x, z] of this.spawns(big)) { this.fill(x, 210, z, x, 211, z, 0); if (diamond) this.setM(x, 209, z, RBLK.K('diamond_block')); } },
  // ---------- mini random block survival (V2.1 playground, 1v1): 5x5x11 arena x14..18, y92..96, z-2..8 ----------
  MINI: [14, 92, -2, 18, 96, 8],
  miniLayer(y, seed) { const r = this.rng(seed * 17 + y * 389); for (let z = -2; z <= 8; z++) for (let x = 14; x <= 18; x++) { const e = RB_MINI[Math.floor(r() * RB_MINI.length)]; const id = RBLK.K(e.k); this.setM(x, y, z, id); if (e.loot) RG.chestType.set(x + ',' + y + ',' + z, 'm' + e.m); } },
  miniClear() { this.fill(14, 92, -2, 18, 96, 8, 0); for (const k of [...RG.be.keys()]) { const [x, y, z] = k.split(',').map(Number); if (x >= 14 && x <= 18 && y >= 92 && y <= 96 && z >= -2 && z <= 8) RG.be.delete(k); } },
  miniSpawns() { for (const z of [0, 6]) { this.fill(16, 93, z, 16, 95, z, 0); } for (let z = 0; z <= 6; z++) if (!this.getM(16, 93, z)) this.setM(16, 93, z, RBLK.K('diamond_block')); },
  // the pad cage (original: red stained glass around the queue pad while the round is prepared)
  cage(on) { const g = RBLK.K('red_stained_glass'); for (let y = 92; y <= 95; y++) for (let z = 5; z <= 8; z++) for (let x = 10; x <= 12; x++) { const wall = x === 10 || x === 12 || z === 5 || z === 8 || y === 95; if (!wall) continue; const cur = this.getM(x, y, z); if (on && !cur) this.setM(x, y, z, g); else if (!on && cur === g) this.setM(x, y, z, 0); } },
};

// ---------------- chunk mesher (per-face tiles, connected shapes, cross plants, liquids) ----------------
const RMESH = {
  FACES: FACES, AOV: [0.5, 0.66, 0.83, 1],
  chunk(world, cx, cy, cz) {
    const out = { o: { v: [], i: [] }, t: { v: [], i: [] }, center: { x: cx * CH + 8, y: cy * CH + 8, z: cz * CH + 8 } };
    const occ = (x, y, z) => { const d = BL[world.get(x, y, z)]; return d.opaque && d.full ? 1 : 0; };
    const push = (pass, pts, uvs, col, ao, a) => { const s = out[pass], b = s.v.length / 9; for (let k = 0; k < 4; k++) { const sh = ao[k]; s.v.push(pts[k][0], pts[k][1], pts[k][2], uvs[k][0], uvs[k][1], col[0] * sh, col[1] * sh, col[2] * sh, a); } if (ao[0] + ao[2] < ao[1] + ao[3]) s.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b); else s.i.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    const quad2 = (pass, pts, uv, col, a) => { push(pass, pts, uv, col, [1, 1, 1, 1], a); push(pass, [pts[1], pts[0], pts[3], pts[2]], [uv[1], uv[0], uv[3], uv[2]], col, [1, 1, 1, 1], a); };
    const x0 = cx * CH, y0 = cy * CH, z0 = cz * CH;
    for (let y = y0; y < Math.min(world.sy, y0 + CH); y++) for (let z = z0; z < Math.min(world.sz, z0 + CH); z++) for (let x = x0; x < Math.min(world.sx, x0 + CH); x++) {
      const id = world.get(x, y, z); if (!id) continue; const B = BL[id]; if (B.invisible) continue;
      if (B.cross) { // two diagonal planes (plants, fire, torch)
        const [u0, v0, s] = tUV(B.tiles[0]); const uv = [[u0, v0 + s], [u0 + s, v0 + s], [u0 + s, v0], [u0, v0]]; const h = B.crossH || 1; const c = B.col; const o = B.crossOff || [0, 0, 0]; const X = x + o[0], Y = y + o[1], Z = z + o[2]; const q0 = B.crossW ? .5 - B.crossW : .15, q1 = 1 - q0;
        quad2('o', [[X + q0, Y, Z + q0], [X + q1, Y, Z + q1], [X + q1, Y + h, Z + q1], [X + q0, Y + h, Z + q0]], uv, c, 1);
        quad2('o', [[X + q1, Y, Z + q0], [X + q0, Y, Z + q1], [X + q0, Y + h, Z + q1], [X + q1, Y + h, Z + q0]], uv, c, 1);
        continue;
      }
      if (B.liquid) {
        const up = BL[world.get(x, y + 1, z)]; const h = up.liquid === B.liquid ? 1 : B.h; const pass = B.trans ? 't' : 'o'; const a = B.trans ? .72 : 1;
        for (let f = 0; f < 6; f++) {
          const F = this.FACES[f], N = BL[world.get(x + F.d[0], y + F.d[1], z + F.d[2])]; if (N.liquid === B.liquid || (N.opaque && N.full)) continue; if (f === 4 && up.liquid === B.liquid) continue;
          const [u0, v0, s] = tUV(B.tiles[f]); const pts = F.c.map(c => [x + c[0], y + (c[1] ? h : 0), z + c[2]]); const uvs = [[u0, v0 + s], [u0 + s, v0 + s], [u0 + s, v0], [u0, v0]];
          const sh = B.emis ? 1 : F.s; push(pass, pts, uvs, B.col, [sh, sh, sh, sh], a); if (f === 4 && B.trans) push(pass, [pts[1], pts[0], pts[3], pts[2]], [uvs[1], uvs[0], uvs[3], uvs[2]], B.col, [sh, sh, sh, sh], a);
        }
        continue;
      }
      const pass = B.trans ? 't' : 'o';
      if (B.full) {
        for (let f = 0; f < 6; f++) {
          const F = this.FACES[f], nx = x + F.d[0], ny = y + F.d[1], nz = z + F.d[2]; const nid = world.get(nx, ny, nz), N = BL[nid];
          if (N.opaque && N.full) continue; if (nid === id && (B.cut || B.trans)) continue; if (B.cut && N.cut && N.full && N.glass === B.glass) continue;
          const [u0, v0, s] = tUV(B.tiles[f]); const uvs = [[u0, v0 + s], [u0 + s, v0 + s], [u0 + s, v0], [u0, v0]]; const pts = F.c.map(c => [x + c[0], y + c[1], z + c[2]]);
          const ao = [1, 1, 1, 1];
          if (!B.emis && !B.cut) for (let k = 0; k < 4; k++) {
            const c = F.c[k]; const ax = [0, 1, 2].filter(i => F.d[i] === 0); const o1 = [0, 0, 0], o2 = [0, 0, 0]; o1[ax[0]] = c[ax[0]] ? 1 : -1; o2[ax[1]] = c[ax[1]] ? 1 : -1;
            const s1 = occ(nx + o1[0], ny + o1[1], nz + o1[2]), s2 = occ(nx + o2[0], ny + o2[1], nz + o2[2]), cc = occ(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]);
            ao[k] = this.AOV[s1 && s2 ? 0 : 3 - (s1 + s2 + cc)] * F.s;
          } else for (let k = 0; k < 4; k++) ao[k] = B.emis ? 1 : F.s;
          push(pass, pts, uvs, B.col, ao, 1);
        }
      } else {
        const bxs = world.shape(x, y, z, B); if (!bxs) continue;
        for (const bx of bxs) for (let f = 0; f < 6; f++) {
          const F = this.FACES[f];
          const onEdge = (F.d[0] === 1 && bx[3] >= 1) || (F.d[0] === -1 && bx[0] <= 0) || (F.d[1] === 1 && bx[4] >= 1) || (F.d[1] === -1 && bx[1] <= 0) || (F.d[2] === 1 && bx[5] >= 1) || (F.d[2] === -1 && bx[2] <= 0);
          if (onEdge && occ(x + F.d[0], y + F.d[1], z + F.d[2])) continue;
          const pts = F.c.map(c => [x + (c[0] ? bx[3] : bx[0]), y + (c[1] ? bx[4] : bx[1]), z + (c[2] ? bx[5] : bx[2])]);
          const [u0, v0, s] = tUV(B.tiles[f]);
          const e = f >= 4 ? [bx[0], bx[2], bx[3], bx[5]] : (f < 2 ? [bx[0], bx[1], bx[3], bx[4]] : [bx[2], bx[1], bx[5], bx[4]]);
          const fr = v => clamp(v, 0, 1); const uvs = [[u0 + fr(e[0]) * s, v0 + (1 - fr(e[1])) * s], [u0 + fr(e[2]) * s, v0 + (1 - fr(e[1])) * s], [u0 + fr(e[2]) * s, v0 + (1 - fr(e[3])) * s], [u0 + fr(e[0]) * s, v0 + (1 - fr(e[3])) * s]];
          const sh = B.emis ? 1 : F.s; push(pass, pts, uvs, B.col, [sh, sh, sh, sh], 1);
          if (B.cut && !B.solid) push(pass, [pts[1], pts[0], pts[3], pts[2]], [uvs[1], uvs[0], uvs[3], uvs[2]], B.col, [sh, sh, sh, sh], 1); // ladders / rails visible from both sides
        }
      }
    }
    return out;
  },
};
