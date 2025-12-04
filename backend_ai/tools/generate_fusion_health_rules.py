"""
Generate health rules for fusion rule engine.
Tokens align with signal_extractor outputs:
 - health.malefics_in_health_houses -> health, malefics_in_health_houses, <planet>, <house>
 - health.five_element_flags -> health, five_element_flags, <element>_zero/high
 - meta.aspects_to_lights -> meta, aspects_to_lights, hard/soft, <n>
"""

import json
from pathlib import Path

MAX_RULES = 600
OUT_PATH = Path("backend_ai/data/graph/rules/fusion/health.json")


def main():
    rules = {}
    idx = 1

    def add(when, text, weight):
        nonlocal idx
        rules[f"rule_{idx}"] = {"when": when, "text": text, "weight": weight}
        idx += 1

    malefics = ["Mars", "Saturn"]
    health_houses = [1, 6, 12]
    elements = ["wood", "fire", "earth", "metal", "water"]

    # Core: malefics in health houses (weight 5)
    for pl in malefics:
        for h in health_houses:
            add(
                ["health", "malefics_in_health_houses", pl.lower(), str(h)],
                f"{pl} in house {h}: prioritize rest, structure, and preventative care.",
                5,
            )

    # Core: element imbalance flags (zero or high)
    for el in elements:
        add(["health", "five_element_flags", f"{el}_zero"], f"{el.capitalize()} element depleted → replenish via lifestyle/diet.", 4)
        add(["health", "five_element_flags", f"{el}_high"], f"{el.capitalize()} element dominant → balance with moderating activities.", 3)

    # Support: hard aspects to lights
    for n in range(2, 8):
        add(["meta", "aspects_to_lights", "hard", str(n)], f"{n} hard aspects to lights: watch stress/load; pace recovery.", 2)
    for n in range(2, 8):
        add(["meta", "aspects_to_lights", "soft", str(n)], f"{n} soft aspects to lights: supportive flow for healing routines.", 1)

    # Transit placeholders
    for n in range(1, 5):
        add(["meta", "transits_to_lights", "hard", str(n)], f"{n} challenging transits to lights: schedule rest and checkups.", 2)
        add(["meta", "transits_to_lights", "soft", str(n)], f"{n} supportive transits to lights: good windows for wellness changes.", 1)

    # Filler up to MAX_RULES using house counts and elements
    houses_all = list(range(1, 13))
    notes = ["recovery", "vitality", "sleep", "movement", "nutrition", "mindfulness", "balance"]
    i = 0
    while len(rules) < MAX_RULES:
        h = houses_all[i % len(houses_all)]
        el = elements[i % len(elements)]
        add(
            ["meta", "house_counts", str(h)],
            f"House {h} emphasis: align {el} energy with daily health routines.",
            1,
        )
        i += 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rules)} rules -> {OUT_PATH}")


if __name__ == "__main__":
    main()
