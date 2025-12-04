"""
Inspect a DestinyMap result JSON (logs/destinymap-*.json or any path)
to understand the available astro/saju fields for signal extraction.

Usage:
  python backend_ai/tools/inspect_destiny_log.py [path_to_json]
If no path is given, the newest logs/destinymap-*.json is used.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict


def summarize_planets(planets):
    out = []
    for p in planets[:5]:
        if isinstance(p, dict):
            out.append(
                {
                    "name": p.get("name"),
                    "sign": p.get("sign"),
                    "house": p.get("house"),
                    "retrograde": p.get("retrograde"),
                }
            )
    return out


def summarize_aspects(aspects):
    out = []
    for a in aspects[:5]:
        if isinstance(a, dict):
            out.append(
                {
                    "from": a.get("from", {}).get("name") if isinstance(a.get("from"), dict) else None,
                    "to": a.get("to", {}).get("name") if isinstance(a.get("to"), dict) else None,
                    "type": a.get("type"),
                    "orb": a.get("orb"),
                }
            )
    return out


def summarize_astro(astro: Dict[str, Any]):
    planets = astro.get("planets") or []
    aspects = astro.get("aspects") or []
    asc = astro.get("ascendant") or astro.get("asc")
    mc = astro.get("mc")
    houses = astro.get("houses") or []
    return {
        "planets_sample": summarize_planets(planets),
        "aspects_sample": summarize_aspects(aspects),
        "asc": asc.get("sign") if isinstance(asc, dict) else asc,
        "mc": mc.get("sign") if isinstance(mc, dict) else mc,
        "house_count": len(houses),
        "elementRatios": astro.get("facts", {}).get("elementRatios") or astro.get("elementRatios"),
    }


def summarize_pillars(pillars):
    out = {}
    if isinstance(pillars, dict):
        for k in ["year", "month", "day", "time"]:
            v = pillars.get(k)
            if isinstance(v, dict):
                out[k] = {
                    "name": v.get("name"),
                    "element": v.get("element"),
                    "sibsin": v.get("sibsin") or v.get("heavenlyStem", {}).get("sibsin"),
                }
    return out


def summarize_unse(unse):
    if not isinstance(unse, dict):
        return {}
    return {
        "daeun": len(unse.get("daeun") or []),
        "annual": len(unse.get("annual") or []),
        "monthly": len(unse.get("monthly") or []),
    }


def summarize_saju(saju: Dict[str, Any]):
    return {
        "dayMaster": saju.get("dayMaster"),
        "pillars": summarize_pillars(saju.get("pillars") or {}),
        "unse_counts": summarize_unse(saju.get("unse") or {}),
        "sinsal_hits": len((saju.get("sinsal") or {}).get("hits") or []),
    }


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def find_latest_log() -> Path:
    logs_dir = Path("logs")
    candidates = sorted(logs_dir.glob("destinymap-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError("No logs/destinymap-*.json found. Provide a path explicitly.")
    return candidates[0]


def main():
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = find_latest_log()

    data = load_json(path)
    report = data.get("report") or data  # logs saved with {body, report}
    astro = report.get("raw", {}).get("raw", {}).get("astrology") or report.get("astrology") or {}
    saju = report.get("raw", {}).get("raw", {}).get("saju") or report.get("saju") or {}

    print(f"# Inspecting: {path}")
    print("## Astro summary")
    print(json.dumps(summarize_astro(astro), ensure_ascii=False, indent=2))
    print("\n## Saju summary")
    print(json.dumps(summarize_saju(saju), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
