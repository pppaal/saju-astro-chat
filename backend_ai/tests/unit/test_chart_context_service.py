"""
Chart Context Service Tests

Tests for building rich context summaries from Saju and Astrology charts.
"""

import pytest
from typing import Dict, Any

from backend_ai.app.services.chart_context_service import (
    ChartContextService,
    build_saju_context,
    build_astrology_context,
    build_combined_context,
)


@pytest.fixture
def sample_saju_data() -> Dict[str, Any]:
    """Sample Saju calculation result."""
    return {
        "pillars": {
            "year": {"stem": "경", "branch": "오", "hanja": "庚午"},
            "month": {"stem": "무", "branch": "인", "hanja": "戊寅"},
            "day": {"stem": "갑", "branch": "자", "hanja": "甲子"},
            "hour": {"stem": "을", "branch": "축", "hanja": "乙丑"},
        },
        "day_master": {
            "element": "木",
            "yin_yang": "陽",
            "strength_score": 65,
        },
        "element_balance": {
            "木": 3,
            "火": 2,
            "土": 2,
            "金": 1,
            "水": 2,
        },
        "sibsin": {
            "재성": {"count": 2},
            "관성": {"count": 1},
            "식상": {"count": 3},
            "비겁": {"count": 2},
            "인성": {"count": 2},
        },
        "pattern": {
            "name": "식신격",
            "quality": "길격",
        },
        "unse": [
            {"stem": "기", "branch": "묘", "age_range": "30-40"},
            {"stem": "경", "branch": "진", "age_range": "40-50"},
        ],
    }


@pytest.fixture
def sample_astro_data() -> Dict[str, Any]:
    """Sample Astrology calculation result."""
    return {
        "planets": {
            "Sun": {"sign": "Leo", "house": "5", "longitude": 15.5},
            "Moon": {"sign": "Pisces", "house": "12", "longitude": 22.3},
            "Mercury": {"sign": "Virgo", "house": "6", "longitude": 8.7},
            "Venus": {"sign": "Libra", "house": "7", "longitude": 12.1},
            "Mars": {"sign": "Aries", "house": "1", "longitude": 5.9},
            "Jupiter": {"sign": "Sagittarius", "house": "9", "longitude": 18.4},
            "Saturn": {"sign": "Capricorn", "house": "10", "longitude": 25.2},
        },
        "ascendant": {"sign": "Aries", "longitude": 0.0},
        "mc": {"sign": "Capricorn", "longitude": 270.0},
        "houses": [
            {"sign": "Aries", "longitude": 0.0},
            {"sign": "Taurus", "longitude": 30.0},
            {"sign": "Gemini", "longitude": 60.0},
            {"sign": "Cancer", "longitude": 90.0},
        ],
        "aspects": [
            {"planet1": "Sun", "planet2": "Moon", "aspect": "trine", "orb": 2.5},
            {"planet1": "Venus", "planet2": "Mars", "aspect": "opposition", "orb": 1.2},
            {"planet1": "Mercury", "planet2": "Jupiter", "aspect": "square", "orb": 3.8},
        ],
    }


class TestBuildSajuContext:
    """Tests for build_saju_context method."""

    def test_returns_empty_for_none_data(self):
        """None data should return empty string."""
        result = ChartContextService.build_saju_context(None)
        assert result == ""

    def test_returns_empty_for_empty_dict(self):
        """Empty dict should return minimal output or empty."""
        result = ChartContextService.build_saju_context({})
        # Empty dict might return minimal or empty string
        assert isinstance(result, str)

    def test_includes_pillars(self, sample_saju_data):
        """Should include four pillars."""
        result = ChartContextService.build_saju_context(sample_saju_data)

        assert "年柱" in result
        assert "月柱" in result
        assert "日柱" in result
        assert "時柱" in result

    def test_includes_day_master(self, sample_saju_data):
        """Should include day master information."""
        result = ChartContextService.build_saju_context(sample_saju_data)

        assert "일간" in result
        assert "木" in result
        assert "65" in result

    def test_includes_element_balance(self, sample_saju_data):
        """Should include five elements balance."""
        result = ChartContextService.build_saju_context(sample_saju_data)

        assert "오행 균형" in result
        assert "木: 3" in result

    def test_includes_sibsin(self, sample_saju_data):
        """Should include ten gods (sibsin)."""
        result = ChartContextService.build_saju_context(sample_saju_data)

        assert "십성" in result

    def test_includes_pattern(self, sample_saju_data):
        """Should include pattern/structure."""
        result = ChartContextService.build_saju_context(sample_saju_data)

        assert "격국" in result
        assert "식신격" in result

    def test_includes_unse_when_enabled(self, sample_saju_data):
        """Should include daeun when include_unse is True."""
        result = ChartContextService.build_saju_context(sample_saju_data, include_unse=True)

        assert "대운" in result
        assert "30-40" in result

    def test_excludes_unse_when_disabled(self, sample_saju_data):
        """Should exclude daeun when include_unse is False."""
        result = ChartContextService.build_saju_context(sample_saju_data, include_unse=False)

        assert "대운" not in result


class TestBuildAstrologyContext:
    """Tests for build_astrology_context method."""

    def test_returns_empty_for_none_data(self):
        """None data should return empty string."""
        result = ChartContextService.build_astrology_context(None)
        assert result == ""

    def test_returns_empty_for_empty_dict(self):
        """Empty dict should return minimal output or empty."""
        result = ChartContextService.build_astrology_context({})
        # Empty dict might return minimal or empty string
        assert isinstance(result, str)

    def test_includes_planets(self, sample_astro_data):
        """Should include planet positions."""
        result = ChartContextService.build_astrology_context(sample_astro_data)

        assert "Planets" in result
        assert "Sun" in result
        assert "Leo" in result
        assert "Moon" in result
        assert "Pisces" in result

    def test_includes_ascendant(self, sample_astro_data):
        """Should include ascendant."""
        result = ChartContextService.build_astrology_context(sample_astro_data)

        assert "Ascendant" in result
        assert "Aries" in result

    def test_includes_mc(self, sample_astro_data):
        """Should include midheaven (MC)."""
        result = ChartContextService.build_astrology_context(sample_astro_data)

        assert "MC" in result
        assert "Capricorn" in result

    def test_includes_houses(self, sample_astro_data):
        """Should include house cusps."""
        result = ChartContextService.build_astrology_context(sample_astro_data)

        assert "House Cusps" in result
        assert "1H" in result

    def test_includes_aspects_when_enabled(self, sample_astro_data):
        """Should include aspects when include_aspects is True."""
        result = ChartContextService.build_astrology_context(sample_astro_data, include_aspects=True)

        assert "Major Aspects" in result
        assert "trine" in result

    def test_excludes_aspects_when_disabled(self, sample_astro_data):
        """Should exclude aspects when include_aspects is False."""
        result = ChartContextService.build_astrology_context(sample_astro_data, include_aspects=False)

        assert "Major Aspects" not in result


class TestBuildCombinedContext:
    """Tests for build_combined_context method."""

    def test_returns_empty_for_no_data(self):
        """No data should return empty string."""
        result = ChartContextService.build_combined_context()
        assert result == ""

    def test_returns_empty_for_none_data(self):
        """None data should return empty string."""
        result = ChartContextService.build_combined_context(None, None)
        assert result == ""

    def test_includes_saju_only(self, sample_saju_data):
        """Should include only Saju when astro is None."""
        result = ChartContextService.build_combined_context(saju_data=sample_saju_data)

        assert "사주 팔자" in result
        assert "Natal Chart" not in result

    def test_includes_astro_only(self, sample_astro_data):
        """Should include only astro when Saju is None."""
        result = ChartContextService.build_combined_context(astro_data=sample_astro_data)

        assert "Natal Chart" in result
        assert "사주 팔자" not in result

    def test_includes_both(self, sample_saju_data, sample_astro_data):
        """Should include both when both provided."""
        result = ChartContextService.build_combined_context(
            saju_data=sample_saju_data,
            astro_data=sample_astro_data
        )

        assert "사주 팔자" in result
        assert "Natal Chart" in result


class TestBuildCompactSajuSummary:
    """Tests for build_compact_saju_summary method."""

    def test_returns_empty_for_none_data(self):
        """None data should return empty string."""
        result = ChartContextService.build_compact_saju_summary(None)
        assert result == ""

    def test_returns_empty_for_empty_dict(self):
        """Empty dict should return empty string."""
        result = ChartContextService.build_compact_saju_summary({})
        assert result == ""

    def test_includes_pillars_hanja(self, sample_saju_data):
        """Should include pillar hanja."""
        result = ChartContextService.build_compact_saju_summary(sample_saju_data)

        assert "庚午" in result
        assert "戊寅" in result

    def test_includes_day_master(self, sample_saju_data):
        """Should include day master element."""
        result = ChartContextService.build_compact_saju_summary(sample_saju_data)

        assert "일간" in result
        assert "木" in result

    def test_includes_pattern(self, sample_saju_data):
        """Should include pattern name."""
        result = ChartContextService.build_compact_saju_summary(sample_saju_data)

        assert "격국" in result
        assert "식신격" in result

    def test_uses_pipe_separator(self, sample_saju_data):
        """Should use pipe separator."""
        result = ChartContextService.build_compact_saju_summary(sample_saju_data)

        assert "|" in result


class TestExtractKeyThemes:
    """Tests for extract_key_themes method."""

    def test_returns_default_for_no_data(self):
        """No data should return default themes."""
        result = ChartContextService.extract_key_themes()

        assert "general" in result
        assert "fortune" in result

    def test_returns_default_for_empty_data(self):
        """Empty data should return default themes."""
        result = ChartContextService.extract_key_themes({}, {})

        assert "general" in result
        assert "fortune" in result

    def test_extracts_wealth_theme_from_sibsin(self):
        """Should extract wealth theme from 재성."""
        saju_data = {
            "sibsin": {"재성": {"count": 3}},
        }
        result = ChartContextService.extract_key_themes(saju_data=saju_data)

        assert "wealth" in result

    def test_extracts_career_theme_from_sibsin(self):
        """Should extract career theme from 관성."""
        saju_data = {
            "sibsin": {"관성": {"count": 3}},
        }
        result = ChartContextService.extract_key_themes(saju_data=saju_data)

        assert "career" in result

    def test_extracts_creativity_theme_from_sibsin(self):
        """Should extract creativity theme from 식상."""
        saju_data = {
            "sibsin": {"식상": {"count": 3}},
        }
        result = ChartContextService.extract_key_themes(saju_data=saju_data)

        assert "creativity" in result

    def test_extracts_wealth_from_pattern(self):
        """Should extract wealth from pattern name."""
        saju_data = {
            "pattern": {"name": "정재격"},
        }
        result = ChartContextService.extract_key_themes(saju_data=saju_data)

        assert "wealth" in result

    def test_extracts_career_from_pattern(self):
        """Should extract career from pattern name."""
        saju_data = {
            "pattern": {"name": "정관격"},
        }
        result = ChartContextService.extract_key_themes(saju_data=saju_data)

        assert "career" in result

    def test_extracts_relationship_from_venus_house(self):
        """Should extract relationship from Venus in 7th house."""
        astro_data = {
            "planets": {
                "Venus": {"house": "7"},
            },
        }
        result = ChartContextService.extract_key_themes(astro_data=astro_data)

        assert "relationship" in result

    def test_extracts_career_from_saturn_house(self):
        """Should extract career from Saturn in 10th house."""
        astro_data = {
            "planets": {
                "Saturn": {"house": "10"},
            },
        }
        result = ChartContextService.extract_key_themes(astro_data=astro_data)

        assert "career" in result

    def test_extracts_wealth_from_jupiter_house(self):
        """Should extract wealth from Jupiter in 2nd house."""
        astro_data = {
            "planets": {
                "Jupiter": {"house": "2"},
            },
        }
        result = ChartContextService.extract_key_themes(astro_data=astro_data)

        assert "wealth" in result

    def test_returns_sorted_list(self, sample_saju_data, sample_astro_data):
        """Should return sorted list of themes."""
        result = ChartContextService.extract_key_themes(
            saju_data=sample_saju_data,
            astro_data=sample_astro_data
        )

        assert result == sorted(result)


class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    def test_build_saju_context_convenience(self, sample_saju_data):
        """Convenience function should work."""
        result = build_saju_context(sample_saju_data)
        assert "사주 팔자" in result

    def test_build_astrology_context_convenience(self, sample_astro_data):
        """Convenience function should work."""
        result = build_astrology_context(sample_astro_data)
        assert "Natal Chart" in result

    def test_build_combined_context_convenience(self, sample_saju_data, sample_astro_data):
        """Convenience function should work."""
        result = build_combined_context(sample_saju_data, sample_astro_data)
        assert "사주 팔자" in result
        assert "Natal Chart" in result


class TestEdgeCases:
    """Edge case tests."""

    def test_handles_partial_pillar_data(self):
        """Should handle missing pillar components."""
        saju_data = {
            "pillars": {
                "year": {"stem": "경"},  # Missing branch and hanja
                "month": {},  # Empty pillar
            },
        }
        result = ChartContextService.build_saju_context(saju_data)
        assert "사주 팔자" in result

    def test_handles_empty_sibsin(self):
        """Should handle empty sibsin counts."""
        saju_data = {
            "sibsin": {
                "재성": {"count": 0},
                "관성": {"count": 0},
            },
        }
        result = ChartContextService.build_saju_context(saju_data)
        assert "사주 팔자" in result

    def test_handles_missing_ascendant(self):
        """Should handle missing ascendant."""
        astro_data = {
            "planets": {"Sun": {"sign": "Leo"}},
        }
        result = ChartContextService.build_astrology_context(astro_data)
        assert "Planets" in result
        assert "Ascendant" not in result

    def test_handles_empty_aspects_list(self):
        """Should handle empty aspects list."""
        astro_data = {
            "aspects": [],
        }
        result = ChartContextService.build_astrology_context(astro_data)
        assert "Major Aspects" not in result

    def test_handles_minor_aspects(self):
        """Should filter out minor aspects."""
        astro_data = {
            "aspects": [
                {"planet1": "Sun", "planet2": "Moon", "aspect": "semisquare", "orb": 1.0},
                {"planet1": "Sun", "planet2": "Mars", "aspect": "quincunx", "orb": 2.0},
            ],
        }
        result = ChartContextService.build_astrology_context(astro_data)
        # Minor aspects should not appear
        assert "semisquare" not in result
        assert "quincunx" not in result

    def test_handles_non_dict_planet_data(self):
        """Should handle non-dict planet data."""
        astro_data = {
            "planets": {
                "Sun": "Leo",  # String instead of dict
            },
        }
        result = ChartContextService.build_astrology_context(astro_data)
        assert "Planets" in result

    def test_handles_empty_pattern(self):
        """Should handle empty pattern."""
        saju_data = {
            "pattern": {},
        }
        result = ChartContextService.build_saju_context(saju_data)
        assert "격국" not in result
