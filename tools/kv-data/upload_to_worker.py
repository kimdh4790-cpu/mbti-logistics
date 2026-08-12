#!/usr/bin/env python3
# 전국 기초구역 경계 데이터 -> yongcha.app Worker KV 업로드
# 사용법: python tools/kv-data/upload_to_worker.py
# CF API 키 불필요 - Worker가 직접 KV에 씀.
import json, os, glob, time, sys
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

WORKER_URL = 'https://yongcha.app/api/yongcha/kv-batch-write'
SECRET = 'basidco2024write'
BATCH = 100

script_dir = os.path.dirname(os.path.abspath(__file__))
chunks = sorted(glob.glob(os.path.join(script_dir, 'chunk_*.json')))
if not chunks:
    print('chunk_*.json 파일 없음')
    sys.exit(1)

print(f'청크 {len(chunks)}개 업로드 시작 → {WORKER_URL}')
total_ok = 0

for ci, chunk_path in enumerate(chunks):
    items = json.load(open(chunk_path, encoding='utf-8'))
    print(f'\n청크 {ci+1}/{len(chunks)}: {len(items)}개')
    for start in range(0, len(items), BATCH):
        batch = items[start:start+BATCH]
        for attempt in range(3):
            try:
                r = requests.post(
                    WORKER_URL,
                    headers={'x-batch-secret': SECRET, 'Content-Type': 'application/json'},
                    json=batch, timeout=60
                )
                if r.status_code == 200 and r.json().get('ok'):
                    total_ok += len(batch)
                    end = min(start+BATCH, len(items))
                    print(f'  {end}/{len(items)} 완료', end='\r')
                    break
                print(f'  HTTP {r.status_code}')
            except Exception as e:
                print(f'  오류: {e}')
            time.sleep(2**attempt)
        time.sleep(0.1)
    print()

print(f'\n완료: {total_ok}개 업로드됨')
