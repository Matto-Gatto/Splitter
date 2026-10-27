@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  call npm.cmd ci
  if errorlevel 1 goto failure
)
call npm.cmd run dev -- --port 5173 --strictPort
if errorlevel 1 goto failure
exit /b 0
:failure
echo Avvio sviluppo non riuscito.
pause
exit /b 1
