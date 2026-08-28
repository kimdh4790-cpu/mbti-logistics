const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const NAVY = '#08101f';
const GOLD = '#c9a84c';
const WHITE = '#ffffff';

function fadeIn(frame, start, dur) {
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function slideUp(frame, start, dur, dist) {
  var d = dist === undefined ? 40 : dist;
  return interpolate(frame, [start, start + dur], [d, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

var BASE = {
  fontFamily: "'Noto Sans CJK KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
  width: '100%', height: '100%', overflow: 'hidden',
};

// 파티클 배경 — 황금색 작은 점들이 천천히 위로 흐름
function Particles(props) {
  var count = props.count || 14;
  var frame = useCurrentFrame();
  var items = [];
  for (var i = 0; i < count; i++) {
    var x = (i * 37 + 13) % 100;
    var baseY = (i * 71 + 29) % 100;
    var size = 1.5 + (i % 3);
    var speed = 0.008 + (i % 5) * 0.003;
    var y = (baseY + frame * speed * 10) % 108 - 4;
    var opacity = 0.06 + (i % 3) * 0.04;
    items.push(React.createElement('div', {
      key: i,
      style: { position: 'absolute', left: x + '%', top: y + '%', width: size, height: size, borderRadius: '50%', background: GOLD, opacity: opacity },
    }));
  }
  return React.createElement(AbsoluteFill, { style: { pointerEvents: 'none' } }, items);
}

// 숫자 카운터 애니메이션
function AnimatedCounter(props) {
  var frame = useCurrentFrame();
  var val = Math.round(interpolate(frame, [props.startFrame || 0, (props.startFrame || 0) + 50], [props.from || 0, props.to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }));
  return React.createElement(React.Fragment, null, val.toLocaleString() + (props.suffix || ''));
}

// ── Scene 1: 브랜드 인트로 (0–5s = 0–149f) ────────────────
function SceneIntro() {
  var frame = useCurrentFrame();

  var scanY = interpolate(frame, [0, 80], [-2, 102], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var scanOp = interpolate(frame, [0, 4, 75, 80], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  var logoSc = interpolate(frame, [14, 54], [0.42, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.9)) });
  var logoOp = fadeIn(frame, 14, 18);
  var glow = interpolate(frame, [44, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  var textY = slideUp(frame, 58, 22);
  var textOp = fadeIn(frame, 58, 22);
  var subY = slideUp(frame, 76, 20);
  var subOp = fadeIn(frame, 76, 20);

  var ringSc = interpolate(frame, [24, 100], [0.15, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  var ringOp = interpolate(frame, [24, 100], [0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  var lineW = interpolate(frame, [86, 138], [0, 234], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, 0, 14) }}>
      <Particles count={13} />

      {/* 스캔라인 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: scanY + '%', height: 2, background: 'linear-gradient(90deg, transparent, ' + GOLD + '77, ' + GOLD + ', ' + GOLD + '77, transparent)', opacity: scanOp, boxShadow: '0 0 18px ' + GOLD + '55' }} />

      {/* 배경 그라디언트 */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 390, height: 390, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '18 0%, transparent 70%)' }} />

      {/* 확장 링 */}
      <div style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -62%) scale(' + ringSc + ')', width: 175, height: 175, borderRadius: '50%', border: '1px solid ' + GOLD, opacity: ringOp }} />

      {/* FILO 로고 */}
      <div style={{ transform: 'scale(' + logoSc + ')', opacity: logoOp, marginBottom: 54, textAlign: 'center' }}>
        <div style={{ fontSize: 106, fontWeight: 900, color: GOLD, letterSpacing: -3, textShadow: '0 0 ' + Math.round(60 * glow) + 'px ' + GOLD + '88, 0 0 ' + Math.round(140 * glow) + 'px ' + GOLD + '22' }}>FILO</div>
        <div style={{ fontSize: 19, color: GOLD + '99', letterSpacing: 10, marginTop: -14, fontWeight: 300 }}>매장 올인원 플랫폼</div>
      </div>

      {/* 메인 카피 */}
      <div style={{ transform: 'translateY(' + textY + 'px)', opacity: textOp, textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>매장 운영이</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: GOLD, lineHeight: 1.2, textShadow: '0 0 26px ' + GOLD + '44' }}>이렇게 쉬워진다</div>
      </div>

      {/* 서브 카피 */}
      <div style={{ transform: 'translateY(' + subY + 'px)', opacity: subOp, marginTop: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: WHITE + '77', letterSpacing: 2 }}>QR주문 · POS · 급여 · 재고관리</div>
      </div>

      {/* 하단 금선 */}
      <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', width: lineW, height: 1, background: 'linear-gradient(90deg, transparent, ' + GOLD + '99, transparent)' }} />
    </AbsoluteFill>
  );
}

// ── Scene 2: QR 테이블 주문 (5–12s = 150–359f) ────────────
function SceneQR() {
  var frame = useCurrentFrame();
  var cardOp = fadeIn(frame, 0, 20);
  var cardY = slideUp(frame, 0, 25);

  var steps = ['QR 스캔', '메뉴 선택', '주문 완료', '주방 전송'];
  var orderNum = 241 + Math.round(interpolate(frame, [65, 115], [0, 6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  var ripSc = interpolate(frame, [85, 125], [0.5, 2.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var ripOp = interpolate(frame, [85, 125], [0.65, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  var menus = ['삼겹살 1인분', '된장찌개', '공기밥', '소맥'];
  var prices = ['13,000', '8,000', '1,000', '6,000'];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#0d1829', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={9} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, ' + GOLD + '12 0%, transparent 60%)' }} />

      {/* 태그 */}
      <div style={{ position: 'absolute', top: 80, background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 01</span>
      </div>

      {/* 스마트폰 목업 */}
      <div style={{ position: 'absolute', top: 118, right: 36, width: 193, height: 348, background: 'linear-gradient(160deg, #1e2d4a, #0f1a30)', borderRadius: 30, border: '1.5px solid ' + GOLD + '44', overflow: 'hidden', opacity: fadeIn(frame, 10, 18), transform: 'translateY(' + slideUp(frame, 10, 25) + 'px)', boxShadow: '0 30px 72px #000000aa, 0 0 54px ' + GOLD + '0c' }}>
        {/* 상단 바 */}
        <div style={{ background: 'linear-gradient(135deg, ' + GOLD + 'ee, #deb95a)', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: NAVY, fontSize: 11, fontWeight: 800 }}>FILO 테이블 주문</span>
          <span style={{ background: NAVY, color: GOLD, borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 800 }}>#{orderNum}</span>
        </div>
        {/* 메뉴 리스트 */}
        {menus.map(function(m, i) {
          return (
            <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: '1px solid #ffffff0c', opacity: fadeIn(frame, 18 + i * 8, 12) }}>
              <span style={{ color: WHITE, fontSize: 12, fontWeight: 500 }}>{m}</span>
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 600 }}>{prices[i]}원</span>
            </div>
          );
        })}
        {/* 탭 리플 + 버튼 */}
        <div style={{ position: 'relative', margin: '10px 12px' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(' + ripSc + ')', width: 80, height: 36, borderRadius: 10, border: '2px solid ' + GOLD, opacity: ripOp }} />
          <div style={{ background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 10, padding: '12px 0', textAlign: 'center', fontSize: 14, fontWeight: 800, color: NAVY, opacity: fadeIn(frame, 50, 14), boxShadow: '0 4px 20px ' + GOLD + '33' }}>주문하기</div>
        </div>
      </div>

      {/* 왼쪽 텍스트 */}
      <div style={{ position: 'absolute', left: 44, top: '30%', transform: 'translateY(' + cardY + 'px)', opacity: cardOp }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: WHITE, lineHeight: 1.15, marginBottom: 18 }}>QR<br/>테이블 주문</div>
        <div style={{ fontSize: 17, color: WHITE + '66', marginBottom: 32, lineHeight: 1.75 }}>고객이 직접 주문<br/>직원 없이도 OK</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {steps.map(function(step, i) {
            var active = i < 3;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: fadeIn(frame, 32 + i * 14, 14), transform: 'translateX(' + interpolate(frame, [32 + i * 14, 46 + i * 14], [-26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: active ? GOLD : GOLD + '22', border: active ? 'none' : '1px solid ' + GOLD + '55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: active ? NAVY : GOLD, boxShadow: active ? '0 0 14px ' + GOLD + '44' : 'none' }}>{i + 1}</div>
                <span style={{ color: active ? WHITE : WHITE + '55', fontSize: 16, fontWeight: active ? 600 : 400 }}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: POS + 주방 연동 (12–19s = 360–569f) ──────────
function ScenePOS() {
  var frame = useCurrentFrame();

  var notifX = interpolate(frame, [80, 100], [290, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var notifOp = fadeIn(frame, 80, 12);

  var posItems = [
    { n: '삼겹살 2인분', p: '26,000' },
    { n: '된장찌개 2', p: '16,000' },
    { n: '소맥 3병', p: '18,000' },
  ];
  var kitchenItems = [
    { order: '3번 테이블', time: '01:42', status: '조리중', hot: true },
    { order: '5번 테이블', time: '04:15', status: '대기', hot: false },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#0a1520', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={8} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 70%, ' + GOLD + '10 0%, transparent 60%)' }} />

      {/* 태그 */}
      <div style={{ position: 'absolute', top: 80, background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 02</span>
      </div>

      {/* 새 주문 알림 */}
      <div style={{ position: 'absolute', top: 132, right: 26, transform: 'translateX(' + notifX + 'px)', opacity: notifOp, background: 'linear-gradient(135deg, ' + GOLD + '1e, ' + GOLD + '0c)', border: '1px solid ' + GOLD + '55', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10, boxShadow: '0 4px 22px ' + GOLD + '22' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px ' + GOLD }} />
        <span style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>새 주문 — 3번 테이블</span>
      </div>

      {/* POS 목업 */}
      <div style={{ position: 'absolute', top: 180, left: 32, width: 214, height: 272, background: 'linear-gradient(160deg, #1e2d45, #121e30)', borderRadius: 18, border: '1px solid ' + GOLD + '33', overflow: 'hidden', opacity: fadeIn(frame, 10, 20), transform: 'translateY(' + slideUp(frame, 10, 25) + 'px)', boxShadow: '0 26px 64px #000000aa, 0 0 36px ' + GOLD + '08' }}>
        <div style={{ background: '#172035', padding: '11px 14px', borderBottom: '1px solid ' + GOLD + '1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>POS 계산대</span>
          <span style={{ color: WHITE + '55', fontSize: 10 }}>테이블 3</span>
        </div>
        {posItems.map(function(item, i) {
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid #ffffff07', opacity: fadeIn(frame, 22 + i * 8, 12) }}>
              <span style={{ color: WHITE + 'bb', fontSize: 11 }}>{item.n}</span>
              <span style={{ color: WHITE, fontSize: 11, fontWeight: 600 }}>{item.p}원</span>
            </div>
          );
        })}
        <div style={{ margin: '10px 10px 0', background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 10, padding: '11px 0', textAlign: 'center', fontSize: 14, fontWeight: 800, color: NAVY, opacity: fadeIn(frame, 42, 14), boxShadow: '0 4px 18px ' + GOLD + '33' }}>결제 60,000원</div>
      </div>

      {/* 연결 화살표 */}
      <div style={{ position: 'absolute', top: '46%', left: '57%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 36, 14), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>실시간</div>
        <div style={{ color: GOLD, fontSize: 28, lineHeight: 1 }}>→</div>
      </div>

      {/* 주방 목업 */}
      <div style={{ position: 'absolute', top: 200, right: 22, width: 172, height: 234, background: 'linear-gradient(160deg, #162016, #0c150c)', borderRadius: 18, border: '1px solid #44aa4433', overflow: 'hidden', opacity: fadeIn(frame, 30, 20), transform: 'translateY(' + slideUp(frame, 30, 25) + 'px)', boxShadow: '0 26px 64px #000000bb' }}>
        <div style={{ background: '#0f1f0f', padding: '10px 12px', borderBottom: '1px solid #44aa4418', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#66cc66', fontSize: 11, fontWeight: 700 }}>주방 디스플레이</span>
          <span style={{ background: '#66cc6620', color: '#66cc66', borderRadius: 5, padding: '1px 5px', fontSize: 8, fontWeight: 800 }}>LIVE</span>
        </div>
        {kitchenItems.map(function(item, i) {
          return (
            <div key={i} style={{ margin: '8px 8px', background: i === 0 ? '#1e3a1e' : '#141e14', borderRadius: 10, padding: '10px 10px', border: '1px solid ' + (i === 0 ? '#44cc4444' : '#2a362a'), opacity: fadeIn(frame, 42 + i * 10, 14) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: WHITE, fontSize: 11, fontWeight: 600 }}>{item.order}</span>
                {item.hot && <span style={{ background: '#cc3333', borderRadius: 4, padding: '1px 4px', fontSize: 7, color: WHITE, fontWeight: 800 }}>급</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ color: '#88aa88', fontSize: 9 }}>{item.time}</span>
                <span style={{ color: item.hot ? '#66cc66' : '#667766', fontSize: 9, fontWeight: 600 }}>{item.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 텍스트 블록 */}
      <div style={{ position: 'absolute', bottom: 138, left: 44, right: 44, opacity: fadeIn(frame, 26, 20), transform: 'translateY(' + slideUp(frame, 26, 25) + 'px)' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, marginBottom: 14 }}>
          POS · 주방<br /><span style={{ color: GOLD, textShadow: '0 0 22px ' + GOLD + '44' }}>실시간 연동</span>
        </div>
        <div style={{ fontSize: 17, color: WHITE + '66', lineHeight: 1.75 }}>주문 즉시 주방 전송<br />대기 없이 빠른 서비스</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 급여 + 재고 (19–26s = 570–779f) ──────────────
function ScenePayroll() {
  var frame = useCurrentFrame();

  var cards = [
    { icon: '급', title: '급여 자동 계산', desc: '출퇴근 QR → 급여 집계', accent: '#44cc44' },
    { icon: '재', title: '재고 관리', desc: '소모품 추적·발주 알림', accent: '#4488ff' },
    { icon: '마', title: '마진 분석', desc: 'AI 매출예측 7일', accent: '#ff7744' },
    { icon: '직', title: '직원 관리', desc: 'QR 출퇴근·스케줄', accent: GOLD },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#0c1520', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={12} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, ' + GOLD + '0e 0%, transparent 65%)' }} />

      {/* 태그 */}
      <div style={{ position: 'absolute', top: 80, background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 03 · 04</span>
      </div>

      {/* 애니메이션 스탯 */}
      <div style={{ position: 'absolute', top: 148, left: 40, right: 40, opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 18) + 'px)', display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, background: '#141e2c', borderRadius: 14, border: '1px solid ' + GOLD + '22', padding: '16px 18px' }}>
          <div style={{ color: WHITE + '55', fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>등록 직원</div>
          <div style={{ color: WHITE, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
            <AnimatedCounter from={0} to={87} startFrame={18} suffix="명" />
          </div>
        </div>
        <div style={{ flex: 1, background: '#141e2c', borderRadius: 14, border: '1px solid ' + GOLD + '22', padding: '16px 18px' }}>
          <div style={{ color: WHITE + '55', fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>이번달 급여</div>
          <div style={{ color: GOLD, fontSize: 17, fontWeight: 900, lineHeight: 1 }}>
            <AnimatedCounter from={0} to={12340000} startFrame={18} suffix="원" />
          </div>
        </div>
      </div>

      {/* 기능 카드 */}
      <div style={{ position: 'absolute', top: 306, left: 40, right: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {cards.map(function(card, i) {
          return (
            <div key={card.title} style={{ background: '#111a24', borderRadius: 16, padding: '18px 14px', border: '1px solid ' + card.accent + '1e', opacity: fadeIn(frame, 30 + i * 10, 18), transform: 'translateY(' + slideUp(frame, 30 + i * 10, 18) + 'px)', boxShadow: '0 0 20px ' + card.accent + '0a' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: card.accent + '18', border: '1px solid ' + card.accent + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 15, fontWeight: 800, color: card.accent }}>{card.icon}</div>
              <div style={{ color: WHITE, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{card.title}</div>
              <div style={{ color: WHITE + '44', fontSize: 11, lineHeight: 1.45 }}>{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* AI 배지 */}
      <div style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', background: GOLD + '18', border: '1px solid ' + GOLD + '55', borderRadius: 24, padding: '10px 30px', opacity: fadeIn(frame, 72, 20), boxShadow: '0 0 28px ' + GOLD + '1e', whiteSpace: 'nowrap' }}>
        <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>AI 매출 예측 포함</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA (26–30s = 780–899f) ──────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();

  var sc = interpolate(frame, [0, 32], [0.68, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });

  var url = 'filo.ai.kr';
  var charsVisible = Math.round(interpolate(frame, [44, 82], [0, url.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // 버튼 글로우 펄스
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [18, 55, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={18} />

      {/* 펄스 링 3개 */}
      {[0, 0.34, 0.67].map(function(off, i) {
        var f = (frame + off * 120) % 120;
        var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
        var o = interpolate(f, [0, 120], [0.4, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1.5px solid ' + GOLD, transform: 'scale(' + s + ')', opacity: o }} />;
      })}

      <div style={{ transform: 'scale(' + sc + ')', textAlign: 'center' }}>
        {/* FILO 로고 */}
        <div style={{ fontSize: 92, fontWeight: 900, color: GOLD, letterSpacing: -2, textShadow: '0 0 40px ' + GOLD + '88, 0 0 100px ' + GOLD + '22' }}>
          FILO
        </div>

        <div style={{ fontSize: 22, color: WHITE, fontWeight: 700, marginTop: -10, marginBottom: 38, opacity: fadeIn(frame, 20, 18) }}>
          지금 무료 체험 시작
        </div>

        {/* URL 타이핑 버튼 */}
        <div style={{ background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 22, padding: '20px 68px', fontSize: 26, fontWeight: 900, color: NAVY, opacity: fadeIn(frame, 28, 18), boxShadow: '0 8px 36px ' + GOLD + '55, 0 0 80px ' + GOLD + glowHex, display: 'inline-block', letterSpacing: 0.5, minWidth: 220, textAlign: 'center' }}>
          {url.slice(0, charsVisible)}{charsVisible < url.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
        </div>

        <div style={{ marginTop: 22, fontSize: 15, color: WHITE + '44', opacity: fadeIn(frame, 55, 18), letterSpacing: 1 }}>
          설치 없이 바로 시작 · 완전 무료
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 65, 18), color: WHITE + '2a', fontSize: 11, letterSpacing: 5, fontWeight: 300 }}>
        POWERED BY MBTICO
      </div>
    </AbsoluteFill>
  );
}

// ── 자막 바 (전역 프레임 기준) ────────────────────────────
var SUBTITLES_DATA = [
  { from: 0,   to: 75,  text: "POS 앱 3개 쓰면서 월 15만원 내고 있어요?" },
  { from: 75,  to: 150, text: "손님이 QR 찍으면" },
  { from: 150, to: 240, text: "메뉴 선택 → 결제까지 혼자 다 해요" },
  { from: 240, to: 330, text: "홀 직원 없어도 됩니다" },
  { from: 330, to: 435, text: "주방은 실시간으로 주문을 받아요" },
  { from: 435, to: 540, text: "벨 누를 필요도, 말할 필요도 없어요" },
  { from: 540, to: 660, text: "매출·재고·직원 출퇴근·급여까지" },
  { from: 660, to: 780, text: "앱 하나로 전부 끝" },
  { from: 780, to: 900, text: "지금 무료 체험 · filo.ai.kr" },
];

function SubtitleBar() {
  var frame = useCurrentFrame();
  var current = null;
  for (var i = 0; i < SUBTITLES_DATA.length; i++) {
    if (frame >= SUBTITLES_DATA[i].from && frame < SUBTITLES_DATA[i].to) {
      current = SUBTITLES_DATA[i];
      break;
    }
  }
  if (!current) return null;
  var localFrame = frame - current.from;
  var dur = current.to - current.from;
  var op = interpolate(localFrame, [0, 6, dur - 6, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement('div', {
    style: { position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center', padding: '0 28px', opacity: op, pointerEvents: 'none', zIndex: 100 },
  }, React.createElement('div', {
    style: { display: 'inline-block', background: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: '11px 24px', fontSize: 24, fontWeight: 700, color: WHITE, lineHeight: 1.45, letterSpacing: 0.3, textShadow: '0 2px 10px #000000cc', maxWidth: 960, fontFamily: BASE.fontFamily },
  }, current.text));
}

// ── 씬 전환 오버레이 ───────────────────────────────────────
function TransitionOverlay(props) {
  var frame = useCurrentFrame();
  var durationInFrames = useVideoConfig().durationInFrames;
  var end = props.totalFrames || durationInFrames;
  var progress = props.direction === 'out'
    ? interpolate(frame, [end - 15, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement(AbsoluteFill, { style: { background: NAVY, opacity: progress, pointerEvents: 'none' } });
}

// ── 메인 컴포지션 ──────────────────────────────────────────
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

  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {hasNarration && <Audio src={staticFile('filo-narration.mp3')} volume={1} />}
      {hasBgm && <Audio src={staticFile('bgm.mp3')} volume={0.25} />}
      {SCENES.map(function(scene, idx) {
        var Comp = scene.component;
        return (
          <Sequence key={scene.start} from={scene.start} durationInFrames={scene.duration}>
            <Comp />
            <TransitionOverlay direction="in" totalFrames={scene.duration} />
            {idx < SCENES.length - 1 && <TransitionOverlay direction="out" totalFrames={scene.duration} />}
          </Sequence>
        );
      })}
      <SubtitleBar />
    </AbsoluteFill>
  );
}

module.exports = { FiloPromo };
