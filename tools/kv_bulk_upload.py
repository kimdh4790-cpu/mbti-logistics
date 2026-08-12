#!/usr/bin/env python3
"""
기초구역 경계 데이터 Cloudflare KV 일괄 업로드

로컬 PC에서 실행 (wrangler 인증 불필요 — CF API 직접 호출):
  Windows:
    set CLOUDFLARE_API_TOKEN=여기에CF글로벌키
    python tools/kv_bulk_upload.py

  Mac/Linux:
    CLOUDFLARE_API_TOKEN=여기에CF글로벌키 python3 tools/kv_bulk_upload.py

CF 글로벌키: Cloudflare 대시보드 → My Profile → API Tokens → Global API Key
또는 wrangler.toml account_id와 함께 사용하는 API Token

준비물:
  - python tools/basidco_to_kv.py TL_KODIS_BAS.*.shp 실행 후 생성된
    basidco_kv/ 폴더가 이 스크립트와 같은 디렉터리에 있어야 함
  - pip install requests
"""

import os
import sys
import json
import glob
import time
import requests

ACCOUNT_ID = '02709cbec18d848913b4246015b9148f'
NS_ID = '7f0e90efaea64f3ab08ff00f8970b28b'
CHUNK_SIZE = 5000  # Cloudflare KV bulk API limit
BASE_URL = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{NS_ID}/bulk'

def get_token():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    if not token:
        print('CLOUDFLARE_API_TOKEN 환경변수가 없습니다.')
        print('실행 방법:')
        print('  Windows: set CLOUDFLARE_API_TOKEN=<키> && python tools/kv_bulk_upload.py')
        print('  Mac/Linux: CLOUDFLARE_API_TOKEN=<키> python3 tools/kv_bulk_upload.py')
        sys.exit(1)
    return token

def upload_chunk(token, batch, chunk_idx, total_chunks):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    resp = requests.put(BASE_URL, headers=headers, json=batch, timeout=120)
    if resp.status_code == 200:
        result = resp.json()
        if result.get('success'):
            print(f'  청크 {chunk_idx+1}/{total_chunks}: {len(batch)}개 업로드 완료')
            return True
        else:
            print(f'  청크 {chunk_idx+1} 실패: {result}')
            return False
    else:
        print(f'  청크 {chunk_idx+1} HTTP {resp.status_code}: {resp.text[:200]}')
        return False

def main():
    token = get_token()

    # basidco_kv/ 디렉터리 탐색
    script_dir = os.path.dirname(os.path.abspath(__file__))
    kv_dir = os.path.join(script_dir, '..', 'basidco_kv')
    if not os.path.isdir(kv_dir):
        kv_dir = os.path.join(os.getcwd(), 'basidco_kv')
    if not os.path.isdir(kv_dir):
        print(f'basidco_kv/ 디렉터리를 찾을 수 없습니다.')
        print('먼저 python tools/basidco_to_kv.py <shp파일> 을 실행하세요.')
        sys.exit(1)

    files = sorted(glob.glob(os.path.join(kv_dir, '*.json')))
    if not files:
        print(f'basidco_kv/ 에 JSON 파일이 없습니다.')
        sys.exit(1)

    print(f'총 {len(files)}개 구역 데이터 KV 업로드 시작...')
    print(f'KV NS: {NS_ID}')

    # CHUNK_SIZE개씩 나눠 업로드
    chunks = [files[i:i+CHUNK_SIZE] for i in range(0, len(files), CHUNK_SIZE)]
    total_ok = 0
    total_fail = 0

    for ci, chunk in enumerate(chunks):
        batch = []
        for fp in chunk:
            key = 'basidco:' + os.path.basename(fp)[:-5]
            val = open(fp, encoding='utf-8').read()
            batch.append({'key': key, 'value': val})

        success = False
        for attempt in range(3):
            if attempt > 0:
                wait = 2 ** attempt
                print(f'  재시도 {attempt+1} ({wait}초 대기)...')
                time.sleep(wait)
            success = upload_chunk(token, batch, ci, len(chunks))
            if success:
                break

        if success:
            total_ok += len(batch)
        else:
            total_fail += len(batch)

        time.sleep(0.3)  # rate limit 여유

    print(f'\n업로드 완료: {total_ok}개 성공, {total_fail}개 실패')
    if total_fail == 0:
        print('전국 기초구역 경계 KV 업로드 완료.')
        print('yongcha.app에서 우편번호 추가 시 정확한 기초구역 경계가 표시됩니다.')

if __name__ == '__main__':
    main()
