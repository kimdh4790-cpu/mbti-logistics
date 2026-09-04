# 소셜미디어 홍보 파이프라인 메모
> 세션 시작 시 이 파일 먼저 읽을 것. 매 세션 반복 설명 방지용.

---

## 제품 정확한 설명

### 1. FILO + DINE — 직원 관리자 통합 매장 운영 올인원

- **설치 방식**: 소프트웨어 방식 → 데스크톱 또는 **기존 포스기에 설치** (새 하드웨어 구매 불필요)
- **핵심 기능**: 결제, 주문, 직원 근태, 월급 실시간 정산, 명세서 알림톡 자동 발송
- **향후**: FILO 자체 POS 하드웨어 연동 개발 준비 중

**홍보 핵심 메시지:**
- "기존 포스기 그대로, FILO 설치만 하면 됩니다"
- "사장님은 FILO, 직원 관리자는 DINE → 같은 매장 데이터 실시간 공유"
- "결제부터 월급 명세서까지 알림톡 자동 발송"

---

### 2. DONWAY — 맞는 형 정산 프로그램

- **대상**: 택배 대리점, 배달대행 업체
- **핵심**: 엑셀 파일 하나 올리면 모든 게 자동 계산
- **요금**: ~50명 125,000원 / ~100명 250,000원 / ~500명 1,250,000원 / 1000명+ 문의

**홍보 핵심 메시지:**
- "복잡한 배달·택배 정산, 엑셀 하나로 끝"
- "기사 수십 명 정산이 5분 만에 완료"
- "카카오 알림톡으로 기사 전원 자동 발송 (국내 유일)"

---

### 3. 용차앱 — 기사-대리점 직계약 정보통신망 앱

- **매칭 구조**: 대리점 공고 등록 → 기사 직접 지원 → 직계약 체결
- **요금**: 기사 월 150,000원 / 소장 월 50,000원 / DONWAY 구독 소장: 용차앱 무료

**홍보 핵심 메시지:**
- "주선사업자 없는 직계약 → 수수료 없음"
- "대리점이 DONWAY 쓰면 용차앱은 무료"
- "기사 월 15만원 고정, 건수 무제한"

---

## GitHub Actions 워크플로우 (Oracle SSH 없이 실행 가능)

### 필요한 GitHub Secrets (4개)
```
Settings → Secrets and variables → Actions → New repository secret
```
| Secret 이름 | 값 위치 |
|---|---|
| `YOUTUBE_CLIENT_ID` | Oracle VM `~/.env` → YOUTUBE_CLIENT_ID |
| `YOUTUBE_CLIENT_SECRET` | Oracle VM `~/.env` → YOUTUBE_CLIENT_SECRET |
| `YOUTUBE_REFRESH_TOKEN` | Oracle VM `~/.env` → YOUTUBE_REFRESH_TOKEN |
| `GOOGLE_TTS_API_KEY` | Oracle VM `~/.env` → GOOGLE_TTS_API_KEY |

**Oracle VM에서 값 확인 방법 (SSH 불필요):**
1. Oracle Cloud Console 브라우저 로그인 (kimdh4790@gmail.com)
2. Compute → Instances → filo-a1-2c12g → Console connection (직렬 콘솔)
3. 브라우저 터미널에서: `cat ~/.env`

**또는: Oracle Cloud Console → Cloud Shell** (OCI API용이지만 환경변수 확인 가능)

### 워크플로우 실행 방법 (Oracle SSH 없이)
```
GitHub → Actions → 소셜미디어 홍보 영상 제작 → Run workflow
- product: yongcha (또는 filo, donway)
- steps: record,compose,youtube
→ GitHub Actions runner에서 녹화+편집+YouTube 업로드 자동 실행
→ 결과 MP4는 Artifacts에서 다운로드 가능
```

**Instagram 업로드**: Oracle SSH 복구 후에만 가능 (세션이 Oracle에 저장됨)

### Oracle SSH 키 상태
- `ssh-key-2026-08-02.key` → **등록 완료** (2026-08-28)
- SSH 접속: `ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154`

---

## 현재 상태 (2026-08-27 기준)

### 완료된 것
- [x] 영상 녹화 스크립트 4개 (`scripts/capture/record-*.js`)
- [x] FFmpeg 편집 + 화면 꽉 채움 (`scripts/compose/compose-video.sh`) — scale+crop, 블러 배경 없음
- [x] Instagram Reels 세로형 추출 (`scripts/compose/make-reels.sh`)
- [x] YouTube 자동 업로드 (`scripts/upload/upload-youtube.js`)
- [x] 자막·시나리오 전면 재설계 (경쟁사 직접 비교, 팩트·숫자 훅)
- [x] 음성 나레이션 TTS 생성기 (`scripts/audio/generate-narration.js`)
- [x] 나레이션 스크립트 3개 (`*-narration.json`) — Google TTS 음성 설정
- [x] YouTube 제목 훅 강화
- [x] **Google TTS API 키 발급·등록** (`~/.env` GOOGLE_TTS_API_KEY — Oracle Cloud)
- [x] **YouTube OAuth 발급** (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN → `~/.env`)
- [x] **나레이션 MP3 3개 생성** (filo/donway/yongcha — `output/` 저장됨)
- [x] **Playwright 세션 4개 전송** (filo-record, youtube-upload, instagram-upload, naver-blog)
- [x] Chromium 경로 동적 탐색으로 수정 (`scripts/utils/launch-options.js`)
- [x] **YouTube Data API v3 업로드 스크립트** (`scripts/upload/upload-youtube-api.js`) — Playwright 대체
- [x] **YOUTUBE_REFRESH_TOKEN 발급·등록** (Oracle Cloud `~/.env`)
- [x] **GOOGLE_TTS_API_KEY 등록** (Oracle Cloud `~/.env` — 재등록 완료 2026-08-27)
- [x] **--reels 옵션 추가** (`upload-youtube-api.js`) — 숏츠 업로드 지원
- [x] **DONWAY 나레이션 MP3 생성** (Google TTS, output/donway-narration.mp3)
- [x] **DONWAY 영상 합성** (나레이션+자막, audio:103KiB 확인) → output/donway-reels.mp4
- [x] **DONWAY YouTube 숏츠 업로드** — https://www.youtube.com/watch?v=3HRSPE2bNDM (음성 포함, 2026-08-27)
- [x] **전체 앱 기능 분석 완료** (FILO 7모듈 + DONWAY 전업종 + 용차앱 기사/대리점 + MBTICO AI OCR)
- [x] **콘텐츠 캘린더 16개 항목** (`scripts/content/calendar.json` — 2026-08 ~ 09)
- [x] **프로모션 HTML 자동 생성기** (`scripts/generate-promo.js`)
- [x] **프로모션 HTML 16개 생성** (`assets/promo/` — 기능별 슬라이드쇼)
- [x] **용차앱 기사·대리점 양면 프로모션 HTML** (`assets/promo/yongcha-promo.html` — 7슬라이드)
- [x] **record-yongcha.js** — 로컬 프로모션 HTML 녹화 방식으로 교체
- [x] **DONWAY Instagram Reels 업로드** — 완료 (2026-08-29, Oracle Cloud Playwright)
- [ ] **YONGCHA 영상 제작** — Oracle VM에서 실행 필요
- [ ] **FILO 영상 제작** — Oracle VM에서 실행 필요

### 소셜미디어 계정 목록 (2026-09-04 업데이트)
| 계정 | 플랫폼 | 용도 | 비고 |
|---|---|---|---|
| @hyung.83 | Instagram | MBTICO 제품 홍보 릴스 | Graph API 연동, 토큰 2026-10-28 만료 |
| @LJH_93 | Instagram / 영상 | 영상 관련 계정 | 2026-09-04 등록 |

### Instagram Graph API 계정 정보 (2026-08-29)
| 항목 | 값 |
|---|---|
| Instagram 계정 | @hyung.83 |
| Instagram Account ID | `17841476542581165` |
| Facebook Page ID (Mbtico) | `1254758224392727` |
| Meta Business Manager ID | `2453846855112728` |
| MBTICO Social 앱 ID | `1377132184613591` |
| INSTAGRAM_ACCESS_TOKEN | GitHub Secret 등록 완료 (2026-08-29) |
| **토큰 만료일** | **2026-10-28** (60일 토큰) ← 만료 1주일 전 알림 예약됨 |

#### 토큰 갱신 방법 (만료 전)
1. developers.facebook.com/tools/explorer 접속
2. MBTICO Social 앱 선택 → 사용자 토큰 생성
3. developers.facebook.com/tools/debug/accesstoken/ → 액세스 토큰 확장 (60일 갱신)
4. GitHub → Settings → Secrets → `INSTAGRAM_ACCESS_TOKEN` 업데이트

### Oracle VM ~/.env 등록 항목 (2026-08-27 기준)
```
GOOGLE_TTS_API_KEY=등록완료  ← "API 키 3개" (Cloud Text-to-Speech API 전용, 2026-08-27 생성)
YOUTUBE_CLIENT_ID=40761160761-3v5h03e9r974vfq2io4oa08nqhn6r5o8.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=등록완료  ← Google Cloud Console → OAuth 2.0 → mbtico-youtube (데스크톱)
YOUTUBE_REFRESH_TOKEN=등록완료
INSTAGRAM_ACCOUNT_ID=17841476542581165
INSTAGRAM_ACCESS_TOKEN=등록완료 (만료: 2026-10-28)
```

### Google Cloud Console API 키 목록
| 이름 | 용도 | 비고 |
|---|---|---|
| API 키 3개 | **GOOGLE_TTS_API_KEY** (Google TTS 나레이션 생성) | Cloud Text-to-Speech API 전용 |
| mbti | 범용 API 키 (6개 API) | Firebase 등 |
| Browser key | Firebase 자동 생성 | 수정 금지 |

---

## Topview Canvas × Seedance 2.5 — 사진 1장 멀티 릴스 (2026-09-03 추가)

> 앱 스크린샷 1장 → 콘셉트별 릴스 3종 동시 생성 → Meta A/B 테스트 직행

### 도구
- **Topview Canvas**: AI 기획+영상 생성 통합 워크플로우 (회원가입 필요)
- **Seedance 2.5**: 인물·제품 일관성 유지 멀티버전 생성 모델 (Canvas 내 선택)

### 핵심 차이점 — 기존 방식 vs Topview Canvas
| 기존 (Remotion/FFmpeg) | Topview Canvas |
|---|---|
| 코드로 씬 직접 설계 | 프롬프트 → AI가 기획안 먼저 제시 |
| 버전 교체 시 코드 수정 | 콘셉트 3종 동시 선택 → 나란히 생성 |
| 스크린샷 기반 | 실사 인물/제품 사진 레퍼런스 |
| A/B는 variants.json 로테이션 | A/B/C 즉시 비교 가능 |

### MBTICO 제품별 활용 계획
| 제품 | 업로드할 사진 | 콘셉트 3종 |
|---|---|---|
| FILO | 앱 대시보드 스크린샷 + 매장 사진 | 브이로그(매장 하루) / UGC후기(실사용) / 시네마틱(브랜드필름) |
| DONWAY | 정산 화면 스크린샷 + 기사/배달 사진 | 실사후기 / 비포애프터 / 시네마틱 |
| 용차앱 | AI추천 화면 + 트럭/소장 사진 | 브이로그 / UGC후기 / 시네마틱 |

### 프롬프트 템플릿 (MBTICO용)
```
[제품명] 앱 사용 후기 릴스 영상 제작해줘.
첫 3초 안에 "소상공인이 공감할" 후킹 멘트로 시작하고,
업로드한 앱 화면을 메인 소재로 사용해줘.
30~40초 분량, 세로형(9:16)으로 만들어줘.
타겟: 한국 소상공인 / 물류업체 / 배달대행사
```

### 워크플로우 순서 (수동)
```
앱 스크린샷 + 레퍼런스 이미지 업로드
  ↓
프롬프트 입력 (주제 + 후킹 + 타겟 + 포맷)
  ↓
AI 기획안 확인 → 장면별 수정 (생성 전)
  ↓
콘셉트 3종 동시 생성 (브이로그 / UGC후기 / 시네마틱)
  ↓
장면 단위 수정 (전체 재생성 없이)
  ↓
Export 1080p → Instagram Reels 업로드
```

### 현재 파이프라인과의 관계
- **단기**: Topview Canvas 수동 생성 → Oracle Cloud로 옮겨 자동 업로드
- **중기**: Topview Canvas API 생기면 social-media.yml에 통합
- **Remotion 영상**: 코드 기반 브랜딩 영상은 유지 (Topview는 실사 소재용)

---

## SPCL 영향력 프레임워크 (알렉스 홀모지, 2026-09-03 적용)

> 조회수보다 영향력 — 시청자를 잠재고객으로 전환하는 콘텐츠 전략

### 핵심 원칙: "콘텐츠 자체가 타겟팅이다"
- 소상공인·물류업자가 아니면 조회수 낮아도 OK → 정확한 타겟만 유입되면 됨
- CTA 목표: "좋아요" 아닌 **상담 문의 / 무료 체험** 신청 (행동 전환)

### SPCL 4요소
| 요소 | 목적 | 구현 방식 |
|---|---|---|
| **Status** (자격증명) | "이 채널 믿어도 돼?" | 실제 성과 수치 ("사용자들이 월 30만원 절감") |
| **Power** (즉시실행법) | "나도 할 수 있겠다" | 영상 하나만 보고 바로 따라할 단계별 방법 |
| **Credibility** (객관적증거) | "진짜인가?" | 실제 사례·스크린샷·데이터를 화면에 직접 표시 |
| **Likeness** (공감/나를보여주기) | "나랑 비슷하다" | 오프닝에 "저도 이 문제로 고생했어요" 1개 필수 |

### 섹션 구성 필수 순서
```
intro(likeness 공감) → status(자격증명 수치) → power(단계별방법) → credibility(실제사례) → cta
```

### generate-script.js 적용 현황
- `SPCL_GUIDE` 상수가 Claude API 프롬프트에 내장됨 (2026-09-03)
- 생성되는 모든 스크립트에 `spcl_type` 필드 자동 포함
- 섹션 순서 강제: intro → status → power → credibility → cta (5~8개, 6~10분)

---

## AI 영상 제작 워크플로우 (2026-09-03 추가)

### 방법 A: 존코바 방식 (수동, 고퀄리티)
> 출처: @존코바디자인 (저작권 있음 — 직접 재배포 금지, 참고용)

```
Midjourney → Newtake.ai(스토리보드) → Seedance 2.5(영상) → Premiere Pro(편집)
```

- Midjourney: Kpop 스타일 이미지 생성
- Newtake: 9분할 그리드 → 멀티카메라 스토리보드 → 9:16 720p 10초 영상
- Premiere: BGM 추가 후 완성
- **단점**: 자동화 불가 (모든 단계 수동 클릭 필요)

### 방법 B: 뉴테이크 캐릭터 일관성 워크플로우
> 출처: @yeonsidesign (저작권 있음 — 재배포 금지, 참고용)

**핵심 원칙:**
1. 이미지 단계에서 캐릭터 확정 후 영상 생성 (영상이 크레딧 더 소모)
2. 레퍼런스 역할 분리: 정체성 이미지(@image1) vs 헤어스타일만(@image2)
3. 프레임 연결: 끝 프레임 캡처 → 다음 장면 시작점으로 재사용

**9층 프롬프트 구조:**
```
1. HEADER    — 길이, 화면비, 촬영 톤
2. REFERENCE — 이미지별 가져올 것/말 것 분리
3. CONTINUITY — 소품 수량·상태 진행 방향 고정
4. CAMERA    — 높이, 각도, 거리, 금지 구도
5. AUDIO     — 대사 타임코드, BGM 유무
6. ACTION    — 허용 동작 횟수·시간 구간
7. PACING    — 구간별 속도·멈춤 길이
8. BEATS     — 각 구간 시작/끝 상태
9. NEGATIVES — 금지 요소·보존할 질감
```

**레퍼런스 제어 핵심 프롬프트:**
```
preserve the CURRENT length and shape as in @image1, do not restyle
use @image2 ONLY for the hairstyle, do not take face/outfit/background
```

### 방법 C: Higgsfield API 자동화 (권장 — API 기반)
> 세션에 Higgsfield AI 연결됨. 코드로 완전 자동화 가능.

```
scripts/youtube-ai/generate-script.js (Claude API)
  → scripts/youtube-ai/higgsfield-render.js (Higgsfield 이미지→영상)
  → scripts/compose/compose-video.sh (FFmpeg 자막 합성)
  → scripts/upload/upload-youtube-api.js (YouTube 업로드)
```

**Newtake 방법 B의 원칙을 Higgsfield로 구현:**
- `generate_image`: 캐릭터 기준 이미지 생성
- `generate_video`: 이미지→영상 변환 (Seedance 동등)
- `motion_control`: 카메라/동작 세밀 제어

---

## 콘텐츠 캘린더 (자동화 기반, 2026-08 ~ 09)

> `scripts/content/calendar.json` 에 전체 항목 관리. 아래는 요약.

| 날짜 | 제품 | 기능 | 플랫폼 | 상태 |
|---|---|---|---|---|
| 2026-08-11 (월) | 용차앱 | 기사·대리점 직접 매칭 | YouTube | ⏳ |
| 2026-08-11 (화) | FILO | QR 테이블 주문 | YouTube | ✅ https://youtu.be/BdG2vAkzZuo |
| 2026-08-14 (목) | DONWAY | 쿠팡 엑셀 자동 정산 | YouTube | ✅ https://youtu.be/zC4n7B3bIv8 |
| 2026-08-18 (월) | 용차앱 | AI 루트코치 | YouTube | ⏳ |
| 2026-08-18 (화) | FILO | POS 분할결제 | YouTube | ⏳ |
| 2026-08-21 (목) | DONWAY | 카카오 알림톡 자동 발송 | YouTube | ⏳ |
| 2026-08-25 (월) | 용차앱 | 최소보장·신뢰도 평점 | YouTube | ⏳ |
| 2026-08-25 (화) | FILO | AI 메뉴 사진·번역 | YouTube | ⏳ |
| 2026-08-28 (목) | DONWAY | 팝빌 세금계산서 자동발행 | YouTube | ⏳ |
| 2026-09-01 (월) | 용차앱 | 7일 정산·팝빌 연동 | YouTube | ⏳ |
| 2026-09-01 (화) | FILO | 재고 자동발주 | YouTube | ⏳ |
| 2026-09-04 (목) | DONWAY | 배달대행 라이더 정산 | YouTube | ⏳ |
| 2026-09-08 (화) | FILO | 급여 자동계산·알림톡 | YouTube | ⏳ |
| 2026-09-08 (수) | MBTICO | AI OCR 오배송 방지 | YouTube | ⏳ |
| 2026-09-11 (목) | DONWAY | QR 출퇴근·급여 연동 | YouTube | ⏳ |
| 2026-09-15 (월) | 용차앱 | 주유소 최저가 GPS | YouTube | ⏳ |
| 2026-09-15 (화) | FILO | AIVO AI 매출예측 | YouTube | ⏳ |

### 새 기능 영상 추가 방법
```bash
# calendar.json에 새 항목 추가 후:
node scripts/generate-promo.js <product> <feature>   # 프로모션 HTML 생성
# Oracle VM에서:
node scripts/run-pipeline.js --product <product> --steps record,compose,youtube
```

### 막혀있는 것

| 블로커 | 해결 방법 | 담당 |
|---|---|---|
| **YONGCHA YouTube 미업로드** | GitHub Actions product=yongcha steps=youtube 실행 필요 | Claude |

### 업로드 필수 순서 (반드시 지킬 것)
```
1. node scripts/audio/generate-narration.js --product <product>  # 나레이션 MP3 생성
2. bash scripts/compose/compose-video.sh <product>               # 나레이션+자막 합성
3. node scripts/upload/upload-youtube-api.js --product <product> --reels  # 숏츠 업로드
   또는 --reels 없이 일반 영상 업로드
```
compose 없이 업로드하면 나레이션 없는 무음 영상이 올라감!

### 영상 제작 현황
| 제품 | 나레이션 MP3 | 영상 소스 | 편집 MP4 | YouTube |
|---|---|---|---|---|
| FILO | ✅ 완료 | ✅ Remotion (FiloPromo.jsx) | ✅ 완료 (GitHub Actions, 8.9MB, 2026-08-28) | ✅ 숏츠 완료 (BdG2vAkzZuo) |
| DONWAY | ✅ 완료 | ✅ Remotion (DonwayPromo.jsx, 2026-08-29) | output/donway-promo.mp4 | ✅ 숏츠 완료 (3HRSPE2bNDM) |
| YONGCHA | ✅ 완료 | ✅ Remotion (YongchaPromo.jsx, 2026-08-29) | output/yongcha-promo.mp4 | ⚠️ eDpowbKedgs 깨짐(무음+자막가림) — 삭제 후 재업로드 필요 |
| MBTICO | ✅ 완료 (StoryScope 적용) | ✅ mbtico-ocr.html (Playwright) | 미생성 | 미완 |

---

## Oracle Cloud에서 영상 제작 실행

```bash
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154

cd ~/mbti-logistics && git pull origin main

# 환경변수 확인
cat ~/.env

# 전체 파이프라인 (녹화 → 편집 → YouTube 업로드)
node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube
node scripts/run-pipeline.js --product donway --steps record,compose,youtube
node scripts/run-pipeline.js --product filo --steps record,compose,youtube
```

---

## 영상 구조 (현재 설계)

### FILO (~40초)
```
0-4s   : /table-order (QR 주문 화면)
4-12s  : 메뉴 스크롤
12-16s : /kitchen (주방 실시간 디스플레이)
16-21s : /app 대시보드 (로그인 필요 — filo-record 세션 사용)
21-40s : 매출·재고 스크롤
자막: "POS 앱 3개 월 15만원" → "FILO 하나로 전부"
```

### DONWAY (~40초)
```
0-18s  : 랜딩 슬라이드 0-4 전환
18-25s : /donway_simulator.html (정산 시뮬레이터)
25-40s : /app 대시보드 (로그인 필요)
자막: "기사 50명 정산 몇 시간?" → "엑셀 올리면 5분 끝"
```

### YONGCHA (~35초)
```
0-35s  : 랜딩 전체 스크롤 (인증 불필요)
         히어로 → 매칭 흐름 → AI 루트코치 → 가격표
자막: "수수료 20% 뜯김" → "직접 매칭 월정액 고정"
```

---

## 나레이션 TTS 설정

### Google Cloud TTS (현재 사용)
- 발급처: console.cloud.google.com → Text-to-Speech API → API 키
- 무료: Neural2 월 100만 자
- 환경변수: `GOOGLE_TTS_API_KEY` (`~/.env`)
- 기본 음성: `ko-KR-Neural2-C` (**남성**, 속도 1.0) — Wavenet보다 훨씬 자연스러운 최신 AI 음성
- ⚠️ **주의**: API 요청 시 `ssmlGender` 제거 필수 (ko-KR-Neural2-C는 남성 음성 — FEMALE 지정 시 400 에러)
- 나레이션 텍스트: 구어체 (반말 아닌 자연스러운 존댓말, "~요" 어미 위주)

---

## 경쟁사 차별화 핵심 포인트

### FILO
- 경쟁사: 테이블링(99,000원/월) + 티오더(19,000원/대) + OKPOS(30,000원) = 월 148,000원+
- FILO: 이 모든 기능 하나에 (요금 문의)
- 독보 기능: QR출퇴근 + 급여 + 마진분석 + 다국어 번역 + AI매출예측

### DONWAY
- 직접 경쟁사 없음 (쿠팡이츠 AI정산 + 카카오 알림톡 자��발송 국내 유일)
- 가격: ~50명 125,000원 / ~100명 250,000원

### YONGCHA
- 경쟁사(원콜, 혼적콜): 주선사 구조, 수수료 20%+ 불투명
- 용차앱: 주선사 없는 직접 매칭 / 기사 월 150,000원 고정 / AI 루트코치
- DONWAY 구독 소장 → 용차앱 무료 (생태계 락인)

---

## 다음 작업 우선순위

1. ~~**DONWAY YouTube 숏츠 업로드**~~ ✅ 완료 (https://youtu.be/3HRSPE2bNDM, 2026-08-27)
2. ~~**YONGCHA 영상 제작**~~ ✅ Oracle Cloud 편집 완료 (2026-08-28)
3. **YONGCHA YouTube 재업로드** → YouTube Studio에서 eDpowbKedgs 삭제 후, GitHub Actions product=yongcha steps=record,compose,youtube 재실행
4. **FILO 재렌더링** → GitHub Actions product=filo steps=record,compose,youtube
5. ~~**DONWAY Instagram Reels 업로드**~~ ✅ 완료 (2026-08-29)
6. **YONGCHA Instagram Reels 업로드** → Oracle Cloud: `node scripts/run-pipeline.js --product yongcha --steps instagram`
7. **FILO Instagram Reels 업로드** → Oracle Cloud: `node scripts/run-pipeline.js --product filo --steps instagram`
6. **MBTICO 영상 제작** → GitHub Actions product=mbtico steps=record,compose,youtube

### 업로드 방향 (확정)
- YouTube: **숏츠(--reels) 우선** — 구독자 적을 때 알고리즘 노출 유리
- Instagram: **Reels 우선** — 음성(나레이션) 포함 세로형 영상
- **음성 없이 올리지 말 것** — 반드시 나레이션 생성 후 합성 → 업로드

---

## 콘텐츠 A/B/C/D 로테이션 시스템 (2026-08-29 구축)

### 개요
매주 다른 각도의 영상을 자동으로 선택하여 제작. 현재 주차 번호 % 4 → A/B/C/D 자동 선택.

### 파일 위치
```
scripts/content/variants/yongcha-variants.json   # 4가지 각도 정의
scripts/content/variants/filo-variants.json
scripts/content/variants/donway-variants.json
scripts/compose/generate-variant.js              # 주차 기반 선택 + 파일 자동 생성
```

### 각 앱 4가지 각도
| 앱 | A | B | C | D |
|---|---|---|---|---|
| 용차앱 | 수수료제로 | 기사혜택(건수무제한) | 소장혜택(공고등록) | 비교각도(원콜vs용차앱) |
| FILO | POS통합(3앱→1앱) | 직원근태(QR출퇴근) | AI매출예측(7일 예측) | 비용비교(경쟁사 대비) |
| DONWAY | 대량정산(엑셀업로드) | 알림톡(기사별명세서) | 요금비교(경쟁사 대비50%) | 세금계산서(팝빌연동) |

### 사용 방법
```bash
# 주차 기반 자동 선택 (GitHub Actions에서 자동 실행)
node scripts/compose/generate-variant.js --product yongcha

# 특정 variant 수동 지정
node scripts/compose/generate-variant.js --product filo --variant B

# 생성되는 파일들:
#   scripts/content/{product}-narration.json   ← generate-narration.js가 읽음
#   scripts/content/{product}-subtitles.srt    ← compose-video.sh가 읽음
#   scripts/content/{product}-meta.json        ← YouTube 제목/설명
#   assets/promo/{product}-promo.html          ← 슬라이드쇼 화면 (녹화 대상)
```

### GitHub Actions 실행 순서
```
Variant 선택 (generate-variant.js) → 나레이션 MP3 생성 → 화면 녹화 → FFmpeg 편집 → YouTube 업로드
```
→ social-media.yml 에 "콘텐츠 Variant 선택" 스텝 추가 완료 (나레이션 생성 전 실행)

---

## 자막 시스템 (2026-08-29 수정)

### 현재 방식: SRT → ASS 변환 후 렌더링
- 스크립트: `scripts/compose/srt-to-ass.js`
- 변환 후 `ass` 필터로 ffmpeg에 주입 (`compose-video.sh`)
- **PlayResX=1080, PlayResY=1920** 기준 명시 → 1080x1920 영상에 정확히 맞춤
- **Fontsize=52** (PlayResY 기준 스케일), **Alignment=2** (하단 중앙), **MarginV=120** (하단 120px 여백)
- 폰트: `Noto Sans CJK KR` (한글 지원)

### 수동 실행
```bash
# SRT → ASS 변환
node scripts/compose/srt-to-ass.js scripts/content/yongcha-subtitles.srt output/yongcha-subtitles.ass

# compose-video.sh 내에서 자동 실행됨
```

---

## 네이버 블로그 자동화 (2026-08-31 완료)

### 자동 발행 스케줄
| 요일 | 제품 | 방식 |
|---|---|---|
| 월요일 09:00 | FILO | Windows 작업 스케줄러 (로컬 PC) |
| 수요일 09:00 | DONWAY | Windows 작업 스케줄러 (로컬 PC) |
| 금요일 09:00 | 용차앱 | Windows 작업 스케줄러 (로컬 PC) |

- 작업 스케줄러 이름: `NaverBlogPost`
- 실행 경로: `C:\Users\82104\Desktop\mbti-logistics\naver-blog`
- Oracle VM 크론에도 동일 등록되어 있으나 **Naver 쿠키 IP 바인딩 문제로 로컬 PC만 정상 동작**

### 초안 파일 현황 (drafts/)
| 제품 | 파일 | 상태 |
|---|---|---|
| DONWAY | `20260831_donway_배달대행정산자동화.json` | ✅ 발행 완료 |
| DONWAY | `20260903_donway_알림톡자동발송.json` | 대기 |
| DONWAY | `20260910_donway_세금계산서자동발행.json` | 미생성 |
| DONWAY | `20260917_donway_요금제비교.json` | 미생성 |
| FILO | `20260831_filo_dine_카페직원관리.json` | 대기 |
| FILO | `20260907_filo_직원근태관리.json` | 대기 |
| FILO | `20260914_filo_POS주문통합.json` | 미생성 |
| FILO | `20260921_filo_매출분석AI.json` | 미생성 |
| 용차앱 | `20260905_yongcha_소장기사직접거래.json` | 대기 |
| 용차앱 | `20260912_yongcha_AI기사추천.json` | 미생성 |
| 용차앱 | `20260919_yongcha_단가제안.json` | 미생성 |
| 용차앱 | `20260926_yongcha_수수료없는거래.json` | 미생성 |

### 로그인 세션 관리
- 로컬 PC: `naver-profile/` 디렉토리 (Chromium 세션)
- Oracle VM: `naver-profile/cookies.json` 복사됨 (IP 바인딩으로 미사용)
- 세션 만료 시: 로컬에서 `node scripts/naver_login.js` 재실행

---

## 수정 이력
| 날짜 | 작업 내용 |
|---|---|
| 2026-09-03 | **FiloPromo.jsx variant 동적 슬라이드 렌더링** — hero/feature/compare/notice/price/cta 6가지 타입 씬 컴포넌트. render-filo.js가 filo-variants.json에서 이번 주 variant(weekNum%4→A/B/C/D) 읽어 slides+lines를 inputProps로 전달. 매주 완전히 다른 장면 자동 생성. index.jsx defaultProps 추가 |
| 2026-09-03 | **generate-and-upload.js --skip-script / --template 파라미터 추가** — TEMPLATE_MAP으로 tutorial/news/tips 분기. weekly-cron.sh에서 --template $TEMPLATE 전달 가능 |
| 2026-09-03 | **AINewsTemplate.jsx, AITipsTemplate.jsx 신규** — 뉴스 속보 스타일(빨간 Ticker+BreakingBanner, Composition: AINewsVideo), 팁 카드 스타일(상단 진행 점+TIP 배지, Composition: AITipsVideo). weekly-cron.sh 주차별 tutorial/news/tips 로테이션 |
| 2026-09-03 | **filo-variants.json 전면 개편** — FILO+DINE 연동 공동 홍보 4종: A(태블릿통합), B(QR출퇴근+DINE HR), C(AI매출예측+DINE), D(비용비교+DINE). "필로포스 개발중" 표기, 자연스러운 구어체 나레이션 |
| 2026-09-03 | **yongcha-variants.json 최종 업데이트** — 일부 기능 준비중 + 지금 가입 가능 메시지 4종(A:직접거래/B:기사공고/C:소장선택/D:서비스소개). 구어체 나레이션, 국민신문고 언급 제거 |
| 2026-09-03 | **YouTube 채널 자동 모니터링 파이프라인 구축** — channels.json(10개 채널), content-monitor.js(RSS→Haiku분류→SMS), Oracle Cloud 매일 09:00 KST cron 등록. 월 $0.30 비용. Fish Audio(AI 나레이션 무료 티어), Mirr($19/월 한국 AI SNS 자동화), 신영선 Headroom+TaskObserver(Claude 토큰 40-50% 절감) 참고 등록 |
| 2026-09-03 | **Topview Canvas × Seedance 2.5 워크플로우 추가** — 앱 스크린샷 1장으로 브이로그/UGC후기/시네마틱 3종 동시 생성. 제품별 프롬프트 템플릿 + 파이프라인 통합 계획 정리 |
| 2026-09-03 | **SPCL 프레임워크 적용** — generate-script.js에 알렉스 홀모지 Status/Power/Credibility/Likeness 전략 내장. spcl_type 필드 추가, 섹션 순서 강제(intro→status→power→credibility→cta). SOCIAL_MEDIA_MEMO.md SPCL 섹션 신규 추가 |
| 2026-09-03 | **AI 영상 제작 워크플로우 추가** — higgsfield-render.js 신규(9층 프롬프트), oracle-init.sh Agent Reach 자동설치 스텝 추가, INFRA_MEMO.md Agent Reach + OpenChatCut 섹션 등록 |
| 2026-08-31 | **네이버 블로그 자동화 완료** — naver_schedule.js 생성 (요일별 제품 순환), 초안 3개 신규 생성(DONWAY 알림톡/FILO 근태관리/용차앱 직접거래), naver_login.js fs require 버그 수정, Windows 작업 스케줄러 NaverBlogPost 등록(월수금 09:00), Oracle VM cron 등록 완료 |
| 2026-08-29 | **DONWAY·용차앱 Remotion 코드 영상 추가** — DonwayPromo.jsx(5씬 파티클·카운터·자막), YongchaPromo.jsx(5씬 AI타이핑·루트비교). render-donway.js·render-yongcha.js 신규 생성. social-media.yml Remotion 렌더 범위 확장(FILO→FILO·DONWAY·용차앱), Playwright 녹화·FFmpeg 편집은 dine·mbtico만으로 변경. 비용 없이 코드 기반 고품질 영상 자동 생성 |
| 2026-08-29 | **DONWAY Instagram Reels 업로드 완료** — Oracle Cloud Playwright, `[role="button"]:has-text("공유")` 셀렉터 수정으로 해결 |
| 2026-08-29 | **Instagram 공유 버튼 셀렉터 강화** — upload-instagram.js: role=button 포함 8가지 순차 시도, 실패 시 스크린샷 저장 |
| 2026-08-29 | **DINE 근태·급여 화면 디자인 전면 개선** — dine-staff.js(KPI 카드 SVG+border-left, 상태 pill, 수정→연필SVG), dine-analytics.js(오늘 골드 강조, 근무중 펄스, 빈셀 +아이콘), dine-payroll.js(명세서 명함스타일, 실수령 골드), dine-schedule.js(근무 진행바, 일괄발송 카드) |
| 2026-08-29 | **콘텐츠 A/B/C/D 로테이션 시스템 구축** — variants/{yongcha,filo,donway}-variants.json + generate-variant.js + social-media.yml Variant 선택 스텝 추가. 매주 자동으로 다른 각도 영상 제작 |
| 2026-08-29 | **자막 ASS 변환 방식 도입** — srt-to-ass.js (PlayResY=1920, Fontsize=52, Alignment=2, MarginV=120). compose-video.sh에서 SRT→ASS 자동 변환 후 ass 필터 적용. 자막 위치 하단 고정 확실 |
| 2026-08-29 | 나레이션 전체 음성 남성(Neural2-C)→여성(Neural2-A) 전환 (yongcha/filo/donway-narration.json). YONGCHA GitHub Actions 재실행 완료 |
| 2026-08-29 | 관제센터(mbtico.kr) 에러로그·소셜미디어 관리 탭 추가. _worker.js /api/trigger-social 엔드포인트 추가 (GITHUB_TOKEN Secret 필요). 에러 뱃지 실시간 갱신(24시간 기준) |
| 2026-08-28 | **브랜드 보이스 스킬 생성** `.claude/skills/mbtico-social-voice.md` — StoryScope + roy.branding 기반 AI 탈출 원칙 적용. 나레이션 스크립트 개선: yongcha 오프너 질문형 후크로 변경, mbtico 마무리 AI패턴 → 열린 CTA로 변경 |
| 2026-08-28 | **YONGCHA 영상 버그 2가지 수정** — ①무음(Google TTS 400 에러: ssmlGender FEMALE 제거), ②자막 화면가림(폰트명 'Noto Sans KR'→'Noto Sans CJK KR', 크기46→34, 노란색→흰색, MarginV 100→160). yongcha-subtitles.srt 나레이션 동기화. 자동 머지+배포 완료 |
| 2026-08-28 | YONGCHA YouTube 깨진 영상 ID: eDpowbKedgs (무음+자막가림) — 삭제 필요 |
| 2026-08-28 | 영상 퀄리티 전면 개선: 자막 노란색 46pt+두꺼운 검은 외곽선(TikTok 스타일), 음성 Neural2-C speedRate 1.0(자연스러운 구어체), 화면 scale+crop으로 꽉 채움(블러배경 제거), 나레이션 4종 전면 재작성 |
| 2026-08-28 | BGM: ffmpeg 자체 생성 방식 채택 (YouTube 오디오 라이브러리 저작권 우려 → 자체 합성 BGM 사용) |
| 2026-08-30 | **FiloPromo.jsx + DonwayPromo.jsx 시프티 스타일 리디자인** — ①WEEK_VARIANT 주간 A/B/C/D 로테이션(매주 훅문구·메뉴·스탯 자동 교체), ②로고 frame 0 즉시 노출(opacity fade 제거→썸네일 브랜드 표시), ③씬별 단색 배경(NAVY/BLUE_BG/TEAL_BG/WINE_BG), ④폰 목업 크게 중앙 배치(270×490), ⑤하단 굵은 헤드라인(52px bold), ⑥space-evenly 균등 배치(빈공간 버그 수정). main 자동머지 완료 |
| 2026-08-28 | FiloPromo.jsx 전면 재작성: Particles/AnimatedCounter 추가, 모든 씬 네이비 배경, 이모지→텍스트, TransitionOverlay Sequence 로컬프레임 버그 수정, hasBgm 지원 |
| 2026-08-28 | render-filo.js: videoBitrate '8M' 추가 (고화질 H.264) |
| 2026-08-28 | Oracle Cloud 초기화 완료 (oracle-init.sh 실행, Chromium /usr/bin/chromium 확인) |
| 2026-08-28 | 용차앱 영상 Oracle Cloud에서 완성 (30초, 1080x1920, output/yongcha-final.mp4) |
| 2026-08-28 | GitHub Actions FILO 렌더링+YouTube 업로드 트리거 (social-media.yml, 진행 중) |
| 2026-08-28 | superpowers 플러그인 설치 (v6.3.0, 스킬 14개) |
| 2026-08-27 | upload-instagram.js: /create/style/ 직접 이동 방식 추가 (버튼 클릭 폴백 유지), file input 강제 클릭 방식으로 파일 선택 안정화 |
| 2026-08-27 | upload-youtube-api.js: googleapis 기반으로 교체, --reels 모드 복원, 결과 JSON 저장 복원 |
| 2026-08-27 | compose-video.sh: 출력 해상도 1280x720→1080x1920 수정 (Shorts 흰배경 버그 수정) |
| 2026-08-27 | make-reels.sh: -ss/-t를 -i 뒤로 이동 (output seeking), 스케일 필터 제거 (compose 이미 1080x1920) |
| 2026-08-27 | GOOGLE_TTS_API_KEY Oracle VM 재등록, --reels 옵션 추가, 업로드 순서 명시 |
| 2026-08-27 | DONWAY YouTube 업로드 완료 (Data API v3), REFRESH_TOKEN 발급, 현황 업데이트 |
| 2026-08-27 | SOCIAL_MEDIA_MEMO.md 전면 업데이트 (Google TTS 전환, 세션 이전 완료 반영) |
| 2026-08-27 | social-media.yml 재작성: Oracle SSH 없이 GitHub Actions runner에서 직접 실행 (record+compose+youtube). Instagram은 Oracle SSH 복구 후 별도 job으로 실행. YouTube OAuth를 GitHub Secrets에서 읽도록 변경. |
| 2026-08-27 | 나레이션 JSON voice 필드 Google TTS로 통일, 자막 요금 정보 수정 |
| 2026-08-27 | launch-options.js Chromium 동적 탐색 추가 |
| 2026-08-26 | 경쟁사 분석, 자막·제목·시나리오 전면 재설계, 나레이션 TTS 파이프라인 추가 |
| 2026-08-26 | filo-landing.html POS 하드웨어 연동 준비중 문�� 추가 |
| 2026-08-26 | record-filo.js --login-only waitForURL → Enter키 방식 수정 |
| 2026-08-25 | 영상 블러배경 채우기 (흑바 제거), evaluate/click 액션 지원 추가 |
