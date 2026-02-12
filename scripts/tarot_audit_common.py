#!/usr/bin/env python3
"""
Shared helpers for tarot audit scripts.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from tarot_pipeline_utils import DEFAULT_CORPUS_PATH, load_jsonl_records


REPO_ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = REPO_ROOT / "artifacts"


def ensure_artifacts_dir() -> Path:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    return ARTIFACTS_DIR


def read_jsonl(path: Path) -> List[Dict]:
    rows: List[Dict] = []
    with path.open("r", encoding="utf-8-sig") as f:
        for line_no, line in enumerate(f, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no} invalid JSON: {exc}") from exc
            if not isinstance(obj, dict):
                raise ValueError(f"{path}:{line_no} row must be object")
            rows.append(obj)
    return rows


def write_json(path: Path, payload: Dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_markdown(path: Path, lines: Iterable[str]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def sentence_count(text: str) -> int:
    normalized = re.sub(r"\s+", " ", (text or "").strip())
    if not normalized:
        return 0
    chunks = [c.strip() for c in re.split(r"(?<=[.!?。！？])\s+", normalized) if c.strip()]
    return len(chunks)


def normalize_question_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def should_require_safety_notice(query: str) -> Optional[str]:
    q = normalize_question_text(query)
    medical = ("건강", "병", "수술", "약", "우울", "불안", "medical", "doctor")
    legal = ("소송", "법", "변호사", "고소", "legal", "lawyer")
    investment = ("투자", "주식", "코인", "부동산", "investment", "stock", "crypto")
    if any(k in q for k in medical):
        return "medical"
    if any(k in q for k in legal):
        return "legal"
    if any(k in q for k in investment):
        return "investment"
    return None


def has_safety_notice(text: str, kind: str) -> bool:
    t = normalize_question_text(text)
    if kind == "medical":
        return ("전문가" in t and "의료" in t) or ("medical" in t and "professional" in t)
    if kind == "legal":
        return ("전문가" in t and "법률" in t) or ("legal" in t and "lawyer" in t)
    if kind == "investment":
        return ("투자" in t and "신중" in t) or ("investment" in t and "risk" in t)
    return False


def load_tarot_card_records(corpus_path: Path = DEFAULT_CORPUS_PATH) -> List[Dict]:
    return [r for r in load_jsonl_records(corpus_path) if str(r.get("doc_type") or "") == "card"]


@dataclass
class SpreadSpec:
    theme_id: str
    spread_id: str
    card_count: int
    title: str
    positions: List[str]


def load_frontend_spread_catalog(path: Path) -> Dict[Tuple[str, str], SpreadSpec]:
    text = path.read_text(encoding="utf-8")
    item_pattern = re.compile(
        r'id:\s*"(?P<theme>[^"]+)"[\s\S]*?spreads:\s*\[(?P<spreads>[\s\S]*?)\]\s*,\s*\}',
        re.MULTILINE,
    )
    spread_pattern = re.compile(
        r'\{\s*id:\s*"(?P<id>[^"]+)"[\s\S]*?title:\s*"(?P<title>[^"]+)"[\s\S]*?cardCount:\s*(?P<count>\d+)[\s\S]*?positions:\s*\[(?P<positions>[\s\S]*?)\]\s*,?\s*\}',
        re.MULTILINE,
    )
    pos_pattern = re.compile(r'title:\s*"([^"]+)"')

    catalog: Dict[Tuple[str, str], SpreadSpec] = {}
    for theme_match in item_pattern.finditer(text):
        theme_id = theme_match.group("theme").strip()
        spreads_blob = theme_match.group("spreads")
        for spread_match in spread_pattern.finditer(spreads_blob):
            spread_id = spread_match.group("id").strip()
            title = spread_match.group("title").strip()
            card_count = int(spread_match.group("count"))
            positions_blob = spread_match.group("positions")
            positions = [m.group(1).strip() for m in pos_pattern.finditer(positions_blob)]
            if not positions:
                positions = [f"Card {i+1}" for i in range(card_count)]
            catalog[(theme_id, spread_id)] = SpreadSpec(
                theme_id=theme_id,
                spread_id=spread_id,
                card_count=card_count,
                title=title,
                positions=positions[:card_count],
            )
    return catalog

