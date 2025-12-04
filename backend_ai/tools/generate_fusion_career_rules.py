"""
Generate career rules for fusion rule engine.

The rule engine flattens signals into tokens (keys + values). We generate
rules that match those tokens:
 - career.planets_in_career_houses -> tokens: "career", "planets_in_career_houses", "<planet>", "<house>"
 - career.chart_ruler_house       -> tokens: "career", "chart_ruler_house", "<house>"
 - career.asc_ruler               -> tokens: "career", "asc_ruler", "<planet>"
 - meta.aspects_to_lights.soft/hard -> tokens: "meta", "aspects_to_lights", "soft"/"hard", "<n>"

Weights policy:
 - core (5): benefic/career planets in 10/6/2, chart ruler in 10/6, strong MC sign support
 - support (3): benefics in 11/9, soft aspects count high
 - misc (1): filler combinations

Usage:
  python backend_ai/tools/generate_fusion_career_rules.py
"""

import json
from pathlib import Path

MAX_RULES = 800
OUT_PATH = Path("backend_ai/data/graph/rules/fusion/career.json")


def rule(key, when, text, weight):
    return key, {"when": when, "text": text, "weight": weight}


def main():
    rules = {}
    idx = 1

    def add(when, text, weight):
        nonlocal idx
        rules[f"rule_{idx}"] = {"when": when, "text": text, "weight": weight}
        idx += 1

    core_planets = ["Sun", "Jupiter", "Saturn", "Mars", "Mercury"]
    benefics = ["Jupiter", "Venus", "Sun"]
    malefics = ["Mars", "Saturn"]
    career_houses = [10, 6, 2]
    support_houses = [11, 9]

    # Core: career planets in career houses (weight 5)
    for pl in core_planets:
        for h in career_houses:
            add(
                ["career", "planets_in_career_houses", pl.lower(), str(h)],
                f"{pl} in house {h} favors career momentum.",
                5,
            )

    # Core: chart ruler / asc ruler
    for h in range(1, 13):
        add(["career", "chart_ruler_house", str(h)], f"Chart ruler in house {h} shapes career pathway.", 4 if h in (10, 6, 2) else 2)
    for pl in core_planets + benefics:
        add(["career", "asc_ruler", pl.lower()], f"Ascendant ruler {pl} colors public image and vocation.", 3)

    # Support: benefics in 11/9 (weight 3)
    for pl in benefics:
        for h in support_houses:
            add(
                ["career", "planets_in_career_houses", pl.lower(), str(h)],
                f"{pl} in house {h} expands networks and opportunities.",
                3,
            )

    # Support: soft/hard aspects to lights
    for n in range(2, 10):
        add(["meta", "aspects_to_lights", "soft", str(n)], f"{n} soft aspects to lights aid recognition.", 3)
    for n in range(2, 8):
        add(["meta", "aspects_to_lights", "hard", str(n)], f"{n} hard aspects to lights test resilience; channel into mastery.", 2)

    # Health impact on career
    for pl in malefics:
        for h in [1, 12, 6]:
            add(
                ["health", "malefics_in_health_houses", pl.lower(), str(h)],
                f"{pl} in house {h}: manage health/stress to sustain career.",
                1,
            )

    # General house activity as modifiers
    planets_extra = ["Mercury", "Moon", "Uranus", "Neptune", "Pluto"]
    for pl in planets_extra:
        for h in range(1, 13):
            add(
                ["meta", "house_counts", str(h)],
                f"House {h} activity links to {pl} themes in work style.",
                1,
            )

    # Transit soft/hard to lights (if provided)
    for n in range(1, 6):
        add(["meta", "transits_to_lights", "soft", str(n)], f"{n} supportive transits to lights boost career timing.", 2)
    for n in range(1, 5):
        add(["meta", "transits_to_lights", "hard", str(n)], f"{n} challenging transits to lights require pacing and strategy.", 2)

    # POF as wealth/career support
    for h in range(1, 13):
        add(["wealth", "pof_house", str(h)], f"Part of Fortune in house {h}: leverage resources for work outcomes.", 2 if h in (2, 10) else 1)

    # Fill until MAX_RULES with mixed combos
    themes = ["leadership", "collaboration", "innovation", "discipline", "communication", "travel", "visibility"]
    for h in range(1, 13):
        for pl in core_planets + planets_extra:
            if len(rules) >= MAX_RULES:
                break
            add(
                ["career", "planets_in_career_houses", pl.lower(), str(h)],
                f"{pl} influencing house {h} highlights {themes[h % len(themes)]} at work.",
                1,
            )
        if len(rules) >= MAX_RULES:
            break

    # Final filler: reuse house_counts tokens to reach MAX_RULES with varied text.
    h_cycle = list(range(1, 13))
    t_cycle = ["focus", "growth", "mobility", "strategy", "teamwork", "learning"]
    i = 0
    while len(rules) < MAX_RULES:
        h = h_cycle[i % len(h_cycle)]
        t = t_cycle[i % len(t_cycle)]
        add(
            ["meta", "house_counts", str(h)],
            f"House {h} emphasis suggests {t} theme shaping career choices.",
            1,
        )
        i += 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rules)} rules -> {OUT_PATH}")


if __name__ == "__main__":
    main()
