.PHONY: install dev dev-backend dev-frontend test lint build clean

install:
	cd backend && uv sync
	cd frontend && npm install

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Start backend on :8000 and frontend on :3000"
	@trap 'kill 0' EXIT; \
		$(MAKE) dev-backend & \
		$(MAKE) dev-frontend & \
		wait

test-backend:
	cd backend && uv run pytest -v

test-frontend:
	cd frontend && npx vitest --run

test: test-backend

lint:
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .

build:
	cd frontend && npm run build

clean:
	rm -rf frontend/dist
	rm -rf backend/.mypy_cache backend/.ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
