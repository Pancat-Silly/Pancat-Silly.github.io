"""Random Block Survival V2 P2: convert the map package (voxels/*.json + markers.json) into engine data.

Output rbs_data.js:
  RB_KEYS   block key list (index = block id, 0 = air). Keys encode shape params, e.g. 'stairs|spruce_planks|e|0'.
            The JS registry (13_rbs_blocks.js) builds every block's properties from its key.
  RB_DIM    world size / offset (engine index = minecraft coord + offset)
  RB_WORLD  base world (lobby, arena shell, deathmatch, playground, winner room) as RLE base64
  RB_SIGNS  wall sign texts [x, y, z, facing, text] (minecraft coords)
  RB_BE     block entities we use (menu chest, dungeon furnaces, banners ...)
  RB_ARENA  arena generation palette (33 entries, in-game result + intended block + chest loot)
  RB_MARK   markers.json points / volumes (for reference in code)
Machinery (command blocks, redstone) is skipped. The settings room / host room are replaced by the menu chest.
"""
import json, base64, os, sys
PKG = sys.argv[1]; OUT = sys.argv[2]
V21 = sys.argv[3]   # V2.1 change package: its voxels / palettes replace the V2 ones
OX, OY, OZ = 60, 0, 60
SX, SY, SZ = 88, 224, 100
ZONES = ['lobby', 'arena_shell_25p', 'deathmatch_9p_25p', 'playground', 'mini_pvp', 'winner_room']

KEYS = ['air']
KI = {'air': 0}
def K(k):
    if k not in KI:
        KI[k] = len(KEYS); KEYS.append(k)
    return KI[k]

DIRW = {0: 'e', 1: 'w', 2: 's', 3: 'n'}            # stairs weirdo_direction
FD = {2: 'n', 3: 's', 4: 'w', 5: 'e'}               # facing_direction (side the block faces)
WOOD = {'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'}
SLAB1 = {'smooth_stone': 'smooth_stone', 'sandstone': 'sandstone', 'wood': 'oak_planks', 'cobblestone': 'cobblestone', 'brick': 'bricks',
         'stone_brick': 'stone_bricks', 'quartz': 'quartz_block', 'nether_brick': 'nether_bricks'}
SLAB2 = {'red_sandstone': 'red_sandstone', 'purpur': 'purpur_block', 'prismarine_rough': 'prismarine', 'mossy_cobblestone': 'mossy_cobblestone',
         'smooth_sandstone': 'sandstone', 'red_nether_brick': 'red_nether_bricks'}
SLAB4 = {'mossy_stone_brick': 'mossy_stone_bricks', 'smooth_quartz': 'quartz_block', 'stone': 'stone', 'cut_sandstone': 'sandstone'}
STAIRMAT = {'spruce_stairs': 'spruce_planks', 'birch_stairs': 'birch_planks', 'oak_stairs': 'oak_planks', 'brick_stairs': 'bricks',
            'quartz_stairs': 'quartz_block', 'stone_brick_stairs': 'stone_bricks', 'stone_stairs': 'cobblestone', 'dark_oak_stairs': 'dark_oak_planks'}
FLOWER = {'poppy': 'poppy', 'orchid': 'blue_orchid', 'allium': 'allium', 'houstonia': 'azure_bluet', 'tulip_red': 'red_tulip', 'tulip_orange': 'orange_tulip',
          'tulip_white': 'white_tulip', 'tulip_pink': 'pink_tulip', 'oxeye': 'oxeye_daisy', 'cornflower': 'cornflower', 'lily_of_the_valley': 'lily_of_the_valley'}

def conv(p, pos=None, keepMach=False):
    n = p['name'].replace('minecraft:', ''); s = p.get('states', {}); cat = p.get('category')
    if (cat == 'machinery' and not keepMach) or n in ('structure_void',): return None
    if n == 'barrier': return 'barrier'
    if n == 'mef:nether_bedrock': return 'nether_bedrock'
    if n in ('grass',): return 'grass_block'
    if n == 'grass_path': return 'dirt_path'
    if n == 'dirt': return 'coarse_dirt' if s.get('dirt_type') == 'coarse' else 'dirt'
    if n == 'stone': return {'stone': 'stone', 'granite': 'granite', 'diorite': 'diorite', 'andesite': 'andesite'}.get(s.get('stone_type', 'stone'), 'stone')
    if n == 'planks': return s.get('wood_type', 'oak') + '_planks'
    if n == 'log':
        ax = s.get('pillar_axis', 'y'); return 'log|' + s.get('old_log_type', 'oak') + '|' + ax
    if n == 'leaves': return s.get('old_leaf_type', 'oak') + '_leaves'
    if n == 'stonebrick': return {'default': 'stone_bricks', 'mossy': 'mossy_stone_bricks', 'cracked': 'cracked_stone_bricks', 'chiseled': 'stone_bricks'}[s.get('stone_brick_type', 'default')]
    if n == 'quartz_block': return {'default': 'quartz_block', 'smooth': 'smooth_quartz', 'lines': 'quartz_pillar', 'chiseled': 'quartz_block'}[s.get('chisel_type', 'default')]
    if n == 'concrete': return s.get('color', 'white') + '_concrete'
    if n == 'stained_glass': return s.get('color', 'white') + '_stained_glass'
    if n == 'sand': return 'sand'
    if n in ('lit_redstone_lamp',): return 'redstone_lamp_on'
    if n == 'seaLantern': return 'sea_lantern'
    if n == 'sponge': return 'sponge'
    if n == 'magma': return 'magma_block'
    if n == 'nether_brick': return 'nether_bricks'
    if n == 'red_nether_brick': return 'red_nether_bricks'
    if n == 'podzol': return 'podzol'
    if n in ('wooden_slab', 'stone_slab', 'stone_slab2', 'stone_slab4'):
        if n == 'wooden_slab': mat = s.get('wood_type', 'oak') + '_planks'
        elif n == 'stone_slab': mat = SLAB1[s.get('stone_slab_type', 'smooth_stone')]
        elif n == 'stone_slab2': mat = SLAB2[s.get('stone_slab_type_2')]
        else: mat = SLAB4[s.get('stone_slab_type_4')]
        return 'slab|' + mat + '|' + ('t' if s.get('top_slot_bit') else 'b')
    if n in ('double_wooden_slab', 'double_stone_slab', 'double_stone_slab2', 'double_stone_slab4'):
        if n == 'double_wooden_slab': return s.get('wood_type', 'oak') + '_planks'
        if n == 'double_stone_slab': return SLAB1[s.get('stone_slab_type', 'smooth_stone')]
        if n == 'double_stone_slab2': return SLAB2[s.get('stone_slab_type_2')]
        return SLAB4[s.get('stone_slab_type_4')]
    if n in STAIRMAT: return 'stairs|' + STAIRMAT[n] + '|' + DIRW[s.get('weirdo_direction', 0)] + '|' + str(s.get('upside_down_bit', 0))
    if n == 'fence': return 'fence|' + s.get('wood_type', 'oak') + '_planks'
    if n == 'nether_brick_fence': return 'fence|nether_bricks'
    if n == 'cobblestone_wall': return 'wall|' + {'cobblestone': 'cobblestone', 'stone_brick': 'stone_bricks', 'mossy_cobblestone': 'mossy_cobblestone'}.get(s.get('wall_block_type'), 'cobblestone')
    if n == 'glass_pane': return 'pane|glass'
    if n == 'iron_bars': return 'pane|iron_bars'
    if n.endswith('_door'):  # rules v2: direction/open from the LOWER half, hinge from the UPPER half
        mat = n[:-5]; up = s.get('upper_block_bit', 0); lo, hi = door_pair(pos, up)
        f = {0: 'e', 1: 's', 2: 'w', 3: 'n'}[lo.get('direction', 0)]
        return 'door|%s|%s|%d|%s|%s' % (mat, f, lo.get('open_bit', 0), 'r' if hi.get('door_hinge_bit', 0) else 'l', 'u' if up else 'l')
    if n.endswith('trapdoor'):  # direction -> hinge side 0=W 1=E 2=N 3=S
        mat = 'oak' if n == 'trapdoor' else n[:-9]
        return 'trapdoor|%s|%s|%d|%d' % (mat, {0: 'w', 1: 'e', 2: 'n', 3: 's'}[s.get('direction', 0)], s.get('open_bit', 0), s.get('upside_down_bit', 0))
    if n.endswith('fence_gate'): return 'gate|oak|%s|%d' % ({0: 's', 1: 'w', 2: 'n', 3: 'e'}[s.get('direction', 0)], s.get('open_bit', 0))
    if n == 'ladder': return 'ladder|' + FD[s.get('facing_direction', 2)]
    if n.endswith('wall_sign'): return 'wsign|' + (n[:-10] if n != 'wall_sign' else 'oak') + '|' + FD[s.get('facing_direction', 2)]
    if n.endswith('button'): return 'button|' + ('stone' if n == 'stone_button' else n[:-7]) + '|' + str(s.get('facing_direction', 1)) + '|0'
    if n == 'lever': return 'lever|' + s.get('lever_direction', 'north') + '|' + str(s.get('open_bit', 0))
    if n in ('torch', 'redstone_torch', 'unlit_redstone_torch'):
        k = 'torch' if n == 'torch' else 'rtorch'; return k + '|' + s.get('torch_facing_direction', 'top') + ('' if k == 'torch' else '|' + ('0' if n.startswith('unlit') else '1'))
    if n in ('unpowered_repeater', 'powered_repeater', 'unpowered_comparator', 'powered_comparator'): return 'diode|' + ('repeater' if 'repeater' in n else 'comparator') + '|' + str(s.get('direction', 0))
    if n in ('command_block', 'chain_command_block', 'repeating_command_block'): return 'cmd|' + {'command_block': 'impulse', 'chain_command_block': 'chain', 'repeating_command_block': 'repeat'}[n] + '|' + str(s.get('facing_direction', 0))
    if n.endswith('pressure_plate'): return 'plate|' + n[:-15] + '|0'
    if n == 'carpet': return 'carpet|' + s.get('color', 'white')
    if n == 'rail': return 'rail|' + str(s.get('rail_direction', 0))
    if n == 'redstone_lamp': return 'redstone_lamp'
    if n == 'red_flower': return 'plant|' + FLOWER.get(s.get('flower_type', 'poppy'), 'poppy')
    if n == 'yellow_flower': return 'plant|dandelion'
    if n == 'tallgrass': return 'plant|' + ('fern' if s.get('tall_grass_type') == 'fern' else 'short_grass')
    if n == 'double_plant': return 'plant|tall_grass_' + ('top' if s.get('upper_block_bit') else 'bottom')
    if n == 'reeds': return 'plant|sugar_cane'
    if n == 'fire': return 'fire'
    if n == 'soul_fire': return 'fire'
    if n in ('warped_roots', 'crimson_roots', 'warped_fungus', 'crimson_fungus', 'nether_sprouts'): return 'plant|' + n
    if n == 'standing_sign' or n.endswith('_standing_sign'): return 'ssign|' + ('oak' if n == 'standing_sign' else n[:-14]) + '|' + ('x' if (s.get('ground_sign_direction', 0) // 2) % 4 in (1, 3) else 'z')
    if n == 'redstone_wire': return 'rwire'
    if n in ('warped_stem', 'crimson_stem'): return 'stem|' + n.split('_')[0] + '|' + s.get('pillar_axis', 'y')
    if n in ('warped_nylium', 'crimson_nylium'): return n
    if n == 'water': return 'water|' + str(min(int(s.get('liquid_depth', 0)), 8))
    if n == 'lava': return 'lava|' + str(min(int(s.get('liquid_depth', 0)), 8))
    if n == 'chest': return 'chest|' + FD.get(s.get('facing_direction', 2), 'n')
    if n == 'furnace': return 'furnace|' + FD.get(s.get('facing_direction', 2), 'n')
    if n == 'blast_furnace': return 'blast_furnace|' + FD.get(s.get('facing_direction', 2), 'n')
    if n == 'anvil': return 'anvil|' + ('x' if s.get('direction', 0) in (1, 3) else 'z')
    if n == 'composter': return 'composter'
    if n == 'scaffolding': return 'scaffolding'
    if n == 'campfire': return 'campfire'
    if n == 'bell': return 'bell'
    if n == 'wall_banner': return 'wbanner|' + FD[s.get('facing_direction', 2)]
    if n == 'redstone_lamp': return 'redstone_lamp'
    return n  # plain full blocks: bedrock, cobblestone, glass, glowstone, netherrack, quartz_ore, ancient_debris, nether_gold_ore, emerald_block, smooth_stone, mossy_cobblestone ...

# keys every round may need (arena palette, crafted / placed blocks) — fixed ids so nothing depends on map contents
for k in ['stone', 'cobblestone', 'dirt', 'gravel', 'sand', 'oak_planks', 'log|oak|y', 'log|oak|x', 'log|oak|z', 'oak_leaves', 'iron_ore', 'gold_ore', 'diamond_ore',
          'lapis_ore', 'redstone_ore', 'coal_ore', 'bookshelf', 'crafting_table', 'glass', 'bedrock', 'diamond_block', 'iron_block', 'gold_block',
          'lapis_block', 'coal_block', 'redstone_block', 'enchanting_table', 'torch', 'deny', 'cracked_stone_bricks', 'stone_bricks', 'tnt']:
    K(k)
for d in 'nsew':
    K('furnace|' + d); K('furnace_on|' + d); K('blast_furnace|' + d); K('blast_furnace_on|' + d); K('chest|' + d)
K('anvil|x'); K('anvil|z'); K('red_stained_glass')
for d in 'nsew': K('ladder|' + d)
for lv in range(9): K('water|%d' % lv); K('lava|%d' % lv)

ZDOOR = {}
def door_pair(pos, up):
    x, y, z = pos; me = ZDOOR.get((x, y, z), {}); other = ZDOOR.get((x, y - 1 if up else y + 1, z), {})
    return (other, me) if up else (me, other)
import array
grid = array.array('H', bytes(2 * SX * SY * SZ))
signs, bes, unk = [], [], {}
for z in ZONES:
    d = json.load(open(os.path.join(V21, 'voxels', z + '.json'))); keepMach = z == 'playground'  # the playground's dungeon shows its command blocks
    pal = d['palette']
    ZDOOR.clear()
    for x, y, zz, pi in d['blocks']:
        if pal[pi]['name'].endswith('_door'): ZDOOR[(x, y, zz)] = pal[pi].get('states', {})
    fac = {}
    for x, y, zz, pi in d['blocks']:
        k = conv(pal[pi], (x, y, zz), keepMach)
        if k is None: continue
        if z == 'arena_shell_25p' and k != 'bedrock': continue
        X, Y, Z = x + OX, y + OY, zz + OZ
        if not (0 <= X < SX and 0 <= Y < SY and 0 <= Z < SZ): unk['out_of_range'] = unk.get('out_of_range', 0) + 1; continue
        grid[(Y * SZ + Z) * SX + X] = K(k)
        fac[(x, y, zz)] = k
    ents = [{'pos': e['pos'], 'type': e['type'], 'text': e.get('text', e.get('Text', '')), 'custom_name': e.get('custom_name', e.get('CustomName')), 'items': e.get('items', e.get('Items', []))} for e in d.get('block_entities', []) if e['type'] != 'CommandBlock']
    for e in ents:
        x, y, zz = e['pos']; k = fac.get((x, y, zz), '')
        if e['type'] == 'Sign':
            f = k.split('|')[-1] if k.startswith('wsign') else 'n'
            signs.append([x, y, zz, f, e.get('text', '')])
        elif e['type'] in ('Chest', 'Furnace', 'Banner', 'Bell', 'Campfire'):
            bes.append({'zone': z, 'pos': e['pos'], 'type': e['type'], 'name': e.get('custom_name'), 'items': e.get('items', [])})

def flip(k):
    p = k.split('|'); o = []
    if p[0] == 'door': q = p[:]; q[3] = '1' if p[3] == '0' else '0'; o.append('|'.join(q))
    if p[0] in ('trapdoor',): q = p[:]; q[3] = '1' if p[3] == '0' else '0'; o.append('|'.join(q))
    if p[0] == 'gate': q = p[:]; q[3] = '1' if p[3] == '0' else '0'; o.append('|'.join(q))
    if p[0] in ('lever', 'button', 'plate'): q = p[:]; q[-1] = '1' if p[-1] == '0' else '0'; o.append('|'.join(q))
    if p[0] == 'rtorch': q = p[:]; q[2] = '1' if p[2] == '0' else '0'; o.append('|'.join(q))
    if k == 'redstone_lamp': o.append('redstone_lamp_on')
    if k == 'redstone_lamp_on': o.append('redstone_lamp')
    return o
for k in list(KEYS):
    for f in flip(k): K(f)
mk = json.load(open(os.path.join(PKG, 'markers.json')))
m21 = json.load(open(os.path.join(V21, 'markers_v21.json')))
P21 = {e['r']: e for e in m21['main_palette_v21']}
arena = []
for p in mk['arena_generation']['palette']:
    def bk(b):
        if not b: return None
        return conv({'name': b['name'], 'states': b.get('states', {})})
    ig, it = bk(p['in_game_result']), bk(p.get('intended'))
    K(ig);
    if it: K(it)
    e21 = P21.get(p['r']); loot = p.get('chest_loot')
    if e21 and e21.get('name'): it = K(conv({'name': e21['name'], 'states': e21.get('states', {})})) and conv({'name': e21['name'], 'states': e21.get('states', {})}); ig = it
    if e21 and e21.get('chest_loot'): loot = [{'id': c['id'], 'count': c['count'], 'damage': c.get('damage', 0)} for c in e21['chest_loot']]
    arena.append({'r': p['r'], 'game': ig, 'fixed': it or ig, 'loot': loot})
mini = []
for e in m21['mini_palette']:
    k = conv({'name': e['name'], 'states': e.get('states', {})}); K(k)
    mini.append({'m': e['mini'], 'k': k, 'loot': [{'id': c['id'], 'count': c['count'], 'damage': c.get('damage', 0), 'ench': c.get('ench')} for c in e['chest_loot']] if e.get('chest_loot') else None})

# RLE: value byte, run length varint
out = bytearray(); i = 0; N = len(grid)
while i < N:
    v = grid[i]; j = i
    while j < N and grid[j] == v: j += 1
    run = j - i
    vv = v
    while True:
        b = vv & 127; vv >>= 7
        if vv: out.append(b | 128)
        else: out.append(b); break
    while True:
        b = run & 127; run >>= 7
        if run: out.append(b | 128)
        else: out.append(b); break
    i = j
assert len(KEYS) < 65535, len(KEYS)
js = '// generated by rbsconv.py from the Random Block Survival V2 P2 map package + the V2.1 change package\n'
js += 'const RB_KEYS=' + json.dumps(KEYS) + ';\n'
js += 'const RB_DIM={sx:%d,sy:%d,sz:%d,ox:%d,oy:%d,oz:%d};\n' % (SX, SY, SZ, OX, OY, OZ)
js += 'const RB_WORLD="' + base64.b64encode(bytes(out)).decode() + '";\n'
js += 'const RB_SIGNS=' + json.dumps(signs, ensure_ascii=False) + ';\n'
js += 'const RB_BE=' + json.dumps([b for b in bes if b['type'] != 'Chest'], ensure_ascii=False) + ';\n'
js += 'const RB_ARENA=' + json.dumps(arena, ensure_ascii=False) + ';\n'
js += 'const RB_FURN=' + json.dumps({','.join(map(str, b['pos'])): b.get('name') for b in bes if b['type'] == 'Furnace'}, ensure_ascii=False) + ';\n'
MK = {k: mk[k] for k in ['points', 'volumes', 'floating_texts', 'timer_modes_lma', 'deathmatch']}
MK['points'] = m21['points']; MK['volumes'] = m21['volumes']; MK['floating_texts'] = [f for f in m21['floating_texts'] if f['pos'][1] > 20]
js += 'const RB_MINI=' + json.dumps(mini, ensure_ascii=False) + ';\n'
js += 'const RB_MARK=' + json.dumps(MK, ensure_ascii=False) + ';\n'
open(OUT, 'w').write(js)
print('keys', len(KEYS), 'rle', len(out), 'signs', len(signs), 'be', len(bes), 'js', len(js), unk, file=sys.stderr)
