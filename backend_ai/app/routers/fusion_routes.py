"""
Fusion (Saju + Astro + Tarot) API Routes
Handles destiny map analysis and stream responses.
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
import json
import logging

fusion_bp = Blueprint('fusion', __name__, url_prefix='/api/fusion')
logger = logging.getLogger(__name__)

# Lazy imports to avoid circular dependencies
_fusion_logic = None
_sanitizer = None


def _get_fusion_logic():
    global _fusion_logic
    if _fusion_logic is None:
        try:
            from backend_ai.app import fusion_logic
            _fusion_logic = fusion_logic
        except ImportError:
            from .. import fusion_logic
            _fusion_logic = fusion_logic
    return _fusion_logic


def _get_sanitizer():
    global _sanitizer
    if _sanitizer is None:
        try:
            from backend_ai.app import sanitizer
            _sanitizer = sanitizer
        except ImportError:
            from .. import sanitizer
            _sanitizer = sanitizer
    return _sanitizer


@fusion_bp.route('/ask', methods=['POST'])
def fusion_ask():
    """Main fusion analysis endpoint."""
    try:
        data = request.get_json()

        # Input validation
        sanitizer = _get_sanitizer()
        if sanitizer.is_suspicious_input(json.dumps(data)):
            logger.warning("[Security] Suspicious fusion request detected")

        fusion_logic = _get_fusion_logic()
        result = fusion_logic.interpret_with_ai(data)
        return jsonify(result)

    except Exception as e:
        logger.error(f"[fusion_ask] Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@fusion_bp.route('/ask-stream', methods=['POST'])
def fusion_ask_stream():
    """Streaming fusion analysis for real-time updates."""
    try:
        data = request.get_json()

        def generate():
            try:
                fusion_logic = _get_fusion_logic()
                result = fusion_logic.interpret_with_ai(data)

                # Stream progress updates
                yield f"data: {json.dumps({'type': 'progress', 'step': 'analyzing'})}\n\n"

                # Stream final result
                yield f"data: {json.dumps({'type': 'complete', 'result': result})}\n\n"

            except Exception as e:
                logger.error(f"[fusion_ask_stream] Error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.error(f"[fusion_ask_stream] Setup error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
