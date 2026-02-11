from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Dict, Iterable, Optional, Sequence, Tuple


GRAPH_DIR = Path(__file__).resolve().parents[1] / "data" / "graph"

NODE_ID_FIELDS: Tuple[str, ...] = ("id", "label", "name")
EDGE_SRC_FIELDS: Tuple[str, ...] = ("src", "source", "source_id", "source_iching", "from", "base_ganji")
EDGE_DST_FIELDS: Tuple[str, ...] = ("dst", "target", "target_id", "target_tarot", "to", "flow_ganji")
GANJI_FIELDS: Tuple[str, ...] = ("base_ganji", "flow_ganji")


ASTRO_PLANETS: Sequence[str] = (
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
)

ASTRO_SIGNS: Sequence[str] = (
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
)

ASTRO_POINTS: Sequence[str] = (
    "Asc",
    "MC",
    "IC",
    "Desc",
    "Node",
    "NorthNode",
    "SouthNode",
    "Chiron",
    "Vertex",
    "PartOfFortune",
)

ASTRO_PLANET_SET = set(ASTRO_PLANETS)
ASTRO_SIGN_SET = set(ASTRO_SIGNS)
ASTRO_POINT_SET = set(ASTRO_POINTS)


ELEMENT_ALIASES: Dict[str, str] = {
    "목": "목",
    "木": "목",
    "WOOD": "목",
    "화": "화",
    "火": "화",
    "FIRE": "화",
    "토": "토",
    "土": "토",
    "EARTH": "토",
    "금": "금",
    "金": "금",
    "METAL": "금",
    "수": "수",
    "水": "수",
    "WATER": "수",
}

STEM_HANJA_TO_HANGUL: Dict[str, str] = {
    "甲": "갑",
    "乙": "을",
    "丙": "병",
    "丁": "정",
    "戊": "무",
    "己": "기",
    "庚": "경",
    "辛": "신",
    "壬": "임",
    "癸": "계",
    "갑": "갑",
    "을": "을",
    "병": "병",
    "정": "정",
    "무": "무",
    "기": "기",
    "경": "경",
    "신": "신",
    "임": "임",
    "계": "계",
}

BRANCH_HANJA_TO_HANGUL: Dict[str, str] = {
    "子": "자",
    "丑": "축",
    "寅": "인",
    "卯": "묘",
    "辰": "진",
    "巳": "사",
    "午": "오",
    "未": "미",
    "申": "신",
    "酉": "유",
    "戌": "술",
    "亥": "해",
    "자": "자",
    "축": "축",
    "인": "인",
    "묘": "묘",
    "진": "진",
    "사": "사",
    "오": "오",
    "미": "미",
    "신": "신",
    "유": "유",
    "술": "술",
    "해": "해",
}

POINT_ALIASES: Dict[str, str] = {
    "ASC": "Asc",
    "ASCENDANT": "Asc",
    "MC": "MC",
    "MIDHEAVEN": "MC",
    "IC": "IC",
    "DESC": "Desc",
    "DESCENDANT": "Desc",
    "NODE": "Node",
    "NORTHNODE": "NorthNode",
    "SOUTHNODE": "SouthNode",
    "CHIRON": "Chiron",
    "VERTEX": "Vertex",
    "PARTOFFORTUNE": "PartOfFortune",
    "FORTUNE": "PartOfFortune",
}


def _normalize_compact(value: str) -> str:
    return re.sub(r"[^A-Za-z]", "", value or "").lower()


def _match_by_set(value: str, valid: Iterable[str]) -> Optional[str]:
    if not value:
        return None
    if value in valid:
        return value
    lowered = value.lower()
    for item in valid:
        if item.lower() == lowered:
            return item
    compact = _normalize_compact(value)
    if compact:
        for item in valid:
            if _normalize_compact(item) == compact:
                return item
    return None


def _normalize_planet(value: str) -> Optional[str]:
    return _match_by_set(value, ASTRO_PLANET_SET)


def _normalize_sign(value: str) -> Optional[str]:
    return _match_by_set(value, ASTRO_SIGN_SET)


def _normalize_point(value: str) -> Optional[str]:
    if not value:
        return None
    direct = _match_by_set(value, ASTRO_POINT_SET)
    if direct:
        return direct
    key = _normalize_compact(value).upper()
    return POINT_ALIASES.get(key)


def _normalize_saju_element(value: str) -> Optional[str]:
    if not value:
        return None
    raw = value.split("(", 1)[0].strip()
    if raw in ELEMENT_ALIASES:
        return ELEMENT_ALIASES[raw]
    upper = raw.upper()
    return ELEMENT_ALIASES.get(upper)


def _normalize_stem(value: str) -> Optional[str]:
    if not value:
        return None
    return STEM_HANJA_TO_HANGUL.get(value)


def _normalize_branch(value: str) -> Optional[str]:
    if not value:
        return None
    return BRANCH_HANJA_TO_HANGUL.get(value)


def _normalize_ganji_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    raw = value.strip()
    if raw.startswith(("GAN_", "BR_", "EL_")):
        return raw
    if len(raw) == 2:
        stem = _normalize_stem(raw[0])
        branch = _normalize_branch(raw[1])
        if stem and branch:
            return f"GAN_{stem}{branch}"
    if len(raw) == 1:
        stem = _normalize_stem(raw)
        if stem:
            return f"GAN_{stem}"
        branch = _normalize_branch(raw)
        if branch:
            return f"BR_{branch}"
    return value


def _load_ap_map() -> Dict[str, str]:
    path = GRAPH_DIR / "astro" / "nodes_astro_planets_detailed.csv"
    if not path.exists():
        return {}
    mapping: Dict[str, str] = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            node_id = (row.get("id") or "").strip()
            planet = (row.get("planet") or "").strip()
            if node_id and planet:
                mapping[node_id] = planet
    return mapping


def _load_as_map() -> Dict[str, str]:
    path = GRAPH_DIR / "astro" / "nodes_astro_signs_detailed.csv"
    if not path.exists():
        return {}
    mapping: Dict[str, str] = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            node_id = (row.get("id") or "").strip()
            sign = (row.get("sign") or "").strip()
            if node_id and sign:
                mapping[node_id] = sign
    return mapping


def _load_ah_map() -> Dict[str, str]:
    path = GRAPH_DIR / "astro" / "nodes_astro_houses.csv"
    if not path.exists():
        return {}
    mapping: Dict[str, str] = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            node_id = (row.get("id") or "").strip()
            house_number = (row.get("house_number") or row.get("house") or "").strip()
            if node_id and house_number.isdigit():
                mapping[node_id] = f"H{int(house_number)}"
    return mapping


AP_MAP = _load_ap_map()
AS_MAP = _load_as_map()
AH_MAP = _load_ah_map()


def _normalize_node_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    raw = value.strip()

    if raw in AP_MAP:
        return AP_MAP[raw]
    if raw in AS_MAP:
        return AS_MAP[raw]
    if raw in AH_MAP:
        return AH_MAP[raw]

    if raw.startswith("AP_"):
        name = raw.split("_", 1)[-1]
        mapped = _normalize_planet(name)
        return mapped or raw

    if raw.startswith("AS_"):
        name = raw.split("_", 1)[-1]
        house_match = re.match(r"^(\d{1,2})(?:st|nd|rd|th)?_house$", name, flags=re.IGNORECASE)
        if house_match:
            return f"H{int(house_match.group(1))}"
        mapped = _normalize_sign(name) or _normalize_planet(name) or _normalize_point(name)
        return mapped or raw

    if raw.startswith("AH_"):
        number = raw.split("_", 1)[-1]
        if number.isdigit():
            return f"H{int(number)}"

    if raw.startswith("ASTRO_PLANET_"):
        name = raw.split("_", 2)[-1]
        mapped = _normalize_planet(name)
        return mapped or raw

    if raw.startswith("ASTRO_SIGN_"):
        name = raw.split("_", 2)[-1]
        mapped = _normalize_sign(name)
        return mapped or raw

    if raw.startswith("ASTRO_HOUSE_"):
        number = raw.split("_", 2)[-1]
        if number.isdigit():
            return f"H{int(number)}"

    if raw.startswith("ASTRO_POINT_"):
        name = raw.split("_", 2)[-1]
        mapped = _normalize_point(name)
        return mapped or raw

    if raw.startswith("ASTRO_NODE_"):
        name = raw.split("_", 2)[-1]
        mapped = _normalize_point(f"{name}Node") or _normalize_point(name)
        return mapped or raw

    if raw.startswith("SAJU_ELEMENT_"):
        elem = raw.split("_", 2)[-1]
        mapped = _normalize_saju_element(elem)
        if mapped:
            return f"EL_{mapped}"

    return raw


def _detect_line_settings(path: Path) -> Tuple[str, str]:
    data = path.read_bytes()
    has_bom = data.startswith(b"\xef\xbb\xbf")
    newline = "\r\n" if b"\r\n" in data else "\n"
    encoding = "utf-8-sig" if has_bom else "utf-8"
    return encoding, newline


def _process_csv(path: Path) -> bool:
    encoding, newline = _detect_line_settings(path)
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            return False
        rows = list(reader)

    is_edge = any(f in fieldnames for f in EDGE_SRC_FIELDS + EDGE_DST_FIELDS)
    changed = False

    if is_edge:
        edge_fields = [f for f in EDGE_SRC_FIELDS + EDGE_DST_FIELDS if f in fieldnames]
        for row in rows:
            for field in edge_fields:
                current = row.get(field)
                updated = _normalize_node_id(current)
                if updated != current:
                    row[field] = updated
                    changed = True
            for field in GANJI_FIELDS:
                if field not in row:
                    continue
                current = row.get(field)
                updated = _normalize_ganji_value(current)
                if updated != current:
                    row[field] = updated
                    changed = True
    else:
        id_field = None
        for candidate in NODE_ID_FIELDS:
            if candidate in fieldnames:
                id_field = candidate
                break
        if id_field:
            for row in rows:
                current = row.get(id_field)
                updated = _normalize_node_id(current)
                if updated != current:
                    row[id_field] = updated
                    changed = True

    if not changed:
        return False

    with open(path, "w", newline="", encoding=encoding) as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator=newline)
        writer.writeheader()
        writer.writerows(rows)

    return True


def main() -> None:
    csv_paths = sorted(GRAPH_DIR.rglob("*.csv"))
    changed_files = []
    for path in csv_paths:
        if _process_csv(path):
            changed_files.append(path)

    print(f"Updated {len(changed_files)} CSV files.")
    for path in changed_files:
        rel = path.relative_to(GRAPH_DIR)
        print(f" - {rel}")


if __name__ == "__main__":
    main()
