#!/usr/bin/env python3
"""
public/data/cities.min.json 을 '한국어 이름이 있는 도시'만 남기도록 필터링한다.

배경
----
도시 14만 개 중 한국어 매핑이 있는 건 일부라, KO locale 에서 미커버 도시가
영어로 폴백돼 혼란스럽다. 커버 안 되는 도시는 picker 에서 버리고, KO/EN 둘 다
깔끔히 표시되는 도시만 남긴다. (먼저 build-city-names-kr-geonames.py 로 한국어
커버리지를 최대화한 뒤 실행할 것.)

안전장치
--------
- 한국(country='KR') 도시는 한국어 이름 매칭 여부와 무관하게 **항상 유지**
  (국내 사용자의 출생지를 잃지 않도록).
- formatter.ts 와 동일한 키 정규화(capitalizeWords)로 매칭.

사용
----
  python3 scripts/filter-cities-to-translated.py            # 실제 필터+저장
  python3 scripts/filter-cities-to-translated.py --dry-run  # 통계만
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITIES_PATH = ROOT / "public" / "data" / "cities.min.json"
KR_PATH = ROOT / "src" / "lib" / "cities" / "data" / "city-names-kr.json"


def capitalize_words(s: str) -> str:
    """formatter.ts 의 capitalizeWords 와 동일."""
    return " ".join(w[:1].upper() + w[1:].lower() for w in s.lower().split(" ") if w)


def strip_quotes(k: str) -> str:
    return k[1:-1] if k.startswith("'") and k.endswith("'") else k


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cities = json.loads(CITIES_PATH.read_text(encoding="utf-8"))
    kr = json.loads(KR_PATH.read_text(encoding="utf-8"))

    # 커버 집합: city-names-kr.json 키를 formatter 가 조회하는 형태로 정규화.
    covered = {capitalize_words(strip_quotes(k)) for k in kr}

    kept = []
    for c in cities:
        name = c.get("name") or ""
        country = (c.get("country") or "").upper()
        if country == "KR" or capitalize_words(name) in covered:
            kept.append(c)

    print(f"cities: {len(cities)} → {len(kept)} (제거 {len(cities) - len(kept)})")
    kr_kept = sum(1 for c in kept if (c.get('country') or '').upper() == 'KR')
    print(f"  (한국 도시 유지: {kr_kept})")

    if args.dry_run:
        return

    # 기존 파일 스타일(한 객체 = 한 줄, 중괄호 안쪽 공백)에 맞춰 저장해 diff 를
    # 사람이 읽기 쉽게 한다.  예: `  { "name": "Seoul", "country": "KR", ... }`
    def line(obj: dict) -> str:
        inner = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
        return "  { " + inner[1:-1].strip() + " }"

    body = ",\n".join(line(c) for c in kept)
    CITIES_PATH.write_text("[\n" + body + "\n]\n", encoding="utf-8")
    print(f"wrote {CITIES_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
