"""
RAG Context Service Tests

Tests for RAG query expansion and fallback generation.
"""

import pytest
from unittest.mock import MagicMock, patch

from backend_ai.app.services.rag_context_service import (
    expand_tarot_query,
    get_fallback_tarot_queries,
    build_tarot_search_context,
)


class TestExpandTarotQueryEnglish:
    """Tests for English query expansion."""

    def test_expands_business_query(self):
        """Business-related queries should be expanded."""
        result = expand_tarot_query("Should I start a business?")
        assert "사업 창업" in result
        assert "|" in result

    def test_expands_career_query(self):
        """Career-related queries should be expanded."""
        result = expand_tarot_query("Will I get a promotion?")
        assert "직장 커리어 이직" in result

    def test_expands_love_query(self):
        """Love-related queries should be expanded."""
        result = expand_tarot_query("What about my love life?")
        assert "연애 관계 결혼" in result

    def test_expands_money_query(self):
        """Money-related queries should be expanded."""
        result = expand_tarot_query("Should I invest in stocks?")
        assert "재물 돈 투자" in result

    def test_expands_health_query(self):
        """Health-related queries should be expanded."""
        result = expand_tarot_query("I'm feeling stressed")
        assert "건강 마음 불안" in result

    def test_expands_decision_query(self):
        """Decision-related queries should be expanded."""
        result = expand_tarot_query("Should I choose option A or B?")
        assert "선택 결정" in result

    def test_expands_travel_query(self):
        """Travel-related queries should be expanded."""
        result = expand_tarot_query("Should I take this trip?")
        assert "여행 이동 이사" in result

    def test_expands_strength_query(self):
        """Strength-related queries should be expanded."""
        result = expand_tarot_query("What are my strengths?")
        assert "강점 재능" in result

    def test_expands_obstacle_query(self):
        """Obstacle-related queries should be expanded."""
        result = expand_tarot_query("I feel stuck in my progress")
        assert "장애물 정체 성장" in result

    def test_expands_timing_query(self):
        """Timing-related queries should be expanded."""
        result = expand_tarot_query("When will things change?")
        assert "타이밍 시기" in result

    def test_expands_family_query(self):
        """Family-related queries should be expanded."""
        result = expand_tarot_query("My relationship with parents")
        assert "가족 관계" in result

    def test_expands_study_query(self):
        """Study-related queries should be expanded."""
        result = expand_tarot_query("Will I pass the exam?")
        assert "시험 공부" in result

    def test_no_expansion_for_generic_query(self):
        """Generic queries should not be expanded."""
        query = "Tell me something interesting"
        result = expand_tarot_query(query)
        assert result == query
        assert "|" not in result


class TestExpandTarotQueryKorean:
    """Tests for Korean query expansion."""

    def test_expands_korean_business(self):
        """Korean business queries should be expanded."""
        result = expand_tarot_query("창업을 해도 될까요?")
        assert "business startup" in result

    def test_expands_korean_career(self):
        """Korean career queries should be expanded."""
        result = expand_tarot_query("이직을 해야 할까요?")
        assert "career job work" in result

    def test_expands_korean_love(self):
        """Korean love queries should be expanded."""
        result = expand_tarot_query("연애 운이 어떤가요?")
        assert "love relationship" in result

    def test_expands_korean_money(self):
        """Korean money queries should be expanded."""
        result = expand_tarot_query("주식 투자해도 될까요?")
        assert "money finance investment" in result

    def test_expands_korean_health(self):
        """Korean health queries should be expanded."""
        result = expand_tarot_query("요즘 스트레스가 심해요")
        assert "health stress" in result

    def test_expands_korean_decision(self):
        """Korean decision queries should be expanded."""
        result = expand_tarot_query("이 선택을 해도 될까요?")
        assert "decision timing" in result

    def test_expands_korean_travel(self):
        """Korean travel queries should be expanded."""
        result = expand_tarot_query("이사를 해야 할까요?")
        assert "travel move" in result

    def test_expands_korean_strength(self):
        """Korean strength queries should be expanded."""
        result = expand_tarot_query("제 강점이 뭔가요?")
        assert "strength identity" in result

    def test_expands_korean_obstacle(self):
        """Korean obstacle queries should be expanded."""
        result = expand_tarot_query("막힘이 있어요")
        assert "obstacle growth" in result

    def test_expands_korean_family(self):
        """Korean family queries should be expanded."""
        result = expand_tarot_query("부모님과의 관계")
        assert "family" in result

    def test_expands_korean_study(self):
        """Korean study queries should be expanded."""
        result = expand_tarot_query("시험에 합격할 수 있을까요?")
        assert "study exam" in result


class TestExpandTarotQueryMixed:
    """Tests for mixed language and edge cases."""

    def test_handles_empty_string(self):
        """Empty string should return empty."""
        result = expand_tarot_query("")
        assert result == ""

    def test_case_insensitive_english(self):
        """Should be case insensitive for English."""
        result1 = expand_tarot_query("BUSINESS plan")
        result2 = expand_tarot_query("business plan")
        assert "사업 창업" in result1
        assert "사업 창업" in result2

    def test_multiple_keywords_combined(self):
        """Multiple keywords should add multiple hints."""
        result = expand_tarot_query("career and love decision")
        assert "|" in result
        # Should have multiple hint categories


class TestGetFallbackTarotQueries:
    """Tests for fallback query generation."""

    def test_generates_business_fallbacks(self):
        """Business queries should generate fallbacks."""
        result = get_fallback_tarot_queries("Should I start a business?")
        assert "business" in result
        assert "career" in result

    def test_generates_career_fallbacks(self):
        """Career queries should generate fallbacks."""
        result = get_fallback_tarot_queries("Will I get a promotion?")
        assert "career" in result
        assert "job" in result

    def test_generates_love_fallbacks(self):
        """Love queries should generate fallbacks."""
        result = get_fallback_tarot_queries("What about my love life?")
        assert "love" in result
        assert "relationship" in result

    def test_generates_money_fallbacks(self):
        """Money queries should generate fallbacks."""
        result = get_fallback_tarot_queries("Should I invest in stocks?")
        assert "money" in result
        assert "finance" in result

    def test_generates_health_fallbacks(self):
        """Health queries should generate fallbacks."""
        result = get_fallback_tarot_queries("I'm feeling stressed")
        assert "health" in result
        assert "stress" in result

    def test_generates_korean_fallbacks(self):
        """Korean queries should generate fallbacks."""
        result = get_fallback_tarot_queries("창업을 해도 될까요?")
        assert "business" in result

    def test_deduplicates_fallbacks(self):
        """Fallbacks should be deduplicated."""
        result = get_fallback_tarot_queries("business startup company")
        # Even with multiple business keywords, should not have duplicates
        assert len(result) == len(set(result))

    def test_preserves_order(self):
        """Fallback order should be preserved."""
        result = get_fallback_tarot_queries("business startup")
        if len(result) >= 2:
            assert result[0] == "business"
            assert result[1] == "career"

    def test_returns_empty_for_generic(self):
        """Generic queries should return empty fallbacks."""
        result = get_fallback_tarot_queries("something random")
        assert result == []


class TestGetFallbackTarotQueriesKorean:
    """Tests for Korean fallback generation."""

    def test_korean_business_fallbacks(self):
        """Korean business should generate fallbacks."""
        result = get_fallback_tarot_queries("사업을 시작해도 될까요?")
        assert "business" in result

    def test_korean_career_fallbacks(self):
        """Korean career should generate fallbacks."""
        result = get_fallback_tarot_queries("직장에서 승진할 수 있을까요?")
        assert "career" in result

    def test_korean_love_fallbacks(self):
        """Korean love should generate fallbacks."""
        result = get_fallback_tarot_queries("연애 운은 어떤가요?")
        assert "love" in result

    def test_korean_money_fallbacks(self):
        """Korean money should generate fallbacks."""
        result = get_fallback_tarot_queries("재물 운이 좋아질까요?")
        assert "money" in result

    def test_korean_health_fallbacks(self):
        """Korean health should generate fallbacks."""
        result = get_fallback_tarot_queries("건강이 좋아질까요?")
        assert "health" in result


class TestBuildTarotSearchContext:
    """Tests for build_tarot_search_context function."""

    def test_returns_results_on_first_search(self):
        """Should return results if first search succeeds."""
        mock_rag = MagicMock()
        mock_rag.search.return_value = [{"content": "result"}]
        mock_rag.get_context.return_value = "context text"

        results, context, expanded, fallback = build_tarot_search_context(
            "love",
            mock_rag,
            domain="tarot",
            top_k=5
        )

        assert len(results) == 1
        assert context == "context text"
        assert expanded is None
        assert fallback is None

    def test_tries_expanded_query_on_empty(self):
        """Should try expanded query if first search returns empty."""
        mock_rag = MagicMock()
        # First call returns empty, second returns result
        mock_rag.search.side_effect = [[], [{"content": "result"}]]
        mock_rag.get_context.return_value = "context"

        results, context, expanded, fallback = build_tarot_search_context(
            "love life",
            mock_rag
        )

        assert len(results) == 1
        assert expanded is not None
        # Should have Korean hints in expanded query
        assert "연애" in expanded or "관계" in expanded

    def test_tries_fallback_on_empty(self):
        """Should try fallback queries if expanded also empty."""
        mock_rag = MagicMock()
        # First two calls return empty, fallback returns result
        mock_rag.search.side_effect = [[], [], [{"content": "fallback result"}]]
        mock_rag.get_context.return_value = "context"

        results, context, expanded, fallback = build_tarot_search_context(
            "love relationship",
            mock_rag
        )

        assert len(results) == 1
        assert fallback is not None

    def test_returns_empty_if_all_fail(self):
        """Should return empty if all searches fail."""
        mock_rag = MagicMock()
        mock_rag.search.return_value = []
        mock_rag.get_context.return_value = ""

        results, context, expanded, fallback = build_tarot_search_context(
            "random query without matches",
            mock_rag
        )

        assert results == []


class TestEdgeCases:
    """Edge case tests."""

    def test_expand_with_special_characters(self):
        """Should handle special characters."""
        result = expand_tarot_query("Should I invest $1000 in stocks?")
        assert "재물 돈 투자" in result

    def test_expand_with_numbers(self):
        """Should handle numbers in query."""
        result = expand_tarot_query("Will I find love in 2024?")
        assert "연애 관계 결혼" in result

    def test_fallback_handles_whitespace(self):
        """Should handle extra whitespace."""
        result = get_fallback_tarot_queries("  business  ")
        assert "business" in result

    def test_expand_preserves_original_query(self):
        """Original query should be preserved in expansion."""
        query = "Will my love life improve?"
        result = expand_tarot_query(query)
        assert query in result

    def test_fallback_list_is_list(self):
        """Fallback should always return a list."""
        result = get_fallback_tarot_queries("anything")
        assert isinstance(result, list)

    def test_expand_returns_string(self):
        """Expand should always return a string."""
        result = expand_tarot_query("anything")
        assert isinstance(result, str)


class TestMultipleKeywordMatches:
    """Tests for queries matching multiple keyword categories."""

    def test_multiple_english_categories(self):
        """Multiple English categories should all add hints."""
        result = expand_tarot_query("business and love decision")
        # Should contain hints for multiple categories
        parts = result.split("|")
        assert len(parts) > 1  # Has expansion

    def test_multiple_korean_categories(self):
        """Multiple Korean categories should all add hints."""
        result = expand_tarot_query("사업과 연애 결정")
        parts = result.split("|")
        assert len(parts) > 1

    def test_mixed_language_query(self):
        """Mixed language queries should expand properly."""
        result = expand_tarot_query("business 사업")
        # Should have both Korean and English expansions
        assert "business startup" in result or "사업 창업" in result
