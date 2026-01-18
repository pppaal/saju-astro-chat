# backend_ai/app/iching/hexagram_calc.py
"""
Hexagram Calculation Functions
===============================
Functions for calculating nuclear, opposite, and reverse hexagrams,
and for casting hexagrams using the traditional three-coin method.
"""
import random
from typing import Dict, List, Optional

from .data_loader import load_premium_data


# King Wen sequence mapping
KING_WEN_MAP = {
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


def binary_to_hexagram_num(binary: str) -> int:
    """Convert binary string to hexagram number (1-64)."""
    return KING_WEN_MAP.get(binary, 1)


def calculate_nuclear_hexagram(binary: str) -> Optional[int]:
    """
    Calculate the nuclear hexagram (互卦/호괘).
    Formed by lines 2-3-4 as lower trigram and 3-4-5 as upper trigram.
    """
    if len(binary) != 6:
        return None

    # Lines are indexed 0-5 (bottom to top)
    # Lower trigram: lines 2, 3, 4 (indices 1, 2, 3)
    # Upper trigram: lines 3, 4, 5 (indices 2, 3, 4)
    nuclear_binary = binary[1:4] + binary[2:5]
    return binary_to_hexagram_num(nuclear_binary)


def calculate_opposite_hexagram(binary: str) -> Optional[int]:
    """
    Calculate the opposite hexagram (錯卦/착괘).
    All lines reversed (yin ↔ yang).
    """
    if len(binary) != 6:
        return None

    opposite_binary = "".join("1" if b == "0" else "0" for b in binary)
    return binary_to_hexagram_num(opposite_binary)


def calculate_reverse_hexagram(binary: str) -> Optional[int]:
    """
    Calculate the reverse hexagram (綜卦/종괘).
    Hexagram flipped upside down.
    """
    if len(binary) != 6:
        return None

    reverse_binary = binary[::-1]
    return binary_to_hexagram_num(reverse_binary)


def get_related_hexagrams(hexagram_num: int, binary: str) -> Dict:
    """Get all related hexagrams (nuclear, opposite, reverse)."""
    hexagrams, _ = load_premium_data()

    nuclear_num = calculate_nuclear_hexagram(binary)
    opposite_num = calculate_opposite_hexagram(binary)
    reverse_num = calculate_reverse_hexagram(binary)

    def get_hex_info(num):
        if num is None:
            return None
        hex_data = hexagrams.get(str(num), {})
        return {
            "number": num,
            "name": hex_data.get("name_ko", f"제{num}괘"),
            "symbol": hex_data.get("symbol", chr(0x4DC0 + num - 1)),
            "core_meaning": hex_data.get("core_meaning", {}).get("ko", ""),
        }

    return {
        "nuclear": {
            "info": get_hex_info(nuclear_num),
            "korean": "호괘(互卦)",
            "description": "내면에 숨겨진 의미, 상황의 본질을 나타냅니다. 2-3-4효와 3-4-5효로 구성됩니다.",
            "interpretation_hint": "현재 상황 속에 숨겨진 진짜 의미를 보여줍니다.",
        },
        "opposite": {
            "info": get_hex_info(opposite_num),
            "korean": "착괘(錯卦)",
            "description": "음양이 모두 반전된 괘. 정반대 상황이나 대비되는 관점을 나타냅니다.",
            "interpretation_hint": "현 상황과 정반대로 생각해보면 얻을 수 있는 통찰입니다.",
        },
        "reverse": {
            "info": get_hex_info(reverse_num),
            "korean": "종괘(綜卦)",
            "description": "위아래가 뒤집힌 괘. 상대방 입장이나 역지사지의 관점을 나타냅니다.",
            "interpretation_hint": "상대방의 입장에서 보면 어떨지 생각해보세요.",
        },
    }


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
    primary_num = binary_to_hexagram_num(primary_binary)
    resulting_num = binary_to_hexagram_num(resulting_binary) if primary_binary != resulting_binary else None

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
