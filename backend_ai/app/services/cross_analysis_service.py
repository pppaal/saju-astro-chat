"""
Cross-Analysis Service
Pre-loaded cross-analysis data for instant lookups
"""

import json
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger("backend_ai")

# Cross-analysis cache - pre-loaded for instant lookups
_CROSS_ANALYSIS_CACHE: Dict[str, Dict] = {}
_CROSS_CACHE_LOADED = False

# File filter pattern
_CROSS_FILE_PATTERN = "cross"
_JSON_SUFFIX = ".json"


def _load_cross_analysis_cache() -> Dict:
    """Load cross-analysis JSON files for instant lookups (no embedding search)."""
    global _CROSS_ANALYSIS_CACHE, _CROSS_CACHE_LOADED

    if _CROSS_CACHE_LOADED:
        return _CROSS_ANALYSIS_CACHE

    fusion_dir = Path(__file__).parent.parent.parent / "data" / "graph" / "fusion"

    if not fusion_dir.exists():
        logger.warning(f"[CROSS-CACHE] Fusion dir not found: {fusion_dir}")
        _CROSS_CACHE_LOADED = True
        return _CROSS_ANALYSIS_CACHE

    for filepath in fusion_dir.iterdir():
        if not filepath.suffix == _JSON_SUFFIX:
            continue
        if _CROSS_FILE_PATTERN not in filepath.name.lower():
            continue

        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            key = filepath.stem
            _CROSS_ANALYSIS_CACHE[key] = data
            logger.info(f"  Loaded cross-analysis: {filepath.name}")
        except Exception as e:
            logger.warning(f"  Failed to load {filepath.name}: {e}")

    _CROSS_CACHE_LOADED = True
    logger.info(f"[CROSS-CACHE] Loaded {len(_CROSS_ANALYSIS_CACHE)} cross-analysis files")
    return _CROSS_ANALYSIS_CACHE


def get_cross_analysis_cache() -> Dict:
    """Get the cross-analysis cache."""
    return _load_cross_analysis_cache()
