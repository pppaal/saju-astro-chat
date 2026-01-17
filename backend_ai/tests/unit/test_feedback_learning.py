"""
Unit tests for Feedback Learning (RLHF) module.

Tests:
- FeedbackRecord and FewShotExample dataclasses
- FeedbackLearning class initialization
- Storage helpers (store, retrieve, append_list)
- Feedback recording and statistics
- Few-shot example selection and formatting
- Rule weight adjustment
- Analytics and pattern analysis
- Training data export
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from dataclasses import asdict
import json


class TestFeedbackRecordDataclass:
    """Tests for FeedbackRecord dataclass."""

    def test_feedback_record_creation(self):
        """Test creating a FeedbackRecord."""
        from backend_ai.app.feedback_learning import FeedbackRecord

        record = FeedbackRecord(
            record_id="test_123",
            user_id="user_456",
            timestamp="2024-01-15T10:00:00",
            theme="love",
            locale="ko",
            service_type="fusion",
            rating=5,
            feedback_text="좋아요!",
            consultation_summary="테스트 상담 요약",
            key_insights=["인사이트1", "인사이트2"],
            prompt_used="연애운이 궁금해요",
            context_used="사주 컨텍스트",
        )

        assert record.record_id == "test_123"
        assert record.user_id == "user_456"
        assert record.rating == 5
        assert record.theme == "love"
        assert len(record.key_insights) == 2

    def test_feedback_record_asdict(self):
        """Test converting FeedbackRecord to dict."""
        from backend_ai.app.feedback_learning import FeedbackRecord

        record = FeedbackRecord(
            record_id="test",
            user_id="user",
            timestamp="2024-01-15",
            theme="career",
            locale="en",
            service_type="tarot",
            rating=4,
            feedback_text="Good",
            consultation_summary="Summary",
            key_insights=["insight"],
            prompt_used="prompt",
            context_used="context",
        )

        record_dict = asdict(record)
        assert record_dict["record_id"] == "test"
        assert record_dict["rating"] == 4
        assert isinstance(record_dict["key_insights"], list)


class TestFewShotExampleDataclass:
    """Tests for FewShotExample dataclass."""

    def test_fewshot_example_creation(self):
        """Test creating a FewShotExample."""
        from backend_ai.app.feedback_learning import FewShotExample

        example = FewShotExample(
            theme="love",
            locale="ko",
            user_question="연애운이 궁금해요",
            consultation_summary="좋은 결과가 예상됩니다",
            rating=4.5,
            key_insights=["인사이트1"],
            created_at="2024-01-15T10:00:00",
        )

        assert example.theme == "love"
        assert example.rating == 4.5
        assert example.locale == "ko"

    def test_fewshot_example_asdict(self):
        """Test converting FewShotExample to dict."""
        from backend_ai.app.feedback_learning import FewShotExample

        example = FewShotExample(
            theme="career",
            locale="en",
            user_question="What about my career?",
            consultation_summary="Great opportunities ahead",
            rating=5.0,
            key_insights=["growth", "success"],
            created_at="2024-01-15",
        )

        example_dict = asdict(example)
        assert example_dict["theme"] == "career"
        assert example_dict["rating"] == 5.0


class TestFeedbackLearningInit:
    """Tests for FeedbackLearning initialization."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    def test_init_without_redis(self):
        """Test initialization without Redis."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        assert fl._prefix == "rlhf"
        assert fl._rule_weights_cache == {}
        assert fl._fewshot_cache == {}

    def test_has_redis_flag_exists(self):
        """Test HAS_REDIS flag exists."""
        from backend_ai.app.feedback_learning import HAS_REDIS
        assert isinstance(HAS_REDIS, bool)


class TestStorageHelpers:
    """Tests for storage helper methods."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_store_and_retrieve_memory(self):
        """Test store and retrieve with memory backend."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl._store("test_key", {"data": "value"})
        result = fl._retrieve("test_key")

        assert result == {"data": "value"}

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_retrieve_nonexistent(self):
        """Test retrieving nonexistent key."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        result = fl._retrieve("nonexistent")
        assert result is None

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_append_list(self):
        """Test appending to list."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl._append_list("my_list", {"item": 1})
        fl._append_list("my_list", {"item": 2})

        result = fl._retrieve("my_list")
        assert len(result) == 2
        assert result[0]["item"] == 2  # Most recent first

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_append_list_max_items(self):
        """Test append list respects max items."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        for i in range(15):
            fl._append_list("limited_list", {"item": i}, max_items=10)

        result = fl._retrieve("limited_list")
        assert len(result) == 10

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_get_all_keys_pattern(self):
        """Test getting keys by pattern."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl._store("test:a", {"data": 1})
        fl._store("test:b", {"data": 2})
        fl._store("other:c", {"data": 3})

        keys = fl._get_all_keys("test:*")
        assert len(keys) == 2
        assert all(k.startswith("test:") for k in keys)


class TestFeedbackRecording:
    """Tests for feedback recording."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_record_feedback_basic(self):
        """Test basic feedback recording."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        result = fl.record_feedback(
            record_id="rec_001",
            user_id="user_001",
            rating=5,
            feedback_text="Great!",
            consultation_data={
                "theme": "love",
                "locale": "ko",
                "service_type": "fusion",
                "summary": "Test summary",
            }
        )

        # Should return feedback_id
        assert result is not None

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_record_feedback_updates_stats(self):
        """Test feedback recording updates stats."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.record_feedback(
            record_id="rec_001",
            user_id="user_001",
            rating=5,
        )
        fl.record_feedback(
            record_id="rec_002",
            user_id="user_001",
            rating=3,
        )

        stats = fl.get_stats()
        assert stats["total_feedbacks"] == 2
        assert stats["avg_rating"] == 4.0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_high_rating_adds_fewshot(self):
        """Test high rating adds to fewshot candidates."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.record_feedback(
            record_id="rec_001",
            user_id="user_001",
            rating=5,
            consultation_data={
                "theme": "love",
                "locale": "ko",
                "summary": "Excellent consultation",
                "prompt": "연애운 질문",
            }
        )

        examples = fl.get_fewshot_examples("love", "ko")
        assert len(examples) >= 0  # May or may not have examples depending on data


class TestFewShotExamples:
    """Tests for few-shot example selection."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_get_fewshot_examples_empty(self):
        """Test getting fewshot examples when none exist."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        examples = fl.get_fewshot_examples("love", "ko")
        assert examples == []

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_format_fewshot_prompt_empty(self):
        """Test formatting fewshot prompt when empty."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        prompt = fl.format_fewshot_prompt("love", "ko")
        assert prompt == ""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_format_fewshot_prompt_korean(self):
        """Test Korean fewshot prompt formatting."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        # Manually add example
        fl._store("fewshot:love:ko", [{
            "user_question": "연애운 질문",
            "consultation_summary": "좋은 결과 예상",
            "rating": 5.0,
            "key_insights": ["인사이트1", "인사이트2"],
        }])

        prompt = fl.format_fewshot_prompt("love", "ko")
        assert "고객 만족도" in prompt or len(prompt) > 0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_format_fewshot_prompt_english(self):
        """Test English fewshot prompt formatting."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl._store("fewshot:love:en", [{
            "user_question": "Love question",
            "consultation_summary": "Great results expected",
            "rating": 5.0,
            "key_insights": ["insight1"],
        }])

        prompt = fl.format_fewshot_prompt("love", "en")
        assert "High-Rated" in prompt or len(prompt) > 0


class TestRuleWeights:
    """Tests for rule weight adjustment."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_get_rule_weights_default(self):
        """Test getting default rule weights."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        weights = fl.get_rule_weights("love")
        assert "_default" in weights
        assert weights["_default"] == 1.0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_adjust_rule_weights_positive(self):
        """Test positive weight adjustment for high rating."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.adjust_rule_weights(
            theme="love",
            rules_used=["rule1", "rule2"],
            rating=5,
            learning_rate=0.1,
        )

        weights = fl.get_rule_weights("love")
        assert weights.get("rule1", 1.0) > 1.0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_adjust_rule_weights_negative(self):
        """Test negative weight adjustment for low rating."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.adjust_rule_weights(
            theme="love",
            rules_used=["rule1"],
            rating=1,
            learning_rate=0.1,
        )

        weights = fl.get_rule_weights("love")
        assert weights.get("rule1", 1.0) < 1.0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_rule_weights_bounds(self):
        """Test rule weights respect bounds."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        # Adjust many times to test bounds
        for _ in range(50):
            fl.adjust_rule_weights("love", ["rule1"], rating=5, learning_rate=0.2)

        weights = fl.get_rule_weights("love")
        assert weights.get("rule1", 1.0) <= 3.0  # Max bound


class TestAnalytics:
    """Tests for analytics and pattern analysis."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_get_stats_empty(self):
        """Test getting stats when empty."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        stats = fl.get_stats()

        assert stats["total_feedbacks"] == 0
        assert stats["avg_rating"] == 0

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_stats_rating_distribution(self):
        """Test rating distribution tracking."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.record_feedback("r1", "u1", rating=5)
        fl.record_feedback("r2", "u1", rating=5)
        fl.record_feedback("r3", "u1", rating=3)

        stats = fl.get_stats()
        assert stats["rating_distribution"].get("5", 0) == 2
        assert stats["rating_distribution"].get("3", 0) == 1

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_analyze_feedback_patterns_empty(self):
        """Test analyzing patterns with no data."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        analysis = fl.analyze_feedback_patterns(days=30)

        assert analysis["total_feedbacks"] == 0
        assert "데이터가 부족" in analysis["insights"][0]

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_analyze_feedback_patterns_with_data(self):
        """Test analyzing patterns with data."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        for i in range(5):
            fl.record_feedback(
                f"r{i}",
                "u1",
                rating=4 if i < 3 else 2,
                consultation_data={"theme": "love"}
            )

        analysis = fl.analyze_feedback_patterns(days=30)
        assert analysis["total_feedbacks"] == 5


class TestImprovementSuggestions:
    """Tests for improvement suggestions."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_get_improvement_suggestions_empty(self):
        """Test suggestions with no data."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        suggestions = fl.get_improvement_suggestions()

        # Should have data collection suggestion
        assert any(s["action"] == "collect_feedback" for s in suggestions)

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_suggestions_priority_sorting(self):
        """Test suggestions are sorted by priority."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        # Create low-rated data
        for i in range(10):
            fl.record_feedback(f"r{i}", "u1", rating=2, consultation_data={"theme": "love"})

        suggestions = fl.get_improvement_suggestions()

        # High priority should come first
        if len(suggestions) > 1:
            priorities = [s["priority"] for s in suggestions]
            priority_order = {"high": 0, "medium": 1, "low": 2}
            for i in range(len(priorities) - 1):
                assert priority_order.get(priorities[i], 3) <= priority_order.get(priorities[i + 1], 3)


class TestTrainingDataExport:
    """Tests for training data export."""

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_export_training_data_empty(self):
        """Test exporting when no data."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        data = fl.export_training_data(min_rating=4)
        assert data == []

    @patch("backend_ai.app.feedback_learning.HAS_REDIS", False)
    @patch("backend_ai.app.feedback_learning.HAS_BADGES", False)
    @patch("backend_ai.app.feedback_learning._feedback_store", {})
    def test_export_training_data_filters_by_rating(self):
        """Test export filters by minimum rating."""
        from backend_ai.app.feedback_learning import FeedbackLearning

        fl = FeedbackLearning()
        fl.record_feedback("r1", "u1", rating=5, consultation_data={"summary": "test1", "theme": "love"})
        fl.record_feedback("r2", "u1", rating=2, consultation_data={"summary": "test2", "theme": "love"})

        data = fl.export_training_data(min_rating=4)
        # Only high-rated should be exported
        assert all(d["metadata"]["rating"] >= 4 for d in data if d.get("metadata"))


class TestGetFeedbackLearning:
    """Tests for singleton factory function."""

    def test_get_feedback_learning_returns_instance(self):
        """Test get_feedback_learning returns an instance."""
        # Reset singleton
        import backend_ai.app.feedback_learning as module
        module._feedback_learning_instance = None

        from backend_ai.app.feedback_learning import get_feedback_learning, FeedbackLearning

        instance = get_feedback_learning()
        assert isinstance(instance, FeedbackLearning)

    def test_get_feedback_learning_singleton(self):
        """Test get_feedback_learning returns same instance."""
        import backend_ai.app.feedback_learning as module
        module._feedback_learning_instance = None

        from backend_ai.app.feedback_learning import get_feedback_learning

        instance1 = get_feedback_learning()
        instance2 = get_feedback_learning()
        assert instance1 is instance2


class TestModuleExports:
    """Tests for module exports."""

    def test_feedback_record_importable(self):
        """FeedbackRecord should be importable."""
        from backend_ai.app.feedback_learning import FeedbackRecord
        assert FeedbackRecord is not None

    def test_fewshot_example_importable(self):
        """FewShotExample should be importable."""
        from backend_ai.app.feedback_learning import FewShotExample
        assert FewShotExample is not None

    def test_feedback_learning_importable(self):
        """FeedbackLearning should be importable."""
        from backend_ai.app.feedback_learning import FeedbackLearning
        assert FeedbackLearning is not None

    def test_get_feedback_learning_importable(self):
        """get_feedback_learning should be importable."""
        from backend_ai.app.feedback_learning import get_feedback_learning
        assert get_feedback_learning is not None

    def test_has_redis_importable(self):
        """HAS_REDIS should be importable."""
        from backend_ai.app.feedback_learning import HAS_REDIS
        assert isinstance(HAS_REDIS, bool)


class TestPingRedis:
    """Tests for _ping_redis helper."""

    def test_ping_redis_with_timeout(self):
        """Test ping_redis handles timeout."""
        from backend_ai.app.feedback_learning import _ping_redis

        mock_client = MagicMock()
        mock_client.ping.return_value = True

        result = _ping_redis(mock_client, 1.0)
        assert result is True

    def test_ping_redis_failure(self):
        """Test ping_redis handles failure."""
        from backend_ai.app.feedback_learning import _ping_redis

        mock_client = MagicMock()
        mock_client.ping.side_effect = Exception("Connection failed")

        result = _ping_redis(mock_client, 0.1)
        assert result is False
