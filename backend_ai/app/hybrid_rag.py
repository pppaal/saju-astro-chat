# backend_ai/app/hybrid_rag.py
"""
Hybrid RAG Engine - Gemini-Level Quality
=========================================
Combines multiple retrieval methods for maximum accuracy:
1. Vector Search (Semantic similarity)
2. BM25 (Keyword matching)
3. Graph Search (Relationship-based)
4. Cross-Encoder Reranking (Quality filtering)

Uses RRF (Reciprocal Rank Fusion) to combine results.
"""

import os
import json
import math
import hashlib
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from functools import lru_cache
from collections import defaultdict

import torch
from sentence_transformers import SentenceTransformer, util, CrossEncoder

# BM25 implementation
try:
    from rank_bm25 import BM25Okapi
    HAS_BM25 = True
except ImportError:
    HAS_BM25 = False
    print("[HybridRAG] rank_bm25 not installed, using fallback keyword search")

try:
    from backend_ai.app.saju_astro_rag import get_model, embed_text, search_graphs, get_graph_rag
except ImportError:
    from backend_ai.app.saju_astro_rag import get_model, embed_text, search_graphs, get_graph_rag


# ===============================================================
# CROSS-ENCODER RERANKER (Free alternative to Cohere)
# ===============================================================
_RERANKER = None
_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


def get_reranker() -> CrossEncoder:
    """Get or create singleton CrossEncoder for reranking."""
    global _RERANKER
    if _RERANKER is None:
        print(f"[HybridRAG] Loading reranker: {_RERANKER_MODEL}")
        _RERANKER = CrossEncoder(_RERANKER_MODEL, max_length=512)
        print("[HybridRAG] Reranker loaded successfully")
    return _RERANKER


# ===============================================================
# BM25 KEYWORD SEARCH
# ===============================================================
_BM25_INDEX = None
_BM25_DOCS = None


def _tokenize_korean(text: str) -> List[str]:
    """Simple Korean tokenizer (character n-grams + word split)."""
    # Remove punctuation and split by whitespace
    import re
    text = re.sub(r'[^\w\s가-힣]', ' ', text)
    words = text.lower().split()

    # Add character bigrams for Korean
    tokens = []
    for word in words:
        tokens.append(word)
        if any('\uac00' <= c <= '\ud7a3' for c in word):  # Korean chars
            # Add character bigrams
            for i in range(len(word) - 1):
                tokens.append(word[i:i+2])

    return tokens


def build_bm25_index(documents: List[Dict]) -> Optional['BM25Okapi']:
    """Build BM25 index from documents."""
    global _BM25_INDEX, _BM25_DOCS

    if not HAS_BM25:
        return None

    texts = [d.get("description", "") for d in documents]
    tokenized = [_tokenize_korean(t) for t in texts]

    _BM25_INDEX = BM25Okapi(tokenized)
    _BM25_DOCS = documents

    print(f"[HybridRAG] BM25 index built with {len(documents)} documents")
    return _BM25_INDEX


def bm25_search(query: str, top_k: int = 10) -> List[Tuple[Dict, float]]:
    """Search using BM25."""
    if not HAS_BM25 or _BM25_INDEX is None:
        return []

    tokenized_query = _tokenize_korean(query)
    scores = _BM25_INDEX.get_scores(tokenized_query)

    # Get top-k indices
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

    results = []
    for idx in top_indices:
        if scores[idx] > 0:
            results.append((_BM25_DOCS[idx], scores[idx]))

    return results


# ===============================================================
# RECIPROCAL RANK FUSION (RRF)
# ===============================================================
def reciprocal_rank_fusion(
    results_lists: List[List[Tuple[Dict, float]]],
    k: int = 60
) -> List[Tuple[Dict, float]]:
    """
    Combine multiple ranked lists using RRF.

    Args:
        results_lists: List of (document, score) tuples from different retrievers
        k: RRF constant (default 60)

    Returns:
        Combined and re-ranked list
    """
    doc_scores = defaultdict(float)
    doc_map = {}

    for results in results_lists:
        for rank, (doc, score) in enumerate(results):
            # Create a unique key for the document
            doc_key = hashlib.sha1(
                doc.get("description", "")[:200].encode("utf-8")
            ).hexdigest()[:16]

            # RRF formula: 1 / (k + rank)
            doc_scores[doc_key] += 1.0 / (k + rank + 1)
            doc_map[doc_key] = doc

    # Sort by combined score
    sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)

    return [(doc_map[key], score) for key, score in sorted_docs]


# ===============================================================
# CROSS-ENCODER RERANKING
# ===============================================================
def rerank_with_cross_encoder(
    query: str,
    documents: List[Tuple[Dict, float]],
    top_k: int = 10
) -> List[Tuple[Dict, float]]:
    """
    Rerank documents using cross-encoder for higher quality.

    Args:
        query: Search query
        documents: List of (document, score) tuples
        top_k: Number of results to return

    Returns:
        Reranked list with cross-encoder scores
    """
    if not documents:
        return []

    reranker = get_reranker()

    # Prepare pairs for cross-encoder
    pairs = [
        [query, doc.get("description", "")[:500]]
        for doc, _ in documents
    ]

    # Get cross-encoder scores
    scores = reranker.predict(pairs)

    # Combine with original documents
    reranked = [
        (documents[i][0], float(scores[i]))
        for i in range(len(documents))
    ]

    # Sort by cross-encoder score
    reranked.sort(key=lambda x: x[1], reverse=True)

    return reranked[:top_k]


# ===============================================================
# HYBRID SEARCH (Main Function)
# ===============================================================
def hybrid_search(
    query: str,
    top_k: int = 10,
    use_reranking: bool = True,
    graph_root: str = None
) -> List[Dict]:
    """
    Hybrid search combining Vector + BM25 + Graph with reranking.

    Args:
        query: Natural language search query
        top_k: Number of results to return
        use_reranking: Whether to use cross-encoder reranking
        graph_root: Path to graph data

    Returns:
        List of relevant documents with scores
    """
    # 1. Vector Search (semantic)
    vector_results = search_graphs(query, top_k=top_k * 2, graph_root=graph_root)
    vector_pairs = [(r, r.get("score", 0)) for r in vector_results]

    # 2. BM25 Search (keyword)
    if _BM25_INDEX is None and HAS_BM25:
        # Build index on first use
        from backend_ai.app.saju_astro_rag import _load_graph_nodes
        if graph_root is None:
            base_dir = Path(__file__).resolve().parent.parent
            graph_root = base_dir / "data" / "graph"
        graph_root_path = Path(graph_root)
        nodes = _load_graph_nodes(graph_root_path)
        build_bm25_index(nodes)

    bm25_pairs = bm25_search(query, top_k=top_k * 2)

    # 3. Graph-based Search (relationships)
    try:
        graph_rag = get_graph_rag()
        graph_result = graph_rag.query({"query": query}, top_k=top_k)
        graph_pairs = [
            ({"description": text, "source": "graph"}, 0.5)
            for text in graph_result.get("matched_nodes", [])
        ]
    except Exception as e:
        print(f"[HybridRAG] Graph search error: {e}")
        graph_pairs = []

    # 4. Combine with RRF
    all_results = [vector_pairs, bm25_pairs, graph_pairs]
    # Filter empty lists
    all_results = [r for r in all_results if r]

    if not all_results:
        return []

    combined = reciprocal_rank_fusion(all_results)

    # 5. Rerank with cross-encoder (optional but recommended)
    if use_reranking and len(combined) > 0:
        # Only rerank top candidates for efficiency
        candidates = combined[:min(30, len(combined))]
        reranked = rerank_with_cross_encoder(query, candidates, top_k=top_k)

        # Format results
        results = []
        for doc, score in reranked:
            result = dict(doc)
            result["hybrid_score"] = round(score, 4)
            result["retrieval_method"] = "hybrid+rerank"
            results.append(result)

        return results

    # Without reranking
    results = []
    for doc, score in combined[:top_k]:
        result = dict(doc)
        result["hybrid_score"] = round(score, 4)
        result["retrieval_method"] = "hybrid"
        results.append(result)

    return results


# ===============================================================
# CONTEXT BUILDER (For LLM prompts)
# ===============================================================
def build_rag_context(
    query: str,
    top_k: int = 12,
    max_chars: int = 4000
) -> str:
    """
    Build rich context for LLM prompts from hybrid search.

    Args:
        query: Search query
        top_k: Number of results
        max_chars: Maximum characters in context

    Returns:
        Formatted context string
    """
    results = hybrid_search(query, top_k=top_k)

    if not results:
        return ""

    context_parts = []
    total_chars = 0

    for i, r in enumerate(results, 1):
        label = r.get("label", r.get("name", ""))
        desc = r.get("description", "")[:500]
        score = r.get("hybrid_score", 0)
        source = r.get("source", "unknown")

        line = f"[{i}] {label}: {desc} (score: {score:.3f}, src: {source})"

        if total_chars + len(line) > max_chars:
            break

        context_parts.append(line)
        total_chars += len(line)

    return "\n".join(context_parts)


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Hybrid RAG...")

    # Test hybrid search
    results = hybrid_search("목 오행이 강한 사람의 직업운", top_k=5)

    print("\n=== Hybrid Search Results ===")
    for r in results:
        print(f"  - {r.get('label', '?')}: {r.get('hybrid_score', 0):.4f}")
        print(f"    {r.get('description', '')[:80]}...")

    # Test context builder
    print("\n=== RAG Context ===")
    context = build_rag_context("연애운과 결혼 시기", top_k=5)
    print(context[:500])
