"""Redis caching layer for fusion results."""

import os
import json
import hashlib
import logging
from typing import Optional, Any

logger = logging.getLogger("backend_ai.cache")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not installed. Caching disabled.")


class RedisCache:
    """Redis-based distributed cache with fallback to memory."""

    def __init__(self):
        self.enabled = False
        self.client = None
        self.memory_cache = {}  # Fallback
        self.ttl = int(os.getenv("CACHE_TTL", "900"))  # 15 minutes default

        if REDIS_AVAILABLE:
            self._init_redis()

    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2,
                retry_on_timeout=True,
            )
            # Test connection
            self.client.ping()
            self.enabled = True
            logger.info(f"✅ Redis connected: {redis_url}")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Using memory cache.")
            self.client = None
            self.enabled = False

    def _make_key(self, prefix: str, data: dict) -> str:
        """Generate cache key from data hash."""
        # Sort and serialize for consistent hashing
        serialized = json.dumps(data, sort_keys=True)
        hash_digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"fusion:{prefix}:{hash_digest}"

    def get(self, prefix: str, data: dict) -> Optional[dict]:
        """Get cached result."""
        key = self._make_key(prefix, data)

        # Try Redis first
        if self.enabled and self.client:
            try:
                cached = self.client.get(key)
                if cached:
                    logger.info(f"✅ Redis cache HIT: {key}")
                    return json.loads(cached)
            except Exception as e:
                logger.warning(f"⚠️ Redis GET error: {e}")

        # Fallback to memory
        if key in self.memory_cache:
            logger.info(f"✅ Memory cache HIT: {key}")
            return self.memory_cache[key]

        logger.info(f"❌ Cache MISS: {key}")
        return None

    def set(self, prefix: str, data: dict, result: dict) -> bool:
        """Store result in cache."""
        key = self._make_key(prefix, data)

        # Try Redis first
        if self.enabled and self.client:
            try:
                self.client.setex(
                    key,
                    self.ttl,
                    json.dumps(result)
                )
                logger.info(f"✅ Redis cache SET: {key} (TTL={self.ttl}s)")
                return True
            except Exception as e:
                logger.warning(f"⚠️ Redis SET error: {e}")

        # Fallback to memory (with size limit)
        if len(self.memory_cache) < 100:  # Max 100 entries
            self.memory_cache[key] = result
            logger.info(f"✅ Memory cache SET: {key}")
            return True

        return False

    def clear(self, pattern: str = "fusion:*") -> int:
        """Clear cache entries matching pattern."""
        if self.enabled and self.client:
            try:
                keys = self.client.keys(pattern)
                if keys:
                    deleted = self.client.delete(*keys)
                    logger.info(f"🗑️ Cleared {deleted} Redis keys")
                    return deleted
            except Exception as e:
                logger.warning(f"⚠️ Redis CLEAR error: {e}")

        # Clear memory cache
        cleared = len(self.memory_cache)
        self.memory_cache.clear()
        logger.info(f"🗑️ Cleared {cleared} memory cache entries")
        return cleared

    def stats(self) -> dict:
        """Get cache statistics."""
        stats = {
            "enabled": self.enabled,
            "backend": "redis" if self.enabled else "memory",
            "memory_entries": len(self.memory_cache),
            "ttl": self.ttl,
        }

        if self.enabled and self.client:
            try:
                info = self.client.info("stats")
                stats["redis_keys"] = self.client.dbsize()
                stats["redis_hits"] = info.get("keyspace_hits", 0)
                stats["redis_misses"] = info.get("keyspace_misses", 0)
            except Exception as e:
                logger.warning(f"⚠️ Redis STATS error: {e}")

        return stats


# Global cache instance
_cache = None

def get_cache() -> RedisCache:
    """Get or create global cache instance."""
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache
