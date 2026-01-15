"""
Environment and type coercion utilities.

Extracted from app.py during Phase 4.4 refactoring.
"""

import os
from typing import Optional, Tuple

import logging

logger = logging.getLogger(__name__)


def _is_truthy(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return False


def _bool_env(name: str) -> bool:
    return _is_truthy(os.getenv(name, ""))


def _coerce_float(value: object, default: Optional[float] = None) -> Optional[float]:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: object, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _get_int_env(name: str, default: int, min_value: int = 1, max_value: int = 16000) -> int:
    raw = _coerce_int(os.getenv(name), default)
    if raw is None:
        return default
    return max(min_value, min(max_value, raw))


def _clamp_temperature(value: Optional[float], default: float = 0.75) -> float:
    if value is None:
        return default
    return max(0.0, min(2.0, value))


def _select_model_and_temperature(
    data: dict,
    default_model: str,
    default_temp: float,
    session_id: Optional[str],
    request_id: str,
) -> Tuple[str, float, str]:
    model = data.get("model") or data.get("model_name") or default_model
    temperature = _clamp_temperature(_coerce_float(data.get("temperature")), default_temp)

    ab_variant = str(data.get("ab_variant") or "").strip().upper()
    if not ab_variant and _bool_env("RAG_AB_MODE"):
        seed = session_id or request_id or ""
        ab_variant = "A" if (sum(ord(c) for c in seed) % 2 == 0) else "B"

    if ab_variant in ("A", "B"):
        model = os.getenv(f"RAG_AB_MODEL_{ab_variant}") or model
        temperature = _clamp_temperature(
            _coerce_float(os.getenv(f"RAG_AB_TEMP_{ab_variant}")),
            temperature,
        )
    else:
        ab_variant = ""

    return model, temperature, ab_variant
