"""
Unit tests for backend_ai/app/redis_cache.py

Tests:
- CircuitBreaker class
- RedisCache class with in-memory fallback
- TTL presets and caching operations
- RAG-specific caching methods
"""
import pytest
import time
from unittest.mock import patch, MagicMock


class TestCircuitBreaker:
    """Tests for CircuitBreaker class."""

    def test_initial_state(self):
        """Circuit breaker should start closed."""
        from backend_ai.app.redis_cache import CircuitBreaker

        cb = CircuitBreaker()
        assert cb.is_open is False
        assert cb.failures == 0
        assert cb.allow_request() is True

    def test_record_failure(self):
        """Should record failures and open circuit."""
        from backend_ai.app.redis_cache import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3)

        cb.record_failure()
        assert cb.failures == 1
        assert cb.is_open is False

        cb.record_failure()
        assert cb.failures == 2
        assert cb.is_open is False

        cb.record_failure()
        assert cb.failures == 3
        assert cb.is_open is True

    def test_record_success_resets(self):
        """Success should reset failure count and close circuit."""
        from backend_ai.app.redis_cache import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3)

        # Record some failures
        cb.record_failure()
        cb.record_failure()
        assert cb.failures == 2

        # Success resets
        cb.record_success()
        assert cb.failures == 0
        assert cb.is_open is False

    def test_open_circuit_denies_requests(self):
        """Open circuit should deny requests."""
        from backend_ai.app.redis_cache import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=2, reset_timeout=100)

        # Open the circuit
        cb.record_failure()
        cb.record_failure()
        assert cb.is_open is True
        assert cb.allow_request() is False

    def test_circuit_reset_after_timeout(self):
        """Circuit should reset after timeout."""
        from backend_ai.app.redis_cache import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=2, reset_timeout=0.1)

        # Open the circuit
        cb.record_failure()
        cb.record_failure()
        assert cb.is_open is True

        # Wait for reset timeout
        time.sleep(0.15)

        # Should allow request again
        assert cb.allow_request() is True
        assert cb.is_open is False


class TestRedisCacheTTLPresets:
    """Tests for RedisCache TTL presets."""

    def test_ttl_presets_exist(self):
        """TTL presets should be defined."""
        from backend_ai.app.redis_cache import RedisCache

        assert "astro" in RedisCache.TTL_PRESETS
        assert "saju" in RedisCache.TTL_PRESETS
        assert "tarot" in RedisCache.TTL_PRESETS
        assert "rag" in RedisCache.TTL_PRESETS
        assert "default" in RedisCache.TTL_PRESETS

    def test_get_ttl_known_type(self):
        """Should return correct TTL for known types."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        assert cache.get_ttl("astro") == 24 * 3600
        assert cache.get_ttl("saju") == 7 * 24 * 3600
        assert cache.get_ttl("rag") == 5 * 60

    def test_get_ttl_unknown_type(self):
        """Should return default TTL for unknown types."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        ttl = cache.get_ttl("unknown_type")
        assert ttl == cache.default_ttl


class TestRedisCacheInMemoryFallback:
    """Tests for RedisCache in-memory fallback."""

    def test_cache_creation(self):
        """Should create cache instance."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        assert cache is not None
        assert isinstance(cache.memory_cache, dict)

    def test_make_key(self):
        """Should generate consistent cache keys."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        data = {"year": 1990, "month": 5}
        key1 = cache._make_key("test", data)
        key2 = cache._make_key("test", data)

        assert key1 == key2
        assert key1.startswith("fusion:test:")
        assert len(key1) > len("fusion:test:")

    def test_make_key_different_data(self):
        """Different data should generate different keys."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        key1 = cache._make_key("test", {"a": 1})
        key2 = cache._make_key("test", {"a": 2})

        assert key1 != key2

    def test_set_and_get_direct_key(self):
        """Should set and get with direct key."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        # Use direct key style
        cache.set("test:direct:key", {"result": "value"}, ttl=3600)
        result = cache.get("test:direct:key")

        assert result == {"result": "value"}

    def test_set_and_get_prefix_style(self):
        """Should set and get with prefix+data style."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        data = {"year": 1990}
        cache.set("test_prefix", data, {"result": "prefix_value"}, cache_type="default")
        result = cache.get("test_prefix", data)

        assert result == {"result": "prefix_value"}

    def test_get_nonexistent_key(self):
        """Should return None for nonexistent key."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.get("nonexistent:key:12345")
        assert result is None

    def test_memory_cache_lru_eviction(self):
        """Should evict old entries when cache is full."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.memory_cache.clear()

        # Fill cache to limit
        for i in range(550):
            cache.set(f"lru:test:{i}", {"value": i}, ttl=3600)

        # Should have evicted some entries (LRU eviction at 500)
        assert len(cache.memory_cache) <= 500


class TestRedisCacheStats:
    """Tests for cache statistics."""

    def test_stats_structure(self):
        """Stats should have correct structure."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        stats = cache.stats()

        assert "enabled" in stats
        assert "backend" in stats
        assert "memory_entries" in stats
        assert "local_hits" in stats
        assert "local_misses" in stats
        assert "local_errors" in stats
        assert "circuit_breaker_open" in stats

    def test_hit_miss_tracking(self):
        """Should track hits and misses."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache._hits = 0
        cache._misses = 0

        # Set a value
        cache.set("hit:test", {"data": 1}, ttl=3600)

        # Get existing (hit)
        cache.get("hit:test")
        assert cache._hits == 1

        # Get nonexistent (miss)
        cache.get("nonexistent:key")
        assert cache._misses == 1


class TestRedisCacheRAGMethods:
    """Tests for RAG-specific caching methods."""

    def test_set_and_get_rag_result(self):
        """Should cache RAG results."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        query_hash = "abc123hash"
        result = {"chunks": ["chunk1", "chunk2"], "score": 0.95}

        cache.set_rag_result(query_hash, result)
        retrieved = cache.get_rag_result(query_hash)

        assert retrieved == result

    def test_set_and_get_embedding_cache(self):
        """Should cache embeddings."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        text_hash = "text_hash_123"
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]

        cache.set_embedding_cache(text_hash, embedding)
        retrieved = cache.get_embedding_cache(text_hash)

        assert retrieved == embedding


class TestRedisCacheClear:
    """Tests for cache clearing."""

    def test_clear_memory_cache(self):
        """Should clear memory cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        # Add some entries
        cache.set("clear:test:1", {"data": 1}, ttl=3600)
        cache.set("clear:test:2", {"data": 2}, ttl=3600)

        assert len(cache.memory_cache) >= 2

        # Clear
        cleared = cache.clear()
        assert cleared >= 2
        assert len(cache.memory_cache) == 0


class TestGetCacheSingleton:
    """Tests for get_cache singleton function."""

    def test_get_cache_returns_instance(self):
        """Should return cache instance."""
        from backend_ai.app.redis_cache import get_cache

        cache = get_cache()
        assert cache is not None

    def test_get_cache_returns_same_instance(self):
        """Should return same singleton instance."""
        from backend_ai.app.redis_cache import get_cache

        cache1 = get_cache()
        cache2 = get_cache()
        assert cache1 is cache2


class TestModuleExports:
    """Tests for module exports."""

    def test_redis_cache_importable(self):
        """RedisCache should be importable."""
        from backend_ai.app.redis_cache import RedisCache
        assert callable(RedisCache)

    def test_circuit_breaker_importable(self):
        """CircuitBreaker should be importable."""
        from backend_ai.app.redis_cache import CircuitBreaker
        assert callable(CircuitBreaker)

    def test_get_cache_importable(self):
        """get_cache should be importable."""
        from backend_ai.app.redis_cache import get_cache
        assert callable(get_cache)

    def test_redis_available_constant(self):
        """REDIS_AVAILABLE should be accessible."""
        from backend_ai.app.redis_cache import REDIS_AVAILABLE
        assert isinstance(REDIS_AVAILABLE, bool)

