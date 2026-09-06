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
const RESUME_SYSTEM = `당신은 한국 취업 시장 전문 이력서 분석가입니다. 10년 이상의 채용 담당 경력을 가진 전문가로서
정확하고 실용적인 피드백을 제공합니다. 반드시 다음 JSON 구조로만 응답하세요. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "score": {
    "total": 0~100,
    "breakdown": {
      "구성": 0~100,
      "수치화": 0~100,
      "동사강도": 0~100,
      "가독성": 0~100,
      "JD매칭": 0~100
    }
  },
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": [
    {
      "section": "섹션명(경력사항/학력/스킬 등)",
      "original": "원본 문장 그대로",
      "suggestion": "개선된 문장",
      "reason": "개선 이유 (구체적으로)"
    }
  ],
  "missingItems": ["누락 항목1", "누락 항목2"],
  "jdMissingKeywords": ["JD와 매칭 안 되는 키워드1", "키워드2"],
  "overallComment": "전체 총평 (200자 이내)"
}

개선 제안은 최소 5개, 최대 15개. 원본 문장은 반드시 이력서에서 그대로 인용.`;

export async function analyzeResume({ text, jdText = '', env }) {
  const userBlocks = [
    { type: 'text', text: `[이력서 내용]\n${text}` },
    ...(jdText ? [{ type: 'text', text: `[채용공고 (JD)]\n${jdText}` }] : [])
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: RESUME_SYSTEM,
    userBlocks,
    env,
    maxTokens: 4096
  });
}

// ────────────────────────────────────────────────────────────
// 2. 자기소개서 분석 (이력서 컨텍스트 포함)
// ────────────────────────────────────────────────────────────
const COVER_LETTER_SYSTEM = `당신은 한국 대기업·중견기업 서류 전형 전문 자기소개서 코치입니다.
지원자의 이력서(스펙)와 자기소개서를 함께 분석하여 불일치·논리 약점·표현 개선을 제안합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "score": {
    "total": 0~100,
    "breakdown": {
      "논리구조": 0~100,
      "스펙일치": 0~100,
      "구체성": 0~100,
      "차별성": 0~100,
      "문장력": 0~100
    }
  },
  "strengths": ["강점1", "강점2"],
  "inconsistencies": [
    {
      "coverLetter": "자소서 해당 구절",
      "resumeFact": "이력서와 불일치하는 부분",
      "fix": "수정 제안"
    }
  ],
  "improvements": [
    {
      "question": "자소서 항목명(성장과정/지원동기 등)",
      "original": "원본 구절",
      "suggestion": "개선 구절",
      "reason": "이유"
    }
  ],
  "missingEpisodes": ["추가하면 좋을 구체적 에피소드 유형1", "유형2"],
  "overallComment": "전체 총평 (200자 이내)"
}`;

export async function analyzeCoverLetter({ coverLetterText, resumeText = '', jdText = '', env }) {
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[이력서 (지원자 스펙 컨텍스트)]\n${resumeText}` }] : []),
    ...(jdText ? [{ type: 'text', text: `[채용공고]\n${jdText}` }] : []),
    { type: 'text', text: `[자기소개서]\n${coverLetterText}` }
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: COVER_LETTER_SYSTEM,
    userBlocks,
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 3. 자기소개서 영문 번역 (Sonnet 5 — 품질 최우선)
// ────────────────────────────────────────────────────────────
const TRANSLATION_SYSTEM = `You are a professional Korean-to-English translator specializing in
career documents (resumes, cover letters) for Korean professionals applying to global companies.
Translate naturally and professionally, preserving the candidate's voice.
Respond ONLY with the following JSON. No markdown.

Output schema:
{
  "sections": [
    {
      "title": "Section heading (e.g., Growth Story / Motivation / Strengths)",
      "koreanOriginal": "원문 그대로",
      "englishTranslation": "Natural English translation",
      "translatorNotes": "번역 시 고려 사항 또는 문화적 차이 설명 (선택, 없으면 null)"
    }
  ],
  "glossary": [
    { "korean": "한국어 용어", "english": "English equivalent", "context": "사용 맥락" }
  ],
  "overallQuality": "번역 품질 총평 (영어로)",
  "culturalAdaptations": ["문화적 차이로 표현을 바꾼 항목 설명1", "설명2"]
}`;

export async function translateCoverLetter({ text, resumeText = '', env }) {
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[Candidate Resume Context]\n${resumeText}` }] : []),
    { type: 'text', text: `[Korean Cover Letter to Translate]\n${text}` }
  ];

  return callClaude({
    model: 'claude-sonnet-5',
    system: TRANSLATION_SYSTEM,
    userBlocks,
    env,
    maxTokens: 8000
  });
}

// ────────────────────────────────────────────────────────────
// 4. 면접 예상 질문 생성
// ────────────────────────────────────────────────────────────
const INTERVIEW_SYSTEM = `당신은 한국 대기업 인사담당자 출신 면접 코치입니다.
지원자의 이력서(+ 자소서)를 분석하여 실제 면접에서 나올 가능성이 높은 예상 질문과 모범 답변 가이드를 제공합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "categoryQuestions": [
    {
      "category": "카테고리(인성/직무역량/경험/지원동기/조직적합 중 하나)",
      "questions": [
        {
          "question": "예상 면접 질문",
          "difficulty": "상|중|하",
          "intent": "면접관이 이 질문을 통해 확인하고 싶은 것",
          "answerGuide": {
            "keyPoints": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3"],
            "exampleOpener": "답변 시작 예시 첫 문장",
            "pitfalls": "이 질문에서 자주 하는 실수"
          }
        }
      ]
    }
  ],
  "tailoredInsights": {
    "strongPoints": ["이력서·자소서의 면접 어필 포인트1", "포인트2"],
    "riskAreas": ["면접관이 파고들 수 있는 약점1", "약점2"],
    "preparation": "전반적 면접 준비 방향 (150자 이내)"
  }
}

카테고리별 질문 수: 인성 3개, 직무역량 4개, 경험 3개, 지원동기 2개, 조직적합 2개. 총 14개.`;

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
const CONTRACT_SYSTEM = `당신은 한국 법령에 정통한 계약서 검토 전문가입니다 (변호사 자문 보조 도구).
계약서를 분석하여 불리한 조항, 누락된 필수 조항, 법령 위반 가능 조항을 찾아냅니다.
본 서비스는 법적 자문이 아닌 정보 제공 목적입니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "contractType": "근로계약서|프리랜서계약서|전월세계약서|기타",
  "riskLevel": "고위험|중위험|저위험",
  "riskSummary": "전체 위험도 요약 (100자 이내)",
  "clauses": [
    {
      "clauseTitle": "조항명 또는 위치 (예: 제3조 임금, 4페이지)",
      "originalText": "원본 조항 텍스트 (그대로 인용, 길면 핵심 부분만)",
      "riskLevel": "고위험|중위험|저위험|정상",
      "issue": "문제점 설명",
      "suggestedRevision": "수정 제안 (구체적 문장으로)",
      "legalBasis": "관련 법령 조항 (예: 근로기준법 제17조)"
    }
  ],
  "missingClauses": [
    {
      "clauseName": "누락된 필수 조항명",
      "legalBasis": "관련 법령",
      "suggestedText": "권장 조항 문안 (샘플)"
    }
  ],
  "legalDisclaimer": "본 분석은 법적 자문이 아닌 정보 제공 목적입니다. 중요한 계약은 반드시 변호사 검토를 받으세요."
}

계약서 유형별 체크 포인트:
- 근로계약서: 근로기준법 §17 필수기재사항, 최저임금, 주52시간, 연장근로수당, 퇴직금, 4대보험
- 프리랜서: 용역 범위, 지적재산권 귀속, 비밀유지, 지급 조건, 계약해지 조건, 손해배상 한도
- 전월세: 임대차보호법, 확정일자, 전입신고, 계약갱신청구권, 묵시적 갱신, 원상복구 범위`;

export async function analyzeContract({ text, contractType = 'auto', env }) {
  const userBlocks = [
    ...(contractType !== 'auto' ? [{ type: 'text', text: `계약서 유형: ${contractType}` }] : []),
    { type: 'text', text: `[계약서 전문]\n${text}` }
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: CONTRACT_SYSTEM,
    userBlocks,
    env,
    maxTokens: 6000
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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
