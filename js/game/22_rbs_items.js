// ===================== Random Block Survival: items, recipes, smelting, enchanting =====================
// Combat / tool values follow Bedrock 1.17 (the original world's version): no attack cooldown, sword 5/6/7/8 etc.
const RIT = {};
function rItem(id, o) { RIT[id] = Object.assign({ id, name: id, stack: 64 }, o); }
(() => {
  const TIER = { wooden: { n: '나무', t: 1, sp: 2, dur: 59, mat: 'planks', en: 15 }, stone: { n: '돌', t: 2, sp: 4, dur: 131, mat: 'cobblestone', en: 5 }, iron: { n: '철', t: 3, sp: 6, dur: 250, mat: 'iron_ingot', en: 14 }, golden: { n: '금', t: 1, sp: 12, dur: 32, mat: 'gold_ingot', en: 22 }, diamond: { n: '다이아몬드', t: 4, sp: 8, dur: 1561, mat: 'diamond', en: 10 } };
  const DMG = { sword: { wooden: 5, golden: 5, stone: 6, iron: 7, diamond: 8 }, axe: { wooden: 4, golden: 4, stone: 5, iron: 6, diamond: 7 }, pickaxe: { wooden: 3, golden: 3, stone: 4, iron: 5, diamond: 6 }, shovel: { wooden: 2, golden: 2, stone: 3, iron: 4, diamond: 5 } };
  const TN = { sword: '검', pickaxe: '곡괭이', axe: '도끼', shovel: '삽' };
  for (const tr in TIER) for (const ty in TN) rItem(tr + '_' + ty, { name: TIER[tr].n + ' ' + TN[ty], stack: 1, dmg: DMG[ty][tr], tool: ty === 'sword' ? null : { type: ty, tier: TIER[tr].t, sp: TIER[tr].sp }, sword: ty === 'sword', dur: TIER[tr].dur, tex: 'item/' + tr + '_' + ty, ench: ty === 'sword' ? 'sword' : ty === 'axe' ? 'axe' : 'tool', enchV: TIER[tr].en, fuel: tr === 'wooden' ? 200 : 0, tier: tr, ty });
  const AR = { iron: { n: '철', pts: [2, 6, 5, 2], dur: [165, 240, 225, 195], t: 0, en: 9 }, golden: { n: '금', pts: [2, 5, 3, 1], dur: [77, 112, 105, 91], t: 0, en: 25 }, diamond: { n: '다이아몬드', pts: [3, 8, 6, 3], dur: [363, 528, 495, 429], t: 2, en: 10 } };
  const AS = ['helmet', 'chestplate', 'leggings', 'boots'], ASN = ['투구', '흉갑', '레깅스', '부츠'];
  for (const m in AR) AS.forEach((s, i) => rItem(m + '_' + s, { name: AR[m].n + ' ' + ASN[i], stack: 1, armor: { slot: i, pts: AR[m].pts[i], tough: AR[m].t }, dur: AR[m].dur[i], tex: 'item/' + m + '_' + s, ench: 'armor', enchV: AR[m].en, tier: m }));
  const mat = { stick: '막대기', coal: '석탄', charcoal: '숯', raw_iron: '철 원석', raw_gold: '금 원석', iron_ingot: '철 주괴', gold_ingot: '금 주괴', iron_nugget: '철 조각', gold_nugget: '금 조각', diamond: '다이아몬드',
    lapis_lazuli: '청금석', redstone: '레드스톤 가루', flint: '부싯돌', quartz: '네더 석영', glowstone_dust: '발광석 가루', book: '책', emerald: '에메랄드' };
  for (const k in mat) rItem(k, { name: mat[k], tex: 'item/' + (k === 'quartz' ? 'iron_nugget' : k) });
  RIT.coal.fuel = 1600; RIT.charcoal.fuel = 1600; RIT.stick.fuel = 100;
  rItem('enchanted_book', { name: '마법이 부여된 책', stack: 1, tex: 'item/enchanted_book', glint: true, ench: 'book', enchV: 1 });
  rItem('experience_bottle', { name: '경험치 병', tex: 'item/experience_bottle', use: 'throw', proj: 'xp', glint: true });
  rItem('splash_potion', { name: '투척용 치유의 물약 II', stack: 1, tex: 'item/splash_potion', use: 'throw', proj: 'heal' });
  rItem('apple', { name: '사과', tex: 'item/apple', food: [4, 2.4] });
  rItem('golden_apple', { name: '황금 사과', tex: 'item/golden_apple', food: [4, 9.6], gold: true });
  rItem('shield', { name: '방패', stack: 1, tex: 'item/shield', shield: true, dur: 336, fuel: 300 });
  rItem('tripwire_hook', { name: '§f소형 자폭 열쇠', tex: 'item/tripwire_hook' });
  rItem('written_book', { name: '§e튜토리얼 & 정보', stack: 1, tex: 'item/written_book', glint: true, use: 'book', menu: 'book' });
  // menu items (the original pack replaced minecart / painting / saddle / brown dye icons with these)
  rItem('menu_ready', { name: '§f§lReady', stack: 1, img: 'ready', menu: 'ready' }); rItem('menu_settings', { name: '§c§l설정', stack: 1, img: 'settings', menu: 'settings' }); rItem('menu_playground', { name: '§a§l놀이터', stack: 1, img: 'playground', menu: 'playground' });
  rItem('menu_spec', { name: '§b§l관전하기', stack: 1, tex: 'item/ender_eye', menu: 'spec' }); rItem('menu_host', { name: '§6§l호스트 설정', stack: 1, block: 'crafting_table', menu: 'host' }); rItem('menu_more', { name: '§e§l메뉴', stack: 1, block: 'chest|s', menu: 'more' }); rItem('menu_help', { name: '도움말', stack: 1, img: 'help' });
  // blocks that exist as items
  const BI = ['stone', 'cobblestone', 'mossy_cobblestone', 'dirt', 'gravel', 'sand', 'oak_planks', 'birch_planks', 'spruce_planks', 'dark_oak_planks', 'oak_leaves', 'iron_ore', 'gold_ore', 'diamond_ore', 'lapis_ore', 'redstone_ore', 'coal_ore',
    'bookshelf', 'crafting_table', 'glass', 'diamond_block', 'iron_block', 'gold_block', 'lapis_block', 'coal_block', 'redstone_block', 'enchanting_table', 'stone_bricks', 'cracked_stone_bricks', 'netherrack', 'nether_bricks', 'glowstone', 'magma_block', 'ancient_debris', 'smooth_stone', 'tnt'];
  for (const k of BI) rItem(k, { name: RBLK.NAME[k] || k, block: k, place: k });
  rItem('oak_log', { name: '참나무 원목', block: 'log|oak|y', place: 'log', wood: 'oak', fuel: 300 }); rItem('birch_log', { name: '자작나무 원목', block: 'log|birch|y', place: 'log', wood: 'birch', fuel: 300 });
  for (const k of ['furnace', 'blast_furnace', 'chest']) rItem(k, { name: RBLK.NAME[k], block: k + '|s', place: k, fuel: k === 'chest' ? 300 : 0 });
  rItem('anvil', { name: '모루', block: 'anvil|x', place: 'anvil' }); rItem('torch', { name: '횃불', tex: 'torch', place: 'torch' }); rItem('ladder', { name: '사다리', tex: 'ladder', place: 'ladder', fuel: 300 });
  for (const k of ['oak_planks', 'birch_planks', 'spruce_planks', 'dark_oak_planks', 'crafting_table', 'bookshelf']) RIT[k].fuel = 300;
})();
const RITEM = {
  max(id) { const I = RIT[id]; return I ? I.stack : 64; },
  mk(id, n = 1, extra) { return Object.assign({ id, n }, extra || {}); },
  same(a, b) { return a && b && a.id === b.id && !a.d && !b.d && !a.en && !b.en && a.nm === b.nm; },
  name(s) { if (!s) return ''; const I = RIT[s.id]; return s.nm || (I ? I.name : s.id); },
  EN: { sharpness: ['날카로움', 5], efficiency: ['효율', 5], unbreaking: ['내구성', 3], protection: ['보호', 4], knockback: ['밀치기', 2], fire_aspect: ['발화', 2], fortune: ['행운', 3] },
  ROMAN: ['', 'I', 'II', 'III', 'IV', 'V'],
  enName(e, l) { return (this.EN[e] ? this.EN[e][0] : e) + ' ' + this.ROMAN[l]; },
  lore(s) { const L = []; if (s.en) for (const e in s.en) L.push('§7' + this.enName(e, s.en[e])); const I = RIT[s.id]; if (I && I.dur) L.push('§8내구도 ' + (I.dur - (s.d || 0)) + ' / ' + I.dur); if (I && I.dmg) L.push('§2공격 피해 ' + I.dmg); if (I && I.armor) L.push('§9방어 +' + I.armor.pts); return L; },
};
// ---------------- crafting (shaped: rows with letters; tags: #planks, #log, #coal) ----------------
const RREC = [];
function rRec(rows, keys, out, n = 1, opt) { RREC.push(Object.assign({ rows, keys, out, n }, opt || {})); }
(() => {
  rRec(['L'], { L: 'oak_log' }, 'oak_planks', 4); rRec(['L'], { L: 'birch_log' }, 'birch_planks', 4);
  rRec(['P', 'P'], { P: '#planks' }, 'stick', 4);
  rRec(['PP', 'PP'], { P: '#planks' }, 'crafting_table');
  rRec(['CCC', 'C.C', 'CCC'], { C: 'cobblestone' }, 'furnace');
  rRec(['PPP', 'P.P', 'PPP'], { P: '#planks' }, 'chest');
  rRec(['C', 'S'], { C: '#coal', S: 'stick' }, 'torch', 4);
  rRec(['S.S', 'SSS', 'S.S'], { S: 'stick' }, 'ladder', 3);
  const T = { wooden: '#planks', stone: 'cobblestone', iron: 'iron_ingot', golden: 'gold_ingot', diamond: 'diamond' };
  for (const t in T) {
    rRec(['M', 'M', 'S'], { M: T[t], S: 'stick' }, t + '_sword');
    rRec(['MMM', '.S.', '.S.'], { M: T[t], S: 'stick' }, t + '_pickaxe');
    rRec(['MM', 'MS', '.S'], { M: T[t], S: 'stick' }, t + '_axe');
    rRec(['M', 'S', 'S'], { M: T[t], S: 'stick' }, t + '_shovel');
  }
  for (const [m, i] of [['iron', 'iron_ingot'], ['golden', 'gold_ingot'], ['diamond', 'diamond']]) {
    rRec(['MMM', 'M.M'], { M: i }, m + '_helmet'); rRec(['M.M', 'MMM', 'MMM'], { M: i }, m + '_chestplate');
    rRec(['MMM', 'M.M', 'M.M'], { M: i }, m + '_leggings'); rRec(['M.M', 'M.M'], { M: i }, m + '_boots');
  }
  rRec(['PIP', 'PPP', '.P.'], { P: '#planks', I: 'iron_ingot' }, 'shield', 1, { shield: true });
  for (const [b, i] of [['iron_block', 'iron_ingot'], ['gold_block', 'gold_ingot'], ['diamond_block', 'diamond'], ['lapis_block', 'lapis_lazuli'], ['coal_block', 'coal'], ['redstone_block', 'redstone']]) { rRec(['MMM', 'MMM', 'MMM'], { M: i }, b); rRec(['B'], { B: b }, i, 9); }
  rRec(['NNN', 'NNN', 'NNN'], { N: 'iron_nugget' }, 'iron_ingot'); rRec(['I'], { I: 'iron_ingot' }, 'iron_nugget', 9);
  rRec(['NNN', 'NNN', 'NNN'], { N: 'gold_nugget' }, 'gold_ingot'); rRec(['I'], { I: 'gold_ingot' }, 'gold_nugget', 9);
  rRec(['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' }, 'golden_apple');
  rRec(['PPP', 'BBB', 'PPP'], { P: '#planks', B: 'book' }, 'bookshelf');
  rRec(['BBB', 'I.I', 'III'], { B: 'iron_block', I: 'iron_ingot' }, 'anvil');
  rRec(['III', 'IFI', 'SSS'], { I: 'iron_ingot', F: 'furnace', S: 'smooth_stone' }, 'blast_furnace');
  rRec(['SS', 'SS'], { S: 'stone' }, 'stone_bricks', 4);
  rRec(['GG', 'GG'], { G: 'glowstone_dust' }, 'glowstone');
})();
const RCRAFT = {
  tagOk(k, id) { if (!id) return false; if (k === '#planks') return /_planks$/.test(id); if (k === '#log') return /_log$/.test(id); if (k === '#coal') return id === 'coal' || id === 'charcoal'; return k === id; },
  // grid: array of slots (w*w). returns {r, out:{id,n}} or null
  match(grid, w) {
    let x0 = w, y0 = w, x1 = -1, y1 = -1; for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (grid[y * w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < 0) return null; const gw = x1 - x0 + 1, gh = y1 - y0 + 1;
    for (const r of RREC) {
      if (r.rows.length !== gh || r.rows[0].length !== gw) continue;
      for (const mir of [false, true]) {
        let ok = true;
        for (let y = 0; y < gh && ok; y++) for (let x = 0; x < gw && ok; x++) { const ch = r.rows[y][mir ? gw - 1 - x : x]; const s = grid[(y + y0) * w + x + x0]; if (ch === '.') { if (s) ok = false; } else if (!s || !this.tagOk(r.keys[ch], s.id) || s.d || s.en) ok = false; }
        if (ok) return { r, out: { id: r.out, n: r.n } };
      }
    }
    return null;
  },
};
// ---------------- smelting (furnace 10 s, blast furnace 5 s for ores / metal) ----------------
const RSMELT = { raw_iron: ['iron_ingot', .7, 1], raw_gold: ['gold_ingot', 1, 1], iron_ore: ['iron_ingot', .7, 1], gold_ore: ['gold_ingot', 1, 1], diamond_ore: ['diamond', 1, 1], lapis_ore: ['lapis_lazuli', .2, 1], redstone_ore: ['redstone', .7, 1], coal_ore: ['coal', .1, 1],
  cobblestone: ['stone', .1, 0], stone: ['smooth_stone', .1, 0], sand: ['glass', .1, 0], oak_log: ['charcoal', .15, 0], birch_log: ['charcoal', .15, 0], netherrack: ['nether_bricks', .1, 0], ancient_debris: ['iron_ingot', 2, 1] };
for (const t of ['iron', 'golden']) for (const s of ['sword', 'pickaxe', 'axe', 'shovel', 'helmet', 'chestplate', 'leggings', 'boots']) if (RIT[t + '_' + s]) RSMELT[t + '_' + s] = [t === 'iron' ? 'iron_nugget' : 'gold_nugget', .1, 1];
// ---------------- enchanting ----------------
const RENCH = {
  POOL: { sword: [['sharpness', 10], ['knockback', 5], ['fire_aspect', 2], ['unbreaking', 5]], axe: [['sharpness', 10], ['efficiency', 10], ['unbreaking', 5], ['fortune', 2]], tool: [['efficiency', 10], ['unbreaking', 5], ['fortune', 2]], armor: [['protection', 10], ['unbreaking', 5]], book: [['sharpness', 10], ['efficiency', 10], ['protection', 10], ['unbreaking', 5], ['knockback', 5], ['fire_aspect', 2], ['fortune', 2]] },
  // MC-like: 3 offers from bookshelf count; seed fixed per item so re-placing shows the same offer
  offers(item, shelves, seed) {
    const I = RIT[item.id]; if (!I || !I.ench || item.en) return null; let s = seed >>> 0; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
    const b = Math.min(15, shelves); const base = 1 + Math.floor(rnd() * 8) + Math.floor(b / 2) + Math.floor(rnd() * (b + 1));
    const lv = [Math.max(Math.floor(base / 3), 1), Math.floor(base * 2 / 3) + 1, Math.max(base, b * 2)];
    return lv.map((L, i) => ({ cost: L, lapis: i + 1, ens: this.roll(I, L, rnd) }));
  },
  roll(I, L, rnd) {
    const pool = this.POOL[I.ench] || []; let m = L + 1 + Math.floor(rnd() * (Math.floor(I.enchV / 4) + 1)) + Math.floor(rnd() * (Math.floor(I.enchV / 4) + 1)); m = Math.max(1, Math.round(m * (1 + (rnd() + rnd() - 1) * .15)));
    const out = {}; const pick = () => { const tot = pool.reduce((a, e) => a + (out[e[0]] ? 0 : e[1]), 0); if (!tot) return; let r = rnd() * tot; for (const e of pool) { if (out[e[0]]) continue; r -= e[1]; if (r <= 0) { const mx = RITEM.EN[e[0]][1]; out[e[0]] = clamp(Math.ceil(m / (40 / mx)) , 1, mx); return; } } };
    pick(); while (rnd() < (m + 1) / 50) { pick(); m = Math.floor(m / 2); }
    return out;
  },
};
