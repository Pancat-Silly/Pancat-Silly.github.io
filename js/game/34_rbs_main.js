// ===================== Random Block Survival: boot + loop =====================
async function RBS_BOOT() {
  const bt = document.querySelector('#boot .boott'); if (bt) bt.innerHTML = '<img src="' + RB_IMG.logo + '" style="width:120px;height:120px;display:block;margin:0 auto 8px;image-rendering:auto">랜덤블록 서바이벌 <b class="dkbeta" style="font-size:12px">베타</b>';
  const tip = document.querySelector('#boot .boottip'); if (tip) tip.textContent = '창이 열리면 바로 로비예요. Esc(모바일은 ☰)를 누르면 메뉴가 열려요!';
  try {
    await BOOT(10, '블록 준비 중…'); RTEX.init(); RBLK.build(); for (const k in RIT) { const I = RIT[k]; if (I.tex) RTEX.T(I.tex); }
    RUI.init();
    await BOOT(30, '맵 불러오는 중…'); RG.init(); RW.setM(0, 31, 6, RBLK.K('slab|spruce_planks|t')); RB_MARK.floating_texts = RB_MARK.floating_texts.filter(f => f.text !== '메뉴'); // the old menu chest -> a top slab between the two upside-down stairs (the menu is Esc + hotbar now)
    RR.signs = RR.signFix(); // turn the standing signs before the first mesh
    await BOOT(55, '3D 화면 준비 중…'); RR.init($('rcv')); RR.rebuild(99999);
    RIN.bind($('rcv'));
    await BOOT(80, '리소스팩 확인 중…'); await RPACK.boot();
    await BOOT(90, '서버에 연결하는 중…');
  } catch (e) { console.error(e); const bo = $('boot'); if (bo) bo.remove(); document.body.innerHTML = '<div style="color:#fff;padding:20px;font:16px sans-serif">이 기기에서 3D(WebGL)를 시작할 수 없어요: ' + esc(e.message) + '</div>'; return; }
  NET.onChange = () => { const a = document.activeElement; if (RUI.paused && !(a && a.tagName === 'INPUT')) RUI.menuDraw(); };
  if (SITE.p2pNow()) NET.connect(RUI.room); else NET.status = 'P2P 꺼짐 (혼자 플레이 · Ready를 누르면 봇 수를 골라요)';
  RUI.chat('§a랜덤블록 서바이벌을 플레이해주셔서 감사합니다!\n만약 랜덤블록 서바이벌이 처음이라면,\n메뉴(Esc · 모바일은 ☰)의 튜토리얼 & 정보를 읽어주세요!');
  if (!SITE.p2pNow()) RUI.chat('§7P2P가 꺼져 있어요. 핫바 5번 §fReady§7를 쓰면 함께할 봇 수를 고를 수 있어요.');
  RUI.chat(RUI.mobile ? '§e핫바 4 멀티플레이 · 5 Ready · 6 놀이터를 고르고 사용 버튼 · ☰ 메뉴: 설정 · 호스트 설정' : '§e화면을 클릭하면 시작해요 · 핫바 4 멀티플레이 · 5 Ready · 6 놀이터는 우클릭 · Esc(또는 M): 설정 · 호스트 설정');
  RUI.started = true;
  let last = performance.now(), acc = 0;
  const frame = now => {
    let dt = now - last; last = now; if (dt > 250) dt = 250; acc += dt;
    while (acc >= 50) { acc -= 50; try { RG.step(); } catch (e) { console.error(e); } }
    try { RR.frame(acc / 50, dt); RUI.hud(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setInterval(() => { if (performance.now() - last > 400) { try { RG.step(); } catch (e) { } try { NET.tickTimeouts(); } catch (e) { } } else { try { NET.tickTimeouts(); } catch (e) { } } }, 500);
  window.__RG = RG;
  await BOOT(100, '준비 완료!'); const bo = $('boot'); if (bo) { bo.classList.add('done'); setTimeout(() => bo.remove(), 450); }
}
