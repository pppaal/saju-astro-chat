FROM python:3.10-slim

WORKDIR /app

# Disable torch CUDA checks (CPU-only)
ENV TORCH_CUDA_ARCH_LIST=""
ENV USE_CUDA=0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for caching
COPY requirements.txt .

# Install Python deps with optimizations
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Create backend_ai folder structure to match import paths
# (app.py uses "from backend_ai.app.xxx import yyy")
RUN mkdir -p /app/backend_ai
COPY . /app/backend_ai/

# Expose port
EXPOSE 5000

# Railway injects PORT env var
ENV PORT=5000

# Set PYTHONPATH so "from backend_ai.app.xxx" works
ENV PYTHONPATH=/app

# Work from the backend_ai directory where main.py is
WORKDIR /app/backend_ai

# Start command (uses $PORT from Railway)
CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
