# 정보수집 시스템 메모
> 작업 전 이 파일 읽을 것. AI 트렌드·앱기능·수익성 아이디어 자동 수집 파이프라인.

---

## 목적
매주 외부 데이터를 자동 수집하여 MBTICO 대표가 빠르게 활용할 수 있도록 정리:
- **강의소재**: 인프런·YouTube에서 핫한 AI·자동화 강의 주제 → "AI 자동화 연구소" 콘텐츠로 활용
- **앱기능**: FILO/DONWAY/용차앱에 추가할 기능·UX 아이디어
- **수익성**: 새 수익 모델·사업 기회·트렌드 → 인프런 신규 클립 기획

---

## 수집 소스

| 소스 | 파일 | 수집 주기 | 키워드/토픽 |
|---|---|---|---|
| 인프런 | `scripts/monitor/inflearn-monitor.js` | 주 1회 | n8n, AI자동화, 노코드, 소상공인, 수익화, Claude API 등 10개 |
| Product Hunt | `scripts/monitor/producthunt-monitor.js` | 주 1회 | AI, no-code, SaaS, productivity, developer-tools |
| YouTube RSS | `scripts/monitor/content-monitor.js` | 일 1회 | 28개 AI 크리에이터 채널 |

---

## 분류 기준 (Claude Haiku 자동 분류)

| 카테고리 | 설명 |
|---|---|
| 강의소재 | AI·자동화·노코드·개발·SaaS·마케팅·수익화 강의 주제 |
| 앱기능 | FILO(매장POS)/DONWAY(정산)/용차앱 기능·UX 아이디어 |
| 수익성 | 새로운 사업 아이템·수익 모델·트렌드·부업 기회 |
| 패스 | 무관한 것 (결과에서 제외됨) |

---

## 실행 방법

### 로컬 실행
```bash
# 전체 다이제스트 (인프런 + ProductHunt + YouTube 결과 종합)
node scripts/monitor/research-digest.js

# 소스별 개별 실행
node scripts/monitor/inflearn-monitor.js
node scripts/monitor/producthunt-monitor.js
node scripts/monitor/content-monitor.js  # YouTube (일별)
```

### GitHub Actions 자동 실행
- **연구 다이제스트**: 매주 월 08:00 KST → `.github/workflows/research-digest.yml`
- **YouTube 모니터링**: 별도 Oracle Cloud cron (매일 09:00 KST)
  ```bash
  # Oracle Cloud에서 crontab -e로 추가
  0 0 * * * cd ~/mbti-logistics && node scripts/monitor/content-monitor.js >> /home/opc/mbtico-logs/content-monitor.log 2>&1
  ```

---

## 출력 파일

| 파일 | 내용 |
|---|---|
| `output/research-digest-{date}.json` | 주간 종합 다이제스트 (카테고리별) |
| `output/inflearn-digest.json` | 인프런 수집 결과 (2주치 유지) |
| `output/producthunt-digest.json` | Product Hunt 수집 결과 (2주치 유지) |
| `output/monitor-digest.json` | YouTube 채널 모니터링 결과 (30일치) |

---

## 알림 방법

### SMS (Aligo)
- 주간 다이제스트: 매주 월 08:00 KST 자동 발송 (최대 5건 요약)
- YouTube 새 영상: 매일 발견 시 즉시 발송

### GitHub Actions Artifacts
- GitHub → Actions → 주간 정보수집 다이제스트 → 최신 run → Artifacts
- `research-digest-{N}.zip` 다운로드 → JSON 파일 확인

---

## 필요한 GitHub Secrets

| Secret | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Haiku 분류 API 키 |
| `ALIGO_API_KEY` | 알리고 SMS API 키 |
| `ALIGO_USER_ID` | 알리고 아이디 |
| `ALIGO_SENDER` | 발신번호 |
| `ADMIN_PHONE` | 수신 전화번호 |

---

---

## 큐레이션 현황 (2026-09-04 기준)

> 수집 시스템 + 박람회 조사 + 시장조사 6팀 결과를 종합한 활용 가능한 인사이트.
> 매주 research-digest 실행 후 이 섹션 업데이트 필수.

### 강의소재 (인프런 · YouTube "AI 자동화 연구소")

현재 등록 완료: 클립 1~6 (n8n 알림톡 / 급여명세서 / 부가세 / 경비장부 / Oracle Cloud / AI 프롬프트 100선)

**다음 제작 우선순위 (수요 높은 순)**

| 순위 | 주제 | 근거 |
|---|---|---|
| 1 | n8n × 구글시트 재고 자동발주 | 소상공인이 가장 많이 묻는 자동화. 클립1 후속으로 자연스러운 흐름 |
| 2 | Claude API 소상공인 실전 활용 (챗봇·답글 자동화) | ProductHunt AI 카테고리 매주 1위 권. 한국어 실전 클립 전무 |
| 3 | 배달앱 정산서 PDF 자동 파싱 (n8n + Claude) | 배달대행 사장님 고통점 1위. DONWAY 연계 홍보 효과 |
| 4 | Oracle Cloud 서버에서 n8n + 크롤링 무료로 운영하기 | 클립5 (Oracle 기초) 후속. 실전 활용 요청 많을 것 |
| 5 | Remotion으로 만드는 자동 홍보 영상 | YouTube AI 강의 채널 연계. 코드로 영상 만들기 관심 높음 |

**YouTube AI 강의 채널 (topics.json 기확정 20편 주제)**
- 매주 수요일 09:00 KST 자동 업로드 예정 (Oracle Cloud cron)
- 우선 제작: 편 1~5 (n8n 기초 / Claude API 입문 / 소상공인 자동화 3가지 / Oracle 설치 / 프롬프트 엔지니어링)

---

### 앱기능 아이디어 (FILO · DONWAY · 용차앱 기능 추가 후보)

박람회 + 6팀 조사 + Product Hunt 트렌드 기반으로 선별

**즉시 구현 가능 (1~2주, 킬러 기능)**

| 기능 | 앱 | 이유 |
|---|---|---|
| 전자 근로계약서 자동 생성 | FILO+DINE | 500만원 벌금 리스크 → 소장이 계약서 쓴다. 경쟁사 전무 |
| AI 리뷰 자동 답글 | FILO | 30초 데모로 "이거 진짜?" 반응. Oracle 네이버 스크래핑 기반 |
| 예약 FCM 이식 | FILO | filo-booking.js에 guestFcmToken 패턴 추가만 하면 됨 |

**중기 구현 (3~6주, 차별화)**

| 기능 | 앱 | 이유 |
|---|---|---|
| 할랄·알레르기 태그 QR 메뉴 | FILO | 관광지 사장님 즉각 반응. 한국 전용 플레이어 없음 |
| 배달대행 연동 (바로고 Gorela API) | FILO | 경쟁사 핵심 기능. developer.gorelas.com 파트너 신청 가능 |
| 급여명세서 PDF 생성 | FILO+DINE | puppeteer/pdfkit, Oracle Cloud에서 실행 |
| 음성 주문 입력 | FILO | 박람회 즉각 반응 기능 1위. STT → filo_orders 저장 |

**장기 (2~3개월)**

| 기능 | 앱 | 이유 |
|---|---|---|
| 네이버 스마트플레이스 자동 동기화 | FILO | 파트너 신청 중. 승인 후 즉시 FILO 메뉴 → 네이버 자동 반영 |
| 바코드 스캔 소매점 모드 | FILO | 편의점·슈퍼 업종 진입. 배달앱 비식품 카테고리 |
| 프랜차이즈 HQ 관제 (완성) | FILO | 가맹점 데이터 집계 → 물류 자동발주 루프 완성 |

---

### 수익성 외부 플랜 (단기~중기 실행 가능한 것만)

**즉시 실행 가능**

| 항목 | 예상 수익 | 다음 액션 |
|---|---|---|
| 인프런 클립 7번 제작 (n8n×구글시트 재고) | 회당 10~30만원 수익 | 클립1 후속으로 구매 전환율 높음 |
| YouTube AI 강의 채널 첫 10편 | 광고수익 + 인프런 유입 | Oracle Cloud cron 이미 설정됨 |
| 토스 ISV GMV 리베이트 | 카드 결제금액의 0.x% | 메일 발송 완료. 승인 대기 |

**3~6개월**

| 항목 | 예상 수익 | 조건 |
|---|---|---|
| 정부 바우처 공급사 등록 | FILO 고객당 월 2.5만원 국비 지원 | 2026년 12월 공고 → 2027년 1월 신청 |
| 프랜차이즈 물류 파일럿 | 건당 1,000원 × 일 300건 = 월 9,000만원 (10브랜드 기준) | Phase 1: FILO 가맹점 10개+ 브랜드 먼저 확보 |
| HW 번들 렌탈 모델 | 월 5만원 렌탈 × 매장 수 | Sunmi T2 Mini + K2 Pro 1set ₩820,000 원가 |

---

## 수정 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-04 | 최초 생성: inflearn-monitor.js, producthunt-monitor.js, research-digest.js, research-digest.yml 구축 |
| 2026-09-04 | 큐레이션 현황 섹션 추가 — 강의소재 5개·앱기능 10개·수익성 외부플랜 6개 정리 |
| 2026-09-04 | channels.json 채널 11개 추가 (AI부업플랜/방구석컴퍼니/코딩못하는중개사/마일드코드/maker39/MONEY_TOUCH/Channel_AION/배움에끝은없다/hs_academy/stevesurfing/with2511) — 17→28개 |
