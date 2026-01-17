"""
Unit tests for RAG types and base classes.

Tests:
- RAGResult
- RAGQuery
- RAGContext
"""
import pytest


class TestRAGResult:
    """Tests for RAGResult dataclass."""

    def test_create_basic(self):
        """Create basic RAGResult."""
        from app.rag.types import RAGResult

        result = RAGResult(text="Test text", score=0.85)
        assert result.text == "Test text"
        assert result.score == 0.85
        assert result.source == ""
        assert result.metadata == {}
        assert result.rank is None

    def test_create_with_all_fields(self):
        """Create RAGResult with all fields."""
        from app.rag.types import RAGResult

        result = RAGResult(
            text="Test text",
            score=0.85,
            source="test_source",
            metadata={"key": "value"},
            rank=1
        )
        assert result.text == "Test text"
        assert result.score == 0.85
        assert result.source == "test_source"
        assert result.metadata == {"key": "value"}
        assert result.rank == 1

    def test_to_dict(self):
        """Convert RAGResult to dictionary."""
        from app.rag.types import RAGResult

        result = RAGResult(
            text="Test text",
            score=0.85,
            source="test_source",
            metadata={"key": "value"},
            rank=1
        )
        d = result.to_dict()
        assert d["text"] == "Test text"
        assert d["score"] == 0.85
        assert d["source"] == "test_source"
        assert d["metadata"] == {"key": "value"}
        assert d["rank"] == 1


class TestRAGQuery:
    """Tests for RAGQuery dataclass."""

    def test_create_basic(self):
        """Create basic RAGQuery."""
        from app.rag.types import RAGQuery

        query = RAGQuery(query="test query")
        assert query.query == "test query"
        assert query.top_k == 5
        assert query.min_score == 0.3
        assert query.domain is None
        assert query.filters == {}

    def test_create_with_params(self):
        """Create RAGQuery with parameters."""
        from app.rag.types import RAGQuery

        query = RAGQuery(
            query="test query",
            top_k=10,
            min_score=0.5,
            domain="tarot",
            filters={"category": "love"}
        )
        assert query.query == "test query"
        assert query.top_k == 10
        assert query.min_score == 0.5
        assert query.domain == "tarot"
        assert query.filters == {"category": "love"}


class TestRAGContext:
    """Tests for RAGContext dataclass."""

    def test_create_empty(self):
        """Create empty RAGContext."""
        from app.rag.types import RAGContext, RAGResult

        context = RAGContext(results=[])
        assert context.results == []
        assert context.total_found == 0
        assert context.search_query == ""
        assert context.formatted_text == ""

    def test_create_with_results(self):
        """Create RAGContext with results."""
        from app.rag.types import RAGContext, RAGResult

        results = [
            RAGResult(text="Result 1", score=0.9),
            RAGResult(text="Result 2", score=0.8),
        ]
        context = RAGContext(
            results=results,
            total_found=2,
            search_query="test query"
        )
        assert len(context.results) == 2
        assert context.total_found == 2
        assert context.search_query == "test query"

    def test_format_for_prompt_basic(self):
        """Format RAGContext for prompt."""
        from app.rag.types import RAGContext, RAGResult

        results = [
            RAGResult(text="Result 1", score=0.9),
            RAGResult(text="Result 2", score=0.8),
        ]
        context = RAGContext(results=results)
        formatted = context.format_for_prompt()

        assert "1. Result 1" in formatted
        assert "2. Result 2" in formatted

    def test_format_for_prompt_with_source(self):
        """Format RAGContext with source info."""
        from app.rag.types import RAGContext, RAGResult

        results = [
            RAGResult(text="Result 1", score=0.9, source="source1"),
        ]
        context = RAGContext(results=results)
        formatted = context.format_for_prompt()

        assert "Result 1" in formatted
        assert "[source1]" in formatted

    def test_format_for_prompt_max_chars(self):
        """Format RAGContext with max chars limit."""
        from app.rag.types import RAGContext, RAGResult

        results = [
            RAGResult(text="A" * 1000, score=0.9),
            RAGResult(text="B" * 1000, score=0.8),
        ]
        context = RAGContext(results=results)
        formatted = context.format_for_prompt(max_chars=500)

        assert len(formatted) <= 500

    def test_format_for_prompt_preformatted(self):
        """Use pre-formatted text if available."""
        from app.rag.types import RAGContext, RAGResult

        context = RAGContext(
            results=[RAGResult(text="Test", score=0.9)],
            formatted_text="Pre-formatted text"
        )
        formatted = context.format_for_prompt()

        assert formatted == "Pre-formatted text"


class TestRAGModuleImports:
    """Tests for RAG module imports."""

    def test_rag_init_exports(self):
        """Test RAG __init__ exports all required classes."""
        from app.rag import RAGResult, RAGQuery, RAGContext

        assert RAGResult is not None
        assert RAGQuery is not None
        assert RAGContext is not None

    def test_model_manager_function(self):
        """Test model manager function exists."""
        from app.rag.model_manager import get_shared_model

        assert callable(get_shared_model)
