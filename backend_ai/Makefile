# Backend AI Development Makefile

.PHONY: help test test-unit test-integration test-coverage lint format clean install

help:
	@echo "Backend AI Development Commands"
	@echo "================================"
	@echo "make install          - Install dependencies"
	@echo "make test             - Run all tests"
	@echo "make test-unit        - Run unit tests only"
	@echo "make test-integration - Run integration tests only"
	@echo "make test-coverage    - Run tests with coverage report"
	@echo "make lint             - Run code linting"
	@echo "make format           - Format code with black"
	@echo "make clean            - Clean up cache and test files"

install:
	pip install -r requirements-dev.txt
	pip install -e .

test:
	pytest tests/ -v

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

test-coverage:
	pytest tests/ --cov=backend_ai --cov-report=html --cov-report=term
	@echo "Coverage report generated in htmlcov/index.html"

lint:
	flake8 app/ tests/ --max-line-length=100 --ignore=E203,W503
	mypy app/ --ignore-missing-imports

format:
	black app/ tests/
	isort app/ tests/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf htmlcov/ .coverage coverage.xml 2>/dev/null || true
	@echo "Cleanup complete"
