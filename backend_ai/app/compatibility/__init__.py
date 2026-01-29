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

__all__ = [
    "interpret_compatibility",
    "interpret_compatibility_group",
    "analyze_timing_compatibility",
    "get_action_items",
    "load_compatibility_data",
]
