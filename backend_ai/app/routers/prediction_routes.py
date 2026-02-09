"""
Prediction Engine Routes
대운/세운 + 트랜짓 기반 예측 시스템.
Extracted from app.py for better maintainability.
"""
import logging
from flask import Blueprint, request, jsonify
from ..utils.request_utils import get_json_or_400

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
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
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
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
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
    AI 해석 + RAG 컨텍스트 포함.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
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

        # RAG 컨텍스트가 있으면 포함
        response_data = {
            "status": "success",
            **result
        }

        # rag_context가 비어있으면 제거 (불필요한 데이터 전송 방지)
        if not response_data.get("rag_context"):
            response_data.pop("rag_context", None)

        return jsonify(response_data)

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/forecast failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/rag-context', methods=['POST'])
def prediction_rag_context():
    """
    예측 관련 RAG 컨텍스트만 반환.
    프론트엔드에서 별도로 RAG 컨텍스트가 필요할 때 사용.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        sipsin = data.get("sipsin")  # 십신 이름 (정관, 편재 등)
        event_type = data.get("event_type")  # career, relationship 등
        query = data.get("query")  # 자유 검색 쿼리

        engine = get_prediction_engine()
        result = {"status": "success", "rag_context": {}}

        # 십신 기반 검색
        if sipsin:
            context = engine.get_sipsin_rag_context(sipsin, event_type)
            if context:
                result["rag_context"]["sipsin"] = context

        # 이벤트 타입 기반 검색
        if event_type:
            context = engine.get_timing_rag_context(event_type)
            if context:
                result["rag_context"]["timing"] = context

        # 자유 쿼리 검색
        if query:
            rag_result = engine.search_rag_context(query, top_k=6)
            if rag_result.get("context_text"):
                result["rag_context"]["query_result"] = rag_result["context_text"]

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/rag-context failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@prediction_bp.route('/daeun', methods=['POST'])
def prediction_daeun():
    """
    현재 대운 상세 정보.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
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
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
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
