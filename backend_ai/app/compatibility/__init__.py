# backend_ai/app/compatibility/__init__.py
"""
Compatibility Analysis Package
==============================
사주(四柱)와 점성술 융합 궁합 분석 모듈

Modules:
- constants: 궁합 분석 상수 정의
- helpers: 유틸리티 함수
- analysis: 핵심 사주 분석 함수
- synastry: 점성술 시나스트리 분석
- scoring: 점수 계산 및 평가
- group: 그룹 궁합 분석
- prompts: AI 프롬프트 생성
"""

# Constants
from .constants import (
    OHENG_TO_ASTRO,
    ASTRO_ELEMENT_TO_OHENG,
    STEM_COMBINATIONS,
    STEM_CLASHES,
    BRANCH_YUKHAP,
    BRANCH_SAMHAP,
    BRANCH_BANGHAP,
    BRANCH_CHUNG,
    ZODIAC_ELEMENTS,
    ASPECTS,
)

# Helper functions
from .helpers import (
    get_openai_client,
    get_sign_midpoint,
    calculate_aspect,
    element_supports,
    element_controls,
    get_current_month_branch,
    analyze_month_for_couple,
    get_good_days_for_couple,
    determine_couple_type,
    get_composite_element,
    get_stem_combination_result,
)

# Core analysis functions
from .analysis import (
    analyze_stem_compatibility,
    analyze_branch_compatibility,
    analyze_shinsal_compatibility,
    analyze_twelve_stages_compatibility,
    analyze_naeum_compatibility,
    analyze_gongmang_interaction,
    analyze_house_compatibility,
    analyze_samjae_compatibility,
    analyze_yongsin_interaction,
    analyze_banhap_banghap_detailed,
)

# Synastry functions
from .synastry import (
    analyze_asc_dsc_compatibility,
    analyze_lilith_chiron_synastry,
    analyze_progression_synastry,
    calculate_sipsung,
    analyze_venus_mars_synastry,
    analyze_astro_compatibility,
    analyze_planet_synastry_aspects,
)

# Scoring functions
from .scoring import (
    calculate_pair_score,
    calculate_group_synergy_score,
    analyze_oheng_relationship,
    get_score_summary,
    generate_pairwise_matrix,
)

# Group analysis functions
from .group import (
    identify_group_roles,
    analyze_element_distribution,
    get_group_timing_analysis,
    get_group_action_items,
    analyze_group_compatibility,
)

# Prompt generation functions
from .prompts import (
    build_pair_prompt,
    build_group_prompt,
    format_compatibility_report,
    format_group_compatibility_report,
)

# Main entry points
from .main import (
    interpret_compatibility,
    interpret_compatibility_group,
    load_compatibility_data,
    analyze_timing_compatibility,
    get_action_items,
    format_person_data,
    analyze_group_element_distribution,
)

__all__ = [
    # Constants
    "OHENG_TO_ASTRO",
    "ASTRO_ELEMENT_TO_OHENG",
    "STEM_COMBINATIONS",
    "STEM_CLASHES",
    "BRANCH_YUKHAP",
    "BRANCH_SAMHAP",
    "BRANCH_BANGHAP",
    "BRANCH_CHUNG",
    "ZODIAC_ELEMENTS",
    "ASPECTS",
    # Helpers
    "get_openai_client",
    "get_sign_midpoint",
    "calculate_aspect",
    "element_supports",
    "element_controls",
    "get_current_month_branch",
    "analyze_month_for_couple",
    "get_good_days_for_couple",
    "determine_couple_type",
    "get_composite_element",
    "get_stem_combination_result",
    # Analysis
    "analyze_stem_compatibility",
    "analyze_branch_compatibility",
    "analyze_shinsal_compatibility",
    "analyze_twelve_stages_compatibility",
    "analyze_naeum_compatibility",
    "analyze_gongmang_interaction",
    "analyze_house_compatibility",
    "analyze_samjae_compatibility",
    "analyze_yongsin_interaction",
    "analyze_banhap_banghap_detailed",
    # Synastry
    "analyze_asc_dsc_compatibility",
    "analyze_lilith_chiron_synastry",
    "analyze_progression_synastry",
    "calculate_sipsung",
    "analyze_venus_mars_synastry",
    "analyze_astro_compatibility",
    "analyze_planet_synastry_aspects",
    # Scoring
    "calculate_pair_score",
    "calculate_group_synergy_score",
    "analyze_oheng_relationship",
    "get_score_summary",
    "generate_pairwise_matrix",
    # Group
    "identify_group_roles",
    "analyze_element_distribution",
    "get_group_timing_analysis",
    "get_group_action_items",
    "analyze_group_compatibility",
    # Prompts
    "build_pair_prompt",
    "build_group_prompt",
    "format_compatibility_report",
    "format_group_compatibility_report",
    # Main entry points
    "interpret_compatibility",
    "interpret_compatibility_group",
    "load_compatibility_data",
    "analyze_timing_compatibility",
    "get_action_items",
    "format_person_data",
    "analyze_group_element_distribution",
]
