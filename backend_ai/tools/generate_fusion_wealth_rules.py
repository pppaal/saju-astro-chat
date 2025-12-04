"""
Generate wealth/money rules for fusion rule engine.
Tokens align with signal_extractor outputs:
 - wealth.benefics_in_money_houses -> wealth, benefics_in_money_houses, <planet>, <house>
 - wealth.pof_house -> wealth, pof_house, <house>
 - saju.has_wealth_sibsin -> saju, wealth, has_wealth_sibsin, true
 - meta.aspects_to_lights -> meta, aspects_to_lights, soft/hard, <n>
"""

import json
from pathlib import Path

MAX_RULES = 700
OUT_PATH = Path("backend_ai/data/graph/rules/fusion/wealth.json")


def main():
    rules = {}
    idx = 1

    def add(when, text, weight):
        nonlocal idx
        rules[f"rule_{idx}"] = {"when": when, "text": text, "weight": weight}
        idx += 1

    benefics = ["Jupiter", "Venus", "Sun"]
    money_houses = [2, 8, 10]
    support_houses = [11, 5, 6]

    # Core: benefics in money houses
    for pl in benefics:
        for h in money_houses:
            add(
                ["wealth", "benefics_in_money_houses", pl.lower(), str(h)],
                f"{pl} in house {h} supports earnings and assets.",
                5,
            )
    # Support: benefics in support houses
    for pl in benefics:
        for h in support_houses:
            add(
                ["wealth", "benefics_in_money_houses", pl.lower(), str(h)],
                f"{pl} in house {h} aids cashflow via networks/skills.",
                3,
            )

    # Part of Fortune
    for h in range(1, 13):
        add(
            ["wealth", "pof_house", str(h)],
            f"POF in house {h}: leverage this area for financial luck.",
            4 if h in (2, 10, 11) else 2,
        )

    # Saju wealth flag
    add(["wealth", "has_wealth_sibsin", "true"], "Wealth-signifying sibsin present: cultivate assets and savings.", 4)

    # Aspects
    for n in range(2, 8):
        add(["meta", "aspects_to_lights", "soft", str(n)], f"{n} soft aspects to lights ease financial opportunities.", 3)
    for n in range(1, 6):
        add(["meta", "aspects_to_lights", "hard", str(n)], f"{n} hard aspects to lights: build reserves and mitigate risk.", 2)

    # Transits placeholders
    for n in range(1, 5):
        add(["meta", "transits_to_lights", "soft", str(n)], f"{n} supportive transits to lights: good timing for deals.", 2)
        add(["meta", "transits_to_lights", "hard", str(n)], f"{n} challenging transits: budget conservatively.", 1)

    # Filler to MAX_RULES
    houses_all = list(range(1, 13))
    themes = ["earning", "investing", "collaboration", "planning", "learning", "scaling", "saving"]
    i = 0
    while len(rules) < MAX_RULES:
        h = houses_all[i % len(houses_all)]
        add(
            ["meta", "house_counts", str(h)],
            f"House {h} activity highlights {themes[h % len(themes)]} pathways.",
            1,
        )
        i += 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rules)} rules -> {OUT_PATH}")


if __name__ == "__main__":
    main()
