"""
Unit tests for Template Renderer Sections module.

Tests:
- Section constants
- Theme-specific section generators
"""
import pytest
from unittest.mock import patch, MagicMock


class TestSignConstants:
    """Tests for sign constants."""

    def test_sign_korean_mapping_complete(self):
        """Test all zodiac signs have Korean translation."""
        from backend_ai.app.template_renderer.themes.sections import _SIGN_KO

        signs = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]

        for sign in signs:
            assert sign in _SIGN_KO
            assert len(_SIGN_KO[sign]) > 0

    def test_sign_korean_has_korean_chars(self):
        """Test Korean translations contain Korean characters."""
        from backend_ai.app.template_renderer.themes.sections import _SIGN_KO

        for sign, korean in _SIGN_KO.items():
            assert "자리" in korean  # All zodiac signs end in "자리"


class TestElementConstants:
    """Tests for element constants."""

    def test_element_korean_mapping_complete(self):
        """Test all five elements have mapping."""
        from backend_ai.app.template_renderer.themes.sections import _ELEMENT_KO

        elements = ["목", "화", "토", "금", "수"]

        for element in elements:
            assert element in _ELEMENT_KO


class TestWeekdayConstants:
    """Tests for weekday constants."""

    def test_weekday_korean_tuple(self):
        """Test weekday Korean tuple has 7 days."""
        from backend_ai.app.template_renderer.themes.sections import _WEEKDAY_KO

        assert len(_WEEKDAY_KO) == 7
        assert _WEEKDAY_KO[0] == "월"  # Monday
        assert _WEEKDAY_KO[6] == "일"  # Sunday


class TestMoonPhaseConstants:
    """Tests for moon phase constants."""

    def test_moon_phases_defined(self):
        """Test moon phases are defined."""
        from backend_ai.app.template_renderer.themes.sections import _MOON_PHASES

        phases = ["초승달", "상현달", "보름달", "하현달"]

        for phase in phases:
            assert phase in _MOON_PHASES
            assert len(_MOON_PHASES[phase]) > 0


class TestWeekGuideConstants:
    """Tests for week guide constants."""

    def test_week_guide_has_all_sibsin(self):
        """Test week guide has all ten sibsin."""
        from backend_ai.app.template_renderer.themes.sections import _WEEK_GUIDE

        sibsin_list = [
            "식신", "상관", "편재", "정재", "편관",
            "정관", "편인", "정인", "비견", "겁재"
        ]

        for sibsin in sibsin_list:
            assert sibsin in _WEEK_GUIDE
            assert "week1" in _WEEK_GUIDE[sibsin]
            assert "week2" in _WEEK_GUIDE[sibsin]
            assert "week3" in _WEEK_GUIDE[sibsin]
            assert "week4" in _WEEK_GUIDE[sibsin]

    def test_default_weeks_defined(self):
        """Test default weeks are defined."""
        from backend_ai.app.template_renderer.themes.sections import _DEFAULT_WEEKS

        assert "week1" in _DEFAULT_WEEKS
        assert "week2" in _DEFAULT_WEEKS
        assert "week3" in _DEFAULT_WEEKS
        assert "week4" in _DEFAULT_WEEKS


class TestQuarterGuideConstants:
    """Tests for quarter guide constants."""

    def test_quarter_guide_has_all_sibsin(self):
        """Test quarter guide has all ten sibsin."""
        from backend_ai.app.template_renderer.themes.sections import _QUARTER_GUIDE

        sibsin_list = [
            "식신", "상관", "편재", "정재", "편관",
            "정관", "편인", "정인", "비견", "겁재"
        ]

        for sibsin in sibsin_list:
            assert sibsin in _QUARTER_GUIDE
            assert "q1" in _QUARTER_GUIDE[sibsin]
            assert "q2" in _QUARTER_GUIDE[sibsin]
            assert "q3" in _QUARTER_GUIDE[sibsin]
            assert "q4" in _QUARTER_GUIDE[sibsin]

    def test_default_quarters_defined(self):
        """Test default quarters are defined."""
        from backend_ai.app.template_renderer.themes.sections import _DEFAULT_QUARTERS

        assert "q1" in _DEFAULT_QUARTERS
        assert "q2" in _DEFAULT_QUARTERS
        assert "q3" in _DEFAULT_QUARTERS
        assert "q4" in _DEFAULT_QUARTERS


class TestMCCareerConstants:
    """Tests for MC career constants."""

    def test_mc_careers_all_signs(self):
        """Test all zodiac signs have career mapping."""
        from backend_ai.app.template_renderer.themes.sections import _MC_CAREERS

        signs = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]

        for sign in signs:
            assert sign in _MC_CAREERS
            assert len(_MC_CAREERS[sign]) > 0


class TestBuildersImport:
    """Tests for builders module imports."""

    def test_get_sibsin_value_importable(self):
        """Test get_sibsin_value is importable."""
        from backend_ai.app.template_renderer.builders import get_sibsin_value

        assert callable(get_sibsin_value)

    def test_normalize_day_master_importable(self):
        """Test normalize_day_master is importable."""
        from backend_ai.app.template_renderer.builders import normalize_day_master

        assert callable(normalize_day_master)


class TestDataImports:
    """Tests for data module imports."""

    def test_day_master_profiles_importable(self):
        """Test DAY_MASTER_PROFILES is importable."""
        from backend_ai.app.template_renderer.data import DAY_MASTER_PROFILES

        assert DAY_MASTER_PROFILES is not None
        assert isinstance(DAY_MASTER_PROFILES, dict)

    def test_sibsin_meanings_importable(self):
        """Test SIBSIN_MEANINGS is importable."""
        from backend_ai.app.template_renderer.data import SIBSIN_MEANINGS

        assert SIBSIN_MEANINGS is not None
        assert isinstance(SIBSIN_MEANINGS, dict)

    def test_zodiac_profiles_importable(self):
        """Test ZODIAC_PROFILES is importable."""
        from backend_ai.app.template_renderer.data import ZODIAC_PROFILES

        assert ZODIAC_PROFILES is not None
        assert isinstance(ZODIAC_PROFILES, dict)


class TestTemplateRendererPackage:
    """Tests for template_renderer package."""

    def test_package_importable(self):
        """Test template_renderer package is importable."""
        from backend_ai.app import template_renderer

        assert template_renderer is not None

    def test_themes_module_importable(self):
        """Test themes module is importable."""
        from backend_ai.app.template_renderer import themes

        assert themes is not None

    def test_builders_module_importable(self):
        """Test builders module is importable."""
        from backend_ai.app.template_renderer import builders

        assert builders is not None

    def test_data_module_importable(self):
        """Test data module is importable."""
        from backend_ai.app.template_renderer import data

        assert data is not None


class TestThemesRender:
    """Tests for themes render module."""

    def test_render_module_importable(self):
        """Test render module is importable."""
        from backend_ai.app.template_renderer.themes import render

        assert render is not None


class TestThemesSummary:
    """Tests for themes summary module."""

    def test_summary_module_importable(self):
        """Test summary module is importable."""
        from backend_ai.app.template_renderer.themes import summary

        assert summary is not None

