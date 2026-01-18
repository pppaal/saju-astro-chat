"""
Helper functions for template renderer.
"""
from typing import Dict, Any, Optional


def get_sibsin_value(sibsin_data, key: str = "cheon", default: str = "") -> str:
    """
    Extract sibsin value from either string or dict format.
    sibsin can be:
    - String: "식신", "비견", etc.
    - Dict: {"cheon": "식신", "ji": "상관"}
    """
    if sibsin_data is None:
        return default
    if isinstance(sibsin_data, str):
        return sibsin_data if key == "cheon" else default
    if isinstance(sibsin_data, dict):
        return sibsin_data.get(key, default)
    return default


def get_element_from_stem(stem: str) -> str:
    """Get element from heavenly stem (천간) name."""
    stem_elements = {
        "갑": "목", "을": "목",
        "병": "화", "정": "화",
        "무": "토", "기": "토",
        "경": "금", "신": "금",
        "임": "수", "계": "수",
        # Hanja versions
        "甲": "목", "乙": "목",
        "丙": "화", "丁": "화",
        "戊": "토", "己": "토",
        "庚": "금", "辛": "금",
        "壬": "수", "癸": "수",
    }
    return stem_elements.get(stem, "")


def normalize_day_master(saju: Dict) -> tuple:
    """Normalize dayMaster to (name, element) tuple."""
    dm = (saju.get("dayMaster") or {})
    if isinstance(dm, dict):
        if dm.get("heavenlyStem"):
            hs = dm.get("heavenlyStem", {})
            name = hs.get("name", "") if isinstance(hs, dict) else hs
            element = hs.get("element", "") if isinstance(hs, dict) else dm.get("element", "")
        else:
            name = dm.get("name", "")
            element = dm.get("element", "")
    else:
        name = str(dm) if dm else ""
        element = ""
    return name, element


def calculate_rating(element: str, ten_god: str) -> int:
    """Calculate fortune rating 1-5 based on element and ten god."""
    positive_elements = ["wood", "fire", "목", "화"]
    positive_gods = ["식신", "상관", "정관", "편인", "정재"]

    rating = 3  # Default neutral

    if element and element.lower() in positive_elements:
        rating += 1
    if ten_god and ten_god in positive_gods:
        rating += 1

    # Clamp to 1-5
    return max(1, min(5, rating))


def calculate_rating_from_sibsin(cheon: str, ji: str) -> int:
    """Calculate fortune rating 1-5 based on sibsin (십신)."""
    positive_sibsin = ["식신", "정재", "정관", "정인"]
    neutral_sibsin = ["비견", "편인", "편재"]
    negative_sibsin = ["상관", "겁재", "편관"]

    rating = 3  # Default neutral

    for sibsin in [cheon, ji]:
        if sibsin in positive_sibsin:
            rating += 0.5
        elif sibsin in negative_sibsin:
            rating -= 0.5

    # Clamp to 1-5
    return max(1, min(5, int(rating + 0.5)))


def get_element_meaning(element: str) -> str:
    """Get meaning description for element."""
    meanings = {
        "wood": "성장과 새로운 시작",
        "fire": "열정과 확장",
        "earth": "안정과 축적",
        "metal": "결실과 정리",
        "water": "지혜와 유연성",
        "목": "성장과 새로운 시작",
        "화": "열정과 확장",
        "토": "안정과 축적",
        "금": "결실과 정리",
        "수": "지혜와 유연성",
    }
    return meanings.get(element.lower() if element else "", "변화의 시기")


def get_daeun_meaning(element: str, sibsin: str) -> str:
    """Generate daeun period meaning based on element and sibsin."""
    element_meanings = {
        "목": "성장과 발전의 시기",
        "화": "활동과 확장의 시기",
        "토": "안정과 축적의 시기",
        "금": "결실과 정리의 시기",
        "수": "지혜와 준비의 시기",
    }
    sibsin_meanings = {
        "식신": "창의력과 표현력이 높아지는 시기",
        "상관": "변화와 도전의 시기",
        "편재": "재물 기회가 많은 시기",
        "정재": "안정적 수입의 시기",
        "편관": "도전과 성장의 시기",
        "정관": "사회적 인정의 시기",
        "편인": "학습과 자기계발의 시기",
        "정인": "지원과 도움이 있는 시기",
        "비견": "경쟁과 협력의 시기",
        "겁재": "적극적 행동의 시기",
    }

    base = element_meanings.get(element, "변화의 시기")
    detail = sibsin_meanings.get(sibsin, "")

    if detail:
        return f"{base}, {detail}"
    return base


def get_period_advice(element: str, ten_god: str) -> str:
    """Generate advice based on element and ten god."""
    if "재" in (ten_god or ""):
        return "재물 관련 기회를 적극 활용하세요"
    if "관" in (ten_god or ""):
        return "직장/사회적 위치 변화에 주목하세요"
    if "인" in (ten_god or ""):
        return "학습과 자기계발에 좋은 시기입니다"
    if element and element.lower() in ["wood", "목"]:
        return "새로운 도전을 시작하기 좋은 시기입니다"
    if element and element.lower() in ["fire", "화"]:
        return "적극적인 행동이 좋은 결과를 가져옵니다"
    return "변화에 유연하게 대응하세요"


# Hanja to Hangul conversion map
HANJA_TO_HANGUL = {
    "甲": "갑목", "乙": "을목", "丙": "병화", "丁": "정화",
    "戊": "무토", "己": "기토", "庚": "경금", "辛": "신금",
    "壬": "임수", "癸": "계수"
}

# Hanja element to Hangul
HANJA_ELEMENT_TO_HANGUL = {"木": "목", "火": "화", "土": "토", "金": "금", "水": "수"}

# Element to simple Korean/English names
ELEMENT_SIMPLE = {
    "목": "나무", "화": "불", "토": "흙", "금": "금속", "수": "물",
}

ELEMENT_SIMPLE_EN = {
    "목": "Wood", "화": "Fire", "토": "Earth", "금": "Metal", "수": "Water",
}

# Element type names
TYPE_NAME_KO = {"목": "성장형", "화": "열정형", "토": "안정형", "금": "완벽형", "수": "지혜형"}
TYPE_NAME_EN = {"목": "Growth Type", "화": "Passion Type", "토": "Stability Type", "금": "Perfectionist Type", "수": "Wisdom Type"}


def get_yearly_transit_info(year: int, astro: Dict[str, Any] = None) -> str:
    """Get yearly transit info for astroReason based on major planetary transits."""
    transits = {
        2024: "목성 황소→쌍둥이자리, 토성 물고기자리 - 실용적 확장과 감정적 성숙",
        2025: "토성 양자리 입성(5월), 목성 게자리(7월) - 새 도전과 정서적 풍요",
        2026: "토성 양자리, 목성 게→사자자리 - 자기주도 성장과 자신감 확대",
        2027: "토성 황소자리 입성, 목성 사자자리 - 안정 추구와 창의적 표현",
        2028: "토성 황소자리, 목성 처녀자리 - 현실적 기반과 세부 관리",
        2029: "토성 쌍둥이자리 입성, 목성 천칭자리 - 소통 확장과 관계 조화",
        2030: "토성 쌍둥이자리, 목성 전갈자리 - 지적 성장과 심층 변화",
    }

    # Get user's sun sign for personalized transit
    sun_sign = ""
    if astro:
        planets = astro.get("planets", [])
        sun = next((p for p in planets if p.get("name") == "Sun"), {})
        sun_sign = sun.get("sign", "")

    base_transit = transits.get(year, f"{year}년 주요 행성 트랜짓 영향")

    # Add personalized note if sun sign available
    if sun_sign:
        from ..data.zodiac import SIGN_KO
        sign_name = SIGN_KO.get(sun_sign, sun_sign)
        return f"{base_transit} | 태양 {sign_name} 영향"

    return base_transit
