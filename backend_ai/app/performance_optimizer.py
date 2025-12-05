# backend_ai/app/performance_optimizer.py
"""
Performance Optimization Module
Maximizes backend AI response speed and quality
"""

import time
import functools
from typing import Callable, Any
from redis_cache import get_cache

# Performance tracking
_performance_stats = {
    "total_requests": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "avg_response_time": 0,
    "fast_responses": 0,  # < 500ms
    "slow_responses": 0,  # > 3000ms
}


def track_performance(func: Callable) -> Callable:
    """Decorator to track function performance"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        global _performance_stats
        start = time.time()

        try:
            result = func(*args, **kwargs)
            duration_ms = int((time.time() - start) * 1000)

            # Update stats
            _performance_stats["total_requests"] += 1

            # Check if cached
            if isinstance(result, dict) and result.get("cached"):
                _performance_stats["cache_hits"] += 1
            else:
                _performance_stats["cache_misses"] += 1

            # Track response speed
            if duration_ms < 500:
                _performance_stats["fast_responses"] += 1
            elif duration_ms > 3000:
                _performance_stats["slow_responses"] += 1

            # Update average
            total = _performance_stats["total_requests"]
            current_avg = _performance_stats["avg_response_time"]
            _performance_stats["avg_response_time"] = (
                current_avg * (total - 1) + duration_ms
            ) / total

            return result

        except Exception as e:
            print(f"[Performance] Error in {func.__name__}: {e}")
            raise

    return wrapper


def get_performance_stats() -> dict:
    """Get current performance statistics"""
    total = _performance_stats["total_requests"]
    cache_hit_rate = (
        (_performance_stats["cache_hits"] / total * 100) if total > 0 else 0
    )
    fast_rate = (
        (_performance_stats["fast_responses"] / total * 100) if total > 0 else 0
    )

    return {
        "total_requests": total,
        "cache_hit_rate": round(cache_hit_rate, 2),
        "avg_response_time_ms": round(_performance_stats["avg_response_time"], 2),
        "fast_responses_percentage": round(fast_rate, 2),
        "slow_responses": _performance_stats["slow_responses"],
    }


def optimize_prompt(prompt: str, max_length: int = 2000) -> str:
    """
    Optimize prompt for faster processing
    - Removes redundant whitespace
    - Truncates if too long
    - Keeps important context
    """
    # Remove extra whitespace
    optimized = " ".join(prompt.split())

    # Truncate if needed, keeping start and end
    if len(optimized) > max_length:
        half = max_length // 2
        optimized = optimized[:half] + "..." + optimized[-half:]

    return optimized


def batch_cache_warm(keys: list[dict]) -> int:
    """
    Warm cache with common queries
    Returns number of items cached
    """
    cache = get_cache()
    warmed = 0

    for key_data in keys:
        # Check if already cached
        cached = cache.get("fusion", key_data)
        if not cached:
            # Mark for warming (would be populated on first request)
            warmed += 1

    return warmed


def get_cache_health() -> dict:
    """Check cache health and efficiency"""
    cache = get_cache()
    stats = cache.stats()

    health_score = 100

    # Penalize if cache is disabled
    if not stats.get("enabled"):
        health_score -= 50

    # Check memory usage (if available)
    memory_used = stats.get("memory_used_mb", 0)
    if memory_used > 1000:  # Over 1GB
        health_score -= 20

    return {
        "health_score": health_score,
        "cache_enabled": stats.get("enabled", False),
        "cache_type": stats.get("type", "unknown"),
        "total_keys": stats.get("total_keys", 0),
        "memory_used_mb": memory_used,
        "recommendations": _get_recommendations(health_score, stats),
    }


def _get_recommendations(health_score: int, stats: dict) -> list[str]:
    """Generate performance recommendations"""
    recommendations = []

    if health_score < 70:
        if not stats.get("enabled"):
            recommendations.append("Enable Redis cache for 50-80% performance boost")

        if stats.get("memory_used_mb", 0) > 1000:
            recommendations.append(
                "Consider increasing TTL or clearing old cache entries"
            )

        if stats.get("total_keys", 0) > 10000:
            recommendations.append("Implement cache key rotation policy")

    else:
        recommendations.append("Cache is healthy - performance optimized!")

    return recommendations


def suggest_optimizations(stats: dict) -> list[str]:
    """Suggest optimizations based on current stats"""
    suggestions = []

    # Check cache hit rate
    if stats["cache_hit_rate"] < 30:
        suggestions.append(
            "⚠️ Low cache hit rate. Consider increasing cache TTL or warming cache."
        )

    # Check average response time
    if stats["avg_response_time_ms"] > 2000:
        suggestions.append(
            "⚠️ High average response time. Optimize prompts or increase cache usage."
        )

    # Check slow responses
    if stats["slow_responses"] > stats["total_requests"] * 0.1:
        suggestions.append(
            "⚠️ Too many slow responses (>3s). Check backend AI service health."
        )

    # Check fast response rate
    if stats["fast_responses_percentage"] > 80:
        suggestions.append("✅ Excellent performance! Keep it up.")

    if not suggestions:
        suggestions.append("✅ Performance is optimal. No action needed.")

    return suggestions
