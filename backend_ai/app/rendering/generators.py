# backend_ai/app/rendering/generators.py
"""
Rendering Meaning Generators
============================
운세 의미와 메시지를 생성하는 함수들
"""

from typing import Dict, Any
from .constants import SIBSIN_MEANINGS


def calculate_rating(element: str, ten_god: str) -> int:
    """Calculate fortune rating 1-5 based on element and ten god.

    Args:
        element: Element name (Korean or English)
        ten_god: Ten god (십신) name

    Returns:
        Rating from 1 to 5
    """
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
    """Calculate fortune rating 1-5 based on sibsin (십신).

    Args:
        cheon: Heavenly stem sibsin
        ji: Earthly branch sibsin

    Returns:
        Rating from 1 to 5
    """
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
    """Get meaning description for element.

    Args:
        element: Element name (Korean or English)

    Returns:
        Meaning description string
    """
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
    """Generate daeun period meaning based on element and sibsin.

    Args:
        element: Element name
        sibsin: Sibsin name

    Returns:
        Combined meaning string
    """
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


def get_personalized_daeun_meaning(
    cheon: str, ji: str, element: str, age: int, is_current: bool
) -> Dict[str, str]:
    """Generate personalized daeun meaning with specific messages.

    Args:
        cheon: Heavenly stem sibsin
        ji: Earthly branch sibsin
        element: Element name
        age: Age at start of daeun
        is_current: Whether this is the current daeun period

    Returns:
        Dictionary with title, saju, and astro keys
    """
    sibsin_life = {
        "식신": {
            "title": "창작과 향유의 황금기",
            "saju": "당신의 재능이 빛을 발하는 시기예요. 표현력이 극대화되고, 먹고 즐기는 것에서 큰 기쁨을 느낍니다.",
            "astro": "목성의 축복으로 풍요와 행운이 함께합니다",
        },
        "상관": {
            "title": "도전과 혁신의 시기",
            "saju": "기존 틀을 깨고 새로운 길을 개척할 때예요. 반항적이지만 그만큼 창의적인 에너지가 넘칩니다.",
            "astro": "천왕성 트랜짓이 파격적 변화를 예고합니다",
        },
        "편재": {
            "title": "기회와 모험의 시기",
            "saju": "예상치 못한 재물 기회가 찾아와요. 투자, 사업, 부업에서 대박의 가능성이 있습니다.",
            "astro": "금성이 재물궁을 활성화시킵니다",
        },
        "정재": {
            "title": "안정적 성장의 시기",
            "saju": "꾸준히 쌓아온 것들이 결실을 맺어요. 월급, 저축, 부동산 등 안정적인 부의 축적기입니다.",
            "astro": "토성이 재정 기반을 굳건히 합니다",
        },
        "편관": {
            "title": "시련과 성장의 시기",
            "saju": "도전과 압박이 있지만, 이를 극복하면 크게 성장해요. 책임감과 리더십이 강화됩니다.",
            "astro": "명왕성이 내면의 힘을 일깨웁니다",
        },
        "정관": {
            "title": "승진과 인정의 시기",
            "saju": "사회적 지위가 올라가고 인정받는 시기예요. 조직 내 승진, 명예, 자격 취득의 기회입니다.",
            "astro": "태양이 커리어 정점을 비춥니다",
        },
        "편인": {
            "title": "배움과 통찰의 시기",
            "saju": "특별한 지식이나 기술을 습득하는 시기예요. 직관력이 높아지고 영적 성장도 기대됩니다.",
            "astro": "해왕성이 직관과 영감을 높입니다",
        },
        "정인": {
            "title": "보호와 성장의 시기",
            "saju": "귀인의 도움이 있는 시기예요. 학업, 자격증, 부모님의 지원 등 든든한 후원을 받습니다.",
            "astro": "달이 정서적 안정감을 선사합니다",
        },
        "비견": {
            "title": "경쟁과 협력의 시기",
            "saju": "동료나 경쟁자와의 관계가 중요해지는 시기예요. 함께 성장하거나 경쟁에서 이겨야 합니다.",
            "astro": "화성이 경쟁심과 추진력을 높입니다",
        },
        "겁재": {
            "title": "과감한 도전의 시기",
            "saju": "큰 승부를 걸 수 있는 시기예요. 다만 재물 손실 위험도 있으니 신중한 판단이 필요합니다.",
            "astro": "화성과 목성이 대담한 행동을 부추깁니다",
        },
    }

    # Default or matched data
    data = sibsin_life.get(cheon, {
        "title": f"{age}세 10년 운세",
        "saju": f"{element}의 기운이 흐르는 시기입니다",
        "astro": "트랜짓 행성들이 변화를 예고합니다",
    })

    # Mark current daeun
    title = data["title"]
    if is_current:
        title = f"🔥 {title} (지금!)"

    return {
        "title": title,
        "saju": data["saju"],
        "astro": data["astro"],
    }


def get_personalized_annual_meaning(
    cheon: str, ji: str, year: int, is_current: bool
) -> Dict[str, str]:
    """Generate personalized annual meaning with specific messages.

    Args:
        cheon: Heavenly stem sibsin
        ji: Earthly branch sibsin
        year: The year
        is_current: Whether this is the current year

    Returns:
        Dictionary with title, saju, and astro keys
    """
    sibsin_year = {
        "식신": {
            "title": f"{year}년: 즐거움의 해",
            "saju": "창작, 취미, 맛있는 것을 즐기기 좋은 해예요. 스트레스는 줄이고 행복은 높아집니다.",
            "astro": "목성이 행운을 가져다줍니다",
        },
        "상관": {
            "title": f"{year}년: 혁신의 해",
            "saju": "새로운 시도와 변화가 있는 해예요. 직장을 옮기거나 새 프로젝트를 시작하기 좋습니다.",
            "astro": "천왕성이 변화의 바람을 불어옵니다",
        },
        "편재": {
            "title": f"{year}년: 기회의 해",
            "saju": "뜻밖의 수입이나 투자 기회가 있는 해예요. 사업 확장도 고려해볼 만합니다.",
            "astro": "금성이 재물운을 활성화합니다",
        },
        "정재": {
            "title": f"{year}년: 안정의 해",
            "saju": "꾸준한 노력이 결실을 맺는 해예요. 저축, 부동산, 안정적 수입 증가가 기대됩니다.",
            "astro": "토성이 재정 기반을 강화합니다",
        },
        "편관": {
            "title": f"{year}년: 도전의 해",
            "saju": "어려움이 있지만 극복하면 크게 성장하는 해예요. 자기 단련의 시간입니다.",
            "astro": "명왕성이 변혁을 요구합니다",
        },
        "정관": {
            "title": f"{year}년: 성취의 해",
            "saju": "승진, 합격, 인정을 받는 해예요. 사회적 지위가 올라갑니다.",
            "astro": "태양이 성공을 비춰줍니다",
        },
        "편인": {
            "title": f"{year}년: 학습의 해",
            "saju": "새로운 것을 배우고 성장하는 해예요. 자격증, 공부, 자기계발에 좋습니다.",
            "astro": "해왕성이 영감을 불어넣습니다",
        },
        "정인": {
            "title": f"{year}년: 행운의 해",
            "saju": "귀인의 도움이 있는 해예요. 좋은 사람을 만나고 지원을 받습니다.",
            "astro": "목성이 행운을 선사합니다",
        },
        "비견": {
            "title": f"{year}년: 협력의 해",
            "saju": "함께 일하고 경쟁하는 해예요. 파트너십과 네트워킹이 중요합니다.",
            "astro": "화성이 협업 에너지를 높입니다",
        },
        "겁재": {
            "title": f"{year}년: 모험의 해",
            "saju": "큰 결정을 내릴 수 있는 해예요. 다만 신중함도 필요합니다.",
            "astro": "화성이 대담한 행동을 촉구합니다",
        },
    }

    data = sibsin_year.get(cheon, {
        "title": f"{year}년",
        "saju": "변화의 기운이 흐르는 해입니다",
        "astro": "트랜짓 행성들의 영향이 있습니다",
    })

    title = data["title"]
    if is_current:
        title = f"⭐ {title} (올해)"

    return {
        "title": title,
        "saju": data["saju"],
        "astro": data["astro"],
    }


def get_yearly_transit_info(year: int, astro: Dict[str, Any] = None) -> str:
    """Get yearly transit info for astroReason based on major planetary transits.

    Args:
        year: The year
        astro: Astrology data (optional)

    Returns:
        Transit description string
    """
    # Major planetary transits for 2024-2030
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
        sign_ko = {
            "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리",
            "Cancer": "게자리", "Leo": "사자자리", "Virgo": "처녀자리",
            "Libra": "천칭자리", "Scorpio": "전갈자리", "Sagittarius": "사수자리",
            "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
        }
        sign_name = sign_ko.get(sun_sign, sun_sign)
        return f"{base_transit} | 태양 {sign_name} 영향"

    return base_transit


def get_period_advice(element: str, ten_god: str) -> str:
    """Generate advice based on element and ten god.

    Args:
        element: Element name
        ten_god: Ten god name

    Returns:
        Advice string
    """
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
