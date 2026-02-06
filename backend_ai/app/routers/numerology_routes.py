"""
Numerology Analysis Routes
수비학 분석 API
"""
import logging
from flask import Blueprint, request, jsonify

from backend_ai.app.exceptions import (
    BackendAIError,
    ServiceUnavailableError,
    ValidationError,
)

logger = logging.getLogger(__name__)

numerology_bp = Blueprint('numerology', __name__, url_prefix='/api/numerology')

_numerology_module = None
HAS_NUMEROLOGY = True


def _get_numerology():
    global _numerology_module, HAS_NUMEROLOGY
    if _numerology_module is None:
        try:
            from backend_ai.app import numerology_logic as _nl
            _numerology_module = _nl
        except ImportError:
            HAS_NUMEROLOGY = False
            return None
    return _numerology_module


@numerology_bp.route("/analyze", methods=["POST"])
def numerology_analyze():
    m = _get_numerology()
    if not m:
        raise ServiceUnavailableError("Numerology module not available")

    try:
        data = request.get_json() or {}
        birth_date = data.get("birthDate")
        if not birth_date:
            raise ValidationError("birthDate is required", field="birthDate")

        result = m.analyze_numerology(
            birth_date=birth_date,
            english_name=data.get("englishName"),
            korean_name=data.get("koreanName"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except BackendAIError:
        raise
    except Exception as e:
        logger.exception("[numerology_analyze] Error")
        raise BackendAIError(str(e), "INTERNAL_ERROR")


@numerology_bp.route("/compatibility", methods=["POST"])
def numerology_compatibility():
    m = _get_numerology()
    if not m:
        raise ServiceUnavailableError("Numerology module not available")

    try:
        data = request.get_json() or {}
        p1 = data.get("person1", {})
        p2 = data.get("person2", {})

        if not p1.get("birthDate") or not p2.get("birthDate"):
            raise ValidationError("Both birthDates are required", field="birthDate")

        result = m.analyze_numerology_compatibility(
            person1_birth=p1["birthDate"],
            person2_birth=p2["birthDate"],
            person1_name=p1.get("name"),
            person2_name=p2.get("name"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except BackendAIError:
        raise
    except Exception as e:
        logger.exception("[numerology_compatibility] Error")
        raise BackendAIError(str(e), "INTERNAL_ERROR")
