"""
Cross-Analysis Service Tests

Tests for pre-loaded cross-analysis data lookup.
Uses pathlib.Path (matching the actual module implementation).
"""

import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

from backend_ai.app.services.cross_analysis_service import (
    _load_cross_analysis_cache,
    get_cross_analysis_cache,
    _CROSS_ANALYSIS_CACHE,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    from backend_ai.app.services import cross_analysis_service
    cross_analysis_service._CROSS_ANALYSIS_CACHE = {}
    cross_analysis_service._CROSS_CACHE_LOADED = False
    yield
    cross_analysis_service._CROSS_ANALYSIS_CACHE = {}
    cross_analysis_service._CROSS_CACHE_LOADED = False


class TestLoadCrossAnalysisCache:
    """Tests for _load_cross_analysis_cache function."""

    @patch("pathlib.Path.exists")
    def test_handles_missing_directory(self, mock_exists):
        """Should handle missing fusion directory."""
        mock_exists.return_value = False

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}
        cross_analysis_service._CROSS_CACHE_LOADED = False

        result = _load_cross_analysis_cache()

        assert result == {}

    def test_returns_cached_data(self):
        """Should return cached data on subsequent calls."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"test_key": {"data": 123}}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = _load_cross_analysis_cache()

        assert result == {"test_key": {"data": 123}}


class TestGetCrossAnalysisCache:
    """Tests for get_cross_analysis_cache function."""

    def test_returns_cache(self):
        """Should return the cache."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cached": {"data": "test"}}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert result == {"cached": {"data": "test"}}

    @patch("backend_ai.app.services.cross_analysis_service._load_cross_analysis_cache")
    def test_calls_load(self, mock_load):
        """Should call load function."""
        mock_load.return_value = {"loaded": "data"}

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}
        cross_analysis_service._CROSS_CACHE_LOADED = False

        result = get_cross_analysis_cache()

        mock_load.assert_called_once()


class TestCacheContent:
    """Tests for cache content structure."""

    def test_cache_stores_dict(self):
        """Cache should store dict values."""
        from backend_ai.app.services import cross_analysis_service
        test_data = {
            "elements": ["wood", "fire", "earth", "metal", "water"],
            "relationships": {"wood": "fire", "fire": "earth"},
        }
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cross_elements": test_data}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert result["cross_elements"]["elements"][0] == "wood"
        assert result["cross_elements"]["relationships"]["wood"] == "fire"

    def test_multiple_cache_entries(self):
        """Cache should support multiple entries."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {
            "cross_saju": {"type": "saju"},
            "cross_astro": {"type": "astro"},
            "cross_combined": {"type": "combined"},
        }
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert len(result) == 3
        assert result["cross_saju"]["type"] == "saju"
        assert result["cross_astro"]["type"] == "astro"


class TestCachePersistence:
    """Tests for cache persistence behavior."""

    def test_cache_persists_between_calls(self):
        """Cache should persist between function calls."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"persistent": {"data": 1}}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result1 = get_cross_analysis_cache()
        result2 = get_cross_analysis_cache()

        assert result1 is result2
        assert result1["persistent"]["data"] == 1

    def test_does_not_reload_if_cached(self):
        """Should not reload if data is already cached."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"existing": {"data": "cached"}}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = _load_cross_analysis_cache()

        # Should return cached data without reading files
        assert result == {"existing": {"data": "cached"}}


class TestCacheKeyNaming:
    """Tests for cache key expectations."""

    def test_expects_stem_without_extension(self):
        """Cache keys should be file stems without .json extension."""
        from backend_ai.app.services import cross_analysis_service
        # Simulate what the loader produces
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {
            "cross_test": {"data": 1}  # stem without .json
        }
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert "cross_test" in result
        assert "cross_test.json" not in result


class TestEdgeCases:
    """Edge case tests."""

    def test_unicode_data_in_cache(self):
        """Should handle unicode data in cache."""
        from backend_ai.app.services import cross_analysis_service
        korean_data = {"name": "사주", "description": "한국어 테스트"}
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cross_korean": korean_data}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert result["cross_korean"]["name"] == "사주"

    def test_nested_data_in_cache(self):
        """Should handle deeply nested data in cache."""
        from backend_ai.app.services import cross_analysis_service
        nested_data = {
            "level1": {
                "level2": {
                    "level3": {
                        "value": "deep"
                    }
                }
            }
        }
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cross_nested": nested_data}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert result["cross_nested"]["level1"]["level2"]["level3"]["value"] == "deep"

    def test_array_data_in_cache(self):
        """Should handle array data in cache."""
        from backend_ai.app.services import cross_analysis_service
        array_data = [{"id": 1}, {"id": 2}, {"id": 3}]
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cross_array": array_data}
        cross_analysis_service._CROSS_CACHE_LOADED = True

        result = get_cross_analysis_cache()

        assert len(result["cross_array"]) == 3
