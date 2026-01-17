"""
Unit tests for Chart Generator module.

Tests:
- Zodiac and planet symbol constants
- Element color mappings
- Heavenly stem and earthly branch constants
- get_stem_element helper
- get_branch_element helper
- generate_saju_table_svg function
- generate_element_bar function
- generate_natal_chart_svg function
"""
import pytest


class TestChartGeneratorConstants:
    """Tests for chart generator constants."""

    def test_zodiac_symbols_complete(self):
        """Test all 12 zodiac symbols are defined."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS

        expected_signs = [
            "Aries", "Taurus", "Gemini", "Cancer",
            "Leo", "Virgo", "Libra", "Scorpio",
            "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        for sign in expected_signs:
            assert sign in ZODIAC_SYMBOLS
            assert len(ZODIAC_SYMBOLS[sign]) > 0

    def test_planet_symbols_complete(self):
        """Test major planet symbols are defined."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        expected_planets = [
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
        ]
        for planet in expected_planets:
            assert planet in PLANET_SYMBOLS

    def test_element_colors_chinese(self):
        """Test Chinese element colors are defined."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS

        chinese_elements = ["木", "火", "土", "金", "水"]
        for elem in chinese_elements:
            assert elem in ELEMENT_COLORS
            assert ELEMENT_COLORS[elem].startswith("#")

    def test_element_colors_english(self):
        """Test English element colors are defined."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS

        english_elements = ["wood", "fire", "earth", "metal", "water"]
        for elem in english_elements:
            assert elem in ELEMENT_COLORS

    def test_heavenly_stems_complete(self):
        """Test all 10 heavenly stems are defined."""
        from backend_ai.app.chart_generator import HEAVENLY_STEMS

        assert len(HEAVENLY_STEMS) == 10
        expected = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
        assert HEAVENLY_STEMS == expected

    def test_earthly_branches_complete(self):
        """Test all 12 earthly branches are defined."""
        from backend_ai.app.chart_generator import EARTHLY_BRANCHES

        assert len(EARTHLY_BRANCHES) == 12
        expected = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        assert EARTHLY_BRANCHES == expected


class TestGetStemElement:
    """Tests for get_stem_element helper."""

    def test_wood_stems(self):
        """Test wood element stems."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("甲") == "木"
        assert get_stem_element("乙") == "木"

    def test_fire_stems(self):
        """Test fire element stems."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("丙") == "火"
        assert get_stem_element("丁") == "火"

    def test_earth_stems(self):
        """Test earth element stems."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("戊") == "土"
        assert get_stem_element("己") == "土"

    def test_metal_stems(self):
        """Test metal element stems."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("庚") == "金"
        assert get_stem_element("辛") == "金"

    def test_water_stems(self):
        """Test water element stems."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("壬") == "水"
        assert get_stem_element("癸") == "水"

    def test_unknown_stem(self):
        """Test unknown stem returns default."""
        from backend_ai.app.chart_generator import get_stem_element

        assert get_stem_element("X") == "土"


class TestGetBranchElement:
    """Tests for get_branch_element helper."""

    def test_water_branches(self):
        """Test water element branches."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("子") == "水"
        assert get_branch_element("亥") == "水"

    def test_wood_branches(self):
        """Test wood element branches."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("寅") == "木"
        assert get_branch_element("卯") == "木"

    def test_fire_branches(self):
        """Test fire element branches."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("巳") == "火"
        assert get_branch_element("午") == "火"

    def test_earth_branches(self):
        """Test earth element branches."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("丑") == "土"
        assert get_branch_element("辰") == "土"
        assert get_branch_element("未") == "土"
        assert get_branch_element("戌") == "土"

    def test_metal_branches(self):
        """Test metal element branches."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("申") == "金"
        assert get_branch_element("酉") == "金"

    def test_unknown_branch(self):
        """Test unknown branch returns default."""
        from backend_ai.app.chart_generator import get_branch_element

        assert get_branch_element("X") == "土"


class TestGenerateSajuTableSvg:
    """Tests for generate_saju_table_svg function."""

    def test_generates_svg_string(self):
        """Test function returns SVG string."""
        from backend_ai.app.chart_generator import generate_saju_table_svg

        pillars = {
            "year": "甲子",
            "month": "乙丑",
            "day": "丙寅",
            "time": "丁卯"
        }
        result = generate_saju_table_svg(pillars)

        assert isinstance(result, str)
        assert result.startswith("<svg")
        assert "</svg>" in result

    def test_contains_pillar_characters(self):
        """Test SVG contains pillar characters."""
        from backend_ai.app.chart_generator import generate_saju_table_svg

        pillars = {
            "year": "甲子",
            "month": "乙丑",
            "day": "丙寅",
            "time": "丁卯"
        }
        result = generate_saju_table_svg(pillars)

        assert "甲" in result
        assert "子" in result
        assert "丙" in result

    def test_with_day_master(self):
        """Test with day master data."""
        from backend_ai.app.chart_generator import generate_saju_table_svg

        pillars = {"year": "甲子", "month": "乙丑", "day": "丙寅", "time": "丁卯"}
        day_master = {"name": "丙", "element": "火", "strength": "strong"}

        result = generate_saju_table_svg(pillars, day_master=day_master)

        assert "丙" in result
        assert "日干" in result

    def test_with_five_elements(self):
        """Test with five elements data."""
        from backend_ai.app.chart_generator import generate_saju_table_svg

        pillars = {"year": "甲子", "month": "乙丑", "day": "丙寅", "time": "丁卯"}
        five_elements = {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}

        result = generate_saju_table_svg(pillars, five_elements=five_elements)

        assert "오행 균형" in result

    def test_empty_pillars(self):
        """Test with empty pillars."""
        from backend_ai.app.chart_generator import generate_saju_table_svg

        result = generate_saju_table_svg({})

        assert isinstance(result, str)
        assert "<svg" in result


class TestGenerateElementBar:
    """Tests for generate_element_bar function."""

    def test_generates_svg_fragment(self):
        """Test function returns SVG fragment."""
        from backend_ai.app.chart_generator import generate_element_bar

        elements = {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}
        result = generate_element_bar(elements, y_start=250, width=400)

        assert isinstance(result, str)
        assert "rect" in result
        assert "text" in result

    def test_contains_element_labels(self):
        """Test SVG contains element labels."""
        from backend_ai.app.chart_generator import generate_element_bar

        elements = {"木": 2, "火": 1}
        result = generate_element_bar(elements, y_start=250, width=400)

        assert "木" in result
        assert "火" in result

    def test_empty_elements(self):
        """Test with empty elements."""
        from backend_ai.app.chart_generator import generate_element_bar

        result = generate_element_bar({}, y_start=250, width=400)

        assert isinstance(result, str)


class TestGenerateNatalChartSvg:
    """Tests for generate_natal_chart_svg function."""

    def test_generates_svg_string(self):
        """Test function returns SVG string."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg

        planets = [
            {"name": "Sun", "longitude": 45.5, "sign": "Taurus"},
            {"name": "Moon", "longitude": 120.0, "sign": "Leo"}
        ]
        result = generate_natal_chart_svg(planets)

        assert isinstance(result, str)
        assert result.startswith("<svg")
        assert "</svg>" in result

    def test_contains_zodiac_divisions(self):
        """Test SVG contains zodiac divisions."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg

        planets = [{"name": "Sun", "longitude": 45.5, "sign": "Taurus"}]
        result = generate_natal_chart_svg(planets)

        # Should contain circle elements for wheel
        assert "circle" in result

    def test_with_ascendant(self):
        """Test with ascendant parameter."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg

        planets = [{"name": "Sun", "longitude": 45.5}]
        result = generate_natal_chart_svg(planets, ascendant=30.0)

        assert isinstance(result, str)

    def test_with_custom_size(self):
        """Test with custom size."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg

        planets = [{"name": "Sun", "longitude": 45.5}]
        result = generate_natal_chart_svg(planets, size=500)

        assert "500" in result

    def test_empty_planets(self):
        """Test with empty planets list."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg

        result = generate_natal_chart_svg([])

        assert isinstance(result, str)
        assert "<svg" in result


class TestZodiacSymbolsMapping:
    """Tests for zodiac symbol correctness."""

    def test_aries_symbol(self):
        """Test Aries symbol."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS

        assert ZODIAC_SYMBOLS["Aries"] == "♈"

    def test_taurus_symbol(self):
        """Test Taurus symbol."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS

        assert ZODIAC_SYMBOLS["Taurus"] == "♉"

    def test_gemini_symbol(self):
        """Test Gemini symbol."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS

        assert ZODIAC_SYMBOLS["Gemini"] == "♊"

    def test_cancer_symbol(self):
        """Test Cancer symbol."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS

        assert ZODIAC_SYMBOLS["Cancer"] == "♋"


class TestPlanetSymbolsMapping:
    """Tests for planet symbol correctness."""

    def test_sun_symbol(self):
        """Test Sun symbol."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        assert PLANET_SYMBOLS["Sun"] == "☉"

    def test_moon_symbol(self):
        """Test Moon symbol."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        assert PLANET_SYMBOLS["Moon"] == "☽"

    def test_mercury_symbol(self):
        """Test Mercury symbol."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        assert PLANET_SYMBOLS["Mercury"] == "☿"

    def test_venus_symbol(self):
        """Test Venus symbol."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        assert PLANET_SYMBOLS["Venus"] == "♀"

    def test_mars_symbol(self):
        """Test Mars symbol."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS

        assert PLANET_SYMBOLS["Mars"] == "♂"


class TestElementColorValues:
    """Tests for element color values."""

    def test_wood_color_is_green(self):
        """Test wood element color is green."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS

        assert ELEMENT_COLORS["木"] == "#4CAF50"
        assert ELEMENT_COLORS["wood"] == "#4CAF50"

    def test_fire_color_is_red(self):
        """Test fire element color is red."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS

        assert ELEMENT_COLORS["火"] == "#F44336"
        assert ELEMENT_COLORS["fire"] == "#F44336"

    def test_water_color_is_blue(self):
        """Test water element color is blue."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS

        assert ELEMENT_COLORS["水"] == "#2196F3"
        assert ELEMENT_COLORS["water"] == "#2196F3"


class TestModuleExports:
    """Tests for module exports."""

    def test_zodiac_symbols_importable(self):
        """ZODIAC_SYMBOLS should be importable."""
        from backend_ai.app.chart_generator import ZODIAC_SYMBOLS
        assert ZODIAC_SYMBOLS is not None

    def test_planet_symbols_importable(self):
        """PLANET_SYMBOLS should be importable."""
        from backend_ai.app.chart_generator import PLANET_SYMBOLS
        assert PLANET_SYMBOLS is not None

    def test_element_colors_importable(self):
        """ELEMENT_COLORS should be importable."""
        from backend_ai.app.chart_generator import ELEMENT_COLORS
        assert ELEMENT_COLORS is not None

    def test_generate_saju_table_svg_importable(self):
        """generate_saju_table_svg should be importable."""
        from backend_ai.app.chart_generator import generate_saju_table_svg
        assert generate_saju_table_svg is not None

    def test_generate_natal_chart_svg_importable(self):
        """generate_natal_chart_svg should be importable."""
        from backend_ai.app.chart_generator import generate_natal_chart_svg
        assert generate_natal_chart_svg is not None

    def test_get_stem_element_importable(self):
        """get_stem_element should be importable."""
        from backend_ai.app.chart_generator import get_stem_element
        assert get_stem_element is not None

    def test_get_branch_element_importable(self):
        """get_branch_element should be importable."""
        from backend_ai.app.chart_generator import get_branch_element
        assert get_branch_element is not None
