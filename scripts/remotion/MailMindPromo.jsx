const { Composition, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence, Audio } = window.Remotion || require('remotion');

// MailMind 60초 홍보 영상 (1080×1920, 30fps, 1800프레임)
// Scene 1:  0-10s  (  0-300f) 외국어 이메일 도착 → 당황
// Scene 2: 10-20s  (300-600f) MailMind 클릭 → 내 언어로 요약
// Scene 3: 20-35s  (600-1050f) 톤 선택 → 완벽한 답장 자동 생성
// Scene 4: 35-45s (1050-1350f) 언어 전환 버튼 → UI 언어 전환
// Scene 5: 45-55s (1350-1650f) Smart Reply Guard / 약속 추출
// Scene 6: 55-60s (1650-1800f) 로고 + 플랜 가격 + URL

const BRAND = {
  blue: '#1A6BFF',
  blueDark: '#0A4FD4',
  blueLight: '#4D8FFF',
  cyan: '#00E5FF',
  white: '#FFFFFF',
  gray: '#F0F4FF',
  textDark: '#0A1628',
  textMid: '#3A5070',
  pink: '#FF4D8C',
  green: '#00D68F',
  gold: '#FFB800',
};

// 언어별 샘플 이메일 (Scene 1용)
const FOREIGN_EMAILS = [
  { lang: 'JP', flag: '🇯🇵', subject: '重要なお知らせについて', body: '先日のお問い合わせの件でご連絡をさせていただきます。詳細については以下をご確認ください…', from: 'tanaka@corp.jp' },
  { lang: 'AR', flag: '🇸🇦', subject: 'بخصوص طلبك', body: 'نود إبلاغك بأن طلبك قيد المراجعة. يرجى تقديم المستندات المطلوبة في أقرب وقت ممكن…', from: 'ahmed@company.sa' },
  { lang: 'DE', flag: '🇩🇪', subject: 'Wichtige Mitteilung', body: 'Hiermit möchten wir Sie über die aktuelle Situation informieren. Bitte bestätigen Sie den Erhalt dieser E-Mail…', from: 'mueller@firma.de' },
];

// 인풋 props로 언어 선택 (기본 JP)
const LANG_LABELS = {
  JP: '日本語', EN: 'English', PT: 'Português', HI: 'हिन्दी',
  ID: 'Bahasa Indonesia', TH: 'ภาษาไทย', VN: 'Tiếng Việt', AR: 'العربية',
  DE: 'Deutsch', FR: 'Français', ES: 'Español', IT: 'Italiano', TR: 'Türkçe', KR: '한국어',
};

// 나레이션 라인 (언어별 variants.json에서 런타임에 로드되나, fallback으로 KR 사용)
const DEFAULT_SUBTITLES = [
  { start: 0,  end: 10, text: '외국어 이메일이 쏟아진다…' },
  { start: 10, end: 20, text: 'MailMind 클릭 한 번이면' },
  { start: 20, end: 35, text: '톤까지 골라서 완벽한 답장 자동 생성' },
  { start: 35, end: 45, text: '14개 언어, 버튼 하나로 전환' },
  { start: 45, end: 55, text: 'Smart Reply Guard · 약속 자동 추출' },
  { start: 55, end: 60, text: 'mailmind.yongcha.app' },
];

// 언어 전환 칩
const LANG_CHIPS = ['KR','EN','JP','CN','ES','DE','BR','SA','IT','TR','FR','VN','TH','ID'];

// ─────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────
function fadeIn(frame, start, dur = 15) {
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
function slideUp(frame, start, dur = 20) {
  return interpolate(frame, [start, start + dur], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
}

// ─────────────────────────────────────────────────────────────────────
// Scene 1: 외국어 이메일 도착 (0~300f, 0~10s)
// ─────────────────────────────────────────────────────────────────────
function Scene1({ frame }) {
  const email = FOREIGN_EMAILS[Math.floor(frame / 100) % FOREIGN_EMAILS.length];
  const opacity = fadeIn(frame, 0);
  const shake = frame > 200 ? Math.sin(frame * 0.8) * (3 * (1 - (frame - 200) / 100)) : 0;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.blueDark} 0%, #0A1628 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      {/* 상단 레이블 */}
      <div style={{ opacity, transform: `translateY(${slideUp(frame, 0)}px)`, marginBottom: 40 }}>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '12px 32px', fontSize: 28, color: BRAND.cyan, fontFamily: 'Pretendard, sans-serif', fontWeight: 700, letterSpacing: 2 }}>
          {email.flag} 외국어 이메일 도착
        </div>
      </div>

      {/* 이메일 카드 */}
      <div style={{ width: '100%', maxWidth: 900, background: BRAND.white, borderRadius: 24, padding: 50, boxShadow: '0 20px 80px rgba(0,0,0,0.4)', transform: `translateX(${shake}px)`, opacity: fadeIn(frame, 10) }}>
        <div style={{ fontSize: 24, color: BRAND.textMid, marginBottom: 12, fontFamily: 'Pretendard, sans-serif' }}>from: {email.from}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: BRAND.textDark, marginBottom: 24, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.3 }}>{email.subject}</div>
        <div style={{ fontSize: 28, color: BRAND.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>{email.body}</div>
      </div>

      {/* 당황 표시 */}
      {frame > 200 && (
        <div style={{ position: 'absolute', top: 200, right: 80, fontSize: 80, opacity: Math.min(1, (frame - 200) / 30) }}>😰</div>
      )}

      <div style={{ position: 'absolute', bottom: 120, opacity: fadeIn(frame, 240), fontSize: 32, color: 'rgba(255,255,255,0.6)', fontFamily: 'Pretendard, sans-serif' }}>
        이게 무슨 내용이지...?
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 2: MailMind 클릭 → 내 언어로 요약 (300~600f, 10~20s)
// ─────────────────────────────────────────────────────────────────────
function Scene2({ frame }) {
  const localFrame = frame - 300;
  const summaryVisible = localFrame > 80;
  const summaryOpacity = fadeIn(localFrame, 80);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #051233 0%, ${BRAND.blueDark} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      {/* MailMind 확장 패널 */}
      <div style={{ width: '100%', maxWidth: 900, opacity: fadeIn(localFrame, 0) }}>
        {/* 패널 헤더 */}
        <div style={{ background: BRAND.blue, borderRadius: '20px 20px 0 0', padding: '28px 40px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, background: BRAND.white, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✉️</div>
          <div style={{ color: BRAND.white, fontSize: 32, fontWeight: 800, fontFamily: 'Pretendard, sans-serif' }}>MailMind AI</div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: '8px 24px', color: BRAND.cyan, fontSize: 22, fontFamily: 'Pretendard, sans-serif' }}>⚡ 분석 중...</div>
        </div>

        {/* 요약 결과 */}
        <div style={{ background: BRAND.white, borderRadius: '0 0 20px 20px', padding: 50 }}>
          {summaryVisible ? (
            <div style={{ opacity: summaryOpacity }}>
              <div style={{ fontSize: 24, color: BRAND.blue, fontWeight: 700, marginBottom: 16, fontFamily: 'Pretendard, sans-serif' }}>📋 AI 요약 (한국어)</div>
              <div style={{ fontSize: 30, color: BRAND.textDark, lineHeight: 1.8, fontFamily: 'Pretendard, sans-serif' }}>
                • 발신자의 요청 사항을 확인해 달라는 내용<br/>
                • 필요한 서류를 최대한 빨리 제출 요청<br/>
                • 긴급도: <span style={{ color: BRAND.pink, fontWeight: 700 }}>높음</span>
              </div>
              <div style={{ marginTop: 32, padding: '20px 28px', background: '#F0F4FF', borderRadius: 14, fontSize: 26, color: BRAND.textMid, fontFamily: 'Pretendard, sans-serif' }}>
                🌏 감지된 언어: 아랍어(SA) → <strong>한국어</strong>로 번역됨
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[200, 240, 120].map((w, i) => (
                <div key={i} style={{ height: 24, background: '#E8EEF7', borderRadius: 8, width: w + 'px', animation: 'pulse 1s infinite' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 클릭 버튼 강조 */}
      {localFrame < 60 && (
        <div style={{ position: 'absolute', bottom: 200, right: 80, opacity: 1 - localFrame / 60 }}>
          <div style={{ background: BRAND.blue, borderRadius: 20, padding: '24px 48px', fontSize: 36, color: BRAND.white, fontFamily: 'Pretendard, sans-serif', fontWeight: 800, boxShadow: `0 0 40px ${BRAND.cyan}80` }}>
            클릭!
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 3: 톤 선택 → 완벽한 답장 생성 (600~1050f, 20~35s)
// ─────────────────────────────────────────────────────────────────────
const TONE_OPTIONS = [
  { id: 'direct', label: 'Direct', icon: '⚡', desc: '간결하고 단도직입' },
  { id: 'warm', label: 'Warm', icon: '🤝', desc: '친근하고 배려있는' },
  { id: 'detailed', label: 'Detailed', icon: '📋', desc: '상세하고 전문적인' },
];
const GENERATED_REPLY = `Dear Ahmed,\n\nThank you for your message. I have received your request and I am currently reviewing the necessary documentation.\n\nI will submit the required documents within 2 business days. Please let me know if you need any additional information.\n\nBest regards,`;

function Scene3({ frame }) {
  const localFrame = frame - 600;
  const selectedTone = localFrame < 200 ? null : 'warm';
  const replyVisible = localFrame > 300;
  const replyOpacity = fadeIn(localFrame, 300);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #030d20 0%, #0c2a5e 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 60px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 40, alignSelf: 'flex-start' }}>
        <div style={{ color: BRAND.cyan, fontSize: 28, fontFamily: 'Pretendard, sans-serif', fontWeight: 700, marginBottom: 8 }}>답장 톤 선택</div>
      </div>

      {/* 톤 선택 카드 */}
      <div style={{ display: 'flex', gap: 24, width: '100%', marginBottom: 50, opacity: fadeIn(localFrame, 20) }}>
        {TONE_OPTIONS.map((tone, i) => {
          const isSelected = selectedTone === tone.id;
          const cardOpacity = fadeIn(localFrame, 20 + i * 15);
          return (
            <div key={tone.id} style={{ flex: 1, background: isSelected ? BRAND.blue : 'rgba(255,255,255,0.08)', border: isSelected ? `3px solid ${BRAND.cyan}` : '3px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', opacity: cardOpacity, transform: isSelected ? 'scale(1.04)' : 'scale(1)', transition: 'all 0.3s' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{tone.icon}</div>
              <div style={{ color: BRAND.white, fontSize: 28, fontWeight: 800, fontFamily: 'Pretendard, sans-serif', marginBottom: 8 }}>{tone.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, fontFamily: 'Pretendard, sans-serif' }}>{tone.desc}</div>
              {isSelected && <div style={{ marginTop: 16, color: BRAND.cyan, fontSize: 24, fontFamily: 'Pretendard, sans-serif' }}>✓ 선택됨</div>}
            </div>
          );
        })}
      </div>

      {/* 생성된 답장 */}
      {replyVisible && (
        <div style={{ width: '100%', opacity: replyOpacity }}>
          <div style={{ background: 'rgba(26,107,255,0.15)', border: `2px solid ${BRAND.blue}`, borderRadius: 20, padding: 40 }}>
            <div style={{ color: BRAND.cyan, fontSize: 26, fontWeight: 700, marginBottom: 20, fontFamily: 'Pretendard, sans-serif' }}>✨ AI가 생성한 답장</div>
            <div style={{ color: BRAND.white, fontSize: 26, lineHeight: 1.8, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>
              {GENERATED_REPLY.slice(0, Math.min(GENERATED_REPLY.length, Math.floor((localFrame - 300) * 3)))}
              {localFrame < 680 && <span style={{ borderRight: `2px solid ${BRAND.cyan}`, animation: 'blink 1s infinite' }}> </span>}
            </div>
          </div>

          {/* 삽입 버튼 */}
          {localFrame > 700 && (
            <div style={{ marginTop: 30, display: 'flex', gap: 20, justifyContent: 'center', opacity: fadeIn(localFrame, 700) }}>
              <div style={{ background: BRAND.pink, borderRadius: 16, padding: '24px 60px', fontSize: 32, color: BRAND.white, fontWeight: 800, fontFamily: 'Pretendard, sans-serif' }}>
                Gmail에 삽입
              </div>
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 4: 언어 전환 → UI가 해당 언어로 변경 (1050~1350f, 35~45s)
// ─────────────────────────────────────────────────────────────────────
function Scene4({ frame }) {
  const localFrame = frame - 1050;
  const activeIdx = Math.floor(localFrame / 45) % LANG_CHIPS.length;
  const LANG_LABELS_LOCAL = { KR: '한국어', EN: 'English', JP: '日本語', CN: '中文', ES: 'Español', DE: 'Deutsch', BR: 'PT(BR)', SA: 'العربية', IT: 'Italiano', TR: 'Türkçe', FR: 'Français', VN: 'Tiếng Việt', TH: 'ภาษาไทย', ID: 'Bahasa' };
  const UI_LABELS = {
    KR: ['答장 비교', '스마트 답장·Pro', '스레드 요약', '감지된 할 일'],
    JP: ['返信を比較', 'スマート返信·Pro', 'スレッド要約', '検出されたタスク'],
    EN: ['Compare Replies', 'Smart Reply·Pro', 'Thread Summary', 'Detected Tasks'],
    SA: ['مقارنة الردود', 'رد ذكي·Pro', 'ملخص المحادثة', 'المهام المكتشفة'],
    ID: ['Bandingkan Balasan', 'Balasan Cerdas·Pro', 'Ringkasan Utas', 'Tugas Terdeteksi'],
    TH: ['เปรียบเทียบ', 'ตอบอัจฉริยะ·Pro', 'สรุปเธรด', 'งานที่ตรวจพบ'],
  };
  const currentLang = LANG_CHIPS[activeIdx];
  const uiLabels = UI_LABELS[currentLang] || UI_LABELS['EN'];

  return (
    <AbsoluteFill style={{ background: '#050E22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 40px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 40, textAlign: 'center' }}>
        <div style={{ color: BRAND.cyan, fontSize: 30, fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}>🌐 언어 전환 — 버튼 하나로</div>
      </div>

      {/* 언어 칩 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', width: '100%', marginBottom: 50 }}>
        {LANG_CHIPS.map((lang, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={lang} style={{ background: isActive ? BRAND.blue : 'rgba(255,255,255,0.08)', border: isActive ? `2px solid ${BRAND.cyan}` : '2px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '14px 28px', color: isActive ? BRAND.white : 'rgba(255,255,255,0.6)', fontSize: 24, fontFamily: 'Pretendard, sans-serif', fontWeight: isActive ? 700 : 400, transform: isActive ? 'scale(1.12)' : 'scale(1)' }}>
              {LANG_LABELS_LOCAL[lang] || lang}
            </div>
          );
        })}
      </div>

      {/* UI 변환 데모 */}
      <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '2px solid rgba(255,255,255,0.1)', padding: 40, opacity: fadeIn(localFrame, 30) }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, marginBottom: 24, fontFamily: 'Pretendard, sans-serif' }}>MailMind 패널 UI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {uiLabels.map((label, i) => (
            <div key={i} style={{ background: i === 0 ? BRAND.pink : 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 28px', fontSize: 28, color: BRAND.white, fontFamily: 'sans-serif', fontWeight: i === 0 ? 700 : 400 }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 5: Smart Reply Guard / 약속 추출 (1350~1650f, 45~55s)
// ─────────────────────────────────────────────────────────────────────
const TASKS = [
  { icon: '📅', text: '2026-10-15 오전 10시 화상회의', type: '약속' },
  { icon: '📋', text: '계약서 초안 검토 후 회신', type: '할 일' },
  { icon: '⚠️', text: '"즉시 처리 바람" — 긴급 감지', type: 'Guard' },
];

function Scene5({ frame }) {
  const localFrame = frame - 1350;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #031028 0%, #0c1e45 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 40px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 50, textAlign: 'center' }}>
        <div style={{ color: BRAND.white, fontSize: 44, fontWeight: 900, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.3 }}>
          Smart Reply Guard
          <br />
          <span style={{ color: BRAND.cyan, fontSize: 36 }}>& 약속·할일 자동 추출</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
        {TASKS.map((task, i) => {
          const cardOpacity = fadeIn(localFrame, 60 + i * 80);
          const cardSlide = slideUp(localFrame, 60 + i * 80, 25);
          const typeColor = task.type === 'Guard' ? BRAND.pink : task.type === '약속' ? BRAND.cyan : BRAND.green;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(255,255,255,0.06)', border: `2px solid ${typeColor}40`, borderRadius: 20, padding: '30px 36px', opacity: cardOpacity, transform: `translateY(${cardSlide}px)` }}>
              <div style={{ fontSize: 52 }}>{task.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: typeColor, fontSize: 22, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', marginBottom: 8 }}>{task.type}</div>
                <div style={{ color: BRAND.white, fontSize: 28, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>{task.text}</div>
              </div>
              <div style={{ background: typeColor + '20', border: `2px solid ${typeColor}`, borderRadius: 100, padding: '10px 24px', color: typeColor, fontSize: 22, fontWeight: 700, fontFamily: 'Pretendard, sans-serif' }}>
                감지
              </div>
            </div>
          );
        })}
      </div>

      {localFrame > 200 && (
        <div style={{ marginTop: 50, opacity: fadeIn(localFrame, 200), textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 28, fontFamily: 'Pretendard, sans-serif' }}>
            이메일 속 중요한 것을 놓치지 않습니다
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 6: 로고 + 플랜 + URL (1650~1800f, 55~60s)
// ─────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Free', price: '₩0', desc: '10회/월', color: BRAND.textMid },
  { name: 'Pro', price: '₩9,900', desc: '300회/월', color: BRAND.blue, highlight: true },
];

function Scene6({ frame, logoSrc }) {
  const localFrame = frame - 1650;
  const logoScale = spring({ frame: localFrame, fps: 30, config: { damping: 14, mass: 0.8, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 60%, #030d20 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {/* 로고 */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 48 }}>
        {logoSrc ? (
          <img src={logoSrc} style={{ width: 220, height: 220, borderRadius: 44 }} />
        ) : (
          <div style={{ width: 220, height: 220, background: BRAND.blue, borderRadius: 44, border: `4px solid ${BRAND.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>✉️</div>
        )}
      </div>

      <div style={{ opacity: fadeIn(localFrame, 10), textAlign: 'center', marginBottom: 60 }}>
        <div style={{ color: BRAND.white, fontSize: 56, fontWeight: 900, fontFamily: 'Pretendard, sans-serif', letterSpacing: -1 }}>MailMind AI</div>
        <div style={{ color: BRAND.cyan, fontSize: 30, fontFamily: 'Pretendard, sans-serif', marginTop: 12 }}>AI Gmail 이메일 답장 Chrome 확장</div>
      </div>

      {/* 플랜 카드 */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 60, opacity: fadeIn(localFrame, 40) }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{ background: plan.highlight ? BRAND.white : 'rgba(255,255,255,0.1)', borderRadius: 24, padding: '36px 48px', textAlign: 'center', border: plan.highlight ? `3px solid ${BRAND.cyan}` : '3px solid rgba(255,255,255,0.15)', minWidth: 240 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: plan.highlight ? BRAND.blue : 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard, sans-serif', marginBottom: 12 }}>{plan.name}</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: plan.highlight ? BRAND.blue : BRAND.white, fontFamily: 'Pretendard, sans-serif', marginBottom: 8 }}>{plan.price}</div>
            <div style={{ fontSize: 24, color: plan.highlight ? BRAND.textMid : 'rgba(255,255,255,0.6)', fontFamily: 'Pretendard, sans-serif' }}>{plan.desc}</div>
          </div>
        ))}
      </div>

      {/* URL */}
      <div style={{ opacity: fadeIn(localFrame, 80), textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '24px 60px', fontSize: 38, color: BRAND.white, fontFamily: 'Pretendard, monospace', fontWeight: 700, letterSpacing: 1 }}>
          mailmind.yongcha.app
        </div>
        <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.6)', fontSize: 26, fontFamily: 'Pretendard, sans-serif' }}>
          Chrome 웹 스토어에서 무료 설치
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 자막 오버레이
// ─────────────────────────────────────────────────────────────────────
function Subtitle({ frame, subtitles, fps = 30 }) {
  const currentSec = frame / fps;
  const sub = subtitles.find(s => currentSec >= s.start && currentSec < s.end);
  if (!sub) return null;
  const subFrame = frame - sub.start * fps;
  const opacity = fadeIn(subFrame, 0, 8);

  return (
    <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 60px', pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 16, padding: '18px 40px', maxWidth: 860, textAlign: 'center', opacity }}>
        <div style={{ color: BRAND.white, fontSize: 36, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
          {sub.text}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 메인 컴포지션
// ─────────────────────────────────────────────────────────────────────
function MailMindPromo({ lang = 'JP', variant = 'A', subtitles = DEFAULT_SUBTITLES, logoSrc = null }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: 'Pretendard, "Noto Sans JP", "Noto Sans KR", sans-serif', background: '#030d20', overflow: 'hidden' }}>
      {/* 씬 시퀀스 */}
      <Sequence from={0} durationInFrames={300}><Scene1 frame={frame} /></Sequence>
      <Sequence from={300} durationInFrames={300}><Scene2 frame={frame} /></Sequence>
      <Sequence from={600} durationInFrames={450}><Scene3 frame={frame} /></Sequence>
      <Sequence from={1050} durationInFrames={300}><Scene4 frame={frame} /></Sequence>
      <Sequence from={1350} durationInFrames={300}><Scene5 frame={frame} /></Sequence>
      <Sequence from={1650} durationInFrames={150}><Scene6 frame={frame} logoSrc={logoSrc} /></Sequence>

      {/* 자막 */}
      <Subtitle frame={frame} subtitles={subtitles} fps={fps} />

      {/* MailMind 상단 배지 (씬 1~5) */}
      {frame < 1650 && (
        <div style={{ position: 'absolute', top: 60, left: 60, display: 'flex', alignItems: 'center', gap: 16, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <div style={{ background: BRAND.blue, borderRadius: 16, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>✉️</span>
            <span style={{ color: BRAND.white, fontSize: 26, fontWeight: 700, fontFamily: 'Pretendard, sans-serif' }}>MailMind AI</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// Remotion 컴포지션 등록
function Root() {
  return (
    <>
      <Composition
        id="MailMindPromo"
        component={MailMindPromo}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ lang: 'JP', variant: 'A', subtitles: DEFAULT_SUBTITLES, logoSrc: null }}
      />
      <Composition
        id="MailMindReels"
        component={MailMindPromo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ lang: 'JP', variant: 'A', subtitles: DEFAULT_SUBTITLES.map(s => ({ ...s, start: s.start / 2, end: s.end / 2 })), logoSrc: null }}
      />
    </>
  );
}

module.exports = { MailMindPromo, Root, DEFAULT_SUBTITLES };
