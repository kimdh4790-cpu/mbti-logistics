# /checklist — 배포 전 체크리스트

기능 구현 완료 후 배포 전에 확인해야 할 항목을 자동으로 생성합니다.

## 사용법
```
/checklist <수정한 기능 또는 파일 설명>
```

## 기본 체크 항목

### 코드 품질
- [ ] alert() 사용 없음 (_filoToast/_dineToast 사용)
- [ ] 이모지 없음 (Lucide SVG 사용)
- [ ] console.error/log 디버그 잔재 제거
- [ ] filo-common.js 수정 없음

### 보안
- [ ] 새 API 엔드포인트에 verifyFirebaseToken 인증 추가
- [ ] 사용자 입력 검증 (HTML 인젝션 방지)
- [ ] 시크릿 하드코딩 없음

### Firestore
- [ ] filo_orders 컬렉션 필드명 변경 없음
- [ ] tableNum 타입 혼재 상태 유지

### 배포
- [ ] 수정 파일 KV 업로드 목록 확인
- [ ] _worker.js 수정 시 }{status:400 패턴 손상 없음
- [ ] wrangler.toml 수정 없음
- [ ] GitHub Actions deploy.yml 수정 없음

### 테스트
- [ ] 관련 앱 smoke 테스트 실행
- [ ] 배포 후 실 URL 접속 확인

$ARGUMENTS
