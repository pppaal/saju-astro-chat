"""
Unit tests for Tarot Hybrid RAG module.

Tests:
- TarotPromptBuilder class
- Module imports (refactored structure)
"""
import pytest
from unittest.mock import patch, MagicMock


class TestTarotPromptBuilderClass:
    """Tests for TarotPromptBuilder class."""

    def test_tarot_prompt_builder_exists(self):
        """TarotPromptBuilder class should exist."""
        from app.tarot_hybrid_rag import TarotPromptBuilder

        assert TarotPromptBuilder is not None

    def test_tarot_prompt_builder_has_system_prompt(self):
        """TarotPromptBuilder should have SYSTEM_PROMPT."""
        from app.tarot_hybrid_rag import TarotPromptBuilder

        assert hasattr(TarotPromptBuilder, 'SYSTEM_PROMPT')
        assert isinstance(TarotPromptBuilder.SYSTEM_PROMPT, str)
        assert len(TarotPromptBuilder.SYSTEM_PROMPT) > 100


class TestModuleImportsFromTarotPackage:
    """Tests for imports from tarot package (refactored structure)."""

    def test_get_pattern_engine_imported(self):
        """get_pattern_engine should be importable from tarot package."""
        from app.tarot import get_pattern_engine

        assert callable(get_pattern_engine)

    def test_tarot_pattern_engine_imported(self):
        """TarotPatternEngine should be importable from tarot package."""
        from app.tarot import TarotPatternEngine

        assert TarotPatternEngine is not None

    def test_get_premium_engine_imported(self):
        """get_premium_engine should be importable from tarot package."""
        from app.tarot import get_premium_engine

        assert callable(get_premium_engine)

    def test_tarot_pattern_engine_premium_imported(self):
        """TarotPatternEnginePremium should be importable from tarot package."""
        from app.tarot import TarotPatternEnginePremium

        assert TarotPatternEnginePremium is not None

    def test_advanced_rules_loader_imported(self):
        """AdvancedRulesLoader should be importable from tarot package."""
        from app.tarot import AdvancedRulesLoader

        assert AdvancedRulesLoader is not None

    def test_get_rules_loader_imported(self):
        """get_rules_loader should be importable from tarot package."""
        from app.tarot import get_rules_loader

        assert callable(get_rules_loader)

    def test_spread_loader_imported(self):
        """SpreadLoader should be importable from tarot package."""
        from app.tarot import SpreadLoader

        assert SpreadLoader is not None

    def test_get_spread_loader_imported(self):
        """get_spread_loader should be importable from tarot package."""
        from app.tarot import get_spread_loader

        assert callable(get_spread_loader)


class TestModuleImportsFromHybridRag:
    """Tests for imports via backward-compat tarot_hybrid_rag module."""

    def test_tarot_prompt_builder_backward_compat(self):
        """TarotPromptBuilder should be importable via tarot_hybrid_rag."""
        from app.tarot_hybrid_rag import TarotPromptBuilder

        assert TarotPromptBuilder is not None

    def test_tarot_hybrid_rag_class_importable(self):
        """TarotHybridRAG should be importable via tarot_hybrid_rag."""
        from app.tarot_hybrid_rag import TarotHybridRAG

        assert TarotHybridRAG is not None

    def test_get_tarot_hybrid_rag_importable(self):
        """get_tarot_hybrid_rag should be importable via tarot_hybrid_rag."""
        from app.tarot_hybrid_rag import get_tarot_hybrid_rag

        assert callable(get_tarot_hybrid_rag)


class TestModuleExportsFromTarotPackage:
    """Tests for module exports from tarot package."""

    def test_tarot_prompt_builder_importable(self):
        """TarotPromptBuilder should be importable from tarot package."""
        from app.tarot import TarotPromptBuilder
        assert TarotPromptBuilder is not None

    def test_system_prompt_importable(self):
        """SYSTEM_PROMPT should be importable from tarot package."""
        from app.tarot import SYSTEM_PROMPT
        assert isinstance(SYSTEM_PROMPT, str)

    def test_tarot_llm_client_importable(self):
        """TarotLLMClient should be importable from tarot package."""
        from app.tarot import TarotLLMClient
        assert TarotLLMClient is not None

    def test_get_tarot_llm_client_importable(self):
        """get_tarot_llm_client should be importable from tarot package."""
        from app.tarot import get_tarot_llm_client
        assert callable(get_tarot_llm_client)


class TestConstantsFromTarotPackage:
    """Tests for constants importable from tarot package."""

    def test_suit_info_importable(self):
        """SUIT_INFO should be importable from tarot package."""
        from app.tarot import SUIT_INFO
        assert SUIT_INFO is not None
        assert isinstance(SUIT_INFO, dict)

    def test_numerology_importable(self):
        """NUMEROLOGY should be importable from tarot package."""
        from app.tarot import NUMEROLOGY
        assert NUMEROLOGY is not None
        assert isinstance(NUMEROLOGY, dict)

    def test_court_ranks_importable(self):
        """COURT_RANKS should be importable from tarot package."""
        from app.tarot import COURT_RANKS
        assert COURT_RANKS is not None
        assert isinstance(COURT_RANKS, dict)

    def test_element_interactions_importable(self):
        """ELEMENT_INTERACTIONS should be importable from tarot package."""
        from app.tarot import ELEMENT_INTERACTIONS
        assert ELEMENT_INTERACTIONS is not None
        assert isinstance(ELEMENT_INTERACTIONS, dict)

    def test_polarity_pairs_importable(self):
        """POLARITY_PAIRS should be importable from tarot package."""
        from app.tarot import POLARITY_PAIRS
        assert POLARITY_PAIRS is not None
        assert isinstance(POLARITY_PAIRS, list)
