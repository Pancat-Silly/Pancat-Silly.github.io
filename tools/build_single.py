"""Make ONE self-contained index.html (for Netlify Drop / opening from disk) out of this repo.

    python3 tools/build_single.py            -> dist/index.html

It inlines css/site.css and every <script src> listed in index.html (same order) and drops the
SITE_MULTI flag, so the page goes back to single-file behaviour (game windows = srcdoc copies of itself).
"""
import os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
for m in re.findall(r'<link rel="stylesheet" href="([^"]+)">', h):
    h = h.replace('<link rel="stylesheet" href="%s">' % m, '<style>\n' + open(os.path.join(R, m.split('?')[0]), encoding='utf-8').read() + '</style>')
tags = re.findall(r'<script src="([^"]+)"></script>\n?', h)
code = ''.join(open(os.path.join(R, t.split('?')[0]), encoding='utf-8').read() + '\n' for t in tags)
for i, t in enumerate(tags):
    h = re.sub(r'<script src="%s"></script>\n?' % re.escape(t), '@@CODE@@' if i == 0 else '', h, count=1)
h = h.replace('<script>window.SITE_MULTI=1</script>\n', '').replace('@@CODE@@', '<script>\n' + code + '</script>\n')
os.makedirs(os.path.join(R, 'dist'), exist_ok=True)
open(os.path.join(R, 'dist', 'index.html'), 'w', encoding='utf-8').write(h)
print('dist/index.html', len(h), 'bytes,', len(tags), 'scripts')
