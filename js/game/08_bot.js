// ===================== bots (practice mode) =====================
const BOT_NAMES = ['Steve', 'Alex', 'Notch', 'Herobrine', 'Jeb', 'Dinnerbone', 'Grumm', 'Sunny'];
const BOT_SKINS = ['', '', 'Notch', '', 'jeb_', 'Dinnerbone', 'Grumm', ''];
function groundBelow(x, y, z, depth) { const W = G.world; for (let i = 0; i <= depth; i++) { const B = BL[W.get(Math.floor(x), Math.floor(y - .5 - i), Math.floor(z))]; if (B.solid) return true; if (B.lava || B.snow) return false; } return false; }
function botUse(b, id, hold) {
  const i = b.inv.findIndex(s => s && s.id === id); if (i < 0) return false; const D = ITEMS[id];
  if (D.group && b.cdLeft(D.group) > 0) return false;
  const prev = b.sel; b.sel = i; const r = b.usePress(); b.sel = prev; return !!r;
}
// 봇 난이도 (UI.botLv): 2 어려움 = the original speed; 1 보통 / 0 쉬움 decide every 2nd / 3rd tick (holding the last inputs
// in between), turn slower, react and attack later and use skills less often.
const BOT_LV = [{ every: 3, turn: .12, react: 3, atk: [6, .45], tgt: 45, skill: 3 }, { every: 2, turn: .2, react: 2, atk: [4, .6], tgt: 30, skill: 2 }, { every: 1, turn: .3, react: 1, atk: [2, .8], tgt: 15, skill: 1 }];
function botThink(b) {
  const I = b.inp; const L = BOT_LV[UI.botLv === undefined ? 2 : UI.botLv] || BOT_LV[2];
  const ai0 = b.ai; if (ai0 && ai0.last && b.alive && !b.spectator && UI.botAI !== false && (ai0.t + 1) % L.every !== 0) { ai0.t++; Object.assign(I, ai0.last); if (ai0.target) { const t = ai0.target; b.yaw = lerpA(b.yaw, yawTo(t.x - b.x, t.z - b.z), L.turn * .5); } return; } // between decisions: keep doing the same thing
  I.f = 0; I.s = 0; I.jump = false; I.sprint = false; I.use = false;
  if (!b.alive || b.spectator) return;
  if (UI.botAI === false) { I.sneak = false; return; } // 봇 AI 끄기: training dummies
  const ai = b.ai || (b.ai = { t: 0, target: null, strafe: Math.random() < .5 ? 1 : -1, wander: rand(-3, 3), react: randi(4, 10) * L.react, charge: 0, bow: 0, sneak: false });
  ai.t++;
  try { botDecide(b, I, ai, L); } finally { ai.last = { f: I.f, s: I.s, jump: false, sprint: I.sprint, use: I.use, sneak: I.sneak }; }
}
function botDecide(b, I, ai, L) {
  if (ai.t % L.tgt < L.every || !ai.target || !ai.target.alive || ai.target.spectator) ai.target = nearestOf(b, otherPlayers(b, 60));
  const t = ai.target;
  // weapon slot = first non-skill item
  const wi = b.inv.findIndex(s => s && !ITEMS[s.id].use); if (b.drawT === 0 && !ai.sneak) b.sel = wi >= 0 ? wi : 0;
  if (!t) { b.yaw += .02; I.f = groundBelow(b.x - Math.sin(b.yaw) * 1.5, b.y, b.z + Math.cos(b.yaw) * 1.5, 4) ? .5 : 0; return; }
  const dx = t.x - b.x, dz = t.z - b.z, dist = Math.hypot(dx, dz), dy = t.y - b.y;
  const wantYaw = yawTo(dx, dz); b.yaw = lerpA(b.yaw, wantYaw + Math.sin(ai.t * .07) * .05, L.turn);
  b.pitch = lerp(b.pitch, clamp(-Math.atan2(t.y + t.h * .6 - (b.y + b.eye), dist), -1.4, 1.4), L.turn);
  const reach = b.reach;
  // movement
  if (dist > reach * .85) { I.f = 1; I.sprint = dist > 5; } else if (dist < 1.3) I.f = -.6; else I.f = .15;
  if (ai.t % 60 === 0) ai.strafe *= -1; if (dist < 6) I.s = ai.strafe * .6;
  if (b.hurtTime > 4) { I.f = 0; I.s = 0; I.sprint = false; } // knocked back: pause a moment, then come again
  if (b.hx && b.onGround) I.jump = true;
  if (dy > .8 && dist < 3 && b.onGround) I.jump = true;
  // stuck detection: no progress toward the target for 2s -> walk sideways around for a while
  if (ai.t % 120 === 0 || ai.bestD === undefined) ai.bestD = dist;
  if (dist < ai.bestD - .5) { ai.bestD = dist; ai.noProg = 0; } else ai.noProg = (ai.noProg || 0) + 1;
  if (ai.detour > 0) { ai.detour--; I.f = .45; I.s = ai.dside; I.sprint = false; if (ai.detour % 15 === 0 && b.onGround) I.jump = true; }
  else if (ai.noProg > 40 && dist > reach + 1) { ai.detour = randi(30, 60); ai.dside = ai.dside ? -ai.dside : (Math.random() < .5 ? 1 : -1); ai.noProg = 0; }
  // edge safety: check the cell we are heading to
  const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw); const mvx = -sy * I.f - cy * I.s, mvz = cy * I.f - sy * I.s;
  for (const k of [0.8, 1.6]) { if (!groundBelow(b.x + mvx * k, b.y, b.z + mvz * k, 3)) { I.f = I.f > 0 ? 0 : I.f; I.s = -I.s; I.sprint = false; if (ai.detour > 0) ai.dside = -ai.dside; if (!groundBelow(b.x - mvx, b.y, b.z - mvz, 3)) { I.f = 0; I.s = 0; } break; } }
  // attack
  if (dist < reach + .3 && Math.abs(dy) < 2.5 && b.charge() >= .95 && ai.t % L.atk[0] < L.every && Math.random() < L.atk[1]) b.attack();
  if (b.charge() > .95 && !b.onGround && b.vy < 0 && dist < reach) b.attack();
  if (dist < reach && b.onGround && Math.random() < .02) I.jump = true; // crit jumps
  // shield
  if (b.off && dist < 3.5 && b.charge() < .6 && Math.random() < .5 && !b.held().use) I.use = true;
  if (ai.t < ai.react) return;
  if (L.skill > 1 && Math.random() > 1 / L.skill) { if (b.job !== 'mefab3') I.sneak = false; return; } // slower bots think about skills less often
  const r = Math.random();
  const jb = BOT_JOB[b.job]; // 직업별 봇 행동 (js/jobs/<직업>.js)
  if (jb) jb(b, I, ai, t, dist, r, wantYaw);
  else if (MOD.defs[b.job] && MOD.defs[b.job].bot) MOD.fire(b, 'bot', t, dist);
  if (b.job !== 'mefab3') I.sneak = false;
}
