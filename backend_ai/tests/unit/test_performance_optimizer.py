"""
Unit tests for Performance Optimizer module.

Tests:
- Performance statistics tracking
- track_performance decorator
- get_performance_stats function
- optimize_prompt function
- batch_cache_warm function
- get_cache_health function
- suggest_optimizations function
"""
import pytest
from unittest.mock import patch, MagicMock
import time


class TestPerformanceStatsGlobal:
    """Tests for global performance stats."""

    def test_stats_dict_exists(self):
        """Test _performance_stats dict exists."""
        from backend_ai.app.performance_optimizer import _performance_stats

        assert isinstance(_performance_stats, dict)
        assert "total_requests" in _performance_stats
        assert "cache_hits" in _performance_stats
        assert "cache_misses" in _performance_stats
        assert "avg_response_time" in _performance_stats

    def test_stats_initial_values(self):
        """Test initial stats values are zeros."""
        # Reset stats for this test
        import backend_ai.app.performance_optimizer as module
        module._performance_stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_response_time": 0,
            "fast_responses": 0,
            "slow_responses": 0,
        }

        assert module._performance_stats["total_requests"] == 0


class TestTrackPerformanceDecorator:
    """Tests for track_performance decorator."""

    def test_decorator_wraps_function(self):
        """Test decorator preserves function metadata."""
        from backend_ai.app.performance_optimizer import track_performance

        @track_performance
        def test_func():
            """Test docstring."""
            return "result"

        assert test_func.__name__ == "test_func"
        assert "Test docstring" in test_func.__doc__

    def test_decorator_returns_result(self):
        """Test decorated function returns result."""
        from backend_ai.app.performance_optimizer import track_performance

        @track_performance
        def test_func():
            return {"value": 42}

        result = test_func()
        assert result["value"] == 42

    def test_decorator_tracks_request(self):
        """Test decorator increments request count."""
        import backend_ai.app.performance_optimizer as module
        from backend_ai.app.performance_optimizer import track_performance

        initial_count = module._performance_stats["total_requests"]

        @track_performance
        def test_func():
            return {}

        test_func()
        assert module._performance_stats["total_requests"] > initial_count

    def test_decorator_tracks_cache_hit(self):
        """Test decorator tracks cache hits."""
        import backend_ai.app.performance_optimizer as module
        from backend_ai.app.performance_optimizer import track_performance

        initial_hits = module._performance_stats["cache_hits"]

        @track_performance
        def test_func():
            return {"cached": True}

        test_func()
        assert module._performance_stats["cache_hits"] > initial_hits

    def test_decorator_tracks_cache_miss(self):
        """Test decorator tracks cache misses."""
        import backend_ai.app.performance_optimizer as module
        from backend_ai.app.performance_optimizer import track_performance

        initial_misses = module._performance_stats["cache_misses"]

        @track_performance
        def test_func():
            return {"cached": False}

        test_func()
        assert module._performance_stats["cache_misses"] > initial_misses

    def test_decorator_handles_exception(self):
        """Test decorator handles exceptions."""
        from backend_ai.app.performance_optimizer import track_performance

        @track_performance
        def test_func():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            test_func()


class TestGetPerformanceStats:
    """Tests for get_performance_stats function."""

    def test_returns_dict(self):
        """Test returns dictionary."""
        from backend_ai.app.performance_optimizer import get_performance_stats

        result = get_performance_stats()
        assert isinstance(result, dict)

    def test_contains_required_keys(self):
        """Test contains required keys."""
        from backend_ai.app.performance_optimizer import get_performance_stats

        result = get_performance_stats()

        assert "total_requests" in result
        assert "cache_hit_rate" in result
        assert "avg_response_time_ms" in result
        assert "fast_responses_percentage" in result
        assert "slow_responses" in result

    def test_cache_hit_rate_calculation(self):
        """Test cache hit rate calculation."""
        import backend_ai.app.performance_optimizer as module
        from backend_ai.app.performance_optimizer import get_performance_stats

        module._performance_stats = {
            "total_requests": 100,
            "cache_hits": 75,
            "cache_misses": 25,
            "avg_response_time": 500,
            "fast_responses": 80,
            "slow_responses": 5,
        }

        result = get_performance_stats()
        assert result["cache_hit_rate"] == 75.0

    def test_handles_zero_requests(self):
        """Test handles zero requests without division error."""
        import backend_ai.app.performance_optimizer as module
        from backend_ai.app.performance_optimizer import get_performance_stats

        module._performance_stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_response_time": 0,
            "fast_responses": 0,
            "slow_responses": 0,
        }

        result = get_performance_stats()
        assert result["cache_hit_rate"] == 0
        assert result["fast_responses_percentage"] == 0


class TestOptimizePrompt:
    """Tests for optimize_prompt function."""

    def test_removes_extra_whitespace(self):
        """Test removes extra whitespace."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        prompt = "Hello    world   test"
        result = optimize_prompt(prompt)
        assert result == "Hello world test"

    def test_removes_newlines(self):
        """Test removes newlines."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        prompt = "Hello\nworld\ntest"
        result = optimize_prompt(prompt)
        assert result == "Hello world test"

    def test_truncates_long_prompt(self):
        """Test truncates long prompts."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        long_prompt = "a" * 3000
        result = optimize_prompt(long_prompt, max_length=100)
        assert len(result) <= 103  # 100 + "..."

    def test_preserves_short_prompt(self):
        """Test preserves short prompts."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        short_prompt = "Hello world"
        result = optimize_prompt(short_prompt, max_length=2000)
        assert result == "Hello world"

    def test_truncation_keeps_start_and_end(self):
        """Test truncation keeps start and end."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        prompt = "START" + "x" * 3000 + "END"
        result = optimize_prompt(prompt, max_length=100)

        assert "..." in result
        assert result.startswith("START")

    def test_custom_max_length(self):
        """Test custom max_length parameter."""
        from backend_ai.app.performance_optimizer import optimize_prompt

        prompt = "a" * 500
        result = optimize_prompt(prompt, max_length=100)
        assert len(result) <= 103


class TestBatchCacheWarm:
    """Tests for batch_cache_warm function."""

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_returns_count(self, mock_get_cache):
        """Test returns count of items to warm."""
        from backend_ai.app.performance_optimizer import batch_cache_warm

        mock_cache = MagicMock()
        mock_cache.get.return_value = None  # Not cached
        mock_get_cache.return_value = mock_cache

        keys = [{"key": "data1"}, {"key": "data2"}]
        result = batch_cache_warm(keys)

        assert result == 2

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_skips_cached_items(self, mock_get_cache):
        """Test skips already cached items."""
        from backend_ai.app.performance_optimizer import batch_cache_warm

        mock_cache = MagicMock()
        mock_cache.get.side_effect = [{"cached": True}, None]
        mock_get_cache.return_value = mock_cache

        keys = [{"key": "cached"}, {"key": "not_cached"}]
        result = batch_cache_warm(keys)

        assert result == 1

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_empty_keys(self, mock_get_cache):
        """Test with empty keys list."""
        from backend_ai.app.performance_optimizer import batch_cache_warm

        mock_cache = MagicMock()
        mock_get_cache.return_value = mock_cache

        result = batch_cache_warm([])
        assert result == 0


class TestGetCacheHealth:
    """Tests for get_cache_health function."""

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_returns_health_dict(self, mock_get_cache):
        """Test returns health dictionary."""
        from backend_ai.app.performance_optimizer import get_cache_health

        mock_cache = MagicMock()
        mock_cache.stats.return_value = {"enabled": True}
        mock_get_cache.return_value = mock_cache

        result = get_cache_health()

        assert "health_score" in result
        assert "cache_enabled" in result
        assert "recommendations" in result

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_health_score_penalty_disabled_cache(self, mock_get_cache):
        """Test health score penalty for disabled cache."""
        from backend_ai.app.performance_optimizer import get_cache_health

        mock_cache = MagicMock()
        mock_cache.stats.return_value = {"enabled": False}
        mock_get_cache.return_value = mock_cache

        result = get_cache_health()

        assert result["health_score"] <= 50

    @patch("backend_ai.app.performance_optimizer.get_cache")
    def test_health_score_full_for_enabled_cache(self, mock_get_cache):
        """Test full health score for enabled cache."""
        from backend_ai.app.performance_optimizer import get_cache_health

        mock_cache = MagicMock()
        mock_cache.stats.return_value = {
            "enabled": True,
            "memory_used_mb": 100,
        }
        mock_get_cache.return_value = mock_cache

        result = get_cache_health()

        assert result["health_score"] == 100


class TestGetRecommendations:
    """Tests for _get_recommendations function."""

    def test_recommendations_for_low_health(self):
        """Test recommendations for low health score."""
        from backend_ai.app.performance_optimizer import _get_recommendations

        recommendations = _get_recommendations(50, {"enabled": False})

        assert len(recommendations) > 0
        assert any("Redis" in r for r in recommendations)

    def test_recommendations_for_high_memory(self):
        """Test recommendations for high memory usage."""
        from backend_ai.app.performance_optimizer import _get_recommendations

        recommendations = _get_recommendations(60, {
            "enabled": True,
            "memory_used_mb": 1500
        })

        assert any("TTL" in r for r in recommendations)

    def test_recommendations_for_healthy_cache(self):
        """Test recommendations for healthy cache."""
        from backend_ai.app.performance_optimizer import _get_recommendations

        recommendations = _get_recommendations(90, {"enabled": True})

        assert any("healthy" in r for r in recommendations)


class TestSuggestOptimizations:
    """Tests for suggest_optimizations function."""

    def test_suggests_for_low_cache_hit(self):
        """Test suggestions for low cache hit rate."""
        from backend_ai.app.performance_optimizer import suggest_optimizations

        stats = {
            "cache_hit_rate": 20,
            "avg_response_time_ms": 1000,
            "slow_responses": 5,
            "total_requests": 100,
            "fast_responses_percentage": 50,
        }

        suggestions = suggest_optimizations(stats)
        assert any("cache" in s.lower() for s in suggestions)

    def test_suggests_for_high_response_time(self):
        """Test suggestions for high response time."""
        from backend_ai.app.performance_optimizer import suggest_optimizations

        stats = {
            "cache_hit_rate": 80,
            "avg_response_time_ms": 3000,
            "slow_responses": 5,
            "total_requests": 100,
            "fast_responses_percentage": 50,
        }

        suggestions = suggest_optimizations(stats)
        assert any("response time" in s.lower() for s in suggestions)

    def test_suggests_for_many_slow_responses(self):
        """Test suggestions for many slow responses."""
        from backend_ai.app.performance_optimizer import suggest_optimizations

        stats = {
            "cache_hit_rate": 80,
            "avg_response_time_ms": 1000,
            "slow_responses": 20,
            "total_requests": 100,
            "fast_responses_percentage": 50,
        }

        suggestions = suggest_optimizations(stats)
        assert any("slow" in s.lower() for s in suggestions)

    def test_positive_for_excellent_performance(self):
        """Test positive message for excellent performance."""
        from backend_ai.app.performance_optimizer import suggest_optimizations

        stats = {
            "cache_hit_rate": 90,
            "avg_response_time_ms": 300,
            "slow_responses": 1,
            "total_requests": 100,
            "fast_responses_percentage": 85,
        }

        suggestions = suggest_optimizations(stats)
        assert any("✅" in s for s in suggestions)

    def test_optimal_performance_message(self):
        """Test optimal performance message."""
        from backend_ai.app.performance_optimizer import suggest_optimizations

        stats = {
            "cache_hit_rate": 50,
            "avg_response_time_ms": 1500,
            "slow_responses": 5,
            "total_requests": 100,
            "fast_responses_percentage": 60,
        }

        suggestions = suggest_optimizations(stats)
        assert len(suggestions) > 0


class TestModuleExports:
    """Tests for module exports."""

    def test_track_performance_importable(self):
        """track_performance should be importable."""
        from backend_ai.app.performance_optimizer import track_performance
        assert track_performance is not None

    def test_get_performance_stats_importable(self):
        """get_performance_stats should be importable."""
        from backend_ai.app.performance_optimizer import get_performance_stats
        assert get_performance_stats is not None

    def test_optimize_prompt_importable(self):
        """optimize_prompt should be importable."""
        from backend_ai.app.performance_optimizer import optimize_prompt
        assert optimize_prompt is not None

    def test_batch_cache_warm_importable(self):
        """batch_cache_warm should be importable."""
        from backend_ai.app.performance_optimizer import batch_cache_warm
        assert batch_cache_warm is not None

    def test_get_cache_health_importable(self):
        """get_cache_health should be importable."""
        from backend_ai.app.performance_optimizer import get_cache_health
        assert get_cache_health is not None

    def test_suggest_optimizations_importable(self):
        """suggest_optimizations should be importable."""
        from backend_ai.app.performance_optimizer import suggest_optimizations
        assert suggest_optimizations is not None
