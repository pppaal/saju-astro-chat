#!/usr/bin/env python3
"""
src/lib/cities/data/city-names-kr.json 을 GeoNames 로 자동 보강한다.

배경
----
public/data/cities.min.json 에 142k 도시가 있지만 city-names-kr.json 은 ~1.4k
(약 1%) 만 한글 매핑이라 KO locale 에서 99% 도시가 영어로 표시된다.
translate-cities-kr.py(Claude API) 는 전체를 채우지만 느리고($14, 20~40분)
비용이 든다. GeoNames 는 무료·정확(실제 등록된 한글 이름)·빠름(1~2분).

방식
----
GeoNames citiesN.txt 의 `alternatenames` 칼럼(쉼표 구분, 다국어 혼합)에서
**한글(U+AC00–U+D7A3) 이 들어간 토큰**을 골라 그 도시의 한국어 이름으로 쓴다.
언어 태그가 붙은 거대한 alternateNames 파일(수백 MB) 을 받을 필요가 없다.

GeoNames 파일 (TSV, 헤더 없음):
  col1 name, col2 asciiname(영문), col3 alternatenames, col8 country code

매칭
----
cities.min.json 의 각 도시 name 을 GeoNames 의 asciiname/name 과 정규화 비교
(소문자·공백 정리, 가능하면 country code 까지). 매칭되면 그 도시 표시명을
formatter 가 찾는 키 형태(capitalizeWords)로 저장한다. 기존 수기 매핑은
신뢰도가 높으므로 보존하고(덮어쓰지 않음) 빠진 것만 채운다.

전제
----
- 네트워크에서 download.geonames.org 접근 가능해야 함 (일부 샌드박스는 차단).
- Python 3.9+, 표준 라이브러리만 사용.

사용
----
  python3 scripts/build-city-names-kr-geonames.py
  # 옵션:
  #   --source cities500|cities1000|cities5000|cities15000  (default cities5000)
  #            인구 하한. 작을수록 도시 수↑(파일 큼). cities1000 ≈ 142k DB 와 근접.
  #   --limit N   테스트용. 입력 도시 N 개만 처리.
  #   --dry-run   파일 쓰지 않고 매칭 통계만 출력.
"""

import argparse
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITIES_PATH = ROOT / "public" / "data" / "cities.min.json"
KR_PATH = ROOT / "src" / "lib" / "cities" / "data" / "city-names-kr.json"

GEONAMES_BASE = "https://download.geonames.org/export/dump/"
HANGUL = re.compile(r"[가-힣]")


def norm(s: str) -> str:
    """매칭용 정규화: 소문자 + 공백/구분 정리."""
    return re.sub(r"\s+", " ", s.strip().lower())


def capitalize_words(s: str) -> str:
    """formatter.ts 의 capitalizeWords 와 동일 — 출력 키 형태를 맞춘다."""
    return " ".join(w[:1].upper() + w[1:].lower() for w in s.lower().split(" ") if w)


def pick_korean(alternatenames: str) -> str | None:
    """쉼표 구분 alternatenames 에서 한글이 든 첫 토큰을 고른다."""
    for tok in alternatenames.split(","):
        t = tok.strip()
        if t and HANGUL.search(t):
            return t
    return None


def download_geonames(source: str) -> bytes:
    url = f"{GEONAMES_BASE}{source}.zip"
    print(f"downloading {url} ...", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": "saju-city-build/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def build_geo_kr(zip_bytes: bytes) -> tuple[dict, dict]:
    """GeoNames zip → (이름+국가 → 한글), (이름 → 한글) 두 lookup."""
    by_name_country: dict[tuple[str, str], str] = {}
    by_name: dict[str, str] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        txt_name = next(n for n in zf.namelist() if n.endswith(".txt"))
        with zf.open(txt_name) as f:
            for raw in io.TextIOWrapper(f, encoding="utf-8"):
                cols = raw.rstrip("\n").split("\t")
                if len(cols) < 9:
                    continue
                name, ascii_name, alt, country = cols[1], cols[2], cols[3], cols[8]
                kr = pick_korean(alt)
                if not kr:
                    continue
                for nm in {ascii_name, name}:
                    if not nm:
                        continue
                    key = norm(nm)
                    by_name.setdefault(key, kr)
                    if country:
                        by_name_country.setdefault((key, country.upper()), kr)
    return by_name_country, by_name


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="cities5000",
                    choices=["cities500", "cities1000", "cities5000", "cities15000"])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cities = json.loads(CITIES_PATH.read_text(encoding="utf-8"))
    if args.limit:
        cities = cities[: args.limit]
    existing = json.loads(KR_PATH.read_text(encoding="utf-8"))
    print(f"cities: {len(cities)} / existing KR: {len(existing)}", file=sys.stderr)

    by_name_country, by_name = build_geo_kr(download_geonames(args.source))
    print(f"GeoNames KR names: {len(by_name)} (by name)", file=sys.stderr)

    merged = dict(existing)  # 기존 수기 매핑 보존
    added = 0
    for c in cities:
        name = c.get("name")
        if not name:
            continue
        key = capitalize_words(name)
        if key in merged:
            continue  # 이미 있음(수기 or 앞서 추가)
        nkey = norm(name)
        country = (c.get("country") or "").upper()
        kr = by_name_country.get((nkey, country)) or by_name.get(nkey)
        if kr and kr != key:
            merged[key] = kr
            added += 1

    print(f"added: {added} → total: {len(merged)}", file=sys.stderr)

    if args.dry_run:
        sample = [(k, merged[k]) for k in list(merged)[-10:]]
        print("sample (last 10):", json.dumps(dict(sample), ensure_ascii=False), file=sys.stderr)
        return

    out = {k: merged[k] for k in sorted(merged)}
    KR_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {KR_PATH.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
