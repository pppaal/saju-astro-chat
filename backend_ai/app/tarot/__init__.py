# backend_ai/app/tarot/__init__.py
"""
Tarot Pattern Engine Package
============================
타로 카드 조합 분석 엔진

Modules:
- constants: 슈트, 숫자, 원소 상수
- data: 테마별 카드 점수, 시너지 데이터
- personalization_data: 탄생 카드, 연간 테마 상수
- layers_data: 다층 해석 상수
- storytelling_data: 스토리텔링 상수
- engine: TarotPatternEngine 메인 클래스
- mixins/: 확장 믹스인 클래스들
- premium: TarotPatternEnginePremium 통합 클래스
"""

# Constants (Tier 1-3)
from .constants import (
    SUIT_INFO,
    NUMEROLOGY,
    COURT_RANKS,
    ELEMENT_INTERACTIONS,
    POLARITY_PAIRS,
    THEME_KEY_CARDS,
    WEEKDAY_PLANETS,
    MOON_PHASES,
    TRANSFORMATION_SEQUENCES,
)

# Data (Tier 2)
from .data import CARD_THEME_SCORES, CARD_SYNERGIES

# Personalization Data (Tier 4)
from .personalization_data import BIRTH_CARD_MAP, YEAR_THEMES

# Layers Data (Tier 5)
from .layers_data import INTERPRETATION_LAYERS, MAJOR_ARCANA_LAYERS

# Storytelling Data (Tier 6)
from .storytelling_data import NARRATIVE_STRUCTURES, CARD_TRANSITIONS

# Engine Classes
from .engine import TarotPatternEngine
from .mixins import PersonalizationMixin, MultiLayerMixin, StorytellingMixin
from .premium import (
    TarotPatternEnginePremium,
    get_pattern_engine,
    get_premium_engine,
)

# Loaders (extracted from tarot_hybrid_rag.py)
from .rules_loader import AdvancedRulesLoader, get_rules_loader
from .spread_loader import SpreadLoader, get_spread_loader

# Utils (extracted from tarot_advanced_embeddings.py)
from .utils import (
    SearchMetrics,
    LRUCache,
    detect_best_device,
    MODEL_OPTIONS,
    DEFAULT_MODEL,
)

__all__ = [
    # Constants (Tier 1-3)
    "SUIT_INFO",
    "NUMEROLOGY",
    "COURT_RANKS",
    "ELEMENT_INTERACTIONS",
    "POLARITY_PAIRS",
    "THEME_KEY_CARDS",
    "WEEKDAY_PLANETS",
    "MOON_PHASES",
    "TRANSFORMATION_SEQUENCES",
    # Data (Tier 2)
    "CARD_THEME_SCORES",
    "CARD_SYNERGIES",
    # Personalization Data (Tier 4)
    "BIRTH_CARD_MAP",
    "YEAR_THEMES",
    # Layers Data (Tier 5)
    "INTERPRETATION_LAYERS",
    "MAJOR_ARCANA_LAYERS",
    # Storytelling Data (Tier 6)
    "NARRATIVE_STRUCTURES",
    "CARD_TRANSITIONS",
    # Engine Classes
    "TarotPatternEngine",
    "PersonalizationMixin",
    "MultiLayerMixin",
    "StorytellingMixin",
    "TarotPatternEnginePremium",
    "get_pattern_engine",
    "get_premium_engine",
    # Loaders
    "AdvancedRulesLoader",
    "get_rules_loader",
    "SpreadLoader",
    "get_spread_loader",
    # Utils
    "SearchMetrics",
    "LRUCache",
    "detect_best_device",
    "MODEL_OPTIONS",
    "DEFAULT_MODEL",
]
