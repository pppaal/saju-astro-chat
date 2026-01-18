# backend_ai/app/compatibility/analysis/shinsal.py
"""
신살(神殺) 궁합 분석
===================
- analyze_shinsal_compatibility: 두 사람의 신살 상호작용 분석
"""

from typing import Dict, List

from ..constants import (
    SHINSAL_COMPATIBILITY,
    SHINSAL_DETERMINATION,
    GUIIN_DETERMINATION,
)
from .stem_branch import _get_branches_from_pillars


def analyze_shinsal_compatibility(person1: dict, person2: dict) -> dict:
    """
    신살(神殺) 궁합 분석 - 두 사람의 신살 상호작용 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with shinsal compatibility scores and details
    """
    result = {
        "total_score": 0,
        "details": [],
        "shinsal_interactions": [],
        "positive_shinsals": [],
        "negative_shinsals": [],
        "recommendations": []
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})

    # 일간 추출
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)
    day_branch1 = branches1[2] if len(branches1) > 2 else ""
    day_branch2 = branches2[2] if len(branches2) > 2 else ""
    year_branch1 = branches1[0] if len(branches1) > 0 else ""
    year_branch2 = branches2[0] if len(branches2) > 0 else ""

    # 1. 도화살/역마살/화개살 분석 (지지 기반)
    for shinsal_name, branch_mapping in SHINSAL_DETERMINATION.items():
        person1_has = False
        person2_has = False

        for base_branch in [year_branch1, day_branch1]:
            if base_branch in branch_mapping:
                target_branch = branch_mapping[base_branch]
                if target_branch in branches1:
                    person1_has = True
                    break

        for base_branch in [year_branch2, day_branch2]:
            if base_branch in branch_mapping:
                target_branch = branch_mapping[base_branch]
                if target_branch in branches2:
                    person2_has = True
                    break

        if shinsal_name in SHINSAL_COMPATIBILITY:
            shinsal_data = SHINSAL_COMPATIBILITY[shinsal_name]

            if person1_has and person2_has:
                score = shinsal_data.get("score_both", 0)
                result["total_score"] += score
                interaction = {
                    "shinsal": shinsal_name,
                    "both_have": True,
                    "score": score,
                    "meaning": shinsal_data.get("compatibility_effect", ""),
                    "astro_parallel": shinsal_data.get("astro_parallel", "")
                }
                result["shinsal_interactions"].append(interaction)
                if score > 0:
                    result["positive_shinsals"].append(f"{shinsal_name} (둘 다): {shinsal_data.get('compatibility_effect', '')}")
                elif score < 0:
                    result["negative_shinsals"].append(f"{shinsal_name} (둘 다): {shinsal_data.get('compatibility_effect', '')}")
            elif person1_has or person2_has:
                score = shinsal_data.get("score_partner", 0)
                if "score_opposite" in shinsal_data:
                    score = shinsal_data.get("score_opposite", 0)
                result["total_score"] += score
                who_has = "본인" if person1_has else "상대방"
                interaction = {
                    "shinsal": shinsal_name,
                    "who_has": who_has,
                    "score": score,
                    "meaning": shinsal_data.get("meaning", "")
                }
                result["shinsal_interactions"].append(interaction)

    # 2. 귀인 분석 (일간 기준)
    for guiin_name, stem_mapping in GUIIN_DETERMINATION.items():
        person1_has_guiin = False
        person2_has_guiin = False

        if dm1_name in stem_mapping:
            guiin_branches = stem_mapping[dm1_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches1:
                        person1_has_guiin = True
                        break
            elif guiin_branches in branches1:
                person1_has_guiin = True

        if dm2_name in stem_mapping:
            guiin_branches = stem_mapping[dm2_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches2:
                        person2_has_guiin = True
                        break
            elif guiin_branches in branches2:
                person2_has_guiin = True

        if guiin_name in SHINSAL_COMPATIBILITY:
            guiin_data = SHINSAL_COMPATIBILITY[guiin_name]

            if person1_has_guiin and person2_has_guiin:
                score = guiin_data.get("score_both", 0)
                result["total_score"] += score
                result["positive_shinsals"].append(f"{guiin_name} (둘 다): {guiin_data.get('compatibility_effect', '')}")
            elif person1_has_guiin:
                score = guiin_data.get("score_self", 0)
                result["total_score"] += score
                if score > 0:
                    result["details"].append(f"A에게 {guiin_name} - B를 도울 수 있음")
            elif person2_has_guiin:
                score = guiin_data.get("score_partner", 0)
                result["total_score"] += score
                if score > 0:
                    result["details"].append(f"B에게 {guiin_name} - A를 도움")

    # 3. 양인살 체크
    YANGIN_BRANCHES = {
        "甲": "卯", "乙": "辰", "丙": "午", "丁": "未",
        "戊": "午", "己": "未", "庚": "酉", "辛": "戌",
        "壬": "子", "癸": "丑"
    }

    person1_yangin = dm1_name in YANGIN_BRANCHES and YANGIN_BRANCHES[dm1_name] in branches1
    person2_yangin = dm2_name in YANGIN_BRANCHES and YANGIN_BRANCHES[dm2_name] in branches2

    if "양인살" in SHINSAL_COMPATIBILITY:
        yangin_data = SHINSAL_COMPATIBILITY["양인살"]
        if person1_yangin and person2_yangin:
            result["total_score"] += yangin_data.get("score_both", 0)
            result["negative_shinsals"].append("양인살 (둘 다): 서로 상처를 줄 수 있음")
            result["recommendations"].append("감정 표현 시 말투에 주의하세요")
        elif person1_yangin or person2_yangin:
            result["total_score"] += yangin_data.get("score_partner", 0)
            result["details"].append("한 쪽에 양인살 - 날카로움 주의")

    # 4. 결과 요약
    if result["total_score"] > 15:
        result["summary"] = "신살 궁합이 매우 좋습니다! 서로에게 귀인이 되어주는 관계입니다."
    elif result["total_score"] > 5:
        result["summary"] = "신살 궁합이 좋습니다. 긍정적인 에너지가 많습니다."
    elif result["total_score"] > -5:
        result["summary"] = "신살 궁합이 보통입니다. 특별한 신살 영향이 적습니다."
    elif result["total_score"] > -15:
        result["summary"] = "신살 상 주의할 점이 있습니다. 권고사항을 참고하세요."
    else:
        result["summary"] = "신살 상 도전적인 부분이 있습니다. 서로 이해하고 노력이 필요합니다."

    return result
