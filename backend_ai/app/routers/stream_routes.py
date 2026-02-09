"""
Stream Routes

General streaming endpoints for AI-powered fortune telling.

Routes:
- POST /ask - Synchronous AI fortune telling
- POST /ask-stream - Streaming AI fortune telling with SSE
- POST /counselor/init - Initialize counselor session with RAG prefetch

✅ Phase 2 Refactored: Now uses FortuneService directly instead of app.py proxy.
"""
from flask import Blueprint, request, jsonify, Response, g
from ..utils.request_utils import get_json_or_400
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
stream_bp = Blueprint('stream', __name__)


# ============================================================================
# Service Layer (Phase 2)
# ============================================================================
# Routes now call services directly instead of proxying through app.py

def _get_fortune_service():
    """Lazy load FortuneService to avoid import issues."""
    from backend_ai.services.fortune_service import FortuneService
    return FortuneService()

def _get_streaming_service():
    """Lazy load StreamingService to avoid import issues."""
    from backend_ai.services.streaming_service import StreamingService
    return StreamingService()

def _get_counselor_service():
    """Lazy load CounselorService to avoid import issues."""
    from backend_ai.services.counselor_service import CounselorService
    return CounselorService()


# ============================================================================
# Routes (Proxying to app.py for now)
# ============================================================================

@stream_bp.route("/ask", methods=["POST"])
def ask():
    """
    Synchronous AI fortune telling with fusion of Saju/Astrology/Tarot.

    ✅ Phase 2 Refactored: Now uses FortuneService directly.

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
    """
    try:
        # Parse request data
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error

        # Extract parameters
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        tarot_data = data.get("tarot") or {}
        theme = data.get("theme", "daily")
        locale = data.get("locale", "en")
        prompt = data.get("prompt") or ""
        render_mode = data.get("render_mode", "gpt")

        # Get request ID from Flask context
        request_id = getattr(g, 'request_id', None)

        # Call FortuneService (business logic)
        service = _get_fortune_service()
        result = service.calculate_fortune(
            saju_data=saju_data,
            astro_data=astro_data,
            tarot_data=tarot_data,
            theme=theme,
            locale=locale,
            prompt=prompt,
            render_mode=render_mode,
            request_id=request_id
        )

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ask] Failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@stream_bp.route("/ask-stream", methods=["POST"])
def ask_stream():
    """
    Streaming AI fortune telling with Server-Sent Events (SSE).

    ✅ Phase 2 Refactored: Now uses StreamingService directly.

    Request body:
    {
        "saju": {...},
        "astro": {...},
        "advanced_astro": {...},
        "theme": "chat" | "career" | "love" | ...,
        "locale": "en" | "ko",
        "prompt": "user question",
        "session_id": "optional - from /counselor/init for RAG context",
        "history": [...],  # Conversation history
        "user_context": {...},  # Premium user context
        "cv_text": "..."  # CV/Resume for career consultations
    }

    SSE Events:
    - data: {content} - Streaming AI response chunks
    - data: [DONE] - Stream complete
    - data: [ERROR] {error} - Error occurred
    """
    try:
        # Parse request data (UTF-8 encoding for Windows)
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        # Extract parameters
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        advanced_astro = data.get("advanced_astro") or {}
        theme = data.get("theme", "chat")
        locale = data.get("locale", "ko")
        prompt = data.get("prompt") or ""
        session_id = data.get("session_id")
        conversation_history = data.get("history") or []
        user_context = data.get("user_context") or {}
        cv_text = (data.get("cv_text") or "")[:4000]

        # Normalize birth payload
        from backend_ai.app.app import _normalize_birth_payload
        birth_data = _normalize_birth_payload(data)

        # Get request ID from Flask context
        request_id = getattr(g, 'request_id', None)

        # Call StreamingService (business logic)
        service = _get_streaming_service()
        return service.stream_fortune(
            saju_data=saju_data,
            astro_data=astro_data,
            advanced_astro=advanced_astro,
            birth_data=birth_data,
            theme=theme,
            locale=locale,
            prompt=prompt,
            session_id=session_id,
            conversation_history=conversation_history,
            user_context=user_context,
            cv_text=cv_text,
            request_id=request_id
        )

    except Exception as e:
        logger.exception(f"[ask-stream] Failed: {e}")
        from flask import jsonify
        return jsonify({"status": "error", "message": str(e)}), 500


@stream_bp.route("/counselor/init", methods=["POST"])
def counselor_init():
    """
    Initialize counselor session with RAG prefetch.

    ✅ Phase 2 Refactored: Now uses CounselorService directly.

    Pre-fetches relevant knowledge from:
    - Domain RAG (destiny_map, tarot, dream, iching)
    - Hybrid RAG (BM25 + Vector + Graph)
    - Jung psychology data

    Stores session data in cache and returns session_id for use in /ask-stream.

    Request body:
    {
        "saju": {...},
        "astro": {...},
        "theme": "career" | "love" | "life",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "locale": "en" | "ko"
    }

    Returns:
    {
        "status": "success",
        "session_id": "uuid",
        "prefetch_time_ms": 15234,
        "data_summary": {
            "graph_nodes": 15,
            "corpus_quotes": 5,
            "persona_insights": 10
        }
    }
    """
    try:
        # Parse request data (UTF-8 encoding for Windows)
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        # Extract parameters
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        theme = data.get("theme", "chat")
        locale = data.get("locale", "ko")

        # Normalize birth payload
        from backend_ai.app.app import _normalize_birth_payload
        birth_data = _normalize_birth_payload(data)

        # Get request ID from Flask context
        request_id = getattr(g, 'request_id', None)

        # Call CounselorService (business logic)
        service = _get_counselor_service()
        result = service.initialize_session(
            saju_data=saju_data,
            astro_data=astro_data,
            birth_data=birth_data,
            theme=theme,
            locale=locale,
            request_id=request_id
        )

        # Handle error responses with HTTP status
        if result.get("status") == "error":
            http_status = result.pop("http_status", 500)
            return jsonify(result), http_status

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[counselor/init] Failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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
