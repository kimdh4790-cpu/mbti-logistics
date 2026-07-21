# 유한회사 엠비티아이 — 개발 인수인계 문서

> 작성일: 2026-07-21 | 작성: Claude (Anthropic) | 담당: 김형우 대표

---

## 1. 회사 기본 정보

| 항목 | 내용 |
|------|------|
| 법인명 | 유한회사 엠비티아이 |
| 사업자번호 | 373-86-02536 |
| 법인등록번호 | 180114-0032740 |
| 소재지 | 부산광역시 수영구 수영로 668, 607호 |
| 대표자 | 김형우 |
| 연락처 | 051-711-3103 |

---

## 2. 운영 플랫폼 현황

### 2-1. DONWAY (donway.ai.kr)
- **역할**: 전업종 정산 자동화 SaaS
- **KV키**: `settle.html` → `donway-pages/index.html` (2541KB)
- **주요 기능**: AI정산 / 배달대행 / QR출퇴근+급여
- **문의 이메일**: all@donway.ai.kr → kimdh4790@gmail.com

### 2-2. FILO (filo.ai.kr)
- **역할**: 외식업 통합 운영 SaaS (키오스크/POS/테이블오더/재고)
- **Worker**: `_worker.js` (425KB)
- **주요 기능**: POS결제 / 테이블오더 / 재고관리 / QR출퇴근 / 예약 / 웨이팅

### 2-3. DINE (dine.ne.kr)
- **역할**: 외식업 특화 (FILO와 Firebase 공유)
- **Worker**: `_worker.js` 내 dine 분기 처리

### 2-4. mbtico.kr (관제센터)
- **역할**: 고객사 승인/관리/기능 on-off
- **Worker**: `mbtico-pages/_worker.js` (515KB) — 메인 Worker와 별도!
- **접속**: mbtico.kr/control

---

## 3. 인프라 구성

### Firebase
- **프로젝트**: mbti-logistics
- **서비스**: Firestore / Auth / Storage / FCM
- **Config**:
  ```
  projectId: mbti-logistics
  authDomain: mbti-logistics.firebaseapp.com
  storageBucket: mbti-logistics.appspot.com
  messagingSenderId: 862900137263
  ```

### Cloudflare
- **Workers**: filo.ai.kr / dine.ne.kr / donway.ai.kr / mbtico.kr
- **KV Namespace ID**: 7f0e90efaea64f3ab08ff00f8970b28b
- **이메일 라우팅**:
  - all@donway.ai.kr → kimdh4790@gmail.com
  - filo-dine@donway.ai.kr → skypjh1101@naver.com

### GitHub
- **저장소**: kimdh4790-cpu/mbti-logistics
- **토큰 (repo)**: Claude 메모리 `/topics/infrastructure.md` 참고
- **토큰 (repo+workflow)**: Claude 메모리 참고
- **자동배포**: push → GitHub Actions → Cloudflare KV

### 자동배포 흐름
```
코드 수정 → GitHub push
→ .github/workflows/deploy.yml 실행
→ Firestore Rules + Indexes 배포
→ Storage Rules 배포
→ 모든 JS/HTML 파일 → Cloudflare KV 업로드
→ Worker 배포
→ 완료 (약 70~90초)
```

---

## 4. 파일 구조 및 역할

### 핵심 파일

| 파일 | 크기 | 역할 |
|------|------|------|
| `_worker.js` | 425KB | DONWAY/FILO/DINE 3개 도메인 라우팅+서빙 |
| `mbtico-pages/_worker.js` | 515KB | mbtico.kr 전용 ⚠️ 별도! |
| `donway-pages/index.html` | 2541KB | DONWAY 정산 앱 (KV키: settle.html) |
| `mbtico_control.html` | 49KB | 관제센터 HTML |
| `mbtico-ctrl.js` | 35KB | 관제센터 JS |

### FILO JS 파일 (리팩토링 분리)

| 파일 | 크기 | 역할 |
|------|------|------|
| `filo-auth.js` | 37KB | 인증+네비+대시보드+라우팅 (메인 진입점) |
| `filo-pos-core.js` | 9KB | POS 카트/결제 핵심 로직 |
| `filo-pos-ui.js` | 32KB | POS 화면+심플/프로 모드 |
| `filo-menu-mgmt.js` | 36KB | 메뉴 관리+엑셀 등록+QR 관리 |
| `filo-menu-recipe.js` | 28KB | 레시피/원가/유통기한/재고 |
| `filo-booking.js` | 34KB | 예약+웨이팅+손님 FCM |
| `filo-report.js` | 42KB | 매출분석+정산리포트+차트 |
| `filo-inventory.js` | 26KB | 재고 대시보드 |
| `filo-payroll2.js` | 23KB | 급여 명세서 관리 |
| `filo-order-common.js` | 23KB | 주문 공통 유틸 |
| `order.html` | 29KB | 테이블오더 손님 화면 |
| `order.js` | 28KB | 테이블오더 로직 |
| `add.html` | 5KB | 빵 진열대 QR 담기 페이지 |
| `wait.html` | 14KB | 손님 웨이팅 현황 페이지 |

### 보안 규칙

| 파일 | 역할 |
|------|------|
| `firestore.rules` | SA 읽기전용 / dealerId 격리 / 공개 허용 목록 |
| `storage.rules` | 18개 경로 dealerId 격리 |

---

## 5. 보안 구조

### Firestore 권한
```
고객사 데이터:
  읽기: 본인(dealerId) + SA(읽기전용)
  쓰기: 본인만 (SA 쓰기 차단!)
  ※ SA = SuperAdmin (kimdh4790@gmail.com 등)

공개 허용 (수정 금지!):
  filo_orders create: true     — 비로그인 고객 주문
  filo_menus read: true        — QR 주문 페이지
  join_requests create: true   — 가입 신청
  statement_share read: true   — 정산서 공유링크
  filo_bookings create: true   — 비로그인 예약
  filo_point_log create: true  — 고객 포인트 적립
  dine_waiting create: true    — 웨이팅 등록
```

### SuperAdmin 계정 목록
- `kimdh4790@gmail.com` — 대표
- `soungkyekim@gmail.com`
- `skypjh1101@naver.com`

---

## 6. 주요 기능별 흐름

### 6-1. 테이블오더 손님 주문
```
손님 QR 스캔
→ /c/{slug}?t={tableNum} (Worker 처리)
→ order.html 서빙 + __FILO_DEALER_ID__ 주입
→ order.js 로딩 → Firestore filo_menus 조회
→ 손님 주문 → filo_orders 저장
→ 사장님 FCM 알림 (ctrl-notify API)
```

### 6-2. 빵 진열대 QR 시스템
```
빵 명판 QR → /add?d={did}&n={name}&p={price}&e={emoji}
→ add.html → localStorage에 저장
→ 테이블 QR 스캔 → order.js 로딩
→ _loadBakeryCart() 자동 실행 → 카트에 추가
→ 음료 + 빵 함께 결제
```

### 6-3. 웨이팅 시스템
```
직원: 웨이팅 등록 → dine_waiting 저장
→ QR 모달 팝업 (손님 폰 스캔용)
→ 손님: QR 스캔 → /wait?d={did}&w={wid}
→ wait.html → 실시간 대기 현황 + FCM 알림 등록
→ 직원: 호출 버튼 → status='called'
→ 손님 폰 푸시: "🎉 순서가 됐어요!"
→ 직원: 착석 처리 → status='seated'
```

### 6-4. 관제센터 승인 흐름
```
고객사 가입 → companies 문서 pending 상태
→ mbtico.kr/control 로그인 (SA만)
→ 가입승인 탭 → 승인 클릭
→ companies.status = 'active'
→ FCM + 카카오알림톡 + 이메일 동시 발송
→ 고객사 앱 활성화
```

### 6-5. 기능 on/off (관제센터)
```
관제센터에서 고객사별 features 체크
→ companies.services 배열에 저장
→ FILO 로그인 시 services 조회
→ hasFeature(key) 함수로 메뉴 on/off
→ 없는 기능은 사이드바에 안 보임

FILO 기능 키:
  kiosk / table_order / inventory
  qr_attend / reservation / member_crm
  sales_analytics / bakery_qr
```

---

## 7. POS 심플/프로 모드

```
Firestore: companies/{dealerId}.posMode
값: 'simple' (기본) | 'pro'

심플 모드: 카드형 UI (이미지 크게, 토스 스타일)
프로 모드: 격자형 UI (기존 POS 스타일)

전환: POS 화면 상단 버튼 클릭
     → _filoPosSetMode() → Firestore 저장
     → localStorage 캐시
```

---

## 8. 새 기능 추가 방법

### JS 파일 추가 시 (3단계 필수!)
```
1. GitHub에 파일 추가
2. _worker.js KV 서빙 목록에 추가
   → 628번 줄 파일 배열에 파일명 추가
3. deploy.yml KV 업로드 목록에 추가
   → for FILE in ... 부분에 추가
```

### 새 페이지 추가 시
```
1. filo-auth.js _buildFiloNav()에 메뉴 항목 추가
2. filo-auth.js _filoGoPage()에 라우팅 추가
3. filo-auth.js titles 객체에 타이틀 추가
4. 해당 JS 파일에 _filoPage함수명() 구현
5. Worker + deploy.yml 등록
```

### 관제센터 기능 추가 시
```
1. mbtico-ctrl.js _DOMAIN_FEATURES에 키/라벨 추가
2. filo-auth.js hasFeature('키') 분기 추가
3. mbtico-pages/_worker.js 인라인 JS에도 반영
```

---

## 9. 저작권 등록 현황

| 저작물 | 접수번호 | 등록일 | 상태 |
|--------|---------|--------|------|
| DONWAY | C-2026-033072 | 2026-07-06 | ✅ 완료 |
| FILO·DINE | 2026-043098 | 2026-07-13 | ⏳ 보완 진행중 |

**⚠️ FILO·DINE 저작권**: 업무상저작물확인서 제출 필요!
- cros.or.kr → 나의저작권 → 보완사항확인
- 기한: 접수일로부터 7일

### 특허 가출원
- 특허고객번호: 1-2026-039396-4 (3건)
- 만료: 2027-05-22 내 정식 출원 필요

---

## 10. 박람회 준비 현황 (8/20 벡스코)

- **일시**: 2026년 8월 20~22일
- **장소**: 벡스코 F-2 부스 (제일창업박람회)

### 완료된 UI 고도화
- [x] 테이블오더 손님화면 리뉴얼 (다크모드/뷰전환)
- [x] 사장님 대시보드 고도화
- [x] 웨이팅 관리 + 손님 FCM
- [x] 정산 리포트 UI
- [x] 급여 명세서 UI
- [x] 재고 대시보드
- [x] 테이블 예약 달력
- [x] 빵 진열대 QR 시스템
- [x] POS 심플/프로 모드

### 남은 작업
- [ ] 전체 버그 테스트
- [ ] 결제 화면 개선
- [ ] 라우트 단가 사라짐 현상 Console 확인
- [ ] filo_menu 복구 (엑셀 등록)
- [ ] FILO·DINE 저작권 보완 제출

---

## 11. 미완료 리팩토링 (박람회 이후)

| 파일 | 현재 크기 | 작업 |
|------|----------|------|
| `mbtico-pages/_worker.js` | 515KB | 경량화 필요 |
| `donway-pages/index.html` | 2541KB | 핵심만 재작성 |
| `emergency.html` | 461KB | 레거시 삭제 |

---

## 12. 배달 캠프 현황

| 캠프 | 협력기사 |
|------|---------|
| 부산1/2/3 | - |
| 대구2 | - |
| 진주M | - |
| **총** | **31명** |

---

## 13. 문의처

| 용도 | 연락처 |
|------|--------|
| 대표 | kimdh4790@gmail.com |
| FILO/DINE 고객 | skypjh1101@naver.com |
| DONWAY 고객 | kimdh4790@gmail.com |
| 회사 전화 | 051-711-3103 |
| 한국저작권위원회 | 이소진 02-2669-0049 |

---

*이 문서는 2026-07-21 기준으로 작성됐습니다.*
*최신 코드는 GitHub: kimdh4790-cpu/mbti-logistics 참고*
