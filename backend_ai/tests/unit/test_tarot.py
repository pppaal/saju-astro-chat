"""
Unit tests for Tarot module.

Tests:
- Constants
- Data structures
- Engine functions
- Loaders
"""
import pytest


class TestTarotConstants:
    """Tests for tarot constants."""

    def test_suit_info_complete(self):
        """All four suits should be defined."""
        from app.tarot.constants import SUIT_INFO

        # Keys are capitalized
        suits = ["Wands", "Cups", "Swords", "Pentacles"]
        for suit in suits:
            assert suit in SUIT_INFO

    def test_suit_info_structure(self):
        """Each suit should have required fields."""
        from app.tarot.constants import SUIT_INFO

        for suit, info in SUIT_INFO.items():
            assert "element" in info
            assert "themes" in info

    def test_numerology_complete(self):
        """Numbers 1-10 should be defined."""
        from app.tarot.constants import NUMEROLOGY

        for num in range(1, 11):
            assert num in NUMEROLOGY or str(num) in NUMEROLOGY

    def test_court_ranks_complete(self):
        """Court ranks should be defined."""
        from app.tarot.constants import COURT_RANKS

        # Keys are capitalized
        ranks = ["Page", "Knight", "Queen", "King"]
        for rank in ranks:
            assert rank in COURT_RANKS

    def test_element_interactions(self):
        """Element interactions should be defined."""
        from app.tarot.constants import ELEMENT_INTERACTIONS

        assert len(ELEMENT_INTERACTIONS) > 0

    def test_theme_key_cards(self):
        """Theme key cards should be defined."""
        from app.tarot.constants import THEME_KEY_CARDS

        # Common themes should have key cards
        common_themes = ["love", "career", "money", "health"]
        found_themes = 0
        for theme in common_themes:
            if theme in THEME_KEY_CARDS:
                found_themes += 1
        assert found_themes >= 2  # At least some themes defined

    def test_weekday_planets(self):
        """Weekday planets should be defined."""
        from app.tarot.constants import WEEKDAY_PLANETS

        assert len(WEEKDAY_PLANETS) == 7

    def test_moon_phases(self):
        """Moon phases should be defined."""
        from app.tarot.constants import MOON_PHASES

        assert len(MOON_PHASES) > 0


class TestTarotData:
    """Tests for tarot data structures."""

    def test_card_theme_scores(self):
        """Card theme scores should be defined."""
        from app.tarot.data import CARD_THEME_SCORES

        assert len(CARD_THEME_SCORES) > 0

    def test_card_synergies(self):
        """Card synergies should be defined."""
        from app.tarot.data import CARD_SYNERGIES

        assert len(CARD_SYNERGIES) > 0


class TestTarotPersonalizationData:
    """Tests for tarot personalization data."""

    def test_birth_card_map(self):
        """Birth card map should be defined."""
        from app.tarot.personalization_data import BIRTH_CARD_MAP

        assert len(BIRTH_CARD_MAP) > 0

    def test_year_themes(self):
        """Year themes should be defined."""
        from app.tarot.personalization_data import YEAR_THEMES

        assert len(YEAR_THEMES) > 0


class TestTarotLayersData:
    """Tests for tarot layers data."""

    def test_interpretation_layers(self):
        """Interpretation layers should be defined."""
        from app.tarot.layers_data import INTERPRETATION_LAYERS

        assert len(INTERPRETATION_LAYERS) > 0

    def test_major_arcana_layers(self):
        """Major arcana layers should be defined."""
        from app.tarot.layers_data import MAJOR_ARCANA_LAYERS

        # 22 major arcana cards (0-21)
        assert len(MAJOR_ARCANA_LAYERS) >= 22


class TestTarotStorytellingData:
    """Tests for tarot storytelling data."""

    def test_narrative_structures(self):
        """Narrative structures should be defined."""
        from app.tarot.storytelling_data import NARRATIVE_STRUCTURES

        assert len(NARRATIVE_STRUCTURES) > 0

    def test_card_transitions(self):
        """Card transitions should be defined."""
        from app.tarot.storytelling_data import CARD_TRANSITIONS

        assert len(CARD_TRANSITIONS) > 0


class TestTarotEngine:
    """Tests for TarotPatternEngine."""

    def test_engine_instantiation(self):
        """Engine should instantiate."""
        from app.tarot.engine import TarotPatternEngine

        engine = TarotPatternEngine()
        assert engine is not None

    def test_get_pattern_engine(self):
        """Get pattern engine singleton."""
        from app.tarot import get_pattern_engine

        engine = get_pattern_engine()
        assert engine is not None

    def test_get_premium_engine(self):
        """Get premium engine singleton."""
        from app.tarot import get_premium_engine

        engine = get_premium_engine()
        assert engine is not None


class TestTarotLoaders:
    """Tests for tarot loaders."""

    def test_rules_loader_instantiation(self):
        """Rules loader should instantiate."""
        from app.tarot.rules_loader import AdvancedRulesLoader

        loader = AdvancedRulesLoader()
        assert loader is not None

    def test_get_rules_loader(self):
        """Get rules loader singleton."""
        from app.tarot import get_rules_loader

        loader = get_rules_loader()
        assert loader is not None

    def test_spread_loader_instantiation(self):
        """Spread loader should instantiate."""
        from app.tarot.spread_loader import SpreadLoader

        loader = SpreadLoader()
        assert loader is not None

    def test_get_spread_loader(self):
        """Get spread loader singleton."""
        from app.tarot import get_spread_loader

        loader = get_spread_loader()
        assert loader is not None


class TestTarotModuleExports:
    """Tests for tarot module exports."""

    def test_all_exports_available(self):
        """All exported items should be importable."""
        from app.tarot import (
            # Constants
            SUIT_INFO,
            NUMEROLOGY,
            COURT_RANKS,
            ELEMENT_INTERACTIONS,
            POLARITY_PAIRS,
            THEME_KEY_CARDS,
            WEEKDAY_PLANETS,
            MOON_PHASES,
            TRANSFORMATION_SEQUENCES,
            # Data
            CARD_THEME_SCORES,
            CARD_SYNERGIES,
            # Personalization
            BIRTH_CARD_MAP,
            YEAR_THEMES,
            # Layers
            INTERPRETATION_LAYERS,
            MAJOR_ARCANA_LAYERS,
            # Storytelling
            NARRATIVE_STRUCTURES,
            CARD_TRANSITIONS,
            # Classes
            TarotPatternEngine,
            PersonalizationMixin,
            MultiLayerMixin,
            StorytellingMixin,
            TarotPatternEnginePremium,
            get_pattern_engine,
            get_premium_engine,
            # Loaders
            AdvancedRulesLoader,
            get_rules_loader,
            SpreadLoader,
            get_spread_loader,
        )

        assert SUIT_INFO is not None
        assert TarotPatternEngine is not None
        assert callable(get_pattern_engine)


class TestTarotMixins:
    """Tests for tarot mixin classes."""

    def test_personalization_mixin_exists(self):
        """PersonalizationMixin should exist."""
        from app.tarot.mixins import PersonalizationMixin

        assert PersonalizationMixin is not None

    def test_multilayer_mixin_exists(self):
        """MultiLayerMixin should exist."""
        from app.tarot.mixins import MultiLayerMixin

        assert MultiLayerMixin is not None

    def test_storytelling_mixin_exists(self):
        """StorytellingMixin should exist."""
        from app.tarot.mixins import StorytellingMixin

        assert StorytellingMixin is not None
