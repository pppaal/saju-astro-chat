# backend_ai/app/rag/base.py
"""
RAG Base Classes
================
모든 RAG 구현체가 상속하는 추상 기본 클래스들

Classes:
- BaseEmbeddingRAG: 임베딩 기반 RAG의 base class
- BaseHybridRAG: 하이브리드 (Vector + BM25) RAG의 base class
"""

import os
import torch
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple

from .types import RAGResult, RAGQuery, RAGContext
from .model_manager import get_shared_model

logger = logging.getLogger(__name__)


class BaseEmbeddingRAG(ABC):
    """
    임베딩 기반 RAG의 추상 기본 클래스

    Subclasses must implement:
    - _load_data(): Load raw data from files
    - _get_searchable_text(item): Extract text for embedding from data item

    Provides:
    - Shared model access via get_shared_model()
    - Embedding preparation with caching
    - Semantic similarity search
    """

    def __init__(self, cache_path: Optional[str] = None):
        """
        Initialize the embedding RAG.

        Args:
            cache_path: Path to save/load embedding cache (.pt file)
        """
        self._model = None
        self._items: List[Dict] = []
        self._texts: List[str] = []
        self._embeddings: Optional[torch.Tensor] = None
        self._cache_path = cache_path

        # Load data and prepare embeddings
        self._load_data()
        self._prepare_embeddings()

    @property
    def model(self):
        """Get shared embedding model singleton."""
        if self._model is None:
            self._model = get_shared_model()
        return self._model

    @abstractmethod
    def _load_data(self) -> None:
        """
        Load raw data from files.

        Should populate self._items and self._texts.
        self._items: List of data dictionaries
        self._texts: List of searchable text strings (same order as items)
        """
        pass

    def _get_searchable_text(self, item: Dict) -> str:
        """
        Extract searchable text from a data item.
        Override this method for custom text extraction.

        Args:
            item: Data item dictionary

        Returns:
            Text string to embed and search
        """
        return item.get("text", "")

    def _prepare_embeddings(self) -> None:
        """Prepare or load cached embeddings."""
        if not self._texts:
            logger.warning(f"[{self.__class__.__name__}] No texts to embed")
            return

        # Try loading from cache
        if self._cache_path and os.path.exists(self._cache_path):
            try:
                cached = torch.load(self._cache_path, map_location="cpu")
                if cached.get("count") == len(self._texts):
                    self._embeddings = cached["embeddings"]
                    logger.info(
                        f"[{self.__class__.__name__}] Loaded {len(self._texts)} embeddings from cache"
                    )
                    return
            except Exception as e:
                logger.warning(f"[{self.__class__.__name__}] Cache load failed: {e}")

        # Generate new embeddings
        if self.model is None:
            logger.warning(f"[{self.__class__.__name__}] Model not available")
            return

        try:
            logger.info(f"[{self.__class__.__name__}] Embedding {len(self._texts)} texts...")
            self._embeddings = self.model.encode(
                self._texts,
                convert_to_tensor=True,
                show_progress_bar=False,
            )

            # Save to cache
            if self._cache_path:
                os.makedirs(os.path.dirname(self._cache_path), exist_ok=True)
                torch.save({
                    "embeddings": self._embeddings,
                    "texts": self._texts,
                    "count": len(self._texts),
                }, self._cache_path)
                logger.info(f"[{self.__class__.__name__}] Saved embeddings to cache")

        except Exception as e:
            logger.error(f"[{self.__class__.__name__}] Embedding failed: {e}")

    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
        **filters
    ) -> List[RAGResult]:
        """
        Search for similar items using semantic similarity.

        Args:
            query: Search query text
            top_k: Number of results to return
            min_score: Minimum similarity score threshold
            **filters: Additional filters to apply

        Returns:
            List of RAGResult objects
        """
        if self._embeddings is None or self.model is None:
            return []

        try:
            from sentence_transformers import util

            query_embedding = self.model.encode(query, convert_to_tensor=True)
            scores = util.cos_sim(query_embedding, self._embeddings)[0]

            # Get top-k indices
            top_indices = torch.argsort(scores, descending=True)[:top_k * 2]

            results = []
            for idx in top_indices:
                score = float(scores[idx])
                if score < min_score:
                    continue

                item = self._items[idx]

                # Apply filters
                if filters and not self._match_filters(item, filters):
                    continue

                results.append(RAGResult(
                    text=self._texts[idx],
                    score=score,
                    source=item.get("source", ""),
                    metadata=item,
                    rank=len(results) + 1,
                ))

                if len(results) >= top_k:
                    break

            return results

        except Exception as e:
            logger.error(f"[{self.__class__.__name__}] Search failed: {e}")
            return []

    def _match_filters(self, item: Dict, filters: Dict) -> bool:
        """
        Check if item matches all filters.

        Args:
            item: Data item to check
            filters: Filter conditions

        Returns:
            True if item matches all filters
        """
        for key, value in filters.items():
            if key not in item:
                return False
            if isinstance(value, list):
                if item[key] not in value:
                    return False
            elif item[key] != value:
                return False
        return True

    def search_context(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
        **filters
    ) -> RAGContext:
        """
        Search and return formatted context for LLM prompts.

        Args:
            query: Search query
            top_k: Number of results
            min_score: Minimum score threshold
            **filters: Additional filters

        Returns:
            RAGContext with formatted results
        """
        results = self.search(query, top_k, min_score, **filters)
        return RAGContext(
            results=results,
            total_found=len(results),
            search_query=query,
        )

    @property
    def item_count(self) -> int:
        """Get number of indexed items."""
        return len(self._items)

    @property
    def is_ready(self) -> bool:
        """Check if RAG is ready for search."""
        return self._embeddings is not None and len(self._items) > 0


class BaseHybridRAG(BaseEmbeddingRAG):
    """
    하이브리드 RAG 기본 클래스 (Vector + BM25)

    Extends BaseEmbeddingRAG with:
    - BM25 keyword matching
    - Reciprocal Rank Fusion (RRF) for combining results
    """

    def __init__(self, cache_path: Optional[str] = None, rrf_k: int = 60):
        """
        Initialize hybrid RAG.

        Args:
            cache_path: Path to embedding cache
            rrf_k: RRF constant (default 60)
        """
        self._rrf_k = rrf_k
        self._bm25 = None
        super().__init__(cache_path)

    def _prepare_embeddings(self) -> None:
        """Prepare both vector embeddings and BM25 index."""
        super()._prepare_embeddings()
        self._prepare_bm25()

    def _prepare_bm25(self) -> None:
        """Prepare BM25 index for keyword matching."""
        if not self._texts:
            return

        try:
            from rank_bm25 import BM25Okapi

            # Tokenize texts for BM25
            tokenized = [self._tokenize(text) for text in self._texts]
            self._bm25 = BM25Okapi(tokenized)
            logger.info(f"[{self.__class__.__name__}] BM25 index ready")

        except ImportError:
            logger.warning(f"[{self.__class__.__name__}] rank_bm25 not available")

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text for BM25.
        Override for language-specific tokenization.

        Args:
            text: Text to tokenize

        Returns:
            List of tokens
        """
        # Simple whitespace tokenization
        return text.lower().split()

    def search_bm25(
        self,
        query: str,
        top_k: int = 10
    ) -> List[Tuple[int, float]]:
        """
        Search using BM25.

        Args:
            query: Search query
            top_k: Number of results

        Returns:
            List of (index, score) tuples
        """
        if self._bm25 is None:
            return []

        tokenized_query = self._tokenize(query)
        scores = self._bm25.get_scores(tokenized_query)

        # Get top-k indices
        top_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:top_k]

        return [(idx, scores[idx]) for idx in top_indices if scores[idx] > 0]

    def search_hybrid(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
        vector_weight: float = 0.7,
        **filters
    ) -> List[RAGResult]:
        """
        Hybrid search combining vector and BM25 with RRF.

        Args:
            query: Search query
            top_k: Number of results
            min_score: Minimum combined score
            vector_weight: Weight for vector results (0-1)
            **filters: Additional filters

        Returns:
            List of RAGResult objects
        """
        # Get vector results
        vector_results = self.search(query, top_k * 2, 0.0, **filters)
        vector_ranks = {r.metadata.get("_idx", i): i + 1 for i, r in enumerate(vector_results)}

        # Get BM25 results
        bm25_results = self.search_bm25(query, top_k * 2)
        bm25_ranks = {idx: rank + 1 for rank, (idx, _) in enumerate(bm25_results)}

        # Combine with RRF
        all_indices = set(vector_ranks.keys()) | set(bm25_ranks.keys())
        rrf_scores = {}

        for idx in all_indices:
            vector_rank = vector_ranks.get(idx, 1000)
            bm25_rank = bm25_ranks.get(idx, 1000)

            # RRF formula
            vector_score = vector_weight / (self._rrf_k + vector_rank)
            bm25_score = (1 - vector_weight) / (self._rrf_k + bm25_rank)
            rrf_scores[idx] = vector_score + bm25_score

        # Sort by RRF score
        sorted_indices = sorted(rrf_scores.keys(), key=lambda i: rrf_scores[i], reverse=True)

        # Build results
        results = []
        for idx in sorted_indices[:top_k]:
            if idx >= len(self._items):
                continue

            item = self._items[idx]
            score = rrf_scores[idx]

            if score < min_score:
                continue

            results.append(RAGResult(
                text=self._texts[idx],
                score=score,
                source=item.get("source", ""),
                metadata=item,
                rank=len(results) + 1,
            ))

        return results
