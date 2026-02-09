"""
Core routes - health checks, capabilities, and index.

Extracted from app.py as part of Phase 1.1 refactoring.
"""
import logging
import os
from flask import Blueprint, jsonify
from backend_ai.app.redis_cache import get_cache

logger = logging.getLogger(__name__)

# Create Blueprint
core_bp = Blueprint('core', __name__)


@core_bp.route("/", methods=["GET"])
def index():
    """Root endpoint - health check."""
    return jsonify({"status": "ok", "message": "DestinyPal Fusion AI backend is running!"})


@core_bp.route("/health", methods=["GET"])
def health():
    """Basic health check."""
    return jsonify({"status": "healthy"})


@core_bp.route("/ready", methods=["GET"])
def ready():
    """Readiness check for k8s/Fly.io."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    is_production = env == "production"

    # Redis check (optional - memory fallback is allowed)
    cache = get_cache()
    redis_enabled = bool(getattr(cache, "enabled", False))
    redis_ok = True
    redis_error = None
    if redis_enabled and getattr(cache, "client", None):
        try:
            cache.client.ping()
        except Exception as exc:  # pragma: no cover - depends on runtime
            redis_ok = False
            redis_error = type(exc).__name__

    # Optional DB check if DATABASE_URL is configured
    db_url = os.getenv("DATABASE_URL")
    db_ok = True
    db_error = None
    if db_url:
        try:
            try:
                import psycopg2  # type: ignore
                conn = psycopg2.connect(db_url, connect_timeout=2)
                conn.close()
            except ImportError:
                import psycopg  # type: ignore
                conn = psycopg.connect(db_url, connect_timeout=2)
                conn.close()
        except Exception as exc:  # pragma: no cover - depends on runtime
            db_ok = False
            db_error = type(exc).__name__

    # Critical config checks
    admin_token_ok = bool(os.getenv("ADMIN_API_TOKEN")) if is_production else True
    openai_ok = bool(os.getenv("OPENAI_API_KEY")) if is_production else True

    ready_ok = all([
        redis_ok,
        db_ok,
        admin_token_ok,
        openai_ok,
    ])

    return jsonify({
        "status": "ready" if ready_ok else "not_ready",
        "checks": {
            "redis": {
                "enabled": redis_enabled,
                "ok": redis_ok,
                "error": redis_error,
            },
            "database": {
                "configured": bool(db_url),
                "ok": db_ok,
                "error": db_error,
            },
            "admin_token": {
                "ok": admin_token_ok,
            },
            "openai": {
                "ok": openai_ok,
            },
        },
    })


@core_bp.route("/capabilities", methods=["GET"])
def capabilities():
    """
    Return available features based on lazy-loaded modules.
    Frontend can check this to enable/disable features.
    """
    # Import lazy loader flags
    from backend_ai.app.app import (
        HAS_REALTIME,
        HAS_CHARTS,
        HAS_USER_MEMORY,
        HAS_PERSONA_EMBED,
        HAS_TAROT,
        HAS_RLHF,
        HAS_BADGES,
        HAS_DOMAIN_RAG,
        HAS_COMPATIBILITY,
        HAS_HYBRID_RAG,
        HAS_AGENTIC,
        HAS_PREDICTION,
        HAS_THEME_FILTER,
        HAS_FORTUNE_SCORE,
        HAS_ICHING,
        HAS_COUNSELING,
    )

    caps = {
        "realtime_astro": HAS_REALTIME,
        "charts": HAS_CHARTS,
        "user_memory": HAS_USER_MEMORY,
        "persona_embeddings": HAS_PERSONA_EMBED,
        "tarot": HAS_TAROT,
        "rlhf": HAS_RLHF,
        "badges": HAS_BADGES,
        "domain_rag": HAS_DOMAIN_RAG,
        "compatibility": HAS_COMPATIBILITY,
        "hybrid_rag": HAS_HYBRID_RAG,
        "agentic_rag": HAS_AGENTIC,
        "prediction": HAS_PREDICTION,
        "theme_filter": HAS_THEME_FILTER,
        "fortune_score": HAS_FORTUNE_SCORE,
        "iching": HAS_ICHING,
        "counseling": HAS_COUNSELING,
    }

    enabled_count = sum(1 for v in caps.values() if v)
    logger.info(f"[CAPABILITIES] {enabled_count}/{len(caps)} features enabled")

    return jsonify({
        "status": "success",
        "capabilities": caps,
        "summary": {
            "total": len(caps),
            "enabled": enabled_count,
            "disabled": len(caps) - enabled_count
        }
    })
