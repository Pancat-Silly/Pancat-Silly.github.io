"""바로 들어가기 페이지(사이트주소/<폴더>/index.html)를 만든다:  python3 tools/mkentry.py
Each page fetches the site's root index.html and draws it with a <base href> (css/js/rbs/music resolve from the root)
plus a flag script. Adding modules to index.html never requires touching these pages."""
import os, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [  # folder, title, flag script, what it does
    ('ability_pvp', '4중인격 능력 PvP', "window.SITE_OPEN='apvp';", '가상 데스크톱 위에 4중인격 창만 띄운다'),
    ('ability_pvp/nodesktop', '4중인격 능력 PvP', "window.SITE_APP='apvp';", '바탕화면 없이 4중인격만 실행한다'),
    ('randomblock', '랜덤블록 서바이벌', "window.SITE_OPEN='rbs';", '가상 데스크톱 위에 랜덤블록 창만 띄운다'),
    ('randomblock/nodesktop', '랜덤블록 서바이벌', "window.SITE_APP='rbs';", '바탕화면 없이 랜덤블록만 실행한다'),
    ('ability_pvp_dev', '4중인격 개발 도구', "window.SITE_OPEN='apvp_dev';", '가상 데스크톱 위에 4중인격 개발 도구 창만 띄운다'),
    ('ability_pvp_dev/nodesktop', '4중인격 개발 도구', "window.SITE_APP='apvp';window.APVP_DEV=1;", '바탕화면 없이 4중인격 개발 도구만 실행한다'),
]
T = r'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>%(title)s</title>
<style>html,body{margin:0;height:100%%;background:#000;color:#aaa;font:14px sans-serif}body{display:flex;align-items:center;justify-content:center}</style>
</head>
<body>
불러오는 중…
<script>
// 사이트주소/%(dir)s : %(what)s. (tools/mkentry.py로 만든 파일)
// 사이트 루트의 index.html을 받아 <base href>(css·js·rbs/music 경로가 루트 기준)와 앱 플래그만 넣어 그린다.
(function () {
  var FLAG = %(flag)s, root = new URL('%(root)s', location.href);
  fetch(new URL('index.html', root), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (h) {
    h = h.replace(/<head([^>]*)>/i, function (m) { return m + '<base href="' + root.href + '"><script>' + FLAG + '<\/script>'; });
    h = h.replace(/<title>[^<]*<\/title>/i, '<title>' + document.title + '</title>');
    document.open(); document.write(h); document.close();
  }).catch(function () { location.replace(root.href); });
})();
</script>
</body>
</html>
'''
for d, title, flag, what in PAGES:
    os.makedirs(os.path.join(R, d), exist_ok=True)
    open(os.path.join(R, d, 'index.html'), 'w', encoding='utf-8', newline='\n').write(T % {'title': title, 'dir': d, 'what': what, 'flag': json.dumps(flag, ensure_ascii=False), 'root': '../' * (d.count('/') + 1)})
    print(d)
