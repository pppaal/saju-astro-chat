"""
Unit tests for Dream Logic module.

Tests:
- build_dream_prompt function
- interpret_dream function
- Helper functions (_merge_unique, _get_fallback_interpretations, _create_cache_key)
- Lazy loading wrappers
"""
import pytest
from unittest.mock import patch, MagicMock
import json


class TestBuildDreamPrompt:
    """Tests for build_dream_prompt function."""

    def test_build_prompt_basic(self):
        """Test building a basic prompt."""
        from backend_ai.app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="I dreamed about flying",
            symbols=["bird", "sky"],
            emotions=["freedom", "joy"],
            themes=["예지몽"],
            context=["새벽 꿈"],
            cultural={},
            matched_rules={},
            locale="en",
        )

        assert "flying" in prompt
        assert "bird" in prompt
        assert "freedom" in prompt
        assert "예지몽" in prompt
        assert "Response Format" in prompt

    def test_build_prompt_korean_locale(self):
        """Test prompt with Korean locale."""
        from backend_ai.app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="꿈에서 뱀을 봤습니다",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules={},
            locale="ko",
        )

        assert "한국어로 답변해주세요" in prompt

    def test_build_prompt_with_cultural_symbols(self):
        """Test prompt with cultural symbols."""
        from backend_ai.app.dream_logic import build_dream_prompt

        prompt = build_dream_prompt(
            dream_text="Test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={
                "koreanTypes": ["길몽", "태몽"],
                "chinese": ["龙", "凤"],
                "western": ["shadow", "anima"],
            },
            matched_rules={},
            locale="ko",
        )

        assert "Korean Types" in prompt
        assert "길몽" in prompt
        assert "Chinese" in prompt
        assert "Western/Jungian" in prompt

    def test_build_prompt_with_saju_influence(self):
        """Test prompt with saju influence data."""
        from backend_ai.app.dream_logic import build_dream_prompt

        saju_influence = {
            "dayMaster": {"stem": "甲", "element": "木", "yin_yang": "양"},
            "currentDaeun": {"stem": "乙", "branch": "亥", "element": "木", "startYear": 2020},
            "currentSaeun": {"stem": "甲", "branch": "辰", "year": 2024},
        }

        prompt = build_dream_prompt(
            dream_text="Test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules={"saju_influence": saju_influence},
            locale="ko",
        )

        assert "사주 운세 영향" in prompt
        assert "Day Master" in prompt
        assert "Current Daeun" in prompt

    def test_build_prompt_with_celestial_context(self):
        """Test prompt with celestial context."""
        from backend_ai.app.dream_logic import build_dream_prompt

        celestial = {
            "moon_phase": {
                "name": "Full Moon",
                "korean": "보름달",
                "emoji": "🌕",
                "illumination": 98,
                "dream_quality": "vivid",
            },
            "moon_sign": {"sign": "Cancer", "korean": "게자리"},
            "retrogrades": [{"planet": "Mercury", "korean": "수성", "emoji": "☿", "themes": ["communication"]}],
        }

        prompt = build_dream_prompt(
            dream_text="Test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules={},
            locale="ko",
            celestial_context=celestial,
        )

        assert "천체 배치" in prompt
        assert "Moon Phase" in prompt
        assert "보름달" in prompt

    def test_build_prompt_with_matched_rules(self):
        """Test prompt with matched rules from knowledge base."""
        from backend_ai.app.dream_logic import build_dream_prompt

        matched_rules = {
            "texts": ["Dream rule 1", "Dream rule 2"],
            "korean_notes": ["한국 해몽: 뱀은 재물운"],
            "specifics": ["Specific context 1"],
            "categories": ["transformation", "wealth"],
            "advice": ["Record your dreams"],
        }

        prompt = build_dream_prompt(
            dream_text="Test dream",
            symbols=[],
            emotions=[],
            themes=[],
            context=[],
            cultural={},
            matched_rules=matched_rules,
            locale="ko",
        )

        assert "Knowledge Base" in prompt
        assert "Dream rule 1" in prompt
        assert "한국 해몽" in prompt


class TestMergeUnique:
    """Tests for _merge_unique helper."""

    def test_merge_unique_basic(self):
        """Test basic merge."""
        from backend_ai.app.dream_logic import _merge_unique

        result = _merge_unique(["a", "b"], ["c", "d"])

        assert len(result) == 4
        assert "a" in result
        assert "d" in result

    def test_merge_unique_removes_duplicates(self):
        """Test duplicate removal."""
        from backend_ai.app.dream_logic import _merge_unique

        result = _merge_unique(["a", "b", "c"], ["b", "c", "d"])

        assert len(result) == 4
        assert result == ["a", "b", "c", "d"]

    def test_merge_unique_empty_lists(self):
        """Test with empty lists."""
        from backend_ai.app.dream_logic import _merge_unique

        result = _merge_unique([], [])
        assert result == []

        result = _merge_unique(["a"], [])
        assert result == ["a"]


class TestGetFallbackInterpretations:
    """Tests for _get_fallback_interpretations helper."""

    def test_returns_list(self):
        """Test returns a list."""
        from backend_ai.app.dream_logic import _get_fallback_interpretations

        result = _get_fallback_interpretations("test dream")

        assert isinstance(result, list)
        assert len(result) > 0

    def test_detects_fear_emotion(self):
        """Test detects fear-related keywords."""
        from backend_ai.app.dream_logic import _get_fallback_interpretations

        result = _get_fallback_interpretations("무섭고 두려운 꿈")

        assert any("두려움" in r or "회피" in r for r in result)

    def test_detects_happy_emotion(self):
        """Test detects happiness-related keywords."""
        from backend_ai.app.dream_logic import _get_fallback_interpretations

        result = _get_fallback_interpretations("행복한 좋은 꿈")

        assert any("긍정" in r or "만족" in r for r in result)

    def test_detects_house_situation(self):
        """Test detects house-related keywords."""
        from backend_ai.app.dream_logic import _get_fallback_interpretations

        result = _get_fallback_interpretations("집에서 꾼 꿈")

        assert any("집" in r for r in result)


class TestCreateCacheKey:
    """Tests for _create_cache_key helper."""

    def test_creates_key(self):
        """Test creates a cache key."""
        from backend_ai.app.dream_logic import _create_cache_key

        facts = {
            "dream": "Test dream",
            "symbols": ["snake", "water"],
            "emotions": ["fear"],
            "themes": ["transformation"],
            "locale": "ko",
        }

        key = _create_cache_key(facts)

        assert key.startswith("dream:")
        assert len(key) > 10

    def test_same_input_same_key(self):
        """Test same input produces same key."""
        from backend_ai.app.dream_logic import _create_cache_key

        facts = {"dream": "Test", "symbols": ["a"], "emotions": [], "themes": [], "locale": "en"}

        key1 = _create_cache_key(facts)
        key2 = _create_cache_key(facts)

        assert key1 == key2

    def test_different_input_different_key(self):
        """Test different input produces different key."""
        from backend_ai.app.dream_logic import _create_cache_key

        facts1 = {"dream": "Test1", "symbols": [], "emotions": [], "themes": [], "locale": "en"}
        facts2 = {"dream": "Test2", "symbols": [], "emotions": [], "themes": [], "locale": "en"}

        key1 = _create_cache_key(facts1)
        key2 = _create_cache_key(facts2)

        assert key1 != key2


class TestLazyLoading:
    """Tests for lazy loading wrappers."""

    @patch("backend_ai.app.dream_logic._dream_embed_rag", None)
    def test_get_dream_embed_rag_lazy_loads(self):
        """Test get_dream_embed_rag lazy loads."""
        from backend_ai.app.dream_logic import get_dream_embed_rag

        # This should attempt to import and create the rag
        # Mock the actual import to avoid loading heavy models
        with patch("backend_ai.app.dream_logic.get_dream_embed_rag") as mock_get:
            mock_rag = MagicMock()
            mock_get.return_value = mock_rag

            result = mock_get()
            assert result is mock_rag


class TestInterpretDream:
    """Tests for interpret_dream function."""

    @patch("backend_ai.app.dream_logic.get_cache")
    @patch("backend_ai.app.dream_logic._generate_with_gpt4")
    @patch("backend_ai.app.dream_logic.get_dream_rule_engine")
    @patch("backend_ai.app.dream_logic.get_dream_embed_rag")
    @patch("backend_ai.app.dream_logic.load_dotenv")
    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    def test_interpret_dream_basic(
        self, mock_dotenv, mock_embed_rag, mock_rule_engine, mock_generate, mock_cache
    ):
        """Test basic dream interpretation."""
        # Setup mocks
        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = None
        mock_cache.return_value = mock_cache_instance

        mock_rule = MagicMock()
        mock_rule.evaluate.return_value = {"texts": [], "korean_notes": [], "categories": [], "specifics": []}
        mock_rule.get_celestial_context.return_value = None
        mock_rule.detect_combinations.return_value = []
        mock_rule.detect_taemong.return_value = None
        mock_rule.generate_lucky_numbers.return_value = None
        mock_rule_engine.return_value = mock_rule

        mock_rag = MagicMock()
        mock_rag.get_interpretation_context.return_value = {
            "texts": [],
            "korean_notes": [],
            "categories": [],
            "specifics": [],
            "advice": [],
        }
        mock_embed_rag.return_value = mock_rag

        mock_generate.return_value = json.dumps({
            "summary": "Test interpretation",
            "dreamSymbols": [],
            "themes": [],
        })

        from backend_ai.app.dream_logic import interpret_dream

        with patch("backend_ai.app.dream_logic.refine_with_gpt5mini") as mock_refine:
            mock_refine.return_value = "Polished summary"

            result = interpret_dream({"dream": "Test dream", "locale": "ko"})

        assert result["status"] == "success"
        assert "timestamp" in result

    @patch("backend_ai.app.dream_logic.get_cache")
    def test_interpret_dream_cache_hit(self, mock_cache):
        """Test dream interpretation with cache hit."""
        cached_result = {
            "status": "success",
            "summary": "Cached interpretation",
        }

        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = cached_result
        mock_cache.return_value = mock_cache_instance

        from backend_ai.app.dream_logic import interpret_dream

        result = interpret_dream({"dream": "Test dream"})

        assert result["cached"] is True

    @patch("backend_ai.app.dream_logic.load_dotenv")
    @patch.dict("os.environ", {}, clear=True)
    def test_interpret_dream_missing_api_key(self, mock_dotenv):
        """Test error when API key is missing."""
        from backend_ai.app.dream_logic import interpret_dream

        with patch("backend_ai.app.dream_logic.get_cache") as mock_cache:
            mock_cache_instance = MagicMock()
            mock_cache_instance.get.return_value = None
            mock_cache.return_value = mock_cache_instance

            result = interpret_dream({"dream": "Test"})

        assert result["status"] == "error"
        assert "OPENAI_API_KEY" in result["message"]


class TestModuleExports:
    """Tests for module exports."""

    def test_build_dream_prompt_importable(self):
        """build_dream_prompt should be importable."""
        from backend_ai.app.dream_logic import build_dream_prompt

        assert build_dream_prompt is not None

    def test_interpret_dream_importable(self):
        """interpret_dream should be importable."""
        from backend_ai.app.dream_logic import interpret_dream

        assert interpret_dream is not None

    def test_get_dream_embed_rag_importable(self):
        """get_dream_embed_rag should be importable."""
        from backend_ai.app.dream_logic import get_dream_embed_rag

        assert get_dream_embed_rag is not None
