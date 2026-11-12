@echo off
chcp 65001 >nul
title Sistema de videos: actualizar
set "SISTEMA_RAIZ=%~dp0"
copy /y "%~dp0herramientas\actualizar.ps1" "%TEMP%\sistema-videos-actualizar.ps1" >nul
rem Todo en una sola linea: si la actualizacion reemplaza este archivo, cmd no lee lineas nuevas a mitad de camino.
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\sistema-videos-actualizar.ps1" & echo. & pause & exit /b
