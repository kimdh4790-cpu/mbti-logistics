const YONGCHA_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0f1e">
<title>용차 — 택배 노선 매칭</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<style>
:root{
  --bg:#0a0f1e;--bg2:#0e1528;--bg3:#141d36;--bg4:#1a2444;
  --bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.13);
  --tx:#e2e8f9;--t2:#8896b3;--t3:#4a5870;
  --ac:#4f78f5;--acl:rgba(79,120,245,.13);--ach:rgba(79,120,245,.22);
  --gn:#10b981;--gnl:rgba(16,185,129,.12);
  --rd:#ef4444;--rdl:rgba(239,68,68,.12);
  --or:#f97316;--orl:rgba(249,115,22,.12);
  --yw:#f59e0b;--ywl:rgba(245,158,11,.12);
  --cj:#ff4d5e;--hj:#4897c8;--lt:#ff8c4e;--up:#2dba9f;--cp:#ff7043;--rz:#a78bfa;
  --r:14px;--r2:20px;
  --sh:0 2px 12px rgba(0,0,0,.45);
  --sh2:0 6px 24px rgba(0,0,0,.55);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--tx);overflow:hidden}

@keyframes ldPulse{0%,100%{box-shadow:0 0 0 0 rgba(79,120,245,.5),0 8px 32px rgba(79,120,245,.3)}70%{box-shadow:0 0 0 14px rgba(79,120,245,0),0 8px 32px rgba(79,120,245,.3)}}
@keyframes ldSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
#ld{position:fixed;inset:0;background:linear-gradient(160deg,#030710 0%,#091022 50%,#111c3d 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:14px}
.ld-mark{width:80px;height:80px;border-radius:24px;background:linear-gradient(135deg,rgba(79,120,245,.25),rgba(99,102,241,.15));display:flex;align-items:center;justify-content:center;border:1px solid rgba(79,120,245,.4);animation:ldPulse 2.2s ease-out infinite}
.ld-mark svg{width:42px;height:42px;stroke:#6d9cff;fill:none;stroke-width:1.8}
.ld-title{font-size:36px;font-weight:900;color:#fff;letter-spacing:-.8px;animation:ldSlide .5s ease-out .1s both}
.ld-sub{font-size:13px;color:rgba(255,255,255,.38);animation:ldSlide .5s ease-out .2s both;letter-spacing:.3px}
.spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,.08);border-top-color:#6d9cff;border-right-color:rgba(109,156,255,.4);border-radius:50%;animation:spin .8s linear infinite;animation-delay:.3s}
@keyframes spin{to{transform:rotate(360deg)}}

#login-screen{position:fixed;inset:0;background:linear-gradient(160deg,#060b1a 0%,#0a1535 100%);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
.login-card{background:var(--bg2);border:1px solid var(--bd2);border-radius:24px;padding:36px 28px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.7)}
.login-mark{width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#4f78f5,#6366f1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 8px 24px rgba(79,120,245,.4)}
.login-mark svg{width:32px;height:32px;stroke:#fff;fill:none;stroke-width:2}
.login-name{font-size:24px;font-weight:900;text-align:center;letter-spacing:-.5px;color:var(--tx);margin-bottom:4px}
.login-sub{font-size:13px;color:var(--t2);text-align:center;margin-bottom:28px}
.tabs{display:flex;background:var(--bg3);border-radius:12px;padding:4px;margin-bottom:24px;gap:3px}
.tab{flex:1;padding:10px;border-radius:9px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.tab.on{background:var(--bg4);color:var(--ac);box-shadow:0 2px 8px rgba(0,0,0,.3)}
.type-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.type-card{border:2px solid var(--bd);border-radius:var(--r);padding:16px 12px;text-align:center;cursor:pointer;transition:.2s;background:var(--bg3)}
.type-card.on{border-color:var(--ac);background:var(--acl)}
.type-ico{margin-bottom:8px}
.type-lbl{font-size:13px;font-weight:800;color:var(--tx)}
.type-desc{font-size:11px;color:var(--t2);margin-top:2px}
.inp-wrap{margin-bottom:14px}
.inp-lbl{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:6px;display:block}
.inp{width:100%;padding:12px 14px;background:var(--bg3);border:1.5px solid var(--bd);border-radius:var(--r);color:var(--tx);font-size:14px;outline:none;font-family:inherit;transition:.2s}
.inp:focus{border-color:var(--ac);background:var(--bg4);box-shadow:0 0 0 3px var(--acl)}
.inp::placeholder{color:var(--t3)}
select.inp{cursor:pointer;-webkit-appearance:none;appearance:none}
select.inp option{background:var(--bg3);color:var(--tx)}
textarea.inp{resize:vertical;min-height:80px}
.err{color:var(--rd);font-size:12px;margin-bottom:10px;display:none;padding:8px 12px;background:var(--rdl);border-radius:8px;border:1px solid rgba(239,68,68,.2)}
.btn-main{width:100%;padding:15px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;margin-top:4px;box-shadow:0 4px 16px rgba(79,120,245,.35)}
.btn-main:active{filter:brightness(.9);transform:translateY(1px)}
.btn-main:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.btn-sec{width:100%;padding:13px;background:var(--bg3);color:var(--tx);border:1px solid var(--bd);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.btn-gn{width:100%;padding:13px;background:var(--gnl);color:var(--gn);border:1px solid rgba(16,185,129,.22);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.btn-rd{width:100%;padding:13px;background:var(--rdl);color:var(--rd);border:1px solid rgba(239,68,68,.22);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}

#app{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg)}
.app-hdr{background:var(--bg2);border-bottom:1px solid var(--bd);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-logo{font-size:18px;font-weight:900;letter-spacing:-.5px;background:linear-gradient(135deg,#4f78f5,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.badge-admin{background:rgba(167,139,250,.15);color:#a78bfa}
.badge-agency{background:var(--acl);color:var(--ac)}
.badge-driver{background:var(--gnl);color:var(--gn)}
.hdr-right{display:flex;align-items:center;gap:8px}
.notif-btn{width:34px;height:34px;border-radius:10px;background:var(--bg3);border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center}
.notif-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
.logout-btn{font-size:11px;color:var(--t3);background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 8px}
#content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 80px;scroll-behavior:smooth}
.bnav{background:rgba(14,21,40,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--bd);display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom);flex-shrink:0}
.nb{flex:1;padding:10px 4px 8px;border:none;background:none;color:var(--t3);font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .2s,transform .15s;font-family:inherit;position:relative}
.nb:active{transform:scale(.92)}
.nb.on{color:var(--ac)}
.nb.on::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:24px;height:2.5px;background:var(--ac);border-radius:0 0 3px 3px;box-shadow:0 0 8px rgba(79,120,245,.6)}
.nb svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;transition:transform .2s}
.nb.on svg{transform:scale(1.1)}

.card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:10px;box-shadow:var(--sh)}
.page-title{font-size:20px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px;color:var(--tx)}
.page-sub{font-size:12px;color:var(--t2);margin-bottom:16px}
.section-lbl{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin:16px 0 10px}

.filter-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:8px}
.filter-row::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:7px 16px;border-radius:20px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.15s}
.chip.on{background:var(--ac);color:#fff;border-color:var(--ac);box-shadow:0 2px 8px rgba(79,120,245,.3)}

.pcard{background:var(--bg2);border:1px solid var(--bd);border-left:6px solid var(--bd);border-radius:var(--r);padding:16px 16px 14px;margin-bottom:10px;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;box-shadow:var(--sh);position:relative;overflow:hidden;animation:fadeIn .3s ease-out}
.pcard:active{transform:scale(.985);box-shadow:var(--sh2)}
.pcard.closed{opacity:.4;cursor:default}
.pcard--cj{border-left-color:var(--cj);background:linear-gradient(135deg,rgba(255,77,94,.04) 0%,var(--bg2) 60%)}
.pcard--hj{border-left-color:var(--hj);background:linear-gradient(135deg,rgba(72,151,200,.04) 0%,var(--bg2) 60%)}
.pcard--lt{border-left-color:var(--lt);background:linear-gradient(135deg,rgba(255,140,78,.04) 0%,var(--bg2) 60%)}
.pcard--up{border-left-color:var(--up);background:linear-gradient(135deg,rgba(45,186,159,.04) 0%,var(--bg2) 60%)}
.pcard--cp{border-left-color:var(--cp);background:linear-gradient(135deg,rgba(255,112,67,.04) 0%,var(--bg2) 60%)}
.pcard--rz{border-left-color:var(--rz);background:linear-gradient(135deg,rgba(167,139,250,.04) 0%,var(--bg2) 60%)}
.pc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px}
.pc-courier{display:inline-flex;align-items:center;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;margin-bottom:6px;letter-spacing:.3px}
.pc-area{font-size:24px;font-weight:900;letter-spacing:-.8px;margin-bottom:6px;color:var(--tx);line-height:1.2}
.pc-status{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;flex-shrink:0}
.st-open{background:var(--gnl);color:var(--gn)}
.st-closed{background:var(--rdl);color:var(--rd)}
.st-matched{background:var(--acl);color:var(--ac)}
.pc-earn{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap}
.pc-price{font-size:48px;font-weight:900;letter-spacing:-2px;color:var(--tx);line-height:1}
.pc-unit{font-size:13px;font-weight:600;color:var(--t2)}
.riq-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px}
.riq-up{background:var(--gnl);color:var(--gn)}
.riq-down{background:var(--rdl);color:var(--rd)}
.riq-flat{background:var(--acl);color:var(--ac)}
.pc-minguar{font-size:11px;color:var(--t2);margin-bottom:8px;background:var(--bg3);border-radius:8px;padding:4px 10px;display:inline-block}
.pc-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--bg4);color:var(--t2)}
.pc-foot{display:flex;align-items:center;justify-content:space-between}
.pc-agency{font-size:11px;color:var(--t2);font-weight:500}
.quick-apply{display:flex;align-items:center;gap:4px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:20px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(79,120,245,.3)}
.quick-apply svg{width:13px;height:13px;fill:currentColor}
.quick-apply:active{filter:brightness(.88)}

.urgency-badge{position:absolute;top:0;right:0;background:var(--or);color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:0 var(--r) 0 12px;animation:pulseOr 1.5s infinite;box-shadow:0 2px 8px rgba(249,115,22,.4)}
@keyframes pulseOr{0%,100%{opacity:1}50%{opacity:.78}}

.pg-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:4px 0}
.pg-btn{padding:7px 18px;border-radius:10px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.pg-btn:disabled{opacity:.3;cursor:not-allowed}
.pg-info{font-size:12px;color:var(--t2);font-weight:600}

.ai-card{background:linear-gradient(135deg,#060d24 0%,#0e1e4a 60%,#1a2d6b 100%);border:1px solid rgba(79,120,245,.2);border-radius:var(--r2);padding:20px;margin-bottom:14px}
.ai-hdr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.ai-icon{width:40px;height:40px;border-radius:12px;background:rgba(79,120,245,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(79,120,245,.3)}
.ai-icon svg{width:22px;height:22px;stroke:#a5b4fc;fill:none;stroke-width:2}
.ai-title{font-size:15px;font-weight:800;color:#fff}
.ai-sub-txt{font-size:11px;color:rgba(255,255,255,.5)}
.ai-body{font-size:13px;color:rgba(255,255,255,.7);line-height:1.65;margin-bottom:12px}
.ai-highlight{background:rgba(79,120,245,.15);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;color:#a5b4fc;margin-bottom:12px;border:1px solid rgba(79,120,245,.2)}
.ai-est{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px}
.ai-est-lbl{font-size:11px;color:rgba(255,255,255,.4)}
.ai-est-val{font-size:22px;font-weight:900;color:var(--gn)}
.ai-btn{width:100%;padding:12px;background:rgba(79,120,245,.18);color:#a5b4fc;border:1px solid rgba(79,120,245,.3);border-radius:var(--r);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px}

.revsim-hero{background:linear-gradient(135deg,#060d24 0%,#0e1e4a 100%);border:1px solid rgba(79,120,245,.15);border-radius:var(--r2);padding:22px;margin-bottom:14px}
.revsim-result{font-size:42px;font-weight:900;color:var(--gn);letter-spacing:-1.5px;margin:6px 0 4px;line-height:1}
.revsim-breakdown{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:12px}
.revsim-row{display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--bd)}
.revsim-row:last-child{border-bottom:none;font-weight:800;color:var(--gn);font-size:14px}
.sim-item{display:flex;align-items:center;gap:12px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r);padding:13px 14px;margin-bottom:8px;cursor:pointer;transition:.2s}
.sim-item.sel{border-color:var(--ac);background:var(--acl)}
.sim-check{width:22px;height:22px;border-radius:7px;border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s}
.sim-item.sel .sim-check{background:var(--ac);border-color:var(--ac)}
.sim-check svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:3}

.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.stat-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;position:relative;overflow:hidden}
.stat-val{font-size:32px;font-weight:900;letter-spacing:-1px;margin-bottom:3px;color:var(--tx)}
.stat-lbl{font-size:11px;color:var(--t2);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.kpi-bar{height:3px;border-radius:2px;margin-top:10px;opacity:.6}
.kpi-ac .kpi-bar{background:var(--ac)}
.kpi-gn .kpi-bar{background:var(--gn)}
.kpi-yw .kpi-bar{background:var(--yw)}
.kpi-rd .kpi-bar{background:var(--rd)}

.empty{text-align:center;padding:52px 16px;color:var(--t2)}
.empty svg{width:44px;height:44px;stroke:var(--t3);fill:none;stroke-width:1.5;display:block;margin:0 auto 14px}
.empty-title{font-size:15px;font-weight:700;margin-bottom:5px;color:var(--t2)}
.empty-sub{font-size:12px;color:var(--t3)}

.map-toggle{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:20px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.map-toggle svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2}

#modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:none;backdrop-filter:blur(4px)}
#modal-sheet{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border:1px solid var(--bd2);border-top-left-radius:24px;border-top-right-radius:24px;z-index:201;max-height:88vh;overflow-y:auto;padding:20px 20px 40px;display:none;box-shadow:0 -8px 40px rgba(0,0,0,.6)}
.modal-handle{width:40px;height:4px;background:var(--bd2);border-radius:2px;margin:0 auto 18px}
.modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:10px;background:var(--bg3);border:none;color:var(--t2);cursor:pointer;font-size:14px;font-family:inherit}
.modal-title{font-size:20px;font-weight:900;margin-bottom:16px;letter-spacing:-.4px;color:var(--tx)}

#toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--bg4);border:1px solid var(--bd2);border-radius:12px;padding:11px 20px;font-size:13px;font-weight:600;color:var(--tx);z-index:300;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:90vw;box-shadow:var(--sh2)}

/* Slide-to-accept */
.slide-wrap{position:relative;background:var(--gnl);border:1px solid rgba(16,185,129,.2);border-radius:50px;height:60px;overflow:hidden;touch-action:none;user-select:none;margin-top:16px}
.slide-fill{position:absolute;left:0;top:0;bottom:0;background:rgba(16,185,129,.18);border-radius:50px;width:60px}
.slide-handle{position:absolute;left:4px;top:4px;bottom:4px;width:52px;background:var(--gn);border-radius:50px;display:flex;align-items:center;justify-content:center;cursor:grab;will-change:left}
.slide-handle svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.5}
.slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:rgba(16,185,129,.8);pointer-events:none;padding-left:60px}

/* 3-step work progress */
.work-steps{display:flex;gap:0;margin-bottom:20px;position:relative}
.work-steps::before{content:'';position:absolute;top:20px;left:calc(16.66% + 8px);right:calc(16.66% + 8px);height:2px;background:var(--bd);z-index:0}
.work-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:1}
.step-circle{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bd);background:var(--bg3);transition:.3s}
.step-done .step-circle{background:var(--gn);border-color:var(--gn)}
.step-active .step-circle{background:var(--ac);border-color:var(--ac);box-shadow:0 0 0 4px var(--acl),0 0 14px rgba(79,120,245,.35)}
.step-circle svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2.5}
.step-num{font-size:14px;font-weight:800;color:var(--t3)}
.step-done .step-num,.step-active .step-num{color:#fff}
.step-lbl{font-size:10px;font-weight:700;color:var(--t3);text-align:center;white-space:nowrap}
.step-done .step-lbl{color:var(--gn)}
.step-active .step-lbl{color:var(--ac)}

/* Work card */
.work-action{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r2);padding:20px;margin-bottom:12px}
.work-fare{font-size:52px;font-weight:900;letter-spacing:-2px;color:var(--tx);line-height:1;margin-bottom:4px}
.work-fare-unit{font-size:15px;font-weight:500;color:var(--t2);margin-left:2px}
.work-route{font-size:17px;font-weight:700;color:var(--tx);margin-bottom:3px}
.work-meta{font-size:12px;color:var(--t2);margin-bottom:16px}

/* Settle */
.settle-item{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:8px}
.settle-top{display:flex;justify-content:space-between;align-items:flex-start}
.settle-amt{font-size:22px;font-weight:900;color:var(--tx)}
.ss-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
.ss-pending{background:var(--ywl);color:var(--yw)}
.ss-confirmed{background:var(--gnl);color:var(--gn)}
.ss-paid{background:var(--acl);color:var(--ac)}

/* Template grid */
.tmpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.tmpl-btn{padding:14px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);text-align:left;cursor:pointer;font-family:inherit;transition:.2s;width:100%}
.tmpl-btn:active{background:var(--acl);border-color:var(--ac)}
.tmpl-area{font-size:13px;font-weight:700;color:var(--tx);margin-bottom:3px}
.tmpl-price{font-size:16px;font-weight:900;color:var(--ac)}

/* Skeleton loading */
.skel{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);background-size:200% 100%;animation:skelAnim 1.3s infinite;border-radius:8px}
@keyframes skelAnim{0%{background-position:200% 0}100%{background-position:-200% 0}}
.skel-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:8px}
.skel-line{height:13px;margin-bottom:8px}
.skel-line.sm{height:9px}
.skel-line.lg{height:26px}
.skel-w40{width:40%}.skel-w60{width:60%}.skel-w80{width:80%}.skel-full{width:100%}

/* Applicant badge */
.apply-cnt{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;background:var(--acl);color:var(--ac)}

/* ── NEW AI-ERA COMPONENTS ─────────────────────────────────── */

@keyframes heroGlow{0%,100%{box-shadow:0 0 0 0 rgba(79,120,245,0),0 8px 32px rgba(0,0,0,.6)}50%{box-shadow:0 0 0 3px rgba(79,120,245,.15),0 8px 32px rgba(0,0,0,.6)}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmerSlide{0%{background-position:200% 50%}100%{background-position:-200% 50%}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* Hero earnings card */
.hero-card{background:linear-gradient(135deg,#060d24 0%,#0c1b42 50%,#152454 100%);border:1px solid rgba(79,120,245,.28);border-radius:22px;padding:24px;margin-bottom:12px;position:relative;overflow:hidden;animation:heroGlow 4s ease-in-out infinite}
.hero-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 20%,rgba(99,102,241,.1) 0%,transparent 60%);pointer-events:none}
.hero-card::after{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(79,120,245,.18) 0%,transparent 65%);pointer-events:none}
.hero-greeting{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:4px}
.hero-name{font-size:18px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-.3px}
.hero-earn-lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.hero-earn-amt{font-size:56px;font-weight:900;letter-spacing:-2.5px;background:linear-gradient(135deg,#fff 60%,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:3px;animation:countUp .45s ease-out}
.hero-earn-unit{font-size:14px;font-weight:500;color:rgba(255,255,255,.45);-webkit-text-fill-color:rgba(255,255,255,.45)}
.hero-earn-sub{font-size:11px;color:rgba(255,255,255,.3);margin-top:4px}
.hero-row{display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07)}
.hero-stat{flex:1;text-align:center;padding:8px 0;border-radius:10px;background:rgba(255,255,255,.03)}
.hero-stat-val{font-size:20px;font-weight:900;color:var(--ac);letter-spacing:-.5px}
.hero-stat-lbl{font-size:10px;color:rgba(255,255,255,.3);margin-top:2px}

/* AI SmartMatch strip */
.ai-strip-wrap{margin-bottom:14px}
.ai-strip-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.ai-strip-title{font-size:13px;font-weight:800;color:var(--tx)}
.ai-strip-more{font-size:11px;color:var(--ac);font-weight:700;background:none;border:none;cursor:pointer;font-family:inherit}
.ai-strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ai-strip::-webkit-scrollbar{display:none}
.ai-card-sm{flex-shrink:0;width:200px;background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:14px;cursor:pointer;transition:.2s;position:relative}
.ai-card-sm:active{transform:scale(.98)}
.ai-card-sm.top{border-color:var(--ac);background:linear-gradient(135deg,#0d1535,#141d40)}
.ai-score-badge{position:absolute;top:10px;right:10px;font-size:10px;font-weight:900;padding:3px 7px;border-radius:8px;background:rgba(79,120,245,.2);color:var(--ac)}
.ai-score-badge.high{background:rgba(16,185,129,.2);color:var(--gn);box-shadow:0 0 8px rgba(16,185,129,.2)}
.ai-card-courier{font-size:10px;font-weight:800;padding:3px 9px;border-radius:12px;display:inline-block;margin-bottom:6px;letter-spacing:.3px}
.ai-card-area{font-size:16px;font-weight:900;color:var(--tx);margin-bottom:4px;letter-spacing:-.3px}
.ai-card-price{font-size:24px;font-weight:900;color:var(--tx);letter-spacing:-.8px}
.ai-card-reason{font-size:10px;color:var(--t2);margin-top:6px;line-height:1.45;padding:5px 0;border-top:1px solid var(--bd)}

/* Score ring SVG */
.score-ring-wrap{position:absolute;top:10px;right:10px}
.score-ring-wrap svg{width:32px;height:32px;transform:rotate(-90deg)}
.score-ring-track{fill:none;stroke:rgba(255,255,255,.07);stroke-width:3}
.score-ring-fill{fill:none;stroke-width:3;stroke-linecap:round;transition:stroke-dasharray .6s ease}
.score-ring-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900}

/* Trust badge S/A/B/C */
.trust-s{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px;font-weight:900;padding:3px 9px;border-radius:8px;box-shadow:0 2px 8px rgba(245,158,11,.35)}
.trust-a{background:linear-gradient(135deg,#6366f1,#4f78f5);color:#fff;font-size:10px;font-weight:900;padding:3px 9px;border-radius:8px;box-shadow:0 2px 8px rgba(99,102,241,.3)}
.trust-b{background:var(--bg4);color:var(--t2);font-size:10px;font-weight:900;padding:3px 9px;border-radius:8px;border:1px solid var(--bd2)}
.trust-c{background:var(--rdl);color:var(--rd);font-size:10px;font-weight:900;padding:3px 9px;border-radius:8px}
.trust-warn{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:5px 10px;border-radius:8px;background:rgba(239,68,68,.12);color:var(--rd);border:1px solid rgba(239,68,68,.2)}

/* Gas station widget */
.gas-widget{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r2);padding:16px;margin-bottom:12px}
.gas-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.gas-title{font-size:13px;font-weight:800;color:var(--tx);display:flex;align-items:center;gap:6px}
.gas-title svg{width:16px;height:16px;stroke:var(--or);fill:none;stroke-width:2}
.gas-refresh{font-size:11px;color:var(--ac);background:none;border:none;cursor:pointer;font-family:inherit;font-weight:700}
.gas-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)}
.gas-item:last-child{border-bottom:none}
.gas-name{font-size:13px;font-weight:700;color:var(--tx)}
.gas-addr{font-size:10px;color:var(--t3);margin-top:1px}
.gas-dist{font-size:11px;color:var(--t2)}
.gas-price{font-size:18px;font-weight:900;color:var(--tx)}
.gas-price-unit{font-size:11px;color:var(--t2);font-weight:500}
.gas-ai-tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;background:var(--gnl);color:var(--gn)}
.gas-nav-btn{font-size:11px;font-weight:700;padding:5px 12px;border-radius:10px;background:var(--acl);color:var(--ac);border:none;cursor:pointer;font-family:inherit}

/* NL input bar (quick post) */
.nl-bar{background:var(--bg3);border:1.5px solid var(--bd2);border-radius:var(--r2);padding:16px;margin-bottom:14px}
.nl-bar-title{font-size:12px;font-weight:700;color:var(--ac);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.nl-bar-title svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.nl-input-row{display:flex;gap:8px;align-items:stretch}
.nl-input{flex:1;padding:12px 14px;background:var(--bg4);border:1.5px solid var(--bd);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none;font-family:inherit}
.nl-input:focus{border-color:var(--ac)}
.nl-input::placeholder{color:var(--t3)}
.nl-parse-btn{padding:12px 16px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:var(--r);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0}
.nl-result{margin-top:10px;display:none}
.nl-result-tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--acl);color:var(--ac);margin:2px 3px 2px 0}

/* AI price suggest box */
.price-box{background:linear-gradient(135deg,#060d24,#0d1e4a);border:1px solid rgba(79,120,245,.2);border-radius:var(--r);padding:14px;margin-top:10px;display:none}
.price-box-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.price-box-lbl{font-size:12px;color:rgba(255,255,255,.5)}
.price-box-val{font-size:16px;font-weight:900;color:var(--ac)}
.price-box-rec{font-size:22px;font-weight:900;color:var(--gn)}
.price-box-tip{font-size:11px;color:rgba(255,255,255,.4);border-top:1px solid rgba(255,255,255,.07);margin-top:8px;padding-top:8px}
.price-fill-btn{width:100%;padding:10px;background:rgba(79,120,245,.15);color:var(--ac);border:1px solid rgba(79,120,245,.25);border-radius:var(--r);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}

/* DONWAY widget */
.donway-row{display:flex;gap:8px;margin-bottom:12px}
.donway-tile{flex:1;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);padding:14px;text-align:center}
.donway-val{font-size:22px;font-weight:900;color:var(--tx)}
.donway-lbl{font-size:10px;color:var(--t3);margin-top:3px}

/* 구인구직 job cards */
.job-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:8px;cursor:pointer;transition:.2s}
.job-card:active{background:var(--bg3)}
.job-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.job-type-badge{font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px}
.jt-full{background:rgba(16,185,129,.12);color:var(--gn)}
.jt-contract{background:var(--acl);color:var(--ac)}
.jt-part{background:var(--ywl);color:var(--yw)}
.job-title{font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px}
.job-agency{font-size:12px;color:var(--t2)}
.job-pay{font-size:20px;font-weight:900;color:var(--ac)}
.job-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
.job-foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)}
.job-dday{font-size:11px;font-weight:700;color:var(--yw)}
.job-views{font-size:11px;color:var(--t3)}

/* Resume cards */
.resume-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:8px;cursor:pointer;transition:.2s}
.resume-card:active{background:var(--bg3)}
.resume-name{font-size:16px;font-weight:800;color:var(--tx);margin-bottom:3px}
.resume-region{font-size:12px;color:var(--t2);margin-bottom:8px}
.resume-car{font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:var(--bg4);color:var(--t2);display:inline-block;margin-right:4px}

/* More page grid */
.more-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.more-item{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:18px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:.2s;text-align:center}
.more-item:active{background:var(--bg3)}
.more-item-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center}
.more-item-ico svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}
.more-item-lbl{font-size:13px;font-weight:700;color:var(--tx)}
.more-item-sub{font-size:11px;color:var(--t3)}

/* AI insight box */
.insight-box{background:linear-gradient(135deg,#060d24,#0e1e4a);border:1px solid rgba(79,120,245,.18);border-radius:var(--r);padding:14px;margin-bottom:12px}
.insight-row{display:flex;align-items:center;gap:10px}
.insight-ico{width:36px;height:36px;border-radius:10px;background:rgba(79,120,245,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.insight-ico svg{width:18px;height:18px;stroke:#a5b4fc;fill:none;stroke-width:2}
.insight-msg{font-size:13px;color:rgba(255,255,255,.8);line-height:1.5}
.insight-msg strong{color:#a5b4fc}

/* Urgent banner */
@keyframes urgentPulse{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,.4)}50%{box-shadow:0 0 0 8px rgba(249,115,22,0)}}
.urgent-card{background:linear-gradient(135deg,#1a0a00,#2d1200);border:1.5px solid var(--or);border-radius:var(--r2);padding:16px;margin-bottom:10px;animation:urgentPulse 2s infinite}
.urgent-tag{font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;background:var(--or);color:#fff;display:inline-block;margin-bottom:8px}
.urgent-area{font-size:20px;font-weight:900;color:#fff}
.urgent-price{font-size:36px;font-weight:900;color:var(--or);letter-spacing:-1px}

/* Quick action bar (agency home) */
.quick-bar{display:flex;gap:8px;margin-bottom:14px}
.quick-bar-btn{flex:1;padding:14px 10px;border-radius:var(--r);border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:5px;transition:.15s}
.quick-bar-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2}
.qb-primary{background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;box-shadow:0 4px 14px rgba(79,120,245,.35)}
.qb-urgent{background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;box-shadow:0 4px 14px rgba(249,115,22,.35)}
.qb-job{background:var(--bg3);color:var(--gn);border:1px solid rgba(16,185,129,.2)}

/* Popbill button */
.popbill-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;background:rgba(245,158,11,.12);color:var(--yw);border:1px solid rgba(245,158,11,.2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.popbill-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.popbill-issued{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--gn);padding:5px 12px;border-radius:8px;background:var(--gnl)}
</style>
</head>
<body>

<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24"><rect x="1" y="4" width="14" height="12" rx="1.5"/><path d="M15 8h3.5l2.5 3v4h-6V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg></div>
  <div class="ld-title">용<span style="color:#6d9cff">차</span></div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner"></div>
</div>

<div id="login-screen">
  <div class="login-card">
    <div class="login-mark"><svg viewBox="0 0 24 24"><rect x="1" y="4" width="14" height="12" rx="1.5"/><path d="M15 8h3.5l2.5 3v4h-6V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg></div>
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
          <div class="type-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8896b3" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
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
      <button class="notif-btn" onclick="_goPage('notifications')">
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
var _rgnFilter='전체',_platFilter='전체',_aiTabOn=false,_pgIdx=0,_pgSize=5;
var _revSimSel=[],_revSimPosts=[],_kakaoReady=false;
var _sliderActive=false;
var _gasStations=[],_smartScores={};
var ADMINS=['kimdh4790@gmail.com','skypjh1101@naver.com'];
var API_KEY='AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';
var REGIONS=['전체','부산','대구','서울','경기','인천','광주','대전','울산','경남','경북','전남','전북','충남','충북','강원','제주'];
var PLATFORMS=['전체','바로고','화물인','화물24','센디'];
var _MKT={'CJ대한통운':880,'한진택배':855,'롯데택배':860,'우체국':900,'쿠팡로지스틱스':960,'로젠택배':840};

var _ldTimer=setTimeout(function(){
  document.getElementById('ld').style.display='none';
  document.getElementById('login-screen').style.display='flex';
},3000);

firebase.initializeApp({
  apiKey:API_KEY,
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics',
  storageBucket:'mbti-logistics.appspot.com',
  messagingSenderId:'40761160761',
  appId:'1:40761160761:web:20545b610f03f534e949e8'
});
_db=firebase.firestore();
_auth=firebase.auth();

fetch('/api/kakao-config').then(function(r){return r.json();}).then(function(cfg){
  if(!cfg.key)return;
  var s=document.createElement('script');
  s.src='//dapi.kakao.com/v2/maps/sdk.js?appkey='+cfg.key+'&libraries=clusterer&autoload=false';
  s.onload=function(){kakao.maps.load(function(){_kakaoReady=true;});};
  document.head.appendChild(s);
}).catch(function(){});

_auth.onAuthStateChanged(function(u){
  clearTimeout(_ldTimer);
  document.getElementById('ld').style.display='none';
  if(u){
    _db.collection('yongcha_users').doc(u.uid).get().then(function(snap){
      if(snap.exists){_CU=Object.assign({uid:u.uid},snap.data());_showApp();}
      else if(ADMINS.indexOf(u.email||'')>=0){
        var doc={uid:u.uid,type:'admin',name:'관리자',email:u.email,phone:'051-711-3103',region:'부산',rating:5,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        _db.collection('yongcha_users').doc(u.uid).set(doc).then(function(){_CU=Object.assign({uid:u.uid},doc);_showApp();});
      } else {_showLogin();}
    }).catch(function(){_showLogin();});
  } else {_showLogin();}
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
      } else {
        btn.textContent='로그인';btn.disabled=false;
        err.textContent='용차 계정이 없어요. 회원가입 해주세요';err.style.display='block';
      }
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
  _buildNav();_goPage('home');
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
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  work:'<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
  wallet:'<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/><path d="M2 9h20"/></svg>',
  zap:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  briefcase:'<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2H10a2 2 0 00-2 2v2"/></svg>',
  fuel:'<svg viewBox="0 0 24 24"><path d="M3 22V2h10v20M3 14h10"/><path d="M17 14h1a2 2 0 012 2v2a2 2 0 002 2v0a2 2 0 002-2V6l-3-4"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/></svg>',
  scout:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>'
};

function _buildNav(){
  var t=_CU.type,tabs;
  if(t==='driver'){
    tabs=[{ico:'home',lbl:'홈',p:'home'},{ico:'truck',lbl:'공고',p:'posts'},
          {ico:'work',lbl:'내작업',p:'my_work'},{ico:'briefcase',lbl:'구인구직',p:'jobs'},
          {ico:'user',lbl:'내정보',p:'profile'}];
  } else if(t==='agency'){
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'list',lbl:'공고목록',p:'my_posts'},
          {ico:'plus',lbl:'공고등록',p:'add_post'},{ico:'briefcase',lbl:'구인구직',p:'jobs'},
          {ico:'grid',lbl:'더보기',p:'more'}];
  } else {
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'truck',lbl:'공고관리',p:'admin_posts'},
          {ico:'users',lbl:'사용자',p:'admin_users'},{ico:'user',lbl:'내정보',p:'profile'}];
  }
  document.getElementById('bnav').innerHTML=tabs.map(function(tb){
    return '<button class="nb" id="bnav-'+tb.p+'" onclick="_goPage(\\''+tb.p+'\\')">'+_SVG[tb.ico]+'<span>'+tb.lbl+'</span></button>';
  }).join('');
}

var _curPage='';
function _goPage(p){
  _curPage=p;
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var btn=document.getElementById('bnav-'+p);if(btn)btn.classList.add('on');
  var el=document.getElementById('content');el.scrollTop=0;
  if(p==='home')_pgHome(el);
  else if(p==='posts')_pgPosts(el);
  else if(p==='revsim')_pgRevSim(el);
  else if(p==='my_applies')_pgMyApplies(el);
  else if(p==='my_work')_pgMyWork(el);
  else if(p==='my_settle')_pgMySettle(el);
  else if(p==='profile')_pgProfile(el);
  else if(p==='my_posts')_pgMyPosts(el);
  else if(p==='add_post')_pgAddPost(el);
  else if(p==='drivers')_pgDrivers(el);
  else if(p==='settle_mgmt')_pgSettleMgmt(el);
  else if(p==='admin_posts')_pgAdminPosts(el);
  else if(p==='admin_users')_pgAdminUsers(el);
  else if(p==='notifications')_pgNotifications(el);
  else if(p==='jobs')_pgJobs(el);
  else if(p==='gas_stations')_pgGasStations(el);
  else if(p==='more')_pgMore(el);
  else if(p==='my_settle')_pgMySettle(el);
  else el.innerHTML='<div class="empty"><div class="empty-title">준비 중</div></div>';
}

function _yToast(msg,dur){
  var t=document.getElementById('toast');
  t.textContent=msg;t.style.opacity='1';
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

function _courierCls(c){
  if(!c)return '';
  if(c.indexOf('CJ')>=0)return '--cj';if(c.indexOf('한진')>=0)return '--hj';
  if(c.indexOf('롯데')>=0)return '--lt';if(c.indexOf('우체국')>=0)return '--up';
  if(c.indexOf('쿠팡')>=0)return '--cp';if(c.indexOf('로젠')>=0)return '--rz';
  return '';
}
function _courierColor(c){
  var m={'CJ대한통운':'#ff4d5e','한진택배':'#4897c8','롯데택배':'#ff8c4e','우체국':'#2dba9f','쿠팡로지스틱스':'#ff7043','로젠택배':'#a78bfa'};
  return m[c]||'#4f78f5';
}
function _rateVsMarket(price,courier){
  var avg=_MKT[courier]||880;
  return Math.round((price-avg)/avg*100);
}

function _makePostCard(d){
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
  div.className='pcard'+(cls?' pcard'+cls:'')+(isClosed?' closed':'');
  div.innerHTML=
    (d.urgent?'<div class="urgency-badge">긴급</div>':'')+
    '<div class="pc-top">'+
      '<div style="flex:1;min-width:0">'+
        '<div class="pc-courier" style="background:'+clr+'25;color:'+clr+'">'+(d.courier||'택배사')+'</div>'+
        '<div class="pc-area">'+(d.region||'')+' '+(d.area||'')+'</div>'+
        '<div class="pc-tags">'+
          (d.workShift?'<span class="tag">'+d.workShift+'</span>':'')+
          (d.vehicleType?'<span class="tag">'+d.vehicleType+'</span>':'')+
          (d.platform?'<span class="tag">'+d.platform+'</span>':'')+
        '</div>'+
      '</div>'+
      '<span class="pc-status '+stCls+'">'+stTxt+'</span>'+
    '</div>'+
    '<div class="pc-earn">'+
      '<span class="pc-price">'+_fmt(d.unitPrice||0)+'<small class="pc-unit">원/건</small></span>'+
      '<span class="riq-badge '+rpCls+'">시세'+rpTxt+'</span>'+
      (dayEst?'<span style="font-size:11px;color:var(--t2)">일~'+dayEst+'만원</span>':'')+
    '</div>'+
    '<div class="pc-minguar">최소보장 '+_fmt(minG)+'원/건 (시세×85%)</div>'+
    '<div class="pc-foot">'+
      '<span class="pc-agency">'+(d.agencyName||'대리점')+'</span>'+
      (!isClosed&&_CU&&_CU.type==='driver'?
        '<button class="quick-apply" onclick="event.stopPropagation();_quickApply(\\''+d.id+'\\',\\''+d.agencyId+'\\',\\''+d.agencyName+'\\')">'+
        _SVG.bolt+'지원</button>':'')+
    '</div>';
  if(!isClosed||(_CU&&_CU.type==='agency'&&d.agencyId===_CU.uid))div.onclick=function(){_showPostDetail(d);};
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
  }).then(function(ref){if(ref)_yToast('지원 완료! 대리점 연락을 기다려요');})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _showPostDetail(d){
  var rp=_rateVsMarket(d.unitPrice||0,d.courier);
  var minG=Math.round((d.unitPrice||0)*0.85);
  var clr=_courierColor(d.courier||'');
  var rpCls=rp>3?'riq-up':rp<-3?'riq-down':'riq-flat';
  var html=
    '<div class="modal-title">'+(d.region||'')+' '+(d.area||'')+'</div>'+
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">'+
      '<span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:'+clr+'25;color:'+clr+'">'+(d.courier||'')+'</span>'+
      '<span class="riq-badge '+rpCls+'">시세'+(rp>0?'+':'')+rp+'%</span>'+
      (d.urgent?'<span class="urgency-badge" style="position:relative;top:0;right:0;border-radius:20px">긴급</span>':'')+
    '</div>'+
    '<div class="stat-grid">'+
      '<div class="stat-card"><div class="stat-val" style="font-size:32px;color:var(--ac)">'+_fmt(d.unitPrice||0)+'</div><div class="stat-lbl">단가 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+_fmt(minG)+'</div><div class="stat-lbl">최소보장 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+(d.volume||0)+'</div><div class="stat-lbl">일 물량 (건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+(d.settleDay||15)+'일</div><div class="stat-lbl">정산일</div></div>'+
    '</div>'+
    (d.description?'<div class="card" style="font-size:13px;line-height:1.7;color:var(--t2)">'+(d.description||'')+'</div>':'')+
    (_CU&&_CU.type==='driver'&&d.status==='open'?
      '<button class="btn-main" onclick="_quickApply(\\''+d.id+'\\',\\''+d.agencyId+'\\',\\''+d.agencyName+'\\');_closeModal()">바로 지원하기</button>':
      _CU&&_CU.type==='agency'&&d.agencyId===_CU.uid?
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">'+
          '<button class="btn-main" onclick="_showApplicants(\\''+d.id+'\\')">지원자 확인</button>'+
          (d.status==='open'?'<button class="btn-rd" style="margin-top:0" onclick="_closePost(\\''+d.id+'\\')">공고 마감</button>':
          '<div style="text-align:center;font-size:12px;color:var(--t3);padding:8px">마감된 공고</div>')+
        '</div>':
      '<div style="text-align:center;font-size:13px;color:var(--t2);padding:16px">'+(d.status==='closed'?'마감된 공고예요':'')+'</div>');
  _showModal(html);
}

/* ── 홈 ───────────────────────────────────────────────────── */
function _pgHome(el){
  if(_CU.type==='driver')_pgHomeDriver(el);
  else if(_CU.type==='agency')_pgHomeAgency(el);
  else _pgHomeAdmin(el);
}

var _homeMapInst=null;
function _trustGradeCls(g){return g==='S'?'trust-s':g==='A'?'trust-a':g==='B'?'trust-b':'trust-c';}
function _timeOfDay(){var h=new Date().getHours();return h<12?'좋은 아침이에요':h<18?'오후에도 화이팅!':'수고하셨어요';}

function _pgHomeDriver(el){
  el.innerHTML=
    '<div class="hero-card">'+
      '<div class="hero-greeting">'+_timeOfDay()+'</div>'+
      '<div class="hero-name">'+(_CU.name||'기사')+'님</div>'+
      '<div class="hero-earn-lbl">오늘 예상 수익</div>'+
      '<div><span class="hero-earn-amt" id="hero-amt">집계중</span><span class="hero-earn-unit">원</span></div>'+
      '<div class="hero-earn-sub">완료 배차 기준 · AI 예측</div>'+
      '<div class="hero-row">'+
        '<div class="hero-stat"><div class="hero-stat-val" id="hero-done">—</div><div class="hero-stat-lbl">오늘 완료</div></div>'+
        '<div class="hero-stat"><div class="hero-stat-val" id="hero-rate">'+(_CU.acceptRate?Math.round(_CU.acceptRate)+'%':'—')+'</div><div class="hero-stat-lbl">완수율</div></div>'+
        '<div class="hero-stat"><div class="hero-stat-val"><span class="'+_trustGradeCls(_CU.trustGrade||'B')+'">'+(_CU.trustGrade||'B')+'</span></div><div class="hero-stat-lbl">신뢰등급</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="ai-strip-wrap">'+
      '<div class="ai-strip-hdr">'+
        '<span class="ai-strip-title"><svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:var(--ac);stroke:none;display:inline-block;vertical-align:-1px;margin-right:4px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>AI 추천 공고</span>'+
        '<button class="ai-strip-more" onclick="_goPage(\\'posts\\')">전체보기</button>'+
      '</div>'+
      '<div class="ai-strip" id="ai-strip"><div style="color:var(--t3);font-size:12px;padding:20px 0">AI 분석 중...</div></div>'+
    '</div>'+
    '<div class="gas-widget">'+
      '<div class="gas-hdr">'+
        '<span class="gas-title">'+_SVG.fuel+' 추천 주유소</span>'+
        '<button class="gas-refresh" onclick="_loadGasWidget()">새로고침</button>'+
      '</div>'+
      '<div id="gas-list"><div style="color:var(--t3);font-size:12px;padding:8px 0">위치 확인 중...</div></div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div class="page-title">내 주변 공고</div>'+
      '<button class="map-toggle" id="home-map-toggle" onclick="_toggleHomeMap()">'+_SVG.map+' 지도</button>'+
    '</div>'+
    '<div id="home-map" style="height:260px;display:none;border-radius:12px;overflow:hidden;border:1px solid var(--bd);margin-bottom:12px"></div>'+
    '<div id="home-posts"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _loadHomePosts();
  _loadTodayEarnings();
  _loadGasWidget();
}

function _animateNum(el,target,dur){
  if(!el)return;
  var start=0,step=target/Math.max(1,dur/16);
  var timer=setInterval(function(){
    start=Math.min(start+step,target);
    el.textContent=_fmt(Math.round(start));
    if(start>=target){clearInterval(timer);el.style.animation='countUp .35s ease-out';}
  },16);
}

function _loadTodayEarnings(){
  var today=new Date();today.setHours(0,0,0,0);
  _db.collection('yongcha_work').where('driverId','==',_CU.uid)
    .where('status','==','done').orderBy('completedAt','desc').limit(10).get()
  .then(function(snap){
    var total=0,cnt=0;
    snap.forEach(function(d){
      var w=d.data();
      if(w.completedAt){
        var dt=w.completedAt.toDate?w.completedAt.toDate():new Date(w.completedAt);
        if(dt>=today){total+=w.fare||0;cnt++;}
      }
    });
    var amtEl=document.getElementById('hero-amt');
    var doneEl=document.getElementById('hero-done');
    if(amtEl){if(total>0)_animateNum(amtEl,total,600);else amtEl.textContent='0';}
    if(doneEl)doneEl.textContent=cnt+'건';
  }).catch(function(){});
}

function _loadGasWidget(){
  var listEl=document.getElementById('gas-list');
  if(!listEl)return;
  if(!navigator.geolocation){
    listEl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">위치 서비스 필요</div>';
    return;
  }
  listEl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">위치 확인 중...</div>';
  navigator.geolocation.getCurrentPosition(function(pos){
    fetch('/api/yongcha/gas-stations',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,radius:5})
    }).then(function(r){return r.json();}).then(function(res){
      if(!res.ok||!res.stations||!res.stations.length){
        if(listEl)listEl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">주유소 정보 없음</div>';
        return;
      }
      _gasStations=res.stations;
      _renderGasWidget(res.stations.slice(0,3));
    }).catch(function(){if(listEl)listEl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">정보를 불러올 수 없어요</div>';});
  },function(){
    if(listEl)listEl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">위치 권한을 허용해주세요</div>';
  },{timeout:5000});
}

function _renderGasWidget(stations){
  var listEl=document.getElementById('gas-list');if(!listEl)return;
  listEl.innerHTML=stations.map(function(s,i){
    var isAI=i===0;
    return '<div class="gas-item">'+
      '<div style="flex:1;min-width:0">'+
        '<div class="gas-name">'+s.name+(isAI?' <span class="gas-ai-tag">AI 최적</span>':'')+'</div>'+
        '<div class="gas-addr">'+(s.address||'')+(s.dist?' · '+s.dist+'km':'')+'</div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<div><span class="gas-price">'+_fmt(s.price)+'</span><span class="gas-price-unit">원/L</span></div>'+
        (s.lat&&s.lng?'<button class="gas-nav-btn" onclick="_openNavTo('+s.lat+','+s.lng+',\\''+s.name.replace(/'/g,'')+'\\')" >내비</button>':'')+
      '</div>'+
    '</div>';
  }).join('');
}

function _openNavTo(lat,lng,name){
  var url='kakaomap://route?ep='+lat+','+lng+'&by=CAR';
  window.location.href=url;
  setTimeout(function(){
    window.location.href='https://map.kakao.com/link/to/'+encodeURIComponent(name)+','+lat+','+lng;
  },500);
}

function _toggleHomeMap(){
  var m=document.getElementById('home-map'),btn=document.getElementById('home-map-toggle');
  if(!m)return;
  if(m.style.display==='none'){
    m.style.display='block';btn.style.background='var(--acl)';btn.style.color='var(--ac)';
    if(_kakaoReady&&!_homeMapInst){
      var ll=new kakao.maps.LatLng(35.1795543,129.0756416);
      _homeMapInst=new kakao.maps.Map(m,{center:ll,level:7});
      _allPosts.slice(0,20).forEach(function(d){
        if(!d.lat||!d.lng)return;
        var mk=new kakao.maps.Marker({position:new kakao.maps.LatLng(d.lat,d.lng),map:_homeMapInst});
        kakao.maps.event.addListener(mk,'click',function(){_showPostDetail(d);});
      });
    }
  } else {m.style.display='none';btn.style.background='';btn.style.color='';}
}

function _loadHomePosts(){
  _db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    _allPosts=list;
    var el2=document.getElementById('home-posts');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">아직 등록된 공고가 없어요</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,5).forEach(function(d){el2.appendChild(_makePostCard(d));});
    if(_CU&&_CU.type==='driver')_runSmartMatch(list);
  }).catch(function(){});
}

function _runSmartMatch(posts){
  var strip=document.getElementById('ai-strip');if(!strip)return;
  var scored=posts.slice(0,10).map(function(p){
    var s=0;
    if(p.region===_CU.region)s+=30;
    var rp=_rateVsMarket(p.unitPrice||0,p.courier);
    if(rp>5)s+=25;else if(rp>0)s+=15;else if(rp>-5)s+=8;
    if(_CU.carType&&p.vehicleType&&p.vehicleType.indexOf(_CU.carType)>=0)s+=20;
    if(p.urgent)s+=15;
    if(p.volume&&p.volume>=100&&p.volume<=250)s+=10;
    return Object.assign({_score:Math.min(100,s)},p);
  }).sort(function(a,b){return b._score-a._score;});
  _renderAIStrip(scored.slice(0,6));
  fetch('/api/yongcha/smart-match',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({driver:{name:_CU.name,region:_CU.region,carType:_CU.carType,acceptRate:_CU.acceptRate,trustGrade:_CU.trustGrade},posts:posts.slice(0,10)})
  }).then(function(r){return r.json();}).then(function(res){
    if(!res.ok||!res.scores)return;
    var scoreMap={};res.scores.forEach(function(s){scoreMap[s.id]=s;});
    _smartScores=scoreMap;
    var enhanced=scored.map(function(p){
      var ai=scoreMap[p.id];
      return ai?Object.assign({},p,{_score:ai.score,_reason:ai.reason,_urgent:ai.urgent}):p;
    }).sort(function(a,b){return b._score-a._score;});
    _renderAIStrip(enhanced.slice(0,6));
  }).catch(function(){});
}

function _scoreRingSVG(score,isHigh){
  var r=13,c=2*Math.PI*r,fill=Math.round(c*(score/100));
  var clr=isHigh?'var(--gn)':'var(--ac)';
  return '<div class="score-ring-wrap" title="AI 매칭점수 '+score+'점">'+
    '<svg viewBox="0 0 32 32" width="32" height="32" style="transform:rotate(-90deg)">'+
      '<circle class="score-ring-track" cx="16" cy="16" r="'+r+'" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>'+
      '<circle cx="16" cy="16" r="'+r+'" fill="none" stroke="'+clr+'" stroke-width="3" stroke-linecap="round" stroke-dasharray="'+fill+' '+c+'" />'+
    '</svg>'+
    '<div class="score-ring-text" style="color:'+clr+'">'+score+'</div>'+
  '</div>';
}

function _renderAIStrip(posts){
  var strip=document.getElementById('ai-strip');if(!strip)return;
  if(!posts.length){strip.innerHTML='<div style="color:var(--t3);font-size:12px;padding:20px 0">추천 공고 없음</div>';return;}
  strip.innerHTML=posts.map(function(p,i){
    var clr=_courierColor(p.courier||'');
    var isHigh=(p._score||0)>=75;
    var reason=p._reason||(p.region===(_CU&&_CU.region)?'내 담당 지역'+(isHigh?' · 고단가':''):isHigh?'고단가':'');
    return '<div class="ai-card-sm'+(i===0?' top':'')+'" data-pid="'+p.id+'" style="position:relative">'+
      _scoreRingSVG(p._score||0,isHigh)+
      '<div style="padding-right:36px">'+
        '<span class="ai-card-courier" style="background:'+clr+'20;color:'+clr+'">'+(p.courier||'택배사')+'</span>'+
        '<div class="ai-card-area">'+(p.region||'')+' '+(p.area||'')+'</div>'+
        '<div class="ai-card-price">'+_fmt(p.unitPrice||0)+'<small style="font-size:11px;color:var(--t2);font-weight:400">원</small></div>'+
        (reason?'<div class="ai-card-reason">'+reason+'</div>':'')+
      '</div>'+
    '</div>';
  }).join('');
  strip.querySelectorAll('.ai-card-sm').forEach(function(card){
    var pid=card.getAttribute('data-pid');
    var post=posts.find(function(p){return p.id===pid;});
    if(post)card.onclick=function(){_showPostDetail(post);};
  });
}

function _callAICoach(){
  var bodyEl=document.getElementById('ai-body'),btn=document.getElementById('ai-btn');
  if(!bodyEl)return;
  bodyEl.textContent='분석 중...';if(btn){btn.disabled=true;btn.textContent='분석 중...';}
  fetch('/api/ai-coach',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({driver:{name:_CU.name,region:_CU.region,carType:_CU.carType},posts:_allPosts})
  }).then(function(r){return r.json();}).then(function(res){
    if(!res.ok||!res.data){bodyEl.textContent='분석을 불러올 수 없어요';return;}
    var d=res.data;
    bodyEl.innerHTML='<div style="margin-bottom:8px">'+(d.summary||'')+'</div>'+
      (d.reason?'<div class="ai-highlight">'+d.reason+'</div>':'')+
      (d.applyMsg?'<div style="font-size:12px;color:rgba(255,255,255,.5)">추천 메시지: '+d.applyMsg+'</div>':'');
    if(d.monthlyEst){
      var card=document.getElementById('ai-card');
      if(card&&!card.querySelector('.ai-est')){
        var e2=document.createElement('div');e2.className='ai-est';
        e2.innerHTML='<span class="ai-est-lbl">예상 월 수익</span><span class="ai-est-val">'+d.monthlyEst+'</span>';
        card.appendChild(e2);
      }
    }
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 분석';}
  }).catch(function(){
    bodyEl.textContent='AI 분석 오류';
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 시도';}
  });
}

function _pgHomeAgency(el){
  el.innerHTML=
    '<div style="margin-bottom:18px">'+
      '<div style="font-size:22px;font-weight:900;letter-spacing:-.5px;color:var(--tx)">'+_CU.name+'</div>'+
      '<div style="font-size:12px;color:var(--t2);margin-top:3px;display:flex;align-items:center;gap:6px">'+
        '<span style="width:7px;height:7px;border-radius:50%;background:var(--gn);display:inline-block;box-shadow:0 0 6px var(--gn);animation:pulseOr 2s infinite"></span>'+
        'AI 대리점 관제 라이브'+
      '</div>'+
    '</div>'+
    '<div class="stat-grid" id="agency-kpi">'+
      '<div class="stat-card kpi-gn"><div class="stat-val" style="color:var(--gn)" id="kpi-open">—</div><div class="stat-lbl">모집중</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-ac"><div class="stat-val" style="color:var(--ac)" id="kpi-matched">—</div><div class="stat-lbl">매칭완료</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-gn"><div class="stat-val" style="color:var(--gn)" id="kpi-done">—</div><div class="stat-lbl">오늘 완료</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-yw"><div class="stat-val" style="color:var(--yw)" id="kpi-settle">—</div><div class="stat-lbl">정산대기</div><div class="kpi-bar"></div></div>'+
    '</div>'+
    '<div class="insight-box" id="agency-insight">'+
      '<div class="insight-row">'+
        '<div class="insight-ico">'+_SVG.brain+'</div>'+
        '<div class="insight-msg" id="insight-msg">AI가 오늘 운영 현황을 분석하고 있어요...</div>'+
      '</div>'+
    '</div>'+
    '<div class="quick-bar">'+
      '<button class="quick-bar-btn qb-primary" onclick="_goPage(\\'add_post\\')">'+_SVG.plus+'<span>공고등록</span></button>'+
      '<button class="quick-bar-btn qb-urgent" onclick="_addUrgentPost()">'+_SVG.bolt+'<span>긴급공고</span></button>'+
      '<button class="quick-bar-btn qb-job" onclick="_goPage(\\'jobs\\')">'+_SVG.briefcase+'<span>기사채용</span></button>'+
    '</div>'+
    '<div class="section-lbl">DONWAY 정산 현황 (이달)</div>'+
    '<div class="donway-row">'+
      '<div class="donway-tile"><div class="donway-val" id="dw-total">—</div><div class="donway-lbl">이달 정산</div></div>'+
      '<div class="donway-tile"><div class="donway-val" id="dw-paid" style="color:var(--gn)">—</div><div class="donway-lbl">지급완료</div></div>'+
      '<div class="donway-tile"><div class="donway-val" id="dw-pending" style="color:var(--yw)">—</div><div class="donway-lbl">대기</div></div>'+
    '</div>'+
    '<div class="section-lbl">빠른 공고 재등록</div>'+
    '<div id="tmpl-area"><div style="color:var(--t3);font-size:12px">로딩 중...</div></div>';
  _loadAgencyKPI();
  _loadDonwayStats();
}

function _loadAgencyKPI(){
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).get().then(function(snap){
    var posts=[];snap.forEach(function(d){posts.push(Object.assign({id:d.id},d.data()));});
    var open=posts.filter(function(p){return p.status==='open';}).length;
    var matched=posts.filter(function(p){return p.status==='matched';}).length;
    var el1=document.getElementById('kpi-open'),el2=document.getElementById('kpi-matched');
    if(el1)el1.textContent=open;if(el2)el2.textContent=matched;
    var templates=posts.filter(function(p){return p.status==='open';}).slice(0,4);
    var ta=document.getElementById('tmpl-area');
    if(ta){
      if(!templates.length){ta.innerHTML='<div style="color:var(--t3);font-size:12px">등록된 공고가 없어요</div>';}
      else{
        ta.innerHTML='<div class="tmpl-grid">'+templates.map(function(t){
          return '<button class="tmpl-btn" onclick="_tmplPost(\\''+t.id+'\\')">'+
            '<div class="tmpl-area">'+(t.region||'')+' '+(t.area||'')+'</div>'+
            '<div class="tmpl-price">'+_fmt(t.unitPrice||0)+'원</div></button>';
        }).join('')+'</div>';
      }
    }
    var today=new Date();today.setHours(0,0,0,0);
    _db.collection('yongcha_work').where('agencyId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(30).get()
    .then(function(snap2){
      var done=0,settle=0;
      snap2.forEach(function(d){
        var w=d.data();
        if(w.completedAt){
          var dt=w.completedAt.toDate?w.completedAt.toDate():new Date(w.completedAt);
          if(dt>=today)done++;
        }
        if(!w.settleStatus||w.settleStatus==='pending')settle++;
      });
      var e3=document.getElementById('kpi-done'),e4=document.getElementById('kpi-settle');
      if(e3)e3.textContent=done+'건';if(e4)e4.textContent=settle+'건';
      var msg='';
      if(open===0)msg='모집중 공고가 없어요. <strong>지금 공고를 등록해보세요.</strong>';
      else if(settle>3)msg='정산 대기가 <strong>'+settle+'건</strong> 쌓여 있어요. 확인이 필요해요.';
      else if(done===0)msg='오늘 완료된 배차가 아직 없어요. 기사 매칭 현황을 확인하세요.';
      else msg='<strong>'+open+'개</strong> 공고 모집 중 · 오늘 <strong>'+done+'건</strong> 완료됐어요.';
      var im=document.getElementById('insight-msg');if(im)im.innerHTML=msg;
    }).catch(function(){});
  }).catch(function(){});
}

function _loadDonwayStats(){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth();
  var start=new Date(y,m,1);
  _db.collection('yongcha_work').where('agencyId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(100).get()
  .then(function(snap){
    var total=0,paid=0,pending=0;
    snap.forEach(function(d){
      var w=d.data();
      if(w.completedAt){
        var dt=w.completedAt.toDate?w.completedAt.toDate():new Date(w.completedAt);
        if(dt>=start){
          total+=w.fare||0;
          if(w.settleStatus==='paid')paid+=w.fare||0;
          else pending+=w.fare||0;
        }
      }
    });
    var fmtW=function(n){return Math.round(n/10000)+'만';};
    var et=document.getElementById('dw-total'),ep=document.getElementById('dw-paid'),epd=document.getElementById('dw-pending');
    if(et)et.textContent=total?fmtW(total)+'원':'—';
    if(ep)ep.textContent=paid?fmtW(paid)+'원':'—';
    if(epd)epd.textContent=pending?fmtW(pending)+'원':'—';
  }).catch(function(){});
}

function _addUrgentPost(){
  _goPage('add_post');
  setTimeout(function(){
    var urg=document.getElementById('ap-urgent');
    if(urg){urg.checked=true;_yToast('긴급 배차로 설정됐어요');}
  },300);
}

function _tmplPost(postId){
  _db.collection('yongcha_posts').doc(postId).get().then(function(snap){
    if(!snap.exists)return;
    var t=snap.data();
    _db.collection('yongcha_posts').add({
      agencyId:_CU.uid,agencyName:_CU.name,courier:t.courier||'CJ대한통운',
      platform:t.platform||null,region:t.region||'',area:t.area||'',
      unitPrice:t.unitPrice||0,volume:t.volume||0,workShift:t.workShift||'주간',
      settleDay:t.settleDay||15,description:t.description||'',status:'open',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){_yToast('공고가 재등록되었어요');_goPage('my_posts');})
    .catch(function(e){_yToast('오류: '+e.message);});
  });
}

function _pgHomeAdmin(el){
  el.innerHTML=
    '<div style="margin-bottom:18px">'+
      '<div style="font-size:22px;font-weight:900;letter-spacing:-.5px">관제 대시보드</div>'+
      '<div style="font-size:12px;color:var(--t2);margin-top:3px;display:flex;align-items:center;gap:6px">'+
        '<span style="width:7px;height:7px;border-radius:50%;background:var(--gn);display:inline-block;box-shadow:0 0 6px var(--gn);animation:pulseOr 2s infinite"></span>'+
        '실시간 플랫폼 현황'+
      '</div>'+
    '</div>'+
    '<div class="stat-grid" id="admin-kpi">'+
      '<div class="stat-card kpi-gn"><div class="stat-val" style="color:var(--gn)" id="ak-open">—</div><div class="stat-lbl">모집중 공고</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-ac"><div class="stat-val" style="color:var(--ac)" id="ak-driver">—</div><div class="stat-lbl">등록 기사</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-yw"><div class="stat-val" style="color:var(--yw)" id="ak-agency">—</div><div class="stat-lbl">대리점</div><div class="kpi-bar"></div></div>'+
      '<div class="stat-card kpi-rd"><div class="stat-val" style="color:var(--rd)" id="ak-total">—</div><div class="stat-lbl">전체 공고</div><div class="kpi-bar"></div></div>'+
    '</div>'+
    '<div class="insight-box" style="margin-bottom:14px">'+
      '<div class="insight-row">'+
        '<div class="insight-ico">'+_SVG.brain+'</div>'+
        '<div id="admin-insight-msg" class="insight-msg">플랫폼 현황 분석 중...</div>'+
      '</div>'+
    '</div>'+
    '<div class="section-lbl">택배사별 공고 현황</div>'+
    '<div id="admin-courier-stats" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px"></div>'+
    '<div class="section-lbl">공고 구역 지도</div>'+
    '<div id="admin-map" style="height:260px;border-radius:12px;overflow:hidden;border:1px solid var(--bd2);margin-bottom:12px;box-shadow:var(--sh)"></div>';
  Promise.all([_db.collection('yongcha_posts').get(),_db.collection('yongcha_users').get()])
  .then(function(res){
    var posts=[],users=[];
    res[0].forEach(function(d){posts.push(Object.assign({id:d.id},d.data()));});
    res[1].forEach(function(d){users.push(d.data());});
    var openPosts=posts.filter(function(p){return p.status==='open';});
    var drivers=users.filter(function(u){return u.type==='driver';});
    var agencies=users.filter(function(u){return u.type==='agency';});
    var e1=document.getElementById('ak-open'),e2=document.getElementById('ak-driver'),e3=document.getElementById('ak-agency'),e4=document.getElementById('ak-total');
    if(e1)e1.textContent=openPosts.length;if(e2)e2.textContent=drivers.length;if(e3)e3.textContent=agencies.length;if(e4)e4.textContent=posts.length;
    var msg=document.getElementById('admin-insight-msg');
    if(msg){
      var ratio=posts.length?Math.round(openPosts.length/posts.length*100):0;
      msg.textContent='현재 공고 매칭률 '+(100-ratio)+'% · 활성 기사 '+drivers.length+'명 · 대리점 '+agencies.length+'곳 운영 중';
    }
    var cStats=document.getElementById('admin-courier-stats');
    if(cStats){
      var byCourier={};
      posts.forEach(function(p){if(p.courier)byCourier[p.courier]=(byCourier[p.courier]||0)+1;});
      var sorted=Object.entries(byCourier).sort(function(a,b){return b[1]-a[1];});
      var maxCnt=sorted.length?sorted[0][1]:1;
      cStats.innerHTML=sorted.map(function(kv){
        var clr=_courierColor(kv[0]);var pct=Math.round(kv[1]/maxCnt*100);
        return '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'+
            '<span style="font-size:13px;font-weight:700;color:var(--tx)">'+kv[0]+'</span>'+
            '<span style="font-size:12px;font-weight:700;color:'+clr+'">'+kv[1]+'건</span>'+
          '</div>'+
          '<div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">'+
            '<div style="height:100%;width:'+pct+'%;background:'+clr+';border-radius:3px;transition:.4s"></div>'+
          '</div></div>';
      }).join('');
    }
    if(_kakaoReady){
      var mapEl=document.getElementById('admin-map');
      if(mapEl){
        var ll=new kakao.maps.LatLng(35.9,127.8);
        var adminMap=new kakao.maps.Map(mapEl,{center:ll,level:12});
        openPosts.forEach(function(d){
          var latLng=null;
          if(d.lat&&d.lng){latLng=new kakao.maps.LatLng(d.lat,d.lng);}
          else if(d.region&&_RGN_LL[d.region]){var r=_RGN_LL[d.region];latLng=new kakao.maps.LatLng(r[0]+(Math.random()*.04-.02),r[1]+(Math.random()*.04-.02));}
          if(!latLng)return;
          var clr=_courierColor(d.courier||'');
          new kakao.maps.Circle({center:latLng,radius:2000,strokeWeight:2,strokeColor:clr,strokeOpacity:.9,fillColor:clr,fillOpacity:.18,map:adminMap});
          var mk=new kakao.maps.Marker({position:latLng,map:adminMap});
          kakao.maps.event.addListener(mk,'click',function(){_showPostDetail(d);});
        });
      }
    }
  }).catch(function(){});
}

/* ── 공고 ─────────────────────────────────────────────────── */
var _postsMapInst=null,_postsMapCircles=[];
var _RGN_LL={
  '부산':[35.1795543,129.0756416],'인천':[37.4562557,126.7052062],'서울':[37.5665350,126.9779692],
  '대구':[35.8714354,128.6014249],'광주':[35.1595454,126.8526012],'대전':[36.3504119,127.3845475],
  '울산':[35.5383773,129.3113596],'경기':[37.4138,127.5183],'수원':[37.2636,127.0286],
  '성남':[37.4200,127.1265],'고양':[37.6585,126.8320],'용인':[37.2411,127.1776]
};
function _pgPosts(el){
  _pgIdx=0;_postsMapInst=null;_postsMapCircles=[];_aiTabOn=false;
  el.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div class="page-title">공고</div>'+
      '<button class="map-toggle on" id="view-toggle" onclick="_togglePostsMap()" style="background:var(--acl);color:var(--ac);border-color:var(--ac)">'+_SVG.map+' 지도</button>'+
    '</div>'+
    (_CU&&_CU.type==='driver'?
      '<div class="filter-row" style="margin-bottom:6px">'+
        '<button class="chip" id="chip-all" onclick="_setAITab(false)">전체</button>'+
        '<button class="chip" id="chip-ai" onclick="_setAITab(true)"><svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:currentColor;stroke:none;vertical-align:-1px;margin-right:2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>AI 추천</button>'+
      '</div>':'')+
    '<div class="filter-row" id="plat-row"></div>'+
    '<div class="filter-row" id="rgn-row"></div>'+
    '<div id="posts-map" style="height:280px;border-radius:12px;overflow:hidden;border:1px solid var(--bd2);margin-bottom:12px;box-shadow:var(--sh)"></div>'+
    '<div id="plist"></div>';
  _buildPlatChips();_buildRgnChips();_startPostsListener();
  if(_CU&&_CU.type==='driver'){
    var ca=document.getElementById('chip-all');if(ca)ca.classList.add('on');
  }
  setTimeout(_initPostsMapNow,200);
}
function _initPostsMapNow(){
  if(!_kakaoReady||_postsMapInst)return;
  var m=document.getElementById('posts-map');if(!m)return;
  var ll=new kakao.maps.LatLng(35.9,127.8);
  _postsMapInst=new kakao.maps.Map(m,{center:ll,level:12});
  _updatePostsMapCircles();
}
function _updatePostsMapCircles(){
  if(!_postsMapInst)return;
  _postsMapCircles.forEach(function(c){c.setMap(null);});
  _postsMapCircles=[];
  var seen={};
  _filteredPosts.slice(0,30).forEach(function(d){
    var latLng=null;
    if(d.lat&&d.lng){latLng=new kakao.maps.LatLng(d.lat,d.lng);}
    else if(d.region&&_RGN_LL[d.region]){var r=_RGN_LL[d.region];latLng=new kakao.maps.LatLng(r[0]+(Math.random()*.04-.02),r[1]+(Math.random()*.04-.02));}
    if(!latLng)return;
    var clr=_courierColor(d.courier||'');
    var circle=new kakao.maps.Circle({center:latLng,radius:1800,strokeWeight:2,strokeColor:clr,strokeOpacity:.8,fillColor:clr,fillOpacity:.15,map:_postsMapInst});
    var mk=new kakao.maps.Marker({position:latLng,map:_postsMapInst});
    kakao.maps.event.addListener(mk,'click',function(){_showPostDetail(d);});
    _postsMapCircles.push(circle);
    if(!seen[d.region]&&d.region&&_RGN_LL[d.region])seen[d.region]=latLng;
  });
  var pts=Object.values(seen);if(pts.length>0&&_postsMapInst){var b=new kakao.maps.LatLngBounds();pts.forEach(function(p){b.extend(p);});if(pts.length>1)_postsMapInst.setBounds(b);}
}

function _setAITab(on){
  _aiTabOn=on;_pgIdx=0;
  var ca=document.getElementById('chip-all'),cai=document.getElementById('chip-ai');
  if(ca)ca.classList.toggle('on',!on);
  if(cai)cai.classList.toggle('on',on);
  _applyFilters();
}
function _buildPlatChips(){
  var el=document.getElementById('plat-row');if(!el)return;
  el.innerHTML=PLATFORMS.map(function(p){
    return '<button class="chip'+(p===_platFilter?' on':'')+'" onclick="_setPlatFilter(\\''+p+'\\')">'+p+'</button>';
  }).join('');
}
function _buildRgnChips(){
  var el=document.getElementById('rgn-row');if(!el)return;
  el.innerHTML=REGIONS.map(function(r){
    return '<button class="chip'+(r===_rgnFilter?' on':'')+'" onclick="_setRgnFilter(\\''+r+'\\')">'+r+'</button>';
  }).join('');
}
function _setPlatFilter(p){_platFilter=p;_pgIdx=0;_buildPlatChips();_applyFilters();}
function _setRgnFilter(r){_rgnFilter=r;_pgIdx=0;_buildRgnChips();_applyFilters();}

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
    if(_rgnFilter!=='전체'&&d.region!==_rgnFilter)return false;
    if(_platFilter!=='전체'&&d.platform!==_platFilter)return false;
    return true;
  });
  if(_aiTabOn&&Object.keys(_smartScores).length){
    _filteredPosts=_filteredPosts.slice().sort(function(a,b){
      var sa=_smartScores[a.id]?_smartScores[a.id].score:0;
      var sb=_smartScores[b.id]?_smartScores[b.id].score:0;
      return sb-sa;
    });
  }
  _renderPostList();
}
function _renderPostList(){
  var el=document.getElementById('plist');if(!el)return;
  var total=_filteredPosts.length,start=_pgIdx*_pgSize;
  if(!total){el.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">조건을 바꿔보세요</div></div>';_updatePostsMapCircles();return;}
  el.innerHTML='';
  _filteredPosts.slice(start,start+_pgSize).forEach(function(d){el.appendChild(_makePostCard(d));});
  _updatePostsMapCircles();
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
  _renderPostList();document.getElementById('content').scrollTop=0;
}
function _togglePostsMap(){
  var m=document.getElementById('posts-map'),btn=document.getElementById('view-toggle');if(!m)return;
  var hidden=m.style.display==='none';
  if(hidden){
    m.style.display='block';btn.style.background='var(--acl)';btn.style.color='var(--ac)';btn.style.borderColor='var(--ac)';
    setTimeout(_initPostsMapNow,100);
  } else {m.style.display='none';btn.style.background='';btn.style.color='';btn.style.borderColor='';}
}

/* ── 내작업 (기사 3-step 배차) ──────────────────────────── */
function _pgMyWork(el){
  el.innerHTML='<div class="page-title">내 작업</div><div class="page-sub">진행 중인 배차</div>'+
    '<div id="work-content"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>'+
    '<div class="section-lbl">최근 완료 내역</div>'+
    '<div id="work-done"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','in',['accepted','arrived']).orderBy('createdAt','desc').limit(1).get()
  .then(function(snap){
    var el2=document.getElementById('work-content');if(!el2)return;
    if(snap.empty){
      el2.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">진행 중인 배차 없음</div><div class="empty-sub">공고에서 지원 후 수락을 기다려요</div></div>';
    } else {
      var doc=snap.docs[0];
      _renderWorkActive(el2,Object.assign({wid:doc.id},doc.data()));
    }
  }).catch(function(){});
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(5).get()
  .then(function(snap){
    var el3=document.getElementById('work-done');if(!el3)return;
    if(snap.empty){el3.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">완료된 배차가 없어요</div>';return;}
    el3.innerHTML='';
    snap.forEach(function(doc){
      var w=doc.data();
      var d2=document.createElement('div');d2.className='settle-item';
      d2.innerHTML='<div class="settle-top"><div>'+
        '<div style="font-size:14px;font-weight:700;margin-bottom:2px">'+(w.area||w.region||'배차')+'</div>'+
        '<div style="font-size:12px;color:var(--t2)">'+(w.courier||'')+(w.agencyName?' · '+w.agencyName:'')+'</div>'+
        '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+_timeAgo(w.completedAt)+'</div>'+
      '</div>'+
      '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:11px;font-weight:400;color:var(--t2)">원</small></div>'+
      '</div>';
      el3.appendChild(d2);
    });
  }).catch(function(){});
}

function _renderWorkActive(el,w){
  var step=w.step||0;
  var steps=[
    {lbl:'수락',icon:'<polyline points="20 6 9 17 4 12"/>'},
    {lbl:'현장도착',icon:'<path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>'},
    {lbl:'완료',icon:'<polyline points="20 6 9 17 4 12"/>'}
  ];
  var stepsHTML=steps.map(function(s,i){
    var cls=i<step?'step-done':i===step?'step-active':'step-pending';
    var inner=i<step?'<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2.5">'+s.icon+'</svg>':'<span class="step-num">'+(i+1)+'</span>';
    return '<div class="work-step '+cls+'"><div class="step-circle">'+inner+'</div><div class="step-lbl">'+s.lbl+'</div></div>';
  }).join('');

  var actionHTML='';
  if(step===0){
    actionHTML='<div class="slide-wrap" id="work-slider">'+
      '<div class="slide-fill" id="slider-fill"></div>'+
      '<div class="slide-handle" id="slider-handle"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>'+
      '<div class="slide-label">밀어서 출발 확인</div>'+
    '</div>';
  } else if(step===1){
    actionHTML='<button class="btn-main" style="margin-top:16px" onclick="_workArrived(\\''+w.wid+'\\')">현장 도착 확인</button>';
    if(w.lat&&w.lng)actionHTML+='<button class="map-toggle" style="width:100%;margin-top:8px;justify-content:center" onclick="_openNavTo('+w.lat+','+w.lng+',\\''+( w.area||'배차지').replace(/'/g,'')+'\\')" >'+_SVG.map+' 내비 안내</button>';
  } else if(step===2){
    actionHTML='<button class="btn-gn" onclick="_workDone(\\''+w.wid+'\\')">배차 완료 처리</button>';
  } else if(step>=3){
    var taxState=w.taxInvoiceState||'none';
    actionHTML='<div style="padding:14px;background:var(--gnl);border-radius:var(--r);text-align:center;margin-top:4px">'+
      '<div style="font-size:13px;font-weight:700;color:var(--gn)">배차 완료</div>'+
      '<div style="font-size:11px;color:var(--gn);opacity:.7;margin-top:2px">'+_fmt(w.fare||0)+'원 정산 대기 중</div>'+
    '</div>'+
    (taxState==='issued'?
      '<div class="popbill-issued" style="margin-top:8px;width:100%;justify-content:center">'+_SVG.check+' 세금계산서 발행완료</div>':
      '<button class="popbill-btn" style="width:100%;justify-content:center;margin-top:8px" onclick="_issuePopbill(\\''+w.wid+'\\')">'+_SVG.wallet+' 세금계산서 발행 (팝빌)</button>');
  }

  el.innerHTML=
    '<div class="work-action">'+
      '<div class="work-steps">'+stepsHTML+'</div>'+
      '<div class="work-fare">'+_fmt(w.fare||0)+'<span class="work-fare-unit">원</span></div>'+
      '<div class="work-route">'+(w.area||w.region||'배차 정보')+'</div>'+
      '<div class="work-meta">'+(w.courier||'')+(w.agencyName?' · '+w.agencyName:'')+'</div>'+
      actionHTML+
    '</div>';

  if(step===0){
    var handle=document.getElementById('slider-handle');
    var fill=document.getElementById('slider-fill');
    var wrap=document.getElementById('work-slider');
    if(handle&&wrap)_initSlider(handle,fill,wrap,function(){_workDepart(w.wid);});
  }
}

function _initSlider(handle,fill,wrap,onComplete){
  var startX=0,curX=0,dragging=false,done=false;
  var maxX=0;
  setTimeout(function(){maxX=wrap.offsetWidth-60;},50);

  function getMax(){return wrap.offsetWidth-60;}
  function onStart(x){
    if(done)return;
    dragging=true;startX=x-curX;
    handle.style.transition='none';fill.style.transition='none';
  }
  function onMove(x){
    if(!dragging||done)return;
    var nx=Math.max(0,Math.min(getMax(),x-startX));
    curX=nx;
    handle.style.left=(4+nx)+'px';
    fill.style.width=(60+nx)+'px';
    if(getMax()>0&&nx/getMax()>0.78)onDone();
  }
  function onEnd(){if(!dragging)return;dragging=false;if(!done)reset();}
  function reset(){
    curX=0;
    handle.style.transition='left .3s';fill.style.transition='width .3s';
    handle.style.left='4px';fill.style.width='60px';
  }
  function onDone(){
    done=true;dragging=false;
    handle.style.left=(4+getMax())+'px';
    fill.style.width=(60+getMax())+'px';
    setTimeout(onComplete,220);
  }
  handle.addEventListener('touchstart',function(e){e.preventDefault();onStart(e.touches[0].clientX);},{passive:false});
  handle.addEventListener('touchmove',function(e){e.preventDefault();onMove(e.touches[0].clientX);},{passive:false});
  handle.addEventListener('touchend',onEnd);
  handle.addEventListener('mousedown',function(e){onStart(e.clientX);});
  window.addEventListener('mousemove',function(e){if(dragging)onMove(e.clientX);});
  window.addEventListener('mouseup',onEnd);
}

function _workDepart(wid){
  _db.collection('yongcha_work').doc(wid).update({step:1,departedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('출발 확인!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}
function _workArrived(wid){
  _db.collection('yongcha_work').doc(wid).update({step:2,arrivedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('현장 도착 확인!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}
function _workDone(wid){
  _db.collection('yongcha_work').doc(wid).update({
    status:'done',step:3,settleStatus:'pending',
    completedAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('배차 완료!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 정산내역 (기사) ─────────────────────────────────────── */
function _pgMySettle(el){
  el.innerHTML='<div class="page-title">정산내역</div><div class="page-sub">내 배차 정산 현황</div>'+
    '<div id="settle-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({wid:d.id},d.data()));});
    var el2=document.getElementById('settle-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">정산 내역 없음</div><div class="empty-sub">완료된 배차가 없어요</div></div>';return;}
    var total=list.slice(0,_pgSize);
    el2.innerHTML='';
    var stMap={pending:'정산대기',confirmed:'확인완료',paid:'지급완료'};
    var stCls={pending:'ss-pending',confirmed:'ss-confirmed',paid:'ss-paid'};
    total.forEach(function(w){
      var d2=document.createElement('div');d2.className='settle-item';
      d2.innerHTML=
        '<div class="settle-top">'+
          '<div>'+
            '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:12px;font-weight:400;color:var(--t2)">원</small></div>'+
            '<div style="font-size:12px;color:var(--t2);margin-top:3px">'+(w.area||w.region||'')+(w.courier?' · '+w.courier:'')+'</div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+_timeAgo(w.completedAt)+'</div>'+
          '</div>'+
          '<span class="ss-badge '+(stCls[w.settleStatus||'pending'])+'">'+(stMap[w.settleStatus||'pending'])+'</span>'+
        '</div>';
      el2.appendChild(d2);
    });
    if(list.length>_pgSize){
      var more=document.createElement('div');more.style.textAlign='center';more.style.marginTop='8px';
      more.innerHTML='<span style="font-size:12px;color:var(--t3)">총 '+list.length+'건 중 '+_pgSize+'건 표시</span>';
      el2.appendChild(more);
    }
  }).catch(function(){});
}

/* ── 정산관리 (대리점) ───────────────────────────────────── */
function _pgSettleMgmt(el){
  el.innerHTML='<div class="page-title">정산관리</div><div class="page-sub">배차 정산 확인 및 지급</div>'+
    '<div id="settle-mgmt"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('agencyId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({wid:d.id},d.data()));});
    var el2=document.getElementById('settle-mgmt');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">정산 대기 없음</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,_pgSize).forEach(function(w){
      var d2=document.createElement('div');d2.className='settle-item';
      var isPending=!w.settleStatus||w.settleStatus==='pending';
      d2.innerHTML=
        '<div class="settle-top">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:2px">'+(w.driverName||'기사')+'</div>'+
            '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:12px;font-weight:400;color:var(--t2)">원</small></div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+(w.area||w.region||'')+'</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">'+
            (w.taxInvoiceState==='issued'?'<div class="popbill-issued">'+_SVG.check+' 계산서발행</div>':
              (w.settleStatus==='confirmed'||w.settleStatus==='paid'?
                '<button class="popbill-btn" style="margin-top:0" onclick="_issuePopbill(\\''+w.wid+'\\')">'+_SVG.wallet+' 세금계산서</button>':
                ''))+
            '<span class="ss-badge '+(w.settleStatus==='paid'?'ss-paid':w.settleStatus==='confirmed'?'ss-confirmed':'ss-pending')+'">'+
              (w.settleStatus==='paid'?'지급완료':w.settleStatus==='confirmed'?'확인완료':'대기')+'</span>'+
            (isPending?'<button style="font-size:12px;font-weight:700;padding:5px 14px;border-radius:8px;background:var(--gnl);color:var(--gn);border:1px solid rgba(16,185,129,.2);cursor:pointer" onclick="_confirmSettle(\\''+w.wid+'\\')">확인</button>':'')+
          '</div>'+
        '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}
function _confirmSettle(wid){
  _db.collection('yongcha_work').doc(wid).update({settleStatus:'confirmed',confirmedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('정산 확인 완료');_pgSettleMgmt(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 수익 시뮬레이터 ─────────────────────────────────────── */
function _pgRevSim(el){
  _revSimSel=[];
  el.innerHTML='<div class="card"><div style="color:var(--t2);font-size:13px">공고 로딩 중...</div></div>';
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
      '<div style="font-size:12px;color:rgba(255,255,255,.5)">이달 예상 수익</div>'+
      '<div class="revsim-result">'+(sel.length?total.toLocaleString():'—')+'<small style="font-size:16px;font-weight:400"> 만원</small></div>'+
      '<div style="font-size:12px;color:rgba(255,255,255,.45)">'+(sel.length?'선택 공고 '+sel.length+'개 기준 (월 '+monthDays+'일)':'공고를 2~3개 선택하세요')+'</div>'+
    '</div>'+
    (sel.length?_revSimBreakdown(sel,monthDays):'')+
    '<div class="section-lbl">공고 선택 (최대 3개)</div>'+
    (_revSimPosts.length?_revSimPosts.slice(0,10).map(function(d){
      var isSel=sel.indexOf(d.id)>=0;
      var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
      return '<div class="sim-item'+(isSel?' sel':'')+'" onclick="_toggleSimSel(\\''+d.id+'\\')">'+
        '<div class="sim-check">'+(isSel?_SVG.check:'')+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:14px;font-weight:700">'+(d.region||'')+' '+(d.area||'')+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(d.courier||'')+' · 일~'+dayEst+'만원</div>'+
        '</div>'+
        '<span style="font-size:16px;font-weight:900;color:var(--ac)">'+_fmt(d.unitPrice||0)+'<small style="font-size:10px;font-weight:400;color:var(--t2)">원</small></span>'+
      '</div>';
    }).join(''):'<div class="empty"><div class="empty-title">모집중 공고 없음</div></div>');
}
function _revSimBreakdown(sel,monthDays){
  var rows=sel.map(function(id){
    var p=_revSimPosts.find(function(x){return x.id===id;});if(!p)return '';
    var earn=Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000);
    return '<div class="revsim-row"><span>'+(p.region||'')+' '+(p.area||'')+'</span><span>'+earn.toLocaleString()+'만원</span></div>';
  });
  var total=sel.reduce(function(sum,id){
    var p=_revSimPosts.find(function(x){return x.id===id;});
    return sum+(p?Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000):0);
  },0);
  rows.push('<div class="revsim-row"><span>합계</span><span>'+total.toLocaleString()+'만원</span></div>');
  return '<div class="revsim-breakdown">'+rows.join('')+'</div>';
}
function _toggleSimSel(id){
  var idx=_revSimSel.indexOf(id);
  if(idx>=0){_revSimSel.splice(idx,1);}
  else if(_revSimSel.length<3){_revSimSel.push(id);}
  else{_yToast('최대 3개까지 선택 가능해요');return;}
  _renderRevSim(document.getElementById('content'));
}

/* ── 지원현황 ────────────────────────────────────────────── */
function _pgMyApplies(el){
  el.innerHTML='<div class="page-title">지원현황</div><div class="page-sub">내가 지원한 공고</div>'+
    '<div id="app-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_applies').where('driverId','==',_CU.uid).orderBy('appliedAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('app-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">지원 내역 없음</div><div class="empty-sub">공고 탭에서 지원해보세요</div></div>';return;}
    el2.innerHTML='';
    var stMap={pending:'검토중',accepted:'합격',rejected:'불합격',cancelled:'취소'};
    var stCls={pending:'riq-flat',accepted:'riq-up',rejected:'riq-down',cancelled:'tag'};
    list.slice(0,_pgSize).forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      d2.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:4px">'+(a.agencyName||'대리점')+'</div>'+
            '<div style="font-size:12px;color:var(--t2)">'+_timeAgo(a.appliedAt)+'</div>'+
          '</div>'+
          '<span class="riq-badge '+(stCls[a.status]||'tag')+'">'+(stMap[a.status]||a.status)+'</span>'+
        '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}

/* ── 프로필 ──────────────────────────────────────────────── */
function _pgProfile(el){
  el.innerHTML=
    '<div class="page-title">내 정보</div>'+
    '<div class="page-sub">'+(_CU.type==='driver'?'기사':'대리점')+' 계정</div>'+
    '<div class="card">'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">'+
        '<div style="width:52px;height:52px;border-radius:16px;background:var(--acl);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center">'+_SVG.user+'</div>'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800">'+(_CU.name||'—')+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(_CU.email||'')+'</div>'+
        '</div>'+
      '</div>'+
      '<div style="display:grid;gap:0">'+
        _pRow('지역',_CU.region||'미설정')+
        _pRow('연락처',_CU.phone||'미설정')+
        (_CU.type==='driver'?_pRow('차종',_CU.carType||'미설정'):'')+
      '</div>'+
    '</div>'+
    '<button class="btn-rd" onclick="_yLogout()">로그아웃</button>';
}
function _pRow(lbl,val){
  return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:13px;color:var(--t2)">'+lbl+'</span>'+
    '<span style="font-size:13px;font-weight:600">'+val+'</span></div>';
}

/* ── 공고목록 (대리점) ───────────────────────────────────── */
function _pgMyPosts(el){
  el.innerHTML='<div class="page-title">공고목록</div><div class="page-sub">내가 등록한 공고</div>'+
    '<div id="my-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).orderBy('createdAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('my-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">등록된 공고 없음</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d));});
    if(list.length>_pgSize){
      var more=document.createElement('div');more.style.textAlign='center';more.style.marginTop='8px';
      more.innerHTML='<span style="font-size:12px;color:var(--t3)">총 '+list.length+'건</span>';
      el2.appendChild(more);
    }
  });
}

/* ── 공고등록 ────────────────────────────────────────────── */
function _pgAddPost(el){
  el.innerHTML=
    '<div class="page-title">공고등록</div><div class="page-sub">ROUTEIQ 단가 기준</div>'+
    '<div class="nl-bar">'+
      '<div class="nl-bar-title">'+_SVG.bolt+' AI 빠른 입력 (자연어로 공고 자동완성)</div>'+
      '<div class="nl-input-row">'+
        '<input class="nl-input" id="nl-text" placeholder="예: 쿠팡 금정 120건 오늘저녁 18만">'+
        '<button class="nl-parse-btn" onclick="_runQuickPost()">AI 분석</button>'+
      '</div>'+
      '<div class="nl-result" id="nl-result"></div>'+
    '</div>'+
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
      '<div class="inp-wrap"><label class="inp-lbl">단가 (원/건)</label>'+
        '<div style="display:flex;gap:6px;align-items:center">'+
          '<input class="inp" id="ap-price" type="number" placeholder="시세 기준 입력" oninput="_showRIQ()" style="flex:1">'+
          '<button type="button" style="padding:12px 10px;background:var(--bg4);border:1px solid var(--bd);border-radius:var(--r);color:var(--ac);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap" onclick="_runPriceSuggest()">AI 시세</button>'+
        '</div>'+
      '</div>'+
      '<div id="ap-riq" style="font-size:12px;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:10px;display:none"></div>'+
      '<div class="price-box" id="price-box"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">일 물량 (건)</label><input class="inp" id="ap-vol" type="number" placeholder="예: 200"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">근무 형태</label>'+
        '<select class="inp" id="ap-shift"><option>주간</option><option>야간</option><option>주야간</option></select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">정산일</label>'+
        '<select class="inp" id="ap-settle"><option value="15">15일</option><option value="25">25일</option><option value="30">말일</option></select></div>'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+
        '<input type="checkbox" id="ap-urgent" style="width:18px;height:18px;accent-color:var(--or)">'+
        '<label for="ap-urgent" style="font-size:13px;font-weight:700;color:var(--or);cursor:pointer">긴급 배차 (오렌지 배지 표시)</label>'+
      '</div>'+
      '<div class="inp-wrap"><label class="inp-lbl">공고 내용</label><textarea class="inp" id="ap-desc" rows="3" placeholder="공고 상세 내용"></textarea></div>'+
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
  el.textContent='ROUTEIQ: 시세 '+(rp>0?'+':'')+rp+'% · 최소보장 '+_fmt(minG)+'원/건 (시세×85%)';
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
  var urgent=document.getElementById('ap-urgent').checked;
  var desc=(document.getElementById('ap-desc').value||'').trim();
  var err=document.getElementById('ap-err');
  if(!region||!area||!price||!vol){err.textContent='필수 항목을 모두 입력하세요';err.style.display='block';return;}
  err.style.display='none';
  _db.collection('yongcha_posts').add({
    agencyId:_CU.uid,agencyName:_CU.name,courier:courier,platform:platform||null,
    region:region,area:area,unitPrice:price,volume:vol,workShift:shift,settleDay:settle,
    urgent:urgent,description:desc,status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('공고가 등록되었어요');_goPage('my_posts');})
  .catch(function(e){err.textContent='오류: '+e.message;err.style.display='block';});
}

/* ── 기사목록 ────────────────────────────────────────────── */
function _pgDrivers(el){
  el.innerHTML='<div class="page-title">기사목록</div><div class="page-sub">등록된 기사 현황</div>'+
    '<div id="drv-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_users').where('type','==','driver').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('drv-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">기사 없음</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,_pgSize).forEach(function(u){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var gradeHTML='';
      if(u.grade==='A')gradeHTML='<span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(239,68,68,.2));color:var(--yw)">A등급</span>';
      else if(u.blacklist)gradeHTML='<span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;background:var(--rdl);color:var(--rd)">블랙</span>';
      d2.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<div style="width:40px;height:40px;border-radius:12px;background:var(--gnl);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center">'+_SVG.user+'</div>'+
          '<div><div style="font-size:15px;font-weight:700">'+u.name+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(u.region||'')+(u.carType?' · '+u.carType:'')+'</div></div>'+
        '</div>'+
        gradeHTML+
      '</div>';
      el2.appendChild(d2);
    });
  });
}

/* ── 관리자 ──────────────────────────────────────────────── */
function _pgAdminPosts(el){
  el.innerHTML='<div class="page-title">공고관리</div><div class="page-sub">전체 공고 현황</div>'+
    '<div id="adm-p"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_posts').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-p');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">공고 없음</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d));});
  });
}
function _pgAdminUsers(el){
  el.innerHTML='<div class="page-title">사용자관리</div><div class="page-sub">전체 사용자 현황</div>'+
    '<div id="adm-u"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_users').orderBy('createdAt','desc').limit(30).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-u');if(!el2)return;
    el2.innerHTML='';
    list.forEach(function(u){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      d2.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div>'+
          '<div style="font-size:14px;font-weight:700">'+u.name+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+u.email+' · '+(u.region||'')+'</div>'+
        '</div>'+
        '<span class="hdr-badge '+(u.type==='admin'?'badge-admin':u.type==='agency'?'badge-agency':'badge-driver')+'">'+
          (u.type==='admin'?'관리자':u.type==='agency'?'대리점':'기사')+'</span>'+
      '</div>';
      el2.appendChild(d2);
    });
  });
}

/* ── 지원자 관리 (대리점) ───────────────────────────────────── */
function _showApplicants(postId){
  _showModal(
    '<div class="modal-title">지원자 목록</div>'+
    '<div id="apply-list">'+
      '<div class="skel-card"><div class="skel skel-line skel-w60"></div><div class="skel skel-line sm skel-w40"></div></div>'+
      '<div class="skel-card"><div class="skel skel-line skel-w60"></div><div class="skel skel-line sm skel-w40"></div></div>'+
    '</div>'
  );
  _db.collection('yongcha_applies').where('postId','==',postId).orderBy('appliedAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({aid:d.id},d.data()));});
    var el2=document.getElementById('apply-list');if(!el2)return;
    if(!list.length){
      el2.innerHTML='<div class="empty">'+_SVG.users+'<div class="empty-title">지원자 없음</div><div class="empty-sub">아직 지원한 기사가 없어요</div></div>';
      return;
    }
    el2.innerHTML='';
    var stMap={pending:'검토중',accepted:'수락',rejected:'거절'};
    list.forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var isPending=a.status==='pending';
      var stCl=a.status==='accepted'?'riq-up':a.status==='rejected'?'riq-down':'riq-flat';
      d2.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(isPending?'10':'0')+'px">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:2px">'+(a.driverName||'기사')+'</div>'+
            '<div style="font-size:12px;color:var(--t2)">'+(a.driverPhone||'')+'</div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+_timeAgo(a.appliedAt)+'</div>'+
          '</div>'+
          '<span class="riq-badge '+stCl+'">'+(stMap[a.status]||a.status)+'</span>'+
        '</div>'+
        (isPending?
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
            '<button class="btn-gn" style="margin-top:0;font-size:13px;padding:10px" '+
              'onclick="_acceptApply(\\''+a.aid+'\\',\\''+a.driverName+'\\',\\''+a.driverPhone+'\\',\\''+a.driverId+'\\',\\''+postId+'\\')">수락</button>'+
            '<button class="btn-rd" style="margin-top:0;font-size:13px;padding:10px" '+
              'onclick="_rejectApply(\\''+a.aid+'\\',\\''+postId+'\\')">거절</button>'+
          '</div>':'');
      el2.appendChild(d2);
    });
  }).catch(function(e){_yToast('오류: '+e.message);});
}

function _acceptApply(applyId,driverName,driverPhone,driverId,postId){
  _db.collection('yongcha_posts').doc(postId).get().then(function(snap){
    if(!snap.exists){_yToast('공고를 찾을 수 없어요');return;}
    var post=snap.data();
    return _db.collection('yongcha_work').add({
      postId:postId,driverId:driverId,driverName:driverName,driverPhone:driverPhone,
      agencyId:_CU.uid,agencyName:_CU.name,
      courier:post.courier||'',region:post.region||'',area:post.area||'',
      fare:post.unitPrice||0,status:'accepted',step:0,settleStatus:'pending',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      return Promise.all([
        _db.collection('yongcha_applies').doc(applyId).update({status:'accepted'}),
        _db.collection('yongcha_posts').doc(postId).update({status:'matched'})
      ]);
    });
  }).then(function(){
    _yToast('배차가 확정되었어요!');
    _closeModal();
  }).catch(function(e){_yToast('오류: '+e.message);});
}

function _rejectApply(applyId,postId){
  _db.collection('yongcha_applies').doc(applyId).update({status:'rejected'})
  .then(function(){_yToast('거절 처리됐어요');_showApplicants(postId);})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _closePost(postId){
  _db.collection('yongcha_posts').doc(postId).update({status:'closed',closedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('공고가 마감됐어요');_closeModal();if(_curPage==='my_posts')_pgMyPosts(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── AI 빠른 공고등록 (NL 파서) ─────────────────────────── */
function _runQuickPost(){
  var text=(document.getElementById('nl-text')||{}).value||'';
  if(!text.trim()){_yToast('자연어 공고 내용을 입력하세요');return;}
  var btn=document.querySelector('.nl-parse-btn');
  if(btn){btn.disabled=true;btn.textContent='분석 중...';}
  fetch('/api/yongcha/quick-post',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({text:text.trim()})
  }).then(function(r){return r.json();}).then(function(res){
    if(btn){btn.disabled=false;btn.textContent='AI 분석';}
    if(!res.ok||!res.fields){_yToast('자동완성 실패. 직접 입력해주세요');return;}
    var f=res.fields;
    var fill=function(id,val){var e=document.getElementById(id);if(e&&val)e.value=val;};
    fill('ap-courier',f.courier);fill('ap-region',f.region);fill('ap-area',f.area);
    fill('ap-price',f.unitPrice);fill('ap-vol',f.volume);
    if(f.workShift){var sh=document.getElementById('ap-shift');if(sh)sh.value=f.workShift;}
    if(f.settleDay){var sd=document.getElementById('ap-settle');if(sd)sd.value=String(f.settleDay);}
    if(f.urgent){var ug=document.getElementById('ap-urgent');if(ug)ug.checked=true;}
    _showRIQ();
    var tags=[];
    if(f.courier)tags.push(f.courier);if(f.region)tags.push(f.region);
    if(f.area)tags.push(f.area);if(f.unitPrice)tags.push(_fmt(f.unitPrice)+'원');
    if(f.volume)tags.push(f.volume+'건');if(f.workShift)tags.push(f.workShift);
    var nr=document.getElementById('nl-result');
    if(nr){nr.style.display='block';nr.innerHTML=tags.map(function(t){return '<span class="nl-result-tag">'+t+'</span>';}).join('');}
    _yToast('자동완성 완료! 내용을 확인해주세요');
  }).catch(function(){
    if(btn){btn.disabled=false;btn.textContent='AI 분석';}
    _yToast('AI 분석 오류');
  });
}

/* ── AI 단가 추천 ────────────────────────────────────────── */
function _runPriceSuggest(){
  var courier=((document.getElementById('ap-courier')||{}).value)||'CJ대한통운';
  var region=((document.getElementById('ap-region')||{}).value)||'부산';
  var shift=((document.getElementById('ap-shift')||{}).value)||'주간';
  var vol=parseInt(((document.getElementById('ap-vol')||{}).value)||0)||0;
  var box=document.getElementById('price-box');if(!box)return;
  box.style.display='block';box.innerHTML='<div style="color:var(--t2);font-size:12px">AI 시세 분석 중...</div>';
  fetch('/api/yongcha/price-suggest',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({courier:courier,region:region,workShift:shift,volume:vol})
  }).then(function(r){return r.json();}).then(function(res){
    if(!res.ok||!res.data){box.innerHTML='<div style="color:var(--t3);font-size:12px">시세 정보 없음</div>';return;}
    var d=res.data;
    box.innerHTML=
      '<div class="price-box-row"><span class="price-box-lbl">시세 범위</span><span class="price-box-val">'+_fmt(d.minPrice)+'~'+_fmt(d.maxPrice)+'원</span></div>'+
      '<div class="price-box-row"><span class="price-box-lbl">AI 추천 단가</span><span class="price-box-rec">'+_fmt(d.recommended)+'원</span></div>'+
      (d.analysis?'<div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px">'+d.analysis+'</div>':'')+
      (d.tip?'<div class="price-box-tip">'+d.tip+'</div>':'')+
      '<button class="price-fill-btn" onclick="document.getElementById(\\'ap-price\\').value=\\''+d.recommended+'\\';_showRIQ()">이 단가 적용</button>';
  }).catch(function(){box.innerHTML='<div style="color:var(--t3);font-size:12px">조회 실패</div>';});
}

/* ── 팝빌 세금계산서 발행 ─────────────────────────────── */
function _issuePopbill(wid){
  if(!_CU||_CU.type!=='agency'){_yToast('대리점만 발행 가능해요');return;}
  _db.collection('yongcha_work').doc(wid).get().then(function(snap){
    if(!snap.exists){_yToast('배차 정보 없음');return;}
    var w=snap.data();
    if(w.taxInvoiceState==='issued'){_yToast('이미 발행된 세금계산서예요');return;}
    _db.collection('yongcha_work').doc(wid).update({taxInvoiceState:'pending'});
    return fetch('/api/yongcha/popbill-issue',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({workId:wid,agencyId:_CU.uid,driverId:w.driverId,driverName:w.driverName,fare:w.fare||0})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.ok){
        _db.collection('yongcha_work').doc(wid).update({taxInvoiceState:'issued'});
        _yToast('세금계산서 발행 완료!');
        if(_curPage==='settle_mgmt')_pgSettleMgmt(document.getElementById('content'));
        if(_curPage==='my_work')_pgMyWork(document.getElementById('content'));
      } else {
        _db.collection('yongcha_work').doc(wid).update({taxInvoiceState:'none'});
        _yToast('발행 실패: '+(res.error||'오류'));
      }
    });
  }).catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 구인구직 게시판 ─────────────────────────────────────── */
function _pgJobs(el){
  var isDriver=_CU&&_CU.type==='driver';
  el.innerHTML=
    '<div class="page-title">구인구직</div>'+
    '<div class="page-sub">기사↔대리점 매칭 게시판</div>'+
    '<div class="tabs" style="margin-bottom:16px">'+
      '<button class="tab on" id="tab-jobs" onclick="_switchJobTab(\\'jobs\\')">채용공고</button>'+
      '<button class="tab" id="tab-resumes" onclick="_switchJobTab(\\'resumes\\')">기사 이력서</button>'+
    '</div>'+
    '<div id="jobs-content"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>'+
    (isDriver?
      '<button class="btn-main" style="margin-top:8px" onclick="_showMyResumeForm()">내 이력서 등록/수정</button>':
      '<button class="btn-main" style="margin-top:8px" onclick="_showJobPostForm()">채용공고 등록</button>');
  _loadJobsTab('jobs');
}

function _switchJobTab(t){
  document.getElementById('tab-jobs').classList.toggle('on',t==='jobs');
  document.getElementById('tab-resumes').classList.toggle('on',t==='resumes');
  _loadJobsTab(t);
}

function _loadJobsTab(t){
  var el=document.getElementById('jobs-content');if(!el)return;
  el.innerHTML='<div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div>';
  if(t==='jobs'){
    _db.collection('yongcha_jobs').where('status','==','open').orderBy('createdAt','desc').limit(20).get()
    .then(function(snap){
      var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
      el.innerHTML='';
      if(!list.length){el.innerHTML='<div class="empty">'+_SVG.briefcase+'<div class="empty-title">채용공고 없음</div><div class="empty-sub">대리점이 채용공고를 등록하면 여기 나타나요</div></div>';return;}
      list.forEach(function(j){
        var typeCls=j.jobType==='full'?'jt-full':j.jobType==='contract'?'jt-contract':'jt-part';
        var typeLabel=j.jobType==='full'?'정직원':j.jobType==='contract'?'계약직':'파트타임';
        var d2=document.createElement('div');d2.className='job-card';
        d2.innerHTML=
          '<div class="job-card-top">'+
            '<span class="job-type-badge '+typeCls+'">'+typeLabel+'</span>'+
            '<span style="font-size:11px;color:var(--t3)">'+_timeAgo(j.createdAt)+'</span>'+
          '</div>'+
          '<div class="job-title">'+(j.title||'채용 공고')+'</div>'+
          '<div class="job-agency" style="margin-bottom:4px">'+(j.agencyName||'대리점')+'</div>'+
          '<div class="job-pay">'+_fmt(j.salary||0)+'<small style="font-size:12px;color:var(--t2);font-weight:400">원/월</small></div>'+
          '<div class="job-tags">'+
            (j.region?'<span class="tag">'+j.region+'</span>':'')+
            (j.carType?'<span class="tag">'+j.carType+'</span>':'')+
            (j.benefit?'<span class="tag">'+j.benefit+'</span>':'')+
          '</div>'+
          '<div class="job-foot">'+
            '<span class="job-dday">'+(j.deadline?'~'+j.deadline:'상시모집')+'</span>'+
            (_CU&&_CU.type==='driver'?'<button class="quick-apply" onclick="event.stopPropagation();_applyJob(\\''+j.id+'\\',\\''+j.agencyId+'\\',\\''+j.agencyName+'\\')">'+_SVG.bolt+'지원</button>':'')+
          '</div>';
        el.appendChild(d2);
      });
    }).catch(function(){el.innerHTML='<div class="empty"><div class="empty-title">불러오기 실패</div></div>';});
  } else {
    _db.collection('yongcha_resumes').where('public','==',true).orderBy('updatedAt','desc').limit(20).get()
    .then(function(snap){
      var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
      el.innerHTML='';
      if(!list.length){el.innerHTML='<div class="empty">'+_SVG.user+'<div class="empty-title">등록된 이력서 없음</div><div class="empty-sub">기사들이 이력서를 등록하면 여기 나타나요</div></div>';return;}
      list.forEach(function(r){
        var d2=document.createElement('div');d2.className='resume-card';
        d2.innerHTML=
          '<div style="display:flex;align-items:flex-start;justify-content:space-between">'+
            '<div>'+
              '<div class="resume-name">'+(r.name||'기사')+'</div>'+
              '<div class="resume-region">'+(r.region||'')+(r.carType?' · '+r.carType:'')+(r.experience?' · 경력 '+r.experience+'년':'')+'</div>'+
              '<div>'+
                (r.carTypes||[]).map(function(c){return '<span class="resume-car">'+c+'</span>';}).join('')+
              '</div>'+
            '</div>'+
            (_CU&&_CU.type==='agency'?
              '<button class="quick-apply" onclick="event.stopPropagation();_scoutDriver(\\''+r.uid+'\\',\\''+r.name+'\\')">'+_SVG.bolt+'스카우트</button>':
              '<span style="font-size:11px;color:var(--t3)">'+_timeAgo(r.updatedAt)+'</span>')+
          '</div>';
        el.appendChild(d2);
      });
    }).catch(function(){el.innerHTML='<div class="empty"><div class="empty-title">불러오기 실패</div></div>';});
  }
}

function _applyJob(jobId,agencyId,agencyName){
  if(!_CU||_CU.type!=='driver'){_yToast('기사만 지원 가능해요');return;}
  _db.collection('yongcha_job_applies').add({
    jobId:jobId,driverId:_CU.uid,driverName:_CU.name,driverPhone:_CU.phone||'',
    agencyId:agencyId,agencyName:agencyName,status:'pending',
    appliedAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('지원 완료!');}).catch(function(e){_yToast('오류: '+e.message);});
}

function _scoutDriver(driverUid,driverName){
  if(!_CU||_CU.type!=='agency'){_yToast('대리점만 스카우트 가능해요');return;}
  _db.collection('yongcha_scouts').add({
    agencyId:_CU.uid,agencyName:_CU.name,driverId:driverUid,driverName:driverName,
    status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast(driverName+'님께 스카우트 제안을 보냈어요');})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _showMyResumeForm(){
  _showModal(
    '<div class="modal-title">내 이력서 등록</div>'+
    '<div class="inp-wrap"><label class="inp-lbl">차종 (쉼표로 구분)</label><input class="inp" id="rv-car" placeholder="예: 1톤트럭, 다마스"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">경력 (년)</label><input class="inp" id="rv-exp" type="number" placeholder="예: 3"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">선호 지역</label><input class="inp" id="rv-rgn" placeholder="예: 부산 해운대"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">한줄 소개</label><input class="inp" id="rv-bio" placeholder="내 강점을 한줄로"></div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><input type="checkbox" id="rv-pub" checked style="width:18px;height:18px;accent-color:var(--ac)"><label for="rv-pub" style="font-size:13px;cursor:pointer">이력서 공개 (대리점에게 노출)</label></div>'+
    '<button class="btn-main" onclick="_submitResume()">이력서 등록</button>'
  );
}

function _submitResume(){
  var car=(document.getElementById('rv-car')||{}).value||'';
  var exp=parseInt((document.getElementById('rv-exp')||{}).value)||0;
  var rgn=(document.getElementById('rv-rgn')||{}).value||'';
  var bio=(document.getElementById('rv-bio')||{}).value||'';
  var pub=document.getElementById('rv-pub')?document.getElementById('rv-pub').checked:true;
  _db.collection('yongcha_resumes').doc(_CU.uid).set({
    uid:_CU.uid,name:_CU.name,region:rgn||_CU.region,carType:_CU.carType||car.split(',')[0].trim(),
    carTypes:car.split(',').map(function(c){return c.trim();}).filter(Boolean),
    experience:exp,bio:bio,public:pub,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true}).then(function(){_yToast('이력서가 등록됐어요');_closeModal();})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _showJobPostForm(){
  _showModal(
    '<div class="modal-title">채용공고 등록</div>'+
    '<div class="inp-wrap"><label class="inp-lbl">공고 제목</label><input class="inp" id="jp-title" placeholder="예: 부산 해운대 배송 기사 채용"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">고용 형태</label>'+
      '<select class="inp" id="jp-type"><option value="full">정직원</option><option value="contract">계약직</option><option value="part">파트타임</option></select></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">월급 (원)</label><input class="inp" id="jp-sal" type="number" placeholder="예: 3500000"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">지역</label><input class="inp" id="jp-rgn" placeholder="예: 부산 해운대"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">필요 차종</label><input class="inp" id="jp-car" placeholder="예: 1톤트럭"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">복리후생</label><input class="inp" id="jp-ben" placeholder="예: 4대보험, 식비지원"></div>'+
    '<div class="inp-wrap"><label class="inp-lbl">마감일 (예: 2026-09-30)</label><input class="inp" id="jp-ddl" placeholder="YYYY-MM-DD"></div>'+
    '<button class="btn-main" onclick="_submitJobPost()">공고 등록</button>'
  );
}

function _submitJobPost(){
  var title=(document.getElementById('jp-title')||{}).value||'';
  var type=(document.getElementById('jp-type')||{}).value||'full';
  var sal=parseInt((document.getElementById('jp-sal')||{}).value)||0;
  var rgn=(document.getElementById('jp-rgn')||{}).value||'';
  var car=(document.getElementById('jp-car')||{}).value||'';
  var ben=(document.getElementById('jp-ben')||{}).value||'';
  var ddl=(document.getElementById('jp-ddl')||{}).value||'';
  if(!title||!sal){_yToast('제목과 급여를 입력하세요');return;}
  _db.collection('yongcha_jobs').add({
    agencyId:_CU.uid,agencyName:_CU.name,title:title,jobType:type,salary:sal,
    region:rgn||_CU.region,carType:car,benefit:ben,deadline:ddl,status:'open',
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('채용공고가 등록됐어요');_closeModal();_loadJobsTab('jobs');})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 더보기 (대리점) ─────────────────────────────────────── */
function _pgMore(el){
  var items=[
    {ico:'list',lbl:'공고목록',sub:'등록 공고 관리',p:'my_posts',bg:'var(--acl)',clr:'var(--ac)'},
    {ico:'users',lbl:'기사목록',sub:'기사 현황',p:'drivers',bg:'var(--gnl)',clr:'var(--gn)'},
    {ico:'wallet',lbl:'정산관리',sub:'배차 정산',p:'settle_mgmt',bg:'var(--ywl)',clr:'var(--yw)'},
    {ico:'brain',lbl:'AI 코치',sub:'노선 분석',p:'admin_posts',bg:' rgba(79,120,245,.1)',clr:'var(--ac)'},
    {ico:'user',lbl:'내 정보',sub:'계정 설정',p:'profile',bg:'var(--bg3)',clr:'var(--t2)'},
    {ico:'zap',lbl:'알림',sub:'활동 내역',p:'notifications',bg:'var(--orl)',clr:'var(--or)'}
  ];
  el.innerHTML=
    '<div class="page-title">더보기</div>'+
    '<div class="page-sub">'+(new Date().getMonth()+1)+'월 관리 메뉴</div>'+
    '<div class="more-grid">'+
    items.map(function(it){
      return '<div class="more-item" onclick="_goPage(\\''+it.p+'\\')">'+
        '<div class="more-item-ico" style="background:'+it.bg+';color:'+it.clr+'">'+_SVG[it.ico]+'</div>'+
        '<div class="more-item-lbl">'+it.lbl+'</div>'+
        '<div class="more-item-sub">'+it.sub+'</div>'+
      '</div>';
    }).join('')+
    '</div>';
}

/* ── 주유소 전체 페이지 ──────────────────────────────────── */
function _pgGasStations(el){
  el.innerHTML=
    '<div class="page-title">주변 주유소</div>'+
    '<div class="page-sub">AI 추천 · 가격 기준 정렬</div>'+
    '<div class="gas-widget" style="margin-top:8px">'+
      '<div id="full-gas-list"><div style="color:var(--t3);font-size:13px;padding:16px 0;text-align:center">위치 확인 중...</div></div>'+
    '</div>';
  if(_gasStations.length){
    _renderFullGasStations(_gasStations);return;
  }
  if(!navigator.geolocation){
    document.getElementById('full-gas-list').innerHTML='<div style="color:var(--t3);font-size:13px;padding:16px 0;text-align:center">위치 서비스를 허용해주세요</div>';
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos){
    fetch('/api/yongcha/gas-stations',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,radius:10})
    }).then(function(r){return r.json();}).then(function(res){
      if(res.ok&&res.stations){_gasStations=res.stations;_renderFullGasStations(res.stations);}
      else{document.getElementById('full-gas-list').innerHTML='<div style="color:var(--t3);font-size:13px;padding:16px 0;text-align:center">주유소 정보 없음</div>';}
    }).catch(function(){document.getElementById('full-gas-list').innerHTML='<div style="color:var(--t3);font-size:13px;padding:16px 0;text-align:center">불러오기 실패</div>';});
  },function(){
    document.getElementById('full-gas-list').innerHTML='<div style="color:var(--t3);font-size:13px;padding:16px 0;text-align:center">위치 권한 필요</div>';
  });
}

function _renderFullGasStations(stations){
  var el=document.getElementById('full-gas-list');if(!el)return;
  el.innerHTML=stations.map(function(s,i){
    var isAI=i===0,isCheap=i===1;
    return '<div class="gas-item">'+
      '<div style="flex:1;min-width:0">'+
        '<div class="gas-name">'+s.name+
          (isAI?' <span class="gas-ai-tag">AI 최적</span>':'')+
          (isCheap?' <span class="gas-ai-tag" style="background:var(--ywl);color:var(--yw)">최저가</span>':'')+
        '</div>'+
        '<div class="gas-addr">'+(s.address||'')+(s.dist?' · '+s.dist+'km':'')+'</div>'+
        (s.aiScore?'<div style="font-size:10px;color:var(--t3);margin-top:1px">AI점수 '+Math.round(s.aiScore)+'점</div>':'')+
      '</div>'+
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">'+
        '<div><span class="gas-price">'+_fmt(s.price)+'</span><span class="gas-price-unit">원/L</span></div>'+
        (s.lat&&s.lng?'<button class="gas-nav-btn" onclick="_openNavTo('+s.lat+','+s.lng+',\\''+s.name.replace(/'/g,'')+'\\')" >내비</button>':'')+
      '</div>'+
    '</div>';
  }).join('');
}

/* ── 알림 ──────────────────────────────────────────────────── */
function _pgNotifications(el){
  el.innerHTML='<div class="page-title">알림</div><div class="page-sub">최근 활동</div>'+
    '<div id="notif-list">'+
      '<div class="skel-card"><div class="skel skel-line skel-w80"></div><div class="skel skel-line sm skel-w40"></div></div>'+
    '</div>';
  var q=_CU.type==='agency'?
    _db.collection('yongcha_applies').where('agencyId','==',_CU.uid).orderBy('appliedAt','desc').limit(10):
    _db.collection('yongcha_applies').where('driverId','==',_CU.uid).orderBy('appliedAt','desc').limit(10);
  q.get().then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('notif-list');if(!el2)return;
    if(!list.length){
      el2.innerHTML='<div class="empty">'+_SVG.bolt+'<div class="empty-title">알림 없음</div><div class="empty-sub">새 지원자나 배차 확정 시 알림이 와요</div></div>';
      return;
    }
    el2.innerHTML='';
    list.forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var msg=_CU.type==='agency'?
        '<b>'+(a.driverName||'기사')+'</b>님이 지원했어요':
        (a.status==='accepted'?'배차가 확정됐어요':a.status==='rejected'?'지원이 거절됐어요':'지원이 접수됐어요');
      d2.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div style="font-size:14px;font-weight:600">'+msg+'</div>'+
        '<div style="font-size:11px;color:var(--t3)">'+_timeAgo(a.appliedAt)+'</div>'+
      '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}
</script>
</body>
</html>
`;
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

    // ── SmartMatch AI: driver job scoring ─────────────────────
    if (path === '/api/yongcha/smart-match' && method === 'POST') {
      try {
        const { driver, posts } = await request.json();
        const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no key' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

        const MKT = { 'CJ대한통운': 880, '한진택배': 855, '롯데택배': 860, '우체국': 900, '쿠팡로지스틱스': 960, '로젠택배': 840 };
        const postList = (posts || []).slice(0, 10).map(p => {
          const avg = MKT[p.courier] || 880;
          const rp = Math.round((p.unitPrice - avg) / avg * 100);
          return `id:${p.id}|${p.courier} ${p.region} ${p.area}|단가:${p.unitPrice}원(시세${rp>=0?'+':''}${rp}%)|물량:${p.volume}건|${p.workShift||''}|${p.urgent?'긴급':'일반'}`;
        }).join('\n');

        const prompt = `당신은 한국 택배 기사 배차 최적화 AI입니다. 기사 프로필을 분석해 각 공고에 0-100 매칭 점수를 부여하고 핵심 추천 이유를 제공하세요.

기사 프로필:
- 이름: ${driver.name||'기사'}
- 지역: ${driver.region||'미설정'}
- 차종: ${driver.carType||'미설정'}
- 완수율: ${driver.acceptRate||'미확인'}%
- 신뢰등급: ${driver.trustGrade||'C'}

공고 목록:
${postList||'공고 없음'}

각 공고 id에 대해 JSON 배열 반환 (다른 텍스트 없이):
[{"id":"공고id","score":85,"reason":"이 구역 경험 풍부·시세+8%","urgent":false},...]

score 기준: 지역일치(30점)+단가우수(25점)+차종적합(20점)+긴급(15점)+물량적합(10점)`;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const raw = data.content?.[0]?.text || '[]';
        let scores = [];
        try { scores = JSON.parse(raw); } catch(e) { const m = raw.match(/\[[\s\S]*\]/); if(m) try { scores = JSON.parse(m[0]); } catch(e2) {} }
        return new Response(JSON.stringify({ ok: true, scores }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // ── Quick Post NL Parser: 자연어 → 공고 필드 ────────────────
    if (path === '/api/yongcha/quick-post' && method === 'POST') {
      try {
        const { text } = await request.json();
        const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no key' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

        const prompt = `한국 택배 대리점 소장이 입력한 자연어에서 배차 공고 필드를 추출하세요.

입력: "${text}"

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "courier": "CJ대한통운|한진택배|롯데택배|우체국|쿠팡로지스틱스|로젠택배 중 하나",
  "region": "지역명(부산/서울/대구/경기 등)",
  "area": "세부 구역명",
  "volume": 숫자(건수),
  "unitPrice": 숫자(원, 만원 단위면 10000곱하기),
  "workShift": "주간|야간|새벽|당일",
  "settleDay": 숫자(정산일, 기본15),
  "urgent": true|false
}

예시: "쿠팡 금정 120건 오늘저녁 18만" → courier:쿠팡로지스틱스, region:부산, area:금정구, volume:120, unitPrice:180000, workShift:야간, urgent:true`;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const raw = data.content?.[0]?.text || '{}';
        let fields = {};
        try { fields = JSON.parse(raw); } catch(e) { const m = raw.match(/\{[\s\S]*\}/); if(m) try { fields = JSON.parse(m[0]); } catch(e2) {} }
        return new Response(JSON.stringify({ ok: true, fields }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // ── Price Suggest AI: 단가 최적화 추천 ───────────────────────
    if (path === '/api/yongcha/price-suggest' && method === 'POST') {
      try {
        const { courier, region, workShift, volume } = await request.json();
        const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no key' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

        const MKT = { 'CJ대한통운': 880, '한진택배': 855, '롯데택배': 860, '우체국': 900, '쿠팡로지스틱스': 960, '로젠택배': 840 };
        const mktBase = MKT[courier] || 880;
        const prompt = `한국 택배 용차 단가 전문가입니다. 다음 조건의 적정 단가를 분석하세요.

조건:
- 택배사: ${courier||'CJ대한통운'}
- 지역: ${region||'부산'}
- 근무형태: ${workShift||'주간'}
- 물량: ${volume||100}건
- 시장 기준 단가: 건당 ${mktBase}원

다음 JSON만 반환하세요:
{
  "minPrice": 최저 적정 단가(숫자, 원 단위),
  "maxPrice": 최고 적정 단가(숫자, 원 단위),
  "recommended": 추천 단가(숫자, 원 단위),
  "marketRate": ${mktBase},
  "analysis": "2문장 이내 분석 (구체적 금액 포함)",
  "tip": "지원율 높이는 팁 1줄"
}`;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const raw = data.content?.[0]?.text || '{}';
        let result = {};
        try { result = JSON.parse(raw); } catch(e) { const m = raw.match(/\{[\s\S]*\}/); if(m) try { result = JSON.parse(m[0]); } catch(e2) {} }
        return new Response(JSON.stringify({ ok: true, data: result }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // ── Gas Stations: OPINET 주유소 정보 프록시 ──────────────────
    if (path === '/api/yongcha/gas-stations' && method === 'POST') {
      try {
        const { lat, lng, radius } = await request.json();
        const apiKey = env.OPINET_API_KEY;
        if (!apiKey) {
          // 더미 데이터 반환 (API 키 없을 때)
          return new Response(JSON.stringify({ ok: true, stations: [
            { name: '근처 주유소', address: '위치 정보 로드 중', price: 1720, dist: 0.3 },
            { name: '알뜰 주유소', address: '가까운 알뜰 주유소', price: 1680, dist: 1.1 }
          ]}), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        // OPINET 주변 주유소 조회 API (aroundAll)
        const apiUrl = `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}&x=${lng}&y=${lat}&radius=${radius||2000}&prodcd=B027&sort=1&out=json`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        const stations = (data.RESULT?.OIL || []).slice(0, 8).map(s => ({
          id: s.UNI_ID,
          name: s.OS_NM,
          address: s.NEW_ADR || s.VAN_ADR,
          price: parseInt(s.PRICE) || 0,
          dist: parseFloat((s.DISTANCE / 1000).toFixed(1)),
          brand: s.POLL_DIV_NM,
          lat: parseFloat(s.GIS_Y_COG),
          lng: parseFloat(s.GIS_X_COG)
        }));
        // AI 스코어링: 거리×0.4 + 가격×0.6 (정규화)
        if (stations.length > 0) {
          const minP = Math.min(...stations.map(s => s.price));
          const maxP = Math.max(...stations.map(s => s.price));
          const minD = Math.min(...stations.map(s => s.dist));
          const maxD = Math.max(...stations.map(s => s.dist));
          stations.forEach(s => {
            const pScore = maxP === minP ? 1 : (maxP - s.price) / (maxP - minP);
            const dScore = maxD === minD ? 1 : (maxD - s.dist) / (maxD - minD);
            s.aiScore = Math.round((pScore * 0.6 + dScore * 0.4) * 100);
          });
          stations.sort((a, b) => b.aiScore - a.aiScore);
        }
        return new Response(JSON.stringify({ ok: true, stations }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // ── 팝빌 세금계산서 역발행 ────────────────────────────────────────
    if (path === '/api/yongcha/popbill-issue' && method === 'POST') {
      const corsH = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
      try {
        const body = await request.json();
        const { workId, agencyId, driverId, driverName, fare } = body;
        if (!workId) throw new Error('workId 필수');

        const fsToken = await ycGetFsToken(env);
        const FS = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;

        const getDoc = async (col, id) => {
          if (!id) return { fields: {} };
          const r = await fetch(`${FS}/${col}/${id}`, { headers: { 'Authorization': `Bearer ${fsToken}` } });
          return r.json();
        };

        const workDoc  = await getDoc('yongcha_work',  workId);
        const wf       = workDoc.fields || {};
        const actualFare = fare || Number(wf.fare?.integerValue || wf.fare?.doubleValue || 0);
        const courier  = wf.courier?.stringValue || '용차 운송';
        const region   = wf.region?.stringValue  || '';

        const dId      = driverId || wf.driverId?.stringValue || '';
        const df       = (await getDoc('yongcha_users', dId)).fields || {};

        const aId      = agencyId || wf.agencyId?.stringValue || '';
        const af       = (await getDoc('yongcha_users', aId)).fields || {};

        const supply   = Math.round(Number(actualFare) / 1.1);
        const tax      = Number(actualFare) - supply;

        const params = {
          settleId:        workId,
          senderCorpNum:   df.corpNum?.stringValue || '',
          senderName:      df.displayName?.stringValue || driverName || '',
          senderCEO:       df.displayName?.stringValue || driverName || '',
          senderEmail:     df.email?.stringValue || '',
          receiverCorpNum: af.corpNum?.stringValue || '',
          receiverName:    af.displayName?.stringValue || af.companyName?.stringValue || '',
          receiverEmail:   af.email?.stringValue || '',
          supplyAmt:       supply, taxAmt: tax, totalAmt: Number(actualFare),
          writeDate:       new Date().toISOString().slice(0,10).replace(/-/g,''),
          itemName:        `${courier} ${region} 운송비`.trim(),
          driverFcmToken:  df.fcmToken?.stringValue,
          agencyFcmToken:  af.fcmToken?.stringValue
        };

        const result = await ycPopbillIssueReverse(env, params, FS, fsToken);
        return new Response(JSON.stringify(result), { headers: corsH });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsH });
      }
    }

    // ── 팝빌 웹훅 ─────────────────────────────────────────────────────
    if (path === '/api/yongcha/popbill-webhook' && method === 'POST') {
      try {
        const body = await request.json();
        const { MgtKey, State, StateDate } = body;
        if (MgtKey) {
          const settleId = MgtKey.replace(/^YC/, '');
          const fsToken  = await ycGetFsToken(env);
          const FS       = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;
          const pf       = { taxInvoiceState: { stringValue: State || '' }, taxInvoiceUpdatedAt: { stringValue: StateDate || new Date().toISOString() }, taxInvoiceMgtKey: { stringValue: MgtKey } };
          await fetch(`${FS}/yongcha_settlements/${settleId}?${Object.keys(pf).map(k=>`updateMask.fieldPaths=${k}`).join('&')}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: pf })
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ── 팝빌 상태 조회 ────────────────────────────────────────────────
    if (path === '/api/yongcha/popbill-status' && method === 'GET') {
      const corsH = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
      try {
        const mgtKey  = url.searchParams.get('mgtKey');
        const corpNum = url.searchParams.get('corpNum');
        if (!mgtKey || !corpNum) return new Response(JSON.stringify({ ok: false, error: '필수 파라미터 누락' }), { status: 400, headers: corsH });
        const pbToken = await ycPopbillGetToken(env, corpNum);
        const BASE    = env.POPBILL_TEST_MODE !== 'false' ? 'https://testserviceapi.popbill.com' : 'https://serviceapi.popbill.com';
        const resp    = await fetch(`${BASE}/Taxinvoice/${corpNum}/${mgtKey}`, { headers: { 'Authorization': `Bearer ${pbToken}`, 'Content-Type': 'application/json' } });
        const data    = await resp.json();
        return new Response(JSON.stringify({ ok: true, data }), { headers: corsH });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsH });
      }
    }

    // Serve app
    return new Response(YONGCHA_HTML, {
      headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' }
    });
  }
};

// ── Firestore 서비스 계정 토큰 ─────────────────────────────────────────────
async function ycGetFsToken(env) {
  if (!env.FIREBASE_SA_KEY) throw new Error('FIREBASE_SA_KEY not set');
  const sa  = JSON.parse(env.FIREBASE_SA_KEY);
  const now = Math.floor(Date.now() / 1000);
  const b64 = s => btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const b64buf = buf => { const b = new Uint8Array(buf); let s=''; for(const x of b) s+=String.fromCharCode(x); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); };
  const hdr = b64(JSON.stringify({ alg:'RS256', typ:'JWT' }));
  const pay = b64(JSON.stringify({ iss:sa.client_email, scope:'https://www.googleapis.com/auth/datastore', aud:'https://oauth2.googleapis.com/token', iat:now, exp:now+3600 }));
  const pem = sa.private_key.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\s/g,'');
  const der = Uint8Array.from(atob(pem), c=>c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der.buffer, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${hdr}.${pay}`));
  const jwt = `${hdr}.${pay}.${b64buf(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('FS 토큰 실패: ' + JSON.stringify(data));
  return data.access_token;
}

// ── 팝빌 HMAC-SHA256 서명 ─────────────────────────────────────────────────
async function ycPopbillHmacSign(message, base64Key) {
  const keyBytes = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── 팝빌 세션 토큰 ────────────────────────────────────────────────────────
async function ycPopbillGetToken(env, corpNum) {
  const linkId = env.POPBILL_LINK_ID, secretKey = env.POPBILL_SECRET_KEY;
  if (!linkId || !secretKey) throw new Error('POPBILL 인증키 미설정');
  const timestamp = new Date().toISOString().replace(/-/g,'').replace(/:/g,'').replace(/\.\d+Z$/,'Z');
  const sig = await ycPopbillHmacSign(`${timestamp}\n${linkId}\n${corpNum}`, secretKey);
  const resp = await fetch('https://auth.popbill.com/Token', {
    method: 'POST',
    headers: { 'x-lh-date': timestamp, 'Authorization': `LINKAUTHKEY ${linkId}:${sig}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ CorpNum: corpNum, ID: linkId })
  });
  if (!resp.ok) throw new Error(`팝빌 토큰 실패 (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (!data.session_token) throw new Error('팝빌 session_token 없음');
  return data.session_token;
}

// ── 팝빌 역발행 요청 ─────────────────────────────────────────────────────
async function ycPopbillIssueReverse(env, params, FS, fsToken) {
  const { settleId, senderCorpNum, senderName, senderCEO, senderEmail,
    receiverCorpNum, receiverName, receiverEmail,
    supplyAmt, taxAmt, totalAmt, writeDate, itemName,
    driverFcmToken, agencyFcmToken } = params;
  if (!senderCorpNum || !receiverCorpNum) throw new Error('공급자/공급받는자 사업자번호 필수');
  if (!settleId) throw new Error('settleId 필수');

  const mgtKey = `YC${settleId}`.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
  const isTest = env.POPBILL_TEST_MODE !== 'false';
  const BASE   = isTest ? 'https://testserviceapi.popbill.com' : 'https://serviceapi.popbill.com';
  const pbToken = await ycPopbillGetToken(env, receiverCorpNum);

  const wDate  = writeDate || new Date().toISOString().slice(0,10).replace(/-/g,'');
  const supply = Number(supplyAmt) || 0;
  const tax    = Number(taxAmt)    || Math.round(supply * 0.1);
  const total  = Number(totalAmt)  || supply + tax;

  const invoiceBody = {
    MgtKey: mgtKey, WriteDate: wDate, IssueType:'역발행', TaxType:'과세', InvoiceType:'일반', PurposeType:'영수',
    SupplyCostTotal: String(supply), TaxTotal: String(tax), TotalAmount: String(total),
    SenderCorpNum: senderCorpNum, SenderCorpName: senderName||'', SenderCEOName: senderCEO||senderName||'',
    SenderEmail: senderEmail||'', SenderBizType:'개인', SenderBizClass:'운수업',
    ReceiverCorpNum: receiverCorpNum, ReceiverCorpName: receiverName||'', ReceiverEmail: receiverEmail||'',
    DetailList: [{ SerialNum:1, PurchaseDT:wDate, ItemName:itemName||'용차 운송비', Qty:'1', UnitCost:String(supply), SupplyCost:String(supply), Tax:String(tax), TotalAmount:String(total) }],
    Memo: `용차앱 정산 #${settleId}`
  };

  const resp = await fetch(`${BASE}/Taxinvoice/역발행요청?SenderCorpNum=${senderCorpNum}&MgtKey=${mgtKey}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pbToken}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(invoiceBody)
  });
  let resultData;
  try { resultData = await resp.json(); } catch { resultData = { raw: await resp.text() }; }

  // Firestore에 역발행 요청 기록
  try {
    const pf = {
      taxInvoiceState:    { stringValue: '역발행요청' },
      taxInvoiceMgtKey:   { stringValue: mgtKey },
      taxInvoiceIsTest:   { booleanValue: isTest },
      taxInvoiceRequestAt:{ stringValue: new Date().toISOString() },
      ...(driverFcmToken ? { driverFcmToken: { stringValue: driverFcmToken } } : {}),
      ...(agencyFcmToken ? { agencyFcmToken: { stringValue: agencyFcmToken } } : {}),
      ...(senderName     ? { driverName:     { stringValue: senderName } }     : {}),
      ...(receiverName   ? { agencyName:     { stringValue: receiverName } }   : {}),
      totalAmount:        { integerValue: total }
    };
    await fetch(`${FS}/yongcha_settlements/${settleId}?${Object.keys(pf).map(k=>`updateMask.fieldPaths=${k}`).join('&')}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: pf })
    });
    // 기사에게 역발행 요청 FCM 알림
    if (driverFcmToken && env.FCM_SERVER_KEY) {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Authorization': 'key=' + env.FCM_SERVER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: driverFcmToken, notification: { title: '전자세금계산서 역발행 요청', body: `${receiverName||'대리점'}에서 ${total.toLocaleString('ko-KR')}원 세금계산서 역발행 요청이 왔습니다.` }, data: { type: 'tax_invoice_request', settleId, mgtKey } })
      });
    }
  } catch(fsErr) { /* non-critical */ }

  return { ok: resp.ok, mgtKey, isTest, result: resultData };
}
