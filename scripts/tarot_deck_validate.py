#!/usr/bin/env python3
"""
Validate tarot deck metadata consistency across frontend/backend contracts.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict, List, Set

REPO_ROOT = Path(__file__).resolve().parents[1]


def ensure_artifacts_dir() -> Path:
    path = REPO_ROOT / "artifacts"
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_markdown(path: Path, lines: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate tarot decks and card mappings")
    parser.add_argument("--output-md", default="artifacts/deck_validation_report.md")
    return parser.parse_args()


def _extract_deck_styles(ts_text: str) -> List[str]:
    m = re.search(r"DECK_STYLES\s*=\s*\[(.*?)\]\s*as const", ts_text, re.S)
    if not m:
        return []
    return re.findall(r"'([^']+)'", m.group(1))


def _extract_back_images(ts_text: str) -> Dict[str, str]:
    deck_to_image: Dict[str, str] = {}
    block = re.search(r"DECK_STYLE_INFO:\s*Record<DeckStyle,\s*DeckStyleInfo>\s*=\s*\{(.*)\}\s*", ts_text, re.S)
    if not block:
        return deck_to_image
    blob = block.group(1)
    entry_pat = re.compile(r"(\w+):\s*\{(.*?)\}\s*,", re.S)
    for dm in entry_pat.finditer(blob):
        deck_id = dm.group(1)
        inner = dm.group(2)
        im = re.search(r"backImage:\s*'([^']+)'", inner)
        if im:
            deck_to_image[deck_id] = im.group(1)
    return deck_to_image


def _extract_card_ids_from_data(data_dir: Path) -> Set[int]:
    ids: Set[int] = set()
    for path in sorted(data_dir.glob("*.ts")):
        if path.name in {"index.ts", "tarot-types.ts"}:
            continue
        text = path.read_text(encoding="utf-8")
        for raw in re.findall(r"\bid:\s*(\d+)\s*,", text):
            ids.add(int(raw))
    return ids


def _extract_card_name_issues(data_dir: Path) -> List[str]:
    issues: List[str] = []
    card_pat = re.compile(r"\{[\s\S]*?\bid:\s*(\d+)\s*,[\s\S]*?\bname:\s*'([^']*)'[\s\S]*?\bnameKo:\s*'([^']*)'", re.S)
    for path in sorted(data_dir.glob("*.ts")):
        if path.name in {"index.ts", "tarot-types.ts"}:
            continue
        text = path.read_text(encoding="utf-8")
        for m in card_pat.finditer(text):
            cid = m.group(1)
            name = m.group(2).strip()
            name_ko = m.group(3).strip()
            if not name:
                issues.append(f"{path.name} card_id={cid}: empty name")
            if not name_ko:
                issues.append(f"{path.name} card_id={cid}: empty nameKo")
    return issues


def _orientation_contract_ok(interpret_route_text: str) -> bool:
    # Front-end -> backend transform consistency:
    # isReversed (frontend) mapped to is_reversed (backend payload).
    return "is_reversed: c.isReversed" in interpret_route_text and "isReversed" in interpret_route_text


def main() -> int:
    args = parse_args()
    tarot_types = REPO_ROOT / "src" / "lib" / "Tarot" / "tarot.types.ts"
    tarot_data_dir = REPO_ROOT / "src" / "lib" / "Tarot" / "data"
    interpret_route = REPO_ROOT / "src" / "app" / "api" / "tarot" / "interpret" / "route.ts"

    ts_text = tarot_types.read_text(encoding="utf-8")
    interpret_text = interpret_route.read_text(encoding="utf-8")

    deck_styles = _extract_deck_styles(ts_text)
    deck_images = _extract_back_images(ts_text)
    card_ids = _extract_card_ids_from_data(tarot_data_dir)
    name_issues = _extract_card_name_issues(tarot_data_dir)

    expected_ids = set(range(78))
    missing_ids = sorted(expected_ids - card_ids)
    extra_ids = sorted(card_ids - expected_ids)

    deck_issues: List[str] = []
    for deck in deck_styles:
        if deck not in deck_images:
            deck_issues.append(f"{deck}: missing backImage metadata")
            continue
        img_rel = deck_images[deck].lstrip("/")
        img_path = REPO_ROOT / "public" / img_rel
        if not img_path.exists():
            deck_issues.append(f"{deck}: missing image file {deck_images[deck]}")

    orientation_ok = _orientation_contract_ok(interpret_text)
    if not orientation_ok:
        deck_issues.append("orientation mapping mismatch: expected isReversed -> is_reversed bridge in interpret route")

    pass_fail = "PASS" if not (missing_ids or extra_ids or name_issues or deck_issues) else "FAIL"
    lines = [
        "# Deck Validation Report",
        "",
        f"- status: {pass_fail}",
        f"- deck_count: {len(deck_styles)}",
        f"- card_count_detected: {len(card_ids)}",
        f"- card_id_range_ok(0..77): {not missing_ids and not extra_ids}",
        f"- orientation_contract_ok: {orientation_ok}",
        "",
        "## Decks",
    ]
    for d in deck_styles:
        img = deck_images.get(d, "(missing)")
        lines.append(f"- {d}: {img}")

    lines.extend(["", "## Card ID Issues"])
    if not missing_ids and not extra_ids:
        lines.append("- none")
    else:
        if missing_ids:
            lines.append(f"- missing_ids: {missing_ids}")
        if extra_ids:
            lines.append(f"- extra_ids: {extra_ids}")

    lines.extend(["", "## Card Name Issues"])
    if not name_issues:
        lines.append("- none")
    else:
        for it in name_issues[:100]:
            lines.append(f"- {it}")

    lines.extend(["", "## Deck Meta Issues"])
    if not deck_issues:
        lines.append("- none")
    else:
        for it in deck_issues:
            lines.append(f"- {it}")

    ensure_artifacts_dir()
    write_markdown(Path(args.output_md), lines)
    print(f"[deck_validate] status={pass_fail}")
    print(f"[deck_validate] wrote: {args.output_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
