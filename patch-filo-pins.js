// 긴급 로그인 핸들러 패치 — 실행: node patch-filo-pins.js
const fs = require('fs');
let c = fs.readFileSync('filo-worker.js', 'utf8');

// if 라인만으로 핸들러 위치 검색
const IF_LINE = "if (path === '/api/emergency-quick-login' && method === 'POST') {";
const ifIdx = c.indexOf(IF_LINE);
if (ifIdx === -1) {
  console.error('ERROR: emergency-quick-login 핸들러를 찾을 수 없습니다');
  process.exit(1);
}

// if 라인 / 앞 주석 라인 시작 위치
const lineStart = c.lastIndexOf('\n', ifIdx) + 1;
const prevLineStart = c.lastIndexOf('\n', lineStart - 2) + 1;
const prevLine = c.slice(prevLineStart, lineStart - 1);
const startPos = prevLine.trim().startsWith('//') ? prevLineStart : lineStart;

// 중괄호 카운팅으로 if 블록 끝 탐색
let depth = 0;
let handlerEnd = -1;
for (let i = ifIdx; i < c.length; i++) {
  if (c[i] === '{') depth++;
  else if (c[i] === '}') {
    depth--;
    if (depth === 0) { handlerEnd = i + 1; break; }
  }
}
if (handlerEnd === -1) {
  console.error('ERROR: 핸들러 닫힘 괄호를 찾을 수 없습니다');
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

const result = c.slice(0, startPos) + NEW_HANDLER + c.slice(handlerEnd);
fs.writeFileSync('filo-worker.js', result, 'utf8');
console.log('완료: PIN 검증 제거됨 — 이름만으로 로그인');
