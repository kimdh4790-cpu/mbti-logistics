const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

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

// 주차별 A/B/C/D 콘텐츠 로테이션
var WEEK_VARIANT = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
var VARIANTS = [
  {
    hook: ['수백 명 정산이', '3초면 끝난다'],
    sub:  '엑셀 업로드 · 자동 정산 · 알림톡 발송',
    rows: [
      { name: '김민준', trips: 48, amount: '1,248,000' },
      { name: '이서윤', trips: 62, amount: '1,612,000' },
      { name: '박도현', trips: 35, amount: '910,000' },
      { name: '최지아', trips: 71, amount: '1,846,000' },
      { name: '정수현', trips: 29, amount: '754,000' },
    ],
    msgs: [
      { name: '김민준', body: '11월 정산 완료\n1,248,000원 지급 예정', time: '14:03' },
      { name: '이서윤', body: '11월 정산 완료\n1,612,000원 지급 예정', time: '14:03' },
      { name: '박도현', body: '11월 정산 완료\n910,000원 지급 예정',   time: '14:03' },
    ],
  },
  {
    hook: ['엑셀 파일 하나로', '전원 자동 정산'],
    sub:  '오류 없이 · 누락 없이 · 3초 완료',
    rows: [
      { name: '이정우', trips: 55, amount: '1,430,000' },
      { name: '박서연', trips: 41, amount: '1,066,000' },
      { name: '최민호', trips: 68, amount: '1,768,000' },
      { name: '강지우', trips: 33, amount: '858,000' },
      { name: '윤수아', trips: 74, amount: '1,924,000' },
    ],
    msgs: [
      { name: '이정우', body: '12월 정산 완료\n1,430,000원 지급 예정', time: '09:11' },
      { name: '박서연', body: '12월 정산 완료\n1,066,000원 지급 예정', time: '09:11' },
      { name: '최민호', body: '12월 정산 완료\n1,768,000원 지급 예정', time: '09:11' },
    ],
  },
  {
    hook: ['기사 300명 정산', '클릭 한 번이면 끝'],
    sub:  '자동 계산 · 명세서 발송 · 세금계산서',
    rows: [
      { name: '오현우', trips: 52, amount: '1,352,000' },
      { name: '임지현', trips: 38, amount: '988,000' },
      { name: '한도윤', trips: 66, amount: '1,716,000' },
      { name: '전서진', trips: 45, amount: '1,170,000' },
      { name: '양예준', trips: 80, amount: '2,080,000' },
    ],
    msgs: [
      { name: '오현우', body: '1월 정산 완료\n1,352,000원 지급 예정',  time: '10:25' },
      { name: '임지현', body: '1월 정산 완료\n988,000원 지급 예정',    time: '10:25' },
      { name: '한도윤', body: '1월 정산 완료\n1,716,000원 지급 예정',  time: '10:25' },
    ],
  },
  {
    hook: ['정산 실수', '이제 없앱시다'],
    sub:  'AI 검증 · 자동 정산 · 이의제기 0건',
    rows: [
      { name: '조민재', trips: 60, amount: '1,560,000' },
      { name: '신하은', trips: 43, amount: '1,118,000' },
      { name: '권도현', trips: 57, amount: '1,482,000' },
      { name: '백지수', trips: 76, amount: '1,976,000' },
      { name: '문준혁', trips: 31, amount: '806,000' },
    ],
    msgs: [
      { name: '조민재', body: '2월 정산 완료\n1,560,000원 지급 예정',  time: '11:00' },
      { name: '신하은', body: '2월 정산 완료\n1,118,000원 지급 예정',  time: '11:00' },
      { name: '권도현', body: '2월 정산 완료\n1,482,000원 지급 예정',  time: '11:00' },
    ],
  },
];
var V = VARIANTS[WEEK_VARIANT];

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

// ── Scene 1: 브랜드 인트로 — 로고 frame 0부터 즉시 노출 ────────
function SceneIntro() {
  var frame = useCurrentFrame();
  var logoSc = interpolate(frame, [0, 42], [0.72, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.7)) });
  var glow   = interpolate(frame, [20, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var textOp = fadeIn(frame, 14, 20);
  var textY  = slideUp(frame, 14, 20);
  var subOp  = fadeIn(frame, 30, 18);
  var tagOp  = fadeIn(frame, 46, 18);
  var statOp = fadeIn(frame, 62, 20);
  var scanY  = interpolate(frame, [0, 80], [-2, 102], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var scanOp = interpolate(frame, [0, 4, 75, 80], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var lineW  = interpolate(frame, [86, 138], [0, 260], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={13} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: scanY + '%', height: 2, background: 'linear-gradient(90deg, transparent, ' + CYAN + '77, ' + CYAN + ', ' + CYAN + '77, transparent)', opacity: scanOp, boxShadow: '0 0 18px ' + CYAN + '55' }} />
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, ' + BLUE + '18 0%, transparent 70%)' }} />

      {/* 로고 — frame 0부터 즉시 노출 */}
      <div style={{ transform: 'scale(' + logoSc + ')', textAlign: 'center', marginBottom: 52 }}>
        <div style={{ fontSize: 100, fontWeight: 900, color: CYAN, letterSpacing: -2, textShadow: '0 0 ' + Math.round(60 * glow) + 'px ' + CYAN + '88, 0 0 ' + Math.round(140 * glow) + 'px ' + CYAN + '22' }}>DONWAY</div>
        <div style={{ fontSize: 18, color: CYAN + '99', letterSpacing: 8, marginTop: -8, fontWeight: 300 }}>배달대행 정산 SaaS</div>
      </div>

      {/* 메인 카피 */}
      <div style={{ transform: 'translateY(' + textY + 'px)', opacity: textOp, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 50, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>{V.hook[0]}</div>
        <div style={{ fontSize: 50, fontWeight: 900, color: CYAN, lineHeight: 1.2, textShadow: '0 0 26px ' + CYAN + '44' }}>{V.hook[1]}</div>
      </div>

      {/* 서브 */}
      <div style={{ opacity: subOp, textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 18, color: WHITE + '77', letterSpacing: 1 }}>{V.sub}</div>
      </div>

      {/* 기능 태그 */}
      <div style={{ opacity: tagOp, display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap', padding: '0 24px' }}>
        {['📊 자동 정산', '💬 알림톡 발송', '📄 세금계산서'].map(function(t, i) {
          return <div key={i} style={{ background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 24, padding: '10px 20px', color: CYAN, fontSize: 15, fontWeight: 600 }}>{t}</div>;
        })}
      </div>

      {/* 핵심 수치 */}
      <div style={{ opacity: statOp, textAlign: 'center' }}>
        <div style={{ color: CYAN, fontSize: 42, fontWeight: 900 }}>500명+</div>
        <div style={{ color: WHITE + '55', fontSize: 16, marginTop: 4 }}>동시 정산 가능</div>
      </div>

      <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', width: lineW, height: 1, background: 'linear-gradient(90deg, transparent, ' + CYAN + '99, transparent)' }} />
    </AbsoluteFill>
  );
}

// ── Scene 2: 엑셀 → 자동 정산 — space-evenly 레이아웃 ──────────
function SceneExcel() {
  var frame = useCurrentFrame();
  var rows = V.rows;
  var arrowX = interpolate(frame, [55, 75], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) });
  var arrowOp = fadeIn(frame, 55, 14);

  return (
    <AbsoluteFill style={{ ...BASE, background: '#030e1c' }}>
      <Particles count={9} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, ' + BLUE + '12 0%, transparent 60%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 01</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* 타이틀 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 8, 20), transform: 'translateY(' + slideUp(frame, 8, 22) + 'px)', width: '100%' }}>
          <div style={{ fontSize: 54, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>엑셀 한 번에</div>
          <div style={{ fontSize: 54, fontWeight: 900, color: CYAN, lineHeight: 1.15, textShadow: '0 0 22px ' + CYAN + '44' }}>전원 자동 정산</div>
          <div style={{ fontSize: 17, color: WHITE + '55', marginTop: 10 }}>수백 명도 3초 · 오류·누락 제로</div>
        </div>

        {/* 비주얼 — XLS → 목업 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: fadeIn(frame, 12, 18), width: '100%', justifyContent: 'center' }}>
          {/* XLS 아이콘 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: fadeIn(frame, 8, 18), transform: 'translateY(' + slideUp(frame, 8, 22) + 'px)' }}>
            <div style={{ width: 110, height: 130, background: 'linear-gradient(160deg, #1a7a3d, #0f5428)', borderRadius: 18, border: '1px solid #2ecc7144', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 48px #00000088' }}>
              <div style={{ fontSize: 38, color: '#2ecc71', fontWeight: 900 }}>XLS</div>
              <div style={{ fontSize: 12, color: '#2ecc7199', marginTop: 4 }}>기사 정산표</div>
            </div>
            <div style={{ marginTop: 10, color: WHITE + '55', fontSize: 13 }}>엑셀 업로드</div>
          </div>

          {/* 화살표 */}
          <div style={{ transform: 'translateX(' + arrowX + 'px)', opacity: arrowOp }}>
            <div style={{ color: CYAN, fontSize: 44, textShadow: '0 0 14px ' + CYAN + '88' }}>→</div>
          </div>

          {/* DONWAY 정산 목업 */}
          <div style={{ width: 272, height: 410, background: 'linear-gradient(160deg, #0d1e33, #061828)', borderRadius: 22, border: '1px solid ' + CYAN + '33', overflow: 'hidden', opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 22) + 'px)', boxShadow: '0 30px 80px #000000aa' }}>
            <div style={{ background: 'linear-gradient(135deg, ' + BLUE + 'ee, #0284c7)', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ color: WHITE, fontSize: 13, fontWeight: 800 }}>DONWAY 정산 완료</span>
              <span style={{ background: WHITE + '22', borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: WHITE }}>{rows.length}명</span>
            </div>
            {rows.map(function(row, i) {
              return (
                <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #ffffff08', opacity: fadeIn(frame, 24 + i * 8, 12) }}>
                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600 }}>{row.name}</div>
                    <div style={{ color: WHITE + '44', fontSize: 11, marginTop: 2 }}>{row.trips}건</div>
                  </div>
                  <div style={{ color: CYAN, fontSize: 13, fontWeight: 700 }}>{row.amount}원</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 기능 뱃지 */}
        <div style={{ display: 'flex', gap: 12, opacity: fadeIn(frame, 42, 18) }}>
          {['✅ 오류 제로', '⚡ 3초 완료', '📱 알림톡 자동'].map(function(t, i) {
            return <div key={i} style={{ background: CYAN + '14', border: '1px solid ' + CYAN + '33', borderRadius: 20, padding: '10px 18px', color: WHITE + 'cc', fontSize: 14 }}>{t}</div>;
          })}
        </div>

        {/* 카운터 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 60, 18) }}>
          <span style={{ color: CYAN, fontSize: 50, fontWeight: 900 }}>
            <AnimatedCounter from={0} to={500} startFrame={64} suffix="+" />
          </span>
          <span style={{ color: WHITE + '66', fontSize: 18, marginLeft: 10 }}>명 동시 정산 가능</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: 카카오 알림톡 — space-evenly 레이아웃 ─────────────
function SceneAlimtalk() {
  var frame = useCurrentFrame();
  var messages = V.msgs;
  var notifX  = interpolate(frame, [70, 90], [300, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var notifOp = fadeIn(frame, 70, 12);

  return (
    <AbsoluteFill style={{ ...BASE, background: '#020c1a' }}>
      <Particles count={8} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 65%, ' + BLUE + '10 0%, transparent 60%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>FEATURE 02</span>
      </div>

      {/* 발송 완료 알림 */}
      <div style={{ position: 'absolute', top: 72, right: 28, transform: 'translateX(' + notifX + 'px)', opacity: notifOp, background: '#ffe000', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10, boxShadow: '0 4px 24px #ffe00044' }}>
        <span style={{ fontSize: 20 }}>💬</span>
        <span style={{ color: '#000', fontSize: 12, fontWeight: 800 }}>카카오 알림톡 발송 완료</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* 타이틀 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 8, 20), transform: 'translateY(' + slideUp(frame, 8, 22) + 'px)', width: '100%' }}>
          <div style={{ fontSize: 54, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>기사별 명세서</div>
          <div style={{ fontSize: 54, fontWeight: 900, color: '#ffe000', lineHeight: 1.15, textShadow: '0 0 22px #ffe00044' }}>자동 발송</div>
          <div style={{ fontSize: 17, color: WHITE + '55', marginTop: 10 }}>정산 완료 즉시 · 전원 동시 · 카카오</div>
        </div>

        {/* 알림톡 목업 카드들 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map(function(msg, i) {
            return (
              <div key={msg.name} style={{ background: '#fffde7', borderRadius: 18, padding: '18px 20px', opacity: fadeIn(frame, 18 + i * 16, 18), transform: 'translateX(' + interpolate(frame, [18 + i * 16, 34 + i * 16], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)', boxShadow: '0 6px 24px #00000044' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#333', fontSize: 12, fontWeight: 800 }}>DONWAY</span>
                  <span style={{ color: '#999', fontSize: 10 }}>{msg.time}</span>
                </div>
                <div style={{ color: '#111', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{msg.name} 기사님</div>
                <div style={{ color: '#333', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{msg.body}</div>
              </div>
            );
          })}
        </div>

        {/* 통계 그리드 */}
        <div style={{ width: '100%', display: 'flex', gap: 12, opacity: fadeIn(frame, 54, 18) }}>
          {[
            { label: '발송 속도', value: '3초', unit: '' },
            { label: '발송 성공률', value: '99.9', unit: '%' },
            { label: '기사 만족도', value: '4.9', unit: '★' },
          ].map(function(s, i) {
            return (
              <div key={i} style={{ flex: 1, background: '#0d1a28', borderRadius: 16, padding: '18px 12px', textAlign: 'center', border: '1px solid ' + CYAN + '22' }}>
                <div style={{ color: CYAN, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{s.value}<span style={{ fontSize: 14 }}>{s.unit}</span></div>
                <div style={{ color: WHITE + '44', fontSize: 11, marginTop: 6 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* 발송 카운터 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 76, 18) }}>
          <div style={{ background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 28, padding: '16px 44px', display: 'inline-block' }}>
            <span style={{ color: CYAN, fontSize: 22, fontWeight: 800 }}>
              <AnimatedCounter from={0} to={312} startFrame={80} suffix="명" />
            </span>
            <span style={{ color: WHITE + '66', fontSize: 16, marginLeft: 6 }}>동시 발송 완료</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 요금제 — space-evenly 레이아웃 ──────────────────────
function ScenePricing() {
  var frame = useCurrentFrame();
  var tiers = [
    { label: '~50명',  price: '125,000', unit: '/월', highlight: false },
    { label: '~100명', price: '250,000', unit: '/월', highlight: true },
    { label: '~500명', price: '1,250,000', unit: '/월', highlight: false },
  ];
  var features = ['7일 무료체험', '계좌이체 월 갱신', '세금계산서 자동발행', '팝빌 연동', '카카오 알림톡', '기사별 명세서'];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#020b18' }}>
      <Particles count={12} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, ' + BLUE + '0e 0%, transparent 65%)' }} />

      {/* 배지 */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: CYAN + '18', border: '1px solid ' + CYAN + '44', borderRadius: 20, padding: '8px 24px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: CYAN, fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>PRICING</span>
      </div>

      {/* 메인 콘텐츠 — 수직 균등 배분 */}
      <div style={{ position: 'absolute', top: 145, bottom: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '0 36px' }}>

        {/* 타이틀 + 단가 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 12, 18), transform: 'translateY(' + slideUp(frame, 12, 18) + 'px)', width: '100%' }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>기사 1인당</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: CYAN, textShadow: '0 0 26px ' + CYAN + '44' }}>₩2,500</span>
            <span style={{ fontSize: 22, color: WHITE + '66' }}>/월</span>
          </div>
          <div style={{ fontSize: 16, color: WHITE + '55', marginTop: 8 }}>카드 등록 없이 · 7일 무료체험</div>
        </div>

        {/* 구간 카드 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tiers.map(function(tier, i) {
            return (
              <div key={tier.label} style={{ background: tier.highlight ? CYAN + '18' : '#0d1e33', borderRadius: 18, padding: '20px 24px', border: '1.5px solid ' + (tier.highlight ? CYAN + '55' : CYAN + '1e'), display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fadeIn(frame, 28 + i * 12, 18), transform: 'translateX(' + interpolate(frame, [28 + i * 12, 44 + i * 12], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)' }}>
                <span style={{ color: tier.highlight ? CYAN : WHITE + '99', fontSize: 18, fontWeight: 700 }}>{tier.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: tier.highlight ? CYAN : WHITE, fontSize: 24, fontWeight: 900 }}>₩{tier.price}</span>
                  <span style={{ color: WHITE + '44', fontSize: 13, marginLeft: 3 }}>{tier.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 기능 뱃지 */}
        <div style={{ width: '100%', opacity: fadeIn(frame, 66, 18) }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {features.map(function(f, i) {
              return <div key={i} style={{ background: '#0d1a28', borderRadius: 20, padding: '10px 18px', border: '1px solid ' + CYAN + '22', color: WHITE + '88', fontSize: 14, opacity: fadeIn(frame, 70 + i * 3, 12) }}>{f}</div>;
            })}
          </div>
        </div>

        {/* 하단 메시지 */}
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 82, 16) }}>
          <div style={{ color: WHITE + '33', fontSize: 13, letterSpacing: 3 }}>세금계산서 자동발행 · 팝빌 연동</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA ──────────────────────────────────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 32], [0.68, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  var url = 'donway.ai.kr';
  var charsVisible = Math.round(interpolate(frame, [44, 82], [0, url.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [18, 55, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={18} />
      {[0, 0.34, 0.67].map(function(off, i) {
        var f = (frame + off * 120) % 120;
        var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
        var o = interpolate(f, [0, 120], [0.4, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1.5px solid ' + CYAN, transform: 'scale(' + s + ')', opacity: o }} />;
      })}
      <div style={{ transform: 'scale(' + sc + ')', textAlign: 'center', padding: '0 40px' }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: CYAN, letterSpacing: -2, textShadow: '0 0 40px ' + CYAN + '88, 0 0 100px ' + CYAN + '22' }}>DONWAY</div>
        <div style={{ fontSize: 22, color: WHITE, fontWeight: 700, marginTop: -8, marginBottom: 14, opacity: fadeIn(frame, 20, 18) }}>7일 무료체험 시작</div>
        <div style={{ fontSize: 16, color: WHITE + '44', marginBottom: 48, opacity: fadeIn(frame, 28, 18), lineHeight: 1.6 }}>기사 1인당 ₩2,500/월<br/>계좌이체 · 카드 등록 불필요</div>
        <div style={{ background: 'linear-gradient(135deg, ' + BLUE + ', #0284c7)', borderRadius: 24, padding: '22px 68px', fontSize: 26, fontWeight: 900, color: WHITE, opacity: fadeIn(frame, 34, 18), boxShadow: '0 8px 36px ' + BLUE + '55, 0 0 80px ' + BLUE + glowHex, display: 'inline-block', letterSpacing: 0.5, minWidth: 240, textAlign: 'center', marginBottom: 32 }}>
          {url.slice(0, charsVisible)}{charsVisible < url.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', opacity: fadeIn(frame, 55, 18), flexWrap: 'wrap' }}>
          {['📊 자동 정산', '💬 알림톡', '📄 세금계산서'].map(function(t, i) {
            return <div key={i} style={{ background: CYAN + '14', border: '1px solid ' + CYAN + '33', borderRadius: 20, padding: '8px 16px', color: CYAN + 'cc', fontSize: 13 }}>{t}</div>;
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', opacity: fadeIn(frame, 68, 18), color: WHITE + '2a', fontSize: 11, letterSpacing: 5, fontWeight: 300 }}>
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
