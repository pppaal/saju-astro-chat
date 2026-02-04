# backend_ai/app/domain_rag.py
"""
Domain-Specific RAG Loader
==========================
Loads pre-computed embeddings by domain for faster startup.

Refactored to use BaseEmbeddingRAG for shared embedding infrastructure.

Domains:
- destiny_map: astro + saju (loaded on startup for destiny-map)
- tarot: loaded on-demand for tarot feature
- dream: loaded on-demand for dream interpretation
- iching: loaded on-demand for I Ching

Usage:
    from domain_rag import DomainRAG

    rag = DomainRAG()
    results = rag.search("tarot", "사랑과 관계", top_k=5)
"""

import os
import logging
from typing import List, Dict, Optional
from functools import lru_cache

import torch
from sentence_transformers import util

from app.rag import BaseEmbeddingRAG, RAGResult
from app.rag.model_manager import get_shared_model

logger = logging.getLogger(__name__)

# ChromaDB Feature Flag
_USE_CHROMADB = os.environ.get("USE_CHROMADB", "0") == "1"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDINGS_DIR = os.path.join(BASE_DIR, "data", "embeddings")

# Domain configuration - only domains with actual embedding files
DOMAINS = ["tarot", "dream"]


class DomainRAG:
    """
    Domain-specific RAG with lazy loading and on-demand embedding retrieval.

    Note: This class uses composition rather than inheritance from BaseEmbeddingRAG
    because it manages multiple domains with separate embedding caches.
    """

    def __init__(self, preload_domains: List[str] = None):
        """
        Initialize DomainRAG.

        Args:
            preload_domains: List of domains to preload on init (default: None - lazy load all)
        """
        self._model = None
        self._domain_cache: Dict[str, Dict] = {}

        # Preload specified domains (none by default - lazy load for memory efficiency)
        preload = preload_domains or []
        for domain in preload:
            if domain in DOMAINS:
                self._load_domain(domain)

    @property
    def model(self):
        """Get shared model singleton."""
        if self._model is None:
            logger.info("[DomainRAG] Using shared model...")
            self._model = get_shared_model()
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
            logger.warning(f"[DomainRAG] Cache not found: {cache_file}")
            return False

        try:
            data = torch.load(cache_file, map_location="cpu")
            self._domain_cache[domain] = {
                "embeddings": data["embeddings"],
                "texts": data["texts"],
                "count": data["count"],
            }
            logger.info(f"[DomainRAG] Loaded {domain}: {data['count']} embeddings")
            return True
        except Exception as e:
            logger.error(f"[DomainRAG] Error loading {domain}: {e}")
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
            logger.info(f"[DomainRAG] Unloaded {domain}")

    @lru_cache(maxsize=256)
    def _embed_query(self, query: str) -> torch.Tensor:
        """Embed a query string (with caching)."""
        if self.model is None:
            return None
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

        USE_CHROMADB=1일 때 ChromaDB domain_{domain} 컬렉션에서 검색.
        그 외에는 기존 PyTorch cosine sim 검색.

        Args:
            domain: Domain to search in
            query: Search query
            top_k: Number of results
            min_score: Minimum similarity score

        Returns:
            List of results with text and score
        """
        if _USE_CHROMADB:
            return self._search_chromadb(domain, query, top_k, min_score)

        return self._search_legacy(domain, query, top_k, min_score)

    def _search_chromadb(
        self,
        domain: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """ChromaDB 기반 도메인 검색."""
        try:
            from app.rag.vector_store import get_domain_vector_store

            vs = get_domain_vector_store(domain)
            if not vs.has_data():
                logger.info("[DomainRAG] ChromaDB domain_%s 비어있음, legacy fallback", domain)
                return self._search_legacy(domain, query, top_k, min_score)

            query_emb = self._embed_query(query)
            if query_emb is None:
                return []

            q_list = query_emb.cpu().numpy().tolist()
            results = vs.search(
                query_embedding=q_list,
                top_k=top_k,
                min_score=min_score,
            )

            return [
                {"text": r["text"], "score": r["score"], "domain": domain}
                for r in results
            ]

        except ImportError:
            return self._search_legacy(domain, query, top_k, min_score)
        except Exception as e:
            logger.warning("[DomainRAG] ChromaDB 검색 실패: %s, legacy fallback", e)
            return self._search_legacy(domain, query, top_k, min_score)

    def _search_legacy(
        self,
        domain: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict]:
        """기존 PyTorch cosine sim 도메인 검색."""
        # Load domain if not already loaded
        if not self._load_domain(domain):
            return []

        cache = self._domain_cache[domain]
        embeddings = cache["embeddings"]
        texts = cache["texts"]

        # Embed query
        query_emb = self._embed_query(query)
        if query_emb is None:
            return []

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

    @property
    def item_count(self) -> int:
        """Get total number of indexed items across all loaded domains."""
        return sum(cache["count"] for cache in self._domain_cache.values())

    @property
    def is_ready(self) -> bool:
        """Check if at least one domain is loaded."""
        return len(self._domain_cache) > 0


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
