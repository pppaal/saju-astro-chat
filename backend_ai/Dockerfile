FROM python:3.10-slim

# Disable torch CUDA checks (CPU-only)
ENV TORCH_CUDA_ARCH_LIST=""
ENV USE_CUDA=0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working dir to the backend service root
WORKDIR /app/backend_ai

# Copy only backend_ai requirements for better caching
COPY backend_ai/requirements.txt ./requirements.txt

# Install Python deps with optimizations
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend_ai source
COPY backend_ai/ .

# Expose port (platforms like Cloud Run/Railway set PORT, default to 8080)
EXPOSE 8080

# Set PYTHONPATH so "from backend_ai.app.xxx" works
ENV PYTHONPATH=/app/backend_ai

# Start command; bind to provided PORT or fallback to 8080
CMD ["sh", "-c", "gunicorn main:app --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"]
