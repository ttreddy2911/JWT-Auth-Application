# JWT Auth App — Assignment 2

Full-stack JWT authentication system with FastAPI backend, HTML/CSS/JS frontend, Playwright E2E tests, and GitHub Actions CI/CD.

---

## 🏗️ Project Structure

```
jwt-auth-app/
├── backend/
│   ├── main.py              # FastAPI app — /register, /login, /health routes
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── login.html           # Login page with client-side validation
│   └── register.html        # Registration page with password strength meter
├── tests/
│   └── auth.spec.js         # Playwright E2E tests (positive + negative)
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions: test → Docker Hub deploy
├── Dockerfile               # Production Docker image
├── docker-compose.yml       # Local dev with Docker
├── playwright.config.js     # Playwright configuration
└── package.json             # Node deps for testing
```

---

## 🚀 Running the Application

### Option A — Local Python (Development)

```bash
# 1. Install Python dependencies
cd backend
pip install -r requirements.txt

# 2. Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 (login) or http://localhost:8000/register-page (register).

### Option B — Docker Compose (Recommended)

```bash
# Build and run
docker compose up --build

# Stop
docker compose down
```

App available at http://localhost:8000.

### Option C — Docker (Production Image)

```bash
docker pull tippireddy/jwt-auth-app:latest

docker run -d \
  -p 8000:8000 \
  -e SECRET_KEY=secure_123 \
  -e DATABASE_URL=sqlite:///./auth.db \
  tippireddy/jwt-auth-app:latest
```

---

## 🔐 API Endpoints

### `POST /register`
Register a new user.

**Request body:**
```json
{
  "email": "user@example.com",
  "username": "myusername",
  "password": "SecurePass123"
}
```

**Success (201):**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "username": "myusername"
}
```

**Errors:** `400` for duplicate email/username, `422` for validation failures.

---

### `POST /login`
Authenticate and receive a JWT.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Success (200):** same as `/register` response.  
**Error:** `401 Unauthorized` for invalid credentials.

---

### `GET /health`
Returns `{"status": "ok"}` — used by CI to verify server readiness.

---

## 🧪 Running E2E Tests

### Prerequisites
- Node.js 18+
- Running backend server on port 8000

```bash
# 1. Install dependencies & Playwright browsers
npm install
npx playwright install chromium

# 2. Start the backend (in another terminal)
cd backend && uvicorn main:app --port 8000

# 3. Run all tests
npm test

# Run with headed browser (watch the browser)
npm run test:headed

# Open HTML test report
npm run test:report
```

### Test Coverage

| Category | Test | Type |
|---|---|---|
| Registration | Valid data → success message | ✅ Positive |
| Registration | Valid data → JWT stored in localStorage | ✅ Positive |
| Registration | Short password (<8 chars) → field error | ❌ Negative |
| Registration | Invalid email format → field error | ❌ Negative |
| Registration | Mismatched passwords → field error | ❌ Negative |
| Registration | Duplicate email → server 400 error | ❌ Negative |
| Login | Correct credentials → success message | ✅ Positive |
| Login | Correct credentials → JWT stored | ✅ Positive |
| Login | Correct credentials → token UI preview | ✅ Positive |
| Login | Wrong password → server 401 error | ❌ Negative |
| Login | Empty email → field validation error | ❌ Negative |
| Login | Invalid email format → field error | ❌ Negative |
| Login | Unregistered email → server error | ❌ Negative |

---

## 🔄 CI/CD Pipeline

On every push to `main`/`master`:

1. **GitHub Actions** spins up the FastAPI server with SQLite
2. **Playwright tests** run against the live server
3. If all tests pass → **Docker image is built and pushed to Docker Hub**

### Setting up GitHub Secrets

In your GitHub repo → Settings → Secrets → Actions, add:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not password) |

---

## 🐳 Docker Hub Repository

**Image:** `https://hub.docker.com/r/tippireddy/jwt-auth-app`

Tags:
- `latest` — most recent successful build from `main`
- `sha-<commit>` — specific commit builds

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `supersecretkey_...` | JWT signing secret — **change in production!** |
| `DATABASE_URL` | `sqlite:///./auth.db` | SQLAlchemy connection string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT expiry duration |

---

## 📝 Reflection

### What I built
A complete authentication system covering the full stack: secure password hashing with bcrypt, JWT token generation/verification, Pydantic v2 schema validation, and a polished dark-themed frontend with real-time password strength feedback.

### Key challenges
1. **Playwright `beforeAll` for seeding test users** — registration tests that create users need to run before login tests that depend on those users. Using `test.beforeAll` with a browser context solved the sequencing issue.
2. **Unique test data** — E2E tests against a persistent database require unique emails per run (solved with `Date.now()` + random suffix).
3. **Docker layer caching** — Using `cache-from: type=gha` in the Actions workflow reduced build times significantly after the first run.
4. **FastAPI static file serving** — Mounting frontend as static files and serving HTML pages from the same origin eliminated CORS issues entirely.

### What I'd improve
- Switch from SQLite to PostgreSQL for production (the `DATABASE_URL` env var makes this a one-line change)
- Add refresh token rotation
- Add rate limiting on `/login` to prevent brute-force attacks
