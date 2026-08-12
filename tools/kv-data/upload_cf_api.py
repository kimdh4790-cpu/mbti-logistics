#!/usr/bin/env python3
# 기초구역 KV 직접 업로드 (Cloudflare KV Bulk API)
# GitHub Actions에서 CF_GLOBAL_KEY 시크릿으로 자동 실행됨
# 로컬 실행: set CF_API_KEY=<글로벌키> && python tools\kv-data\upload_cf_api.py
import json, os, glob, sys, time
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

ACCOUNT_ID = '02709cbec18d848913b4246015b9148f'
NS_ID      = '7f0e90efaea64f3ab08ff00f8970b28b'
EMAIL      = os.environ.get('CF_EMAIL', 'kimdh4790@gmail.com')
API_KEY    = os.environ.get('CF_API_KEY', '')
BATCH_SIZE = 5000
BASE_URL   = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{NS_ID}/bulk'

if not API_KEY:
    print('CF_API_KEY 환경변수 없음')
    print('Windows: set CF_API_KEY=<Cloudflare 글로벌 API 키>')
    sys.exit(1)

script_dir = os.path.dirname(os.path.abspath(__file__))
chunks = sorted(glob.glob(os.path.join(script_dir, 'chunk_*.json')))
if not chunks:
    print('chunk_*.json 파일 없음')
    sys.exit(1)

headers = {
    'X-Auth-Email': EMAIL,
    'X-Auth-Key': API_KEY,
    'Content-Type': 'application/json',
}

print(f'청크 {len(chunks)}개 → Cloudflare KV Bulk API 업로드 시작')
total_ok = 0

for ci, chunk_path in enumerate(chunks):
    items = json.load(open(chunk_path, encoding='utf-8'))
    print(f'\n청크 {ci+1}/{len(chunks)}: {len(items)}개')

    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start:start+BATCH_SIZE]
        end = min(start+BATCH_SIZE, len(items))

        for attempt in range(3):
            try:
                r = requests.put(BASE_URL, headers=headers, json=batch, timeout=120)
                if r.status_code == 200 and r.json().get('success'):
                    total_ok += len(batch)
                    print(f'  {end}/{len(items)} 완료')
                    break
                print(f'  HTTP {r.status_code}: {r.text[:200]}')
            except Exception as e:
                print(f'  오류: {e}')
            time.sleep(2 ** attempt)

print(f'\n완료: {total_ok}개 업로드됨')
