"""
Cache and performance monitoring routes.

Extracted from app.py as part of Phase 1.1 refactoring.
"""
from flask import Blueprint, request, jsonify, Response
import logging
import time
import os

from backend_ai.app.redis_cache import get_cache
from backend_ai.app.performance_optimizer import (
    get_performance_stats,
    get_cache_health,
    suggest_optimizations,
)

logger = logging.getLogger(__name__)

# Create Blueprint
cache_bp = Blueprint('cache', __name__)


@cache_bp.route("/cache/stats", methods=["GET"])
def cache_stats():
    """Get cache statistics."""
    try:
        cache = get_cache()
        stats = cache.stats()
        return jsonify({"status": "success", "cache": stats})
    except Exception as e:
        logger.exception(f"[ERROR] /cache/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@cache_bp.route("/cache/clear", methods=["POST"])
def cache_clear():
    """Clear cache (admin only)."""
    try:
        cache = get_cache()
        pattern = request.json.get("pattern", "fusion:*") if request.json else "fusion:*"
        cleared = cache.clear(pattern)
        return jsonify({"status": "success", "cleared": cleared})
    except Exception as e:
        logger.exception(f"[ERROR] /cache/clear failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@cache_bp.route("/performance/stats", methods=["GET"])
def performance_stats():
    """Get performance statistics with optimization suggestions."""
    try:
        stats = get_performance_stats()
        suggestions = suggest_optimizations(stats)
        cache_health = get_cache_health()

        return jsonify({
            "status": "success",
            "performance": stats,
            "cache_health": cache_health,
            "suggestions": suggestions
        })
    except Exception as e:
        logger.exception(f"[ERROR] /performance/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@cache_bp.route("/metrics", methods=["GET"])
def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    try:
        perf_stats = get_performance_stats()

        # Format as Prometheus metrics
        metrics = []

        # Request metrics
        metrics.append('# HELP ai_backend_requests_total Total number of requests')
        metrics.append('# TYPE ai_backend_requests_total counter')
        metrics.append(f'ai_backend_requests_total {perf_stats.get("total_requests", 0)}')

        # Cache metrics
        metrics.append('# HELP ai_backend_cache_hit_rate Cache hit rate percentage')
        metrics.append('# TYPE ai_backend_cache_hit_rate gauge')
        metrics.append(f'ai_backend_cache_hit_rate {perf_stats.get("cache_hit_rate", 0)}')

        # Response time
        metrics.append('# HELP ai_backend_response_time_ms Average response time in milliseconds')
        metrics.append('# TYPE ai_backend_response_time_ms gauge')
        metrics.append(f'ai_backend_response_time_ms {perf_stats.get("avg_response_time_ms", 0)}')

        # Memory (if available)
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            metrics.append('# HELP ai_backend_memory_mb Memory usage in MB')
            metrics.append('# TYPE ai_backend_memory_mb gauge')
            metrics.append(f'ai_backend_memory_mb {memory_mb:.2f}')
        except ImportError:
            pass

        return Response('\n'.join(metrics), mimetype='text/plain')
    except Exception as e:
        return Response(f'# Error: {str(e)}', mimetype='text/plain'), 500


@cache_bp.route("/health/full", methods=["GET"])
def full_health_check():
    """Comprehensive health check including performance metrics."""
    try:
        perf_stats = get_performance_stats()
        cache_health = get_cache_health()

        # Calculate overall health score
        health_score = 100
        issues = []

        # Penalize for low cache hit rate
        if perf_stats["cache_hit_rate"] < 30:
            health_score -= 20
            issues.append("Low cache hit rate")

        # Penalize for slow responses
        if perf_stats["avg_response_time_ms"] > 2000:
            health_score -= 15
            issues.append("Slow response times")

        # Penalize for cache errors
        if cache_health.get("error_rate", 0) > 5:
            health_score -= 10
            issues.append("High cache error rate")

        # Check memory usage (if available)
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024

            # Warn if memory > 450MB (close to 512MB Railway limit)
            if memory_mb > 450:
                health_score -= 25
                issues.append(f"High memory usage: {memory_mb:.0f}MB")
            elif memory_mb > 400:
                health_score -= 10
                issues.append(f"Elevated memory usage: {memory_mb:.0f}MB")
        except ImportError:
            pass

        status = "healthy" if health_score >= 80 else "degraded" if health_score >= 60 else "unhealthy"

        return jsonify({
            "status": status,
            "health_score": health_score,
            "issues": issues,
            "performance": perf_stats,
            "cache_health": cache_health,
            "timestamp": time.time()
        })
    except Exception as e:
        logger.exception(f"[ERROR] /health/full failed: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500
