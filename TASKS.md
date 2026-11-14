# MBTICO 작업 메모 (TASKS.md)
> 세션 시작 시 반드시 이 파일 먼저 확인. 작업 완료 시 즉시 상태 업데이트.
> 형식: `[ ]` 미완료 / `[~]` 진행중 / `[x]` 완료 / `[-]` 보류(외부 조건 필요)

---

## 🚀 MailMind 출시 선순위 (2026-11-13 기준)

### 🔴 즉시 처리

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 1 | `[~]` | **quality-check Chinese/Hindi ₩ 번역 누락 버그 수정** | run #37 실패: `[Translate 17] KO→Chinese`, `KO→Hindi` — 한국어 이메일 번역 시 ₩ 표기 사라짐. run #38/#39 결과 확인 후 수정 |
| 2 | `[x]` | **iOS TestFlight 빌드 확인 → 실 기기 테스트** | 2026-11-13 v1.0.0 (빌드 27) TestFlight 배포 완료. TestFlight 이메일 수신 확인. 실 기기 테스트는 #8로 이동 |
| 3 | `[ ]` | **Android Play Store 출시 상태 확인** | 심사 제출 2026-10-27, 예상 완료 11/03~07 → 현재 11/13으로 이미 완료됐을 가능성. Play Console 직접 확인 필요 |

### 🟡 출시 준비

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| A | `[x]` | **⚠️ iOS 앱 아이콘 교체** | 2026-11-13 완료. `kimdh4790-cpu/mailmind` repo `ios/Runner/Assets.xcassets/AppIcon.appiconset/` 15개 사이즈 전부 MailMind AI 블루 아이콘으로 교체 (commit 350ec92). Codemagic Build 28 트리거 시 플레이스홀더 경고 사라짐. |
| 4 | `[ ]` | **Android 프로덕션 단계 승격** | Play Console에서 공개 테스트 → 프로덕션 단계적 출시(10%→100%) |
| 5 | `[ ]` | **iOS App Store 심사 통과 → 출시** | 현재 Apple 심사 대기 중. 앱 아이콘 교체 후 빌드 28 재제출 필요 |
| 6 | `[ ]` | **랜딩 페이지 출시 링크 반영** | mailmind.yongcha.app — App Store / Play Store 다운로드 링크 추가 |
| 7 | `[ ]` | **출시 기념 소셜미디어 발행** | MailMind 출시 공지 소셜미디어 콘텐츠 |

### 🟢 출시 후

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 8 | `[ ]` | **실 기기 기능 테스트** | 첨부파일 열기(PR #623), PDF 열기, 계약서 도장 위치(PR #624) — 실 기기 미확인 |
| 9 | `[x]` | **iOS TestFlight Codemagic post-processing 수정** | 2026-11-13 빌드 27에서 에러 없이 TestFlight 배포 성공. 해결됨 |

---

## 🔵 기타 미완료 작업

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 10 | `[-]` | **팝빌 역발행 테스트 → 운영전환** | _worker.js | POPBILL_TEST_MODE=false 운영전환 완료. 실환경 역발행 실전 테스트 필요 (기사 실사업자번호로). 부가세 포함/별도 방식 확인 필요 |
| 11 | `[ ]` | **관제센터 채팅/공지/결제 탭 실사용 테스트** | mbtico-pages/_worker.js | soungkyekim@naver.com으로 실제 로그인 후 테스트 |
| 12 | `[ ]` | **Cloudflare filo-pages Pages 프로젝트 수동 삭제** | — | Cloudflare 대시보드에서 삭제 (PR #216 이후 미처리) |
| 13 | `[x]` | **배달대행 기사현황 관리자 입력 시스템** (2026-11-14 완료) | _worker.js, donway-pages/index.html | dw_driver_stats 신규 컬렉션. Worker SA키로 Firestore 규칙 우회. pageDeliveryDriverAdmin() 관리자 UI. 기사 화면 30초 폴링. AI정산(pageDeliverySettle) 무변경. PR #236 |

## 🗒️ 신규 계획 (미착수)

| # | 상태 | 항목 | 메모 |
|---|---|---|---|
| 14 | `[ ]` | AIVO 대시보드 (mbtico.kr/aivo) | 루틴상태+오류현황+소셜스케줄 한눈에 |
| 15 | `[ ]` | 사이트 리디자인 (Reznikov 스타일) | mbti_landing.html, filo-landing.html |
| 16 | `[ ]` | 네이버 POS 파트너 신청 | smartplace.naver.com B2B 파트너 문의 |

---

## 📱 MailMind 앱 현황 (2026-11-13)

| 항목 | 상태 | 메모 |
|---|---|---|
| Android 최신 빌드 | v1.0.277 | Play Store 내부 테스트 배포 완료. GitHub Actions 자동화 작동 중 |
| Android Play Store 심사 | 확인 필요 | 2026-10-27 제출. 예상 완료 11/03~07 (이미 지남) |
| iOS 최신 빌드 | **v1.0.0 (빌드 27)** | Codemagic 빌드 성공 (26.8MB). TestFlight 배포 완료 (2026-11-13). ⚠️ 앱 아이콘 플레이스홀더 — 교체 필요 |
| iOS App Store 심사 | 대기 중 | PrivacyInfo.xcprivacy 추가 후 제출. 빌드 27 기준으로 재심사 필요 |
| iOS Codemagic 파이프라인 | ✅ 정상 | 빌드 27 post-processing 에러 없음. TestFlight 자동 배포 작동 중 |

---

## ✅ 최근 완료 (2026-11-13)

| 날짜 | 항목 |
|---|---|
| 2026-11-13 | **iOS TestFlight v1.0.0 (빌드 27) 배포 완료** — Codemagic 빌드 성공 (26.8MB), App Store Connect 업로드 성공, TestFlight 이메일 수신 확인. Post-processing 에러 없음 |
| 2026-11-13 | **도장(seal) 위치 수정 (PR #624 머지)** — _signBlock() 8번째 인자 sealHtml 추가, 을(partyB) 서명란 셀 안에 렌더링. _legalBase() 독립 seal-area div 제거. 7개 호출 사이트 전부 적용 (위임장·NDA·용역·공급·MOU·합의서·근로계약) |
| 2026-11-13 | **Refine 내일/tomorrow 절대 날짜 치환 방지 + 첨부파일 열기 (PR #623 머지)** — substituteRefine() 단순 하루 상대 날짜 치환 제거. AI 답변 패널 첨부파일 Chip GestureDetector 연결 |
| 2026-11-13 | **Chrome Extension 로딩 timeout + 취소 버튼** — background.js 35초 timeout, content.js ✕ Cancel 버튼, 5개 workerFetch timeout 처리 |
| 2026-11-13 | **Chrome Extension 버그 6종 수정 (웹세션)** — PLAN_LIMITS 동기화, 톤 8종, 언어 17종, privacy/terms 완성 |
| 2026-11-13 | **PDF base64 패딩 오류 수정** — chunkSize 8192→8190, _safeBase64Decode URL-safe 정규화 |
| 2026-10-29 | **iOS ENABLE_BITCODE=NO 수정** — 3h 무한 대기 해결. Codemagic 빌드 2m34s 성공 |
| 2026-10-28 | **언어 우선순위 3중 수정 (PR #272)** + **서명 원문 유지 수정 (PR #273)** |
| 2026-10-27 | **Android Google 로그인 error 10 수정 (PR #267)** + **앱 아이콘 + 어댑티브 아이콘** |
| 2026-10-26 | **DINE/SCAN/seolyuhana 전체 삭제** (서비스 종료) |
| 2026-11-02 | **FILO 매장운영 HTML/JS 13개 삭제 (PR #216)** |
