@echo off
chcp 65001 >nul
title Sistema de videos: conectar la música
cd /d "%~dp0"
echo Conectar tu cuenta gratis de HyperFrames (catálogo de música de fondo)
echo.
echo Se va a abrir el navegador. Entra con tu cuenta (o crea una gratis) y acepta.
echo Cuando el navegador diga que terminó, vuelve a esta ventana.
echo.
where npx.cmd >nul 2>nul
if errorlevel 1 (
  echo No encuentro Node.js. Abre primero Instalar.bat.
  pause
  exit /b 1
)
call npx.cmd --yes hyperframes@0.9.30 auth login
echo.
call npx.cmd --yes hyperframes@0.9.30 auth status 2>nul | findstr /C:"(valid)" >nul
if errorlevel 1 (
  echo No quedó conectada. Cierra esta ventana y vuelve a abrir Conectar-musica.bat.
) else (
  echo Cuenta conectada. Ya puedes pedirle música al agente.
)
echo.
pause
