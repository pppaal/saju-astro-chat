# backend_ai/app/compatibility/main.py
"""
Main Entry Points for Compatibility Analysis
=============================================
궁합 분석의 메인 진입점 함수들

Functions:
- interpret_compatibility: 2인 궁합 분석 (메인 API)
- interpret_compatibility_group: 3-5인 그룹 궁합 분석
- analyze_timing_compatibility: 타이밍 분석
- get_action_items: 행동 권고사항 생성
- load_compatibility_data: 참조 데이터 로드
- format_person_data: 개인 데이터 포맷팅
- analyze_group_element_distribution: 그룹 원소 분포 분석
"""

import json
import traceback
from datetime import datetime
from pathlib import Path

from .constants import BRANCH_ELEMENTS
from .helpers import (
    get_current_month_branch,
    element_supports,
    element_controls,
    determine_couple_type,
)
from .scoring import calculate_pair_score, generate_pairwise_matrix, calculate_group_synergy_score
from .synastry import analyze_venus_mars_synastry
from .group import identify_group_roles, get_group_timing_analysis, get_group_action_items
from .prompts import format_compatibility_report, format_group_compatibility_report

# Backend AI directory
_backend_ai_dir = Path(__file__).parent.parent.parent


def load_compatibility_data() -> dict:
    """
    Load compatibility reference data from JSON files.

    Returns:
        dict with saju_compatibility, astro_compatibility, fusion_compatibility, compatibility_rules
    """
    data_dir = _backend_ai_dir / "data" / "graph"

    result = {
        "saju_compatibility": {},
        "astro_compatibility": {},
        "fusion_compatibility": {},
        "compatibility_rules": {},
    }

    # Load Saju compatibility
    saju_compat_path = data_dir / "saju" / "interpretations" / "compatibility.json"
    if saju_compat_path.exists():
        with open(saju_compat_path, "r", encoding="utf-8") as f:
            result["saju_compatibility"] = json.load(f)

    # Load Astro synastry compatibility
    astro_compat_path = data_dir / "astro" / "synastry" / "compatibility.json"
    if astro_compat_path.exists():
        with open(astro_compat_path, "r", encoding="utf-8") as f:
            result["astro_compatibility"] = json.load(f)

    # Load FUSION cross-mapping compatibility
    fusion_compat_path = data_dir / "fusion" / "compatibility.json"
    if fusion_compat_path.exists():
        with open(fusion_compat_path, "r", encoding="utf-8") as f:
            result["fusion_compatibility"] = json.load(f)

    # Load compatibility rules
    rules_path = data_dir / "rules" / "fusion" / "compatibility.json"
    if rules_path.exists():
        with open(rules_path, "r", encoding="utf-8") as f:
            result["compatibility_rules"] = json.load(f)

    return result


def format_person_data(person: dict, index: int) -> str:
    """
    Format a single person's saju/astro data for prompts.

    Args:
        person: Person data dictionary
        index: Person index (1-based)

    Returns:
        Formatted string representation
    """
    parts = []
    name = person.get("name", f"Person {index}")
    relation = person.get("relation", "")

    parts.append(f"【{name}】" + (f" ({relation})" if relation else ""))

    # Saju data
    saju = person.get("saju", {})
    if saju:
        pillars = saju.get("pillars", {})
        day_master = saju.get("dayMaster", {})
        five_elements = saju.get("facts", {}).get("fiveElements", {})

        if pillars:
            parts.append(
                f"  사주: 년주 {pillars.get('year', '?')} | "
                f"월주 {pillars.get('month', '?')} | "
                f"일주 {pillars.get('day', '?')} | "
                f"시주 {pillars.get('time', '?')}"
            )

        if day_master:
            dm_name = day_master.get("name", "") if isinstance(day_master, dict) else str(day_master)
            dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""
            parts.append(f"  일간(Day Master): {dm_name} ({dm_element})")

        if five_elements:
            elem_str = ", ".join([f"{k}:{v}" for k, v in five_elements.items()])
            parts.append(f"  오행 분포: {elem_str}")

    # Astro data
    astro = person.get("astro", {})
    if astro:
        sun_sign = astro.get("sunSign") or astro.get("facts", {}).get("sunSign", "")
        moon_sign = astro.get("moonSign") or astro.get("facts", {}).get("moonSign", "")
        asc_sign = astro.get("ascendant") or astro.get("facts", {}).get("ascendant", "")

        if sun_sign:
            parts.append(f"  태양: {sun_sign}")
        if moon_sign:
            parts.append(f"  달: {moon_sign}")
        if asc_sign:
            parts.append(f"  ASC: {asc_sign}")

    return "\n".join(parts)


def analyze_timing_compatibility(person1: dict, person2: dict) -> dict:
    """
    두 사람의 운세 사이클 교차 분석

    Args:
        person1: First person data
        person2: Second person data

    Returns:
        dict with timing insights (current_month, annual_guide, good_days, caution_days)
    """
    result = {
        "current_month": {},
        "annual_guide": {},
        "good_days": [],
        "caution_days": [],
    }

    # Get current month branch
    current_branch = get_current_month_branch()
    current_element = BRANCH_ELEMENTS.get(current_branch, "土")

    # Extract day masters
    dm1 = person1.get("saju", {}).get("dayMaster", {})
    dm2 = person2.get("saju", {}).get("dayMaster", {})

    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # Analyze current month energy for the couple
    p1_harmony = element_supports(current_element, dm1_element)
    p2_harmony = element_supports(current_element, dm2_element)

    result["current_month"] = {
        "branch": current_branch,
        "element": current_element,
        "energy": _get_month_energy_description(current_element),
        "person1_harmony": p1_harmony,
        "person2_harmony": p2_harmony,
    }

    # Determine who should lead this month
    if p1_harmony and p2_harmony:
        result["current_month"]["couple_advice"] = "이번 달은 두 분 모두에게 좋은 에너지! 함께 중요한 결정을 내리기 좋아요."
    elif p1_harmony:
        result["current_month"]["couple_advice"] = "이번 달은 첫 번째 분이 리드하면 좋겠어요."
    elif p2_harmony:
        result["current_month"]["couple_advice"] = "이번 달은 두 번째 분이 리드하면 좋겠어요."
    else:
        result["current_month"]["couple_advice"] = "이번 달은 무리하지 말고 서로 배려하며 보내세요."

    # Good days and caution days
    result["good_days"] = _get_good_days_for_elements(dm1_element, dm2_element)
    result["caution_days"] = _get_caution_days_for_elements(dm1_element, dm2_element)

    return result


def _get_month_energy_description(element: str) -> str:
    """Get description for month's dominant energy."""
    descriptions = {
        "木": "성장과 새로운 시작의 에너지",
        "火": "열정과 활력의 에너지",
        "土": "안정과 중심의 에너지",
        "金": "결실과 수확의 에너지",
        "水": "지혜와 성찰의 에너지",
    }
    return descriptions.get(element, "균형의 에너지")


def _get_good_days_for_elements(elem1: str, elem2: str) -> list:
    """Get good days based on elements."""
    good_days = []

    if elem1 in ["木", "火"] or elem2 in ["木", "火"]:
        good_days.append({"day": "화요일", "reason": "화(火) 기운으로 활력 있는 만남"})
    if elem1 in ["土", "金"] or elem2 in ["土", "金"]:
        good_days.append({"day": "금요일", "reason": "안정적인 에너지로 깊은 대화"})
    if elem1 == "水" or elem2 == "水":
        good_days.append({"day": "수요일", "reason": "수(水) 기운으로 지혜로운 결정"})

    if not good_days:
        good_days.append({"day": "주말", "reason": "여유로운 시간에 만남"})

    return good_days


def _get_caution_days_for_elements(elem1: str, elem2: str) -> list:
    """Get caution days based on elements."""
    caution_days = []

    if element_controls(elem1, elem2) or element_controls(elem2, elem1):
        caution_days.append({
            "period": "스트레스 받는 날",
            "reason": "상극 관계로 감정 조절 필요",
            "advice": "서로에게 여유를 주세요"
        })

    return caution_days


def get_action_items(person1: dict, person2: dict, reference_data: dict) -> list:
    """
    두 사람을 위한 성장 포인트 액션 아이템 생성

    Args:
        person1: First person data
        person2: Second person data
        reference_data: Reference data from load_compatibility_data()

    Returns:
        list of action items
    """
    action_items = []

    # Get elements
    dm1 = person1.get("saju", {}).get("dayMaster", {})
    dm2 = person2.get("saju", {}).get("dayMaster", {})

    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # Load action items from rules
    rules_data = reference_data.get("compatibility_rules", {})
    action_by_element = rules_data.get("action_items_by_element", {})

    # Determine couple type
    couple_type = determine_couple_type(dm1_element, dm2_element)

    if couple_type in action_by_element:
        element_actions = action_by_element[couple_type]
        action_items.extend(element_actions.get("growth_actions", []))

    # Add default actions if none found
    if not action_items:
        action_items = [
            "매주 1회 서로의 감정 나누는 시간 갖기",
            "월 1회 새로운 활동 함께 도전하기",
            "갈등 시 24시간 쿨다운 규칙 만들기",
        ]

    return action_items


def analyze_group_element_distribution(people: list) -> dict:
    """
    그룹 전체의 오행/점성 원소 분포 분석

    Args:
        people: List of person data

    Returns:
        dict with oheng, astro, dominant/lacking elements
    """
    oheng_count = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
    astro_element_count = {"fire": 0, "earth": 0, "air": 0, "water": 0}

    fire_signs = ["aries", "leo", "sagittarius", "양자리", "사자자리", "사수자리"]
    earth_signs = ["taurus", "virgo", "capricorn", "황소자리", "처녀자리", "염소자리"]
    air_signs = ["gemini", "libra", "aquarius", "쌍둥이자리", "천칭자리", "물병자리"]
    water_signs = ["cancer", "scorpio", "pisces", "게자리", "전갈자리", "물고기자리"]

    for person in people:
        # 사주 오행 분석
        saju = person.get("saju", {})
        dm = saju.get("dayMaster", {})
        if isinstance(dm, dict):
            dm_element = dm.get("element", "")
            if dm_element in oheng_count:
                oheng_count[dm_element] += 1
            elif dm_element.lower() in ["wood", "fire", "earth", "metal", "water"]:
                mapping = {"wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水"}
                oheng_count[mapping.get(dm_element.lower(), "土")] += 1

        # 점성술 원소 분석
        astro = person.get("astro", {})
        sun_sign = astro.get("sunSign", "").lower()

        if any(s in sun_sign for s in fire_signs):
            astro_element_count["fire"] += 1
        elif any(s in sun_sign for s in earth_signs):
            astro_element_count["earth"] += 1
        elif any(s in sun_sign for s in air_signs):
            astro_element_count["air"] += 1
        elif any(s in sun_sign for s in water_signs):
            astro_element_count["water"] += 1

    # 지배적/부족 원소 찾기
    dominant_oheng = max(oheng_count, key=oheng_count.get) if any(oheng_count.values()) else None
    lacking_oheng = [k for k, v in oheng_count.items() if v == 0]

    dominant_astro = max(astro_element_count, key=astro_element_count.get) if any(astro_element_count.values()) else None
    lacking_astro = [k for k, v in astro_element_count.items() if v == 0]

    return {
        "oheng": oheng_count,
        "astro": astro_element_count,
        "dominant_oheng": dominant_oheng,
        "lacking_oheng": lacking_oheng[0] if lacking_oheng else None,
        "dominant_astro": dominant_astro,
        "lacking_astro": lacking_astro[0] if lacking_astro else None,
    }


def interpret_compatibility(
    people: list,
    relationship_type: str = "lover",
    locale: str = "ko",
) -> dict:
    """
    Main function: Generate compatibility interpretation using rule-based system.

    Args:
        people: List of person data with saju/astro (minimum 2)
        relationship_type: lover, spouse, friend, business, family, other
        locale: ko, en

    Returns:
        dict with status, interpretation, scores, timing, action_items, etc.
    """
    try:
        if len(people) < 2:
            return {
                "status": "error",
                "message": "최소 2명의 데이터가 필요합니다.",
            }

        # Load reference data
        reference_data = load_compatibility_data()

        # 1. Timing Analysis
        timing_analysis = analyze_timing_compatibility(people[0], people[1])

        # 2. Action Items
        action_items = get_action_items(people[0], people[1], reference_data)

        # 3. Venus-Mars Synastry (for lovers/spouses)
        venus_mars_analysis = analyze_venus_mars_synastry(people[0], people[1], relationship_type)

        # 4. Pair Score calculation
        pair_score = calculate_pair_score(people[0], people[1])

        # 5. Add Venus-Mars info to pair_score
        if venus_mars_analysis.get("venus_mars_chemistry"):
            pair_score["astro_details"].append(
                f"금성-화성 케미스트리: {venus_mars_analysis['venus_mars_chemistry']}점"
            )
            if venus_mars_analysis.get("fusion_insight"):
                pair_score["fusion_insights"].append(venus_mars_analysis["fusion_insight"])

        # 6. Generate formatted report
        interpretation = format_compatibility_report(
            person1=people[0],
            person2=people[1],
            pair_analysis=pair_score,
            relationship_type=relationship_type,
            locale=locale,
        )

        overall_score = pair_score.get("score", 70)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "rule-based",
            "pair_score": pair_score,
            "timing": timing_analysis,
            "action_items": action_items,
            "fusion_enabled": True,
        }

    except Exception as e:
        print(f"[interpret_compatibility] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
        }


def interpret_compatibility_group(
    people: list,
    relationship_type: str = "family",
    locale: str = "ko",
) -> dict:
    """
    Enhanced Group Compatibility for 3-5 people (family, team, friends, etc.)

    Args:
        people: List of person data (3-5 people)
        relationship_type: family, team, friends, business
        locale: ko, en

    Returns:
        dict with comprehensive group analysis
    """
    try:
        if len(people) < 3:
            return interpret_compatibility(people, relationship_type, locale)

        if len(people) > 5:
            return {
                "status": "error",
                "message": "최대 5명까지만 지원합니다.",
            }

        # 1. Element distribution analysis
        element_distribution = analyze_group_element_distribution(people)

        # 2. Pairwise matrix (all 1:1 combinations)
        pairwise_matrix = generate_pairwise_matrix(people)

        # 3. Group role identification
        group_roles = identify_group_roles(people)

        # 4. Group timing analysis
        group_timing = get_group_timing_analysis(people)

        # 5. Group action items
        group_actions = get_group_action_items(people, element_distribution)

        # 6. Group synergy score
        synergy_score = calculate_group_synergy_score(
            people, pairwise_matrix, element_distribution, group_roles
        )

        # Get best/weakest pair info
        best_pair_info = synergy_score.get("best_pair", {})
        weakest_pair_info = synergy_score.get("weakest_pair", {})

        # 7. Generate formatted group report
        interpretation = format_group_compatibility_report(
            people=people,
            pairwise_matrix=pairwise_matrix,
            element_distribution=element_distribution,
            group_roles=group_roles,
            synergy_score=synergy_score,
            group_timing=group_timing,
            group_actions=group_actions,
            relationship_type=relationship_type,
            locale=locale,
        )

        overall_score = synergy_score["overall_score"]

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "rule-based",
            "is_group": True,
            "group_analysis": {
                "element_distribution": element_distribution,
                "pairwise_matrix": pairwise_matrix,
                "group_roles": group_roles,
            },
            "synergy_breakdown": {
                "total_score": synergy_score["overall_score"],
                "avg_pair_score": synergy_score["avg_pair_score"],
                "oheng_bonus": synergy_score["oheng_bonus"],
                "astro_bonus": synergy_score["astro_bonus"],
                "role_bonus": synergy_score["role_bonus"],
                "samhap_bonus": synergy_score["samhap_bonus"],
                "size_adjustment": synergy_score["size_adjustment"],
                "best_pair": {
                    "pair": best_pair_info.get("pair", "N/A"),
                    "score": best_pair_info.get("score", 0),
                    "summary": best_pair_info.get("summary", ""),
                },
                "weakest_pair": {
                    "pair": weakest_pair_info.get("pair", "N/A"),
                    "score": weakest_pair_info.get("score", 0),
                    "summary": weakest_pair_info.get("summary", ""),
                },
            },
            "timing": group_timing,
            "action_items": group_actions,
        }

    except Exception as e:
        print(f"[interpret_compatibility_group] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
        }
