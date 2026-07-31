

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
