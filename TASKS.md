# MBTICO 작업 메모 (TASKS.md)
> 세션 시작 시 반드시 이 파일 먼저 확인. 작업 완료 시 즉시 상태 업데이트.
> 형식: `[ ]` 미완료 / `[~]` 진행중 / `[x]` 완료 / `[-]` 보류(외부 조건 필요)

---

## 🗺️ 앱별 구조·배포 방식·기능 현황 (2026-09-20 기준)

### 🟣 FILO (filo.ai.kr) — 배송앱
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `filo-worker.js` |
| **wrangler config** | `wrangler.filo.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy --config wrangler.filo.toml` |
| **KV 업로드** | `npx wrangler kv key put --remote --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b [파일명] --path [경로]` |
| **핵심 파일** | `emergency.html` (배송기사 앱), `filo-worker.js` (라우터) |
| **주요 기능** | 배송 기사 앱 / 실시간 위치 공유 / 배차 요청 / 배달 완료 처리 |
| **구 기능 (폐기예정)** | POS·주문·메뉴·재고·직원근태·급여 (filo-auth.js, filo-pos.js 등) |
| **주의** | filo-worker.js 대규모 수정 금지 / emergency.html 수정 전 배송앱_변경내역.md 필독 |

### 🔵 DONWAY (donway.ai.kr) — 물류 정산 SaaS
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `_worker.js` |
| **wrangler config** | `wrangler.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy` |
| **KV 업로드** | settle.html 예외: `--path donway-pages/index.html` |
| **핵심 파일** | `donway-pages/index.html` (settle.html로 KV서빙), `donway_landing.js`, `drivers.html` |
| **주요 기능** | 엑셀 업로드 → 수백명 기사 정산 / 정산명세서 알림톡 발송 / 계약서 시스템(위수탁·퀵플렉스·근로) / 카카오 소셜 로그인 / 팝빌 세금계산서 역발행(테스트 중) |
| **요금** | 50명 ₩125,000 / 100명 ₩250,000 / 500명 ₩1,250,000 / 1000명+ 문의 |
| **주의** | preFreshback/dateFresh 로직 수정 금지 / settle.html·drivers.html 리팩토링 금지 |

### 🟠 용차앱 (yongcha.app) — 소장·기사 직접 거래 정보 서비스
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `yongcha-worker.js` |
| **wrangler config** | `wrangler.yongcha.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy --config wrangler.yongcha.toml` |
| **KV 업로드** | **효과 없음.** 반드시 wrangler deploy 사용 |
| **핵심 파일** | `yongcha.html`, `yongcha-landing.html`, `yongcha-worker.js` |
| **주요 기능** | 화물 공고 등록·조회 / AI 기사 추천 / 음성 공고 등록 / 캠프·상차지 다중 등록 / 법적 고지(부가통신사업자) |
| **요금** | 기사 ₩150,000/월 / 소장 ₩50,000/월 / DONWAY 구독 소장 무료 |
| **주의** | KV 업로드로 배포 불가 / yongcha.app/* 라우트는 wrangler.yongcha.toml 관리 |

### ⚪ MBTICO 관제센터 (mbtico.kr)
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `mbtico-worker.js` (2026-09-20 분리) |
| **wrangler config** | `wrangler.mbtico.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy --config wrangler.mbtico.toml` |
| **mbtico-pages 별도** | `cd mbtico-pages && npx wrangler deploy` (수동 배포 별도) |
| **핵심 파일** | `mbtico-ctrl.js` (슈퍼어드민), `mbtico-pages/_worker.js` (515KB) |
| **주요 기능** | 슈퍼어드민 관제 / 가입 승인·거절 / 채팅·공지·결제 관리 / 신규가입 FCM 알림 / OOPS 오류 모니터링 |
| **주의** | mbtico-pages/_worker.js 대규모 수정 금지 / 슈퍼어드민 UID·dealerId 변경 금지 |

---

## 🚀 공통 배포 흐름 (자동)
```
claude/* 브랜치 push
  → auto-merge.yml (main 자동 머지)
  → deploy.yml (KV 업로드 + Worker 배포 + 캐시 퍼지)
```
> deploy.yml 수정 시 auto-merge 안 됨 → GitHub에서 수동 Merge 필요

---

## 🔴 최우선 (즉시 처리)

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 1 | `[x]` | ~~FCM 영수증 푸시~~ (2026-10-25 삭제) | filo-pos-pay.js | 앱 코드에서 영수증 기능 제거됨 |
| 2 | `[x]` | **팝빌 연동신청 접수** (2026-09-21) | — | 팝빌 개발자센터 연동신청 완료. 아이디: mbtico2026 / 이메일: kimdh4790@gmail.com. API Key 발급 후 이메일 안내 예정. |
| 3 | `[x]` | **팝빌 키 발급 → Cloudflare Secret 등록 완료** (2026-09-22) | _worker.js | LINK_ID=MBTI / SecretKey 발급. Cloudflare Worker(mbti-logistics) 비밀에 POPBILL_LINK_ID·POPBILL_SECRET_KEY 등록 완료. POPBILL_TEST_MODE=true 추가 필요 → 테스트 진행 가능. |
| 4 | `[-]` | **팝빌 역발행 테스트 → 운영전환 신청** | _worker.js | **2026-09-23 팝빌 기술지원 답변**: "링크아이디 오입력" — timestamp 형식 오류가 원인. **수정 완료**: `20260923T013000Z`(T/Z 포함 16자리) → `20260923013000`(yyyyMMddHHmmss 14자리). deploy.yml 자동 배포 완료 후 `/api/popbill-debug` 재확인 필요. 성공 시 POPBILL_TEST_MODE=false 운영전환. |
| 5 | `[x]` | **MailMind Android Galaxy M44 Google 로그인 + 아이콘** | mailmind 레포 | google-services.json 수정(오류 10 해결) + AI 아이콘 + 어댑티브 아이콘 커밋 완료. v263 Play Console 내부테스트 업로드 + 실 기기 Google 로그인 성공 확인. |

### 🔑 팝빌 테스트 계정 (2026-09-21 연동신청 시 등록)
| 항목 | 값 |
|---|---|
| **테스트 계정 아이디** | `mbtico2026` |
| **테스트 계정 비밀번호** | `Mbtico2026!` |
| **담당자 이메일** | kimdh4790@gmail.com |
| **API 상품** | 전자세금계산서 |
| **연동신청일** | 2026-09-21 |
| **키 발급 상태** | 대기 중 (신청 후 박주선 팀장 이메일 안내 예정) |

> ⚠️ **발행 방식: 역발행 (기사 → 대리점)** — 공급자(기사)가 공급받는자(대리점/DONWAY)에게 발행 요청. 일반발행(대리점→기사) 아님. 팝빌 연동 시 반드시 역발행 API만 사용할 것.
>
> 역발행 흐름: `RegistRequest(기사측)` → `Issue(대리점측 최종발행)` → Webhook(상태반영)

### 💡 역발행 부가세 처리 방식 (2026-09-21 확인 필요)

현재 코드(`_worker.js` L6922~6924)는 **부가세 포함** 방식으로 역산 처리 중:
```
vatInc(정산금액) ÷ 1.1 = 공급가액  →  세액 = 정산금액 - 공급가액
예) 정산 1,100,000원 → 공급가 1,000,000 + 세액 100,000
```

**배달대행/쿠팡플렉스 정산은 대부분 "부가세 별도"** — 정산금액이 공급가액이고 회사가 세액 10% 추가 지급하는 구조.

> ⚠️ **확인 필요**: DONWAY가 기사에게 지급하는 정산금액이 부가세 포함인지 별도인지 확인 후 코드 수정 필요.
> - 부가세 포함 → 현재 코드 유지 (`정산금액 / 1.1`)
> - 부가세 별도 → `supplyAmt = vatInc`, `taxAmt = round(vatInc * 0.1)`, `totalAmt = vatInc + taxAmt` 로 변경

---

## 🟡 중간 우선순위

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 3 | `[ ]` | 관제센터 채팅/공지/결제 탭 실사용 테스트 | mbtico-pages/_worker.js | soungkyekim@naver.com으로 실제 로그인 후 테스트 |

---

## 🔵 파일 분리·경량화 (대형 작업 — 별도 세션 계획 필요)

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 4 | `[ ]` | mbtico-pages/_worker.js 경량화 | mbtico-pages/_worker.js | 515KB. 작업 전 별도 세션에서 설계 먼저 |
| 5 | `[ ]` | emergency.html 재작성 | emergency.html | 461KB. 배송앱_변경내역.md 먼저 읽을 것 |

---

## 🟢 비즈니스·법무 (외부 절차 필요)

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 6 | `[ ]` | 네이버 POS 파트너 신청 | - | smartplace.naver.com B2B 파트너 문의. 승인 후 /api/naver-place-sync 구현 |
| 7 | `[ ]` | 용차앱 저작권 등록 | - | cros.or.kr 직접 신청. 코드 기반 저작물 |
| 8 | `[ ]` | 벤처기업 인증 | - | 기보 부산지점 신청 |

### 📱 앱스토어 계정 등록

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| A1 | `[x]` | **나이스디앤비 D-U-N-S 문의 접수** (2026-10-18) | kimdh4790@gmail.com / 01047903103 / 유한회사 엠비티아이 / 사업자번호 373-86-02536 / 대표 김형우 |
| A1b | `[x]` | **D-U-N-S 번호 발급 완료** (2026-10-27) | **D-U-N-S: 695921476** (MBTI Ltd., 엠비티아이(유)). Apple Developer Relations 이메일로 즉시 수신. 구글·애플 앱스토어 조직 계정 등록에 모두 사용 가능 |
| A2 | `[x]` | **Apple 계정 생성 완료** (2026-10-18) | kimdh4790@gmail.com / 이중 인증 설정됨 |
| A3 | `[x]` | **Google Play Console 조직 계정 등록 완료** (2026-10-27) | $25 KB국민카드 기업카드 8865 결제 완료. 개발자 계정 생성됨. D-U-N-S: 695921476, 결제 프로필: 엠비티아이(유) |
| A3b | `[x]` | **Google Play 본인 확인(신원 인증) 완료** (2026-10-27) | 회사명 확인됨 + 권한을 부여받은 담당자(김형우) 확인됨. 엠비티아이(유) 인증 완료. 앱 배포 가능 상태 |
| A4 | `[x]` | **Apple Developer Program $99 결제 완료** (2026-10-28) | 등록 ID: **5G5PA8D7B7** / ₩129,000 결제 완료(KG이니시스, 주문번호 W1543637896, 승인번호 30010555). iOS 앱 제출 가능 상태. |
| A5 | `[x]` | **MailMind Play Store 스토어 등록정보 + 심사 제출 완료** (2026-10-27) | Build 263(v1.0.263) 공개 테스트 트랙 포함 변경사항 12개 Google 검토 제출 완료. 검토 완료 예상: 2026-11-03~07. |
| A6 | `[x]` | **MailMind v254/255 앱 크래시 수정 완료** (2026-10-27) | 원인 2가지: (1) google-services.json 패키지명 불일치 (2) hook_service.dart QuickActions 존재하지 않는 drawable 참조 제거. PR #265 머지 완료. |
| A7 | `[x]` | **MailMind Play Store 내부 테스트 Google 로그인 error 10 수정 완료** (2026-10-27) | Firebase에 Play 앱 서명 SHA-1 추가 후 google-services.json 재적용. PR #267 머지. 실 기기 Google 로그인 성공 확인. |
| A8 | `[~]` | **MailMind iOS TestFlight 빌드 — PR #273 머지 대기** | mailmind 레포 | GitHub Secrets 3개 등록 완료. Fastfile key_filepath 방식(OpenSSL 파싱 오류 수정). 머지 컨플릭트 해결(9a6b80c). CI: Jest ✅ / Flutter ✅. main 머지 후 TestFlight 자동 배포 |

> D-U-N-S: 695921476 (엠비티아이(유)). Google Play 계정 등록 완료. Apple Developer Program 결제 완료. iOS TestFlight CI/CD 파이프라인 구축 완료 (Secrets 등록 후 동작).

---

## 🗒️ 신규 계획 (논의 완료, 미착수)

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 10 | `[ ]` | AIVO 대시보드 (mbtico.kr/aivo) | mbtico-worker.js | 루틴상태+오류현황+소셜스케줄 한눈에 |
| 11 | `[ ]` | 사이트 리디자인 (Reznikov 스타일) | mbti_landing.html, filo-landing.html | reznikov-eng.com 레퍼런스 |

---

## ✅ 최근 완료 (참고용)

| 날짜 | 항목 |
|---|---|
| 2026-10-28 | **MailMind 서명 원문 그대로 유지 수정 (PR #273 branch, commits aa09439·bde77d7)** — `worker/worker.js` 3곳: (1) `JP_SIGNATURE_PROMPT`: 한국어→일본어 음역 제거, "EXACTLY AS WRITTEN" 보존 지시. (2) `buildSignOffInstruction(lang)`: 클로징 문구만 현지어(`よろしくお願いいたします。` 등), 이름·회사·직함·전화·이메일은 원문 그대로. (3) `handleGenerate` 인라인: "TRANSLATE the sign-off" → "copy EXACTLY AS WRITTEN". |
| 2026-10-28 | **MailMind iOS TestFlight CI/CD 파이프라인 구축 (PR #273)** — `.github/workflows/build-ios.yml` + `ios/fastlane/Appfile` + `ios/fastlane/Fastfile` 신규. Fastlane `beta` lane: App Store Connect API key(H2M5GFA4BM)로 cert+sigh → IPA 빌드 → TestFlight 업로드. 실행하려면 GitHub Secrets 3개 등록 필요(A8 항목 참조). |
| 2026-10-28 | **MailMind 언어 우선순위 3중 수정 완료 (PR #272 머지)** — (1) handleGenerateSmart: detectedBodyLangS 우선→myLanguage 우선으로 변경. (2) handleTriple: effectiveMyLanguage 로직 동일 패턴 적용. (3) 6개 핸들러 myLanguage 기본값 `'Korean'`→`'auto'` 변경(handleCompose/Refine/GenerateSmart/Triple/AiBrief/AiQuickCompose). handleAiBrief: briefLang 변수 추가로 'auto' 문자열이 Claude 프롬프트에 그대로 들어가는 문제 방지. |
| 2026-10-28 | **Apple Developer Program 등록 완료** — 라이선스 동의 + ₩129,000 결제 완료(KG이니시스, 주문번호 W1543637896, 승인번호 30010555). 등록 ID: 5G5PA8D7B7. 이제 App Store Connect에서 iOS 앱 제출 가능. |
| 2026-10-28 | **MailMind AI 서명 주소 할루시네이션 수정 (PR #268 머지)** — 10개 언어 서명 프롬프트 `⛔ ADDRESS OMISSION` 규칙 추가. commit `88254d99`, squash merge 완료. |
| 2026-10-27 | **MailMind Android Google 로그인 오류 10 수정 + MailMind AI 아이콘 + 삼성 어댑티브 아이콘** — (1) google-services.json 복원: `app.yongcha.mailmind` 엔트리 + type-1 OAuth client SHA-1 포함으로 복원 → PlatformException sign_in_failed error 10 해결. (2) MailMind AI 로고(파란 그라데이션 + 지구본·봉투·별 아이콘) 모든 mipmap 크기 적용. (3) 어댑티브 아이콘 추가 → 삼성 One UI 카카오톡처럼 둥근 사각형 모양. mailmind 레포 commits `ca33950`·`58559f45`·`50e86c1`. |
| 2026-10-27 | **MailMind Play Store Google 로그인 error 10 수정 (PR #267)** — Play App Signing SHA-1 Firebase 추가 + google-services.json 재다운로드. PR #267 squash merge(commit `b5e4be2`). v263 내부 테스트 업로드 후 실 기기 Google 로그인 정상 확인. |
| 2026-10-27 | **MailMind v254/255 앱 크래시 수정 (PR #265)** — google-services.json 패키지명 수정 + hook_service.dart drawable 참조 제거. PR #265 squash merge(commit `63b0f5d`). |
| 2026-10-26 | **DINE/SCAN/seolyuhana 전체 삭제** — dine.ne.kr 도메인 갱신 안 함, 서비스 종료. commit `c50dab38`. |
| 2026-10-26 | **MailMind `_draftKoNames` 후처리 안전장치 배포** — PR #262 머지 완료, commit `66ed09b`. 2중 방어 완성. |
| 2026-10-26 | **MailMind worker.js 포괄 품질 점검 + "엠비티아이"→MBTI 버그 3단계 수정** — PR #261 squash merge. |
| 2026-10-26 | **MailMind 답변 언어를 이메일 본문 언어로 결정** — PR #260, commit `6df0487`. |
| 2026-10-26 | **MailMind 발신자 문화 지식 우선순위 개선** — commit `346ee14`. |
| 2026-10-26 | **CLAUDE.md 웹세션 ID 업데이트** — 활성 세션 `session_01NWDyoBnJzvbjC8xuwmphSp`으로 변경. |
| 2026-10-26 | **MailMind outlook 비교/스마트 모드 3개 답변 생성 버그 수정** — PR #198. |
| 2026-10-26 | **MailMind 17개 언어 수정보완(Refine) 품질 전면 개선** — commit `859535d`. |
| 2026-10-25 | **MailMind Flutter 답변 언어 '자동 감지' 버그 수정** — PR #257. |
| 2026-10-25 | **MailMind 번역 시 전화번호 하이픈 보존** — commit `223b71a`. |
| 2026-10-16 | **MailMind Flutter 앱 버그 4종 수정 + CI 키스토어 수정** — PR #177~178. |
| 2026-10-11 | **MailMind 영상 14개 언어 로컬라이제이션 + TTS 폴백** — PR #183 |
| 2026-10-10 | **MailMind 랜딩 14개 언어 i18n 지원** — PR #182 |
| 2026-10-08 | **쿠팡 송장 OCR 정상화** — PR #177 머지 완료. |
| 2026-10-08 | **배송기사 앱 이름만 로그인** — PR #175 머지 완료. |
| 2026-10-03 | **MailMind Pages 배포 완료** — Cloudflare Pages `mailmind.yongcha.app` |
| 2026-10-03 | **MailMind 14개 언어 × 하루 2회 자동 업로드 시스템 완성** — PR #172 머지 완료. |
| 2026-09-22 | 소셜미디어 영상 GitHub Actions 재실행 |
| 2026-09-21 | DONWAY 기사 가입 Firestore 권한 오류 수정 |
| 2026-09-20 | mbtico.kr Worker 분리 완료 |

---

## 📝 세션별 작업 이력

### 2026-10-28
- MailMind handleGenerateSmart / handleTriple 언어 우선순위 수정 (PR #272 머지)
- MailMind 6개 핸들러 myLanguage 기본값 'Korean'→'auto' 제거 (Korean 언어 편향 제거)
- MailMind iOS TestFlight CI/CD 파이프라인 구축 (PR #273 오픈, Secrets 등록 필요)
- Apple Developer Program $99 결제 완료 (등록 ID: 5G5PA8D7B7)
- TASKS.md 업데이트

### 2026-10-27
- MailMind Android Google 로그인 오류 10 수정 (google-services.json 복원)
- MailMind AI 로고 아이콘 모든 mipmap 적용
- 삼성 One UI 카카오톡 모양 어댑티브 아이콘 추가
- TASKS.md 업데이트

### 2026-09-20
- mbtico.kr Worker 분리 완료 (PR #128 수동 머지)
- CLAUDE.md 메모 업데이트 (PR #129 수동 머지)
- TASKS.md 신규 생성 — 앱별 배포방식·기능 정리
- 배송앱 도메인 주석 수정 (PR #131 자동 머지)

---

## 🔧 사용 방법

**세션 시작 시:**
1. `TASKS.md` 열어서 미완료/진행중 항목 확인
2. 사용자 명령과 관련된 항목 `[~]` (진행중)으로 변경
3. 작업 완료 후 `[x]` + 완료 날짜 기록, 최근 완료 섹션으로 이동

**새 작업 추가 시:**
- 해당 우선순위 테이블에 행 추가
- 완료 후 최근 완료 섹션으로 이동

**항상 기억:**
- `TASKS.md` 업데이트 없이 세션 종료 금지
- 외부 조건 필요한 항목은 `[-]` (보류)로 표시
