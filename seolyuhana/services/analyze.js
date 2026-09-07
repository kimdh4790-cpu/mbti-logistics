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
// 2-b. 자기소개서 AI 완전 재작성 (Rewrite mode)
// ────────────────────────────────────────────────────────────
const COVER_LETTER_REWRITE_SYSTEM = `당신은 한국 대기업·공기업·스타트업 합격자 자기소개서를 수백 편 작성한 최고 수준의 자소서 작가입니다.
지원자의 원본 자소서와 이력서를 바탕으로 더 강력하고 설득력 있는 자소서를 완전히 재작성합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

출력 스키마:
{
  "rewrittenSections": [
    {
      "title": "항목 제목 (예: 성장과정 / 지원동기 / 직무역량 / 입사 후 포부)",
      "original": "원본 문단 (200자 이내 요약)",
      "rewritten": "AI가 재작성한 최종 문장 (완성된 문체, 구체적 수치·사례 강화)",
      "improvements": ["개선 포인트1", "개선 포인트2"]
    }
  ],
  "writingTips": ["합격 자소서를 위한 핵심 팁1", "팁2", "팁3"],
  "strengthenedPoints": ["원본 대비 강화된 포인트1", "포인트2"],
  "wordCount": 전체_재작성_자소서_글자수,
  "overallNote": "재작성 방향 및 주요 변경 사항 요약 (150자 이내)"
}`;

export async function rewriteCoverLetter({ coverLetterText, resumeText = '', jdText = '', env }) {
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[이력서 (지원자 스펙)]\n${resumeText}` }] : []),
    ...(jdText ? [{ type: 'text', text: `[채용공고]\n${jdText}` }] : []),
    { type: 'text', text: `[원본 자기소개서 (재작성 대상)]\n${coverLetterText}` }
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: COVER_LETTER_REWRITE_SYSTEM,
    userBlocks,
    env,
    maxTokens: 8000
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
