# MBTICO - CLAUDE.md
> 유한회사 엠비티아이 SaaS 모노레포. 세션 시작 시 반드시 이 파일 전체를 읽고 시작할 것.

## 🕐 시간 표기 원칙 (필수)
- **모든 시간은 한국 표준시(KST = UTC+9) 기준으로 표기하고 등록할 것**
- UTC로 저장해야 하는 경우(cron 등)에도 사용자에게는 반드시 KST로 보고
- 예: "목 00:00 UTC" → "목 09:00 KST"로 표현

---

## 🔗 세션 분업 원칙 (2026-10-26 확정)
- **웹세션(MailMind Web/Worker Agent)**: 브라우저 확장프로그램 코드만 담당
  - 대상: `mailmind/extension/` 등 크롬 확장 content script·background script·manifest 관련 파일
- **앱세션**: 나머지 전부 담당 (Flutter `lib/`, `worker/worker.js`, `pubspec.yaml` 등)
- 웹세션 ID: `session_01NWDyoBnJzvbjC8xuwmphSp` (멜마인드 웹)

---

## ⚡ 자율 적용 원칙 (2026-09-09 확정)
- **무료 + 유용한 도구·라이브러리·기법은 발견 즉시 허락 없이 바로 적용**
- 적용 후 무엇을 왜 썼는지 한 줄 보고만 하면 됨
- 해당 범위: 오픈소스 라이브러리, 무료 API, 무료 Claude 스킬, 무료 기법·패턴 등
- 예외: 유료 서비스·크레딧 소모·외부 계정 등록이 필요한 것은 먼저 확인

---

## 🎯 정확성·검증 우선 응답 원칙 (모든 세션 필수 적용)

1. 사용자 주장·전제에 자동 동의 금지. 사실·논리 먼저 검토 후, 잘못된 부분은 근거 들어 바로잡을 것.
2. 중요 판단·아이디어 검토 시: 숨은 가정·논리적 약점·빠진 위험·반대 근거 먼저 확인. 필요하면 대안 제시.
3. 맞는 부분과 틀린 부분 구분. 일부만 타당하면 장점·한계 함께 명시.
4. 확인된 사실 / 합리적 추정 / 확인 안 된 내용 반드시 구분. 근거 없으면 "확인하지 못했습니다" 명시.
5. 최신 정보·숫자·날짜·기능·정책은 공식 자료로 확인. 확인 불가 시 그 한계 명시.
6. 존재하지 않는 출처·링크·인용문·파일·실행결과 절대 생성 금지. 실제 확인한 자료만 출처로 사용.
7. 사용자가 원하는 결론에 맞추기 위해 사실 변경 금지. 성립 안 되면 이유 설명 후 현실적 방향 제안.
8. 확신 낮으면 불확실한 이유 명시. 어떤 정보가 추가되면 결론이 달라지는지 안내.
9. 답변 전 핵심 주장에 근거 있는지, 사실·추정 혼재 없는지, 미확인 내용을 단정하지 않았는지 점검.

---

## 📋 메모 파일 체계 (무조건 필수)

| 파일 | 읽어야 할 때 |
|---|---|
| `CLAUDE.md` | 매 세션 시작 시 (필수) |
| `SOCIAL_MEDIA_MEMO.md` | 소셜미디어·영상 작업 시 |
| `BUSINESS_MEMO.md` | 비즈니스·요금·POS기·특허·경쟁사 관련 시 |
| `INFRA_MEMO.md` | Oracle Cloud·GitHub Actions·플러그인·OmniRoute 작업 시 |
| `YONGCHA_MEMO.md` | 용차앱 작업 시 |
| `배송앱_변경내역.md` | 배송앱(filo.ai.kr)·emergency.html 수정 시 |
| `STRATEGY_MEMO.md` | 전략·시장조사·경쟁사·Oracle 확장 계획 논의 시 |
| `RESEARCH_MEMO.md` | 정보수집 자동화 시스템 (인프런·ProductHunt·YouTube 트렌드 수집) 관련 작업 시 |
| `SCAN_MEMO.md` | SCAN AI (dine.ne.kr) 문서분석 서비스 작업 시 |
| `DESIGN.md` | **매 세션 시작 시 필수** (색상·타이포·컴포넌트 기준 — CLAUDE.md 다음 바로 읽을 것) |

### ⚠️ 메모 업데이트 무조건 필수 규칙
- 어떤 작업이든 완료 후 **관련 메모 파일 수정 이력 업데이트 필수**
- 새 정보(계정·API키·서버설정·기능변경) 추가 시 즉시 해당 메모에 기록
- 메모 업데이트 없이 세션 종료 금지

---

## 📹 소셜미디어 작업 시 필독
소셜미디어 홍보 영상 관련 작업은 **SOCIAL_MEDIA_MEMO.md** 먼저 읽을 것.
앱 화면 구성, 계정 정보, 파이프라인 현황, 블로커 목록 전부 정리되어 있음.

---

## 🧪 파일 수정 → 스모크 테스트 (무한 테스트 루프 방지)

파일 수정 후 push 전에 반드시 실행:

```bash
npm run smoke          # 변경된 파일 자동 감지 → 영향 앱만 테스트 (~1분)
npm run smoke:all      # 전체 5개 앱 테스트 (~3분)
npm run smoke:filo     # FILO만
```

### 파일 수정 시 영향 범위 (꼭 확인)
| 수정 파일 | 테스트 대상 |
|---|---|
| `_worker.js` | DONWAY (donway.ai.kr 전용) |
| `mbtico-worker.js` | mbtico.kr 관제센터 |
| `filo-worker.js` | filo.ai.kr 배송앱 |
| `dine-worker.js` | dine.ne.kr SCAN 서비스 |
| `emergency.html` | 배송앱(filo.ai.kr) 핵심 |
| `scan.html` | SCAN(dine.ne.kr) 핵심 |
| `donway*.js` | DONWAY만 |
| `yongcha*.js` | 용차앱만 |
| `mbtico*.js`, `mbtico-pages/` | MBTICO만 |

---

## 🏢 회사 기본 정보
- 대표: 김형우 / 유한회사 엠비티아이 (사업자번호 373-86-02536)
- 로컬 경로: C:\Users\82104\Desktop\mbti-logistics
- GitHub: kimdh4790-cpu/mbti-logistics (main 브랜치만 사용)

---

## 🔑 인프라 핵심 상수 (절대 변경 금지)
Firebase 프로젝트:   mbti-logistics
Cloudflare Account:  02709cbec18d848913b4246015b9148f
KV NS_ID:            7f0e90efaea64f3ab08ff00f8970b28b
슈퍼어드민:          kimdh4790@gmail.com / soungkyekim@naver.com
테스트 dealerId:     3lqP7HNSgVP18eZbMn6DnQxRXCA2
매장 dealerId:       9XD2K3W1tIhIs6XM74YT0xfRFEP2
Oracle Cloud IP:     161.33.136.154 (2코어/12GB, opc 계정, filo-a1-2c12g)

## 📱 MailMind 앱 배포 현황 (2026-11-01 기준 — 절대 다시 진행하지 말 것)
- **Android** ✅ Google Play 내부 테스트 `1.0.277` 배포 완료. GitHub Actions(`build-android.yml`) → Play Store 내부 테스트 자동화 이미 작동 중. 다시 설정할 필요 없음.
- **iOS** ✅ Codemagic(`ios-workflow`) → App Store Connect 제출 완료. `PrivacyInfo.xcprivacy` 추가(PR #338), 빌드 261, 버전 1.1.0. 현재 Apple 심사 대기 중.
- **빌드 인프라**: Android = GitHub Actions 자동, iOS = Codemagic 수동 트리거. 둘 다 이미 세팅 완료.
- **Appetize.io** (안드로이드에서 iOS 테스트): 나중에 진행 예정. 아직 미착수.

## 📱 MailMind 핵심 URL
- **어드민 대시보드**: https://mailmind-api.kimdh4790.workers.dev/admin-ui (유저 관리·사용량·플랜 분포)
- **랜딩 페이지**: https://mailmind.yongcha.app (14개 언어 i18n)
- **Worker API**: https://mailmind-api.kimdh4790.workers.dev
- **패키지명**: app.yongcha.mailmind

---

## 📱 앱별 구조 & 담당 파일 (세션 시작 시 담당 앱 확인 필수)

### 🟣 FILO (filo.ai.kr) — 배송앱 (2026-09-20 전환)
> 담당 메모: `배송앱_변경내역.md` 필독
- **핵심 파일**: emergency.html (배송 기사 앱), filo-worker.js (라우터)
- filo.ai.kr은 배송앱 위주로 운영
- 구 매장관리 SaaS(filo-auth.js, filo-pos.js 등) 폐기 방향

**FILO 절대 금지**
- filo-worker.js 대규모 수정 금지 (배송앱 라우팅 핵심)
- emergency.html 수정 전 반드시 배송앱_변경내역.md 확인

---

### 🟢 DINE (dine.ne.kr) — SCAN 문서분석 서비스 (2026-09-20 전환)
> 담당 메모: `SCAN_MEMO.md` 필독
- **핵심 파일**: scan.html (프론트), dine-worker.js (라우터+API)
- dine.ne.kr 루트 → scan.html 서빙
- SCAN API: `/api/seolyuhana/*` (analyze·result·download·points·point-request·point-approve)
- Firebase authDomain: `dine.ne.kr`
- 백엔드 모듈: `seolyuhana/services/analyze.js`, `seolyuhana/utils/parser.js`, `seolyuhana/output/builder.js`

**DINE/SCAN 절대 금지**
- scan.html authDomain을 다시 mbtico.kr로 변경 금지
- dine-worker.js의 `/api/seolyuhana/*` 핸들러 구조 변경 금지

---

### 🔵 DONWAY (donway.ai.kr) — 물류 정산
- donway_landing.js — 랜딩
- donway-pages/index.html → KV key: settle.html
- drivers.html — 기사 전용 화면

**DONWAY 절대 금지**
- preFreshback / dateFresh 로직 수정 금지
- settle.html / drivers.html 리팩토링 금지
- KV 업로드 시 settle.html 키 예외: `--path donway-pages/index.html`

---

### 🟠 용차앱 (yongcha.app)
- yongcha.html, yongcha-landing.html
- yongcha-worker.js ← 별도 wrangler 설정 (KV 업로드 효과 없음)

**용차앱 절대 금지**
- KV 업로드로 배포 불가. 반드시 `npx wrangler deploy` 사용
- 라우트 yongcha.app/*: wrangler.yongcha.toml에서 관리 (2026-09-01 wrangler.toml에서 분리, PR #51)

---

### ⚪ MBTICO 관제센터 (mbtico.kr)
- **mbtico-worker.js** ← 전용 Worker (wrangler.mbtico.toml, 2026-09-20 _worker.js에서 분리)
- mbtico-pages/ ← 별도 wrangler (cd mbtico-pages && npx wrangler deploy)
- mbtico-ctrl.js — 슈퍼어드민용 (채팅·공지·결제·매장 관리)

**MBTICO 절대 금지**
- mbtico-pages/_worker.js 대규모 수정 금지 (515KB — 분리 작업은 별도 세션에서 계획 수립 후 진행)
- 슈퍼어드민 UID·dealerId 변경 금지

---

### ⚫ _worker.js — donway.ai.kr 전용 Worker
> 2026-09-20: mbtico.kr 블록 분리 완료. 현재 donway.ai.kr 전용.

**도메인별 Worker 파일 현황**
| 도메인 | Worker 파일 | wrangler config |
|---|---|---|
| filo.ai.kr | filo-worker.js | wrangler.filo.toml |
| dine.ne.kr | dine-worker.js | wrangler.dine.toml |
| donway.ai.kr | _worker.js | wrangler.toml |
| mbtico.kr | mbtico-worker.js | wrangler.mbtico.toml |
| yongcha.app | yongcha-worker.js | wrangler.yongcha.toml |

- KV(DONWAY_ASSETS)에서 HTML·JS 파일 서빙
- Firestore SA 키로 서버사이드 Firestore 직접 접근

**_worker.js 절대 금지**
- `}{status:400` 치환 패턴 수정 금지 (Worker 빌드 깨짐)
- wrangler.toml [vars] 수정 금지
- Cloudflare Secrets는 대시보드 또는 `wrangler secret put` (OPC VM에서 CF_GLOBAL_KEY 사용)으로 관리

### 🔴 DONWAY 계약서 설계 원칙 (절대 변경 금지)
- **계약 내용 입력 방식**: DOCX 파일 다운로드 → 기사가 직접 타이핑 → 등록. 별도 입력 폼(담당구역·수수료·차량번호 등) 추가 금지
- **사업자번호·주민번호**: 기사가 서명 페이지(알림톡 링크)에서 직접 입력. 대리점 화면에서 미리 입력 받지 않음
- **_ctrRenderWrite()**: ② 대리점 정보 카드 + ④ DOCX 업로드 + ⑤ 대리점 서명 3단계만 존재. ③ 계약 주요 내용 폼 절대 추가 금지

---

## 🚫 전체 공통 절대 수정 금지
- wrangler.toml 및 [vars] 섹션
- _worker.js 내 }{status:400 치환 패턴
- Cloudflare KV NS_ID (7f0e90efaea64f3ab08ff00f8970b28b)
- Firebase mbti-logistics 프로젝트 설정
- GitHub Actions secrets (CF_GLOBAL_KEY)
- 슈퍼어드민 UID·dealerId
- deploy.yml 수정 가능 (단, workflow 파일 변경 시 auto-merge 안 됨 → GitHub에서 수동 Merge 필요)
- DONWAY preFreshback/dateFresh 로직 수정 금지

## 📦 배송앱 작업 전 필독
emergency.html / _worker.js 수정 전 반드시 읽을 것:
→ `배송앱_변경내역.md` (구조 설명, 절대 금지 사항, 앱별 동작 차이, 변경 이력 포함)
배송앱 수정 후에는 해당 파일 변경 이력도 함께 업데이트할 것.

---

## 📦 배포 규칙

### 클라우드 코드(원격) 자동 배포 흐름
1. 클라우드 코드에서 코드 수정 후 `claude/*` 브랜치 push
2. `.github/workflows/auto-merge.yml` 자동 실행 → main 머지
3. `.github/workflows/deploy.yml` 자동 실행 → KV 업로드 + 캐시 퍼지
- 로컬 작업 불필요. 클라우드 코드 push만 하면 끝.
- donway-settle-app CI 빨간 표시는 무관 (미사용 프로젝트)

### KV 업로드 (로컬 수동)
npx wrangler kv key put --remote --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b [파일명] --path [파일경로]
settle.html 예외: --path donway-pages/index.html

### Worker 배포
(Get-Content _worker.js -Raw) -replace '}` + '{' + `status:400', '}' | Set-Content _worker.js
npx wrangler deploy

### GitHub push
git add -A && git commit -m "feat: [작업내용]" && git push origin main

### yongcha.app (KV 업로드 효과 없음)
git pull origin main && npx wrangler deploy

### mbtico.kr
cd mbtico-pages && npx wrangler deploy

---

## ✅ 작업 규칙
- 명령어 순차 실행 (병렬 금지)
- git stash 사용 금지
- 백그라운드 셸 실행 금지
- 파일 하나 수정  즉시 KV 업로드  확인  다음 파일
- 5개 초과 목록  페이지네이션
- 이모지 금지  Lucide SVG 사용
- 폰트: Pretendard 전용
- alert() 금지  toast 함수 사용
- Claude Code 원격 컨테이너: 코드 수정+배포 가능. Playwright 브라우저가 외부 URL 접근 불가 → 녹화/업로드 불가
- Oracle Cloud (161.33.136.154): Playwright + Chromium + Node.js 완전 실행 가능. 녹화·편집·업로드 모두 가능
- wrangler login은 로컬 또는 Oracle Cloud에서만
- Playwright 테스트  반드시 로컬에서 실행
- 배포 확인 필수: push 후 GitHub Actions 워크플로우 완료(success) 확인 → KV 업로드 + Worker 배포 + 캐시 퍼지 3단계 모두 success 여야 배포 완료
- deploy.yml 수정 가능: workflow 파일 변경 시 auto-merge 안 됨 → GitHub에서 수동 Merge 필요 (2026-09-01 PR #50으로 yongcha 자동배포 추가 완료)

---

## 🎨 디자인 기준
- 색상: 네이비(#08101f) + 골드(#c9a84c) + 화이트 고정
- 그라데이션 남용 금지
- 모바일 퍼스트 (375px 기준)
- 터치 타겟 최소 44px
- 로딩/빈상태/에러 상태 항상 처리
- 여백: 16px/24px/32px 배수
- 폰트 계층: 24px/16px/14px/12px


---

## 📦 완료 작업 이력
> 완료된 작업 상세 내역은 **`CLAUDE_ARCHIVE.md`** 참조 (토큰 절약을 위해 분리)
