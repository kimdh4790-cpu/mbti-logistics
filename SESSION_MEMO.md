# 세션 인계 메모 — 2026-08-09
> ⚠️ **메모 관리 원칙**: 해결·완료된 항목은 즉시 삭제할 것. 미완료/확인필요 항목만 남긴다.

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

### OCI A1.Flex 인스턴스
- 상태: 아직 생성 안 됨 (도쿄 용량 부족)
- 워크플로우 `*/10 * * * *` 로 자동 재시도 중
- **확인 필요**: Osaka/Seoul/Singapore 리전에 VCN/서브넷 있는지
  - OCI 콘솔 → Networking → Virtual Cloud Networks → 리전 변경 후 확인
  - 없으면 "Start VCN Wizard"로 생성 후 워크플로우 자동으로 찾음

### FCM 영수증 알림 테스트 (미확인)
- QR 스캔 → 메뉴 선택 → 주문 완료 → 손님 폰에 영수증 알림 오는지 실폰 테스트 필요
- 첫 터치 → 권한 허용 → 주문 완료 순서여야 토큰 있음

### FILO→DINE 실시간 연동 테스트 (미완료)
- `filo-e2e-test-win.js` [5]번 항목 — DINE 로그인 후 QR 출근 → 출퇴근 현황 실시간 반영 확인
- **선행 조건**: 테스트 매장에 직원 1명 이상 등록 필요 (홍길동/010-1234-5678/시급10000)
- 테스트: `node filo-e2e-test-win.js` (로컬에서만)

### CLAUDE.md 미완료 항목
1. **선결제/후불 모달** — `table-order.html` 미작업 (박람회 D-11)
2. **솔라피→알리고 교체** — `_worker.js` 알림톡 발송부
3. **직원 근태 QR** — 이름+연락처 등록 화면 수정
4. **매출분석** — 7월 테스트 데이터 시딩
5. **용차앱 라우팅 버그** — 접속 시 DONWAY 랜딩

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
OCI IP: 155.248.187.99 (4코어/24GB, opc)
VAPID: BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c
DINE 로그인 셀렉터: #li-email, #li-pw, button[onclick="_dineLogin()"], #app-wrap
```
