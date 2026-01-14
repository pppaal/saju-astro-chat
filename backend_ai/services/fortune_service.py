"""
Fortune Service

Business logic for fortune telling with Saju/Astrology/Tarot fusion.
This service is independent of Flask and can be tested in isolation.

Moved from app.py to separate business logic from routing.
"""
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class FortuneService:
    """
    Fortune telling service with Saju/Astrology/Tarot fusion.

    Methods:
        calculate_fortune: Synchronous fortune calculation
        calculate_fortune_stream: Streaming fortune calculation (generator)
        initialize_counselor_session: Pre-fetch RAG data for counselor
    """

    def __init__(self):
        """Initialize Fortune Service."""
        pass

    def calculate_fortune(
        self,
        saju_data: Dict[str, Any],
        astro_data: Dict[str, Any],
        tarot_data: Dict[str, Any],
        theme: str = "daily",
        locale: str = "en",
        prompt: str = "",
        render_mode: str = "gpt",
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate fortune with Saju/Astrology/Tarot fusion.

        This is the core business logic moved from app.py ask() function.
        Logic remains 100% identical to ensure compatibility.

        Args:
            saju_data: Saju birth chart data
            astro_data: Astrology birth chart data
            tarot_data: Tarot card data
            theme: Fortune theme (daily, career, love, etc.)
            locale: Language locale (en, ko)
            prompt: User's question/prompt
            render_mode: "template" (instant) or "gpt" (AI)
            request_id: Optional request ID for logging

        Returns:
            Dict with fortune reading result:
            {
                "status": "success",
                "reading": "...",
                "performance": {"duration_ms": 123, "cached": false}
            }
        """
        try:
            # Import dependencies (lazy loaded in app.py)
            from backend_ai.app.fusion_logic import interpret_with_ai
            from backend_ai.app.sanitizer import (
                is_suspicious_input,
                sanitize_user_input,
            )

            # Helper function (was in app.py)
            def normalize_day_master(saju: Dict) -> Dict:
                """Normalize nested dayMaster structure to flat."""
                if "dayMaster" in saju and isinstance(saju["dayMaster"], dict):
                    if "element" in saju["dayMaster"] and "name" in saju["dayMaster"]:
                        saju["dayMasterElement"] = saju["dayMaster"]["element"]
                        saju["dayMasterName"] = saju["dayMaster"]["name"]
                return saju

            logger.info(f"[FortuneService] request_id={request_id} theme={theme} locale={locale} render_mode={render_mode}")

            # Input validation - check for suspicious patterns
            if is_suspicious_input(prompt):
                logger.warning(f"[FortuneService] Suspicious input detected: {prompt[:100]}...")

            # Normalize dayMaster structure (nested -> flat)
            saju_data = normalize_day_master(saju_data)

            # Detect structured JSON prompts from frontend
            is_structured_prompt = (
                "You MUST return a valid JSON object" in prompt or
                '"lifeTimeline"' in prompt or
                '"categoryAnalysis"' in prompt
            )

            # Allow full prompt for structured requests, otherwise sanitize and clamp
            sanitized_prompt = prompt if is_structured_prompt else sanitize_user_input(prompt, max_length=500)

            if is_structured_prompt:
                logger.info(f"[FortuneService] Detected STRUCTURED JSON prompt (len={len(prompt)})")

            # DEBUG: Log saju.unse data received
            unse_data = saju_data.get("unse", {})
            logger.info(f"[FortuneService] saju.unse: daeun={len(unse_data.get('daeun', []))}, annual={len(unse_data.get('annual', []))}")

            # Build facts for AI interpretation
            facts = {
                "theme": theme,
                "saju": saju_data,
                "astro": astro_data,
                "tarot": tarot_data,
                "prompt": sanitized_prompt,
                "locale": locale,
                "render_mode": render_mode,
            }

            # Performance monitoring
            start_time = time.time()
            result = interpret_with_ai(facts)
            duration_ms = int((time.time() - start_time) * 1000)

            logger.info(f"[FortuneService] request_id={request_id} completed in {duration_ms}ms cache_hit={result.get('cached', False)}")

            # Add performance metadata
            if isinstance(result, dict):
                result["performance"] = {
                    "duration_ms": duration_ms,
                    "cached": result.get("cached", False)
                }

            return {"status": "success", "data": result}

        except Exception as e:
            logger.exception(f"[FortuneService] request_id={request_id} calculate_fortune failed: {e}")
            return {"status": "error", "message": str(e)}
