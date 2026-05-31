# DONWAY 개발 인수인계서
> 작성일: 2026-05-31 | 작성자: Claude (AI 개발 파트너)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | DONWAY (돈웨이) |
| URL | donway.ai.kr |
| 슬로건 | AUTOMATE EVERYTHING |
| 형태 | B2B SaaS — 물류·배달·소상공인 정산/급여/근태 플랫폼 |
| 대표 | 김형우 (soungkyekim@naver.com) |
| 특허 | 가출원 완료 (특허고객번호 1-2026-039396-4) |

---

## 2. 기술 스택

| 구분 | 내용 |
|------|------|
| 프론트엔드 | 단일 HTML 파일 (settle.html) — 프레임워크 없음 |
| 백엔드 | Cloudflare Workers (_worker.js) |
| 데이터베이스 | Firebase Firestore (mbti-logistics, asia-southeast3) |
| 스토리지 | Firebase Storage (REST API 직접 호출) |
| 인증 | Firebase Auth |
| AI/OCR | Anthropic Claude Haiku (claude-haiku-4-5-20251001) |
| 배포 | GitHub Actions → Cloudflare Workers |
| 도메인 | donway.ai.kr (Cloudflare) |

---

## 3. 레포지토리 구조

```
kimdh4790-cpu/mbti-logistics
├── settle.html              ← DONWAY 메인 앱 (전체 기능)
├── donway_landing.html      ← 서비스 랜딩페이지
├── donway_brochure.html     ← 팜플렛 (A4 가로 5페이지)
├── _worker.js               ← Cloudflare Worker (라우팅/주입)
├── index.html               ← 회사소개 페이지
├── firestore.rules          ← Firestore 보안 규칙
├── firebase-messaging-sw.js ← FCM 서비스워커
├── sw.js                    ← 메인 서비스워커
├── manifest.json            ← PWA 설정
└── .github/workflows/
    └── deploy.yml           ← 자동 배포 설정
```

---

## 4. 핵심 계정 정보

| 항목 | 내용 |
|------|------|
| GitHub | kimdh4790-cpu / ghp_*****(GitHub Secrets에서 관리) |
| Firebase 프로젝트 | mbti-logistics (Blaze) |
| 슈퍼어드민 1 | kimdh4790@gmail.com |
| 슈퍼어드민 2 | soungkyekim@naver.com |
| Cloudflare Worker | mbti-logistics.kimdh4790.workers.dev |
| Anthropic API | ANTHROPIC_API_KEY (Cloudflare Worker Secrets에 저장) |

---

## 5. 배포 방법

### 자동 배포 (권장)
```bash
# GitHub에 push하면 자동으로 Cloudflare에 배포됨
git add .
git commit -m "커밋 메시지"
git push origin main
```
→ GitHub Actions가 Wrangler v4로 자동 배포 (약 20~30초)

### 배포 확인
- GitHub → Actions 탭에서 성공 여부 확인
- donway.ai.kr/settle 접속해서 동작 확인

---

## 6. 주요 기능 목록

### 6-1. 정산 자동화 (핵심)
- 쿠팡 엑셀 업로드 → 기사별 정산 자동 계산
- 라우트별 단가 적용 (RPRICE)
- 프레시백 회수금액 / 인센티브 자동 계산
- VAT 세금계산서 자동 생성

### 6-2. 아이디 지원 기능 (2026-05-31 완성)
- 타인 아이디로 운행한 건수 날짜별 추적 (dateRoutes)
- 지원받은 기사: 기타(+) 자동 가산
- 지원해준 기사: 기타(-) 차감 + 라우트 건수 차감
- 등록: 라우트단가표 → 👥 아이디 지원 관리

### 6-3. 정산 보장금액
- 기사 수정 화면 → 🟡 보장 | 세금계산서 정산 보장금액 입력
- 엑셀 업로드 시 부족분 기타(+)에 자동 채움
- fbDrivers 기반 동기 처리

### 6-4. 세무사 연동
- 세무사 영수증 업로드 → Firebase Storage REST API 직접 업로드
- OCR 자동 인식 (금액/거래처/카테고리)
- 90일 공유 링크 생성 → 세무사에게 전달

### 6-5. Plan Guard (악용 방지)
- 인원 초과 감지 / 월별 누적 카운팅
- 이상 패턴 탐지 → 관리자 알림
- 슈퍼어드민 제외

### 6-6. 기타
- QR 근태 관리
- 배달대행 정산
- 급여 관리 / 달력 메모
- 직원 가입 / 회사 등록 (OCR 사업자등록증 자동인식)

---

## 7. Firestore 컬렉션 구조

| 컬렉션 | 용도 |
|--------|------|
| settlements | 정산 데이터 |
| drivers | 기사 정보 (settleGuarantee 포함) |
| companies | 회사 정보 |
| users | 사용자 계정 |
| idSupport | 아이디 지원 규칙 |
| tax_docs | 세무사 영수증 |
| taxShares | 세무사 공유 링크 |
| subscriptions | 구독 정보 |
| security_logs | Plan Guard 로그 |
| cal_memos | 달력 메모 |

---

## 8. 요금제

| 그룹 | 포함 기능 | 단가 |
|------|-----------|------|
| 그룹1 (유력·콤보) | AI정산+세무사연동+아이디지원 등 | 22,000원/인 (→35,000원 검토중) |
| 그룹2 (QR단독·급여단독) | QR근태 또는 급여관리 | 12,000원/인 |
| 계좌이체 할인 | - | 3% 할인 |
| 무료체험 | 카드등록 불필요 | 7일 |

---

## 9. 알려진 이슈 / PENDING

- [ ] 토스 결제 심사 완료 후 live 키 교체
- [ ] mbetco.kr 도메인 Cloudflare 등록
- [ ] F12/우클릭 차단 재활성화 (현재 디버그용 비활성화 상태)
- [ ] 기사 FCM 알림 허용 안내 추가
- [ ] 요금 35,000원으로 인상 적용
- [ ] 특허 가출원 아이디지원 기능 추가 보정

---

## 10. 새 채팅에서 이어받는 방법

```
"이전 세션 읽어와"
```

→ Claude가 트랜스크립트 읽고 맥락 파악 후 바로 이어서 작업

---

## 11. 주요 버그 해결 이력 (2026-05-31)

| 버그 | 원인 | 해결 |
|------|------|------|
| dateRoutes 빈 배열 | entry 생성 시 누락 | entry에 dateRoutes 추가 |
| 날짜 하루 차이 | XLSX.js 23:59:08 버그 | 23:58 이상이면 +2분 보정 |
| 전체 건수 0 | tDFull push 누락 | _fd.push에 tDFull 포함 |
| Cloudflare 캐시 | Worker 캐시 | fetchAsset에 ?t=Date.now() |
| Storage 오류 | firebase-storage SDK 없음 | REST API 직접 호출 |
| 로그인 탭 안됨 | switchTab 전역 미노출 | IIFE 인라인 onclick |

---

*이 문서는 Claude가 자동 생성했습니다. donway.ai.kr*
