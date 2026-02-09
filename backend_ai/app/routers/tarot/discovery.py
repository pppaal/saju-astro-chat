# backend_ai/app/routers/tarot/discovery.py
"""
Tarot discovery route handlers.
Theme listing, semantic search, and topic detection endpoints.
"""

import logging

from flask import Blueprint, request, jsonify, g
from ...utils.request_utils import get_json_or_400

from .dependencies import (
    get_tarot_hybrid_rag,
    has_tarot,
    detect_tarot_topic,
)

logger = logging.getLogger(__name__)


def register_discovery_routes(bp: Blueprint):
    """Register discovery routes on the blueprint."""

    @bp.route('/themes', methods=['GET'])
    def tarot_themes():
        """Get available tarot themes and spreads."""
        if not has_tarot():
            return jsonify({"status": "error", "message": "Tarot module not available"}), 501

        try:
            hybrid_rag = get_tarot_hybrid_rag()
            themes = hybrid_rag.get_available_themes()

            result = []
            for theme in themes:
                sub_topics = hybrid_rag.get_sub_topics(theme)
                result.append({
                    "id": theme,
                    "sub_topics": sub_topics
                })

            return jsonify({
                "status": "success",
                "themes": result
            })

        except Exception as e:
            logger.exception(f"[ERROR] /api/tarot/themes failed: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    @bp.route('/search', methods=['GET'])
    def tarot_search():
        """Semantic search across tarot knowledge."""
        if not has_tarot():
            return jsonify({"status": "error", "message": "Tarot module not available"}), 501

        try:
            query = request.args.get("q", "")
            top_k = int(request.args.get("top_k", 5))
            category = request.args.get("category")

            hybrid_rag = get_tarot_hybrid_rag()
            results = hybrid_rag.search_advanced_rules(query, top_k=top_k, category=category)

            return jsonify({
                "status": "success",
                "results": results
            })

        except Exception as e:
            logger.exception(f"[ERROR] /api/tarot/search failed: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    @bp.route('/detect-topic', methods=['POST'])
    def tarot_detect_topic():
        """Detect tarot theme and sub-topic from chat conversation."""
        try:
            data, json_error = get_json_or_400(request, force=True)
            if json_error:
                return json_error

            if "messages" in data:
                user_messages = [
                    m.get("content", "")
                    for m in data["messages"]
                    if m.get("role") == "user"
                ]
                text = " ".join(user_messages[-3:])
            else:
                text = data.get("text", "")

            if not text:
                return jsonify({
                    "status": "error",
                    "message": "No text provided for analysis"
                }), 400

            detected = detect_tarot_topic(text)

            logger.info(f"[TAROT-DETECT] Detected {detected['theme']}/{detected['sub_topic']} "
                       f"(confidence: {detected['confidence']}) from: {text[:100]}...")

            return jsonify({
                "status": "success",
                "detected": detected
            })

        except Exception as e:
            logger.exception(f"[ERROR] /api/tarot/detect-topic failed: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500
