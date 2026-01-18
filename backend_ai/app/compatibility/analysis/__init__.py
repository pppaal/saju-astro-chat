# backend_ai/app/compatibility/analysis/__init__.py
"""
Compatibility Analysis Package
==============================
사주(四柱) 궁합 분석 함수 모음

Modules:
- stem_branch: 천간/지지 궁합 분석
- shinsal: 신살 궁합 분석
- stages_naeum: 12운성/납음오행 궁합 분석
- house_gongmang: 하우스/공망 궁합 분석
- samjae_yongsin: 삼재/용신 궁합 분석
- banhap_banghap: 반합/방합 상세 분석
"""

# Stem and Branch
from .stem_branch import (
    analyze_stem_compatibility,
    analyze_branch_compatibility,
    _get_branches_from_pillars,
)

# Shinsal
from .shinsal import analyze_shinsal_compatibility

# 12 Stages and Naeum
from .stages_naeum import (
    analyze_twelve_stages_compatibility,
    analyze_naeum_compatibility,
)

# House and Gongmang
from .house_gongmang import (
    analyze_gongmang_interaction,
    analyze_house_compatibility,
)

# Samjae and Yongsin
from .samjae_yongsin import (
    analyze_samjae_compatibility,
    analyze_yongsin_interaction,
)

# Banhap and Banghap
from .banhap_banghap import analyze_banhap_banghap_detailed

__all__ = [
    # Stem and Branch
    "analyze_stem_compatibility",
    "analyze_branch_compatibility",
    "_get_branches_from_pillars",
    # Shinsal
    "analyze_shinsal_compatibility",
    # 12 Stages and Naeum
    "analyze_twelve_stages_compatibility",
    "analyze_naeum_compatibility",
    # House and Gongmang
    "analyze_gongmang_interaction",
    "analyze_house_compatibility",
    # Samjae and Yongsin
    "analyze_samjae_compatibility",
    "analyze_yongsin_interaction",
    # Banhap and Banghap
    "analyze_banhap_banghap_detailed",
]
