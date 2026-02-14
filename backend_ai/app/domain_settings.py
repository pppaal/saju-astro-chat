"""
Shared domain configuration for DomainRAG/search routes.
"""

import os
from typing import List

# Domain policy: tarot-first by default, extensible via env override.
_DEFAULT_DOMAIN_RAG_DOMAINS = ["tarot"]
DOMAIN_RAG_DOMAINS_ENV = "DOMAIN_RAG_DOMAINS"

# Tarot retrieval threshold presets.
TAROT_MIN_SCORE_LOW = 0.18
TAROT_MIN_SCORE_DEFAULT = 0.20
TAROT_MIN_SCORE_HIGH = 0.22
TAROT_MIN_SCORE_ENV = "TAROT_MIN_SCORE"


def _parse_domains(value: str) -> List[str]:
    return [d.strip() for d in value.split(",") if d.strip()]


def get_domain_rag_domains() -> List[str]:
    raw = os.getenv(DOMAIN_RAG_DOMAINS_ENV, "")
    parsed = _parse_domains(raw) if raw else []
    return parsed or list(_DEFAULT_DOMAIN_RAG_DOMAINS)


def get_tarot_min_score() -> float:
    raw = os.getenv(TAROT_MIN_SCORE_ENV, str(TAROT_MIN_SCORE_DEFAULT)).strip()
    try:
        return float(raw)
    except (TypeError, ValueError):
        return TAROT_MIN_SCORE_DEFAULT


# Snapshot defaults at import time for modules that rely on constants.
DOMAIN_RAG_DOMAINS = get_domain_rag_domains()
DEFAULT_TAROT_MIN_SCORE = get_tarot_min_score()
