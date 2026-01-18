"""
Tarot Routes Constants
Theme mapping and related constants for tarot interpretation.
"""
from typing import Dict, Tuple

# Theme mapping: Frontend IDs → Backend theme names
TAROT_THEME_MAPPING: Dict[str, str] = {
    # Direct matches
    "love": "love",
    "career": "career",
    "health": "health",
    "spiritual": "spiritual",
    "daily": "daily",
    "monthly": "monthly",
    "life_path": "life_path",
    "family": "family",

    # Frontend uses hyphens, backend uses underscores/different names
    "love-relationships": "love",
    "career-work": "career",
    "money-finance": "wealth",
    "well-being-health": "health",
    "spiritual-growth": "spiritual",
    "daily-reading": "daily",
    "general-insight": "life_path",
    "decisions-crossroads": "life_path",
    "self-discovery": "life_path",
}

# Sub-topic mapping for themes that use different sub_topic names
TAROT_SUBTOPIC_MAPPING: Dict[Tuple[str, str], Tuple[str, str]] = {
    # decisions-crossroads spreads → life_path sub_topics
    ("decisions-crossroads", "simple-choice"): ("life_path", "crossroads"),
    ("decisions-crossroads", "decision-cross"): ("life_path", "major_decision"),
    ("decisions-crossroads", "path-ahead"): ("life_path", "life_direction"),

    # self-discovery spreads → life_path sub_topics
    ("self-discovery", "inner-self"): ("life_path", "true_self"),
    ("self-discovery", "personal-growth"): ("life_path", "life_lessons"),

    # general-insight spreads → various themes
    ("general-insight", "quick-reading"): ("daily", "one_card"),
    ("general-insight", "past-present-future"): ("daily", "three_card"),
    ("general-insight", "celtic-cross"): ("life_path", "life_direction"),
}

# Playful/fun question keywords (Korean)
PLAYFUL_KEYWORDS_KO = [
    "개한테", "고양이한테", "강아지한테", "동물",
    "키스", "뽀뽀", "핥", "물어",
    "라면", "밥 먹", "치킨", "피자", "짜장면",
    "게임", "유튜브", "넷플릭스", "틱톡",
    "머리 염색", "문신", "타투", "피어싱",
    "술 마", "담배", "복권", "로또",
    "외계인", "귀신", "유령", "좀비",
]

# Playful/fun question keywords (English)
PLAYFUL_KEYWORDS_EN = [
    "kiss a dog", "kiss my dog", "pet", "lotto", "lottery",
]

PLAYFUL_KEYWORDS = PLAYFUL_KEYWORDS_KO + PLAYFUL_KEYWORDS_EN

# Korean weekday names
WEEKDAY_NAMES_KO = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
