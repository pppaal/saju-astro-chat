# backend_ai/app/compatibility/analysis/stages_naeum.py
"""
12운성 및 납음오행 궁합 분석
=========================
- analyze_twelve_stages_compatibility: 12운성 궁합 분석
- analyze_naeum_compatibility: 납음오행 궁합 분석
"""

from typing import Dict

from ..constants import (
    TWELVE_STAGES_COMPATIBILITY,
    GANJI_TO_NAEUM,
    NAEUM_TO_ELEMENT,
    NAEUM_ELEMENT_COMPATIBILITY,
)


def analyze_twelve_stages_compatibility(person1: dict, person2: dict) -> dict:
    """
    12운성(十二運星) 궁합 분석 - 두 사람의 12운성 조합 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 12 stages compatibility analysis
    """
    result = {
        "person1_stage": "",
        "person2_stage": "",
        "score": 0,
        "meaning": "",
        "compatibility_level": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    stage1 = saju1.get("twelveStage", saju1.get("twelve_stage", ""))
    stage2 = saju2.get("twelveStage", saju2.get("twelve_stage", ""))

    if not stage1 or not stage2:
        return result

    result["person1_stage"] = stage1
    result["person2_stage"] = stage2

    combo = (stage1, stage2)
    combo_reverse = (stage2, stage1)

    if combo in TWELVE_STAGES_COMPATIBILITY:
        data = TWELVE_STAGES_COMPATIBILITY[combo]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    elif combo_reverse in TWELVE_STAGES_COMPATIBILITY:
        data = TWELVE_STAGES_COMPATIBILITY[combo_reverse]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    else:
        strong_stages = ["장생", "관대", "건록", "제왕"]
        moderate_stages = ["목욕", "양", "태"]
        weak_stages = ["쇠", "병", "사", "묘", "절"]

        score1 = 3 if stage1 in strong_stages else (2 if stage1 in moderate_stages else 1)
        score2 = 3 if stage2 in strong_stages else (2 if stage2 in moderate_stages else 1)

        result["score"] = (score1 + score2) * 2
        result["meaning"] = f"{stage1}과 {stage2}의 조합"

    if result["score"] >= 9:
        result["compatibility_level"] = "최상"
    elif result["score"] >= 7:
        result["compatibility_level"] = "좋음"
    elif result["score"] >= 5:
        result["compatibility_level"] = "보통"
    else:
        result["compatibility_level"] = "노력 필요"

    return result


def analyze_naeum_compatibility(person1: dict, person2: dict) -> dict:
    """
    납음오행(納音五行) 궁합 분석 - 두 사람의 일주 납음 비교

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with naeum compatibility analysis
    """
    result = {
        "person1_naeum": "",
        "person2_naeum": "",
        "person1_element": "",
        "person2_element": "",
        "score": 0,
        "meaning": "",
        "compatibility_level": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    naeum1 = GANJI_TO_NAEUM.get(day1, "")
    naeum2 = GANJI_TO_NAEUM.get(day2, "")

    if not naeum1 or not naeum2:
        return result

    result["person1_naeum"] = naeum1
    result["person2_naeum"] = naeum2

    elem1 = NAEUM_TO_ELEMENT.get(naeum1, "")
    elem2 = NAEUM_TO_ELEMENT.get(naeum2, "")

    result["person1_element"] = elem1
    result["person2_element"] = elem2

    if not elem1 or not elem2:
        return result

    combo = (elem1, elem2)
    combo_reverse = (elem2, elem1)

    if combo in NAEUM_ELEMENT_COMPATIBILITY:
        data = NAEUM_ELEMENT_COMPATIBILITY[combo]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    elif combo_reverse in NAEUM_ELEMENT_COMPATIBILITY:
        data = NAEUM_ELEMENT_COMPATIBILITY[combo_reverse]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    else:
        result["score"] = 0
        result["meaning"] = f"{naeum1}({elem1})과 {naeum2}({elem2})의 조합"

    if naeum1 == naeum2:
        result["score"] += 5
        result["meaning"] = f"같은 납음({naeum1}) - 같은 운명적 성향"

    if result["score"] >= 8:
        result["compatibility_level"] = "상생 - 매우 좋음"
    elif result["score"] >= 5:
        result["compatibility_level"] = "비화 - 좋음"
    elif result["score"] >= 0:
        result["compatibility_level"] = "중립"
    else:
        result["compatibility_level"] = "상극 - 도전적"

    return result
