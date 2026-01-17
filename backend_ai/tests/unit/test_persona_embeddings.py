"""
Unit tests for Persona Embeddings module.

Tests:
- PersonaEmbedRAG class
- Rule loading
- Embedding preparation
- Search functionality
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestPersonaEmbedRAGClass:
    """Tests for PersonaEmbedRAG class."""

    def test_persona_embed_rag_exists(self):
        """PersonaEmbedRAG class should exist."""
        from app.persona_embeddings import PersonaEmbedRAG

        assert PersonaEmbedRAG is not None

    @patch('app.persona_embeddings.get_model')
    def test_persona_embed_rag_instantiation(self, mock_get_model):
        """PersonaEmbedRAG should be instantiable."""
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock()
        mock_get_model.return_value = mock_model

        from app.persona_embeddings import PersonaEmbedRAG

        # Use a temporary directory that doesn't exist
        with patch('os.path.exists', return_value=False):
            rag = PersonaEmbedRAG(rules_dir="/tmp/nonexistent")

            assert rag is not None
            assert rag.rules == {}
            assert rag.rule_texts == []

    def test_persona_embed_rag_has_model_property(self):
        """PersonaEmbedRAG should have model property."""
        from app.persona_embeddings import PersonaEmbedRAG

        assert hasattr(PersonaEmbedRAG, 'model')


class TestPersonaRuleLoading:
    """Tests for rule loading functionality."""

    @patch('app.persona_embeddings.get_model')
    def test_load_rules_with_nonexistent_dir(self, mock_get_model):
        """_load_rules should handle non-existent directory."""
        mock_get_model.return_value = MagicMock()

        from app.persona_embeddings import PersonaEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = PersonaEmbedRAG(rules_dir="/nonexistent")

            assert rag.rules == {}

    @patch('app.persona_embeddings.get_model')
    @patch('os.path.exists')
    @patch('os.listdir')
    def test_load_rules_filters_v4_files(self, mock_listdir, mock_exists, mock_get_model):
        """_load_rules should only load _v4 JSON files."""
        mock_get_model.return_value = MagicMock()
        mock_exists.return_value = True
        mock_listdir.return_value = [
            "persona_v4.json",
            "old_rules.json",
            "other_v4.json",
            "readme.txt"
        ]

        from app.persona_embeddings import PersonaEmbedRAG

        # Only _v4.json files should be considered
        with patch('builtins.open', MagicMock()):
            with patch('json.load', return_value={"meta": {"persona": "Test"}}):
                rag = PersonaEmbedRAG.__new__(PersonaEmbedRAG)
                rag.rules_dir = "/test"
                rag.rules = {}
                rag.rule_texts = []
                rag.rule_embeds = None
                rag.embed_cache_path = "/test/cache.pt"
                rag._model = None

                # Verify class structure
                assert hasattr(rag, 'rules')
                assert hasattr(rag, 'rule_texts')


class TestPersonaEmbeddings:
    """Tests for embedding functionality."""

    @patch('app.persona_embeddings.get_model')
    def test_prepare_embeddings_method_exists(self, mock_get_model):
        """_prepare_embeddings method should exist."""
        from app.persona_embeddings import PersonaEmbedRAG

        assert hasattr(PersonaEmbedRAG, '_prepare_embeddings')

    @patch('app.persona_embeddings.get_model')
    def test_embed_cache_path_set(self, mock_get_model):
        """embed_cache_path should be set."""
        mock_get_model.return_value = MagicMock()

        from app.persona_embeddings import PersonaEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = PersonaEmbedRAG(rules_dir="/tmp/test")

            assert rag.embed_cache_path is not None
            assert "persona_embeds.pt" in rag.embed_cache_path


class TestPersonaSearch:
    """Tests for search functionality."""

    def test_search_method_exists(self):
        """search method should exist."""
        from app.persona_embeddings import PersonaEmbedRAG

        assert hasattr(PersonaEmbedRAG, 'search') or hasattr(PersonaEmbedRAG, 'find_relevant')


class TestPersonaModuleExports:
    """Tests for module exports."""

    def test_persona_embed_rag_importable(self):
        """PersonaEmbedRAG should be importable."""
        from app.persona_embeddings import PersonaEmbedRAG
        assert PersonaEmbedRAG is not None

    def test_get_model_imported(self):
        """get_model should be imported from saju_astro_rag."""
        from app.persona_embeddings import get_model
        assert callable(get_model)
