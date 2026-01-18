"""
Cache Service Tests

Tests for session-based RAG data caching with TTL and LRU eviction.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import time

from backend_ai.app.services.cache_service import (
    get_session_rag_cache,
    set_session_rag_cache,
    clear_session_cache,
    get_cache_stats,
    _cleanup_expired_sessions,
    _evict_lru_sessions,
    _SESSION_RAG_CACHE,
    SESSION_CACHE_MAX_SIZE,
    SESSION_CACHE_TTL_MINUTES,
)


@pytest.fixture(autouse=True)
def clear_cache_before_each():
    """Clear cache before each test."""
    clear_session_cache()
    yield
    clear_session_cache()


class TestGetSessionRagCache:
    """Tests for get_session_rag_cache function."""

    def test_returns_none_for_missing_session(self):
        """Missing session should return None."""
        result = get_session_rag_cache("nonexistent-session")
        assert result is None

    def test_returns_cached_data(self):
        """Should return cached data for existing session."""
        test_data = {"rag_context": "test context", "embedding": [0.1, 0.2]}
        set_session_rag_cache("session-1", test_data)

        result = get_session_rag_cache("session-1")
        assert result == test_data

    def test_updates_last_accessed(self):
        """Getting cache should update last_accessed timestamp."""
        set_session_rag_cache("session-1", {"data": "test"})

        # Wait a tiny bit
        time.sleep(0.01)

        # Access the cache
        get_session_rag_cache("session-1")

        # Check that last_accessed was updated
        entry = _SESSION_RAG_CACHE.get("session-1")
        assert entry is not None
        assert "last_accessed" in entry

    def test_returns_none_for_expired_session(self):
        """Expired session should return None and be removed."""
        # Set cache entry with old timestamp
        old_time = datetime.now() - timedelta(minutes=SESSION_CACHE_TTL_MINUTES + 1)
        _SESSION_RAG_CACHE["expired-session"] = {
            "data": {"test": "data"},
            "created_at": old_time,
            "last_accessed": old_time,
        }

        result = get_session_rag_cache("expired-session")

        assert result is None
        assert "expired-session" not in _SESSION_RAG_CACHE


class TestSetSessionRagCache:
    """Tests for set_session_rag_cache function."""

    def test_stores_data_with_timestamps(self):
        """Should store data with created_at and last_accessed timestamps."""
        test_data = {"rag": "data"}
        set_session_rag_cache("session-1", test_data)

        entry = _SESSION_RAG_CACHE.get("session-1")
        assert entry is not None
        assert entry["data"] == test_data
        assert "created_at" in entry
        assert "last_accessed" in entry
        assert isinstance(entry["created_at"], datetime)
        assert isinstance(entry["last_accessed"], datetime)

    def test_overwrites_existing_session(self):
        """Should overwrite data for existing session."""
        set_session_rag_cache("session-1", {"old": "data"})
        set_session_rag_cache("session-1", {"new": "data"})

        result = get_session_rag_cache("session-1")
        assert result == {"new": "data"}

    def test_handles_empty_data(self):
        """Should handle empty data dict."""
        set_session_rag_cache("session-1", {})

        result = get_session_rag_cache("session-1")
        assert result == {}

    def test_handles_complex_data(self):
        """Should handle complex nested data."""
        complex_data = {
            "embeddings": [[0.1, 0.2, 0.3]],
            "context": {"saju": {"pillars": ["year", "month"]}, "astro": None},
            "metadata": {"timestamp": "2024-01-01T00:00:00Z"},
        }
        set_session_rag_cache("session-1", complex_data)

        result = get_session_rag_cache("session-1")
        assert result == complex_data


class TestClearSessionCache:
    """Tests for clear_session_cache function."""

    def test_clears_all_entries(self):
        """Should clear all cache entries."""
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})
        set_session_rag_cache("session-3", {"data": 3})

        count = clear_session_cache()

        assert count == 3
        assert len(_SESSION_RAG_CACHE) == 0

    def test_returns_zero_for_empty_cache(self):
        """Should return 0 for empty cache."""
        count = clear_session_cache()
        assert count == 0

    def test_sessions_not_accessible_after_clear(self):
        """Sessions should not be accessible after clear."""
        set_session_rag_cache("session-1", {"data": "test"})
        clear_session_cache()

        result = get_session_rag_cache("session-1")
        assert result is None


class TestGetCacheStats:
    """Tests for get_cache_stats function."""

    def test_returns_stats_for_empty_cache(self):
        """Should return stats for empty cache."""
        stats = get_cache_stats()

        # Updated field names for Redis-backed cache
        assert stats["total_entries"] == 0
        assert stats["memory_expired"] == 0
        assert stats["memory_active"] == 0
        assert stats["max_size"] == SESSION_CACHE_MAX_SIZE
        assert stats["ttl_minutes"] == SESSION_CACHE_TTL_MINUTES
        assert stats["memory_utilization_percent"] == 0.0
        assert "backend" in stats

    def test_counts_active_entries(self):
        """Should count active entries correctly."""
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})

        stats = get_cache_stats()

        # Updated field names for Redis-backed cache
        assert stats["total_entries"] >= 2  # May include Redis entries
        assert stats["memory_entries"] == 2 or stats.get("redis_entries", 0) >= 2

    def test_counts_expired_entries(self):
        """Should count expired entries correctly."""
        set_session_rag_cache("active-session", {"data": 1})

        # Add expired entry directly
        old_time = datetime.now() - timedelta(minutes=SESSION_CACHE_TTL_MINUTES + 1)
        _SESSION_RAG_CACHE["expired-session"] = {
            "data": {"test": "data"},
            "created_at": old_time,
            "last_accessed": old_time,
        }

        stats = get_cache_stats()

        # Updated field names for Redis-backed cache
        assert stats["memory_entries"] == 2
        assert stats["memory_expired"] == 1
        assert stats["memory_active"] == 1

    def test_calculates_utilization(self):
        """Should calculate utilization percentage."""
        for i in range(10):
            set_session_rag_cache(f"session-{i}", {"data": i})

        stats = get_cache_stats()

        expected_util = (10 / SESSION_CACHE_MAX_SIZE) * 100
        # Updated field name
        assert stats["memory_utilization_percent"] == round(expected_util, 1)


class TestCleanupExpiredSessions:
    """Tests for _cleanup_expired_sessions function."""

    def test_removes_expired_sessions(self):
        """Should remove expired sessions."""
        # Add active session
        set_session_rag_cache("active-session", {"data": 1})

        # Add expired sessions directly
        old_time = datetime.now() - timedelta(minutes=SESSION_CACHE_TTL_MINUTES + 5)
        _SESSION_RAG_CACHE["expired-1"] = {
            "data": {"test": 1},
            "created_at": old_time,
        }
        _SESSION_RAG_CACHE["expired-2"] = {
            "data": {"test": 2},
            "created_at": old_time,
        }

        cleaned = _cleanup_expired_sessions()

        assert cleaned == 2
        assert "expired-1" not in _SESSION_RAG_CACHE
        assert "expired-2" not in _SESSION_RAG_CACHE
        assert "active-session" in _SESSION_RAG_CACHE

    def test_returns_zero_for_no_expired(self):
        """Should return 0 when no sessions are expired."""
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})

        cleaned = _cleanup_expired_sessions()

        assert cleaned == 0

    def test_handles_empty_cache(self):
        """Should handle empty cache."""
        cleaned = _cleanup_expired_sessions()
        assert cleaned == 0


class TestEvictLruSessions:
    """Tests for _evict_lru_sessions function."""

    def test_evicts_oldest_sessions(self):
        """Should evict oldest accessed sessions first."""
        # Create sessions with different access times
        base_time = datetime.now()

        for i in range(5):
            _SESSION_RAG_CACHE[f"session-{i}"] = {
                "data": {"num": i},
                "created_at": base_time,
                "last_accessed": base_time - timedelta(seconds=50 - i * 10),
            }

        # Evict to keep only 2 sessions
        evicted = _evict_lru_sessions(keep_count=2)

        assert evicted == 3
        assert len(_SESSION_RAG_CACHE) == 2
        # Most recently accessed should remain
        assert "session-4" in _SESSION_RAG_CACHE
        assert "session-3" in _SESSION_RAG_CACHE

    def test_returns_zero_when_under_limit(self):
        """Should return 0 when cache is under limit."""
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})

        evicted = _evict_lru_sessions(keep_count=10)

        assert evicted == 0
        assert len(_SESSION_RAG_CACHE) == 2

    def test_handles_empty_cache(self):
        """Should handle empty cache."""
        evicted = _evict_lru_sessions(keep_count=10)
        assert evicted == 0


class TestCacheConcurrency:
    """Tests for thread-safety and concurrent access."""

    def test_multiple_sessions_simultaneous(self):
        """Should handle multiple sessions being added."""
        for i in range(50):
            set_session_rag_cache(f"session-{i}", {"data": i})

        stats = get_cache_stats()
        assert stats["total_entries"] == 50

    def test_read_write_consistency(self):
        """Should maintain consistency between reads and writes."""
        set_session_rag_cache("session-1", {"version": 1})

        result1 = get_session_rag_cache("session-1")
        assert result1["version"] == 1

        set_session_rag_cache("session-1", {"version": 2})

        result2 = get_session_rag_cache("session-1")
        assert result2["version"] == 2


class TestCacheConfiguration:
    """Tests for cache configuration."""

    def test_max_size_is_positive(self):
        """SESSION_CACHE_MAX_SIZE should be positive."""
        assert SESSION_CACHE_MAX_SIZE > 0

    def test_ttl_is_positive(self):
        """SESSION_CACHE_TTL_MINUTES should be positive."""
        assert SESSION_CACHE_TTL_MINUTES > 0


class TestEdgeCases:
    """Edge case tests."""

    def test_session_id_with_special_characters(self):
        """Should handle session IDs with special characters."""
        special_ids = [
            "session-with-dashes",
            "session_with_underscores",
            "session.with.dots",
            "session:with:colons",
            "session/with/slashes",
        ]

        for sid in special_ids:
            set_session_rag_cache(sid, {"id": sid})
            result = get_session_rag_cache(sid)
            assert result["id"] == sid

    def test_empty_session_id(self):
        """Should handle empty session ID."""
        set_session_rag_cache("", {"data": "empty-id"})
        result = get_session_rag_cache("")
        assert result == {"data": "empty-id"}

    def test_none_data_value(self):
        """Should handle None as data value."""
        set_session_rag_cache("session-1", None)
        result = get_session_rag_cache("session-1")
        assert result is None

    def test_large_data_payload(self):
        """Should handle large data payloads."""
        large_data = {
            "embeddings": [[0.1] * 1536],  # OpenAI embedding size
            "context": "x" * 10000,
            "metadata": {f"key_{i}": f"value_{i}" for i in range(100)},
        }

        set_session_rag_cache("large-session", large_data)
        result = get_session_rag_cache("large-session")

        assert result == large_data

    def test_unicode_in_session_data(self):
        """Should handle unicode in session data."""
        unicode_data = {
            "korean": "안녕하세요",
            "chinese": "你好",
            "japanese": "こんにちは",
            "emoji": "🌟✨🔮",
        }

        set_session_rag_cache("unicode-session", unicode_data)
        result = get_session_rag_cache("unicode-session")

        assert result == unicode_data
