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
| SSH 키 | ssh-key-2026-08-02 (등록 완료 2026-08-28) |
| 로그인 | kimdh4790@gmail.com / khw3103!! |

### SSH 접속
```bash
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154
```

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
