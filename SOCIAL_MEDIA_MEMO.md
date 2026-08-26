# 소셜미디어 홍보 파이프라인 메모
> 세션 시작 시 이 파일 먼저 읽을 것. 매 세션 반복 설명 방지용.

---

## ⚠️ 현재 상태 (2026-08-26 기준)

### 완료된 것
- [x] 영상 녹화 스크립트 4개 (`scripts/capture/record-*.js`)
- [x] FFmpeg 편집 + 블러 배경 채우기 (`scripts/compose/compose-video.sh`)
- [x] Instagram Reels 세로형 추출 (`scripts/compose/make-reels.sh`)
- [x] YouTube 자동 업로드 (`scripts/upload/upload-youtube.js`)
- [x] 경쟁사 분석 기반 자막 재설계 (팩트·숫자 훅 방식)
- [x] 음성 나레이션 TTS 생성기 (`scripts/audio/generate-narration.js`)
- [x] 나레이션 스크립트 3개 (`*-narration.json`)
- [x] YouTube 제목 훅 강화 (경쟁사 직접 비교)
- [x] filo-landing.html POS 하드웨어 연동 준비중 문구 추가
- [x] record-filo.js 로그인 버그 수정 (Enter 키 방식)

### 🔴 막혀있는 것 (매 세션 반복되는 블로커)

| 블로커 | 해결 방법 | 담당 |
|---|---|---|
| **FILO 로그인 세션 없음** | 로컬 PC에서 `--login-only` 실행 후 Enter | 사용자 |
| **DINE 로그인 세션 없음** | 로컬 PC에서 `--login-only` 실행 후 Enter | 사용자 |
| **네이버 CLOVA TTS 키 없음** | 네이버 클라우드 플랫폼에서 발급 | 사용자 |
| **세션 파일 Oracle Cloud에 없음** | scp 명령으로 복사 | 사용자 |

---

## 📱 앱별 실제 화면 내용 (로그인 없이 접근 가능한 것들)

### FILO (filo.ai.kr) — 다크 UI

#### /table-order?dealerId=9XD2K3W1tIhIs6XM74YT0xfRFEP2&table=1
- 배경: `--bg:#07071a` (짙은 남색)
- 메뉴 카드 그리드 (이미지 + 이름 + 가격)
- 상단: 테이블번호, 매장명
- 스크롤하면 메뉴 카테고리별 섹션
- 장바구니 하단 고정

#### /kitchen?dealerId=9XD2K3W1tIhIs6XM74YT0xfRFEP2
- 배경: `--bg:#080810` (거의 검정)
- 실시간 주문 카드 (테이블번호 + 메뉴 + 수량 + 시간)
- 주문 들어오면 카드 추가됨 (데모 딜러ID라 실제 주문 없을 수 있음)

#### /app (로그인 필요)
- 이메일: soungkyekim@naver.com / 비번: khw3103!!!
- 딜러ID: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
- 대시보드: 오늘 매출, AI 브리핑, 최근 주문
- 메뉴: POS / 주문관리 / 재고 / 직원 / 스케줄 / 급여 / 마진 / 회원

#### filo.ai.kr (랜딩)
- 배경: `--bg:#ffffff` (흰색 — 영상에 안 좋음, 녹화 대상에서 제외)
- 슬라이드 0~5: `_setSlide(n)` JS로 전환 가능
- 슬라이드 3: POS 하드웨어 연동 준비중 배너 추가됨

### DONWAY (donway.ai.kr) — 데스크탑 1280x720

#### donway.ai.kr (랜딩)
- 슬라이드 0~4: `_setSlide(n)` JS로 전환
- 각 슬라이드: 쿠팡정산, 배달대행정산, 카카오알림톡, 세금계산서, 가격표

#### /donway_simulator.html (주의: /simulator 아님)
- 배달대행 정산 시뮬레이터
- 기사 수 입력 → 정산 결과 미리보기

#### /guide_ai.html (주의: /guide-ai 아님)
- AI 정산 가이드 페이지

#### /app (로그인 필요)
- 같은 계정: soungkyekim@naver.com

### YONGCHA (yongcha.app) — 모바일 390x844

#### yongcha.app (랜딩, 로그인 불필요)
- Worker에 HTML 내장 → 녹화 가능
- 섹션: 히어로 → 매칭 흐름 → AI 루트코치 → 단가비교 → 가격표 → 후기
- CJ대한통운 880원 / 한진 855원 / 롯데 860원 / 우체국 900원 / 쿠팡 960원 / 로젠 840원 (하드코딩)

---

## 🔑 계정 및 인증 정보

### Firebase 테스트 계정
```
이메일: soungkyekim@naver.com
비밀번호: → CLAUDE.md 참조 (절대 이 파일에 기재 금지)
딜러ID: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
```

### Oracle Cloud
```
IP: 161.33.136.154
사용자: opc
SSH키: C:\Users\82104\ssh-key-2026-08-02
```

### YouTube OAuth
```
Oracle Cloud ~/.env 파일에 저장됨
키 정보는 Google Cloud Console에서 확인
refresh_token은 Oracle Cloud .env에만 보관 (git에 절대 커밋 금지)
```

### Playwright 세션 파일 경로
```
로컬 PC: C:\Users\82104\.mbtico-profiles\
Oracle Cloud: /home/opc/.mbtico-profiles/
세션 종류: filo-record / dine-record / youtube-upload / instagram-upload / naver-blog
```

---

## 🚀 로컬 PC에서 해야 할 작업 (1회만)

### 1. FILO 로그인 세션 저장 (PowerShell)
```powershell
cd C:\Users\82104\Desktop\mbti-logistics
git pull
$env:HEADLESS="false"; node scripts/capture/record-filo.js --login-only
# 브라우저에서 soungkyekim@naver.com 로그인 → 대시보드 확인 → 터미널에서 Enter
```

### 2. DINE 로그인 세션 저장 (PowerShell)
```powershell
$env:HEADLESS="false"; node scripts/capture/record-dine.js --login-only
# 같은 계정 로그인 → 대시보드 확인 → 터미널에서 Enter
```

### 3. YouTube 로그인 세션 저장
```powershell
$env:HEADLESS="false"; node scripts/upload/upload-youtube.js --login-only
# Google 계정 로그인
```

### 4. 세션 파일 Oracle Cloud로 복사
```powershell
scp -i "C:\Users\82104\ssh-key-2026-08-02" -r "C:\Users\82104\.mbtico-profiles\" opc@161.33.136.154:/home/opc/.mbtico-profiles/
```

---

## ☁️ Oracle Cloud에서 영상 제작 실행

```bash
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154

cd ~/mbti-logistics && git pull

# 나레이션 생성 (TTS 키 있을 때)
export NAVER_TTS_CLIENT_ID=xxx
export NAVER_TTS_CLIENT_SECRET=yyy
node scripts/audio/generate-narration.js --product filo

# 전체 파이프라인 (녹화 → 편집 → YouTube 업로드)
node scripts/run-pipeline.js --product filo --steps record,compose,youtube
node scripts/run-pipeline.js --product donway --steps record,compose,youtube
node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube
```

---

## 🎬 영상 구조 (현재 설계)

### FILO (~40초)
```
0-4s   : /table-order 로드 (QR 주문 화면, 다크 남색)
4-12s  : 메뉴 스크롤 (음식 이미지들)
12-16s : /kitchen (주방 실시간 디스플레이, 거의 검정)
16-21s : /app 대시보드 (로그인 필요)
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
0-35s  : 랜딩 전체 스크롤 (로그인 불필요)
         히어로 → 매칭 흐름 → AI 루트코치 → 가격표
자막: "수수료 20% 뜯김" → "직접 매칭 월정액 고정"
```

---

## 🎙️ 나레이션 TTS 설정

### 네이버 CLOVA Voice (권장, 한국어 최고 품질)
- 발급처: https://www.ncloud.com → AI Services → CLOVA Voice
- 무료: 월 2만자
- 환경변수: `NAVER_TTS_CLIENT_ID`, `NAVER_TTS_CLIENT_SECRET`
- 기본 음성: `nara` (차분한 여성)

### ElevenLabs (대안)
- 발급처: https://elevenlabs.io
- 무료: 월 1만 글자
- 환경변수: `ELEVENLABS_API_KEY`

---

## 📊 경쟁사 차별화 핵심 포인트 (영상 메시지 기준)

### FILO
- 경쟁사: 테이블링(99,000원/월) + 티오더(19,000원/대) + OKPOS(30,000원) = 월 148,000원+
- FILO: 이 모든 기능 하나에 (요금 문의)
- 독보 기능: QR출퇴근 + 급여 + 마진분석 + 다국어 번역 + AI매출예측 (시장에 통합 경쟁 없음)

### DONWAY
- 직접 경쟁사 없음 (쿠팡이츠 AI정산 + 카카오 알림톡 자동발송 국내 유일)
- 가격: ~50명 125,000원 / ~100명 250,000원

### YONGCHA
- 경쟁사(원콜, 혼적콜): 주선사 구조, 수수료 20%+ 불투명
- 용차앱: 주선사 없는 직접 매칭 / 기사 월 150,000원 고정 / AI 루트코치
- DONWAY 구독 소장 → 용차앱 무료 (생태계 락인)

---

## 📋 다음 작업 우선순위

1. **로컬 PC에서 FILO 로그인 세션 저장** (매 세션 반복되는 블로커 해소)
2. **네이버 CLOVA TTS 키 발급** → 음성 나레이션 생성
3. **세션 파일 Oracle Cloud 복사** → 자동 업로드 가능
4. **Oracle Cloud에서 재녹화** → 더 나은 영상 품질
5. **BGM 파일 추가** → `assets/bgm/background.mp3`

---

## 📝 수정 이력
| 날짜 | 작업 내용 |
|---|---|
| 2026-08-26 | 경쟁사 분석, 자막·제목·시나리오 전면 재설계, 나레이션 TTS 파이프라인 추가 |
| 2026-08-26 | filo-landing.html POS 하드웨어 연동 준비중 문구 추가 |
| 2026-08-26 | record-filo.js --login-only waitForURL → Enter키 방식 수정 |
| 2026-08-25 | 영상 블러배경 채우기 (흑바 제거), evaluate/click 액션 지원 추가 |
