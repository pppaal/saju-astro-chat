"""
Build DomainRAG embedding caches for tarot, dream, and iching.

Outputs:
    backend_ai/data/embeddings/{domain}_embeds.pt

Usage:
    python backend_ai/scripts/build_domain_rag_cache.py --domains tarot dream iching

Notes:
    - Uses the same model as DomainRAG (paraphrase-multilingual-MiniLM-L12-v2).
    - Keeps only non-empty, deduplicated text items for compact caches.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Iterable, List, Set

import torch
from sentence_transformers import SentenceTransformer


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
EMBED_DIR = DATA_DIR / "embeddings"


def _dedupe(texts: Iterable[str]) -> List[str]:
    """Remove blanks and preserve order without duplicates."""
    seen: Set[str] = set()
    clean: List[str] = []
    for t in texts:
        if not isinstance(t, str):
            continue
        s = t.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        clean.append(s)
    return clean


def _extract_strings(obj, bag: List[str], prefix: str = ""):
    """Recursively collect string leaves from nested JSON-like structures."""
    if isinstance(obj, str):
        s = obj.strip()
        if s:
            bag.append(f"{prefix}{s}" if prefix else s)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            new_prefix = f"{prefix}{k}: " if prefix else ""
            _extract_strings(v, bag, new_prefix)
    elif isinstance(obj, list):
        for item in obj:
            _extract_strings(item, bag, prefix)


def load_tarot_texts() -> List[str]:
    """Collect tarot interpretations from the generated corpus."""
    corpus_path = DATA_DIR / "graph" / "rules" / "tarot" / "complete_interpretations.json"
    if not corpus_path.exists():
        return []

    with corpus_path.open(encoding="utf-8") as f:
        data = json.load(f)

    texts: List[str] = []

    def _add(card_name: str, orientation: str, area: str, content):
        if isinstance(content, str):
            c = content.strip()
            if c:
                texts.append(f"{card_name} {orientation} {area}: {c}")

    for card in data.get("major_arcana", []):
        name_data = card.get("name", {})
        card_name = (
            name_data.get("ko") or name_data.get("en") if isinstance(name_data, dict) else str(name_data)
        ).strip()
        for orientation in ("upright", "reversed"):
            block = card.get(orientation, {}) or {}
            for area, meaning in block.items():
                if area == "advice":
                    continue
                _add(card_name, orientation, area, meaning)

    for card in data.get("minor_arcana", []):
        name_data = card.get("name", {})
        card_name = (
            name_data.get("ko") or name_data.get("en") if isinstance(name_data, dict) else str(name_data)
        ).strip()
        for orientation in ("upright", "reversed"):
            block = card.get(orientation, {}) or {}
            for area, meaning in block.items():
                if area == "advice":
                    continue
                _add(card_name, orientation, area, meaning)

    return texts


def load_dream_texts() -> List[str]:
    """Collect dream rule texts (text + korean + advice)."""
    rules_dir = DATA_DIR / "graph" / "rules" / "dream"
    texts: List[str] = []
    if not rules_dir.exists():
        return texts

    for path in rules_dir.glob("*.json"):
        try:
            with path.open(encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:  # pragma: no cover - defensive
            print(f"[dream] skip {path.name}: {e}")
            continue

        if not isinstance(data, dict):
            continue

        for rule_id, rule in data.items():
            if not isinstance(rule, dict) or rule_id.startswith("_"):
                continue
            combined = " ".join(
                part for part in [rule.get("text", ""), rule.get("korean", ""), rule.get("advice", "")]
                if isinstance(part, str) and part.strip()
            ).strip()
            if combined:
                texts.append(f"{path.stem}/{rule_id}: {combined}")

    return texts


def load_iching_texts() -> List[str]:
    """Collect textual interpretations from Iching rule files."""
    rules_dir = DATA_DIR / "graph" / "rules" / "iching"
    texts: List[str] = []
    if not rules_dir.exists():
        return texts

    for path in rules_dir.glob("*.json"):
        try:
            with path.open(encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:  # pragma: no cover - defensive
            print(f"[iching] skip {path.name}: {e}")
            continue

        _extract_strings(data, texts, prefix=f"{path.stem}: ")

    return texts


DOMAIN_LOADERS = {
    "tarot": load_tarot_texts,
    "dream": load_dream_texts,
    "iching": load_iching_texts,
}


def build_domain_cache(domain: str, model: SentenceTransformer, overwrite: bool = True) -> Path:
    """Build and persist embeddings for a domain."""
    loader = DOMAIN_LOADERS.get(domain)
    if loader is None:
        raise ValueError(f"Unsupported domain: {domain}")

    texts = _dedupe(loader())
    if not texts:
        raise RuntimeError(f"No texts found for domain '{domain}'")

    EMBED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = EMBED_DIR / f"{domain}_embeds.pt"
    if out_path.exists() and not overwrite:
        print(f"[{domain}] cache exists, skipping: {out_path}")
        return out_path

    print(f"[{domain}] encoding {len(texts)} items...")
    embeds = model.encode(
        texts,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,
        batch_size=64,
    )
    torch.save({"embeddings": embeds, "texts": texts, "count": len(texts)}, out_path)
    print(f"[{domain}] saved -> {out_path} ({len(texts)} rows)")
    return out_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--domains",
        nargs="+",
        default=["tarot", "dream", "iching"],
        help="Domains to build (tarot dream iching)",
    )
    parser.add_argument(
        "--device",
        choices=["auto", "cpu", "cuda"],
        default=os.getenv("RAG_DEVICE", "auto"),
        help="Device for SentenceTransformer (default: auto)",
    )
    args = parser.parse_args()

    device = "cpu"
    if args.device == "cuda" and torch.cuda.is_available():
        device = "cuda"
    elif args.device == "auto" and torch.cuda.is_available():
        device = "cuda"

    print(f"[model] loading on {device} ...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", device=device)

    for domain in args.domains:
        try:
            build_domain_cache(domain, model)
        except Exception as e:
            print(f"[{domain}] failed: {e}")


if __name__ == "__main__":
    main()
