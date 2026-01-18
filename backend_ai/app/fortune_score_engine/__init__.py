# backend_ai/app/fortune_score_engine/__init__.py
"""
Fortune Score Engine Package
============================
Comprehensive real-time fortune scoring combining Saju + Astrology data.

Package Structure:
- dataclass.py: ScoreBreakdown dataclass
- constants.py: Element mappings, transit weights, moon phases, etc.
- saju_scoring.py: Saju scoring methods (일진, 월운, 용신, etc.)
- astro_scoring.py: Astrology scoring methods (transits, moon, retrograde, etc.)
- engine.py: FortuneScoreEngine main class with cross-reference bonus

Usage:
    from backend_ai.app.fortune_score_engine import (
        calculate_fortune_score,
        get_fortune_score_engine,
        FortuneScoreEngine,
        ScoreBreakdown,
    )
"""

from .dataclass import ScoreBreakdown

from .constants import (
    ELEMENTS,
    ZODIAC_ELEMENTS,
    BRANCH_ZODIAC,
    SIBSIN_WEIGHTS,
    TRANSIT_WEIGHTS,
    MOON_PHASE_SCORES,
    PLANETARY_HOUR_SCORES,
    MAJOR_RETROGRADE_SCORES,
    MINOR_RETROGRADE_SCORES,
    GEOKGUK_GRADE_SCORES,
    DM_ELEMENT_WESTERN,
)

from .saju_scoring import SajuScoringMixin
from .astro_scoring import AstroScoringMixin

from .engine import (
    FortuneScoreEngine,
    get_fortune_score_engine,
    calculate_fortune_score,
)

__all__ = [
    # Dataclass
    "ScoreBreakdown",
    # Constants
    "ELEMENTS",
    "ZODIAC_ELEMENTS",
    "BRANCH_ZODIAC",
    "SIBSIN_WEIGHTS",
    "TRANSIT_WEIGHTS",
    "MOON_PHASE_SCORES",
    "PLANETARY_HOUR_SCORES",
    "MAJOR_RETROGRADE_SCORES",
    "MINOR_RETROGRADE_SCORES",
    "GEOKGUK_GRADE_SCORES",
    "DM_ELEMENT_WESTERN",
    # Mixins
    "SajuScoringMixin",
    "AstroScoringMixin",
    # Engine
    "FortuneScoreEngine",
    "get_fortune_score_engine",
    "calculate_fortune_score",
]
