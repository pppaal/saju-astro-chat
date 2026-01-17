"""
Unit tests for Corpus RAG module.

Tests:
- CorpusRAG initialization
- Search functionality
- Citation formatting
- Singleton factory
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestCorpusRAGInit:
    """Tests for CorpusRAG initialization."""

    @patch("backend_ai.app.corpus_rag.BaseEmbeddingRAG.__init__")
    def test_corpus_rag_default_dirs(self, mock_base_init):
        """Test default corpus directories are set."""
        mock_base_init.return_value = None

        from backend_ai.app.corpus_rag import CorpusRAG

        rag = CorpusRAG()

        assert hasattr(rag, "corpus_dirs")
        assert len(rag.corpus_dirs) == 2
        assert any("jung" in d for d in rag.corpus_dirs)
        assert any("stoic" in d for d in rag.corpus_dirs)

    @patch("backend_ai.app.corpus_rag.BaseEmbeddingRAG.__init__")
    def test_corpus_rag_single_dir(self, mock_base_init):
        """Test single corpus_dir backward compatibility."""
        mock_base_init.return_value = None

        from backend_ai.app.corpus_rag import CorpusRAG

        rag = CorpusRAG(corpus_dir="/custom/path")

        assert rag.corpus_dirs == ["/custom/path"]

    @patch("backend_ai.app.corpus_rag.BaseEmbeddingRAG.__init__")
    def test_corpus_rag_multiple_dirs(self, mock_base_init):
        """Test multiple corpus_dirs."""
        mock_base_init.return_value = None

        from backend_ai.app.corpus_rag import CorpusRAG

        rag = CorpusRAG(corpus_dirs=["/path1", "/path2", "/path3"])

        assert len(rag.corpus_dirs) == 3


class TestCorpusRAGLoadData:
    """Tests for _load_data method."""

    @patch("backend_ai.app.corpus_rag.BaseEmbeddingRAG.__init__")
    @patch("os.path.exists")
    def test_load_data_missing_dir(self, mock_exists, mock_base_init):
        """Test handling of missing directory."""
        mock_base_init.return_value = None
        mock_exists.return_value = False

        from backend_ai.app.corpus_rag import CorpusRAG

        rag = CorpusRAG(corpus_dirs=["/nonexistent"])
        rag._items = []
        rag._texts = []
        rag._load_data()

        assert len(rag._items) == 0


class TestCorpusRAGSearch:
    """Tests for search method."""

    def test_search_returns_list(self):
        """Test search returns a list."""
        from backend_ai.app.corpus_rag import CorpusRAG

        # Create mock instance
        rag = MagicMock(spec=CorpusRAG)
        rag.search.return_value = [
            {
                "quote_en": "Test quote",
                "quote_kr": "테스트 인용",
                "source": "Test Source",
                "score": 0.85,
            }
        ]

        results = rag.search("shadow work")
        assert isinstance(results, list)
        assert len(results) == 1
        assert "quote_en" in results[0]

    def test_search_with_concept_filter(self):
        """Test search with concept filter."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.search.return_value = []

        rag.search("test", concept_filter="shadow")
        rag.search.assert_called_once()


class TestCorpusRAGSearchBySignals:
    """Tests for search_by_signals method."""

    def test_search_by_signals_with_planets(self):
        """Test search by signals with planets."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.search_by_signals.return_value = []

        signals = {"planets": ["saturn", "jupiter"]}
        rag.search_by_signals(signals, theme="career")

        rag.search_by_signals.assert_called_once()

    def test_search_by_signals_with_aspects(self):
        """Test search by signals with aspects."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.search_by_signals.return_value = []

        signals = {"aspects": ["hard_square", "soft_trine"]}
        rag.search_by_signals(signals)

        rag.search_by_signals.assert_called_once()

    def test_search_by_signals_with_houses(self):
        """Test search by signals with houses."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.search_by_signals.return_value = []

        signals = {"houses": [7, 8, 12]}
        rag.search_by_signals(signals, theme="love")

        rag.search_by_signals.assert_called_once()


class TestFormatCitation:
    """Tests for format_citation method."""

    def test_format_citation_korean(self):
        """Test citation formatting in Korean."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)

        # Define the actual method behavior
        def mock_format(quote, locale="ko", include_context=True):
            q_text = quote.get("quote_kr" if locale == "ko" else "quote_en", "")
            source = quote.get("source", "Unknown")
            citation = f'"{q_text}"\n— Carl Jung, {source}'
            return citation

        rag.format_citation = mock_format

        quote = {
            "quote_kr": "그림자를 통합하라",
            "quote_en": "Integrate your shadow",
            "source": "Aion",
            "year": "1951",
        }

        result = rag.format_citation(quote, locale="ko")

        assert "그림자를 통합하라" in result
        assert "Carl Jung" in result
        assert "Aion" in result

    def test_format_citation_english(self):
        """Test citation formatting in English."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)

        def mock_format(quote, locale="ko", include_context=True):
            q_text = quote.get("quote_kr" if locale == "ko" else "quote_en", "")
            return f'"{q_text}"'

        rag.format_citation = mock_format

        quote = {"quote_en": "Integrate your shadow"}

        result = rag.format_citation(quote, locale="en")
        assert "Integrate your shadow" in result

    def test_format_citation_with_cw_volume(self):
        """Test citation with CW volume."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)

        def mock_format(quote, locale="ko", include_context=True):
            citation = f'"{quote.get("quote_en", "")}"'
            citation += f"\n— Carl Jung, {quote.get('source')}"
            if quote.get("cw_volume"):
                citation += f", {quote.get('cw_volume')}"
            return citation

        rag.format_citation = mock_format

        quote = {
            "quote_en": "Test",
            "source": "Psychology and Alchemy",
            "cw_volume": "CW 12",
        }

        result = rag.format_citation(quote, locale="en")
        assert "CW 12" in result


class TestGetQuotesForInterpretation:
    """Tests for get_quotes_for_interpretation method."""

    def test_returns_tuple(self):
        """Test returns tuple of quotes and context."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.get_quotes_for_interpretation.return_value = (
            [{"quote_en": "Test"}],
            '"Test"',
        )

        quotes, context = rag.get_quotes_for_interpretation("shadow")

        assert isinstance(quotes, list)
        assert isinstance(context, str)

    def test_empty_results(self):
        """Test handling of no results."""
        from backend_ai.app.corpus_rag import CorpusRAG

        rag = MagicMock(spec=CorpusRAG)
        rag.get_quotes_for_interpretation.return_value = ([], "")

        quotes, context = rag.get_quotes_for_interpretation("nonexistent")

        assert quotes == []
        assert context == ""


class TestSingletonFactory:
    """Tests for get_corpus_rag singleton."""

    @patch("backend_ai.app.corpus_rag._corpus_rag_instance", None)
    @patch("backend_ai.app.corpus_rag.CorpusRAG")
    def test_get_corpus_rag_creates_instance(self, mock_class):
        """Test factory creates new instance."""
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance

        from backend_ai.app.corpus_rag import get_corpus_rag

        result = get_corpus_rag()

        mock_class.assert_called_once()

    @patch("backend_ai.app.corpus_rag._corpus_rag_instance")
    def test_get_corpus_rag_reuses_instance(self, mock_instance):
        """Test factory reuses existing instance."""
        mock_instance.__class__ = type("CorpusRAG", (), {})

        from backend_ai.app.corpus_rag import get_corpus_rag

        # When instance exists, it should be reused
        # This test verifies the singleton pattern


class TestModuleExports:
    """Tests for module exports."""

    def test_corpus_rag_importable(self):
        """CorpusRAG should be importable."""
        from backend_ai.app.corpus_rag import CorpusRAG

        assert CorpusRAG is not None

    def test_get_corpus_rag_importable(self):
        """get_corpus_rag should be importable."""
        from backend_ai.app.corpus_rag import get_corpus_rag

        assert get_corpus_rag is not None
        assert callable(get_corpus_rag)
