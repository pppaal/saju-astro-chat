"""
Generate love/relationship rules for fusion rule engine.
Tokens align with signal_extractor outputs:
 - love.venus_mars_moon_in_rel_houses -> tokens: love, venus_mars_moon_in_rel_houses, <planet>, <house>
 - love_sinsal_hits / love_sinsal_count -> tokens: love, love_sinsal_hits, <kind>; love_sinsal_count, <n>
 - meta.aspects_to_lights (soft/hard) -> meta, aspects_to_lights, soft/hard, <n>

Weights:
 - core 5: Venus/Mars/Moon in 7/5/1, love sinsal hits
 - support 3: soft aspects count high
 - misc 1–2: filler/other houses
"""

import json
from pathlib import Path

MAX_RULES = 700
OUT_PATH = Path("backend_ai/data/graph/rules/fusion/love.json")


def main():
    rules = {}
    idx = 1

    def add(when, text, weight):
        nonlocal idx
        rules[f"rule_{idx}"] = {"when": when, "text": text, "weight": weight}
        idx += 1

    rel_houses_core = [7, 5, 1]
    rel_houses_support = [11, 9, 3]
    planets = ["Venus", "Mars", "Moon"]
    sinsal_kinds = ["도화", "홍염", "문곡", "고신"]

    # Core: planets in key relationship houses
    for pl in planets:
        for h in rel_houses_core:
            add(
                ["love", "venus_mars_moon_in_rel_houses", pl.lower(), str(h)],
                f"{pl} in house {h} amplifies attraction and bonding.",
                5,
            )
    # Support: planets in supportive houses
    for pl in planets:
        for h in rel_houses_support:
            add(
                ["love", "venus_mars_moon_in_rel_houses", pl.lower(), str(h)],
                f"{pl} in house {h} opens social/romantic opportunities.",
                3,
            )

    # Love sinsal hits
    for k in sinsal_kinds:
        add(["love", "love_sinsal_hits", k], f"Sinsal {k} present: heightened romance/charisma.", 5)
    for n in range(1, 6):
        add(["love", "love_sinsal_count", str(n)], f"{n} romance-related sinsal markers active.", 3)

    # Soft/hard aspects to lights
    for n in range(2, 8):
        add(["meta", "aspects_to_lights", "soft", str(n)], f"{n} soft aspects to lights ease harmony.", 3)
    for n in range(1, 6):
        add(["meta", "aspects_to_lights", "hard", str(n)], f"{n} hard aspects to lights require conscious care in relationships.", 2)

    # Transit placeholders
    for n in range(1, 5):
        add(["meta", "transits_to_lights", "soft", str(n)], f"{n} supportive transits to lights boost romance timing.", 2)
    for n in range(1, 4):
        add(["meta", "transits_to_lights", "hard", str(n)], f"{n} challenging transits to lights: go slow, communicate.", 1)

    # Filler up to MAX_RULES
    houses_all = list(range(1, 13))
    themes = ["tenderness", "passion", "communication", "trust", "loyalty", "creativity", "shared goals"]
    for h in houses_all:
        for pl in planets:
            if len(rules) >= MAX_RULES:
                break
            add(
                ["love", "venus_mars_moon_in_rel_houses", pl.lower(), str(h)],
                f"{pl} influencing house {h} highlights {themes[h % len(themes)]} in relationships.",
                1,
            )
        if len(rules) >= MAX_RULES:
            break

    # Final filler to reach MAX_RULES
    i = 0
    while len(rules) < MAX_RULES:
        h = houses_all[i % len(houses_all)]
        add(
            ["meta", "house_counts", str(h)],
            f"House {h} emphasis invites mindful connection and balance.",
            1,
        )
        i += 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rules)} rules -> {OUT_PATH}")


if __name__ == "__main__":
    main()
