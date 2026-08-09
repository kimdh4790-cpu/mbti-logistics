# 세션 인계 메모 — 2026-08-09

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

### 5. filo-table.js — 테이블 주문 모달 버그 수정 ✅ (최신 커밋)
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
