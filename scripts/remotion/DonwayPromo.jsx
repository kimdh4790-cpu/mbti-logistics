const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const NAVY  = '#030f1e';
const BLUE  = '#0ea5e9';
const CYAN  = '#38bdf8';
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
    var x = (i * 41 + 17) % 100;
    var baseY = (i * 67 + 23) % 100;
    var size = 1.5 + (i % 3);
    var speed = 0.007 + (i % 5) * 0.003;
    var y = (baseY + frame * speed * 10) % 108 - 4;
    var opacity = 0.05 + (i % 3) * 0.04;
    items.push(React.createElement('div', {
      key: i,
      style: { position: 'absolute', left: x + '%', top: y + '%', width: size, height: size, borderRadius: '50%', background: CYAN, opacity: opacity },
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

// ── Scene 1: 브랜드 인트로 (0–5s = 0–149f) ────────────────
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
  var ringSc = interpolate(frame, [24, 100], [0.15, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  var ringOp = interpolate(frame, [24, 100], [0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var lineW  = interpolate(frame, [86, 138], [0, 234], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, 0, 14) }}>
      <Particles count={13} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: scanY + '%', height: 2, background: 'linear-gradient(90deg, transparent, ' + CYAN + '77, ' + CYAN + ', ' + CYAN + '77, transparent)', opacity: scanOp, boxShadow: '0 0 18px ' + CYAN + '55' }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 390, height: 390, borderRadius: '50%', background: 'radial-gradient(circle, ' + BLUE + '18 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -62%) scale(' + ringSc + ')', width: 175, height: 175, borderRadius: '50%', border: '1px solid ' + CYAN, opacity: ringOp }} />
      <div style={{ transform: 'scale(' + logoSc + ')', opacity: logoOp, marginBottom: 54, textAlign: 'center' }}>
        <div style={{ fontSize: 90, fontWeight: 900, color: CYAN, letterSpacing: -2, textShadow: '0 0 ' + Math.round(60 * glow) + 'px ' + CYAN + '88, 0 0 ' + Math.round(140 * glow) + 'px ' + CYAN + '22' }}>DONWAY</div>
        <div style={{ fontSize: 18, color: CYAN + '99', letterSpacing: 8, marginTop: -10, fontWeight: 300 }}>배달대행 정산 SaaS</div>
      </div>
      <div style={{ transform: 'translateY(' + textY + 'px)', opacity: textOp, textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>수백 명 정산이</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: CYAN, lineHeight: 1.2, textShadow: '0 0 26px ' + CYAN + '44' }}>3초면 끝난다</div>
      </div>
      <div style={{ transform: 'translateY(' + subY + 'px)', opacity: subOp, marginTop: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: WHITE + '77', letterSpacing: 2 }}>엑셀 업로드 · 자동 정산 · 알림톡 발송</div>
      </div>
      <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', width: lineW, height: 1, background: 'linear-gradient(90deg, transparent, ' + CYAN + '99, transparent)' }} />
    </AbsoluteFill>
  );
}

// ── Scene 2: 엑셀 → 자동 정산 (5–12s = 150–359f) ────────────
function SceneExcel() {
  var frame = useCurrentFrame();
  var rows = [
    { name: '김민준', trips: 48, amount: '1,248,000' },
    { name: '이서윤', trips: 62, amount: '1,612,000' },
    { name: '박도현', trips: 35, amount: '910,000' },
    { name: '최지아', trips: 71, amount: '1,846,000' },
    { name: '정수현', trips: 29, amount: '754,000' },
  ];
  var arrowX = interpolate(frame, [55, 75], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) });
  var arrowOp = fadeIn(frame, 55, 14);

  return (
    <AbsoluteFill style={{ ...BASE, background: '#030e1c', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={9} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, ' + BLUE + '12 0%, transparent 60%)' }} />
      <div style={{ position: 'absolute', top: 80, background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 01</span>
      </div>

      {/* 엑셀 파일 아이콘 */}
      <div style={{ position: 'absolute', top: 148, left: 44, opacity: fadeIn(frame, 8, 18), transform: 'translateY(' + slideUp(frame, 8, 22) + 'px)' }}>
        <div style={{ width: 76, height: 90, background: 'linear-gradient(160deg, #1a7a3d, #0f5428)', borderRadius: 14, border: '1px solid #2ecc7144', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 36px #00000088' }}>
          <div style={{ fontSize: 28, color: '#2ecc71', fontWeight: 900 }}>XLS</div>
          <div style={{ fontSize: 10, color: '#2ecc7199', marginTop: 2 }}>기사 정산표</div>
        </div>
        <div style={{ marginTop: 8, color: WHITE + '55', fontSize: 12, textAlign: 'center' }}>엑셀 업로드</div>
      </div>

      {/* 화살표 */}
      <div style={{ position: 'absolute', top: 188, left: 148, transform: 'translateX(' + arrowX + 'px)', opacity: arrowOp }}>
        <div style={{ color: CYAN, fontSize: 32, textShadow: '0 0 14px ' + CYAN + '88' }}>→</div>
      </div>

      {/* DONWAY 정산 목업 */}
      <div style={{ position: 'absolute', top: 140, right: 28, width: 220, height: 330, background: 'linear-gradient(160deg, #0d1e33, #061828)', borderRadius: 20, border: '1px solid ' + CYAN + '33', overflow: 'hidden', opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 22) + 'px)', boxShadow: '0 30px 72px #000000aa' }}>
        <div style={{ background: 'linear-gradient(135deg, ' + BLUE + 'ee, #0284c7)', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: WHITE, fontSize: 12, fontWeight: 800 }}>DONWAY 정산 완료</span>
          <span style={{ background: WHITE + '22', borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 800, color: WHITE }}>{rows.length}명</span>
        </div>
        {rows.map(function(row, i) {
          return (
            <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #ffffff08', opacity: fadeIn(frame, 24 + i * 8, 12) }}>
              <div>
                <div style={{ color: WHITE, fontSize: 12, fontWeight: 600 }}>{row.name}</div>
                <div style={{ color: WHITE + '44', fontSize: 10, marginTop: 1 }}>{row.trips}건</div>
              </div>
              <div style={{ color: CYAN, fontSize: 12, fontWeight: 700 }}>{row.amount}원</div>
            </div>
          );
        })}
      </div>

      {/* 왼쪽 텍스트 */}
      <div style={{ position: 'absolute', bottom: 180, left: 44, opacity: fadeIn(frame, 30, 20), transform: 'translateY(' + slideUp(frame, 30, 22) + 'px)' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, marginBottom: 14 }}>엑셀 한 번에<br/><span style={{ color: CYAN, textShadow: '0 0 22px ' + CYAN + '44' }}>전원 자동 정산</span></div>
        <div style={{ fontSize: 16, color: WHITE + '66', lineHeight: 1.75 }}>수백 명도 3초<br/>오류·누락 제로</div>
      </div>

      {/* 카운터 */}
      <div style={{ position: 'absolute', bottom: 90, left: 44, opacity: fadeIn(frame, 60, 18) }}>
        <span style={{ color: CYAN, fontSize: 40, fontWeight: 900 }}>
          <AnimatedCounter from={0} to={500} startFrame={64} suffix="+" />
        </span>
        <span style={{ color: WHITE + '66', fontSize: 16, marginLeft: 8 }}>명 동시 정산 가능</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: 카카오 알림톡 (12–19s = 360–569f) ──────────────
function SceneAlimtalk() {
  var frame = useCurrentFrame();
  var messages = [
    { name: '김민준', msg: '11월 정산 완료\n1,248,000원 지급 예정', time: '14:03' },
    { name: '이서윤', msg: '11월 정산 완료\n1,612,000원 지급 예정', time: '14:03' },
    { name: '박도현', msg: '11월 정산 완료\n910,000원 지급 예정',   time: '14:03' },
  ];
  var notifX  = interpolate(frame, [70, 90], [280, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var notifOp = fadeIn(frame, 70, 12);

  return (
    <AbsoluteFill style={{ ...BASE, background: '#020c1a', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={8} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 70%, ' + BLUE + '10 0%, transparent 60%)' }} />
      <div style={{ position: 'absolute', top: 80, background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 02</span>
      </div>

      {/* 알림톡 발송 배지 */}
      <div style={{ position: 'absolute', top: 132, right: 26, transform: 'translateX(' + notifX + 'px)', opacity: notifOp, background: '#ffe000', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10, boxShadow: '0 4px 22px #ffe00044' }}>
        <span style={{ fontSize: 18 }}>💬</span>
        <span style={{ color: '#000', fontSize: 11, fontWeight: 800 }}>카카오 알림톡 발송 완료</span>
      </div>

      {/* 알림톡 목업 */}
      <div style={{ position: 'absolute', top: 148, right: 28, width: 216, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map(function(msg, i) {
          return (
            <div key={msg.name} style={{ background: '#fffde7', borderRadius: 14, padding: '12px 14px', opacity: fadeIn(frame, 18 + i * 14, 16), transform: 'translateX(' + interpolate(frame, [18 + i * 14, 32 + i * 14], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)', boxShadow: '0 4px 20px #00000044' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#333', fontSize: 10, fontWeight: 800 }}>DONWAY</span>
                <span style={{ color: '#999', fontSize: 9 }}>{msg.time}</span>
              </div>
              <div style={{ color: '#111', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{msg.name} 기사님</div>
              <div style={{ color: '#333', fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{msg.msg}</div>
            </div>
          );
        })}
      </div>

      {/* 왼쪽 텍스트 */}
      <div style={{ position: 'absolute', left: 44, top: '28%', opacity: fadeIn(frame, 10, 20), transform: 'translateY(' + slideUp(frame, 10, 22) + 'px)' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, marginBottom: 18 }}>기사별<br/><span style={{ color: '#ffe000', textShadow: '0 0 22px #ffe00044' }}>명세서 자동</span><br/>발송</div>
        <div style={{ fontSize: 16, color: WHITE + '66', lineHeight: 1.75 }}>정산 완료 즉시<br/>카카오 알림톡<br/>전원 동시 발송</div>
      </div>

      {/* 발송 카운터 */}
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 76, 18), background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 24, padding: '12px 36px', whiteSpace: 'nowrap' }}>
        <span style={{ color: CYAN, fontSize: 18, fontWeight: 800 }}>
          <AnimatedCounter from={0} to={312} startFrame={80} suffix="명" />
        </span>
        <span style={{ color: WHITE + '66', fontSize: 14, marginLeft: 6 }}>동시 발송 완료</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 요금제 (19–26s = 570–779f) ──────────────────────
function ScenePricing() {
  var frame = useCurrentFrame();
  var tiers = [
    { label: '~50명',  price: '125,000', unit: '/월' },
    { label: '~100명', price: '250,000', unit: '/월' },
    { label: '~500명', price: '1,250,000', unit: '/월' },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#020b18', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={12} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, ' + BLUE + '0e 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', top: 80, background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>PRICING</span>
      </div>

      <div style={{ position: 'absolute', top: 148, left: 44, right: 44, opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 18) + 'px)' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, marginBottom: 8 }}>기사 1인당</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 66, fontWeight: 900, color: CYAN, textShadow: '0 0 26px ' + CYAN + '44' }}>₩2,500</span>
          <span style={{ fontSize: 22, color: WHITE + '66' }}>/월</span>
        </div>
        <div style={{ fontSize: 16, color: WHITE + '55', marginBottom: 32 }}>카드 등록 없이 · 7일 무료체험</div>
      </div>

      <div style={{ position: 'absolute', top: 420, left: 44, right: 44, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tiers.map(function(tier, i) {
          return (
            <div key={tier.label} style={{ background: i === 1 ? CYAN + '18' : '#0d1e33', borderRadius: 16, padding: '16px 20px', border: '1px solid ' + (i === 1 ? CYAN + '55' : CYAN + '1e'), display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fadeIn(frame, 28 + i * 12, 16), transform: 'translateX(' + interpolate(frame, [28 + i * 12, 44 + i * 12], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)' }}>
              <span style={{ color: i === 1 ? CYAN : WHITE + '99', fontSize: 16, fontWeight: 600 }}>{tier.label}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: i === 1 ? CYAN : WHITE, fontSize: 22, fontWeight: 900 }}>₩{tier.price}</span>
                <span style={{ color: WHITE + '44', fontSize: 13, marginLeft: 3 }}>{tier.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 70, 18), color: WHITE + '33', fontSize: 12, letterSpacing: 3, whiteSpace: 'nowrap' }}>
        세금계산서 자동발행 · 팝빌 연동
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA (26–30s = 780–899f) ──────────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 32], [0.68, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  var url = 'donway.ai.kr';
  var charsVisible = Math.round(interpolate(frame, [44, 82], [0, url.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [18, 55, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={18} />
      {[0, 0.34, 0.67].map(function(off, i) {
        var f = (frame + off * 120) % 120;
        var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
        var o = interpolate(f, [0, 120], [0.4, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1.5px solid ' + CYAN, transform: 'scale(' + s + ')', opacity: o }} />;
      })}
      <div style={{ transform: 'scale(' + sc + ')', textAlign: 'center' }}>
        <div style={{ fontSize: 74, fontWeight: 900, color: CYAN, letterSpacing: -2, textShadow: '0 0 40px ' + CYAN + '88, 0 0 100px ' + CYAN + '22' }}>DONWAY</div>
        <div style={{ fontSize: 22, color: WHITE, fontWeight: 700, marginTop: -6, marginBottom: 38, opacity: fadeIn(frame, 20, 18) }}>7일 무료체험 시작</div>
        <div style={{ background: 'linear-gradient(135deg, ' + BLUE + ', #0284c7)', borderRadius: 22, padding: '20px 60px', fontSize: 24, fontWeight: 900, color: WHITE, opacity: fadeIn(frame, 28, 18), boxShadow: '0 8px 36px ' + BLUE + '55, 0 0 80px ' + BLUE + glowHex, display: 'inline-block', letterSpacing: 0.5, minWidth: 220, textAlign: 'center' }}>
          {url.slice(0, charsVisible)}{charsVisible < url.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
        </div>
        <div style={{ marginTop: 22, fontSize: 15, color: WHITE + '44', opacity: fadeIn(frame, 55, 18), letterSpacing: 1 }}>
          카드 등록 없이 · 계좌이체 월 갱신
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 65, 18), color: WHITE + '2a', fontSize: 11, letterSpacing: 5, fontWeight: 300 }}>
        POWERED BY MBTICO
      </div>
    </AbsoluteFill>
  );
}

var SUBTITLES_DATA = [
  { from: 0,   to: 90,  text: "배달대행 기사 정산, 엑셀 하나면 끝나요" },
  { from: 90,  to: 150, text: "수백 명도 3초면 완료됩니다" },
  { from: 150, to: 270, text: "기사 이름 적고 건수 입력하면" },
  { from: 270, to: 360, text: "정산금 계산이 자동으로 나와요" },
  { from: 360, to: 480, text: "정산 완료되면 카카오 알림톡" },
  { from: 480, to: 570, text: "기사별로 전부 자동 발송됩니다" },
  { from: 570, to: 690, text: "기사 1인당 2,500원 월정액" },
  { from: 690, to: 780, text: "50명이면 12만 5천 원이에요" },
  { from: 780, to: 900, text: "7일 무료체험 · donway.ai.kr" },
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
  return React.createElement(AbsoluteFill, { style: { background: NAVY, opacity: progress, pointerEvents: 'none' } });
}

function DonwayPromo(props) {
  var hasNarration = props.hasNarration;
  var hasBgm = props.hasBgm;
  var SCENES = [
    { component: SceneIntro,    start: 0,   duration: 150 },
    { component: SceneExcel,    start: 150, duration: 210 },
    { component: SceneAlimtalk, start: 360, duration: 210 },
    { component: ScenePricing,  start: 570, duration: 210 },
    { component: SceneCTA,      start: 780, duration: 120 },
  ];
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {hasNarration && <Audio src={staticFile('donway-narration.mp3')} volume={1} />}
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

module.exports = { DonwayPromo };
