# backend_ai/app/iching_rag.py
"""
Premium I Ching RAG Engine - Enhanced Edition
==============================================
Features:
- 64 hexagram interpretations with Korean/English
- Theme-specific readings (career, love, health, wealth, timing)
- Five Element (五行) analysis with 상생/상극 relationships
- Nuclear hexagram (互卦), Opposite hexagram (錯卦), Reverse hexagram (綜卦)
- Advanced changing line interpretation rules
- Seasonal and timing analysis (24절기)
- Trigram imagery and symbolism
- Saju cross-analysis with day master element
- Position-based line analysis (爻位)
- Hybrid RAG search for related wisdom

Phase 3.5 Refactored: Extracted data loading, wuxing, and hexagram calc to iching package.
"""

import random
from typing import Dict, List, Optional

# ===============================================================
# CONFIGURATION
# ===============================================================
_SUPPORTED_LOCALES = frozenset(["ko", "en"])
_DEFAULT_LOCALE = "ko"

_THEME_NAMES_KO = {
    "career": "직업/사업",
    "love": "연애/결혼",
    "health": "건강",
    "wealth": "재물/투자",
    "timing": "시기/타이밍",
    "general": "종합",
}

# Trigram combination interpretations
_TRIGRAM_INTERPRETATIONS = {
    ("heaven", "heaven"): "하늘이 거듭되니 순수한 창조의 힘입니다. 끊임없이 나아가세요.",
    ("earth", "earth"): "땅이 거듭되니 무한한 수용력입니다. 덕을 쌓아 만물을 품으세요.",
    ("water", "thunder"): "구름과 우레가 만나니 시작의 어려움입니다. 인내하면 돌파합니다.",
    ("mountain", "water"): "산 아래 샘물이니 어린 시절의 배움입니다. 겸손히 구하세요.",
    ("water", "heaven"): "구름이 하늘에 있으니 기다림의 때입니다. 준비하며 때를 기다리세요.",
    ("heaven", "water"): "하늘과 물이 어긋나니 다툼의 상입니다. 화해를 구하세요.",
    ("earth", "water"): "땅 속에 물이 있으니 군대의 상입니다. 조직과 규율이 필요합니다.",
    ("water", "earth"): "물이 땅 위에 있으니 친함의 상입니다. 화합하고 단결하세요.",
    ("wind", "heaven"): "바람이 하늘에 부니 작은 축적입니다. 조금씩 모으세요.",
    ("heaven", "lake"): "하늘 아래 연못이니 예의의 상입니다. 조심히 처신하세요.",
    ("earth", "heaven"): "땅과 하늘이 교류하니 태평의 상입니다. 모든 것이 순조롭습니다.",
    ("heaven", "earth"): "하늘과 땅이 막히니 비색의 상입니다. 물러나 때를 기다리세요.",
    ("fire", "heaven"): "불이 하늘에 있으니 동지의 상입니다. 뜻을 같이하는 이와 함께하세요.",
    ("heaven", "fire"): "하늘 위에 불이니 크게 소유함입니다. 겸손히 나누세요.",
    ("earth", "mountain"): "땅 속에 산이니 겸손의 상입니다. 낮출수록 높아집니다.",
    ("thunder", "earth"): "우레가 땅에서 나오니 기쁨의 상입니다. 음악과 화합으로 즐기세요.",
}

# Corresponding lines mapping (應爻)
_CORRESPONDING_LINES = {1: 4, 2: 5, 3: 6, 4: 1, 5: 2, 6: 3}


# ===============================================================
# IMPORTS FROM ICHING PACKAGE
# ===============================================================
try:
    from backend_ai.app.iching import (
        # Constants
        WUXING_GENERATING,
        WUXING_OVERCOMING,
        WUXING_KOREAN,
        TRIGRAM_INFO,
        LINE_POSITION_MEANING,
        SOLAR_TERMS,
        SEASON_ELEMENT,
        # Data loading
        load_premium_data,
        load_complete_hexagram_data,
        load_changing_lines_data,
        # Wuxing analysis
        get_current_season,
        get_current_solar_term,
        analyze_seasonal_harmony,
        analyze_wuxing_relationship,
        get_saju_element_analysis,
        # Hexagram calculation
        binary_to_hexagram_num as _binary_to_hexagram_num,
        calculate_nuclear_hexagram,
        calculate_opposite_hexagram,
        calculate_reverse_hexagram,
        get_related_hexagrams,
        cast_hexagram,
    )
except ImportError:
    from app.iching import (
        WUXING_GENERATING,
        WUXING_OVERCOMING,
        WUXING_KOREAN,
        TRIGRAM_INFO,
        LINE_POSITION_MEANING,
        SOLAR_TERMS,
        SEASON_ELEMENT,
        load_premium_data,
        load_complete_hexagram_data,
        load_changing_lines_data,
        get_current_season,
        get_current_solar_term,
        analyze_seasonal_harmony,
        analyze_wuxing_relationship,
        get_saju_element_analysis,
        binary_to_hexagram_num as _binary_to_hexagram_num,
        calculate_nuclear_hexagram,
        calculate_opposite_hexagram,
        calculate_reverse_hexagram,
        get_related_hexagrams,
        cast_hexagram,
    )

# Embedding utilities (optional)
try:
    from saju_astro_rag import search_graphs
    _HAS_EMBEDDING = True
except ImportError:
    _HAS_EMBEDDING = False


# ===============================================================
# CHANGING LINE ANALYSIS
# ===============================================================
def get_changing_line_rule(
    changing_lines: List[int],
    hexagram_num: int,
    resulting_num: Optional[int] = None
) -> Dict:
    """
    Get the traditional I Ching interpretation rule based on number of changing lines.

    Traditional rules (朱熹 周易本義):
    - 0 lines: Read primary hexagram judgment only
    - 1 line: Read that line's text from primary hexagram
    - 2 lines: Read upper line's text, lower as secondary
    - 3 lines: Read both hexagram judgments, primary as main
    - 4 lines: Read lower unchanged line from resulting hexagram
    - 5 lines: Read single unchanged line from resulting hexagram
    - 6 lines: Special cases (乾用九, 坤用六) or read resulting judgment
    """
    if not changing_lines:
        return {
            "rule": "무변(無變)",
            "rule_chinese": "無變",
            "description": "변효가 없으니 본괘의 괘사(彖辭)만으로 해석합니다.",
            "focus": "primary_judgment",
            "detail": "현재 상태가 안정적입니다. 본괘의 가르침을 따르세요."
        }

    line_count = len(changing_lines)
    sorted_lines = sorted(changing_lines)
    all_lines = {1, 2, 3, 4, 5, 6}

    if line_count == 1:
        line = sorted_lines[0]
        position_info = LINE_POSITION_MEANING.get(line, {})
        return {
            "rule": "단변(單變)",
            "rule_chinese": "一爻變",
            "description": f"{line}효 하나만 변하니, 본괘의 {line}효 효사(爻辭)가 핵심입니다.",
            "focus": "single_line",
            "focus_line": line,
            "position_meaning": position_info,
            "detail": f"{position_info.get('name', '')}가 변합니다. {position_info.get('meaning', '')}의 단계에서 변화가 일어납니다."
        }

    if line_count == 2:
        upper, lower = sorted_lines[-1], sorted_lines[0]
        return {
            "rule": "이변(二變)",
            "rule_chinese": "二爻變",
            "description": f"{lower}, {upper}효가 변합니다. 위 효인 {upper}효를 주(主)로, {lower}효를 보조로 해석합니다.",
            "focus": "two_lines_upper",
            "focus_line": upper,
            "secondary_line": lower,
            "detail": f"두 효가 함께 움직이니 변화의 폭이 큽니다. {upper}효의 메시지가 핵심입니다."
        }

    if line_count == 3:
        return {
            "rule": "삼변(三變)",
            "rule_chinese": "三爻變",
            "description": "세 효가 변하니, 본괘와 지괘(변괘)의 괘사를 함께 보되 본괘 괘사가 중심입니다.",
            "focus": "both_judgments",
            "primary_weight": 0.6,
            "resulting_weight": 0.4,
            "detail": "현재(본괘)와 미래(지괘)를 함께 보아야 합니다. 현재 상황이 우선이나 미래 방향도 참고하세요."
        }

    if line_count == 4:
        unchanged = sorted(all_lines - set(sorted_lines))
        lower_unchanged = unchanged[0]
        return {
            "rule": "사변(四變)",
            "rule_chinese": "四爻變",
            "description": f"변하지 않는 {unchanged[0]}, {unchanged[1]}효 중 아래 효인 {lower_unchanged}효의 지괘 효사를 봅니다.",
            "focus": "resulting_lower_unchanged",
            "focus_line": lower_unchanged,
            "unchanged_lines": unchanged,
            "detail": f"대부분이 변하나 {unchanged}효가 남아 있습니다. 이 불변의 힘이 중심을 잡아줍니다."
        }

    if line_count == 5:
        unchanged = list(all_lines - set(sorted_lines))[0]
        position_info = LINE_POSITION_MEANING.get(unchanged, {})
        return {
            "rule": "오변(五變)",
            "rule_chinese": "五爻變",
            "description": f"{unchanged}효만 변하지 않습니다. 이 불변효의 지괘 효사가 핵심입니다.",
            "focus": "resulting_single_unchanged",
            "focus_line": unchanged,
            "position_meaning": position_info,
            "detail": f"거의 모든 것이 변하나 {position_info.get('name', '')}만 굳건합니다. 이것이 지켜야 할 핵심입니다."
        }

    # 6 lines - special cases
    if hexagram_num == 1 and resulting_num == 2:
        return {
            "rule": "용구(用九)",
            "rule_chinese": "用九",
            "description": "건괘의 모든 양효가 변하니, 용구(用九)를 봅니다: '見群龍無首 吉'",
            "focus": "special_yong_jiu",
            "special_text": "群龍無首 吉",
            "special_meaning": "여러 용이 나타나되 우두머리가 없으니 길하다",
            "detail": "모든 리더가 되려 하지 말고 겸손히 물러나면 길합니다."
        }

    if hexagram_num == 2 and resulting_num == 1:
        return {
            "rule": "용육(用六)",
            "rule_chinese": "用六",
            "description": "곤괘의 모든 음효가 변하니, 용육(用六)을 봅니다: '利永貞'",
            "focus": "special_yong_liu",
            "special_text": "利永貞",
            "special_meaning": "영원히 바르게 함이 이롭다",
            "detail": "음에서 양으로 완전히 전환됩니다. 끝까지 바른 도를 지키면 강건함을 얻습니다."
        }

    return {
        "rule": "전효변(全爻變)",
        "rule_chinese": "六爻皆變",
        "description": "6효가 모두 변하니, 지괘(변괘)의 괘사를 중심으로 해석합니다.",
        "focus": "resulting_judgment",
        "detail": "완전한 변혁의 시기입니다. 과거를 버리고 미래(지괘)의 가르침을 따르세요."
    }


def get_line_position_analysis(line_num: int, is_yang: bool) -> Dict:
    """Get detailed position-based analysis for a changing line."""
    position = LINE_POSITION_MEANING.get(line_num, {})

    # 중정(中正) 분석 - 2,5효가 중(中), 홀수효는 양이, 짝수효는 음이 정(正)
    is_center = line_num in [2, 5]
    is_correct = (line_num % 2 == 1 and is_yang) or (line_num % 2 == 0 and not is_yang)

    analysis = {
        "position": position,
        "is_center": is_center,
        "is_correct": is_correct,
        "corresponding_line": _CORRESPONDING_LINES.get(line_num),
    }

    if is_center and is_correct:
        analysis["zhong_zheng"] = "중정(中正)"
        analysis["zhong_zheng_meaning"] = "가장 이상적인 위치입니다. 중용을 지키며 바른 자리에 있습니다."
    elif is_center:
        analysis["zhong_zheng"] = "중(中)"
        analysis["zhong_zheng_meaning"] = "중앙에 있으나 정위(正位)는 아닙니다. 중용은 있으나 완벽하지 않습니다."
    elif is_correct:
        analysis["zhong_zheng"] = "정(正)"
        analysis["zhong_zheng_meaning"] = "바른 자리에 있습니다. 위치에 맞게 행동하면 좋습니다."
    else:
        analysis["zhong_zheng"] = "부정(不正)"
        analysis["zhong_zheng_meaning"] = "정위(正位)가 아닙니다. 신중하게 처신해야 합니다."

    return analysis


# ===============================================================
# TRIGRAM ANALYSIS
# ===============================================================
def get_enhanced_trigram_analysis(upper_trigram: str, lower_trigram: str) -> Optional[Dict]:
    """Get enhanced analysis of the two trigrams forming the hexagram."""
    upper_info = TRIGRAM_INFO.get(upper_trigram, {})
    lower_info = TRIGRAM_INFO.get(lower_trigram, {})

    if not upper_info or not lower_info:
        return None

    element_relationship = analyze_wuxing_relationship(
        lower_info.get("element", ""),
        upper_info.get("element", "")
    )

    upper_nature = upper_info.get("nature", "")
    lower_nature = lower_info.get("nature", "")

    imagery = {
        "visual": f"{upper_nature} 위에 {lower_nature}",
        "upper": {
            "korean": upper_info.get("korean", ""),
            "nature": upper_nature,
            "element": WUXING_KOREAN.get(upper_info.get("element", ""), ""),
            "direction": upper_info.get("direction", ""),
            "image": upper_info.get("image", ""),
            "symbol": upper_info.get("symbol", ""),
        },
        "lower": {
            "korean": lower_info.get("korean", ""),
            "nature": lower_nature,
            "element": WUXING_KOREAN.get(lower_info.get("element", ""), ""),
            "direction": lower_info.get("direction", ""),
            "image": lower_info.get("image", ""),
            "symbol": lower_info.get("symbol", ""),
        },
        "element_relationship": element_relationship,
        "interpretation": _TRIGRAM_INTERPRETATIONS.get(
            (upper_trigram, lower_trigram),
            f"{upper_nature} 위에 {lower_nature}의 상입니다."
        ),
    }

    return imagery


# ===============================================================
# HEXAGRAM INTERPRETATION
# ===============================================================
def get_hexagram_interpretation(
    hexagram_num: int,
    theme: str = "general",
    locale: str = _DEFAULT_LOCALE,
    changing_lines: Optional[List[int]] = None,
    saju_element: Optional[str] = None,
    binary: Optional[str] = None,
) -> Dict:
    """
    Get detailed interpretation for a hexagram with enhanced analysis.

    Args:
        hexagram_num: Hexagram number (1-64)
        theme: Theme for interpretation (career, love, health, wealth, timing, general)
        locale: Language (ko, en)
        changing_lines: List of changing line numbers (1-6)
        saju_element: Day master element for cross-analysis
        binary: Binary string representation of hexagram

    Returns:
        Comprehensive interpretation dict
    """
    try:
        hexagrams, _ = load_premium_data()
    except Exception as e:
        print(f"[IChingRAG] Error loading premium data: {e}")
        return _get_basic_interpretation(hexagram_num, locale)

    hex_data = hexagrams.get(str(hexagram_num))
    if not hex_data:
        return _get_basic_interpretation(hexagram_num, locale)

    lang_key = locale if locale in _SUPPORTED_LOCALES else _DEFAULT_LOCALE
    hex_element = hex_data.get("element", "")

    # Basic hexagram info
    interpretation = {
        "hexagram": {
            "number": hexagram_num,
            "name": hex_data.get(f"name_{lang_key}", hex_data.get("name_ko")),
            "hanja": hex_data.get("name_hanja", ""),
            "symbol": hex_data.get("symbol", ""),
            "element": hex_element,
            "element_korean": WUXING_KOREAN.get(hex_element, hex_element),
        },
        "core_meaning": hex_data.get("core_meaning", {}).get(lang_key, ""),
        "judgment": hex_data.get("judgment", {}).get(lang_key, ""),
        "image": hex_data.get("image", {}).get(lang_key, ""),
    }

    # Theme-specific interpretation
    themes = hex_data.get("themes", {})
    if theme in themes:
        interpretation["theme_reading"] = themes[theme].get(lang_key, "")
    elif theme == "general":
        parts = []
        for t_name, t_data in themes.items():
            if t_data.get(lang_key):
                theme_label = _THEME_NAMES_KO.get(t_name, t_name.title()) if lang_key == "ko" else t_name.title()
                parts.append(f"[{theme_label}] {t_data[lang_key]}")
        interpretation["theme_reading"] = "\n\n".join(parts)

    # Enhanced Trigram Analysis
    upper_trigram = hex_data.get("trigram_upper")
    lower_trigram = hex_data.get("trigram_lower")
    if upper_trigram and lower_trigram:
        interpretation["trigram_analysis"] = get_enhanced_trigram_analysis(upper_trigram, lower_trigram)

    # Seasonal Harmony Analysis
    if hex_element:
        interpretation["seasonal_analysis"] = analyze_seasonal_harmony(hex_element)

    # Saju Element Analysis
    if saju_element:
        interpretation["saju_analysis"] = get_saju_element_analysis(hex_element, saju_element)
        saju_conn = hex_data.get("saju_connection", {})
        day_master_advice = saju_conn.get("day_master_advice", {})
        if saju_element in day_master_advice:
            interpretation["saju_advice"] = day_master_advice[saju_element]

    # Related Hexagrams
    if binary:
        interpretation["related_hexagrams"] = get_related_hexagrams(hexagram_num, binary)

    # Changing Lines Analysis
    if changing_lines:
        interpretation["changing_lines"] = _get_changing_lines_interpretation(
            hexagram_num, hex_data, changing_lines, lang_key
        )

        # Get changing line rule
        resulting_num = _calculate_resulting_hexagram(binary, changing_lines) if binary else None
        interpretation["changing_line_rule"] = get_changing_line_rule(
            changing_lines, hexagram_num, resulting_num
        )

    return interpretation


def _get_changing_lines_interpretation(
    hexagram_num: int,
    hex_data: Dict,
    changing_lines: List[int],
    lang_key: str
) -> List[Dict]:
    """Get interpretation for changing lines."""
    complete_data = load_complete_hexagram_data()
    hex_complete = complete_data.get(str(hexagram_num), {})
    lines_data = hex_complete.get("lines", {}) or hex_data.get("lines", {})

    interpretations = []
    for line_num in changing_lines:
        line_info = lines_data.get(str(line_num), {})
        is_yang = True  # Placeholder

        line_analysis = {
            "line": line_num,
            "position_name": LINE_POSITION_MEANING.get(line_num, {}).get("name", f"{line_num}효"),
            "text": line_info.get("text", line_info.get("korean", "")),
            "interpretation": line_info.get("interpretation", line_info.get("advice", "")),
            "changing_to": line_info.get("changing_to"),
            "changing_meaning": line_info.get("changing_meaning", ""),
            "position_analysis": get_line_position_analysis(line_num, is_yang),
        }
        interpretations.append(line_analysis)

    return interpretations


def _calculate_resulting_hexagram(binary: str, changing_lines: List[int]) -> int:
    """Calculate the resulting hexagram number after changes."""
    resulting_binary = list(binary)
    for line in changing_lines:
        idx = line - 1
        resulting_binary[idx] = "1" if resulting_binary[idx] == "0" else "0"
    return _binary_to_hexagram_num("".join(resulting_binary))


def _get_basic_interpretation(hexagram_num: int, locale: str) -> Dict:
    """Get basic interpretation when premium data not available."""
    return {
        "hexagram": {
            "number": hexagram_num,
            "name": f"Hexagram {hexagram_num}",
            "symbol": chr(0x4DC0 + hexagram_num - 1),
        },
        "core_meaning": "Premium interpretation not available for this hexagram.",
        "judgment": "",
        "image": "",
    }


# ===============================================================
# FULL READING
# ===============================================================
def perform_iching_reading(
    question: Optional[str] = None,
    theme: str = "general",
    locale: str = _DEFAULT_LOCALE,
    saju_element: Optional[str] = None,
) -> Dict:
    """
    Perform a complete I Ching reading with enhanced analysis.

    Args:
        question: User's question (optional)
        theme: Theme for interpretation
        locale: Language
        saju_element: Day master element for cross-analysis

    Returns:
        Complete reading with all analyses
    """
    # Cast hexagram
    try:
        cast_result = cast_hexagram()
    except Exception as e:
        print(f"[IChingRAG] Error casting hexagram: {e}")
        cast_result = _get_fallback_cast()

    primary_binary = cast_result["primary"]["binary"]
    primary_num = cast_result["primary"]["number"]
    changing_line_nums = [l["line_num"] for l in cast_result["changing_lines"]]

    # Get primary hexagram interpretation
    primary_interp = get_hexagram_interpretation(
        hexagram_num=primary_num,
        theme=theme,
        locale=locale,
        changing_lines=changing_line_nums,
        saju_element=saju_element,
        binary=primary_binary,
    )

    # Get resulting hexagram interpretation
    resulting_interp = None
    resulting_num = None
    if cast_result["resulting"]:
        resulting_num = cast_result["resulting"]["number"]
        resulting_interp = get_hexagram_interpretation(
            hexagram_num=resulting_num,
            theme=theme,
            locale=locale,
            saju_element=saju_element,
            binary=cast_result["resulting"]["binary"],
        )

    # Get changing line rule and related hexagrams
    changing_rule = get_changing_line_rule(changing_line_nums, primary_num, resulting_num)
    related = get_related_hexagrams(primary_num, primary_binary)

    # Add RAG context if available
    rag_context = _get_rag_context(question) if question else None

    reading = {
        "question": question,
        "theme": theme,
        "locale": locale,
        "cast": cast_result,
        "primary_interpretation": primary_interp,
        "resulting_interpretation": resulting_interp,
        "changing_line_rule": changing_rule,
        "related_hexagrams": related,
        "rag_context": rag_context,
    }

    # Generate summary
    reading["summary"] = _generate_summary(reading, locale)

    return reading


def _get_fallback_cast() -> Dict:
    """Generate fallback cast result when casting fails."""
    return {
        "primary": {
            "number": random.randint(1, 64),
            "binary": "".join([str(random.randint(0, 1)) for _ in range(6)])
        },
        "resulting": None,
        "lines": [],
        "changing_lines": [],
    }


def _get_rag_context(question: str) -> Optional[str]:
    """Get RAG context for the question."""
    if not _HAS_EMBEDDING:
        return None

    try:
        rag_results = search_graphs(question, top_k=5)
        if rag_results:
            return "\n".join([
                f"- {r.get('description', '')[:200]}"
                for r in rag_results[:3]
            ])
    except Exception as e:
        print(f"[IChingRAG] RAG search error: {e}")

    return None


def _generate_summary(reading: Dict, locale: str) -> str:
    """Generate a summary of the reading."""
    primary = reading["primary_interpretation"]
    resulting = reading["resulting_interpretation"]
    changing = reading["cast"]["changing_lines"]
    related = reading.get("related_hexagrams", {})
    changing_rule = reading.get("changing_line_rule", {})

    if locale == "ko":
        return _generate_korean_summary(primary, resulting, changing, related, changing_rule)
    return _generate_english_summary(primary, resulting, changing)


def _generate_korean_summary(
    primary: Dict,
    resulting: Optional[Dict],
    changing: List,
    related: Dict,
    changing_rule: Dict
) -> str:
    """Generate Korean summary."""
    parts = [
        "═══════════════════════════════════════",
        f"【{primary['hexagram']['name']}】 {primary['hexagram'].get('symbol', '')}",
        "═══════════════════════════════════════",
        "",
        primary.get("core_meaning", ""),
    ]

    # Trigram analysis
    trigram = primary.get("trigram_analysis")
    if trigram:
        parts.extend([
            "",
            "[괘상(卦象)]",
            f"  상괘: {trigram.get('upper', {}).get('korean', '')} - {trigram.get('upper', {}).get('image', '')}",
            f"  하괘: {trigram.get('lower', {}).get('korean', '')} - {trigram.get('lower', {}).get('image', '')}",
        ])
        if trigram.get("interpretation"):
            parts.append(f"  → {trigram['interpretation']}")

    # Seasonal analysis
    seasonal = primary.get("seasonal_analysis")
    if seasonal:
        parts.extend([
            "",
            "[시기(時期) 분석]",
            f"  현재: {seasonal.get('season_korean', '')} ({seasonal.get('solar_term', '')})",
            f"  조화: {seasonal.get('relationship', '')} - {seasonal.get('description', '')}",
        ])

    # Theme reading
    if primary.get("theme_reading"):
        parts.extend(["", "[테마별 해석]", primary["theme_reading"]])

    # Changing lines
    if changing:
        parts.extend([
            "",
            f"[변효(變爻): {len(changing)}개]",
            f"  해석 규칙: {changing_rule.get('rule', '')} - {changing_rule.get('description', '')}",
        ])
        for line_info in primary.get("changing_lines", []):
            parts.append(f"  • {line_info.get('position_name', '')}: {line_info.get('text', '')}")
            if line_info.get("interpretation"):
                parts.append(f"    → {line_info['interpretation']}")

    # Resulting hexagram
    if resulting:
        parts.extend([
            "",
            f"[지괘(之卦): {resulting['hexagram']['name']}]",
            resulting.get("core_meaning", ""),
        ])

    # Related hexagrams
    if related:
        parts.extend(["", "[관련 괘(卦)]"])
        if related.get("nuclear", {}).get("info"):
            parts.append(f"  호괘(互卦): {related['nuclear']['info'].get('name', '')} - 내면의 의미")
        if related.get("opposite", {}).get("info"):
            parts.append(f"  착괘(錯卦): {related['opposite']['info'].get('name', '')} - 반대 관점")
        if related.get("reverse", {}).get("info"):
            parts.append(f"  종괘(綜卦): {related['reverse']['info'].get('name', '')} - 상대방 시각")

    # Saju analysis
    saju = primary.get("saju_analysis")
    if saju:
        parts.extend([
            "",
            "[사주(四柱) 연동]",
            f"  일간: {saju.get('day_master', '')}",
            f"  관계: {saju.get('relationship', '')} - {saju.get('advice', '')}",
        ])
        if saju.get("saju_specific_advice"):
            parts.append(f"  → {saju['saju_specific_advice']}")

    parts.extend(["", "═══════════════════════════════════════"])

    return "\n".join(parts)


def _generate_english_summary(primary: Dict, resulting: Optional[Dict], changing: List) -> str:
    """Generate English summary."""
    parts = [
        "═══════════════════════════════════════",
        f"【{primary['hexagram']['name']}】 {primary['hexagram'].get('symbol', '')}",
        "═══════════════════════════════════════",
        "",
        primary.get("core_meaning", ""),
    ]

    if primary.get("theme_reading"):
        parts.extend(["", primary["theme_reading"]])

    if changing:
        parts.extend(["", f"[Changing Lines: {len(changing)}]"])
        for line_info in primary.get("changing_lines", []):
            parts.append(f"  • Line {line_info.get('line', '')}: {line_info.get('text', '')}")

    if resulting:
        parts.extend([
            "",
            f"[Transformation: {resulting['hexagram']['name']}]",
            resulting.get("core_meaning", ""),
        ])

    parts.extend(["", "═══════════════════════════════════════"])

    return "\n".join(parts)


# ===============================================================
# SEARCH FUNCTIONS
# ===============================================================
def search_iching_wisdom(query: str, top_k: int = 5) -> List[Dict]:
    """Search I Ching wisdom based on query."""
    hexagrams, _ = load_premium_data()

    if not hexagrams:
        return []

    results = []
    query_lower = query.lower()

    for hex_key, hex_data in hexagrams.items():
        score = 0

        for theme_data in hex_data.get("themes", {}).values():
            for lang in _SUPPORTED_LOCALES:
                text = theme_data.get(lang, "").lower()
                if query_lower in text:
                    score += 10
                for term in query_lower.split():
                    if term in text:
                        score += 1

        if score > 0:
            results.append({
                "hexagram_num": int(hex_key),
                "name": hex_data.get("name_ko", f"Hexagram {hex_key}"),
                "score": score,
                "core_meaning": hex_data.get("core_meaning", {}).get("ko", ""),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def get_all_hexagrams_summary(locale: str = _DEFAULT_LOCALE) -> List[Dict]:
    """Get a summary of all 64 hexagrams."""
    hexagrams, _ = load_premium_data()

    summaries = []
    for i in range(1, 65):
        hex_key = str(i)
        if hex_key in hexagrams:
            hex_data = hexagrams[hex_key]
            summaries.append({
                "number": i,
                "name": hex_data.get(f"name_{locale}", hex_data.get("name_ko")),
                "symbol": hex_data.get("symbol", chr(0x4DC0 + i - 1)),
                "element": hex_data.get("element", ""),
                "core_meaning": hex_data.get("core_meaning", {}).get(locale, "")[:100],
            })
        else:
            summaries.append({
                "number": i,
                "name": f"Hexagram {i}",
                "symbol": chr(0x4DC0 + i - 1),
                "element": "",
                "core_meaning": "Premium data not available",
            })

    return summaries


# ===============================================================
# CHANGING LINE INTERPRETATION API
# ===============================================================
def get_changing_line_interpretation(
    hexagram_num: int,
    line_index: int,
    locale: str = _DEFAULT_LOCALE
) -> Dict:
    """Get detailed changing line interpretation from the enhanced data."""
    if not 1 <= hexagram_num <= 64:
        return {"error": "Invalid hexagram number. Must be 1-64."}

    if not 1 <= line_index <= 6:
        return {"error": "Invalid line index. Must be 1-6."}

    complete_data = load_complete_hexagram_data()
    hex_data = complete_data.get(str(hexagram_num), {})

    if not hex_data:
        return {"error": f"Hexagram {hexagram_num} data not found."}

    line_data = hex_data.get("lines", {}).get(str(line_index), {})
    if not line_data:
        return {"error": f"Line {line_index} data not found for hexagram {hexagram_num}."}

    result = {
        "hexagram_number": hexagram_num,
        "hexagram_name": hex_data.get("name", ""),
        "line_index": line_index,
        "line_name": LINE_POSITION_MEANING.get(line_index, {}).get("name", f"{line_index}효"),
        "text": line_data.get("text", ""),
        "interpretation": line_data.get("interpretation", ""),
        "position_analysis": {"position_meaning": LINE_POSITION_MEANING.get(line_index, {})},
    }

    if "changing_to" in line_data:
        result["changing_to"] = line_data["changing_to"]
        result["changing_hexagram_name"] = line_data.get("changing_hexagram_name", "")

        changing_interp = line_data.get("changing_interpretation")
        if changing_interp:
            result["changing_interpretation"] = {
                "transition": changing_interp.get("transition", ""),
                "from_to": changing_interp.get("from_to", ""),
                "core_message": changing_interp.get("core_message", ""),
                "practical_advice": changing_interp.get("practical_advice", []),
                "warning": changing_interp.get("warning", ""),
            }

    return result


def get_all_changing_lines_for_hexagram(
    hexagram_num: int,
    locale: str = _DEFAULT_LOCALE
) -> Dict:
    """Get all changing line interpretations for a hexagram."""
    if not 1 <= hexagram_num <= 64:
        return {"error": "Invalid hexagram number. Must be 1-64."}

    complete_data = load_complete_hexagram_data()
    hex_data = complete_data.get(str(hexagram_num), {})

    if not hex_data:
        return {"error": f"Hexagram {hexagram_num} data not found."}

    result = {
        "hexagram_number": hexagram_num,
        "hexagram_name": hex_data.get("name", ""),
        "lines": {}
    }

    lines_data = hex_data.get("lines", {})

    for i in range(1, 7):
        line_data = lines_data.get(str(i), {})
        if line_data:
            line_result = {
                "line_name": LINE_POSITION_MEANING.get(i, {}).get("name", f"{i}효"),
                "text": line_data.get("text", ""),
                "interpretation": line_data.get("interpretation", ""),
            }

            if "changing_to" in line_data:
                line_result["changing_to"] = line_data["changing_to"]
                line_result["changing_hexagram_name"] = line_data.get("changing_hexagram_name", "")
                if line_data.get("changing_interpretation"):
                    line_result["changing_interpretation"] = line_data["changing_interpretation"]

            result["lines"][i] = line_result

    return result
