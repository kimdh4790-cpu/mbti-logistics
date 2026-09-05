# MBTICO - CLAUDE.md
> 유한회사 엠비티아이 SaaS 모노레포. 세션 시작 시 반드시 이 파일 전체를 읽고 시작할 것.

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
| `FILO_DINE_MEMO.md` | FILO·DINE 앱 작업 시 |
| `YONGCHA_MEMO.md` | 용차앱 작업 시 |
| `배송앱_변경내역.md` | 배송앱·emergency.html 수정 시 |
| `STRATEGY_MEMO.md` | 전략·시장조사·경쟁사·Oracle 확장 계획 논의 시 |
| `RESEARCH_MEMO.md` | 정보수집 자동화 시스템 (인프런·ProductHunt·YouTube 트렌드 수집) 관련 작업 시 |

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
| `_worker.js` | **전체 5개 앱** (filo, dine, donway, yongcha, mbtico) |
| `filo-common.js` | FILO + DINE |
| `filo-order-common.js` | FILO (order·table-order·store·kitchen) |
| `filo-staff.js` | FILO + DINE (members·attendance 공유) |
| `filo-*.js`, `filo.html` | FILO만 |
| `dine-*.js`, `dine.html` | DINE만 |
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
Oracle Cloud IP:     161.33.136.154 (4코어/24GB, opc 계정, filo-a1-2c12g)

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
- table-order.html — 테이블 직접 주문 (선결제/후불 모달 완료)
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
- 라우트 yongcha.app/*: wrangler.yongcha.toml에서 관리 (2026-09-01 wrangler.toml에서 분리, PR #51)

---

### ⚪ MBTICO 관제센터 (mbtico.kr)
- mbtico-pages/ ← 별도 wrangler (cd mbtico-pages && npx wrangler deploy)
- mbtico-ctrl.js — 슈퍼어드민용 (채팅·공지·결제·매장 관리)

**MBTICO 절대 금지**
- mbtico-pages/_worker.js 대규모 수정 금지 (515KB — 분리 작업은 별도 세션에서 계획 수립 후 진행)
- 슈퍼어드민 UID·dealerId 변경 금지

---

### ⚫ 공유 Worker (_worker.js) — 전체 앱 API 라우터
- filo.ai.kr·dine.ne.kr·donway.ai.kr·mbtico.kr·yongcha.app 모두 이 파일 거침
- KV(DONWAY_ASSETS)에서 HTML·JS 파일 서빙
- Firestore SA 키로 서버사이드 Firestore 직접 접근

**_worker.js 절대 금지**
- `}{status:400` 치환 패턴 수정 금지 (Worker 빌드 깨짐)
- wrangler.toml [vars] 수정 금지
- Cloudflare Secrets는 대시보드 또는 `wrangler secret put` (OPC VM에서 CF_GLOBAL_KEY 사용)으로 관리

---

## 🚫 전체 공통 절대 수정 금지
- wrangler.toml 및 [vars] 섹션
- _worker.js 내 }{status:400 치환 패턴
- Cloudflare KV NS_ID (7f0e90efaea64f3ab08ff00f8970b28b)
- Firebase mbti-logistics 프로젝트 설정
- GitHub Actions secrets (CF_GLOBAL_KEY)
- 슈퍼어드민 UID·dealerId
- deploy.yml 수정 가능 (단, workflow 파일 변경 시 auto-merge 안 됨 → GitHub에서 수동 Merge 필요)
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

## 🔴 미완료 작업 (2026-08-28 현재 / BEXCO 박람회 완료)

### ✅ 완료 (2026-08-28)
- 솔라피 → 알리고 교체 (_worker.js 알림톡 발송부)
- verifyFirebaseToken JWT 서명 미검증 폴백 수정
- /admin/cleanup-dup-orders, /api/filo-order, /api/point-earn, /order/move-table, /kitchen/update, /api/inquiry, /toss-confirm, /api/emergency-driver-profile, /api/delivery-dispatch 보안 수정
- dine.js 로그인 오류 시 owner 자동 승격 버그 수정
- /qr/register, /qr/confirm dealerId → companies 유효성 검증 추가 (임의 매장 데이터 생성 방지)
- /toss/create-order verifyFirebaseToken 인증 추가 (비인증 결제 주문 생성 방지)
- filo-staff.js 전역변수 충돌(_attendUnsub) + _liveTickerTimer 중복 선언 수정
- filo-pos.js 테이블 onSnapshot date 필터 추가 (Firestore ~25% 절감)
- filo-auth.js kiosk 리스너 누수 + 로그아웃 cleanup 수정
- dine-analytics.js 좀비 쿼리(staff→members) 수정
- DW_TIERS 구요금 → 2,500원/인 단일 요금 동기화
- dine.js _dineSendNotif N+1 → Promise.all 변환
- filo-staff.js 60초 attendance.get() 폴링 → onSnapshot + 캐시 전환 (_tickerAttendSnap)
- dine.js _dineReleaseListeners() 추가 — 로그아웃 시 모든 DINE 리스너 일괄 해제
- filo-auth.js 로그아웃 시 _tickerAttendUnsub cleanup 추가
- filo.html deprecated filo-schedule.js 스크립트 태그 제거
- filo-auth.js _filoPageCostMgmt 래퍼 함수 추가 (cost_mgmt 라우터 오류 방지)
- filo-auth.js _FILO_WATCHERS delivery 항목 추가 (_deliveryUnsub 자동 해제)
- _worker.js 중복 /api/translate 핸들러 제거 (dead code)
- _worker.js 기사 PATCH for-await → Promise.all 병렬화
- _worker.js 데모 초기화 18개 직렬 쿼리 → Promise.all 병렬화
- _worker.js 메뉴 번역 N×3 직렬 → Promise.all 병렬화
- yongcha-worker.js _pgDispatchLocations onSnapshot unsub 저장 (리스너 누수 방지)

### ✅ 완료 (2026-08-29)
- table-order.html 선결제/후불 모달 구현 완료
- order.html order.js 버전 v=14 캐시버스터 업데이트 (reqReceiptFCM KV캐시 문제 해결)
- QR 출퇴근 신규 직원 등록 화면에 시급 입력 필드 추가 (_worker.js /qr, /qr/register 양쪽)
- FILO 메뉴 이미지 Pollinations → Pexels 일괄 업데이트 버튼 추가 (filo-menu.js + filo-menu-mgmt.js)
- 번역 일괄생성 버튼 메뉴관리 헤더에 노출 (filo-menu-mgmt.js)
- 매출분석 7월 테스트 데이터 시딩 완료 (336건, GitHub Actions seed-sales.yml)
- filo-settings.js 매출 테스트 데이터 카드 추가 (브라우저에서도 생성 가능)
- filo-menu.js 분리 완료: filo-menu-image.js(이미지·번역) + filo-menu-templates.js(템플릿+시딩) + filo-menu.js(원가·재고·코어만, ~55KB→~7KB)
- filo-pos-ui.js 분리 완료: filo-pos-ui.js(키오스크 렌더링·모드, ~15KB) + filo-pos-pay.js(결제·영수증·고객화면, ~28KB) (44KB→2파일)

### ✅ 완료 (2026-08-29 자동 오류 탐지 시스템 구축)
- _worker.js: 메인 fetch 핸들러 전체 try-catch 래퍼 추가 → 런타임 오류 Firestore(filo_errors) 자동 기록
- _worker.js: /api/errors GET 엔드포인트 추가 (슈퍼어드민 전용, filo_errors 최근 50건 조회)
- Claude Code Remote Routine 생성: 매주 월요일 09:00 KST 코드 스캔+자동 수정+push
  - Routine ID: trig_017v7VeuyqrwpjM3UKt2dGVj
  - 스캔 패턴: alert()→toast, null가드 누락, Promise→string 대입, 함수 인수 불일치 등
  - 완료 시 push notifications 발송

### ✅ 완료 (2026-08-29 버그 스캔+수정)
- alert()/toast 교체: filo-auth.js, filo-qr.js 4곳
- _worker.js KV allowlist: filo-pos-pay.js, filo-menu-image.js, filo-menu-templates.js 추가 (404 수정)
- filo-pos-ui.js: _filoRenderKioskSimple 구현 (심플 모드 실제 작동), _kioskTablesCache 캐시 추가
- filo-pos-pay.js: 죽은 코드 _ordersUnsub 제거
- filo-menu-mgmt.js:486: _filoLoadMenuMgmt 인수 오류 수정 (HTMLElement→dealerId 잘못 전달)
- filo-menu-mgmt.js:373,458: _filoAutoImageUrl Promise를 imageUrl에 직접 대입하던 버그 수정 (저장 후 비동기 업데이트)
- filo-pos.js:417: _filoToast 불필요한 두 번째 인수 제거
- filo-pos-core.js:216: _origFilterKiosk 미사용 선언 제거 (로드 타임 undefined 캡처)
- filo-members.js:101: d.name null 가드 누락 수정 (→ (d.name||'?').slice(0,1))

### ✅ 완료 (2026-08-29 DINE 전면 개선)
- dine-tax.js: fixed['card-fee'] → fixed.cardFee 폴백 추가 (카드수수료 항상 0원 버그)
- dine-schedule.js: collection('staff') → collection('members') (직원 드롭다운 빈화면 버그)
- dine-payroll.js: _dineSendPayslip() 스텁 → payroll 조회 + FCM 발송 완전 구현
- dine-analytics.js: _dineCheckAbsents() 추가 — 로그인 09:30 이후 자동 결근 감지 + 사이드바 배지
- dine-member.js: _dineReviews() 페이지 전체 구현 (네이버·카카오 Place URL 등록, 리뷰 수동 기록, 리뷰 요청 SMS)
- dine.js: reviews 라우트 추가
- dine.html: 사이드바 리뷰 관리 nav 추가
- _worker.js: /api/send-sms-bulk 엔드포인트 추가 (DINE 리뷰 요청 일괄 SMS, Aligo 사용)
- filo-pos-ui.js: X 버튼 전체 삭제 → 개별 수량 수정 바텀시트(_cartRemoveSheet) 변경
- filo-pos-core.js: _cartRemoveSheet() 구현
- filo-auth.js: menu_mgmt → _filoLoadAndRun lazy-load 수정 (_filoPageMenuMgmt is not defined 해결)
- filo-menu-mgmt.js: 카드 배경 다크→흰색 변경 (background:#fff)

### ✅ 완료 (2026-08-29 Instagram Graph API 설정)
- **Instagram Graph API 연동 완전 완료**
  - Instagram 계정 @hyung.83 → Mbtico Facebook 페이지 연결
  - MBTICO Social 앱(ID: 1377132184613591) 권한 등록: instagram_basic, instagram_content_publish, pages_show_list
  - Instagram Account ID: 17841476542581165 / Facebook Page ID: 1254758224392727
  - 60일 장기 액세스 토큰 발급 (만료: 2026-10-28)
  - GitHub Secrets 등록 완료: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID
  - social-media.yml Workflow #25 실행 성공 (1분 14초) 확인
  - 만료 7일 전(2026-10-21) 갱신 알림 루틴 설정 (trig_01D7CfWvKuGuWBGjM9CxH649)
- SOCIAL_MEDIA_MEMO.md: 토큰 만료일·갱신 방법·앱 ID 수정 기록

### ✅ 완료 (2026-08-29 소셜미디어 자동화)
- **n8n v2.8.4 Oracle Cloud VM 영구 설치** (161.33.136.154:5678, admin/Mbtico2026!, crontab @reboot 자동시작, 라이선스 활성화)
- Oracle Cloud VCN Security List TCP 5678 Ingress Rule 추가 (n8n 외부 접속용)
- **자막 ASS 변환 방식 도입** — scripts/compose/srt-to-ass.js (PlayResY=1920, Fontsize=52, Alignment=2 하단, MarginV=120). compose-video.sh 자동 변환 적용. 자막이 화면 중앙 크게 표시되던 버그 수정
- **콘텐츠 A/B/C/D 로테이션 시스템** — scripts/content/variants/{yongcha,filo,donway}-variants.json + scripts/compose/generate-variant.js (주차 기반 자동 선택). social-media.yml에 Variant 선택 스텝 추가
  - 용차앱: 수수료제로/기사혜택/소장혜택/비교각도
  - FILO: POS통합/직원근태/AI매출예측/비용비교
  - DONWAY: 대량정산/알림톡/요금비교/세금계산서
- **DONWAY·용차앱 Remotion 코드 영상 추가** — DonwayPromo.jsx(5씬: 브랜드/엑셀정산/알림톡/요금/CTA), YongchaPromo.jsx(5씬: 수수료0/직접매칭/AI루트/요금/CTA). render-donway.js·render-yongcha.js 신규. social-media.yml Remotion 렌더 범위 FILO→FILO·DONWAY·용차앱 확장. 비용 0원, 완전 코드 기반 고품질 영상 자동 생성

### ✅ 완료 (2026-08-30)
- yongcha.html: 프로필 화면 로그아웃 버튼 위 부가통신사업자 법적 고지 문구 추가 ("플랫폼은 계약의 당사자가 아니며...")
- yongcha-landing.html: 히어로 서브카피 "연결합니다" → "정보를 실시간으로 제공합니다. 소장과 기사가 직접 거래합니다."로 변경 (이전 커밋 반영 확인)
- yongcha.html: AI매칭→AI추천, 직접선택, 맞춤추천 문구 (이전 커밋 반영 확인)
- CLAUDE.md 마케팅 메타 용차앱 핵심 메시지 "주선사업자 없는 직접 매칭" → "소장·기사 직접 거래 정보 서비스"로 수정
- _worker.js / yongcha-worker.js: YONGCHA_HTML 동기화 (AI 추천 문구 6곳 + 법적 고지) — yongcha.html 미반영분 보완
- filo-order.js / filo-pos-pay.js: null 가드 추가 (Firestore undefined 저장·영수증 "undefined" 표시 방지)
- INFRA_MEMO.md: Oracle Cloud wrangler deploy 명령어 추가 (CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL 조합)
- yongcha.html / _worker.js / yongcha-worker.js / yongcha-landing.html / yongcha-meta.json: 부가통신사업자 포지셔닝 전면 반영 — '배차'→'단건 요청/운행/연결', '배차완료'→'운행완료', AI 프롬프트 정비, 마케팅 메시지 '직접 매칭'→'직접 거래 정보 서비스', 해시태그 동기화

### ✅ 완료 (2026-09-01)
- yongcha-worker.js 자동배포 설정: wrangler.yongcha.toml 신규 생성 + deploy.yml에 "Deploy Yongcha Worker" 스텝 추가 (PR #50 머지)
- wrangler.toml에서 yongcha.app/* 라우트 제거 → wrangler.yongcha.toml로 이전 (PR #51 머지, DONWAY 라우팅 버그 해소)
- yongcha-worker.js 테스트 계정 삭제 범위 확장: @yongcha.app 이메일도 _yCleanTestAccounts()·_yTestOwnerIds() 대상에 포함

### ✅ 완료 (2026-08-31)
- filo-auth.js: `_buildFiloNav()` 그룹 재편 → 지금영업/메뉴재고/팀관리/AI분석/본사HQ(franchise_hq 전용)/설정
- filo-auth.js: 홈 대시보드 업종별 퀵액션 3버튼 (cafe/izakaya/fastfood/other 분기)
- filo-auth.js: `_filoPageBranchMonitor()` + `_filoPageMenuDeploy()` + `_filoHqDeploy()` 프랜차이즈 HQ 페이지 신규 구현
- filo-margin.js: `_filoPageAI()` AIVO 채팅 패널 추가 (매장데이터 컨텍스트, 퀵칩 4개)
- _worker.js: `/api/ai-chat` 엔드포인트 신규 (최근 7일 매출+재고 주입, claude-haiku-4-5)
- filo.html: 모바일 하단 탭바 추가 (홈/영업/메뉴/AIVO/설정, max-width:768px)
- filo-auth.js: `_filoGoPage()` 탭바 활성 동기화 + 본사HQ 3개 항목 추가 (가맹점관리/공지발송/QSC)
- filo-auth.js: `_filoPageBranchMgmt()` 가맹점 등록·관리·해제 신규 구현
- filo-auth.js: `_filoPageHqNotice()` 전가맹점 공지 일괄 발송 신규 구현 (hq_notices 컬렉션)
- filo-auth.js: `_filoPageQSC()` QSC 체크리스트 신규 구현 (hq_qsc 컬렉션, 9항목 5점 채점)

### ✅ 완료 (2026-09-03)
- DONWAY PWA 홈화면 설치 아이콘: manifest 경로 /icon-192.png → /donway-icon-192.png (신규 PNG)로 변경
- DINE PWA 홈화면 설치 아이콘: _PWA_ICONS + _DINE_ICON_192/_DINE_APPLE_ICON 신규 로고 base64로 교체
- 용차앱 음성 공고 등록 버그 수정: area·workShift 자동완성 (f.region 의존 제거)
- 용차앱 캠프·상차지 다중 등록: 업체별 여러 캠프(이름·택배사·주소·좌표) 저장 + 공고 폼 원탭 선택
- YouTube 패시브인컴 채널 전략 수립: scripts/youtube-ai/ 신규 (topics.json, generate-script.js, AITutorialTemplate.jsx, generate-and-upload.js, weekly-cron.sh)
  - 채널: "AI 자동화 연구소" — n8n·Claude API·소상공인 자동화 한국어 튜토리얼
  - CPM 목표: 8,000~20,000원 (AI/기술 카테고리)
  - 첫 10편 주제 확정, Remotion 영상 템플릿 완성
  - Oracle Cloud cron 설정: 매주 수요일 09:00 KST 자동 생성+업로드 (weekly-cron.sh)
- 구독 결제 방식 메모 등록: 전 제품 계좌이체, 하나은행 270-910019-24204 (유)엠비티아이
- **계좌이체 안내 UI 전 제품 추가**: FILO 구독 페이지(filo-settings.js) · 용차앱 프로필(yongcha.html) 하나은행 계좌 안내 카드 추가
- YouTube AI 강의 주제 10편 → 20편으로 확장 (scripts/youtube-ai/topics.json)

### ✅ 완료 (2026-09-04)
- **인프런 클립 게시 완료**: n8n 카카오 알림톡 자동화 — ₩22,000, 9월 4일 게시
  - 포함 파일: 워크플로우 3종 + 설치가이드.pdf + 정산데이터_샘플.xlsx (v2 ZIP)
  - 태그: n8n, 카카오알림톡, 업무자동화, 구글시트, 소상공인
  - 정산: 사업자 등록, 하나은행 270-910019-24204, 팝빌 세금계산서 역발행
  - 정산일: 익월 10 영업일, B2C 90% 수익
- **인프런 클립 패키지 신규** (scripts/inflearn-clips/): n8n 카카오 알림톡 자동화 워크플로우 3종 + 설치 가이드 + 상품 설명
  - workflow-01-kakao-test.json: 첫 발송 테스트 (수동 트리거 → 성공/실패 분기)
  - workflow-02-sheet-to-kakao.json: 구글 시트 → 일괄 알림톡 발송 (1초 간격 Rate Limit 안전)
  - workflow-03-weekly-auto.json: 매주 월요일 09:00 완전 자동 정산 알림톡 + 관리자 완료 알림
  - README-setup.md: Oracle Cloud Docker 설치~첫 발송 단계별 가이드 + FAQ
  - product-description.md: 인프런 등록용 상품 소개 · 가격 책정 · 등록 체크리스트
- **FILO 설정 화면 네이버 플레이스 플러스 안내 카드 추가** (filo-settings.js `_filoPageSubscription()`): "FILO 연동 준비 중, 승인 시 즉시 알림" — 파트너 승인 완료 후 바로 활성화 가능한 선제 UI

### ✅ 완료 (2026-09-04 인프런 클립 2~6 제작 및 등록)
- **인프런 클립 1~6 전체 등록 완료** (2026-09-04)
- **인프런 클립 5종 전체 제작 완료** — 이미 등록된 클립1(n8n 카카오 알림톡, ₩22,000)에 추가
- **클립2: 소상공인 급여명세서 자동계산 (₩19,000)**
  - 구성: 급여계산_템플릿.xlsx (4시트: 설정/급여계산/간이세액표/명세서출력) + payroll-guide.pdf
  - 주요 내용: 2026년 4대보험 요율, 간이세액표 VLOOKUP, 지방소득세, 실수령액 자동계산
  - 썸네일: payroll-thumbnail.png (600×337px, 영문)
- **클립3: 소상공인 부가세 신고 자동계산 (₩25,000)**
  - 구성: 부가세신고_자동계산.xlsx (4시트: 설정/매출입력/매입입력/신고서) + vat-guide.pdf
  - 주요 내용: 신고기간 4회(1월/4월/7월/10월25일), 공제가능 매입세액 SUMIF, 납부세액 자동계산
  - 썸네일: vat-thumbnail.png (600×337px, 영문)
- **클립4: 소상공인 경비 장부 (₩15,000)**
  - 구성: 소상공인_경비장부.xlsx (4시트: 설정/경비입력/월별요약/연간집계) + expense-guide.pdf
  - 주요 내용: 부가세포함/별도 자동분리, 카테고리별 세금공제 기준, 월별집계 자동
  - 썸네일: expense-thumbnail.png (600×337px, 영문)
- **클립5: Oracle Cloud 무료 서버 완전 정복 (₩22,000)**
  - 구성: oracle-guide.pdf (9단계 완전 설치 가이드: 계정생성~crontab)
  - 주요 내용: ARM A1.Flex 4코어/24GB 영구무료, n8n Docker 설치, VCN 방화벽, SSH 접속
  - 썸네일: oracle-thumbnail.png (600×337px, 영문)
- **클립6: 소상공인 AI 프롬프트 100선 (₩29,000)**
  - 구성: ai-prompts-guide.pdf (8카테고리 100프롬프트: 마케팅/회계/직원관리/계약/고객응대/공지/사업계획/일상)
  - 주요 내용: [대괄호] 변수 치환 방식, 즉시 사용 가능한 실전 프롬프트 + 활용팁
  - 썸네일: ai-prompts-thumbnail.png (600×337px, 영문)
- **SOCIAL_MEDIA_MEMO.md**: @LJH_93 영상 관련 계정 등록 (2026-09-04)

### ✅ 완료 (2026-09-04 인프런 홍보 영상 자동화 파이프라인)
- **InflearnPromo.jsx 신규** — Remotion 4씬 홍보 영상 (SceneHook/SceneClips/SceneBest/SceneCTA, 30초, 1080×1920)
- **render-inflearn.js 신규** — Remotion 렌더 스크립트 (inflearn-promo.mp4 / inflearn-reels.mp4)
- **scripts/remotion/index.jsx** — InflearnPromo + InflearnReels 컴포지션 등록
- **scripts/content/inflearn-meta.json 신규** — YouTube/Instagram 메타데이터 (제목·설명·태그·캡션·해시태그)
- **social-media.yml** — inflearn product 옵션 추가, Remotion 렌더·YouTube/Instagram 업로드 지원
- **social-media-schedule.yml** — 수 09:00 KST 인프런 YouTube / 수 10:30 KST 인프런 Instagram 크론 추가
- **social-media-schedule.yml** — 토 09:00 KST mbtico → 인프런 YouTube로 변경 (mbtico 홍보 준비 안 됨)
- 인프런 자동 업로드 주 2회: 수요일(YouTube+Instagram) + 토요일(YouTube)
- **inflearn-narration.json 신규** — 5구간 나레이션 스크립트 (나레이션 없이 배포된 영상 재업로드 필요)

### ✅ 완료 (2026-09-05 인프런 6개 클립 변형 시스템)
- **inflearn-variants.json 신규** — A~F 6개 클립별 변형 (카카오알림톡/급여/부가세/경비/Oracle/AI프롬프트)
  - 각 변형: 클립 URL·나레이션 lines·slides·YouTube 제목·Instagram 캡션·해시태그
- **render-inflearn.js 업데이트** — 주차 기반 A-F 자동 선택 (weekIdx % 6), narration JSON 덮어쓰기, clipVariant → Remotion inputProps 전달, --variant 수동 지정 옵션
- **InflearnPromo.jsx 업데이트** — SceneClipSpotlight 신규 (클립별 집중 홍보 씬, CLIP_META 6종 색상/특징/검색어), clipVariant prop 있으면 SceneBest → SceneClipSpotlight 자동 교체
- **social-media-schedule.yml 업데이트** — 일 09:00/10:30 KST 인프런 슬롯 추가 (주 3회 → 4회: 수·토·일), 블로그 게시 스텝 추가
- **post-naver-blog.js 업데이트** — inflearn·dine productMap 추가

### ✅ 완료 (2026-09-04 정보수집 자동화 시스템 구축)
- **scripts/monitor/inflearn-monitor.js 신규** — 인프런 인기 클립 트렌드 HTTP 수집 (10개 키워드, 주 1회)
- **scripts/monitor/producthunt-monitor.js 신규** — Product Hunt SaaS/AI 신제품 수집 (5개 토픽, 주 1회)
- **scripts/monitor/research-digest.js 신규** — 인프런+ProductHunt+YouTube 결과 종합 → Claude Haiku 분류 → SMS 발송
- **.github/workflows/research-digest.yml 신규** — 매주 월 08:00 KST 자동 실행 GitHub Actions
- **RESEARCH_MEMO.md 신규** — 정보수집 시스템 전용 메모 (소스·분류기준·실행방법·출력파일)
- 분류: 강의소재 / 앱기능 / 수익성 → 패스 제외 후 SMS + Artifacts 저장
- CLAUDE.md 메모 체계 테이블에 RESEARCH_MEMO.md 항목 추가 필요

### ✅ 완료 (2026-09-04 관제센터 알림 + 버그 수정)
- **신규 가입 실시간 알림 (mbtico-pages/_worker.js + _worker.js)**:
  - Web Notification API 브라우저 팝업 (`_ctrlShowBrowserNotif`) + 빨간 배너 토스트 (`_ctrlAlertToast`)
  - join_requests / companies onSnapshot 실시간 감지 (초기 로드 중복 방지 플래그: `_joinNotifInit`, `_companyNotifInit`)
  - FCM 백그라운드 푸시: `/firebase-messaging-sw.js` 라우트 추가, Service Worker + VAPID 토큰 발급 → `admin_tokens/{uid}` 저장
  - 신청자 측 (`_worker.js`): Step 4 승인 대기 표시기 + `_watchApprovalStatus(uid)` onSnapshot + `_showApprovalPopup()` 🎊 팝업
- **관제센터 전체 코드 리뷰 후 버그 2건 수정 (mbtico-pages/_worker.js)**:
  - `_ctrlLoadChatList()`: forEach 내부 `var html` 재선언 → 채팅 목록 항상 빈화면 → `html +=` 수정 ✅
  - `_ctrlApprove()`/`_ctrlReject()`/`_ctrlHold()`: join_requests만 조회 → FILO/mbtico 가입 승인 무작동 → join_requests 없으면 companies 직접 처리 ✅

### 최우선
1. FCM 영수증 푸시 - 실 기기에서 동작 확인 필요

### 중간
2. 관제센터 채팅/공지/결제 탭 실사용 테스트

### 파일 분리·경량화 (대형 작업)
8. mbtico-pages/_worker.js 경량화 (515KB)
9. emergency.html 재작성 (461KB)

### 네이버 플레이스 플러스 POS 파트너십 (고가치 비즈니스 작업)
13. **네이버 POS 파트너 신청** — 스마트플레이스 플레이스 플러스 지원 POS 목록에 FILO 등록
    - 신청처: 네이버 B2B 파트너센터 (developers.naver.com 또는 smartplace.naver.com 파트너 문의)
    - 연동 시 FILO 고객사 네이버 순위 점수 직접 반영 → FILO 마케팅 효과 큼
    - 효과: 실매출 데이터 → 네이버 순위 점수 반영 / 연동 가게 전용 혜택 / 비연동 가게와 격차 확대
14. **플레이스 플러스 API 연동 코드 구현** (파트너 승인 후)
    - _worker.js에 /api/naver-place-sync 엔드포인트 추가
    - filo_sales/filo_orders → 일자별 매출합계·결제건수·결제방식 집계 후 네이버 API 전송
    - filo-settings.js에 네이버 플레이스 연동 설정 UI 추가 (매장별 네이버 place ID 입력)
15. **FILO 설정 화면 플레이스 플러스 안내 카드** — "FILO 연동 준비 중, 승인 시 즉시 알림" UI 선제 추가

### 법무·인증 (외부 절차)
11. 용차앱 저작권 등록 (cros.or.kr)
12. 벤처기업 인증 (기보 부산지점)

---

## 💳 결제 방식 (필독 — 절대 착각 금지)
- **FILO·DONWAY·용차앱 구독료는 전부 계좌이체**
- 카드 결제(토스 등) 연동 없음. 구현하지 말 것
- "결제 등록해줘" = 메모/안내 텍스트 등록이지 PG 연동이 아님

### 입금 계좌
- 은행: 하나은행
- 계좌번호: 270-910019-24204
- 예금주: (유)엠비티아이

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

## 📹 소셜미디어 업로드 방법 (API 우선)

### YouTube (Data API v3 — 권장)
- 방식: YouTube Data API v3 (무료, 10,000 유닛/일, 영상 업로드 1,600 유닛)
- n8n 또는 node.js에서 googleapis 라이브러리 사용
- API 키/OAuth 자격증명은 사용자가 Google Cloud Console에서 직접 발급·등록
- Claude는 API 키를 요청하지 않음. 단, 환경변수나 n8n 내에 등록된 키를 사용하는 코드는 작성 가능
- Fallback: API 설정 전까지 Playwright 브라우저 방식 사용 가능

### Instagram (Graph API — 권장)
- 방식: Meta/Instagram Graph API (Reels, 이미지 업로드)
- Facebook Business + Meta Developer 계정 필요
- Fallback: Playwright

### 네이버 블로그 (Playwright — 공식 API 없음)
- 네이버 블로그 공식 포스팅 API 없음 → Playwright만 가능
- `scripts/upload/post-naver-blog.js` 사용

### n8n 자동화 허브 (Oracle Cloud 161.33.136.154 설치 권장)
- YouTube API + Instagram API + Claude API + FFmpeg 워크플로우 통합
- 설치: `bash scripts/setup-n8n.sh`
- 포트: 5678 (Oracle Cloud 방화벽 오픈 필요)

## 📹 영상 제작 방법
1. Playwright로 앱 화면 직접 녹화 (scripts/capture/)
2. FFmpeg으로 자막+BGM 합성 (scripts/compose/)
3. 타입캐스트 API: AI 나레이션 생성 (사용자가 키 등록 시 활용 가능)
4. Kling AI: Playwright 자동화 차단됨 — 사용 금지

---

## 📋 PR 생성 기준
- **기본**: git push → auto-merge.yml → main 자동 머지 (PR 불필요)
- **PR 생성하는 경우** (유용할 때만):
  - 보안 수정·인증 로직 변경 등 검토가 필요한 큰 변경
  - 구조적 변경 (파일 분리·API 재설계 등)
  - 외부에 변경 이력을 남겨야 할 중요 기능 추가
- **PR 생성하지 않는 경우**: 일반 기능 추가·버그 수정·메모 업데이트 등 일상적 작업
- auto-merge 전에 PR이 열려 있으면 이미 머지돼 PR 생성 불가 (정상 동작)

---

## 🔍 시장조사 원칙 (필독)
- 시장조사 요청 시 최대한 많고 폭넓게 조사할 것
- 경쟁사는 직접 언급된 것 외에도 유사 카테고리 업체까지 능동적으로 탐색
- 조사 항목: 기능·가격·타겟·하드웨어유무·시장점유율·강점·약점·최근동향 필수 포함
- 노코/SaaS/전통POS/하드웨어 업체 모두 포함해서 전방위 조사
- 정부지원사업·보조금·규제 트렌드도 함께 조사
- 수치·데이터 기반으로 정리 (정성적 표현만으로 끝내지 말 것)
- 조사 후 반드시 FILO·DINE 차별화 포인트 도출까지 완료

---

## 📢 소셜미디어 홍보 메타 (scripts/content/*-meta.json)

> 수정 시 반드시 이 섹션도 업데이트할 것. 마케팅 메시지 기준.

### 핵심 마케팅 포인트 (2026-08-28 기준)
| 제품 | 핵심 메시지 | 요금 |
|---|---|---|
| FILO | 매장 운영(POS·주문·메뉴·재고) + 직원 근태·급여 통합 관리 · DINE 앱 포함 번들 | 요금 문의 |
| DINE | 직원 전용 앱 · 근태 QR·급여명세·매출분석 · FILO와 실시간 연동 | 요금 문의 |
| DONWAY | 배달대행·쿠팡 물류사 전용 드라이버 정산 SaaS · 엑셀 업로드 한 번에 수백 명 정산 완료 | ~50명 ₩125,000 / ~100명 ₩250,000 / ~500명 ₩1,250,000 / 1000명+ 문의 |
| 용차앱 | 소장·기사 직접 거래 정보 서비스 · AI 기사 추천 | 기사 ₩150,000/월 · 소장 ₩50,000/월 · DONWAY 구독 소장 무료 |

### 서버 기반 AI 기능 (홍보 포인트)
- **FILO**: AI 매출예측(7일)·메뉴추천(날씨/시간대/재고)·마진분석·스케줄최적화·리뷰답글·음성주문·다국어번역
- **용차앱**: AI 루트코치·스마트매칭·단가추천·날씨연동·주유소최저가·세금계산서 자동발행(팝빌)
- **DONWAY**: AI CS봇·카카오 알림톡 서버발송·FCM 푸시·팝빌 세금계산서 자동발행

### 소셜미디어 업로드 스케줄 (GitHub Actions social-media-schedule.yml, 2026-09-05 기준)
| 요일 | KST | 제품 | 플랫폼 |
|---|---|---|---|
| 일 | 09:00 | 인프런 | YouTube |
| 일 | 10:30 | 인프런 | Instagram |
| 월 | 09:00 | 용차앱 | YouTube |
| 화 | 09:00 | FILO | YouTube |
| 화 | 10:30 | FILO | Instagram |
| 수 | 09:00 | 인프런 | YouTube |
| 수 | 10:30 | 인프런 | Instagram |
| 목 | 09:00 | DONWAY | YouTube |
| 목 | 10:30 | DONWAY | Instagram |
| 금 | 09:00 | DINE | YouTube |
| 금 | 10:30 | DINE | Instagram |
| 토 | 09:00 | 인프런 | YouTube |

> mbtico는 홍보 준비 완료 전까지 스케줄 제외
> 인프런: 주 4회 (수·토·일 YouTube, 수·일 Instagram) — 6주 순환으로 클립별 집중 홍보

### 프로필 이미지 (회사 로고)
- 파일: `assets/logo.png`
- YouTube/Instagram 프로필에 로고 설정 필요 (Playwright upload 스크립트로 처리)
- upload-youtube.js / upload-instagram.js 에 `--set-profile` 옵션 추가 예정

---

## ☁️ Oracle Cloud 자동화 파이프라인

### 전체 흐름 (Oracle Cloud에서 모두 실행 가능)
```
녹화(Playwright) → 편집(ffmpeg-static) → 업로드(YouTube/Instagram/Naver)
```

### 최초 1회 초기 설정 (Oracle Cloud에서 실행)
```bash
# Oracle Cloud SSH 접속
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154

# 초기화 스크립트 실행 (Node.js·Chromium·npm·cron 전부 설정)
curl -fsSL https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/scripts/oracle-init.sh | bash
# 또는 repo 클론 후:
bash ~/mbti-logistics/scripts/oracle-init.sh
```

### 최초 1회 로그인 (Oracle Cloud 또는 로컬 → 복사)
```bash
# 방법 A: Oracle Cloud에서 직접 (X11 포워딩 필요)
HEADLESS=false CHROMIUM_PATH=$(which chromium) node scripts/upload/upload-youtube.js --login-only
HEADLESS=false CHROMIUM_PATH=$(which chromium) node scripts/upload/upload-instagram.js --login-only

# 방법 B: 로컬 PC에서 로그인 후 세션 복사 (권장)
# 로컬에서 로그인 완료 후:
scp -r ~/.mbtico-profiles/ opc@161.33.136.154:~/.mbtico-profiles/
```

### 영상 제작+업로드 실행
```bash
cd ~/mbti-logistics

# 특정 제품 전체 (녹화→편집→YouTube→Instagram)
node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube,instagram

# 전체 4개 제품
node scripts/run-pipeline.js --product all --steps record,compose

# 업로드만 (영상 이미 있을 때)
node scripts/run-pipeline.js --product filo --steps youtube,instagram
```

### GitHub Actions로 원격 실행 (ORACLE_SSH_KEY Secret 등록 필요)
```
GitHub → Settings → Secrets → ORACLE_SSH_KEY: SSH 개인키 내용 붙여넣기
Actions → 소셜미디어 홍보 영상 제작 → Run workflow
```

### Cron 자동 스케줄 (oracle-init.sh 실행 후 자동 설정)
| 시각(UTC) | KST | 제품 | 플랫폼 |
|---|---|---|---|
| 월 00:00 | 월 09:00 | 용차앱 | YouTube |
| 화 00:00 | 화 09:00 | FILO | YouTube |
| 화 01:00 | 화 10:00 | FILO | Instagram |
| 목 00:00 | 목 09:00 | DONWAY | YouTube |
| 목 01:00 | 목 10:00 | DONWAY | Instagram |

### 중요: 업로드 파일 이름 규칙
- 녹화: `output/<product>-raw.webm`
- 편집 후: `output/<product>-final.mp4` + `output/<product>-promo.mp4` (업로드용 동일 파일)
- Reels: `output/<product>-reels.mp4`
- 썸네일: `output/<product>-thumbnail.jpg`

---

## ☁️ Oracle Cloud 로그인
이메일: kimdh4790@gmail.com
비밀번호: khw3103!!
인스턴스: filo-a1-2c12g
IP: 161.33.136.154
리전: Tokyo AD-1
스펙: A1.Flex 4코어/24GB Always Free
SSH 키: ssh-key-2026-08-02
(구 인스턴스 instance-20260802-1554 / 155.248.187.99 — 삭제 여부 확인 필요)
