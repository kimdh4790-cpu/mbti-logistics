#!/usr/bin/env python3
"""
기초구역도 shapefile → Cloudflare KV 업로드 스크립트
사용법:
  1. https://www.data.go.kr 에서 "기초구역도" shapefile 다운로드
     (검색어: 기초구역도, 제공기관: 행정안전부)
     또는 https://business.juso.go.kr/addrlink/openApi/searchApi.do 에서
     "기초구역도" 항목 다운로드
  2. pip install pyshp (shapefile 파싱 라이브러리)
  3. python basidco_to_kv.py <shapefile경로.shp>
     예: python basidco_to_kv.py ./TL_SCCO_CTPRVN/TL_SCCO_BASIDCO.shp
  4. 생성된 kv_upload.sh 실행 (wrangler 필요)
     bash kv_upload.sh

출력:
  - basidco_kv/ 디렉터리에 <우편번호>.json 파일 생성
  - kv_upload.sh 생성 (wrangler kv put 명령 모음)
"""

import sys
import os
import json
import math
import subprocess

KV_NS_ID = '7f0e90efaea64f3ab08ff00f8970b28b'
OUT_DIR = 'basidco_kv'
MAX_COORDS = 200  # 폴리곤 꼭짓점 최대 개수 (KV 크기 절약을 위해 다운샘플)


def douglas_peucker(points, epsilon):
    """Ramer-Douglas-Peucker 알고리즘으로 폴리곤 단순화."""
    if len(points) < 3:
        return points
    dmax = 0
    idx = 0
    end = len(points) - 1
    for i in range(1, end):
        ax, ay = points[0]
        bx, by = points[end]
        px, py = points[i]
        # 점-선 거리 계산
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            d = math.hypot(px - ax, py - ay)
        else:
            t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
            t = max(0, min(1, t))
            d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
        if d > dmax:
            dmax = d
            idx = i
    if dmax > epsilon:
        left = douglas_peucker(points[:idx + 1], epsilon)
        right = douglas_peucker(points[idx:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]


def simplify_ring(coords, target=MAX_COORDS):
    """꼭짓점 수를 target 이하로 줄임."""
    if len(coords) <= target:
        return coords
    eps = 0.0001
    while True:
        simplified = douglas_peucker(coords, eps)
        if len(simplified) <= target:
            return simplified
        eps *= 1.5


def convert_shapefile(shp_path):
    try:
        import shapefile
    except ImportError:
        print('pyshp 미설치. pip install pyshp 실행 후 재시도')
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    sf = shapefile.Reader(shp_path, encoding='euc-kr')
    fields = [f[0] for f in sf.fields[1:]]  # 첫 번째 삭제 플래그 제외

    print(f'필드 목록: {fields}')
    # 기초구역코드 필드 이름 탐색 (BAS_ID, BASIDCO, ZIP, BAS_CD 등)
    zip_field = None
    for candidate in ['BAS_ID', 'BASIDCO', 'ZIP', 'BAS_CD', 'POSCD', 'bas_id']:
        if candidate in fields:
            zip_field = candidate
            break
    if zip_field is None:
        print(f'우편번호 필드 없음. 필드: {fields}')
        sys.exit(1)
    print(f'우편번호 필드: {zip_field}')

    zip_idx = fields.index(zip_field)
    count = 0
    errors = 0
    total = len(sf.shapeRecords())
    print(f'총 {total}개 레코드 변환 시작...')

    for sr in sf.shapeRecords():
        rec = sr.record
        zip_code = str(rec[zip_idx]).strip().zfill(5)
        if len(zip_code) != 5 or not zip_code.isdigit():
            errors += 1
            continue

        shape = sr.shape
        # Polygon (type 5) 또는 MultiPolygon
        if shape.shapeType not in (5, 15, 25):
            errors += 1
            continue

        # 가장 긴 파트(면적 큰 폴리곤) 선택
        parts = list(shape.parts) + [len(shape.points)]
        best_ring = []
        best_len = 0
        for i in range(len(parts) - 1):
            ring = shape.points[parts[i]:parts[i + 1]]
            if len(ring) > best_len:
                best_len = len(ring)
                best_ring = ring

        if len(best_ring) < 4:
            errors += 1
            continue

        simplified = simplify_ring(best_ring)
        coords = [{'lat': round(p[1], 6), 'lng': round(p[0], 6)} for p in simplified]

        out_path = os.path.join(OUT_DIR, f'{zip_code}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(coords, f, ensure_ascii=False, separators=(',', ':'))

        count += 1
        if count % 1000 == 0:
            print(f'  {count}/{total} 완료...')

    print(f'변환 완료: {count}개 성공, {errors}개 건너뜀')
    return count


def generate_upload_script(count):
    """wrangler kv put 명령을 모은 셸 스크립트 생성."""
    script_path = 'kv_upload.sh'
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write('#!/bin/bash\n')
        f.write(f'# 기초구역 경계 데이터 Cloudflare KV 업로드\n')
        f.write(f'# KV NS_ID: {KV_NS_ID}\n')
        f.write(f'# 총 {count}개 파일\n\n')
        f.write('set -e\n')
        f.write('FAIL=0\n')
        f.write(f'FILES=({OUT_DIR}/*.json)\n')
        f.write('TOTAL=${#FILES[@]}\n')
        f.write('I=0\n')
        f.write('for f in "${FILES[@]}"; do\n')
        f.write('  I=$((I+1))\n')
        f.write('  zip=$(basename "$f" .json)\n')
        f.write(f'  npx wrangler kv key put --remote --namespace-id={KV_NS_ID} "basidco:$zip" --path "$f" || FAIL=$((FAIL+1))\n')
        f.write('  if [ $((I % 100)) -eq 0 ]; then echo "$I/$TOTAL 업로드됨"; fi\n')
        f.write('done\n')
        f.write('echo "완료: $((TOTAL - FAIL)) 성공, $FAIL 실패"\n')
    os.chmod(script_path, 0o755)
    print(f'셸 스크립트 생성: {script_path}')
    print(f'실행: bash {script_path}')


def generate_bulk_script(count):
    """wrangler kv bulk put (JSON 배열) 방식 — 한 번에 대량 업로드."""
    # wrangler는 --batch 옵션으로 JSON 배열 업로드 지원
    # [{"key": "basidco:12345", "value": "[...]"}, ...]
    bulk_path = 'kv_bulk_upload.sh'
    with open(bulk_path, 'w', encoding='utf-8') as f:
        f.write('#!/bin/bash\n')
        f.write('# 기초구역 경계 데이터 일괄 업로드 (bulk 방식, 속도 빠름)\n\n')
        f.write('set -e\n')
        f.write(f'NS_ID="{KV_NS_ID}"\n\n')
        # 10,000개씩 나눠 bulk put
        f.write('# 파일을 10000개씩 묶어서 bulk JSON 생성 후 업로드\n')
        f.write(f'python3 -c "\n')
        f.write('import os, json, glob, math\n')
        f.write(f'files = sorted(glob.glob(\"{OUT_DIR}/*.json\"))\n')
        f.write('CHUNK = 10000\n')
        f.write('for ci, start in enumerate(range(0, len(files), CHUNK)):\n')
        f.write('    chunk = files[start:start+CHUNK]\n')
        f.write('    batch = []\n')
        f.write('    for fp in chunk:\n')
        f.write('        key = \'basidco:\' + os.path.basename(fp)[:-5]\n')
        f.write('        val = open(fp).read()\n')
        f.write('        batch.append({\'key\': key, \'value\': val})\n')
        f.write(f'    out = f\'bulk_chunk_{{ci}}.json\'\n')
        f.write('    json.dump(batch, open(out, \'w\'))\n')
        f.write('    print(f\'청크 {ci}: {len(batch)}개 → {out}\')\n')
        f.write('"\n\n')
        f.write('for chunk_file in bulk_chunk_*.json; do\n')
        f.write(f'  echo "업로드: $chunk_file"\n')
        f.write(f'  npx wrangler kv bulk put --namespace-id=$NS_ID "$chunk_file"\n')
        f.write('  rm "$chunk_file"\n')
        f.write('done\n')
        f.write('echo "전체 업로드 완료"\n')
    os.chmod(bulk_path, 0o755)
    print(f'일괄 업로드 스크립트: {bulk_path}  (권장)')
    print(f'실행: bash {bulk_path}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    shp_path = sys.argv[1]
    if not os.path.exists(shp_path):
        print(f'파일 없음: {shp_path}')
        sys.exit(1)

    count = convert_shapefile(shp_path)
    if count > 0:
        generate_upload_script(count)
        generate_bulk_script(count)
