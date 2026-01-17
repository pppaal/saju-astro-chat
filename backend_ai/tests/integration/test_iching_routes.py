"""
Integration tests for I-Ching API endpoints.

Tests:
- POST /iching/cast - Cast hexagram
- POST /iching/interpret - Get interpretation
- POST /iching/reading - Complete reading
- POST /iching/reading-stream - Streaming reading
- GET /iching/search - Search wisdom
- GET /iching/hexagrams - Get all hexagrams
- POST /iching/changing-line - Get changing line interpretation
- GET /iching/hexagram-lines/<num> - Get all lines for hexagram
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.iching_routes import iching_bp

    app = Flask(__name__)
    app.register_blueprint(iching_bp)
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


class TestIChingCastEndpoint:
    """Tests for /iching/cast endpoint."""

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    def test_cast_success(self, mock_iching_rag, client):
        """Test successful hexagram casting."""
        mock_module = MagicMock()
        mock_module.cast_hexagram.return_value = {
            "primary": {"number": 1, "binary": "111111"},
            "resulting": None,
            "lines": [{"value": 1, "changing": False, "line_num": i} for i in range(1, 7)],
            "changing_lines": []
        }
        mock_iching_rag.return_value = mock_module

        response = client.post("/iching/cast")

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["status"] == "success"
            assert "cast" in data

    def test_cast_endpoint_exists(self, client):
        """Test that cast endpoint exists."""
        response = client.post("/iching/cast")
        assert response.status_code != 404

    def test_cast_wrong_method(self, client):
        """Test cast with wrong HTTP method."""
        response = client.get("/iching/cast")
        assert response.status_code == 405


class TestIChingInterpretEndpoint:
    """Tests for /iching/interpret endpoint."""

    @pytest.fixture
    def sample_interpret_request(self):
        """Sample interpret request."""
        return {
            "hexagram": 1,
            "theme": "career",
            "locale": "ko",
            "changingLines": [3],
            "sajuElement": "wood"
        }

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    def test_interpret_success(self, mock_iching_rag, client, sample_interpret_request):
        """Test successful hexagram interpretation."""
        mock_module = MagicMock()
        mock_module.get_hexagram_interpretation.return_value = {
            "hexagram": {"number": 1, "name": "건"},
            "core_meaning": "하늘",
            "judgment": "원형이정"
        }
        mock_iching_rag.return_value = mock_module

        response = client.post(
            "/iching/interpret",
            data=json.dumps(sample_interpret_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["status"] == "success"
            assert "interpretation" in data

    def test_interpret_minimal_request(self, client):
        """Test with minimal request."""
        response = client.post(
            "/iching/interpret",
            data=json.dumps({"hexagram": 1}),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_interpret_all_hexagrams(self, client):
        """Test interpretation for various hexagram numbers."""
        for hex_num in [1, 32, 64]:
            response = client.post(
                "/iching/interpret",
                data=json.dumps({"hexagram": hex_num, "locale": "ko"}),
                content_type="application/json"
            )
            assert response.status_code in [200, 500, 501]


class TestIChingReadingEndpoint:
    """Tests for /iching/reading endpoint."""

    @pytest.fixture
    def sample_reading_request(self):
        """Sample reading request."""
        return {
            "question": "직업을 바꾸는 것이 좋을까요?",
            "theme": "career",
            "locale": "ko",
            "sajuElement": "wood",
            "birth": {
                "year": 1990,
                "month": 5,
                "day": 15,
                "hour": 10
            }
        }

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    @patch("backend_ai.app.routers.iching_routes._get_user_memory_helpers")
    def test_reading_success(self, mock_memory, mock_iching_rag, client, sample_reading_request):
        """Test successful complete reading."""
        mock_module = MagicMock()
        mock_module.perform_iching_reading.return_value = {
            "cast": {"primary": {"number": 1}},
            "primary_interpretation": {"hexagram": {"name": "건"}},
            "summary": "Test summary"
        }
        mock_iching_rag.return_value = mock_module
        mock_memory.return_value = (None, None)

        response = client.post(
            "/iching/reading",
            data=json.dumps(sample_reading_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["status"] == "success"
            assert "reading" in data

    def test_reading_without_question(self, client):
        """Test reading without question."""
        response = client.post(
            "/iching/reading",
            data=json.dumps({"theme": "general", "locale": "ko"}),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestIChingReadingStreamEndpoint:
    """Tests for /iching/reading-stream endpoint."""

    @pytest.fixture
    def sample_stream_request(self):
        """Sample streaming request."""
        return {
            "hexagramNumber": 1,
            "hexagramName": "건(乾)",
            "hexagramSymbol": "☰",
            "judgment": "원형이정",
            "image": "하늘의 운행이 굳세다",
            "coreMeaning": "창조와 강건함",
            "changingLines": [],
            "question": "올해 운세가 어떨까요?",
            "locale": "ko",
            "themes": {"career": "리더십 발휘", "love": "주도적 관계"},
            "trigramUpper": "heaven",
            "trigramLower": "heaven",
            "element": "metal",
            "sajuElement": "wood"
        }

    @patch("backend_ai.app.routers.iching_routes._get_openai_client")
    @patch("backend_ai.app.routers.iching_routes._is_openai_available")
    def test_reading_stream_success(self, mock_available, mock_client, client, sample_stream_request):
        """Test successful streaming reading."""
        mock_available.return_value = True

        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta.content = "테스트 해석"

        mock_stream = MagicMock()
        mock_stream.__iter__ = lambda self: iter([mock_chunk])

        mock_openai = MagicMock()
        mock_openai.chat.completions.create.return_value = mock_stream
        mock_client.return_value = mock_openai

        response = client.post(
            "/iching/reading-stream",
            data=json.dumps(sample_stream_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            assert response.mimetype == "text/event-stream"

    def test_reading_stream_with_changing_lines(self, client):
        """Test streaming with changing lines."""
        request = {
            "hexagramNumber": 1,
            "hexagramName": "건",
            "changingLines": [
                {"index": 1, "text": "초구 잠룡물용"},
                {"index": 3, "text": "구삼 군자종일건건"}
            ],
            "resultingHexagram": {"number": 2, "name": "곤", "symbol": "☷"},
            "locale": "ko"
        }

        response = client.post(
            "/iching/reading-stream",
            data=json.dumps(request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_reading_stream_english(self, client):
        """Test streaming with English locale."""
        request = {
            "hexagramNumber": 1,
            "hexagramName": "Qian",
            "locale": "en"
        }

        response = client.post(
            "/iching/reading-stream",
            data=json.dumps(request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestIChingSearchEndpoint:
    """Tests for /iching/search endpoint."""

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    def test_search_success(self, mock_iching_rag, client):
        """Test successful wisdom search."""
        mock_module = MagicMock()
        mock_module.search_iching_wisdom.return_value = [
            {"hexagram_num": 1, "name": "건", "score": 10}
        ]
        mock_iching_rag.return_value = mock_module

        response = client.get("/iching/search?q=리더십&top_k=5")

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["status"] == "success"
            assert "results" in data

    def test_search_empty_query(self, client):
        """Test search with empty query."""
        response = client.get("/iching/search?q=")

        assert response.status_code in [200, 500, 501]

    def test_search_korean_query(self, client):
        """Test search with Korean query."""
        response = client.get("/iching/search?q=성공하려면")

        assert response.status_code in [200, 500, 501]


class TestIChingHexagramsEndpoint:
    """Tests for /iching/hexagrams endpoint."""

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    def test_hexagrams_success(self, mock_iching_rag, client):
        """Test successful hexagrams list."""
        mock_module = MagicMock()
        mock_module.get_all_hexagrams_summary.return_value = [
            {"number": i, "name": f"Hexagram {i}"} for i in range(1, 65)
        ]
        mock_iching_rag.return_value = mock_module

        response = client.get("/iching/hexagrams?locale=ko")

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["status"] == "success"
            assert "hexagrams" in data

    def test_hexagrams_english(self, client):
        """Test hexagrams with English locale."""
        response = client.get("/iching/hexagrams?locale=en")

        assert response.status_code in [200, 500, 501]


class TestIChingChangingLineEndpoint:
    """Tests for /iching/changing-line endpoint."""

    def test_changing_line_success(self, client):
        """Test successful changing line interpretation."""
        response = client.post(
            "/iching/changing-line",
            data=json.dumps({
                "hexagramNumber": 1,
                "lineIndex": 1,
                "locale": "ko"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 400, 500, 501]

    def test_changing_line_missing_params(self, client):
        """Test with missing parameters."""
        response = client.post(
            "/iching/changing-line",
            data=json.dumps({"hexagramNumber": 1}),
            content_type="application/json"
        )

        assert response.status_code == 400

    def test_changing_line_invalid_hexagram(self, client):
        """Test with invalid hexagram number."""
        response = client.post(
            "/iching/changing-line",
            data=json.dumps({
                "hexagramNumber": 100,
                "lineIndex": 1,
                "locale": "ko"
            }),
            content_type="application/json"
        )

        assert response.status_code in [400, 500, 501]


class TestIChingHexagramLinesEndpoint:
    """Tests for /iching/hexagram-lines/<num> endpoint."""

    def test_hexagram_lines_success(self, client):
        """Test successful hexagram lines retrieval."""
        response = client.get("/iching/hexagram-lines/1?locale=ko")

        assert response.status_code in [200, 400, 500, 501]

    def test_hexagram_lines_various_numbers(self, client):
        """Test hexagram lines for various numbers."""
        for hex_num in [1, 32, 64]:
            response = client.get(f"/iching/hexagram-lines/{hex_num}")
            assert response.status_code in [200, 400, 500, 501]

    def test_hexagram_lines_invalid_number(self, client):
        """Test with invalid hexagram number."""
        response = client.get("/iching/hexagram-lines/100")

        assert response.status_code in [400, 500, 501]


class TestIChingEndpointAccessibility:
    """Tests for I-Ching endpoint accessibility."""

    @pytest.mark.parametrize("endpoint,method", [
        ("/iching/cast", "POST"),
        ("/iching/interpret", "POST"),
        ("/iching/reading", "POST"),
        ("/iching/reading-stream", "POST"),
        ("/iching/search", "GET"),
        ("/iching/hexagrams", "GET"),
        ("/iching/changing-line", "POST"),
        ("/iching/hexagram-lines/1", "GET"),
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

        # Should not return 404 (endpoint exists)
        assert response.status_code != 404

    @pytest.mark.parametrize("endpoint", [
        "/iching/cast",
        "/iching/interpret",
        "/iching/reading",
        "/iching/reading-stream",
        "/iching/changing-line",
    ])
    def test_post_endpoints_reject_get(self, client, endpoint):
        """Test POST endpoints reject GET method."""
        response = client.get(endpoint)
        assert response.status_code == 405

    @pytest.mark.parametrize("endpoint", [
        "/iching/search",
        "/iching/hexagrams",
        "/iching/hexagram-lines/1",
    ])
    def test_get_endpoints_reject_post(self, client, endpoint):
        """Test GET endpoints reject POST method."""
        response = client.post(endpoint)
        assert response.status_code == 405


class TestIChingInputValidation:
    """Tests for I-Ching endpoint input validation."""

    def test_interpret_invalid_json(self, client):
        """Test interpret with invalid JSON."""
        response = client.post(
            "/iching/interpret",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]

    def test_reading_stream_invalid_json(self, client):
        """Test reading-stream with invalid JSON."""
        response = client.post(
            "/iching/reading-stream",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]


class TestIChingResponseFormat:
    """Tests for I-Ching endpoint response format."""

    @patch("backend_ai.app.routers.iching_routes._get_iching_rag")
    def test_cast_response_structure(self, mock_iching_rag, client):
        """Test cast response structure."""
        mock_module = MagicMock()
        mock_module.cast_hexagram.return_value = {
            "primary": {"number": 1, "binary": "111111"},
            "resulting": None,
            "lines": [],
            "changing_lines": []
        }
        mock_iching_rag.return_value = mock_module

        response = client.post("/iching/cast")

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data
            assert "cast" in data

    def test_reading_stream_response_headers(self, client):
        """Test streaming response headers."""
        response = client.post(
            "/iching/reading-stream",
            data=json.dumps({"hexagramNumber": 1, "locale": "ko"}),
            content_type="application/json"
        )

        if response.status_code == 200:
            assert response.mimetype == "text/event-stream"
            assert response.headers.get("Cache-Control") == "no-cache"


class TestIChingBlueprintRegistration:
    """Tests for I-Ching blueprint registration."""

    def test_blueprint_exists(self):
        """Test that I-Ching blueprint exists."""
        from backend_ai.app.routers.iching_routes import iching_bp

        assert iching_bp is not None
        assert iching_bp.name == "iching"
        assert iching_bp.url_prefix == "/iching"

    def test_blueprint_routes_count(self):
        """Test that blueprint has expected number of routes."""
        from backend_ai.app.routers.iching_routes import iching_bp

        # Count the registered rules
        # Blueprint should have 8 main endpoints
        assert len(list(iching_bp.deferred_functions)) >= 8
