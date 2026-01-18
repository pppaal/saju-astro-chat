"""
Integration Service
Multimodal analysis and numerology integration data loading
"""

import json
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger("backend_ai")

# ===============================================================
# INTEGRATION ENGINE CONFIGURATION
# ===============================================================
_INTEGRATION_FILES = {
    "multimodal_engine": ("integration", "multimodal_integration_engine.json"),
    "career_mapping": ("integration", "modern_career_mapping.json"),
    "numerology_core": ("numerology", "numerology_core_rules.json"),
    "numerology_compatibility": ("numerology", "numerology_compatibility_rules.json"),
    "numerology_saju": ("numerology", "numerology_saju_mapping.json"),
    "numerology_astro": ("numerology", "numerology_astro_mapping.json"),
    "numerology_therapeutic": ("numerology", "numerology_therapeutic_questions.json"),
}

_INTEGRATION_DATA_CACHE: Dict[str, Dict | None] = {k: None for k in _INTEGRATION_FILES}
_INTEGRATION_CACHE_LOADED = False


def _load_integration_data() -> Dict:
    """Load integration engine and numerology data."""
    global _INTEGRATION_DATA_CACHE, _INTEGRATION_CACHE_LOADED

    if _INTEGRATION_CACHE_LOADED:
        return _INTEGRATION_DATA_CACHE

    base_dir = Path(__file__).parent.parent.parent
    rules_dir = base_dir / "data" / "graph" / "rules"

    for key, (subdir, filename) in _INTEGRATION_FILES.items():
        filepath = rules_dir / subdir / filename
        try:
            if filepath.exists():
                _INTEGRATION_DATA_CACHE[key] = json.loads(
                    filepath.read_text(encoding="utf-8")
                )
                logger.info(f"  Loaded {subdir}: {filename}")
        except Exception as e:
            logger.warning(f"  Failed to load {filename}: {e}")
            _INTEGRATION_DATA_CACHE[key] = {}

    _INTEGRATION_CACHE_LOADED = True
    loaded_count = sum(1 for v in _INTEGRATION_DATA_CACHE.values() if v)
    total_count = len(_INTEGRATION_FILES)
    logger.info(f"[INTEGRATION-CACHE] Loaded {loaded_count}/{total_count} integration/numerology files")
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


def get_integration_data() -> Dict:
    """Get the integration data cache."""
    return _load_integration_data()
