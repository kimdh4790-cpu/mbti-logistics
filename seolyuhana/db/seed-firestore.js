/**
 * 서류하나 Firestore DB 시딩 스크립트
 * 사용법: node seolyuhana/db/seed-firestore.js
 * 환경: Firebase Admin SDK (GOOGLE_APPLICATION_CREDENTIALS 또는 mbti-logistics SA 키 필요)
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const clausePatterns = require('./sly_clause_patterns.json');
const jobCategories = require('./sly_job_categories.json');
const legalRefs = require('./sly_legal_references.json');

// Firebase 초기화 (SA 키 경로는 환경에 맞게 수정)
const SA_KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../../mbti-firebase-sa.json';
initializeApp({ credential: cert(require(SA_KEY_PATH)) });
const db = getFirestore();

async function seedClausePatterns() {
  console.log('📋 sly_clause_patterns 시딩 시작...');
  const batch = db.batch();
  let count = 0;

  for (const [contractType, section] of Object.entries(clausePatterns)) {
    if (contractType === '_meta') continue;
    const patterns = section.patterns || [];
    for (const pattern of patterns) {
      const ref = db.collection('sly_clause_patterns').doc(pattern.id);
      batch.set(ref, {
        ...pattern,
        contractType,
        contractTypeLabel: section.label,
        updatedAt: new Date().toISOString()
      });
      count++;
    }
  }

  await batch.commit();
  console.log(`✅ sly_clause_patterns: ${count}개 패턴 저장 완료`);
}

async function seedJobCategories() {
  console.log('💼 sly_job_categories 시딩 시작...');
  const batch = db.batch();
  let count = 0;

  for (const [sectorKey, sector] of Object.entries(jobCategories)) {
    if (sectorKey === '_meta' || sectorKey === 'job_application_tips') continue;
    const categories = sector.categories || [];
    for (const cat of categories) {
      const ref = db.collection('sly_job_categories').doc(cat.id);
      batch.set(ref, {
        ...cat,
        sector: sectorKey,
        sectorLabel: sector.label,
        updatedAt: new Date().toISOString()
      });
      count++;
    }
  }

  // 공통 팁도 저장
  const tipsRef = db.collection('sly_job_categories').doc('_common_tips');
  batch.set(tipsRef, {
    ...jobCategories.job_application_tips,
    updatedAt: new Date().toISOString()
  });

  await batch.commit();
  console.log(`✅ sly_job_categories: ${count}개 카테고리 + 공통팁 저장 완료`);
}

async function seedLegalRefs() {
  console.log('⚖️ sly_legal_references 시딩 시작...');
  const batch = db.batch();
  let count = 0;

  for (const [sectionKey, section] of Object.entries(legalRefs)) {
    if (sectionKey === '_meta') continue;
    const ref = db.collection('sly_legal_references').doc(sectionKey);
    batch.set(ref, {
      ...section,
      updatedAt: new Date().toISOString()
    });
    count++;
  }

  await batch.commit();
  console.log(`✅ sly_legal_references: ${count}개 섹션 저장 완료`);
}

async function seedServiceConfig() {
  console.log('⚙️ sly_service_config 시딩 시작...');
  const services = [
    // 취업 서류 — 경쟁사 조사 기반 스위트스팟: 5,000~15,000원
    { id: 'cover_letter_analysis', label: '자기소개서 분석·피드백', pointCost: 9900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 5, category: 'employment' },
    { id: 'cover_letter_translation', label: '자기소개서 영문 번역', pointCost: 19900, enabled: true, modelDefault: 'claude-sonnet-5', maxPages: 5, category: 'employment' },
    { id: 'resume_analysis', label: '이력서 분석·피드백', pointCost: 5900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 3, category: 'employment' },
    { id: 'interview_questions', label: '면접 예상 질문 생성', pointCost: 4900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 3, category: 'employment' },
    // 계약서 검토 — 경쟁사 조사 기반 스위트스팟: 10,000~30,000원 (변호사 20만원 대비 압도적 가성비)
    { id: 'employment_contract', label: '근로계약서 검토', pointCost: 14900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 10, category: 'contract' },
    { id: 'rental_contract', label: '전월세 계약서 검토', pointCost: 29900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 20, category: 'contract' },
    { id: 'freelance_contract', label: '프리랜서 계약서 검토', pointCost: 14900, enabled: true, modelDefault: 'claude-haiku-4-5-20251001', maxPages: 15, category: 'contract' }
  ];

  const batch = db.batch();
  for (const svc of services) {
    const ref = db.collection('sly_service_config').doc(svc.id);
    batch.set(ref, { ...svc, updatedAt: new Date().toISOString() });
  }
  await batch.commit();
  console.log(`✅ sly_service_config: ${services.length}개 서비스 저장 완료`);
}

async function main() {
  console.log('🚀 서류하나 Firestore DB 시딩 시작\n');
  try {
    await seedClausePatterns();
    await seedJobCategories();
    await seedLegalRefs();
    await seedServiceConfig();
    console.log('\n🎉 모든 DB 시딩 완료!');
    console.log('📌 다음 단계: _worker.js에 /api/seolyuhana/* 라우트 추가');
  } catch (err) {
    console.error('❌ 시딩 오류:', err.message);
    process.exit(1);
  }
}

main();
