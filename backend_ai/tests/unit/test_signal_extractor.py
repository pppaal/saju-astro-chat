"""
Unit tests for Signal Extractor module.

Tests:
- Helper functions (_planets_by_house, _find_planets, etc.)
- Astro signal extraction
- Saju signal extraction
- Combined signal extraction
- Signal summary functions
"""
import pytest
from typing import Dict, Any, List


class TestPlanetsByHouse:
    """Tests for _planets_by_house helper."""

    def test_empty_planets_list(self):
        """Test with empty planets list."""
        from backend_ai.app.signal_extractor import _planets_by_house

        result = _planets_by_house([])
        assert result == {}

    def test_none_planets(self):
        """Test with None input."""
        from backend_ai.app.signal_extractor import _planets_by_house

        result = _planets_by_house(None)
        assert result == {}

    def test_single_planet(self):
        """Test with single planet."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [{"name": "Sun", "house": 10}]
        result = _planets_by_house(planets)
        assert result == {10: ["Sun"]}

    def test_multiple_planets_same_house(self):
        """Test multiple planets in same house."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Mercury", "house": 10},
        ]
        result = _planets_by_house(planets)
        assert 10 in result
        assert "Sun" in result[10]
        assert "Mercury" in result[10]

    def test_planets_in_different_houses(self):
        """Test planets in different houses."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Moon", "house": 4},
            {"name": "Mars", "house": 1},
        ]
        result = _planets_by_house(planets)
        assert result[10] == ["Sun"]
        assert result[4] == ["Moon"]
        assert result[1] == ["Mars"]

    def test_invalid_house_number(self):
        """Test planet with invalid house number."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [
            {"name": "Sun", "house": 0},
            {"name": "Moon", "house": -1},
            {"name": "Mars", "house": 10},
        ]
        result = _planets_by_house(planets)
        assert 0 not in result
        assert -1 not in result
        assert 10 in result

    def test_string_house_number(self):
        """Test planet with string house number."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [{"name": "Sun", "house": "10"}]
        result = _planets_by_house(planets)
        assert 10 in result


class TestFindPlanets:
    """Tests for _find_planets helper."""

    def test_find_planets_basic(self):
        """Test basic planet finding."""
        from backend_ai.app.signal_extractor import _find_planets

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Moon", "house": 4},
            {"name": "Mars", "house": 1},
        ]
        result = _find_planets(planets, ["Sun", "Mars"], [10, 1])
        assert ("Sun", 10) in result
        assert ("Mars", 1) in result
        assert len(result) == 2

    def test_find_planets_no_match(self):
        """Test when no planets match criteria."""
        from backend_ai.app.signal_extractor import _find_planets

        planets = [{"name": "Sun", "house": 10}]
        result = _find_planets(planets, ["Moon"], [10])
        assert result == []

    def test_find_planets_house_not_matching(self):
        """Test when house doesn't match."""
        from backend_ai.app.signal_extractor import _find_planets

        planets = [{"name": "Sun", "house": 10}]
        result = _find_planets(planets, ["Sun"], [1, 2, 3])
        assert result == []

    def test_find_planets_empty_list(self):
        """Test with empty planets list."""
        from backend_ai.app.signal_extractor import _find_planets

        result = _find_planets([], ["Sun"], [10])
        assert result == []

    def test_find_planets_none_input(self):
        """Test with None input."""
        from backend_ai.app.signal_extractor import _find_planets

        result = _find_planets(None, ["Sun"], [10])
        assert result == []


class TestPlanetHouse:
    """Tests for _planet_house helper."""

    def test_planet_house_found(self):
        """Test finding planet's house."""
        from backend_ai.app.signal_extractor import _planet_house

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Moon", "house": 4},
        ]
        result = _planet_house(planets, "Sun")
        assert result == 10

    def test_planet_house_not_found(self):
        """Test planet not in list."""
        from backend_ai.app.signal_extractor import _planet_house

        planets = [{"name": "Sun", "house": 10}]
        result = _planet_house(planets, "Mars")
        assert result == 0

    def test_planet_house_empty_list(self):
        """Test with empty list."""
        from backend_ai.app.signal_extractor import _planet_house

        result = _planet_house([], "Sun")
        assert result == 0


class TestAscRuler:
    """Tests for _asc_ruler helper."""

    def test_korean_signs(self):
        """Test Korean sign names."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("양자리") == "Mars"
        assert _asc_ruler("황소자리") == "Venus"
        assert _asc_ruler("사자자리") == "Sun"
        assert _asc_ruler("게자리") == "Moon"

    def test_english_signs(self):
        """Test English sign names."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("aries") == "Mars"
        assert _asc_ruler("taurus") == "Venus"
        assert _asc_ruler("leo") == "Sun"
        assert _asc_ruler("cancer") == "Moon"

    def test_case_insensitive(self):
        """Test case insensitivity."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("ARIES") == "Mars"
        assert _asc_ruler("Taurus") == "Venus"

    def test_unknown_sign(self):
        """Test unknown sign returns empty string."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("unknown") == ""
        assert _asc_ruler("") == ""

    def test_all_korean_rulers(self):
        """Test all Korean zodiac rulers."""
        from backend_ai.app.signal_extractor import _asc_ruler

        expected = {
            "양자리": "Mars",
            "황소자리": "Venus",
            "쌍둥이자리": "Mercury",
            "게자리": "Moon",
            "사자자리": "Sun",
            "처녀자리": "Mercury",
            "천칭자리": "Venus",
            "전갈자리": "Mars",
            "사수자리": "Jupiter",
            "염소자리": "Saturn",
            "물병자리": "Saturn",
            "물고기자리": "Jupiter",
        }
        for sign, ruler in expected.items():
            assert _asc_ruler(sign) == ruler


class TestAspectCounts:
    """Tests for _aspect_counts helper."""

    def test_soft_aspects(self):
        """Test counting soft aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        aspects = [
            {"type": "trine", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
            {"type": "sextile", "from": {"name": "Sun"}, "to": {"name": "Venus"}},
        ]
        result = _aspect_counts(aspects, {"Sun"})
        assert result["soft"] == 2
        assert result["hard"] == 0

    def test_hard_aspects(self):
        """Test counting hard aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        aspects = [
            {"type": "square", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
            {"type": "opposition", "from": {"name": "Sun"}, "to": {"name": "Saturn"}},
        ]
        result = _aspect_counts(aspects, {"Sun"})
        assert result["hard"] == 2
        assert result["soft"] == 0

    def test_mixed_aspects(self):
        """Test mixed soft and hard aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        aspects = [
            {"type": "trine", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
            {"type": "square", "from": {"name": "Moon"}, "to": {"name": "Mars"}},
        ]
        result = _aspect_counts(aspects, {"Sun", "Moon"})
        assert result["soft"] >= 1
        assert result["hard"] >= 1

    def test_empty_aspects(self):
        """Test empty aspects list."""
        from backend_ai.app.signal_extractor import _aspect_counts

        result = _aspect_counts([], {"Sun"})
        assert result["soft"] == 0
        assert result["hard"] == 0


class TestSignKey:
    """Tests for _sign_key helper."""

    def test_korean_to_english(self):
        """Test Korean sign conversion."""
        from backend_ai.app.signal_extractor import _sign_key

        assert _sign_key("양자리") == "aries"
        assert _sign_key("황소자리") == "taurus"
        assert _sign_key("쌍둥이자리") == "gemini"

    def test_english_passthrough(self):
        """Test English signs pass through."""
        from backend_ai.app.signal_extractor import _sign_key

        assert _sign_key("aries") == "aries"
        assert _sign_key("TAURUS") == "taurus"

    def test_unknown_sign(self):
        """Test unknown sign returns lowercase input."""
        from backend_ai.app.signal_extractor import _sign_key

        assert _sign_key("Unknown") == "unknown"


class TestDignity:
    """Tests for _dignity helper."""

    def test_rulership(self):
        """Test planet in rulership."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "leo")
        assert "rulership" in result

    def test_exaltation(self):
        """Test planet in exaltation."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "aries")
        assert "exaltation" in result

    def test_detriment(self):
        """Test planet in detriment."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "aquarius")
        assert "detriment" in result

    def test_fall(self):
        """Test planet in fall."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "libra")
        assert "fall" in result

    def test_no_dignity(self):
        """Test planet with no special dignity."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "gemini")
        assert result == []

    def test_korean_sign(self):
        """Test with Korean sign name."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "사자자리")
        assert "rulership" in result


class TestElementForSign:
    """Tests for _element_for_sign helper."""

    def test_fire_signs(self):
        """Test fire element signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("aries") == "fire"
        assert _element_for_sign("leo") == "fire"
        assert _element_for_sign("sagittarius") == "fire"

    def test_earth_signs(self):
        """Test earth element signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("taurus") == "earth"
        assert _element_for_sign("virgo") == "earth"
        assert _element_for_sign("capricorn") == "earth"

    def test_air_signs(self):
        """Test air element signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("gemini") == "air"
        assert _element_for_sign("libra") == "air"
        assert _element_for_sign("aquarius") == "air"

    def test_water_signs(self):
        """Test water element signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("cancer") == "water"
        assert _element_for_sign("scorpio") == "water"
        assert _element_for_sign("pisces") == "water"

    def test_korean_signs(self):
        """Test Korean sign names."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("양자리") == "fire"
        assert _element_for_sign("황소자리") == "earth"

    def test_unknown_sign(self):
        """Test unknown sign returns empty string."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("unknown") == ""


class TestExtractAstroSignals:
    """Tests for extract_astro_signals function."""

    def test_empty_facts(self):
        """Test with empty facts."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        result = extract_astro_signals({})
        assert "career" in result
        assert "wealth" in result
        assert "love" in result
        assert "health" in result
        assert "meta" in result

    def test_with_planets(self):
        """Test with planet data."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Sun", "house": 10, "sign": "leo", "longitude": 120.0},
                    {"name": "Jupiter", "house": 2, "sign": "taurus", "longitude": 45.0},
                    {"name": "Venus", "house": 7, "sign": "libra", "longitude": 200.0},
                ],
                "ascendant": {"sign": "aries"},
                "mc": {"sign": "capricorn"},
            }
        }
        result = extract_astro_signals(facts)

        # Career planets in career houses
        assert result["career"]["planets_in_career_houses"]
        assert result["career"]["mc_sign"] == "capricorn"

        # Wealth planets
        assert result["wealth"]["benefics_in_money_houses"]

        # Love planets
        assert result["love"]["venus_mars_moon_in_rel_houses"]

        # Meta info
        assert result["meta"]["asc_sign"] == "aries"

    def test_aspects_extraction(self):
        """Test aspect counting."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Sun", "house": 1, "sign": "aries"},
                    {"name": "Moon", "house": 7, "sign": "libra"},
                ],
                "aspects": [
                    {"type": "opposition", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
                ],
            }
        }
        result = extract_astro_signals(facts)
        assert result["meta"]["aspects_to_lights"]["hard"] >= 1

    def test_angular_planets(self):
        """Test angular planets detection."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Jupiter", "house": 1, "sign": "aries"},  # Angular benefic
                    {"name": "Saturn", "house": 10, "sign": "capricorn"},  # Angular malefic
                ],
            }
        }
        result = extract_astro_signals(facts)
        assert result["meta"]["angular_planets"]
        assert result["meta"]["benefics_on_angles"] == 1
        assert result["meta"]["malefics_on_angles"] == 1

    def test_element_counts(self):
        """Test element counting."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Sun", "house": 1, "sign": "aries"},  # fire
                    {"name": "Moon", "house": 2, "sign": "leo"},  # fire
                    {"name": "Mars", "house": 3, "sign": "sagittarius"},  # fire
                ],
            }
        }
        result = extract_astro_signals(facts)
        assert result["meta"]["element_counts"]["fire"] == 3
        assert result["meta"]["dominant_element"] == "fire"


class TestExtractSajuSignals:
    """Tests for extract_saju_signals function."""

    def test_empty_facts(self):
        """Test with empty facts."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        result = extract_saju_signals({})
        assert "career" in result
        assert "wealth" in result
        assert "love" in result
        assert "health" in result
        assert "fortune" in result
        assert "meta" in result

    def test_five_elements_balance(self):
        """Test five elements balance detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "facts": {
                    "fiveElements": {
                        "wood": 0,  # Zero - flagged
                        "fire": 4,  # High - flagged
                        "earth": 1,
                        "metal": 2,
                        "water": 1,
                    }
                }
            }
        }
        result = extract_saju_signals(facts)
        assert "wood_zero" in result["health"]["five_element_flags"]
        assert "fire_high" in result["health"]["five_element_flags"]
        assert result["meta"]["lucky_element"] == "wood"
        assert result["meta"]["dominant_element"] == "fire"

    def test_career_sibsin(self):
        """Test career sibsin detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "pillars": {
                    "month": {
                        "heavenlyStem": {"sibsin": "정관"},
                        "earthlyBranch": {"sibsin": ""},
                    }
                }
            }
        }
        result = extract_saju_signals(facts)
        assert result["career"]["has_officer_sibsin"] is True

    def test_wealth_sibsin(self):
        """Test wealth sibsin detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "pillars": {
                    "day": {
                        "heavenlyStem": {"sibsin": "정재"},
                        "earthlyBranch": {"sibsin": ""},
                    }
                }
            }
        }
        result = extract_saju_signals(facts)
        assert result["wealth"]["has_wealth_sibsin"] is True

    def test_love_sinsal(self):
        """Test love sinsal detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "sinsal": {
                    "hits": [
                        {"kind": "도화", "description": "test"},
                        {"kind": "홍염", "description": "test"},
                        {"kind": "기타살", "description": "test"},
                    ]
                }
            }
        }
        result = extract_saju_signals(facts)
        assert result["love"]["love_sinsal_count"] == 2
        assert len(result["love"]["love_sinsal_hits"]) == 2

    def test_fortune_counts(self):
        """Test fortune period counting."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "unse": {
                    "daeun": [{"year": 2020}, {"year": 2030}],
                    "annual": [{"year": 2024}],
                    "monthly": [{"month": 1}, {"month": 2}, {"month": 3}],
                }
            }
        }
        result = extract_saju_signals(facts)
        assert result["fortune"]["daeun"] == 2
        assert result["fortune"]["annual"] == 1
        assert result["fortune"]["monthly"] == 3

    def test_branch_clashes(self):
        """Test branch clash detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "pillars": {
                    "year": {"earthlyBranch": {"name": "子"}},
                    "month": {"earthlyBranch": {"name": "午"}},
                    "day": {"earthlyBranch": {"name": "卯"}},
                    "time": {"earthlyBranch": {"name": "酉"}},
                }
            }
        }
        result = extract_saju_signals(facts)
        clashes = result["meta"]["clashes"]
        assert len(clashes) == 2  # 子-午 and 卯-酉

    def test_sanhap_detection(self):
        """Test sanhap (three harmony) detection."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "pillars": {
                    "year": {"earthlyBranch": {"name": "申"}},
                    "month": {"earthlyBranch": {"name": "子"}},
                    "day": {"earthlyBranch": {"name": "辰"}},
                    "time": {"earthlyBranch": {"name": "丑"}},
                }
            }
        }
        result = extract_saju_signals(facts)
        sanhap = result["meta"]["sanhap"]
        assert len(sanhap) >= 1  # 申子辰 water trio

    def test_day_master_extraction(self):
        """Test day master extraction."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "dayMaster": {"name": "甲", "element": "wood"}
            }
        }
        result = extract_saju_signals(facts)
        assert result["meta"]["day_master"] == "甲"
        assert result["meta"]["day_master_element"] == "wood"


class TestExtractSignals:
    """Tests for combined extract_signals function."""

    def test_returns_both_systems(self):
        """Test returns both astro and saju signals."""
        from backend_ai.app.signal_extractor import extract_signals

        result = extract_signals({})
        assert "astro" in result
        assert "saju" in result

    def test_with_complete_data(self):
        """Test with complete astro and saju data."""
        from backend_ai.app.signal_extractor import extract_signals

        facts = {
            "astro": {
                "planets": [{"name": "Sun", "house": 10, "sign": "leo"}],
            },
            "saju": {
                "dayMaster": {"name": "甲"},
            },
        }
        result = extract_signals(facts)
        assert result["astro"]["career"]["planets_in_career_houses"]
        assert result["saju"]["meta"]["day_master"] == "甲"


class TestSummarizeSignals:
    """Tests for summarize_signals function."""

    def test_empty_signals(self):
        """Test with empty signals."""
        from backend_ai.app.signal_extractor import summarize_signals

        result = summarize_signals({})
        assert isinstance(result, str)

    def test_astro_signals_summary(self):
        """Test astro signals summary."""
        from backend_ai.app.signal_extractor import summarize_signals

        signals = {
            "astro": {
                "meta": {
                    "dominant_element": "fire",
                    "weakest_element": "water",
                    "angular_planets": [("Sun", 1), ("Jupiter", 10)],
                    "benefics_on_angles": 1,
                    "malefics_on_angles": 0,
                    "element_counts": {"fire": 3, "earth": 2, "air": 2, "water": 1},
                }
            }
        }
        result = summarize_signals(signals)
        assert "fire" in result
        assert "Dominant element" in result

    def test_saju_signals_summary(self):
        """Test saju signals summary."""
        from backend_ai.app.signal_extractor import summarize_signals

        signals = {
            "saju": {
                "meta": {
                    "dominant_element": "wood",
                    "lucky_element": "fire",
                    "five_element_counts": {"wood": 3, "fire": 1, "earth": 2, "metal": 1, "water": 1},
                }
            }
        }
        result = summarize_signals(signals)
        assert "wood" in result
        assert "Saju" in result


class TestSummarizeCrossSignals:
    """Tests for summarize_cross_signals function."""

    def test_empty_signals(self):
        """Test with empty signals."""
        from backend_ai.app.signal_extractor import summarize_cross_signals

        result = summarize_cross_signals({})
        assert isinstance(result, str)

    def test_matching_elements(self):
        """Test when both systems emphasize same element."""
        from backend_ai.app.signal_extractor import summarize_cross_signals

        signals = {
            "astro": {"meta": {"dominant_element": "fire"}},
            "saju": {"meta": {"dominant_element": "fire"}},
        }
        result = summarize_cross_signals(signals)
        assert "reinforced theme" in result or "fire" in result

    def test_lucky_element_supplied(self):
        """Test when astro supplies saju balancing element."""
        from backend_ai.app.signal_extractor import summarize_cross_signals

        signals = {
            "astro": {"meta": {"dominant_element": "water"}},
            "saju": {"meta": {"lucky_element": "water"}},
        }
        result = summarize_cross_signals(signals)
        assert "supplies" in result or "water" in result

    def test_lucky_element_lacking(self):
        """Test when astro lacks saju balancing element."""
        from backend_ai.app.signal_extractor import summarize_cross_signals

        signals = {
            "astro": {"meta": {"weakest_element": "fire"}},
            "saju": {"meta": {"lucky_element": "fire"}},
        }
        result = summarize_cross_signals(signals)
        assert "lacks" in result or "remedies" in result or "fire" in result

    def test_day_master_included(self):
        """Test day master is included in summary."""
        from backend_ai.app.signal_extractor import summarize_cross_signals

        signals = {
            "saju": {"meta": {"day_master": "甲"}},
        }
        result = summarize_cross_signals(signals)
        assert "甲" in result or "Day Master" in result


class TestComputeBasicAspects:
    """Tests for _compute_basic_aspects_from_positions helper."""

    def test_conjunction(self):
        """Test conjunction detection by longitude."""
        from backend_ai.app.signal_extractor import _compute_basic_aspects_from_positions

        planets = [
            {"name": "Sun", "longitude": 100.0},
            {"name": "Moon", "longitude": 103.0},  # Within 6 degree orb
        ]
        result = _compute_basic_aspects_from_positions(planets, {"Sun"})
        assert result["soft"] >= 1

    def test_opposition(self):
        """Test opposition detection by longitude."""
        from backend_ai.app.signal_extractor import _compute_basic_aspects_from_positions

        planets = [
            {"name": "Sun", "longitude": 0.0},
            {"name": "Moon", "longitude": 180.0},
        ]
        result = _compute_basic_aspects_from_positions(planets, {"Sun"})
        assert result["hard"] >= 1

    def test_trine(self):
        """Test trine detection by longitude."""
        from backend_ai.app.signal_extractor import _compute_basic_aspects_from_positions

        planets = [
            {"name": "Sun", "longitude": 0.0},
            {"name": "Moon", "longitude": 120.0},
        ]
        result = _compute_basic_aspects_from_positions(planets, {"Sun"})
        assert result["soft"] >= 1

    def test_square(self):
        """Test square detection by longitude."""
        from backend_ai.app.signal_extractor import _compute_basic_aspects_from_positions

        planets = [
            {"name": "Sun", "longitude": 0.0},
            {"name": "Moon", "longitude": 90.0},
        ]
        result = _compute_basic_aspects_from_positions(planets, {"Sun"})
        assert result["hard"] >= 1


class TestTransitAspects:
    """Tests for _transit_aspects helper."""

    def test_soft_transit(self):
        """Test soft transit aspect counting."""
        from backend_ai.app.signal_extractor import _transit_aspects

        transits = [
            {"type": "trine", "from": {"name": "Jupiter"}, "to": {"name": "Sun"}},
        ]
        result = _transit_aspects(transits, {"Sun"})
        assert result["soft"] == 1
        assert result["hard"] == 0

    def test_hard_transit(self):
        """Test hard transit aspect counting."""
        from backend_ai.app.signal_extractor import _transit_aspects

        transits = [
            {"type": "square", "from": {"name": "Saturn"}, "to": {"name": "Sun"}},
        ]
        result = _transit_aspects(transits, {"Sun"})
        assert result["hard"] == 1

    def test_non_target_transit(self):
        """Test transits to non-target planets are ignored."""
        from backend_ai.app.signal_extractor import _transit_aspects

        transits = [
            {"type": "trine", "from": {"name": "Jupiter"}, "to": {"name": "Mars"}},
        ]
        result = _transit_aspects(transits, {"Sun"})
        assert result["soft"] == 0
        assert result["hard"] == 0

    def test_empty_transits(self):
        """Test empty transits list."""
        from backend_ai.app.signal_extractor import _transit_aspects

        result = _transit_aspects([], {"Sun"})
        assert result["soft"] == 0
        assert result["hard"] == 0


class TestModuleExports:
    """Tests for module exports."""

    def test_extract_signals_importable(self):
        """extract_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_signals
        assert extract_signals is not None

    def test_extract_astro_signals_importable(self):
        """extract_astro_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_astro_signals
        assert extract_astro_signals is not None

    def test_extract_saju_signals_importable(self):
        """extract_saju_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_saju_signals
        assert extract_saju_signals is not None

    def test_summarize_signals_importable(self):
        """summarize_signals should be importable."""
        from backend_ai.app.signal_extractor import summarize_signals
        assert summarize_signals is not None

    def test_summarize_cross_signals_importable(self):
        """summarize_cross_signals should be importable."""
        from backend_ai.app.signal_extractor import summarize_cross_signals
        assert summarize_cross_signals is not None
