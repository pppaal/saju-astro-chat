"""
Dream Interpretation API Routes
Dream analysis and chat functionality.
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
import logging

dream_bp = Blueprint('dream', __name__, url_prefix='/api/dream')
logger = logging.getLogger(__name__)

# Lazy imports
_dream_logic = None
_sanitizer = None


def _get_dream_logic():
    global _dream_logic
    if _dream_logic is None:
        try:
            from backend_ai.app import dream_logic
            _dream_logic = dream_logic
        except ImportError:
            from .. import dream_logic
            _dream_logic = dream_logic
    return _dream_logic


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


@dream_bp.route('/', methods=['POST'])
@dream_bp.route('/interpret', methods=['POST'])
def dream_interpret():
    """Interpret a dream."""
    try:
        data = request.get_json()

        # Sanitize dream text
        sanitizer = _get_sanitizer()
        dream_text = data.get('dreamText', '')
        dream_text = sanitizer.sanitize_dream_text(dream_text)

        dream_logic = _get_dream_logic()
        result = dream_logic.interpret_dream({
            **data,
            'dreamText': dream_text
        })

        return jsonify(result)

    except Exception as e:
        logger.error(f"[dream_interpret] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@dream_bp.route('/interpret-stream', methods=['POST'])
def dream_interpret_stream():
    """Stream dream interpretation."""
    try:
        data = request.get_json()

        def generate():
            try:
                sanitizer = _get_sanitizer()
                dream_logic = _get_dream_logic()
                dream_text = sanitizer.sanitize_dream_text(data.get('dreamText', ''))
                result = dream_logic.interpret_dream({**data, 'dreamText': dream_text})

                yield f"data: {jsonify({'type': 'complete', 'result': result}).get_data(as_text=True)}\n\n"

            except Exception as e:
                logger.error(f"[dream_interpret_stream] Error: {e}")
                yield f"data: {jsonify({'type': 'error', 'message': str(e)}).get_data(as_text=True)}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream'
        )

    except Exception as e:
        logger.error(f"[dream_interpret_stream] Setup error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
