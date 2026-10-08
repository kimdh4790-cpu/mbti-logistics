// 긴급 로그인 핸들러 패치 — 실행: node patch-filo-pins.js
const fs = require('fs');
let c = fs.readFileSync('filo-worker.js', 'utf8');

const START = `    // ── 긴급 PIN 로그인: POST /api/emergency-quick-login ──
    if (path === '/api/emergency-quick-login' && method === 'POST') {`;

if (!c.includes(START)) {
  console.error('ERROR: emergency-quick-login 핸들러를 찾을 수 없습니다');
  process.exit(1);
}

const startIdx = c.indexOf(START);
const afterStart = c.slice(startIdx);
// 다음 핸들러 주석 앞 빈줄까지 매칭
const endMarker = '\n\n    //';
const endIdx = afterStart.indexOf(endMarker);
if (endIdx === -1) {
  console.error('ERROR: 핸들러 끝을 찾을 수 없습니다');
  process.exit(1);
}

const NEW_HANDLER = `    // ── 긴급 로그인: POST /api/emergency-quick-login ──
    if (path === '/api/emergency-quick-login' && method === 'POST') {
      try {
        const body = await request.json();
        const { driverName } = body;
        if (!driverName) return new Response(JSON.stringify({ok:false,error:'이름을 입력하세요'}),{status:400,headers:{'Content-Type':'application/json'}});
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
      } catch(e) { return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}}); }
    }`;

const result = c.slice(0, startIdx) + NEW_HANDLER + c.slice(startIdx + endIdx);
fs.writeFileSync('filo-worker.js', result, 'utf8');
console.log('완료: PIN 검증 제거됨 — 이름만으로 로그인');
