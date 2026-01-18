"""
Builders package for template renderer.
Contains helper functions and analysis builders.
"""

from .helpers import (
    get_sibsin_value,
    get_element_from_stem,
    normalize_day_master,
    calculate_rating,
    calculate_rating_from_sibsin,
    get_element_meaning,
    get_daeun_meaning,
    get_period_advice,
    get_yearly_transit_info,
    HANJA_TO_HANGUL,
    HANJA_ELEMENT_TO_HANGUL,
    ELEMENT_SIMPLE,
    ELEMENT_SIMPLE_EN,
    TYPE_NAME_KO,
    TYPE_NAME_EN,
)

from .year_analysis import (
    get_important_years,
    get_personalized_daeun_meaning,
    get_personalized_annual_meaning,
)

from .category import (
    get_category_analysis,
    build_saju_analysis,
    build_astro_analysis,
    build_cross_insight,
)

from .insights import (
    get_key_insights,
    get_lucky_elements,
    get_saju_highlight,
    get_astro_highlight,
)

__all__ = [
    # helpers
    "get_sibsin_value",
    "get_element_from_stem",
    "normalize_day_master",
    "calculate_rating",
    "calculate_rating_from_sibsin",
    "get_element_meaning",
    "get_daeun_meaning",
    "get_period_advice",
    "get_yearly_transit_info",
    "HANJA_TO_HANGUL",
    "HANJA_ELEMENT_TO_HANGUL",
    "ELEMENT_SIMPLE",
    "ELEMENT_SIMPLE_EN",
    "TYPE_NAME_KO",
    "TYPE_NAME_EN",
    # year_analysis
    "get_important_years",
    "get_personalized_daeun_meaning",
    "get_personalized_annual_meaning",
    # category
    "get_category_analysis",
    "build_saju_analysis",
    "build_astro_analysis",
    "build_cross_insight",
    # insights
    "get_key_insights",
    "get_lucky_elements",
    "get_saju_highlight",
    "get_astro_highlight",
]
