# SCAN AI — 전용 메모
> mbtico.kr/scan 서비스. 세션 시작 시 SCAN 관련 작업이면 이 파일 읽을 것.

---

## 서비스 개요
- **위치**: mbtico.kr/scan (이전: filo.ai.kr/seolyuhana → 2026-09-06 이전)
- **포지셔닝**: 소상공인·직장인 대상 AI 문서 분석 SaaS (1P=1원 포인트제)
- **파일**: scan.html, seolyuhana/services/analyze.js, _worker.js (mbtico.kr 블록)
- **PWA**: /scan-manifest.json, scan-icon-192/512.png (KV 업로드됨)

---

## 포인트·요금 체계 (2026-09-07 확정)

### 서비스별 차감 포인트
| 서비스 | 포인트 | 비고 |
|---|---|---|
| 면접 질문 생성 | 19,900P | claude-haiku-4-5 |
| 이력서 분석 | 29,900P | claude-haiku-4-5 |
| 계약서 검토 | 29,900P | claude-haiku-4-5 |
| 등기부 전세사기 분석 | 29,900P | claude-haiku-4-5 |
| 자소서 수정안 제시 | 39,900P | claude-haiku-4-5 |
| 자소서 AI 전면 재작성 | 39,900P | claude-haiku-4-5 |
| 자소서 다국어 번역 (영어) | 39,900P | **claude-sonnet-5** |
| 자소서 다국어 번역 (일/중/독/불/스) | 39,900P | claude-haiku-4-5 |
| 공문서 분석 (사업자·건강보험·소득) | 2,900P | claude-haiku-4-5 |
| 슈퍼어드민 | ∞P | kimdh4790@gmail.com·soungkyekim@naver.com |

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

## 경쟁사 조사 결과 (2026-09-07 에이전트 전수조사)

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

### 분석 서비스 (analyze.js)
| 함수 | serviceId | 모델 |
|---|---|---|
| `analyzeResume()` | resume_analysis | haiku |
| `analyzeCoverLetter()` | cover_letter_analysis | haiku |
| `rewriteCoverLetter()` | cover_letter_rewrite | haiku |
| `translateCoverLetter()` | cover_letter_translation | sonnet-5(영어)/haiku(기타) |
| `generateInterviewQuestions()` | interview_questions | haiku |
| `analyzeContract()` | employment_contract, freelance_contract, rental_contract | haiku |
| `analyzeScannedPdf()` | — | haiku |
| `analyzeRegistry()` | registry_analysis | haiku |
| `analyzePublicDoc()` | public_doc_analysis | haiku |

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

## 등록된 API 키 (Cloudflare Secrets, 2026-09-07 전수확인)
| Secret | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude AI 분석 전체 |
| `TILKO_API_KEY` | 등기부 직접조회 (AES-CBC-128+RSA-OAEP) |
| `TILKO_RSA_PUBKEY` | Tilko RSA 공개키 |
| `IROS_USER_ID` | **인터넷등기소 로그인 ID** (직접 발급 가능) |
| `IROS_USER_PW` | **인터넷등기소 비밀번호** |
| `IROS_EMONEY_NO1` | **전자화폐 번호 1** (등기부 유료 발급용) |
| `IROS_EMONEY_NO2` | **전자화폐 번호 2** |
| `IROS_EMONEY_PWD` | **전자화폐 비밀번호** |
| `BIZ_API_KEY` | 국세청 사업자 조회 |
| `ORACLE_SERVER_URL` | Oracle 변환서버 HWP→DOCX (포트 3100) |

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
| 2026-09-07 | SCAN_MEMO.md 신규 생성. 경쟁사 조사결과·API현황 기록 |
