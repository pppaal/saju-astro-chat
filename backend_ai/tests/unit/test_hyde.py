# tests/unit/test_hyde.py
"""
HyDE (Hypothetical Document Embeddings) 유닛 테스트 (Phase 7b).

LLM 없이 로컬 키워드 확장 로직만 테스트.
"""

import pytest

from app.rag.hyde import (
    HyDEGenerator,
    HYDE_PROMPTS,
    USE_HYDE,
    get_hyde_generator,
)


# ─── 프롬프트 설정 테스트 ──────────────────────

class TestHyDEPrompts:
    """HyDE 프롬프트 설정 테스트."""

    def test_saju_prompt_exists(self):
        assert "saju" in HYDE_PROMPTS
        assert "{query}" in HYDE_PROMPTS["saju"]

    def test_astro_prompt_exists(self):
        assert "astro" in HYDE_PROMPTS
        assert "{query}" in HYDE_PROMPTS["astro"]

    def test_tarot_prompt_exists(self):
        assert "tarot" in HYDE_PROMPTS
        assert "{query}" in HYDE_PROMPTS["tarot"]

    def test_default_prompt_exists(self):
        assert "default" in HYDE_PROMPTS
        assert "{query}" in HYDE_PROMPTS["default"]

    def test_all_prompts_formattable(self):
        """모든 프롬프트가 format 가능."""
        for key, prompt in HYDE_PROMPTS.items():
            result = prompt.format(query="테스트 쿼리")
            assert "테스트 쿼리" in result


# ─── 로컬 확장 테스트 ─────────────────────────

class TestLocalExpansion:
    """LLM 없이 로컬 키워드 확장 테스트."""

    @pytest.fixture
    def generator(self):
        return HyDEGenerator(use_llm=False)

    def test_basic_expansion(self, generator):
        """기본 쿼리 확장."""
        result = generator.generate_hypothesis(
            query="갑목 일간의 성격은?",
            domain="saju",
        )
        assert "갑목 일간의 성격은?" in result
        assert "사주" in result
        assert "오행" in result

    def test_astro_expansion(self, generator):
        """점성술 도메인 확장."""
        result = generator.generate_hypothesis(
            query="Jupiter in Sagittarius",
            domain="astro",
        )
        assert "Jupiter in Sagittarius" in result
        assert "planet" in result

    def test_tarot_expansion(self, generator):
        """타로 도메인 확장."""
        result = generator.generate_hypothesis(
            query="The Tower 카드",
            domain="tarot",
        )
        assert "The Tower" in result
        assert "tarot" in result

    def test_default_domain(self, generator):
        """기본 도메인 확장."""
        result = generator.generate_hypothesis(
            query="오늘 운세",
            domain="default",
        )
        assert "오늘 운세" in result
        assert "사주" in result or "점성술" in result

    def test_unknown_domain_falls_back(self, generator):
        """알 수 없는 도메인은 default로 fallback."""
        result = generator.generate_hypothesis(
            query="test query",
            domain="unknown_domain",
        )
        assert "test query" in result

    def test_with_facts_daymaster(self, generator):
        """facts의 dayMaster 포함."""
        result = generator.generate_hypothesis(
            query="나의 성격은?",
            domain="saju",
            facts={"dayMaster": "갑목"},
        )
        assert "갑목" in result

    def test_with_facts_sunSign(self, generator):
        """facts의 sunSign 포함."""
        result = generator.generate_hypothesis(
            query="my personality?",
            domain="astro",
            facts={"sunSign": "Aries"},
        )
        assert "Aries" in result

    def test_with_multiple_facts(self, generator):
        """여러 facts 포함."""
        result = generator.generate_hypothesis(
            query="cross analysis",
            domain="default",
            facts={
                "dayMaster": "갑목",
                "sunSign": "Sagittarius",
                "moonSign": "Cancer",
            },
        )
        assert "갑목" in result
        assert "Sagittarius" in result
        assert "Cancer" in result

    def test_with_empty_facts(self, generator):
        """빈 facts."""
        result = generator.generate_hypothesis(
            query="test",
            domain="saju",
            facts={},
        )
        assert "test" in result

    def test_with_none_facts_values(self, generator):
        """None 값 facts 무시."""
        result = generator.generate_hypothesis(
            query="test",
            domain="saju",
            facts={"dayMaster": None, "sunSign": "Aries"},
        )
        assert "Aries" in result


# ─── Query Expand 테스트 ─────────────────────

class TestQueryExpand:
    """expand_query 테스트."""

    @pytest.fixture
    def generator(self):
        return HyDEGenerator(use_llm=False)

    def test_expand_includes_original(self, generator):
        """확장된 쿼리에 원본 포함."""
        expanded = generator.expand_query(
            query="갑목 성격",
            domain="saju",
        )
        assert expanded.startswith("갑목 성격")

    def test_expand_longer_than_original(self, generator):
        """확장된 쿼리가 원본보다 길다."""
        original = "갑목 성격"
        expanded = generator.expand_query(query=original, domain="saju")
        assert len(expanded) > len(original)

    def test_expand_with_facts(self, generator):
        """facts가 포함된 확장."""
        expanded = generator.expand_query(
            query="my fortune",
            domain="astro",
            facts={"ascendant": "Leo"},
        )
        assert "Leo" in expanded


# ─── LLM Fallback 테스트 ────────────────────

class TestLLMFallback:
    """LLM 사용 시 실패하면 로컬로 fallback."""

    def test_llm_failure_falls_back_to_local(self):
        """LLM 실패 시 로컬 확장."""
        generator = HyDEGenerator(
            llm_provider="invalid_provider",
            use_llm=True,
        )
        result = generator.generate_hypothesis(
            query="갑목 성격",
            domain="saju",
        )
        # LLM 실패해도 로컬 결과 반환
        assert "갑목 성격" in result
        assert "사주" in result


# ─── Feature Flag 테스트 ─────────────────────

class TestFeatureFlag:
    """Feature flag 테스트."""

    def test_flag_import(self):
        assert isinstance(USE_HYDE, bool)

    def test_singleton_callable(self):
        assert callable(get_hyde_generator)

    def test_singleton_returns_generator(self):
        gen = get_hyde_generator(use_llm=False)
        assert isinstance(gen, HyDEGenerator)


# ─── LLM Mock 테스트 ──────────────────────────

class TestLLMMock:
    """LLM 프로바이더 mock 테스트."""

    def test_openai_success(self):
        """OpenAI 호출 성공 mock."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="openai", use_llm=True)
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "갑목은 큰 나무를 상징하며 리더십 특성"
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            result = generator.generate_hypothesis("갑목 성격", domain="saju")
            assert "갑목" in result
            assert "리더십" in result

    def test_anthropic_success(self):
        """Anthropic 호출 성공 mock."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="anthropic", use_llm=True)
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "Aries is ruled by Mars, symbolizing action"
        mock_client.messages.create.return_value = mock_response

        with patch("anthropic.Anthropic", return_value=mock_client):
            result = generator.generate_hypothesis("Aries traits", domain="astro")
            assert "Mars" in result

    def test_openai_api_error(self):
        """OpenAI API 에러 → 로컬 fallback."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="openai", use_llm=True)
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Rate limit")

        with patch("openai.OpenAI", return_value=mock_client):
            result = generator.generate_hypothesis("갑목 성격", domain="saju")
            # 로컬 fallback
            assert "갑목 성격" in result
            assert "사주" in result

    def test_anthropic_api_error(self):
        """Anthropic API 에러 → 로컬 fallback."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="anthropic", use_llm=True)
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("Auth failed")

        with patch("anthropic.Anthropic", return_value=mock_client):
            result = generator.generate_hypothesis("tarot reading", domain="tarot")
            assert "tarot reading" in result
            assert "tarot" in result

    def test_openai_empty_response(self):
        """OpenAI 빈 응답 → 로컬 fallback."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="openai", use_llm=True)
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = ""
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            result = generator.generate_hypothesis("test", domain="saju")
            # 빈 문자열은 falsy → 로컬 fallback
            assert "test" in result

    def test_llm_with_facts_context(self):
        """LLM 호출에 facts 컨텍스트 전달."""
        from unittest.mock import patch, MagicMock

        generator = HyDEGenerator(llm_provider="openai", use_llm=True)
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "갑목 일간의 특징"
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            result = generator.generate_hypothesis(
                "성격 분석",
                domain="saju",
                facts={"dayMaster": "갑목", "sunSign": "Aries"},
            )
            # LLM에 facts가 프롬프트에 포함되었는지 확인
            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]
            assert "갑목" in prompt
            assert "Aries" in prompt


# ─── 확장 엣지 케이스 ─────────────────────────

class TestLocalExpansionEdgeCases:
    """로컬 확장 엣지 케이스."""

    def test_very_long_query(self):
        """매우 긴 쿼리."""
        generator = HyDEGenerator(use_llm=False)
        long_query = "갑목 " * 500
        result = generator.generate_hypothesis(long_query, domain="saju")
        assert long_query in result

    def test_special_characters_in_query(self):
        """특수 문자 쿼리."""
        generator = HyDEGenerator(use_llm=False)
        result = generator.generate_hypothesis("갑목@#$%^&*()", domain="saju")
        assert "갑목@#$%^&*()" in result

    def test_unicode_emoji_query(self):
        """이모지 포함 쿼리."""
        generator = HyDEGenerator(use_llm=False)
        result = generator.generate_hypothesis("오늘 운세 🔮✨", domain="saju")
        assert "🔮" in result

    def test_dream_domain_keywords(self):
        """꿈 도메인 키워드 확장."""
        generator = HyDEGenerator(use_llm=False)
        result = generator.generate_hypothesis("꿈에서 바다를 봤어요", domain="dream")
        assert "꿈" in result
        assert "무의식" in result

    def test_facts_with_non_standard_keys(self):
        """표준 키가 아닌 facts."""
        generator = HyDEGenerator(use_llm=False)
        result = generator.generate_hypothesis(
            "test",
            domain="saju",
            facts={"customKey": "value", "anotherKey": 123},
        )
        # 비표준 키는 무시됨 (dayMaster, sunSign 등만 추출)
        assert "test" in result

    def test_facts_with_integer_values(self):
        """정수 값 facts (문자열만 추가)."""
        generator = HyDEGenerator(use_llm=False)
        result = generator.generate_hypothesis(
            "test",
            domain="saju",
            facts={"dayMaster": 123},  # int, not str
        )
        # isinstance(123, str) is False → 추가 안 됨
        assert "123" not in result

    def test_none_domain(self):
        """None 도메인 → default."""
        generator = HyDEGenerator(use_llm=False)
        # None은 dict.get에서 찾을 수 없으므로 default 사용
        result = generator._generate_local("test", None, None)
        assert "test" in result


class TestExpandQueryEdgeCases:
    """expand_query 엣지 케이스."""

    def test_expand_contains_hypothesis(self):
        """확장에 가설 답변 포함."""
        generator = HyDEGenerator(use_llm=False)
        expanded = generator.expand_query("갑목", domain="saju")
        # 원본 + 가설 답변 = 도메인 키워드 포함
        assert "갑목" in expanded
        assert "오행" in expanded

    def test_expand_empty_query(self):
        """빈 쿼리 확장."""
        generator = HyDEGenerator(use_llm=False)
        expanded = generator.expand_query("", domain="saju")
        assert "사주" in expanded

    def test_expand_different_domains_different_results(self):
        """다른 도메인 → 다른 확장 결과."""
        generator = HyDEGenerator(use_llm=False)
        saju = generator.expand_query("분석", domain="saju")
        astro = generator.expand_query("분석", domain="astro")
        assert saju != astro


class TestHyDEConfig:
    """HyDE 설정 테스트."""

    def test_default_config(self):
        gen = HyDEGenerator()
        assert gen.llm_provider == "openai"
        assert gen.llm_model == "gpt-4o-mini"
        assert gen.use_llm is True
        assert gen.max_tokens == 150

    def test_custom_config(self):
        gen = HyDEGenerator(
            llm_provider="anthropic",
            llm_model="claude-3-5-haiku",
            use_llm=False,
            max_tokens=300,
        )
        assert gen.llm_provider == "anthropic"
        assert gen.llm_model == "claude-3-5-haiku"
        assert gen.use_llm is False
        assert gen.max_tokens == 300

    def test_domain_keywords_all_present(self):
        """모든 도메인 키워드 존재."""
        for domain in ("saju", "astro", "tarot", "dream", "default"):
            assert domain in HyDEGenerator.DOMAIN_KEYWORDS
