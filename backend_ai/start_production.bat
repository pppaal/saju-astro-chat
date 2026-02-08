@echo off
REM Backend AI 프로덕션 서버 시작 스크립트 (Windows)

echo 🚀 Starting Backend AI in PRODUCTION mode...

REM 환경변수 로드
if exist .env (
    for /f "usebackq tokens=*" %%a in (".env") do (
        set "%%a"
    )
    echo ✅ Environment variables loaded
)

REM Worker/Thread 설정 (기본값)
if not defined GUNICORN_WORKERS set GUNICORN_WORKERS=4
if not defined GUNICORN_THREADS set GUNICORN_THREADS=2
if not defined GUNICORN_TIMEOUT set GUNICORN_TIMEOUT=120
if not defined GUNICORN_WORKER_CLASS set GUNICORN_WORKER_CLASS=gthread
if not defined PORT set PORT=5000

echo 📊 Configuration:
echo   - Workers: %GUNICORN_WORKERS%
echo   - Threads: %GUNICORN_THREADS%
echo   - Timeout: %GUNICORN_TIMEOUT%s
echo   - Worker Class: %GUNICORN_WORKER_CLASS%
echo   - Port: %PORT%
echo.

REM Gunicorn 실행
venv\Scripts\gunicorn main:app ^
  --bind 0.0.0.0:%PORT% ^
  --workers %GUNICORN_WORKERS% ^
  --threads %GUNICORN_THREADS% ^
  --timeout %GUNICORN_TIMEOUT% ^
  --worker-class %GUNICORN_WORKER_CLASS% ^
  --graceful-timeout 30 ^
  --keep-alive 5 ^
  --preload ^
  --log-level info ^
  --access-logfile - ^
  --error-logfile -
