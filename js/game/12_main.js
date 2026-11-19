// ===================== boot / loop =====================
// loading screen: each step yields a frame so the bar actually moves (the page itself is one ~1 MB file)
const BOOT = (pct, msg) => { const b = $('bootBar'), t = $('bootMsg'), n = $('bootPct'); if (b) b.style.width = pct + '%'; if (t) t.textContent = msg; if (n) n.textContent = pct + '%'; return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };
async function APVP_BOOT() {
  try {
    await BOOT(15, '맵 불러오는 중…'); G.initWorld();
    await BOOT(35, '3D 화면 준비 중…'); R.init($('cv')); UI.init();
    await BOOT(55, '블록 쌓는 중…'); R.rebuild(999);
    await BOOT(75, '리소스팩 · 설정 확인 중…'); UI.initPack(); await BUILTIN.load(); if (DEV.on) DEV.init();
    await BOOT(90, '서버에 연결하는 중…');
  } catch (e) { const bo = $('boot'); if (bo) bo.remove(); document.body.innerHTML = '<div style="color:#fff;padding:20px;font:16px sans-serif">이 기기에서 3D(WebGL)를 시작할 수 없어요: ' + esc(e.message) + '</div>'; return; }
  UI.refreshMenu(); UI.connect();
  let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0;
  const frame = (now) => {
    let dt = now - last; last = now; if (dt > 250) dt = 250;
    if (!(UI.paused && G.practice)) { acc += dt; while (acc >= 50) { acc -= 50; try { G.step(); } catch (e) { console.error(e); } } }
    try { R.frame(acc / 50, dt); if (G.phase === 'game') UI.hud(dt); } catch (e) { console.error(e); }
    fpsN++; fpsT += dt; if (fpsT > 500) { UI.fps = fpsN * 1000 / fpsT; fpsN = 0; fpsT = 0; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // keep the connection alive when the page is throttled/backgrounded (rAF paused)
  setInterval(() => { if (performance.now() - (G.lastStep || 0) > 400) { try { if (NET.mode !== 'off') NET.send(G.buildPresence()); NET.tickTimeouts(); } catch (e) { } } }, 500);
  window.__G = G;
  await BOOT(100, '준비 완료!'); const bo = $('boot'); if (bo) { bo.classList.add('done'); setTimeout(() => bo.remove(), 450); }
}
