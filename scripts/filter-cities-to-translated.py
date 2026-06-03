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
import unicodedata
from pathlib import Path


def fold(s: str) -> str:
    """악센트 제거 + 소문자 (Córdoba/Cordoba 를 같게 본다)."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()

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
    bad_coord = 0
    for c in cities:
        name = c.get("name") or ""
        country = (c.get("country") or "").upper()
        # 좌표 (0,0) 은 소스(dr5hn) 데이터 오류(바다 한가운데) — 사주 계산에
        # 쓸 수 없으므로 제외. 위경도 누락도 제외.
        lat, lon = c.get("lat"), c.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or (lat == 0 and lon == 0):
            bad_coord += 1
            continue
        if country == "KR" or capitalize_words(name) in covered:
            kept.append(c)
    if bad_coord:
        print(f"  (좌표 오류 제외: {bad_coord})")

    # 악센트 차이 중복 제거: 같은 국가에서 악센트만 다르고 좌표가 거의 같은
    # 도시(Córdoba vs Cordoba)는 한 곳만 남긴다. 좌표를 0.1° 로 반올림해 키에
    # 넣어, 이름만 같고 위치가 다른 동명 도시(여러 Springfield 등)는 보존한다.
    seen = set()
    deduped = []
    dropped = 0
    for c in kept:
        key = (fold(c.get("name") or ""), (c.get("country") or "").upper(),
               round(float(c.get("lat", 0)), 1), round(float(c.get("lon", 0)), 1))
        if key in seen:
            dropped += 1
            continue
        seen.add(key)
        deduped.append(c)
    kept = deduped

    print(f"cities: {len(cities)} → {len(kept)} (필터/중복제거, 악센트중복 {dropped})")
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
