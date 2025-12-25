"""
Prediction Engine Routes
대운/세운 + 트랜짓 기반 예측 시스템.
Extracted from app.py for better maintainability.
"""
import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

# Blueprint definition
prediction_bp = Blueprint('prediction', __name__, url_prefix='/api/prediction')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_prediction_module = None
HAS_PREDICTION = True


def _get_prediction_module():
    """Lazy load prediction_engine module."""
    global _prediction_module, HAS_PREDICTION
    if _prediction_module is None:
        try:
            from backend_ai.app import prediction_engine as _pe
            _prediction_module = _pe
        except ImportError as e:
            logger.warning(f"[Prediction] Could not import prediction_engine: {e}")
            HAS_PREDICTION = False
            return None
    return _prediction_module


def get_prediction_engine():
    """Get prediction engine instance."""
    mod = _get_prediction_module()
    if mod is None:
        raise RuntimeError("Prediction engine module not available")
    return mod.get_prediction_engine()


def predict_luck(birth_info, years_ahead):
    """Predict luck based on 대운/세운."""
    mod = _get_prediction_module()
    if mod is None:
        raise RuntimeError("Prediction engine module not available")
    return mod.predict_luck(birth_info, years_ahead)


def find_best_date(question, birth_info=None):
    """Find best date for an event."""
    mod = _get_prediction_module()
    if mod is None:
        raise RuntimeError("Prediction engine module not available")
    return mod.find_best_date(question, birth_info)


def get_full_forecast(birth_info, question=None):
    """Get full forecast with 대운/세운/트랜짓 analysis."""
    mod = _get_prediction_module()
    if mod is None:
        raise RuntimeError("Prediction engine module not available")
    return mod.get_full_forecast(birth_info, question)


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@prediction_bp.route('/luck', methods=['POST'])
def prediction_luck():
    """
    대운/세운 기반 운세 예측.
    향후 N년간의 운세 흐름 분석.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        years_ahead = data.get("years_ahead", 5)

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        forecasts = predict_luck(birth_info, years_ahead)

        return jsonify({
            "status": "success",
            "birth_info": birth_info,
            "years_ahead": years_ahead,
            "forecasts": forecasts
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/luck failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/timing', methods=['POST'])
def prediction_timing():
    """
    '언제가 좋을까?' 질문에 답변.
    최적의 날짜/시기 추천.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        question = data.get("question", "")

        if not question:
            return jsonify({"status": "error", "message": "question is required"}), 400

        # 생년월일 정보 (선택)
        birth_info = None
        if data.get("year") and data.get("month"):
            birth_info = {
                "year": data.get("year"),
                "month": data.get("month"),
                "day": data.get("day", 15),
                "hour": data.get("hour", 12),
                "gender": data.get("gender", "unknown")
            }

        result = find_best_date(question, birth_info)

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/timing failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/forecast', methods=['POST'])
def prediction_forecast():
    """
    종합 예측 - 대운/세운/트랜짓 통합 분석.
    AI 해석 포함.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        question = data.get("question")
        include_timing = data.get("include_timing", True)

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        result = get_full_forecast(birth_info, question)

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/forecast failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/daeun', methods=['POST'])
def prediction_daeun():
    """
    현재 대운 상세 정보.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        target_year = data.get("target_year")

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        engine = get_prediction_engine()
        daeun = engine.luck_predictor.calculate_daeun(
            birth_info["year"],
            birth_info["month"],
            birth_info["day"],
            birth_info["hour"],
            birth_info["gender"],
            target_year
        )

        return jsonify({
            "status": "success",
            "daeun": {
                "period_type": daeun.period_type,
                "start_year": daeun.start_year,
                "end_year": daeun.end_year,
                "dominant_god": daeun.dominant_god,
                "element": daeun.element,
                "polarity": daeun.polarity,
                "overall_rating": round(daeun.overall_rating, 1),
                "themes": daeun.themes,
                "opportunities": daeun.opportunities,
                "challenges": daeun.challenges
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/daeun failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/seun', methods=['POST'])
def prediction_seun():
    """
    특정 연도의 세운 정보.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_year = data.get("year")
        birth_month = data.get("month")
        target_year = data.get("target_year")

        if not birth_year or not birth_month:
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        engine = get_prediction_engine()
        seun = engine.luck_predictor.calculate_seun(
            birth_year,
            birth_month,
            target_year
        )

        return jsonify({
            "status": "success",
            "seun": {
                "period_type": seun.period_type,
                "year": seun.start_year,
                "dominant_god": seun.dominant_god,
                "element": seun.element,
                "polarity": seun.polarity,
                "overall_rating": round(seun.overall_rating, 1),
                "themes": seun.themes,
                "opportunities": seun.opportunities,
                "challenges": seun.challenges
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/seun failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/event-types', methods=['GET'])
def prediction_event_types():
    """
    사용 가능한 이벤트 유형 목록.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    event_types = [
        {"id": "career", "name_ko": "직업/사업", "name_en": "Career/Business"},
        {"id": "relationship", "name_ko": "연애/결혼", "name_en": "Love/Marriage"},
        {"id": "finance", "name_ko": "재물/투자", "name_en": "Finance/Investment"},
        {"id": "health", "name_ko": "건강", "name_en": "Health"},
        {"id": "education", "name_ko": "학업/시험", "name_en": "Education/Exam"},
        {"id": "travel", "name_ko": "여행/이사", "name_en": "Travel/Moving"},
        {"id": "contract", "name_ko": "계약/협상", "name_en": "Contract/Negotiation"},
        {"id": "general", "name_ko": "일반", "name_en": "General"}
    ]

    return jsonify({
        "status": "success",
        "event_types": event_types
    })
