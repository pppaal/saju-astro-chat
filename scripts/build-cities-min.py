#!/usr/bin/env python3
"""
public/data/cities.min.json 재생성 스크립트.

source: dr5hn/countries-states-cities-database (master branch)
union: 옛 cities.min.json 에만 있던 도시도 보존 — UX 회귀 방지

사용:
  pip install requests  # (or python3 -m pip install requests)
  python3 scripts/build-cities-min.py

결과 row shape:
  { name, country (ISO2), lat, lon, region? }

region 은 dr5hn 의 state.name (영문). KO 표시는 src/lib/cities/data/
region-names-kr.json + lookups.ts:REGION_NAME_KR 에서 한글화.
"""

import json
import os
import sys
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "public" / "data" / "cities.min.json"
DR5HN_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json"


def fetch_dr5hn() -> list:
    print(f"fetch: {DR5HN_URL}")
    with urlopen(DR5HN_URL, timeout=120) as r:
        return json.load(r)


def flatten(csc: list) -> tuple[list, set]:
    rows: list = []
    keys: set = set()  # (country_iso2, name.lower())
    for c in csc:
        iso2 = c.get("iso2")
        if not iso2:
            continue
        for st in c.get("states", []):
            region = st.get("name")
            for city in st.get("cities", []):
                n = city.get("name")
                la, lo = city.get("latitude"), city.get("longitude")
                if not (n and la and lo):
                    continue
                try:
                    la, lo = float(la), float(lo)
                except (TypeError, ValueError):
                    continue
                key = (iso2, n.lower())
                if key in keys:
                    continue  # first occurrence wins
                keys.add(key)
                row = {"name": n, "country": iso2, "lat": la, "lon": lo}
                if region:
                    row["region"] = region
                rows.append(row)
    return rows, keys


def merge_old(rows: list, keys: set) -> int:
    """옛 cities.min.json 에만 있는 도시들 보존."""
    if not TARGET.exists():
        return 0
    with TARGET.open() as f:
        old = json.load(f)
    added = 0
    for c in old:
        key = (c.get("country"), c.get("name", "").lower())
        if key in keys:
            continue
        kept = {k: v for k, v in c.items() if k in ("name", "country", "lat", "lon", "region")}
        rows.append(kept)
        keys.add(key)
        added += 1
    return added


def main() -> int:
    csc = fetch_dr5hn()
    rows, keys = flatten(csc)
    print(f"dr5hn rows: {len(rows)}")
    added = merge_old(rows, keys)
    print(f"old-only preserved: {added}, total: {len(rows)}")
    with_region = sum(1 for r in rows if r.get("region"))
    print(f"with region: {with_region} ({100 * with_region / len(rows):.1f}%)")
    with TARGET.open("w") as f:
        json.dump(rows, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {TARGET} ({TARGET.stat().st_size / 1024 / 1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
