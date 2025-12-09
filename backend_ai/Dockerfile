FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Railway injects PORT env var
ENV PORT=5000

# Start command (uses $PORT from Railway)
CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
