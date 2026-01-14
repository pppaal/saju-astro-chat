"""
Saju Routes

Saju-specific streaming endpoints for AI-powered saju reading.

Routes:
- POST /saju/counselor/init - Initialize saju counselor session
- POST /saju/ask-stream - Streaming saju-focused AI reading

NOTE: These routes currently proxy to app.py functions.
TODO: Refactor to use StreamingService and move business logic to services layer.
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
saju_bp = Blueprint('saju', __name__, url_prefix='/saju')


# ============================================================================
# Temporary Proxy Functions
# ============================================================================

def _get_app_functions():
    """
    Lazy import app.py functions to avoid circular imports.

    Returns dict of app functions that we're wrapping.
    """
    from backend_ai.app.app import (
        saju_counselor_init as app_saju_counselor_init,
        saju_ask_stream as app_saju_ask_stream,
    )

    return {
        "saju_counselor_init": app_saju_counselor_init,
        "saju_ask_stream": app_saju_ask_stream,
    }


# ============================================================================
# Routes (Proxying to app.py for now)
# ============================================================================

@saju_bp.route("/counselor/init", methods=["POST"])
def saju_counselor_init():
    """
    Initialize saju-specific counselor session with RAG prefetch.

    Pre-fetches Saju-specific knowledge:
    - Saju structure analysis (pillars, elements, sibsin, etc.)
    - Cross-analysis with astrology if provided
    - Relevant fortune patterns
    - Jung psychology archetypes

    Request body:
    {
        "saju": {
            "pillars": {...},
            "dayMaster": {...},
            "sibsin": {...},
            "unse": {...}
        },
        "question": "user's initial question",
        "theme": "career" | "love" | "life" | ...
    }

    Returns:
    {
        "status": "success",
        "session_id": "uuid",
        "saju_summary": "compact saju summary",
        "rag_context": {...}
    }

    TODO: Refactor to use services layer
    - SajuCounselorService for session management
    - ChartContextService.build_saju_context()
    - Use saju_astro_rag for knowledge retrieval
    """
    app_funcs = _get_app_functions()
    return app_funcs["saju_counselor_init"]()


@saju_bp.route("/ask-stream", methods=["POST"])
def saju_ask_stream():
    """
    Streaming saju-focused AI reading with SSE.

    Provides saju-specific interpretation with:
    - Detailed pillar analysis (year, month, day, hour)
    - Sibsin (Ten Gods) interpretation
    - Five elements balance
    - Unse (Luck periods) analysis
    - Geokguk (pattern) identification
    - Practical life guidance

    Request body:
    {
        "saju": {...},
        "question": "user question",
        "session_id": "optional - from /saju/counselor/init",
        "locale": "en" | "ko",
        "include_unse": true
    }

    SSE Events:
    - {"type": "start"} - Stream started
    - {"type": "saju_analysis", "data": {...}} - Saju structure analysis
    - {"type": "content", "content": "..."} - Streaming interpretation
    - {"type": "done"} - Stream complete
    - {"type": "error", "error": "..."} - Error occurred

    TODO: Refactor to use services layer
    - StreamingService.sse_stream_response()
    - ChartContextService.build_saju_context()
    - ValidationService for input sanitization
    - Direct OpenAI streaming with saju-specific prompts
    """
    app_funcs = _get_app_functions()
    return app_funcs["saju_ask_stream"]()


# ============================================================================
# Route Registration Helper
# ============================================================================

def register_saju_routes(app):
    """
    Register saju routes blueprint.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(saju_bp)
    logger.info("[SajuRoutes] Registered saju routes blueprint")
