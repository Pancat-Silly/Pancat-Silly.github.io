// ===================== which app is this page? =====================
// top page = virtual desktop only; game windows load this same file as ?app=apvp | ?app=rbs (the dev tool is always apvp).
// A game opened directly (사이트주소/ability_pvp, /randomblock, or ?app=... without p2p=) first asks the same P2P question
// as the desktop, unless "다시 물어보지 않음" was saved.
function SITE_ASK_P2P(go) {
  const s = SITE.getP2P(); if (SITE.inFrame || window.APVP_DEV || window.SITE_P2PQ !== undefined || /^[01]$/.test(SITE.q.get('p2p') || '') || (s && s.remember)) { go(); return; }
  const A = DESK.APPS.find(a => a.id === APP) || {}, d = document.createElement('div'); d.className = 'p2pask'; d.style.cssText = 'position:fixed;z-index:999999';
  d.innerHTML = '<div class="p2pin">' + (A.img ? '<img class="p2plogo" src="' + A.img + '">' : '<div class="p2pico">' + (A.icon || '') + '</div>')
    + '<div class="p2pq">P2P를 이용한 멀티플레이어 기능을 허용하시겠습니까?</div>'
    + '<div class="p2pd">허용하면 같은 방에 들어온 다른 플레이어의 브라우저와 직접 연결해서 함께 플레이해요 (PeerJS · WebRTC).<br>상대방에게 내 IP 주소가 보일 수 있어요. 허용하지 않으면 혼자(연습 · 봇)만 플레이할 수 있어요.</div>'
    + '<div class="p2pb"><button class="p2pyes">허용</button><button class="p2pno">허용 안함</button></div>'
    + '<label class="p2pr"><input type="checkbox"> 다시 물어보지 않음</label>'
    + '<div class="p2pn">나중에 게임 설정에서 다시 바꿀 수 있어요.</div></div>';
  document.body.appendChild(d);
  const pick = allow => { SITE.setP2P(allow, d.querySelector('.p2pr input').checked); SITE._p2p = allow; d.remove(); go(); };
  d.querySelector('.p2pyes').onclick = () => pick(true); d.querySelector('.p2pno').onclick = () => pick(false);
}
SITE.watchVer();
// the site's own title is 팬캣실리의 프로젝트 (the desktop); a game page opened on its own gets the game's name
if (APP !== 'desk' && !SITE.inFrame && !window.SITE_OPEN && /팬캣실리/.test(document.title)) document.title = APP === 'rbs' ? '랜덤블록 서바이벌' : window.APVP_DEV ? '4중인격 개발 도구' : '4중인격 PvP';
if (APP === 'desk') { const bo = $('boot'); if (bo) bo.remove(); DESK.init(); }
else if (APP === 'rbs') SITE_ASK_P2P(RBS_BOOT);
else SITE_ASK_P2P(APVP_BOOT);
{ const s = document.querySelector('#menu .sub'); if (s && SITE.VER) s.insertAdjacentHTML('beforeend', ' · <span class="sitever">' + SITE.verLabel() + '</span>'); } // 4중인격 version label
