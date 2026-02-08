#!/bin/bash
# Backend AI 프로덕션 서버 시작 스크립트

echo "🚀 Starting Backend AI in PRODUCTION mode..."

# 환경변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
fi

# Worker/Thread 설정
WORKERS=${GUNICORN_WORKERS:-4}
THREADS=${GUNICORN_THREADS:-2}
TIMEOUT=${GUNICORN_TIMEOUT:-120}
WORKER_CLASS=${GUNICORN_WORKER_CLASS:-gthread}
PORT=${PORT:-5000}

echo "📊 Configuration:"
echo "  - Workers: $WORKERS"
echo "  - Threads: $THREADS"
echo "  - Timeout: ${TIMEOUT}s"
echo "  - Worker Class: $WORKER_CLASS"
echo "  - Port: $PORT"
echo ""

# Gunicorn 실행
exec gunicorn main:app \
  --bind 0.0.0.0:$PORT \
  --workers $WORKERS \
  --threads $THREADS \
  --timeout $TIMEOUT \
  --worker-class $WORKER_CLASS \
  --graceful-timeout 30 \
  --keep-alive 5 \
  --preload \
  --log-level info \
  --access-logfile - \
  --error-logfile - \
  --capture-output
