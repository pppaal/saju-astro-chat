# backend_ai/app/tarot_rag.py
"""
Tarot Card Interpretation RAG System (Premium)
==============================================
Uses SentenceTransformer for semantic similarity matching with tarot cards.
- 타로 카드 전용 임베딩 시스템
- 78장 라이더-웨이트 타로 덱 (메이저 아르카나 + 마이너 아르카나)
- 9개 테마별 심층 해석 (life_path, love, career, wealth, health, family, spiritual, daily, monthly)
"""

import os
import json
import torch
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer, util


# Available themes for premium interpretations
AVAILABLE_THEMES = [
    "life_path", "love", "career", "wealth",
    "health", "family", "spiritual", "daily", "monthly"
]


class TarotRAG:
    """
    임베딩 기반 타로 해석 검색 엔진 (Premium)
    - 질문/상황을 벡터로 변환하여 가장 관련 있는 카드 의미 검색
    - 정방향/역방향 해석 지원
    - 9개 테마별 심층 해석 (life_path, love, career, wealth, health, family, spiritual, daily, monthly)
    """

    def __init__(self, rules_dir: str = None):
        # 경로 설정
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot")

        self.rules_dir = rules_dir
        self.themes_dir = os.path.join(rules_dir, "themes")
        self.cards = {}  # card_id -> card_data
        self.card_texts = []  # [{card_id, text, orientation, keywords, meaning, ...}]
        self.card_embeds = None
        self.embed_cache_path = os.path.join(rules_dir, "tarot_embeds.pt")

        # Premium theme data
        self.themes = {}  # theme_name -> theme_data

        # 모델 초기화 (lazy load)
        self._model = None

        # 로드
        self._load_cards()
        self._load_themes()
        self._prepare_embeddings()

    @property
    def model(self):
        """Lazy load SentenceTransformer model"""
        if self._model is None:
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
            torch.set_default_device("cpu")
            print("[TarotRAG] Loading SentenceTransformer model...")
            self._model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                device="cpu"
            )
            print("[TarotRAG] Model loaded successfully")
        return self._model

    def _load_cards(self):
        """Load all tarot card JSON files"""
        if not os.path.exists(self.rules_dir):
            print(f"[TarotRAG] Rules directory not found: {self.rules_dir}")
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

                        self.card_texts.append({
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'upright',
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': advice,
                            'text': combined,
                            'suit': card.get('suit', 'major'),
                            'arcana': card.get('arcana', 'major')
                        })

                    # Extract reversed meaning
                    reversed_data = card.get('reversed', {})
                    if reversed_data:
                        keywords = reversed_data.get('keywords', [])
                        meaning = reversed_data.get('meaning', '')
                        advice = reversed_data.get('advice', '')
                        combined = f"{card_name} reversed: {' '.join(keywords)} {meaning} {advice}".strip()

                        self.card_texts.append({
                            'card_id': card_id,
                            'name': card_name,
                            'orientation': 'reversed',
                            'keywords': keywords,
                            'meaning': meaning,
                            'advice': advice,
                            'text': combined,
                            'suit': card.get('suit', 'major'),
                            'arcana': card.get('arcana', 'major')
                        })

            except Exception as e:
                print(f"[TarotRAG] Failed to load {filename}: {e}")

        print(f"[TarotRAG] Loaded {len(self.cards)} cards, {len(self.card_texts)} interpretations")

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
                        self.card_texts.append({
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
                        })

            # Extract reversed meanings
            reversed_data = card.get('reversed', {})
            if reversed_data:
                for area in ['general', 'love', 'career', 'finance', 'health']:
                    meaning = reversed_data.get(area, '')
                    if meaning:
                        keywords = card.get('keywords', [])
                        combined = f"{card_name} reversed {area}: {meaning}".strip()
                        self.card_texts.append({
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
                        })

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
                    self.card_texts.append({
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
                    })

            # Extract reversed
            reversed_data = card.get('reversed', {})
            if reversed_data:
                general = reversed_data.get('general', '')
                if general:
                    combined = f"{card_name} reversed: {general}".strip()
                    self.card_texts.append({
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
                    })

        # Store position meanings and combinations
        self.position_meanings = data.get('position_meanings', {})
        self.card_combinations = data.get('combinations', [])

        print(f"[TarotRAG] Loaded complete corpus: {len(data.get('major_arcana', []))} major + {len(data.get('minor_arcana', []))} minor")

    def _load_themes(self):
        """Load all premium theme JSON files from themes/ directory"""
        if not os.path.exists(self.themes_dir):
            print(f"[TarotRAG] Themes directory not found: {self.themes_dir}")
            return

        for theme_name in AVAILABLE_THEMES:
            theme_path = os.path.join(self.themes_dir, f"{theme_name}.json")
            if not os.path.exists(theme_path):
                print(f"[TarotRAG] Theme file not found: {theme_name}.json")
                continue

            try:
                with open(theme_path, encoding='utf-8') as f:
                    theme_data = json.load(f)
                    self.themes[theme_name] = theme_data
            except Exception as e:
                print(f"[TarotRAG] Failed to load theme {theme_name}: {e}")

        print(f"[TarotRAG] Loaded {len(self.themes)} premium themes: {list(self.themes.keys())}")

    def _prepare_embeddings(self):
        """Prepare or load cached embeddings"""
        if not self.card_texts:
            print("[TarotRAG] No card texts to embed")
            return

        # Check cache
        if os.path.exists(self.embed_cache_path):
            try:
                cache_data = torch.load(self.embed_cache_path, map_location="cpu")
                if cache_data.get('count') == len(self.card_texts):
                    self.card_embeds = cache_data['embeds']
                    print(f"[TarotRAG] Loaded cached embeddings: {self.card_embeds.shape}")
                    return
            except Exception as e:
                print(f"[TarotRAG] Cache load failed: {e}")

        # Generate new embeddings
        print(f"[TarotRAG] Generating embeddings for {len(self.card_texts)} card interpretations...")
        texts = [r['text'] for r in self.card_texts]
        self.card_embeds = self.model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=True,
            batch_size=32
        )

        # Save cache
        try:
            torch.save({
                'embeds': self.card_embeds,
                'count': len(self.card_texts)
            }, self.embed_cache_path)
            print(f"[TarotRAG] Saved embeddings cache: {self.embed_cache_path}")
        except Exception as e:
            print(f"[TarotRAG] Failed to save cache: {e}")

    def search(self, query: str, top_k: int = 10, orientation: str = None) -> List[Dict]:
        """
        질문/상황으로 가장 관련 있는 타로 카드 해석 검색

        Args:
            query: 사용자의 질문 또는 상황 설명
            top_k: 반환할 최대 결과 수
            orientation: 'upright', 'reversed', or None (both)

        Returns:
            List of matched card interpretations with similarity scores
        """
        if self.card_embeds is None or len(self.card_texts) == 0:
            return []

        # Encode query
        query_embed = self.model.encode(
            query,
            convert_to_tensor=True,
            normalize_embeddings=True
        )

        # Calculate similarity
        scores = util.cos_sim(query_embed, self.card_embeds)[0]

        # Get top-k results
        top_results = torch.topk(scores, k=min(top_k * 2, len(self.card_texts)))

        results = []
        for idx, score in zip(top_results.indices, top_results.values):
            card_data = self.card_texts[int(idx)].copy()

            # Filter by orientation if specified
            if orientation and card_data['orientation'] != orientation:
                continue

            card_data['similarity'] = float(score)
            results.append(card_data)

            if len(results) >= top_k:
                break

        return results

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

    def get_theme_interpretation(self, card_name: str, theme: str) -> Optional[Dict]:
        """
        특정 카드의 테마별 심층 해석 가져오기 (Premium)

        Args:
            card_name: 카드 이름 (예: "The Fool", "Ace of Wands")
            theme: 테마 (life_path, love, career, wealth, health, family, spiritual, daily, monthly)

        Returns:
            Theme-specific interpretation dict or None
        """
        if theme not in self.themes:
            return None

        theme_data = self.themes[theme]

        # Try different key patterns based on theme structure
        # Major Arcana keys vary by theme
        key_patterns = [
            "major_arcana_deep",      # life_path, spiritual
            "major_arcana_love",      # love
            "major_arcana_career",    # career
            "major_arcana_wealth",    # wealth
            "major_arcana_health",    # health
            "major_arcana_family",    # family
            "major_arcana_daily",     # daily
            "major_arcana_monthly",   # monthly
        ]

        for key in key_patterns:
            if key in theme_data:
                card_data = theme_data[key].get(card_name)
                if card_data:
                    return {
                        'card_name': card_name,
                        'theme': theme,
                        'theme_title': theme_data.get('_meta', {}).get('title', theme),
                        'interpretation': card_data
                    }

        return None

    def get_premium_reading(self, drawn_cards: List[Dict], theme: str, question: str = "") -> Dict:
        """
        프리미엄 테마 기반 타로 리딩 (Premium)

        Args:
            drawn_cards: List of {name, isReversed} dicts
            theme: 선택한 테마 (9개 중 하나)
            question: 사용자의 질문 (선택사항)

        Returns:
            Premium interpretation with theme-specific deep meanings
        """
        if theme not in AVAILABLE_THEMES:
            theme = "life_path"  # default

        base_context = self.get_reading_context(drawn_cards, question)

        # Add premium theme interpretations
        premium_interpretations = []
        for card in base_context['card_interpretations']:
            card_name = card['name']
            theme_interp = self.get_theme_interpretation(card_name, theme)

            premium_card = card.copy()
            if theme_interp:
                premium_card['theme_interpretation'] = theme_interp['interpretation']
            premium_interpretations.append(premium_card)

        # Get theme metadata
        theme_meta = {}
        if theme in self.themes:
            theme_meta = self.themes[theme].get('_meta', {})

        return {
            'theme': theme,
            'theme_title': theme_meta.get('title', theme),
            'theme_description': theme_meta.get('description', ''),
            'card_interpretations': premium_interpretations,
            'themes': base_context['themes'],
            'advice': base_context['advice'],
            'contextual_cards': base_context['contextual_cards'],
            'card_count': base_context['card_count'],
            'is_premium': True
        }

    def get_available_themes(self) -> List[Dict]:
        """
        사용 가능한 테마 목록 반환

        Returns:
            List of theme info dicts
        """
        theme_info = []
        for theme_name in AVAILABLE_THEMES:
            if theme_name in self.themes:
                meta = self.themes[theme_name].get('_meta', {})
                theme_info.append({
                    'id': theme_name,
                    'title': meta.get('title', theme_name),
                    'description': meta.get('description', '')
                })
            else:
                theme_info.append({
                    'id': theme_name,
                    'title': theme_name,
                    'description': ''
                })
        return theme_info


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

    # Test available themes
    print("\n" + "=" * 70)
    print("[AVAILABLE PREMIUM THEMES]")
    print("=" * 70)

    themes = rag.get_available_themes()
    for t in themes:
        print(f"  - {t['id']}: {t['title']}")
        if t['description']:
            print(f"    > {t['description'][:60]}...")

    # Test theme interpretation
    print("\n" + "=" * 70)
    print("[PREMIUM THEME INTERPRETATION TEST]")
    print("=" * 70)

    test_cards = ["The Fool", "The Lovers", "The World"]
    test_themes = ["love", "career", "spiritual"]

    for card in test_cards:
        print(f"\n[Card] {card}")
        for theme in test_themes:
            interp = rag.get_theme_interpretation(card, theme)
            if interp:
                data = interp['interpretation']
                print(f"  [{theme}]")
                # Print first available key from interpretation
                for k, v in list(data.items())[:2]:
                    if isinstance(v, str) and len(v) < 100:
                        print(f"    {k}: {v}")

    # Test premium reading
    print("\n" + "=" * 70)
    print("[PREMIUM READING TEST]")
    print("=" * 70)

    drawn_cards = [
        {"name": "The Fool", "isReversed": False},
        {"name": "The Lovers", "isReversed": True},
        {"name": "The World", "isReversed": False}
    ]

    for theme in ["love", "career", "daily"]:
        print(f"\nTheme: {theme.upper()}")
        print("-" * 50)
        reading = rag.get_premium_reading(drawn_cards, theme, "What does my future hold?")
        print(f"  Theme title: {reading['theme_title']}")
        print(f"  Card count: {reading['card_count']}")
        print(f"  Is premium: {reading['is_premium']}")
        for card in reading['card_interpretations'][:1]:
            print(f"  First card: {card['name']} ({card['orientation']})")
            if 'theme_interpretation' in card:
                ti = card['theme_interpretation']
                first_key = list(ti.keys())[0] if ti else None
                if first_key:
                    val = ti[first_key]
                    if isinstance(val, str):
                        print(f"    {first_key}: {val[:80]}...")
