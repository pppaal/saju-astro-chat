# backend_ai/app/iching/wuxing.py
"""
Five Elements (五行) Analysis
==============================
Functions for analyzing Five Element (Wuxing) relationships.
"""
from typing import Dict, Optional
from datetime import datetime

from .constants import (
    WUXING_GENERATING,
    WUXING_OVERCOMING,
    WUXING_KOREAN,
    SOLAR_TERMS,
    SEASON_ELEMENT,
)


def get_current_season() -> str:
    """Get current season based on date."""
    now = datetime.now()
    month = now.month

    if month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    elif month in [9, 10, 11]:
        return "autumn"
    else:
        return "winter"


def get_current_solar_term() -> str:
    """Get current solar term (절기)."""
    now = datetime.now()
    month, day = now.month, now.day

    for i, (term_name, term_month, term_day) in enumerate(SOLAR_TERMS):
        next_idx = (i + 1) % len(SOLAR_TERMS)
        next_term = SOLAR_TERMS[next_idx]

        if term_month == month and day >= term_day:
            if next_term[1] != month or day < next_term[2]:
                return term_name

    return "동지"  # Default


def analyze_seasonal_harmony(hexagram_element: str) -> Dict:
    """Analyze harmony between hexagram element and current season."""
    season = get_current_season()
    season_info = SEASON_ELEMENT.get(season, SEASON_ELEMENT["spring"])
    season_element = season_info["element"]

    harmony = {
        "season": season,
        "season_korean": season_info["korean"],
        "season_element": season_element,
        "hexagram_element": hexagram_element,
        "solar_term": get_current_solar_term(),
    }

    # 상생/상극 분석
    if WUXING_GENERATING.get(season_element) == hexagram_element:
        harmony["relationship"] = "상생(相生)"
        harmony["description"] = f"계절의 기운({WUXING_KOREAN.get(season_element, season_element)})이 괘의 기운({WUXING_KOREAN.get(hexagram_element, hexagram_element)})을 생(生)합니다. 시기적으로 유리합니다."
        harmony["score"] = 5
    elif WUXING_GENERATING.get(hexagram_element) == season_element:
        harmony["relationship"] = "설기(洩氣)"
        harmony["description"] = f"괘의 기운이 계절에 설(洩)됩니다. 에너지 소모에 주의하세요."
        harmony["score"] = 3
    elif WUXING_OVERCOMING.get(season_element) == hexagram_element:
        harmony["relationship"] = "피극(被剋)"
        harmony["description"] = f"계절의 기운이 괘를 극(剋)합니다. 저항이 있을 수 있으나 극복 가능합니다."
        harmony["score"] = 2
    elif WUXING_OVERCOMING.get(hexagram_element) == season_element:
        harmony["relationship"] = "극출(剋出)"
        harmony["description"] = f"괘의 기운이 계절을 극(剋)합니다. 강한 의지로 추진하면 성과가 있습니다."
        harmony["score"] = 4
    elif season_element == hexagram_element:
        harmony["relationship"] = "비화(比和)"
        harmony["description"] = f"계절과 괘가 같은 오행입니다. 조화롭고 안정적인 시기입니다."
        harmony["score"] = 4
    else:
        harmony["relationship"] = "중립"
        harmony["description"] = "특별한 상생상극 관계가 없습니다."
        harmony["score"] = 3

    return harmony


def analyze_wuxing_relationship(element1: str, element2: str) -> Dict:
    """Analyze the Five Element relationship between two elements."""
    if not element1 or not element2:
        return {"relationship": "unknown", "description": "오행 정보가 없습니다."}

    e1 = element1.lower()
    e2 = element2.lower()

    if e1 == e2:
        return {
            "relationship": "비화(比和)",
            "type": "harmony",
            "description": f"{WUXING_KOREAN.get(e1, e1)}끼리 만나 서로 도움이 됩니다.",
            "advice": "같은 기운이 만나 안정적입니다. 협력하면 좋습니다."
        }
    elif WUXING_GENERATING.get(e1) == e2:
        return {
            "relationship": "상생(相生)",
            "type": "generating",
            "description": f"{WUXING_KOREAN.get(e1, e1)}이(가) {WUXING_KOREAN.get(e2, e2)}을(를) 생(生)합니다.",
            "advice": "자연스러운 흐름입니다. 순리대로 나아가세요."
        }
    elif WUXING_GENERATING.get(e2) == e1:
        return {
            "relationship": "상생(相生) - 생을 받음",
            "type": "generated",
            "description": f"{WUXING_KOREAN.get(e2, e2)}이(가) {WUXING_KOREAN.get(e1, e1)}을(를) 생(生)합니다.",
            "advice": "도움을 받는 위치입니다. 감사히 받아들이세요."
        }
    elif WUXING_OVERCOMING.get(e1) == e2:
        return {
            "relationship": "상극(相剋) - 극함",
            "type": "overcoming",
            "description": f"{WUXING_KOREAN.get(e1, e1)}이(가) {WUXING_KOREAN.get(e2, e2)}을(를) 극(剋)합니다.",
            "advice": "강하게 밀어붙일 수 있으나, 지나치면 반발이 있습니다."
        }
    elif WUXING_OVERCOMING.get(e2) == e1:
        return {
            "relationship": "상극(相剋) - 극을 받음",
            "type": "overcome",
            "description": f"{WUXING_KOREAN.get(e2, e2)}이(가) {WUXING_KOREAN.get(e1, e1)}을(를) 극(剋)합니다.",
            "advice": "저항이 있습니다. 우회하거나 인내가 필요합니다."
        }
    else:
        return {
            "relationship": "중립",
            "type": "neutral",
            "description": "직접적인 상생상극 관계가 아닙니다.",
            "advice": "상황에 따라 유연하게 대처하세요."
        }


def get_saju_element_analysis(hexagram_element: str, saju_element: str) -> Optional[Dict]:
    """Analyze relationship between hexagram and user's Saju day master element."""
    if not saju_element:
        return None

    relationship = analyze_wuxing_relationship(saju_element, hexagram_element)

    # 일간별 구체적 조언 추가
    element_specific_advice = {
        "wood": {
            "generating": "목(木) 일간에게 화(火)의 괘는 재능을 발휘할 기회입니다.",
            "generated": "수(水)의 도움을 받아 성장할 수 있습니다.",
            "overcoming": "토(土)를 다스릴 수 있으니 재물운이 있습니다.",
            "overcome": "금(金)의 극을 받으니 건강과 관계에 주의하세요.",
        },
        "fire": {
            "generating": "화(火) 일간에게 토(土)의 괘는 안정과 결실을 의미합니다.",
            "generated": "목(木)의 도움으로 열정이 살아납니다.",
            "overcoming": "금(金)을 다스려 성과를 얻습니다.",
            "overcome": "수(水)의 극을 받으니 감정 조절이 필요합니다.",
        },
        "earth": {
            "generating": "토(土) 일간에게 금(金)의 괘는 수확과 보상을 뜻합니다.",
            "generated": "화(火)의 도움으로 신뢰를 얻습니다.",
            "overcoming": "수(水)를 다스려 방향을 잡습니다.",
            "overcome": "목(木)의 극을 받으니 유연성이 필요합니다.",
        },
        "metal": {
            "generating": "금(金) 일간에게 수(水)의 괘는 지혜와 흐름을 상징합니다.",
            "generated": "토(土)의 도움으로 기반이 탄탄해집니다.",
            "overcoming": "목(木)을 다스려 권위를 세웁니다.",
            "overcome": "화(火)의 극을 받으니 스트레스 관리가 중요합니다.",
        },
        "water": {
            "generating": "수(水) 일간에게 목(木)의 괘는 새로운 시작을 의미합니다.",
            "generated": "금(金)의 도움으로 통찰력이 생깁니다.",
            "overcoming": "화(火)를 다스려 열정을 조절합니다.",
            "overcome": "토(土)의 극을 받으니 현실적 장애에 주의하세요.",
        },
    }

    saju_advice = element_specific_advice.get(saju_element.lower(), {})
    relationship["saju_specific_advice"] = saju_advice.get(relationship.get("type", ""), "")
    relationship["day_master"] = WUXING_KOREAN.get(saju_element.lower(), saju_element)

    return relationship
