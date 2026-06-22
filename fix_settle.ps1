$c = [System.IO.File]::ReadAllText("settle.html", [System.Text.Encoding]::UTF8)

$old1 = '<div style="font-size:10px;color:var(--text3)">복잡한 계산이 필요한 업종 — 개인 31만~315만원/월 · 단체(20개사+) 22만~210만원/월 (VAT별도)</div>'
$new1 = '<div style="font-size:10px;color:var(--text3);margin-top:2px">개인: 50명 31만 · 150명 68만 · 300명 102만 · 500명 170만 · 700명 275만 · 1000명 315만원/월</div>' + "`n" + '                  <div style="font-size:10px;color:var(--text3)">단체(20개사+): 50명 22만 · 150명 52만 · 300명 78만 · 500명 131만 · 700명 183만 · 1000명 210만원/월 (VAT별도)</div>'

$old2 = '<div style="font-size:10px;color:var(--text3)">배민·쿠팡이츠·바로고·생각대로 자동인식 — 개인 31만~315만원/월 · 단체 22만~210만원/월 (VAT별도)</div>'
$new2 = '<div style="font-size:10px;color:var(--text3);margin-top:2px">개인: 50명 31만 · 150명 68만 · 300명 102만 · 500명 170만 · 700명 275만 · 1000명 315만원/월</div>' + "`n" + '                  <div style="font-size:10px;color:var(--text3)">단체(20개사+): 50명 22만 · 150명 52만 · 300명 78만 · 500명 131만 · 700명 183만 · 1000명 210만원/월 (VAT별도)</div>'

if ($c.Contains($old1)) {
    $c = $c.Replace($old1, $new1)
    Write-Host "AI정산 수정완료"
} else {
    Write-Host "AI정산 텍스트 못찾음"
}

if ($c.Contains($old2)) {
    $c = $c.Replace($old2, $new2)
    Write-Host "배달대행 수정완료"
} else {
    Write-Host "배달대행 텍스트 못찾음"
}

[System.IO.File]::WriteAllText("settle.html", $c, [System.Text.Encoding]::UTF8)
Write-Host "저장완료"
