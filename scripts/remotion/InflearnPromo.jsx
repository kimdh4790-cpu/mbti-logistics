const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const DARK  = '#08101f';
const GOLD  = '#c9a84c';
const LTGLD = '#f0d070';
const WHITE = '#ffffff';
const TEAL  = '#2dd4bf';

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
      style: { position: 'absolute', left: x + '%', top: y + '%', width: size, height: size, borderRadius: '50%', background: TEAL, opacity: opacity },
    }));
  }
  return React.createElement(AbsoluteFill, { style: { pointerEvents: 'none' } }, items);
}

// ── Scene 1: 훅 ──────────────────────────────────────────────
function SceneHook() {
  var frame = useCurrentFrame();
  var lines = [
    '부가세 신고할 때마다',
    '엑셀 수식 틀릴까봐',
    '직원 급여 계산 또 실수?',
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#060d18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={10} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, ' + TEAL + '12 0%, transparent 65%)' }} />

      {/* 상단 배지 */}
      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', background: TEAL + '1a', border: '1px solid ' + TEAL + '44', borderRadius: 20, padding: '8px 28px', opacity: fadeIn(frame, 5, 14) }}>
        <span style={{ color: TEAL, fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>소상공인 자동화 도구</span>
      </div>

      <div style={{ textAlign: 'center', padding: '0 52px' }}>
        {/* 공감 문구 */}
        <div style={{ marginBottom: 48 }}>
          {lines.map(function(line, i) {
            return (
              <div key={i} style={{
                fontSize: 38, fontWeight: 800, color: WHITE + 'cc', lineHeight: 1.45,
                opacity: fadeIn(frame, 12 + i * 20, 18),
                transform: 'translateY(' + slideUp(frame, 12 + i * 20, 18) + 'px)',
              }}>{line}</div>
            );
          })}
        </div>

        {/* 강조 */}
        <div style={{ opacity: fadeIn(frame, 72, 22), transform: 'translateY(' + slideUp(frame, 72, 22) + 'px)' }}>
          <div style={{ fontSize: 58, fontWeight: 900, color: LTGLD, lineHeight: 1.15, textShadow: '0 0 30px ' + GOLD + '55' }}>
            이제 엑셀이<br/>알아서 합니다
          </div>
        </div>

        {/* 서브 */}
        <div style={{ marginTop: 32, opacity: fadeIn(frame, 98, 20) }}>
          <div style={{ fontSize: 18, color: TEAL + 'bb', letterSpacing: 1 }}>6가지 자동화 툴 · 인프런 단독 판매</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: 6개 클립 쇼케이스 ──────────────────────────────
function SceneClips() {
  var frame = useCurrentFrame();
  var clips = [
    { icon: '📊', title: 'n8n 카카오 알림톡', sub: '워크플로우 3종', price: '22,000', color: '#f59e0b' },
    { icon: '💰', title: '급여명세서 자동계산', sub: '4대보험 완전 자동', price: '19,000', color: '#10b981' },
    { icon: '🧾', title: '부가세 신고 자동화', sub: '납부세액 자동 산출', price: '25,000', color: '#3b82f6' },
    { icon: '📒', title: '경비 장부 자동계산', sub: '세금공제 기준 포함', price: '15,000', color: '#8b5cf6' },
    { icon: '☁️', title: 'Oracle 무료 서버', sub: '4코어 24GB 영구무료', price: '22,000', color: '#06b6d4' },
    { icon: '🤖', title: 'AI 프롬프트 100선', sub: '8개 카테고리 즉시 사용', price: '29,000', color: GOLD },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#070f1c' }}>
      <Particles count={8} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, ' + TEAL + '0e 0%, transparent 60%)' }} />

      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: TEAL + '18', border: '1px solid ' + TEAL + '44', borderRadius: 20, padding: '8px 28px', opacity: fadeIn(frame, 5, 14), whiteSpace: 'nowrap' }}>
        <span style={{ color: TEAL, fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>6가지 자동화 도구</span>
      </div>

      <div style={{ position: 'absolute', top: 152, left: 36, right: 36, bottom: 180 }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 28, opacity: fadeIn(frame, 8, 18), transform: 'translateY(' + slideUp(frame, 8, 18) + 'px)' }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>
            소상공인 필수<br/><span style={{ color: LTGLD }}>자동화 툴킷</span>
          </div>
        </div>

        {/* 클립 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {clips.map(function(clip, i) {
            return (
              <div key={i} style={{
                background: '#0d1a28',
                borderRadius: 18,
                padding: '16px 20px',
                border: '1px solid ' + clip.color + '33',
                display: 'flex', alignItems: 'center', gap: 16,
                opacity: fadeIn(frame, 18 + i * 12, 16),
                transform: 'translateX(' + interpolate(frame, [18 + i * 12, 32 + i * 12], [-24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px)',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: clip.color + '22', border: '1px solid ' + clip.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{clip.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: WHITE, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{clip.title}</div>
                  <div style={{ color: WHITE + '55', fontSize: 12, marginTop: 3 }}>{clip.sub}</div>
                </div>
                <div style={{ color: clip.color, fontSize: 16, fontWeight: 900, flexShrink: 0 }}>₩{clip.price}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: 베스트 픽 ───────────────────────────────────────
function SceneBest() {
  var frame = useCurrentFrame();
  var highlights = [
    {
      rank: '1', icon: '🤖', title: 'AI 프롬프트 100선',
      points: ['마케팅·SNS 15개', '계약·법무 12개', '고객응대 13개', '대괄호 변수 치환 즉시 사용'],
      price: '29,000', color: GOLD,
    },
    {
      rank: '2', icon: '📊', title: 'n8n 카카오 알림톡',
      points: ['구글시트 → 알림톡 자동', '월 0원 서버 운영', '워크플로우 3종 포함'],
      price: '22,000', color: '#f59e0b',
    },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#060d18' }}>
      <Particles count={9} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, ' + GOLD + '0e 0%, transparent 65%)' }} />

      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', background: GOLD + '18', border: '1px solid ' + GOLD + '44', borderRadius: 20, padding: '8px 28px', opacity: fadeIn(frame, 5, 14), whiteSpace: 'nowrap' }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>BEST PICK</span>
      </div>

      <div style={{ position: 'absolute', top: 152, left: 36, right: 36, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
        <div style={{ textAlign: 'center', opacity: fadeIn(frame, 8, 18), transform: 'translateY(' + slideUp(frame, 8, 18) + 'px)' }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>가장 많이 찾는<br/><span style={{ color: LTGLD }}>인기 자료</span></div>
        </div>

        {highlights.map(function(h, i) {
          return (
            <div key={i} style={{
              background: i === 0 ? GOLD + '14' : '#0d1a28',
              borderRadius: 24, padding: '28px 24px',
              border: '1.5px solid ' + (i === 0 ? GOLD + '55' : GOLD + '22'),
              opacity: fadeIn(frame, 24 + i * 30, 22),
              transform: 'translateY(' + slideUp(frame, 24 + i * 30, 22) + 'px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: h.color + '22', border: '1px solid ' + h.color + '55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{h.icon}</div>
                <div>
                  <div style={{ color: h.color, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>BEST {h.rank}</div>
                  <div style={{ color: WHITE, fontSize: 18, fontWeight: 800 }}>{h.title}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: LTGLD, fontSize: 20, fontWeight: 900 }}>₩{h.price}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {h.points.map(function(p, j) {
                  return (
                    <div key={j} style={{ background: '#0a1628', borderRadius: 12, padding: '6px 14px', color: WHITE + '88', fontSize: 12, border: '1px solid ' + h.color + '22' }}>✓ {p}</div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 총 가격 요약 */}
        <div style={{ background: '#0a1628', borderRadius: 18, padding: '20px 24px', border: '1px solid ' + TEAL + '33', opacity: fadeIn(frame, 88, 22), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: WHITE + '88', fontSize: 15 }}>6개 전체 구매 시</div>
          <div>
            <span style={{ color: WHITE + '44', fontSize: 14, textDecoration: 'line-through', marginRight: 8 }}>₩132,000</span>
            <span style={{ color: TEAL, fontSize: 24, fontWeight: 900 }}>개별 구매 가능</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: CTA ─────────────────────────────────────────────
function SceneCTA() {
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 32], [0.72, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [18, 55, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');
  var keyword = '인프런 소상공인 자동화';
  var charsVisible = Math.round(interpolate(frame, [36, 82], [0, keyword.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={16} />
      {[0, 0.33, 0.66].map(function(off, i) {
        var f = (frame + off * 120) % 120;
        var s = interpolate(f, [0, 120], [0.65, 3.2], { extrapolateRight: 'clamp' });
        var o = interpolate(f, [0, 120], [0.4, 0], { extrapolateRight: 'clamp' });
        return <div key={i} style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1.5px solid ' + TEAL, transform: 'scale(' + s + ')', opacity: o }} />;
      })}

      <div style={{ transform: 'scale(' + sc + ')', textAlign: 'center', padding: '0 44px' }}>
        <div style={{ fontSize: 22, color: TEAL, fontWeight: 800, marginBottom: 14, opacity: fadeIn(frame, 8, 18), letterSpacing: 1 }}>
          인프런에서 지금 바로
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, color: LTGLD, letterSpacing: -2, textShadow: '0 0 40px ' + GOLD + '88', lineHeight: 1, marginBottom: 8 }}>
          소상공인<br/>자동화
        </div>
        <div style={{ fontSize: 20, color: WHITE + '77', marginBottom: 36, opacity: fadeIn(frame, 20, 18) }}>
          6가지 툴 · 즉시 다운로드
        </div>

        {/* 검색 키워드 박스 */}
        <div style={{
          background: 'linear-gradient(135deg, ' + TEAL + '22, ' + GOLD + '22)',
          border: '1.5px solid ' + TEAL + '55',
          borderRadius: 20, padding: '18px 36px',
          fontSize: 22, fontWeight: 900, color: WHITE,
          opacity: fadeIn(frame, 28, 18),
          boxShadow: '0 8px 36px ' + TEAL + '33, 0 0 80px ' + TEAL + glowHex,
          marginBottom: 12, display: 'inline-block',
        }}>
          🔍 {keyword.slice(0, charsVisible)}{charsVisible < keyword.length ? <span style={{ opacity: 0.4 }}>|</span> : null}
        </div>

        <div style={{ fontSize: 15, color: WHITE + '44', marginBottom: 36, opacity: fadeIn(frame, 44, 18) }}>
          inflearn.com 에서 검색하세요
        </div>

        {/* 태그 */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', opacity: fadeIn(frame, 52, 22) }}>
          {['📊 엑셀 템플릿', '🤖 AI 프롬프트', '☁️ 서버 가이드', '📊 n8n 자동화'].map(function(t, i) {
            return (
              <div key={i} style={{ background: TEAL + '14', border: '1px solid ' + TEAL + '33', borderRadius: 20, padding: '10px 18px', color: TEAL + 'cc', fontSize: 14, fontWeight: 600 }}>{t}</div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 56, opacity: fadeIn(frame, 68, 20), color: WHITE + '2a', fontSize: 11, letterSpacing: 5 }}>
        POWERED BY MBTICO
      </div>
    </AbsoluteFill>
  );
}

var SUBTITLES_DATA = [
  { from: 0,   to: 90,  text: "부가세 계산 또 헷갈리세요?" },
  { from: 90,  to: 150, text: "직원 급여 계산 실수 걱정되세요?" },
  { from: 150, to: 210, text: "엑셀이 알아서 다 해줍니다" },
  { from: 210, to: 360, text: "소상공인 자동화 툴 6가지" },
  { from: 360, to: 480, text: "n8n 카카오 알림톡부터" },
  { from: 480, to: 570, text: "AI 프롬프트 100선까지" },
  { from: 570, to: 660, text: "인기 자료 베스트 픽" },
  { from: 660, to: 780, text: "각 자료 개별 구매 가능해요" },
  { from: 780, to: 900, text: "인프런에서 '소상공인 자동화' 검색" },
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

function InflearnPromo(props) {
  var hasNarration = props.hasNarration;
  var hasBgm = props.hasBgm;
  var SCENES = [
    { component: SceneHook,  start: 0,   duration: 150 },
    { component: SceneClips, start: 150, duration: 210 },
    { component: SceneBest,  start: 360, duration: 300 },
    { component: SceneCTA,   start: 660, duration: 240 },
  ];
  return (
    <AbsoluteFill style={{ background: DARK }}>
      {hasNarration && <Audio src={staticFile('inflearn-narration.mp3')} volume={1} />}
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

module.exports = { InflearnPromo };
