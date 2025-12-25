# Backend AI Testing Guide

## Test Structure

```
backend_ai/tests/
├── unit/                    # Unit tests (fast, isolated)
│   ├── test_fusion_logic.py
│   ├── test_sanitizer.py
│   └── test_monitoring.py
└── integration/             # Integration tests (may require services)
    └── test_api_endpoints.py
```

## Running Tests

### Run all tests
```bash
cd backend_ai
pytest
```

### Run specific test categories
```bash
# Unit tests only (fast)
pytest -m unit

# Integration tests only
pytest -m integration

# Specific test file
pytest tests/unit/test_fusion_logic.py

# Specific test class
pytest tests/unit/test_fusion_logic.py::TestNaturalizeFacts

# Specific test function
pytest tests/unit/test_fusion_logic.py::TestNaturalizeFacts::test_saju_day_master
```

### Run with coverage
```bash
pytest --cov=backend_ai --cov-report=html
# Open htmlcov/index.html to view coverage report
```

### Run with verbose output
```bash
pytest -v -s
```

## Test Categories

### Unit Tests
- **test_fusion_logic.py**: Core fusion analysis logic
  - Data naturalization
  - Element traits
  - Ten Gods meanings
  - Aspect interpretations

- **test_sanitizer.py**: Input validation and security
  - User input sanitization
  - Dream text processing
  - Name validation
  - Birth data validation
  - Suspicious input detection

- **test_monitoring.py**: Logging and metrics
  - Structured logging
  - Metrics collection
  - Performance tracking
  - System health checks

### Integration Tests
- **test_api_endpoints.py**: End-to-end API tests
  - Health check endpoints
  - Fusion analysis endpoints
  - Streaming responses

## Writing New Tests

### Unit Test Template
```python
import pytest
from backend_ai.app.your_module import your_function

class TestYourFunction:
    """Test your_function behavior."""

    def test_normal_case(self):
        """Test with normal input."""
        result = your_function("input")
        assert result == "expected"

    def test_edge_case(self):
        """Test edge case."""
        result = your_function("")
        assert result is not None

    @pytest.mark.parametrize("input,expected", [
        ("a", "A"),
        ("b", "B"),
    ])
    def test_multiple_cases(self, input, expected):
        """Test multiple cases."""
        assert your_function(input) == expected
```

### Integration Test Template
```python
import pytest
from flask import Flask

@pytest.fixture
def client():
    """Create test client."""
    app = Flask(__name__)
    # Register blueprints
    return app.test_client()

def test_endpoint(client):
    """Test API endpoint."""
    response = client.get('/api/endpoint')
    assert response.status_code == 200
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Names**: Use descriptive test names (test_what_when_expected)
3. **AAA Pattern**: Arrange, Act, Assert
4. **Fixtures**: Use pytest fixtures for common setup
5. **Parametrize**: Use @pytest.mark.parametrize for multiple cases
6. **Markers**: Tag tests with appropriate markers (unit, integration, slow)

## Coverage Goals

- **Core Logic**: 80%+ coverage
- **Security Functions**: 95%+ coverage
- **API Endpoints**: 70%+ coverage
- **Overall**: 75%+ coverage

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run tests
  run: |
    cd backend_ai
    pip install pytest pytest-cov
    pytest --cov=backend_ai --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./backend_ai/coverage.xml
```

## Troubleshooting

### Tests fail with import errors
```bash
# Make sure you're in the right directory
cd backend_ai
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest
```

### Tests hang or timeout
```bash
# Run with timeout
pytest --timeout=30
```

### Flaky tests
```bash
# Run multiple times to identify flaky tests
pytest --count=5
```

## Next Steps

1. Add more test coverage for uncovered modules
2. Set up CI/CD pipeline with automated testing
3. Add performance benchmarks
4. Add security testing (SAST/DAST)
5. Add mutation testing for test quality
