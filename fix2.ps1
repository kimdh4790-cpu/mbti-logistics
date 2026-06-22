$c = [System.IO.File]::ReadAllText("settle.html", [System.Text.Encoding]::UTF8)

$old1 = [System.IO.File]::ReadAllText("old1.txt", [System.Text.Encoding]::UTF8)
$new1 = [System.IO.File]::ReadAllText("new1.txt", [System.Text.Encoding]::UTF8)
$old2 = [System.IO.File]::ReadAllText("old2.txt", [System.Text.Encoding]::UTF8)
$new2 = [System.IO.File]::ReadAllText("new2.txt", [System.Text.Encoding]::UTF8)

if ($c.Contains($old1)) { $c = $c.Replace($old1, $new1); Write-Host "1 OK" } else { Write-Host "1 NOT FOUND" }
if ($c.Contains($old2)) { $c = $c.Replace($old2, $new2); Write-Host "2 OK" } else { Write-Host "2 NOT FOUND" }

[System.IO.File]::WriteAllText("settle.html", $c, [System.Text.Encoding]::UTF8)
Write-Host "DONE"
