const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const DARK  = '#08101f';
const GOLD  = '#c9a84c';
const LTGLD = '#f0d070';
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
  fontFamily: "'Noto Sans CJK KR','Noto Sans KR','Apple SD Gothic Neo',sans-serif",
  width: '100%', height: '100%', overflow: 'hidden',
};

function Particles(props) {
  var count = props.count || 14;
  var frame = useCurrentFrame();
  var items = [];
  for (var i = 0; i < count; i++) {
    var x = (i * 43 + 11) % 100;
    var baseY = (i * 61 + 31) % 100;
    var size = 1.5 + (i % 3);
    var speed = 0.006 + (i % 5) * 0.003;
    var y = (baseY + frame * speed * 10) % 108 - 4;
    var opacity = 0.05 + (i % 3) * 0.04;
    items.push(React.createElement('div', {
      key: i,
      style: { position: 'absolute', left: x + '%', top: y + '%', width: size, height: size, borderRadius: '50%', background: GOLD, opacity: opacity },
    }));
  }
  return React.createElement(AbsoluteFill, { style: { pointerEvents: 'none' } }, items);
}

function AnimatedCounter(props) {
  var frame = useCurrentFrame();
  var val = Math.round(interpolate(frame, [props.startFrame || 0, (props.startFrame || 0) + 50], [props.from || 0, props.to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }));
  return React.createElement(React.Fragment, null, val.toLocaleString() + (props.suffix || ''));
}

// ── Scene 1: 브랜드 인트로 ────────────────────────────────────
function SceneIntro() {
  var frame = useCurrentFrame();
  var scanY  = interpolate(frame, [0, 80], [-2, 102], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var scanOp = interpolate(frame, [0, 4, 75, 80], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var logoSc = interpolate(frame, [14, 54], [0.42, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.9)) });
  var logoOp = fadeIn(frame, 14, 18);
  var glow   = interpolate(frame, [44, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var textY  = slideUp(frame, 58, 22);
  var textOp = fadeIn(frame, 58, 22);
  var subY   = slideUp(frame, 76, 20);
  var subOp  = fadeIn(frame, 76, 20);
  var tag1Y  = slideUp(frame, 96, 20);
  var tag1Op = fadeIn(frame, 96, 20);
  var tag2Y  = slideUp(frame, 110, 20);
  var tag2Op = fadeIn(frame, 110, 20);
  var ringSc = interpolate(frame, [24, 100], [0.15, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  var ringOp = interpolate(frame, [24, 100], [0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var lineW  = interpolate(frame, [86, 138], [0, 234], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, 0, 14) }}>
      <Particles count={13} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: scanY + '%', height: 2, background: 'linear-gradient(90deg, transparent, ' + GOLD + '77, ' + GOLD + ', ' + GOLD + '77, transparent)', opacity: scanOp, boxShadow: '0 0 18px ' + GOLD + '55' }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 390, height: 390, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '18 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -62%) scale(' + ringSc + ')', width: 175, height: 175, borderRadius: '50%', border: '1px solid ' + GOLD, opacity: ringOp }} />

      {/* 로고 */}
      <div style={{ transform: 'scale(' + logoSc + ')', opacity: logoOp, textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: GOLD, letterSpacing: -1, textShadow: '0 0 ' + Math.round(60 * glow) + 'px ' + GOLD + '88, 0 0 ' + Math.round(140 * glow) + 'px ' + GOLD + '22' }}>용차앱</div>
        <div style={{ fontSize: 18, color: GOLD + '99', letterSpacing: 6, marginTop: -4, fontWeight: 300 }}>화물 직접 매칭</div>
      </div>

      {/* 메인 카피 */}
      <div style={{ transform: 'translateY(' + textY + 'px)', opacity: textOp, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>주선사 없이</div>
        <div style={{ fontSize: 48, fontWeight: 900, color: LTGLD, lineHeight: 1.2, textShadow: '0 0 26px ' + GOLD + '44' }}>수수료 0원</div>
      </div>

      {/* 서브 */}
      <div style={{ transform: 'translateY(' + subY + 'px)', opacity: subOp, textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 19, color: WHITE + '77', letterSpacing: 2 }}>AI 매칭 · 루트코치 · 주유소 최저가</div>
      </div>

      {/* 특징 태그 */}
      <div style={{ transform: 'translateY(' + tag1Y + 'px)', opacity: tag1Op, display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
        {['🚚 직접 매칭', '🤖 AI 루트', '⛽ 주유 최저가'].map(function(t, i) {
          return <div key={i} style={{ background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 24, padding: '10px 20px', color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>{t}</div>;
        })}
      </div>

      {/* 수치 뱃지 */}
      <div style={{ transform: 'translateY(' + tag2Y + 'px)', opacity: tag2Op, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: WHITE + '44', letterSpacing: 2 }}>전국 화물기사 월 평균 수익 향상</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: LTGLD, marginTop: 8 }}>+420만원</div>
      </div>

      <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', width: lineW, height: 1, background: 'linear-gradient(90deg, transparent, ' + GOLD + '99, transparent)' }} />
    </AbsoluteFill>
  );
}

// ── Scene 2: 직접 매칭 ──────────────────────────────────────
function SceneMatching() {
  var frame = useCurrentFrame();
  var cargos = [
    { from: '부산', to: '서울', weight: '5톤', fee: '380,000', status: '매칭중' },
    { from: '인천', to: '대구', weight: '1톤', fee: '120,000', status: '완료' },
    { from: '광주', to: '수원', weight: '2.5톤', fee: '210,000', status: '대기' },
    { from: '울산', to: '의정부', weight: '3톤', fee: '290,000', status: '매칭중' },
  ];
  var pingScale = interpolate(frame % 60, [0, 30, 60], [1, 1.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var pingOp    = interpolate(frame % 60, [0, 30, 60], [0.7, 0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: '#070f1c' }}>
      <Particles count={9} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, ' + GOLD + '12 0%, transparent 60%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 01</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* 타이틀 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 8, 20), transform: 'translateY(' + slideUp(frame, 8, 22) + 'px)', width: '100%' }}>
          <div style={{ fontSize: 50, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>주선사<span style={{ color: LTGLD, textShadow: '0 0 22px ' + GOLD + '44' }}> 없이</span><br/>직접 매칭</div>
          <div style={{ fontSize: 17, color: WHITE + '55', lineHeight: 1.75, marginTop: 12 }}>수수료 0% · 건당 수익 극대화</div>
        </div>

        {/* 실시간 배지 + 화물 목록 */}
        <div style={{ width: '100%', opacity: fadeIn(frame, 14, 16) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: 10, height: 10 }}>
              <div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px ' + GOLD }} />
              <div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', border: '1px solid ' + GOLD, transform: 'scale(' + pingScale + ')', opacity: pingOp }} />
            </div>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>실시간 화물 공고</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cargos.map(function(cargo, i) {
              var statusColor = cargo.status === '완료' ? '#44cc44' : cargo.status === '매칭중' ? GOLD : WHITE + '44';
              return (
                <div key={i} style={{ background: '#0e1c30', borderRadius: 16, padding: '14px 18px', border: '1px solid ' + GOLD + '1e', opacity: fadeIn(frame, 18 + i * 8, 12) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: WHITE, fontSize: 14, fontWeight: 700 }}>{cargo.from} → {cargo.to}</span>
                    <span style={{ color: statusColor, fontSize: 10, fontWeight: 800, background: statusColor + '18', borderRadius: 8, padding: '2px 8px' }}>{cargo.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: WHITE + '55', fontSize: 12 }}>{cargo.weight}</span>
                    <span style={{ color: LTGLD, fontSize: 14, fontWeight: 700 }}>₩{cargo.fee}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 통계 그리드 */}
        <div style={{ width: '100%', display: 'flex', gap: 12, opacity: fadeIn(frame, 55, 18) }}>
          {[
            { label: '실시간 공고', value: '2,847', unit: '건' },
            { label: '매칭률', value: '94', unit: '%' },
            { label: '평균 대기', value: '8', unit: '분' },
          ].map(function(s, i) {
            return (
              <div key={i} style={{ flex: 1, background: '#0d1a28', borderRadius: 16, padding: '18px 12px', textAlign: 'center', border: '1px solid ' + GOLD + '22' }}>
                <div style={{ color: LTGLD, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{s.value}<span style={{ fontSize: 14 }}>{s.unit}</span></div>
                <div style={{ color: WHITE + '44', fontSize: 11, marginTop: 6 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* 절약 카운터 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 72, 18) }}>
          <div style={{ color: WHITE + '55', fontSize: 15, marginBottom: 8, letterSpacing: 1 }}>월 평균 추가 수입</div>
          <div style={{ background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 24, padding: '14px 40px', display: 'inline-block' }}>
            <span style={{ color: LTGLD, fontSize: 22, fontWeight: 900 }}>
              <AnimatedCounter from={0} to={420} startFrame={76} suffix="만원" />
            </span>
            <span style={{ color: WHITE + '55', fontSize: 15, marginLeft: 4 }}>절약</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: AI 루트코치 ───────────────────────────────────
function SceneAI() {
  var frame = useCurrentFrame();
  var routes = [
    { label: '최단경로',  km: '342km', time: '4h 20m', fuel: '68,400원', recommended: false },
    { label: 'AI 추천',   km: '361km', time: '3h 45m', fuel: '62,100원', recommended: true },
  ];
  var aiTyping = Math.floor(interpolate(frame, [40, 100], [0, 28], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var aiText = "서해안 고속도로 이용 시\n통행료 포함 연료비가 더 저렴합니다".slice(0, aiTyping);

  return (
    <AbsoluteFill style={{ ...BASE, background: '#06101e' }}>
      <Particles count={8} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 70%, ' + GOLD + '10 0%, transparent 60%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 02</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* AI 아이콘 + 텍스트 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 8, 18), transform: 'translateY(' + slideUp(frame, 8, 18) + 'px)', width: '100%' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 36px ' + GOLD + '44', fontSize: 36, margin: '0 auto 18px' }}>🤖</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>AI가 고르는<br/><span style={{ color: LTGLD, textShadow: '0 0 22px ' + GOLD + '44' }}>최적 루트</span></div>
        </div>

        {/* AI 텍스트 박스 */}
        <div style={{ width: '100%', background: '#0d1e33', borderRadius: 18, padding: '20px 20px', border: '1px solid ' + GOLD + '33', opacity: fadeIn(frame, 22, 16), minHeight: 90 }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>🤖 AI 루트코치</div>
          <div style={{ color: WHITE + 'cc', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{aiText}{aiTyping < 28 ? <span style={{ opacity: 0.5 }}>|</span> : null}</div>
        </div>

        {/* 루트 비교 카드 */}
        <div style={{ width: '100%', display: 'flex', gap: 14 }}>
          {routes.map(function(r, i) {
            return (
              <div key={r.label} style={{ flex: 1, background: r.recommended ? GOLD + '14' : '#0d1a28', borderRadius: 18, padding: '20px 16px', border: '1.5px solid ' + (r.recommended ? GOLD + '55' : GOLD + '1e'), opacity: fadeIn(frame, 36 + i * 16, 18) }}>
                <div style={{ color: r.recommended ? GOLD : WHITE + '55', fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: 1 }}>
                  {r.recommended && '✅ '}{r.label}
                </div>
                <div style={{ color: WHITE, fontSize: 15, marginBottom: 6, fontWeight: 600 }}>{r.km}</div>
                <div style={{ color: WHITE + '77', fontSize: 13, marginBottom: 6 }}>⏱ {r.time}</div>
                <div style={{ color: r.recommended ? LTGLD : WHITE + '55', fontSize: 16, fontWeight: 900 }}>⛽ {r.fuel}</div>
                {r.recommended && <div style={{ color: '#44cc44', fontSize: 11, marginTop: 8, fontWeight: 700 }}>↓ 6,300원 절약</div>}
              </div>
            );
          })}
        </div>

        {/* 절약 통계 */}
        <div style={{ width: '100%', display: 'flex', gap: 12, opacity: fadeIn(frame, 60, 18) }}>
          {[
            { icon: '⛽', label: '연간 주유비 절약', value: '180만원+' },
            { icon: '🌤', label: '날씨·교통 연동', value: '실시간' },
            { icon: '📄', label: '세금계산서', value: '자동발행' },
          ].map(function(s, i) {
            return (
              <div key={i} style={{ flex: 1, background: '#0a1628', borderRadius: 16, padding: '16px 10px', textAlign: 'center', border: '1px solid ' + GOLD + '1e' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ color: LTGLD, fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ color: WHITE + '44', fontSize: 10, marginTop: 4 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* 서브텍스트 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 78, 20), transform: 'translateY(' + slideUp(frame, 78, 20) + 'px)' }}>
          <div style={{ fontSize: 17, color: WHITE + '55', lineHeight: 1.6 }}>주유소 최저가 · 날씨연동 · 자동발행</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 요금제 ──────────────────────────────────────────
function ScenePricing() {
  var frame = useCurrentFrame();
  var plans = [
    { role: '기사', price: '150,000', unit: '/월', icon: '🚚', desc: 'AI 매칭 · 루트코치\n주유소 최저가' },
    { role: '소장', price: '50,000',  unit: '/월', icon: '📋', desc: '차량관리 · 기사관리\nDONWAY 구독 시 무료' },
  ];
  var features = ['수수료 0%', '실시간 화물 공고', 'AI 루트코치', '주유소 최저가', '세금계산서 자동발행', '팝빌 연동'];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#070f1c' }}>
      <Particles count={12} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, ' + GOLD + '0e 0%, transparent 65%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>PRICING</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* 타이틀 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 18) + 'px)', width: '100%' }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>투명한 요금제</div>
          <div style={{ fontSize: 16, color: WHITE + '44', marginTop: 10 }}>숨은 수수료 없음 · 월정액 단순 구조</div>
        </div>

        {/* 요금 카드 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plans.map(function(plan, i) {
            return (
              <div key={plan.role} style={{ background: i === 0 ? GOLD + '14' : '#0d1a28', borderRadius: 22, padding: '26px 24px', border: '1.5px solid ' + (i === 0 ? GOLD + '55' : GOLD + '1e'), display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fadeIn(frame, 24 + i * 16, 18), transform: 'translateX(' + interpolate(frame, [24 + i * 16, 40 + i * 16], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)' }}>
                <div>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{plan.icon}</div>
                  <div style={{ color: i === 0 ? GOLD : WHITE + '99', fontSize: 20, fontWeight: 800 }}>{plan.role}</div>
                  <div style={{ color: WHITE + '44', fontSize: 12, marginTop: 6, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{plan.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: i === 0 ? LTGLD : WHITE, fontSize: 30, fontWeight: 900 }}>₩{plan.price}</div>
                  <div style={{ color: WHITE + '44', fontSize: 14 }}>{plan.unit}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 기능 목록 */}
        <div style={{ width: '100%', opacity: fadeIn(frame, 58, 18) }}>
          <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, marginBottom: 14, textAlign: 'center', letterSpacing: 1 }}>✅ 모든 요금제 포함 기능</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {features.map(function(f, i) {
              return (
                <div key={i} style={{ background: '#0d1a28', borderRadius: 20, padding: '8px 16px', border: '1px solid ' + GOLD + '22', color: WHITE + '88', fontSize: 13, opacity: fadeIn(frame, 62 + i * 4, 12) }}>{f}</div>
              );
            })}
          </div>
        </div>

        {/* 경쟁사 비교 */}
        <div style={{ width: '100%', background: '#0a1628', borderRadius: 18, padding: '18px 20px', border: '1px solid ' + GOLD + '22', opacity: fadeIn(frame, 80, 18) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: WHITE + '55', fontSize: 12, marginBottom: 4 }}>타사 주선 앱 대비</div>
              <div style={{ color: LTGLD, fontSize: 22, fontWeight: 900 }}>연간 3,000만원+ 절약</div>
            </div>
            <div style={{ fontSize: 32 }}>💰</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA ──────────────────────────────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 32], [0.68, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  var url = 'yongcha.app';
  var charsVisible = Math.round(interpolate(frame, [44, 82], [0, url.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [18, 55, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={18} />
      {[0, 0.34, 0.67].map(function(off, i) {
        var f = (frame + off * 120) % 120;
        var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
        var o = interpolate(f, [0, 120], [0.4, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1.5px solid ' + GOLD, transform: 'scale(' + s + ')', opacity: o }} />;
      })}

      <div style={{ transform: 'scale(' + sc + ')', textAlign: 'center', padding: '0 40px' }}>
        {/* 준비중 배지 */}
        <div style={{ display: 'inline-block', background: 'rgba(229,25,107,.18)', border: '1.5px solid rgba(229,25,107,.5)', borderRadius: 30, padding: '7px 22px', fontSize: 14, fontWeight: 900, color: '#ff6fa3', letterSpacing: 2, marginBottom: 18, opacity: fadeIn(frame, 8, 18) }}>
          🚧 &nbsp;서비스 오픈 준비중
        </div>
        <div style={{ fontSize: 86, fontWeight: 900, color: LTGLD, letterSpacing: -2, textShadow: '0 0 40px ' + GOLD + '88, 0 0 100px ' + GOLD + '22' }}>용차앱</div>
        <div style={{ fontSize: 24, color: WHITE, fontWeight: 700, marginTop: -4, marginBottom: 16, opacity: fadeIn(frame, 20, 18) }}>소장·기사 직접 거래 정보 서비스</div>
        <div style={{ fontSize: 17, color: WHITE + '55', marginBottom: 32, opacity: fadeIn(frame, 28, 18), lineHeight: 1.6 }}>기사 ₩150,000/월 · 소장 ₩50,000/월<br/>DONWAY 구독 소장 무료</div>
        <div style={{ background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 24, padding: '22px 64px', fontSize: 28, fontWeight: 900, color: '#08101f', opacity: fadeIn(frame, 34, 18), boxShadow: '0 8px 36px ' + GOLD + '55, 0 0 80px ' + GOLD + glowHex, display: 'inline-block', letterSpacing: 0.5, minWidth: 240, textAlign: 'center', marginBottom: 10 }}>
          {url.slice(0, charsVisible)}{charsVisible < url.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
        </div>
        <div style={{ fontSize: 13, color: WHITE + '44', marginBottom: 24, opacity: fadeIn(frame, 50, 18) }}>사전 신청 · 베타 참여 가능</div>

        {/* 기능 태그 */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', opacity: fadeIn(frame, 55, 18), flexWrap: 'wrap' }}>
          {['🤖 AI 기사 추천', '📋 직접 거래 정보', '📄 세금계산서'].map(function(t, i) {
            return <div key={i} style={{ background: GOLD + '14', border: '1px solid ' + GOLD + '33', borderRadius: 20, padding: '8px 16px', color: GOLD + 'cc', fontSize: 13 }}>{t}</div>;
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 68, 18), color: WHITE + '2a', fontSize: 11, letterSpacing: 5, fontWeight: 300 }}>
        POWERED BY MBTICO
      </div>
    </AbsoluteFill>
  );
}

var SUBTITLES_DATA = [
  { from: 0,   to: 90,  text: "주선사 없이 화물 직접 받아요" },
  { from: 90,  to: 150, text: "수수료는 0원이에요" },
  { from: 150, to: 270, text: "앱에서 화물 공고 바로 확인하고" },
  { from: 270, to: 360, text: "직접 수락하면 바로 연결됩니다" },
  { from: 360, to: 480, text: "AI 루트코치가 최적 경로 알려줘요" },
  { from: 480, to: 570, text: "주유소 최저가까지 같이 안내해요" },
  { from: 570, to: 690, text: "기사님은 월 15만 원" },
  { from: 690, to: 780, text: "소장님은 월 5만 원이에요" },
  { from: 780, to: 900, text: "서비스 오픈 준비중 · yongcha.app" },
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
    style: { position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center', padding: '0 28px', opacity: op, pointerEvents: 'none', zIndex: 100 },
  }, React.createElement('div', {
    style: { display: 'inline-block', padding: '0 28px', fontSize: 38, fontWeight: 900, color: '#FFE600', lineHeight: 1.4, letterSpacing: 0.2, textShadow: '-3px -3px 0 #000,-3px 3px 0 #000,3px -3px 0 #000,3px 3px 0 #000,0 0 12px rgba(0,0,0,0.8)', maxWidth: 1000, fontFamily: BASE.fontFamily },
  }, current.text));
}

function TransitionOverlay(props) {
  var frame = useCurrentFrame();
  var durationInFrames = useVideoConfig().durationInFrames;
  var end = props.totalFrames || durationInFrames;
  var progress = props.direction === 'out'
    ? interpolate(frame, [end - 15, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement(AbsoluteFill, { style: { background: DARK, opacity: progress, pointerEvents: 'none' } });
}

function YongchaPromo(props) {
  var hasNarration = props.hasNarration;
  var hasBgm = props.hasBgm;
  var SCENES = [
    { component: SceneIntro,    start: 0,   duration: 150 },
    { component: SceneMatching, start: 150, duration: 210 },
    { component: SceneAI,       start: 360, duration: 210 },
    { component: ScenePricing,  start: 570, duration: 210 },
    { component: SceneCTA,      start: 780, duration: 120 },
  ];
  return (
    <AbsoluteFill style={{ background: DARK }}>
      {hasNarration && <Audio src={staticFile('yongcha-narration.mp3')} volume={1} />}
      {hasBgm && <Audio src={staticFile('bgm.mp3')} volume={0.12} />}
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

module.exports = { YongchaPromo };
