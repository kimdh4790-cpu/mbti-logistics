# MBTICO Handover (2026-08-05)

## KEY INFO
- GitHub: kimdh4790-cpu/mbti-logistics (main)
- CF Account: 02709cbec18d848913b4246015b9148f
- KV NS_ID: 7f0e90efaea64f3ab08ff00f8970b28b
- GITHUB_TOKEN: 환경변수 등록됨
- git remote: https://kimdh4790-cpu:${GITHUB_TOKEN}@github.com/kimdh4790-cpu/mbti-logistics.git

## APPS
- FILO: filo.ai.kr/mbti
- DINE: dine.ne.kr/mbti
- DONWAY: donway.ai.kr/mbti
- YONGCHA: yongcha.app
- CTRL: mbtico.kr/control

## DEPLOY 자동화
- push → GitHub Actions → wrangler deploy + KV 업로드 + Cloudflare 캐시 퍼지 자동
- yongcha는 _worker.js 인라인 (KV 아님) → push만 하면 자동 배포됨
- .claude/settings.json hooks 설정됨 → 파일 수정 즉시 자동 push

## CLAUDE.md 등록된 규칙
- wrangler.toml, filo-common.js 수정 금지
- 백그라운드 셸 금지 (순차 실행만)
- git stash 금지
- main 브랜치만 (master 삭제 완료)
- 5개씩 페이지네이션
- 이모지 금지 → Lucide SVG
- Pretendard 폰트
- 파일 하나 완료마다 즉시 commit+push+KV 배포
- yongcha KV 업로드 금지 (wrangler deploy만)
- 작업 전 기존 기능 파악 후 고도화

## 2026-08-05 완료
- DONWAY: 업종 삭제(건설/보험/뷰티/요양/학원), dateFresh 정규화+fallback, 로그인 푸시 제거
- FILO: routing 수정, POS 테이블QR주문 모달+푸시
- FILO-BOOKING: 웨이팅 모달폼, FCM 손님푸시, 노쇼처리
- YONGCHA: 전면 재탄생 (지도메인/AI코치/ROUTEIQ/플랫폼탭/원탭지원/수익시뮬)
- CLAUDE.md: 작업순서+프레시백+yongcha배포+셸+git 원칙 등록
- deploy.yml: Cloudflare 캐시 퍼지 스텝 추가
- .claude/settings.json: hooks 자동push + wrangler.toml 보호

## 미완료
- DONWAY SyntaxError 간헐적 발생 가능 (업종 삭제 후 잔재)
- filo-staff.js QR 근태 완전 수정
- dine-staff/payroll/analytics 고도화
- filo-pos.js POS 전면 재설계
- Oracle A1 서버 (도쿄 용량 없음, Playwright 자동화 시도 중)

## Oracle 자동화
- oracle_auto.js: Playwright로 자동 인스턴스 생성 시도
- 실행: cd mbti-logistics && set REGION=ap-tokyo-1 && node oracle_auto.js
- 문제: Oracle 콘솔이 SPA라 폼 로딩 감지 실패 중
- oracle-fail-createpage.png 확인해서 실제 화면 파악 필요

## 박람회 D-15 (8/20~22 벡스코 F-2)
- 우선순위: 앱 완성 > Oracle 서버 > 영상 자동화
