"""Validation and normalization for tarot draws payload."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ORIENTATION_ENUM = {"upright", "reversed"}
DOMAIN_ENUM = {"love", "career", "money", "general"}

_MAJOR_NAMES = [
    "fool",
    "magician",
    "high priestess",
    "empress",
    "emperor",
    "hierophant",
    "lovers",
    "chariot",
    "strength",
    "hermit",
    "wheel of fortune",
    "justice",
    "hanged man",
    "death",
    "temperance",
    "devil",
    "tower",
    "star",
    "moon",
    "sun",
    "judgement",
    "world",
]

_SUITS = {"wands": "WANDS", "cups": "CUPS", "swords": "SWORDS", "pentacles": "PENTACLES"}
_RANKS = {
    "ace": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "page": 11,
    "knight": 12,
    "queen": 13,
    "king": 14,
}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


@lru_cache(maxsize=1)
def _load_known_card_ids() -> set:
    corpus_path = _repo_root() / "backend_ai" / "data" / "tarot_corpus" / "tarot_corpus_v1.jsonl"
    ids = set()
    if corpus_path.exists():
        with corpus_path.open("r", encoding="utf-8-sig") as f:
            for line in f:
                row = json.loads(line.strip())
                card_id = str(row.get("card_id") or "").strip()
                if card_id:
                    ids.add(card_id)
    return ids


def _normalize_domain(value: str) -> str:
    raw = (value or "").strip().lower()
    if raw in DOMAIN_ENUM:
        return raw
    return "general"


def _domain_from_category(category: str) -> str:
    return _normalize_domain(category)


def _card_name_to_id(card_name: str) -> Optional[str]:
    lower = (card_name or "").strip().lower()
    if not lower:
        return None

    for idx, name in enumerate(_MAJOR_NAMES):
        if name in lower:
            return f"MAJOR_{idx}"

    for suit_name, suit_id in _SUITS.items():
        if suit_name in lower:
            for rank_name, rank_num in _RANKS.items():
                if rank_name in lower:
                    return f"{suit_id}_{rank_num}"
    return None


@dataclass
class DrawValidationError:
    index: int
    field: str
    message: str
    value: str

    def to_dict(self) -> Dict:
        return {
            "index": self.index,
            "field": self.field,
            "message": self.message,
            "value": self.value,
        }


def validate_draws(
    draws: List[Dict],
    *,
    default_domain: str = "general",
    allowed_positions: Optional[List[str]] = None,
) -> Tuple[List[Dict], List[DrawValidationError]]:
    validated: List[Dict] = []
    errors: List[DrawValidationError] = []
    known_ids = _load_known_card_ids()
    allowed_pos_set = set((allowed_positions or []))

    for idx, draw in enumerate(draws):
        if not isinstance(draw, dict):
            errors.append(DrawValidationError(idx, "draw", "draw must be object", str(type(draw))))
            continue

        card_id = str(draw.get("card_id") or "").strip()
        orientation = str(draw.get("orientation") or "").strip().lower()
        raw_domain = str(draw.get("domain") or "").strip().lower()
        domain = raw_domain if raw_domain else _normalize_domain(default_domain)
        position = str(draw.get("position") or "").strip()

        if not card_id:
            errors.append(DrawValidationError(idx, "card_id", "card_id is required", ""))
        elif known_ids and card_id not in known_ids:
            errors.append(
                DrawValidationError(
                    idx,
                    "card_id",
                    "unknown card_id (not found in tarot corpus card set)",
                    card_id,
                )
            )

        if orientation not in ORIENTATION_ENUM:
            errors.append(
                DrawValidationError(
                    idx,
                    "orientation",
                    "orientation must be one of upright/reversed",
                    orientation,
                )
            )

        if domain not in DOMAIN_ENUM:
            errors.append(
                DrawValidationError(
                    idx,
                    "domain",
                    "domain must be one of love/career/money/general",
                    domain,
                )
            )

        if allowed_pos_set and position and position not in allowed_pos_set:
            errors.append(
                DrawValidationError(
                    idx,
                    "position",
                    "position is not valid for this spread",
                    position,
                )
            )

        validated.append(
            {
                "card_id": card_id,
                "orientation": orientation if orientation in ORIENTATION_ENUM else "upright",
                "domain": domain if domain in DOMAIN_ENUM else "general",
                "position": position,
            }
        )

    return validated, errors


def derive_draws_from_cards(cards: List[Dict], *, default_domain: str = "general") -> List[Dict]:
    draws: List[Dict] = []
    for idx, card in enumerate(cards):
        if not isinstance(card, dict):
            continue
        card_id = str(card.get("card_id") or "").strip()
        if not card_id:
            card_id = _card_name_to_id(str(card.get("name") or ""))
        if not card_id:
            continue

        orientation = "reversed" if bool(card.get("is_reversed") or card.get("isReversed")) else "upright"
        domain = _normalize_domain(str(card.get("domain") or default_domain))
        position = str(card.get("position") or f"card_{idx+1}").strip()

        draws.append(
            {
                "card_id": card_id,
                "orientation": orientation,
                "domain": domain,
                "position": position,
            }
        )
    return draws


def default_domain_from_category(category: str) -> str:
    return _domain_from_category(category)
