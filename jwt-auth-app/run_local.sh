#!/usr/bin/env bash
# run_local.sh — One-command local setup & test runner
# Usage: bash run_local.sh [--test] [--port 8000]

set -e

PORT=8000
RUN_TESTS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --test)   RUN_TESTS=true; shift ;;
    --port)   PORT=$2; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo ""
echo "╔══════════════════════════════════╗"
echo "║     JWT Auth App — Local Setup   ║"
echo "╚══════════════════════════════════╝"
echo ""

# ── Check Python ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  python3 not found. Install Python 3.9+"; exit 1
fi
PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅  Python $PY_VERSION found"

# ── Install Python deps ───────────────────────────────────────────────────────
echo "📦  Installing Python dependencies..."
pip install -r backend/requirements.txt -q
echo "✅  Python deps installed"

# ── Start server ──────────────────────────────────────────────────────────────
echo ""
echo "🚀  Starting FastAPI server on port $PORT..."
cd backend
uvicorn main:app --host 0.0.0.0 --port "$PORT" --log-level warning &
SERVER_PID=$!
cd ..

# Wait for server
for i in $(seq 1 15); do
  if curl -sf "http://localhost:$PORT/health" &>/dev/null; then
    echo "✅  Server ready at http://localhost:$PORT"
    break
  fi
  sleep 1
  if [ $i -eq 15 ]; then
    echo "❌  Server failed to start. Check logs."; kill $SERVER_PID 2>/dev/null; exit 1
  fi
done

echo ""
echo "📄  Pages:"
echo "     Login:    http://localhost:$PORT/"
echo "     Register: http://localhost:$PORT/register-page"
echo "     API docs: http://localhost:$PORT/docs"
echo ""

# ── Optionally run tests ──────────────────────────────────────────────────────
if [ "$RUN_TESTS" = true ]; then
  if ! command -v node &>/dev/null; then
    echo "❌  node not found. Install Node.js 18+"; kill $SERVER_PID 2>/dev/null; exit 1
  fi
  echo "📦  Installing Node dependencies..."
  npm install -q
  echo "📦  Installing Playwright browsers..."
  npx playwright install chromium --with-deps
  echo ""
  echo "🧪  Running Playwright E2E tests..."
  BASE_URL="http://localhost:$PORT" npx playwright test
  TEST_EXIT=$?
  kill $SERVER_PID 2>/dev/null
  if [ $TEST_EXIT -eq 0 ]; then
    echo ""
    echo "✅  All tests passed!"
  else
    echo ""
    echo "❌  Some tests failed. Run 'npm run test:report' to view details."
    exit $TEST_EXIT
  fi
else
  echo "Press Ctrl+C to stop the server."
  wait $SERVER_PID
fi
