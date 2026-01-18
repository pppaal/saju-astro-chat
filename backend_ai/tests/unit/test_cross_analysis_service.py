"""
Cross-Analysis Service Tests

Tests for pre-loaded cross-analysis data lookup.
"""

import pytest
import os
import json
from unittest.mock import patch, MagicMock, mock_open

from backend_ai.app.services.cross_analysis_service import (
    _load_cross_analysis_cache,
    get_cross_analysis_cache,
    _CROSS_ANALYSIS_CACHE,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    global _CROSS_ANALYSIS_CACHE
    from backend_ai.app.services import cross_analysis_service
    cross_analysis_service._CROSS_ANALYSIS_CACHE = {}
    yield
    cross_analysis_service._CROSS_ANALYSIS_CACHE = {}


class TestLoadCrossAnalysisCache:
    """Tests for _load_cross_analysis_cache function."""

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_loads_json_files(self, mock_file, mock_listdir, mock_exists):
        """Should load cross-analysis JSON files."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_saju_astro.json", "other.json"]
        mock_file.return_value.read.return_value = '{"key": "value"}'

        # Reset cache
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        with patch.object(json, "load", return_value={"key": "value"}):
            result = _load_cross_analysis_cache()

        # Should have loaded the cross file
        assert "cross_saju_astro" in result

    @patch("os.path.exists")
    def test_handles_missing_directory(self, mock_exists):
        """Should handle missing fusion directory."""
        mock_exists.return_value = False

        # Reset cache
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        result = _load_cross_analysis_cache()

        assert result == {}

    def test_returns_cached_data(self):
        """Should return cached data on subsequent calls."""
        # Pre-populate cache
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"test_key": {"data": 123}}

        result = _load_cross_analysis_cache()

        assert result == {"test_key": {"data": 123}}

    @patch("os.path.exists")
    @patch("os.listdir")
    def test_filters_non_cross_files(self, mock_listdir, mock_exists):
        """Should only load files with 'cross' in name."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["saju_data.json", "astro_data.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        result = _load_cross_analysis_cache()

        # No cross files, should be empty
        assert len(result) == 0

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_handles_json_load_error(self, mock_file, mock_listdir, mock_exists):
        """Should handle JSON load errors gracefully."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_broken.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        with patch.object(json, "load", side_effect=json.JSONDecodeError("test", "", 0)):
            result = _load_cross_analysis_cache()

        # Should have empty result (file failed to load)
        assert "cross_broken" not in result

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open")
    def test_handles_file_read_error(self, mock_open_fn, mock_listdir, mock_exists):
        """Should handle file read errors gracefully."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_unreadable.json"]
        mock_open_fn.side_effect = IOError("Permission denied")

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        result = _load_cross_analysis_cache()

        # Should not crash, return empty
        assert "cross_unreadable" not in result


class TestGetCrossAnalysisCache:
    """Tests for get_cross_analysis_cache function."""

    def test_returns_cache(self):
        """Should return the cache."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"cached": {"data": "test"}}

        result = get_cross_analysis_cache()

        assert result == {"cached": {"data": "test"}}

    @patch("backend_ai.app.services.cross_analysis_service._load_cross_analysis_cache")
    def test_calls_load_on_empty_cache(self, mock_load):
        """Should call load when cache is empty."""
        mock_load.return_value = {"loaded": "data"}

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        result = get_cross_analysis_cache()

        mock_load.assert_called_once()


class TestCacheKeyNaming:
    """Tests for cache key naming conventions."""

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_removes_json_extension(self, mock_file, mock_listdir, mock_exists):
        """Cache key should not include .json extension."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_test.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        with patch.object(json, "load", return_value={"data": 1}):
            result = _load_cross_analysis_cache()

        assert "cross_test" in result
        assert "cross_test.json" not in result


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

        result = get_cross_analysis_cache()

        assert len(result) == 3
        assert result["cross_saju"]["type"] == "saju"
        assert result["cross_astro"]["type"] == "astro"


class TestEdgeCases:
    """Edge case tests."""

    def test_handles_empty_directory(self):
        """Should handle empty directory."""
        with patch("os.path.exists", return_value=True):
            with patch("os.listdir", return_value=[]):
                from backend_ai.app.services import cross_analysis_service
                cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

                result = _load_cross_analysis_cache()

                assert result == {}

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_handles_unicode_in_files(self, mock_file, mock_listdir, mock_exists):
        """Should handle unicode in JSON files."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_korean.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        korean_data = {"name": "사주", "description": "한국어 테스트"}
        with patch.object(json, "load", return_value=korean_data):
            result = _load_cross_analysis_cache()

        assert result["cross_korean"]["name"] == "사주"

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_handles_nested_json(self, mock_file, mock_listdir, mock_exists):
        """Should handle deeply nested JSON."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_nested.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        nested_data = {
            "level1": {
                "level2": {
                    "level3": {
                        "value": "deep"
                    }
                }
            }
        }
        with patch.object(json, "load", return_value=nested_data):
            result = _load_cross_analysis_cache()

        assert result["cross_nested"]["level1"]["level2"]["level3"]["value"] == "deep"

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_handles_array_json(self, mock_file, mock_listdir, mock_exists):
        """Should handle JSON with array root."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_array.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {}

        array_data = [{"id": 1}, {"id": 2}, {"id": 3}]
        with patch.object(json, "load", return_value=array_data):
            result = _load_cross_analysis_cache()

        assert len(result["cross_array"]) == 3


class TestCachePersistence:
    """Tests for cache persistence behavior."""

    def test_cache_persists_between_calls(self):
        """Cache should persist between function calls."""
        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"persistent": {"data": 1}}

        result1 = get_cross_analysis_cache()
        result2 = get_cross_analysis_cache()

        assert result1 is result2
        assert result1["persistent"]["data"] == 1

    @patch("os.path.exists")
    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    def test_does_not_reload_if_cached(self, mock_file, mock_listdir, mock_exists):
        """Should not reload if data is already cached."""
        mock_exists.return_value = True
        mock_listdir.return_value = ["cross_test.json"]

        from backend_ai.app.services import cross_analysis_service
        cross_analysis_service._CROSS_ANALYSIS_CACHE = {"existing": {"data": "cached"}}

        result = _load_cross_analysis_cache()

        # Should return cached data without reading files
        assert result == {"existing": {"data": "cached"}}
        mock_file.assert_not_called()
