# CLAUDE.md — 프로젝트 컨텍스트 (새 세션에서 먼저 읽기)

이 저장소는 마인크래프트 맵 두 개를 웹으로 옮긴 사이트다. 빌드 도구 없이 정적 파일만으로 돌아가고, GitHub Pages에 그대로 올린다.

- **4중인격 PvP (apvp):** 사용자가 만든 Java 1.21.4 서버 맵이다.
- **랜덤블록 서바이벌 V2 P2 + V2.1 (rbs, 베타):** LemonyMEF의 Bedrock 맵이다.

사이트 첫 화면은 "가상 데스크톱"이다(페이지 제목: 팬캣실리의 프로젝트). 기본 주소로 열면 게임 창 없이 바탕화면만 뜬다(아이콘으로 연다).

## 사용자 규칙 (항상 지킬 것)
- **답변과 UI 문구:** 답변은 **한국어**로 한다. UI 문구도 한국어이고 마인크래프트 톤을 따른다.
- **결과물 전달:** 바뀐 파일만 보낸다. 한 파일 배포가 필요하면 `tools/build_single.py`로 `dist/index.html`을 만든다.
- **마인크래프트 에셋:** 원본 에셋을 **번들하지 않는다.** 바닐라 리소스팩(텍스처·사운드)은 플레이어 브라우저가 런타임에 공식 미러에서 받는다(`PACK.get` / `RPACK`, IndexedDB 캐시). 리소스팩이 없을 때는 절차적으로 만든 텍스처와 합성음을 쓴다.
- **랜덤블록 BGM:** 외부 파일 `rbs/music/*.mp3`이다. 파일이 없으면 음악 없이 돈다. 사용자가 나중에 직접 넣는다.
- **새 직업:** 사용자가 추가해 달라는 직업은 "미완성"(WIP)으로 넣는다. 개발 도구 결과 txt는 `tools/modjobs/`에 넣고 `tools/mkmodjobs.py`로 `js/data/jobs_builtin.js`에 반영한다. 직업 목록의 "🛠 개발중" 구분선 아래로 보낸다(`DEV_JOBS`, 11_ui.js).
- **원작 버그:** 고치라는 말이 없으면 원작 그대로 둔다. 예: 던전 열쇠 "3초" 단계 생략.
  - 예외: V2.1에서 새로 생긴 원작 버그는 사용자 요청으로 무시했다. 남쪽 절반 광석 누락, 25인 기본템 박스, 9인 판자 링 같은 것들이다.
- **개발 도구 결과물:** 사용자가 개발 도구 결과물(txt)을 붙여 주면 그 안의 코드·효과음·메모를 반영한다.

## 파일 구조
```
index.html            페이지 뼈대(HTML만) + <script src> 목록 (이 순서가 곧 로드 순서)
ability_pvp/, randomblock/, ability_pvp_dev/ (+ 각 nodesktop/)  바로 들어가기 페이지: 루트 index.html을 받아 <base href> + SITE_OPEN(데스크톱) 또는 SITE_APP(nodesktop)을 넣고 그린다. tools/mkentry.py로 만든다 (모듈 추가 때 손볼 일 없음)
css/site.css          모든 스타일 (4중인격 + 데스크톱; 랜덤블록 CSS는 31_rbs_ui.js 안의 RUI_CSS 문자열)
js/data/              생성된 데이터 (손으로 고치지 말고 tools/ 스크립트로 다시 생성)
  apvp_assets.js      4중인격 맵 복셀 + 사운드 이름→파일 경로 SOUNDS (mkassets.py → split_sounds.py)
  apvp_extra_snd.js   원본 패키지 이후에 추가한 4중인격 효과음 → SOUNDS (mkextrasnd.py, 원본 tools/sounds/*)
  rbs_data.js         랜덤블록 월드: RB_KEYS, RB_DIM, RB_WORLD(16비트 RLE), RB_SIGNS, RB_BE, RB_ARENA, RB_MINI, RB_FURN, RB_MARK (rbsconv.py)
  rbs_assets.js       랜덤블록 원작 팩 효과음 RB_SFX(파일 경로), 아이콘 RB_IMG(base64 PNG) (rbsassets.py → split_sounds.py)
  rbs_icon.js         바탕화면 아이콘 RB_ICON (SVG)
  jobs_builtin.js     개발 도구로 만든 내장 직업 BUILTIN_JOBS (mkmodjobs.py)
  frog.js             dude New 댄스 개구리 FROG (Frog Marauder FBX → mkfrog.py, 6부위에 정점마다 2부위 가중치 스키닝 + 텍스처 PNG)
  dances.js           공용 춤 DANCE_DATA (마카레나·강남스타일, Mixamo FBX → mkdance.py). 두 게임이 같이 쓴다
js/game/              게임 코드. 파일 이름 순서로 로드하는 일반 <script>들 (전역 공유)
rbs/music/            랜덤블록 BGM mp3 (선택)
(가사 타이밍 도구는 사이트에 안 올림: 로컬 tools/lyrics/lyrics_timing.html 한 파일, 사용자에게 파일로 전달) 노래+가사를 넣고 문장·단어·글자 단위로 TAP해서 시간을 찍고 파형 위 세로선을 끌어 고친다. 확장 LRC(txt)·JSON·게임 JS(DUDE_LYRICS 형식)로 내보냄. examples/dude_dance.lrc = 지금 게임 가사. ?audio=&lrc=로 바로 불러옴
sounds/               효과음 파일 (apvp/, rbs/, jobs/<직업>/). 랜덤블록 sfx_gameover·sfx_error·sfx_win_sin*는 사용자 요청으로 저장소에 안 올림(.gitignore, RB_SFX에서도 뺌 → 합성음). 예전에 js/data 안에 base64로 있던 것 (tools/split_sounds.py)
tools/                [로컬 전용 · .gitignore로 저장소에 안 올림] mkdance.py + fbxbin.py + dance/*.fbx, mkentry.py, split_sounds.py, bump_version.py, hooks/pre-commit, build_single.py, rbsconv.py, rbsassets.py, mkmodjobs.py, mkassets.py, modjobs/*.txt, normalize_sounds.py + sound_norm.json + sounds_orig/
```
모듈을 새로 추가하면 **index.html에 `<script src>`도 추가**해야 한다. 순서는 파일 이름 순이다.

### js/game 모듈
| 파일 | 내용 |
|---|---|
| 00_wall.js | 바탕화면 배경 사진 (base64 JPEG) |
| 01_core.js | 공통: `SELF_HTML`, `DEV_VER`, `World`(복셀), 수학·유틸 (`$`, `clamp`, `uid`, `M4` 행렬 …) |
| 01b_dance.js | 공용 춤 재생 `DANCE`: `pick(seed)`, `pose(이름, 초)` → root yaw·엉덩이 위치 + 몸·머리·팔·다리 각도(MC ModelPart식 RZ·RY·RX, `DANCE.rot`). 4중인격에서도 그대로 쓰면 된다 |
| 02_gfx.js / 02b_skin.js | WebGL1 렌더러(`Gfx`)와 아틀라스 / 마크 닉네임 스킨 (mc-heads.net → minotar.net, 2곳만) |
| 03_audio.js / 03b_pack.js | 4중인격 오디오(`AU`: master ← `sfxBus` 게임 효과음(합성음·바닐라 팩) / `abBus` 능력 효과음(추가한 파일·모드 합성음), 설정의 볼륨·게임 효과음·능력 효과음 = `vol`·`vSfx`·`vAb`, 저장 `apvp`) / 바닐라 리소스팩 다운로드(`PACK`) |
| 04_items.js | 인격·효과·아이템·직업 정의 `JOBS`, `JOB_ORDER`, 아이템 테이블 |
| 05_player.js / 06_skills.js | 플레이어 물리·전투(20TPS, MC 물리) / 직업 스킬 |
| 07_net.js | `NET`: PeerJS P2P → BroadcastChannel → 오프라인. `NG()`/`NB()`가 앱별 훅으로 연결한다 (G = 4중인격, RG = 랜덤블록). `NET.blob`으로 큰 데이터를 보낸다 |
| 08_bot.js / 09_game.js / 10_render.js | 4중인격 연습 봇 / 게임 상태 `G` / 렌더 `R` |
| 11_ui.js | 4중인격 UI `UI`: 메뉴, HUD, 입력, **키 설정**(`BINDS`, `kb`, localStorage `apvp_keys`), **단계식 ESC 메뉴**(`mcPause`, `PAGES`, `mcPage`) |
| 11b_touch.js | 모바일 조작(기존 / 마크 PE) + 버튼 배치 편집기 |
| 11c_mod.js | 모드 API `APVP.addJob`, `api.*`, 개발 도구(연습 모드 테스트, 결과 txt), `devDownload()` |
| 11d_prompt.js | 개발 도구 AI 프롬프트 (버전 `DEV_VER`) |
| 11e_desk.js | 사이트 셸: `SITE`(P2P 허용 저장, 부모 창과 통신), `APP` 판별, `DESK` 창 관리자, P2P 동의 화면 |
| 11f_upload.js | 방장 업로드 직업("업로드됨" 파란 딱지), `BUILTIN.load()` |
| 12_main.js | `APVP_BOOT()` |
| 20~34_rbs_*.js | 랜덤블록 서바이벌 (아래 참고) |
| 99_boot.js | `APP`가 'desk'면 `DESK.init()`, 'rbs'면 `RBS_BOOT()`, 아니면 `APVP_BOOT()` |

## 사이트 셸 (가상 데스크톱)
- **앱 판별:** `APP`는 'desk' | 'apvp' | 'rbs'이다. `window.SITE_APP`이나 `?app=`로 정해지고, `APVP_DEV`가 있으면 'apvp'가 된다.
- **게임 창:** iframe이다.
  - 한 파일 빌드: `SELF_HTML`(자기 HTML 복사본)에 앱 플래그를 넣어 `srcdoc`으로 띄운다.
  - 분할 빌드(`window.SITE_MULTI=1`, index.html head): `index.html?app=rbs&p2p=0|1`을 `src`로 띄운다.
- **창 ↔ 데스크톱 통신:** `postMessage {site:1, t:'fs'|'unfs'|'win'|'close'|'land'|'title'}`.
- **자동 전체화면 (PC):** 게임 화면을 클릭하면 **브라우저만** 전체화면이 되고 게임 창 크기는 그대로다(`{t:'fs', auto:1}` → `DESK.onMsg`가 창 모드는 안 바꿈). 켜고 끄기는 localStorage `site_autofs` 하나(`SITE.autoFs()`)를 데스크톱 설정·4중인격 설정·랜덤블록 설정이 같이 쓴다. 제목줄 ⛶ 버튼(꽉 찬 화면)은 따로다.
- **모바일:** 게임 창은 항상 전체 화면이고, 가로 모드 버튼(`land`)이 있다.
- **바로 들어가기:** `사이트주소/ability_pvp`, `사이트주소/randomblock` → 가상 데스크톱 위에 그 게임 창만 연다(`SITE_OPEN`). 뒤에 `/nodesktop`을 붙이면 바탕화면 없이 단독 실행한다(`SITE_APP`). 단독 실행(창 밖, `p2p=` 없음)이면 `SITE_ASK_P2P`(99_boot.js)가 같은 동의 화면을 먼저 띄운다.
- **사이트 버전·새 버전 알림:** 커밋할 때마다 pre-commit 훅(`tools/hooks/pre-commit`, `git config core.hooksPath tools/hooks`)이 `tools/bump_version.py`로 버전(`YYYY.MM.DD-N`)을 올린다. 바뀌는 파일은 `version.json`, `js/data/version.js`(`SITE_VER`), index.html의 css·js `?v=`(Pages 10분 캐시 회피)이다. 열려 있는 최상위 페이지는 `SITE.watchVer()`가 3분마다 `version.json`을 확인하고, 바뀌면 "새 버전이 나왔어요 · 새로고침" 알림을 띄운다. 버전명은 4중인격 메뉴 부제와 랜덤블록 오른쪽 위에 표시된다. GitHub 웹에서 직접 커밋하면 버전이 안 올라가니 주의한다.
- **GitHub 앱 (`github`):** 링크 앱. 이 저장소를 새 탭으로 연다.
- **내 정보 앱 (`me`):** 링크 앱(`url`). 누르면 pancat-silly.carrd.co를 브라우저 새 탭으로 연다(Carrd는 X-Frame-Options: deny라 창 안에 못 띄움). `DESK.open`이 `url` 있는 앱은 창 대신 새 탭으로 연다.
- **P2P 동의:** 게임 아이콘을 누르면 "P2P 멀티플레이 허용" 화면이 뜬다. 결정은 localStorage `site_p2p`에 저장되고 게임 안 설정에서 바꿀 수 있다.
- **개발 도구 창:** 4중인격의 "🛠 개발 도구 창 열기"(`SITE.openDev`)는 데스크톱 안이면 `{t:'dev'}`를 보내서 숨은 앱 `apvp_dev`(아이콘 없음, 오프라인 전용이라 P2P 질문 없음) 창을 보통 앱처럼 새 창으로 연다(게임 창 옆으로 조금 비켜서, 게임 창은 그대로; 예전 좌우 2분할 `DESK.tile`은 없앰). 단독 실행이면 새 탭으로 `사이트주소/ability_pvp_dev/nodesktop`을 연다. 분할 빌드의 개발 도구 창은 `index.html?app=apvp&dev=1`이고, 01_core.js가 `dev=1`을 `APVP_DEV`로 바꾼다.
- **개발 도구 다운로드:** (사이트 파일 없이 디스크에서 연 한 파일 빌드에서만 `devDownload` 대체) 분할 빌드에서는 `devToolHTMLMulti()`가 index.html과 css, js를 fetch해서 한 파일로 인라인한다. 한 파일 빌드에서는 `SELF_HTML`에 `APVP_DEV`를 넣는다.

## 4중인격 PvP (G / UI)
- **기본 진행:** 팀전 또는 개인전, 부활 10회. 직업 선택 → 경기, 연습 모드(봇)도 있다.
- **스폰 패드:** 맵의 2×2 색 콘크리트 패드(`PAD_POS` ±1칸)에서만 스폰포인트를 설정한다(같은 색 콘크리트가 맵 곳곳에 있음).
- **최대 체력:** `JOBS[직업].maxHp`, 없으면 20(dude·dude New 40, 슬라임 20).
- **머리 위 표시:** 다른 플레이어 머리 위에 직업(아이콘 + 이름)이 항상 뜨고, 체력·체력바는 "체력 표시" 설정을 따른다(`UI.tags`).
- **연습 봇 난이도:** 메뉴의 "봇 난이도"(`UI.botLv`, 저장 `apvp`): 2 어려움 = 원래 봇, 1 보통 / 0 쉬움은 `BOT_LV`(08_bot.js)대로 판단 주기·조준·공격·스킬 사용이 느리다.
- **직업:** `JOB_ORDER`에 있다(러셔, 폴리셔, 스파이더, 360, 얼빙, 랜더마이져, 수노, 그랩, 슬라임, 비글, 소환사, 세룡이, Ai, 창찬, dude).
  - 내장 미완성 직업: 젬웬티, 윤톰맨(jobs_builtin).
  - `DEV_JOBS`는 "개발중" 구분선 아래에 표시된다.
  - **dude 바리에이션:** dude 카드에 New / old 선택(`JOBS.dude.vars`, 선택된 상태에서 누르면 바뀜, `UI.jobVar`). old = 원래 dude, New = 직업 `dude_new`(`varOf: 'dude'`, JOB_ORDER에는 없음, 돌 검 + 체력 40).
  - **dude New 댄스(`SK.dance` 토글):** 제자리 춤(이동·공격·다른 스킬 잠김), 카메라는 뒷통수 기준 뒤 5.5·위 1.6에서 플레이어를 보고 마우스로 주변을 돌려 볼 수 있음(몸 방향은 `G.dancers`의 yaw로 고정). 노래 `dude_dance`(사용자 제공 mp3, `AU.posLoop`로 주변에도 들림), 1초마다 주변에 개구리(`R.drawFrogs`, FROG 모델)가 나타나 같이 강남스타일. 그만두면 개구리 수만큼 신속(≤IV)·힘(≤II)·회복(2/마리)·체력 증가(≤+20) 30초, 개구리당 5% `dude_bullet`(총알). 이벤트 `dance`/`dfrog`, 상태 `G.dancers`. 노래 가사는 06b_lyrics.js `DUDE_LYRICS`(단어별 시작 시각, faster-whisper로 뽑고 괄호 뒷소리는 박자로 맞춤)·`LYR`: 실제로 재생 중인 루프 위치(`AU.loopPos`)를 따라 본인은 액션바 위 `#lyrics`, 다른 사람은 머리 위(`.tag u`)에 뜨고 부른 단어는 노란색.
  - **dude New 권총(`use: 'gun'`, `SK.gunFire`):** 총알 1개, 활처럼 꾹 눌러 조준(느려짐), 떼면 일직선 히트스캔. 플레이어를 맞히면 쏜 사람·맞은 사람만 컷씬(`G.cut`, `R.cutCam`/`cutDraw`, `SK.CUT_T`): 카메라가 두 사람 사이 옆으로(그쪽에 블록이 가리면 반대쪽 → 돌려서 → 더 높이 → 더 가까이 순으로 두 사람이 다 보이는 자리를 찾음) easeOutCubic 0.977초 → 검은 화면 0.088초 → 빨간 배경에 두 사람·총알만 흰색 1.167초(맞은 사람이 천천히 뒤로 쓰러짐), 효과음 `dudeshot`. 맞은 사람이 안 죽으면(스폰 보호·같은 팀은 쏘는 쪽이 미리 판단, 창찬 각성 등은 `gcutx`로 취소) 컷씬 없음. 맞은 사람은 맞자마자 죽지만(`alive=false`, presence 플래그 512) 겉보기엔 안 죽음(계속 그리고 이름표도 유지, 사망 연기·소리는 컷씬 끝날 때) 컷씬이 끝나면 리스폰(`Player.die`의 `cutUntil` 대기). 쏜 사람은 컷씬 동안 제자리에서 못 움직이고 깜빡이며 무적(`prot`). 권총을 들면 모바일 마크 PE에서도 십자선이 뜸.
- **모드 API·개발 도구:** 직업 코드는 `new Function('APVP','api', code)`로 실행된다. 프롬프트 버전은 `DEV_VER`이고, 프롬프트를 바꾸면 하나 올린다.
- **ESC 메뉴:**
  - 단계: 게임 메뉴 → 경기 설정 / 설정(시야각 왼쪽 위) → 볼륨 설정(볼륨·게임 효과음·능력 효과음) / 화면 설정 / 조작 설정.
  - 완료 버튼은 하단에 고정되어 있고 한 단계 뒤로 간다.
  - 행은 `mcPause()`가 마크식 버튼·슬라이더로 바꾼다.
  - 새 설정을 넣을 때는 `#pause .inner`에 label이나 button을 추가하고 `PAGES`에 배치한다.

## 랜덤블록 서바이벌 (RG / RUI / RW …)
- **좌표:** 엔진 좌표 = MC 좌표 + (60, 0, 60). 월드 88×224×100.
  - 블록 id는 **Uint16**이고 `RB_KEYS[id]`가 블록 키다(예: `stairs|spruce_planks|e|0`, `door|birch|n|1|l|u`).
  - `BL[id]`는 21_rbs_blocks.js가 키에서 만든다. 담는 값: tiles, boxes, dyn, use, solid, hard/tool, …
  - 엔진↔MC 변환: `RW.P / getM / setM`, `RG.mcOf`.
- **회전 규칙 v2** (rbsconv.py):
  - 문: 아래 칸은 direction 0E 1S 2W 3N, 경첩은 위 칸.
  - 다락문: 0=경첩 W, 1=E, 2=N, 3=S.
  - 횃불: 이름이 가리키는 쪽이 붙은 면.
  - 계단: 모서리 모양은 이웃 블록을 보고 런타임에 계산한다(`RBLK.stairShape`).
- **상태 머신** (25_rbs_game.js):
  - 진행: lobby → prep → count → start → game → tover → dm → win.
  - 호스트(가장 먼저 들어온 사람)가 `gs`를 presence에 실어 보낸다. 모든 클라이언트는 `phaseTick`/`onPhase`로 같은 타임라인을 재생한다.
  - 이벤트 종류: `b`(블록, `q`=조용히), `hit`, `drop`/`pick`, `be`(상자·화로), `proj`, `death`, `chat`, `fall`.
  - 늦게 들어온 사람: 블롭(`want:'w'`)으로 seed와 mods, be를 받는다.
- **9 / 25명** (`opts.big`, prep 때 `gs.big`으로 고정):
  - 9명: 경기장 -16..16, ±17에 기반암 벽(`RW.walls`), 스폰 9곳.
  - 25명: 경기장 -26..26, 영구 상자 안, 스폰 25곳.
  - 데스매치: 9명 Y73, 25명 Y61. 가스는 `fatal_poison`이다.
- **경기장 생성:** prep 시작 때 `RW.genAll`로 한 번에 만든다(예전 V2.1 쓸어오기 255/405틱은 렉이 커서 바꿈). prep은 `RW.PREP_MS`(2초).
  - 칸 내용은 `(seed, x, y, z)`로 결정돼서 모든 클라이언트가 같은 경기장을 만든다.
  - 팔레트: 기본은 `RB_ARENA`(V2.1, 33칸)이다. 호스트 커스텀은 `opts.pal`(`[key, 가중치, 상자종류]`)이고, `opts.palN`=1이면 정확한 개수 모드다.
- **미니 랜덤블록 (놀이터, 1:1):**
  - 상태: 호스트 `miniHost` + 모든 클라이언트의 `miniTick`/`onMini`. `gs.mini`의 ph는 idle → cage → gen → count → fight → end.
  - 팔레트는 `RB_MINI`이다.
- **UI:**
  - **메뉴는 하나뿐이다:** Esc · M · 모바일 ☰ → `RUI.pause(true, 페이지)`. 4중인격 ESC 메뉴처럼 마크식 돌 버튼(`menuDraw`, `MPAGE`): 게임 메뉴(관전·로비·튜토리얼·시점) → 설정(볼륨·효과음·자동 전체화면·리소스팩) → 화면·조작 / 조작법, 그리고 호스트 설정(게임시간·인원·봇 난이도·옵션·블록 커스텀·초기화). Esc는 한 단계 뒤로(`menuBack`).
  - 로비 핫바(`RG.KIT`, 칸에 잠김, 우클릭/사용 → `RUI.menuAct`): 4 멀티플레이(`menu_multi` → 메뉴의 'multi' 페이지: P2P 허용·닉네임·스킨·방 코드), 5 Ready, 6 놀이터. 이 셋은 Esc 메뉴에는 없다.
  - 예전 메뉴 상자(0,31,6) 자리는 가문비 위 반블록(양옆 거꾸로 계단과 맞춤, 34_rbs_main.js)이고 설정 상자 목록은 없앴다. 메뉴에서 책·팔레트·봇 선택 화면으로 갈 때는 `menuTo()`로 포인터 잠금 없이 넘어간다(잠갔다 바로 푸는 게 전체화면에서 커서가 안 보이던 원인).
  - 모바일 조작은 29b_rbs_touch.js `RTCTL`(4중인격 `TCTL`과 같은 방식, 버튼은 예전 랜덤블록 모양·배치). 기존 = 십자선 기준(탭: 공격/사용, 꾹: 캐기). 마크 PE = 십자선 없음(손가락이 없으면 아무것도 선택 안 됨), 손가락 아래를 겨눔(`RR.screenDir` → `RIN.pickTarget(me, dir)`, 꾹 누른 채 움직이면 화면도 돌고 캐는 곳은 손가락을 따라감. 손가락에 흰 원 `#rbRing`(지름 33.25vmin, 91~262px로 화면 크기에 맞춤)이 뜨고 안쪽 원이 캐기 진행도 `me.dig.p`만큼 커짐, mix-blend-mode: difference로 아래 화면 색 반전). 버튼 배치는 게임마다 따로 저장(`apvp_tlay_*` / `rbs_tlay2_*`). 설정 → 화면·조작에서 조작 방식·이동·웅크리기·버튼 배치 편집. 두 게임 모두 편집기에서 같은 버튼을 여러 개 넣을 수 있다(레이아웃 키 `atk#2` 식, 기본 키는 `#` 앞).
  - 인벤토리와 제작대에는 페이지식 제작법 책(`rbHTML`/`rbCraft`)과 CSS 3D 스킨 인형(`dollHTML`)이 있다.
  - 호스트 블록 커스텀은 `palHTML`이다.
- **놀이터 장치:**
  - 던전 레버 회로: 레버 → 램프 → 철창. 레드스톤 횃불도 반대로 바뀐다.
  - 자폭 열쇠 화로: `KEYCHAIN`이 원작 단계를 재생한다(3초 단계 생략 버그 유지).
  - 벽 폭파, 웅크리면 출구로 복귀, 회복 구역, 토템 파티클.
- **표지판:** 벽 표지판은 키의 방향대로. 서 있는 표지판은 변환 때 회전값이 깨져 있어서(`rbsconv.py`의 축 계산 버그) 런타임 `RR.signFix()`가 방향을 정한다(바로 옆 벽 반대쪽, 아니면 가장 트인 쪽). 판 블록도 돌리고 글자는 판 양면에 그린다.
- **이름표:** 다른 플레이어 이름표는 로비·놀이터에서는 항상 보이고, 경기 중에는 호스트 설정 `opts.tags`(기본 0 = 안 보임)를 따른다.
- **승리 컷씬:** win 단계(7.5초)에서 승리자만 단상(`RV.podium`)으로 옮기고(매 틱 `RG.podiumHold`: 제자리·관중 쪽(+x) 고정, 불·모든 효과 제거, 체력·배고픔 가득. 원작의 물 블록은 안 놓음. 마우스로 시점도 못 돌림), 승리자는 공용 춤(`RR.danceOf`, `gs.t`로 골라서 모든 클라이언트가 같은 춤을 같은 타이밍에)을 춘다. 모든 클라이언트의 카메라가 `RR.cutCam()`으로 승리자 정면에서 멀리·높이 → 가까이로 다가간다. `body.rbcut`이 제목(승리 문구) 말고 모든 UI를 숨기고, 입력·메뉴는 막힌다.
- **이름:** 화면에 나오는 이름은 "랜덤블록 서바이벌" 하나로 쓴다(V2 파트 2, V2.1 표기 안 함. 맵 표지판의 "랜덤블록 서바이벌 V2.1"도 그릴 때 바꿈). 표지판 글자는 256×128 캔버스, 보통 굵기, LINEAR+밉맵(`makeTex(cv, true)`).
- **구역별 렌더링 (27_rbs_render.js):** 구역들이 같은 월드에 세로로 쌓여 있어서(경기장 y200+, 놀이터 84~105, 데스매치 61~81, 로비 29~43, 승리 단상 5~16) 카메라가 있는 높이 구간(`RR.ZONES`, `camZ`)의 청크·플레이어·아이템·이름표만 그린다. 구간 안에서도 화면 밖(시야 절두체)·안개 밖 청크는 뺀다(`chunkVis`). 경기장은 렌더 거리(청크, 기본 8)도 적용하고 안개도 거기서 끝난다. 파티클은 같은 구간·32칸 안·화면 근처일 때만 만든다(`RR.fxOk`). 설정 → 화면·조작: `RUI.rdist`(경기장 렌더 거리), `RUI.pmax`(파티클 최대 0/500/3000/10000, 기본 3000), `RUI.sndLim`(같은 소리 80ms에 3개까지, 기본 꺼짐) — `rbs_set`에 저장.
- **관전:** 고를 수 있는 대상은 경기장·데스매치에 있는 살아 있는 플레이어뿐이다(`RUI.specOk`/`specList`). 따라가던 사람이 경기에서 빠지면 다음 사람으로 넘어간다. 관전 중에는 아래에 관전 핫바(`#rbSpecBar`, `RUI.specBar`)가 떠서 플레이어 머리(스킨 얼굴)를 보여 주고, 숫자·휠·클릭/탭으로 고른다. 9명이 넘으면 1~8칸이 한 페이지, 9칸이 다음 페이지(`specPage`). 관전 중에는 12칸보다 멀거나 블록 뒤에 있는 경기 중인 플레이어에게 벽 너머로 흰 외곽선을 그린다(`RR.drawGlow`, 스텐실 버퍼 · Gfx `stencil: true`).
- **4중인격 소환사 송곳니:** 몹(거미 등)이 맞을 때 효과음은 5틱에 2개까지(`SK.fangMobSnd`). 플레이어가 맞을 때는 그대로.
- **떨어진 아이템:** 마크 ItemEntityRenderer처럼 회전 = (age+partialTick)/20 + 아이템마다 랜덤 시작각 `e.hs`, 위아래 = sin(t/10+hs)·0.1+0.1.
- **맵에 없던 블록 아이템**(예: 제작으로 만든 자작나무 판자)은 `RBLK.build()`가 `RB_KEYS` 뒤에 붙여 등록한다(모든 클라이언트 같은 순서). 없으면 아이콘이 깨져 인벤토리가 빈 화면이 됐다.
- **대나무 발판:** 위에 서고, 웅크리면 뚫고 내려가고, 안에서 점프하면 올라간다(`RWorld.boxes`의 `scafEnt`, `B.scaf`).
- **판유리 (`pane|glass`, 철창):** 마크 모델처럼 가운데 2/16 두께 판이 연결된 축마다 하나로 이어진다(가운데 구멍 없음). 넓은 면은 유리 텍스처, 얇은 테두리(위·아래·끝)는 `glass_pane_top`. 판유리끼리 맞닿은 면은 안 그린다. 박스의 7번째 값(`bx[6]`)이 박스별 타일(23_rbs_world.js 메셔).
- **블록 상호작용:**
  - 문·다락문·울타리 문·레버·버튼·감압판이 동작한다(`RG.useBlock`, `plateTick`, `power`). 토글 대상 키는 rbsconv.py `flip()`이 미리 등록한다.
  - 모래·자갈·모루는 떨어지는 블록 엔티티(`RG.falls`)다.
  - 금 간 표시(`destroy_stage_0..9`)는 다른 사람의 진행도까지 presence `dg`로 보여 준다.
- **봇 (26_rbs_bot.js, 호스트가 시뮬레이션):**
  - 싱글 플레이에서 Ready를 누를 때 봇 수를 고르고, 멀티에서는 빠진다.
  - 난이도(호스트 설정 `opts.botLv`, 기본 1): 2 어려움 = 원래 봇, 1 보통 / 0 쉬움은 2틱 / 4틱마다 판단하고(사이에는 마지막 입력 유지, 캐던 블록은 계속 캠) 회전·공격·반격이 느리다(`RBOT.LV`).
  - 시작 아이템이 없다. 시작할 때 플레이어처럼 주변 블록이 부서진다(`RG.breakAround`). 드롭 아이템을 줍는다(`itemTick`).
  - 경기장(`RBOT.brain`): 필요한 블록을 점수로 골라(`desire`/`scan`) 맞는 도구로 캔다 → 상자를 턴다 → 제작대에서 만든다(`WISH` 순서: 나무→돌→철→다이아 도구·무기·갑옷, 3x3 제작법은 근처 제작대가 필요하고 없으면 만들어 놓는다) → 원석은 화로에 굽는다(`smelt`) → 갑옷을 입는다(`equip`). 가방이 차면 쓸모없는 것을 버린다(`tidy`).
  - 싸움: 맞으면 반격, 무기가 있을 때만 가까운 적과 싸운다, 장비가 갖춰지거나(`ready`/`geared`) 남은 시간 70초 이하·데스매치면 벽을 파고 사냥한다. 체력이 낮으면 치유 물약, 없으면 잠깐 도망. 시야(`RBOT.los`)가 막히면 공격하지 않는다.
  - 테스트: `Date.now`를 가짜 시계로 바꾸고 `RG.step()`을 직접 돌리면 숨은 창에서도 라운드 전체를 빠르게 돌릴 수 있다.
- **그 밖의 규칙:**
  - 기본템(돌 곡괭이·도끼·검 + 치유 물약 4개)은 호스트 설정 `opts.kit`("기본템 지급")이고 봇도 받는다(`RG.giveKit`). 게임시간과는 따로다. 예전 시간값 23("5분 30초 / 기본템")은 불러올 때 시간 11 + kit 1로 바뀌고 순환에서 빠진다.
  - 경기장에서는 게임 중 서바이벌이 강제된다(원작 체인).
  - 로비에는 나약함 255가 걸린다.
  - 승리 효과음은 `sfx_win_yay` 고정이다. 사망 효과음과 인트로 효과음은 없다.

## 데이터 다시 만들기 (원본 패키지는 저장소에 없음)
```
python3 tools/rbsconv.py <V2P2 맵 폴더(markers.json, voxels/)> js/data/rbs_data.js <V2.1 변경점 패키지 폴더>
python3 tools/rbsassets.py <원작 리소스팩 폴더> <sfx 폴더> js/data/rbs_assets.js
python3 tools/mkmodjobs.py          # tools/modjobs/*.txt -> js/data/jobs_builtin.js (ffmpeg 필요)
python3 tools/mkfrog.py            # tools/frog/FrogMarauder.fbx + png -> js/data/frog.js (dude New 댄스 개구리)
python3 tools/mkdance.py           # tools/dance/*.fbx (Mixamo) -> js/data/dances.js (목록은 LIST)
python3 tools/mkextrasnd.py         # tools/sounds/*.wav|mp3 -> js/data/apvp_extra_snd.js (ffmpeg 필요, G.sound('<파일 이름>'))
python3 tools/split_sounds.py       # 위 스크립트들이 넣은 base64 효과음 -> sounds/*.mp3 (생성 스크립트 다음에 항상 실행)
python3 tools/normalize_sounds.py   # 4중인격 효과음(sounds/apvp, sounds/jobs) 음량을 -16 LUFS·피크 -1dB로. 새 파일만 처리(tools/sound_norm.json 해시), --all은 tools/sounds_orig 원본에서 전부 다시. split_sounds.py 끝과 pre-commit(--staged)이 자동 실행
python3 tools/mkentry.py            # 바로 들어가기 페이지 6개
python3 tools/build_single.py       # 저장소 -> dist/index.html (한 파일 배포용, sounds/는 다시 base64로 넣음)
```
사용자에게 원본 zip(맵 패키지, 리소스팩)을 받아야 다시 만들 수 있다.

## 테스트 방법
- `python3 -m http.server 8765`로 서빙하고 `http://127.0.0.1:8765/`를 연다.
  - 직접 열기: `?app=rbs&p2p=0`, `?app=apvp&p2p=0`.
- 헤드리스 테스트: Playwright + SwiftShader(`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`)를 쓰고 `page.evaluate`로 상태를 조작한다.
  - 예: `RG.gs.opts.time=1; RUI.menuAct('ready')` → 봇 선택 `[data-bn="3"]` → 라운드 전체 진행.
- 같은 브라우저 컨텍스트의 두 탭은 BroadcastChannel로 멀티플레이 테스트가 된다(`?p2p=1`).
- 확인할 수 없는 것: 실제 PeerJS, 바닐라 팩 다운로드, 스킨 서버(샌드박스 네트워크가 막혀 있음).

## 주의할 점
- 모든 JS는 한 파일 빌드에서 `<script>` 안에 인라인된다. JS 문자열에 `</script>`나 `</style>`를 그대로 쓰면 페이지가 깨진다. **`<\/script>`로 쓴다.**
- 모듈은 일반 스크립트다. 최상위 `const`는 전역 렉시컬 환경으로 공유되지만, 함수 호이스팅은 파일을 넘지 않는다. 최상위 코드에서 뒤 파일의 함수를 부르지 않는다.
- 런타임에 새 텍스처 타일을 쓰면 `RTEX.T()`가 `RTEX.dirty`를 켜고, 렌더러가 아틀라스를 다시 올린다.
- 블록 키가 늘어나면 rbsconv.py에서 `K()`로 미리 등록한다(경기장·제작·토글용 키). 월드는 16비트라 개수 제한은 사실상 없다.
- localStorage 키:
  - `apvp`, `apvp_keys`: 4중인격 설정·키 설정.
  - `rbs_*`, `rbs_host2`: 랜덤블록 설정, `rbs_host2`는 호스트 옵션·팔레트.
  - `site_p2p`: P2P 동의. `site_autofs`: 자동 전체화면('0'이면 꺼짐).
