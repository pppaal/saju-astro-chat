# backend_ai/app/fortune_score_engine/constants.py
"""
Fortune Score Engine constants and mappings.
Contains element mappings, transit weights, moon phases, and other scoring constants.
"""

from typing import Dict


# Element mappings
ELEMENTS: Dict[str, str] = {
    "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
    "wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水",
}

# Zodiac to element mapping
ZODIAC_ELEMENTS: Dict[str, str] = {
    "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
    "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
    "Gemini": "air", "Libra": "air", "Aquarius": "air",
    "Cancer": "water", "Scorpio": "water", "Pisces": "water",
}

# Branch to zodiac rough mapping
BRANCH_ZODIAC: Dict[str, str] = {
    "子": "Capricorn", "丑": "Capricorn", "寅": "Aquarius", "卯": "Pisces",
    "辰": "Aries", "巳": "Taurus", "午": "Gemini", "未": "Cancer",
    "申": "Leo", "酉": "Virgo", "戌": "Libra", "亥": "Scorpio",
}

# Ten Gods weights
SIBSIN_WEIGHTS: Dict[str, float] = {
    "비견": 0, "겁재": -0.5, "식신": 0.5, "상관": -0.3,
    "편재": 0.3, "정재": 0.5, "편관": -0.3, "정관": 0.5,
    "편인": 0.2, "정인": 0.4,
}

# Transit planet weights
TRANSIT_WEIGHTS: Dict[str, Dict[str, float]] = {
    "Jupiter": {"conjunction": 3, "trine": 2, "sextile": 1, "square": -1, "opposition": -1},
    "Saturn": {"conjunction": -2, "trine": 1, "sextile": 0.5, "square": -2, "opposition": -2},
    "Mars": {"conjunction": 1, "trine": 1, "sextile": 0.5, "square": -1.5, "opposition": -1},
    "Venus": {"conjunction": 2, "trine": 1.5, "sextile": 1, "square": -0.5, "opposition": -0.5},
    "Mercury": {"conjunction": 0.5, "trine": 0.5, "sextile": 0.3, "square": -0.3, "opposition": -0.3},
    "Sun": {"conjunction": 1, "trine": 1, "sextile": 0.5, "square": -0.5, "opposition": -0.5},
    "Moon": {"conjunction": 0.5, "trine": 0.5, "sextile": 0.3, "square": -0.3, "opposition": -0.3},
    "Uranus": {"conjunction": 0, "trine": 1, "sextile": 0.5, "square": -1, "opposition": -1},
    "Neptune": {"conjunction": 0, "trine": 0.5, "sextile": 0.3, "square": -0.5, "opposition": -0.5},
    "Pluto": {"conjunction": 0, "trine": 1, "sextile": 0.5, "square": -1.5, "opposition": -1.5},
}

# Moon phase scores
MOON_PHASE_SCORES: Dict[str, int] = {
    "New Moon": 8, "Waxing Crescent": 7, "First Quarter": 6,
    "Waxing Gibbous": 7, "Full Moon": 10, "Waning Gibbous": 6,
    "Last Quarter": 5, "Waning Crescent": 4, "Dark Moon": 3,
}

# Planetary hour ruler scores
PLANETARY_HOUR_SCORES: Dict[str, int] = {
    "Sun": 8, "Jupiter": 8, "Venus": 7, "Moon": 6,
    "Mercury": 5, "Mars": 4, "Saturn": 3,
}

# Major retrograde impact scores
MAJOR_RETROGRADE_SCORES: Dict[str, float] = {
    "Mercury": -2,
    "Venus": -1.5,
    "Mars": -1.5,
}

# Minor retrograde impact scores
MINOR_RETROGRADE_SCORES: Dict[str, float] = {
    "Jupiter": -0.5,
    "Saturn": -0.5,
    "Uranus": -0.3,
    "Neptune": -0.3,
    "Pluto": -0.2,
}

# Geokguk grade scores
GEOKGUK_GRADE_SCORES: Dict[str, int] = {
    "상": 4, "중상": 3, "중": 2, "중하": 1, "하": 0,
    "high": 4, "medium-high": 3, "medium": 2, "medium-low": 1, "low": 0
}

# Day master element to Western element mapping
DM_ELEMENT_WESTERN: Dict[str, str] = {
    "木": "air", "火": "fire", "土": "earth", "金": "earth", "水": "water",
    "wood": "air", "fire": "fire", "earth": "earth", "metal": "earth", "water": "water",
}
