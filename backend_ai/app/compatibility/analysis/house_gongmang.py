# backend_ai/app/compatibility/analysis/house_gongmang.py
"""
하우스 및 공망 궁합 분석
======================
- analyze_gongmang_interaction: 공망 상호작용 분석
- analyze_house_compatibility: 12하우스 궁합 분석
"""

from typing import Dict

from ..constants import (
    GONGMANG_BY_CYCLE,
    BRANCH_TO_HOUSE,
    SAME_HOUSE_SCORE,
    HOUSE_AXIS_COMPATIBILITY,
    HOUSE_COMPATIBILITY_MEANING,
)
from .stem_branch import _get_branches_from_pillars


def analyze_gongmang_interaction(person1: dict, person2: dict) -> dict:
    """
    공망(空亡) 상호작용 분석 - 두 사람의 공망이 상대의 지지에 미치는 영향

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with gongmang interaction analysis
    """
    result = {
        "person1_gongmang": [],
        "person2_gongmang": [],
        "interactions": [],
        "score_adjustment": 0,
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    gongmang1 = GONGMANG_BY_CYCLE.get(day1, [])
    gongmang2 = GONGMANG_BY_CYCLE.get(day2, [])

    result["person1_gongmang"] = gongmang1
    result["person2_gongmang"] = gongmang2

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)

    day_branch2 = branches2[2] if len(branches2) > 2 else ""
    day_branch1 = branches1[2] if len(branches1) > 2 else ""

    if day_branch2 in gongmang1:
        result["interactions"].append({
            "type": "my_gongmang_partner_day",
            "effect": "A의 공망이 B의 일지 - B와의 관계에서 허전함 느낄 수 있음",
            "score": -3
        })
        result["score_adjustment"] -= 3

    if day_branch1 in gongmang2:
        result["interactions"].append({
            "type": "partner_gongmang_my_day",
            "effect": "B의 공망이 A의 일지 - A와의 관계에서 허전함 느낄 수 있음",
            "score": -3
        })
        result["score_adjustment"] -= 3

    common_gongmang = set(gongmang1) & set(gongmang2)
    if common_gongmang:
        result["interactions"].append({
            "type": "shared_gongmang",
            "branches": list(common_gongmang),
            "effect": f"같은 공망({', '.join(common_gongmang)}) - 같은 영역에서 공허함을 공유, 이해 가능",
            "score": 2
        })
        result["score_adjustment"] += 2

    if day_branch2 not in gongmang1 and day_branch1 not in gongmang2:
        result["interactions"].append({
            "type": "no_spouse_gongmang",
            "effect": "배우자궁 공망 없음 - 관계가 실질적으로 느껴짐",
            "score": 2
        })
        result["score_adjustment"] += 2

    if result["score_adjustment"] > 0:
        result["summary"] = "공망 상 좋은 조합입니다. 서로의 빈 곳을 이해합니다."
    elif result["score_adjustment"] == 0:
        result["summary"] = "공망 영향이 중립적입니다."
    else:
        result["summary"] = "공망 상 주의할 부분이 있습니다. 관계에서 허전함을 느낄 수 있어요."

    return result


def analyze_house_compatibility(person1: dict, person2: dict) -> dict:
    """
    12하우스 궁합 분석 - 두 사람의 일지를 하우스로 변환하여 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with house compatibility analysis
    """
    result = {
        "person1_houses": {"primary": 0, "secondary": 0, "branch": ""},
        "person2_houses": {"primary": 0, "secondary": 0, "branch": ""},
        "score": 0,
        "house_interactions": [],
        "dominant_themes": [],
        "compatibility_level": "",
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    branch1 = day1[1] if len(day1) >= 2 else ""
    branch2 = day2[1] if len(day2) >= 2 else ""

    if not branch1 or not branch2:
        return result

    house1_data = BRANCH_TO_HOUSE.get(branch1, {})
    house2_data = BRANCH_TO_HOUSE.get(branch2, {})

    if not house1_data or not house2_data:
        return result

    result["person1_houses"] = {
        "primary": house1_data.get("primary", 0),
        "secondary": house1_data.get("secondary", 0),
        "branch": branch1,
        "theme": house1_data.get("theme", "")
    }
    result["person2_houses"] = {
        "primary": house2_data.get("primary", 0),
        "secondary": house2_data.get("secondary", 0),
        "branch": branch2,
        "theme": house2_data.get("theme", "")
    }

    h1_primary = house1_data.get("primary", 0)
    h2_primary = house2_data.get("primary", 0)
    h1_secondary = house1_data.get("secondary", 0)
    h2_secondary = house2_data.get("secondary", 0)

    total_score = 0

    # 1. 같은 하우스 체크
    if h1_primary == h2_primary:
        same_data = SAME_HOUSE_SCORE.get(h1_primary, {"score": 5, "meaning": "같은 하우스"})
        total_score += same_data["score"]
        result["house_interactions"].append({
            "type": "same_primary",
            "house": h1_primary,
            "score": same_data["score"],
            "meaning": same_data["meaning"]
        })
        result["dominant_themes"].append(HOUSE_COMPATIBILITY_MEANING.get(h1_primary, {}).get("theme", ""))

    # 2. 하우스 축 체크 (1-7, 2-8, 3-9, 4-10, 5-11, 6-12)
    axis_pairs = [(h1_primary, h2_primary), (h2_primary, h1_primary)]
    for axis_key, axis_data in HOUSE_AXIS_COMPATIBILITY.items():
        for pair in axis_pairs:
            if (pair[0] == axis_key[0] and pair[1] == axis_key[1]) or \
               (pair[0] == axis_key[1] and pair[1] == axis_key[0]):
                total_score += axis_data["score"]
                result["house_interactions"].append({
                    "type": "axis",
                    "houses": list(axis_key),
                    "score": axis_data["score"],
                    "meaning": axis_data["meaning"]
                })
                break

    # 3. 관계에 좋은 하우스 조합 체크
    if h1_primary == 7 or h2_primary == 7:
        total_score += 5
        result["house_interactions"].append({
            "type": "partnership_house",
            "score": 5,
            "meaning": "파트너십 하우스 활성 - 관계에 적합"
        })

    if h1_primary == 5 or h2_primary == 5:
        total_score += 4
        result["house_interactions"].append({
            "type": "romance_house",
            "score": 4,
            "meaning": "로맨스 하우스 활성 - 즐거운 관계"
        })

    if h1_primary == 4 or h2_primary == 4:
        total_score += 3
        result["house_interactions"].append({
            "type": "home_house",
            "score": 3,
            "meaning": "가정 하우스 활성 - 안정적 관계"
        })

    # 4. Secondary 하우스 보너스
    if h1_secondary == h2_primary or h2_secondary == h1_primary:
        total_score += 3
        result["house_interactions"].append({
            "type": "secondary_match",
            "score": 3,
            "meaning": "부수 하우스 연결 - 추가 조화"
        })

    result["score"] = total_score

    if total_score >= 15:
        result["compatibility_level"] = "최상"
        result["summary"] = "하우스 상 완벽한 궁합! 삶의 영역이 조화롭게 연결됩니다."
    elif total_score >= 10:
        result["compatibility_level"] = "좋음"
        result["summary"] = "하우스 상 좋은 궁합입니다. 주요 삶의 영역에서 조화를 이룹니다."
    elif total_score >= 5:
        result["compatibility_level"] = "보통"
        result["summary"] = "하우스 상 보통 궁합입니다. 일부 영역에서 조율이 필요합니다."
    else:
        result["compatibility_level"] = "노력 필요"
        result["summary"] = "하우스 상 다른 에너지입니다. 서로 다른 점을 이해하는 노력이 필요합니다."

    return result
