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

const QR_CODE_BASE64 = 'data:image/png;base64,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AgAkiBIAIEGUAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgYWz7prYDMmXzb/7XthU2d21q71XbE6ltstQ2dGrf6ebx3HjvbP5m+v/i12r3siclAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkDC2fXOitlNworY5MmVzN2HzdWp7K29V++xv3W2Zsnmf1q6NG3eITtT25qY+uyclAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkLC6fVNT29k58da9gxM37nfcuMly431xonYOP3mT5cZr9cb7ovbbcsKTEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkCBKAIAEUQIAJIgSACBBlAAACaIEAEgY277Z/Nv4m+/Fjtr+wpTaMW9uYWxuhdx4nqde5+Q8176L2o5MbYun9r1v/j57UgIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJY9s3U38bf3Ob48TmlsGU2r7JjbskN37vNx7zibdez5u/mSc2P3vtGqtt8dSuw02elAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAEDC2PbNW9X2BWr7HVPeep5rezRTx1Pby6jt49TUvvfa78+J2m9vbW9uiiclAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkPD1PM/am9V2Ezb/nv/mvkBtV6K2R3Ojze/0xv2OG/eeTtx4fmobQ7XPVVP7XJ6UAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQMKV2zdTbtwTqe3I1LYeantGJ2q7JFNqx7x5zdd+607Ufg9P1O5B18/v86QEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEla3b6bUtkJqmxE37trUvtNNtc9V22CaUrt3brwHT9x4PZ/wu/Frtm8AgFcRJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEr4336z2N/Zv3LC4cZujtmtz455IbXdjSu1z+b5+X+13/sQn/9Ztbl2d8KQEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEr6e51l7s82/n7+5LzCltokw9V5TNrcwptgB+f3XOXHj5lFtc+TG34QTbz3PJ2r3xQlPSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkCBKAIAEUQIAJIgSACDhe+qFansHm5sjtY2PmqlzWNsTOXmvt372E7V7Z1Ptu5hS+6176zV247UxxZMSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASPh6nuenj+FPaps1Uza3FWqf68bjqe13TKltamx+Xzd+72895hM37tHceH5qv1GelAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAEDC2PbNjX/P/8SN+xRTasd840bMW/cpTtTO4YnavsmJG+/T2rXh/vr995o6P56UAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQMLY9s2JzV2JG/cpalsGU+914sbvoraFMWXzu6j55O+0di/XjufEjcd8YvO+8KQEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEnLbN1M2/1b/WzdransZbz0/b90KufF4bnyvTbXvdErt+7rxeKZ4UgIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJY9s3N+5lvHUL48bdn7d664ZF7f46UTueTbXNmrf+Hp546+ea4kkJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkCBKAIAEUQIAJHxPvdDUlsHUpsaUzc815cb9jqnzXNuDuHEjpqb223Lj65y4cZOltulzorZNVvvt9aQEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEsa2b2o7DjfuidR2HGrn8K27Nidu3MuoqW181PZxatfY1OvcuMUz5cZrw5MSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJogQASPh6nmfkhWo7MidqWzMnbtwyOHHjxkftmv/k7/REbdvlxuuwdsy1/aATN57DTZ6UAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQMLY9s1b1fYFapsRb32v2h7ElNpez4nNe+fG+3RKbUOn9ptwo9p5PuFJCQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACTYvlly445DbXPEPkXndabc+Llq99eJG+8d39eO2v3lSQkAkCBKAIAEUQIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkfE+90I3bClNO/ub/5m7CidquRG3rYcqNm0cnahs6U2obOpvnsPZ93XjvbH6nU5+rdh16UgIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkiBIAIEGUAAAJY9s3J2rbCidu3PSZ2kSo7W7UjvlE7Xim3Pi5ajtNb73mT7z1c924q1XjSQkAkCBKAIAEUQIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQIEoAgARRAgAkfD3PM/JCU1sGm3/Pf3N7YnMvY8rmZ6/tXNz4fZ14617Gibdeq5tuvC/ees1PncPad+pJCQCQIEoAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACR8//QB8N+p7RRsunEX6ZO3VDa3OW7ctbnxet58r6nv4saNmM3fltrvjyclAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkGD7ht9y435HbVNjyid/Fyc2j3nzdU7c+F2c2LzmT7z1t2WTJyUAQIIoAQASRAkAkCBKAIAEUQIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQ8PU8z8gL1bYVptz4uW7cg7hxt6Wmtkdz4zmsufG3ZfP+qp2fE7V9pRpPSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkCBKAIAEUQIAJIgSACBhdfvmrTa3Qmq7Ejd+75t7ELXzU9u1qV3PU9zLv3bjdzH1XlNq188UT0oAgARRAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgYWz7BgDgd3hSAgAkiBIAIEGUAAAJogQASBAlAECCKAEAEkQJAJAgSgCABFECACSIEgAgQZQAAAmiBABIECUAQIIoAQASRAkAkCBKAIAEUQIAJIgSACBBlAAACaIEAEgQJQBAgigBABJECQCQ8E80EkEstoqDEgAAAABJRU5ErkJggg==';

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
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 60%, #030d20 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 90, paddingLeft: 80, paddingRight: 80 }}>
      {/* 상단 고정: URL + QR코드 */}
      <div style={{ opacity: fadeIn(localFrame, 20), textAlign: 'center', marginBottom: 36 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '18px 52px', fontSize: 36, color: BRAND.white, fontFamily: 'Pretendard, monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>
          mailmind.yongcha.app
        </div>
        <img src={QR_CODE_BASE64} style={{ width: 180, height: 180, background: '#fff', borderRadius: 18, padding: 10 }} />
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.85)', fontSize: 22, fontFamily: 'Pretendard, sans-serif', fontWeight: 600 }}>스캔하여 바로 설치</div>
        <div style={{ marginTop: 6, color: BRAND.cyan, fontSize: 18, fontFamily: 'Pretendard, monospace' }}>Chrome Web Store</div>
      </div>

      {/* 로고 */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 28 }}>
        {logoSrc ? (
          <img src={logoSrc} style={{ width: 160, height: 160, borderRadius: 32 }} />
        ) : (
          <div style={{ width: 160, height: 160, background: BRAND.blue, borderRadius: 32, border: `4px solid ${BRAND.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>✉️</div>
        )}
      </div>

      <div style={{ opacity: fadeIn(localFrame, 10), textAlign: 'center', marginBottom: 36 }}>
        <div style={{ color: BRAND.white, fontSize: 50, fontWeight: 900, fontFamily: 'Pretendard, sans-serif', letterSpacing: -1 }}>MailMind AI</div>
        <div style={{ color: BRAND.cyan, fontSize: 26, fontFamily: 'Pretendard, sans-serif', marginTop: 10 }}>AI Gmail 이메일 답장 Chrome 확장</div>
      </div>

      {/* 플랜 카드 */}
      <div style={{ display: 'flex', gap: 28, opacity: fadeIn(localFrame, 40) }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{ background: plan.highlight ? BRAND.white : 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 40px', textAlign: 'center', border: plan.highlight ? `3px solid ${BRAND.cyan}` : '3px solid rgba(255,255,255,0.15)', minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: plan.highlight ? BRAND.blue : 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard, sans-serif', marginBottom: 10 }}>{plan.name}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: plan.highlight ? BRAND.blue : BRAND.white, fontFamily: 'Pretendard, sans-serif', marginBottom: 6 }}>{plan.price}</div>
            <div style={{ fontSize: 20, color: plan.highlight ? BRAND.textMid : 'rgba(255,255,255,0.6)', fontFamily: 'Pretendard, sans-serif' }}>{plan.desc}</div>
          </div>
        ))}
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
