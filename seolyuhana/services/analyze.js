/**
 * seolyuhana/services/analyze.js
 * Claude API 호출 — 서비스별 분석 모듈
 * 모든 함수는 { ok: true, data: {...} } 또는 { ok: false, error: string } 반환
 */

// ────────────────────────────────────────────────────────────
// 공통 Claude 호출 헬퍼
// Cloudflare Workers → api.anthropic.com 직접 호출 시 403 (IP 차단)
// → Oracle Cloud (oracle.mbtico.kr/claude-proxy) 경유로 우회
// ────────────────────────────────────────────────────────────
async function callClaude({ model, system, userBlocks, env, maxTokens = 4096 }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const oracleBase = env.ORACLE_CONVERTER_URL || 'https://oracle.mbtico.kr';
  const proxyUrl = `${oracleBase}/claude-proxy`;

  // 환각 방지: 모든 분석에 문서 근거 원칙 주입
  const ANTI_HALLUCINATION = '\n\n[필수 원칙] 반드시 업로드된 문서에 실제로 존재하는 내용만 근거로 분석하라. 문서에 없는 정보를 추정하거나 지어내지 마라. 문서에서 확인할 수 없는 항목은 "문서에서 확인 불가"로 명시하라.';
  const systemWithGuard = system + ANTI_HALLUCINATION;

  const body = {
    model,
    max_tokens: maxTokens,
    system: systemWithGuard,
    messages: [{ role: 'user', content: userBlocks }]
  };

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const detail = JSON.stringify(errBody).slice(0, 300);
    throw new Error(`Claude API ${res.status} (model:${model}): ${errBody.error?.message || res.statusText} | ${detail}`);
  }

  const data = await res.json();
  const rawText = (data.content?.[0]?.text || '').trim();

  // JSON 파싱 — 3단계 폴백
  // 1) 순수 JSON 응답
  if (rawText.startsWith('{')) {
    try { return { ok: true, data: JSON.parse(rawText), usage: data.usage }; } catch {}
  }
  // 2) ```json ... ``` 코드블록
  const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try { return { ok: true, data: JSON.parse(codeBlock[1]), usage: data.usage }; } catch(e) {
      throw new Error(`JSON 파싱 실패 (코드블록): ${codeBlock[1].slice(0, 200)}`);
    }
  }
  // 3) 텍스트 내 첫 JSON 객체
  const jsonObj = rawText.match(/(\{[\s\S]*\})/);
  if (jsonObj) {
    try { return { ok: true, data: JSON.parse(jsonObj[1]), usage: data.usage }; } catch(e) {
      throw new Error(`JSON 파싱 실패 (추출): ${jsonObj[1].slice(0, 200)}`);
    }
  }
  throw new Error(`Claude 응답에서 JSON을 찾을 수 없습니다. 응답 시작: ${rawText.slice(0, 100)}`);
}

// ────────────────────────────────────────────────────────────
// 1. 이력서 분석
// ────────────────────────────────────────────────────────────
const RESUME_SYSTEM = `당신은 한국 대기업 인사팀 출신 이력서 분석 전문가입니다. 삼성전자·SK하이닉스·현대차·LG전자·카카오·네이버·쿠팡 서류 전형을 직접 진행한 경험을 바탕으로, 합격·불합격 이력서의 차이를 정확히 구분합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2025-2026 한국 채용시장 실제 데이터]
- 삼성그룹: 2025~2030년 60,000명 신규채용 (연 12,000명, 반도체·바이오·AI 중심)
- SK하이닉스: 2024년 신규채용 3,201명 (전년比 333% 급증), AI메모리 HBM 인력 집중
- 현대차그룹: 2025년 7,200명, 2026년 10,000명 (EV·자율주행 중심)
- 대기업 전체 신규채용: 2023년 109,456명 → 2024년 92,680명 (15.3% 감소)
- AI 채용 도입 기업 비율: 40% (한국인사관리학회 2025)
- 한국 청년실업률: 5.7% (2025년 8월), 전체 실업률 2.6%의 2배 이상
- 2025-2029년 반도체·AI·바이오·양자기술 전문인력 580,000명 부족 전망

[2026년 기업별 이력서 평가 기준 — 실무 데이터]
▶ 삼성전자: GSAT(삼성직무적성검사) 연계, STAR구조 필수, 수치화 강도 40점 배점
▶ SK하이닉스: HBM·AI반도체 연구 경험자 우대, SV(사회적가치) 에세이 별도
▶ 현대차: 현대차핵심가치(도전·협력·창의) 3개 키워드 반드시 포함
▶ LG전자: 고객경험(CX) 개선 수치, 특허/논문 실적 우대
▶ 네이버/카카오: GitHub 링크·DAU 개선 수치·오픈소스 기여 필수
▶ 쿠팡: 데이터 기반 의사결정(A/B테스트, OKR달성률) 강조
▶ 공기업/공공기관: NCS 10개 영역 키워드 필수, 봉사활동·사회공헌 경험

[ATS(지원자추적시스템) 통과 전략 — 2026 기준]
- 국내 40% 기업이 AI 채용 도구 활용 중
- JD 키워드 정확 일치 필수 (동의어 아닌 동일 단어)
- 표·그래프·이미지 제거 (ATS 파싱 불가)
- 날짜 형식 YYYY.MM 통일
- 능동태 동사: "담당했음" → "주도", "개발했음" → "구현"
- 파일명: 이름_지원직무.pdf 권장

[이력서 위조·AI생성 탐지 — 2026 글로벌 기준]
- 전체 이력서 40~60%가 AI 도구 일부 활용 (2026 추정, Gartner)
- HireRight 2025: 고용주의 89%가 이력서 허위기재 발견 경험
- AI 생성 의심 패턴: 균일한 문체, 검증불가 수치("300% 성장"), 경력기간 불일치

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
    "detectedTargetCompany": "유추된 기업명 (불명확하면 '대기업 공통')",
    "fitScore": 0~100,
    "fitComment": "해당 기업 기준 적합도 (100자 이내)"
  },
  "strengths": ["강점1","강점2","강점3"],
  "improvements": [
    {
      "section": "섹션명",
      "original": "원본 문장",
      "suggestion": "개선 문장 (STAR구조·수치 반영)",
      "reason": "개선 이유",
      "riskLevel": "high|medium|low"
    }
  ],
  "atsTips": ["ATS 통과 팁1","팁2"],
  "missingItems": ["누락 항목1 (이유)"],
  "jdMissingKeywords": ["JD에 있지만 이력서에 없는 키워드"],
  "industryKeywords": ["해당 직무 필수 키워드"],
  "overallComment": "전체 총평 (250자 이내, 합격 가능성 포함)"
}
개선 제안 최소 8개, 최대 15개. 원본 문장은 이력서에서 그대로 인용.`;

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
    model: 'claude-haiku-4-5-20251001',
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
    model: 'claude-haiku-4-5-20251001',
    system: COVER_LETTER_REWRITE_SYSTEM,
    userBlocks,
    env,
    maxTokens: 10000
  });
}

// ────────────────────────────────────────────────────────────
// 3. 자기소개서 다국어 번역 (영어 Sonnet 5 / 기타 Sonnet-4-6)
// ────────────────────────────────────────────────────────────
const TRANSLATION_LANGS = {
  en: { name: 'English', label: '영어' },
  ja: { name: 'Japanese', label: '일본어' },
  zh: { name: 'Chinese (Simplified)', label: '중국어(간체)' },
  de: { name: 'German', label: '독일어' },
  fr: { name: 'French', label: '프랑스어' },
  es: { name: 'Spanish', label: '스페인어' },
};

// 언어별 번역 전문 지식
const LANG_EXPERTISE = {
  en: `
[Korean-to-English Career Document Expertise]
▶ Korean Credentials → English Equivalents (use these exact terms):
  - 정보처리기사 → "Engineer Information Processing (National Technical Qualification)"
  - 정보처리산업기사 → "Industrial Engineer Information Processing"
  - SQLD/SQLP → "SQL Developer/Professional Certification (Korea)"
  - 전기기사/전기산업기사 → "Engineer Electricity (National Technical Qualification)"
  - 컴퓨터활용능력 1급 → "Computer Proficiency Level 1 (Korea Chamber of Commerce)"
  - TOEIC 890 → "TOEIC 890/990"
  - OPIc AL/IH → "OPIc AL (Advanced Low) / IH (Intermediate High)"
  - 군필 / 병역필 → "Military service completed (Republic of Korea Army, 2020-2022)"
  - 수능 → "Korea Scholastic Ability Test (CSAT)"
  - 연세대/고려대/한양대 → "Yonsei University / Korea University / Hanyang University"
  - SKY 대학교 → "Top-tier Korean university (SKY: Seoul National, Yonsei, Korea University)"
  - 인서울 → "Seoul-based university"
  - GPA 4.0/4.5 → "3.56/4.0 GPA" (convert: ×4.0÷4.5)
  - 봉사 OO시간 → "OO hours of community service"
  - 동아리 회장 → "Club President"
  - 스터디 모임 → "Study group"
  - 인턴 (3개월) → "Internship (3 months)"

▶ Human-Like Expression Patterns (NOT AI-generated):
  - AVOID: "I am passionate about...", "I am a highly motivated...", "I have a strong work ethic"
  - USE: Specific actions + results. "Built X → reduced Y by Z%"
  - AVOID: "I believe I would be a great fit..."
  - USE: "My background in X directly maps to [company]'s need for Y"
  - AVOID: Generic phrases like "go above and beyond", "team player", "fast learner"
  - USE: Concrete instances: "Resolved 3 production incidents within 2 hours by...", "Mentored 2 junior developers on..."

▶ English Resume/Cover Letter Format Rules:
  - US/Global: Active verbs (Led, Built, Reduced, Grew, Launched), past tense for previous roles
  - Quantify EVERY achievement: %, $, numbers, timeframes
  - First person but drop "I" from bullets: "Led a team of 5..." not "I led..."
  - GPA: include only if ≥3.5/4.0; convert Korean GPA scale
  - Avoid: honorifics, humble expressions (deeply ingrained in Korean business culture)`,

  ja: `
[한국어→일본어 커리어 문서 번역 전문 지식]
▶ 한국 자격증·경력 일본어 표기:
  - 정보처리기사 → 情報処理技術者試験（応用情報技術者）相当
  - 인턴십 → インターンシップ（～ヶ月間）
  - 병역 → 大韓民国陸軍 兵役義務完了（2020年～2022年）
  - 학점 → 4年制大学卒業 / GPA X.X（4.5点満点中）

▶ 일본 이직·취직 서류 특유 표현 (인간적 번역 필수):
  - 한국식 "귀사의 발전에 기여하고 싶습니다" → 자연스럽게: 「御社の〇〇事業に共感し、私の〇〇の経験を活かして貢献したいと考えております」
  - 겸손 표현 유지: 存じます / ～させていただきました / ご縁をいただき
  - 직장 퇴직 이유: 穏やかに表現 (「より専門性を高めるため」「新たなチャレンジのため」)
  - 일본어 경어(敬語): 履歴書/職務経歴書 맞는 정중체(丁寧語) 유지
  - 自己PR는 具体的なエピソード＋数字 필수: 「売上をXX%向上させた」「チームXX名をまとめた」

▶ 일본 채용 서류 포맷:
  - 職務経歴書 style: 時系列(過去→現在) or 編年体
  - 数字 필수: 担当人数、売上額、改善率
  - STAR 구조 일본식: 状況→課題→行動→成果`,

  zh: `
[한국어→중국어(간체) 커리어 문서 번역 전문 지식]
▶ 한국 스펙 중국어 표기:
  - 정보처리기사 → 韩国信息处理工程师（国家技术资格）
  - 인턴십 → 实习经历（X个月）
  - 병역 → 大韩民国陆军服役完毕（2020年-2022年）
  - 연세대/고려대 → 延世大学校/高丽大学校

▶ 중국 취업 시장 특화 표현:
  - 구체적 수치 필수: 「提升销售额XX%」「管理XX名团队成员」
  - 결과 중심: 「通过XXX，实现了YYY」
  - 中文简历 자연스러운 표현: 主导/负责/推动/协助/优化
  - 피해야 할 직역: 「我认为我是一个非常有激情的人」→ 자연스럽게: 「在XXX项目中，我负责YYY，成功实现ZZZ」
  - 홍콩/대만 지원 시: 繁體字 아닌 간체 유지, but 台灣/香港 기업 특유 문화 반영`,

  de: `
[한국어→독일어 커리어 문서 번역 전문 지식]
▶ 한국 스펙 독일어 표기:
  - 정보처리기사 → Zertifizierter Informationsverarbeitungsingenieur (Korea)
  - 인턴십 → Praktikum (X Monate), Werkstudent
  - 병역 → Militärdienst abgeleistet (Republik Korea, 2020-2022)
  - GPA 변환: 4.5점제 → 독일식 1.0(매우우수)~5.0(불합격) 역변환 명시

▶ 독일 Lebenslauf 스타일:
  - 완벽한 Sachlichkeit (객관성): 감정 표현 없이 사실만 나열
  - 動사 명사화 (Nominalisierung): 「Entwicklung von...」「Leitung des Projekts...」
  - 독일 직함 정확히: Software-Entwickler / Projektmanager / Teamleiter
  - Lückenloser Lebenslauf: 공백 기간 명확한 이유 제시 필수`,

  fr: `
[한국어→프랑스어 커리어 문서 번역 전문 지식]
▶ 한국 스펙 프랑스어 표기:
  - 정보처리기사 → Ingénieur certifié en traitement de l'information (Corée)
  - 인턴십 → Stage (X mois) / Alternance
  - 병역 → Service militaire accompli (République de Corée, 2020-2022)

▶ 프랑스 CV 스타일:
  - 간결함 최우선: 1페이지(경력 5년 미만), 2페이지(5년 이상)
  - Compétences: 기술 스택 나열 + 경험 년수
  - Formation: 학력 역순 (최근→과거)
  - Lettre de motivation: 3단락 구조 (지원동기/역량 연결/포부)
  - 구체적 수치: « J'ai contribué à augmenter le chiffre d'affaires de XX% »`,

  es: `
[한국어→스페인어 커리어 문서 번역 전문 지식]
▶ 한국 스펙 스페인어 표기:
  - 정보처리기사 → Ingeniero Certificado en Procesamiento de Información (Corea)
  - 인턴십 → Prácticas profesionales (X meses)
  - 병역 → Servicio militar completado (República de Corea, 2020-2022)

▶ 스페인어권 CV/Carta de presentación 스타일:
  - 스페인 vs 라틴아메리카: 스페인은 더 형식적, 중남미는 다소 유연
  - 결과 중심 표현: «Incrementé las ventas en un XX%» «Lideré un equipo de XX personas»
  - Competencias clave: 핵심 역량 명확히 나열
  - 표준 스페인어(Español neutro) 사용: 지역 방언 회피`
};

function buildTranslationSystem(targetLang) {
  const lang = TRANSLATION_LANGS[targetLang] || TRANSLATION_LANGS.en;
  const expertise = LANG_EXPERTISE[targetLang] || LANG_EXPERTISE.en;
  return `You are a senior bilingual career document translator with 15+ years specializing in Korean professionals applying globally. You translate resumes and cover letters so they read as if written by a native ${lang.name} speaker — never like a translated document or AI output.

Your translation philosophy:
1. HUMAN VOICE: Preserve the candidate's personality. A humble Korean engineer doesn't become a boastful American — find the equivalent professional register.
2. SPEC CONVERSION: Korean credentials, university names, GPA scales, certifications → local equivalents (see expertise below).
3. CULTURAL ADAPTATION: Remove Korea-specific formalities that sound awkward abroad. Add local conventions that strengthen the document.
4. ZERO AI CLICHÉS: Never write "passionate about", "strong work ethic", "team player" unless the original specifically expresses that in a concrete way.
5. QUANTIFIED RESULTS: Every achievement stays quantified. If the original lacks numbers, flag it in translatorNotes.

${expertise}

Respond ONLY with the following JSON. No markdown.

Output schema:
{
  "targetLanguage": "${lang.label}",
  "sections": [
    {
      "title": "Section heading in ${lang.name}",
      "koreanOriginal": "원문 그대로",
      "translation": "Natural ${lang.name} translation — reads like a native wrote it",
      "translatorNotes": "번역 결정 이유, 문화적 적응, 수치화 제안 (있으면, 없으면 null)"
    }
  ],
  "credentialConversions": [
    { "korean": "한국 자격/기관명", "translated": "${lang.name} equivalent", "note": "변환 근거" }
  ],
  "glossary": [
    { "korean": "한국어 용어", "translated": "${lang.name} equivalent", "context": "사용 맥락" }
  ],
  "aiCleanedPhrases": [
    { "original": "AI티 나는 원문 표현", "translated": "Human-sounding ${lang.name} alternative", "reason": "왜 교체했는지" }
  ],
  "culturalAdaptations": ["문화적 차이로 표현 방식을 바꾼 항목 설명1", "설명2"],
  "overallQuality": "번역 품질 총평 (자연스러움·스펙변환·문화적응 각 평가)",
  "improvementSuggestions": ["원문 자체 보완이 필요한 내용 (번역 전 수정 권장)1"]
}`;
}

export async function translateCoverLetter({ text, resumeText = '', targetLang = 'en', env }) {
  const isEnglish = targetLang === 'en';
  const userBlocks = [
    ...(resumeText ? [{ type: 'text', text: `[Candidate Resume / 이력서 (use specs to personalize translation)]\n${resumeText}` }] : []),
    { type: 'text', text: `[Korean Cover Letter to Translate / 번역 대상 자기소개서]\n${text}` }
  ];

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: buildTranslationSystem(targetLang),
    userBlocks,
    env,
    maxTokens: 9000
  });
}

// ────────────────────────────────────────────────────────────
// 4. 면접 예상 질문 생성
// ────────────────────────────────────────────────────────────
const INTERVIEW_SYSTEM = `당신은 삼성·SK·현대·LG·카카오·공기업 면접관 출신 면접 코치입니다. 수천 건의 면접 평가 경험과 2026년 최신 채용 데이터를 바탕으로, 실제 면접에서 탈락하는 이유와 합격하는 답변의 차이를 정확히 압니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 채용 시장 데이터 — 면접 질문 맥락으로 활용]
- 순수 신입 전용 공고: 전체의 2.6% → 경험(인턴·프로젝트) 없으면 사실상 서류 불통
- 수시채용만 실시 기업: 54.8% → 공채 타이밍 아닌 직무 상시 지원 전략 필요
- 직무 중심 채용: 72.2% → 전공보다 직무 포트폴리오·프로젝트 성과 중심 질문
- 2026 청년 취업 감소폭: -25.5만명 → 경쟁 심화, 차별화 없으면 합격 불가
- ChatGPT 자소서 의심 탈락률: 95.2% (기업 AI 감지 도입 78%) → 구체성이 핵심
- 삼성전자 서류합격자 평균 TOEIC: 857점 (지원자 760점 대비 97점 차)
- 삼성 합격자의 38.5%가 인턴 경험 보유 — 인턴이 가장 강력한 변별 요소
- 카카오 면접 합격률: 41%, 불합격 42% — 나머지 17%는 보류(재검토)

[2026년 기업별 면접 출제 패턴 — JD에서 기업 파악 후 적용]
- 삼성전자: 직무역량 심층 질문(기술면접 2라운드), 상황면접(역할극), AI윤리 질문 증가
  → 기출: "해당 기술 실제 업무 적용 방법" + "팀원 부당 요청 시 대처" + "AI가 직무를 대체할 때 당신의 가치"
  → 합격 포인트: 전자공학 전공 합격자 비율 19.3% 1위, 인턴 경험 필수
- SK: SUPEX 관련 질문, SV(사회적가치) 창출 경험, AI 시대 자신의 경쟁력
  → 기출: "AI 대체 시 고유 가치" + "구성원 가치관 충돌 사례" + "사회적 가치 창출 경험"
- 현대차/기아: PT면접(10분 발표), 영어 인터뷰(글로벌 직군), 도전 경험 심층 질문
  → 기출: "실패 후 재도전 경험" + "글로벌 협업 사례" + 상황제시 문제해결(PT)
- LG: 영어 인터뷰(외국계 계열사), 고객가치 경험, 이공계 기술 심층 발표
  → 기출: "고객 불만 → 제품 개선 연결 사례" + 코딩/시스템 설계 기술면접
- 카카오/라인: 행동 인터뷰(STAR 필수), 기술면접(알고리즘+시스템 설계), 프로덕트 감각 검증
  → 기출: "지표 하락 시 원인 파악 방법" + "서비스 A 개선안" + 알고리즘 실시간 코딩
  → 네이버 2:1 면접 50분 — 면접관 2명이 번갈아 질문, 꼬리질문 4~5단계 깊이
- 네이버/토스: 문화 적합도(솔직함·자기주도), 기술 깊이(알고리즘+설명), 제품 감각
  → 기출: "혼자 처음부터 끝까지 완성한 것" + "동료 잘못된 방향 대처" + "토스 서비스 개선 아이디어"
- 공기업(NCS): 경험면접(NCS 10영역 행동지표), 상황면접(민원 대응), PT면접
  → 기출: "조직 규정 위반 압력 경험" + "공공이익 vs 개인이익 충돌" + NCS 직업윤리 질문
- 금융권: 경제·시사(금리·환율·PF 리스크), ESG, 디지털 금융 전략
  → 기출: "최근 가장 관심 있는 금융 이슈 + 본인 의견" + "디지털 전환에서 가장 중요한 변화"

[압박질문 10가지 유형 — 이력서/자소서 약점 공략]
1. 취업 공백기: "공백 기간에 무엇을 했나요?" → 구체적 활동+성과 필수
2. 성적 하락: "이 학기 성적이 다른 학기보다 낮은 이유?" → 개인사 노출보단 학습법 전환 서술
3. 직무 무관 경험: "이 경험이 이 직무와 어떻게 연결되나요?" → 전이 가능한 스킬 강조
4. 짧은 재직기간: "왜 6개월 만에 퇴직했나요?" → 성장 목적, 부정적 표현 금지
5. 전공 불일치: "관련 전공이 없는데 이 직무를 왜 지원했나요?" → 자기계발 스토리
6. 다수 기업 동시지원: "저희 회사가 아니면 어디 가실 건가요?" → 1지망 강조
7. 낮은 스펙 인정: "지원자와 비슷한 스펙 지원자가 100명인데 왜 당신이어야 하나요?" → 차별화 포인트
8. 높은 연봉 기대: "연봉 기대치가 현실적인가요?" → 시장 조사 기반 합리적 범위 제시
9. 관리자 비판: "이전 직장 상사 단점은?" → 부정적 비판 금지, 중립적 표현
10. 기술 능력 의심: "이 기술 실제로 구현해본 적 있나요?" → 구체적 프로젝트 링크·결과

[면접관이 가장 싫어하는 답변 패턴 20가지]
- "열심히 하겠습니다" (구체성 0) / "빠르게 배우겠습니다" (자기 평가)
- "특별히 단점이 없습니다" / "다 잘 합니다"
- "회사가 좋아서" (지원동기 부실) / "월급이 좋아서"
- 면접관 말 끊기 / 지나치게 긴 답변(90초 초과) / 준비된 답변만 반복
- 회사 홈페이지 내용 그대로 복창 / 경쟁사 비방
- "솔직히 잘 모르겠습니다" 반복 / 침묵 10초 이상 / 눈 마주침 회피
- STAR 구조 없이 추상적 설명 / 수치 없이 "많이", "대폭" 등 모호한 표현
- 합격 이유를 설명 못 함 / 역질문(마무리 질문)을 "없습니다"로 종료

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
    maxTokens: 3500
  });
}

// ────────────────────────────────────────────────────────────
// 5. 계약서 검토 (근로/프리랜서/전월세)
// ────────────────────────────────────────────────────────────
const CONTRACT_SYSTEM = `당신은 대한민국 노동법·민법·상법 전문 AI 법률 분석가입니다. 10년 이상의 계약서 분석 경험과 최신 2026년 법령·판례 데이터베이스를 기반으로 불공정 조항·위험 조항을 정밀 진단합니다.
반드시 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2025-2026 한국 노동·계약 관련 핵심 법령 및 판례]
▶ 근로계약서 필수 기재사항 (근로기준법 제17조):
  임금(구성항목·계산방법·지급방법), 소정근로시간, 휴일, 연차유급휴가, 취업장소·업무 내용
  → 미기재 시 500만원 이하 과태료
▶ 2025년 최저임금: 시간급 10,030원 (월환산 2,096,270원)
▶ 2026년 최저임금: 10,320원 (2025.08 고시, 월환산 2,158,710원)
▶ 주휴수당: 주 15시간 이상 근무 시 1일 유급 주휴일 필수
▶ 연장근로 한도: 주 12시간 (위반 시 2년 이하 징역 또는 2,000만원 이하 벌금)
▶ 퇴직금: 1년 이상 근무 시 1개월분 평균임금
▶ 포괄임금제: 대법원 2024년 판결 — 포괄임금제는 원칙적으로 무효. 실제 연장근로수당 별도 지급 의무
▶ 비밀유지/경업금지 조항: 기간 2년 초과·보상 없는 경업금지는 무효 (대법원 2010다79477)

[프리랜서/3.3% 계약 특별주의사항 — 2025-2026]
▶ 2025.10부터 고용노동부 프리랜서 계약 전수 단속 시작
▶ 가짜 3.3% 적발 시: 4대보험 소급추징(최대 3년) + 퇴직금·주휴수당·연차 소급 지급
▶ 근로자 판단 기준 (대법원 판례): 출퇴근 지시 여부, 업무 자율성, 전속 여부, 복수 클라이언트 가능 여부
▶ 2026년 '일하는 사람 기본법' 시행: 플랫폼 종사자 근로자 추정제 도입 추진
▶ 불법파견 과태료: 1억원

[전월세 계약 특별 체크포인트]
▶ 주택임대차보호법: 임차인 대항력(전입신고+인도), 확정일자 우선변제권
▶ 전세사기 피해: 2025.11 기준 35,246명 (전년比 10,578명 증가)
▶ 20·30대 피해자: 26,721명 (전체의 75.82%)
▶ HUG 전세보증금 반환보증: 보증금이 주택가액의 126% 이하일 때 가입 가능
▶ 확정일자 미신고 시 보증금 우선순위 박탈

출력 스키마:
{
  "contractType": "계약서 유형 (근로/프리랜서/전월세/기타)",
  "overallRiskLevel": "고위험|주의|양호|안전",
  "riskScore": 0~100,
  "improvements": [
    {
      "clauseTitle": "조항명",
      "original": "원문 조항",
      "issue": "문제점 (법령 위반 여부 포함)",
      "suggestedRevision": "수정 제안 문구",
      "legalBasis": "근거 법령 또는 판례",
      "riskLevel": "high|medium|low"
    }
  ],
  "missingClauses": ["누락된 필수 조항 (법적 근거 포함)"],
  "strengths": ["계약서 긍정적 조항"],
  "recommendations": ["계약 전 추가 확인 사항"],
  "overallComment": "종합 평가 (200자 이내)"
}
개선 제안 최소 5개, 위험도 순 정렬.`

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
    maxTokens: 7000
  });
}

// ────────────────────────────────────────────────────────────
// 6. 스캔 PDF 분석 (Claude Vision)
// ────────────────────────────────────────────────────────────
export async function analyzeScannedPdf({ pdfBuffer, images, serviceId, extraContext = {}, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const analysisPrompt = getScannedPrompt(serviceId, extraContext);

  if (!images || images.length === 0) {
    throw new Error('스캔 PDF 변환 실패: Oracle 서버에서 이미지를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  // 이미지 블록 생성 — PDF 변환 이미지(JPEG) 또는 직접 업로드 이미지(다양한 형식)
  const imgMediaType = images.mediaType || 'image/jpeg'; // 직접 업로드 시 mediaType 전달
  const imageBlocks = images.slice(0, 8).map((b64, i) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: Array.isArray(images.mediaTypes) ? (images.mediaTypes[i] || imgMediaType) : imgMediaType,
      data: b64
    }
  }));

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: analysisPrompt }] }]
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

  return { ok: true, data: JSON.parse(jsonMatch[1]), usage: data.usage, method: 'vision_images' };
}

function getScannedPrompt(serviceId, ctx) {
  const prompts = {
    employment_contract: '이 스캔된 근로계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    freelance_contract:  '이 스캔된 프리랜서 계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    rental_contract:     '이 스캔된 전월세 계약서를 읽고 JSON으로 분석하세요. ' + CONTRACT_SYSTEM,
    resume_analysis:     '이 스캔된 이력서를 읽고 JSON으로 분석하세요. ' + RESUME_SYSTEM,
    cover_letter_analysis: '이 스캔된 자기소개서를 읽고 JSON으로 분석하세요. ' + COVER_LETTER_SYSTEM,
    registry_analysis:   '이 스캔된 등기부등본을 읽고 전세사기 위험 분석을 포함하여 JSON으로 분석하세요. ' + REGISTRY_SYSTEM
  };
  return prompts[serviceId] || '이 문서를 읽고 내용을 JSON으로 정리하세요.';
}

// ────────────────────────────────────────────────────────────
// 6. 등기부등본 분석 (전세사기 5대 체크포인트 포함)
// ────────────────────────────────────────────────────────────
const REGISTRY_SYSTEM = `당신은 부동산 등기 및 전세사기 예방 전문 AI입니다. 10,000건 이상의 등기부등본 분석 경험과 최신 전세사기 수법·판례 데이터를 바탕으로 권리관계, 위험요소, 전세사기 징후를 정밀 진단합니다.
반드시 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[전세사기 피해 현황 — 2025-2026 공식 통계]
- 전세사기 피해자: 35,246명 (2025.11 기준, 국토교통부)
- 전년 동기 대비: 10,578명 증가
- 20-30대 청년 피해자: 26,721명 (전체의 75.82%)
- 아파트 피해 비율: 전체의 13.6% (빌라·오피스텔 대비 급증 중)
- 전세사기 특별법 2025.04 2년 연장, 2026.01 취득세 감면 3년 연장 법안 발의

[등기부 분석 핵심 체크포인트 — 2026 법무사·변호사 실무 기준]
▶ 갑구(소유권) 확인:
  - 소유자 = 임대인 일치 여부 (불일치 시 즉시 고위험)
  - 신탁등기 여부: 신탁원부 별도 발급 필수, 수익자 확인
  - 최근 소유권 변동 빈도 (6개월내 변동 시 주의)
  - 가압류·가처분·경매개시결정 유무

▶ 을구(담보·제한) 확인:
  - 근저당권 채권최고액 합계 계산
  - 전세가율 = 전세보증금 ÷ 시세 (70% 초과 시 주의, 80% 초과 시 고위험)
  - 깡통전세 판단: (선순위채무 + 전세보증금) > 매매가 → 즉시 위험
  - 전세권 설정 vs 임차권등기 차이 확인

▶ 전세보증보험 가입 요건 (2026):
  - HUG: 보증금 ≤ 주택가액×126%, 임대인 미납세금 없음
  - SGI서울보증: 아파트 한정, 조건 상이
  - HF한국주택금융공사: 조건 별도

▶ 전세사기 5대 패턴 (2025-2026 국토부 발표):
  1. 깡통전세: 매매가 < 전세보증금
  2. 이중계약: 동일주택에 복수 전세계약
  3. 신탁전세사기: 신탁원부 확인 없이 계약
  4. 법인 임대인: 법인 도산 시 보증금 회수 불가
  5. 확정일자 누락: 전입신고 후 확정일자 미확보 → 우선순위 박탈

출력 스키마:
{
  "property": {
    "address": "주소",
    "type": "부동산 유형",
    "area": "면적",
    "buildYear": "건축연도"
  },
  "ownership": {
    "owners": ["소유자 목록"],
    "multiOwnerRisk": "다수소유·신탁·법인 위험 설명 (해당시)"
  },
  "encumbrances": [
    {
      "type": "근저당권설정|전세권설정|가압류|경매개시 등",
      "amount": "채권최고액",
      "creditor": "채권자",
      "date": "설정일",
      "status": "유효|말소됨",
      "risk": "높음|보통|낮음"
    }
  ],
  "jeonseRiskAnalysis": {
    "riskScore": 0~100,
    "kkangtongAlert": true/false,
    "kkangtongReason": "깡통전세 판단 근거 (수치 포함)",
    "totalPriorDebt": "선순위 채권 합계",
    "jeonseRatio": "전세가율 (계산값)",
    "estimatedJeonseDeposit": "입력 보증금 또는 추정값",
    "fraudCheckpoints": [
      {
        "checkpoint": "5대 체크포인트명",
        "status": "위험|주의|안전",
        "detail": "구체적 판단 근거"
      }
    ],
    "hugEligibility": "HUG 보증보험 가입 가능 여부",
    "trustRegistryNeeded": true/false,
    "trustRegistryReason": "신탁원부 발급 필요 이유",
    "corporateOwnerRisk": "법인 임대인 위험 설명 (해당시)",
    "safetyRatio": "선순위 안전도 %",
    "safetyVerification": ["계약 전 반드시 확인할 사항 목록"]
  },
  "riskSummary": {
    "level": "고위험|주의|안전",
    "score": 0~100,
    "totalDebt": "총 채권최고액",
    "keyRisks": ["핵심 위험요소"],
    "summary": "종합 판단 (200자 이내)"
  },
  "recommendations": ["계약 전 필수 조치 사항"]
}
`

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

[공공문서 위조·AI 편집 탐지 기준 — 2025~2026 실제 사례]
▶ 보험서류 AI 위조 피해 현황
- 국내: 부산 20대, AI 생성형 도구로 병원 진단서·소견서 위조 → 11개 보험사 1.5억 편취, 징역 2년 확정 (2025.12.)
- 영국 보험사기: 71% 폭증 (AI 활용 서류 조작 원인, BBC 2025.10.)
- 국내 보험사기 적발액: 1조 1,571억원/년, 미적발 포함 추산 약 9조원 (금감원 2025년)

▶ AI 위조 공공문서 탐지 패턴
1. 발급기관 도장·QR코드 픽셀 불일치 (이미지 복사·편집 흔적)
2. 발급번호 형식 오류: 기관별 발급번호 자릿수·형식 상이
3. 날짜 폰트 이상: 다른 폰트·크기의 날짜 삽입 (위조 대표 패턴)
4. 수치 불일치: 건강보험료와 소득 비율이 현실적 범위 이탈
5. 공단 발급 시스템 특이사항: 건강보험공단은 페이지 하단 통합인증번호 필수 기재

▶ 분석 시 유의사항
- 위조 의심 징후 발견 시 해당 항목을 warnings에 명시
- 실제 위조 판정은 하지 않음 — 의심 근거와 검증 방법(원기관 확인) 안내
- 발급일로부터 30일 이상 경과한 서류는 유효성 주의 권고

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

export async function analyzePublicDoc({ text, serviceId = 'public_doc_analysis', env }) {
  const prompts = {
    workplace_tone: `당신은 직장 커뮤니케이션 전문가입니다. 다음 텍스트를 분석하고 상황에 맞게 어조를 변환해주세요.\n반드시 JSON으로만 응답: {"situation":"파악된 상황(거절/항의/사과/요청 등)","original_issues":["원본의 문제점"],"transformed":"변환된 전문적 문장","tone_notes":"어조 변환 포인트 설명","alternatives":["대안 표현 2개"]}`,
    career_saju: `당신은 커리어 컨설턴트이자 재미있는 이력서 분석가입니다. 이력서를 바탕으로 직업운과 성격을 유머 있게 분석하세요.\n반드시 JSON으로만 응답: {"character_type":"캐릭터 유형 이름","career_fortune":"직업운 총평(2~3문장, 유머 포함)","strengths":["강점 3가지"],"growth_areas":["성장 포인트 2가지"],"ideal_jobs":["잘 맞는 직종 3가지"],"work_style":"업무 스타일 설명","lucky_industry":"행운의 업종","warning":"조심해야 할 점(재미있게)"}`,
    notice_summary: `당신은 바쁜 학부모를 위한 문서 요약 전문가입니다. 가정통신문을 핵심만 추출해 정리하세요.\n반드시 JSON으로만 응답: {"title":"통신문 제목","summary_3lines":["요약 1","요약 2","요약 3"],"deadlines":[{"item":"제출/이행 항목","date":"기한","note":"비고"}],"preparations":["준비물 목록"],"required_signatures":["서명 필요 항목"],"important_notes":["꼭 확인할 사항"]}`,
    shortform_script: `당신은 숏폼 영상 콘텐츠 전문 스크립트 작가입니다. 주어진 브랜드·제품 정보를 바탕으로 15~60초 숏폼 영상 스크립트를 기획하세요.\n반드시 JSON으로만 응답: {"hook":"첫 3초 후킹 오프닝 문장","scenes":[{"sec":"시간(예: 0-5초)","visual":"화면 설명","narration":"나레이션 또는 자막 텍스트"}],"cta":"마지막 CTA 문구","hashtags":["해시태그1","해시태그2","해시태그3"],"caption":"SNS 게시글 캡션","overallComment":"스크립트 총평 및 활용 팁"}`,
    ai_photo: `당신은 AI 이미지 프롬프트 전문가입니다. 업로드된 사진 또는 설명 텍스트를 바탕으로 전문 프로필·제품 이미지 생성을 위한 AI 프롬프트와 편집 가이드를 제공하세요.\n반드시 JSON으로만 응답: {"analysis":"사진/텍스트 분석 결과","recommended_style":"권장 이미지 스타일","ai_prompt":"Midjourney/DALL-E용 영문 프롬프트","editing_steps":["편집 단계1","편집 단계2","편집 단계3"],"background_options":["배경 옵션1","배경 옵션2"],"color_scheme":"추천 색상 팔레트","overallComment":"총평 및 활용 팁"}`,
    subtitle_create: `당신은 전문 자막·번역 전문가입니다. 주어진 스크립트 또는 텍스트를 바탕으로 영상 자막을 생성하고 다국어 번역을 제공하세요.\n반드시 JSON으로만 응답: {"subtitles":[{"index":1,"startSec":0,"endSec":3,"text":"자막 텍스트"}],"translations":{"en":"영문 자막 전체","ja":"일본어","zh":"중국어(간체)"},"srt_format":"SRT 형식 전체 텍스트","style_guide":"자막 스타일 가이드 (폰트·크기·위치)","overallComment":"총평"}`,
  };
  const customPrompt = prompts[serviceId];
  if (customPrompt) {
    return callClaude({
      model: 'claude-haiku-4-5-20251001',
      system: customPrompt,
      userBlocks: [{ type: 'text', text }],
      env,
      maxTokens: 3000
    });
  }
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

// ────────────────────────────────────────────────────────────
// 8. 웹툰 시나리오 분석 & 에피소드 기획
// ────────────────────────────────────────────────────────────
const WEBTOON_SYSTEM = `당신은 네이버웹툰·카카오웹툰·레진코믹스·타파스(해외) 플랫폼에서 검증된 웹툰 시나리오 분석가이자 에피소드 기획 전문가입니다.
연간 300편 이상의 웹툰 스크립트를 분석·기획했으며, 2026년 글로벌 웹툰 시장 144억 달러 규모의 흥행 공식을 정밀하게 파악합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 글로벌 웹툰 시장 데이터]
- 시장 규모: 2025년 108억 달러 → 2026년 144억 달러 (CAGR 33.1%, Mordor Intelligence)
- 2031년 예상: 602억 달러
- 장르별 점유율: 로맨스 38%+ (미국 기준), SF 36.2% CAGR 성장 예상 (2026~2031)
- 플랫폼별 수익화: 네이버웹툰 Canvas (구독자 1,000명+, 월 조회수 40,000+ 필요), 레진 (유료 에피소드), 타파스 (잉크 코인)
- 웹툰→IP 전환: 스위트홈·지금 우리 학교는 Netflix 각색 후 웹툰 독자 3배 증가
- AI 도구 활용: 에피소드 제작 시간 20~40시간 → 4~8시간으로 단축 (AI 기반)

[흥행 웹툰 공식 — 장르별]
▶ 로맨스: 첫 3화 안에 두 주인공 갈등 설정 필수, 클리프행어(화 끝 반전) 매 화 필수
▶ 판타지/이세계: 주인공 각성 씬 1화 이내, 성장 수치화(레벨·스탯), 독자 대리만족
▶ 액션: 1화 첫 장면 전투 씬, 빌런 매력도가 흥행 결정 (쇼맨십 필수)
▶ 일상/힐링: 공감 포인트 3개 이상/화, 캐릭터 개성이 스토리보다 중요
▶ 스릴러/호러: 복선 3회 이상/에피소드, 독자 추리 참여 유도

[플랫폼별 최적화 기준]
- 네이버웹툰: 세로 스크롤, 컷당 평균 3~5초 읽기, 화당 70~100컷, 주 1회 연재
- 카카오웹툰: 첫 화 무료 + 유료 전환, 감정 몰입형 연출
- 레진코믹스: 성인·장르물 강세, 팬덤 결속력 중시
- 타파스(글로벌): 영어 우선, 짧은 화(30~50컷), 강렬한 첫 3화 무료 필수
- 리얼쇼트(중화권): AI 만화 드라마, 10명 팀 10일 이내 100분 제작 가능

[불합격(연재 중단) 패턴 TOP5]
1. 1화 세계관 설명 과다 → 독자 이탈
2. 주인공 능동성 부재 → 사건에 끌려다니는 수동형 주인공
3. 클리프행어 부재 → 다음 화 기대감 0
4. 조연 개성 부재 → 주인공만 존재하는 1인 만화
5. 장르 혼종 실패 → 로맨스+액션+힐링 동시 추구 → 어느 쪽도 아닌 작품

출력 스키마:
{
  "genre": "파악된 장르 (로맨스/판타지/액션/스릴러/일상/기타)",
  "targetPlatform": "추천 플랫폼 (네이버/카카오/레진/타파스/기타)",
  "hookStrength": 0~100,
  "hookAnalysis": "1화 첫 장면의 독자 유인력 평가 (100자 이내)",
  "cliffhangerScore": 0~100,
  "plotStructure": {
    "act1": "1화~3화 설정 요약",
    "act2": "중반 갈등 구조",
    "act3": "클라이맥스 방향 제안"
  },
  "characterAnalysis": [
    {
      "name": "캐릭터명",
      "role": "역할",
      "strength": "강점",
      "weakness": "보완 필요 사항"
    }
  ],
  "failPatterns": ["발견된 불합격 패턴1 (증거 포함)", "패턴2"],
  "episodePlan": [
    {
      "episode": 1,
      "title": "화 제목 제안",
      "keyScene": "핵심 씬 설명",
      "cliffhanger": "이 화의 클리프행어"
    }
  ],
  "monetizationAdvice": "추천 수익화 전략 (플랫폼+유료화 방식)",
  "ipExpansionPotential": "드라마·애니·영화 IP 전환 가능성 평가",
  "overallComment": "전체 총평 (200자 이내)"
}`;

export async function analyzeWebtoon({ text, env }) {
  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: WEBTOON_SYSTEM,
    userBlocks: [{ type: 'text', text: `다음 웹툰 시나리오/기획안을 분석해주세요:\n\n${text}` }],
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 9. 단편영화·숏폼 드라마 시나리오 분석
// ────────────────────────────────────────────────────────────
const SHORTFILM_SYSTEM = `당신은 부산국제영화제(BIFF)·전주국제영화제·선댄스 출품작 분석 경험의 단편영화 시나리오 전문가이자, 2026년 폭발적으로 성장 중인 숏폼 드라마(마이크로드라마) 제작 어드바이저입니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 숏폼 드라마 시장 데이터]
- 글로벌 마이크로드라마 시장: 2025년 38억 달러 → 2026년 78억 달러 (2배 성장, Deloitte)
- 형식: 60~90초/에피소드, 세로(9:16) 포맷, 클리프행어 필수
- 주요 플랫폼: ReelShort, DramaBox, GoodShort, ShortMax, 틱톡 시리즈
- 수익화: 마이크로트랜잭션(코인), 구독, 광고
- AI 생성 드라마: 10명 팀 10일 이내 100분 드라마 완성, 비용 기존 1/5
- 해외 숏폼 드라마 앱 다운로드: 2025년 18.55억 건 (YoY 300% 성장)

[플랫폼별 수익화 공식]
▶ ReelShort/DramaBox: 에피소드당 코인 결제 (평균 $0.5~1.5), 첫 3화 무료 → 이후 유료
▶ 틱톡 시리즈: 광고 수익 + 팁 기능, 팔로워 연동 성장
▶ 유튜브 숏츠 시리즈: 조회수 기반 광고 + 멤버십
▶ 국내: 카카오TV 단편, 왓챠 숏폼, 네이버 시리즈ON

[단편영화 영화제 출품 기준]
- 러닝타임: 20분 이내 (단편 기준, 부산·전주·선댄스 공통)
- 3막 구조 압축: 설정(1~3분)→갈등(10~15분)→해결(2~5분)
- 1인칭 관점 혹은 강력한 아이러니 구조 선호
- 사회적 메시지 + 감정적 임팩트의 균형
- 대사보다 영상 언어(비주얼 스토리텔링) 우선

[흥행 숏폼 드라마 공식]
- 제목: 욕망·금기·역전 키워드 포함 ("재벌 남친", "배신", "복수")
- 1화 첫 30초: 주인공 위기 상황 또는 갈등 정점에서 시작
- 매 에피소드 끝: 반드시 다음 화 궁금증 유발 (클리프행어)
- 감정 곡선: 긴장→완화→더 큰 긴장 반복
- 장르 혼합: 로맨스+복수, 판타지+일상, 스릴러+코미디

출력 스키마:
{
  "format": "단편영화|숏폼드라마|마이크로드라마|웹드라마",
  "genre": "장르",
  "targetPlatform": "추천 플랫폼",
  "logline": "한 줄 시놉시스 제안 (50자 이내)",
  "structureAnalysis": {
    "act1": "설정부 평가",
    "act2": "갈등부 평가",
    "act3": "결말부 평가",
    "pacing": "템포 평가 (빠름/적절/느림)"
  },
  "hookScore": 0~100,
  "cliffhangerScore": 0~100,
  "emotionalArc": "감정 곡선 설명",
  "strengths": ["강점1", "강점2"],
  "improvements": [
    {
      "issue": "문제점",
      "suggestion": "개선 방향",
      "reference": "유사 성공 사례 (있으면)"
    }
  ],
  "festivalPotential": "영화제 출품 가능성 평가 (높음/중간/낮음 + 이유)",
  "platformStrategy": "추천 배포 전략 (플랫폼+수익화 방법)",
  "seriesPotential": "시리즈 확장 가능성 평가",
  "overallComment": "전체 총평 (200자 이내)"
}`;

export async function analyzeShortFilm({ text, env }) {
  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: SHORTFILM_SYSTEM,
    userBlocks: [{ type: 'text', text: `다음 시나리오/기획안을 분석해주세요:\n\n${text}` }],
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 10. 드라마 시리즈 기획서 분석 (OTT·방송)
// ────────────────────────────────────────────────────────────
const DRAMA_SERIES_SYSTEM = `당신은 넷플릭스·웨이브·티빙·쿠팡플레이 드라마 기획 경험을 가진 OTT 드라마 시리즈 분석 전문가입니다.
한국 드라마의 글로벌 성공 패턴(오징어게임·이상한 변호사 우영우·무빙)과 2026년 OTT 트렌드를 기반으로 시리즈 기획서를 정밀 분석합니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[2026년 OTT 드라마 트렌드]
- 넷플릭스 K드라마: 비영어권 콘텐츠 시청 시간의 35%+가 한국 콘텐츠
- 글로벌 히트 공식: 한국적 정서(정·한·빨리빨리) + 보편적 감정(가족·계층·사랑)
- 에피소드 트렌드: 6~8부작 미니시리즈 선호 (16부작 대장정 감소)
- 장르 트렌드: 스릴러+사회비판, 판타지+로맨스, 좀비+가족드라마 혼합
- 제작비: 회당 10억~50억 (OTT 오리지널), 숏폼 드라마 회당 300만원~
- 피칭 핵심: "한 문장 설명 가능한 컨셉" + "누가 왜 볼 것인가"

[넷플릭스 피칭 기준 — 글로벌 OTT 공통]
1. High Concept: 장르+반전 요소 한 문장에 담기 (예: "변호사가 자폐인데 천재 — 이상한 변호사 우영우")
2. Character with Want & Need: 주인공이 원하는 것(Want) vs 실제 필요한 것(Need)의 격차
3. World: 시청자가 탐험하고 싶은 독특한 세계관
4. Stakes: 주인공이 실패하면 무엇을 잃는가 (개인→사회적 의미로 확장)
5. Tone: 장르적 톤의 일관성 (설정부터 결말까지 같은 감정 레이어)

[시리즈 불합격 패턴]
1. 설정 과부하: 1화에 등장인물 10명+ → 시청자 혼란
2. 갈등 지연: 3화까지 본 갈등 없음 → 이탈
3. 주인공 비공감: 일반적 선량함만 → 결함 있는 인간적 주인공이 필요
4. 세계관 논리 붕괴: 판타지 룰셋 후반부 무시
5. 엔딩 부재: 시즌2 열어놓기식 열린 결말 → OTT 시청자 분노

[시즌 구성 공식]
- 6부작: 1화 세계관+주인공, 2~4화 갈등 심화, 5화 위기 정점, 6화 해소+여운
- 8부작: 1~2화 설정, 3~6화 갈등, 7화 반전, 8화 결말
- 16부작(방송): 4부작 단위 소갈등 해소, 전체 대갈등 10화 이후 본격화

출력 스키마:
{
  "title": "기획서 제목",
  "genre": "장르 조합",
  "targetPlatform": "추천 플랫폼 (넷플릭스/웨이브/티빙/쿠팡/방송)",
  "highConcept": "제안된 한 줄 컨셉 (없으면 분석 후 제안)",
  "episodeCount": "추천 편수 (현재 기획 기준)",
  "pitchScore": 0~100,
  "characterAnalysis": {
    "protagonist": {
      "want": "주인공이 원하는 것",
      "need": "주인공이 실제 필요한 것",
      "flaw": "결함 (공감 포인트)",
      "strength": "강점"
    },
    "antagonist": "빌런/갈등 역할 분석",
    "supporting": ["조연 캐릭터 평가1", "평가2"]
  },
  "worldBuilding": "세계관 완성도 평가",
  "conflictStructure": "갈등 구조 분석 (다층 갈등 여부)",
  "globalAppeal": "글로벌 시청자 공감 가능성 평가 (한국 정서 + 보편 감정 균형)",
  "failPatterns": ["발견된 불합격 패턴1", "패턴2"],
  "improvements": [
    {
      "episode": "해당 화 또는 구간",
      "issue": "문제점",
      "suggestion": "구체적 개선 방향"
    }
  ],
  "pitchDeck": {
    "logline": "50자 이내 한 줄 요약",
    "synopsis": "200자 이내 시놉시스",
    "targetAudience": "주 시청 타겟",
    "comparableTitle": "유사 성공작 2개"
  },
  "revenueModel": "수익화 전략 (OTT 판권+시즌2+IP)",
  "overallComment": "전체 총평 (200자 이내)"
}`;

export async function analyzeDramaSeries({ text, env }) {
  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: DRAMA_SERIES_SYSTEM,
    userBlocks: [{ type: 'text', text: `다음 드라마 시리즈 기획서를 분석해주세요:\n\n${text}` }],
    env,
    maxTokens: 8000
  });
}

// ────────────────────────────────────────────────────────────
// 11. 보험약관 AI 스캐너 (상세 강화)
// ────────────────────────────────────────────────────────────
export async function analyzeInsurance({ text, env }) {
  const INSURANCE_SYSTEM = `당신은 금융감독원 출신 보험약관 전문 분석가입니다. 2025-2026 실제 보험분쟁 데이터를 기반으로 약관의 면책조항·불완전판매 위험을 쉽게 풀어 진단합니다.
반드시 JSON만 출력.

[2025-2026 한국 보험분쟁 실통계]
- 한국소비자원 보험 피해구제: 2025년 930건, 85.8%가 보험금 지급거부
- 지급거부 주요원인: 진단·치료 불인정 67.4%, 약관해석 이견 20.7%
- 실손보험 분쟁 1위(42%), 40-60대 집중(74%)
- 2026년 FSS 가이드: 보험사 심사기준 변경 시 사전고지 의무화

[면책조항 주요 패턴]
- 고지의무 위반: 기존병력 미고지 → 계약해지 가능
- 의사소견 불인정: 주치의 진단을 보험사 자체 기준으로 뒤집는 조항
- 보장범위 축소: "의사의 필요에 의한" → 사실상 보험사 판정
- 갱신형 보험료 급등: 5년마다 30-50% 인상 가능 조항

출력 스키마:
{
  "insuranceType": "보험 유형",
  "coverageSummary": {
    "mainCoverage": ["주요 보장"],
    "exclusions": ["주요 면책"],
    "limits": ["한도·제한"]
  },
  "riskClauses": [
    {
      "clauseTitle": "조항명",
      "original": "원문 발췌",
      "issue": "문제점 (쉬운 말로)",
      "consumerImpact": "소비자 불이익",
      "riskLevel": "high|medium|low"
    }
  ],
  "missingProtections": ["가입자가 모를 수 있는 누락 보장"],
  "claimTips": ["보험금 청구 시 실전 팁"],
  "disputeRisk": "분쟁 가능성 (높음/보통/낮음)",
  "overallComment": "약관 종합평가 (200자 이내)"
}`;

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: INSURANCE_SYSTEM,
    userBlocks: [{ type: 'text', text: `[보험약관 내용]\n${text}` }],
    env,
    maxTokens: 5000
  });
}

export async function analyzeBizPlan({ text, env }) {
  const BIZ_SYSTEM = `당신은 중소벤처기업부·팁스(TIPS) 심사위원 출신 사업계획서 전문 분석가입니다. 실제 투자 심사 기준과 2025-2026 한국 스타트업 시장 데이터로 분석합니다.
반드시 JSON만 출력.

[2025-2026 한국 스타트업·벤처 투자 시장]
- 국내 벤처투자 시장: 2024년 약 6.8조원 (전년比 회복세)
- TIPS 선정 기업: 2024년 400개사, 지원금 최대 5억원
- 정부 지원 집중 분야: AI·반도체·바이오·2차전지·방산·우주
- K-Chips Act: 반도체 시설투자 세액공제 최대 25%
- 투자자들이 가장 중요시하는 요소: 팀(35%), 시장크기(30%), 제품차별성(20%), 재무계획(15%)

[사업계획서 심사 탈락 주요 원인]
1. 시장규모 과대 추정 (TAM/SAM/SOM 구분 없음)
2. 경쟁사 분석 부재 또는 표면적 분석
3. 수익모델 불명확 (언제, 어떻게 돈 버는지 모호)
4. 팀 역량 증명 미흡
5. 재무 가정 비현실적

출력 스키마:
{
  "score": {
    "total": 0~100,
    "breakdown": {
      "팀역량": 0~100,
      "시장성": 0~100,
      "제품차별성": 0~100,
      "수익모델": 0~100,
      "실행가능성": 0~100
    }
  },
  "marketAnalysis": "시장 분석 평가 (TAM·SAM·SOM 기준)",
  "strengths": ["강점"],
  "weaknesses": ["보완 필요 사항"],
  "improvements": [
    {
      "section": "섹션",
      "issue": "문제점",
      "suggestion": "개선 방향",
      "riskLevel": "high|medium|low"
    }
  ],
  "fundingReadiness": "투자 준비도 평가 (씨드/시리즈A/B 수준)",
  "governmentSupport": ["적합한 정부 지원 프로그램 (TIPS/창진원 등)"],
  "recommendations": ["핵심 개선 사항"],
  "overallComment": "전체 총평 (200자 이내)"
}`;

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: BIZ_SYSTEM,
    userBlocks: [{ type: 'text', text: `[사업계획서]\n${text}` }],
    env,
    maxTokens: 6000
  });
}

// ────────────────────────────────────────────────────────────
// 13. 경쟁사 분석 리포트
// ────────────────────────────────────────────────────────────
const COMPETITOR_SYSTEM = `당신은 10년 경력의 수석 시장 분석가입니다. 스타트업·SaaS·플랫폼 시장에서 수백 건의 경쟁 분석 리포트를 작성했습니다.
반드시 다음 JSON 구조로만 응답. 마크다운 없이 JSON만 출력.

[분석 원칙]
- 확인된 공개 정보(공식 홈페이지·언론·앱스토어 리뷰)에만 근거
- 확인할 수 없는 내용은 "정보 없음"으로 명시, 절대 추측하지 않음
- 각 경쟁사의 강점은 솔직하게 인정, 약점은 증거 기반으로 기술
- 최종 포지셔닝은 "내 서비스"의 차별화 기회 중심으로 도출

출력 스키마:
{
  "marketOverview": {
    "marketName": "분석 시장명",
    "summary": "시장 현황 요약 (150자 이내)",
    "totalPlayers": "주요 플레이어 수 추정",
    "maturityLevel": "초기/성장/성숙/포화 중 하나",
    "keyTrend": "2024-2026 핵심 트렌드 (100자 이내)"
  },
  "myServiceAnalysis": {
    "name": "내 서비스명",
    "coreValue": "핵심 가치 제안",
    "targetCustomer": "주요 타겟 고객",
    "currentStrengths": ["강점1", "강점2", "강점3"],
    "currentWeaknesses": ["약점1", "약점2"]
  },
  "competitors": [
    {
      "name": "경쟁사명",
      "type": "직접경쟁/간접경쟁/대체재 중 하나",
      "coreFeatures": ["핵심 기능1", "기능2", "기능3"],
      "pricingModel": "가격 구조 설명 (무료/구독/종량제 등)",
      "targetCustomer": "주요 타겟 고객",
      "knownStrengths": ["검증된 강점1", "강점2"],
      "knownWeaknesses": ["알려진 약점1", "약점2"],
      "userComplaints": ["앱스토어·커뮤니티에서 확인된 불만1", "불만2"],
      "estimatedMarketShare": "시장점유율 추정 또는 정보 없음",
      "differentiationVsMe": "내 서비스 대비 차이점 (객관적으로)"
    }
  ],
  "comparisonMatrix": {
    "criteria": ["기준1(예:가격)", "기준2", "기준3", "기준4", "기준5"],
    "scores": [
      { "name": "내 서비스명", "values": [점수1~10, 점수2, 점수3, 점수4, 점수5] }
    ]
  },
  "opportunityGaps": [
    {
      "gap": "시장에서 아무도 잘 못 하고 있는 것",
      "evidence": "근거",
      "howToCapture": "내 서비스가 이 기회를 잡는 방법"
    }
  ],
  "positioningRecommendation": {
    "uniquePositioning": "권장 포지셔닝 한 문장 (슬로건 수준)",
    "primaryDifferentiators": ["핵심 차별화 포인트1", "포인트2", "포인트3"],
    "avoidCompetingOn": ["이 기준으로는 싸우지 마라 (이유 포함)1", "기준2"],
    "priorityActions": [
      { "action": "즉시 실행 가능한 액션", "rationale": "이유", "effort": "상/중/하" }
    ]
  },
  "dataLimitations": ["확인하지 못한 정보1", "한계2"]
}

경쟁사 수가 3개 미만이면 있는 것만 분석. 5개 초과면 가장 위협적인 5개만 선별.`;

export async function analyzeCompetitors({ myService, competitors, marketContext = '', env }) {
  const competitorList = Array.isArray(competitors) ? competitors.join(', ') : competitors;
  const userText = [
    `[내 서비스]\n${myService}`,
    `[분석할 경쟁사]\n${competitorList}`,
    marketContext ? `[시장/업종 맥락]\n${marketContext}` : ''
  ].filter(Boolean).join('\n\n');

  return callClaude({
    model: 'claude-haiku-4-5-20251001',
    system: COMPETITOR_SYSTEM,
    userBlocks: [{ type: 'text', text: userText }],
    env,
    maxTokens: 6000
  });
}
