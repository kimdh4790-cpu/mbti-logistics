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

### KV 업로드
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
- 클라우드 원격 환경 금지  로컬 PC에서만 실행
- Playwright 테스트  반드시 로컬에서 실행

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

## 🔴 미완료 작업 (박람회 D-13, 2026-08-20)

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
관리자: kimdh4790@gmail.com / khw3103!!
딜러ID: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
테스트 매장: filo.ai.kr/store/mbti

### 실사테스트 시 등록할 데이터
직원: 홍길동 / 010-1234-5678 / 시급 10000원
회원: 김테스트 / 010-9999-1111 / 포인트 1000
테이블: 1번~5번
메뉴: 없으면 테스트메뉴 5000원 등록
