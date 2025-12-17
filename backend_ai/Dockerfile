FROM python:3.10-slim

# Build arg to allow flexible context (default assumes repo root context with backend_ai/ folder)
ARG SERVICE_PATH=backend_ai

# Disable torch CUDA checks (CPU-only)
ENV TORCH_CUDA_ARCH_LIST=""
ENV USE_CUDA=0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working dir to the backend service root
WORKDIR /app
WORKDIR ${SERVICE_PATH}

# Copy only backend_ai requirements for better caching.
COPY ${SERVICE_PATH}/requirements.txt ./requirements.txt

# Install Python deps with optimizations
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend_ai source
COPY ${SERVICE_PATH}/ .

# Expose port (platforms like Cloud Run/Railway set PORT, default to 8080)
EXPOSE 8080

# Set PYTHONPATH so imports work in both contexts
ENV PYTHONPATH=/app/${SERVICE_PATH}

# Start command; bind to provided PORT or fallback to 8080
CMD ["sh", "-c", "gunicorn main:app --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"]
