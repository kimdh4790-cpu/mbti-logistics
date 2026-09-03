# 인프라 · 도구 설정 메모
> 세션 시작 시 인프라 관련 작업이면 이 파일 읽을 것.
> 변경 발생 시 반드시 수정 이력 업데이트 필수.

---

## Oracle Cloud 서버

| 항목 | 값 |
|---|---|
| IP | 161.33.136.154 |
| 계정 | opc |
| 인스턴스명 | filo-a1-2c12g |
| 스펙 | A1.Flex 4코어/24GB (Always Free) |
| 리전 | Tokyo AD-1 |
| SSH 키 | 로컬 PC 기본 키 (`C:\Users\82104\.ssh\id_rsa`, 코멘트: `82104@DESKTOP-2MP10VJ`) |
| 로그인 | kimdh4790@gmail.com / khw3103!! |

### SSH 접속 (2026-08-31 확인)
```powershell
# 로컬 PC PowerShell에서 (기본 키 자동 사용)
ssh opc@161.33.136.154

# 또는 명시적으로
ssh -i C:\Users\82104\.ssh\id_rsa opc@161.33.136.154
```
> ⚠️ `ssh-key-2026-08-02` 등 Cloud Shell에 있는 키 파일들은 Oracle VM 접속에 사용 불가.
> 인스턴스에 등록된 키는 로컬 PC의 기본 키(`82104@DESKTOP-2MP10VJ`)임. 로컬 PC에서만 접속 가능.

### Oracle Cloud Console (SSH 없이 브라우저 접속)
1. cloud.oracle.com → kimdh4790@gmail.com 로그인
2. Compute → Instances → filo-a1-2c12g
3. Console connection → Launch Cloud Shell Connection

### 설치된 도구
- Node.js, npm
- Playwright + Chromium (`/usr/bin/chromium`)
- FFmpeg
- ffmpeg-static
- 한글 폰트 (fonts-noto-cjk)

### ~/.env 등록 항목
```
GOOGLE_TTS_API_KEY=등록완료 (Cloud Text-to-Speech API, 2026-08-27)
YOUTUBE_CLIENT_ID=40761160761-3v5h03e9r974vfq2io4oa08nqhn6r5o8.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=등록완료
YOUTUBE_REFRESH_TOKEN=등록완료
```

### Playwright 세션 (Oracle Cloud에 저장됨)
| 세션 | 상태 |
|---|---|
| filo-record | 저장 완료 |
| youtube-upload | 저장 완료 |
| instagram-upload | 저장 완료 |
| naver-blog | 저장 완료 |

---

## 네이버 블로그 자동화 (Oracle VM 실행)

> SSH 접속 확인: 2026-08-31. Oracle VM(`opc@161.33.136.154`)에서 완전 동작.

### SSH 키 정보 (2026-08-31 확인)
- Oracle VM에 등록된 키: **로컬 PC** `C:\Users\82104\.ssh\id_rsa` (코멘트: `82104@DESKTOP-2MP10VJ`)
- Cloud Shell 내 `~/ssh-key-2026-08-02*` 파일들은 접속 불가 (Permission denied 확인)
- 반드시 **로컬 PC PowerShell**에서 접속해야 함

### Oracle VM에서 naver-blog 실행
```bash
# SSH 접속 (로컬 PC PowerShell에서)
ssh opc@161.33.136.154

# 저장소 최신화 (필수)
cd ~/mbti-logistics && git pull origin main

# 의존성 (최초 1회)
cd naver-blog && npm install

# 임시저장 (headless 자동 감지 — DISPLAY 없으면 headless로 실행)
node scripts/naver_draft.js --draft "drafts/20260831_donway_배달대행정산자동화.json"

# 자동 발행
node scripts/naver_draft.js --draft "drafts/20260831_donway_배달대행정산자동화.json" --publish

# xvfb-run 방식 (headless가 아닌 headful로 Oracle VM에서 실행 시 — bot 감지 우회)
xvfb-run node scripts/naver_draft.js --draft "drafts/post.json" --publish
```

### DISPLAY 자동 감지 로직 (naver_draft.js v2, 2026-08-31)
- `process.env.DISPLAY` 없거나 `--headless` 플래그 → `headless: true` 자동 전환
- Windows/macOS → `headless: false` (기존 동작 유지)
- 로컬 PC(Windows)에서는 항상 headful 실행 → 로그인 세션 유지

### 로그인 세션 (naver-profile/)
- 로컬 PC에서 `npm run login` 실행 후 생성된 `naver-profile/` 디렉토리를 Oracle VM에 복사
```bash
# 로컬 PC에서 실행 (PowerShell)
scp -r ./naver-profile opc@161.33.136.154:~/mbti-logistics/naver-blog/naver-profile
```
- Oracle VM에서 직접 로그인 시: xvfb-run + headful 모드 필요 (또는 로컬 로그인 후 복사 권장)

### 이미지 경로 주의
- 초안 JSON의 `"path": "input/photos/파일.jpg"` — Oracle VM에도 동일 경로에 파일 있어야 함
- 이미지 없으면 `[이미지: 파일명]` 텍스트로 폴백 (자동)

### 발행 버튼 진단 (--publish 실패 시)
- 실패 시 `drafts/초안명_publish_diag.png` 스크린샷 자동 저장
- 버튼 목록 (text | class | visible | disabled) 콘솔 출력
- 위 정보 보고 셀렉터 수정 후 재실행

---

---

## Agent Reach (AI 인터넷 읽기 도구) — 2026-09-03 설치

> 클로드가 YouTube 자막·GitHub·RSS·Reddit 등을 API 비용 없이 읽게 해주는 MIT 오픈소스 도구

### 설치 정보
- **PyPI 패키지**: `agent-reach 0.1.0`
- **venv 경로**: `~/.agent-reach-venv` (Python 3.11)
- **GitHub**: https://github.com/Panniantong/agent-reach (★77,166)
- **라이선스**: MIT

### 설치 명령 (최초 1회)
```bash
python3 -m venv ~/.agent-reach-venv
source ~/.agent-reach-venv/bin/activate
pip install agent-reach
agent-reach install youtube    # yt-dlp 자동 설치
agent-reach install rss        # feedparser 자동 설치
```

### 사용 방법
```bash
source ~/.agent-reach-venv/bin/activate

# YouTube 자막 가져오기
agent-reach get youtube "https://youtu.be/VIDEO_ID"

# RSS 피드 읽기
agent-reach get rss "https://example.com/feed.xml"

# 채널 목록 확인
agent-reach list
agent-reach list --all

# 상태 점검
agent-reach doctor --json
```

### 설치된 채널 (제로 컨피그)
| 채널 | 상태 | 비고 |
|---|---|---|
| youtube | ready | yt-dlp 2026.08.19 — 자막 추출 + 영상 검색 |
| rss | ready | feedparser — 아무 RSS/Atom 피드 |

### 환경 제한 사항
- **Claude Code 원격 컨테이너**: 프록시 제한으로 YouTube 접근 불가 (403)
- **Oracle Cloud (161.33.136.154)**: 프록시 없음 → 완전 동작. 여기서 실행 권장
- 로그인 필요 채널 (Reddit/Twitter/LinkedIn): `agent-reach install <채널명>` 후 설정 필요

### YouTube 파이프라인 활용
```bash
# Oracle Cloud에서: 경쟁사 영상 자막 분석 → 주제 리서치
source ~/.agent-reach-venv/bin/activate
agent-reach get youtube "경쟁 채널 영상 URL" | claude "핵심 주제 3개 추출해줘"
```

---

---

## OpenChatCut (AI 영상 편집기 + Claude Code MCP) — 2026-09-03 등록

> 트랙·클립이 보존되는 AI 영상 편집기. Claude Code를 MCP로 연결해 말로 편집 지시.
> 출처: https://github.com/0xsline/OpenChatCut (MIT)

### 주요 특징
- AI 편집 결과가 "초안"으로 쌓임 → 사람이 승인 버튼 눌러야 타임라인 적용
- 트랙·클립 보존 → 손으로 다시 수정 가능
- 말소리 받아쓰기 → 문장 삭제로 컷 편집
- 내보내기: MP4, MP3, SRT, FCPXML(파이널컷), 캡컷 초안, ProRes

### 설치 (로컬 PC / Oracle Cloud)
```bash
# Node.js 24 필요
git clone https://github.com/0xsline/OpenChatCut.git
cd OpenChatCut
npm install
cp .env.example .env.local
npm run dev
# 브라우저: http://localhost:5199
```

### Claude Code MCP 연결
```bash
# 1. 편집 스킬 설치
npx skills add 0xsline/OpenChatCut

# 2. 앱 안 플러그 아이콘 → External agents (MCP) → Claude Code: Connect 클릭

# 3. 또는 수동 등록 (토큰 필요)
claude mcp add --transport http openchatcut http://localhost:5199/api/external-mcp/mcp \
  --header "Authorization: Bearer $(cat ~/.openchatcut/mcp-token)"
```

### 편집 지시 예시 (Claude Code에서)
```
OpenChatCut 편집 세션 열어줘.
지금 프로젝트에서 "어" "음" 습관어랑 0.6초 넘는 빈 구간 정리해줘.
다 되면 검토 요청 보내고 내가 승인할 때까지 기다려.
```

### 주의사항
- 로컬 PC 전용 (서버 배포 비권장 — 토큰 없이 열면 외부 접근 가능)
- 아직 초기 버전 (v0.2.13). 중요 납품 영상 첫 프로젝트로 쓰지 말 것
- Windows 0.2.12 버그 있음 → 0.2.13 사용
- 맥 첫 실행: 우클릭 → 열기 (서명 없는 빌드)

---

## GitHub Actions

### 워크플로우
| 파일 | 역할 |
|---|---|
| `.github/workflows/deploy.yml` | 자동 배포 (KV 업로드 + Worker + 캐시 퍼지) — **수정 금지** |
| `.github/workflows/auto-merge.yml` | PR 자동 머지 |
| `.github/workflows/social-media.yml` | 소셜미디어 영상 제작+YouTube 업로드 |

### GitHub Secrets 등록 현황
| Secret | 상태 |
|---|---|
| `CF_GLOBAL_KEY` | 등록완료 (Cloudflare) |
| `YOUTUBE_CLIENT_ID` | 등록완료 |
| `YOUTUBE_CLIENT_SECRET` | 등록완료 |
| `YOUTUBE_REFRESH_TOKEN` | 등록완료 |
| `GOOGLE_TTS_API_KEY` | 등록완료 |
| `ORACLE_SSH_KEY` | 등록완료 (2026-08-27, Oracle Cloud SSH 자동화용) |

### social-media.yml 실행 방법
```
GitHub → Actions → 소셜미디어 홍보 영상 제작 → Run workflow
- product: filo / donway / yongcha / mbtico
- steps: record,compose,youtube (또는 개별 선택)
```

---

## Cloudflare

| 항목 | 값 |
|---|---|
| Account ID | 02709cbec18d848913b4246015b9148f |
| KV NS_ID | 7f0e90efaea64f3ab08ff00f8970b28b |

### Worker Secrets 등록 현황
| Secret | 값 | 상태 |
|---|---|---|
| `FIREBASE_API_KEY` | `AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0` | **등록완료** (Cloudflare 대시보드 확인 2026-08-30) |
| `ANTHROPIC_API_KEY` | (별도 관리) | 등록완료 |
| `GOOGLE_TRANSLATE_KEY` | (별도 관리) | 등록완료 |

### Oracle Cloud에서 wrangler deploy (yongcha-worker.js 등 수동 배포 시)
```bash
CLOUDFLARE_API_KEY="<Global_API_Key>" CLOUDFLARE_EMAIL="kimdh4790@gmail.com" npx wrangler deploy
# Global API Key 위치: dash.cloudflare.com → My Profile → API Tokens → Global API Key → 보기
```
> ⚠️ `CLOUDFLARE_API_TOKEN` (API Token)이 아닌 `CLOUDFLARE_API_KEY` (Global API Key) + `CLOUDFLARE_EMAIL` 조합 사용. 2026-08-30 확인.

---

### Worker Secrets 등록 방법
**방법 A — OPC VM에서 wrangler CLI:**
```bash
cd ~/mbti-logistics
CLOUDFLARE_API_TOKEN=<CF_GLOBAL_KEY값> npx wrangler secret put FIREBASE_API_KEY
# 입력: AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0
```

**방법 B — Cloudflare 대시보드:**
dash.cloudflare.com → Workers & Pages → mbti-logistics → Settings → Variables → Encrypt 체크 후 추가

> ⚠️ `FIREBASE_API_KEY` 미등록 시 `/api/errors` 등 슈퍼어드민 API 전체 401 반환

---

## Claude Code 플러그인 현황 (로컬 PC)

| 플러그인 | 버전 | 상태 | 역할 |
|---|---|---|---|
| superpowers (obra/superpowers) | v6.3.0 | 설치완료 | 개발 방법론 14가지 스킬 |
| claude-mem (thedotmack/claude-mem) | v13.16.1 | 설치완료 | 세션간 기억 유지 |
| claude-code-setup (anthropics/claude-plugins-official) | v1.0.0 | 설치완료 | 프로젝트 분석·추천 |

### ECC (Everything Claude Code) 스킬 (2026-08-30 설치)
| 스킬 | 역할 | 설치 위치 |
|---|---|---|
| security-review | 인증·입력값·시크릿·결제·API 보안 체크리스트 | `.claude/skills/security-review/` |
| verification-loop | PR 전 build·typecheck·lint·test·diff 순서 고정 | `.claude/skills/verification-loop/` |
| api-design | REST API 설계 패턴 (리소스명·상태코드·페이지네이션·오류) | `.claude/skills/api-design/` |

- 출처: https://github.com/affaan-m/ECC (ECC v2.2.0, MIT 라이선스)
- 설치 방식: 프로젝트 직접 복사 (`cp -R skills/<name> /home/user/mbti-logistics/.claude/skills/`)
- 제거: `.claude/skills/<이름>/` 폴더 삭제 후 commit

### 프론트엔드 디자인 스킬 (2026-08-30 설치)
| 스킬 | 역할 | 출처 | 설치 위치 |
|---|---|---|---|
| design-taste-frontend | Anti-slop 프론트엔드 — 디자인 다이얼(VARIANCE/MOTION/DENSITY) 기반 고품질 랜딩·포트폴리오 생성. Material/Fluent/Carbon 등 공식 디자인시스템 연결 | github.com/Leonxlnx/taste-skill | `.claude/skills/design-taste-frontend/` |
| image-to-code | 디자인 이미지 분석 → 실제 작동 코드 생성 (같은 저장소 서브스킬) | github.com/Leonxlnx/taste-skill | `.claude/skills/image-to-code/` |
| web-design-guidelines | Vercel Web Interface Guidelines 기준 UI/UX 코드 감사 (접근성·색 대비·모바일 레이아웃 등) | github.com/vercel-labs/agent-skills | `.claude/skills/web-design-guidelines/` |

**미설치 (로컬 PC에서 수동 설치 필요)**:
| 스킬 | 설치 명령 | 이유 |
|---|---|---|
| Awesome Design MD (57개 브랜드) | Claude Code에 `https://github.com/voltagent/awesome-design-md 이 저장소 설치해줘` 라고 말하기 | 57개 브랜드 파일 대용량 — 로컬에서 처리 |
| Playwright CLI | `npm install -g @playwright/cli@latest && playwright-cli install --skills` | npm global 설치 필요 |

### ECC 추가 설치 (2026-08-30, 2차)
| 항목 | 종류 | 역할 | 위치 |
|---|---|---|---|
| frontend-design-direction | 스킬 | UI 설계 방향 수립 (목적·톤·디자인 제약 먼저 결정) | `.claude/skills/frontend-design-direction/` |
| code-reviewer | 에이전트 | git diff 기반 코드 리뷰 (버그·보안·품질 80%+ 확신 항목만) | `.claude/agents/code-reviewer.md` |

**비고**:
- `frontend-design-direction`은 ECC 커뮤니티 버전. Anthropic 공식 `frontend-design`은 `/plugin install frontend-design@anthropics-claude-code` 필요 (원격 세션에서 불가)
- `code-reviewer` agent는 코드 수정 후 자동 발동 (`model: sonnet`, `tools: Read, Grep, Glob, Bash`)
- `/security-review` — Claude Code 기본 내장 명령, 별도 설치 불필요
- Superpowers, Claude-Mem — 이미 설치됨 (로컬 PC 기준)

### 커스텀 슬래시 명령어 (2026-08-30, .claude/commands/)
프롬프트 명령어 40개 중 20개 커스텀 명령어로 구현 (개발 5개 + 마케팅 10개 + 비즈니스분석 5개):

#### 개발·코드 (1차, 2026-08-30)
| 명령어 | 역할 |
|---|---|
| `/5whys` | 버그 증상 → 근본 원인 5단계 분석 + 재발 방지 |
| `/risks` | 기능·변경 전 위험요소·심각도·대비책 표로 정리 |
| `/blueprint` | 기능 아이디어 → 영향 파일·구현 순서·테스트 계획 |
| `/critique` | 코드·설계 약점 진단 (HIGH/MEDIUM/LOW 심각도) |
| `/checklist` | 배포 전 CLAUDE.md 기준 체크리스트 자동 생성 |

#### 광고 제작 (3차, 2026-08-30) — Higgsfield 연동
| 명령어 | 역할 |
|---|---|
| `/ad-remix` | 레퍼런스 광고 분석 → 훅·구조·Higgsfield 프롬프트 2버전 기획 |
| `/ad-brief` | FILO/DONWAY/용차앱/MBTICO 광고 브리프 + 스크립트 즉시 생성 |

#### 마케팅·콘텐츠 (2차, 2026-08-30)
| 명령어 | 역할 |
|---|---|
| `/brainstorm` | 주제 → 아이디어 10개 발산 + TOP 3 추천 |
| `/hooks` | 제품·주제 → 후킹 첫 문장 5가지 유형 |
| `/ghost` | AI 티 나는 글 → 자연스럽게 다듬기 |
| `/tone` | casual/formal/sns/blog/sales/story 말투 전환 |
| `/story` | 제품 → Before-After 사례 스토리 |
| `/audience` | 소상공인/배달대행/기사/투자자 등 독자 맞춤 |
| `/improve` | 글 설득력·명확성·가독성 개선 |
| `/tweet` | 내용 → SNS 임팩트 문장 5가지 + 해시태그 |
| `/expand` | 짧은 개요 → 블로그/제안서 완성본 |
| `/proofread` | 맞춤법·띄어쓰기·번역투·중복 교정 |

#### 비즈니스 분석·마진 (2차, 2026-08-30)
| 명령어 | 역할 |
|---|---|
| `/pros-cons` | 결정·아이디어 장단점 표 + 종합 판단 |
| `/compare` | 옵션A vs B 비교표 + FILO 차별화 포인트 |
| `/steelman` | 주장 최강 버전 재구성 + 반론 선점 |
| `/devil` | 계획 약점·가정 오류 선제 탐색 |
| `/tldr` | 긴 글 → 3줄 요약 + 한 줄 버전 |
| `/margin` | 마진율·손익분기점 계산 + 개선 방향 |
| `/pricing` | 가격 전략 분석 + 요금제 구조 최적화 |
| `/shorter` | 의미 손실 없이 최대한 압축 |
| `/rephrase` | 같은 내용 3가지 다른 표현으로 |
| `/outline` | 글·영상·제안서 목차 구조 설계 |

출처: 블로그 프롬프트 40개 → 개발·마케팅·비즈니스 특화 재구성, MBTICO 프로젝트 규칙 반영

### Motion Graphics 스킬 (2026-08-28 설치, Remotion 기반)
| 스킬 | 역할 |
|---|---|
| motion-graphics | 움직임에 뜻 부여 — 자료조사·로고·승인 관문 |
| cinematic-camera | 컷을 하나의 세계로 연결 |
| terminal-inserts | CLI 데모를 실제처럼 렌더 |
| article-highlights | 기사 강조 (형광펜·흐림·3D 회전) |
| Remotion 공식 스킬 12종 | remotion-render, remotion-captions 등 |
- 설치 위치: `C:\Users\82104\motion-graphics\.claude\skills\`
- 렌더 비용 0원 (로컬 렌더), MIT 라이선스
- 미리보기: `cd motion-graphics && npx remotion studio`

### MCP 서버 (로컬 PC ~/.claude/settings.json)
| 서버 | 역할 | 상태 |
|---|---|---|
| context7 | 최신 라이브러리 문서 실시간 주입 | 2026-08-28 등록 |
| Higgsfield | AI 광고 영상 생성 (이미지→영상, 비포애프터, UGC, 글로벌 현지화) | 미등록 — 아래 설치법 참고 |

### Higgsfield MCP 설치 (로컬 PC, 2026-08-30 예정)
광고 영상 AI 생성 도구. 잘 되는 광고를 분석하고 수십 개 버전으로 확장 가능.

**설치 순서**
1. 힉스필드 가입: https://higgsfield.ai/s/ad-multiplier-claude-ig-biggie_ai-hgjhFF
2. claude.ai → 설정 → 커넥터(Connectors)
3. Custom Connector 추가 → 이름 "Higgsfield" → MCP URL 붙여넣기 → Add

**핵심 활용법**
- Meta Ad Library에서 오래 돌아가는 광고(= 성과 있는 광고) 찾기
- `/ad-remix` 커맨드로 구조 분석 + 리메이크 브리프 생성
- Higgsfield MCP에 프롬프트 전달 → 영상 생성
- 처음엔 720p 2개만 → 방향 확인 후 확장
- 글로벌: 같은 크리에이티브를 영어/일어로 현지화 (재촬영 없음)

**연동 흐름**: 클로드 대화 1개 안에서 Meta Ads MCP(광고 조회) + Higgsfield MCP(영상 생성) 연속 실행 가능

### Meta Ads 커넥터 (2026-08-30 신규 확인)
광고 계정 성과 데이터 조회 → 잘 되는 광고 숫자로 골라서 Higgsfield로 즉시 넘김

**설치 순서**
1. claude.ai → 설정 → 커넥터(Connectors)
2. Custom Connector → 이름 "Meta Ads" → URL: `https://mcp.facebook.com/ads` → Add
3. Connect → Facebook 비즈니스 계정 로그인 → 광고 계정 선택

**바로 쓰는 프롬프트**
```
내 광고 계정에서 최근 30일 성과 좋은 영상 광고 3개 뽑아줘. 각각 성과 이유 한 줄씩.
```
```
1번 광고 기준으로 베리에이션 3개 만들어줘. 편집 리듬·음성 유지, 인물·배경만 교체.
```

**주의**: 광고 계정이 없어도 STEP B(영상 증식)는 레퍼런스 영상만 있으면 가능

---

## Ollama + Claude Desktop 로컬 모델 (2026-08-30 신규)
Ollama v0.33+에서 Claude Desktop에 로컬 모델 공식 지원 시작 (2026-08-25 발표)

### 설정 (3단계)
1. Ollama 앱 v0.33+ 설치/업데이트
2. Ollama 앱 → Claude 선택 → 토글 ON
3. Claude Desktop 열면 Ollama 모델로 전환됨 (토글 OFF = 원상복구 즉시)

### 터미널 명령
```bash
ollama launch claude-desktop    # Claude Desktop에 Ollama 연결
ollama launch claude            # Claude Code (터미널)에 연결
```

### 지원 통합 (19개, ollama launch --help 확인)
Claude Code, ChatGPT, Codex, Cline, Copilot, VSCode, Hermes, Kimi, Qwen 등

### 모델 추천 (GPU 없는 PC 기준 실측, 2026-08-27)
| 모델 | 용량 | 속도 | 한국어 | 추천 |
|---|---|---|---|---|
| gemma4:e2b | 7.2GB | 12.30 tok/s | 가장 정확 | GPU 없으면 이걸 먼저 |
| qwen3.5:9b | 6.6GB | 3.65 tok/s | 맞지만 느림 | |
| qwen3.5:4b | 3.4GB | 6.10 tok/s | 상식이 틀림 | |
| qwen3.5:2b | 2.7GB | 9.82 tok/s | 한자 섞임 | |

**핵심 주의**: 추론(thinking) 모드 OFF 필수 — ON 시 50배 느림 (7분 51초 vs 9초)

**데이터 정책**: Ollama Zero Data Retention (프롬프트 Anthropic/Ollama 미전송)

---

## OmniRoute (로컬 PC)

| 항목 | 값 |
|---|---|
| URL | http://localhost:20128 |
| 기본 비밀번호 | CHANGEME |
| 총 공급자 | 256개 |
| 연결된 공급자 | Augment (aug/) + Gemini + Groq — 모두 연결완료 |
| 총 활성 모델 | 79개 (Augment 12 + Gemini 53 + Groq 14) |

### OmniRoute 실행 방법 (매 PC 부팅 후)
```powershell
omniroute serve --daemon
```

### 연결된 공급자 현황 (2026-08-28 기준)
| 공급자 | 모델 수 | 키 이름 | 비고 |
|---|---|---|---|
| Augment | 12개 | main | aug/claude-*, aug/gemini-* |
| Gemini (Google AI Studio) | 53개 | main | gemini-2.0-flash 등 |
| Groq | 14개 | main | llama-3.3-70b 등 초고속 |

### Augment 제공 무료 모델
- aug/claude-sonnet-4.6
- aug/claude-opus-4.6
- aug/claude-haiku-4.5
- aug/gemini-3.1-pro
- aug/gemini-3.0-flash
- 12개 모델 활성화

### Claude Code ↔ OmniRoute 연결 (적용 시)
```powershell
$env:ANTHROPIC_BASE_URL = "http://localhost:20128/v1"
claude
```
영구 적용:
```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "http://localhost:20128/v1", "User")
```

### No Auth Providers (7개, 연결 대기)
- DuckDuckGo AI Chat
- Chipotle Pepper AI
- MiMoCode
- OpenCode Free
- The Old LLM
- Augment (CLI)
- Veo AI Free

---

## Google Cloud Console

| API 키 | 용도 |
|---|---|
| API 키 3개 | GOOGLE_TTS_API_KEY (Cloud Text-to-Speech) |
| mbti | 범용 (Firebase 등 6개 API) |
| Browser key | Firebase 자동 생성 (수정 금지) |

### YouTube OAuth (mbtico-youtube 앱)
- CLIENT_ID: 40761160761-3v5h03e9r974vfq2io4oa08nqhn6r5o8.apps.googleusercontent.com
- 리다이렉트: http://localhost:3000/callback

---

## 수정 이력
| 날짜 | 내용 |
|---|---|
| 2026-08-28 | 최초 생성 (Oracle Cloud, GitHub Actions, 플러그인, OmniRoute 정보 통합) |
| 2026-08-28 | OmniRoute에 Gemini(53개)·Groq(14개) API 키 등록 완료. 총 79개 무료 모델 활성화 |
| 2026-08-28 | Motion Graphics 스킬 4종 + Remotion 공식 12종 설치. Context7 MCP 등록 |
| 2026-08-29 | n8n v2.8.4 Oracle Cloud VM 영구 설치 완료 (http://161.33.136.154:5678, admin/Mbtico2026!, crontab @reboot 자동시작, 라이선스 활성화) |
| 2026-08-29 | Oracle Cloud VCN Security List TCP 5678 Ingress Rule 추가 (n8n 외부 접속용) |
| 2026-08-30 | ECC 스킬 2차 설치: frontend-design-direction, code-reviewer 에이전트 |
| 2026-08-30 | 커스텀 슬래시 명령어 20개 구현: 개발 5개(5whys·risks·blueprint·critique·checklist) + 마케팅 10개(brainstorm·hooks·ghost·tone·story·audience·improve·tweet·expand·proofread) + 비즈니스분석 7개(pros-cons·compare·steelman·devil·tldr·margin·pricing·shorter·rephrase·outline) |
| 2026-08-30 | 프론트엔드 디자인 스킬 3개 설치: design-taste-frontend(1206줄, Leonxlnx), image-to-code(1228줄), web-design-guidelines(39줄, Vercel). Awesome Design MD·Playwright CLI는 로컬 설치 필요 |
| 2026-08-30 | Higgsfield MCP 정보 등록 (로컬 설치 예정). /ad-remix·/ad-brief 광고 커맨드 2개 추가 |
| 2026-08-30 | Meta Ads 커넥터 URL 확인 (https://mcp.facebook.com/ads). Ollama v0.33 Claude Desktop 공식 지원 정보 추가 (gemma4:e2b 추천, thinking 모드 OFF 필수) |
| 2026-08-30 | Awesome Design MD 스킬 설치 완료 (74개 브랜드, `.claude/skills/awesome-design-md/`) — 미설치 항목에서 제거 |
| 2026-08-30 | Higgsfield MCP 커넥터 연결 완료 (claude.ai 설정 → 커넥터 → Higgsfield, 크레딧 없음) |
| 2026-08-30 | Meta Ads MCP 커넥터 연결 완료 (Facebook OAuth, Mbtico 페이지 연결, 광고계정 1139439201982874 KRW) |
| 2026-08-30 | social-media.yml 버그 수정: YouTube step exit code 1 → continue-on-error:true + if/fi 형식으로 수정. Instagram step if:always() 추가. Run #29 원인: [ FAILED=0 ] && echo "..." 마지막 명령이 exit 1 반환 |
| 2026-08-30 | Ollama 0.33.2 로컬 PC 설치 완료. gemma4:e2b 다운로드 중 (7.2GB, ~45분) |
| 2026-08-30 | FIREBASE_API_KEY Worker Secret 상태 정정: "미등록" → "등록완료" (Cloudflare 대시보드 스크린샷으로 확인). ANTHROPIC_API_KEY·GOOGLE_TRANSLATE_KEY도 등록완료로 정정. |
| 2026-09-01 | **Firebase 프로젝트 분리 계획 (미착수)**: DONWAY·용차앱을 별도 Firebase 프로젝트로 분리 → Firestore 무료 읽기 50,000/일 × 4프로젝트 = 200,000/일 확보. FILO+DINE은 컬렉션 공유(members·attendance 등) 구조상 분리 불가 → 동일 프로젝트 유지. 작업 내용: _worker.js 앱별 SA키 분기, Cloudflare Secrets 추가 등록, 기존 데이터 마이그레이션. 예상 기간 1~2주. 우선순위: 시간 날 때 진행 |
| 2026-08-31 | Oracle VM SSH 접속 확인 완료 (opc@161.33.136.154, ssh-key-2026-08-02.key). naver-blog npm install 완료. naver_draft.js: DISPLAY 없으면 자동 headless 전환 + --headless 플래그 추가. 발행 버튼 셀렉터 개선 (waitForSelector + 진단 스크린샷 자동 저장). naver-blog Oracle VM 실행 방법 INFRA_MEMO 등록. |
