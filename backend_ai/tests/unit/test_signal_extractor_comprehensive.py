"""
Unit tests for backend_ai/app/signal_extractor.py

Tests:
- Helper functions (_planets_by_house, _find_planets, etc.)
- extract_astro_signals
- extract_saju_signals
- extract_signals
- summarize_signals
"""
import pytest


class TestPlanetsByHouse:
    """Tests for _planets_by_house helper."""

    def test_empty_planets(self):
        """Should return empty dict for empty planets."""
        from backend_ai.app.signal_extractor import _planets_by_house

        result = _planets_by_house([])
        assert result == {}

    def test_planets_grouped_by_house(self):
        """Should group planets by house."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [
            {"name": "Sun", "house": 1},
            {"name": "Moon", "house": 1},
            {"name": "Mars", "house": 10},
        ]
        result = _planets_by_house(planets)

        assert 1 in result
        assert 10 in result
        assert len(result[1]) == 2
        assert "Sun" in result[1]
        assert "Moon" in result[1]

    def test_invalid_house_ignored(self):
        """Should ignore planets with invalid house."""
        from backend_ai.app.signal_extractor import _planets_by_house

        planets = [
            {"name": "Sun", "house": 1},
            {"name": "Moon", "house": 0},
            {"name": "Mars", "house": None},
        ]
        result = _planets_by_house(planets)

        assert 1 in result
        assert 0 not in result


class TestFindPlanets:
    """Tests for _find_planets helper."""

    def test_find_planets_by_name_and_house(self):
        """Should find planets matching name and house."""
        from backend_ai.app.signal_extractor import _find_planets

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Moon", "house": 7},
            {"name": "Mars", "house": 10},
        ]
        result = _find_planets(planets, ["Sun", "Mars"], [10])

        assert len(result) == 2
        assert ("Sun", 10) in result
        assert ("Mars", 10) in result

    def test_find_planets_no_match(self):
        """Should return empty list when no match."""
        from backend_ai.app.signal_extractor import _find_planets

        planets = [{"name": "Sun", "house": 1}]
        result = _find_planets(planets, ["Moon"], [1])

        assert result == []


class TestPlanetHouse:
    """Tests for _planet_house helper."""

    def test_get_planet_house(self):
        """Should return house for planet."""
        from backend_ai.app.signal_extractor import _planet_house

        planets = [
            {"name": "Sun", "house": 10},
            {"name": "Moon", "house": 7},
        ]
        result = _planet_house(planets, "Sun")

        assert result == 10

    def test_planet_not_found(self):
        """Should return 0 when planet not found."""
        from backend_ai.app.signal_extractor import _planet_house

        planets = [{"name": "Sun", "house": 10}]
        result = _planet_house(planets, "Mars")

        assert result == 0


class TestAscRuler:
    """Tests for _asc_ruler helper."""

    def test_korean_sign_ruler(self):
        """Should return ruler for Korean sign name."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("사자자리") == "Sun"
        assert _asc_ruler("양자리") == "Mars"
        assert _asc_ruler("천칭자리") == "Venus"

    def test_english_sign_ruler(self):
        """Should return ruler for English sign name."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("leo") == "Sun"
        assert _asc_ruler("aries") == "Mars"
        assert _asc_ruler("libra") == "Venus"

    def test_unknown_sign(self):
        """Should return empty string for unknown sign."""
        from backend_ai.app.signal_extractor import _asc_ruler

        assert _asc_ruler("unknown") == ""


class TestAspectCounts:
    """Tests for _aspect_counts helper."""

    def test_count_soft_aspects(self):
        """Should count soft aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        aspects = [
            {"type": "trine", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
            {"type": "sextile", "from": {"name": "Sun"}, "to": {"name": "Venus"}},
        ]
        result = _aspect_counts(aspects, {"Sun"})

        assert result["soft"] == 2
        assert result["hard"] == 0

    def test_count_hard_aspects(self):
        """Should count hard aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        aspects = [
            {"type": "square", "from": {"name": "Sun"}, "to": {"name": "Moon"}},
            {"type": "opposition", "from": {"name": "Sun"}, "to": {"name": "Mars"}},
        ]
        result = _aspect_counts(aspects, {"Sun"})

        assert result["hard"] == 2
        assert result["soft"] == 0

    def test_empty_aspects(self):
        """Should return zeros for empty aspects."""
        from backend_ai.app.signal_extractor import _aspect_counts

        result = _aspect_counts([], {"Sun"})
        assert result == {"soft": 0, "hard": 0}


class TestSignKey:
    """Tests for _sign_key helper."""

    def test_korean_to_english(self):
        """Should convert Korean sign to English key."""
        from backend_ai.app.signal_extractor import _sign_key

        assert _sign_key("양자리") == "aries"
        assert _sign_key("황소자리") == "taurus"
        assert _sign_key("물고기자리") == "pisces"

    def test_english_passthrough(self):
        """Should pass through English sign names."""
        from backend_ai.app.signal_extractor import _sign_key

        assert _sign_key("aries") == "aries"
        assert _sign_key("Leo") == "leo"


class TestDignity:
    """Tests for _dignity helper."""

    def test_rulership(self):
        """Should detect rulership."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "leo")
        assert "rulership" in result

    def test_exaltation(self):
        """Should detect exaltation."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "aries")
        assert "exaltation" in result

    def test_detriment(self):
        """Should detect detriment."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "aquarius")
        assert "detriment" in result

    def test_fall(self):
        """Should detect fall."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "libra")
        assert "fall" in result

    def test_no_dignity(self):
        """Should return empty for neutral placement."""
        from backend_ai.app.signal_extractor import _dignity

        result = _dignity("Sun", "gemini")
        assert result == []


class TestElementForSign:
    """Tests for _element_for_sign helper."""

    def test_fire_signs(self):
        """Should return fire for fire signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("aries") == "fire"
        assert _element_for_sign("leo") == "fire"
        assert _element_for_sign("sagittarius") == "fire"

    def test_earth_signs(self):
        """Should return earth for earth signs."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("taurus") == "earth"
        assert _element_for_sign("virgo") == "earth"
        assert _element_for_sign("capricorn") == "earth"

    def test_korean_signs(self):
        """Should work with Korean sign names."""
        from backend_ai.app.signal_extractor import _element_for_sign

        assert _element_for_sign("양자리") == "fire"
        assert _element_for_sign("황소자리") == "earth"


class TestExtractAstroSignals:
    """Tests for extract_astro_signals function."""

    def test_empty_facts(self):
        """Should handle empty facts."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        result = extract_astro_signals({})

        assert "career" in result
        assert "wealth" in result
        assert "love" in result
        assert "health" in result
        assert "meta" in result

    def test_extract_career_signals(self):
        """Should extract career signals."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Sun", "house": 10, "sign": "leo"},
                    {"name": "Saturn", "house": 10, "sign": "capricorn"},
                ],
                "mc": {"sign": "aries"},
            }
        }
        result = extract_astro_signals(facts)

        assert len(result["career"]["planets_in_career_houses"]) == 2

    def test_extract_wealth_signals(self):
        """Should extract wealth signals."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Jupiter", "house": 2},
                    {"name": "Venus", "house": 8},
                ]
            }
        }
        result = extract_astro_signals(facts)

        assert len(result["wealth"]["benefics_in_money_houses"]) == 2

    def test_extract_love_signals(self):
        """Should extract love signals."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Venus", "house": 7, "sign": "libra"},
                    {"name": "Mars", "house": 5, "sign": "aries"},
                ]
            }
        }
        result = extract_astro_signals(facts)

        assert len(result["love"]["venus_mars_moon_in_rel_houses"]) == 2

    def test_extract_meta_signals(self):
        """Should extract meta signals."""
        from backend_ai.app.signal_extractor import extract_astro_signals

        facts = {
            "astro": {
                "planets": [
                    {"name": "Venus", "house": 7, "sign": "libra"},
                ],
                "ascendant": {"sign": "leo"},
            }
        }
        result = extract_astro_signals(facts)

        assert result["meta"]["asc_sign"] == "leo"
        assert result["meta"]["venus_sign"] == "libra"


class TestExtractSajuSignals:
    """Tests for extract_saju_signals function."""

    def test_empty_facts(self):
        """Should handle empty facts."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        result = extract_saju_signals({})

        assert "career" in result
        assert "wealth" in result
        assert "love" in result
        assert "health" in result
        assert "fortune" in result
        assert "meta" in result

    def test_extract_career_flag(self):
        """Should extract career flag."""
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

    def test_extract_wealth_flag(self):
        """Should extract wealth flag."""
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

    def test_extract_five_element_flags(self):
        """Should extract five element imbalance flags."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "facts": {
                    "fiveElements": {
                        "wood": 0,
                        "fire": 3,
                        "earth": 1,
                        "metal": 2,
                        "water": 2,
                    }
                }
            }
        }
        result = extract_saju_signals(facts)

        assert "wood_zero" in result["health"]["five_element_flags"]
        assert "fire_high" in result["health"]["five_element_flags"]

    def test_extract_meta_signals(self):
        """Should extract meta signals."""
        from backend_ai.app.signal_extractor import extract_saju_signals

        facts = {
            "saju": {
                "dayMaster": {"name": "甲", "element": "wood"},
                "facts": {
                    "fiveElements": {
                        "wood": 2, "fire": 1, "earth": 1, "metal": 2, "water": 2
                    }
                }
            }
        }
        result = extract_saju_signals(facts)

        assert result["meta"]["day_master"] == "甲"
        assert result["meta"]["day_master_element"] == "wood"


class TestExtractSignals:
    """Tests for extract_signals function."""

    def test_combined_extraction(self):
        """Should extract both astro and saju signals."""
        from backend_ai.app.signal_extractor import extract_signals

        facts = {
            "astro": {
                "planets": [{"name": "Sun", "house": 1}]
            },
            "saju": {
                "dayMaster": {"name": "甲"}
            }
        }
        result = extract_signals(facts)

        assert "astro" in result
        assert "saju" in result


class TestSummarizeSignals:
    """Tests for summarize_signals function."""

    def test_summarize_empty_signals(self):
        """Should handle empty signals."""
        from backend_ai.app.signal_extractor import summarize_signals

        signals = {
            "astro": {
                "career": {"planets_in_career_houses": []},
                "wealth": {"benefics_in_money_houses": []},
                "love": {"venus_mars_moon_in_rel_houses": []},
                "health": {"malefics_in_health_houses": []},
                "meta": {},
            },
            "saju": {
                "career": {"has_officer_sibsin": False},
                "wealth": {"has_wealth_sibsin": False},
                "love": {"love_sinsal_hits": [], "love_sinsal_count": 0},
                "health": {"five_element_flags": {}},
                "fortune": {},
                "meta": {},
            }
        }
        result = summarize_signals(signals)

        assert isinstance(result, str)

    def test_summarize_with_data(self):
        """Should summarize signals with data."""
        from backend_ai.app.signal_extractor import summarize_signals

        signals = {
            "astro": {
                "career": {"planets_in_career_houses": [("Sun", 10), ("Saturn", 10)]},
                "wealth": {"benefics_in_money_houses": [("Jupiter", 2)]},
                "love": {"venus_mars_moon_in_rel_houses": []},
                "health": {"malefics_in_health_houses": []},
                "meta": {"asc_sign": "leo"},
            },
            "saju": {
                "career": {"has_officer_sibsin": True},
                "wealth": {"has_wealth_sibsin": False},
                "love": {"love_sinsal_hits": [], "love_sinsal_count": 0},
                "health": {"five_element_flags": {}},
                "fortune": {},
                "meta": {"day_master": "甲"},
            }
        }
        result = summarize_signals(signals)

        assert isinstance(result, str)
        assert len(result) > 0


class TestModuleExports:
    """Tests for module exports."""

    def test_extract_astro_signals_importable(self):
        """extract_astro_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_astro_signals
        assert callable(extract_astro_signals)

    def test_extract_saju_signals_importable(self):
        """extract_saju_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_saju_signals
        assert callable(extract_saju_signals)

    def test_extract_signals_importable(self):
        """extract_signals should be importable."""
        from backend_ai.app.signal_extractor import extract_signals
        assert callable(extract_signals)

    def test_summarize_signals_importable(self):
        """summarize_signals should be importable."""
        from backend_ai.app.signal_extractor import summarize_signals
        assert callable(summarize_signals)

