import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "app"))

from signal_extractor import extract_signals  # noqa: E402


def test_astro_meta_fields_present():
    facts = {
        "astro": {
            "planets": [
                {"name": "Sun", "sign": "Leo", "house": 10, "longitude": 120},
                {"name": "Venus", "sign": "Taurus", "house": 1, "longitude": 50},
                {"name": "Mars", "sign": "Aries", "house": 4, "longitude": 10},
                {"name": "Saturn", "sign": "Aquarius", "house": 7, "longitude": 210},
                {"name": "Moon", "sign": "Cancer", "house": 5, "longitude": 90},
            ],
            "ascendant": {"sign": "Cancer"},
            "mc": {"sign": "Aries"},
        }
    }
    signals = extract_signals(facts)
    meta = signals["astro"]["meta"]

    assert meta["dominant_element"] == "fire"
    assert meta["element_counts"]["fire"] == 2
    assert ("Sun", 10) not in []  # ensure tuple format; presence asserted below
    assert ("Sun", 10) in meta["angular_planets"]
    assert meta["benefics_on_angles"] == 1  # Venus
    assert meta["malefics_on_angles"] == 2  # Mars, Saturn


def test_saju_meta_fields_present():
    facts = {
        "saju": {
            "facts": {
                "fiveElements": {"wood": 1, "fire": 3, "earth": 0, "metal": 2, "water": 1},
                "dayMaster": {"name": "Jia", "element": "wood"},
            },
            "pillars": {},
            "unse": {"daeun": [], "annual": [], "monthly": []},
            "sinsal": {"hits": []},
        }
    }

    signals = extract_signals(facts)
    meta = signals["saju"]["meta"]

    assert meta["lucky_element"] == "earth"
    assert meta["dominant_element"] == "fire"
    assert meta["five_element_counts"]["earth"] == 0
