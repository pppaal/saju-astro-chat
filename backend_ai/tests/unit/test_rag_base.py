"""
Unit tests for RAG Base module.

Tests:
- BaseEmbeddingRAG abstract class
"""
import pytest
from unittest.mock import patch, MagicMock
from abc import ABC


class TestBaseEmbeddingRAGClass:
    """Tests for BaseEmbeddingRAG abstract base class."""

    def test_base_embedding_rag_exists(self):
        """BaseEmbeddingRAG class should exist."""
        from app.rag.base import BaseEmbeddingRAG

        assert BaseEmbeddingRAG is not None

    def test_base_embedding_rag_is_abstract(self):
        """BaseEmbeddingRAG should be abstract."""
        from app.rag.base import BaseEmbeddingRAG

        assert issubclass(BaseEmbeddingRAG, ABC)

    def test_base_embedding_rag_has_model_property(self):
        """BaseEmbeddingRAG should have model property."""
        from app.rag.base import BaseEmbeddingRAG

        assert hasattr(BaseEmbeddingRAG, 'model')

    def test_base_embedding_rag_has_load_data_method(self):
        """BaseEmbeddingRAG should have _load_data abstract method."""
        from app.rag.base import BaseEmbeddingRAG

        assert hasattr(BaseEmbeddingRAG, '_load_data')

    def test_base_embedding_rag_has_get_searchable_text_method(self):
        """BaseEmbeddingRAG should have _get_searchable_text method."""
        from app.rag.base import BaseEmbeddingRAG

        assert hasattr(BaseEmbeddingRAG, '_get_searchable_text')


class TestConcreteImplementation:
    """Tests with concrete implementation of BaseEmbeddingRAG."""

    @patch('app.rag.base.get_shared_model')
    def test_concrete_class_can_extend(self, mock_get_model):
        """Concrete class should be able to extend BaseEmbeddingRAG."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from app.rag.base import BaseEmbeddingRAG

        class TestRAG(BaseEmbeddingRAG):
            def _load_data(self):
                self._items = []
                self._texts = []

        # Should be instantiable
        with patch.object(TestRAG, '_prepare_embeddings'):
            rag = TestRAG()
            assert rag is not None


class TestModuleImports:
    """Tests for module imports."""

    def test_rag_result_imported(self):
        """RAGResult should be used from types."""
        from app.rag.base import RAGResult

        assert RAGResult is not None

    def test_rag_query_imported(self):
        """RAGQuery should be used from types."""
        from app.rag.base import RAGQuery

        assert RAGQuery is not None

    def test_rag_context_imported(self):
        """RAGContext should be used from types."""
        from app.rag.base import RAGContext

        assert RAGContext is not None


class TestModuleExports:
    """Tests for module exports."""

    def test_base_embedding_rag_importable(self):
        """BaseEmbeddingRAG should be importable."""
        from app.rag.base import BaseEmbeddingRAG
        assert BaseEmbeddingRAG is not None
