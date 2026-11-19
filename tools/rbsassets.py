"""Embed the small Random Block Survival resource-pack assets (sfx mp3 + icons) as data URLs -> rbs_assets.js.
BGM stays as separate files in rbs/music/ (too big to embed), loaded on demand."""
import base64, io, json, sys, os
from PIL import Image
RP = sys.argv[1]; SFX = sys.argv[2]; OUT = sys.argv[3]
use = ['sfx_hurry', 'sfx_rare', 'sfx_win_yay', 'sfx_win_sin2', 'sfx_win_sin3', 'sfx_win_sin4', 'sfx_gameover', 'sfx_intro', 'sfx_error']
snd = {k: base64.b64encode(open(os.path.join(SFX, k + '.mp3'), 'rb').read()).decode() for k in use}
img = {}
for key, path, size in [('ready', 'textures/icons/icon_ready.png', 96), ('settings', 'textures/icons/icon_settings.png', 96), ('playground', 'textures/icons/icon_playground.png', 96),
                        ('help', 'textures/icons/icon_help.png', 96), ('logo', 'textures/branding/logo_randomblock_v2p2.png', 256),
                        ('lucky', 'textures/blocks/block_lucky.png', 16), ('nether_bedrock', 'textures/blocks/block_nether_bedrock.png', 16)]:
    im = Image.open(os.path.join(RP, path)).convert('RGBA')
    if im.size[0] != size: im = im.resize((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); img[key] = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
js = '// Random Block Survival V2 P2 resource pack (sfx + icons). BGM: rbs/music/*.mp3 next to index.html\n'
js += 'const RB_SFX=' + json.dumps(snd) + ';\nconst RB_IMG=' + json.dumps(img) + ';\n'
open(OUT, 'w').write(js); print('rbs assets', len(js), file=sys.stderr)
