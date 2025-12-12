"""
Pre-compute Embeddings by Domain
================================
Separates embeddings into domain-specific cache files for faster loading.

Domains:
- destiny_map: astro + saju + cross_analysis (primary, always loaded)
- tarot: tarot rules and interpretations
- dream: dream symbols and interpretations
- iching: I Ching hexagrams and rules
- persona: persona rules (handled by persona_embeddings.py)
"""

import os
import csv
import json
import torch
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPH_DIR = os.path.join(BASE_DIR, "backend_ai", "data", "graph")
CACHE_DIR = os.path.join(BASE_DIR, "backend_ai", "data", "embeddings")

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Domain configurations
DOMAINS = {
    "destiny_map": {
        "folders": ["astro", "astro_database", "saju", "saju_literary", "cross_analysis", "numerology"],
        "rules": ["rules/astro", "rules/saju", "rules/fusion"],
        "description": "Astrology + Saju core data for destiny-map",
    },
    "tarot": {
        "folders": [],
        "rules": ["rules/tarot"],
        "description": "Tarot cards, spreads, and interpretations",
    },
    "dream": {
        "folders": [],
        "rules": ["rules/dream"],
        "description": "Dream symbols and interpretations",
    },
    "iching": {
        "folders": [],
        "rules": ["rules/iching"],
        "description": "I Ching hexagrams and rules",
    },
}


def get_model() -> SentenceTransformer:
    """Load SentenceTransformer model."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Embeddings] Loading model on {device}...")
    model = SentenceTransformer(MODEL_NAME, device=device)
    print(f"[Embeddings] Model loaded: {MODEL_NAME}")
    return model


def load_nodes_from_csv(file_path: str) -> List[Dict]:
    """Load nodes from CSV file."""
    nodes = []
    try:
        with open(file_path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                desc = row.get("description") or row.get("content") or ""
                label = row.get("label") or row.get("name") or row.get("id") or ""
                if desc.strip():
                    nodes.append({
                        "text": f"{label}: {desc}".strip() if label else desc.strip(),
                        "source": file_path,
                        "type": "csv",
                    })
    except Exception as e:
        print(f"  Error loading {file_path}: {e}")
    return nodes


def load_nodes_from_json(file_path: str) -> List[Dict]:
    """Load nodes from JSON file."""
    nodes = []
    try:
        with open(file_path, encoding="utf-8-sig") as f:
            data = json.load(f)

        if isinstance(data, dict):
            for key, value in data.items():
                if key.startswith("$"):
                    continue
                text = ""
                if isinstance(value, str) and len(value) > 10:
                    text = f"{key}: {value}"
                elif isinstance(value, dict):
                    desc = value.get("description") or ""
                    if not desc:
                        # Build from other fields
                        parts = []
                        for field in ["core", "meaning", "light", "shadow", "advice", "text"]:
                            if value.get(field):
                                parts.append(str(value[field])[:200])
                                if len(parts) >= 2:
                                    break
                        desc = " ".join(parts)
                    if desc:
                        text = f"{key}: {desc}"
                if text and len(text) > 15:
                    nodes.append({
                        "text": text,
                        "source": file_path,
                        "type": "json",
                    })

        elif isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue
                name = item.get("name") or item.get("label") or item.get("id") or ""
                desc = item.get("description") or ""
                if not desc:
                    parts = []
                    for field in ["core", "meaning", "light", "shadow", "advice", "text", "content"]:
                        if item.get(field):
                            parts.append(str(item[field])[:200])
                            if len(parts) >= 2:
                                break
                    desc = " ".join(parts)
                if desc:
                    text = f"{name}: {desc}".strip() if name else desc.strip()
                    if len(text) > 15:
                        nodes.append({
                            "text": text,
                            "source": file_path,
                            "type": "json",
                        })
    except Exception as e:
        print(f"  Error loading {file_path}: {e}")
    return nodes


def collect_domain_nodes(domain_name: str, config: Dict) -> Tuple[List[str], List[Dict]]:
    """Collect all nodes for a domain."""
    texts = []
    metadata = []

    # Process folders
    for folder in config["folders"]:
        folder_path = os.path.join(GRAPH_DIR, folder)
        if not os.path.exists(folder_path):
            continue

        for root, _, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                nodes = []

                if file.endswith(".csv"):
                    nodes = load_nodes_from_csv(file_path)
                elif file.endswith(".json"):
                    nodes = load_nodes_from_json(file_path)

                for node in nodes:
                    texts.append(node["text"])
                    metadata.append(node)

    # Process rules folders
    for rule_folder in config["rules"]:
        folder_path = os.path.join(GRAPH_DIR, rule_folder)
        if not os.path.exists(folder_path):
            continue

        for root, _, files in os.walk(folder_path):
            for file in files:
                if not file.endswith(".json"):
                    continue
                file_path = os.path.join(root, file)
                nodes = load_nodes_from_json(file_path)

                for node in nodes:
                    texts.append(node["text"])
                    metadata.append(node)

    return texts, metadata


def compute_and_save_embeddings(domain_name: str, texts: List[str], model: SentenceTransformer):
    """Compute embeddings and save to cache file."""
    if not texts:
        print(f"  [SKIP] {domain_name}: No texts to embed")
        return

    print(f"  [{domain_name}] Encoding {len(texts)} texts...")

    embeddings = model.encode(
        texts,
        batch_size=64,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    # Save embeddings
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_file = os.path.join(CACHE_DIR, f"{domain_name}_embeds.pt")

    torch.save({
        "embeddings": embeddings,
        "texts": texts,
        "count": len(texts),
    }, cache_file)

    print(f"  [{domain_name}] Saved {len(texts)} embeddings to {cache_file}")
    print(f"  [{domain_name}] Shape: {embeddings.shape}")


def main():
    """Main function to pre-compute all domain embeddings."""
    print("=" * 60)
    print("Pre-computing Domain Embeddings")
    print("=" * 60)
    print(f"Graph directory: {GRAPH_DIR}")
    print(f"Cache directory: {CACHE_DIR}")
    print()

    # Load model once
    model = get_model()

    # Process each domain
    for domain_name, config in DOMAINS.items():
        print(f"\n[{domain_name.upper()}] {config['description']}")
        print("-" * 40)

        texts, metadata = collect_domain_nodes(domain_name, config)
        print(f"  Collected {len(texts)} nodes")

        if texts:
            compute_and_save_embeddings(domain_name, texts, model)

    print("\n" + "=" * 60)
    print("Pre-computation complete!")
    print("=" * 60)

    # Print summary
    print("\nCache files created:")
    for domain_name in DOMAINS.keys():
        cache_file = os.path.join(CACHE_DIR, f"{domain_name}_embeds.pt")
        if os.path.exists(cache_file):
            size_mb = os.path.getsize(cache_file) / (1024 * 1024)
            print(f"  - {domain_name}_embeds.pt: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
