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


def _get_important_years(unse: Dict[str, Any], saju: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract important years from saju unse data.

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

    # Get birth year for age calculation
    birth_year = None
    pillars = (saju or {}).get("pillars", {})
    year_pillar = pillars.get("year", "")
    if year_pillar and len(year_pillar) >= 4:
        try:
            birth_year = int(year_pillar[:4]) if year_pillar[:4].isdigit() else None
        except:
            pass

    # Try to get birth year from facts
    if not birth_year:
        facts = (saju or {}).get("facts", {})
        birth_date = facts.get("birthDate") or facts.get("birth_date") or ""
        if birth_date and len(birth_date) >= 4:
            try:
                birth_year = int(birth_date[:4])
            except:
                birth_year = 1990  # Default fallback

    # Daeun (대운) - major luck periods - convert to individual notable years
    daeun = (unse or {}).get("daeun") or []
    for idx, d in enumerate(daeun[:3]):
        start = d.get("startYear") or d.get("start_year")
        end = d.get("endYear") or d.get("end_year")
        name = d.get("name") or d.get("heavenly_stem", "")
        element = d.get("element") or ""
        ten_god = d.get("tenGod") or d.get("ten_god") or ""

        if start:
            # Use start year as the notable year
            year_num = int(start) if isinstance(start, str) else start
            age = year_num - birth_year if birth_year else 30 + (idx * 10)

            # Determine rating based on element/ten_god
            rating = _calculate_rating(element, ten_god)

            years.append({
                "year": year_num,
                "age": age,
                "rating": rating,
                "title": f"{name} 대운 시작" if name else "대운 전환기",
                "sajuReason": f"{name}({element}) 대운 - {_get_element_meaning(element)}",
                "astroReason": f"{ten_god or '운의 흐름'} 영향으로 새로운 기회 도래",
                "advice": _get_period_advice(element, ten_god)
            })

    # Annual fortune (세운) - upcoming years
    annual = (unse or {}).get("annual") or []
    for a in annual[:2]:
        year = a.get("year")
        if year:
            year_num = int(year) if isinstance(year, str) else year
            age = year_num - birth_year if birth_year else current_year - 1990
            name = a.get("name") or a.get("heavenly_stem", "")
            element = a.get("element") or ""
            desc = a.get("description") or ""

            rating = _calculate_rating(element, a.get("tenGod", ""))

            years.append({
                "year": year_num,
                "age": age,
                "rating": rating,
                "title": f"{year_num}년 {name}" if name else f"{year_num}년 운세",
                "sajuReason": f"{name}({element}) 세운" if name else "연간 에너지 변화",
                "astroReason": desc or "트랜짓 행성 영향",
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
    """Build detailed saju analysis text for a category."""
    parts = []

    if category == "career":
        if saju_data.get("has_officer_sibsin"):
            parts.append("관성(官星)이 있어 조직 내 승진과 권위 획득에 유리합니다")
        else:
            parts.append("자유로운 업무 환경이나 창업/프리랜서가 더 맞을 수 있습니다")

    elif category == "wealth":
        if saju_data.get("has_wealth_sibsin"):
            parts.append("재성(財星)이 있어 재물 축적 능력이 뛰어납니다")
        else:
            parts.append("기술이나 전문성을 통한 수입이 안정적입니다")

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        if sinsal_count > 0:
            hits = saju_data.get("love_sinsal_hits", [])
            parts.append(f"연애 관련 신살이 {sinsal_count}개 있어 인연이 풍부합니다")
            if hits:
                parts.append(f"({', '.join(str(h) for h in hits[:2])})")
        else:
            parts.append("안정적인 만남을 통해 깊은 관계를 형성하는 타입입니다")

    elif category == "health":
        flags = saju_data.get("five_element_flags", {})
        if flags:
            weak = [k for k, v in flags.items() if v == "weak"]
            if weak:
                parts.append(f"{', '.join(weak)} 오행이 약해 관련 기관 건강에 주의가 필요합니다")
            else:
                parts.append("오행 균형이 좋아 전반적인 건강 운이 양호합니다")
        else:
            parts.append("규칙적인 생활 습관이 건강 유지의 핵심입니다")

    # Add day master context if available
    day_master = saju_meta.get("day_master")
    if day_master:
        parts.append(f"일간 {day_master} 특성이 이 영역에 영향을 줍니다")

    return " ".join(parts) if parts else f"{category} 영역의 사주 분석입니다"


def _build_astro_analysis(category: str, astro_data: dict, astro_meta: dict) -> str:
    """Build detailed astro analysis text for a category."""
    parts = []

    if category == "career":
        planets = astro_data.get("planets_in_career_houses", [])
        mc_sign = astro_data.get("mc_sign")
        if planets:
            parts.append(f"10하우스(커리어)에 {', '.join(str(p) for p in planets[:2])} 행성이 위치합니다")
        if mc_sign:
            parts.append(f"MC가 {mc_sign}자리에 있어 관련 직종에 적성이 있습니다")
        if not planets and not mc_sign:
            parts.append("6하우스(일상업무)와 2하우스(수입)의 조화가 중요합니다")

    elif category == "wealth":
        benefics = astro_data.get("benefics_in_money_houses", [])
        pof = astro_data.get("pof_house", 0)
        if benefics:
            parts.append(f"2/8하우스에 길성이 있어 재물 운이 좋습니다")
        if pof:
            parts.append(f"파트 오브 포춘이 {pof}하우스에 위치합니다")
        if not benefics:
            parts.append("꾸준한 저축과 장기 투자가 유리합니다")

    elif category == "love":
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if planets:
            parts.append(f"7하우스(관계)에 {', '.join(str(p) for p in planets[:2])}이 영향을 줍니다")
        else:
            parts.append("금성과 화성의 위치가 연애 스타일을 나타냅니다")

    elif category == "health":
        malefics = astro_data.get("malefics_in_health_houses", [])
        if malefics:
            parts.append(f"6하우스에 흉성이 있어 건강 관리에 신경 쓰세요")
        else:
            parts.append("1하우스와 6하우스의 조화로 전반적 건강이 양호합니다")

    # Add element context
    dom_element = astro_meta.get("dominant_element")
    if dom_element:
        parts.append(f"점성학적으로 {dom_element} 원소가 강합니다")

    return " ".join(parts) if parts else f"{category} 영역의 점성 분석입니다"


def _build_cross_insight(category: str, saju_data: dict, astro_data: dict) -> str:
    """Build combined cross-system insight."""
    insights = {
        "career": "사주의 관성과 점성의 MC/10하우스가 일치할 때 커리어 운이 극대화됩니다",
        "wealth": "사주의 재성과 점성의 2/8하우스 길성이 조화를 이룰 때 재물 축적이 용이합니다",
        "love": "사주의 연애 신살과 점성의 금성/7하우스가 조화롭게 작용합니다",
        "health": "오행 균형과 점성의 건강 하우스를 함께 살펴 건강 관리 방향을 잡으세요",
    }
    return insights.get(category, "사주와 점성술의 교차 분석으로 더 정확한 인사이트를 제공합니다")


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
        return {
            "pillar": day_master.get("name", ""),
            "element": day_master.get("element", ""),
            "meaning": f"일간 {day_master.get('name', '')}({day_master.get('element', '')}) - 당신의 본질적 성향"
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


def render_template_report(
    facts: Dict[str, Any],
    signals: Dict[str, Any],
    cross_summary: str,
    theme_cross: Dict[str, Any],
) -> str:
    """
    Return a JSON string report that matches Display.tsx StructuredFortune format.
    This enables the beautiful UI rendering without needing LLM.
    """
    saju = facts.get("saju") or {}
    astro = facts.get("astro") or {}
    unse = saju.get("unse") or {}

    # Build the structured response
    structured = {
        "lifeTimeline": {
            "description": "사주와 점성술 데이터를 기반으로 분석한 주요 시점입니다.",
            "importantYears": _get_important_years(unse, saju)
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

    # Return as JSON string (Display.tsx will parse this)
    return json.dumps(structured, ensure_ascii=False, indent=2)
