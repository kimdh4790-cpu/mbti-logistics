# 세션 인계 메모 — 2026-08-09
> FILO·DINE 관련 작업은 현재 세션(필로다인 전담)이 담당. 다른 세션은 아래 배포 절차만 따를 것.

---

## 다른 세션용 — 배포 절차 핵심 요약

### 코드 수정 후 push 방법 (클라우드 코드에서)
```bash
# 1. 브랜치 확인 (claude/* 형식이어야 자동 머지됨)
git branch

# 2. 커밋 & 푸시
git add 수정한파일.js
git commit -m "feat: 작업내용"
git push -u origin claude/현재브랜치명
```

### push 이후 자동 흐름 (건드릴 필요 없음)
```
push (claude/* 브랜치)
  → auto-merge.yml 자동 실행
    → main 브랜치로 자동 머지
    → KV 업로드 (아래 파일 목록만 자동 업로드됨)
    → Cloudflare 캐시 전체 퍼지 (filo.ai.kr, donway.ai.kr, dine.ne.kr, mbtico.kr, yongcha.app)
```

### KV 자동 업로드 대상 파일 목록
아래 파일들만 push 시 자동으로 KV에 올라감:
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
**목록에 없는 파일**은 push해도 KV에 안 올라감 → 로컬에서 수동 업로드 필요.

### 목록에 없는 파일 수동 KV 업로드 (로컬에서만 가능)
```bash
npx wrangler kv key put --remote \
  --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b \
  파일명 --path ./파일경로
```

### _worker.js 수정 시 주의
- `_worker.js`는 KV 자동 업로드 목록에 없음 → Worker 배포는 로컬에서만
- 로컬 배포 명령 (Windows PowerShell):
```powershell
(Get-Content _worker.js -Raw) -replace '}` + '{' + `status:400', '}' | Set-Content _worker.js
npx wrangler deploy
```
- **클라우드 코드에서는 _worker.js 수정 후 push만** → 로컬에서 별도 배포 필요
- ⚠️ **현재 미배포 상태**: QR 출퇴근 페이지 Firebase/FCM 초기화 코드 + 직원 본인 출퇴근 확인 FCM이 push됐지만 `wrangler deploy` 안 됨 → 로컬에서 반드시 실행할 것

### PR 생성 절대 금지
- push 후 PR 만들지 말 것. auto-merge가 자동으로 main에 머지함.
- `donway-settle-app CI 빨간 표시` → 무시해도 됨 (미사용 프로젝트)

### yongcha.app 배포 (별도)
KV 업로드로는 반영 안 됨. 로컬에서:
```bash
git pull origin main && npx wrangler deploy
```

### mbtico.kr 배포 (별도)
```bash
cd mbtico-pages && npx wrangler deploy
```

---

## 브랜치 상태
- **작업 브랜치**: `claude/n8n-docker-oracle-cloud-shxrod`
- **상태**: push 완료, auto-merge 대기 중 (워크플로우 자동 실행)
- **배포 흐름**: push → `.github/workflows/auto-merge.yml` → main 머지 → `.github/workflows/deploy.yml` → KV 업로드 + 캐시 퍼지

---

## 이번 세션에서 완료한 작업

### 1. filo-auth.js + filo.html — FCM 토큰 등록 (filo.ai.kr)
- `filo.html`에 `firebase-messaging-compat.js` 스크립트 추가
- `_initFiloFCM()` 함수 추가 → `_showApp()` 마지막에 `setTimeout(_initFiloFCM, 2000)` 호출
- 효과: 점주 앱(filo.ai.kr)에서 FCM 토큰 등록 → 알림 출처가 filo.ai.kr로 표시됨
- Firestore: `companies/{did}.fcmTokens` (arrayUnion), `fcmToken`, `fcmCompanyName` 저장

### 2. _worker.js — 출퇴근 FCM 알림 매장명 포함
- 출근/퇴근 알림 2곳 수정 (line ~2878, ~4339)
- title: `${companyName} ${출근|퇴근} 알림`
- url: `https://filo.ai.kr/store/${did}`

### 3. order.js — QR 스캔 시 FCM 자동 등록
- `_showFCMGate()` 리팩토링: 전체화면 모달 제거 → 첫 터치/클릭 시 네이티브 권한 팝업
- `_autoReceiptFCM()` 추가: 주문 완료 시 고객에게 영수증 FCM 자동 발송
- `_submitOrder()` 마지막에 `_autoReceiptFCM(ref.id, total, items)` 호출

### 4. oci-a1-create.yml — 다중 리전 순차 시도
- Tokyo → Osaka → Seoul → Singapore 순서로 순차 시도
- AD, 서브넷, 이미지 모두 `--region $REGION`으로 동적 조회 (하드코딩 없음)
- 기존 인스턴스 확인도 4개 리전 합산으로 변경

### 5. _worker.js + dine-member.js — DINE 직원·회원 FCM 푸시 ⚠️ (wrangler deploy 필요)
- QR 출퇴근 시 직원 본인 폰에 "출근/퇴근 완료" FCM 알림
- 포인트 적립 시 회원 폰에 "N포인트 적립" FCM 알림
- `dine-member.js`는 KV 자동업로드 → 배포됨. `_worker.js`는 로컬 `wrangler deploy` 필요

### 6. member-portal.html — 가입 없이 전화번호만으로 포인트 조회 ✅ (배포됨)
- 버튼: "로그인" → "포인트 확인"
- 회원 없으면 자동 신규 등록 (point:0, source:'member_portal')
- FCM 토큰 자동 등록 → 포인트 적립 시 알림 수신
- `member-portal.html` KV 자동업로드 목록에 추가 완료

### 7. filo-table.js — 테이블 주문 모달 버그 수정 ✅ (최신 커밋)
- **텍스트 색상**: 미결제 항목 `color:var(--tx)` 명시 (어두운 배경에서 글자 안 보이던 문제)
- **금액 중복**: `pendingTotal` 계산 시 `paidTotal` 차감
- **결제하기 flatItems**: 이미 결제된 주문(`o.paid`)은 제외

---

## 미완료 / 확인 필요 항목

### OCI A1.Flex 인스턴스
- 상태: 아직 생성 안 됨 (도쿄 용량 부족)
- 워크플로우 `*/10 * * * *` 로 자동 재시도 중
- **확인 필요**: Osaka/Seoul/Singapore 리전에 VCN/서브넷 있는지
  - OCI 콘솔 → Networking → Virtual Cloud Networks → 리전 변경 후 확인
  - 없으면 "Start VCN Wizard"로 생성 후 워크플로우 자동으로 찾음
- Actions 로그: GitHub → Actions → "OCI A1.Flex 생성" 탭에서 최신 실행 확인

### FCM 영수증 알림 테스트
- 확인 방법: QR 스캔 → 메뉴 선택 → 주문 완료 → 손님 폰에 영수증 알림 오는지
- 픽업 알림은 오고 있음 (filo.ai.kr 도메인으로)
- 영수증은 첫 터치 → 권한 허용 → 주문 완료 순서여야 토큰 있음

### CLAUDE.md 미완료 항목
1. **선결제/후불 모달** — `table-order.html` 미작업 (박람회 D-12)
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
- PR 생성 금지 (push → auto-merge → 배포 자동)
- Playwright 테스트는 로컬에서만
- 외부 API 키 요청 금지 (YouTube, OAuth, Google Cloud 등)

---

## 핵심 상수
```
Firebase: mbti-logistics
KV NS_ID: 7f0e90efaea64f3ab08ff00f8970b28b
테스트 dealerId: 3lqP7HNSgVP18eZbMn6DnQxRXCA2
매장 dealerId:   9XD2K3W1tIhIs6XM74YT0xfRFEP2
OCI IP: 155.248.187.99 (4코어/24GB, opc)
VAPID: BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c
```
