"""
RLHF (Reinforcement Learning from Human Feedback) Routes
Feedback collection, analysis, and model improvement.
Extracted from app.py for better maintainability.
"""
import logging
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from ..utils.request_utils import get_json_or_400

logger = logging.getLogger(__name__)

# Blueprint definition
rlhf_bp = Blueprint('rlhf', __name__, url_prefix='/rlhf')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_rlhf_module = None
HAS_RLHF = True


def _get_rlhf_module():
    """Lazy load feedback_learning module."""
    global _rlhf_module, HAS_RLHF
    if _rlhf_module is None:
        try:
            from backend_ai.app import feedback_learning as _fl
            _rlhf_module = _fl
        except ImportError as e:
            logger.warning(f"[RLHF] Could not import feedback_learning: {e}")
            HAS_RLHF = False
            return None
    return _rlhf_module


def get_feedback_learning():
    """Get feedback learning instance."""
    mod = _get_rlhf_module()
    if mod is None:
        raise RuntimeError("RLHF module not available")
    return mod.get_feedback_learning()


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@rlhf_bp.route('/stats', methods=['GET'])
def rlhf_stats():
    """Get RLHF feedback statistics."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        fl = get_feedback_learning()
        stats = fl.get_stats()

        return jsonify({
            "status": "success",
            "stats": stats,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/analyze', methods=['GET'])
def rlhf_analyze():
    """Analyze feedback patterns to identify improvement areas."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme")
        days = int(request.args.get("days", 30))

        fl = get_feedback_learning()
        analysis = fl.analyze_feedback_patterns(theme=theme, days=days)

        return jsonify({
            "status": "success",
            "analysis": analysis,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/analyze failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/suggestions', methods=['GET'])
def rlhf_suggestions():
    """Get improvement suggestions based on feedback analysis."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        fl = get_feedback_learning()
        suggestions = fl.get_improvement_suggestions()

        return jsonify({
            "status": "success",
            "suggestions": suggestions,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/suggestions failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/fewshot', methods=['GET'])
def rlhf_fewshot():
    """Get Few-shot examples for a theme."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme", "life_path")
        locale = request.args.get("locale", "ko")
        top_k = int(request.args.get("top_k", 3))

        fl = get_feedback_learning()
        examples = fl.get_fewshot_examples(theme, locale, top_k)
        formatted = fl.format_fewshot_prompt(theme, locale, top_k)

        return jsonify({
            "status": "success",
            "examples": examples,
            "formatted_prompt": formatted,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/fewshot failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/export', methods=['GET'])
def rlhf_export():
    """Export training data for fine-tuning."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        min_rating = int(request.args.get("min_rating", 4))
        limit = int(request.args.get("limit", 500))

        fl = get_feedback_learning()
        training_data = fl.export_training_data(min_rating=min_rating, limit=limit)

        return jsonify({
            "status": "success",
            "count": len(training_data),
            "training_data": training_data,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/export failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/feedback', methods=['POST'])
def rlhf_record_feedback():
    """
    Record feedback directly to RLHF system with full consultation context.
    """
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error

        record_id = data.get("record_id", "")
        user_id = data.get("user_id", "anonymous")
        rating = data.get("rating")
        feedback_text = data.get("feedback", "")

        # Full consultation context for learning
        consultation_data = {
            "theme": data.get("theme", "unknown"),
            "locale": data.get("locale", "ko"),
            "service_type": data.get("service_type", "fusion"),
            "summary": data.get("summary", ""),
            "key_insights": data.get("key_insights", []),
            "prompt": data.get("user_question", ""),
            "context": data.get("context", ""),
        }

        if not record_id or rating is None:
            return jsonify({
                "status": "error",
                "message": "record_id and rating are required"
            }), 400

        fl = get_feedback_learning()
        result = fl.record_feedback(
            record_id=record_id,
            user_id=user_id,
            rating=rating,
            feedback_text=feedback_text,
            consultation_data=consultation_data,
        )

        # Handle return value
        if isinstance(result, tuple):
            feedback_id, new_badges = result
        else:
            feedback_id = result
            new_badges = []

        # Update rule weights if rules were used
        rules_used = data.get("rules_used", [])
        if rules_used and rating:
            fl.adjust_rule_weights(
                theme=consultation_data["theme"],
                rules_used=rules_used,
                rating=rating,
            )

        logger.info(f"[RLHF] Recorded feedback {feedback_id}: rating={rating}")

        response = {
            "status": "success",
            "feedback_id": feedback_id,
            "message": "Feedback recorded for RLHF learning",
        }

        # Include new badges if any
        if new_badges:
            locale = data.get("locale", "ko")
            response["new_badges"] = [
                {
                    "id": b.id,
                    "name": b.name_ko if locale == "ko" else b.name_en,
                    "description": b.description_ko if locale == "ko" else b.description_en,
                    "rarity": b.rarity.value,
                    "image_path": b.image_path,
                    "points": b.points,
                }
                for b in new_badges
            ]
            response["badges_earned_count"] = len(new_badges)

        return jsonify(response)
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/feedback failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/weights', methods=['GET'])
def rlhf_weights():
    """Get adjusted rule weights for a theme."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme")

        fl = get_feedback_learning()
        weights = fl.get_rule_weights(theme)

        return jsonify({
            "status": "success",
            "theme": theme,
            "weights": weights,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/weights failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@rlhf_bp.route('/analytics', methods=['GET'])
def rlhf_analytics():
    """
    Get feedback analytics for counseling quality improvement.
    """
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        days = request.args.get("days", 30, type=int)
        theme_filter = request.args.get("theme")

        fl = get_feedback_learning()

        # Get cutoff date
        cutoff_date = datetime.now() - timedelta(days=days)

        # Aggregate statistics
        stats = {
            "total_feedbacks": 0,
            "average_rating": 0.0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "theme_breakdown": {},
            "top_positive_themes": [],
            "needs_improvement_themes": [],
            "common_feedback_keywords": [],
            "trend": "stable",
            "period_days": days,
        }

        # Get actual stats from feedback learning
        try:
            base_stats = fl.get_stats()
            if base_stats:
                stats.update(base_stats)
        except Exception:
            pass

        # Get analysis for trends
        try:
            analysis = fl.analyze_feedback_patterns(theme=theme_filter, days=days)
            if analysis:
                stats["analysis"] = analysis
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "analytics": stats,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/analytics failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
