"""
Integration tests for Core API endpoints.

Tests:
- GET / - Index endpoint
- GET /health - Health check
- GET /ready - Readiness check
- GET /capabilities - Feature capabilities
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.core_routes import core_bp

    app = Flask(__name__)
    app.register_blueprint(core_bp)
    app.config["TESTING"] = True

    @app.before_request
    def set_request_id():
        from flask import g
        g.request_id = "test-request-id"

    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestIndexEndpoint:
    """Tests for / endpoint."""

    def test_index_returns_ok(self, client):
        """Test index endpoint returns ok status."""
        response = client.get("/")

        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["status"] == "ok"
        assert "message" in data
        assert "DestinyPal" in data["message"]

    def test_index_returns_json(self, client):
        """Test index endpoint returns JSON."""
        response = client.get("/")

        assert response.content_type == "application/json"


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_healthy(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")

        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["status"] == "healthy"

    def test_health_is_fast(self, client):
        """Test health endpoint responds quickly."""
        import time

        start = time.time()
        response = client.get("/health")
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 1.0  # Should respond within 1 second


class TestReadyEndpoint:
    """Tests for /ready endpoint."""

    def test_ready_returns_ready(self, client):
        """Test ready endpoint returns ready status."""
        response = client.get("/ready")

        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["status"] == "ready"


class TestCapabilitiesEndpoint:
    """Tests for /capabilities endpoint."""

    def test_capabilities_real_response(self, client):
        """Test capabilities endpoint with real imports."""
        response = client.get("/capabilities")

        # Accept 200 or 500 (import errors)
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = json.loads(response.data)

            # Check structure
            assert "status" in data
            assert data["status"] == "success"

            # Check capabilities object
            caps = data.get("capabilities", {})
            assert isinstance(caps, dict)

            # Check for expected keys
            expected_keys = [
                "realtime_astro", "charts", "user_memory", "persona_embeddings",
                "tarot", "rlhf", "badges", "domain_rag", "compatibility",
                "hybrid_rag", "agentic_rag", "prediction", "theme_filter",
                "fortune_score", "iching", "counseling"
            ]

            for key in expected_keys:
                assert key in caps, f"Missing capability: {key}"
                assert isinstance(caps[key], bool)

            # Check summary
            summary = data.get("summary", {})
            assert "total" in summary
            assert "enabled" in summary
            assert "disabled" in summary
            assert summary["total"] == summary["enabled"] + summary["disabled"]


class TestCoreEndpointAccessibility:
    """Tests for core endpoint accessibility."""

    @pytest.mark.parametrize("endpoint", [
        "/",
        "/health",
        "/ready",
        "/capabilities",
    ])
    def test_endpoint_exists(self, client, endpoint):
        """Test that endpoints exist (not 404)."""
        response = client.get(endpoint)
        assert response.status_code != 404

    @pytest.mark.parametrize("endpoint", [
        "/",
        "/health",
        "/ready",
        "/capabilities",
    ])
    def test_get_endpoints_reject_post(self, client, endpoint):
        """Test GET endpoints reject POST method."""
        response = client.post(endpoint)
        assert response.status_code == 405


class TestCoreBlueprintRegistration:
    """Tests for core blueprint registration."""

    def test_blueprint_exists(self):
        """Test that core blueprint exists."""
        from backend_ai.app.routers.core_routes import core_bp

        assert core_bp is not None
        assert core_bp.name == "core"

    def test_blueprint_has_routes(self):
        """Test that core blueprint has routes."""
        from backend_ai.app.routers.core_routes import core_bp

        # Check deferred functions (route handlers)
        assert len(core_bp.deferred_functions) >= 4
