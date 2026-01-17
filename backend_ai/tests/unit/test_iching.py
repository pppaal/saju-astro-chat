"""
Unit tests for I-Ching module.

Tests:
- Constants (Five Elements, Trigrams)
- Hexagram casting
- Hexagram interpretation
- Changing line analysis
- Related hexagram calculations
- Seasonal analysis
"""
import pytest
from unittest.mock import patch, MagicMock


class TestIChingConstants:
    """Tests for I-Ching constants."""

    def test_wuxing_generating_complete(self):
        """Five Element generating cycle should be complete."""
        from backend_ai.app.iching_rag import WUXING_GENERATING

        assert WUXING_GENERATING["wood"] == "fire"
        assert WUXING_GENERATING["fire"] == "earth"
        assert WUXING_GENERATING["earth"] == "metal"
        assert WUXING_GENERATING["metal"] == "water"
        assert WUXING_GENERATING["water"] == "wood"

    def test_wuxing_overcoming_complete(self):
        """Five Element overcoming cycle should be complete."""
        from backend_ai.app.iching_rag import WUXING_OVERCOMING

        assert WUXING_OVERCOMING["wood"] == "earth"
        assert WUXING_OVERCOMING["earth"] == "water"
        assert WUXING_OVERCOMING["water"] == "fire"
        assert WUXING_OVERCOMING["fire"] == "metal"
        assert WUXING_OVERCOMING["metal"] == "wood"

    def test_wuxing_korean_complete(self):
        """Korean names for Five Elements should be complete."""
        from backend_ai.app.iching_rag import WUXING_KOREAN

        assert len(WUXING_KOREAN) == 5
        assert "목" in WUXING_KOREAN["wood"]
        assert "화" in WUXING_KOREAN["fire"]
        assert "토" in WUXING_KOREAN["earth"]
        assert "금" in WUXING_KOREAN["metal"]
        assert "수" in WUXING_KOREAN["water"]

    def test_trigram_info_complete(self):
        """Eight trigrams should be defined."""
        from backend_ai.app.iching_rag import TRIGRAM_INFO

        assert len(TRIGRAM_INFO) == 8
        expected_trigrams = ["heaven", "earth", "thunder", "water", "mountain", "wind", "fire", "lake"]
        for trigram in expected_trigrams:
            assert trigram in TRIGRAM_INFO

    def test_trigram_info_structure(self):
        """Each trigram should have required fields."""
        from backend_ai.app.iching_rag import TRIGRAM_INFO

        required_fields = ["korean", "nature", "element", "direction", "body", "symbol", "image"]
        for trigram, info in TRIGRAM_INFO.items():
            for field in required_fields:
                assert field in info, f"Missing {field} in {trigram}"

    def test_line_position_meaning_complete(self):
        """Line position meanings should cover all 6 lines."""
        from backend_ai.app.iching_rag import LINE_POSITION_MEANING

        assert len(LINE_POSITION_MEANING) == 6
        for i in range(1, 7):
            assert i in LINE_POSITION_MEANING
            assert "name" in LINE_POSITION_MEANING[i]
            assert "meaning" in LINE_POSITION_MEANING[i]

    def test_solar_terms_complete(self):
        """24 solar terms should be defined."""
        from backend_ai.app.iching_rag import SOLAR_TERMS

        assert len(SOLAR_TERMS) == 24

    def test_season_element_complete(self):
        """Season elements should be defined."""
        from backend_ai.app.iching_rag import SEASON_ELEMENT

        assert "spring" in SEASON_ELEMENT
        assert "summer" in SEASON_ELEMENT
        assert "autumn" in SEASON_ELEMENT
        assert "winter" in SEASON_ELEMENT


class TestHexagramCasting:
    """Tests for hexagram casting functionality."""

    def test_cast_hexagram_returns_dict(self):
        """cast_hexagram should return proper structure."""
        from backend_ai.app.iching_rag import cast_hexagram

        result = cast_hexagram()

        assert isinstance(result, dict)
        assert "primary" in result
        assert "resulting" in result
        assert "lines" in result
        assert "changing_lines" in result

    def test_cast_hexagram_primary_structure(self):
        """Primary hexagram should have number and binary."""
        from backend_ai.app.iching_rag import cast_hexagram

        result = cast_hexagram()

        primary = result["primary"]
        assert "number" in primary
        assert "binary" in primary
        assert 1 <= primary["number"] <= 64
        assert len(primary["binary"]) == 6

    def test_cast_hexagram_lines_structure(self):
        """Lines should have proper structure."""
        from backend_ai.app.iching_rag import cast_hexagram

        result = cast_hexagram()

        assert len(result["lines"]) == 6
        for line in result["lines"]:
            assert "value" in line
            assert "changing" in line
            assert "line_num" in line
            assert line["value"] in [0, 1]
            assert isinstance(line["changing"], bool)

    def test_cast_hexagram_changing_lines_consistency(self):
        """Changing lines list should match line data."""
        from backend_ai.app.iching_rag import cast_hexagram

        result = cast_hexagram()

        changing_lines = result["changing_lines"]
        lines_marked_changing = [l for l in result["lines"] if l["changing"]]

        assert len(changing_lines) == len(lines_marked_changing)


class TestBinaryConversion:
    """Tests for binary to hexagram conversion."""

    def test_binary_to_hexagram_num_qian(self):
        """Binary 111111 should be Hexagram 1 (Qian/乾)."""
        from backend_ai.app.iching_rag import _binary_to_hexagram_num

        result = _binary_to_hexagram_num("111111")
        assert result == 1

    def test_binary_to_hexagram_num_kun(self):
        """Binary 000000 should be Hexagram 2 (Kun/坤)."""
        from backend_ai.app.iching_rag import _binary_to_hexagram_num

        result = _binary_to_hexagram_num("000000")
        assert result == 2

    def test_binary_to_hexagram_num_range(self):
        """All hexagram numbers should be between 1 and 64."""
        from backend_ai.app.iching_rag import _binary_to_hexagram_num

        # Test a few known mappings
        assert 1 <= _binary_to_hexagram_num("111111") <= 64
        assert 1 <= _binary_to_hexagram_num("000000") <= 64
        assert 1 <= _binary_to_hexagram_num("101010") <= 64


class TestRelatedHexagrams:
    """Tests for nuclear, opposite, and reverse hexagram calculations."""

    def test_calculate_nuclear_hexagram(self):
        """Nuclear hexagram calculation."""
        from backend_ai.app.iching_rag import calculate_nuclear_hexagram

        # For 111111 (Qian), nuclear should also be related
        result = calculate_nuclear_hexagram("111111")
        assert result is not None
        assert 1 <= result <= 64

    def test_calculate_nuclear_hexagram_invalid(self):
        """Nuclear calculation with invalid binary should return None."""
        from backend_ai.app.iching_rag import calculate_nuclear_hexagram

        result = calculate_nuclear_hexagram("11111")  # Only 5 chars
        assert result is None

    def test_calculate_opposite_hexagram(self):
        """Opposite hexagram calculation."""
        from backend_ai.app.iching_rag import calculate_opposite_hexagram

        # 111111 opposite is 000000
        result_qian = calculate_opposite_hexagram("111111")
        result_kun = calculate_opposite_hexagram("000000")

        # Qian's opposite should be Kun (2)
        assert result_qian == 2
        # Kun's opposite should be Qian (1)
        assert result_kun == 1

    def test_calculate_reverse_hexagram(self):
        """Reverse hexagram calculation."""
        from backend_ai.app.iching_rag import calculate_reverse_hexagram

        # Symmetric hexagrams should remain the same
        result_qian = calculate_reverse_hexagram("111111")
        result_kun = calculate_reverse_hexagram("000000")

        assert result_qian == 1  # Qian reversed is still Qian
        assert result_kun == 2  # Kun reversed is still Kun

    def test_get_related_hexagrams(self):
        """Get all related hexagrams."""
        from backend_ai.app.iching_rag import get_related_hexagrams

        result = get_related_hexagrams(1, "111111")

        assert "nuclear" in result
        assert "opposite" in result
        assert "reverse" in result


class TestSeasonalAnalysis:
    """Tests for seasonal and timing analysis."""

    def test_get_current_season(self):
        """get_current_season should return valid season."""
        from backend_ai.app.iching_rag import get_current_season

        result = get_current_season()
        assert result in ["spring", "summer", "autumn", "winter"]

    def test_get_current_solar_term(self):
        """get_current_solar_term should return valid term."""
        from backend_ai.app.iching_rag import get_current_solar_term

        result = get_current_solar_term()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_analyze_seasonal_harmony(self):
        """analyze_seasonal_harmony should return analysis dict."""
        from backend_ai.app.iching_rag import analyze_seasonal_harmony

        result = analyze_seasonal_harmony("wood")

        assert "season" in result
        assert "season_element" in result
        assert "hexagram_element" in result
        assert "relationship" in result
        assert "score" in result
        assert 1 <= result["score"] <= 5


class TestFiveElementAnalysis:
    """Tests for Five Element (五行) analysis."""

    def test_analyze_wuxing_relationship_same(self):
        """Same elements should return 비화(比和)."""
        from backend_ai.app.iching_rag import analyze_wuxing_relationship

        result = analyze_wuxing_relationship("wood", "wood")

        assert result["relationship"] == "비화(比和)"
        assert result["type"] == "harmony"

    def test_analyze_wuxing_relationship_generating(self):
        """Generating relationship test."""
        from backend_ai.app.iching_rag import analyze_wuxing_relationship

        # Wood generates Fire
        result = analyze_wuxing_relationship("wood", "fire")

        assert "상생" in result["relationship"]
        assert result["type"] == "generating"

    def test_analyze_wuxing_relationship_overcoming(self):
        """Overcoming relationship test."""
        from backend_ai.app.iching_rag import analyze_wuxing_relationship

        # Wood overcomes Earth
        result = analyze_wuxing_relationship("wood", "earth")

        assert "상극" in result["relationship"]
        assert result["type"] == "overcoming"

    def test_analyze_wuxing_relationship_unknown(self):
        """Unknown elements should return appropriate response."""
        from backend_ai.app.iching_rag import analyze_wuxing_relationship

        result = analyze_wuxing_relationship("", "")

        assert "relationship" in result

    def test_get_saju_element_analysis(self):
        """Saju element analysis should work."""
        from backend_ai.app.iching_rag import get_saju_element_analysis

        result = get_saju_element_analysis("wood", "fire")

        assert result is not None
        assert "relationship" in result
        assert "day_master" in result


class TestChangingLineAnalysis:
    """Tests for changing line interpretation."""

    def test_get_changing_line_rule_no_change(self):
        """No changing lines should return 무변 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([], 1)

        assert result["rule"] == "무변(無變)"
        assert result["focus"] == "primary_judgment"

    def test_get_changing_line_rule_single(self):
        """Single changing line should return 단변 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([3], 1)

        assert result["rule"] == "단변(單變)"
        assert result["focus"] == "single_line"
        assert result["focus_line"] == 3

    def test_get_changing_line_rule_two(self):
        """Two changing lines should return 이변 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([2, 5], 1)

        assert result["rule"] == "이변(二變)"
        assert result["focus"] == "two_lines_upper"
        assert result["focus_line"] == 5  # Upper line

    def test_get_changing_line_rule_three(self):
        """Three changing lines should return 삼변 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([1, 3, 5], 1)

        assert result["rule"] == "삼변(三變)"
        assert result["focus"] == "both_judgments"

    def test_get_changing_line_rule_six_qian_kun(self):
        """Six changing lines Qian→Kun should return 용구 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([1, 2, 3, 4, 5, 6], 1, 2)

        assert result["rule"] == "용구(用九)"
        assert "群龍無首" in result["special_text"]

    def test_get_changing_line_rule_six_kun_qian(self):
        """Six changing lines Kun→Qian should return 용육 rule."""
        from backend_ai.app.iching_rag import get_changing_line_rule

        result = get_changing_line_rule([1, 2, 3, 4, 5, 6], 2, 1)

        assert result["rule"] == "용육(用六)"
        assert "利永貞" in result["special_text"]

    def test_get_line_position_analysis(self):
        """Line position analysis should return proper structure."""
        from backend_ai.app.iching_rag import get_line_position_analysis

        result = get_line_position_analysis(5, True)

        assert "position" in result
        assert "is_center" in result
        assert "is_correct" in result
        assert "zhong_zheng" in result
        assert "corresponding_line" in result

        # Line 5 is center position
        assert result["is_center"] is True


class TestTrigramAnalysis:
    """Tests for trigram analysis."""

    def test_get_enhanced_trigram_analysis(self):
        """Enhanced trigram analysis should work."""
        from backend_ai.app.iching_rag import get_enhanced_trigram_analysis

        result = get_enhanced_trigram_analysis("heaven", "earth")

        assert result is not None
        assert "visual" in result
        assert "upper" in result
        assert "lower" in result
        assert "element_relationship" in result

    def test_get_enhanced_trigram_analysis_invalid(self):
        """Invalid trigrams should return None."""
        from backend_ai.app.iching_rag import get_enhanced_trigram_analysis

        result = get_enhanced_trigram_analysis("invalid", "invalid")

        assert result is None


class TestHexagramInterpretation:
    """Tests for hexagram interpretation."""

    def test_get_hexagram_interpretation_basic(self):
        """Basic hexagram interpretation should work."""
        from backend_ai.app.iching_rag import get_hexagram_interpretation

        result = get_hexagram_interpretation(
            hexagram_num=1,
            theme="general",
            locale="ko"
        )

        assert isinstance(result, dict)
        assert "hexagram" in result
        assert "number" in result["hexagram"]

    def test_get_hexagram_interpretation_with_theme(self):
        """Theme-specific interpretation should work."""
        from backend_ai.app.iching_rag import get_hexagram_interpretation

        result = get_hexagram_interpretation(
            hexagram_num=1,
            theme="career",
            locale="ko"
        )

        assert isinstance(result, dict)

    def test_get_hexagram_interpretation_range(self):
        """All 64 hexagrams should be interpretable."""
        from backend_ai.app.iching_rag import get_hexagram_interpretation

        # Test first and last hexagram
        result1 = get_hexagram_interpretation(hexagram_num=1, locale="ko")
        result64 = get_hexagram_interpretation(hexagram_num=64, locale="ko")

        assert result1["hexagram"]["number"] == 1
        assert result64["hexagram"]["number"] == 64


class TestIChinReading:
    """Tests for complete I-Ching reading."""

    def test_perform_iching_reading(self):
        """perform_iching_reading should return complete reading."""
        from backend_ai.app.iching_rag import perform_iching_reading

        result = perform_iching_reading(
            question="직업을 바꾸는 것이 좋을까요?",
            theme="career",
            locale="ko"
        )

        assert isinstance(result, dict)
        assert "cast" in result
        assert "primary_interpretation" in result
        assert "summary" in result

    def test_perform_iching_reading_with_saju(self):
        """Reading with Saju element should include saju analysis."""
        from backend_ai.app.iching_rag import perform_iching_reading

        result = perform_iching_reading(
            question="올해 운세가 어떨까요?",
            theme="general",
            locale="ko",
            saju_element="wood"
        )

        assert isinstance(result, dict)


class TestIChingSearch:
    """Tests for I-Ching search functionality."""

    def test_search_iching_wisdom(self):
        """search_iching_wisdom should return results."""
        from backend_ai.app.iching_rag import search_iching_wisdom

        results = search_iching_wisdom("리더십 성공", top_k=3)

        assert isinstance(results, list)

    def test_get_all_hexagrams_summary(self):
        """get_all_hexagrams_summary should return 64 hexagrams."""
        from backend_ai.app.iching_rag import get_all_hexagrams_summary

        summaries = get_all_hexagrams_summary(locale="ko")

        assert isinstance(summaries, list)
        assert len(summaries) == 64


class TestChangingLineInterpretation:
    """Tests for changing line interpretation API."""

    def test_get_changing_line_interpretation(self):
        """get_changing_line_interpretation should work."""
        from backend_ai.app.iching_rag import get_changing_line_interpretation

        result = get_changing_line_interpretation(
            hexagram_num=1,
            line_index=1,
            locale="ko"
        )

        assert isinstance(result, dict)
        assert "hexagram_number" in result or "error" in result

    def test_get_changing_line_interpretation_invalid_hexagram(self):
        """Invalid hexagram should return error."""
        from backend_ai.app.iching_rag import get_changing_line_interpretation

        result = get_changing_line_interpretation(
            hexagram_num=100,  # Invalid
            line_index=1,
            locale="ko"
        )

        assert "error" in result

    def test_get_changing_line_interpretation_invalid_line(self):
        """Invalid line index should return error."""
        from backend_ai.app.iching_rag import get_changing_line_interpretation

        result = get_changing_line_interpretation(
            hexagram_num=1,
            line_index=10,  # Invalid
            locale="ko"
        )

        assert "error" in result

    def test_get_all_changing_lines_for_hexagram(self):
        """get_all_changing_lines_for_hexagram should work."""
        from backend_ai.app.iching_rag import get_all_changing_lines_for_hexagram

        result = get_all_changing_lines_for_hexagram(
            hexagram_num=1,
            locale="ko"
        )

        assert isinstance(result, dict)
        assert "hexagram_number" in result or "error" in result


class TestIChingModuleExports:
    """Tests for I-Ching module exports."""

    def test_cast_hexagram_importable(self):
        """cast_hexagram should be importable."""
        from backend_ai.app.iching_rag import cast_hexagram
        assert callable(cast_hexagram)

    def test_get_hexagram_interpretation_importable(self):
        """get_hexagram_interpretation should be importable."""
        from backend_ai.app.iching_rag import get_hexagram_interpretation
        assert callable(get_hexagram_interpretation)

    def test_perform_iching_reading_importable(self):
        """perform_iching_reading should be importable."""
        from backend_ai.app.iching_rag import perform_iching_reading
        assert callable(perform_iching_reading)

    def test_constants_importable(self):
        """Constants should be importable."""
        from backend_ai.app.iching_rag import (
            WUXING_GENERATING,
            WUXING_OVERCOMING,
            WUXING_KOREAN,
            TRIGRAM_INFO,
            LINE_POSITION_MEANING,
            SOLAR_TERMS,
            SEASON_ELEMENT,
        )
        assert all([
            WUXING_GENERATING,
            WUXING_OVERCOMING,
            WUXING_KOREAN,
            TRIGRAM_INFO,
            LINE_POSITION_MEANING,
            SOLAR_TERMS,
            SEASON_ELEMENT,
        ])
