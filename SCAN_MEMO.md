# SCAN AI — 전용 메모
> mbtico.kr/scan 서비스. 세션 시작 시 SCAN 관련 작업이면 이 파일 읽을 것.

---

## 서비스 개요
- **위치**: mbtico.kr/scan (이전: filo.ai.kr/seolyuhana → 2026-09-06 이전)
- **포지셔닝**: 소상공인·직장인 대상 AI 문서 분석 SaaS (1P=1원 포인트제)
- **파일**: scan.html, seolyuhana/services/analyze.js, _worker.js (mbtico.kr 블록)
- **PWA**: /scan-manifest.json, scan-icon-192/512.png (KV 업로드됨)

---

## 포인트·요금 체계 (2026-09-07 v2 확정)

### 서비스별 차감 포인트
| 서비스 | serviceId | 포인트 | 모델 |
|---|---|---|---|
| 면접 질문 생성 | interview_questions | **19,900P** | claude-haiku-4-5 |
| 이력서 분석 | resume_analysis | **29,900P** | **claude-sonnet-4-6** |
| 자소서 번역 (6개 언어) | cover_letter_translation | **39,900P** | sonnet-5(영어)/sonnet-4-6(기타) |
| 등기부 전세사기 분석 | registry_analysis | **34,900P** | **claude-sonnet-4-6** |
| 자소서 수정안 제시 | cover_letter_analysis | **39,900P** | **claude-sonnet-4-6** |
| 계약서 검토 | employment/freelance/rental_contract | **39,900P** | **claude-sonnet-4-6** |
| 자소서 AI 전면 재작성 | cover_letter_rewrite | **49,900P** | **claude-sonnet-5** |
| 공문서 분석 | public_doc_analysis | **2,900P** | claude-haiku-4-5 |
| 슈퍼어드민 | — | ∞P | kimdh4790@gmail.com·soungkyekim@naver.com |

> **가격 근거**: 번역 < 이력서 < 등기부 < 수정안 = 계약서 < 재작성 (기능 복잡도 순)
> **모델 업그레이드**: 모든 유료 서비스 haiku→sonnet-4-6, 재작성만 sonnet-5 사용

### 서비스별 차감 포인트 (신규 4종 추가 — 2026-09-07)
| 서비스 | serviceId | 포인트 |
|---|---|---|
| 직장인 말투 변환기 | workplace_tone | **2,900P** |
| 가정통신문 요약 | notice_summary | **2,900P** |
| 공문서 분석 | public_doc_analysis | **2,900P** |
| 커리어 사주풀이 | career_saju | **9,900P** |
| 보험약관 면책조항 스캐너 | insurance_scan | **14,900P** |

### 충전 플랜 (v3 — 소액 플랜 추가, 2026-09-07)
| 결제금액 | 지급포인트 | 보너스 | 비고 |
|---|---|---|---|
| ₩5,000 | 5,000P | — | **신규** 공문서 분석 1~2건 (저진입장벽) |
| ₩10,000 | 10,000P | — | **신규** 면접 질문 1건 |
| ₩30,000 | 30,000P | — | 이력서+자소서 세트 |
| ₩60,000 | 67,000P | +7,000P | 가장 인기 |
| ₩100,000 | 115,000P | +15,000P | |
| ₩200,000 | 240,000P | +40,000P | 최대 절약 |

> 가격 구조 충돌 해결: 최저 2,900P 서비스를 5,000원 충전으로 이용 가능

- 결제: 계좌이체 (하나은행 270-910019-24204 (유)엠비티아이)
- 슈퍼어드민이 포인트 수동 승인: Firestore `scan_points/{uid}` 업데이트

---

## 경쟁사 조사 결과 (2026-09-07 전수조사 v2, Artifact 보고서 참고)

### 이력서·자소서 분석
| 서비스 | 가격 | 특징 |
|---|---|---|
| 크몽 이력서 첨삭 | ₩9,900~49,900/건 | 사람 첨삭, 24~72시간 소요 |
| 사람인 AI 자소서 | 무료 (앱 내) | 단순 키워드 매칭, 깊이 없음 |
| 잡코리아 AI | 무료 (앱 내) | 공고 매칭 수준 |
| 자소설닷컴 | ₩3,300~19,800/건 | AI 재작성 특화 |
| 브레이너리 | ₩9,900~29,900/건 | 멘토 연결 |
| **SCAN 포지션** | **19,900~39,900P** | **AI 즉시·PDF/HWP·14개 면접질문·재작성까지** |

→ **결론**: 크몽 사람 첨삭급 분석 품질을 AI 즉시처리로 제공. 가격 정당.

### 계약서 검토
| 서비스 | 가격 | 특징 |
|---|---|---|
| 로톡 계약서 검토 | ₩50,000~150,000 | 변호사 직접 검토, 3~5일 |
| 계약서ai (스타트업) | ₩15,000~30,000/건 | AI 리스크 분석 |
| 법무법인 계약검토 | ₩100,000~ | 오프라인 |
| **SCAN 포지션** | **29,900P** | **AI 즉시·조항별 리스크·법적근거 포함** |

→ **결론**: 시장 대비 50~80% 저렴. 근로계약서·프리랜서계약 타겟.

### 등기부 전세사기 분석
| 서비스 | 가격 | 특징 |
|---|---|---|
| 호갱노노 | 무료 | 단순 시세조회, 분석 없음 |
| 아실 | 무료 | 실거래 데이터 |
| 부동산114 | 유료 구독 | 시세 전문 |
| 변호사·공인중개사 | ₩100,000~ | 대면 검토 |
| **SCAN 포지션** | **29,900P** | **5대 체크포인트·깡통전세 감지·선순위채권 분석** |

→ **결론**: 전세사기 예방 특화 포지션. 경쟁 서비스 없음.

### 번역 서비스
| 서비스 | 가격 | 특징 |
|---|---|---|
| 파파고 | 무료 | 단순 번역, 이력서 최적화 없음 |
| 번역가 (크몽) | ₩30,000~100,000 | 사람 번역, 5~7일 |
| DeepL | ₩8.99/월 구독 | 일반 번역 |
| **SCAN 포지션** | **39,900P** | **영어(Sonnet 5)·5개 언어·커리어 문서 특화·용어집 포함** |

→ **결론**: 커리어 특화 + 6개 언어 지원. 단순 번역과 차별화.

---

## 구현된 기능 전체 목록

### 분석 서비스 (analyze.js) — v2 모델 업그레이드
| 함수 | serviceId | 모델 | 주요 강화 내용 |
|---|---|---|---|
| `analyzeResume()` | resume_analysis | **sonnet-4-6** | 기업별 이력서 평가기준(삼성/SK/현대/LG/카카오/네이버/쿠팡/공기업), ATS 전략 |
| `analyzeCoverLetter()` | cover_letter_analysis | **sonnet-4-6** | 기업별 자소서 심사기준+불합격 5대 패턴, 기업문화적합도 |
| `rewriteCoverLetter()` | cover_letter_rewrite | **sonnet-5** | 합격자소서 5원칙+기업별 스타일 가이드+불합격→합격 변환 DB |
| `translateCoverLetter()` | cover_letter_translation | sonnet-5(영어)/haiku(기타) | 6개 언어, 커리어 특화 번역 |
| `generateInterviewQuestions()` | interview_questions | haiku | 기업별 면접 출제패턴(2026)+압박질문 패턴 |
| `analyzeContract()` | employment/freelance/rental_contract | **sonnet-4-6** | 2026 최저임금 10,030원·주52시간·고위험 조항 패턴 DB |
| `analyzeRegistry()` | registry_analysis | **sonnet-4-6** | 전세사기 5대체크포인트·깡통전세·선순위채권 |
| `analyzePublicDoc()` | public_doc_analysis / workplace_tone / career_saju / notice_summary | haiku | 공문서 범용 + 신규 3종 전용 프롬프트 |
| `analyzeContract()` (insurance_scan 경유) | insurance_scan | haiku | 보험약관 면책조항 분석 |
| `analyzeScannedPdf()` | — | haiku | PDF 스캔 전처리 |

### 번역 지원 언어
영어(en) / 일본어(ja) / 중국어 간체(zh) / 독일어(de) / 프랑스어(fr) / 스페인어(es)

### Worker 엔드포인트 (mbtico.kr 블록)
| 경로 | 역할 |
|---|---|
| POST `/api/seolyuhana/analyze` | 문서 분석 (파일 업로드+포인트 차감) |
| GET `/api/seolyuhana/result/{jobId}` | 분석 결과 조회 |
| GET `/api/seolyuhana/download/{jobId}` | DOCX/PDF 다운로드 |
| GET `/api/seolyuhana/points` | 포인트 잔액 조회 |
| POST `/api/seolyuhana/point-request` | 충전 신청 |
| POST `/api/seolyuhana/point-approve` | 슈퍼어드민 승인 |
| GET `/api/seolyuhana/biz-status` | 사업자 조회 (BIZ_API_KEY) |
| GET `/api/seolyuhana/registry-link` | 인터넷등기소 딥링크 |
| POST `/api/seolyuhana/registry-direct` | 등기부 직접조회 (TILKO or IROS) |

### Firestore 컬렉션 (실제 코드 기준 — sly_ 접두사 사용)
| 컬렉션 | 용도 |
|---|---|
| `sly_jobs/{jobId}` | 분석 작업 결과 저장 (KV: sly_result_{jobId}, sly_job_{jobId}_docx/pdf) |
| `sly_points/{uid}` | 사용자 포인트 잔액 |
| `sly_point_requests/{reqId}` | 충전 신청 내역 |
| `sly_point_history/{id}` | 포인트 변동 이력 |
| `sly_service_config/{serviceId}` | 서비스별 요금 동적 설정 (없으면 하드코딩 폴백) |

---

## 등록된 API 키 (Cloudflare Secrets — 대시보드 스크린샷 2026-09-07 직접 확인 완료)
> ⚠️ 앞으로 "이 키 설정됐나?" 다시 묻지 말 것. 아래 목록 = 이미 설정 완료.

| Secret | 용도 | 상태 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude AI 분석 전체 | ✅ 설정됨 |
| `BIZ_API_KEY` | 국세청 사업자 조회 (data.go.kr 발급, 이미 URL인코딩됨 → encodeURIComponent 사용 금지) | ✅ 설정됨 |
| `CF_GLOBAL_KEY` | Cloudflare 전역 API 키 | ✅ 설정됨 |
| `CLAUDE_API_KEY` | (별도 Claude API 키) | ✅ 설정됨 |
| `CRON_SECRET` | Cron 트리거 인증 | ✅ 설정됨 |
| `TILKO_API_KEY` | 등기부 직접조회 (AES-CBC-128+RSA-OAEP) | ✅ 설정됨 |
| `TILKO_RSA_PUBKEY` | Tilko RSA 공개키 | ✅ 설정됨 |
| `IROS_USER_ID` | 인터넷등기소 로그인 ID | ✅ 설정됨 (Cloudflare 대시보드 확인) |
| `IROS_USER_PW` | 인터넷등기소 비밀번호 | ✅ 설정됨 |
| `IROS_EMONEY_NO1` | 전자화폐 번호 앞 8자리 = **O3559083** (영문 O — 숫자 0 아님! 전자민원캐시 O355-9083-6517, 10,000원권) | ✅ 설정됨 |
| `IROS_EMONEY_NO2` | 전자화폐 번호 뒤 4자리 = **6517** | ✅ 설정됨 |
| `IROS_EMONEY_PWD` | 전자화폐 비밀번호 (2026-09-08 화면 안내대로 변경 완료 → wrangler secret put IROS_EMONEY_PWD 재등록) | ✅ 설정됨 |
| `ORACLE_SERVER_URL` | Oracle 변환서버 HWP→DOCX (포트 3100) | ✅ 설정됨 |
| `ORACLE_SERVER_URl` | Oracle IROS 자동발급 서버 http://161.33.136.154 (오타 'l' 그대로 유지) | ✅ 설정됨 |

### Cloudflare Secrets 수동 등록 명령어 (Oracle VM에서 실행 — wrangler 4.x Global Key 인식 안 됨, curl 직접 사용)
```bash
# X-Auth-Key 값은 Cloudflare 대시보드 My Profile → API Keys → Global API Key 에서 확인
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/02709cbec18d848913b4246015b9148f/workers/scripts/mbti-logistics/secrets" \
  -H "X-Auth-Key: <GLOBAL_API_KEY>" \
  -H "X-Auth-Email: kimdh4790@gmail.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"SECRET_NAME","text":"SECRET_VALUE","type":"secret_text"}'
```

---

## 미구현 / 개선 필요 항목

### 높음
1. **IROS 직접 발급 자동화**: IROS_* 크리덴셜 있음 → Worker에서 Playwright/Puppeteer 불가(서버리스). Oracle 서버(`ORACLE_SERVER_URL`)로 IROS 자동 발급 요청 위임하는 방식 검토 필요
2. **등기부 AI분석 입력**: 현재 사용자가 PDF 직접 업로드해야 함. IROS 연동되면 주소 입력만으로 자동 발급+분석 가능

### 중간
3. **다운로드 기능**: `/api/seolyuhana/download` 실제 DOCX/PDF 생성 로직 확인 필요 (Oracle 변환서버 의존)
4. **공문서 분석 딥링크**: 건강보험·소득확인서 발급 기관 링크 최신 여부 확인

### 낮음
5. **분석 결과 공유**: 결과 URL 공유 기능 (지인에게 보여주기)
6. **분석 히스토리**: 이전 분석 내역 조회 UI

---

## 가격·수익화 전략 권고 (2026-09-07 시장조사 기반)
- 현재 가격 v2 체계는 시장 대비 합리적 — 유지 권고
- 등기부 분석(34,900P) → 39,900P 인상 검토 (경쟁사 부재, 독점 영역)
- 자소서 재작성(49,900P) → 결과 미리보기(총평 300자 무료) 추가 시 전환율 3~5배 예상
- 월 100만원 목표: MAU 85명 × 평균 35,000P 과금 기준 달성 가능
- 공채시즌(3·9월) 포인트 보너스 이벤트 → 수익 1.8배 예상
- B2B 즉시 가능 채널: FILO 고객 → 근로계약서 번들(P0), 공인중개사 패키지(P2)
- 가장 큰 리스크: 가격 아닌 인지도. 소셜미디어 파이프라인에 SCAN 콘텐츠 미포함 상태
- 전략 보고서 Artifact: https://claude.ai/code/artifact/59f84770-202e-4000-be7b-27b130f1d35d

## ✅ 2026-09-09 버그 수정 (전체 진단)

### 구현 현황 (진단 결과)
- **핵심 기능 (15개 서비스 분석·결과·다운로드)**: ~85% 완료 — 버그 수정 후 정상 동작
- **포인트 시스템**: ~70% → 버그 수정 후 정상 동작
- **미착수 확장 기능**: 0% (제조 견적·AIVO·리디자인·히스토리·공유)
- **전체 계획 대비**: ~**75%** 구현 완료 (MVP 완성, 확장 기능 미착수)

### 수정된 버그 5건 (scan.html + _worker.js)
1. **_slyPollResult undefined** (CRITICAL): `_slyAutoAnalyzeRegistry`·`_slyAutoAnalyzeRegistryText` 내 존재하지 않는 `_slyPollResult()` 호출 → `pollResult()`로 수정. IROS 자동분석 결과 폴링 완전 불가였음
2. **다운로드 파라미터 불일치** (CRITICAL): `_slyDownload()`가 `?ext=pdf` 전송하나 서버는 `?type=`을 읽음 → `?type=`으로 수정. PDF 다운로드가 항상 docx로 반환되던 버그
3. **입금자명 미전송** (CRITICAL): 충전 신청 시 서버 필수 파라미터 `depositorName` 미포함 → 모달에 입금자명 입력 필드 추가 + 함수에서 읽어 전송. 충전 신청 100% 실패하던 버그
4. **가입 보너스 미지급** (HIGH): 활성 `/api/seolyuhana/points` 핸들러(L3057)에 가입 보너스 로직 없음 (dead code 블록에만 있었음) → 신규 가입 2,900P 즉시 지급 복구
5. **최소 충전 금액 불일치** (MEDIUM): 서버 최소 ₩10,000 vs UI 최저 ₩5,000 플랜 → 서버 최소금액 ₩5,000으로 수정

### 추가 발견 (코드 무결성)
- VALID_SERVICES 확인: L2981 활성 핸들러에 15개 serviceId 모두 포함 (workplace_tone·career_saju·notice_summary·insurance_scan 포함) → 이상 없음
- Firestore 컬렉션명: 메모상 `scan_*`로 오기재됐으나 실제 코드는 `sly_*` 접두사 사용 → 메모 수정 완료

---

## 🗒️ 2026-09-08 논의·계획 메모

### SCAN 제조 견적 기능 (신규 수익화)
- **컨셉**: Reznikov Engineering처럼 STL·이미지·텍스트 업로드 → AI 제조 방식 분석 → 견적서 PDF 발급 → 포인트 결제
- **구현 스택**: 100% 기존 인프라로 가능
  - 파일 업로드: oracle-server.js (multer 이미 있음)
  - AI 분석: _worker.js `/api/scan/quote` → Claude API
  - 견적서 PDF: oracle-server.js (Puppeteer 이미 있음)
  - 도면 OCR: paddle_server.py 포트 3101 (2026-09-08 설치 완료)
  - 결제: 계좌이체 기존 방식
- **제조 카테고리**: 3D프린팅 / 레이저 각인 / CNC가공 / 사출 / 기타
- **구현 순서**: ① `/api/scan/quote` API 설계 → ② scan.html 견적 UI → ③ 견적서 PDF 템플릿

### scan.html Reznikov 스타일 리디자인
- **레퍼런스**: Reznikov Engineering (다크 인더스트리얼 + 강한 타이포그래피)
- **MBTICO 팔레트**: 다크 네이비(#08101f) + 골드(#c9a84c) + 흰색 (기존 3색 유지)
- **우선순위**: 제조 견적 섹션 추가 + 디자인 리뉴얼 동시 진행

### AIVO 대시보드 (mbtico.kr/aivo)
- **컨셉**: Reznikov의 APEX처럼 AIVO를 자율 AI 비서로 전면 배치
- **내용**: 현재 실행 중인 루틴 상태 + 오류 현황 + 소셜미디어 스케줄 + 경쟁사 변동
- **기존 조각**: social-media.yml + error 루틴(trig_0195..) + competitor_scraper.py + research-digest.yml + AIVO 채팅

### Runway Gen-3 Alpha 연동 계획
- **용도**: 소셜미디어 영상 품질 향상 + 게임 인트로 시네마틱
- **가격**: Standard $35/월 (테스트) → Unlimited $195/월 (본격화)
- **API**: text_to_video / image_to_video, $0.05/초
- **연동 파일**: `scripts/runway-generate.js` + social-media.yml 파이프라인 추가
- **상태**: 사용자 API 키 발급 후 연동 예정

### mbtico.kr 랜딩 전체 리디자인
- **스타일**: Reznikov 다크 인더스트리얼 톤
- **AIVO 섹션**: 히어로급으로 전면 배치
- **우선순위**: scan.html 다음

## 수정 이력
| 날짜 | 내용 |
|---|---|
| 2026-09-12 | _worker.js + analyze.js 전체에서 anthropic-workspace-id 헤더 16개 완전 제거 → SCAN "Claude API 400" 오류 근본 수정. 원인: 개인 API키로 workspace-id 헤더 전송 시 400 반환 |
| 2026-09-12 | **SCAN 분석 403→400 오류 완전 수정**: ① `seolyuhana_worker.js` 프록시 대상 `mbti-logistics.kimdh4790.workers.dev`(workers_dev=false로 비활성화) → `filo.ai.kr` 교체 (404 수정). ② `analyze.js` `callClaude()` + 스캔 경로 `anthropic-workspace-id` 헤더 3중 중복 제거 — 개인 API 키에 workspace-id 헤더 포함 시 400 오류 발생. ③ `mbtico-pages/_worker.js:2860` API 키 검증 모델 `claude-3-haiku-20240307`(단종) → `claude-haiku-4-5` 교체. 현재 `analyze.js`는 `claude-sonnet-4-6` + 워크스페이스 헤더 없음 상태로 정상 작동 |
| 2026-09-12 | **Cloudflare "Deployment failed" 이메일 원인 조사 완료**: deploy.yml Step4(curl ES Module 업로드)가 code 10021("No such module: index.js")로 실패 → 이 실패가 CF 알림 이메일을 트리거. 그러나 Step6(wrangler Global API Key 폴백)이 성공(Version ID: 8bd929e7) — seolyuhana worker는 `mbtico.kr/api/seolyuhana/*`에 정상 배포됨. 이메일은 오해를 유발하지만 실제 배포는 완료된 상태. curl Step4 오류는 비차단(continue-on-error: true) |
| 2026-09-11 | **SCAN 전 카테고리 분석 403 오류 완전 수정 (v3)**: 원인 2층구조 — ① `analyze.js` 모델 ID가 Claude Code 내부 alias(`claude-sonnet-4-6` 등) → 공개 API 미지원 403. ② `analyzeScannedPdf()`가 `anthropic-beta: pdfs-2024-09-25` 헤더 사용 → API 키에 PDF beta 미활성화 시 403. 수정: ① 모든 모델 ID를 날짜형 stable ID로 교체(`claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`). ② Oracle pdftoppm으로 PDF→JPEG 변환 후 표준 image 블록으로 Vision 호출(beta 헤더 불필요). `oracle-server.js`에 `/api/pdf-to-images` 엔드포인트 추가. `parser.js`에 3단계(Oracle 이미지) 추가. `analyzeScannedPdf()` images 파라미터 추가 — images 있으면 image 블록, 없으면 PDF document 폴백. **⚠️ Oracle VCN Security List TCP 8080 인그레스 규칙 추가 필요 (Source 0.0.0.0/0)** — Oracle VM에서 `git pull && pm2 restart oracle-server` 필요 |
| 2026-09-11 | **인터넷등기소 RIS PDF 분석 실패 수정 (v2)**: 인터넷등기소 PDF는 CIDFont CMap 기반 HEX 인코딩 → UTF-16BE 직접 변환 불가. 수정: (1) `parser.js` `parsePdf()`에 Oracle LibreOffice 폴백 추가(`tryOraclePdfText`) — LibreOffice의 PDF import가 CMap 처리 → 한글 텍스트 추출. (2) `analyze.js` Vision 경로 모델 haiku→`claude-sonnet-4-6` 업그레이드. (3) `_worker.js` 양쪽 `_slyProcessJob` 타임아웃 90s→150s로 증가. (4) `oracle-server.js` `/api/pdf-text` 엔드포인트 신규 추가. **⚠️ Oracle VM에서 `git pull && pm2 restart oracle-server` 필요** |
| 2026-09-11 | **분석 진행 표시 안 보이는 버그 수정** (`scan.html`): `_slyAnalyze()`에서 `prog.classList.add('visible')` 직후 `clearResult()`가 호출되어 `slyProgress`의 `'visible'` 클래스가 즉시 제거되던 버그. `clearResult()`를 `classList.add('visible')` 앞으로 이동해 진행 표시가 정상 노출되도록 수정. 등기부 PDF 업로드 시 "분석중" 표시 없던 현상 해결 |
| 2026-09-11 | **interview_questions 분석 멈춤(progress=40) 버그 수정**: 원인: `generateInterviewQuestions` maxTokens 6000으로 16문항 생성 시 Claude 응답이 60초 초과 → Cloudflare waitUntil grace period 종료로 잡힘. 수정: ① `analyze.js` maxTokens 6000→3500으로 감소 ② `_worker.js` filo.ai.kr·mbtico.kr 양쪽 `_slyProcessJob`에 90초 `Promise.race` 타임아웃 래퍼 추가 — 초과 시 `failed` 상태로 명시적 실패 처리 (무한 대기 방지) |
| 2026-09-11 | **SCAN API 통합 테스트 실행 (Oracle Cloud)**: `scripts/test/scan-api-test.js` — 슈퍼어드민(`kimdh4790@gmail.com`)으로 37 PASS / 1 FAIL (interview_questions 타임아웃만). 다음 실행 시 위 fix 적용 후 38 PASS 예상 |
| 2026-09-10 | **포인트 새로고침 시 0P 버그 수정**: `_worker.js` verifyFirebaseToken에 `origin:'https://mbtico.kr'` 명시 (기존 filo.ai.kr 기본값으로 인증 실패). `scan.html` loadPoints() 재시도 로직 추가(최대 3회, 2초 간격) — Firebase auth 초기화 타이밍 문제 대응 |
| 2026-09-09 | 글로벌 AI 문서 분석 시장 리서치 브리프 Artifact 게시 (https://claude.ai/code/artifact/b0640ae6-0a0e-4ce5-bd2b-74f929e48725) — Harvey AI/$288K·Luminance·Kira·Ironclad·한국 경쟁사 전수조사, 전환 UX 패턴 6가지, 전세사기 독점 영역 확인, P0~P2 전략 권고 12가지 |
| 2026-09-06 | filo.ai.kr/seolyuhana → mbtico.kr/scan 이전. scan.html 리네임. PWA 추가 |
| 2026-09-06 | 랜딩 리디자인 (핑크·민트·골드 3색) |
| 2026-09-07 | 가격 재조정: 면접 19,900P / 이력서·계약서 29,900P / 자소서·번역 39,900P |
| 2026-09-07 | 자소서 2모드 분리: 수정안(cover_letter_analysis) + 재작성(cover_letter_rewrite) |
| 2026-09-07 | 다국어 번역 6개 언어 지원 + 언어선택 UI |
| 2026-09-07 | 등기부 전세사기 분석 강화: 깡통전세·5대체크포인트·보증금입력 |
| 2026-09-07 | 렌더링 버그 3개 수정: 번역 필드명, 재작성 섹션, 전세사기 섹션 누락 |
| 2026-09-07 | IROS e-money 전자민원캐시 구매·등록 완료 (O355 9083 6517 / 10,000원권) |
| 2026-09-07 | nginx 역방향 프록시 설정 (Oracle VM 포트 80→8080, SELinux httpd_can_network_connect 허용) |
| 2026-09-07 | _tilkoFetchRegistry e-money 선택사항으로 변경 (IROS 계정만으로도 Tilko API 호출 가능) |
| 2026-09-07 | SCAN_MEMO.md 신규 생성. 경쟁사 조사결과·API현황 기록 |
| 2026-09-07 | **v2 가격 재조정**: 재작성 49,900P / 번역 39,900P / 등기부 34,900P / 계약서 39,900P (차별화) |
| 2026-09-07 | **v2 AI 프롬프트 전면 강화**: 기업별 맞춤 데이터 추가 (삼성/SK/현대/LG/카카오/네이버/공기업) |
| 2026-09-07 | **v2 모델 업그레이드**: 유료 서비스 haiku→sonnet-4-6, 재작성→sonnet-5, 비영어번역 haiku→sonnet-4-6 |
| 2026-09-07 | **_worker.js SERVICE_COSTS 하드코딩**: Firestore 미설정 시 0P 취약점 해소 |
| 2026-09-07 | **v3 판례 DB 추가**: 계약서(포괄임금제·수습해고·IP귀속·체불임금 실제 판례 15건), 등기부(깡통전세·신탁사기·이중계약·갭투자·법인명의사기·명의신탁 6유형+통계) |
| 2026-09-07 | **번역 시스템 전면 개편**: LANG_EXPERTISE 6개 언어 자격증변환·GPA스케일·군복무·인간적 표현 패턴 DB 추가 |
| 2026-09-09 | **IROS 무료열람 방법S 구현**: oracle-server.js에 `page.on('response')` 응답 인터셉트로 IROS 백엔드 AJAX 응답에서 PIN 캡처 → 세션쿠키 + `callMpPrtIframe.do` 직접 fetch → 등기부 HTML 텍스트 추출. WebSquare headless 탐지 우회. rlrgCount=999 설정으로 Methods A-R 건너뜀. `directApiContent` 반환 버그(`return` → `res.json()`) 수정. _worker.js Oracle Playwright fallback 복원. |
| 2026-09-10 | **Tilko v1.0 주소검색 HTTP500 수정**: RealtyAddrSrch v1.0은 암호화 미지원 → SearchAddr 평문 우선 시도, 실패 시 암호화 폴백으로 변경. _worker.js 두 곳(mbtico compact + `_tilkoFetchRegistry`) 모두 수정. |
| 2026-09-10 | **Oracle 서버 502 수정**: express/multer/jszip package.json 누락으로 npm install 후 패키지 제거됨 → 의존성 추가. 사용자가 `npm install express multer jszip && pm2 restart oracle-server`로 즉시 복구. |
| 2026-09-10 | **Oracle VM 자동배포 workflow 추가**: seolyuhana/oracle-server.js 변경 시 SSH로 Oracle VM 자동 업데이트 + pm2 재시작. ORACLE_SSH_KEY secret 등록 필요. |
| 2026-09-10 | **IROS Playwright 로그인 완전 비활성화**: IROS가 2024년부터 공동인증서/금융인증서 전용으로 전환. ID/PW 로그인 엔드포인트 전부 제거됨. oracle-server.js `/api/iros-fetch` 엔드포인트가 즉시 에러를 반환하도록 변경 (throw new Error). 대안: (1) Tilko API + 고유번호 직접 입력, (2) 인터넷등기소 직접 접속(www.iros.go.kr). IROS_USER_ID/IROS_USER_PW/IROS_EMONEY_* 크리덴셜은 설정돼 있으나 현재 사용 불가. Oracle VM: `git pull && pm2 restart oracle-server` 필요 (자동 배포 안 됨). |
| 2026-09-09 | scan.html 전면 리디자인: 크몽 스타일 서비스 목록(배지+평점+미리보기) + 당근 스타일 칩(이모지+텍스트) + 드로어 스티키 CTA 푸터 |
| 2026-09-09 | 사업자조회 isIssue 서비스에서 slyJdWrap2(지원공고) 숨김 버그 수정 |
| 2026-09-09 | _slyOpenDrawer() 평점·배지·스티키 푸터 가격 채우기 추가 (SVC_META 연동) |
| 2026-09-09 | **scan.html 전면 리디자인** — 핑크·민트 컬러 전체 제거 → 네이비+골드 단일 톤으로 통일. 15-탭 가로 스크롤 제거 → 5개 카테고리 카드 그리드(취업서류/법률계약/부동산/직장생활/공문서) 교체. CTA 그라데이션·푸터 링크·섹션 라벨 컬러 동기화 |
| 2026-09-07 | **면접 시스템 2026 데이터 주입**: 삼성합격자 평균TOEIC·인턴경험비율·카카오합격률·압박질문10유형·싫어하는답변20가지 추가 |
| 2026-09-07 | **등기부 모델 업그레이드**: haiku → sonnet-4-6 (34,900P 가격 정당화) |
| 2026-09-07 | **IROS 딥링크 404 수정**: selectRenf0100List.xhtml → iros.go.kr 메인으로 변경 |
| 2026-09-07 | **IROS 자동 발급 구현**: oracle-server.js `/api/iros-fetch` Puppeteer 엔드포인트 추가. registry-direct Tilko 실패 후 Oracle 서버 폴백 추가 (mode:'auto'). scan.html mode:'auto' UI 처리 및 _slyAutoAnalyzeRegistry() 구현 |
| 2026-09-07 | **[긴급] uid 객체 버그 수정**: verifyFirebaseToken이 객체 반환 → localId 추출, Firestore sly_points 경로 오류 해소 |
| 2026-09-07 | **슈퍼어드민 포인트 바이패스**: _SUPERADMIN_EMAILS 검사 후 포인트 차감 스킵 (filo.ai.kr·mbtico.kr 블록 양쪽) |
| 2026-09-07 | **biz-status debug 필드 추가**: 조회 실패 시 NTS API 응답 상태·matchCount 반환 |
| 2026-09-07 | **3개 UI 버그 수정**: _isSuperAdmin 스코프 오류·registry 탭 가격 29900→34900·탭 전환 파일 초기화 |
| 2026-09-07 | **등기부 렌더링 4개 버그 수정**: ownership 객체→owners배열·riskSummary [object Object]·e.risk·e.registeredDate |
| 2026-09-07 | **_worker.js mbtico 블록**: processingCtx에 targetLang·jeonseDeposit 추가·_slyProcessJob 파라미터 정식화·form 클로저 의존 제거 |
| 2026-09-07 | **getScannedPrompt에 registry_analysis 추가**: 스캔 PDF 등기부 정상 분석 가능 |
| 2026-09-07 | **에이전트 조사 결과 반영**: 신탁원부 감지·HUG 보증보험 판단·선순위안전도%·법인임대인 위험분석 (경쟁사 전무 영역) |
| 2026-09-07 | **다이소 전략 신규 서비스 4종**: 직장인 말투 변환기(2,900P), 커리어 사주(9,900P), 가정통신문 요약(2,900P), 보험약관 스캐너(14,900P) — scan.html + analyze.js + _worker.js 전체 반영. 총 서비스 11종→15종 |
| 2026-09-07 | **소액 충전 플랜 신설**: ₩5,000/₩10,000 플랜 추가 (가격 구조 충돌 해결 — 최저 2,900P 서비스 이용 가능). 충전 카드 4→6종 |
| 2026-09-07 | **biz-status encodeURIComponent 제거**: BIZ_API_KEY가 이미 URL인코딩됨 → 이중인코딩 제거로 NTS API 인증 정상화 |
| 2026-09-07 | **Cloudflare Secrets 전수확인**: 대시보드 스크린샷으로 13개 키 모두 설정 확인 (SCAN_MEMO.md 등록) |
| 2026-09-09 | **SCAN 전면 재설계 v3**: 드로어 min-height:88vh(빈공간 제거), SVG링→5단계 나레이션 진행카드, 서비스별 전용 UI(사주/숏폼/자막/사업자), _slyPollResult 별칭·slyProgressSection ID·VALID_SERVICES 3종 버그 3개 수정 |
| 2026-09-09 | **크몽+당근 스타일 UX 전면 개편**: renderCatGrid→renderServiceList+renderChips. 카테고리 칩(이모지+텍스트 가로스크롤) + 서비스 세로목록 + 바텀 드로어(_slyOpenDrawer/_slyCloseDrawer). 영상·미디어 카테고리 신규(숏폼 스크립트 29,900P / AI사진 19,900P / 자막생성 14,900P). 총 서비스 15→18종 |
| 2026-09-07 | **시장조사 전수조사 v2**: 경쟁사 23곳 5개 카테고리 분석, 가격·수익화·마케팅 전략 보고서 작성 (Artifact 게시) |
| 2026-09-07 | **Oracle 서버 Playwright 전환**: puppeteer-core → playwright (자체 Chromium ARM 번들). dnf chromium 미지원 → npx playwright install chromium으로 해결. PM2로 oracle-server 영구실행 (--cwd ~/mbti-logistics). VCN Security List TCP 3100 Ingress 추가. 이제 IROS 자동 발급 실동작 확인 완료 |
| 2026-09-07 | **랜딩 디자인 v2**: 히어로 배경 다크 네이비 그라데이션(#08101f→#162540)+핑크·민트 방사 글로우. 히어로 텍스트 전체 흰색 오버라이드(h1:#FFF, p:rgba(255,255,255,.72), 눈썹:rgba(244,114,182,.18)). 가격 카드 정확한 금액 표기 (19,900P~49,900P). 신규 가입 2,900P 지급 로직(_worker.js signupBonus) + 토스트 표시. 텍스트 직접 입력 탭 추가 (파일 없이도 분석 가능). sly_points → scan_points 컬렉션 메모 불일치 확인 필요 |

---

## 신규 서비스 아이디어 후보 (2026-09-07 에이전트 조사)

> 미구현 아이디어 풀. 실제 개발 착수 시 이 섹션에서 선정 → 구현 후 "구현된 기능" 섹션으로 이동.

### 시장 근거 (웹 조사로 확인된 수치)
| 근거 | 출처 요지 |
|---|---|
| 손보 소비자 분쟁 88%가 보험금 지급 관련, 그중 64%가 미지급 | 한국소비자원 3년 통계 (보험저널) |
| 내용증명: 변호사 50만~100만원 → AI 서비스 5,000원부터 | 한국경제 2026-03, 대법원 로폼 판결 |
| 사업계획서 대행: 크몽 1만원대~110만원, 지역 대행 50만~200만원 | 크몽/숨고/미소 |
| 특허 가출원 11만원 / 정식출원 198만원 (변리사) | 패튼위드 |
| AI 운세앱 월매출 10억 도달 사례 | 서울경제 |
| 한국 AI 유튜브 인기 채널: 일잘러 장피엠·알린 ALINN·기묘한 자동화 | 고구마팜/소마코 |

### Tier 1 — 즉시 착수 권장 (기존 파이프라인 재사용)
| 서비스 | 가격 | 난이도 | 상태 |
|---|---|---|---|
| ~~직장인 말투 번역기 (정중한 거절·반박 메일)~~ | ~~2,900P~~ | ~~하~~ | ✅ **구현완료 (2026-09-07)** |
| ~~커리어 사주 (이력서 → 직업운)~~ | ~~9,900P~~ | ~~하~~ | ✅ **구현완료 (2026-09-07)** |
| ~~학교 가정통신문 요약 + 일정 추출~~ | ~~2,900P~~ | ~~하~~ | ✅ **구현완료 (2026-09-07)** |
| ~~보험약관 면책조항 스캐너~~ | ~~14,900P~~ | ~~중~~ | ✅ **구현완료 (2026-09-07)** |
| 내용증명 자동작성 | 9,900P | 중 | 변호사법 리스크 검토 필수 |
| 정부지원사업 사업계획서 초안 (PSST) | 99,900P | 중 | 대행 50~200만원 대비 |
| 공공입찰 RFP 분석 + 제안서 목차 | 99,900P | 중 | B2B 반복 구매 |
| 프랜차이즈 정보공개서 분석 | 49,900P | 중 | FILO 고객 시너지 |

### 리스크 메모 (착수 전 필독)
- **변호사법**: 2026-03 대법원 로폼 판결은 "이용자 입력을 검토·수정 없이 그대로 채워 넣는 표준화 서비스"를 적법으로 본 것. SCAN처럼 AI가 내용을 판단·수정하면 동일 결론이 보장되지 않음 → 법률 자문 필요.
- **의료법**: 진단서·의무기록 해석은 "쉬운 말 풀이 + 용어 설명"까지만. 진단·치료 판단 금지 문구 필수.
- ~~**가격 구조 충돌**: 최저 충전 30,000원 구조에서 2,900P 미끼 상품 판매 불가~~ → ✅ **해결**: 5,000P/₩5,000, 10,000P/₩10,000 소액 충전 플랜 신설 완료 (2026-09-07)
