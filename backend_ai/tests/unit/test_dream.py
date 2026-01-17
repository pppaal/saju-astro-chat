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
    """Tests for DreamRuleEngine class."""

    @pytest.fixture
    def mock_rules_dir(self, tmp_path):
        """Create temporary rules directory with mock data."""
        rules_dir = tmp_path / "data" / "graph" / "rules" / "dream"
        rules_dir.mkdir(parents=True)

        # Create mock rules file
        import json
        mock_rules = {
            "flying": {
                "when": ["flying", "sky", "날다"],
                "text": "Flying dreams symbolize freedom and aspiration",
                "korean": "하늘을 나는 꿈은 자유와 열망을 상징합니다",
                "category": "aspiration",
                "weight": 2
            },
            "water": {
                "when": ["water", "ocean", "물"],
                "text": "Water in dreams represents emotions and the unconscious",
                "korean": "물은 감정과 무의식을 상징합니다",
                "category": "emotion",
                "weight": 1
            }
        }
        (rules_dir / "test_rules.json").write_text(json.dumps(mock_rules, ensure_ascii=False))

        # Create mock advanced data
        advanced_data = {
            "symbol_combinations": {
                "combinations": {
                    "뱀+물": {
                        "meaning": "재물운",
                        "interpretation": "뱀과 물이 함께 나타나면 재물운이 있습니다",
                        "fortune_type": "wealth",
                        "is_lucky": True,
                        "lucky_score": 80
                    }
                }
            },
            "taemong": {
                "symbols": {
                    "용": {
                        "child_trait": "리더십",
                        "gender_hint": "남아",
                        "interpretation": "큰 인물이 될 것을 암시",
                        "lucky_score": 95
                    }
                }
            },
            "lucky_numbers": {
                "symbol_mappings": {
                    "용": {"primary": [1, 7], "secondary": [8, 9], "element": "wood"},
                    "뱀": {"primary": [3, 6], "secondary": [12, 18], "element": "fire"}
                }
            }
        }
        (rules_dir / "dream_symbols_advanced.json").write_text(json.dumps(advanced_data, ensure_ascii=False))

        return rules_dir

    def test_rule_engine_instantiation(self):
        """Test DreamRuleEngine instantiation."""
        from app.dream_logic import DreamRuleEngine

        # Will use actual rules dir if exists, or empty dict otherwise
        engine = DreamRuleEngine()
        assert engine is not None
        assert isinstance(engine.rules, dict)

    def test_get_dream_rule_engine_singleton(self):
        """Test singleton pattern for rule engine."""
        from app.dream_logic import get_dream_rule_engine

        engine1 = get_dream_rule_engine()
        engine2 = get_dream_rule_engine()
        assert engine1 is engine2

    def test_evaluate_returns_dict(self):
        """Test evaluate method returns proper structure."""
        from app.dream_logic import get_dream_rule_engine

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

    def test_detect_combinations(self):
        """Test symbol combination detection."""
        from app.dream_logic import get_dream_rule_engine

        engine = get_dream_rule_engine()

        # Test with symbols that may have combinations
        detected = engine.detect_combinations(
            dream_text="꿈에서 뱀이 물속을 헤엄치는 것을 봤다",
            symbols=["뱀", "물"]
        )

        assert isinstance(detected, list)
        # Results depend on loaded data

    def test_detect_taemong(self):
        """Test taemong (conception dream) detection."""
        from app.dream_logic import get_dream_rule_engine

        engine = get_dream_rule_engine()

        # Test with taemong context
        result = engine.detect_taemong(
            dream_text="임신 중에 용꿈을 꿨습니다",
            symbols=["용"],
            themes=["태몽"]
        )

        # Result may be None if no taemong data loaded
        if result is not None:
            assert "is_taemong" in result or "symbols" in result

    def test_generate_lucky_numbers(self):
        """Test lucky number generation."""
        from app.dream_logic import get_dream_rule_engine

        engine = get_dream_rule_engine()

        result = engine.generate_lucky_numbers(
            dream_text="용이 하늘로 올라가는 꿈",
            symbols=["용", "하늘"]
        )

        # Result may be None if no lucky number data loaded
        if result is not None:
            assert "numbers" in result
            assert isinstance(result["numbers"], list)


class TestDreamHelperFunctions:
    """Tests for dream helper functions."""

    def test_merge_unique(self):
        """Test list merging with deduplication."""
        from app.dream_logic import _merge_unique

        list1 = ["a", "b", "c"]
        list2 = ["c", "d", "e"]

        result = _merge_unique(list1, list2)

        assert "a" in result
        assert "b" in result
        assert "c" in result
        assert "d" in result
        assert "e" in result
        # c should not be duplicated
        assert result.count("c") == 1

    def test_get_fallback_interpretations(self):
        """Test fallback interpretations when no rules match."""
        from app.dream_logic import _get_fallback_interpretations

        result = _get_fallback_interpretations(
            dream_text="무서운 꿈을 꿨어요",
            locale="ko"
        )

        assert isinstance(result, list)
        assert len(result) > 0

    def test_get_fallback_interpretations_with_emotions(self):
        """Test fallback interpretations detect emotion keywords."""
        from app.dream_logic import _get_fallback_interpretations

        # Test with fear keywords (using English which is always matched correctly)
        result_fear = _get_fallback_interpretations("scary dream", "ko")
        # With emotion keyword matched, result should have 6 items (3 base + 1 emotion + 2 korean)
        # Without emotion, it would be 5 items (3 base + 2 korean)
        assert len(result_fear) == 6, f"Expected 6 items with emotion hint, got {len(result_fear)}"

        # Test with joy keywords (using English)
        result_joy = _get_fallback_interpretations("happy dream", "ko")
        # With emotion keyword matched, result should have 6 items
        assert len(result_joy) == 6, f"Expected 6 items with emotion hint, got {len(result_joy)}"

        # Test without emotion keywords - should have 5 items
        result_neutral = _get_fallback_interpretations("strange dream", "ko")
        assert len(result_neutral) == 5, f"Expected 5 items without emotion hint, got {len(result_neutral)}"

    def test_create_cache_key(self):
        """Test cache key creation."""
        from app.dream_logic import _create_cache_key

        facts = {
            "dream": "test dream",
            "symbols": ["a", "b"],
            "emotions": ["happy"],
            "themes": [],
            "locale": "ko"
        }

        key = _create_cache_key(facts)

        assert key.startswith("dream:")
        assert len(key) > 10

    def test_create_cache_key_deterministic(self):
        """Test cache key is deterministic for same input."""
        from app.dream_logic import _create_cache_key

        facts = {
            "dream": "test dream",
            "symbols": ["a", "b"],
            "emotions": ["happy"],
            "themes": [],
            "locale": "ko"
        }

        key1 = _create_cache_key(facts)
        key2 = _create_cache_key(facts)

        assert key1 == key2


class TestInterpretDreamFunction:
    """Tests for the main interpret_dream function."""

    @patch("app.dream_logic.get_cache")
    @patch("app.dream_logic._generate_with_gpt4")
    @patch("app.dream_logic.refine_with_gpt5mini")
    @patch("app.dream_logic.get_dream_embed_rag")
    def test_interpret_dream_returns_dict(
        self,
        mock_embed_rag,
        mock_refine,
        mock_generate,
        mock_cache
    ):
        """Test interpret_dream returns proper structure."""
        from app.dream_logic import interpret_dream

        # Setup mocks
        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = None
        mock_cache.return_value = mock_cache_instance

        mock_embed_rag_instance = MagicMock()
        mock_embed_rag_instance.get_interpretation_context.return_value = {
            "texts": [], "korean_notes": [], "categories": [], "specifics": [], "advice": []
        }
        mock_embed_rag.return_value = mock_embed_rag_instance

        mock_generate.return_value = '{"summary": "Test summary", "dreamSymbols": [], "themes": []}'
        mock_refine.return_value = "Polished summary"

        # Set environment variable
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = interpret_dream({
                "dream": "Test dream",
                "symbols": [],
                "emotions": [],
                "themes": [],
                "locale": "ko"
            })

        assert isinstance(result, dict)
        assert "status" in result

    @patch("app.dream_logic.get_cache")
    def test_interpret_dream_cache_hit(self, mock_cache):
        """Test interpret_dream returns cached result."""
        from app.dream_logic import interpret_dream

        cached_result = {
            "status": "success",
            "summary": "Cached summary"
        }

        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = cached_result
        mock_cache.return_value = mock_cache_instance

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = interpret_dream({
                "dream": "Test dream",
                "symbols": [],
                "emotions": [],
                "themes": [],
                "locale": "ko"
            })

        assert result.get("cached") is True

    def test_interpret_dream_missing_api_key(self):
        """Test interpret_dream handles missing API key."""
        from app.dream_logic import interpret_dream

        with patch.dict("os.environ", {}, clear=True):
            with patch("app.dream_logic.get_cache") as mock_cache:
                mock_cache_instance = MagicMock()
                mock_cache_instance.get.return_value = None
                mock_cache.return_value = mock_cache_instance

                result = interpret_dream({
                    "dream": "Test dream",
                    "symbols": [],
                    "locale": "ko"
                })

        # May return error or success with fallback depending on implementation
        assert isinstance(result, dict)


class TestDreamModuleExports:
    """Tests for dream module exports."""

    def test_build_dream_prompt_importable(self):
        """build_dream_prompt should be importable."""
        from app.dream_logic import build_dream_prompt
        assert callable(build_dream_prompt)

    def test_dream_rule_engine_importable(self):
        """DreamRuleEngine should be importable."""
        from app.dream_logic import DreamRuleEngine
        assert DreamRuleEngine is not None

    def test_get_dream_rule_engine_importable(self):
        """get_dream_rule_engine should be importable."""
        from app.dream_logic import get_dream_rule_engine
        assert callable(get_dream_rule_engine)

    def test_interpret_dream_importable(self):
        """interpret_dream should be importable."""
        from app.dream_logic import interpret_dream
        assert callable(interpret_dream)