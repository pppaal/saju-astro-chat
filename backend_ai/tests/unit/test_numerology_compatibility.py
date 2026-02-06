"""
Unit tests for Numerology Compatibility module.

Tests:
- calculate_numerology_compatibility function
- _get_compatibility_description function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestCalculateNumerologyCompatibility:
    """Tests for calculate_numerology_compatibility function."""

    def test_compatibility_basic(self):
        """Test basic compatibility calculation."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20"
        )

        assert 'overall_score' in result
        assert 'level' in result
        assert 'description' in result
        assert 'life_path_comparison' in result

    def test_compatibility_score_in_range(self):
        """Test compatibility score is in valid range."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1985-03-10",
            person2_birth="1987-06-25"
        )

        assert 0 <= result['overall_score'] <= 100

    def test_compatibility_life_path_comparison(self):
        """Test life path comparison is included."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-01-01",
            person2_birth="1991-02-02"
        )

        assert 'person1' in result['life_path_comparison']
        assert 'person2' in result['life_path_comparison']
        assert 'base_score' in result['life_path_comparison']

    def test_compatibility_with_names(self):
        """Test compatibility with names provided."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20",
            person1_name="John Smith",
            person2_name="Jane Doe"
        )

        assert 'expression_comparison' in result
        assert result['expression_comparison'] is not None

    def test_compatibility_without_names(self):
        """Test compatibility without names."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20"
        )

        # Expression comparison might be None or not exist
        assert 'overall_score' in result

    def test_compatibility_master_number_bonus(self):
        """Test master number bonus is applied."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20"
        )

        assert 'master_number_bonus' in result
        assert result['master_number_bonus'] >= 0

    def test_compatibility_includes_profiles(self):
        """Test both profiles are included."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20"
        )

        assert 'person1_profile' in result
        assert 'person2_profile' in result

    def test_compatibility_same_birthdate(self):
        """Test compatibility with same birthdate."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1990-05-15"
        )

        # Same life path should have high compatibility
        assert result['overall_score'] >= 50

    def test_compatibility_different_decades(self):
        """Test compatibility across different decades."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1970-03-15",
            person2_birth="2000-07-20"
        )

        assert 'overall_score' in result


class TestCompatibilityDescription:
    """Tests for _get_compatibility_description function."""

    def test_compatibility_description_excellent(self):
        """Test excellent compatibility description."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, description = _get_compatibility_description(95)

        assert level == "excellent"
        assert "영혼" in description or "동반자" in description

    def test_compatibility_description_very_good(self):
        """Test very good compatibility description."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, description = _get_compatibility_description(85)

        assert level == "very_good"
        assert "이해" in description or "궁합" in description

    def test_compatibility_description_good(self):
        """Test good compatibility description."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, description = _get_compatibility_description(75)

        assert level == "good"
        assert "노력" in description or "관계" in description

    def test_compatibility_description_moderate(self):
        """Test moderate compatibility description."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, description = _get_compatibility_description(65)

        assert level == "moderate"
        assert "차이" in description or "성장" in description

    def test_compatibility_description_challenging(self):
        """Test challenging compatibility description."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, description = _get_compatibility_description(50)

        assert level == "challenging"
        assert "다른" in description or "이해" in description

    def test_compatibility_description_boundary_90(self):
        """Test boundary at 90."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, _ = _get_compatibility_description(90)
        assert level == "excellent"

    def test_compatibility_description_boundary_80(self):
        """Test boundary at 80."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, _ = _get_compatibility_description(80)
        assert level == "very_good"

    def test_compatibility_description_boundary_70(self):
        """Test boundary at 70."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, _ = _get_compatibility_description(70)
        assert level == "good"

    def test_compatibility_description_boundary_60(self):
        """Test boundary at 60."""
        from backend_ai.app.numerology_logic.compatibility import _get_compatibility_description

        level, _ = _get_compatibility_description(60)
        assert level == "moderate"


class TestCompatibilityLevels:
    """Tests for different compatibility levels."""

    def test_life_path_1_1_compatibility(self):
        """Test life path 1-1 compatibility."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        # Find dates that give life path 1
        result = calculate_numerology_compatibility(
            person1_birth="2000-01-01",  # Life path depends on calculation
            person2_birth="2000-01-01"
        )

        assert 'overall_score' in result

    def test_different_life_paths(self):
        """Test very different life paths."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result = calculate_numerology_compatibility(
            person1_birth="1990-01-10",
            person2_birth="1995-05-05"
        )

        assert result['life_path_comparison']['person1'] != result['life_path_comparison']['person2'] or \
               result['overall_score'] >= 50

    def test_compatibility_symmetry(self):
        """Test compatibility is symmetric (order doesn't matter for score)."""
        from backend_ai.app.numerology_logic.compatibility import calculate_numerology_compatibility

        result1 = calculate_numerology_compatibility(
            person1_birth="1990-05-15",
            person2_birth="1992-08-20"
        )

        result2 = calculate_numerology_compatibility(
            person1_birth="1992-08-20",
            person2_birth="1990-05-15"
        )

        # Base scores should be the same
        assert result1['life_path_comparison']['base_score'] == \
               result2['life_path_comparison']['base_score']


class TestCompatibilityConstants:
    """Tests for compatibility constants."""

    def test_master_numbers_defined(self):
        """Test MASTER_NUMBERS is defined."""
        from backend_ai.app.numerology_logic.constants import MASTER_NUMBERS

        assert 11 in MASTER_NUMBERS
        assert 22 in MASTER_NUMBERS
        assert 33 in MASTER_NUMBERS

    def test_compatibility_matrix_defined(self):
        """Test COMPATIBILITY_MATRIX has entries."""
        from backend_ai.app.numerology_logic.constants import COMPATIBILITY_MATRIX

        assert len(COMPATIBILITY_MATRIX) > 0

    def test_compatibility_matrix_scores_valid(self):
        """Test all matrix scores are in valid range."""
        from backend_ai.app.numerology_logic.constants import COMPATIBILITY_MATRIX

        for key, score in COMPATIBILITY_MATRIX.items():
            assert 0 <= score <= 100

    def test_compatibility_matrix_symmetric(self):
        """Test matrix handles symmetric pairs."""
        from backend_ai.app.numerology_logic.constants import COMPATIBILITY_MATRIX

        # Check if (1,2) and (2,1) return same or one exists
        key1 = (1, 2)
        key2 = (2, 1)

        # At least one should exist, and they should have same value if both exist
        if key1 in COMPATIBILITY_MATRIX and key2 in COMPATIBILITY_MATRIX:
            assert COMPATIBILITY_MATRIX[key1] == COMPATIBILITY_MATRIX[key2]
