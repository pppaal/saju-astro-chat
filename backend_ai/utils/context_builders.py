"""
Context builders for saju and astrology data.

Extracted from app.py during Phase 4.4 refactoring.
These functions build context strings for AI prompts.
"""

from datetime import datetime
from typing import Dict, Any, Optional

import logging

logger = logging.getLogger(__name__)


def _build_saju_summary(saju_data: dict) -> str:
    """Build concise saju summary for chat context."""
    if not saju_data:
        return ""
    parts = []
    if saju_data.get("dayMaster"):
        dm = saju_data["dayMaster"]
        dm_stem = dm.get('heavenlyStem') or dm.get('name', '')
        parts.append(f"Day Master: {dm_stem} ({dm.get('element', '')})")
    if saju_data.get("yearPillar"):
        yp = saju_data["yearPillar"]
        parts.append(f"Year: {yp.get('heavenlyStem', '')}{yp.get('earthlyBranch', '')}")
    if saju_data.get("monthPillar"):
        mp = saju_data["monthPillar"]
        parts.append(f"Month: {mp.get('heavenlyStem', '')}{mp.get('earthlyBranch', '')}")
    if saju_data.get("dominantElement"):
        parts.append(f"Dominant: {saju_data['dominantElement']}")
    return "SAJU: " + " | ".join(parts) if parts else ""


def _pick_astro_planet(astro_data: dict, name: str):
    """Select a planet payload from multiple possible shapes."""
    if not astro_data or not name:
        return None

    key = name.lower()
    direct = astro_data.get(key) or astro_data.get(name)
    if isinstance(direct, dict):
        return direct

    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    fact_hit = facts.get(key) or facts.get(name)
    if isinstance(fact_hit, dict):
        return fact_hit

    planets = astro_data.get("planets")
    if isinstance(planets, list):
        for p in planets:
            if isinstance(p, dict) and str(p.get("name", "")).lower() == key:
                return p
    return None


def _pick_ascendant(astro_data: dict):
    """Select ascendant payload from multiple possible shapes."""
    if not astro_data:
        return None
    asc = astro_data.get("ascendant") or astro_data.get("asc")
    if isinstance(asc, dict):
        return asc
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    asc = facts.get("ascendant") or facts.get("asc")
    return asc if isinstance(asc, dict) else None


def _pick_astro_aspect(astro_data: dict):
    """Pick a representative aspect entry."""
    if not astro_data:
        return None
    aspects = astro_data.get("aspects")
    if not isinstance(aspects, list):
        facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
        aspects = facts.get("aspects")
    if not isinstance(aspects, list) or not aspects:
        return None
    sorted_aspects = sorted(
        [a for a in aspects if isinstance(a, dict)],
        key=lambda a: a.get("score", 0),
        reverse=True
    )
    return sorted_aspects[0] if sorted_aspects else None


def _build_astro_summary(astro_data: dict) -> str:
    """Build concise astro summary for chat context."""
    if not astro_data:
        return ""
    parts = []
    sun = _pick_astro_planet(astro_data, "sun")
    if sun:
        parts.append(f"Sun: {sun.get('sign', '')}")
    moon = _pick_astro_planet(astro_data, "moon")
    if moon:
        parts.append(f"Moon: {moon.get('sign', '')}")
    asc = _pick_ascendant(astro_data)
    if asc:
        parts.append(f"Rising: {asc.get('sign', '')}")
    return "ASTRO: " + " | ".join(parts) if parts else ""


def _build_detailed_saju(saju_data: dict) -> str:
    """Build detailed saju context for personalized responses."""
    if not saju_data:
        return "사주 정보 없음"

    lines = []
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    pillars = saju_data.get("pillars") if isinstance(saju_data.get("pillars"), dict) else facts.get("pillars", {})

    def _format_pillar(label: str, pillar: dict | str | None):
        if not pillar:
            return None
        if isinstance(pillar, str):
            return f"{label}: {pillar}"
        if not isinstance(pillar, dict):
            return None
        hs = pillar.get("heavenlyStem") or {}
        eb = pillar.get("earthlyBranch") or {}
        stem = hs.get("name") if isinstance(hs, dict) else hs
        branch = eb.get("name") if isinstance(eb, dict) else eb
        element = pillar.get("element") or (hs.get("element") if isinstance(hs, dict) else None) or (eb.get("element") if isinstance(eb, dict) else None)
        core = f"{stem or ''}{branch or ''}".strip() or pillar.get("name", "")
        return f"{label}: {core}" + (f" ({element})" if element else "")

    # Four Pillars (support facts/pillars shapes)
    year_pillar = saju_data.get("yearPillar") or facts.get("yearPillar") or (pillars.get("year") if isinstance(pillars, dict) else None)
    month_pillar = saju_data.get("monthPillar") or facts.get("monthPillar") or (pillars.get("month") if isinstance(pillars, dict) else None)
    day_pillar = saju_data.get("dayPillar") or facts.get("dayPillar") or (pillars.get("day") if isinstance(pillars, dict) else None)
    hour_pillar = saju_data.get("hourPillar") or facts.get("timePillar") or (pillars.get("time") if isinstance(pillars, dict) else None)

    for label, pillar in [("년주", year_pillar), ("월주", month_pillar), ("일주", day_pillar), ("시주", hour_pillar)]:
        formatted = _format_pillar(label, pillar)
        if formatted:
            lines.append(formatted)

    # Day Master (most important) - support both "heavenlyStem" and "name"
    dm = saju_data.get("dayMaster") or facts.get("dayMaster")
    if dm:
        dm_stem = dm.get("heavenlyStem") or dm.get("name", "")
        lines.append(f"일간(본인): {dm_stem} - {dm.get('element', '')}의 기운")

    # Five Elements balance
    fe = saju_data.get("fiveElements") or facts.get("fiveElements")
    if fe:
        elements = [f"{k}({v})" for k, v in fe.items() if v]
        if elements:
            lines.append(f"오행 분포: {', '.join(elements)}")

    # Dominant element
    dominant_element = saju_data.get("dominantElement") or facts.get("dominantElement")
    if dominant_element:
        lines.append(f"주요 기운: {dominant_element}")

    # Ten Gods (if available)
    tg = saju_data.get("tenGods") or facts.get("tenGods")
    if tg:
        if isinstance(tg, dict):
            gods = [f"{k}: {v}" for k, v in list(tg.items())[:4]]
            if gods:
                lines.append(f"십신: {', '.join(gods)}")

    return "\n".join(lines) if lines else "사주 정보 부족"


def _build_detailed_astro(astro_data: dict) -> str:
    """Build detailed astrology context for personalized responses."""
    if not astro_data:
        return "점성술 정보 없음"

    lines = []
    now = datetime.now()
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}

    # Big Three - ESSENTIAL
    sun_sign = ""
    moon_sign = ""
    sun = _pick_astro_planet(astro_data, "sun")
    if sun:
        sun_sign = sun.get("sign", "")
        house = sun.get("house", "")
        lines.append(f"태양(자아): {sun_sign} {sun.get('degree', '')}도" + (f" - {house}하우스" if house else ""))
    moon = _pick_astro_planet(astro_data, "moon")
    if moon:
        moon_sign = moon.get("sign", "")
        house = moon.get("house", "")
        lines.append(f"달(감정): {moon_sign} {moon.get('degree', '')}도" + (f" - {house}하우스" if house else ""))
    asc = _pick_ascendant(astro_data)
    if asc:
        lines.append(f"상승(외적): {asc.get('sign', '')} {asc.get('degree', '')}도")

    # Key planets with houses
    for planet, info in [("mercury", "수성(소통)"), ("venus", "금성(사랑/관계)"),
                         ("mars", "화성(에너지)"), ("jupiter", "목성(행운/확장)"),
                         ("saturn", "토성(시련/책임)")]:
        p = _pick_astro_planet(astro_data, planet)
        if p:
            house = p.get("house", "")
            lines.append(f"{info}: {p.get('sign', '')}" + (f" - {house}하우스" if house else ""))

    # Houses (if available)
    houses = astro_data.get("houses") or facts.get("houses")
    if houses:
        h = houses
        lines.append("\n주요 하우스:")
        # Handle both dict and list formats
        if isinstance(h, dict):
            if h.get("1"):
                lines.append(f"  1하우스(자아): {h['1'].get('sign', '') if isinstance(h['1'], dict) else h['1']}")
            if h.get("7"):
                lines.append(f"  7하우스(파트너): {h['7'].get('sign', '') if isinstance(h['7'], dict) else h['7']}")
            if h.get("10"):
                lines.append(f"  10하우스(커리어): {h['10'].get('sign', '') if isinstance(h['10'], dict) else h['10']}")
        elif isinstance(h, list) and len(h) >= 10:
            # List format: index 0 = 1st house, etc.
            if h[0]:
                sign = h[0].get('sign', '') if isinstance(h[0], dict) else h[0]
                lines.append(f"  1하우스(자아): {sign}")
            if len(h) > 6 and h[6]:
                sign = h[6].get('sign', '') if isinstance(h[6], dict) else h[6]
                lines.append(f"  7하우스(파트너): {sign}")
            if len(h) > 9 and h[9]:
                sign = h[9].get('sign', '') if isinstance(h[9], dict) else h[9]
                lines.append(f"  10하우스(커리어): {sign}")

    # Current transits - ADD TIMING CONTEXT for 2025
    lines.append(f"\n현재 트랜짓 ({now.year}년 {now.month}월):")
    if now.year == 2025:
        if now.month <= 3:
            lines.append("- 토성 물고기자리: 감정적 경계 학습, 영적 성숙")
            lines.append("- 목성 쌍둥이자리: 소통과 학습의 확장기")
        elif now.month <= 6:
            lines.append("- 토성 양자리 입성 (5월): 새로운 책임과 도전의 시작")
            lines.append("- 목성 쌍둥이자리 마무리: 지식 확장 완료")
        else:
            lines.append("- 토성 양자리: 자기주도적 성장의 시기")
            lines.append("- 목성 게자리 (7월~): 가정/정서적 풍요")
        lines.append("- 명왕성 물병자리: 사회적 변혁, 개인의 독립성 강조")
    else:
        lines.append("- 주요 행성 트랜짓 참고하여 해석")

    # Interpretation hints
    if sun_sign or moon_sign:
        lines.append("\n해석 포인트:")
        if sun_sign:
            lines.append(f"  태양 {sun_sign}: 핵심 정체성, 삶의 목적")
        if moon_sign:
            lines.append(f"  달 {moon_sign}: 감정 패턴, 내면의 욕구")

    return "\n".join(lines) if lines else "점성술 정보 부족"


def _build_advanced_astro_context(advanced_astro: dict) -> str:
    """Build context from advanced astrology features (draconic, harmonics, progressions, etc.)."""
    if not advanced_astro:
        return ""

    lines = []

    # Draconic Chart (soul-level astrology)
    if advanced_astro.get("draconic"):
        draconic = advanced_astro["draconic"]
        if isinstance(draconic, dict):
            lines.append("\n드라코닉 차트 (영혼 레벨):")
            if draconic.get("sun"):
                lines.append(f"  - 드라코닉 태양: {draconic['sun']}")
            if draconic.get("moon"):
                lines.append(f"  - 드라코닉 달: {draconic['moon']}")
            if draconic.get("insights"):
                lines.append(f"  -> {draconic['insights'][:200]}")

    # Harmonics (personality layers)
    if advanced_astro.get("harmonics"):
        harmonics = advanced_astro["harmonics"]
        if isinstance(harmonics, dict):
            lines.append("\n하모닉 분석:")
            for key, value in list(harmonics.items())[:3]:
                if value:
                    lines.append(f"  - {key}: {value[:100] if isinstance(value, str) else value}")

    # Progressions (life timing)
    if advanced_astro.get("progressions"):
        prog = advanced_astro["progressions"]
        if isinstance(prog, dict):
            lines.append("\n프로그레션 (생애 타이밍):")
            if prog.get("secondary"):
                lines.append(f"  - 세컨더리: {prog['secondary'][:150] if isinstance(prog['secondary'], str) else prog['secondary']}")
            if prog.get("solarArc"):
                lines.append(f"  - 솔라 아크: {prog['solarArc'][:150] if isinstance(prog['solarArc'], str) else prog['solarArc']}")
            if prog.get("moonPhase"):
                lines.append(f"  - 현재 달 위상: {prog['moonPhase']}")

    # Solar Return (birthday year ahead)
    if advanced_astro.get("solarReturn"):
        sr = advanced_astro["solarReturn"]
        if isinstance(sr, dict) and sr.get("summary"):
            summary = sr['summary']
            if isinstance(summary, str):
                lines.append("\n솔라 리턴 (올해 생일 차트):")
                lines.append(f"  {summary[:200]}")

    # Lunar Return (monthly energy)
    if advanced_astro.get("lunarReturn"):
        lr = advanced_astro["lunarReturn"]
        if isinstance(lr, dict) and lr.get("summary"):
            summary = lr['summary']
            if isinstance(summary, str):
                lines.append("\n루나 리턴 (이번 달 에너지):")
                lines.append(f"  {summary[:200]}")

    # Asteroids (detailed personality)
    if advanced_astro.get("asteroids"):
        asteroids = advanced_astro["asteroids"]
        if isinstance(asteroids, (list, dict)):
            lines.append("\n소행성 분석:")
            if isinstance(asteroids, list):
                for ast in asteroids[:4]:
                    if isinstance(ast, dict):
                        interp = ast.get('interpretation', '')
                        interp_str = interp[:80] if isinstance(interp, str) else str(interp)[:80]
                        lines.append(f"  - {ast.get('name', '')}: {ast.get('sign', '')} {interp_str}")
            elif isinstance(asteroids, dict):
                for name, data in list(asteroids.items())[:4]:
                    if isinstance(data, dict):
                        interp = data.get('interpretation', '')
                        interp_str = interp[:80] if isinstance(interp, str) else str(interp)[:80]
                        lines.append(f"  - {name}: {data.get('sign', '')} {interp_str}")

    # Fixed Stars (fate/destiny points)
    if advanced_astro.get("fixedStars"):
        stars = advanced_astro["fixedStars"]
        if isinstance(stars, list) and stars:
            lines.append("\n고정항성 (운명 포인트):")
            for star in stars[:3]:
                if isinstance(star, dict):
                    interp = star.get('interpretation', '')
                    interp_str = interp[:100] if isinstance(interp, str) else str(interp)[:100]
                    lines.append(f"  - {star.get('name', '')}: {interp_str}")

    # Eclipses (transformation points)
    if advanced_astro.get("eclipses"):
        eclipses = advanced_astro["eclipses"]
        if isinstance(eclipses, (list, dict)):
            lines.append("\n일식/월식 영향:")
            if isinstance(eclipses, list):
                for ecl in eclipses[:2]:
                    if isinstance(ecl, dict):
                        interp = ecl.get('interpretation', '')
                        interp_str = interp[:100] if isinstance(interp, str) else str(interp)[:100]
                        lines.append(f"  - {ecl.get('type', '')}: {ecl.get('date', '')} - {interp_str}")
            elif isinstance(eclipses, dict):
                if eclipses.get("solar"):
                    solar = eclipses['solar']
                    solar_str = solar[:100] if isinstance(solar, str) else str(solar)[:100]
                    lines.append(f"  - 일식: {solar_str}")
                if eclipses.get("lunar"):
                    lunar = eclipses['lunar']
                    lunar_str = lunar[:100] if isinstance(lunar, str) else str(lunar)[:100]
                    lines.append(f"  - 월식: {lunar_str}")

    # Midpoints (relationship dynamics)
    if advanced_astro.get("midpoints"):
        mp = advanced_astro["midpoints"]
        if isinstance(mp, dict):
            lines.append("\n미드포인트 (핵심 조합):")
            if mp.get("sunMoon"):
                lines.append(f"  - 태양/달: {mp['sunMoon'][:100] if isinstance(mp['sunMoon'], str) else mp['sunMoon']}")
            if mp.get("ascMc"):
                lines.append(f"  - 상승/MC: {mp['ascMc'][:100] if isinstance(mp['ascMc'], str) else mp['ascMc']}")

    # Current Transits (personalized)
    if advanced_astro.get("transits"):
        transits = advanced_astro["transits"]
        if isinstance(transits, list) and transits:
            lines.append("\n현재 개인 트랜짓:")
            for transit in transits[:5]:
                if isinstance(transit, dict):
                    lines.append(f"  - {transit.get('aspect', '')}: {transit.get('interpretation', '')[:100]}")
                elif isinstance(transit, str):
                    lines.append(f"  - {transit[:100]}")

    # Extra Points (Lilith, Part of Fortune, etc.)
    if advanced_astro.get("extraPoints"):
        extra = advanced_astro["extraPoints"]
        if isinstance(extra, dict):
            lines.append("\n특수 포인트:")
            for name, data in list(extra.items())[:4]:
                if isinstance(data, dict):
                    lines.append(f"  - {name}: {data.get('sign', '')} {data.get('interpretation', '')[:80]}")
                elif isinstance(data, str):
                    lines.append(f"  - {name}: {data[:80]}")

    if lines:
        return "\n".join(lines)
    return ""
