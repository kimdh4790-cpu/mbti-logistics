const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const WHITE = '#ffffff';

var YONGCHA_THEMES = [
  { bg: '#000d1a', mid: '#003366', accent: '#2563eb', accent2: '#60a5fa' }, // A: 파랑 (신뢰)
  { bg: '#001208', mid: '#004d20', accent: '#16a34a', accent2: '#4ade80' }, // B: 초록 (절약)
  { bg: '#150800', mid: '#7a3500', accent: '#ea580c', accent2: '#fb923c' }, // C: 주황 (에너지)
  { bg: '#140000', mid: '#7f1d1d', accent: '#dc2626', accent2: '#f87171' }, // D: 빨강 (충격)
];
var YONGCHA_VARIANTS = [
  { hook: ['화물기사들이', '이걸 몰랐다고?'],         punchline: '주선사 없이도 화물 받는 방법이 있어요' },
  { hook: ['주선 수수료', '왜 아직 내고 있어요?'],     punchline: '직접 연결하면 수수료가 0원이에요' },
  { hook: ['기사 구하는데', '하루가 다 가죠?'],        punchline: 'AI가 3초 만에 딱 맞는 기사 추천해요' },
  { hook: ['연간 3천만원이', '어디서 새는지 알아요?'], punchline: '주선사 수수료에서 다 새고 있어요' },
];
var WEEK_VARIANT = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
var T = YONGCHA_THEMES[WEEK_VARIANT];
var V = YONGCHA_VARIANTS[WEEK_VARIANT];
var DARK  = T.bg;
var GOLD  = T.accent;
var LTGLD = T.accent2;

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

// ── Scene 1: 궁금증 유발 훅 ───────────────────────────────────
function SceneHook() {
  var frame = useCurrentFrame();
  var line1Op = fadeIn(frame, 8, 20);
  var line1Y  = slideUp(frame, 8, 22);
  var line2Op = fadeIn(frame, 34, 20);
  var line2Y  = slideUp(frame, 34, 22);
  var punchSc = interpolate(frame, [72, 90], [0.85, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.3)),
  });
  var punchOp = fadeIn(frame, 72, 18);

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={12} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, ' + GOLD + '22 0%, transparent 65%)' }} />

      {/* 훅 1단 — 질문 */}
      <div style={{ textAlign: 'center', padding: '0 40px', marginBottom: 36 }}>
        <div style={{ transform: 'translateY(' + line1Y + 'px)', opacity: line1Op, marginBottom: 8 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>{V.hook[0]}</div>
        </div>
        <div style={{ transform: 'translateY(' + line2Y + 'px)', opacity: line2Op }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: GOLD, lineHeight: 1.15, textShadow: '0 0 32px ' + GOLD + '55' }}>{V.hook[1]}</div>
        </div>
      </div>

      {/* 반전 충격 박스 */}
      <div style={{ transform: 'scale(' + punchSc + ')', opacity: punchOp, background: GOLD, borderRadius: 20, padding: '24px 44px', textAlign: 'center', maxWidth: '85%', boxShadow: '0 8px 40px ' + GOLD + '44' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: DARK, lineHeight: 1.4 }}>{V.punchline}</div>
      </div>
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

var SUBTITLES_ALL = [
  // A: 파랑 — 기사 타겟 (화물기사들이 이걸 몰랐다고?)
  [
    { from: 0,   to: 90,  text: "화물기사들이 이걸 몰랐다고?" },
    { from: 90,  to: 150, text: "주선사 없이도 화물 받을 수 있어요" },
    { from: 150, to: 270, text: "앱에서 화물 공고 바로 확인하고" },
    { from: 270, to: 360, text: "직접 수락하면 바로 연결됩니다" },
    { from: 360, to: 480, text: "AI 루트코치가 최적 경로 알려줘요" },
    { from: 480, to: 570, text: "주유소 최저가까지 같이 안내해요" },
    { from: 570, to: 690, text: "기사님은 월 15만 원" },
    { from: 690, to: 780, text: "소장님은 월 5만 원이에요" },
    { from: 780, to: 900, text: "서비스 오픈 준비중 · yongcha.app" },
  ],
  // B: 초록 — 수수료 타겟 (주선 수수료 왜 아직 내고 있어요?)
  [
    { from: 0,   to: 90,  text: "주선 수수료 왜 아직 내고 있어요?" },
    { from: 90,  to: 150, text: "직접 연결하면 수수료가 0원이에요" },
    { from: 150, to: 270, text: "소장과 기사가 앱에서 직접 연결" },
    { from: 270, to: 360, text: "중간 수수료 없이 100% 내 수익" },
    { from: 360, to: 480, text: "AI가 루트까지 최적화해줘요" },
    { from: 480, to: 570, text: "주유비도 아끼는 스마트한 운행" },
    { from: 570, to: 690, text: "기사님은 월 15만 원" },
    { from: 690, to: 780, text: "소장님은 월 5만 원이에요" },
    { from: 780, to: 900, text: "서비스 오픈 준비중 · yongcha.app" },
  ],
  // C: 주황 — 소장 타겟 (기사 구하는데 하루가 다 가죠?)
  [
    { from: 0,   to: 90,  text: "기사 구하는데 하루가 다 가죠?" },
    { from: 90,  to: 150, text: "AI가 3초 만에 딱 맞는 기사 추천해요" },
    { from: 150, to: 270, text: "거리·경력·평점 분석해서 자동 추천" },
    { from: 270, to: 360, text: "채용 시간이 하루 → 3분으로 줄어요" },
    { from: 360, to: 480, text: "AI 루트코치로 운행 효율도 올리고" },
    { from: 480, to: 570, text: "세금계산서도 자동으로 발행돼요" },
    { from: 570, to: 690, text: "기사님은 월 15만 원" },
    { from: 690, to: 780, text: "소장님은 월 5만 원이에요" },
    { from: 780, to: 900, text: "서비스 오픈 준비중 · yongcha.app" },
  ],
  // D: 빨강 — 충격 타겟 (연간 3천만원이 어디서 새는지 알아요?)
  [
    { from: 0,   to: 90,  text: "연간 3천만원이 어디서 새는지 알아요?" },
    { from: 90,  to: 150, text: "주선사 수수료에서 다 새고 있어요" },
    { from: 150, to: 270, text: "주선사 없이 직접 연결하면" },
    { from: 270, to: 360, text: "그 돈이 전부 내 통장으로 들어와요" },
    { from: 360, to: 480, text: "AI 루트코치로 주유비까지 아끼고" },
    { from: 480, to: 570, text: "팝빌 연동 세금계산서 자동 발행" },
    { from: 570, to: 690, text: "기사님은 월 15만 원" },
    { from: 690, to: 780, text: "소장님은 월 5만 원이에요" },
    { from: 780, to: 900, text: "서비스 오픈 준비중 · yongcha.app" },
  ],
];
var SUBTITLES_DATA = SUBTITLES_ALL[WEEK_VARIANT];

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
    { component: SceneHook,     start: 0,   duration: 150 },
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
