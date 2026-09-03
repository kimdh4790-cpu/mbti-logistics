const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing, Audio, staticFile } = require('remotion');

const NAVY = '#08101f';
const GOLD = '#c9a84c';
const WHITE = '#ffffff';
const FONT = "'Noto Sans CJK KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

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
function slideIn(frame, start, dur, fromX) {
  return interpolate(frame, [start, start + dur], [fromX, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

// ── 슬라이드 타입별 씬 컴포넌트 ────────────────────────────────

function SceneHero(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 36], [0.75, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });

  return React.createElement(AbsoluteFill, {
    style: { background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT },
  },
    React.createElement('div', { style: { position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '18 0%, transparent 70%)', pointerEvents: 'none' } }),

    React.createElement('div', { style: { transform: 'scale(' + sc + ')', textAlign: 'center', padding: '0 60px' } },
      slide.tag && React.createElement('div', {
        style: { display: 'inline-block', background: GOLD + '22', border: '1px solid ' + GOLD + '55', borderRadius: 20, padding: '8px 24px', color: GOLD, fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 36 },
      }, slide.tag),

      React.createElement('div', { style: { fontSize: 100, fontWeight: 900, color: GOLD, letterSpacing: -2, textShadow: '0 0 80px ' + GOLD + '44', marginBottom: 20 } }, 'FILO'),

      React.createElement('div', {
        style: { fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.25, whiteSpace: 'pre-line', marginBottom: 20, opacity: fadeIn(frame, 20, 18), transform: 'translateY(' + slideUp(frame, 20, 18) + 'px)' },
      }, slide.title || ''),

      slide.sub && React.createElement('div', {
        style: { fontSize: 22, color: GOLD + 'aa', fontWeight: 500, opacity: fadeIn(frame, 36, 18) },
      }, slide.sub),
    ),

    React.createElement('div', {
      style: { position: 'absolute', bottom: 100, display: 'flex', gap: 12, opacity: fadeIn(frame, 44, 18) },
    },
      ['소프트웨어 설치', 'DINE 앱 포함', '무료 시작'].map(function(tag) {
        return React.createElement('div', { key: tag, style: { background: GOLD + '1a', border: '1px solid ' + GOLD + '33', borderRadius: 16, padding: '8px 18px', color: GOLD, fontSize: 15, fontWeight: 600 } }, tag);
      }),
    ),
  );
}

function SceneFeature(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();

  return React.createElement(AbsoluteFill, {
    style: { background: '#0d1f3a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT },
  },
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.07) 0%, transparent 65%)' } }),

    React.createElement('div', {
      style: { width: 880, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + GOLD + '33', borderLeft: '5px solid ' + GOLD, borderRadius: 24, padding: '64px 56px', opacity: fadeIn(frame, 8, 20), transform: 'translateY(' + slideUp(frame, 8, 20) + 'px)' },
    },
      slide.icon && React.createElement('div', { style: { fontSize: 76, marginBottom: 28 } }, slide.icon),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 900, color: WHITE, lineHeight: 1.2, marginBottom: 28 } }, slide.title || ''),
      React.createElement('div', { style: { fontSize: 26, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, whiteSpace: 'pre-line' } }, slide.desc || ''),
    ),

    React.createElement('div', {
      style: { position: 'absolute', bottom: 80, right: 60, opacity: fadeIn(frame, 30, 16), color: GOLD + '55', fontSize: 13, fontWeight: 700, letterSpacing: 3 },
    }, 'FILO + DINE'),
  );
}

function SceneCompare(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();

  return React.createElement(AbsoluteFill, {
    style: { background: '#080d18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: '0 64px' },
  },
    React.createElement('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: 28 } },
      React.createElement('div', {
        style: { background: 'rgba(200,50,50,0.1)', border: '1px solid rgba(200,50,50,0.28)', borderRadius: 22, padding: '36px 40px', opacity: fadeIn(frame, 8, 18), transform: 'translateX(' + slideIn(frame, 8, 20, -60) + 'px)' },
      },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 800, color: '#ff7777', letterSpacing: 2, marginBottom: 16 } }, '기존 방식'),
        React.createElement('div', { style: { fontSize: 22, color: 'rgba(255,255,255,0.6)', lineHeight: 1.72, whiteSpace: 'pre-line' } }, slide.bad || ''),
      ),

      React.createElement('div', { style: { textAlign: 'center', fontSize: 40, opacity: fadeIn(frame, 24, 12) } }, '↓'),

      React.createElement('div', {
        style: { background: GOLD + '13', border: '2px solid ' + GOLD + '44', borderRadius: 22, padding: '36px 40px', opacity: fadeIn(frame, 30, 18), transform: 'translateX(' + slideIn(frame, 30, 20, 60) + 'px)' },
      },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 800, color: GOLD, letterSpacing: 2, marginBottom: 16 } }, 'FILO + DINE'),
        React.createElement('div', { style: { fontSize: 22, color: WHITE, lineHeight: 1.72, whiteSpace: 'pre-line', fontWeight: 600 } }, slide.good || ''),
      ),
    ),
  );
}

function SceneNotice(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();

  return React.createElement(AbsoluteFill, {
    style: { background: '#0f0c00', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT },
  },
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.09) 0%, transparent 60%)' } }),

    React.createElement('div', {
      style: { width: 820, background: 'rgba(201,168,76,0.07)', border: '2px solid ' + GOLD + '55', borderRadius: 26, padding: '64px 56px', textAlign: 'center', opacity: fadeIn(frame, 8, 20), transform: 'translateY(' + slideUp(frame, 8, 20) + 'px)' },
    },
      slide.icon && React.createElement('div', { style: { fontSize: 84, marginBottom: 28 } }, slide.icon),
      React.createElement('div', { style: { fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1.2, marginBottom: 24 } }, slide.title || ''),
      React.createElement('div', { style: { fontSize: 24, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, whiteSpace: 'pre-line' } }, slide.desc || ''),
    ),
  );
}

function ScenePrice(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();
  var items = [
    { label: '기사', value: slide.driver || '', accent: '#5599ff' },
    { label: '소장', value: slide.dealer || '', accent: GOLD },
    { label: '혜택', value: slide.donway || '', accent: '#44cc77' },
  ];

  return React.createElement(AbsoluteFill, {
    style: { background: '#090e1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: '0 64px' },
  },
    React.createElement('div', { style: { fontSize: 17, fontWeight: 800, color: GOLD, letterSpacing: 3, marginBottom: 44, opacity: fadeIn(frame, 5, 14) } }, '요금 안내'),
    React.createElement('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: 22 } },
      items.map(function(item, i) {
        return React.createElement('div', { key: i,
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + item.accent + '33', borderLeft: '4px solid ' + item.accent, borderRadius: 18, padding: '26px 34px', opacity: fadeIn(frame, 12 + i * 12, 16), transform: 'translateX(' + slideIn(frame, 12 + i * 12, 20, -44) + 'px)' },
        },
          React.createElement('span', { style: { fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.55)' } }, item.label),
          React.createElement('span', { style: { fontSize: 26, fontWeight: 900, color: item.accent } }, item.value),
        );
      }),
    ),
  );
}

function SceneCTA(props) {
  var slide = props.slide;
  var frame = useCurrentFrame();
  var sc = interpolate(frame, [0, 30], [0.75, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });
  var domain = slide.domain || 'filo.ai.kr';
  var charsVisible = Math.round(interpolate(frame, [42, 80], [0, domain.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowAlpha = Math.round(interpolate(frame % 45, [0, 22, 44], [24, 64, 24], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  var glowHex = glowAlpha.toString(16).padStart(2, '0');

  return React.createElement(AbsoluteFill, {
    style: { background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT },
  },
    React.createElement('div', { style: { position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, ' + GOLD + '14 0%, transparent 70%)' } }),

    ...[0, 0.33, 0.66].map(function(off, i) {
      var f = (frame + Math.round(off * 120)) % 120;
      var s = interpolate(f, [0, 120], [0.65, 3.4], { extrapolateRight: 'clamp' });
      var o = interpolate(f, [0, 120], [0.35, 0], { extrapolateRight: 'clamp' });
      return React.createElement('div', { key: i, style: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1.5px solid ' + GOLD, transform: 'scale(' + s + ')', opacity: o } });
    }),

    React.createElement('div', { style: { transform: 'scale(' + sc + ')', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      React.createElement('div', { style: { fontSize: 96, fontWeight: 900, color: GOLD, letterSpacing: -2, textShadow: '0 0 60px ' + GOLD + '88, 0 0 120px ' + GOLD + '22', marginBottom: 12 } }, slide.title || 'FILO'),
      slide.sub && React.createElement('div', {
        style: { fontSize: 24, color: WHITE, fontWeight: 700, marginBottom: 36, opacity: fadeIn(frame, 18, 18), textAlign: 'center', lineHeight: 1.4 },
      }, slide.sub.replace(' — ' + domain, '').replace('— ' + domain, '')),
      React.createElement('div', {
        style: { background: 'linear-gradient(135deg, ' + GOLD + ', #deb95a)', borderRadius: 24, padding: '22px 80px', fontSize: 28, fontWeight: 900, color: NAVY, opacity: fadeIn(frame, 28, 18), boxShadow: '0 10px 48px ' + GOLD + '66, 0 0 90px ' + GOLD + glowHex, letterSpacing: 0.5, minWidth: 260, textAlign: 'center', marginBottom: 20 },
      },
        domain.slice(0, charsVisible),
        charsVisible < domain.length ? React.createElement('span', { style: { opacity: 0.4 } }, '|') : null,
      ),
      React.createElement('div', {
        style: { marginTop: 12, fontSize: 15, color: 'rgba(255,255,255,0.32)', opacity: fadeIn(frame, 65, 18), letterSpacing: 2 },
      }, 'FILO + DINE · 소프트웨어 설치 · 무료 시작'),
    ),
  );
}

function getSceneComponent(type) {
  var map = { hero: SceneHero, feature: SceneFeature, compare: SceneCompare, notice: SceneNotice, price: ScenePrice, cta: SceneCTA };
  return map[type] || SceneFeature;
}

// ── 자막 바 (lines[] 기반) ─────────────────────────────────────
function SubtitleBar(props) {
  var lines = props.lines;
  var frame = useCurrentFrame();
  var fps = useVideoConfig().fps;
  if (!lines || !lines.length) return null;

  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var fromFrame = Math.round(lines[i].startSec * fps);
    var toFrame = i < lines.length - 1 ? Math.round(lines[i + 1].startSec * fps) : fromFrame + fps * 7;
    if (frame >= fromFrame && frame < toFrame) { current = { text: lines[i].text, from: fromFrame, to: toFrame }; break; }
  }
  if (!current) return null;

  var localFrame = frame - current.from;
  var dur = current.to - current.from;
  var op = interpolate(localFrame, [0, 6, Math.max(dur - 6, 7), dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return React.createElement('div', {
    style: { position: 'absolute', bottom: 128, left: 0, right: 0, textAlign: 'center', padding: '0 28px', opacity: op, pointerEvents: 'none', zIndex: 100 },
  }, React.createElement('div', {
    style: { display: 'inline-block', padding: '0 20px', fontSize: 36, fontWeight: 900, color: '#FFE600', lineHeight: 1.4, textShadow: '-3px -3px 0 #000,-3px 3px 0 #000,3px -3px 0 #000,3px 3px 0 #000,0 0 12px rgba(0,0,0,0.8)', fontFamily: FONT },
  }, current.text));
}

// ── 씬 전환 ───────────────────────────────────────────────────
function TransitionOverlay(props) {
  var frame = useCurrentFrame();
  var durationInFrames = useVideoConfig().durationInFrames;
  var end = props.totalFrames || durationInFrames;
  var progress = props.direction === 'out'
    ? interpolate(frame, [end - 15, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return React.createElement(AbsoluteFill, { style: { background: NAVY, opacity: progress, pointerEvents: 'none' } });
}

// ── 기본 슬라이드 (variant A) ──────────────────────────────────
var DEFAULT_SLIDES = [
  { type: 'hero', tag: '필로포스 개발 중', title: '소프트웨어 설치만으로\n매장 통합 관리', sub: 'FILO POS + DINE 앱 포함' },
  { type: 'compare', bad: 'POS 단말기 + 주문 태블릿\n+ 주방 모니터 + 직원 앱 따로따로', good: 'FILO + DINE\n주문 · 결제 · 주방 · 근태 · 급여 통합' },
  { type: 'feature', icon: '📲', title: '소프트웨어 설치 가능', desc: '별도 단말기 없이\n있는 태블릿에 바로 설치' },
  { type: 'feature', icon: '👥', title: '직원 앱 DINE 포함', desc: '직원이 DINE 앱으로\n출퇴근·급여명세 확인' },
  { type: 'cta', title: 'FILO + DINE', sub: '지금 설치 — filo.ai.kr', domain: 'filo.ai.kr' },
];

var DEFAULT_LINES = [
  { startSec: 0.0, text: '매장 운영하다 보면 기기가 너무 많죠?' },
  { startSec: 8.0, text: '이거 다 따로 살 필요 없어요. FILO 하나면 됩니다' },
  { startSec: 15.0, text: '고객이 QR 찍어서 주문하면 주방으로 바로' },
  { startSec: 22.0, text: '매출이랑 재고까지 실시간으로 다 보여요' },
  { startSec: 30.0, text: '매장 운영 진짜 간단해져요 · filo.ai.kr' },
];

// ── 메인 컴포넌트 ──────────────────────────────────────────────
function FiloPromo(props) {
  var hasNarration = props.hasNarration;
  var hasBgm = props.hasBgm;
  var slides = (props.slides && props.slides.length) ? props.slides : DEFAULT_SLIDES;
  var lines  = (props.lines  && props.lines.length)  ? props.lines  : DEFAULT_LINES;
  var config = useVideoConfig();
  var durationInFrames = config.durationInFrames;

  var framesPerSlide = Math.floor(durationInFrames / slides.length);
  var scenes = slides.map(function(slide, i) {
    return {
      slide: slide,
      start: i * framesPerSlide,
      duration: i < slides.length - 1 ? framesPerSlide : durationInFrames - i * framesPerSlide,
    };
  });

  return React.createElement(AbsoluteFill, { style: { background: NAVY } },
    hasNarration && React.createElement(Audio, { src: staticFile('filo-narration.mp3'), volume: 1 }),
    hasBgm && React.createElement(Audio, { src: staticFile('bgm.mp3'), volume: 0.12 }),
    scenes.map(function(scene, idx) {
      var Comp = getSceneComponent(scene.slide.type);
      return React.createElement(Sequence, { key: idx, from: scene.start, durationInFrames: scene.duration },
        React.createElement(Comp, { slide: scene.slide }),
        React.createElement(TransitionOverlay, { direction: 'in', totalFrames: scene.duration }),
        idx < scenes.length - 1 && React.createElement(TransitionOverlay, { direction: 'out', totalFrames: scene.duration }),
      );
    }),
    React.createElement(SubtitleBar, { lines: lines }),
  );
}

module.exports = { FiloPromo };
