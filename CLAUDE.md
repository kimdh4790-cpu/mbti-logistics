# MBTICO - CLAUDE.md
> 유한회사 엠비티아이 SaaS 모노레포. 세션 시작 시 반드시 이 파일 전체를 읽고 시작할 것.

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
Oracle Cloud IP:     155.248.187.99 (4코어/24GB, opc 계정)

---

## 📱 앱별 구조 & 담당 파일 (세션 시작 시 담당 앱 확인 필수)

### 🟣 FILO (filo.ai.kr) — 매장 관리 SaaS
> 담당 메모: FILO_DINE_MEMO.md 필독
- **진입**: filo.html / filo-auth.js (로그인·홈 대시보드·라우팅)
- **공통**: filo-common.js ← 절대 직접 수정 금지. 읽기만 허용
- **POS**: filo-pos.js, filo-pos-core.js, filo-pos-ui.js
- **주문**: filo-order.js, filo-order-common.js
- **테이블**: filo-table.js
- **메뉴**: filo-menu.js (55KB), filo-menu-mgmt.js, filo-menu-recipe.js
- **예약/웨이팅**: filo-booking.js
- **직원/QR출퇴근**: filo-staff.js, filo-qr.js
- **급여**: filo-payroll2.js
- **회원**: filo-members.js
- **재고**: filo-inventory.js
- **마진분석**: filo-margin.js
- **결제**: filo-payment.js
- **스케줄**: filo-schedule.js
- **설정**: filo-settings.js
- **리포트**: filo-report.js
- **랜딩**: filo-landing.html, filo-landing.js

**FILO 절대 금지**
- filo-common.js 수정 금지
- Firestore filo_orders 컬렉션 필드명 변경 금지 (tableNum·status·date·dealerId·items)
- tableNum 타입 혼재(String·int) 상태 유지 — 변경 시 전체 주문 조회 깨짐
- _filoToast() 대신 alert() 사용 금지

---

### 🟢 DINE (dine.ne.kr) — 직원 전용 앱
> 담당 메모: FILO_DINE_MEMO.md 필독
- **진입**: dine.html / dine.js
- **스케줄**: dine-schedule.js
- **분석**: dine-analytics.js
- **직원**: dine-staff.js ← FILO의 members 컬렉션 공유 사용
- **급여**: dine-payroll.js
- **매출**: dine-sales.js
- **세금**: dine-tax.js
- **회원·예약**: dine-member.js ← filo_bookings, filo_customers 공유
- **랜딩**: dine-landing.html, dine-landing.js

**DINE 절대 금지**
- DINE용 별도 직원 컬렉션 생성 금지 (FILO members 컬렉션 그대로 공유)
- FILO·DINE 공유 컬렉션: members, attendance, filo_bookings, filo_customers, filo_sales
- _dineToast() 대신 alert() 사용 금지

---

### 🟡 QR 주문·주방 (filo.ai.kr/order·/store·/kitchen)
- order.html, order.js, order-done.html — 고객 QR 주문
- table-order.html — 테이블 직접 주문 (선결제/후불 모달 미완료)
- store.html — 매장 주문 현황
- kitchen.html — 주방 디스플레이
- filo-order-common.js — 메뉴 로딩·번역 공통 (order·table-order·store 공유)

**QR 주문 절대 금지**
- filo_orders 컬렉션 구조 변경 금지
- filo-order-common.js의 _applyTranslationsToGrid() 로직 단독 수정 금지 (order·store 동시 영향)

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
- 현재 버그: 접속 시 DONWAY 랜딩으로 라우팅됨 (미수정)

---

### ⚪ MBTICO 관제센터 (mbtico.kr)
- mbtico-pages/ ← 별도 wrangler (cd mbtico-pages && npx wrangler deploy)
- mbtico-ctrl.js — 슈퍼어드민용 (채팅·공지·결제·매장 관리)

**MBTICO 절대 금지**
- mbtico-pages/_worker.js 대규모 수정 금지 (515KB — 리팩토링은 박람회 이후)
- 슈퍼어드민 UID·dealerId 변경 금지

---

### ⚫ 공유 Worker (_worker.js) — 전체 앱 API 라우터
- filo.ai.kr·dine.ne.kr·donway.ai.kr·mbtico.kr·yongcha.app 모두 이 파일 거침
- KV(DONWAY_ASSETS)에서 HTML·JS 파일 서빙
- Firestore SA 키로 서버사이드 Firestore 직접 접근

**_worker.js 절대 금지**
- `}{status:400` 치환 패턴 수정 금지 (Worker 빌드 깨짐)
- wrangler.toml [vars] 수정 금지
- Cloudflare Secrets는 대시보드에서만 관리

---

## 🚫 전체 공통 절대 수정 금지
- wrangler.toml 및 [vars] 섹션
- _worker.js 내 }{status:400 치환 패턴
- Cloudflare KV NS_ID (7f0e90efaea64f3ab08ff00f8970b28b)
- Firebase mbti-logistics 프로젝트 설정
- GitHub Actions secrets (CF_GLOBAL_KEY)
- 슈퍼어드민 UID·dealerId
- deploy.yml 수정 금지 (GitHub App 권한 없음 → auto-merge 실패)
- filo-common.js 직접 수정 금지
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
- alert() 금지  _filoToast()/_dineToast() 사용
- 클라우드 원격 환경: 코드 수정+배포 가능. Playwright 테스트/wrangler login은 로컬에서만
- Playwright 테스트  반드시 로컬에서 실행
- 배포 확인 필수: push 후 GitHub Actions 워크플로우 완료(success) 확인 → KV 업로드 + Worker 배포 + 캐시 퍼지 3단계 모두 success 여야 배포 완료
- deploy.yml 수정 금지: GitHub App이 워크플로우 파일 수정 권한 없어서 auto-merge 실패 발생함

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

## ✅ 완료 작업 (2026-08-25)

### DONWAY 구독 요금제 단일화
- donway-pages/index.html: 개인(4,000원)/단체(3,000원) 구분 제거 → 2,500원/인 단일 요금
- 구간 개편: 50/100/200/300/400/500/1000명 (700/1500/2000명 제거, 400명 추가)
- DW_TIERS_IND, DW_TIERS_GRP 모두 2,500원/인 기준으로 통일
- settle-tier-select 옵션 가격 표기 수정 (구 20만/40만… → 12.5만/25만…)
- _showSubModal 구간 버튼 배열 수정 (150→100 버그 수정 포함)
- _tierLabel 함수 및 toast 메시지 2000명+ → 1000명+ 수정
- 모달 내 "카드 등록 불필요" → "계좌이체 월 갱신" 변경

### DONWAY 랜딩 + Worker 요금 동기화
- donway_landing.html: 개인/단체 탭 제거, 가격 카드 2,500원/인 기준으로 수정 (125만/25만/125만/문의)
- donway_landing.html: "카드 등록 없이" 문구 3곳 → "7일 무료체험·계좌이체 월 갱신" 으로 변경
- _worker.js: /join 경로 _fixJoin 패치에서 구 가격 override 제거 → 새 가격으로 수정
- _worker.js: slug 경로 _fixPrices 패치에서 동일하게 새 가격으로 수정
- _worker.js: 개인/단체 svc-settle-card 텍스트 교체 로직 제거 (데드코드)

---

## ✅ 완료 작업 (2026-08-16)

### Firestore 읽기 최적화 (2만/일 → 8천~1만/일 목표, ~40% 절감)
- filo-auth.js: mbetco_sales·menu_costs·inventory 1회 로드 → onSnapshot 콜백 내 반복 get() 제거
- filo-auth.js: filo_sales 중복 onSnapshot 제거 (L851 → L749에 통합)
- filo-auth.js: inventory 배지 onSnapshot → get() 교체
- filo-pos.js: filo_orders onSnapshot 콜백 내 filo_tables.get() 캐시화 (_kioskTablesCache)
- filo-staff.js: attendance 2쿼리(in/out 별도) → 1쿼리(where type in ['in','out']) 통합
- filo-staff.js: members 5분 TTL 캐시 (_membersCache/_membersCacheAt) 전역 적용
- filo-order.js: filo_orders onSnapshot에 date 필터 추가 (JS 필터 → DB 필터)
- filo-margin.js: mbetco_sales 1회 로드 → filo_sales onSnapshot 콜백 내 반복 get() 제거
- filo-booking.js: 예약 확정/거절 시 불필요한 get() 제거 (bookingData 파라미터 추가)
- dine-payroll.js: companies 쿼리 제거 (_CU._company 재사용)
- _worker.js: 번역 KV 캐시 한국어 오염 검증 추가

### Firebase Blaze 플랜 전환 (사용자 직접 필요)
- Firebase 콘솔 → Spark → Blaze 업그레이드 (읽기 5만/일 초과 시 차단 방지)

---

## 🔴 미완료 작업 (박람회 D-4, 2026-08-20)

### 최우선
1. 선결제/후불 모달 - table-order.html 미작업
2. FCM 영수증 푸시 - order.js reqReceiptFCM undefined (KV캐시 문제)
3. 솔라피  알리고 교체 - _worker.js 알림톡 발송부 (완료)

### 중간
4. FILO 메뉴 이미지 Pollinations  Pexels 일괄 업데이트
5. 관제센터 채팅/공지/결제 탭 실사용 테스트
7. 직원 근태 QR 이름+연락처 등록 화면 수정
8. 매출분석 7월 테스트 데이터 시딩

### 박람회 이후
9. filo-menu.js 분리 (55KB)
10. filo-pos.js 분리 (39KB)
11. mbtico-pages/_worker.js 경량화 (515KB)
12. emergency.html 재작성 (461KB)
13. 용차앱 저작권 등록
14. 벤처 인증 (기보 부산지점)

---

## 💳 알림톡 템플릿 ID
정산명세서: KA01TP260618101225825DuJHXpoC4kY
재고발주:   KA01TP260623201607025LtxVxj2AoHI
급여명세서: KA01TP260623201919874SBFmHTNdNft
채널ID:     KA01PF260618094439788FzuY2GxDiSW

---

## 📋 세션 시작 체크리스트
1. CLAUDE.md 전체 읽기 완료
2. 담당 앱 확인 → 해당 메모 파일 읽기
   - FILO·DINE 담당 → FILO_DINE_MEMO.md
3. git pull origin main
4. 미완료 작업 목록 확인
5. 작업 전 대상 파일 절대 금지 항목 재확인

## 📝 메모 업데이트 규칙
- FILO·DINE 파일 수정 시 → FILO_DINE_MEMO.md 수정 이력에 날짜·파일·내용 추가
- 새 캐시 변수 추가 시 → 전역 캐시 변수 섹션 업데이트
- 새 버그 발견 시 → 알려진 버그 섹션에 등록
- 컬렉션 구조 변경 시 → Firestore 컬렉션 구조 섹션 업데이트

---

## 🧪 테스트 계정 (실사테스트용)
관리자: soungkyekim@naver.com / khw3103!!!
딜러ID: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
테스트 매장: filo.ai.kr/store/mbti

### 실사테스트 시 등록할 데이터
직원: 홍길동 / 010-1234-5678 / 시급 10000원
회원: 김테스트 / 010-9999-1111 / 포인트 1000
테이블: 1번~5번
메뉴: 없으면 테스트메뉴 5000원 등록


---

## 🚨 절대 금지 — API 키/OAuth 요청 금지
- YouTube API 키 요청 금지
- OAuth JSON 요청 금지
- Google Cloud 키 요청 금지
- 어떤 외부 API 키도 사용자에게 요청 금지

## 📹 유튜브 업로드 방법 (키 없이)
반드시 Playwright 브라우저 직접 로그인 방식 사용:
1. chromium.launchPersistentContext 또는 channel:chrome 사용
2. https://studio.youtube.com 접속
3. 기존 크롬 로그인 세션 그대로 사용
4. 파일 업로드 → 제목 입력 → 게시
키, OAuth, API 절대 요청 금지. 브라우저 로그인으로만 진행.

## 📹 영상 제작 방법 (키 없이)
1. Playwright로 FILO 앱 화면 직접 녹화
2. FFmpeg으로 자막+BGM 합성
3. Kling AI는 Playwright 자동화 차단됨 — 사용 금지
4. 외부 AI 영상 API 키 요청 금지

---

## 🚨 PR 생성 절대 금지
- 작업 완료 후 PR 생성하지 말 것
- 바로 git push → 머지까지 자동으로
- PR 생성 버튼 누르지 말 것
- 승인 요청 없이 끝까지 자동 진행
- 중간에 멈추지 말 것

---

## ☁️ Oracle Cloud 로그인
이메일: kimdh4790@gmail.com
비밀번호: khw3103!!
인스턴스: instance-20260802-1554
IP: 155.248.187.99
리전: Tokyo AD-1
스펙: A1.Flex 4코어/24GB Always Free
SSH 키: ssh-key-2026-08-02
