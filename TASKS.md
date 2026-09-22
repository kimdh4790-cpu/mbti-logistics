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

### 🟢 DINE (dine.ne.kr) — SCAN 문서분석 서비스
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `dine-worker.js` |
| **wrangler config** | `wrangler.dine.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy --config wrangler.dine.toml` |
| **KV 업로드** | scan.html: `npx wrangler kv key put --remote --namespace-id=... scan.html --path scan.html` |
| **핵심 파일** | `scan.html` (프론트), `dine-worker.js` (라우터+API) |
| **주요 기능** | 공문서 AI 분석 / 등기부등본(전세사기 분석) / 자소서·이력서·계약서 분석 / 다국어 번역 / 포인트 충전 |
| **API 경로** | `/api/seolyuhana/analyze·result·download·points·point-request·point-approve` |
| **포인트 요금** | 면접 19,900P / 이력서·계약서 29,900P / 자소서·번역 39,900P / 충전 30,000~200,000원 |
| **authDomain** | `dine.ne.kr` (변경 금지) |
| **주의** | `/api/seolyuhana/*` 핸들러 구조 변경 금지 / scan.html authDomain 변경 금지 |

### 🔵 DONWAY (donway.ai.kr) — 물류 정산 SaaS
| 항목 | 내용 |
|---|---|
| **Worker 파일** | `_worker.js` |
| **wrangler config** | `wrangler.toml` |
| **배포 방식** | GitHub push → deploy.yml 자동실행 → `npx wrangler deploy` |
| **KV 업로드** | settle.html 예외: `--path donway-pages/index.html` |
| **핵심 파일** | `donway-pages/index.html` (settle.html로 KV서빙), `donway_landing.js`, `drivers.html` |
| **주요 기능** | 엑셀 업로드 → 수백명 기사 정산 / 정산명세서 알림톡 발송 / 계약서 시스템(위수탁·퀵플렉스·근로) / 카카오 소셜 로그인 / 팝빌 세금계산서 역발행(키 발급 대기) |
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
| 1 | `[-]` | FCM 영수증 푸시 실 기기 동작 확인 | filo-pos-pay.js | 실 기기 필요. 로컬 테스트 불가 |
| 2 | `[x]` | **팝빌 연동신청 접수** (2026-09-21) | — | 팝빌 개발자센터 연동신청 완료. 아이디: mbtico2026 / 이메일: kimdh4790@gmail.com. API Key 발급 후 이메일 안내 예정. |
| 3 | `[-]` | 팝빌 키 발급 후 Cloudflare Secret 등록 → 역발행 실전 테스트 | _worker.js | 연동신청 접수 완료 후 → LINK_ID+SecretKey 수신 → wrangler secret put 3개 등록 → 테스트. 요금: **100원/건 (부가세 별도 → 실청구 110원/건)**. 코드 완성됨 키만 대기. |

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

---

## 🗒️ 신규 계획 (논의 완료, 미착수)

| # | 상태 | 항목 | 담당 파일 | 메모 |
|---|---|---|---|---|
| 9 | `[ ]` | SCAN 제조 견적 기능 | scan.html, dine-worker.js | /api/scan/quote, Oracle oracle-server.js 활용 (multer·Puppeteer·PaddleOCR 이미 설치됨) |
| 10 | `[ ]` | AIVO 대시보드 (mbtico.kr/aivo) | mbtico-worker.js | 루틴상태+오류현황+소셜스케줄 한눈에 |
| 11 | `[ ]` | 사이트 리디자인 (Reznikov 스타일) | scan.html, mbti_landing.html, filo-landing.html | reznikov-eng.com 레퍼런스 |

---

## ✅ 최근 완료 (참고용)

| 날짜 | 항목 |
|---|---|
| 2026-09-22 | DONWAY 전자계약서 대리점·기사 계약 내용 통일 — contract.html `_printCourier()` + contract-sign.html `buildHtml()` CLS 위수탁 표준계약서 16개 조항으로 일치, 개인정보 동의 별지 제1·2호 추가, 기사 서명 시 사업자번호·주소 입력 필드 추가, 서명 완료 후 전체 계약서 재렌더링 |
| 2026-09-21 | DONWAY 기사 가입 Firestore 권한 오류 수정 — /api/check-company-code(GET) + /api/driver-join(POST) 서버사이드 API 신규, _quickVerifyCode·checkCompanyCode·doQuickJoin 클라이언트 Firestore 직접 접근 제거, SHA-256 pw 해시 저장 |
| 2026-09-21 | DONWAY 배달대행 기사 앱 탭 정리 — 입차(pni1)·정산(pni5) 탭 제거, 배달대행 기사는 홈·배송달력·내정보만 노출 (AI정산은 알림톡 전용, 앱 불필요) |
| 2026-09-21 | DONWAY 배달대행 기사 일일 배송 달력 뷰 추가 — POST /api/delivery-daily-upload (대리점 엑셀업로드), GET /api/delivery-daily (기사 본인 데이터만 조회, uid+dealerId 검증), drivers.html 배송달력 탭(pni7) + 월별 캘린더 UI + 하단 누적 통계, donway-pages/index.html 📅 일일 배송 업로드 버튼 (_parseDailyDeliveryExcel) — PR #142 머지 완료 |
| 2026-09-21 | DONWAY 배송달력 API 인증 방식 수정 — GET /api/delivery-daily를 Firebase Auth(uid 불일치)에서 phone+companyCode 파라미터 기반으로 교체, companies 컬렉션에서 dealerId 조회, drivers.html _loadDeliveryCal S.dealerId→ls('drivers') 캐시 phone/companyCode 사용, dDeliveryCal()에 _loadDeliveryCal 호출 추가 — PR #143 |
| 2026-09-21 | DONWAY 계약서 대리점·기사 동일 계약서 공유 — "서명완료본 보기" 링크를 archiveUrl(구 Firebase Storage HTML) → /contract/download/{signToken}?inline=1 으로 변경, 기사가 보는 것과 동일한 페이지 제공 |
| 2026-09-21 | DONWAY 계약서 빈칸 auto-fill 키워드 보강 — '종사자' 추가(택배종사자인___ 패턴), '계약기간'→시작일, '부터'→종료일, end-date entry 먼저 체크 (계약기간 2-blank 구조 정확 대응) |
| 2026-09-21 | DONWAY 계약서 DOCX 빈칸 채우기 키워드 매핑 정밀도 강화 — '자동차' 키워드 제거(분류수수료 오삽입 버그), '차량내역' 추가, licenseNumber 폴백, '자격증'→'자격증번호' 변경 |
| 2026-09-21 | DONWAY 계약서 전화번호→기사 자동조회 — ctr-driver-phone-input oninput 시 Firestore drivers 조회 → window._ctrDriver 세팅 → 차량번호·종사자격 auto-fill (하이픈 포함/미포함 두 포맷 지원) |
| 2026-09-21 | DONWAY 대리점계약서 아카이브 빈칸 수정 — _ctrApplyTyped 계약기간 자동계산(오늘/1년후 한국어포맷), _ctrCollect startDate/endDate/carNum/licNum 하드코딩 '' 제거, dead code(비존재 DOM setTimeout) 제거 |
| 2026-09-21 | DONWAY 계약서 DOCX 빈칸 채우기 키워드 매핑으로 전환 — _ctrApplyTyped 순서 기반→컨텍스트 키워드 기반 (수수료% 빈칸에 이름/전화번호 오삽입 버그 수정) |
| 2026-09-21 | DONWAY 주민번호·사업자번호 검증 로직 강화 — replace(/-/g,'') → replace(/[^0-9]/g,'') (모바일 전각 하이픈 U+FF0D 등 처리) |
| 2026-09-21 | DONWAY 카카오 로그인 후 동의 체크박스 초기화 버그 수정 — kakaoLogin() _allAgreed() 선검증 + sessionStorage 동의 상태 보존 (_worker.js lines 1668-1682) |
| 2026-09-21 | DONWAY 계약서 서명 페이지 SyntaxError 수정 — signPage 백틱 템플릿 내 \n → \\n (rendered line 169:27, _worker.js lines 1661/1695/1698) |
| 2026-09-21 | 동의 체크박스 모바일 탭 안 되는 버그 수정 (onclick 이중토글 → onchange 통일) + ③ 계약 주요 내용 폼 제거 (DOCX 직접 타이핑 방식 유지) |
| 2026-09-20 | DONWAY 기사 주민등록번호 계약서 미표시 버그 수정 (_worker.js 서명 POST Firestore PATCH 응답 검증 추가) |
| 2026-09-20 | DONWAY 계약서 주요내용 입력 필드 추가 (_ctrRenderWrite + _ctrCollect 수정) — 타이핑 내용 아카이브 반영 버그 수정, 기사 주민번호 부분 입력 차단 |
| 2026-09-20 | mbtico.kr Worker 분리 (mbtico-worker.js + wrangler.mbtico.toml) — PR #128 |
| 2026-09-20 | filo.ai.kr / dine.ne.kr Worker 분리 (filo-worker.js, dine-worker.js) |
| 2026-09-20 | DONWAY 계약서 타이핑 방식 전환 + 탭 단일화 + 아카이브 버그 수정 |
| 2026-09-20 | SCAN dine.ne.kr 단일 운영 전환 |
| 2026-09-18 | 팝빌 역발행 자동등록 플로우 코드 구현 (키 발급 대기) |
| 2026-09-18 | DONWAY 카카오톡 인쇄 버튼 수정 (_dlPrint) |
| 2026-09-15 | DONWAY 카카오 소셜 로그인/가입 |
| 2026-09-14 | DONWAY 계약서 시스템 전면 구현 + 대시보드 정리 |
| 2026-09-10 | ThreeUI constellation 파티클 효과 5개 랜딩 페이지 적용 |
| 2026-09-09 | 전 제품 소셜미디어 영상 1분으로 확장 |

---

## 📝 세션별 작업 이력

### 2026-09-20
- mbtico.kr Worker 분리 완료 (PR #128 수동 머지)
- CLAUDE.md 메모 업데이트 (PR #129 수동 머지)
- TASKS.md 신규 생성 — 앱별 배포방식·기능 정리
- 배송앱 도메인 주석 수정 (PR #131 자동 머지): filo-worker.js·배송앱_변경내역.md mbtico.kr → filo.ai.kr

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
