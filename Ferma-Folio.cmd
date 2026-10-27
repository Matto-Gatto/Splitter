@echo off
setlocal
cd /d "%~dp0"
node scripts\stop-server.mjs
if errorlevel 1 pause
