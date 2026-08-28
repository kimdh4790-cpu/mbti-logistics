# 세션 인계 메모 — 2026-08-09
> ⚠️ **메모 관리 원칙**: 해결·완료된 항목은 즉시 삭제할 것. 미완료/확인필요 항목만 남긴다.

---

## 세션 분류 (4개 전담)

| 세션 | 담당 도메인 | 담당 파일 |
|------|------------|----------|
| **FILO·DINE** (이 세션) | filo.ai.kr, dine.ne.kr | filo-*.js, filo.html, dine*.js, dine*.html, order*.*, member-portal.html, _worker.js (FILO/DINE 관련) |
| **DONWAY** | donway.ai.kr, mbtico.kr | donway_landing.js, settle.html, drivers.html, mbtico-ctrl.js, mbtico-pages/ |
| **용차** | yongcha.app | yongcha.html, yongcha-worker.js, yongcha-landing.html |
| **미디어** | SNS/영상 | scripts/ 전체 (capture, compose, upload, content) |

### 핵심 규칙
- **본인 담당 파일만 수정** — 다른 세션 파일 절대 건드리지 말 것
- `_worker.js`는 FILO·DINE 세션 전담 — 다른 세션은 수정 금지
- `auto-merge.yml`, `wrangler.toml` — 어느 세션도 수정 금지 (FILO·DINE 세션만 예외적으로 관리)

---

## 다른 세션용 — 배포 절차 핵심 요약

### 코드 수정 후 push 방법 (클라우드 코드에서)
```bash
git add 수정한파일.js
git commit -m "feat: 작업내용"
git push -u origin claude/현재브랜치명
```

### push 이후 자동 흐름 (건드릴 필요 없음)
```
push (claude/* 브랜치)
  → auto-merge.yml 자동 실행
    → main 브랜치로 자동 머지
    → KV 업로드 (아래 파일 목록만)
    → wrangler deploy (_worker.js 자동 배포) ✅
    → Cloudflare 캐시 전체 퍼지
```

### KV 자동 업로드 대상 파일 목록
```
filo.html, filo-smart-pos.html, filo-common.js, filo-auth.js, filo-margin.js,
filo-booking.js, filo-members.js, filo-menu-mgmt.js, filo-menu-recipe.js,
filo-payroll2.js, filo-payment.js, filo-schedule.js, filo-settings.js,
filo-pos.js, filo-pos-core.js, filo-pos-ui.js, filo-menu.js, filo-qr.js,
filo-inventory.js, filo-report.js, filo-table.js, filo-staff.js, filo-order.js,
filo-order-common.js, filo-landing.js, filo-landing.html,
dine.html, dine.js, dine-schedule.js, dine-analytics.js, dine-staff.js,
dine-payroll.js, dine-sales.js, dine-tax.js, dine-member.js, dine-landing.html,
donway_landing.js, order.html, order.js, order-done.html, table-order.html,
store.html, kitchen.html, yongcha.html, yongcha-landing.html,
mbtico-ctrl.js, wait.html, wait-join.html, join.html, member-portal.html
```
**목록에 없는 파일**은 push해도 KV에 안 올라감 → 로컬에서 수동 업로드 필요:
```bash
npx wrangler kv key put --remote --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b 파일명 --path ./파일경로
```

### 긴급 수동 배포 (로컬)
```powershell
npx wrangler deploy          # _worker.js 수동 배포
cd mbtico-pages && npx wrangler deploy   # mbtico.kr
git pull origin main && npx wrangler deploy  # yongcha.app
```

### PR 생성 절대 금지
push → auto-merge → 자동 배포. `donway-settle-app CI 빨간 표시`는 무시.

---

## 미완료 / 확인 필요 항목

### Oracle Cloud 자동화 (2026-08-25 업데이트)
- **IP**: 161.33.136.154 (4코어/24GB, opc, filo-a1-2c12g) — Always Free 영구
- **초기 설정**: `bash ~/mbti-logistics/scripts/oracle-init.sh` (1회만)
- **추가된 스크립트**:
  - `scripts/health-check.js` — 5개 앱 핑 (매일 22:00 KST)
  - `scripts/admin-tasks.js` — 재고알림·AI예측 (매일 07:00 KST, MBTICO_ADMIN_PW 필요)
  - `scripts/oracle-init.sh` — cron 자동 설정 (월화수/목금토 2사이클)
- **소셜미디어 cron 스케줄** (UTC 기준):
  - 월/목 00:00 → 용차앱 YouTube
  - 월/목 01:00 → 용차앱 Instagram
  - 월/목 02:00 → 용차앱 블로그
  - 화/금 → FILO (동일 시각)
  - 수/토 → DONWAY (동일 시각)
- **사용자가 직접 해야 할 것**:
  - SSH 접속 후 `bash ~/mbti-logistics/scripts/oracle-init.sh` 실행
  - `echo 'export MBTICO_ADMIN_PW=khw3103!!!' >> ~/.bashrc`
  - 로컬 PC에서 로그인 후 `scp -r ~/.mbtico-profiles/ opc@161.33.136.154:~/.mbtico-profiles/`

### FCM 영수증 알림 테스트 (미확인)
- QR 스캔 → 메뉴 선택 → 주문 완료 → 손님 폰에 영수증 알림 오는지 실폰 테스트 필요
- 첫 터치 → 권한 허용 → 주문 완료 순서여야 토큰 있음

### FILO→DINE 실시간 연동 테스트 (미완료)
- `filo-e2e-test-win.js` [5]번 항목 — DINE 로그인 후 QR 출근 → 출퇴근 현황 실시간 반영 확인
- **선행 조건**: 테스트 매장에 직원 1명 이상 등록 필요 (홍길동/010-1234-5678/시급10000)
- 테스트: `node filo-e2e-test-win.js` (로컬에서만)

### ✅ 완료된 항목 (2026-08-28 4차 기준)
- filo-menu.js 레시피 CRUD 7개 함수 제거 (filo-menu-mgmt.js 중복 9개 함수 제거 포함, 1524→687줄)
- filo-menu-recipe.js 삭제 (filo-menu.js와 15개 전량 중복, filo.html에 로드 안 됨)
- filo-auth.js 레시피 메뉴·라우터 제거
- filo-pos.js 중복 14개 함수 제거 → _filoPay 1개만 유지 (890→81줄)
- filo.html filo-pos-core.js + filo-pos-ui.js 스크립트 태그 추가

### ✅ 완료된 항목 (2026-08-28 3차 기준)
- filo.html deprecated filo-schedule.js 스크립트 태그 제거
- filo-auth.js `_filoPageCostMgmt` 래퍼 추가 (cost_mgmt 라우터 undefined 오류 방지)
- filo-auth.js `_FILO_WATCHERS` delivery 항목 추가 (_deliveryUnsub 자동 해제 연결)
- _worker.js 중복 /api/translate 핸들러 제거 (dead code)
- _worker.js 기사 PATCH for await → Promise.all 병렬화
- _worker.js 데모 초기화 18개 직렬 쿼리 → Promise.all 병렬화
- _worker.js 메뉴 번역 N×3 직렬 → Promise.all 병렬화
- yongcha-worker.js _pgDispatchLocations onSnapshot unsub 저장 (리스너 누수 방지)

### ✅ 완료된 항목 (2026-08-28 기준)
- 솔라피 → 알리고 교체 (`_worker.js` 알림톡 발송부)
- verifyFirebaseToken JWT 서명 미검증 폴백 → null 반환으로 수정
- `/admin/cleanup-dup-orders` requireAdmin 추가
- `/api/filo-order`, `/api/point-earn`, `/order/move-table` dealerId companies 검증 추가
- `/kitchen/update` verifyFirebaseToken 인증 추가
- `/api/inquiry` HTML 이스케이프 (_he 함수) 추가
- `/toss-confirm` verifyFirebaseToken 인증 + DW_TIERS 2,500원/인 가격 수정
- `/api/emergency-driver-profile`, `/api/delivery-dispatch` verifyFirebaseToken 인증 추가
- `/qr/register`, `/qr/confirm` dealerId → companies 유효성 검증 추가 (임의 매장 데이터 생성 방지)
- `/toss/create-order` verifyFirebaseToken 인증 추가 (비인증 결제 주문 생성 방지)
- `dine.js` 로그인 오류 시 owner 자동 승격 버그 수정
- `filo-staff.js` _attendUnsub 전역충돌·_liveTickerTimer 중복 선언 수정
- `filo-pos.js` 테이블 onSnapshot date 필터 (Firestore ~25% 절감)
- `filo-auth.js` kiosk 리스너 누수 + 로그아웃 cleanup 수정
- `dine-analytics.js` 좀비 쿼리 (staff→members) 수정
- `dine.js` _dineSendNotif N+1 → Promise.all 병렬 조회
- `filo-staff.js` LiveTicker 60초 get() 폴링 → attendance onSnapshot 캐시 전환
- `dine.js` _dineReleaseListeners() 추가 (로그아웃 시 DINE 리스너 일괄 해제)

### 미완료 항목
1. **선결제/후불 모달** — ✅ 완료 (모달 이미 구현, tableNum/type/date 누락+VAPID 오타 수정)
2. **FCM 영수증 푸시** — ✅ 완료 (order-done.html VAPID 오타 수정, order.js v13 KV 갱신, 실폰 테스트 필요)
3. **직원 근태 QR** — ✅ 완료 (filo-staff.js: 폼 리셋 wagetype/emptype 추가 + 등록 후 캐시 무효화; _worker.js: doRegister phone 정규화·validation 추가)
4. **매출분석** — 7월 테스트 데이터 시딩
5. **용차앱 라우팅 버그** — 접속 시 DONWAY 랜딩 (별도 확인 필요)
6. **용차앱 세부사항** — YONGCHA_MEMO.md 참조 (경쟁사 분석, 함수 목록, DB 구조 포함)

### 다음 단계 (2단계 — 큰 설계)
- filo-menu.js·filo-pos.js 계열 정리 완료 (4차)
- 다음 정리 후보: dine-analytics.js 분리, 급여 계열 통합

---

## 절대 금지 (다음 세션도 반드시 준수)
- `wrangler.toml` 수정 금지
- `filo-common.js` 직접 수정 금지
- `settle.html` / `drivers.html` 리팩토링 금지
- `alert()` 금지 → `_filoToast()` / `_dineToast()` 사용
- PR 생성 금지
- Playwright 테스트는 로컬 Windows에서만 (`node filo-e2e-test-win.js`)
- 외부 API 키 요청 금지

---

## 핵심 상수
```
Firebase: mbti-logistics
KV NS_ID: 7f0e90efaea64f3ab08ff00f8970b28b
테스트 dealerId: 3lqP7HNSgVP18eZbMn6DnQxRXCA2
매장 dealerId:   9XD2K3W1tIhIs6XM74YT0xfRFEP2
OCI IP: 161.33.136.154 (4코어/24GB, opc, Always Free 영구)
VAPID: BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c
DINE 로그인 셀렉터: #li-email, #li-pw, button[onclick="_dineLogin()"], #app-wrap
```
