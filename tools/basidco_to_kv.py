#!/usr/bin/env python3
"""
기초구역도 shapefile → Cloudflare KV 업로드 스크립트

다운로드 경로:
  행정안전부 도로명주소 기초구역도 전자지도 (data.go.kr/data/15050416/fileData.do)
  → 다운로드 후 압축 해제하면 TL_KODIS_BAS.shp 포함

사용법:
  1. data.go.kr에서 "행정안전부_도로명주소 기초구역도 전자지도" 다운로드
  2. pip install pyshp
  3. python basidco_to_kv.py TL_KODIS_BAS.shp
  4. bash kv_bulk_upload.sh   (wrangler 필요, 로컬 PC에서 실행)

shapefile 스펙 (PPTX 안내서 기준):
  레이어: TL_KODIS_BAS
  PK:     BAS_MGT_SN  (기초구역 관리번호)
  우편번호 필드: BAS_ID 또는 BAS_CD (5자리 숫자)
  좌표계: GRS80 UTM-K → pyshp가 자동으로 경위도(EPSG:4326) 처리

출력:
  - basidco_kv/<우편번호>.json  (전국 약 36,000개)
  - kv_bulk_upload.sh  (Cloudflare KV 일괄 업로드)
"""

import sys
import os
import json
import math

KV_NS_ID = '7f0e90efaea64f3ab08ff00f8970b28b'
OUT_DIR = 'basidco_kv'
MAX_COORDS = 200  # 폴리곤 꼭짓점 최대 개수 (KV 크기 절약을 위해 다운샘플)

# TL_KODIS_BAS 좌표계: GRS80 UTM-K (EPSG:5179)
# 경위도(EPSG:4326)로 변환 필요 여부는 첫 좌표로 자동 판단
# x > 1000000 이면 투영좌표 → pyproj로 변환
def _make_transformer():
    try:
        from pyproj import Transformer
        return Transformer.from_crs('EPSG:5179', 'EPSG:4326', always_xy=True)
    except Exception:
        return None

_transformer = None

def project_point(x, y):
    """UTM-K → 경위도 변환 (투영좌표인 경우만)."""
    global _transformer
    if x > 1000:  # 투영좌표 (미터 단위) 판정
        if _transformer is None:
            _transformer = _make_transformer()
        if _transformer:
            lng, lat = _transformer.transform(x, y)
            return lng, lat
        # pyproj 없을 때 GRS80 UTM-K 근사 변환
        lng = (x - 1000000) / 111320 + 127.5
        lat = y / 110540
        return lng, lat
    return x, y  # 이미 경위도


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
    # 기초구역코드 필드 탐색 — TL_KODIS_BAS 기준 우선순위
    # BAS_MGT_SN은 관리번호(PK)라 제외, 실제 5자리 우편번호 필드 탐색
    zip_field = None
    for candidate in ['BAS_ID', 'BAS_CD', 'BASIDCO', 'POST_CD', 'ZIP', 'POSCD', 'bas_id', 'bas_cd']:
        if candidate in fields:
            zip_field = candidate
            break
    if zip_field is None:
        # 첫 번째 레코드를 보고 5자리 숫자 패턴인 필드 자동 탐색
        try:
            rec = sf.shapeRecord(0).record
            for i, fname in enumerate(fields):
                val = str(rec[i]).strip()
                if len(val) == 5 and val.isdigit():
                    zip_field = fname
                    print(f'자동 감지된 우편번호 필드: {zip_field} (값: {val})')
                    break
        except Exception:
            pass
    if zip_field is None:
        print(f'우편번호 필드를 찾을 수 없습니다. 전체 필드: {fields}')
        print('첫 번째 레코드 값:', [str(v) for v in sf.shapeRecord(0).record])
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
        coords = []
        for p in simplified:
            lng, lat = project_point(p[0], p[1])
            # 한국 영역 벗어나면 건너뜀
            if not (33 < lat < 39 and 124 < lng < 132):
                continue
            coords.append({'lat': round(lat, 6), 'lng': round(lng, 6)})
        if len(coords) < 4:
            errors += 1
            continue

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
