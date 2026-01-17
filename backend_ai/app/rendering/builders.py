# backend_ai/app/rendering/builders.py
"""
Rendering Analysis Builders
===========================
카테고리별 분석 텍스트를 빌드하는 함수들
"""

from typing import Dict, Any, List
from .extractors import hanja_to_korean, get_element_trait


# 별자리 한글화 매핑
SIGN_KO = {
    "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리",
    "Cancer": "게자리", "Leo": "사자자리", "Virgo": "처녀자리",
    "Libra": "천칭자리", "Scorpio": "전갈자리", "Sagittarius": "사수자리",
    "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
}

# MC별 커리어 적성
MC_CAREERS = {
    "Aries": "리더십, 스포츠, 군/경찰, 스타트업 창업",
    "Taurus": "금융, 부동산, 예술, 요리/식품업",
    "Gemini": "미디어, 마케팅, 교육, 커뮤니케이션",
    "Cancer": "의료, 복지, 요식업, 부동산",
    "Leo": "엔터테인먼트, 경영, 패션, 정치",
    "Virgo": "의료, IT, 편집, 품질관리",
    "Libra": "법률, 외교, 디자인, 예술",
    "Scorpio": "심리학, 수사, 금융, 연구",
    "Sagittarius": "교육, 여행, 출판, 무역",
    "Capricorn": "경영, 정치, 건축, 관리직",
    "Aquarius": "IT, 과학, 사회운동, 방송",
    "Pisces": "예술, 의료, 영성, 사회복지"
}

# 금성 별자리별 사랑 스타일
VENUS_LOVE = {
    "Aries": "열정적이고 직접적인 사랑 표현",
    "Taurus": "안정적이고 감각적인 사랑",
    "Gemini": "지적 교감과 대화가 중요",
    "Cancer": "헌신적이고 가정적인 사랑",
    "Leo": "드라마틱하고 관대한 사랑",
    "Virgo": "세심하고 실용적인 사랑 표현",
    "Libra": "로맨틱하고 조화로운 관계 추구",
    "Scorpio": "깊고 강렬한 사랑",
    "Sagittarius": "자유롭고 모험적인 사랑",
    "Capricorn": "진지하고 책임감 있는 사랑",
    "Aquarius": "독특하고 우정 같은 사랑",
    "Pisces": "낭만적이고 희생적인 사랑"
}

# 상승궁별 건강 주의점
ASC_HEALTH = {
    "Aries": "두통, 안면부, 급성 질환 주의",
    "Taurus": "목, 갑상선, 과식 주의",
    "Gemini": "호흡기, 신경계, 손 주의",
    "Cancer": "위장, 유방, 감정적 과식 주의",
    "Leo": "심장, 등, 혈압 관리",
    "Virgo": "소화기, 장, 스트레스성 질환",
    "Libra": "신장, 허리, 균형 유지",
    "Scorpio": "생식기, 배설계, 과로 주의",
    "Sagittarius": "간, 허벅지, 과음 주의",
    "Capricorn": "뼈, 관절, 피부 관리",
    "Aquarius": "순환계, 발목, 불규칙한 생활 주의",
    "Pisces": "발, 면역계, 수면 관리"
}

# POF 하우스별 재물 의미
POF_MEANINGS = {
    1: "자신의 노력으로 직접 부를 창출",
    2: "안정적인 수입과 저축 능력",
    3: "소통, 글쓰기, 교육을 통한 수입",
    4: "부동산, 가업, 상속 가능성",
    5: "창의력, 투기, 연예 관련 수입",
    6: "서비스업, 건강 관련 직종에서 수입",
    7: "파트너십, 결혼, 계약을 통한 부",
    8: "투자, 상속, 보험 관련 이득",
    9: "해외, 교육, 출판 관련 수입",
    10: "커리어 성공을 통한 고수입",
    11: "네트워크, 단체활동을 통한 이득",
    12: "비밀스러운 수입원, 영적 직업"
}

# 오행별 건강 주의점
ELEMENT_HEALTH = {
    "목": ("간, 담낭, 눈", "스트레스 관리와 충분한 수면이 중요해요"),
    "화": ("심장, 혈관, 소장", "과로를 피하고 심장 건강에 신경 쓰세요"),
    "토": ("위장, 비장, 소화기", "규칙적인 식사와 소화기 관리가 핵심이에요"),
    "금": ("폐, 대장, 피부", "호흡기 건강과 피부 관리에 주의하세요"),
    "수": ("신장, 방광, 생식기", "수분 섭취와 하체 운동이 도움됩니다"),
}


def build_saju_analysis(category: str, saju_data: dict, saju_meta: dict) -> str:
    """Build detailed saju analysis text for a category.

    Args:
        category: Category name (career, wealth, love, health)
        saju_data: Saju signals data for the category
        saju_meta: Saju meta information

    Returns:
        Analysis text string
    """
    parts = []

    # 일간 정보
    day_master = saju_meta.get("day_master", "")
    dm_element = saju_meta.get("day_master_element", "")

    dm_ko = hanja_to_korean(day_master)
    trait = get_element_trait(dm_element)

    if category == "career":
        if saju_data.get("has_officer_sibsin"):
            parts.append(f"{trait} 성향으로 조직에서 인정받기 좋습니다.")
            parts.append("관리직, 공무원, 대기업처럼 체계적인 조직이 잘 맞아요.")
            parts.append("직급과 타이틀이 중요하다면 꾸준히 커리어를 쌓아보세요.")
        else:
            parts.append(f"{trait} 성향이라 자율성이 높은 환경에서 빛납니다.")
            parts.append("스타트업, 프리랜서, 창업 등 유연한 환경이 더 맞을 수 있어요.")
            parts.append("본인만의 전문성을 키워 나만의 무기를 만드세요.")

    elif category == "wealth":
        if saju_data.get("has_wealth_sibsin"):
            parts.append(f"{trait} 성향으로 재물 감각이 뛰어납니다.")
            parts.append("투자나 사업에서 기회를 잘 포착하는 타입이에요.")
            parts.append("다만 과욕은 금물, 리스크 관리도 함께 하세요.")
        else:
            parts.append(f"{trait} 성향으로 전문성을 통해 수입을 만듭니다.")
            parts.append("꾸준한 실력 쌓기가 장기적 재정 안정의 열쇠예요.")
            parts.append("급하게 벌려고 하지 말고, 본업에 집중하세요.")

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        if sinsal_count > 0:
            parts.append(f"{trait} 매력으로 이성에게 관심을 끌기 좋아요.")
            parts.append("만남의 기회가 많은 편이니 좋은 인연을 신중히 선택하세요.")
            parts.append("외모보다 내면을 보는 안목이 중요해요.")
        else:
            parts.append(f"{trait} 성향으로 진지하고 깊은 관계를 추구합니다.")
            parts.append("첫인상보다 시간이 지나면서 매력이 드러나는 타입이에요.")
            parts.append("서두르지 말고 천천히 알아가세요.")

    elif category == "health":
        el_key = dm_element if dm_element in ELEMENT_HEALTH else "토"
        organs, advice = ELEMENT_HEALTH.get(el_key, ("전반적인 건강", "균형 잡힌 생활이 중요해요"))
        parts.append(f"{trait} 체질이라 {organs} 쪽을 신경 쓰세요.")
        parts.append(advice)

    return " ".join(parts) if parts else "개인 맞춤 분석을 위해 더 많은 정보가 필요합니다."


def build_astro_analysis(category: str, astro_data: dict, astro_meta: dict) -> str:
    """Build detailed astro analysis text for a category.

    Args:
        category: Category name (career, wealth, love, health)
        astro_data: Astrology signals data for the category
        astro_meta: Astrology meta information

    Returns:
        Analysis text string
    """
    parts = []

    if category == "career":
        mc_sign = astro_data.get("mc_sign", "")
        if mc_sign:
            careers = MC_CAREERS.get(mc_sign, "다양한 분야")
            parts.append(f"{SIGN_KO.get(mc_sign, mc_sign)} 성향 - {careers} 분야에 적성이 있어요.")
        planets = astro_data.get("planets_in_career_houses", [])
        if planets:
            planet_ko = {
                "Jupiter": "목성(확장)", "Saturn": "토성(책임)",
                "Mars": "화성(추진력)", "Sun": "태양(리더십)"
            }
            planet_names = [
                planet_ko.get(str(p[0]) if isinstance(p, tuple) else str(p), str(p))
                for p in planets[:2]
            ]
            parts.append(f"커리어 영역에 {', '.join(planet_names)}이 있어 성장 가능성이 높아요.")
        if not mc_sign and not planets:
            parts.append("꾸준한 노력과 네트워킹이 성공의 열쇠입니다.")

    elif category == "wealth":
        pof_house = astro_data.get("pof_house", 0)
        if pof_house:
            meaning = POF_MEANINGS.get(pof_house, "다양한 경로로 부를 축적")
            parts.append(f"행운 포인트 - {meaning}이 유리해요.")
        benefics = astro_data.get("benefics_in_money_houses", [])
        if benefics:
            parts.append("행운의 별이 있어 금전운이 좋은 편이에요.")
        if not pof_house and not benefics:
            parts.append("장기 투자와 꾸준한 저축이 부의 축적에 유리합니다.")

    elif category == "love":
        venus_sign = astro_meta.get("venus_sign", "")
        if venus_sign:
            style = VENUS_LOVE.get(venus_sign, "독특한 방식의 사랑")
            parts.append(f"금성 {SIGN_KO.get(venus_sign, venus_sign)} - {style}을 원해요.")
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if planets:
            parts.append("관계 영역에 주요 행성이 있어 연애 기회가 많은 편이에요.")
        if not venus_sign and not planets:
            parts.append("진심 어린 소통이 좋은 인연을 만드는 열쇠입니다.")

    elif category == "health":
        asc_sign = astro_meta.get("asc_sign", "")
        if asc_sign:
            health_note = ASC_HEALTH.get(asc_sign, "전반적인 건강 관리")
            parts.append(f"상승궁 {SIGN_KO.get(asc_sign, asc_sign)} - {health_note}가 필요해요.")
        malefics = astro_data.get("malefics_in_health_houses", [])
        if malefics:
            parts.append("건강 영역에 긴장성 행성이 있으니 예방 관리가 중요합니다.")
        if not asc_sign:
            parts.append("규칙적인 생활과 적당한 운동이 건강 유지의 핵심이에요.")

    return " ".join(parts) if parts else "개인 맞춤 분석을 위해 더 많은 정보가 필요합니다."


def build_cross_insight(category: str, saju_data: dict, astro_data: dict) -> str:
    """Build combined cross-system insight.

    Args:
        category: Category name
        saju_data: Saju signals data
        astro_data: Astrology signals data

    Returns:
        Cross insight text string
    """
    if category == "career":
        has_officer = saju_data.get("has_officer_sibsin", False)
        mc_sign = astro_data.get("mc_sign", "")
        if has_officer and mc_sign:
            return "조직 적성이 보여요. 체계적인 조직에서 승진 가능성이 높습니다. 직급과 명예를 중시하는 분위기가 맞아요."
        elif has_officer:
            return "조직 적성이 보여요. 안정적인 회사에서 경력을 쌓는 게 유리합니다. 꾸준함이 당신의 무기예요."
        elif mc_sign:
            return "자신만의 길을 개척해보세요. 다양한 경험이 성장의 밑거름이 됩니다."
        return "자신의 강점을 살린 커리어 전략이 필요해요. 다양한 경험이 도움됩니다. 남들과 다른 나만의 무기를 만드세요."

    elif category == "wealth":
        has_wealth = saju_data.get("has_wealth_sibsin", False)
        pof = astro_data.get("pof_house", 0)
        if has_wealth and pof:
            return "재물 감각이 있고, 금전운이 좋아요. 적극적인 투자도 괜찮지만 분산투자를 권합니다."
        elif has_wealth:
            return "재물 감각이 있어요. 기회가 왔을 때 과감히 잡되, 리스크 관리도 함께하세요. 한방보다는 꾸준한 축적이 낫습니다."
        elif pof:
            return "수입 창출에 집중하면 재정 안정이 빨라져요. 본업에 충실하면서 부수입도 고민해보세요."
        return "꾸준한 저축과 실력 쌓기가 장기적 부의 기반입니다. 급하게 벌려 하지 말고 착실하게 모아가세요."

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if sinsal_count > 0 and planets:
            return "만남의 기회도 많고 매력도 있어요. 좋은 인연을 신중히 선택하는 게 관건입니다. 첫인상보다 내면을 보세요."
        elif sinsal_count > 0:
            return "인연이 많은 편이에요. 진정성 있는 관계에 집중하면 좋은 결과가 있어요. 조급하지 않게 천천히 알아가세요."
        elif planets:
            return "연애 에너지가 활발해요. 자신을 솔직히 표현하면 좋은 만남이 와요. 자연스러운 게 가장 좋아요."
        return "시간을 두고 깊이 알아가는 관계가 오래갑니다. 서두르지 마세요. 인연은 준비된 사람에게 옵니다."

    elif category == "health":
        weak_elements = [
            k for k, v in (saju_data.get("five_element_flags", {}) or {}).items()
            if v == "weak"
        ]
        malefics = astro_data.get("malefics_in_health_houses", [])
        if weak_elements and malefics:
            return "건강 관리에 주의가 필요해요. 정기 검진을 권합니다. 예방이 최선의 치료예요."
        elif weak_elements:
            return "체질에 맞는 건강 관리를 해주세요. 예방이 중요합니다. 정기 건강검진을 추천해요."
        elif malefics:
            return "스트레스 관리와 규칙적인 생활이 건강 유지의 핵심이에요. 과로하지 말고 충분히 쉬세요."
        return "전반적으로 양호하지만, 과로를 피하고 균형 잡힌 생활을 유지하세요. 건강할 때 건강을 챙기세요."

    return "동양과 서양의 지혜를 종합해 나에게 맞는 방향을 찾아보세요. 운명은 정해진 것이 아니라 만들어가는 것입니다."


def get_category_analysis(
    signals: Dict[str, Any],
    theme_cross: Dict[str, Any],
    locale: str = "ko"
) -> Dict[str, Dict[str, Any]]:
    """Build category analysis from signals.

    Returns format matching Display.tsx CategoryAnalysis interface:
    - icon: string (emoji)
    - title: string
    - sajuAnalysis: string (detailed saju analysis)
    - astroAnalysis: string (detailed astro analysis)
    - crossInsight: string (combined insight)

    Args:
        signals: Signal data dictionary
        theme_cross: Theme cross data
        locale: Locale (ko/en)

    Returns:
        Dictionary of category analyses
    """
    categories = {}

    # Map signal keys to display categories with emoji icons
    category_map = {
        "career": {"ko": "커리어", "en": "Career", "icon": "💼"},
        "wealth": {"ko": "재물", "en": "Wealth", "icon": "💰"},
        "love": {"ko": "연애", "en": "Love", "icon": "❤️"},
        "health": {"ko": "건강", "en": "Health", "icon": "🏃"},
    }

    saju_signals = (signals or {}).get("saju", {})
    astro_signals = (signals or {}).get("astro", {})
    astro_meta = astro_signals.get("meta", {})
    saju_meta = saju_signals.get("meta", {})

    for key, meta in category_map.items():
        saju_data = saju_signals.get(key, {})
        astro_data = astro_signals.get(key, {})

        # Build analysis texts
        saju_analysis = build_saju_analysis(key, saju_data, saju_meta)
        astro_analysis = build_astro_analysis(key, astro_data, astro_meta)
        cross_insight = build_cross_insight(key, saju_data, astro_data)

        categories[key] = {
            "icon": meta["icon"],
            "title": meta["ko"] if locale == "ko" else meta["en"],
            "sajuAnalysis": saju_analysis,
            "astroAnalysis": astro_analysis,
            "crossInsight": cross_insight,
        }

    return categories


def get_category_keywords(category: str, saju_data: dict, astro_data: dict) -> List[str]:
    """Generate relevant keywords for the category.

    Args:
        category: Category name
        saju_data: Saju signals data
        astro_data: Astrology signals data

    Returns:
        List of keyword strings
    """
    base_keywords = {
        "career": ["승진", "이직", "적성", "리더십"],
        "wealth": ["재물", "투자", "저축", "수입"],
        "love": ["인연", "소통", "매력", "관계"],
        "health": ["활력", "균형", "휴식", "운동"],
    }
    return base_keywords.get(category, [])
