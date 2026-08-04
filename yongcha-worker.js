const YONGCHA_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="theme-color" content="#0f0f1a">
<title>용차 — 택배 노선 매칭</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>

<style>
:root{
  --bg:#0f0f1a;--bg2:#111122;--bg3:#16162a;--bg4:#0a0a14;
  --bd:#1e1e35;--bd2:#2a2a45;
  --tx:#f0f0f8;--t2:#7878a0;--t3:#3a3a5c;
  --ac:#6366f1;--acl:rgba(99,102,241,.12);--ach:rgba(99,102,241,.2);
  --gn:#22c55e;--gnl:rgba(34,197,94,.1);
  --rd:#ef4444;--rdl:rgba(239,68,68,.1);
  --yw:#f59e0b;--ywl:rgba(245,158,11,.1);
  --cj:#e63946;--hj:#457b9d;--lt:#f4a261;--up:#2a9d8f;--cp:#ff6b35;--rz:#9b59b6;
  --r:12px;--r2:18px;
  --sh:0 2px 16px rgba(0,0,0,.4);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--tx);overflow:hidden}

/* ── 로딩 ── */
#ld{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:16px}
.ld-mark{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--ac),#818cf8);display:flex;align-items:center;justify-content:center}
.ld-mark svg{width:32px;height:32px;stroke:#fff;fill:none}
.ld-title{font-size:26px;font-weight:800;color:var(--tx);letter-spacing:-.5px}
.ld-sub{font-size:13px;color:var(--t2)}
.spinner{width:24px;height:24px;border:2px solid var(--bd2);border-top-color:var(--ac);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── 로그인 ── */
#login-screen{position:fixed;inset:0;background:var(--bg);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
.login-card{background:var(--bg2);border-radius:var(--r2);padding:32px 24px;max-width:380px;width:100%;border:1px solid var(--bd)}
.login-logo{text-align:center;margin-bottom:28px}
.login-mark{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--ac),#818cf8);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.login-mark svg{width:28px;height:28px;stroke:#fff;fill:none;stroke-width:2}
.login-name{font-size:22px;font-weight:800;color:var(--tx);letter-spacing:-.3px}
.login-sub{font-size:12px;color:var(--t2);margin-top:4px}

/* 탭 */
.tabs{display:flex;background:var(--bg3);border-radius:10px;padding:3px;margin-bottom:22px;gap:3px}
.tab{flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.tab.on{background:var(--ac);color:#fff}

/* 타입 선택 */
.type-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.type-card{border:1.5px solid var(--bd);border-radius:var(--r);padding:16px 12px;text-align:center;cursor:pointer;transition:.2s}
.type-card.on{border-color:var(--ac);background:var(--acl)}
.type-ico{margin-bottom:6px}
.type-lbl{font-size:13px;font-weight:800;color:var(--tx)}
.type-desc{font-size:11px;color:var(--t2);margin-top:2px}

/* 인풋 */
.inp-wrap{margin-bottom:14px}
.inp-lbl{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:6px;display:block}
.inp{width:100%;padding:12px 14px;background:var(--bg3);border:1.5px solid var(--bd);border-radius:var(--r);color:var(--tx);font-size:14px;outline:none;font-family:inherit;transition:.2s}
.inp:focus{border-color:var(--ac);background:var(--acl)}
.inp::placeholder{color:var(--t3)}
select.inp{cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%237878a0' d='M5 6L0 0h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
select.inp option{background:#111122;color:#f0f0f8}
.err{color:var(--rd);font-size:12px;margin-bottom:10px;display:none;padding:8px 12px;background:var(--rdl);border-radius:8px}
.btn-main{width:100%;padding:14px;background:var(--ac);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;margin-top:4px}
.btn-main:active{filter:brightness(.9)}
.btn-main:disabled{opacity:.4;cursor:not-allowed}

/* ── 앱 ── */
#app{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg)}

/* 헤더 */
.app-hdr{background:var(--bg2);border-bottom:1px solid var(--bd);padding:11px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-logo{font-size:17px;font-weight:900;color:var(--tx);letter-spacing:-.3px}
.hdr-logo span{color:var(--ac)}
.hdr-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px}
.badge-admin{background:rgba(155,89,182,.15);color:#c084fc}
.badge-agency{background:var(--acl);color:var(--ac)}
.badge-driver{background:var(--gnl);color:var(--gn)}
.hdr-right{display:flex;align-items:center;gap:8px}
.notif-btn{width:32px;height:32px;border-radius:8px;background:var(--bg3);border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative}
.notif-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
.notif-dot{position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;background:var(--rd);display:none}
.logout-btn{font-size:11px;color:var(--t3);background:none;border:none;cursor:pointer;font-family:inherit}

/* 콘텐츠 */
#content{position:absolute;inset:0;bottom:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 80px}

/* 바텀 탭 */
.bnav{position:absolute;bottom:0;left:0;right:0;background:var(--bg2);border-top:1px solid var(--bd);display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom)}
.bnav-btn{flex:1;padding:10px 4px 8px;border:none;background:none;color:var(--t3);font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .15s}
.bnav-btn.on{color:var(--ac)}
.bnav-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;transition:stroke .15s}

/* 공통 카드 */
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:10px}
.page-hdr{margin-bottom:18px}
.page-title{font-size:19px;font-weight:800;color:var(--tx);letter-spacing:-.3px}
.page-sub{font-size:12px;color:var(--t2);margin-top:3px}

/* ── 필터 ── */
.filter-section{margin-bottom:14px}
.filter-label{font-size:11px;font-weight:700;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.filter-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.filter-row::-webkit-scrollbar{display:none}
.filter-chip{flex-shrink:0;padding:6px 14px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--t2);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.15s}
.filter-chip.on{background:var(--ac);color:#fff;border-color:var(--ac)}

/* ── 공고 카드 ── */
.post-card{background:var(--bg2);border:1px solid var(--bd);border-left:4px solid var(--bd2);border-radius:var(--r);padding:14px 14px 12px 14px;margin-bottom:8px;cursor:pointer;transition:.15s}
.post-card:active{background:var(--bg3)}
.post-card.closed{opacity:.45;cursor:default}
.post-card--cj{border-left-color:var(--cj)}
.post-card--hj{border-left-color:var(--hj)}
.post-card--lt{border-left-color:var(--lt)}
.post-card--up{border-left-color:var(--up)}
.post-card--cp{border-left-color:var(--cp)}
.post-card--rz{border-left-color:var(--rz)}
.post-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.post-courier{font-size:11px;font-weight:700;color:var(--t2);background:var(--bg3);padding:3px 8px;border-radius:20px}
.post-badges{display:flex;gap:4px;align-items:center}
.badge{font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px}
.badge-open{background:var(--gnl);color:var(--gn)}
.badge-urgent{background:var(--rdl);color:var(--rd)}
.badge-matched{background:var(--gnl);color:var(--gn)}
.badge-closed{background:rgba(255,255,255,.05);color:var(--t3)}
.badge-day{background:var(--ywl);color:var(--yw)}
.badge-night{background:var(--acl);color:var(--ac)}
.post-area{font-size:16px;font-weight:800;margin-bottom:4px;line-height:1.3}
.post-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
.post-tag{font-size:10px;color:var(--t2);background:var(--bg3);padding:2px 7px;border-radius:6px}
.post-foot{display:flex;align-items:center;justify-content:space-between}
.post-price-main{font-size:17px;font-weight:900;color:var(--tx)}
.post-price-unit{font-size:11px;font-weight:400;color:var(--t2);margin-left:2px}
.post-est{font-size:11px;color:var(--t2)}
.post-agency{font-size:11px;color:var(--t3)}
.post-guarantee{margin:6px 0;padding:6px 10px;background:var(--gnl);border-radius:8px;font-size:11px;color:var(--gn);font-weight:700;display:inline-block}

/* 페이지네이션 */
.pagination{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;padding-bottom:4px}
.page-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--bd);background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:.15s}
.page-btn.on{background:var(--ac);color:#fff;border-color:var(--ac)}
.page-btn:disabled{opacity:.3;cursor:default}
.page-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}

/* 공고 탭 */
.post-tabs{display:flex;gap:0;margin-bottom:14px;border-bottom:1px solid var(--bd)}
.post-tab{flex:1;padding:10px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s}
.post-tab.on{color:var(--ac);border-bottom-color:var(--ac)}

/* ── 빈 상태 ── */
.empty{text-align:center;padding:48px 20px}
.empty-ico{width:40px;height:40px;margin:0 auto 12px;opacity:.3}
.empty-ico svg{width:40px;height:40px;stroke:var(--t2);fill:none;stroke-width:1.5}
.empty-msg{font-size:14px;color:var(--t3);line-height:1.6}

/* ── 모달 ── */
#modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;z-index:200}
#modal-sheet{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border-radius:20px 20px 0 0;max-height:92vh;overflow-y:auto;z-index:201;transform:translateY(100%);transition:transform .3s cubic-bezier(.34,1.56,.64,1);padding:0 16px 40px}
#modal-sheet.open{transform:translateY(0)}
.modal-handle{width:36px;height:4px;border-radius:2px;background:var(--bd2);margin:12px auto 0}
.modal-close{position:sticky;top:0;float:right;background:var(--bg3);border:none;color:var(--t2);font-size:16px;cursor:pointer;width:32px;height:32px;border-radius:50%;margin:8px 0;display:flex;align-items:center;justify-content:center}
.apply-btn{width:100%;padding:15px;background:var(--ac);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:16px}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.detail-item{background:var(--bg3);border-radius:10px;padding:10px 12px}
.detail-lbl{font-size:10px;color:var(--t2);font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px}
.detail-val{font-size:13px;font-weight:700}
.map-wrap{border-radius:12px;overflow:hidden;margin:10px 0}

/* ── 토스트 ── */
#toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a2e;border:1px solid var(--bd2);color:var(--tx);font-size:13px;font-weight:600;padding:10px 20px;border-radius:24px;opacity:0;transition:.3s;z-index:999;white-space:nowrap;pointer-events:none}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* ── 홈 히어로 ── */
.hero-card{background:linear-gradient(135deg,#1e1b4b 0%,#1a1a35 100%);border:1px solid var(--bd2);border-radius:var(--r2);padding:24px;margin-bottom:14px}
.hero-greeting{font-size:13px;color:var(--t2);margin-bottom:6px}
.hero-name{font-size:22px;font-weight:900;letter-spacing:-.3px}
.hero-meta{font-size:12px;color:var(--t2);margin-top:6px}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px}
.hero-stat{background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px}
.hero-stat-val{font-size:20px;font-weight:900;color:var(--ac)}
.hero-stat-lbl{font-size:10px;color:var(--t2);margin-top:2px}

/* ── 폼 섹션 ── */
.form-section{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--bd)}
.form-section:last-child{border-bottom:none}
.form-section-title{font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px}
.addr-item{padding:10px 12px;border-bottom:1px solid var(--bd);cursor:pointer;transition:.15s}
.addr-item:active{background:var(--bg3)}
#addr-result{background:var(--bg3);border-radius:var(--r);overflow:hidden;margin-top:8px;display:none}

/* 섹션 헤더 */
.section-hdr{display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px}
.section-hdr-title{font-size:14px;font-weight:800;color:var(--tx)}
.section-hdr-count{font-size:12px;color:var(--ac);font-weight:700}


/* ── 카테고리 탭 (용차/간선차) ── */
.cat-tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.cat-tab{background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r);padding:14px 12px;text-align:left;cursor:pointer;font-family:inherit;transition:.2s}
.cat-tab.on{border-color:var(--ac);background:var(--acl)}
.cat-tab-main{font-size:15px;font-weight:800;color:var(--tx)}
.cat-tab.on .cat-tab-main{color:var(--ac)}
.cat-tab-sub{font-size:10px;color:var(--t3);margin-top:2px}

/* ── AI RouteIQ 배너 ── */
.routeiq-banner{background:linear-gradient(135deg,#1e1b4b,#111133);border:1px solid #2d2b5a;border-radius:var(--r);padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px}
.routeiq-icon{width:38px;height:38px;border-radius:10px;background:var(--acl);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.routeiq-icon svg{width:20px;height:20px;stroke:var(--ac);fill:none;stroke-width:2}
.routeiq-title{font-size:13px;font-weight:800;color:var(--tx);margin-bottom:2px}
.routeiq-sub{font-size:11px;color:var(--t2)}
.routeiq-badge{margin-left:auto;background:var(--ac);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.ai-analyzing{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ac);font-weight:600}
.ai-dot{width:6px;height:6px;border-radius:50%;background:var(--ac);animation:aipulse 1.2s ease-in-out infinite}
.ai-dot:nth-child(2){animation-delay:.2s}
.ai-dot:nth-child(3){animation-delay:.4s}
@keyframes aipulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}

/* ── 슬라이드 섹션 ── */
.slide-section{margin-bottom:24px}
.slide-hdr{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.slide-hdr-title{font-size:13px;font-weight:800;color:var(--tx)}
.slide-hdr-count{font-size:11px;color:var(--t2);margin-left:auto}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--gn);flex-shrink:0;animation:livepulse 2s ease-in-out infinite}
@keyframes livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.4)}70%{opacity:.7;box-shadow:0 0 0 5px rgba(34,197,94,0)}}
.slide-track{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none;margin:0 -16px;padding-left:0;padding-right:16px}
.slide-track::-webkit-scrollbar{display:none}

/* ── 슬라이드 카드 ── */
.sc{flex-shrink:0;width:min(290px,82vw);scroll-snap-align:start;background:var(--bg2);border:1px solid var(--bd);border-left:4px solid var(--bd2);border-radius:var(--r);padding:13px;cursor:pointer;transition:.15s;display:flex;flex-direction:column;gap:10px}
.sc:first-child{margin-left:16px}
.sc:active{background:var(--bg3)}
.sc.closed{opacity:.4;cursor:default}
.sc--cj{border-left-color:var(--cj)}.sc--hj{border-left-color:var(--hj)}.sc--lt{border-left-color:var(--lt)}.sc--up{border-left-color:var(--up)}.sc--cp{border-left-color:var(--cp)}.sc--rz{border-left-color:var(--rz)}

.sc-row1{display:flex;align-items:center;justify-content:space-between;gap:6px}
.sc-courier{font-size:10px;font-weight:700;color:var(--t2)}
.sc-badges{display:flex;gap:4px;align-items:center}
.sc-area{font-size:15px;font-weight:900;line-height:1.25;color:var(--tx)}
.sc-tags{display:flex;gap:4px;flex-wrap:wrap}
.sc-tag{font-size:10px;color:var(--t2);background:var(--bg3);padding:2px 7px;border-radius:6px}
.sc-foot{display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid var(--bd);padding-top:10px;margin-top:auto}
.sc-price{font-size:18px;font-weight:900;color:var(--tx);line-height:1}
.sc-price-unit{font-size:11px;font-weight:400;color:var(--t2)}
.sc-est{font-size:10px;color:var(--t2);margin-top:2px}
.sc-ai{text-align:right}
.sc-ai-score{font-size:20px;font-weight:900;line-height:1}
.sc-ai-label{font-size:9px;color:var(--t2);margin-top:1px;text-transform:uppercase;letter-spacing:.5px}
.sc-meta{display:flex;align-items:center;justify-content:space-between}
.sc-agency{font-size:10px;color:var(--t3)}
.sc-time{font-size:10px;color:var(--t3)}
.sc-rate-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px}
.sc-rate-up{background:rgba(34,197,94,.12);color:#22c55e}
.sc-rate-dn{background:rgba(239,68,68,.1);color:#ef4444}
.sc-rate-ok{background:var(--bg3);color:var(--t2)}

/* ── 간선차 배너 ── */
.express-banner{background:linear-gradient(135deg,#0d2137,#0a1a2e);border:1px solid #1e3a5a;border-radius:var(--r2);padding:20px;margin-bottom:16px;text-align:center}
.express-banner-icon svg{width:40px;height:40px;stroke:#457b9d;fill:none;stroke-width:1.5;margin-bottom:10px}
.express-banner-title{font-size:16px;font-weight:900;margin-bottom:4px}
.express-banner-sub{font-size:12px;color:var(--t2);line-height:1.6}
.express-partners{display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap}
.express-partner{font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;border:1px solid #1e3a5a;color:#7baec8}

/* ── 필터 지역 ── */
.region-filter-wrap{margin-bottom:14px}
.region-filter-label{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}

/* ── 더보기 버튼 ── */
.more-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;font-family:inherit;margin-top:8px;transition:.15s}
.more-btn:active{background:var(--bg3)}
.more-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}

/* ── Courier color vars ─────────────────────────────────── */
.pcard{--cl:#6366f1}
.pcard.--cj{--cl:#e63946}
.pcard.--hj{--cl:#457b9d}
.pcard.--lt{--cl:#f4a261}
.pcard.--up{--cl:#2a9d8f}
.pcard.--cp{--cl:#ff6b35}
.pcard.--rz{--cl:#9b59b6}

/* ── Earn Hero ──────────────────────────────────────────── */
.earn-hero{background:linear-gradient(135deg,#0d1117 0%,#1a1040 100%);border:1px solid var(--bd2);border-radius:18px;padding:22px 20px 16px;margin-bottom:12px}
.earn-hero-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.earn-label{font-size:11px;color:var(--t2);font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.earn-big{font-size:38px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1}
.earn-tag{background:var(--acl);border:1px solid var(--ac);color:var(--ac);font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;margin-top:4px}
.earn-bar-wrap{height:4px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden;margin-bottom:6px}
.earn-bar{height:100%;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:4px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.earn-bar-label{font-size:11px;color:var(--t3)}

/* ── AI Coach Card ──────────────────────────────────────── */
.ai-coach-card{background:linear-gradient(135deg,#0a0a1e 0%,#120e30 100%);border:1px solid rgba(99,102,241,.35);border-radius:16px;padding:16px 16px 14px;margin-bottom:12px}
.aic-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.aic-icon{width:36px;height:36px;background:rgba(99,102,241,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--ac);flex-shrink:0}
.aic-icon svg{width:18px;height:18px}
.aic-title{font-size:14px;font-weight:800;color:#fff;line-height:1.2}
.aic-sub{font-size:11px;color:var(--t2);margin-top:1px}
.aic-badge{margin-left:auto;background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;letter-spacing:.08em;animation:pulse 2s infinite}
.aic-body{min-height:56px}
.aic-skel{display:flex;flex-direction:column;gap:6px}
.skel{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
.skel-lg{height:14px;width:90%}
.skel-md{height:12px;width:70%}
.skel-sm{height:12px;width:50%}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.aic-msg{font-size:13px;color:var(--tx);line-height:1.55;margin-bottom:10px}
.aic-pick{display:flex;align-items:center;justify-content:space-between;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:10px 12px;cursor:pointer;margin-bottom:8px;transition:.15s}
.aic-pick:active{opacity:.8}
.aic-pick svg{width:16px;height:16px;color:var(--ac)}
.aic-applymsg{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);background:rgba(34,197,94,.06);border-radius:8px;padding:8px 10px}
.aic-applymsg svg{width:13px;height:13px;color:var(--gn);flex-shrink:0}

/* ── Market Card ────────────────────────────────────────── */
.mkt-card{background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:14px 14px 12px;margin-bottom:12px}
.mkt-hdr{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.mkt-icon{width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:var(--ac)}
.mkt-icon svg{width:16px;height:16px}
.mkt-title{font-size:13px;font-weight:700;color:var(--tx);flex:1}
.live-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite}
.mkt-grid{display:flex;flex-direction:column;gap:4px}
.mkt-row{display:flex;align-items:center;gap:6px}
.mkt-name{font-size:12px;font-weight:700;color:var(--tx);width:52px;flex-shrink:0}
.mkt-cnt{font-size:11px;color:var(--t2);flex:1}
.mkt-rate{font-size:11px;font-weight:700;text-align:right}
.mkt-up{color:#22c55e}
.mkt-dn{color:#ef4444}
.mkt-ok{color:var(--t2)}

/* ── Quick Card ──────────────────────────────────────────── */
.quick-card{background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:14px}
.more-link{display:flex;align-items:center;gap:6px;justify-content:center;width:100%;padding:12px;font-size:12px;font-weight:700;color:var(--ac);background:none;border:1px dashed var(--bd2);border-radius:10px;cursor:pointer;margin-top:8px;transition:.15s}
.more-link svg{width:14px;height:14px}

/* ── Post Card ───────────────────────────────────────────── */
.pcard{background:var(--bg2);border:1px solid var(--bd);border-left:4px solid var(--cl);border-radius:14px;padding:14px 14px 12px;margin-bottom:10px;cursor:pointer;transition:.12s;position:relative}
.pcard:active{transform:scale(.99)}
.pcard-closed{opacity:.55}
.pc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px}
.pc-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.pc-courier{font-size:11px;font-weight:800;color:var(--cl);letter-spacing:.02em}
.pc-ai{width:36px;height:36px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0;line-height:1}
.pc-area{font-size:17px;font-weight:800;color:var(--tx);margin-bottom:6px;letter-spacing:-.01em}
.pc-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.pc-tags span{background:var(--bg3);border:1px solid var(--bd);border-radius:20px;font-size:10px;font-weight:600;color:var(--t2);padding:2px 8px}
.pc-earn{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;background:var(--bg3);border-radius:10px;padding:10px 12px}
.pc-price{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1}
.pc-unit{font-size:11px;font-weight:600;color:var(--t2);margin-left:2px}
.pc-est{text-align:right}
.pc-est-day{font-size:16px;font-weight:800;color:var(--gn)}
.pc-est-day span{font-size:11px;color:var(--t2);font-weight:500}
.pc-guarantee{font-size:10px;color:var(--t2);margin-top:2px}
.pc-mkt{font-size:11px;font-weight:700;margin-top:2px}
.pc-foot{display:flex;align-items:center;justify-content:space-between}
.pc-agency{font-size:11px;color:var(--t2)}
.pc-settle,.pc-time{color:var(--t3)}
.quick-apply{display:flex;align-items:center;gap:5px;background:var(--ac);color:#fff;border:none;border-radius:20px;font-size:11px;font-weight:800;padding:7px 14px;cursor:pointer;transition:.12s;flex-shrink:0}
.quick-apply svg{width:12px;height:12px}
.quick-apply:active{transform:scale(.95)}

/* ── Badges ──────────────────────────────────────────────── */
.bdg{display:inline-block;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;letter-spacing:.04em}
.bdg-open{background:rgba(34,197,94,.12);color:#22c55e}
.bdg-urgent{background:rgba(239,68,68,.15);color:#ef4444;animation:pulse 1.5s infinite}
.bdg-matched{background:rgba(99,102,241,.12);color:#818cf8}
.bdg-closed{background:rgba(255,255,255,.06);color:var(--t3)}
.bdg-day{background:rgba(251,191,36,.1);color:#fbbf24}
.bdg-night{background:rgba(99,102,241,.12);color:#818cf8}

/* ── Posts header ────────────────────────────────────────── */
.pgp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pgp-tabs{display:flex;background:var(--bg3);border-radius:10px;padding:3px}
.pgp-tab{background:none;border:none;color:var(--t2);font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;transition:.15s}
.pgp-tab.on{background:var(--ac);color:#fff}
.view-toggle{display:flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px;font-size:11px;font-weight:700;color:var(--t2);padding:7px 12px;cursor:pointer}
.view-toggle svg{width:13px;height:13px}

/* ── Region chips ────────────────────────────────────────── */
.rgn-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}
.rgn-row::-webkit-scrollbar{display:none}
.rgn-chip{background:var(--bg3);border:1px solid var(--bd);border-radius:20px;color:var(--t2);font-size:11px;font-weight:700;padding:5px 12px;cursor:pointer;white-space:nowrap;transition:.12s;flex-shrink:0}
.rgn-chip.on{background:var(--ac);border-color:var(--ac);color:#fff}

/* ── Express hero ────────────────────────────────────────── */
.express-hero{text-align:center;padding:40px 20px;background:var(--bg2);border:1px dashed var(--bd2);border-radius:16px}
.exh-icon{width:48px;height:48px;margin:0 auto 12px;color:var(--t2)}
.exh-icon svg{width:48px;height:48px}
.exh-title{font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px}
.exh-sub{font-size:12px;color:var(--t2);margin-bottom:16px}
.exh-partners{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.exh-partners span{background:var(--bg3);border:1px solid var(--bd);border-radius:8px;font-size:11px;font-weight:700;color:var(--t2);padding:6px 14px}

/* ── Stats ───────────────────────────────────────────────── */
.stat-row{display:flex;gap:10px;margin-bottom:16px}
.stat-box{flex:1;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 12px;text-align:center}
.stat-val{font-size:24px;font-weight:900;color:var(--tx);letter-spacing:-.02em}
.stat-lbl{font-size:11px;color:var(--t2);margin-top:2px}

/* ── Empty state ─────────────────────────────────────────── */
.empty-state{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;color:var(--t2);font-size:13px;text-align:center}
.empty-state svg{width:36px;height:36px;opacity:.35}

</style>
</head>
<body style="visibility:hidden"><script>setTimeout(function(){document.body.style.visibility='visible'},50)</script>
<!-- 로딩 -->
<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/><line x1="12" y1="12" x2="12" y2="20"/></svg></div>
  <div class="ld-title">용차</div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner" style="margin-top:8px"></div>
</div>

<!-- 로그인 -->
<div id="login-screen">
<div class="login-card">
  <div class="login-logo">
    <div class="login-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차.app</div>
    <div class="login-sub">대리점과 기사를 연결하는 노선 매칭 플랫폼</div>
  </div>
  <div class="tabs">
    <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
    <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
  </div>
  <div id="form-login">
    <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일 입력"></div>
    <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호 입력" onkeydown="if(event.key==='Enter')_yLogin()"></div>
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

<!-- 앱 -->
<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="notif-btn" id="notif-btn" onclick="_goPage('notifications')">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span class="notif-dot" id="notif-dot"></span>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <div class="bnav" id="bnav"></div>
</div>

<!-- 모달 -->
<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">✕</button>
  <div id="modal-body"></div>
</div>

<!-- 토스트 -->
<div id="toast"></div>

<script>setTimeout(function(){document.body.style.visibility='visible'},50)</script>
<!-- 로딩 -->
<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/><line x1="12" y1="12" x2="12" y2="20"/></svg></div>
  <div class="ld-title">용차</div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner" style="margin-top:8px"></div>
</div>

<!-- 로그인 -->
<div id="login-screen">
<div class="login-card">
  <div class="login-logo">
    <div class="login-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차.app</div>
    <div class="login-sub">대리점과 기사를 연결하는 노선 매칭 플랫폼</div>
  </div>
  <div class="tabs">
    <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
    <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
  </div>
  <div id="form-login">
    <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일 입력"></div>
    <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호 입력" onkeydown="if(event.key==='Enter')_yLogin()"></div>
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

<!-- 앱 -->
<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="notif-btn" id="notif-btn" onclick="_goPage('notifications')">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span class="notif-dot" id="notif-dot"></span>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <div class="bnav" id="bnav"></div>
</div>

<!-- 모달 -->
<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">✕</button>
  <div id="modal-body"></div>
</div>

<!-- 토스트 -->
<div id="toast"></div>



<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>
setTimeout(function(){document.body.style.visibility='visible'},50)</script>
<!-- 로딩 -->
<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/><line x1="12" y1="12" x2="12" y2="20"/></svg></div>
  <div class="ld-title">용차</div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner" style="margin-top:8px"></div>
</div>

<!-- 로그인 -->
<div id="login-screen">
<div class="login-card">
  <div class="login-logo">
    <div class="login-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차.app</div>
    <div class="login-sub">대리점과 기사를 연결하는 노선 매칭 플랫폼</div>
  </div>
  <div class="tabs">
    <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
    <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
  </div>
  <div id="form-login">
    <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일 입력"></div>
    <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호 입력" onkeydown="if(event.key==='Enter')_yLogin()"></div>
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

<!-- 앱 -->
<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="notif-btn" id="notif-btn" onclick="_goPage('notifications')">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span class="notif-dot" id="notif-dot"></span>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <div class="bnav" id="bnav"></div>
</div>

<!-- 모달 -->
<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">✕</button>
  <div id="modal-body"></div>
</div>

<!-- 토스트 -->
<div id="toast"></div>

<script>setTimeout(function(){document.body.style.visibility='visible'},50)</script>
<!-- 로딩 -->
<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/><line x1="12" y1="12" x2="12" y2="20"/></svg></div>
  <div class="ld-title">용차</div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner" style="margin-top:8px"></div>
</div>

<!-- 로그인 -->
<div id="login-screen">
<div class="login-card">
  <div class="login-logo">
    <div class="login-mark"><svg viewBox="0 0 24 24" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2" ry="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차.app</div>
    <div class="login-sub">대리점과 기사를 연결하는 노선 매칭 플랫폼</div>
  </div>
  <div class="tabs">
    <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
    <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
  </div>
  <div id="form-login">
    <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일 입력"></div>
    <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호 입력" onkeydown="if(event.key==='Enter')_yLogin()"></div>
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

<!-- 앱 -->
<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="notif-btn" id="notif-btn" onclick="_goPage('notifications')">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span class="notif-dot" id="notif-dot"></span>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <div class="bnav" id="bnav"></div>
</div>

<!-- 모달 -->
<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">✕</button>
  <div id="modal-body"></div>
</div>

<!-- 토스트 -->
<div id="toast"></div>


<script>
\n// \u2500\u2500 \uc804\uc5ed \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nvar _db, _auth, _CU=null, _regType='agency';\nvar ADMINS=['kimdh4790@gmail.com','skypjh1101@naver.com'];\nvar API_KEY='AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';\n\nfirebase.initializeApp({\n  apiKey:API_KEY,\n  authDomain:'mbti-logistics.firebaseapp.com',\n  projectId:'mbti-logistics',\n  storageBucket:'mbti-logistics.appspot.com',\n  messagingSenderId:'40761160761',\n  appId:'1:40761160761:web:20545b610f03f534e949e8'\n});\n_db=firebase.firestore();\n_auth=firebase.auth();\n\n// 3\ucd08 \ud0c0\uc784\uc544\uc6c3\nvar _ldTimer=setTimeout(function(){\n  document.getElementById('ld').style.display='none';document.body.style.visibility='visible';\n  document.getElementById('login-screen').style.display='flex';\n},3000);\n\n_auth.onAuthStateChanged(function(u){\n  clearTimeout(_ldTimer);\n  document.getElementById('ld').style.display='none';document.body.style.visibility='visible';\n  if(u){\n    _db.collection('yongcha_users').doc(u.uid).get().then(function(snap){\n      if(snap.exists){_CU=Object.assign({uid:u.uid},snap.data());_showApp();}\n      else if(ADMINS.indexOf(u.email||'')>=0){\n        var doc={uid:u.uid,type:'admin',name:'\uad00\ub9ac\uc790',email:u.email,\n          phone:'051-711-3103',region:'\ubd80\uc0b0',rating:5,reviewCount:0,status:'active',\n          createdAt:firebase.firestore.FieldValue.serverTimestamp()};\n        _db.collection('yongcha_users').doc(u.uid).set(doc).then(function(){\n          _CU=Object.assign({uid:u.uid},doc);_showApp();\n        });\n      } else {_showLogin();}\n    }).catch(function(){_showLogin();});\n  } else {_showLogin();}\n});\n\nfunction _showLogin(){\n  document.getElementById('login-screen').style.display='flex';\n  document.getElementById('app').style.display='none';\n}\n\n// \u2500\u2500 \ub85c\uadf8\uc778/\ud68c\uc6d0\uac00\uc785 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _yTab(t){\n  document.getElementById('tab-login').classList.toggle('on',t==='login');\n  document.getElementById('tab-reg').classList.toggle('on',t==='reg');\n  document.getElementById('form-login').style.display=t==='login'?'block':'none';\n  document.getElementById('form-reg').style.display=t==='reg'?'block':'none';\n}\nfunction _setType(t){\n  _regType=t;\n  document.getElementById('t-agency').classList.toggle('on',t==='agency');\n  document.getElementById('t-driver').classList.toggle('on',t==='driver');\n  document.getElementById('r-name-lbl').textContent=t==='agency'?'\ub300\ub9ac\uc810\uba85':'\uc774\ub984';\n  document.getElementById('r-name').placeholder=t==='agency'?'\uc0c1\ud638\uba85 \uc785\ub825':'\uc774\ub984 \uc785\ub825';\n}\n\nfunction _yLogin(){\n  var e=(document.getElementById('l-email').value||'').trim();\n  var p=(document.getElementById('l-pw').value||'').trim();\n  var err=document.getElementById('l-err');\n  var btn=document.getElementById('l-btn');\n  if(!e||!p){err.textContent='\uc774\uba54\uc77c\uacfc \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud558\uc138\uc694';err.style.display='block';return;}\n  err.style.display='none';\n  btn.textContent='\ub85c\uadf8\uc778 \uc911...';btn.disabled=true;\n  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+API_KEY,{\n    method:'POST',headers:{'Content-Type':'application/json'},\n    body:JSON.stringify({email:e,password:p,returnSecureToken:true})\n  }).then(function(r){return r.json();}).then(function(data){\n    if(data.error){\n      btn.textContent='\ub85c\uadf8\uc778';btn.disabled=false;\n      var c=data.error.message||'';\n      err.textContent=c.includes('WRONG_PASSWORD')||c.includes('INVALID_LOGIN')?'\ube44\ubc00\ubc88\ud638\uac00 \ud2c0\ub838\uc5b4\uc694':\n                      c.includes('EMAIL_NOT_FOUND')?'\uc5c6\ub294 \uacc4\uc815\uc774\uc5d0\uc694':\n                      c.includes('TOO_MANY')?'\uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694':\n                      '\uc624\ub958: '+c;\n      err.style.display='block';return;\n    }\n    var uid=data.localId,email=data.email||'';\n    _db.collection('yongcha_users').doc(uid).get().then(function(snap){\n      if(snap.exists){_CU=Object.assign({uid:uid},snap.data());_showApp();}\n      else if(ADMINS.indexOf(email)>=0){\n        var doc={uid:uid,type:'admin',name:'\uad00\ub9ac\uc790',email:email,phone:'051-711-3103',\n          region:'\ubd80\uc0b0',rating:5,reviewCount:0,status:'active',\n          createdAt:firebase.firestore.FieldValue.serverTimestamp()};\n        _db.collection('yongcha_users').doc(uid).set(doc).then(function(){\n          _CU=Object.assign({uid:uid},doc);_showApp();\n        });\n      } else {\n        btn.textContent='\ub85c\uadf8\uc778';btn.disabled=false;\n        err.textContent='\uc6a9\ucc28 \uacc4\uc815\uc774 \uc5c6\uc5b4\uc694. \ud68c\uc6d0\uac00\uc785 \ud574\uc8fc\uc138\uc694';err.style.display='block';\n      }\n    });\n  }).catch(function(ex){\n    btn.textContent='\ub85c\uadf8\uc778';btn.disabled=false;\n    err.textContent='\ub124\ud2b8\uc6cc\ud06c \uc624\ub958';err.style.display='block';\n  });\n}\n\nfunction _yRegister(){\n  var n=(document.getElementById('r-name').value||'').trim();\n  var e=(document.getElementById('r-email').value||'').trim();\n  var ph=(document.getElementById('r-phone').value||'').trim();\n  var rg=(document.getElementById('r-region').value||'').trim();\n  var p=(document.getElementById('r-pw').value||'').trim();\n  var err=document.getElementById('r-err');\n  var btn=document.getElementById('r-btn');\n  if(!n||!e||!ph||!rg||!p){err.textContent='\ubaa8\ub4e0 \ud56d\ubaa9\uc744 \uc785\ub825\ud558\uc138\uc694';err.style.display='block';return;}\n  if(p.length<6){err.textContent='\ube44\ubc00\ubc88\ud638\ub294 6\uc790 \uc774\uc0c1';err.style.display='block';return;}\n  err.style.display='none';btn.textContent='\uac00\uc785 \uc911...';btn.disabled=true;\n  _auth.createUserWithEmailAndPassword(e,p).then(function(c){\n    return _db.collection('yongcha_users').doc(c.user.uid).set({\n      uid:c.user.uid,type:_regType,name:n,email:e,phone:ph,region:rg,carType:(document.getElementById('r-cartype')||{}).value||'',\n      rating:0,reviewCount:0,status:'active',\n      createdAt:firebase.firestore.FieldValue.serverTimestamp()\n    });\n  }).catch(function(ex){\n    btn.textContent='\uac00\uc785\ud558\uae30';btn.disabled=false;\n    err.textContent=ex.code==='auth/email-already-in-use'?'\uc774\ubbf8 \uc0ac\uc6a9 \uc911\uc778 \uc774\uba54\uc77c':'\uc624\ub958: '+ex.message;\n    err.style.display='block';\n  });\n}\n\n// \u2500\u2500 \uc571 \ud45c\uc2dc \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n

function _showApp(){\n  document.getElementById('login-screen').style.display='none';\n  document.getElementById('app').style.display='flex';\n  var type=_CU.type;\n  var badge=document.getElementById('hdr-badge');\n  badge.textContent=type==='admin'?'\uad00\ub9ac\uc790':type==='agency'?'\ub300\ub9ac\uc810':'\uae30\uc0ac';\n  badge.className='hdr-badge '+(type==='admin'?'badge-admin':type==='agency'?'badge-agency':'badge-driver');\n  _buildNav();_goPage('home');\n}\n\n// \u2500\u2500 \ub124\ube44 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// ── SVG 아이콘 맵 ─────────────────────────────────────────────────────────
var _SVG={
  home:'<svg viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>',
  list:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 11c1.7 0 3 1.3 3 3m3 6c0-2.8-2.7-5-6-5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
  zap:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  brain:'<svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 007 4.5v.5M9.5 2A2.5 2.5 0 0112 4.5M9.5 2C8 2 7 3 7 4.5V7a5 5 0 000 10v2.5A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5V17a5 5 0 000-10V4.5A2.5 2.5 0 0014.5 2"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  arrowRight:'<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  chevRight:'<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'
};

// ── 네비게이션 빌드 ──────────────────────────────────────────────────────



// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// SVG ?꾩씠肄?// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??var _SVG = {
  home:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>',
  truck:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  pin:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  user:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  users:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 11c1.7 0 3 1.3 3 3m3 6c0-2.8-2.7-5-6-5"/></svg>',
  plus:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  list:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  map:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  brain:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9.5 2A2.5 2.5 0 007 4.5V5a5 5 0 000 10v2.5A2.5 2.5 0 009.5 20h5a2.5 2.5 0 002.5-2.5V15a5 5 0 000-10V4.5A2.5 2.5 0 0014.5 2z"/></svg>',
  bolt:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  arrow:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  bell:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  chart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
};

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?쒖옣 ?됯퇏 ?④?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??var _MKT = {'CJ??쒗넻??:880,'?쒖쭊?앸같':855,'濡?뜲?앸같':860,'?곗껜援?:900,'荑좏뙜濡쒖??ㅽ떛??:960,'濡쒖젨?앸같':840};

function _courierCls(c) {
  if(!c) return '';
  if(c.indexOf('CJ')>=0)   return '--cj';
  if(c.indexOf('?쒖쭊')>=0) return '--hj';
  if(c.indexOf('濡?뜲')>=0) return '--lt';
  if(c.indexOf('?곗껜援?)>=0) return '--up';
  if(c.indexOf('荑좏뙜')>=0) return '--cp';
  if(c.indexOf('濡쒖젨')>=0) return '--rz';
  return '';
}

function _courierColor(c) {
  var m = {'CJ??쒗넻??:'#e63946','?쒖쭊?앸같':'#457b9d','濡?뜲?앸같':'#f4a261','?곗껜援?:'#2a9d8f','荑좏뙜濡쒖??ㅽ떛??:'#ff6b35','濡쒖젨?앸같':'#9b59b6'};
  return m[c] || '#6366f1';
}

function _rateVsMarket(price, courier) {
  var avg = _MKT[courier] || 880;
  return Math.round((price - avg) / avg * 100);
}

function _timeAgo(ts) {
  if(!ts || !ts.seconds) return '';
  var sec = Math.floor(Date.now()/1000 - ts.seconds);
  if(sec < 60)    return '諛⑷툑';
  if(sec < 3600)  return Math.floor(sec/60)+'遺???;
  if(sec < 86400) return Math.floor(sec/3600)+'?쒓컙 ??;
  return Math.floor(sec/86400)+'????;
}

function _calcMatchScore(post) {
  if(!_CU || _CU.type !== 'driver') return null;
  var s = 50;
  if(_CU.region && post.region === _CU.region) s += 28;
  if(_CU.carType && post.vehicleType && post.vehicleType.indexOf(_CU.carType)>=0) s += 12;
  var avg = _MKT[post.courier] || 880;
  if(post.unitPrice > avg*1.08) s += 10; else if(post.unitPrice < avg*0.92) s -= 8;
  if(post.minGuarantee > 30) s += 5;
  return Math.min(98, Math.max(22, s));
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?ㅻ퉬寃뚯씠??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??function _buildNav() {
  var type = _CU.type;
  var tabs;
  if(type === 'admin') {
    tabs = [{ico:'home',lbl:'??,p:'home'},{ico:'list',lbl:'?꾩껜怨듦퀬',p:'posts'},
            {ico:'plus',lbl:'?깅줉',p:'post_write'},{ico:'users',lbl:'?뚯썝',p:'members'},{ico:'user',lbl:'?댁젙蹂?,p:'profile'}];
  } else if(type === 'agency') {
    tabs = [{ico:'home',lbl:'??,p:'home'},{ico:'list',lbl:'??怨듦퀬',p:'my_posts'},
            {ico:'plus',lbl:'怨듦퀬?깅줉',p:'post_write'},{ico:'user',lbl:'?댁젙蹂?,p:'profile'}];
  } else {
    tabs = [{ico:'home',lbl:'??,p:'home'},{ico:'truck',lbl:'怨듦퀬',p:'posts'},
            {ico:'pin',lbl:'吏?먰쁽??,p:'my_applies'},{ico:'user',lbl:'?댁젙蹂?,p:'profile'}];
  }
  document.getElementById('bnav').innerHTML = tabs.map(function(t) {
    return '<button class="nb" id="bnav-'+t.p+'" onclick="_goPage(\''+t.p+'\')">'+
      _SVG[t.ico]+'<span>'+t.lbl+'</span></button>';
  }).join('');
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?????섏씡 ??쒕낫??+ ??AI 肄붿튂
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??var _coachCache = null;

function _pgHome(el) {
  var type = _CU.type;
  if(type === 'driver') {
    _pgHomeDriver(el);
  } else if(type === 'agency') {
    _pgHomeAgency(el);
  } else {
    _pgHomeAdmin(el);
  }
}

function _pgHomeDriver(el) {
  el.innerHTML =
    '<div class="earn-hero">'+
    '<div class="earn-hero-top">'+
    '<div>'+
    '<div class="earn-label">?ㅻ뒛 理쒕? ?섏씡 媛??/div>'+
    '<div class="earn-big" id="earn-big">??/div>'+
    '</div>'+
    '<div class="earn-tag" id="earn-region">'+(_CU.region||'')+'</div>'+
    '</div>'+
    '<div class="earn-bar-wrap"><div class="earn-bar" id="earn-bar" style="width:0%"></div></div>'+
    '<div class="earn-bar-label">怨듦퀬 遺꾩꽍 以?..</div>'+
    '</div>'+

    '<div class="ai-coach-card" id="ai-coach-card">'+
    '<div class="aic-header">'+
    '<div class="aic-icon">'+_SVG.brain+'</div>'+
    '<div>'+
    '<div class="aic-title">AI 肄붿튂</div>'+
    '<div class="aic-sub">Claude媛 ??議곌굔??留욌뒗 怨듦퀬瑜?遺꾩꽍?댁슂</div>'+
    '</div>'+
    '<div class="aic-badge">LIVE</div>'+
    '</div>'+
    '<div class="aic-body" id="aic-body">'+
    '<div class="aic-skel"><div class="skel skel-lg"></div><div class="skel skel-md"></div><div class="skel skel-sm"></div></div>'+
    '</div>'+
    '</div>'+

    '<div class="mkt-card">'+
    '<div class="mkt-hdr"><div class="mkt-icon">'+_SVG.chart+'</div><span class="mkt-title">?쒖옣 ?꾪솴</span><span class="live-dot"></span></div>'+
    '<div class="mkt-grid" id="mkt-grid"><div style="color:var(--t3);font-size:12px">遺꾩꽍 以?..</div></div>'+
    '</div>'+

    '<div class="quick-card">'+
    '<div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:10px">理쒖떊 怨듦퀬</div>'+
    '<div id="home-posts-list"><div class="spinner" style="margin:10px auto"></div></div>'+
    '</div>';

  // 怨듦퀬 遺덈윭???AI 肄붿튂 + ?쒖옣 ?꾪솴 + 怨듦퀬 由ъ뒪??梨꾩슦湲?  _db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap) {
    var posts = [];
    snap.forEach(function(doc){ posts.push(Object.assign({id:doc.id},doc.data())); });

    // 理쒕? ?섏씡 怨꾩궛
    var myPosts = posts.filter(function(p){ return _CU.region ? p.region===_CU.region : true; });
    var topEst = myPosts.reduce(function(max,p){ var e=p.unitPrice&&p.volume?p.unitPrice*p.volume/10000:0; return e>max?e:max; },0);
    var earnEl = document.getElementById('earn-big');
    var barEl  = document.getElementById('earn-bar');
    if(earnEl) earnEl.textContent = topEst>0 ? Math.round(topEst)+'留뚯썝' : '怨듦퀬 ?놁쓬';
    if(barEl)  barEl.style.width = topEst>0 ? Math.min(100, topEst/2)+'%' : '0%';
    var barLabel = el.querySelector('.earn-bar-label');
    if(barLabel) barLabel.textContent = myPosts.length+'媛?怨듦퀬 湲곗? ('+(_CU.region||'?꾧뎅')+')';

    // ?쒖옣 ?꾪솴
    var mktGrid = document.getElementById('mkt-grid');
    if(mktGrid) {
      var byCourier = {};
      posts.forEach(function(p){ if(!byCourier[p.courier]) byCourier[p.courier]={sum:0,cnt:0}; byCourier[p.courier].sum+=p.unitPrice||0; byCourier[p.courier].cnt++; });
      var rows = Object.keys(byCourier).slice(0,3).map(function(c) {
        var avg = Math.round(byCourier[c].sum/byCourier[c].cnt);
        var mkt = _MKT[c]||880;
        var diff = Math.round((avg-mkt)/mkt*100);
        var cls = diff>0?'up':diff<0?'dn':'';
        return '<div class="mkt-row"><span class="mkt-name">'+c.replace('?앸같','').replace('??쒗넻??,'').replace('濡쒖??ㅽ떛??,'')+'</span>'+
          '<span class="mkt-cnt">'+byCourier[c].cnt+'嫄?/span>'+
          '<span class="mkt-rate'+' mkt-'+cls+'">'+avg+'??'+(diff>0?'??':diff<0?'??:'')+(diff!==0?Math.abs(diff)+'%':'')+'</span></div>';
      }).join('');
      mktGrid.innerHTML = rows || '<div style="color:var(--t3);font-size:12px">怨듦퀬 ?놁쓬</div>';
    }

    // ??理쒖떊 怨듦퀬 誘몃━蹂닿린 (理쒕? 3媛?
    var homeList = document.getElementById('home-posts-list');
    if(homeList) {
      if(!myPosts.length) { homeList.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">??吏??怨듦퀬 ?놁쓬</div>'; }
      else {
        homeList.innerHTML = myPosts.slice(0,3).map(function(p){ return _makePostCard(p).outerHTML; }).join('');
        homeList.insertAdjacentHTML('beforeend','<button class="more-link" onclick="_goPage(\'posts\')">'+_SVG.arrow+' ?꾩껜 怨듦퀬 蹂닿린</button>');
      }
    }

    // AI 肄붿튂 (Claude API)
    _callAICoach(myPosts.slice(0,8));
  });
}

function _callAICoach(posts) {
  var bodyEl = document.getElementById('aic-body');
  if(!bodyEl) return;

  // 罹먯떆 ?덉쑝硫??ъ궗??  if(_coachCache) { _renderCoach(_coachCache, posts); return; }

  fetch('/api/ai-coach', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      driver: { region:_CU.region||'', carType:_CU.carType||'', name:_CU.name },
      posts: posts.map(function(p){ return {id:p.id,courier:p.courier,area:p.area,region:p.region,unitPrice:p.unitPrice,volume:p.volume,workShift:p.workShift,vehicleType:p.vehicleType}; })
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(res) {
    if(res.ok && res.data) {
      _coachCache = res.data;
      _renderCoach(res.data, posts);
    } else {
      if(bodyEl) bodyEl.innerHTML = '<div style="color:var(--t2);font-size:13px">吏湲덉? 遺꾩꽍??遺덈윭?????놁뼱??/div>';
    }
  })
  .catch(function() {
    if(bodyEl) bodyEl.innerHTML = '<div style="color:var(--t2);font-size:13px">?ㅽ듃?뚰겕 ?ㅻ쪟</div>';
  });
}

function _renderCoach(data, posts) {
  var bodyEl = document.getElementById('aic-body');
  if(!bodyEl) return;
  var best = posts.find(function(p){ return p.id===data.bestPickId; });
  bodyEl.innerHTML =
    '<div class="aic-msg">'+data.summary+'</div>'+
    (best ? '<div class="aic-pick" onclick="_showPostDetail('+JSON.stringify(best)+')">'+
      '<div><div style="font-size:11px;color:var(--t2);margin-bottom:2px">異붿쿇 怨듦퀬</div>'+
      '<div style="font-weight:800">'+best.courier+' 쨌 '+best.region+' '+best.area+'</div>'+
      '<div style="font-size:11px;color:var(--t2);margin-top:2px">'+data.reason+'</div></div>'+
      '<div style="color:var(--gn)">'+_SVG.arrow+'</div></div>' : '')+
    (data.applyMsg ? '<div class="aic-applymsg">'+_SVG.bolt+' <span>吏??硫붿떆吏: "'+data.applyMsg+'"</span></div>' : '');
}

function _pgHomeAgency(el) {
  el.innerHTML = '<div class="page-hdr"><div class="page-title">?由ъ젏 ?꾪솴</div></div>';
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).orderBy('createdAt','desc').limit(10).get()
  .then(function(snap) {
    var posts=[]; snap.forEach(function(doc){posts.push(Object.assign({id:doc.id},doc.data()));});
    var openCnt = posts.filter(function(p){return p.status==='open';}).length;
    el.innerHTML += '<div class="stat-row">'+
      '<div class="stat-box"><div class="stat-val">'+posts.length+'</div><div class="stat-lbl">?깅줉 怨듦퀬</div></div>'+
      '<div class="stat-box"><div class="stat-val" style="color:var(--gn)">'+openCnt+'</div><div class="stat-lbl">紐⑥쭛以?/div></div>'+
      '</div>';
    if(posts.length) {
      el.innerHTML += '<div style="font-size:12px;font-weight:700;color:var(--t2);margin:16px 0 8px">理쒓렐 怨듦퀬</div>';
      posts.slice(0,3).forEach(function(p){ el.appendChild(_makePostCard(p)); });
    }
    el.insertAdjacentHTML('beforeend','<button class="btn-main" onclick="_goPage(\'post_write\')" style="margin-top:12px">+ ??怨듦퀬 ?깅줉</button>');
  });
}

function _pgHomeAdmin(el) {
  el.innerHTML = '<div class="page-hdr"><div class="page-title">愿由ъ옄 ??쒕낫??/div></div>';
  Promise.all([
    _db.collection('yongcha_posts').get(),
    _db.collection('yongcha_users').get(),
    _db.collection('yongcha_applies').get()
  ]).then(function(results) {
    el.innerHTML += '<div class="stat-row">'+
      '<div class="stat-box"><div class="stat-val">'+results[0].size+'</div><div class="stat-lbl">?꾩껜 怨듦퀬</div></div>'+
      '<div class="stat-box"><div class="stat-val">'+results[1].size+'</div><div class="stat-lbl">?꾩껜 ?뚯썝</div></div>'+
      '<div class="stat-box"><div class="stat-val">'+results[2].size+'</div><div class="stat-lbl">吏??嫄댁닔</div></div>'+
      '</div>';
  });
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// 怨듦퀬 紐⑸줉 ???⑹감 / 媛꾩꽑李?+ 吏??/ 紐⑸줉
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??var _postsUnsub = null;
var _allPosts   = [];
var _postRegion = '?꾩껜';
var _postType   = 'yongcha';   // yongcha | express
var _postView   = 'list';      // list | map
var REGIONS = ['?꾩껜','遺??,'?援?,'?쒖슱','寃쎄린','?몄쿇','愿묒＜','???,'?몄궛','寃쎈궓','寃쎈턿','?꾨궓','?꾨턿','異⑸궓','異⑸턿','媛뺤썝','?쒖＜'];

function _pgPosts(el) {
  el.innerHTML =
    '<div class="pgp-header">'+
    '<div class="pgp-tabs">'+
    '<button class="pgp-tab on" id="pt-yongcha" onclick="_setPType(\'yongcha\')">?⑹감</button>'+
    '<button class="pgp-tab" id="pt-express" onclick="_setPType(\'express\')">媛꾩꽑李?/button>'+
    '</div>'+
    '<button class="view-toggle" id="view-toggle" onclick="_toggleView()">'+_SVG.map+'吏??/button>'+
    '</div>'+

    '<div class="rgn-row" id="rgn-row">'+
    REGIONS.map(function(r){
      return '<button class="rgn-chip'+(r===_postRegion?' on':'')+'" onclick="_setRegion(\''+r+'\')">'+r+'</button>';
    }).join('')+
    '</div>'+

    '<div id="plist-map" style="display:none;height:340px;border-radius:12px;overflow:hidden;margin-bottom:12px;background:var(--bg2)"></div>'+
    '<div id="plist"></div>';

  _startPostsListener();
}

function _setPType(t) {
  _postType = t;
  document.getElementById('pt-yongcha').classList.toggle('on', t==='yongcha');
  document.getElementById('pt-express').classList.toggle('on', t==='express');
  _renderPosts();
}

function _setRegion(r) {
  _postRegion = r;
  document.querySelectorAll('.rgn-chip').forEach(function(b){ b.classList.remove('on'); });
  var active = Array.from(document.querySelectorAll('.rgn-chip')).find(function(b){ return b.textContent===r; });
  if(active) active.classList.add('on');
  _renderPosts();
}

function _toggleView() {
  _postView = _postView==='list' ? 'map' : 'list';
  var btn = document.getElementById('view-toggle');
  var mapDiv = document.getElementById('plist-map');
  var listDiv = document.getElementById('plist');
  if(_postView==='map') {
    if(btn) btn.innerHTML = _SVG.list+'紐⑸줉';
    if(mapDiv) mapDiv.style.display = 'block';
    if(listDiv) listDiv.style.display = 'none';
    _initPostsMap();
  } else {
    if(btn) btn.innerHTML = _SVG.map+'吏??;
    if(mapDiv) mapDiv.style.display = 'none';
    if(listDiv) listDiv.style.display = 'block';
  }
}

function _startPostsListener() {
  var listDiv = document.getElementById('plist');
  if(listDiv) listDiv.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';
  if(_postsUnsub) { _postsUnsub(); _postsUnsub = null; }
  _postsUnsub = _db.collection('yongcha_posts').orderBy('createdAt','desc').limit(100).onSnapshot(function(snap) {
    _allPosts = [];
    snap.forEach(function(doc){ _allPosts.push(Object.assign({id:doc.id},doc.data())); });
    _renderPosts();
  }, function(err) {
    var el = document.getElementById('plist');
    if(el) el.innerHTML = '<div class="empty-state">?곌껐 ?ㅻ쪟: '+err.message+'</div>';
  });
}

function _renderPosts() {
  if(_postView === 'map') { _renderMapPosts(); return; }
  var el = document.getElementById('plist');
  if(!el) return;

  if(_postType === 'express') { _renderExpressList(el); return; }

  var posts = _allPosts.filter(function(p) {
    if(_postRegion !== '?꾩껜' && p.region !== _postRegion) return false;
    if(p.jobType === 'express') return false;
    return true;
  });

  // 湲닿툒?믩え吏묒쨷?믩ℓ移?넂留덇컧 ??  posts.sort(function(a,b) {
    var rank = function(p) { return p.urgent?0:p.status==='open'?1:p.status==='matched'?2:3; };
    return rank(a)-rank(b);
  });

  if(!posts.length) {
    el.innerHTML = '<div class="empty-state">'+_SVG.truck+'<div>?대떦 議곌굔??怨듦퀬媛 ?놁뼱??/div></div>';
    return;
  }

  el.innerHTML = '';
  posts.forEach(function(p) { el.appendChild(_makePostCard(p)); });
}

function _renderExpressList(el) {
  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';
  _db.collection('yongcha_posts').where('jobType','==','express').orderBy('createdAt','desc').limit(30).get()
  .then(function(snap) {
    var posts=[]; snap.forEach(function(doc){posts.push(Object.assign({id:doc.id},doc.data()));});
    if(!posts.length) {
      el.innerHTML =
        '<div class="express-hero">'+
        '<div class="exh-icon">'+_SVG.truck+'</div>'+
        '<div class="exh-title">?꾧뎅 媛꾩꽑 ?몄꽑</div>'+
        '<div class="exh-sub">?붾Ъ??쨌 ?붾Ъ24 API ?곕룞 以鍮?以?/div>'+
        '<div class="exh-partners"><span>?붾Ъ??/span><span>?붾Ъ24</span><span>?묐젰??/span></div>'+
        '</div>';
      return;
    }
    el.innerHTML='';
    posts.forEach(function(p){ el.appendChild(_makePostCard(p)); });
  });
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// 怨듦퀬 移대뱶 ???섏씡 以묒떖, ?먰꺆 吏??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??function _makePostCard(d) {
  var isClosed  = d.status==='closed';
  var isMatched = d.status==='matched';
  var score = _calcMatchScore(d);
  var dayEst = d.unitPrice&&d.volume ? Math.round(d.unitPrice*d.volume/10000) : 0;
  var minG   = d.workShift==='?쇨컙' ? 35 : 30;
  var rp = _rateVsMarket(d.unitPrice||0, d.courier);

  // ?곹깭 諭껋?
  var statusCls = isClosed?'bdg-closed':isMatched?'bdg-matched':d.urgent?'bdg-urgent':'bdg-open';
  var statusTxt = isClosed?'留덇컧':isMatched?'留ㅼ묶?꾨즺':d.urgent?'湲닿툒':'紐⑥쭛以?;

  // AI ?ㅼ퐫??留?  var scoreColor = score ? (score>=80?'#00d084':score>=60?'#ffd60a':'#6b6b90') : 'transparent';

  var card = document.createElement('article');
  card.className = 'pcard' + _courierCls(d.courier) + (isClosed?' pcard-closed':'');
  card.style.borderLeftColor = _courierColor(d.courier);

  card.innerHTML =
    '<div class="pc-top">'+
    '<div class="pc-meta">'+
    '<span class="pc-courier">'+d.courier+'</span>'+
    (d.workShift==='?쇨컙'?'<span class="bdg bdg-night">?쇨컙</span>':d.workShift==='二쇨컙'?'<span class="bdg bdg-day">二쇨컙</span>':'')+
    '<span class="bdg '+statusCls+'">'+statusTxt+'</span>'+
    '</div>'+
    (score?'<div class="pc-ai" style="border-color:'+scoreColor+';color:'+scoreColor+'">'+score+'%</div>':'')+
    '</div>'+

    '<div class="pc-area">'+d.region+' '+d.area+'</div>'+

    '<div class="pc-tags">'+
    (d.vehicleType?'<span>'+d.vehicleType+'</span>':'')+
    (d.volume?'<span>'+d.volume+'嫄???/span>':'')+
    (d.areaAptRatio?'<span>?꾪뙆??+d.areaAptRatio+'%</span>':'')+
    (d.workDays?'<span>'+d.workDays+'</span>':'')+
    '</div>'+

    '<div class="pc-earn">'+
    '<div>'+
    '<div class="pc-price">'+Number(d.unitPrice||0).toLocaleString()+'<span class="pc-unit">??嫄?/span></div>'+
    (rp!==0?'<div class="pc-mkt '+(rp>0?'mkt-up':'mkt-dn')+'">'+
      (rp>0?'??:'??)+' ?쒖옣媛 '+(rp>0?'+':'')+rp+'%</div>':'<div class="pc-mkt mkt-ok">?쒖옣 ?됯퇏</div>')+
    '</div>'+
    '<div class="pc-est">'+
    (dayEst?'<div class="pc-est-day">'+dayEst+'留뚯썝<span>/??/span></div>':'')+
    '<div class="pc-guarantee">理쒖냼 '+minG+'留?/div>'+
    '</div>'+
    '</div>'+

    '<div class="pc-foot">'+
    '<div class="pc-agency">'+d.agencyName+
    (d.settleDay?'<span class="pc-settle"> 쨌 '+d.settleDay+'</span>':'')+
    '<span class="pc-time"> 쨌 '+_timeAgo(d.createdAt)+'</span>'+
    '</div>'+
    (!isClosed&&_CU.type==='driver'?
      '<button class="quick-apply" onclick="event.stopPropagation();_quickApply(\''+d.id+'\',\''+d.agencyId+'\',\''+d.agencyName+'\')">'
        +_SVG.bolt+'吏??/button>' : '')+
    '</div>';

  if(!isClosed) card.onclick = function() { _showPostDetail(d); };
  return card;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?먰꺆 吏??(移대뱶?먯꽌 諛붾줈, 紐⑤떖 ?놁씠)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??function _quickApply(postId, agencyId, agencyName) {
  if(!_CU || _CU.type!=='driver') { _yToast('湲곗궗 怨꾩젙留?吏??媛?ν빐??); return; }
  _db.collection('yongcha_applies').where('postId','==',postId).where('driverId','==',_CU.uid).get()
  .then(function(snap) {
    if(!snap.empty) { _yToast('?대? 吏?먰븳 怨듦퀬?덉슂'); return; }
    return _db.collection('yongcha_applies').add({
      postId:postId, driverId:_CU.uid, driverName:_CU.name,
      agencyId:agencyId, agencyName:agencyName,
      status:'pending', appliedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  })
  .then(function(ref) {
    if(ref) _yToast('吏???꾨즺!');
  })
  .catch(function(e){ _yToast('?ㅻ쪟: '+e.message); });
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// 吏??酉?(Kakao Map??怨듦퀬 ?쒖떆)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??var _postsMap = null;
var _postsMarkers = [];

function _initPostsMap() {
  _loadKakaoMap(function() {
    var container = document.getElementById('plist-map');
    if(!container) return;
    if(!_postsMap) {
      var center = new kakao.maps.LatLng(35.1796,129.0756);
      _postsMap = new kakao.maps.Map(container, {center:center, level:7});
    }
    _postsMap.relayout();
    _renderMapPosts();
  });
}

function _renderMapPosts() {
  if(!_postsMap) return;
  (_postsMarkers||[]).forEach(function(m){ m.setMap(null); });
  _postsMarkers = [];
  var posts = _allPosts.filter(function(p){
    return p.status==='open' && (p.lat||(_postsMap&&p.zones&&p.zones.length));
  });
  posts.forEach(function(p) {
    var lat = p.lat || (p.zones&&p.zones[0]&&p.zones[0].lat);
    var lng = p.lng || (p.zones&&p.zones[0]&&p.zones[0].lng);
    if(!lat||!lng) return;
    var color = _courierColor(p.courier);
    var content = '<div style="background:'+color+';color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">'+
      Number(p.unitPrice||0).toLocaleString()+'??/div>';
    var marker = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat,lng),
      content: content,
      yAnchor: 1
    });
    marker.setMap(_postsMap);
    _postsMarkers.push(marker);
  });
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?꾪꽣 ?명솚 stub
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??function _renderCourierTabs(){}
function _selectCourier(){}
function _renderCourierFilter(){}
function _renderRegionFilter(){}
function _renderPostSections(){}
function _makeSlideCard(d){ return _makePostCard(d).outerHTML; }
function _changePage(){}

function _showPostDetail(d){\n  var isDriver=_CU.type==='driver';\n  document.getElementById('modal-body').innerHTML=\n    '<div style=\"margin-bottom:16px\">'+\n    '<span class=\"courier-badge\">\ud83d\ude9a '+d.courier+'</span>'+\n    '</div>'+\n    '<div style=\"font-size:22px;font-weight:900;margin-bottom:14px;line-height:1.3\">'+d.region+' '+d.area+'</div>'+\n\n    ((d.zones&&d.zones.length||d.lat)?\n      '<div style=\"margin-bottom:14px\">'+\n      (d.zones&&d.zones.length?\n        '<div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px\" id=\"zone-tab-wrap\">'+\n        d.zones.map(function(z,i){\n          return '<button onclick=\"_showZoneOnMap('+i+')\" id=\"ztab-'+i+'\" style=\"padding:5px 12px;border-radius:20px;border:2px solid var(--ac);background:'+(i===0?'var(--ac)':'transparent')+';color:'+(i===0?'#000':'var(--ac)')+';font-size:12px;font-weight:700;cursor:pointer\">'+\n            '\ud83d\udcee '+z.zipcode+'<br><span style=\"font-weight:400;font-size:10px\">'+z.name+'</span></button>';\n        }).join('')+\n        '</div>'\n      :'')+\n      '<div class=\"map-wrap\" style=\"margin-bottom:0\"><div id=\"detail-map\" style=\"width:100%;height:200px;background:var(--bg3)\"></div></div>'+\n      '</div>'\n    :'')+\n    '<div style=\"margin:10px 0;padding:12px;background:var(--gnl);border-radius:10px\">'+\n    '<div style=\"font-size:11px;color:var(--t2);margin-bottom:4px\">\u2705 \ud50c\ub7ab\ud3fc \ucd5c\uc18c\ubcf4\uc7a5</div>'+\n    '<div style=\"font-size:18px;font-weight:900;color:var(--gn)\">'+(d.workShift==='\uc57c\uac04'?'\uc77c 35\ub9cc\uc6d0':'\uc77c 30\ub9cc\uc6d0')+'</div>'+\n    '<div style=\"font-size:10px;color:var(--t3);margin-top:2px\">\uac74\uc218 \ubbf8\ub2ec \uc2dc\uc5d0\ub3c4 \ubcf4\uc7a5\uc561 \uc9c0\uae09 \uc758\ubb34</div>'+\n    '</div>'+\n    '<div class=\"detail-grid\">'+\n    [\n      ['\ud83d\udce6 \uc77c \ubb3c\ub7c9',d.volume+'\uac74'],\n      ['\ud83d\udcb0 \ub2e8\uac00',Number(d.unitPrice).toLocaleString()+'\uc6d0/'+(d.priceType||'\uac74')+(d.vatIncluded?' (VAT'+d.vatIncluded+')':'')],\n      ['\ud83d\ude97 \ucc28\ub7c9',d.vehicleType||'\ubb34\uad00'],\n      ['\ud83d\udd11 \ubc88\ud638\ud310',d.plateType||'\ubb34\uad00'],\n      ['\u23f0 \uc2dc\uac04',d.workHours||'\ud611\uc758'],\n      ['\ud83d\udcc5 \uc2dc\uc791\uc77c',d.startDate||'\ud611\uc758'],\n      ['\ud83c\udfe2 \uad6c\uc5ed',d.areaType||'\ud63c\ud569'],\n      ['\ud83c\udfe2 \uc544\ud30c\ud2b8',(d.areaAptRatio||'-')+'%'],\n      ['\ud83d\udcc6 \uadfc\ubb34\uc694\uc77c',d.workDays||'\ud611\uc758'],\n      ['\ud83d\udcb3 \uc815\uc0b0',d.settleDay||'\ud611\uc758']\n    ].map(function(r){\n      return '<div class=\"detail-item\"><div class=\"detail-lbl\">'+r[0]+'</div><div class=\"detail-val\">'+r[1]+'</div></div>';\n    }).join('')+'</div>'+\n    (d.extras?'<div style=\"display:flex;flex-wrap:wrap;gap:6px;margin:8px 0\">'+d.extras.split(',').filter(Boolean).map(function(e){'<span style=\"font-size:11px;background:var(--bg3);padding:3px 8px;border-radius:8px\">'+e+'</span>'}).join('')+'</div>':'')+\n\n    (d.desc?'<div class=\"card\" style=\"margin-bottom:14px\">'+\n    '<div style=\"font-size:11px;color:var(--t2);font-weight:700;margin-bottom:8px\">\uacf5\uace0 \uc0c1\uc138</div>'+\n    '<div style=\"font-size:13px;line-height:1.7;color:var(--t2)\">'+d.desc+'</div></div>':'')+\n\n    '<div class=\"card\" style=\"margin-bottom:16px\">'+\n    '<div style=\"display:flex;align-items:center;justify-content:space-between\">'+\n    '<div><div style=\"font-weight:800\">\ud83c\udfe2 '+d.agencyName+'</div>'+\n    '<div style=\"font-size:12px;color:var(--t2);margin-top:3px\">\ud83d\udccd '+d.region+'</div></div>'+\n    '<div style=\"font-size:16px;font-weight:800;color:var(--br)\">\u2b50 '+(d.agencyRating||'\uc2e0\uaddc')+'</div>'+\n    '</div></div>'+\n\n    (isDriver?'<button class=\"apply-btn\" id=\"apply-btn\" onclick=\"_applyPost(\\''+d.id+'\\',\\''+d.agencyId+'\\',\\''+d.agencyName+'\\')\">\ud83d\ude4b \uc9c0\uc6d0\ud558\uae30</button>':'');\n\n  _openModal();\n\n  // \uc9c0\ub3c4 \ud45c\uc2dc\n  window._detailZones = d.zones||[];\n  if(d.zones&&d.zones.length){\n    setTimeout(function(){_showDetailMap(d.zones[0].lat,d.zones[0].lng,d.zones[0].name);},400);\n  } else if(d.lat&&d.lng){\n    setTimeout(function(){_showDetailMap(d.lat,d.lng,d.area);},400);\n  }\n\n  // \uc774\ubbf8 \uc9c0\uc6d0 \uc5ec\ubd80 \ud655\uc778\n  if(isDriver){\n    _db.collection('yongcha_applies')\n      .where('postId','==',d.id).where('driverId','==',_CU.uid).get()\n      .then(function(snap){\n        var btn=document.getElementById('apply-btn');\n        if(btn&&!snap.empty){btn.textContent='\u2705 \uc774\ubbf8 \uc9c0\uc6d0\ud568';btn.disabled=true;}\n      });\n  }\n}\n\nfunction _applyPost(postId,agencyId,agencyName){\n  var btn=document.getElementById('apply-btn');\n  if(btn){btn.textContent='\uc9c0\uc6d0 \uc911...';btn.disabled=true;}\n  _db.collection('yongcha_applies').add({\n    postId:postId,driverId:_CU.uid,driverName:_CU.name,\n    driverPhone:_CU.phone,driverRegion:_CU.region,\n    agencyId:agencyId,agencyName:agencyName,\n    status:'pending',\n    appliedAt:firebase.firestore.FieldValue.serverTimestamp()\n  }).then(function(){\n    _yToast('\u2705 \uc9c0\uc6d0 \uc644\ub8cc! \ub300\ub9ac\uc810 \uc2b9\uc778\uc744 \uae30\ub2e4\ub824\uc8fc\uc138\uc694');\n    _closeModal();\n  }).catch(function(e){\n    if(btn){btn.textContent='\ud83d\ude4b \uc9c0\uc6d0\ud558\uae30';btn.disabled=false;}\n    _yToast('\uc624\ub958: '+e.message);\n  });\n}\n\n// \u2500\u2500 \ub0b4 \uacf5\uace0 \uad00\ub9ac (\ub300\ub9ac\uc810) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _pgMyPosts(el){\n  el.innerHTML=\n  '<div class=\"page-hdr\"><div class=\"page-title\">\ud83d\udccb \ub0b4 \uacf5\uace0 \uad00\ub9ac</div>'+\n  '<div class=\"page-sub\">\ub4f1\ub85d\ud55c \uacf5\uace0\uc640 \uc9c0\uc6d0\uc790\ub97c \uad00\ub9ac\ud574\uc694</div></div>'+\n  '<button onclick=\"_goPage(\\'post_write\\')\" style=\"width:100%;padding:13px;background:var(--brl);color:var(--br);border:1.5px dashed var(--br);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;margin-bottom:14px;font-family:inherit\">+ \uc0c8 \uacf5\uace0 \ub4f1\ub85d\ud558\uae30</button>'+\n  '<div id=\"my-posts-list\"><div style=\"text-align:center;padding:40px\"><div class=\"spinner\"></div></div></div>';\n\n  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).orderBy('createdAt','desc').get()\n    .then(function(snap){\n      var list=document.getElementById('my-posts-list');if(!list)return;\n      if(snap.empty){list.innerHTML='<div class=\"empty\"><div class=\"empty-ico\">\ud83d\udced</div><div class=\"empty-msg\">\ub4f1\ub85d\ud55c \uacf5\uace0\uac00 \uc5c6\uc5b4\uc694<br><span style=\"font-size:11px;color:var(--t2)\">uid: '+(_CU&&_CU.uid||'\uc5c6\uc74c')+'</span></div></div>';return;}\n      list.innerHTML='';\n      snap.forEach(function(doc){\n        var d=Object.assign({id:doc.id},doc.data());\n        var card=document.createElement('div');card.className='card';\n        card.innerHTML=\n          '<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:10px\">'+\n          '<div style=\"font-size:15px;font-weight:800\">'+d.region+' '+d.area+'</div>'+\n          '<span class=\"status-badge '+(d.status==='open'?'badge-open':'badge-closed')+'\">'+(d.status==='open'?'\ubaa8\uc9d1\uc911':'\ub9c8\uac10')+'</span>'+\n          '</div>'+\n          '<div style=\"display:flex;gap:10px;font-size:12px;color:var(--t2);margin-bottom:12px\">'+\n          '<span>\ud83d\ude9a '+d.courier+'</span><span>\ud83d\udce6 '+d.volume+'\ubc15\uc2a4</span><span>\ud83d\udcb0 '+Number(d.unitPrice).toLocaleString()+'\uc6d0</span>'+\n          '</div>'+\n          '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">'+\n          '<button onclick=\"_showApplicants(\\''+d.id+'\\')\" style=\"padding:10px;background:var(--brl);border:none;border-radius:10px;color:var(--br);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit\">\ud83d\udc65 \uc9c0\uc6d0\uc790 \ud655\uc778</button>'+\n          '<button onclick=\"_togglePost(\\''+d.id+'\\',\\''+d.status+'\\')\" style=\"padding:10px;background:var(--bg3);border:none;border-radius:10px;color:var(--t2);font-size:13px;cursor:pointer;font-family:inherit\">'+(d.status==='open'?'\ub9c8\uac10\ucc98\ub9ac':'\uc7ac\uc624\ud508')+'</button>'+\n          '</div>';\n        list.appendChild(card);\n      });\n    });\n}\n\nfunction _togglePost(id,status){\n  var next=status==='open'?'closed':'open';\n  _db.collection('yongcha_posts').doc(id).update({status:next}).then(function(){\n    _yToast(next==='open'?'\uacf5\uace0 \uc7ac\uc624\ud508\ub410\uc5b4\uc694':'\uacf5\uace0 \ub9c8\uac10\ub410\uc5b4\uc694');\n    _pgMyPosts(document.getElementById('content'));\n  });\n}\n\nfunction _showApplicants(postId){\n  _db.collection('yongcha_applies').where('postId','==',postId).get().then(function(snap){\n    var body=document.getElementById('modal-body');\n    body.innerHTML='<div style=\"font-size:18px;font-weight:900;margin-bottom:16px\">\ud83d\udc65 \uc9c0\uc6d0\uc790 \ubaa9\ub85d</div>';\n    if(snap.empty){body.innerHTML+='<div class=\"empty\"><div class=\"empty-ico\">\ud83d\udced</div><div class=\"empty-msg\">\uc544\uc9c1 \uc9c0\uc6d0\uc790\uac00 \uc5c6\uc5b4\uc694</div></div>';_openModal();return;}\n    snap.forEach(function(doc){\n      var a=Object.assign({id:doc.id},doc.data());\n      var statusMap={pending:'\u23f3 \uac80\ud1a0\uc911',approved:'\u2705 \uc2b9\uc778',rejected:'\u274c \uac70\uc808'};\n      var statusColor={pending:'var(--br)',approved:'var(--gn)',rejected:'var(--t3)'};\n      var card=document.createElement('div');card.className='applicant-card';\n      card.innerHTML=\n        '<div class=\"applicant-top\">'+\n        '<span class=\"applicant-name\">\ud83d\ude97 '+a.driverName+'</span>'+\n        '<span style=\"font-size:12px;font-weight:700;color:'+(statusColor[a.status]||'var(--t2)')+'\">'+\n        (statusMap[a.status]||a.status)+'</span></div>'+\n        '<div class=\"applicant-meta\">\ud83d\udccd '+a.driverRegion+' \u00b7 \ud83d\udcde '+a.driverPhone+'</div>'+\n        (a.status==='pending'?\n        '<div class=\"judge-row\">'+\n        '<button class=\"judge-btn judge-approve\" onclick=\"_judgeApply(\\''+a.id+'\\',\\'approved\\',\\''+a.driverName+'\\')\">\u2705 \uc2b9\uc778</button>'+\n        '<button class=\"judge-btn judge-reject\" onclick=\"_judgeApply(\\''+a.id+'\\',\\'rejected\\',\\''+a.driverName+'\\')\">\u274c \uac70\uc808</button>'+\n        '</div>':'');\n      body.appendChild(card);\n    });\n    _openModal();\n  });\n}\n\nfunction _judgeApply(applyId,status,name){\n  _db.collection('yongcha_applies').doc(applyId).update({\n    status:status,judgedAt:firebase.firestore.FieldValue.serverTimestamp()\n  }).then(function(){\n    _yToast(status==='approved'?'\u2705 '+name+'\ub2d8 \uc2b9\uc778\ud588\uc5b4\uc694!':'\uac70\uc808\ud588\uc5b4\uc694');\n    _closeModal();\n    _pgHome(document.getElementById('content'));\n  });\n}\n\n// \u2500\u2500 \uacf5\uace0 \ub4f1\ub85d \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _pgPostWrite(el){\n  window._zones=[];\n  el.innerHTML=\n  '<div class=\"page-hdr\"><div class=\"page-title\">\u270f\ufe0f \uacf5\uace0 \ub4f1\ub85d</div>'+\n  '<div class=\"page-sub\">\uc815\ud655\ud788 \uc785\ub825\ud560\uc218\ub85d \uc88b\uc740 \uae30\uc0ac\ub97c \ub9cc\ub098\uc694</div></div>'+\n\n  // \ud0dd\ubc30\uc0ac\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uae30\ubcf8 \uc815\ubcf4</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\ud0dd\ubc30\uc0ac <span style=\"color:var(--rd)\">*</span></label>'+\n  '<select class=\"inp\" id=\"pw-courier\"><option value=\"\">\uc120\ud0dd</option>'+\n  ['CJ\ub300\ud55c\ud1b5\uc6b4','\ud55c\uc9c4\ud0dd\ubc30','\ub86f\ub370\ud0dd\ubc30','\uc6b0\uccb4\uad6d','\ub85c\uc820\ud0dd\ubc30','\ucfe0\ud321\ub85c\uc9c0\uc2a4\ud2f1\uc2a4'].map(function(c){return '<option>'+c+'</option>';}).join('')+\n  '</select></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\ub178\uc120\ubc88\ud638</label>'+\n  '<input class=\"inp\" id=\"pw-routeNo\" placeholder=\"\uc608: \ubd80\uc0b0-\ud574\uc6b4\ub300-001\"></div>'+\n  '</div>'+\n\n  // \uacf5\uace0 \uc720\ud615\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uacf5\uace0 \uc720\ud615</div>'+\n  '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\" id=\"pw-type-group\">'+\n  ['\ud558\ub8e8 \ub300\ud0c0','\uc8fc\ub2e8\uc704','\uc6d4\ub2e8\uc704','\uc0c1\uc2dc\ubaa8\uc9d1'].map(function(t,i){\n    return '<button onclick=\"_selType(this,\\''+t+'\\',\\'pw-type\\')\" style=\"padding:10px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer\">'+t+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-type\">'+\n\n  // \uadfc\ubb34 \uc2dc\uac04\ub300\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uadfc\ubb34 \uc2dc\uac04\ub300</div>'+\n  '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px\" id=\"pw-shift-group\">'+\n  ['\uc8fc\uac04','\uc57c\uac04','\ud611\uc758'].map(function(s){\n    return '<button onclick=\"_selType(this,\\''+s+'\\',\\'pw-shift\\')\" style=\"padding:10px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer\">'+s+'</button>';\n  }).join('')+\n  '</div>'+\n  '<input type=\"hidden\" id=\"pw-shift\">'+\n  '<div class=\"inp-wrap\" style=\"margin-top:10px\"><label class=\"inp-lbl\">\uadfc\ubb34 \uc2dc\uac04 (\uc9c1\uc811 \uc785\ub825)</label>'+\n  '<input class=\"inp\" id=\"pw-hours\" placeholder=\"\uc608: 06:00 ~ 14:00\"></div>'+\n  '</div>'+\n\n  // \uadfc\ubb34 \uc694\uc77c\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uadfc\ubb34 \uc694\uc77c</div>'+\n  '<div style=\"display:flex;gap:6px;flex-wrap:wrap\" id=\"pw-days-group\">'+\n  ['\uc6d4','\ud654','\uc218','\ubaa9','\uae08','\ud1a0','\uc77c'].map(function(d){\n    return '<button onclick=\"_toggleDay(this,\\''+d+'\\')\" style=\"width:40px;height:40px;border-radius:50%;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer\">'+d+'</button>';\n  }).join('')+\n  '</div>'+\n  '<div id=\"pw-days-val\" style=\"display:none\"></div>'+\n  '</div>'+\n\n  // \uae30\uac04\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uae30\uac04</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc2dc\uc791\uc77c</label>'+\n  '<input class=\"inp\" id=\"pw-date\" type=\"date\"></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc885\ub8cc\uc77c</label>'+\n  '<input class=\"inp\" id=\"pw-enddate\" type=\"date\" placeholder=\"\uc0c1\uc2dc\ubaa8\uc9d1\uc774\uba74 \ube44\uc6cc\ub450\uc138\uc694\"></div>'+\n  '</div>'+\n\n  // \ucc28\ub7c9 \uc694\uac74\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\ucc28\ub7c9 \uc694\uac74</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\ucc28\uc885</label>'+\n  '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\" id=\"pw-vehicle-group\">'+\n  ['1\ud1a4 \ud558\uc774\ud0d1','1\ud1a4 \ub85c\uc6b0\ud0d1','1.4\ud1a4','\ubb34\uad00'].map(function(v){\n    return '<button onclick=\"_selType(this,\\''+v+'\\',\\'pw-vehicle\\')\" style=\"padding:8px;border-radius:10px;border:1.5px solid '+(v==='1\ud1a4 \ud0d1\ucc28'?'var(--ac)':'var(--border)')+';background:'+(v==='1\ud1a4 \ud0d1\ucc28'?'var(--acl)':'transparent')+';color:'+(v==='1\ud1a4 \ud0d1\ucc28'?'var(--ac)':'var(--t2)')+';font-size:12px;font-weight:700;cursor:pointer\">'+v+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-vehicle\" value=\"1\ud1a4 \ud0d1\ucc28\">'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc601\uc5c5\uc6a9 \ubc88\ud638\ud310</label>'+\n  '<div style=\"display:flex;gap:8px\" id=\"pw-plate-group\">'+\n  ['\uc544\ubc14\uc0ac\uc790 \ud544\uc218','\ubc30\ub118\ubc84 \ud544\uc218','\ubb34\uad00'].map(function(p){\n    return '<button onclick=\"_selType(this,\\''+p+'\\',\\'pw-plate\\')\" style=\"flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer\">'+p+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-plate\">'+\n  '</div>'+\n\n  // \ub2e8\uac00 \uad6c\uc870\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\ub2e8\uac00 \uad6c\uc870</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\ub2e8\uac00 \ubc29\uc2dd</label>'+\n  '<div style=\"display:flex;gap:8px\" id=\"pw-pricetype-group\">'+\n  ['\uac74\ub2f9','\uac00\uad6c\ub2f9','\uac74\ub2f9+\uac00\uad6c\ub2f9'].map(function(p){\n    return '<button onclick=\"_selType(this,\\''+p+'\\',\\'pw-pricetype\\')\" style=\"flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer\">'+p+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-pricetype\">'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uac74\ub2f9 \ub2e8\uac00 (\uc6d0) <span style=\"color:var(--rd)\">*</span></label>'+\n  '<input class=\"inp\" id=\"pw-price\" type=\"number\" placeholder=\"\uc608: 880\" oninput=\"_calcEst()\"></div>'+\n  '<div class=\"inp-wrap\" id=\"pw-houseprice-wrap\" style=\"display:none\">'+\n  '<label class=\"inp-lbl\">\uac00\uad6c\ub2f9 \ub2e8\uac00 (\uc6d0)</label>'+\n  '<input class=\"inp\" id=\"pw-houseprice\" type=\"number\" placeholder=\"\uc608: 1200\"></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">VAT</label>'+\n  '<div style=\"display:flex;gap:8px\" id=\"pw-vat-group\">'+\n  ['\ubcc4\ub3c4','\ud3ec\ud568'].map(function(v){\n    return '<button onclick=\"_selType(this,\\''+v+'\\',\\'pw-vat\\')\" style=\"flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer\">VAT '+v+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-vat\">'+\n  '</div>'+\n\n  // \ubb3c\ub7c9 \ubc0f \ucd5c\uc18c\ubcf4\uc7a5\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\ubb3c\ub7c9</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc608\uc0c1 \uc77c \ubb3c\ub7c9 (\uac74) <span style=\"color:var(--rd)\">*</span></label>'+\n  '<input class=\"inp\" id=\"pw-volume\" type=\"number\" placeholder=\"\uc608: 150\" oninput=\"_calcEst()\"></div>'+\n  '<div id=\"pw-est-display\" style=\"margin:8px 0;padding:12px;background:var(--gnl);border-radius:10px;display:none\">'+\n  '<div style=\"font-size:11px;color:var(--t2);margin-bottom:4px\">\uc608\uc0c1 \uc77c \uc218\uc775</div>'+\n  '<div id=\"pw-est-val\" style=\"font-size:18px;font-weight:900;color:var(--gn)\"></div>'+\n  '</div>'+\n  '<div style=\"padding:12px;background:var(--acl);border-radius:10px;margin-bottom:8px\">'+\n  '<div style=\"font-size:11px;color:var(--ac);font-weight:700;margin-bottom:4px\">\u2705 \ud50c\ub7ab\ud3fc \ucd5c\uc18c\ubcf4\uc7a5 (\uace0\uc815)</div>'+\n  '<div style=\"font-size:13px;font-weight:800\" id=\"pw-guarantee-display\">\uc8fc\uac04: \uc77c 30\ub9cc\uc6d0 / \uc57c\uac04: \uc77c 35\ub9cc\uc6d0</div>'+\n  '<div style=\"font-size:10px;color:var(--t3);margin-top:4px\">\uc2e4\uac74\uc218\u00d7\ub2e8\uac00 < \ucd5c\uc18c\ubcf4\uc7a5\uc561 \uc2dc \ucd5c\uc18c\ubcf4\uc7a5\uc561 \uc9c0\uae09 \uc758\ubb34</div>'+\n  '</div>'+\n  '</div>'+\n\n  // \uc815\uc0b0\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uc815\uc0b0</div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc815\uc0b0 \uc8fc\uae30</label>'+\n  '<div style=\"display:flex;gap:8px\" id=\"pw-settle-group\">'+\n  ['\uc8fc1\ud68c','\uaca9\uc8fc','\uc6d41\ud68c'].map(function(s){\n    return '<button onclick=\"_selType(this,\\''+s+'\\',\\'pw-settle\\')\" style=\"flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer\">'+s+'</button>';\n  }).join('')+\n  '</div></div>'+\n  '<input type=\"hidden\" id=\"pw-settle\">'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc815\uc0b0\uc77c <span style=\"color:var(--rd)\">*</span></label>'+\n  '<input class=\"inp\" id=\"pw-settleDay\" placeholder=\"\uc608: \ub9e4\uc8fc \ubaa9\uc694\uc77c / \ub9e4\uc6d4 25\uc77c\"></div>'+\n  '</div>'+\n\n  // \uad6c\uc5ed\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\uad6c\uc5ed \uc815\ubcf4</div>'+\n  '<button onclick=\"_openDaumPost()\" style=\"width:100%;padding:12px;background:var(--ac);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px\">\ud83d\udd0d \uc8fc\uc18c\uac80\uc0c9\uc73c\ub85c \uad6c\uc5ed \ucd94\uac00 (\uc6b0\ud3b8\ubc88\ud638)</button>'+\n  '<div id=\"zone-tags\" style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px\"></div>'+\n  '<div id=\"addr-result\"></div>'+\n  '<div id=\"selected-zones\" style=\"display:none\"></div>'+\n  '<div class=\"map-wrap\" id=\"post-map-wrap\" style=\"display:none\"><div id=\"post-map\"></div></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uad6c\uc5ed\uba85 <span style=\"color:var(--rd)\">*</span></label>'+\n  '<input class=\"inp\" id=\"pw-area\" placeholder=\"\uc608: \ud574\uc6b4\ub300\uad6c \uc88c\ub3d9 \uc77c\ub300 (\uc790\ub3d9\uc785\ub825\ub428)\"></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uc544\ud30c\ud2b8 \ube44\uc728 (%)</label>'+\n  '<input class=\"inp\" id=\"pw-apt\" type=\"number\" placeholder=\"\uc608: 75\" min=\"0\" max=\"100\"></div>'+\n  '<div class=\"inp-wrap\"><label class=\"inp-lbl\">\uad6c\uc5ed \uc720\ud615</label>'+\n  '<select class=\"inp\" id=\"pw-areaType\"><option value=\"\">\uc120\ud0dd</option>'+\n  ['\uc544\ud30c\ud2b8 \uc911\uc2ec','\ub2e8\ub3c5\uc8fc\ud0dd \uc911\uc2ec','\ud63c\ud569','\uc0c1\uac00 \uc911\uc2ec'].map(function(t){return '<option>'+t+'</option>';}).join('')+\n  '</select></div>'+\n  '</div>'+\n\n  // \ucd94\uac00 \uc870\uac74\n  '<div class=\"form-section\">'+\n  '<div class=\"form-section-title\">\ucd94\uac00 \uc870\uac74</div>'+\n  '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\" id=\"pw-extras\">'+\n  ['\uc2a4\uce90\ub108 \uc9c0\ucc38','\ud578\ub4dc\uce74\ud2b8 \uc9c0\ucc38','\uc9d1\ud654 \ud3ec\ud568','\ud3b8\uc758\uc810 \uc9d1\ud654','\uc2e0\uc785 \uac00\ub2a5','\uacbd\ub825\uc790 \uc6b0\ub300'].map(function(e){\n    return '<button onclick=\"_toggleExtra(this)\" style=\"padding:8px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer\">'+e+'</button>';\n  }).join('')+\n  '</div>'+\n  '<div class=\"inp-wrap\" style=\"margin-top:10px\"><label class=\"inp-lbl\">\uc0c1\uc138 \uc124\uba85</label>'+\n  '<textarea class=\"inp\" id=\"pw-desc\" rows=\"3\" placeholder=\"\uad6c\uc5ed \ud2b9\uc774\uc0ac\ud56d, \uc694\uccad\uc0ac\ud56d \ub4f1\" style=\"resize:none\"></textarea></div>'+\n  '</div>'+\n\n  // \uae34\uae09\n  '<div class=\"form-section\">'+\n  '<div class=\"toggle-row\"><div><div class=\"toggle-lbl\">\ud83d\udd25 \uae34\uae09 \uacf5\uace0</div>'+\n  '<div class=\"toggle-desc\">\uc0c1\ub2e8\uc5d0 \uc6b0\uc120 \ub178\ucd9c\ub3fc\uc694</div></div>'+\n  '<button class=\"toggle\" id=\"toggle-urgent\" onclick=\"_toggleUrgent()\"></button></div>'+\n  '</div>'+\n\n  '<button class=\"btn-main\" id=\"submit-btn\" onclick=\"_submitPost()\">\ud83d\udccb \uacf5\uace0 \ub4f1\ub85d\ud558\uae30</button>';\n\n  // 1\ud1a4 \ud0d1\ucc28 \uae30\ubcf8 \uc120\ud0dd \ucc98\ub9ac\n  setTimeout(function(){\n    var v1=document.querySelector('#pw-vehicle-group button');\n    if(v1) _selType(v1,'1\ud1a4 \ud0d1\ucc28','pw-vehicle');\n  },100);\n}\n\nfunction _selType(btn, val, hiddenId){\n  var grpId = btn.parentElement.id;\n  document.querySelectorAll('#'+grpId+' button').forEach(function(b){\n    b.style.background='transparent';\n    b.style.color='var(--t2)';\n    b.style.borderColor='var(--border)';\n  });\n  btn.style.background='var(--acl)';\n  btn.style.color='var(--ac)';\n  btn.style.borderColor='var(--ac)';\n  var h=document.getElementById(hiddenId);\n  if(h) h.value=val;\n  // \uac00\uad6c\ub2f9 \ub2e8\uac00 \ud544\ub4dc \ud1a0\uae00\n  if(hiddenId==='pw-pricetype'){\n    var wrap=document.getElementById('pw-houseprice-wrap');\n    if(wrap) wrap.style.display=(val==='\uac00\uad6c\ub2f9'||val==='\uac74\ub2f9+\uac00\uad6c\ub2f9')?'block':'none';\n  }\n  // \ucd5c\uc18c\ubcf4\uc7a5 \ud45c\uc2dc \uc5c5\ub370\uc774\ud2b8\n  if(hiddenId==='pw-shift'){\n    var g=document.getElementById('pw-guarantee-display');\n    if(g) g.textContent=val==='\uc57c\uac04'?'\uc57c\uac04: \uc77c 35\ub9cc\uc6d0 \ubcf4\uc7a5 (\ud50c\ub7ab\ud3fc \uace0\uc815)':'\uc8fc\uac04: \uc77c 30\ub9cc\uc6d0 \ubcf4\uc7a5 (\ud50c\ub7ab\ud3fc \uace0\uc815)';\n  }\n}\n\nvar _selectedDays=[];\nfunction _toggleDay(btn, day){\n  var idx=_selectedDays.indexOf(day);\n  if(idx>=0){\n    _selectedDays.splice(idx,1);\n    btn.style.background='transparent';\n    btn.style.color='var(--t2)';\n    btn.style.borderColor='var(--border)';\n  } else {\n    _selectedDays.push(day);\n    btn.style.background='var(--acl)';\n    btn.style.color='var(--ac)';\n    btn.style.borderColor='var(--ac)';\n  }\n}\n\nvar _selectedExtras=[];\nfunction _toggleExtra(btn){\n  var txt=btn.textContent;\n  var idx=_selectedExtras.indexOf(txt);\n  if(idx>=0){\n    _selectedExtras.splice(idx,1);\n    btn.style.background='transparent';\n    btn.style.color='var(--t2)';\n    btn.style.borderColor='var(--border)';\n  } else {\n    _selectedExtras.push(txt);\n    btn.style.background='var(--acl)';\n    btn.style.color='var(--ac)';\n    btn.style.borderColor='var(--ac)';\n  }\n}\n\nvar _isUrgent=false;\nfunction _toggleUrgent(){\n  _isUrgent=!_isUrgent;\n  document.getElementById('toggle-urgent').classList.toggle('on',_isUrgent);\n}\nfunction _calcEst(){\n  var v=parseInt((document.getElementById('pw-volume')||{}).value)||0;\n  var p=parseInt((document.getElementById('pw-price')||{}).value)||0;\n  var dayEst=Math.round(v*p/10000);\n  var disp=document.getElementById('pw-est-display');\n  var val=document.getElementById('pw-est-val');\n  if(disp&&val&&dayEst>0){\n    disp.style.display='block';\n    var shift=(document.getElementById('pw-shift')||{}).value||'\uc8fc\uac04';\n    var minG=shift==='\uc57c\uac04'?35:30;\n    var actual=Math.max(dayEst,minG);\n    val.textContent='\uc57d '+dayEst+'\ub9cc\uc6d0/\uc77c (\ucd5c\uc18c\ubcf4\uc7a5 \uc801\uc6a9\uc2dc '+actual+'\ub9cc\uc6d0)';\n  }\n}\n\nfunction _submitPost(){\n  var get=function(id){return(document.getElementById(id)||{}).value||'';};\n  var courier=get('pw-courier'), area=get('pw-area'), volume=get('pw-volume');\n  var price=get('pw-price'), areaType=get('pw-areaType'), date=get('pw-date');\n  var hours=get('pw-hours'), desc=get('pw-desc'), routeNo=get('pw-routeNo');\n  var postType=get('pw-type'), workShift=get('pw-shift'), vatIncluded=get('pw-vat');\n  var vehicle=get('pw-vehicle'), plate=get('pw-plate'), settle=get('pw-settle');\n  var settleDay=get('pw-settleDay'), endDate=get('pw-enddate');\n  var priceType=get('pw-pricetype'), housePrice=get('pw-houseprice');\n  var aptRatio=get('pw-apt');\n  var btn=document.getElementById('submit-btn');\n\n  if(!courier||!area||!volume||!price||!settleDay){\n    _yToast('\ud544\uc218 \ud56d\ubaa9\uc744 \uc785\ub825\ud558\uc138\uc694 (\ud0dd\ubc30\uc0ac/\uad6c\uc5ed/\ubb3c\ub7c9/\ub2e8\uac00/\uc815\uc0b0\uc77c)');return;\n  }\n\n  var minGuarantee = workShift==='\uc57c\uac04' ? 350000 : 300000;\n\n  btn.textContent='\ub4f1\ub85d \uc911...';btn.disabled=true;\n  _db.collection('yongcha_posts').add({\n    agencyId:_CU.uid, agencyName:_CU.name, agencyRating:_CU.rating||0,\n    region:_CU.region, courier:courier, area:area, routeNo:routeNo,\n    zones:window._zones||[], areaAptRatio:aptRatio?parseInt(aptRatio):null,\n    postType:postType, workShift:workShift, workDays:_selectedDays.join(','),\n    workHours:hours, startDate:date, endDate:endDate,\n    vehicleType:vehicle, plateType:plate,\n    priceType:priceType||'\uac74\ub2f9', unitPrice:parseInt(price),\n    housePricePerUnit:housePrice?parseInt(housePrice):null,\n    vatIncluded:vatIncluded, volume:parseInt(volume),\n    minGuarantee:minGuarantee, areaType:areaType,\n    settleFreq:settle, settleDay:settleDay,\n    extras:_selectedExtras.join(','), desc:desc,\n    urgent:_isUrgent, status:'open',\n    createdAt:firebase.firestore.FieldValue.serverTimestamp()\n  }).then(function(){\n    _yToast('\u2705 \uacf5\uace0\uac00 \ub4f1\ub85d\ub410\uc5b4\uc694!');\n    _isUrgent=false; _selectedDays=[]; _selectedExtras=[]; window._zones=[];\n    _goPage('my_posts');\n  }).catch(function(e){\n    btn.textContent='\ud83d\udccb \uacf5\uace0 \ub4f1\ub85d\ud558\uae30';btn.disabled=false;\n    _yToast('\uc624\ub958: '+e.message);\n  });\n}\n\n// \u2500\u2500 \uc9c0\uc6d0 \ud604\ud669 (\uae30\uc0ac) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _pgMyApplies(el){\n  el.innerHTML=\n  '<div class=\"page-hdr\"><div class=\"page-title\">\ud83d\udccc \uc9c0\uc6d0 \ud604\ud669</div>'+\n  '<div class=\"page-sub\">\ub0b4\uac00 \uc9c0\uc6d0\ud55c \uacf5\uace0 \ubaa9\ub85d\uc774\uc5d0\uc694</div></div>'+\n  '<div id=\"applies-list\"><div style=\"text-align:center;padding:40px\"><div class=\"spinner\"></div></div></div>';\n\n  _db.collection('yongcha_applies').where('driverId','==',_CU.uid)\n    .orderBy('appliedAt','desc').get()\n    .then(function(snap){\n      var list=document.getElementById('applies-list');if(!list)return;\n      if(snap.empty){list.innerHTML='<div class=\"empty\"><div class=\"empty-ico\">\ud83d\udced</div><div class=\"empty-msg\">\uc9c0\uc6d0\ud55c \uacf5\uace0\uac00 \uc5c6\uc5b4\uc694<br>\ub178\uc120 \uacf5\uace0\ub97c \ucc3e\uc544\ubcf4\uc138\uc694</div></div>';return;}\n      list.innerHTML='';\n      var statusMap={pending:'\u23f3 \uac80\ud1a0\uc911',approved:'\u2705 \uc2b9\uc778',rejected:'\u274c \uac70\uc808'};\n      var statusColor={pending:'var(--br)',approved:'var(--gn)',rejected:'var(--t3)'};\n      snap.forEach(function(doc){\n        var a=Object.assign({id:doc.id},doc.data());\n        var card=document.createElement('div');card.className='card';\n        var date=a.appliedAt?new Date(a.appliedAt.seconds*1000).toLocaleDateString():'\u2014';\n        card.innerHTML=\n          '<div style=\"display:flex;justify-content:space-between;margin-bottom:8px\">'+\n          '<div style=\"font-weight:800\">\ud83c\udfe2 '+a.agencyName+'</div>'+\n          '<span style=\"font-size:12px;font-weight:700;color:'+(statusColor[a.status]||'var(--t2)')+'\">'+\n          (statusMap[a.status]||a.status)+'</span></div>'+\n          '<div style=\"font-size:12px;color:var(--t2)\">\uc9c0\uc6d0\uc77c: '+date+'</div>'+\n          (a.status==='approved'?\n          '<div style=\"margin-top:10px;padding:10px;background:var(--gnl);border-radius:10px;font-size:12px;color:var(--gn);font-weight:700\">'+\n          '\ud83c\udf89 \uc2b9\uc778\ub410\uc5b4\uc694! \ub300\ub9ac\uc810\uc5d0 \uc5f0\ub77d\ud574\uc8fc\uc138\uc694</div>':'');\n        list.appendChild(card);\n      });\n    });\n}\n\n// \u2500\u2500 \ub0b4 \uc815\ubcf4 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _pgProfile(el){\n  var type=_CU.type;\n  var typeLabel=type==='admin'?'\uad00\ub9ac\uc790':type==='agency'?'\ub300\ub9ac\uc810':'\uae30\uc0ac';\n  var typeColor=type==='admin'?'var(--pu)':type==='agency'?'var(--br)':'var(--gn)';\n  el.innerHTML=\n  '<div class=\"page-hdr\"><div class=\"page-title\">\ud83d\udc64 \ub0b4 \uc815\ubcf4</div></div>'+\n\n  '<div class=\"card\" style=\"text-align:center;margin-bottom:14px\">'+\n  '<div style=\"font-size:52px;margin-bottom:12px\">'+(type==='admin'?'\ud83d\udee1':type==='agency'?'\ud83c\udfe2':'\ud83d\ude97')+'</div>'+\n  '<div style=\"font-size:20px;font-weight:900;margin-bottom:4px\">'+_CU.name+'</div>'+\n  '<div style=\"font-size:12px;color:'+typeColor+';font-weight:700;margin-bottom:4px\">'+typeLabel+'</div>'+\n  '<div style=\"font-size:12px;color:var(--t2)\">\ud83d\udccd '+(_CU.region||'\u2014')+'</div>'+\n  (_CU.rating>0?'<div style=\"font-size:16px;font-weight:800;color:var(--br);margin-top:8px\">\u2b50 '+_CU.rating.toFixed(1)+' ('+_CU.reviewCount+'\uac1c \ud6c4\uae30)</div>':'')+\n  '</div>'+\n\n  [['\uc774\uba54\uc77c',_CU.email||'\u2014'],['\uc5f0\ub77d\ucc98',_CU.phone||'\u2014'],['\uc9c0\uc5ed',_CU.region||'\u2014']].map(function(r){\n    return '<div class=\"card\" style=\"display:flex;justify-content:space-between;align-items:center\">'+\n      '<span style=\"font-size:13px;color:var(--t2)\">'+r[0]+'</span>'+\n      '<span style=\"font-size:13px;font-weight:600\">'+r[1]+'</span></div>';\n  }).join('')+\n\n  '<button onclick=\"_yLogout()\" style=\"width:100%;padding:14px;background:var(--rdl);color:var(--rd);border:none;border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;font-family:inherit\">\ub85c\uadf8\uc544\uc6c3</button>';\n}\n\n// \u2500\u2500 \ud68c\uc6d0 \uad00\ub9ac (\uad00\ub9ac\uc790) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _pgMembers(el){\n  el.innerHTML=\n  '<div class=\"page-hdr\"><div class=\"page-title\">\ud83d\udc65 \ud68c\uc6d0 \uad00\ub9ac</div>'+\n  '<div class=\"page-sub\">\uc804\uccb4 \ud68c\uc6d0 \ubc0f \uacf5\uace0\ub97c \uad00\ub9ac\ud574\uc694</div></div>'+\n\n  '<div class=\"kpi-grid col2\" style=\"margin-bottom:14px\">'+\n  '<div class=\"kpi-card\"><div class=\"kpi-val\" style=\"color:var(--br)\" id=\"adm-agency\">\u2014</div><div class=\"kpi-lbl\">\ub300\ub9ac\uc810</div></div>'+\n  '<div class=\"kpi-card\"><div class=\"kpi-val\" style=\"color:var(--gn)\" id=\"adm-driver\">\u2014</div><div class=\"kpi-lbl\">\uae30\uc0ac</div></div>'+\n  '</div>'+\n\n  '<div id=\"members-list\"><div style=\"text-align:center;padding:40px\"><div class=\"spinner\"></div></div></div>';\n\n  _db.collection('yongcha_users').get().then(function(snap){\n    var agencies=0,drivers=0;\n    snap.forEach(function(doc){\n      var t=doc.data().type;\n      if(t==='agency')agencies++;\n      else if(t==='driver')drivers++;\n    });\n    var e1=document.getElementById('adm-agency');\n    var e2=document.getElementById('adm-driver');\n    if(e1)e1.textContent=agencies+'\uba85';\n    if(e2)e2.textContent=drivers+'\uba85';\n\n    var list=document.getElementById('members-list');if(!list)return;\n    list.innerHTML='';\n    snap.forEach(function(doc){\n      var u=Object.assign({id:doc.id},doc.data());\n      if(u.type==='admin')return;\n      var card=document.createElement('div');card.className='card';\n      card.innerHTML=\n        '<div style=\"display:flex;align-items:center;justify-content:space-between\">'+\n        '<div>'+\n        '<div style=\"font-weight:800\">'+u.name+'</div>'+\n        '<div style=\"font-size:12px;color:var(--t2);margin-top:3px\">'+u.email+' \u00b7 '+u.region+'</div>'+\n        '</div>'+\n        '<span class=\"status-badge '+(u.type==='agency'?'badge-agency':'badge-driver')+'\" style=\"font-size:11px\">'+\n        (u.type==='agency'?'\ub300\ub9ac\uc810':'\uae30\uc0ac')+'</span>'+\n        '</div>';\n      list.appendChild(card);\n    });\n  });\n}\n\n// \u2500\u2500 \uc720\ud2f8 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nfunction _openModal(){\n  document.getElementById('modal-overlay').classList.add('show');\n  setTimeout(function(){document.getElementById('modal-sheet').classList.add('open');},10);\n}\nfunction _closeModal(){\n  document.getElementById('modal-sheet').classList.remove('open');\n  setTimeout(function(){document.getElementById('modal-overlay').classList.remove('show');},350);\n}\n\nvar _toastTimer;\nfunction _yToast(msg){\n  var t=document.getElementById('toast');\n  t.textContent=msg;t.classList.add('show');\n  clearTimeout(_toastTimer);\n  _toastTimer=setTimeout(function(){t.classList.remove('show');},2800);\n}\n\nfunction _yLogout(){\n  if(!confirm('\ub85c\uadf8\uc544\uc6c3 \ud558\uc2dc\uaca0\uc5b4\uc694?'))return;\n  _auth.signOut().then(function(){_CU=null;_showLogin();});\n}\n// \u2500\u2500 \uce74\uce74\uc624\ub9f5 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nvar _kakaoKey=null, _map=null, _markers=[], _selectedZones=[];\n\nfunction _loadKakaoMap(callback){\n  // \uc774\ubbf8 \ub85c\ub4dc\ub428\n  if(window.kakao&&window.kakao.maps&&window.kakao.maps.Map){\n    if(callback)callback();return;\n  }\n  // \ub85c\ub529 \uc911 \u2014 \ub300\uae30\n  if(window._kakaoReady===false||document.querySelector('script[src*=\"dapi.kakao.com\"]')){\n    var t=0;\n    var check=setInterval(function(){\n      t++;\n      if(window.kakao&&window.kakao.maps&&window.kakao.maps.Map){\n        clearInterval(check);if(callback)callback();\n      }\n      if(t>20){clearInterval(check);console.warn('\uce74\uce74\uc624\ub9f5 \ub85c\ub4dc \ud0c0\uc784\uc544\uc6c3');}\n    },300);\n    return;\n  }\n  // \uc9c1\uc811 \ub85c\ub4dc\n  var key=window._kakaoKey||'3d5a58a3e1099aa2b6b221c3db2b0d13';\n  _kakaoKey=key;\n  _initKakaoScript(callback);\n}\n\nfunction _initKakaoScript(callback){\n  if(!_kakaoKey)return;\n  var s=document.createElement('script');\n  s.src='//dapi.kakao.com/v2/maps/sdk.js?appkey='+_kakaoKey+'&libraries=services&autoload=false';\n  s.onload=function(){\n    kakao.maps.load(function(){\n      if(callback)callback();\n    });\n  };\n  document.head.appendChild(s);\n}\n\n// \uacf5\uace0 \ub4f1\ub85d \uc9c0\ub3c4 \ucd08\uae30\ud654\nfunction _initPostMap(){\n  var wrap=document.getElementById('post-map-wrap');\n  if(wrap&&wrap.style.display==='none') return; // \uad6c\uc5ed \ucd94\uac00 \uc804\uc5d4 \ucd08\uae30\ud654 \uc548 \ud568\n  var container=document.getElementById('post-map');\n  if(!container){ return; }\n  _loadKakaoMap(function(){\n    container=document.getElementById('post-map');\n    if(!container)return;\n    container.style.width='100%';\n    container.style.height='240px';\n    container.style.display='block';\n    try {\n      var opts={center:new kakao.maps.LatLng(35.1796,129.0756),level:5};\n      _map=new kakao.maps.Map(container,opts);\n      _map.setDraggable(true);\n      _map.setZoomable(true);\n      _map.relayout();\n    } catch(e){ console.error('\uce74\uce74\uc624\ub9f5 \uc624\ub958:',e); }\n  });\n}\n\n// Daum \uc6b0\ud3b8\ubc88\ud638 \ud31d\uc5c5 - \ub2e4\uc911 \uad6c\uc5ed \ucd94\uac00\nwindow._zones = window._zones || [];\nfunction _openDaumPost(){\n  new daum.Postcode({\n    oncomplete: function(data){\n      var addr = data.roadAddress || data.jibunAddress;\n      var zipcode = data.zonecode;\n      var sigungu = (data.sido||'') + ' ' + (data.sigungu||'') + ' ' + (data.bname||data.bname1||'');\n      _loadKakaoMap(function(){\n        var gc = new kakao.maps.services.Geocoder();\n        gc.addressSearch(addr, function(res, status){\n          if(status === kakao.maps.services.Status.OK){\n            var lat = parseFloat(res[0].y), lng = parseFloat(res[0].x);\n            // \uc911\ubcf5 \uccb4\ud06c\n            var dup = window._zones.some(function(z){return z.zipcode===zipcode;});\n            if(dup){_yToast('\uc774\ubbf8 \ucd94\uac00\ub41c \uc6b0\ud3b8\ubc88\ud638\uc608\uc694');return;}\n            window._zones.push({zipcode:zipcode, name:sigungu.trim(), lat:lat, lng:lng});\n            _renderZoneTags();\n            _updateMapZones();\n            // \uad6c\uc5ed\uba85 \uc790\ub3d9\uc785\ub825\n            var areaInp = document.getElementById('pw-area');\n            if(areaInp) areaInp.value = window._zones.map(function(z){return z.zipcode+' '+z.name;}).join(', ');\n          } else {\n            _yToast('\uc8fc\uc18c \uc88c\ud45c\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc5b4\uc694');\n          }\n        });\n      });\n    }\n  }).open();\n}\nfunction _renderZoneTags(){\n  var el = document.getElementById('zone-tags');\n  if(!el) return;\n  if(!window._zones||!window._zones.length){el.innerHTML='';return;}\n  el.innerHTML = window._zones.map(function(z,i){\n    return '<span style=\"display:inline-flex;align-items:center;gap:4px;background:var(--ac);color:#000;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700\">'\n      +'\ud83d\udcee '+z.zipcode\n      +' <span style=\"font-weight:500\">'+z.name+'</span>'\n      +'<button onclick=\"event.stopPropagation();_removeZone('+i+')\" style=\"background:none;border:none;cursor:pointer;font-size:16px;padding:0 0 0 4px;color:#000;line-height:1\">\u00d7</button>'\n      +'</span>';\n  }).join('');\n}\nfunction _removeZone(i){\n  window._zones.splice(i,1);\n  _renderZoneTags();\n  _updateMapZones();\n}\nfunction _updateMapZones(){\n  // \uad6c\uc5ed \uc788\uc73c\uba74 \uc9c0\ub3c4 \ud45c\uc2dc\n  var wrap = document.getElementById('post-map-wrap');\n  if(wrap){\n    wrap.style.display = window._zones.length ? 'block' : 'none';\n    if(window._zones.length && !_map){\n      _initPostMap();\n      setTimeout(_doUpdateMapZones, 800);\n      return;\n    }\n  }\n  _doUpdateMapZones();\n}\nfunction _doUpdateMapZones(){\n  if(!_map) return;\n  (_markers||[]).forEach(function(m){m.setMap(null);});\n  _markers = [];\n  (window._circles||[]).forEach(function(c){c.setMap(null);});\n  window._circles = [];\n  window._zones.forEach(function(z){\n    var pos = new kakao.maps.LatLng(z.lat, z.lng);\n    var m = new kakao.maps.Marker({position:pos, map:_map});\n    _markers.push(m);\n    var c = new kakao.maps.Circle({center:pos,radius:600,strokeWeight:2,strokeColor:'#f59e0b',strokeOpacity:.8,fillColor:'#f59e0b',fillOpacity:.15,map:_map});\n    window._circles.push(c);\n  });\n  if(window._zones.length){\n    var last = window._zones[window._zones.length-1];\n    _map.setCenter(new kakao.maps.LatLng(last.lat, last.lng));\n    _map.setLevel(5);\n    _map.relayout();\n  }\n}\nfunction _showAddrResult(results){\n  var el=document.getElementById('addr-result');\n  if(!el)return;\n  el.style.display='block';\n  el.innerHTML=results.map(function(r,i){\n    return '<div class=\"addr-item\" onclick=\"_selectAddr('+i+')\">'+\n      '<div style=\"font-weight:700;font-size:13px\">'+r.place_name+'</div>'+\n      (r.road_address_name?'<div style=\"font-size:11px;color:var(--t2);margin-top:2px\">'+r.road_address_name+'</div>':'')+\n      '</div>';\n  }).join('');\n  window._addrResults=results;\n}\n\nfunction _selectAddr(idx){\n  var r=window._addrResults[idx];\n  if(!r)return;\n  var el=document.getElementById('addr-result');\n  if(el)el.style.display='none';\n\n  var lat=parseFloat(r.y), lng=parseFloat(r.x);\n  var name=r.place_name;\n\n  // \uc9c0\ub3c4 \uc774\ub3d9\n  if(_map){\n    var pos=new kakao.maps.LatLng(lat,lng);\n    _map.setCenter(pos);\n    _map.setLevel(4);\n    // \ub9c8\ucee4 \ucd94\uac00\n    var marker=new kakao.maps.Marker({position:pos,map:_map});\n    _markers.push(marker);\n    // \uc6d0\ud615 \uc624\ubc84\ub808\uc774 (\ubc30\uc1a1 \uad6c\uc5ed \ud45c\uc2dc)\n    var circle=new kakao.maps.Circle({\n      center:pos, radius:500,\n      strokeWeight:2,strokeColor:'#f59e0b',strokeOpacity:.8,\n      fillColor:'#f59e0b',fillOpacity:.15,\n      map:_map\n    });\n  }\n\n  // \uc120\ud0dd \uad6c\uc5ed \ud0dc\uadf8\n  if(_selectedZones.indexOf(name)<0){\n    _selectedZones.push(name);\n    _renderZoneTags();\n    // \uad6c\uc5ed\uba85 \uc790\ub3d9\uc785\ub825\n    var areaInp=document.getElementById('pw-area');\n    if(areaInp) areaInp.value=_selectedZones.join(', ');\n  }\n\n  window._lastLat=lat;\n  window._lastLng=lng;\n}\n\nfunction _renderZoneTags(){\n  var el=document.getElementById('selected-zones');\n  if(!el)return;\n  el.innerHTML=_selectedZones.map(function(z,i){\n    return '<span class=\"zone-tag\" onclick=\"_removeZone('+i+')\">'+z+' \u2715</span>';\n  }).join('');\n}\n\nfunction _removeZone(idx){\n  _selectedZones.splice(idx,1);\n  _renderZoneTags();\n  var areaInp=document.getElementById('pw-area');\n  if(areaInp) areaInp.value=_selectedZones.join(', ');\n}\n\n// \uacf5\uace0 \uc0c1\uc138 \uc9c0\ub3c4\nfunction _showDetailMap(lat,lng,name){\n  _loadKakaoMap(function(){\n    var container=document.getElementById('detail-map');\n    if(!container)return;\n    var pos=new kakao.maps.LatLng(lat,lng);\n    var map=new kakao.maps.Map(container,{center:pos,level:5});\n    new kakao.maps.Marker({position:pos,map:map});\n    new kakao.maps.Circle({\n      center:pos,radius:600,\n      strokeWeight:2,strokeColor:'#f59e0b',strokeOpacity:.8,\n      fillColor:'#f59e0b',fillOpacity:.15,\n      map:map\n    });\n    // \uc778\ud3ec\uc708\ub3c4\uc6b0\n    var iw=new kakao.maps.InfoWindow({\n      content:'<div style=\"padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap\">\ud83d\udccd '+name+'</div>'\n    });\n    iw.open(map,new kakao.maps.Marker({position:pos,map:map}));\n  });\n}\n\n\nfunction _showZoneOnMap(i){\n  var zones = window._detailZones||[];\n  var z = zones[i];\n  if(!z) return;\n  // \ud0ed \uc2a4\ud0c0\uc77c \uc5c5\ub370\uc774\ud2b8\n  zones.forEach(function(_,j){\n    var t = document.getElementById('ztab-'+j);\n    if(!t) return;\n    t.style.background = j===i ? 'var(--ac)' : 'transparent';\n    t.style.color = j===i ? '#000' : 'var(--ac)';\n  });\n  _loadKakaoMap(function(){\n    var pos = new kakao.maps.LatLng(z.lat, z.lng);\n    if(window._detailMap){\n      window._detailMap.setCenter(pos);\n      window._detailMap.setLevel(5);\n      if(window._detailMarker) window._detailMarker.setPosition(pos);\n      if(window._detailCircle) window._detailCircle.setCenter(pos);\n    }\n  });\n}\n





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
            body: JSON.stringify({ to: body.token, notification: { title: body.title || 'AI', body: body.body || '' }, data: body.data || {} })
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

        const postSummary = (posts || []).slice(0, 6).map(p =>
          `[${p.id}] ${p.courier} ${p.region} ${p.area} / 단가:${p.unitPrice}원 / ${p.volume}건 / ${p.workShift || ''} / ${p.vehicleType || ''}`
        ).join('\n');

        const prompt = `당신은 대한민국 택배 기사 수익 최적화 AI입니다. 간결하고 실용적으로 답변하세요.

기사 정보:
- 이름: ${driver.name || '기사'}
- 담당 지역: ${driver.region || '미설정'}
- 차량: ${driver.carType || '미설정'}

현재 공고 목록:
${postSummary || '공고 없음'}

다음을 JSON으로 답변하세요 (다른 텍스트 없이 순수 JSON만):
{
  "summary": "기사에게 도움이 되는 1-2문장 수익 인사이트 (구체적 숫자 포함)",
  "bestPickId": "가장 추천하는 공고 ID (없으면 null)",
  "reason": "추천 이유 1문장",
  "monthlyEst": "예상 월 수익 (예: 420만원)",
  "applyMsg": "지원 시 쓸 한줄 메시지"
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
            max_tokens: 400,
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

    return new Response(YONGCHA_HTML, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};
