# DONWAY 개발 인수인계서
> 작성일: 2026-05-31 | 작성자: Claude (AI 개발 파트너)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | DONWAY (돈웨이) |
| URL | donway.ai.kr |
| 슬로건 | AUTOMATE EVERYTHING |
| 형태 | B2B SaaS — 물류·배달·소상공인 정산/급여/근태 플랫폼 |
| 대표 | 김형우 (soungkyekim@naver.com) |
| 특허 | 가출원 완료 (특허고객번호 1-2026-039396-4) |

---

## 2. 기술 스택

| 구분 | 내용 |
|------|------|
| 프론트엔드 | 단일 HTML 파일 (settle.html) — 프레임워크 없음 |
| 백엔드 | Cloudflare Workers (_worker.js) |
| 데이터베이스 | Firebase Firestore (mbti-logistics, asia-southeast3) |
| 스토리지 | Firebase Storage (REST API 직접 호출) |
| 인증 | Firebase Auth |
| AI/OCR | Anthropic Claude Haiku (claude-haiku-4-5-20251001) |
| 배포 | GitHub Actions → Cloudflare Workers |
| 도메인 | donway.ai.kr (Cloudflare) |

---

## 3. 레포지토리 구조

```
kimdh4790-cpu/mbti-logistics
├── settle.html              ← DONWAY 메인 앱 (전체 기능)
├── donway_landing.html      ← 서비스 랜딩페이지
├── donway_brochure.html     ← 팜플렛 (A4 가로 5페이지)
├── _worker.js               ← Cloudflare Worker (라우팅/주입)
├── index.html               ← 회사소개 페이지
├── firestore.rules          ← Firestore 보안 규칙
├── firebase-messaging-sw.js ← FCM 서비스워커
├── sw.js                    ← 메인 서비스워커
├── manifest.json            ← PWA 설정
└── .github/workflows/
    └── deploy.yml           ← 자동 배포 설정
```

---

## 4. 핵심 계정 정보

| 항목 | 내용 |
|------|------|
| GitHub | kimdh4790-cpu / ghp_*****(GitHub Secrets에서 관리) |
| Firebase 프로젝트 | mbti-logistics (Blaze) |
| 슈퍼어드민 1 | kimdh4790@gmail.com |
| 슈퍼어드민 2 | soungkyekim@naver.com |
| Cloudflare Worker | mbti-logistics.kimdh4790.workers.dev |
| Anthropic API | ANTHROPIC_API_KEY (Cloudflare Worker Secrets에 저장) |

---

## 5. 배포 방법

### 자동 배포 (권장)
```bash
# GitHub에 push하면 자동으로 Cloudflare에 배포됨
git add .
git commit -m "커밋 메시지"
git push origin main
```
→ GitHub Actions가 Wrangler v4로 자동 배포 (약 20~30초)

### 배포 확인
- GitHub → Actions 탭에서 성공 여부 확인
- donway.ai.kr/settle 접속해서 동작 확인

---

## 6. 주요 기능 목록

### 6-1. 정산 자동화 (핵심)
- 쿠팡 엑셀 업로드 → 기사별 정산 자동 계산
- 라우트별 단가 적용 (RPRICE)
- 프레시백 회수금액 / 인센티브 자동 계산
- VAT 세금계산서 자동 생성

### 6-2. 아이디 지원 기능 (2026-05-31 완성)
- 타인 아이디로 운행한 건수 날짜별 추적 (dateRoutes)
- 지원받은 기사: 기타(+) 자동 가산
- 지원해준 기사: 기타(-) 차감 + 라우트 건수 차감
- 등록: 라우트단가표 → 👥 아이디 지원 관리

### 6-3. 정산 보장금액
- 기사 수정 화면 → 🟡 보장 | 세금계산서 정산 보장금액 입력
- 엑셀 업로드 시 부족분 기타(+)에 자동 채움
- fbDrivers 기반 동기 처리

### 6-4. 세무사 연동
- 세무사 영수증 업로드 → Firebase Storage REST API 직접 업로드
- OCR 자동 인식 (금액/거래처/카테고리)
- 90일 공유 링크 생성 → 세무사에게 전달

### 6-5. Plan Guard (악용 방지)
- 인원 초과 감지 / 월별 누적 카운팅
- 이상 패턴 탐지 → 관리자 알림
- 슈퍼어드민 제외

### 6-6. 기타
- QR 근태 관리
- 배달대행 정산
- 급여 관리 / 달력 메모
- 직원 가입 / 회사 등록 (OCR 사업자등록증 자동인식)

---

## 7. Firestore 컬렉션 구조

| 컬렉션 | 용도 |
|--------|------|
| settlements | 정산 데이터 |
| drivers | 기사 정보 (settleGuarantee 포함) |
| companies | 회사 정보 |
| users | 사용자 계정 |
| idSupport | 아이디 지원 규칙 |
| tax_docs | 세무사 영수증 |
| taxShares | 세무사 공유 링크 |
| subscriptions | 구독 정보 |
| security_logs | Plan Guard 로그 |
| cal_memos | 달력 메모 |

---

## 8. 요금제

| 그룹 | 포함 기능 | 단가 |
|------|-----------|------|
| 그룹1 (유력·콤보) | AI정산+세무사연동+아이디지원 등 | 22,000원/인 (→35,000원 검토중) |
| 그룹2 (QR단독·급여단독) | QR근태 또는 급여관리 | 12,000원/인 |
| 계좌이체 할인 | - | 3% 할인 |
| 무료체험 | 카드등록 불필요 | 7일 |

---

## 9. 알려진 이슈 / PENDING

- [ ] 토스 결제 심사 완료 후 live 키 교체
- [ ] mbetco.kr 도메인 Cloudflare 등록
- [ ] F12/우클릭 차단 재활성화 (현재 디버그용 비활성화 상태)
- [ ] 기사 FCM 알림 허용 안내 추가
- [ ] 요금 35,000원으로 인상 적용
- [ ] 특허 가출원 아이디지원 기능 추가 보정

---

## 10. 새 채팅에서 이어받는 방법

```
"이전 세션 읽어와"
```

→ Claude가 트랜스크립트 읽고 맥락 파악 후 바로 이어서 작업

---

## 11. 주요 버그 해결 이력 (2026-05-31)

| 버그 | 원인 | 해결 |
|------|------|------|
| dateRoutes 빈 배열 | entry 생성 시 누락 | entry에 dateRoutes 추가 |
| 날짜 하루 차이 | XLSX.js 23:59:08 버그 | 23:58 이상이면 +2분 보정 |
| 전체 건수 0 | tDFull push 누락 | _fd.push에 tDFull 포함 |
| Cloudflare 캐시 | Worker 캐시 | fetchAsset에 ?t=Date.now() |
| Storage 오류 | firebase-storage SDK 없음 | REST API 직접 호출 |
| 로그인 탭 안됨 | switchTab 전역 미노출 | IIFE 인라인 onclick |

---

*이 문서는 Claude가 자동 생성했습니다. donway.ai.kr*

## 배달대행 초과분 정산 (2026-11-06 추가)
- 적용 파일: donway-pages/index.html (KV settle.html = 배달대행 정산 화면). root settle.html은 AI정산(택배) 화면이므로 건드리지 않음.
- `_calcExcessDriverPay(weekCount, cfg)` 추가. `cfg.tierMode === "excess"`일 때만 사용. 미지정 시 기존 전 건 방식 유지.
- 기본 구간: 1~200건 2,500원 / 201~250건 3,600원 / 251~300건 4,000원 / 301건↑ 4,300원 (`cfg.excessBase`, `cfg.excessTiers`로 변경 가능)
- 시스템 이용료 건당 200원은 쿠팡 자동 적용이라 이 계산에서 차감하지 않음.
- 테스트: `tests/donway-delivery-tier.test.js` (node --test, 6/6 통과)
- 주의: root settle.html(AI정산) 원본에 한글이 '?'로 깨진 문법 오류가 있음 — 이번 작업과 무관, 별도 확인 필요.
- 미커밋/미푸시 상태.

## 기사현황 입력 → 기사별 공유 이미지 (2026-11-16 추가)
- 적용 파일: donway-pages/index.html (`pageDeliveryDriverAdmin`), _worker.js (`/api/delivery-driver-stats`)
- 입력 추가: 일일 현황(완료·진행중·취소/거절), 슬롯별 목표(아침점심 9-13 / 오후논 13-17 / 저녁 17-20 / 심야논 20-24), 시간 외 배달 완료(기존 peaks.etc 사용). 수락률은 기존 SLA 칸 사용.
- Firestore dw_driver_stats 필드 추가: tgAm/tgPm/tgEve/tgNgt, dayDone/dayProg/dayRej
- "기사 공유 이미지 만들기" 버튼 → canvas PNG(1080px) → 공유하기(navigator.share, 카톡 등) / 이미지 저장
- 슬롯 상태는 이미지 만드는 시각 기준: 목표 달성=달성, 해당 시간대=진행중(진행바·잔여), 지난 시간대 미달=미달성, 이전=예정
- 2026-11-16 v2: 공유 이미지 앱 스타일로 개편(수락률 링, 슬롯마다 달성률%·진행바·잔여/초과 건수, 헤더 슬롯 달성 n/m 배지). _daDrawStatusCard만 변경.

## 배달대행 정산에 쿠팡이츠 정산법 흡수 (2026-11-16 추가)
- 출처: 사용자 아티팩트 "배달 정산 계산기" (쿠팡이츠 Excel → 단가 적용 → 세금 계산)
- 적용 위치: donway-pages/index.html `_dwDeliveryRender`(배달대행 정산 화면) + 세금정산 보기/상세/엑셀. AI정산(calcNet, root settle.html)은 건드리지 않음.
- 계산: 기사 세전 = 쿠팡이츠 주차(일~토)별 건수에 누진 단가 (기본 1~199 2,400 / 200~249 3,600 / 250~299 4,000 / 300+ 4,300). 회사 마진 = 쿠팡 정산금액 − 기사 세전. 공제 = 원천세(3.3%/없음/직접) + 고용 0.8% + 산재 0.88% (2026 노무제공자 퀵서비스 기사 부담분: 고용 1.6% 노사 반반, 산재 17‰+출퇴근 0.6‰의 절반. 2026 요율은 2025 수준 유지 — 고용노동부 2025-12-31 보도. 설정 변경 가능)
- 설정: "정산 방식·단가" 버튼 → companies/{dealerId}.dwEatsCfg 저장. mode='raw'면 기존 방식(쿠팡 금액 그대로, 3.3/0.88/0.8)
- 주 단위: 기본 수~화 (실제 쿠팡이츠 엑셀 2026_06-4 = 6/17 수 ~ 6/23 화로 확인). 시작 요일은 설정(dwEatsCfg.weekStart 0~6)에서 변경. 한 주를 통째로 계산하고 마지막 날이 속한 달에 귀속 (앞·뒤 달 delivery_sessions 문서를 함께 읽음)
- 부가세: 대리점은 사업자(쿠팡에서 부가세 포함 수령), 기사는 미사업자(3.3%). 회사마진 = 쿠팡 금액 ÷1.1(공급가) − 기사 세전 (dwEatsCfg.vatIncl, 기본 true). 보험은 사용자 확인으로 세전 전액 기준 유지(쿠팡식 80.2% 보수액 아님)
- 참고: 일자별 시트 '총 정산금액'(현재 파서가 읽는 열)은 부가세 포함. 부가세 제외 금액은 같은 시트 마지막 '정산금액' 열. 쿠팡 엑셀의 보험료는 과세항목×80.2%(경비공제 19.8%) 보수액에 고용 0.8%/산재 0.88%, 10원 단위
- 미반영: 보험료는 세전 전액 기준. 법상 보수액은 직종별 경비공제 후 금액이라 실제 고지액과 차이 가능
- 테스트: tests/donway-eats-settle.test.js

## 배달대행 정산 엑셀 건수 열 오인식 수정 (2026-11-16)
- 증상: 쿠팡이츠 '일자별 정산내역' 업로드 시 총 1,828건이 495건으로, 날짜별로 0건이 많이 표시됨
- 원인: `_dwDeliveryFileLoad` 헤더 감지가 '오더수' 열을 만날 때마다 덮어써서, 마지막 '기타 프로모션4 오더수' 열을 건수로 읽음 (금액 열은 정상)
- 수정: 각 항목은 처음 나온 열만 사용, '총…오더수' 우선. 실제 엑셀(청주흥덕 2026_06-4)로 10명 1,828건 확인
- 기존 저장 데이터: 같은 날짜는 재업로드 시 엑셀 값으로 덮어씀(거절·취소 수동값은 유지)

## 배달대행 정산을 계산기와 같은 결과로 (2026-11-16)
- 쿠팡 금액: 업로드 시 '종합' 시트의 기사별 '라이더별 실지급액'(부가세 제외, 쿠팡 공제 후)을 그 주(weekKey)에 `weekPay`로 저장 → 회사마진 = 실지급액 − 기사 세전 (배달 정산 계산기와 동일). 종합 시트가 없으면 일자별 금액 ÷1.1
- 저장 위치: 날짜를 주 마지막 날의 달 문서(delivery_sessions/{did}_coupang_{YYYY-MM})에 저장하고 화면을 그 달로 이동. 보고 있던 달 문서에 같은 날짜가 잘못 들어가 있으면 삭제(교체)
- 원인이었던 증상: 6월 엑셀을 11월 화면에서 저장 → 11월 문서에 6월 날짜가 들어가 주 귀속(6월) 필터에 걸려 합계 0
- 실제 엑셀(청주흥덕 2026_06-4) 검증: 1,828건, 기사 세전 5,165,200, 쿠팡 실지급 7,097,881, 회사마진 1,932,681 — 계산기와 일치. 실지급액만 보험 요율 차이(계산기 0.9/1.6, 화면 기본 0.8/0.88)
- 요율 표시 소수 둘째 자리까지 (0.88%)

## 배달대행 정산 기사 카드 상세내역 (2026-11-16)
- 카드의 "상세내역 보기"를 탭하면 펼침: 주차별 달성률(최고 구간 기준)·진행바·구간별 금액, 세전 합계·소득세·지방소득세·고용·산재·실수령액, 회사 마진 분석(쿠팡 지급 구성 = 종합 시트 기사 행 전 항목) → 쿠팡 총지급 − 기사 세전 = 회사 마진
- 업로드 시 종합 시트 기사 행을 weekDetail[주시작일] = [{k,v,n}] 로 저장 (Firestore 중첩 배열 불가라 객체 배열). 예전 업로드 데이터는 재업로드해야 쿠팡 지급 구성이 보임

## 배달대행 정산에 배민 정산 추가 (2026-11-18)
- 화면 상단 '쿠팡이츠 / 배달의민족' 토글 (localStorage dw_platform). 업로드 파일로 자동 구분: 헤더에 '배달처리비'+'라이더명'이 있으면 배민
- 배민 엑셀: 배달처리비_<협력사>_<시작>_<끝>.xlsx, 시트 '배달 내역 상세', 1행=1건. 운행일(YYYYMMDD)·배달상태·라이더명·User ID·배달처리비 사용. 배달취소는 기본 제외(취소 건수로만 기록, 설정 inclCancel로 포함 가능). 동명이인은 '이름(User ID)'
- 계산(대표 통화 2026-11-18): 주간(수~화) 건수가 도달한 구간 단가를 1건부터 전체 적용 (tierMode='flat'). 기본 1~199 3,200 / 200~299 4,000 / 300~399 4,500 / 400+ 5,000. 예) 326건 → 326×4,500. 쿠팡은 tierMode='progressive'(초과분만) 그대로
- 회사 마진 = 배달처리비 합 − 기사 세전. 배달처리비는 부가세 별도로 보고 그대로 사용(vatIncl 기본 false, 설정 변경 가능). 공제는 쿠팡과 같음(원천세 3.3%, 고용 0.8%, 산재 0.88%)
- 저장: 설정 companies/{did}.dwBaeminCfg, 데이터 delivery_sessions/{did}_baemin_{YYYY-MM} (쿠팡 문서와 분리)
- 실제 엑셀(충북청주서원A 2026-11-11~17) 검증: 12명 2,302건, 기사 세전 9,176,000, 배달처리비 8,199,000 → 회사마진 −977,000. 이 파일만으로는 고건수 기사 마진이 마이너스
- 테스트: tests/donway-baemin-settle.test.js
