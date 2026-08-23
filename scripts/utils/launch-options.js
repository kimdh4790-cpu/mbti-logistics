// Windows: channel:'chrome' (설치된 Chrome) / Linux: executablePath 직접 지정
function chromiumExecOpts() {
  if (process.env.CHROMIUM_PATH) return { executablePath: process.env.CHROMIUM_PATH };
  if (process.platform === 'win32') return { channel: 'chrome' };
  return { executablePath: '/opt/pw-browsers/chromium' };
}

function getChromiumLaunchOpts(headless) {
  return { ...chromiumExecOpts(), headless, args: ['--no-sandbox', '--disable-setuid-sandbox'] };
}

// launchPersistentContext용 — 추가 옵션(viewport, recordVideo)은 호출부에서 합성
function chromiumExec() {
  return chromiumExecOpts();
}

module.exports = { getChromiumLaunchOpts, chromiumExec };
