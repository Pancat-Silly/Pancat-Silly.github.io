// ===================== Random Block Survival: block registry (built from RB_KEYS) =====================
// BL[id] gets: tiles [S,N,W,E,U,D] (atlas tile per face), shape (full / boxes / dyn(world,x,y,z) / cross / liquid),
// mining (hard, tool, tier), sounds (snd), drops, and the item it places / gives.
const RBLK = {
  id: {}, // key -> id
  MAT: { // material -> [side, top, bottom] textures
    oak_planks: ['oak_planks'], spruce_planks: ['spruce_planks'], birch_planks: ['birch_planks'], dark_oak_planks: ['dark_oak_planks'],
    cobblestone: ['cobblestone'], mossy_cobblestone: ['mossy_cobblestone'], stone: ['stone'], stone_bricks: ['stone_bricks'], mossy_stone_bricks: ['mossy_stone_bricks'],
    bricks: ['bricks'], nether_bricks: ['nether_bricks'], red_nether_bricks: ['red_nether_bricks'], sandstone: ['sand'],
    smooth_stone: ['smooth_stone_slab_side', 'smooth_stone', 'smooth_stone'], quartz_block: ['quartz_block_side', 'quartz_block_top', 'quartz_block_top'], smooth_quartz: ['quartz_block_bottom'],
  },
  NAME: {
    stone: '돌', cobblestone: '조약돌', mossy_cobblestone: '이끼 낀 조약돌', dirt: '흙', coarse_dirt: '거친 흙', grass_block: '잔디 블록', podzol: '회백토', dirt_path: '흙길', gravel: '자갈', sand: '모래',
    oak_planks: '참나무 판자', spruce_planks: '가문비나무 판자', birch_planks: '자작나무 판자', dark_oak_planks: '짙은 참나무 판자', oak_log: '참나무 원목', birch_log: '자작나무 원목',
    oak_leaves: '참나무 잎', birch_leaves: '자작나무 잎', iron_ore: '철광석', gold_ore: '금광석', diamond_ore: '다이아몬드 광석', lapis_ore: '청금석 광석', redstone_ore: '레드스톤 광석', coal_ore: '석탄 광석',
    bookshelf: '책장', crafting_table: '제작대', glass: '유리', bedrock: '기반암', diamond_block: '다이아몬드 블록', iron_block: '철 블록', gold_block: '금 블록', lapis_block: '청금석 블록',
    coal_block: '석탄 블록', redstone_block: '레드스톤 블록', enchanting_table: '마법부여대', torch: '횃불', deny: '거부 블록', cracked_stone_bricks: '금 간 석재 벽돌', stone_bricks: '석재 벽돌', tnt: 'TNT',
    furnace: '화로', blast_furnace: '용광로', chest: '상자', anvil: '모루', water: '물', lava: '용암', glowstone: '발광석', netherrack: '네더랙', nether_bricks: '네더 벽돌', red_nether_bricks: '붉은 네더 벽돌',
    nether_bedrock: '네더 기반암', magma_block: '마그마 블록', quartz_ore: '네더 석영 광석', nether_gold_ore: '네더 금광석', ancient_debris: '고대 잔해', fire: '불', ladder: '사다리', smooth_stone: '매끄러운 돌',
    barrier: '방벽', sponge: '럭키 블록', black_concrete: '검은색 콘크리트', emerald_block: '에메랄드 블록', obsidian: '흑요석',
  },
  build() {
    BL.length = 0; defB(0, { name: 'air', solid: false, full: false, opaque: false, air: true, repl: true });
    RB_KEYS.forEach((k, i) => { if (i) { this.id[k] = i; BL[i] = this.def(k, i); } });
  },
  T(n) { return RTEX.T(n); },
  tiles6(side, top, bottom, front, fdir) { const s = this.T(side), t = this.T(top || side), b = this.T(bottom || top || side); const a = [s, s, s, s, t, b]; if (front) a['snwe'.indexOf(fdir)] = this.T(front); return a; },
  def(key, id) {
    const p = key.split('|'), k0 = p[0]; const T = n => this.T(n);
    const B = { id, key, name: this.NAME[k0] || k0, solid: true, full: true, opaque: true, trans: false, emis: false, col: [1, 1, 1], boxes: null, alpha: 1,
      hard: 1, tool: null, tier: 0, snd: 'stone', item: k0, drop: null };
    const full = (side, top, bottom, front, fd) => { B.tiles = this.tiles6(side, top, bottom, front, fd); };
    const box = (bx, side, top, bottom) => { B.full = false; B.opaque = false; B.boxes = bx; B.tiles = this.tiles6(side, top, bottom); };
    const mine = (hard, tool, tier, snd) => { B.hard = hard; B.tool = tool || null; B.tier = tier || 0; if (snd) B.snd = snd; };
    switch (k0) {
      case 'stone': full('stone'); mine(1.5, 'pickaxe', 1); B.drop = 'cobblestone'; break;
      case 'cobblestone': case 'mossy_cobblestone': full(k0); mine(2, 'pickaxe', 1); break;
      case 'dirt': case 'coarse_dirt': full(k0); mine(.5, 'shovel', 0, 'gravel'); B.item = 'dirt'; break;
      case 'grass_block': full('grass_block_side', 'grass_block_top', 'dirt'); mine(.6, 'shovel', 0, 'grass'); B.drop = 'dirt'; break;
      case 'podzol': full('podzol_side', 'podzol_top', 'dirt'); mine(.5, 'shovel', 0, 'gravel'); B.drop = 'dirt'; break;
      case 'dirt_path': box([[0, 0, 0, 1, 15 / 16, 1]], 'dirt_path_side', 'dirt_path_top', 'dirt'); B.solid = true; mine(.65, 'shovel', 0, 'gravel'); B.drop = 'dirt'; break;
      case 'gravel': full('gravel'); mine(.6, 'shovel', 0, 'gravel'); B.fall = true; B.drop = (r) => r < .1 ? 'flint' : 'gravel'; break;
      case 'sand': full('sand'); mine(.5, 'shovel', 0, 'sand'); B.fall = true; break;
      case 'oak_planks': case 'spruce_planks': case 'birch_planks': case 'dark_oak_planks': full(k0); mine(2, 'axe', 0, 'wood'); B.fuel = 300; break;
      case 'log': { const w = p[1], ax = p[2]; const s = w + '_log', t = w + '_log_top'; if (ax === 'y') full(s, t, t); else if (ax === 'x') B.tiles = [T(s), T(s), T(t), T(t), T(s), T(s)]; else B.tiles = [T(t), T(t), T(s), T(s), T(s), T(s)]; mine(2, 'axe', 0, 'wood'); B.item = w + '_log'; B.name = this.NAME[w + '_log'] || '원목'; B.fuel = 300; break; }
      case 'oak_leaves': case 'birch_leaves': full(k0); B.opaque = false; B.cut = true; mine(.2, 'hoe', 0, 'grass'); B.drop = (r, fort) => r < .005 * (1 + (fort || 0)) ? 'apple' : r < .025 ? 'stick' : null; break;
      case 'coal_ore': full(k0); mine(3, 'pickaxe', 1); B.drop = 'coal'; B.xp = [0, 2]; B.fort = true; break;
      case 'iron_ore': full(k0); mine(3, 'pickaxe', 2); B.drop = 'raw_iron'; B.fort = true; B.smelt = 'iron_ingot'; break;
      case 'gold_ore': full(k0); mine(3, 'pickaxe', 3); B.drop = 'raw_gold'; B.fort = true; break;
      case 'diamond_ore': full(k0); mine(3, 'pickaxe', 3); B.drop = 'diamond'; B.xp = [3, 7]; B.fort = true; break;
      case 'lapis_ore': full(k0); mine(3, 'pickaxe', 2); B.drop = 'lapis_lazuli'; B.dropN = [4, 9]; B.xp = [2, 5]; B.fort = true; break;
      case 'redstone_ore': full(k0); mine(3, 'pickaxe', 3); B.drop = 'redstone'; B.dropN = [4, 5]; B.xp = [1, 5]; B.fort = true; break;
      case 'quartz_ore': full(k0); mine(3, 'pickaxe', 1); B.drop = 'quartz'; B.xp = [2, 5]; B.snd = 'nether'; break;
      case 'nether_gold_ore': full(k0); mine(3, 'pickaxe', 1); B.drop = 'gold_nugget'; B.dropN = [2, 6]; B.snd = 'nether'; break;
      case 'ancient_debris': full('ancient_debris_side', 'ancient_debris_top'); mine(30, 'pickaxe', 4); break;
      case 'bookshelf': full('bookshelf', 'oak_planks'); mine(1.5, 'axe', 0, 'wood'); B.drop = 'book'; B.dropN = [3, 3]; B.fuel = 300; break;
      case 'crafting_table': full('crafting_table_side', 'crafting_table_top', 'oak_planks', 'crafting_table_front', 'n'); B.tiles[0] = T('crafting_table_front'); mine(2.5, 'axe', 0, 'wood'); B.use = 'craft'; B.fuel = 300; break;
      case 'glass': full('glass'); B.opaque = false; B.cut = true; B.glass = true; mine(.3, null, 0, 'glass'); B.drop = null; B.noDrop = true; break;
      case 'bedrock': full('bedrock'); B.unbreak = true; break;
      case 'nether_bedrock': full('nether_bedrock_rp'); B.unbreak = true; B.name = '네더 기반암'; break;
      case 'deny': full('deny'); B.unbreak = true; break;
      case 'barrier': B.tiles = [0, 0, 0, 0, 0, 0]; B.invisible = true; B.opaque = false; B.unbreak = true; break;
      case 'diamond_block': case 'iron_block': case 'gold_block': case 'emerald_block': case 'lapis_block': case 'redstone_block': full(k0); mine(5, 'pickaxe', k0 === 'diamond_block' || k0 === 'gold_block' || k0 === 'emerald_block' ? 3 : k0 === 'lapis_block' || k0 === 'iron_block' ? 2 : 1, 'metal'); break;
      case 'coal_block': full(k0); mine(5, 'pickaxe', 1); B.fuel = 16000; break;
      case 'enchanting_table': box([[0, 0, 0, 1, .75, 1]], 'enchanting_table_side', 'enchanting_table_top', 'obsidian'); B.solid = true; mine(5, 'pickaxe', 1); B.use = 'enchant'; break;
      case 'torch': case 'rtorch': { // Bedrock: torch_facing_direction names the SUPPORT side (rules v2); 'top' = standing
        const d = p[1] || 'top', lit = k0 === 'torch' || p[2] === '1'; const tl = k0 === 'torch' ? 'torch' : lit ? 'redstone_torch' : 'redstone_torch_off';
        const off = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[d] || [0, 0]; const cx = .5 + off[0] * .32, cz = .5 + off[1] * .32, y0 = d === 'top' ? 0 : .2;
        box([[cx - 1 / 16, y0, cz - 1 / 16, cx + 1 / 16, y0 + 10 / 16, cz + 1 / 16]], tl, tl); B.solid = false; B.cross = true; B.crossOff = [off[0] * .32, y0, off[1] * .32]; B.crossH = .7; B.tiles = [T(tl), 0, 0, 0, 0, 0];
        mine(0, null, 0, 'wood'); B.repl = false; B.emis = lit; if (k0 === 'rtorch') { B.item = null; B.unbreak = true; } break; }
      case 'stone_bricks': case 'mossy_stone_bricks': case 'cracked_stone_bricks': full(k0); mine(1.5, 'pickaxe', 1); break;
      case 'tnt': full('tnt_side', 'tnt_top', 'tnt_bottom'); mine(0, null, 0, 'grass'); break;
      case 'furnace': case 'furnace_on': case 'blast_furnace': case 'blast_furnace_on': { const bf = k0.startsWith('blast'), on = k0.endsWith('_on'); const b = bf ? 'blast_furnace' : 'furnace'; full(b + '_side', b + '_top', b + '_top', b + '_front' + (on ? '_on' : ''), p[1]); mine(3.5, 'pickaxe', 1); B.use = 'furnace'; B.blast = bf; B.item = b; B.dir = p[1]; B.on = on; B.name = this.NAME[b]; if (on) B.emis = true; break; }
      case 'chest': { box([[1 / 16, 0, 1 / 16, 15 / 16, 14 / 16, 15 / 16]], 'chest_side', 'chest_top', 'chest_top'); B.solid = true; B.tiles['snwe'.indexOf(p[1])] = T('chest_front'); mine(2.5, 'axe', 0, 'wood'); B.use = 'chest'; B.dir = p[1]; break; }
      case 'anvil': { const x = p[1] === 'x'; B.fall = true; B.anvil = true; box(x ? [[0, 0, 2 / 16, 1, 4 / 16, 14 / 16], [3 / 16, 4 / 16, 4 / 16, 13 / 16, 10 / 16, 12 / 16], [0, 10 / 16, 3 / 16, 1, 1, 13 / 16]] : [[2 / 16, 0, 0, 14 / 16, 4 / 16, 1], [4 / 16, 4 / 16, 3 / 16, 12 / 16, 10 / 16, 13 / 16], [3 / 16, 10 / 16, 0, 13 / 16, 1, 1]], 'anvil', 'anvil_top', 'anvil'); B.solid = true; mine(5, 'pickaxe', 1, 'metal'); B.use = 'anvil'; B.fall = true; B.axis = p[1]; break; }
      case 'water': case 'lava': { const lv = +p[1]; B.liquid = k0; B.level = lv; B.solid = false; B.full = false; B.opaque = false; B.trans = k0 === 'water'; B.lava = k0 === 'lava'; B.emis = B.lava; B.unbreak = true; B.repl = true; B.tiles = this.tiles6(k0 + '_still'); B.h = lv === 0 ? 14 / 16 : lv >= 8 ? 1 : Math.max(2, 14 - lv * 1.7) / 16; B.item = null; break; }
      case 'glowstone': full('glowstone'); mine(.3, null, 0, 'glass'); B.emis = true; B.drop = 'glowstone_dust'; B.dropN = [2, 4]; break;
      case 'netherrack': full('netherrack'); mine(.4, 'pickaxe', 1, 'nether'); break;
      case 'nether_bricks': case 'red_nether_bricks': full(k0); mine(2, 'pickaxe', 1, 'nether'); break;
      case 'magma_block': full('magma'); mine(.5, 'pickaxe', 1); B.emis = true; B.magma = true; break;
      case 'fire': B.full = false; B.opaque = false; B.solid = false; B.cross = true; B.tiles = [T('fire_0'), 0, 0, 0, 0, 0]; B.boxes = [[0, 0, 0, 1, 1, 1]]; B.fire = true; B.emis = true; mine(0, null, 0, 'wood'); B.repl = true; B.noDrop = true; break;
      case 'glowstone_': break;
      case 'slab': { const top = p[2] === 't'; const m = this.MAT[p[1]] || [p[1]]; box(top ? [[0, .5, 0, 1, 1, 1]] : [[0, 0, 0, 1, .5, 1]], m[0], m[1], m[2]); B.solid = true; mine(2, p[1].includes('planks') ? 'axe' : 'pickaxe', p[1].includes('planks') ? 0 : 1, p[1].includes('planks') ? 'wood' : 'stone'); B.name = (this.NAME[p[1]] || p[1]) + ' 반 블록'; break; }
      case 'stairs': { const m = this.MAT[p[1]] || [p[1]]; box(RBLK.stairBoxes(p[2], p[3] === '1', 'straight'), m[0], m[1], m[2]); B.solid = true; B.stair = p[2]; B.upside = p[3] === '1';
        const cache = {}; B.dyn = (w, x, y, z) => { const sh = RBLK.stairShape(w, x, y, z, B); return cache[sh] || (cache[sh] = RBLK.stairBoxes(B.stair, B.upside, sh)); }; mine(2, p[1].includes('planks') ? 'axe' : 'pickaxe', p[1].includes('planks') ? 0 : 1, p[1].includes('planks') ? 'wood' : 'stone'); B.name = (this.NAME[p[1]] || p[1]) + ' 계단'; break; }
      case 'fence': case 'pane': case 'wall': {
        const m = this.MAT[p[1]] || [p[1]]; const tile = k0 === 'pane' ? (p[1] === 'glass' ? 'glass' : 'iron_bars') : m[0];
        B.full = false; B.opaque = false; B.tiles = this.tiles6(tile, k0 === 'pane' ? tile : (m[1] || m[0])); B.conn = k0; B.cut = k0 === 'pane'; B.snd = k0 === 'pane' ? (p[1] === 'glass' ? 'glass' : 'metal') : p[1].includes('planks') ? 'wood' : 'stone';
        const W = k0 === 'fence' ? [6, 10, 1.5] : k0 === 'wall' ? [4, 12, 1] : [7, 9, 1]; const lo = W[0] / 16, hi = W[1] / 16, hh = k0 === 'fence' ? 1.5 : 1;
        const post = k0 === 'pane' ? [] : [[lo, 0, lo, hi, 1, hi]]; const arm = { n: [lo, 0, 0, hi, 1, lo], s: [lo, 0, hi, hi, 1, 1], w: [0, 0, lo, lo, 1, hi], e: [hi, 0, lo, 1, 1, hi] };
        const cache = {}; B.dyn = (w, x, y, z) => { const c = (dx, dz) => { const N = BL[w.get(x + dx, y, z + dz)]; return N.conn && (N.conn === B.conn || (B.conn !== 'pane') === (N.conn !== 'pane')) || (N.full && N.opaque && N.solid); };
          const m2 = (c(0, -1) ? 1 : 0) | (c(0, 1) ? 2 : 0) | (c(-1, 0) ? 4 : 0) | (c(1, 0) ? 8 : 0);
          return cache[m2] || (cache[m2] = (() => { const r = post.slice(); if (m2 & 1) r.push(arm.n); if (m2 & 2) r.push(arm.s); if (m2 & 4) r.push(arm.w); if (m2 & 8) r.push(arm.e); if (!r.length) r.push([lo, 0, lo, hi, 1, hi]); return r; })()); };
        B.colH = hh; mine(2, k0 === 'fence' && p[1].includes('planks') ? 'axe' : 'pickaxe', 0); break;
      }
      case 'door': { // door|mat|F|open|hinge|half  F = facing (rules v2): closed panel on the side opposite F, open panel on the hinge side
        const [, mat, F, op, hg, half] = p; const open = op === '1'; const L = { e: 'n', s: 'e', w: 's', n: 'w' }, R = { e: 's', s: 'w', w: 'n', n: 'e' }, O = { e: 'w', w: 'e', n: 's', s: 'n' };
        const side = open ? (hg === 'l' ? L[F] : R[F]) : O[F]; box([RBLK.panel(side, 3 / 16)], mat + '_door_' + (half === 'u' ? 'top' : 'bottom')); B.solid = true; B.cut = true; mine(3, 'axe', 0, 'wood'); B.name = '문'; B.use = 'door'; B.open = open; B.half = half; B.item = null; B.unbreak = true; break; }
      case 'trapdoor': { // trapdoor|mat|hingeSide|open|up
        const [, mat, H, op, up] = p; const tx = (mat === 'oak' ? 'oak' : mat) + '_trapdoor'; const t3 = 3 / 16;
        box([op === '1' ? RBLK.panel(H, t3) : (up === '1' ? [0, 1 - t3, 0, 1, 1, 1] : [0, 0, 0, 1, t3, 1])], tx); B.solid = true; B.cut = true; mine(3, 'axe', 0, 'wood'); B.use = 'trapdoor'; B.item = null; B.unbreak = true; B.name = '다락문'; break; }
      case 'gate': { // gate|mat|F|open — plane perpendicular to the facing
        const [, mat, F, op] = p; const ns = F === 'n' || F === 's'; const P = (a0, a1) => ns ? [a0, 0, 7 / 16, a1, 1, 9 / 16] : [7 / 16, 0, a0, 9 / 16, 1, a1];
        const bx = [P(0, 2 / 16), P(14 / 16, 1)]; if (op !== '1') bx.push(ns ? [2 / 16, 6 / 16, 7 / 16, 14 / 16, 15 / 16, 9 / 16] : [7 / 16, 6 / 16, 2 / 16, 9 / 16, 15 / 16, 14 / 16]);
        box(bx, mat + '_planks'); B.solid = op !== '1'; B.colH = 1.5; mine(2, 'axe', 0, 'wood'); B.use = 'gate'; B.item = null; B.unbreak = true; B.name = '울타리 문'; break; }
      case 'lever': { // lever|direction|on — wall levers face that direction (support on the opposite side)
        const [, d, on] = p; const up = on === '1'; let bx;
        const wall = { north: 's', south: 'n', east: 'w', west: 'e' }[d];
        if (wall) { const base = RBLK.panel(wall, 3 / 16).map((v, i) => (i === 1 ? .3 : i === 4 ? .7 : (wall === 'n' || wall === 's') ? (i === 0 ? .3125 : i === 3 ? .6875 : v) : (i === 2 ? .3125 : i === 5 ? .6875 : v)));
          const out = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[wall]; const cx = .5 + out[0] * .3, cz = .5 + out[1] * .3; const hy = up ? [.5, .85] : [.15, .5];
          bx = [base, [cx - .05, hy[0], cz - .05, cx + .05, hy[1], cz + .05]]; }
        else bx = [[.3, 0, .3, .7, .19, .7], up ? [.45, .19, .45, .55, .65, .55] : [.45, .19, .45, .55, .5, .55]];
        box(bx, 'cobblestone'); B.solid = false; B.use = 'lever'; B.on = up; B.item = null; B.unbreak = true; B.name = '레버'; break; }
      case 'diode': box([[0, 0, 0, 1, 2 / 16, 1], [7 / 16, 2 / 16, 7 / 16, 9 / 16, 5 / 16, 9 / 16]], p[1] === 'repeater' ? 'repeater' : 'comparator', p[1] === 'repeater' ? 'repeater' : 'comparator'); B.solid = true; B.unbreak = true; B.item = null; break;
      case 'cmd': { const kd = p[1]; full('command_block_' + kd + '_side', 'command_block_' + kd + '_side', 'command_block_' + kd + '_side'); const f = +p[2]; const fi = { 2: 1, 3: 0, 4: 2, 5: 3, 0: 5, 1: 4 }[f]; if (fi !== undefined) B.tiles[fi] = this.T('command_block_' + kd + '_front'); B.unbreak = true; B.name = '커맨드 블록'; B.item = null; break; }
      case 'ladder': { const LT = 3 / 16; const bx = { n: [[0, 0, 1 - LT, 1, 1, 1]], s: [[0, 0, 0, 1, 1, LT]], w: [[1 - LT, 0, 0, 1, 1, 1]], e: [[0, 0, 0, LT, 1, 1]] }[p[1]]; box(bx, 'ladder'); B.solid = false; B.ladder = true; B.cut = true; B.tiles = this.tiles6('ladder'); mine(.4, 'axe', 0, 'ladder'); B.item = 'ladder'; B.dir = p[1]; break; }
      case 'wsign': { const t1 = 2 / 16; const bx = { n: [[0, .3, 1 - t1, 1, .85, 1]], s: [[0, .3, 0, 1, .85, t1]], w: [[1 - t1, .3, 0, 1, .85, 1]], e: [[0, .3, 0, t1, .85, 1]] }[p[2]]; box(bx, p[1] + '_planks'); B.solid = false; B.sign = p[2]; mine(1, 'axe', 0, 'wood'); B.name = '표지판'; break; }
      case 'wbanner': { const t1 = 1 / 16; const bx = { n: [[.1, -.9, 1 - t1, .9, 1, 1]], s: [[.1, -.9, 0, .9, 1, t1]], w: [[1 - t1, -.9, .1, 1, 1, .9]], e: [[0, -.9, .1, t1, 1, .9]] }[p[1]]; box(bx, 'banner'); B.solid = false; B.col = [.95, .95, .95]; break; }
      case 'button': { const f = +p[2]; const pr = p[3] === '1'; const s = p[1] === 'stone' ? 'stone' : p[1] + '_planks'; let bx = [[[.35, .875, .3, .65, 1, .7]], [[.35, 0, .3, .65, .125, .7]], [[.3, .35, .875, .7, .65, 1]], [[.3, .35, 0, .7, .65, .125]], [[.875, .35, .3, 1, .65, .7]], [[0, .35, .3, .125, .65, .7]]][f] || [[.35, 0, .3, .65, .125, .7]]; if (pr) bx = bx.map(b => { const e = [b[3] - b[0], b[4] - b[1], b[5] - b[2]]; const ax = e.indexOf(Math.min(...e)); const c = b.slice(); if (b[ax] <= 0) c[ax + 3] = 1 / 16; else c[ax] = 1 - 1 / 16; return c; });
        box(bx, s); B.solid = false; mine(.5, null, 0, 'stone'); B.use = 'button'; B.on = pr; B.item = null; B.unbreak = true; B.name = '버튼'; break; }
      case 'plate': box([[1 / 16, 0, 1 / 16, 15 / 16, p[2] === '1' ? .5 / 16 : 1 / 16, 15 / 16]], p[1] === 'stone' ? 'stone' : p[1] + '_planks'); B.solid = false; B.plate = true; B.on = p[2] === '1'; B.unbreak = true; B.item = null; B.name = '감압판'; break;
      case 'ssign': { const x = p[2] === 'x'; box([x ? [7 / 16, .5, 0, 9 / 16, 1, 1] : [0, .5, 7 / 16, 1, 1, 9 / 16], [7.5 / 16, 0, 7.5 / 16, 8.5 / 16, .5, 8.5 / 16]], (p[1] === 'oak' ? 'oak' : p[1]) + '_planks'); B.solid = false; B.unbreak = true; B.item = null; B.name = '표지판'; break; }
      case 'rwire': box([[0, 0, 0, 1, 1 / 32, 1]], 'redstone_wire', 'redstone_wire'); B.solid = false; B.unbreak = true; B.item = null; break;
      case 'stem': { const s = p[1] + '_stem', t = s + '_top'; if (p[2] === 'y') full(s, t, t); else if (p[2] === 'x') B.tiles = [T(s), T(s), T(t), T(t), T(s), T(s)]; else B.tiles = [T(t), T(t), T(s), T(s), T(s), T(s)]; mine(2, 'axe', 0, 'wood'); break; }
      case 'warped_nylium': case 'crimson_nylium': full(k0 + '_side', k0, 'netherrack'); mine(.4, 'pickaxe', 1, 'nether'); B.drop = 'netherrack'; break;
      case 'carpet': box([[0, 0, 0, 1, 1 / 16, 1]], p[1] + '_wool'); B.solid = true; B.snd = 'cloth'; mine(.1, null, 0, 'cloth'); break;
      case 'rail': box([[0, 0, 0, 1, 1 / 16, 1]], 'rail'); B.solid = false; B.cut = true; break;
      case 'plant': { const n = p[1]; B.full = false; B.opaque = false; B.solid = false; B.cross = true; B.boxes = [[.15, 0, .15, .85, .8, .85]]; B.tiles = [T(n), 0, 0, 0, 0, 0]; mine(0, null, 0, 'grass'); B.repl = n.includes('grass') || n === 'fern'; B.noDrop = B.repl; B.name = '식물'; break; }
      case 'composter': full('composter_side', 'composter_top', 'composter_side'); mine(.6, 'axe', 0, 'wood'); break;
      case 'scaffolding': full('scaffolding_side', 'scaffolding_top'); B.opaque = false; B.cut = true; B.ladder = true; B.scaf = true; /* collision: only the top, and not while sneaking (RWorld.boxes) */ mine(0, null, 0, 'wood'); break;
      case 'campfire': box([[0, 0, 0, 1, 7 / 16, 1]], 'campfire_log', 'campfire_log'); B.solid = true; B.emis = true; mine(2, 'axe', 0, 'wood'); break;
      case 'bell': box([[.25, .25, .25, .75, .9, .75]], 'bell'); B.solid = true; mine(5, 'pickaxe', 0, 'metal'); break;
      case 'sponge': full('sponge'); mine(.6, null, 0, 'grass'); B.name = '럭키 블록'; break;
      case 'redstone_lamp': case 'redstone_lamp_on': full(k0); mine(.3, null, 0, 'glass'); B.emis = k0.endsWith('on'); B.lamp = true; break;
      case 'sea_lantern': full('sea_lantern'); mine(.3, null, 0, 'glass'); B.emis = true; break;
      case 'smooth_stone': full('smooth_stone'); mine(2, 'pickaxe', 1); break;
      case 'quartz_block': full('quartz_block_side', 'quartz_block_top'); mine(.8, 'pickaxe', 1); break;
      case 'smooth_quartz': full('quartz_block_bottom'); mine(2, 'pickaxe', 1); break;
      case 'quartz_pillar': full('quartz_pillar', 'quartz_pillar_top'); mine(.8, 'pickaxe', 1); break;
      case 'black_concrete': full('black_concrete'); mine(1.8, 'pickaxe', 1); break;
      case 'bricks': full('bricks'); mine(2, 'pickaxe', 1); break;
      default: if (k0.endsWith('_stained_glass')) { full(k0); B.opaque = false; B.trans = true; B.cut = true; B.glass = true; mine(.3, null, 0, 'glass'); B.noDrop = true; break; }
        full(k0); mine(1.5, 'pickaxe', 0);
    }
    if (!B.tiles) B.tiles = this.tiles6(k0);
    if (B.cross && !B.boxes) B.boxes = [[.2, 0, .2, .8, .8, .8]];
    if (B.unbreak) B.hard = -1;
    return B;
  },
  K(key) { return this.id[key] || 0; },
  // thin panel on one side of the cell (n = z 0 side, s = z 1 side, w = x 0 side, e = x 1 side)
  panel(side, t) { return { n: [0, 0, 0, 1, 1, t], s: [0, 0, 1 - t, 1, 1, 1], w: [0, 0, 0, t, 1, 1], e: [1 - t, 0, 0, 1, 1, 1] }[side]; },
  DV: { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] }, CCW: { n: 'w', w: 's', s: 'e', e: 'n' }, CW: { n: 'e', e: 's', s: 'w', w: 'n' }, OPP: { n: 's', s: 'n', e: 'w', w: 'e' },
  // Java StairBlock.getStairsShape: straight / inner_left / inner_right / outer_left / outer_right
  stairShape(w, x, y, z, B) {
    const F = B.stair, at = d => BL[w.get(x + this.DV[d][0], y, z + this.DV[d][1])]; const same = S => S && S.stair && S.upside === B.upside;
    const can = d => { const S = at(d); return !same(S) || S.stair !== F; };
    const s1 = at(F); if (same(s1)) { const d1 = s1.stair; if ((d1 === 'e' || d1 === 'w') !== (F === 'e' || F === 'w') && can(this.OPP[d1])) return d1 === this.CCW[F] ? 'outer_left' : 'outer_right'; }
    const s2 = at(this.OPP[F]); if (same(s2)) { const d2 = s2.stair; if ((d2 === 'e' || d2 === 'w') !== (F === 'e' || F === 'w') && can(d2)) return d2 === this.CCW[F] ? 'inner_left' : 'inner_right'; }
    return 'straight';
  },
  stairBoxes(F, up, shape) {
    const q = (a, b) => { const sx = a === 'e' || b === 'e' ? [.5, 1] : [0, .5], sz = a === 's' || b === 's' ? [.5, 1] : [0, .5]; return [sx[0], .5, sz[0], sx[1], 1, sz[1]]; };
    const L = this.CCW[F], R = this.CW[F], Bk = this.OPP[F]; let quads;
    if (shape === 'outer_left') quads = [[F, L]]; else if (shape === 'outer_right') quads = [[F, R]]; else if (shape === 'inner_left') quads = [[F, L], [F, R], [Bk, L]]; else if (shape === 'inner_right') quads = [[F, L], [F, R], [Bk, R]]; else quads = [[F, L], [F, R]];
    let bx = [[0, 0, 0, 1, .5, 1], ...quads.map(([a, b]) => q(a, b))]; if (up) bx = bx.map(b => [b[0], 1 - b[4], b[2], b[3], 1 - b[1], b[5]]); return bx;
  },
};
