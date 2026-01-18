# backend_ai/app/fortune_score_engine.py
"""
Fortune Score Engine - Backward Compatibility Shim
==================================================
This module has been refactored into the fortune_score_engine/ package.
This file provides backward compatibility for existing imports.

New imports should use:
    from backend_ai.app.fortune_score_engine import (
        calculate_fortune_score,
        FortuneScoreEngine,
        ScoreBreakdown,
    )
"""

# Re-export everything from the new package
from backend_ai.app.fortune_score_engine import (
    # Dataclass
    ScoreBreakdown,
    # Constants
    ELEMENTS,
    ZODIAC_ELEMENTS,
    BRANCH_ZODIAC,
    SIBSIN_WEIGHTS,
    TRANSIT_WEIGHTS,
    MOON_PHASE_SCORES,
    PLANETARY_HOUR_SCORES,
    # Mixins
    SajuScoringMixin,
    AstroScoringMixin,
    # Engine
    FortuneScoreEngine,
    get_fortune_score_engine,
    calculate_fortune_score,
)

__all__ = [
    "ScoreBreakdown",
    "ELEMENTS",
    "ZODIAC_ELEMENTS",
    "BRANCH_ZODIAC",
    "SIBSIN_WEIGHTS",
    "TRANSIT_WEIGHTS",
    "MOON_PHASE_SCORES",
    "PLANETARY_HOUR_SCORES",
    "SajuScoringMixin",
    "AstroScoringMixin",
    "FortuneScoreEngine",
    "get_fortune_score_engine",
    "calculate_fortune_score",
]
