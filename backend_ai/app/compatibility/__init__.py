"""
Compatibility Analysis Module
사주·점성술 융합 궁합 분석 모듈
"""

from .compatibility_logic import (
    interpret_compatibility,
    interpret_compatibility_group,
    analyze_timing_compatibility,
    get_action_items,
    load_compatibility_data,
)

# Constants - elements
from .elements import (
    OHENG_TO_ASTRO,
    ASTRO_ELEMENT_TO_OHENG,
    ZODIAC_ELEMENTS,
)

# Constants - stems & branches
from .stems_branches import (
    STEM_COMBINATIONS,
    STEM_CLASHES,
    BRANCH_YUKHAP,
    BRANCH_SAMHAP,
    BRANCH_BANGHAP,
    BRANCH_CHUNG,
)

# Constants - astrology aspects
from .astrology_aspects import ASPECTS

# Helper functions
from .helpers import (
    get_sign_midpoint,
    calculate_aspect,
    element_supports,
    element_controls,
    get_current_month_branch,
    determine_couple_type,
)

# Scoring functions
from .scoring import (
    calculate_pair_score,
    calculate_group_synergy_score,
    get_score_summary,
)

# Synastry functions
from .synastry import (
    analyze_venus_mars_synastry,
    analyze_astro_compatibility,
    analyze_asc_dsc_compatibility,
)

# Analysis functions
from .analysis import (
    analyze_stem_compatibility,
    analyze_branch_compatibility,
    analyze_shinsal_compatibility,
    analyze_house_compatibility,
)

__all__ = [
    # Logic
    "interpret_compatibility",
    "interpret_compatibility_group",
    "analyze_timing_compatibility",
    "get_action_items",
    "load_compatibility_data",
    # Constants
    "OHENG_TO_ASTRO",
    "ASTRO_ELEMENT_TO_OHENG",
    "ZODIAC_ELEMENTS",
    "STEM_COMBINATIONS",
    "STEM_CLASHES",
    "BRANCH_YUKHAP",
    "BRANCH_SAMHAP",
    "BRANCH_BANGHAP",
    "BRANCH_CHUNG",
    "ASPECTS",
    # Helpers
    "get_sign_midpoint",
    "calculate_aspect",
    "element_supports",
    "element_controls",
    "get_current_month_branch",
    "determine_couple_type",
    # Scoring
    "calculate_pair_score",
    "calculate_group_synergy_score",
    "get_score_summary",
    # Synastry
    "analyze_venus_mars_synastry",
    "analyze_astro_compatibility",
    "analyze_asc_dsc_compatibility",
    # Analysis
    "analyze_stem_compatibility",
    "analyze_branch_compatibility",
    "analyze_shinsal_compatibility",
    "analyze_house_compatibility",
]
