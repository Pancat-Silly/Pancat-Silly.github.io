# 랜덤블록 서바이벌 배경음악

게임에 포함하지 않는 BGM이에요. 플레이어가 첫 실행 때 "외부 다운로드" 화면(또는 설정)에서 고르면
브라우저가 `RBGM.SRC`(js/game/33_rbs_pack.js)의 주소에서 받아 IndexedDB에 저장해요.
기본 주소는 이 폴더(`rbs/music/`)예요. 다른 서버에 올리면 SRC를 그 주소로 바꿔요(CORS 필요).

YouTube 오디오 보관함 무료 음악:
- barge.mp3: Barge - Gunnar Olsen (인게임 기본)
- burner.mp3: Burner - Gunnar Olsen (인게임)
- detour.mp3: Detour - Gunnar Olsen (인게임)
- getdown.mp3: Getdown - Point Green (인게임)
- bubble.mp3: Bubble - Raven & Kreyn (데스매치 고정, 0:32부터 페이드인)

로비 음악 Sleeplessness - The Brothers Records는 원작처럼 꺼져 있어서 받지 않아요.
