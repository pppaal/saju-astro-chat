"""
Unit tests for Theme Cross Filter module.

Tests:
- Theme enum
- ThemeCrossPoint dataclass
- ImportantDate dataclass
- ThemeCrossReferenceData mappings
- ThemeCrossFilter class
- Factory functions
"""
import pytest
from unittest.mock import patch, MagicMock
from dataclasses import asdict


class TestThemeEnum:
    """Tests for Theme enum."""

    def test_theme_values(self):
        """Test Theme enum values."""
        from backend_ai.app.theme_cross_filter import Theme

        assert Theme.LOVE.value == "love"
        assert Theme.CAREER.value == "career"
        assert Theme.HEALTH.value == "health"
        assert Theme.WEALTH.value == "wealth"
        assert Theme.FAMILY.value == "family"
        assert Theme.EDUCATION.value == "education"
        assert Theme.OVERALL.value == "overall"
        assert Theme.MONTHLY.value == "monthly"
        assert Theme.YEARLY.value == "yearly"
        assert Theme.DAILY.value == "daily"

    def test_theme_count(self):
        """Test all themes are defined."""
        from backend_ai.app.theme_cross_filter import Theme

        assert len(Theme) == 10


class TestThemeCrossPointDataclass:
    """Tests for ThemeCrossPoint dataclass."""

    def test_theme_cross_point_creation(self):
        """Test creating a ThemeCrossPoint."""
        from backend_ai.app.theme_cross_filter import ThemeCrossPoint, Theme

        cross_point = ThemeCrossPoint(
            theme=Theme.LOVE,
            saju_factors=[{"type": "sipsin", "value": "정재"}],
            astro_factors=[{"type": "planet", "name": "venus"}],
            intersections=[{"type": "sipsin_planet"}],
            important_dates=[{"date": "2024-02-14"}],
            relevance_score=85.5,
        )

        assert cross_point.theme == Theme.LOVE
        assert len(cross_point.saju_factors) == 1
        assert len(cross_point.astro_factors) == 1
        assert cross_point.relevance_score == 85.5


class TestImportantDateDataclass:
    """Tests for ImportantDate dataclass."""

    def test_important_date_creation(self):
        """Test creating an ImportantDate."""
        from backend_ai.app.theme_cross_filter import ImportantDate

        date = ImportantDate(
            date="2024-02-14",
            rating=5,
            event_type="월운 최적기",
            saju_reason="정재 운",
            astro_reason="Venus trine",
            combined_reason="사랑운 최고",
            is_auspicious=True,
        )

        assert date.date == "2024-02-14"
        assert date.rating == 5
        assert date.is_auspicious is True


class TestThemeCrossReferenceData:
    """Tests for ThemeCrossReferenceData mappings."""

    def test_theme_sipsin_mapping(self):
        """Test THEME_SIPSIN mapping."""
        from backend_ai.app.theme_cross_filter import ThemeCrossReferenceData, Theme

        love_sipsin = ThemeCrossReferenceData.THEME_SIPSIN[Theme.LOVE]

        assert "primary" in love_sipsin
        assert "secondary" in love_sipsin
        assert "negative" in love_sipsin
        assert "정재" in love_sipsin["primary"]

    def test_theme_planets_mapping(self):
        """Test THEME_PLANETS mapping."""
        from backend_ai.app.theme_cross_filter import ThemeCrossReferenceData, Theme

        love_planets = ThemeCrossReferenceData.THEME_PLANETS[Theme.LOVE]

        assert "primary" in love_planets
        assert "secondary" in love_planets
        assert "houses" in love_planets
        assert "venus" in love_planets["primary"]
        assert 7 in love_planets["houses"]

    def test_sipsin_planet_cross_mapping(self):
        """Test SIPSIN_PLANET_CROSS mapping."""
        from backend_ai.app.theme_cross_filter import ThemeCrossReferenceData

        sipsin_cross = ThemeCrossReferenceData.SIPSIN_PLANET_CROSS

        assert "정재" in sipsin_cross
        assert "planets" in sipsin_cross["정재"]
        assert "meaning" in sipsin_cross["정재"]
        assert "venus" in sipsin_cross["정재"]["planets"]

    def test_ohaeng_element_cross_mapping(self):
        """Test OHAENG_ELEMENT_CROSS mapping."""
        from backend_ai.app.theme_cross_filter import ThemeCrossReferenceData

        ohaeng_cross = ThemeCrossReferenceData.OHAENG_ELEMENT_CROSS

        assert "목" in ohaeng_cross
        assert "화" in ohaeng_cross
        assert "토" in ohaeng_cross
        assert "금" in ohaeng_cross
        assert "수" in ohaeng_cross

        assert "signs" in ohaeng_cross["목"]
        assert "element" in ohaeng_cross["목"]
        assert "planets" in ohaeng_cross["목"]


class TestThemeCrossFilterInit:
    """Tests for ThemeCrossFilter initialization."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_init_default_path(self, mock_load):
        """Test initialization with default path."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        assert filter.base_path is not None
        assert filter._cache == {}
        mock_load.assert_called_once()

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_init_custom_path(self, mock_load):
        """Test initialization with custom path."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter(base_path="/custom/path")

        assert filter.base_path == "/custom/path"


class TestThemeCrossFilterGetThemeEnum:
    """Tests for _get_theme_enum method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_get_theme_enum_love(self, mock_load):
        """Test theme enum conversion for love."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, Theme

        filter = ThemeCrossFilter()

        assert filter._get_theme_enum("love") == Theme.LOVE
        assert filter._get_theme_enum("focus_love") == Theme.LOVE

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_get_theme_enum_career(self, mock_load):
        """Test theme enum conversion for career."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, Theme

        filter = ThemeCrossFilter()

        assert filter._get_theme_enum("career") == Theme.CAREER
        assert filter._get_theme_enum("focus_career") == Theme.CAREER

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_get_theme_enum_fallback(self, mock_load):
        """Test theme enum fallback to OVERALL."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, Theme

        filter = ThemeCrossFilter()

        assert filter._get_theme_enum("unknown") == Theme.OVERALL
        assert filter._get_theme_enum("random") == Theme.OVERALL


class TestExtractSajuFactors:
    """Tests for _extract_saju_factors method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_saju_factors_empty(self, mock_load):
        """Test with empty saju data."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_sipsin = ThemeCrossReferenceData.THEME_SIPSIN[Theme.LOVE]

        factors = filter._extract_saju_factors({}, theme_sipsin)

        assert factors == []

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_saju_factors_day_master(self, mock_load):
        """Test extracting day master."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_sipsin = ThemeCrossReferenceData.THEME_SIPSIN[Theme.LOVE]

        saju_data = {
            "dayMaster": {"stem": "甲", "element": "木", "korean": "갑목"},
            "sipsinDistribution": {},
            "fiveElements": {},
        }

        factors = filter._extract_saju_factors(saju_data, theme_sipsin)

        assert any(f["type"] == "day_master" for f in factors)

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_saju_factors_sipsin(self, mock_load):
        """Test extracting sipsin distribution."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_sipsin = ThemeCrossReferenceData.THEME_SIPSIN[Theme.LOVE]

        saju_data = {
            "sipsinDistribution": {"정재": 2, "정관": 1, "비견": 1},
        }

        factors = filter._extract_saju_factors(saju_data, theme_sipsin)

        sipsin_factors = [f for f in factors if f["type"] == "sipsin"]
        assert len(sipsin_factors) >= 2  # 정재 and 정관 are primary for love


class TestExtractAstroFactors:
    """Tests for _extract_astro_factors method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_astro_factors_empty(self, mock_load):
        """Test with empty astro data."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_planets = ThemeCrossReferenceData.THEME_PLANETS[Theme.LOVE]

        factors = filter._extract_astro_factors({}, theme_planets)

        assert factors == []

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_astro_factors_planets_list(self, mock_load):
        """Test extracting planets from list format."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_planets = ThemeCrossReferenceData.THEME_PLANETS[Theme.LOVE]

        astro_data = {
            "planets": [
                {"name": "Venus", "sign": "Libra", "house": 7, "degree": 15.5},
                {"name": "Moon", "sign": "Cancer", "house": 4, "degree": 20.0},
            ],
            "aspects": [],
            "houses": [],
        }

        factors = filter._extract_astro_factors(astro_data, theme_planets)

        planet_factors = [f for f in factors if f["type"] == "planet"]
        assert len(planet_factors) >= 2

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_extract_astro_factors_planets_dict(self, mock_load):
        """Test extracting planets from dict format."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossReferenceData, Theme

        filter = ThemeCrossFilter()
        theme_planets = ThemeCrossReferenceData.THEME_PLANETS[Theme.LOVE]

        astro_data = {
            "planets": {
                "venus": {"sign": "Libra", "house": 7, "degree": 15.5},
                "moon": {"sign": "Cancer", "house": 4, "degree": 20.0},
            },
            "aspects": [],
            "houses": [],
        }

        factors = filter._extract_astro_factors(astro_data, theme_planets)

        planet_factors = [f for f in factors if f["type"] == "planet"]
        assert len(planet_factors) >= 2


class TestFindIntersections:
    """Tests for _find_intersections method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_find_intersections_empty(self, mock_load):
        """Test with empty factors."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, Theme

        filter = ThemeCrossFilter()

        intersections = filter._find_intersections([], [], Theme.LOVE)

        assert intersections == []

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_find_intersections_sipsin_planet(self, mock_load):
        """Test sipsin-planet intersection."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, Theme

        filter = ThemeCrossFilter()

        saju_factors = [
            {"type": "sipsin", "value": "정재", "cross_planets": ["venus", "saturn"], "relevance": "high"}
        ]
        astro_factors = [{"type": "planet", "name": "venus", "sign": "Libra"}]

        intersections = filter._find_intersections(saju_factors, astro_factors, Theme.LOVE)

        assert len(intersections) >= 1
        assert any(i["type"] == "sipsin_planet" for i in intersections)


class TestCalculateRelevanceScore:
    """Tests for _calculate_relevance_score method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_base_score(self, mock_load):
        """Test base score is 50."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        score = filter._calculate_relevance_score([], [], [])

        assert score == 50.0

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_high_relevance_factors(self, mock_load):
        """Test score increases with high relevance factors."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        saju_factors = [
            {"relevance": "high"},
            {"relevance": "high"},
            {"relevance": "medium"},
        ]
        astro_factors = [{"relevance": "high"}]
        intersections = [{"strength": "strong"}]

        score = filter._calculate_relevance_score(saju_factors, astro_factors, intersections)

        assert score > 50.0

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_score_capped_at_100(self, mock_load):
        """Test score is capped at 100."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        # Create many high relevance factors
        saju_factors = [{"relevance": "high"} for _ in range(20)]
        astro_factors = [{"relevance": "high"} for _ in range(20)]
        intersections = [{"strength": "strong"} for _ in range(20)]

        score = filter._calculate_relevance_score(saju_factors, astro_factors, intersections)

        assert score <= 100


class TestFilterByTheme:
    """Tests for filter_by_theme method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_filter_by_theme_returns_cross_point(self, mock_load):
        """Test filter_by_theme returns ThemeCrossPoint."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter, ThemeCrossPoint

        filter = ThemeCrossFilter()

        result = filter.filter_by_theme("love", {}, {})

        assert isinstance(result, ThemeCrossPoint)


class TestGetThemeSummary:
    """Tests for get_theme_summary method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_get_theme_summary_structure(self, mock_load):
        """Test theme summary structure."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        summary = filter.get_theme_summary("love", {}, {})

        assert "theme" in summary
        assert "relevance_score" in summary
        assert "highlights" in summary
        assert "saju_factors" in summary
        assert "astro_factors" in summary
        assert "intersections" in summary
        assert "important_dates" in summary
        assert "summary" in summary


class TestBuildFilteredPromptContext:
    """Tests for build_filtered_prompt_context method."""

    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter._load_cross_data")
    def test_build_prompt_context_structure(self, mock_load):
        """Test prompt context structure."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        filter = ThemeCrossFilter()

        context = filter.build_filtered_prompt_context("love", {}, {})

        assert "테마: LOVE" in context
        assert "관련도 점수" in context
        assert "사주 핵심 요소" in context
        assert "점성술 핵심 요소" in context


class TestFactoryFunctions:
    """Tests for factory functions."""

    @patch("backend_ai.app.theme_cross_filter._theme_filter", None)
    @patch("backend_ai.app.theme_cross_filter.ThemeCrossFilter")
    def test_get_theme_filter_creates_instance(self, mock_class):
        """Test get_theme_filter creates instance."""
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance

        from backend_ai.app.theme_cross_filter import get_theme_filter

        result = get_theme_filter()

        mock_class.assert_called_once()

    @patch("backend_ai.app.theme_cross_filter.get_theme_filter")
    def test_filter_data_by_theme(self, mock_get_filter):
        """Test filter_data_by_theme convenience function."""
        mock_filter = MagicMock()
        mock_filter.get_theme_summary.return_value = {"theme": "love"}
        mock_get_filter.return_value = mock_filter

        from backend_ai.app.theme_cross_filter import filter_data_by_theme

        result = filter_data_by_theme("love", {}, {})

        mock_filter.get_theme_summary.assert_called_once()

    @patch("backend_ai.app.theme_cross_filter.get_theme_filter")
    def test_get_theme_prompt_context(self, mock_get_filter):
        """Test get_theme_prompt_context convenience function."""
        mock_filter = MagicMock()
        mock_filter.build_filtered_prompt_context.return_value = "context"
        mock_get_filter.return_value = mock_filter

        from backend_ai.app.theme_cross_filter import get_theme_prompt_context

        result = get_theme_prompt_context("career", {}, {})

        mock_filter.build_filtered_prompt_context.assert_called_once()


class TestModuleExports:
    """Tests for module exports."""

    def test_theme_importable(self):
        """Theme should be importable."""
        from backend_ai.app.theme_cross_filter import Theme

        assert Theme is not None

    def test_theme_cross_point_importable(self):
        """ThemeCrossPoint should be importable."""
        from backend_ai.app.theme_cross_filter import ThemeCrossPoint

        assert ThemeCrossPoint is not None

    def test_important_date_importable(self):
        """ImportantDate should be importable."""
        from backend_ai.app.theme_cross_filter import ImportantDate

        assert ImportantDate is not None

    def test_theme_cross_reference_data_importable(self):
        """ThemeCrossReferenceData should be importable."""
        from backend_ai.app.theme_cross_filter import ThemeCrossReferenceData

        assert ThemeCrossReferenceData is not None

    def test_theme_cross_filter_importable(self):
        """ThemeCrossFilter should be importable."""
        from backend_ai.app.theme_cross_filter import ThemeCrossFilter

        assert ThemeCrossFilter is not None

    def test_get_theme_filter_importable(self):
        """get_theme_filter should be importable."""
        from backend_ai.app.theme_cross_filter import get_theme_filter

        assert get_theme_filter is not None

    def test_filter_data_by_theme_importable(self):
        """filter_data_by_theme should be importable."""
        from backend_ai.app.theme_cross_filter import filter_data_by_theme

        assert filter_data_by_theme is not None

    def test_get_theme_prompt_context_importable(self):
        """get_theme_prompt_context should be importable."""
        from backend_ai.app.theme_cross_filter import get_theme_prompt_context

        assert get_theme_prompt_context is not None
