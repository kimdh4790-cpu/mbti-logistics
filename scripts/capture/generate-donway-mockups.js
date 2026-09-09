#!/usr/bin/env node
/**
 * DONWAY 앱 화면 목업 스크린샷 생성 (720x1280 PNG)
 * Playwright로 HTML을 렌더링하여 Runway image-to-video 입력 이미지 생성
 * 출력: output/donway-mock-settle.png, donway-mock-excel.png, donway-mock-alimtalk.png
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '../../output');
fs.mkdirSync(OUT_DIR, { recursive: true });

function findChromium() {
  const candidates = [process.env.CHROMIUM_PATH];
  for (const c of candidates) { if (c && fs.existsSync(c)) return c; }
  try {
    const g = execSync('ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1').toString().trim();
    if (g) return g;
  } catch (_) {}
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
    try { const p = execSync(`which ${bin} 2>/dev/null`).toString().trim(); if (p) return p; } catch (_) {}
  }
  return undefined;
}

const SETTLE_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:720px;height:1280px;background:linear-gradient(180deg,#050c1a 0%,#08101f 55%,#0a1428 100%);font-family:'Noto Sans CJK KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#fff;overflow:hidden;position:relative}
.header{display:flex;align-items:center;padding:56px 36px 24px;border-bottom:1px solid rgba(201,168,76,.2)}
.logo{font-size:30px;font-weight:900;letter-spacing:-1px;color:#c9a84c}
.logo-sub{font-size:14px;color:rgba(255,255,255,.45);margin-left:10px;margin-top:5px}
.date-bar{padding:18px 36px;font-size:14px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:8px}
.dot{width:6px;height:6px;border-radius:50%;background:#2ecc71}
.total-card{margin:10px 28px;background:linear-gradient(135deg,rgba(201,168,76,.16),rgba(201,168,76,.05));border:1.5px solid rgba(201,168,76,.38);border-radius:22px;padding:32px 34px 28px}
.t-label{font-size:14px;color:rgba(255,255,255,.55);margin-bottom:6px}
.t-amount{font-size:54px;font-weight:900;color:#c9a84c;letter-spacing:-3px;line-height:1}
.t-meta{margin-top:14px;display:flex;gap:10px}
.chip{background:rgba(255,255,255,.08);border-radius:30px;padding:6px 14px;font-size:13px;color:rgba(255,255,255,.65)}
.sec{padding:22px 36px 8px;font-size:12px;font-weight:500;color:rgba(255,255,255,.4);letter-spacing:1.5px}
.row{display:flex;align-items:center;padding:16px 36px;border-bottom:1px solid rgba(255,255,255,.05)}
.av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#1a2a4a,#0d1a30);border:1.5px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#c9a84c;margin-right:14px;flex-shrink:0}
.nm{font-size:17px;font-weight:500;flex:1}
.cnt{font-size:12px;color:rgba(255,255,255,.38);margin-left:6px}
.amt{font-size:19px;font-weight:700;color:#fff}
.ck{width:22px;height:22px;background:#2ecc71;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-left:12px;font-size:12px;flex-shrink:0;color:#08101f;font-weight:900}
.bottom{position:absolute;bottom:0;left:0;right:0;padding:20px 28px 36px;background:linear-gradient(0deg,rgba(0,0,0,.8),transparent)}
.send-btn{background:linear-gradient(90deg,#c9a84c,#e8c96a);border-radius:16px;padding:20px;text-align:center;font-size:18px;font-weight:800;color:#08101f;letter-spacing:-.5px}
.badge-row{display:flex;justify-content:center;margin-top:10px;gap:12px}
.badge{font-size:13px;color:rgba(255,255,255,.4)}
</style></head><body>
<div class="header"><div class="logo">DONWAY</div><div class="logo-sub">배달대행 정산 시스템</div></div>
<div class="date-bar"><div class="dot"></div>2026년 09월 01일 ~ 09월 08일</div>
<div class="total-card">
  <div class="t-label">이번 주 총 정산금액</div>
  <div class="t-amount">₩8,347,200</div>
  <div class="t-meta">
    <div class="chip">👤 47명</div>
    <div class="chip">📦 847건</div>
    <div class="chip">✅ 완료</div>
  </div>
</div>
<div class="sec">드라이버 정산 내역</div>
<div class="row"><div class="av">김</div><div class="nm">김민준<span class="cnt"> 73건</span></div><div class="amt">₩347,500</div><div class="ck">✓</div></div>
<div class="row"><div class="av">이</div><div class="nm">이서연<span class="cnt"> 61건</span></div><div class="amt">₩289,200</div><div class="ck">✓</div></div>
<div class="row"><div class="av">박</div><div class="nm">박지훈<span class="cnt"> 89건</span></div><div class="amt">₩412,800</div><div class="ck">✓</div></div>
<div class="row"><div class="av">최</div><div class="nm">최현우<span class="cnt"> 42건</span></div><div class="amt">₩198,300</div><div class="ck">✓</div></div>
<div class="row"><div class="av">정</div><div class="nm">정수빈<span class="cnt"> 55건</span></div><div class="amt">₩256,100</div><div class="ck">✓</div></div>
<div class="bottom">
  <div class="send-btn">📲 카카오 알림톡 일괄 발송</div>
  <div class="badge-row"><span class="badge">47명에게 자동 발송 · 엑셀 업로드 한 번으로 완료</span></div>
</div>
</body></html>`;

const EXCEL_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:720px;height:1280px;background:#08101f;font-family:'Noto Sans CJK KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#fff;overflow:hidden;position:relative}
.header{padding:56px 36px 24px;border-bottom:1px solid rgba(201,168,76,.2)}
.logo{font-size:30px;font-weight:900;color:#c9a84c;letter-spacing:-1px}
.logo-sub{font-size:13px;color:rgba(255,255,255,.45);margin-top:4px}
.step-row{display:flex;align-items:center;padding:28px 36px;gap:0}
.step{display:flex;flex-direction:column;align-items:center;flex:1}
.step-circle{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;border:2px solid}
.step-label{font-size:12px;margin-top:6px;color:rgba(255,255,255,.55);text-align:center}
.step-line{flex:1;height:2px;background:rgba(201,168,76,.3);margin-top:-28px}
.done{border-color:#2ecc71;background:rgba(46,204,113,.15);color:#2ecc71}
.active{border-color:#c9a84c;background:rgba(201,168,76,.18);color:#c9a84c}
.upload-box{margin:20px 28px;background:rgba(201,168,76,.06);border:2px dashed rgba(201,168,76,.35);border-radius:20px;padding:32px;text-align:center}
.xls-icon{font-size:56px;margin-bottom:12px}
.upload-title{font-size:18px;font-weight:700;color:#c9a84c;margin-bottom:6px}
.upload-sub{font-size:14px;color:rgba(255,255,255,.5)}
.progress-card{margin:12px 28px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px 28px}
.prog-label{display:flex;justify-content:space-between;font-size:14px;margin-bottom:12px}
.prog-bar{height:8px;background:rgba(255,255,255,.08);border-radius:8px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,#c9a84c,#2ecc71);border-radius:8px;width:100%}
.result-grid{margin:12px 28px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.res-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px}
.res-n{font-size:28px;font-weight:900;color:#c9a84c}
.res-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:4px}
.log-box{margin:0 28px;background:rgba(0,0,0,.3);border-radius:14px;padding:16px 20px;font-size:13px;color:rgba(255,255,255,.5);font-family:monospace;line-height:1.8}
.log-ok{color:#2ecc71}
.bottom{position:absolute;bottom:0;left:0;right:0;padding:20px 28px 36px}
.next-btn{background:linear-gradient(90deg,#c9a84c,#e8c96a);border-radius:16px;padding:20px;text-align:center;font-size:18px;font-weight:800;color:#08101f}
</style></head><body>
<div class="header"><div class="logo">DONWAY</div><div class="logo-sub">엑셀 업로드 정산</div></div>
<div class="step-row">
  <div class="step"><div class="step-circle done">1</div><div class="step-label">파일 선택</div></div>
  <div class="step-line"></div>
  <div class="step"><div class="step-circle done">2</div><div class="step-label">데이터 분석</div></div>
  <div class="step-line"></div>
  <div class="step"><div class="step-circle active">3</div><div class="step-label">정산 완료</div></div>
</div>
<div class="upload-box">
  <div class="xls-icon">📊</div>
  <div class="upload-title">배송완료_20260908.xlsx</div>
  <div class="upload-sub">847행 · 12열 · 자동 분석 완료</div>
</div>
<div class="progress-card">
  <div class="prog-label"><span>정산 처리 중</span><span style="color:#2ecc71">100%</span></div>
  <div class="prog-bar"><div class="prog-fill"></div></div>
</div>
<div class="result-grid">
  <div class="res-card"><div class="res-n">847건</div><div class="res-l">총 처리 건수</div></div>
  <div class="res-card"><div class="res-n">47명</div><div class="res-l">드라이버 수</div></div>
  <div class="res-card"><div class="res-n">₩8.3M</div><div class="res-l">총 정산금액</div></div>
  <div class="res-card"><div class="res-n">0건</div><div class="res-l">오류 항목</div></div>
</div>
<div class="log-box">
  <div class="log-ok">✓ 드라이버 매핑 완료 (47/47명)</div>
  <div class="log-ok">✓ 단가 계산 완료 (건당 자동 적용)</div>
  <div class="log-ok">✓ 알림톡 발송 준비 완료</div>
</div>
<div class="bottom"><div class="next-btn">📲 알림톡 일괄 발송하기</div></div>
</body></html>`;

const ALIMTALK_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:720px;height:1280px;background:#08101f;font-family:'Noto Sans CJK KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#fff;overflow:hidden;position:relative}
.header{padding:56px 36px 24px;border-bottom:1px solid rgba(201,168,76,.2)}
.logo{font-size:30px;font-weight:900;color:#c9a84c;letter-spacing:-1px}
.logo-sub{font-size:13px;color:rgba(255,255,255,.45);margin-top:4px}
.send-stat{margin:20px 28px;display:flex;gap:12px}
.stat-card{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;text-align:center}
.stat-n{font-size:32px;font-weight:900;color:#c9a84c}
.stat-l{font-size:13px;color:rgba(255,255,255,.5);margin-top:4px}
.stat-card.green .stat-n{color:#2ecc71}
.preview-label{padding:8px 36px;font-size:12px;color:rgba(255,255,255,.4);letter-spacing:1px}
.kakao-wrap{margin:0 28px;background:#b5b5b5;border-radius:20px;overflow:hidden}
.kk-header{background:#f9e000;padding:18px 20px;display:flex;align-items:center;gap:10px}
.kk-logo{width:32px;height:32px;background:#3e1d1d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#f9e000}
.kk-title{font-size:16px;font-weight:700;color:#3e1d1d}
.kk-body{background:#fff;padding:20px}
.msg-card{background:#f5f5f5;border-radius:12px;padding:16px;margin-bottom:12px}
.msg-title{font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e0e0e0}
.msg-row{display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px}
.msg-row.total{color:#1a1a1a;font-weight:700;font-size:15px;padding-top:8px;border-top:1px solid #e0e0e0}
.msg-btn{background:#f9e000;border-radius:8px;padding:12px;text-align:center;font-size:14px;font-weight:700;color:#3e1d1d;margin-top:10px}
.kk-footer{background:#e8e8e8;padding:10px 20px;font-size:11px;color:#888;text-align:center}
.list-box{margin:14px 28px}
.list-row{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.l-dot{width:8px;height:8px;border-radius:50%;background:#2ecc71;margin-right:14px;flex-shrink:0}
.l-name{font-size:16px;flex:1}
.l-amt{font-size:16px;font-weight:700;color:#c9a84c}
.l-time{font-size:12px;color:rgba(255,255,255,.35);margin-left:10px}
</style></head><body>
<div class="header"><div class="logo">DONWAY</div><div class="logo-sub">카카오 알림톡 발송 현황</div></div>
<div class="send-stat">
  <div class="stat-card green"><div class="stat-n">47</div><div class="stat-l">발송 완료</div></div>
  <div class="stat-card"><div class="stat-n">0</div><div class="stat-l">실패</div></div>
  <div class="stat-card"><div class="stat-n">2.1s</div><div class="stat-l">평균 도달</div></div>
</div>
<div class="preview-label">알림톡 미리보기</div>
<div class="kakao-wrap">
  <div class="kk-header"><div class="kk-logo">D</div><div class="kk-title">DONWAY 정산 알림</div></div>
  <div class="kk-body">
    <div class="msg-card">
      <div class="msg-title">✅ 정산이 완료되었습니다</div>
      <div class="msg-row"><span>수신자</span><span>김민준 기사님</span></div>
      <div class="msg-row"><span>정산 기간</span><span>09.01 ~ 09.08</span></div>
      <div class="msg-row"><span>처리 건수</span><span>73건</span></div>
      <div class="msg-row total"><span>정산 금액</span><span>₩347,500</span></div>
      <div class="msg-btn">정산 내역 확인하기</div>
    </div>
  </div>
  <div class="kk-footer">DONWAY · 배달대행 정산 자동화</div>
</div>
<div class="list-box">
  <div class="list-row"><div class="l-dot"></div><div class="l-name">김민준</div><div class="l-amt">₩347,500</div><div class="l-time">방금 전</div></div>
  <div class="list-row"><div class="l-dot"></div><div class="l-name">이서연</div><div class="l-amt">₩289,200</div><div class="l-time">방금 전</div></div>
  <div class="list-row"><div class="l-dot"></div><div class="l-name">박지훈</div><div class="l-amt">₩412,800</div><div class="l-time">방금 전</div></div>
</div>
</body></html>`;

const SCREENS = [
  { name: 'donway-mock-settle', html: SETTLE_HTML },
  { name: 'donway-mock-excel',  html: EXCEL_HTML  },
  { name: 'donway-mock-alimtalk', html: ALIMTALK_HTML },
];

(async () => {
  const chromiumPath = findChromium();
  console.log('[Mockup] Playwright 브라우저:', chromiumPath || '(자동감지)');

  const browser = await chromium.launch({
    executablePath: chromiumPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 720, height: 1280 } });

  for (const screen of SCREENS) {
    const page = await context.newPage();
    await page.setContent(screen.html, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const outPath = path.join(OUT_DIR, `${screen.name}.png`);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 720, height: 1280 } });
    console.log(`[Mockup] 저장: ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log('[Mockup] 완료!');
})().catch(e => {
  console.error('[Mockup] 오류:', e.message);
  process.exit(1);
});
