const React = require('react');
const { useCurrentFrame, useVideoConfig, interpolate, Sequence, AbsoluteFill, Easing } = require('remotion');

// ── 색상 테마 (주차별 로테이션)
var THEMES = [
  // A: 핑크/충격 — "이력서 30초 분석"
  { bg: '#0d0008', mid: '#7a004a', accent: '#FF6B9D', accent2: '#FFB3D1', tag: '#FF6B9D' },
  // B: 골드/프리미엄 — "계약서 독소조항"
  { bg: '#0d0a00', mid: '#7a5500', accent: '#C9A84C', accent2: '#F0D080', tag: '#C9A84C' },
  // C: 민트/안전 — "전세사기 예방"
  { bg: '#001208', mid: '#005a30', accent: '#34D399', accent2: '#6EF0C0', tag: '#34D399' },
  // D: 스카이/신뢰 — "AI 문서 분석"
  { bg: '#00080d', mid: '#004a7a', accent: '#38BDF8', accent2: '#7DD3FC', tag: '#38BDF8' },
];

var VARIANTS = [
  {
    hook:    ['이력서 분석', '30초면 끝납니다'],
    hookSub: 'AI가 합격률 높이는 키워드를 즉시 추출',
    scene2Title: '취업 준비생의 현실',
    scene2Lines: [
      '이력서 첨삭 컨설팅 → 1회 15만원',
      '대기 시간 → 평균 2~4일',
      '결과 → "이 부분 수정해보세요" 1장',
    ],
    scene3Title: 'SCAN AI 분석 결과',
    scene3Items: [
      { label: '강점 키워드', val: '7개 발견', color: '#FF6B9D' },
      { label: '합격률 예측', val: '★★★★☆', color: '#FFD700' },
      { label: '개선 포인트', val: '3가지 제안', color: '#34D399' },
      { label: '분석 시간',   val: '28초', color: '#38BDF8' },
    ],
    cats: ['이력서 분석', '자소서 수정', '면접 질문', '자소서 재작성', '자소서 번역'],
    price: '19,900P',
    cta:   '취업 준비 AI와 함께',
  },
  {
    hook:    ['계약서 독소조항', '이걸 놓쳤습니까?'],
    hookSub: '법률 전문가 없이도 위험 조항 즉시 탐지',
    scene2Title: '계약서 실수의 현황',
    scene2Lines: [
      '계약서 법률 검토 → 변호사 1시간 30만원',
      '중소기업 계약 분쟁 → 연 37만 건 (2024)',
      '독소조항 발견 시점 → 대부분 문제 발생 후',
    ],
    scene3Title: '위험 조항 탐지 결과',
    scene3Items: [
      { label: '위험 조항', val: '3건 발견', color: '#FF6B9D' },
      { label: '불공정 약관', val: '2건 경고', color: '#FF9500' },
      { label: '위험도 점수', val: '높음 ⚠️', color: '#FF3B30' },
      { label: '분석 시간',  val: '45초', color: '#38BDF8' },
    ],
    cats: ['계약서 검토', '보험약관 분석', '근로계약 검토', '임대차 계약'],
    price: '29,900P',
    cta:   '계약 전 반드시 확인하세요',
  },
  {
    hook:    ['전세사기', 'AI로 예방하세요'],
    hookSub: '등기부등본 분석 → 선순위채권·깡통전세 즉시 탐지',
    scene2Title: '전세사기 피해 현황',
    scene2Lines: [
      '2024 전세사기 피해 → 누적 2만 건 돌파',
      '깡통전세 비율 → 수도권 아파트 18%',
      '등기부 확인 → 일반인이 읽기 어려움',
    ],
    scene3Title: '등기부 분석 결과',
    scene3Items: [
      { label: '전세가율',    val: '87% ⚠️', color: '#FF3B30' },
      { label: '선순위채권',  val: '1.2억원', color: '#FF9500' },
      { label: '깡통전세',    val: '위험 경보', color: '#FF3B30' },
      { label: '분석 시간',   val: '38초', color: '#34D399' },
    ],
    cats: ['등기부 전세사기 분석', '계약서 검토', '임대인 사업자 조회'],
    price: '29,900P',
    cta:   '계약 전 꼭 확인하세요',
  },
  {
    hook:    ['AI 문서 분석', 'mbtico.kr/scan'],
    hookSub: '계약서·이력서·등기부·공문서 — 수십 초 만에 핵심 파악',
    scene2Title: '이런 분들께 필요합니다',
    scene2Lines: [
      '취업 준비 중 → 이력서·자소서 첨삭',
      '계약서 검토 필요 → 독소조항 탐지',
      '부동산 계약 전 → 전세사기 예방',
    ],
    scene3Title: '전체 서비스 카테고리',
    scene3Items: [
      { label: '취업서류',  val: '5가지 서비스', color: '#FF6B9D' },
      { label: '법률·계약', val: '2가지 서비스', color: '#C9A84C' },
      { label: '부동산',    val: '1가지 서비스', color: '#34D399' },
      { label: '공문서',    val: '4가지 서비스', color: '#38BDF8' },
    ],
    cats: ['이력서', '계약서', '등기부', '자소서', '공문서', '면접 질문'],
    price: '19,900P~',
    cta:   '지금 바로 분석해보세요',
  },
];

var WEEK_VARIANT = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
var V = VARIANTS[WEEK_VARIANT];
var T = THEMES[WEEK_VARIANT];

function fi(frame, s, d) {
  return interpolate(frame, [s, s + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
function su(frame, s, d, dist) {
  var dd = dist === undefined ? 40 : dist;
  return interpolate(frame, [s, s + d], [dd, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

var BASE = {
  fontFamily: "'Noto Sans CJK KR','Noto Sans KR','Apple SD Gothic Neo',sans-serif",
  width: '100%', height: '100%', overflow: 'hidden',
};

// ── 파티클
function Particles(props) {
  var frame = useCurrentFrame();
  var items = [];
  for (var i = 0; i < 18; i++) {
    var x = (i * 37 + 11) % 100;
    var baseY = (i * 53 + 29) % 100;
    var size = 1.5 + (i % 4) * 0.8;
    var speed = 0.006 + (i % 5) * 0.003;
    var y = (baseY + frame * speed * 10) % 108 - 4;
    var opacity = 0.04 + (i % 4) * 0.03;
    items.push(React.createElement('div', {
      key: i,
      style: { position: 'absolute', left: x + '%', top: y + '%', width: size, height: size, borderRadius: '50%', background: T.accent, opacity: opacity },
    }));
  }
  return React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } }, ...items);
}

// ── 씬1: Hook (0-300프레임, 10초)
function SceneHook() {
  var frame = useCurrentFrame();
  return React.createElement(AbsoluteFill, {
    style: { ...BASE, background: 'linear-gradient(160deg, ' + T.bg + ' 0%, ' + T.mid + ' 100%)' },
  },
    React.createElement(Particles),
    // 스캔 라인 애니메이션
    React.createElement('div', {
      style: {
        position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 180, height: 180,
        border: '3px solid ' + T.accent,
        borderRadius: 24,
        opacity: fi(frame, 0, 20),
        overflow: 'hidden',
      },
    },
      React.createElement('div', {
        style: {
          position: 'absolute', left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, ' + T.accent + ', transparent)',
          top: interpolate(frame % 90, [0, 90], [-4, 184], { extrapolateRight: 'clamp' }) + 'px',
          opacity: 0.9,
          boxShadow: '0 0 12px ' + T.accent,
        },
      }),
      // 문서 줄
      ...Array.from({ length: 7 }, function(_, i) {
        return React.createElement('div', {
          key: i,
          style: {
            position: 'absolute', left: 16, right: 16,
            height: 10, borderRadius: 5,
            background: 'rgba(255,255,255,' + (0.1 + (i % 3) * 0.06) + ')',
            top: 20 + i * 22,
            opacity: fi(frame, i * 4, 12),
          },
        });
      }),
    ),
    // SCAN AI 뱃지
    React.createElement('div', {
      style: {
        position: 'absolute', top: '42%', left: '50%', transform: 'translateX(-50%)',
        background: T.accent + '22',
        border: '1.5px solid ' + T.accent,
        borderRadius: 30, padding: '10px 28px',
        opacity: fi(frame, 30, 20),
        whiteSpace: 'nowrap',
      },
    },
      React.createElement('span', { style: { color: T.accent, fontSize: 22, fontWeight: 900, letterSpacing: 2 } }, 'SCAN AI'),
    ),
    // 메인 훅
    React.createElement('div', {
      style: {
        position: 'absolute', top: '50%', width: '100%', textAlign: 'center', padding: '0 40px',
        transform: 'translateY(-50%) translateY(' + su(frame, 40, 25) + 'px)',
        opacity: fi(frame, 40, 25),
      },
    },
      React.createElement('div', {
        style: { color: '#fff', fontSize: 72, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, marginBottom: 8 },
      },
        V.hook[0],
        React.createElement('br'),
        React.createElement('span', { style: { color: T.accent } }, V.hook[1]),
      ),
    ),
    // 서브
    React.createElement('div', {
      style: {
        position: 'absolute', bottom: '14%', width: '100%', textAlign: 'center', padding: '0 48px',
        opacity: fi(frame, 80, 25),
        transform: 'translateY(' + su(frame, 80, 25) + 'px)',
      },
    },
      React.createElement('div', { style: { color: 'rgba(255,255,255,.75)', fontSize: 30, fontWeight: 600, lineHeight: 1.5 } }, V.hookSub),
    ),
  );
}

// ── 씬2: 문제 제기 (300-660프레임, 12초)
function SceneProblem() {
  var frame = useCurrentFrame();
  return React.createElement(AbsoluteFill, {
    style: { ...BASE, background: T.bg },
  },
    React.createElement(Particles),
    // 제목
    React.createElement('div', {
      style: {
        position: 'absolute', top: '12%', width: '100%', textAlign: 'center', padding: '0 48px',
        opacity: fi(frame, 0, 20), transform: 'translateY(' + su(frame, 0, 20) + 'px)',
      },
    },
      React.createElement('div', { style: { color: T.accent, fontSize: 28, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 } }, '현실'),
      React.createElement('div', { style: { color: '#fff', fontSize: 52, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.2 } }, V.scene2Title),
    ),
    // 문제 카드들
    ...V.scene2Lines.map(function(line, i) {
      return React.createElement('div', {
        key: i,
        style: {
          position: 'absolute',
          top: (34 + i * 16.5) + '%',
          left: 40, right: 40,
          background: 'rgba(255,255,255,.06)',
          border: '1.5px solid rgba(255,255,255,.12)',
          borderRadius: 18, padding: '22px 28px',
          opacity: fi(frame, 20 + i * 18, 20),
          transform: 'translateX(' + interpolate(frame, [20 + i * 18, 40 + i * 18], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) + 'px)',
        },
      },
        React.createElement('div', { style: { color: '#fff', fontSize: 31, fontWeight: 700, lineHeight: 1.45 } },
          React.createElement('span', { style: { color: T.accent, marginRight: 10, fontSize: 28 } }, '✕'),
          line,
        ),
      );
    }),
  );
}

// ── 씬3: 솔루션 (660-1020프레임, 12초)
function SceneSolution() {
  var frame = useCurrentFrame();
  return React.createElement(AbsoluteFill, {
    style: { ...BASE, background: T.bg },
  },
    React.createElement(Particles),
    // 제목
    React.createElement('div', {
      style: {
        position: 'absolute', top: '10%', width: '100%', textAlign: 'center', padding: '0 40px',
        opacity: fi(frame, 0, 20), transform: 'translateY(' + su(frame, 0, 20) + 'px)',
      },
    },
      React.createElement('div', { style: { color: T.accent, fontSize: 28, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 } }, 'AI 분석'),
      React.createElement('div', { style: { color: '#fff', fontSize: 50, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.2 } }, V.scene3Title),
    ),
    // 결과 카드
    React.createElement('div', {
      style: {
        position: 'absolute', top: '32%', left: 40, right: 40,
        background: 'rgba(255,255,255,.07)',
        border: '2px solid ' + T.accent + '55',
        borderRadius: 24, padding: '30px 32px',
        opacity: fi(frame, 15, 20), transform: 'translateY(' + su(frame, 15, 20) + 'px)',
      },
    },
      ...V.scene3Items.map(function(item, i) {
        return React.createElement('div', {
          key: i,
          style: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0',
            borderBottom: i < V.scene3Items.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none',
            opacity: fi(frame, 25 + i * 12, 16),
            transform: 'translateY(' + su(frame, 25 + i * 12, 16, 24) + 'px)',
          },
        },
          React.createElement('span', { style: { color: 'rgba(255,255,255,.7)', fontSize: 28, fontWeight: 600 } }, item.label),
          React.createElement('span', { style: { color: item.color, fontSize: 30, fontWeight: 900 } }, item.val),
        );
      }),
    ),
    // 하단 강조
    React.createElement('div', {
      style: {
        position: 'absolute', bottom: '12%', left: 40, right: 40, textAlign: 'center',
        opacity: fi(frame, 80, 20),
        transform: 'translateY(' + su(frame, 80, 20) + 'px)',
      },
    },
      React.createElement('div', {
        style: {
          display: 'inline-block',
          background: T.accent,
          borderRadius: 16, padding: '18px 48px',
        },
      },
        React.createElement('span', { style: { color: '#000', fontSize: 36, fontWeight: 900 } }, V.price + ' / 건'),
      ),
    ),
  );
}

// ── 씬4: 카테고리 (1020-1380프레임, 12초)
function SceneCategories() {
  var frame = useCurrentFrame();
  return React.createElement(AbsoluteFill, {
    style: { ...BASE, background: 'linear-gradient(180deg, ' + T.bg + ' 0%, ' + T.mid + '44 100%)' },
  },
    React.createElement(Particles),
    // 제목
    React.createElement('div', {
      style: {
        position: 'absolute', top: '10%', width: '100%', textAlign: 'center', padding: '0 40px',
        opacity: fi(frame, 0, 20),
      },
    },
      React.createElement('div', { style: { color: T.accent, fontSize: 28, fontWeight: 800, letterSpacing: 1, marginBottom: 10 } }, '서비스'),
      React.createElement('div', { style: { color: '#fff', fontSize: 54, fontWeight: 900, letterSpacing: -1.5 } }, '6가지 카테고리'),
    ),
    // 칩들 (흐르는 효과)
    React.createElement('div', {
      style: {
        position: 'absolute', top: '32%', left: 0, right: 0,
        display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center',
        padding: '0 40px',
      },
    },
      ...V.cats.map(function(cat, i) {
        return React.createElement('div', {
          key: i,
          style: {
            background: T.accent + '22', border: '2px solid ' + T.accent + '88',
            borderRadius: 40, padding: '14px 28px',
            color: '#fff', fontSize: 28, fontWeight: 700,
            opacity: fi(frame, 10 + i * 10, 18),
            transform: 'scale(' + interpolate(frame, [10 + i * 10, 28 + i * 10], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) }) + ')',
          },
        }, cat);
      }),
    ),
    // 가격 정보
    React.createElement('div', {
      style: {
        position: 'absolute', bottom: '14%', left: 40, right: 40,
        background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)',
        borderRadius: 20, padding: '24px 32px', textAlign: 'center',
        opacity: fi(frame, 80, 20), transform: 'translateY(' + su(frame, 80, 20) + 'px)',
      },
    },
      React.createElement('div', { style: { color: 'rgba(255,255,255,.6)', fontSize: 26, marginBottom: 8 } }, '포인트 1P = 1원 · 충전 즉시 사용'),
      React.createElement('div', { style: { color: T.accent, fontSize: 42, fontWeight: 900 } }, '19,900P ~ 39,900P'),
    ),
  );
}

// ── 씬5: CTA (1380-1800프레임, 14초)
function SceneCTA() {
  var frame = useCurrentFrame();
  var pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.96, 1.04]);
  return React.createElement(AbsoluteFill, {
    style: { ...BASE, background: 'linear-gradient(160deg, ' + T.bg + ' 0%, ' + T.mid + ' 60%, ' + T.bg + ' 100%)' },
  },
    React.createElement(Particles),
    // 원형 글로우
    React.createElement('div', {
      style: {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) scale(' + pulse + ')',
        width: 420, height: 420, borderRadius: '50%',
        background: T.accent + '18',
        filter: 'blur(60px)',
      },
    }),
    // 로고
    React.createElement('div', {
      style: {
        position: 'absolute', top: '22%', width: '100%', textAlign: 'center',
        opacity: fi(frame, 0, 25),
      },
    },
      React.createElement('div', { style: { fontSize: 36, fontWeight: 900, letterSpacing: 4, color: T.accent, marginBottom: 6 } }, 'SCAN AI'),
      React.createElement('div', { style: { fontSize: 28, color: 'rgba(255,255,255,.5)', fontWeight: 500 } }, 'mbtico.kr/scan'),
    ),
    // CTA 메시지
    React.createElement('div', {
      style: {
        position: 'absolute', top: '40%', width: '100%', textAlign: 'center', padding: '0 48px',
        opacity: fi(frame, 20, 25), transform: 'translateY(' + su(frame, 20, 25) + 'px)',
      },
    },
      React.createElement('div', { style: { color: '#fff', fontSize: 60, fontWeight: 900, lineHeight: 1.2, letterSpacing: -2 } }, V.cta),
    ),
    // 버튼
    React.createElement('div', {
      style: {
        position: 'absolute', top: '64%', left: '50%', transform: 'translateX(-50%) scale(' + pulse + ')',
        background: T.accent, borderRadius: 20, padding: '26px 72px',
        opacity: fi(frame, 50, 20), whiteSpace: 'nowrap',
      },
    },
      React.createElement('div', { style: { color: '#000', fontSize: 40, fontWeight: 900 } }, '무료로 체험하기 →'),
    ),
    // URL
    React.createElement('div', {
      style: {
        position: 'absolute', bottom: '12%', width: '100%', textAlign: 'center',
        opacity: fi(frame, 80, 20),
      },
    },
      React.createElement('div', { style: { color: 'rgba(255,255,255,.45)', fontSize: 26, fontWeight: 600 } }, 'mbtico.kr/scan'),
    ),
  );
}

// ── 메인 컴포넌트
function ScanPromo(props) {
  return React.createElement(AbsoluteFill, null,
    React.createElement(Sequence, { from: 0,    durationInFrames: 300  }, React.createElement(SceneHook)),
    React.createElement(Sequence, { from: 300,  durationInFrames: 360  }, React.createElement(SceneProblem)),
    React.createElement(Sequence, { from: 660,  durationInFrames: 360  }, React.createElement(SceneSolution)),
    React.createElement(Sequence, { from: 1020, durationInFrames: 360  }, React.createElement(SceneCategories)),
    React.createElement(Sequence, { from: 1380, durationInFrames: 420  }, React.createElement(SceneCTA)),
  );
}

module.exports = { ScanPromo };
