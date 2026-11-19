# 4중인격 능력 PvP · 랜덤블록 서바이벌 (웹)

마인크래프트 맵 두 개를 브라우저에서 할 수 있게 옮긴 사이트예요. 열면 가상 데스크톱이 뜨고, 아이콘으로 게임 창을 열어요.

## GitHub Pages로 올리기
1. GitHub에서 새 저장소를 만들어요. 공개 저장소면 무료로 Pages를 쓸 수 있어요.
2. 이 폴더의 파일을 **전부 그대로** 올려요.
   - 맨 위에 `index.html`이 있어야 해요.
   - 숨김 파일 `.nojekyll`도 함께 올려요.
   - 웹에서 올릴 때는 "Add file → Upload files"로 폴더째 끌어다 놓으면 돼요.
3. 저장소 **Settings → Pages → Build and deployment**에서 다음처럼 설정하고 Save를 눌러요.
   - Source: **Deploy from a branch**
   - Branch: **main / (root)**
4. 1~2분 뒤 `https://<아이디>.github.io/<저장소이름>/`으로 접속해요.

P2P 멀티플레이는 GitHub Pages에서도 동작해요(PeerJS). 같은 방 코드끼리 연결돼요.

## 배경음악 (랜덤블록 서바이벌)
`rbs/music/` 폴더에 mp3를 넣으면 재생돼요. 파일 이름은 그 폴더의 README를 참고하세요. 없어도 게임은 돌아가요.

## 한 파일로 만들기 (Netlify Drop 등)
```
python3 tools/build_single.py
```
`dist/index.html` 하나로 합쳐져요.

## 폴더 구조
- `index.html`: 페이지 뼈대
- `css/site.css`: 스타일
- `js/game/`: 게임 코드
- `js/data/`: 맵, 소리, 아이콘 데이터
- `tools/`: 빌드와 데이터 생성 스크립트
- `CLAUDE.md`: Claude가 이 프로젝트를 이어서 작업할 때 읽는 설명서
