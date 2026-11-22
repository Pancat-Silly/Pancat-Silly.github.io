// ===================== Random Block Survival: container screens + the menu chest =====================
// Slot model: gui.S[i] = { get(), set(v), accept(st)?, out?, act?, inv?: player inventory slot }. Click rules follow MC:
// left = pick / place / swap / merge, right = half / one, shift = quick move, output slots craft on take.
Object.assign(RUI, {
  open(type, ctx = {}) {
    if (this.gui) this.close(true); RIN.lmb = RIN.rmb = false; RG.me.dig = null;
    if (document.pointerLockElement) document.exitPointerLock();
    const g = this.gui = { type, ctx, S: [] }; if (ctx.x !== undefined) ctx.key = ctx.x + ',' + ctx.y + ',' + ctx.z;
    if (type === 'inv') g.grid = new Array(4).fill(null);
    if (type === 'craft') g.grid = new Array(9).fill(null);
    if (type === 'enchant') { g.e = [null, null]; }
    if (type === 'anvil') { g.a = [null, null]; }
    if (type === 'furnace') { const d = RG.beGet(ctx.x, ctx.y, ctx.z); if (!d) { this.gui = null; return; } d.own = RG.me.id; if (ctx.x === -15 && ctx.y === 88 && ctx.z === -19) g.key = true; }
    if (type === 'chest') { if (!RG.beGet(ctx.x, ctx.y, ctx.z)) { this.gui = null; return; } }
    this.render();
  },
  close(silent) {
    const g = this.gui; if (!g) return; const me = RG.me;
    const back = s => { if (!s) return; const l = me.give(s); if (l) RG.dropStack(Object.assign({}, s, { n: l }), me.x, me.y + 1.2, me.z, 0, .2, 0, true, true); };
    if (g.grid) g.grid.forEach(back); if (g.e) g.e.forEach(back); if (g.a) g.a.forEach(back); back(this.cursor); this.cursor = null; $('rbCursor').innerHTML = '';
    if (g.type === 'chest') RAU.play('chest_close', 1, false, .6);
    this.gui = null; $('rbGui').innerHTML = ''; $('rbTip').style.display = 'none';
    if (!silent && !this.mobile && !this.paused) RIN.lock();
  },
  // ---------- building ----------
  slotEl(i, cls = '') { return '<div class="rs ' + cls + '" data-s="' + i + '"></div>'; },
  addS(o) { this.gui.S.push(o); return this.gui.S.length - 1; },
  invSlots() { // 27 main + 9 hotbar, returns html
    const me = RG.me; let h = '<div class="rgsp"></div>';
    for (let r = 0; r < 3; r++) { h += '<div class="rgrow">'; for (let c = 0; c < 9; c++) { const i = 9 + r * 9 + c; h += this.slotEl(this.addS({ get: () => me.inv[i], set: v => me.inv[i] = v, inv: true, main: true })); } h += '</div>'; }
    h += '<div class="rgsp"></div><div class="rgrow">'; for (let c = 0; c < 9; c++) h += this.slotEl(this.addS({ get: () => me.inv[c], set: v => me.inv[c] = v, inv: true, hot: true })); return h + '</div>';
  },
  render() {
    const g = this.gui; if (!g) return; g.S = []; g.rb = 0; const me = RG.me; let h = '';
    const out = (get, take, cls) => this.slotEl(this.addS({ get, take, out: true }), 'big ' + (cls || ''));
    switch (g.type) {
      case 'inv': {
        h = '<div class="rgw"><div class="rgflex"><div>'; for (let i = 0; i < 4; i++) h += '<div class="rgrow">' + this.slotEl(this.addS({ get: () => me.armor[i], set: v => me.armor[i] = v, accept: s => RIT[s.id] && RIT[s.id].armor && RIT[s.id].armor.slot === i, one: true, arm: true })) + '</div>';
        h += '</div><div class="rdollw"><div class="rdoll" id="rbDoll">' + this.dollHTML() + '</div><div class="rdolln">' + esc(me.name) + ' · Lv.' + me.lvl + ' · 방어 ' + me.armorPts()[0] + '</div></div><div><h4>제작</h4><div class="rgflex"><div>';
        for (let r = 0; r < 2; r++) { h += '<div class="rgrow">'; for (let c = 0; c < 2; c++) { const i = r * 2 + c; h += this.slotEl(this.addS({ get: () => g.grid[i], set: v => g.grid[i] = v, grid: true })); } h += '</div>'; }
        h += '</div><div class="rarrow">➜</div>' + out(() => this.craftOut(2), () => this.craftTake(2)) + '</div><div class="rgsp"></div><div class="rgflex">왼손 ' + this.slotEl(this.addS({ get: () => me.off, set: v => me.off = v, accept: s => RIT[s.id] && RIT[s.id].shield, one: true })) + '</div></div></div>';
        h += this.invSlots() + '</div>'; h = '<div class="rgwrap">' + this.rbHTML(2) + h + '</div>'; g.rb = 2; break;
      }
      case 'craft': {
        h = '<div class="rgw"><h4>제작</h4><div class="rgflex"><div>'; for (let r = 0; r < 3; r++) { h += '<div class="rgrow">'; for (let c = 0; c < 3; c++) { const i = r * 3 + c; h += this.slotEl(this.addS({ get: () => g.grid[i], set: v => g.grid[i] = v, grid: true })); } h += '</div>'; }
        h += '</div><div class="rarrow">➜</div>' + out(() => this.craftOut(3), () => this.craftTake(3)) + '</div>' + this.invSlots() + '</div>'; h = '<div class="rgwrap">' + this.rbHTML(3) + h + '</div>'; g.rb = 3; break;
      }
      case 'chest': {
        const d = RG.beGet(g.ctx.x, g.ctx.y, g.ctx.z); h = '<div class="rgw"><h4>상자</h4>';
        for (let r = 0; r < 3; r++) { h += '<div class="rgrow">'; for (let c = 0; c < 9; c++) { const i = r * 9 + c; h += this.slotEl(this.addS({ get: () => d.inv[i], set: v => d.inv[i] = v, cont: true })); } h += '</div>'; }
        h += this.invSlots() + '</div>'; break;
      }
      case 'furnace': {
        const d = RG.beGet(g.ctx.x, g.ctx.y, g.ctx.z); const B = BL[RW.getM(g.ctx.x, g.ctx.y, g.ctx.z)];
        const ttl = g.key ? this.keyTitle(d) : B.blast ? '용광로' : '화로';
        h = '<div class="rgw"><h4>' + this.fmt(ttl) + '</h4><div class="rgflex"><div>' + this.slotEl(this.addS({ get: () => d.inv[0], set: v => d.inv[0] = v, cont: true }))
          + '<div id="rbFire" class="rfire" style="text-align:center">🔥</div>' + this.slotEl(this.addS({ get: () => d.inv[1], set: v => d.inv[1] = v, cont: true, accept: s => !!(RIT[s.id] && RIT[s.id].fuel) })) + '</div><div class="rarrow" id="rbCook">➜</div>'
          + out(() => d.inv[2], () => { const s = d.inv[2]; d.inv[2] = null; if (d.xp) { RG.addXp(me, Math.floor(d.xp) + (Math.random() < d.xp % 1 ? 1 : 0)); RAU.play('orb'); d.xp = 0; } if (g.key) this.keyTaken(d); return s; }) + '</div>'
          + (B.blast ? '<div class="rgnote">용광로: 광석 · 원석 · 금속 도구만 2배 빠르게 녹여요</div>' : '') + this.invSlots() + '</div>'; break;
      }
      case 'enchant': {
        const shelves = this.shelves(g.ctx); const it = g.e[0]; const offers = it ? RENCH.offers(it, shelves, (me.enchSeed || (me.enchSeed = randi(1, 1e9))) + it.id.length * 97) : null;
        h = '<div class="rgw"><h4>마법 부여</h4><div class="rgflex"><div>' + this.slotEl(this.addS({ get: () => g.e[0], set: v => g.e[0] = v, one: true, accept: s => !!(RIT[s.id] && RIT[s.id].ench) || s.id === 'book', ench: true })) + this.slotEl(this.addS({ get: () => g.e[1], set: v => g.e[1] = v, accept: s => s.id === 'lapis_lazuli', ench: true })) + '</div><div class="rench">';
        const items = offers || (it && it.id === 'book' ? RENCH.offers({ id: 'enchanted_book' }, shelves, me.enchSeed) : null);
        for (let i = 0; i < 3; i++) { const o = items && items[i]; const ok = o && (me.lvl >= o.cost) && g.e[1] && g.e[1].n >= i + 1; const first = o ? Object.entries(o.ens)[0] : null; h += '<button data-en="' + i + '"' + (ok ? '' : ' disabled') + '>' + (o ? (i + 1) + ' 레벨 · 청금석 ' + (i + 1) + ' · 필요 Lv.' + o.cost + '<br>' + (first ? RITEM.enName(first[0], first[1]) + ' ...?' : '') : '—') + '</button>'; }
        h += '</div></div><div class="rgnote">책장 ' + shelves + '개 · 내 레벨 ' + me.lvl + '</div>' + this.invSlots() + '</div>'; g.offers = items; break;
      }
      case 'anvil': {
        const r = this.anvilOut(); h = '<div class="rgw"><h4>모루 · 수리 및 합치기</h4><div class="rgflex">' + this.slotEl(this.addS({ get: () => g.a[0], set: v => g.a[0] = v, one: true })) + '<span class="rarrow">+</span>' + this.slotEl(this.addS({ get: () => g.a[1], set: v => g.a[1] = v, one: true })) + '<span class="rarrow">➜</span>'
          + out(() => r ? r.out : null, () => this.anvilTake()) + '</div><div class="rgnote">' + (r ? '<b style="color:' + (me.lvl >= r.cost ? '#2a2' : '#c33') + '">마법 부여 비용: ' + r.cost + ' 레벨</b>' : '같은 아이템 두 개(수리) 또는 아이템 + 마법이 부여된 책') + '</div>' + this.invSlots() + '</div>'; break;
      }
      case 'palette': h = this.palHTML(); break;
      case 'book': { const P = this.BOOK; const p = g.ctx.p || 0; h = '<div class="rbook"><div class="rbp">' + this.fmt(P[p]).replace('{{V21}}', '<a class="rblink" href="https://youtu.be/C_QVJYME30A" target="_blank" rel="noopener">랜덤블록 서바이벌 V2.1</a>') + '</div><div class="rbn"><button class="rbtn" data-bk="-1"' + (p ? '' : ' disabled') + '>◀</button><span>' + (p + 1) + ' / ' + P.length + '</span><button class="rbtn" data-bk="1"' + (p < P.length - 1 ? '' : ' disabled') + '>▶</button><button class="rbtn" data-bk="x">닫기</button></div></div>'; break; }
      case 'form': h = g.ctx.html; break;
    }
    $('rbGui').innerHTML = h; this.paint();
    if (g.cells) for (const el of $('rbGui').querySelectorAll('[data-li],[data-la],[data-lb]')) el.onclick = e => { e.stopPropagation(); const d = el.dataset; if (d.lb) { if (d.lb === 'x') this.close(); else this.open(g.back || 'menu'); return; } const C = g.cells.find(c => c.i === +(d.la || d.li)); if (C) C.act(d.la ? 2 : 0); if (this.gui && this.gui.cells && this.gui.type === g.type) this.render(); };
    if (g.type === 'form' && g.ctx.bind) g.ctx.bind($('rbGui'));
    if (g.type === 'palette') this.palBind();
    if (g.rb) this.rbBind();
  },
  paint() { const g = this.gui; if (!g) return; for (const el of $('rbGui').querySelectorAll('.rs')) { const S = g.S[+el.dataset.s]; if (!S) continue; if (S.html) { el.innerHTML = S.html; continue; } el.innerHTML = this.slotHTML(S.get()); } $('rbCursor').innerHTML = this.cursor ? this.slotHTML(this.cursor) : ''; },
  guiTick() { const g = this.gui; if (!g) return; if (g.type === 'furnace') { const d = RG.beGet(g.ctx.x, g.ctx.y, g.ctx.z); if (!d) { this.close(); return; } const f = $('rbFire'), c = $('rbCook'); if (f) f.style.opacity = d.burn > 0 ? .3 + .7 * d.burn / (d.burnMax || 1) : .15; if (c) c.style.color = d.cook ? 'hsl(' + (40 + d.cook / 2) + ',80%,45%)' : '#8b8b8b'; if (g.key) { const h = $('rbGui').querySelector('h4'); if (h) h.innerHTML = this.fmt(this.keyTitle(d)); if (!d.inv[0] && d.regen && RG.hostNow() >= d.regen) this.paint(); } this.paint(); }
    if (g.type === 'chest' || g.type === 'furnace') { const k = g.ctx.key; const [x, y, z] = [g.ctx.x, g.ctx.y, g.ctx.z]; if (!BL[RW.getM(x, y, z)].use) this.close(); const P = RW.P(x + .5, y + .5, z + .5); if (Math.hypot(P.x - RG.me.x, P.y - RG.me.y - 1, P.z - RG.me.z) > 7) this.close(); } },
  // ---------- crafting ----------
  fullMsg() { this.chat('§c인벤토리가 가득 찼어요!'); RAU.play('anvil_land', 1, true, .4); },
  craftOut(w) { const g = this.gui; const r = RCRAFT.match(g.grid, w); return r ? Object.assign({}, r.out) : null; },
  craftTake(w) {
    const g = this.gui; const r = RCRAFT.match(g.grid, w); if (!r) return null;
    for (let i = 0; i < g.grid.length; i++) if (g.grid[i]) { g.grid[i].n--; if (!g.grid[i].n) g.grid[i] = null; }
    if (r.r.shield && !RG.gs.opts.shield) { // original: shield crafting disabled by the host -> taken back, planks 6 + iron 1 returned
      this.chat('§c호스트가 방패 제작을 비활성화 하였습니다!'); RAU.play('anvil_land', 1, true); for (const s of [{ id: 'oak_planks', n: 6 }, { id: 'iron_ingot', n: 1 }]) { const l = RG.me.give(s); if (l) RG.dropStack({ id: s.id, n: l }, RG.me.x, RG.me.y + 1.2, RG.me.z, 0, .2, 0, true, true); } return null;
    }
    return Object.assign({}, r.out);
  },
  // ---------- enchanting / anvil ----------
  shelves(c) { let n = 0; for (let dy = 0; dy <= 1; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue; if (BL[RW.getM(c.x + dx, c.y + dy, c.z + dz)].key === 'bookshelf') n++; } return n; },
  doEnchant(i) {
    const g = this.gui, me = RG.me; const o = g.offers && g.offers[i]; if (!o || me.lvl < o.cost || !g.e[1] || g.e[1].n < i + 1) return;
    const it = g.e[0]; if (it.id === 'book') { g.e[0] = { id: 'enchanted_book', n: 1, en: o.ens }; } else it.en = o.ens;
    g.e[1].n -= i + 1; if (!g.e[1].n) g.e[1] = null; RG.useLevels(me, i + 1); me.enchSeed = randi(1, 1e9); RAU.play('levelup', 1.2); this.render();
  },
  anvilOut() {
    const [a, b] = this.gui.a; if (!a || !b) return null; const IA = RIT[a.id]; let out = null, cost = 0;
    if (a.id === b.id && IA && IA.dur) { out = Object.assign({}, a, { en: Object.assign({}, a.en || {}) }); out.d = Math.max(0, (a.d || 0) - (IA.dur - (b.d || 0)) - Math.floor(IA.dur * .12)); cost = 2; }
    else if (b.id === 'enchanted_book' && IA && IA.ench) { out = Object.assign({}, a, { en: Object.assign({}, a.en || {}) }); cost = 1; }
    else return null;
    for (const [e, l] of Object.entries(b.en || {})) { const pool = RENCH.POOL[IA.ench] || []; if (!pool.some(p => p[0] === e)) continue; const cur = out.en[e] || 0; const nl = cur === l ? Math.min(RITEM.EN[e][1], l + 1) : Math.max(cur, l); out.en[e] = nl; cost += nl * 2; }
    if (!Object.keys(out.en).length) delete out.en; return { out, cost };
  },
  anvilTake() { const r = this.anvilOut(); const me = RG.me; if (!r || me.lvl < r.cost) return null; RG.useLevels(me, r.cost); this.gui.a = [null, null]; RAU.play('anvil_use', 1, false, .7); return r.out; },
  // dungeon key furnace: taking the key starts a 30 s regeneration (original furnace names count down)
  keyTitle(d) { const st = RG.keyStage(d); if (st.v === 'ready') { if (d.regen) d.regen = 0; if (!d.inv[0]) d.inv[0] = { id: 'tripwire_hook', n: 1 }; return '자폭열쇠 재생성까지.. §a재생성됨!'; } d.inv[0] = null; return '자폭열쇠 재생성까지.. ' + (typeof st.v === 'number' ? st.v + '초' : ''); },
  keyTaken(d) { d.regen = RG.hostNow(); RG.emit({ k: 'be', key: '-15,88,-19', d }); },
  // ---------- clicks ----------
  guiDown(e) {
    const g = this.gui; if (!g) return; const t = e.target;
    if (t.dataset && t.dataset.en !== undefined) { this.doEnchant(+t.dataset.en); return; }
    if (t.dataset && t.dataset.bk) { const b = t.dataset.bk; if (b === 'x') this.close(); else { g.ctx.p = clamp((g.ctx.p || 0) + +b, 0, this.BOOK.length - 1); this.render(); } return; }
    const el = t.closest('.rs'); if (!el) { if (t === $('rbGui') && g.type !== 'form') { if (this.cursor) { const c = this.cursor; this.cursor = null; const me = RG.me; RG.dropStack(c, me.x, me.y + 1.3, me.z, -Math.sin(me.yaw) * .3, .2, Math.cos(me.yaw) * .3, true); this.paint(); } else this.close(); } return; }
    e.preventDefault(); this.click(+el.dataset.s, e.button, e.shiftKey);
  },
  guiTouch(e) { const el = e.target.closest && e.target.closest('.rs'); if (!el) return; e.preventDefault(); this._tipHold = true; this.tapTip(el, e.touches[0]); this._tch = { s: +el.dataset.s, t: performance.now() }; this._tlong = setTimeout(() => { if (this._tch) { this.click(this._tch.s, 2, false); this._tch = null; } }, 420); },
  guiTouchEnd(e) { clearTimeout(this._tlong); this._tipHold = false; $('rbTip').style.display = 'none'; if (this._tch) { const s = this._tch.s; this._tch = null; e.preventDefault(); const dbl = this._lastTap && this._lastTap.s === s && performance.now() - this._lastTap.t < 400; this._lastTap = dbl ? null : { s, t: performance.now() }; this.click(s, 0, false); if (dbl && this.armTap(s)) this.click(s, 0, true); } else { const t = e.target; if (t.dataset && (t.dataset.en !== undefined || t.dataset.bk)) { e.preventDefault(); this.guiDown({ target: t, button: 0, preventDefault() { } }); } } },
  // phones (no sneak inside the inventory): double-tapping armor puts it on. The 1st tap picks it up, the 2nd puts it back, then it's
  // shift-moved onto its armor slot (only when that slot is empty, otherwise it just stays where it was)
  armTap(i) { const g = this.gui, S = g && g.S[i]; if (!S || g.type !== 'inv' || !S.inv || this.cursor) return false; const st = S.get(); return !!(st && RIT[st.id] && RIT[st.id].armor && g.S.some(T => T.arm && !T.get() && T.accept(st))); },
  click(i, btn, shift) {
    const g = this.gui; const S = g.S[i]; if (!S) return; const me = RG.me;
    if (S.act) { S.act(btn, shift); return; }
    const max = s => RITEM.max(s.id); const acc = s => !S.accept || S.accept(s);
    if (S.out) {
      const o = S.get(); if (!o) return;
      if (shift) { let guard = 0; while (guard++ < 64) { const o2 = S.get(); if (!o2) break; if (me.room(o2) < o2.n) { if (guard === 1) this.fullMsg(); break; } const before = JSON.stringify(me.inv); const got = S.take(); if (!got) break; const l = me.give(got); if (l) { RG.dropStack(Object.assign({}, got, { n: l }), me.x, me.y + 1.2, me.z, 0, .2, 0, true, true); break; } if (JSON.stringify(me.inv) === before) break; } }
      else { const c = this.cursor; if (c && !(RITEM.same(c, o) && c.n + o.n <= max(c))) return; const got = S.take(); if (!got) { this.render(); return; } if (c) c.n += got.n; else this.cursor = got; }
      RAU.play('click', 1, false, .3); this.afterChange(S); return;
    }
    const st = S.get(); const cur = this.cursor;
    if (st && RIT[st.id] && RIT[st.id].menu) { if (g.type === 'inv' && btn === 2) { this.close(true); this.menuAct(RIT[st.id].menu); } return; } // locked lobby items
    if (shift && st) { // quick move (inventory: armor goes straight onto its empty armor slot first, like MC)
      let n = st.n; const targets = S.inv ? (g.type === 'inv' ? g.S.filter(T => T.arm && !T.get() && T.accept(st)).concat(g.S.filter(T => T.inv && (S.hot ? T.main : T.hot))) :g.S.filter(T => (T.cont || T.ench) && !T.out)) : g.S.filter(T => T.inv);
      for (const T of targets) { const t = T.get(); if (t && RITEM.same(t, st) && t.n < max(t)) { const k = Math.min(n, max(t) - t.n); t.n += k; n -= k; if (!n) break; } }
      if (n) for (const T of targets) { if (T.get() || (T.accept && !T.accept(st))) continue; const k = T.one ? 1 : Math.min(n, max(st)); T.set(Object.assign({}, st, { n: k })); n -= k; if (!n) break; }
      S.set(n ? Object.assign(st, { n }) : null); this.afterChange(S); return;
    }
    if (btn === 0) {
      if (!cur) { if (st) { this.cursor = st; S.set(null); } }
      else if (!st) { if (acc(cur)) { if (S.one && cur.n > 1) { S.set(Object.assign({}, cur, { n: 1 })); cur.n--; } else { S.set(cur); this.cursor = null; } } }
      else if (RITEM.same(st, cur) && !S.one) { const k = Math.min(cur.n, max(st) - st.n); st.n += k; cur.n -= k; if (!cur.n) this.cursor = null; }
      else if (acc(cur) && !(S.one && cur.n > 1)) { S.set(cur); this.cursor = st; }
    } else {
      if (!cur) { if (st) { const h = Math.ceil(st.n / 2); this.cursor = Object.assign({}, st, { n: h }); st.n -= h; if (!st.n) S.set(null); } }
      else if (!st) { if (acc(cur)) { S.set(Object.assign({}, cur, { n: 1 })); cur.n--; if (!cur.n) this.cursor = null; } }
      else if (RITEM.same(st, cur) && st.n < max(st) && !S.one) { st.n++; cur.n--; if (!cur.n) this.cursor = null; }
    }
    this.afterChange(S);
  },
  afterChange(S) { const g = this.gui; if (!g) return; if (S && S.cont && g.ctx.key) { const [x, y, z] = g.ctx.key.split(',').map(Number); RG.beSave(x, y, z, RG.beGet(x, y, z)); }
    if (g.type === 'furnace' && g.key) { const d = RG.beGet(-15, 88, -19); if (d && !d.inv[0] && !d.regen) this.keyTaken(d); }
    this.render(); },
  hotkey(n) { // number key over a slot: swap with hotbar n
    const g = this.gui; if (!g) return; const el = document.elementFromPoint(this.mx || 0, this.my || 0); const s = el && el.closest && el.closest('.rs'); if (!s) return; const S = g.S[+s.dataset.s]; if (!S || S.out || S.act) return; const me = RG.me; const a = S.get(), b = me.inv[n]; if (b && S.accept && !S.accept(b)) return; S.set(b || null); me.inv[n] = a || null; this.afterChange(S);
  },
  dropHover(all) { const g = this.gui; const el = document.elementFromPoint(this.mx || 0, this.my || 0); const s = el && el.closest && el.closest('.rs'); if (!g || !s) return; const S = g.S[+s.dataset.s]; if (!S || S.out || S.act) return; const st = S.get(); if (!st) return; const me = RG.me; const n = all ? st.n : 1; RG.dropStack(Object.assign({}, st, { n }), me.x, me.y + 1.3, me.z, -Math.sin(me.yaw) * .3, .2, Math.cos(me.yaw) * .3, true); st.n -= n; if (!st.n) S.set(null); this.afterChange(S); },
  // phones: a tap shows what the slot holds for a moment (there's no hover)
  tapTip(el, t) { const g = this.gui; const S = g && g.S[+el.dataset.s]; const tip = $('rbTip'); let txt = ''; if (S) { if (S.tip) txt = S.tip; else { const s = S.get && S.get(); if (s) txt = RITEM.name(s) + (RITEM.lore(s).length ? '\n' + RITEM.lore(s).join('\n') : ''); } } if (!txt) return; tip.innerHTML = this.fmt(txt).replace(/\n/g, '<br>'); tip.style.display = 'block'; tip.style.left = clamp(t.clientX - 60, 4, innerWidth - 230) + 'px'; tip.style.top = Math.max(4, t.clientY - 70) + 'px'; clearTimeout(this._tipT); },
  tipAt(e) { if (this.gui && this.gui.type === 'inv') this.dollLook(e); const tip = $('rbTip'); if (this.mobile) { if (!this._tipHold) tip.style.display = 'none'; return; } // phones: tips only while a finger is held down (see rbBind / guiTouch) const g = this.gui; if (!g || this.cursor) { tip.style.display = 'none'; return; }
    const dt = e.target.closest && e.target.closest('[data-tip]'); if (dt) { tip.innerHTML = this.fmt(dt.dataset.tip).replace(/\n/g, '<br>'); tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 310, e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; return; } const el = e.target.closest && e.target.closest('.rs'); const S = el && g.S[+el.dataset.s]; if (!S) { tip.style.display = 'none'; return; }
    let txt = ''; if (S.tip) txt = S.tip; else { const s = S.get && S.get(); if (s) txt = RITEM.name(s) + (RITEM.lore(s).length ? '\n' + RITEM.lore(s).join('\n') : ''); }
    if (!txt) { tip.style.display = 'none'; return; } tip.innerHTML = this.fmt(txt).replace(/\n/g, '<br>'); tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 310, e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; },
  // ---------- recipe book (Bedrock style, left of the inventory / crafting table): click a recipe to craft it from your inventory ----------
  TAGN: { '#planks': '판자 (아무거나)', '#log': '원목', '#coal': '석탄 또는 숯' },
  rbNeed(r) { const n = {}; for (const row of r.rows) for (const ch of row) if (ch !== '.') n[r.keys[ch]] = (n[r.keys[ch]] || 0) + 1; return n; },
  rbHave(need) { // greedy check over the 36 inventory slots (no damaged / enchanted items, like the grid)
    const me = RG.me; const left = me.inv.map(s => s && !s.d && !s.en && !(RIT[s.id] && RIT[s.id].menu) ? s.n : 0);
    for (const k in need) { let n = need[k]; for (let i = 0; i < me.inv.length && n; i++) { const s = me.inv[i]; if (!s || !left[i] || !RCRAFT.tagOk(k, s.id)) continue; const t = Math.min(n, left[i]); left[i] -= t; n -= t; } if (n) return false; } return true;
  },
  rbList(w) { const seen = new Set(), L = []; RREC.forEach((r, i) => { const k = r.out + '|' + r.n + '|' + JSON.stringify(r.keys); if (seen.has(k)) return; seen.add(k); const fits = r.rows.length <= w && r.rows[0].length <= w; const need = this.rbNeed(r); const ok = fits && this.rbHave(need) && !(r.shield && !RG.gs.opts.shield); L.push({ i, r, fits, ok, need }); }); return L; },
  rbHTML(w) {
    const L = this.rbList(w); const only = this.rbOnly; let h = '<div class="rgw rrb"><div class="rrbh"><b>📖 제작법</b><label><input type="checkbox" data-rbo' + (only ? ' checked' : '') + '>제작 가능만</label></div><div class="rrbg">';
    const show = L.filter(e => !only || e.ok).sort((a, b) => (b.ok - a.ok) || (b.fits - a.fits));
    for (const e of show) { const nm = RITEM.name({ id: e.r.out }).replace(/§./g, ''); const need = Object.entries(e.need).map(([k, n]) => (this.TAGN[k] || RITEM.name({ id: k }).replace(/§./g, '')) + ' ×' + n).join(', ');
      const tip = nm + (e.r.n > 1 ? ' ×' + e.r.n : '') + '\n§7재료: ' + need + (!e.fits ? '\n§c제작대가 필요해요 (3×3)' : e.r.shield && !RG.gs.opts.shield ? '\n§c호스트가 방패 제작을 막아 두었어요' : e.ok ? '\n§a클릭: 1번 만들기 · Shift/우클릭: 최대로' : '\n§c재료가 부족해요');
      h += '<div class="rrbi' + (e.ok ? ' ok' : '') + (e.fits ? '' : ' big') + '" data-rc="' + e.i + '" data-tip="' + esc(tip) + '"><img src="' + this.iconURL(e.r.out) + '" draggable="false">' + (e.r.n > 1 ? '<b>' + e.r.n + '</b>' : '') + '</div>'; }
    if (!show.length) h += '<div class="rgnote">만들 수 있는 게 아직 없어요</div>';
    return h + '</div><div class="rrbn"><button class="rbtn" data-rp="-1">◀</button><span id="rbRp"></span><button class="rbtn" data-rp="1">▶</button></div><div class="rgnote">' + (w === 2 ? '2×2 · 회색은 제작대 필요' : '3×3 제작대') + '</div></div>';
  },
  rbCraft(i, max) {
    const r = RREC[i]; const g = this.gui; if (!r || !g) return; const me = RG.me; const w = g.rb; if (r.rows.length > w || r.rows[0].length > w) { RAU.play('anvil_land', 1, true, .4); return; }
    if (r.shield && !RG.gs.opts.shield) { this.chat('§c호스트가 방패 제작을 비활성화 하였습니다!'); RAU.play('anvil_land', 1, true); return; }
    const need = this.rbNeed(r); let made = 0;
    while (this.rbHave(need) && made < (max ? 64 : 1)) {
      if (me.room({ id: r.out, n: r.n }) < r.n) { if (!made) this.fullMsg(); break; } // bag full: don't craft (a drop would vanish in the lobby)
      for (const k in need) { let n = need[k]; for (let j = 0; j < me.inv.length && n; j++) { const s = me.inv[j]; if (!s || s.d || s.en || (RIT[s.id] && RIT[s.id].menu) || !RCRAFT.tagOk(k, s.id)) continue; const t = Math.min(n, s.n); s.n -= t; n -= t; if (!s.n) me.inv[j] = null; } }
      const l = me.give({ id: r.out, n: r.n }); if (l) RG.dropStack({ id: r.out, n: l }, me.x, me.y + 1.2, me.z, 0, .2, 0, true, true); made++;
      if (RITEM.max(r.out) === 1 && !max) break;
    }
    if (made) { RAU.play('click', 1, false, .4); } this.render();
  },
  rbBind() { const el = $('rbGui'); for (const d of el.querySelectorAll('[data-rc]')) { d.onclick = e => { e.stopPropagation(); this.rbCraft(+d.dataset.rc, e.shiftKey); }; d.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); if (this.mobile) return; this.rbCraft(+d.dataset.rc, true); };
      if (this.mobile) { let lp = false, tm = 0; const tip = $('rbTip');
        d.addEventListener('touchstart', e => { lp = false; const t = e.touches[0]; clearTimeout(tm); tm = setTimeout(() => { lp = true; this._tipHold = true; tip.innerHTML = this.fmt(d.dataset.tip).replace(/\n/g, '<br>'); tip.style.display = 'block'; tip.style.left = clamp(t.clientX - 100, 4, innerWidth - 230) + 'px'; tip.style.top = Math.max(4, t.clientY - 110) + 'px'; }, 350); }, { passive: true });
        const up = e => { clearTimeout(tm); this._tipHold = false; tip.style.display = 'none'; if (lp && e.cancelable) e.preventDefault(); lp = false; }; // after a long press: no click (no crafting)
        d.addEventListener('touchend', up); d.addEventListener('touchcancel', up); d.addEventListener('touchmove', () => clearTimeout(tm), { passive: true }); } }
    const c = el.querySelector('[data-rbo]'); if (c) c.onchange = () => { this.rbOnly = c.checked; this.rbPage = 0; this.render(); };
    // pages sized to the inventory panel (like the Java/Bedrock book), ◀ ▶ or the mouse wheel to flip
    document.body.classList.add('rbguiopen'); // the screen is shown by the HUD tick; show it now so the page size can be measured
    const G = el.querySelector('.rrbg'); if (!G) return; const items = [...G.querySelectorAll('.rrbi')]; const cols = this.mobile ? 4 : 5; const inv = el.querySelector('.rgwrap > .rgw:last-child'); const avail = (inv ? inv.offsetHeight : 300) - 96; const rows = Math.max(2, Math.floor((avail + 3) / 41)); const per = rows * cols; const pages = Math.max(1, Math.ceil(items.length / per));
    this.rbPage = clamp(this.rbPage || 0, 0, pages - 1);
    const show = () => { items.forEach((d, i) => d.style.display = Math.floor(i / per) === this.rbPage ? '' : 'none'); const L = el.querySelector('#rbRp'); if (L) L.textContent = (this.rbPage + 1) + ' / ' + pages; for (const b of el.querySelectorAll('[data-rp]')) b.disabled = pages < 2; };
    for (const b of el.querySelectorAll('[data-rp]')) b.onclick = e => { e.stopPropagation(); this.rbPage = (this.rbPage + +b.dataset.rp + pages) % pages; show(); RAU.play('click', 1, false, .3); };
    G.onwheel = e => { e.preventDefault(); this.rbPage = clamp(this.rbPage + Math.sign(e.deltaY), 0, pages - 1); show(); }; show();
  },
  // ---------- player model in the inventory (CSS 3D from the player's skin; follows the mouse like MC) ----------
  defSkin() { if (this._ds) return this._ds; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const skin = '#c99a7a', hair = '#4a2f1d', shirt = '#2fa3a8', pants = '#3b3e9e', shoe = '#555';
    R(0, 0, 32, 16, skin); R(8, 0, 8, 8, hair); R(0, 8, 32, 2, hair); R(24, 8, 8, 8, hair); R(8, 8, 8, 1, hair); R(9, 12, 2, 1, '#fff'); R(10, 12, 1, 1, '#4b3ba0'); R(13, 12, 2, 1, '#fff'); R(13, 12, 1, 1, '#4b3ba0'); R(11, 14, 2, 1, '#8a5a44'); R(10, 15, 4, 1, '#6b3f2f');
    R(16, 16, 24, 16, shirt); R(40, 16, 16, 16, skin); R(40, 20, 16, 4, shirt); R(32, 48, 16, 16, skin); R(32, 52, 16, 4, shirt); R(0, 16, 16, 16, pants); R(0, 28, 16, 4, shoe); R(16, 48, 16, 16, pants); R(16, 60, 16, 4, shoe);
    return this._ds = c.toDataURL(); },
  dollHTML() {
    const me = RG.me; const sk = me.skin && SKIN.get(me.skin); let url = this._dsu && this._dsk === me.skin && sk ? this._dsu : null; if (!url && sk && sk.cv) { url = this._dsu = sk.cv.toDataURL(); this._dsk = me.skin; } if (!url) url = this.defSkin(); const slim = !!(sk && sk.slim); const S = 3.4;
    const face = (u, v, w, h, tf) => '<i style="width:' + w * S + 'px;height:' + h * S + 'px;margin:' + (-h * S / 2) + 'px 0 0 ' + (-w * S / 2) + 'px;background-image:url(' + url + ');background-size:' + 64 * S + 'px;background-position:' + (-u * S) + 'px ' + (-v * S) + 'px;transform:' + tf + '"></i>';
    const box = (cx, cy, u, v, w, h, d, extra, cls) => { const g = extra || 0; const W = (w + g) * S, H = (h + g) * S, D = (d + g) * S; const f = (uu, vv, fw, fh, tf) => face(uu, vv, fw, fh, tf).replace('width:' + fw * S, 'width:' + (fw === w ? W : D) / 1).replace('height:' + fh * S, 'height:' + (fh === h ? H : D));
      return '<b class="rdb ' + (cls || '') + '" style="transform:translate3d(' + cx * S + 'px,' + cy * S + 'px,0)">' + [face(u + d, v + d, w, h, 'translateZ(' + D / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + W + 'px;height:' + H + 'px;margin:' + -H / 2 + 'px 0 0 ' + -W / 2 + 'px;'),
        face(u + 2 * d + w, v + d, w, h, 'rotateY(180deg) translateZ(' + D / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + W + 'px;height:' + H + 'px;margin:' + -H / 2 + 'px 0 0 ' + -W / 2 + 'px;'),
        face(u, v + d, d, h, 'rotateY(-90deg) translateZ(' + W / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + D + 'px;height:' + H + 'px;margin:' + -H / 2 + 'px 0 0 ' + -D / 2 + 'px;'),
        face(u + d + w, v + d, d, h, 'rotateY(90deg) translateZ(' + W / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + D + 'px;height:' + H + 'px;margin:' + -H / 2 + 'px 0 0 ' + -D / 2 + 'px;'),
        face(u + d, v, w, d, 'rotateX(90deg) translateZ(' + H / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + W + 'px;height:' + D + 'px;margin:' + -D / 2 + 'px 0 0 ' + -W / 2 + 'px;'),
        face(u + d + w, v, w, d, 'rotateX(-90deg) translateZ(' + H / 2 + 'px)').replace(/width:[^;]+;height:[^;]+;margin:[^;]+;/, 'width:' + W + 'px;height:' + D + 'px;margin:' + -D / 2 + 'px 0 0 ' + -W / 2 + 'px;')].join('') + '</b>'; };
    const aw = slim ? 3 : 4; const ac = i => { const s = me.armor[i]; if (!s) return null; const c = RR.ARMC[s.id.split('_')[0]] || [.8, .8, .8]; return 'rgba(' + c.map(v => v * 255 | 0).join(',') + ',.55)'; };
    const tint = (html, col) => col ? html.replace(/background-image:url\([^)]*\);/g, 'background:' + col + ';') : '';
    let h = '<b class="rdhead">' + box(0, -12, 0, 0, 8, 8, 8) + box(0, -12, 32, 0, 8, 8, 8, 1, 'ov') + tint(box(0, -12, 0, 0, 8, 8, 8, 1.6), ac(0)) + '</b>';
    h += box(0, -2, 16, 16, 8, 12, 4) + box(0, -2, 16, 32, 8, 12, 4, .6, 'ov') + tint(box(0, -2, 16, 16, 8, 12, 4, 1.2), ac(1));
    h += box(-4 - aw / 2, -2, 40, 16, aw, 12, 4) + box(-4 - aw / 2, -2, 40, 32, aw, 12, 4, .6, 'ov') + tint(box(-4 - aw / 2, -2, 40, 16, aw, 12, 4, 1.2), ac(1));
    h += box(4 + aw / 2, -2, 32, 48, aw, 12, 4) + box(4 + aw / 2, -2, 48, 48, aw, 12, 4, .6, 'ov') + tint(box(4 + aw / 2, -2, 32, 48, aw, 12, 4, 1.2), ac(1));
    h += box(-2, 10, 0, 16, 4, 12, 4) + box(-2, 10, 0, 32, 4, 12, 4, .6, 'ov') + tint(box(-2, 10, 0, 16, 4, 12, 4, 1), ac(2) || ac(3));
    h += box(2, 10, 16, 48, 4, 12, 4) + box(2, 10, 0, 48, 4, 12, 4, .6, 'ov') + tint(box(2, 10, 16, 48, 4, 12, 4, 1), ac(2) || ac(3));
    return '<div class="rdm" id="rbDm">' + h + '</div>';
  },
  dollLook(e) { const d = $('rbDoll'), m = $('rbDm'); if (!d || !m) return; const r = d.getBoundingClientRect(); const x = (e.clientX - (r.left + r.width / 2)) / 3, y = (e.clientY - (r.top + r.height * .25)) / 3;
    m.style.transform = 'rotateX(-8deg) rotateY(' + clamp(x * .6, -45, 45) + 'deg)'; const hd = m.querySelector('.rdhead'); if (hd) hd.style.transform = 'translate3d(0,' + (-8 * 3.4) + 'px,0) rotateY(' + clamp(x * .4, -35, 35) + 'deg) rotateX(' + clamp(-y * .6, -30, 30) + 'deg) translate3d(0,' + (8 * 3.4) + 'px,0)'; },
  // ---------- host: arena block palette (any blocks, any number of kinds, any weights or exact counts) ----------
  PAL_CHEST: { 27: 'A (조약돌 · 치유 물약 · 경험치 병 · 다이아)', 29: 'B (원목 · 철 원석 · 석탄 · 마법부여대 · 경험치 병)', 31: 'C (청금석 · 치유 물약 · 금 원석 · 경험치 병)' },
  palName(e) { if (e[0] === 'air') return '빈 공간 (공기)'; if (e[2]) return '상자 ' + (this.PAL_CHEST[e[2]] || e[2]); const B = BL[RBLK.K(e[0])]; if (!B) return e[0]; if (e[0].startsWith('chest')) return '빈 상자'; const I = RIT[B.item]; return (B.name !== e[0].split('|')[0] ? B.name : I ? RITEM.name({ id: B.item }) : B.name).replace(/§./g, ''); },
  palCands() {
    if (this._pc) return this._pc; const seen = new Set(), out = [['air', 1], ['chest|s', 1, 27], ['chest|w', 1, 29], ['chest|n', 1, 31], ['chest|e', 1]];
    const skip = /^(cmd|diode|door|wsign|wbanner|button|lever|plate|rtorch|trapdoor|gate|rail|ladder|carpet|chest|furnace_on|blast_furnace_on|redstone_lamp_on|barrier|deny|fire)/;
    for (let i = 1; i < RB_KEYS.length; i++) { const k = RB_KEYS[i]; if (skip.test(k) || /^(water|lava)\|[1-8]$/.test(k)) continue; const g = k.split('|').filter(x => !/^([nsewxyz]|[01]|[bt])$/.test(x)).join('|'); if (seen.has(g)) continue; seen.add(g); out.push([k, 1]); }
    return this._pc = out;
  },
  palHTML() {
    const g = this.gui; const host = RG.isHost(); const lobby = RG.gs.ph === 'lobby'; const ed = host && lobby; g.back = 'host';
    if (!g.pal) { const P = RG.gs.opts.pal; g.pal = (P && P.length ? P : RG.palDefault()).map(e => e.slice()); g.cnt = !!RG.gs.opts.palN; }
    const N = 33 * 33 * 15; const tot = g.pal.reduce((a, e) => a + Math.max(0, +e[1] || 0), 0);
    let h = '<div class="rgw rlist rpal"><div class="rlhead"><b>블록 커스텀</b><button class="rbtn" data-lb="back">◀ 뒤로</button><button class="rbtn" data-lb="x">✕ 닫기</button></div>';
    h += '<div class="rpmode"><button class="rbtn' + (!g.cnt ? ' on' : '') + '" data-pm="0">확률 (가중치)</button><button class="rbtn' + (g.cnt ? ' on' : '') + '" data-pm="1">개수 지정</button><small>' + (g.cnt ? '경기장 ' + N.toLocaleString() + '칸에 정확히 이 개수만큼 놓고, 남는 칸은 공기 · 넘치면 위에서부터 잘려요' : '경기장 ' + N.toLocaleString() + '칸마다 가중치 비율대로 무작위 · 원작은 33종이 각 1/33') + '</small></div>';
    if (!ed) h += '<div class="rgnote">' + (host ? '§c경기 중에는 바꿀 수 없어요 (로비에서 바꿔 주세요)' : '§c호스트 외 설정 불가능 (보기만 가능)').replace(/§./g, '') + '</div>';
    h += '<div class="rplist">';
    g.pal.forEach((e, i) => { const w = Math.max(0, +e[1] || 0); const pct = g.cnt ? Math.min(1, w / N) : tot ? w / tot : 0; const n = g.cnt ? Math.min(w, N) : Math.round(pct * N);
      h += '<div class="rpr"><img src="' + this.iconURL('blk:' + e[0]) + '"><span class="rpn">' + esc(this.palName(e)) + '</span><input type="number" min="0" step="' + (g.cnt ? 1 : 'any') + '" value="' + w + '" data-pw="' + i + '"' + (ed ? '' : ' disabled') + '><span class="rpp">' + (pct * 100).toFixed(pct < .01 && pct > 0 ? 2 : 1) + '%<br>≈' + n.toLocaleString() + '개</span>' + (ed ? '<button class="rbtn" data-px="' + i + '">✕</button>' : '') + '</div>'; });
    h += '</div>';
    if (g.cnt && tot > N) h += '<div class="rgnote" style="color:#a22">합계 ' + tot.toLocaleString() + '개 > ' + N.toLocaleString() + '칸 · 넘치는 만큼은 안 놓여요</div>';
    if (ed) {
      h += '<div class="rgflex rpbtn"><button class="rbtn" data-pa="1">＋ 블록 추가</button><button class="rbtn" data-pd="1">원작 기본값</button><button class="rbtn" data-pc="1">모두 지우기</button><button class="rbtn rpsave" data-ps="1">저장</button></div>';
      if (g.pick) { h += '<div class="rpick">'; this.palCands().forEach((c, i) => { h += '<img src="' + this.iconURL('blk:' + c[0]) + '" data-pk="' + i + '" title="' + esc(this.palName(c)) + '" data-tip="' + esc(this.palName(c)) + '">'; }); h += '</div>'; }
    }
    return h + '</div>';
  },
  palBind() {
    const g = this.gui, el = $('rbGui'); const q = s => el.querySelectorAll(s); const N = 33 * 33 * 15;
    for (const i of q('[data-pw]')) { i.onchange = () => { g.pal[+i.dataset.pw][1] = Math.max(0, +i.value || 0); this.render(); }; i.onkeydown = e => e.stopPropagation(); i.onmousedown = e => e.stopPropagation(); }
    for (const b of q('[data-px]')) b.onclick = () => { g.pal.splice(+b.dataset.px, 1); this.render(); };
    for (const b of q('[data-pm]')) b.onclick = () => { const c = b.dataset.pm === '1'; if (c === g.cnt) return; const tot = g.pal.reduce((a, e) => a + Math.max(0, +e[1] || 0), 0) || 1;
      g.pal.forEach(e => { e[1] = c ? Math.round((+e[1] || 0) / tot * N) : +e[1] || 0; }); g.cnt = c; this.render(); };
    const a = el.querySelector('[data-pa]'); if (a) a.onclick = () => { g.pick = !g.pick; this.render(); };
    const d = el.querySelector('[data-pd]'); if (d) d.onclick = () => { g.pal = RG.palDefault(); g.cnt = false; this.render(); };
    const c = el.querySelector('[data-pc]'); if (c) c.onclick = () => { g.pal = []; this.render(); };
    for (const b of q('[data-pk]')) b.onclick = () => { const C = this.palCands()[+b.dataset.pk]; const ex = g.pal.find(e => e[0] === C[0] && (e[2] || 0) === (C[2] || 0)); if (ex) ex[1] = (+ex[1] || 0) + (g.cnt ? 100 : 1); else g.pal.push([C[0], g.cnt ? 100 : 1].concat(C[2] ? [C[2]] : [])); this.render(); const L = $('rbGui').querySelector('.rplist'); if (L) L.scrollTop = 1e6; };
    const s = el.querySelector('[data-ps]'); if (s) s.onclick = () => { if (!RG.isHost() || RG.gs.ph !== 'lobby') return; const P = g.pal.filter(e => +e[1] > 0);
      const def = JSON.stringify(RG.palDefault()) === JSON.stringify(P) && !g.cnt; RG.gs.opts.pal = def ? null : P; RG.gs.opts.palN = def ? 0 : g.cnt ? 1 : 0; try { localStorage.setItem('rbs_host2', JSON.stringify(RG.gs.opts)); } catch (e) { }
      this.title('§d블록 커스텀', def ? '§7원작 기본값' : '§a' + P.length + '종 저장됨'); RAU.play('levelup', 1, true); this.close(true); this.pause(true, 'host'); };
    for (const b of q('[data-lb]')) b.onclick = e => { e.stopPropagation(); if (b.dataset.lb === 'x') this.close(); else { this.close(true); this.pause(true, 'host'); } };
  },
  menuAct(k) {
    const me = RG.me;
    switch (k) {
      case 'ready': this.ready(); break;
      case 'playground': { const a = RG.area(me); if (a === 'arena' || a === 'dm') return; if (me.spectator) me.mode = 'adventure'; RG.tp(me, RV.playground); this.close(); RAU.play('pop'); break; }
      case 'spec': this.close(true); this.spec(!me.spectator); break;
      case 'book': this.open('book', { p: 0 }); break;
      case 'multi': this.close(true); this.pause(true, 'multi'); break;
      case 'host': case 'settings': case 'more': this.close(true); this.pause(true, k === 'host' ? 'host' : k === 'settings' ? 'set' : 'main'); break;
    }
  },
  hostSet(k, v, title) {
    if (!RG.isHost()) { this.chat('§c호스트 외 설정 불가능'); RAU.play('anvil_land', 1, true); return; }
    RG.gs.opts[k] = v; try { localStorage.setItem('rbs_host2', JSON.stringify(RG.gs.opts)); } catch (e) { }
    const val = k === 'time' ? RV.TIME[v] : k === 'botLv' ? ['§a쉬움', '§e보통', '§c어려움'][v] : k === 'bots' ? v + '명' : k === 'big' ? (v ? '§c25명' : '§a9명') : v ? '§a허용' : '§c비허용';
    this.title(title, k === 'time' ? (v >= 21 || v <= 3 ? '§c' : v >= 15 ? '§6' : '§a') + val : val); RAU.play(v ? 'piston_out' : 'piston_in', 1, true);
    this.refresh();
  },
  ready() {
    const ph = RG.gs.ph; const me = RG.me;
    if (me.spectator) { this.chat('§c관전 중에는 준비할 수 없어요'); return; }
    if (RG.rd) { RG.rd = 0; this.chat('§7준비를 취소했어요'); this.refresh(); return; }
    if (ph !== 'lobby') { this.chat('§7게임이 끝나면 다시 준비해 주세요'); return; }
    if (this.humans() < 2 && RG.isHost() && !this._botAsked) { if (this.paused) this.menuTo(() => this.botPick()); else this.botPick(); return; } this._botAsked = false;
    RG.rd = 1; if (RG.gs.opts.time === 24) { RAU.sfx('sfx_error'); this.chat('§c지금은 게임 시작 금지 상태예요 (호스트 설정)'); } else RAU.play('toast', 1.5);
    this.chat('§a준비 완료! 준비한 플레이어가 2명 이상이면 시작됩니다.'); this.refresh();
  },
  humans() { return RG.players().filter(p => !p.isBot).length; },
  // single play: how many bots join the round (chosen when pressing Ready, not in the host settings). Bots start with nothing.
  botPick() {
    const cur = RG.gs.opts.bots | 0; let b = ''; for (const n of RG.gs.opts.big ? [1, 2, 3, 4, 6, 8, 12, 16, 20, 24] : [1, 2, 3, 4, 5, 6, 7, 8]) b += '<button class="rbtn rbn' + (n === (cur || 3) ? ' on' : '') + '" data-bn="' + n + '">' + n + '</button>';
    this.open('form', { html: '<div class="rgw rform rbotp"><b>싱글 플레이 · 봇 몇 명과 할까요?</b><small>봇은 아무 아이템 없이 시작해서 블록을 캐며 싸워요. 2명 이상이 준비해야 시작돼요.</small><div class="rbnrow">' + b + '</div><div class="rgflex"><button class="rbtn" data-bn="0">봇 없이 준비</button><button class="rbtn" data-bn="x">취소</button></div></div>',
      bind: el => { for (const e of el.querySelectorAll('[data-bn]')) e.onclick = () => { const v = e.dataset.bn; if (v === 'x') { this.close(); return; } RG.gs.opts.bots = +v; RBOT.manage(); this.close(); this._botAsked = true; this.ready(); if (+v) this.chat('§a봇 ' + v + '명이 함께해요'); }; } });
  },
  // the original book had 18 pages that weren't in the export; this one is written from the analysed game rules
  BOOK: [
    '§l랜덤블록 서바이벌§r\n튜토리얼 & 정보\n\n무작위 블록으로 가득 찬 큐브 안에서 캐고, 만들고, 싸워서 §c최후의 1명§r이 이기는 게임이에요.\n\n· 경기장 인원은 호스트가 §a9명§r(33×33×15) / §c25명§r(53×53×15) 중에서 골라요.\n· 로비는 가문비나무 대기실이고, 로비에서는 나약함이 걸려요.\n\n원작: {{V21}}',
    '§l시작하기§r\n\n핫바 5번 §fReady§r를 우클릭(모바일은 사용 버튼)하세요.\n준비한 플레이어가 §a2명 이상§r이면 경기장이 만들어지고 10초 뒤 시작해요.\n\n혼자라면 §6호스트 설정§r에서 봇을 추가할 수 있어요.',
    '§l경기장§r\n\n블록 33종이 무작위로 채워져요: 원목 · 돌 · 흙 · 자갈 · 각종 광석 · 책장 · 제작대 · 화로 · 용광로 · 유리 · 모루 · 상자.\n\n상자 3종류에는 조약돌, 투척용 치유의 물약 II, 경험치 병, 다이아몬드, 마법부여대 같은 아이템이 들어 있어요.',
    '§l생존 팁§r\n\n· 원목 → 판자 → 막대기 → 나무 곡괭이부터!\n· 철광석은 돌 곡괭이, 다이아몬드는 철 곡괭이가 필요해요.\n· 원석은 화로·용광로에서 녹여 주괴로.\n· 경험치 병 + 청금석 + 마법부여대 = 마법 부여.\n· 모든 플레이어는 항상 포만 상태라 체력이 빨리 차요.',
    '§l제한 시간 · 데스매치§r\n\n남은 시간은 화면 아래에 보여요. 1분 30초가 남으면 음악이 빨라져요.\n\n시간이 끝났는데 2명 이상 살아 있으면 §c데스매치§r! 네더 경기장으로 이동하고, 5초 뒤 PvP가 시작돼요. 45초 뒤에는 §c치명적 독§r(호스트 설정에 따라 용암), 60초 뒤에는 더 강한 치명적 독이 퍼져요. 25명 경기는 25인 데스매치 경기장을 써요.',
    '§l승리 · 업적§r\n\n마지막 1명이 승리 세리머니 방에서 축하를 받아요.\n\n업적: 달콤한 첫 승 · 5번째 승리 · 새로운 음악! · 1시간/2시간/6시간의 묘미 · 랜덤블록 중독자',
    '§l관전 · 놀이터§r\n\n탈락하면 로비로 돌아와요. 메뉴의 §b관전하기§r로 날아다니며 보거나 플레이어 시점으로 따라갈 수 있어요.\n\n§a놀이터§r는 기다리는 동안 맨손으로 싸우는 곳이에요. 어딘가에 숨겨진 던전과 §f소형 자폭 열쇠§r가 있다는 소문이…',
    '§l미니 랜덤블록 서바이벌§r\n\n놀이터 안 미니 경기장 옆 §e대기 패드§r에 2명이 들어서면 1:1 경기가 시작돼요.\n\n5×5×11 크기의 무작위 블록(상자 · 모루 · 제작대 · 유리 · 판자 · 돌 · 다이아 광석 · 원목) 속에서 §c60초§r 동안 힘 I · 성급함 I로 싸워요. 상자에는 보호 · 날카로움 책이 들어 있어요.',
    '§l호스트 설정§r\n\n게임시간 (30초 단위 ~10분, 무한, 랜덤, 시작 금지) · 경기장 인원 9명 / 25명 · 봇 난이도\n기본템 지급 · 시작 시 주변 블록 파괴 · 데스매치 건축 · 데스매치 용암 · 경기장 PvP · 방패 제작 · 블록 커스텀\n\n호스트는 방에 가장 먼저 들어온 사람이에요.',
  ],
});
