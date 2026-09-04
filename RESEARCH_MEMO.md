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
| YouTube RSS | `scripts/monitor/content-monitor.js` | 일 1회 | 17개 AI 크리에이터 채널 |

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

## 수정 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-04 | 최초 생성: inflearn-monitor.js, producthunt-monitor.js, research-digest.js, research-digest.yml 구축 |
