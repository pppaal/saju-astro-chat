# backend_ai/app/rendering/__init__.py
"""
Rendering Package
=================
Lightweight template renderer for destiny-map (no LLM).
Outputs structured JSON that matches Display.tsx expectations.

Main Entry Point:
    from backend_ai.app.rendering import render_template_report

Modules:
- profiles: DAY_MASTER_PROFILES, ZODIAC_PROFILES
- constants: SIBSIN_MEANINGS, SIBSIN_EN, ELEMENT_NAMES
- extractors: Data extraction utilities
- generators: Meaning generation utilities
- builders: Analysis builder functions
- insights: Key insight extraction functions
- main: render_template_report main function

Note: This package maintains backward compatibility with template_renderer.py.
The original file remains in place and rendering/__init__.py imports from it
for theme sections. This allows gradual migration.
"""

# Main function - primary public API
from .main import render_template_report

# Data classes
from .profiles import DAY_MASTER_PROFILES, ZODIAC_PROFILES

# Constants
from .constants import (
    SIBSIN_MEANINGS,
    SIBSIN_EN,
    ELEMENT_NAMES,
    FORTUNE_LEVELS,
    THEME_ICONS,
)

# Extractors
from .extractors import (
    get_sibsin_value,
    get_element_from_stem,
    normalize_day_master,
    hanja_to_korean,
    hanja_element_to_korean,
    get_element_trait,
    get_birth_year,
    get_yongsin_element,
    get_day_master_profile,
)

# Generators
from .generators import (
    calculate_rating,
    calculate_rating_from_sibsin,
    get_element_meaning,
    get_daeun_meaning,
    get_personalized_daeun_meaning,
    get_personalized_annual_meaning,
    get_yearly_transit_info,
    get_period_advice,
)

# Builders
from .builders import (
    build_saju_analysis,
    build_astro_analysis,
    build_cross_insight,
    get_category_analysis,
    get_category_keywords,
)

# Insights
from .insights import (
    get_important_years,
    get_key_insights,
    get_lucky_elements,
    get_saju_highlight,
    get_astro_highlight,
)

# Theme sections
from .theme_sections import (
    get_theme_sections,
    get_theme_summary,
    SIGN_KO,
    SIBSIN_EASY,
)

__all__ = [
    # Main function
    "render_template_report",
    # Profiles
    "DAY_MASTER_PROFILES",
    "ZODIAC_PROFILES",
    # Constants
    "SIBSIN_MEANINGS",
    "SIBSIN_EN",
    "ELEMENT_NAMES",
    "FORTUNE_LEVELS",
    "THEME_ICONS",
    # Extractors
    "get_sibsin_value",
    "get_element_from_stem",
    "normalize_day_master",
    "hanja_to_korean",
    "hanja_element_to_korean",
    "get_element_trait",
    "get_birth_year",
    "get_yongsin_element",
    "get_day_master_profile",
    # Generators
    "calculate_rating",
    "calculate_rating_from_sibsin",
    "get_element_meaning",
    "get_daeun_meaning",
    "get_personalized_daeun_meaning",
    "get_personalized_annual_meaning",
    "get_yearly_transit_info",
    "get_period_advice",
    # Builders
    "build_saju_analysis",
    "build_astro_analysis",
    "build_cross_insight",
    "get_category_analysis",
    "get_category_keywords",
    # Insights
    "get_important_years",
    "get_key_insights",
    "get_lucky_elements",
    "get_saju_highlight",
    "get_astro_highlight",
    # Theme sections
    "get_theme_sections",
    "get_theme_summary",
    "SIGN_KO",
    "SIBSIN_EASY",
]
