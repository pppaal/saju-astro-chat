"""
User Memory Routes
Consultation storage, context retrieval, and history management.
Extracted from app.py for better maintainability.
"""
import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

# Blueprint definition
memory_bp = Blueprint('memory', __name__, url_prefix='/memory')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_memory_module = None
HAS_USER_MEMORY = True


def _get_memory_module():
    """Lazy load user_memory module."""
    global _memory_module, HAS_USER_MEMORY
    if _memory_module is None:
        try:
            from backend_ai.app import user_memory as _um
            _memory_module = _um
        except ImportError as e:
            logger.warning(f"[Memory] Could not import user_memory: {e}")
            HAS_USER_MEMORY = False
            return None
    return _memory_module


def get_user_memory(user_id: str):
    """Get user memory instance."""
    mod = _get_memory_module()
    if mod is None:
        raise RuntimeError("User memory module not available")
    return mod.get_user_memory(user_id)


def generate_user_id(birth_data: dict) -> str:
    """Generate user ID from birth data."""
    mod = _get_memory_module()
    if mod is None:
        raise RuntimeError("User memory module not available")
    return mod.generate_user_id(birth_data)


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@memory_bp.route('/save', methods=['POST'])
def save_consultation():
    """Save consultation to user memory."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        theme = data.get("theme", "")
        locale = data.get("locale", "en")
        result = data.get("result", "")

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)

        record_id = memory.save_consultation(
            theme=theme,
            locale=locale,
            birth_data=birth_data,
            fusion_result=result,
        )

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "record_id": record_id,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/save failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@memory_bp.route('/context', methods=['POST'])
def get_memory_context():
    """Get user context for personalized readings."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        theme = data.get("theme", "life_path")
        locale = data.get("locale", "en")

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)

        context = memory.build_context_for_llm(theme, locale)
        profile = memory.get_profile()
        history = memory.get_history(limit=5)

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "context": context,
            "profile": profile.__dict__ if profile else None,
            "history": history,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/context failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@memory_bp.route('/feedback', methods=['POST'])
def save_feedback():
    """Save user feedback for a consultation (MOAT - improves recommendations)."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        record_id = data.get("record_id", "")
        feedback = data.get("feedback", "")  # Text feedback
        rating = data.get("rating")  # 1-5 stars or thumbs up/down (1 or 5)

        if not record_id:
            return jsonify({"status": "error", "message": "record_id required"}), 400

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)
        memory.save_feedback(record_id, feedback, rating)

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "record_id": record_id,
            "message": "Feedback saved successfully",
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/feedback failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@memory_bp.route('/history', methods=['POST'])
def get_history():
    """Get user consultation history."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        limit = data.get("limit", 10)

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)
        history = memory.get_history(limit=limit)
        profile = memory.get_profile()

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "history": history,
            "consultation_count": profile.consultation_count if profile else 0,
            "dominant_themes": profile.dominant_themes if profile else [],
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/history failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
