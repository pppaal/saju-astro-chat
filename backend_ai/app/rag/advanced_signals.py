"""
Deterministic advanced signal extraction for Saju x Astro cross fusion.
"""

from __future__ import annotations

from collections import Counter
import math
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple


Signal = Dict[str, Any]


_SIGN_ELEMENT = {
    "aries": ("fire", "cardinal"),
    "taurus": ("earth", "fixed"),
    "gemini": ("air", "mutable"),
    "cancer": ("water", "cardinal"),
    "leo": ("fire", "fixed"),
    "virgo": ("earth", "mutable"),
    "libra": ("air", "cardinal"),
    "scorpio": ("water", "fixed"),
    "sagittarius": ("fire", "mutable"),
    "capricorn": ("earth", "cardinal"),
    "aquarius": ("air", "fixed"),
    "pisces": ("water", "mutable"),
}

_SIGN_RULER = {
    "aries": "Mars",
    "taurus": "Venus",
    "gemini": "Mercury",
    "cancer": "Moon",
    "leo": "Sun",
    "virgo": "Mercury",
    "libra": "Venus",
    "scorpio": "Pluto",
    "sagittarius": "Jupiter",
    "capricorn": "Saturn",
    "aquarius": "Uranus",
    "pisces": "Neptune",
}

_TEN_GOD_TAGS = {
    "비견": ["identity", "career"],
    "겁재": ["identity", "wealth"],
    "식신": ["career", "health"],
    "상관": ["career", "emotion"],
    "정재": ["wealth", "career"],
    "편재": ["wealth", "career"],
    "정관": ["career", "authority"],
    "편관": ["career", "timing"],
    "정인": ["identity", "spiritual"],
    "편인": ["identity", "spiritual"],
}

_AXIS_TAGS = {
    "relationship": {"relationship", "love", "family", "partnership"},
    "career": {"career", "work", "authority"},
    "wealth": {"wealth", "money", "finance", "resource"},
    "health": {"health", "stress", "recovery"},
    "emotion": {"emotion", "mind", "psychology"},
    "life_path": {"life_path", "spiritual", "identity", "karma"},
    "timing": {"timing", "cycle", "transit", "window"},
    "identity": {"identity", "self", "temperament"},
    "general": set(),
}


def _normalize_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return "unknown"
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^a-z0-9가-힣_]+", "", text)
    return text or "unknown"


def _safe_num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, round(float(value), 3)))


def _norm_tags(tags: Iterable[str]) -> List[str]:
    out = []
    seen = set()
    for tag in tags:
        token = str(tag or "").strip().lower()
        if not token or token in seen:
            continue
        seen.add(token)
        out.append(token)
    return out


def _signal(
    key: str,
    label: str,
    value: str,
    importance: float,
    tags: Iterable[str],
    raw_path: str,
) -> Signal:
    return {
        "key": key,
        "label": str(label or "").strip(),
        "value": str(value or "").strip(),
        "importance": _clamp01(importance),
        "tags": _norm_tags(tags),
        "raw_path": str(raw_path or "").strip(),
    }


def _get_in(data: Dict[str, Any], path: str, default: Any = None) -> Any:
    cur: Any = data
    for token in path.split("."):
        if not isinstance(cur, dict):
            return default
        cur = cur.get(token)
        if cur is None:
            return default
    return cur


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _is_nonempty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict, tuple, set)):
        return len(value) > 0
    return True


def _extract_planet_entries(astro_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    planets: List[Dict[str, Any]] = []

    raw_planets = astro_json.get("planets")
    if isinstance(raw_planets, dict):
        for name, data in raw_planets.items():
            row = {"name": str(name)}
            if isinstance(data, dict):
                row.update(data)
            planets.append(row)
    elif isinstance(raw_planets, list):
        for item in raw_planets:
            if isinstance(item, dict):
                planets.append(item)

    for name in (
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
        "pluto",
        "chiron",
        "lilith",
    ):
        node = astro_json.get(name)
        if isinstance(node, dict):
            merged = dict(node)
            merged.setdefault("name", name.title())
            planets.append(merged)

    # stable dedupe
    deduped: List[Dict[str, Any]] = []
    seen = set()
    for p in planets:
        key = (
            str(p.get("name", "")).lower(),
            str(p.get("sign", "")).lower(),
            str(p.get("house", "")),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)
    return deduped


def _extract_saju_ten_gods(saju_json: Dict[str, Any]) -> Dict[str, float]:
    candidates = [
        saju_json.get("tenGodsCount"),
        saju_json.get("sipsinDistribution"),
        _get_in(saju_json, "advancedAnalysis.sibsin.distribution"),
        _get_in(saju_json, "tenGods.distribution"),
    ]
    for cand in candidates:
        if isinstance(cand, dict) and cand:
            out: Dict[str, float] = {}
            for k, v in cand.items():
                n = _safe_num(v, default=0.0)
                if n > 0:
                    out[str(k)] = n
            if out:
                return out
    return {}


def _extract_saju_relations(saju_json: Dict[str, Any]) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    relations = saju_json.get("relations")
    if isinstance(relations, list):
        for item in relations:
            if not isinstance(item, dict):
                continue
            kind = str(item.get("kind") or item.get("type") or "").strip()
            detail = str(item.get("detail") or item.get("note") or "").strip()
            if kind:
                out.append((kind, detail))

    hyeongchung = _get_in(saju_json, "advancedAnalysis.hyeongchung")
    if isinstance(hyeongchung, dict):
        for kind, values in hyeongchung.items():
            if not isinstance(values, list):
                continue
            for item in values:
                if isinstance(item, dict):
                    detail = str(item.get("type") or item.get("detail") or "").strip()
                    out.append((str(kind), detail))
                elif _is_nonempty(item):
                    out.append((str(kind), str(item)))
    return out[:20]


def _extract_saju_hidden_stems(saju_json: Dict[str, Any]) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []

    def _collect_from_pillar(pillar_name: str, pillar_data: Any) -> None:
        if not isinstance(pillar_data, dict):
            return
        jijanggan = pillar_data.get("jijanggan")
        if isinstance(jijanggan, dict):
            names = []
            for slot in ("chogi", "junggi", "jeonggi"):
                node = jijanggan.get(slot)
                if isinstance(node, dict):
                    nm = str(node.get("name") or "").strip()
                    if nm:
                        names.append(nm)
                elif isinstance(node, str) and node.strip():
                    names.append(node.strip())
            if names:
                out.append((pillar_name, ", ".join(names)))

    pillars = _as_dict(saju_json.get("pillars"))
    for k in ("year", "month", "day", "time"):
        _collect_from_pillar(k, pillars.get(k))
    for k in ("yearPillar", "monthPillar", "dayPillar", "timePillar"):
        _collect_from_pillar(k, saju_json.get(k))
    return out[:8]


def _extract_saju_cycle_tokens(saju_json: Dict[str, Any]) -> List[str]:
    tokens: List[str] = []

    daeun = _as_dict(saju_json.get("daeun"))
    for key in ("current",):
        cur = _as_dict(daeun.get(key))
        if cur:
            stem = str(cur.get("heavenlyStem") or cur.get("stem") or "").strip()
            branch = str(cur.get("earthlyBranch") or cur.get("branch") or "").strip()
            sipsin = cur.get("sipsin")
            if isinstance(sipsin, dict):
                sipsin = f"{sipsin.get('cheon', '')}/{sipsin.get('ji', '')}"
            token = " ".join([x for x in [stem + branch if (stem or branch) else "", str(sipsin or "").strip()] if x]).strip()
            if token:
                tokens.append(f"daeun:{token}")
        for row in _as_list(daeun.get("list"))[:3]:
            if not isinstance(row, dict):
                continue
            stem = str(row.get("heavenlyStem") or "").strip()
            branch = str(row.get("earthlyBranch") or "").strip()
            age = str(row.get("age") or row.get("startAge") or "").strip()
            val = (stem + branch).strip()
            if val:
                tokens.append(f"daeun:{val}:{age}" if age else f"daeun:{val}")

    unse = _as_dict(saju_json.get("unse"))
    for row in _as_list(unse.get("annual"))[:3]:
        if isinstance(row, dict):
            year = row.get("year")
            ganji = str(row.get("ganji") or "").strip()
            if year or ganji:
                tokens.append(f"annual:{year}:{ganji}")
    for row in _as_list(unse.get("monthly"))[:3]:
        if isinstance(row, dict):
            year = row.get("year")
            month = row.get("month")
            ganji = str(row.get("ganji") or "").strip()
            if year or month or ganji:
                tokens.append(f"monthly:{year}-{month}:{ganji}")

    for row in _as_list(_get_in(saju_json, "advancedAnalysis.monthlyLuck"))[:3]:
        if isinstance(row, dict):
            month = str(row.get("month") or "").strip()
            sipsin = str(row.get("sipsin") or "").strip()
            if month or sipsin:
                tokens.append(f"monthlyLuck:{month}:{sipsin}")

    # stable unique
    seen = set()
    out = []
    for token in tokens:
        t = token.strip()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out[:10]


def extract_saju_advanced_signals(saju_json: Dict[str, Any]) -> List[Signal]:
    """
    Deterministically extract advanced Saju signals.
    Never raises; returns [] if inputs are unavailable.
    """
    try:
        if not isinstance(saju_json, dict) or not saju_json:
            return []

        signals: List[Signal] = []

        # 1) Day master strength
        strength = (
            _get_in(saju_json, "advancedAnalysis.extended.strength.level")
            or _get_in(saju_json, "advancedAnalysis.deukryeong.strength")
            or _get_in(saju_json, "dayMaster.strength")
        )
        if _is_nonempty(strength):
            val = str(strength).strip()
            signals.append(
                _signal(
                    key=f"saju.day_master.strength.{_normalize_key(val)}",
                    label="일간 강약",
                    value=val,
                    importance=0.88,
                    tags=["identity", "career", "life_path"],
                    raw_path="advancedAnalysis.extended.strength.level",
                )
            )

        # 2) 용신/기신
        yongsin = _as_dict(_get_in(saju_json, "advancedAnalysis.yongsin"))
        primary_yongsin = (
            yongsin.get("primaryYongsin")
            or yongsin.get("primary")
            or yongsin.get("element")
            or _get_in(saju_json, "yongsin.primary")
        )
        if _is_nonempty(primary_yongsin):
            py = str(primary_yongsin).strip()
            signals.append(
                _signal(
                    key=f"saju.yongsin.primary.{_normalize_key(py)}",
                    label="용신",
                    value=py,
                    importance=0.9,
                    tags=["timing", "health", "career", "wealth"],
                    raw_path="advancedAnalysis.yongsin.primaryYongsin",
                )
            )
        kibsin = yongsin.get("kibsin") or yongsin.get("avoid") or _get_in(saju_json, "kisin.elements")
        if _is_nonempty(kibsin):
            kb = str(kibsin).strip()
            signals.append(
                _signal(
                    key=f"saju.kisin.{_normalize_key(kb)}",
                    label="기신",
                    value=kb,
                    importance=0.72,
                    tags=["health", "timing"],
                    raw_path="advancedAnalysis.yongsin.kibsin",
                )
            )

        # 3) 십신 분포
        ten_gods = _extract_saju_ten_gods(saju_json)
        if ten_gods:
            max_count = max(ten_gods.values()) if ten_gods else 1.0
            for god, count in sorted(ten_gods.items(), key=lambda kv: kv[1], reverse=True)[:6]:
                rel = count / max_count if max_count else 0.0
                signals.append(
                    _signal(
                        key=f"saju.ten_gods.{_normalize_key(god)}",
                        label=f"십신 {god}",
                        value=f"count={count:g}",
                        importance=0.65 + 0.3 * rel,
                        tags=_TEN_GOD_TAGS.get(god, ["identity"]),
                        raw_path="tenGodsCount",
                    )
                )
        dominant = _get_in(saju_json, "tenGods.dominant")
        if isinstance(dominant, dict):
            dominant = dominant.get("name") or dominant.get("ko")
        if _is_nonempty(dominant):
            dom = str(dominant).strip()
            signals.append(
                _signal(
                    key=f"saju.ten_gods.dominant.{_normalize_key(dom)}",
                    label="십신 우세",
                    value=dom,
                    importance=0.85,
                    tags=_TEN_GOD_TAGS.get(dom, ["identity"]),
                    raw_path="tenGods.dominant",
                )
            )

        # 4) 지장간
        hidden = _extract_saju_hidden_stems(saju_json)
        for pillar_name, stems in hidden[:4]:
            signals.append(
                _signal(
                    key=f"saju.hidden_stems.{_normalize_key(pillar_name)}",
                    label=f"지장간 {pillar_name}",
                    value=stems,
                    importance=0.66,
                    tags=["identity", "timing", "life_path"],
                    raw_path=f"pillars.{pillar_name}.jijanggan",
                )
            )

        # 5) 합/충/형/파/해
        relations = _extract_saju_relations(saju_json)
        for kind, detail in relations[:6]:
            val = f"{kind} {detail}".strip()
            low = val.lower()
            tags = ["relationship", "timing"]
            if "관계" in low or "합" in low:
                tags.append("love")
            if "충" in low or "형" in low or "파" in low or "해" in low:
                tags.append("emotion")
            signals.append(
                _signal(
                    key=f"saju.relations.{_normalize_key(kind)}",
                    label="합충형파해",
                    value=val,
                    importance=0.69,
                    tags=tags,
                    raw_path="relations",
                )
            )

        # 6) 대운/세운/월운 토큰
        cycle_tokens = _extract_saju_cycle_tokens(saju_json)
        if cycle_tokens:
            signals.append(
                _signal(
                    key="saju.timeline.tokens",
                    label="운세 타임라인",
                    value=" | ".join(cycle_tokens[:6]),
                    importance=0.84,
                    tags=["timing", "career", "relationship", "wealth"],
                    raw_path="daeun/unse",
                )
            )

        # 7) 신살
        shinsal_values: List[str] = []
        for cand in (
            saju_json.get("shinsal"),
            saju_json.get("shinsalRaw"),
            saju_json.get("sinsal"),
            saju_json.get("specialStars"),
        ):
            if isinstance(cand, list):
                for item in cand:
                    if isinstance(item, dict):
                        kind = item.get("kind") or item.get("name")
                        if _is_nonempty(kind):
                            shinsal_values.append(str(kind))
                    elif _is_nonempty(item):
                        shinsal_values.append(str(item))
            elif isinstance(cand, dict):
                for key, value in cand.items():
                    if _is_nonempty(value):
                        shinsal_values.append(str(key))
        seen = set()
        shinsal_unique = []
        for val in shinsal_values:
            token = str(val).strip()
            if not token or token in seen:
                continue
            seen.add(token)
            shinsal_unique.append(token)
        if shinsal_unique:
            signals.append(
                _signal(
                    key="saju.shinsal.active",
                    label="신살 활성",
                    value=", ".join(shinsal_unique[:5]),
                    importance=0.64,
                    tags=["relationship", "timing", "emotion"],
                    raw_path="shinsal",
                )
            )

        # stable dedupe by key
        dedup: List[Signal] = []
        seen_keys = set()
        for sig in signals:
            key = sig.get("key")
            if not key or key in seen_keys:
                continue
            seen_keys.add(key)
            if sig.get("label") and sig.get("value"):
                dedup.append(sig)
        return dedup
    except Exception:
        return []


def _extract_aspects(astro_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    aspects = astro_json.get("aspects")
    out: List[Dict[str, Any]] = []
    if isinstance(aspects, list):
        for item in aspects:
            if not isinstance(item, dict):
                continue
            out.append(item)
    elif isinstance(aspects, dict):
        for item in aspects.values():
            if isinstance(item, dict):
                out.append(item)
    return out


def _planet_name(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("name")
    return str(value or "").strip()


def _planet_sign(value: Any) -> str:
    return str(value or "").strip()


def _planet_house(value: Any) -> Optional[int]:
    try:
        n = int(value)
        if 1 <= n <= 12:
            return n
    except Exception:
        pass
    if isinstance(value, str):
        m = re.search(r"(\d{1,2})", value)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 12:
                return n
    return None


def extract_astro_advanced_signals(astro_json: Dict[str, Any]) -> List[Signal]:
    """
    Deterministically extract advanced Astrology signals.
    Never raises; returns [] if inputs are unavailable.
    """
    try:
        if not isinstance(astro_json, dict) or not astro_json:
            return []

        signals: List[Signal] = []
        planets = _extract_planet_entries(astro_json)

        # 1) Houses/angles emphasis
        house_planets: Dict[int, List[str]] = {}
        sign_counter: Counter[str] = Counter()
        for p in planets:
            name = _planet_name(p.get("name"))
            sign = _planet_sign(p.get("sign")).lower()
            house = _planet_house(p.get("house"))
            if sign:
                sign_counter[sign] += 1
            if house:
                house_planets.setdefault(house, []).append(name or "Planet")
        for house, names in sorted(house_planets.items(), key=lambda kv: len(kv[1]), reverse=True)[:3]:
            if not names:
                continue
            importance = min(1.0, 0.5 + 0.15 * len(names))
            signals.append(
                _signal(
                    key=f"astro.house.emphasis.h{house}",
                    label=f"{house}하우스 강조",
                    value=", ".join(names[:4]),
                    importance=importance,
                    tags=["career" if house in (2, 6, 10, 11) else "relationship" if house in (5, 7, 8) else "identity", "timing"],
                    raw_path="planets.*.house",
                )
            )

        asc = _as_dict(astro_json.get("ascendant") or astro_json.get("asc") or astro_json.get("rising"))
        asc_sign = str(asc.get("sign") or "").strip().lower()
        if asc_sign:
            ruler = _SIGN_RULER.get(asc_sign, "")
            ruler_pos = None
            for p in planets:
                if _planet_name(p.get("name")).lower() == ruler.lower():
                    ruler_pos = p
                    break
            val = ruler
            if ruler_pos:
                val = f"{ruler} in {ruler_pos.get('sign', '?')} H{ruler_pos.get('house', '?')}"
            signals.append(
                _signal(
                    key=f"astro.chart_ruler.{_normalize_key(ruler or asc_sign)}",
                    label="차트 룰러",
                    value=val or asc_sign,
                    importance=0.86,
                    tags=["identity", "life_path", "career"],
                    raw_path="ascendant.sign",
                )
            )

        # 2) Aspects + patterns
        aspects = _extract_aspects(astro_json)
        aspect_counter: Counter[str] = Counter()
        for item in aspects:
            typ = str(item.get("aspectType") or item.get("type") or item.get("aspect") or "").strip().lower()
            if typ:
                aspect_counter[typ] += 1
        for typ, count in aspect_counter.most_common(3):
            signals.append(
                _signal(
                    key=f"astro.aspects.{_normalize_key(typ)}",
                    label=f"주요 애스펙트 {typ}",
                    value=f"count={count}",
                    importance=min(1.0, 0.55 + count * 0.08),
                    tags=["emotion", "relationship", "timing"],
                    raw_path="aspects",
                )
            )

        for sign, count in sign_counter.items():
            if count >= 3:
                signals.append(
                    _signal(
                        key=f"astro.pattern.stellium.{_normalize_key(sign)}",
                        label="스텔리움",
                        value=f"{sign.title()} {count} planets",
                        importance=min(1.0, 0.7 + (count - 3) * 0.07),
                        tags=["identity", "life_path", "career"],
                        raw_path="planets",
                    )
                )
                break
        if aspect_counter.get("square", 0) >= 2 and aspect_counter.get("opposition", 0) >= 1:
            signals.append(
                _signal(
                    key="astro.pattern.t_square",
                    label="T-스퀘어 가능성",
                    value="square/opposition cluster",
                    importance=0.79,
                    tags=["timing", "emotion", "career"],
                    raw_path="aspects",
                )
            )
        if aspect_counter.get("trine", 0) >= 3:
            signals.append(
                _signal(
                    key="astro.pattern.grand_trine",
                    label="그랜드 트라인 가능성",
                    value="trine cluster",
                    importance=0.78,
                    tags=["relationship", "career", "life_path"],
                    raw_path="aspects",
                )
            )

        # 3) Element / modality balance
        element_ratios = _as_dict(astro_json.get("elementRatios"))
        if not element_ratios:
            # derive from signs
            derived = Counter()
            for sign, cnt in sign_counter.items():
                elem_mod = _SIGN_ELEMENT.get(sign)
                if elem_mod:
                    derived[elem_mod[0]] += cnt
            if derived:
                total = float(sum(derived.values()) or 1.0)
                element_ratios = {k: (v / total) * 100.0 for k, v in derived.items()}
        if element_ratios:
            dominant_el = max(element_ratios.items(), key=lambda kv: _safe_num(kv[1]))[0]
            signals.append(
                _signal(
                    key=f"astro.element.dominant.{_normalize_key(dominant_el)}",
                    label="원소 비중",
                    value=f"{dominant_el} dominant",
                    importance=0.8,
                    tags=["identity", "emotion", "life_path"],
                    raw_path="elementRatios",
                )
            )

        modality_ratios = _as_dict(astro_json.get("modalityRatios"))
        if not modality_ratios:
            derived_mod = Counter()
            for sign, cnt in sign_counter.items():
                elem_mod = _SIGN_ELEMENT.get(sign)
                if elem_mod:
                    derived_mod[elem_mod[1]] += cnt
            if derived_mod:
                total = float(sum(derived_mod.values()) or 1.0)
                modality_ratios = {k: (v / total) * 100.0 for k, v in derived_mod.items()}
        if modality_ratios:
            dominant_mod = max(modality_ratios.items(), key=lambda kv: _safe_num(kv[1]))[0]
            signals.append(
                _signal(
                    key=f"astro.modality.dominant.{_normalize_key(dominant_mod)}",
                    label="모달리티 비중",
                    value=f"{dominant_mod} dominant",
                    importance=0.74,
                    tags=["timing", "career", "identity"],
                    raw_path="modalityRatios",
                )
            )

        # 4) Transits / progressions / solar return
        transits = _as_list(astro_json.get("transits"))
        if transits:
            majors = []
            for t in transits:
                if not isinstance(t, dict):
                    continue
                tp = str(t.get("transitPlanet") or t.get("planet") or "").strip()
                ap = str(t.get("aspectType") or t.get("aspect") or "").strip()
                np = str(t.get("natalPlanet") or t.get("to") or "").strip()
                if tp or ap or np:
                    majors.append(" ".join([x for x in [tp, ap, np] if x]))
                if len(majors) >= 3:
                    break
            if majors:
                signals.append(
                    _signal(
                        key="astro.transits.active",
                        label="활성 트랜짓",
                        value=" | ".join(majors),
                        importance=0.9,
                        tags=["timing", "career", "relationship"],
                        raw_path="transits",
                    )
                )

        if _is_nonempty(astro_json.get("progressions")) or _is_nonempty(astro_json.get("progressed")):
            signals.append(
                _signal(
                    key="astro.progressions.present",
                    label="프로그레션 정보",
                    value="present",
                    importance=0.72,
                    tags=["timing", "life_path"],
                    raw_path="progressions",
                )
            )
        if _is_nonempty(astro_json.get("solarReturn")) or _is_nonempty(astro_json.get("solar_return")):
            signals.append(
                _signal(
                    key="astro.solar_return.present",
                    label="솔라리턴 정보",
                    value="present",
                    importance=0.71,
                    tags=["timing", "life_path", "career"],
                    raw_path="solarReturn",
                )
            )

        # stable dedupe by key
        dedup: List[Signal] = []
        seen = set()
        for sig in signals:
            key = sig.get("key")
            if not key or key in seen:
                continue
            seen.add(key)
            if sig.get("label") and sig.get("value"):
                dedup.append(sig)
        return dedup
    except Exception:
        return []


def score_signal_for_axis(signal: Signal, axis: str) -> float:
    tags = set(_norm_tags(signal.get("tags") or []))
    axis_tags = _AXIS_TAGS.get((axis or "general").lower(), set())
    if not axis_tags:
        return float(signal.get("importance") or 0.0)
    overlap = len(tags.intersection(axis_tags))
    importance = float(signal.get("importance") or 0.0)
    return importance + (0.45 if overlap > 0 else 0.0) + min(0.2, overlap * 0.06)


def select_signals_for_axis(signals: List[Signal], axis: str, limit: int = 2) -> List[Signal]:
    if not signals or limit <= 0:
        return []
    ranked = sorted(
        signals,
        key=lambda s: (score_signal_for_axis(s, axis), float(s.get("importance") or 0.0), s.get("key", "")),
        reverse=True,
    )
    out = []
    seen = set()
    for sig in ranked:
        key = sig.get("key")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(sig)
        if len(out) >= limit:
            break
    return out


def build_advanced_link_text(axis: str, saju_selected: List[Signal], astro_selected: List[Signal]) -> str:
    if not saju_selected or not astro_selected:
        return ""
    s = saju_selected[0]
    a = astro_selected[0]
    s_label = str(s.get("label") or "사주 신호")
    a_label = str(a.get("label") or "점성 신호")
    s_val = str(s.get("value") or "").strip()
    a_val = str(a.get("value") or "").strip()
    axis_key = (axis or "general").lower()
    axis_phrase = {
        "relationship": "관계 축",
        "career": "커리어 축",
        "wealth": "재물 축",
        "health": "건강 축",
        "emotion": "감정 축",
        "life_path": "인생 경로 축",
        "timing": "타이밍 축",
        "identity": "정체성 축",
    }.get(axis_key, "종합 축")
    s_part = f"{s_label}({s_val})" if s_val else s_label
    a_part = f"{a_label}({a_val})" if a_val else a_label
    return f"{axis_phrase}에서 {s_part}와 {a_part}가 같은 방향의 고급 신호로 연결됩니다."
