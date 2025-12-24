#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Precompute Embeddings Cache
===========================
Run this script once to generate embedding caches for fast startup.

Usage:
    python precompute_cache.py

This will create:
    - data/graph/corpus_embeds.pt (main graph embeddings)
"""

import os
import sys
import io
import torch
import time

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    print("=" * 60)
    print("Precomputing Embedding Caches")
    print("=" * 60)

    start = time.time()

    # Get paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    graph_root = os.path.join(base_dir, "data", "graph")
    cache_path = os.path.join(graph_root, "corpus_embeds.pt")

    print(f"\nGraph root: {graph_root}")
    print(f"Cache path: {cache_path}")

    # Delete old cache if exists
    if os.path.exists(cache_path):
        print(f"\nRemoving old cache: {cache_path}")
        os.remove(cache_path)

    # Import and run search to trigger cache creation
    print("\n[1/3] Loading modules...")
    from saju_astro_rag import search_graphs, _load_graph_nodes, embed_batch, get_model

    print("\n[2/3] Loading graph nodes...")
    nodes = _load_graph_nodes(graph_root)
    texts = [n["description"] for n in nodes if n.get("description")]
    print(f"      Found {len(texts)} texts to encode")

    print("\n[3/3] Encoding embeddings...")
    _ = get_model()  # Pre-load model
    embeddings = embed_batch(texts, batch_size=64)

    print(f"\n      Embeddings shape: {embeddings.shape}")

    # Save
    torch.save(embeddings, cache_path)
    print(f"      Saved to: {cache_path}")

    elapsed = time.time() - start
    print(f"\n{'=' * 60}")
    print(f"Done! Total time: {elapsed:.1f}s")
    print(f"{'=' * 60}")

    # Verify
    if os.path.exists(cache_path):
        size_mb = os.path.getsize(cache_path) / (1024 * 1024)
        print(f"\nCache file size: {size_mb:.1f} MB")
        print("Cache created successfully!")
    else:
        print("\nERROR: Cache file was not created")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
