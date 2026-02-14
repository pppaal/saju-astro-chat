# backend_ai/app/domain_rag.py
"""
Domain-Specific RAG Loader
==========================
Loads pre-computed embeddings by domain for faster startup.

Refactored to use BaseEmbeddingRAG for shared embedding infrastructure.

Domains:
- tarot: loaded on-demand for tarot feature
- extra domains via DOMAIN_RAG_DOMAINS env override (comma-separated)

Usage:
    from domain_rag import DomainRAG

    rag = DomainRAG()
    results = rag.search("tarot", "사랑과 관계", top_k=5)
"""

import os
import logging
from typing import List, Dict, Optional, Any, Tuple
from functools import lru_cache
from statistics import mean

import torch
from sentence_transformers import util

from app.rag.model_manager import get_shared_model
from app.domain_settings import (
    DOMAIN_RAG_DOMAINS,
    DEFAULT_TAROT_MIN_SCORE,
    TAROT_MIN_SCORE_LOW,
    TAROT_MIN_SCORE_HIGH,
)

logger = logging.getLogger(__name__)

# ChromaDB Feature Flag
_USE_CHROMADB = os.environ.get("USE_CHROMADB", "0") == "1"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDINGS_DIR = os.path.join(BASE_DIR, "data", "embeddings")

# Shared domain configuration (single source of truth).
DOMAINS = DOMAIN_RAG_DOMAINS

# Tarot min-score presets (switchable via env: TAROT_MIN_SCORE).
MIN_SCORE_PRESETS = (TAROT_MIN_SCORE_LOW, DEFAULT_TAROT_MIN_SCORE, TAROT_MIN_SCORE_HIGH)


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

    @staticmethod
    def _resolve_min_score(min_score: Optional[float]) -> float:
        if min_score is None:
            return DEFAULT_TAROT_MIN_SCORE
        return float(min_score)

    @staticmethod
    def _log_score_distribution(domain: str, top_scores: List[float], min_score: float):
        if not top_scores:
            logger.info(
                "[DomainRAG] score-stats domain=%s top_k=0 threshold=%.2f",
                domain,
                min_score,
            )
            return
        logger.info(
            "[DomainRAG] score-stats domain=%s top_k=%d min=%.4f max=%.4f mean=%.4f threshold=%.2f",
            domain,
            len(top_scores),
            min(top_scores),
            max(top_scores),
            mean(top_scores),
            min_score,
        )

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
        min_score: Optional[float] = None,
        draws: Optional[List[Dict[str, Any]]] = None,
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
            draws: Optional card facets to force include for tarot

        Returns:
            List of results with text and score
        """
        resolved_min_score = self._resolve_min_score(min_score)
        if _USE_CHROMADB:
            return self._search_chromadb(
                domain=domain,
                query=query,
                top_k=top_k,
                min_score=resolved_min_score,
                draws=draws,
            )

        return self._search_legacy(domain, query, top_k, resolved_min_score)

    def _search_chromadb(
        self,
        domain: str,
        query: str,
        top_k: int = 5,
        min_score: float = DEFAULT_TAROT_MIN_SCORE,
        draws: Optional[List[Dict[str, Any]]] = None,
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

            retrieval_top_k = top_k
            if domain == "tarot":
                retrieval_top_k = min(max(1, top_k), 3)

            q_list = query_emb.cpu().numpy().tolist()
            raw_results = vs.search(
                query_embedding=q_list,
                top_k=retrieval_top_k,
                min_score=0.0,
            )
            top_scores = [float(r.get("score", 0.0)) for r in raw_results]
            self._log_score_distribution(domain, top_scores, min_score)

            forced_results = []
            if domain == "tarot" and draws:
                forced_results = self._fetch_forced_facet_results(
                    vs=vs,
                    query_embedding=q_list,
                    draws=draws,
                    fallback_domain=domain,
                )

            similarity_results = [r for r in raw_results if float(r.get("score", 0.0)) >= min_score]
            merged = self._merge_results_with_priority(forced_results, similarity_results, top_k)

            return [
                {
                    "text": r["text"],
                    "score": r["score"],
                    "domain": domain,
                    "context_bucket": r.get("context_bucket", "retrieved_support"),
                }
                for r in merged
            ]

        except ImportError:
            return self._search_legacy(domain, query, top_k, min_score)
        except Exception as e:
            logger.warning("[DomainRAG] ChromaDB 검색 실패: %s, legacy fallback", e)
            return self._search_legacy(domain, query, top_k, min_score)

    @staticmethod
    def _normalize_draw(draw: Dict[str, Any], fallback_domain: str) -> Optional[Tuple[str, str, str, str]]:
        if not isinstance(draw, dict):
            return None

        card_id = str(draw.get("card_id") or "").strip()
        orientation = str(draw.get("orientation") or "upright").strip().lower()
        domain = str(draw.get("domain") or fallback_domain).strip().lower()
        position = str(draw.get("position") or "").strip()

        if not card_id:
            return None
        return (card_id, orientation or "upright", domain or fallback_domain, position)

    def _fetch_forced_facet_results(
        self,
        vs,
        query_embedding: List[float],
        draws: List[Dict[str, Any]],
        fallback_domain: str,
    ) -> List[Dict]:
        forced_results: List[Dict] = []
        seen_facets = set()

        for raw_draw in draws:
            normalized = self._normalize_draw(raw_draw, fallback_domain=fallback_domain)
            if not normalized:
                continue
            card_id, orientation, domain, position = normalized

            dedupe_key = (card_id, orientation, domain, position)
            if dedupe_key in seen_facets:
                continue
            seen_facets.add(dedupe_key)

            where = {
                "$and": [
                    {"card_id": {"$eq": card_id}},
                    {"orientation": {"$eq": orientation}},
                    {"domain": {"$eq": domain}},
                ]
            }
            if position:
                where["$and"].append({"position": {"$eq": position}})

            facet_matches = vs.search(
                query_embedding=query_embedding,
                top_k=1,
                min_score=-1.0,
                where=where,
            )

            if not facet_matches and position:
                # Position can be absent/empty in corpus. Retry without position filter.
                where_no_position = {
                    "$and": [
                        {"card_id": {"$eq": card_id}},
                        {"orientation": {"$eq": orientation}},
                        {"domain": {"$eq": domain}},
                    ]
                }
                facet_matches = vs.search(
                    query_embedding=query_embedding,
                    top_k=1,
                    min_score=-1.0,
                    where=where_no_position,
                )

            if facet_matches:
                row = dict(facet_matches[0])
                row["context_bucket"] = "forced_facet"
                forced_results.append(row)
                logger.info(
                    "[DomainRAG] forced-facet included card_id=%s orientation=%s domain=%s position=%s",
                    card_id,
                    orientation,
                    domain,
                    position or "-",
                )
            else:
                logger.info(
                    "[DomainRAG] forced-facet missing card_id=%s orientation=%s domain=%s position=%s",
                    card_id,
                    orientation,
                    domain,
                    position or "-",
                )

        return forced_results

    @staticmethod
    def _merge_results_with_priority(forced_results: List[Dict], similarity_results: List[Dict], top_k: int) -> List[Dict]:
        merged: List[Dict] = []
        seen = set()

        def _push(item: Dict):
            item_id = str(item.get("id") or "")
            key = item_id or f"text::{item.get('text', '')}"
            if key in seen:
                return
            seen.add(key)
            merged.append(item)

        for row in forced_results:
            _push(row)
        for row in similarity_results:
            if "context_bucket" not in row:
                row = dict(row)
                row["context_bucket"] = "retrieved_support"
            _push(row)

        return merged[: max(1, top_k)]

    def _search_legacy(
        self,
        domain: str,
        query: str,
        top_k: int = 5,
        min_score: float = DEFAULT_TAROT_MIN_SCORE,
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
        top_scores = [float(score) for score in top_results.values]
        self._log_score_distribution(domain, top_scores, min_score)

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
        min_score: Optional[float] = None,
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

        resolved_min_score = self._resolve_min_score(min_score)
        for domain in domains:
            results = self.search(domain, query, top_k=top_k, min_score=resolved_min_score)
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
        draws: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Get context string for LLM prompt.

        Args:
            domain: Domain to search
            query: Search query
            top_k: Number of results
            max_chars: Maximum characters in context
            draws: Optional card facets to force include for tarot

        Returns:
            Formatted context string
        """
        results = self.search(domain, query, top_k=top_k, draws=draws)

        if not results:
            return ""

        context_parts = []
        total_chars = 0
        forced = [r for r in results if r.get("context_bucket") == "forced_facet"]
        support = [r for r in results if r.get("context_bucket") != "forced_facet"]

        if forced:
            context_parts.append("### forced_facet")
            for r in forced:
                text = r["text"]
                if total_chars + len(text) > max_chars:
                    break
                context_parts.append(f"- {text}")
                total_chars += len(text)

        if support and total_chars < max_chars:
            context_parts.append("### retrieved_support")
            for r in support:
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

def search_tarot(query: str, top_k: int = 5, draws: Optional[List[Dict[str, Any]]] = None) -> List[Dict]:
    """Convenience function for tarot searches."""
    rag = get_domain_rag()
    rag.load_domain("tarot")
    return rag.search("tarot", query, top_k=top_k, draws=draws)


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
