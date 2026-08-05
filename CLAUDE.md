

## ⚠️ 절대 수정 금지 항목

### wrangler.toml
- `wrangler.toml` 파일은 절대 수정하지 말 것
- 특히 `[vars]` 섹션 추가/수정 금지
- Cloudflare Secrets(환경변수)는 대시보드에서만 관리
- `wrangler deploy` 시 `[vars]` 변경으로 기존 Secrets가 삭제될 수 있음

### Cloudflare 환경변수 (Secrets)
다음 변수들은 Cloudflare 대시보드에 등록된 Secrets임. 코드에서 참조만 할 것:
- FIREBASE_SA_KEY, FIREBASE_API_KEY, FIREBASE_WEB_API_KEY
- ANTHROPIC_API_KEY, CLAUDE_API_KEY
- KAKAO_REST_KEY, KAKAO_JS_KEY
- SOLAPI_KEY, SOLAPI_SECRET
- RESEND_API_KEY, TOSS_SECRET_KEY
- MODUSIGN_API_KEY, BIZ_API_KEY
- GOOGLE_TRANSLATE_KEY, CRON_SECRET, SYNC_KV_SECRET

## UI 원칙
- 모든 목록/리스트는 5개씩 표시. 더보기 버튼 또는 페이지네이션
- 한꺼번에 길게 스크롤되는 UI 절대 금지
- 초딩 디자인 금지 — 대기업급 럭셔리 디자인
- 이모지 UI 전면 금지 → Lucide SVG 아이콘
- Pretendard 폰트 기본
- 카드 간격/여백/색상 대비 균일하게
- 모바일 우선 반응형

## 배포 원칙
- 파일 하나 수정 완료할 때마다 즉시: git commit + git push origin main + KV 배포
- 전체 완료 기다리지 말고 파일 하나 끝나면 바로 배포
- git remote: https://kimdh4790-cpu:${GITHUB_TOKEN}@github.com/kimdh4790-cpu/mbti-logistics.git
- wrangler.toml 절대 수정 금지
- filo-common.js 절대 수정 금지
- 새 파일 생성 시 deploy.yml KV 목록 반드시 추가
- 세션 하나 = 파일 하나 원칙
- Playwright 실사 테스트 후 통과/실패 표 보고

## yongcha.app 배포 원칙
- yongcha.app은 KV가 아닌 _worker.js 안의 handleYongcha 함수로 서빙됨
- yongcha.html KV 업로드 금지 (반영 안 됨)
- yongcha-worker.js 수정 시 반드시 _worker.js handleYongcha에도 동기화
- 배포 명령: git pull origin main && npx wrangler deploy
- KV put yongcha.html 명령어는 효과 없음 — 절대 사용 금지

## 셸 실행 원칙
- 백그라운드 셸(&, parallel, 동시실행) 절대 금지
- 모든 명령어 순차 실행만 (하나 완료 후 다음)
- git stash pop 후 git push 시 충돌나면 git stash drop 후 재시도
- git push 실패 시 git pull --rebase 후 재시도

## Git 브랜치 원칙
- 브랜치는 main 하나만 사용
- master 브랜치 금지 (삭제 완료)
- push 전 항상: git pull origin main --rebase
- push 실패 시: git pull origin main --rebase 후 재시도
- git stash 사용 금지 — 충돌 원인

## 작업 순서 원칙
- 모든 파일 작업 전 반드시: 현재 기능 전체 파악 → 버그/미완성 확인 → 고도화 진행
- 기존 기능 절대 삭제/변경 금지 (추가만 허용)
- Playwright 실사 테스트로 기존 기능 정상 작동 확인 후 고도화

## 프레시백 회수금액 원칙 (DONWAY 핵심)
- 아이디지원 시 fid(지원받는기사)의 dateFresh에서 날짜별 프레시백 회수금액 → tid(대신배송기사)에게 이전
- dateFresh 키 날짜 포맷 반드시 정규화 (YYYY-MM-DD)
- dateFresh 없으면 freshAmt 전체를 fallback으로 이전
- 날짜 불일치로 누락되는 인원 없게 할 것
- 절대 수정 금지 — 급여 계산 핵심 로직
