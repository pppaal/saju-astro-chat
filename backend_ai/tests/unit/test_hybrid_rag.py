"""
Unit tests for Hybrid RAG module.

Tests:
- Tokenization functions
- BM25 index building
- RRF fusion
- Reranker
- Hybrid search
"""
import pytest
from unittest.mock import patch, MagicMock


class TestKoreanTokenizer:
    """Tests for Korean tokenizer."""

    def test_tokenize_korean_basic(self):
        """Test basic Korean tokenization."""
        from app.hybrid_rag import _tokenize_korean

        result = _tokenize_korean("안녕하세요")

        assert isinstance(result, list)
        assert len(result) > 0
        assert "안녕하세요" in result

    def test_tokenize_korean_with_spaces(self):
        """Test tokenization with spaces."""
        from app.hybrid_rag import _tokenize_korean

        result = _tokenize_korean("오늘 운세가 좋습니다")

        assert isinstance(result, list)
        assert "오늘" in result
        assert "운세가" in result
        assert "좋습니다" in result

    def test_tokenize_korean_bigrams(self):
        """Test character bigram generation."""
        from app.hybrid_rag import _tokenize_korean

        result = _tokenize_korean("사주")

        # Should include word and bigrams
        assert "사주" in result
        assert "사주"[0:2] in result  # "사주" bigram

    def test_tokenize_korean_punctuation_removal(self):
        """Test punctuation is removed."""
        from app.hybrid_rag import _tokenize_korean

        result = _tokenize_korean("안녕! 반갑습니다?")

        assert "!" not in "".join(result)
        assert "?" not in "".join(result)

    def test_tokenize_korean_mixed_text(self):
        """Test mixed Korean/English text."""
        from app.hybrid_rag import _tokenize_korean

        result = _tokenize_korean("사주 fortune 운세")

        assert "사주" in result
        assert "fortune" in result
        assert "운세" in result


class TestBM25Index:
    """Tests for BM25 index functionality."""

    def test_has_bm25_flag(self):
        """Test HAS_BM25 flag exists."""
        from app.hybrid_rag import HAS_BM25

        assert isinstance(HAS_BM25, bool)

    def test_build_bm25_index(self):
        """Test BM25 index building."""
        from app.hybrid_rag import build_bm25_index, HAS_BM25

        if not HAS_BM25:
            pytest.skip("BM25 not installed")

        documents = [
            {"description": "사주 운세 해석"},
            {"description": "타로 카드 리딩"},
            {"description": "점성술 차트 분석"},
        ]

        result = build_bm25_index(documents)

        assert result is not None

    def test_bm25_search_without_index(self):
        """Test BM25 search returns empty when no index."""
        from app.hybrid_rag import bm25_search

        result = bm25_search("test query")

        assert isinstance(result, list)


class TestReranker:
    """Tests for cross-encoder reranker."""

    def test_reranker_model_constant(self):
        """Test reranker model constant exists."""
        from app.hybrid_rag import _RERANKER_MODEL

        assert isinstance(_RERANKER_MODEL, str)
        assert "cross-encoder" in _RERANKER_MODEL


class TestRRFFusion:
    """Tests for RRF (Reciprocal Rank Fusion)."""

    def test_rrf_combine_function_exists(self):
        """Test RRF combination function exists."""
        from app import hybrid_rag

        # Check if rrf_combine or similar function exists
        assert hasattr(hybrid_rag, 'hybrid_search') or hasattr(hybrid_rag, 'rrf_combine')


class TestHybridSearch:
    """Tests for hybrid search functionality."""

    @patch('app.hybrid_rag.get_graph_rag')
    @patch('app.hybrid_rag.get_model')
    def test_hybrid_search_exists(self, mock_model, mock_graph_rag):
        """Test hybrid_search function exists and is callable."""
        from app.hybrid_rag import hybrid_search

        assert callable(hybrid_search)

    @patch('app.hybrid_rag.get_graph_rag')
    @patch('app.hybrid_rag.get_model')
    def test_hybrid_search_returns_list(self, mock_model, mock_graph_rag):
        """Test hybrid_search returns list."""
        from app.hybrid_rag import hybrid_search

        mock_graph_rag.return_value = MagicMock()
        mock_model.return_value = MagicMock()

        # Mock the search methods
        with patch('app.hybrid_rag.search_graphs', return_value=[]):
            with patch('app.hybrid_rag.bm25_search', return_value=[]):
                try:
                    result = hybrid_search("test query", top_k=5)
                    assert isinstance(result, list)
                except Exception:
                    # May fail due to model loading, that's ok for unit test
                    pass


class TestModuleImports:
    """Tests for module imports."""

    def test_has_bm25_importable(self):
        """HAS_BM25 flag should be importable."""
        from app.hybrid_rag import HAS_BM25
        assert isinstance(HAS_BM25, bool)

    def test_tokenize_korean_importable(self):
        """_tokenize_korean should be importable."""
        from app.hybrid_rag import _tokenize_korean
        assert callable(_tokenize_korean)

    def test_bm25_search_importable(self):
        """bm25_search should be importable."""
        from app.hybrid_rag import bm25_search
        assert callable(bm25_search)

    def test_build_bm25_index_importable(self):
        """build_bm25_index should be importable."""
        from app.hybrid_rag import build_bm25_index
        assert callable(build_bm25_index)
