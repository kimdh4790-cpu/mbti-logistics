const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing } = require('remotion');

const WHITE = '#ffffff';
const DARK  = '#000d1a';
const BLUE  = '#2563eb';
const LTBLUE = '#60a5fa';
const ORANGE = '#f97316';

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

function Phone({ children, scale }) {
  var s = scale || 1;
  return (
    <div style={{
      width: 300 * s, height: 560 * s,
      background: '#0a1220',
      borderRadius: 36 * s,
      border: '2.5px solid #1e3a5f',
      boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
      overflow: 'hidden', position: 'relative', flexShrink: 0,
    }}>
      {/* status bar */}
      <div style={{ height: 24 * s, background: '#060e1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 ' + (14 * s) + 'px' }}>
        <span style={{ fontSize: 10 * s, color: WHITE, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 9 * s, color: '#94a3b8' }}>용차앱</span>
        <span style={{ fontSize: 9 * s, color: WHITE }}>100%</span>
      </div>
      <div style={{ width: '100%', height: (560 - 24) * s, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

function TabBar({ active, scale }) {
  var s = scale || 1;
  var tabs = [
    { label: '홈', icon: '⌂' },
    { label: '공고', icon: '≡' },
    { label: '배송', icon: '◎' },
    { label: '정산', icon: '₩' },
    { label: '내정보', icon: '·' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52 * s, background: '#0f1a2e', borderTop: '1px solid #1e3a5f', display: 'flex' }}>
      {tabs.map(function(t, i) {
        var isActive = t.label === active;
        return (
          <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 14 * s, color: isActive ? BLUE : '#475569' }}>{t.icon}</span>
            <span style={{ fontSize: 9 * s, color: isActive ? BLUE : '#475569', fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Scene 1: Hook ────────────────────────────────────────────
function SceneDriverHook() {
  var frame = useCurrentFrame();
  var op1 = fadeIn(frame, 10, 22);
  var y1  = slideUp(frame, 10, 24);
  var op2 = fadeIn(frame, 38, 22);
  var y2  = slideUp(frame, 38, 24);
  var op3 = fadeIn(frame, 68, 22);
  var y3  = slideUp(frame, 68, 24);
  var badgeOp = fadeIn(frame, 100, 20);
  var badgeSc = interpolate(frame, [100, 118], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, ' + BLUE + '28 0%, transparent 65%)' }} />

      <div style={{ textAlign: 'center', padding: '0 48px' }}>
        <div style={{ transform: 'translateY(' + y1 + 'px)', opacity: op1, marginBottom: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>기사님,</span>
        </div>
        <div style={{ transform: 'translateY(' + y2 + 'px)', opacity: op2, marginBottom: 6 }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>직접 연결하고</span>
        </div>
        <div style={{ transform: 'translateY(' + y3 + 'px)', opacity: op3, marginBottom: 40 }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: LTBLUE, lineHeight: 1.15, textShadow: '0 0 32px ' + LTBLUE + '66' }}>수수료 0원</span>
        </div>
        <div style={{ transform: 'scale(' + badgeSc + ')', opacity: badgeOp }}>
          <div style={{ display: 'inline-block', background: ORANGE, borderRadius: 50, padding: '14px 40px', boxShadow: '0 8px 32px rgba(249,115,22,0.45)' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: WHITE }}>2026년 완전 무료</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 20, color: LTBLUE, opacity: fadeIn(frame, 130, 20) }}>기사가 보는 용차앱</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: 홈 화면 ─────────────────────────────────────────
function SceneDriverHome() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var labelOp = fadeIn(frame, 50, 20);
  var s = 0.92;

  return (
    <AbsoluteFill style={{ ...BASE, background: '#000d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 60%, ' + BLUE + '18 0%, transparent 55%)' }} />

      {/* label */}
      <div style={{ opacity: labelOp, textAlign: 'center', zIndex: 10, marginBottom: -12 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>홈 화면</span>
      </div>

      {/* phone */}
      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          {/* App content */}
          <div style={{ background: '#f0f4ff', height: '100%', paddingBottom: 52 * s, overflowY: 'hidden', position: 'relative' }}>
            {/* header */}
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', padding: '14px 16px 14px', color: WHITE }}>
              <div style={{ fontSize: 13 * s, fontWeight: 900 }}>안녕하세요, 기사님!</div>
              <div style={{ fontSize: 10 * s, opacity: 0.8, marginTop: 2 }}>부산광역시 · 오늘도 수고하세요</div>
            </div>
            {/* 예상 수입 카드 */}
            <div style={{ margin: '10px 10px 0', background: WHITE, borderRadius: 12 * s, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 10 * s, color: '#64748b', marginBottom: 4 }}>오늘 예상 수입</div>
              <div style={{ fontSize: 26 * s, fontWeight: 900, color: '#1d4ed8' }}>₩ 210,000</div>
              <div style={{ fontSize: 9 * s, color: '#10b981', marginTop: 3 }}>▲ 어제보다 ₩32,000 많아요</div>
            </div>
            {/* 날씨 */}
            <div style={{ margin: '8px 10px 0', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', borderRadius: 10 * s, padding: '10px 14px', color: WHITE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9 * s, opacity: 0.85 }}>오늘 날씨 · 부산</div>
                <div style={{ fontSize: 14 * s, fontWeight: 700 }}>맑음 19°C</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9 * s, opacity: 0.85 }}>강수확률</div>
                <div style={{ fontSize: 18 * s, fontWeight: 900 }}>5%</div>
              </div>
            </div>
            {/* 지도 */}
            <div style={{ margin: '8px 10px 0', background: '#d1e8d1', borderRadius: 10 * s, height: 110 * s, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0,0,0,0.04) 18px, rgba(0,0,0,0.04) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.04) 18px, rgba(0,0,0,0.04) 19px)' }} />
              <div style={{ position: 'absolute', top: '40%', left: '52%', width: 20, height: 20, background: '#1d4ed8', borderRadius: '50%', border: '2px solid white', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: 5, left: 6, background: 'white', borderRadius: 4, padding: '2px 5px', fontSize: 8 * s, color: '#334155', fontWeight: 600 }}>부산광역시 현재 위치</div>
            </div>
          </div>
          <TabBar active="홈" scale={s} />
        </Phone>
      </div>

      {/* annotation */}
      <div style={{ opacity: fadeIn(frame, 80, 20), textAlign: 'center', zIndex: 10 }}>
        <span style={{ fontSize: 18, color: '#94a3b8' }}>예상 수입 · 날씨 · 실시간 지도</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: 공고 목록 ───────────────────────────────────────
function SceneDriverJobs() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var chip1Op = fadeIn(frame, 50, 18);
  var chip2Op = fadeIn(frame, 70, 18);
  var s = 0.92;

  return (
    <AbsoluteFill style={{ ...BASE, background: '#00080f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 40%, ' + ORANGE + '22 0%, transparent 55%)' }} />

      <div style={{ opacity: fadeIn(frame, 6, 18), textAlign: 'center', zIndex: 10, marginBottom: -10 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>공고 목록</span>
      </div>

      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          <div style={{ background: '#f8faff', height: '100%', paddingBottom: 52 * s }}>
            {/* tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: WHITE }}>
              {['전체', '모집중', '운행중', '완료'].map(function(t, i) {
                return (
                  <div key={t} style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 10 * s, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#1d4ed8' : '#94a3b8', borderBottom: i === 0 ? '2px solid #1d4ed8' : '2px solid transparent' }}>
                    {t}
                  </div>
                );
              })}
            </div>
            {/* 공고 카드 */}
            <div style={{ margin: '10px 10px 0', background: WHITE, borderRadius: 12 * s, padding: '12px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 11 * s, fontWeight: 900, color: '#0f172a', lineHeight: 1.3, flex: 1 }}>연산동 쌍미천로 215D<br /><span style={{ color: '#475569', fontWeight: 400 }}>부산</span></span>
                <span style={{ fontSize: 10 * s, color: '#1d4ed8', fontWeight: 700, background: '#eff6ff', padding: '3px 7px', borderRadius: 20 }}>모집중</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 9 * s, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 10 }}>단독주택 중심</span>
                <span style={{ fontSize: 9 * s, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 10 }}>2026.10.01~10.31</span>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 9 * s, color: '#64748b' }}>건당 단가</span>
                  <span style={{ fontSize: 11 * s, fontWeight: 900, color: '#1d4ed8' }}>690원 / 건 (VAT 포함)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 9 * s, color: '#64748b' }}>소장 제시 최저</span>
                  <span style={{ fontSize: 10 * s, fontWeight: 700, color: '#0f172a' }}>18만원 / 일</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9 * s, color: '#64748b' }}>예상 수입</span>
                  <span style={{ fontSize: 12 * s, fontWeight: 900, color: '#16a34a' }}>21만원 / 일</span>
                </div>
              </div>
              <div style={{ marginTop: 10, background: '#1d4ed8', borderRadius: 8 * s, padding: '8px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 11 * s, fontWeight: 900, color: WHITE }}>지원하기</span>
              </div>
            </div>
          </div>
          <TabBar active="공고" scale={s} />
        </Phone>
      </div>

      {/* floating chips */}
      <div style={{ position: 'absolute', right: 60, top: '36%', opacity: chip1Op, transform: 'rotate(4deg)', zIndex: 20 }}>
        <div style={{ background: '#16a34a', borderRadius: 12, padding: '10px 18px', boxShadow: '0 8px 24px rgba(22,163,74,0.4)' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>예상 21만원/일</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 50, bottom: '28%', opacity: chip2Op, transform: 'rotate(-3deg)', zIndex: 20 }}>
        <div style={{ background: '#1d4ed8', borderRadius: 12, padding: '10px 18px', boxShadow: '0 8px 24px rgba(29,78,216,0.4)' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>690원/건 직접 계약</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 그리드 메뉴 / AI 기능 ──────────────────────────
function SceneDriverGrid() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var s = 0.92;

  var gridItems = [
    { icon: '⊞', label: '월 대시보드', color: '#1d4ed8' },
    { icon: '♡', label: '찜한 공고',   color: '#e11d48' },
    { icon: '📋', label: '공고/이력서', color: '#7c3aed' },
    { icon: '₩',  label: '실수령액',   color: '#059669' },
    { icon: '✓',  label: '지원 현황',  color: '#0891b2' },
    { icon: '◈',  label: 'ROUTE IQ',  color: '#ea580c' },
    { icon: '◎',  label: 'AI 코치',    color: '#7c3aed' },
    { icon: '▷',  label: '용차 등록',  color: '#0369a1' },
    { icon: '≡',  label: '소득장부',   color: '#15803d' },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#040b18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, #7c3aed28 0%, transparent 60%)' }} />

      <div style={{ opacity: fadeIn(frame, 6, 18), textAlign: 'center', zIndex: 10, marginBottom: -10 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>AI 기능 그리드</span>
      </div>

      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          <div style={{ background: '#f0f4ff', height: '100%', paddingBottom: 52 * s }}>
            {/* urgent buttons */}
            <div style={{ display: 'flex', gap: 8 * s, margin: '10px 10px 0' }}>
              <div style={{ flex: 1, background: ORANGE, borderRadius: 10 * s, padding: '10px 8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
                <div style={{ fontSize: 8 * s, color: WHITE, fontWeight: 700 }}>긴급 요청 수락</div>
              </div>
              <div style={{ flex: 1, background: '#1d4ed8', borderRadius: 10 * s, padding: '10px 8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(29,78,216,0.4)' }}>
                <div style={{ fontSize: 8 * s, color: WHITE, fontWeight: 700 }}>내비게이션 시작</div>
              </div>
            </div>
            {/* 3x3 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 * s, margin: '8px 10px 0' }}>
              {gridItems.map(function(item, i) {
                var itemOp = fadeIn(frame, 20 + i * 6, 16);
                return (
                  <div key={item.label} style={{ opacity: itemOp, background: WHITE, borderRadius: 10 * s, padding: '10px 6px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 16 * s, marginBottom: 3 }}>{item.icon}</div>
                    <div style={{ fontSize: 8 * s, color: '#374151', fontWeight: 600, lineHeight: 1.2 }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <TabBar active="홈" scale={s} />
        </Phone>
      </div>

      <div style={{ opacity: fadeIn(frame, 80, 20), textAlign: 'center', zIndex: 10 }}>
        <span style={{ fontSize: 18, color: '#94a3b8' }}>AI 코치 · ROUTE IQ · 소득장부</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA ─────────────────────────────────────────────
function SceneDriverCTA() {
  var frame = useCurrentFrame();
  var titleOp = fadeIn(frame, 10, 24);
  var titleY  = slideUp(frame, 10, 26);
  var sub1Op  = fadeIn(frame, 40, 22);
  var sub2Op  = fadeIn(frame, 58, 22);
  var btnOp   = fadeIn(frame, 80, 22);
  var btnSc   = interpolate(frame, [80, 100], [0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var freeOp  = fadeIn(frame, 112, 20);

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, ' + BLUE + '30 0%, transparent 60%)' }} />

      <div style={{ textAlign: 'center', padding: '0 48px', zIndex: 10 }}>
        <div style={{ transform: 'translateY(' + titleY + 'px)', opacity: titleOp, marginBottom: 20 }}>
          <div style={{ fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>기사로 가입하고</div>
          <div style={{ fontSize: 58, fontWeight: 900, color: LTBLUE, lineHeight: 1.15, textShadow: '0 0 40px ' + LTBLUE + '55' }}>바로 일 시작!</div>
        </div>

        <div style={{ opacity: sub1Op, marginBottom: 8 }}>
          <span style={{ fontSize: 22, color: '#94a3b8' }}>수수료 없는 직접 거래</span>
        </div>
        <div style={{ opacity: sub2Op, marginBottom: 36 }}>
          <span style={{ fontSize: 22, color: '#94a3b8' }}>AI 노선 코치 · ROUTE IQ 무료 제공</span>
        </div>

        <div style={{ transform: 'scale(' + btnSc + ')', opacity: btnOp, marginBottom: 20 }}>
          <div style={{ background: BLUE, borderRadius: 50, padding: '18px 52px', display: 'inline-block', boxShadow: '0 12px 40px rgba(37,99,235,0.5)' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: WHITE }}>yongcha.app 무료 가입</span>
          </div>
        </div>

        <div style={{ opacity: freeOp, background: '#16a34a22', border: '1px solid #16a34a44', borderRadius: 16, padding: '12px 28px', display: 'inline-block' }}>
          <span style={{ fontSize: 18, color: '#4ade80', fontWeight: 700 }}>2026년 한 해 동안 완전 무료</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Root export ───────────────────────────────────────────────
function YongchaDriverPromo(props) {
  var hasNarration = props.hasNarration;
  return (
    <AbsoluteFill>
      <Sequence from={0}    durationInFrames={300}  ><SceneDriverHook /></Sequence>
      <Sequence from={300}  durationInFrames={360}  ><SceneDriverHome /></Sequence>
      <Sequence from={660}  durationInFrames={360}  ><SceneDriverJobs /></Sequence>
      <Sequence from={1020} durationInFrames={360}  ><SceneDriverGrid /></Sequence>
      <Sequence from={1380} durationInFrames={420}  ><SceneDriverCTA /></Sequence>
    </AbsoluteFill>
  );
}

module.exports = { YongchaDriverPromo };
