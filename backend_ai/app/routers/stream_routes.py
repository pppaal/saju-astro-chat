"""
Stream Routes

General streaming endpoints for AI-powered fortune telling.

Routes:
- POST /ask - Synchronous AI fortune telling
- POST /ask-stream - Streaming AI fortune telling with SSE
- POST /counselor/init - Initialize counselor session with RAG prefetch

NOTE: These routes currently proxy to app.py functions.
TODO: Refactor to use StreamingService and move business logic to services layer.
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
stream_bp = Blueprint('stream', __name__)


# ============================================================================
# Temporary Proxy Functions
# ============================================================================
# These import and wrap app.py functions for now.
# Will be refactored in future to use services layer directly.

def _get_app_functions():
    """
    Lazy import app.py functions to avoid circular imports.

    Returns dict of app functions that we're wrapping.
    """
    from backend_ai.app.app import (
        ask as app_ask,
        ask_stream as app_ask_stream,
        counselor_init as app_counselor_init,
    )

    return {
        "ask": app_ask,
        "ask_stream": app_ask_stream,
        "counselor_init": app_counselor_init,
    }


# ============================================================================
# Routes (Proxying to app.py for now)
# ============================================================================

@stream_bp.route("/ask", methods=["POST"])
def ask():
    """
    Synchronous AI fortune telling with fusion of Saju/Astrology/Tarot.

    Request body:
    {
        "saju": {...},
        "astro": {...},
        "tarot": {...},
        "theme": "daily" | "career" | "love" | ...,
        "locale": "en" | "ko",
        "prompt": "user question",
        "render_mode": "gpt" | "template"
    }

    Returns:
    {
        "status": "success",
        "data": {
            "reading": "...",
            "performance": {"duration_ms": 123, "cached": false}
        }
    }

    TODO: Refactor to use services layer
    - ValidationService.sanitize_user_input()
    - ChartContextService.build_combined_context()
    - Direct AI generation instead of interpret_with_ai()
    """
    app_funcs = _get_app_functions()
    return app_funcs["ask"]()


@stream_bp.route("/ask-stream", methods=["POST"])
def ask_stream():
    """
    Streaming AI fortune telling with Server-Sent Events (SSE).

    Request body:
    {
        "saju": {...},
        "astro": {...},
        "tarot": {...},
        "theme": "daily" | "career" | "love" | ...,
        "locale": "en" | "ko",
        "prompt": "user question",
        "session_id": "optional - from /counselor/init for RAG context"
    }

    SSE Events:
    - {"type": "start"} - Stream started
    - {"type": "rag_context", "data": {...}} - RAG search results (if session_id)
    - {"type": "content", "content": "..."} - Streaming AI response
    - {"type": "done"} - Stream complete
    - {"type": "error", "error": "..."} - Error occurred

    TODO: Refactor to use services layer
    - StreamingService.sse_stream_response()
    - StreamingService.stream_with_prefetch()
    - ChartContextService for chart context
    - RAG search through domain_rag or hybrid_rag
    """
    app_funcs = _get_app_functions()
    return app_funcs["ask_stream"]()


@stream_bp.route("/counselor/init", methods=["POST"])
def counselor_init():
    """
    Initialize counselor session with RAG prefetch.

    Pre-fetches relevant knowledge from:
    - Domain RAG (destiny_map, tarot, dream, iching)
    - Hybrid RAG (BM25 + Vector + Graph)
    - Jung psychology data

    Stores session data in Redis and returns session_id for use in /ask-stream.

    Request body:
    {
        "saju": {...},
        "astro": {...},
        "theme": "career" | "love" | "life",
        "question": "initial user question"
    }

    Returns:
    {
        "status": "success",
        "session_id": "uuid",
        "rag_summary": {
            "domain_results": 5,
            "hybrid_results": 8,
            "total_chars": 2500
        }
    }

    TODO: Refactor to use services layer
    - Create CounselorService for session management
    - Use domain_rag and hybrid_rag directly
    - Redis session storage helper
    """
    app_funcs = _get_app_functions()
    return app_funcs["counselor_init"]()


# ============================================================================
# Route Registration Helper
# ============================================================================

def register_stream_routes(app):
    """
    Register stream routes blueprint.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(stream_bp)
    logger.info("[StreamRoutes] Registered stream routes blueprint")
