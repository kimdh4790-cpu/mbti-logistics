#!/usr/bin/env python3
"""
기초구역도 shapefile 변환 + KV 업로드 (일체형)

로컬 PC에서 실행 (CF API 키 불필요):
  pip install pyshp pyproj requests

  Windows:
    python tools/basidco_convert_upload.py C:\다운로드폴더\TL_KODIS_BAS.*.shp
    또는 폴더 지정:
    python tools/basidco_convert_upload.py --dir C:\다운로드폴더

  Mac/Linux:
    python3 tools/basidco_convert_upload.py /path/to/TL_KODIS_BAS.*.shp

준비물:
  - data.go.kr "행정안전부_도로명주소 기초구역도 전자지도"에서
    시도별 ZIP 파일 모두 다운로드 후 압축 해제
  - TL_KODIS_BAS.*.shp 파일들이 있어야 함
"""

import os, sys, json, math, glob, time, argparse
import requests

WORKER_URL = 'https://yongcha.app/api/yongcha/kv-batch-write'
BATCH_SECRET = 'basidco2024write'
BATCH_SIZE = 500   # 한 번에 Worker에 보낼 구역 수
MAX_COORDS = 200   # 폴리곤 꼭짓점 최대 개수

def dp(pts, eps):
    if len(pts) < 3: return pts
    dmax, idx = 0, 0
    end = len(pts)-1; ax,ay=pts[0]; bx,by=pts[end]
    for i in range(1, end):
        px,py=pts[i]; dx,dy=bx-ax,by-ay
        if dx==0 and dy==0: d=math.hypot(px-ax,py-ay)
        else:
            tv=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
            d=math.hypot(px-(ax+tv*dx),py-(ay+tv*dy))
        if d>dmax: dmax,idx=d,i
    if dmax>eps: return dp(pts[:idx+1],eps)[:-1]+dp(pts[idx:],eps)
    return [pts[0],pts[-1]]

def simplify(coords):
    if len(coords)<=MAX_COORDS: return coords
    eps=0.1
    while True:
        s=dp(coords,eps)
        if len(s)<=MAX_COORDS: return s
        eps*=1.5

def convert_shp(shp_path, transformer):
    import shapefile
    sf = shapefile.Reader(shp_path, encoding='euc-kr')
    fields = [f[0] for f in sf.fields[1:]]
    if 'BAS_ID' not in fields:
        print(f'  BAS_ID 필드 없음 ({fields}), 건너뜀')
        return {}
    zip_idx = fields.index('BAS_ID')
    result = {}
    for sr in sf.shapeRecords():
        zc = str(sr.record[zip_idx]).strip().zfill(5)
        if len(zc)!=5 or not zc.isdigit(): continue
        shape = sr.shape
        if shape.shapeType not in (5,15,25): continue
        parts = list(shape.parts)+[len(shape.points)]
        br,bl=[],0
        for i in range(len(parts)-1):
            ring=shape.points[parts[i]:parts[i+1]]
            if len(ring)>bl: bl,br=len(ring),ring
        if len(br)<4: continue
        coords=[]
        for x,y in simplify(br):
            lng,lat=transformer.transform(x,y)
            if 33<lat<39 and 124<lng<132:
                coords.append({'lat':round(lat,6),'lng':round(lng,6)})
        if len(coords)>=4:
            result[zc]=coords
    return result

def upload_batch(items):
    payload = [{'key': f'basidco:{k}', 'value': json.dumps(v, separators=(',',':'))} for k,v in items]
    for attempt in range(3):
        try:
            r = requests.post(
                WORKER_URL,
                headers={'x-batch-secret': BATCH_SECRET, 'Content-Type': 'application/json'},
                json=payload,
                timeout=60
            )
            if r.status_code == 200 and r.json().get('ok'):
                return True
            print(f'  HTTP {r.status_code}: {r.text[:100]}')
        except Exception as e:
            print(f'  오류: {e}')
        if attempt < 2:
            time.sleep(2 ** attempt)
    return False

def main():
    parser = argparse.ArgumentParser(description='기초구역도 shapefile → Cloudflare KV 업로드')
    parser.add_argument('shp', nargs='*', help='SHP 파일 경로 (glob 패턴 가능)')
    parser.add_argument('--dir', help='SHP 파일이 있는 디렉터리')
    args = parser.parse_args()

    # SHP 파일 목록 수집
    shp_files = []
    if args.dir:
        shp_files = glob.glob(os.path.join(args.dir, 'TL_KODIS_BAS.*.shp'))
    elif args.shp:
        for p in args.shp:
            shp_files.extend(glob.glob(p) if '*' in p or '?' in p else [p])
    else:
        shp_files = glob.glob('TL_KODIS_BAS.*.shp')

    if not shp_files:
        print('SHP 파일을 찾을 수 없습니다.')
        print('사용법: python basidco_convert_upload.py --dir <폴더경로>')
        sys.exit(1)

    print(f'발견된 SHP 파일 {len(shp_files)}개:')
    for f in sorted(shp_files):
        print(f'  {os.path.basename(f)}')
    print()

    try:
        import shapefile
    except ImportError:
        print('pip install pyshp 실행 후 재시도')
        sys.exit(1)
    try:
        from pyproj import Transformer
        t = Transformer.from_crs('EPSG:5179', 'EPSG:4326', always_xy=True)
    except ImportError:
        print('pip install pyproj 실행 후 재시도')
        sys.exit(1)

    # 변환
    all_zones = {}
    for shp in sorted(shp_files):
        name = os.path.basename(shp)
        print(f'변환 중: {name}')
        zones = convert_shp(shp, t)
        all_zones.update(zones)
        print(f'  → {len(zones)}개')

    print(f'\n총 {len(all_zones)}개 구역 변환 완료')
    print(f'Worker KV 업로드 시작: {WORKER_URL}')
    print()

    # 배치 업로드
    items = list(all_zones.items())
    total = len(items)
    ok = 0
    for start in range(0, total, BATCH_SIZE):
        batch = items[start:start+BATCH_SIZE]
        end = min(start+BATCH_SIZE, total)
        if upload_batch(dict(batch)):
            ok += len(batch)
            print(f'  {end}/{total} 업로드됨')
        else:
            print(f'  {start}~{end} 실패')
        time.sleep(0.2)

    print(f'\n완료: {ok}/{total}개 성공')
    if ok == total:
        print('yongcha.app에서 우편번호 추가 시 정확한 기초구역 경계가 표시됩니다.')

if __name__ == '__main__':
    main()
