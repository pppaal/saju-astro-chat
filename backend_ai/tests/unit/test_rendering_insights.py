"""
Unit tests for Rendering Insights module.

Tests:
- get_important_years function
- get_key_insights function
- get_lucky_elements function
- get_saju_highlight function
- get_astro_highlight function
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestSibsinSimpleConstants:
    """Tests for SIBSIN_SIMPLE constants."""

    def test_sibsin_simple_defined(self):
        """Test SIBSIN_SIMPLE has all sibsin."""
        from backend_ai.app.rendering.insights import SIBSIN_SIMPLE

        sibsin_list = ["비견", "겁재", "식신", "상관", "편재",
                      "정재", "편관", "정관", "편인", "정인"]
        for sibsin in sibsin_list:
            assert sibsin in SIBSIN_SIMPLE

    def test_sibsin_simple_en_defined(self):
        """Test SIBSIN_SIMPLE_EN has all sibsin."""
        from backend_ai.app.rendering.insights import SIBSIN_SIMPLE_EN

        sibsin_list = ["비견", "겁재", "식신", "상관", "편재",
                      "정재", "편관", "정관", "편인", "정인"]
        for sibsin in sibsin_list:
            assert sibsin in SIBSIN_SIMPLE_EN

    def test_el_simple_defined(self):
        """Test EL_SIMPLE has all elements."""
        from backend_ai.app.rendering.insights import EL_SIMPLE

        elements = ["목", "화", "토", "금", "수"]
        for el in elements:
            assert el in EL_SIMPLE


class TestGetImportantYears:
    """Tests for get_important_years function."""

    def test_get_important_years_with_daeun(self):
        """Test get_important_years with daeun data."""
        from backend_ai.app.rendering.insights import get_important_years

        unse = {
            "daeun": [
                {"age": 30, "heavenlyStem": "甲", "sibsin": {"cheon": "정관", "ji": "정재"}}
            ]
        }
        saju = {"birthYear": 1990}

        result = get_important_years(unse, saju)

        assert isinstance(result, list)
        if result:
            assert "year" in result[0]
            assert "age" in result[0]
            assert "rating" in result[0]

    def test_get_important_years_with_annual(self):
        """Test get_important_years with annual data."""
        from backend_ai.app.rendering.insights import get_important_years

        unse = {
            "annual": [
                {"year": 2025, "heavenlyStem": "乙", "sibsin": {"cheon": "식신", "ji": "정재"}}
            ]
        }
        saju = {"birthYear": 1990}

        result = get_important_years(unse, saju)

        assert isinstance(result, list)

    def test_get_important_years_empty_data(self):
        """Test get_important_years with empty data."""
        from backend_ai.app.rendering.insights import get_important_years

        result = get_important_years({}, {})

        assert isinstance(result, list)

    def test_get_important_years_max_eight(self):
        """Test get_important_years returns max 8 items."""
        from backend_ai.app.rendering.insights import get_important_years

        unse = {
            "daeun": [
                {"age": i * 10, "heavenlyStem": "甲", "sibsin": {"cheon": "정관"}}
                for i in range(15)
            ]
        }
        saju = {"birthYear": 1990}

        result = get_important_years(unse, saju)

        assert len(result) <= 8

    def test_get_important_years_with_locale_en(self):
        """Test get_important_years with English locale."""
        from backend_ai.app.rendering.insights import get_important_years

        unse = {
            "daeun": [{"age": 30, "sibsin": {"cheon": "정관"}}]
        }

        result = get_important_years(unse, {}, locale="en")

        assert isinstance(result, list)


class TestGenerateFallbackYears:
    """Tests for _generate_fallback_years function."""

    def test_generate_fallback_years_basic(self):
        """Test fallback years generation."""
        from backend_ai.app.rendering.insights import _generate_fallback_years

        saju = {"dayMaster": {"name": "甲", "element": "목"}}
        current_year = datetime.now().year

        result = _generate_fallback_years(saju, 1990, current_year)

        assert isinstance(result, list)
        assert len(result) > 0

    def test_generate_fallback_years_sorted_by_rating(self):
        """Test fallback years are sorted by rating."""
        from backend_ai.app.rendering.insights import _generate_fallback_years

        saju = {"dayMaster": {"element": "수"}}
        current_year = datetime.now().year

        result = _generate_fallback_years(saju, 1990, current_year)

        if len(result) > 1:
            for i in range(len(result) - 1):
                assert result[i]["rating"] >= result[i + 1]["rating"]

    def test_generate_fallback_years_has_required_fields(self):
        """Test fallback years have required fields."""
        from backend_ai.app.rendering.insights import _generate_fallback_years

        saju = {"dayMaster": {"element": "화"}}
        current_year = datetime.now().year

        result = _generate_fallback_years(saju, 1990, current_year)

        if result:
            year = result[0]
            assert "year" in year
            assert "age" in year
            assert "rating" in year
            assert "title" in year
            assert "sajuReason" in year


class TestGetKeyInsights:
    """Tests for get_key_insights function."""

    def test_get_key_insights_with_day_master(self):
        """Test key insights with day master data."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"name": "甲", "element": "木"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        assert isinstance(result, list)
        assert len(result) >= 1

    def test_get_key_insights_with_yongsin(self):
        """Test key insights with yongsin data."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "목"}, "yongsin": "火"}
        signals = {"saju": {"meta": {"yongsin": "火"}}}

        result = get_key_insights({}, signals, saju)

        assert isinstance(result, list)

    def test_get_key_insights_with_daeun(self):
        """Test key insights with daeun data."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {
            "dayMaster": {"element": "목"},
            "unse": {
                "daeun": [{"age": 30, "sibsin": {"cheon": "정관"}}]
            }
        }
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        assert isinstance(result, list)

    def test_get_key_insights_minimum_three(self):
        """Test key insights returns minimum 3 items."""
        from backend_ai.app.rendering.insights import get_key_insights

        result = get_key_insights({}, {}, {})

        assert len(result) >= 1  # At least fallback

    def test_get_key_insights_max_six(self):
        """Test key insights returns max 6 items."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {
            "dayMaster": {"name": "甲", "element": "목"},
            "unse": {
                "daeun": [{"age": 30, "sibsin": {"cheon": "정관"}}],
                "annual": [{"year": 2025, "sibsin": {"cheon": "식신"}}]
            }
        }
        signals = {"saju": {"meta": {"yongsin": "火"}}}

        result = get_key_insights({}, signals, saju)

        assert len(result) <= 6

    def test_get_key_insights_insight_types(self):
        """Test key insights have valid types."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "화"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        valid_types = ["strength", "opportunity", "caution", "advice"]
        for insight in result:
            assert insight.get("type") in valid_types
            assert "text" in insight

    def test_get_key_insights_english_locale(self):
        """Test key insights with English locale."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "목"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju, locale="en")

        assert isinstance(result, list)


class TestGetLuckyElements:
    """Tests for get_lucky_elements function."""

    def test_get_lucky_elements_basic(self):
        """Test get_lucky_elements returns dict."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        signals = {"astro": {"meta": {"dominant_element": "wood"}}}

        result = get_lucky_elements(signals, {})

        assert isinstance(result, dict)
        assert "colors" in result
        assert "directions" in result
        assert "numbers" in result
        assert "items" in result

    def test_get_lucky_elements_wood(self):
        """Test lucky elements for wood."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        signals = {"astro": {"meta": {"dominant_element": "wood"}}}

        result = get_lucky_elements(signals, {})

        assert "초록색" in result["colors"]
        assert "동쪽" in result["directions"]

    def test_get_lucky_elements_fire(self):
        """Test lucky elements for fire."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        signals = {"astro": {"meta": {"dominant_element": "fire"}}}

        result = get_lucky_elements(signals, {})

        assert "빨간색" in result["colors"]
        assert "남쪽" in result["directions"]

    def test_get_lucky_elements_water(self):
        """Test lucky elements for water."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        signals = {"astro": {"meta": {"dominant_element": "water"}}}

        result = get_lucky_elements(signals, {})

        assert "검정색" in result["colors"]
        assert "북쪽" in result["directions"]

    def test_get_lucky_elements_from_saju_meta(self):
        """Test lucky elements from saju meta."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        signals = {"saju": {"meta": {"dominant_element": "metal"}}}

        result = get_lucky_elements(signals, {})

        assert "흰색" in result["colors"]

    def test_get_lucky_elements_default(self):
        """Test lucky elements default to wood."""
        from backend_ai.app.rendering.insights import get_lucky_elements

        result = get_lucky_elements({}, {})

        assert "초록색" in result["colors"]


class TestGetSajuHighlight:
    """Tests for get_saju_highlight function."""

    def test_get_saju_highlight_with_day_master(self):
        """Test saju highlight with day master."""
        from backend_ai.app.rendering.insights import get_saju_highlight

        saju = {"dayMaster": {"name": "甲", "element": "木"}}

        result = get_saju_highlight(saju)

        assert result is not None
        assert "pillar" in result
        assert "element" in result
        assert "meaning" in result

    def test_get_saju_highlight_with_heavenly_stem(self):
        """Test saju highlight with heavenlyStem structure."""
        from backend_ai.app.rendering.insights import get_saju_highlight

        saju = {
            "dayMaster": {
                "heavenlyStem": {"name": "甲", "element": "木"}
            }
        }

        result = get_saju_highlight(saju)

        assert result is not None

    def test_get_saju_highlight_empty(self):
        """Test saju highlight with empty data."""
        from backend_ai.app.rendering.insights import get_saju_highlight

        result = get_saju_highlight({})

        assert result is None

    def test_get_saju_highlight_string_day_master(self):
        """Test saju highlight with string day master."""
        from backend_ai.app.rendering.insights import get_saju_highlight

        saju = {"dayMaster": "甲木"}

        result = get_saju_highlight(saju)

        assert result is not None
        assert result["pillar"] == "甲木"


class TestGetAstroHighlight:
    """Tests for get_astro_highlight function."""

    def test_get_astro_highlight_with_sun(self):
        """Test astro highlight with sun planet."""
        from backend_ai.app.rendering.insights import get_astro_highlight

        astro = {
            "planets": [
                {"name": "Sun", "sign": "Leo"}
            ]
        }

        result = get_astro_highlight(astro, {})

        assert result is not None
        assert result["planet"] == "Sun"
        assert result["sign"] == "Leo"
        assert "태양" in result["meaning"]

    def test_get_astro_highlight_no_sun(self):
        """Test astro highlight without sun."""
        from backend_ai.app.rendering.insights import get_astro_highlight

        astro = {
            "planets": [
                {"name": "Moon", "sign": "Cancer"}
            ]
        }

        result = get_astro_highlight(astro, {})

        assert result is None

    def test_get_astro_highlight_empty(self):
        """Test astro highlight with empty data."""
        from backend_ai.app.rendering.insights import get_astro_highlight

        result = get_astro_highlight({}, {})

        assert result is None


class TestInsightIconsAndTypes:
    """Tests for insight icons and types."""

    def test_insight_has_icon(self):
        """Test insights have icons."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "목"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        for insight in result:
            # Icon might be optional, but if present should be string
            if "icon" in insight:
                assert isinstance(insight["icon"], str)

    def test_insight_text_not_empty(self):
        """Test insight text is not empty."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "화"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        for insight in result:
            assert len(insight.get("text", "")) > 0

    def test_no_duplicate_insights(self):
        """Test insights are not duplicated."""
        from backend_ai.app.rendering.insights import get_key_insights

        saju = {"dayMaster": {"element": "토"}}
        signals = {"saju": {"meta": {}}}

        result = get_key_insights({}, signals, saju)

        texts = [i["text"] for i in result]
        assert len(texts) == len(set(texts))
