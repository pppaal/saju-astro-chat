"""
Unit tests for Tarot Prompts Builder module.

Tests:
- TarotPromptBuilder class
- Prompt building methods
- Advanced context building
"""
import pytest
from unittest.mock import patch, MagicMock


class TestTarotPromptBuilderClass:
    """Tests for TarotPromptBuilder class."""

    def test_class_exists(self):
        """Test TarotPromptBuilder class exists."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert TarotPromptBuilder is not None

    def test_has_system_prompt(self):
        """Test class has SYSTEM_PROMPT attribute."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert hasattr(TarotPromptBuilder, 'SYSTEM_PROMPT')
        assert isinstance(TarotPromptBuilder.SYSTEM_PROMPT, str)


class TestBuildReadingPrompt:
    """Tests for build_reading_prompt static method."""

    def test_method_exists(self):
        """Test method exists."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert hasattr(TarotPromptBuilder, 'build_reading_prompt')
        assert callable(TarotPromptBuilder.build_reading_prompt)

    def test_returns_string(self):
        """Test method returns string."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Three Card"}
        drawn_cards = [{"name": "The Fool"}]

        result = TarotPromptBuilder.build_reading_prompt(spread, drawn_cards)

        assert isinstance(result, str)

    def test_includes_spread_name(self):
        """Test result includes spread name."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Celtic Cross"}
        drawn_cards = [{"name": "The Magician"}]

        result = TarotPromptBuilder.build_reading_prompt(spread, drawn_cards)

        assert "Celtic Cross" in result

    def test_includes_question_when_provided(self):
        """Test result includes question when provided."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Single Card"}
        drawn_cards = [{"name": "The High Priestess"}]
        question = "What does my future hold?"

        result = TarotPromptBuilder.build_reading_prompt(
            spread, drawn_cards, question=question
        )

        assert "future" in result.lower()

    def test_handles_empty_question(self):
        """Test handles empty question gracefully."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Single Card"}
        drawn_cards = [{"name": "The Empress"}]

        # Should not raise
        result = TarotPromptBuilder.build_reading_prompt(
            spread, drawn_cards, question=""
        )

        assert isinstance(result, str)

    def test_includes_korean_title(self):
        """Test includes Korean title when available."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Love Spread", "korean": "사랑 스프레드"}
        drawn_cards = [{"name": "The Lovers"}]

        result = TarotPromptBuilder.build_reading_prompt(spread, drawn_cards)

        assert "사랑" in result

    def test_handles_positions(self):
        """Test handles spread positions."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        # Positions should be dicts with 'name' and 'meaning' keys
        spread = {
            "spread_name": "Three Card",
            "positions": [
                {"name": "Past", "meaning": "과거의 영향"},
                {"name": "Present", "meaning": "현재 상황"},
                {"name": "Future", "meaning": "미래 전망"}
            ]
        }
        drawn_cards = [
            {"name": "The Fool"},
            {"name": "The Magician"},
            {"name": "The High Priestess"}
        ]

        result = TarotPromptBuilder.build_reading_prompt(spread, drawn_cards)

        assert isinstance(result, str)

    def test_with_tarot_rag(self):
        """Test with TarotRAG provided."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Single"}
        drawn_cards = [{"name": "The Star"}]
        mock_rag = MagicMock()

        result = TarotPromptBuilder.build_reading_prompt(
            spread, drawn_cards, tarot_rag=mock_rag
        )

        assert isinstance(result, str)

    def test_with_advanced_rules(self):
        """Test with advanced rules provided."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        spread = {"spread_name": "Pair"}
        drawn_cards = [{"name": "The Sun"}, {"name": "The Moon"}]
        mock_rules = MagicMock()
        mock_rules.find_card_combination.return_value = None
        mock_rules.analyze_elemental_balance.return_value = None

        result = TarotPromptBuilder.build_reading_prompt(
            spread, drawn_cards, advanced_rules=mock_rules
        )

        assert isinstance(result, str)


class TestBuildAdvancedContext:
    """Tests for _build_advanced_context static method."""

    def test_method_exists(self):
        """Test method exists."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert hasattr(TarotPromptBuilder, '_build_advanced_context')

    def test_returns_string(self):
        """Test method returns string."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        mock_rules = MagicMock()
        mock_rules.find_card_combination.return_value = None
        mock_rules.analyze_elemental_balance.return_value = None

        result = TarotPromptBuilder._build_advanced_context(
            mock_rules,
            ["The Fool", "The Magician"],
            [{"name": "The Fool"}, {"name": "The Magician"}]
        )

        assert isinstance(result, str)

    def test_includes_combination_when_found(self):
        """Test includes combination when found."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        mock_rules = MagicMock()
        mock_rules.find_card_combination.return_value = {
            "cards": ["The Sun", "The Moon"],
            "category": "cosmic",
            "korean": "우주의 조화"
        }
        mock_rules.analyze_elemental_balance.return_value = None

        result = TarotPromptBuilder._build_advanced_context(
            mock_rules,
            ["The Sun", "The Moon"],
            [{"name": "The Sun"}, {"name": "The Moon"}]
        )

        assert "조합" in result

    def test_includes_elemental_when_available(self):
        """Test includes elemental analysis when available."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        mock_rules = MagicMock()
        mock_rules.find_card_combination.return_value = None
        mock_rules.analyze_elemental_balance.return_value = {
            "element_count": {"fire": 2, "water": 1},
            "dominant": "fire",
            "missing": ["air"]
        }

        result = TarotPromptBuilder._build_advanced_context(
            mock_rules,
            ["The Wands Ace", "The Sun"],
            [{"name": "The Wands Ace"}, {"name": "The Sun"}]
        )

        assert isinstance(result, str)


class TestBuildCardContext:
    """Tests for _build_card_context static method."""

    def test_method_exists(self):
        """Test method exists."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert hasattr(TarotPromptBuilder, '_build_card_context')

    def test_returns_list(self):
        """Test method returns list."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        result = TarotPromptBuilder._build_card_context(
            drawn_cards=[{"name": "The Fool"}],
            positions=[{"name": "Current", "meaning": "현재 상황"}],
            tarot_rag=None,
            advanced_rules=None
        )

        assert isinstance(result, list)


class TestSystemPromptConstant:
    """Tests for system prompt constant."""

    def test_system_prompt_not_empty(self):
        """Test SYSTEM_PROMPT is not empty."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert len(TarotPromptBuilder.SYSTEM_PROMPT) > 0

    def test_system_prompt_contains_tarot(self):
        """Test SYSTEM_PROMPT mentions tarot."""
        from backend_ai.app.tarot.prompts.builder import TarotPromptBuilder

        assert "타로" in TarotPromptBuilder.SYSTEM_PROMPT or "tarot" in TarotPromptBuilder.SYSTEM_PROMPT.lower()


class TestSystemPromptsModule:
    """Tests for system_prompts module."""

    def test_system_prompt_importable(self):
        """Test SYSTEM_PROMPT is importable."""
        from backend_ai.app.tarot.prompts.system_prompts import SYSTEM_PROMPT

        assert SYSTEM_PROMPT is not None

    def test_reading_guide_importable(self):
        """Test READING_GUIDE is importable."""
        from backend_ai.app.tarot.prompts.system_prompts import READING_GUIDE

        assert READING_GUIDE is not None

