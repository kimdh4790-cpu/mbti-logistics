# n8n 카카오 알림톡 자동화 패키지 — 설치 가이드

## 포함 파일

| 파일 | 설명 |
|---|---|
| `workflow-01-kakao-test.json` | 첫 발송 테스트 (수동 트리거) |
| `workflow-02-sheet-to-kakao.json` | 구글 시트 → 일괄 알림톡 발송 |
| `workflow-03-weekly-auto.json` | 매주 자동 정산 알림톡 (완전 자동) |

---

## 사전 준비 (1회만)

### 1. n8n 설치 (Oracle Cloud 무료 서버 — 월 0원)

```bash
# Oracle Cloud 인스턴스 SSH 접속 후
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=비밀번호입력 \
  n8nio/n8n
```

브라우저에서 `http://서버IP:5678` 접속

### 2. 알리고(Aligo) 계정 발급

1. aligo.in 회원가입
2. 카카오 알림톡 → 채널 연동
3. API KEY, USER ID, SENDER KEY 메모

### 3. 카카오 알림톡 템플릿 등록

1. 카카오 비즈니스 채널 개설 (business.kakao.com)
2. 알림톡 채널 인증 (사업자등록증 필요)
3. 메시지 템플릿 등록 → 승인 (1~3일 소요)
4. 승인 후 템플릿 코드 메모

### 4. 구글 시트 연동 (워크플로우 2, 3만 해당)

1. n8n 좌측 Credentials → Google Sheets OAuth2 추가
2. 구글 계정 연동
3. 시트 ID 확인: `docs.google.com/spreadsheets/d/[여기가ID]/edit`

---

## 워크플로우 가져오기

1. n8n 화면 상단 → Workflows → Import from File
2. JSON 파일 선택
3. `설정값 입력` 노드 더블클릭 → API KEY 등 입력
4. 우측 상단 Save → Active ON

---

## 구글 시트 형식 (워크플로우 2, 3)

| 이름 | 휴대폰 | 건수 | 정산금액 | 정산주차 |
|---|---|---|---|---|
| 홍길동 | 010-1234-5678 | 45 | 1350000 | 2026년 9월 1주차 |
| 김철수 | 010-9876-5432 | 38 | 1140000 | 2026년 9월 1주차 |

---

## 자주 묻는 질문

**Q. 알림톡 발송 비용은?**  
A. 알리고 기준 건당 약 8.8원. 100명 발송 = 880원.

**Q. 카카오 채널 없어도 되나요?**  
A. 없으면 일반 SMS로 대체 발송 가능 (알리고 SMS API 사용).

**Q. 발송 실패 시 어떻게 되나요?**  
A. 워크플로우 3은 관리자에게 완료 알림을 보내므로 실패 여부 확인 가능.

**Q. 몇 명까지 발송 가능한가요?**  
A. 알리고 계정 기준 1회 최대 1,000명. 워크플로우에 1초 간격이 설정되어 있어 API 제한 안전하게 우회.

---

## 문의

이 패키지로 해결 안 되는 경우, 인프런 강의 Q&A에 남겨주세요.
