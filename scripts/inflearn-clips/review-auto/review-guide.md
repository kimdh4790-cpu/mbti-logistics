# 소상공인 리뷰 자동 관리 — n8n 설치 가이드

## 이 패키지로 무엇을 자동화하나요?

네이버 플레이스·카카오맵에 새 리뷰가 올라올 때마다:
1. 리뷰 내용을 자동으로 감지합니다
2. ChatGPT가 맞춤 답글 초안을 작성합니다
3. 사장님 휴대폰으로 즉시 문자 발송합니다

복사 → 붙여넣기 한 번으로 답글 등록 완료.

---

## 준비물

| 항목 | 비용 | 설명 |
|---|---|---|
| Oracle Cloud 무료 서버 | 월 0원 | 4코어/24GB 영구 무료 |
| n8n (Docker) | 월 0원 | 오픈소스 자동화 도구 |
| OpenAI API 키 | 사용량 과금 | gpt-4o-mini 기준 답글 1건 약 ₩5 |
| 알리고 SMS | 건당 약 ₩9 | 문자 발송 서비스 |

---

## 1단계: Oracle Cloud 서버 접속

```bash
ssh -i ~/ssh-key opc@<서버IP>
```

Oracle Cloud 서버가 없다면 → 클립5 "Oracle Cloud 무료 서버 완전 정복" 먼저 진행하세요.

---

## 2단계: n8n Docker 실행 확인

```bash
docker ps | grep n8n
```

n8n이 실행 중이 아니면:

```bash
docker run -d \
  --name n8n \
  --restart always \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

브라우저에서 `http://<서버IP>:5678` 접속 확인.

---

## 3단계: OpenAI API 키 등록

1. n8n 좌측 메뉴 → **Credentials** → **Add Credential**
2. **OpenAI** 선택
3. API Key 입력 → **Save**

API 키 발급: platform.openai.com → API Keys → Create new secret key

---

## 4단계: 알리고 SMS 설정 (선택)

`사장님 문자 발송` 노드를 알리고 SMS로 교체하는 경우:

1. aligo.in 계정 생성 (무료)
2. HTTP Request 노드로 교체:
   - URL: `https://apis.aligo.in/send/`
   - Method: POST
   - Body Parameters: `key`, `user_id`, `sender`, `receiver`, `msg`

---

## 5단계: 워크플로우 가져오기

1. n8n 화면 → **Workflows** → **Import from File**
2. `workflow-04-review-alert.json` 파일 선택
3. **Import** 클릭

---

## 6단계: 변수 설정

n8n 좌측 메뉴 → **Variables** 에서 아래 3개 등록:

| 변수명 | 값 예시 | 설명 |
|---|---|---|
| `NAVER_PLACE_ID` | `12345678` | 네이버 플레이스 URL의 숫자 부분 |
| `KAKAO_PLACE_ID` | `98765432` | 카카오맵 장소 ID |
| `OWNER_PHONE` | `010-1234-5678` | 알림 받을 사장님 번호 |

### 네이버 플레이스 ID 찾는 방법

네이버 지도에서 내 가게 검색 → URL에서 숫자 복사:
```
https://m.place.naver.com/restaurant/12345678/review/visitor
                                       ^^^^^^^^ ← 이게 ID
```

### 카카오맵 ID 찾는 방법

카카오맵에서 내 가게 검색 → URL에서 숫자 복사:
```
https://place.map.kakao.com/98765432
                             ^^^^^^^^ ← 이게 ID
```

---

## 7단계: 워크플로우 활성화

워크플로우 우측 상단 토글 → **Active** 로 변경.

이후 30분마다 자동으로 리뷰를 확인합니다.

---

## 동작 확인

테스트 실행:
1. 워크플로우 열기 → **Execute Workflow** 클릭
2. 오류 없이 실행되면 설정 완료
3. 리뷰가 없으면 `리뷰 있으면 진행` 노드에서 멈추는 것이 정상

---

## 자주 묻는 질문

**Q. 네이버 플레이스 HTML 구조가 바뀌면 어떻게 되나요?**  
A. 파싱 정규식이 작동하지 않을 수 있습니다. 이 경우 `신규 리뷰 파싱` 노드의 정규식을 수정해야 합니다. 네이버는 HTML 구조를 자주 변경하므로 주기적 확인이 필요합니다.

**Q. ChatGPT API 비용이 걱정됩니다.**  
A. gpt-4o-mini 기준 답글 1건 약 ₩5입니다. 월 리뷰 30건이면 약 ₩150 수준입니다.

**Q. 답글 초안을 수정할 수 있나요?**  
A. 문자로 받은 초안을 복사해서 네이버/카카오 앱에서 직접 붙여넣기 후 필요시 수정하면 됩니다.

**Q. 카카오톡 알림으로 받고 싶습니다.**  
A. `사장님 문자 발송` 노드를 카카오 알림톡(클립1 워크플로우 참고)으로 교체 가능합니다.

---

## 지원

인프런 Q&A 또는 클립 댓글로 질문해주세요.
