# 용차앱 (yongcha.app) 세션 메모
> 세션 시작 시 이 파일 전체 읽기 필수. 수정 후에는 변경 이력 업데이트.

---

## 앱 개요
- **서비스**: 택배 대리점 소장 ↔ 용차 기사 매칭 플랫폼
- **도메인**: yongcha.app
- **타겟**: 택배 기사(개인사업자/프리랜서) + 택배 대리점 소장

---

## 핵심 파일

| 파일 | 역할 | 수정 방식 |
|------|------|----------|
| `yongcha.html` | 소스 오브 트루스 (전체 앱 UI+JS) | 수정 후 yongcha-worker.js 동기화 **필수** |
| `yongcha-worker.js` | yongcha.app 전용 worker — `YONGCHA_HTML` 상수에 yongcha.html 전체 임베드 | yongcha.html 수정 → YONGCHA_HTML 동기화 → push → wrangler deploy |

### ⚠️ yongcha.html 수정 후 동기화 방법 (필수)
```js
// scripts/sync-yongcha.js (또는 아래 Node 한 줄 명령)
node -e "
const fs=require('fs');
const w=fs.readFileSync('yongcha-worker.js','utf8');
const h=fs.readFileSync('yongcha.html','utf8');
const mk='const YONGCHA_HTML = \`';
const s=w.indexOf(mk);
let p=s+mk.length;
while(p<w.length){const n=w.indexOf('\n',p);if(n===-1)break;if(w.substring(p,n)==='\`;'){
  fs.writeFileSync('yongcha-worker.js',w.substring(0,s+mk.length)+h+'\n'+w.substring(p),'utf8');
  console.log('동기화 완료');break;}p=n+1;}
"
```
KV 업로드는 yongcha.app에 **전혀 효과 없음** — `yongcha-worker.js`가 YONGCHA_HTML 상수를 직접 서빙하기 때문.
| `yongcha-landing.html` | ~~랜딩 페이지~~ **삭제됨 (2026-08-30)** | — |

---

## 절대 금지

- `wrangler.toml` 수정 금지
- `_worker.js` 라우팅 구조 변경 금지 (donway/filo/dine/yongcha 공존)
- `_worker.js` 내 `}{status:400` 치환 패턴 수정 금지 (빌드 깨짐)
- KV 업로드로 yongcha 기능 배포 불가 — 반드시 `_worker.js` + push 방식
- 다른 앱 ID(filo_, dine_, donway_) 관련 코드 건드리지 말 것
- PR 생성 금지 (auto-merge로 자동 처리)

---

## 배포 방식

```bash
# yongcha.html 수정 후 → _worker.js YONGCHA_HTML_YONGCHA 동기화도 필요
# 단, 소규모 버그는 _worker.js 내 해당 위치만 직접 수정 가능

git add yongcha.html _worker.js
git commit -m "fix: 수정내용"
git push -u origin claude/브랜치명
# push → auto-merge → deploy.yml 자동 실행 → 배포 완료
```

---

## 사용자 유형 (Firestore `type` 필드)

| type | 역할 | 홈 화면 |
|------|------|---------|
| `driver` | 용차 기사 | `_pgHomeDriver()` |
| `agency` | 대리점 소장 | `_pgHomeAgency()` |
| `admin` | 관리자 | `_pgHomeAdmin()` |

---

## Firestore 컬렉션 (용차 전용)

| 컬렉션 | 용도 |
|--------|------|
| `yongcha_users` | 기사/소장 프로필 (lat/lng/trustScore/geoUpdatedAt 포함) |
| `yongcha_posts` | 배차 공고 (status: open/running/done) |
| `yongcha_applies` | 기사 지원 현황 |
| `yongcha_work` | 배차 진행/완료 기록 (step/taxInvoiceState) |
| `yongcha_settlements` | 정산 내역 |
| `yongcha_reviews` | 상호 평가 |
| `yongcha_chat` | 1:1 채팅 |
| `yongcha_jobs` | 구인구직 공고 |
| `yongcha_resumes` | 기사 이력서 |
| `yongcha_daily_records` | 일일 건수/정산 기록 |
| `yongcha_scouts` | 스카우트 제안 |
| `donway_settlements` | DONWAY 정산 연동 |
| `yongcha_income_manual` | 기사 수기 수입 입력 (workDate/area/courier/count/unitPrice) |

---

## 기초구역 경계 API

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `GET /api/yongcha/basidco?zip=XXXXX` |
| 응답 | `{ok:true, coords:[{lat,lng},...], lat, lng, source}` |
| 1순위 | business.juso.go.kr WFS (apikey: `3B63BE88F1A06653075E0C88883B157E`) |
| 2순위 | vWorld WFS (key: `DCCA6DA8-58C2-3561-B5AC-FC7DC19BCA6A` / env.VWORLD_API_KEY) |
| 3순위 | KV `basidco:{zip}` 캐시 |
| 클라이언트 | `_doUpdateMapZones()` → fetch 후 `L.polygon()` 그리기 (Leaflet.js) |

---

## 주요 전역 변수

| 변수 | 설명 |
|------|------|
| `_CU` | 현재 로그인 사용자 (Firestore 프로필) |
| `_myGeo` | 실제 GPS 좌표 `{lat, lng}` — watchPosition으로 갱신 |
| `_allPosts` | 공고 목록 캐시 |
| `_CALC_KEY` | 실수령액 계산기 localStorage 키 `yongcha_calc_v1` |
| `_db` | Firestore 인스턴스 |

---

## 주요 함수 목록

### 페이지 라우팅
- `_goPage(p)` — 페이지 이동 (home/posts/mywork/profile/jobs 등)
- `_pgHome(el)` → `_pgHomeDriver(el)` / `_pgHomeAgency(el)`
- `_pgPosts(el)` — 공고 목록 (SmartMatch AI 탭 포함)
- `_pgMyWork(el)` — 내 배차 현황 (3-Touch 워크플로우)
- `_pgProfile(el)` — 내 정보
- `_pgJobs(el)` — 구인구직 게시판

### 모달
- `_openModal()` / `_closeModal()` — 바텀 시트 제어
- `_showPostDetail(id)` — 공고 상세 모달
- `_yOpenCalc(prefill?)` — 실수령액 계산기 모달
- `_yCalcRun()` — 계산기 실시간 계산

### 위치/지도
- `_yLoadGeo()` — GPS 취득 (Promise) — 주의: _CU.lat/lng로 먼저 채움
- `_loadKakaoMap(cb)` — (deprecated, no-op 래퍼로 유지) 카카오맵 SDK 로드 → Leaflet로 마이그레이션 완료
- `_lTiles(m)` — Leaflet 지도에 OpenStreetMap 타일 레이어 추가 헬퍼
- `/api/geocode?q=` — Nominatim 프록시 (주소→{x,y} 좌표), yongcha-worker.js 핸들러
- `/api/reverse-geocode?lat=&lng=` — Nominatim 역지오코딩 (좌표→행정구역명)
- 홈 지도: watchPosition으로 실시간 파란 점 갱신 (_homeWatchFirst 플래그)

### AI
- `/api/yongcha/smart-match` — AI 공고 매칭 스코어
- `/api/yongcha/quick-post` — 자연어 → 공고 필드 파서
- `/api/yongcha/price-suggest` — AI 단가 추천
- `/api/yongcha/gas-stations` — OPINET 주유소 추천

### 신뢰도
- `_trustGradeCls(score)` — S/A/B/C 등급 반환
- `_driverGrade(score, routes)` — 기사 등급 계산

---

## 실수령액 계산기 (_yOpenCalc)

**개인사업자·프리랜서 개념으로 계산 (중요)**

| 항목 | 계산 |
|------|------|
| 월 총매출 | 건당단가 × 일물량 × 월근무일수 |
| 사업소득세 | 총매출 × 3.3% (토글 ON 시만) |
| 유류비 | 입력값 차감 |
| 차량 할부/리스 | 입력값 차감 |
| 보험료 | 입력값 차감 |
| 기타(통신·정비) | 입력값 차감 |
| **월 실수령액** | 총매출 - 세금 - 4개 지출 |
| 일 실수령 | 월 실수령 ÷ 근무일수 |
| 시급 환산 | 일 실수령 ÷ 10h |

- localStorage `yongcha_calc_v1`에 마지막 입력값 저장
- 공고 상세에서 `_yOpenCalc({price, vol})` prefill 가능

---

## 홈 지도 (기사용)

- **초기 중심**: `_CU.lat/_CU.lng` (프로필) → 없으면 부산 기본값
- **파란 점 (현위치)**: 초기 center, 이후 `watchPosition`으로 실시간 이동
- **watchPosition 설정**: `{enableHighAccuracy:true, timeout:10000, maximumAge:5000}`
- 주의: `_yLoadGeo()`가 `_CU.lat/_CU.lng`로 `_myGeo`를 먼저 채우므로, 지도 마커는 반드시 독립적으로 watchPosition 실행

---

## _worker.js YONGCHA_HTML_YONGCHA 동기화 규칙

| 수정 규모 | 방식 |
|----------|------|
| 소규모 버그 1-5줄 | `_worker.js` 내 해당 위치 직접 수정 + `yongcha.html` 동일 수정 |
| 대규모 기능 추가 | `yongcha.html` 먼저 완성 → 전체 상수 교체 (Python/bash로 자동화) |

**YONGCHA_HTML_YONGCHA 위치**: `_worker.js` line ~11472 (전체 약 2,200줄 상수)

---

## 팝빌 세금계산서 (2026-08-28 수정 완료)

- `/api/yongcha/popbill-issue` POST — 서버 핸들러 정상 (yongcha_work + yongcha_users Firestore 조회 후 호출)
- **수정 완료**: `_ySendSettleNotify` 클라이언트 호출에 `Authorization: Bearer <token>` 헤더 추가 (`_yGetToken()` 사용)
  - `yongcha.html` line 3204, `_worker.js` line 15342 (YONGCHA_HTML_YONGCHA 내부) 동시 수정
- `yongcha-worker.js`에 팝빌 라우트 추가 필요 (현재 `_worker.js`에만 있음) — 미완료

---

## 경쟁사 벤치마킹 — 화물24시 (2026-08-17 실물 스크린샷 분석)

### 화물24시 기능 목록

| 화면 | 기능 | 비고 |
|------|------|------|
| 홈 | 배차내역, 음성등록, 사진전송, 화물정보, 화물등록, 협력업체, 가상계좌, 스마트배차, 공지사항 | 컬러 그리드 버튼 |
| 마이페이지 | 매출내역, 변경서류 등록, 자동터치 내역, 스마트배차 내역, 운송료 입금계좌, 쪽지/알림, 약관계약동의 | 긴 스크롤 리스트 |
| 마이페이지 | 산재보험료 모의계산기, 전자세금계산서(발행/수신), 가상계좌, 카드결제지원, 적재물보험 | 개인사업자 기능 |
| 화물목록 | 가로 스크롤 카드 (지역/거리/톤수/금액), "N" 신규배지, 직접/당일/지역 배지, 1,149건 | 오더 수가 매우 많음 |
| 화물상세 | 상차지/하차지/화물정보/차종/운행방법/수수료/확정금액/인수중 상태 | 660원 정보이용료 과금 |

### 화물24시 핵심 비즈니스 모델
- **충전금 시스템**: 잔액 738,310원 → 오더 정보 볼 때마다 **660원 차감** (정보이용료)
- **자동터치**: 등록 조건에 맞는 오더 자동 배차신청 (핵심 유료 기능)
- **스마트배차**: 특별 배차 시스템 (별도)

### 화물24시 약점 (우리가 넘어설 포인트)
- **UI가 매우 구식**: 흰 배경 + 단순 리스트 + 2010년대 느낌
- **AI 전무**: 매칭 스코어링 없음, 자동터치는 룰 기반
- **소장(대리점)용 기능 없음**: 오더 등록자 관리 화면 미흡
- **구인구직 없음**: 기사 채용 연결 기능 없음
- **실수령액 계산**: 산재보험료 계산기만 있고 유류비/할부/보험료 통합 없음
- **신뢰도 시스템 없음**: 기사 등급/평점 없음
- **야간 사용 고려 없음**: 다크모드 없음 (기사 대부분 야간 작업)

### 화물24시에 있는데 우리가 없는 것 (추가 검토)
| 기능 | 우선순위 | 비고 |
|------|----------|------|
| 음성 오더 등록 | 중 | NL 파서로 대체 가능 |
| 적재물보험 연계 | 낮 | 보험사 파트너 필요 |
| 협력업체 네트워크 | 낮 | 추후 검토 |
| 가상계좌 관리 | 낮 | 팝빌로 커버 가능 |

### 우리 앱 차별화 확정 요소
1. AI SmartMatch — 화물24시는 룰기반, 우리는 스코어 + 이유 표시
2. 다크 테마 — 야간 기사 배려 (화물24시 흰 배경 불편)
3. 실수령액 계산기 — 유류비/할부/보험/3.3% 통합 (화물24시는 산재만)
4. 대리점(소장) 전용 대시보드 — 화물24시는 기사 중심
5. 구인구직 게시판 — 화물24시 없음
6. 신뢰도 S/A/B/C 등급 — 화물24시 없음
7. 정보이용료 없음 — 화물24시는 오더 볼 때마다 660원 과금

---

## 영업용 번호판 업계 지식 (국토부 기준)

### 사업용 차량 번호판 한글 문자 (아·바·사·자·배)
- 일반(자가용) 번호판 한글: 가·나·다·라·마 / 거·너·더·러·머·버·서·어·저 / 고·노·도·로·모·보·소·오·조 / 구·누·두·루·무·부·수·우·주 등 32개
- **사업용(운수사업용) 번호판 한글: 아·바·사·자·배** 5개만
- 색상: 노란색 번호판 = 영업용 사업용

### 배넘버 vs 아바사자 핵심 차이

| 구분 | 배넘버 (`배`) | 아바사자 (`아·바·사·자`) |
|---|---|---|
| 발급 주체 | 택배회사 (CJ·한진·롯데 등) | 국토부 (개인 취득) |
| 비용 | **무상 제공** (위·수탁 계약 시) | **구매 필요** (수백만~수천만원) |
| 업무 범위 | **택배 전용** — 발급 회사 업무만 가능 | **화물운송 전반** — 용차 자유롭게 가능 |
| 용차 가능 여부 | 발급 회사 ❌ / 타 회사 △ (규정 확인 필요) | ✅ 자유롭게 용차 가능 |
| 신규 발급 | 택배회사 계약 시 발급 | 신규 등록 불가 — 기존 번호판 거래만 |

### 화물 영업용 번호판 종류 (적재량 기준)
| 종류 | 적재량 | 비고 |
|---|---|---|
| 개인 소형 (용달) | 1.5톤 이하 | |
| 개인 중형 (개별) | 1.5톤 초과 ~ 16톤 이하 | |
| 개인 대형 | 16톤 초과 | |

### 용차앱 관련 실무 규칙
- **배넘버 차량**: 발급받은 택배회사에서는 용차 근무 불가 (이미 소속)
- **타사 배넘버 차량**: 원칙적으로 가능하나 해당 회사 내부 규정 확인 필요 (쿠팡 등 폐쇄 시스템은 제한 가능)
- **아바사자 번호판 차량**: 어느 회사든 용차 자유롭게 가능
- 앱 기사 프로필에 "번호판 유형(배/아바사자)" + "발급 회사" 필드 추가 검토 중

### 출처
- [국토부 유튜브 — 번호판 색깔·숫자 의미](https://www.newsis.com/view/NISX20250814_0003291603)
- [예비 루트매니저 칼럼 — 아바사자 vs 배넘버 차이](https://xn--3e0bz3zo6d40g5ntf5avy.com/routemanager/?bmode=view&idx=28840320)
- [화물차 영업용번호판 구입 가이드](https://dstruckstory.com/%ED%99%94%EB%AC%BC%EC%B0%A8-%EC%98%81%EC%97%85%EC%9A%A9%EB%B2%88%ED%98%B8%ED%8C%90-%EA%B5%AC%EC%9E%85%EA%B3%BC-%EC%9A%B4%EC%86%A1-%ED%97%88%EA%B0%80-%EC%A0%88%EC%B0%A8-%EC%99%84%EB%B2%BD-%EA%B0%80/)

---

## 국토부 유권해석 결과 (2026-09-17)

- **민원번호**: 1AA-2609-0025376
- **답변일**: 2026-09-17 15:24:28
- **처리기관**: 국토교통부 물류산업과
- **담당자**: 김승현 (044-201-4026)

### 결론 요약

| 조항 | 결론 |
|---|---|
| 제24조 화물운송주선사업 | **해당 없음** — 화주가 개입하지 않는 구조이므로 현행법상 주선사업 허가 불필요 |
| 제24조의2 화물정보망사업자 | 현행법 직접 언급 없음 — 단, **개정안 모니터링 필수** |

### 🚨 법 개정 현황 (2026-09-17 업데이트)

- **의안번호 15469** ('25.12.22. 발의, 맹성규 의원 대표발의)
- **2026년 8월 26일 국회 본회의 통과 (이미 통과됨!)**
- 주요 내용: "화물운송플랫폼사업" 독립 업종 신설 — 플랫폼 운영자 등록/신고 의무화
- **시행일**: 공포 후 1년 경과일 → 2027년 하반기 예정
- 참고: 여객 분야 타다법(2020년)과 동일 구조 — 플랫폼 업종 등록제 도입
- 출처: 법률신문 https://www.lawtimes.co.kr/news/articleView.html?idxno=226508

### 실무 적용

- 현재(2026-09 기준): 아직 유예기간 — 별도 허가·등록 없이 운영 **적법**
- 시행일(2027년 하반기) 이후: 화물운송플랫폼사업자 **등록/신고 의무** 발생
- **즉시 해야 할 것**:
  1. 국토부 담당자 김승현(044-201-4026)에게 등록 요건 사전 확인
  2. 시행령/시행규칙 입법예고 모니터링
  3. 유한회사 엠비티아이 법인으로 등록 가능 여부 확인 (자본금 요건 등)
- 앱 내 "부가통신사업자" 포지셔닝 유지하되 등록 준비 병행

---

## 변경 이력

| 날짜 | 파일 | 내용 |
|------|------|------|
| 2026-09-18 | yongcha.html, yongcha-worker.js | **채팅방 입력창 하단 네비게이션에 가려지는 버그 수정**: `_pgChatRoom` 진입 시 `#bnav` hide(`display:none`), `_goPage` 복귀 시 `#bnav` 복원(`display:''`). |
| 2026-09-18 | yongcha.html, yongcha-worker.js | **지원 후 새로고침 시 버튼 초기화 버그 수정**: `_myAppliedPosts{}` 캐시 추가. `_loadFilteredPosts()` 진입 시 `yongcha_applies` 1회 조회해 기사 지원 이력 캐시 로드. `_makePostCard`에서 `_myAppliedPosts[d.id]` 체크 — 이미 지원 시 "지원함"(disabled) 렌더. `_applyPost` 성공 시 캐시에 추가, `_yCancelApply` 성공 시 캐시 삭제. |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **30일 무료체험 시스템**: 가입 시 trialEndsAt(+30일) 저장, D-7 주황 배너/D-0 빨간 배너+구독 모달 자동 표시 (_yCheckTrial, _yShowTrialBanner, _yShowSubscribeModal) |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **귀로 매칭**: 배송 완료 모달에 50km 이내 open 공고 자동 검색 패널 추가 (_yAutoFindReturnTrip, _yFindReturnTrip) — 완료 지점 기준 거리순 정렬, 상위 3건 표시 |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **소득장부 페이지** (_pgIncomeLedger): 기사 yongcha_applies 월별 집계, 단순경비율 61.5% 종합소득세 예상, 월별 운행 목록 펼침. 홈 퀵액션·프로필 진입 버튼 추가 |
| 2026-08-17 | yongcha.html, _worker.js | 홈 지도 현위치 버그: watchPosition 실시간 GPS 추적으로 교체 |
| 2026-08-17 | yongcha.html | 실수령액 계산기 토글 "부가세" → "사업소득세" 수정 |
| 2026-08-17 | _worker.js | FILO/DINE 로고 base64 임베드 (아이콘 404 → 직접 서빙) |
| 2026-08-30 | _worker.js, yongcha-worker.js | AI 매칭→AI 추천, 노선 지원·직접 선택 텍스트 동기화 (yongcha.html 커밋 aeb8902·01b0a52 반영) |
| 2026-08-30 | _worker.js, yongcha-worker.js | 프로필 화면 로그아웃 버튼 위 부가통신사업자 법적 고지 문구 추가 |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js, yongcha-landing.html, yongcha-meta.json | 부가통신사업자 포지셔닝 전면 반영: '배차'→'단건 요청/운행/연결', '배차완료'→'운행완료', AI 프롬프트 '배차 최적화'→'기사 추천 정보', 마케팅 메시지 '직접 매칭'→'직접 거래 정보 서비스' |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js | 공고 등록 지도: 600m Circle → USE_DISTRICT 기초구역 경계 레이어 + CustomOverlay 라벨 표시. zoom level 5→4. Circle 코드 완전 제거. |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js | 지도 구역 표시: USE_DISTRICT(용도지역 오표시) → /api/yongcha/basidco 호출 후 실제 기초구역 Polygon 그리기로 교체. 기초구역 API 섹션 메모 추가. |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js | 샌드박스(부가통신사업자) 대비: "플랫폼 최소보장"→"소장 제시 최소보장", "지급 의무"→"계약 조건에 따름", "플랫폼 고정"→"소장 설정"으로 전면 교체. 플랫폼이 운송/고용 주체가 아님을 명확화. |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js | 공고 등록 구역 정보 섹션에 배송지 우편번호(pw-deliveryZip) 입력 필드 추가. Firestore yongcha_posts.deliveryZip 저장. 상차지와 별개 필드. |
| 2026-08-30 | yongcha-landing.html | 랜딩 페이지 전면 리디자인: 다크 네이비→흰색 테마, 세로 스크롤→가로 슬라이드 5패널 (Hero/기능/요금제/후기/CTA), KV 재배포 필요 |
| 2026-08-30 | yongcha-landing.html | 랜딩 페이지 삭제 — 허위 수치(2,400+ 기사 등) 포함, 마케팅 미집행 상태라 불필요. git rm + KV 키 삭제 필요 |
| 2026-08-30 | yongcha.html, _worker.js, yongcha-worker.js | 샌드박스(부가통신사업자) 대비 표현 추가 교체: '건당 단가'→'건당 금액', '가구당 단가'→'가구당 금액', 'AI 단가 추천'→'AI 금액 추천', '채용공고'→'공고', '채용중'→'모집중', '채용인원'→'모집인원', '채용 승인'→'수락 통보', '구인구직' 탭→'공고/이력서', '정직원 채용과 구별'→'장기 계약과 구별' |
| 2026-08-31 | yongcha.html, _worker.js, yongcha-worker.js | _doUpdateMapZones: USE_DISTRICT(용도지역 색상 레이어) 제거 → /api/yongcha/basidco?zip= 호출 후 실제 기초구역 경계 kakao.maps.Polygon 그리기로 교체. 3파일 동기화. |
| 2026-08-31 | yongcha.html, _worker.js, yongcha-worker.js | 부가통신사업자(통신업) 규제 샌드박스 대비 전면 수정: 계약서→합의 메모(면책 문구 추가), 서명하기/서명 완료→내용 확인/확인 완료, 출근 확정→운행 시작 확정, 출근 일정→운행 시작 일정, 고용형태→계약유형, 정규직/계약직→장기계약/단기계약/건별계약, 배차 확정→연결 확정, 단가→건당 금액. 플랫폼 비당사자 명시 면책 문구 합의 메모 모달 내 삽입. |
| 2026-09-01 | yongcha-worker.js | YONGCHA_HTML 로그인 화면 로고 → 파란 3D 트럭 JPEG 인라인 교체 (a46f6974-image.png, 1536×1024 RGBA 원본, 검은 배경 합성 후 JPEG 인라인, b64 463332자). YONGCHA_ICON_192·ICON_512·ICON_APPLE — 동일 파란 3D 트럭 PNG 아이콘으로 갱신. YONGCHA_HTML `<head>`에 `<link rel="icon" href="/icon-192.png">` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` 추가 (PWA 홈화면 아이콘 연결). |
| 2026-09-02 | yongcha.html, yongcha-worker.js | 지도 2건 수정: (1) _addZipCodeZone: daum.Postcode 팝업 제거 → /api/yongcha/basidco 직접 호출 (basidco 응답 필드: {ok,coords,lat,lng,zipName}). (2) yongcha-worker.js에 /api/yongcha/basidco 프록시 라우트 추가 (filo.ai.kr로 프록시, KV 바인딩 공유). (3) 카카오맵 프리로드: env.KAKAO_JS_KEY 우선 사용, 없으면 하드코딩 폴백. |
| 2026-09-02 | yongcha.html, yongcha-worker.js | 로그인 타임아웃 20초 추가: signInWithEmailAndPassword 응답 없을 때 버튼 무한 "로그인 중..." 방지. yongcha-worker.js /filo-memo.js 스텁 라우트 추가 (404→HTML 반환→JS SyntaxError 방지). YONGCHA_HTML 동기화. |
| 2026-09-02 | yongcha-worker.js | /api/yongcha/basidco: filo.ai.kr 프록시·Nominatim·Kakao REST 모두 제거 → business.juso.go.kr WFS(apikey: 3B63BE88F1A06653075E0C88883B157E) + vWorld WFS/REST(key: DCCA6DA8-58C2-3561-B5AC-FC7DC19BCA6A) 공개키로 교체. 비밀 키 없이 한국 5자리 기초구역번호 좌표 조회. yongcha.html _addZipCodeZone: kakao.maps.services.Geocoder 제거 → /api/yongcha/basidco 서버 API 호출로 변경. |
| 2026-09-09 | yongcha-worker.js | 보안: /api/routeiq-match, /api/yongcha/recommend, /api/yongcha/quick-post, /api/yongcha/entrance-codes GET — ycVerifyToken 인증 추가 (미인증 시 401) |
| 2026-09-09 | yongcha.html | 보안: /api/routeiq-match, /api/yongcha/recommend, /api/yongcha/entrance-codes 3개 fetch에 Authorization: Bearer 토큰 추가 |
| 2026-09-10 | yongcha-worker.js | 로그인 로딩 화면 stuck 수정: body 인라인 스크립트에 9초 비상 폴백 타이머 추가 (Firebase CDN 로드 실패 시에도 로그인 화면 표시). _yRiqMatch·_yAiRecommend: await를 비async .then() 안에서 쓰던 버그 수정 (_riqTok/_aiTok=undefined → Authorization: Bearer undefined → 401). 올바른 .then(function(tok){}) 프로미스 체이닝으로 전환. postsSnap 클로징 브래킷 누락도 함께 수정. |
| 2026-09-14 | YONGCHA_MEMO.md | 영업용 번호판 업계 지식 섹션 추가: 아바사자 vs 배넘버 차이, 적재량별 종류, 용차 실무 규칙 (국토부 기준) |
| 2026-09-17 | YONGCHA_MEMO.md | 국토부 유권해석 결과 기록: 제24조 주선사업 해당 없음, 제24조의2 현행법 직접 해당 없음. 법 개정안(의안번호 15469) 모니터링 필요. 담당자: 김승현 044-201-4026. |
| 2026-09-17 | yongcha.html, yongcha-worker.js | 배송구역 지도 미표시 버그 수정: _updateMapZones setTimeout(0) 지연 + _initPostMap 150ms relayout 추가 (kakao SDK 이미 로드된 경우 동기 Map 생성으로 0×0 컨테이너 읽히던 문제 해결) |
| 2026-09-17 | yongcha.html, yongcha-worker.js | 카카오맵 다중 polling interval 방지: _kakaoInitPending 전역 플래그 추가, _updateMapZones 가드 (zone 추가/삭제마다 새 setInterval 생성 → 타임아웃 7번 반복 버그 수정). timeout handler retry 제거(_kakaoKey=null 상태 재시도 무한루프 버그). 근본 해결은 Kakao Developers에서 yongcha.app 도메인 등록 필요. |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **카카오맵 → Leaflet.js + OpenStreetMap 전면 마이그레이션**: Kakao Developers 유료 API 활성화 불가(카드 등록 필요)로 카카오맵 완전 제거. Leaflet.js v1.9.4 (cdnjs, API 키/도메인 등록/과금 없음)로 교체. 지오코딩: /api/geocode (Nominatim 프록시), 역지오코딩: /api/reverse-geocode (Nominatim 프록시), 우편번호→좌표: 기존 /api/yongcha/basidco 재사용. yongcha-worker.js const YONGCHA_HTML 구조 복원(이전 파일 구조 파손 함께 수정). |
| 2026-09-01 | — | 국토교통부 물류산업과 유권해석 질의 접수 완료. 신청번호: 1AA-2609-0025376. 질의내용: 소장-기사 위수탁 연결(화주 개입 없음, 월구독 수익) 구조가 화물자동차운수사업법 제24조의2 화물정보망사업자 등록 대상 및 제24조 주선사업 허가 대상 해당 여부. 답변 예상: 2~3주 내 (2026-09-15~22경). |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **법적 용어 정비 (근무→운행 15곳)**: 용자 UI에서 '근무'(고용관계 시사) 단어 전수 교체 → '운행'. 선호 근무타입→운행형태, 근무 조건→운행 조건, 근무 시간대→운행 시간대, 근무 요일→운행 요일, 월 근무일수→월 운행일수, 실제 근무 내용→실제 운행 내용. |
| 2026-09-18 | scripts/content/variants/yongcha-variants.json | **형식 전면 재작성**: 중첩 구조(`{product, variants:{A:...}}` + `narration` 문자열 배열) → generate-variant.js 호환 플랫 구조(`{A:{lines:[{startSec,text}], slides:[...], voice, speedRate, ...}}`). A: 직접거래 투명성, B: 기사 수입 극대화, C: 소장 기사 직접 거래, D: 기존 주선 방식 비교. 수정 전 형식은 generate-variant.js에서 `variants["A"] === undefined` → process.exit(1) → 나레이션 무음 버그 원인. |
| 2026-09-18 | yongcha.html, yongcha-worker.js | **PWA 홈화면 설치 유도 배너 추가**: `<link rel="manifest">` + `theme-color` 메타 태그 추가. Android Chrome: `beforeinstallprompt` 이벤트 캡처 → 하단 고정 골드/네이비 배너 (설치/닫기 버튼). iOS Safari: 3초 후 하단 힌트 패널 표시 (공유→홈 화면에 추가 순서 안내). 이미 설치 감지(`display-mode:standalone` / `navigator.standalone`)시 배너 숨김. 세션 내 닫기는 sessionStorage에 저장. |
| 2026-09-17 | scripts/content/variants/yongcha-variants.json | 변형 YouTube/Instagram 메타 법적 용어 정비: Variant C '직접 연결'→'직접 거래 정보', '연결 요청'→'지원 요청', '#기사직접연결'→'#기사직접지원'. Variant B '직접 연결하세요'→'직접 지원하세요'. |
| 2026-09-17 | scripts/remotion/YongchaPromo.jsx | Remotion 영상 콘텐츠 법적 용어 정비: YONGCHA_VARIANTS punchline 4변형 업데이트 ('직접 매칭'→'직접 거래', '배차'→'운행'), SUBTITLES_ALL 6라인 교체, SceneMatching 타이틀 '직접 매칭'→'직접 거래'. |
| 2026-09-17 | scripts/content/yongcha-narration.json | 나레이션 단일 스크립트 → 4변형 구조(A: 기사 타겟, B: 수수료 타겟, C: 소장 타겟, D: 충격 타겟)로 전면 재작성. 모든 변형에서 '직접 운행', '직접 지원', '공차 없이 운행' 등 법적 안전 문구 적용. |
| 2026-09-17 | scripts/remotion/render-yongcha.js | WEEK_VARIANT 기반 4변형 자동 선택 + --variant= 수동 지정 옵션 추가. browserExecutable 옵션으로 headless_shell 경로 정확히 지정 (chrome 대신 headless_shell 사용). |
| 2026-09-17 | scripts/content/yongcha-subtitles.srt | 자막 6구간 법적 용어 기반으로 전면 재작성 (60초 대응). |
| 2026-09-17 | assets/promo/yongcha-promo.html | 캡쳐용 HTML 슬라이드 법적 문구 교체: '직접 계약'→'직접 거래 정보 서비스', '직접 연결'→'직접 거래', '직접 매칭'→'직접 거래 정보'. |
| 2026-09-17 | output/ | Remotion 렌더링 완료: yongcha-promo.mp4(17.6MB, 1800프레임, 30fps). FFmpeg 자막 합성 완료: yongcha-final.mp4 + yongcha-reels.mp4(1.8MB, SRT→ASS 변환). |
| 2026-09-17 | yongcha.html / yongcha-worker.js | _showDetailMap v4: 기사 공고 상세 지도를 기초구역 폴리곤+우편번호 라벨 방식으로 교체. 기존 반경 원(circle) 근사값 제거, z.coords 폴리곤(teal) + 라벨 마커 표시. void container.offsetWidth 리플로우 보장. 소장 지도(_doUpdateMapZones)와 동일 UX. |
| 2026-09-17 | yongcha.html / yongcha-worker.js | 법적 리스크 수정: ① 공고 카드 "일 최소보장 30/35만원" 플랫폼 고정값 제거 → 소장이 직접 입력한 경우에만 "소장 제시 최저 N만원/일" 표시. ② 공고 상세 "소장 제시 최소보장" → "소장 직접 제시 조건"으로 변경, 플랫폼 계산 기본값 삭제. ③ 등록 폼 "최소보장금액" → "최저 지급 조건 (소장이 직접 제시하는 거래 조건)" 라벨 변경. ④ AI 예측 "최소보장" → "시세 하단 (참고용)". ⑤ 시세 분석 "최소보장 기준표" → "지역별 시세 참고" + 참고용 면책 문구 추가. 플랫폼이 보장의 당사자가 되는 표현 전면 제거. |
| 2026-09-17 | yongcha.html / yongcha-worker.js | 가입 약관 동의 추가: 이용약관(필수)·개인정보 처리방침(필수)·마케팅 수신(선택) 체크박스 + 내용보기 토글. _yRegister()에 필수 약관 미동의 시 가입 차단 검증 추가. Firestore 저장 필드: agreedTermsAt(서버 타임스탬프), agreedTermsVersion('v1.0-2026-09-17'), agreedMarketing(bool). 이용약관 내용: 서비스 성격(부가통신사업자), 직접 거래 원칙, 플랫폼 책임 한계, 최저 지급 조건 비보장 명시. |
| 2026-09-17 | yongcha.html, yongcha-worker.js | **보안 강화 (security-review 에이전트 HIGH 소견 적용)**: ① 공동현관 비밀번호 DB 기능 전면 삭제 (앱이 배송앱이 아님) — _pgEntranceCodes·_ecLoad·_ecSearch·_ecVote·_ecOpenAdd·_ecSubmit·_ecItems 제거, 라우트·퀵버튼 제거. ② _toggleSuspend·_togglePremium·_forceClosePost·_yCleanTestAccounts·_yCleanPlaywrightPosts·_yCleanDupPosts — admin 타입 가드 추가. ③ _judgeApply — async .get() 소유권 확인 후 update 실행 (agencyId 불일치 시 거부). ④ _judgeJobApply — role check + async .get() 소유권 확인, 누락된 });  클로저 수정. ⑤ _togglePost·_toggleJobStatus — agency/admin 가드 추가. ⑥ _sendScout — agency 타입 가드 추가. ⑦ _applyJob — driver 타입 가드 추가. ⑧ Stored XSS: _loadResumes(driverRegion, vehicleType), _loadJobsDriver(jobType, courier, vehicleType, workDays), _showJobDetail(region, area, courier, jobType, vehicleType, workDays, workHours, settleDay) 전부 _esc() 적용. ⑨ e.message innerHTML 삽입 6곳 _esc() 래핑. |
| 2026-09-17 | yongcha.html, yongcha-worker.js | 계약서 미리보기 수정: _showContract 모달에 "전체 계약서 보기" 버튼 추가 (_openContractDoc). Firestore yongcha_contracts에서 계약 데이터 조회 후 법적 문구 포함 HTML 생성 → window.open으로 신규 탭 표시 (DOCX/mammoth.js 의존성 없음). |
| 2026-09-18 | yongcha.html, yongcha-worker.js | **소스코드 보호 + 상생 메시지 + 고정지입채용 탭 + 자동차등록증 첨부 + 관리자 자격증 승인**: ① 소스코드 보호 스크립트(`</head>` 앞): 우클릭·F12·Ctrl+Shift+I·Ctrl+U 차단, DevTools 감지 시 페이지 교체+리로드. ② 소장 홈 상생 배너: "🤝 단건 용차로 만난 기사를 소속 기사로 채용" + 고정 채용 공고 올리기 버튼. ③ 공고/이력서 탭 3개로 확장: 내 공고 / 고정 지입 채용(yongcha_jobs jobType:'고정지입') / 이력서 찾기. `_loadFixedJobs`, `_showFixedJobWriteModal`, `_saveFixedJob` 신규 함수. ④ 자동차등록증 첨부: 기사 프로필 카드 추가, 사진 업로드 Firebase Storage(`yongcha_vehicle_reg/`), `_yUploadVehicleReg` 함수, vehicleRegUrl/vehicleRegVerified 필드. ⑤ 관리자 패널: 자동차등록증 이미지 확인 링크 + `_toggleVehicleRegVerify` 승인/취소. ⑥ `_openChatRoom` null 가드(_CU·otherUid 없을 때 _yToast 처리). |
| 2026-09-18 | yongcha.html, yongcha-worker.js | **경쟁사 분석 기반 기사 기능 4종 업그레이드** (yongchacall.app·baroil.io 벤치마킹): ① **소득장부 수기 입력** (`_ledgerManualModal·_ledgerSaveManual`): yongcha_income_manual 컬렉션에 외부 운송 건(날짜/구역/택배사/건수/단가) 직접 추가. ② **소득장부 CSV 내보내기** (`_ledgerExportCSV`): 수기+자동 전체 내역 BOM UTF-8 Excel 호환 CSV 다운로드. ③ **칭찬 키워드 집계 표시**: 받은 후기의 criteria 배열 값 빈도순 집계 → 프로필 상단 배지 노출 (상위 8개, ×N 카운트). ④ **화물운송자격증 인증 뱃지** (`_ySaveLicenseNum`): 기사가 자격증 번호 등록 → admin이 licenseVerified:true 승인 → ✓ 뱃지 표시. yongcha_users 신규 필드: licenseNum(string), licenseVerified(boolean). |
