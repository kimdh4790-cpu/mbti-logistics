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
| `yongcha.html` | 소스 오브 트루스 (전체 앱 UI+JS) | 수정 후 _worker.js 동기화 필수 |
| `_worker.js` | 실제 배포 파일 — `YONGCHA_HTML_YONGCHA` 상수에 yongcha.html 임베드 | push → auto-deploy |
| `yongcha-worker.js` | yongcha.app 전용 API worker (별도 wrangler) | `npx wrangler deploy`만 가능 (KV 무효) |
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

---

## 기초구역 경계 API

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `GET /api/yongcha/basidco?zip=XXXXX` |
| 응답 | `{ok:true, coords:[{lat,lng},...], lat, lng, source}` |
| 1순위 | business.juso.go.kr WFS (apikey: `3B63BE88F1A06653075E0C88883B157E`) |
| 2순위 | vWorld WFS (key: `DCCA6DA8-58C2-3561-B5AC-FC7DC19BCA6A` / env.VWORLD_API_KEY) |
| 3순위 | KV `basidco:{zip}` 캐시 |
| 클라이언트 | `_doUpdateMapZones()` → fetch 후 `kakao.maps.Polygon` 그리기 |

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
- `_loadKakaoMap(cb)` — 카카오맵 SDK 동적 로드
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

## 변경 이력

| 날짜 | 파일 | 내용 |
|------|------|------|
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
| 2026-09-01 | — | 국토교통부 물류산업과 유권해석 질의 접수 완료. 신청번호: 1AA-2609-0025376. 질의내용: 소장-기사 위수탁 연결(화주 개입 없음, 월구독 수익) 구조가 화물자동차운수사업법 제24조의2 화물정보망사업자 등록 대상 및 제24조 주선사업 허가 대상 해당 여부. 답변 예상: 2~3주 내 (2026-09-15~22경). |
