const React = require('react');
const { useCurrentFrame, interpolate, Sequence, AbsoluteFill, Easing } = require('remotion');

const WHITE  = '#ffffff';
const DARK   = '#000d1a';
const BLUE   = '#2563eb';
const LTBLUE = '#60a5fa';
const ORANGE = '#f97316';
const GREEN  = '#16a34a';

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
    { label: '대시보드', icon: '⊞' },
    { label: '공고관리', icon: '≡' },
    { label: '기사관리', icon: '◎' },
    { label: '정산관리', icon: '₩' },
    { label: '더보기',  icon: '···' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52 * s, background: '#0f1a2e', borderTop: '1px solid #1e3a5f', display: 'flex' }}>
      {tabs.map(function(t) {
        var isActive = t.label === active;
        return (
          <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 13 * s, color: isActive ? BLUE : '#475569' }}>{t.icon}</span>
            <span style={{ fontSize: 7.5 * s, color: isActive ? BLUE : '#475569', fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Scene 1: Hook ────────────────────────────────────────────
function SceneDealerHook() {
  var frame = useCurrentFrame();
  var op1 = fadeIn(frame, 10, 22);  var y1 = slideUp(frame, 10, 24);
  var op2 = fadeIn(frame, 36, 22);  var y2 = slideUp(frame, 36, 24);
  var op3 = fadeIn(frame, 64, 22);  var y3 = slideUp(frame, 64, 24);
  var badgeOp = fadeIn(frame, 98, 20);
  var badgeSc = interpolate(frame, [98, 116], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, ' + ORANGE + '26 0%, transparent 65%)' }} />

      <div style={{ textAlign: 'center', padding: '0 48px' }}>
        <div style={{ transform: 'translateY(' + y1 + 'px)', opacity: op1, marginBottom: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>소장님,</span>
        </div>
        <div style={{ transform: 'translateY(' + y2 + 'px)', opacity: op2, marginBottom: 6 }}>
          <span style={{ fontSize: 50, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>기사 구하는데</span>
        </div>
        <div style={{ transform: 'translateY(' + y3 + 'px)', opacity: op3, marginBottom: 40 }}>
          <span style={{ fontSize: 50, fontWeight: 900, color: ORANGE, lineHeight: 1.15, textShadow: '0 0 32px ' + ORANGE + '66' }}>하루 다 쓰세요?</span>
        </div>
        <div style={{ transform: 'scale(' + badgeSc + ')', opacity: badgeOp }}>
          <div style={{ display: 'inline-block', background: ORANGE, borderRadius: 50, padding: '14px 40px', boxShadow: '0 8px 32px rgba(249,115,22,0.5)' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: WHITE }}>10초 만에 공고 발송</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 20, color: LTBLUE, opacity: fadeIn(frame, 130, 20) }}>소장이 보는 용차앱</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: 대시보드 ────────────────────────────────────────
function SceneDealerDashboard() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var s = 0.92;

  return (
    <AbsoluteFill style={{ ...BASE, background: '#000d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 55%, ' + BLUE + '1a 0%, transparent 55%)' }} />

      <div style={{ opacity: fadeIn(frame, 6, 18), textAlign: 'center', zIndex: 10, marginBottom: -10 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>소장 대시보드</span>
      </div>

      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          <div style={{ background: '#f0f4ff', height: '100%', paddingBottom: 52 * s, overflowY: 'hidden' }}>
            {/* 헤더 */}
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', padding: '12px 14px', color: WHITE }}>
              <div style={{ fontSize: 14 * s, fontWeight: 900 }}>테스트소장</div>
              <div style={{ fontSize: 9 * s, opacity: 0.8, marginTop: 2 }}>안녕하세요, 소장님! · 부산</div>
            </div>

            {/* 상생 플랫폼 팁 */}
            <div style={{ margin: '8px 8px 0', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 * s, padding: '8px 10px' }}>
              <div style={{ fontSize: 9 * s, color: '#92400e', fontWeight: 700, marginBottom: 2 }}>상생 플랫폼 · 용차에서 소속까지</div>
              <div style={{ fontSize: 8 * s, color: '#78350f', lineHeight: 1.4 }}>단건 용차로 만난 기사를 소속 기사로 채용할 수 있어요</div>
              <div style={{ marginTop: 6, background: '#1d4ed8', borderRadius: 20, padding: '4px 10px', display: 'inline-block' }}>
                <span style={{ fontSize: 8 * s, color: WHITE, fontWeight: 700 }}>고정 채용 공고 올리기</span>
              </div>
            </div>

            {/* 오늘 운행 현황 */}
            <div style={{ margin: '8px 8px 0' }}>
              <div style={{ fontSize: 10 * s, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>오늘 운행 현황</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['1건', '등록 공고', '#1d4ed8'], ['0건', '운행 완료', '#059669'], ['0건', '진행 중', '#ea580c']].map(function(item) {
                  return (
                    <div key={item[1]} style={{ flex: 1, background: WHITE, borderRadius: 8 * s, padding: '8px 4px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 16 * s, fontWeight: 900, color: item[2] }}>{item[0]}</div>
                      <div style={{ fontSize: 8 * s, color: '#94a3b8', marginTop: 2 }}>{item[1]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 실시간 관제 */}
            <div style={{ margin: '8px 8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10 * s, fontWeight: 700, color: '#1e293b' }}>실시간 관제</span>
                <span style={{ fontSize: 8 * s, color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 7px' }}>새로고침</span>
              </div>
              <div style={{ background: '#d4e8c8', borderRadius: 8 * s, height: 100 * s, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 16px, rgba(0,0,0,0.04) 16px, rgba(0,0,0,0.04) 17px), repeating-linear-gradient(90deg, transparent, transparent 16px, rgba(0,0,0,0.04) 16px, rgba(0,0,0,0.04) 17px)' }} />
                {/* 창원/부산 labels */}
                <span style={{ position: 'absolute', left: '18%', top: '38%', fontSize: 7 * s, color: '#334155', fontWeight: 600 }}>창원시</span>
                <span style={{ position: 'absolute', left: '58%', top: '62%', fontSize: 7 * s, color: '#334155', fontWeight: 600 }}>부산</span>
                {/* marker */}
                <div style={{ position: 'absolute', left: '60%', top: '55%', width: 18, height: 18, background: '#1d4ed8', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: WHITE, fontWeight: 700 }}>1</span>
                </div>
              </div>
            </div>
          </div>
          <TabBar active="대시보드" scale={s} />
        </Phone>
      </div>

      <div style={{ opacity: fadeIn(frame, 80, 20), textAlign: 'center', zIndex: 10 }}>
        <span style={{ fontSize: 18, color: '#94a3b8' }}>실시간 기사 관제 · 운행 현황 한눈에</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: 공고 등록 ───────────────────────────────────────
function SceneDealerPost() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var tagOp   = fadeIn(frame, 60, 18);
  var s = 0.92;

  return (
    <AbsoluteFill style={{ ...BASE, background: '#040810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 65% 40%, #06b6d422 0%, transparent 55%)' }} />

      <div style={{ opacity: fadeIn(frame, 6, 18), textAlign: 'center', zIndex: 10, marginBottom: -10 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>공고 등록 — 구역 설정</span>
      </div>

      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          <div style={{ background: '#f8faff', height: '100%', paddingBottom: 52 * s, overflowY: 'hidden' }}>
            <div style={{ padding: '12px 10px 0' }}>
              {/* 상자지 주소 */}
              <div style={{ fontSize: 9 * s, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                상자지 주소 <span style={{ color: '#ef4444' }}>*</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1, background: WHITE, border: '1px solid #cbd5e1', borderRadius: 8 * s, padding: '8px 10px' }}>
                  <span style={{ fontSize: 8.5 * s, color: '#94a3b8' }}>예: 부산시 강서구 녹산동 OO터미널</span>
                </div>
                <div style={{ background: BLUE, borderRadius: 8 * s, padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 8.5 * s, color: WHITE, fontWeight: 700 }}>검색</span>
                </div>
              </div>

              {/* 우편번호 */}
              <div style={{ fontSize: 9 * s, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>배송구역 우편번호 추가</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <div style={{ flex: 1, background: WHITE, border: '1px solid #cbd5e1', borderRadius: 8 * s, padding: '8px 10px' }}>
                  <span style={{ fontSize: 8.5 * s, color: '#94a3b8' }}>우편번호 5자리 입력</span>
                </div>
                <div style={{ background: ORANGE, borderRadius: 8 * s, padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 8.5 * s, color: WHITE, fontWeight: 700 }}>추가</span>
                </div>
              </div>
              <div style={{ fontSize: 8 * s, color: GREEN, marginBottom: 5 }}>48270 구역이 추가됐어요</div>
              {/* tag */}
              <div style={{ opacity: tagOp, display: 'inline-flex', alignItems: 'center', gap: 5, background: BLUE, borderRadius: 20, padding: '3px 10px', marginBottom: 8 }}>
                <span style={{ fontSize: 8.5 * s, color: WHITE, fontWeight: 700 }}>48270</span>
                <span style={{ fontSize: 8 * s, color: 'rgba(255,255,255,0.7)' }}>✕</span>
              </div>

              {/* 지도 */}
              <div style={{ background: '#d4e8c8', borderRadius: 8 * s, height: 100 * s, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(0,0,0,0.04) 14px, rgba(0,0,0,0.04) 15px), repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.04) 14px, rgba(0,0,0,0.04) 15px)' }} />
                {/* 48270 highlighted zone */}
                <div style={{ position: 'absolute', left: '30%', top: '30%', width: '40%', height: '40%', background: '#06b6d440', border: '2px solid #0891b2', borderRadius: 4 }} />
                <div style={{ position: 'absolute', left: '36%', top: '44%', fontSize: 7 * s, color: '#0c4a6e', fontWeight: 900 }}>48270</div>
                {/* markers */}
                {[['18%', '28%'], ['65%', '55%'], ['22%', '68%']].map(function(pos, i) {
                  return <div key={i} style={{ position: 'absolute', left: pos[0], top: pos[1], width: 10, height: 10, background: '#ef4444', borderRadius: '50%', border: '1.5px solid white' }} />;
                })}
              </div>
            </div>
          </div>
          <TabBar active="공고관리" scale={s} />
        </Phone>
      </div>

      <div style={{ opacity: fadeIn(frame, 90, 20), textAlign: 'center', zIndex: 10 }}>
        <span style={{ fontSize: 18, color: '#94a3b8' }}>우편번호로 배송구역 정밀 설정</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: 공고 발송 ───────────────────────────────────────
function SceneDealerSend() {
  var frame = useCurrentFrame();
  var phoneOp = fadeIn(frame, 8, 28);
  var phoneY  = slideUp(frame, 8, 30, 60);
  var btnPulse = interpolate(frame, [80, 120, 160, 200], [1, 1.04, 1, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  var s = 0.92;

  return (
    <AbsoluteFill style={{ ...BASE, background: '#04080f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, ' + ORANGE + '1e 0%, transparent 55%)' }} />

      <div style={{ opacity: fadeIn(frame, 6, 18), textAlign: 'center', zIndex: 10, marginBottom: -10 }}>
        <span style={{ fontSize: 22, color: LTBLUE, fontWeight: 700 }}>초고속 공고 발송</span>
      </div>

      <div style={{ transform: 'translateY(' + phoneY + 'px)', opacity: phoneOp, zIndex: 10 }}>
        <Phone scale={s}>
          <div style={{ background: '#f8faff', height: '100%', paddingBottom: 52 * s }}>
            <div style={{ padding: '12px 10px 0' }}>
              {/* 상세 설명 */}
              <div style={{ fontSize: 9 * s, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>상세 설명</div>
              <div style={{ background: WHITE, border: '1px solid #cbd5e1', borderRadius: 8 * s, padding: '8px 10px', marginBottom: 12, height: 55 * s }}>
                <span style={{ fontSize: 8.5 * s, color: '#94a3b8' }}>구역 특이사항, 요청사항 등</span>
              </div>

              {/* 긴급 공고 토글 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 10 * s, fontWeight: 700, color: '#0f172a' }}>긴급 공고</div>
                  <div style={{ fontSize: 8 * s, color: '#94a3b8' }}>상단에 우선 노출돼요</div>
                </div>
                <div style={{ width: 36 * s, height: 20 * s, background: BLUE, borderRadius: 20, position: 'relative' }}>
                  <div style={{ position: 'absolute', right: 2, top: 2, width: 16 * s, height: 16 * s, background: WHITE, borderRadius: '50%' }} />
                </div>
              </div>

              {/* 기사 신뢰도 필터 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 10 * s, fontWeight: 700, color: '#0f172a' }}>기사 신뢰도 필터</div>
                  <div style={{ fontSize: 8 * s, color: '#94a3b8' }}>평점 4.5 이상 기사만 지원 가능</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14 * s, height: 14 * s, border: '1.5px solid #cbd5e1', borderRadius: 3 }} />
                  <span style={{ fontSize: 8.5 * s, color: '#f59e0b', fontWeight: 700 }}>★ 4.5+</span>
                </div>
              </div>

              {/* 발송 버튼 */}
              <div style={{ transform: 'scale(' + btnPulse + ')', background: ORANGE, borderRadius: 12 * s, padding: '14px 0', textAlign: 'center', boxShadow: '0 8px 24px rgba(249,115,22,0.45)' }}>
                <span style={{ fontSize: 14 * s, fontWeight: 900, color: WHITE }}>초고속 용차 공고 발송</span>
              </div>
            </div>
          </div>
          <TabBar active="공고관리" scale={s} />
        </Phone>
      </div>

      {/* floating chips */}
      <div style={{ position: 'absolute', right: 55, top: '30%', opacity: fadeIn(frame, 60, 18), transform: 'rotate(3deg)', zIndex: 20 }}>
        <div style={{ background: ORANGE, borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 24px rgba(249,115,22,0.45)' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>긴급 공고 우선 노출</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 45, bottom: '30%', opacity: fadeIn(frame, 80, 18), transform: 'rotate(-3deg)', zIndex: 20 }}>
        <div style={{ background: '#7c3aed', borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>★4.5+ 신뢰 기사만</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: CTA ─────────────────────────────────────────────
function SceneDealerCTA() {
  var frame = useCurrentFrame();
  var titleOp = fadeIn(frame, 10, 24);  var titleY = slideUp(frame, 10, 26);
  var sub1Op  = fadeIn(frame, 40, 22);
  var sub2Op  = fadeIn(frame, 58, 22);
  var btnOp   = fadeIn(frame, 80, 22);
  var btnSc   = interpolate(frame, [80, 100], [0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3)) });
  var freeOp  = fadeIn(frame, 112, 20);

  return (
    <AbsoluteFill style={{ ...BASE, background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, ' + ORANGE + '28 0%, transparent 60%)' }} />

      <div style={{ textAlign: 'center', padding: '0 48px', zIndex: 10 }}>
        <div style={{ transform: 'translateY(' + titleY + 'px)', opacity: titleOp, marginBottom: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: WHITE, lineHeight: 1.15 }}>소장님, 오늘부터</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: ORANGE, lineHeight: 1.15, textShadow: '0 0 40px ' + ORANGE + '55' }}>10초 만에 기사 연결!</div>
        </div>

        <div style={{ opacity: sub1Op, marginBottom: 8 }}>
          <span style={{ fontSize: 22, color: '#94a3b8' }}>공고 발송 → 실시간 관제 → AI 추천</span>
        </div>
        <div style={{ opacity: sub2Op, marginBottom: 36 }}>
          <span style={{ fontSize: 22, color: '#94a3b8' }}>단건 용차 → 소속 기사 채용까지</span>
        </div>

        <div style={{ transform: 'scale(' + btnSc + ')', opacity: btnOp, marginBottom: 20 }}>
          <div style={{ background: ORANGE, borderRadius: 50, padding: '18px 52px', display: 'inline-block', boxShadow: '0 12px 40px rgba(249,115,22,0.5)' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: WHITE }}>yongcha.app 소장 가입</span>
          </div>
        </div>

        <div style={{ opacity: freeOp, background: GREEN + '22', border: '1px solid ' + GREEN + '44', borderRadius: 16, padding: '12px 28px', display: 'inline-block' }}>
          <span style={{ fontSize: 18, color: '#4ade80', fontWeight: 700 }}>2026년 한 해 동안 완전 무료</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Root export ───────────────────────────────────────────────
function YongchaDealerPromo(props) {
  return (
    <AbsoluteFill>
      <Sequence from={0}    durationInFrames={300}><SceneDealerHook /></Sequence>
      <Sequence from={300}  durationInFrames={360}><SceneDealerDashboard /></Sequence>
      <Sequence from={660}  durationInFrames={360}><SceneDealerPost /></Sequence>
      <Sequence from={1020} durationInFrames={360}><SceneDealerSend /></Sequence>
      <Sequence from={1380} durationInFrames={420}><SceneDealerCTA /></Sequence>
    </AbsoluteFill>
  );
}

module.exports = { YongchaDealerPromo };
