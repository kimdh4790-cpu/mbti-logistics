# DONWAY 정산 시스템 리팩토링

## ⚠️ 절대 수정 금지
- wrangler.toml
- firestore.rules 구조
- _worker.js 라우팅 구조
- KV 파일명 (settle.html)
- Firestore 컬렉션명 (settlements, drivers 등)

## 현재 확인된 버그 (수정 필요)

### 1. isTLCreated 정산서 totalAmt 문제
- 팀장 배송 없는 달 신규 정산서 생성 시 totalAmt/vatIncome이 팀장수수료로 설정됨
- 쿠팡 총매출 집계에 포함되는 문제
- 수정: isTLCreated 신규 정산서 생성 시 totalAmt:0, vatIncome:0, coupangTotal:0

### 2. 하현호 신규 정산서 공제합계
- 배송 없는데 고용/산재 공제 -₩34,940 잡힘
- isTLCreated 정산서는 공제 없어야 함

### 3. 쿠팡 총매출 집계 3군데 일치 필요
- 정산현황 (totCoupang): isIdSupportCreated||isTLCreated 제외 ✅
- 기사목록 캠프 합계 (gRows.reduce): isIdSupportCreated||isTLCreated 제외 ✅
- 기사목록 totIncome: isIdSupportCreated||isTLCreated 제외 ✅
- 목표값: ₩170,859,518 (VAT포함)

## 아이디지원 핵심 로직 (검증 완료 — 구조 변경 금지)

### 규칙 정의
- 앞(fid) = 지원받는기사 → 건수 차감, etcMinus 사유 기록 (금액 차감 없음)
- 뒤(tid) = 대신배송기사 → etcPlus 가산
- startDate만 있으면 해당 날짜 하루만 적용 (rEnd=rStart)
- 정산기간: 전월26일~당월25일

### 프레시백 처리
- fd.dateFresh에서 날짜별 집계 → tid에게 이전, fid에서 차감
- 재사용포장재 회수 인센티브 행도 isFreshRow로 처리 (dateFresh에 날짜별 저장)

### 집계 제외 대상
- isIdSupportCreated: 아이디지원으로 생성된 신규 기사 정산서
- isTLCreated: 팀장 배송 없는 달 신규 정산서
- 위 두 가지는 쿠팡 총매출/세금계산서 집계에서 제외

## 리팩토링 목표
1. settle.html(donway-pages/index.html) 코드 정리
2. 아이디지원 블록 모듈화 및 주석 정리
3. 쿠팡 총매출 집계 코드 단일화 (현재 3군데 중복)
4. isTLCreated/isIdSupportCreated 제외 로직 함수화
5. 위 버그 수정 포함

## 작업 순서
1. 현재 코드 전체 파악 (donway-pages/index.html)
2. 버그 수정 (isTLCreated totalAmt 문제, 공제 문제)
3. 집계 코드 단일화
4. 아이디지원 블록 정리
5. 배포 후 검증
   - 쿠팡 총매출 ₩170,859,518 확인
   - 아이디지원 7월 정산 확인 (jeong2384→kws0003, dhkim7909→hyun83, hyun83→kjk, kycandksh→hyun83)
