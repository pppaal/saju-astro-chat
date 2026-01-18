"""
Data package for template renderer.
Contains static dictionaries for day masters, sibsin meanings, and zodiac profiles.
"""

from .day_master import DAY_MASTER_PROFILES
from .sibsin import (
    SIBSIN_MEANINGS,
    SIBSIN_EN,
    SIBSIN_SIMPLE,
    SIBSIN_SIMPLE_EN,
    SIBSIN_DAEUN_MEANING,
    SIBSIN_ANNUAL_MEANING,
)
from .zodiac import (
    ZODIAC_PROFILES,
    SIGN_KO,
    MC_CAREERS,
    VENUS_LOVE_STYLES,
    ASC_HEALTH,
    HOUSE4_ANALYSIS,
    HOUSE6_HEALTH,
    CHIRON_MEANING,
)

__all__ = [
    "DAY_MASTER_PROFILES",
    "SIBSIN_MEANINGS",
    "SIBSIN_EN",
    "SIBSIN_SIMPLE",
    "SIBSIN_SIMPLE_EN",
    "SIBSIN_DAEUN_MEANING",
    "SIBSIN_ANNUAL_MEANING",
    "ZODIAC_PROFILES",
    "SIGN_KO",
    "MC_CAREERS",
    "VENUS_LOVE_STYLES",
    "ASC_HEALTH",
    "HOUSE4_ANALYSIS",
    "HOUSE6_HEALTH",
    "CHIRON_MEANING",
]
