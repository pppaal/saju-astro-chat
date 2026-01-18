"""
Core routes - health checks, capabilities, and index.

Extracted from app.py as part of Phase 1.1 refactoring.
"""
from flask import Blueprint, jsonify, g
import logging

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
    # TODO: Check Redis, DB connections
    return jsonify({"status": "ready"})


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
