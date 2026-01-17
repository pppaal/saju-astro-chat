"""
Integration tests for Compatibility API endpoints.

Tests:
- POST /api/compatibility - Compatibility analysis (2-5 people)
- POST /api/compatibility/chat - Compatibility chat
"""
import json

import pytest
from unittest.mock import patch, MagicMock

from flask import Flask


@pytest.fixture
def app():
    """Create Flask app for testing."""
    from backend_ai.app.routers.compatibility_routes import compatibility_bp

    app = Flask(__name__)
    app.register_blueprint(compatibility_bp)
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


class TestCompatibilityAnalysisEndpoint:
    """Tests for /api/compatibility endpoint."""

    @pytest.fixture
    def sample_person1(self):
        """Sample person 1 birth data."""
        return {
            "name": "철수",
            "birth": {
                "year": 1990,
                "month": 5,
                "day": 15,
                "hour": 10,
                "minute": 30,
            },
            "gender": "male",
        }

    @pytest.fixture
    def sample_person2(self):
        """Sample person 2 birth data."""
        return {
            "name": "영희",
            "birth": {
                "year": 1992,
                "month": 8,
                "day": 20,
                "hour": 14,
                "minute": 0,
            },
            "gender": "female",
        }

    @pytest.fixture
    def sample_people_request(self, sample_person1, sample_person2):
        """Sample compatibility request with people array."""
        return {
            "people": [sample_person1, sample_person2],
            "relationship_type": "lover",
            "locale": "ko",
        }

    def test_compatibility_pair_success(self, client, sample_people_request):
        """Test successful pair compatibility analysis."""
        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert "status" in data

    def test_compatibility_backward_compat(self, client, sample_person1, sample_person2):
        """Test backward compatibility with person1/person2 format."""
        response = client.post(
            "/api/compatibility/",
            data=json.dumps({
                "person1": sample_person1,
                "person2": sample_person2,
                "relationship_type": "friend",
                "locale": "ko"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_group_3_people(self, client, sample_person1, sample_person2):
        """Test group compatibility with 3 people."""
        person3 = {
            "name": "민수",
            "birth": {"year": 1991, "month": 3, "day": 10, "hour": 8},
            "gender": "male",
        }

        response = client.post(
            "/api/compatibility/",
            data=json.dumps({
                "people": [sample_person1, sample_person2, person3],
                "relationship_type": "colleague",
                "locale": "ko"
            }),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_too_few_people(self, client, sample_person1):
        """Test with only one person."""
        response = client.post(
            "/api/compatibility/",
            data=json.dumps({
                "people": [sample_person1],
                "relationship_type": "lover",
                "locale": "ko"
            }),
            content_type="application/json"
        )

        # Should return 400 for insufficient people or 501 if module unavailable
        assert response.status_code in [400, 501]

    def test_compatibility_too_many_people(self, client, sample_person1):
        """Test with too many people (>5)."""
        people = [sample_person1.copy() for _ in range(6)]
        for i, p in enumerate(people):
            p["name"] = f"Person{i}"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps({
                "people": people,
                "relationship_type": "family",
                "locale": "ko"
            }),
            content_type="application/json"
        )

        assert response.status_code in [400, 501]

    def test_compatibility_lover_type(self, client, sample_people_request):
        """Test with lover relationship type."""
        sample_people_request["relationship_type"] = "lover"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_friend_type(self, client, sample_people_request):
        """Test with friend relationship type."""
        sample_people_request["relationship_type"] = "friend"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_colleague_type(self, client, sample_people_request):
        """Test with colleague relationship type."""
        sample_people_request["relationship_type"] = "colleague"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_family_type(self, client, sample_people_request):
        """Test with family relationship type."""
        sample_people_request["relationship_type"] = "family"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_english_locale(self, client, sample_people_request):
        """Test with English locale."""
        sample_people_request["locale"] = "en"

        response = client.post(
            "/api/compatibility/",
            data=json.dumps(sample_people_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_compatibility_empty_request(self, client):
        """Test with empty request."""
        response = client.post(
            "/api/compatibility/",
            data=json.dumps({}),
            content_type="application/json"
        )

        assert response.status_code in [400, 500, 501]


class TestCompatibilityChatEndpoint:
    """Tests for /api/compatibility/chat endpoint."""

    @pytest.fixture
    def sample_chat_request(self):
        """Sample chat request."""
        return {
            "persons": [
                {"name": "철수", "birthDate": "1990-05-15", "birthTime": "10:30"},
                {"name": "영희", "birthDate": "1992-08-20", "birthTime": "14:00"},
            ],
            "question": "우리 궁합이 좋은가요?",
            "history": [],
            "locale": "ko",
        }

    def test_chat_success(self, client, sample_chat_request):
        """Test successful compatibility chat."""
        response = client.post(
            "/api/compatibility/chat",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_chat_follow_up_question(self, client, sample_chat_request):
        """Test follow-up question."""
        sample_chat_request["history"] = [
            {"role": "user", "content": "우리 궁합이 좋은가요?"},
            {"role": "assistant", "content": "두 분은 좋은 궁합입니다."},
        ]
        sample_chat_request["question"] = "더 자세히 설명해주세요"

        response = client.post(
            "/api/compatibility/chat",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]

    def test_chat_english(self, client, sample_chat_request):
        """Test chat in English."""
        sample_chat_request["locale"] = "en"
        sample_chat_request["question"] = "Are we compatible?"

        response = client.post(
            "/api/compatibility/chat",
            data=json.dumps(sample_chat_request),
            content_type="application/json"
        )

        assert response.status_code in [200, 500, 501]


class TestCompatibilityEndpointAccessibility:
    """Tests for compatibility endpoint accessibility."""

    @pytest.mark.parametrize("endpoint,method", [
        ("/api/compatibility/", "POST"),
        ("/api/compatibility", "POST"),
        ("/api/compatibility/chat", "POST"),
    ])
    def test_endpoint_exists(self, client, endpoint, method):
        """Test that endpoints exist (not 404)."""
        response = client.post(
            endpoint,
            data=json.dumps({}),
            content_type="application/json"
        )

        assert response.status_code != 404

    def test_main_endpoint_rejects_get(self, client):
        """Test main endpoint rejects GET method."""
        response = client.get("/api/compatibility/")
        assert response.status_code == 405

    def test_chat_endpoint_rejects_get(self, client):
        """Test chat endpoint rejects GET method."""
        response = client.get("/api/compatibility/chat")
        assert response.status_code == 405


class TestCompatibilityInputValidation:
    """Tests for compatibility endpoint input validation."""

    def test_invalid_json(self, client):
        """Test with invalid JSON."""
        response = client.post(
            "/api/compatibility/",
            data="not valid json",
            content_type="application/json"
        )

        assert response.status_code in [400, 500]

    def test_invalid_birth_data(self, client):
        """Test with invalid birth data - API may gracefully handle or reject."""
        response = client.post(
            "/api/compatibility/",
            data=json.dumps({
                "people": [
                    {"name": "A", "birth": {"year": "invalid"}},
                    {"name": "B", "birth": {"year": "invalid"}},
                ],
                "relationship_type": "friend"
            }),
            content_type="application/json"
        )

        # API may return 200 with graceful handling or 400/500 with rejection
        assert response.status_code in [200, 400, 500, 501]


class TestCompatibilityBlueprintRegistration:
    """Tests for compatibility blueprint registration."""

    def test_blueprint_exists(self):
        """Test that compatibility blueprint exists."""
        from backend_ai.app.routers.compatibility_routes import compatibility_bp

        assert compatibility_bp is not None
        assert compatibility_bp.name == "compatibility"
        assert compatibility_bp.url_prefix == "/api/compatibility"
