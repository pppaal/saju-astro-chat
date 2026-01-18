# backend_ai/app/compatibility/analysis/samjae_yongsin.py
"""
삼재 및 용신 궁합 분석
=====================
- analyze_samjae_compatibility: 삼재 궁합 분석
- analyze_yongsin_interaction: 용신/기신 상호작용 분석
"""

from typing import Dict

from ..constants import (
    SAMJAE_GROUPS,
    SAMJAE_COMPATIBILITY_EFFECT,
    YONGSIN_CHARACTERISTICS,
    YONGSIN_INTERACTION,
)


def analyze_samjae_compatibility(person1: dict, person2: dict) -> dict:
    """
    삼재(三災) 궁합 분석 - 두 사람의 삼재 상호작용

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 삼재 compatibility analysis
    """
    result = {
        "person1_year_branch": "",
        "person2_year_branch": "",
        "person1_samjae_group": [],
        "person2_samjae_group": [],
        "interaction": "",
        "score": 0,
        "effect": "",
        "recommendation": "",
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    year1 = pillars1.get("year", "")
    year2 = pillars2.get("year", "")

    branch1 = year1[1] if len(year1) >= 2 else ""
    branch2 = year2[1] if len(year2) >= 2 else ""

    if not branch1 or not branch2:
        result["summary"] = "년지 정보가 없어 삼재 분석을 할 수 없습니다."
        return result

    result["person1_year_branch"] = branch1
    result["person2_year_branch"] = branch2

    def get_samjae_group(branch):
        for group_name, data in SAMJAE_GROUPS.items():
            if branch in data.get("years", []):
                return group_name, data
        return None, None

    group1_name, group1_data = get_samjae_group(branch1)
    group2_name, group2_data = get_samjae_group(branch2)

    if group1_data:
        result["person1_samjae_group"] = group1_data.get("samjae_branches", [])
    if group2_data:
        result["person2_samjae_group"] = group2_data.get("samjae_branches", [])

    score = 0

    if group1_name and group2_name and group1_name != group2_name:
        samjae1 = group1_data.get("samjae_branches", [])
        samjae2 = group2_data.get("samjae_branches", [])

        if branch2 not in samjae1 and branch1 not in samjae2:
            score += 8
            result["interaction"] = "safe"
            effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("different_group_no_clash", {})
            result["effect"] = effect_data.get("effect", "삼재 충돌 없음")
            result["recommendation"] = effect_data.get("recommendation", "")
        elif branch2 in samjae1 or branch1 in samjae2:
            score -= 5
            result["interaction"] = "one_in_other_samjae"
            effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("one_in_other_samjae", {})
            result["effect"] = effect_data.get("effect", "한 쪽이 삼재 영향")
            result["recommendation"] = effect_data.get("recommendation", "")

    elif group1_name and group1_name == group2_name:
        score += 3
        result["interaction"] = "same_group"
        effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("same_group", {})
        result["effect"] = effect_data.get("effect", "같은 시기에 삼재 경험")
        result["recommendation"] = effect_data.get("recommendation", "")

    result["score"] = score

    if score >= 6:
        result["summary"] = "삼재 상 안전한 궁합입니다. 서로의 삼재 시기에 영향을 주지 않습니다."
    elif score >= 0:
        result["summary"] = "삼재 상 보통 궁합입니다. 같은 시기에 어려움을 겪을 수 있으나 함께 극복 가능합니다."
    else:
        result["summary"] = "삼재 상 주의가 필요합니다. 상대의 삼재 시기에 관계에 영향을 줄 수 있습니다."

    return result


def analyze_yongsin_interaction(person1: dict, person2: dict) -> dict:
    """
    용신(用神)/기신(忌神) 상호작용 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터 (용신 정보 포함)
        person2: 두 번째 사람의 사주 데이터 (용신 정보 포함)

    Returns:
        dict with 용신/기신 interaction analysis
    """
    result = {
        "person1_yongsin": "",
        "person2_yongsin": "",
        "person1_gisin": "",
        "person2_gisin": "",
        "interaction_type": "",
        "score": 0,
        "mutual_support": False,
        "potential_conflict": False,
        "compatibility_details": [],
        "recommendations": [],
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    yongsin1 = saju1.get("yongsin", saju1.get("용신", saju1.get("use_god", "")))
    yongsin2 = saju2.get("yongsin", saju2.get("용신", saju2.get("use_god", "")))
    gisin1 = saju1.get("gisin", saju1.get("기신", saju1.get("avoid_god", "")))
    gisin2 = saju2.get("gisin", saju2.get("기신", saju2.get("avoid_god", "")))

    result["person1_yongsin"] = yongsin1
    result["person2_yongsin"] = yongsin2
    result["person1_gisin"] = gisin1
    result["person2_gisin"] = gisin2

    if not yongsin1 or not yongsin2:
        result["summary"] = "용신 정보가 없어 분석할 수 없습니다."
        return result

    score = 0

    yongsin1_chars = YONGSIN_CHARACTERISTICS.get(yongsin1, {})
    yongsin2_chars = YONGSIN_CHARACTERISTICS.get(yongsin2, {})

    # 1. 같은 용신 체크
    interaction = YONGSIN_INTERACTION.get("same_yongsin", {})
    if yongsin1 == yongsin2:
        score += interaction.get("score", 8)
        result["interaction_type"] = "same_yongsin"
        result["compatibility_details"].append({
            "type": "same_yongsin",
            "element": yongsin1,
            "score": interaction["score"],
            "meaning": interaction.get("meaning", "같은 에너지를 필요로 함")
        })
        result["recommendations"].append(interaction.get("recommendation", ""))

    # 2. 용신 상생 관계 체크
    generating_pairs = [("木", "火"), ("火", "土"), ("土", "金"), ("金", "水"), ("水", "木")]

    interaction = YONGSIN_INTERACTION.get("yongsin_generates_partner", {})
    for pair in generating_pairs:
        if yongsin1 == pair[0] and yongsin2 == pair[1]:
            score += interaction.get("score", 10)
            result["mutual_support"] = True
            result["compatibility_details"].append({
                "type": "yongsin_generates",
                "from": yongsin1,
                "to": yongsin2,
                "score": interaction["score"],
                "meaning": f"{yongsin1}이(가) {yongsin2}을(를) 생(生)함"
            })
            result["recommendations"].append(interaction.get("recommendation", ""))
        elif yongsin2 == pair[0] and yongsin1 == pair[1]:
            score += interaction.get("score", 10)
            result["mutual_support"] = True
            result["compatibility_details"].append({
                "type": "yongsin_generates",
                "from": yongsin2,
                "to": yongsin1,
                "score": interaction["score"],
                "meaning": f"{yongsin2}이(가) {yongsin1}을(를) 생(生)함"
            })

    # 3. 용신 상극 관계 체크
    controlling_pairs = [("木", "土"), ("土", "水"), ("水", "火"), ("火", "金"), ("金", "木")]

    interaction = YONGSIN_INTERACTION.get("yongsin_controls_partner", {})
    for pair in controlling_pairs:
        if (yongsin1 == pair[0] and yongsin2 == pair[1]) or \
           (yongsin2 == pair[0] and yongsin1 == pair[1]):
            score += interaction.get("score", -3)
            result["potential_conflict"] = True
            result["compatibility_details"].append({
                "type": "yongsin_controls",
                "controlling": pair[0],
                "controlled": pair[1],
                "score": interaction["score"],
                "meaning": "용신이 상극 관계"
            })
            result["recommendations"].append(interaction.get("recommendation", ""))

    # 4. 용신-기신 관계 체크
    if yongsin1 and gisin2 and yongsin1 == gisin2:
        interaction = YONGSIN_INTERACTION.get("yongsin_is_partner_gisin", {})
        score += interaction.get("score", -5)
        result["potential_conflict"] = True
        result["compatibility_details"].append({
            "type": "my_yongsin_partner_gisin",
            "element": yongsin1,
            "score": interaction["score"],
            "meaning": "내 용신이 상대의 기신"
        })
        result["recommendations"].append(interaction.get("recommendation", ""))

    if yongsin2 and gisin1 and yongsin2 == gisin1:
        interaction = YONGSIN_INTERACTION.get("yongsin_is_partner_gisin", {})
        score += interaction.get("score", -5)
        result["potential_conflict"] = True
        result["compatibility_details"].append({
            "type": "partner_yongsin_my_gisin",
            "element": yongsin2,
            "score": interaction["score"],
            "meaning": "상대의 용신이 내 기신"
        })

    # 5. 강점/약점 보완 분석
    if yongsin1_chars and yongsin2_chars:
        strengths1 = set(yongsin1_chars.get("strengths", []))
        strengths2 = set(yongsin2_chars.get("strengths", []))
        weaknesses1 = set(yongsin1_chars.get("weaknesses", []))
        weaknesses2 = set(yongsin2_chars.get("weaknesses", []))

        if strengths2 & weaknesses1:
            score += 3
            result["compatibility_details"].append({
                "type": "strength_covers_weakness",
                "provider": person2.get("name", "Person2"),
                "receiver": person1.get("name", "Person1"),
                "score": 3,
                "meaning": "상대의 강점이 나의 약점을 보완"
            })

        if strengths1 & weaknesses2:
            score += 3
            result["compatibility_details"].append({
                "type": "strength_covers_weakness",
                "provider": person1.get("name", "Person1"),
                "receiver": person2.get("name", "Person2"),
                "score": 3,
                "meaning": "나의 강점이 상대의 약점을 보완"
            })

    result["score"] = max(-10, min(15, score))

    if score >= 10:
        result["summary"] = "용신이 서로를 돕는 최상의 궁합! 함께하면 운이 상승합니다."
    elif score >= 5:
        result["summary"] = "용신 궁합이 좋습니다. 서로의 부족한 부분을 보완해줍니다."
    elif score >= 0:
        result["summary"] = "용신 궁합이 보통입니다. 특별한 충돌이나 지원이 없습니다."
    elif score >= -5:
        result["summary"] = "용신 궁합에 주의가 필요합니다. 서로의 에너지가 다소 충돌할 수 있습니다."
    else:
        result["summary"] = "용신-기신 충돌이 있습니다. 서로의 차이를 이해하는 노력이 필요합니다."

    return result
