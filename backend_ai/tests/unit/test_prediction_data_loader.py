"""
Unit tests for Prediction Data Loader module.

Tests:
- DataLoader class
- JSON loading and caching
- Data retrieval methods
"""
import pytest
from unittest.mock import patch, MagicMock, mock_open
import json


class TestDataLoaderClass:
    """Tests for DataLoader class."""

    def test_data_loader_exists(self):
        """DataLoader class should exist."""
        from app.prediction.data_loader import DataLoader

        assert DataLoader is not None

    def test_data_loader_instantiation(self):
        """DataLoader should be instantiable."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert loader is not None
        assert hasattr(loader, 'base_path')
        assert hasattr(loader, '_cache')

    def test_data_loader_with_custom_path(self):
        """DataLoader should accept custom base_path."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader(base_path="/custom/path")

        assert loader.base_path == "/custom/path"

    def test_data_loader_has_cache(self):
        """DataLoader should have cache dict."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert isinstance(loader._cache, dict)
        assert len(loader._cache) == 0


class TestLoadJsonMethod:
    """Tests for load_json method."""

    def test_load_json_method_exists(self):
        """load_json method should exist."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert hasattr(loader, 'load_json')
        assert callable(loader.load_json)

    @patch('builtins.open', mock_open(read_data='{"key": "value"}'))
    @patch('os.path.join', return_value='/fake/path.json')
    def test_load_json_returns_dict(self, mock_join):
        """load_json should return dict."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()
        result = loader.load_json("fake/path.json")

        assert isinstance(result, dict)

    def test_load_json_returns_empty_on_error(self):
        """load_json should return empty dict on error."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()
        result = loader.load_json("nonexistent/path.json")

        assert result == {}

    @patch('builtins.open', mock_open(read_data='{"cached": true}'))
    @patch('os.path.join', return_value='/fake/path.json')
    def test_load_json_uses_cache(self, mock_join):
        """load_json should use cache on repeated calls."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        # First call
        result1 = loader.load_json("cached/path.json")
        # Second call should use cache
        result2 = loader.load_json("cached/path.json")

        assert result1 == result2
        assert "cached/path.json" in loader._cache


class TestDataRetrievalMethods:
    """Tests for data retrieval methods."""

    def test_get_daeun_data_method_exists(self):
        """get_daeun_data method should exist."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert hasattr(loader, 'get_daeun_data')
        assert callable(loader.get_daeun_data)

    def test_get_electional_rules_method_exists(self):
        """get_electional_rules method should exist."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert hasattr(loader, 'get_electional_rules')
        assert callable(loader.get_electional_rules)

    def test_get_cross_luck_data_method_exists(self):
        """get_cross_luck_data method should exist."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert hasattr(loader, 'get_cross_luck_data')
        assert callable(loader.get_cross_luck_data)

    def test_get_transit_data_method_exists(self):
        """get_transit_data method should exist."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()

        assert hasattr(loader, 'get_transit_data')
        assert callable(loader.get_transit_data)

    def test_get_daeun_data_returns_dict(self):
        """get_daeun_data should return dict."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()
        result = loader.get_daeun_data()

        assert isinstance(result, dict)

    def test_get_electional_rules_returns_dict(self):
        """get_electional_rules should return dict."""
        from app.prediction.data_loader import DataLoader

        loader = DataLoader()
        result = loader.get_electional_rules()

        assert isinstance(result, dict)


class TestModuleExports:
    """Tests for module exports."""

    def test_data_loader_importable(self):
        """DataLoader should be importable."""
        from app.prediction.data_loader import DataLoader
        assert DataLoader is not None
