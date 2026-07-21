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

---

## 14. 용차 앱 기획 (신규 — 개발 예정)

### 비즈니스 모델
```
대리점 (구인자)   ←→   엠비티아이 플랫폼   ←→   기사 (구직자)
노선/물량 공고 등록      수수료 ~10% 마진       지원 및 승인
```

- 택배 대리점이 노선(배송구역/물량/단가)을 공고로 올림
- 기사가 공고를 보고 지원 → 대리점이 승인
- 엠비티아이는 중간 수수료 수익
- 실제 배송은 각 택배사 앱(CJ/한진 등) 대리점 아이디로 처리
- API 연동 없음 — 플랫폼은 매칭만 담당

### 시장 분석
```
✅ 블루오션 — 전용 플랫폼 없음
✅ 현재 방식: 카카오 오픈채팅 / 네이버 카페 / 지인소개
✅ 국내 택배 대리점 약 3만개+
✅ 택배 기사 약 5만명+
✅ 규제샌드박스 특례 부여 중 (2026.05 국토부)
```

### 법적 검토 필요 사항
```
화물자동차운송주선사업 허가 검토 필요
  → 유상으로 화물운송계약 중개 시 주선업 해당
  → 허가관청: 시·도지사 (부산시)
  → 자본금: 1억 5천만원 이상
  → 차량 보유 불필요 (법인/개인 모두 가능)

베타 운영 전략:
  → 수수료 무료로 먼저 운영 (주선업 미해당)
  → 규모 확장 시 허가 신청
  → 규제샌드박스 신청 검토 (최대 5억 지원)

담당 변호사 상담 권장 (30~50만원)
```

### 추천 도메인
```
yongcha.ai.kr  ← 1순위 (기존 패턴 통일)
  → donway.ai.kr / filo.ai.kr / dine.ne.kr 패턴
  → Cloudflare 라우트만 추가하면 됨
  → 별도 도메인 구매 불필요
```

### 핵심 기능 설계

**대리점 기능:**
```
회원가입 / 로그인
노선 공고 등록
  → 택배사 / 구역 / 물량 / 단가 / 기간 / 조건
지원자 목록 조회
기사 승인 / 거절
완료 후 정산 요청
```

**기사 기능:**
```
회원가입 / 로그인 / 프로필 (차량정보/경력)
공고 목록 조회 (지역별/단가별/택배사별 필터)
공고 상세 보기 + 지원하기
승인 알림 수신 (FCM)
일정 관리 (내 노선 캘린더)
정산 내역 확인
```

**플랫폼 관리자 기능:**
```
수수료 자동 계산
회원 관리 (대리점/기사)
공고 모니터링
분쟁 중재
정산 관리
```

### 기술 스택 (예정)
```
Firebase: mbti-logistics 기존 공유
  → Firestore: yongcha_posts / yongcha_applies / yongcha_users
  → Auth: 기존 공유
  → FCM: 기존 공유

도메인: yongcha.ai.kr
Worker: mbtico-pages/_worker.js에 라우트 추가
  또는 별도 yongcha-pages/_worker.js

파일 구조 (예정):
  yongcha.html       — 메인 (공고 목록/검색)
  yongcha-auth.js    — 인증+네비
  yongcha-post.js    — 공고 등록/관리
  yongcha-apply.js   — 지원/승인 관리
  yongcha-settle.js  — 수수료 정산
```

### Firestore 컬렉션 설계 (예정)
```
yongcha_users/{uid}
  type: 'agency' | 'driver'
  name / phone / bizNum (대리점)
  carType / carNum / license (기사)
  region / company (소속 택배사)

yongcha_posts/{postId}
  agencyId / title / region
  courier: 'CJ' | '한진' | '우체국' | ...
  volume / unitPrice / totalPrice
  startDate / endDate
  status: 'open' | 'closed' | 'filled'
  createdAt

yongcha_applies/{applyId}
  postId / driverId / agencyId
  status: 'pending' | 'approved' | 'rejected'
  appliedAt / approvedAt

yongcha_settlements/{settleId}
  postId / driverId / agencyId
  amount / fee / netAmount
  status: 'pending' | 'paid'
```

### 개발 우선순위 (박람회 이후)
```
1단계 (2주): 기본 뼈대
  → 회원가입/로그인 (대리점/기사 구분)
  → 공고 등록 + 목록 조회
  → 지원하기 + 승인/거절

2단계 (2주): 알림 + 정산
  → FCM 푸시 알림 (승인/거절 알림)
  → 수수료 자동 계산
  → 정산 내역

3단계 (1주): 고도화
  → 기사 프로필/평점
  → 지역별 필터
  → 관리자 대시보드

예상 개발 기간: 5~6주
```

### 수익 모델
```
방법 1: 건당 수수료 (추천)
  → 매칭 완료 건당 단가의 10%
  → 정산 완료 후 자동 차감

방법 2: 월 구독
  → 대리점: 월 X만원 (공고 무제한)
  → 기사: 무료 (수수료 없음)

방법 3: 하이브리드
  → 기본 구독 + 건당 소액 수수료
```

---

---

## 15. 용차 앱 — 평가 시스템 설계

### 핵심 철학
```
강제 평가 X → 자연스러운 유도
짧고 직관적 → 별점 + 한 줄
양방향 평가 → 기사↔대리점 서로 평가
누적 신뢰도 → 배지/등급으로 표시
```

---

### 대리점 → 기사 평가 (사용 후)

#### 평가 유도 타이밍
```
노선 종료일 다음날 오전 9시
→ FCM 푸시: "○○님과의 노선이 종료됐어요. 평가를 남겨주세요! ⭐"
→ 앱 진입 시 평가 모달 자동 팝업
→ 평가 완료 전까지 상단 배너 유지
```

#### 평가 항목 (5초 안에 끝나도록)
```
[필수] ⭐ 전체 만족도 (별점 1~5)

[선택] 세부 항목 (탭 한번으로)
  📦 성실함      ← 물량 잘 처리했나
  ⏰ 시간 준수   ← 약속 시간 지켰나
  📞 연락 원활   ← 소통 잘 됐나
  🔁 재계약 의향 ← 또 쓰고 싶은가

[선택] 한 줄 후기 (30자 이내)
  예: "물량 많은데 꼼꼼하게 처리해줬어요"

[선택] 태그 선택 (탭 한번)
  #성실함 #연락빠름 #재계약의향 #물량처리깔끔
  #연락느림 #무단결근 #비추천
```

#### Firestore 저장
```
yongcha_reviews/{reviewId}
  type: 'agency_to_driver'
  postId / agencyId / driverId
  rating: 1~5 (숫자)
  tags: ['성실함','연락빠름']
  comment: "한 줄 후기"
  createdAt
```

---

### 기사 → 대리점 평가 (사용 후)

#### 평가 유도 타이밍
```
노선 종료일 다음날 오전 10시
→ FCM 푸시: "○○대리점 노선은 어땠나요? 다른 기사님들을 위해 후기 남겨주세요 🙏"
→ 평가하면 포인트 100점 지급 (리워드)
```

#### 평가 항목 (기사가 가장 궁금한 것 중심)
```
[필수] ⭐ 전체 만족도 (별점 1~5)

[필수] 구역 퀄리티 (핵심!)
  🏢 아파트 비율    ← 많을수록 좋음
  📦 물량 정확도    ← 공고 내용과 실제 일치 여부
  💰 단가 정확도    ← 약속한 단가 지켜졌나
  🤝 대리점 신뢰도  ← 소장 태도/소통

[선택] 구역 난이도
  😊 쉬워요   😐 보통   😤 힘들어요

[선택] 한 줄 후기 (50자 이내)
  예: "아파트 많고 물량 적당해서 좋았어요. 소장님도 친절!"

[선택] 태그 선택
  #아파트많음 #단가정확 #소장친절 #재계약의향
  #단독주택많음 #물량많음 #단가낮음 #비추천

[중요] 공고 정확도 체크 (신뢰 시스템)
  "공고 내용과 실제가 달랐나요?"
  ✅ 일치함   ⚠️ 조금 달랐음   ❌ 많이 달랐음
  → 허위공고 방지 핵심 기능!
```

#### Firestore 저장
```
yongcha_reviews/{reviewId}
  type: 'driver_to_agency'
  postId / agencyId / driverId
  rating: 1~5
  areaQuality: 'easy'|'normal'|'hard'
  postAccuracy: 'match'|'slight'|'mismatch'
  tags: ['아파트많음','단가정확']
  comment: "한 줄 후기"
  createdAt
```

---

### 신뢰 점수 (Trust Score) 계산

#### 기사 신뢰 점수
```
항목                  가중치
평균 별점             40%
재계약 의향 비율       30%
연락 원활 비율         20%
완료 건수             10%

→ 0~100점 → 등급 변환
  🥉 새내기 (0~40점, 완료 0~2건)
  🥈 일반    (41~70점, 완료 3~9건)
  🥇 우수    (71~90점, 완료 10건+)
  💎 VIP     (91~100점, 완료 30건+)
```

#### 대리점 신뢰 점수
```
항목                  가중치
평균 별점             30%
공고 정확도 비율       40%  ← 허위공고 방지
단가 정확도 비율       20%
재계약 의향 비율       10%

→ 등급 표시
  ⚠️ 주의   (공고 불일치 3회+)
  ✅ 일반
  🌟 인증    (별점 4.5+ / 20건+)
  👑 프리미엄 (별점 4.8+ / 50건+)
```

---

### 앱 내 평가 UI 흐름

#### 기사 앱 평가 화면
```
[노선 완료 후 자동 팝업]

━━━━━━━━━━━━━━━━━━━
  ○○대리점 노선 후기
  CJ대한통운 · 부산 해운대구
  2026.07.15 ~ 2026.07.21
━━━━━━━━━━━━━━━━━━━

전체 만족도
⭐ ⭐ ⭐ ⭐ ☆  (탭으로 선택)

구역은 어땠나요?
[😊 쉬움] [😐 보통] [😤 힘듦]

공고 내용과 실제가 같았나요?
[✅ 일치] [⚠️ 조금 달랐음] [❌ 달랐음]

태그로 표현해보세요 (여러개 가능)
[#아파트많음] [#단가정확] [#소장친절]
[#물량많음]   [#재계약의향]

한 줄 후기 (선택)
[                              ]

[건너뛰기]  [후기 남기기 → +100P]
━━━━━━━━━━━━━━━━━━━
```

#### 대리점 앱 평가 화면
```
[노선 완료 후 자동 팝업]

━━━━━━━━━━━━━━━━━━━
  ○○ 기사님 평가
  완료 건수: 1,247건 · 7일간
━━━━━━━━━━━━━━━━━━━

전체 만족도
⭐ ⭐ ⭐ ⭐ ☆

세부 평가 (선택)
[📦 성실] [⏰ 시간] [📞 연락] [🔁 재계약]

태그
[#성실함] [#연락빠름] [#재계약의향]
[#연락느림] [#무단결근]

한 줄 후기 (선택)
[                              ]

[건너뛰기]    [평가 완료]
━━━━━━━━━━━━━━━━━━━
```

---

### 평가 리워드 시스템

```
기사:
  후기 작성 시           +100P
  사진 첨부 시           +50P
  상세 후기(30자+) 시    +50P
  월 3건 이상 작성 시    +500P (보너스)

  포인트 사용:
    → 프리미엄 공고 먼저 보기
    → 공고 알림 우선 수신
    → 향후 수수료 할인

대리점:
  후기 작성 시           빠른 충원 배지 +1
  → 10건 누적: "성실한 대리점" 인증 뱃지
```

---

### 허위공고 방지 시스템

```
공고 불일치 신고 3회 → 자동 경고 알림
공고 불일치 신고 5회 → 공고 등록 제한 3일
공고 불일치 신고 10회 → 계정 정지 + 관리자 검토

관리자(엠비티아이)가:
  → 대리점에 경고 발송
  → 공고 내용 수정 요청
  → 반복 시 영구 제한
```

---

### 공고 상세 페이지 표시 정보

```
[기사가 보는 공고 상세]

○○대리점 · CJ대한통운
📍 부산 해운대구 ○○동 일대

⭐ 4.7 (23개 후기) · 🌟 인증 대리점

구역 정보
  🏢 아파트 비율: 약 70%
  📦 예상 일 물량: 150~200박스
  💰 건당 단가: 850원
  💵 예상 월수익: 350~420만원

최근 기사 후기
  "아파트 많고 편해요. 소장님 친절" ⭐⭐⭐⭐⭐
  "물량 생각보다 많음. 단가는 정확" ⭐⭐⭐⭐☆
  "재계약 의향 있음" ⭐⭐⭐⭐⭐

공고 정확도: ✅ 95% 일치 (23건 기준)

[지원하기]
```

---

*이 설계는 2026-07-21 기준으로 작성됐습니다.*
*개발 착수 전 UI/UX 검토 및 법적 검토 병행 권장*

*용차 앱 관련 문의: kimdh4790@gmail.com*
*법적 검토 전 상용 서비스 금지 권장*

*이 문서는 2026-07-21 기준으로 작성됐습니다.*
*최신 코드는 GitHub: kimdh4790-cpu/mbti-logistics 참고*
