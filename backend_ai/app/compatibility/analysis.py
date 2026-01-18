# backend_ai/app/compatibility/analysis.py
"""
Compatibility Analysis Functions
================================
This module has been refactored. All functions are now in backend_ai/app/compatibility/analysis/

Backwards Compatibility:
- All functions are re-exported from the analysis/ subpackage
- Import paths remain the same: from backend_ai.app.compatibility.analysis import ...

New Module Structure:
- analysis/stem_branch.py: 천간/지지 궁합 분석
- analysis/shinsal.py: 신살 궁합 분석
- analysis/stages_naeum.py: 12운성/납음오행 궁합 분석
- analysis/house_gongmang.py: 하우스/공망 궁합 분석
- analysis/samjae_yongsin.py: 삼재/용신 궁합 분석
- analysis/banhap_banghap.py: 반합/방합 상세 분석
"""

# Re-export everything for backwards compatibility
from .analysis import (
    # Stem and Branch
    analyze_stem_compatibility,
    analyze_branch_compatibility,
    _get_branches_from_pillars,
    # Shinsal
    analyze_shinsal_compatibility,
    # 12 Stages and Naeum
    analyze_twelve_stages_compatibility,
    analyze_naeum_compatibility,
    # House and Gongmang
    analyze_gongmang_interaction,
    analyze_house_compatibility,
    # Samjae and Yongsin
    analyze_samjae_compatibility,
    analyze_yongsin_interaction,
    # Banhap and Banghap
    analyze_banhap_banghap_detailed,
)

__all__ = [
    "analyze_stem_compatibility",
    "analyze_branch_compatibility",
    "_get_branches_from_pillars",
    "analyze_shinsal_compatibility",
    "analyze_twelve_stages_compatibility",
    "analyze_naeum_compatibility",
    "analyze_gongmang_interaction",
    "analyze_house_compatibility",
    "analyze_samjae_compatibility",
    "analyze_yongsin_interaction",
    "analyze_banhap_banghap_detailed",
]
