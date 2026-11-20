// ===================== shared dances (4중인격 PvP + 랜덤블록 서바이벌) =====================
// Clips: js/data/dances.js (DANCE_DATA, made by tools/mkdance.py from Mixamo FBX). Model space is the Minecraft player
// model's: x = the player's left, y up, z forward, units = model pixels. Angles are applied like a Minecraft ModelPart:
// m = RZ(z) · RY(y) · RX(x) at the part's pivot.
//   root: base = base · T(off) · RY(yaw)        body: at the hips (y 12), relative to the root
//   head (neck, y 24) · arms (shoulders ±5..6, y 22): relative to the body      legs (hips ±2, y 12): relative to the root
// Use: const P = DANCE.pose(name, seconds); then m = DANCE.rot(M4.T(base, …), P.rarm) etc.
const DANCE = {
  names() { return typeof DANCE_DATA === 'undefined' ? [] : Object.keys(DANCE_DATA); },
  title(name) { return DANCE_DATA[name] ? DANCE_DATA[name].name : name; },
  pick(seed) { const L = this.names(); return L.length ? L[Math.abs(seed | 0) % L.length] : null; }, // same seed -> same dance on every client
  len(name) { const D = DANCE_DATA[name]; return D ? D.n / D.fps : 0; },
  // pose at time t (seconds, loops). Frames are blended linearly (angles shortest way round).
  pose(name, t) {
    const D = typeof DANCE_DATA !== 'undefined' && DANCE_DATA[name]; if (!D) return null;
    const f = ((t * D.fps) % D.n + D.n) % D.n, i = Math.floor(f), j = (i + 1) % D.n, a = f - i, d = D.d;
    const v = k => { const p = d[i * 22 + k], q = d[j * 22 + k], s = k >= 1 && k <= 3 ? 50 : 1000; let x = q - p; if (s === 1000 && k !== 0) x = ((x + 3142) % 6283 + 6283) % 6283 - 3142; return (p + x * (j ? a : 0)) / s; }; // no blending across the loop seam
    const r3 = k => [v(k), v(k + 1), v(k + 2)];
    return { yaw: v(0), off: r3(1), body: r3(4), head: r3(7), rarm: r3(10), larm: r3(13), rleg: r3(16), lleg: r3(19) };
  },
  rot(m, e) { m = M4.RZ(m, e[2]); m = M4.RY(m, e[1]); return M4.RX(m, e[0]); },
};
