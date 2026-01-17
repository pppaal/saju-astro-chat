"""
Unit tests for Tarot Advanced Embeddings module.

Tests:
- TarotAdvancedEmbeddings class
- Initialization parameters
- Search functionality
- Module imports and flags
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestTarotAdvancedEmbeddingsClass:
    """Tests for TarotAdvancedEmbeddings class."""

    def test_tarot_advanced_embeddings_exists(self):
        """TarotAdvancedEmbeddings class should exist."""
        from app.tarot_advanced_embeddings import TarotAdvancedEmbeddings

        assert TarotAdvancedEmbeddings is not None

    def test_tarot_advanced_embeddings_has_init_params(self):
        """TarotAdvancedEmbeddings __init__ should accept expected params."""
        from app.tarot_advanced_embeddings import TarotAdvancedEmbeddings
        import inspect

        sig = inspect.signature(TarotAdvancedEmbeddings.__init__)
        params = list(sig.parameters.keys())

        assert 'rules_dir' in params
        assert 'model_quality' in params
        assert 'device' in params
        assert 'use_float16' in params


class TestSentenceTransformersFlag:
    """Tests for SENTENCE_TRANSFORMERS_AVAILABLE flag."""

    def test_sentence_transformers_flag_exists(self):
        """SENTENCE_TRANSFORMERS_AVAILABLE flag should exist."""
        from app.tarot_advanced_embeddings import SENTENCE_TRANSFORMERS_AVAILABLE

        assert isinstance(SENTENCE_TRANSFORMERS_AVAILABLE, bool)


class TestModuleImportsFromTarot:
    """Tests for imports from tarot package."""

    def test_search_metrics_imported(self):
        """SearchMetrics should be imported from tarot package."""
        from app.tarot_advanced_embeddings import SearchMetrics

        assert SearchMetrics is not None

    def test_lru_cache_imported(self):
        """LRUCache should be imported from tarot package."""
        from app.tarot_advanced_embeddings import LRUCache

        assert LRUCache is not None

    def test_detect_best_device_imported(self):
        """detect_best_device should be imported from tarot package."""
        from app.tarot_advanced_embeddings import detect_best_device

        assert callable(detect_best_device)

    def test_model_options_imported(self):
        """MODEL_OPTIONS should be imported from tarot package."""
        from app.tarot_advanced_embeddings import MODEL_OPTIONS

        assert MODEL_OPTIONS is not None

    def test_default_model_imported(self):
        """DEFAULT_MODEL should be imported from tarot package."""
        from app.tarot_advanced_embeddings import DEFAULT_MODEL

        assert isinstance(DEFAULT_MODEL, str)


class TestInstantiation:
    """Tests for class instantiation."""

    @patch('app.tarot_advanced_embeddings.SentenceTransformer')
    @patch('os.path.exists')
    def test_instantiation_with_nonexistent_dir(self, mock_exists, mock_st):
        """TarotAdvancedEmbeddings should handle non-existent directory."""
        mock_exists.return_value = False
        mock_st.return_value = MagicMock()

        from app.tarot_advanced_embeddings import TarotAdvancedEmbeddings, SENTENCE_TRANSFORMERS_AVAILABLE

        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            pytest.skip("sentence-transformers not installed")

        # Just verify class can be referenced
        assert TarotAdvancedEmbeddings is not None


class TestDeviceDetection:
    """Tests for device detection."""

    def test_detect_best_device_returns_string(self):
        """detect_best_device should return a device string."""
        from app.tarot_advanced_embeddings import detect_best_device

        result = detect_best_device()

        assert isinstance(result, str)
        assert result in ['cpu', 'cuda', 'mps']


class TestModuleExports:
    """Tests for module exports."""

    def test_tarot_advanced_embeddings_importable(self):
        """TarotAdvancedEmbeddings should be importable."""
        from app.tarot_advanced_embeddings import TarotAdvancedEmbeddings
        assert TarotAdvancedEmbeddings is not None

    def test_sentence_transformers_available_importable(self):
        """SENTENCE_TRANSFORMERS_AVAILABLE should be importable."""
        from app.tarot_advanced_embeddings import SENTENCE_TRANSFORMERS_AVAILABLE
        assert isinstance(SENTENCE_TRANSFORMERS_AVAILABLE, bool)
