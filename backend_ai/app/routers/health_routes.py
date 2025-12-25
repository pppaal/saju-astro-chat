"""
Health Check and Monitoring Routes
System health, performance stats, cache management.
"""
from flask import Blueprint, jsonify
import logging

health_bp = Blueprint('health', __name__, url_prefix='/api/health')
logger = logging.getLogger(__name__)

# Lazy imports
_perf_module = None
_cache_module = None


def _get_perf():
    global _perf_module
    if _perf_module is None:
        try:
            from backend_ai.app import performance_optimizer
            _perf_module = performance_optimizer
        except ImportError:
            from .. import performance_optimizer
            _perf_module = performance_optimizer
    return _perf_module


def _get_cache():
    global _cache_module
    if _cache_module is None:
        try:
            from backend_ai.app import redis_cache
            _cache_module = redis_cache
        except ImportError:
            from .. import redis_cache
            _cache_module = redis_cache
    return _cache_module


@health_bp.route('/', methods=['GET'])
@health_bp.route('/basic', methods=['GET'])
def health_check():
    """Basic health check."""
    return jsonify({
        "status": "healthy",
        "service": "backend_ai",
        "version": "6.0.0"
    })


@health_bp.route('/full', methods=['GET'])
def health_full():
    """Comprehensive health check with system stats."""
    try:
        perf = _get_perf()
        perf_stats = perf.get_performance_stats()
        cache_health = perf.get_cache_health()
        optimizations = perf.suggest_optimizations()

        return jsonify({
            "status": "healthy",
            "service": "backend_ai",
            "version": "6.0.0",
            "performance": perf_stats,
            "cache": cache_health,
            "optimizations": optimizations,
            "timestamp": perf_stats.get("timestamp")
        })

    except Exception as e:
        logger.error(f"[health_full] Error: {e}")
        return jsonify({
            "status": "degraded",
            "error": str(e)
        }), 503


@health_bp.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Get cache statistics."""
    try:
        cache_mod = _get_cache()
        cache = cache_mod.get_cache()
        perf = _get_perf()
        health = perf.get_cache_health()

        return jsonify({
            "status": "success",
            "cache_health": health
        })

    except Exception as e:
        logger.error(f"[cache_stats] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@health_bp.route('/cache/clear', methods=['POST'])
def cache_clear():
    """Clear cache (admin only - add auth in production)."""
    try:
        cache_mod = _get_cache()
        cache = cache_mod.get_cache()
        # Implementation depends on Redis client
        # cache.clear()

        return jsonify({
            "status": "success",
            "message": "Cache cleared (implementation needed)"
        })

    except Exception as e:
        logger.error(f"[cache_clear] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@health_bp.route('/performance/stats', methods=['GET'])
def performance_stats():
    """Get performance statistics."""
    try:
        perf = _get_perf()
        stats = perf.get_performance_stats()

        return jsonify({
            "status": "success",
            "stats": stats
        })

    except Exception as e:
        logger.error(f"[performance_stats] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
