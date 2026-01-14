"""
Counselor Service

Business logic for counselor session initialization with RAG prefetch.
This service is independent of Flask and can be tested in isolation.

Moved from app.py to separate business logic from routing.
"""
import logging
import os
from typing import Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class CounselorService:
    """
    Counselor session service with RAG prefetch.

    Methods:
        initialize_session: Initialize counselor session with pre-fetched RAG data
    """

    def __init__(self):
        """Initialize Counselor Service."""
        pass

    def initialize_session(
        self,
        saju_data: Dict[str, Any],
        astro_data: Dict[str, Any],
        birth_data: Dict[str, Any],
        theme: str = "chat",
        locale: str = "ko",
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initialize counselor session with pre-fetched RAG data.

        This pre-computes all relevant RAG data (~10-20s) so subsequent
        chat messages are instant.

        Args:
            saju_data: Saju birth chart data
            astro_data: Astrology birth chart data
            birth_data: Birth date/time data for validation
            theme: Counselor theme (chat, career, love, etc.)
            locale: Language locale (en, ko)
            request_id: Optional request ID for logging

        Returns:
            Dict with session info:
            {
                "status": "success",
                "session_id": "abc123",
                "prefetch_time_ms": 15234,
                "data_summary": {
                    "graph_nodes": 15,
                    "corpus_quotes": 5,
                    "persona_insights": 10
                }
            }
        """
        try:
            # Import dependencies (lazy loaded in app.py)
            from backend_ai.app.app import (
                normalize_day_master,
                prefetch_all_rag_data,
                set_session_rag_cache,
                validate_birth_data,
                _has_saju_payload,
                _has_astro_payload,
                _is_truthy,
                _build_birth_format_message,
                _build_missing_payload_message,
                _bool_env,
                _calculate_simple_saju,
            )

            logger.info(f"[CounselorService] request_id={request_id} theme={theme} locale={locale}")

            # Normalize dayMaster structure (nested -> flat)
            saju_data = normalize_day_master(saju_data)

            # Validate payloads
            has_saju_payload = _has_saju_payload(saju_data)
            has_astro_payload = _has_astro_payload(astro_data)
            require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))

            if require_computed_payload and (not has_saju_payload or not has_astro_payload):
                if birth_data.get("date") or birth_data.get("time"):
                    valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                    if not valid_birth:
                        logger.warning("[CounselorService] Invalid birth format for missing payload")
                        return {
                            "status": "error",
                            "message": _build_birth_format_message(locale),
                            "http_status": 400
                        }
                missing_message = _build_missing_payload_message(
                    locale,
                    missing_saju=not has_saju_payload,
                    missing_astro=not has_astro_payload,
                )
                logger.warning("[CounselorService] Missing computed payload(s)")
                return {
                    "status": "error",
                    "message": missing_message,
                    "http_status": 400
                }

            logger.info(f"[CounselorService] saju dayMaster: {saju_data.get('dayMaster', {})}")
            logger.info(f"[CounselorService] astro_data keys: {list(astro_data.keys()) if astro_data else 'empty'}")

            # Allow birth-only compute if enabled
            allow_birth_compute = _bool_env("ALLOW_BIRTH_ONLY")
            if allow_birth_compute and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
                try:
                    saju_data = _calculate_simple_saju(
                        birth_data["date"],
                        birth_data["time"],
                    )
                    saju_data = normalize_day_master(saju_data)
                    logger.info(f"[CounselorService] Computed simple saju from birth data: {saju_data.get('dayMaster', {})}")
                except Exception as e:
                    logger.warning(f"[CounselorService] Failed to compute simple saju: {e}")

            # Generate session ID
            session_id = str(uuid4())[:12]

            # Pre-fetch ALL RAG data (this is slow but only happens once)
            rag_data = prefetch_all_rag_data(saju_data, astro_data, theme, locale)

            # Store in session cache
            set_session_rag_cache(session_id, {
                "rag_data": rag_data,
                "saju_data": saju_data,
                "astro_data": astro_data,
                "theme": theme,
            })

            return {
                "status": "success",
                "session_id": session_id,
                "prefetch_time_ms": rag_data.get("prefetch_time_ms", 0),
                "data_summary": {
                    "graph_nodes": len(rag_data.get("graph_nodes", [])),
                    "corpus_quotes": len(rag_data.get("corpus_quotes", [])),
                    "persona_insights": len(rag_data.get("persona_context", {}).get("jung", [])) +
                                       len(rag_data.get("persona_context", {}).get("stoic", [])),
                    "has_cross_analysis": bool(rag_data.get("cross_analysis")),
                }
            }

        except Exception as e:
            logger.exception(f"[CounselorService] request_id={request_id} initialize_session failed: {e}")
            return {"status": "error", "message": str(e), "http_status": 500}
