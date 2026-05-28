#!/usr/bin/env python3
"""
public/data/cities.min.json 재생성 스크립트.

source:
  - dr5hn/countries-states-cities-database (master branch) — 142k 도시
  - src/lib/cities/data/kr-cities-extra.json — KR coverage 보강
    (dr5hn KR=297개로 부족, 안산·봉화·보성 등 중간 도시 누락)

사용:
  python3 scripts/build-cities-min.py

결과 row shape:
  { name, country (ISO2), lat, lon, region }

region 은 dr5hn state.name (영문). KR 보강분의 region 은 9개 도(province)
중 lat/lon nearest 로 지정. KO 표시는 lookups.ts:REGION_NAME_KR 에서
한글화.
"""

import json
import os
import sys
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "public" / "data" / "cities.min.json"
KR_EXTRA = ROOT / "src" / "lib" / "cities" / "data" / "kr-cities-extra.json"
DR5HN_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json"


def fetch_dr5hn() -> list:
    print(f"fetch: {DR5HN_URL}")
    with urlopen(DR5HN_URL, timeout=120) as r:
        return json.load(r)


def flatten(csc: list) -> tuple[list, set]:
    rows: list = []
    keys: set = set()
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
                    continue
                keys.add(key)
                rows.append(
                    {"name": n, "country": iso2, "lat": la, "lon": lo, "region": region}
                )
    return rows, keys


def append_kr_extras(rows: list, keys: set) -> int:
    """dr5hn KR coverage 부족분을 kr-cities-extra.json 으로 보강."""
    if not KR_EXTRA.exists():
        print(f"warn: {KR_EXTRA} missing — skipping KR augment")
        return 0
    with KR_EXTRA.open() as f:
        extras = json.load(f)
    added = 0
    for c in extras:
        n = c.get("name")
        if not n:
            continue
        key = ("KR", n.lower())
        if key in keys:
            continue
        keys.add(key)
        rows.append(
            {
                "name": n,
                "country": "KR",
                "lat": c["lat"],
                "lon": c["lon"],
                "region": c["region"],
            }
        )
        added += 1
    return added


def main() -> int:
    csc = fetch_dr5hn()
    rows, keys = flatten(csc)
    print(f"dr5hn rows: {len(rows)}")
    kr_added = append_kr_extras(rows, keys)
    print(f"KR augment: +{kr_added} → total {len(rows)}")
    with TARGET.open("w") as f:
        json.dump(rows, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {TARGET} ({TARGET.stat().st_size / 1024 / 1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
