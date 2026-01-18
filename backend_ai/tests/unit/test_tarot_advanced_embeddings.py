"""
Unit tests for Tarot Advanced Embeddings module.

Tests:
- TarotAdvancedEmbeddings class
- Initialization parameters
- Module imports and flags (refactored to tarot_embeddings package)
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


class TestModuleImportsFromTarotPackage:
    """Tests for imports from tarot package (new location after refactoring)."""

    def test_search_metrics_from_tarot_package(self):
        """SearchMetrics should be importable from tarot package."""
        from app.tarot import SearchMetrics

        assert SearchMetrics is not None

    def test_lru_cache_from_tarot_package(self):
        """LRUCache should be importable from tarot package."""
        from app.tarot import LRUCache

        assert LRUCache is not None

    def test_detect_best_device_from_tarot_package(self):
        """detect_best_device should be importable from tarot package."""
        from app.tarot import detect_best_device

        assert callable(detect_best_device)

    def test_model_options_from_tarot_package(self):
        """MODEL_OPTIONS should be importable from tarot package."""
        from app.tarot import MODEL_OPTIONS

        assert MODEL_OPTIONS is not None

    def test_default_model_from_tarot_package(self):
        """DEFAULT_MODEL should be importable from tarot package."""
        from app.tarot import DEFAULT_MODEL

        assert isinstance(DEFAULT_MODEL, str)


class TestModuleExports:
    """Tests for module exports."""

    def test_tarot_advanced_embeddings_importable(self):
        """TarotAdvancedEmbeddings should be importable."""
        from app.tarot_advanced_embeddings import TarotAdvancedEmbeddings
        assert TarotAdvancedEmbeddings is not None

    def test_get_tarot_advanced_embeddings_importable(self):
        """get_tarot_advanced_embeddings should be importable."""
        from app.tarot_advanced_embeddings import get_tarot_advanced_embeddings
        assert callable(get_tarot_advanced_embeddings)


class TestMixinsExport:
    """Tests for mixin class exports."""

    def test_search_methods_mixin_importable(self):
        """SearchMethodsMixin should be importable."""
        from app.tarot_advanced_embeddings import SearchMethodsMixin
        assert SearchMethodsMixin is not None

    def test_cache_methods_mixin_importable(self):
        """CacheMethodsMixin should be importable."""
        from app.tarot_advanced_embeddings import CacheMethodsMixin
        assert CacheMethodsMixin is not None

    def test_status_methods_mixin_importable(self):
        """StatusMethodsMixin should be importable."""
        from app.tarot_advanced_embeddings import StatusMethodsMixin
        assert StatusMethodsMixin is not None
