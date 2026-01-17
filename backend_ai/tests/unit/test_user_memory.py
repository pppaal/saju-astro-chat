"""
Unit tests for User Memory module.

Tests:
- ConsultationRecord and UserProfile dataclasses
- UserMemory class
- Storage helpers
- Consultation management
- Context building for LLM
- Session memory
- Feedback system
- Factory functions
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from dataclasses import asdict


class TestConsultationRecordDataclass:
    """Tests for ConsultationRecord dataclass."""

    def test_consultation_record_creation(self):
        """Test creating a ConsultationRecord."""
        from backend_ai.app.user_memory import ConsultationRecord

        record = ConsultationRecord(
            timestamp="2024-01-15T10:00:00",
            theme="career",
            locale="ko",
            summary="Test summary",
            key_insights=["insight1", "insight2"],
            birth_data={"year": 1990},
            recommendations=["rec1"],
        )

        assert record.theme == "career"
        assert record.locale == "ko"
        assert len(record.key_insights) == 2

    def test_consultation_record_defaults(self):
        """Test default values."""
        from backend_ai.app.user_memory import ConsultationRecord

        record = ConsultationRecord(
            timestamp="2024-01-15",
            theme="love",
            locale="en",
            summary="Test",
            key_insights=[],
            birth_data={},
            recommendations=[],
        )

        assert record.service_type == "fusion"
        assert record.user_feedback is None
        assert record.rating is None

    def test_consultation_record_asdict(self):
        """Test converting to dict."""
        from backend_ai.app.user_memory import ConsultationRecord

        record = ConsultationRecord(
            timestamp="2024-01-15",
            theme="career",
            locale="ko",
            summary="Test",
            key_insights=["insight"],
            birth_data={},
            recommendations=[],
        )

        record_dict = asdict(record)
        assert record_dict["theme"] == "career"
        assert "key_insights" in record_dict


class TestUserProfileDataclass:
    """Tests for UserProfile dataclass."""

    def test_user_profile_creation(self):
        """Test creating a UserProfile."""
        from backend_ai.app.user_memory import UserProfile

        profile = UserProfile(
            user_id="test123",
            birth_data={"year": 1990},
            dominant_themes=["career", "love"],
            key_patterns=["pattern1"],
            consultation_count=5,
            last_consultation="2024-01-15",
            personality_insights=["insight1"],
            growth_areas=["area1"],
        )

        assert profile.user_id == "test123"
        assert profile.consultation_count == 5
        assert "career" in profile.dominant_themes


class TestUserMemoryInit:
    """Tests for UserMemory initialization."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    def test_user_memory_creation(self):
        """Test UserMemory creation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_user_123")

        assert memory.user_id == "test_user_123"
        assert memory._prefix == "usermem:test_user_123"

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    def test_get_key(self):
        """Test _get_key method."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        key = memory._get_key("test")

        assert key == "usermem:user123:test"


class TestUserMemoryStorage:
    """Tests for UserMemory storage methods."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_store_and_retrieve(self):
        """Test store and retrieve."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory._store("test_key", {"data": "value"})
        result = memory._retrieve("test_key")

        assert result == {"data": "value"}

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_retrieve_nonexistent(self):
        """Test retrieving nonexistent key."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        result = memory._retrieve("nonexistent")

        assert result is None

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_append_list(self):
        """Test append_list."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory._append_list("my_list", {"item": 1})
        memory._append_list("my_list", {"item": 2})

        result = memory._retrieve("my_list")
        assert len(result) == 2
        assert result[0]["item"] == 2  # Most recent first


class TestConsultationManagement:
    """Tests for consultation management."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_save_consultation(self):
        """Test saving a consultation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        record_id = memory.save_consultation(
            theme="career",
            locale="ko",
            birth_data={"year": 1990},
            fusion_result="Test result • insight 1\n• insight 2",
        )

        assert record_id is not None
        assert len(record_id) == 12

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_get_consultation(self):
        """Test getting a consultation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        record_id = memory.save_consultation(
            theme="love",
            locale="en",
            birth_data={},
            fusion_result="Test",
        )

        record = memory.get_consultation(record_id)
        assert record is not None
        assert record.theme == "love"

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_get_history(self):
        """Test getting history."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory.save_consultation("career", "ko", {}, "Result 1")
        memory.save_consultation("love", "ko", {}, "Result 2")

        history = memory.get_history(limit=10)
        assert len(history) == 2


class TestExtractInsights:
    """Tests for _extract_insights method."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    def test_extracts_bullet_points(self):
        """Test extracting bullet points."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        text = "Introduction\n• This is insight one\n• This is insight two\nConclusion"
        insights = memory._extract_insights(text)

        assert len(insights) >= 2
        assert "This is insight one" in insights[0]

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    def test_handles_empty_text(self):
        """Test handling empty text."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        insights = memory._extract_insights("")

        assert insights == []

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    def test_limits_insights_to_5(self):
        """Test limits insights to 5."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        text = "\n".join([f"• Insight number {i} with enough text" for i in range(10)])
        insights = memory._extract_insights(text)

        assert len(insights) <= 5


class TestContextBuilding:
    """Tests for context building for LLM."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_build_context_empty(self):
        """Test building context with no history."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        context = memory.build_context_for_llm("career")

        assert context == ""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_build_context_with_history(self):
        """Test building context with history."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory.save_consultation("career", "ko", {"year": 1990}, "Career advice")
        memory.save_consultation("love", "ko", {"year": 1990}, "Love advice")

        context = memory.build_context_for_llm("career", "ko")

        assert len(context) > 0
        assert "사용자 히스토리" in context or "User History" in context

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_build_context_locale_korean(self):
        """Test Korean locale context."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory.save_consultation("career", "ko", {}, "Test")

        context = memory.build_context_for_llm("career", "ko")

        assert "사용자 히스토리" in context


class TestSessionMemory:
    """Tests for session memory."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_add_session_message(self):
        """Test adding session message."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory.add_session_message("user", "Hello")
        memory.add_session_message("assistant", "Hi there!")

        messages = memory.get_session_messages()
        assert len(messages) == 2
        assert messages[0]["role"] == "user"

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_clear_session(self):
        """Test clearing session."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        memory.add_session_message("user", "Hello")
        memory.clear_session()

        messages = memory.get_session_messages()
        assert messages == []


class TestFeedbackSystem:
    """Tests for feedback system."""

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_save_feedback(self):
        """Test saving feedback."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        record_id = memory.save_consultation("career", "ko", {}, "Test")
        memory.save_feedback(record_id, "Great advice!", rating=5)

        record = memory.get_consultation(record_id)
        assert record.user_feedback == "Great advice!"
        assert record.rating == 5

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_get_feedback_stats_empty(self):
        """Test feedback stats when empty."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        stats = memory.get_feedback_stats()

        assert stats["count"] == 0
        assert stats["avg_rating"] is None

    @patch("backend_ai.app.user_memory.HAS_REDIS", False)
    @patch("backend_ai.app.user_memory._memory_store", {})
    def test_get_feedback_stats_with_data(self):
        """Test feedback stats with data."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user123")
        record_id1 = memory.save_consultation("career", "ko", {}, "Test1")
        record_id2 = memory.save_consultation("love", "ko", {}, "Test2")
        memory.save_feedback(record_id1, "Good", rating=4)
        memory.save_feedback(record_id2, "Great", rating=5)

        stats = memory.get_feedback_stats()
        assert stats["count"] == 2
        assert stats["rated_count"] == 2
        assert stats["avg_rating"] == 4.5


class TestFactoryFunctions:
    """Tests for factory functions."""

    def test_get_user_memory(self):
        """Test get_user_memory function."""
        from backend_ai.app.user_memory import get_user_memory, UserMemory

        memory = get_user_memory("test_user")
        assert isinstance(memory, UserMemory)
        assert memory.user_id == "test_user"

    def test_generate_user_id(self):
        """Test generate_user_id function."""
        from backend_ai.app.user_memory import generate_user_id

        birth_data = {
            "year": 1990,
            "month": 5,
            "day": 15,
            "hour": 14,
            "latitude": 37.5665,
            "longitude": 126.9780,
        }

        user_id = generate_user_id(birth_data)

        assert len(user_id) == 16
        assert isinstance(user_id, str)

    def test_generate_user_id_consistent(self):
        """Test generate_user_id is consistent."""
        from backend_ai.app.user_memory import generate_user_id

        birth_data = {"year": 1990, "month": 5, "day": 15}

        id1 = generate_user_id(birth_data)
        id2 = generate_user_id(birth_data)

        assert id1 == id2

    def test_generate_user_id_different_data(self):
        """Test different birth data generates different ID."""
        from backend_ai.app.user_memory import generate_user_id

        id1 = generate_user_id({"year": 1990, "month": 5})
        id2 = generate_user_id({"year": 1991, "month": 5})

        assert id1 != id2


class TestPingRedis:
    """Tests for _ping_redis helper."""

    def test_ping_redis_success(self):
        """Test ping_redis with successful ping."""
        from backend_ai.app.user_memory import _ping_redis

        mock_client = MagicMock()
        mock_client.ping.return_value = True

        result = _ping_redis(mock_client, 1.0)
        assert result is True

    def test_ping_redis_failure(self):
        """Test ping_redis with failed ping."""
        from backend_ai.app.user_memory import _ping_redis

        mock_client = MagicMock()
        mock_client.ping.side_effect = Exception("Connection failed")

        result = _ping_redis(mock_client, 0.1)
        assert result is False


class TestModuleExports:
    """Tests for module exports."""

    def test_consultation_record_importable(self):
        """ConsultationRecord should be importable."""
        from backend_ai.app.user_memory import ConsultationRecord
        assert ConsultationRecord is not None

    def test_user_profile_importable(self):
        """UserProfile should be importable."""
        from backend_ai.app.user_memory import UserProfile
        assert UserProfile is not None

    def test_user_memory_importable(self):
        """UserMemory should be importable."""
        from backend_ai.app.user_memory import UserMemory
        assert UserMemory is not None

    def test_get_user_memory_importable(self):
        """get_user_memory should be importable."""
        from backend_ai.app.user_memory import get_user_memory
        assert get_user_memory is not None

    def test_generate_user_id_importable(self):
        """generate_user_id should be importable."""
        from backend_ai.app.user_memory import generate_user_id
        assert generate_user_id is not None

    def test_has_redis_importable(self):
        """HAS_REDIS should be importable."""
        from backend_ai.app.user_memory import HAS_REDIS
        assert isinstance(HAS_REDIS, bool)
