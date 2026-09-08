#!/usr/bin/env python3
"""
경쟁사 가격·공지 변동 모니터 — Scrapling 기반
설치: pip install scrapling
실행: python3 competitor_scraper.py
cron: 0 9 * * * cd ~/mbti-logistics && python3 scripts/monitor/competitor_scraper.py

환경변수 (Oracle Cloud .bashrc 또는 GitHub Secrets):
  SOLAPI_API_KEY     Solapi API 키
  SOLAPI_API_SECRET  Solapi API 시크릿
  ALERT_PHONE        수신 번호 (01012345678)
  SOLAPI_FROM        발신 번호 (등록된 번호)
"""

import json, os, sys, hashlib, datetime, hmac, uuid
import urllib.request
from pathlib import Path

try:
    from scrapling import Fetcher
except ImportError:
    sys.exit('[ERROR] pip install scrapling 먼저 실행하세요')

BASE     = Path(__file__).parent
CONFIG   = BASE / 'competitor_config.json'
STATE    = BASE / 'competitor_state.json'

SOLAPI_KEY    = os.getenv('SOLAPI_API_KEY', '')
SOLAPI_SECRET = os.getenv('SOLAPI_API_SECRET', '')
ALERT_PHONE   = os.getenv('ALERT_PHONE', '')
SOLAPI_FROM   = os.getenv('SOLAPI_FROM', '')


# ── 상태 관리 ──────────────────────────────────────────────────────────────────

def load_state() -> dict:
    return json.loads(STATE.read_text()) if STATE.exists() else {}

def save_state(state: dict):
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2))

def md5(text: str) -> str:
    return hashlib.md5(text.strip().encode('utf-8', errors='ignore')).hexdigest()


# ── Solapi SMS ─────────────────────────────────────────────────────────────────

def send_sms(text: str):
    if not all([SOLAPI_KEY, SOLAPI_SECRET, ALERT_PHONE, SOLAPI_FROM]):
        print(f'[SMS 미설정] 메시지:\n{text}')
        return

    date = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    salt = str(uuid.uuid4()).replace('-', '')
    sig  = hmac.new(
        SOLAPI_SECRET.encode(),
        f'date={date}&salt={salt}'.encode(),
        'sha256'
    ).hexdigest()
    auth = f'HMAC-SHA256 apiKey={SOLAPI_KEY}, date={date}, salt={salt}, signature={sig}'

    payload = json.dumps({
        'message': {'to': ALERT_PHONE, 'from': SOLAPI_FROM, 'text': text}
    }).encode()

    req = urllib.request.Request(
        'https://api.solapi.com/messages/v4/send',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': auth}
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            print(f'[SMS] 발송 완료 → {ALERT_PHONE}')
    except Exception as e:
        print(f'[SMS] 발송 실패: {e}')


# ── 메인 ──────────────────────────────────────────────────────────────────────

def main():
    if not CONFIG.exists():
        print(f'[ERROR] {CONFIG} 없음 — competitor_config.json 작성 후 실행')
        sys.exit(1)

    cfg     = json.loads(CONFIG.read_text())
    sites   = cfg.get('sites', [])
    state   = load_state()
    fetcher = Fetcher(auto_match=True)   # 페이지 구조 변경에도 자동 적응
    now     = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    changes = []

    for site in sites:
        name = site['name']
        url  = site['url']
        sel  = site.get('selector', 'body')

        try:
            page = fetcher.get(url, timeout=25, stealthy_headers=True)
            el   = page.find(sel) or page.find('body')
            text = el.text if el else ''

            h    = md5(text[:3000])
            prev = state.get(url, {})

            if prev.get('hash') and prev['hash'] != h:
                preview = text[:200].replace('\n', ' ')
                changes.append({'name': name, 'url': url, 'preview': preview})
                print(f'[변경] {name}')
            else:
                print(f'[유지] {name}')

            state[url] = {
                'name':    name,
                'hash':    h,
                'checked': now,
                'category': site.get('category', '')
            }

        except Exception as e:
            print(f'[오류] {name}: {e}')

    save_state(state)

    if changes:
        lines = [f'[MBTICO 경쟁사 모니터] {now}', f'변동 {len(changes)}건:']
        for c in changes[:3]:
            lines.append(f'▶ {c["name"]}: {c["preview"][:60]}...')
        send_sms('\n'.join(lines)[:90])
    else:
        print(f'[{now}] 변동 없음')


if __name__ == '__main__':
    main()
