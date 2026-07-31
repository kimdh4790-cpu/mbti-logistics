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


## 업종별 커스텀 테마 시스템

### 업종 분류 (회원가입/설정에서 선택)
- 카페/베이커리
- 한식당
- 일식/횟집
- 중식당
- 패스트푸드/분식
- 이자카야/술집
- 기타 (직접 커스텀)

### 테마 시스템 구현
- CSS 변수 기반 테마 시스템 (--primary, --bg, --card, --accent 등)
- 업종별 기본 테마:
  - 카페/베이커리: 웜브라운(#c8a96e) + 크림(#1a1209)
  - 한식당: 레드(#e05555) + 다크(#0f0a0a)
  - 일식/횟집: 블루(#3b82f6) + 네이비(#0a0f1e)
  - 중식당: 골드(#f59e0b) + 다크레드(#1a0a0a)
  - 패스트푸드: 오렌지(#f97316) + 화이트(#f8f9fa)
  - 이자카야: 골드(#d4af37) + 블랙(#0a0a0a)
  - 기타: 현재 기본 퍼플 테마
- 고객 요청 시 primaryColor/bgColor 직접 입력 커스텀
- Firestore companies/{did}에 theme, primaryColor, bgColor 저장
- 접속 시 매장 테마 자동 로드 적용 (order.html, store.html, kitchen.html 포함)
- 설정 화면에서 테마 미리보기 + 저장 기능

### 주의
- 기본 FILO 다크 네이비+퍼플 테마는 유지
- 테마는 매장별 독립 적용 (다른 매장에 영향 없음)
- wrangler.toml 절대 수정 금지
