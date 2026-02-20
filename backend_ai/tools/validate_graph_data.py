"""
Schema-aware graph data validation for the corpus.

Default mode focuses on Saju×Astro cross-domain quality (fusion data),
which is the primary production dependency for GraphRAG cross reasoning.

Usage:
  python backend_ai/tools/validate_graph_data.py
  python backend_ai/tools/validate_graph_data.py --scope full
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

SOURCE_ALIASES = {
    "src",
    "source",
    "from",
    "source_id",
    "base",
    "base_id",
    "from_id",
    "base_ganji",
    "source_iching",
}
TARGET_ALIASES = {
    "dst",
    "target",
    "to",
    "target_id",
    "flow",
    "flow_id",
    "to_id",
    "flow_ganji",
    "target_tarot",
}
ID_ALIASES = {"id", "label", "name", "code"}
TEXT_ALIASES = {
    "description",
    "content",
    "desc",
    "summary",
    "meaning",
    "interpretation",
    "rationale",
    "insight_template",
    "advice",
    "focus",
    "opportunity",
    "challenge",
}

CORE_CROSS_CSV_RULES: Dict[str, List[str]] = {
    "saju_astro_crosswalk.csv": [
        "id",
        "saju_id",
        "astro_id",
        "mapping_type",
        "confidence",
        "rationale",
        "enabled",
        "status",
    ],
    "nodes_saju_astro_bridge_concepts.csv": [
        "id",
        "label",
        "domain",
        "description",
        "status",
    ],
    "edges_geokguk_astro.csv": ["source", "target", "relation_type", "description"],
}

CORE_CROSS_JSON_RULES: Dict[str, List[str]] = {
    "cross_sipsin_planets.json": ["sipsin_planet_mapping"],
    "cross_synastry_gunghap.json": ["compatibility_systems_comparison"],
    "cross_relations_aspects.json": ["major_aspects"],
    "cross_system_validation.json": ["validation_framework"],
}

ALLOWED_STATUS_VALUES = {"active", "inactive", "deprecated"}
VALID_PLANETS = {"Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"}
VALID_SIGNS = {
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
}
EXPECTED_CHEONGAN_IDS = {
    "CHEONGAN_갑목",
    "CHEONGAN_을목",
    "CHEONGAN_병화",
    "CHEONGAN_정화",
    "CHEONGAN_무토",
    "CHEONGAN_기토",
    "CHEONGAN_경금",
    "CHEONGAN_신금",
    "CHEONGAN_임수",
    "CHEONGAN_계수",
}
EXPECTED_JIJI_IDS = {
    "BR_자",
    "BR_축",
    "BR_인",
    "BR_묘",
    "BR_진",
    "BR_사",
    "BR_오",
    "BR_미",
    "BR_신",
    "BR_유",
    "BR_술",
    "BR_해",
}


@dataclass
class ValidationSummary:
    checked_files: int = 0
    warnings: int = 0
    errors: int = 0
    core_cross_checks: int = 0
    core_cross_failures: int = 0
    rationale_avg_len: float = 0.0
    rationale_min_len: int = 0
    confidence_avg: float = 0.0

    def score(self) -> int:
        # Weighted so any hard core-cross failure immediately penalizes heavily.
        raw = 100 - (self.errors * 8) - (self.warnings * 2) - (self.core_cross_failures * 20)
        return max(0, min(100, raw))

    def grade(self) -> str:
        score = self.score()
        if score >= 98 and self.rationale_avg_len >= 80 and self.rationale_min_len >= 55 and self.confidence_avg >= 0.8:
            return "A+"
        if score >= 95:
            return "A"
        if score >= 88:
            return "B"
        if score >= 75:
            return "C"
        return "D"


def read_csv_rows(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = [(h or "").strip() for h in (reader.fieldnames or [])]
        rows = [{k: (v or "").strip() for k, v in row.items()} for row in reader]
    return headers, rows


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def collect_known_saju_ids(base: Path) -> set[str]:
    ids: set[str] = set()

    # 1) saju CSV node ids
    saju_dir = base / "saju"
    if saju_dir.exists():
        for csv_path in saju_dir.rglob("*.csv"):
            headers, rows = read_csv_rows(csv_path)
            id_col = next((h for h in headers if h.lower() in ID_ALIASES), None)
            if not id_col:
                continue
            for row in rows:
                value = row.get(id_col, "").strip()
                if value:
                    ids.add(value)

    # 2) fusion alias ids (cross-concept nodes)
    alias_csv = base / "fusion" / "nodes_multidomain_aliases.csv"
    if alias_csv.exists():
        headers, rows = read_csv_rows(alias_csv)
        id_col = next((h for h in headers if h.lower() == "id"), None)
        if id_col:
            for row in rows:
                value = row.get(id_col, "").strip()
                if value:
                    ids.add(value)

    # 3) saju interpretation json ids (e.g., geokguk ids)
    interp_dir = saju_dir / "interpretations"
    if interp_dir.exists():
        for json_path in interp_dir.rglob("*.json"):
            try:
                payload = read_json(json_path)
            except Exception:
                continue

            def walk(value):
                if isinstance(value, dict):
                    candidate = value.get("id")
                    if isinstance(candidate, str) and candidate.strip():
                        ids.add(candidate.strip())
                    for nested in value.values():
                        walk(nested)
                elif isinstance(value, list):
                    for nested in value:
                        walk(nested)

            walk(payload)

    return ids


def resolve_evidence_source_to_file(base: Path, raw: str) -> Tuple[Path | None, int | None]:
    value = (raw or "").strip()
    if not value:
        return None, None

    # Support "path:line" while keeping Windows drive letters safe.
    line_no = None
    file_part = value
    if ":" in value:
        head, tail = value.rsplit(":", 1)
        if tail.isdigit():
            file_part = head
            line_no = int(tail)

    candidate = Path(file_part)
    if candidate.exists():
        return candidate, line_no

    normalized = file_part.replace("\\", "/")
    marker = "backend_ai/data/graph/"
    if marker in normalized:
        suffix = normalized.split(marker, 1)[1]
        candidate = base / suffix
        if candidate.exists():
            return candidate, line_no

    return None, line_no


def has_any(headers: Iterable[str], aliases: Iterable[str]) -> bool:
    lowered = {h.lower() for h in headers}
    return any(a in lowered for a in aliases)


def likely_edge(headers: List[str]) -> bool:
    return has_any(headers, SOURCE_ALIASES) and has_any(headers, TARGET_ALIASES)


def validate_csv_general(path: Path, summary: ValidationSummary, issues: list[str]):
    headers, rows = read_csv_rows(path)
    summary.checked_files += 1
    name = path.name

    if not headers:
        summary.errors += 1
        issues.append(f"ERROR: Empty CSV header in {name}")
        return

    is_edge = likely_edge(headers)

    if is_edge:
        source_col = next((h for h in headers if h.lower() in SOURCE_ALIASES), None)
        target_col = next((h for h in headers if h.lower() in TARGET_ALIASES), None)
        if not source_col or not target_col:
            summary.errors += 1
            issues.append(f"ERROR: Could not resolve source/target columns in {name}")
            return
        for idx, row in enumerate(rows, 1):
            if not row.get(source_col) or not row.get(target_col):
                summary.errors += 1
                issues.append(f"ERROR: Edge endpoint missing in {name}:{idx}")
                if summary.errors > 100:
                    issues.append("ERROR: Too many errors; stopping early.")
                    return
    else:
        if not has_any(headers, ID_ALIASES):
            summary.errors += 1
            issues.append(f"ERROR: Node-like CSV missing id column in {name}")
        if not has_any(headers, TEXT_ALIASES):
            summary.warnings += 1
            issues.append(f"WARN: Node-like CSV missing text/description column in {name}")


def validate_json_general(path: Path, summary: ValidationSummary, issues: list[str]):
    summary.checked_files += 1
    try:
        data = read_json(path)
    except Exception as exc:  # pragma: no cover - explicit error path
        summary.errors += 1
        issues.append(f"ERROR: Invalid JSON {path.name}: {exc}")
        return
    if not isinstance(data, (dict, list)):
        summary.errors += 1
        issues.append(f"ERROR: JSON root must be dict/list in {path.name}")
    elif not data:
        summary.errors += 1
        issues.append(f"ERROR: Empty JSON in {path.name}")


def validate_core_cross(base: Path, summary: ValidationSummary, issues: list[str]):
    fusion = base / "fusion"
    known_saju_ids = collect_known_saju_ids(base)
    geokguk_policy_path = fusion / "geokguk_taxonomy_policy.json"
    confidence_policy_path = fusion / "confidence_calibration_policy.json"

    base_geokguk_ids: set[str] = set()
    geokguk_json_path = base / "saju" / "interpretations" / "geokguk.json"
    if geokguk_json_path.exists():
        try:
            payload = read_json(geokguk_json_path)
            def walk_geokguk(value):
                if isinstance(value, dict):
                    maybe_id = value.get("id")
                    if isinstance(maybe_id, str) and maybe_id.startswith("GK_"):
                        base_geokguk_ids.add(maybe_id)
                    for nested in value.values():
                        walk_geokguk(nested)
                elif isinstance(value, list):
                    for nested in value:
                        walk_geokguk(nested)
            walk_geokguk(payload)
        except Exception as exc:
            summary.errors += 1
            issues.append(f"ERROR: Failed to parse geokguk base source: {exc}")

    allowed_extension_ids: set[str] = set()
    intentional_unmapped_ids: set[str] = set()
    if geokguk_policy_path.exists():
        try:
            policy = read_json(geokguk_policy_path)
            allowed_extension_ids = set(policy.get("allowed_extension_ids", []))
            intentional_unmapped_ids = {
                item.get("id")
                for item in policy.get("intentional_unmapped_base_ids", [])
                if isinstance(item, dict) and isinstance(item.get("id"), str)
            }
        except Exception as exc:
            summary.errors += 1
            issues.append(f"ERROR: Failed to parse geokguk taxonomy policy: {exc}")
    else:
        summary.errors += 1
        issues.append("ERROR: Missing geokguk taxonomy policy file")

    confidence_policy = None
    if confidence_policy_path.exists():
        try:
            confidence_policy = read_json(confidence_policy_path)
        except Exception as exc:
            summary.errors += 1
            issues.append(f"ERROR: Failed to parse confidence calibration policy: {exc}")
    else:
        summary.errors += 1
        issues.append("ERROR: Missing confidence calibration policy file")

    for file_name, required_columns in CORE_CROSS_CSV_RULES.items():
        path = fusion / file_name
        summary.core_cross_checks += 1
        if not path.exists():
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Missing core cross CSV: {file_name}")
            continue

        headers, rows = read_csv_rows(path)
        missing = [c for c in required_columns if c not in headers]
        if missing:
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Core CSV {file_name} missing required columns: {missing}")
            continue
        if not rows:
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Core CSV {file_name} is empty")
            continue

        for col in required_columns:
            missing_cells = sum(1 for row in rows if not row.get(col, "").strip())
            if missing_cells > 0:
                summary.core_cross_failures += 1
                summary.errors += 1
                issues.append(
                    f"ERROR: Core CSV {file_name} has {missing_cells} empty values in required column '{col}'"
                )

        # Semantic integrity checks for key crosswalk file.
        if file_name == "saju_astro_crosswalk.csv":
            seen_ids: set[str] = set()
            seen_mapping_keys: set[tuple[str, str, str]] = set()
            now = datetime.now(timezone.utc).date()
            stale_count = 0
            unresolved_saju_refs = 0
            rationale_lengths: list[int] = []
            confidence_values: list[float] = []
            confidence_by_type: Dict[str, list[float]] = {}
            for idx, row in enumerate(rows, 1):
                record_id = row.get("id", "").strip()
                if record_id in seen_ids:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(f"ERROR: Duplicate id in {file_name}:{idx} -> {record_id}")
                seen_ids.add(record_id)

                mapping_key = (
                    row.get("saju_id", "").strip(),
                    row.get("mapping_type", "").strip(),
                    row.get("astro_id", "").strip(),
                )
                if mapping_key in seen_mapping_keys:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Duplicate mapping key in {file_name}:{idx} -> {mapping_key}"
                    )
                seen_mapping_keys.add(mapping_key)
                mapping_type = row.get("mapping_type", "").strip()

                confidence_raw = row.get("confidence", "").strip()
                try:
                    confidence = float(confidence_raw)
                except ValueError:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Invalid confidence in {file_name}:{idx} -> {confidence_raw}"
                    )
                    continue
                if confidence < 0 or confidence > 1:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Out-of-range confidence in {file_name}:{idx} -> {confidence}"
                    )
                confidence_values.append(confidence)
                confidence_by_type.setdefault(mapping_type, []).append(confidence)

                status = row.get("status", "").strip().lower()
                if status and status not in ALLOWED_STATUS_VALUES:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(f"ERROR: Invalid status in {file_name}:{idx} -> {status}")

                enabled = row.get("enabled", "").strip().lower()
                if enabled not in {"true", "false", "1", "0"}:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(f"ERROR: Invalid enabled flag in {file_name}:{idx} -> {enabled}")

                saju_id = row.get("saju_id", "").strip()
                astro_id = row.get("astro_id", "").strip()
                if saju_id and saju_id not in known_saju_ids:
                    unresolved_saju_refs += 1
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Unresolved saju_id reference in {file_name}:{idx} -> {saju_id}"
                    )

                # Contradiction guardrails: mapping-type-specific id/target constraints.
                if mapping_type == "geokguk_house":
                    if not saju_id.startswith("GK_") or not astro_id.startswith("H"):
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: geokguk_house shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )
                    else:
                        try:
                            house_num = int(astro_id[1:])
                            if house_num < 1 or house_num > 12:
                                raise ValueError()
                        except ValueError:
                            summary.core_cross_failures += 1
                            summary.errors += 1
                            issues.append(
                                f"ERROR: Invalid house id in {file_name}:{idx} -> {astro_id}"
                            )
                    if base_geokguk_ids and saju_id not in base_geokguk_ids and saju_id not in allowed_extension_ids:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: geokguk id not covered by taxonomy policy in {file_name}:{idx} -> {saju_id}"
                        )
                elif mapping_type == "geokguk_planet":
                    if not saju_id.startswith("GK_") or astro_id not in VALID_PLANETS:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: geokguk_planet shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )
                    if base_geokguk_ids and saju_id not in base_geokguk_ids and saju_id not in allowed_extension_ids:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: geokguk id not covered by taxonomy policy in {file_name}:{idx} -> {saju_id}"
                        )
                elif mapping_type == "ohaeng_sign":
                    if not saju_id.startswith("OHAENG_") or astro_id not in VALID_SIGNS:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: ohaeng_sign shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )
                elif mapping_type == "cheongan_sign":
                    if not saju_id.startswith("CHEONGAN_") or astro_id not in VALID_SIGNS:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: cheongan_sign shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )
                elif mapping_type == "sipsin_planet":
                    if not saju_id.startswith("SIPSIN_") or astro_id not in VALID_PLANETS:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: sipsin_planet shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )
                elif mapping_type == "jiji_planet":
                    if not saju_id.startswith("BR_") or astro_id not in VALID_PLANETS:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: jiji_planet shape mismatch in {file_name}:{idx} -> saju_id={saju_id}, astro_id={astro_id}"
                        )

                rationale = row.get("rationale", "").strip()
                rationale_lengths.append(len(rationale))
                if len(rationale) < 55:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Rationale too short in {file_name}:{idx} (len={len(rationale)})"
                    )
                if "??" in rationale or "�" in rationale:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Broken encoding marker in rationale {file_name}:{idx}"
                    )

                evidence_source = row.get("evidence_source", "").strip()
                resolved_file, line_no = resolve_evidence_source_to_file(base, evidence_source)
                if not resolved_file:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Unresolved evidence_source path in {file_name}:{idx} -> {evidence_source}"
                    )
                elif line_no is not None:
                    total_lines = sum(1 for _ in resolved_file.open(encoding="utf-8-sig"))
                    if line_no < 1 or line_no > total_lines:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: evidence_source line out of range in {file_name}:{idx} -> {evidence_source}"
                        )

                updated_at = row.get("updated_at", "").strip()
                if updated_at:
                    try:
                        updated_date = datetime.strptime(updated_at, "%Y-%m-%d").date()
                        age_days = (now - updated_date).days
                        if age_days > 365:
                            stale_count += 1
                    except ValueError:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: Invalid updated_at format in {file_name}:{idx} -> {updated_at}"
                        )
            if stale_count > 0:
                summary.warnings += 1
                issues.append(
                    f"WARN: {file_name} contains {stale_count} stale mappings older than 365 days"
                )
            if rationale_lengths:
                summary.rationale_avg_len = sum(rationale_lengths) / len(rationale_lengths)
                summary.rationale_min_len = min(rationale_lengths)
            if confidence_values:
                summary.confidence_avg = sum(confidence_values) / len(confidence_values)
            if unresolved_saju_refs == 0:
                # Positive signal in output detail for traceability.
                issues.append(f"INFO: {file_name} saju_id references resolved: {len(rows)} rows")

            cheongan_ids = {
                row.get("saju_id", "").strip()
                for row in rows
                if row.get("mapping_type") == "cheongan_sign"
            }
            missing_cheongan = sorted(EXPECTED_CHEONGAN_IDS - cheongan_ids)
            if missing_cheongan:
                summary.core_cross_failures += 1
                summary.errors += 1
                issues.append(f"ERROR: Missing cheongan_sign coverage: {missing_cheongan}")

            jiji_ids = {
                row.get("saju_id", "").strip()
                for row in rows
                if row.get("mapping_type") == "jiji_planet"
            }
            missing_jiji = sorted(EXPECTED_JIJI_IDS - jiji_ids)
            if missing_jiji:
                summary.core_cross_failures += 1
                summary.errors += 1
                issues.append(f"ERROR: Missing jiji_planet coverage: {missing_jiji}")

            # Confidence calibration checks (data-based by mapping type).
            if confidence_policy:
                global_min = float(confidence_policy.get("global", {}).get("min", 0.0))
                global_max = float(confidence_policy.get("global", {}).get("max", 1.0))
                if any(c < global_min or c > global_max for c in confidence_values):
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: confidence out of global calibration bounds [{global_min}, {global_max}]"
                    )

                rules = confidence_policy.get("by_mapping_type", {})
                for mapping_type, values in confidence_by_type.items():
                    if not values:
                        continue
                    rule = rules.get(mapping_type)
                    if not isinstance(rule, dict):
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: Missing confidence calibration rule for mapping_type={mapping_type}"
                        )
                        continue
                    mean_value = sum(values) / len(values)
                    mean_min = float(rule.get("mean_min", 0.0))
                    mean_max = float(rule.get("mean_max", 1.0))
                    if mean_value < mean_min or mean_value > mean_max:
                        summary.core_cross_failures += 1
                        summary.errors += 1
                        issues.append(
                            f"ERROR: confidence mean out of range for {mapping_type}: {mean_value:.3f} not in [{mean_min}, {mean_max}]"
                        )

            # Taxonomy consistency summary checks.
            if base_geokguk_ids:
                mapped_geokguk_ids = {
                    row.get("saju_id", "").strip()
                    for row in rows
                    if row.get("mapping_type") in {"geokguk_house", "geokguk_planet"}
                }
                base_unmapped = base_geokguk_ids - mapped_geokguk_ids
                unexpected_unmapped = base_unmapped - intentional_unmapped_ids
                if unexpected_unmapped:
                    summary.core_cross_failures += 1
                    summary.errors += 1
                    issues.append(
                        f"ERROR: Base geokguk ids unmapped without policy exception: {sorted(unexpected_unmapped)}"
                    )

    for file_name, required_keys in CORE_CROSS_JSON_RULES.items():
        path = fusion / file_name
        summary.core_cross_checks += 1
        if not path.exists():
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Missing core cross JSON: {file_name}")
            continue

        try:
            data = read_json(path)
        except Exception as exc:  # pragma: no cover - explicit error path
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Invalid core JSON {file_name}: {exc}")
            continue

        if not isinstance(data, dict):
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Core JSON {file_name} must be an object")
            continue

        missing = [key for key in required_keys if key not in data]
        if missing:
            summary.core_cross_failures += 1
            summary.errors += 1
            issues.append(f"ERROR: Core JSON {file_name} missing keys: {missing}")


def iter_graph_files(base: Path):
    for root, _, files in os.walk(base):
        for file_name in files:
            path = Path(root) / file_name
            lower = file_name.lower()
            if lower.endswith(".csv"):
                yield "csv", path
            elif lower.endswith(".json") and "dream" not in str(path).lower():
                yield "json", path


def run_validation(scope: str) -> Tuple[ValidationSummary, list[str]]:
    base = Path(__file__).resolve().parents[1] / "data" / "graph"
    summary = ValidationSummary()
    issues: list[str] = []

    if not base.is_dir():
        summary.errors += 1
        issues.append(f"ERROR: Graph dir not found: {base}")
        return summary, issues

    validate_core_cross(base, summary, issues)

    if scope == "full":
        for file_type, path in iter_graph_files(base):
            if file_type == "csv":
                validate_csv_general(path, summary, issues)
            else:
                validate_json_general(path, summary, issues)

    return summary, issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", choices=["core", "full"], default="core")
    args = parser.parse_args()

    summary, issues = run_validation(args.scope)

    print("[VALIDATION] Graph data quality report")
    print(f"- scope: {args.scope}")
    print(f"- checked files: {summary.checked_files}")
    print(f"- core cross checks: {summary.core_cross_checks}")
    print(f"- warnings: {summary.warnings}")
    print(f"- errors: {summary.errors}")
    print(f"- score: {summary.score()}/100")
    print(f"- grade: {summary.grade()}")
    if summary.rationale_avg_len > 0:
        print(f"- rationale_avg_len: {summary.rationale_avg_len:.1f}")
        print(f"- rationale_min_len: {summary.rationale_min_len}")
    if summary.confidence_avg > 0:
        print(f"- confidence_avg: {summary.confidence_avg:.3f}")

    if issues:
        print("\n[DETAILS]")
        for item in issues[:200]:
            try:
                print("-", item)
            except UnicodeEncodeError:
                print("-", item.encode("unicode_escape").decode("ascii"))
        if len(issues) > 200:
            print(f"- ... truncated {len(issues) - 200} more items")

    # Fails only on hard errors so this can be a deterministic quality gate.
    sys.exit(1 if summary.errors > 0 else 0)


if __name__ == "__main__":
    main()
