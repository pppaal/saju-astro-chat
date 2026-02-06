"""
Unit tests for Numerology Interpreter module.

Tests:
- NumerologyInterpreter class
- Data loading functions
- analyze_numerology function
- analyze_numerology_compatibility function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestLoadNumerologyData:
    """Tests for _load_numerology_data function."""

    def test_load_numerology_data_returns_dict(self):
        """Test data loading returns dictionary."""
        from backend_ai.app.numerology_logic.interpreter import _load_numerology_data

        result = _load_numerology_data()
        assert isinstance(result, dict)

    def test_load_numerology_data_cached(self):
        """Test data is cached after first load."""
        from backend_ai.app.numerology_logic.interpreter import _load_numerology_data

        result1 = _load_numerology_data()
        result2 = _load_numerology_data()

        assert result1 is result2


class TestGetNumberInterpretation:
    """Tests for get_number_interpretation function."""

    def test_get_number_interpretation_basic(self):
        """Test getting interpretation for a number."""
        from backend_ai.app.numerology_logic.interpreter import get_number_interpretation

        result = get_number_interpretation(1)
        assert isinstance(result, dict)

    def test_get_number_interpretation_with_category(self):
        """Test getting interpretation with category."""
        from backend_ai.app.numerology_logic.interpreter import get_number_interpretation

        result = get_number_interpretation(5, category="life_path")
        assert isinstance(result, dict)

    def test_get_number_interpretation_unknown(self):
        """Test getting interpretation for unknown number."""
        from backend_ai.app.numerology_logic.interpreter import get_number_interpretation

        result = get_number_interpretation(999)
        assert isinstance(result, dict)


class TestGetSajuNumerologyCorrelation:
    """Tests for get_saju_numerology_correlation function."""

    def test_correlation_basic(self):
        """Test basic saju-numerology correlation."""
        from backend_ai.app.numerology_logic.interpreter import get_saju_numerology_correlation

        result = get_saju_numerology_correlation(1, "wood")

        assert "element" in result
        assert "life_path" in result
        assert "harmony" in result
        assert "challenging" in result

    def test_correlation_result_structure(self):
        """Test correlation result structure."""
        from backend_ai.app.numerology_logic.interpreter import get_saju_numerology_correlation

        result = get_saju_numerology_correlation(5, "fire")

        assert result["element"] == "fire"
        assert result["life_path"] == 5
        assert isinstance(result["harmony"], bool)
        assert isinstance(result["challenging"], bool)


class TestGetTherapeuticQuestion:
    """Tests for get_therapeutic_question function."""

    def test_therapeutic_question_basic(self):
        """Test getting therapeutic question."""
        from backend_ai.app.numerology_logic.interpreter import get_therapeutic_question

        result = get_therapeutic_question(1)

        assert isinstance(result, str)
        assert len(result) > 0

    def test_therapeutic_question_fallback(self):
        """Test fallback for unknown number."""
        from backend_ai.app.numerology_logic.interpreter import get_therapeutic_question

        result = get_therapeutic_question(99)

        assert "숫자" in result or "삶" in result


class TestNumerologyInterpreterInstantiation:
    """Tests for NumerologyInterpreter instantiation."""

    def test_interpreter_instantiation(self):
        """Test interpreter can be instantiated."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        assert interpreter is not None

    def test_interpreter_has_data_dir(self):
        """Test interpreter has data directory."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        assert interpreter.data_dir is not None


class TestGetLifePathMeaning:
    """Tests for get_life_path_meaning method."""

    def test_life_path_meaning_basic(self):
        """Test getting life path meaning."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_life_path_meaning(1)

        assert isinstance(result, dict)

    def test_life_path_meaning_master_number(self):
        """Test getting meaning for master number."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_life_path_meaning(11)

        assert isinstance(result, dict)

    def test_life_path_meaning_unknown(self):
        """Test getting meaning for unknown number."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_life_path_meaning(99)

        assert "meaning" in result


class TestGetPersonalYearMeaning:
    """Tests for get_personal_year_meaning method."""

    def test_personal_year_meaning_basic(self):
        """Test getting personal year meaning."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_personal_year_meaning(5)

        assert isinstance(result, dict)

    def test_personal_year_meaning_unknown(self):
        """Test fallback for unknown personal year."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_personal_year_meaning(99)

        assert "theme" in result or "focus" in result


class TestGetCompatibilityInsight:
    """Tests for get_compatibility_insight method."""

    def test_compatibility_insight_basic(self):
        """Test getting compatibility insight."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_compatibility_insight(1, 5)

        assert isinstance(result, dict)

    def test_compatibility_insight_reversed_order(self):
        """Test compatibility works with reversed order."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result1 = interpreter.get_compatibility_insight(1, 5)
        result2 = interpreter.get_compatibility_insight(5, 1)

        # Both should return valid results
        assert isinstance(result1, dict)
        assert isinstance(result2, dict)

    def test_compatibility_insight_fallback(self):
        """Test compatibility fallback for unknown pair."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        result = interpreter.get_compatibility_insight(99, 88)

        assert "compatibility" in result or "description" in result


class TestInterpretFullProfile:
    """Tests for interpret_full_profile method."""

    def test_interpret_full_profile_basic(self):
        """Test full profile interpretation."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        profile = {
            "life_path": {"life_path": 5},
            "personal_year": {"personal_year": 3},
            "expression": {"expression": 7}
        }

        result = interpreter.interpret_full_profile(profile)

        assert "numbers" in result
        assert "interpretations" in result

    def test_interpret_full_profile_with_soul_urge(self):
        """Test profile with soul urge."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        profile = {
            "life_path": {"life_path": 1},
            "soul_urge": {"soul_urge": 9}
        }

        result = interpreter.interpret_full_profile(profile)

        assert "soul_urge" in result["interpretations"] or len(result["interpretations"]) >= 1

    def test_interpret_full_profile_empty(self):
        """Test with empty profile."""
        from backend_ai.app.numerology_logic.interpreter import NumerologyInterpreter

        interpreter = NumerologyInterpreter()
        profile = {}

        result = interpreter.interpret_full_profile(profile)

        assert "numbers" in result
        assert "interpretations" in result


class TestAnalyzeNumerology:
    """Tests for analyze_numerology function."""

    def test_analyze_numerology_basic(self):
        """Test basic numerology analysis."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology("1990-05-15")

        assert result["status"] == "success"
        assert "profile" in result

    def test_analyze_numerology_with_name(self):
        """Test numerology analysis with name."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology(
            "1990-05-15",
            english_name="John Smith"
        )

        assert result["status"] == "success"

    def test_analyze_numerology_with_korean_name(self):
        """Test numerology analysis with Korean name."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology(
            "1990-05-15",
            korean_name="김철수"
        )

        assert result["status"] == "success"

    def test_analyze_numerology_with_locale(self):
        """Test numerology analysis with English locale."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology("1990-05-15", locale="en")

        assert result["status"] == "success"

    def test_analyze_numerology_has_interpretations(self):
        """Test analysis includes interpretations."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology("1990-05-15")

        assert "interpretations" in result


class TestAnalyzeNumerologyCompatibility:
    """Tests for analyze_numerology_compatibility function."""

    def test_analyze_compatibility_basic(self):
        """Test basic compatibility analysis."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology_compatibility

        result = analyze_numerology_compatibility(
            "1990-05-15",
            "1992-08-20"
        )

        assert result["status"] == "success"
        assert "compatibility" in result

    def test_analyze_compatibility_with_names(self):
        """Test compatibility analysis with names."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology_compatibility

        result = analyze_numerology_compatibility(
            "1990-05-15",
            "1992-08-20",
            person1_name="John",
            person2_name="Jane"
        )

        assert result["status"] == "success"

    def test_analyze_compatibility_has_pairing_insight(self):
        """Test compatibility includes pairing insight."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology_compatibility

        result = analyze_numerology_compatibility(
            "1990-05-15",
            "1992-08-20"
        )

        assert "pairing_insight" in result.get("compatibility", {})

    def test_analyze_compatibility_with_locale(self):
        """Test compatibility with locale."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology_compatibility

        result = analyze_numerology_compatibility(
            "1990-05-15",
            "1992-08-20",
            locale="en"
        )

        assert result["status"] == "success"


class TestErrorHandling:
    """Tests for error handling in interpreter functions."""

    def test_analyze_numerology_invalid_date(self):
        """Test error handling for invalid date."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology

        result = analyze_numerology("invalid-date")

        assert result["status"] == "error"
        assert "message" in result

    def test_analyze_compatibility_invalid_date(self):
        """Test compatibility error handling."""
        from backend_ai.app.numerology_logic.interpreter import analyze_numerology_compatibility

        result = analyze_numerology_compatibility(
            "invalid",
            "1990-05-15"
        )

        assert result["status"] == "error"
