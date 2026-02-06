"""
Unit tests for Utils Data Loader module.

Tests:
- Path utility functions
- JSON loading functions
- Integration data loader
- Jung data loader
- Cross analysis loader
"""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path


class TestPathUtilities:
    """Tests for path utility functions."""

    def test_get_data_dir_returns_path(self):
        """Test get_data_dir returns a Path."""
        from backend_ai.app.utils.data_loader import get_data_dir

        result = get_data_dir()
        assert isinstance(result, Path)

    def test_get_graph_rules_dir_returns_path(self):
        """Test get_graph_rules_dir returns a Path."""
        from backend_ai.app.utils.data_loader import get_graph_rules_dir

        result = get_graph_rules_dir()
        assert isinstance(result, Path)
        assert "graph" in str(result)
        assert "rules" in str(result)

    def test_get_fusion_dir_returns_path(self):
        """Test get_fusion_dir returns a Path."""
        from backend_ai.app.utils.data_loader import get_fusion_dir

        result = get_fusion_dir()
        assert isinstance(result, Path)
        assert "fusion" in str(result)

    def test_get_spreads_dir_returns_path(self):
        """Test get_spreads_dir returns a Path."""
        from backend_ai.app.utils.data_loader import get_spreads_dir

        result = get_spreads_dir()
        assert isinstance(result, Path)
        assert "spreads" in str(result)


class TestLoadJsonFile:
    """Tests for load_json_file function."""

    def test_load_json_file_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.data_loader import load_json_file

        assert callable(load_json_file)

    def test_load_json_file_nonexistent(self):
        """Test loading nonexistent file returns empty dict."""
        from backend_ai.app.utils.data_loader import load_json_file

        result = load_json_file("/nonexistent/path/file.json")
        assert result == {}

    def test_load_json_file_with_cache(self):
        """Test caching behavior."""
        from backend_ai.app.utils.data_loader import load_json_file

        cache = {"test_key": {"cached": True}}
        result = load_json_file("/any/path.json", "test_key", cache)

        assert result == {"cached": True}

    def test_load_json_file_returns_dict(self):
        """Test returns dict type."""
        from backend_ai.app.utils.data_loader import load_json_file

        result = load_json_file("/nonexistent.json")
        assert isinstance(result, dict)


class TestLoadJsonFiles:
    """Tests for load_json_files function."""

    def test_load_json_files_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.data_loader import load_json_files

        assert callable(load_json_files)

    def test_load_json_files_returns_dict(self):
        """Test returns dict type."""
        from backend_ai.app.utils.data_loader import load_json_files

        result = load_json_files(
            Path("/nonexistent"),
            {"key": "file.json"},
            {},
            "test"
        )
        assert isinstance(result, dict)

    def test_load_json_files_creates_empty_for_missing(self):
        """Test creates empty dict for missing files."""
        from backend_ai.app.utils.data_loader import load_json_files

        cache = {}
        result = load_json_files(
            Path("/nonexistent"),
            {"missing": "missing.json"},
            cache,
            "test"
        )

        assert "missing" in result
        assert result["missing"] == {}


class TestLoadIntegrationData:
    """Tests for load_integration_data function."""

    def test_load_integration_data_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.data_loader import load_integration_data

        assert callable(load_integration_data)

    def test_load_integration_data_returns_dict(self):
        """Test returns dict type."""
        from backend_ai.app.utils.data_loader import load_integration_data

        result = load_integration_data()
        assert isinstance(result, dict)

    def test_load_integration_data_cached(self):
        """Test caching works."""
        from backend_ai.app.utils.data_loader import load_integration_data

        result1 = load_integration_data()
        result2 = load_integration_data()

        # Should return same cached object
        assert result1 is result2

    def test_load_integration_data_force_reload(self):
        """Test force reload parameter exists."""
        from backend_ai.app.utils.data_loader import load_integration_data

        # Should not raise
        result = load_integration_data(force_reload=True)
        assert isinstance(result, dict)


class TestGetIntegrationContext:
    """Tests for get_integration_context function."""

    def test_get_integration_context_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.data_loader import get_integration_context

        assert callable(get_integration_context)

    def test_get_integration_context_returns_dict(self):
        """Test returns dict type."""
        from backend_ai.app.utils.data_loader import get_integration_context

        result = get_integration_context()
        assert isinstance(result, dict)

    def test_get_integration_context_has_correlation_matrix(self):
        """Test result has correlation_matrix key."""
        from backend_ai.app.utils.data_loader import get_integration_context

        result = get_integration_context()
        assert "correlation_matrix" in result

    def test_get_integration_context_has_theme_focus(self):
        """Test result has theme_focus key."""
        from backend_ai.app.utils.data_loader import get_integration_context

        result = get_integration_context()
        assert "theme_focus" in result

    def test_get_integration_context_with_theme(self):
        """Test with different themes."""
        from backend_ai.app.utils.data_loader import get_integration_context

        for theme in ["career", "love", "life", "health"]:
            result = get_integration_context(theme)
            assert isinstance(result, dict)


class TestLoadJungData:
    """Tests for load_jung_data function."""

    def test_load_jung_data_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.data_loader import load_jung_data

        assert callable(load_jung_data)

    def test_load_jung_data_returns_dict(self):
        """Test returns dict type."""
        from backend_ai.app.utils.data_loader import load_jung_data

        result = load_jung_data()
        assert isinstance(result, dict)

    def test_load_jung_data_cached(self):
        """Test caching works."""
        from backend_ai.app.utils.data_loader import load_jung_data

        result1 = load_jung_data()
        result2 = load_jung_data()

        assert result1 is result2


class TestGlobalCaches:
    """Tests for global cache dictionaries."""

    def test_integration_cache_exists(self):
        """Test integration cache exists."""
        from backend_ai.app.utils.data_loader import _INTEGRATION_DATA_CACHE

        assert isinstance(_INTEGRATION_DATA_CACHE, dict)

    def test_jung_cache_exists(self):
        """Test Jung cache exists."""
        from backend_ai.app.utils.data_loader import _JUNG_DATA_CACHE

        assert isinstance(_JUNG_DATA_CACHE, dict)

    def test_cross_analysis_cache_exists(self):
        """Test cross analysis cache exists."""
        from backend_ai.app.utils.data_loader import _CROSS_ANALYSIS_CACHE

        assert isinstance(_CROSS_ANALYSIS_CACHE, dict)

    def test_fusion_rules_cache_exists(self):
        """Test fusion rules cache exists."""
        from backend_ai.app.utils.data_loader import _FUSION_RULES_CACHE

        assert isinstance(_FUSION_RULES_CACHE, dict)

    def test_spread_config_cache_exists(self):
        """Test spread config cache exists."""
        from backend_ai.app.utils.data_loader import _SPREAD_CONFIG_CACHE

        assert isinstance(_SPREAD_CONFIG_CACHE, dict)


class TestModuleImports:
    """Tests for module imports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.utils import data_loader

        assert data_loader is not None

    def test_path_functions_importable(self):
        """Test path functions are importable."""
        from backend_ai.app.utils.data_loader import (
            get_data_dir,
            get_graph_rules_dir,
            get_fusion_dir,
            get_spreads_dir
        )

        assert all([get_data_dir, get_graph_rules_dir, get_fusion_dir, get_spreads_dir])

    def test_loader_functions_importable(self):
        """Test loader functions are importable."""
        from backend_ai.app.utils.data_loader import (
            load_json_file,
            load_json_files,
            load_integration_data,
            load_jung_data
        )

        assert all([load_json_file, load_json_files, load_integration_data, load_jung_data])

