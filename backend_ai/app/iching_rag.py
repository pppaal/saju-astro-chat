# backend_ai/app/iching_rag.py
"""
Premium I Ching RAG Engine - Gemini Level
==========================================
Features:
- 64 hexagram interpretations with Korean/English
- Theme-specific readings (career, love, health, wealth, timing)
- Five Element and Saju cross-analysis
- Hybrid RAG search for related wisdom
- Changing line analysis
"""

import os
import json
import random
from typing import Dict, List, Optional, Tuple
from functools import lru_cache

# Try to import embedding utilities
try:
    from saju_astro_rag import search_graphs, embed_text, get_model
    HAS_EMBEDDING = True
except ImportError:
    HAS_EMBEDDING = False


# ===============================================================
# DATA LOADING
# ===============================================================
_HEXAGRAM_DATA = None
_TRIGRAM_DATA = None


def _get_data_path() -> str:
    """Get path to I Ching data directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data", "graph", "rules", "iching")


@lru_cache(maxsize=1)
def load_premium_data() -> Tuple[Dict, Dict]:
    """Load premium hexagram and trigram data."""
    global _HEXAGRAM_DATA, _TRIGRAM_DATA

    if _HEXAGRAM_DATA is not None:
        return _HEXAGRAM_DATA, _TRIGRAM_DATA

    data_path = os.path.join(_get_data_path(), "hexagrams_full.json")

    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _HEXAGRAM_DATA = data.get("hexagrams", {})
            _TRIGRAM_DATA = data.get("trigrams", {})
    else:
        _HEXAGRAM_DATA = {}
        _TRIGRAM_DATA = {}
        print(f"[IChingRAG] Warning: Premium data not found at {data_path}")

    return _HEXAGRAM_DATA, _TRIGRAM_DATA


# ===============================================================
# HEXAGRAM CASTING (Traditional Three-Coin Method)
# ===============================================================
def cast_hexagram() -> Dict:
    """
    Cast a hexagram using the traditional three-coin method.

    Returns:
        Dict with primary hexagram, changing lines, and resulting hexagram
    """
    lines = []
    primary_binary = ""
    resulting_binary = ""

    for i in range(6):
        # Three coin tosses: 2=tails(yin), 3=heads(yang)
        coins = [random.choice([2, 3]) for _ in range(3)]
        total = sum(coins)

        # 6 = old yin (changing), 7 = young yang, 8 = young yin, 9 = old yang (changing)
        if total == 6:  # Old Yin (changing to yang)
            lines.append({"value": 0, "changing": True, "line_num": i + 1})
            primary_binary += "0"
            resulting_binary += "1"
        elif total == 7:  # Young Yang (stable)
            lines.append({"value": 1, "changing": False, "line_num": i + 1})
            primary_binary += "1"
            resulting_binary += "1"
        elif total == 8:  # Young Yin (stable)
            lines.append({"value": 0, "changing": False, "line_num": i + 1})
            primary_binary += "0"
            resulting_binary += "0"
        else:  # 9 = Old Yang (changing to yin)
            lines.append({"value": 1, "changing": True, "line_num": i + 1})
            primary_binary += "1"
            resulting_binary += "0"

    # Get hexagram numbers
    primary_num = _binary_to_hexagram_num(primary_binary)
    resulting_num = _binary_to_hexagram_num(resulting_binary) if primary_binary != resulting_binary else None

    changing_lines = [line for line in lines if line["changing"]]

    return {
        "primary": {
            "number": primary_num,
            "binary": primary_binary,
        },
        "resulting": {
            "number": resulting_num,
            "binary": resulting_binary,
        } if resulting_num else None,
        "lines": lines,
        "changing_lines": changing_lines,
    }


def _binary_to_hexagram_num(binary: str) -> int:
    """Convert binary string to hexagram number (1-64)."""
    # King Wen sequence mapping
    king_wen_map = {
        "111111": 1, "000000": 2, "010001": 3, "100010": 4,
        "010111": 5, "111010": 6, "000010": 7, "010000": 8,
        "110111": 9, "111011": 10, "000111": 11, "111000": 12,
        "111101": 13, "101111": 14, "000100": 15, "001000": 16,
        "011001": 17, "100110": 18, "000011": 19, "110000": 20,
        "101001": 21, "100101": 22, "100000": 23, "000001": 24,
        "111001": 25, "100111": 26, "100001": 27, "011110": 28,
        "010010": 29, "101101": 30, "011100": 31, "001110": 32,
        "111100": 33, "001111": 34, "101000": 35, "000101": 36,
        "110101": 37, "101011": 38, "010100": 39, "001010": 40,
        "100011": 41, "110001": 42, "011111": 43, "111110": 44,
        "011000": 45, "000110": 46, "011010": 47, "010110": 48,
        "011101": 49, "101110": 50, "001001": 51, "100100": 52,
        "110100": 53, "001011": 54, "001101": 55, "101100": 56,
        "110110": 57, "011011": 58, "110010": 59, "010011": 60,
        "110011": 61, "001100": 62, "010101": 63, "101010": 64,
    }
    return king_wen_map.get(binary, 1)


# ===============================================================
# HEXAGRAM INTERPRETATION
# ===============================================================
def get_hexagram_interpretation(
    hexagram_num: int,
    theme: str = "general",
    locale: str = "ko",
    changing_lines: List[int] = None,
    saju_element: str = None,
) -> Dict:
    """
    Get detailed interpretation for a hexagram.

    Args:
        hexagram_num: Hexagram number (1-64)
        theme: Theme for interpretation (career, love, health, wealth, timing, general)
        locale: Language (ko, en)
        changing_lines: List of changing line numbers (1-6)
        saju_element: Day master element for cross-analysis

    Returns:
        Comprehensive interpretation dict
    """
    hexagrams, trigrams = load_premium_data()

    hex_key = str(hexagram_num)
    hex_data = hexagrams.get(hex_key)

    if not hex_data:
        # Return basic interpretation if premium data not available
        return _get_basic_interpretation(hexagram_num, locale)

    # Build interpretation
    lang_key = locale if locale in ["ko", "en"] else "ko"

    interpretation = {
        "hexagram": {
            "number": hexagram_num,
            "name": hex_data.get(f"name_{lang_key}", hex_data.get("name_ko")),
            "hanja": hex_data.get("name_hanja", ""),
            "symbol": hex_data.get("symbol", ""),
            "element": hex_data.get("element", ""),
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
        # Combine all themes for general reading
        general_parts = []
        for t_name, t_data in themes.items():
            if t_data.get(lang_key):
                if lang_key == "ko":
                    general_parts.append(f"[{_theme_name_ko(t_name)}] {t_data[lang_key]}")
                else:
                    general_parts.append(f"[{t_name.title()}] {t_data[lang_key]}")
        interpretation["theme_reading"] = "\n\n".join(general_parts)

    # Changing lines interpretation
    if changing_lines:
        lines_data = hex_data.get("lines", {})
        changing_interpretations = []
        for line_num in changing_lines:
            line_key = str(line_num)
            if line_key in lines_data:
                line_info = lines_data[line_key]
                changing_interpretations.append({
                    "line": line_num,
                    "text": line_info.get(f"text_{lang_key}", ""),
                    "meaning": line_info.get(f"meaning_{lang_key}", ""),
                })
        interpretation["changing_lines"] = changing_interpretations

    # Saju cross-analysis
    if saju_element:
        saju_conn = hex_data.get("saju_connection", {})
        day_master_advice = saju_conn.get("day_master_advice", {})
        if saju_element in day_master_advice:
            interpretation["saju_advice"] = day_master_advice[saju_element]
        interpretation["element_harmony"] = saju_conn.get("element_harmony", "")

    # Trigram analysis
    upper_trigram = hex_data.get("trigram_upper")
    lower_trigram = hex_data.get("trigram_lower")
    if upper_trigram and lower_trigram and trigrams:
        upper_data = trigrams.get(upper_trigram, {})
        lower_data = trigrams.get(lower_trigram, {})
        interpretation["trigram_analysis"] = {
            "upper": {
                "name": upper_data.get(f"name_{lang_key}", upper_trigram),
                "meaning": upper_data.get(f"meaning_{lang_key}", ""),
                "element": upper_data.get("element", ""),
            },
            "lower": {
                "name": lower_data.get(f"name_{lang_key}", lower_trigram),
                "meaning": lower_data.get(f"meaning_{lang_key}", ""),
                "element": lower_data.get("element", ""),
            },
        }

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
# FULL READING (Cast + Interpret)
# ===============================================================
def perform_iching_reading(
    question: str = None,
    theme: str = "general",
    locale: str = "ko",
    saju_element: str = None,
) -> Dict:
    """
    Perform a complete I Ching reading.

    Args:
        question: User's question (optional)
        theme: Theme for interpretation
        locale: Language
        saju_element: Day master element for cross-analysis

    Returns:
        Complete reading with cast result and interpretation
    """
    # Cast hexagram
    cast_result = cast_hexagram()

    # Get primary hexagram interpretation
    primary_interp = get_hexagram_interpretation(
        hexagram_num=cast_result["primary"]["number"],
        theme=theme,
        locale=locale,
        changing_lines=[l["line_num"] for l in cast_result["changing_lines"]],
        saju_element=saju_element,
    )

    # Get resulting hexagram interpretation if there are changing lines
    resulting_interp = None
    if cast_result["resulting"]:
        resulting_interp = get_hexagram_interpretation(
            hexagram_num=cast_result["resulting"]["number"],
            theme=theme,
            locale=locale,
            saju_element=saju_element,
        )

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
        "rag_context": rag_context if rag_context else None,
    }

    # Generate summary
    reading["summary"] = _generate_summary(reading, locale)

    return reading


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
