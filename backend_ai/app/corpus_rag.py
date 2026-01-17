# backend_ai/app/corpus_rag.py
"""
Corpus RAG Engine - Jung Quote Retrieval System
================================================
Retrieves authentic Jung quotes based on semantic similarity.
Replaces template-based "fake" Jung interpretations with real citations.

Refactored to use BaseEmbeddingRAG for shared embedding infrastructure.
"""

import os
import json
import logging
from typing import List, Dict, Optional, Tuple

from backend_ai.app.rag import BaseEmbeddingRAG, RAGResult

logger = logging.getLogger(__name__)


class CorpusRAG(BaseEmbeddingRAG):
    """
    RAG engine for retrieving authentic Jung quotes.

    Inherits from BaseEmbeddingRAG for shared embedding infrastructure.

    Features:
    - Loads curated Jung quotes from JSON files
    - Embeds quotes in both English and Korean for multilingual search
    - Returns relevant quotes with proper citations
    """

    def __init__(
        self,
        corpus_dir: str = None,
        corpus_dirs: Optional[List[str]] = None,
        cache_path: Optional[str] = None,
    ):
        """
        Initialize the Corpus RAG engine.

        Args:
            corpus_dir: Path to directory containing quote JSON files
            corpus_dirs: Optional list of directories to load (fallback to Jung + Stoic)
            cache_path: Path to save/load embedding cache
        """
        # Set default corpus directories (Jung + Stoic)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        default_dirs = [
            os.path.join(base_dir, "data", "corpus", "jung"),
            os.path.join(base_dir, "data", "corpus", "stoic"),
        ]

        # Backward compatibility: allow single corpus_dir
        if corpus_dirs:
            self.corpus_dirs = corpus_dirs
        elif corpus_dir:
            self.corpus_dirs = [corpus_dir]
        else:
            self.corpus_dirs = default_dirs

        # Set default cache path
        if cache_path is None:
            cache_path = os.path.join(base_dir, "data", "embeddings", "corpus_embeds.pt")

        # Initialize base class (this calls _load_data and _prepare_embeddings)
        super().__init__(cache_path=cache_path)

    def _load_data(self) -> None:
        """
        Load all quotes from JSON files in configured corpus directories.
        Implements abstract method from BaseEmbeddingRAG.
        """
        total_files = 0
        for corpus_dir in self.corpus_dirs:
            if not os.path.exists(corpus_dir):
                logger.warning(f"[CorpusRAG] Corpus directory not found: {corpus_dir}")
                continue

            for filename in os.listdir(corpus_dir):
                if not filename.endswith('.json'):
                    continue

                filepath = os.path.join(corpus_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    # Derive meta
                    source_tag = os.path.basename(corpus_dir)
                    concept = data.get('concept') or data.get('philosopher') or source_tag or "unknown"
                    concept_kr = data.get('concept_kr') or data.get('philosopher_kr') or concept
                    default_source = data.get('main_work') or data.get('philosopher') or "Unknown"

                    for quote in data.get('quotes', []):
                        if not isinstance(quote, dict):
                            continue
                        q = dict(quote)  # shallow copy
                        q.setdefault('concept', concept)
                        q.setdefault('concept_kr', concept_kr)
                        q.setdefault('source', default_source)
                        q['corpus_source'] = source_tag  # e.g., jung or stoic

                        # Add to items list
                        self._items.append(q)

                        # Create searchable text (combine English + Korean + tags)
                        combined_text = " ".join([
                            q.get('concept', ''),
                            q.get('en', ''),
                            q.get('kr', ''),
                            " ".join(q.get('tags', [])),
                            q.get('corpus_source', '')
                        ])
                        self._texts.append(combined_text)

                        total_files += 1

                except Exception as e:
                    logger.error(f"[CorpusRAG] Error loading {filename}: {e}")

        logger.info(f"[CorpusRAG] Loaded {len(self._items)} quotes from {len(self.corpus_dirs)} corpus dirs")

    def search(
        self,
        query: str,
        top_k: int = 3,
        concept_filter: Optional[str] = None,
        min_score: float = 0.3
    ) -> List[Dict]:
        """
        Search for relevant Jung quotes.

        Args:
            query: Search query (can be in any language)
            top_k: Number of results to return
            concept_filter: Optional filter by concept (e.g., 'shadow', 'anima')
            min_score: Minimum similarity score threshold

        Returns:
            List of matching quotes with scores and citations
        """
        # Use base class search with optional concept filter
        filters = {}
        if concept_filter:
            filters['concept'] = concept_filter

        rag_results = super().search(query, top_k=top_k, min_score=min_score, **filters)

        # Convert RAGResult to legacy dict format for backward compatibility
        results = []
        for r in rag_results:
            quote = r.metadata
            results.append({
                'quote_en': quote.get('en', ''),
                'quote_kr': quote.get('kr', ''),
                'source': quote.get('source', 'Unknown'),
                'year': quote.get('year', ''),
                'cw_volume': quote.get('cw_volume', ''),
                'concept': quote.get('concept', ''),
                'concept_kr': quote.get('concept_kr', ''),
                'context': quote.get('context', ''),
                'tags': quote.get('tags', []),
                'corpus_source': quote.get('corpus_source', ''),
                'score': r.score
            })

        return results

    def search_by_signals(
        self,
        signals: Dict,
        theme: str = "general",
        locale: str = "ko",
        top_k: int = 3
    ) -> List[Dict]:
        """
        Search quotes based on astrological/saju signals.

        Args:
            signals: Dict containing astrological signals (planets, aspects, etc.)
            theme: Theme of the reading (love, career, etc.)
            locale: Language preference ('ko', 'en', etc.)
            top_k: Number of quotes to return

        Returns:
            List of relevant quotes
        """
        # Build query from signals
        query_parts = []

        # Extract key themes from signals
        if 'planets' in signals:
            for planet in signals['planets']:
                query_parts.append(planet)

        if 'aspects' in signals:
            for aspect in signals['aspects']:
                if 'hard' in str(aspect).lower():
                    query_parts.extend(['shadow', 'challenge', 'growth'])
                elif 'soft' in str(aspect).lower():
                    query_parts.extend(['integration', 'harmony'])

        if 'houses' in signals:
            house_themes = {
                1: 'persona identity',
                4: 'family roots unconscious',
                7: 'relationship anima animus projection',
                8: 'shadow transformation death rebirth',
                10: 'persona achievement',
                12: 'unconscious dreams collective'
            }
            for house in signals['houses']:
                if house in house_themes:
                    query_parts.append(house_themes[house])

        # Add theme-specific keywords
        theme_keywords = {
            'love': 'anima animus relationship projection',
            'career': 'persona achievement individuation',
            'life_path': 'individuation self wholeness',
            'health': 'shadow integration body',
            'family': 'mother father archetype complex',
            'spiritual': 'self collective unconscious transcendence'
        }
        if theme in theme_keywords:
            query_parts.append(theme_keywords[theme])

        query = " ".join(query_parts)
        return self.search(query, top_k=top_k)

    def format_citation(
        self,
        quote: Dict,
        locale: str = "ko",
        include_context: bool = True
    ) -> str:
        """
        Format a quote with proper citation.

        Args:
            quote: Quote dict from search results
            locale: Language for quote text ('ko' or 'en')
            include_context: Whether to include context explanation

        Returns:
            Formatted citation string
        """
        quote_text = quote.get('quote_kr' if locale == 'ko' else 'quote_en', '')
        source = quote.get('source', 'Unknown')
        year = quote.get('year', '')
        cw = quote.get('cw_volume', '')

        citation = f'"{quote_text}"'
        citation += f"\n— Carl Jung, {source}"
        if year:
            citation += f" ({year})"
        if cw and cw not in ['Various', 'Attributed', 'Letters', 'Interview', 'MDR']:
            citation += f", {cw}"

        if include_context and quote.get('context'):
            citation += f"\n[{quote.get('context')}]"

        return citation

    def get_quotes_for_interpretation(
        self,
        query: str,
        locale: str = "ko",
        top_k: int = 2
    ) -> Tuple[List[Dict], str]:
        """
        Get quotes formatted for AI interpretation.

        Args:
            query: Search query
            locale: Language preference
            top_k: Number of quotes

        Returns:
            Tuple of (raw quotes, formatted context string for LLM)
        """
        quotes = self.search(query, top_k=top_k)

        if not quotes:
            return [], ""

        context_parts = []
        for q in quotes:
            citation = self.format_citation(q, locale=locale, include_context=False)
            context_parts.append(citation)

        context_str = "\n\n".join(context_parts)

        return quotes, context_str


# Singleton instance for reuse
_corpus_rag_instance: Optional[CorpusRAG] = None


def get_corpus_rag() -> CorpusRAG:
    """Get or create singleton CorpusRAG instance."""
    global _corpus_rag_instance
    if _corpus_rag_instance is None:
        _corpus_rag_instance = CorpusRAG()
    return _corpus_rag_instance


# Test function
if __name__ == "__main__":
    print("Testing CorpusRAG...")
    rag = CorpusRAG()

    # Test searches
    test_queries = [
        "shadow work integration",
        "그림자를 어떻게 통합하나요",
        "relationship projection anima",
        "dreams and unconscious",
        "becoming who you truly are"
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print('='*60)

        results = rag.search(query, top_k=2)
        for i, r in enumerate(results, 1):
            print(f"\n[{i}] Score: {r['score']:.3f} | Concept: {r['concept']}")
            print(rag.format_citation(r, locale='ko'))
