"""
Cross-Analysis Service
Pre-loaded cross-analysis data for instant lookups
"""

import os
import json
import logging

logger = logging.getLogger("backend_ai")

# Cross-analysis cache - pre-loaded for instant lookups
_CROSS_ANALYSIS_CACHE = {}

def _load_cross_analysis_cache():
    """Load cross-analysis JSON files for instant lookups (no embedding search)."""
    global _CROSS_ANALYSIS_CACHE
    if _CROSS_ANALYSIS_CACHE:
        return _CROSS_ANALYSIS_CACHE

    fusion_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data", "graph", "fusion")
    fusion_dir = os.path.abspath(fusion_dir)

    if not os.path.exists(fusion_dir):
        logger.warning(f"[CROSS-CACHE] Fusion dir not found: {fusion_dir}")
        return {}

    for fname in os.listdir(fusion_dir):
        if fname.endswith(".json") and "cross" in fname.lower():
            try:
                with open(os.path.join(fusion_dir, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    key = fname.replace(".json", "")
                    _CROSS_ANALYSIS_CACHE[key] = data
                    logger.info(f"  ✅ Loaded cross-analysis: {fname}")
            except Exception as e:
                logger.warning(f"  ⚠️ Failed to load {fname}: {e}")

    logger.info(f"[CROSS-CACHE] Loaded {len(_CROSS_ANALYSIS_CACHE)} cross-analysis files")
    return _CROSS_ANALYSIS_CACHE


def get_cross_analysis_cache():
    """Get the cross-analysis cache."""
    return _load_cross_analysis_cache()
