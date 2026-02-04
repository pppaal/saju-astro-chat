"""
Redis caching layer for fusion results.

Enhanced with:
- Connection pooling for better performance
- RAG result caching with optimized TTLs
- Async-friendly operations
- Circuit breaker for resilience
"""

import os
import json
import hashlib
import logging
import time
from threading import Lock
from typing import Optional, Any, Dict

logger = logging.getLogger("backend_ai.cache")

try:
    import redis
    from redis.connection import ConnectionPool
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not installed. Caching disabled.")


class CircuitBreaker:
    """Simple circuit breaker for Redis resilience."""

    def __init__(self, failure_threshold: int = 3, reset_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.is_open = False
        self._lock = Lock()

    def record_failure(self) -> None:
        """Record a failure and potentially open the circuit."""
        with self._lock:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.is_open = True
                logger.warning(f"[CircuitBreaker] Circuit OPEN after {self.failures} failures")

    def record_success(self) -> None:
        """Record a success and reset the circuit."""
        with self._lock:
            self.failures = 0
            self.is_open = False

    def allow_request(self) -> bool:
        """Check if a request should be allowed."""
        with self._lock:
            if not self.is_open:
                return True

            # Check if reset timeout has passed
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.is_open = False
                self.failures = 0
                logger.info("[CircuitBreaker] Circuit CLOSED (timeout reset)")
                return True

            return False


class RedisCache:
    """
    Redis-based distributed cache with connection pooling and fallback to memory.

    Performance optimizations:
    - Connection pooling (reuse connections across requests)
    - Circuit breaker (prevent cascade failures)
    - Optimized TTLs for different data types
    - RAG-specific caching with LRU fallback
    """

    # TTL presets for different data types (in seconds)
    # Optimized for speed: longer cache = faster repeated queries
    TTL_PRESETS = {
        "astro": 24 * 3600,        # 24 hours - transits change daily
        "saju": 7 * 24 * 3600,     # 7 days - static birth data (never changes)
        "tarot": 48 * 3600,        # 48 hours - readings stay relevant
        "dream": 48 * 3600,        # 48 hours
        "iching": 48 * 3600,       # 48 hours
        "fusion": 24 * 3600,       # 24 hours - combined analysis
        "static": 30 * 24 * 3600,  # 30 days - interpretation rules never change
        "rag": 5 * 60,             # 5 minutes - RAG query results (short for freshness)
        "rag_embedding": 24 * 3600,  # 24 hours - embedding results (stable)
        "default": 48 * 3600,      # 48 hours - default fallback
    }

    # Connection pool settings
    POOL_MAX_CONNECTIONS = 10
    POOL_TIMEOUT = 5

    def __init__(self):
        self.enabled = False
        self.client = None
        self._pool: Optional[ConnectionPool] = None
        self.memory_cache: Dict[str, Any] = {}  # Fallback
        self._memory_timestamps: Dict[str, float] = {}  # For TTL tracking
        self.default_ttl = int(os.getenv("CACHE_TTL", "86400"))  # 24 hours default
        self._circuit_breaker = CircuitBreaker()
        self._lock = Lock()

        # Performance metrics
        self._hits = 0
        self._misses = 0
        self._errors = 0

        if REDIS_AVAILABLE:
            self._init_redis()

    def get_ttl(self, cache_type: str = "default") -> int:
        """Get TTL for a specific cache type."""
        return self.TTL_PRESETS.get(cache_type, self.default_ttl)

    def _init_redis(self):
        """Initialize Redis connection with connection pooling."""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

            # Create connection pool for better performance
            self._pool = ConnectionPool.from_url(
                redis_url,
                max_connections=self.POOL_MAX_CONNECTIONS,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30,  # Periodic health checks
            )

            self.client = redis.Redis(connection_pool=self._pool)

            # Test connection
            self.client.ping()
            self.enabled = True
            logger.info(f"✅ Redis connected with pool: {redis_url} (max={self.POOL_MAX_CONNECTIONS})")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Using memory cache.")
            self.client = None
            self._pool = None
            self.enabled = False

    def _make_key(self, prefix: str, data: dict) -> str:
        """Generate cache key from data hash."""
        # Sort and serialize for consistent hashing
        serialized = json.dumps(data, sort_keys=True)
        hash_digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"fusion:{prefix}:{hash_digest}"

    def get(self, key_or_prefix: str, data: dict = None) -> Optional[dict]:
        """Get cached result. Supports both direct key and prefix+data styles."""
        # If data is None, treat key_or_prefix as direct key
        if data is None:
            key = key_or_prefix
        else:
            key = self._make_key(key_or_prefix, data)

        # Try Redis first (with circuit breaker)
        if self.enabled and self.client and self._circuit_breaker.allow_request():
            try:
                cached = self.client.get(key)
                if cached:
                    self._hits += 1
                    self._circuit_breaker.record_success()
                    logger.debug(f"✅ Redis cache HIT: {key[:50]}...")
                    return json.loads(cached)
                self._misses += 1
            except Exception as e:
                self._errors += 1
                self._circuit_breaker.record_failure()
                logger.warning(f"⚠️ Redis GET error: {e}")

        # Fallback to memory (with TTL check)
        if key in self.memory_cache:
            # Check if entry has expired
            if key in self._memory_timestamps:
                age = time.time() - self._memory_timestamps[key]
                if age > self.default_ttl:
                    # Expired, remove and return None
                    del self.memory_cache[key]
                    del self._memory_timestamps[key]
                    return None

            self._hits += 1
            logger.debug(f"✅ Memory cache HIT: {key[:50]}...")
            return self.memory_cache[key]

        self._misses += 1
        return None

    def set(self, key_or_prefix: str, data_or_result: Any, result: dict = None, ttl: int = None, cache_type: str = None) -> bool:
        """Store result in cache. Supports both styles:
        - set(key, result, ttl=3600) - direct key
        - set(prefix, data, result, cache_type="tarot") - prefix+data style
        """
        # Determine which style of call this is
        if result is None:
            # Direct key style: set(key, result, ttl=...)
            key = key_or_prefix
            result_data = data_or_result
            cache_ttl = ttl or self.default_ttl
        else:
            # Prefix+data style: set(prefix, data, result, cache_type=...)
            key = self._make_key(key_or_prefix, data_or_result)
            result_data = result
            cache_ttl = ttl or self.get_ttl(cache_type or key_or_prefix)

        # Try Redis first (with circuit breaker)
        if self.enabled and self.client and self._circuit_breaker.allow_request():
            try:
                self.client.setex(
                    key,
                    cache_ttl,
                    json.dumps(result_data)
                )
                self._circuit_breaker.record_success()
                logger.debug(f"✅ Redis cache SET: {key[:50]}... (TTL={cache_ttl}s)")
                return True
            except Exception as e:
                self._errors += 1
                self._circuit_breaker.record_failure()
                logger.warning(f"⚠️ Redis SET error: {e}")

        # Fallback to memory (with size limit, LRU eviction, and TTL tracking)
        with self._lock:
            if len(self.memory_cache) >= 500:
                # LRU eviction: remove oldest 100 entries
                oldest_keys = sorted(
                    self.memory_cache.keys(),
                    key=lambda k: self._memory_timestamps.get(k, 0)
                )[:100]
                for k in oldest_keys:
                    if k in self.memory_cache:
                        del self.memory_cache[k]
                    if k in self._memory_timestamps:
                        del self._memory_timestamps[k]
                logger.debug(f"Memory cache: evicted {len(oldest_keys)} entries")

            self.memory_cache[key] = result_data
            self._memory_timestamps[key] = time.time()
            logger.debug(f"✅ Memory cache SET: {key[:50]}...")
            return True

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
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0

        stats = {
            "enabled": self.enabled,
            "backend": "redis" if self.enabled else "memory",
            "memory_entries": len(self.memory_cache),
            "default_ttl": self.default_ttl,
            "ttl_presets": self.TTL_PRESETS,
            "local_hits": self._hits,
            "local_misses": self._misses,
            "local_errors": self._errors,
            "local_hit_rate": hit_rate,
            "circuit_breaker_open": self._circuit_breaker.is_open,
        }

        if self.enabled and self.client and self._circuit_breaker.allow_request():
            try:
                info = self.client.info("stats")
                stats["redis_keys"] = self.client.dbsize()
                stats["redis_hits"] = info.get("keyspace_hits", 0)
                stats["redis_misses"] = info.get("keyspace_misses", 0)
                stats["redis_connected_clients"] = self.client.info("clients").get("connected_clients", 0)

                # Pool stats if available
                if self._pool:
                    stats["pool_max_connections"] = self.POOL_MAX_CONNECTIONS
            except Exception as e:
                logger.warning(f"⚠️ Redis STATS error: {e}")

        return stats

    def get_rag_result(self, query_hash: str) -> Optional[dict]:
        """Get cached RAG result by query hash."""
        key = f"rag:result:{query_hash}"
        return self.get(key)

    def set_rag_result(self, query_hash: str, result: dict, ttl: int = None) -> bool:
        """Cache RAG result with short TTL for freshness."""
        key = f"rag:result:{query_hash}"
        cache_ttl = ttl or self.get_ttl("rag")
        return self.set(key, result, ttl=cache_ttl)

    def get_embedding_cache(self, text_hash: str) -> Optional[list]:
        """Get cached embedding vector."""
        key = f"rag:embed:{text_hash}"
        return self.get(key)

    def set_embedding_cache(self, text_hash: str, embedding: list) -> bool:
        """Cache embedding vector with longer TTL."""
        key = f"rag:embed:{text_hash}"
        return self.set(key, embedding, ttl=self.get_ttl("rag_embedding"))


# Global cache instance
_cache = None

def get_cache() -> RedisCache:
    """Get or create global cache instance."""
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache
