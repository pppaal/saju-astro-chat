"""
Unit tests for Compatibility Constants module.

Tests:
- OHENG to Astro mappings
- Stem combinations and clashes
- Branch relationships (yukhap, samhap, banghap, chung)
- Zodiac elements
- Aspects
"""
import pytest


class TestOhengAstroMappings:
    """Tests for Oheng to Astro mapping constants."""

    def test_oheng_to_astro_exists(self):
        """OHENG_TO_ASTRO should exist."""
        from app.compatibility import OHENG_TO_ASTRO

        assert OHENG_TO_ASTRO is not None
        assert isinstance(OHENG_TO_ASTRO, dict)

    def test_astro_element_to_oheng_exists(self):
        """ASTRO_ELEMENT_TO_OHENG should exist."""
        from app.compatibility import ASTRO_ELEMENT_TO_OHENG

        assert ASTRO_ELEMENT_TO_OHENG is not None
        assert isinstance(ASTRO_ELEMENT_TO_OHENG, dict)


class TestStemConstants:
    """Tests for Stem combination constants."""

    def test_stem_combinations_exists(self):
        """STEM_COMBINATIONS should exist."""
        from app.compatibility import STEM_COMBINATIONS

        assert STEM_COMBINATIONS is not None

    def test_stem_clashes_exists(self):
        """STEM_CLASHES should exist."""
        from app.compatibility import STEM_CLASHES

        assert STEM_CLASHES is not None


class TestBranchRelationships:
    """Tests for Branch relationship constants."""

    def test_branch_yukhap_exists(self):
        """BRANCH_YUKHAP should exist."""
        from app.compatibility import BRANCH_YUKHAP

        assert BRANCH_YUKHAP is not None

    def test_branch_samhap_exists(self):
        """BRANCH_SAMHAP should exist."""
        from app.compatibility import BRANCH_SAMHAP

        assert BRANCH_SAMHAP is not None

    def test_branch_banghap_exists(self):
        """BRANCH_BANGHAP should exist."""
        from app.compatibility import BRANCH_BANGHAP

        assert BRANCH_BANGHAP is not None

    def test_branch_chung_exists(self):
        """BRANCH_CHUNG should exist."""
        from app.compatibility import BRANCH_CHUNG

        assert BRANCH_CHUNG is not None


class TestZodiacElements:
    """Tests for Zodiac elements constant."""

    def test_zodiac_elements_exists(self):
        """ZODIAC_ELEMENTS should exist."""
        from app.compatibility import ZODIAC_ELEMENTS

        assert ZODIAC_ELEMENTS is not None
        assert isinstance(ZODIAC_ELEMENTS, dict)


class TestAspects:
    """Tests for Aspects constant."""

    def test_aspects_exists(self):
        """ASPECTS should exist."""
        from app.compatibility import ASPECTS

        assert ASPECTS is not None


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_get_sign_midpoint_exists(self):
        """get_sign_midpoint should exist."""
        from app.compatibility import get_sign_midpoint

        assert callable(get_sign_midpoint)

    def test_calculate_aspect_exists(self):
        """calculate_aspect should exist."""
        from app.compatibility import calculate_aspect

        assert callable(calculate_aspect)

    def test_element_supports_exists(self):
        """element_supports should exist."""
        from app.compatibility import element_supports

        assert callable(element_supports)

    def test_element_controls_exists(self):
        """element_controls should exist."""
        from app.compatibility import element_controls

        assert callable(element_controls)

    def test_get_current_month_branch_exists(self):
        """get_current_month_branch should exist."""
        from app.compatibility import get_current_month_branch

        assert callable(get_current_month_branch)

    def test_determine_couple_type_exists(self):
        """determine_couple_type should exist."""
        from app.compatibility import determine_couple_type

        assert callable(determine_couple_type)


class TestAnalysisFunctions:
    """Tests for analysis functions."""

    def test_analyze_stem_compatibility_exists(self):
        """analyze_stem_compatibility should exist."""
        from app.compatibility import analyze_stem_compatibility

        assert callable(analyze_stem_compatibility)

    def test_analyze_branch_compatibility_exists(self):
        """analyze_branch_compatibility should exist."""
        from app.compatibility import analyze_branch_compatibility

        assert callable(analyze_branch_compatibility)

    def test_analyze_shinsal_compatibility_exists(self):
        """analyze_shinsal_compatibility should exist."""
        from app.compatibility import analyze_shinsal_compatibility

        assert callable(analyze_shinsal_compatibility)

    def test_analyze_house_compatibility_exists(self):
        """analyze_house_compatibility should exist."""
        from app.compatibility import analyze_house_compatibility

        assert callable(analyze_house_compatibility)


class TestSynastryFunctions:
    """Tests for synastry functions."""

    def test_analyze_venus_mars_synastry_exists(self):
        """analyze_venus_mars_synastry should exist."""
        from app.compatibility import analyze_venus_mars_synastry

        assert callable(analyze_venus_mars_synastry)

    def test_analyze_astro_compatibility_exists(self):
        """analyze_astro_compatibility should exist."""
        from app.compatibility import analyze_astro_compatibility

        assert callable(analyze_astro_compatibility)

    def test_analyze_asc_dsc_compatibility_exists(self):
        """analyze_asc_dsc_compatibility should exist."""
        from app.compatibility import analyze_asc_dsc_compatibility

        assert callable(analyze_asc_dsc_compatibility)


class TestScoringFunctions:
    """Tests for scoring functions."""

    def test_calculate_pair_score_exists(self):
        """calculate_pair_score should exist."""
        from app.compatibility import calculate_pair_score

        assert callable(calculate_pair_score)

    def test_calculate_group_synergy_score_exists(self):
        """calculate_group_synergy_score should exist."""
        from app.compatibility import calculate_group_synergy_score

        assert callable(calculate_group_synergy_score)

    def test_get_score_summary_exists(self):
        """get_score_summary should exist."""
        from app.compatibility import get_score_summary

        assert callable(get_score_summary)


class TestModuleExports:
    """Tests for module exports."""

    def test_all_constants_importable(self):
        """All constants should be importable from package."""
        from app.compatibility import (
            OHENG_TO_ASTRO,
            ASTRO_ELEMENT_TO_OHENG,
            STEM_COMBINATIONS,
            STEM_CLASHES,
            BRANCH_YUKHAP,
            BRANCH_SAMHAP,
            BRANCH_BANGHAP,
            BRANCH_CHUNG,
            ZODIAC_ELEMENTS,
            ASPECTS,
        )

        assert OHENG_TO_ASTRO is not None
        assert ASTRO_ELEMENT_TO_OHENG is not None
