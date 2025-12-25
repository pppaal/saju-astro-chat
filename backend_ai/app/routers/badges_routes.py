"""
Badge System Routes
User badges, achievements, and gamification.
Extracted from app.py for better maintainability.
"""
import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

# Blueprint definition
badges_bp = Blueprint('badges', __name__, url_prefix='/badges')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_badges_module = None
HAS_BADGES = True


def _get_badges_module():
    """Lazy load badge_system module."""
    global _badges_module, HAS_BADGES
    if _badges_module is None:
        try:
            from backend_ai.app import badge_system as _bs
            _badges_module = _bs
        except ImportError as e:
            logger.warning(f"[Badges] Could not import badge_system: {e}")
            HAS_BADGES = False
            return None
    return _badges_module


def get_badge_system():
    """Get badge system instance."""
    mod = _get_badges_module()
    if mod is None:
        raise RuntimeError("Badge system module not available")
    return mod.get_badge_system()


def get_midjourney_prompts():
    """Get Midjourney prompts for badge images."""
    mod = _get_badges_module()
    if mod is None:
        raise RuntimeError("Badge system module not available")
    return mod.get_midjourney_prompts()


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@badges_bp.route('/all', methods=['GET'])
def badges_all():
    """Get all available badges."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        locale = request.args.get("locale", "ko")
        badge_system = get_badge_system()
        badges = badge_system.get_all_badges(locale)

        return jsonify({
            "status": "success",
            "badges": badges,
            "total": len(badges),
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/all failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@badges_bp.route('/user', methods=['POST'])
def badges_user():
    """Get user's badge summary."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        data = request.get_json(force=True)
        user_id = data.get("user_id", "")
        locale = data.get("locale", "ko")

        # Can also generate user_id from birth data
        if not user_id and data.get("birth"):
            from backend_ai.app.user_memory import generate_user_id
            user_id = generate_user_id(data["birth"])

        if not user_id:
            return jsonify({"status": "error", "message": "user_id or birth data required"}), 400

        badge_system = get_badge_system()
        summary = badge_system.get_user_badge_summary(user_id, locale)

        return jsonify({
            "status": "success",
            **summary,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/user failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@badges_bp.route('/midjourney-prompts', methods=['GET'])
def badges_midjourney():
    """Get Midjourney prompts for badge images."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        prompts = get_midjourney_prompts()

        return jsonify({
            "status": "success",
            "prompts": prompts,
            "count": len(prompts),
            "usage": "Copy each prompt to Midjourney to generate badge images. Save as /public/badges/{badge_id}.png",
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/midjourney-prompts failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
