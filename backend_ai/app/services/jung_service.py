"""
Jung Psychology Service

Handles all Jung psychology related data loading and guidance functions.
Extracted from app.py for better modularity.

Functions:
- _load_jung_data(): Load Jung psychology data files
- get_lifespan_guidance(): Get age-appropriate psychological guidance
- get_active_imagination_prompts(): Get active imagination exercise prompts
- get_crisis_resources(): Get crisis intervention resources
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

# ============================================================================
# JUNG PSYCHOLOGY CONFIGURATION
# ============================================================================
_JUNG_FILES = {
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

_JUNG_DATA_CACHE: Dict[str, Dict | None] = {k: None for k in _JUNG_FILES}
_JUNG_CACHE_LOADED = False

# Age stage boundaries for lifespan individuation
_AGE_STAGES = [
    (12, "childhood"),
    (22, "adolescence"),
    (35, "early_adulthood"),
    (55, "midlife"),
    (70, "mature_adulthood"),
]
_DEFAULT_STAGE = "elder"


def _load_jung_data() -> Dict:
    """
    Load extended Jung psychology data for deeper therapeutic sessions.

    Loads data from backend_ai/data/graph/rules/jung/ directory.
    Caches data after first load for performance.

    Returns:
        Dict containing all Jung psychology data
    """
    global _JUNG_DATA_CACHE, _JUNG_CACHE_LOADED

    # Return cached data if already loaded
    if _JUNG_CACHE_LOADED:
        return _JUNG_DATA_CACHE

    # Get path to jung data directory using pathlib
    jung_dir = Path(__file__).parent.parent.parent / "data" / "graph" / "rules" / "jung"

    for key, filename in _JUNG_FILES.items():
        filepath = jung_dir / filename
        try:
            if filepath.exists():
                _JUNG_DATA_CACHE[key] = json.loads(filepath.read_text(encoding="utf-8"))
                logger.info(f"  Loaded Jung data: {filename}")
        except Exception as e:
            logger.warning(f"  Failed to load {filename}: {e}")
            _JUNG_DATA_CACHE[key] = {}

    _JUNG_CACHE_LOADED = True
    loaded_count = sum(1 for v in _JUNG_DATA_CACHE.values() if v)
    logger.info(f"[JUNG-CACHE] Loaded {loaded_count} Jung psychology files")
    return _JUNG_DATA_CACHE


def get_lifespan_guidance(birth_year: int) -> Dict:
    """
    Get age-appropriate psychological guidance based on Jung's lifespan individuation.

    Args:
        birth_year: Year of birth

    Returns:
        Dict containing:
        - age: Current age
        - stage_name: Name of life stage
        - psychological_tasks: List of developmental tasks
        - archetypal_themes: Active archetypal patterns
        - developmental_crises: Potential challenges
        - shadow_challenges: Shadow work areas
        - saju_parallel: Saju correlations
        - astro_parallel: Astrological correlations
        - guidance: Stage-specific guidance
    """
    jung_data = _load_jung_data()
    lifespan = jung_data.get("lifespan_individuation", {})

    if not lifespan:
        return {}

    current_year = datetime.now().year
    age = current_year - birth_year

    life_stages = lifespan.get("life_stages", {})

    # Determine life stage based on age using constants
    stage = _DEFAULT_STAGE
    for max_age, stage_name in _AGE_STAGES:
        if age <= max_age:
            stage = stage_name
            break

    stage_data = life_stages.get(stage, {})

    return {
        "age": age,
        "stage_name": stage_data.get("name_ko", stage),
        "psychological_tasks": stage_data.get("psychological_tasks", []),
        "archetypal_themes": stage_data.get("archetypal_themes", {}),
        "developmental_crises": stage_data.get("developmental_crises", []),
        "shadow_challenges": stage_data.get(
            "shadow_challenges",
            stage_data.get("shadow_manifestations", [])
        ),
        "saju_parallel": stage_data.get("saju_parallel", {}),
        "astro_parallel": stage_data.get("astro_parallel", {}),
        "guidance": stage_data.get(
            "guidance",
            stage_data.get(
                "saturn_return_guidance",
                stage_data.get("uranus_opposition_guidance", {})
            )
        ),
    }


def get_active_imagination_prompts(context: str) -> Dict[str, List[str]]:
    """
    Get appropriate active imagination exercise prompts based on context.

    Args:
        context: The context text to analyze (e.g., dream content, analysis type)

    Returns:
        Dict containing:
        - opening: Opening prompts (2 items)
        - deepening: Deepening prompts (3 items)
        - integration: Integration prompts (2 items)
    """
    jung_data = _load_jung_data()
    ai_data = jung_data.get("active_imagination", {})

    if not ai_data:
        return {"opening": [], "deepening": [], "integration": []}

    facilitation = ai_data.get("ai_facilitation_guide", {})
    context_lower = context.lower()

    # Get opening prompts based on context type
    if any(k in context_lower for k in ["꿈", "악몽", "꿈에서"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_dream_sharing", [])
    elif any(k in context_lower for k in ["사주", "운세", "일간"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_saju_analysis", [])
    elif any(k in context_lower for k in ["점성", "별자리", "하우스"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_astro_analysis", [])
    else:
        prompts = facilitation.get("opening_prompts", {}).get("general", [])

    # Get deepening and integration prompts
    deepening = facilitation.get("deepening_prompts", [])
    integration = facilitation.get("integration_prompts", [])

    return {
        "opening": prompts[:2],
        "deepening": deepening[:3],
        "integration": integration[:2],
    }


def get_crisis_resources(locale: str = "ko") -> Dict:
    """
    Get crisis intervention resources and scripts.

    Args:
        locale: Language locale (ko, en)

    Returns:
        Dict containing:
        - resources: Crisis hotline numbers and resources
        - limitations: AI limitations in crisis situations
        - deescalation: De-escalation techniques
    """
    jung_data = _load_jung_data()
    crisis = jung_data.get("crisis_intervention", {})

    if not crisis:
        return {}

    resources = (
        crisis.get("response_protocols", {})
        .get("suicidal_ideation", {})
        .get("resources_korea", {})
    )
    limitations = crisis.get("ai_limitations_and_boundaries", {})
    deescalation = crisis.get("de_escalation_techniques", {})

    return {
        "resources": resources,
        "limitations": limitations,
        "deescalation": deescalation,
    }


# ============================================================================
# Convenience exports
# ============================================================================
__all__ = [
    "_load_jung_data",
    "get_lifespan_guidance",
    "get_active_imagination_prompts",
    "get_crisis_resources",
]
