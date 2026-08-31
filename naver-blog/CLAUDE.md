# 네이버 블로그 자동화 툴 — CLAUDE.md

## 절대 규칙 (어기면 안 됨)
1. 발행 금지 — 임시저장까지만. naver_draft.js에 installPublishGuard 코드로 보장.
2. 비밀번호 파일 저장 금지 — 로그인은 브라우저에서 사용자가 직접
3. 사실 지어내기 금지 — data/profile.md + 사진으로 확인된 것만
4. 협찬 여부 /write마다 반드시 확인 (메모에 없으면 질문)
5. 학습 데이터 자동 수집 금지 — 사용자 제공 글로만 style-profile 갱신
6. 초안 사용자 승인 후에만 임시저장

## 파일 구조
- data/profile.md — 사업자 사실 정보
- data/blogger-profile.md — 화자 캐릭터 (매 글 일관성 기준)
- data/authority-lines.md — 권위 문구 뱅크
- data/photo-guide.md — 업종별 필수 촬영 컷
- data/sponsored-disclosure.md — 협찬 표기 문구 (공정위)
- data/style-profile.md — 화자 스타일 (learn-style로 갱신)
- data/trends.md — 키워드 트렌드 (analyze-trends로 갱신)
- scripts/naver_login.js — 로그인 세션 저장 (1회)
- scripts/naver_draft.js — 메인 임시저장 스크립트
- scripts/mosaic.js — 개인정보 모자이크
- scripts/probe_selectors.js — 셀렉터 진단 (읽기 전용)
- drafts/ — 초안 JSON + 검증 스크린샷/덤프
- input/photos/ — 사진 원본 (처리본은 _mosaic/ 하위)
- input/videos/ — 동영상
- naver-profile/ — 로그인 세션 (절대 외부 공유 금지, .gitignore)

## 실행 환경
스크립트는 반드시 로컬 PC 또는 Oracle Cloud(161.33.136.154)에서 실행
Claude Code 원격 컨테이너에서는 Playwright 브라우저 외부 접근 불가

## 블로그 설정
- .env 파일의 BLOG_ID = 네이버 블로그 ID (blog.naver.com/[여기])
- soungkyekim@naver.com 계정, 표시명 HYUN, 블로그 ID: donway_, 블로그명: donway_님의 블로그, 별명: MBTICO

## 초안 JSON 포맷
```json
{
  "title": "25~32자",
  "sponsored": false,
  "tags": ["태그1", ..., "태그10"],
  "place": {"query": "검색어", "name": "장소명"},
  "video": {"path": "input/videos/파일.mp4", "title": "40자 이내"},
  "blocks": [
    {"type": "text", "content": "..."},
    {"type": "subtitle", "content": "..."},
    {"type": "image", "path": "input/photos/파일.jpg", "caption": "..."},
    {"type": "quote", "content": "..."},
    {"type": "divider"}
  ]
}
```

## 실측 지식 (셀렉터 디버깅 기록)
- 본문: .se-section-text p.se-text-paragraph (제목 오염 방지 필수)
- 제목: .se-title-text (본문 다 입력 후 마지막에 입력)
- 인용구: button.se-insert-quotation-default-toolbar-button
- 구분선: button.se-insert-horizontal-line-default-toolbar-button
- 한글 입력: keyboard.insertText() (keyboard.type() IME 버그 있음)
- 뷰포트: 1600×1000 이상 (1400 이하에서 툴바 잘림)
- 소제목: 포맷 드롭다운 → 텍스트 입력 순서 (반대 불가)
- 지도 팝업: Escape 안 먹음 → 닫기 버튼 필수 (dim 잔류 방지)
- 동영상: 팝업 완전히 닫지 않으면 이후 클릭 전부 실패

## 발행 후 수동 안내 항목
- 타겟 활동 시간대 발행
- 발행 후 24시간 수정 금지
- 주 2~3회 주기 (하루 2건 이상 금지)
- 협찬 표기 육안 확인

## 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-08-31 | 초기 패키지 생성 (FILO+DINE 테스트용) |
