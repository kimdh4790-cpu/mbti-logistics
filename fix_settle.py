# -*- coding: utf-8 -*-
with open('settle.html', 'r', encoding='utf-8') as f:
    c = f.read()

old1 = '<div style="font-size:10px;color:var(--text3)">복잡한 계산이 필요한 업종 \u2014 \uac1c\uc778 31\ub9cc~315\ub9cc\uc6d0/\uc6d4 \xb7 \ub2e8\uccb4(20\uac1c\uc0ac+) 22\ub9cc~210\ub9cc\uc6d0/\uc6d4 (VAT\ubcc4\ub3c4)</div>'
new1 = '''<div style="font-size:10px;color:var(--text3);margin-top:2px">\uac1c\uc778: 50\uba85 31\ub9cc \xb7 150\uba85 68\ub9cc \xb7 300\uba85 102\ub9cc \xb7 500\uba85 170\ub9cc \xb7 700\uba85 275\ub9cc \xb7 1000\uba85 315\ub9cc\uc6d0/\uc6d4</div>
                  <div style="font-size:10px;color:var(--text3)">\ub2e8\uccb4(20\uac1c\uc0ac+): 50\uba85 22\ub9cc \xb7 150\uba85 52\ub9cc \xb7 300\uba85 78\ub9cc \xb7 500\uba85 131\ub9cc \xb7 700\uba85 183\ub9cc \xb7 1000\uba85 210\ub9cc\uc6d0/\uc6d4 (VAT\ubcc4\ub3c4)</div>'''

old2 = '<div style="font-size:10px;color:var(--text3)">\ubc30\ub124\xb7\ucfe0\ud321\uc774\uce20\xb7\ubc14\ub85c\uace0\xb7\uc0dd\uac01\ub300\ub85c \uc790\ub3d9\uc778\uc2dd \u2014 \uac1c\uc778 31\ub9cc~315\ub9cc\uc6d0/\uc6d4 \xb7 \ub2e8\uccb4 22\ub9cc~210\ub9cc\uc6d0/\uc6d4 (VAT\ubcc4\ub3c4)</div>'
new2 = '''<div style="font-size:10px;color:var(--text3);margin-top:2px">\uac1c\uc778: 50\uba85 31\ub9cc \xb7 150\uba85 68\ub9cc \xb7 300\uba85 102\ub9cc \xb7 500\uba85 170\ub9cc \xb7 700\uba85 275\ub9cc \xb7 1000\uba85 315\ub9cc\uc6d0/\uc6d4</div>
                  <div style="font-size:10px;color:var(--text3)">\ub2e8\uccb4(20\uac1c\uc0ac+): 50\uba85 22\ub9cc \xb7 150\uba85 52\ub9cc \xb7 300\uba85 78\ub9cc \xb7 500\uba85 131\ub9cc \xb7 700\uba85 183\ub9cc \xb7 1000\uba85 210\ub9cc\uc6d0/\uc6d4 (VAT\ubcc4\ub3c4)</div>'''

cnt = 0
if old1 in c:
    c = c.replace(old1, new1, 1)
    cnt += 1
    print('AI정산 요금 수정 완료')
else:
    print('AI정산 old1 not found')

if old2 in c:
    c = c.replace(old2, new2, 1)
    cnt += 1
    print('배달대행 요금 수정 완료')
else:
    print('배달대행 old2 not found')

if cnt > 0:
    with open('settle.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print('저장 완료')
else:
    print('수정할 내용 없음 - 이미 최신버전이거나 텍스트가 다름')
    # 현재 파일에서 관련 텍스트 출력
    idx = c.find('복잡한 계산이 필요한 업종')
    if idx > 0:
        print('현재 텍스트:', c[idx:idx+200])
