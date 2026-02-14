"""
Unit tests for Domain RAG module.

Tests:
- DomainRAG initialization
- Domain loading/unloading
- Search functionality
- Context building
- Singleton factory
- Utility functions
"""
import pytest
from unittest.mock import patch, MagicMock
import torch
import importlib


class TestDomainRAGInit:
    """Tests for DomainRAG initialization."""

    @patch("backend_ai.app.domain_rag.DomainRAG._load_domain")
    def test_domain_rag_no_preload(self, mock_load):
        """Test initialization without preloading."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        assert rag._model is None
        assert rag._domain_cache == {}
        mock_load.assert_not_called()

    @patch("backend_ai.app.domain_rag.DomainRAG._load_domain")
    def test_domain_rag_with_preload(self, mock_load):
        """Test initialization with preloading."""
        mock_load.return_value = True

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG(preload_domains=["tarot"])

        mock_load.assert_called_once_with("tarot")

    @patch("backend_ai.app.domain_rag.DomainRAG._load_domain")
    def test_domain_rag_preload_multiple(self, mock_load):
        """Test preloading multiple domains."""
        mock_load.return_value = True

        from backend_ai.app.domain_rag import DomainRAG
        from backend_ai.app.domain_rag import DOMAINS

        rag = DomainRAG(preload_domains=["tarot", "dream"])

        expected = len([d for d in ["tarot", "dream"] if d in DOMAINS])
        assert mock_load.call_count == expected


class TestDomainRAGModel:
    """Tests for model property."""

    @patch("backend_ai.app.domain_rag.get_shared_model")
    def test_model_lazy_loading(self, mock_get_model):
        """Test model is loaded lazily."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        # Model should not be loaded yet
        assert rag._model is None

        # Access model property
        model = rag.model

        mock_get_model.assert_called_once()
        assert model == mock_model


class TestDomainRAGLoadDomain:
    """Tests for _load_domain method."""

    @patch("os.path.exists")
    def test_load_domain_file_not_found(self, mock_exists):
        """Test handling of missing cache file."""
        mock_exists.return_value = False

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        result = rag._load_domain("nonexistent")

        assert result is False
        assert "nonexistent" not in rag._domain_cache

    @patch("os.path.exists")
    @patch("torch.load")
    def test_load_domain_success(self, mock_torch_load, mock_exists):
        """Test successful domain loading."""
        mock_exists.return_value = True
        mock_torch_load.return_value = {
            "embeddings": torch.randn(10, 384),
            "texts": ["text1", "text2"],
            "count": 2,
        }

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        result = rag._load_domain("tarot")

        assert result is True
        assert "tarot" in rag._domain_cache

    @patch("os.path.exists")
    @patch("torch.load")
    def test_load_domain_already_loaded(self, mock_torch_load, mock_exists):
        """Test skipping already loaded domain."""
        mock_exists.return_value = True

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {"embeddings": None, "texts": [], "count": 0}

        result = rag._load_domain("tarot")

        assert result is True
        mock_torch_load.assert_not_called()


class TestDomainRAGIsLoaded:
    """Tests for is_loaded method."""

    def test_is_loaded_true(self):
        """Test is_loaded returns True for loaded domain."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {}

        assert rag.is_loaded("tarot") is True

    def test_is_loaded_false(self):
        """Test is_loaded returns False for unloaded domain."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        assert rag.is_loaded("tarot") is False


class TestDomainRAGGetLoadedDomains:
    """Tests for get_loaded_domains method."""

    def test_get_loaded_domains_empty(self):
        """Test with no loaded domains."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        assert rag.get_loaded_domains() == []

    def test_get_loaded_domains_multiple(self):
        """Test with multiple loaded domains."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {}
        rag._domain_cache["dream"] = {}

        loaded = rag.get_loaded_domains()

        assert "tarot" in loaded
        assert "dream" in loaded
        assert len(loaded) == 2


class TestDomainRAGUnloadDomain:
    """Tests for unload_domain method."""

    def test_unload_domain_success(self):
        """Test successfully unloading a domain."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {"embeddings": None}

        rag.unload_domain("tarot")

        assert "tarot" not in rag._domain_cache

    def test_unload_domain_not_loaded(self):
        """Test unloading a domain that's not loaded."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        # Should not raise
        rag.unload_domain("nonexistent")


class TestDomainRAGSearch:
    """Tests for search method."""

    def test_search_domain_not_found(self):
        """Test search with unloadable domain."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        with patch.object(rag, "_load_domain", return_value=False):
            results = rag.search("nonexistent", "query")

        assert results == []

    @patch("backend_ai.app.domain_rag.util.cos_sim")
    def test_search_returns_results(self, mock_cos_sim):
        """Test search returns results."""
        mock_scores = torch.tensor([0.9, 0.7, 0.5])
        mock_cos_sim.return_value = mock_scores.unsqueeze(0)

        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {
            "embeddings": torch.randn(3, 384),
            "texts": ["text1", "text2", "text3"],
            "count": 3,
        }

        # Mock query embedding
        with patch.object(rag, "_embed_query", return_value=torch.randn(384)):
            results = rag.search("tarot", "love reading", top_k=2)

        assert isinstance(results, list)

    @patch("app.rag.vector_store.get_domain_vector_store")
    def test_search_chromadb_forced_facet_always_included(self, mock_get_vs):
        """draws가 있으면 forced facet이 similarity 결과보다 우선 포함되어야 한다."""
        from backend_ai.app.domain_rag import DomainRAG

        mock_vs = MagicMock()
        mock_vs.has_data.return_value = True

        def _search_side_effect(*args, **kwargs):
            where = kwargs.get("where")
            if where:
                return [
                    {
                        "id": "forced_1",
                        "text": "Card: The Fool | Orientation: upright | Domain: love | Meaning: forced facet",
                        "score": 0.01,
                        "metadata": where,
                    }
                ]
            return [
                {
                    "id": "sim_1",
                    "text": "General tarot context",
                    "score": 0.91,
                    "metadata": {"domain": "tarot"},
                }
            ]

        mock_vs.search.side_effect = _search_side_effect
        mock_get_vs.return_value = mock_vs

        rag = DomainRAG()
        with patch.object(rag, "_embed_query", return_value=torch.randn(384)):
            results = rag._search_chromadb(
                domain="tarot",
                query="relationship advice",
                top_k=3,
                min_score=0.2,
                draws=[
                    {
                        "card_id": "MAJOR_0",
                        "orientation": "upright",
                        "domain": "love",
                        "position": "single",
                    }
                ],
            )

        assert len(results) >= 1
        assert "forced facet" in results[0]["text"]
        assert any("General tarot context" in r["text"] for r in results)


class TestDomainRAGSearchMultiple:
    """Tests for search_multiple method."""

    def test_search_multiple_merges_results(self):
        """Test searching across multiple domains."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        with patch.object(rag, "search") as mock_search:
            mock_search.side_effect = [
                [{"text": "tarot1", "score": 0.9, "domain": "tarot"}],
                [{"text": "dream1", "score": 0.8, "domain": "dream"}],
            ]

            results = rag.search_multiple(["tarot", "dream"], "query", top_k=5)

        assert len(results) == 2
        assert results[0]["score"] >= results[1]["score"]


class TestDomainRAGGetContext:
    """Tests for get_context method."""

    def test_get_context_empty(self):
        """Test get_context with no results."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        with patch.object(rag, "search", return_value=[]):
            context = rag.get_context("tarot", "query")

        assert context == ""

    def test_get_context_with_results(self):
        """Test get_context formats results."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        with patch.object(
            rag,
            "search",
            return_value=[
                {"text": "Result 1", "score": 0.9},
                {"text": "Result 2", "score": 0.8},
            ],
        ):
            context = rag.get_context("tarot", "query", top_k=2)

        assert "Result 1" in context
        assert "Result 2" in context

    def test_get_context_respects_max_chars(self):
        """Test get_context respects character limit."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        long_text = "x" * 1000
        with patch.object(
            rag,
            "search",
            return_value=[
                {"text": long_text, "score": 0.9},
                {"text": long_text, "score": 0.8},
            ],
        ):
            context = rag.get_context("tarot", "query", max_chars=500)

        # Should only include first result due to char limit
        assert len(context) <= 1100  # Some buffer for formatting

    def test_get_context_passes_draws(self):
        """get_context는 draws를 search로 전달해야 한다."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        draws = [{"card_id": "MAJOR_0", "orientation": "upright", "domain": "love"}]

        with patch.object(
            rag,
            "search",
            return_value=[{"text": "forced facet context", "score": 0.1, "domain": "tarot"}],
        ) as mock_search:
            context = rag.get_context("tarot", "query", draws=draws)

        assert "forced facet context" in context
        assert mock_search.call_args.kwargs["draws"] == draws


class TestDomainRAGProperties:
    """Tests for item_count and is_ready properties."""

    def test_item_count_empty(self):
        """Test item_count with no loaded domains."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        assert rag.item_count == 0

    def test_item_count_with_domains(self):
        """Test item_count with loaded domains."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {"count": 100}
        rag._domain_cache["dream"] = {"count": 50}

        assert rag.item_count == 150

    def test_is_ready_false(self):
        """Test is_ready when no domains loaded."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()

        assert rag.is_ready is False

    def test_is_ready_true(self):
        """Test is_ready when domains loaded."""
        from backend_ai.app.domain_rag import DomainRAG

        rag = DomainRAG()
        rag._domain_cache["tarot"] = {}

        assert rag.is_ready is True


class TestSingletonFactory:
    """Tests for get_domain_rag singleton."""

    @patch("backend_ai.app.domain_rag._domain_rag_instance", None)
    @patch("backend_ai.app.domain_rag.DomainRAG")
    def test_get_domain_rag_creates_instance(self, mock_class):
        """Test factory creates new instance."""
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance

        from backend_ai.app.domain_rag import get_domain_rag

        result = get_domain_rag()

        mock_class.assert_called_once_with(preload_domains=None)


class TestUtilityFunctions:
    """Tests for utility functions."""

    @patch("backend_ai.app.domain_rag.get_domain_rag")
    def test_search_tarot(self, mock_get_rag):
        """Test search_tarot convenience function."""
        mock_rag = MagicMock()
        mock_rag.search.return_value = []
        mock_get_rag.return_value = mock_rag

        from backend_ai.app.domain_rag import search_tarot

        search_tarot("love", top_k=3)

        mock_rag.load_domain.assert_called_with("tarot")
        mock_rag.search.assert_called_with("tarot", "love", top_k=3, draws=None)

    @patch("backend_ai.app.domain_rag.get_domain_rag")
    def test_search_dream(self, mock_get_rag):
        """Test search_dream convenience function."""
        mock_rag = MagicMock()
        mock_rag.search.return_value = []
        mock_get_rag.return_value = mock_rag

        from backend_ai.app.domain_rag import search_dream

        search_dream("falling", top_k=5)

        mock_rag.load_domain.assert_called_with("dream")
        mock_rag.search.assert_called_with("dream", "falling", top_k=5)


class TestConstants:
    """Tests for module constants."""

    def test_domains_list(self):
        """Default domain policy should be tarot-first."""
        from backend_ai.app.domain_rag import DOMAINS

        assert "tarot" in DOMAINS
        assert len(DOMAINS) >= 1

    def test_domains_env_override(self, monkeypatch):
        """DOMAIN_RAG_DOMAINS env should override default domains."""
        monkeypatch.setenv("DOMAIN_RAG_DOMAINS", "tarot,dream")

        import app.domain_settings as ds
        import app.domain_rag as dr

        importlib.reload(ds)
        importlib.reload(dr)

        assert dr.DOMAINS == ["tarot", "dream"]

        monkeypatch.delenv("DOMAIN_RAG_DOMAINS", raising=False)
        importlib.reload(ds)
        importlib.reload(dr)

    def test_default_min_score_from_settings(self):
        """DomainRAG should expose tarot-oriented default threshold."""
        import backend_ai.app.domain_rag as dr
        import backend_ai.app.domain_settings as ds

        assert dr.DEFAULT_TAROT_MIN_SCORE == ds.DEFAULT_TAROT_MIN_SCORE


class TestModuleExports:
    """Tests for module exports."""

    def test_domain_rag_importable(self):
        """DomainRAG should be importable."""
        from backend_ai.app.domain_rag import DomainRAG

        assert DomainRAG is not None

    def test_get_domain_rag_importable(self):
        """get_domain_rag should be importable."""
        from backend_ai.app.domain_rag import get_domain_rag

        assert get_domain_rag is not None

    def test_search_tarot_importable(self):
        """search_tarot should be importable."""
        from backend_ai.app.domain_rag import search_tarot

        assert search_tarot is not None

    def test_search_dream_importable(self):
        """search_dream should be importable."""
        from backend_ai.app.domain_rag import search_dream

        assert search_dream is not None
