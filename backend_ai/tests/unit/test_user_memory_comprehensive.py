"""
Unit tests for backend_ai/app/user_memory.py

Tests:
- UserMemory class
- ConsultationRecord dataclass
- UserProfile dataclass
- Storage operations (Redis fallback to in-memory)
- Context building for LLM
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestConsultationRecord:
    """Tests for ConsultationRecord dataclass."""

    def test_create_minimal_record(self):
        """Should create record with minimal fields."""
        from backend_ai.app.user_memory import ConsultationRecord

        record = ConsultationRecord(
            timestamp="2024-01-01T00:00:00",
            theme="career",
            locale="ko",
            summary="Test summary",
            key_insights=["insight1"],
            birth_data={"year": 1990},
            recommendations=["rec1"],
        )

        assert record.timestamp == "2024-01-01T00:00:00"
        assert record.theme == "career"
        assert record.locale == "ko"
        assert record.service_type == "fusion"  # default

    def test_create_full_record(self):
        """Should create record with all fields."""
        from backend_ai.app.user_memory import ConsultationRecord

        record = ConsultationRecord(
            timestamp="2024-01-01T00:00:00",
            theme="love",
            locale="en",
            summary="Test summary",
            key_insights=["insight1", "insight2"],
            birth_data={"year": 1990},
            recommendations=["rec1"],
            service_type="dream",
            user_feedback="Great!",
            rating=5,
            user_prompt="What about my love life?",
            context_used="saju context here",
            matched_rule_ids=["rule1", "rule2"],
        )

        assert record.service_type == "dream"
        assert record.rating == 5
        assert record.matched_rule_ids == ["rule1", "rule2"]


class TestUserProfile:
    """Tests for UserProfile dataclass."""

    def test_create_profile(self):
        """Should create user profile."""
        from backend_ai.app.user_memory import UserProfile

        profile = UserProfile(
            user_id="test123",
            birth_data={"year": 1990},
            dominant_themes=["career", "love"],
            key_patterns=["pattern1"],
            consultation_count=5,
            last_consultation="2024-01-01T00:00:00",
            personality_insights=["insight1"],
            growth_areas=["area1"],
        )

        assert profile.user_id == "test123"
        assert profile.consultation_count == 5
        assert "career" in profile.dominant_themes


class TestUserMemoryStorage:
    """Tests for UserMemory storage operations."""

    def test_create_user_memory(self):
        """Should create UserMemory instance."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_user_123")
        assert memory.user_id == "test_user_123"
        assert memory._prefix == "usermem:test_user_123"

    def test_get_key(self):
        """Should generate correct storage keys."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("user1")
        key = memory._get_key("profile")
        assert key == "usermem:user1:profile"

    def test_store_and_retrieve_inmemory(self):
        """Should store and retrieve with in-memory fallback."""
        from backend_ai.app.user_memory import UserMemory, HAS_REDIS, _memory_store

        memory = UserMemory("test_store_user")

        # Store data
        test_data = {"key": "value", "number": 42}
        memory._store("test_data", test_data, ttl_days=1)

        # Retrieve data
        result = memory._retrieve("test_data")
        assert result == test_data

    def test_append_list(self):
        """Should append to list with max size limit."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_append_user")

        # Append items
        for i in range(60):
            memory._append_list("test_list", {"item": i}, max_items=50)

        # Should only have 50 items
        result = memory._retrieve("test_list")
        assert len(result) == 50
        # Most recent should be first
        assert result[0]["item"] == 59


class TestUserMemoryConsultation:
    """Tests for consultation management."""

    def test_save_consultation(self):
        """Should save consultation and return ID."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_consultation_user")

        record_id = memory.save_consultation(
            theme="career",
            locale="ko",
            birth_data={"year": 1990, "month": 5, "day": 15},
            fusion_result="• 직장 운이 좋습니다\n• 승진 기회가 있습니다",
            key_insights=["직장 운 좋음"],
            recommendations=["열심히 일하세요"],
        )

        assert record_id is not None
        assert len(record_id) == 12  # SHA1 truncated to 12

    def test_get_consultation(self):
        """Should retrieve saved consultation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_get_consult_user")

        record_id = memory.save_consultation(
            theme="love",
            locale="en",
            birth_data={"year": 1985},
            fusion_result="Love analysis result",
        )

        record = memory.get_consultation(record_id)
        assert record is not None
        assert record.theme == "love"
        assert record.locale == "en"

    def test_get_nonexistent_consultation(self):
        """Should return None for nonexistent consultation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_nonexist_user")
        record = memory.get_consultation("nonexistent_id")
        assert record is None

    def test_get_history(self):
        """Should return consultation history."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_history_user")

        # Save multiple consultations
        for i in range(5):
            memory.save_consultation(
                theme=f"theme_{i}",
                locale="ko",
                birth_data={"year": 1990},
                fusion_result=f"Result {i}",
            )

        history = memory.get_history(limit=3)
        assert len(history) == 3
        # Most recent should be first
        assert history[0]["theme"] == "theme_4"

    def test_extract_insights(self):
        """Should extract insights from text."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("test_insights_user")

        text = """
        • 직장에서 인정받는 시기입니다
        - 새로운 기회가 찾아옵니다
        ★ 건강 관리에 신경 쓰세요
        Short
        """

        insights = memory._extract_insights(text)
        assert len(insights) > 0
        assert "직장에서 인정받는 시기입니다" in insights


class TestUserMemoryProfile:
    """Tests for user profile management."""

    def test_update_profile(self):
        """Should update user profile with consultation data."""
        from backend_ai.app.user_memory import UserMemory, ConsultationRecord

        memory = UserMemory("test_profile_user")

        # Save consultation to trigger profile update
        memory.save_consultation(
            theme="career",
            locale="ko",
            birth_data={"year": 1990},
            fusion_result="Career advice",
            key_insights=["Leadership potential"],
        )

        profile = memory.get_profile()
        assert profile is not None
        assert profile.consultation_count == 1
        assert "career" in profile.dominant_themes

    def test_get_empty_profile(self):
        """Should return None for user without profile."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("new_user_no_profile")
        profile = memory.get_profile()
        assert profile is None


class TestUserMemoryContextBuilding:
    """Tests for LLM context building."""

    def test_build_empty_context(self):
        """Should return empty string for new user."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("empty_context_user")
        context = memory.build_context_for_llm("career", "ko")
        assert context == ""

    def test_build_context_with_history(self):
        """Should build context from history."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("context_history_user")

        # Save some consultations
        memory.save_consultation(
            theme="career",
            locale="ko",
            birth_data={"year": 1990},
            fusion_result="Career advice here",
            service_type="fusion",
        )

        context = memory.build_context_for_llm("career", "ko", service_type="fusion")
        assert "사용자 히스토리" in context or "User History" in context

    def test_build_context_english_locale(self):
        """Should build English context."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("english_context_user")

        memory.save_consultation(
            theme="love",
            locale="en",
            birth_data={"year": 1990},
            fusion_result="Love advice",
        )

        context = memory.build_context_for_llm("love", "en")
        assert "User History" in context


class TestUserMemorySession:
    """Tests for session memory."""

    def test_add_session_message(self):
        """Should add message to session."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("session_test_user")

        memory.add_session_message("user", "Hello!")
        memory.add_session_message("assistant", "Hi there!")

        messages = memory.get_session_messages()
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello!"

    def test_session_message_truncation(self):
        """Should truncate long messages."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("session_truncate_user")

        long_message = "x" * 2000
        memory.add_session_message("user", long_message)

        messages = memory.get_session_messages()
        assert len(messages[0]["content"]) == 1000

    def test_clear_session(self):
        """Should clear session messages."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("session_clear_user")

        memory.add_session_message("user", "Test message")
        assert len(memory.get_session_messages()) > 0

        memory.clear_session()
        assert len(memory.get_session_messages()) == 0


class TestUserMemoryFeedback:
    """Tests for feedback management."""

    def test_save_feedback(self):
        """Should save feedback for consultation."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("feedback_test_user")

        # First save a consultation
        record_id = memory.save_consultation(
            theme="career",
            locale="ko",
            birth_data={"year": 1990},
            fusion_result="Career advice",
        )

        # Save feedback
        memory.save_feedback(record_id, "Very helpful!", rating=5)

        # Check feedback was saved
        record = memory.get_consultation(record_id)
        assert record.user_feedback == "Very helpful!"
        assert record.rating == 5

    def test_get_feedback_stats_empty(self):
        """Should return empty stats for no feedback."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("feedback_stats_empty_user")
        stats = memory.get_feedback_stats()

        assert stats["count"] == 0
        assert stats["avg_rating"] is None

    def test_get_feedback_stats_with_data(self):
        """Should calculate feedback statistics."""
        from backend_ai.app.user_memory import UserMemory

        memory = UserMemory("feedback_stats_user")

        # Save consultations and feedback
        for rating in [5, 4, 3, 5, 4]:
            record_id = memory.save_consultation(
                theme="career",
                locale="ko",
                birth_data={"year": 1990},
                fusion_result="Advice",
            )
            memory.save_feedback(record_id, "Feedback", rating=rating)

        stats = memory.get_feedback_stats()
        assert stats["count"] == 5
        assert stats["rated_count"] == 5
        assert stats["avg_rating"] == 4.2  # (5+4+3+5+4)/5
        assert stats["positive_count"] == 4  # ratings >= 4


class TestUtilityFunctions:
    """Tests for utility functions."""

    def test_get_user_memory(self):
        """Should return UserMemory instance."""
        from backend_ai.app.user_memory import get_user_memory

        memory = get_user_memory("test_user")
        assert memory is not None
        assert memory.user_id == "test_user"

    def test_generate_user_id(self):
        """Should generate consistent user ID."""
        from backend_ai.app.user_memory import generate_user_id

        birth_data = {
            "year": 1990,
            "month": 5,
            "day": 15,
            "hour": 14,
            "latitude": 37.5665,
            "longitude": 126.9780,
        }

        user_id1 = generate_user_id(birth_data)
        user_id2 = generate_user_id(birth_data)

        assert user_id1 == user_id2
        assert len(user_id1) == 16

    def test_generate_user_id_different_data(self):
        """Should generate different IDs for different data."""
        from backend_ai.app.user_memory import generate_user_id

        id1 = generate_user_id({"year": 1990})
        id2 = generate_user_id({"year": 1991})

        assert id1 != id2


class TestModuleExports:
    """Tests for module exports."""

    def test_usermemory_importable(self):
        """UserMemory should be importable."""
        from backend_ai.app.user_memory import UserMemory
        assert callable(UserMemory)

    def test_consultation_record_importable(self):
        """ConsultationRecord should be importable."""
        from backend_ai.app.user_memory import ConsultationRecord
        assert ConsultationRecord is not None

    def test_user_profile_importable(self):
        """UserProfile should be importable."""
        from backend_ai.app.user_memory import UserProfile
        assert UserProfile is not None

    def test_get_user_memory_importable(self):
        """get_user_memory should be importable."""
        from backend_ai.app.user_memory import get_user_memory
        assert callable(get_user_memory)

    def test_generate_user_id_importable(self):
        """generate_user_id should be importable."""
        from backend_ai.app.user_memory import generate_user_id
        assert callable(generate_user_id)

    def test_has_redis_constant(self):
        """HAS_REDIS should be accessible."""
        from backend_ai.app.user_memory import HAS_REDIS
        assert isinstance(HAS_REDIS, bool)

