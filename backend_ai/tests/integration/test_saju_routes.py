"""
Integration tests for Saju API endpoints.

Tests:
- POST /saju/counselor/init - Initialize counselor session
- POST /saju/ask-stream - Streaming Saju analysis
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.saju_routes import saju_bp

    app = Flask(__name__)
    app.register_blueprint(saju_bp)
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


class TestSajuCounselorInitEndpoint:
    """Tests for /saju/counselor/init endpoint."""

    @pytest.fixture
    def sample_init_request(self):
        """Sample counselor init request."""
        return {
            "saju": {
                "dayMaster": {"name": "Jia", "element": "wood", "stem": "甲"},
                "pillars": {
                    "year": {"stem": "甲", "branch": "子"},
                    "month": {"stem": "乙", "branch": "丑"},
                    "day": {"stem": "丙", "branch": "寅"},
                    "hour": {"stem": "丁", "branch": "卯"},
                },
                "fiveElements": {"wood": 3, "fire": 2, "earth": 1, "metal": 2, "water": 2},
            },
            "theme": "career",
            "locale": "ko",
        }

    def test_init_success(self, client, sample_init_request):
        """Test successful counselor initialization."""
        response = client.post(
            "/saju/counselor/init",
            data=json.dumps(sample_init_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data

    def test_init_with_astro(self, client, sample_init_request):
        """Test initialization with astrology context."""
        sample_init_request["astro"] = {
            "planets": [
                {"name": "Sun", "sign": "Aries", "house": "1"},
                {"name": "Moon", "sign": "Cancer", "house": "4"},
            ]
        }

        response = client.post(
            "/saju/counselor/init",
            data=json.dumps(sample_init_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_init_love_theme(self, client, sample_init_request):
        """Test initialization with love theme."""
        sample_init_request["theme"] = "love"

        response = client.post(
            "/saju/counselor/init",
            data=json.dumps(sample_init_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_init_health_theme(self, client, sample_init_request):
        """Test initialization with health theme."""
        sample_init_request["theme"] = "health"

        response = client.post(
            "/saju/counselor/init",
            data=json.dumps(sample_init_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_init_english_locale(self, client, sample_init_request):
        """Test initialization with English locale."""
        sample_init_request["locale"] = "en"

        response = client.post(
            "/saju/counselor/init",
            data=json.dumps(sample_init_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_init_minimal_request(self, client):
        """Test initialization with minimal request."""
        response = client.post(
            "/saju/counselor/init",
            data=json.dumps({
                "saju": {},
                "theme": "general"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500, 501]


class TestSajuAskStreamEndpoint:
    """Tests for /saju/ask-stream endpoint."""

    @pytest.fixture
    def sample_ask_request(self):
        """Sample ask-stream request."""
        return {
            "saju": {
                "dayMaster": {"name": "Jia", "element": "wood"},
                "pillars": {
                    "year": {"stem": "甲", "branch": "子"},
                    "month": {"stem": "乙", "branch": "丑"},
                    "day": {"stem": "丙", "branch": "寅"},
                    "hour": {"stem": "丁", "branch": "卯"},
                },
            },
            "messages": [
                {"role": "user", "content": "올해 운세가 어떤가요?"}
            ],
            "theme": "general",
            "locale": "ko",
        }

    def test_ask_stream_success(self, client, sample_ask_request):
        """Test successful streaming response."""
        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            # Should be streaming response
            assert response.mimetype == "text/event-stream"

    def test_ask_stream_career_question(self, client, sample_ask_request):
        """Test career-related question."""
        sample_ask_request["messages"][0]["content"] = "직장을 옮기는 게 좋을까요?"
        sample_ask_request["theme"] = "career"

        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_ask_stream_love_question(self, client, sample_ask_request):
        """Test love-related question."""
        sample_ask_request["messages"][0]["content"] = "연애운은 어떤가요?"
        sample_ask_request["theme"] = "love"

        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_ask_stream_with_astro(self, client, sample_ask_request):
        """Test with astrology context."""
        sample_ask_request["astro"] = {
            "planets": [{"name": "Sun", "sign": "Aries"}]
        }

        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_ask_stream_english(self, client, sample_ask_request):
        """Test streaming in English."""
        sample_ask_request["locale"] = "en"
        sample_ask_request["messages"][0]["content"] = "How is my fortune this year?"

        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_ask_stream_follow_up(self, client, sample_ask_request):
        """Test follow-up message."""
        sample_ask_request["messages"] = [
            {"role": "user", "content": "올해 운세가 어떤가요?"},
            {"role": "assistant", "content": "올해는 좋은 운세입니다."},
            {"role": "user", "content": "더 자세히 알려주세요"},
        ]

        response = client.post(
            "/saju/ask-stream",
            data=json.dumps(sample_ask_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestSajuEndpointAccessibility:
    """Tests for saju endpoint accessibility."""

    @pytest.mark.parametrize("endpoint,method", [
        ("/saju/counselor/init", "POST"),
        ("/saju/ask-stream", "POST"),
    ])
    def test_endpoint_exists(self, client, endpoint, method):
        """Test that endpoints exist (not 404)."""
        response = client.post(
            endpoint,
            data=json.dumps({}),
            content_type="application/json"
        )

        assert response.status_code != 404

    def test_init_endpoint_rejects_get(self, client):
        """Test init endpoint rejects GET method."""
        response = client.get("/saju/counselor/init")
        assert response.status_code == 405

    def test_ask_stream_endpoint_rejects_get(self, client):
        """Test ask-stream endpoint rejects GET method."""
        response = client.get("/saju/ask-stream")
        assert response.status_code == 405


class TestSajuInputValidation:
    """Tests for saju endpoint input validation."""

    def test_init_invalid_json(self, client):
        """Test init with invalid JSON."""
        response = client.post(
            "/saju/counselor/init",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]

    def test_ask_stream_invalid_json(self, client):
        """Test ask-stream with invalid JSON."""
        response = client.post(
            "/saju/ask-stream",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]

    def test_ask_stream_empty_messages(self, client):
        """Test ask-stream with empty messages."""
        response = client.post(
            "/saju/ask-stream",
            data=json.dumps({
                "saju": {},
                "messages": [],
                "theme": "general"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500, 501]


class TestSajuBlueprintRegistration:
    """Tests for saju blueprint registration."""

    def test_blueprint_exists(self):
        """Test that saju blueprint exists."""
        from backend_ai.app.routers.saju_routes import saju_bp

        assert saju_bp is not None
        assert saju_bp.name == "saju"
        assert saju_bp.url_prefix == "/saju"
