#!/usr/bin/env python3
"""
public/data/cities.min.json 재생성 스크립트.

source: dr5hn/countries-states-cities-database (master branch)

사용:
  python3 scripts/build-cities-min.py

결과 row shape:
  { name, country (ISO2), lat, lon, region }

region 은 dr5hn 의 state.name (영문). 모든 row 에 region 보장
(state 없이 들어있던 일부 city 는 의도적으로 drop — admin1 없는 도시는
사실상 country-only 매핑으로 표기 가치 낮음).

KO 표시는 src/lib/cities/data/region-names-kr.json +
lookups.ts:REGION_NAME_KR 에서 한글화 (PR #851).
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


def flatten(csc: list) -> list:
    rows: list = []
    keys: set = set()  # (country_iso2, name.lower())
    for c in csc:
        iso2 = c.get("iso2")
        if not iso2:
            continue
        for st in c.get("states", []):
            region = st.get("name")
            if not region:
                continue
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
                rows.append(
                    {"name": n, "country": iso2, "lat": la, "lon": lo, "region": region}
                )
    return rows


def main() -> int:
    csc = fetch_dr5hn()
    rows = flatten(csc)
    print(f"rows: {len(rows)} (all with region)")
    with TARGET.open("w") as f:
        json.dump(rows, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {TARGET} ({TARGET.stat().st_size / 1024 / 1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
