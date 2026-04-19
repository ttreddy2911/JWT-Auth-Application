.PHONY: install run test test-headed docker-build docker-run clean help

PORT ?= 8000

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Python / Backend ──────────────────────────────────────────────────────────
install-py: ## Install Python dependencies
	pip install -r backend/requirements.txt

run: ## Start the FastAPI server (default port 8000)
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port $(PORT)

run-prod: ## Start server without reload
	cd backend && uvicorn main:app --host 0.0.0.0 --port $(PORT)

# ── Node / Playwright ─────────────────────────────────────────────────────────
install-node: ## Install Node.js dependencies + Playwright browsers
	npm install
	npx playwright install chromium

install: install-py install-node ## Install all dependencies

test: ## Run Playwright E2E tests (server must be running)
	BASE_URL=http://localhost:$(PORT) npx playwright test

test-headed: ## Run tests with visible browser
	BASE_URL=http://localhost:$(PORT) npx playwright test --headed

test-report: ## Open last Playwright HTML report
	npx playwright show-report

# ── Full local E2E (starts server, runs tests, stops server) ──────────────────
test-full: ## Start server + run all tests + stop server
	@echo "Starting server on port $(PORT)..."
	@cd backend && uvicorn main:app --host 0.0.0.0 --port $(PORT) & echo $$! > /tmp/server.pid
	@sleep 4
	@echo "Running Playwright tests..."
	@BASE_URL=http://localhost:$(PORT) npx playwright test; \
	  EXIT=$$?; \
	  kill $$(cat /tmp/server.pid) 2>/dev/null; \
	  rm -f /tmp/server.pid; \
	  exit $$EXIT

# ── Docker ────────────────────────────────────────────────────────────────────
docker-build: ## Build Docker image
	docker build -t jwt-auth-app .

docker-run: ## Run the Docker image
	docker run --rm -p $(PORT):8000 \
	  -e SECRET_KEY=local_dev_secret_change_me \
	  jwt-auth-app

docker-compose-up: ## Start with docker-compose
	docker compose up --build

docker-compose-down: ## Stop docker-compose
	docker compose down

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove DB, caches, test artifacts
	find . -name "*.db" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	rm -rf playwright-report test-results node_modules/.cache
