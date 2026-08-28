# MBTICO - CLAUDE.md
> 유한회사 엠비티아이 SaaS 모노레포. 세션 시작 시 반드시 이 파일 전체를 읽고 시작할 것.

## 🎯 정확성·검증 우선 응답 원칙 (모든 세션 필수 적용)

1. 사용자 주장·전제에 자동 동의 금지. 사실·논리 먼저 검토 후, 잘못된 부분은 근거 들어 바로잡을 것.
2. 중요 판단·아이디어 검토 시: 숨은 가정·논리적 약점·빠진 위험·반대 근거 먼저 확인. 필요하면 대안 제시.
3. 맞는 부분과 틀린 부분 구분. 일부만 타당하면 장점·한계 함께 명시.
4. 확인된 사실 / 합리적 추정 / 확인 안 된 내용 반드시 구분. 근거 없으면 "확인하지 못했습니다" 명시.
5. 최신 정보·숫자·날짜·기능·정책은 공식 자료로 확인. 확인 불가 시 그 한계 명시.
6. 존재하지 않는 출처·링크·인용문·파일·실행결과 절대 생성 금지. 실제 확인한 자료만 출처로 사용.
7. 사용자가 원하는 결론에 맞추기 위해 사실 변경 금지. 성립 안 되면 이유 설명 후 현실적 방향 제안.
8. 확신 낮으면 불확실한 이유 명시. 어떤 정보가 추가되면 결론이 달라지는지 안내.
9. 답변 전 핵심 주장에 근거 있는지, 사실·추정 혼재 없는지, 미확인 내용을 단정하지 않았는지 점검.

---

## 📋 메모 파일 체계 (무조건 필수)

| 파일 | 읽어야 할 때 |
|---|---|
| `CLAUDE.md` | 매 세션 시작 시 (필수) |
| `SOCIAL_MEDIA_MEMO.md` | 소셜미디어·영상 작업 시 |
| `BUSINESS_MEMO.md` | 비즈니스·요금·POS기·특허·경쟁사 관련 시 |
| `INFRA_MEMO.md` | Oracle Cloud·GitHub Actions·플러그인·OmniRoute 작업 시 |
| `FILO_DINE_MEMO.md` | FILO·DINE 앱 작업 시 |
| `YONGCHA_MEMO.md` | 용차앱 작업 시 |
| `배송앱_변경내역.md` | 배송앱·emergency.html 수정 시 |

### ⚠️ 메모 업데이트 무조건 필수 규칙
- 어떤 작업이든 완료 후 **관련 메모 파일 수정 이력 업데이트 필수**
- 새 정보(계정·API키·서버설정·기능변경) 추가 시 즉시 해당 메모에 기록
- 메모 업데이트 없이 세션 종료 금지

---

## 📹 소셜미디어 작업 시 필독
소셜미디어 홍보 영상 관련 작업은 **SOCIAL_MEDIA_MEMO.md** 먼저 읽을 것.
앱 화면 구성, 계정 정보, 파이프라인 현황, 블로커 목록 전부 정리되어 있음.

---

## 🧪 파일 수정 → 스모크 테스트 (무한 테스트 루프 방지)

파일 수정 후 push 전에 반드시 실행:

```bash
npm run smoke          # 변경된 파일 자동 감지 → 영향 앱만 테스트 (~1분)
npm run smoke:all      # 전체 5개 앱 테스트 (~3분)
npm run smoke:filo     # FILO만
```

### 파일 수정 시 영향 범위 (꼭 확인)
| 수정 파일 | 테스트 대상 |
|---|---|
| `_worker.js` | **전체 5개 앱** (filo, dine, donway, yongcha, mbtico) |
| `filo-common.js` | FILO + DINE |
| `filo-order-common.js` | FILO (order·table-order·store·kitchen) |
| `filo-staff.js` | FILO + DINE (members·attendance 공유) |
| `filo-*.js`, `filo.html` | FILO만 |
| `dine-*.js`, `dine.html` | DINE만 |
| `donway*.js` | DONWAY만 |
| `yongcha*.js` | 용차앱만 |
| `mbtico*.js`, `mbtico-pages/` | MBTICO만 |

---

## 🏢 회사 기본 정보
- 대표: 김형우 / 유한회사 엠비티아이 (사업자번호 373-86-02536)
- 로컬 경로: C:\Users\82104\Desktop\mbti-logistics
- GitHub: kimdh4790-cpu/mbti-logistics (main 브랜치만 사용)

---

## 🔑 인프라 핵심 상수 (절대 변경 금지)
Firebase 프로젝트:   mbti-logistics
Cloudflare Account:  02709cbec18d848913b4246015b9148f
KV NS_ID:            7f0e90efaea64f3ab08ff00f8970b28b
슈퍼어드민:          kimdh4790@gmail.com / soungkyekim@naver.com
테스트 dealerId:     3lqP7HNSgVP18eZbMn6DnQxRXCA2
매장 dealerId:       9XD2K3W1tIhIs6XM74YT0xfRFEP2
Oracle Cloud IP:     161.33.136.154 (4코어/24GB, opc 계정, filo-a1-2c12g)

---

## 📱 앱별 구조 & 담당 파일 (세션 시작 시 담당 앱 확인 필수)

### 🟣 FILO (filo.ai.kr) — 매장 관리 SaaS
> 담당 메모: FILO_DINE_MEMO.md 필독
- **진입**: filo.html / filo-auth.js (로그인·홈 대시보드·라우팅)
- **공통**: filo-common.js ← 절대 직접 수정 금지. 읽기만 허용
- **POS**: filo-pos.js, filo-pos-core.js, filo-pos-ui.js
- **주문**: filo-order.js, filo-order-common.js
- **테이블**: filo-table.js
- **메뉴**: filo-menu.js (55KB), filo-menu-mgmt.js, filo-menu-recipe.js
- **예약/웨이팅**: filo-booking.js
- **직원/QR출퇴근**: filo-staff.js, filo-qr.js
- **급여**: filo-payroll2.js
- **회원**: filo-members.js
- **재고**: filo-inventory.js
- **마진분석**: filo-margin.js
- **결제**: filo-payment.js
- **스케줄**: filo-schedule.js
- **설정**: filo-settings.js
- **리포트**: filo-report.js
- **랜딩**: filo-landing.html, filo-landing.js

**FILO 절대 금지**
- filo-common.js 수정 금지
- Firestore filo_orders 컬렉션 필드명 변경 금지 (tableNum·status·date·dealerId·items)
- tableNum 타입 혼재(String·int) 상태 유지 — 변경 시 전체 주문 조회 깨짐
- _filoToast() 대신 alert() 사용 금지

---

### 🟢 DINE (dine.ne.kr) — 직원 전용 앱
> 담당 메모: FILO_DINE_MEMO.md 필독
- **진입**: dine.html / dine.js
- **스케줄**: dine-schedule.js
- **분석**: dine-analytics.js
- **직원**: dine-staff.js ← FILO의 members 컬렉션 공유 사용
- **급여**: dine-payroll.js
- **매출**: dine-sales.js
- **세금**: dine-tax.js
- **회원·예약**: dine-member.js ← filo_bookings, filo_customers 공유
- **랜딩**: dine-landing.html, dine-landing.js

**DINE 절대 금지**
- DINE용 별도 직원 컬렉션 생성 금지 (FILO members 컬렉션 그대로 공유)
- FILO·DINE 공유 컬렉션: members, attendance, filo_bookings, filo_customers, filo_sales
- _dineToast() 대신 alert() 사용 금지

---

### 🟡 QR 주문·주방 (filo.ai.kr/order·/store·/kitchen)
- order.html, order.js, order-done.html — 고객 QR 주문
- table-order.html — 테이블 직접 주문 (선결제/후불 모달 미완료)
- store.html — 매장 주문 현황
- kitchen.html — 주방 디스플레이
- filo-order-common.js — 메뉴 로딩·번역 공통 (order·table-order·store 공유)

**QR 주문 절대 금지**
- filo_orders 컬렉션 구조 변경 금지
- filo-order-common.js의 _applyTranslationsToGrid() 로직 단독 수정 금지 (order·store 동시 영향)

---

### 🔵 DONWAY (donway.ai.kr) — 물류 정산
- donway_landing.js — 랜딩
- donway-pages/index.html → KV key: settle.html
- drivers.html — 기사 전용 화면

**DONWAY 절대 금지**
- preFreshback / dateFresh 로직 수정 금지
- settle.html / drivers.html 리팩토링 금지
- KV 업로드 시 settle.html 키 예외: `--path donway-pages/index.html`

---

### 🟠 용차앱 (yongcha.app)
- yongcha.html, yongcha-landing.html
- yongcha-worker.js ← 별도 wrangler 설정 (KV 업로드 효과 없음)

**용차앱 절대 금지**
- KV 업로드로 배포 불가. 반드시 `npx wrangler deploy` 사용
- 현재 버그: 접속 시 DONWAY 랜딩으로 라우팅됨 (미수정)

---

### ⚪ MBTICO 관제센터 (mbtico.kr)
- mbtico-pages/ ← 별도 wrangler (cd mbtico-pages && npx wrangler deploy)
- mbtico-ctrl.js — 슈퍼어드민용 (채팅·공지·결제·매장 관리)

**MBTICO 절대 금지**
- mbtico-pages/_worker.js 대규모 수정 금지 (515KB — 분리 작업은 별도 세션에서 계획 수립 후 진행)
- 슈퍼어드민 UID·dealerId 변경 금지

---

### ⚫ 공유 Worker (_worker.js) — 전체 앱 API 라우터
- filo.ai.kr·dine.ne.kr·donway.ai.kr·mbtico.kr·yongcha.app 모두 이 파일 거침
- KV(DONWAY_ASSETS)에서 HTML·JS 파일 서빙
- Firestore SA 키로 서버사이드 Firestore 직접 접근

**_worker.js 절대 금지**
- `}{status:400` 치환 패턴 수정 금지 (Worker 빌드 깨짐)
- wrangler.toml [vars] 수정 금지
- Cloudflare Secrets는 대시보드에서만 관리

---

## 🚫 전체 공통 절대 수정 금지
- wrangler.toml 및 [vars] 섹션
- _worker.js 내 }{status:400 치환 패턴
- Cloudflare KV NS_ID (7f0e90efaea64f3ab08ff00f8970b28b)
- Firebase mbti-logistics 프로젝트 설정
- GitHub Actions secrets (CF_GLOBAL_KEY)
- 슈퍼어드민 UID·dealerId
- deploy.yml 수정 금지 (GitHub App 권한 없음 → auto-merge 실패)
- filo-common.js 직접 수정 금지
- DONWAY preFreshback/dateFresh 로직 수정 금지

## 📦 배송앱 작업 전 필독
emergency.html / _worker.js 수정 전 반드시 읽을 것:
→ `배송앱_변경내역.md` (구조 설명, 절대 금지 사항, 앱별 동작 차이, 변경 이력 포함)
배송앱 수정 후에는 해당 파일 변경 이력도 함께 업데이트할 것.

---

## 📦 배포 규칙

### 클라우드 코드(원격) 자동 배포 흐름
1. 클라우드 코드에서 코드 수정 후 `claude/*` 브랜치 push
2. `.github/workflows/auto-merge.yml` 자동 실행 → main 머지
3. `.github/workflows/deploy.yml` 자동 실행 → KV 업로드 + 캐시 퍼지
- 로컬 작업 불필요. 클라우드 코드 push만 하면 끝.
- donway-settle-app CI 빨간 표시는 무관 (미사용 프로젝트)

### KV 업로드 (로컬 수동)
npx wrangler kv key put --remote --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b [파일명] --path [파일경로]
settle.html 예외: --path donway-pages/index.html

### Worker 배포
(Get-Content _worker.js -Raw) -replace '}` + '{' + `status:400', '}' | Set-Content _worker.js
npx wrangler deploy

### GitHub push
git add -A && git commit -m "feat: [작업내용]" && git push origin main

### yongcha.app (KV 업로드 효과 없음)
git pull origin main && npx wrangler deploy

### mbtico.kr
cd mbtico-pages && npx wrangler deploy

---

## ✅ 작업 규칙
- 명령어 순차 실행 (병렬 금지)
- git stash 사용 금지
- 백그라운드 셸 실행 금지
- 파일 하나 수정  즉시 KV 업로드  확인  다음 파일
- 5개 초과 목록  페이지네이션
- 이모지 금지  Lucide SVG 사용
- 폰트: Pretendard 전용
- alert() 금지  _filoToast()/_dineToast() 사용
- Claude Code 원격 컨테이너: 코드 수정+배포 가능. Playwright 브라우저가 외부 URL 접근 불가 → 녹화/업로드 불가
- Oracle Cloud (161.33.136.154): Playwright + Chromium + Node.js 완전 실행 가능. 녹화·편집·업로드 모두 가능
- wrangler login은 로컬 또는 Oracle Cloud에서만
- Playwright 테스트  반드시 로컬에서 실행
- 배포 확인 필수: push 후 GitHub Actions 워크플로우 완료(success) 확인 → KV 업로드 + Worker 배포 + 캐시 퍼지 3단계 모두 success 여야 배포 완료
- deploy.yml 수정 금지: GitHub App이 워크플로우 파일 수정 권한 없어서 auto-merge 실패 발생함

---

## 🎨 디자인 기준
- 색상: 네이비(#08101f) + 골드(#c9a84c) + 화이트 고정
- 그라데이션 남용 금지
- 모바일 퍼스트 (375px 기준)
- 터치 타겟 최소 44px
- 로딩/빈상태/에러 상태 항상 처리
- 여백: 16px/24px/32px 배수
- 폰트 계층: 24px/16px/14px/12px

---

## ✅ 완료 작업 (2026-08-25)

### DONWAY 구독 요금제 단일화
- donway-pages/index.html: 개인(4,000원)/단체(3,000원) 구분 제거 → 2,500원/인 단일 요금
- 구간 개편: 50/100/200/300/400/500/1000명 (700/1500/2000명 제거, 400명 추가)
- DW_TIERS_IND, DW_TIERS_GRP 모두 2,500원/인 기준으로 통일
- settle-tier-select 옵션 가격 표기 수정 (구 20만/40만… → 12.5만/25만…)
- _showSubModal 구간 버튼 배열 수정 (150→100 버그 수정 포함)
- _tierLabel 함수 및 toast 메시지 2000명+ → 1000명+ 수정
- 모달 내 "카드 등록 불필요" → "계좌이체 월 갱신" 변경

### DONWAY 랜딩 + Worker 요금 동기화
- donway_landing.html: 개인/단체 탭 제거, 가격 카드 2,500원/인 기준으로 수정 (125만/25만/125만/문의)
- donway_landing.html: "카드 등록 없이" 문구 3곳 → "7일 무료체험·계좌이체 월 갱신" 으로 변경
- _worker.js: /join 경로 _fixJoin 패치에서 구 가격 override 제거 → 새 가격으로 수정
- _worker.js: slug 경로 _fixPrices 패치에서 동일하게 새 가격으로 수정
- _worker.js: 개인/단체 svc-settle-card 텍스트 교체 로직 제거 (데드코드)

---

## ✅ 완료 작업 (2026-08-16)

### Firestore 읽기 최적화 (2만/일 → 8천~1만/일 목표, ~40% 절감)
- filo-auth.js: mbetco_sales·menu_costs·inventory 1회 로드 → onSnapshot 콜백 내 반복 get() 제거
- filo-auth.js: filo_sales 중복 onSnapshot 제거 (L851 → L749에 통합)
- filo-auth.js: inventory 배지 onSnapshot → get() 교체
- filo-pos.js: filo_orders onSnapshot 콜백 내 filo_tables.get() 캐시화 (_kioskTablesCache)
- filo-staff.js: attendance 2쿼리(in/out 별도) → 1쿼리(where type in ['in','out']) 통합
- filo-staff.js: members 5분 TTL 캐시 (_membersCache/_membersCacheAt) 전역 적용
- filo-order.js: filo_orders onSnapshot에 date 필터 추가 (JS 필터 → DB 필터)
- filo-margin.js: mbetco_sales 1회 로드 → filo_sales onSnapshot 콜백 내 반복 get() 제거
- filo-booking.js: 예약 확정/거절 시 불필요한 get() 제거 (bookingData 파라미터 추가)
- dine-payroll.js: companies 쿼리 제거 (_CU._company 재사용)
- _worker.js: 번역 KV 캐시 한국어 오염 검증 추가

### Firebase Blaze 플랜 전환 (사용자 직접 필요)
- Firebase 콘솔 → Spark → Blaze 업그레이드 (읽기 5만/일 초과 시 차단 방지)

---

## 🔴 미완료 작업 (2026-08-28 현재 / BEXCO 박람회 완료)

### ✅ 완료 (2026-08-28)
- 솔라피 → 알리고 교체 (_worker.js 알림톡 발송부)
- verifyFirebaseToken JWT 서명 미검증 폴백 수정
- /admin/cleanup-dup-orders, /api/filo-order, /api/point-earn, /order/move-table, /kitchen/update, /api/inquiry, /toss-confirm, /api/emergency-driver-profile, /api/delivery-dispatch 보안 수정
- dine.js 로그인 오류 시 owner 자동 승격 버그 수정
- /qr/register, /qr/confirm dealerId → companies 유효성 검증 추가 (임의 매장 데이터 생성 방지)
- /toss/create-order verifyFirebaseToken 인증 추가 (비인증 결제 주문 생성 방지)
- filo-staff.js 전역변수 충돌(_attendUnsub) + _liveTickerTimer 중복 선언 수정
- filo-pos.js 테이블 onSnapshot date 필터 추가 (Firestore ~25% 절감)
- filo-auth.js kiosk 리스너 누수 + 로그아웃 cleanup 수정
- dine-analytics.js 좀비 쿼리(staff→members) 수정
- DW_TIERS 구요금 → 2,500원/인 단일 요금 동기화

### 최우선
1. 선결제/후불 모달 - table-order.html 미작업
2. FCM 영수증 푸시 - order.js reqReceiptFCM undefined (KV캐시 문제)

### 중간
3. FILO 메뉴 이미지 Pollinations → Pexels 일괄 업데이트
4. 관제센터 채팅/공지/결제 탭 실사용 테스트
5. 직원 근태 QR 이름+연락처 등록 화면 수정
6. 매출분석 7월 테스트 데이터 시딩
7. dine.js N+1 직렬 await → Promise.all 변환
8. filo-staff.js 60초 polling → attendance onSnapshot 전환
9. DINE 페이지 리스너 cleanup 구조 추가

### 파일 분리·경량화 (대형 작업)
10. filo-menu.js 분리 (55KB)
11. filo-pos.js 분리 (39KB)
12. mbtico-pages/_worker.js 경량화 (515KB)
13. emergency.html 재작성 (461KB)

### 법무·인증 (외부 절차)
14. 용차앱 저작권 등록 (cros.or.kr)
15. 벤처기업 인증 (기보 부산지점)

---

## 💳 알림톡 템플릿 ID
정산명세서: KA01TP260618101225825DuJHXpoC4kY
재고발주:   KA01TP260623201607025LtxVxj2AoHI
급여명세서: KA01TP260623201919874SBFmHTNdNft
채널ID:     KA01PF260618094439788FzuY2GxDiSW

---

## 📋 세션 시작 체크리스트
1. CLAUDE.md 전체 읽기 완료
2. 담당 앱 확인 → 해당 메모 파일 읽기
   - FILO·DINE 담당 → FILO_DINE_MEMO.md
3. git pull origin main
4. 미완료 작업 목록 확인
5. 작업 전 대상 파일 절대 금지 항목 재확인

## 📝 메모 업데이트 규칙
- FILO·DINE 파일 수정 시 → FILO_DINE_MEMO.md 수정 이력에 날짜·파일·내용 추가
- 새 캐시 변수 추가 시 → 전역 캐시 변수 섹션 업데이트
- 새 버그 발견 시 → 알려진 버그 섹션에 등록
- 컬렉션 구조 변경 시 → Firestore 컬렉션 구조 섹션 업데이트

---

## 🧪 테스트 계정 (실사테스트용)
관리자: soungkyekim@naver.com / khw3103!!!
딜러ID: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
테스트 매장: filo.ai.kr/store/mbti

### 실사테스트 시 등록할 데이터
직원: 홍길동 / 010-1234-5678 / 시급 10000원
회원: 김테스트 / 010-9999-1111 / 포인트 1000
테이블: 1번~5번
메뉴: 없으면 테스트메뉴 5000원 등록


---

## 📹 소셜미디어 업로드 방법 (API 우선)

### YouTube (Data API v3 — 권장)
- 방식: YouTube Data API v3 (무료, 10,000 유닛/일, 영상 업로드 1,600 유닛)
- n8n 또는 node.js에서 googleapis 라이브러리 사용
- API 키/OAuth 자격증명은 사용자가 Google Cloud Console에서 직접 발급·등록
- Claude는 API 키를 요청하지 않음. 단, 환경변수나 n8n 내에 등록된 키를 사용하는 코드는 작성 가능
- Fallback: API 설정 전까지 Playwright 브라우저 방식 사용 가능

### Instagram (Graph API — 권장)
- 방식: Meta/Instagram Graph API (Reels, 이미지 업로드)
- Facebook Business + Meta Developer 계정 필요
- Fallback: Playwright

### 네이버 블로그 (Playwright — 공식 API 없음)
- 네이버 블로그 공식 포스팅 API 없음 → Playwright만 가능
- `scripts/upload/post-naver-blog.js` 사용

### n8n 자동화 허브 (Oracle Cloud 161.33.136.154 설치 권장)
- YouTube API + Instagram API + Claude API + FFmpeg 워크플로우 통합
- 설치: `bash scripts/setup-n8n.sh`
- 포트: 5678 (Oracle Cloud 방화벽 오픈 필요)

## 📹 영상 제작 방법
1. Playwright로 앱 화면 직접 녹화 (scripts/capture/)
2. FFmpeg으로 자막+BGM 합성 (scripts/compose/)
3. 타입캐스트 API: AI 나레이션 생성 (사용자가 키 등록 시 활용 가능)
4. Kling AI: Playwright 자동화 차단됨 — 사용 금지

---

## 🚨 PR 생성 절대 금지
- 작업 완료 후 PR 생성하지 말 것
- 바로 git push → 머지까지 자동으로
- PR 생성 버튼 누르지 말 것
- 승인 요청 없이 끝까지 자동 진행
- 중간에 멈추지 말 것

---

## 🔍 시장조사 원칙 (필독)
- 시장조사 요청 시 최대한 많고 폭넓게 조사할 것
- 경쟁사는 직접 언급된 것 외에도 유사 카테고리 업체까지 능동적으로 탐색
- 조사 항목: 기능·가격·타겟·하드웨어유무·시장점유율·강점·약점·최근동향 필수 포함
- 노코/SaaS/전통POS/하드웨어 업체 모두 포함해서 전방위 조사
- 정부지원사업·보조금·규제 트렌드도 함께 조사
- 수치·데이터 기반으로 정리 (정성적 표현만으로 끝내지 말 것)
- 조사 후 반드시 FILO·DINE 차별화 포인트 도출까지 완료

---

## 📢 소셜미디어 홍보 메타 (scripts/content/*-meta.json)

> 수정 시 반드시 이 섹션도 업데이트할 것. 마케팅 메시지 기준.

### 핵심 마케팅 포인트 (2026-08-25 기준)
| 제품 | 핵심 메시지 | 요금 |
|---|---|---|
| FILO | 전업종 매장 관리 프로그램 · POS 하드웨어 연동 개발 중 | 요금 문의 |
| DINE | 전업종 분석 프로그램 · FILO+DINE 한 묶음 판매 | 요금 문의 |
| DONWAY | 엑셀 올리면 정산 끝 · AI정산(쿠팡)/배달대행 정산 | ~50명 ₩125,000 / ~100명 ₩250,000 / ~500명 ₩1,250,000 / 1000명+ 문의 |
| 용차앱 | 주선사업자 없는 직접 매칭 · AI 루트코치 | 기사 ₩150,000/월 · 소장 ₩50,000/월 · DONWAY 구독 소장 무료 |

### 서버 기반 AI 기능 (홍보 포인트)
- **FILO**: AI 매출예측(7일)·메뉴추천(날씨/시간대/재고)·마진분석·스케줄최적화·리뷰답글·음성주문·다국어번역
- **용차앱**: AI 루트코치·스마트매칭·단가추천·날씨연동·주유소최저가·세금계산서 자동발행(팝빌)
- **DONWAY**: AI CS봇·카카오 알림톡 서버발송·FCM 푸시·팝빌 세금계산서 자동발행

### 소셜미디어 업로드 스케줄 (Oracle Cloud cron)
- 화요일 09:00 — FILO YouTube
- 화요일 10:00 — FILO Instagram Reels
- 목요일 09:00 — DONWAY YouTube
- 목요일 10:00 — DONWAY Instagram Reels
- 월요일 09:00 — 용차앱 YouTube

### 프로필 이미지 (회사 로고)
- 파일: `assets/logo.png`
- YouTube/Instagram 프로필에 로고 설정 필요 (Playwright upload 스크립트로 처리)
- upload-youtube.js / upload-instagram.js 에 `--set-profile` 옵션 추가 예정

---

## ☁️ Oracle Cloud 자동화 파이프라인

### 전체 흐름 (Oracle Cloud에서 모두 실행 가능)
```
녹화(Playwright) → 편집(ffmpeg-static) → 업로드(YouTube/Instagram/Naver)
```

### 최초 1회 초기 설정 (Oracle Cloud에서 실행)
```bash
# Oracle Cloud SSH 접속
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154

# 초기화 스크립트 실행 (Node.js·Chromium·npm·cron 전부 설정)
curl -fsSL https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/scripts/oracle-init.sh | bash
# 또는 repo 클론 후:
bash ~/mbti-logistics/scripts/oracle-init.sh
```

### 최초 1회 로그인 (Oracle Cloud 또는 로컬 → 복사)
```bash
# 방법 A: Oracle Cloud에서 직접 (X11 포워딩 필요)
HEADLESS=false CHROMIUM_PATH=$(which chromium) node scripts/upload/upload-youtube.js --login-only
HEADLESS=false CHROMIUM_PATH=$(which chromium) node scripts/upload/upload-instagram.js --login-only

# 방법 B: 로컬 PC에서 로그인 후 세션 복사 (권장)
# 로컬에서 로그인 완료 후:
scp -r ~/.mbtico-profiles/ opc@161.33.136.154:~/.mbtico-profiles/
```

### 영상 제작+업로드 실행
```bash
cd ~/mbti-logistics

# 특정 제품 전체 (녹화→편집→YouTube→Instagram)
node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube,instagram

# 전체 4개 제품
node scripts/run-pipeline.js --product all --steps record,compose

# 업로드만 (영상 이미 있을 때)
node scripts/run-pipeline.js --product filo --steps youtube,instagram
```

### GitHub Actions로 원격 실행 (ORACLE_SSH_KEY Secret 등록 필요)
```
GitHub → Settings → Secrets → ORACLE_SSH_KEY: SSH 개인키 내용 붙여넣기
Actions → 소셜미디어 홍보 영상 제작 → Run workflow
```

### Cron 자동 스케줄 (oracle-init.sh 실행 후 자동 설정)
| 시각(UTC) | KST | 제품 | 플랫폼 |
|---|---|---|---|
| 월 00:00 | 월 09:00 | 용차앱 | YouTube |
| 화 00:00 | 화 09:00 | FILO | YouTube |
| 화 01:00 | 화 10:00 | FILO | Instagram |
| 목 00:00 | 목 09:00 | DONWAY | YouTube |
| 목 01:00 | 목 10:00 | DONWAY | Instagram |

### 중요: 업로드 파일 이름 규칙
- 녹화: `output/<product>-raw.webm`
- 편집 후: `output/<product>-final.mp4` + `output/<product>-promo.mp4` (업로드용 동일 파일)
- Reels: `output/<product>-reels.mp4`
- 썸네일: `output/<product>-thumbnail.jpg`

---

## ☁️ Oracle Cloud 로그인
이메일: kimdh4790@gmail.com
비밀번호: khw3103!!
인스턴스: filo-a1-2c12g
IP: 161.33.136.154
리전: Tokyo AD-1
스펙: A1.Flex 4코어/24GB Always Free
SSH 키: ssh-key-2026-08-02
(구 인스턴스 instance-20260802-1554 / 155.248.187.99 — 삭제 여부 확인 필요)
