// AI 뉴스 속보 스타일 템플릿 — AI 자동화 연구소 채널
// 사용법: generate-and-upload.js --template news
import { AbsoluteFill, Composition, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const C = {
  bg: '#0A0A0A',
  surface: '#141414',
  red: '#E53E3E',
  redDark: '#9B2C2C',
  amber: '#F6AD55',
  text: '#FAFAFA',
  muted: '#A0AEC0',
  ticker: '#1A1A1A',
};

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

function BreakingBanner({ label = '속보' }) {
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: C.red, padding: '6px 20px',
      borderRadius: 4,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: blink ? '#fff' : 'rgba(255,255,255,0.3)',
        transition: 'background 0.1s',
      }} />
      <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '0.12em' }}>
        {label}
      </span>
    </div>
  );
}

function Ticker({ text }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = interpolate(frame, [0, 180], [width, -text.length * 16], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 44, background: C.ticker,
      borderTop: `2px solid ${C.red}`,
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        transform: `translateX(${x}px)`,
        fontFamily: FONT, fontSize: 16, color: C.amber,
        whiteSpace: 'nowrap', fontWeight: 600,
      }}>
        {text}
      </div>
    </div>
  );
}

function NewsIntro({ title, channelName }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 180 } }),
    [0, 1], [40, 0]
  );
  const op = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 100px', opacity: op }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: C.red }} />

      {/* Channel ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <BreakingBanner label="속보" />
        <span style={{ fontFamily: FONT, fontSize: 15, color: C.muted, letterSpacing: '0.08em' }}>
          AI 자동화 연구소
        </span>
      </div>

      {/* Main headline */}
      <div style={{
        fontFamily: FONT, fontSize: 64, fontWeight: 900,
        color: C.text, lineHeight: 1.15,
        transform: `translateY(${titleY}px)`,
        maxWidth: 900,
        marginBottom: 32,
      }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 48, height: 2, background: C.red }} />
        <span style={{ fontFamily: FONT, fontSize: 16, color: C.muted }}>
          소상공인을 위한 AI 뉴스
        </span>
      </div>

      <Ticker text={`AI 자동화 연구소 · 소상공인 AI 자동화 실전 채널 · 매주 최신 AI 트렌드 · ${channelName}`} />
    </AbsoluteFill>
  );
}

function NewsSection({ section, index, total }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panelX = interpolate(
    spring({ frame, fps, config: { damping: 16, stiffness: 200 } }),
    [0, 1], [-80, 0]
  );

  const isStatus = section.spcl_type === 'status';
  const accentColor = isStatus ? C.amber : C.red;

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: op }}>
      {/* Top progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#222' }}>
        <div style={{ height: '100%', width: `${((index + 1) / total) * 100}%`, background: C.red }} />
      </div>

      {/* Left accent stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 44, width: 6, background: accentColor }} />

      {/* Content */}
      <div style={{
        position: 'absolute', top: 60, left: 80, right: 80,
        transform: `translateX(${panelX}px)`,
      }}>
        {/* Section tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: accentColor, padding: '4px 16px',
          borderRadius: 4, marginBottom: 28,
        }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>

        {/* Section title */}
        <div style={{
          fontFamily: FONT, fontSize: 52, fontWeight: 900,
          color: C.text, lineHeight: 1.2, marginBottom: 36,
          maxWidth: 880,
        }}>{section.title}</div>

        {/* Visual box */}
        <div style={{
          background: C.surface,
          border: `1px solid #2A2A2A`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: 8,
          padding: '24px 32px',
          maxWidth: 800,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 20, color: C.muted, lineHeight: 1.6 }}>
            {section.visual}
          </div>
        </div>
      </div>

      {/* Narration subtitle */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        background: 'rgba(10,10,10,0.92)',
        borderBottom: `3px solid ${accentColor}`,
        padding: '18px 28px',
        borderRadius: 8,
      }}>
        <div style={{ fontFamily: FONT, fontSize: 21, color: C.text, lineHeight: 1.55 }}>
          {section.narration}
        </div>
      </div>

      <Ticker text={`AI 자동화 연구소 · 소상공인 AI 자동화 실전 채널`} />
    </AbsoluteFill>
  );
}

function NewsOutro({ cta }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32, opacity: op }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: C.red }} />
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 14, color: C.red, letterSpacing: '0.15em', marginBottom: 16 }}>AI 자동화 연구소</div>
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: C.text, marginBottom: 24, maxWidth: 700, lineHeight: 1.2 }}>
          {cta}
        </div>
        <div style={{
          display: 'inline-block', background: C.red,
          color: '#fff', fontFamily: FONT, fontSize: 20, fontWeight: 700,
          padding: '14px 44px', borderRadius: 6,
        }}>구독 + 좋아요 눌러주세요 🔔</div>
      </div>
    </AbsoluteFill>
  );
}

export function AINewsVideo({ script }) {
  const { fps } = useVideoConfig();
  const INTRO = fps * 4;
  const OUTRO = fps * 5;
  const sections = script?.sections || [];
  const secFrames = sections.map(s => Math.round((s.duration_sec || 55) * fps));
  const total = INTRO + secFrames.reduce((a, b) => a + b, 0) + OUTRO;

  let cur = INTRO;
  return (
    <>
      <Sequence from={0} durationInFrames={INTRO}>
        <NewsIntro title={script?.title || 'AI 자동화 트렌드'} channelName="AI 자동화 연구소" />
      </Sequence>
      {sections.map((s, i) => {
        const start = cur;
        const dur = secFrames[i];
        cur += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <NewsSection section={s} index={i} total={sections.length} />
          </Sequence>
        );
      })}
      <Sequence from={total - OUTRO} durationInFrames={OUTRO}>
        <NewsOutro cta={script?.cta || '매주 AI 트렌드를 놓치지 마세요'} />
      </Sequence>
    </>
  );
}

export const RemotionRoot = () => (
  <Composition
    id="AINewsVideo"
    component={AINewsVideo}
    durationInFrames={30 * 60 * 8}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ script: null }}
  />
);
