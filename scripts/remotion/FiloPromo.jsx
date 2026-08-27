const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Easing } = require('remotion');

// ── 상수 ──────────────────────────────────────────────
const NAVY = '#08101f';
const GOLD = '#c9a84c';
const WHITE = '#ffffff';
const LIGHT = '#f0f4ff';

// ── 유틸 ──────────────────────────────────────────────
function useSpring(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
}

function fadeIn(frame, start, duration) {
  return interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function slideUp(frame, start, duration) {
  return interpolate(frame, [start, start + duration], [40, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

// ── 공통 스타일 ───────────────────────────────────────
const BASE = {
  fontFamily: "'Noto Sans CJK KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

// ── Scene 1: 브랜드 인트로 (0~5초 = 0~149f) ──────────
function SceneIntro() {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 0, 20);
  const logoScale = interpolate(frame, [10, 50], [0.6, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });
  const textY = slideUp(frame, 30, 30);
  const textOp = fadeIn(frame, 30, 30);
  const subY = slideUp(frame, 50, 30);
  const subOp = fadeIn(frame, 50, 30);

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center', opacity }}>
      {/* 배경 원형 장식 */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
      }} />

      {/* FILO 로고 */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <div style={{
          fontSize: 96, fontWeight: 900, color: GOLD, letterSpacing: -2,
          textShadow: `0 0 60px ${GOLD}66`,
        }}>FILO</div>
        <div style={{
          fontSize: 22, color: `${GOLD}aa`, textAlign: 'center',
          letterSpacing: 6, marginTop: -8,
        }}>매장 올인원 플랫폼</div>
      </div>

      {/* 메인 카피 */}
      <div style={{ transform: `translateY(${textY}px)`, opacity: textOp, textAlign: 'center' }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: WHITE, lineHeight: 1.3 }}>
          매장 운영이
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: GOLD, lineHeight: 1.3 }}>
          이렇게 쉬워진다
        </div>
      </div>

      {/* 서브 카피 */}
      <div style={{ transform: `translateY(${subY}px)`, opacity: subOp, marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: `${WHITE}99`, letterSpacing: 1 }}>
          QR주문 · POS · 급여 · 재고관리
        </div>
      </div>

      {/* 하단 장식선 */}
      <div style={{
        position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
        width: interpolate(frame, [60, 120], [0, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />
    </AbsoluteFill>
  );
}

// ── Scene 2: QR 테이블 주문 (5~12초 = 150~359f) ───────
function SceneQR() {
  const frame = useCurrentFrame();
  const cardOp = fadeIn(frame, 0, 20);
  const cardY = slideUp(frame, 0, 25);

  const items = ['메뉴 선택', '주문 완료', '주방 전송', '정산'];
  return (
    <AbsoluteFill style={{ ...BASE, background: '#0d1829', alignItems: 'center', justifyContent: 'center' }}>
      {/* 배경 그라디언트 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, ${GOLD}18 0%, transparent 60%)`,
      }} />

      {/* 상단 태그 */}
      <div style={{
        position: 'absolute', top: 80,
        background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
        borderRadius: 20, padding: '8px 24px',
        opacity: fadeIn(frame, 5, 15),
      }}>
        <span style={{ color: GOLD, fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>FEATURE 01</span>
      </div>

      {/* 스마트폰 목업 */}
      <div style={{
        position: 'absolute', top: 130, right: 50,
        width: 180, height: 320,
        background: '#1a2540',
        borderRadius: 24, border: `2px solid ${GOLD}33`,
        overflow: 'hidden',
        opacity: fadeIn(frame, 10, 20),
        transform: `translateY(${slideUp(frame, 10, 25)}px)`,
        boxShadow: `0 20px 60px ${NAVY}cc`,
      }}>
        {/* 폰 상단바 */}
        <div style={{ background: GOLD, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: NAVY, fontSize: 11, fontWeight: 700 }}>FILO 테이블 주문</span>
        </div>
        {/* 메뉴 아이템 */}
        {['삼겹살 1인분', '된장찌개', '공기밥', '소맥'].map((m, i) => (
          <div key={m} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderBottom: '1px solid #ffffff11',
            opacity: fadeIn(frame, 15 + i * 8, 15),
          }}>
            <span style={{ color: WHITE, fontSize: 12 }}>{m}</span>
            <span style={{ color: GOLD, fontSize: 11 }}>
              {['13,000', '8,000', '1,000', '6,000'][i]}원
            </span>
          </div>
        ))}
        <div style={{
          margin: 12,
          background: GOLD, borderRadius: 10, padding: '10px 0',
          textAlign: 'center', fontSize: 13, fontWeight: 700, color: NAVY,
          opacity: fadeIn(frame, 50, 15),
        }}>주문하기</div>
      </div>

      {/* 왼쪽 텍스트 */}
      <div style={{
        position: 'absolute', left: 48, top: '35%',
        transform: `translateY(${cardY}px)`, opacity: cardOp,
      }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, lineHeight: 1.2, marginBottom: 12 }}>
          QR<br/>테이블 주문
        </div>
        <div style={{ fontSize: 18, color: `${WHITE}88`, marginBottom: 28, lineHeight: 1.6 }}>
          고객이 직접 주문<br/>직원 없이도 OK
        </div>
        {/* 단계 배지 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: fadeIn(frame, 30 + i * 12, 15),
              transform: `translateX(${interpolate(frame, [30 + i * 12, 45 + i * 12], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: NAVY,
              }}>{i + 1}</div>
              <span style={{ color: WHITE, fontSize: 16, fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: POS + 주방 연동 (12~19초 = 360~569f) ─────
function ScenePOS() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...BASE, background: '#0a1520', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 70%, ${GOLD}15 0%, transparent 60%)`,
      }} />

      {/* 상단 태그 */}
      <div style={{
        position: 'absolute', top: 80,
        background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
        borderRadius: 20, padding: '8px 24px',
        opacity: fadeIn(frame, 5, 15),
      }}>
        <span style={{ color: GOLD, fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>FEATURE 02</span>
      </div>

      {/* POS 화면 목업 */}
      <div style={{
        position: 'absolute', top: 130, left: 40,
        width: 200, height: 260,
        background: '#1e2d45', borderRadius: 16,
        border: `1px solid ${GOLD}33`,
        overflow: 'hidden',
        opacity: fadeIn(frame, 10, 20),
        transform: `translateY(${slideUp(frame, 10, 25)}px)`,
        boxShadow: `0 16px 40px ${NAVY}cc`,
      }}>
        <div style={{ background: '#172035', padding: '10px 14px', borderBottom: `1px solid ${GOLD}22` }}>
          <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>POS 계산대</span>
        </div>
        {[
          { name: '삼겹살 2인분', price: '26,000' },
          { name: '된장찌개 2', price: '16,000' },
          { name: '소맥 3', price: '18,000' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 14px', borderBottom: '1px solid #ffffff0d',
            opacity: fadeIn(frame, 20 + i * 8, 12),
          }}>
            <span style={{ color: `${WHITE}cc`, fontSize: 11 }}>{item.name}</span>
            <span style={{ color: WHITE, fontSize: 11 }}>{item.price}원</span>
          </div>
        ))}
        <div style={{
          margin: 10,
          background: `linear-gradient(135deg, ${GOLD}, #e8c060)`,
          borderRadius: 8, padding: '10px 0', textAlign: 'center',
          fontSize: 13, fontWeight: 700, color: NAVY,
          opacity: fadeIn(frame, 40, 15),
        }}>결제 60,000원</div>
      </div>

      {/* 화살표 */}
      <div style={{
        position: 'absolute', top: '42%', left: '52%',
        transform: 'translateX(-50%)',
        opacity: fadeIn(frame, 35, 15),
        fontSize: 28, color: GOLD,
      }}>⚡</div>

      {/* 주방 화면 목업 */}
      <div style={{
        position: 'absolute', top: 150, right: 30,
        width: 180, height: 240,
        background: '#1a2a1a', borderRadius: 16,
        border: `1px solid #44aa4444`,
        overflow: 'hidden',
        opacity: fadeIn(frame, 30, 20),
        transform: `translateY(${slideUp(frame, 30, 25)}px)`,
        boxShadow: `0 16px 40px #000c`,
      }}>
        <div style={{ background: '#0f1f0f', padding: '10px 14px', borderBottom: '1px solid #44aa4422' }}>
          <span style={{ color: '#66cc66', fontSize: 12, fontWeight: 700 }}>🍳 주방 디스플레이</span>
        </div>
        {[
          { order: '3번 테이블', time: '02:15', status: '조리중' },
          { order: '5번 테이블', time: '05:30', status: '대기' },
        ].map((item, i) => (
          <div key={i} style={{
            margin: '8px 10px',
            background: i === 0 ? '#1e3a1e' : '#1e2a1e',
            borderRadius: 8, padding: '10px 12px',
            border: `1px solid ${i === 0 ? '#44cc4444' : '#2a3a2a'}`,
            opacity: fadeIn(frame, 40 + i * 10, 15),
          }}>
            <div style={{ color: WHITE, fontSize: 11, fontWeight: 600 }}>{item.order}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: '#88aa88', fontSize: 10 }}>{item.time}</span>
              <span style={{ color: i === 0 ? '#66cc66' : '#aaaaaa', fontSize: 10 }}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 텍스트 */}
      <div style={{
        position: 'absolute', bottom: 160, left: 48, right: 48,
        opacity: fadeIn(frame, 25, 20),
        transform: `translateY(${slideUp(frame, 25, 25)}px)`,
      }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, lineHeight: 1.2, marginBottom: 12 }}>
          POS · 주방<br/><span style={{ color: GOLD }}>실시간 연동</span>
        </div>
        <div style={{ fontSize: 18, color: `${WHITE}77`, lineHeight: 1.6 }}>
          주문 즉시 주방 전송<br/>대기 없이 빠른 서비스
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 급여 + 재고 (19~26초 = 570~779f) ──────────
function ScenePayroll() {
  const frame = useCurrentFrame();

  const cards = [
    { icon: '💰', title: '급여 자동 계산', desc: '출퇴근 QR → 급여 자동 집계', color: '#1a2f1a' },
    { icon: '📦', title: '재고 관리', desc: '소모품 추적·발주 알림', color: '#1a1a2f' },
    { icon: '📊', title: '마진 분석', desc: 'AI 매출예측 7일', color: '#2f1a1a' },
    { icon: '👥', title: '직원 관리', desc: 'QR 출퇴근·스케줄', color: '#2f2a1a' },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, background: '#0c1520', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 50%, ${GOLD}12 0%, transparent 65%)`,
      }} />

      {/* 상단 태그 */}
      <div style={{
        position: 'absolute', top: 80,
        background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
        borderRadius: 20, padding: '8px 24px',
        opacity: fadeIn(frame, 5, 15),
      }}>
        <span style={{ color: GOLD, fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>FEATURE 03 · 04</span>
      </div>

      {/* 제목 */}
      <div style={{
        position: 'absolute', top: 150, left: 48,
        opacity: fadeIn(frame, 10, 20),
        transform: `translateY(${slideUp(frame, 10, 20)}px)`,
      }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: WHITE, lineHeight: 1.2 }}>
          올인원<br/><span style={{ color: GOLD }}>모든 기능</span>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{
        position: 'absolute', top: 310, left: 40, right: 40,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
      }}>
        {cards.map((card, i) => (
          <div key={card.title} style={{
            background: card.color,
            borderRadius: 16, padding: '18px 16px',
            border: `1px solid ${GOLD}22`,
            opacity: fadeIn(frame, 20 + i * 12, 20),
            transform: `translateY(${slideUp(frame, 20 + i * 12, 20)}px)`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ color: WHITE, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{card.title}</div>
            <div style={{ color: `${WHITE}66`, fontSize: 12, lineHeight: 1.4 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* AI 배지 */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        background: `${GOLD}22`, border: `1px solid ${GOLD}55`,
        borderRadius: 24, padding: '10px 30px',
        opacity: fadeIn(frame, 70, 20),
      }}>
        <span style={{ color: GOLD, fontSize: 15, fontWeight: 600 }}>✨ AI 매출 예측 포함</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA (26~30초 = 780~899f) ──────────────────
function SceneCTA() {
  const frame = useCurrentFrame();
  const totalFrames = 120;
  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });
  const ringScale = interpolate(frame, [0, totalFrames], [1, 1.5], { extrapolateRight: 'clamp' });
  const ringOp = interpolate(frame, [0, totalFrames], [0.4, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...BASE, background: NAVY, alignItems: 'center', justifyContent: 'center' }}>
      {/* 펄스 링 */}
      {[0, 0.33, 0.66].map((offset, i) => {
        const f = (frame + offset * 120) % 120;
        const s = interpolate(f, [0, 120], [1, 2.5], { extrapolateRight: 'clamp' });
        const o = interpolate(f, [0, 120], [0.3, 0], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 240, height: 240, borderRadius: '50%',
            border: `2px solid ${GOLD}`,
            transform: `scale(${s})`, opacity: o,
          }} />
        );
      })}

      {/* 로고 */}
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: GOLD, textShadow: `0 0 40px ${GOLD}88` }}>
          FILO
        </div>
        <div style={{
          fontSize: 24, color: WHITE, fontWeight: 700, marginTop: -4, marginBottom: 32,
          opacity: fadeIn(frame, 20, 20),
        }}>
          지금 무료 체험 시작
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${GOLD}, #e8c060)`,
          borderRadius: 20, padding: '18px 60px',
          fontSize: 22, fontWeight: 900, color: NAVY,
          opacity: fadeIn(frame, 30, 20),
          boxShadow: `0 8px 30px ${GOLD}44`,
          display: 'inline-block',
        }}>
          filo.ai.kr
        </div>

        <div style={{
          marginTop: 20, fontSize: 16, color: `${WHITE}66`,
          opacity: fadeIn(frame, 50, 20),
        }}>
          설치 없이 바로 시작 · 완전 무료
        </div>
      </div>

      {/* 하단 로고 */}
      <div style={{
        position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        opacity: fadeIn(frame, 60, 20),
        color: `${WHITE}44`, fontSize: 13, letterSpacing: 3, textAlign: 'center',
      }}>
        POWERED BY MBTICO
      </div>
    </AbsoluteFill>
  );
}

// ── 전환 효과 ─────────────────────────────────────────
function TransitionOverlay({ direction = 'out' }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = direction === 'out'
    ? interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: NAVY,
      opacity: progress,
      pointerEvents: 'none',
    }} />
  );
}

// ── 메인 컴포지션 ─────────────────────────────────────
function FiloPromo() {
  const SCENES = [
    { component: SceneIntro,   start: 0,   duration: 150 },
    { component: SceneQR,      start: 150, duration: 210 },
    { component: ScenePOS,     start: 360, duration: 210 },
    { component: ScenePayroll, start: 570, duration: 210 },
    { component: SceneCTA,     start: 780, duration: 120 },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {SCENES.map(({ component: Comp, start, duration }) => (
        <Sequence key={start} from={start} durationInFrames={duration}>
          <Comp />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

module.exports = { FiloPromo };
