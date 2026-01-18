"""
Unit tests for Saju Astro RAG module.

Tests:
- Shared model singleton
- GraphRAG class
- Embedding functions
- Search functionality
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestSharedModel:
    """Tests for shared model singleton."""

    def test_model_name_constants(self):
        """Model name constants should be defined."""
        from app.saju_astro_rag import _MODEL_NAME_MULTILINGUAL, _MODEL_NAME_ENGLISH

        assert isinstance(_MODEL_NAME_MULTILINGUAL, str)
        assert isinstance(_MODEL_NAME_ENGLISH, str)
        assert "sentence-transformers" in _MODEL_NAME_MULTILINGUAL
        assert "sentence-transformers" in _MODEL_NAME_ENGLISH

    def test_get_model_function_exists(self):
        """get_model function should exist."""
        from app.saju_astro_rag import get_model

        assert callable(get_model)

    @patch('app.saju_astro_rag.SentenceTransformer')
    def test_get_model_returns_model(self, mock_st):
        """get_model should return a model instance."""
        mock_model = MagicMock()
        mock_st.return_value = mock_model

        from app import saju_astro_rag

        # Reset singleton
        saju_astro_rag._MODEL = None
        saju_astro_rag._MODEL_TYPE = None

        result = saju_astro_rag.get_model()

        assert result is not None


class TestEmbedText:
    """Tests for embed_text function."""

    def test_embed_text_function_exists(self):
        """embed_text function should exist."""
        from app.saju_astro_rag import embed_text

        assert callable(embed_text)

    @patch('app.saju_astro_rag.get_model')
    def test_embed_text_returns_tensor(self, mock_get_model):
        """embed_text should return tensor."""
        import torch
        mock_model = MagicMock()
        mock_model.encode.return_value = torch.randn(384)
        mock_get_model.return_value = mock_model

        from app.saju_astro_rag import embed_text

        result = embed_text("test query")

        assert result is not None
        mock_model.encode.assert_called_once()


class TestGraphRAG:
    """Tests for GraphRAG class."""

    def test_graph_rag_class_exists(self):
        """GraphRAG class should exist."""
        from app.saju_astro_rag import GraphRAG

        assert GraphRAG is not None

    def test_graph_rag_has_init_params(self):
        """GraphRAG __init__ should accept base_dir and use_cache params."""
        from app.saju_astro_rag import GraphRAG
        import inspect

        sig = inspect.signature(GraphRAG.__init__)
        params = list(sig.parameters.keys())

        assert 'base_dir' in params
        assert 'use_cache' in params

    def test_graph_rag_uses_networkx(self):
        """GraphRAG should use NetworkX."""
        from app.saju_astro_rag import GraphRAG
        import inspect

        # Check if nx is used in the module source
        source = inspect.getsource(GraphRAG)
        assert "nx." in source or "networkx" in source


class TestSearchGraphs:
    """Tests for search_graphs function."""

    def test_search_graphs_function_exists(self):
        """search_graphs function should exist."""
        from app.saju_astro_rag import search_graphs

        assert callable(search_graphs)

    @patch('app.saju_astro_rag._load_graph_nodes')
    @patch('app.saju_astro_rag._latest_mtime')
    def test_search_graphs_returns_list(self, mock_latest_mtime, mock_load_nodes):
        """search_graphs should return list."""
        mock_latest_mtime.return_value = 0
        mock_load_nodes.return_value = []

        from app.saju_astro_rag import search_graphs
        import app.saju_astro_rag as module
        # Reset cache to trigger load
        module._NODES_CACHE = None

        result = search_graphs("test query")

        assert isinstance(result, list)


class TestGetGraphRAG:
    """Tests for get_graph_rag singleton function."""

    def test_get_graph_rag_function_exists(self):
        """get_graph_rag function should exist."""
        from app.saju_astro_rag import get_graph_rag

        assert callable(get_graph_rag)


class TestLRUCache:
    """Tests for LRU cache usage."""

    def test_lru_cache_imported(self):
        """lru_cache should be imported."""
        from functools import lru_cache as lru_cache_check

        # Verify module uses lru_cache
        import inspect
        from app import saju_astro_rag
        source = inspect.getsource(saju_astro_rag)

        assert "lru_cache" in source


class TestModuleExports:
    """Tests for module exports."""

    def test_get_model_importable(self):
        """get_model should be importable."""
        from app.saju_astro_rag import get_model
        assert callable(get_model)

    def test_embed_text_importable(self):
        """embed_text should be importable."""
        from app.saju_astro_rag import embed_text
        assert callable(embed_text)

    def test_search_graphs_importable(self):
        """search_graphs should be importable."""
        from app.saju_astro_rag import search_graphs
        assert callable(search_graphs)

    def test_get_graph_rag_importable(self):
        """get_graph_rag should be importable."""
        from app.saju_astro_rag import get_graph_rag
        assert callable(get_graph_rag)

    def test_graph_rag_importable(self):
        """GraphRAG class should be importable."""
        from app.saju_astro_rag import GraphRAG
        assert GraphRAG is not None
