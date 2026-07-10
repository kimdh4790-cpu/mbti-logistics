# 엠비티아이 플랫폼 리팩토링 현황
## 2026-07-10 완료

## 파일 구조

### FILO (filo.ai.kr)
| 파일 | 크기 | 역할 |
|------|------|------|
| filo.html | 50KB | HTML 뼈대+CSS (원본 386KB) |
| filo-common.js | 138KB | Firebase/인증/네비/공통 (85함수) |
| filo-pos.js | 34KB | POS결제/영수증/분할/각자계산 (16함수) |
| filo-table.js | 43KB | 테이블QR/예약/착석/직원호출 (11함수) |
| filo-menu.js | 41KB | 메뉴/레시피/원가 (18함수) |
| filo-order.js | 29KB | 주문대기/배달 (13함수) |
| filo-inventory.js | 15KB | 재고/입출고/자동발주 (6함수) |
| filo-staff.js | 18KB | 직원QR/출퇴근/급여/근무표 (9함수) |
| filo-report.js | 20KB | 매출분석/차트 (10함수) |
| store.html | 16KB | 배달주문 HTML (원본 30KB) |
| store.js | 15KB | 배달주문 JS |
| order.html | 20KB | 테이블QR 주문 HTML (원본 32KB) |
| order.js | 15KB | 테이블QR 주문 JS |
| filo-landing.html | 42KB | FILO 랜딩 HTML (원본 78KB) |
| filo-landing.js | 36KB | FILO 랜딩 JS |

### DINE (dine.ne.kr)
| 파일 | 크기 | 역할 |
|------|------|------|
| dine.html | 32KB | DINE 앱 HTML (원본 222KB) |
| dine.js | 191KB | DINE 앱 JS (96함수) |

### DONWAY (donway.ai.kr)
| 파일 | 크기 | 역할 |
|------|------|------|
| donway_landing.html | 65KB | DONWAY 랜딩 HTML (원본 96KB) |
| donway_landing.js | 31KB | DONWAY 랜딩 JS |
| settle.html | 2.6MB | DONWAY 정산앱 ⚠️ 현상유지 (수정금지) |

### Worker
| 파일 | 크기 | 역할 |
|------|------|------|
| _worker.js | 376KB | Cloudflare Worker (원본 530KB) |

## 배포 방식
- GitHub push → GitHub Actions 자동배포 (KV + Worker)
- wrangler deploy는 _worker.js 변경시만 수동 실행

## KV 라우팅 (공통)
filo-*.js, dine.js, store.js, order.js, donway_landing.js, filo-landing.js
→ Worker에서 JS 파일 요청 최우선 처리

## ⚠️ 다음 세션 작업 목록
1. 고도화: 메뉴 이미지 화질 개선 (티오더 능가 UI)
2. 토스페이먼츠 결제 연동 (7/24 만료)
3. 알림 시스템 (알림톡)
4. 바로고 API 배달 연동
5. GitHub Actions Worker 자동배포 수정 (현재 수동)
