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

### Oracle SSH 키 문제 해결 방법
현재 `ssh-key-2026-08-02.key`가 Oracle VM에서 Permission denied 발생.

**해결 방법 (Oracle Cloud Console에서):**
1. Oracle Cloud Console → Compute → Instances → filo-a1-2c12g
2. 오른쪽 메뉴 → Console connection → Create console connection
3. 브라우저 VNC/SSH 터미널에서 접속
4. `cat ~/.ssh/authorized_keys` 확인
5. 새 공개키 추가: `echo "새_공개키" >> ~/.ssh/authorized_keys`

---

## 현재 상태 (2026-08-27 기준)

### 완료된 것
- [x] 영상 녹화 스크립트 4개 (`scripts/capture/record-*.js`)
- [x] FFmpeg 편집 + 블러 배경 채우기 (`scripts/compose/compose-video.sh`)
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
- [ ] **DONWAY Instagram Reels 업로드** — 진행 예정
- [ ] **YONGCHA 영상 제작** — Oracle VM에서 실행 필요
- [ ] **FILO 영상 제작** — Oracle VM에서 실행 필요

### Oracle VM ~/.env 등록 항목 (2026-08-27 기준)
```
GOOGLE_TTS_API_KEY=등록완료  ← "API 키 3개" (Cloud Text-to-Speech API 전용, 2026-08-27 생성)
YOUTUBE_CLIENT_ID=40761160761-3v5h03e9r974vfq2io4oa08nqhn6r5o8.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=등록완료  ← Google Cloud Console → OAuth 2.0 → mbtico-youtube (데스크톱)
YOUTUBE_REFRESH_TOKEN=등록완료
```

### Google Cloud Console API 키 목록
| 이름 | 용도 | 비고 |
|---|---|---|
| API 키 3개 | **GOOGLE_TTS_API_KEY** (Google TTS 나레이션 생성) | Cloud Text-to-Speech API 전용 |
| mbti | 범용 API 키 (6개 API) | Firebase 등 |
| Browser key | Firebase 자동 생성 | 수정 금지 |

---

## 콘텐츠 캘린더 (자동화 기반, 2026-08 ~ 09)

> `scripts/content/calendar.json` 에 전체 항목 관리. 아래는 요약.

| 날짜 | 제품 | 기능 | 플랫폼 | 상태 |
|---|---|---|---|---|
| 2026-08-11 (월) | 용차앱 | 기사·대리점 직접 매칭 | YouTube | ⏳ |
| 2026-08-11 (화) | FILO | QR 테이블 주문 | YouTube | ⏳ |
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
| **BGM 파일 없음** | YouTube 오디오 라이브러리 → `assets/bgm/background.mp3` | 사용자 |
| **FILO·YONGCHA 영상 미생성** | Oracle VM에서 record + compose 실행 필요 | 사용자 |

### 업로드 필수 순서 (반드시 지킬 것)
```
1. node scripts/audio/generate-narration.js --product <product>  # 나레이션 MP3 생성
2. bash scripts/compose/compose-video.sh <product>               # 나레이션+자막 합성
3. node scripts/upload/upload-youtube-api.js --product <product> --reels  # 숏츠 업로드
   또는 --reels 없이 일반 영상 업로드
```
compose 없이 업로드하면 나레이션 없는 무음 영상이 올라감!

### 영상 제작 현황
| 제품 | 나레이션 MP3 | 프로모 HTML | 녹화 WebM | 편집 MP4 | YouTube |
|---|---|---|---|---|---|
| FILO | 미생성 | ✅ 6종 생성 | Remotion | ⏳ GitHub Actions 렌더링 중 | ⏳ 업로드 진행 중 |
| DONWAY | ✅ 완료 | ✅ 4종 생성 | output/donway-raw.webm | ✅ 완료 (음성포함) | ✅ 숏츠 완료 (3HRSPE2bNDM) |
| YONGCHA | ✅ 완료 | ✅ yongcha-promo.html | output/yongcha-raw.webm | ✅ 완료 (Oracle Cloud, 2026-08-28) | ⏳ YouTube 토큰 등록 후 가능 |
| MBTICO | 미생성 | ✅ mbtico-ocr.html | 미생성 | 미생성 | 미완 |

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
- 무료: WaveNet 월 100만 자
- 환경변수: `GOOGLE_TTS_API_KEY` (`~/.env`)
- 기본 음성: `ko-KR-Wavenet-A` (여성, 속도 0.95)

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
2. ~~**YONGCHA 영상 제작**~~ ✅ Oracle Cloud 편집 완료 (2026-08-28, output/yongcha-final.mp4)
3. **YONGCHA YouTube 업로드** → YouTube Secrets 등록 후 `node scripts/upload/upload-youtube-api.js --product yongcha --reels`
4. **FILO 영상 제작** → GitHub Actions 렌더링 중 (FiloPromo.jsx 전면 재작성 — 네이비 배경, 애니메이션, 8Mbps)
5. **BGM 파일 추가** → YouTube 오디오 라이브러리 → `assets/bgm/background.mp3` → git push
6. **DONWAY Instagram Reels 업로드** → Instagram 세션 필요

### 업로드 방향 (확정)
- YouTube: **숏츠(--reels) 우선** — 구독자 적을 때 알고리즘 노출 유리
- Instagram: **Reels 우선** — 음성(나레이션) 포함 세로형 영상
- **음성 없이 올리지 말 것** — 반드시 나레이션 생성 후 합성 → 업로드

---

## 수정 이력
| 날짜 | 작업 내용 |
|---|---|
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
