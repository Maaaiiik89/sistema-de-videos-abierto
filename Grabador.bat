@echo off
cd /d "%~dp0"
start "" uv run --no-project --python 3.12 pythonw grabador\grabador.pyw
