"""
Unit tests for Redis Cache module.

Tests:
- RedisCache class initialization
- TTL presets and configuration
- Cache key generation
- Get/Set operations with memory fallback
- Cache clearing and statistics
- Global cache instance management
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
import json
import hashlib


class TestRedisCacheConstants:
    """Tests for RedisCache constants and TTL presets."""

    def test_ttl_presets_exist(self):
        """Test TTL presets are defined."""
        from backend_ai.app.redis_cache import RedisCache

        assert hasattr(RedisCache, "TTL_PRESETS")
        assert isinstance(RedisCache.TTL_PRESETS, dict)

    def test_ttl_presets_contain_expected_keys(self):
        """Test TTL presets contain all expected cache types."""
        from backend_ai.app.redis_cache import RedisCache

        expected_keys = ["astro", "saju", "tarot", "dream", "iching", "fusion", "static", "default"]
        for key in expected_keys:
            assert key in RedisCache.TTL_PRESETS

    def test_astro_ttl_is_24_hours(self):
        """Test astro TTL is 24 hours."""
        from backend_ai.app.redis_cache import RedisCache

        assert RedisCache.TTL_PRESETS["astro"] == 24 * 3600

    def test_saju_ttl_is_7_days(self):
        """Test saju TTL is 7 days."""
        from backend_ai.app.redis_cache import RedisCache

        assert RedisCache.TTL_PRESETS["saju"] == 7 * 24 * 3600

    def test_static_ttl_is_30_days(self):
        """Test static TTL is 30 days."""
        from backend_ai.app.redis_cache import RedisCache

        assert RedisCache.TTL_PRESETS["static"] == 30 * 24 * 3600

    def test_all_ttl_values_positive(self):
        """Test all TTL values are positive integers."""
        from backend_ai.app.redis_cache import RedisCache

        for key, value in RedisCache.TTL_PRESETS.items():
            assert isinstance(value, int)
            assert value > 0


class TestRedisCacheInit:
    """Tests for RedisCache initialization."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_init_without_redis(self):
        """Test initialization when Redis is not available."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        assert cache.enabled is False
        assert cache.client is None
        assert isinstance(cache.memory_cache, dict)

    def test_init_has_memory_cache(self):
        """Test initialization creates memory cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        assert hasattr(cache, "memory_cache")
        assert isinstance(cache.memory_cache, dict)

    def test_default_ttl_from_env(self):
        """Test default TTL from environment variable."""
        with patch.dict("os.environ", {"CACHE_TTL": "7200"}):
            from backend_ai.app.redis_cache import RedisCache

            cache = RedisCache()
            assert cache.default_ttl == 7200


class TestGetTtl:
    """Tests for get_ttl method."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_ttl_known_type(self):
        """Test getting TTL for known cache type."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        assert cache.get_ttl("astro") == 24 * 3600
        assert cache.get_ttl("saju") == 7 * 24 * 3600

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_ttl_unknown_type(self):
        """Test getting TTL for unknown type returns default."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.get_ttl("unknown_type")
        assert result == cache.default_ttl

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_ttl_default(self):
        """Test getting default TTL."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.get_ttl("default")
        assert result == 48 * 3600


class TestMakeKey:
    """Tests for _make_key method."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_make_key_basic(self):
        """Test basic key generation."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"user": "test", "date": "2024-01-01"}
        key = cache._make_key("test", data)

        assert key.startswith("fusion:test:")
        assert len(key) > len("fusion:test:")

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_make_key_consistent(self):
        """Test key generation is consistent for same data."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"user": "test", "date": "2024-01-01"}
        key1 = cache._make_key("test", data)
        key2 = cache._make_key("test", data)

        assert key1 == key2

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_make_key_different_data(self):
        """Test key generation differs for different data."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data1 = {"user": "test1"}
        data2 = {"user": "test2"}
        key1 = cache._make_key("test", data1)
        key2 = cache._make_key("test", data2)

        assert key1 != key2

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_make_key_order_independent(self):
        """Test key generation is order independent."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data1 = {"a": 1, "b": 2}
        data2 = {"b": 2, "a": 1}
        key1 = cache._make_key("test", data1)
        key2 = cache._make_key("test", data2)

        assert key1 == key2

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_make_key_uses_sha256(self):
        """Test key uses SHA256 hash."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"test": "data"}
        key = cache._make_key("prefix", data)

        # Should be prefix + 16 char hash
        assert len(key.split(":")[-1]) == 16


class TestMemoryCacheGet:
    """Tests for cache get with memory fallback."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_from_memory(self):
        """Test getting from memory cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.memory_cache["test_key"] = {"result": "data"}

        result = cache.get("test_key")
        assert result == {"result": "data"}

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_miss(self):
        """Test cache miss returns None."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.get("nonexistent_key")
        assert result is None

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_get_with_prefix_and_data(self):
        """Test get with prefix and data style."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"user": "test"}
        key = cache._make_key("prefix", data)
        cache.memory_cache[key] = {"result": "found"}

        result = cache.get("prefix", data)
        assert result == {"result": "found"}


class TestMemoryCacheSet:
    """Tests for cache set with memory fallback."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_set_direct_key(self):
        """Test setting with direct key."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.set("test_key", {"data": "value"})

        assert result is True
        assert "test_key" in cache.memory_cache
        assert cache.memory_cache["test_key"] == {"data": "value"}

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_set_prefix_style(self):
        """Test setting with prefix and data style."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"user": "test"}
        result_data = {"computed": "result"}

        success = cache.set("prefix", data, result_data)
        assert success is True

        # Verify via get
        retrieved = cache.get("prefix", data)
        assert retrieved == result_data

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_set_respects_size_limit(self):
        """Test memory cache respects size limit."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()

        # Fill cache to limit
        for i in range(500):
            cache.memory_cache[f"key_{i}"] = {"data": i}

        assert len(cache.memory_cache) == 500

        # Adding one more should trigger eviction
        cache.set("new_key", {"new": "data"})
        assert "new_key" in cache.memory_cache
        # After eviction, should have around 401 entries (500 - 100 + 1)
        assert len(cache.memory_cache) < 500

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_set_with_ttl(self):
        """Test set with custom TTL (for memory, TTL is ignored but call succeeds)."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        result = cache.set("test_key", {"data": "value"}, ttl=3600)

        assert result is True


class TestCacheClear:
    """Tests for cache clear method."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_clear_memory_cache(self):
        """Test clearing memory cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.memory_cache["key1"] = {"data": 1}
        cache.memory_cache["key2"] = {"data": 2}

        cleared = cache.clear()
        assert cleared == 2
        assert len(cache.memory_cache) == 0

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_clear_empty_cache(self):
        """Test clearing empty cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cleared = cache.clear()
        assert cleared == 0


class TestCacheStats:
    """Tests for cache stats method."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_stats_memory_backend(self):
        """Test stats with memory backend."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.memory_cache["key1"] = {"data": 1}
        cache.memory_cache["key2"] = {"data": 2}

        stats = cache.stats()

        assert stats["enabled"] is False
        assert stats["backend"] == "memory"
        assert stats["memory_entries"] == 2
        assert "default_ttl" in stats
        assert "ttl_presets" in stats

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_stats_includes_ttl_presets(self):
        """Test stats includes TTL presets."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        stats = cache.stats()

        assert "ttl_presets" in stats
        assert isinstance(stats["ttl_presets"], dict)
        assert "astro" in stats["ttl_presets"]


class TestRedisConnection:
    """Tests for Redis connection handling."""

    def test_redis_available_flag_exists(self):
        """Test REDIS_AVAILABLE flag exists."""
        from backend_ai.app.redis_cache import REDIS_AVAILABLE
        assert isinstance(REDIS_AVAILABLE, bool)

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", True)
    def test_init_with_redis_connection_failure(self):
        """Test initialization handles Redis connection failure gracefully."""
        with patch("backend_ai.app.redis_cache.redis") as mock_redis, \
             patch("backend_ai.app.redis_cache.ConnectionPool") as mock_pool:
            mock_client = MagicMock()
            mock_client.ping.side_effect = Exception("Connection refused")
            mock_redis.Redis.return_value = mock_client

            from backend_ai.app.redis_cache import RedisCache

            cache = RedisCache()
            # Should fall back to memory cache
            assert cache.enabled is False or cache.client is None


class TestGetCache:
    """Tests for get_cache function."""

    def test_get_cache_returns_instance(self):
        """Test get_cache returns a RedisCache instance."""
        # Reset global cache first
        import backend_ai.app.redis_cache as cache_module
        cache_module._cache = None

        from backend_ai.app.redis_cache import get_cache, RedisCache

        cache = get_cache()
        assert isinstance(cache, RedisCache)

    def test_get_cache_singleton(self):
        """Test get_cache returns same instance."""
        # Reset global cache first
        import backend_ai.app.redis_cache as cache_module
        cache_module._cache = None

        from backend_ai.app.redis_cache import get_cache

        cache1 = get_cache()
        cache2 = get_cache()
        assert cache1 is cache2


class TestRedisOperations:
    """Tests for Redis operations with mocked Redis client."""

    def test_get_from_redis(self):
        """Test getting value from Redis."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()
        cache.client.get.return_value = '{"result": "from_redis"}'

        result = cache.get("test_key")
        assert result == {"result": "from_redis"}
        cache.client.get.assert_called_once_with("test_key")

    def test_get_redis_error_falls_back(self):
        """Test Redis error falls back to memory."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()
        cache.client.get.side_effect = Exception("Redis error")
        cache.memory_cache["test_key"] = {"result": "from_memory"}

        result = cache.get("test_key")
        assert result == {"result": "from_memory"}

    def test_set_to_redis(self):
        """Test setting value to Redis."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()

        result = cache.set("test_key", {"data": "value"}, ttl=3600)

        assert result is True
        cache.client.setex.assert_called_once()
        call_args = cache.client.setex.call_args
        assert call_args[0][0] == "test_key"
        assert call_args[0][1] == 3600

    def test_set_redis_error_falls_back(self):
        """Test Redis set error falls back to memory."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()
        cache.client.setex.side_effect = Exception("Redis error")

        result = cache.set("test_key", {"data": "value"})

        assert result is True  # Should succeed with memory fallback
        assert "test_key" in cache.memory_cache

    def test_clear_redis(self):
        """Test clearing Redis cache."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()
        cache.client.keys.return_value = ["key1", "key2", "key3"]
        cache.client.delete.return_value = 3

        cleared = cache.clear("fusion:*")
        assert cleared == 3

    def test_stats_with_redis(self):
        """Test stats with Redis enabled."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        cache.enabled = True
        cache.client = MagicMock()
        cache.client.info.return_value = {"keyspace_hits": 100, "keyspace_misses": 10}
        cache.client.dbsize.return_value = 50

        stats = cache.stats()

        assert stats["backend"] == "redis"
        assert stats["redis_keys"] == 50
        assert stats["redis_hits"] == 100
        assert stats["redis_misses"] == 10


class TestModuleExports:
    """Tests for module exports."""

    def test_redis_cache_importable(self):
        """RedisCache should be importable."""
        from backend_ai.app.redis_cache import RedisCache
        assert RedisCache is not None

    def test_get_cache_importable(self):
        """get_cache should be importable."""
        from backend_ai.app.redis_cache import get_cache
        assert get_cache is not None

    def test_redis_available_importable(self):
        """REDIS_AVAILABLE should be importable."""
        from backend_ai.app.redis_cache import REDIS_AVAILABLE
        assert isinstance(REDIS_AVAILABLE, bool)


class TestCacheKeyHashConsistency:
    """Tests for cache key hash consistency."""

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_hash_truncation(self):
        """Test hash is truncated to 16 characters."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"very": "long", "data": "structure", "with": "many", "keys": "inside"}
        key = cache._make_key("test", data)

        hash_part = key.split(":")[-1]
        assert len(hash_part) == 16

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_special_characters_in_data(self):
        """Test handling of special characters in data."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {"text": "한글 テスト émojis 🎉", "symbols": "!@#$%^&*()"}
        key = cache._make_key("test", data)

        # Should not raise and should produce valid key
        assert key.startswith("fusion:test:")
        assert len(key.split(":")[-1]) == 16

    @patch("backend_ai.app.redis_cache.REDIS_AVAILABLE", False)
    def test_nested_data_structures(self):
        """Test handling of nested data structures."""
        from backend_ai.app.redis_cache import RedisCache

        cache = RedisCache()
        data = {
            "level1": {
                "level2": {
                    "level3": ["a", "b", "c"]
                }
            }
        }
        key = cache._make_key("test", data)

        assert key.startswith("fusion:test:")
