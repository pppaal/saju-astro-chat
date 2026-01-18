# backend_ai/app/tarot_embeddings/search_methods.py
"""
Search methods mixin for TarotAdvancedEmbeddings.
Contains all search-related functionality.
"""

import time
import torch
from typing import List, Dict, Any, Optional

try:
    from sentence_transformers import util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False


class SearchMethodsMixin:
    """Mixin providing search functionality for TarotAdvancedEmbeddings."""

    def search(
        self,
        query: str,
        top_k: int = 5,
        category: str = None,
        threshold: float = 0.1,
        use_cache: bool = True
    ) -> List[Dict]:
        """
        Search for relevant entries by semantic similarity.

        Args:
            query: Search query
            top_k: Number of results to return
            category: Optional filter by category
            threshold: Minimum similarity score (default: 0.1)
            use_cache: Use query cache (default: True)

        Returns:
            List of matching entries with scores
        """
        start_time = time.time()

        # Query cache check
        cache_key = f"{query}|{top_k}|{category}|{threshold}"
        if use_cache and self._query_cache:
            cached = self._query_cache.get(cache_key)
            if cached is not None:
                self._metrics.cache_hits += 1
                return cached
            self._metrics.cache_misses += 1

        # Graceful degradation: fallback to keyword search if model/embeddings unavailable
        if self.embeddings is None or len(self.entries) == 0:
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

        if self.model is None:
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

        try:
            # Thread-safe search with lock
            with self._lock:
                # Encode query
                query_embed = self.model.encode(query, convert_to_tensor=True, normalize_embeddings=True)

                # Calculate similarities
                scores = util.cos_sim(query_embed, self.embeddings)[0]

                # Filter by category if specified
                if category:
                    mask = torch.tensor([
                        1.0 if e['category'] == category else 0.0
                        for e in self.entries
                    ], device=scores.device)
                    scores = scores * mask

                # Get top results
                top_results = torch.topk(scores, min(top_k * 2, len(self.entries)))

                results = []
                for score, idx in zip(top_results.values.tolist(), top_results.indices.tolist()):
                    if score > threshold:
                        entry = self.entries[idx].copy()
                        entry['score'] = round(score, 4)
                        results.append(entry)
                        if len(results) >= top_k:
                            break

            # Save to cache
            if use_cache and self._query_cache:
                self._query_cache.set(cache_key, results)

            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._metrics.total_searches += 1
            self._metrics.total_latency_ms += latency_ms
            self._metrics.min_latency_ms = min(self._metrics.min_latency_ms, latency_ms)
            self._metrics.max_latency_ms = max(self._metrics.max_latency_ms, latency_ms)

            return results

        except Exception as e:
            self._log(f"Search error: {e}", level='error')
            self._metrics.errors += 1
            self._metrics.fallback_searches += 1
            return self._fallback_keyword_search(query, top_k, category)

    def search_batch(
        self,
        queries: List[str],
        top_k: int = 5,
        category: str = None,
        threshold: float = 0.1
    ) -> List[List[Dict]]:
        """
        Batch search: process multiple queries at once (efficient).

        Args:
            queries: List of search queries
            top_k: Number of results per query
            category: Optional filter by category
            threshold: Minimum similarity score

        Returns:
            List of results for each query
        """
        if not queries:
            return []

        start_time = time.time()

        if self.embeddings is None or self.model is None:
            self._metrics.fallback_searches += len(queries)
            return [self._fallback_keyword_search(q, top_k, category) for q in queries]

        try:
            with self._lock:
                # Encode all queries at once
                query_embeds = self.model.encode(
                    queries,
                    convert_to_tensor=True,
                    normalize_embeddings=True,
                    batch_size=min(32, len(queries))
                )

                # Calculate similarities for all queries
                all_scores = util.cos_sim(query_embeds, self.embeddings)

                # Category mask (create once)
                category_mask = None
                if category:
                    category_mask = torch.tensor([
                        1.0 if e['category'] == category else 0.0
                        for e in self.entries
                    ], device=all_scores.device)

                all_results = []
                for i, scores in enumerate(all_scores):
                    if category_mask is not None:
                        scores = scores * category_mask

                    top_results = torch.topk(scores, min(top_k * 2, len(self.entries)))

                    results = []
                    for score, idx in zip(top_results.values.tolist(), top_results.indices.tolist()):
                        if score > threshold:
                            entry = self.entries[idx].copy()
                            entry['score'] = round(score, 4)
                            results.append(entry)
                            if len(results) >= top_k:
                                break

                    all_results.append(results)

            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._metrics.total_batch_searches += 1
            self._metrics.total_latency_ms += latency_ms

            return all_results

        except Exception as e:
            self._log(f"Batch search error: {e}", level='error')
            self._metrics.errors += 1
            self._metrics.fallback_searches += len(queries)
            return [self._fallback_keyword_search(q, top_k, category) for q in queries]

    def search_hybrid(
        self,
        query: str,
        top_k: int = 5,
        category: str = None,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3
    ) -> List[Dict]:
        """
        Hybrid search: semantic + keyword combined.

        Args:
            query: Search query
            top_k: Number of results
            category: Optional filter
            semantic_weight: Weight for semantic search (default: 0.7)
            keyword_weight: Weight for keyword search (default: 0.3)

        Returns:
            Combined and re-ranked results
        """
        start_time = time.time()

        # Semantic search (fetch more)
        semantic_results = self.search(query, top_k=top_k * 2, category=category, use_cache=False)

        # Keyword search
        keyword_results = self._fallback_keyword_search(query, top_k=top_k * 2, category=category)

        # Merge results and recalculate scores
        merged = {}

        for r in semantic_results:
            key = r['text'][:100]  # Use part of text as key
            merged[key] = {
                'entry': r,
                'semantic_score': r.get('score', 0),
                'keyword_score': 0
            }

        for r in keyword_results:
            key = r['text'][:100]
            if key in merged:
                merged[key]['keyword_score'] = r.get('score', 0)
            else:
                merged[key] = {
                    'entry': r,
                    'semantic_score': 0,
                    'keyword_score': r.get('score', 0)
                }

        # Calculate weighted average scores
        results = []
        for data in merged.values():
            combined_score = (
                data['semantic_score'] * semantic_weight +
                data['keyword_score'] * keyword_weight
            )
            entry = data['entry'].copy()
            entry['score'] = round(combined_score, 4)
            entry['semantic_score'] = round(data['semantic_score'], 4)
            entry['keyword_score'] = round(data['keyword_score'], 4)
            entry['hybrid'] = True
            results.append(entry)

        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)

        # Update metrics
        latency_ms = (time.time() - start_time) * 1000
        self._metrics.total_hybrid_searches += 1
        self._metrics.total_latency_ms += latency_ms

        return results[:top_k]

    def _fallback_keyword_search(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """Keyword-based fallback search (when semantic search fails)."""
        query_lower = query.lower()
        keywords = query_lower.split()

        results = []
        for entry in self.entries:
            if category and entry['category'] != category:
                continue

            text_lower = entry['text'].lower()
            # Calculate keyword matching score
            match_count = sum(1 for kw in keywords if kw in text_lower)
            if match_count > 0:
                entry_copy = entry.copy()
                entry_copy['score'] = match_count / len(keywords)  # Normalized 0~1
                entry_copy['fallback'] = True
                results.append(entry_copy)

        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    def search_by_card(self, card_name: str, top_k: int = 10) -> List[Dict]:
        """Search for all entries related to a specific card."""
        results = []
        for entry in self.entries:
            text_lower = entry['text'].lower()
            card_lower = card_name.lower()
            if card_lower in text_lower or card_name in entry.get('data', {}).get('cards', []):
                results.append(entry)

        return results[:top_k]

    def get_by_category(self, category: str) -> List[Dict]:
        """Get all entries in a category."""
        return [e for e in self.entries if e['category'] == category]
