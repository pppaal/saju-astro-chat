"""
Unit tests for Rendering Constants module.

Tests:
- SIBSIN_MEANINGS constant
"""
import pytest


class TestSibsinMeanings:
    """Tests for SIBSIN_MEANINGS constant."""

    def test_sibsin_meanings_exists(self):
        """SIBSIN_MEANINGS should exist."""
        from app.rendering.constants import SIBSIN_MEANINGS

        assert SIBSIN_MEANINGS is not None
        assert isinstance(SIBSIN_MEANINGS, dict)

    def test_sibsin_meanings_has_ten_gods(self):
        """SIBSIN_MEANINGS should have all 10 gods (십신)."""
        from app.rendering.constants import SIBSIN_MEANINGS

        expected_gods = [
            "비견", "겁재", "식신", "상관", "편재",
            "정재", "편관", "정관", "편인", "정인"
        ]

        for god in expected_gods:
            assert god in SIBSIN_MEANINGS, f"Missing: {god}"

    def test_sibsin_meanings_structure(self):
        """Each 십신 should have expected keys."""
        from app.rendering.constants import SIBSIN_MEANINGS

        expected_keys = ["meaning", "career", "love", "wealth", "timing"]

        for god, data in SIBSIN_MEANINGS.items():
            assert isinstance(data, dict), f"{god} should be a dict"
            for key in expected_keys:
                assert key in data, f"{god} missing key: {key}"

    def test_sibsin_bigyeon(self):
        """비견 should have correct structure."""
        from app.rendering.constants import SIBSIN_MEANINGS

        bigyeon = SIBSIN_MEANINGS["비견"]

        assert "경쟁" in bigyeon["meaning"] or "협력" in bigyeon["meaning"]
        assert isinstance(bigyeon["career"], str)
        assert len(bigyeon["career"]) > 0

    def test_sibsin_jeonggwan(self):
        """정관 should have correct structure."""
        from app.rendering.constants import SIBSIN_MEANINGS

        jeonggwan = SIBSIN_MEANINGS["정관"]

        assert "명예" in jeonggwan["meaning"] or "책임" in jeonggwan["meaning"]
        assert "승진" in jeonggwan["career"] or "취업" in jeonggwan["career"]


class TestModuleExports:
    """Tests for module exports."""

    def test_sibsin_meanings_importable(self):
        """SIBSIN_MEANINGS should be importable."""
        from app.rendering.constants import SIBSIN_MEANINGS
        assert SIBSIN_MEANINGS is not None
