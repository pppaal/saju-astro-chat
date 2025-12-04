"""
Lightweight signal extractor skeleton for astro/saju. Replace TODOs with real logic.
This is non-breaking: it returns optional dicts that can be appended to the context.
"""
from typing import Any, Dict, List, Tuple, Set


def _planets_by_house(planets: List[Dict[str, Any]]) -> Dict[int, List[str]]:
    by_house: Dict[int, List[str]] = {}
    for p in planets or []:
        try:
            h = int(p.get("house") or 0)
        except Exception:
            continue
        if h <= 0:
            continue
        by_house.setdefault(h, []).append(p.get("name"))
    return by_house


def _find_planets(planets: List[Dict[str, Any]], names: List[str], houses: List[int]) -> List[Tuple[str, int]]:
    hits = []
    for p in planets or []:
        name = p.get("name")
        if name not in names:
            continue
        try:
            h = int(p.get("house") or 0)
        except Exception:
            continue
        if h in houses:
            hits.append((name, h))
    return hits


def _planet_house(planets: List[Dict[str, Any]], name: str) -> int:
    for p in planets or []:
        if p.get("name") == name:
            try:
                return int(p.get("house") or 0)
            except Exception:
                return 0
    return 0


def _asc_ruler(sign: str) -> str:
    # Rough mapping using traditional rulerships
    rulers = {
        "양자리": "Mars",
        "황소자리": "Venus",
        "쌍둥이자리": "Mercury",
        "게자리": "Moon",
        "사자자리": "Sun",
        "처녀자리": "Mercury",
        "천칭자리": "Venus",
        "전갈자리": "Mars",
        "사수자리": "Jupiter",
        "염소자리": "Saturn",
        "물병자리": "Saturn",
        "물고기자리": "Jupiter",
    }
    # English fallback
    rulers_en = {
        "aries": "Mars",
        "taurus": "Venus",
        "gemini": "Mercury",
        "cancer": "Moon",
        "leo": "Sun",
        "virgo": "Mercury",
        "libra": "Venus",
        "scorpio": "Mars",
        "sagittarius": "Jupiter",
        "capricorn": "Saturn",
        "aquarius": "Saturn",
        "pisces": "Jupiter",
    }
    s = (sign or "").strip().lower()
    for k, v in rulers.items():
        if k in sign:
            return v
    for k, v in rulers_en.items():
        if k in s:
            return v
    return ""


def _aspect_counts(aspects: List[Dict[str, Any]], targets: Set[str]) -> Dict[str, int]:
    soft = {"conjunction", "trine", "sextile"}
    hard = {"square", "opposition"}
    soft_count = 0
    hard_count = 0
    for a in aspects or []:
        a_type = (a.get("type") or "").lower()
        if not a_type:
            continue
        names = set()
        for end_key in ("from", "to"):
            end = a.get(end_key)
            if isinstance(end, dict):
                nm = end.get("name")
                if nm:
                    names.add(nm)
        if names & targets:
            if a_type in soft:
                soft_count += 1
            if a_type in hard:
                hard_count += 1
    return {"soft": soft_count, "hard": hard_count}


def _compute_basic_aspects_from_positions(planets: List[Dict[str, Any]], targets: Set[str], orb: float = 6.0) -> Dict[str, int]:
    """Fallback: compute aspects by longitude if aspects array is empty."""
    desired = {
        "conjunction": 0,
        "sextile": 60,
        "square": 90,
        "trine": 120,
        "opposition": 180,
    }
    soft = {"conjunction", "trine", "sextile"}
    hard = {"square", "opposition"}
    def diff(a, b):
        d = abs(a - b) % 360
        return min(d, 360 - d)
    longitudes = {}
    for p in planets or []:
        name = p.get("name")
        lon = p.get("longitude")
        if name and isinstance(lon, (int, float)):
            longitudes[name] = float(lon)
    soft_count = 0
    hard_count = 0
    for t in targets:
        if t not in longitudes:
            continue
        lt = longitudes[t]
        for name, ln in longitudes.items():
            if name == t:
                continue
            d = diff(lt, ln)
            for a_type, angle in desired.items():
                if abs(d - angle) <= orb:
                    if a_type in soft:
                        soft_count += 1
                    if a_type in hard:
                        hard_count += 1
                    break
    return {"soft": soft_count, "hard": hard_count}


def _transit_aspects(transits: List[Dict[str, Any]], natal_targets: Set[str]) -> Dict[str, int]:
    soft = {"conjunction", "trine", "sextile"}
    hard = {"square", "opposition"}
    soft_count = 0
    hard_count = 0
    for tr in transits or []:
        a_type = (tr.get("type") or "").lower()
        if not a_type:
            continue
        target_name = None
        to = tr.get("to")
        if isinstance(to, dict):
            target_name = to.get("name")
        if target_name not in natal_targets:
            continue
        if a_type in soft:
            soft_count += 1
        if a_type in hard:
            hard_count += 1
    return {"soft": soft_count, "hard": hard_count}


def _sign_key(sign: str) -> str:
    s = (sign or "").lower()
    mapping = {
        "양자리": "aries",
        "황소자리": "taurus",
        "쌍둥이자리": "gemini",
        "게자리": "cancer",
        "사자자리": "leo",
        "처녀자리": "virgo",
        "천칭자리": "libra",
        "전갈자리": "scorpio",
        "사수자리": "sagittarius",
        "염소자리": "capricorn",
        "물병자리": "aquarius",
        "물고기자리": "pisces",
    }
    for k, v in mapping.items():
        if k in s:
            return v
    return s


def _dignity(name: str, sign: str) -> List[str]:
    # very simple dignity tags: rulership, exaltation, detriment, fall
    sign = _sign_key(sign)
    rulership = {
        "Sun": ["leo"],
        "Moon": ["cancer"],
        "Mercury": ["gemini", "virgo"],
        "Venus": ["taurus", "libra"],
        "Mars": ["aries", "scorpio"],
        "Jupiter": ["sagittarius", "pisces"],
        "Saturn": ["capricorn", "aquarius"],
    }
    exalt = {
        "Sun": "aries",
        "Moon": "taurus",
        "Mercury": "virgo",
        "Venus": "pisces",
        "Mars": "capricorn",
        "Jupiter": "cancer",
        "Saturn": "libra",
    }
    fall = {
        "Sun": "libra",
        "Moon": "scorpio",
        "Mercury": "pisces",
        "Venus": "virgo",
        "Mars": "cancer",
        "Jupiter": "capricorn",
        "Saturn": "aries",
    }
    detriment = {
        "Sun": "aquarius",
        "Moon": "capricorn",
        "Mercury": "sagittarius",
        "Venus": "scorpio",
        "Mars": "taurus",
        "Jupiter": "gemini",
        "Saturn": "cancer",
    }
    tags = []
    if sign:
        if sign in rulership.get(name, []):
            tags.append("rulership")
        if sign == exalt.get(name):
            tags.append("exaltation")
        if sign == detriment.get(name):
            tags.append("detriment")
        if sign == fall.get(name):
            tags.append("fall")
    return tags


def extract_astro_signals(facts: Dict[str, Any]) -> Dict[str, Any]:
    astro = facts.get("astro") or {}
    planets = astro.get("planets") or []
    asc = (astro.get("ascendant") or astro.get("asc")) or {}
    mc = astro.get("mc") or {}
    aspects = astro.get("aspects") or []
    transits = astro.get("transits") or []
    by_house = _planets_by_house(planets)

    # Career: Sun/Saturn/Jupiter/Mars in 10/6/2, MC sign
    career_hits = _find_planets(planets, ["Sun", "Saturn", "Jupiter", "Mars"], [10, 6, 2])
    # Wealth: Jupiter/Venus in 2/8
    wealth_hits = _find_planets(planets, ["Jupiter", "Venus"], [2, 8])
    # Love: Venus/Mars/Moon in 7/5
    love_hits = _find_planets(planets, ["Venus", "Mars", "Moon"], [7, 5])
    # Health: Saturn/Mars/Neptune in 6/12/1
    health_hits = _find_planets(planets, ["Saturn", "Mars", "Neptune"], [6, 12, 1])

    # Aspects to Sun/Moon/Asc/MC (use provided aspects or fallback by longitude)
    aspect_counts = _aspect_counts(aspects, {"Sun", "Moon", "Ascendant", "MC"})
    if not aspects:
        aspect_counts = _compute_basic_aspects_from_positions(planets, {"Sun", "Moon", "Ascendant", "MC"})

    asc_sign = asc.get("sign") if isinstance(asc, dict) else asc
    asc_ruler = _asc_ruler(asc_sign or "")
    chart_ruler_house = _planet_house(planets, asc_ruler) if asc_ruler else 0

    pof_house = _planet_house(planets, "Part of Fortune")

    transit_counts = {}
    if transits:
        transit_counts = _transit_aspects(transits, {"Sun", "Moon", "Ascendant", "MC"})
    dignities = {p.get("name"): _dignity(p.get("name"), p.get("sign")) for p in planets if p.get("name")}

    signals: Dict[str, Any] = {
        "career": {
          "planets_in_career_houses": career_hits,
          "mc_sign": mc.get("sign"),
          "asc_ruler": asc_ruler,
          "chart_ruler_house": chart_ruler_house,
        },
        "wealth": {
          "benefics_in_money_houses": wealth_hits,
          "pof_house": pof_house,
        },
        "love": {
          "venus_mars_moon_in_rel_houses": love_hits,
        },
        "health": {
          "malefics_in_health_houses": health_hits,
        },
        "meta": {
          "asc_sign": asc_sign,
          "house_counts": {h: len(v) for h, v in by_house.items()},
          "aspects_to_lights": aspect_counts,
          "transits_to_lights": transit_counts,
          "dignities": dignities,
        },
    }
    return signals


def extract_saju_signals(facts: Dict[str, Any]) -> Dict[str, Any]:
    saju = facts.get("saju") or {}
    facts_saju = saju.get("facts") or {}
    pillars = saju.get("pillars") or {}
    unse = (saju.get("unse") or {})
    sinsal = saju.get("sinsal") or {}
    five_elements = facts_saju.get("fiveElements") or facts_saju.get("five_elements") or {}
    day_master = facts_saju.get("dayMaster") or facts_saju.get("day_master") or {}

    # Simple imbalance check for health: any element 0 or >=3
    fe_flags = {}
    for k, v in five_elements.items():
        try:
            n = int(v)
        except Exception:
            continue
        if n == 0:
            fe_flags[f"{k}_zero"] = True
        if n >= 3:
            fe_flags[f"{k}_high"] = n

    lucky_element = None
    if five_elements:
        try:
            lucky_element = min(five_elements, key=lambda key: five_elements[key])
        except Exception:
            lucky_element = None

    # Career sample: check if month/day stem/branch sibsin include 관(정관/편관)
    def _sibsin_in_pillar(pillar: Dict[str, Any], target: List[str]):
        if not isinstance(pillar, dict):
            return False
        stem = (pillar.get("heavenlyStem") or {}).get("sibsin") or ""
        branch = (pillar.get("earthlyBranch") or {}).get("sibsin") or ""
        return any(t in stem for t in target) or any(t in branch for t in target)

    career_flag = _sibsin_in_pillar(pillars.get("month"), ["정관", "편관"]) or _sibsin_in_pillar(pillars.get("day"), ["정관", "편관"])

    # Wealth sample: 편재/정재 in month/day/time
    def _has_wealth(pillar: Dict[str, Any]):
        if not isinstance(pillar, dict):
            return False
        stem = (pillar.get("heavenlyStem") or {}).get("sibsin") or ""
        branch = (pillar.get("earthlyBranch") or {}).get("sibsin") or ""
        return any(t in stem for t in ["편재", "정재"]) or any(t in branch for t in ["편재", "정재"])

    wealth_flag = any(_has_wealth(pillars.get(k)) for k in ["month", "day", "time"])

    # Love sample: 도화/홍염 hits
    sinsal_hits = sinsal.get("hits") or []
    love_sinsal = [h for h in sinsal_hits if h.get("kind") in ["도화", "홍염", "도화살", "홍염살"]]

    # Fortune sample: counts of daeun/annual/monthly
    fortune_counts = {
        "daeun": len(unse.get("daeun") or []),
        "annual": len(unse.get("annual") or []),
        "monthly": len(unse.get("monthly") or []),
    }

    # Branch clash/simple harmony detection (among pillars)
    def branch(pillar: Dict[str, Any]):
        return (pillar or {}).get("earthlyBranch", {}).get("name") or ""

    branches = [branch(pillars.get(k)) for k in ["year", "month", "day", "time"] if pillars.get(k)]
    clash_pairs = {("子", "午"), ("午", "子"), ("卯", "酉"), ("酉", "卯"), ("辰", "戌"), ("戌", "辰"), ("丑", "未"), ("未", "丑"), ("寅", "申"), ("申", "寅"), ("巳", "亥"), ("亥", "巳")}
    clashes = []
    for i, b1 in enumerate(branches):
        for b2 in branches[i + 1 :]:
            if (b1, b2) in clash_pairs:
                clashes.append(f"{b1}-{b2}")

    sanhap_sets = [
        {"申", "子", "辰"},
        {"亥", "卯", "未"},
        {"寅", "午", "戌"},
        {"巳", "酉", "丑"},
    ]
    sanhap = []
    bset = set(branches)
    for trio in sanhap_sets:
        common = bset & trio
        if len(common) >= 2:
            sanhap.append("".join(sorted(common)))

    signals: Dict[str, Any] = {
        "career": {"has_officer_sibsin": career_flag},
        "wealth": {"has_wealth_sibsin": wealth_flag},
        "love": {"love_sinsal_hits": love_sinsal[:5], "love_sinsal_count": len(love_sinsal)},
        "health": {"five_element_flags": fe_flags},
        "fortune": fortune_counts,
        "meta": {
            "sinsal_hits": len(sinsal_hits),
            "clashes": clashes,
            "sanhap": sanhap,
            "day_master": day_master.get("name"),
            "lucky_element": lucky_element,
        },
    }
    return signals


def extract_signals(facts: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "astro": extract_astro_signals(facts),
        "saju": extract_saju_signals(facts),
    }
