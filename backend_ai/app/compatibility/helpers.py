# backend_ai/app/compatibility/helpers.py
"""
Compatibility Helper Functions
==============================
궁합 분석에 사용되는 유틸리티 함수들

Functions:
- get_openai_client: OpenAI API 클라이언트 생성
- get_sign_midpoint: 별자리 중간점 경도 계산
- calculate_aspect: 행성 간 애스펙트 계산
- element_supports: 오행 상생 관계 확인
- element_controls: 오행 상극 관계 확인
"""

import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment
_backend_ai_dir = Path(__file__).parent.parent.parent
_env_path = _backend_ai_dir / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Import constants
from .constants import (
    ZODIAC_DEGREES,
    ASPECTS,
    PLANET_SYNASTRY_WEIGHT,
    SATURN_ASPECTS_MEANING,
    BRANCH_ELEMENTS,
    MONTH_BRANCHES,
)


def get_openai_client():
    """Get OpenAI client for GPT."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing.")
    from openai import OpenAI
    import httpx
    return OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=httpx.Timeout(60.0, connect=10.0)
    )


def get_sign_midpoint(sign: str) -> float:
    """별자리의 중간점 경도 반환 (15도 추가)"""
    sign_lower = sign.lower().strip()
    base = ZODIAC_DEGREES.get(sign_lower, 0)
    return (base + 15) % 360  # 별자리 중간점


def calculate_aspect(degree1: float, degree2: float) -> dict:
    """두 행성 위치 간의 애스펙트 계산"""
    diff = abs(degree1 - degree2)
    if diff > 180:
        diff = 360 - diff

    for aspect_name, aspect_data in ASPECTS.items():
        angle = aspect_data["angle"]
        orb = aspect_data["orb"]
        if abs(diff - angle) <= orb:
            return {
                "aspect": aspect_name,
                "exact_diff": diff,
                "orb_used": abs(diff - angle),
                **aspect_data
            }

    return {"aspect": "none", "score": 0, "meaning": "주요 애스펙트 없음"}


def get_current_month_branch() -> str:
    """Get the current month's earthly branch (지지)."""
    now = datetime.now()
    # Approximate mapping (정확한 절기 계산은 더 복잡함)
    month_index = (now.month + 1) % 12  # 인월(寅月) = 2월 시작
    return MONTH_BRANCHES[month_index]


def element_supports(source: str, target: str) -> bool:
    """Check if source element supports target element (상생)."""
    support_map = {
        "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
        "wood": "fire", "fire": "earth", "earth": "metal", "metal": "water", "water": "wood",
    }
    return support_map.get(source, "") == target


def element_controls(source: str, target: str) -> bool:
    """Check if source element controls target element (상극)."""
    control_map = {
        "木": "土", "土": "水", "水": "火", "火": "金", "金": "木",
        "wood": "earth", "earth": "water", "water": "fire", "fire": "metal", "metal": "wood",
    }
    return control_map.get(source, "") == target


def analyze_month_for_couple(month_element: str, dm1_element: str, dm2_element: str) -> str:
    """Analyze how the current month affects the couple."""
    supports_dm1 = element_supports(month_element, dm1_element)
    supports_dm2 = element_supports(month_element, dm2_element)

    if supports_dm1 and supports_dm2:
        return "이번 달은 두 분 모두에게 유리해요! 중요한 결정이나 함께하는 활동에 좋은 시기입니다."
    elif supports_dm1:
        return "이번 달은 첫 번째 분에게 유리해요. 상대방을 지지하고 리드해주세요."
    elif supports_dm2:
        return "이번 달은 두 번째 분에게 유리해요. 상대방의 의견을 존중하고 따라가 보세요."
    else:
        return "이번 달은 무리하지 말고 서로 의지하며 조용히 보내는 게 좋아요."


def get_good_days_for_couple(dm1_element: str, dm2_element: str, sun1: str, sun2: str) -> list:
    """Get recommended activity days based on shared energy."""
    recommendations = []

    # Fire energy days (화 기운이 강한 날)
    if dm1_element in ["火", "fire"] or dm2_element in ["火", "fire"]:
        recommendations.append({
            "type": "fire_days",
            "days": "화/일요일",
            "activities": ["열정적 데이트", "운동", "새로운 도전"],
            "reason": "불 에너지가 활성화되는 날"
        })

    # Earth energy days (토 기운이 강한 날)
    if dm1_element in ["土", "earth"] or dm2_element in ["土", "earth"]:
        recommendations.append({
            "type": "earth_days",
            "days": "토요일",
            "activities": ["재정 계획", "집 꾸미기", "가족 모임"],
            "reason": "안정적 에너지가 흐르는 날"
        })

    # Water energy days (수 기운이 강한 날)
    if dm1_element in ["水", "water"] or dm2_element in ["水", "water"]:
        recommendations.append({
            "type": "water_days",
            "days": "수/월요일",
            "activities": ["깊은 대화", "영화/예술", "명상"],
            "reason": "감정적 교감에 좋은 날"
        })

    # Metal energy days (금 기운이 강한 날)
    if dm1_element in ["金", "metal"] or dm2_element in ["金", "metal"]:
        recommendations.append({
            "type": "metal_days",
            "days": "금요일",
            "activities": ["고급 레스토랑", "쇼핑", "결단이 필요한 대화"],
            "reason": "결단력이 강해지는 날"
        })

    # Wood energy days (목 기운이 강한 날)
    if dm1_element in ["木", "wood"] or dm2_element in ["木", "wood"]:
        recommendations.append({
            "type": "wood_days",
            "days": "목요일",
            "activities": ["자연 데이트", "새로운 시작", "성장 계획"],
            "reason": "성장과 시작의 에너지가 흐르는 날"
        })

    if not recommendations:
        recommendations.append({
            "type": "general",
            "days": "주말",
            "activities": ["함께하는 시간", "대화", "여유로운 데이트"],
            "reason": "에너지가 조화를 이루는 날"
        })

    return recommendations


def determine_couple_type(element1: str, element2: str) -> str:
    """두 사람의 주요 오행으로 커플 타입 결정"""
    element_map = {
        "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
    }
    e1 = element_map.get(element1, element1.lower() if isinstance(element1, str) else "")
    e2 = element_map.get(element2, element2.lower() if isinstance(element2, str) else "")

    if element_supports(element1, element2) or element_supports(element2, element1):
        if "fire" in [e1, e2]:
            return "열정적 성장 커플"
        elif "water" in [e1, e2]:
            return "지혜로운 성장 커플"
        else:
            return "상호 성장 커플"
    elif element_controls(element1, element2) or element_controls(element2, element1):
        return "도전과 성장의 커플"
    else:
        return "안정적 동반자 커플"


def get_composite_element(elem1: str, elem2: str) -> str:
    """두 오행을 합하여 컴포지트 원소 결정"""
    element_map = {
        "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
    }
    e1 = element_map.get(elem1, elem1.lower() if isinstance(elem1, str) else "earth")
    e2 = element_map.get(elem2, elem2.lower() if isinstance(elem2, str) else "earth")

    # 같은 원소면 그대로
    if e1 == e2:
        return e1

    # 상생 관계면 생해지는 원소
    generation_result = {
        ("wood", "fire"): "fire",
        ("fire", "earth"): "earth",
        ("earth", "metal"): "metal",
        ("metal", "water"): "water",
        ("water", "wood"): "wood",
    }

    pair = (e1, e2)
    if pair in generation_result:
        return generation_result[pair]
    reverse_pair = (e2, e1)
    if reverse_pair in generation_result:
        return generation_result[reverse_pair]

    # 상극 관계면 중간 원소 (토)
    return "earth"


def get_stem_combination_result(stem1: str, stem2: str) -> dict:
    """천간합 결과 반환"""
    from .constants import STEM_COMBINATIONS

    pair = (stem1, stem2)
    reverse_pair = (stem2, stem1)

    if pair in STEM_COMBINATIONS:
        return STEM_COMBINATIONS[pair]
    elif reverse_pair in STEM_COMBINATIONS:
        return STEM_COMBINATIONS[reverse_pair]

    return {"result": None, "score": 0, "meaning": "천간합 아님"}
