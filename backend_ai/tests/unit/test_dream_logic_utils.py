"""
Unit tests for Dream Logic utils module.

Tests:
- merge_unique: 리스트 병합
- get_fallback_interpretations: 기본 해석 가이드라인
- create_cache_key: 캐시 키 생성
- build_system_instruction: 시스템 프롬프트 생성
- parse_json_response: JSON 응답 파싱
"""
import pytest
from unittest.mock import patch, MagicMock
import json


class TestMergeUnique:
    """Tests for merge_unique function."""

    def test_merge_unique_basic(self):
        """Should merge two lists preserving order."""
        from backend_ai.app.dream_logic.utils import merge_unique

        list1 = ['apple', 'banana']
        list2 = ['cherry', 'date']

        result = merge_unique(list1, list2)

        assert result == ['apple', 'banana', 'cherry', 'date']

    def test_merge_unique_removes_duplicates(self):
        """Should remove exact duplicates."""
        from backend_ai.app.dream_logic.utils import merge_unique

        list1 = ['apple', 'banana']
        list2 = ['banana', 'cherry']

        result = merge_unique(list1, list2)

        assert 'banana' in result
        assert result.count('banana') == 1

    def test_merge_unique_preserves_order(self):
        """Should preserve order from list1 first."""
        from backend_ai.app.dream_logic.utils import merge_unique

        list1 = ['first', 'second']
        list2 = ['third', 'fourth']

        result = merge_unique(list1, list2)

        assert result.index('first') < result.index('third')

    def test_merge_unique_empty_lists(self):
        """Should handle empty lists."""
        from backend_ai.app.dream_logic.utils import merge_unique

        result = merge_unique([], [])

        assert result == []

    def test_merge_unique_one_empty(self):
        """Should handle one empty list."""
        from backend_ai.app.dream_logic.utils import merge_unique

        result1 = merge_unique(['apple'], [])
        result2 = merge_unique([], ['banana'])

        assert result1 == ['apple']
        assert result2 == ['banana']


class TestGetFallbackInterpretations:
    """Tests for get_fallback_interpretations function."""

    def test_fallback_basic(self):
        """Should return base interpretations."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("some dream text", "ko")

        assert isinstance(result, list)
        assert len(result) > 0

    def test_fallback_fear_emotion(self):
        """Should include fear-related interpretation for scary dreams."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        # Use keyword that matches the detection: '무섭', '두렵', 'scary', 'fear', 'afraid', '공포'
        result = get_fallback_interpretations("무섭고 두려운 꿈을 꾸었어요", "ko")

        assert any("두려움" in text or "공포" in text for text in result)

    def test_fallback_happy_emotion(self):
        """Should include happy-related interpretation for joyful dreams."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("happy dream about joy", "en")

        assert any("긍정" in text or "만족" in text for text in result)

    def test_fallback_sad_emotion(self):
        """Should include sad-related interpretation for sad dreams."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("슬프고 눈물이 나는 꿈", "ko")

        assert any("슬픔" in text or "상실" in text for text in result)

    def test_fallback_house_situation(self):
        """Should include house-related interpretation for house dreams."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("집에서 꿈을 꾸었어요", "ko")

        assert any("집" in text for text in result)

    def test_fallback_people_situation(self):
        """Should include people-related interpretation for social dreams."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("친구와 가족이 나오는 꿈", "ko")

        assert any("사람" in text for text in result)

    def test_fallback_korean_base(self):
        """Should include Korean traditional interpretations."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations

        result = get_fallback_interpretations("평범한 꿈", "ko")

        assert any("해몽" in text for text in result)


class TestCreateCacheKey:
    """Tests for create_cache_key function."""

    def test_cache_key_basic(self):
        """Should create a cache key."""
        from backend_ai.app.dream_logic.utils import create_cache_key

        facts = {
            "dream": "I dreamed about a snake",
            "symbols": ["snake"],
            "emotions": ["fear"],
            "themes": ["transformation"],
            "locale": "ko"
        }

        result = create_cache_key(facts)

        assert result.startswith("dream:")
        assert len(result) > 10

    def test_cache_key_deterministic(self):
        """Same input should produce same cache key."""
        from backend_ai.app.dream_logic.utils import create_cache_key

        facts = {
            "dream": "test dream",
            "symbols": ["symbol1"],
            "emotions": [],
            "themes": [],
            "locale": "en"
        }

        key1 = create_cache_key(facts)
        key2 = create_cache_key(facts)

        assert key1 == key2

    def test_cache_key_different_for_different_input(self):
        """Different input should produce different cache key."""
        from backend_ai.app.dream_logic.utils import create_cache_key

        facts1 = {"dream": "dream 1", "symbols": [], "emotions": [], "themes": [], "locale": "ko"}
        facts2 = {"dream": "dream 2", "symbols": [], "emotions": [], "themes": [], "locale": "ko"}

        key1 = create_cache_key(facts1)
        key2 = create_cache_key(facts2)

        assert key1 != key2

    def test_cache_key_sorts_symbols(self):
        """Symbol order should not affect cache key."""
        from backend_ai.app.dream_logic.utils import create_cache_key

        facts1 = {"dream": "test", "symbols": ["a", "b"], "emotions": [], "themes": [], "locale": "en"}
        facts2 = {"dream": "test", "symbols": ["b", "a"], "emotions": [], "themes": [], "locale": "en"}

        key1 = create_cache_key(facts1)
        key2 = create_cache_key(facts2)

        assert key1 == key2

    def test_cache_key_empty_facts(self):
        """Should handle empty facts."""
        from backend_ai.app.dream_logic.utils import create_cache_key

        facts = {}
        result = create_cache_key(facts)

        assert result.startswith("dream:")


class TestBuildSystemInstruction:
    """Tests for build_system_instruction function."""

    def test_system_instruction_not_empty(self):
        """Should return non-empty instruction."""
        from backend_ai.app.dream_logic.utils import build_system_instruction

        result = build_system_instruction()

        assert isinstance(result, str)
        assert len(result) > 100

    def test_system_instruction_contains_json(self):
        """Should mention JSON format."""
        from backend_ai.app.dream_logic.utils import build_system_instruction

        result = build_system_instruction()

        assert "JSON" in result

    def test_system_instruction_contains_guidelines(self):
        """Should contain interpretation guidelines."""
        from backend_ai.app.dream_logic.utils import build_system_instruction

        result = build_system_instruction()

        assert "꿈" in result or "dream" in result.lower()


class TestParseJsonResponse:
    """Tests for parse_json_response function."""

    def test_parse_json_basic(self):
        """Should parse basic JSON."""
        from backend_ai.app.dream_logic.utils import parse_json_response

        response = '{"summary": "test summary", "themes": []}'
        result = parse_json_response(response)

        assert result["summary"] == "test summary"
        assert result["themes"] == []

    def test_parse_json_markdown_code_block(self):
        """Should extract JSON from markdown code block."""
        from backend_ai.app.dream_logic.utils import parse_json_response

        response = '```json\n{"summary": "test"}\n```'
        result = parse_json_response(response)

        assert result["summary"] == "test"

    def test_parse_json_plain_code_block(self):
        """Should extract JSON from plain code block."""
        from backend_ai.app.dream_logic.utils import parse_json_response

        response = '```\n{"summary": "test"}\n```'
        result = parse_json_response(response)

        assert result["summary"] == "test"

    def test_parse_json_invalid_returns_fallback(self):
        """Should return fallback for invalid JSON."""
        from backend_ai.app.dream_logic.utils import parse_json_response

        response = "This is not valid JSON at all"
        result = parse_json_response(response)

        assert "summary" in result
        assert "raw_response" in result

    def test_parse_json_complex(self):
        """Should parse complex JSON structure."""
        from backend_ai.app.dream_logic.utils import parse_json_response

        response = json.dumps({
            "summary": "Complex dream interpretation",
            "dreamSymbols": [{"name": "snake", "meaning": "transformation"}],
            "themes": ["growth", "change"],
            "luckyElements": {"numbers": [3, 7]}
        })
        result = parse_json_response(response)

        assert result["summary"] == "Complex dream interpretation"
        assert len(result["dreamSymbols"]) == 1
        assert len(result["themes"]) == 2


class TestModuleExports:
    """Tests for module exports."""

    def test_merge_unique_importable(self):
        """merge_unique should be importable."""
        from backend_ai.app.dream_logic.utils import merge_unique
        assert callable(merge_unique)

    def test_get_fallback_interpretations_importable(self):
        """get_fallback_interpretations should be importable."""
        from backend_ai.app.dream_logic.utils import get_fallback_interpretations
        assert callable(get_fallback_interpretations)

    def test_create_cache_key_importable(self):
        """create_cache_key should be importable."""
        from backend_ai.app.dream_logic.utils import create_cache_key
        assert callable(create_cache_key)

    def test_build_system_instruction_importable(self):
        """build_system_instruction should be importable."""
        from backend_ai.app.dream_logic.utils import build_system_instruction
        assert callable(build_system_instruction)

    def test_parse_json_response_importable(self):
        """parse_json_response should be importable."""
        from backend_ai.app.dream_logic.utils import parse_json_response
        assert callable(parse_json_response)
