"""
Unit tests for Dream module.

Tests:
- DreamRuleEngine functionality
- Prompt building
- Symbol detection
- Taemong detection
- Lucky number generation
- Celestial context
"""
import pytest
from unittest.mock import patch, MagicMock


class TestDreamPromptBuilder:
    """Tests for dream prompt building functions."""

    def test_build_dream_prompt_basic(self):
        """Test basic prompt building."""
        from app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="나는 하늘을 나는 꿈을 꿨다",
            symbols=["sky", "flying"],
            emotions=["freedom", "joy"],
            themes=["예지몽"],
            context=["새벽 꿈"],
            cultural={},
            matched_rules={"texts": ["Flying dreams indicate aspiration"]},
            locale="ko"
        )

        assert "나는 하늘을 나는 꿈을 꿨다" in prompt
        assert "sky" in prompt or "flying" in prompt
        assert "한국어" in prompt  # Korean instruction should be present

    def test_build_dream_prompt_english_locale(self):
        """Test prompt building with English locale."""
        from app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="I dreamed of flying",
            symbols=["flying"],
            emotions=["freedom"],
            themes=[],
            context=[],
            cultural={},
            matched_rules={},
            locale="en"
        )

        assert "Please respond in English" in prompt

    def test_build_dream_prompt_with_cultural_symbols(self):
        """Test prompt building with cultural symbols."""
        from app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="꿈에서 용을 봤다",
            symbols=["dragon"],
            emotions=[],
            themes=[],
            context=[],
            cultural={
                "koreanTypes": ["길몽"],
                "koreanLucky": ["용꿈"],
                "chinese": ["dragon"],
            },
            matched_rules={},
            locale="ko"
        )

        assert "Korean Types: 길몽" in prompt
        assert "Korean Lucky: 용꿈" in prompt
        assert "Chinese: dragon" in prompt

    def test_build_dream_prompt_with_saju_influence(self):
        """Test prompt building with Saju influence."""
        from app.dream_logic import build_dream_prompt

        saju_influence = {
            "dayMaster": {"stem": "甲", "element": "wood", "yin_yang": "양"},
            "currentDaeun": {"stem": "乙", "branch": "亥", "element": "wood", "startYear": 2020},
            "currentSaeun": {"stem": "丙", "branch": "子", "year": 2024},
        }

        prompt = build_dream_prompt(
            dream_text="test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules={"saju_influence": saju_influence},
            locale="ko"
        )

        assert "Saju Fortune Influence" in prompt or "사주 운세" in prompt

    def test_build_dream_prompt_with_celestial_context(self):
        """Test prompt building with celestial context."""
        from app.dream_logic import build_dream_prompt

        celestial_context = {
            "moon_phase": {
                "name": "Full Moon",
                "korean": "보름달",
                "emoji": "🌕",
                "illumination": 100,
                "dream_quality": "vivid",
            },
            "retrogrades": [{"planet": "Mercury", "korean": "수성"}],
        }

        prompt = build_dream_prompt(
            dream_text="test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules={},
            locale="ko",
            celestial_context=celestial_context
        )

        assert "Celestial Configuration" in prompt or "천체 배치" in prompt

    def test_build_dream_prompt_with_matched_rules(self):
        """Test prompt building with matched rules."""
        from app.dream_logic import build_dream_prompt

        matched_rules = {
            "texts": ["Rule 1", "Rule 2"],
            "korean_notes": ["한국 해몽 1"],
            "specifics": ["Specific detail 1"],
            "categories": ["prophetic", "lucky"],
            "advice": ["Follow your intuition"],
            "combination_insights": ["뱀+물: 재물운"],
            "taemong_insight": "태몽 분석: 용 - 큰 인물 암시",
        }

        prompt = build_dream_prompt(
            dream_text="test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules=matched_rules,
            locale="ko"
        )

        assert "Rule 1" in prompt
        assert "한국 해몽 1" in prompt
        assert "Specific detail 1" in prompt


class TestDreamRuleEngine:
    """Tests for DreamRuleEngine class (from app.dream package)."""

    def test_rule_engine_exists(self):
        """Test DreamRuleEngine exists in dream package."""
        from app.dream.rule_engine import DreamRuleEngine

        assert DreamRuleEngine is not None

    def test_get_dream_rule_engine_exists(self):
        """Test get_dream_rule_engine exists in dream package."""
        from app.dream.rule_engine import get_dream_rule_engine

        assert callable(get_dream_rule_engine)

    def test_get_dream_rule_engine_singleton(self):
        """Test singleton pattern for rule engine."""
        from app.dream.rule_engine import get_dream_rule_engine

        engine1 = get_dream_rule_engine()
        engine2 = get_dream_rule_engine()
        assert engine1 is engine2

    def test_evaluate_returns_dict(self):
        """Test evaluate method returns proper structure."""
        from app.dream.rule_engine import get_dream_rule_engine

        engine = get_dream_rule_engine()
        facts = {
            "dream": "I dreamed of flying in the sky",
            "symbols": ["flying", "sky"],
            "emotions": ["freedom"],
            "themes": [],
            "context": [],
            "cultural": {}
        }

        result = engine.evaluate(facts)

        assert isinstance(result, dict)
        assert "texts" in result
        assert "korean_notes" in result
        assert "specifics" in result
        assert "categories" in result
        assert isinstance(result["texts"], list)


class TestDreamHelperFunctions:
    """Tests for dream helper functions."""

    def test_merge_unique(self):
        """Test list merging with deduplication."""
        from app.dream_logic import merge_unique

        list1 = ["a", "b", "c"]
        list2 = ["c", "d", "e"]

        result = merge_unique(list1, list2)

        assert "a" in result
        assert "b" in result
        assert "c" in result
        assert "d" in result
        assert "e" in result
        # c should not be duplicated
        assert result.count("c") == 1

    def test_get_fallback_interpretations(self):
        """Test fallback interpretations when no rules match."""
        from app.dream_logic import get_fallback_interpretations

        result = get_fallback_interpretations("무서운 꿈을 꿨어요")

        assert isinstance(result, list)
        assert len(result) > 0

    def test_get_fallback_interpretations_with_emotions(self):
        """Test fallback interpretations detect emotion keywords."""
        from app.dream_logic import get_fallback_interpretations

        # Test with fear keywords
        result_fear = get_fallback_interpretations("scary dream")
        assert isinstance(result_fear, list)
        assert len(result_fear) > 0

        # Test with joy keywords
        result_joy = get_fallback_interpretations("happy dream")
        assert isinstance(result_joy, list)
        assert len(result_joy) > 0

    def test_create_cache_key(self):
        """Test cache key creation."""
        from app.dream_logic import create_cache_key

        facts = {
            "dream": "test dream",
            "symbols": ["a", "b"],
            "emotions": ["happy"],
            "themes": [],
            "locale": "ko"
        }

        key = create_cache_key(facts)

        assert key.startswith("dream:")
        assert len(key) > 10

    def test_create_cache_key_deterministic(self):
        """Test cache key is deterministic for same input."""
        from app.dream_logic import create_cache_key

        facts = {
            "dream": "test dream",
            "symbols": ["a", "b"],
            "emotions": ["happy"],
            "themes": [],
            "locale": "ko"
        }

        key1 = create_cache_key(facts)
        key2 = create_cache_key(facts)

        assert key1 == key2


class TestInterpretDreamFunction:
    """Tests for the main interpret_dream function."""

    def test_interpret_dream_importable(self):
        """Test interpret_dream is importable and callable."""
        from app.dream_logic import interpret_dream

        assert callable(interpret_dream)


class TestDreamModuleExports:
    """Tests for dream module exports."""

    def test_build_dream_prompt_importable(self):
        """build_dream_prompt should be importable."""
        from app.dream_logic import build_dream_prompt
        assert callable(build_dream_prompt)

    def test_dream_rule_engine_importable_from_dream_package(self):
        """DreamRuleEngine should be importable from dream package."""
        from app.dream.rule_engine import DreamRuleEngine
        assert DreamRuleEngine is not None

    def test_get_dream_rule_engine_importable_from_dream_package(self):
        """get_dream_rule_engine should be importable from dream package."""
        from app.dream.rule_engine import get_dream_rule_engine
        assert callable(get_dream_rule_engine)

    def test_interpret_dream_importable(self):
        """interpret_dream should be importable."""
        from app.dream_logic import interpret_dream
        assert callable(interpret_dream)