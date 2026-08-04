# MBTICO Handover (2026-08-04)

## KEY INFO
- GitHub: kimdh4790-cpu/mbti-logistics (main)
- CF Account: 02709cbec18d848913b4246015b9148f
- KV NS_ID: 7f0e90efaea64f3ab08ff00f8970b28b
- GITHUB_TOKEN: env variable registered
- git remote: https://kimdh4790-cpu:${GITHUB_TOKEN}@github.com/kimdh4790-cpu/mbti-logistics.git

## APPS
- FILO: filo.ai.kr/mbti
- DINE: dine.ne.kr/mbti
- DONWAY: donway.ai.kr/mbti
- YONGCHA: yongcha.app
- CTRL: mbtico.kr/control

## DEPLOY
- KV: npx wrangler kv key put "FILE" --path=FILE --namespace-id=7f0e90efaea64f3ab08ff00f8970b28b --remote
- Worker: git pull && npx wrangler deploy
- Auto: git push -> GitHub Actions

## YONGCHA WARNING
- yongcha.app served from _worker.js handleYongcha (NOT KV)
- yongcha-worker.js changes MUST sync to _worker.js handleYongcha
- Deploy: npx wrangler deploy

## DONE TODAY (2026-08-04)
- FILO: sidebar SVG+AI names, lightmode, QR attendance, payroll, POS premium
- DINE: luxury dashboard, emoji->SVG, FILO realtime sync
- CTRL: Ultra Luxury UI, Glassmorphism, AI report
- YONGCHA: full reborn - lightmode/platforms/simulator/ROUTEIQ/AI coach
- LANDING: pricing updated filo+dine
- DONWAY: SyntaxError fixed, login working
- CLAUDE.md: UI+deploy rules added

## TODO
- yongcha _worker.js handleYongcha sync INCOMPLETE
- DONWAY industry codes delete (construction/insurance/beauty/care/academy)
- filo-pos.js POS redesign incomplete
- dine-staff/payroll/analytics upgrade incomplete
- July test data seeding incomplete

## ORACLE SERVER
- Instance: 155.248.187.99 (E2.1.Micro 1core/1GB - wrong spec)
- A1.Flex 2core/12GB - Tokyo no capacity
- SSH key: ssh-key-2026-08-02.key

## EXPO D-16 (8/20-22 BEXCO F-2)

## NEXT SESSION
1. git pull origin main
2. One file per session
3. After done: git commit + push + KV deploy
4. Playwright test

Yongcha sync cmd:
claude --dangerously-skip-permissions "Sync yongcha-worker.js HTML to _worker.js handleYongcha. git commit + push + npx wrangler deploy"
