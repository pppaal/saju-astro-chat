"""
Astrology Routes

Astrology-specific streaming endpoints for AI-powered astrology reading.

Routes:
- POST /astrology/counselor/init - Initialize astrology counselor session
- POST /astrology/ask-stream - Streaming astrology-focused AI reading

Phase 3.3: Refactored to use AstrologyCounselorService
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
astrology_bp = Blueprint('astrology', __name__, url_prefix='/astrology')


def _get_astrology_counselor_service():
    """Lazy load AstrologyCounselorService to avoid import issues."""
    from backend_ai.services.astrology_counselor_service import AstrologyCounselorService
    return AstrologyCounselorService()


def _normalize_birth_payload(data: dict) -> dict:
    """Lazy import and call normalize function."""
    from backend_ai.app.app import _normalize_birth_payload
    return _normalize_birth_payload(data)


@astrology_bp.route("/counselor/init", methods=["POST"])
def astrology_counselor_init():
    """
    Initialize astrology-specific counselor session with RAG prefetch.

    Phase 3.3 Refactored: Now uses AstrologyCounselorService directly.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        astro_data = data.get("astro") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        service = _get_astrology_counselor_service()
        result, status_code = service.initialize_session(
            astro_data=astro_data,
            birth_data=birth_data,
            theme=theme,
            locale=locale,
            request_id=getattr(g, 'request_id', None)
        )
        return jsonify(result), status_code

    except Exception as e:
        logger.exception(f"[ERROR] /astrology/counselor/init failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@astrology_bp.route("/ask-stream", methods=["POST"])
def astrology_ask_stream():
    """
    Streaming astrology-focused AI reading with SSE.

    Phase 3.3 Refactored: Now uses AstrologyCounselorService directly.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        astro_data = data.get("astro") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")
        prompt = (data.get("prompt") or "")[:1500]
        session_id = data.get("session_id")
        conversation_history = data.get("history") or []
        user_context = data.get("user_context") or {}

        service = _get_astrology_counselor_service()
        return service.stream_chat(
            astro_data=astro_data,
            birth_data=birth_data,
            prompt=prompt,
            theme=theme,
            locale=locale,
            session_id=session_id,
            conversation_history=conversation_history,
            user_context=user_context,
            request_id=getattr(g, 'request_id', None)
        )

    except Exception as e:
        logger.exception(f"[ERROR] /astrology/ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def register_astrology_routes(app):
    """Register astrology routes blueprint."""
    app.register_blueprint(astrology_bp)
    logger.info("[AstrologyRoutes] Registered astrology routes blueprint")
