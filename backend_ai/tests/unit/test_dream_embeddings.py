"""
Unit tests for Dream Embeddings module.

Tests:
- CrisisDetector class
- DreamEmbedRAG class
- Rule loading
- Search functionality
- Therapeutic questions
- Counseling context
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestCrisisDetector:
    """Tests for CrisisDetector class."""

    def test_crisis_detector_exists(self):
        """CrisisDetector class should exist."""
        from app.dream_embeddings import CrisisDetector

        assert CrisisDetector is not None

    def test_high_risk_keywords_defined(self):
        """HIGH_RISK_KEYWORDS should be defined."""
        from app.dream_embeddings import CrisisDetector

        assert hasattr(CrisisDetector, 'HIGH_RISK_KEYWORDS')
        assert isinstance(CrisisDetector.HIGH_RISK_KEYWORDS, dict)
        assert 'suicidal' in CrisisDetector.HIGH_RISK_KEYWORDS
        assert 'severe_distress' in CrisisDetector.HIGH_RISK_KEYWORDS

    def test_resources_korea_defined(self):
        """RESOURCES_KOREA should be defined with hotlines."""
        from app.dream_embeddings import CrisisDetector

        assert hasattr(CrisisDetector, 'RESOURCES_KOREA')
        resources = CrisisDetector.RESOURCES_KOREA
        assert 'emergency' in resources
        assert 'suicide_prevention' in resources
        assert '119' in resources['emergency']

    def test_check_crisis_returns_none_for_normal_text(self):
        """check_crisis should return None for normal text."""
        from app.dream_embeddings import CrisisDetector

        result = CrisisDetector.check_crisis("오늘 좋은 꿈을 꿨어요")

        assert result is None

    def test_check_crisis_detects_crisis_keywords(self):
        """check_crisis should detect crisis keywords."""
        from app.dream_embeddings import CrisisDetector

        result = CrisisDetector.check_crisis("죽고 싶어요")

        assert result is not None
        assert result['detected'] is True
        assert result['severity'] in ['critical', 'high']
        assert 'response' in result
        assert 'resources' in result

    def test_check_crisis_handles_empty_text(self):
        """check_crisis should handle empty text."""
        from app.dream_embeddings import CrisisDetector

        result = CrisisDetector.check_crisis("")
        assert result is None

        result = CrisisDetector.check_crisis(None)
        assert result is None


class TestDreamEmbedRAGClass:
    """Tests for DreamEmbedRAG class."""

    def test_dream_embed_rag_exists(self):
        """DreamEmbedRAG class should exist."""
        from app.dream_embeddings import DreamEmbedRAG

        assert DreamEmbedRAG is not None

    @patch('app.dream_embeddings.get_model')
    def test_dream_embed_rag_instantiation(self, mock_get_model):
        """DreamEmbedRAG should be instantiable."""
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock()
        mock_get_model.return_value = mock_model

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/nonexistent")

            assert rag is not None
            assert rag.rules == {}
            assert rag.rule_texts == []

    def test_dream_embed_rag_has_model_property(self):
        """DreamEmbedRAG should have model property."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, 'model')

    def test_dream_embed_rag_has_search_method(self):
        """DreamEmbedRAG should have search method."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, 'search')
        assert callable(getattr(DreamEmbedRAG, 'search'))

    def test_dream_embed_rag_has_interpretation_context_method(self):
        """DreamEmbedRAG should have get_interpretation_context method."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, 'get_interpretation_context')

    def test_dream_embed_rag_has_therapeutic_questions_method(self):
        """DreamEmbedRAG should have get_therapeutic_questions method."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, 'get_therapeutic_questions')

    def test_dream_embed_rag_has_counseling_context_method(self):
        """DreamEmbedRAG should have get_counseling_context method."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, 'get_counseling_context')


class TestDreamRuleLoading:
    """Tests for rule loading functionality."""

    @patch('app.dream_embeddings.get_model')
    def test_load_rules_with_nonexistent_dir(self, mock_get_model):
        """_load_rules should handle non-existent directory."""
        mock_get_model.return_value = MagicMock()

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/nonexistent")

            assert rag.rules == {}

    @patch('app.dream_embeddings.get_model')
    def test_embed_cache_path_set(self, mock_get_model):
        """embed_cache_path should be set correctly."""
        mock_get_model.return_value = MagicMock()

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")

            assert rag.embed_cache_path is not None
            assert "dream_embeds" in rag.embed_cache_path

    @patch('app.dream_embeddings.get_model')
    def test_load_rules_creates_empty_structures(self, mock_get_model):
        """_load_rules should create empty data structures."""
        mock_get_model.return_value = MagicMock()

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")

            assert isinstance(rag.rules, dict)
            assert isinstance(rag.rule_texts, list)
            assert isinstance(rag.therapeutic_questions, dict)
            assert isinstance(rag.counseling_scenarios, dict)


class TestDreamSearch:
    """Tests for search functionality."""

    @patch('app.dream_embeddings.get_model')
    def test_search_returns_list(self, mock_get_model):
        """search should return a list."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")
            # With no rules loaded, search should return empty list
            result = rag.search("테스트 꿈")

            assert isinstance(result, list)

    @patch('app.dream_embeddings.get_model')
    def test_get_interpretation_context_returns_dict(self, mock_get_model):
        """get_interpretation_context should return a dict."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")
            result = rag.get_interpretation_context("떨어지는 꿈")

            assert isinstance(result, dict)
            assert 'texts' in result
            assert 'korean_notes' in result
            assert 'categories' in result


class TestTherapeuticQuestions:
    """Tests for therapeutic questions functionality."""

    @patch('app.dream_embeddings.get_model')
    def test_get_therapeutic_questions_returns_dict(self, mock_get_model):
        """get_therapeutic_questions should return a dict."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")
            result = rag.get_therapeutic_questions("그림자에 쫓기는 꿈")

            assert isinstance(result, dict)

    @patch('app.dream_embeddings.get_model')
    def test_generate_therapeutic_insight_method_exists(self, mock_get_model):
        """_generate_therapeutic_insight method should exist."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, '_generate_therapeutic_insight')


class TestCounselingContext:
    """Tests for counseling context functionality."""

    @patch('app.dream_embeddings.get_model')
    def test_get_counseling_context_returns_dict(self, mock_get_model):
        """get_counseling_context should return a dict."""
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model

        from app.dream_embeddings import DreamEmbedRAG

        with patch('os.path.exists', return_value=False):
            rag = DreamEmbedRAG(rules_dir="/tmp/test")
            result = rag.get_counseling_context("직장에서 스트레스받아요")

            assert isinstance(result, dict)


class TestGetDreamEmbedRAG:
    """Tests for get_dream_embed_rag singleton function."""

    def test_get_dream_embed_rag_function_exists(self):
        """get_dream_embed_rag function should exist."""
        from app.dream_embeddings import get_dream_embed_rag

        assert callable(get_dream_embed_rag)


class TestJungExtensions:
    """Tests for Jung psychology extensions."""

    @patch('app.dream_embeddings.get_model')
    def test_load_jung_extensions_method_exists(self, mock_get_model):
        """_load_jung_extensions method should exist."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, '_load_jung_extensions')

    @patch('app.dream_embeddings.get_model')
    def test_load_jung_corpus_method_exists(self, mock_get_model):
        """_load_jung_corpus method should exist."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, '_load_jung_corpus')

    @patch('app.dream_embeddings.get_model')
    def test_load_stoic_corpus_method_exists(self, mock_get_model):
        """_load_stoic_corpus method should exist."""
        from app.dream_embeddings import DreamEmbedRAG

        assert hasattr(DreamEmbedRAG, '_load_stoic_corpus')


class TestModuleExports:
    """Tests for module exports."""

    def test_crisis_detector_importable(self):
        """CrisisDetector should be importable."""
        from app.dream_embeddings import CrisisDetector
        assert CrisisDetector is not None

    def test_dream_embed_rag_importable(self):
        """DreamEmbedRAG should be importable."""
        from app.dream_embeddings import DreamEmbedRAG
        assert DreamEmbedRAG is not None

    def test_get_dream_embed_rag_importable(self):
        """get_dream_embed_rag should be importable."""
        from app.dream_embeddings import get_dream_embed_rag
        assert callable(get_dream_embed_rag)

    def test_get_model_imported(self):
        """get_model should be imported from saju_astro_rag."""
        from app.dream_embeddings import get_model
        assert callable(get_model)
