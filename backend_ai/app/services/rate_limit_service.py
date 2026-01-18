"""
Rate Limiting Service

Redis-based distributed rate limiting with in-memory fallback.
Supports sliding window algorithm for accurate rate limiting.

Features:
- Redis distributed rate limiting for horizontal scaling
- In-memory fallback when Redis unavailable
- Sliding window algorithm
- Configurable per-client limits
- Automatic cleanup of stale entries

Configuration (environment variables):
- API_RATE_PER_MIN: Rate limit per minute (default: 60)
- REDIS_URL: Redis connection URL (optional)
"""
import os
import time
import logging
from typing import Tuple, Optional, Dict
from collections import defaultdict

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================
try:
    RATE_LIMIT = int(os.getenv("API_RATE_PER_MIN", "60"))
except ValueError:
    RATE_LIMIT = 60

RATE_WINDOW_SECONDS = 60
RATE_LIMIT_PREFIX = "ratelimit:"

# ============================================================================
# REDIS CLIENT
# ============================================================================
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("[RATE-LIMIT] redis package not installed, using memory-only mode")

_redis_client = None
_redis_enabled = False


def _init_redis_client():
    """Initialize Redis client if configured."""
    global _redis_client, _redis_enabled

    if not REDIS_AVAILABLE:
        return

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.info("[RATE-LIMIT] REDIS_URL not configured, using memory rate limiting")
        return

    try:
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=1,  # Fast timeout for rate limiting
            socket_connect_timeout=1,
            retry_on_timeout=True,
        )
        _redis_client.ping()
        _redis_enabled = True
        logger.info("[RATE-LIMIT] ✅ Redis connected for rate limiting")
    except Exception as e:
        logger.warning(f"[RATE-LIMIT] ⚠️ Redis connection failed: {e}, using memory")
        _redis_client = None
        _redis_enabled = False


# Initialize Redis on module load
_init_redis_client()

# ============================================================================
# IN-MEMORY FALLBACK
# ============================================================================
_rate_state: Dict[str, list] = defaultdict(list)
_cleanup_counter = 0


def _memory_check_rate(client_id: str, limit: int = None, window: int = None) -> Tuple[bool, Optional[float]]:
    """
    In-memory rate limiting with sliding window.

    Args:
        client_id: Client identifier (IP or user ID)
        limit: Rate limit (default: RATE_LIMIT)
        window: Window in seconds (default: RATE_WINDOW_SECONDS)

    Returns:
        Tuple of (allowed, retry_after_seconds)
    """
    global _cleanup_counter

    if limit is None:
        limit = RATE_LIMIT
    if window is None:
        window = RATE_WINDOW_SECONDS

    now = time.time()
    timestamps = [t for t in _rate_state[client_id] if now - t < window]
    _rate_state[client_id] = timestamps

    # Periodic cleanup of stale clients (every 100 requests)
    _cleanup_counter += 1
    if _cleanup_counter >= 100:
        _cleanup_counter = 0
        stale_clients = [
            c for c, ts in _rate_state.items()
            if not ts or (now - max(ts)) > window * 2
        ]
        for c in stale_clients:
            del _rate_state[c]
        if stale_clients:
            logger.debug(f"[RATE-LIMIT] Cleaned up {len(stale_clients)} stale clients")

    if len(timestamps) >= limit:
        retry_after = max(0, window - (now - timestamps[0]))
        return False, retry_after

    timestamps.append(now)
    _rate_state[client_id] = timestamps
    return True, None


def _redis_check_rate(client_id: str, limit: int = None, window: int = None) -> Tuple[bool, Optional[float]]:
    """
    Redis-based rate limiting using sliding window.

    Uses INCR + EXPIRE for atomic increment with TTL.

    Args:
        client_id: Client identifier
        limit: Rate limit (default: RATE_LIMIT)
        window: Window in seconds (default: RATE_WINDOW_SECONDS)

    Returns:
        Tuple of (allowed, retry_after_seconds)
    """
    if not _redis_enabled or not _redis_client:
        return None, None  # Signal to use fallback

    if limit is None:
        limit = RATE_LIMIT
    if window is None:
        window = RATE_WINDOW_SECONDS

    try:
        key = f"{RATE_LIMIT_PREFIX}{client_id}"

        # Use pipeline for atomic INCR + EXPIRE
        pipe = _redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window)
        results = pipe.execute()

        count = results[0]

        if count > limit:
            # Get TTL for retry_after
            ttl = _redis_client.ttl(key)
            retry_after = ttl if ttl > 0 else window
            logger.debug(f"[RATE-LIMIT] Redis DENIED: {client_id} count={count} limit={limit}")
            return False, retry_after

        logger.debug(f"[RATE-LIMIT] Redis ALLOWED: {client_id} count={count}/{limit}")
        return True, None

    except Exception as e:
        logger.warning(f"[RATE-LIMIT] Redis error: {e}, using memory fallback")
        return None, None  # Signal to use fallback


def check_rate_limit(
    client_id: str,
    limit: int = None,
    window: int = None
) -> Tuple[bool, Optional[float]]:
    """
    Check rate limit for a client.

    Tries Redis first, falls back to in-memory.

    Args:
        client_id: Client identifier (IP or user ID)
        limit: Rate limit (default: from env or 60)
        window: Window in seconds (default: 60)

    Returns:
        Tuple of (allowed, retry_after_seconds)
        - allowed: True if request is allowed
        - retry_after_seconds: Seconds until rate limit resets (only if not allowed)

    Example:
        allowed, retry_after = check_rate_limit(client_ip)
        if not allowed:
            return jsonify({"error": "rate limit"}), 429
    """
    # Try Redis first
    if _redis_enabled:
        allowed, retry_after = _redis_check_rate(client_id, limit, window)
        if allowed is not None:
            return allowed, retry_after

    # Fallback to memory
    return _memory_check_rate(client_id, limit, window)


def get_rate_limit_status(client_id: str) -> Dict:
    """
    Get current rate limit status for a client.

    Args:
        client_id: Client identifier

    Returns:
        Dict with count, limit, remaining, reset info
    """
    status = {
        "client_id": client_id,
        "limit": RATE_LIMIT,
        "window_seconds": RATE_WINDOW_SECONDS,
        "backend": "redis" if _redis_enabled else "memory",
    }

    # Try Redis
    if _redis_enabled and _redis_client:
        try:
            key = f"{RATE_LIMIT_PREFIX}{client_id}"
            count = _redis_client.get(key)
            ttl = _redis_client.ttl(key)

            status["count"] = int(count) if count else 0
            status["remaining"] = max(0, RATE_LIMIT - status["count"])
            status["reset_in"] = ttl if ttl > 0 else 0
            return status
        except Exception as e:
            logger.warning(f"[RATE-LIMIT] Redis status error: {e}")

    # Memory fallback
    now = time.time()
    timestamps = [t for t in _rate_state.get(client_id, []) if now - t < RATE_WINDOW_SECONDS]
    status["count"] = len(timestamps)
    status["remaining"] = max(0, RATE_LIMIT - status["count"])
    status["reset_in"] = RATE_WINDOW_SECONDS - (now - min(timestamps)) if timestamps else 0

    return status


def reset_rate_limit(client_id: str) -> bool:
    """
    Reset rate limit for a client (admin use).

    Args:
        client_id: Client identifier

    Returns:
        True if reset successful
    """
    # Reset Redis
    if _redis_enabled and _redis_client:
        try:
            key = f"{RATE_LIMIT_PREFIX}{client_id}"
            _redis_client.delete(key)
            logger.info(f"[RATE-LIMIT] Reset Redis rate limit for {client_id}")
        except Exception as e:
            logger.warning(f"[RATE-LIMIT] Redis reset error: {e}")

    # Reset memory
    if client_id in _rate_state:
        del _rate_state[client_id]
        logger.info(f"[RATE-LIMIT] Reset memory rate limit for {client_id}")

    return True


def get_rate_limit_stats() -> Dict:
    """
    Get rate limiting statistics.

    Returns:
        Dict with backend info and statistics
    """
    stats = {
        "backend": "redis" if _redis_enabled else "memory",
        "redis_enabled": _redis_enabled,
        "default_limit": RATE_LIMIT,
        "window_seconds": RATE_WINDOW_SECONDS,
    }

    # Redis stats
    if _redis_enabled and _redis_client:
        try:
            keys = _redis_client.keys(f"{RATE_LIMIT_PREFIX}*")
            stats["redis_active_clients"] = len(keys) if keys else 0
        except Exception as e:
            logger.warning(f"[RATE-LIMIT] Redis stats error: {e}")
            stats["redis_error"] = str(e)

    # Memory stats
    stats["memory_active_clients"] = len(_rate_state)

    return stats


# ============================================================================
# Convenience exports
# ============================================================================
__all__ = [
    "RATE_LIMIT",
    "RATE_WINDOW_SECONDS",
    "check_rate_limit",
    "get_rate_limit_status",
    "reset_rate_limit",
    "get_rate_limit_stats",
    "REDIS_AVAILABLE",
    "_redis_enabled",
]
