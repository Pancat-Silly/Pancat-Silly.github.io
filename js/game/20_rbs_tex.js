// ===================== Random Block Survival: texture atlas (procedural 16px tiles, by vanilla-style name) =====================
// Every block face / item sprite gets a tile by name. Without a resource pack the tiles are painted here; the vanilla
// pack (downloaded by the player's browser, never bundled) overwrites the same tiles by name, so meshes never change.
const RTEX = {
  N: 32, S: 16, map: new Map(), next: 1, cv: null, g: null, pack: new Set(),
  init() {
    ATL = this.N; const cv = document.createElement('canvas'); cv.width = cv.height = this.N * this.S; this.cv = cv; this.g = cv.getContext('2d', { willReadFrequently: true });
    this.g.fillStyle = '#fff'; this.g.fillRect(0, 0, 16, 16); // tile 0 = white (particles, flat boxes)
  },
  T(name) { let t = this.map.get(name); if (t !== undefined) return t; t = this.next++; this.map.set(name, t); this.paint(name, t); this.dirty = true; return t; },
  xy(t) { return [(t % this.N) * this.S, Math.floor(t / this.N) * this.S]; },
  // ---- tiny pixel painter ----
  hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967296; },
  img(t, f) { const [ox, oy] = this.xy(t); const id = this.g.createImageData(16, 16), d = id.data; let seed = 0; for (const c of String(t)) seed = seed * 31 + c.charCodeAt(0); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = f(x, y, this.hash(x, y, seed + t * 7)) || [0, 0, 0, 0]; const i = (y * 16 + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] === undefined ? 255 : c[3]; } this.g.putImageData(id, ox, oy); },
  sh(c, k) { return [clamp(c[0] * k | 0, 0, 255), clamp(c[1] * k | 0, 0, 255), clamp(c[2] * k | 0, 0, 255)]; },
  noisy(base, amt) { return (x, y, r) => this.sh(base, 1 + (r - .5) * amt); },
  ore(base, spot) { return (x, y, r) => { const blob = this.hash(x >> 1, y >> 1, 99) > .78 && x > 1 && y > 1 && x < 14 && y < 14; if (blob) return this.sh(spot, .85 + r * .3); return this.sh(base, 1 + (r - .5) * .22); }; },
  paint(name, t) {
    const P = this.PAINT[name]; if (P) { P.call(this, t); return; }
    if (name.endsWith('_stained_glass')) { const C = { red: [180, 40, 40], white: [235, 235, 235], blue: [50, 70, 180], lime: [110, 190, 40], yellow: [220, 200, 50], black: [30, 30, 30] }[name.split('_')[0]] || [150, 150, 150]; this.img(t, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [...C.map(v => v * .8 | 0), 230] : [...C, 110]); return; }
    if (name.startsWith('item/')) { this.item(name.slice(5), t); return; }
    this.img(t, this.noisy([200, 0, 200], .3)); // missing: magenta
  },
};
const C3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
RTEX.PAINT = {
  stone(t) { this.img(t, this.noisy([125, 125, 125], .28)); },
  cobblestone(t) { this.img(t, (x, y, r) => { const c = this.hash(x >> 2, (y + (x >> 2 & 1) * 2) >> 2, 5); const e = (x % 4 === 0) || ((y + (x >> 2 & 1) * 2) % 4 === 0); return this.sh(e ? [70, 70, 70] : [120 + c * 40, 120 + c * 40, 120 + c * 40], .9 + r * .2); }); },
  mossy_cobblestone(t) { this.img(t, (x, y, r) => { const e = (x % 4 === 0) || ((y + (x >> 2 & 1) * 2) % 4 === 0); const m = this.hash(x >> 1, y >> 1, 3) > .55; return this.sh(e ? [65, 70, 60] : m ? [80, 120, 50] : [125, 125, 125], .9 + r * .2); }); },
  dirt(t) { this.img(t, this.noisy([134, 96, 67], .35)); },
  coarse_dirt(t) { this.img(t, this.noisy([119, 85, 59], .45)); },
  grass_block_top(t) { this.img(t, this.noisy([95, 159, 53], .3)); },
  grass_block_side(t) { this.img(t, (x, y, r) => y < 3 + (this.hash(x, 0, 7) * 2 | 0) ? this.sh([95, 159, 53], .9 + r * .25) : this.sh([134, 96, 67], .85 + r * .35)); },
  podzol_top(t) { this.img(t, this.noisy([92, 63, 24], .4)); }, podzol_side(t) { this.img(t, (x, y, r) => y < 3 ? this.sh([92, 63, 24], .9 + r * .2) : this.sh([134, 96, 67], .85 + r * .35)); },
  dirt_path_top(t) { this.img(t, this.noisy([148, 122, 65], .25)); }, dirt_path_side(t) { this.img(t, (x, y, r) => y < 2 ? this.sh([148, 122, 65], 1) : this.sh([134, 96, 67], .85 + r * .35)); },
  gravel(t) { this.img(t, (x, y, r) => this.sh([131, 127, 126], .7 + r * .6)); },
  sand(t) { this.img(t, this.noisy([219, 207, 163], .15)); },
  oak_planks(t) { this.planks(t, [162, 130, 78]); }, spruce_planks(t) { this.planks(t, [114, 84, 48]); }, birch_planks(t) { this.planks(t, [192, 175, 121]); }, dark_oak_planks(t) { this.planks(t, [66, 43, 20]); },
  oak_log(t) { this.bark(t, [109, 85, 50]); }, birch_log(t) { this.img(t, (x, y, r) => (this.hash(x >> 1, y, 4) > .86 ? [40, 40, 40] : this.sh([216, 215, 210], .92 + r * .12))); }, spruce_log(t) { this.bark(t, [58, 37, 16]); }, dark_oak_log(t) { this.bark(t, [60, 46, 26]); },
  oak_log_top(t) { this.ring(t, [109, 85, 50], [176, 142, 88]); }, birch_log_top(t) { this.ring(t, [216, 215, 210], [196, 178, 124]); }, spruce_log_top(t) { this.ring(t, [58, 37, 16], [120, 88, 50]); },
  oak_leaves(t) { this.leaves(t, [72, 140, 40]); }, birch_leaves(t) { this.leaves(t, [100, 150, 60]); },
  coal_ore(t) { this.img(t, this.ore([125, 125, 125], [30, 30, 30])); }, iron_ore(t) { this.img(t, this.ore([125, 125, 125], [216, 175, 147])); }, gold_ore(t) { this.img(t, this.ore([125, 125, 125], [252, 238, 75])); },
  diamond_ore(t) { this.img(t, this.ore([125, 125, 125], [93, 236, 245])); }, lapis_ore(t) { this.img(t, this.ore([125, 125, 125], [30, 70, 180])); }, redstone_ore(t) { this.img(t, this.ore([125, 125, 125], [220, 20, 20])); },
  quartz_ore(t) { this.img(t, this.ore([111, 54, 52], [235, 230, 220])); }, nether_gold_ore(t) { this.img(t, this.ore([111, 54, 52], [252, 220, 75])); },
  bookshelf(t) { this.img(t, (x, y, r) => { if (y < 1 || y > 14 || y === 7 || y === 8) return this.sh([162, 130, 78], .9 + r * .1); const bk = [[150, 40, 40], [40, 80, 150], [60, 120, 50], [170, 140, 60], [110, 60, 140]][(this.hash(x, y < 7 ? 1 : 2, 11) * 5) | 0]; return this.sh(bk, (x % 3 === 0 ? .6 : 1) * (.9 + r * .1)); }); },
  crafting_table_top(t) { this.img(t, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? this.sh([109, 85, 50], .9) : (x % 5 === 0 || y % 5 === 0) ? this.sh([90, 66, 36], 1) : this.sh([170, 130, 80], .9 + r * .15)); },
  crafting_table_side(t) { this.img(t, (x, y, r) => y < 3 ? this.sh([109, 85, 50], .9 + r * .1) : (x === 3 || x === 12) && y > 5 ? [60, 60, 60] : this.sh([162, 130, 78], .9 + r * .15)); },
  crafting_table_front(t) { this.img(t, (x, y, r) => y < 3 ? this.sh([109, 85, 50], .9 + r * .1) : (y > 5 && y < 13 && x > 3 && x < 12 && (x + y) % 3 === 0) ? [180, 180, 180] : this.sh([162, 130, 78], .9 + r * .15)); },
  glass_pane_top(t) { this.img(t, (x, y) => (x === 7 || x === 8) ? [220, 235, 240, 255] : [0, 0, 0, 0]); }, // the edge strip of a glass pane (x 7-8)
  glass(t) { this.img(t, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? [220, 235, 240, 255] : ((x - y === 3 || x - y === 4) && x > 4 && x < 10) ? [255, 255, 255, 170] : [0, 0, 0, 0]); },
  bedrock(t) { this.img(t, (x, y, r) => this.sh([85, 85, 85], .4 + r * 1.1)); },
  deny(t) { this.img(t, (x, y, r) => ((x + y) >> 2) % 2 ? [30, 30, 30] : [230, 200, 40]); },
  barrier(t) { this.img(t, () => [0, 0, 0, 0]); },
  diamond_block(t) { this.metal(t, [98, 219, 214]); }, iron_block(t) { this.metal(t, [220, 220, 220]); }, gold_block(t) { this.metal(t, [250, 220, 60]); },
  emerald_block(t) { this.metal(t, [70, 210, 110]); }, lapis_block(t) { this.metal(t, [35, 70, 160]); }, coal_block(t) { this.metal(t, [24, 24, 24]); }, redstone_block(t) { this.metal(t, [175, 24, 5]); },
  enchanting_table_top(t) { this.img(t, (x, y, r) => (x > 2 && x < 13 && y > 2 && y < 13) ? this.sh([160, 30, 30], .8 + r * .3) : this.sh([20, 15, 30], .8 + r * .4)); },
  enchanting_table_side(t) { this.img(t, (x, y, r) => y < 4 ? this.sh([160, 30, 30], .9) : y === 4 ? [230, 200, 60] : this.sh([20, 15, 30], .8 + r * .4)); },
  obsidian(t) { this.img(t, (x, y, r) => this.sh([20, 15, 30], .8 + r * .5)); },
  torch(t) { this.img(t, (x, y) => (x === 7 || x === 8) && y >= 6 ? (y < 8 ? [255, 200, 60] : [110, 80, 40]) : (x >= 7 && x <= 8 && y === 5) ? [255, 240, 150] : null); },
  stone_bricks(t) { this.bricks(t, [122, 121, 122], [90, 89, 90], 0); }, mossy_stone_bricks(t) { this.bricks(t, [115, 121, 105], [85, 90, 75], 1); }, cracked_stone_bricks(t) { this.bricks(t, [118, 117, 118], [70, 70, 70], 2); },
  bricks(t) { this.img(t, (x, y, r) => { const row = y >> 2, off = row % 2 ? 4 : 0; return (y % 4 === 3 || (x + off) % 8 === 7) ? [200, 190, 180] : this.sh([150, 75, 60], .85 + r * .25); }); },
  nether_bricks(t) { this.img(t, (x, y, r) => { const row = y >> 2, off = row % 2 ? 4 : 0; return (y % 4 === 3 || (x + off) % 8 === 7) ? [25, 12, 15] : this.sh([60, 30, 35], .85 + r * .3); }); },
  red_nether_bricks(t) { this.img(t, (x, y, r) => { const row = y >> 2, off = row % 2 ? 4 : 0; return (y % 4 === 3 || (x + off) % 8 === 7) ? [50, 5, 5] : this.sh([110, 15, 15], .85 + r * .3); }); },
  netherrack(t) { this.img(t, (x, y, r) => this.sh([111, 54, 52], .7 + r * .55)); },
  nether_bedrock(t) { this.img(t, (x, y, r) => this.sh([70, 20, 20], .4 + r * 1)); },
  magma(t) { this.img(t, (x, y, r) => this.hash(x >> 1, y >> 1, 9) > .6 ? [255, 140 + r * 60 | 0, 30] : this.sh([110, 40, 20], .8 + r * .3)); },
  glowstone(t) { this.img(t, (x, y, r) => this.sh([250, 210, 120], .6 + r * .5)); },
  redstone_lamp(t) { this.img(t, (x, y, r) => (x % 5 === 0 || y % 5 === 0) ? [90, 50, 30] : this.sh([120, 70, 40], .9 + r * .2)); },
  redstone_lamp_on(t) { this.img(t, (x, y, r) => (x % 5 === 0 || y % 5 === 0) ? [140, 90, 50] : this.sh([255, 200, 120], .85 + r * .2)); },
  sea_lantern(t) { this.img(t, (x, y, r) => (x % 5 === 0 || y % 5 === 0) ? [170, 200, 190] : this.sh([220, 240, 235], .9 + r * .15)); },
  sponge(t) { this.fromImg(t, RB_IMG.lucky); }, // the original pack's "?" lucky block
  nether_bedrock_rp(t) { this.fromImg(t, RB_IMG.nether_bedrock); },
  black_concrete(t) { this.img(t, this.noisy([16, 18, 22], .2)); }, white_concrete(t) { this.img(t, this.noisy([207, 213, 214], .05)); },
  smooth_stone(t) { this.img(t, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? [115, 115, 115] : this.sh([158, 158, 158], .97 + r * .06)); },
  smooth_stone_slab_side(t) { this.img(t, (x, y, r) => (y === 0 || y === 7 || y === 8 || y === 15) ? [115, 115, 115] : this.sh([158, 158, 158], .97 + r * .06)); },
  quartz_block_side(t) { this.img(t, this.noisy([235, 229, 222], .05)); }, quartz_block_top(t) { this.img(t, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? [210, 204, 196] : this.sh([235, 229, 222], .98 + r * .04)); },
  quartz_block_bottom(t) { this.img(t, this.noisy([235, 229, 222], .04)); },
  quartz_pillar(t) { this.img(t, (x, y, r) => (x === 1 || x === 14) ? [205, 199, 190] : this.sh([235, 229, 222], .98 + r * .04)); }, quartz_pillar_top(t) { this.ring(t, [235, 229, 222], [215, 210, 200]); },
  ancient_debris_side(t) { this.img(t, (x, y, r) => this.sh([96, 66, 60], .7 + r * .5)); }, ancient_debris_top(t) { this.ring(t, [96, 66, 60], [130, 100, 90]); },
  water_still(t) { this.img(t, (x, y, r) => [50, 90 + r * 20 | 0, 200 + r * 30 | 0, 170]); },
  lava_still(t) { this.img(t, (x, y, r) => { const w = Math.sin(x * .7 + y * .4) * 18 + Math.sin(y * .9 - x * .3) * 14; return [235 + r * 20 | 0, clamp(110 + w + (r - .5) * 40, 40, 200) | 0, 20]; }); },
  fire_0(t) { this.img(t, (x, y, r) => { const h = 6 + Math.sin(x * 1.3) * 3 + r * 4; return y > 16 - h ? (y > 16 - h * .5 ? [255, 120, 20] : [255, 210, 60]) : null; }); },
  short_grass(t) { this.img(t, (x, y, r) => this.hash(x, 0, 3) > .45 && y > 4 + this.hash(x, 1, 3) * 8 ? this.sh([95, 159, 53], .8 + r * .4) : null); },
  fern(t) { this.img(t, (x, y, r) => (Math.abs(x - 8) < (16 - y) / 2.2 && (x + y) % 3 && y > 2) ? this.sh([80, 140, 45], .8 + r * .4) : null); },
  tall_grass_bottom(t) { this.img(t, (x, y, r) => this.hash(x, 0, 5) > .35 ? this.sh([95, 159, 53], .8 + r * .4) : null); },
  tall_grass_top(t) { this.img(t, (x, y, r) => this.hash(x, 0, 5) > .35 && y > 3 + this.hash(x, 1, 5) * 9 ? this.sh([95, 159, 53], .8 + r * .4) : null); },
  sugar_cane(t) { this.img(t, (x, y, r) => (x === 3 || x === 4 || x === 11 || x === 12 || x === 7) ? this.sh([140, 190, 90], (y % 5 === 0 ? .7 : 1)) : null); },
  dandelion(t) { this.flower(t, [250, 220, 40]); }, poppy(t) { this.flower(t, [220, 30, 30]); }, blue_orchid(t) { this.flower(t, [40, 170, 230]); }, red_tulip(t) { this.flower(t, [230, 50, 40]); },
  orange_tulip(t) { this.flower(t, [240, 130, 30]); }, white_tulip(t) { this.flower(t, [240, 240, 240]); }, pink_tulip(t) { this.flower(t, [240, 160, 200]); }, lily_of_the_valley(t) { this.flower(t, [250, 250, 250]); },
  ladder(t) { this.img(t, (x, y, r) => (x === 2 || x === 3 || x === 12 || x === 13) || (y % 4 === 1 && x > 1 && x < 14) ? this.sh([140, 104, 60], .9 + r * .2) : null); },
  iron_bars(t) { this.img(t, (x, y) => (x % 5 === 2 || y === 0 || y === 15) ? [150, 150, 155] : null); },
  rail(t) { this.img(t, (x, y, r) => (x === 3 || x === 12) ? [160, 160, 160] : (y % 4 === 1 && x > 1 && x < 14) ? [110, 80, 45] : null); },
  white_wool(t) { this.img(t, this.noisy([233, 236, 236], .08)); }, red_wool(t) { this.img(t, this.noisy([160, 39, 34], .12)); },
  composter_side(t) { this.planks(t, [140, 100, 50]); }, composter_top(t) { this.img(t, (x, y, r) => (x < 2 || x > 13 || y < 2 || y > 13) ? this.sh([140, 100, 50], 1) : this.sh([90, 60, 30], .8 + r * .3)); },
  scaffolding_side(t) { this.img(t, (x, y, r) => (x < 2 || x > 13 || y < 2 || y > 13 || x === y) ? this.sh([200, 170, 90], .9 + r * .1) : null); },
  scaffolding_top(t) { this.img(t, (x, y, r) => (x < 2 || x > 13 || y < 2 || y > 13 || (x + y) % 6 === 0) ? this.sh([200, 170, 90], .9 + r * .1) : null); },
  bell(t) { this.metal(t, [230, 190, 60]); },
  spruce_door_bottom(t) { this.door(t, [104, 78, 47], 0); }, spruce_door_top(t) { this.door(t, [104, 78, 47], 1); },
  warped_nylium(t) { this.img(t, this.noisy([43, 114, 101], .35)); }, crimson_nylium(t) { this.img(t, this.noisy([130, 31, 31], .35)); },
  warped_nylium_side(t) { this.img(t, (x, y, r) => y < 4 + (this.hash(x, 0, 3) * 3 | 0) ? this.sh([43, 114, 101], .8 + r * .3) : this.sh([111, 54, 52], .7 + r * .55)); },
  crimson_nylium_side(t) { this.img(t, (x, y, r) => y < 4 + (this.hash(x, 0, 5) * 3 | 0) ? this.sh([130, 31, 31], .8 + r * .3) : this.sh([111, 54, 52], .7 + r * .55)); },
  warped_stem(t) { this.img(t, (x, y, r) => this.sh(x % 4 === 0 ? [40, 90, 90] : [58, 59, 78], .85 + r * .3)); }, warped_stem_top(t) { this.img(t, (x, y, r) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6 ? this.sh([58, 59, 78], .9 + r * .2) : this.sh([22, 120, 110], .8 + r * .3 - (d | 0) % 2 * .1); }); },
  crimson_stem(t) { this.img(t, (x, y, r) => this.sh(x % 4 === 0 ? [140, 40, 40] : [92, 25, 29], .85 + r * .3)); }, crimson_stem_top(t) { this.img(t, (x, y, r) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6 ? this.sh([92, 25, 29], .9 + r * .2) : this.sh([150, 60, 60], .8 + r * .3 - (d | 0) % 2 * .1); }); },
  warped_wart_block(t) { this.img(t, this.noisy([22, 119, 121], .4)); }, nether_wart_block(t) { this.img(t, this.noisy([115, 3, 3], .4)); }, shroomlight(t) { this.img(t, (x, y, r) => this.sh(this.hash(x >> 1, y >> 1, 9) > .7 ? [255, 210, 120] : [240, 146, 70], .9 + r * .2)); },
  soul_sand(t) { this.img(t, (x, y, r) => { const f = ((x - 4) ** 2 + (y - 6) ** 2 < 3 || (x - 11) ** 2 + (y - 6) ** 2 < 3 || (y === 11 && x > 4 && x < 11)); return this.sh(f ? [60, 45, 35] : [84, 64, 51], .85 + r * .3); }); },
  red_concrete(t) { this.img(t, this.noisy([142, 33, 33], .06)); }, redstone_wire(t) { this.img(t, (x, y) => (x === 7 || x === 8 || y === 7 || y === 8) ? [190, 20, 20, 255] : null); },
  warped_roots(t) { this.img(t, (x, y, r) => (y > 3 && (x === 4 || x === 8 || x === 11) && r > .2) ? [20, 150, 140] : null); }, crimson_roots(t) { this.img(t, (x, y, r) => (y > 3 && (x === 4 || x === 8 || x === 11) && r > .2) ? [140, 20, 40] : null); },
  warped_fungus(t) { this.img(t, (x, y) => y < 7 && Math.abs(x - 7.5) < 6 - y * .4 ? [20, 140, 130] : (y >= 7 && (x === 7 || x === 8)) ? [200, 120, 60] : null); }, crimson_fungus(t) { this.img(t, (x, y) => y < 7 && Math.abs(x - 7.5) < 6 - y * .4 ? [160, 30, 30] : (y >= 7 && (x === 7 || x === 8)) ? [200, 160, 100] : null); },
  oak_door_bottom(t) { this.door(t, [162, 130, 78], 0); }, oak_door_top(t) { this.door(t, [162, 130, 78], 1); },
  birch_door_bottom(t) { this.door(t, [215, 205, 170], 0); }, birch_door_top(t) { this.door(t, [215, 205, 170], 1); },
  dark_oak_door_bottom(t) { this.door(t, [72, 47, 22], 0); }, dark_oak_door_top(t) { this.door(t, [72, 47, 22], 1); },
  oak_trapdoor(t) { this.door(t, [162, 130, 78], 1); }, birch_trapdoor(t) { this.door(t, [215, 205, 170], 1); },
  tnt_side(t) { this.img(t, (x, y, r) => (y > 4 && y < 11) ? (y > 5 && y < 10 ? [230, 230, 230] : [40, 40, 40]) : this.sh([200, 40, 30], .9 + r * .2)); },
  tnt_top(t) { this.img(t, (x, y, r) => (x % 5 === 2 && y % 5 === 2) ? [40, 40, 40] : this.sh([200, 40, 30], .9 + r * .2)); }, tnt_bottom(t) { this.img(t, this.noisy([200, 40, 30], .2)); },
  furnace_side(t) { this.img(t, (x, y, r) => this.sh([120, 120, 120], .85 + r * .25)); }, furnace_top(t) { this.img(t, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? [80, 80, 80] : this.sh([125, 125, 125], .9 + r * .2)); },
  furnace_front(t) { this.furnace(t, false, [120, 120, 120]); }, furnace_front_on(t) { this.furnace(t, true, [120, 120, 120]); },
  blast_furnace_side(t) { this.img(t, (x, y, r) => y > 11 ? [70, 70, 75] : this.sh([110, 110, 115], .85 + r * .25)); }, blast_furnace_top(t) { this.metal(t, [100, 100, 105]); },
  blast_furnace_front(t) { this.furnace(t, false, [105, 105, 110]); }, blast_furnace_front_on(t) { this.furnace(t, true, [105, 105, 110]); },
  chest_front(t) { this.img(t, (x, y, r) => (x === 0 || x === 15 || y === 15 || y === 5) ? [55, 35, 15] : (x >= 7 && x <= 8 && y >= 4 && y <= 7) ? [200, 200, 200] : this.sh([160, 110, 50], .9 + r * .15)); },
  chest_side(t) { this.img(t, (x, y, r) => (x === 0 || x === 15 || y === 15 || y === 5) ? [55, 35, 15] : this.sh([160, 110, 50], .9 + r * .15)); },
  chest_top(t) { this.img(t, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? [55, 35, 15] : this.sh([160, 110, 50], .9 + r * .15)); },
  anvil(t) { this.img(t, (x, y, r) => this.sh([68, 68, 68], .85 + r * .3)); }, anvil_top(t) { this.img(t, (x, y, r) => (x < 2 || x > 13) ? [50, 50, 50] : this.sh([75, 75, 75], .85 + r * .3)); },
  campfire_log(t) { this.bark(t, [90, 70, 40]); },
  redstone_torch(t) { this.img(t, (x, y) => (x === 7 || x === 8) && y >= 6 ? (y < 8 ? [255, 60, 40] : [110, 80, 40]) : (x >= 7 && x <= 8 && y === 5) ? [255, 150, 130] : null); },
  redstone_torch_off(t) { this.img(t, (x, y) => (x === 7 || x === 8) && y >= 6 ? (y < 8 ? [110, 30, 25] : [110, 80, 40]) : null); },
  repeater(t) { this.img(t, (x, y, r) => (x === 7 || x === 8) && y > 3 && y < 13 ? [150, 20, 20] : this.sh([160, 160, 160], .9 + r * .15)); }, comparator(t) { this.img(t, (x, y, r) => ((x === 4 || x === 11) && y === 4) || (x === 7 && y === 12) ? [170, 30, 30] : this.sh([160, 160, 160], .9 + r * .15)); },
  command_block_impulse_side(t) { this.cmdb(t, [200, 120, 70], 0); }, command_block_impulse_front(t) { this.cmdb(t, [200, 120, 70], 1); }, command_block_chain_side(t) { this.cmdb(t, [110, 170, 140], 0); }, command_block_chain_front(t) { this.cmdb(t, [110, 170, 140], 1); },
  command_block_repeat_side(t) { this.cmdb(t, [130, 100, 190], 0); }, command_block_repeat_front(t) { this.cmdb(t, [130, 100, 190], 1); },
  banner(t) { this.img(t, (x, y, r) => this.sh([235, 235, 235], .95 + r * .05)); },
  // break overlay (crack stage 0..9)
  // break overlay (crack stage 0..9): jagged cracks growing out from the middle like vanilla's destroy_stage_N (the pack's real ones replace these)
  crackPaths() { if (this._cp) return this._cp; const P = []; let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rnd() * .5; let x = 7.5 + Math.cos(a) * (i < 3 ? 0 : 2), y = 7.5 + Math.sin(a) * (i < 3 ? 0 : 2), d = a; const pts = [];
      for (let j = 0; j < 14; j++) { d += (rnd() - .5) * 1.1; x += Math.cos(d); y += Math.sin(d); if (x < 0 || y < 0 || x > 15.9 || y > 15.9) break; pts.push([x | 0, y | 0]); } P.push(pts); }
    return this._cp = P; },
  ...Object.fromEntries(Array.from({ length: 10 }, (_, k) => ['destroy_stage_' + k, function (t) { const on = new Set(); RTEX.PAINT.crackPaths().forEach((pts, i) => { if (i > 2 + k * .7) return; const n = Math.ceil(pts.length * Math.min(1, (k + 1.5) / 9 - i * .03)); for (let j = 0; j < n; j++) on.add(pts[j][0] + ',' + pts[j][1]); });
    this.img(t, (x, y) => on.has(x + ',' + y) ? [0, 0, 0, 200] : (on.has((x - 1) + ',' + y) || on.has(x + ',' + (y - 1))) ? [0, 0, 0, 70] : null); }])),
};
Object.assign(RTEX, {
  planks(t, c) { this.img(t, (x, y, r) => (y % 4 === 3) ? this.sh(c, .7) : ((x + (y >> 2) * 5) % 8 === 0 && y % 4 !== 3) ? this.sh(c, .82) : this.sh(c, .92 + r * .15)); },
  bark(t, c) { this.img(t, (x, y, r) => this.sh(c, (x % 4 === 0 ? .72 : 1) * (.85 + this.hash(x, y >> 2, 6) * .3))); },
  ring(t, bark, wood) { this.img(t, (x, y, r) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.5) return this.sh(bark, .9 + r * .1); return this.sh(wood, ((d | 0) % 2 ? .85 : 1) * (.95 + r * .1)); }); },
  leaves(t, c) { this.img(t, (x, y, r) => r < .18 ? null : this.sh(c, .6 + r * .6)); },
  metal(t, c) { this.img(t, (x, y, r) => (x === 0 || y === 0) ? this.sh(c, 1.15) : (x === 15 || y === 15) ? this.sh(c, .7) : this.sh(c, .95 + r * .1)); },
  bricks(t, c, m, kind) { this.img(t, (x, y, r) => { const row = y >> 3, off = row % 2 ? 4 : 0; if (y % 8 === 7 || (x + off) % 8 === 7) return this.sh(m, .9 + r * .1); if (kind === 1 && this.hash(x >> 1, y >> 1, 21) > .6) return this.sh([80, 115, 55], .9 + r * .2); if (kind === 2 && Math.abs(x - y) < 1 && x > 3 && x < 12) return [50, 50, 50]; return this.sh(c, .9 + r * .2); }); },
  flower(t, c) { this.img(t, (x, y, r) => { if ((x === 7 || x === 8) && y > 7) return [60, 120, 40]; if (Math.hypot(x - 7.5, y - 5.5) < 3) return this.sh(c, .85 + r * .3); if ((x === 6 && y === 11) || (x === 9 && y === 12)) return [70, 140, 40]; return null; }); },
  door(t, c, top) { this.img(t, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? this.sh(c, .65) : (top && y > 3 && y < 12 && (x === 4 || x === 11 || y === 7)) ? this.sh(c, .55) : (top && y > 3 && y < 12 && x > 4 && x < 11) ? [140, 160, 170, 200] : this.sh(c, .9 + r * .15)); },
  cmdb(t, c, front) { this.img(t, (x, y, r) => (front && x > 3 && x < 12 && y > 3 && y < 12) ? ((x - y === 0 || x + y === 15) ? [230, 230, 230] : [40, 40, 40]) : (x % 5 === 0 || y % 5 === 0) ? this.sh(c, .7) : this.sh(c, .95 + r * .1)); },
  furnace(t, on, c) { this.img(t, (x, y, r) => { if (x > 3 && x < 12 && y > 8 && y < 14) return on ? [255, 150 + r * 80 | 0, 30] : [30, 30, 30]; if (y === 2 || y === 3) return this.sh(c, .7); return this.sh(c, .85 + r * .25); }); },
  fromImg(t, url) { const [ox, oy] = this.xy(t); const im = new Image(); im.onload = () => { this.g.clearRect(ox, oy, 16, 16); this.g.imageSmoothingEnabled = false; this.g.drawImage(im, ox, oy, 16, 16); if (RR.gfx) RR.gfx.refreshAtlas(); RUI.iconCache = {}; }; im.src = url; this.img(t, this.noisy([200, 180, 60], .2)); },
  // ---------------- items: 16x16 templates (M main, L light, D dark/outline, H handle, S second colour) ----------------
  TPL: {
    sword: ['..............DD', '.............DLD', '............DLMD', '...........DLMD.', '..........DLMD..', '.........DLMD...', '........DLMD....', '.......DLMD.....', '..DD..DLMD......', '..DMDDLMD.......', '...DMMMD........', '...HDMD.........', '..HHD.DD........', '.HHH............', '.HH.............', '................'],
    pickaxe: ['................', '....DDDDDD......', '...DLLLLLMD.....', '....DDDDDMMD....', '........HDMMD...', '.......HH.DMD...', '......HH...DMD..', '.....HH.....DD..', '....HH......D...', '...HH...........', '..HH............', '.HH.............', '................', '................', '................', '................'],
    axe: ['................', '.......DDD......', '......DLLMD.....', '.....DLMMMMD....', '.....DMMMHMD....', '......DDHHDD....', '.......HH.......', '......HH........', '.....HH.........', '....HH..........', '...HH...........', '..HH............', '.HH.............', '................', '................', '................'],
    shovel: ['................', '...........DDD..', '..........DLLMD.', '..........DLMMD.', '...........DMD..', '..........HD....', '.........HH.....', '........HH......', '.......HH.......', '......HH........', '.....HH.........', '....HH..........', '...HH...........', '..HH............', '................', '................'],
    helmet: ['................', '................', '................', '....DDDDDDDD....', '...DLLLLLLMMD...', '...DLMMMMMMMD...', '...DMD....DMD...', '...DMD....DMD...', '...DDD....DDD...', '................', '................', '................', '................', '................', '................', '................'],
    chestplate: ['................', '..DDD......DDD..', '.DLMD......DMMD.', '.DLMMDDDDDDMMMD.', '.DLMMMMMMMMMMMD.', '.DDDLMMMMMMMDDD.', '...DLMMMMMMMD...', '...DLMMMMMMMD...', '...DLMMMMMMMD...', '...DLMMMMMMMD...', '...DDDDDDDDDD...', '................', '................', '................', '................', '................'],
    leggings: ['................', '...DDDDDDDDDD...', '...DLMMMMMMMD...', '...DLMMMMMMMD...', '...DLMD..DLMD...', '...DLMD..DLMD...', '...DLMD..DLMD...', '...DLMD..DLMD...', '...DLMD..DLMD...', '...DDDD..DDDD...', '................', '................', '................', '................', '................', '................'],
    boots: ['................', '................', '................', '................', '................', '...DDD....DDD...', '...DLD....DLD...', '...DMD....DMD...', '..DLMD....DLMD..', '.DLMMD....DLMMD.', '.DDDDD....DDDDD.', '................', '................', '................', '................', '................'],
    ingot: ['................', '................', '................', '................', '................', '......DDDDDDD...', '....DDLLLLLMD...', '..DDLLLMMMMDD...', '.DLLMMMMMMDD....', '.DMMMMMMDDD.....', '.DDDDDDDD.......', '................', '................', '................', '................', '................'],
    nugget: ['................', '................', '................', '................', '................', '................', '......DDD.......', '.....DLLMD......', '....DLMMMD......', '....DMMMD.......', '.....DDD........', '................', '................', '................', '................', '................'],
    gem: ['................', '................', '.....DDDDDD.....', '....DLLLLMMD....', '...DLLMMMMMMD...', '..DLLMMMMMMMMD..', '..DDDDDDDDDDDD..', '...DMMMMMMMMD...', '....DMMMMMMD....', '.....DMMMMD.....', '......DMMD......', '.......DD.......', '................', '................', '................', '................'],
    lump: ['................', '................', '................', '.....DDDD.......', '....DLLMMDD.....', '...DLMMSMMMD....', '...DMMMMMSMD....', '..DLMSMMMMMD....', '..DMMMMMSMMD....', '..DDMMMMMMD.....', '....DDDDDD......', '................', '................', '................', '................', '................'],
    dust: ['................', '................', '................', '......M..L......', '....L.MM.M......', '.....MMLMM.M....', '...M.MMMMLM.....', '....MLMMMMM.L...', '..L.MMMMLMM.....', '....M.MMMM.M....', '.....M..M.......', '................', '................', '................', '................', '................'],
    stick: ['................', '................', '.............DD.', '............DHD.', '...........DHD..', '..........DHD...', '.........DHD....', '........DHD.....', '.......DHD......', '......DHD.......', '.....DHD........', '....DHD.........', '...DHD..........', '...DD...........', '................', '................'],
    apple: ['................', '........D.......', '.......DSS......', '...DDDDDDDDD....', '..DLLMMMMMMMD...', '.DLLMMMMMMMMMD..', '.DLMMMMMMMMMMD..', '.DMMMMMMMMMMMD..', '.DMMMMMMMMMMMD..', '.DMMMMMMMMMMMD..', '..DMMMMMMMMMD...', '...DMMMDMMMD....', '....DDD.DDD.....', '................', '................', '................'],
    book: ['................', '................', '...DDDDDDDDDD...', '..DMMMMMMMMMLD..', '..DMMSSSSSMMLD..', '..DMMMMMMMMMLD..', '..DMMSSSSMMMLD..', '..DMMMMMMMMMLD..', '..DMMMMMMMMMLD..', '..DMMMMMMMMMLD..', '..DMMMMMMMMMLD..', '..DDDDDDDDDDLD..', '...DLLLLLLLLLD..', '....DDDDDDDDDD..', '................', '................'],
    bottle: ['................', '......DDDD......', '......DSSD......', '.......DD.......', '......DLLD......', '.....DLMMMD.....', '....DLMMMMMD....', '....DMMMMMMD....', '....DMMMMMMD....', '....DMMMMMMD....', '.....DMMMMD.....', '......DDDD......', '................', '................', '................', '................'],
    potion: ['................', '.......DD.......', '......DSSD......', '.......DD.......', '......DLLD......', '.....DLLMMD.....', '...DDLMMMMMDD...', '..DLMMMMMMMMMD..', '..DLMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '...DMMMMMMMMD...', '....DDDDDDDD....', '................', '................', '................'],
    flint: ['................', '................', '.......DD.......', '......DLMD......', '.....DLMMMD.....', '....DLMMMMMD....', '....DMMMMMMD....', '...DMMMMMMMD....', '...DMMMMMMD.....', '....DDDDDD......', '................', '................', '................', '................', '................', '................'],
    hook: ['................', '................', '......DDDD......', '.....DLMMD......', '.....DMDDMD.....', '.....DMD.DMD....', '......D...DMD...', '..........DMD...', '.........DMD....', '....HHHHHDMD....', '....HSSSHDD.....', '....HHHHH.......', '......HH........', '......HH........', '......HH........', '................'],
    shield: ['................', '..DDDDDDDDDDDD..', '..DMMMMSSMMMMD..', '..DMMMMSSMMMMD..', '..DMMMMSSMMMMD..', '..DSSSSSSSSSSD..', '..DSSSSSSSSSSD..', '..DMMMMSSMMMMD..', '..DMMMMSSMMMMD..', '...DMMMSSMMMD...', '...DMMMSSMMMD...', '....DMMSSMMD....', '.....DMSSMD.....', '......DDDD......', '................', '................'],
    eye: ['................', '................', '.....DDDDDD.....', '....DLMMMMMD....', '...DLMSSSSMMD...', '...DMSDDDDSMD...', '...DMSDDDDSMD...', '...DMSSSSSSMD...', '....DMMMMMMD....', '.....DDDDDD.....', '................', '................', '................', '................', '................', '................'],
    nametag: ['................', '................', '...........DD...', '..........DLLD..', '.........DLMMD..', '........DLMMD...', '.......DLMMMD...', '......DLMMMD....', '.....DLMMMD.....', '....DLMMMD......', '...DLMMMD.......', '..DLMMMD........', '..DMMMD.........', '...DDD..........', '................', '................'],
    disc: ['................', '.....DDDDDD.....', '....DMMMMMMD....', '...DMMLLLLMMD...', '..DMMLSSSSLMMD..', '..DMLSSDDSSLMD..', '..DMLSDDDDSLMD..', '..DMLSDDDDSLMD..', '..DMLSSDDSSLMD..', '..DMMLSSSSLMMD..', '...DMMLLLLMMD...', '....DMMMMMMD....', '.....DDDDDD.....', '................', '................', '................'],
    lever: ['................', '................', '.......DD.......', '......DLD.......', '......DMD.......', '.......DMD......', '.......DMD......', '........DMD.....', '........DMD.....', '...DDDDDDDDDD...', '...DSSSSSSSSD...', '...DSSSSSSSSD...', '...DDDDDDDDDD...', '................', '................', '................'],
    note: ['................', '.......DDDDDDD..', '.......DMMMMMD..', '.......DMDDDDD..', '.......DMD......', '.......DMD......', '.......DMD......', '.......DMD......', '....DDDDMD......', '...DLMMMMD......', '...DMMMMMD......', '...DMMMMD.......', '....DDDD........', '................', '................', '................'],
    head: ['................', '..DDDDDDDDDDDD..', '..DSSSSSSSSSSD..', '..DSSSSSSSSSSD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DMLLMMMMLLMD..', '..DMLDMMMMDLMD..', '..DMMMMMMMMMMD..', '..DMMMSSSSMMMD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DDDDDDDDDDDD..', '................', '................', '................'],
    door_out: ['................', '..DDDDDDDDDDDD..', '..DMMMMMMMMMMD..', '..DMDDDDDDDDMD..', '..DMDSSSSSSDMD..', '..DMDSSSSSSDMD..', '..DMDSSSSSSDMD..', '..DMDDDDDDDDMD..', '..DMMMMMMMMLMD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DMMMMMMMMMMD..', '..DDDDDDDDDDDD..', '................', '................'],
  },
  TIERC: { wooden: [[150, 115, 65], [190, 150, 90], [90, 65, 35]], stone: [[125, 125, 125], [170, 170, 170], [70, 70, 70]], iron: [[215, 215, 215], [250, 250, 250], [110, 110, 110]], golden: [[250, 215, 60], [255, 250, 150], [150, 110, 20]], diamond: [[70, 220, 210], [180, 255, 250], [20, 110, 110]], netherite: [[70, 60, 60], [110, 100, 100], [30, 25, 25]] },
  tpl(t, name, M, L, D, H = [110, 80, 40], S = [60, 40, 20]) {
    const rows = this.TPL[name]; const pal = { M, L: L || this.sh(M, 1.25), D: D || this.sh(M, .45), H, S };
    this.img(t, (x, y, r) => { const ch = rows[y][x]; if (ch === '.') return null; const c = pal[ch]; return ch === 'H' ? this.sh(c, .9 + r * .2) : c; });
  },
  item(n, t) {
    const T = this.TIERC; let m;
    if ((m = n.match(/^(wooden|stone|iron|golden|diamond|netherite)_(sword|pickaxe|axe|shovel)$/))) { const c = T[m[1]]; this.tpl(t, m[2], c[0], c[1], c[2]); return; }
    if ((m = n.match(/^(iron|golden|diamond|chainmail|netherite|leather)_(helmet|chestplate|leggings|boots)$/))) { const c = T[m[1]] || T.iron; this.tpl(t, m[2], c[0], c[1], c[2]); return; }
    const I = {
      iron_ingot: ['ingot', [215, 215, 215]], gold_ingot: ['ingot', [250, 215, 60]], iron_nugget: ['nugget', [215, 215, 215]], gold_nugget: ['nugget', [250, 215, 60]],
      diamond: ['gem', [80, 230, 220]], emerald: ['gem', [60, 210, 100]], lapis_lazuli: ['lump', [40, 80, 200], null, null, null, [20, 40, 120]], coal: ['lump', [40, 40, 40], [80, 80, 80], [10, 10, 10], null, [20, 20, 20]],
      charcoal: ['lump', [60, 50, 40], [90, 80, 70], [20, 15, 10], null, [30, 25, 20]], raw_iron: ['lump', [200, 160, 130], null, null, null, [160, 120, 95]], raw_gold: ['lump', [240, 200, 60], null, null, null, [190, 150, 30]],
      redstone: ['dust', [220, 20, 20], [255, 80, 80]], glowstone_dust: ['dust', [250, 210, 120]], stick: ['stick', [110, 80, 40], null, [60, 40, 20], [140, 104, 60]],
      apple: ['apple', [220, 30, 30], [255, 120, 120], [100, 10, 10], null, [60, 130, 40]], golden_apple: ['apple', [250, 215, 60], [255, 250, 160], [150, 110, 20], null, [60, 130, 40]],
      book: ['book', [130, 70, 40], [240, 240, 230], [70, 35, 15], null, [220, 190, 120]], written_book: ['book', [130, 70, 40], [240, 240, 230], [70, 35, 15], null, [40, 40, 40]], enchanted_book: ['book', [130, 40, 140], [240, 220, 255], [60, 15, 70], null, [230, 200, 80]],
      experience_bottle: ['bottle', [120, 220, 60], [200, 255, 160], [60, 80, 60], null, [120, 80, 40]], splash_potion: ['potion', [248, 36, 35], [255, 120, 110], [70, 70, 90], null, [120, 80, 40]], // healing red (MC #F82423)
      glass_bottle: ['bottle', [200, 230, 240], [255, 255, 255], [90, 110, 120], null, [120, 80, 40]],
      flint: ['flint', [70, 70, 70], [120, 120, 120], [25, 25, 25]], tripwire_hook: ['hook', [200, 200, 200], [240, 240, 240], [70, 70, 70], [120, 90, 50], [70, 50, 30]],
      shield: ['shield', [150, 110, 60], [190, 150, 90], [60, 40, 20], null, [180, 180, 180]], ender_eye: ['eye', [40, 120, 90], [120, 220, 180], [10, 40, 30], null, [70, 200, 120]],
      name_tag: ['nametag', [220, 210, 180], [250, 245, 225], [90, 80, 60]], music_disc: ['disc', [40, 40, 40], [90, 90, 90], [10, 10, 10], null, [230, 60, 60]],
      note: ['note', [60, 60, 70], [120, 120, 140], [20, 20, 25]], head: ['head', [200, 150, 115], [255, 255, 255], [40, 30, 20], null, [70, 45, 25]],
      lever: ['lever', [110, 80, 40], [150, 115, 65], [50, 50, 50], null, [130, 130, 130]], oak_door: ['door_out', [162, 130, 78], [200, 170, 110], [80, 60, 30], null, [170, 200, 210]],
    }[n];
    if (I) { this.tpl(t, I[0], I[1], I[2], I[3], I[4] || undefined, I[5] || undefined); if (n === 'stick') this.tpl(t, 'stick', [140, 104, 60], [160, 125, 75], [70, 50, 25], [140, 104, 60]); return; }
    this.img(t, this.noisy([200, 0, 200], .3));
  },
});
