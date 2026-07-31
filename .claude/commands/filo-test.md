# FILO·DINE 전체 기능 테스트 및 버그 수정

## 실행 방법
```
claude "FILO·DINE 전체 기능 테스트 및 버그 수정을 진행해줘"
```

## 테스트 대상 기능

### 1. QR 주문 (order.html, order.js, filo-order-common.js)
- filo.ai.kr/order?d={dealerId}&t={tableNum}&name={tableName} 접속 시 메뉴 로드
- 카테고리 탭, 메뉴 그리드 렌더링
- 장바구니 추가/수정/삭제
- 주문 완료 후 filo_orders 컬렉션 저장
- 번역 기능 (EN/中/日) — /api/translate 호출
- 픽업 알림 FCM

### 2. QR 출퇴근 (filo-staff.js, _worker.js /qr)
- filo.ai.kr/qr?did={did}&action=in 접속 시 직원 목록 로드
- 직원 선택 → GPS 확인 → 기기 중복방지
- /qr/members SA API 조회
- /qr/confirm POST 출근 저장
- attendance 컬렉션 저장 확인
- _filoRenderLive 실시간 출근 현황

### 3. 급여·근태 실시간 연동 (filo-payroll2.js, filo-staff.js)
- 출퇴근 → 근무시간 자동 계산
- 급여 자동 계산 (_calcWeeklyAllowance, _calcDeduction)
- 4대보험 공제 계산
- 급여명세서 발송 (_filoDoSendPayslip)
- 실시간 연동 확인

### 4. 번역 기능 (filo-order-common.js, _worker.js /api/translate)
- 메뉴명 EN/中/日 번역
- Anthropic API → Google Translate 폴백
- KV 캐시 24시간 동작

### 5. 키오스크 POS (filo-pos.js)
- 테이블 주문 받기
- 결제 처리 (_filoTablePay)
- 영수증 FCM 알림

### 6. 재고 관리 (filo-inventory.js)
- 재고 현황 조회
- 입고/출고 처리
- 재고 부족 알림

### 7. 예약 시스템 (filo-booking.js)
- 예약 추가/수정/삭제
- 캘린더 렌더링
- 예약 알림톡 발송

### 8. DINE 직원 출퇴근 (dine-staff.js)
- 직원 가입/로그인
- 출퇴근 현황
- 근무 스케줄

## 버그 수정 우선순위
1. 급여·근태 실시간 연동 확인
2. QR 출퇴근 직원 선택 후 출근 저장 정상 여부
3. 번역 API 응답 확인
4. 주문 화면 메뉴 로드 정상 여부

## 주의사항
- ⚠️ wrangler.toml 절대 수정 금지
- Cloudflare Secrets는 대시보드에서만 관리
- 배포 후 반드시 filo.ai.kr 실제 테스트 확인
