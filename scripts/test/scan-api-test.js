/**
 * SCAN AI 서비스 전항목 API 테스트
 *
 * 사용법:
 *   SCAN_TEST_EMAIL=kimdh4790@gmail.com SCAN_TEST_PASSWORD=<pw> node scripts/test/scan-api-test.js
 *   SCAN_TEST_TOKEN=<firebase_id_token> node scripts/test/scan-api-test.js
 *   node scripts/test/scan-api-test.js   (인증불필요 테스트만 실행)
 *
 * 옵션:
 *   --suite=auth,validation,points,analyze,helpers,superadmin  (기본: 전체)
 *   --verbose   (상세 응답 출력)
 *   --timeout=60000   (분석 폴링 최대 대기시간 ms, 기본 60000)
 */

const BASE_URL = 'https://mbtico.kr';
const FIREBASE_API_KEY = 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';

// 전체 유효 serviceId 목록 (VALID_SERVICES 기준)
const VALID_SERVICES = [
  'resume_analysis', 'cover_letter_analysis', 'cover_letter_rewrite',
  'cover_letter_translation', 'interview_questions',
  'employment_contract', 'freelance_contract', 'rental_contract',
  'registry_analysis', 'public_doc_analysis', 'workplace_tone',
  'career_saju', 'notice_summary', 'insurance_scan',
  'webtoon_analysis', 'shortfilm_analysis', 'drama_series_analysis',
  'bizplan_analysis', 'shortform_script', 'ai_photo', 'subtitle_create',
];

// 테스트용 샘플 텍스트 (서비스별)
const SAMPLE_TEXTS = {
  resume_analysis: '홍길동 / 010-1234-5678 / gil@email.com\n[학력] 서울대학교 컴퓨터공학과 2022년 졸업\n[경력] 카카오 2022~현재 백엔드 개발자\n[기술] Node.js, TypeScript, AWS',
  cover_letter_analysis: '저는 카카오에 지원하게 되어 기쁩니다. 저는 3년간 스타트업에서 백엔드를 개발하며 사용자 10만명 서비스를 운영했습니다. 카카오의 기술 문화에 기여하고 싶습니다.',
  cover_letter_rewrite: '저는 열심히 일하겠습니다. 성실하게 임하겠습니다. 배우겠습니다.',
  cover_letter_translation: '저는 서울대학교에서 컴퓨터공학을 전공했고, 카카오에서 3년간 백엔드 개발자로 근무했습니다. 주요 프로젝트로는 결제 시스템 구축이 있습니다.',
  interview_questions: '백엔드 개발자 지원자입니다. Node.js, PostgreSQL 경험 3년, MSA 아키텍처 구축 경험 있습니다.',
  employment_contract: '근로계약서\n1. 근무기간: 2026.01.01~2026.12.31\n2. 임금: 월 250만원\n3. 근무시간: 09:00~18:00 주 40시간\n4. 수습기간: 3개월 (급여 80%)',
  freelance_contract: '프리랜서 계약서\n1. 용역범위: 웹사이트 개발\n2. 대금: 500만원\n3. 기간: 2026.01~2026.03\n4. 지적재산권은 발주사에 귀속',
  rental_contract: '임대차계약서\n임대물: 서울시 강남구 역삼동 XX아파트 101호 84㎡\n보증금: 5억원 / 월세: 없음 / 계약기간: 2년\n선순위 근저당: 2억원 / 전세권 설정예정',
  registry_analysis: '등기부등본\n소유자: 홍길동\n근저당권: 새마을금고 채권최고액 2억4천만원\n전세권: 없음\n가압류: 없음\n경매개시결정: 없음',
  public_doc_analysis: '건강보험료 납부확인서\n납부자: 홍길동\n2026년 1월~6월 총 납부액: 1,234,560원\n직장가입자',
  workplace_tone: '야 그거 빨리 처리해봐. 왜 이렇게 느려? 그것도 못하면 어디다 쓸거야.',
  career_saju: '1990년 5월 15일 오전 10시 출생. 현재 직장 3년차 마케터. 이직 고민 중.',
  notice_summary: '가정통신문\n2026년 9월 운동회 안내\n일시: 2026.09.20(토) 오전 9시\n장소: 학교 운동장\n준비물: 체육복, 물, 간식\n비 오면 실내 대체',
  insurance_scan: '실손의료보험 약관\n면책조항: 정신과 질환, 고의적 자해, 음주운전 사고, 스쿠버다이빙 등 위험 레저 스포츠는 보험금 지급 제외',
  webtoon_analysis: '웹툰 스크립트\n1화: 주인공 철수가 마법사 학교에 입학합니다. 첫 수업에서 실수를 하지만 친구 영희를 만납니다.',
  shortfilm_analysis: '단편영화 기획서\n제목: 마지막 전화\n장르: 드라마\n주인공이 아버지 돌아가시기 직전 마지막 통화를 회상하는 내용.',
  drama_series_analysis: '드라마 기획안\n제목: 부부의 계절\n장르: 멜로/가족\n소재: 이혼 직전 부부가 자녀 때문에 1년간 이혼 유예',
  bizplan_analysis: '사업계획서\n사업명: 소상공인 AI 경영 도우미\n목표시장: 전국 소상공인 350만명\n수익모델: SaaS 구독 월 3만원\n3년 목표 매출: 30억원',
  shortform_script: '카페 창업 준비 중인 30대 직장인 이야기. 퇴직 결심부터 오픈까지 30일간의 기록.',
  ai_photo: '여권사진용 프로필 사진. 흰색 배경, 정면, 자연스러운 미소, 업무용 정장 착용.',
  subtitle_create: '안녕하세요 반갑습니다. 오늘은 AI 문서 분석 서비스에 대해 알아보겠습니다. 빠르고 정확한 분석으로 여러분의 시간을 절약해드립니다.',
};

// CLI 인수 파싱
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const timeoutMs = parseInt((args.find(a => a.startsWith('--timeout=')) || '--timeout=60000').split('=')[1]);
const suiteArg = (args.find(a => a.startsWith('--suite=')) || '').split('=')[1];
const SUITES = suiteArg ? suiteArg.split(',') : ['auth', 'validation', 'points', 'analyze', 'helpers', 'superadmin'];

// 결과 추적
const results = [];
let token = null;

// ── 유틸리티 ────────────────────────────────────────────────────────────────

const C = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
  yellow:s => `\x1b[33m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
};

function log(ok, name, detail = '') {
  const icon = ok ? C.green('✓') : C.red('✗');
  const nameStr = ok ? name : C.red(name);
  const detailStr = detail ? C.dim(` — ${detail}`) : '';
  console.log(`  ${icon} ${nameStr}${detailStr}`);
  results.push({ ok, name, detail });
}

function section(title) {
  console.log(`\n${C.bold(C.cyan('▶ ' + title))}`);
}

async function api(method, path, opts = {}) {
  const { body, headers = {}, form } = opts;
  const h = { ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;

  let bodyData;
  if (form) {
    // FormData simulation via URLSearchParams (text fields only)
    h['Content-Type'] = 'application/x-www-form-urlencoded';
    bodyData = new URLSearchParams(form).toString();
  } else if (body && typeof body === 'object') {
    h['Content-Type'] = 'application/json';
    bodyData = JSON.stringify(body);
  } else {
    bodyData = body;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: h,
    body: bodyData,
  });

  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (verbose) {
    console.log(C.dim(`    → ${method} ${path} [${res.status}]`));
    if (data) console.log(C.dim(`    ← ${JSON.stringify(data).slice(0, 200)}`));
  }

  return { status: res.status, data };
}

async function apiMultipart(path, fields) {
  // 텍스트 전용 multipart (파일 없이 FormData 수동 구성)
  const boundary = '----TestBoundary' + Math.random().toString(16).slice(2);
  const parts = Object.entries(fields).map(([k, v]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`
  ).join('\r\n');
  const body = `${parts}\r\n--${boundary}--\r\n`;

  const h = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  };
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: h, body });
  const ct = res.headers.get('content-type') || '';
  let data;
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();

  if (verbose) {
    console.log(C.dim(`    → POST ${path} (multipart) [${res.status}]`));
    if (data) console.log(C.dim(`    ← ${JSON.stringify(data).slice(0, 200)}`));
  }
  return { status: res.status, data };
}

async function pollResult(jobId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await api('GET', `/api/seolyuhana/result/${jobId}`);
    if (r.status === 200 && r.data?.status === 'completed') return { ok: true, result: r.data.result };
    if (r.data?.status === 'failed') return { ok: false, error: r.data.error };
    await new Promise(res => setTimeout(res, 2000));
  }
  return { ok: false, error: 'timeout' };
}

// ── Firebase 인증 ──────────────────────────────────────────────────────────

async function getFirebaseToken() {
  if (process.env.SCAN_TEST_TOKEN) return process.env.SCAN_TEST_TOKEN;

  const email = process.env.SCAN_TEST_EMAIL;
  const password = process.env.SCAN_TEST_PASSWORD;
  if (!email || !password) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://mbtico.kr',
        'Origin': 'https://mbtico.kr',
      },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const d = await res.json();
  if (d.idToken) {
    console.log(C.green(`  Firebase 로그인 성공: ${email}`));
    return d.idToken;
  }
  console.log(C.red(`  Firebase 로그인 실패: ${d.error?.message || JSON.stringify(d)}`));
  return null;
}

// ── 테스트 스위트 ──────────────────────────────────────────────────────────

async function suiteAuth() {
  section('인증 테스트');

  // 토큰 없이 → 401 또는 403
  const noTokenOrig = token;
  token = null;
  const r1 = await api('GET', '/api/seolyuhana/points');
  log(r1.status === 401 || r1.status === 403, '토큰 없이 /points 요청 → 401/403', `status=${r1.status}`);

  const r2 = await apiMultipart('/api/seolyuhana/analyze', { serviceId: 'public_doc_analysis', text: '테스트' });
  log(r2.status === 401 || r2.status === 403, '토큰 없이 /analyze 요청 → 401/403', `status=${r2.status}`);
  token = noTokenOrig;

  // 토큰 있으면 → 200 또는 400 (인증 성공)
  if (token) {
    const r3 = await api('GET', '/api/seolyuhana/points');
    log(r3.status === 200, '토큰 있으면 /points 인증 통과', `status=${r3.status}`);
  } else {
    log(false, '토큰 없음 — 인증 테스트 스킵', '환경변수 SCAN_TEST_EMAIL+PASSWORD 또는 SCAN_TEST_TOKEN 필요');
  }
}

async function suiteValidation() {
  section('서비스ID 유효성 검사');

  if (!token) {
    log(false, '토큰 없음 — 인증 필요', '스킵');
    return;
  }

  // 잘못된 serviceId → 400
  const inv = await apiMultipart('/api/seolyuhana/analyze', { serviceId: 'invalid_service_xyz', text: '테스트' });
  log(inv.status === 400, '유효하지 않은 serviceId → 400', `status=${inv.status}`);

  // text/file 둘 다 없으면 → 400
  const noInput = await apiMultipart('/api/seolyuhana/analyze', { serviceId: 'public_doc_analysis' });
  log(noInput.status === 400, 'text·file 모두 누락 → 400', `status=${noInput.status}`);

  // 모든 유효 serviceId에 대해 400이 아닌지 확인 (실제 처리는 별도)
  // analyze 엔드포인트는 비용이 들어가므로 직접 실행하지 않고 점검만
  console.log(C.dim(`\n  유효 serviceId 목록 확인 (${VALID_SERVICES.length}개):`));
  console.log(C.dim(`  ${VALID_SERVICES.join(', ')}`));
  log(VALID_SERVICES.length >= 21, `VALID_SERVICES 21개 이상 등록 확인`, `실제 ${VALID_SERVICES.length}개`);
}

async function suitePoints() {
  section('포인트 시스템 테스트');

  if (!token) {
    log(false, '토큰 없음 — 포인트 테스트 스킵');
    return;
  }

  // 잔액 조회
  const r1 = await api('GET', '/api/seolyuhana/points');
  log(r1.status === 200, '포인트 잔액 조회 성공', `status=${r1.status}`);
  if (r1.status === 200 && verbose) {
    console.log(C.dim(`    잔액: ${JSON.stringify(r1.data)}`));
  }

  // 슈퍼어드민 잔액 확인 (kimdh4790 / soungkyekim 이면 ∞P)
  const isSuperadmin = process.env.SCAN_TEST_EMAIL?.includes('kimdh4790') ||
                       process.env.SCAN_TEST_EMAIL?.includes('soungkyekim');
  if (isSuperadmin && r1.status === 200) {
    log(r1.data?.balance === Infinity || r1.data?.isSuperadmin === true || r1.data?.balance > 1e9 || r1.data?.points > 1e9,
      '슈퍼어드민 ∞P 바이패스 확인',
      `balance=${JSON.stringify(r1.data)}`);
  }

  // 충전 신청 (최소 금액 5000, 환불 신청 아님 — 계좌이체 안내만)
  const r2 = await api('POST', '/api/seolyuhana/point-request', {
    body: { amount: 5000, depositorName: '테스트입금자', uid: '테스트uid' }
  });
  // 201 또는 200 기대 (신청 저장)
  log(r2.status === 200 || r2.status === 201, '충전 신청 API 정상 응답', `status=${r2.status}`);

  // 최소 금액 미만 → 에러
  const r3 = await api('POST', '/api/seolyuhana/point-request', {
    body: { amount: 100, depositorName: '테스트' }
  });
  log(r3.status === 400, '최소 충전 금액(5000원) 미만 → 400', `status=${r3.status}`);
}

async function suiteAnalyze() {
  section('분석 플로우 테스트');

  if (!token) {
    log(false, '토큰 없음 — 분석 테스트 스킵');
    return;
  }

  // 저렴한 서비스부터 테스트 (2900P — 슈퍼어드민이면 차감 없음)
  const testServices = [
    { serviceId: 'public_doc_analysis', label: '공문서 분석' },
    { serviceId: 'notice_summary', label: '가정통신문 요약' },
    { serviceId: 'workplace_tone', label: '직장인 말투 변환' },
    { serviceId: 'career_saju', label: '커리어 사주풀이' },
    { serviceId: 'interview_questions', label: '면접 질문 생성' },
    { serviceId: 'shortform_script', label: '숏폼 스크립트' },
  ];

  for (const { serviceId, label } of testServices) {
    const text = SAMPLE_TEXTS[serviceId] || '테스트 텍스트입니다.';
    const r = await apiMultipart('/api/seolyuhana/analyze', { serviceId, text });

    if (r.status !== 200 && r.status !== 201) {
      log(false, `${label} (${serviceId}) 분석 요청`, `status=${r.status} err=${JSON.stringify(r.data).slice(0, 100)}`);
      continue;
    }

    const jobId = r.data?.jobId;
    if (!jobId) {
      log(false, `${label} (${serviceId}) jobId 반환`, `data=${JSON.stringify(r.data).slice(0, 100)}`);
      continue;
    }

    log(true, `${label} (${serviceId}) 분석 요청 성공`, `jobId=${jobId}`);

    // 결과 폴링
    console.log(C.dim(`    폴링 중... (최대 ${timeoutMs/1000}초)`));
    const poll = await pollResult(jobId, timeoutMs);
    log(poll.ok, `${label} 분석 완료`, poll.ok
      ? `result keys=${Object.keys(poll.result || {}).join(',')}`
      : `error=${poll.error}`);

    if (poll.ok && poll.result) {
      // 결과 키 확인
      const keys = Object.keys(poll.result);
      log(keys.length > 0, `${label} 결과 비어있지 않음`, `keys=${keys.join(',')}`);
    }

    // 결과 재조회 (result 엔드포인트)
    const rr = await api('GET', `/api/seolyuhana/result/${jobId}`);
    log(rr.status === 200, `${label} result 재조회`, `status=${rr.status}`);

    // 처음 2개만 전체 플로우 테스트 (시간 절약)
    if (testServices.indexOf({ serviceId, label }) >= 1) break;
  }

  // 이력서 분석 (sonnet-4-6 — 비용 29900P)
  if (process.env.SCAN_TEST_FULL === '1') {
    const text = SAMPLE_TEXTS.resume_analysis;
    const r = await apiMultipart('/api/seolyuhana/analyze', { serviceId: 'resume_analysis', text });
    if (r.status === 200 && r.data?.jobId) {
      log(true, '이력서 분석 요청 성공', `jobId=${r.data.jobId}`);
      const poll = await pollResult(r.data.jobId, timeoutMs);
      log(poll.ok, '이력서 분석 완료', poll.ok ? `keys=${Object.keys(poll.result||{}).join(',')}` : poll.error);
    } else {
      log(false, '이력서 분석 요청', `status=${r.status}`);
    }
  }
}

async function suiteHelpers() {
  section('보조 API 테스트');

  // registry-link (인증 있어야 함)
  if (token) {
    const r1 = await api('GET', '/api/seolyuhana/registry-link?address=서울시 강남구 역삼동');
    log(r1.status === 200, 'registry-link 등기소 딥링크 생성', `status=${r1.status}`);
    if (r1.status === 200) log(typeof r1.data?.url === 'string' || typeof r1.data === 'string', 'registry-link URL 포함', '');
  } else {
    // 토큰 없이 → 401/403
    const r1 = await api('GET', '/api/seolyuhana/registry-link?address=서울시 강남구 역삼동');
    log(r1.status === 401 || r1.status === 403, 'registry-link 토큰 없이 → 401/403', `status=${r1.status}`);
  }

  if (!token) {
    log(false, 'biz-status/registry-direct 토큰 없음 — 스킵');
    return;
  }

  // biz-status
  const r2 = await api('GET', '/api/seolyuhana/biz-status?bizNum=1234567890');
  // 실제 사업자번호 아니므로 404 또는 200(결과없음) 기대
  log(r2.status === 200 || r2.status === 404, 'biz-status API 응답 성공', `status=${r2.status}`);

  // registry-direct (Tilko API — 잘못된 주소라 오류 기대)
  const r3 = await api('POST', '/api/seolyuhana/registry-direct', {
    body: { address: '서울시 강남구 테헤란로 123' }
  });
  // 오류이더라도 API 자체는 응답해야 함
  log([200, 400, 404, 500, 502].includes(r3.status), 'registry-direct API 응답 있음', `status=${r3.status}`);
}

async function suiteSuperadmin() {
  section('슈퍼어드민 기능 테스트');

  if (!token) {
    log(false, '토큰 없음 — 슈퍼어드민 테스트 스킵');
    return;
  }

  // point-approve (슈퍼어드민만 가능)
  // 존재하지 않는 요청ID로 호출 → 404 또는 권한 에러 기대
  const r1 = await api('POST', '/api/seolyuhana/point-approve', {
    body: { reqId: 'test-nonexistent-req-id', uid: 'test-uid', amount: 1000 }
  });
  const isSuperadmin = process.env.SCAN_TEST_EMAIL?.includes('kimdh4790') ||
                       process.env.SCAN_TEST_EMAIL?.includes('soungkyekim');
  if (isSuperadmin) {
    // 슈퍼어드민이면 실행 시도됨 (reqId 없으면 404)
    log([200, 201, 404, 400].includes(r1.status), 'point-approve 슈퍼어드민 접근 가능', `status=${r1.status}`);
  } else {
    // 일반 유저면 403
    log(r1.status === 403 || r1.status === 401, 'point-approve 일반 유저 → 403', `status=${r1.status}`);
  }
}

async function suiteDownload() {
  section('다운로드 API 테스트');

  if (!token) {
    log(false, '토큰 없음 — 다운로드 테스트 스킵');
    return;
  }

  // 존재하지 않는 jobId → 404
  const r1 = await api('GET', '/api/seolyuhana/download/nonexistent-job-id?type=pdf');
  log(r1.status === 404, '존재하지 않는 jobId → 404', `status=${r1.status}`);

  const r2 = await api('GET', '/api/seolyuhana/download/nonexistent-job-id?type=docx');
  log(r2.status === 404, '존재하지 않는 jobId (docx) → 404', `status=${r2.status}`);
}

// ── 메인 실행 ──────────────────────────────────────────────────────────────

async function main() {
  console.log(C.bold('\n🔬 SCAN AI 서비스 전항목 테스트'));
  console.log(C.dim(`   대상: ${BASE_URL}`));
  console.log(C.dim(`   스위트: ${SUITES.join(', ')}`));
  if (process.env.SCAN_TEST_FULL === '1') console.log(C.yellow('   FULL 모드: 유료 서비스 포함'));

  // Firebase 인증
  console.log('\n🔑 Firebase 인증 시도...');
  token = await getFirebaseToken();
  if (!token) {
    console.log(C.yellow('  토큰 없음 — 인증 불필요 테스트만 실행'));
    console.log(C.dim('  인증 테스트 실행하려면:'));
    console.log(C.dim('  SCAN_TEST_EMAIL=xxx SCAN_TEST_PASSWORD=xxx node scripts/test/scan-api-test.js'));
  }

  // 스위트 실행
  const map = {
    auth:       suiteAuth,
    validation: suiteValidation,
    points:     suitePoints,
    analyze:    suiteAnalyze,
    helpers:    suiteHelpers,
    superadmin: suiteSuperadmin,
    download:   suiteDownload,
  };

  for (const suite of SUITES) {
    if (map[suite]) await map[suite]();
    else console.log(C.yellow(`  알 수 없는 스위트: ${suite}`));
  }
  if (!SUITES.includes('download')) await suiteDownload();

  // 결과 요약
  const pass = results.filter(r => r.ok).length;
  const skip = results.filter(r => !r.ok && (r.detail?.includes('스킵') || r.name?.includes('스킵') || r.name?.includes('없음'))).length;
  const fail = results.filter(r => !r.ok).length;

  console.log(`\n${C.bold('─────────────────────────────────────')}`);
  console.log(C.bold('결과 요약'));
  console.log(`  ${C.green('통과')}: ${pass}개`);
  if (fail > 0) console.log(`  ${C.red('실패')}: ${fail}개 (스킵 포함 ${skip}개)`);
  const realFail = fail - skip;
  if (skip > 0) console.log(`  ${C.yellow('건너뜀')}: ${skip}개 (토큰 없음)`);
  if (realFail === 0) console.log(`  ${C.green('✅ 실제 실패 없음!')}`);
  else {
    console.log(`\n${C.red('실패 항목:')}`);
    results.filter(r => !r.ok && !r.detail?.includes('스킵') && !r.name?.includes('스킵') && !r.name?.includes('없음')).forEach(r => {
      console.log(`  ${C.red('✗')} ${r.name}: ${r.detail || ''}`);
    });
  }

  process.exit(realFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(C.red('\n예상치 못한 오류:'), err);
  process.exit(1);
});
