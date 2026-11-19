# CLAUDE.md — 프로젝트 컨텍스트 (새 세션에서 먼저 읽기)

이 저장소는 마인크래프트 맵 두 개를 웹으로 옮긴 사이트다. 빌드 도구 없이 정적 파일만으로 돌아가고, GitHub Pages에 그대로 올린다.

- **4중인격 능력 PvP (apvp):** 사용자가 만든 Java 1.21.4 서버 맵이다.
- **랜덤블록 서바이벌 V2 P2 + V2.1 (rbs, 베타):** LemonyMEF의 Bedrock 맵이다.

사이트 첫 화면은 "가상 데스크톱"이다. 기본 주소로 열면 게임 창 없이 바탕화면만 뜬다(아이콘으로 연다).

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
  apvp_assets.js      4중인격 맵 복셀 + 사운드 (mkassets.py)
  rbs_data.js         랜덤블록 월드: RB_KEYS, RB_DIM, RB_WORLD(16비트 RLE), RB_SIGNS, RB_BE, RB_ARENA, RB_MINI, RB_FURN, RB_MARK (rbsconv.py)
  rbs_assets.js       랜덤블록 원작 팩 효과음 RB_SFX, 아이콘 RB_IMG (rbsassets.py)
  rbs_icon.js         바탕화면 아이콘 RB_ICON (SVG)
  jobs_builtin.js     개발 도구로 만든 내장 직업 BUILTIN_JOBS (mkmodjobs.py)
js/game/              게임 코드. 파일 이름 순서로 로드하는 일반 <script>들 (전역 공유)
rbs/music/            랜덤블록 BGM mp3 (선택)
tools/                mkentry.py, bump_version.py, hooks/pre-commit, build_single.py, rbsconv.py, rbsassets.py, mkmodjobs.py, mkassets.py, modjobs/*.txt
```
모듈을 새로 추가하면 **index.html에 `<script src>`도 추가**해야 한다. 순서는 파일 이름 순이다.

### js/game 모듈
| 파일 | 내용 |
|---|---|
| 00_wall.js | 바탕화면 배경 사진 (base64 JPEG) |
| 01_core.js | 공통: `SELF_HTML`, `DEV_VER`, `World`(복셀), 수학·유틸 (`$`, `clamp`, `uid`, `M4` 행렬 …) |
| 02_gfx.js / 02b_skin.js | WebGL1 렌더러(`Gfx`)와 아틀라스 / 마크 닉네임 스킨 (mc-heads.net → minotar.net, 2곳만) |
| 03_audio.js / 03b_pack.js | 4중인격 오디오(`AU`) / 바닐라 리소스팩 다운로드(`PACK`) |
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
- **모바일:** 게임 창은 항상 전체 화면이고, 가로 모드 버튼(`land`)이 있다.
- **바로 들어가기:** `사이트주소/ability_pvp`, `사이트주소/randomblock` → 가상 데스크톱 위에 그 게임 창만 연다(`SITE_OPEN`). 뒤에 `/nodesktop`을 붙이면 바탕화면 없이 단독 실행한다(`SITE_APP`). 단독 실행(창 밖, `p2p=` 없음)이면 `SITE_ASK_P2P`(99_boot.js)가 같은 동의 화면을 먼저 띄운다.
- **사이트 버전·새 버전 알림:** 커밋할 때마다 pre-commit 훅(`tools/hooks/pre-commit`, `git config core.hooksPath tools/hooks`)이 `tools/bump_version.py`로 버전(`YYYY.MM.DD-N`)을 올린다. 바뀌는 파일은 `version.json`, `js/data/version.js`(`SITE_VER`), index.html의 css·js `?v=`(Pages 10분 캐시 회피)이다. 열려 있는 최상위 페이지는 `SITE.watchVer()`가 3분마다 `version.json`을 확인하고, 바뀌면 "새 버전이 나왔어요 · 새로고침" 알림을 띄운다. 버전명은 4중인격 메뉴 부제와 랜덤블록 오른쪽 위에 표시된다. GitHub 웹에서 직접 커밋하면 버전이 안 올라가니 주의한다.
- **P2P 동의:** 게임 아이콘을 누르면 "P2P 멀티플레이 허용" 화면이 뜬다. 결정은 localStorage `site_p2p`에 저장되고 게임 안 설정에서 바꿀 수 있다.
- **개발 도구 창:** 4중인격의 "🛠 개발 도구 창 열기"(`SITE.openDev`)는 데스크톱 안이면 `{t:'dev'}`를 보내서 숨은 앱 `apvp_dev`(아이콘 없음, 오프라인 전용이라 P2P 질문 없음) 창을 열고 게임 창과 좌우로 나란히 놓는다(`DESK.tile`, 모바일은 앞으로 가져오기만). 단독 실행이면 새 탭으로 `사이트주소/ability_pvp_dev/nodesktop`을 연다. 분할 빌드의 개발 도구 창은 `index.html?app=apvp&dev=1`이고, 01_core.js가 `dev=1`을 `APVP_DEV`로 바꾼다.
- **개발 도구 다운로드:** (사이트 파일 없이 디스크에서 연 한 파일 빌드에서만 `devDownload` 대체) 분할 빌드에서는 `devToolHTMLMulti()`가 index.html과 css, js를 fetch해서 한 파일로 인라인한다. 한 파일 빌드에서는 `SELF_HTML`에 `APVP_DEV`를 넣는다.

## 4중인격 능력 PvP (G / UI)
- **기본 진행:** 팀전 또는 개인전, 부활 10회. 직업 선택 → 경기, 연습 모드(봇)도 있다.
- **직업:** `JOB_ORDER`에 있다(러셔, 폴리셔, 스파이더, 360, 얼빙, 랜더마이져, 수노, 그랩, 슬라임, 비글, 소환사, 세룡이, Ai, 창녀찬, dude).
  - 내장 미완성 직업: 젬웬티, 윤톰맨(jobs_builtin).
  - `DEV_JOBS`는 "개발중" 구분선 아래에 표시된다.
- **모드 API·개발 도구:** 직업 코드는 `new Function('APVP','api', code)`로 실행된다. 프롬프트 버전은 `DEV_VER`이고, 프롬프트를 바꾸면 하나 올린다.
- **ESC 메뉴:**
  - 단계: 게임 메뉴 → 경기 설정 / 설정 → 화면 설정 / 조작 설정.
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
- **경기장 생성:** `RW.genTick`이 V2.1 방식으로 양 끝에서 벽 단면이 가운데로 쓸어온다(9명 255틱, 25명 405틱).
  - 칸 내용은 `(seed, x, y, z)`로 결정돼서 모든 클라이언트가 같은 경기장을 만든다.
  - 팔레트: 기본은 `RB_ARENA`(V2.1, 33칸)이다. 호스트 커스텀은 `opts.pal`(`[key, 가중치, 상자종류]`)이고, `opts.palN`=1이면 정확한 개수 모드다.
- **미니 랜덤블록 (놀이터, 1:1):**
  - 상태: 호스트 `miniHost` + 모든 클라이언트의 `miniTick`/`onMini`. `gs.mini`의 ph는 idle → cage → gen → count → fight → end.
  - 팔레트는 `RB_MINI`이다.
- **UI:**
  - 로비 핫바 메뉴 아이템은 `RG.KIT`이다. 칸에 잠겨 있고 우클릭(`RUI.menuAct`)으로 쓴다. 메뉴는 PC·모바일 같은 목록 UI다.
  - 인벤토리와 제작대에는 페이지식 제작법 책(`rbHTML`/`rbCraft`)과 CSS 3D 스킨 인형(`dollHTML`)이 있다.
  - 호스트 블록 커스텀은 `palHTML`이다.
- **놀이터 장치:**
  - 던전 레버 회로: 레버 → 램프 → 철창. 레드스톤 횃불도 반대로 바뀐다.
  - 자폭 열쇠 화로: `KEYCHAIN`이 원작 단계를 재생한다(3초 단계 생략 버그 유지).
  - 벽 폭파, 웅크리면 출구로 복귀, 회복 구역, 토템 파티클.
- **블록 상호작용:**
  - 문·다락문·울타리 문·레버·버튼·감압판이 동작한다(`RG.useBlock`, `plateTick`, `power`). 토글 대상 키는 rbsconv.py `flip()`이 미리 등록한다.
  - 모래·자갈·모루는 떨어지는 블록 엔티티(`RG.falls`)다.
  - 금 간 표시(`destroy_stage_0..9`)는 다른 사람의 진행도까지 presence `dg`로 보여 준다.
- **봇 (26_rbs_bot.js, 호스트가 시뮬레이션):**
  - 싱글 플레이에서 Ready를 누를 때 봇 수를 고르고, 멀티에서는 빠진다.
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
python3 tools/build_single.py       # 저장소 -> dist/index.html (한 파일 배포용)
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
  - `site_p2p`: P2P 동의.
