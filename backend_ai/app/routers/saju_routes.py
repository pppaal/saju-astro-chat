"""
Saju Routes

Saju-specific streaming endpoints for AI-powered saju reading.

Routes:
- POST /saju/counselor/init - Initialize saju counselor session
- POST /saju/ask-stream - Streaming saju-focused AI reading

Phase 3.2: Refactored to use SajuCounselorService
"""
from flask import Blueprint, request, jsonify, Response, g
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
saju_bp = Blueprint('saju', __name__, url_prefix='/saju')


def _get_saju_counselor_service():
    """Lazy load SajuCounselorService to avoid import issues."""
    from backend_ai.services.saju_counselor_service import SajuCounselorService
    return SajuCounselorService()


def _normalize_birth_payload(data: dict) -> dict:
    """Lazy import and call normalize function."""
    from backend_ai.app.app import _normalize_birth_payload
    return _normalize_birth_payload(data)


@saju_bp.route("/counselor/init", methods=["POST"])
def saju_counselor_init():
    """
    Initialize saju-specific counselor session with RAG prefetch.

    Phase 3.2 Refactored: Now uses SajuCounselorService directly.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        service = _get_saju_counselor_service()
        result, status_code = service.initialize_session(
            saju_data=saju_data,
            birth_data=birth_data,
            theme=theme,
            locale=locale,
            request_id=getattr(g, 'request_id', None)
        )
        return jsonify(result), status_code

    except Exception as e:
        logger.exception(f"[ERROR] /saju/counselor/init failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@saju_bp.route("/ask-stream", methods=["POST"])
def saju_ask_stream():
    """
    Streaming saju-focused AI reading with SSE.

    Phase 3.2 Refactored: Now uses SajuCounselorService directly.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")
        prompt = (data.get("prompt") or "")[:1500]
        session_id = data.get("session_id")
        conversation_history = data.get("history") or []
        user_context = data.get("user_context") or {}

        service = _get_saju_counselor_service()
        return service.stream_chat(
            saju_data=saju_data,
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
        logger.exception(f"[ERROR] /saju/ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def register_saju_routes(app):
    """Register saju routes blueprint."""
    app.register_blueprint(saju_bp)
    logger.info("[SajuRoutes] Registered saju routes blueprint")
