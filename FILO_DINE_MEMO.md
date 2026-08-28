# FILO·DINE 전담 메모
> 이 파일은 FILO·DINE 담당 세션이 수정·추가 시 반드시 같이 업데이트한다.
> 세션 시작 시 CLAUDE.md → 이 파일 순서로 읽을 것.

---

## 🗂 파일 역할 한눈에 보기

| 파일 | 역할 | 크기 | 비고 |
|---|---|---|---|
| filo-auth.js | 로그인·홈 대시보드·페이지 라우팅·리스너 등록 | 중 | 홈 onSnapshot 6개 관리 |
| filo-common.js | 공통 유틸(toast·icon·날짜·fetch) | 중 | **수정 금지** |
| filo-pos.js | 키오스크 POS·테이블바·결제 | 39KB | 분리 예정 |
| filo-pos-core.js | POS 결제 핵심 로직 | 소 | |
| filo-pos-ui.js | POS UI 렌더링 | 소 | |
| filo-menu.js | 메뉴 관리·레시피·원가·번역·이미지 | 55KB | 분리 예정 |
| filo-menu-mgmt.js | 메뉴 CRUD UI | 소 | |
| filo-menu-recipe.js | 레시피 관리 | 소 | |
| filo-order.js | 홀 주문 현황·배달 주문 | 중 | |
| filo-order-common.js | QR주문·store·kitchen 공통 메뉴 로딩·번역 | 중 | order·table-order·store 공유 |
| filo-table.js | 테이블 현황·직원 호출·예약 테이블 연동 | 중 | |
| filo-booking.js | 예약·웨이팅 | 중 | |
| filo-staff.js | 직원 QR출퇴근·출퇴근 대시보드·실시간 급여 티커 | 중 | |
| filo-members.js | 회원 관리·포인트 | 소 | |
| filo-inventory.js | 재고 관리·입출고·자동발주 | 중 | |
| filo-margin.js | 마진·원가 분석 대시보드 | 중 | |
| filo-payroll2.js | 급여 계산·명세서 발송 | 중 | |
| filo-payment.js | 결제 내역 | 소 | |
| filo-schedule.js | 스케줄 관리 | 소 | |
| filo-settings.js | 매장 설정·테마·세무사 연동 | 소 | |
| filo-report.js | 매출 리포트 | 소 | |
| filo-qr.js | QR 출퇴근 직원 선택 화면 | 소 | |
| filo-staff.js | 직원 QR 생성·수동 체크인 | 중 | |
| dine.js | DINE 메인 라우팅·홈 | 중 | |
| dine-schedule.js | 스케줄 등록·수정·FCM | 소 | |
| dine-analytics.js | 매출·근태 분석 | 중 | |
| dine-staff.js | 직원 관리 (FILO members 공유) | 소 | API 경유 (/api/get-members) |
| dine-payroll.js | 급여 계산 (DINE용) | 소 | |
| dine-sales.js | 날짜별 매출 조회 | 소 | |
| dine-tax.js | 세금 계산 | 소 | |
| dine-member.js | 회원·예약 (DINE용) | 중 | filo_customers·filo_bookings 공유 |

---

## 🗄 Firestore 컬렉션 구조

| 컬렉션 | 용도 | 공유 앱 | 주의 |
|---|---|---|---|
| companies | 매장 정보·설정·테마 | FILO·DINE | uid == dealerId |
| members | 직원 정보·시급·FCM토큰 | FILO·DINE | **별도 컬렉션 생성 금지** |
| attendance | 출퇴근 기록 | FILO·DINE | type: 'in'/'out'/'break_start'/'break_end' |
| filo_menus | 메뉴 목록·번역·이미지 | FILO·QR주문 | nameTranslations 필드에 번역 저장 |
| filo_orders | QR 주문 (고객→주방) | FILO·QR·주방 | tableNum이 String·int 혼재 (의도적) |
| filo_sales | POS 매출 기록 | FILO·DINE·마진 | status: 'completed'/'cancel'/'cancelled' |
| filo_tables | 테이블 목록·상태 | FILO | status: 'empty'/'occupied' |
| filo_bookings | 예약 | FILO·DINE | status: 'pending'/'confirmed'/'rejected' |
| filo_payments | 결제 기록 | FILO | |
| filo_customers | 회원 | FILO·DINE | |
| inventory | 재고 | FILO | stock/qty 필드 혼재 (legacy) |
| inventory_in | 입고 이력 | FILO | |
| inventory_out | 출고 이력 | FILO | |
| menu_costs | 메뉴 원가 | FILO·마진 | |
| menu_recipes | 레시피 | FILO | |
| mbetco_sales | 수동 매출 입력 | FILO·마진 | |
| payroll_records | 급여 지급 기록 | FILO·DINE | |
| dine_waiting | 웨이팅 | FILO | status: 'waiting'/'called'/'seated'/'cancelled' |
| dine_schedules | 스케줄 | DINE | |
| staff_calls | 직원 호출 | FILO·QR주문 | status: 'pending'/'done' |
| settings | 세무사 설정 등 | FILO | key: did+'_tax' |
| notices | 공지사항 | FILO | |

---

## 🔌 전역 캐시 변수 (filo-staff.js)

```
_membersCache     — members 컬렉션 캐시 객체 {id: data, name: data}
_membersCacheAt   — 캐시 생성 timestamp (ms). 5분(300000ms) TTL
```
→ filo-staff.js의 모든 members 조회 시 캐시 우선 사용. 만료 시 Firestore 재조회 후 갱신.

## 🔌 전역 캐시 변수 (filo-pos.js)

```
_kioskTablesCache — filo_tables 스냅샷. filo_orders onSnapshot 콜백에서 재사용
_kioskTablePage   — 테이블 바 현재 페이지 (5개씩)
_kioskMenus       — filo_menus 캐시 (POS 탭 진입 시 1회 로드)
```

---

## 🔴 FILO·DINE 전용 절대 금지

1. **filo-common.js 수정 금지** — 모든 페이지에 공유. 수정 시 전체 앱 영향
2. **filo_orders.tableNum 타입 통일 금지** — String·int 혼재 상태 유지. 변경 시 filo-table.js·filo-pos.js 전체 쿼리 수정 필요
3. **filo_sales.status 값 임의 추가 금지** — 'cancel'·'cancelled' 두 값 모두 처리 로직이 곳곳에 있음
4. **members 컬렉션 = DINE staff** — DINE 전용 별도 컬렉션 생성 금지
5. **onSnapshot 무분별 추가 금지** — Firestore 읽기 한도(5만/일) 고려. 정적 데이터는 get() 사용
6. **alert() 사용 금지** — _filoToast() (FILO) / _dineToast() (DINE) 사용
7. **이모지 사용 금지** — Lucide SVG 아이콘 사용 (_svgIcon())
8. **filo-order-common.js 단독 수정 시 order·table-order·store·kitchen 전부 영향** — 반드시 전체 흐름 확인 후 수정

---

## ⚠️ 알려진 버그·한계

| 항목 | 내용 | 상태 |
|---|---|---|
| tableNum String/int 혼재 | filo_orders 저장 시 tableNum이 문자열·숫자 둘 다 존재 → 쿼리 2번 필요 | 의도적 유지 (변경 시 전체 수정) |
| inventory stock/qty 필드 | legacy qty 필드와 신규 stock 필드 혼재 | 유지 (신규는 stock 사용) |
| filo_sales status 두 값 | 'cancel'과 'cancelled' 모두 사용 중 | 유지 (필터링 시 둘 다 체크) |
| FCM 영수증 푸시 | order.js reqReceiptFCM undefined — KV 캐시 문제 | 미수정 |
| 번역 KV 오염 캐시 | 과거 버그로 한국어가 KV에 캐시됨 → _worker.js에서 한글 검증 추가로 우회 | 해결(2026-08-16) |
| table-order.html 선결제/후불 모달 | 미구현 | 최우선 미완료 |

---

## 🌐 번역 시스템 구조

```
고객 언어 선택 (EN/中/日)
  ↓
filo-order-common.js _applyTranslationsToGrid()
  ↓ 병렬 요청 (AbortController 5s timeout)
_worker.js /api/translate
  ↓ 1) KV 캐시 확인 (7일 TTL) — 한국어 오염 캐시 건너뜀
  ↓ 2) Google 무료 API
  ↓ 3) Anthropic API (8s timeout)
  ↓ 4) Google 공식 API
  ↓ 결과 KV 저장 (tr:{lang}:{hash} 키)
  ↓
Firestore filo_menus.nameTranslations 저장 (성공 번역만)
```

**번역 실패 시**: 한국어 원본 표시 (번역 저장 안 함)

---

## 🏗 홈 대시보드 리스너 구조 (filo-auth.js _filoWatchHome)

```
[1회 로드 — Promise.all]
  mbetco_sales(오늘) → _mbToday[]
  mbetco_sales(이번달) → _mbMonth[]
  menu_costs → _costMap{}
  inventory → 재고부족 배지(hs-2) 즉시 표시

[onSnapshot — 실시간]
  ① filo_sales(오늘) → 오늘 매출(hs-0)·순이익·마진율·DINE매출카드
  ② filo_sales(이번달) → 월매출(hs-month)
  ③ filo_orders(오늘) → 미완료 주문 배지(hs-1)
  ④ [제거됨] inventory onSnapshot → get()으로 교체
  ⑤ attendance(오늘) → 출근인원(hs-3)·DINE출퇴근카드
  ⑥ filo_bookings(오늘·pending) → 예약 배지
  ⑦ [제거됨] filo_sales 중복 onSnapshot → ①에 통합
```

---

## 📋 수정 이력

### 2026-08-28
**보안·코드 품질·Firestore 효율성 전면 점검**
- `dine.js`: 로그인 `.catch()` 2곳 — 네트워크 오류 시 owner 자동 승격 버그 수정 → 에러 메시지 표시로 교체
- `filo-staff.js`: `_attendUnsub` → `_staffAttendUnsub` 이름변경 (filo-members.js 전역 충돌 방지), `_liveTickerTimer` 중복 선언(L363) 제거, `var _staffAttendUnsub=null` 명시적 선언 추가
- `filo-pos.js`: 테이블 주문 onSnapshot에 `.where('date','==',_posToday)` 추가 (전체 이력 구독 → 오늘 주문만, ~25% 읽기 절감)
- `filo-auth.js`: `_FILO_WATCHERS`에 `kiosk` 페이지 (`_kioskTableUnsub`) 추가; 로그아웃 시 `_filoDineResUnsub` 정리 추가 (재로그인 이중 구독 방지)
- `dine-analytics.js`: `_dineLoadMyPayroll` 좀비 쿼리 수정 (`staff`→`members`, `staffId`→`memberId`)
- `_worker.js`: 보안 수정 6건 — verifyFirebaseToken 폴백 null 반환, /admin/cleanup-dup-orders requireAdmin 추가, /api/filo-order·/api/point-earn·/order/move-table dealerId 검증, /kitchen/update 인증 추가, /api/inquiry HTML 이스케이프, /toss-confirm uid 검증, /api/emergency-driver-profile·/api/delivery-dispatch 인증 추가
- `_worker.js`: DW_TIERS 구요금 → 2,500원/인 단일 요금으로 동기화

### 2026-08-16 (3차)
**보안 취약점 수정 (XSS·미인증 API 엔드포인트)**
- `dine-member.js`: `_de()` XSS 이스케이프 헬퍼 추가. 회원 목록 `d.name`·`d.phone`, 수정 모달 `existing.name`·`existing.phone`·`existing.birth`·`existing.memo` value="" 속성 전체 적용
- `filo-booking.js`: 웨이팅 카드 `w.name`·`w.phone`·`w.seats` → `esc()` 적용
- `filo-staff.js`: Claude AI 응답 `innerHTML` 할당 → `textContent`+`createElement('br')` 방식으로 XSS 차단
- `dine-analytics.js`: Claude AI 응답 `innerHTML` 할당 → `textContent`+`createElement('br')` 방식으로 XSS 차단
- `filo-inventory.js`: `it.name`·`it.supplier` innerHTML 삽입 → `esc()` 적용
- `filo-pos.js`: `table.name`·`it.name` innerHTML 삽입 → `esc()` 적용
- `filo-pos-ui.js`: `it.name` innerHTML 삽입 → `esc()` 적용
- `filo-members.js`: `d.phone`·`d.dept`·initials innerHTML 삽입 → `esc()` 적용
- `_worker.js`: `/api/waiting-update` (L2819) → `verifyFirebaseToken` 인증 추가
- `_worker.js`: `/fcm/notify-drivers` (L2853) → `verifyFirebaseToken` 인증 추가

**Firestore 리스너 누수·중복 수정**
- `filo-auth.js`: `_FILO_WATCHERS`에 `table_qr` 페이지의 `_tableOrderUnsub`, `waiting` 페이지 항목 추가
- `filo-table.js`: `_tableOrderUnsub` 전역 저장 + `where('date','==',today)` DB 필터 추가 → JS 클라이언트 필터 제거
- `filo-order.js`: 배달탭 사용 안 하는 `filo_orders` onSnapshot(u2) 제거 → `callUnsub` 연결
- `dine.js`: `_dineLoadDashboard` N+1 패턴 수정 — menu_costs·attendance·members를 `Promise.all`로 1회 로드 후 `filo_sales` onSnapshot 시작
- `dine.js`: `_dineWatchAttend` 60초 `setInterval` 폴링 제거 (onSnapshot이 실시간 담당)
- `dine-analytics.js`: `_av2SyncLive` → no-op (중복 리스너 방지, `_dineWatchFiloSales`가 이미 업데이트)

### 2026-08-16 (2차)
**로그인 화면 로고 base64 삽입**
- `filo.html` L1059: 그라디언트div+SVG → `<img src="data:image/png;base64,...">` (filo-icon-192.png, 48×48)
- `dine.html` L302 위: DINE 텍스트 로고 위에 `<img src="data:image/png;base64,...">` (dine-icon-192.png, 56×56) 추가
- `filo-landing.html` / `dine-landing.html`: 이미 base64 삽입 완료 (1차)
- PNG 파일이 KV에 업로드 안 돼 로고가 표시 안 됐던 문제 해결. deploy.yml은 텍스트 파일만 업로드 → PNG는 base64 인라인이 유일한 해결책.

### 2026-08-16
**Firestore 읽기 최적화 (~40% 절감)**
- `filo-auth.js`: mbetco_sales·menu_costs·inventory 1회 로드 → onSnapshot 콜백 내 반복 get() 제거
- `filo-auth.js`: filo_sales 중복 onSnapshot(L851) → L749 콜백에 통합, 제거
- `filo-auth.js`: inventory 배지 onSnapshot → get() 교체
- `filo-pos.js`: `_kioskTablesCache` 도입 — filo_orders onSnapshot 콜백 내 filo_tables 반복 get() 제거
- `filo-staff.js`: attendance 2쿼리(in/out 별도) → `where('type','in',['in','out'])` 1쿼리 통합
- `filo-staff.js`: `_membersCache` / `_membersCacheAt` (5분 TTL) 도입 — 전역 members 캐시
- `filo-order.js`: filo_orders onSnapshot에 `where('date','==',today)` 추가 → JS 필터 제거
- `filo-margin.js`: mbetco_sales 1회 로드 → filo_sales onSnapshot 콜백 내 반복 get() 제거
- `filo-booking.js`: `_filoBookingConfirm/Reject` bookingData 파라미터 추가 → 불필요 get() 제거
- `dine-payroll.js`: companies 쿼리 제거 → `_CU._company` 재사용

**번역 KV 캐시 한국어 오염 수정**
- `_worker.js`: /api/translate 및 /api/translate-batch — KV 캐시 반환 전 한글 정규식 검증 추가
- `filo-order-common.js`: Firestore nameTranslations 사용 전 한글 검증 추가
