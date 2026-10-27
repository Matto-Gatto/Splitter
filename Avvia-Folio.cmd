@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Installazione delle dipendenze di Folio...
  call npm.cmd ci
  if errorlevel 1 goto failure
)
call npm.cmd start
if errorlevel 1 goto failure
exit /b 0
:failure
echo.
echo Avvio non riuscito. Controlla il messaggio precedente.
pause
exit /b 1
