@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo สำรองข้อมูล Supabase ลงเครื่อง (อ่านอย่างเดียว)
echo.
node tools\backup-supabase.cjs %*
echo.
pause
