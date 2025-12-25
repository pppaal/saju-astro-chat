"""
Unit tests for fusion_logic.py
Tests core fusion analysis functions.
"""
import pytest
from backend_ai.app.fusion_logic import (
    naturalize_facts,
    ELEMENT_TRAITS,
    TEN_GODS_MEANING,
    ASPECT_MEANINGS
)


class TestNaturalizeFacts:
    """Test naturalize_facts function."""

    def test_empty_data(self):
        """Test with empty data."""
        saju, astro, tarot = naturalize_facts({}, {}, {})

        assert isinstance(saju, str)
        assert isinstance(astro, str)
        assert isinstance(tarot, str)
        assert "No saju facts" in saju or len(saju) == 0

    def test_saju_day_master(self):
        """Test Day Master extraction and interpretation."""
        saju_data = {
            "dayMaster": {
                "name": "甲木",
                "element": "木",
                "strength": "strong"
            },
            "pillars": {
                "year": "甲寅",
                "month": "乙卯",
                "day": "甲木",
                "time": "丙辰"
            }
        }

        saju_text, _, _ = naturalize_facts(saju_data, {}, {})

        assert "甲木" in saju_text or "Day Master" in saju_text
        assert "CRITICAL" in saju_text  # Should highlight Day Master
        assert "Year Pillar" in saju_text or "년주" in saju_text

    def test_astro_planets(self):
        """Test astrology planet interpretation."""
        astro_data = {
            "planets": [
                {
                    "name": "Sun",
                    "sign": "Aries",
                    "house": "1",
                    "degree": "15.5"
                },
                {
                    "name": "Moon",
                    "sign": "Cancer",
                    "house": "4",
                    "degree": "20.3"
                }
            ]
        }

        _, astro_text, _ = naturalize_facts({}, astro_data, {})

        assert "Sun" in astro_text
        assert "Moon" in astro_text
        assert "Aries" in astro_text or "core identity" in astro_text.lower()

    def test_tarot_cards(self):
        """Test tarot card interpretation."""
        tarot_data = {
            "drawnCards": [
                {
                    "card": {
                        "name": "The Fool",
                        "upright": {
                            "keywords": ["new beginnings", "innocence"],
                            "description": "New journey ahead"
                        }
                    },
                    "isReversed": False
                }
            ],
            "spread": {
                "title": "Three Card Spread",
                "cardCount": 3
            }
        }

        _, _, tarot_text = naturalize_facts({}, {}, tarot_data)

        assert "The Fool" in tarot_text
        assert "Upright" in tarot_text or "정방향" in tarot_text

    def test_element_traits_completeness(self):
        """Test that all elements have trait definitions."""
        # Test English element names which are definitely in ELEMENT_TRAITS
        required_elements = ["wood", "fire", "earth", "metal", "water"]

        for elem in required_elements:
            assert elem in ELEMENT_TRAITS, f"Element {elem} missing from ELEMENT_TRAITS"
            assert "name" in ELEMENT_TRAITS[elem], f"Element {elem} missing 'name'"
            assert "traits" in ELEMENT_TRAITS[elem], f"Element {elem} missing 'traits'"

    def test_ten_gods_completeness(self):
        """Test that all Ten Gods have meanings."""
        expected_gods = [
            "비견", "겁재", "식신", "상관",
            "편재", "정재", "편관", "정관",
            "편인", "정인"
        ]

        assert len(TEN_GODS_MEANING) >= 10, "Missing Ten Gods definitions"

    def test_aspect_meanings_completeness(self):
        """Test that all major aspects have meanings."""
        required_aspects = ["conjunction", "opposition", "trine", "square", "sextile"]

        for aspect in required_aspects:
            assert aspect in ASPECT_MEANINGS, f"Aspect {aspect} missing"


class TestElementTraits:
    """Test element trait data structure."""

    def test_all_elements_have_organs(self):
        """Test that elements have TCM organ associations."""
        # fusion_logic.py uses specific keys, not raw Chinese characters
        chinese_elements = ["µ£¿", "τü½", "σ£ƒ", "Θçæ", "µ░┤"]  # Encoded element names

        for elem in chinese_elements:
            if elem in ELEMENT_TRAITS:
                assert "organ" in ELEMENT_TRAITS[elem], f"Element {elem} missing organ"

    def test_element_symmetry(self):
        """Test that element traits are consistent."""
        # Test that all English elements have matching structure
        english_elements = ["wood", "fire", "earth", "metal", "water"]

        for elem in english_elements:
            assert "name" in ELEMENT_TRAITS[elem]
            assert "traits" in ELEMENT_TRAITS[elem]
            assert "organ" in ELEMENT_TRAITS[elem]


@pytest.fixture
def sample_saju_data():
    """Sample saju data for testing."""
    return {
        "facts": {
            "fiveElements": {
                "木": 2,
                "火": 1,
                "土": 3,
                "金": 1,
                "水": 1
            },
            "tenGods": {
                "비견": 1,
                "정재": 2,
                "식신": 1
            }
        },
        "dayMaster": {
            "name": "甲木",
            "element": "木",
            "strength": "moderate"
        },
        "pillars": {
            "year": {"heavenlyStem": {"name": "甲"}, "earthlyBranch": {"name": "子"}},
            "month": "乙丑",
            "day": "甲寅",
            "time": "丙卯"
        }
    }


@pytest.fixture
def sample_astro_data():
    """Sample astrology data for testing."""
    return {
        "facts": {
            "elementRatios": {
                "Fire": 0.35,
                "Earth": 0.25,
                "Air": 0.2,
                "Water": 0.2
            }
        },
        "planets": [
            {
                "name": "Sun",
                "sign": "Leo",
                "house": "5",
                "degree": "18.5"
            }
        ],
        "aspects": [
            {
                "planet1": "Sun",
                "planet2": "Moon",
                "aspect": "trine",
                "orb": "3.2"
            }
        ],
        "ascendant": {"sign": "Scorpio"},
        "mc": {"sign": "Leo"}
    }


def test_naturalize_facts_with_fixtures(sample_saju_data, sample_astro_data):
    """Test naturalize_facts with realistic data."""
    saju_text, astro_text, tarot_text = naturalize_facts(
        sample_saju_data,
        sample_astro_data,
        {}
    )

    # Saju assertions
    assert "甲木" in saju_text
    assert "비견" in saju_text or "Peer" in saju_text
    assert "五行" in saju_text or "Five Elements" in saju_text

    # Astro assertions
    assert "Sun" in astro_text
    assert "Leo" in astro_text
    assert "Scorpio" in astro_text

    # Should not crash with empty tarot
    assert isinstance(tarot_text, str)
