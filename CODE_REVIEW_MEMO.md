# 코드 리뷰 메모
> 2026-09-04 전체 코드베이스 보안·품질·아키텍처 스캔 결과.
> 수정 완료 시 해당 항목 ✅ 표기 후 날짜 기입.

---

## 1. 보안 취약점

### [중] verifyFirebaseToken `env` 인수 누락
- **파일**: `_worker.js:9576` (`/api/deploy-rules` 핸들러)
- **내용**: `verifyFirebaseToken(request)` 호출 시 `env` 인수 빠짐. 내부적으로 `_env_ref` 전역 폴백 사용하지만 초기화 타이밍에 따라 `apiKey=''` → 인증 거부 가능.
- **수정**: `verifyFirebaseToken(request, env)` 로 변경
- 상태: 미수정

### [중] CI 로그 토큰 노출 위험
- **파일**: `scripts/upload/get-youtube-token.js:47-52`, `scripts/setup/get-instagram-token.js:105`
- **내용**: `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_CLIENT_SECRET`, `INSTAGRAM_ACCESS_TOKEN`을 `console.log`로 출력. GitHub Actions 로그에 토큰 값이 그대로 기록될 수 있음.
- **수정**: 출력 후 `***` 마스킹 처리 또는 `process.stderr`로 리다이렉트
- 상태: 미수정

### [낮음] Firebase Web API Key 하드코딩
- **파일**: 20개+ 파일 (`filo-auth.js:125`, `dine.js:46,167`, `_worker.js` 8곳, `mbtico-pages/_worker.js` 4곳, `yongcha-worker.js:9465` 등)
- **내용**: `AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0`가 다수 파일에 직접 박혀있음. Firebase Web API Key는 클라이언트 공개 설계라 즉각 위협은 아님. 단, **Firestore Security Rules가 실제 방어선**이므로 Rules가 느슨하면 이 키로 직접 데이터 접근 가능.
- **필수 확인**: Firebase 콘솔 → Firestore → Rules 검토 (authenticated user만 읽기/쓰기 허용인지 확인)
- 상태: Rules 검토 필요

### [낮음] CORS `*` 광역 허용
- **파일**: `donway-pages/_worker.js:12,27,36`, `functions/claude-ocr.js:16,21,28`, `functions/label-ocr.js:15,20,28`
- **내용**: `Access-Control-Allow-Origin: *`. `credentials: true`와 동시 사용은 없어 CSRF 직접 위험은 낮음. 그러나 donway API가 무단 호출에 노출됨.
- **수정**: DONWAY 프론트 도메인(`donway.ai.kr`)으로 제한 권장
- 상태: 미수정

---

## 2. 코드 품질 문제

### [중] Firestore 쓰기 catch 누락 (fire-and-forget 위험)
- **파일**: `filo-auth.js:1767` (가맹점 update), `filo-auth.js:1829-1831` (가맹점 공지 batch.set)
- `filo-auth.js` 전체 `.then()` 46건 중 `.catch()` 없는 패턴 다수
- `dine.js:113` — `_dineSendNotif` await Promise.all에 catch 없음
- **위험**: 쓰기 실패 시 사용자에게 에러 없이 조용히 실패
- 상태: 미수정

### [중] 중복 함수 — 통합 필요
| 중복 위치 | 내용 |
|---|---|
| `_worker.js:154` vs `_worker.js:21840` | `verifyFirebaseToken` vs `verifyYongchaToken` — JWT 검증 로직 거의 동일 |
| `_worker.js:445` vs `_worker.js:10880` | `sendFCMPush` vs `sendFCM` — FCM POST 요청 동일 로직 중복 |

- **수정 방향**: 공통 헬퍼 함수 1개로 통합 (파라미터로 서비스 계정 구분)
- 상태: 미수정

### [중] N+1 쿼리
- **`filo-auth.js:~1506`** (`_filoInitDemo`): `next(i+1)` 직렬 재귀로 데모 메뉴 배열 하나씩 Firestore 쓰기. → `Promise.all` 병렬화 필요
- **`filo-auth.js:~1580`** (`_filoPageBranchMonitor`): 가맹점 수만큼 `filo_orders.where('dealerId','==',b.id)` N회 쿼리. → collectionGroup 쿼리 또는 서버사이드 집계로 대체 권장
- 상태: 미수정

### [낮음] 전역변수 오염·충돌 위험
| 위치 | 내용 |
|---|---|
| `_worker.js:5533,6397,6398,6662,6894,13665` | `var _db`, `var _auth` 6곳 중복 선언 |
| `filo-pos.js:23,77,248` | `window._posDiscount`, `window._posTotal` — filo-pos-pay.js와 충돌 가능 |
| `filo-auth.js:1379,1380` | `window._filoJoinDid`, `window._filoJoinCo` 전역 임시 상태 — 다중 탭 덮어쓰기 위험 |

- 상태: 미수정

### [낮음] Dead Code
- `filo-auth.js:1671` — `window._filoHqDeploy` onclick 문자열 의존. 리팩토링 시 깨지기 쉬움
- `filo-menu.js:560` — `_filoSeedDefaultMenusManual()` 선언됐지만 외부 호출 없음 (콘솔 수동 전용으로 보임 — 주석 추가 권장)
- `filo-pos.js:17,248` — `_posTotal` 로컬 변수와 `window._posTotal` 혼재, 동기화 보장 없음
- 상태: 낮은 우선순위, 추후 정리

### [낮음] `filo-auth.js:_loadCompany` Firestore 3중 get
- 로그인 흐름에서 `companies.doc` get을 최대 3번 순차 호출(dealer 확인 → members 없으면 재시도 → dealerId로 재조회)
- 단일 쿼리 + 로컬 분기로 축소 가능 → 로그인 속도 개선 효과
- 상태: 미수정

---

## 3. 앱 연결구조 (아키텍처 맵)

### 라우팅 흐름
```
요청 → Cloudflare Edge → _worker.js
  hostname 분기 (if 블록 순서)
  ├─ yongcha.app    L921   → yongcha-worker.js (별도 wrangler 배포)
  ├─ donway.ai.kr   L983   → KV(DONWAY_ASSETS) 서빙
  ├─ dine.ne.kr     L2166  → KV 서빙
  ├─ filo.ai.kr     L2414  → KV 서빙
  └─ mbtico.kr      L7039  → mbtico-pages/_worker.js (별도 wrangler 배포)
```

### 라우트 접근 권한 구분
| 등급 | 대표 라우트 | 인증 방식 |
|---|---|---|
| PUBLIC | `/order`, `/store`, `/kitchen`, `/qr/*`, `/api/menus`, `/api/booking` | 없음 (고객 접점) |
| AUTH | `/api/ai-*` (10개), POS·직원·결제 관련 전체 | `verifyFirebaseToken(request, env)` |
| SUPERADMIN | `/api/errors`, `/admin/cleanup-dup-orders`, `/sync-kv` | UID 비교 (kimdh4790 / soungkyekim) |
| CRON | 알림톡 큐 처리, 구독 만료 체크, KV 동기화 | Cloudflare Cron Trigger (인증 불필요) |

### FILO ↔ DINE 공유 Firestore 컬렉션
| 컬렉션 | 용도 |
|---|---|
| `members` | 직원 정보 (양쪽 읽기/쓰기) |
| `attendance` | 출퇴근 기록 |
| `filo_bookings` | 예약 |
| `filo_customers` | 회원·포인트 |
| `filo_sales` | 매출 |

### KV(`DONWAY_ASSETS`) 사용 목적
| 키 패턴 | 내용 |
|---|---|
| `*.html`, `*.js` | 정적 파일 서빙 |
| `tr:{lang}:{slug}` | 메뉴 번역 캐시 (7일 TTL) |
| `slug:*` | 매장 slug → dealerId 매핑 |
| `rl:*` | Rate Limit 카운터 |

### 외부 API 연동 목록
| 카테고리 | 서비스 | 용도 |
|---|---|---|
| AI | Anthropic claude-haiku-4-5 | 메뉴 번역, AI 채팅, 분류 |
| SMS/알림 | Aligo SMS + 알림톡(카카오) | 정산명세·급여·재고 알림 |
| 푸시 | FCM (Firebase Cloud Messaging) | 주문·픽업·영수증 알림 |
| 이메일 | Resend | 가입 확인·공지 |
| 결제 | Toss Payments | 구독 결제 (계좌이체 안내용) |
| 전자계약 | Modusign | 용차앱 계약서 |
| 세금계산서 | 팝빌 | 용차앱·DONWAY 자동 발행 |
| 이미지 | Pexels → Pollinations AI | 메뉴 이미지 자동 생성 |
| 지도 | Kakao Maps | 용차앱 홈 지도 |
| 스토리지 | Firebase Storage | 이미지 업로드 |

---

## 4. 수정 우선순위

| 순위 | 항목 | 예상 공수 |
|---|---|---|
| 1 | `_worker.js:9576` verifyFirebaseToken env 인수 추가 | 5분 |
| 2 | `filo-auth.js:1767,1829` Firestore 쓰기 catch 추가 | 30분 |
| 3 | CI 토큰 로그 마스킹 (get-youtube-token.js, get-instagram-token.js) | 20분 |
| 4 | Firestore Security Rules 검토 (콘솔에서 직접) | 별도 작업 |
| 5 | `_filoInitDemo` N+1 직렬 → Promise.all | 30분 |
| 6 | `verifyFirebaseToken`/`sendFCM` 중복 함수 통합 | 1시간 |
| 7 | CORS `*` → donway.ai.kr로 제한 | 20분 |

---

## 수정 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-04 | 최초 생성 — 3개 에이전트 병렬 스캔 결과 종합 (보안/품질/아키텍처) |
