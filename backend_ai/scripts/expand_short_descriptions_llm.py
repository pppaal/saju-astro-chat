#!/usr/bin/env python3
"""
Expand short `description` fields in graph CSVs using OpenAI.

Usage:
  python backend_ai/scripts/expand_short_descriptions_llm.py --min-len 120
  python backend_ai/scripts/expand_short_descriptions_llm.py --min-len 120 --include-path rules/tarot
"""

import argparse
import csv
import os
from pathlib import Path
from typing import Dict, List, Tuple

from dotenv import load_dotenv


def _load_env():
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=True)


def _find_csv_files(root: Path) -> List[Path]:
    return [p for p in root.rglob("*.csv") if p.is_file()]


def _should_include(path: Path, include_filter: List[str], exclude_filter: List[str]) -> bool:
    path_str = str(path).replace("\\", "/")
    if include_filter:
        if not any(f in path_str for f in include_filter):
            return False
    if exclude_filter:
        if any(f in path_str for f in exclude_filter):
            return False
    return True


def _build_context(row: Dict[str, str]) -> str:
    keys_priority = [
        "label",
        "type",
        "name_en",
        "korean_name",
        "upright_meaning",
        "reversed_meaning",
        "advice",
        "astro_correlation",
        "saju_correlation",
        "jung_archetype",
        "dream_symbol",
        "timing_guidance",
        "purpose",
        "positions",
        "best_for",
        "difficulty",
    ]

    parts = []
    for k in keys_priority:
        v = (row.get(k) or "").strip()
        if v:
            parts.append(f"{k}: {v}")

    # Fallback: include other non-empty fields (limited)
    if not parts:
        for k, v in row.items():
            if k == "description":
                continue
            v = (v or "").strip()
            if v:
                parts.append(f"{k}: {v}")
            if len(parts) >= 8:
                break

    return "\n".join(parts)


def _expand_description(client, model: str, context: str, min_len: int) -> str:
    system = (
        "You are a helpful assistant that expands short knowledge-base descriptions. "
        "Write in natural Korean, 2-4 sentences, focused and practical. "
        "Do not add facts that are not implied by the context. "
        "Avoid bullet points."
    )
    user = (
        "다음 컨텍스트를 바탕으로 `description`을 자연스러운 문장으로 확장하세요.\n"
        f"- 최소 길이: {min_len}자\n"
        "- 핵심 의미/상징/조언을 유지\n"
        "- 과장, 허구 정보 금지\n\n"
        f"컨텍스트:\n{context}"
    )
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.4,
        max_tokens=300,
    )
    text = (resp.choices[0].message.content or "").strip()
    return text


def _process_file(path: Path, client, model: str, min_len: int, max_items: int) -> Tuple[int, int]:
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if "description" not in (reader.fieldnames or []):
            return (0, 0)
        rows = list(reader)

    updated = 0
    checked = 0
    for row in rows:
        if max_items and updated >= max_items:
            break
        desc = (row.get("description") or "").strip()
        if len(desc) >= min_len:
            continue
        context = _build_context(row)
        if not context:
            continue
        checked += 1
        try:
            new_desc = _expand_description(client, model, context, min_len)
        except Exception:
            continue
        if len(new_desc) >= min_len:
            row["description"] = new_desc
            updated += 1

    if updated:
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return (updated, checked)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-len", type=int, default=120)
    parser.add_argument("--max-items", type=int, default=0, help="0 = no limit")
    parser.add_argument("--model", type=str, default="gpt-4o-mini")
    parser.add_argument("--include-path", action="append", default=[])
    parser.add_argument("--exclude-path", action="append", default=[])
    args = parser.parse_args()

    _load_env()

    try:
        from openai import OpenAI
    except Exception as e:
        raise SystemExit(f"OpenAI not available: {e}")

    client = OpenAI()

    data_root = Path(__file__).resolve().parents[1] / "data" / "graph"
    files = [p for p in _find_csv_files(data_root) if _should_include(p, args.include_path, args.exclude_path)]

    total_updated = 0
    total_checked = 0
    for path in files:
        updated, checked = _process_file(path, client, args.model, args.min_len, args.max_items)
        total_updated += updated
        total_checked += checked
        if updated:
            print(f"[updated] {path} -> {updated}")

    print(f"Done. checked={total_checked}, updated={total_updated}")


if __name__ == "__main__":
    main()
