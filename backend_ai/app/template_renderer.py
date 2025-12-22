"""
Lightweight template renderer for destiny-map (no LLM).
Outputs structured JSON that matches Display.tsx expectations.

Display.tsx expects these interfaces:
- ImportantYear: { year: number, age: number, rating: 1-5, title: string, sajuReason: string, astroReason: string }
- CategoryAnalysis: { icon: string, title: string, sajuAnalysis: string, astroAnalysis: string, crossInsight: string }
- KeyInsight: { type: "strength"|"opportunity"|"caution"|"advice", text: string, icon?: string }
"""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


def _get_important_years(unse: Dict[str, Any], saju: Dict[str, Any], astro: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Extract important years from saju unse data + astro transits.

    Returns format matching Display.tsx ImportantYear interface:
    - year: number (individual year)
    - age: number
    - rating: 1-5
    - title: string
    - sajuReason: string
    - astroReason: string
    """
    years = []
    current_year = datetime.now().year

    # Get birth year for age calculation - try multiple sources
    birth_year = None

    # 1. Try facts.birthDate first (most reliable - comes from frontend input)
    facts = (saju or {}).get("facts", {})
    birth_date = facts.get("birthDate") or facts.get("birth_date") or facts.get("dateOfBirth") or ""
    if birth_date and isinstance(birth_date, str) and len(birth_date) >= 4:
        try:
            # Handle formats: "1990-01-01", "1990/01/01", "19900101"
            birth_year = int(birth_date[:4])
        except:
            pass

    # 2. Try unse.annual[0].year to infer current age
    if not birth_year:
        annual = (unse or {}).get("annual") or []
        if annual and len(annual) > 0:
            first_annual = annual[0]
            annual_year = first_annual.get("year")
            age = first_annual.get("age")
            if annual_year and age:
                try:
                    birth_year = int(annual_year) - int(age)
                except:
                    pass

    # 3. Try daeun start year and age
    if not birth_year:
        daeun = (unse or {}).get("daeun") or []
        if daeun and len(daeun) > 0:
            first_daeun = daeun[0]
            start_year = first_daeun.get("startYear") or first_daeun.get("start_year")
            age = first_daeun.get("age") or first_daeun.get("startAge")
            if start_year and age:
                try:
                    birth_year = int(start_year) - int(age)
                except:
                    pass

    # 4. Default fallback - estimate from current year
    if not birth_year:
        birth_year = current_year - 30  # Default to ~30 years old

    # Daeun (대운) - major luck periods - convert to individual notable years
    # Data structure: { age, heavenlyStem, earthlyBranch, sibsin: { cheon, ji } }
    daeun = (unse or {}).get("daeun") or []
    for idx, d in enumerate(daeun[:4]):
        # Get age from daeun data (actual field name)
        age = d.get("age")
        if age is None:
            continue

        # Convert age to year
        year_num = birth_year + int(age) if birth_year else current_year + (idx * 10)

        # Get heavenly stem (천간) and earthly branch (지지)
        stem = d.get("heavenlyStem") or d.get("heavenly_stem") or ""
        branch = d.get("earthlyBranch") or d.get("earthly_branch") or ""
        ganji = f"{stem}{branch}"

        # Get sibsin (십신) for rating
        sibsin = d.get("sibsin") or {}
        cheon_sibsin = sibsin.get("cheon") or ""
        ji_sibsin = sibsin.get("ji") or ""

        # Determine element from stem name
        element = _get_element_from_stem(stem)

        # Calculate rating based on sibsin
        rating = _calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        # Check if this daeun period includes current age
        user_age = current_year - birth_year if birth_year else 30
        is_current = age <= user_age < age + 10

        # Get astro transit info for the daeun start year
        astro_meaning = _get_daeun_meaning(element, cheon_sibsin)
        if astro:
            transit_info = _get_yearly_transit_info(year_num, astro)
            astro_meaning = f"{astro_meaning} | {transit_info.split(' - ')[0]}"

        years.append({
            "year": year_num,
            "age": int(age),
            "rating": rating,
            "title": f"{ganji} 대운 {'(현재)' if is_current else ''}".strip(),
            "sajuReason": f"{ganji} 대운 ({element}) - {cheon_sibsin or '천간'}/{ji_sibsin or '지지'} 영향",
            "astroReason": astro_meaning,
            "advice": _get_period_advice(element, cheon_sibsin)
        })

    # Annual fortune (세운) - upcoming years
    # Data structure: { year, heavenlyStem, earthlyBranch, sibsin: { cheon, ji } }
    annual = (unse or {}).get("annual") or []
    for a in annual[:3]:
        year = a.get("year")
        if not year:
            continue

        year_num = int(year) if isinstance(year, str) else year
        age = year_num - birth_year if birth_year else current_year - 1990

        # Get heavenly stem and earthly branch
        stem = a.get("heavenlyStem") or a.get("heavenly_stem") or ""
        branch = a.get("earthlyBranch") or a.get("earthly_branch") or ""
        ganji = f"{stem}{branch}"

        # Get sibsin for rating
        sibsin = a.get("sibsin") or {}
        cheon_sibsin = sibsin.get("cheon") or ""
        ji_sibsin = sibsin.get("ji") or ""

        element = _get_element_from_stem(stem)
        rating = _calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        is_current = year_num == current_year

        # Get astro transit info for this year
        astro_reason = _get_yearly_transit_info(year_num, astro)

        years.append({
            "year": year_num,
            "age": age,
            "rating": rating,
            "title": f"{year_num}년 {ganji} {'(올해)' if is_current else ''}".strip(),
            "sajuReason": f"{ganji} 세운 - {cheon_sibsin or '천간'}/{ji_sibsin or '지지'}",
            "astroReason": astro_reason,
        })

    # If no years found from daeun/annual, generate default important years
    if not years and birth_year:
        # Generate key life milestone years
        milestones = [
            (30, "삼십대 시작", "인생의 전환점", 4),
            (40, "사십대 시작", "성숙과 안정기", 4),
            (50, "오십대 시작", "지혜의 시기", 4),
            (60, "육십갑자 회귀", "새로운 시작", 5),
        ]
        for age, title, reason, rating in milestones:
            target_year = birth_year + age
            if current_year - 5 <= target_year <= current_year + 20:
                years.append({
                    "year": target_year,
                    "age": age,
                    "rating": rating,
                    "title": title,
                    "sajuReason": reason,
                    "astroReason": "주요 생애 주기",
                })

        # Add current year and next year if still empty
        if not years:
            years.append({
                "year": current_year,
                "age": current_year - birth_year,
                "rating": 3,
                "title": f"{current_year}년",
                "sajuReason": "현재 연도",
                "astroReason": "현재 트랜짓 영향",
            })
            years.append({
                "year": current_year + 1,
                "age": current_year + 1 - birth_year,
                "rating": 3,
                "title": f"{current_year + 1}년",
                "sajuReason": "다가오는 연도",
                "astroReason": "예상 트랜짓 영향",
            })

    # Sort by year and return top entries
    years.sort(key=lambda x: x["year"])
    return years[:5]


def _calculate_rating(element: str, ten_god: str) -> int:
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


def _calculate_rating_from_sibsin(cheon: str, ji: str) -> int:
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


def _get_element_from_stem(stem: str) -> str:
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


def _get_daeun_meaning(element: str, sibsin: str) -> str:
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


def _get_element_meaning(element: str) -> str:
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


def _get_yearly_transit_info(year: int, astro: Dict[str, Any] = None) -> str:
    """Get yearly transit info for astroReason based on major planetary transits."""
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
        sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리",
                   "Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리",
                   "Sagittarius":"사수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
        sign_name = sign_ko.get(sun_sign, sun_sign)
        return f"{base_transit} | 태양 {sign_name} 영향"

    return base_transit


def _get_period_advice(element: str, ten_god: str) -> str:
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


def _get_category_analysis(signals: Dict[str, Any], theme_cross: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Build category analysis from signals.

    Returns format matching Display.tsx CategoryAnalysis interface:
    - icon: string (emoji)
    - title: string
    - sajuAnalysis: string (detailed saju analysis)
    - astroAnalysis: string (detailed astro analysis)
    - crossInsight: string (combined insight)
    - keywords?: string[]
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

        # Build saju analysis text
        saju_analysis = _build_saju_analysis(key, saju_data, saju_meta)

        # Build astro analysis text
        astro_analysis = _build_astro_analysis(key, astro_data, astro_meta)

        # Build cross insight
        cross_insight = _build_cross_insight(key, saju_data, astro_data)

        # Build keywords
        keywords = _get_category_keywords(key, saju_data, astro_data)

        categories[key] = {
            "icon": meta["icon"],
            "title": meta["ko"],
            "sajuAnalysis": saju_analysis,
            "astroAnalysis": astro_analysis,
            "crossInsight": cross_insight,
            "keywords": keywords,
        }

    return categories


def _build_saju_analysis(category: str, saju_data: dict, saju_meta: dict) -> str:
    """Build detailed saju analysis text for a category - 한자 없이 구체적으로."""
    parts = []

    # 일간 정보 (한자 제거, 한글로만)
    day_master = saju_meta.get("day_master", "")
    dm_element = saju_meta.get("day_master_element", "")

    # 한자를 한글로 변환
    hanja_to_ko = {
        "甲": "갑목", "乙": "을목", "丙": "병화", "丁": "정화",
        "戊": "무토", "己": "기토", "庚": "경금", "辛": "신금",
        "壬": "임수", "癸": "계수"
    }
    dm_ko = hanja_to_ko.get(day_master, day_master)

    # 오행별 성향
    element_traits = {
        "목": "창의적이고 성장 지향적인",
        "화": "열정적이고 표현력이 뛰어난",
        "토": "안정적이고 신뢰감 있는",
        "금": "결단력 있고 원칙적인",
        "수": "유연하고 지혜로운",
        "wood": "창의적이고 성장 지향적인",
        "fire": "열정적이고 표현력이 뛰어난",
        "earth": "안정적이고 신뢰감 있는",
        "metal": "결단력 있고 원칙적인",
        "water": "유연하고 지혜로운",
    }
    trait = element_traits.get(dm_element, "균형 잡힌")

    if category == "career":
        if saju_data.get("has_officer_sibsin"):
            parts.append(f"{trait} 성향으로 조직에서 인정받기 좋습니다.")
            parts.append("관리직, 공무원, 대기업처럼 체계적인 조직이 잘 맞아요.")
        else:
            parts.append(f"{trait} 성향이라 자율성이 높은 환경에서 빛납니다.")
            parts.append("스타트업, 프리랜서, 창업 등 유연한 환경이 더 맞을 수 있어요.")

    elif category == "wealth":
        if saju_data.get("has_wealth_sibsin"):
            parts.append(f"{trait} 성향으로 재물 감각이 뛰어납니다.")
            parts.append("투자나 사업에서 기회를 잘 포착하는 타입이에요.")
        else:
            parts.append(f"{trait} 성향으로 전문성을 통해 수입을 만듭니다.")
            parts.append("꾸준한 실력 쌓기가 장기적 재정 안정의 열쇠예요.")

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        if sinsal_count > 0:
            parts.append(f"{trait} 매력으로 이성에게 관심을 끌기 좋아요.")
            parts.append("만남의 기회가 많은 편이니 좋은 인연을 신중히 선택하세요.")
        else:
            parts.append(f"{trait} 성향으로 진지하고 깊은 관계를 추구합니다.")
            parts.append("첫인상보다 시간이 지나면서 매력이 드러나는 타입이에요.")

    elif category == "health":
        # 오행별 주의 기관
        element_health = {
            "목": ("간, 담낭, 눈", "스트레스 관리와 충분한 수면이 중요해요"),
            "화": ("심장, 혈관, 소장", "과로를 피하고 심장 건강에 신경 쓰세요"),
            "토": ("위장, 비장, 소화기", "규칙적인 식사와 소화기 관리가 핵심이에요"),
            "금": ("폐, 대장, 피부", "호흡기 건강과 피부 관리에 주의하세요"),
            "수": ("신장, 방광, 생식기", "수분 섭취와 하체 운동이 도움됩니다"),
        }
        el_key = dm_element if dm_element in element_health else "토"
        organs, advice = element_health.get(el_key, ("전반적인 건강", "균형 잡힌 생활이 중요해요"))
        parts.append(f"{trait} 체질이라 {organs} 쪽을 신경 쓰세요.")
        parts.append(advice)

    return " ".join(parts) if parts else "개인 맞춤 분석을 위해 더 많은 정보가 필요합니다."


def _build_astro_analysis(category: str, astro_data: dict, astro_meta: dict) -> str:
    """Build detailed astro analysis text for a category - 구체적인 행성/별자리 정보 포함."""
    parts = []

    # 별자리 한글화
    sign_ko = {
        "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리", "Cancer": "게자리",
        "Leo": "사자자리", "Virgo": "처녀자리", "Libra": "천칭자리", "Scorpio": "전갈자리",
        "Sagittarius": "사수자리", "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
    }

    # MC별 커리어 적성
    mc_careers = {
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

    if category == "career":
        mc_sign = astro_data.get("mc_sign", "")
        if mc_sign:
            careers = mc_careers.get(mc_sign, "다양한 분야")
            parts.append(f"MC {sign_ko.get(mc_sign, mc_sign)} - {careers} 분야에 적성이 있어요.")
        planets = astro_data.get("planets_in_career_houses", [])
        if planets:
            planet_ko = {"Jupiter": "목성(확장)", "Saturn": "토성(책임)", "Mars": "화성(추진력)", "Sun": "태양(리더십)"}
            planet_names = [planet_ko.get(str(p[0]) if isinstance(p, tuple) else str(p), str(p)) for p in planets[:2]]
            parts.append(f"커리어 영역에 {', '.join(planet_names)}이 있어 성장 가능성이 높아요.")
        if not mc_sign and not planets:
            parts.append("꾸준한 노력과 네트워킹이 성공의 열쇠입니다.")

    elif category == "wealth":
        pof_house = astro_data.get("pof_house", 0)
        pof_meanings = {
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
        if pof_house:
            meaning = pof_meanings.get(pof_house, "다양한 경로로 부를 축적")
            parts.append(f"행운 포인트가 {pof_house}하우스 - {meaning}이 유리해요.")
        benefics = astro_data.get("benefics_in_money_houses", [])
        if benefics:
            parts.append("재물 하우스에 행운의 별이 있어 금전운이 좋은 편이에요.")
        if not pof_house and not benefics:
            parts.append("장기 투자와 꾸준한 저축이 부의 축적에 유리합니다.")

    elif category == "love":
        venus_sign = astro_meta.get("venus_sign", "")
        mars_sign = astro_meta.get("mars_sign", "")

        venus_love = {
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
        if venus_sign:
            style = venus_love.get(venus_sign, "독특한 방식의 사랑")
            parts.append(f"금성 {sign_ko.get(venus_sign, venus_sign)} - {style}을 원해요.")
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if planets:
            parts.append("관계 영역에 주요 행성이 있어 연애 기회가 많은 편이에요.")
        if not venus_sign and not planets:
            parts.append("진심 어린 소통이 좋은 인연을 만드는 열쇠입니다.")

    elif category == "health":
        asc_sign = astro_meta.get("asc_sign", "")

        # 상승궁별 건강 주의점
        asc_health = {
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
        if asc_sign:
            health_note = asc_health.get(asc_sign, "전반적인 건강 관리")
            parts.append(f"상승궁 {sign_ko.get(asc_sign, asc_sign)} - {health_note}가 필요해요.")
        malefics = astro_data.get("malefics_in_health_houses", [])
        if malefics:
            parts.append("건강 영역에 긴장성 행성이 있으니 예방 관리가 중요합니다.")
        if not asc_sign:
            parts.append("규칙적인 생활과 적당한 운동이 건강 유지의 핵심이에요.")

    return " ".join(parts) if parts else "개인 맞춤 점성 분석을 위해 더 많은 정보가 필요합니다."


def _build_cross_insight(category: str, saju_data: dict, astro_data: dict) -> str:
    """Build combined cross-system insight - 구체적인 조언으로."""
    if category == "career":
        has_officer = saju_data.get("has_officer_sibsin", False)
        mc_sign = astro_data.get("mc_sign", "")
        if has_officer and mc_sign:
            return f"사주에서 조직 적성이 보이고, MC {mc_sign}이 이를 뒷받침해요. 체계적인 조직에서 승진 가능성이 높습니다."
        elif has_officer:
            return "사주에서 조직 적성이 보여요. 안정적인 회사에서 경력을 쌓는 게 유리합니다."
        elif mc_sign:
            return f"MC {mc_sign}에 맞는 분야를 탐색하면서 자신만의 길을 개척해보세요."
        return "자신의 강점을 살린 커리어 전략이 필요해요. 다양한 경험이 도움됩니다."

    elif category == "wealth":
        has_wealth = saju_data.get("has_wealth_sibsin", False)
        pof = astro_data.get("pof_house", 0)
        if has_wealth and pof:
            return f"재물 감각이 있고, {pof}하우스 행운 포인트가 있어 금전운이 좋아요. 적극적인 투자도 괜찮습니다."
        elif has_wealth:
            return "재물 감각이 있어요. 기회가 왔을 때 과감히 잡되, 리스크 관리도 함께하세요."
        elif pof:
            return f"{pof}하우스 방향의 수입 창출에 집중하면 재정 안정이 빨라져요."
        return "꾸준한 저축과 실력 쌓기가 장기적 부의 기반입니다."

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if sinsal_count > 0 and planets:
            return "만남의 기회도 많고 매력도 있어요. 좋은 인연을 신중히 선택하는 게 관건입니다."
        elif sinsal_count > 0:
            return "인연이 많은 편이에요. 진정성 있는 관계에 집중하면 좋은 결과가 있어요."
        elif planets:
            return "관계 영역이 활성화되어 있어요. 자신을 솔직히 표현하면 좋은 만남이 와요."
        return "시간을 두고 깊이 알아가는 관계가 오래갑니다. 서두르지 마세요."

    elif category == "health":
        weak_elements = [k for k, v in (saju_data.get("five_element_flags", {}) or {}).items() if v == "weak"]
        malefics = astro_data.get("malefics_in_health_houses", [])
        if weak_elements and malefics:
            return f"{', '.join(weak_elements)} 관련 기관과 점성 건강 영역 모두 주의가 필요해요. 정기 검진을 권합니다."
        elif weak_elements:
            return f"{', '.join(weak_elements)} 관련 장기를 평소에 잘 관리하세요. 예방이 중요합니다."
        elif malefics:
            return "스트레스 관리와 규칙적인 생활이 건강 유지의 핵심이에요."
        return "전반적으로 양호하지만, 과로를 피하고 균형 잡힌 생활을 유지하세요."

    return "사주와 점성을 종합해 나에게 맞는 방향을 찾아보세요."


def _get_category_keywords(category: str, saju_data: dict, astro_data: dict) -> List[str]:
    """Generate relevant keywords for the category."""
    base_keywords = {
        "career": ["승진", "이직", "적성", "리더십"],
        "wealth": ["재물", "투자", "저축", "수입"],
        "love": ["인연", "소통", "매력", "관계"],
        "health": ["활력", "균형", "휴식", "운동"],
    }
    return base_keywords.get(category, [])


def _get_key_insights(theme_cross: Dict[str, Any], signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract key insights from cross analysis.

    Returns format matching Display.tsx KeyInsight interface:
    - type: "strength" | "opportunity" | "caution" | "advice"
    - text: string
    - icon?: string
    """
    insights = []

    # Map sources to insight types
    source_to_type = {
        "saju": "strength",
        "astro": "opportunity",
        "cross": "advice",
    }

    highlights = (theme_cross or {}).get("highlights", [])
    for h in highlights[:4]:
        source = h.get("source", "")
        title = h.get("title", "")
        if title and title.strip():
            insights.append({
                "type": source_to_type.get(source, "advice"),
                "text": title,
                "icon": h.get("icon", "")
            })

    # Add cross summary insights from saju factors
    saju_factors = (theme_cross or {}).get("saju_factors", [])
    for sf in saju_factors[:2]:
        desc = sf.get("description", "")
        if desc and desc.strip():
            insights.append({
                "type": "strength",
                "text": desc,
                "icon": "☯️"
            })

    # Add cross summary insights from astro factors
    astro_factors = (theme_cross or {}).get("astro_factors", [])
    for af in astro_factors[:2]:
        desc = af.get("description", "")
        if desc and desc.strip():
            insights.append({
                "type": "opportunity",
                "text": desc,
                "icon": "✨"
            })

    # Add default insights if none found
    if not insights:
        saju_meta = (signals or {}).get("saju", {}).get("meta", {})
        astro_meta = (signals or {}).get("astro", {}).get("meta", {})

        day_master = saju_meta.get("day_master")
        if day_master:
            insights.append({
                "type": "strength",
                "text": f"일간 {day_master} - 당신의 핵심 에너지입니다",
                "icon": "☯️"
            })

        dom_element = astro_meta.get("dominant_element")
        if dom_element:
            insights.append({
                "type": "opportunity",
                "text": f"{dom_element} 원소가 강해 관련 분야에서 빛을 발합니다",
                "icon": "✨"
            })

        # Add generic advice
        insights.append({
            "type": "advice",
            "text": "사주와 점성술의 조화로운 해석으로 균형 잡힌 삶을 추구하세요",
            "icon": "💡"
        })

    return insights[:6]  # Limit to 6 insights


def _get_lucky_elements(signals: Dict[str, Any], saju: Dict[str, Any]) -> Dict[str, Any]:
    """Extract lucky elements from analysis."""
    meta = (signals or {}).get("astro", {}).get("meta", {})
    saju_meta = (signals or {}).get("saju", {}).get("meta", {})

    # Dominant element
    dominant = meta.get("dominant_element") or saju_meta.get("dominant_element") or "wood"

    # Element to color/direction/item mapping (Korean)
    element_map = {
        "wood": {
            "colors": ["초록색", "청색"],
            "directions": ["동쪽"],
            "numbers": [3, 8],
            "items": ["식물", "나무 소품", "녹색 액세서리"]
        },
        "fire": {
            "colors": ["빨간색", "보라색"],
            "directions": ["남쪽"],
            "numbers": [2, 7],
            "items": ["캔들", "붉은 소품", "조명"]
        },
        "earth": {
            "colors": ["노란색", "갈색"],
            "directions": ["중앙"],
            "numbers": [5, 10],
            "items": ["도자기", "크리스탈", "황토 제품"]
        },
        "metal": {
            "colors": ["흰색", "금색"],
            "directions": ["서쪽"],
            "numbers": [4, 9],
            "items": ["금속 액세서리", "은 제품", "시계"]
        },
        "water": {
            "colors": ["검정색", "남색"],
            "directions": ["북쪽"],
            "numbers": [1, 6],
            "items": ["수정", "분수", "파란색 소품"]
        },
        "air": {
            "colors": ["하늘색", "은색"],
            "directions": ["동쪽"],
            "numbers": [3, 7],
            "items": ["바람개비", "깃털 소품", "창가 장식"]
        },
    }

    lucky = element_map.get(dominant.lower() if dominant else "wood", element_map["wood"])

    return {
        "colors": lucky["colors"],
        "directions": lucky["directions"],
        "numbers": lucky["numbers"],
        "items": lucky["items"]
    }


def _get_saju_highlight(saju: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Get main saju highlight."""
    day_master = (saju or {}).get("dayMaster", {})
    if day_master:
        # Handle both flat { name, element } and nested { heavenlyStem: { name, element } }
        if isinstance(day_master, dict):
            if day_master.get("heavenlyStem"):
                hs = day_master.get("heavenlyStem", {})
                dm_name = hs.get("name", "") if isinstance(hs, dict) else hs
                dm_element = hs.get("element", "") if isinstance(hs, dict) else day_master.get("element", "")
            else:
                dm_name = day_master.get("name", "")
                dm_element = day_master.get("element", "")
        else:
            dm_name = str(day_master)
            dm_element = ""

        if dm_name:
            return {
                "pillar": dm_name,
                "element": dm_element,
                "meaning": f"일간 {dm_name}({dm_element}) - 당신의 본질적 성향"
            }
    return None


def _get_astro_highlight(astro: Dict[str, Any], signals: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Get main astro highlight."""
    planets = (astro or {}).get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), None)

    if sun:
        return {
            "planet": "Sun",
            "sign": sun.get("sign", ""),
            "meaning": f"태양 {sun.get('sign', '')} - 핵심 정체성과 삶의 목적"
        }
    return None


def _normalize_day_master(saju: Dict) -> tuple:
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


def _get_theme_sections(theme: str, saju: Dict, astro: Dict) -> List[Dict[str, Any]]:
    """Generate theme-specific sections for 9 themes."""
    day_master, day_el = _normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    mc = astro.get("mc", {})
    asc = astro.get("ascendant", {})
    sun_s, moon_s = sun.get("sign", ""), moon.get("sign", "")
    sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"궁수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
    el_ko = {"목":"목(木)","화":"화(火)","토":"토(土)","금":"금(金)","수":"수(水)"}
    now = datetime.now()
    dow = ["월","화","수","목","금","토","일"][now.weekday()]
    unse = saju.get("unse", {})
    daeun = unse.get("daeun", [])

    # Calculate user age from birthDate in facts
    user_age = 30  # default
    facts = saju.get("facts", {})
    birth_date = facts.get("birthDate") or ""
    if birth_date and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
            user_age = now.year - birth_year
        except:
            pass

    # Find current daeun by age (each daeun covers 10 years from its start age)
    cur_daeun = {}
    for d in daeun:
        d_age = d.get("age", 0)
        if d_age <= user_age < d_age + 10:
            cur_daeun = d
            break

    if theme == "fortune_today":
        return [
            {"id":"summary","icon":"☀️","title":"오늘 한줄요약","titleEn":"Summary","content":f"{dow}요일, {sign_ko.get(moon_s,moon_s)} 달. {day_master} 일주에게 활력 있는 하루."},
            {"id":"timing","icon":"⏰","title":"좋은 시간대","titleEn":"Best Times","content":"오전 9-11시, 오후 2-4시"},
            {"id":"action","icon":"🎯","title":"행동 가이드","titleEn":"Action","content":f"{el_ko.get(day_el,day_el)} 기운 활용"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】{sign_ko.get(sun_s,'')} 태양, {sign_ko.get(moon_s,'')} 달 조화"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"긍정적인 마음으로 시작하세요."}]
    elif theme == "fortune_monthly":
        return [
            {"id":"theme","icon":"🗓️","title":"월간 한줄테마","titleEn":"Theme","content":f"{now.month}월, 변화와 성장의 기회"},
            {"id":"weeks","icon":"📅","title":"핵심 주","titleEn":"Weeks","content":"**1주**: 준비 **2주**: 실행 **3주**: 조율 **4주**: 마무리"},
            {"id":"areas","icon":"🃏","title":"영역 카드","titleEn":"Areas","content":"💼커리어: 안정 💖연애: 소통 💰재물: 계획 💊건강: 규칙"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】{sign_ko.get(sun_s,'')} 태양이 이달 영향"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"목표를 명확히 하고 꾸준히 실행하세요."}]
    elif theme == "fortune_new_year":
        return [
            {"id":"theme","icon":"🎊","title":"새해 한줄테마","titleEn":"Theme","content":f"{now.year}년, 도전과 성장의 해"},
            {"id":"quarters","icon":"📊","title":"분기별 흐름","titleEn":"Quarters","content":"**1분기**: 계획 **2분기**: 추진 **3분기**: 조율 **4분기**: 결실"},
            {"id":"prep","icon":"🎯","title":"준비 사항","titleEn":"Prep","content":f"{el_ko.get(day_el,day_el)} 기운 보강"},
            {"id":"oppo","icon":"🌟","title":"기회 포인트","titleEn":"Opportunities","content":"새로운 시작에 유리"},
            {"id":"risk","icon":"⚠️","title":"리스크 관리","titleEn":"Risks","content":"과욕 경계, 건강 챙기기"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】태양 리턴이 올해 테마 결정"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"작은 습관부터 변화 시작"}]
    elif theme == "fortune_next_year":
        return [
            {"id":"theme","icon":"🌟","title":"연간 한줄테마","titleEn":"Theme","content":f"{now.year+1}년, 성장과 확장의 해"},
            {"id":"quarters","icon":"📊","title":"분기별 흐름","titleEn":"Quarters","content":"**1분기**: 시작 **2분기**: 성장 **3분기**: 안정 **4분기**: 결실"},
            {"id":"trans","icon":"🔄","title":"전환 포인트","titleEn":"Transition","content":"상반기 기초, 하반기 확장"},
            {"id":"focus","icon":"🎯","title":"영역 포커스","titleEn":"Focus","content":"자기계발, 재정, 인간관계, 건강"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":"【사주】대운과 【점성】트랜짓이 내년 테마 형성"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"내년 준비를 지금부터"}]
    elif theme == "focus_career":
        mc_s = mc.get("sign","")
        return [
            {"id":"summary","icon":"💼","title":"한줄요약","titleEn":"Summary","content":f"MC {sign_ko.get(mc_s,mc_s)}, 관련 분야 적성"},
            {"id":"timing","icon":"⏰","title":"타이밍","titleEn":"Timing","content":f"현재 대운: {cur_daeun.get('heavenlyStem','')}{cur_daeun.get('earthlyBranch','')}" if cur_daeun else "전략적 시기"},
            {"id":"action","icon":"🎯","title":"액션 플랜","titleEn":"Action","content":"전문성, 네트워킹, 자기계발"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】MC {sign_ko.get(mc_s,'')}가 방향 제시"},
            {"id":"focus","icon":"🔍","title":"포커스","titleEn":"Focus","content":"**단기**: 역량 **중기**: 전문성 **장기**: 목표"}]
    elif theme == "focus_love":
        v_s = venus.get("sign","")
        return [
            {"id":"summary","icon":"💖","title":"한줄요약","titleEn":"Summary","content":f"금성 {sign_ko.get(v_s,v_s)}, 달 {sign_ko.get(moon_s,moon_s)}의 감성"},
            {"id":"timing","icon":"⏰","title":"타이밍","titleEn":"Timing","content":"진심 어린 만남 가능"},
            {"id":"comm","icon":"💬","title":"소통 스타일","titleEn":"Communication","content":"진심 표현, 상대 페이스 존중"},
            {"id":"action","icon":"🎯","title":"행동 가이드","titleEn":"Action","content":"작은 관심과 배려"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】금성/7하우스 조화"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"상대 마음도 헤아리세요"}]
    elif theme == "focus_family":
        return [
            {"id":"summary","icon":"👪","title":"한줄요약","titleEn":"Summary","content":f"달 {sign_ko.get(moon_s,moon_s)}, 가정에서 조화로운 역할"},
            {"id":"comm","icon":"💬","title":"소통 포인트","titleEn":"Communication","content":"경청, 서로 입장 이해"},
            {"id":"coop","icon":"🤝","title":"협력 방향","titleEn":"Cooperation","content":"역할 분담, 함께하는 시간"},
            {"id":"risk","icon":"⚠️","title":"리스크 관리","titleEn":"Risks","content":"충돌 시 시간 두고 대화"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】달/4하우스 영향"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"함께하는 시간을 소중히"}]
    elif theme == "focus_health":
        m_s = mars.get("sign","")
        rt = {"목":"스트레칭, 녹색채소","화":"유산소, 수분","토":"규칙적 식사","금":"호흡운동","수":"요가, 충분한 수면"}
        return [
            {"id":"summary","icon":"💊","title":"한줄요약","titleEn":"Summary","content":f"균형 잡힌 생활, {day_master} 일주 특성 고려 관리"},
            {"id":"routine","icon":"🔄","title":"루틴 추천","titleEn":"Routine","content":rt.get(day_el,"규칙적 운동과 균형 식단")},
            {"id":"fatigue","icon":"😴","title":"피로 관리","titleEn":"Fatigue","content":"7-8시간 수면, 피로 전 휴식"},
            {"id":"recovery","icon":"🌿","title":"회복 포인트","titleEn":"Recovery","content":"자연 속 시간, 규칙적 리듬"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】오행 균형과 【점성】화성 {sign_ko.get(m_s,'')} 영향"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"예방이 최선, 규칙적 생활"}]
    else:  # focus_overall
        asc_s = asc.get("sign","")
        # Build daeun string with age range
        daeun_stem = cur_daeun.get('heavenlyStem', '')
        daeun_branch = cur_daeun.get('earthlyBranch', '')
        daeun_age = cur_daeun.get('age', 0)
        dt = f"{daeun_stem}{daeun_branch} ({daeun_age}~{daeun_age+9}세)" if cur_daeun and daeun_stem else "진행 중"
        return [
            {"id":"identity","icon":"🌟","title":"핵심 정체성","titleEn":"Identity","content":f"**사주**: {day_master} 일주({el_ko.get(day_el,day_el)})\n**점성**: {sign_ko.get(sun_s,'')} 태양, {sign_ko.get(moon_s,'')} 달, {sign_ko.get(asc_s,'')} 상승"},
            {"id":"flow","icon":"🌊","title":"현재 흐름","titleEn":"Flow","content":f"**대운**: {dt}"},
            {"id":"future","icon":"🔮","title":"향후 전망","titleEn":"Future","content":"꾸준한 노력이 미래 성과로"},
            {"id":"str","icon":"💪","title":"강점","titleEn":"Strengths","content":"고유한 강점 발견, 발전"},
            {"id":"challenge","icon":"🏔️","title":"도전 과제","titleEn":"Challenges","content":"균형 잡힌 성장 추구"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master}와 【점성】{sign_ko.get(sun_s,'')} 태양 조화"},
            {"id":"next","icon":"👣","title":"다음 스텝","titleEn":"Next","content":f"{el_ko.get(day_el,day_el)} 기운 활용해 나아가기"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":"강점을 믿고 발전시키세요"}]


def _get_theme_summary(theme: str, saju: Dict, astro: Dict) -> str:
    """Generate theme-specific summary line."""
    dm, _ = _normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"궁수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
    now = datetime.now()
    t_map = {
        "fortune_today": f"{dm} 일주 | {sign_ko.get(moon.get('sign',''),'')} 달",
        "fortune_monthly": f"{now.month}월 운세 | {dm} 일주",
        "fortune_new_year": f"{now.year}년 신년 운세 | {dm} 일주",
        "fortune_next_year": f"{now.year+1}년 운세 | {dm} 일주",
        "focus_career": f"커리어 | MC {sign_ko.get(astro.get('mc',{}).get('sign',''),'')}",
        "focus_love": f"연애 | 금성 {sign_ko.get(venus.get('sign',''),'')}",
        "focus_family": f"가족 | 달 {sign_ko.get(moon.get('sign',''),'')}",
        "focus_health": f"건강 | 화성 {sign_ko.get(mars.get('sign',''),'')}",
    }
    return t_map.get(theme, f"인생 총운 | {dm} 일주 | {sign_ko.get(sun.get('sign',''),'')} 태양")


def render_template_report(
    facts: Dict[str, Any],
    signals: Dict[str, Any],
    cross_summary: str,
    theme_cross: Dict[str, Any],
) -> str:
    """
    Return JSON report matching Display.tsx StructuredFortune format.
    Supports 9 themes: fortune_today/monthly/new_year/next_year, focus_career/love/family/health/overall
    """
    saju = facts.get("saju") or {}
    astro = facts.get("astro") or {}
    theme = facts.get("theme", "focus_overall")
    unse = saju.get("unse") or {}

    structured = {
        "themeSummary": _get_theme_summary(theme, saju, astro),
        "sections": _get_theme_sections(theme, saju, astro),
        "lifeTimeline": {
            "description": "사주와 점성술 데이터를 기반으로 분석한 주요 시점입니다.",
            "importantYears": _get_important_years(unse, saju, astro)
        },
        "categoryAnalysis": _get_category_analysis(signals, theme_cross),
        "keyInsights": _get_key_insights(theme_cross, signals),
        "luckyElements": _get_lucky_elements(signals, saju),
        "sajuHighlight": _get_saju_highlight(saju),
        "astroHighlight": _get_astro_highlight(astro, signals),
        "crossHighlights": {
            "summary": cross_summary or "사주와 점성술의 교차 분석 결과입니다.",
            "points": (theme_cross or {}).get("intersections", [])[:3]
        }
    }

    return json.dumps(structured, ensure_ascii=False, indent=2)
