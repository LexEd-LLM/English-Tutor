FROM python:3.13.3-bullseye

# Set working directory
WORKDIR /app

# Thêm repo chính thức của PostgreSQL để lấy bản libpq mới hơn (>=17)
RUN echo "deb http://apt.postgresql.org/pub/repos/apt bullseye-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    curl -sSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Cài libpq-dev bản mới từ repo PostgreSQL
RUN apt-get update && apt-get install -y \
    build-essential \
    espeak \
    gcc \
    python3-dev \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy yêu cầu & cài Python packages
COPY backend/requirements.txt /app/backend/
RUN pip install -r /app/backend/requirements.txt

# Copy phần code backend (tách ra sau để tránh mất cache ở bước pip)
COPY backend/ /app/backend/

# Tạo thư mục media
RUN mkdir -p /app/backend/media && chmod -R 777 /app/backend/media

WORKDIR /app/backend

EXPOSE 8000

# CMD ["python", "main.py"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "16"]