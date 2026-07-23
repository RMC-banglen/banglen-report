# push-gas.ps1
$code = Get-Content "D:\claude AI\Pro\concrete-webap.js" -Raw -Encoding UTF8
Set-Clipboard -Value $code
$url = "https://script.google.com/d/1RILUsuJvKFGanZREr2ZliloNcr_OegUjtnQSs58yw-oGuaob9fO4T3PV/edit"
Start-Process $url
Write-Host "OK - Code copied! Press Ctrl+A then Ctrl+V in Apps Script" -ForegroundColor Green
pause
