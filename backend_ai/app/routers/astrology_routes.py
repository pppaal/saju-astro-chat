"""
Astrology Routes

Western astrology-specific streaming endpoints for AI-powered astrological reading.

Routes:
- POST /astrology/counselor/init - Initialize astrology counselor session
- POST /astrology/ask-stream - Streaming astrology-focused AI reading

NOTE: These routes currently proxy to app.py functions.
TODO: Refactor to use StreamingService and move business logic to services layer.
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
astrology_bp = Blueprint('astrology', __name__, url_prefix='/astrology')


# ============================================================================
# Temporary Proxy Functions
# ============================================================================

def _get_app_functions():
    """
    Lazy import app.py functions to avoid circular imports.

    Returns dict of app functions that we're wrapping.
    """
    from backend_ai.app.app import (
        astrology_counselor_init as app_astrology_counselor_init,
        astrology_ask_stream as app_astrology_ask_stream,
    )

    return {
        "astrology_counselor_init": app_astrology_counselor_init,
        "astrology_ask_stream": app_astrology_ask_stream,
    }


# ============================================================================
# Routes (Proxying to app.py for now)
# ============================================================================

@astrology_bp.route("/counselor/init", methods=["POST"])
def astrology_counselor_init():
    """
    Initialize astrology-specific counselor session with RAG prefetch.

    Pre-fetches Western astrology knowledge:
    - Natal chart analysis (planets, houses, aspects)
    - Current transits and progressions
    - Synastry patterns (if comparing charts)
    - Fixed stars and asteroids (if applicable)
    - Jung psychology integration

    Request body:
    {
        "astro": {
            "sun": {...},
            "moon": {...},
            "planets": {...},
            "houses": [...],
            "aspects": [...]
        },
        "question": "user's initial question",
        "theme": "career" | "love" | "life" | ...
    }

    Returns:
    {
        "status": "success",
        "session_id": "uuid",
        "astro_summary": "compact chart summary",
        "rag_context": {...}
    }

    TODO: Refactor to use services layer
    - AstrologyCounselorService for session management
    - ChartContextService.build_astrology_context()
    - Use saju_astro_rag for knowledge retrieval
    """
    app_funcs = _get_app_functions()
    return app_funcs["astrology_counselor_init"]()


@astrology_bp.route("/ask-stream", methods=["POST"])
def astrology_ask_stream():
    """
    Streaming astrology-focused AI reading with SSE.

    Provides western astrology interpretation with:
    - Planetary positions and meanings
    - House placements and life areas
    - Major aspects (conjunction, opposition, trine, square, sextile)
    - Current transits affecting the natal chart
    - Psychological insights (Jung integration)
    - Practical guidance for timing and decisions

    Request body:
    {
        "astro": {...},
        "question": "user question",
        "session_id": "optional - from /astrology/counselor/init",
        "locale": "en" | "ko",
        "include_transits": true
    }

    SSE Events:
    - {"type": "start"} - Stream started
    - {"type": "chart_analysis", "data": {...}} - Chart structure analysis
    - {"type": "transit_info", "data": {...}} - Current transits (if requested)
    - {"type": "content", "content": "..."} - Streaming interpretation
    - {"type": "done"} - Stream complete
    - {"type": "error", "error": "..."} - Error occurred

    TODO: Refactor to use services layer
    - StreamingService.sse_stream_response()
    - ChartContextService.build_astrology_context()
    - ValidationService for input sanitization
    - Direct OpenAI streaming with astrology-specific prompts
    - Transit calculation service integration
    """
    app_funcs = _get_app_functions()
    return app_funcs["astrology_ask_stream"]()


# ============================================================================
# Route Registration Helper
# ============================================================================

def register_astrology_routes(app):
    """
    Register astrology routes blueprint.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(astrology_bp)
    logger.info("[AstrologyRoutes] Registered astrology routes blueprint")
