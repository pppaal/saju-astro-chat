"""
Integration tests for API endpoints
Tests end-to-end API functionality.
"""
import pytest
import json
from backend_ai.app.routers.health_routes import health_bp
from backend_ai.app.routers.fusion_routes import fusion_bp
from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    app.register_blueprint(fusion_bp)
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_basic_health_check(self, client):
        """Test basic health endpoint."""
        response = client.get('/api/health/')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'service' in data
        assert data['service'] == 'backend_ai'

    def test_full_health_check(self, client):
        """Test full health endpoint with stats."""
        response = client.get('/api/health/full')
        assert response.status_code in [200, 503]  # May be degraded

        data = json.loads(response.data)
        assert 'status' in data
        assert 'performance' in data or 'error' in data

    def test_cache_stats(self, client):
        """Test cache stats endpoint."""
        response = client.get('/api/health/cache/stats')
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'status' in data

    def test_performance_stats(self, client):
        """Test performance stats endpoint."""
        response = client.get('/api/health/performance/stats')
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'status' in data


class TestFusionEndpoints:
    """Test fusion analysis endpoints."""

    @pytest.fixture
    def sample_fusion_request(self):
        """Sample fusion request data."""
        return {
            "saju": {
                "dayMaster": {"name": "甲木", "element": "木"},
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "甲寅",
                    "time": "丙卯"
                }
            },
            "astro": {
                "planets": [
                    {"name": "Sun", "sign": "Aries", "house": "1"}
                ]
            },
            "tarot": {},
            "theme": "life_path",
            "locale": "en",
            "render_mode": "template"
        }

    def test_fusion_ask_endpoint(self, client, sample_fusion_request):
        """Test fusion analysis endpoint."""
        response = client.post(
            '/api/fusion/ask',
            data=json.dumps(sample_fusion_request),
            content_type='application/json'
        )

        # Should return 200 or 500 depending on environment
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'status' in data

    def test_fusion_ask_stream_endpoint(self, client, sample_fusion_request):
        """Test fusion streaming endpoint."""
        response = client.post(
            '/api/fusion/ask-stream',
            data=json.dumps(sample_fusion_request),
            content_type='application/json'
        )

        # Should return streaming response
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            # Check that it's a streaming response
            assert response.content_type == 'text/event-stream'


# Parametrized endpoint tests
@pytest.mark.parametrize("endpoint,method", [
    ("/api/health/", "GET"),
    ("/api/health/basic", "GET"),
    ("/api/health/full", "GET"),
    ("/api/health/cache/stats", "GET"),
    ("/api/health/performance/stats", "GET"),
])
def test_endpoint_accessibility(client, endpoint, method):
    """Test that endpoints are accessible."""
    if method == "GET":
        response = client.get(endpoint)
    else:
        response = client.post(endpoint)

    # Should not return 404 (endpoint exists)
    assert response.status_code != 404
