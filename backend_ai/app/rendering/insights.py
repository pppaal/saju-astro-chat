# backend_ai/app/rendering/insights.py
"""
Rendering Insights Extractors
=============================
키 인사이트와 행운 요소 추출 함수들
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from .profiles import DAY_MASTER_PROFILES, ZODIAC_PROFILES
from .constants import SIBSIN_MEANINGS, SIBSIN_EN
from .extractors import (
    get_sibsin_value,
    get_element_from_stem,
    normalize_day_master,
    get_birth_year,
    get_yongsin_element,
    hanja_element_to_korean,
)
from .generators import (
    calculate_rating_from_sibsin,
    get_personalized_daeun_meaning,
    get_personalized_annual_meaning,
    get_yearly_transit_info,
)


# Sibsin 간단 설명 매핑
SIBSIN_SIMPLE = {
    "비견": "경쟁과 협력",
    "겁재": "도전과 추진",
    "식신": "창의와 표현",
    "상관": "자유와 변화",
    "편재": "활동적 재물운",
    "정재": "안정적 재물운",
    "편관": "도전과 성장",
    "정관": "승진과 인정",
    "편인": "배움과 변화",
    "정인": "도움과 지원",
}

SIBSIN_SIMPLE_EN = {
    "비견": "Competition & Cooperation",
    "겁재": "Challenge & Drive",
    "식신": "Creativity & Expression",
    "상관": "Freedom & Change",
    "편재": "Active Wealth",
    "정재": "Stable Wealth",
    "편관": "Challenge & Growth",
    "정관": "Promotion & Recognition",
    "편인": "Learning & Change",
    "정인": "Support & Guidance",
}

# 오행 간단 설명
EL_SIMPLE = {
    "목": "나무", "화": "불", "토": "흙", "금": "금속", "수": "물",
}
EL_SIMPLE_EN = {
    "목": "Wood", "화": "Fire", "토": "Earth", "금": "Metal", "수": "Water",
}


def get_important_years(
    unse: Dict[str, Any],
    saju: Dict[str, Any],
    astro: Dict[str, Any] = None,
    locale: str = "ko"
) -> List[Dict[str, Any]]:
    """Extract important years from saju unse data + astro transits.

    Returns format matching Display.tsx ImportantYear interface:
    - year: number (individual year)
    - age: number
    - rating: 1-5
    - title: string
    - sajuReason: string
    - astroReason: string

    Args:
        unse: Unse (운세) data
        saju: Saju data
        astro: Astrology data (optional)
        locale: Locale (ko/en)

    Returns:
        List of important year dictionaries
    """
    years = []
    current_year = datetime.now().year

    # Get birth year
    birth_year = get_birth_year(unse, saju, current_year)
    if not birth_year:
        birth_year = current_year - 30  # Default to ~30 years old

    user_age = current_year - birth_year

    # Daeun (대운) - major luck periods
    daeun = (unse or {}).get("daeun") or []

    for idx, d in enumerate(daeun):
        age = d.get("age")
        if age is None:
            continue

        year_num = birth_year + int(age) if birth_year else current_year + (idx * 10)
        stem = d.get("heavenlyStem") or d.get("heavenly_stem") or ""
        branch = d.get("earthlyBranch") or d.get("earthly_branch") or ""

        sibsin = d.get("sibsin")
        cheon_sibsin = get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = get_sibsin_value(sibsin, "ji", "")

        element = get_element_from_stem(stem)
        rating = calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        # Check if this daeun period includes current age
        is_current = age <= user_age < age + 10

        # Get personalized meaning
        meaning = get_personalized_daeun_meaning(
            cheon_sibsin, ji_sibsin, element, age, is_current
        )

        years.append({
            "year": year_num,
            "age": int(age),
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # Annual fortune (세운)
    annual = (unse or {}).get("annual") or []
    for a in annual:
        year = a.get("year")
        if not year:
            continue

        year_num = int(year) if isinstance(year, str) else year
        age = year_num - birth_year if birth_year else current_year - 1990

        stem = a.get("heavenlyStem") or a.get("heavenly_stem") or ""
        sibsin = a.get("sibsin")
        cheon_sibsin = get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = get_sibsin_value(sibsin, "ji", "")

        rating = calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)
        is_current = year_num == current_year
        meaning = get_personalized_annual_meaning(cheon_sibsin, ji_sibsin, year_num, is_current)

        years.append({
            "year": year_num,
            "age": age,
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # Sort and filter
    has_daeun = bool(daeun)
    has_annual = bool(annual)

    if has_daeun or has_annual:
        high_rated = years.copy()
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))
        high_rated = high_rated[:8]
    else:
        high_rated = [y for y in years if y["rating"] >= 4]
        if len(high_rated) < 6:
            medium_rated = [y for y in years if y["rating"] == 3]
            medium_rated.sort(key=lambda x: x["year"])
            high_rated.extend(medium_rated[:6 - len(high_rated)])
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))

    # Fallback if no data
    if len(high_rated) < 4 and not has_daeun and not has_annual:
        high_rated = _generate_fallback_years(saju, birth_year, current_year, astro)

    return high_rated[:8]


def _generate_fallback_years(
    saju: Dict[str, Any],
    birth_year: int,
    current_year: int,
    astro: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """Generate fallback years based on day master when no unse data."""
    years = []

    day_master = (saju or {}).get("dayMaster", {})
    dm_name = day_master.get("name") or day_master.get("heavenlyStem") or ""
    dm_element = day_master.get("element") or get_element_from_stem(dm_name)

    # 오행 상생 관계
    generates = {"목": "화", "화": "토", "토": "금", "금": "수", "수": "목"}
    supports = {"목": "수", "화": "목", "토": "화", "금": "토", "수": "금"}

    # 년도별 천간 (2024-2033)
    year_stems = {
        2024: ("갑", "목"), 2025: ("을", "목"), 2026: ("병", "화"), 2027: ("정", "화"),
        2028: ("무", "토"), 2029: ("기", "토"), 2030: ("경", "금"), 2031: ("신", "금"),
        2032: ("임", "수"), 2033: ("계", "수")
    }

    for year in range(current_year, current_year + 10):
        if year not in year_stems:
            continue
        stem, el = year_stems[year]
        age = year - birth_year

        rating = 3
        reason = "변화의 기운이 흐르는 해"
        astro_reason = get_yearly_transit_info(year, astro)

        if el == dm_element:
            rating = 4
            reason = f"같은 {el} 기운으로 힘이 강해지는 해"
        elif dm_element and generates.get(dm_element) == el:
            rating = 3
            reason = "에너지를 발산하기 좋은 해"
        elif dm_element and supports.get(dm_element) == el:
            rating = 5
            reason = f"{el}이 당신을 생(生)해주는 황금기"

        years.append({
            "year": year,
            "age": age,
            "rating": rating,
            "title": f"{year}년 운세",
            "sajuReason": reason,
            "astroReason": astro_reason,
        })

    years.sort(key=lambda x: (-x["rating"], x["year"]))
    return years


def get_key_insights(
    theme_cross: Dict[str, Any],
    signals: Dict[str, Any],
    saju: Dict[str, Any] = None,
    locale: str = "ko"
) -> List[Dict[str, Any]]:
    """Extract key insights from cross analysis.

    Returns format matching Display.tsx KeyInsight interface:
    - type: "strength" | "opportunity" | "caution" | "advice"
    - text: string
    - icon?: string

    Args:
        theme_cross: Theme cross data
        signals: Signal data
        saju: Saju data
        locale: Locale (ko/en)

    Returns:
        List of insight dictionaries
    """
    insights = []
    seen_texts = set()
    saju = saju or {}
    is_en = locale == "en"

    # 일간 정보
    dm, dm_el = normalize_day_master(saju)
    dm_profile = DAY_MASTER_PROFILES.get(dm, {})

    saju_meta = (signals or {}).get("saju", {}).get("meta", {})

    # 1. 당신의 타입
    if dm and dm_profile:
        if is_en:
            el_name = EL_SIMPLE_EN.get(dm_el, dm_el)
            personality_short_en = {
                "목": "Strong leadership, pursuing growth",
                "화": "Bright and passionate, illuminating surroundings",
                "토": "Dependable and trustworthy, a solid anchor",
                "금": "Decisive and pursuing perfection",
                "수": "Wise and adaptable",
            }
            dm_text = f"You're a '{el_name}' type! {personality_short_en.get(dm_el, 'Unique charm')}"
        else:
            el_name = EL_SIMPLE.get(dm_el, dm_el)
            personality_short = {
                "목": "리더십이 강하고 성장을 추구해요",
                "화": "밝고 열정적이며 주변을 밝혀요",
                "토": "듬직하고 신뢰감 있는 중심이에요",
                "금": "결단력 있고 완벽을 추구해요",
                "수": "지혜롭고 유연하게 적응해요",
            }
            dm_text = f"당신은 '{el_name}' 타입! {personality_short.get(dm_el, '독특한 매력이 있어요')}"

        if dm_text not in seen_texts:
            insights.append({"type": "strength", "text": dm_text, "icon": "✨"})
            seen_texts.add(dm_text)

    # 2. 행운을 부르는 기운 (용신)
    yongsin = get_yongsin_element(saju, saju_meta)
    if yongsin:
        yongsin_hangul = hanja_element_to_korean(yongsin)
        if is_en:
            yongsin_name = EL_SIMPLE_EN.get(yongsin_hangul, yongsin_hangul)
            lucky_tip_en = {
                "목": "Green clothes, plants, and east direction bring luck",
                "화": "Red color, south direction, and bright lighting are good",
                "토": "Yellow color, center position, and ceramic items help",
                "금": "White color, west direction, and metal accessories are good",
                "수": "Black/blue colors, north direction, and water-related items are good",
            }
            yongsin_text = f"'{yongsin_name}' energy is your lucky key! {lucky_tip_en.get(yongsin_hangul, '')}"
        else:
            yongsin_name = EL_SIMPLE.get(yongsin_hangul, yongsin_hangul)
            lucky_tip = {
                "목": "초록색 옷, 식물, 동쪽 방향이 행운을 불러요",
                "화": "빨간색, 남쪽 방향, 밝은 조명이 좋아요",
                "토": "노란색, 중앙, 도자기 소품이 도움돼요",
                "금": "흰색, 서쪽 방향, 금속 액세서리가 좋아요",
                "수": "검정/파랑색, 북쪽 방향, 물 관련 소품이 좋아요",
            }
            yongsin_text = f"'{yongsin_name}' 기운이 행운의 열쇠! {lucky_tip.get(yongsin_hangul, '')}"

        if yongsin_text not in seen_texts:
            insights.append({"type": "strength", "text": yongsin_text, "icon": "🍀"})
            seen_texts.add(yongsin_text)

    # 3. 지금 10년 운세 (대운)
    unse = saju.get("unse", {})
    daeun = unse.get("daeun", [])
    if daeun:
        cur_d = daeun[0]
        d_sibsin = get_sibsin_value(cur_d.get("sibsin"), "cheon", "")
        d_age = cur_d.get("age", 0)
        if d_sibsin:
            if is_en:
                sibsin_meaning = SIBSIN_SIMPLE_EN.get(d_sibsin, "Change")
                daeun_text = f"Your current decade is a time of '{sibsin_meaning}' (from age {d_age})"
            else:
                sibsin_meaning = SIBSIN_SIMPLE.get(d_sibsin, "변화")
                daeun_text = f"지금 10년은 '{sibsin_meaning}'의 시기예요 ({d_age}세~)"

            if daeun_text not in seen_texts:
                insights.append({"type": "opportunity", "text": daeun_text, "icon": "🌊"})
                seen_texts.add(daeun_text)

    # 4. 올해 운세
    now = datetime.now()
    annual = unse.get("annual", [])
    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    if cur_annual:
        a_sibsin = get_sibsin_value(cur_annual.get("sibsin"), "cheon", "")
        if a_sibsin:
            if is_en:
                sibsin_meaning = SIBSIN_SIMPLE_EN.get(a_sibsin, "Change")
                annual_tip_en = {
                    "비견": "Cooperating with colleagues creates synergy",
                    "겁재": "Bold challenges create opportunities",
                    "식신": "Creativity shines and good things happen",
                    "상관": "Don't fear change, embrace the new",
                    "편재": "Active movement brings money",
                    "정재": "Steady saving builds wealth",
                    "편관": "Challenges bring growth opportunities",
                    "정관": "A great year for promotion and recognition",
                    "편인": "Try new studies or certifications",
                    "정인": "Mentors appear to help you",
                }
                tip = annual_tip_en.get(a_sibsin, "Good energy flows")
                annual_text = f"{now.year} is a year of '{sibsin_meaning}'! {tip}"
            else:
                sibsin_meaning = SIBSIN_SIMPLE.get(a_sibsin, "변화")
                annual_tip = {
                    "비견": "동료와 협력하면 시너지가 나요",
                    "겁재": "과감한 도전이 기회를 만들어요",
                    "식신": "창의력이 빛나고 맛있는 일이 생겨요",
                    "상관": "변화를 두려워 말고 새로움을 즐기세요",
                    "편재": "활발히 움직이면 돈이 들어와요",
                    "정재": "꾸준히 모으면 재물이 쌓여요",
                    "편관": "도전이 있지만 성장의 기회예요",
                    "정관": "승진, 합격, 인정받는 좋은 해예요",
                    "편인": "새로운 공부나 자격증 도전해보세요",
                    "정인": "귀인이 나타나 도움을 받아요",
                }
                tip = annual_tip.get(a_sibsin, "좋은 흐름이에요")
                annual_text = f"{now.year}년은 '{sibsin_meaning}'의 해! {tip}"

            if annual_text not in seen_texts:
                insights.append({"type": "opportunity", "text": annual_text, "icon": "⭐"})
                seen_texts.add(annual_text)

    # 5. 실천 조언
    if dm_el:
        if is_en:
            action_advice_en = {
                "목": "Great time to start new challenges. Don't hesitate - take the first step!",
                "화": "Step forward actively and get noticed. Express yourself with confidence!",
                "토": "Consistency is your weapon. Don't rush, build step by step!",
                "금": "Time to organize and decide. Don't delay, finish cleanly!",
                "수": "Trust your intuition. Ride the flow and opportunities will come!",
            }
            advice_text = action_advice_en.get(dm_el, "Pursue a balanced life")
        else:
            action_advice = {
                "목": "새로운 도전을 시작하기 좋은 때예요. 망설이지 말고 첫걸음을 내딛으세요!",
                "화": "적극적으로 나서면 주목받아요. 자신감을 가지고 표현하세요!",
                "토": "꾸준함이 무기예요. 조급해하지 말고 차근차근 쌓아가세요!",
                "금": "정리하고 결단할 때예요. 미루지 말고 깔끔하게 마무리하세요!",
                "수": "직감을 믿으세요. 흐름을 타면 좋은 기회가 찾아옵니다!",
            }
            advice_text = action_advice.get(dm_el, "균형 잡힌 삶을 추구하세요")

        if advice_text not in seen_texts:
            insights.append({"type": "advice", "text": advice_text, "icon": "💪"})
            seen_texts.add(advice_text)

    # 6. 주의할 점
    if dm_profile:
        if is_en:
            weakness_tips_en = {
                "목": "Don't be stubborn - listen to other opinions. Flexibility is the key to success",
                "화": "You'll regret acting on impulse. Pause before deciding. Some coolness is needed",
                "토": "Fearing change means missing opportunities. Try new things too",
                "금": "Chasing perfection is exhausting. 80% is good enough",
                "수": "Being too passive lets opportunities pass. Reach out first. Be brave",
            }
            caution_text = weakness_tips_en.get(dm_el, "Don't overdo it, take breaks")
        else:
            weakness_tips = {
                "목": "고집부리지 말고 다른 의견도 들어보세요. 유연함이 성공의 열쇠예요",
                "화": "흥분하면 후회해요. 한 박자 쉬고 결정하세요. 냉정함도 필요해요",
                "토": "변화를 두려워하면 기회를 놓쳐요. 새로운 것도 시도해보세요",
                "금": "완벽하려다 지쳐요. 적당히도 괜찮아요. 80%면 충분합니다",
                "수": "너무 수동적이면 기회가 지나가요. 먼저 다가가세요. 용기를 내세요",
            }
            caution_text = weakness_tips.get(dm_el, "무리하지 말고 쉬어가세요")

        if caution_text not in seen_texts:
            insights.append({"type": "caution", "text": caution_text, "icon": "⚠️"})
            seen_texts.add(caution_text)

    # 최소 3개 보장
    if len(insights) < 3:
        if is_en:
            insights.append({
                "type": "advice",
                "text": "Trust the current flow and keep moving forward!",
                "icon": "🌟"
            })
        else:
            insights.append({
                "type": "advice",
                "text": "지금의 흐름을 믿고 꾸준히 나아가세요!",
                "icon": "🌟"
            })

    return insights[:6]


def get_lucky_elements(
    signals: Dict[str, Any],
    saju: Dict[str, Any],
    locale: str = "ko"
) -> Dict[str, Any]:
    """Extract lucky elements from analysis.

    Args:
        signals: Signal data
        saju: Saju data
        locale: Locale (ko/en)

    Returns:
        Dictionary with colors, directions, numbers, items
    """
    meta = (signals or {}).get("astro", {}).get("meta", {})
    saju_meta = (signals or {}).get("saju", {}).get("meta", {})

    # Dominant element
    dominant = meta.get("dominant_element") or saju_meta.get("dominant_element") or "wood"

    # Element to color/direction/item mapping
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


def get_saju_highlight(
    saju: Dict[str, Any],
    locale: str = "ko"
) -> Optional[Dict[str, str]]:
    """Get main saju highlight.

    Args:
        saju: Saju data
        locale: Locale (ko/en)

    Returns:
        Dictionary with pillar, element, meaning or None
    """
    day_master = (saju or {}).get("dayMaster", {})
    if day_master:
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
                "meaning": f"{dm_element} 성향 - 당신의 본질적 에너지"
            }
    return None


def get_astro_highlight(
    astro: Dict[str, Any],
    signals: Dict[str, Any],
    locale: str = "ko"
) -> Optional[Dict[str, str]]:
    """Get main astro highlight.

    Args:
        astro: Astrology data
        signals: Signal data
        locale: Locale (ko/en)

    Returns:
        Dictionary with planet, sign, meaning or None
    """
    planets = (astro or {}).get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), None)

    if sun:
        return {
            "planet": "Sun",
            "sign": sun.get("sign", ""),
            "meaning": f"태양 {sun.get('sign', '')} - 핵심 정체성과 삶의 목적"
        }
    return None


def get_character_builder(
    saju: Dict[str, Any],
    astro: Dict[str, Any],
    locale: str = "ko"
) -> Dict[str, Any]:
    """Build storytelling character profile from saju + astro data."""

    def normalize_element(el: str) -> str:
        if not el:
            return "wood"
        mapping = {
            "?": "wood", "?": "fire", "?": "earth", "?": "metal", "?": "water",
            "?": "wood", "?": "fire", "?": "earth", "?": "metal", "?": "water",
        }
        el_key = mapping.get(el, str(el).lower())
        return "metal" if el_key == "air" else el_key

    def element_label(el_key: str, is_en: bool) -> str:
        labels = {
            "wood": "?" if not is_en else "Wood",
            "fire": "?" if not is_en else "Fire",
            "earth": "?" if not is_en else "Earth",
            "metal": "?" if not is_en else "Metal",
            "water": "?" if not is_en else "Water",
        }
        return labels.get(el_key, el_key)

    element_keywords = {
        "wood": {
            "ko": ["??", "??", "???"],
            "en": ["growth", "initiative", "leadership"],
        },
        "fire": {
            "ko": ["??", "??", "????"],
            "en": ["passion", "expression", "charisma"],
        },
        "earth": {
            "ko": ["??", "??", "??"],
            "en": ["stability", "balance", "practicality"],
        },
        "metal": {
            "ko": ["??", "??", "??"],
            "en": ["principle", "analysis", "decisiveness"],
        },
        "water": {
            "ko": ["??", "??", "??"],
            "en": ["intuition", "adaptability", "depth"],
        },
    }

    archetypes = {
        "wood": {
            "ko": "?? ???",
            "en": "Verdant Pioneer",
            "tagline_ko": "??? ??? ??? ??? ??",
            "tagline_en": "A protagonist of growth and exploration",
        },
        "fire": {
            "ko": "?? ???",
            "en": "Flame Vanguard",
            "tagline_ko": "??? ???? ?? ?? ??",
            "tagline_en": "A catalyst who ignites bold expression",
        },
        "earth": {
            "ko": "?? ???",
            "en": "Earth Architect",
            "tagline_ko": "??? ??? ??? ??? ??",
            "tagline_en": "A builder who stabilizes the world around them",
        },
        "metal": {
            "ko": "?? ???",
            "en": "Steel Strategist",
            "tagline_ko": "??? ???? ?? ?? ??",
            "tagline_en": "A strategist who cuts a clear path",
        },
        "water": {
            "ko": "?? ??",
            "en": "Deepwater Sage",
            "tagline_ko": "??? ??? ??? ?? ??",
            "tagline_en": "A sage who navigates with deep insight",
        },
    }

    zodiac_element = {
        "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
        "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
        "Gemini": "air", "Libra": "air", "Aquarius": "air",
        "Cancer": "water", "Scorpio": "water", "Pisces": "water",
    }

    dm_name, dm_el = normalize_day_master(saju)
    dm_el_key = normalize_element(dm_el)

    # Five elements balance for dominant/weakest
    five_elements = (saju or {}).get("fiveElements") or (saju or {}).get("facts", {}).get("fiveElements") or {}
    dominant_key = dm_el_key
    weakest_key = dm_el_key
    if isinstance(five_elements, dict) and five_elements:
        items = [(normalize_element(k), v) for k, v in five_elements.items() if isinstance(v, (int, float))]
        if items:
            items.sort(key=lambda x: x[1], reverse=True)
            dominant_key = items[0][0]
            weakest_key = items[-1][0]

    # Astro signs
    planets = (astro or {}).get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    sun_sign = sun.get("sign", "")
    moon_sign = moon.get("sign", "")

    sun_key = normalize_element(zodiac_element.get(sun_sign, ""))
    moon_key = normalize_element(zodiac_element.get(moon_sign, ""))

    is_en = locale == "en"
    day_kw = element_keywords.get(dm_el_key, element_keywords["wood"])["en" if is_en else "ko"]
    sun_kw = element_keywords.get(sun_key or dm_el_key, element_keywords["wood"])["en" if is_en else "ko"]

    # Personality
    sun_trait = ZODIAC_PROFILES.get(sun_sign, {}).get("trait", "")
    moon_trait = ZODIAC_PROFILES.get(moon_sign, {}).get("trait", "")

    if is_en:
        personality = (
            f"Your core is driven by {', '.join(day_kw[:2])}. "
            f"Sun in {sun_sign or 'your sign'} amplifies {sun_kw[0]} on the surface. "
            f"Moon in {moon_sign or 'your moon sign'} adds emotional depth."
        )
    else:
        personality = (
            f"??? {day_kw[0]}?{day_kw[1]} ??? ?? ????. "
            f"?? {sun_sign}? {sun_trait or sun_kw[0]} ??? ??? ????, "
            f"? {moon_sign}? {moon_trait or sun_kw[1]} ??? ??? ????."
        )

    # Conflict
    conflict_parts = []
    relations = {
        "wood": {"controls": "earth", "controlledBy": "metal"},
        "fire": {"controls": "metal", "controlledBy": "water"},
        "earth": {"controls": "water", "controlledBy": "wood"},
        "metal": {"controls": "wood", "controlledBy": "fire"},
        "water": {"controls": "fire", "controlledBy": "earth"},
    }

    if sun_key == dm_el_key:
        conflict_parts.append(
            "??? ??? ?? ??? ???? ????." if not is_en
            else "Inner and outer energies align strongly, risking overdrive."
        )
    elif relations.get(dm_el_key, {}).get("controls") == sun_key:
        conflict_parts.append(
            f"??? {element_label(dm_el_key, False)}? ??? {element_label(sun_key, False)} ??? ????? ??? ????." if not is_en
            else f"Your inner {element_label(dm_el_key, True)} tries to control outward {element_label(sun_key, True)} flow."
        )
    elif relations.get(dm_el_key, {}).get("controlledBy") == sun_key:
        conflict_parts.append(
            f"?? {element_label(sun_key, False)} ??? ??? ?????." if not is_en
            else f"External {element_label(sun_key, True)} energy can pressure your inner pace."
        )
    else:
        conflict_parts.append(
            "?? ?? ??? ?? ??? ??? ? ????." if not is_en
            else "Mixed elements can create mismatched rhythms."
        )

    if sun_sign and moon_sign and sun_sign != moon_sign:
        conflict_parts.append(
            f"?? {sun_sign}? ? {moon_sign}? ?? ?? ??-?? ? ??? ?? ? ???." if not is_en
            else f"Sun in {sun_sign} and Moon in {moon_sign} may pull in different directions."
        )

    conflict = " ".join(conflict_parts).strip()

    # Growth arc
    support_key = {
        "wood": "water",
        "fire": "wood",
        "earth": "fire",
        "metal": "earth",
        "water": "metal",
    }.get(dm_el_key, dm_el_key)

    if is_en:
        growth = (
            f"Early on, you lean into {element_label(dm_el_key, True)}-driven {day_kw[0]}. "
            f"Midway, strengthening {element_label(weakest_key, True)} restores balance. "
            f"Later, {element_label(support_key, True)} energy expands your impact."
        )
    else:
        growth = (
            f"???? {element_label(dm_el_key, False)}? {day_kw[0]}? ??? ??? ????. "
            f"???? ?? {element_label(weakest_key, False)} ??? ???? ??? ????. "
            f"???? {element_label(support_key, False)} ???? ???? ?????."
        )

    archetype = archetypes.get(dm_el_key, archetypes["wood"])

    keywords = list(dict.fromkeys(day_kw + sun_kw))[:6]

    return {
        "archetype": archetype["en" if is_en else "ko"],
        "tagline": archetype["tagline_en" if is_en else "tagline_ko"],
        "personality": personality,
        "conflict": conflict,
        "growthArc": growth,
        "keywords": keywords,
    }
