const WORKER_URL = 'https://mailmind-api.kimdh4790.workers.dev';

const PLAN_LIMITS = {
  pro:   { monthly: 300 },
  basic: { monthly: 200 },
  free:  { monthly: 35  }
};

const LANGUAGES = [
  { value: 'Korean',    label: '🇰🇷 한국어' },
  { value: 'English',   label: '🇺🇸 English' },
  { value: 'Japanese',  label: '🇯🇵 日本語' },
  { value: 'Chinese',   label: '🇨🇳 中文' },
  { value: 'Spanish',   label: '🇪🇸 Español' },
  { value: 'French',    label: '🇫🇷 Français' },
  { value: 'German',    label: '🇩🇪 Deutsch' },
  { value: 'Portuguese',label: '🇧🇷 Português' },
  { value: 'Arabic',    label: '🇸🇦 العربية' },
  { value: 'Vietnamese',label: '🇻🇳 Tiếng Việt' },
  { value: 'Thai',      label: '🇹🇭 ภาษาไทย' },
  { value: 'Indonesian',label: '🇮🇩 Bahasa Indonesia' },
  { value: 'Italian',   label: '🇮🇹 Italiano' },
  { value: 'Turkish',   label: '🇹🇷 Türkçe' },
  { value: 'Dutch',    label: '🇳🇱 Nederlands' },
  { value: 'Polish',   label: '🇵🇱 Polski' },
  { value: 'Hindi',    label: '🇮🇳 हिन्दी' },
];

async function getStoredUser() {
  return new Promise(resolve => {
    chrome.storage.sync.get([
      'userEmail', 'userName', 'userPlan',
      'monthlyCount', 'monthlyMonth', 'monthlyLimit'
    ], resolve);
  });
}

async function loadSettings() {
  const s = await new Promise(r => chrome.storage.sync.get(['businessCard'], r));
  const ta = document.getElementById('biz-card-input');
  if (ta) ta.value = s.businessCard || '';
}

async function saveSettings() {
  const bc = document.getElementById('biz-card-input')?.value.trim() || '';
  await chrome.storage.sync.set({ businessCard: bc });
  const ok = document.getElementById('save-ok');
  if (ok) { ok.style.display = 'block'; setTimeout(() => { ok.style.display = 'none'; }, 1500); }
}

async function showLoggedIn(data) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('user-section').style.display = 'block';
  loadSettings();

  const name = data.userName || data.userEmail || '-';
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = data.userEmail || '';
  document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();

  const plan = data.userPlan || 'free';
  const badge = document.getElementById('plan-badge');
  const planLabels = { free: 'Starter', basic: 'Basic', pro: 'Pro' };
  badge.textContent = planLabels[plan] || plan;
  badge.className = `plan-badge ${plan}`;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyCount = data.monthlyMonth === thisMonth ? (data.monthlyCount || 0) : 0;
  const monthlyLimit = data.monthlyLimit || PLAN_LIMITS[plan]?.monthly || 35;
  const monthlyLeft = Math.max(0, monthlyLimit - monthlyCount);
  const monthlyPct = (monthlyCount / monthlyLimit) * 100;

  document.getElementById('monthly-text').textContent = `${monthlyLeft} / ${monthlyLimit}`;
  const monthlyBar = document.getElementById('monthly-bar');
  monthlyBar.style.width = monthlyPct + '%';
  monthlyBar.className = `usage-fill ${monthlyPct >= 90 ? 'danger' : monthlyPct >= 70 ? 'warning' : ''}`;

  const upgradeSection = document.getElementById('upgrade-section');
  if (plan === 'free') {
    upgradeSection.innerHTML = `<a href="https://mailmind.yongcha.app#pricing" target="_blank" class="btn-upgrade">⚡ Upgrade to Basic ($15/mo)</a>`;
  } else if (plan === 'basic') {
    upgradeSection.innerHTML = `<a href="https://mailmind.yongcha.app#pricing" target="_blank" class="btn-upgrade pro">🚀 Upgrade to Pro ($25/mo)</a>`;
  } else {
    upgradeSection.innerHTML = `<div style="text-align:center;font-size:12px;color:#137333;padding:8px 0;">✅ You're on Pro</div>`;
  }
}

async function showLoggedOut() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('user-section').style.display = 'none';
}

async function getTokenViaWebAuthFlow() {
  const CLIENT_ID = '40761160761-dlbqacnspe2c89uf0uu06nf3omt0qof6.apps.googleusercontent.com';
  const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'openid email profile',
    prompt: 'select_account'
  }).toString();

  const redirectUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!url) reject(new Error('No redirect URL'));
      else resolve(url);
    });
  });

  const hash = new URL(redirectUrl).hash.slice(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (!token) throw new Error(`No access token. URL: ${redirectUrl.substring(0, 200)}`);
  return token;
}

async function loginWithGoogle() {
  const btn = document.getElementById('btn-google-login');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:.6">Signing in…</span>'; }
  try {
    const token = await getTokenViaWebAuthFlow();

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userInfo = await res.json();

    const loginRes = await fetch(`${WORKER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email: userInfo.email, name: userInfo.name })
    });
    const loginData = await loginRes.json();

    if (loginData.success || loginData.plan) {
      const plan = loginData.plan || 'free';
      const monthlyLimit = PLAN_LIMITS[plan]?.monthly || 35;
      const thisMonth = new Date().toISOString().slice(0, 7);

      const VALID_LANGS = ['auto','Korean','English','Japanese','Chinese','Spanish','German','Portuguese','French','Italian','Vietnamese','Dutch','Polish','Turkish','Hindi'];
      const existing = await new Promise(r => chrome.storage.sync.get('myLanguage', r));
      const kvLang = VALID_LANGS.includes(loginData.myLanguage) ? loginData.myLanguage : null;
      const localLang = VALID_LANGS.includes(existing.myLanguage) ? existing.myLanguage : null;
      const savedLang = kvLang || localLang || 'Korean';
      const loginSyncObj = {
        userEmail: userInfo.email,
        userName: userInfo.name,
        userPlan: plan,
        monthlyLimit,
        monthlyMonth: thisMonth,
        monthlyCount: loginData.monthlyUsed || 0,
        myLanguage: savedLang
      };
      if (loginData.replyLanguage && VALID_LANGS.includes(loginData.replyLanguage)) {
        loginSyncObj.replyLanguage = loginData.replyLanguage;
      }
      await chrome.storage.sync.set(loginSyncObj);
      await showLoggedIn({ ...loginSyncObj });
    }
  } catch (e) {
    console.error('Login error:', e);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width:18px;height:18px"> Sign in with Google';
      const errEl = document.createElement('p');
      errEl.style.cssText = 'color:#c5221f;font-size:12px;margin-top:8px;text-align:center;white-space:pre-line;';
      errEl.textContent = e.message === 'timeout'
        ? 'Sign-in window may have appeared\nbehind this window. Please try again.'
        : `Sign-in failed: ${e.message}`;
      btn.insertAdjacentElement('afterend', errEl);
      setTimeout(() => errEl.remove(), 8000);
    }
  }
}

async function logout() {
  await chrome.storage.sync.clear();
  await new Promise(resolve => {
    chrome.identity.clearAllCachedAuthTokens(() => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
  await showLoggedOut();
}

async function refreshStatus() {
  const stored = await getStoredUser();
  if (!stored.userEmail) return;

  try {
    const res = await fetch(`${WORKER_URL}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: stored.userEmail })
    });
    const data = await res.json();
    if (data.plan) {
      const plan = data.plan;
      const monthlyLimit = PLAN_LIMITS[plan]?.monthly || 35;
      const thisMonth = new Date().toISOString().slice(0, 7);

      const syncObj = {
        userPlan: plan,
        monthlyLimit,
        monthlyCount: data.monthlyUsed || 0,
        monthlyMonth: thisMonth
      };
      const VALID_LANGS = ['auto','Korean','English','Japanese','Chinese','Spanish','German','Portuguese','French','Italian','Vietnamese','Dutch','Polish','Turkish','Hindi'];
      if (data.myLanguage && VALID_LANGS.includes(data.myLanguage)) {
        syncObj.myLanguage = data.myLanguage;
      }
      if (data.replyLanguage && VALID_LANGS.includes(data.replyLanguage)) {
        syncObj.replyLanguage = data.replyLanguage;
      }
      await chrome.storage.sync.set(syncObj);
      if (typeof chrome !== 'undefined') {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {type: 'USAGE_UPDATED'}).catch(() => {});
        });
      }

      const updated = await getStoredUser();
      await showLoggedIn(updated);
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await getStoredUser();
  if (stored.userEmail) {
    await showLoggedIn(stored);
    refreshStatus();
  } else {
    await showLoggedOut();
  }
  document.getElementById('btn-google-login')?.addEventListener('click', loginWithGoogle);
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
});
