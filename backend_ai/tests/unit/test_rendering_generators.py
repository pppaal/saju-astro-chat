"""
Unit tests for Rendering Generators module.

Tests:
- calculate_rating functions
- get_element_meaning function
- get_daeun_meaning function
- get_personalized_daeun_meaning function
- get_personalized_annual_meaning function
- get_yearly_transit_info function
- get_period_advice function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestCalculateRating:
    """Tests for calculate_rating function."""

    def test_calculate_rating_neutral(self):
        """Test neutral rating."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("earth", "비견")

        assert result == 3  # Default neutral

    def test_calculate_rating_positive_element(self):
        """Test positive element adds 1."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("wood", "비견")

        assert result == 4

    def test_calculate_rating_positive_god(self):
        """Test positive god adds 1."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("earth", "식신")

        assert result == 4

    def test_calculate_rating_both_positive(self):
        """Test both positive adds 2."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("fire", "정관")

        assert result == 5

    def test_calculate_rating_clamped_max(self):
        """Test rating is clamped to 5."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("목", "정재")

        assert result <= 5

    def test_calculate_rating_korean_elements(self):
        """Test Korean element names work."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("화", "비견")

        assert result == 4

    def test_calculate_rating_empty_inputs(self):
        """Test empty inputs return neutral."""
        from backend_ai.app.rendering.generators import calculate_rating

        result = calculate_rating("", "")

        assert result == 3


class TestCalculateRatingFromSibsin:
    """Tests for calculate_rating_from_sibsin function."""

    def test_calculate_rating_from_sibsin_neutral(self):
        """Test neutral sibsin pair."""
        from backend_ai.app.rendering.generators import calculate_rating_from_sibsin

        result = calculate_rating_from_sibsin("비견", "비견")

        assert result == 3

    def test_calculate_rating_from_sibsin_positive(self):
        """Test positive sibsin pair."""
        from backend_ai.app.rendering.generators import calculate_rating_from_sibsin

        result = calculate_rating_from_sibsin("식신", "정재")

        assert result == 4

    def test_calculate_rating_from_sibsin_negative(self):
        """Test negative sibsin pair."""
        from backend_ai.app.rendering.generators import calculate_rating_from_sibsin

        result = calculate_rating_from_sibsin("상관", "겁재")

        assert result == 2

    def test_calculate_rating_from_sibsin_mixed(self):
        """Test mixed sibsin pair."""
        from backend_ai.app.rendering.generators import calculate_rating_from_sibsin

        result = calculate_rating_from_sibsin("정관", "상관")

        assert result == 3

    def test_calculate_rating_from_sibsin_clamped_min(self):
        """Test rating is clamped to minimum 1."""
        from backend_ai.app.rendering.generators import calculate_rating_from_sibsin

        # Even with all negative, should not go below 1
        result = calculate_rating_from_sibsin("상관", "겁재")

        assert result >= 1


class TestGetElementMeaning:
    """Tests for get_element_meaning function."""

    def test_get_element_meaning_wood(self):
        """Test wood element meaning."""
        from backend_ai.app.rendering.generators import get_element_meaning

        result = get_element_meaning("wood")

        assert "성장" in result or "시작" in result

    def test_get_element_meaning_fire(self):
        """Test fire element meaning."""
        from backend_ai.app.rendering.generators import get_element_meaning

        result = get_element_meaning("fire")

        assert "열정" in result or "확장" in result

    def test_get_element_meaning_korean(self):
        """Test Korean element names."""
        from backend_ai.app.rendering.generators import get_element_meaning

        result = get_element_meaning("목")

        assert "성장" in result

    def test_get_element_meaning_unknown(self):
        """Test unknown element returns default."""
        from backend_ai.app.rendering.generators import get_element_meaning

        result = get_element_meaning("unknown")

        assert "변화" in result

    def test_get_element_meaning_empty(self):
        """Test empty element returns default."""
        from backend_ai.app.rendering.generators import get_element_meaning

        result = get_element_meaning("")

        assert "변화" in result


class TestGetDaeunMeaning:
    """Tests for get_daeun_meaning function."""

    def test_get_daeun_meaning_with_element_and_sibsin(self):
        """Test daeun meaning with both element and sibsin."""
        from backend_ai.app.rendering.generators import get_daeun_meaning

        result = get_daeun_meaning("목", "식신")

        assert "성장" in result or "발전" in result
        assert "창의력" in result or "표현력" in result

    def test_get_daeun_meaning_element_only(self):
        """Test daeun meaning with element only."""
        from backend_ai.app.rendering.generators import get_daeun_meaning

        result = get_daeun_meaning("화", "unknown")

        assert "활동" in result or "확장" in result

    def test_get_daeun_meaning_unknown_element(self):
        """Test daeun meaning with unknown element."""
        from backend_ai.app.rendering.generators import get_daeun_meaning

        result = get_daeun_meaning("unknown", "정관")

        assert "변화" in result

    def test_get_daeun_meaning_all_elements(self):
        """Test all elements have meanings."""
        from backend_ai.app.rendering.generators import get_daeun_meaning

        for element in ["목", "화", "토", "금", "수"]:
            result = get_daeun_meaning(element, "")
            assert len(result) > 0


class TestGetPersonalizedDaeunMeaning:
    """Tests for get_personalized_daeun_meaning function."""

    def test_personalized_daeun_meaning_structure(self):
        """Test personalized daeun meaning structure."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        result = get_personalized_daeun_meaning("식신", "정재", "목", 30, False)

        assert 'title' in result
        assert 'saju' in result
        assert 'astro' in result

    def test_personalized_daeun_meaning_current(self):
        """Test current daeun has special marker."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        result = get_personalized_daeun_meaning("식신", "정재", "목", 30, True)

        assert "🔥" in result['title']
        assert "지금!" in result['title']

    def test_personalized_daeun_meaning_not_current(self):
        """Test non-current daeun has no marker."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        result = get_personalized_daeun_meaning("식신", "정재", "목", 30, False)

        assert "🔥" not in result['title']

    def test_personalized_daeun_meaning_siksin(self):
        """Test siksin daeun meaning."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        result = get_personalized_daeun_meaning("식신", "", "목", 30, False)

        assert "창작" in result['title'] or "황금기" in result['title']

    def test_personalized_daeun_meaning_all_sibsin(self):
        """Test all sibsin have personalized meanings."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        sibsin_list = ["식신", "상관", "편재", "정재", "편관",
                      "정관", "편인", "정인", "비견", "겁재"]

        for sibsin in sibsin_list:
            result = get_personalized_daeun_meaning(sibsin, "", "목", 30, False)
            assert len(result['title']) > 0
            assert len(result['saju']) > 0

    def test_personalized_daeun_meaning_fallback(self):
        """Test fallback for unknown sibsin."""
        from backend_ai.app.rendering.generators import get_personalized_daeun_meaning

        result = get_personalized_daeun_meaning("unknown", "", "금", 40, False)

        assert "40세" in result['title']


class TestGetPersonalizedAnnualMeaning:
    """Tests for get_personalized_annual_meaning function."""

    def test_personalized_annual_meaning_structure(self):
        """Test personalized annual meaning structure."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        result = get_personalized_annual_meaning("식신", "정재", 2025, False)

        assert 'title' in result
        assert 'saju' in result
        assert 'astro' in result

    def test_personalized_annual_meaning_current_year(self):
        """Test current year has special marker."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        result = get_personalized_annual_meaning("식신", "정재", 2025, True)

        assert "⭐" in result['title']
        assert "올해" in result['title']

    def test_personalized_annual_meaning_not_current(self):
        """Test non-current year has no marker."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        result = get_personalized_annual_meaning("식신", "정재", 2025, False)

        assert "⭐" not in result['title']

    def test_personalized_annual_meaning_year_in_title(self):
        """Test year appears in title."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        result = get_personalized_annual_meaning("식신", "", 2025, False)

        assert "2025" in result['title']

    def test_personalized_annual_meaning_all_sibsin(self):
        """Test all sibsin have annual meanings."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        sibsin_list = ["식신", "상관", "편재", "정재", "편관",
                      "정관", "편인", "정인", "비견", "겁재"]

        for sibsin in sibsin_list:
            result = get_personalized_annual_meaning(sibsin, "", 2025, False)
            assert "2025" in result['title']

    def test_personalized_annual_meaning_fallback(self):
        """Test fallback for unknown sibsin."""
        from backend_ai.app.rendering.generators import get_personalized_annual_meaning

        result = get_personalized_annual_meaning("unknown", "", 2026, False)

        assert "2026" in result['title']


class TestGetYearlyTransitInfo:
    """Tests for get_yearly_transit_info function."""

    def test_yearly_transit_info_known_year(self):
        """Test transit info for known year."""
        from backend_ai.app.rendering.generators import get_yearly_transit_info

        result = get_yearly_transit_info(2025)

        assert "토성" in result or "목성" in result

    def test_yearly_transit_info_unknown_year(self):
        """Test transit info for unknown year."""
        from backend_ai.app.rendering.generators import get_yearly_transit_info

        result = get_yearly_transit_info(2035)

        assert "2035" in result

    def test_yearly_transit_info_with_astro_sun_sign(self):
        """Test transit info with sun sign from astro data."""
        from backend_ai.app.rendering.generators import get_yearly_transit_info

        astro = {
            'planets': [
                {'name': 'Sun', 'sign': 'Leo'}
            ]
        }

        result = get_yearly_transit_info(2025, astro)

        assert "사자자리" in result

    def test_yearly_transit_info_all_defined_years(self):
        """Test all defined years have transit info."""
        from backend_ai.app.rendering.generators import get_yearly_transit_info

        for year in range(2024, 2031):
            result = get_yearly_transit_info(year)
            assert len(result) > 10  # Should be substantial text


class TestGetPeriodAdvice:
    """Tests for get_period_advice function."""

    def test_period_advice_wealth_god(self):
        """Test advice for wealth god."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("목", "정재")

        assert "재물" in result

    def test_period_advice_officer_god(self):
        """Test advice for officer god."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("화", "정관")

        assert "직장" in result or "사회" in result

    def test_period_advice_seal_god(self):
        """Test advice for seal god."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("토", "정인")

        assert "학습" in result or "계발" in result

    def test_period_advice_wood_element(self):
        """Test advice for wood element."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("wood", "비견")

        assert "도전" in result or "시작" in result

    def test_period_advice_fire_element(self):
        """Test advice for fire element."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("fire", "비견")

        assert "적극" in result or "행동" in result

    def test_period_advice_default(self):
        """Test default advice."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("토", "비견")

        assert "변화" in result or "유연" in result

    def test_period_advice_empty_inputs(self):
        """Test advice with empty inputs."""
        from backend_ai.app.rendering.generators import get_period_advice

        result = get_period_advice("", "")

        assert "유연" in result or "대응" in result
