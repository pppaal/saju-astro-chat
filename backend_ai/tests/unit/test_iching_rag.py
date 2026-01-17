"""
Unit tests for I Ching RAG module.

Tests:
- Data loading functions
- Premium data loading
- Hexagram data loading
- Changing lines data
- Constants import
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestDataPathFunction:
    """Tests for _get_data_path function."""

    def test_get_data_path_exists(self):
        """_get_data_path function should exist."""
        from app.iching_rag import _get_data_path

        assert callable(_get_data_path)

    def test_get_data_path_returns_string(self):
        """_get_data_path should return a string path."""
        from app.iching_rag import _get_data_path

        result = _get_data_path()

        assert isinstance(result, str)
        assert "iching" in result


class TestLoadPremiumData:
    """Tests for load_premium_data function."""

    def test_load_premium_data_exists(self):
        """load_premium_data function should exist."""
        from app.iching_rag import load_premium_data

        assert callable(load_premium_data)

    def test_load_premium_data_returns_tuple(self):
        """load_premium_data should return tuple of dicts."""
        from app.iching_rag import load_premium_data

        result = load_premium_data()

        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], dict)  # hexagram data
        assert isinstance(result[1], dict)  # trigram data


class TestLoadCompleteHexagramData:
    """Tests for load_complete_hexagram_data function."""

    def test_load_complete_hexagram_data_exists(self):
        """load_complete_hexagram_data function should exist."""
        from app.iching_rag import load_complete_hexagram_data

        assert callable(load_complete_hexagram_data)

    def test_load_complete_hexagram_data_returns_dict(self):
        """load_complete_hexagram_data should return a dict."""
        from app.iching_rag import load_complete_hexagram_data

        result = load_complete_hexagram_data()

        assert isinstance(result, dict)


class TestLoadChangingLinesData:
    """Tests for load_changing_lines_data function."""

    def test_load_changing_lines_data_exists(self):
        """load_changing_lines_data function should exist."""
        from app.iching_rag import load_changing_lines_data

        assert callable(load_changing_lines_data)

    def test_load_changing_lines_data_returns_dict(self):
        """load_changing_lines_data should return a dict."""
        from app.iching_rag import load_changing_lines_data

        result = load_changing_lines_data()

        assert isinstance(result, dict)


class TestHasEmbeddingFlag:
    """Tests for HAS_EMBEDDING flag."""

    def test_has_embedding_flag_exists(self):
        """HAS_EMBEDDING flag should exist."""
        from app.iching_rag import HAS_EMBEDDING

        assert isinstance(HAS_EMBEDDING, bool)


class TestConstantsImport:
    """Tests for constants import from iching package."""

    def test_wuxing_generating_exists(self):
        """WUXING_GENERATING should be imported."""
        from app.iching_rag import WUXING_GENERATING

        assert WUXING_GENERATING is not None

    def test_wuxing_overcoming_exists(self):
        """WUXING_OVERCOMING should be imported."""
        from app.iching_rag import WUXING_OVERCOMING

        assert WUXING_OVERCOMING is not None

    def test_wuxing_korean_exists(self):
        """WUXING_KOREAN should be imported."""
        from app.iching_rag import WUXING_KOREAN

        assert WUXING_KOREAN is not None

    def test_trigram_info_exists(self):
        """TRIGRAM_INFO should be imported."""
        from app.iching_rag import TRIGRAM_INFO

        assert TRIGRAM_INFO is not None

    def test_line_position_meaning_exists(self):
        """LINE_POSITION_MEANING should be imported."""
        from app.iching_rag import LINE_POSITION_MEANING

        assert LINE_POSITION_MEANING is not None


class TestGlobalVariables:
    """Tests for global data variables."""

    def test_hexagram_data_global_exists(self):
        """_HEXAGRAM_DATA global should exist."""
        from app import iching_rag

        assert hasattr(iching_rag, '_HEXAGRAM_DATA')

    def test_trigram_data_global_exists(self):
        """_TRIGRAM_DATA global should exist."""
        from app import iching_rag

        assert hasattr(iching_rag, '_TRIGRAM_DATA')

    def test_complete_hexagram_data_global_exists(self):
        """_COMPLETE_HEXAGRAM_DATA global should exist."""
        from app import iching_rag

        assert hasattr(iching_rag, '_COMPLETE_HEXAGRAM_DATA')

    def test_changing_lines_data_global_exists(self):
        """_CHANGING_LINES_DATA global should exist."""
        from app import iching_rag

        assert hasattr(iching_rag, '_CHANGING_LINES_DATA')


class TestModuleExports:
    """Tests for module exports."""

    def test_load_premium_data_importable(self):
        """load_premium_data should be importable."""
        from app.iching_rag import load_premium_data
        assert callable(load_premium_data)

    def test_load_complete_hexagram_data_importable(self):
        """load_complete_hexagram_data should be importable."""
        from app.iching_rag import load_complete_hexagram_data
        assert callable(load_complete_hexagram_data)

    def test_load_changing_lines_data_importable(self):
        """load_changing_lines_data should be importable."""
        from app.iching_rag import load_changing_lines_data
        assert callable(load_changing_lines_data)
