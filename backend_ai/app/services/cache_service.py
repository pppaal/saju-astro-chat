"""
Cache Service

Session-based RAG data caching with TTL and LRU eviction.
Supports Redis distributed cache with in-memory fallback.

Features:
- Redis distributed cache for horizontal scaling
- In-memory fallback when Redis unavailable
- Session cache with configurable TTL
- LRU eviction when cache is full
- Thread-safe operations
- Automatic cleanup of expired sessions

Configuration (environment variables):
- SESSION_CACHE_MAX_SIZE: Maximum number of cached sessions (default: 200)
- SESSION_CACHE_TTL_MINUTES: Cache TTL in minutes (default: 60)
- REDIS_URL: Redis connection URL (optional)
"""
import os
import json
import logging
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================
_DEFAULT_CACHE_MAX_SIZE = 200
_DEFAULT_CACHE_TTL_MINUTES = 60
_REDIS_KEY_PREFIX = "session:rag:"
_REDIS_SOCKET_TIMEOUT = 2


def _get_env_int(key: str, default: int) -> int:
    """Get integer from environment variable with fallback."""
    try:
        return int(os.getenv(key, default))
    except ValueError:
        return default


SESSION_CACHE_MAX_SIZE = _get_env_int("SESSION_CACHE_MAX_SIZE", _DEFAULT_CACHE_MAX_SIZE)
SESSION_CACHE_TTL_MINUTES = _get_env_int("SESSION_CACHE_TTL_MINUTES", _DEFAULT_CACHE_TTL_MINUTES)

# ============================================================================
# Redis Client (Optional)
# ============================================================================
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None  # type: ignore
    logger.warning("[SESSION-CACHE] redis package not installed, using memory-only mode")

_redis_client: Any = None
_redis_enabled = False


def _init_redis_client() -> None:
    """Initialize Redis client if configured."""
    global _redis_client, _redis_enabled

    if not REDIS_AVAILABLE:
        return

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.info("[SESSION-CACHE] REDIS_URL not configured, using memory cache")
        return

    try:
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=_REDIS_SOCKET_TIMEOUT,
            socket_connect_timeout=_REDIS_SOCKET_TIMEOUT,
            retry_on_timeout=True,
        )
        _redis_client.ping()
        _redis_enabled = True
        logger.info("[SESSION-CACHE] Redis connected for session cache")
    except Exception as e:
        logger.warning(f"[SESSION-CACHE] Redis connection failed: {e}, using memory cache")
        _redis_client = None
        _redis_enabled = False


# Initialize Redis on module load
_init_redis_client()

# ============================================================================
# Cache Storage
# ============================================================================
_SESSION_RAG_CACHE: Dict[str, Dict[str, Any]] = {}
_SESSION_CACHE_LOCK = Lock()


def _get_redis_key(session_id: str) -> str:
    """Generate Redis key for session cache."""
    return f"{_REDIS_KEY_PREFIX}{session_id}"


def _is_expired(created_at: datetime) -> bool:
    """Check if a cache entry is expired."""
    return datetime.now() - created_at > timedelta(minutes=SESSION_CACHE_TTL_MINUTES)


def _cleanup_expired_sessions() -> int:
    """
    Remove expired session data.

    Returns:
        Number of sessions cleaned up
    """
    now = datetime.now()
    expired = []

    with _SESSION_CACHE_LOCK:
        for sid, data in _SESSION_RAG_CACHE.items():
            created_at = data.get("created_at", now)
            if _is_expired(created_at):
                expired.append(sid)

        for sid in expired:
            del _SESSION_RAG_CACHE[sid]

    if expired:
        logger.info(f"[SESSION-CACHE] Cleaned up {len(expired)} expired sessions")

    return len(expired)


def _evict_lru_sessions(keep_count: Optional[int] = None) -> int:
    """
    Evict least recently used sessions to maintain cache size.

    Args:
        keep_count: Number of sessions to keep (default: SESSION_CACHE_MAX_SIZE)

    Returns:
        Number of sessions evicted
    """
    if keep_count is None:
        keep_count = SESSION_CACHE_MAX_SIZE

    evicted = 0

    with _SESSION_CACHE_LOCK:
        if len(_SESSION_RAG_CACHE) <= keep_count:
            return 0

        # Sort by last_accessed time (oldest first)
        sorted_sessions = sorted(
            _SESSION_RAG_CACHE.items(),
            key=lambda x: x[1].get("last_accessed", x[1].get("created_at", datetime.min))
        )

        # Evict oldest sessions until we're under the limit
        evict_count = len(_SESSION_RAG_CACHE) - keep_count
        for sid, _ in sorted_sessions[:evict_count]:
            del _SESSION_RAG_CACHE[sid]
            evicted += 1

        logger.info(
            f"[SESSION-CACHE] LRU evicted {evicted} sessions, "
            f"{len(_SESSION_RAG_CACHE)} remaining"
        )

    return evicted


# ============================================================================
# Public API
# ============================================================================
def get_session_rag_cache(session_id: str) -> Optional[Dict]:
    """
    Get cached RAG data for a session.

    Tries Redis first, falls back to memory cache.
    Updates last_accessed timestamp for LRU tracking.

    Args:
        session_id: Unique session identifier

    Returns:
        Cached data dict or None if not found/expired
    """
    # Try Redis first
    if _redis_enabled and _redis_client:
        try:
            redis_key = _get_redis_key(session_id)
            cached = _redis_client.get(redis_key)
            if cached:
                logger.debug(f"[SESSION-CACHE] Redis HIT: {session_id[:20]}...")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"[SESSION-CACHE] Redis GET error: {e}")

    # Fallback to memory cache
    with _SESSION_CACHE_LOCK:
        cache_entry = _SESSION_RAG_CACHE.get(session_id)

        if cache_entry:
            created_at = cache_entry.get("created_at", datetime.now())
            if _is_expired(created_at):
                del _SESSION_RAG_CACHE[session_id]
                return None

            # Update last_accessed for LRU tracking
            cache_entry["last_accessed"] = datetime.now()
            logger.debug(f"[SESSION-CACHE] Memory HIT: {session_id[:20]}...")
            return cache_entry.get("data")

    return None


def set_session_rag_cache(session_id: str, data: Dict) -> None:
    """
    Store RAG data in session cache.

    Stores in Redis if available, otherwise uses memory cache with LRU eviction.

    Args:
        session_id: Unique session identifier
        data: RAG data to cache
    """
    now = datetime.now()
    ttl_seconds = SESSION_CACHE_TTL_MINUTES * 60

    # Try Redis first
    if _redis_enabled and _redis_client:
        try:
            redis_key = _get_redis_key(session_id)
            _redis_client.setex(redis_key, ttl_seconds, json.dumps(data))
            logger.debug(f"[SESSION-CACHE] Redis SET: {session_id[:20]}... (TTL={ttl_seconds}s)")
            return
        except Exception as e:
            logger.warning(f"[SESSION-CACHE] Redis SET error: {e}, using memory cache")

    # Fallback to memory cache
    with _SESSION_CACHE_LOCK:
        _SESSION_RAG_CACHE[session_id] = {
            "data": data,
            "created_at": now,
            "last_accessed": now,
        }

    # LRU eviction if cache is too large
    if len(_SESSION_RAG_CACHE) > SESSION_CACHE_MAX_SIZE:
        _cleanup_expired_sessions()
        _evict_lru_sessions()


def clear_session_cache() -> int:
    """
    Clear all session cache entries.

    Clears both Redis and memory cache.

    Returns:
        Number of entries cleared
    """
    total_cleared = 0

    # Clear Redis
    if _redis_enabled and _redis_client:
        try:
            pattern = f"{_REDIS_KEY_PREFIX}*"
            keys = _redis_client.keys(pattern)
            if keys:
                _redis_client.delete(*keys)
                total_cleared += len(keys)
                logger.info(f"[SESSION-CACHE] Cleared {len(keys)} Redis entries")
        except Exception as e:
            logger.warning(f"[SESSION-CACHE] Redis CLEAR error: {e}")

    # Clear memory cache
    with _SESSION_CACHE_LOCK:
        memory_count = len(_SESSION_RAG_CACHE)
        _SESSION_RAG_CACHE.clear()
        total_cleared += memory_count
        logger.info(f"[SESSION-CACHE] Cleared {memory_count} memory entries")

    return total_cleared


def get_cache_stats() -> Dict[str, Any]:
    """
    Get session cache statistics.

    Returns:
        Dict with cache statistics including Redis info if available
    """
    stats: Dict[str, Any] = {
        "backend": "redis" if _redis_enabled else "memory",
        "redis_enabled": _redis_enabled,
        "max_size": SESSION_CACHE_MAX_SIZE,
        "ttl_minutes": SESSION_CACHE_TTL_MINUTES,
    }

    # Redis stats
    if _redis_enabled and _redis_client:
        try:
            pattern = f"{_REDIS_KEY_PREFIX}*"
            keys = _redis_client.keys(pattern)
            stats["redis_entries"] = len(keys) if keys else 0

            info = _redis_client.info("stats")
            stats["redis_hits"] = info.get("keyspace_hits", 0)
            stats["redis_misses"] = info.get("keyspace_misses", 0)
        except Exception as e:
            logger.warning(f"[SESSION-CACHE] Redis stats error: {e}")
            stats["redis_error"] = str(e)

    # Memory cache stats
    with _SESSION_CACHE_LOCK:
        total = len(_SESSION_RAG_CACHE)
        expired_count = sum(
            1 for data in _SESSION_RAG_CACHE.values()
            if _is_expired(data.get("created_at", datetime.now()))
        )

        stats.update({
            "memory_entries": total,
            "memory_expired": expired_count,
            "memory_active": total - expired_count,
            "memory_utilization_percent": round((total / SESSION_CACHE_MAX_SIZE) * 100, 1),
        })

    stats["total_entries"] = stats.get("redis_entries", 0) + stats.get("memory_entries", 0)

    return stats


# ============================================================================
# Exports
# ============================================================================
__all__ = [
    "SESSION_CACHE_MAX_SIZE",
    "SESSION_CACHE_TTL_MINUTES",
    "REDIS_AVAILABLE",
    "get_session_rag_cache",
    "set_session_rag_cache",
    "clear_session_cache",
    "get_cache_stats",
]
