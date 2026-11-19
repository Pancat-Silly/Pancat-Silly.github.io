import json, base64, sys, os
SRC = sys.argv[1]  # map dir
SND = sys.argv[2]  # snd dir
OUT = sys.argv[3]

d = json.load(open(os.path.join(SRC, 'arena1_main_voxels.json')))
X, Y, Z = d['size']
P = d['palette']

NAME = {
 'light_gray_concrete': 1, 'gray_concrete': 2, 'white_concrete': 3, 'orange_concrete': 4,
 'red_concrete': 5, 'lime_concrete': 6, 'purple_concrete': 7, 'blue_concrete': 8,
 'stripped_jungle_log': 18, 'glass': 19, 'stone_bricks': 20, 'smooth_stone': 37,
 'powder_snow': 38, 'lava': 39, 'bell': 34, 'pale_oak_wall_hanging_sign': 36,
}
def conv(p):
    n = p['name']; pr = p['props']
    if n in NAME: return NAME[n]
    t = pr.get('type'); f = pr.get('facing')
    if n == 'smooth_quartz_slab': return {'bottom': 10, 'top': 11, 'double': 9}[t]
    if n == 'smooth_quartz_stairs': return {'east': 12, 'west': 13, 'north': 14, 'south': 15}[f]
    if n == 'oak_slab': return {'bottom': 16, 'top': 17}[t]
    if n == 'stone_brick_slab': return {'bottom': 21, 'top': 22, 'double': 20}[t]
    if n == 'stone_brick_stairs': return {'east': 23, 'west': 24, 'north': 25, 'south': 26}[f]
    if n == 'sandstone_slab': return 27
    if n == 'diorite_slab': return {'top': 28, 'bottom': 29}[t]
    if n == 'ladder': return {'east': 30, 'west': 31, 'north': 32, 'south': 33}[f]
    if n == 'birch_trapdoor': return 35
    if n == 'iron_bars':
        m = (pr['north'] == 'true') * 1 + (pr['east'] == 'true') * 2 + (pr['south'] == 'true') * 4 + (pr['west'] == 'true') * 8
        return 48 + m
    raise Exception('unmapped ' + n)

grid = bytearray(X * Y * Z)
for x, y, z, pi in d['blocks']:
    grid[(y * Z + z) * X + x] = conv(P[pi])

# RLE: value byte, run length varint
out = bytearray()
i = 0; N = len(grid)
while i < N:
    v = grid[i]; j = i
    while j < N and grid[j] == v: j += 1
    run = j - i
    out.append(v)
    while True:
        b = run & 127; run >>= 7
        if run: out.append(b | 128)
        else: out.append(b); break
    i = j
print('rle bytes', len(out), file=sys.stderr)

snds = {}
for f in sorted(os.listdir(SND)):
    if f.endswith('.mp3') or f.endswith('.wav'):
        snds[f[:-4]] = base64.b64encode(open(os.path.join(SND, f), 'rb').read()).decode()

js = 'const MAPDATA={size:[%d,%d,%d],origin:%s,rle:"%s"};\n' % (X, Y, Z, json.dumps(d['world_origin']), base64.b64encode(bytes(out)).decode())
js += 'const SOUNDS=' + json.dumps(snds) + ';\n'
open(OUT, 'w').write(js)
print('assets js', len(js), file=sys.stderr)
