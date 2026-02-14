"""Unit tests for tarot data pipeline helper scripts."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import json


REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_module(module_name: str, relative_path: str):
    module_path = REPO_ROOT / relative_path
    scripts_dir = str((REPO_ROOT / "scripts").resolve())
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def test_combo_source_stats_explain_8_doc_gap():
    utils = _load_module("tarot_pipeline_utils", "scripts/tarot_pipeline_utils.py")
    stats = utils.load_combo_source_stats()

    # complete_interpretations has very few combo entries while rules/nodes are large.
    assert stats.complete_interpretations_count == 8
    assert stats.rules_combo_rows >= 3000
    assert stats.nodes_combo_rows >= 3000
    assert stats.expected_combo_doc_floor == stats.rules_combo_rows


def test_tag_leakage_detector_flags_direct_tag_tokens():
    tarot_eval = _load_module("tarot_eval_script", "scripts/tarot_eval.py")

    assert tarot_eval._tag_leakage_detected("love advice please", ["love"]) is True
    assert tarot_eval._tag_leakage_detected("관계 흐름 점검해줘", ["love", "upright"]) is False


def test_realstyle_draws_dataset_has_draws():
    eval_path = REPO_ROOT / "data" / "eval" / "eval_realstyle_draws.jsonl"
    if not eval_path.exists():
        return

    first = eval_path.read_text(encoding="utf-8-sig").splitlines()[0]
    row = json.loads(first)
    assert isinstance(row.get("draws"), list)
    assert row["draws"]
