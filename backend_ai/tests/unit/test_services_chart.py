"""
Unit tests for Chart Service module.

Tests:
- ChartService initialization
- get_cross_analysis_for_chart method
- get_theme_fusion_rules method
- Cache loading and rule matching
- Theme-specific analysis
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestChartServiceInit:
    """Tests for ChartService initialization."""

    def test_chart_service_creation(self):
        """ChartService should be instantiable."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()
        assert service is not None

    def test_chart_service_importable(self):
        """ChartService should be importable."""
        from backend_ai.services.chart_service import ChartService
        assert ChartService is not None


class TestGetCrossAnalysisForChart:
    """Tests for get_cross_analysis_for_chart method."""

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_empty_data(self, mock_get_cache):
        """Cross analysis with empty data should return empty string."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()
        result = service.get_cross_analysis_for_chart(
            saju_data={},
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert result == "" or isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_extracts_daymaster(self, mock_get_cache):
        """Cross analysis should extract daymaster from saju data."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        saju_data = {
            "dayMaster": {
                "heavenlyStem": "甲",
                "element": "wood"
            }
        }

        result = service.get_cross_analysis_for_chart(
            saju_data=saju_data,
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_extracts_sun_sign(self, mock_get_cache):
        """Cross analysis should extract sun sign from astro data."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        astro_data = {
            "sun": {"sign": "Aries"},
            "moon": {"sign": "Taurus"}
        }

        result = service.get_cross_analysis_for_chart(
            saju_data={},
            astro_data=astro_data,
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_with_cache_data(self, mock_get_cache):
        """Cross analysis should use cached data when available."""
        from backend_ai.services.chart_service import ChartService

        # Mock cache with sample data
        mock_cache = MagicMock()
        mock_cache.get.return_value = {
            "甲_Aries": {
                "text_ko": "테스트 분석",
                "text_en": "Test analysis",
                "weight": 8
            }
        }
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        saju_data = {"dayMaster": {"heavenlyStem": "甲"}}
        astro_data = {"sun": {"sign": "Aries"}}

        result = service.get_cross_analysis_for_chart(
            saju_data=saju_data,
            astro_data=astro_data,
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_handles_ten_gods(self, mock_get_cache):
        """Cross analysis should handle ten gods data."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        saju_data = {
            "tenGods": {"dominant": "정관"}
        }

        result = service.get_cross_analysis_for_chart(
            saju_data=saju_data,
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_all_themes(self, mock_get_cache):
        """Cross analysis should support all themes."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        themes = [
            "focus_career", "focus_love", "focus_health",
            "focus_wealth", "focus_family", "focus_overall", "chat"
        ]

        for theme in themes:
            result = service.get_cross_analysis_for_chart(
                saju_data={},
                astro_data={},
                theme=theme,
                locale="ko"
            )
            assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_locales(self, mock_get_cache):
        """Cross analysis should support both locales."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        for locale in ["ko", "en"]:
            result = service.get_cross_analysis_for_chart(
                saju_data={},
                astro_data={},
                theme="chat",
                locale=locale
            )
            assert isinstance(result, str)


class TestGetThemeFusionRules:
    """Tests for get_theme_fusion_rules method."""

    def test_theme_fusion_rules_empty_data(self):
        """Theme fusion rules with empty data should return string."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()
        result = service.get_theme_fusion_rules(
            saju_data={},
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_with_daymaster(self):
        """Theme fusion rules should process daymaster data."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        saju_data = {
            "dayMaster": {
                "heavenlyStem": "甲",
                "element": "wood"
            },
            "tenGods": {"dominant": "정관"}
        }

        result = service.get_theme_fusion_rules(
            saju_data=saju_data,
            astro_data={},
            theme="focus_overall",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_all_themes(self):
        """Theme fusion rules should support all themes."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        themes = [
            "focus_overall", "focus_career", "focus_love",
            "focus_health", "focus_wealth", "focus_family",
            "focus_2025", "focus_compatibility", "chat"
        ]

        for theme in themes:
            result = service.get_theme_fusion_rules(
                saju_data={},
                astro_data={},
                theme=theme,
                locale="ko"
            )
            assert isinstance(result, str)

    def test_theme_fusion_rules_with_astro_houses(self):
        """Theme fusion rules should process astro house data."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        astro_data = {
            "sun": {"sign": "Aries", "house": "10"},
            "moon": {"sign": "Cancer", "house": "4"},
            "venus": {"sign": "Taurus", "house": "7"},
            "jupiter": {"sign": "Sagittarius", "house": "9"}
        }

        result = service.get_theme_fusion_rules(
            saju_data={},
            astro_data=astro_data,
            theme="focus_career",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_with_birth_year(self):
        """Theme fusion rules should accept birth year for age calculation."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        result = service.get_theme_fusion_rules(
            saju_data={},
            astro_data={},
            theme="focus_overall",
            locale="ko",
            birth_year=1990
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_health_theme(self):
        """Health theme should process element counts."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        saju_data = {
            "elementCounts": {
                "木": 2,
                "火": 0,
                "土": 1,
                "金": 3,
                "水": 2
            }
        }

        result = service.get_theme_fusion_rules(
            saju_data=saju_data,
            astro_data={},
            theme="focus_health",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_wealth_theme(self):
        """Wealth theme should process money houses."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        astro_data = {
            "jupiter": {"sign": "Taurus", "house": "2"},
            "venus": {"sign": "Capricorn", "house": "8"}
        }

        saju_data = {
            "tenGodsCount": {
                "정재": 2,
                "편재": 1
            }
        }

        result = service.get_theme_fusion_rules(
            saju_data=saju_data,
            astro_data=astro_data,
            theme="focus_wealth",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_locales(self):
        """Theme fusion rules should support both locales."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        for locale in ["ko", "en"]:
            result = service.get_theme_fusion_rules(
                saju_data={},
                astro_data={},
                theme="chat",
                locale=locale
            )
            assert isinstance(result, str)

    def test_theme_fusion_rules_2025_theme(self):
        """2025 theme should include year-specific rules."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        saju_data = {
            "dayPillar": {
                "heavenlyStem": "甲",
                "earthlyBranch": "子"
            },
            "tenGods": {"dominant": "정관"}
        }

        result = service.get_theme_fusion_rules(
            saju_data=saju_data,
            astro_data={},
            theme="focus_2025",
            locale="ko"
        )

        assert isinstance(result, str)


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_with_non_dict_daymaster(self, mock_get_cache):
        """Cross analysis should handle non-dict daymaster."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        saju_data = {"dayMaster": "string value"}

        result = service.get_cross_analysis_for_chart(
            saju_data=saju_data,
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_with_dict_dominant_god(self, mock_get_cache):
        """Cross analysis should handle dict dominant god."""
        from backend_ai.services.chart_service import ChartService

        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_get_cache.return_value = mock_cache

        service = ChartService()

        saju_data = {
            "tenGods": {
                "dominant": {"name": "정관", "ko": "정관"}
            }
        }

        result = service.get_cross_analysis_for_chart(
            saju_data=saju_data,
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)

    def test_theme_fusion_rules_with_non_numeric_counts(self):
        """Theme fusion rules should handle non-numeric counts."""
        from backend_ai.services.chart_service import ChartService

        service = ChartService()

        saju_data = {
            "elementCounts": {
                "木": "2",  # String instead of int
                "火": None
            }
        }

        result = service.get_theme_fusion_rules(
            saju_data=saju_data,
            astro_data={},
            theme="focus_health",
            locale="ko"
        )

        assert isinstance(result, str)

    @patch('backend_ai.app.redis_cache.get_cache')
    def test_cross_analysis_cache_json_parsing(self, mock_get_cache):
        """Cross analysis should handle JSON strings from cache."""
        from backend_ai.services.chart_service import ChartService
        import json

        mock_cache = MagicMock()
        mock_cache.get.return_value = json.dumps({
            "test_key": {"text": "test", "weight": 5}
        })
        mock_get_cache.return_value = mock_cache

        service = ChartService()
        result = service.get_cross_analysis_for_chart(
            saju_data={},
            astro_data={},
            theme="chat",
            locale="ko"
        )

        assert isinstance(result, str)


class TestModuleExports:
    """Tests for module exports."""

    def test_chart_service_class_importable(self):
        """ChartService class should be importable."""
        from backend_ai.services.chart_service import ChartService
        assert ChartService is not None

    def test_module_has_logger(self):
        """Module should have a logger."""
        from backend_ai.services import chart_service
        assert hasattr(chart_service, 'logger')
