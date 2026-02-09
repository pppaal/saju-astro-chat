"""
Theme Cross-Reference Filter Routes
테마별 사주+점성 교차점 분석 API
"""
import logging
from flask import Blueprint, request, jsonify
from ..utils.request_utils import get_json_or_400

logger = logging.getLogger(__name__)

theme_bp = Blueprint('theme', __name__, url_prefix='/api/theme')

# Lazy load theme filter
_theme_filter_module = None
HAS_THEME_FILTER = True


def _get_theme_filter():
    global _theme_filter_module, HAS_THEME_FILTER
    if _theme_filter_module is None:
        try:
            from backend_ai.app import theme_cross_filter as _tf
            _theme_filter_module = _tf
        except ImportError:
            HAS_THEME_FILTER = False
            return None
    return _theme_filter_module


@theme_bp.route("/filter", methods=["POST"])
def theme_filter():
    """테마별 사주+점성 교차점 필터링."""
    m = _get_theme_filter()
    if not m:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        result = m.filter_data_by_theme(theme, saju_data, astro_data)

        return jsonify({"status": "success", **result})

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/filter failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@theme_bp.route("/cross-points", methods=["POST"])
def theme_cross_points():
    """테마별 사주-점성 교차점 상세 분석."""
    m = _get_theme_filter()
    if not m:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        theme_filter_engine = m.get_theme_filter()
        summary = theme_filter_engine.get_theme_summary(theme, saju_data, astro_data)

        return jsonify({
            "status": "success",
            "theme": theme,
            "relevance_score": summary.get("relevance_score", 0),
            "highlights": summary.get("highlights", []),
            "intersections": summary.get("intersections", []),
            "important_dates": summary.get("important_dates", []),
            "saju_factors": summary.get("saju_factors", []),
            "astro_factors": summary.get("astro_factors", [])
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/cross-points failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@theme_bp.route("/prompt-context", methods=["POST"])
def theme_prompt_context():
    """AI 프롬프트용 테마별 컨텍스트 생성."""
    m = _get_theme_filter()
    if not m:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        context = m.get_theme_prompt_context(theme, saju_data, astro_data)

        return jsonify({
            "status": "success",
            "theme": theme,
            "prompt_context": context
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/prompt-context failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@theme_bp.route("/important-dates", methods=["POST"])
def theme_important_dates():
    """테마별 중요 날짜만 반환."""
    m = _get_theme_filter()
    if not m:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        theme_filter_engine = m.get_theme_filter()
        summary = theme_filter_engine.get_theme_summary(theme, saju_data, astro_data)

        dates = summary.get("important_dates", [])
        auspicious = [d for d in dates if d.get("is_auspicious", True)]
        caution = [d for d in dates if not d.get("is_auspicious", True)]

        return jsonify({
            "status": "success",
            "theme": theme,
            "auspicious_dates": auspicious,
            "caution_dates": caution,
            "total_count": len(dates)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/important-dates failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@theme_bp.route("/available", methods=["GET"])
def theme_available():
    """사용 가능한 테마 목록."""
    themes = [
        {"id": "love", "name_ko": "연애/결혼", "name_en": "Love/Marriage", "icon": "💕"},
        {"id": "career", "name_ko": "직업/사업", "name_en": "Career/Business", "icon": "💼"},
        {"id": "wealth", "name_ko": "재물/투자", "name_en": "Wealth/Finance", "icon": "💰"},
        {"id": "health", "name_ko": "건강", "name_en": "Health", "icon": "🏥"},
        {"id": "family", "name_ko": "가족/관계", "name_en": "Family/Relations", "icon": "👨‍👩‍👧‍👦"},
        {"id": "education", "name_ko": "학업/시험", "name_en": "Education/Exam", "icon": "📚"},
        {"id": "overall", "name_ko": "전체 운세", "name_en": "Overall Fortune", "icon": "🔮"},
        {"id": "monthly", "name_ko": "월운", "name_en": "Monthly Fortune", "icon": "📅"},
        {"id": "yearly", "name_ko": "연운", "name_en": "Yearly Fortune", "icon": "🗓️"},
        {"id": "daily", "name_ko": "일운", "name_en": "Daily Fortune", "icon": "☀️"}
    ]

    return jsonify({
        "status": "success",
        "themes": themes,
        "theme_filter_available": HAS_THEME_FILTER
    })
