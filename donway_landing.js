/*
 * donway_landing.js - donway_landing.html 랜딩 페이지 스크립트
 * GitHub push → 자동배포 (GitHub Actions)
 */
var DW_MODALS = {
  /* ── 택배 업종 ── */
  courier_excel:{ic:'📊',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'쿠팡 엑셀 자동 파싱',tagline:'5가지 쿠팡 포맷 자동 인식 → 라우트·구간·시즌 계산',
    body:'<div class="dw-mockup"><div class="dw-mockup-bar"><div class="dw-mockup-dot" style="background:#ef4444"></div><div class="dw-mockup-dot" style="background:#f59e0b"></div><div class="dw-mockup-dot" style="background:#22c55e"></div><div class="dw-mockup-ttl">쿠팡 엑셀 업로드 → 자동 파싱</div></div><div class="dw-stat-row"><div class="dw-stat"><div class="dw-stat-val" style="color:#60A5FA">5종</div><div class="dw-stat-lbl">쿠팡 엑셀 포맷</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#22C55E">자동</div><div class="dw-stat-lbl">라우트 단가 적용</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#F59E0B">즉시</div><div class="dw-stat-lbl">기사별 분리</div></div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📁</div><div><div class="dw-feat-row-ttl">5가지 쿠팡 포맷 자동 인식</div><div class="dw-feat-row-desc">일반배송, 새벽배송, 설/추석 프로모션, 가중요인 인센티브 등 쿠팡 엑셀 포맷을 자동 감지하여 파싱</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">라우트단가표 자동 적용</div><div class="dw-feat-row-desc">사전 등록한 RPRICE(라우트별 단가)가 자동 적용. 구간·시즌별 단가도 자동 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">👤</div><div><div class="dw-feat-row-ttl">기사별 자동 분리</div><div class="dw-feat-row-desc">엑셀 업로드 한 번으로 31명 전원 정산 자동 완료. 아이디 지원 기사도 자동 분리 처리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔔</div><div><div class="dw-feat-row-ttl">프레시백·인센티브 자동</div><div class="dw-feat-row-desc">프레시백 회수금, 가중요인 인센티브 자동 계산 및 기사별 명세서 반영</div></div></div>'},
  courier_kakao:{ic:'💬',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'카카오 알림톡 명세서',tagline:'기사별 실지급 명세서 카카오톡 자동 발송',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📲</div><div><div class="dw-feat-row-ttl">정산 확정 → 즉시 발송</div><div class="dw-feat-row-desc">정산 완료 버튼 하나로 전 기사에게 개인별 명세서 카카오 알림톡 자동 발송. 기사가 따로 앱 설치 불필요</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">상세 명세서 내용</div><div class="dw-feat-row-desc">라우트별 건수·단가, 인센티브, 공제 항목 전체 표시. 기사 문의 전화 90% 감소</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔗</div><div><div class="dw-feat-row-ttl">웹 명세서 링크</div><div class="dw-feat-row-desc">알림톡에 포함된 링크 클릭 시 상세 명세서 웹페이지 열람. 90일간 유효</div></div></div>'},
  courier_tax:{ic:'🧾',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'세금계산서 자동 발행',tagline:'정산 확정 즉시 사업자별 세금계산서 자동 생성',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">⚡</div><div><div class="dw-feat-row-ttl">정산 즉시 자동 발행</div><div class="dw-feat-row-desc">정산 확정 클릭 즉시 사업자별 세금계산서 자동 생성. 수기 작업 완전 제거</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🏢</div><div><div class="dw-feat-row-ttl">법인·개인사업자 모두 지원</div><div class="dw-feat-row-desc">사업자등록번호 기반 자동 발행. 법인·개인 구분 자동 처리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📧</div><div><div class="dw-feat-row-ttl">이메일 자동 발송</div><div class="dw-feat-row-desc">세금계산서 발행 즉시 거래처 담당자 이메일로 자동 전달</div></div></div>'},
  courier_margin:{ic:'📈',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'캠프별 마진 분석',tagline:'캠프별 마진율·건수 실시간 비교',
    body:'<div class="dw-stat-row"><div class="dw-stat"><div class="dw-stat-val" style="color:#60A5FA">5개</div><div class="dw-stat-lbl">캠프 동시 관리</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#22C55E">실시간</div><div class="dw-stat-lbl">마진율 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">캠프별 마진율 비교</div><div class="dw-feat-row-desc">부산1/2/3, 대구2, 진주M 각 캠프별 매출·지급액·마진율 한눈에 비교. 수익성 낮은 캠프 즉시 파악</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🚨</div><div><div class="dw-feat-row-ttl">이탈 기사 자동 감지</div><div class="dw-feat-row-desc">전월 대비 건수 급감 기사 자동 알림. 이탈 징후 사전 포착 가능</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📅</div><div><div class="dw-feat-row-ttl">월별 추이 차트</div><div class="dw-feat-row-desc">캠프별 월별 건수·매출 추이 차트. 계절성·이상치 즉시 파악</div></div></div>'},
  courier_accountant:{ic:'👨‍💼',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'세무사 연동',tagline:'더존 CSV 자동 생성, 90일 공유 링크 발송',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📤</div><div><div class="dw-feat-row-ttl">더존 CSV 자동 생성</div><div class="dw-feat-row-desc">세무사가 사용하는 더존 회계 프로그램 호환 CSV 자동 생성. 세무사 자료 전달 시간 제로</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔗</div><div><div class="dw-feat-row-ttl">90일 공유 링크</div><div class="dw-feat-row-desc">월 정산 완료 후 세무사 전용 공유 링크 생성. 링크 클릭만으로 세무사가 자료 열람 가능</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🧾</div><div><div class="dw-feat-row-ttl">영수증 OCR 자동 인식</div><div class="dw-feat-row-desc">영수증 사진 업로드 → Claude AI가 금액·거래처·카테고리 자동 인식. 수기 입력 불필요</div></div></div>'},
  courier_chat:{ic:'🗨️',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'1:1 실시간 채팅',tagline:'고객사와 운영사 간 앱 내 실시간 소통',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">💬</div><div><div class="dw-feat-row-ttl">앱 내 채팅</div><div class="dw-feat-row-desc">DONWAY 앱 안에서 직접 메시지 발송. 전화 없이 텍스트로 빠른 소통</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔔</div><div><div class="dw-feat-row-ttl">FCM 푸시 알림</div><div class="dw-feat-row-desc">새 메시지 도착 시 스마트폰 푸시 알림. 앱 꺼져 있어도 즉시 수신</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📢</div><div><div class="dw-feat-row-ttl">공지사항 팝업</div><div class="dw-feat-row-desc">로그인 시 공지사항 팝업 자동 표시. 모든 고객에게 중요 안내 일괄 전달</div></div></div>'},

  /* ── 공통 기능 ── */
  qr_attend:{ic:'🔐',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'QR 출퇴근',tagline:'동적 QR로 대리 출퇴근 방지 + 급여 자동 연동',
    body:'<div class="dw-stat-row"><div class="dw-stat"><div class="dw-stat-val" style="color:#22C55E">60초</div><div class="dw-stat-lbl">QR 갱신 주기</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#60A5FA">GPS</div><div class="dw-stat-lbl">위치 검증</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#F59E0B">자동</div><div class="dw-stat-lbl">급여 연동</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔄</div><div><div class="dw-feat-row-ttl">동적 QR (보안 강화)</div><div class="dw-feat-row-desc">60초마다 QR 자동 변경. 캡처·공유로 대리 출퇴근 원천 차단</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📍</div><div><div class="dw-feat-row-ttl">GPS 위치 검증</div><div class="dw-feat-row-desc">스캔 시 GPS 좌표 기록. 지정 반경 외 스캔 시 경고 알림</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">급여 자동 연동</div><div class="dw-feat-row-desc">출퇴근 데이터 → 근무시간 자동 계산 → 급여에 자동 반영. 별도 입력 불필요</div></div></div>'},
  inventory:{ic:'📦',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'재고 관리',tagline:'입출고 자동 기록, 발주 알림, 실시간 재고 현황',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📥</div><div><div class="dw-feat-row-ttl">입출고 자동 기록</div><div class="dw-feat-row-desc">입고·출고 등록 즉시 재고 자동 업데이트. 거래처별 엑셀 업로드로 대량 입고 처리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔔</div><div><div class="dw-feat-row-ttl">자동 발주 알림</div><div class="dw-feat-row-desc">최소 재고 기준 이하 도달 시 즉시 알림. 카카오 알림톡으로 발주 안내 자동 발송</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">4단계 재고 현황</div><div class="dw-feat-row-desc">정상·주의·발주필요·만료 4단계 자동 분류. 문제 품목 즉시 식별</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🍽</div><div><div class="dw-feat-row-ttl">레시피·원가 계산</div><div class="dw-feat-row-desc">메뉴별 레시피 등록 → 원가율·마진율 자동 계산. 판매가 책정 근거 제공</div></div></div>'},
  kiosk:{ic:'🖥️',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'키오스크 POS',tagline:'태블릿으로 주문·결제·매출 자동 집계',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">💳</div><div><div class="dw-feat-row-ttl">다양한 결제 수단</div><div class="dw-feat-row-desc">현금·카드·카카오페이·네이버페이·토스페이 모두 지원. 결제 즉시 매출 자동 집계</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📑</div><div><div class="dw-feat-row-ttl">메뉴 엑셀 업로드</div><div class="dw-feat-row-desc">엑셀로 메뉴 대량 등록. 카테고리·가격·이미지 한 번에 설정</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔔</div><div><div class="dw-feat-row-ttl">테이블 QR 주문</div><div class="dw-feat-row-desc">테이블별 QR로 고객이 직접 주문. 주방 화면에 실시간 수신</div></div></div>'},
  payroll:{ic:'💼',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'급여 관리',tagline:'시급·일급·월급·커미션 혼용 + 4대보험 자동',
    body:'<div class="dw-stat-row"><div class="dw-stat"><div class="dw-stat-val" style="color:#60A5FA">10,320</div><div class="dw-stat-lbl">2026 최저시급</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#22C55E">자동</div><div class="dw-stat-lbl">주휴수당</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#F59E0B">×1.5</div><div class="dw-stat-lbl">야간·연장</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">⚖️</div><div><div class="dw-feat-row-ttl">2026 근로기준법 자동 적용</div><div class="dw-feat-row-desc">최저시급 10,320원, 주휴수당, 야간·연장(×1.5) 자동. 5인 미만 특례 자동 처리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🏦</div><div><div class="dw-feat-row-ttl">4대보험 자동 계산</div><div class="dw-feat-row-desc">국민연금(4.5%)·건강보험(3.545%)·고용보험(0.9%) 자동 공제</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">4가지 급여 형태</div><div class="dw-feat-row-desc">시급·주급·격주·월급 혼용 사업장도 정확히 처리. 커미션 기반 급여도 지원</div></div></div>'},
  roster:{ic:'🗓️',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'근무표·연차 관리',tagline:'주간 근무표 자동 생성, 연차 신청·승인 자동화',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📅</div><div><div class="dw-feat-row-ttl">주간 근무표 자동 생성</div><div class="dw-feat-row-desc">직원별 근무 패턴 등록 → 주간 달력 자동 생성. 교대 근무 설정으로 반복 입력 불필요</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔄</div><div><div class="dw-feat-row-ttl">근무 교체 요청</div><div class="dw-feat-row-desc">직원끼리 카카오톡 링크로 교체 요청. 승인 시 근무표·급여 자동 반영</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🌴</div><div><div class="dw-feat-row-ttl">연차 자동 계산</div><div class="dw-feat-row-desc">입사일 기준 연차 자동 부여. 신청·승인·잔여일수 실시간 관리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🔗</div><div><div class="dw-feat-row-ttl">근무표 공개 링크</div><div class="dw-feat-row-desc">로그인 없이 링크만으로 근무표 확인. 단톡방 공유 가능</div></div></div>'},

  /* ── 배달대행 ── */
  delivery_settle:{ic:'🛵',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'배달대행 정산',tagline:'쿠팡이츠·배민·바로고 등 플랫폼별 정산 자동화',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📑</div><div><div class="dw-feat-row-ttl">플랫폼별 엑셀 자동 파싱</div><div class="dw-feat-row-desc">배민, 쿠팡이츠, 바로고 정산 엑셀 업로드 → 플랫폼별 수수료 자동 차감, 라이더별 실수령액 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">라이더별 자동 분리</div><div class="dw-feat-row-desc">건수·금액·수수료 라이더별 자동 분리. 정산 확정 즉시 명세서 발송</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">채널별 수익성 비교</div><div class="dw-feat-row-desc">플랫폼별 수수료율·실수익 비교. 어느 플랫폼이 더 유리한지 즉시 파악</div></div></div>'},
  delivery_kakao:{ic:'💬',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'라이더 명세서 발송',tagline:'라이더별 실지급 명세서 카카오 자동 발송',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📲</div><div><div class="dw-feat-row-ttl">정산 확정 → 즉시 발송</div><div class="dw-feat-row-desc">정산 완료 버튼 하나로 전 라이더에게 개인별 명세서 카카오 알림톡 자동 발송</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">건수·금액·수수료 내역</div><div class="dw-feat-row-desc">플랫폼별 건수, 총 금액, 수수료 공제 내역, 실수령액 전체 표시</div></div></div>'},
  delivery_diff:{ic:'📊',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'차액 정산',tagline:'플랫폼 수수료 자동 차감, 실수령액 계산',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">➖</div><div><div class="dw-feat-row-ttl">수수료 자동 차감</div><div class="dw-feat-row-desc">플랫폼별 수수료율 자동 적용. 총 배달료 - 수수료 = 실수령액 자동 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📈</div><div><div class="dw-feat-row-ttl">일별 건수 분석</div><div class="dw-feat-row-desc">라이더별·지역별·시간대별 배달 건수 통계. 피크타임 인력 배치 최적화</div></div></div>'},
  delivery_stats:{ic:'📈',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'일별 건수 분석',tagline:'라이더별·지역별 배달 건수 통계',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">라이더별 통계</div><div class="dw-feat-row-desc">라이더별 일·주·월 배달 건수, 평균 배달료, 수익 추이 자동 집계</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🗺️</div><div><div class="dw-feat-row-ttl">지역별 분석</div><div class="dw-feat-row-desc">지역별 배달 밀도, 피크타임 분석. 배차 효율 최적화에 활용</div></div></div>'},

  /* ── 청소·건설·공통 ── */
  cleaning_pay:{ic:'🧹',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'청소 직원 급여',tagline:'시급·일급·건당 혼용 자동 계산',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">시급·일급·건당 혼용</div><div class="dw-feat-row-desc">정직원(시급), 파트타임(일급), 건당 도급 직원 혼용 사업장도 한 번에 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">근무표 → 급여 자동</div><div class="dw-feat-row-desc">주간 근무표 업로드 즉시 급여 자동 계산. 수동 입력 없이 정확한 급여 산출</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🏢</div><div><div class="dw-feat-row-ttl">지점별 인건비 관리</div><div class="dw-feat-row-desc">지점별 인건비 비율 실시간 비교. 인건비 초과 지점 즉시 파악</div></div></div>'},
  const_pay:{ic:'🏗️',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'일용직 급여',tagline:'날별 인원·금액 다른 일용직 자동 계산',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📅</div><div><div class="dw-feat-row-ttl">날별 일용직 자동 계산</div><div class="dw-feat-row-desc">매일 다른 인원·일당을 날짜별로 입력하면 월 합계 자동 계산. 여러 현장 동시 관리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🧾</div><div><div class="dw-feat-row-ttl">일용근로소득세 자동</div><div class="dw-feat-row-desc">일당 187,000원 초과분에 대한 일용근로소득세 자동 계산 및 명세서 반영</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">현장별 분리 관리</div><div class="dw-feat-row-desc">현장A·B·C 각각 인원·비용 분리 집계. 현장별 수익성 즉시 파악</div></div></div>'},
  const_site:{ic:'📋',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'현장별 관리',tagline:'현장별 인원·비용 통합 관리',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">🏗️</div><div><div class="dw-feat-row-ttl">현장 단위 분리</div><div class="dw-feat-row-desc">현장별 투입 인원, 인건비, 자재비 분리 입력. 현장별 손익 즉시 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">현장 수익 분석</div><div class="dw-feat-row-desc">발주 금액 대비 실제 비용 비교. 수익성 낮은 현장 즉시 파악 및 원인 분석</div></div></div>'},
  const_tax:{ic:'🧾',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'일용직 세금',tagline:'일용근로소득세 자동 계산 + 지급명세서 생성',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">🧾</div><div><div class="dw-feat-row-ttl">일용근로소득세 자동</div><div class="dw-feat-row-desc">일당 187,000원 초과 시 6% 원천징수 자동 계산. 비과세 구간 자동 처리</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📄</div><div><div class="dw-feat-row-ttl">일용직 지급명세서</div><div class="dw-feat-row-desc">분기별 일용직 지급명세서 자동 생성. 세무사 제출용 자료 원클릭 완성</div></div></div>'},

  /* ── 보험 ── */
  ins_comm:{ic:'🛡️',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'설계사 수수료',tagline:'상품별 수수료 자동 계산, 환수 처리',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">상품별 수수료 자동</div><div class="dw-feat-row-desc">종신·건강·자동차 등 상품별 수수료율 등록 → 신계약 입력 즉시 수수료 자동 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">↩️</div><div><div class="dw-feat-row-ttl">환수 자동 처리</div><div class="dw-feat-row-desc">계약 해지 시 환수금액 자동 계산 및 설계사 급여에서 자동 차감</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">설계사별 실적 관리</div><div class="dw-feat-row-desc">신계약·유지·환수 통합 관리. 설계사별 순수익 및 팀 실적 자동 집계</div></div></div>'},
  ins_perf:{ic:'📈',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'실적 관리',tagline:'설계사별 신계약·유지·환수 통합 관리',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">설계사별 실적</div><div class="dw-feat-row-desc">신계약 건수·금액, 유지율, 환수율 설계사별 자동 집계. 성과 평가 근거 데이터</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">👥</div><div><div class="dw-feat-row-ttl">팀별 통합 분석</div><div class="dw-feat-row-desc">팀장별 팀 실적 통합. 팀 간 성과 비교 및 인센티브 계산 자동화</div></div></div>'},

  /* ── 뷰티 ── */
  beauty_comm:{ic:'💄',color:'rgba(239,68,68,.15)',border:'rgba(239,68,68,.3)',
    title:'매출 커미션',tagline:'매출 기반 커미션 자동 계산',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">💰</div><div><div class="dw-feat-row-ttl">매출 기반 커미션</div><div class="dw-feat-row-desc">직원별 담당 매출 자동 집계 → 커미션율 적용 → 기본급+커미션 합산 자동 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📈</div><div><div class="dw-feat-row-ttl">직원별·매장별 비교</div><div class="dw-feat-row-desc">직원별 매출 순위, 매장별 실적 비교. 성과 우수 직원 즉시 파악</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">QR 출퇴근 연동</div><div class="dw-feat-row-desc">출퇴근 자동 기록 → 근무시간 기반 기본급 + 매출 기반 커미션 합산</div></div></div>'},

  /* ── 요양 ── */
  care_pay:{ic:'🏥',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'요양보호사 급여',tagline:'방문시간·거리 기반 급여 자동 계산',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">⏱</div><div><div class="dw-feat-row-ttl">방문시간 기반 급여</div><div class="dw-feat-row-desc">어르신별 방문 시간 기록 → 시간 단위 급여 자동 계산. 이동거리 수당 별도 적용</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📋</div><div><div class="dw-feat-row-ttl">방문 기록 자동 집계</div><div class="dw-feat-row-desc">어르신별 월 방문 일정·시간 자동 집계. 급여 계산 근거 자료 자동 생성</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🧾</div><div><div class="dw-feat-row-ttl">4대보험 자동</div><div class="dw-feat-row-desc">요양보호사 4대보험 자동 계산. 시간제·전일제 구분 처리</div></div></div>'},
  care_visit:{ic:'📋',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'방문 기록',tagline:'어르신별 방문 일정·시간 자동 집계',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">👴</div><div><div class="dw-feat-row-ttl">어르신별 방문 관리</div><div class="dw-feat-row-desc">어르신별 담당 보호사, 방문 스케줄, 누적 방문시간 자동 집계</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">센터별 통계</div><div class="dw-feat-row-desc">센터별 방문건수·총 서비스시간·매출 자동 집계. 급여 정산 근거 자료</div></div></div>'},

  /* ── 공통 ── */
  insurance4:{ic:'🧾',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'4대보험 자동 계산',tagline:'국민연금·건강·고용·산재 자동 계산 및 신고 자료',
    body:'<div class="dw-stat-row"><div class="dw-stat"><div class="dw-stat-val" style="color:#60A5FA">4.5%</div><div class="dw-stat-lbl">국민연금(근로자)</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#22C55E">3.545%</div><div class="dw-stat-lbl">건강보험</div></div><div class="dw-stat"><div class="dw-stat-val" style="color:#F59E0B">0.9%</div><div class="dw-stat-lbl">고용보험</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">⚙️</div><div><div class="dw-feat-row-ttl">요율 자동 업데이트</div><div class="dw-feat-row-desc">매년 변경되는 4대보험 요율 자동 적용. 연도 바뀌어도 수동 수정 불필요</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📄</div><div><div class="dw-feat-row-ttl">신고 자료 자동 생성</div><div class="dw-feat-row-desc">4대보험 신고용 자료 자동 생성. 세무사 또는 공단 직접 제출용</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🏢</div><div><div class="dw-feat-row-ttl">5인 미만 자동 처리</div><div class="dw-feat-row-desc">5인 미만 사업장 연장·야간·휴일 가산 자동 제외</div></div></div>'},
  branch_stats:{ic:'📈',color:'rgba(0,102,255,.15)',border:'rgba(0,102,255,.3)',
    title:'지점·현장별 실적',tagline:'지점별 매출·마진·인건비 실시간 비교',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">📊</div><div><div class="dw-feat-row-ttl">지점별 수익성 비교</div><div class="dw-feat-row-desc">지점별 매출·인건비·마진율 실시간 비교. 수익성 낮은 지점 즉시 파악하여 조치</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📅</div><div><div class="dw-feat-row-ttl">월별 추이 분석</div><div class="dw-feat-row-desc">지점별 월별 실적 추이 차트. 계절성, 이상치 즉시 확인</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🏆</div><div><div class="dw-feat-row-ttl">직원별 실적 순위</div><div class="dw-feat-row-desc">직원별 매출·건수 순위 자동 집계. 성과급·인센티브 계산 근거 자료</div></div></div>'},

  donway_filo:{ic:'🔗',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'DONWAY × FILO 연동',tagline:'출퇴근 → 급여 → 정산 → 명세서 원스톱',
    body:'<div class="dw-feat-row"><div class="dw-feat-row-ic">⚡</div><div><div class="dw-feat-row-ttl">출퇴근 → 급여 자동</div><div class="dw-feat-row-desc">FILO QR 스캔 → 근무시간 집계 → DONWAY 급여 계산 자동 반영. 별도 입력 0</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📦</div><div><div class="dw-feat-row-ttl">재고 → 원가 연동</div><div class="dw-feat-row-desc">FILO 재고 판매 → DONWAY 원가 분석 자동 반영. 마진율 실시간 계산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">🖥️</div><div><div class="dw-feat-row-ttl">POS 매출 → 정산</div><div class="dw-feat-row-desc">FILO POS 결제 즉시 DONWAY 월 정산에 반영. 홀+배달 통합 정산</div></div></div><div class="dw-feat-row"><div class="dw-feat-row-ic">📱</div><div><div class="dw-feat-row-ttl">탭 하나로 전환</div><div class="dw-feat-row-desc">DONWAY 탑바에서 FILO 바로가기. 같은 계정으로 자유롭게 전환</div></div></div>'}
};

function _dwOpenModal(key){
  var d=DW_MODALS[key]; if(!d)return;
  var hdr=document.getElementById('dw-modal-hdr');
  var bdy=document.getElementById('dw-modal-body');
  hdr.innerHTML='<div class="dw-modal-ic" style="background:'+d.color+';border:1px solid '+d.border+'">'+d.ic+'</div>'+
    '<div style="flex:1"><div style="font-size:18px;font-weight:900;letter-spacing:-.5px;margin-bottom:3px;color:#F0F4FF">'+d.title+'</div>'+
    '<div style="font-size:12px;color:#8B949E">'+d.tagline+'</div></div>'+
    '<button class="dw-modal-close" onclick="_dwCloseModal()">✕</button>';
  bdy.innerHTML=d.body+
    '<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:10px;flex-wrap:wrap">'+
    '<button onclick="location.href=\'https://donway.ai.kr/join\'" style="flex:1;min-width:140px;padding:12px;background:linear-gradient(135deg,#0066FF,#7C3AED);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">🚀 무료 체험 시작</button>'+
    '<button onclick="_dwCloseModal()" style="padding:12px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#8B949E;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">닫기</button></div>';
  document.getElementById('dw-modal-overlay').classList.add('open');
  document.getElementById('dw-modal-box').scrollTop=0;
}
function _dwCloseModal(e){
  if(e&&e.target!==document.getElementById('dw-modal-overlay'))return;
  document.getElementById('dw-modal-overlay').classList.remove('open');
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')_dwCloseModal();
});
