"""
Unit tests for Numerology Logic module.

Tests:
- Core calculation functions (life path, expression, soul urge, personality)
- Personal year/month calculations
- Korean name numerology
- Number reduction with master numbers
- Data loading functions
"""
import pytest
from unittest.mock import patch, MagicMock


class TestReduceToSingle:
    """Tests for reduce_to_single function."""

    def test_single_digit_returns_same(self):
        """Single digit should return unchanged."""
        from backend_ai.app.numerology_logic import reduce_to_single

        for i in range(1, 10):
            assert reduce_to_single(i) == i

    def test_reduce_double_digit(self):
        """Double digit should reduce to single."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(10) == 1  # 1+0 = 1
        assert reduce_to_single(15) == 6  # 1+5 = 6
        assert reduce_to_single(28) == 1  # 2+8 = 10 -> 1+0 = 1

    def test_master_number_11_preserved(self):
        """Master number 11 should be preserved."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(11, keep_master=True) == 11

    def test_master_number_22_preserved(self):
        """Master number 22 should be preserved."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(22, keep_master=True) == 22

    def test_master_number_33_preserved(self):
        """Master number 33 should be preserved."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(33, keep_master=True) == 33

    def test_master_number_reduced_when_disabled(self):
        """Master numbers should reduce when keep_master=False."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(11, keep_master=False) == 2  # 1+1 = 2
        assert reduce_to_single(22, keep_master=False) == 4  # 2+2 = 4
        assert reduce_to_single(33, keep_master=False) == 6  # 3+3 = 6

    def test_large_number_reduction(self):
        """Large numbers should fully reduce."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(999) == 9  # 9+9+9 = 27 -> 2+7 = 9
        assert reduce_to_single(123) == 6  # 1+2+3 = 6


class TestCalculateLifePath:
    """Tests for calculate_life_path function."""

    def test_basic_calculation(self):
        """Test basic life path calculation."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-01-15")

        assert "life_path" in result
        assert isinstance(result["life_path"], int)
        assert 1 <= result["life_path"] <= 33

    def test_with_dashes(self):
        """Test date format with dashes."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1985-07-23")

        assert "life_path" in result
        assert "year_component" in result
        assert "month_component" in result
        assert "day_component" in result

    def test_without_dashes(self):
        """Test date format without dashes."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("19850723")

        assert "life_path" in result

    def test_master_number_detection(self):
        """Test is_master flag."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-01-15")

        assert "is_master" in result
        assert isinstance(result["is_master"], bool)

    def test_calculation_breakdown(self):
        """Test calculation string is included."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-01-15")

        assert "calculation" in result
        assert "->" in result["calculation"]

    def test_invalid_date_raises_error(self):
        """Invalid date should raise ValueError."""
        from backend_ai.app.numerology_logic import calculate_life_path

        with pytest.raises(ValueError):
            calculate_life_path("invalid")

        with pytest.raises(ValueError):
            calculate_life_path("199001")  # Too short


class TestCalculateExpressionNumber:
    """Tests for calculate_expression_number function."""

    def test_basic_calculation(self):
        """Test basic expression number calculation."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result = calculate_expression_number("John Doe")

        assert "expression" in result
        assert isinstance(result["expression"], int)
        assert 1 <= result["expression"] <= 33

    def test_letter_values_included(self):
        """Test letter values breakdown is included."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result = calculate_expression_number("ABC")

        assert "letter_values" in result
        assert len(result["letter_values"]) == 3
        # A=1, B=2, C=3
        assert result["letter_values"][0] == ("A", 1)
        assert result["letter_values"][1] == ("B", 2)
        assert result["letter_values"][2] == ("C", 3)

    def test_case_insensitive(self):
        """Test case insensitivity."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result1 = calculate_expression_number("John")
        result2 = calculate_expression_number("JOHN")
        result3 = calculate_expression_number("john")

        assert result1["expression"] == result2["expression"] == result3["expression"]

    def test_spaces_ignored(self):
        """Test spaces are ignored."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result1 = calculate_expression_number("John Doe")
        result2 = calculate_expression_number("JohnDoe")

        assert result1["expression"] == result2["expression"]

    def test_total_before_reduce(self):
        """Test total_before_reduce is included."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result = calculate_expression_number("ABC")

        assert "total_before_reduce" in result
        assert result["total_before_reduce"] == 6  # 1+2+3


class TestCalculateSoulUrge:
    """Tests for calculate_soul_urge function."""

    def test_basic_calculation(self):
        """Test basic soul urge calculation."""
        from backend_ai.app.numerology_logic import calculate_soul_urge

        result = calculate_soul_urge("John Doe")

        assert "soul_urge" in result
        assert isinstance(result["soul_urge"], int)

    def test_only_vowels_counted(self):
        """Test only vowels are counted."""
        from backend_ai.app.numerology_logic import calculate_soul_urge

        result = calculate_soul_urge("AEIOU")

        assert "vowel_values" in result
        assert len(result["vowel_values"]) == 5

    def test_consonants_excluded(self):
        """Test consonants are excluded."""
        from backend_ai.app.numerology_logic import calculate_soul_urge

        result = calculate_soul_urge("BCDFG")

        assert result["vowel_values"] == []
        assert result["total_before_reduce"] == 0


class TestCalculatePersonalityNumber:
    """Tests for calculate_personality_number function."""

    def test_basic_calculation(self):
        """Test basic personality number calculation."""
        from backend_ai.app.numerology_logic import calculate_personality_number

        result = calculate_personality_number("John Doe")

        assert "personality" in result
        assert isinstance(result["personality"], int)

    def test_only_consonants_counted(self):
        """Test only consonants are counted."""
        from backend_ai.app.numerology_logic import calculate_personality_number

        result = calculate_personality_number("BCDFG")

        assert "consonant_values" in result
        assert len(result["consonant_values"]) == 5

    def test_vowels_excluded(self):
        """Test vowels are excluded."""
        from backend_ai.app.numerology_logic import calculate_personality_number

        result = calculate_personality_number("AEIOU")

        assert result["consonant_values"] == []
        assert result["total_before_reduce"] == 0


class TestCalculatePersonalYear:
    """Tests for calculate_personal_year function."""

    def test_basic_calculation(self):
        """Test basic personal year calculation."""
        from backend_ai.app.numerology_logic import calculate_personal_year

        result = calculate_personal_year("1990-01-15", 2024)

        assert "personal_year" in result
        assert 1 <= result["personal_year"] <= 9

    def test_target_year_included(self):
        """Test target year is included in result."""
        from backend_ai.app.numerology_logic import calculate_personal_year

        result = calculate_personal_year("1990-01-15", 2025)

        assert result["target_year"] == 2025

    def test_default_current_year(self):
        """Test default to current year."""
        from backend_ai.app.numerology_logic import calculate_personal_year
        from datetime import datetime

        result = calculate_personal_year("1990-01-15")

        assert result["target_year"] == datetime.now().year


class TestPythagoreanMap:
    """Tests for Pythagorean letter mapping."""

    def test_all_letters_mapped(self):
        """Test all letters A-Z are mapped."""
        from backend_ai.app.numerology_logic import PYTHAGOREAN_MAP

        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            assert letter in PYTHAGOREAN_MAP
            assert 1 <= PYTHAGOREAN_MAP[letter] <= 9

    def test_specific_values(self):
        """Test specific letter values."""
        from backend_ai.app.numerology_logic import PYTHAGOREAN_MAP

        # First row: A=1, B=2, ..., I=9
        assert PYTHAGOREAN_MAP["A"] == 1
        assert PYTHAGOREAN_MAP["I"] == 9

        # Second row: J=1, K=2, ..., R=9
        assert PYTHAGOREAN_MAP["J"] == 1
        assert PYTHAGOREAN_MAP["R"] == 9

        # Third row: S=1, T=2, ...
        assert PYTHAGOREAN_MAP["S"] == 1
        assert PYTHAGOREAN_MAP["Z"] == 8


class TestMasterNumbers:
    """Tests for master number constants."""

    def test_master_numbers_set(self):
        """Test master numbers set contains correct values."""
        from backend_ai.app.numerology_logic import MASTER_NUMBERS

        assert 11 in MASTER_NUMBERS
        assert 22 in MASTER_NUMBERS
        assert 33 in MASTER_NUMBERS
        assert len(MASTER_NUMBERS) == 3


class TestVowelsSet:
    """Tests for vowels constant."""

    def test_vowels_set(self):
        """Test vowels set contains correct values."""
        from backend_ai.app.numerology_logic import VOWELS

        assert "A" in VOWELS
        assert "E" in VOWELS
        assert "I" in VOWELS
        assert "O" in VOWELS
        assert "U" in VOWELS
        assert "B" not in VOWELS
        assert "C" not in VOWELS


class TestKoreanStrokes:
    """Tests for Korean stroke count mapping."""

    def test_common_surnames_mapped(self):
        """Test common Korean surnames are mapped."""
        from backend_ai.app.numerology_logic import KOREAN_STROKES

        assert "김" in KOREAN_STROKES
        assert "이" in KOREAN_STROKES
        assert "박" in KOREAN_STROKES
        assert "최" in KOREAN_STROKES

    def test_stroke_counts_positive(self):
        """Test all stroke counts are positive integers."""
        from backend_ai.app.numerology_logic import KOREAN_STROKES

        for char, strokes in KOREAN_STROKES.items():
            assert isinstance(strokes, int)
            assert strokes > 0


class TestDataLoadingFunctions:
    """Tests for data loading functions."""

    def test_get_number_interpretation(self):
        """Test get_number_interpretation returns dict."""
        from backend_ai.app.numerology_logic import get_number_interpretation

        result = get_number_interpretation(1, "life_path")

        assert isinstance(result, dict)

    def test_get_saju_numerology_correlation(self):
        """Test get_saju_numerology_correlation returns proper structure."""
        from backend_ai.app.numerology_logic import get_saju_numerology_correlation

        result = get_saju_numerology_correlation(1, "wood")

        assert "element" in result
        assert "life_path" in result
        assert "harmony" in result
        assert "challenging" in result

    def test_get_therapeutic_question(self):
        """Test get_therapeutic_question returns string."""
        from backend_ai.app.numerology_logic import get_therapeutic_question

        result = get_therapeutic_question(1)

        assert isinstance(result, str)
        assert len(result) > 0


class TestNumerologyModuleExports:
    """Tests for module exports."""

    def test_reduce_to_single_importable(self):
        """reduce_to_single should be importable."""
        from backend_ai.app.numerology_logic import reduce_to_single
        assert callable(reduce_to_single)

    def test_calculate_life_path_importable(self):
        """calculate_life_path should be importable."""
        from backend_ai.app.numerology_logic import calculate_life_path
        assert callable(calculate_life_path)

    def test_calculate_expression_number_importable(self):
        """calculate_expression_number should be importable."""
        from backend_ai.app.numerology_logic import calculate_expression_number
        assert callable(calculate_expression_number)

    def test_calculate_soul_urge_importable(self):
        """calculate_soul_urge should be importable."""
        from backend_ai.app.numerology_logic import calculate_soul_urge
        assert callable(calculate_soul_urge)

    def test_calculate_personality_number_importable(self):
        """calculate_personality_number should be importable."""
        from backend_ai.app.numerology_logic import calculate_personality_number
        assert callable(calculate_personality_number)

    def test_calculate_personal_year_importable(self):
        """calculate_personal_year should be importable."""
        from backend_ai.app.numerology_logic import calculate_personal_year
        assert callable(calculate_personal_year)
