# backend_ai/app/routers/daily_fortune_routes.py
"""
Daily Fortune API Routes - 실시간 일일 운세 API
================================================

Endpoints:
- GET  /daily-fortune          - 오늘의 일일 운세
- GET  /daily-fortune/iljin    - 오늘의 일진만
- GET  /daily-fortune/transits - 실시간 행성 트랜짓
- GET  /daily-fortune/weekly   - 주간 운세
- GET  /daily-fortune/monthly  - 월간 운세 개요
- POST /daily-fortune/personal - 개인 맞춤 일일 운세
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
daily_fortune_bp = Blueprint('daily_fortune', __name__, url_prefix='/daily-fortune')


def _get_kst_now():
    """Get current time in KST."""
    from datetime import timedelta, timezone
    KST = timezone(timedelta(hours=9))
    return datetime.now(KST)


@daily_fortune_bp.route("", methods=["GET"])
@daily_fortune_bp.route("/", methods=["GET"])
def get_daily_fortune():
    """
    오늘의 일일 운세

    Query params:
    - date: YYYY-MM-DD (optional, default: today)
    - locale: ko/en (optional, default: ko)
    - include_transits: true/false (optional, default: true)

    Returns:
        일일 운세 종합 정보
    """
    try:
        from backend_ai.app.daily_fortune import get_cached_daily_fortune

        # Parse date
        date_str = request.args.get("date")
        date = None
        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        locale = request.args.get("locale", "ko")
        include_transits = request.args.get("include_transits", "true").lower() == "true"

        result = get_cached_daily_fortune(
            date=date,
            birth_data=None,
            include_transits=include_transits,
            locale=locale
        )

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/iljin", methods=["GET"])
def get_iljin():
    """
    오늘의 일진(日辰)만 반환

    Query params:
    - date: YYYY-MM-DD (optional)

    Returns:
        일진 정보 (천간, 지지, 오행 등)
    """
    try:
        from backend_ai.app.daily_fortune import calculate_iljin

        date_str = request.args.get("date")
        date = None
        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        iljin = calculate_iljin(date)

        return jsonify({
            "status": "success",
            "data": iljin
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/iljin failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/transits", methods=["GET"])
def get_transits():
    """
    실시간 행성 트랜짓

    Returns:
        현재 행성 위치, 달의 위상, 역행 정보, 주요 상호작용
    """
    try:
        from backend_ai.app.realtime_astro import (
            get_current_transits,
            get_transit_interpretation
        )

        locale = request.args.get("locale", "ko")

        transits = get_current_transits()
        interpretation = get_transit_interpretation(transits, locale)

        return jsonify({
            "status": "success",
            "data": {
                "transits": transits,
                "interpretation": interpretation
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/transits failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/weekly", methods=["GET"])
def get_weekly():
    """
    주간 운세 (7일)

    Query params:
    - start_date: YYYY-MM-DD (optional, default: today)

    Returns:
        7일간의 운세 요약
    """
    try:
        from backend_ai.app.daily_fortune import get_weekly_fortune

        date_str = request.args.get("start_date")
        start_date = None
        if date_str:
            try:
                start_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        result = get_weekly_fortune(start_date)

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/weekly failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/monthly", methods=["GET"])
def get_monthly():
    """
    월간 운세 개요

    Query params:
    - year: YYYY (optional, default: current year)
    - month: 1-12 (optional, default: current month)

    Returns:
        월간 운세 개요 (평균 점수, 좋은 날, 주의할 날)
    """
    try:
        from backend_ai.app.daily_fortune import get_monthly_fortune_overview

        now = _get_kst_now()
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))

        if not (1 <= month <= 12):
            return jsonify({"error": "Month must be between 1 and 12"}), 400

        result = get_monthly_fortune_overview(year, month)

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/monthly failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/personal", methods=["POST"])
def get_personal_fortune():
    """
    개인 맞춤 일일 운세

    Request body:
    {
        "date": "2024-01-15",  // optional
        "ilgan": "갑",         // 일간 (천간)
        "natal_sun_sign": "Aries",  // optional, 태양 별자리
        "locale": "ko"         // optional
    }

    Returns:
        개인 맞춤 일일 운세 (십성 관계 포함)
    """
    try:
        from backend_ai.app.daily_fortune import get_cached_daily_fortune

        data = request.get_json() or {}

        # Parse date
        date_str = data.get("date")
        date = None
        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Birth data
        birth_data = {}
        if data.get("ilgan"):
            birth_data["ilgan"] = data["ilgan"]
        if data.get("natal_sun_sign"):
            birth_data["natal_sun_sign"] = data["natal_sun_sign"]

        locale = data.get("locale", "ko")

        result = get_cached_daily_fortune(
            date=date,
            birth_data=birth_data if birth_data else None,
            include_transits=True,
            locale=locale
        )

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/personal failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@daily_fortune_bp.route("/range", methods=["GET"])
def get_fortune_range():
    """
    날짜 범위 운세 (최대 31일)

    Query params:
    - start_date: YYYY-MM-DD (required)
    - end_date: YYYY-MM-DD (required)

    Returns:
        기간 내 일별 운세 요약
    """
    try:
        from backend_ai.app.daily_fortune import calculate_iljin, check_special_days

        start_str = request.args.get("start_date")
        end_str = request.args.get("end_date")

        if not start_str or not end_str:
            return jsonify({"error": "start_date and end_date are required"}), 400

        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        if (end_date - start_date).days > 31:
            return jsonify({"error": "Maximum range is 31 days"}), 400

        if end_date < start_date:
            return jsonify({"error": "end_date must be after start_date"}), 400

        results = []
        current = start_date
        while current <= end_date:
            iljin = calculate_iljin(current)
            specials = check_special_days(current, iljin)

            # Simple score
            score = 60
            for s in specials:
                if s["type"] == "auspicious":
                    score += 15
                elif s["type"] == "caution":
                    score -= 10

            results.append({
                "date": iljin["date"],
                "weekday": iljin["weekday"],
                "ganji": iljin["ganji_hanja"],
                "ohaeng": iljin["ohaeng_emoji"],
                "score": max(20, min(95, score)),
                "specials": [s["name"] for s in specials],
            })

            current = current + __import__('datetime').timedelta(days=1)

        return jsonify({
            "status": "success",
            "data": results
        })

    except Exception as e:
        logger.exception(f"[ERROR] /daily-fortune/range failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def register_daily_fortune_routes(app):
    """Register daily fortune routes blueprint."""
    app.register_blueprint(daily_fortune_bp)
    logger.info("[DailyFortuneRoutes] Registered daily fortune routes blueprint")
