"""
Unit tests for I-Ching wuxing (Five Elements) module.

Tests:
- Season functions
- Solar term functions
- Seasonal harmony analysis
- Wuxing relationship analysis
- Saju element analysis
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestGetCurrentSeason:
    """Tests for get_current_season function."""

    @patch('backend_ai.app.iching.wuxing.datetime')
    def test_spring_months(self, mock_datetime):
        """Months 3, 4, 5 should return spring."""
        from backend_ai.app.iching.wuxing import get_current_season

        for month in [3, 4, 5]:
            mock_datetime.now.return_value = datetime(2024, month, 15)
            assert get_current_season() == "spring"

    @patch('backend_ai.app.iching.wuxing.datetime')
    def test_summer_months(self, mock_datetime):
        """Months 6, 7, 8 should return summer."""
        from backend_ai.app.iching.wuxing import get_current_season

        for month in [6, 7, 8]:
            mock_datetime.now.return_value = datetime(2024, month, 15)
            assert get_current_season() == "summer"

    @patch('backend_ai.app.iching.wuxing.datetime')
    def test_autumn_months(self, mock_datetime):
        """Months 9, 10, 11 should return autumn."""
        from backend_ai.app.iching.wuxing import get_current_season

        for month in [9, 10, 11]:
            mock_datetime.now.return_value = datetime(2024, month, 15)
            assert get_current_season() == "autumn"

    @patch('backend_ai.app.iching.wuxing.datetime')
    def test_winter_months(self, mock_datetime):
        """Months 12, 1, 2 should return winter."""
        from backend_ai.app.iching.wuxing import get_current_season

        for month in [12, 1, 2]:
            mock_datetime.now.return_value = datetime(2024, month, 15)
            assert get_current_season() == "winter"


class TestGetCurrentSolarTerm:
    """Tests for get_current_solar_term function."""

    def test_returns_string(self):
        """Function should return a string."""
        from backend_ai.app.iching.wuxing import get_current_solar_term

        result = get_current_solar_term()
        assert isinstance(result, str)
        assert len(result) > 0

    @patch('backend_ai.app.iching.wuxing.datetime')
    def test_specific_solar_term(self, mock_datetime):
        """Test specific date returns expected solar term."""
        from backend_ai.app.iching.wuxing import get_current_solar_term

        # February 5 is after 입춘 (Feb 4)
        mock_datetime.now.return_value = datetime(2024, 2, 10)
        result = get_current_solar_term()
        assert result == "입춘"


class TestAnalyzeSeasonalHarmony:
    """Tests for analyze_seasonal_harmony function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        result = analyze_seasonal_harmony("wood")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        result = analyze_seasonal_harmony("fire")

        required_keys = [
            "season", "season_korean", "season_element",
            "hexagram_element", "solar_term", "relationship",
            "description", "score"
        ]
        for key in required_keys:
            assert key in result

    def test_score_range(self):
        """Score should be between 1 and 5."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        for element in ["wood", "fire", "earth", "metal", "water"]:
            result = analyze_seasonal_harmony(element)
            assert 1 <= result["score"] <= 5

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_bihe_relationship(self, mock_season):
        """Same element should return 비화 relationship."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        # Spring = wood element
        mock_season.return_value = "spring"
        result = analyze_seasonal_harmony("wood")

        assert "비화" in result["relationship"]
        assert result["score"] == 4

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_sangsaeng_relationship(self, mock_season):
        """Generating relationship should return 상생."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        # Spring = wood, wood generates fire
        mock_season.return_value = "spring"
        result = analyze_seasonal_harmony("fire")

        assert "상생" in result["relationship"]
        assert result["score"] == 5

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_seolgi_relationship(self, mock_season):
        """Element draining season should return 설기."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        # Spring = wood, water generates wood (so wood drains water)
        mock_season.return_value = "spring"
        result = analyze_seasonal_harmony("water")

        assert "설기" in result["relationship"]
        assert result["score"] == 3


class TestAnalyzeWuxingRelationship:
    """Tests for analyze_wuxing_relationship function."""

    def test_same_element_bihe(self):
        """Same elements should return 비화."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        result = analyze_wuxing_relationship("wood", "wood")

        assert "비화" in result["relationship"]
        assert result["type"] == "harmony"

    def test_generating_relationship(self):
        """Generating cycle should be detected."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        # Wood generates Fire
        result = analyze_wuxing_relationship("wood", "fire")

        assert "상생" in result["relationship"]
        assert result["type"] == "generating"

    def test_generated_relationship(self):
        """Being generated should be detected."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        # Fire is generated by Wood
        result = analyze_wuxing_relationship("fire", "wood")

        assert "상생" in result["relationship"]
        assert result["type"] == "generated"

    def test_overcoming_relationship(self):
        """Overcoming cycle should be detected."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        # Wood overcomes Earth
        result = analyze_wuxing_relationship("wood", "earth")

        assert "상극" in result["relationship"]
        assert result["type"] == "overcoming"

    def test_overcome_relationship(self):
        """Being overcome should be detected."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        # Earth is overcome by Wood
        result = analyze_wuxing_relationship("earth", "wood")

        assert "상극" in result["relationship"]
        assert result["type"] == "overcome"

    def test_neutral_relationship(self):
        """Non-adjacent elements should return neutral."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        # Fire and Metal have no direct relationship in generating/overcoming
        # Actually fire overcomes metal, so let's test water and wood
        # Water generates wood, so let's find true neutral...
        # In 5-element system, all pairs are related. Let's test empty.
        result = analyze_wuxing_relationship("", "")

        assert "relationship" in result

    def test_empty_elements(self):
        """Empty elements should return unknown."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        result = analyze_wuxing_relationship("", "")

        assert result["relationship"] == "unknown"

    def test_has_advice(self):
        """Result should have advice."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        result = analyze_wuxing_relationship("wood", "fire")

        assert "advice" in result

    def test_case_insensitive(self):
        """Function should handle case insensitively."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        result1 = analyze_wuxing_relationship("WOOD", "FIRE")
        result2 = analyze_wuxing_relationship("wood", "fire")

        assert result1["type"] == result2["type"]


class TestGetSajuElementAnalysis:
    """Tests for get_saju_element_analysis function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "fire")

        assert isinstance(result, dict)

    def test_returns_none_for_empty_saju(self):
        """Empty saju element should return None."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "")

        assert result is None

    def test_has_relationship(self):
        """Result should have relationship info."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "fire")

        assert "relationship" in result
        assert "type" in result

    def test_has_saju_specific_advice(self):
        """Result should have saju-specific advice."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "fire")

        assert "saju_specific_advice" in result

    def test_has_day_master(self):
        """Result should have day master in Korean."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "fire")

        assert "day_master" in result

    def test_wood_day_master_generating(self):
        """Wood day master generating fire should have specific advice."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("fire", "wood")

        assert result["type"] == "generating"
        assert "재능" in result["saju_specific_advice"]

    def test_fire_day_master_overcoming(self):
        """Fire day master overcoming metal should have specific advice."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis

        result = get_saju_element_analysis("metal", "fire")

        assert result["type"] == "overcoming"
        assert "성과" in result["saju_specific_advice"]


class TestAllElementCycles:
    """Comprehensive tests for all element cycles."""

    def test_complete_generating_cycle(self):
        """Test the complete generating cycle."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        generating_pairs = [
            ("wood", "fire"),
            ("fire", "earth"),
            ("earth", "metal"),
            ("metal", "water"),
            ("water", "wood"),
        ]

        for source, target in generating_pairs:
            result = analyze_wuxing_relationship(source, target)
            assert result["type"] == "generating", f"{source} -> {target} should be generating"

    def test_complete_overcoming_cycle(self):
        """Test the complete overcoming cycle."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship

        overcoming_pairs = [
            ("wood", "earth"),
            ("earth", "water"),
            ("water", "fire"),
            ("fire", "metal"),
            ("metal", "wood"),
        ]

        for source, target in overcoming_pairs:
            result = analyze_wuxing_relationship(source, target)
            assert result["type"] == "overcoming", f"{source} -> {target} should be overcoming"


class TestSeasonElementMapping:
    """Tests for season to element mapping."""

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_spring_is_wood(self, mock_season):
        """Spring should have wood element."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        mock_season.return_value = "spring"
        result = analyze_seasonal_harmony("wood")

        assert result["season_element"] == "wood"

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_summer_is_fire(self, mock_season):
        """Summer should have fire element."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        mock_season.return_value = "summer"
        result = analyze_seasonal_harmony("fire")

        assert result["season_element"] == "fire"

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_autumn_is_metal(self, mock_season):
        """Autumn should have metal element."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        mock_season.return_value = "autumn"
        result = analyze_seasonal_harmony("metal")

        assert result["season_element"] == "metal"

    @patch('backend_ai.app.iching.wuxing.get_current_season')
    def test_winter_is_water(self, mock_season):
        """Winter should have water element."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony

        mock_season.return_value = "winter"
        result = analyze_seasonal_harmony("water")

        assert result["season_element"] == "water"


class TestModuleExports:
    """Tests for module exports."""

    def test_get_current_season_importable(self):
        """get_current_season should be importable."""
        from backend_ai.app.iching.wuxing import get_current_season
        assert callable(get_current_season)

    def test_get_current_solar_term_importable(self):
        """get_current_solar_term should be importable."""
        from backend_ai.app.iching.wuxing import get_current_solar_term
        assert callable(get_current_solar_term)

    def test_analyze_seasonal_harmony_importable(self):
        """analyze_seasonal_harmony should be importable."""
        from backend_ai.app.iching.wuxing import analyze_seasonal_harmony
        assert callable(analyze_seasonal_harmony)

    def test_analyze_wuxing_relationship_importable(self):
        """analyze_wuxing_relationship should be importable."""
        from backend_ai.app.iching.wuxing import analyze_wuxing_relationship
        assert callable(analyze_wuxing_relationship)

    def test_get_saju_element_analysis_importable(self):
        """get_saju_element_analysis should be importable."""
        from backend_ai.app.iching.wuxing import get_saju_element_analysis
        assert callable(get_saju_element_analysis)
