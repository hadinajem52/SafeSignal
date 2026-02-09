@echo off
cd /d %~dp0
python -m uvicorn demo_main:app --host localhost --port 8000 --reload
