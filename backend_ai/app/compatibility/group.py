# backend_ai/app/compatibility/group.py
"""
Group Compatibility Analysis Functions
======================================
3인 이상 그룹 궁합 분석 함수들

Functions:
- identify_group_roles: 그룹 내 역할 식별
- analyze_element_distribution: 원소 분포 분석
- get_group_timing_analysis: 그룹 타이밍 분석
- get_group_action_items: 그룹 행동 권고사항
- analyze_group_compatibility: 그룹 전체 궁합 분석
"""

from .constants import (
    ZODIAC_ELEMENTS,
    BRANCH_ELEMENTS,
    MONTH_BRANCHES,
)
from .helpers import element_supports, get_current_month_branch
from .scoring import (
    generate_pairwise_matrix,
    calculate_group_synergy_score,
)


def identify_group_roles(people: list) -> dict:
    """
    그룹 내 역할 식별 (리더, 중재자, 촉매, 안정자 등)

    Args:
        people: 사람 데이터 리스트

    Returns:
        dict with role assignments
    """
    roles = {
        "leader": [],      # 리더십 에너지
        "mediator": [],    # 중재자/조화
        "catalyst": [],    # 촉매/에너지 부여
        "stabilizer": [],  # 안정자
        "creative": [],    # 창의적 아이디어
        "emotional": [],   # 감정적 지지
    }

    for i, person in enumerate(people):
        name = person.get("name", f"Person {i+1}")

        dm = person.get("saju", {}).get("dayMaster", {})
        dm_element = dm.get("element", "") if isinstance(dm, dict) else ""

        astro = person.get("astro", {})
        sun_sign = astro.get("sunSign", "").lower()

        # 리더십 에너지 (火, 사자자리, 양자리)
        if dm_element in ["火", "fire"]:
            roles["leader"].append(name)
        if any(s in sun_sign for s in ["leo", "aries"]):
            roles["leader"].append(name)

        # 중재자 (土, 천칭자리)
        if dm_element in ["土", "earth"]:
            roles["mediator"].append(name)
        if "libra" in sun_sign:
            roles["mediator"].append(name)

        # 촉매 (木, 쌍둥이자리, 사수자리)
        if dm_element in ["木", "wood"]:
            roles["catalyst"].append(name)
        if any(s in sun_sign for s in ["gemini", "sagittarius"]):
            roles["catalyst"].append(name)

        # 안정자 (金, 황소자리, 염소자리)
        if dm_element in ["金", "metal"]:
            roles["stabilizer"].append(name)
        if any(s in sun_sign for s in ["taurus", "capricorn"]):
            roles["stabilizer"].append(name)

        # 창의적 (水 + 물병자리)
        if dm_element in ["水", "water"]:
            roles["creative"].append(name)
        if "aquarius" in sun_sign:
            roles["creative"].append(name)

        # 감정적 지지 (게자리, 물고기자리)
        if any(s in sun_sign for s in ["cancer", "pisces"]):
            roles["emotional"].append(name)

    # 중복 제거
    for role in roles:
        roles[role] = list(set(roles[role]))

    return roles


def analyze_element_distribution(people: list) -> dict:
    """
    그룹 내 원소 분포 분석

    Args:
        people: 사람 데이터 리스트

    Returns:
        dict with oheng and astro element distribution
    """
    oheng_distribution = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
    astro_distribution = {"fire": 0, "earth": 0, "air": 0, "water": 0}

    for person in people:
        # 오행 분포
        dm = person.get("saju", {}).get("dayMaster", {})
        dm_element = dm.get("element", "") if isinstance(dm, dict) else ""
        if dm_element in oheng_distribution:
            oheng_distribution[dm_element] += 1

        # 점성 원소 분포
        sun_sign = person.get("astro", {}).get("sunSign", "").lower()
        astro_elem = ZODIAC_ELEMENTS.get(sun_sign, "")
        if astro_elem in astro_distribution:
            astro_distribution[astro_elem] += 1

    # 균형 분석
    oheng_max = max(oheng_distribution.values()) if oheng_distribution.values() else 0
    oheng_min = min(oheng_distribution.values()) if oheng_distribution.values() else 0
    oheng_balance = "균형" if oheng_max - oheng_min <= 1 else "불균형"

    astro_max = max(astro_distribution.values()) if astro_distribution.values() else 0
    astro_min = min(astro_distribution.values()) if astro_distribution.values() else 0
    astro_balance = "균형" if astro_max - astro_min <= 1 else "불균형"

    return {
        "oheng": oheng_distribution,
        "astro": astro_distribution,
        "oheng_balance": oheng_balance,
        "astro_balance": astro_balance,
        "dominant_oheng": max(oheng_distribution, key=oheng_distribution.get) if any(oheng_distribution.values()) else None,
        "dominant_astro": max(astro_distribution, key=astro_distribution.get) if any(astro_distribution.values()) else None,
    }


def get_group_timing_analysis(people: list) -> dict:
    """
    그룹 전체를 위한 타이밍 분석

    Args:
        people: 사람 데이터 리스트

    Returns:
        dict with timing analysis for the group
    """
    current_branch = get_current_month_branch()
    current_element = BRANCH_ELEMENTS.get(current_branch, "土")

    # 각 구성원의 일간 원소 수집
    dm_elements = []
    for person in people:
        dm = person.get("saju", {}).get("dayMaster", {})
        if isinstance(dm, dict):
            dm_elements.append(dm.get("element", ""))

    # 이번 달이 유리한 사람들 찾기
    favorable_members = []
    for i, elem in enumerate(dm_elements):
        if element_supports(current_element, elem):
            favorable_members.append(i + 1)

    # 그룹 전체 조언 생성
    if len(favorable_members) >= len(people) / 2:
        group_advice = "이번 달은 그룹 전체에 좋은 에너지가 흐르고 있어요! 중요한 결정이나 함께하는 활동에 적합합니다."
    elif len(favorable_members) > 0:
        member_list = ', '.join([str(m) for m in favorable_members])
        group_advice = f"이번 달은 {member_list}번 분이 리드하면 좋겠어요. 다른 분들은 지지해주세요."
    else:
        group_advice = "이번 달은 그룹 전체가 무리하지 말고 서로 배려하며 보내는 게 좋아요."

    return {
        "current_month": {
            "branch": current_branch,
            "element": current_element,
            "analysis": group_advice,
        },
        "favorable_members": favorable_members,
        "group_activities": [
            {"type": "bonding", "days": "주말", "activities": ["단체 식사", "야외 활동"], "reason": "에너지 충전"},
            {"type": "planning", "days": "수요일", "activities": ["회의", "계획 수립"], "reason": "수(水) 기운으로 지혜로운 결정"},
            {"type": "celebration", "days": "화/일요일", "activities": ["축하 파티", "성과 공유"], "reason": "화(火) 기운으로 활기"},
        ],
    }


def get_group_action_items(people: list, element_distribution: dict) -> list:
    """
    그룹에 대한 행동 권고사항 생성

    Args:
        people: 사람 데이터 리스트
        element_distribution: 원소 분포 데이터

    Returns:
        list of action items
    """
    action_items = []

    oheng = element_distribution.get("oheng", {})
    astro = element_distribution.get("astro", {})

    # 부족한 원소에 대한 권고
    missing_oheng = [elem for elem, count in oheng.items() if count == 0]
    missing_astro = [elem for elem, count in astro.items() if count == 0]

    if missing_oheng:
        oheng_advice = {
            "木": "성장과 새로운 시작을 의식적으로 추구하세요",
            "火": "열정과 활력을 위한 활동을 함께하세요",
            "土": "안정적인 루틴을 만들어보세요",
            "金": "결단력이 필요한 결정은 외부 조언을 구하세요",
            "水": "감정적 소통의 시간을 가져보세요",
        }
        for elem in missing_oheng:
            if elem in oheng_advice:
                action_items.append({
                    "type": "element_balance",
                    "priority": "medium",
                    "action": oheng_advice[elem],
                    "reason": f"그룹에 {elem}(오행) 에너지 부족"
                })

    if missing_astro:
        astro_advice = {
            "fire": "활력 넘치는 활동을 계획하세요",
            "earth": "실질적인 계획과 안정적 접근이 필요합니다",
            "air": "다양한 아이디어를 나누는 시간을 가지세요",
            "water": "감정적 유대를 강화하는 활동을 하세요",
        }
        for elem in missing_astro:
            if elem in astro_advice:
                action_items.append({
                    "type": "element_balance",
                    "priority": "medium",
                    "action": astro_advice[elem],
                    "reason": f"그룹에 {elem}(점성) 에너지 부족"
                })

    # 과잉 원소에 대한 주의
    dominant_oheng = max(oheng, key=oheng.get) if any(oheng.values()) else None
    if dominant_oheng and oheng.get(dominant_oheng, 0) >= len(people) * 0.6:
        oheng_caution = {
            "木": "너무 급하게 밀어붙이지 않도록 주의하세요",
            "火": "감정적 과열에 주의하세요",
            "土": "변화에 유연하게 대처하세요",
            "金": "비판보다는 격려를 먼저 하세요",
            "水": "감정에 치우치지 않도록 객관성을 유지하세요",
        }
        if dominant_oheng in oheng_caution:
            action_items.append({
                "type": "caution",
                "priority": "high",
                "action": oheng_caution[dominant_oheng],
                "reason": f"{dominant_oheng} 에너지 과잉"
            })

    # 일반적인 권고
    action_items.append({
        "type": "general",
        "priority": "low",
        "action": "정기적인 소통 시간을 가지세요",
        "reason": "그룹 결속력 유지"
    })

    return action_items


def analyze_group_compatibility(people: list) -> dict:
    """
    그룹 전체 궁합 종합 분석

    Args:
        people: 사람 데이터 리스트 (3명 이상)

    Returns:
        dict with comprehensive group compatibility analysis
    """
    if len(people) < 3:
        return {
            "error": "그룹 분석은 3명 이상이 필요합니다.",
            "member_count": len(people)
        }

    # 1. 모든 1:1 궁합 계산
    pairwise_matrix = generate_pairwise_matrix(people)

    # 2. 원소 분포 분석
    element_distribution = analyze_element_distribution(people)

    # 3. 역할 식별
    group_roles = identify_group_roles(people)

    # 4. 시너지 점수 계산
    synergy_score = calculate_group_synergy_score(
        people, pairwise_matrix, element_distribution, group_roles
    )

    # 5. 타이밍 분석
    timing_analysis = get_group_timing_analysis(people)

    # 6. 행동 권고사항
    action_items = get_group_action_items(people, element_distribution)

    # 7. 종합 요약 생성
    overall_score = synergy_score["overall_score"]
    if overall_score >= 85:
        summary = "최고의 그룹 궁합! 서로의 강점이 잘 어우러지는 드림팀입니다."
    elif overall_score >= 75:
        summary = "좋은 그룹 궁합입니다. 협력하면 시너지가 발생합니다."
    elif overall_score >= 65:
        summary = "괜찮은 그룹 궁합입니다. 서로의 차이를 존중하면 더 좋아집니다."
    elif overall_score >= 55:
        summary = "평균적인 그룹 궁합입니다. 의식적인 노력이 필요합니다."
    else:
        summary = "도전적인 그룹 궁합입니다. 각자의 역할을 명확히 하세요."

    return {
        "member_count": len(people),
        "overall_score": overall_score,
        "summary": summary,
        "pairwise_matrix": pairwise_matrix,
        "element_distribution": element_distribution,
        "group_roles": group_roles,
        "synergy_analysis": synergy_score,
        "timing_analysis": timing_analysis,
        "action_items": action_items,
    }
