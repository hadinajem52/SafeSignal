@echo off
set SCRIPTS_DIR=%~dp0
set ROOT_DIR=%~dp0..
%ROOT_DIR%\venv\Scripts\python.exe -m uvicorn demo_main:app --host localhost --port 8000 --reload --app-dir "%SCRIPTS_DIR%"
