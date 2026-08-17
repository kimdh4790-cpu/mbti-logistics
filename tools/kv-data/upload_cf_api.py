#!/usr/bin/env python3
# 기초구역 KV 직접 업로드 (Cloudflare KV Bulk API)
#
# 로컬 (API Token):
#   $env:CF_API_KEY = "cfk_xxxx..."
#   python tools\kv-data\upload_cf_api.py
#
# GitHub Actions: CF_GLOBAL_KEY 시크릿 자동 사용
import json, os, glob, sys, time
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

ACCOUNT_ID = '02709cbec18d848913b4246015b9148f'
NS_ID      = '7f0e90efaea64f3ab08ff00f8970b28b'
BASE_URL   = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{NS_ID}/bulk'
BATCH_SIZE = 1000

# 인증 방식 자동 선택
if os.environ.get('CF_API_KEY'):
    # API Token (Bearer)
    key = os.environ['CF_API_KEY']
    headers = {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    print('인증: API Token (Bearer)')
elif os.environ.get('CF_GLOBAL_KEY'):
    # Global API Key (X-Auth)
    key = os.environ['CF_GLOBAL_KEY']
    email = os.environ.get('CF_EMAIL', 'kimdh4790@gmail.com')
    headers = {'X-Auth-Email': email, 'X-Auth-Key': key, 'Content-Type': 'application/json'}
    print('인증: Global API Key')
else:
    print('환경변수를 설정하세요:')
    print('  $env:CF_API_KEY = "cfk_xxxx..."')
    sys.exit(1)

script_dir = os.path.dirname(os.path.abspath(__file__))
chunks = sorted(glob.glob(os.path.join(script_dir, 'chunk_*.json')))
if not chunks:
    print('chunk_*.json 파일 없음')
    sys.exit(1)

print(f'청크 {len(chunks)}개 → Cloudflare KV Bulk API')
total_ok = 0

for ci, chunk_path in enumerate(chunks):
    items = json.load(open(chunk_path, encoding='utf-8'))
    print(f'\n청크 {ci+1}/{len(chunks)}: {len(items)}개')

    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start:start+BATCH_SIZE]
        end = min(start+BATCH_SIZE, len(items))

        for attempt in range(5):
            try:
                r = requests.put(BASE_URL, headers=headers, json=batch, timeout=120)
                data = r.json()
                if r.status_code == 200 and data.get('success'):
                    total_ok += len(batch)
                    print(f'  {end}/{len(items)} 완료')
                    time.sleep(0.5)
                    break
                if r.status_code == 429:
                    wait = int(r.headers.get('Retry-After', 60))
                    print(f'  Rate limit — {wait}초 대기 후 재시도...')
                    time.sleep(wait)
                    continue
                print(f'  HTTP {r.status_code}: {data.get("errors", r.text[:200])}')
            except Exception as e:
                print(f'  오류: {e}')
            time.sleep(2 ** attempt)

print(f'\n완료: {total_ok}/{sum(len(json.load(open(c, encoding="utf-8"))) for c in chunks)}개 업로드됨')
