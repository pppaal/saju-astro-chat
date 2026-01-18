# backend_ai/app/iching/__init__.py
"""
I Ching Package
===============
Premium I Ching RAG Engine modules

Modules:
- constants: Five Elements, Trigrams, Solar Terms constants
- data_loader: Functions for loading hexagram data
- wuxing: Five Element (Wuxing) analysis functions
- hexagram_calc: Hexagram calculation and casting functions
"""

from .constants import (
    WUXING_GENERATING,
    WUXING_OVERCOMING,
    WUXING_KOREAN,
    TRIGRAM_INFO,
    LINE_POSITION_MEANING,
    SOLAR_TERMS,
    SEASON_ELEMENT,
)

from .data_loader import (
    load_premium_data,
    load_complete_hexagram_data,
    load_changing_lines_data,
)

from .wuxing import (
    get_current_season,
    get_current_solar_term,
    analyze_seasonal_harmony,
    analyze_wuxing_relationship,
    get_saju_element_analysis,
)

from .hexagram_calc import (
    binary_to_hexagram_num,
    calculate_nuclear_hexagram,
    calculate_opposite_hexagram,
    calculate_reverse_hexagram,
    get_related_hexagrams,
    cast_hexagram,
    KING_WEN_MAP,
)

__all__ = [
    # Constants
    "WUXING_GENERATING",
    "WUXING_OVERCOMING",
    "WUXING_KOREAN",
    "TRIGRAM_INFO",
    "LINE_POSITION_MEANING",
    "SOLAR_TERMS",
    "SEASON_ELEMENT",
    # Data loading
    "load_premium_data",
    "load_complete_hexagram_data",
    "load_changing_lines_data",
    # Wuxing analysis
    "get_current_season",
    "get_current_solar_term",
    "analyze_seasonal_harmony",
    "analyze_wuxing_relationship",
    "get_saju_element_analysis",
    # Hexagram calculation
    "binary_to_hexagram_num",
    "calculate_nuclear_hexagram",
    "calculate_opposite_hexagram",
    "calculate_reverse_hexagram",
    "get_related_hexagrams",
    "cast_hexagram",
    "KING_WEN_MAP",
]
