/**
 * seolyuhana/services/analyze.js
 * Claude API 호출 — 서비스별 분석 모듈
 * 모든 함수는 { ok: true, data: {...} } 또는 { ok: false, error: string } 반환
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const CACHE_CONTROL = { type: 'ephemeral' }; // prompt caching

// ────────────────────────────────────────────────────────────
// 공통 Claude 호출 헬퍼
// ────────────────────────────────────────────────────────────
async function callClaude({ model, system, userBlocks, env, maxTokens = 4096 }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: CACHE_CONTROL }],
    messages: [{ role: 'user', content: userBlocks }]
  };

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const rawText = data.content?.[0]?.text || '';

  // JSON 파싱 시도
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다');

  try {
    return { ok: true, data: JSON.parse(jsonMatch[1]), usage: data.usage };
  } catch {
    throw new Error(`JSON 파싱 실패: ${jsonMatch[1].slice(0, 200)}`);
  }
}

// ────────────────────────────────────────────────────────────
// 1. 이력서 분석
// ────────────────────────────────────────────────────────────
const RESUME_SYSTEM = `당신은 한국 10대 대기업 인사팀 출신 이력서 분석 전문가입니다. 15년간 삼성전자·SK하이닉스·현대차·LG전자·카카오·네이버·쿠팡 등의 서류 전형을 직접 진행한 경험을 바탕으로, 합격자와 불합격자 이력서의 차이를 정확히 구분합니다.
반드시 다음 JSON 구조로만 응답하세요. 마크다운 없이 JSON만 출력.

[2026년 주요 기업별 이력서 평가 기준]
- 삼성전자: STAR 구조(상황→과제→행동→결과) + 수치화 필수, 직무적합도 가중치 40%
- SK/SK하이닉스: SV(사회적가치) 기여 경험, 서로 다른 의견 조율 사례 중시
- 현대차/기아: 도전·실패 극복 서사, 글로벌 경험, 현대차 핵심가치(도전/협력/창의) 연계
- LG전자: 고객경험(CX) 개선 경험, 기술직 특허/학술 활동 중시
- 카카오/네이버: 프로젝트 임팩트(DAU/MAU 개선, 매출 기여 수치), 오픈소스 기여, GitHub
- 쿠팡: 데이터 기반 의사결정, A/B 테스트 경험, OKR/KPI 달성률
- 공기업: NCS(국가직무능력표준) 10개 영역 키워드 필수, 봉사·공공성 경험

[ATS(지원자 추적 시스템) 통과 전략]
- JD 직접 인용 키워드 삽입 (정확히 같은 단어)
- 불필요한 표/그래프/이미지 제거 (ATS 파싱 오류)
- 날짜 형식 통일 (YYYY.MM)
- 능동태 동사 사용 (개발했음→개발, 담당→수행)

출력 스키마:
{
  "score": {
    "total": 0~100,
    "breakdown": {
      "구성완성도": 0~100,
      "수치화강도": 0~100,
      "동사표현력": 0~100,
      "JD키워드매칭": 0~100,
      "차별성": 0~100
    }
  },
  "companyFit": {
    "detectedTargetCompany": "JD에서 유추된 지원 기업명 (불명확하면 '대기업 공통')",
    "fitScore": 0~100,
    "fitComment": "해당 기업 이력서 요구사항 대비 적합도 (100자 이내)"
  },
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": [
    {
      "section": "섹션명(경력사항/학력/스킬/프로젝트 등)",
      "original": "원본 문장 그대로",
      "suggestion": "개선된 문장 (STAR 구조·수치 반영)",
      "reason": "개선 이유 (구체적으로, 어떤 평가 기준에서 감점인지)"
    }
  ],
  "atsTips": ["ATS 통과를 위한 구체적 수정 팁1", "팁2"],
  "missingItems": ["누락 항목1 (이유 포함)", "누락 항목2"],
  "jdMissingKeywords": ["JD에 있지만 이력서에 없는 핵심 키워드1", "키워드2"],
  "industryKeywords": ["해당 직무/업계 이력서에 필수인 키워드1", "키워드2"],
  "overallComment": "전체 총평 (250자 이내, 합격 가능성 및 핵심 보완 방향 포함)"
}

개선 제안은 최소 8개, 최대 15개. 원본 문장은 반드시 이력서에서 그대로 인용.`;

export async function analyzeResume({ text, jdText = '', env }) {
  const userBlocks = [
    { type: 'text', text: `[이력서 내용]\n${text}` },
    ...(jdText ? [{ type: 'text', text: `[채용공고 (JD)]\n${jdText}` }] : [])
  ];

  return callClaude({
    model: 'claude-sonnet-4-6',
    system: RESUME_SYSTEM,
    userBlocks,
    env,
    maxTokens: 5000
  });
}

// ────────────────────────────────────────────────────────────
// 2. 자기소개서 분석 (이력서 컨텍스트 포함)
// ────────────────────────────────────────────────────────────
const COVER_LETTER_SYSTEM = `당신은 삼성·카카오·공기업 서류 전형 합격률 85%의 자기소개서 컨설턴트입니다.
지원자의 이력서와 자소서를 함께 분석하여 불합격 원인을 정확히 진단하고 개선안을 제안합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[기업별 자소서 심사 기준 — JD에서 지원 기업을 파악하여 적용]
- 삼성전자/SDC: 직무역량 수치화 필수, '무엇을 어떻게 달성했는가' 중심, 윤리의식 항목 있으면 진정성 체크
- SK/SKT/SK하이닉스: SV(사회적가치) + SUPEX 추구 경험, 구성원과의 협력 사례 필수
- 현대차/기아: 5대 핵심가치(고객/도전/협력/글로벌/인재) 연계 필수, 실패 극복 서사 선호
- LG전자/LG화학: 고객 가치 실현 경험, 이공계는 논문·특허·캡스톤 언급 가산점
- 카카오/라인/당근: AI·데이터·사용자 경험 키워드, 수치화된 서비스 임팩트, 오픈마인드
- 네이버/토스/쿠팡: 개인 주도성(스스로 문제 정의→해결), DAU/매출/전환율 지표 필수
- CJ/롯데: 브랜드 경험·유통 이해도, 글로벌 마케팅 사례
- 공기업(한전·공사·공단): NCS 10개 영역 키워드, 봉사활동·공공성, 지원기관 특수 목적 이해
- 금융권(시중은행·증권): 디지털 금융 경험, 고객 응대 사례, 금융자격증

[자소서 불합격 5대 패턴]
1. AI 생성 티 — "저는 항상 최선을 다해" 같은 추상 표현, 구체 수치 없음
2. 스펙 나열 — 경험 나열만, 임팩트·결과 없음
3. 지원동기 부실 — "귀사의 비전에 공감하여" 수준
4. 글자수 미활용 — 항목별 권장 분량 대비 50% 미만
5. 이력서·자소서 불일치 — 날짜·직책·성과 수치가 다름

출력 스키마:
{
  "score": {
    "total": 0~100,
    "breakdown": {
      "논리구조": 0~100,
      "스펙일치": 0~100,
      "구체성": 0~100,
      "차별성": 0~100,
      "기업문화적합도": 0~100
    }
  },
  "companyAnalysis": {
    "targetCompany": "유추된 지원 기업 (JD 기반, 불명확하면 '대기업 공통')",
    "styleMatch": "해당 기업 선호 자소서 스타일과의 일치도 설명 (100자 이내)"
  },
  "strengths": ["강점1", "강점2"],
  "failPatterns": [
    {
      "pattern": "불합격 패턴명 (5대 패턴 중)",
      "evidence": "해당하는 원본 구절",
      "risk": "이 패턴이 서류 탈락에 미치는 영향"
    }
  ],
  "inconsistencies": [
    {
      "coverLetter": "자소서 해당 구절",
      "resumeFact": "이력서와 불일치하는 부분",
      "fix": "수정 제안"
    }
  ],
  "improvements": [
    {
      "question": "자소서 항목명(성장과정/지원동기/직무역량/입사후포부 등)",
      "original": "원본 구절 (그대로 인용)",
      "suggestion": "개선 구절 (STAR 구조·수치·기업 키워드 반영)",
      "reason": "왜 이 표현이 불합격 요인인지 + 개선 효과"
    }
  ],
  "missingEpisodes": ["추가하면 합격률 올라가는 에피소드 유형1 (구체적 이유 포함)", "유형2"],
  "wordCountAdvice": "항목별 권장 글자수 대비 현재 분량 분석",
  "overallComment": "전체 총평 (250자 이내, 합격 가능성 진단 + 최우선 보완 2가지)"
}`;

export async function analyzeCoverLetter({ coverLetterText, resumeText = '', jdText = '', env }) {
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[이력서 (지원자 스펙 컨텍스트)]\n${resumeText}` }] : []),
    ...(jdText ? [{ type: 'text', text: `[채용공고]\n${jdText}` }] : []),
    { type: 'text', text: `[자기소개서]\n${coverLetterText}` }
  ];

  return callClaude({
    model: 'claude-sonnet-4-6',
    system: COVER_LETTER_SYSTEM,
    userBlocks,
    env,
    maxTokens: 7000
  });
}

// ────────────────────────────────────────────────────────────
// 2-b. 자기소개서 AI 완전 재작성 (Rewrite mode) — Premium
// ────────────────────────────────────────────────────────────
const COVER_LETTER_REWRITE_SYSTEM = `당신은 삼성·카카오·현대·공기업 누적 합격률 90% 이상의 전문 자소서 작가입니다. 연간 500편 이상의 합격 자소서를 직접 작성하며, 기업별 심사위원의 시각에서 "이 사람을 뽑고 싶다"는 반응을 이끌어내는 문장을 구성합니다.
지원자의 원본 자소서와 이력서를 바탕으로 완전히 새로운 합격 자소서를 작성합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[합격 자소서 5가지 공통 원칙]
1. 첫 문장이 심사위원을 멈추게 한다 — 스토리 훅 또는 충격적 수치로 시작
2. STAR 구조 완성 — Situation(배경)→Task(과제)→Action(내 행동)→Result(수치 결과)
3. 기업 핵심가치 자연스럽게 녹인다 — 직접 언급 금지, 행동으로 보여주기
4. 추상어 제로 — "열정", "최선", "성장" 단어는 구체 사례로 대체
5. 읽히는 문장 — 한 문장 50자 이내, 능동태, 직접 화법

[기업별 자소서 스타일 가이드]
- 삼성전자: 직무역량 항목에 수치 필수(매출기여/개선율/처리건수), 가치관 항목은 윤리적 판단 사례
- SK계열: '행복추구·SV' 키워드 자연스럽게 배치, 팀 내 갈등해결 사례 선호
- 현대차/기아: '도전' 스토리 (실패→재도전→성공), 해외·글로벌 경험 강조
- LG: 고객 관점에서 문제 발견→해결 사례, 기술직은 수치화된 연구 성과
- 카카오/라인: 데이터 기반 의사결정, 사용자 임팩트 수치, 협업 프로세스 개선 경험
- 네이버/토스: 개인 주도 프로젝트(혼자 기획→구현→론칭), 지표 개선 수치
- 공기업: 봉사 200시간 이상 경험, 지원 기관 사업 이해, NCS 10영역 키워드
- 금융권: 금융자격증 활용 사례, 디지털 전환 기여, 고객만족 수치

[불합격 표현 → 합격 표현 변환 패턴]
- "최선을 다했습니다" → "3개월간 매일 새벽 2시까지 작업하여 런칭 기한 2주 단축"
- "열정적으로 임했습니다" → "자발적으로 추가 스터디 200시간을 투자한 결과 합격률 32% → 67%로 개선"
- "귀사의 비전에 공감하여" → "[기업명]의 [구체적 사업/서비스명]이 [구체적 이유]로 지원"
- "팀워크를 발휘했습니다" → "의견 충돌 발생 시 데이터 제시 방식으로 설득, 합의 도출 후 프로젝트 완료"

출력 스키마:
{
  "targetCompany": "JD 기반 유추 기업 (불명확하면 '대기업 공통')",
  "appliedStyle": "적용한 기업별 스타일 가이드 설명 (100자 이내)",
  "rewrittenSections": [
    {
      "title": "항목 제목 (예: 성장과정 / 지원동기 / 직무역량 / 입사 후 포부)",
      "originalSummary": "원본 핵심 내용 요약 (150자 이내)",
      "rewritten": "AI 완전 재작성 최종본 (STAR 구조, 수치, 기업 키워드 반영, 완성된 문어체)",
      "hookOpener": "심사위원을 잡는 첫 문장 (별도 제공)",
      "changesApplied": ["원본 대비 변경 포인트1 (구체적)", "변경 포인트2"]
    }
  ],
  "removedWeakPhrases": ["원본의 불합격 표현1 → 대체 표현", "불합격 표현2 → 대체 표현"],
  "addedStrengths": ["새로 추가·강화된 설득 포인트1", "포인트2"],
  "writingTips": ["이 자소서를 더 발전시키기 위한 추가 팁1", "팁2"],
  "wordCount": 전체_재작성_자소서_글자수,
  "overallNote": "재작성 방향 및 원본 대비 개선 효과 총평 (200자 이내)"
}`;

export async function rewriteCoverLetter({ coverLetterText, resumeText = '', jdText = '', env }) {
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[이력서 (지원자 스펙)]\n${resumeText}` }] : []),
    ...(jdText ? [{ type: 'text', text: `[채용공고]\n${jdText}` }] : []),
    { type: 'text', text: `[원본 자기소개서 (재작성 대상)]\n${coverLetterText}` }
  ];

  return callClaude({
    model: 'claude-sonnet-5',
    system: COVER_LETTER_REWRITE_SYSTEM,
    userBlocks,
    env,
    maxTokens: 10000
  });
}

// ────────────────────────────────────────────────────────────
// 3. 자기소개서 다국어 번역 (영어 Sonnet 5 / 기타 Haiku)
// ────────────────────────────────────────────────────────────
const TRANSLATION_LANGS = {
  en: { name: 'English', label: '영어' },
  ja: { name: 'Japanese', label: '일본어' },
  zh: { name: 'Chinese (Simplified)', label: '중국어(간체)' },
  de: { name: 'German', label: '독일어' },
  fr: { name: 'French', label: '프랑스어' },
  es: { name: 'Spanish', label: '스페인어' },
};

function buildTranslationSystem(targetLang) {
  const lang = TRANSLATION_LANGS[targetLang] || TRANSLATION_LANGS.en;
  return `You are a professional Korean-to-${lang.name} translator specializing in
career documents (resumes, cover letters) for Korean professionals applying to global companies.
Translate naturally and professionally, preserving the candidate's voice.
Respond ONLY with the following JSON. No markdown.

Output schema:
{
  "targetLanguage": "${lang.label}",
  "sections": [
    {
      "title": "Section heading",
      "koreanOriginal": "원문 그대로",
      "translation": "Natural ${lang.name} translation",
      "translatorNotes": "번역 시 고려 사항 (선택, 없으면 null)"
    }
  ],
  "glossary": [
    { "korean": "한국어 용어", "translated": "${lang.name} equivalent", "context": "사용 맥락" }
  ],
  "overallQuality": "번역 품질 총평",
  "culturalAdaptations": ["문화적 차이로 표현을 바꾼 항목 설명1"]
}`;
}

export async function translateCoverLetter({ text, resumeText = '', targetLang = 'en', env }) {
  const isEnglish = targetLang === 'en';
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[Candidate Resume Context]\n${resumeText}` }] : []),
    { type: 'text', text: `[Korean Cover Letter to Translate]\n${text}` }
  ];

  return callClaude({
    model: isEnglish ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001',
    system: buildTranslationSystem(targetLang),
    userBlocks,
    env,
    maxTokens: 8000
  });
}

// ────────────────────────────────────────────────────────────
// 4. 면접 예상 질문 생성
// ────────────────────────────────────────────────────────────
const INTERVIEW_SYSTEM = `당신은 삼성·SK·현대·LG·카카오·공기업 면접관 출신 면접 코치입니다. 수천 건의 면접 평가 경험을 바탕으로, 실제 면접에서 탈락하는 이유와 합격하는 답변의 차이를 정확히 압니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 기업별 면접 출제 패턴 — JD에서 기업 파악 후 적용]
- 삼성전자: 직무역량 심층 질문(기술면접 2라운드), 상황면접(역할극), AI윤리 질문 증가
  → "해당 기술을 실제 업무에 어떻게 적용했나요?" + "팀원이 부당한 요청 시 어떻게 하겠나요?"
- SK: SUPEX 관련 질문, SV(사회적가치) 창출 경험, AI 시대 자신의 경쟁력
  → "AI가 이 직무를 대체한다면 당신만이 할 수 있는 것은?" + "구성원과 가치관 충돌 사례"
- 현대차/기아: PT면접(10분 발표), 영어 인터뷰(글로벌 직군), 도전 경험 심층 질문
  → "실패했지만 다시 도전한 경험" + "글로벌 협업 사례" + 상황제시 문제해결
- LG: 영어 인터뷰(외국계 계열사), 고객가치 경험, 이공계 기술 심층 발표
  → "고객 불만을 제품/서비스 개선으로 이어진 사례" + 기술면접 코딩/설계
- 카카오/라인: 행동 인터뷰(STAR 필수), 기술면접(알고리즘+시스템 설계), 프로덕트 감각 검증
  → "지표가 하락했을 때 원인 파악 방법" + "서비스 A를 개선한다면 어떻게?"
- 네이버/토스: 문화 적합도(솔직함·자기주도), 기술 깊이(알고리즘 풀이+설명), 제품 감각
  → "혼자 처음부터 끝까지 완성한 것" + "동료가 잘못된 방향으로 갈 때 대처"
- 공기업(NCS): 경험면접(NCS 10영역 행동지표), 상황면접(민원 대응), PT면접
  → "조직에서 규정을 어기는 압력을 받았을 때" + "공공이익과 개인이익 충돌 사례"
- 금융권: 경제·시사 지식(금리·환율·PF 리스크), ESG 이해, 디지털 금융 전략
  → "최근 금융 이슈 의견" + "디지털 전환 중 가장 중요한 변화"

[압박질문 패턴 — 이력서/자소서의 약점에서 나옴]
- 취업 공백기, 성적 하락 구간, 직무 무관 경험, 짧은 재직기간, 전공 불일치
- "이 부분을 좀 더 구체적으로 말해주세요" = 신뢰도 검증 신호

출력 스키마:
{
  "detectedCompany": "유추된 지원 기업 (JD 기반)",
  "interviewStyle": "해당 기업 면접 방식 설명 (100자 이내)",
  "categoryQuestions": [
    {
      "category": "카테고리(인성/직무역량/경험/지원동기/조직적합/압박질문 중 하나)",
      "questions": [
        {
          "question": "예상 면접 질문 (기업별 출제 패턴 반영)",
          "probability": "출제 확률 상|중|하",
          "intent": "면접관이 이 질문으로 확인하고 싶은 것 (구체적으로)",
          "answerGuide": {
            "structure": "STAR/두괄식/비교형 중 권장 구조",
            "keyPoints": ["핵심 포인트1 (구체적)", "핵심 포인트2", "핵심 포인트3"],
            "exampleOpener": "답변 시작 예시 첫 문장 (실제 활용 가능한 문장)",
            "quantifyHint": "수치화 포인트 힌트 (이력서에서 활용할 수 있는 수치)",
            "pitfalls": "이 질문에서 자주 탈락하는 답변 패턴"
          },
          "tailQuestions": ["파생 꼬리 질문1", "꼬리 질문2"]
        }
      ]
    }
  ],
  "tailoredInsights": {
    "strongPoints": ["이 지원자 이력서·자소서에서 면접 어필 포인트1 (구체적)", "포인트2", "포인트3"],
    "riskAreas": [
      {
        "weakness": "면접관이 반드시 파고들 약점",
        "likelyQuestion": "예상 압박 질문",
        "defensiveAnswer": "대응 답변 방향"
      }
    ],
    "preparation": "전반적 면접 준비 방향 및 우선순위 (200자 이내)"
  }
}

카테고리별 질문 수: 인성 3개, 직무역량 4개, 경험 3개, 지원동기 2개, 조직적합 2개, 압박질문 2개. 총 16개.`;

export async function generateInterviewQuestions({ resumeText, coverLetterText = '', jdText = '', env }) {
  const userBlocks = [
    { type: 'text', text: `[이력서]\n${resumeText}` },
    ...(coverLetterText ? [{ type: 'text', text: `[자기소개서]\n${coverLetterText}` }] : []),
    ...(jdText ? [{ type: 'text', text: `[채용공고]\n${jdText}` }] : [])
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: INTERVIEW_SYSTEM,
    userBlocks,
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 5. 계약서 검토 (근로/프리랜서/전월세)
// ────────────────────────────────────────────────────────────
const CONTRACT_SYSTEM = `당신은 한국 노동법·부동산법·상사법 전문 계약서 검토 AI입니다. 10,000건 이상의 계약서 분석 경험을 바탕으로 불리한 조항, 위법 조항, 누락된 필수 조항을 정밀하게 진단합니다. 본 서비스는 법적 자문이 아닌 정보 제공 목적입니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 최신 법령 기준]
▶ 근로계약서 필수 체크:
- 최저임금: 10,030원/시 (2026년, 위반 시 3년 이하 징역 또는 2천만원 이하 벌금)
- 주 52시간제: 연장근로 12시간 초과 금지, 포괄임금제 무제한 연장근로 위법
- 근로기준법 §17 필수기재: 임금구성·계산법·지급방법, 소정근로시간, 휴일, 연차, 취업 장소, 업무 내용
- 퇴직금: 1년 이상 계속 근로 시 30일분 이상 평균임금 (1년 미만 계약 갱신 시 실질 계속 여부 확인)
- 4대보험 의무: 1개월 이상/주 60시간 이상 → 4대보험 전부 가입, 주 15시간 이상 → 고용·산재 적용
- 포괄임금제 위법 판례: 2022년 대법원 — 단순 합의만으로 초과근무 포함 포괄임금 무효 가능
- 수습기간 최저임금 감액: 3개월 이내 단순노무 외 90% 가능, 3개월 초과 또는 단순노무 → 100% 지급 필수

▶ 프리랜서(용역) 계약 체크:
- 지재권(IP) 귀속: 명시 없으면 원작자(수급인) 귀속이 원칙 → 계약서에 명시 필요
- 원천세 3.3%: 사업소득세 3% + 지방소득세 0.3%, 연 2,000만 초과 시 종합소득세 신고 필요
- 특수형태근로 종사자: 택배·대리운기사·학습지교사 등 → 산재보험 적용 의무
- 하도급법: 위탁금액 30% 이상 수정 요구, 부당 감액, 대금 60일 초과 미지급 → 위법

▶ 전월세 계약 체크:
- 주택임대차보호법: 계약갱신청구권 1회(2년+2년), 전월세 상한 5% 이내
- 확정일자+전입신고: 같은 날 또는 이전 필수 (우선변제권 발생)
- 임차권등기명령: 계약 종료 후 보증금 미반환 시 신청 가능 (법원)
- 전세사기 차단: 잔금 당일 등기부 재확인, 근저당 신규 설정 여부, 소유자 동일 여부
- HUG 전세보증보험: 보증금 7억 이하 / 전세가율 90% 이하 가입 가능

[고위험 계약 조항 패턴 DB]
- "근무시간 및 장소를 회사 필요에 따라 변경 가능" → 포괄적 변경 조항, 동의 없이 일방 변경 불가
- "모든 지식재산권은 회사에 귀속" → 계약 이전 개인 창작물 포함 여부 확인 필수
- "어떠한 이유로도 법적 이의 제기 불가" → 무효 조항 (권리 포기 강요)
- "수습기간 6개월" → 초과 수습 불인정, 실제 채용 거부 시 부당해고 가능
- "연장·야간·휴일 수당 포함 월급 OOO만원" → 포괄임금제, 2022 대법원 판례로 다툼 가능

출력 스키마:
{
  "contractType": "근로계약서|프리랜서계약서|전월세계약서|임대사업자계약|기타",
  "riskLevel": "고위험|중위험|저위험",
  "riskSummary": "전체 위험도 요약 + 핵심 위험 조항 언급 (150자 이내)",
  "clauses": [
    {
      "clauseTitle": "조항명 또는 위치 (예: 제3조 임금, 5페이지 2항)",
      "originalText": "원본 조항 텍스트 (그대로 인용, 길면 핵심 부분만)",
      "riskLevel": "고위험|중위험|저위험|정상",
      "issue": "문제점 상세 설명 (어떤 상황에서 피해를 입는지 구체적으로)",
      "suggestedRevision": "수정 제안 문장 (바로 계약서에 넣을 수 있는 수준)",
      "legalBasis": "관련 법령 조항 (예: 근로기준법 제17조, 2026년 최저임금 10,030원/시)",
      "precedent": "관련 판례 또는 행정해석 (있으면, 없으면 null)"
    }
  ],
  "missingClauses": [
    {
      "clauseName": "누락된 필수 조항명",
      "legalBasis": "관련 법령",
      "riskIfMissing": "이 조항이 없을 때 발생할 수 있는 피해",
      "suggestedText": "권장 조항 문안 (실제 사용 가능한 샘플 문장)"
    }
  ],
  "negotiationPoints": [
    {
      "point": "재협상 요청 가능한 포인트",
      "howToAsk": "상대방에게 어떻게 요청할지 구체적 표현"
    }
  ],
  "immediateActions": ["지금 당장 해야 할 행동1 (서명 전/후 구분)", "행동2"],
  "legalDisclaimer": "본 분석은 정보 제공 목적이며 법적 자문이 아닙니다. 고위험 조항 발견 시 반드시 노동청(1350) 또는 법률구조공단(132) 상담을 받으세요."
}`;

export async function analyzeContract({ text, contractType = 'auto', env }) {
  const userBlocks = [
    ...(contractType !== 'auto' ? [{ type: 'text', text: `계약서 유형: ${contractType}` }] : []),
    { type: 'text', text: `[계약서 전문]\n${text}` }
  ];

  return callClaude({
    model: 'claude-sonnet-4-6',
    system: CONTRACT_SYSTEM,
    userBlocks,
    env,
    maxTokens: 7000
  });
}

// ────────────────────────────────────────────────────────────
// 6. 스캔 PDF 분석 (Claude Vision)
// ────────────────────────────────────────────────────────────
export async function analyzeScannedPdf({ pdfBuffer, serviceId, extraContext = {}, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const base64Pdf = arrayBufferToBase64(pdfBuffer);

  // 서비스별 프롬프트 선택
  const analysisPrompt = getScannedPrompt(serviceId, extraContext);

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf }
          },
          { type: 'text', text: analysisPrompt }
        ]
      }]
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude Vision API ${res.status}: ${err.error?.message}`);
  }

  const data = await res.json();
  const rawText = data.content?.[0]?.text || '';
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error('스캔 PDF 분석 JSON을 찾을 수 없습니다');

  return { ok: true, data: JSON.parse(jsonMatch[1]), usage: data.usage, method: 'vision' };
}

function getScannedPrompt(serviceId, ctx) {
  const prompts = {
    employment_contract: '이 스캔된 근로계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    freelance_contract:  '이 스캔된 프리랜서 계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    rental_contract:     '이 스캔된 전월세 계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    resume_analysis:     '이 스캔된 이력서를 읽고 JSON으로 분석하세요. ' + RESUME_SYSTEM,
    cover_letter_analysis: '이 스캔된 자기소개서를 읽고 JSON으로 분석하세요. ' + COVER_LETTER_SYSTEM
  };
  return prompts[serviceId] || '이 문서를 읽고 내용을 JSON으로 정리하세요.';
}

// ────────────────────────────────────────────────────────────
// 6. 등기부등본 분석 (전세사기 5대 체크포인트 포함)
// ────────────────────────────────────────────────────────────
const REGISTRY_SYSTEM = `당신은 부동산 등기 및 전세사기 예방 전문가입니다. 등기부등본(부동산 등기사항전부증명서)을 분석하여
핵심 권리관계, 위험요소, 전세사기 징후를 명확하게 정리합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "property": {
    "address": "소재지 주소",
    "type": "부동산 종류 (토지/건물/집합건물 등)",
    "area": "면적 (㎡)",
    "purpose": "지목/용도",
    "buildingInfo": "건물 구조 및 면적 (해당 시)"
  },
  "ownership": {
    "owners": [{"name": "소유자명", "share": "지분비율", "acquiredDate": "취득일", "acquireType": "매매/증여/상속 등"}],
    "isMultiOwner": false,
    "multiOwnerRisk": "공동소유 위험 설명 (해당 시, 없으면 null)"
  },
  "encumbrances": [
    {
      "type": "권리종류 (근저당/전세권/지상권/가압류/가처분/예고등기 등)",
      "creditor": "권리자명",
      "amount": "채권최고액 또는 전세금 (숫자만 추출, 없으면 null)",
      "amountNum": 0,
      "priority": "순위번호",
      "registeredDate": "등기일",
      "status": "현재 상태 (말소됨/유효)",
      "risk": "높음|중간|낮음"
    }
  ],
  "jeonseRiskAnalysis": {
    "totalPriorDebtNum": 0,
    "totalPriorDebt": "선순위 채권 합계 (근저당+전세권 유효분, 숫자+단위)",
    "estimatedJeonseDeposit": "분석된 전세 보증금 (등기부에 전세권 있으면 해당 금액, 없으면 null)",
    "jeonseRatio": "전세가율 추정치 (전세금/시세, 시세 알 수 없으면 null)",
    "kkangtongAlert": true,
    "kkangtongReason": "깡통전세 위험 이유 (선순위채권+전세금이 추정 시세 80% 초과 시 경고)",
    "fraudCheckpoints": [
      {
        "checkpoint": "소유자 잦은 변경",
        "status": "위험|주의|안전",
        "detail": "확인된 내용"
      },
      {
        "checkpoint": "선순위 근저당 과다",
        "status": "위험|주의|안전",
        "detail": "근저당 총액 및 비율"
      },
      {
        "checkpoint": "가압류·가처분 존재",
        "status": "위험|주의|안전",
        "detail": "가압류/가처분 건수 및 금액"
      },
      {
        "checkpoint": "예고등기·가등기",
        "status": "위험|주의|안전",
        "detail": "예고등기·가등기 유무"
      },
      {
        "checkpoint": "다가구·근린생활시설",
        "status": "위험|주의|안전",
        "detail": "용도 및 전세사기 위험 여부"
      }
    ],
    "safetyVerification": ["계약 전 반드시 확인해야 할 사항1", "사항2", "사항3"]
  },
  "riskSummary": {
    "score": 85,
    "level": "안전|주의|위험|고위험",
    "totalDebt": "총 채권최고액 합계",
    "hasCompulsoryExecution": false,
    "hasPreliminaryInjunction": false,
    "hasPreemptiveRight": false,
    "keyRisks": ["주요 위험 항목1", "항목2"]
  },
  "recommendations": ["권고사항1", "권고사항2", "권고사항3"],
  "summary": "전체 권리관계 및 전세사기 위험 요약 (200자 이내)"
}`;

export async function analyzeRegistry({ text, jeonseDeposit = null, env }) {
  const depositNote = jeonseDeposit ? `\n\n[입력된 예정 전세 보증금]: ${jeonseDeposit.toLocaleString()}원` : '';
  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: REGISTRY_SYSTEM,
    userBlocks: [{ type: 'text', text: `다음 등기부등본 내용을 분석해주세요. 전세사기 위험도 분석을 반드시 포함하세요.${depositNote}\n\n${text}` }],
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 7. 건강보험/국민연금/소득 납부확인서 분석
// ────────────────────────────────────────────────────────────
const PUBLIC_DOC_SYSTEM = `당신은 한국 공공문서 분석 전문가입니다. 건강보험료 납부확인서, 국민연금 납부확인서,
소득금액증명원, 근로소득원천징수 확인서, 주민등록등본/초본 등 공공문서를 분석합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "docType": "문서 종류 (건강보험납부확인서/국민연금납부확인서/소득금액증명원/근로소득원천징수/주민등록등본/기타)",
  "issuedDate": "발급일자",
  "issuedBy": "발급기관",
  "subject": {
    "name": "성명",
    "idNumber": "주민등록번호 (뒷자리 마스킹)",
    "address": "주소 (해당 시)"
  },
  "keyFacts": [
    {"label": "항목명", "value": "값", "period": "기간 (해당 시)"}
  ],
  "summary": "문서 주요 내용 요약 (150자 이내)",
  "useCase": "이 문서가 주로 활용되는 용도 (대출/임대차/비자/취업 등)",
  "validity": "유효기간 또는 주의사항",
  "warnings": ["주의사항1", "주의사항2"]
}`;

export async function analyzePublicDoc({ text, env }) {
  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: PUBLIC_DOC_SYSTEM,
    userBlocks: [{ type: 'text', text: `다음 공공문서를 분석해주세요:\n\n${text}` }],
    env,
    maxTokens: 3000
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
