# backend_ai/app/compatibility/analysis/banhap_banghap.py
"""
반합/방합 상세 분석
==================
- analyze_banhap_banghap_detailed: 반합/방합 상세 분석
"""

from typing import Dict

from ..constants import (
    BRANCH_BANHAP,
    BRANCH_BANGHAP,
)
from .stem_branch import _get_branches_from_pillars


def analyze_banhap_banghap_detailed(person1: dict, person2: dict) -> dict:
    """
    반합(半合)과 방합(方合) 상세 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 반합/방합 detailed analysis
    """
    result = {
        "banhap_analysis": {
            "found": [],
            "score": 0,
            "meaning": ""
        },
        "banghap_analysis": {
            "found": [],
            "score": 0,
            "meaning": ""
        },
        "total_score": 0,
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)

    all_branches = branches1 + branches2

    # 반합 체크 (삼합 중 2개)
    for banhap_pair, data in BRANCH_BANHAP.items():
        if banhap_pair.issubset(set(all_branches)):
            result["banhap_analysis"]["found"].append({
                "branches": list(banhap_pair),
                "element": data.get("element", ""),
                "meaning": data.get("meaning", "")
            })
            result["banhap_analysis"]["score"] += data.get("score", 0) - 70

    # 방합 체크 (같은 방위)
    for banghap_set, data in BRANCH_BANGHAP.items():
        matching = banghap_set.intersection(set(all_branches))
        if len(matching) >= 2:
            result["banghap_analysis"]["found"].append({
                "branches": list(matching),
                "direction": data.get("direction", ""),
                "meaning": data.get("meaning", "")
            })
            result["banghap_analysis"]["score"] += len(matching) * 3

    result["total_score"] = result["banhap_analysis"]["score"] + result["banghap_analysis"]["score"]

    if result["total_score"] >= 10:
        result["summary"] = "반합/방합이 매우 강하게 형성됩니다. 에너지가 조화롭게 합쳐집니다."
    elif result["total_score"] >= 5:
        result["summary"] = "반합/방합이 있습니다. 특정 영역에서 시너지가 있습니다."
    elif result["total_score"] > 0:
        result["summary"] = "약간의 반합/방합이 있습니다."
    else:
        result["summary"] = "반합/방합이 없거나 미미합니다."

    return result
