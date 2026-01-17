# backend_ai/app/tarot_rag.py
"""
Tarot Card Interpretation RAG System
====================================
Uses SentenceTransformer for semantic similarity matching with tarot cards.
- 타로 카드 전용 임베딩 시스템
- 78장 라이더-웨이트 타로 덱 (메이저 아르카나 + 마이너 아르카나)

Refactored to use BaseEmbeddingRAG for shared embedding infrastructure.

개선사항 (v2.0):
- BaseEmbeddingRAG 상속으로 공통 인프라 활용
- 모델 업그레이드: mpnet-base-v2 (더 정확한 다국어 임베딩)
- 캐시 무효화: 파일 해시 기반 자동 재생성
- 에러 핸들링: fallback 모델 및 graceful degradation
"""

import os
import json
import hashlib
import time
import logging
from typing import List, Dict, Optional, Tuple, Any

import torch

try:
    from sentence_transformers import util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[TarotRAG] sentence-transformers not installed. Semantic search disabled.")

try:
    from backend_ai.app.rag import BaseEmbeddingRAG, RAGResult
except ImportError:
    from app.rag import BaseEmbeddingRAG, RAGResult

logger = logging.getLogger(__name__)


class TarotRAG(BaseEmbeddingRAG):
    """
    임베딩 기반 타로 해석 검색 엔진

    Inherits from BaseEmbeddingRAG for shared embedding infrastructure.

    - 질문/상황을 벡터로 변환하여 가장 관련 있는 카드 의미 검색
    - 정방향/역방향 해석 지원
    - 개선: 더 정확한 모델, 캐시 무효화, 에러 핸들링
    """

    def __init__(self, rules_dir: str = None, cache_path: Optional[str] = None):
        """
        Initialize TarotRAG.

        Args:
            rules_dir: Path to tarot rules directory
            cache_path: Path to embedding cache (optional, auto-generated if not provided)
        """
        # 경로 설정
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot")

        self.rules_dir = rules_dir
        self._data_hash = None  # 캐시 무효화용 해시

        # Card storage (separate from base class _items for card-specific data)
        self.cards = {}  # card_id -> card_data
        self.card_texts = []  # [{card_id, text, orientation, keywords, meaning, ...}]

        # Complete corpus storage
        self.complete_corpus = None
        self.position_meanings = {}
        self.card_combinations = []

        # Set default cache path
        if cache_path is None:
            cache_path = os.path.join(rules_dir, "tarot_embeds.pt")

        # Calculate data hash before calling super().__init__
        self._data_hash = self._calculate_data_hash()

        # Initialize base class (this calls _load_data and _prepare_embeddings)
        super().__init__(cache_path=cache_path)

    def _calculate_data_hash(self) -> str:
        """파일 수정 시간 기반 해시 계산 (캐시 무효화용)"""
        hash_data = []

        if not os.path.exists(self.rules_dir):
            return ""

        try:
            for filename in sorted(os.listdir(self.rules_dir)):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.rules_dir, filename)
                    mtime = os.path.getmtime(filepath)
                    size = os.path.getsize(filepath)
                    hash_data.append(f"{filename}:{mtime}:{size}")

            hash_str = "|".join(hash_data)
            return hashlib.md5(hash_str.encode()).hexdigest()[:16]
        except Exception as e:
            logger.warning(f"[TarotRAG] Hash calculation error: {e}")
            return str(time.time())

    def _load_data(self) -> None:
        """
        Load all tarot card JSON files.
        Implements abstract method from BaseEmbeddingRAG.
        """
        if not os.path.exists(self.rules_dir):
            logger.warning(f"[TarotRAG] Rules directory not found: {self.rules_dir}")
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith('.json'):
                continue

            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)

                # Handle complete_interpretations.json (generated corpus)
                if filename == 'complete_interpretations.json':
                    self._load_complete_interpretations(data)
                    continue

                # Handle both array and dict formats
                cards_list = data if isinstance(data, list) else data.get('cards', [])

                for card in cards_list:
                    if not isinstance(card, dict):
                        continue

                    card_id = card.get('id')
                    card_name = card.get('name', '')
                    if card_id is None:
                        continue

                    self.cards[card_id] = card

                    # Extract upright meaning
                    upright = card.get('upright', {})
                    if upright:
                        keywords = upright.get('keywords', [])
                        meaning = upright.get('meaning', '')
                        advice = upright.get('advice', '')
                        combined = f"{card_name} upright: {' '.join(keywords)} {meaning} {advice}".strip()

                        card_data = {
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'upright',
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': advice,
                            'text': combined,
                            'suit': card.get('suit', 'major'),
                            'arcana': card.get('arcana', 'major')
                        }
                        self.card_texts.append(card_data)
                        self._items.append(card_data)
                        self._texts.append(combined)

                    # Extract reversed meaning
                    reversed_data = card.get('reversed', {})
                    if reversed_data:
                        keywords = reversed_data.get('keywords', [])
                        meaning = reversed_data.get('meaning', '')
                        advice = reversed_data.get('advice', '')
                        combined = f"{card_name} reversed: {' '.join(keywords)} {meaning} {advice}".strip()

                        card_data = {
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'reversed',
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': advice,
                            'text': combined,
                            'suit': card.get('suit', 'major'),
                            'arcana': card.get('arcana', 'major')
                        }
                        self.card_texts.append(card_data)
                        self._items.append(card_data)
                        self._texts.append(combined)

            except Exception as e:
                logger.error(f"[TarotRAG] Failed to load {filename}: {e}")

        logger.info(f"[TarotRAG] Loaded {len(self.cards)} cards, {len(self.card_texts)} interpretations")

    def _load_complete_interpretations(self, data: dict):
        """Load complete_interpretations.json (generated corpus)"""
        # Store full data for reference
        self.complete_corpus = data

        # Load major arcana
        for card in data.get('major_arcana', []):
            card_id = card.get('id', f"major_{card.get('number', 0)}")
            name_data = card.get('name', {})
            card_name = name_data.get('ko', '') or name_data.get('en', '') if isinstance(name_data, dict) else str(name_data)

            self.cards[card_id] = card

            # Extract upright meanings by life area
            upright = card.get('upright', {})
            if upright:
                for area in ['general', 'love', 'career', 'finance', 'health']:
                    meaning = upright.get(area, '')
                    if meaning:
                        keywords = card.get('keywords', [])
                        combined = f"{card_name} upright {area}: {' '.join(keywords[:3]) if keywords else ''} {meaning}".strip()
                        card_data = {
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'upright',
                            'life_area': area,
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': upright.get('advice', ''),
                            'text': combined,
                            'suit': 'major',
                            'arcana': 'major',
                            'source': 'complete_corpus'
                        }
                        self.card_texts.append(card_data)
                        self._items.append(card_data)
                        self._texts.append(combined)

            # Extract reversed meanings
            reversed_data = card.get('reversed', {})
            if reversed_data:
                for area in ['general', 'love', 'career', 'finance', 'health']:
                    meaning = reversed_data.get(area, '')
                    if meaning:
                        keywords = card.get('keywords', [])
                        combined = f"{card_name} reversed {area}: {meaning}".strip()
                        card_data = {
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'reversed',
                            'life_area': area,
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': reversed_data.get('advice', ''),
                            'text': combined,
                            'suit': 'major',
                            'arcana': 'major',
                            'source': 'complete_corpus'
                        }
                        self.card_texts.append(card_data)
                        self._items.append(card_data)
                        self._texts.append(combined)

        # Load minor arcana
        for card in data.get('minor_arcana', []):
            card_id = card.get('id', '')
            name_data = card.get('name', {})
            card_name = name_data.get('ko', '') or name_data.get('en', '') if isinstance(name_data, dict) else str(name_data)
            suit = card.get('suit', {})
            suit_name = suit.get('en', 'minor') if isinstance(suit, dict) else str(suit)

            self.cards[card_id] = card

            # Extract upright
            upright = card.get('upright', {})
            if upright:
                general = upright.get('general', '')
                if general:
                    keywords = card.get('keywords', [])
                    combined = f"{card_name} upright: {' '.join(keywords[:3]) if keywords else ''} {general}".strip()
                    card_data = {
                        'card_id': card_id,
                        'name': card_name,
                        'orientation': 'upright',
                        'keywords': keywords,
                        'meaning': general,
                        'advice': upright.get('advice', ''),
                        'text': combined,
                        'suit': suit_name,
                        'arcana': 'minor',
                        'source': 'complete_corpus'
                    }
                    self.card_texts.append(card_data)
                    self._items.append(card_data)
                    self._texts.append(combined)

            # Extract reversed
            reversed_data = card.get('reversed', {})
            if reversed_data:
                general = reversed_data.get('general', '')
                if general:
                    combined = f"{card_name} reversed: {general}".strip()
                    card_data = {
                        'card_id': card_id,
                        'name': card_name,
                        'orientation': 'reversed',
                        'keywords': card.get('keywords', []),
                        'meaning': general,
                        'advice': reversed_data.get('advice', ''),
                        'text': combined,
                        'suit': suit_name,
                        'arcana': 'minor',
                        'source': 'complete_corpus'
                    }
                    self.card_texts.append(card_data)
                    self._items.append(card_data)
                    self._texts.append(combined)

        # Store position meanings and combinations
        self.position_meanings = data.get('position_meanings', {})
        self.card_combinations = data.get('combinations', [])

        logger.info(f"[TarotRAG] Loaded complete corpus: {len(data.get('major_arcana', []))} major + {len(data.get('minor_arcana', []))} minor")

    def _prepare_embeddings(self) -> None:
        """Prepare or load cached embeddings with cache invalidation and hash validation."""
        if not self._texts:
            logger.warning("[TarotRAG] No card texts to embed")
            return

        # Check cache with hash validation
        if self._cache_path and os.path.exists(self._cache_path):
            try:
                cache_data = torch.load(self._cache_path, map_location="cpu")

                # 캐시 유효성 검사: count + data hash
                cache_valid = (
                    cache_data.get('count') == len(self._texts) and
                    cache_data.get('data_hash') == self._data_hash
                )

                if cache_valid:
                    self._embeddings = cache_data.get('embeds', cache_data.get('embeddings'))
                    logger.info(f"[TarotRAG] Loaded cached embeddings: {self._embeddings.shape} "
                              f"(hash={self._data_hash[:8] if self._data_hash else 'N/A'})")
                    return
                else:
                    reason = []
                    if cache_data.get('count') != len(self._texts):
                        reason.append(f"count mismatch ({cache_data.get('count')} != {len(self._texts)})")
                    if cache_data.get('data_hash') != self._data_hash:
                        reason.append("data files changed")
                    logger.info(f"[TarotRAG] Cache invalidated: {', '.join(reason)}")

            except Exception as e:
                logger.warning(f"[TarotRAG] Cache load failed: {e}")

        # Use base class embedding generation
        super()._prepare_embeddings()

        # Save cache with additional metadata
        if self._embeddings is not None and self._cache_path:
            try:
                torch.save({
                    'embeds': self._embeddings,
                    'embeddings': self._embeddings,  # For compatibility
                    'count': len(self._texts),
                    'data_hash': self._data_hash,
                    'created_at': time.time()
                }, self._cache_path)
                logger.info(f"[TarotRAG] Saved embeddings cache (hash={self._data_hash[:8] if self._data_hash else 'N/A'})")
            except Exception as e:
                logger.error(f"[TarotRAG] Failed to save cache: {e}")

    def clear_cache(self) -> bool:
        """캐시 파일 삭제 및 임베딩 재생성"""
        try:
            if self._cache_path and os.path.exists(self._cache_path):
                os.remove(self._cache_path)
                logger.info("[TarotRAG] Cache cleared")

            self._embeddings = None
            self._prepare_embeddings()
            return True
        except Exception as e:
            logger.error(f"[TarotRAG] Failed to clear cache: {e}")
            return False

    def is_cache_valid(self) -> bool:
        """캐시 유효성 검사"""
        if not self._cache_path or not os.path.exists(self._cache_path):
            return False

        try:
            cache = torch.load(self._cache_path, map_location="cpu")
            cached_hash = cache.get('data_hash', '')
            current_hash = self._calculate_data_hash()

            return cached_hash == current_hash
        except Exception:
            return False

    def search(self, query: str, top_k: int = 10, orientation: str = None, threshold: float = 0.1) -> List[Dict]:
        """
        질문/상황으로 가장 관련 있는 타로 카드 해석 검색

        Args:
            query: 사용자의 질문 또는 상황 설명
            top_k: 반환할 최대 결과 수
            orientation: 'upright', 'reversed', or None (both)
            threshold: 최소 유사도 점수 (default: 0.1)

        Returns:
            List of matched card interpretations with similarity scores
        """
        # Graceful degradation: 모델/임베딩 없으면 키워드 검색으로 fallback
        if self._embeddings is None or len(self.card_texts) == 0:
            return self._fallback_keyword_search(query, top_k, orientation)

        if self.model is None:
            return self._fallback_keyword_search(query, top_k, orientation)

        try:
            # Use base class search with orientation filter
            filters = {}
            if orientation:
                filters['orientation'] = orientation

            rag_results = super().search(query, top_k=top_k * 2, min_score=threshold, **filters)

            # Convert RAGResult to legacy dict format
            results = []
            for r in rag_results:
                card_data = dict(r.metadata)
                card_data['similarity'] = round(r.score, 4)
                results.append(card_data)

                if len(results) >= top_k:
                    break

            return results

        except Exception as e:
            logger.error(f"[TarotRAG] Search error: {e}")
            return self._fallback_keyword_search(query, top_k, orientation)

    def _fallback_keyword_search(self, query: str, top_k: int = 10, orientation: str = None) -> List[Dict]:
        """키워드 기반 fallback 검색 (시맨틱 검색 실패 시)"""
        query_lower = query.lower()
        keywords = query_lower.split()

        results = []
        for card in self.card_texts:
            if orientation and card['orientation'] != orientation:
                continue

            text_lower = card['text'].lower()
            # 키워드 매칭 점수 계산
            match_count = sum(1 for kw in keywords if kw in text_lower)

            # 키워드에서도 매칭 확인
            card_keywords = [k.lower() for k in card.get('keywords', [])]
            keyword_match = sum(1 for kw in keywords if any(kw in ck for ck in card_keywords))

            total_score = match_count + keyword_match * 2  # 키워드 매칭에 가중치

            if total_score > 0:
                card_copy = card.copy()
                card_copy['similarity'] = total_score / (len(keywords) * 3)  # 정규화
                card_copy['fallback'] = True
                results.append(card_copy)

        # 점수순 정렬
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:top_k]

    def search_for_card(self, card_name: str, orientation: str = 'upright') -> Optional[Dict]:
        """
        특정 카드의 해석 찾기

        Args:
            card_name: 카드 이름 (예: "The Fool", "Ace of Wands")
            orientation: 'upright' or 'reversed'

        Returns:
            Card interpretation dict or None
        """
        card_name_lower = card_name.lower()
        for card in self.card_texts:
            if card['name'].lower() == card_name_lower and card['orientation'] == orientation:
                return card
        return None

    def get_reading_context(self, drawn_cards: List[Dict], question: str = "") -> Dict:
        """
        뽑은 카드들에 대한 해석 컨텍스트 생성

        Args:
            drawn_cards: List of {name, isReversed} dicts
            question: 사용자의 질문 (선택사항)

        Returns:
            Dict with interpretations for each card
        """
        interpretations = []
        themes = set()
        advice_list = []

        for i, dc in enumerate(drawn_cards):
            name = dc.get('name') or dc.get('card', {}).get('name', '')
            is_reversed = dc.get('isReversed', False)
            orientation = 'reversed' if is_reversed else 'upright'

            card_interp = self.search_for_card(name, orientation)
            if card_interp:
                interpretations.append({
                    'position': i + 1,
                    'name': name,
                    'orientation': orientation,
                    'keywords': card_interp.get('keywords', []),
                    'meaning': card_interp.get('meaning', ''),
                    'advice': card_interp.get('advice', ''),
                    'suit': card_interp.get('suit', 'major')
                })

                # Collect themes from keywords
                for kw in card_interp.get('keywords', [])[:3]:
                    themes.add(kw)

                if card_interp.get('advice'):
                    advice_list.append(card_interp['advice'])

        # If question provided, also search for contextual meanings
        contextual = []
        if question:
            search_results = self.search(question, top_k=5)
            contextual = [
                {
                    'name': r['name'],
                    'orientation': r['orientation'],
                    'relevance': r['similarity'],
                    'meaning': r['meaning'][:200]
                }
                for r in search_results
            ]

        return {
            'card_interpretations': interpretations,
            'themes': list(themes)[:10],
            'advice': advice_list[:5],
            'contextual_cards': contextual,
            'card_count': len(interpretations)
        }

    def get_thematic_cards(self, theme: str, top_k: int = 5) -> List[Dict]:
        """
        특정 테마와 관련된 카드들 찾기

        Args:
            theme: 테마 (예: "love", "career", "money", "health")
            top_k: 반환할 카드 수

        Returns:
            List of relevant cards
        """
        theme_queries = {
            "love": "love romance relationship heart connection partnership soulmate",
            "career": "career work success ambition leadership achievement professional",
            "money": "money wealth abundance prosperity financial investment income",
            "health": "health healing vitality energy balance wellness strength",
            "spiritual": "spiritual wisdom enlightenment inner truth intuition divine",
            "decision": "choice decision crossroads options path direction future",
            "change": "change transformation transition new beginning ending cycle",
            "challenge": "obstacle challenge difficulty struggle overcome adversity trial",
        }

        query = theme_queries.get(theme.lower(), theme)
        return self.search(query, top_k=top_k)

    def get_status(self) -> Dict[str, Any]:
        """시스템 상태 정보 반환"""
        return {
            'total_cards': len(self.cards),
            'total_interpretations': len(self.card_texts),
            'embeddings_loaded': self._embeddings is not None,
            'embeddings_shape': list(self._embeddings.shape) if self._embeddings is not None else None,
            'model_loaded': self._model is not None,
            'cache_exists': self._cache_path and os.path.exists(self._cache_path),
            'cache_valid': self.is_cache_valid(),
            'data_hash': self._data_hash[:8] if self._data_hash else None,
            'is_ready': self.is_ready,
        }

    def health_check(self) -> Tuple[bool, str]:
        """
        시스템 건강 상태 확인

        Returns:
            (is_healthy, message)
        """
        issues = []

        if len(self.cards) == 0:
            issues.append("No cards loaded")

        if len(self.card_texts) == 0:
            issues.append("No card texts loaded")

        if self._embeddings is None:
            issues.append("Embeddings not generated")

        if issues:
            return False, f"Unhealthy: {', '.join(issues)}"

        return True, f"Healthy: {len(self.cards)} cards, {len(self.card_texts)} interpretations"


# ===============================================================
# TAROT INTERPRETATION RULES
# ===============================================================
SUIT_MEANINGS = {
    'wands': {
        'element': 'Fire',
        'themes': ['passion', 'creativity', 'action', 'inspiration', 'ambition'],
        'korean': '완드/지팡이',
        'description': 'Represents passion, creativity, and spiritual energy. Associated with action, ambition, and inspired pursuits.'
    },
    'cups': {
        'element': 'Water',
        'themes': ['emotions', 'relationships', 'intuition', 'love', 'creativity'],
        'korean': '컵',
        'description': 'Represents emotions, relationships, and the subconscious. Associated with love, intuition, and creative expression.'
    },
    'swords': {
        'element': 'Air',
        'themes': ['intellect', 'conflict', 'truth', 'decisions', 'communication'],
        'korean': '검/소드',
        'description': 'Represents the mind, intellect, and truth. Associated with conflict, decisions, and clear communication.'
    },
    'pentacles': {
        'element': 'Earth',
        'themes': ['material', 'money', 'health', 'work', 'security'],
        'korean': '펜타클/동전',
        'description': 'Represents the material world, finances, and physical well-being. Associated with work, money, and practical matters.'
    },
    'major': {
        'element': 'Spirit',
        'themes': ['destiny', 'life lessons', 'karma', 'spiritual growth', 'archetypes'],
        'korean': '메이저 아르카나',
        'description': 'Major life events and spiritual lessons. Represents significant karmic influences and life-changing moments.'
    }
}

POSITION_MEANINGS = {
    'past': 'Events and influences from the past that led to the current situation',
    'present': 'The current situation, energies at play right now',
    'future': 'Potential outcomes based on the current path',
    'advice': 'Guidance on how to approach the situation',
    'outcome': 'The likely result if current trends continue',
    'obstacle': 'Challenges or blocks that need to be addressed',
    'hopes_fears': 'Your deepest hopes or fears regarding the situation',
    'external': 'External influences affecting the situation',
    'internal': 'Your inner feelings and subconscious influences'
}


# Singleton instance
_tarot_rag = None


def get_tarot_rag() -> TarotRAG:
    """Get or create singleton TarotRAG instance"""
    global _tarot_rag
    if _tarot_rag is None:
        _tarot_rag = TarotRAG()
    return _tarot_rag


def get_suit_meaning(suit: str) -> Dict:
    """Get meaning for a tarot suit"""
    return SUIT_MEANINGS.get(suit.lower(), SUIT_MEANINGS['major'])


def get_position_meaning(position: str) -> str:
    """Get meaning for a spread position"""
    return POSITION_MEANINGS.get(position.lower(), position)


# Test
if __name__ == "__main__":
    import sys
    # Handle Windows console encoding
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    rag = get_tarot_rag()

    # Test basic search
    print("\n" + "=" * 70)
    print("[BASIC SEMANTIC SEARCH TEST]")
    print("=" * 70)

    test_queries = [
        "I want to start a new relationship",
        "Will I get promoted at work?",
        "What does my career future look like?"
    ]

    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 50)
        results = rag.search(query, top_k=3)
        for i, r in enumerate(results):
            print(f"  [{i+1}] {r['name']} ({r['orientation']}) - similarity: {r['similarity']:.3f}")
            print(f"      keywords: {', '.join(r['keywords'][:4])}")
