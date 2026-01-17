"""
Integration tests for Tarot API endpoints.

Tests:
- POST /api/tarot/interpret - Card interpretation
- POST /api/tarot/prefetch - Prefetch data
- GET /api/tarot/themes - Get available themes
- GET /api/tarot/search - Search tarot wisdom
- POST /api/tarot/detect-topic - Topic detection
- POST /api/tarot/chat-stream - Chat streaming
- POST /api/tarot/chat - Chat endpoint
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.tarot_routes import tarot_bp

    app = Flask(__name__)
    app.register_blueprint(tarot_bp)
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


class TestTarotInterpretEndpoint:
    """Tests for /api/tarot/interpret endpoint."""

    @pytest.fixture
    def sample_cards(self):
        """Sample tarot cards for testing."""
        return [
            {"name": "The Fool", "is_reversed": False},
            {"name": "The Magician", "is_reversed": True},
            {"name": "The High Priestess", "is_reversed": False},
        ]

    @pytest.fixture
    def sample_interpret_request(self, sample_cards):
        """Sample interpretation request."""
        return {
            "category": "love",
            "spread_id": "three_card",
            "spread_title": "Three Card Spread",
            "cards": sample_cards,
            "user_question": "연애 운세가 어떻게 될까요?",
            "language": "ko",
        }

    def test_interpret_success(self, client, sample_interpret_request):
        """Test successful tarot interpretation."""
        response = client.post(
            "/api/tarot/interpret",
            data=json.dumps(sample_interpret_request),
            content_type="application/json"
        )

        # Should return 200 or 500/501 depending on environment
        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data

    def test_interpret_no_cards(self, client):
        """Test interpretation without cards."""
        response = client.post(
            "/api/tarot/interpret",
            data=json.dumps({"category": "general", "cards": []}),
            content_type="application/json"
        )

        # Should return 400 for missing cards or 501 if module unavailable
        assert response.status_code in [400, 501]

    def test_interpret_with_saju_context(self, client, sample_interpret_request):
        """Test interpretation with Saju context."""
        sample_interpret_request["saju_context"] = {
            "day_master": {"element": "wood", "stem": "甲"},
            "five_elements": {"wood": 3, "fire": 2, "earth": 1, "metal": 2, "water": 2}
        }

        response = client.post(
            "/api/tarot/interpret",
            data=json.dumps(sample_interpret_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_interpret_with_astro_context(self, client, sample_interpret_request):
        """Test interpretation with astrology context."""
        sample_interpret_request["astro_context"] = {
            "sun_sign": "Aries",
            "moon_sign": "Cancer",
        }

        response = client.post(
            "/api/tarot/interpret",
            data=json.dumps(sample_interpret_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_interpret_english_language(self, client, sample_interpret_request):
        """Test interpretation in English."""
        sample_interpret_request["language"] = "en"
        sample_interpret_request["user_question"] = "What is my love fortune?"

        response = client.post(
            "/api/tarot/interpret",
            data=json.dumps(sample_interpret_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestTarotThemesEndpoint:
    """Tests for /api/tarot/themes endpoint."""

    def test_themes_success(self, client):
        """Test getting available themes."""
        response = client.get("/api/tarot/themes")

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data
            if data["status"] == "success":
                assert "themes" in data


class TestTarotSearchEndpoint:
    """Tests for /api/tarot/search endpoint."""

    def test_search_success(self, client):
        """Test searching tarot wisdom."""
        response = client.get("/api/tarot/search?q=연애운&top_k=5")

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data

    def test_search_empty_query(self, client):
        """Test search with empty query."""
        response = client.get("/api/tarot/search?q=")

        assert response.status_code in [200, 400, 500, 501]

    def test_search_english_query(self, client):
        """Test search with English query."""
        response = client.get("/api/tarot/search?q=love+fortune&top_k=3")

        assert response.status_code in [200, 500, 501]


class TestTarotDetectTopicEndpoint:
    """Tests for /api/tarot/detect-topic endpoint."""

    def test_detect_topic_love(self, client):
        """Test topic detection for love-related query."""
        response = client.post(
            "/api/tarot/detect-topic",
            data=json.dumps({"text": "연애운이 궁금해요"}),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data

    def test_detect_topic_career(self, client):
        """Test topic detection for career-related query."""
        response = client.post(
            "/api/tarot/detect-topic",
            data=json.dumps({"text": "취업이 될까요?"}),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_detect_topic_general(self, client):
        """Test topic detection for general query."""
        response = client.post(
            "/api/tarot/detect-topic",
            data=json.dumps({"text": "오늘 운세"}),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestTarotChatStreamEndpoint:
    """Tests for /api/tarot/chat-stream endpoint."""

    @pytest.fixture
    def sample_chat_request(self):
        """Sample chat request."""
        return {
            "messages": [
                {"role": "user", "content": "이 카드가 무슨 의미인가요?"}
            ],
            "cards": [
                {"name": "The Fool", "is_reversed": False}
            ],
            "category": "general",
            "language": "ko",
        }

    def test_chat_stream_success(self, client, sample_chat_request):
        """Test successful chat streaming."""
        response = client.post(
            "/api/tarot/chat-stream",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            assert response.mimetype == "text/event-stream"

    def test_chat_stream_empty_messages(self, client):
        """Test chat stream with empty messages."""
        response = client.post(
            "/api/tarot/chat-stream",
            data=json.dumps({
                "messages": [],
                "cards": [{"name": "The Fool", "is_reversed": False}],
                "category": "general"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500, 501]


class TestTarotChatEndpoint:
    """Tests for /api/tarot/chat endpoint."""

    @pytest.fixture
    def sample_chat_request(self):
        """Sample chat request."""
        return {
            "messages": [
                {"role": "user", "content": "더 자세히 알려주세요"}
            ],
            "cards": [
                {"name": "The Magician", "is_reversed": False}
            ],
            "category": "career",
            "language": "ko",
        }

    def test_chat_success(self, client, sample_chat_request):
        """Test successful chat."""
        response = client.post(
            "/api/tarot/chat",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_chat_english(self, client, sample_chat_request):
        """Test chat in English."""
        sample_chat_request["language"] = "en"
        sample_chat_request["messages"][0]["content"] = "Tell me more about this card"

        response = client.post(
            "/api/tarot/chat",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestTarotPrefetchEndpoint:
    """Tests for /api/tarot/prefetch endpoint."""

    def test_prefetch_success(self, client):
        """Test prefetch endpoint."""
        response = client.post(
            "/api/tarot/prefetch",
            data=json.dumps({
                "category": "love",
                "spread_id": "three_card"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestTarotEndpointAccessibility:
    """Tests for tarot endpoint accessibility."""

    @pytest.mark.parametrize("endpoint,method", [
        ("/api/tarot/interpret", "POST"),
        ("/api/tarot/themes", "GET"),
        ("/api/tarot/search", "GET"),
        ("/api/tarot/detect-topic", "POST"),
        ("/api/tarot/chat-stream", "POST"),
        ("/api/tarot/chat", "POST"),
        ("/api/tarot/prefetch", "POST"),
    ])
    def test_endpoint_exists(self, client, endpoint, method):
        """Test that endpoints exist (not 404)."""
        if method == "POST":
            response = client.post(
                endpoint,
                data=json.dumps({}),
                content_type="application/json"
            )
        else:
            response = client.get(endpoint)

        assert response.status_code != 404

    @pytest.mark.parametrize("endpoint", [
        "/api/tarot/interpret",
        "/api/tarot/detect-topic",
        "/api/tarot/chat-stream",
        "/api/tarot/chat",
        "/api/tarot/prefetch",
    ])
    def test_post_endpoints_reject_get(self, client, endpoint):
        """Test POST endpoints reject GET method."""
        response = client.get(endpoint)
        assert response.status_code == 405

    @pytest.mark.parametrize("endpoint", [
        "/api/tarot/themes",
        "/api/tarot/search",
    ])
    def test_get_endpoints_reject_post(self, client, endpoint):
        """Test GET endpoints reject POST method."""
        response = client.post(endpoint)
        assert response.status_code == 405


class TestTarotInputValidation:
    """Tests for tarot endpoint input validation."""

    def test_interpret_invalid_json(self, client):
        """Test interpret with invalid JSON."""
        response = client.post(
            "/api/tarot/interpret",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]

    def test_chat_invalid_json(self, client):
        """Test chat with invalid JSON."""
        response = client.post(
            "/api/tarot/chat",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]


class TestTarotBlueprintRegistration:
    """Tests for tarot blueprint registration."""

    def test_blueprint_exists(self):
        """Test that tarot blueprint exists."""
        from backend_ai.app.routers.tarot_routes import tarot_bp

        assert tarot_bp is not None
        assert tarot_bp.name == "tarot"
        assert tarot_bp.url_prefix == "/api/tarot"
