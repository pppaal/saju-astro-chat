FROM python:3.10-slim

# Disable torch CUDA checks (CPU-only)
ENV TORCH_CUDA_ARCH_LIST=""
ENV USE_CUDA=0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Assume build context is backend_ai/ (Railway default when Dockerfile path is backend_ai/Dockerfile)
WORKDIR /app

# Copy only requirements for caching
COPY requirements.txt ./requirements.txt

# Install Python deps
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Provide backend_ai module path (backend_ai -> /app) for imports like backend_ai.app.x
RUN ln -s /app /app/backend_ai

# Expose port
EXPOSE 8080

# Set PYTHONPATH for imports
ENV PYTHONPATH=/app

# Start command (default to 8080 if PORT is not provided)
CMD ["sh", "-c", "gunicorn main:app --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"]
