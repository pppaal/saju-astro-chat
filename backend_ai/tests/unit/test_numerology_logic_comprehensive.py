"""
Unit tests for backend_ai/app/numerology_logic/

Tests:
- Constants and mappings
- Core calculation functions
- Life path, expression, soul urge calculations
- Personal year/month/day calculations
- Korean name numerology
- Compatibility calculations
"""
import pytest
from datetime import datetime


class TestPythagoreanMap:
    """Tests for PYTHAGOREAN_MAP constant."""

    def test_all_letters_present(self):
        """Should have all 26 letters."""
        from backend_ai.app.numerology_logic import PYTHAGOREAN_MAP

        import string
        for letter in string.ascii_uppercase:
            assert letter in PYTHAGOREAN_MAP

    def test_values_in_range(self):
        """Values should be 1-9."""
        from backend_ai.app.numerology_logic import PYTHAGOREAN_MAP

        for letter, value in PYTHAGOREAN_MAP.items():
            assert 1 <= value <= 9


class TestVowels:
    """Tests for VOWELS constant."""

    def test_vowels_present(self):
        """Should contain all vowels."""
        from backend_ai.app.numerology_logic import VOWELS

        expected = {'A', 'E', 'I', 'O', 'U'}
        assert VOWELS == expected


class TestMasterNumbers:
    """Tests for MASTER_NUMBERS constant."""

    def test_master_numbers_present(self):
        """Should contain master numbers."""
        from backend_ai.app.numerology_logic import MASTER_NUMBERS

        assert 11 in MASTER_NUMBERS
        assert 22 in MASTER_NUMBERS
        assert 33 in MASTER_NUMBERS


class TestKoreanStrokes:
    """Tests for KOREAN_STROKES constant."""

    def test_common_surnames(self):
        """Should have common Korean surnames."""
        from backend_ai.app.numerology_logic import KOREAN_STROKES

        surnames = ['김', '이', '박', '최', '정']
        for name in surnames:
            assert name in KOREAN_STROKES

    def test_stroke_counts_positive(self):
        """Stroke counts should be positive."""
        from backend_ai.app.numerology_logic import KOREAN_STROKES

        for char, strokes in KOREAN_STROKES.items():
            assert strokes > 0


class TestCompatibilityMatrix:
    """Tests for COMPATIBILITY_MATRIX constant."""

    def test_matrix_exists(self):
        """Should have compatibility matrix."""
        from backend_ai.app.numerology_logic import COMPATIBILITY_MATRIX

        assert len(COMPATIBILITY_MATRIX) > 0

    def test_scores_in_range(self):
        """Scores should be 0-100."""
        from backend_ai.app.numerology_logic import COMPATIBILITY_MATRIX

        for pair, score in COMPATIBILITY_MATRIX.items():
            assert 0 <= score <= 100


class TestReduceToSingle:
    """Tests for reduce_to_single function."""

    def test_single_digit_unchanged(self):
        """Single digit should remain unchanged."""
        from backend_ai.app.numerology_logic import reduce_to_single

        for i in range(1, 10):
            assert reduce_to_single(i) == i

    def test_two_digit_reduction(self):
        """Two digit numbers should reduce."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(28) == 1  # 2+8=10, 1+0=1
        assert reduce_to_single(19) == 1  # 1+9=10, 1+0=1

    def test_master_number_kept(self):
        """Master numbers should be kept with keep_master=True."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(11, keep_master=True) == 11
        assert reduce_to_single(22, keep_master=True) == 22
        assert reduce_to_single(33, keep_master=True) == 33

    def test_master_number_reduced(self):
        """Master numbers should reduce with keep_master=False."""
        from backend_ai.app.numerology_logic import reduce_to_single

        assert reduce_to_single(11, keep_master=False) == 2
        assert reduce_to_single(22, keep_master=False) == 4
        assert reduce_to_single(33, keep_master=False) == 6


class TestCalculateLifePath:
    """Tests for calculate_life_path function."""

    def test_basic_calculation(self):
        """Should calculate life path correctly."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-05-15")

        assert "life_path" in result
        assert 1 <= result["life_path"] <= 33

    def test_date_formats(self):
        """Should handle different date formats."""
        from backend_ai.app.numerology_logic import calculate_life_path

        r1 = calculate_life_path("1990-05-15")
        r2 = calculate_life_path("19900515")
        r3 = calculate_life_path("1990/05/15")

        assert r1["life_path"] == r2["life_path"]
        assert r1["life_path"] == r3["life_path"]

    def test_includes_components(self):
        """Should include component breakdown."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-05-15")

        assert "year_component" in result
        assert "month_component" in result
        assert "day_component" in result
        assert "calculation" in result

    def test_master_number_detection(self):
        """Should detect master numbers."""
        from backend_ai.app.numerology_logic import calculate_life_path

        result = calculate_life_path("1990-05-15")
        assert "is_master" in result

    def test_invalid_date_raises(self):
        """Should raise for invalid date."""
        from backend_ai.app.numerology_logic import calculate_life_path

        with pytest.raises(ValueError):
            calculate_life_path("invalid")


class TestCalculateExpressionNumber:
    """Tests for calculate_expression_number function."""

    def test_basic_calculation(self):
        """Should calculate expression number."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result = calculate_expression_number("John Doe")

        assert "expression" in result
        assert 1 <= result["expression"] <= 33

    def test_ignores_spaces(self):
        """Should ignore spaces."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        r1 = calculate_expression_number("John Doe")
        r2 = calculate_expression_number("JohnDoe")

        assert r1["expression"] == r2["expression"]

    def test_case_insensitive(self):
        """Should be case insensitive."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        r1 = calculate_expression_number("JOHN DOE")
        r2 = calculate_expression_number("john doe")

        assert r1["expression"] == r2["expression"]

    def test_includes_letter_values(self):
        """Should include letter breakdown."""
        from backend_ai.app.numerology_logic import calculate_expression_number

        result = calculate_expression_number("John")

        assert "letter_values" in result
        assert len(result["letter_values"]) == 4


class TestCalculateSoulUrge:
    """Tests for calculate_soul_urge function."""

    def test_basic_calculation(self):
        """Should calculate soul urge number."""
        from backend_ai.app.numerology_logic import calculate_soul_urge

        result = calculate_soul_urge("John Doe")

        assert "soul_urge" in result
        assert 1 <= result["soul_urge"] <= 33

    def test_vowels_only(self):
        """Should use vowels only."""
        from backend_ai.app.numerology_logic import calculate_soul_urge

        result = calculate_soul_urge("John")

        # Only O is a vowel
        assert len(result["vowel_values"]) == 1
        assert result["vowel_values"][0][0] == "O"


class TestCalculatePersonalityNumber:
    """Tests for calculate_personality_number function."""

    def test_basic_calculation(self):
        """Should calculate personality number."""
        from backend_ai.app.numerology_logic import calculate_personality_number

        result = calculate_personality_number("John Doe")

        assert "personality" in result
        assert 1 <= result["personality"] <= 33

    def test_consonants_only(self):
        """Should use consonants only."""
        from backend_ai.app.numerology_logic import calculate_personality_number

        result = calculate_personality_number("John")

        # J, H, N are consonants
        assert len(result["consonant_values"]) == 3


class TestCalculatePersonalYear:
    """Tests for calculate_personal_year function."""

    def test_basic_calculation(self):
        """Should calculate personal year."""
        from backend_ai.app.numerology_logic import calculate_personal_year

        result = calculate_personal_year("1990-05-15", 2024)

        assert "personal_year" in result
        assert 1 <= result["personal_year"] <= 9

    def test_uses_current_year_default(self):
        """Should use current year by default."""
        from backend_ai.app.numerology_logic import calculate_personal_year

        result = calculate_personal_year("1990-05-15")

        assert result["target_year"] == datetime.now().year

    def test_includes_cycle_position(self):
        """Should include cycle position."""
        from backend_ai.app.numerology_logic import calculate_personal_year

        result = calculate_personal_year("1990-05-15", 2024)

        assert "cycle_position" in result


class TestCalculatePersonalMonth:
    """Tests for calculate_personal_month function."""

    def test_basic_calculation(self):
        """Should calculate personal month."""
        from backend_ai.app.numerology_logic import calculate_personal_month

        result = calculate_personal_month("1990-05-15", 2024, 6)

        assert "personal_month" in result
        assert 1 <= result["personal_month"] <= 9

    def test_includes_personal_year(self):
        """Should include personal year."""
        from backend_ai.app.numerology_logic import calculate_personal_month

        result = calculate_personal_month("1990-05-15", 2024, 6)

        assert "personal_year" in result


class TestCalculatePersonalDay:
    """Tests for calculate_personal_day function."""

    def test_basic_calculation(self):
        """Should calculate personal day."""
        from backend_ai.app.numerology_logic import calculate_personal_day

        result = calculate_personal_day("1990-05-15", "2024-06-15")

        assert "personal_day" in result
        assert 1 <= result["personal_day"] <= 9

    def test_includes_hierarchy(self):
        """Should include month and year."""
        from backend_ai.app.numerology_logic import calculate_personal_day

        result = calculate_personal_day("1990-05-15", "2024-06-15")

        assert "personal_month" in result
        assert "personal_year" in result


class TestCalculateKoreanNameNumber:
    """Tests for calculate_korean_name_number function."""

    def test_basic_calculation(self):
        """Should calculate Korean name number."""
        from backend_ai.app.numerology_logic import calculate_korean_name_number

        result = calculate_korean_name_number("김민수")

        assert "name_number" in result
        assert 1 <= result["name_number"] <= 33

    def test_includes_stroke_breakdown(self):
        """Should include stroke breakdown."""
        from backend_ai.app.numerology_logic import calculate_korean_name_number

        result = calculate_korean_name_number("김민수")

        assert "stroke_breakdown" in result
        assert "total_strokes" in result

    def test_handles_unknown_characters(self):
        """Should handle unknown characters."""
        from backend_ai.app.numerology_logic import calculate_korean_name_number

        result = calculate_korean_name_number("김테스트")

        assert "unknown_characters" in result
        assert result["reliability"] in ["high", "estimated"]


class TestCalculateFullNumerology:
    """Tests for calculate_full_numerology function."""

    def test_basic_calculation(self):
        """Should calculate full numerology profile."""
        from backend_ai.app.numerology_logic import calculate_full_numerology

        result = calculate_full_numerology("1990-05-15")

        assert "life_path" in result
        assert "personal_year" in result
        assert "summary" in result

    def test_with_english_name(self):
        """Should include name numbers with English name."""
        from backend_ai.app.numerology_logic import calculate_full_numerology

        result = calculate_full_numerology("1990-05-15", english_name="John Doe")

        assert "expression" in result
        assert "soul_urge" in result
        assert "personality" in result

    def test_with_korean_name(self):
        """Should include Korean name number."""
        from backend_ai.app.numerology_logic import calculate_full_numerology

        result = calculate_full_numerology("1990-05-15", korean_name="김민수")

        assert "korean_name_number" in result

    def test_summary_includes_core_numbers(self):
        """Summary should include core numbers."""
        from backend_ai.app.numerology_logic import calculate_full_numerology

        result = calculate_full_numerology("1990-05-15", english_name="John Doe")

        assert "core_numbers" in result["summary"]
        assert "dominant_number" in result["summary"]
        assert "has_master_numbers" in result["summary"]


class TestNumerologyInterpreter:
    """Tests for NumerologyInterpreter class."""

    def test_class_importable(self):
        """NumerologyInterpreter should be importable."""
        from backend_ai.app.numerology_logic import NumerologyInterpreter
        assert NumerologyInterpreter is not None

    def test_create_interpreter(self):
        """Should create interpreter instance."""
        from backend_ai.app.numerology_logic import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        assert interpreter is not None


class TestGetNumberInterpretation:
    """Tests for get_number_interpretation function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import get_number_interpretation

        assert callable(get_number_interpretation)

    def test_returns_interpretation(self):
        """Should return interpretation for valid number."""
        from backend_ai.app.numerology_logic import get_number_interpretation

        result = get_number_interpretation(1)

        assert result is not None


class TestGetSajuNumerologyCorrelation:
    """Tests for get_saju_numerology_correlation function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import get_saju_numerology_correlation

        assert callable(get_saju_numerology_correlation)


class TestGetTherapeuticQuestion:
    """Tests for get_therapeutic_question function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import get_therapeutic_question

        assert callable(get_therapeutic_question)


class TestAnalyzeNumerology:
    """Tests for analyze_numerology function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import analyze_numerology

        assert callable(analyze_numerology)


class TestAnalyzeNumerologyCompatibility:
    """Tests for analyze_numerology_compatibility function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import analyze_numerology_compatibility

        assert callable(analyze_numerology_compatibility)


class TestCalculateNumerologyCompatibility:
    """Tests for calculate_numerology_compatibility function."""

    def test_function_callable(self):
        """Should be callable."""
        from backend_ai.app.numerology_logic import calculate_numerology_compatibility

        assert callable(calculate_numerology_compatibility)


class TestModuleExports:
    """Tests for module exports."""

    def test_pythagorean_map_importable(self):
        """PYTHAGOREAN_MAP should be importable."""
        from backend_ai.app.numerology_logic import PYTHAGOREAN_MAP
        assert isinstance(PYTHAGOREAN_MAP, dict)

    def test_vowels_importable(self):
        """VOWELS should be importable."""
        from backend_ai.app.numerology_logic import VOWELS
        assert isinstance(VOWELS, set)

    def test_master_numbers_importable(self):
        """MASTER_NUMBERS should be importable."""
        from backend_ai.app.numerology_logic import MASTER_NUMBERS
        assert isinstance(MASTER_NUMBERS, set)

    def test_korean_strokes_importable(self):
        """KOREAN_STROKES should be importable."""
        from backend_ai.app.numerology_logic import KOREAN_STROKES
        assert isinstance(KOREAN_STROKES, dict)

    def test_compatibility_matrix_importable(self):
        """COMPATIBILITY_MATRIX should be importable."""
        from backend_ai.app.numerology_logic import COMPATIBILITY_MATRIX
        assert isinstance(COMPATIBILITY_MATRIX, dict)

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

    def test_calculate_full_numerology_importable(self):
        """calculate_full_numerology should be importable."""
        from backend_ai.app.numerology_logic import calculate_full_numerology
        assert callable(calculate_full_numerology)

    def test_numerology_interpreter_importable(self):
        """NumerologyInterpreter should be importable."""
        from backend_ai.app.numerology_logic import NumerologyInterpreter
        assert NumerologyInterpreter is not None

