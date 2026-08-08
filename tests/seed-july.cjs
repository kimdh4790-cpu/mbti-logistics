/**
 * 7월 테스트 데이터 시딩 스크립트
 * dealerId: 9XD2K3W1tIhIs6XM74YT0xfRFEP2 (mbti 매장)
 */
const https = require('https');

const DEALER_ID = '9XD2K3W1tIhIs6XM74YT0xfRFEP2';
const PROJECT = 'mbti-logistics';
const API_KEY = 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';
const EMAIL = 'soungkyekim@naver.com';
const PASSWORD = 'khw3103!!!';

function req(method, url, body, token) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search,
      method, headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://dine.ne.kr/',
        'Origin': 'https://dine.ne.kr',
      }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = https.request(opts, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try { res(JSON.parse(d)); } catch { res(d); }
      });
    });
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getToken() {
  const r = await req('POST',
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );
  if (!r.idToken) throw new Error('로그인 실패: ' + JSON.stringify(r));
  console.log('✅ Firebase 로그인 성공');
  return r.idToken;
}

function firestoreWrite(token, collection, docId, fields) {
  const url = docId
    ? `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${docId}`
    : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}`;
  const method = docId ? 'PATCH' : 'POST';
  const body = { fields };
  return req(method, url, body, token);
}

function fs(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fs) } };
  if (typeof v === 'object' && v !== null) {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = fs(v[k]);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function fsd(fields) {
  const out = {};
  for (const k of Object.keys(fields)) out[k] = fs(fields[k]);
  return out;
}

// 날짜 헬퍼
function julDate(day) { return `2026-07-${String(day).padStart(2,'0')}`; }
function julISO(day, h, m) {
  return `2026-07-${String(day).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+09:00`;
}

const MENUS = [
  { name: '삼겹살', price: 15000 },
  { name: '냉면', price: 12000 },
  { name: '된장찌개', price: 9000 },
  { name: '비빔밥', price: 10000 },
  { name: '소주', price: 5000 },
  { name: '맥주', price: 6000 },
];
const PAY_METHODS = ['card', 'cash', 'card', 'card'];
const TABLE_NAMES = ['1번', '2번', '3번', '4번', '5번'];

async function seedSales(token) {
  console.log('\n📊 filo_sales 7월 데이터 시딩...');
  let count = 0;
  // 7월 1~31일 중 영업일 25일, 하루 3~7건
  const days = Array.from({length: 25}, (_, i) => i + 1).filter(d => d <= 31);
  for (const day of days) {
    const numOrders = 3 + (day % 5);
    for (let o = 0; o < numOrders; o++) {
      const menu = MENUS[Math.floor(Math.random() * MENUS.length)];
      const qty = 1 + (o % 3);
      const total = menu.price * qty;
      const tableIdx = o % 5;
      const fields = fsd({
        dealerId: DEALER_ID,
        type: 'table',
        source: 'pos',
        items: [{ name: menu.name, price: menu.price, qty }],
        total,
        tableNum: String(tableIdx + 1),
        tableName: TABLE_NAMES[tableIdx],
        payMethod: PAY_METHODS[o % 4],
        payType: 'postpay',
        status: 'done',
        date: julDate(day),
        createdAt: julISO(day, 11 + o, o * 10),
        paidAt: julISO(day, 11 + o, o * 10 + 20),
      });
      const r = await firestoreWrite(token, 'filo_sales', null, fields);
      if (r.name) count++;
      else console.log('  오류:', JSON.stringify(r).slice(0, 100));
    }
  }
  console.log(`  ✅ filo_sales ${count}건 시딩 완료`);
}

let MEMBER_ID = '';

async function seedMember(token) {
  console.log('\n👤 members 직원 등록...');
  const fields = fsd({
    dealerId: DEALER_ID,
    name: '홍길동',
    phone: '010-1234-5678',
    role: 'staff',
    empType: 'part',
    part: 'hall',
    status: 'active',
    is_active: true,
    payType: 'hourly',
    hourlyWage: 10000,
    mealAllowance: 0,
    transportAllowance: 0,
    insuranceType: '없음',
    hireDate: '2026-06-01',
    platform: 'dine',
    createdAt: '2026-06-01T09:00:00+09:00',
  });
  const r = await firestoreWrite(token, 'members', null, fields);
  if (r.name) {
    MEMBER_ID = r.name.split('/').pop();
    console.log(`  ✅ members 홍길동 등록 (ID: ${MEMBER_ID})`);
  } else {
    console.log('  오류:', JSON.stringify(r).slice(0, 200));
  }
}

async function seedAttendance(token) {
  console.log('\n⏰ attendance 7월 출퇴근 시딩...');
  if (!MEMBER_ID) { console.log('  MEMBER_ID 없음, 스킵'); return; }
  let count = 0;
  const days = [1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29,30,31].filter(d=>d<=31);
  for (const day of days) {
    // 출근
    const inFields = fsd({
      dealerId: DEALER_ID,
      memberId: MEMBER_ID,
      type: 'in',
      date: julDate(day),
      time: julISO(day, 9, 0),
      method: '개인QR',
      recordedAt: julISO(day, 9, 0),
    });
    const r1 = await firestoreWrite(token, 'attendance', null, inFields);
    if (r1.name) count++;

    // 퇴근 (8시간 근무)
    const outFields = fsd({
      dealerId: DEALER_ID,
      memberId: MEMBER_ID,
      type: 'out',
      date: julDate(day),
      time: julISO(day, 17, 0),
      method: '개인QR',
      recordedAt: julISO(day, 17, 0),
    });
    const r2 = await firestoreWrite(token, 'attendance', null, outFields);
    if (r2.name) count++;
  }
  console.log(`  ✅ attendance ${count}건 (출근+퇴근) 시딩 완료`);
}

async function main() {
  console.log('=== MBTI 7월 테스트 데이터 시딩 시작 ===');
  const token = await getToken();
  await seedMember(token);
  await seedAttendance(token);
  await seedSales(token);
  console.log('\n=== 시딩 완료 ===');
  console.log('MEMBER_ID:', MEMBER_ID);
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
