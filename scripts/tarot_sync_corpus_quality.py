#!/usr/bin/env python3
"""Normalize tarot corpus rows for consistent fallback quality."""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

CORPUS_PATH = Path("backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl")


def normalize_card_name(value):
    if isinstance(value, dict):
        ko = str(value.get("ko") or "").strip()
        en = str(value.get("en") or "").strip()
        if ko and en:
            return f"{ko} / {en}"
        return ko or en
    if isinstance(value, str):
        text = value.strip()
        if text.startswith("{") and text.endswith("}"):
            parsed = None
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                try:
                    parsed = ast.literal_eval(text)
                except Exception:
                    parsed = None
            if isinstance(parsed, dict):
                return normalize_card_name(parsed)
        return text
    return str(value or "").strip()


def clean_text(text: str, card_name: str) -> str:
    cleaned = text or ""
    if card_name:
        cleaned = re.sub(r"Card:\s*\{[^\n|]+\}", f"Card: {card_name}", cleaned)
    core_pattern = re.compile(r"(Core:\s*[^.]+\.)\s*\1")
    for _ in range(3):
        updated = core_pattern.sub(r"\1", cleaned)
        if updated == cleaned:
            break
        cleaned = updated
    return re.sub(r"\s{2,}", " ", cleaned).strip()


def main() -> int:
    if not CORPUS_PATH.exists():
        raise SystemExit(f"Missing corpus: {CORPUS_PATH}")

    rows = []
    card_name_fixed = 0
    text_fixed = 0

    with CORPUS_PATH.open("r", encoding="utf-8-sig") as f:
        for line in f:
            stripped = line.strip()
            if not stripped:
                continue
            row = json.loads(stripped)

            original_card_name = row.get("card_name")
            normalized_card_name = normalize_card_name(original_card_name)
            if normalized_card_name and normalized_card_name != original_card_name:
                row["card_name"] = normalized_card_name
                card_name_fixed += 1

            original_text = str(row.get("text") or "")
            cleaned = clean_text(original_text, row.get("card_name") or "")
            if cleaned != original_text:
                row["text"] = cleaned
                text_fixed += 1

            rows.append(row)

    with CORPUS_PATH.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"rows={len(rows)} card_name_fixed={card_name_fixed} text_fixed={text_fixed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
