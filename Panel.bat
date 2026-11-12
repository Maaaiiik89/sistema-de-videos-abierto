@echo off
chcp 65001 >nul
title Sistema de videos: panel
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No encuentro Node.js. Abre primero Instalar.bat.
  pause
  exit /b 1
)
echo Abriendo el panel en tu navegador...
node "%~dp0panel\servidor.mjs"
echo.
pause
