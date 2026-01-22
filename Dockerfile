FROM python:3.10-slim

# Disable torch CUDA checks (CPU-only)
ENV TORCH_CUDA_ARCH_LIST=""
ENV USE_CUDA=0

# Memory optimization for PyTorch
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV PYTORCH_ENABLE_MPS_FALLBACK=1

# Python optimization
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

WORKDIR /app

# Copy requirements from backend_ai
COPY backend_ai/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

# Copy backend_ai source
COPY backend_ai/. .

# Provide backend_ai module path for imports like backend_ai.app.x
RUN ln -s /app /app/backend_ai

ENV PYTHONPATH=/app
EXPOSE 8080

# Use env-driven Gunicorn settings to keep Docker/Fly aligned.
CMD ["sh", "-c", "exec gunicorn ${APP_MODULE:-main:app} --bind 0.0.0.0:${PORT:-8080} --workers ${GUNICORN_WORKERS:-1} --threads ${GUNICORN_THREADS:-4} --timeout ${GUNICORN_TIMEOUT:-120} --graceful-timeout ${GUNICORN_GRACEFUL_TIMEOUT:-30} --keep-alive ${GUNICORN_KEEPALIVE:-5} --worker-class ${GUNICORN_WORKER_CLASS:-gthread} --preload"]
