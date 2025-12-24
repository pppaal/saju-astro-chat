"""
Domain-Specific RAG Loader
==========================
Loads pre-computed embeddings by domain for faster startup.

Domains:
- destiny_map: astro + saju (loaded on startup for destiny-map)
- tarot: loaded on-demand for tarot feature
- dream: loaded on-demand for dream interpretation
- iching: loaded on-demand for I Ching

Usage:
    from domain_rag import DomainRAG

    rag = DomainRAG()
    results = rag.search("destiny_map", "리더십과 추진력", top_k=5)
"""

import os
import torch
from typing import List, Dict, Optional
from functools import lru_cache
from sentence_transformers import util

# Use shared model singleton from saju_astro_rag
try:
    from backend_ai.app.saju_astro_rag import get_model
except ImportError:
    from saju_astro_rag import get_model

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDINGS_DIR = os.path.join(BASE_DIR, "data", "embeddings")

# Domain configuration - only domains with actual embedding files
DOMAINS = ["tarot", "dream"]


class DomainRAG:
    """
    Domain-specific RAG with lazy loading and on-demand embedding retrieval.
    """

    def __init__(self, preload_domains: List[str] = None):
        """
        Initialize DomainRAG.

        Args:
            preload_domains: List of domains to preload on init (default: None - lazy load all)
        """
        self._model: Optional[SentenceTransformer] = None
        self._domain_cache: Dict[str, Dict] = {}

        # Preload specified domains (none by default - lazy load for memory efficiency)
        preload = preload_domains or []
        for domain in preload:
            if domain in DOMAINS:
                self._load_domain(domain)

    @property
    def model(self):
        """Get shared model singleton from saju_astro_rag."""
        if self._model is None:
            print("[DomainRAG] Using shared model from saju_astro_rag...")
            self._model = get_model()
        return self._model

    def _load_domain(self, domain: str) -> bool:
        """
        Load domain embeddings from cache file.

        Returns:
            True if loaded successfully, False otherwise
        """
        if domain in self._domain_cache:
            return True

        cache_file = os.path.join(EMBEDDINGS_DIR, f"{domain}_embeds.pt")
        if not os.path.exists(cache_file):
            print(f"[DomainRAG] Cache not found: {cache_file}")
            return False

        try:
            data = torch.load(cache_file, map_location="cpu")
            self._domain_cache[domain] = {
                "embeddings": data["embeddings"],
                "texts": data["texts"],
                "count": data["count"],
            }
            print(f"[DomainRAG] Loaded {domain}: {data['count']} embeddings")
            return True
        except Exception as e:
            print(f"[DomainRAG] Error loading {domain}: {e}")
            return False

    def is_loaded(self, domain: str) -> bool:
        """Check if a domain is loaded."""
        return domain in self._domain_cache

    def get_loaded_domains(self) -> List[str]:
        """Get list of currently loaded domains."""
        return list(self._domain_cache.keys())

    def load_domain(self, domain: str) -> bool:
        """
        Load a domain on-demand.

        Returns:
            True if loaded successfully
        """
        return self._load_domain(domain)

    def unload_domain(self, domain: str):
        """Unload a domain to free memory."""
        if domain in self._domain_cache:
            del self._domain_cache[domain]
            print(f"[DomainRAG] Unloaded {domain}")

    @lru_cache(maxsize=256)
    def _embed_query(self, query: str) -> torch.Tensor:
        """Embed a query string (with caching)."""
        return self.model.encode(
            query,
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

    def search(
        self,
        domain: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """
        Search within a specific domain.

        Args:
            domain: Domain to search in
            query: Search query
            top_k: Number of results
            min_score: Minimum similarity score

        Returns:
            List of results with text and score
        """
        # Load domain if not already loaded
        if not self._load_domain(domain):
            return []

        cache = self._domain_cache[domain]
        embeddings = cache["embeddings"]
        texts = cache["texts"]

        # Embed query
        query_emb = self._embed_query(query)

        # Compute similarities
        scores = util.cos_sim(query_emb, embeddings)[0]
        top_results = torch.topk(scores, k=min(top_k, len(texts)))

        results = []
        for idx, score in zip(top_results.indices, top_results.values):
            score_val = float(score)
            if score_val >= min_score:
                results.append({
                    "text": texts[int(idx)],
                    "score": round(score_val, 4),
                    "domain": domain,
                })

        return results

    def search_multiple(
        self,
        domains: List[str],
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """
        Search across multiple domains and merge results.

        Args:
            domains: List of domains to search
            query: Search query
            top_k: Total number of results
            min_score: Minimum similarity score

        Returns:
            Merged and sorted results from all domains
        """
        all_results = []

        for domain in domains:
            results = self.search(domain, query, top_k=top_k, min_score=min_score)
            all_results.extend(results)

        # Sort by score and return top_k
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]

    def get_context(
        self,
        domain: str,
        query: str,
        top_k: int = 3,
        max_chars: int = 1500,
    ) -> str:
        """
        Get context string for LLM prompt.

        Args:
            domain: Domain to search
            query: Search query
            top_k: Number of results
            max_chars: Maximum characters in context

        Returns:
            Formatted context string
        """
        results = self.search(domain, query, top_k=top_k)

        if not results:
            return ""

        context_parts = []
        total_chars = 0

        for r in results:
            text = r["text"]
            if total_chars + len(text) > max_chars:
                break
            context_parts.append(f"- {text}")
            total_chars += len(text)

        return "\n".join(context_parts)


# Singleton instance
_domain_rag_instance: Optional[DomainRAG] = None


def get_domain_rag(preload: List[str] = None) -> DomainRAG:
    """
    Get or create singleton DomainRAG instance.

    Args:
        preload: Domains to preload (only used on first call)
    """
    global _domain_rag_instance
    if _domain_rag_instance is None:
        _domain_rag_instance = DomainRAG(preload_domains=preload)
    return _domain_rag_instance


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def search_tarot(query: str, top_k: int = 5) -> List[Dict]:
    """Convenience function for tarot searches."""
    rag = get_domain_rag()
    rag.load_domain("tarot")
    return rag.search("tarot", query, top_k=top_k)


def search_dream(query: str, top_k: int = 5) -> List[Dict]:
    """Convenience function for dream searches."""
    rag = get_domain_rag()
    rag.load_domain("dream")
    return rag.search("dream", query, top_k=top_k)


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    print("Testing DomainRAG...")

    rag = DomainRAG()

    print("\n[Test 1] Tarot Search")
    rag.load_domain("tarot")
    results = rag.search("tarot", "사랑과 관계", top_k=3)
    for r in results:
        print(f"  [{r['score']:.3f}] {r['text'][:80]}...")

    print("\n[Test 2] Dream Search")
    rag.load_domain("dream")
    context = rag.get_context("dream", "꿈 해석", top_k=3, max_chars=500)
    print(f"  Context length: {len(context)} chars")
    print(f"  Preview: {context[:200]}...")

    print("\n[Test 3] Loaded Domains")
    print(f"  {rag.get_loaded_domains()}")
