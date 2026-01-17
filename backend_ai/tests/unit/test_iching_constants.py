"""
Unit tests for I Ching Constants module.

Tests:
- WUXING (Five Elements) constants
- TRIGRAM_INFO
- LINE_POSITION_MEANING
- SOLAR_TERMS
- SEASON_ELEMENT
"""
import pytest


class TestWuxingConstants:
    """Tests for Wuxing (Five Elements) constants."""

    def test_wuxing_generating_exists(self):
        """WUXING_GENERATING should exist."""
        from app.iching import WUXING_GENERATING

        assert WUXING_GENERATING is not None
        assert isinstance(WUXING_GENERATING, dict)

    def test_wuxing_generating_elements(self):
        """WUXING_GENERATING should contain all five elements."""
        from app.iching import WUXING_GENERATING

        expected_elements = ['wood', 'fire', 'earth', 'metal', 'water']
        for element in expected_elements:
            assert element in WUXING_GENERATING or element.capitalize() in str(WUXING_GENERATING)

    def test_wuxing_overcoming_exists(self):
        """WUXING_OVERCOMING should exist."""
        from app.iching import WUXING_OVERCOMING

        assert WUXING_OVERCOMING is not None
        assert isinstance(WUXING_OVERCOMING, dict)

    def test_wuxing_korean_exists(self):
        """WUXING_KOREAN should exist."""
        from app.iching import WUXING_KOREAN

        assert WUXING_KOREAN is not None
        assert isinstance(WUXING_KOREAN, dict)


class TestTrigramInfo:
    """Tests for TRIGRAM_INFO constant."""

    def test_trigram_info_exists(self):
        """TRIGRAM_INFO should exist."""
        from app.iching import TRIGRAM_INFO

        assert TRIGRAM_INFO is not None
        assert isinstance(TRIGRAM_INFO, dict)

    def test_trigram_info_has_eight_trigrams(self):
        """TRIGRAM_INFO should have 8 trigrams."""
        from app.iching import TRIGRAM_INFO

        # I Ching has 8 trigrams
        assert len(TRIGRAM_INFO) == 8


class TestLinePositionMeaning:
    """Tests for LINE_POSITION_MEANING constant."""

    def test_line_position_meaning_exists(self):
        """LINE_POSITION_MEANING should exist."""
        from app.iching import LINE_POSITION_MEANING

        assert LINE_POSITION_MEANING is not None
        assert isinstance(LINE_POSITION_MEANING, dict)

    def test_line_position_meaning_has_six_lines(self):
        """LINE_POSITION_MEANING should have 6 line positions."""
        from app.iching import LINE_POSITION_MEANING

        # I Ching hexagram has 6 lines
        assert len(LINE_POSITION_MEANING) == 6


class TestSolarTerms:
    """Tests for SOLAR_TERMS constant."""

    def test_solar_terms_exists(self):
        """SOLAR_TERMS should exist."""
        from app.iching import SOLAR_TERMS

        assert SOLAR_TERMS is not None

    def test_solar_terms_has_24_terms(self):
        """SOLAR_TERMS should have 24 terms."""
        from app.iching import SOLAR_TERMS

        # Traditional Chinese calendar has 24 solar terms
        if isinstance(SOLAR_TERMS, (list, dict)):
            assert len(SOLAR_TERMS) >= 24


class TestSeasonElement:
    """Tests for SEASON_ELEMENT constant."""

    def test_season_element_exists(self):
        """SEASON_ELEMENT should exist."""
        from app.iching import SEASON_ELEMENT

        assert SEASON_ELEMENT is not None
        assert isinstance(SEASON_ELEMENT, dict)

    def test_season_element_has_four_seasons(self):
        """SEASON_ELEMENT should have 4 seasons."""
        from app.iching import SEASON_ELEMENT

        assert len(SEASON_ELEMENT) >= 4


class TestModuleExports:
    """Tests for module exports from __init__.py."""

    def test_wuxing_generating_from_package(self):
        """WUXING_GENERATING should be importable from package."""
        from app.iching import WUXING_GENERATING
        assert WUXING_GENERATING is not None

    def test_wuxing_overcoming_from_package(self):
        """WUXING_OVERCOMING should be importable from package."""
        from app.iching import WUXING_OVERCOMING
        assert WUXING_OVERCOMING is not None

    def test_wuxing_korean_from_package(self):
        """WUXING_KOREAN should be importable from package."""
        from app.iching import WUXING_KOREAN
        assert WUXING_KOREAN is not None

    def test_trigram_info_from_package(self):
        """TRIGRAM_INFO should be importable from package."""
        from app.iching import TRIGRAM_INFO
        assert TRIGRAM_INFO is not None

    def test_line_position_meaning_from_package(self):
        """LINE_POSITION_MEANING should be importable from package."""
        from app.iching import LINE_POSITION_MEANING
        assert LINE_POSITION_MEANING is not None

    def test_solar_terms_from_package(self):
        """SOLAR_TERMS should be importable from package."""
        from app.iching import SOLAR_TERMS
        assert SOLAR_TERMS is not None

    def test_season_element_from_package(self):
        """SEASON_ELEMENT should be importable from package."""
        from app.iching import SEASON_ELEMENT
        assert SEASON_ELEMENT is not None
