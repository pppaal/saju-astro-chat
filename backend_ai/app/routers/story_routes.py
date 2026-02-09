"""
Story Routes Blueprint

Handles destiny story generation endpoints.

Phase 3.1: Created with DestinyStoryService
"""
import logging
from flask import Blueprint, request, jsonify
from ..utils.request_utils import get_json_or_400

logger = logging.getLogger(__name__)

story_bp = Blueprint('story', __name__, url_prefix='/api/destiny-story')


def _get_destiny_story_service():
    """Lazy load DestinyStoryService to avoid import issues."""
    from backend_ai.services.destiny_story_service import DestinyStoryService
    return DestinyStoryService()


@story_bp.route('/generate-stream', methods=['POST'])
def generate_destiny_story_stream():
    """
    Generate a personalized ~20,000 character destiny story using AI.
    Combines Eastern (Saju) and Western (Astrology) wisdom with ALL RAG data.

    Phase 3.1 Refactored: Now uses DestinyStoryService directly.
    """
    try:
        data, json_error = get_json_or_400(request, force=True)
        if json_error:
            return json_error
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        locale = data.get("locale", "ko")

        # Call DestinyStoryService (business logic)
        service = _get_destiny_story_service()
        return service.generate_story_stream(
            saju_data=saju_data,
            astro_data=astro_data,
            locale=locale
        )
    except Exception as e:
        logger.exception(f"[ERROR] /api/destiny-story/generate-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
