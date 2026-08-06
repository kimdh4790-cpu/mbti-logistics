const YONGCHA_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#111827">
<title>용차 — 택배 노선 매칭</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<style>
:root{
  --bg:#f4f6fb;--bg2:#fff;--bg3:#eef1f8;--bd:#e2e6f0;
  --tx:#111827;--t2:#6b7280;--t3:#9ca3af;
  --ac:#4f46e5;--acl:rgba(79,70,229,.08);--ach:rgba(79,70,229,.18);
  --gn:#059669;--gnl:rgba(5,150,105,.08);
  --rd:#dc2626;--rdl:rgba(220,38,38,.08);
  --yw:#d97706;
  --cj:#e63946;--cjl:rgba(230,57,70,.12);
  --hj:#1a6fa4;--hjl:rgba(26,111,164,.12);
  --lt:#e07b2a;--ltl:rgba(224,123,42,.12);
  --up:#0e9f8a;--upl:rgba(14,159,138,.12);
  --cp:#ff5c1a;--cpl:rgba(255,92,26,.12);
  --rz:#7c3aed;--rzl:rgba(124,58,237,.12);
  --r:14px;--r2:20px;
  --sh:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06);
  --sh2:0 4px 12px rgba(0,0,0,.1),0 12px 40px rgba(0,0,0,.1);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--tx);overflow:hidden}

/* ── Loading ── */
#ld{position:fixed;inset:0;background:linear-gradient(145deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:16px}
.ld-logo{font-size:40px;font-weight:900;color:#fff;letter-spacing:-1px}
.ld-logo span{color:#a5b4fc}
.ld-sub{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.3px}
.spinner{width:22px;height:22px;border:2.5px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Login ── */
#login-screen{position:fixed;inset:0;background:linear-gradient(160deg,#f0f4ff,#e8eeff);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
.login-card{background:#fff;border-radius:24px;padding:36px 28px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(79,70,229,.13),0 2px 8px rgba(0,0,0,.06)}
.login-mark{width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#4f46e5,#818cf8);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 8px 24px rgba(79,70,229,.35)}
.login-mark svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:2}
.login-name{font-size:24px;font-weight:900;text-align:center;letter-spacing:-.5px;color:#111827;margin-bottom:4px}
.login-sub{font-size:13px;color:var(--t2);text-align:center;margin-bottom:28px}
.tabs{display:flex;background:#f3f4f6;border-radius:12px;padding:4px;margin-bottom:24px;gap:3px}
.tab{flex:1;padding:10px;border-radius:9px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.tab.on{background:#fff;color:var(--ac);box-shadow:0 2px 8px rgba(0,0,0,.1)}
.type-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.type-card{border:2px solid #e5e7eb;border-radius:var(--r);padding:16px 12px;text-align:center;cursor:pointer;transition:.2s;background:#fafafa}
.type-card.on{border-color:var(--ac);background:#eef2ff}
.type-ico{margin-bottom:8px}
.type-lbl{font-size:13px;font-weight:800;color:var(--tx)}
.type-desc{font-size:11px;color:var(--t2);margin-top:2px}
.inp-wrap{margin-bottom:14px}
.inp-lbl{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:6px;display:block}
.inp{width:100%;padding:12px 14px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:var(--r);color:var(--tx);font-size:14px;outline:none;font-family:inherit;transition:.2s}
.inp:focus{border-color:var(--ac);background:#eef2ff;box-shadow:0 0 0 3px rgba(79,70,229,.1)}
.inp::placeholder{color:#d1d5db}
select.inp{cursor:pointer;-webkit-appearance:none;appearance:none}
select.inp option{background:#fff;color:var(--tx)}
textarea.inp{resize:vertical;min-height:80px}
.err{color:var(--rd);font-size:12px;margin-bottom:10px;display:none;padding:8px 12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca}
.btn-main{width:100%;padding:15px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;margin-top:4px;box-shadow:0 4px 16px rgba(79,70,229,.3)}
.btn-main:active{filter:brightness(.92);transform:translateY(1px)}
.btn-main:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}

/* ── App shell ── */
#app{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg)}
.app-hdr{background:linear-gradient(135deg,#1e1b4b,#312e81);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 2px 12px rgba(49,46,129,.35)}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-logo{font-size:20px;font-weight:900;letter-spacing:-.5px;color:#fff}
.hdr-logo span{color:#a5b4fc}
.hdr-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.badge-admin{background:rgba(167,139,250,.2);color:#a78bfa}
.badge-agency{background:rgba(165,180,252,.2);color:#a5b4fc}
.badge-driver{background:rgba(110,231,183,.2);color:#6ee7b7}
.hdr-right{display:flex;align-items:center;gap:8px}
.hdr-btn{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.8);cursor:pointer;display:flex;align-items:center;justify-content:center}
.hdr-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
.logout-btn{font-size:11px;color:rgba(255,255,255,.5);background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 8px}
#content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 80px;position:relative}
#content.page-map{overflow:hidden;padding:0}
.bnav{background:#fff;border-top:1px solid var(--bd);display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom);flex-shrink:0}
.nb{flex:1;padding:10px 4px 8px;border:none;background:none;color:#9ca3af;font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .15s;font-family:inherit}
.nb.on{color:var(--ac)}
.nb svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8}
.nb.on svg{stroke-width:2.2}

/* ── Cards ── */
.card{background:#fff;border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:10px;box-shadow:var(--sh)}
.page-title{font-size:20px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px;color:var(--tx)}
.page-sub{font-size:12px;color:var(--t2);margin-bottom:16px}
.section-lbl{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin:16px 0 10px}

/* ── Post card ── */
.pcard{background:#fff;border:1px solid var(--bd);border-left:4px solid #e2e6f0;border-radius:var(--r);padding:14px 14px 12px 16px;margin-bottom:8px;cursor:pointer;transition:.18s;box-shadow:var(--sh)}
.pcard:active{transform:scale(.99)}
.pcard:hover{box-shadow:var(--sh2)}
.pcard.closed{opacity:.5;cursor:default}
.pcard--cj{border-left-color:var(--cj)!important}
.pcard--hj{border-left-color:var(--hj)!important}
.pcard--lt{border-left-color:var(--lt)!important}
.pcard--up{border-left-color:var(--up)!important}
.pcard--cp{border-left-color:var(--cp)!important}
.pcard--rz{border-left-color:var(--rz)!important}
.pc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px}
.pc-courier{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;margin-bottom:5px}
.pc-area{font-size:17px;font-weight:900;letter-spacing:-.4px;margin-bottom:5px;color:var(--tx)}
.pc-status{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;flex-shrink:0;margin-top:1px}
.st-open{background:#ecfdf5;color:var(--gn)}
.st-closed{background:#fef2f2;color:var(--rd)}
.st-matched{background:#eef2ff;color:var(--ac)}
.pc-earn{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
.pc-price{font-size:21px;font-weight:900;letter-spacing:-.5px;color:var(--tx)}
.pc-unit{font-size:11px;font-weight:500;color:var(--t2)}
.riq-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px}
.riq-up{background:#ecfdf5;color:var(--gn)}
.riq-down{background:#fef2f2;color:var(--rd)}
.riq-flat{background:#eef2ff;color:var(--ac)}
.pc-minguar{font-size:11px;color:var(--t2);margin-bottom:8px}
.pc-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:#f3f4f6;color:var(--t2)}
.pc-foot{display:flex;align-items:center;justify-content:space-between}
.pc-agency{font-size:11px;color:var(--t2)}
.quick-apply{display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 10px rgba(79,70,229,.35)}
.quick-apply svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5}
.quick-apply:active{filter:brightness(.88)}

/* ── Pagination ── */
.pg-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:4px 0}
.pg-btn{padding:7px 18px;border-radius:10px;border:1.5px solid var(--bd);background:#fff;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.pg-btn:hover:not(:disabled){border-color:var(--ac);color:var(--ac)}
.pg-btn:disabled{opacity:.3;cursor:not-allowed}
.pg-info{font-size:12px;color:var(--t2);font-weight:600}

/* ── Map-first posts ── */
#map-full{position:absolute;inset:0;z-index:1}
#map-overlay-top{position:absolute;top:0;left:0;right:0;z-index:10;padding:10px 12px 0;pointer-events:none}
#plat-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;pointer-events:all;padding-bottom:4px}
#plat-tabs::-webkit-scrollbar{display:none}
.plat-tab{flex-shrink:0;padding:7px 16px;border-radius:20px;border:none;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);color:#374151;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 10px rgba(0,0,0,.18);transition:.15s;white-space:nowrap}
.plat-tab.on{background:var(--ac);color:#fff;box-shadow:0 2px 10px rgba(79,70,229,.4)}
#map-post-count{display:inline-flex;align-items:center;gap:5px;background:rgba(17,24,39,.82);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;margin-top:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none}
#map-post-count svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}

/* Bottom sheet */
#bsheet{position:absolute;bottom:0;left:0;right:0;z-index:20;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -4px 30px rgba(0,0,0,.15);transition:transform .28s cubic-bezier(.4,0,.2,1)}
#bsheet.collapsed{transform:translateY(calc(100% - 68px))}
#bsheet-handle{display:flex;flex-direction:column;align-items:center;padding:10px 16px 8px;cursor:pointer;gap:6px;user-select:none}
#bsheet-handle-bar{width:36px;height:4px;background:#d1d5db;border-radius:2px}
#bsheet-handle-info{display:flex;align-items:center;justify-content:space-between;width:100%}
#bsheet-title{font-size:14px;font-weight:800;color:var(--tx)}
#bsheet-chevron{width:20px;height:20px;transition:transform .28s}
#bsheet-chevron.up{transform:rotate(180deg)}
#bsheet-list{overflow-y:auto;max-height:50vh;padding:0 12px 16px}

/* ── AI Coach card ── */
.ai-card{background:linear-gradient(140deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%);border-radius:var(--r2);padding:20px;margin-bottom:14px;box-shadow:0 8px 32px rgba(79,70,229,.25)}
.ai-hdr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.ai-icon{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(255,255,255,.18)}
.ai-icon svg{width:22px;height:22px;stroke:#c7d2fe;fill:none;stroke-width:2}
.ai-title{font-size:15px;font-weight:800;color:#fff}
.ai-sub-txt{font-size:11px;color:rgba(255,255,255,.55)}
.ai-body{font-size:13px;color:rgba(255,255,255,.82);line-height:1.65;margin-bottom:12px;min-height:40px}
.ai-highlight{background:rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;color:#a5b4fc;margin-bottom:12px;border:1px solid rgba(255,255,255,.12)}
.ai-est{display:flex;align-items:center;justify-content:space-between;padding:12px 0 0;border-top:1px solid rgba(255,255,255,.12)}
.ai-est-lbl{font-size:11px;color:rgba(255,255,255,.5)}
.ai-est-val{font-size:24px;font-weight:900;color:#6ee7b7;letter-spacing:-.5px}
.ai-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:var(--r);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px;backdrop-filter:blur(4px);transition:.15s}
.ai-btn:hover{background:rgba(255,255,255,.2)}
.ai-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2}
.ai-typing::after{content:'▍';animation:blink .8s step-end infinite;color:#a5b4fc;font-size:12px}
@keyframes blink{50%{opacity:0}}

/* ── Revenue Simulator ── */
.revsim-hero{background:linear-gradient(140deg,#1e1b4b,#312e81);border-radius:var(--r2);padding:22px;margin-bottom:14px;box-shadow:0 8px 32px rgba(79,70,229,.2)}
.revsim-result{font-size:46px;font-weight:900;color:#6ee7b7;letter-spacing:-2px;margin:6px 0 4px;line-height:1}
.revsim-breakdown{background:#fff;border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:12px;box-shadow:var(--sh)}
.revsim-row{display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--bd)}
.revsim-row:last-child{border-bottom:none;font-weight:800;font-size:14px}
.sim-slider{width:100%;height:4px;border-radius:2px;appearance:none;-webkit-appearance:none;background:var(--bd);outline:none;margin:8px 0 4px;cursor:pointer}
.sim-slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--ac);box-shadow:0 2px 8px rgba(79,70,229,.4);cursor:pointer}
.sim-item{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid var(--bd);border-radius:var(--r);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:.2s}
.sim-item:hover{border-color:#c7d2fe}
.sim-item.sel{border-color:var(--ac);background:var(--acl)}
.sim-check{width:22px;height:22px;border-radius:7px;border:2px solid #d1d5db;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s}
.sim-item.sel .sim-check{background:var(--ac);border-color:var(--ac)}
.sim-check svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:3}

/* ── Stats ── */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.stat-card{background:#fff;border:1px solid var(--bd);border-radius:var(--r);padding:16px;box-shadow:var(--sh)}
.stat-val{font-size:26px;font-weight:900;letter-spacing:-.5px;margin-bottom:3px;color:var(--tx)}
.stat-lbl{font-size:11px;color:var(--t2);font-weight:500}

/* ── Misc ── */
.filter-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;margin-bottom:8px}
.filter-row::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:7px 16px;border-radius:20px;border:1.5px solid var(--bd);background:#fff;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.15s}
.chip.on{background:var(--ac);color:#fff;border-color:var(--ac)}
.empty{text-align:center;padding:52px 16px;color:var(--t2)}
.empty svg{width:44px;height:44px;stroke:#d1d5db;fill:none;stroke-width:1.5;display:block;margin:0 auto 14px}
.empty-title{font-size:15px;font-weight:700;margin-bottom:5px;color:#6b7280}
.empty-sub{font-size:12px;color:#9ca3af}
#modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:none;backdrop-filter:blur(2px)}
#modal-sheet{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:24px 24px 0 0;z-index:201;max-height:90vh;overflow-y:auto;padding:20px 20px 40px;display:none;box-shadow:0 -8px 40px rgba(0,0,0,.15)}
.modal-handle{width:40px;height:4px;background:#e5e7eb;border-radius:2px;margin:0 auto 18px}
.modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:10px;background:#f3f4f6;border:none;color:var(--t2);cursor:pointer;font-size:14px;font-family:inherit}
.modal-title{font-size:20px;font-weight:900;margin-bottom:14px;letter-spacing:-.4px;color:var(--tx)}
.modal-courier-bar{height:5px;border-radius:3px;margin-bottom:16px}
#toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#111827;border-radius:12px;padding:11px 20px;font-size:13px;font-weight:600;color:#fff;z-index:300;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:90vw;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.p-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd);font-size:13px}
.p-row:last-child{border-bottom:none}
.p-row-lbl{color:var(--t2)}
.p-row-val{font-weight:600}
</style>
</head>
<body>

<div id="ld">
  <div class="ld-logo">용<span>차</span></div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner"></div>
</div>

<div id="login-screen">
  <div class="login-card">
    <div class="login-mark"><svg viewBox="0 0 24 24"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차</div>
    <div class="login-sub">택배 노선 매칭 플랫폼</div>
    <div class="tabs">
      <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
      <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
    </div>
    <div id="form-login">
      <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일"></div>
      <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호" onkeydown="if(event.key==='Enter')_yLogin()"></div>
      <div class="err" id="l-err"></div>
      <button class="btn-main" id="l-btn" onclick="_yLogin()">로그인</button>
    </div>
    <div id="form-reg" style="display:none">
      <div class="type-row">
        <div class="type-card on" id="t-agency" onclick="_setType('agency')">
          <div class="type-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2H10a2 2 0 00-2 2v2"/></svg></div>
          <div class="type-lbl">대리점</div><div class="type-desc">공고 등록 · 기사 채용</div>
        </div>
        <div class="type-card" id="t-driver" onclick="_setType('driver')">
          <div class="type-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7878a0" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
          <div class="type-lbl">기사</div><div class="type-desc">노선 지원 · 매칭</div>
        </div>
      </div>
      <div class="inp-wrap"><label class="inp-lbl" id="r-name-lbl">대리점명</label><input class="inp" id="r-name" placeholder="상호명 입력"></div>
      <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="r-email" type="email" placeholder="이메일"></div>
      <div class="inp-wrap"><label class="inp-lbl">연락처</label><input class="inp" id="r-phone" type="tel" placeholder="010-0000-0000"></div>
      <div class="inp-wrap"><label class="inp-lbl">지역</label>
        <select class="inp" id="r-region"><option value="">지역 선택</option>
          <option>부산</option><option>대구</option><option>서울</option><option>경기</option>
          <option>인천</option><option>광주</option><option>대전</option><option>울산</option>
          <option>경남</option><option>경북</option><option>전남</option><option>전북</option>
          <option>충남</option><option>충북</option><option>강원</option><option>제주</option>
        </select>
      </div>
      <div class="inp-wrap"><label class="inp-lbl">비밀번호 (6자 이상)</label><input class="inp" id="r-pw" type="password" placeholder="비밀번호"></div>
      <div class="err" id="r-err"></div>
      <button class="btn-main" id="r-btn" onclick="_yRegister()">가입하기</button>
    </div>
  </div>
</div>

<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="hdr-btn" onclick="_goPage('notifications')" title="알림">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <nav class="bnav" id="bnav"></nav>
</div>

<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">&#x2715;</button>
  <div id="modal-body"></div>
</div>
<div id="toast"></div>

<script>
var _db,_auth,_CU=null,_regType='agency';
var _postsUnsub=null,_allPosts=[],_filteredPosts=[];
var _rgnFilter='전체',_platFilter='전체',_pgIdx=0,_pgSize=5;
var _revSimSel=[],_revSimPosts=[],_kakaoReady=false;
var _mapInst=null,_mapMarkers=[],_bsheetOpen=false;
var ADMINS=['kimdh4790@gmail.com','skypjh1101@naver.com'];
var API_KEY='AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';
var REGIONS=['전체','부산','대구','서울','경기','인천','광주','대전','울산','경남','경북','전남','전북','충남','충북','강원','제주'];
var PLATFORMS=['전체','바로고','화물인','화물24','센디'];
var REGION_COORDS={
  '부산':[35.1795,129.0756],'대구':[35.8714,128.6014],'서울':[37.5665,126.9780],
  '경기':[37.4138,127.5183],'인천':[37.4563,126.7052],'광주':[35.1595,126.8526],
  '대전':[36.3504,127.3845],'울산':[35.5384,129.3114],'경남':[35.4606,128.2132],
  '경북':[36.4919,128.8889],'전남':[34.8679,126.9910],'전북':[35.7175,127.1530],
  '충남':[36.5184,126.8000],'충북':[36.6357,127.4917],'강원':[37.8228,128.1555],'제주':[33.4996,126.5312]
};
var MKT={'CJ대한통운':880,'한진택배':855,'롯데택배':860,'우체국':900,'쿠팡로지스틱스':960,'로젠택배':840};

firebase.initializeApp({
  apiKey:API_KEY,authDomain:'mbti-logistics.firebaseapp.com',projectId:'mbti-logistics',
  storageBucket:'mbti-logistics.appspot.com',messagingSenderId:'40761160761',
  appId:'1:40761160761:web:20545b610f03f534e949e8'
});
_db=firebase.firestore();
_auth=firebase.auth();

fetch('/api/kakao-config').then(function(r){return r.json();}).then(function(cfg){
  if(!cfg.key)return;
  var s=document.createElement('script');
  s.src='//dapi.kakao.com/v2/maps/sdk.js?appkey='+cfg.key+'&libraries=clusterer&autoload=false';
  s.onload=function(){kakao.maps.load(function(){_kakaoReady=true;if(_curPage==='posts')_initMap();});};
  document.head.appendChild(s);
}).catch(function(){});

var _ldTimer=setTimeout(function(){
  document.getElementById('ld').style.display='none';
  document.getElementById('login-screen').style.display='flex';
},3000);

_auth.onAuthStateChanged(function(u){
  clearTimeout(_ldTimer);
  document.getElementById('ld').style.display='none';
  if(u){
    _db.collection('yongcha_users').doc(u.uid).get().then(function(snap){
      if(snap.exists){_CU=Object.assign({uid:u.uid},snap.data());_showApp();}
      else if(ADMINS.indexOf(u.email||'')>=0){
        var doc={uid:u.uid,type:'admin',name:'관리자',email:u.email,phone:'051-711-3103',region:'부산',rating:5,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        _db.collection('yongcha_users').doc(u.uid).set(doc).then(function(){_CU=Object.assign({uid:u.uid},doc);_showApp();});
      } else{_showLogin();}
    }).catch(function(){_showLogin();});
  } else{_showLogin();}
});

function _showLogin(){document.getElementById('login-screen').style.display='flex';document.getElementById('app').style.display='none';}
function _yTab(t){
  document.getElementById('tab-login').classList.toggle('on',t==='login');
  document.getElementById('tab-reg').classList.toggle('on',t==='reg');
  document.getElementById('form-login').style.display=t==='login'?'block':'none';
  document.getElementById('form-reg').style.display=t==='reg'?'block':'none';
}
function _setType(t){
  _regType=t;
  document.getElementById('t-agency').classList.toggle('on',t==='agency');
  document.getElementById('t-driver').classList.toggle('on',t==='driver');
  document.getElementById('r-name-lbl').textContent=t==='agency'?'대리점명':'이름';
  document.getElementById('r-name').placeholder=t==='agency'?'상호명 입력':'이름 입력';
}
function _yLogin(){
  var e=(document.getElementById('l-email').value||'').trim();
  var p=(document.getElementById('l-pw').value||'').trim();
  var err=document.getElementById('l-err'),btn=document.getElementById('l-btn');
  if(!e||!p){err.textContent='이메일과 비밀번호를 입력하세요';err.style.display='block';return;}
  err.style.display='none';btn.textContent='로그인 중...';btn.disabled=true;
  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+API_KEY,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:e,password:p,returnSecureToken:true})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error){
      btn.textContent='로그인';btn.disabled=false;
      var c=data.error.message||'';
      err.textContent=c.includes('WRONG_PASSWORD')||c.includes('INVALID_LOGIN')?'비밀번호가 틀렸어요':c.includes('EMAIL_NOT_FOUND')?'없는 계정이에요':c.includes('TOO_MANY')?'잠시 후 다시 시도하세요':'오류: '+c;
      err.style.display='block';return;
    }
    var uid=data.localId,email=data.email||'';
    _db.collection('yongcha_users').doc(uid).get().then(function(snap){
      if(snap.exists){_CU=Object.assign({uid:uid},snap.data());_showApp();}
      else if(ADMINS.indexOf(email)>=0){
        var doc={uid:uid,type:'admin',name:'관리자',email:email,phone:'051-711-3103',region:'부산',rating:5,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        _db.collection('yongcha_users').doc(uid).set(doc).then(function(){_CU=Object.assign({uid:uid},doc);_showApp();});
      } else{btn.textContent='로그인';btn.disabled=false;err.textContent='용차 계정이 없어요. 회원가입 해주세요';err.style.display='block';}
    });
  }).catch(function(){btn.textContent='로그인';btn.disabled=false;err.textContent='네트워크 오류';err.style.display='block';});
}
function _yRegister(){
  var n=(document.getElementById('r-name').value||'').trim();
  var e=(document.getElementById('r-email').value||'').trim();
  var ph=(document.getElementById('r-phone').value||'').trim();
  var rg=(document.getElementById('r-region').value||'').trim();
  var p=(document.getElementById('r-pw').value||'').trim();
  var err=document.getElementById('r-err'),btn=document.getElementById('r-btn');
  if(!n||!e||!ph||!rg||!p){err.textContent='모든 항목을 입력하세요';err.style.display='block';return;}
  if(p.length<6){err.textContent='비밀번호는 6자 이상';err.style.display='block';return;}
  err.style.display='none';btn.textContent='가입 중...';btn.disabled=true;
  _auth.createUserWithEmailAndPassword(e,p).then(function(c){
    return _db.collection('yongcha_users').doc(c.user.uid).set({
      uid:c.user.uid,type:_regType,name:n,email:e,phone:ph,region:rg,
      rating:0,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(function(ex){
    btn.textContent='가입하기';btn.disabled=false;
    err.textContent=ex.code==='auth/email-already-in-use'?'이미 사용 중인 이메일':'오류: '+ex.message;
    err.style.display='block';
  });
}
function _yLogout(){_auth.signOut().then(function(){_CU=null;_showLogin();});}

function _showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  var t=_CU.type,b=document.getElementById('hdr-badge');
  b.textContent=t==='admin'?'관리자':t==='agency'?'대리점':'기사';
  b.className='hdr-badge '+(t==='admin'?'badge-admin':t==='agency'?'badge-agency':'badge-driver');
  _buildNav();_goPage(_curPage||'home'); // ponytail: preserve page on token-refresh re-auth
}

var _SVG={
  home:'<svg viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><rect x="2" y="11" width="4" height="11" rx="1"/><rect x="9" y="6" width="4" height="16" rx="1"/><rect x="16" y="2" width="4" height="20" rx="1"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 11c1.7 0 3 1.3 3 3m3 6c0-2.8-2.7-5-6-5"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  brain:'<svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 007 4.5v.5a5 5 0 000 10v2.5A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5V15a5 5 0 000-10V4.5A2.5 2.5 0 0014.5 2z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>',
  map:'<svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  check:'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  list:'<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  chevron:'<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>'
};

function _buildNav(){
  var t=_CU.type,tabs;
  if(t==='driver'){
    tabs=[{ico:'home',lbl:'홈',p:'home'},{ico:'map',lbl:'지도공고',p:'posts'},
          {ico:'chart',lbl:'수익계산',p:'revsim'},{ico:'pin',lbl:'지원현황',p:'my_applies'},
          {ico:'user',lbl:'내정보',p:'profile'}];
  } else if(t==='agency'){
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'list',lbl:'공고목록',p:'my_posts'},
          {ico:'plus',lbl:'공고등록',p:'add_post'},{ico:'users',lbl:'기사목록',p:'drivers'},
          {ico:'user',lbl:'내정보',p:'profile'}];
  } else{
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'truck',lbl:'공고관리',p:'admin_posts'},
          {ico:'users',lbl:'사용자',p:'admin_users'},{ico:'user',lbl:'내정보',p:'profile'}];
  }
  document.getElementById('bnav').innerHTML=tabs.map(function(tb){
    return '<button class="nb" id="bnav-'+tb.p+'" onclick="_goPage(\''+tb.p+'\')">'+_SVG[tb.ico]+'<span>'+tb.lbl+'</span></button>';
  }).join('');
}

var _curPage='';
function _goPage(p){
  if(_postsUnsub&&p!=='posts'){_postsUnsub();_postsUnsub=null;}
  _curPage=p;
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var btn=document.getElementById('bnav-'+p);if(btn)btn.classList.add('on');
  var el=document.getElementById('content');
  el.scrollTop=0;
  el.classList.remove('page-map');
  if(p==='posts'){el.classList.add('page-map');}
  if(p==='home')_pgHome(el);
  else if(p==='posts')_pgPosts(el);
  else if(p==='revsim')_pgRevSim(el);
  else if(p==='my_applies')_pgMyApplies(el);
  else if(p==='profile')_pgProfile(el);
  else if(p==='my_posts')_pgMyPosts(el);
  else if(p==='add_post')_pgAddPost(el);
  else if(p==='drivers')_pgDrivers(el);
  else if(p==='admin_posts')_pgAdminPosts(el);
  else if(p==='admin_users')_pgAdminUsers(el);
  else el.innerHTML='<div class="empty"><div class="empty-title">준비 중</div></div>';
}

function _yToast(msg,dur){
  var t=document.getElementById('toast');t.textContent=msg;t.style.opacity='1';
  setTimeout(function(){t.style.opacity='0';},dur||2400);
}
function _showModal(html){
  document.getElementById('modal-body').innerHTML=html;
  document.getElementById('modal-overlay').style.display='block';
  document.getElementById('modal-sheet').style.display='block';
}
function _closeModal(){
  document.getElementById('modal-overlay').style.display='none';
  document.getElementById('modal-sheet').style.display='none';
}
function _fmt(n){return(n||0).toLocaleString();}
function _timeAgo(ts){
  if(!ts)return '';
  var d=ts.toDate?ts.toDate():new Date(ts);
  var s=Math.floor((Date.now()-d.getTime())/1000);
  if(s<60)return '방금';if(s<3600)return Math.floor(s/60)+'분 전';
  if(s<86400)return Math.floor(s/3600)+'시간 전';return Math.floor(s/86400)+'일 전';
}
function _courierColor(c){
  var m={'CJ대한통운':'#e63946','한진택배':'#1a6fa4','롯데택배':'#e07b2a','우체국':'#0e9f8a','쿠팡로지스틱스':'#ff5c1a','로젠택배':'#7c3aed'};
  return m[c]||'#4f46e5';
}
function _courierCls(c){
  if(!c)return '';
  if(c.indexOf('CJ')>=0)return '--cj';
  if(c.indexOf('한진')>=0)return '--hj';
  if(c.indexOf('롯데')>=0)return '--lt';
  if(c.indexOf('우체국')>=0)return '--up';
  if(c.indexOf('쿠팡')>=0)return '--cp';
  if(c.indexOf('로젠')>=0)return '--rz';
  return '';
}
function _rateVsMarket(price,courier){
  var avg=MKT[courier]||880;
  return Math.round((price-avg)/avg*100);
}
function _postCoords(d){
  var base=REGION_COORDS[d.region]||[35.1795,129.0756];
  if(d.lat&&d.lng)return [d.lat,d.lng];
  // slight jitter per post id so same-region markers don't stack
  var seed=d.id?d.id.charCodeAt(0)/1000:0;
  return [base[0]+(seed%0.05)-0.025, base[1]+(seed%0.04)-0.02];
}

// ── Post card ─────────────────────────────────────────────────
function _makePostCard(d,compact){
  var isClosed=d.status==='closed',isMatched=d.status==='matched';
  var cls=_courierCls(d.courier||'');
  var rp=_rateVsMarket(d.unitPrice||0,d.courier);
  var rpCls=rp>3?'riq-up':rp<-3?'riq-down':'riq-flat';
  var rpTxt=(rp>0?'+':'')+rp+'%';
  var minG=Math.round((d.unitPrice||0)*0.85);
  var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
  var stCls=isClosed?'st-closed':isMatched?'st-matched':'st-open';
  var stTxt=isClosed?'마감':isMatched?'매칭완료':'모집중';
  var clr=_courierColor(d.courier||'');
  var div=document.createElement('div');
  div.className='pcard pcard'+cls+(isClosed?' closed':'');
  div.innerHTML=
    '<div class="pc-top">'+
      '<div style="flex:1;min-width:0">'+
        '<div class="pc-courier" style="background:'+clr+'1a;color:'+clr+'">'+
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+clr+';flex-shrink:0"></span>'+
          (d.courier||'택배사')+'</div>'+
        '<div class="pc-area">'+(d.region||'')+' '+(d.area||'')+'</div>'+
        (compact?'':
          '<div class="pc-tags">'+
            (d.workShift?'<span class="tag">'+d.workShift+'</span>':'')+
            (d.vehicleType?'<span class="tag">'+d.vehicleType+'</span>':'')+
            (d.platform?'<span class="tag">'+d.platform+'</span>':'')+
          '</div>')+
      '</div>'+
      '<span class="pc-status '+stCls+'">'+stTxt+'</span>'+
    '</div>'+
    '<div class="pc-earn">'+
      '<span class="pc-price">'+_fmt(d.unitPrice||0)+'<small class="pc-unit">원/건</small></span>'+
      '<span class="riq-badge '+rpCls+'">ROUTEIQ '+rpTxt+'</span>'+
      (dayEst&&!compact?'<span style="font-size:11px;color:var(--t2)">일 ~'+dayEst+'만원</span>':'')+
    '</div>'+
    (compact?'':'<div class="pc-minguar" style="font-size:11px;color:var(--t2);margin-bottom:8px">최소보장 <strong>'+_fmt(minG)+'원</strong>/건 (시세×85%)</div>')+
    '<div class="pc-foot">'+
      '<span class="pc-agency">'+(d.agencyName||'대리점')+'</span>'+
      (!isClosed&&_CU&&_CU.type==='driver'?
        '<button class="quick-apply" onclick="event.stopPropagation();_quickApply(\''+d.id+'\',\''+d.agencyId+'\',\''+d.agencyName+'\')">'+
        _SVG.bolt+'원탭 지원</button>':'')+
    '</div>';
  if(!isClosed)div.onclick=function(){_showPostDetail(d);};
  return div;
}

function _quickApply(postId,agencyId,agencyName){
  if(!_CU||_CU.type!=='driver'){_yToast('기사만 지원 가능해요');return;}
  _db.collection('yongcha_applies').where('postId','==',postId).where('driverId','==',_CU.uid).get()
  .then(function(snap){
    if(!snap.empty){_yToast('이미 지원한 공고예요');return;}
    return _db.collection('yongcha_applies').add({
      postId:postId,driverId:_CU.uid,driverName:_CU.name,driverPhone:_CU.phone||'',
      agencyId:agencyId,agencyName:agencyName,status:'pending',
      appliedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function(ref){if(ref){_yToast('지원 완료! 대리점 연락을 기다려요');_closeModal();}})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _showPostDetail(d){
  var rp=_rateVsMarket(d.unitPrice||0,d.courier);
  var minG=Math.round((d.unitPrice||0)*0.85);
  var clr=_courierColor(d.courier||'');
  var rpCls=rp>3?'riq-up':rp<-3?'riq-down':'riq-flat';
  var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
  var monthEst=Math.round(dayEst*26);
  var html=
    '<div class="modal-courier-bar" style="background:'+clr+'"></div>'+
    '<div class="modal-title">'+(d.region||'')+' '+(d.area||'')+'</div>'+
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">'+
      '<span style="font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;background:'+clr+'1a;color:'+clr+'">'+(d.courier||'')+'</span>'+
      '<span class="riq-badge '+rpCls+'">ROUTEIQ '+(rp>0?'+':'')+rp+'%</span>'+
      (d.platform?'<span class="tag">'+d.platform+'</span>':'')+
      (d.workShift?'<span class="tag">'+d.workShift+'</span>':'')+
    '</div>'+
    '<div class="stat-grid" style="margin-bottom:14px">'+
      '<div class="stat-card"><div class="stat-val" style="color:'+clr+'">'+_fmt(d.unitPrice||0)+'</div><div class="stat-lbl">단가 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val" style="color:var(--gn)">'+_fmt(minG)+'</div><div class="stat-lbl">최소보장 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+(d.volume||0)+'</div><div class="stat-lbl">일 물량 (건)</div></div>'+
      '<div class="stat-card"><div class="stat-val" style="color:var(--yw)">'+_fmt(monthEst)+'</div><div class="stat-lbl">예상 월수익 (만)</div></div>'+
    '</div>'+
    (d.description?'<div class="card" style="font-size:13px;line-height:1.75;color:var(--t2);margin-bottom:14px">'+(d.description||'')+'</div>':'')+
    '<div class="card" style="margin-bottom:14px;padding:12px 14px">'+
      '<div class="p-row"><span class="p-row-lbl">정산일</span><span class="p-row-val">'+(d.settleDay||15)+'일</span></div>'+
      '<div class="p-row"><span class="p-row-lbl">대리점</span><span class="p-row-val">'+(d.agencyName||'—')+'</span></div>'+
    '</div>'+
    (_CU&&_CU.type==='driver'&&d.status==='open'?
      '<button class="btn-main" style="margin-top:4px" onclick="_quickApply(\''+d.id+'\',\''+d.agencyId+'\',\''+d.agencyName+'\')">원탭 지원하기</button>':
      '<div style="text-align:center;font-size:13px;color:var(--t2);padding:16px">'+(d.status==='closed'?'마감된 공고예요':'지원 불가')+'</div>');
  _showModal(html);
}

// ── 홈 ───────────────────────────────────────────────────────
function _pgHome(el){
  if(_CU.type==='driver')_pgHomeDriver(el);
  else if(_CU.type==='agency')_pgHomeAgency(el);
  else _pgHomeAdmin(el);
}
function _pgHomeDriver(el){
  el.innerHTML=
    '<div class="ai-card" id="ai-card">'+
      '<div class="ai-hdr">'+
        '<div class="ai-icon">'+_SVG.brain+'</div>'+
        '<div><div class="ai-title">AI 노선 코치</div><div class="ai-sub-txt">Claude AI · 실시간 수익 분석</div></div>'+
      '</div>'+
      '<div class="ai-body" id="ai-body">내 지역·차종 기준 최고 수익 노선을 분석해드려요.</div>'+
      '<button class="ai-btn" id="ai-btn" onclick="_callAICoach()">'+_SVG.bolt+' AI 분석 시작</button>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div class="page-title">내 주변 공고</div>'+
      '<button style="font-size:12px;font-weight:700;color:var(--ac);border:none;background:none;cursor:pointer;font-family:inherit" onclick="_goPage(\'posts\')">지도로 보기 →</button>'+
    '</div>'+
    '<div id="home-posts"><div class="card"><div style="color:var(--t2);font-size:13px;text-align:center;padding:20px">로딩 중...</div></div></div>';
  _loadHomePosts();
}
function _loadHomePosts(){
  var q=_db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(10);
  q.get().then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    _allPosts=list;
    var el2=document.getElementById('home-posts');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">아직 등록된 공고가 없어요</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,5).forEach(function(d){el2.appendChild(_makePostCard(d,false));});
  }).catch(function(){});
}
function _callAICoach(){
  var bodyEl=document.getElementById('ai-body'),btn=document.getElementById('ai-btn');
  if(!bodyEl)return;
  bodyEl.innerHTML='<span class="ai-typing">분석 중</span>';
  if(btn){btn.disabled=true;btn.innerHTML=_SVG.bolt+' 분석 중...';}
  var typingTexts=['가장 높은 단가 노선 탐색 중...','시세 대비 수익률 계산 중...','최적 노선 선별 중...'];
  var ti=0;
  var typeTimer=setInterval(function(){
    var el=document.getElementById('ai-body');
    if(!el){clearInterval(typeTimer);return;}
    el.innerHTML='<span class="ai-typing">'+typingTexts[ti%typingTexts.length]+'</span>';
    ti++;
  },1200);
  fetch('/api/ai-coach',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({driver:{name:_CU.name,region:_CU.region,carType:_CU.carType},posts:_allPosts})
  }).then(function(r){return r.json();}).then(function(res){
    clearInterval(typeTimer);
    if(!res.ok||!res.data){if(bodyEl)bodyEl.textContent='분석을 불러올 수 없어요';return;}
    var d=res.data;
    if(bodyEl){
      bodyEl.innerHTML='<div style="margin-bottom:8px">'+(d.summary||'')+'</div>'+
        (d.reason?'<div class="ai-highlight">'+d.reason+'</div>':'')+
        (d.applyMsg?'<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:6px">추천 메시지: '+d.applyMsg+'</div>':'');
    }
    if(d.monthlyEst){
      var card=document.getElementById('ai-card');
      if(card&&!card.querySelector('.ai-est')){
        var e=document.createElement('div');e.className='ai-est';
        e.innerHTML='<span class="ai-est-lbl">예상 월 수익</span><span class="ai-est-val">'+d.monthlyEst+'</span>';
        card.appendChild(e);
      }
    }
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 분석';}
    if(d.bestPickId){var b=_allPosts.find(function(p){return p.id===d.bestPickId;});if(b)_yToast('추천: '+b.region+' '+b.area);}
  }).catch(function(){
    clearInterval(typeTimer);
    if(bodyEl)bodyEl.textContent='AI 분석 오류 — 다시 시도해주세요';
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 시도';}
  });
}
function _pgHomeAgency(el){
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).get().then(function(snap){
    var posts=[];snap.forEach(function(d){posts.push(Object.assign({id:d.id},d.data()));});
    var open=posts.filter(function(p){return p.status==='open';}).length;
    var matched=posts.filter(function(p){return p.status==='matched';}).length;
    el.innerHTML=
      '<div class="page-title">'+_CU.name+'</div><div class="page-sub">대리점 대시보드</div>'+
      '<div class="stat-grid">'+
        '<div class="stat-card"><div class="stat-val" style="color:var(--gn)">'+open+'</div><div class="stat-lbl">모집중</div></div>'+
        '<div class="stat-card"><div class="stat-val" style="color:var(--ac)">'+matched+'</div><div class="stat-lbl">매칭완료</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+posts.length+'</div><div class="stat-lbl">전체 공고</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+(_CU.region||'—')+'</div><div class="stat-lbl">담당 지역</div></div>'+
      '</div>'+
      '<button class="btn-main" onclick="_goPage(\'add_post\')">새 공고 등록</button>';
  });
}
function _pgHomeAdmin(el){
  Promise.all([_db.collection('yongcha_posts').get(),_db.collection('yongcha_users').get()])
  .then(function(res){
    var posts=[],users=[];
    res[0].forEach(function(d){posts.push(d.data());});
    res[1].forEach(function(d){users.push(d.data());});
    el.innerHTML=
      '<div class="page-title">관리자 대시보드</div><div class="page-sub">용차 플랫폼 현황</div>'+
      '<div class="stat-grid">'+
        '<div class="stat-card"><div class="stat-val">'+posts.length+'</div><div class="stat-lbl">전체 공고</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+users.filter(function(u){return u.type==='driver';}).length+'</div><div class="stat-lbl">등록 기사</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+users.filter(function(u){return u.type==='agency';}).length+'</div><div class="stat-lbl">대리점</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+posts.filter(function(p){return p.status==='open';}).length+'</div><div class="stat-lbl">모집중</div></div>'+
      '</div>';
  });
}

// ── 공고 (지도 메인) ────────────────────────────────────────
function _pgPosts(el){
  _pgIdx=0;_mapInst=null;_mapMarkers=[];_bsheetOpen=false;
  el.innerHTML=
    '<div id="map-full"></div>'+
    '<div id="map-overlay-top">'+
      '<div id="plat-tabs"></div>'+
      '<div id="map-post-count">'+_SVG.pin+' <span id="map-count-txt">로딩 중</span></div>'+
    '</div>'+
    '<div id="bsheet" class="collapsed">'+
      '<div id="bsheet-handle" onclick="_toggleBsheet()">'+
        '<div id="bsheet-handle-bar"></div>'+
        '<div id="bsheet-handle-info">'+
          '<div id="bsheet-title">공고 목록</div>'+
          '<div id="bsheet-chevron">'+_SVG.chevron+'</div>'+
        '</div>'+
      '</div>'+
      '<div id="bsheet-list"></div>'+
    '</div>';
  _buildPlatTabs();
  _startPostsListener();
  if(_kakaoReady)_initMap();
}
function _buildPlatTabs(){
  var el=document.getElementById('plat-tabs');if(!el)return;
  el.innerHTML=PLATFORMS.map(function(p){
    return '<button class="plat-tab'+(p===_platFilter?' on':'')+'" onclick="_setPlatFilter(\''+p+'\')">'+p+'</button>';
  }).join('');
}
function _setPlatFilter(p){_platFilter=p;_pgIdx=0;_buildPlatTabs();_applyFilters();}
function _startPostsListener(){
  if(_postsUnsub)_postsUnsub();
  _postsUnsub=_db.collection('yongcha_posts').orderBy('createdAt','desc').limit(100)
  .onSnapshot(function(snap){
    _allPosts=[];snap.forEach(function(d){_allPosts.push(Object.assign({id:d.id},d.data()));});
    _applyFilters();
  },function(){});
}
function _applyFilters(){
  _filteredPosts=_allPosts.filter(function(d){
    if(_platFilter!=='전체'&&d.platform!==_platFilter)return false;
    return true;
  });
  _renderBsheetList();
  _renderMapMarkers();
  var cnt=document.getElementById('map-count-txt');
  if(cnt)cnt.textContent=_filteredPosts.length+'개 공고';
}
function _toggleBsheet(){
  _bsheetOpen=!_bsheetOpen;
  var bs=document.getElementById('bsheet');
  var ch=document.getElementById('bsheet-chevron');
  if(!bs)return;
  if(_bsheetOpen){bs.classList.remove('collapsed');}else{bs.classList.add('collapsed');}
  if(ch)ch.classList.toggle('up',_bsheetOpen);
}
function _renderBsheetList(){
  var el=document.getElementById('bsheet-list');if(!el)return;
  var total=_filteredPosts.length,start=_pgIdx*_pgSize;
  if(!total){el.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">조건을 바꿔보세요</div></div>';return;}
  el.innerHTML='';
  _filteredPosts.slice(start,start+_pgSize).forEach(function(d){el.appendChild(_makePostCard(d,true));});
  var totalPages=Math.ceil(total/_pgSize);
  if(totalPages>1){
    var pg=document.createElement('div');pg.className='pg-row';
    pg.innerHTML='<button class="pg-btn" onclick="_pgNav(-1)" '+(_pgIdx===0?'disabled':'')+'>이전</button>'+
      '<span class="pg-info">'+(_pgIdx+1)+' / '+totalPages+'</span>'+
      '<button class="pg-btn" onclick="_pgNav(1)" '+(_pgIdx>=totalPages-1?'disabled':'')+'>다음</button>';
    el.appendChild(pg);
  }
}
function _pgNav(d){
  var total=Math.ceil(_filteredPosts.length/_pgSize);
  _pgIdx=Math.max(0,Math.min(total-1,_pgIdx+d));
  _renderBsheetList();
}
function _initMap(){
  var mapEl=document.getElementById('map-full');if(!mapEl||!_kakaoReady)return;
  var rc=REGION_COORDS[(_CU&&_CU.region)||'부산']||[35.1795,129.0756];
  var center=new kakao.maps.LatLng(rc[0],rc[1]);
  _mapInst=new kakao.maps.Map(mapEl,{center:center,level:8});
  _renderMapMarkers();
}
function _renderMapMarkers(){
  if(!_mapInst)return;
  _mapMarkers.forEach(function(m){m.setMap(null);});
  _mapMarkers=[];
  _filteredPosts.filter(function(d){return d.status==='open';}).forEach(function(d){
    var coords=_postCoords(d);
    var clr=_courierColor(d.courier||'');
    var div=document.createElement('div');
    div.style.cssText='background:'+clr+';color:#fff;padding:5px 11px;border-radius:16px;font-size:11px;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.3);cursor:pointer;white-space:nowrap;border:2px solid rgba(255,255,255,.45);display:flex;align-items:center;gap:4px';
    div.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.7);display:inline-block"></span>'+_fmt(d.unitPrice)+'원';
    div.onclick=function(e){e.stopPropagation();_showPostDetail(d);if(!_bsheetOpen)_toggleBsheet();};
    var ov=new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(coords[0],coords[1]),content:div,yAnchor:1.3});
    ov.setMap(_mapInst);
    _mapMarkers.push(ov);
  });
}

// ── 수익 시뮬레이터 ──────────────────────────────────────────
function _pgRevSim(el){
  _revSimSel=[];
  el.innerHTML='<div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:30px">로딩 중...</div>';
  _db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    _revSimPosts=[];snap.forEach(function(d){_revSimPosts.push(Object.assign({id:d.id},d.data()));});
    _renderRevSim(el);
  }).catch(function(){el.innerHTML='<div class="empty"><div class="empty-title">로드 실패</div></div>';});
}
function _renderRevSim(el){
  var sel=_revSimSel,monthDays=26;
  var total=sel.reduce(function(sum,id){
    var p=_revSimPosts.find(function(x){return x.id===id;});
    return sum+(p?Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000):0);
  },0);
  el.innerHTML=
    '<div class="revsim-hero">'+
      '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:2px">이달 예상 수익</div>'+
      '<div class="revsim-result">'+(sel.length?total.toLocaleString():'—')+'<small style="font-size:16px;font-weight:400"> 만원</small></div>'+
      '<div style="font-size:12px;color:rgba(255,255,255,.5)">'+(sel.length?'선택 '+sel.length+'개 공고 · 월 '+monthDays+'일 기준':'공고를 아래서 선택하세요')+'</div>'+
    '</div>'+
    (sel.length?_revSimBreakdown(sel,monthDays):'')+
    '<div class="section-lbl">공고 선택 (최대 3개)</div>'+
    (_revSimPosts.length?_revSimPosts.slice(0,10).map(function(d){
      var isSel=sel.indexOf(d.id)>=0;
      var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
      var clr=_courierColor(d.courier||'');
      return '<div class="sim-item'+(isSel?' sel':'')+'" onclick="_toggleSimSel(\''+d.id+'\')">'+
        '<div class="sim-check">'+(isSel?_SVG.check:'')+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:14px;font-weight:700;margin-bottom:2px">'+(d.region||'')+' '+(d.area||'')+'</div>'+
          '<div style="font-size:11px;color:var(--t2)">'+
            '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+clr+';margin-right:4px;vertical-align:middle"></span>'+
            (d.courier||'')+(dayEst?' · 일 ~'+dayEst+'만원':'')+
          '</div>'+
        '</div>'+
        '<div style="text-align:right">'+
          '<div style="font-size:15px;font-weight:800">'+_fmt(d.unitPrice||0)+'<small style="font-size:10px;font-weight:400">원</small></div>'+
          '<div style="font-size:10px;color:var(--t2)">최보 '+_fmt(Math.round((d.unitPrice||0)*0.85))+'원</div>'+
        '</div>'+
      '</div>';
    }).join(''):'<div class="empty"><div class="empty-title">모집중 공고 없음</div></div>');
}
function _revSimBreakdown(sel,monthDays){
  var rows=sel.map(function(id){
    var p=_revSimPosts.find(function(x){return x.id===id;});if(!p)return '';
    var earn=Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000);
    var clr=_courierColor(p.courier||'');
    return '<div class="revsim-row">'+
      '<span style="display:flex;align-items:center;gap:6px">'+
        '<span style="width:10px;height:10px;border-radius:3px;background:'+clr+';display:inline-block;flex-shrink:0"></span>'+
        (p.region||'')+' '+(p.area||'')+'</span>'+
      '<span style="font-weight:700">'+earn.toLocaleString()+'만원</span></div>';
  }).join('');
  var total=sel.reduce(function(sum,id){
    var p=_revSimPosts.find(function(x){return x.id===id;});
    return sum+(p?Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000):0);
  },0);
  return '<div class="revsim-breakdown">'+rows+'<div class="revsim-row"><span>예상 합계</span><span style="color:var(--gn)">'+total.toLocaleString()+'만원</span></div></div>';
}
function _toggleSimSel(id){
  var idx=_revSimSel.indexOf(id);
  if(idx>=0){_revSimSel.splice(idx,1);}
  else if(_revSimSel.length<3){_revSimSel.push(id);}
  else{_yToast('최대 3개까지 선택 가능해요');return;}
  _renderRevSim(document.getElementById('content'));
}

// ── 지원현황 ─────────────────────────────────────────────────
function _pgMyApplies(el){
  el.innerHTML='<div class="page-title">지원현황</div><div class="page-sub">내가 지원한 공고</div><div id="app-list"><div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:24px">로딩 중...</div></div>';
  _db.collection('yongcha_applies').where('driverId','==',_CU.uid).orderBy('appliedAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('app-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty">'+_SVG.pin+'<div class="empty-title">지원 내역 없음</div><div class="empty-sub">지도 공고 탭에서 지원해보세요</div></div>';return;}
    el2.innerHTML='';
    var stMap={pending:'검토중',accepted:'합격',rejected:'불합격',cancelled:'취소'};
    var stCls={pending:'riq-flat',accepted:'riq-up',rejected:'riq-down',cancelled:'tag'};
    list.slice(0,_pgSize).forEach(function(a){
      var d=document.createElement('div');d.className='card';d.style.marginBottom='8px';
      d.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:4px">'+(a.agencyName||'대리점')+'</div>'+
            '<div style="font-size:12px;color:var(--t2)">'+_timeAgo(a.appliedAt)+'</div>'+
          '</div>'+
          '<span class="riq-badge '+(stCls[a.status]||'tag')+'">'+(stMap[a.status]||a.status)+'</span>'+
        '</div>';
      el2.appendChild(d);
    });
  }).catch(function(){});
}

// ── 프로필 ───────────────────────────────────────────────────
function _pgProfile(el){
  el.innerHTML=
    '<div class="page-title">내 정보</div>'+
    '<div class="page-sub">'+(_CU.type==='driver'?'기사':'대리점')+' 계정</div>'+
    '<div class="card" style="margin-bottom:12px">'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">'+
        '<div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,var(--ac),#6366f1);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(79,70,229,.3)">'+
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'+
        '</div>'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800">'+(_CU.name||'—')+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(_CU.email||'')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="p-row"><span class="p-row-lbl">지역</span><span class="p-row-val">'+(_CU.region||'미설정')+'</span></div>'+
      '<div class="p-row"><span class="p-row-lbl">연락처</span><span class="p-row-val">'+(_CU.phone||'미설정')+'</span></div>'+
      (_CU.type==='driver'?'<div class="p-row"><span class="p-row-lbl">차종</span><span class="p-row-val">'+(_CU.carType||'미설정')+'</span></div>':'')+
    '</div>'+
    '<button class="btn-main" style="background:#fff;color:var(--rd);border:1.5px solid rgba(220,38,38,.2);box-shadow:none" onclick="_yLogout()">로그아웃</button>';
}

// ── 대리점: 공고목록 ─────────────────────────────────────────
function _pgMyPosts(el){
  el.innerHTML='<div class="page-title">공고목록</div><div id="my-list"><div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:24px">로딩 중...</div></div>';
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).orderBy('createdAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('my-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">등록된 공고 없음</div><div class="empty-sub">공고등록 탭에서 등록해보세요</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d,false));});
  });
}

// ── 대리점: 공고등록 ─────────────────────────────────────────
function _pgAddPost(el){
  el.innerHTML=
    '<div class="page-title">공고등록</div><div class="page-sub">ROUTEIQ 시세 기준 자동 표시</div>'+
    '<div class="card">'+
      '<div class="inp-wrap"><label class="inp-lbl">택배사</label>'+
        '<select class="inp" id="ap-courier" onchange="_showRIQ()">'+
          '<option>CJ대한통운</option><option>한진택배</option><option>롯데택배</option>'+
          '<option>우체국</option><option>쿠팡로지스틱스</option><option>로젠택배</option>'+
        '</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">플랫폼</label>'+
        '<select class="inp" id="ap-platform"><option value="">직접등록</option>'+
          PLATFORMS.slice(1).map(function(p){return '<option>'+p+'</option>';}).join('')+
        '</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">지역</label>'+
        '<select class="inp" id="ap-region">'+REGIONS.slice(1).map(function(r){return '<option>'+r+'</option>';}).join('')+'</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">상세 구역</label><input class="inp" id="ap-area" placeholder="예: 해운대 우2동"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">단가 (원/건)</label><input class="inp" id="ap-price" type="number" placeholder="시세 기준 입력" oninput="_showRIQ()"></div>'+
      '<div id="ap-riq" style="font-size:12px;font-weight:700;padding:10px 14px;background:var(--bg3);border-radius:10px;margin-bottom:10px;display:none;border:1px solid var(--bd)"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">일 물량 (건)</label><input class="inp" id="ap-vol" type="number" placeholder="예: 200"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">근무 형태</label>'+
        '<select class="inp" id="ap-shift"><option>주간</option><option>야간</option><option>주야간</option></select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">정산일</label>'+
        '<select class="inp" id="ap-settle"><option value="15">15일</option><option value="25">25일</option><option value="30">말일</option></select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">공고 내용</label><textarea class="inp" id="ap-desc" rows="3" placeholder="상세 내용 (선택)"></textarea></div>'+
      '<div class="err" id="ap-err"></div>'+
      '<button class="btn-main" onclick="_submitPost()">공고 등록</button>'+
    '</div>';
}
function _showRIQ(){
  var price=parseInt((document.getElementById('ap-price')||{}).value)||0;
  var courier=((document.getElementById('ap-courier')||{}).value)||'CJ대한통운';
  var el=document.getElementById('ap-riq');if(!el||!price)return;
  var rp=_rateVsMarket(price,courier),minG=Math.round(price*0.85);
  el.style.display='block';
  el.style.color=rp>3?'var(--gn)':rp<-3?'var(--rd)':'var(--ac)';
  el.innerHTML='ROUTEIQ: 시세 대비 '+(rp>0?'+':'')+rp+'% &nbsp;·&nbsp; 최소보장 <strong>'+_fmt(minG)+'원/건</strong> (시세×85%)';
}
function _submitPost(){
  var courier=(document.getElementById('ap-courier').value||'').trim();
  var platform=(document.getElementById('ap-platform').value||'').trim();
  var region=(document.getElementById('ap-region').value||'').trim();
  var area=(document.getElementById('ap-area').value||'').trim();
  var price=parseInt(document.getElementById('ap-price').value)||0;
  var vol=parseInt(document.getElementById('ap-vol').value)||0;
  var shift=(document.getElementById('ap-shift').value||'').trim();
  var settle=parseInt(document.getElementById('ap-settle').value)||15;
  var desc=(document.getElementById('ap-desc').value||'').trim();
  var err=document.getElementById('ap-err');
  if(!region||!area||!price||!vol){err.textContent='필수 항목을 모두 입력하세요';err.style.display='block';return;}
  err.style.display='none';
  _db.collection('yongcha_posts').add({
    agencyId:_CU.uid,agencyName:_CU.name,courier:courier,platform:platform||null,
    region:region,area:area,unitPrice:price,volume:vol,workShift:shift,settleDay:settle,
    description:desc,status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('공고가 등록되었어요');_goPage('my_posts');})
  .catch(function(e){err.textContent='오류: '+e.message;err.style.display='block';});
}

// ── 대리점: 기사목록 ─────────────────────────────────────────
function _pgDrivers(el){
  el.innerHTML='<div class="page-title">기사목록</div><div id="drv-list"><div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:24px">로딩 중...</div></div>';
  _db.collection('yongcha_users').where('type','==','driver').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('drv-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">기사 없음</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,_pgSize).forEach(function(u){
      var d=document.createElement('div');d.className='card';d.style.marginBottom='8px';
      d.innerHTML='<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="width:40px;height:40px;border-radius:12px;background:var(--gnl);display:flex;align-items:center;justify-content:center">'+_SVG.user+'</div>'+
        '<div><div style="font-size:15px;font-weight:700">'+u.name+'</div>'+
        '<div style="font-size:12px;color:var(--t2)">'+(u.region||'')+(u.carType?' · '+u.carType:'')+'</div></div></div>';
      el2.appendChild(d);
    });
  });
}

// ── 관리자 ───────────────────────────────────────────────────
function _pgAdminPosts(el){
  el.innerHTML='<div class="page-title">공고관리</div><div id="adm-p"><div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:24px">로딩 중...</div></div>';
  _db.collection('yongcha_posts').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-p');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">공고 없음</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d,false));});
  });
}
function _pgAdminUsers(el){
  el.innerHTML='<div class="page-title">사용자관리</div><div id="adm-u"><div class="card" style="text-align:center;color:var(--t2);font-size:13px;padding:24px">로딩 중...</div></div>';
  _db.collection('yongcha_users').orderBy('createdAt','desc').limit(30).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-u');if(!el2)return;
    el2.innerHTML='';
    list.forEach(function(u){
      var d=document.createElement('div');d.className='card';d.style.marginBottom='8px';
      d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div>'+
          '<div style="font-size:14px;font-weight:700">'+u.name+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+u.email+' · '+(u.region||'')+'</div>'+
        '</div>'+
        '<span class="hdr-badge '+(u.type==='admin'?'badge-admin':u.type==='agency'?'badge-agency':'badge-driver')+'">'+
          (u.type==='admin'?'관리자':u.type==='agency'?'대리점':'기사')+'</span>'+
      '</div>';
      el2.appendChild(d);
    });
  });
}
</script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (path === '/api/kakao-config') {
      return new Response(JSON.stringify({ key: env.KAKAO_JS_KEY || '' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (path === '/api/ctrl-notify' && method === 'POST') {
      try {
        const body = await request.json();
        if (body.token && env.FCM_SERVER_KEY) {
          await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: { 'Authorization': 'key=' + env.FCM_SERVER_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: body.token, notification: { title: body.title || '용차', body: body.body || '' }, data: body.data || {} })
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (path === '/api/ai-coach' && method === 'POST') {
      try {
        const { driver, posts } = await request.json();
        const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no key' }), { headers: { 'Content-Type': 'application/json' } });

        const MKT = { 'CJ대한통운': 880, '한진택배': 855, '롯데택배': 860, '우체국': 900, '쿠팡로지스틱스': 960, '로젠택배': 840 };
        const postSummary = (posts || []).slice(0, 8).map(p => {
          const avg = MKT[p.courier] || 880;
          const rp = Math.round((p.unitPrice - avg) / avg * 100);
          const dayEst = Math.round((p.unitPrice || 0) * (p.volume || 0) / 10000);
          return `[${p.id}] ${p.courier} ${p.region} ${p.area} / 단가:${p.unitPrice}원(시세${rp > 0 ? '+' : ''}${rp}%) / 일물량:${p.volume}건 / 일수익:~${dayEst}만원 / ${p.workShift || ''}`;
        }).join('\n');

        const prompt = `당신은 대한민국 택배 기사 수익 최적화 전문 AI 코치입니다. 구체적인 숫자와 실용적 조언을 제공하세요.

기사 정보:
- 이름: ${driver.name || '기사'}
- 담당 지역: ${driver.region || '미설정'}
- 차량: ${driver.carType || '미설정'}

현재 공개 공고 (ROUTEIQ 분석):
${postSummary || '공고 없음'}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "summary": "기사 맞춤 수익 인사이트 1-2문장 (지역명, 구체적 금액 포함)",
  "bestPickId": "최우선 추천 공고 ID (없으면 null)",
  "reason": "추천 이유 — 시세대비 %, 월수익 예측 포함 1문장",
  "monthlyEst": "예상 월 수익 (예: 420만원)",
  "applyMsg": "지원 시 어필 한줄 메시지"
}`;

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const claudeData = await claudeRes.json();
        const raw = claudeData.content?.[0]?.text || '{}';
        let parsed = {};
        try { parsed = JSON.parse(raw); } catch(e) {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch(e2) {} }
        }

        return new Response(JSON.stringify({ ok: true, data: parsed }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Serve app
    return new Response(YONGCHA_HTML, {
      headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' }
    });
  }
};
