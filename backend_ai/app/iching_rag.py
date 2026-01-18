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

# Try to import embedding utilities
try:
    from saju_astro_rag import search_graphs, embed_text, get_model
    HAS_EMBEDDING = True
except ImportError:
    HAS_EMBEDDING = False


# ===============================================================
# IMPORTS FROM ICHING PACKAGE (Refactored)
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


# Backward compatibility alias
def _binary_to_hexagram_num_compat(binary: str) -> int:
    """Backward compatibility wrapper."""
    return _binary_to_hexagram_num(binary)


# NOTE: The following functions have been moved to the iching package:
# - load_premium_data() -> iching.data_loader
# - load_complete_hexagram_data() -> iching.data_loader
# - load_changing_lines_data() -> iching.data_loader
# - get_current_season() -> iching.wuxing
# - get_current_solar_term() -> iching.wuxing
# - analyze_seasonal_harmony() -> iching.wuxing
# - analyze_wuxing_relationship() -> iching.wuxing
# - get_saju_element_analysis() -> iching.wuxing
# - calculate_nuclear_hexagram() -> iching.hexagram_calc
# - calculate_opposite_hexagram() -> iching.hexagram_calc
# - calculate_reverse_hexagram() -> iching.hexagram_calc
# - get_related_hexagrams() -> iching.hexagram_calc
# - cast_hexagram() -> iching.hexagram_calc
# - _binary_to_hexagram_num() -> iching.hexagram_calc


# NOTE: All functions above have been moved to iching package submodules.
# They are now imported at the top of this file from:
# - iching.data_loader
# - iching.wuxing
# - iching.hexagram_calc


# ===============================================================
# ADVANCED CHANGING LINE ANALYSIS
# ===============================================================
def get_changing_line_rule(changing_lines: List[int], hexagram_num: int, resulting_num: int = None) -> Dict:
    """
    Get the traditional I Ching interpretation rule based on number of changing lines.

    Traditional rules (朱熹 周易本義):
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

    elif line_count == 2:
        upper = sorted_lines[-1]
        lower = sorted_lines[0]
        return {
            "rule": "이변(二變)",
            "rule_chinese": "二爻變",
            "description": f"{lower}, {upper}효가 변합니다. 위 효인 {upper}효를 주(主)로, {lower}효를 보조로 해석합니다.",
            "focus": "two_lines_upper",
            "focus_line": upper,
            "secondary_line": lower,
            "detail": f"두 효가 함께 움직이니 변화의 폭이 큽니다. {upper}효의 메시지가 핵심입니다."
        }

    elif line_count == 3:
        return {
            "rule": "삼변(三變)",
            "rule_chinese": "三爻變",
            "description": "세 효가 변하니, 본괘와 지괘(변괘)의 괘사를 함께 보되 본괘 괘사가 중심입니다.",
            "focus": "both_judgments",
            "primary_weight": 0.6,
            "resulting_weight": 0.4,
            "detail": "현재(본괘)와 미래(지괘)를 함께 보아야 합니다. 현재 상황이 우선이나 미래 방향도 참고하세요."
        }

    elif line_count == 4:
        all_lines = {1, 2, 3, 4, 5, 6}
        unchanged = sorted(all_lines - set(sorted_lines))
        lower_unchanged = unchanged[0] if unchanged else 1
        return {
            "rule": "사변(四變)",
            "rule_chinese": "四爻變",
            "description": f"변하지 않는 {unchanged[0]}, {unchanged[1]}효 중 아래 효인 {lower_unchanged}효의 지괘 효사를 봅니다.",
            "focus": "resulting_lower_unchanged",
            "focus_line": lower_unchanged,
            "unchanged_lines": unchanged,
            "detail": f"대부분이 변하나 {unchanged}효가 남아 있습니다. 이 불변의 힘이 중심을 잡아줍니다."
        }

    elif line_count == 5:
        all_lines = {1, 2, 3, 4, 5, 6}
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

    else:  # 6 lines
        # Special cases for Qian (1) and Kun (2)
        if hexagram_num == 1 and resulting_num == 2:
            return {
                "rule": "용구(用九)",
                "rule_chinese": "用九",
                "description": "건괘의 모든 양효가 변하니, 용구(用九)를 봅니다: '見群龍無首 吉'",
                "focus": "special_yong_jiu",
                "special_text": "群龍無首 吉",
                "special_meaning": "여러 용이 나타나되 우두머리가 없으니 길하다",
                "detail": "모든 리더가 되려 하지 말고 겸손히 물러나면 길합니다. 독불장군은 화를 부릅니다."
            }
        elif hexagram_num == 2 and resulting_num == 1:
            return {
                "rule": "용육(用六)",
                "rule_chinese": "用六",
                "description": "곤괘의 모든 음효가 변하니, 용육(用六)을 봅니다: '利永貞'",
                "focus": "special_yong_liu",
                "special_text": "利永貞",
                "special_meaning": "영원히 바르게 함이 이롭다",
                "detail": "음에서 양으로 완전히 전환됩니다. 끝까지 바른 도를 지키면 강건함을 얻습니다."
            }
        else:
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
    is_correct_position = (line_num % 2 == 1 and is_yang) or (line_num % 2 == 0 and not is_yang)

    analysis = {
        "position": position,
        "is_center": is_center,
        "is_correct": is_correct_position,
    }

    if is_center and is_correct_position:
        analysis["zhong_zheng"] = "중정(中正)"
        analysis["zhong_zheng_meaning"] = "가장 이상적인 위치입니다. 중용을 지키며 바른 자리에 있습니다."
    elif is_center:
        analysis["zhong_zheng"] = "중(中)"
        analysis["zhong_zheng_meaning"] = "중앙에 있으나 정위(正位)는 아닙니다. 중용은 있으나 완벽하지 않습니다."
    elif is_correct_position:
        analysis["zhong_zheng"] = "정(正)"
        analysis["zhong_zheng_meaning"] = "바른 자리에 있습니다. 위치에 맞게 행동하면 좋습니다."
    else:
        analysis["zhong_zheng"] = "부정(不正)"
        analysis["zhong_zheng_meaning"] = "정위(正位)가 아닙니다. 신중하게 처신해야 합니다."

    # 응효(應爻) 분석 - 1↔4, 2↔5, 3↔6
    corresponding_line = {1: 4, 2: 5, 3: 6, 4: 1, 5: 2, 6: 3}
    analysis["corresponding_line"] = corresponding_line.get(line_num)

    return analysis


# ===============================================================
# ENHANCED TRIGRAM ANALYSIS
# ===============================================================
def get_enhanced_trigram_analysis(upper_trigram: str, lower_trigram: str) -> Dict:
    """Get enhanced analysis of the two trigrams forming the hexagram."""
    upper_info = TRIGRAM_INFO.get(upper_trigram, {})
    lower_info = TRIGRAM_INFO.get(lower_trigram, {})

    if not upper_info or not lower_info:
        return None

    # Element relationship between trigrams
    element_relationship = analyze_wuxing_relationship(
        lower_info.get("element", ""),
        upper_info.get("element", "")
    )

    # Trigram imagery interpretation
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
    }

    # Combined imagery interpretation
    imagery["interpretation"] = _interpret_trigram_combination(upper_trigram, lower_trigram)

    return imagery


def _interpret_trigram_combination(upper: str, lower: str) -> str:
    """Generate interpretation based on trigram combination."""
    interpretations = {
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
    return interpretations.get((upper, lower), f"{TRIGRAM_INFO.get(upper, {}).get('nature', upper)} 위에 {TRIGRAM_INFO.get(lower, {}).get('nature', lower)}의 상입니다.")


# ===============================================================
# HEXAGRAM INTERPRETATION (Enhanced)
# ===============================================================
def get_hexagram_interpretation(
    hexagram_num: int,
    theme: str = "general",
    locale: str = "ko",
    changing_lines: List[int] = None,
    saju_element: str = None,
    binary: str = None,
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
        Comprehensive interpretation dict with:
        - Basic hexagram info
        - Theme-specific reading
        - Enhanced trigram analysis with imagery
        - Five Element analysis
        - Seasonal harmony
        - Changing line rules and interpretation
        - Related hexagrams (nuclear, opposite, reverse)
        - Saju cross-analysis
    """
    try:
        hexagrams, trigrams = load_premium_data()
    except Exception as e:
        print(f"[IChingRAG] Error loading premium data: {e}")
        return _get_basic_interpretation(hexagram_num, locale)

    hex_key = str(hexagram_num)
    hex_data = hexagrams.get(hex_key)

    if not hex_data:
        return _get_basic_interpretation(hexagram_num, locale)

    lang_key = locale if locale in ["ko", "en"] else "ko"
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
        general_parts = []
        for t_name, t_data in themes.items():
            if t_data.get(lang_key):
                if lang_key == "ko":
                    general_parts.append(f"[{_theme_name_ko(t_name)}] {t_data[lang_key]}")
                else:
                    general_parts.append(f"[{t_name.title()}] {t_data[lang_key]}")
        interpretation["theme_reading"] = "\n\n".join(general_parts)

    # Enhanced Trigram Analysis
    upper_trigram = hex_data.get("trigram_upper")
    lower_trigram = hex_data.get("trigram_lower")
    if upper_trigram and lower_trigram:
        interpretation["trigram_analysis"] = get_enhanced_trigram_analysis(upper_trigram, lower_trigram)

    # Seasonal Harmony Analysis
    if hex_element:
        interpretation["seasonal_analysis"] = analyze_seasonal_harmony(hex_element)

    # Saju Element Analysis (Enhanced)
    if saju_element:
        interpretation["saju_analysis"] = get_saju_element_analysis(hex_element, saju_element)
        # Also keep legacy format for compatibility
        saju_conn = hex_data.get("saju_connection", {})
        day_master_advice = saju_conn.get("day_master_advice", {})
        if saju_element in day_master_advice:
            interpretation["saju_advice"] = day_master_advice[saju_element]

    # Related Hexagrams (Nuclear, Opposite, Reverse)
    if binary:
        interpretation["related_hexagrams"] = get_related_hexagrams(hexagram_num, binary)

    # Changing Lines Analysis (Enhanced)
    if changing_lines:
        complete_data = load_complete_hexagram_data()
        hex_complete = complete_data.get(str(hexagram_num), {})
        lines_data = hex_complete.get("lines", {}) or hex_data.get("lines", {})

        changing_interpretations = []
        for line_num in changing_lines:
            line_key = str(line_num)
            line_info = lines_data.get(line_key, {})

            # Determine if line is yang (1) or yin (0) - changing lines flip
            # This is approximated; ideally passed from casting
            is_yang = True  # Placeholder - would be from cast result

            line_analysis = {
                "line": line_num,
                "position_name": LINE_POSITION_MEANING.get(line_num, {}).get("name", f"{line_num}효"),
                "text": line_info.get("text", line_info.get("korean", "")),
                "interpretation": line_info.get("interpretation", line_info.get("advice", "")),
                "changing_to": line_info.get("changing_to"),
                "changing_meaning": line_info.get("changing_meaning", ""),
                "position_analysis": get_line_position_analysis(line_num, is_yang),
            }
            changing_interpretations.append(line_analysis)

        interpretation["changing_lines"] = changing_interpretations

        # Get the changing line rule
        resulting_num = None
        if binary:
            # Calculate resulting hexagram
            resulting_binary = list(binary)
            for line in changing_lines:
                idx = line - 1
                resulting_binary[idx] = "1" if resulting_binary[idx] == "0" else "0"
            resulting_num = _binary_to_hexagram_num("".join(resulting_binary))

        interpretation["changing_line_rule"] = get_changing_line_rule(
            changing_lines, hexagram_num, resulting_num
        )

    return interpretation


def _theme_name_ko(theme: str) -> str:
    """Get Korean name for theme."""
    names = {
        "career": "직업/사업",
        "love": "연애/결혼",
        "health": "건강",
        "wealth": "재물/투자",
        "timing": "시기/타이밍",
    }
    return names.get(theme, theme)


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
# FULL READING (Cast + Interpret) - Enhanced
# ===============================================================
def perform_iching_reading(
    question: str = None,
    theme: str = "general",
    locale: str = "ko",
    saju_element: str = None,
) -> Dict:
    """
    Perform a complete I Ching reading with enhanced analysis.

    Args:
        question: User's question (optional)
        theme: Theme for interpretation
        locale: Language
        saju_element: Day master element for cross-analysis

    Returns:
        Complete reading with:
        - Cast result
        - Primary and resulting hexagram interpretations
        - Related hexagrams (nuclear, opposite, reverse)
        - Seasonal harmony analysis
        - Saju cross-analysis
        - Changing line rules
        - RAG context
    """
    try:
        # Cast hexagram
        cast_result = cast_hexagram()
    except Exception as e:
        print(f"[IChingRAG] Error casting hexagram: {e}")
        # Fallback: generate a simple random hexagram
        cast_result = {
            "primary": {"number": random.randint(1, 64), "binary": "".join([str(random.randint(0, 1)) for _ in range(6)])},
            "resulting": None,
            "lines": [],
            "changing_lines": [],
        }
    primary_binary = cast_result["primary"]["binary"]
    primary_num = cast_result["primary"]["number"]

    # Get primary hexagram interpretation with enhanced analysis
    primary_interp = get_hexagram_interpretation(
        hexagram_num=primary_num,
        theme=theme,
        locale=locale,
        changing_lines=[l["line_num"] for l in cast_result["changing_lines"]],
        saju_element=saju_element,
        binary=primary_binary,
    )

    # Get resulting hexagram interpretation if there are changing lines
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

    # Get changing line interpretation rule
    changing_line_nums = [l["line_num"] for l in cast_result["changing_lines"]]
    changing_rule = get_changing_line_rule(changing_line_nums, primary_num, resulting_num)

    # Get related hexagrams
    related = get_related_hexagrams(primary_num, primary_binary)

    # Add RAG context if available
    rag_context = ""
    if HAS_EMBEDDING and question:
        try:
            rag_results = search_graphs(question, top_k=5)
            if rag_results:
                rag_context = "\n".join([
                    f"- {r.get('description', '')[:200]}"
                    for r in rag_results[:3]
                ])
        except Exception as e:
            print(f"[IChingRAG] RAG search error: {e}")

    reading = {
        "question": question,
        "theme": theme,
        "locale": locale,
        "cast": cast_result,
        "primary_interpretation": primary_interp,
        "resulting_interpretation": resulting_interp,
        "changing_line_rule": changing_rule,
        "related_hexagrams": related,
        "rag_context": rag_context if rag_context else None,
    }

    # Generate enhanced summary
    reading["summary"] = _generate_enhanced_summary(reading, locale)

    return reading


def _generate_enhanced_summary(reading: Dict, locale: str) -> str:
    """Generate an enhanced summary of the reading with all analyses."""
    primary = reading["primary_interpretation"]
    resulting = reading["resulting_interpretation"]
    changing = reading["cast"]["changing_lines"]
    related = reading.get("related_hexagrams", {})
    changing_rule = reading.get("changing_line_rule", {})

    if locale == "ko":
        parts = [
            f"═══════════════════════════════════════",
            f"【{primary['hexagram']['name']}】 {primary['hexagram'].get('symbol', '')}",
            f"═══════════════════════════════════════",
            "",
            primary.get("core_meaning", ""),
        ]

        # Trigram analysis
        trigram = primary.get("trigram_analysis")
        if trigram:
            parts.append("")
            parts.append(f"[괘상(卦象)]")
            upper = trigram.get("upper", {})
            lower = trigram.get("lower", {})
            parts.append(f"  상괘: {upper.get('korean', '')} - {upper.get('image', '')}")
            parts.append(f"  하괘: {lower.get('korean', '')} - {lower.get('image', '')}")
            if trigram.get("interpretation"):
                parts.append(f"  → {trigram['interpretation']}")

        # Seasonal analysis
        seasonal = primary.get("seasonal_analysis")
        if seasonal:
            parts.append("")
            parts.append(f"[시기(時期) 분석]")
            parts.append(f"  현재: {seasonal.get('season_korean', '')} ({seasonal.get('solar_term', '')})")
            parts.append(f"  조화: {seasonal.get('relationship', '')} - {seasonal.get('description', '')}")

        # Theme reading
        if primary.get("theme_reading"):
            parts.append("")
            parts.append(f"[테마별 해석]")
            parts.append(primary["theme_reading"])

        # Changing lines
        if changing:
            parts.append("")
            parts.append(f"[변효(變爻): {len(changing)}개]")
            parts.append(f"  해석 규칙: {changing_rule.get('rule', '')} - {changing_rule.get('description', '')}")
            for line_info in primary.get("changing_lines", []):
                parts.append(f"  • {line_info.get('position_name', '')}: {line_info.get('text', '')}")
                if line_info.get("interpretation"):
                    parts.append(f"    → {line_info['interpretation']}")

        # Resulting hexagram
        if resulting:
            parts.append("")
            parts.append(f"[지괘(之卦): {resulting['hexagram']['name']}]")
            parts.append(resulting.get("core_meaning", ""))

        # Related hexagrams
        if related:
            parts.append("")
            parts.append(f"[관련 괘(卦)]")
            nuclear = related.get("nuclear", {}).get("info")
            if nuclear:
                parts.append(f"  호괘(互卦): {nuclear.get('name', '')} - 내면의 의미")
            opposite = related.get("opposite", {}).get("info")
            if opposite:
                parts.append(f"  착괘(錯卦): {opposite.get('name', '')} - 반대 관점")
            reverse = related.get("reverse", {}).get("info")
            if reverse:
                parts.append(f"  종괘(綜卦): {reverse.get('name', '')} - 상대방 시각")

        # Saju analysis
        saju = primary.get("saju_analysis")
        if saju:
            parts.append("")
            parts.append(f"[사주(四柱) 연동]")
            parts.append(f"  일간: {saju.get('day_master', '')}")
            parts.append(f"  관계: {saju.get('relationship', '')} - {saju.get('advice', '')}")
            if saju.get("saju_specific_advice"):
                parts.append(f"  → {saju['saju_specific_advice']}")

        parts.append("")
        parts.append(f"═══════════════════════════════════════")

    else:
        # English version
        parts = [
            f"═══════════════════════════════════════",
            f"【{primary['hexagram']['name']}】 {primary['hexagram'].get('symbol', '')}",
            f"═══════════════════════════════════════",
            "",
            primary.get("core_meaning", ""),
        ]

        if primary.get("theme_reading"):
            parts.append("")
            parts.append(primary["theme_reading"])

        if changing:
            parts.append("")
            parts.append(f"[Changing Lines: {len(changing)}]")
            for line_info in primary.get("changing_lines", []):
                parts.append(f"  • Line {line_info.get('line', '')}: {line_info.get('text', '')}")

        if resulting:
            parts.append("")
            parts.append(f"[Transformation: {resulting['hexagram']['name']}]")
            parts.append(resulting.get("core_meaning", ""))

        parts.append("")
        parts.append(f"═══════════════════════════════════════")

    return "\n".join(parts)


def _generate_summary(reading: Dict, locale: str) -> str:
    """Generate a summary of the reading."""
    primary = reading["primary_interpretation"]
    resulting = reading["resulting_interpretation"]
    changing = reading["cast"]["changing_lines"]

    if locale == "ko":
        parts = [
            f"【{primary['hexagram']['name']}】",
            f"",
            primary.get("core_meaning", ""),
        ]

        if primary.get("theme_reading"):
            parts.append("")
            parts.append(primary["theme_reading"])

        if changing:
            parts.append("")
            parts.append(f"[변효: {len(changing)}개]")
            for line_info in primary.get("changing_lines", []):
                parts.append(f"  {line_info.get('text', '')}")
                if line_info.get("meaning"):
                    parts.append(f"  → {line_info['meaning']}")

        if resulting:
            parts.append("")
            parts.append(f"[변화 후: {resulting['hexagram']['name']}]")
            parts.append(resulting.get("core_meaning", ""))

        if primary.get("saju_advice"):
            parts.append("")
            parts.append(f"[사주 조언] {primary['saju_advice']}")

    else:
        parts = [
            f"【{primary['hexagram']['name']}】",
            "",
            primary.get("core_meaning", ""),
        ]

        if primary.get("theme_reading"):
            parts.append("")
            parts.append(primary["theme_reading"])

        if changing:
            parts.append("")
            parts.append(f"[Changing Lines: {len(changing)}]")
            for line_info in primary.get("changing_lines", []):
                parts.append(f"  {line_info.get('text', '')}")
                if line_info.get("meaning"):
                    parts.append(f"  → {line_info['meaning']}")

        if resulting:
            parts.append("")
            parts.append(f"[Transformation: {resulting['hexagram']['name']}]")
            parts.append(resulting.get("core_meaning", ""))

        if primary.get("saju_advice"):
            parts.append("")
            parts.append(f"[Saju Advice] {primary['saju_advice']}")

    return "\n".join(parts)


# ===============================================================
# SEARCH FUNCTIONS (For RAG Integration)
# ===============================================================
def search_iching_wisdom(query: str, top_k: int = 5) -> List[Dict]:
    """
    Search I Ching wisdom based on query.

    Args:
        query: Search query
        top_k: Number of results

    Returns:
        List of relevant hexagram wisdom
    """
    hexagrams, _ = load_premium_data()

    if not hexagrams:
        return []

    results = []
    query_lower = query.lower()

    for hex_key, hex_data in hexagrams.items():
        score = 0

        # Simple keyword matching (would be replaced by embedding in production)
        for theme_name, theme_data in hex_data.get("themes", {}).items():
            for lang in ["ko", "en"]:
                text = theme_data.get(lang, "").lower()
                if query_lower in text:
                    score += 10
                # Check for related terms
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

    # Sort by score and return top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


# ===============================================================
# EXPORT FUNCTIONS
# ===============================================================
def get_all_hexagrams_summary(locale: str = "ko") -> List[Dict]:
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
def get_changing_line_interpretation(hexagram_num: int, line_index: int, locale: str = "ko") -> Dict:
    """
    Get detailed changing line interpretation from the enhanced data.

    Args:
        hexagram_num: Hexagram number (1-64)
        line_index: Line index (1-6, bottom to top)
        locale: Language code (ko, en)

    Returns:
        Dict with changing line interpretation including:
        - text: Original line text
        - interpretation: Basic interpretation
        - changing_to: Target hexagram number
        - changing_hexagram_name: Target hexagram name
        - changing_interpretation: Detailed interpretation object
    """
    if not 1 <= hexagram_num <= 64:
        return {"error": "Invalid hexagram number. Must be 1-64."}

    if not 1 <= line_index <= 6:
        return {"error": "Invalid line index. Must be 1-6."}

    # Load complete hexagram data with enhanced line interpretations
    complete_data = load_complete_hexagram_data()

    hex_key = str(hexagram_num)
    hex_data = complete_data.get(hex_key, {})

    if not hex_data:
        return {"error": f"Hexagram {hexagram_num} data not found."}

    lines_data = hex_data.get("lines", {})
    line_key = str(line_index)
    line_data = lines_data.get(line_key, {})

    if not line_data:
        return {"error": f"Line {line_index} data not found for hexagram {hexagram_num}."}

    # Build response
    result = {
        "hexagram_number": hexagram_num,
        "hexagram_name": hex_data.get("name", ""),
        "line_index": line_index,
        "line_name": LINE_POSITION_MEANING.get(line_index, {}).get("name", f"{line_index}효"),
        "text": line_data.get("text", ""),
        "interpretation": line_data.get("interpretation", ""),
    }

    # Add changing hexagram info if available
    if "changing_to" in line_data:
        result["changing_to"] = line_data["changing_to"]
        result["changing_hexagram_name"] = line_data.get("changing_hexagram_name", "")

        # Add detailed changing interpretation if available
        changing_interp = line_data.get("changing_interpretation")
        if changing_interp:
            result["changing_interpretation"] = {
                "transition": changing_interp.get("transition", ""),
                "from_to": changing_interp.get("from_to", ""),
                "core_message": changing_interp.get("core_message", ""),
                "practical_advice": changing_interp.get("practical_advice", []),
                "warning": changing_interp.get("warning", ""),
            }

    # Add position analysis
    result["position_analysis"] = {
        "position_meaning": LINE_POSITION_MEANING.get(line_index, {}),
    }

    return result


def get_all_changing_lines_for_hexagram(hexagram_num: int, locale: str = "ko") -> Dict:
    """
    Get all changing line interpretations for a hexagram.

    Args:
        hexagram_num: Hexagram number (1-64)
        locale: Language code

    Returns:
        Dict with all 6 lines' changing interpretations
    """
    if not 1 <= hexagram_num <= 64:
        return {"error": "Invalid hexagram number. Must be 1-64."}

    complete_data = load_complete_hexagram_data()
    hex_key = str(hexagram_num)
    hex_data = complete_data.get(hex_key, {})

    if not hex_data:
        return {"error": f"Hexagram {hexagram_num} data not found."}

    result = {
        "hexagram_number": hexagram_num,
        "hexagram_name": hex_data.get("name", ""),
        "lines": {}
    }

    lines_data = hex_data.get("lines", {})

    for i in range(1, 7):
        line_key = str(i)
        line_data = lines_data.get(line_key, {})

        if line_data:
            line_result = {
                "line_name": LINE_POSITION_MEANING.get(i, {}).get("name", f"{i}효"),
                "text": line_data.get("text", ""),
                "interpretation": line_data.get("interpretation", ""),
            }

            if "changing_to" in line_data:
                line_result["changing_to"] = line_data["changing_to"]
                line_result["changing_hexagram_name"] = line_data.get("changing_hexagram_name", "")

                changing_interp = line_data.get("changing_interpretation")
                if changing_interp:
                    line_result["changing_interpretation"] = changing_interp

            result["lines"][i] = line_result

    return result


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Premium I Ching RAG...")

    # Test casting
    print("\n[Test 1] Cast Hexagram")
    result = cast_hexagram()
    print(f"Primary: Hexagram {result['primary']['number']} ({result['primary']['binary']})")
    if result['resulting']:
        print(f"Resulting: Hexagram {result['resulting']['number']}")
    print(f"Changing lines: {[l['line_num'] for l in result['changing_lines']]}")

    # Test interpretation
    print("\n[Test 2] Get Interpretation (Hexagram 1)")
    interp = get_hexagram_interpretation(1, theme="career", locale="ko")
    print(f"Name: {interp['hexagram']['name']}")
    print(f"Core: {interp.get('core_meaning', '')[:100]}...")

    # Test full reading
    print("\n[Test 3] Full Reading")
    reading = perform_iching_reading(
        question="직업을 바꾸는 것이 좋을까요?",
        theme="career",
        locale="ko",
        saju_element="wood",
    )
    print(f"\n{reading['summary'][:500]}...")

    # Test search
    print("\n[Test 4] Search Wisdom")
    results = search_iching_wisdom("리더십 성공", top_k=3)
    for r in results:
        print(f"  - {r['name']}: {r['score']}")
