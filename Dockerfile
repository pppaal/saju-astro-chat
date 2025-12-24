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

# Use 1 worker with threads for memory efficiency on Railway
# preload to share model memory, graceful-timeout for clean shutdown
CMD ["sh", "-c", "gunicorn app.app:app --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 4 --timeout 120 --graceful-timeout 30 --keep-alive 5"]
