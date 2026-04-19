# ── Stage 1: build / install deps ────────────────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM base AS runtime

EXPOSE 8000

ENV DATABASE_URL=sqlite:///./auth.db
ENV SECRET_KEY=change_me_in_production_please

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
