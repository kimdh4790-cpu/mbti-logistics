// 실용 팁 카드 스타일 템플릿 — AI 자동화 연구소 채널
// 사용법: generate-and-upload.js --template tips
import { AbsoluteFill, Composition, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const C = {
  bg: '#0F1117',
  surface: '#1A1D27',
  card: '#232637',
  teal: '#38BDF8',
  green: '#34D399',
  orange: '#FB923C',
  text: '#F8FAFC',
  muted: '#94A3B8',
  border: '#2D3149',
};

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const TIP_ICONS = ['💡', '⚡', '🎯', '🔑', '🚀', '✅'];

function TipsIntro({ title }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <AbsoluteFill style={{ background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, opacity: op }}>
      {/* Channel badge */}
      <div style={{
        background: `linear-gradient(135deg, ${C.teal}22, ${C.green}22)`,
        border: `1px solid ${C.teal}44`,
        borderRadius: 100,
        padding: '8px 24px',
        fontFamily: FONT, fontSize: 14, color: C.teal,
        letterSpacing: '0.12em', fontWeight: 600,
      }}>AI 자동화 연구소</div>

      {/* Main title */}
      <div style={{
        fontFamily: FONT, fontSize: 58, fontWeight: 900,
        color: C.text, lineHeight: 1.2,
        textAlign: 'center', maxWidth: 860,
        transform: `scale(${titleScale})`,
      }}>{title}</div>

      {/* Accent line */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[C.teal, C.green, C.orange].map((color, i) => (
          <div key={i} style={{ width: 48, height: 4, borderRadius: 2, background: color }} />
        ))}
      </div>

      <div style={{ fontFamily: FONT, fontSize: 18, color: C.muted }}>
        소상공인 실전 AI 자동화 팁
      </div>
    </AbsoluteFill>
  );
}

function TipsSection({ section, index, total }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const icon = TIP_ICONS[index % TIP_ICONS.length];
  const accentColors = [C.teal, C.green, C.orange, C.teal, C.green, C.orange];
  const accent = accentColors[index % accentColors.length];

  // Staggered card animation
  const cardY = interpolate(
    spring({ frame, fps, config: { damping: 15, stiffness: 180 } }),
    [0, 1], [50, 0]
  );

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: op }}>
      {/* Top progress dots */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === index ? 28 : 8, height: 8,
            borderRadius: 4,
            background: i === index ? accent : C.border,
            transition: 'width 0.3s',
          }} />
        ))}
      </div>

      {/* Content area */}
      <div style={{
        position: 'absolute', top: 80, left: 100, right: 100,
        transform: `translateY(${cardY}px)`,
      }}>
        {/* Tip number + icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `${accent}22`, border: `2px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>{icon}</div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: accent, letterSpacing: '0.14em', fontWeight: 700 }}>
              TIP {String(index + 1).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 900, color: C.text, marginTop: 4 }}>
              {section.title}
            </div>
          </div>
        </div>

        {/* Visual card */}
        <div style={{
          background: C.card,
          borderRadius: 16,
          padding: '28px 36px',
          border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${accent}`,
          maxWidth: 860,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 20, color: C.muted, lineHeight: 1.7 }}>
            {section.visual}
          </div>
        </div>
      </div>

      {/* Narration */}
      <div style={{
        position: 'absolute', bottom: 48, left: 100, right: 100,
        background: `${C.surface}F0`,
        borderRadius: 12,
        padding: '20px 32px',
        border: `1px solid ${C.border}`,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontFamily: FONT, fontSize: 22, color: C.text, lineHeight: 1.55 }}>
          {section.narration}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TipsOutro({ cta }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const items = [
    { color: C.teal, text: '구독하면 매주 AI 팁이 옵니다' },
    { color: C.green, text: '좋아요로 더 많은 사람에게 도움 주세요' },
    { color: C.orange, text: 'filo.ai.kr 에서 무료로 시작' },
  ];

  return (
    <AbsoluteFill style={{ background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40, opacity: op }}>
      <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 900, color: C.text, textAlign: 'center', maxWidth: 700, lineHeight: 1.2 }}>
        {cta}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span style={{ fontFamily: FONT, fontSize: 20, color: C.muted }}>{item.text}</span>
          </div>
        ))}
      </div>
      <div style={{
        background: `linear-gradient(135deg, ${C.teal}, ${C.green})`,
        color: '#fff', fontFamily: FONT, fontSize: 20, fontWeight: 700,
        padding: '14px 44px', borderRadius: 12,
      }}>🔔 지금 구독하기</div>
    </AbsoluteFill>
  );
}

export function AITipsVideo({ script }) {
  const { fps } = useVideoConfig();
  const INTRO = fps * 3;
  const OUTRO = fps * 5;
  const sections = script?.sections || [];
  const secFrames = sections.map(s => Math.round((s.duration_sec || 60) * fps));
  const total = INTRO + secFrames.reduce((a, b) => a + b, 0) + OUTRO;

  let cur = INTRO;
  return (
    <>
      <Sequence from={0} durationInFrames={INTRO}>
        <TipsIntro title={script?.title || 'AI 자동화 실전 팁'} />
      </Sequence>
      {sections.map((s, i) => {
        const start = cur;
        const dur = secFrames[i];
        cur += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <TipsSection section={s} index={i} total={sections.length} />
          </Sequence>
        );
      })}
      <Sequence from={total - OUTRO} durationInFrames={OUTRO}>
        <TipsOutro cta={script?.cta || '오늘부터 AI로 시간을 아끼세요'} />
      </Sequence>
    </>
  );
}

export const RemotionRoot = () => (
  <Composition
    id="AITipsVideo"
    component={AITipsVideo}
    durationInFrames={30 * 60 * 8}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ script: null }}
  />
);
