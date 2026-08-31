# /setup-login — 네이버 로그인 세션 초기 설정

## 실행 방법 (로컬 PC 또는 Oracle Cloud에서)

```bash
cd naver-blog
npm install
npx playwright install chromium
npm run login
```

## 주의사항
- 비밀번호는 브라우저에서만 입력 — 터미널·파일에 절대 입력 금지
- naver-profile/ 폴더 = 로그인 세션 — 외부 공유 금지, .gitignore에 포함
- 세션 만료 시 재실행 (보통 수 주~수 개월 유지)
- 이 스크립트는 Claude Code 원격 컨테이너에서 실행 불가 (브라우저 없음)
  → 반드시 로컬 PC 또는 Oracle Cloud(161.33.136.154)에서 실행

## Oracle Cloud에서 실행 시
```bash
ssh -i ~/ssh-key-2026-08-02 opc@161.33.136.154
cd ~/mbti-logistics/naver-blog
npm run login
# X11 포워딩 필요: ssh -X -i ~/ssh-key-2026-08-02 opc@161.33.136.154
```
