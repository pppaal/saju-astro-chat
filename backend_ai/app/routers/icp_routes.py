"""
ICP (Interpersonal Circumplex) Routes
대인관계 스타일 분석 API
"""
import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

icp_bp = Blueprint('icp', __name__, url_prefix='/api/icp')

_icp_module = None
HAS_ICP = True


def _get_icp():
    global _icp_module, HAS_ICP
    if _icp_module is None:
        try:
            from backend_ai.app import icp_logic as _il
            _icp_module = _il
        except ImportError:
            HAS_ICP = False
            return None
    return _icp_module


@icp_bp.route("/analyze", methods=["POST"])
def icp_analyze():
    m = _get_icp()
    if not m:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        result = m.analyze_icp_style(
            saju_data=data.get("sajuData"),
            astro_data=data.get("astroData"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[icp_analyze] Error")
        return jsonify({"error": str(e)}), 500


@icp_bp.route("/compatibility", methods=["POST"])
def icp_compatibility():
    m = _get_icp()
    if not m:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        p1 = data.get("person1", {})
        p2 = data.get("person2", {})

        result = m.analyze_icp_compatibility(
            person1_saju=p1.get("sajuData"),
            person1_astro=p1.get("astroData"),
            person2_saju=p2.get("sajuData"),
            person2_astro=p2.get("astroData"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[icp_compatibility] Error")
        return jsonify({"error": str(e)}), 500


@icp_bp.route("/questions", methods=["POST"])
def icp_questions():
    m = _get_icp()
    if not m:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        style = data.get("style", "PA")
        locale = data.get("locale", "ko")

        questions = m.get_icp_questions(style, locale)
        return jsonify({"status": "success", "questions": questions, "style": style})

    except Exception as e:
        logger.exception("[icp_questions] Error")
        return jsonify({"error": str(e)}), 500
