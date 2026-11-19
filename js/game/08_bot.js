// ===================== bots (practice mode) =====================
const BOT_NAMES = ['Steve', 'Alex', 'Notch', 'Herobrine', 'Jeb', 'Dinnerbone', 'Grumm', 'Sunny'];
const BOT_SKINS = ['', '', 'Notch', '', 'jeb_', 'Dinnerbone', 'Grumm', ''];
function groundBelow(x, y, z, depth) { const W = G.world; for (let i = 0; i <= depth; i++) { const B = BL[W.get(Math.floor(x), Math.floor(y - .5 - i), Math.floor(z))]; if (B.solid) return true; if (B.lava || B.snow) return false; } return false; }
function botUse(b, id, hold) {
  const i = b.inv.findIndex(s => s && s.id === id); if (i < 0) return false; const D = ITEMS[id];
  if (D.group && b.cdLeft(D.group) > 0) return false;
  const prev = b.sel; b.sel = i; const r = b.usePress(); b.sel = prev; return !!r;
}
function botThink(b) {
  const I = b.inp; I.f = 0; I.s = 0; I.jump = false; I.sprint = false; I.use = false;
  if (!b.alive || b.spectator) return;
  if (UI.botAI === false) { I.sneak = false; return; } // 봇 AI 끄기: training dummies
  const ai = b.ai || (b.ai = { t: 0, target: null, strafe: Math.random() < .5 ? 1 : -1, wander: rand(-3, 3), react: randi(4, 10), charge: 0, bow: 0, sneak: false });
  ai.t++;
  if (ai.t % 15 === 1 || !ai.target || !ai.target.alive || ai.target.spectator) ai.target = nearestOf(b, otherPlayers(b, 60));
  const t = ai.target;
  // weapon slot = first non-skill item
  const wi = b.inv.findIndex(s => s && !ITEMS[s.id].use); if (b.drawT === 0 && !ai.sneak) b.sel = wi >= 0 ? wi : 0;
  if (!t) { b.yaw += .02; I.f = groundBelow(b.x - Math.sin(b.yaw) * 1.5, b.y, b.z + Math.cos(b.yaw) * 1.5, 4) ? .5 : 0; return; }
  const dx = t.x - b.x, dz = t.z - b.z, dist = Math.hypot(dx, dz), dy = t.y - b.y;
  const wantYaw = yawTo(dx, dz); b.yaw = lerpA(b.yaw, wantYaw + Math.sin(ai.t * .07) * .05, .3);
  b.pitch = lerp(b.pitch, clamp(-Math.atan2(t.y + t.h * .6 - (b.y + b.eye), dist), -1.4, 1.4), .3);
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
  if (dist < reach + .3 && Math.abs(dy) < 2.5 && b.charge() >= .95 && ai.t % 2 === 0 && Math.random() < .8) b.attack();
  if (b.charge() > .95 && !b.onGround && b.vy < 0 && dist < reach) b.attack();
  if (dist < reach && b.onGround && Math.random() < .02) I.jump = true; // crit jumps
  // shield
  if (b.off && dist < 3.5 && b.charge() < .6 && Math.random() < .5 && !b.held().use) I.use = true;
  if (ai.t < ai.react) return;
  const r = Math.random();
  switch (b.job) {
    case 'rusher': if (dist > 6 && dist < 25) botUse(b, 'rush'); if (dist < 2.5) botUse(b, 'rzone'); break;
    case 'policer': if (dist < 10) botUse(b, 'baton'); break;
    case 'spider': if (dist < 14) botUse(b, 'colony'); if (dist < 8) botUse(b, 'egg'); break;
    case '360':
      botUse(b, 'rod6'); if (r < .01) botUse(b, 'rod0');
      if (dist > 4 && dist < 22) { const sp = b.pitch; b.pitch = clamp(-Math.atan2(t.y - (b.y + b.eye), dist) - dist * .012, -1.2, 1.2); botUse(b, 'xbow3'); b.pitch = sp; }
      break;
    case 'ice_wizard': if (dist < 14) botUse(b, 'icejail'); break;
    case 'randomizer':
      botUse(b, 'luckybox'); if (b.hp < 12) { botUse(b, 'pot_res'); botUse(b, 'baghak'); } if (dist < 8) botUse(b, 'pot_spd');
      if (dist > 7 && dist < 30 && b.count('arrow') > 0) { const bi = b.inv.findIndex(s => s && s.id === 'bow'); if (bi >= 0) { b.sel = bi; I.use = true; b.pitch -= dist * .01; if (b.drawT >= 20) I.use = false; } }
      else if (b.drawT > 0) I.use = false;
      break;
    case 'suno': if (dist < 10 && r < .3) botUse(b, 'wait'); if (b.hp < 8) botUse(b, 'study'); if (b.hp < b.maxHp() - 6) botUse(b, 'v4'); if (r < .005) botUse(b, 'runsuno'); break;
    case 'mefab3':
      if (b.cdLeft('grabex') === 0) botUse(b, 'grabex');
      if (!ai.sneak && dist > 4 && dist < 19 && b.cdLeft('grab') === 0 && ai.t - (ai.lastGrab || -999) > 200 && Math.random() < .04 && SK.canSee(b, t)) { ai.sneak = true; ai.lastGrab = ai.t; }
      if (ai.sneak) { I.sneak = true; I.sprint = false; if ((b.st.charge || 0) >= 23) { botUse(b, 'grab'); ai.sneak = false; I.sneak = false; } } else I.sneak = false;
      break;
    case 'slime': if (dist < 3.5 && r < .3) botUse(b, 'cutter'); if (b.hp < 30) botUse(b, 'slimeball'); break;
    case 'viggle':
      botUse(b, 'spinpot');
      if (dist < 4 || (b.st.spinArmed && dist < 9)) botUse(b, 'drone');
      if (dist < 13 && dist > 3 && Math.abs(wrapA(wantYaw - Math.round(wantYaw / (Math.PI / 2)) * Math.PI / 2)) < .25) botUse(b, 'destroy');
      break;
    case 'ai': {
      if (dist < 30) botUse(b, 'ai_glasses');
      const S = b.st.aiSteal;
      if (S && S.ids.grab !== undefined && dist > 3 && dist < 19) { I.sneak = true; I.sprint = false; if ((b.st.charge || 0) >= 23) { botUse(b, 'grab'); I.sneak = false; } }
      else if (S && dist < 15 && Math.random() < .05) for (const id of Object.keys(S.ids)) if (id !== 'grab' && botUse(b, id)) break;
      if (!b.st.aiPiece && dist < 10) botUse(b, 'big_data'); else if (b.st.aiPiece && b.hp < 10) botUse(b, 'big_data');
      break;
    }
    case 'seryong': if (dist < 25) { botUse(b, 'sr_laser'); botUse(b, 'sr_pig'); } if (b.st.srStun && G.tick <= b.st.srStun.until) botUse(b, 'sr_domain'); break;
    case 'summoner': if (dist < 16) botUse(b, 'dogs'); if (dist < 3) botUse(b, 'fangc'); else if (dist < 12 && r < .3) botUse(b, 'fangl'); break;
    case 'bilcorner': if (b.hp < b.maxHp() - 6) { botUse(b, 'squid'); botUse(b, 'harder'); } if (dist < 3.5) botUse(b, 'harder'); if (dist < 7) botUse(b, 'gather'); if (dist > 2.5 && dist < 7 && r < .3) botUse(b, 'bdash'); if (dist < 8 && r < .1) botUse(b, 'drug'); break;
    default: if (MOD.defs[b.job] && MOD.defs[b.job].bot) MOD.fire(b, 'bot', t, dist); break;
    case 'dude': botUse(b, 'rodwood'); botUse(b, 'crate'); if (b.hp < 28) botUse(b, 'pot_heal'); botUse(b, 'boots'); if (r < .01) { botUse(b, 'pot_swift'); botUse(b, 'pot_turtle'); } break;
  }
  if (b.job !== 'mefab3') I.sneak = false;
}
