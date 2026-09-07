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

### 충전 플랜
| 결제금액 | 지급포인트 | 보너스 | 비고 |
|---|---|---|---|
| ₩30,000 | 30,000P | — | 면접 질문 1건 |
| ₩60,000 | 67,000P | +7,000P | 가장 인기 |
| ₩100,000 | 115,000P | +15,000P | |
| ₩200,000 | 240,000P | +40,000P | 최대 절약 |

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
| `analyzePublicDoc()` | public_doc_analysis | haiku | 공문서 범용 분석 |
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

### Firestore 컬렉션
| 컬렉션 | 용도 |
|---|---|
| `scan_jobs/{jobId}` | 분석 작업 결과 저장 |
| `scan_points/{uid}` | 사용자 포인트 잔액 |
| `scan_charges/{reqId}` | 충전 신청 내역 |

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
| `IROS_EMONEY_NO1` | 전자화폐 번호 앞 8자리 — 전자민원캐시 10,000원권 (2026-09-07 구매) | ✅ 설정됨 |
| `IROS_EMONEY_NO2` | 전자화폐 번호 뒤 4자리 | ✅ 설정됨 |
| `IROS_EMONEY_PWD` | 전자화폐 비밀번호 | ✅ 설정됨 |
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

## 수정 이력
| 날짜 | 내용 |
|---|---|
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
| 2026-09-07 | **biz-status encodeURIComponent 제거**: BIZ_API_KEY가 이미 URL인코딩됨 → 이중인코딩 제거로 NTS API 인증 정상화 |
| 2026-09-07 | **Cloudflare Secrets 전수확인**: 대시보드 스크린샷으로 13개 키 모두 설정 확인 (SCAN_MEMO.md 등록) |
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
| 서비스 | 가격 | 난이도 | 비고 |
|---|---|---|---|
| 직장인 말투 번역기 (정중한 거절·반박 메일) | 2,900P | 하 | 바이럴 유입용 |
| 커리어 사주 (이력서 → 직업운) | 9,900P | 하 | resume 파서 그대로 재사용 |
| 학교 가정통신문 요약 + 일정 추출 | 2,900P | 하 | 학부모 반복 사용 |
| 보험약관 면책조항 스캐너 | 14,900P | 중 | 장문 청킹 필요 |
| 내용증명 자동작성 | 9,900P | 중 | 변호사법 리스크 검토 필수 |
| 정부지원사업 사업계획서 초안 (PSST) | 99,900P | 중 | 대행 50~200만원 대비 |
| 공공입찰 RFP 분석 + 제안서 목차 | 99,900P | 중 | B2B 반복 구매 |
| 프랜차이즈 정보공개서 분석 | 49,900P | 중 | FILO 고객 시너지 |

### 리스크 메모 (착수 전 필독)
- **변호사법**: 2026-03 대법원 로폼 판결은 "이용자 입력을 검토·수정 없이 그대로 채워 넣는 표준화 서비스"를 적법으로 본 것. SCAN처럼 AI가 내용을 판단·수정하면 동일 결론이 보장되지 않음 → 법률 자문 필요.
- **의료법**: 진단서·의무기록 해석은 "쉬운 말 풀이 + 용어 설명"까지만. 진단·치료 판단 금지 문구 필수.
- **가격 구조 충돌**: 최저 충전 30,000원 구조에서 2,900P 미끼 상품 판매 불가 → 5,000~10,000원 소액 충전 플랜 신설 필요.
