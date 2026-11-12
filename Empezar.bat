@echo off
chcp 65001 >nul
title Sistema de videos
cd /d "%~dp0"
where claude >nul 2>nul
if errorlevel 1 (
  echo No encuentro Claude Code. Abre primero Instalar.bat.
  pause
  exit /b 1
)
claude "Hola. Quiero empezar con el sistema de videos."
