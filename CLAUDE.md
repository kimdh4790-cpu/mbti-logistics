# MBTICO - CLAUDE.md
> 유한회사 엠비티아이 SaaS 모노레포. 세션 시작 시 반드시 이 파일 전체를 읽고 시작할 것.

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
Oracle Cloud IP:     155.248.187.99 (4코어/24GB, opc 계정)

---

## 🚫 절대 수정 금지
- wrangler.toml
- wrangler.toml [vars] 섹션
- _worker.js 내 }{status:400 치환 패턴
- Cloudflare KV NS_ID
- Firebase mbti-logistics 프로젝트 설정
- GitHub Actions secrets (CF_GLOBAL_KEY)
- 슈퍼어드민 UIDdealerId
- settle.html / drivers.html 리팩토링 금지
- filo-common.js 직접 수정 금지
- DONWAY preFreshback/dateFresh 로직 수정 금지

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
- 클라우드 원격 환경: 코드 수정+배포 가능. Playwright 테스트/wrangler login은 로컬에서만
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

## 🔴 미완료 작업 (박람회 D-4, 2026-08-20)

### 최우선
1. 선결제/후불 모달 - table-order.html 미작업
2. FCM 영수증 푸시 - order.js reqReceiptFCM undefined (KV캐시 문제)
3. 솔라피  알리고 교체 - _worker.js 알림톡 발송부

### 중간
4. FILO 메뉴 이미지 Pollinations  Pexels 일괄 업데이트
5. 관제센터 채팅/공지/결제 탭 실사용 테스트
6. 용차앱 라우팅 버그 (접속 시 DONWAY 랜딩)
7. 직원 근태 QR 이름+연락처 등록 화면 수정
8. 매출분석 7월 테스트 데이터 시딩

### 박람회 이후
9. filo-menu.js 분리 (55KB)
10. filo-pos.js 분리 (39KB)
11. mbtico-pages/_worker.js 경량화 (515KB)
12. emergency.html 재작성 (461KB)
13. 용차앱 저작권 등록
14. 벤처 인증 (기보 부산지점)

---

## 💳 알림톡 템플릿 ID
정산명세서: KA01TP260618101225825DuJHXpoC4kY
재고발주:   KA01TP260623201607025LtxVxj2AoHI
급여명세서: KA01TP260623201919874SBFmHTNdNft
채널ID:     KA01PF260618094439788FzuY2GxDiSW

---

## 📋 세션 시작 체크리스트
1. CLAUDE.md 전체 읽기 완료
2. git pull origin main
3. 미완료 작업 목록 확인
4. 로컬 환경 확인 (클라우드 원격 금지)
5. 작업 전 대상 파일 백업 확인

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

## 🚨 절대 금지 — API 키/OAuth 요청 금지
- YouTube API 키 요청 금지
- OAuth JSON 요청 금지
- Google Cloud 키 요청 금지
- 어떤 외부 API 키도 사용자에게 요청 금지

## 📹 유튜브 업로드 방법 (키 없이)
반드시 Playwright 브라우저 직접 로그인 방식 사용:
1. chromium.launchPersistentContext 또는 channel:chrome 사용
2. https://studio.youtube.com 접속
3. 기존 크롬 로그인 세션 그대로 사용
4. 파일 업로드 → 제목 입력 → 게시
키, OAuth, API 절대 요청 금지. 브라우저 로그인으로만 진행.

## 📹 영상 제작 방법 (키 없이)
1. Playwright로 FILO 앱 화면 직접 녹화
2. FFmpeg으로 자막+BGM 합성
3. Kling AI는 Playwright 자동화 차단됨 — 사용 금지
4. 외부 AI 영상 API 키 요청 금지

---

## 🚨 PR 생성 절대 금지
- 작업 완료 후 PR 생성하지 말 것
- 바로 git push → 머지까지 자동으로
- PR 생성 버튼 누르지 말 것
- 승인 요청 없이 끝까지 자동 진행
- 중간에 멈추지 말 것

---

## ☁️ Oracle Cloud 로그인
이메일: kimdh4790@gmail.com
비밀번호: khw3103!!
인스턴스: instance-20260802-1554
IP: 155.248.187.99
리전: Tokyo AD-1
스펙: A1.Flex 4코어/24GB Always Free
SSH 키: ssh-key-2026-08-02
