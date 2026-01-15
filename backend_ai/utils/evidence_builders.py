"""
Evidence sentence builders for saju and astrology data.

Extracted from app.py during Phase 4.4 refactoring.
These functions build evidence sentences for AI responses.
"""

from datetime import date
from typing import Optional

from backend_ai.utils.context_builders import (
    _pick_astro_planet,
    _pick_ascendant,
    _pick_astro_aspect,
)
from backend_ai.utils.text_utils import (
    _add_months,
    _format_month_name,
    _count_timing_markers,
    _has_week_timing,
    _has_caution,
    _count_timing_markers_en,
    _has_week_timing_en,
    _has_caution_en,
)

import logging

logger = logging.getLogger(__name__)


def _summarize_five_elements(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    five = saju_data.get("fiveElements") or facts.get("fiveElements")
    if not isinstance(five, dict) or not five:
        return ""
    element_map = {
        "wood": "목",
        "fire": "화",
        "earth": "토",
        "metal": "금",
        "water": "수",
    }
    normalized = {}
    for key, value in five.items():
        ko = element_map.get(key, key)
        if isinstance(value, (int, float)):
            normalized[ko] = value
    if not normalized:
        return ""
    max_elem = max(normalized, key=normalized.get)
    min_elem = min(normalized, key=normalized.get)
    if normalized[max_elem] == normalized[min_elem]:
        return "오행은 비교적 고르게 분포된 편이에요"
    return f"오행은 {max_elem} 기운이 강하고 {min_elem} 기운이 약한 편이에요"


def _summarize_five_elements_en(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    five = saju_data.get("fiveElements") or facts.get("fiveElements")
    if not isinstance(five, dict) or not five:
        return ""
    element_map = {
        "wood": "wood",
        "fire": "fire",
        "earth": "earth",
        "metal": "metal",
        "water": "water",
        "목": "wood",
        "화": "fire",
        "토": "earth",
        "금": "metal",
        "수": "water",
    }
    normalized = {}
    for key, value in five.items():
        mapped = element_map.get(str(key).lower(), element_map.get(str(key), str(key)))
        if isinstance(value, (int, float)):
            normalized[mapped] = value
    if not normalized:
        return ""
    max_elem = max(normalized, key=normalized.get)
    min_elem = min(normalized, key=normalized.get)
    if normalized[max_elem] == normalized[min_elem]:
        return "Five Elements look fairly balanced."
    return f"Five Elements show strong {max_elem} and weaker {min_elem}."


def _pick_sibsin(saju_data: dict) -> str:
    def _pick_from_pillar(pillar: dict) -> str:
        if not isinstance(pillar, dict):
            return ""
        for key in ("heavenlyStem", "earthlyBranch"):
            val = pillar.get(key) if isinstance(pillar.get(key), dict) else {}
            sibsin = val.get("sibsin")
            if sibsin:
                return sibsin
        sibsin = pillar.get("sibsin")
        if isinstance(sibsin, dict):
            for val in sibsin.values():
                if val:
                    return val
        return ""

    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    for root in (facts, saju_data):
        pillars = root.get("pillars") if isinstance(root.get("pillars"), dict) else {}
        for key in ("day", "month", "year", "time"):
            sibsin = _pick_from_pillar(pillars.get(key))
            if sibsin:
                return sibsin
        for key in ("dayPillar", "monthPillar", "yearPillar", "timePillar"):
            sibsin = _pick_from_pillar(root.get(key))
            if sibsin:
                return sibsin
    return ""


def _planet_ko_name(name: str) -> str:
    if not name:
        return ""
    planet_map = {
        "sun": "태양",
        "moon": "달",
        "mercury": "수성",
        "venus": "금성",
        "mars": "화성",
        "jupiter": "목성",
        "saturn": "토성",
        "uranus": "천왕성",
        "neptune": "해왕성",
        "pluto": "명왕성",
    }
    return planet_map.get(name.lower(), name)


def _planet_en_name(name: str) -> str:
    if not name:
        return ""
    planet_map = {
        "sun": "Sun",
        "moon": "Moon",
        "mercury": "Mercury",
        "venus": "Venus",
        "mars": "Mars",
        "jupiter": "Jupiter",
        "saturn": "Saturn",
        "uranus": "Uranus",
        "neptune": "Neptune",
        "pluto": "Pluto",
    }
    return planet_map.get(name.lower(), name)


def _pick_any_planet(astro_data: dict):
    for key in ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"):
        hit = _pick_astro_planet(astro_data, key)
        if hit:
            return hit
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    for source in (astro_data.get("planets"), facts.get("planets")):
        if isinstance(source, list):
            for planet in source:
                if isinstance(planet, dict) and planet.get("name"):
                    return planet
    return None


def _build_saju_evidence_sentence(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    dm = saju_data.get("dayMaster") or facts.get("dayMaster") or {}
    dm_name = dm.get("heavenlyStem") or dm.get("name")
    dm_element = dm.get("element")

    pillars = saju_data.get("pillars") if isinstance(saju_data.get("pillars"), dict) else facts.get("pillars", {})
    month_pillar = None
    if isinstance(pillars, dict):
        month_pillar = pillars.get("month")
    if isinstance(month_pillar, dict):
        hs = month_pillar.get("heavenlyStem", {})
        eb = month_pillar.get("earthlyBranch", {})
        month_name = f"{hs.get('name', '')}{eb.get('name', '')}".strip()
    else:
        month_name = ""

    dm_text = ""
    if dm_name or dm_element:
        dm_text = f"{dm_name}" if dm_name else ""
        if dm_element:
            dm_text = f"{dm_text}({dm_element})" if dm_text else f"{dm_element}"

    element_summary = _summarize_five_elements(saju_data)
    sibsin = _pick_sibsin(saju_data)

    parts = []
    if dm_text:
        parts.append(f"일간 {dm_text} 흐름이 있고")
    if element_summary:
        parts.append(element_summary)
    else:
        parts.append("오행 균형은 추가 확인이 필요해요")
    if sibsin:
        parts.append(f"십성은 {sibsin} 기운이 도드라져요")
    else:
        parts.append("십성 흐름은 추가 확인이 필요해요")
    if parts:
        return "사주에서는 " + ", ".join(parts) + "."
    if month_name:
        return f"사주로 보면 월주 {month_name} 흐름이 있어서 안정과 확장의 균형을 자주 고민하게 되는 편이에요."
    return ""


def _build_saju_evidence_sentence_en(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    dm = saju_data.get("dayMaster") or facts.get("dayMaster") or {}
    dm_name = dm.get("heavenlyStem") or dm.get("name")
    dm_element = dm.get("element")
    element_map = {
        "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
        "wood": "wood", "fire": "fire", "earth": "earth", "metal": "metal", "water": "water",
    }
    dm_element_en = element_map.get(str(dm_element), dm_element) if dm_element else ""
    dm_text = ""
    if dm_name or dm_element_en:
        dm_text = f"{dm_name}" if dm_name else ""
        if dm_element_en:
            dm_text = f"{dm_text} ({dm_element_en})" if dm_text else f"{dm_element_en}"

    element_summary = _summarize_five_elements_en(saju_data)
    sibsin = _pick_sibsin(saju_data)

    parts = []
    if dm_text:
        parts.append(f"your Day Master is {dm_text}")
    if element_summary:
        parts.append(element_summary.rstrip("."))
    else:
        parts.append("Five Elements balance needs a closer check")
    if sibsin:
        parts.append(f"Ten Gods emphasize {sibsin}")
    else:
        parts.append("Ten Gods emphasis needs confirmation")
    return "From your Four Pillars, " + ", ".join(parts) + "."


def _build_astro_evidence_sentence(astro_data: dict) -> str:
    planet = _pick_astro_planet(astro_data, "sun") or _pick_astro_planet(astro_data, "moon") or _pick_any_planet(astro_data)
    asc = _pick_ascendant(astro_data)
    aspect = _pick_astro_aspect(astro_data)

    aspect_text = ""
    if isinstance(aspect, dict):
        aspect_map = {
            "trine": "트라인",
            "square": "스퀘어",
            "conjunction": "컨정션",
            "opposition": "옵포지션",
            "sextile": "섹스타일",
        }
        from_name = _planet_ko_name(str(aspect.get("from", {}).get("name", "")))
        to_name = _planet_ko_name(str(aspect.get("to", {}).get("name", "")))
        aspect_type = aspect_map.get(str(aspect.get("type", "")).lower(), aspect.get("type", ""))
        if from_name and to_name and aspect_type:
            aspect_text = f"{from_name}-{to_name} {aspect_type} 각"

    if planet:
        planet_name = _planet_ko_name(str(planet.get("name", ""))) or "주요"
        sign = planet.get("sign", "")
        house = planet.get("house")
        house_text = f"{house}하우스" if house else "하우스"
        position_text = f"{sign} {house_text}".strip()
        aspect_clause = f", {aspect_text}이 있어" if aspect_text else ""
        return f"점성에서는 {planet_name}이라는 행성이 {position_text}에 있고{aspect_clause} 흐름이 보여요."
    if asc:
        sign = asc.get("sign", "")
        return f"점성에서는 행성 데이터가 제한적이지만 상승점이 {sign}이고 하우스 축이 분명해 행동 방식이 또렷하게 보이는 편이에요."
    return ""


def _build_astro_evidence_sentence_en(astro_data: dict) -> str:
    planet = _pick_astro_planet(astro_data, "sun") or _pick_astro_planet(astro_data, "moon") or _pick_any_planet(astro_data)
    asc = _pick_ascendant(astro_data)
    aspect = _pick_astro_aspect(astro_data)

    aspect_text = ""
    if isinstance(aspect, dict):
        aspect_map = {
            "trine": "trine",
            "square": "square",
            "conjunction": "conjunction",
            "opposition": "opposition",
            "sextile": "sextile",
        }
        from_name = _planet_en_name(str(aspect.get("from", {}).get("name", "")))
        to_name = _planet_en_name(str(aspect.get("to", {}).get("name", "")))
        aspect_type = aspect_map.get(str(aspect.get("type", "")).lower(), aspect.get("type", ""))
        if from_name and to_name and aspect_type:
            aspect_text = f"{from_name}-{to_name} {aspect_type}"

    if planet:
        planet_name = _planet_en_name(str(planet.get("name", ""))) or "a key planet"
        sign = planet.get("sign", "")
        house = planet.get("house")
        house_text = f"{house}th house" if house else "a house placement"
        position_text = f"{sign} {house_text}".strip()
        aspect_clause = f", with a {aspect_text} aspect" if aspect_text else ""
        return f"In your chart, {planet_name} in {position_text}{aspect_clause} shows up as a clear influence."
    if asc:
        sign = asc.get("sign", "")
        return f"Your Ascendant in {sign} sets a clear outer persona even when other planetary data is limited."
    return "Astrology data is limited, but keep the Sun/Moon and house axis as anchors for guidance."


def _build_missing_requirements_addendum(
    text: str,
    locale: str,
    saju_data: dict,
    astro_data: dict,
    now_date: date,
    require_saju: bool = True,
    require_astro: bool = True,
    require_timing: bool = True,
    require_caution: bool = True,
) -> str:
    if not text:
        return ""

    if locale == "ko":
        saju_tokens = [
            "일간", "오행", "십성", "대운", "세운", "월주", "일주", "년주", "시주",
            "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
        ]
        dm = (saju_data.get("dayMaster") or {}).get("name")
        dm_element = (saju_data.get("dayMaster") or {}).get("element")
        if dm:
            saju_tokens.append(str(dm))
        if dm_element:
            saju_tokens.append(str(dm_element))
        has_saju = any(token and token in text for token in saju_tokens)
        has_saju_required = "오행" in text and "십성" in text

        astro_tokens = ["태양", "달", "ASC", "상승", "행성", "하우스", "수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성"]
        sun = _pick_astro_planet(astro_data, "sun")
        moon = _pick_astro_planet(astro_data, "moon")
        asc = _pick_ascendant(astro_data)
        for p in (sun, moon, asc):
            if p and p.get("sign"):
                astro_tokens.append(str(p.get("sign")))
        has_astro = any(token and token in text for token in astro_tokens)
        has_astro_required = "행성" in text and "하우스" in text

        timing_count = _count_timing_markers(text)
        has_week = _has_week_timing(text)
        has_caution_flag = _has_caution(text)

        add_parts = []
        if require_saju and (not has_saju or not has_saju_required):
            saju_sentence = _build_saju_evidence_sentence(saju_data)
            if saju_sentence:
                add_parts.append(saju_sentence)
        if require_astro and (not has_astro or not has_astro_required):
            astro_sentence = _build_astro_evidence_sentence(astro_data)
            if astro_sentence:
                add_parts.append(astro_sentence)
        if require_timing and (timing_count < 2 or not has_week):
            m1 = _add_months(now_date, 1)
            m2 = _add_months(now_date, 3)
            m3 = _add_months(now_date, 5)
            timing_sentence = (
                f"타이밍은 {m1.year}년 {m1.month}월 1~2주차, "
                f"{m2.year}년 {m2.month}월 2~3주차, "
                f"{m3.year}년 {m3.month}월 3~4주차 흐름을 중심으로 보면 좋아요."
            )
            add_parts.append(timing_sentence)
        if require_caution and not has_caution_flag:
            m2 = _add_months(now_date, 3)
            add_parts.append(
                f"주의: {m2.year}년 {m2.month}월 2~3주차쯤은 중요한 결정을 무리하게 밀어붙이기보다는 한 템포 점검하는 게 좋아 보여요."
            )

        return " ".join([part for part in add_parts if part]).strip()

    lower = text.lower()
    saju_tokens_en = [
        "day master", "five elements", "ten gods", "daeun", "seun",
        "year pillar", "month pillar", "day pillar", "hour pillar", "four pillars",
    ]
    has_saju = any(token in lower for token in saju_tokens_en)
    has_saju_required = "five elements" in lower and "ten gods" in lower

    astro_tokens_en = [
        "sun", "moon", "ascendant", "rising", "house", "planet", "aspect", "transit",
    ]
    has_astro = any(token in lower for token in astro_tokens_en)
    has_astro_required = "planet" in lower and "house" in lower

    timing_count = _count_timing_markers_en(text)
    has_week = _has_week_timing_en(text)
    has_caution_flag = _has_caution_en(text)

    add_parts = []
    if require_saju and (not has_saju or not has_saju_required):
        saju_sentence = _build_saju_evidence_sentence_en(saju_data)
        if saju_sentence:
            add_parts.append(saju_sentence)
    if require_astro and (not has_astro or not has_astro_required):
        astro_sentence = _build_astro_evidence_sentence_en(astro_data)
        if astro_sentence:
            add_parts.append(astro_sentence)
    if require_timing and (timing_count < 2 or not has_week):
        m1 = _add_months(now_date, 1)
        m2 = _add_months(now_date, 3)
        m3 = _add_months(now_date, 5)
        timing_sentence = (
            f"Timing: focus on {_format_month_name(m1)} weeks 1-2, "
            f"{_format_month_name(m2)} weeks 2-3, and "
            f"{_format_month_name(m3)} weeks 3-4 for key moves."
        )
        add_parts.append(timing_sentence)
    if require_caution and not has_caution_flag:
        m2 = _add_months(now_date, 3)
        add_parts.append(
            f"Caution: around {_format_month_name(m2)} weeks 2-3, avoid rushing decisions and double-check details."
        )

    return " ".join([part for part in add_parts if part]).strip()


def _build_rag_debug_addendum(meta: dict, locale: str) -> str:
    if not isinstance(meta, dict) or not meta.get("enabled"):
        return ""

    theme = meta.get("theme", "")
    question = meta.get("question", "")
    graph_nodes = meta.get("graph_nodes", 0)
    corpus_quotes = meta.get("corpus_quotes", 0)
    persona_jung = meta.get("persona_jung", 0)
    persona_stoic = meta.get("persona_stoic", 0)
    cross_analysis = "on" if meta.get("cross_analysis") else "off"
    theme_fusion = "on" if meta.get("theme_fusion") else "off"
    lifespan = "on" if meta.get("lifespan") else "off"
    therapeutic = "on" if meta.get("therapeutic") else "off"

    model = meta.get("model", "")
    temperature = meta.get("temperature", "")
    ab_variant = meta.get("ab_variant", "")

    if locale == "ko":
        return (
            f"[RAG 근거 태그] theme={theme} | q=\"{question}\" | graph={graph_nodes} | "
            f"corpus={corpus_quotes} | persona={persona_jung + persona_stoic} | cross={cross_analysis} | fusion={theme_fusion}\n"
            f"[RAG 요약] graph_nodes={graph_nodes}; corpus_quotes={corpus_quotes}; "
            f"persona_jung={persona_jung}; persona_stoic={persona_stoic}; "
            f"cross_analysis={cross_analysis}; theme_fusion={theme_fusion}; "
            f"lifespan={lifespan}; therapeutic={therapeutic}; model={model}; temp={temperature}; ab={ab_variant}\n"
        )

    return (
        f"[RAG Evidence Tags] theme={theme} | q=\"{question}\" | graph={graph_nodes} | "
        f"corpus={corpus_quotes} | persona={persona_jung + persona_stoic} | cross={cross_analysis} | fusion={theme_fusion}\n"
        f"[RAG Summary] graph_nodes={graph_nodes}; corpus_quotes={corpus_quotes}; "
        f"persona_jung={persona_jung}; persona_stoic={persona_stoic}; "
        f"cross_analysis={cross_analysis}; theme_fusion={theme_fusion}; "
        f"lifespan={lifespan}; therapeutic={therapeutic}; model={model}; temp={temperature}; ab={ab_variant}\n"
    )
