"""
Unit tests for backend_ai/app/fusion_logic.py

Tests:
- Token counting utilities
- Constants and mappings
- naturalize_facts function
- Element traits and ten gods meanings
- Prepare request helper
- Template mode handling
"""
import pytest
from unittest.mock import patch, MagicMock


class TestTokenCounting:
    """Tests for token counting utility."""

    def test_count_tokens_basic(self):
        """Should count tokens for simple text."""
        from backend_ai.app.fusion_logic import _count_tokens

        result = _count_tokens("Hello world")
        assert result >= 1

    def test_count_tokens_korean(self):
        """Should handle Korean text."""
        from backend_ai.app.fusion_logic import _count_tokens

        result = _count_tokens("안녕하세요 세계")
        assert result >= 1

    def test_count_tokens_empty(self):
        """Should return 0 or positive for empty text."""
        from backend_ai.app.fusion_logic import _count_tokens

        result = _count_tokens("")
        assert result >= 0


class TestElementTraits:
    """Tests for ELEMENT_TRAITS mapping."""

    def test_english_elements(self):
        """Should have all English element keys."""
        from backend_ai.app.fusion_logic import ELEMENT_TRAITS

        for elem in ["wood", "fire", "earth", "metal", "water"]:
            assert elem in ELEMENT_TRAITS
            assert "name" in ELEMENT_TRAITS[elem]
            assert "traits" in ELEMENT_TRAITS[elem]

    def test_korean_elements(self):
        """Should have Korean element keys."""
        from backend_ai.app.fusion_logic import ELEMENT_TRAITS

        for elem in ["목", "화", "토", "금", "수"]:
            assert elem in ELEMENT_TRAITS

    def test_element_has_organ(self):
        """Each element should have organ mapping."""
        from backend_ai.app.fusion_logic import ELEMENT_TRAITS

        for elem in ["wood", "fire", "earth", "metal", "water"]:
            assert "organ" in ELEMENT_TRAITS[elem]


class TestTenGodsMeaning:
    """Tests for TEN_GODS_MEANING mapping."""

    def test_all_ten_gods_defined(self):
        """All 10 sibsin should be defined."""
        from backend_ai.app.fusion_logic import TEN_GODS_MEANING

        expected = [
            "비견", "겁재", "식신", "상관",
            "편재", "정재", "편관", "정관",
            "편인", "정인"
        ]
        for god in expected:
            assert god in TEN_GODS_MEANING

    def test_meanings_are_strings(self):
        """Each meaning should be a non-empty string."""
        from backend_ai.app.fusion_logic import TEN_GODS_MEANING

        for god, meaning in TEN_GODS_MEANING.items():
            assert isinstance(meaning, str)
            assert len(meaning) > 0


class TestAspectMeanings:
    """Tests for ASPECT_MEANINGS mapping."""

    def test_major_aspects_defined(self):
        """Major aspects should be defined."""
        from backend_ai.app.fusion_logic import ASPECT_MEANINGS

        major = ["conjunction", "opposition", "trine", "square", "sextile"]
        for aspect in major:
            assert aspect in ASPECT_MEANINGS


class TestNaturalizeFacts:
    """Tests for naturalize_facts function."""

    def test_empty_inputs(self):
        """Should handle empty inputs."""
        from backend_ai.app.fusion_logic import naturalize_facts

        saju_text, astro_text, tarot_text = naturalize_facts({}, {}, {})

        assert saju_text == "No saju facts."
        assert astro_text == "No astrology facts."
        assert tarot_text == "No tarot facts."

    def test_with_pillars(self):
        """Should format pillar data."""
        from backend_ai.app.fusion_logic import naturalize_facts

        saju = {
            "pillars": {
                "year": "甲子",
                "month": "乙丑",
                "day": "丙寅",
                "time": "丁卯"
            }
        }
        saju_text, _, _ = naturalize_facts(saju, {}, {})

        assert "연주" in saju_text or "Year Pillar" in saju_text
        assert "甲子" in saju_text

    def test_with_day_master(self):
        """Should format day master data."""
        from backend_ai.app.fusion_logic import naturalize_facts

        saju = {
            "dayMaster": {
                "name": "甲",
                "element": "wood",
                "strength": "strong"
            }
        }
        saju_text, _, _ = naturalize_facts(saju, {}, {})

        assert "Day Master" in saju_text or "일간" in saju_text
        assert "甲" in saju_text

    def test_with_five_elements(self):
        """Should format five elements balance."""
        from backend_ai.app.fusion_logic import naturalize_facts

        saju = {
            "facts": {
                "fiveElements": {
                    "wood": 2,
                    "fire": 3,
                    "earth": 1,
                    "metal": 1,
                    "water": 1
                }
            }
        }
        saju_text, _, _ = naturalize_facts(saju, {}, {})

        assert "오행" in saju_text or "Five Elements" in saju_text

    def test_with_planets(self):
        """Should format planet data."""
        from backend_ai.app.fusion_logic import naturalize_facts

        astro = {
            "planets": [
                {"name": "Sun", "sign": "Aries", "house": 1, "degree": 15}
            ]
        }
        _, astro_text, _ = naturalize_facts({}, astro, {})

        assert "Sun" in astro_text
        assert "Aries" in astro_text

    def test_with_ascendant(self):
        """Should format ascendant data."""
        from backend_ai.app.fusion_logic import naturalize_facts

        astro = {
            "ascendant": {"sign": "Leo"}
        }
        _, astro_text, _ = naturalize_facts({}, astro, {})

        assert "Ascendant" in astro_text or "ASC" in astro_text
        assert "Leo" in astro_text

    def test_with_tarot_cards(self):
        """Should format tarot cards."""
        from backend_ai.app.fusion_logic import naturalize_facts

        tarot = {
            "category": "love",
            "drawnCards": [
                {"name": "The Fool", "isReversed": False}
            ]
        }
        _, _, tarot_text = naturalize_facts({}, {}, tarot)

        assert "love" in tarot_text or "Fool" in tarot_text


class TestPrepareRequest:
    """Tests for _prepare_request helper."""

    def test_default_values(self):
        """Should return default values for empty facts."""
        from backend_ai.app.fusion_logic import _prepare_request

        ctx = _prepare_request({})

        # Check default values (mode depends on whether OPENAI_API_KEY is set)
        assert ctx["render_mode"] in ["template", "gpt"]
        assert ctx["locale"] == "en"
        assert ctx["theme"] == "life_path"

    def test_locale_extraction(self):
        """Should extract locale from facts."""
        from backend_ai.app.fusion_logic import _prepare_request

        ctx = _prepare_request({"locale": "ko"})
        assert ctx["locale"] == "ko"

    def test_theme_extraction(self):
        """Should extract theme from facts."""
        from backend_ai.app.fusion_logic import _prepare_request

        ctx = _prepare_request({"theme": "career"})
        assert ctx["theme"] == "career"

    def test_prompt_sanitization(self):
        """Should sanitize user prompt."""
        from backend_ai.app.fusion_logic import _prepare_request

        ctx = _prepare_request({"prompt": "Tell me about my fortune"})
        assert ctx["user_prompt"] is not None


class TestConstants:
    """Tests for module constants."""

    def test_cache_version_defined(self):
        """Cache version should be defined."""
        from backend_ai.app.fusion_logic import _CACHE_VERSION

        assert _CACHE_VERSION is not None
        assert isinstance(_CACHE_VERSION, str)

    def test_parallel_max_workers(self):
        """Parallel workers should be positive."""
        from backend_ai.app.fusion_logic import _PARALLEL_MAX_WORKERS

        assert _PARALLEL_MAX_WORKERS > 0

    def test_parallel_task_timeout(self):
        """Task timeout should be positive."""
        from backend_ai.app.fusion_logic import _PARALLEL_TASK_TIMEOUT

        assert _PARALLEL_TASK_TIMEOUT > 0

    def test_max_structured_prompt_length(self):
        """Prompt length limit should be defined."""
        from backend_ai.app.fusion_logic import _MAX_STRUCTURED_PROMPT_LENGTH

        assert _MAX_STRUCTURED_PROMPT_LENGTH > 0


class TestCycleLabels:
    """Tests for luck cycle labels."""

    def test_cycle_labels_defined(self):
        """Should define all cycle labels."""
        from backend_ai.app.fusion_logic import _CYCLE_LABELS

        expected = ["daeun", "annual", "monthly", "iljin"]
        for key in expected:
            assert key in _CYCLE_LABELS
            label, desc = _CYCLE_LABELS[key]
            assert isinstance(label, str)
            assert isinstance(desc, str)


class TestThemeQueries:
    """Tests for theme query mappings."""

    def test_theme_queries_defined(self):
        """Should define queries for major themes."""
        from backend_ai.app.fusion_logic import _THEME_QUERIES

        themes = ["love", "career", "life_path", "health"]
        for theme in themes:
            assert theme in _THEME_QUERIES


class TestLazyLoaders:
    """Tests for lazy loading functions."""

    def test_get_graph_rag_returns_function(self):
        """get_graph_rag should be callable."""
        from backend_ai.app.fusion_logic import get_graph_rag

        assert callable(get_graph_rag)

    def test_get_corpus_rag_returns_function(self):
        """get_corpus_rag should be callable."""
        from backend_ai.app.fusion_logic import get_corpus_rag

        assert callable(get_corpus_rag)

    def test_get_llm_returns_function(self):
        """get_llm should be callable."""
        from backend_ai.app.fusion_logic import get_llm

        assert callable(get_llm)


class TestParallelHelpers:
    """Tests for parallel processing helpers."""

    def test_parallel_jung_quotes_callable(self):
        """_parallel_jung_quotes should be callable."""
        from backend_ai.app.fusion_logic import _parallel_jung_quotes

        assert callable(_parallel_jung_quotes)

    def test_parallel_user_memory_callable(self):
        """_parallel_user_memory should be callable."""
        from backend_ai.app.fusion_logic import _parallel_user_memory

        assert callable(_parallel_user_memory)

    def test_parallel_rlhf_fewshot_callable(self):
        """_parallel_rlhf_fewshot should be callable."""
        from backend_ai.app.fusion_logic import _parallel_rlhf_fewshot

        assert callable(_parallel_rlhf_fewshot)


class TestInterpretWithAI:
    """Tests for main interpret_with_ai function."""

    def test_interpret_with_ai_callable(self):
        """interpret_with_ai should be callable."""
        from backend_ai.app.fusion_logic import interpret_with_ai

        assert callable(interpret_with_ai)

    def test_interpret_with_ai_returns_dict(self):
        """Should return dict on empty input."""
        from backend_ai.app.fusion_logic import interpret_with_ai

        with patch.dict('os.environ', {}, clear=True):
            result = interpret_with_ai({})

        assert isinstance(result, dict)
        assert "status" in result

    def test_template_mode_result(self):
        """Template mode should return success."""
        from backend_ai.app.fusion_logic import interpret_with_ai

        with patch.dict('os.environ', {}, clear=True):
            result = interpret_with_ai({"render_mode": "template"})

        assert result.get("status") == "success"
        assert result.get("render_mode") == "template"


class TestModuleExports:
    """Tests for module exports."""

    def test_interpret_with_ai_importable(self):
        """interpret_with_ai should be importable."""
        from backend_ai.app.fusion_logic import interpret_with_ai
        assert callable(interpret_with_ai)

    def test_naturalize_facts_importable(self):
        """naturalize_facts should be importable."""
        from backend_ai.app.fusion_logic import naturalize_facts
        assert callable(naturalize_facts)

    def test_element_traits_importable(self):
        """ELEMENT_TRAITS should be importable."""
        from backend_ai.app.fusion_logic import ELEMENT_TRAITS
        assert isinstance(ELEMENT_TRAITS, dict)

    def test_ten_gods_meaning_importable(self):
        """TEN_GODS_MEANING should be importable."""
        from backend_ai.app.fusion_logic import TEN_GODS_MEANING
        assert isinstance(TEN_GODS_MEANING, dict)

    def test_aspect_meanings_importable(self):
        """ASPECT_MEANINGS should be importable."""
        from backend_ai.app.fusion_logic import ASPECT_MEANINGS
        assert isinstance(ASPECT_MEANINGS, dict)

