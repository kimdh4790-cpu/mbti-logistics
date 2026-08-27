const path = require('path');
const fs = require('fs');
const os = require('os');

function _findLinuxChromium() {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  try {
    const msDir = path.join(os.homedir(), '.cache', 'ms-playwright');
    if (fs.existsSync(msDir)) {
      for (const d of fs.readdirSync(msDir)) {
        const p = path.join(msDir, d, 'chrome-linux', 'chrome');
        if (fs.existsSync(p)) candidates.push(p);
      }
    }
  } catch (_) {}
  return candidates.find(p => fs.existsSync(p));
}

function chromiumExecOpts() {
  if (process.env.CHROMIUM_PATH) return { executablePath: process.env.CHROMIUM_PATH };
  if (process.platform === 'win32') return { channel: 'chrome' };
  const found = _findLinuxChromium();
  if (found) return { executablePath: found };
  return {};
}

function getChromiumLaunchOpts(headless) {
  const exec = chromiumExecOpts();
  if (!exec.executablePath && !exec.channel) {
    console.warn('[launch-options] Chromium 자동 탐색 실패. CHROMIUM_PATH 환경변수를 설정하세요.');
    console.warn('  Oracle VM: CHROMIUM_PATH=$(which chromium) node ...');
  }
  return { ...exec, headless, args: ['--no-sandbox', '--disable-setuid-sandbox'] };
}

function chromiumExec() {
  return chromiumExecOpts();
}

module.exports = { getChromiumLaunchOpts, chromiumExec };
