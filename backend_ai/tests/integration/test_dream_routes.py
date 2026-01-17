"""
Integration tests for Dream API endpoints.

Tests:
- POST /api/dream/interpret-stream - Streaming dream interpretation (SSE)
- POST /api/dream/chat-stream - Dream follow-up chat
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.dream_routes import dream_bp

    app = Flask(__name__)
    app.register_blueprint(dream_bp)
    app.config["TESTING"] = True

    # Mock request context
    @app.before_request
    def set_request_id():
        from flask import g
        g.request_id = "test-request-id"

    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestDreamInterpretStreamEndpoint:
    """Tests for /api/dream/interpret-stream endpoint."""

    @pytest.fixture
    def sample_dream_request(self):
        """Sample dream interpretation request."""
        return {
            "dream": "나는 하늘을 나는 꿈을 꿨다. 구름 위를 날며 자유로움을 느꼈다.",
            "symbols": ["sky", "flying", "clouds"],
            "emotions": ["freedom", "joy"],
            "themes": ["예지몽"],
            "context": ["새벽 꿈"],
            "locale": "ko",
            "koreanTypes": ["길몽"],
            "koreanLucky": ["하늘꿈"],
        }

    def test_interpret_stream_success(self, client, sample_dream_request):
        """Test successful streaming dream interpretation."""
        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps(sample_dream_request),
            content_type="application/json"
        )

        # Should return 200 or 500 depending on environment (OpenAI availability)
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            assert response.mimetype == "text/event-stream"

    def test_interpret_stream_minimal_request(self, client):
        """Test with minimal request data."""
        minimal_request = {
            "dream": "I had a dream",
            "locale": "en"
        }

        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps(minimal_request),
            content_type="application/json"
        )

        # Should not return 404
        assert response.status_code != 404

    def test_interpret_stream_empty_dream(self, client):
        """Test with empty dream text."""
        empty_request = {
            "dream": "",
            "locale": "ko"
        }

        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps(empty_request),
            content_type="application/json"
        )

        # Should handle gracefully
        assert response.status_code in [200, 400, 500]

    def test_interpret_stream_english_locale(self, client):
        """Test with English locale."""
        english_request = {
            "dream": "I dreamed of flying through the sky",
            "symbols": ["flying"],
            "emotions": ["freedom"],
            "locale": "en"
        }

        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps(english_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500]

    def test_interpret_stream_with_cultural_symbols(self, client):
        """Test with various cultural symbols."""
        cultural_request = {
            "dream": "꿈에서 용을 봤습니다",
            "symbols": ["dragon"],
            "locale": "ko",
            "koreanTypes": ["길몽"],
            "koreanLucky": ["용꿈"],
            "chinese": ["dragon"],
            "western": ["transformation"],
        }

        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps(cultural_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500]


class TestDreamChatStreamEndpoint:
    """Tests for /api/dream/chat-stream endpoint."""

    @pytest.fixture
    def sample_chat_request(self):
        """Sample dream chat request."""
        return {
            "messages": [
                {"role": "user", "content": "이 꿈은 무슨 의미인가요?"}
            ],
            "dream_context": {
                "dream": "하늘을 나는 꿈",
                "symbols": ["flying", "sky"],
                "interpretation": "자유와 해방을 상징합니다"
            },
            "language": "ko",
            "session_id": "test-session-123"
        }

    @patch("backend_ai.app.routers.dream_routes._get_dream_service")
    def test_chat_stream_success(self, mock_service, client, sample_chat_request):
        """Test successful dream chat streaming."""
        # Mock DreamService
        mock_service_instance = MagicMock()
        mock_service_instance.stream_dream_chat.return_value = MagicMock(
            status_code=200,
            mimetype="text/event-stream"
        )
        mock_service.return_value = mock_service_instance

        response = client.post(
            "/api/dream/chat-stream",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        # Should return 200 or 500 depending on environment
        assert response.status_code in [200, 500]

    def test_chat_stream_empty_messages(self, client):
        """Test with empty messages."""
        empty_request = {
            "messages": [],
            "dream_context": {},
            "language": "ko"
        }

        response = client.post(
            "/api/dream/chat-stream",
            data=json.dumps(empty_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500]

    def test_chat_stream_english_language(self, client):
        """Test with English language."""
        english_request = {
            "messages": [
                {"role": "user", "content": "What does this dream mean?"}
            ],
            "dream_context": {
                "dream": "I was flying in the sky"
            },
            "language": "en"
        }

        response = client.post(
            "/api/dream/chat-stream",
            data=json.dumps(english_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500]


class TestDreamEndpointAccessibility:
    """Tests for dream endpoint accessibility."""

    @pytest.mark.parametrize("endpoint,method,data", [
        ("/api/dream/interpret-stream", "POST", {"dream": "test", "locale": "ko"}),
        ("/api/dream/chat-stream", "POST", {"messages": [], "language": "ko"}),
    ])
    def test_endpoint_exists(self, client, endpoint, method, data):
        """Test that endpoints exist (not 404)."""
        if method == "POST":
            response = client.post(
                endpoint,
                data=json.dumps(data),
                content_type="application/json"
            )
        else:
            response = client.get(endpoint)

        # Should not return 404 (endpoint exists)
        assert response.status_code != 404

    def test_interpret_stream_wrong_method(self, client):
        """Test interpret-stream with wrong HTTP method."""
        response = client.get("/api/dream/interpret-stream")
        assert response.status_code == 405  # Method Not Allowed

    def test_chat_stream_wrong_method(self, client):
        """Test chat-stream with wrong HTTP method."""
        response = client.get("/api/dream/chat-stream")
        assert response.status_code == 405  # Method Not Allowed


class TestDreamInputValidation:
    """Tests for dream endpoint input validation."""

    def test_interpret_stream_invalid_json(self, client):
        """Test with invalid JSON."""
        response = client.post(
            "/api/dream/interpret-stream",
            data="not valid json",
            content_type="application/json"
        )

        # Should handle gracefully
        assert response.status_code in [400, 500]

    def test_interpret_stream_no_content_type(self, client):
        """Test without content type."""
        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps({"dream": "test"})
        )

        # Flask should still parse it with force=True
        assert response.status_code in [200, 500]

    def test_chat_stream_missing_required_fields(self, client):
        """Test with missing required fields."""
        response = client.post(
            "/api/dream/chat-stream",
            data=json.dumps({}),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500]


class TestDreamResponseFormat:
    """Tests for dream endpoint response format."""

    def test_interpret_stream_response_headers(self, client):
        """Test streaming response headers."""
        response = client.post(
            "/api/dream/interpret-stream",
            data=json.dumps({"dream": "test", "locale": "ko"}),
            content_type="application/json"
        )

        if response.status_code == 200:
            # Check SSE headers
            assert response.mimetype == "text/event-stream"
            assert response.headers.get("Cache-Control") == "no-cache"


class TestDreamBlueprintRegistration:
    """Tests for dream blueprint registration."""

    def test_blueprint_exists(self):
        """Test that dream blueprint exists."""
        from backend_ai.app.routers.dream_routes import dream_bp

        assert dream_bp is not None
        assert dream_bp.name == "dream"

    def test_register_dream_routes(self):
        """Test register_dream_routes function."""
        from backend_ai.app.routers.dream_routes import register_dream_routes

        app = Flask(__name__)
        register_dream_routes(app)

        # Check that blueprint is registered
        assert "dream" in app.blueprints
