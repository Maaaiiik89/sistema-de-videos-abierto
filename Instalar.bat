@echo off
chcp 65001 >nul
title Sistema de videos: instalar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0herramientas\instalar.ps1" %*
echo.
pause
