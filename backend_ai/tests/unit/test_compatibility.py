"""
Unit tests for Compatibility module.

Tests:
- Helper functions
- Constants
- Scoring functions
"""
import pytest


class TestCompatibilityHelpers:
    """Tests for compatibility helper functions."""

    def test_get_sign_midpoint_aries(self):
        """Get midpoint for Aries."""
        from app.compatibility.helpers import get_sign_midpoint

        midpoint = get_sign_midpoint("aries")
        # Aries starts at 0°, midpoint is 15°
        assert midpoint == 15.0

    def test_get_sign_midpoint_taurus(self):
        """Get midpoint for Taurus."""
        from app.compatibility.helpers import get_sign_midpoint

        midpoint = get_sign_midpoint("taurus")
        # Taurus starts at 30°, midpoint is 45°
        assert midpoint == 45.0

    def test_get_sign_midpoint_pisces(self):
        """Get midpoint for Pisces."""
        from app.compatibility.helpers import get_sign_midpoint

        midpoint = get_sign_midpoint("pisces")
        # Pisces starts at 330°, midpoint is 345°
        assert midpoint == 345.0

    def test_get_sign_midpoint_case_insensitive(self):
        """Sign lookup should be case-insensitive."""
        from app.compatibility.helpers import get_sign_midpoint

        midpoint1 = get_sign_midpoint("ARIES")
        midpoint2 = get_sign_midpoint("Aries")
        midpoint3 = get_sign_midpoint("aries")
        assert midpoint1 == midpoint2 == midpoint3

    def test_get_sign_midpoint_unknown(self):
        """Unknown sign should return 15 (0 + 15)."""
        from app.compatibility.helpers import get_sign_midpoint

        midpoint = get_sign_midpoint("unknown")
        assert midpoint == 15.0

    def test_calculate_aspect_conjunction(self):
        """Calculate conjunction aspect (0°)."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 5)
        assert result["aspect"] == "conjunction"
        assert result["score"] > 0

    def test_calculate_aspect_opposition(self):
        """Calculate opposition aspect (180°)."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 180)
        assert result["aspect"] == "opposition"

    def test_calculate_aspect_trine(self):
        """Calculate trine aspect (120°)."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 120)
        assert result["aspect"] == "trine"
        assert result["score"] > 0

    def test_calculate_aspect_square(self):
        """Calculate square aspect (90°)."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 90)
        assert result["aspect"] == "square"

    def test_calculate_aspect_sextile(self):
        """Calculate sextile aspect (60°)."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 60)
        assert result["aspect"] == "sextile"
        assert result["score"] > 0

    def test_calculate_aspect_none(self):
        """No major aspect for arbitrary angle."""
        from app.compatibility.helpers import calculate_aspect

        result = calculate_aspect(0, 35)  # Not a major aspect
        assert result["aspect"] == "none"
        assert result["score"] == 0

    def test_calculate_aspect_wraparound(self):
        """Handle degree wraparound (e.g., 350° and 10°)."""
        from app.compatibility.helpers import calculate_aspect

        # 350° and 10° should be 20° apart, not 340°
        result = calculate_aspect(350, 10)
        # Should not be opposition (180°)
        assert result["aspect"] != "opposition"

    def test_get_current_month_branch(self):
        """Get current month branch."""
        from app.compatibility.helpers import get_current_month_branch

        branch = get_current_month_branch()
        # Should return a valid earthly branch (Korean or Chinese)
        valid_branches_ko = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
        valid_branches_cn = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        assert branch in valid_branches_ko or branch in valid_branches_cn


class TestCompatibilityConstants:
    """Tests for compatibility constants."""

    def test_zodiac_degrees_complete(self):
        """All 12 zodiac signs should be defined."""
        from app.compatibility.constants import ZODIAC_DEGREES

        signs = [
            "aries", "taurus", "gemini", "cancer",
            "leo", "virgo", "libra", "scorpio",
            "sagittarius", "capricorn", "aquarius", "pisces"
        ]
        for sign in signs:
            assert sign in ZODIAC_DEGREES

    def test_aspects_defined(self):
        """Major aspects should be defined."""
        from app.compatibility.constants import ASPECTS

        required_aspects = ["conjunction", "opposition", "trine", "square", "sextile"]
        for aspect in required_aspects:
            assert aspect in ASPECTS
            assert "angle" in ASPECTS[aspect]
            assert "orb" in ASPECTS[aspect]

    def test_planet_synastry_weight(self):
        """Planet synastry weights should be defined."""
        from app.compatibility.constants import PLANET_SYNASTRY_WEIGHT

        # Synastry weights use planet pairs like 'sun_moon', 'venus_mars'
        assert len(PLANET_SYNASTRY_WEIGHT) > 0
        # Check some important pairs
        important_pairs = ["sun_moon", "venus_mars", "sun_sun", "moon_moon"]
        for pair in important_pairs:
            assert pair in PLANET_SYNASTRY_WEIGHT

    def test_branch_elements(self):
        """Earthly branch elements should be defined."""
        from app.compatibility.constants import BRANCH_ELEMENTS

        # BRANCH_ELEMENTS uses Chinese characters (한자)
        branches_cn = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        for branch in branches_cn:
            assert branch in BRANCH_ELEMENTS

    def test_month_branches(self):
        """Month branches should be defined for 12 months."""
        from app.compatibility.constants import MONTH_BRANCHES

        assert len(MONTH_BRANCHES) >= 12


class TestCompatibilityScoring:
    """Tests for compatibility scoring functions."""

    def test_scoring_module_imports(self):
        """Scoring module should be importable."""
        from app.compatibility import scoring
        assert scoring is not None

    def test_element_relationships(self):
        """Test element support/control relationships."""
        from app.compatibility.helpers import element_supports, element_controls

        # Wood supports Fire (木生火)
        assert element_supports("wood", "fire") is True
        # Fire supports Earth (火生土)
        assert element_supports("fire", "earth") is True

        # Water controls Fire (水克火)
        assert element_controls("water", "fire") is True
        # Fire controls Metal (火克金)
        assert element_controls("fire", "metal") is True


class TestCompatibilityModuleStructure:
    """Tests for compatibility module structure."""

    def test_init_exports(self):
        """Test compatibility __init__ exports."""
        from app.compatibility import (
            calculate_aspect,
            get_sign_midpoint,
        )
        assert callable(calculate_aspect)
        assert callable(get_sign_midpoint)

    def test_analysis_module_exists(self):
        """Analysis module should exist."""
        from app.compatibility import analysis
        assert analysis is not None

    def test_synastry_module_exists(self):
        """Synastry module should exist."""
        from app.compatibility import synastry
        assert synastry is not None

    def test_prompts_module_exists(self):
        """Prompts module should exist."""
        from app.compatibility import prompts
        assert prompts is not None
