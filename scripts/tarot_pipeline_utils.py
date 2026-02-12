"""
Shared utilities for tarot data quality/rebuild/eval scripts.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend_ai"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

DEFAULT_CORPUS_PATH = BACKEND_ROOT / "data" / "tarot_corpus" / "tarot_corpus_v1.jsonl"
DEFAULT_EDGES_PATH = BACKEND_ROOT / "data" / "graph" / "tarot" / "edges_tarot_combinations.csv"
DEFAULT_TAROT_GRAPH_DIR = BACKEND_ROOT / "data" / "graph" / "tarot"
DEFAULT_RULE_COMBOS_PATH = BACKEND_ROOT / "data" / "graph" / "rules" / "tarot" / "tarot_combinations.csv"
DEFAULT_NODES_COMBOS_PATH = BACKEND_ROOT / "data" / "graph" / "tarot" / "nodes_tarot_combinations.csv"
DEFAULT_COMPLETE_INTERPRETATIONS_PATH = (
    BACKEND_ROOT / "data" / "graph" / "rules" / "tarot" / "complete_interpretations.json"
)

ORIENTATION_ENUM = {"upright", "reversed"}
DOMAIN_ENUM = {"love", "career", "money", "general"}
RELATION_ENUM = {"combo_member", "combo_related", "supports", "contrasts"}

REQUIRED_RECORD_FIELDS = (
    "doc_id",
    "doc_type",
    "card_id",
    "card_name",
    "orientation",
    "domain",
    "source",
    "version",
    "text",
)


def make_doc_id(
    card_id: str,
    orientation: str,
    domain: str,
    position: Optional[str],
    version: str,
) -> str:
    base = f"{card_id}|{orientation}|{domain}|{position or ''}|{version}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


def make_edge_id(source: str, target: str, relation: str) -> str:
    base = f"{source}|{target}|{relation}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


def load_jsonl_records(path: Path) -> List[Dict]:
    records: List[Dict] = []
    with path.open("r", encoding="utf-8-sig") as f:
        for line_no, line in enumerate(f, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                data = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at line {line_no}: {exc}") from exc
            if not isinstance(data, dict):
                raise ValueError(f"JSONL line {line_no} must be an object")
            records.append(data)
    return records


def load_tarot_card_set(complete_interpretations_path: Path) -> Set[str]:
    data = json.loads(complete_interpretations_path.read_text(encoding="utf-8"))
    allowed: Set[str] = set()
    for section in ("major_arcana", "minor_arcana"):
        for item in data.get(section, []):
            card_id = str(item.get("id") or "").strip()
            if card_id:
                allowed.add(card_id)
    return allowed


def load_tarot_node_ids(tarot_graph_dir: Path) -> Set[str]:
    node_ids: Set[str] = set()
    for csv_path in sorted(tarot_graph_dir.glob("nodes_*.csv")):
        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw = (row.get("id") or row.get("label") or row.get("name") or "").strip()
                if raw:
                    node_ids.add(raw)
    return node_ids


def sanitize_chroma_metadata(value):
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple, set)):
        return ",".join(str(v) for v in value)
    return str(value)


@dataclass
class LintResult:
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors

    def add_error(self, message: str):
        self.errors.append(message)

    def add_warning(self, message: str):
        self.warnings.append(message)


@dataclass
class ComboSourceStats:
    complete_interpretations_count: int = 0
    rules_combo_rows: int = 0
    nodes_combo_rows: int = 0

    @property
    def expected_combo_doc_floor(self) -> int:
        """When combo docs are enabled, use rules CSV as minimum deterministic floor."""
        return self.rules_combo_rows


def _safe_csv_row_count(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return sum(1 for _ in reader)


def load_combo_source_stats(
    complete_interpretations_path: Path = DEFAULT_COMPLETE_INTERPRETATIONS_PATH,
    rules_combo_path: Path = DEFAULT_RULE_COMBOS_PATH,
    nodes_combo_path: Path = DEFAULT_NODES_COMBOS_PATH,
) -> ComboSourceStats:
    ci_count = 0
    if complete_interpretations_path.exists():
        data = json.loads(complete_interpretations_path.read_text(encoding="utf-8-sig"))
        ci_count = len(data.get("combinations") or [])
    return ComboSourceStats(
        complete_interpretations_count=ci_count,
        rules_combo_rows=_safe_csv_row_count(rules_combo_path),
        nodes_combo_rows=_safe_csv_row_count(nodes_combo_path),
    )


def lint_tarot_dataset(
    corpus_path: Path = DEFAULT_CORPUS_PATH,
    edges_path: Path = DEFAULT_EDGES_PATH,
    tarot_graph_dir: Path = DEFAULT_TAROT_GRAPH_DIR,
    complete_interpretations_path: Path = DEFAULT_COMPLETE_INTERPRETATIONS_PATH,
) -> LintResult:
    result = LintResult()

    if not corpus_path.exists():
        result.add_error(f"Corpus file not found: {corpus_path}")
        return result
    if not edges_path.exists():
        result.add_error(f"Edges file not found: {edges_path}")
        return result
    if not complete_interpretations_path.exists():
        result.add_error(f"Card-set source not found: {complete_interpretations_path}")
        return result

    try:
        records = load_jsonl_records(corpus_path)
    except Exception as exc:
        result.add_error(str(exc))
        return result

    allowed_cards = load_tarot_card_set(complete_interpretations_path)
    seen_doc_ids: Set[str] = set()
    duplicate_doc_ids: Set[str] = set()

    for idx, record in enumerate(records, start=1):
        for field_name in REQUIRED_RECORD_FIELDS:
            raw = record.get(field_name)
            if raw is None or (isinstance(raw, str) and not raw.strip()):
                result.add_error(f"record#{idx}: missing required field '{field_name}'")

        orientation = str(record.get("orientation") or "").strip()
        if orientation not in ORIENTATION_ENUM:
            result.add_error(f"record#{idx}: invalid orientation '{orientation}'")

        domain = str(record.get("domain") or "").strip()
        if domain not in DOMAIN_ENUM:
            result.add_error(f"record#{idx}: invalid domain '{domain}'")

        card_id = str(record.get("card_id") or "").strip()
        if card_id and not card_id.startswith("combo:") and card_id not in allowed_cards:
            result.add_error(f"record#{idx}: unknown card_id '{card_id}'")

        position = str(record.get("position") or "").strip()
        version = str(record.get("version") or "").strip()
        expected_doc_id = make_doc_id(card_id, orientation, domain, position, version)
        doc_id = str(record.get("doc_id") or "").strip()
        if doc_id and doc_id != expected_doc_id:
            result.add_error(
                f"record#{idx}: doc_id mismatch (got={doc_id}, expected={expected_doc_id})"
            )

        if doc_id in seen_doc_ids:
            duplicate_doc_ids.add(doc_id)
        seen_doc_ids.add(doc_id)

    for dup in sorted(duplicate_doc_ids):
        result.add_error(f"duplicate doc_id collision: {dup}")

    node_ids = load_tarot_node_ids(tarot_graph_dir)
    if not node_ids:
        result.add_warning(f"No tarot node IDs loaded from: {tarot_graph_dir}")

    with edges_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_no, row in enumerate(reader, start=2):
            source = (row.get("source") or "").strip()
            target = (row.get("target") or "").strip()
            relation = (row.get("relation") or "").strip()
            raw_weight = (row.get("weight") or "").strip()
            edge_id = (row.get("edge_id") or "").strip()

            if not source or not target:
                result.add_error(f"edges:{row_no}: source/target is required")
                continue

            if node_ids:
                if source not in node_ids:
                    result.add_error(f"edges:{row_no}: source node missing '{source}'")
                if target not in node_ids:
                    result.add_error(f"edges:{row_no}: target node missing '{target}'")

            if relation not in RELATION_ENUM:
                result.add_error(f"edges:{row_no}: invalid relation '{relation}'")

            try:
                weight = float(raw_weight)
            except ValueError:
                result.add_error(f"edges:{row_no}: weight must be numeric (got '{raw_weight}')")
                weight = -1.0
            if not (0.0 <= weight <= 1.0):
                result.add_error(f"edges:{row_no}: weight out of range [0,1] (got {raw_weight})")

            expected_edge_id = make_edge_id(source, target, relation)
            if not edge_id:
                result.add_error(f"edges:{row_no}: missing edge_id")
            elif edge_id != expected_edge_id:
                result.add_error(
                    f"edges:{row_no}: edge_id mismatch (got={edge_id}, expected={expected_edge_id})"
                )

    return result


def summarize_lint_result(lint_result: LintResult) -> str:
    lines = [
        f"Lint status: {'PASS' if lint_result.ok else 'FAIL'}",
        f"Errors: {len(lint_result.errors)}",
        f"Warnings: {len(lint_result.warnings)}",
    ]
    if lint_result.errors:
        lines.append("Top errors:")
        for msg in lint_result.errors[:20]:
            lines.append(f"- {msg}")
    if lint_result.warnings:
        lines.append("Warnings:")
        for msg in lint_result.warnings[:20]:
            lines.append(f"- {msg}")
    return "\n".join(lines)


def chunked(items: List, size: int) -> Iterable[List]:
    for i in range(0, len(items), size):
        yield items[i : i + size]
