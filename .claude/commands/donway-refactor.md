# DONWAY 정산 리팩토링 + 업종 정리

## ⚠️ 절대 수정 금지
- wrangler.toml
- firestore.rules 구조
- _worker.js 라우팅 구조
- KV 파일명 (settle.html)
- Firestore 컬렉션명

## 🔄 롤백 기준점
작업 시작 전 반드시 현재 HEAD를 태그로 저장:
```
git tag backup-before-refactor-$(date +%Y%m%d)
```
롤백 필요 시:
```
git revert HEAD
```
또는 GitHub: https://github.com/kimdh4790-cpu/mbti-logistics/commit/308bac98047966304aca5d348a04040c19045ca4

## 1. 업종 정리 (삭제 대상)

### 유지할 업종
- **coupang**: 쿠팡 AI정산 (핵심 기능)
- **delivery**: 배달대행 정산

### 삭제할 업종 및 관련 코드
- cleaning: 청소·파견 (calcNet_cleaning, _parseClean, _pageClean 등)
- insurance: 보험설계사 (calcNet_insurance 등)
- construction: 건설·일용직 (calcNet_construction 등)
- quick: 퀵·대리운전 (calcNet_quick 등)
- smallbiz: 소상공인 (calcNet_smallbiz 등)
- service: 서비스업 (calcNet_service 등)
- freelance: 프리랜서 (calcNet_freelance 등)

### 삭제 시 주의
- calcNet() 함수의 업종별 라우팅에서 해당 업종 제거
- UI 메뉴/탭에서 해당 업종 제거
- 관련 파서 함수 전체 제거
- DONWAY 랜딩페이지(donway_landing.html)에서도 해당 업종 제거
- 단, 기존 데이터(Firestore)는 건드리지 말 것

## 2. 버그 수정

### isTLCreated 정산서 문제
- 팀장 배송 없는 달 신규 정산서 생성 시:
  - totalAmt: 0 (현재 팀장수수료가 저장되는 버그)
  - vatIncome: 0
  - coupangTotal: 0
  - 고용/산재 공제 없어야 함 (calcNet에서 isTLCreated 체크)

### 쿠팡 총매출 집계 통일
- 목표값: ₩170,859,518 (VAT포함, 7월 기준)
- isIdSupportCreated || isTLCreated 인 정산서는 모든 집계에서 제외
- 집계 위치 3군데 모두 동일하게 적용:
  1. 정산현황 totCoupang
  2. 기사목록 캠프 합계 gRows.reduce
  3. 기사목록 totIncome

## 3. 리팩토링 목표
1. 불필요 업종 코드 제거로 파일 크기 감소 (현재 ~2.5MB)
2. 아이디지원 블록 주석 정리
3. 집계 코드 단일 함수화
4. isTLCreated/isIdSupportCreated 제외 로직 함수화

## 검증 체크리스트
- [ ] 쿠팡 총매출 ₩170,859,518 확인
- [ ] 아이디지원 7월 정산 확인
  - jeong2384→kws0003 ✅
  - dhkim7909→hyun83 ✅
  - hyun83→kjk ✅
  - kycandksh→hyun83 ✅
- [ ] 팀장수수료 정상 확인 (하현호 vmffkdl321)
- [ ] 배포 후 donway.ai.kr 실제 테스트
