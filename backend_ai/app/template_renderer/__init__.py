"""
Template Renderer Package

Lightweight template renderer for destiny-map (no LLM).
Outputs structured JSON that matches Display.tsx expectations.

Display.tsx expects these interfaces:
- ImportantYear: { year: number, age: number, rating: 1-5, title: string, sajuReason: string, astroReason: string }
- CategoryAnalysis: { icon: string, title: string, sajuAnalysis: string, astroAnalysis: string, crossInsight: string }
- KeyInsight: { type: "strength"|"opportunity"|"caution"|"advice", text: string, icon?: string }
"""

# Re-export data
from .data import (
    DAY_MASTER_PROFILES,
    SIBSIN_MEANINGS,
    SIBSIN_EN,
    SIBSIN_SIMPLE,
    SIBSIN_SIMPLE_EN,
    ZODIAC_PROFILES,
    SIGN_KO,
)

# Re-export builders
from .builders import (
    get_sibsin_value,
    get_element_from_stem,
    normalize_day_master,
    calculate_rating,
    calculate_rating_from_sibsin,
    get_element_meaning,
    get_daeun_meaning,
    get_period_advice,
    get_yearly_transit_info,
    get_important_years,
    get_personalized_daeun_meaning,
    get_personalized_annual_meaning,
    get_category_analysis,
    build_saju_analysis,
    build_astro_analysis,
    build_cross_insight,
    get_key_insights,
    get_lucky_elements,
    get_saju_highlight,
    get_astro_highlight,
    HANJA_TO_HANGUL,
    TYPE_NAME_KO,
    TYPE_NAME_EN,
)

# Re-export themes
from .themes import (
    get_theme_sections,
    get_theme_summary,
    render_template_report,
)

# Backward compatibility aliases (for tests and legacy code)
_get_sibsin_value = get_sibsin_value
_get_theme_sections = get_theme_sections
_get_theme_summary = get_theme_summary
_get_element_from_stem = get_element_from_stem
_normalize_day_master = normalize_day_master
_calculate_rating = calculate_rating
_calculate_rating_from_sibsin = calculate_rating_from_sibsin
_get_element_meaning = get_element_meaning
_get_daeun_meaning = get_daeun_meaning
_get_period_advice = get_period_advice
_get_yearly_transit_info = get_yearly_transit_info
_get_important_years = get_important_years
_get_personalized_daeun_meaning = get_personalized_daeun_meaning
_get_personalized_annual_meaning = get_personalized_annual_meaning
_get_category_analysis = get_category_analysis
_build_saju_analysis = build_saju_analysis
_build_astro_analysis = build_astro_analysis
_build_cross_insight = build_cross_insight
_get_key_insights = get_key_insights
_get_lucky_elements = get_lucky_elements
_get_saju_highlight = get_saju_highlight
_get_astro_highlight = get_astro_highlight

__all__ = [
    # Data
    "DAY_MASTER_PROFILES",
    "SIBSIN_MEANINGS",
    "SIBSIN_EN",
    "SIBSIN_SIMPLE",
    "SIBSIN_SIMPLE_EN",
    "ZODIAC_PROFILES",
    "SIGN_KO",
    # Builders - helpers
    "get_sibsin_value",
    "get_element_from_stem",
    "normalize_day_master",
    "calculate_rating_from_sibsin",
    "get_element_meaning",
    "get_yearly_transit_info",
    # Builders - year_analysis
    "get_important_years",
    "get_personalized_daeun_meaning",
    "get_personalized_annual_meaning",
    # Builders - category
    "get_category_analysis",
    "build_saju_analysis",
    "build_astro_analysis",
    "build_cross_insight",
    # Builders - insights
    "get_key_insights",
    "get_lucky_elements",
    "get_saju_highlight",
    "get_astro_highlight",
    # Constants
    "HANJA_TO_HANGUL",
    "TYPE_NAME_KO",
    "TYPE_NAME_EN",
    # Themes
    "get_theme_sections",
    "get_theme_summary",
    "render_template_report",
    # Backward compat aliases
    "_get_theme_sections",
    "_get_theme_summary",
    "_get_sibsin_value",
    "_get_element_from_stem",
    "_normalize_day_master",
    "_calculate_rating_from_sibsin",
    "_get_element_meaning",
    "_get_yearly_transit_info",
    "_get_important_years",
    "_get_personalized_daeun_meaning",
    "_get_personalized_annual_meaning",
    "_get_category_analysis",
    "_build_saju_analysis",
    "_build_astro_analysis",
    "_build_cross_insight",
    "_get_key_insights",
    "_get_lucky_elements",
    "_get_saju_highlight",
    "_get_astro_highlight",
]
