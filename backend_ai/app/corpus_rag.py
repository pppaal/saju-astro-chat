"""
Corpus RAG Engine - Jung Quote Retrieval System
================================================
Retrieves authentic Jung quotes based on semantic similarity.
Replaces template-based "fake" Jung interpretations with real citations.
"""

import os
import json
import torch
from typing import List, Dict, Optional, Tuple
from sentence_transformers import util

# Use shared model singleton from saju_astro_rag
try:
    from backend_ai.app.saju_astro_rag import get_model
except ImportError:
    from saju_astro_rag import get_model


class CorpusRAG:
    """
    RAG engine for retrieving authentic Jung quotes.

    Features:
    - Loads curated Jung quotes from JSON files
    - Embeds quotes in both English and Korean for multilingual search
    - Returns relevant quotes with proper citations
    """

    def __init__(self, corpus_dir: str = None, corpus_dirs: Optional[List[str]] = None):
        """
        Initialize the Corpus RAG engine.

        Args:
            corpus_dir: Path to directory containing quote JSON files
            corpus_dirs: Optional list of directories to load (fallback to Jung + Stoic)
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

        self.quotes: List[Dict] = []
        self.quote_texts: List[str] = []
        self.quote_embeddings = None

        # Use shared model singleton
        self.embed_model = get_model()

        # Load and embed quotes
        self._load_quotes()
        self._prepare_embeddings()

    def _load_quotes(self):
        """Load all quotes from JSON files in configured corpus directories."""
        total_files = 0
        for corpus_dir in self.corpus_dirs:
            if not os.path.exists(corpus_dir):
                print(f"[CorpusRAG] Warning: Corpus directory not found: {corpus_dir}")
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
                        self.quotes.append(q)
                        total_files += 1

                except Exception as e:
                    print(f"[CorpusRAG] Error loading {filename}: {e}")

        print(f"[CorpusRAG] Loaded {len(self.quotes)} quotes from {len(self.corpus_dirs)} corpus dirs")

    def _prepare_embeddings(self):
        """Create embeddings for all quotes."""
        if not self.quotes:
            print("[CorpusRAG] No quotes to embed")
            return

        # Combine English and Korean text for better multilingual matching
        self.quote_texts = []
        for q in self.quotes:
            # Combine: concept + English quote + Korean quote + tags
            combined_text = " ".join([
                q.get('concept', ''),
                q.get('en', ''),
                q.get('kr', ''),
                " ".join(q.get('tags', [])),
                q.get('corpus_source', '')
            ])
            self.quote_texts.append(combined_text)

        # Generate embeddings
        self.quote_embeddings = self.embed_model.encode(
            self.quote_texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=False
        )

        print(f"[CorpusRAG] Created embeddings for {len(self.quote_texts)} quotes")

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
        if self.quote_embeddings is None or len(self.quotes) == 0:
            return []

        # Encode query
        query_embedding = self.embed_model.encode(
            query,
            convert_to_tensor=True,
            normalize_embeddings=True
        )

        # Calculate similarity scores
        scores = util.cos_sim(query_embedding, self.quote_embeddings)[0]

        # Get top results
        top_results = torch.topk(scores, k=min(top_k * 2, len(self.quotes)))

        results = []
        for idx, score in zip(top_results.indices, top_results.values):
            score_val = float(score)
            if score_val < min_score:
                continue

            quote = self.quotes[idx]

            # Apply concept filter if specified
            if concept_filter and quote.get('concept') != concept_filter:
                continue

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
                'score': score_val
            })

            if len(results) >= top_k:
                break

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
