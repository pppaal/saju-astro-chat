"""
Key insights and lucky elements builder functions.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..data.day_master import DAY_MASTER_PROFILES
from ..data.sibsin import SIBSIN_SIMPLE, SIBSIN_SIMPLE_EN
from .helpers import (
    normalize_day_master,
    get_sibsin_value,
    HANJA_ELEMENT_TO_HANGUL,
    ELEMENT_SIMPLE,
    ELEMENT_SIMPLE_EN,
)


def get_key_insights(theme_cross: Dict[str, Any], signals: Dict[str, Any], saju: Dict[str, Any] = None, locale: str = "ko") -> List[Dict[str, Any]]:
    """Extract key insights from cross analysis.

    Returns format matching Display.tsx KeyInsight interface:
    - type: "strength" | "opportunity" | "caution" | "advice"
    - text: string
    - icon?: string
    """
    insights = []
    seen_texts = set()
    saju = saju or {}
    is_en = locale == "en"

    dm, dm_el = normalize_day_master(saju)
    dm_profile = DAY_MASTER_PROFILES.get(dm, {})

    saju_meta = (signals or {}).get("saju", {}).get("meta", {})
    astro_meta = (signals or {}).get("astro", {}).get("meta", {})

    # 1. 당신의 타입
    if dm and dm_profile:
        if is_en:
            el_name = ELEMENT_SIMPLE_EN.get(dm_el, dm_el)
            personality_short_en = {
                "목": "Strong leadership, pursuing growth",
                "화": "Bright and passionate, illuminating surroundings",
                "토": "Dependable and trustworthy, a solid anchor",
                "금": "Decisive and pursuing perfection",
                "수": "Wise and adaptable",
            }
            dm_text = f"You're a '{el_name}' type! {personality_short_en.get(dm_el, 'Unique charm')}"
        else:
            el_name = ELEMENT_SIMPLE.get(dm_el, dm_el)
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

    # 2. 행운을 부르는 기운
    advanced = saju.get("advancedAnalysis", {})
    yongsin_data = advanced.get("yongsin", {})
    if isinstance(yongsin_data, dict):
        yongsin = yongsin_data.get("element") or yongsin_data.get("name") or ""
    else:
        yongsin = str(yongsin_data) if yongsin_data else ""
    if not yongsin:
        yongsin = saju_meta.get("yongsin") or saju_meta.get("yong_sin") or ""

    if yongsin:
        yongsin_hangul = HANJA_ELEMENT_TO_HANGUL.get(yongsin, yongsin)
        if is_en:
            yongsin_name = ELEMENT_SIMPLE_EN.get(yongsin_hangul, yongsin_hangul)
            lucky_tip_en = {
                "목": "Green clothes, plants, and east direction bring luck",
                "화": "Red color, south direction, and bright lighting are good",
                "토": "Yellow color, center position, and ceramic items help",
                "금": "White color, west direction, and metal accessories are good",
                "수": "Black/blue colors, north direction, and water-related items are good",
            }
            yongsin_text = f"'{yongsin_name}' energy is your lucky key! {lucky_tip_en.get(yongsin_hangul, '')}"
        else:
            yongsin_name = ELEMENT_SIMPLE.get(yongsin_hangul, yongsin_hangul)
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
        cur_d = daeun[0] if daeun else {}
        d_sibsin = get_sibsin_value(cur_d.get("sibsin"), "cheon", "")
        d_age = cur_d.get("age", 0)
        if is_en:
            sibsin_meaning = SIBSIN_SIMPLE_EN.get(d_sibsin, "Change")
            if d_sibsin:
                daeun_text = f"Your current decade is a time of '{sibsin_meaning}' (from age {d_age})"
        else:
            sibsin_meaning = SIBSIN_SIMPLE.get(d_sibsin, "변화")
            if d_sibsin:
                daeun_text = f"지금 10년은 '{sibsin_meaning}'의 시기예요 ({d_age}세~)"
        if d_sibsin and daeun_text not in seen_texts:
            insights.append({"type": "opportunity", "text": daeun_text, "icon": "🌊"})
            seen_texts.add(daeun_text)

    # 4. 올해 운세
    now = datetime.now()
    annual = unse.get("annual", [])
    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    if cur_annual:
        a_sibsin = get_sibsin_value(cur_annual.get("sibsin"), "cheon", "")
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
            if a_sibsin:
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
            if a_sibsin:
                annual_text = f"{now.year}년은 '{sibsin_meaning}'의 해! {tip}"
        if a_sibsin and annual_text not in seen_texts:
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
            insights.append({"type": "advice", "text": "Trust the current flow and keep moving forward!", "icon": "🌟"})
        else:
            insights.append({"type": "advice", "text": "지금의 흐름을 믿고 꾸준히 나아가세요!", "icon": "🌟"})

    return insights[:6]


def get_lucky_elements(signals: Dict[str, Any], saju: Dict[str, Any], locale: str = "ko") -> Dict[str, Any]:
    """Extract lucky elements from analysis."""
    meta = (signals or {}).get("astro", {}).get("meta", {})
    saju_meta = (signals or {}).get("saju", {}).get("meta", {})

    dominant = meta.get("dominant_element") or saju_meta.get("dominant_element") or "wood"

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


def get_saju_highlight(saju: Dict[str, Any], locale: str = "ko") -> Optional[Dict[str, str]]:
    """Get main saju highlight."""
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


def get_astro_highlight(astro: Dict[str, Any], signals: Dict[str, Any], locale: str = "ko") -> Optional[Dict[str, str]]:
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
