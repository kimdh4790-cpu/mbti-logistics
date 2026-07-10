/*
 * filo-landing.js - filo-landing.html 랜딩 페이지 스크립트
 * GitHub push → 자동배포 (GitHub Actions)
 */
/* ── 슬라이드 ── */
var cur=0,total=6,anim=false;
function _setSlide(n){
  if(anim||n===cur)return;anim=true;
  var sl=document.querySelectorAll('.slide'),dt=document.querySelectorAll('.dot');
  sl[cur].classList.remove('active');
  if(n>cur)sl[cur].classList.add('prev');
  cur=n;
  sl.forEach(function(s){s.classList.remove('active','prev');});
  sl[cur].classList.add('active');
  dt.forEach(function(d){d.classList.remove('active');});dt[cur].classList.add('active');
  setTimeout(function(){anim=false;},600);
}
function _goSlide(d){_setSlide((cur+d+total)%total);}
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'||e.key==='ArrowDown')_goSlide(1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')_goSlide(-1);
  if(e.key==='Escape')_closeModal();
});
var sx=0;
document.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',function(e){
  if(document.getElementById('modal-overlay').classList.contains('open'))return;
  var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)_goSlide(dx<0?1:-1);
});
/* 자동 슬라이드 없음 */

/* ── 업종 탭 ── */
var indMap={
  all:'POS · QR출퇴근 · 재고 · 테이블QR · 포인트 · 예약 · 급여 · 세무사',
  food:'POS · 테이블QR주문 · 메뉴관리 · 배달주문 · 직원급여 · 예약관리',
  beauty:'POS · 회원QR · 포인트·회원권 · 직원QR출퇴근 · 급여 · 예약',
  cafe:'POS · 테이블QR · 메뉴관리 · 재고자동발주 · 직원출퇴근 · 세무사',
  retail:'POS · 재고관리 · 자동발주 · 원가계산 · 직원급여 · 포인트',
  service:'QR출퇴근 · 직원급여명세서 · 예약·달력 · 회원관리 · 세무사연동'
};
function _selInd(el,key){
  document.querySelectorAll('.ind-tab').forEach(function(t){t.classList.remove('on');});
  el.classList.add('on');
  document.getElementById('ind-list').textContent=indMap[key]||'';
}

/* ════ 모달 데이터 ════ */
var MODALS={
  pos:{
    ic:'🖥️',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'POS 키오스크',tagline:'매장 카운터에서 바로 사용하는 터치 결제 시스템',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">POS 결제 화면</div></div><div class="pos-mockup"><div class="pos-menu-item"><div class="pm-name">아메리카노</div><div class="pm-price">4,500원</div></div><div class="pos-menu-item"><div class="pm-name">카페라떼</div><div class="pm-price">5,000원</div></div><div class="pos-menu-item"><div class="pm-name">바닐라라떼</div><div class="pm-price">5,500원</div></div><div class="pos-cart"><div class="pos-cart-row"><span>아메리카노×2</span><span>9,000원</span></div><div class="pos-cart-row"><span>카페라떼×1</span><span>5,000원</span></div><div class="pos-cart-row"><span>합계</span><span>14,000원</span></div></div></div></div><div class="feat-list"><div class="feat-row"><div class="feat-row-ic">💳</div><div class="feat-row-body"><div class="feat-row-title">다양한 결제 수단</div><div class="feat-row-desc">현금, 카드, 카카오페이, 네이버페이, 토스페이 모두 지원. 결제 내역 자동 집계</div></div></div><div class="feat-row"><div class="feat-row-ic">📑</div><div class="feat-row-body"><div class="feat-row-title">메뉴 엑셀 업로드</div><div class="feat-row-desc">엑셀 파일로 메뉴 대량 등록. 카테고리, 가격, 이미지 URL 한 번에 설정 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">실시간 매출 집계</div><div class="feat-row-desc">시간대별, 메뉴별, 결제수단별 매출 자동 분석. 대시보드에서 한눈에 파악</div></div></div><div class="feat-row"><div class="feat-row-ic">🏷️</div><div class="feat-row-body"><div class="feat-row-title">카테고리 필터</div><div class="feat-row-desc">음료/음식/디저트 등 카테고리별 탭 분류. 메뉴가 많아도 빠른 검색 가능</div></div></div></div>';}
  },
  qr:{
    ic:'🔐',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'QR 출퇴근',tagline:'직원이 QR 스캔 한 번으로 출퇴근 기록 완료',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">QR 출퇴근 화면</div></div><div class="qr-scan-mockup"><div class="qr-phone"><div class="qr-phone-screen">📷 QR 스캔<br>───────<br>김직원<br>09:02 출근<br>✅ 기록완료</div><div class="qr-phone-btn">QR 스캔</div></div><div class="qr-info"><div class="qr-info-row"><span class="lbl">직원명</span><span class="val">김직원</span></div><div class="qr-info-row"><span class="lbl">출근시각</span><span class="val" style="color:#4ade80">09:02</span></div><div class="qr-info-row"><span class="lbl">오늘 근무</span><span class="val">7h 58m</span></div><div class="qr-info-row"><span class="lbl">이번주</span><span class="val">39h 30m</span></div></div></div></div><div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📱</div><div class="feat-row-body"><div class="feat-row-title">동적 QR (보안 강화)</div><div class="feat-row-desc">60초마다 QR이 자동 변경되어 캡처·공유로 부정 출퇴근 원천 차단</div></div></div><div class="feat-row"><div class="feat-row-ic">⚡</div><div class="feat-row-body"><div class="feat-row-title">실시간 onSnapshot</div><div class="feat-row-desc">스캔 즉시 관리자 화면에 반영. 새로고침 없이 실시간 출퇴근 현황 확인</div></div></div><div class="feat-row"><div class="feat-row-ic">✏️</div><div class="feat-row-body"><div class="feat-row-title">수동 체크인</div><div class="feat-row-desc">QR 분실 또는 스캔 누락 시 관리자가 직접 출퇴근 시간 수정 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">🔗</div><div class="feat-row-body"><div class="feat-row-title">급여 자동 연동</div><div class="feat-row-desc">출퇴근 데이터가 급여 계산에 자동 반영. 별도 입력 없이 정확한 급여 산출</div></div></div></div>';}
  },
  inv:{
    ic:'📊',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'재고 현황',tagline:'실시간 재고 파악부터 자동 발주까지 한번에',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">재고 현황 대시보드</div></div><table class="inv-table"><thead><tr><th>품목</th><th>현재고</th><th>최소</th><th>상태</th></tr></thead><tbody><tr><td>아라비카 원두</td><td>12kg</td><td>5kg</td><td><span class="inv-badge inv-ok">정상</span></td></tr><tr><td>우유 (서울우유)</td><td>3L</td><td>5L</td><td><span class="inv-badge inv-warn">주의</span></td></tr><tr><td>바닐라 시럽</td><td>0.5L</td><td>1L</td><td><span class="inv-badge inv-danger">발주요</span></td></tr><tr><td>아이스컵 (L)</td><td>320개</td><td>100개</td><td><span class="inv-badge inv-ok">정상</span></td></tr></tbody></table></div><div class="feat-list"><div class="feat-row"><div class="feat-row-ic">🔔</div><div class="feat-row-body"><div class="feat-row-title">자동 발주 알림</div><div class="feat-row-desc">최소 재고 기준 이하로 떨어지면 즉시 알림. 거래처 정보와 함께 발주 메시지 자동 생성</div></div></div><div class="feat-row"><div class="feat-row-ic">📥</div><div class="feat-row-body"><div class="feat-row-title">거래처별 입고 관리</div><div class="feat-row-desc">거래처별 품목 시트 자동 파싱. 엑셀 업로드 한 번으로 대량 입고 등록</div></div></div><div class="feat-row"><div class="feat-row-ic">🔍</div><div class="feat-row-body"><div class="feat-row-title">4단계 필터</div><div class="feat-row-desc">전체/정상/주의/발주필요 4단계로 재고 상태 즉시 분류. 문제 품목만 빠르게 확인</div></div></div><div class="feat-row"><div class="feat-row-ic">📋</div><div class="feat-row-body"><div class="feat-row-title">입출고 원장</div><div class="feat-row-desc">모든 입출고 이력 자동 기록. 날짜별, 거래처별 조회 및 엑셀 내보내기 지원</div></div></div></div>';}
  },
  pay:{
    ic:'💰',color:'rgba(8,145,178,.15)',border:'rgba(8,145,178,.3)',
    title:'급여 자동계산',tagline:'2026 근로기준법 완벽 반영 — 복잡한 계산은 FILO에게',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">급여 계산 결과 (김직원 · 7월)</div></div><div class="pay-mockup"><div class="pay-row plus"><span class="lbl">기본급 (176h × 10,320원)</span><span class="val">+1,816,320원</span></div><div class="pay-row plus"><span class="lbl">주휴수당 (주 15h↑ 자동)</span><span class="val">+363,264원</span></div><div class="pay-row plus"><span class="lbl">연장수당 (×1.5, 8h)</span><span class="val">+123,840원</span></div><div class="pay-row minus"><span class="lbl">국민연금 (4.5%)</span><span class="val">-81,735원</span></div><div class="pay-row minus"><span class="lbl">건강보험 (3.545%)</span><span class="val">-64,353원</span></div><div class="pay-row minus"><span class="lbl">고용보험 (0.9%)</span><span class="val">-16,345원</span></div><div class="pay-row total"><span class="lbl">💰 실수령액</span><span class="val">2,140,991원</span></div></div></div><div class="feat-list"><div class="feat-row"><div class="feat-row-ic">⚖️</div><div class="feat-row-body"><div class="feat-row-title">2026 근로기준법 자동 적용</div><div class="feat-row-desc">최저시급 10,320원, 주휴수당, 야간수당(×1.5), 연장수당(×1.5) 자동 계산</div></div></div><div class="feat-row"><div class="feat-row-ic">🏢</div><div class="feat-row-body"><div class="feat-row-title">5인 미만 특례 자동 처리</div><div class="feat-row-desc">5인 미만 사업장은 연장·야간·휴일 가산 면제 자동 적용</div></div></div><div class="feat-row"><div class="feat-row-ic">📋</div><div class="feat-row-body"><div class="feat-row-title">시급·주급·격주·월급 모두 지원</div><div class="feat-row-desc">계약 유형별 자동 계산. 파트타이머와 정규직 혼용 사업장도 정확히 처리</div></div></div><div class="feat-row"><div class="feat-row-ic">💬</div><div class="feat-row-body"><div class="feat-row-title">카카오 알림톡 명세서 발송</div><div class="feat-row-desc">급여명세서를 카카오톡으로 자동 발송. 직원이 스마트폰에서 바로 확인</div></div></div></div>';}
  },
  table:{
    ic:'📋',color:'rgba(8,145,178,.15)',border:'rgba(8,145,178,.3)',
    title:'테이블 QR 주문',tagline:'고객이 QR 스캔 → 직접 주문 → 주방 실시간 수신',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">테이블 현황 (실시간)</div></div><div class="table-mockup"><div class="table-cell occupied"><div class="table-num">1</div><div class="table-status" style="color:#38bdf8">착석중</div></div><div class="table-cell"><div class="table-num">2</div><div class="table-status" style="color:var(--t3)">빈 테이블</div></div><div class="table-cell reserved"><div class="table-num">3</div><div class="table-status" style="color:#fcd34d">예약확정</div></div><div class="table-cell occupied"><div class="table-num">4</div><div class="table-status" style="color:#38bdf8">착석중</div></div><div class="table-cell"><div class="table-num">5</div><div class="table-status" style="color:var(--t3)">빈 테이블</div></div><div class="table-cell occupied"><div class="table-num">6</div><div class="table-status" style="color:#38bdf8">착석중</div></div></div><div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px">실시간 자동 업데이트</div></div><div class="step-list"><div class="step-item"><div class="step-num" style="background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);color:#38bdf8">1</div><div class="step-body"><div class="step-title">테이블 QR 스캔</div><div class="step-desc">테이블마다 고유 QR 부착. 고객이 스마트폰으로 스캔하면 주문 페이지 오픈</div></div></div><div class="step-item"><div class="step-num" style="background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);color:#38bdf8">2</div><div class="step-body"><div class="step-title">메뉴 선택 · 결제</div><div class="step-desc">이미지와 가격이 표시된 메뉴판에서 선택. 카드/간편결제로 바로 결제</div></div></div><div class="step-item"><div class="step-num" style="background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);color:#38bdf8">3</div><div class="step-body"><div class="step-title">주방 실시간 알림</div><div class="step-desc">결제 완료 즉시 주방 화면에 주문 표시. 테이블 번호와 메뉴 자동 전달</div></div></div><div class="step-item"><div class="step-num" style="background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);color:#38bdf8">4</div><div class="step-body"><div class="step-title">매출 자동 집계</div><div class="step-desc">테이블별, 시간대별 매출 자동 기록. POS 결제와 통합 집계</div></div></div></div>';}
  },
  member:{
    ic:'🎁',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'회원·포인트 관리',tagline:'QR 하나로 가입부터 포인트 적립까지',
    body:function(){return '<div class="mockup"><div class="mockup-bar"><div class="mockup-dot" style="background:#ef4444"></div><div class="mockup-dot" style="background:#f59e0b"></div><div class="mockup-dot" style="background:#22c55e"></div><div class="mockup-title">회원 정보</div></div><div class="member-card"><div class="member-avatar">👤</div><div class="member-info"><div class="member-name">홍길동 고객</div><div class="member-point">⭐ 포인트 3,400p · 방문 12회</div><div style="font-size:10px;color:var(--t3);margin-top:2px">회원등급: 골드 · 가입 2025-03-15</div></div><div class="member-qr">QR 보기</div></div></div><div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📱</div><div class="feat-row-body"><div class="feat-row-title">QR 스캔 회원가입</div><div class="feat-row-desc">회원 QR을 스캔하면 즉시 회원 정보 확인. 포인트 적립/사용 원터치 처리</div></div></div><div class="feat-row"><div class="feat-row-ic">⭐</div><div class="feat-row-body"><div class="feat-row-title">포인트 자동 적립</div><div class="feat-row-desc">결제 금액에 따라 포인트 자동 적립. 적립률 자유 설정. 다음 방문 시 사용</div></div></div><div class="feat-row"><div class="feat-row-ic">🎫</div><div class="feat-row-body"><div class="feat-row-title">회원권 (정기권·횟수권)</div><div class="feat-row-desc">월 정기권, 10회 이용권 등 회원권 발행. 사용 시 자동 차감. 잔여 횟수 실시간 표시</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">회원별 이용 분석</div><div class="feat-row-desc">방문 횟수, 평균 결제금액, 선호 메뉴 자동 집계. 단골 관리에 활용</div></div></div></div>';}
  },
  qr_staff:{
    ic:'👤',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'직원 QR 카드',tagline:'직원 개인 QR을 생성하고 출력해서 사용',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">🆔</div><div class="feat-row-body"><div class="feat-row-title">개인 고유 QR 생성</div><div class="feat-row-desc">직원 등록 즉시 개인 고유 QR 자동 생성. 타인과 절대 중복 없는 고유 코드</div></div></div><div class="feat-row"><div class="feat-row-ic">🖨️</div><div class="feat-row-body"><div class="feat-row-title">인쇄 / 저장 / 공유</div><div class="feat-row-desc">QR 카드 이미지 PNG 저장 또는 바로 인쇄. 직원에게 카카오톡으로 전송도 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">🔄</div><div class="feat-row-body"><div class="feat-row-title">동적 QR (보안)</div><div class="feat-row-desc">60초마다 자동 변경되는 동적 QR로 캡처 공유 부정 출퇴근 차단</div></div></div><div class="feat-row"><div class="feat-row-ic">👥</div><div class="feat-row-body"><div class="feat-row-title">일괄 출력</div><div class="feat-row-desc">전 직원 QR을 한 번에 출력 가능. 신규 입사 시 즉시 QR 발급</div></div></div></div>';}
  },
  payslip:{
    ic:'📋',color:'rgba(8,145,178,.15)',border:'rgba(8,145,178,.3)',
    title:'급여명세서',tagline:'카카오 알림톡으로 급여명세서 자동 발송',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">💬</div><div class="feat-row-body"><div class="feat-row-title">카카오 알림톡 자동 발송</div><div class="feat-row-desc">급여 확정 버튼 하나로 전 직원에게 급여명세서 즉시 발송. 읽음 여부 확인 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">📑</div><div class="feat-row-body"><div class="feat-row-title">상세 명세서 자동 생성</div><div class="feat-row-desc">기본급, 주휴수당, 연장/야간수당, 4대보험 공제 내역 자동 계산 후 명세서 생성</div></div></div><div class="feat-row"><div class="feat-row-ic">🗂️</div><div class="feat-row-body"><div class="feat-row-title">월별 명세서 보관</div><div class="feat-row-desc">발송된 명세서 자동 저장. 직원 분쟁 발생 시 근거 자료로 활용 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">📲</div><div class="feat-row-body"><div class="feat-row-title">직원 모바일 확인</div><div class="feat-row-desc">직원이 스마트폰 카카오톡에서 바로 확인. 별도 앱 설치 불필요</div></div></div></div>';}
  },
  schedule:{
    ic:'📅',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'근무 스케줄',tagline:'주간 달력으로 교대 근무를 한눈에 관리',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📆</div><div class="feat-row-body"><div class="feat-row-title">주간 달력 뷰</div><div class="feat-row-desc">일~토 주간 달력에 직원별 근무 일정 표시. 드래그로 쉽게 스케줄 조정</div></div></div><div class="feat-row"><div class="feat-row-ic">🔄</div><div class="feat-row-body"><div class="feat-row-title">교대 패턴 설정</div><div class="feat-row-desc">오전/오후/야간 등 교대 패턴 저장. 반복 적용으로 매주 동일 스케줄 자동 생성</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">근무시간 자동 집계</div><div class="feat-row-desc">스케줄 기반 예상 근무시간 자동 계산. 급여 계산 시 실제 출퇴근 데이터와 비교</div></div></div><div class="feat-row"><div class="feat-row-ic">⚠️</div><div class="feat-row-body"><div class="feat-row-title">주 52시간 초과 경고</div><div class="feat-row-desc">스케줄 입력 시 주 52시간 초과 예정이면 즉시 경고. 근로기준법 위반 사전 방지</div></div></div></div>';}
  },
  attend_dash:{
    ic:'📊',color:'rgba(34,197,94,.15)',border:'rgba(34,197,94,.3)',
    title:'출퇴근 현황',tagline:'전 직원의 출퇴근 기록을 한눈에 조회',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📋</div><div class="feat-row-body"><div class="feat-row-title">일별·월별 조회</div><div class="feat-row-desc">날짜별로 전 직원 출퇴근 시각 한눈에 확인. 지각, 조퇴, 결근 자동 표시</div></div></div><div class="feat-row"><div class="feat-row-ic">⏱</div><div class="feat-row-body"><div class="feat-row-title">근무시간 자동 집계</div><div class="feat-row-desc">출근~퇴근 시간 자동 계산. 휴게시간 자동 차감. 월별 총 근무시간 통계</div></div></div><div class="feat-row"><div class="feat-row-ic">✏️</div><div class="feat-row-body"><div class="feat-row-title">관리자 수정</div><div class="feat-row-desc">QR 누락, 오류 기록 관리자가 직접 수정 가능. 수정 이력 자동 기록</div></div></div><div class="feat-row"><div class="feat-row-ic">📤</div><div class="feat-row-body"><div class="feat-row-title">엑셀 내보내기</div><div class="feat-row-desc">월별 출퇴근 데이터 엑셀로 내보내기. 노무사/세무사 자료 제출에 활용</div></div></div></div>';}
  },
  menu:{
    ic:'🍽',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'메뉴 관리',tagline:'엑셀 업로드로 메뉴를 빠르게 등록·관리',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📑</div><div class="feat-row-body"><div class="feat-row-title">엑셀 대량 업로드</div><div class="feat-row-desc">메뉴명, 가격, 카테고리, 이미지URL을 엑셀로 한 번에 업로드. 수십 개 메뉴도 1분 내 등록</div></div></div><div class="feat-row"><div class="feat-row-ic">🏷️</div><div class="feat-row-body"><div class="feat-row-title">카테고리 자유 설정</div><div class="feat-row-desc">음료/푸드/디저트/추가 등 카테고리를 자유롭게 생성. POS와 테이블QR 동기 반영</div></div></div><div class="feat-row"><div class="feat-row-ic">🔄</div><div class="feat-row-body"><div class="feat-row-title">품절/숨김 처리</div><div class="feat-row-desc">메뉴 품절 시 즉시 숨김. 고객 주문 화면에서 자동 제외. 재입고 시 원터치 복원</div></div></div><div class="feat-row"><div class="feat-row-ic">💡</div><div class="feat-row-body"><div class="feat-row-title">레시피 원가 연동</div><div class="feat-row-desc">메뉴별 레시피 재료 입력 시 원가율 자동 계산. 판매가 대비 마진 즉시 확인</div></div></div></div>';}
  },
  orders:{
    ic:'🔔',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'주문 대기',tagline:'들어오는 주문을 실시간으로 접수·처리',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">⚡</div><div class="feat-row-body"><div class="feat-row-title">실시간 주문 알림</div><div class="feat-row-desc">테이블 QR 또는 POS 주문 즉시 알림. 소리 알림과 화면 표시로 놓침 없음</div></div></div><div class="feat-row"><div class="feat-row-ic">✅</div><div class="feat-row-body"><div class="feat-row-title">접수·처리 상태 관리</div><div class="feat-row-desc">신규주문 → 처리중 → 완료 단계 버튼으로 관리. 처리 현황 한눈에 파악</div></div></div><div class="feat-row"><div class="feat-row-ic">🗂️</div><div class="feat-row-body"><div class="feat-row-title">주문 내역 자동 저장</div><div class="feat-row-desc">모든 주문 자동 기록. 날짜별, 테이블별 조회 가능. 분쟁 발생 시 근거 자료</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">시간대별 주문 분석</div><div class="feat-row-desc">피크 타임, 인기 메뉴, 평균 주문 금액 자동 분석. 운영 최적화에 활용</div></div></div></div>';}
  },
  delivery:{
    ic:'🛵',color:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)',
    title:'배달 주문',tagline:'배달앱 주문을 FILO에서 통합 관리',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📱</div><div class="feat-row-body"><div class="feat-row-title">배달앱 주문 통합</div><div class="feat-row-desc">배민, 쿠팡이츠, 요기요 주문을 한 화면에서 통합 관리. 앱 전환 없이 처리</div></div></div><div class="feat-row"><div class="feat-row-ic">📑</div><div class="feat-row-body"><div class="feat-row-title">배달앱 정산 엑셀 파싱</div><div class="feat-row-desc">배달앱 정산 엑셀을 업로드하면 플랫폼별 수수료, 실수령액 자동 계산</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">채널별 매출 비교</div><div class="feat-row-desc">홀 매출 vs 배달 매출 비교 분석. 어느 채널이 더 수익성 높은지 즉시 파악</div></div></div><div class="feat-row"><div class="feat-row-ic">🚴</div><div class="feat-row-body"><div class="feat-row-title">배달 상태 추적</div><div class="feat-row-desc">접수→조리→픽업→완료 단계별 상태 관리. 배달 완료율 통계 자동 집계</div></div></div></div>';}
  },
  sales:{
    ic:'📈',color:'rgba(8,145,178,.15)',border:'rgba(8,145,178,.3)',
    title:'매출 분석',tagline:'시간대·메뉴·결제수단별 심층 분석',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">🕐</div><div class="feat-row-body"><div class="feat-row-title">시간대별 분석</div><div class="feat-row-desc">아침/점심/저녁/야간 4구간 자동 분류. 피크타임 파악으로 인력 배치 최적화</div></div></div><div class="feat-row"><div class="feat-row-ic">🍽</div><div class="feat-row-body"><div class="feat-row-title">메뉴별 인기 순위</div><div class="feat-row-desc">판매량·매출액 TOP5 자동 집계. 잘 나가는 메뉴, 안 나가는 메뉴 즉시 파악</div></div></div><div class="feat-row"><div class="feat-row-ic">💳</div><div class="feat-row-body"><div class="feat-row-title">결제수단별 분석</div><div class="feat-row-desc">현금/카드/카카오페이/네이버페이 비율 차트. 수수료 계산에 활용</div></div></div><div class="feat-row"><div class="feat-row-ic">📅</div><div class="feat-row-body"><div class="feat-row-title">일별 트렌드 차트</div><div class="feat-row-desc">월별 일 매출 라인차트 자동 생성. 매출 추세와 이상치 한눈에 확인</div></div></div></div>';}
  },
  stock_in:{
    ic:'📥',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'입고 관리',tagline:'거래처별 입고를 정확하게 기록·관리',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📑</div><div class="feat-row-body"><div class="feat-row-title">거래처별 엑셀 업로드</div><div class="feat-row-desc">거래처별 시트로 구성된 엑셀 자동 파싱. 품목별 입고 수량, 단가 한 번에 등록</div></div></div><div class="feat-row"><div class="feat-row-ic">📦</div><div class="feat-row-body"><div class="feat-row-title">재고 자동 가산</div><div class="feat-row-desc">입고 등록 즉시 재고 현황에 자동 반영. 수동 수정 없이 정확한 재고 유지</div></div></div><div class="feat-row"><div class="feat-row-ic">🧾</div><div class="feat-row-body"><div class="feat-row-title">입고 검수 기록</div><div class="feat-row-desc">발주 수량 vs 실입고 수량 비교. 불일치 항목 자동 표시로 검수 누락 방지</div></div></div><div class="feat-row"><div class="feat-row-ic">📋</div><div class="feat-row-body"><div class="feat-row-title">입고 원장 조회</div><div class="feat-row-desc">날짜별, 거래처별 입고 이력 전체 조회. 원가 분석 자료로 활용</div></div></div></div>';}
  },
  stock_out:{
    ic:'📤',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'출고 관리',tagline:'출고 등록 즉시 재고가 자동으로 차감됩니다',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">➖</div><div class="feat-row-body"><div class="feat-row-title">재고 자동 차감</div><div class="feat-row-desc">출고 수량 입력 즉시 재고 현황 자동 업데이트. 실시간 재고 정확도 유지</div></div></div><div class="feat-row"><div class="feat-row-ic">🔔</div><div class="feat-row-body"><div class="feat-row-title">최소재고 경고</div><div class="feat-row-desc">출고 후 재고가 최소 기준 이하로 떨어지면 즉시 경고. 품절 사전 방지</div></div></div><div class="feat-row"><div class="feat-row-ic">🗂️</div><div class="feat-row-body"><div class="feat-row-title">출고 사유 기록</div><div class="feat-row-desc">판매/폐기/이동 등 출고 사유 분류 기록. 폐기 현황 분석으로 낭비 절감</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">입출고 통합 원장</div><div class="feat-row-desc">입고·출고 이력을 하나의 원장에서 조회. 재고 흐름 전체 추적 가능</div></div></div></div>';}
  },
  auto_order:{
    ic:'🔔',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'자동 발주',tagline:'최소 재고 도달 시 자동으로 발주 알림 발송',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">⚙️</div><div class="feat-row-body"><div class="feat-row-title">최소재고 기준 설정</div><div class="feat-row-desc">품목별 최소재고 기준 설정. 기준 이하로 떨어지면 자동 감지 후 알림 발송</div></div></div><div class="feat-row"><div class="feat-row-ic">💬</div><div class="feat-row-body"><div class="feat-row-title">카카오 알림톡 발주 알림</div><div class="feat-row-desc">발주 필요 품목, 거래처 정보, 추천 발주 수량이 포함된 알림 자동 발송</div></div></div><div class="feat-row"><div class="feat-row-ic">📋</div><div class="feat-row-body"><div class="feat-row-title">발주 이력 관리</div><div class="feat-row-desc">언제, 어떤 품목을, 얼마나 발주했는지 자동 기록. 발주 패턴 분석 가능</div></div></div><div class="feat-row"><div class="feat-row-ic">🤝</div><div class="feat-row-body"><div class="feat-row-title">거래처 정보 연동</div><div class="feat-row-desc">품목별 담당 거래처 등록. 발주 알림에 거래처 연락처 자동 포함</div></div></div></div>';}
  },
  expiry:{
    ic:'⏰',color:'rgba(239,68,68,.15)',border:'rgba(239,68,68,.3)',
    title:'유통기한 관리',tagline:'D-7 경고로 폐기 손실을 사전에 방지',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">⚠️</div><div class="feat-row-body"><div class="feat-row-title">D-7 자동 경고</div><div class="feat-row-desc">유통기한 7일 전부터 경고 표시. 만료 임박 품목 우선 사용으로 폐기 최소화</div></div></div><div class="feat-row"><div class="feat-row-ic">📅</div><div class="feat-row-body"><div class="feat-row-title">입고 시 유통기한 등록</div><div class="feat-row-desc">입고 등록 시 유통기한 함께 기록. 자동 D-day 계산으로 매일 확인 불필요</div></div></div><div class="feat-row"><div class="feat-row-ic">📊</div><div class="feat-row-body"><div class="feat-row-title">만료 예정 목록</div><div class="feat-row-desc">이번 주 만료 예정 품목 자동 정렬. 메인 대시보드에 경고 카드로 즉시 표시</div></div></div><div class="feat-row"><div class="feat-row-ic">🗑️</div><div class="feat-row-body"><div class="feat-row-title">폐기 처리 기록</div><div class="feat-row-desc">만료 품목 폐기 등록으로 재고 자동 차감. 월별 폐기 손실 금액 자동 집계</div></div></div></div>';}
  },
  recipe:{
    ic:'🍽',color:'rgba(124,58,237,.15)',border:'rgba(124,58,237,.3)',
    title:'레시피·원가 계산',tagline:'메뉴별 원가율과 마진을 자동으로 계산',
    body:function(){return '<div class="feat-list"><div class="feat-row"><div class="feat-row-ic">📝</div><div class="feat-row-body"><div class="feat-row-title">메뉴별 레시피 등록</div><div class="feat-row-desc">메뉴에 들어가는 재료와 사용량 입력. 재료 단가와 자동 연산으로 원가 즉시 계산</div></div></div><div class="feat-row"><div class="feat-row-ic">💹</div><div class="feat-row-body"><div class="feat-row-title">마진율 자동 계산</div><div class="feat-row-desc">(판매가 - 원가) ÷ 판매가 × 100. 메뉴별 마진율 한눈에 비교. 저마진 메뉴 즉시 파악</div></div></div><div class="feat-row"><div class="feat-row-ic">📦</div><div class="feat-row-body"><div class="feat-row-title">재고 소모 연동</div><div class="feat-row-desc">POS 판매 시 레시피 기반으로 재고 자동 차감. 별도 출고 등록 없이 정확한 재고 유지</div></div></div><div class="feat-row"><div class="feat-row-ic">💡</div><div class="feat-row-body"><div class="feat-row-title">판매가 추천</div><div class="feat-row-desc">목표 마진율 입력 시 적정 판매가 자동 제안. 가격 책정에 데이터 근거 제공</div></div></div></div>';}
  }
};

/* ── 모달 열기/닫기 ── */
function _openModal(key){
  var d=MODALS[key];
  if(!d)return;
  var hdr=document.getElementById('modal-header');
  var bdy=document.getElementById('modal-body');
  hdr.innerHTML='<div class="modal-ic-big" style="background:'+d.color+';border:1px solid '+d.border+'">'+d.ic+'</div>'+
    '<div class="modal-title-wrap"><div class="modal-title">'+d.title+'</div><div class="modal-tagline">'+d.tagline+'</div></div>'+
    '<button class="modal-close" onclick="_closeModal()">✕</button>';
  bdy.innerHTML=d.body()+
    '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd);display:flex;gap:10px;flex-wrap:wrap">'+
    '<button class="cta-btn cta-p" style="flex:1;min-width:140px;justify-content:center" onclick="location.href=\'https://filo.ai.kr/app\'">🚀 무료로 시작하기</button>'+
    '<button class="cta-btn cta-g" style="justify-content:center" onclick="_closeModal()">닫기</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-box').scrollTop=0;
}
function _closeModal(e){
  if(e&&e.target!==document.getElementById('modal-overlay'))return;
  document.getElementById('modal-overlay').classList.remove('open');
}
