"""
Generate generic fusion rules for themes that don't have bespoke logic:
daily, monthly, new_year, next_year, family, life_path.

We reuse common tokens from signal_extractor:
- meta.aspects_to_lights (soft/hard)
- meta.transits_to_lights (if present)
- health.malefics_in_health_houses
- health.five_element_flags
- meta.house_counts

Weights:
- core 4: many soft aspects, balanced house activity
- support 2-3: hard aspects (caution), element flags
- filler 1: house counts to reach target
"""

import json
from pathlib import Path

THEMES = ["daily", "monthly", "new_year", "next_year", "family", "life_path"]
MAX_RULES = 500
BASE_DIR = Path("backend_ai/data/graph/rules/fusion")


def build_rules() -> dict:
    rules = {}
    idx = 1

    def add(when, text, weight):
        nonlocal idx
        rules[f"rule_{idx}"] = {"when": when, "text": text, "weight": weight}
        idx += 1

    # Soft aspects: supportive flow
    for n in range(3, 9):
        add(["meta", "aspects_to_lights", "soft", str(n)], f"{n} soft aspects to lights: supportive flow for this period.", 4)
    # Hard aspects: cautious tone
    for n in range(2, 7):
        add(["meta", "aspects_to_lights", "hard", str(n)], f"{n} hard aspects to lights: plan, pace, and mitigate stress.", 3)

    # Transits placeholders
    for n in range(1, 5):
        add(["meta", "transits_to_lights", "soft", str(n)], f"{n} supportive transits: good window for decisions.", 2)
        add(["meta", "transits_to_lights", "hard", str(n)], f"{n} challenging transits: go slower, double-check plans.", 2)

    # Health flags
    elements = ["wood", "fire", "earth", "metal", "water"]
    for el in elements:
        add(["health", "five_element_flags", f"{el}_zero"], f"{el.capitalize()} element low: replenish and rebalance.", 3)
        add(["health", "five_element_flags", f"{el}_high"], f"{el.capitalize()} element high: ground and harmonize.", 2)

    # Malefics in health houses
    for pl in ["mars", "saturn"]:
        for h in [1, 6, 12]:
            add(
                ["health", "malefics_in_health_houses", pl, str(h)],
                f"{pl.title()} in house {h}: manage stress/energy to stay steady this period.",
                2,
            )

    # Filler to MAX_RULES with house emphasis
    houses_all = list(range(1, 13))
    themes = ["focus", "collaboration", "learning", "family", "travel", "career", "finances"]
    i = 0
    while len(rules) < MAX_RULES:
        h = houses_all[i % len(houses_all)]
        add(
            ["meta", "house_counts", str(h)],
            f"House {h} emphasis: {themes[h % len(themes)]} takes spotlight this cycle.",
            1,
        )
        i += 1

    return rules


def main():
    rules_template = build_rules()
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    for theme in THEMES:
        out_path = BASE_DIR / f"{theme}.json"
        out_path.write_text(json.dumps(rules_template, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{theme}: wrote {len(rules_template)} rules -> {out_path}")


if __name__ == "__main__":
    main()
