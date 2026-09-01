# FILO·DINE 전담 메모
> 이 파일은 FILO·DINE 담당 세션이 수정·추가 시 반드시 같이 업데이트한다.
> 세션 시작 시 CLAUDE.md → 이 파일 순서로 읽을 것.

---

## 🗂 파일 역할 한눈에 보기

| 파일 | 역할 | 크기 | 비고 |
|---|---|---|---|
| filo-auth.js | 로그인·홈 대시보드·페이지 라우팅·리스너 등록 | 중 | 홈 onSnapshot 6개 관리 |
| filo-common.js | 공통 유틸(toast·icon·날짜·fetch) | 중 | **수정 금지** |
| filo-pos.js | 키오스크 POS·테이블바·결제 | 중 | |
| filo-pos-core.js | POS 결제 핵심 로직 | 소 | |
| filo-pos-ui.js | POS 키오스크 렌더링·모드 전환 (분리 완료) | ~15KB | 2026-08-29 분리 |
| filo-pos-pay.js | 테이블 결제·각자계산·영수증·고객화면 | ~28KB | 2026-08-29 신규 |
| filo-menu.js | 원가·유통기한·재고이력·재고알림 (코어) | ~7KB | 분리 완료 |
| filo-menu-image.js | 이미지 자동생성·일괄갱신·번역 일괄생성 | 소 | 2026-08-29 신규 |
| filo-menu-templates.js | 업종별 기본메뉴 템플릿 데이터+시딩 함수 | 소 | 2026-08-29 신규 |
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
| FCM 영수증 푸시 | 실 기기 동작 확인 필요 (KV 캐시 문제는 v=14 캐시버스터로 해결) | 실기기 테스트 미완 |
| 번역 KV 오염 캐시 | 과거 버그로 한국어가 KV에 캐시됨 → _worker.js에서 한글 검증 추가로 우회 | 해결(2026-08-16) |
| table-order.html 선결제/후불 모달 | 구현 완료 (2026-08-29) | 완료 |
| /api/point-earn corsH ReferenceError | 핸들러 내 corsH 미정의 → 모든 포인트 적립 요청 ReferenceError | 해결(2026-08-30) |

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

### 2026-09-01 (25차)
**filo-landing.html 네이비+골드 전면 재작성**
- `filo-landing.html`:
  - 구 blue 테마(`#0891b2`) → 네이비(`#08101f`) + 골드(`#c9a84c`) 완전 전환
  - 슬라이드 방식(6 수평 슬라이드 + 화살표/도트) → 단일 스크롤 페이지
  - 이모지 전부 제거 → Lucide SVG 아이콘 (CLAUDE.md 기준 준수)
  - 히어로: 테이블링/티오더/POS 비용 비교 스트립 (14.8만원 → FILO 하나로)
  - 피처 벤토 그리드: QR주문·POS·급여·재고·AI·예약·회원 7개 카드
  - AI(AIVO) 섹션, DINE 직원앱 섹션, 전업종 섹션, CTA, Footer

### 2026-08-31 (24차)
**POS 좌측 사이드바 + 대시보드 벤토 그리드 + 색상 전면 정비**
- `filo-pos-ui.js`:
  - 카테고리 바: 상단 수평 필 → 고정 좌측 사이드바 (76px, 수직 버튼)
  - 카테고리 활성 스타일: 배경 하이라이트 gold
  - 메뉴 이름·가격: 하드코딩 → `var(--tx)`/`var(--br)` CSS 변수
  - 장바구니 합계: `#22c55e` → `var(--br,#c9a84c)`
  - 모드 전환 버튼: 하드코딩 blue → CSS 변수
  - 영수증 발송 버튼: `#0891b2` teal → `var(--br,#c9a84c)` gold
- `filo-auth.js`:
  - 홈 대시보드 벤토 그리드: 히어로 카드 + 직원/대기 사이드 타일 (2-col grid)
  - 재고 부족: 별도 타일 → full-width 배너 (경고 시 빨간 테두리)
  - 퀵 액션 버튼: 아이콘 원형 배경 + hover 개선
  - `_hmTileSet`: inv 배너 테두리 색도 함께 업데이트
- `filo-order.js`: 승인/조리 버튼 `#0891b2` → `var(--br,#c9a84c)`
- `filo-table.js`: 확정 버튼 `#0891b2` → `var(--br,#c9a84c)`
- `filo-pos-pay.js`: 영수증 발송 버튼 `#0891b2` → `var(--br,#c9a84c)`

### 2026-08-31 (23차)
**페이지 내부 디자인 개선 + 애니메이션 시스템 + 네비게이션 정리**
- `filo-margin.js`:
  - `_filoPageMargin()` 전체 HTML — `background:#fff`·`color:#0F172A`·`border:rgba(0,0,0,.06)` → CSS 변수 (`var(--surface)`·`var(--tx)`·`var(--bd2)`) 일괄 교체 (다크/라이트 테마 호환)
  - AIVO 배지 색상: 퍼플/인디고 → FILO 골드 (`rgba(201,168,76,.12)` 배경 + `rgba(201,168,76,.3)` 테두리)
  - 탭 바 활성 색상: 인디고(`#6366f1`) → FILO 골드 (`#c9a84c`)
  - `_filoMgTab()`: 탭 전환 시 채워진 배경 방식 → 언더라인 방식으로 변경 (초기 HTML과 통일)
  - KPI 그리드에 `card-cascade` 클래스 추가 → 카드 순차 슬라이드인 애니메이션
  - KPI 값에 `count-anim` 클래스 추가
- `dine.js`:
  - 대시보드 KPI 색상 — 레인보우(sky/purple/violet) → DINE 에메랄드 팔레트 (`#10B981`/`#34D399`) + 주문 건수 FILO 골드 (`#C8A356`) + 인건비율 amber 유지
- `filo-auth.js`:
  - 애니메이션 유틸리티 추가: `_filoTypewriter()`, `_filoCountUp()`, `_filoCascade()`
  - 홈 대시보드 수치 업데이트 → `_filoCountUp()` 적용 (매출·건수·평균단가·미처리 모두)
  - 퀵액션 그리드 + 타일 그리드 → `card-cascade` 클래스 추가
  - 네비게이션 정리:
    - `지금 영업`에서 `웨이팅` 항목 제거
    - `AIVO 마진 분석` nav 항목 제거 (AIVO 어시스턴트 탭 내부로 통합)
    - `팀 관리` → `팀·손님` 으로 리네임
    - `예약·달력` → `예약·웨이팅`으로 리네임
- `filo.html`:
  - `.typewriter` CSS 클래스 추가 (타이핑 효과 애니메이션)
  - `.card-cascade` CSS 클래스 추가 (카드 순차 슬라이드인, nth-child 기반 딜레이)
  - `.num-roll` CSS 클래스 추가
  - `.stagger-5`~`.stagger-8` 추가 (기존 1~4에서 확장)

### 2026-08-31 (22차)
**FILO·DINE 브랜드 정체성 전면 개편 — 다크 크롬 + 브랜드 차별화**
- `filo.html`:
  - 탑바 → 다크 네이비 크롬 (`linear-gradient(90deg,#091628,#0C1E38)`) — 사이드바와 통일
  - 탑바 로고 "FILO" → "FILO·POS" (POS 서브텍스트 추가)
  - 탑바 버튼/아이콘 모두 white-friendly 색상으로 일괄 교체
  - DINE 이동 버튼 → 골드 스타일
  - 사이드바 브랜드 헤더 추가 (FILO·POS 로고마크 + PRO 뱃지)
  - 사이드바 아바타 → 골드 그라디언트 (`#C8A356→#D4B46E`)
  - 업그레이드 버튼 퍼플 → 골드 계열
- `dine.html`:
  - 사이드바 → 다크 네이비 (`linear-gradient(180deg,#0B1F3A,#091628)`)
  - CSS 변수 오버라이드로 사이드바 내 모든 요소 자동 white 계열 전환
  - 활성 nav 항목 → 에메랄드 (`#10B981`) 좌측 테두리 + 에메랄드 배경 (FILO 골드와 차별화)
  - 탑바 → 다크 네이비
  - DINE 로고 → 에메랄드 그라디언트 (`#34D399→#10B981`)
  - DINE HR 서브텍스트 추가 ("직원·정산 플랫폼")
  - FILO 바로가기 버튼 → 골드 스타일
- `filo-auth.js`:
  - 홈 히어로 카드 전면 개선 — FILO POS 아이콘 + "오늘 영업 현황" 레이블, 매출 36px, 서브스탯 구분선 레이아웃, 미처리 주문 주황색 강조
  - 퀵액션 버튼 — hover 애니메이션 (translateY + shadow), 힌트 텍스트 표시
  - 타일 카드 — 골드 탑 보더 + uppercase 레이블

### 2026-08-31 (21차)
**전가맹점 현황 랭킹 테이블 + 랜딩 프랜차이즈 섹션**
- `filo-auth.js`: `_filoPageBranchMonitor()` 전면 개선 — Promise.all 병렬 집계 후 매출 내림차순 정렬, 🥇🥈🥉 메달 + 상대 바 차트, 4개 요약 카드(가맹점수/총매출/총주문/활성매장), 새로고침 버튼
- `filo-landing.html`: FRANCHISE HQ 섹션 추가 (footer 위) — 5개 기능 소개 카드 + 도입 문의 CTA

### 2026-08-31 (20차)
**프랜차이즈 HQ 완전 구현 + 모바일 하단 탭바**
- `filo.html`: 모바일 하단 탭바 추가 — 홈/영업/메뉴/AIVO/설정 5탭, max-width:768px에서 표시, safe-area-inset-bottom 지원
- `filo-auth.js`: `_filoGoPage()` 탭바 활성 동기화 추가 (`_tabPages` 맵 — 페이지→탭 매핑)
- `filo-auth.js`: 본사 HQ 섹션에 가맹점관리·공지일괄발송·QSC체크리스트 3개 항목 추가
- `filo-auth.js`: `_filoPageBranchMgmt()` 신규 — dealerId 입력→hqDealerId 설정·해제·목록 조회
- `filo-auth.js`: `_filoPageHqNotice()` 신규 — 전가맹점 공지 일괄 발송 (일반/긴급/이벤트), `hq_notices` 컬렉션 저장, 이력 조회
- `filo-auth.js`: `_filoPageQSC()` 신규 — Q(품질)/S(서비스)/C(청결) 9항목 5점 체크리스트, `hq_qsc` 컬렉션 저장, 이력 %점수 표시

### 2026-08-31 (19차)
**FILO 구조 전면 개편: nav 4그룹 재편 + 프랜차이즈 HQ + 업종별 홈 위젯 + AIVO 채팅**
- `filo-auth.js`: `_buildFiloNav()` 그룹명 재편 (주문매출/메뉴테이블/재고/직원급여/회원예약 → 지금영업/메뉴재고/팀관리/AI분석). 웨이팅을 "지금 영업"으로 이동. `franchise_hq` 플랜 전용 "본사 HQ" 섹션 추가 (전가맹점현황·메뉴일괄배포)
- `filo-auth.js`: `_filoPageHome()` 업종별 퀵액션 3버튼 추가 (cafe→즉시결제/포인트적립/예약추가, izakaya→테이블열기/POS/주문대기, fastfood→빠른결제/주문대기/재고확인, other→POS/예약/주문대기)
- `filo-auth.js`: `_filoPageBranchMonitor()` 신규 — 전가맹점 일일 매출 집계 뷰 (hqDealerId 기반 companies 조회)
- `filo-auth.js`: `_filoPageMenuDeploy()` + `_filoHqDeploy()` 신규 — 본사 메뉴 가맹점 일괄 배포 (신규추가·가격동기화·삭제 옵션)
- `filo-margin.js`: `_filoPageAI()` AIVO 채팅 패널 추가 — 매장 데이터 기반 채팅 UI (퀵칩 4개, `_aiChatSend()` 구현)
- `_worker.js`: `/api/ai-chat` POST 엔드포인트 추가 — 최근 7일 매출+재고 데이터 컨텍스트 주입 후 claude-haiku-4-5 응답

### 2026-08-31 (18차)
**오프라인 카드(단말기 직접) 결제 지원**
- `filo-pos.js`: 오프라인 시 카드 버튼 활성화 (amber 강조, "단말기 직접" 서브텍스트). `_posCardDirectArea()` 3단계 안내 UI 추가. `_posSelectMethod()` 오프라인 카드 선택 → `card_direct` 자동 전환. `_posConfirmBtn()` card_direct 전용 골드 버튼
- `filo-payment.js`: 오프라인 허용 조건 `cash` → `cash|card_direct`. card_direct도 IndexedDB 큐잉 후 온라인 시 Firestore 동기화
- 키오스크(고객용)는 VAN 단말기 없어 card_direct 미지원 / POS(직원용)만 적용

### 2026-08-31 (17차)
**오프라인 POS 모드 10점 업그레이드**
- `filo-pos-core.js`: IndexedDB v1→v2, `menu_cache` 스토어 추가. `_offlineCacheMenus(menus,did)` / `_offlineGetMenus(did)` / `_offlinePendingCount()` 함수 추가. `_offlineSync()` → `_collection` 필드 라우팅 (filo_sales/orders/payments 3컬렉션 자동 분기)
- `filo-payment.js`: 오프라인 현금결제 시 테이블 주문 → filo_orders, 선불 → filo_payments도 IndexedDB 큐에 저장. 온라인 복구 시 전체 자동 동기화
- `filo-pos-ui.js`: 메뉴 로드 성공 후 `_offlineCacheMenus()` 자동 호출. catch 블록 오프라인 폴백 → `_offlineGetMenus()` 캐시 메뉴로 POS 즉시 렌더. `_offlineBanner()` 미동기화 건수 뱃지 업데이트. `_filoHotspotTip()` 모달 추가 (iPhone/Android 핫스팟 단계 안내)
- `filo.html`: 배너에 미동기화 뱃지(`#filo-pending-badge`) + "핫스팟 안내" 버튼 추가. 스크립트 버전 범프 (pos-core v3, pos-ui v4, payment v3)

### 2026-08-30 (16차)
**FILO 플랜 게이팅 + 구독 Toss 결제 플로우 완성 + 용차앱 정보통신업 리포지셔닝**
- `filo-auth.js`: `FILO_PLAN_FEATURES` 맵(trial/basic/pro/premium/franchise_hq) + `_filoPlanFeats` 변수 + `hasFeature()` 플랜 체크 OR 조건 추가 (기존 hasAll·_services 폴백 유지)
- `filo-settings.js`: `_filoSubscribePlan()` — Toss SDK 동적 로드 + `/api/toss-client-key` + `requestPayment('카드', {orderId: FILO-{uid8}-{ts}-{plan}, successUrl: /filo-subscribe-success})`
- `filo-settings.js`: `_filoPageSubscription()` 버튼 onclick → `_filoSubscribePlan()` 연결
- `_worker.js`: `/toss-confirm` FILO- prefix 분기 추가 — `companies/{uid}` filoPlan·filoPlanExpiry·filoPlanAmount·filoPlanPaidAt 업데이트 + payments 기록
- `_worker.js`: `/filo-subscribe-success` 성공 콜백 페이지 (인라인 HTML, /toss-confirm 자동 호출)
- `_worker.js`: `/filo-subscribe-fail` 취소 콜백 페이지 (인라인 HTML)
- `yongcha-landing.html` / `yongcha.html`: "주선사업자 없는 직접 매칭" → "소장·기사 직접 거래 정보 서비스" 등 정보통신업 포지셔닝으로 마케팅 문구 변경. yongcha.html 프로필 화면 법적 고지 추가
- `BUSINESS_MEMO.md`: 사업자등록증 업종(정보통신산업/인터넷컨텐츠개발및공급업) 확인 기록 + 용차앱 법적 근거
- `mbtico-ctrl.js`: `_ctrlSetFiloPlan()` 함수 추가 — prompt로 플랜/개월수 선택 → `companies/{did}` filoPlan·filoPlanExpiry·filoPlanAmount·filoPlanPaidAt 업데이트. 테이블·카드 뷰에 "F플랜" 버튼 추가. `_ctrlOpenDetail` 모달에 FILO플랜·FILO만료 행 표시
- `filo-order.js:800`: `items.map` 내 `it.name/price/qty` null 가드 추가 (`||''`/`||0`/`||1`) — undefined 시 Firestore 저장 오류 방지
- `filo-pos-pay.js:80`: FCM 영수증 알림 아이템명 null 가드 (`||'메뉴'`) — "undefined ×N" 표시 방지
- `_worker.js` / `yongcha-worker.js`: YONGCHA_HTML 동기화 — AI 추천 문구 6곳 + 프로필 법적 고지 문구 (yongcha.html 커밋 aeb8902·01b0a52 반영)

### 2026-08-30 (15차)
**Worker API 버그 수정 — 슈퍼어드민 인증·포인트 적립 복구**
- `_worker.js` `verifyFirebaseToken`: accounts:lookup fetch에 `Referer: https://filo.ai.kr` / `Origin: https://filo.ai.kr` 헤더 추가 → Firebase API키 HTTP Referrer 제한 우회. 미수정 시 슈퍼어드민 API 전체 401 반환
- `_worker.js` `/api/point-earn`: 핸들러 try 블록 내 `corsH` 미정의 버그 수정 → QR 주문 포인트 적립 정상화
- `scripts/test/filo-api-test.js`: 번역 API 테스트 파라미터 수정 (`text`→`name`, `target`→`lang`)
- `INFRA_MEMO.md`: FIREBASE_API_KEY 상태 "미등록" → "등록완료" 수정 (Cloudflare 대시보드 확인)

### 2026-08-30 (14차)
**재고 부족 FCM 즉시 알림 + 재고·마진 UI 전면 리디자인 + 레시피 기반 원가 자동 계산**
- `_worker.js`: `/api/filo-order` 재고 차감 후 stock ≤ minStock 시 FCM 즉시 발송 (companies/{dealerId} fcmTokens 조회 → `sendAdminFCM` 호출, lowStockAlerts 배열)
- `filo-inventory.js`: 재고현황·발주현황·레시피 탭 pill 스타일로 통합. 검색바 + SVG 아이콘 버튼 헤더
  - KPI 카드: left-border accent + uppercase label + tabular-nums
  - 아이템 카드: 단가 뱃지·8px 재고바·부족 시 빨강 border. 발주현황 날짜 urgency 색상
- `filo-margin.js`: menu_costs + menu_recipes + inventory 병렬 로드, invPriceMap으로 레시피 기반 원가 자동 계산 (`_auto:true` 플래그 → "레시피 자동" 보라 뱃지)
  - `totalRev` → `monthRev` 버그 수정 (결제수단·인기메뉴 비중 계산 오류)
  - 오늘 실시간 KPI: 4열 → 2×2 그리드, left-border accent. 메뉴별 마진율 색상 bar + 판매량 진행바
- commit: `7073601`

### 2026-08-30 (13차)
**재고 자동 차감 시스템 + filo-inventory.js 메뉴-재고 연동 탭**
- `_worker.js`: `/api/filo-order` POST 핸들러 — 주문 완료 직후 `menu_recipes` 컬렉션 조회 → 주문 아이템별 레시피 매칭 → `inventory` 컬렉션 stock 자동 차감 (non-critical try/catch 처리)
- `filo-inventory.js`: "메뉴-재고 연동" 3번째 탭 추가
  - `_filoInvLoadRecipes(did)` — menu_recipes + filo_menus + inventory 병렬 Firestore 조회
  - `_filoInvRenderRecipes()` — 연동된 메뉴 / 미연동 메뉴 섹션 구분 렌더링
  - `_filoInvAddRecipeModal()` — 바텀시트 레시피 등록/수정 (재료 행 동적 추가)
  - `_filoSaveRecipe()` / `_filoInvEditRecipe()` / `_filoInvDeleteRecipe()` — CRUD 완성
  - `_escHtml()`, `_escAttr()` — XSS 방지 헬퍼 추가
- commit: `2b5fa02`

### 2026-08-29 (12차)
**DINE 근태·급여 화면 디자인 전면 개선**
- `dine-staff.js`: 출퇴근 현황 KPI 카드 — 아이콘+border-left 컬러 강조, font-variant-numeric:tabular-nums 적용
- `dine-staff.js`: 상태 뱃지 → 컬러 도트+pill 스타일(근무중/퇴근/미출근), 수정 버튼 → 연필 SVG 아이콘 버튼
- `dine-staff.js`: 테이블 헤더 uppercase letter-spacing 처리
- `dine-analytics.js`: 근무 스케줄 헤더 — 주간 날짜 범위 표시, 화살표 아이콘 네비+등록 버튼 추가
- `dine-analytics.js`: 오늘 날짜 골드 원형 강조, 주말(일=빨강/토=파랑) 색상 구분
- `dine-analytics.js`: 스케줄 셀 — 출근=초록/퇴근=파랑/근무중=골드 펄스 도트, 빈 셀 dashed+plus 아이콘
- `dine-payroll.js`: 급여 계산 KPI 3칸 카드 폰트/패딩 정비, 직원 카드 2×2 그리드 요약 레이아웃
- `dine-payroll.js`: 급여명세서 모달 — MBTICO 뱃지+이름 28px, 실수령액 2px border+32px+세전→공제 요약
- `dine-schedule.js`: 급여명세서 목록 — 진행바(월160h 기준), 이름+파트 분리, 발송 버튼 골드+send SVG
- `dine-schedule.js`: 일괄발송 영역 summary 카드 형태로 개선
- commit: `949397b`

### 2026-08-29 (11차)
**응원 메시지 개인화 + 버그 3종 수정**
- `dine-staff.js`: `_dineCheerMsg(sch)` 시그니처 변경 — 스케줄 없으면 절대시각 폴백 유지
  - 시프트 내 비율(elapsed/totalDur) 계산: <12% 출근직후·65~84% 후반전·≥85% 퇴근직전
  - 아침 시프트(5~12시 출근)만 점심 피크, 저녁/야간 시프트만 저녁 러시, 야간만 심야 격려
  - `_staffLoadClock`: 스케줄 확보 후 카드 개인화 업데이트 (휴무 감지 로직 유지)
- `dine-staff.js`: `JSON.stringify(` 닫는 `)` 누락 → 문법 오류·파일 파싱 실패 수정 (l.868)
  - 증상: dine.js `_dineStaff is not defined`, `_dineAttend is not defined`
- `filo-pos-ui.js`: 모드 전환 버튼 onclick `document.getElementById('page-content')` → `'content'` (null 오류)
- `filo-pos.js`: 결제 터미널 모바일 반응형 수정
  - `window.innerWidth < 640` 감지 → `flex-direction: column` (상하 레이아웃)
  - `pos-left`: `width:100%; max-height:42%` / `pos-right`: `flex:1; overflow-y:auto`
  - 데스크탑(640px+): 기존 좌우 2패널 유지
- commit: `2419488`, `3d12c23`, `b146de5`, `e1b1520`

### 2026-08-29 (10차)
**DINE 전면 개선 + FILO POS 수량 시트 + SMS 일괄 발송**
- `dine-tax.js`: fixed['card-fee'] → fixed.cardFee 폴백 (카드수수료 0원 버그)
- `dine-schedule.js`: collection('staff') → collection('members') (직원 드롭다운 빈화면)
- `dine-payroll.js`: _dineSendPayslip() 완전 구현 (payroll 조회→FCM 발송)
- `dine-analytics.js`: _dineCheckAbsents() — 09:30 이후 로그인 시 결근자 자동 감지·배지
- `dine-member.js`: _dineReviews() 리뷰 관리 페이지 추가 (네이버·카카오 Place URL, 리뷰 기록, 요청 SMS)
- `dine.js`: reviews 라우트 추가
- `dine.html`: 사이드바 리뷰 관리 nav 추가
- `_worker.js`: /api/send-sms-bulk 추가 (Aligo SMS 일괄 발송, dealer 토큰 인증)
- `filo-pos-ui.js`: X 버튼 _cartClear → _cartRemoveSheet (개별 수량 수정 바텀시트)
- `filo-pos-core.js`: _cartRemoveSheet() 구현
- `filo-auth.js`: menu_mgmt lazy-load 수정 (_filoPageMenuMgmt is not defined)
- `filo-menu-mgmt.js`: 카드 배경 흰색 변경
- commit: `047e24f` + SMS bulk 추가 커밋(미정)

### 2026-08-28 (9차)
**POS 결제 터미널 전면 재설계 — 기업급 풀스크린 UI**
- `filo-pos.js`: _filoPay() 4버튼 모달 → 풀스크린 다크 결제 터미널(#070d1b) 완전 재설계 (~404줄)
  - 좌측 패널: 주문 내역 상세 + VAT 10% 분리 표시 (소계/부가세/합계 골드 강조)
  - 우측 패널: 6종 결제수단 그리드 (카드/현금/카카오페이/네이버페이/토스페이/서비스)
  - 현금 결제: 소프트 넘패드(3x4) + 빠른금액 버튼 + 거스름돈 실시간 계산
  - 카드 결제: 단말기 탭 애니메이션 (cardPulse + cardWave 키프레임)
  - 카카오/네이버: QR 안내 화면 (브랜드 색상 #FEE500/#03C75A)
  - 토스: Toss SDK 연동 버튼
  - 할인 모달: 정액/정률 탭 전환 + % 단축 버튼 (5%/10%/20%/30%)
  - 확인 버튼: 결제수단 색상 동적 반영 + glow box-shadow 효과
  - 결제 확정: _posDo() → _filoConfirmPay(m,label) (filo-payment.js)
  - 분할결제: _filoSplitPay(total) 위임 (filo-pos-core.js)
- commit: `569d843`

### 2026-08-28 (8차)
**홈 nav 버튼 + QR주문 음성TTS 번역**
- `filo-auth.js`: `_buildFiloNav()` 홈 대시보드 nav 항목 추가 (홈→다른 페이지 이동 후 복귀 경로)
- `filo-order-common.js`: `_ttsSpeak()`, `_ttsMenu()` 신규 — 언어별 speechSynthesis lang 설정 (en-US/zh-TW/ja-JP/ko-KR)
- `filo-order-common.js`: 언어 전환 시 해당 언어 인사말 TTS 자동 재생
- `filo-order-common.js`: 메뉴 모달 열릴 때 번역된 메뉴명+설명 자동 읽기
- `filo-order-common.js`: 메뉴 카드 스피커 버튼 추가 (비KO 언어 시 자동 표시)
- `order.html`: `.mi-tts-btn` CSS, `body[data-tts=on]` 토글 방식
- commit: `0f7f93c`

### 2026-08-28 (7차)
**홈 대시보드 신규 구현 — 실시간 운영 현황판**
- `filo-auth.js`: 로그인 기본 화면 `kiosk` → `home` 으로 변경 (L180)
- `filo-auth.js`: 라우팅 체인 최상단에 `home` case 추가 (L661)
- `filo-auth.js`: `_filoPageHome(el)` + 헬퍼 5개 신규 구현 (~206줄)
  - 전역: `_homeUnsubs[]`, `_homeOrdersAll[]`, `_homeOrderPage`
  - 운영상태 pill: 주문 있으면 "운영 중" (초록·펄스), 없으면 "주문 없음" (뮤트)
  - 히어로 카드: 오늘 매출 `_countUp` 애니메이션, 주문건수·평균단가·미처리건
  - 3분할 타일: 직원출근(attendance onSnapshot) / 웨이팅대기(filo_bookings onSnapshot) / 재고부족(inventory 1회 get)
  - 최근 주문: 5개씩 페이지네이션 (`_hmRenderPage`, `_hmNext`, `_hmPrev`)
  - 오늘 예약: 실시간 목록, 시간순 정렬, 상태 칩 (확정/취소/대기)
  - `_FILO_WATCHERS.home_orders/home_attend/home_book` 등록 → 페이지 전환 시 리스너 자동 해제
- commit: `3364db7`

### 2026-08-28 (6차)
**업종별 커스텀 테마 시스템 완성 — order.js glow 변수 누락 보완 및 메모 정리**
- `order.js`: `_applyStoreTheme()` 에 `--brand-glow`, `--brand3`, `--surface2`, `--surface3`, `--border2`, `--shadow-md`, `--shadow-lg` 추가 — order.html 이 사용하는 CSS 변수 중 glow/shadow 계열이 테마 변경 시 보라색 고정되던 문제 수정
- `filo-settings.js`: `_filoSaveTheme()` 저장 완료 토스트 메시지 '테마가 적용됐습니다' → '테마가 저장됐어요.' 수정
- 기존 구현 상태 검증 완료 (모두 main 브랜치와 동일):
  - `filo-common.js`: `_FILO_THEMES`(7종) + `_filoApplyTheme()` + `_filoLoadStoreTheme()` 구현됨
  - `filo-settings.js`: 설정 화면 "매장 테마" 섹션 구현됨 (업종 select + 컬러피커 + 미리보기 + 저장)
  - `order.js`: companies 로드 콜백에서 `_applyStoreTheme(d)` 호출 구현됨
  - `store.js`: companies 로드 콜백에서 `_applyStoreTheme(snap.data())` 호출 구현됨
  - `kitchen.html`: `/kitchen/data` 응답에서 `_applyTheme(res.company)` 호출 구현됨

### 2026-08-28 (5차)
**업종별 기본 메뉴 템플릿 자동 세팅 — 첫 로그인 모달 구현**
- `filo-auth.js`: `_filoCheckAndShowIndustryModal(did)` 추가 — 딜러 첫 로그인 시 filo_menus 비어있으면 모달 표시
- `filo-auth.js`: `_filoShowIndustryModal(did)` 추가 — 업종 선택 fullscreen 오버레이 모달 렌더링
- `filo-auth.js`: `_filoIndustryModalConfirm(did)` 추가 — 업종 선택 후 companies.theme 저장, filo-menu.js 동적 로드 후 `_filoSeedDefaultMenus` 호출
- `filo-auth.js`: `_showApp()` 에 3200ms setTimeout 추가 — 딜러(role!=='member') 로그인 시 자동 체크
- 기존 `_filoSeedDefaultMenus` (filo-menu.js) / `_filoSeedDefaultMenusManual` (filo-menu.js) / 회원가입 시딩(_filoRegister) 은 이미 구현됨 — 변경 없음

### 2026-08-28 (4차)
**filo-menu 계열 중복 함수 제거 및 레시피 기능 정리**
- `filo-menu.js`: 1524줄 → 687줄 (-837줄) — recipe CRUD 8개 + mgmt 중복 9개 = 17개 함수 제거
- `filo-menu-recipe.js`: 파일 삭제 (전체 15개 함수가 filo-menu.js에 중복 존재하던 미완성 분리본)
- `filo-auth.js`: recipe 메뉴 항목·라우터·titles 맵 제거
- `_worker.js`: 파일 서빙 허용 목록에서 filo-menu-recipe.js 제거
- 남은 filo-menu.js 기능: 이미지 유틸·원가 관리·유통기한·재고알림·메뉴 시딩·일괄번역

### 2026-08-28 (3차)
**1단계 HIGH 리팩토링 — dead code 제거, N+1 Promise.all 병렬화, 리스너 등록 보완**
- `filo.html`: deprecated `filo-schedule.js` 스크립트 태그 제거
- `filo-auth.js`: `_filoPageCostMgmt(el)` 래퍼 함수 추가 — `cost_mgmt` 라우터 호출 시 undefined 오류 방지
- `filo-auth.js`: `_FILO_WATCHERS`에 `delivery` 페이지 + `_deliveryUnsub` 항목 추가 (filo-order.js 리스너 자동 해제 연결)
- `_worker.js`: 중복 `/api/translate` 핸들러 제거 (L4587 dead code — L2357 핸들러가 항상 먼저 반환)
- `_worker.js`: 기사 PATCH `for await` 루프 → `Promise.all` 병렬화
- `_worker.js`: 데모 초기화 18개 직렬 쿼리 (3컬렉션 × 6데모) → `Promise.all` 병렬화
- `_worker.js`: 메뉴 번역 N×3 직렬 Anthropic API 호출 → `Promise.all` 병렬화 + `_translateOne` 헬퍼 추출
- `yongcha-worker.js`: `_pgDispatchLocations` — `_dispatchLocationsUnsub` 변수 추가, 재진입 시 기존 리스너 해제

### 2026-08-28 (2차)
**코드 품질 — N+1 제거, onSnapshot 전환, 리스너 cleanup 구조화**
- `dine.js`: `_dineSendNotif` N+1 직렬 `await` → `Promise.all` 병렬 조회 (알림 발송 속도 개선)
- `dine.js`: `_dineReleaseListeners()` 함수 추가 — 로그아웃 시 모든 window._dine* 리스너 일괄 해제 (`_dineLogout` 연결)
- `filo-staff.js`: `_filoStartLiveTicker` 리팩터 — 60초 `attendance.get()` 폴링 → `attendance.onSnapshot` + `_tickerAttendSnap` 캐시; `_tickerRender()` 분리 (1분 interval은 시간 기반 급여 재계산만 담당, DB 조회 없음)
- `filo-auth.js`: `_filoLogout`에 `_tickerAttendUnsub` cleanup 추가

### 2026-08-28 (1차)
**보안·코드 품질·Firestore 효율성 전면 점검**
- `dine.js`: 로그인 `.catch()` 2곳 — 네트워크 오류 시 owner 자동 승격 버그 수정 → 에러 메시지 표시로 교체
- `filo-staff.js`: `_attendUnsub` → `_staffAttendUnsub` 이름변경 (filo-members.js 전역 충돌 방지), `_liveTickerTimer` 중복 선언(L363) 제거, `var _staffAttendUnsub=null` 명시적 선언 추가
- `filo-pos.js`: 테이블 주문 onSnapshot에 `.where('date','==',_posToday)` 추가 (전체 이력 구독 → 오늘 주문만, ~25% 읽기 절감)
- `filo-auth.js`: `_FILO_WATCHERS`에 `kiosk` 페이지 (`_kioskTableUnsub`) 추가; 로그아웃 시 `_filoDineResUnsub` 정리 추가 (재로그인 이중 구독 방지)
- `dine-analytics.js`: `_dineLoadMyPayroll` 좀비 쿼리 수정 (`staff`→`members`, `staffId`→`memberId`)
- `_worker.js`: 보안 수정 14건
  - verifyFirebaseToken 폴백 null 반환 (JWT 서명 미검증 제거)
  - /admin/cleanup-dup-orders requireAdmin 추가
  - /api/filo-order·/api/point-earn·/order/move-table dealerId→companies 검증
  - /kitchen/update verifyFirebaseToken 인증 추가
  - /api/inquiry HTML 이스케이프 (_he 함수)
  - /toss-confirm verifyFirebaseToken 인증 + uid 검증
  - /api/emergency-driver-profile·/api/delivery-dispatch verifyFirebaseToken 인증
  - /qr/register·/qr/confirm (×2 핸들러) dealerId→companies 존재 검증 (임의 매장 데이터 생성 방지)
  - /toss/create-order verifyFirebaseToken 인증 추가 (비인증 결제 주문 생성 방지)
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

### 2026-08-29
**QR 출퇴근 · FCM · order.html 캐시버스터**
- `_worker.js`: /qr 신규 직원 등록 폼에 시급(r-wage) 입력 필드 추가 → wage=0 문제 해결 (양쪽 중복 핸들러 동시 수정)
- `_worker.js`: /qr/register POST 핸들러 wage 파라미터 수신 → integerValue로 저장 (미입력 시 최저시급 10030원 기본값)
- `order.html`: order.js 스크립트 태그 v=13 → v=14 캐시버스터 업데이트 (reqReceiptFCM KV캐시 문제 해결)
- `CLAUDE.md`: 미완료 항목 정리 (선결제/후불 모달 완료, QR 등록화면 수정 완료)

**메뉴 이미지 일괄 갱신 + 번역 일괄생성 + 매출 테스트 데이터 시딩**
- `filo-menu.js`: `_filoRefreshAllMenuImages(did, btn)` 신규 — pollinations.ai URL 메뉴만 선별해 Pexels로 순차 교체 (800ms 간격)
- `filo-menu-mgmt.js`: 메뉴관리 헤더에 "이미지 일괄 갱신" (cyan) + "번역 일괄생성" (violet) 버튼 추가
- `filo-settings.js`: "매출 테스트 데이터" 카드 추가 — `_filoSeedSalesData()` → /api/seed-sales POST
- `.github/workflows/seed-sales.yml`: workflow_dispatch 워크플로우 신규 — GitHub Actions에서 curl로 시딩 (filo.ai.kr 직접 호출)
- 2026-07 7월 매출 샘플 데이터 336건 시딩 완료 (did: 9XD2K3W1tIhIs6XM74YT0xfRFEP2)

**filo-menu.js 파일 분리 (55KB → 3파일)**
- `filo-menu-image.js` (신규): `_filoAutoImageUrl`, `_filoFetchMenuImage`, `_filoRefreshAllMenuImages`, `_filoBatchTranslate`
- `filo-menu-templates.js` (신규): `_FILO_MENU_TEMPLATES` 데이터 + `_filoSeedDefaultMenus`, `_filoFillTemplateImages`, `_filoSeedDefaultMenusManual`
- `filo-menu.js` (감축 ~7KB): 원가(`_filoRenderCostMgmt`/`_filoSaveCost`/`_filoDelCost`) + 유통기한(`_filoPageExpiry`) + 재고이력(`_filoLoadStockHistory`) + 재고알림(`_filoStockLowAlert`)만 유지
- `filo.html`: 스크립트 순서 → filo-menu-templates.js?v=1, filo-menu-image.js?v=1, filo-menu.js?v=3

**filo-pos-ui.js 파일 분리 (44KB → 2파일)**
- `filo-pos-ui.js` (감축 ~15KB): 모드 전환(`_filoPosMode`/`_filoPosSetMode`) + 키오스크 렌더링(`_filoPageKiosk`/`_loadKioskTableBar`/`_filoRenderKiosk`/`_filoFilterKiosk`) + 영수증 업로드(`_filoReceiptSelected`)
- `filo-pos-pay.js` (신규 ~28KB): 테이블 결제(`_filoTablePay`) + 각자계산(`_filoTableSelfPay`) + 영수증 모달(`_filoShowReceipt`) + 영수증 알림팝업(`_filoReceiptNotify`) + 고객화면(`_posCustomerDisplay`/`_posCustRender`)
- `filo.html`: filo-pos-ui.js?v=1 → v=2, filo-pos-pay.js?v=1 추가 (filo-pos-ui.js 다음)

### 2026-09-01
**로그인 화면 3D 메탈릭 로고 교체 (FILO·DINE)**
- `filo.html`: 로그인 로고 → 핑크 3D 메탈릭 JPEG 인라인 교체 (280×380px, ba140f66-image.jpg 원본 기반, b64 28528자). 검은 배경 합성 후 JPEG quality=85 저장.
- `dine.html`: 로그인 로고 → 초록 3D 메탈릭 JPEG 인라인 교체 (280×364px, 8ff7720c-image.png 원본 기반, b64 31776자). 이전에 FILO 핑크 로고가 잘못 삽입돼 있던 것 교체.
- `dine.html`: 파비콘 `<link rel="icon">` — 구 180×180 PNG → 신규 192×192 PNG (초록 3D DINE 아이콘, b64 68152자). 파일 총 크기 144KB.
- `_worker.js`: DINE PWA 아이콘 3종 (`/dine-icon-192.png`, `/dine-icon-512.png`, `/dine-apple-icon.png`) — 8ff7720c-image.png(786×1024 RGBA) 기반 초록 3D 로고로 전면 교체.
- `_worker.js`: FILO PWA 아이콘 (`/filo-icon-192.png` 등) — ba140f66-image.jpg 기반 핑크 3D 로고 유지 확인.
- **임베딩 방식**: PNG 파일은 KV 업로드 불가(텍스트 전용) → 모든 로고·아이콘을 base64 data URI로 HTML/JS에 인라인 삽입이 유일한 해결책.

### 2026-08-30
**업종별 탭 활성화 시스템**
- `filo-auth.js`: `_INDUSTRY_DEFAULTS` 매트릭스 추가 (업종별 기본 표시 탭 정의)
  - cafe: bakery_qr + table_order + reservation + member_crm 기본 활성
  - fastfood: 테이블·예약 탭 비활성 (구독 명시 시 표시)
  - 그외(korean/japanese/chinese/izakaya/other): table_order + reservation + member_crm 기본 활성
- `filo-auth.js`: `hasFeatureOrIndustry(key)` 헬퍼 추가 → 구독/관제센터 OR 업종 기본값 중 하나라도 해당하면 탭 표시
- `filo-settings.js`: `_filoSaveTheme()` 저장 후 `_buildFiloNav()` 즉시 호출 → 업종 변경 시 사이드바 탭 즉시 갱신

**FCM 알림 탭 시 빈 화면 버그 수정 + 영수증 공유 버튼 추가**
- `order.js`: `#done` 복원 시 `_doneStep()` 미호출로 모든 step `display:none` → 빈 화면 버그 수정
  - pending/ready/served: `_doneStep(3)` 호출 → 픽업 대기 화면 즉시 표시
  - completed: `_doneStep(1)` 호출 → 주문 확인 화면 표시
  - `done-title`/`done-sub` 텍스트 복원 추가, `completed` 상태도 허용
  - `_showPickupAlert()` 빈 div에 🔔 이모지 추가
- `order.html`: 영수증 카드에 "공유하기" 버튼 추가 (`_shareReceipt()` → Web Share API)
- `order.js`: `_shareReceipt()` 함수 신규 추가 (미지원 시 스크린샷 안내 토스트)
