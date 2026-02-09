"""
Data Loader Utility

Centralized JSON data loading for backend_ai.

This module provides:
- JSON file loading with caching
- Integration data loading (multimodal, numerology)
- Jung psychology data loading
- Cross-analysis data loading
- Fusion rules loading
- Spread configuration loading

Replaces scattered JSON loading code in app.py.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ============================================================================
# Global Caches
# ============================================================================

_INTEGRATION_DATA_CACHE: Dict[str, Any] = {}
_JUNG_DATA_CACHE: Dict[str, Any] = {}
_CROSS_ANALYSIS_CACHE: Dict[str, Any] = {}
_FUSION_RULES_CACHE: Dict[str, Any] = {}
_SPREAD_CONFIG_CACHE: Dict[str, Any] = {}


# ============================================================================
# Path Utilities
# ============================================================================

def get_data_dir() -> Path:
    """Get the data directory path."""
    app_dir = Path(__file__).parent.parent
    data_dir = app_dir.parent / "data"
    return data_dir.resolve()


def get_graph_rules_dir() -> Path:
    """Get the graph/rules directory path."""
    return get_data_dir() / "graph" / "rules"


def get_fusion_dir() -> Path:
    """Get the fusion directory path."""
    data_dir = get_data_dir()
    # Prefer rules-based fusion directory if present
    rules_dir = data_dir / "graph" / "rules" / "fusion"
    if rules_dir.exists():
        return rules_dir
    return data_dir / "graph" / "fusion"


def get_spreads_dir() -> Path:
    """Get the spreads directory path."""
    data_dir = get_data_dir()
    primary = data_dir / "tarot" / "spreads"
    if primary.exists():
        return primary
    # Fallback to graph rules tarot spreads
    return data_dir / "graph" / "rules" / "tarot" / "spreads"


# ============================================================================
# Generic JSON Loader
# ============================================================================

def load_json_file(filepath: str, cache_key: str = None, cache_dict: Dict = None) -> Dict[str, Any]:
    """
    Load a JSON file with optional caching.

    Args:
        filepath: Path to JSON file
        cache_key: Optional cache key
        cache_dict: Optional cache dictionary

    Returns:
        Loaded JSON data (dict)

    Example:
        >>> data = load_json_file("data/rules/test.json")
        >>> data = load_json_file("data/rules/test.json", "test", _MY_CACHE)
    """
    # Check cache first
    if cache_dict is not None and cache_key is not None:
        if cache_key in cache_dict and cache_dict[cache_key] is not None:
            return cache_dict[cache_key]

    # Load file
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Update cache
            if cache_dict is not None and cache_key is not None:
                cache_dict[cache_key] = data

            logger.debug(f"[DataLoader] Loaded JSON: {os.path.basename(filepath)}")
            return data
        else:
            logger.warning(f"[DataLoader] File not found: {filepath}")
            return {}

    except Exception as e:
        logger.error(f"[DataLoader] Failed to load {filepath}: {e}")
        return {}


def load_json_files(
    directory: Path,
    file_mapping: Dict[str, str],
    cache_dict: Dict[str, Any] = None,
    description: str = "files"
) -> Dict[str, Any]:
    """
    Load multiple JSON files from a directory.

    Args:
        directory: Directory containing JSON files
        file_mapping: Dict of {cache_key: filename}
        cache_dict: Optional cache dictionary
        description: Description for logging

    Returns:
        Dictionary of loaded data

    Example:
        >>> files = {"core": "core.json", "rules": "rules.json"}
        >>> data = load_json_files(Path("data/rules"), files, {}, "rules")
    """
    if cache_dict is None:
        cache_dict = {}

    loaded_count = 0

    for key, filename in file_mapping.items():
        filepath = directory / filename
        data = load_json_file(str(filepath), key, cache_dict)

        if data:
            loaded_count += 1
            logger.info(f"  ✅ Loaded {description}: {filename}")
        else:
            logger.warning(f"  ⚠️ Failed to load {description}: {filename}")
            cache_dict[key] = {}

    logger.info(f"[DataLoader] Loaded {loaded_count}/{len(file_mapping)} {description}")
    return cache_dict


# ============================================================================
# Integration Data Loader
# ============================================================================

def load_integration_data(force_reload: bool = False) -> Dict[str, Any]:
    """
    Load integration and numerology data.

    Loads:
    - multimodal_integration_engine.json
    - modern_career_mapping.json
    - numerology_*.json files

    Args:
        force_reload: Force reload even if cached

    Returns:
        Dictionary with integration data

    Example:
        >>> data = load_integration_data()
        >>> engine = data.get("multimodal_engine", {})
    """
    global _INTEGRATION_DATA_CACHE

    # Return cached data if available
    if not force_reload and _INTEGRATION_DATA_CACHE.get("multimodal_engine") is not None:
        return _INTEGRATION_DATA_CACHE

    base_dir = get_graph_rules_dir()

    # Integration engine files
    integration_dir = base_dir / "integration"
    integration_files = {
        "multimodal_engine": "multimodal_integration_engine.json",
        "career_mapping": "modern_career_mapping.json",
    }

    load_json_files(integration_dir, integration_files, _INTEGRATION_DATA_CACHE, "integration")

    # Numerology files
    numerology_dir = base_dir / "numerology"
    numerology_files = {
        "numerology_core": "numerology_core_rules.json",
        "numerology_compatibility": "numerology_compatibility_rules.json",
        "numerology_saju": "numerology_saju_mapping.json",
        "numerology_astro": "numerology_astro_mapping.json",
        "numerology_therapeutic": "numerology_therapeutic_questions.json",
    }

    load_json_files(numerology_dir, numerology_files, _INTEGRATION_DATA_CACHE, "numerology")

    return _INTEGRATION_DATA_CACHE


def get_integration_context(theme: str = "life") -> Dict[str, Any]:
    """
    Get theme-specific integration context for multimodal analysis.

    Args:
        theme: Theme name (e.g., "career", "love", "life")

    Returns:
        Dictionary with correlation matrix and theme focus

    Example:
        >>> context = get_integration_context("career")
        >>> matrix = context["correlation_matrix"]
    """
    data = load_integration_data()
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


# ============================================================================
# Jung Psychology Data Loader
# ============================================================================

def load_jung_data(force_reload: bool = False) -> Dict[str, Any]:
    """
    Load Jung psychology data for therapeutic sessions.

    Loads 13 Jung-related JSON files:
    - active_imagination, lifespan_individuation, crisis_intervention
    - archetypes, therapeutic, cross_analysis, psychological_types
    - alchemy, counseling_scenarios, integrated_counseling
    - counseling_prompts, personality_integration, expanded_counseling

    Args:
        force_reload: Force reload even if cached

    Returns:
        Dictionary with Jung psychology data

    Example:
        >>> data = load_jung_data()
        >>> archetypes = data.get("archetypes", {})
    """
    global _JUNG_DATA_CACHE

    # Return cached data if available
    if not force_reload and _JUNG_DATA_CACHE.get("active_imagination") is not None:
        return _JUNG_DATA_CACHE

    jung_dir = get_graph_rules_dir() / "jung"

    files_to_load = {
        "active_imagination": "jung_active_imagination.json",
        "lifespan_individuation": "jung_lifespan_individuation.json",
        "crisis_intervention": "jung_crisis_intervention.json",
        "archetypes": "jung_archetypes.json",
        "therapeutic": "jung_therapeutic.json",
        "cross_analysis": "jung_cross_analysis.json",
        "psychological_types": "jung_psychological_types.json",
        "alchemy": "jung_alchemy.json",
        "counseling_scenarios": "jung_counseling_scenarios.json",
        "integrated_counseling": "jung_integrated_counseling.json",
        "counseling_prompts": "jung_counseling_prompts.json",
        "personality_integration": "jung_personality_integration.json",
        "expanded_counseling": "jung_expanded_counseling.json",
    }

    load_json_files(jung_dir, files_to_load, _JUNG_DATA_CACHE, "Jung psychology")

    return _JUNG_DATA_CACHE


def get_lifespan_guidance(birth_year: int) -> Dict[str, Any]:
    """
    Get age-appropriate psychological guidance based on Jung's lifespan individuation.

    Args:
        birth_year: Birth year (e.g., 1990)

    Returns:
        Dictionary with life stage guidance

    Example:
        >>> guidance = get_lifespan_guidance(1990)
        >>> stage = guidance.get("stage")
    """
    jung_data = load_jung_data()
    lifespan = jung_data.get("lifespan_individuation", {})

    if not lifespan:
        return {}

    from datetime import datetime
    current_year = datetime.now().year
    age = current_year - birth_year

    life_stages = lifespan.get("life_stages", {})

    # Determine life stage
    if age <= 12:
        stage = "childhood"
    elif age <= 22:
        stage = "adolescence"
    elif age <= 35:
        stage = "early_adulthood"
    elif age <= 50:
        stage = "midlife"
    elif age <= 65:
        stage = "mature_adulthood"
    else:
        stage = "elderhood"

    stage_data = life_stages.get(stage, {})

    return {
        "age": age,
        "stage": stage,
        "focus": stage_data.get("focus", ""),
        "challenges": stage_data.get("challenges", []),
        "growth_areas": stage_data.get("growth_areas", []),
    }


# ============================================================================
# Cross-Analysis Cache Loader
# ============================================================================

def load_cross_analysis_cache(force_reload: bool = False) -> Dict[str, Any]:
    """
    Load cross-analysis JSON files for instant lookups (no embedding search).

    Loads all JSON files in fusion/ directory that contain "cross" in filename.

    Args:
        force_reload: Force reload even if cached

    Returns:
        Dictionary with cross-analysis data

    Example:
        >>> cache = load_cross_analysis_cache()
        >>> sipsin_data = cache.get("cross_sipsin_planets", {})
    """
    global _CROSS_ANALYSIS_CACHE

    # Return cached data if available
    if not force_reload and _CROSS_ANALYSIS_CACHE:
        return _CROSS_ANALYSIS_CACHE

    fusion_dir = get_fusion_dir()

    if not fusion_dir.exists():
        logger.warning(f"[DataLoader] Fusion dir not found: {fusion_dir}")
        return {}

    for filepath in fusion_dir.glob("*.json"):
        if "cross" in filepath.name.lower():
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    key = filepath.stem  # filename without .json
                    _CROSS_ANALYSIS_CACHE[key] = data
                    logger.info(f"  ✅ Loaded cross-analysis: {filepath.name}")
            except Exception as e:
                logger.warning(f"  ⚠️ Failed to load {filepath.name}: {e}")

    logger.info(f"[DataLoader] Loaded {len(_CROSS_ANALYSIS_CACHE)} cross-analysis files")
    return _CROSS_ANALYSIS_CACHE


# ============================================================================
# Fusion Rules Loader
# ============================================================================

def load_fusion_rules(force_reload: bool = False) -> Dict[str, Any]:
    """
    Load ALL theme-specific fusion rules.

    Loads:
    - career.json, love.json, health.json, wealth.json
    - family.json, life_path.json, daily.json, monthly.json
    - compatibility.json, new_year.json, next_year.json

    Args:
        force_reload: Force reload even if cached

    Returns:
        Dictionary of {theme: rules}

    Example:
        >>> rules = load_fusion_rules()
        >>> career_rules = rules.get("career", {})
    """
    global _FUSION_RULES_CACHE

    # Return cached data if available
    if not force_reload and _FUSION_RULES_CACHE:
        return _FUSION_RULES_CACHE

    fusion_dir = get_fusion_dir()

    all_rule_files = [
        "career.json", "love.json", "health.json", "wealth.json",
        "family.json", "life_path.json", "daily.json", "monthly.json",
        "compatibility.json", "new_year.json", "next_year.json"
    ]

    file_mapping = {
        Path(f).stem: f for f in all_rule_files  # "career": "career.json"
    }

    load_json_files(fusion_dir, file_mapping, _FUSION_RULES_CACHE, "fusion rules")

    return _FUSION_RULES_CACHE


# ============================================================================
# Spread Configuration Loader
# ============================================================================

def load_spread_config(theme: str) -> Dict[str, Any]:
    """
    Load tarot spread configuration for a specific theme.

    Args:
        theme: Theme name (e.g., "career", "love", "decision")

    Returns:
        Spread configuration dictionary

    Example:
        >>> config = load_spread_config("career")
        >>> positions = config.get("positions", [])
    """
    global _SPREAD_CONFIG_CACHE

    # Check cache first
    if theme in _SPREAD_CONFIG_CACHE:
        return _SPREAD_CONFIG_CACHE[theme]

    # Load from file
    spreads_dir = get_spreads_dir()
    filename = f"{theme}_spreads.json"
    filepath = spreads_dir / filename

    data = load_json_file(str(filepath), theme, _SPREAD_CONFIG_CACHE)

    if not data:
        logger.warning(f"[DataLoader] No spread config found for theme: {theme}")
        _SPREAD_CONFIG_CACHE[theme] = {}

    return _SPREAD_CONFIG_CACHE[theme]


# ============================================================================
# Cache Management
# ============================================================================

def clear_all_caches():
    """Clear all data caches."""
    global _INTEGRATION_DATA_CACHE, _JUNG_DATA_CACHE, _CROSS_ANALYSIS_CACHE
    global _FUSION_RULES_CACHE, _SPREAD_CONFIG_CACHE

    _INTEGRATION_DATA_CACHE.clear()
    _JUNG_DATA_CACHE.clear()
    _CROSS_ANALYSIS_CACHE.clear()
    _FUSION_RULES_CACHE.clear()
    _SPREAD_CONFIG_CACHE.clear()

    logger.info("[DataLoader] All caches cleared")


def get_cache_stats() -> Dict[str, int]:
    """
    Get statistics about loaded data caches.

    Returns:
        Dictionary with cache sizes

    Example:
        >>> stats = get_cache_stats()
        >>> print(f"Integration files loaded: {stats['integration']}")
    """
    return {
        "integration": len([v for v in _INTEGRATION_DATA_CACHE.values() if v]),
        "jung": len([v for v in _JUNG_DATA_CACHE.values() if v]),
        "cross_analysis": len(_CROSS_ANALYSIS_CACHE),
        "fusion_rules": len(_FUSION_RULES_CACHE),
        "spread_configs": len(_SPREAD_CONFIG_CACHE),
    }


# ============================================================================
# Convenience Functions
# ============================================================================

def preload_all_data():
    """
    Preload all JSON data at startup.

    Useful for production to avoid lazy loading delays.
    """
    logger.info("[DataLoader] Preloading all JSON data...")

    load_integration_data()
    load_jung_data()
    load_cross_analysis_cache()
    load_fusion_rules()

    stats = get_cache_stats()
    logger.info(f"[DataLoader] Preload complete: {stats}")


# ============================================================================
# Legacy Compatibility
# ============================================================================

# Export for backward compatibility with app.py
def _load_integration_data():
    """DEPRECATED: Use load_integration_data() instead."""
    return load_integration_data()


def _load_jung_data():
    """DEPRECATED: Use load_jung_data() instead."""
    return load_jung_data()


def _load_cross_analysis_cache():
    """DEPRECATED: Use load_cross_analysis_cache() instead."""
    return load_cross_analysis_cache()
