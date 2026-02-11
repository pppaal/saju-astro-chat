"""
Create ASTRO_* alias nodes, map to canonical nodes where possible,
and rewrite edge references to canonical IDs.

Usage:
  python backend_ai/tools/graph_alias_and_rewrite.py
"""

from __future__ import annotations

import csv
import datetime as dt
import hashlib
import re
from pathlib import Path

GRAPH_DIR = Path(__file__).resolve().parents[1] / "data" / "graph"
REPORT_DIR = Path(__file__).resolve().parents[2] / "reports"

EDGE_SRC_KEYS = ("source", "src", "from")
EDGE_DST_KEYS = ("target", "dst", "to")

PLANET_NAMES = [
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
    "Chiron",
]

PLANET_KO_MAP = {
    "태양": "Sun",
    "달": "Moon",
    "수성": "Mercury",
    "금성": "Venus",
    "화성": "Mars",
    "목성": "Jupiter",
    "토성": "Saturn",
    "천왕성": "Uranus",
    "해왕성": "Neptune",
    "명왕성": "Pluto",
}

SIGN_NAMES = [
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
]


def read_csv(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return reader.fieldnames or [], rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def is_edge_csv(fieldnames: list[str]) -> bool:
    if not fieldnames:
        return False
    lower = [f.lower() for f in fieldnames]
    has_src = any(k in lower for k in EDGE_SRC_KEYS)
    has_dst = any(k in lower for k in EDGE_DST_KEYS)
    return has_src and has_dst


def get_edge_value(row: dict, keys: tuple[str, ...]) -> str | None:
    for k in keys:
        if k in row and row[k]:
            return row[k]
    return None


def set_edge_value(row: dict, keys: tuple[str, ...], value: str) -> bool:
    for k in keys:
        if k in row:
            row[k] = value
            return True
    return False


def load_node_ids():
    node_ids: set[str] = set()
    for path in GRAPH_DIR.rglob("*.csv"):
        fieldnames, rows = read_csv(path)
        if is_edge_csv(fieldnames):
            continue
        for row in rows:
            node_id = row.get("id") or row.get("label") or row.get("name")
            if node_id:
                node_ids.add(node_id)
    return node_ids


def build_maps():
    node_ids = load_node_ids()

    sign_ids = set()
    for path in [
        GRAPH_DIR / "astro" / "nodes_astro_signs_detailed.csv",
        GRAPH_DIR / "astro_database" / "nodes" / "nodes_astro_signs.csv",
    ]:
        if path.exists():
            _, rows = read_csv(path)
            for row in rows:
                node_id = row.get("id")
                if node_id:
                    sign_ids.add(node_id)

    house_ids = set()
    for path in [
        GRAPH_DIR / "astro" / "nodes_astro_houses.csv",
        GRAPH_DIR / "astro_database" / "nodes" / "nodes_astro_houses.csv",
    ]:
        if path.exists():
            _, rows = read_csv(path)
            for row in rows:
                node_id = row.get("id")
                if node_id:
                    house_ids.add(node_id)

    planet_ids = set()
    for path in [
        GRAPH_DIR / "astro" / "nodes_astro_planets_detailed.csv",
        GRAPH_DIR / "astro_database" / "nodes" / "nodes_astro_planets.csv",
    ]:
        if path.exists():
            _, rows = read_csv(path)
            for row in rows:
                node_id = row.get("id")
                if node_id:
                    planet_ids.add(node_id)

    points_ids = set()
    points_path = GRAPH_DIR / "astro_database" / "nodes" / "nodes_astro_points.csv"
    if points_path.exists():
        _, rows = read_csv(points_path)
        for row in rows:
            node_id = row.get("id")
            if node_id:
                points_ids.add(node_id)

    aspect_map = {}
    for path in [
        GRAPH_DIR / "astro" / "nodes_astro_aspects.csv",
        GRAPH_DIR / "astro" / "nodes_astro_aspects_expanded.csv",
    ]:
        if path.exists():
            _, rows = read_csv(path)
            for row in rows:
                aspect_name = row.get("aspect_name")
                node_id = row.get("id")
                if aspect_name and node_id:
                    aspect_map[aspect_name.lower()] = node_id

    planet_sign_map = {}
    ps_path = GRAPH_DIR / "astro" / "nodes_astro_planet_sign.csv"
    if ps_path.exists():
        _, rows = read_csv(ps_path)
        for row in rows:
            planet = row.get("planet")
            sign = row.get("sign")
            node_id = row.get("id")
            if planet and sign and node_id:
                planet_sign_map[(planet.lower(), sign.lower())] = node_id

    planet_house_map = {}
    hp_path = GRAPH_DIR / "astro" / "nodes_astro_house_planet_combinations.csv"
    if hp_path.exists():
        _, rows = read_csv(hp_path)
        for row in rows:
            node_id = row.get("id", "")
            if node_id.startswith("HP_"):
                parts = node_id.split("_")
                if len(parts) == 3 and parts[2].isdigit():
                    planet_house_map[(parts[1].lower(), parts[2])] = node_id

    transit_map = {}
    return_map = {}
    transits_path = GRAPH_DIR / "astro" / "nodes_astro_transits.csv"
    if transits_path.exists():
        _, rows = read_csv(transits_path)
        for row in rows:
            planet = row.get("transit_planet")
            node_id = row.get("id")
            if planet and node_id:
                key = planet.lower()
                transit_map[key] = node_id
                if key.endswith("_return"):
                    return_map[key[: -len("_return")]] = node_id

    return {
        "node_ids": node_ids,
        "sign_ids": sign_ids,
        "house_ids": house_ids,
        "planet_ids": planet_ids,
        "points_ids": points_ids,
        "aspect_map": aspect_map,
        "planet_sign_map": planet_sign_map,
        "planet_house_map": planet_house_map,
        "transit_map": transit_map,
        "return_map": return_map,
    }


def resolve_planet(name: str, planet_ids: set[str]) -> str | None:
    for planet in PLANET_NAMES:
        if name.lower() == planet.lower():
            return planet if planet in planet_ids else None
    return None


def resolve_sign(name: str, sign_ids: set[str]) -> str | None:
    for sign in SIGN_NAMES:
        if name.lower() == sign.lower():
            return sign if sign in sign_ids else None
    return None


def map_alias(alias: str, maps: dict) -> str | None:
    if not alias.upper().startswith("ASTRO_"):
        return None
    raw = alias[len("ASTRO_") :]
    raw_upper = raw.upper()
    raw_lower = raw.lower()

    if raw_upper.startswith("TRANSIT_"):
        planet = raw[8:]
        return maps["transit_map"].get(planet.lower())

    if raw_upper.startswith("TIMING_"):
        token = raw[7:]
        token_lower = token.lower()
        if token_lower.endswith("return"):
            base = token_lower[: -len("return")]
            mapped = maps["return_map"].get(base)
            if mapped:
                return mapped
        return maps["transit_map"].get(token_lower)

    if raw_upper.startswith("ASPECT_"):
        aspect = raw[7:]
        return maps["aspect_map"].get(aspect.lower())

    if raw_upper.startswith("HOUSE_H"):
        house_num = raw[7:]
        if house_num.isdigit():
            return f"H{house_num}"

    house_match = re.search(r"(\d+)(st|nd|rd|th)house", raw_lower)
    if house_match:
        house_num = house_match.group(1)
        house_id = f"H{house_num}"
        if house_id in maps["house_ids"]:
            return house_id

    if raw_upper.startswith("PLANET_"):
        planet = raw[7:]
        resolved = resolve_planet(planet, maps["planet_ids"])
        if resolved:
            return resolved

    ordinal_match = re.search(r"(?P<planet>[A-Za-z]+)(?P<house>\d+)(st|nd|rd|th)", raw)
    if ordinal_match:
        planet = ordinal_match.group("planet").lower()
        house = ordinal_match.group("house")
        mapped = maps["planet_house_map"].get((planet, house))
        if mapped:
            return mapped

    if raw_lower.endswith("transit"):
        for planet in PLANET_NAMES:
            if planet.lower() in raw_lower:
                mapped = maps["transit_map"].get(planet.lower())
                if mapped:
                    return mapped

    # ASTRO_<Planet>_H#
    match = re.match(r"^(?P<planet>[A-Za-z]+)_H(?P<house>\d+)$", raw)
    if match:
        planet = match.group("planet").lower()
        house = match.group("house")
        mapped = maps["planet_house_map"].get((planet, house))
        if mapped:
            return mapped

    # ASTRO_<Planet>_<Sign>
    match = re.match(r"^(?P<planet>[A-Za-z]+)_(?P<sign>[A-Za-z]+)$", raw)
    if match:
        planet = match.group("planet").lower()
        sign = match.group("sign").lower()
        mapped = maps["planet_sign_map"].get((planet, sign))
        if mapped:
            return mapped

    # ASTRO_<Planet>
    resolved = resolve_planet(raw, maps["planet_ids"])
    if resolved:
        return resolved

    # ASTRO_<Sign>
    resolved = resolve_sign(raw, maps["sign_ids"])
    if resolved:
        return resolved

    # Specific points
    if "chiron" in raw_lower:
        return "Chiron" if "Chiron" in maps["planet_ids"] else None
    if "fortune" in raw_lower:
        return "PartOfFortune" if "PartOfFortune" in maps["points_ids"] else None
    if "lilith" in raw_lower:
        return "Black_Moon_Lilith" if "Black_Moon_Lilith" in maps["planet_ids"] else None

    return None


def make_label(alias: str) -> str:
    return alias.replace("ASTRO_", "").replace("_", " ")


def edge_id(prefix: str, source: str, target: str) -> str:
    digest = hashlib.md5(f"{source}->{target}".encode("utf-8")).hexdigest()[:8]
    return f"{prefix}_{digest}"


def infer_related_targets(alias: str, maps: dict) -> list[tuple[str, str]]:
    """
    Return list of (relation, target) tuples for concept nodes.
    """
    relations: list[tuple[str, str]] = []
    raw = alias[len("ASTRO_") :] if alias.upper().startswith("ASTRO_") else alias
    raw_lower = raw.lower()

    # Houses by ordinal
    for match in re.finditer(r"(\d+)(st|nd|rd|th)?house", raw_lower):
        house_num = match.group(1)
        house_id = f"H{house_num}"
        if house_id in maps["house_ids"]:
            relations.append(("mentions_house", house_id))

    # Houses by ordinal without 'house' (e.g., Saturn12th)
    for match in re.finditer(r"(\d+)(st|nd|rd|th)", raw_lower):
        house_num = match.group(1)
        house_id = f"H{house_num}"
        if house_id in maps["house_ids"]:
            relations.append(("mentions_house", house_id))

    # Planets by name
    for planet in PLANET_NAMES:
        if planet.lower() in raw_lower and planet in maps["planet_ids"]:
            relations.append(("mentions_planet", planet))

    # Planets by Korean name
    for ko, planet in PLANET_KO_MAP.items():
        if ko in raw and planet in maps["planet_ids"]:
            relations.append(("mentions_planet", planet))

    # Signs by name
    for sign in SIGN_NAMES:
        if sign.lower() in raw_lower and sign in maps["sign_ids"]:
            relations.append(("mentions_sign", sign))

    # Points
    if "mc" in raw_lower and "MC" in maps["points_ids"]:
        relations.append(("mentions_point", "MC"))
    if "asc" in raw_lower and "Asc" in maps["points_ids"]:
        relations.append(("mentions_point", "Asc"))
    if "node" in raw_lower and "Node" in maps["points_ids"]:
        relations.append(("mentions_point", "Node"))
    if "chiron" in raw_lower and "Chiron" in maps["planet_ids"]:
        relations.append(("mentions_planet", "Chiron"))
    if "fortune" in raw_lower and "PartOfFortune" in maps["points_ids"]:
        relations.append(("mentions_point", "PartOfFortune"))
    if "lilith" in raw_lower and "Black_Moon_Lilith" in maps["planet_ids"]:
        relations.append(("mentions_point", "Black_Moon_Lilith"))

    # Aspect hints
    if "conj" in raw_lower:
        aspect_id = maps["aspect_map"].get("conjunction")
        if aspect_id:
            relations.append(("mentions_aspect", aspect_id))

    for aspect_name in ("opposition", "square", "trine", "sextile"):
        if aspect_name in raw_lower:
            aspect_id = maps["aspect_map"].get(aspect_name)
            if aspect_id:
                relations.append(("mentions_aspect", aspect_id))

    return relations


def main():
    if not GRAPH_DIR.is_dir():
        raise SystemExit(f"Graph directory not found: {GRAPH_DIR}")

    maps = build_maps()

    alias_used: set[str] = set()
    alias_to_canonical: dict[str, str] = {}
    rewritten_counts = {}

    for path in GRAPH_DIR.rglob("*.csv"):
        fieldnames, rows = read_csv(path)
        if not is_edge_csv(fieldnames):
            continue
        changed = False
        for row in rows:
            src = get_edge_value(row, EDGE_SRC_KEYS)
            dst = get_edge_value(row, EDGE_DST_KEYS)
            for value, keys in [(src, EDGE_SRC_KEYS), (dst, EDGE_DST_KEYS)]:
                if value and value.upper().startswith("ASTRO_"):
                    alias_used.add(value)
                    if value not in alias_to_canonical:
                        mapped = map_alias(value, maps)
                        if mapped:
                            alias_to_canonical[value] = mapped
                    mapped = alias_to_canonical.get(value)
                    if mapped:
                        if set_edge_value(row, keys, mapped):
                            changed = True
        if changed:
            write_csv(path, fieldnames, rows)
            rewritten_counts[str(path)] = rewritten_counts.get(str(path), 0) + 1

    # Build alias nodes
    alias_nodes = []
    alias_edges = []
    edge_dedup = set()

    pattern_links = {
        "ASTRO_PATTERN_Yod": ["PATTERN_011"],
        "ASTRO_PATTERN_Stellium": ["PATTERN_014"],
        "ASTRO_PATTERN_GrandTrine": ["PATTERN_001", "PATTERN_002", "PATTERN_003", "PATTERN_004"],
    }

    for alias in sorted(alias_used):
        canonical = alias_to_canonical.get(alias)
        label = make_label(alias)
        if alias.upper().startswith("ASTRO_ELEMENT_"):
            node_type = "astro_element"
        elif canonical:
            node_type = "astro_alias"
        else:
            node_type = "astro_concept"
        description = (
            f"{alias} is an alias for {canonical}."
            if canonical
            else f"{alias} 점성학 개념/조합 노드."
        )
        alias_nodes.append(
            {
                "id": alias,
                "label": label,
                "type": node_type,
                "canonical_id": canonical or "",
                "description": description,
            }
        )

        if canonical:
            edge_key = (alias, canonical, "alias_of")
            if edge_key not in edge_dedup:
                edge_dedup.add(edge_key)
                alias_edges.append(
                    {
                        "id": edge_id("ALIAS", alias, canonical),
                        "source": alias,
                        "target": canonical,
                        "relation": "alias_of",
                        "description": f"{alias} -> {canonical} alias",
                    }
                )

        # Pattern-specific links
        if alias in pattern_links:
            for target in pattern_links[alias]:
                if target in maps["node_ids"]:
                    edge_key = (alias, target, "variant_of")
                    if edge_key not in edge_dedup:
                        edge_dedup.add(edge_key)
                        alias_edges.append(
                            {
                                "id": edge_id("ALIAS", alias, target),
                                "source": alias,
                                "target": target,
                                "relation": "variant_of",
                                "description": f"{alias} -> {target} pattern variant",
                            }
                        )

        # Benefic/Malefic concept links
        if alias == "ASTRO_CONCEPT_Benefic":
            for target in ("Jupiter", "Venus"):
                if target in maps["planet_ids"]:
                    edge_key = (alias, target, "related_to")
                    if edge_key not in edge_dedup:
                        edge_dedup.add(edge_key)
                        alias_edges.append(
                            {
                                "id": edge_id("ALIAS", alias, target),
                                "source": alias,
                                "target": target,
                                "relation": "related_to",
                                "description": f"{alias} -> {target} benefic link",
                            }
                        )
        if alias == "ASTRO_CONCEPT_Malefic":
            for target in ("Mars", "Saturn"):
                if target in maps["planet_ids"]:
                    edge_key = (alias, target, "related_to")
                    if edge_key not in edge_dedup:
                        edge_dedup.add(edge_key)
                        alias_edges.append(
                            {
                                "id": edge_id("ALIAS", alias, target),
                                "source": alias,
                                "target": target,
                                "relation": "related_to",
                                "description": f"{alias} -> {target} malefic link",
                            }
                        )

        # Cycle houses links
        if alias == "ASTRO_CYCLE_Houses":
            for house_id in sorted(maps["house_ids"]):
                edge_key = (alias, house_id, "includes_house")
                if edge_key not in edge_dedup:
                    edge_dedup.add(edge_key)
                    alias_edges.append(
                        {
                            "id": edge_id("ALIAS", alias, house_id),
                            "source": alias,
                            "target": house_id,
                            "relation": "includes_house",
                            "description": f"{alias} -> {house_id} house cycle",
                        }
                    )

        # Infer links for concept nodes
        if not canonical:
            for relation, target in infer_related_targets(alias, maps):
                edge_key = (alias, target, relation)
                if edge_key not in edge_dedup:
                    edge_dedup.add(edge_key)
                    alias_edges.append(
                        {
                            "id": edge_id("ALIAS", alias, target),
                            "source": alias,
                            "target": target,
                            "relation": relation,
                            "description": f"{alias} -> {target} ({relation})",
                        }
                    )

    # Append alias nodes and edges
    nodes_path = GRAPH_DIR / "astro" / "nodes_astro_aliases.csv"
    edges_path = GRAPH_DIR / "astro" / "edges_astro_alias_links.csv"

    write_csv(
        nodes_path,
        ["id", "label", "type", "canonical_id", "description"],
        alias_nodes,
    )
    write_csv(
        edges_path,
        ["id", "source", "target", "relation", "description"],
        alias_edges,
    )
    nodes_added = len(alias_nodes)
    nodes_total = len(alias_nodes)
    edges_added = len(alias_edges)
    edges_total = len(alias_edges)

    # Recompute missing references
    node_ids = load_node_ids()
    referenced = set()
    for path in GRAPH_DIR.rglob("*.csv"):
        fieldnames, rows = read_csv(path)
        if not is_edge_csv(fieldnames):
            continue
        for row in rows:
            src = get_edge_value(row, EDGE_SRC_KEYS)
            dst = get_edge_value(row, EDGE_DST_KEYS)
            if src and dst:
                referenced.add(src)
                referenced.add(dst)
    missing = sorted(referenced - node_ids)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"graph_alias_rewrite_{dt.date.today().isoformat()}.md"
    report_lines = [
        "# Graph Alias & Rewrite Report",
        f"- Date: {dt.date.today().isoformat()}",
        "",
        "## Alias Summary",
        f"- ASTRO aliases detected: {len(alias_used)}",
        f"- Aliases mapped to canonical: {len(alias_to_canonical)}",
        f"- Alias nodes added: {nodes_added} (total {nodes_total})",
        f"- Alias edges added: {edges_added} (total {edges_total})",
        "",
        "## Edge Rewrites",
    ]
    if rewritten_counts:
        for path, count in sorted(rewritten_counts.items()):
            report_lines.append(f"- {path}: {count} rewrite batches")
    else:
        report_lines.append("- No edge rewrites applied")
    report_lines += [
        "",
        "## Missing References After Rewrite",
        f"- Total referenced IDs: {len(referenced)}",
        f"- Total node IDs: {len(node_ids)}",
        f"- Missing IDs: {len(missing)}",
        "",
        "## Missing Sample (first 50)",
    ]
    report_lines.extend([f"- {m}" for m in missing[:50]])
    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print("Graph alias & rewrite complete.")
    print(f"Report: {report_path}")
    print(f"Missing IDs after rewrite: {len(missing)}")


if __name__ == "__main__":
    main()
