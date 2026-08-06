# MBTICO Handover (2026-08-05)

## KEY INFO
- GitHub: kimdh4790-cpu/mbti-logistics (main)
- CF Account: 02709cbec18d848913b4246015b9148f
- KV NS_ID: 7f0e90efaea64f3ab08ff00f8970b28b
- GITHUB_TOKEN: env variable registered

## APPS
- FILO: filo.ai.kr/mbti
- DINE: dine.ne.kr/mbti
- DONWAY: donway.ai.kr/mbti
- YONGCHA: yongcha.app
- CTRL: mbtico.kr/control

## DEPLOY
- KV: npx wrangler kv key put FILE --path=FILE --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b --remote
- Worker+yongcha: git pull && npx wrangler deploy
- Auto: git push -> GitHub Actions (wrangler deploy + KV + cache purge)

## YONGCHA WARNING
- yongcha.app은 _worker.js handleYongcha 함수로 서빙 (KV 아님)
- yongcha-worker.js 수정 시 _worker.js handleYongcha 동기화 필수
- 배포: npx wrangler deploy

## DONE (2026-08-04~05)
- FILO: booking 고도화(웨이팅 모달/FCM/노쇼), POS 테이블QR주문 모달+푸시
- DINE: 대시보드 럭셔리, 이모지->SVG, FILO 실시간 연동
- CTRL: Ultra Luxury UI, Glassmorphism, AI리포트
- YONGCHA: 전면 재탄생 — 지도메인/카카오마커/AI코치/ROUTEIQ/플랫폼탭/원탭지원/수익시뮬
- DONWAY: dateFresh 정규화+fallback, 로그인푸시제거, 메뉴정리
- CI: Cloudflare 캐시 퍼지 자동화
- CLAUDE.md: 작업순서/프레시백/yongcha/셸/git 원칙 추가
- .claude/settings.json: dangerouslySkipPermissions + hooks(자동push+wrangler보호)

## TODO
- yongcha.app SyntaxError 완전 확인
- filo-staff.js QR근태 완전 수정
- dine-staff/payroll/analytics 고도화
- filo-pos.js POS 재설계
- Oracle 서버 A1.Flex 생성 (Playwright 자동화 시도 중)
- oracle_auto.js: Oracle SPA 폼 안 뜨는 문제 미해결

## ORACLE
- oracle_auto.js 실행: set REGION=ap-tokyo-1 && node oracle_auto.js
- SSH key: C:/Users/82104/.ssh/id_rsa.pub
- 문제: Oracle SPA Playwright에서 폼 렌더 안 됨

## EXPO D-14 (8/20-22 BEXCO F-2)

## GIT RULES
- main 브랜치만, master 금지
- 백그라운드 셸 금지, 순차 실행만
- git stash 금지, wrangler.toml 수정 금지, filo-common.js 수정 금지
