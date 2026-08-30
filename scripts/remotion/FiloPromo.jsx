const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const NAVY = '#08101f';
const GOLD = '#c9a84c';
const WHITE = '#ffffff';
const BLUE_BG = '#1a3a6e';  // 시프티 스타일 청명한 배경
const TEAL_BG = '#0f3d3a';
const WINE_BG = '#2d1a3a';

// 주간 A/B/C/D 로테이션
var WEEK_VARIANT = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
var VARIANTS = [
  {
    hook: ['QR 찍으면', '주문이 알아서 들어와요'],
    sub: 'QR 테이블 주문 · 주방 자동 전송',
    menus: ['삼겹살 1인분 13,000원', '된장찌개 8,000원', '소주 4,000원', '공기밥 1,000원'],
    posItems: ['테이블 3번', '조리중 · 01:42', '삼겹살 2인분 + 된장찌개'],
    payLabel: '이번달 급여 자동 계산',
    payAmt: '12,340,000원',
    ctaHook: '매장 관리의 시작\nFILO 하나로 끝',
  },
  {
    hook: ['포스기 없어도', '태블릿 하나면 돼요'],
    sub: 'POS · 주방 · QR주문 한 화면에',
    menus: ['아메리카노 4,500원', '카페라떼 5,000원', '크로와상 3,500원', '에이드 5,000원'],
    posItems: ['테이블 1번', '서빙 완료 · 02:18', '카페라떼 2잔 + 크로와상'],
    payLabel: '출퇴근 자동 집계',
    payAmt: '직원 87명 관리 중',
    ctaHook: '설치 없이 지금 바로\n무료로 시작하세요',
  },
  {
    hook: ['직원 근태부터', '급여까지 자동이에요'],
    sub: 'QR 출퇴근 · 4대보험 자동 계산',
    menus: ['홍길동 출근 09:02', '김영희 퇴근 18:05', '박민수 야간 22:00', '이지수 휴무'],
    posItems: ['이번달 총 급여', '자동 계산 완료', '4대보험 공제 적용'],
    payLabel: '직원 월급 한 번에',
    payAmt: '명세서 자동 발송',
    ctaHook: '복잡한 근태관리\nFILO로 끝내세요',
  },
  {
    hook: ['재고가 줄면', '자동으로 알려줘요'],
    sub: 'AI 재고관리 · 발주 자동화 · 마진 분석',
    menus: ['삼겹살 재고 2.3kg ⚠️', '소주 잔여 12병', '공기밥 쌀 1.8kg', '상추 부족 알림'],
    posItems: ['이번달 마진율', '평균 68.4%', 'AI 예측 매출 +12%'],
    payLabel: 'AI 매출 예측 7일',
    payAmt: '재고 자동 발주 설정',
    ctaHook: '놓치는 재고 없이\nFILO가 다 챙겨요',
  },
];
var V = VARIANTS[WEEK_VARIANT];

function fadeIn(frame, start, dur) {
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
function slideUp(frame, start, dur, dist) {
  var d = dist === undefined ? 50 : dist;
  return interpolate(frame, [start, start + dur], [d, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

var BASE = {
  fontFamily: "'Noto Sans CJK KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
  width: '100%', height: '100%', overflow: 'hidden',
};

// ── 폰 목업 컴포넌트 (시프티 스타일 — 크고 선명하게) ─────────
function PhoneMockup(props) {
  var frame = props.frame;
  var delay = props.delay || 0;
  var width = props.width || 280;
  var height = props.height || 520;
  var children = props.children;
  var sc = interpolate(frame, [delay, delay + 22], [0.82, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) });
  var op = fadeIn(frame, delay, 18);
  return React.createElement('div', {
    style: {
      width: width, height: height,
      background: 'linear-gradient(160deg, #1e2d4a, #0f1828)',
      borderRadius: 38,
      border: '2.5px solid ' + GOLD + '55',
      overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px ' + GOLD + '22, inset 0 0 0 1px rgba(255,255,255,0.05)',
      transform: 'scale(' + sc + ')',
      opacity: op,
      position: 'relative',
    },
  }, children);
}

// ── Scene 1: 브랜드 인트로 ──────────────────────────────────
function SceneIntro() {
  var frame = useCurrentFrame();
  var logoSc = interpolate(frame, [0, 38], [0.72, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.7)) });

  var tags = ['QR 테이블 주문', 'POS', '직원 근태', '급여 자동계산', '재고관리', 'AI 매출예측'];

  return React.createElement(AbsoluteFill, { style: { ...BASE, background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
    // 배경 그라데이션 원
    React.createElement('div', { style: { position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '14 0%, transparent 70%)', pointerEvents: 'none' } }),

    // FILO 로고 — frame 0부터 즉시 노출
    React.createElement('div', { style: { transform: 'scale(' + logoSc + ')', textAlign: 'center', marginBottom: 44 } },
      React.createElement('div', { style: { fontSize: 108, fontWeight: 900, color: GOLD, letterSpacing: -3, textShadow: '0 0 80px ' + GOLD + '44' } }, 'FILO'),
      React.createElement('div', { style: { fontSize: 18, color: GOLD + '88', letterSpacing: 8, marginTop: -12, fontWeight: 300 } }, '매장 올인원 플랫폼'),
    ),

    // 주간 variant 헤드라인
    React.createElement('div', { style: { textAlign: 'center', marginBottom: 44, opacity: fadeIn(frame, 18, 18), transform: 'translateY(' + slideUp(frame, 18, 18) + 'px)' } },
      React.createElement('div', { style: { fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.25 } }, V.hook[0]),
      React.createElement('div', { style: { fontSize: 44, fontWeight: 900, color: GOLD, lineHeight: 1.25 } }, V.hook[1]),
    ),

    // 기능 태그 줄
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 800, opacity: fadeIn(frame, 38, 20), transform: 'translateY(' + slideUp(frame, 38, 20) + 'px)' } },
      tags.map(function(tag, i) {
        return React.createElement('div', { key: tag, style: { background: GOLD + '1a', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 18px', color: GOLD, fontSize: 16, fontWeight: 600 } }, tag);
      }),
    ),
  );
}

// ── Scene 2: QR 테이블 주문 ────────────────────────────────
function SceneQR() {
  var frame = useCurrentFrame();

  var orderNum = 241 + Math.round(interpolate(frame, [60, 110], [0, 6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var ripSc = interpolate(frame, [80, 120], [0.5, 2.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var ripOp = interpolate(frame, [80, 120], [0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return React.createElement(AbsoluteFill, { style: { ...BASE, background: BLUE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    // 배경 글로우
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.06) 0%, transparent 65%)' } }),

    // 상단 기능 태그
    React.createElement('div', { style: { position: 'absolute', top: 72, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) } },
      React.createElement('span', { style: { color: WHITE, fontSize: 15, fontWeight: 700, letterSpacing: 2 } }, 'FEATURE 01 · QR 테이블 주문'),
    ),

    // 폰 목업 — 크게 중앙 배치
    React.createElement('div', { style: { position: 'absolute', top: 140, bottom: 310, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' } },
      React.createElement(PhoneMockup, { frame: frame, delay: 8, width: 270, height: 490 },
        // 상단 바
        React.createElement('div', { style: { background: 'linear-gradient(135deg, ' + GOLD + 'ee, #deb95a)', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' } },
          React.createElement('span', { style: { color: NAVY, fontSize: 13, fontWeight: 900 } }, 'FILO 테이블 주문'),
          React.createElement('span', { style: { background: NAVY, color: GOLD, borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 } }, '#' + orderNum),
        ),
        // 테이블 정보
        React.createElement('div', { style: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' } },
          React.createElement('div', { style: { color: WHITE + '77', fontSize: 11, marginBottom: 4 } }, '3번 테이블'),
          React.createElement('div', { style: { color: GOLD, fontSize: 13, fontWeight: 700 } }, '주문 진행중'),
        ),
        // 메뉴 리스트
        V.menus.map(function(item, i) {
          var parts = item.split(' ');
          var price = parts.pop();
          var name = parts.join(' ');
          return React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: fadeIn(frame, 18 + i * 8, 14) } },
            React.createElement('span', { style: { color: WHITE, fontSize: 13, fontWeight: 500 } }, name),
            React.createElement('span', { style: { color: GOLD, fontSize: 12, fontWeight: 700 } }, price),
          );
        }),
        // 주문 버튼
        React.createElement('div', { style: { position: 'relative', margin: '12px 14px' } },
          React.createElement('div', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(' + ripSc + ')', width: '100%', height: 44, borderRadius: 12, border: '2px solid ' + GOLD, opacity: ripOp } }),
          React.createElement('div', { style: { background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 12, padding: '14px 0', textAlign: 'center', fontSize: 15, fontWeight: 900, color: NAVY, opacity: fadeIn(frame, 50, 14) } }, '주문하기'),
        ),
      ),
    ),

    // 하단 텍스트 블록
    React.createElement('div', { style: { position: 'absolute', bottom: 80, left: 0, right: 0, textAlign: 'center', opacity: fadeIn(frame, 24, 22), transform: 'translateY(' + slideUp(frame, 24, 22) + 'px)' } },
      React.createElement('div', { style: { fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.2, marginBottom: 16 } }, V.hook[0].replace('\n', ' ')),
      React.createElement('div', { style: { fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1.2, textShadow: '0 0 30px ' + GOLD + '66', marginBottom: 20 } }, V.hook[1].replace('\n', ' ')),
      React.createElement('div', { style: { fontSize: 20, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 } }, V.sub),
    ),
  );
}

// ── Scene 3: POS + 주방 연동 ──────────────────────────────
function ScenePOS() {
  var frame = useCurrentFrame();
  var notifX = interpolate(frame, [75, 95], [350, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var notifOp = fadeIn(frame, 75, 12);

  return React.createElement(AbsoluteFill, { style: { ...BASE, background: TEAL_BG, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.05) 0%, transparent 65%)' } }),

    // 상단 태그
    React.createElement('div', { style: { position: 'absolute', top: 72, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) } },
      React.createElement('span', { style: { color: WHITE, fontSize: 15, fontWeight: 700, letterSpacing: 2 } }, 'FEATURE 02 · POS 주방 연동'),
    ),

    // 폰 목업 2개 나란히 (POS + 주방)
    React.createElement('div', { style: { position: 'absolute', top: 140, bottom: 310, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, width: '100%' } },
      // POS 목업
      React.createElement(PhoneMockup, { frame: frame, delay: 8, width: 225, height: 410 },
        React.createElement('div', { style: { background: 'linear-gradient(135deg, ' + GOLD + 'cc, #deb95a)', height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between' } },
          React.createElement('span', { style: { color: NAVY, fontSize: 12, fontWeight: 900 } }, 'POS 계산대'),
          React.createElement('span', { style: { color: NAVY, fontSize: 10 } }, '테이블 3'),
        ),
        V.posItems.map(function(item, i) {
          return React.createElement('div', { key: i, style: { padding: '14px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', opacity: fadeIn(frame, 20 + i * 8, 14) } },
            React.createElement('div', { style: { color: i === 0 ? GOLD : WHITE, fontSize: i === 0 ? 14 : 12, fontWeight: i === 0 ? 800 : 500 } }, item),
          );
        }),
        React.createElement('div', { style: { margin: '14px 12px', background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 10, padding: '13px 0', textAlign: 'center', fontSize: 15, fontWeight: 900, color: NAVY, opacity: fadeIn(frame, 44, 14) } }, '결제 처리'),
      ),

      // 주방 목업
      React.createElement(PhoneMockup, { frame: frame, delay: 18, width: 225, height: 410 },
        React.createElement('div', { style: { background: '#0f2810', height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', borderBottom: '1px solid #44aa4422' } },
          React.createElement('span', { style: { color: '#66cc66', fontSize: 12, fontWeight: 900 } }, '주방 디스플레이'),
          React.createElement('span', { style: { background: '#66cc6620', color: '#66cc66', borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 800 } }, 'LIVE'),
        ),
        [
          { order: '3번 테이블', time: '01:42', status: '조리중', hot: true },
          { order: '1번 테이블', time: '03:20', status: '서빙완료', hot: false },
          { order: '5번 테이블', time: '00:15', status: '접수', hot: false },
        ].map(function(item, i) {
          return React.createElement('div', { key: i, style: { margin: '8px 10px', background: i === 0 ? '#1e3a1e' : '#131c13', borderRadius: 12, padding: '12px 12px', border: '1px solid ' + (i === 0 ? '#44cc4444' : '#2a362a'), opacity: fadeIn(frame, 30 + i * 10, 14) } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
              React.createElement('span', { style: { color: WHITE, fontSize: 13, fontWeight: 700 } }, item.order),
              item.hot && React.createElement('span', { style: { background: '#cc3333', borderRadius: 5, padding: '2px 6px', fontSize: 9, color: WHITE, fontWeight: 800 } }, '급'),
            ),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              React.createElement('span', { style: { color: '#88aa88', fontSize: 11 } }, item.time),
              React.createElement('span', { style: { color: item.hot ? '#66cc66' : '#667766', fontSize: 11, fontWeight: 600 } }, item.status),
            ),
          );
        }),
      ),
    ),

    // 새 주문 알림 팝업
    React.createElement('div', { style: { position: 'absolute', top: 148, right: 28, transform: 'translateX(' + notifX + 'px)', opacity: notifOp, background: 'rgba(201,168,76,0.15)', border: '1px solid ' + GOLD + '66', borderRadius: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px ' + GOLD + '22' } },
      React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: '0 0 10px ' + GOLD } }),
      React.createElement('span', { style: { color: GOLD, fontSize: 13, fontWeight: 700 } }, '새 주문 — 3번 테이블'),
    ),

    // 하단 텍스트
    React.createElement('div', { style: { position: 'absolute', bottom: 80, left: 0, right: 0, textAlign: 'center', opacity: fadeIn(frame, 24, 22), transform: 'translateY(' + slideUp(frame, 24, 22) + 'px)' } },
      React.createElement('div', { style: { fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.2, marginBottom: 16 } }, 'POS · 주방'),
      React.createElement('div', { style: { fontSize: 52, fontWeight: 900, color: '#66cc66', lineHeight: 1.2, marginBottom: 20 } }, '실시간 연동'),
      React.createElement('div', { style: { fontSize: 20, color: 'rgba(255,255,255,0.65)' } }, '주문 즉시 주방 전송 · 대기 없이 빠른 서비스'),
    ),
  );
}

// ── Scene 4: 급여 · 재고 ───────────────────────────────────
function ScenePayroll() {
  var frame = useCurrentFrame();
  var cards = [
    { icon: '👤', title: 'QR 출퇴근', desc: 'QR 스캔 한 번으로\n출퇴근 자동 기록', accent: GOLD },
    { icon: '💰', title: '급여 자동계산', desc: '4대보험 공제까지\n자동으로 처리', accent: '#44cc44' },
    { icon: '📦', title: '재고 관리', desc: '소모품 추적·발주\n알림 자동화', accent: '#4488ff' },
    { icon: '📊', title: 'AI 매출예측', desc: '7일 예측·마진분석\nAI가 추천', accent: '#ff7744' },
  ];

  return React.createElement(AbsoluteFill, { style: { ...BASE, background: WINE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 65%)' } }),

    // 상단 태그
    React.createElement('div', { style: { position: 'absolute', top: 72, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) } },
      React.createElement('span', { style: { color: WHITE, fontSize: 15, fontWeight: 700, letterSpacing: 2 } }, 'FEATURE 03 · 04 · 직원 · 재고'),
    ),

    // 중간: 스탯 카드 + 기능 그리드
    React.createElement('div', { style: { position: 'absolute', top: 145, bottom: 260, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 40px' } },
      // 스탯 두 개
      React.createElement('div', { style: { display: 'flex', gap: 16, width: '100%', opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 18) + 'px)' } },
        React.createElement('div', { style: { flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 18, border: '1px solid ' + GOLD + '33', padding: '20px 22px' } },
          React.createElement('div', { style: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, letterSpacing: 1 } }, '등록 직원'),
          React.createElement('div', { style: { color: WHITE, fontSize: 36, fontWeight: 900 } }, '87명'),
        ),
        React.createElement('div', { style: { flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 18, border: '1px solid ' + GOLD + '33', padding: '20px 22px' } },
          React.createElement('div', { style: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, letterSpacing: 1 } }, V.payLabel),
          React.createElement('div', { style: { color: GOLD, fontSize: 22, fontWeight: 900, lineHeight: 1.3 } }, V.payAmt),
        ),
      ),

      // 기능 카드 2×2
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%', opacity: fadeIn(frame, 28, 20) } },
        cards.map(function(card, i) {
          return React.createElement('div', { key: card.title, style: { background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: '22px 18px', border: '1px solid ' + card.accent + '33', opacity: fadeIn(frame, 34 + i * 8, 16), transform: 'translateY(' + slideUp(frame, 34 + i * 8, 16) + 'px)' } },
            React.createElement('div', { style: { fontSize: 28, marginBottom: 10 } }, card.icon),
            React.createElement('div', { style: { color: WHITE, fontSize: 15, fontWeight: 800, marginBottom: 6 } }, card.title),
            React.createElement('div', { style: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-line' } }, card.desc),
          );
        }),
      ),
    ),

    // 하단 텍스트
    React.createElement('div', { style: { position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', opacity: fadeIn(frame, 50, 20), transform: 'translateY(' + slideUp(frame, 50, 20) + 'px)' } },
      React.createElement('div', { style: { fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.25 } }, '직원·급여·재고'),
      React.createElement('div', { style: { fontSize: 46, fontWeight: 900, color: GOLD, lineHeight: 1.25, textShadow: '0 0 28px ' + GOLD + '55' } }, '전부 FILO 하나에'),
    ),
  );
}

// ── Scene 5: CTA ──────────────────────────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 30], [0.72, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });
  var url = 'filo.ai.kr';
  var charsVisible = Math.round(interpolate(frame, [42, 80], [0, url.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [24, 64, 24], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return React.createElement(AbsoluteFill, { style: { ...BASE, background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
    React.createElement('div', { style: { position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '14 0%, transparent 70%)' } }),

    // 펄스 링
    ...[0, 0.33, 0.66].map(function(off, i) {
      var f = (frame + Math.round(off * 120)) % 120;
      var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
      var o = interpolate(f, [0, 120], [0.35, 0], { extrapolateRight: 'clamp' });
      return React.createElement('div', { key: i, style: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1.5px solid ' + GOLD, transform: 'scale(' + s + ')', opacity: o } });
    }),

    React.createElement('div', { style: { transform: 'scale(' + sc + ')', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 } },
      // FILO 로고
      React.createElement('div', { style: { fontSize: 100, fontWeight: 900, color: GOLD, letterSpacing: -2, textShadow: '0 0 60px ' + GOLD + '88, 0 0 120px ' + GOLD + '22', marginBottom: 12 } }, 'FILO'),

      // variant CTA hook
      React.createElement('div', { style: { fontSize: 28, color: WHITE, fontWeight: 700, marginBottom: 36, opacity: fadeIn(frame, 18, 18), textAlign: 'center', lineHeight: 1.4, whiteSpace: 'pre-line' } }, V.ctaHook),

      // URL 버튼
      React.createElement('div', { style: { background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 24, padding: '22px 80px', fontSize: 28, fontWeight: 900, color: NAVY, opacity: fadeIn(frame, 28, 18), boxShadow: '0 10px 48px ' + GOLD + '66, 0 0 90px ' + GOLD + glowHex, letterSpacing: 0.5, minWidth: 260, textAlign: 'center', marginBottom: 20 } },
        url.slice(0, charsVisible),
        charsVisible < url.length ? React.createElement('span', { style: { opacity: 0.4 } }, '|') : null,
      ),

      // 기능 태그 3개
      React.createElement('div', { style: { display: 'flex', gap: 12, opacity: fadeIn(frame, 55, 18), marginTop: 8 } },
        ['QR 주문', 'POS 연동', '급여 자동화'].map(function(tag) {
          return React.createElement('div', { key: tag, style: { background: GOLD + '1a', border: '1px solid ' + GOLD + '44', borderRadius: 16, padding: '8px 16px', color: GOLD, fontSize: 14, fontWeight: 600 } }, tag);
        }),
      ),

      React.createElement('div', { style: { marginTop: 22, fontSize: 15, color: 'rgba(255,255,255,0.35)', opacity: fadeIn(frame, 65, 18), letterSpacing: 2 } }, '설치 없이 바로 시작 · 완전 무료'),
    ),

    React.createElement('div', { style: { position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 70, 18), color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: 5, fontWeight: 300 } }, 'POWERED BY MBTICO'),
  );
}

// ── 자막 바 ──────────────────────────────────────────────
var SUBTITLES_DATA = [
  { from: 0,   to: 90,  text: V.hook[0] + ' ' + V.hook[1] },
  { from: 90,  to: 150, text: 'FILO 하나로 시작하세요' },
  { from: 150, to: 270, text: 'QR 찍으면 주문이 들어와요' },
  { from: 270, to: 360, text: '직원 없이도 매장이 돌아가요' },
  { from: 360, to: 480, text: '주방에도 실시간 전송돼요' },
  { from: 480, to: 570, text: 'POS · 주방 완벽 연동' },
  { from: 570, to: 690, text: '출퇴근·급여·재고까지' },
  { from: 690, to: 780, text: '전부 FILO 하나에 다 있어요' },
  { from: 780, to: 900, text: '지금 무료로 써보세요 · filo.ai.kr' },
];

function SubtitleBar() {
  var frame = useCurrentFrame();
  var current = null;
  for (var i = 0; i < SUBTITLES_DATA.length; i++) {
    if (frame >= SUBTITLES_DATA[i].from && frame < SUBTITLES_DATA[i].to) { current = SUBTITLES_DATA[i]; break; }
  }
  if (!current) return null;
  var localFrame = frame - current.from;
  var dur = current.to - current.from;
  var op = interpolate(localFrame, [0, 6, dur - 6, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement('div', {
    style: { position: 'absolute', bottom: 128, left: 0, right: 0, textAlign: 'center', padding: '0 28px', opacity: op, pointerEvents: 'none', zIndex: 100 },
  }, React.createElement('div', {
    style: { display: 'inline-block', padding: '0 20px', fontSize: 36, fontWeight: 900, color: '#FFE600', lineHeight: 1.4, textShadow: '-3px -3px 0 #000,-3px 3px 0 #000,3px -3px 0 #000,3px 3px 0 #000,0 0 12px rgba(0,0,0,0.8)', fontFamily: BASE.fontFamily },
  }, current.text));
}

// ── 씬 전환 ──────────────────────────────────────────────
function TransitionOverlay(props) {
  var frame = useCurrentFrame();
  var durationInFrames = useVideoConfig().durationInFrames;
  var end = props.totalFrames || durationInFrames;
  var progress = props.direction === 'out'
    ? interpolate(frame, [end - 15, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement(AbsoluteFill, { style: { background: NAVY, opacity: progress, pointerEvents: 'none' } });
}

// ── 메인 ─────────────────────────────────────────────────
function FiloPromo(props) {
  var hasNarration = props.hasNarration;
  var hasBgm = props.hasBgm;
  var SCENES = [
    { component: SceneIntro,   start: 0,   duration: 150 },
    { component: SceneQR,      start: 150, duration: 210 },
    { component: ScenePOS,     start: 360, duration: 210 },
    { component: ScenePayroll, start: 570, duration: 210 },
    { component: SceneCTA,     start: 780, duration: 120 },
  ];
  return React.createElement(AbsoluteFill, { style: { background: NAVY } },
    hasNarration && React.createElement(Audio, { src: staticFile('filo-narration.mp3'), volume: 1 }),
    hasBgm && React.createElement(Audio, { src: staticFile('bgm.mp3'), volume: 0.12 }),
    SCENES.map(function(scene, idx) {
      var Comp = scene.component;
      return React.createElement(Sequence, { key: scene.start, from: scene.start, durationInFrames: scene.duration },
        React.createElement(Comp),
        React.createElement(TransitionOverlay, { direction: 'in', totalFrames: scene.duration }),
        idx < SCENES.length - 1 && React.createElement(TransitionOverlay, { direction: 'out', totalFrames: scene.duration }),
      );
    }),
    React.createElement(SubtitleBar),
  );
}

module.exports = { FiloPromo };
