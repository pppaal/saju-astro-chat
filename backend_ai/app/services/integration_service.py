"""
Integration Service
Multimodal analysis and numerology integration data loading
"""

import os
import json
import logging
from typing import Dict

logger = logging.getLogger("backend_ai")

# ===============================================================
# INTEGRATION ENGINE CACHE - Multimodal analysis data
# ===============================================================
_INTEGRATION_DATA_CACHE = {
    "multimodal_engine": None,
    "career_mapping": None,
    "numerology_core": None,
    "numerology_compatibility": None,
    "numerology_saju": None,
    "numerology_astro": None,
    "numerology_therapeutic": None,
}

def _load_integration_data():
    """Load integration engine and numerology data."""
    global _INTEGRATION_DATA_CACHE

    if _INTEGRATION_DATA_CACHE.get("multimodal_engine") is not None:
        return _INTEGRATION_DATA_CACHE

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

    # Integration engine files
    integration_dir = os.path.join(base_dir, "data", "graph", "rules", "integration")
    integration_files = {
        "multimodal_engine": "multimodal_integration_engine.json",
        "career_mapping": "modern_career_mapping.json",
    }

    for key, filename in integration_files.items():
        filepath = os.path.join(integration_dir, filename)
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    _INTEGRATION_DATA_CACHE[key] = json.load(f)
                    logger.info(f"  ✅ Loaded integration: {filename}")
        except Exception as e:
            logger.warning(f"  ⚠️ Failed to load {filename}: {e}")
            _INTEGRATION_DATA_CACHE[key] = {}

    # Numerology files
    numerology_dir = os.path.join(base_dir, "data", "graph", "rules", "numerology")
    numerology_files = {
        "numerology_core": "numerology_core_rules.json",
        "numerology_compatibility": "numerology_compatibility_rules.json",
        "numerology_saju": "numerology_saju_mapping.json",
        "numerology_astro": "numerology_astro_mapping.json",
        "numerology_therapeutic": "numerology_therapeutic_questions.json",
    }

    for key, filename in numerology_files.items():
        filepath = os.path.join(numerology_dir, filename)
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    _INTEGRATION_DATA_CACHE[key] = json.load(f)
                    logger.info(f"  ✅ Loaded numerology: {filename}")
        except Exception as e:
            logger.warning(f"  ⚠️ Failed to load {filename}: {e}")
            _INTEGRATION_DATA_CACHE[key] = {}

    loaded_count = sum(1 for v in _INTEGRATION_DATA_CACHE.values() if v)
    logger.info(f"[INTEGRATION-CACHE] Loaded {loaded_count}/7 integration/numerology files")
    return _INTEGRATION_DATA_CACHE


def get_integration_context(theme: str = "life") -> Dict:
    """Get theme-specific integration context for multimodal analysis."""
    data = _load_integration_data()
    engine = data.get("multimodal_engine", {})

    result = {
        "correlation_matrix": engine.get("correlation_matrix", {}),
        "theme_focus": {},
    }

    # Get theme-specific focus areas
    question_router = engine.get("question_router", {})
    if theme in question_router:
        result["theme_focus"] = question_router[theme]

    return result


def get_integration_data():
    """Get the integration data cache."""
    return _load_integration_data()
