// Remotion 튜토리얼 영상 템플릿 — AI 자동화 연구소 채널
// 사용법: node render-tutorial.js --script output/scripts/<id>.json
// 출력: output/<id>-final.mp4

import { Composition, AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const COLORS = {
  bg: '#080E1C',
  surface: '#111827',
  primary: '#4F8EF7',
  green: '#10B981',
  gold: '#F59E0B',
  text: '#F1F5F9',
  muted: '#64748B',
};

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

// 브랜드 로고 인트로 (0~90프레임, 3초)
function Intro({ channelName = 'AI 자동화 연구소' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const textOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <div style={{
        transform: `scale(${logoScale})`,
        width: 120, height: 120,
        borderRadius: 28,
        background: `linear-gradient(135deg, ${COLORS.primary}, #6366F1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56,
        boxShadow: `0 0 60px rgba(79,142,247,0.4)`,
      }}>🤖</div>
      <div style={{ opacity: textOpacity, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 900, color: COLORS.text }}>{channelName}</div>
        <div style={{ fontFamily: FONT, fontSize: 14, color: COLORS.muted, marginTop: 6, letterSpacing: '0.1em' }}>AI AUTOMATION LAB</div>
      </div>
    </AbsoluteFill>
  );
}

// 섹션 슬라이드
function Section({ title, narration, visual, index, totalSections }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const translateX = interpolate(slideIn, [0, 1], [60, 0]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, padding: '60px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity }}>
      {/* 진행 바 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: COLORS.surface }}>
        <div style={{ height: '100%', width: `${((index + 1) / totalSections) * 100}%`, background: COLORS.primary, transition: 'width 0.3s' }} />
      </div>

      {/* 섹션 번호 */}
      <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.primary, letterSpacing: '0.15em', marginBottom: 16, opacity: 0.8 }}>
        {String(index + 1).padStart(2, '0')} / {String(totalSections).padStart(2, '0')}
      </div>

      {/* 메인 타이틀 */}
      <div style={{
        fontFamily: FONT, fontSize: 48, fontWeight: 900,
        color: COLORS.text, lineHeight: 1.2, marginBottom: 32,
        transform: `translateX(${translateX}px)`,
        maxWidth: '70%',
      }}>{title}</div>

      {/* 비주얼 영역 */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid #1E2D45`,
        borderRadius: 16,
        padding: '24px 32px',
        marginBottom: 32,
        fontFamily: FONT, fontSize: 18, color: COLORS.muted,
        maxWidth: '65%',
      }}>{visual}</div>

      {/* 나레이션 자막 */}
      <div style={{
        position: 'absolute', bottom: 60, left: 80, right: 80,
        background: 'rgba(8,14,28,0.9)',
        borderTop: `2px solid ${COLORS.primary}`,
        padding: '20px 32px',
        borderRadius: 12,
        fontFamily: FONT, fontSize: 22, color: COLORS.text, lineHeight: 1.6,
      }}>{narration}</div>
    </AbsoluteFill>
  );
}

// 아웃트로 CTA
function Outro({ cta, channelName }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 10 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28, opacity }}>
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 900, color: COLORS.text, marginBottom: 16 }}>
          {cta}
        </div>
        <div style={{
          display: 'inline-block',
          background: COLORS.primary,
          color: '#fff',
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          padding: '14px 40px',
          borderRadius: 12,
        }}>filo.ai.kr 무료 체험</div>
      </div>
      <div style={{ fontFamily: FONT, fontSize: 16, color: COLORS.muted }}>
        구독 + 좋아요로 매주 자동화 팁 받아가세요 🔔
      </div>
      <div style={{ fontFamily: FONT, fontSize: 14, color: COLORS.muted, opacity: 0.6 }}>{channelName}</div>
    </AbsoluteFill>
  );
}

// 메인 컴포지션 — 스크립트 JSON을 props로 받음
export function AITutorialVideo({ script }) {
  const { fps } = useVideoConfig();
  const INTRO_FRAMES = fps * 3;
  const OUTRO_FRAMES = fps * 5;

  const sections = script?.sections || [];
  const sectionFrames = sections.map(s => Math.round((s.duration_sec || 60) * fps));
  const totalFrames = INTRO_FRAMES + sectionFrames.reduce((a, b) => a + b, 0) + OUTRO_FRAMES;

  let currentFrame = INTRO_FRAMES;

  return (
    <>
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <Intro channelName="AI 자동화 연구소" />
      </Sequence>

      {sections.map((section, i) => {
        const start = currentFrame;
        const dur = sectionFrames[i];
        currentFrame += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <Section
              title={section.title}
              narration={section.narration?.slice(0, 80) + (section.narration?.length > 80 ? '…' : '')}
              visual={section.visual}
              index={i}
              totalSections={sections.length}
            />
          </Sequence>
        );
      })}

      <Sequence from={totalFrames - OUTRO_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro cta={script?.cta || '지금 바로 무료로 시작하세요'} channelName="AI 자동화 연구소" />
      </Sequence>
    </>
  );
}

// Remotion 등록
export const RemotionRoot = () => (
  <Composition
    id="AITutorialVideo"
    component={AITutorialVideo}
    durationInFrames={30 * 60 * 8}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ script: null }}
  />
);
