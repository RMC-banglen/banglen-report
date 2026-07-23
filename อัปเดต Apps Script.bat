@echo off
powershell -Command "Get-Content 'D:\claude AI\Pro\concrete-webap.js' -Raw -Encoding UTF8 | Set-Clipboard"
start chrome "https://script.google.com/d/1zdJWY0ytpZJDBTdaA3s5mX0q1Vc03ugFbqJj0RcfCIQGGQ3UGmHe5I-A/edit"
timeout /t 6 /nobreak >nul
powershell -Command "$w=New-Object -ComObject WScript.Shell; $w.AppActivate('Apps Script'); Start-Sleep 1; $w.SendKeys('^a'); Start-Sleep 1; $w.SendKeys('^v'); Start-Sleep 1; $w.SendKeys('^s')"
echo Done!
timeout /t 2 /nobreak >nul
