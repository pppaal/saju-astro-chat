"""
Chart calculation routes - Saju and Astrology calculations.

Extracted from app.py as part of Phase 1.1 refactoring.
"""
from flask import Blueprint, request, jsonify, g
import logging

from backend_ai.app.saju_parser import calculate_saju_data
from backend_ai.app.astro_parser import calculate_astrology_data

logger = logging.getLogger(__name__)

# Create Blueprint
chart_bp = Blueprint('chart', __name__)


@chart_bp.route("/calc_saju", methods=["POST"])
def calc_saju():
    """Calculate Saju (사주) from birth data."""
    try:
        body = request.get_json(force=True)
        payload = body.get("payload") or body.get("saju") or body.get("computeDestinyMap")
        birth_date = body.get("birth_date")
        birth_time = body.get("birth_time")
        gender = body.get("gender", "male")

        if payload:
            result = calculate_saju_data(payload=payload)
        else:
            raise ValueError("Saju payload missing. computeDestinyMap result required.")
        return jsonify({"status": "success", "saju": result})
    except Exception as e:
        logger.exception(f"[ERROR] /calc_saju failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@chart_bp.route("/calc_astro", methods=["POST"])
def calc_astro():
    """Calculate Astrology chart from birth data."""
    try:
        body = request.get_json(force=True)
        result = calculate_astrology_data(
            {
                "year": body.get("year"),
                "month": body.get("month"),
                "day": body.get("day"),
                "hour": body.get("hour"),
                "minute": body.get("minute"),
                "latitude": body.get("latitude"),
                "longitude": body.get("longitude"),
            }
        )
        return jsonify({"status": "success", "astro": result})
    except Exception as e:
        logger.exception(f"[ERROR] /calc_astro failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@chart_bp.route("/transits", methods=["GET"])
def get_transits():
    """Get current astrological transits."""
    # Import lazy-loaded module
    try:
        from backend_ai.app.realtime_astro import get_current_transits, get_transit_interpretation
    except ImportError:
        return jsonify({"status": "error", "message": "Realtime astro not available"}), 503

    try:
        transits = get_current_transits()
        interpretation = get_transit_interpretation(transits)
        return jsonify({
            "status": "success",
            "transits": transits,
            "interpretation": interpretation
        })
    except Exception as e:
        logger.exception(f"[ERROR] /transits failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@chart_bp.route("/charts/saju", methods=["POST"])
def generate_saju_chart():
    """Generate Saju chart SVG."""
    try:
        from backend_ai.app.chart_generator import generate_saju_table_svg, svg_to_base64
    except ImportError:
        return jsonify({"status": "error", "message": "Chart generation not available"}), 503

    try:
        body = request.get_json(force=True)
        saju_data = body.get("saju", {})

        svg_content = generate_saju_table_svg(saju_data)
        base64_svg = svg_to_base64(svg_content)

        return jsonify({
            "status": "success",
            "svg": svg_content,
            "base64": base64_svg
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/saju failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@chart_bp.route("/charts/natal", methods=["POST"])
def generate_natal_chart():
    """Generate Natal chart SVG."""
    try:
        from backend_ai.app.chart_generator import generate_natal_chart_svg, svg_to_base64
    except ImportError:
        return jsonify({"status": "error", "message": "Chart generation not available"}), 503

    try:
        body = request.get_json(force=True)
        astro_data = body.get("astro", {})

        svg_content = generate_natal_chart_svg(astro_data)
        base64_svg = svg_to_base64(svg_content)

        return jsonify({
            "status": "success",
            "svg": svg_content,
            "base64": base64_svg
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/natal failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@chart_bp.route("/charts/full", methods=["POST"])
def generate_full_chart():
    """Generate full chart HTML (Saju + Natal combined)."""
    try:
        from backend_ai.app.chart_generator import generate_full_chart_html
    except ImportError:
        return jsonify({"status": "error", "message": "Chart generation not available"}), 503

    try:
        body = request.get_json(force=True)
        saju_data = body.get("saju", {})
        astro_data = body.get("astro", {})

        html_content = generate_full_chart_html(saju_data, astro_data)

        return jsonify({
            "status": "success",
            "html": html_content
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/full failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
