// ===================== texture atlas (procedural 16px tiles) =====================
let ATL = 16; const TS = 16; // tiles 0-63 procedural, 64+ vanilla resource pack
function makeAtlas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = ATL * TS; const g = cv.getContext('2d');
  const img = g.createImageData(ATL * TS, ATL * TS); const D = img.data;
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const put = (t, x, y, r, gg, b, a = 255) => { const X = (t % ATL) * TS + x, Y = Math.floor(t / ATL) * TS + y, i = (Y * ATL * TS + X) * 4; D[i] = r; D[i + 1] = gg; D[i + 2] = b; D[i + 3] = a; };
  const tile = (t, f) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const c = f(x, y); put(t, x, y, c[0], c[1], c[2], c[3] === undefined ? 255 : c[3]); } };
  const n = (base, amt) => { const v = base + (rnd() - .5) * amt; return clamp(v | 0, 0, 255); };
  tile(0, () => [255, 255, 255]);
  tile(1, () => { const v = n(246, 10); return [v, v, v]; });
  tile(2, (x, y) => { const v = n(236, 6); return [v, v - 4, v - 10]; });
  tile(3, (x, y) => { const mort = y % 8 === 7 || (x % 16 === 15 && y < 8) || ((x + 8) % 16 === 15 && y >= 8); const v = mort ? n(90, 10) : n(128, 22); return [v, v, v]; });
  tile(4, (x, y) => { const edge = x === 0 || y === 0 || x === 15 || y === 15; const v = edge ? n(130, 8) : n(165, 10); return [v, v, v]; });
  tile(5, (x, y) => { const s = (x % 4 === 0) ? .82 : 1; const v = n(200, 24) * s; return [v, v * .78, v * .5]; });
  tile(6, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); const ring = (d | 0) % 3 === 0 ? .85 : 1; const v = n(210, 14) * ring; return [v, v * .8, v * .52]; });
  tile(7, (x, y) => { const line = y % 4 === 3; const v = line ? n(150, 10) : n(215, 22); return [v, v, v]; });
  tile(8, (x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; if (e) return [235, 245, 250, 255]; if ((x === y || x === y + 1) && x > 3 && x < 9) return [255, 255, 255, 140]; return [200, 230, 240, 40]; });
  tile(9, (x, y) => { const rail = x === 2 || x === 3 || x === 12 || x === 13; const rung = y % 4 === 1 && x > 1 && x < 14; if (rail || rung) { const v = n(150, 20); return [v, v * .72, v * .42, 255]; } return [0, 0, 0, 0]; });
  tile(10, () => { const v = n(246, 10); return [v, v + 2 > 255 ? 255 : v + 2, 255]; });
  tile(11, (x, y) => { const w = Math.sin(x * .7 + y * .4) * 18 + Math.sin(y * .9 - x * .3) * 14; return [n(235, 20), clamp(110 + w + (rnd() - .5) * 40, 40, 200) | 0, n(20, 20)]; });
  tile(12, (x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? [190, 220, 255, 230] : [n(150, 20), n(190, 20), 255, 165]; });
  tile(13, (x, y) => { const v = n(216, 12); return [v, v * .94 | 0, v * .72 | 0]; });
  tile(14, () => { const s = rnd() < .2 ? .7 : 1; const v = n(200, 20) * s; return [v, v, v]; });
  tile(15, () => { const v = n(200, 30); return [v, v, v]; });
  tile(16, (x, y) => { // face
    const skin = [200, 150, 115]; if (y >= 7 && y <= 8 && (x === 3 || x === 4)) return [255, 255, 255]; if (y >= 7 && y <= 8 && (x === 11 || x === 12)) return [255, 255, 255];
    if (y >= 7 && y <= 8 && (x === 5 || x === 10)) return [60, 50, 120]; if (y < 4) return [70, 45, 25]; if (y === 12 && x > 5 && x < 10) return [150, 90, 80]; return skin; });
  tile(17, (x, y) => { const h = (x % 5 === 2 && y > 2 && y < 13); const v = h ? n(150, 10) : n(220, 14); return [v, v * .92 | 0, v * .7 | 0]; });
  tile(18, () => [n(240, 10), n(195, 20), 40]);
  tile(19, (x, y) => { if ((y === 6 || y === 7) && (x === 3 || x === 4 || x === 11 || x === 12)) return [230, 20, 20]; if (y === 5 && (x === 6 || x === 9)) return [200, 20, 20]; const v = n(60, 12); return [v, v * .95 | 0, v * .9 | 0]; });
  tile(20, (x, y) => { const v = n(232, 10); return [v, v * .95 | 0, v * .95 | 0]; });
  tile(21, () => [255, 40, 40]);
  tile(22, (x, y) => { if ((y === 6 || y === 7) && (x === 3 || x === 4 || x === 11 || x === 12)) return [230, 20, 20]; const v = n(50, 10); return [v * .6 | 0, v * 1.1 | 0, v * 1.4 | 0]; });
  g.putImageData(img, 0, 0); return cv;
}
const tUV = t => [(t % ATL) / ATL, Math.floor(t / ATL) / ATL, 1 / ATL];

// ===================== GL =====================
const VS = `attribute vec3 aP;attribute vec2 aT;attribute vec4 aC;uniform mat4 uVP;uniform vec3 uCam;varying vec2 vT;varying vec4 vC;varying float vD;
void main(){gl_Position=uVP*vec4(aP,1.);vT=aT;vC=aC;vD=distance(aP,uCam);}`;
const FS = `precision mediump float;uniform sampler2D uTex;uniform vec3 uFog;uniform vec2 uFR;uniform vec4 uTint;uniform float uFlat;varying vec2 vT;varying vec4 vC;varying float vD;
void main(){vec4 t=texture2D(uTex,vT);if(t.a<.08)discard;vec4 c=t*vC;c.rgb=mix(c.rgb,uTint.rgb,uTint.a);if(uFlat>.5){c=vec4(uTint.rgb,uFlat>1.5?uTint.a:.55);}
float f=clamp((vD-uFR.x)/(uFR.y-uFR.x),0.,1.);c.rgb=mix(c.rgb,uFog,f);gl_FragColor=c;}`;
class Gfx {
  constructor(cv) {
    const gl = this.gl = cv.getContext('webgl', { antialias: false, alpha: false, stencil: true, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL 미지원'); this.stencil = !!(gl.getContextAttributes() || {}).stencil; // stencil: 랜덤블록 spectator outlines
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = this.p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); gl.useProgram(p);
    this.a = { P: gl.getAttribLocation(p, 'aP'), T: gl.getAttribLocation(p, 'aT'), C: gl.getAttribLocation(p, 'aC') };
    this.u = {}; for (const n of ['uVP', 'uCam', 'uTex', 'uFog', 'uFR', 'uTint', 'uFlat']) this.u[n] = gl.getUniformLocation(p, n);
    this.atlasCv = makeAtlas(); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlas = tex;
    gl.uniform1i(this.u.uTex, 0); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.chunks = new Map(); this.dyn = gl.createBuffer(); this.dynI = gl.createBuffer();
    this.sky = [0.47, 0.65, 1.0];
  }
  makeTex(cv, smooth) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, smooth ? gl.LINEAR : gl.NEAREST); if (smooth) gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, smooth ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST); /* smooth: text (power-of-two canvas) */ gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, this.atlas); return t; }
  refreshAtlas() { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCv); }
  bind(t) { this.gl.bindTexture(this.gl.TEXTURE_2D, t || this.atlas); }
  setU(vp, cam, fog0, fog1) { const gl = this.gl, u = this.u; gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3f(u.uCam, cam.x, cam.y, cam.z); gl.uniform3fv(u.uFog, this.sky); gl.uniform2f(u.uFR, fog0, fog1); gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform1f(u.uFlat, 0); }
  bindAttr() { const gl = this.gl, a = this.a; gl.enableVertexAttribArray(a.P); gl.enableVertexAttribArray(a.T); gl.enableVertexAttribArray(a.C); gl.vertexAttribPointer(a.P, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(a.T, 2, gl.FLOAT, false, 36, 12); gl.vertexAttribPointer(a.C, 4, gl.FLOAT, false, 36, 20); }
  upload(key, arrs) { // arrs: {o:{v,i}, t:{v,i}}
    const gl = this.gl; let c = this.chunks.get(key); if (!c) { c = { o: { vb: gl.createBuffer(), ib: gl.createBuffer(), n: 0 }, t: { vb: gl.createBuffer(), ib: gl.createBuffer(), n: 0 } }; this.chunks.set(key, c); }
    for (const k of ['o', 't']) { const s = arrs[k]; c[k].n = s.i.length; if (!s.i.length) continue; gl.bindBuffer(gl.ARRAY_BUFFER, c[k].vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.v), gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c[k].ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(s.i), gl.STATIC_DRAW); }
    c.center = arrs.center;
  }
  drawChunks(pass, cam, vis) { // vis(key): optional chunk filter (랜덤블록: only the camera's area, in the view frustum)
    const gl = this.gl; const list = []; for (const [k, c] of this.chunks) if (c[pass].n && (!vis || vis(k))) list.push(c);
    if (pass === 't') list.sort((a, b) => dist3(b.center, cam) - dist3(a.center, cam));
    for (const c of list) { gl.bindBuffer(gl.ARRAY_BUFFER, c[pass].vb); this.bindAttr(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c[pass].ib); gl.drawElements(gl.TRIANGLES, c[pass].n, gl.UNSIGNED_SHORT, 0); }
  }
  drawBatch(b) {
    if (!b.ni) return; const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dyn); gl.bufferData(gl.ARRAY_BUFFER, b.v.subarray(0, b.nv * 9), gl.DYNAMIC_DRAW); this.bindAttr();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dynI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.i.subarray(0, b.ni), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, b.ni, gl.UNSIGNED_SHORT, 0);
  }
}
// dynamic geometry batch (Uint16 indices -> flush when large)
class Batch {
  constructor(cap = 60000) { this.v = new Float32Array(cap * 9); this.i = new Uint16Array(cap * 1.5); this.nv = 0; this.ni = 0; this.cap = cap; this.am = 1; } // am: alpha multiplier (afterimages)
  reset() { this.nv = 0; this.ni = 0; }
  full() { return this.nv > this.cap - 64; }
  quad(p0, p1, p2, p3, uv, col, a = 1) { // uv: [u0,v0,s]
    if (this.full()) return; const v = this.v; let o = this.nv * 9; const [u0, v0, s] = uv;
    const P = [p0, p1, p2, p3], T = [[u0, v0 + s], [u0 + s, v0 + s], [u0 + s, v0], [u0, v0]];
    for (let k = 0; k < 4; k++) { v[o++] = P[k][0]; v[o++] = P[k][1]; v[o++] = P[k][2]; v[o++] = T[k][0]; v[o++] = T[k][1]; v[o++] = col[0]; v[o++] = col[1]; v[o++] = col[2]; v[o++] = a * this.am; }
    const b = this.nv, I = this.i; let j = this.ni; I[j++] = b; I[j++] = b + 1; I[j++] = b + 2; I[j++] = b; I[j++] = b + 2; I[j++] = b + 3; this.ni = j; this.nv += 4;
  }
  // box in local coords [x0..x1] transformed by m; col rgb; tiles: number or {f:frontTile}
  box(m, x0, y0, z0, x1, y1, z1, col, tile = 0, front = -1, a = 1, shade = true) {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(p => m ? M4.tp(m, p[0], p[1], p[2]) : p);
    const S = shade ? [0.8, 0.8, 0.6, 0.6, 1, 0.5] : [1, 1, 1, 1, 1, 1];
    const F = [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [7, 6, 2, 3], [0, 1, 5, 4]]; // +z(front/south), -z, -x, +x, top, bottom
    for (let f = 0; f < 6; f++) { const q = F[f]; const sc = S[f]; const t = (f === 0 && front >= 0) ? front : tile; this.quad(c[q[0]], c[q[1]], c[q[2]], c[q[3]], tUV(t), [col[0] * sc, col[1] * sc, col[2] * sc], a); }
  }
  quadUV(p0, p1, p2, p3, u0, v0, u1, v1, col) {
    if (this.full()) return; const v = this.v; let o = this.nv * 9; const P = [p0, p1, p2, p3], T = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
    for (let k = 0; k < 4; k++) { v[o++] = P[k][0]; v[o++] = P[k][1]; v[o++] = P[k][2]; v[o++] = T[k][0]; v[o++] = T[k][1]; v[o++] = col[0]; v[o++] = col[1]; v[o++] = col[2]; v[o++] = this.am; }
    const b = this.nv, I = this.i; let j = this.ni; I[j++] = b; I[j++] = b + 1; I[j++] = b + 2; I[j++] = b; I[j++] = b + 2; I[j++] = b + 3; this.ni = j; this.nv += 4;
  }
  // cuboid textured with the standard 64x64 skin layout at (u,v) for a w*h*d part
  skinBox(m, x0, y0, z0, x1, y1, z1, u, v, w, h, d, col) {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(p => M4.tp(m, p[0], p[1], p[2]));
    const F = [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [7, 6, 2, 3], [0, 1, 5, 4]], S = [0.8, 0.8, 0.6, 0.6, 1, 0.5];
    const RC = [[u + d, v + d, w, h], [u + 2 * d + w, v + d, w, h], [u, v + d, d, h], [u + d + w, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d]];
    for (let f = 0; f < 6; f++) { const q = F[f], r = RC[f], s = S[f]; this.quadUV(c[q[0]], c[q[1]], c[q[2]], c[q[3]], r[0] / 64, r[1] / 64, (r[0] + r[2]) / 64, (r[1] + r[3]) / 64, [col[0] * s, col[1] * s, col[2] * s]); }
  }
  cube(x, y, z, s, col, tile = 0, a = 1) { this.box(null, x - s, y - s, z - s, x + s, y + s, z + s, col, tile, -1, a); }
}

// ===================== chunk mesher =====================
const FACES = [ // dir, corners (unit cube), shade
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: .8 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: .8 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: .6 },
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: .6 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: .5 },
];
function meshChunk(world, cx, cy, cz) {
  const out = { o: { v: [], i: [] }, t: { v: [], i: [] }, center: { x: cx * CH + 8, y: cy * CH + 8, z: cz * CH + 8 } };
  const occ = (x, y, z) => { if (x < 0 || z < 0 || x >= world.sx || z >= world.sz || y < 0) return 1; const d = BL[world.get(x, y, z)]; return d.opaque && d.full ? 1 : 0; };
  const push = (pass, pts, uvs, col, ao, a) => {
    const s = out[pass], b = s.v.length / 9;
    for (let k = 0; k < 4; k++) { const sh = ao[k]; s.v.push(pts[k][0], pts[k][1], pts[k][2], uvs[k][0], uvs[k][1], col[0] * sh, col[1] * sh, col[2] * sh, a); }
    if (ao[0] + ao[2] < ao[1] + ao[3]) s.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b); else s.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const AOV = [0.5, 0.66, 0.83, 1];
  for (let y = cy * CH; y < Math.min(world.sy, cy * CH + CH); y++) for (let z = cz * CH; z < Math.min(world.sz, cz * CH + CH); z++) for (let x = cx * CH; x < Math.min(world.sx, cx * CH + CH); x++) {
    const id = world.get(x, y, z); if (!id) continue; const B = BL[id];
    const pass = B.trans ? 't' : 'o'; const a = B.ice ? .78 : 1;
    if (B.full) {
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], nx = x + F.d[0], ny = y + F.d[1], nz = z + F.d[2];
        const nid = world.get(nx, ny, nz), N = BL[nid];
        if (nx < 0 || nz < 0 || nx >= world.sx || nz >= world.sz || ny < 0) continue;
        if (N.opaque && N.full) continue; if (nid === id && (B.trans || B.snow || B.lava)) continue;
        if (B.lava && f !== 4) { if (N.lava) continue; }
        const t = (f === 4 || f === 5) && B.tileTop !== undefined ? B.tileTop : B.tile; const [u0, v0, s] = tUV(t);
        const uvs = [[u0, v0 + s], [u0 + s, v0 + s], [u0 + s, v0], [u0, v0]];
        const pts = F.c.map(c => [x + c[0], y + c[1], z + c[2]]);
        const ao = [1, 1, 1, 1];
        if (!B.trans && !B.emis) for (let k = 0; k < 4; k++) {
          const c = F.c[k]; const ax = [0, 1, 2].filter(i => F.d[i] === 0);
          const o1 = [0, 0, 0], o2 = [0, 0, 0]; o1[ax[0]] = c[ax[0]] ? 1 : -1; o2[ax[1]] = c[ax[1]] ? 1 : -1;
          const s1 = occ(nx + o1[0], ny + o1[1], nz + o1[2]), s2 = occ(nx + o2[0], ny + o2[1], nz + o2[2]), cc = occ(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]);
          ao[k] = AOV[s1 && s2 ? 0 : 3 - (s1 + s2 + cc)] * F.s;
        } else for (let k = 0; k < 4; k++) ao[k] = B.emis ? 1 : F.s;
        push(pass, pts, uvs, B.col, ao, a);
      }
    } else {
      for (const bx of B.boxes) {
        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const onEdge = (F.d[0] === 1 && bx[3] === 1) || (F.d[0] === -1 && bx[0] === 0) || (F.d[1] === 1 && bx[4] === 1) || (F.d[1] === -1 && bx[1] === 0) || (F.d[2] === 1 && bx[5] === 1) || (F.d[2] === -1 && bx[2] === 0);
          if (onEdge && occ(x + F.d[0], y + F.d[1], z + F.d[2])) continue;
          const pts = F.c.map(c => [x + (c[0] ? bx[3] : bx[0]), y + (c[1] ? bx[4] : bx[1]), z + (c[2] ? bx[5] : bx[2])]);
          const [u0, v0, s] = tUV(B.tile); const su = s;
          // map uv by face local extents
          const ext = f >= 4 ? [bx[0], bx[2], bx[3], bx[5]] : (f < 2 ? [bx[0], bx[1], bx[3], bx[4]] : [bx[2], bx[1], bx[5], bx[4]]);
          const uvs = [[u0 + ext[0] * su, v0 + (1 - ext[1]) * su], [u0 + ext[2] * su, v0 + (1 - ext[1]) * su], [u0 + ext[2] * su, v0 + (1 - ext[3]) * su], [u0 + ext[0] * su, v0 + (1 - ext[3]) * su]];
          push(pass, pts, uvs, B.col, [F.s, F.s, F.s, F.s], 1);
        }
      }
    }
  }
  return out;
}
