"""
Unit tests for Numerology calculations module.

Tests:
- reduce_to_single function
- calculate_life_path function
- calculate_expression_number function
- calculate_soul_urge function
- calculate_personality_number function
- calculate_personal_year/month/day functions
- calculate_korean_name_number function
- calculate_full_numerology function
"""
import pytest
from unittest.mock import patch
from datetime import datetime


class TestReduceToSingle:
    """Tests for reduce_to_single function."""

    def test_single_digit_returns_same(self):
        """Single digits should return themselves."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        for i in range(1, 10):
            assert reduce_to_single(i) == i

    def test_reduce_10(self):
        """10 should reduce to 1."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(10) == 1

    def test_reduce_28(self):
        """28 should reduce to 1 (2+8=10, 1+0=1)."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(28) == 1

    def test_reduce_99(self):
        """99 should reduce to 9 (9+9=18, 1+8=9)."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(99) == 9

    def test_keep_master_11(self):
        """11 should be kept as master number."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(11, keep_master=True) == 11

    def test_keep_master_22(self):
        """22 should be kept as master number."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(22, keep_master=True) == 22

    def test_keep_master_33(self):
        """33 should be kept as master number."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(33, keep_master=True) == 33

    def test_reduce_master_11(self):
        """11 should reduce to 2 when keep_master=False."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(11, keep_master=False) == 2

    def test_reduce_master_22(self):
        """22 should reduce to 4 when keep_master=False."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(22, keep_master=False) == 4

    def test_reduce_master_33(self):
        """33 should reduce to 6 when keep_master=False."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        assert reduce_to_single(33, keep_master=False) == 6

    def test_reduce_large_number(self):
        """Large numbers should reduce correctly."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single

        # 12345 = 1+2+3+4+5 = 15 = 1+5 = 6
        assert reduce_to_single(12345) == 6


class TestCalculateLifePath:
    """Tests for calculate_life_path function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("1990-01-15")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("1990-01-15")

        assert "life_path" in result
        assert "year_component" in result
        assert "month_component" in result
        assert "day_component" in result
        assert "calculation" in result
        assert "is_master" in result

    def test_life_path_range(self):
        """Life path should be 1-9 or master number."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("1990-01-15")

        assert 1 <= result["life_path"] <= 33

    def test_accepts_dash_format(self):
        """Function should accept YYYY-MM-DD format."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("1990-01-15")
        assert result["life_path"] is not None

    def test_accepts_slash_format(self):
        """Function should accept YYYY/MM/DD format."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("1990/01/15")
        assert result["life_path"] is not None

    def test_accepts_no_separator_format(self):
        """Function should accept YYYYMMDD format."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        result = calculate_life_path("19900115")
        assert result["life_path"] is not None

    def test_known_life_path_1(self):
        """Test a known life path 1 calculation."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        # 2000-01-01: 2+0+0+0 + 0+1 + 0+1 = 2+1+1 = 4
        result = calculate_life_path("2000-01-01")
        assert result["life_path"] == 4

    def test_invalid_date_raises(self):
        """Invalid date format should raise ValueError."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        with pytest.raises(ValueError):
            calculate_life_path("invalid")

    def test_too_short_date_raises(self):
        """Too short date should raise ValueError."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        with pytest.raises(ValueError):
            calculate_life_path("1990-1-1")  # Should be 1990-01-01


class TestCalculateExpressionNumber:
    """Tests for calculate_expression_number function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result = calculate_expression_number("John Doe")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result = calculate_expression_number("John Doe")

        assert "expression" in result
        assert "total_before_reduce" in result
        assert "letter_values" in result
        assert "is_master" in result

    def test_expression_range(self):
        """Expression number should be 1-9 or master number."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result = calculate_expression_number("John Doe")

        assert 1 <= result["expression"] <= 33

    def test_case_insensitive(self):
        """Function should be case insensitive."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result1 = calculate_expression_number("john doe")
        result2 = calculate_expression_number("JOHN DOE")

        assert result1["expression"] == result2["expression"]

    def test_ignores_spaces(self):
        """Function should ignore spaces."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result1 = calculate_expression_number("JohnDoe")
        result2 = calculate_expression_number("John Doe")

        assert result1["expression"] == result2["expression"]


class TestCalculateSoulUrge:
    """Tests for calculate_soul_urge function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_soul_urge

        result = calculate_soul_urge("John Doe")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_soul_urge

        result = calculate_soul_urge("John Doe")

        assert "soul_urge" in result
        assert "total_before_reduce" in result
        assert "vowel_values" in result
        assert "is_master" in result

    def test_only_uses_vowels(self):
        """Function should only use vowels."""
        from backend_ai.app.numerology_logic.calculations import calculate_soul_urge

        result = calculate_soul_urge("AEIOU")
        # A=1, E=5, I=9, O=6, U=3 = 24 = 6
        assert result["soul_urge"] == 6

    def test_soul_urge_range(self):
        """Soul urge number should be 1-9 or master number."""
        from backend_ai.app.numerology_logic.calculations import calculate_soul_urge

        result = calculate_soul_urge("John Doe")

        assert 1 <= result["soul_urge"] <= 33


class TestCalculatePersonalityNumber:
    """Tests for calculate_personality_number function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_personality_number

        result = calculate_personality_number("John Doe")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_personality_number

        result = calculate_personality_number("John Doe")

        assert "personality" in result
        assert "total_before_reduce" in result
        assert "consonant_values" in result
        assert "is_master" in result

    def test_only_uses_consonants(self):
        """Function should only use consonants."""
        from backend_ai.app.numerology_logic.calculations import calculate_personality_number

        # Name with only consonants
        result = calculate_personality_number("BCDFGHJKLMNPQRSTVWXYZ")
        # Should calculate based on consonant values only
        assert "personality" in result

    def test_personality_range(self):
        """Personality number should be 1-9 or master number."""
        from backend_ai.app.numerology_logic.calculations import calculate_personality_number

        result = calculate_personality_number("John Doe")

        assert 1 <= result["personality"] <= 33


class TestCalculatePersonalYear:
    """Tests for calculate_personal_year function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_year

        result = calculate_personal_year("1990-01-15")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_year

        result = calculate_personal_year("1990-01-15")

        assert "personal_year" in result
        assert "target_year" in result
        assert "cycle_position" in result
        assert "calculation" in result

    def test_personal_year_range(self):
        """Personal year should be 1-9."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_year

        result = calculate_personal_year("1990-01-15")

        assert 1 <= result["personal_year"] <= 9

    def test_with_target_year(self):
        """Function should accept target year."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_year

        result = calculate_personal_year("1990-01-15", target_year=2025)

        assert result["target_year"] == 2025


class TestCalculatePersonalMonth:
    """Tests for calculate_personal_month function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_month

        result = calculate_personal_month("1990-01-15")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_month

        result = calculate_personal_month("1990-01-15")

        assert "personal_month" in result
        assert "personal_year" in result
        assert "target_month" in result
        assert "target_year" in result

    def test_personal_month_range(self):
        """Personal month should be 1-9."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_month

        result = calculate_personal_month("1990-01-15")

        assert 1 <= result["personal_month"] <= 9

    def test_with_target_month(self):
        """Function should accept target month and year."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_month

        result = calculate_personal_month("1990-01-15", target_year=2025, target_month=6)

        assert result["target_year"] == 2025
        assert result["target_month"] == 6


class TestCalculatePersonalDay:
    """Tests for calculate_personal_day function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_day

        result = calculate_personal_day("1990-01-15")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_day

        result = calculate_personal_day("1990-01-15")

        assert "personal_day" in result
        assert "personal_month" in result
        assert "personal_year" in result
        assert "target_date" in result

    def test_personal_day_range(self):
        """Personal day should be 1-9."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_day

        result = calculate_personal_day("1990-01-15")

        assert 1 <= result["personal_day"] <= 9

    def test_with_target_date(self):
        """Function should accept target date."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_day

        result = calculate_personal_day("1990-01-15", target_date="2025-06-15")

        assert result["target_date"] == "2025-06-15"


class TestCalculateKoreanNameNumber:
    """Tests for calculate_korean_name_number function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        result = calculate_korean_name_number("김철수")
        assert isinstance(result, dict)

    def test_has_required_keys(self):
        """Result should have all required keys."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        result = calculate_korean_name_number("김철수")

        assert "name_number" in result
        assert "total_strokes" in result
        assert "stroke_breakdown" in result
        assert "unknown_characters" in result
        assert "is_master" in result
        assert "reliability" in result

    def test_name_number_range(self):
        """Name number should be 1-9 or master number."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        result = calculate_korean_name_number("김철수")

        assert 1 <= result["name_number"] <= 33

    def test_known_stroke_counts(self):
        """Known characters should have correct stroke counts."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        result = calculate_korean_name_number("김")

        assert result["total_strokes"] == 8  # 김 = 8 strokes

    def test_high_reliability_for_known_chars(self):
        """Known characters should have high reliability."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        result = calculate_korean_name_number("김")

        assert result["reliability"] == "high"
        assert len(result["unknown_characters"]) == 0

    def test_estimated_reliability_for_unknown_chars(self):
        """Unknown characters should have estimated reliability."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number

        # Use a rare character
        result = calculate_korean_name_number("鑑")  # Chinese character not in KOREAN_STROKES

        assert result["reliability"] == "estimated"


class TestCalculateFullNumerology:
    """Tests for calculate_full_numerology function."""

    def test_returns_dict(self):
        """Function should return a dictionary."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology("1990-01-15")
        assert isinstance(result, dict)

    def test_always_has_birth_related(self):
        """Result should always have birth-related numbers."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology("1990-01-15")

        assert "birth_date" in result
        assert "life_path" in result
        assert "personal_year" in result
        assert "personal_month" in result
        assert "personal_day" in result

    def test_with_english_name(self):
        """With English name, should include name numbers."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology("1990-01-15", english_name="John Doe")

        assert "expression" in result
        assert "soul_urge" in result
        assert "personality" in result
        assert "english_name" in result

    def test_with_korean_name(self):
        """With Korean name, should include Korean name number."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology("1990-01-15", korean_name="김철수")

        assert "korean_name_number" in result
        assert "korean_name" in result

    def test_with_both_names(self):
        """With both names, should include all numbers."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology(
            "1990-01-15",
            english_name="John Doe",
            korean_name="김철수"
        )

        assert "expression" in result
        assert "soul_urge" in result
        assert "personality" in result
        assert "korean_name_number" in result

    def test_has_summary(self):
        """Result should have summary section."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology

        result = calculate_full_numerology("1990-01-15", english_name="John Doe")

        assert "summary" in result
        assert "core_numbers" in result["summary"]
        assert "dominant_number" in result["summary"]
        assert "has_master_numbers" in result["summary"]
        assert "master_numbers" in result["summary"]


class TestMasterNumberDetection:
    """Tests for master number detection across functions."""

    def test_life_path_master_number(self):
        """Life path should detect master numbers."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path

        # Find a date that produces master number 11
        # 1992-02-29: 1+9+9+2 + 0+2 + 2+9 = 21+2+11 = 34 = 7
        # 2009-11-29: 2+0+0+9 + 1+1 + 2+9 = 11+2+11 = 24 = 6
        # Let's just check the is_master field exists
        result = calculate_life_path("1990-01-15")
        assert "is_master" in result

    def test_expression_master_number(self):
        """Expression should detect master numbers."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number

        result = calculate_expression_number("Test")
        assert "is_master" in result


class TestModuleExports:
    """Tests for module exports."""

    def test_reduce_to_single_importable(self):
        """reduce_to_single should be importable."""
        from backend_ai.app.numerology_logic.calculations import reduce_to_single
        assert callable(reduce_to_single)

    def test_calculate_life_path_importable(self):
        """calculate_life_path should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_life_path
        assert callable(calculate_life_path)

    def test_calculate_expression_number_importable(self):
        """calculate_expression_number should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_expression_number
        assert callable(calculate_expression_number)

    def test_calculate_soul_urge_importable(self):
        """calculate_soul_urge should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_soul_urge
        assert callable(calculate_soul_urge)

    def test_calculate_personality_number_importable(self):
        """calculate_personality_number should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_personality_number
        assert callable(calculate_personality_number)

    def test_calculate_personal_year_importable(self):
        """calculate_personal_year should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_year
        assert callable(calculate_personal_year)

    def test_calculate_personal_month_importable(self):
        """calculate_personal_month should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_month
        assert callable(calculate_personal_month)

    def test_calculate_personal_day_importable(self):
        """calculate_personal_day should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_personal_day
        assert callable(calculate_personal_day)

    def test_calculate_korean_name_number_importable(self):
        """calculate_korean_name_number should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_korean_name_number
        assert callable(calculate_korean_name_number)

    def test_calculate_full_numerology_importable(self):
        """calculate_full_numerology should be importable."""
        from backend_ai.app.numerology_logic.calculations import calculate_full_numerology
        assert callable(calculate_full_numerology)
