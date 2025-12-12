# backend_ai/app/tarot_advanced_embeddings.py
"""
Tarot Advanced Rules Embedding System
=====================================
18개 고급 규칙 JSON 파일의 임베딩을 생성하고 시맨틱 검색을 지원합니다.

카테고리:
- combinations: 카드 조합 의미
- timing: 타이밍/시기 예측
- court_profiles: 궁정 카드 성격
- elements: 원소 상호작용
- narrative: 스토리텔링 템플릿
- numerology: 수비학
- colors: 색상 상징
- meditation: 명상/확언
- lucky: 행운 아이템
- followup: 후속 질문
- reversed: 역방향 해석
- chakra: 차크라 연결
- astrology: 점성술 대응
- yesno: 예/아니오 로직
- soulmate: 소울메이트 지표
- shadow: 그림자 작업
- moon: 달의 위상
- animals: 영적 동물
"""

import os
import json
import torch
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer, util


class TarotAdvancedEmbeddings:
    """고급 타로 규칙의 임베딩 및 시맨틱 검색"""

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "advanced")

        self.rules_dir = rules_dir
        self.embed_cache_path = os.path.join(rules_dir, "advanced_embeds.pt")

        # Data storage
        self.entries = []  # [{category, subcategory, text, data, ...}]
        self.embeddings = None

        # Lazy model
        self._model = None

        # Load and embed
        self._load_all_rules()
        self._prepare_embeddings()

    @property
    def model(self):
        """Lazy load SentenceTransformer model"""
        if self._model is None:
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
            torch.set_default_device("cpu")
            print("[TarotAdvancedEmbeddings] Loading SentenceTransformer model...")
            self._model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                device="cpu"
            )
            print("[TarotAdvancedEmbeddings] Model loaded successfully")
        return self._model

    def _load_all_rules(self):
        """Load all advanced rule JSON files and extract searchable entries"""
        if not os.path.exists(self.rules_dir):
            print(f"[TarotAdvancedEmbeddings] Rules directory not found: {self.rules_dir}")
            return

        # Define file mappings and extraction functions
        file_handlers = {
            'card_combinations.json': self._extract_combinations,
            'timing_rules.json': self._extract_timing,
            'court_card_profiles.json': self._extract_court_profiles,
            'elemental_dignities.json': self._extract_elements,
            'narrative_templates.json': self._extract_narratives,
            'numerology.json': self._extract_numerology,
            'color_symbolism.json': self._extract_colors,
            'meditation_affirmations.json': self._extract_meditations,
            'lucky_items.json': self._extract_lucky,
            'followup_questions.json': self._extract_followups,
            'reversed_special.json': self._extract_reversed,
            'chakra_connections.json': self._extract_chakras,
            'astrological_correspondences.json': self._extract_astrology,
            'yes_no_logic.json': self._extract_yesno,
            'soulmate_indicators.json': self._extract_soulmate,
            'shadow_work_prompts.json': self._extract_shadow,
            'moon_phase_rules.json': self._extract_moon,
            'spirit_animals.json': self._extract_animals
        }

        for filename, handler in file_handlers.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        data = json.load(f)
                        handler(data, filename)
                        print(f"[TarotAdvancedEmbeddings] Extracted from {filename}")
                except Exception as e:
                    print(f"[TarotAdvancedEmbeddings] Failed to load {filename}: {e}")

        print(f"[TarotAdvancedEmbeddings] Total entries: {len(self.entries)}")

    def _add_entry(self, category: str, subcategory: str, text: str, data: dict):
        """Add a searchable entry"""
        if text and text.strip():
            self.entries.append({
                'category': category,
                'subcategory': subcategory,
                'text': text.strip(),
                'data': data
            })

    def _extract_combinations(self, data: dict, filename: str):
        """Extract card combination entries"""
        # Powerful pairs
        pairs = data.get('powerful_pairs', {})
        for category, combos in pairs.items():
            for combo in combos:
                cards = combo.get('cards', [])
                meaning = combo.get('meaning', '') or combo.get('korean', '')
                text = f"카드 조합 {' + '.join(cards)}: {meaning}"
                self._add_entry('combinations', category, text, combo)

        # Triple combinations
        triples = data.get('triple_combinations', {})
        for name, combo in triples.items():
            cards = combo.get('cards', [])
            meaning = combo.get('meaning', '') or combo.get('korean', '')
            text = f"세 카드 조합 {name} ({' + '.join(cards)}): {meaning}"
            self._add_entry('combinations', 'triple', text, combo)

    def _extract_timing(self, data: dict, filename: str):
        """Extract timing entries"""
        # Seasons
        seasons = data.get('seasons', {})
        for season, info in seasons.items():
            text = f"계절 타이밍 {info.get('korean', season)}: {info.get('meaning', '')}"
            self._add_entry('timing', 'season', text, info)

        # Card timing meanings
        card_timing = data.get('card_timing_meanings', {})
        for timing_type, info in card_timing.items():
            cards = info.get('cards', [])
            text = f"타이밍 {info.get('korean', '')}: {', '.join(cards)} - {info.get('timeframe', '')}"
            self._add_entry('timing', 'card', text, info)

    def _extract_court_profiles(self, data: dict, filename: str):
        """Extract court card profile entries"""
        for rank in ['pages', 'knights', 'queens', 'kings']:
            rank_data = data.get(rank, {})
            cards = rank_data.get('cards', {})
            for card_name, profile in cards.items():
                personality = profile.get('personality', {})
                text = f"궁정카드 {card_name}: {personality.get('description', '')} 강점: {', '.join(personality.get('strengths', []))}"
                self._add_entry('court_profiles', rank, text, profile)

    def _extract_elements(self, data: dict, filename: str):
        """Extract elemental dignity entries"""
        interactions = data.get('element_interactions', {})
        for interaction_type, info in interactions.items():
            text = f"원소 상호작용 {info.get('korean', '')}: {info.get('description', '')} - {info.get('advice', '')}"
            self._add_entry('elements', interaction_type, text, info)

    def _extract_narratives(self, data: dict, filename: str):
        """Extract narrative templates"""
        for style_type in ['opening_styles', 'closing_styles']:
            styles = data.get(style_type, {})
            for style, info in styles.items():
                text = f"내러티브 {style}: {info.get('description', '')} 예시: {', '.join(info.get('templates', [])[:2])}"
                self._add_entry('narrative', style_type, text, info)

    def _extract_numerology(self, data: dict, filename: str):
        """Extract numerology entries"""
        numbers = data.get('number_meanings', {})
        for num, info in numbers.items():
            text = f"수비학 숫자 {num} ({info.get('korean', '')}): {info.get('meaning', '')} 타로: {info.get('tarot_connection', '')}"
            self._add_entry('numerology', 'number', text, info)

    def _extract_colors(self, data: dict, filename: str):
        """Extract color symbolism entries"""
        for category in ['primary_colors', 'secondary_colors', 'neutral_colors']:
            colors = data.get(category, {})
            for color, info in colors.items():
                text = f"색상 {info.get('korean', color)}: {info.get('meaning', '')} 감정: {info.get('emotional', '')}"
                self._add_entry('colors', category, text, info)

    def _extract_meditations(self, data: dict, filename: str):
        """Extract meditation entries"""
        meditations = data.get('major_arcana_meditations', {})
        for card, info in meditations.items():
            text = f"명상 {card}: {info.get('theme', '')} 확언: {info.get('affirmation', '')}"
            self._add_entry('meditation', 'major_arcana', text, info)

    def _extract_lucky(self, data: dict, filename: str):
        """Extract lucky items entries"""
        items = data.get('card_lucky_items', {})
        for card, info in items.items():
            text = f"행운 {card}: 색 {info.get('lucky_color', '')} 숫자 {info.get('lucky_number', '')} 크리스탈 {info.get('crystal', '')}"
            self._add_entry('lucky', 'items', text, info)

    def _extract_followups(self, data: dict, filename: str):
        """Extract follow-up question entries"""
        by_theme = data.get('by_theme', {})
        for theme, readings in by_theme.items():
            for reading_type, questions in readings.items():
                if isinstance(questions, list):
                    text = f"후속질문 {theme} {reading_type}: {', '.join(questions[:3])}"
                    self._add_entry('followup', theme, text, {'questions': questions})

    def _extract_reversed(self, data: dict, filename: str):
        """Extract reversed card entries"""
        majors = data.get('reversed_major_arcana_special', {})
        for card, info in majors.items():
            text = f"역방향 {card}: {info.get('special_meaning', '')} 조언: {info.get('advice', '')}"
            self._add_entry('reversed', 'major_arcana', text, info)

        # Interpretation styles
        styles = data.get('reversed_interpretation_styles', {})
        for style, info in styles.items():
            text = f"역방향 해석 {style}: {info.get('meaning', '')} 예시: {info.get('example', '')}"
            self._add_entry('reversed', 'style', text, info)

    def _extract_chakras(self, data: dict, filename: str):
        """Extract chakra entries"""
        chakras = data.get('chakras', {})
        for chakra, info in chakras.items():
            cards = info.get('cards', [])
            text = f"차크라 {info.get('korean', chakra)}: {info.get('theme', '')} 균형: {info.get('balanced', '')} 관련카드: {', '.join(cards)}"
            self._add_entry('chakra', chakra, text, info)

    def _extract_astrology(self, data: dict, filename: str):
        """Extract astrology entries"""
        major = data.get('major_arcana_astrology', {})
        for card, info in major.items():
            planet = info.get('korean_planet') or info.get('korean_zodiac', '')
            text = f"점성술 {card}: {planet} - {info.get('meaning', '')}"
            self._add_entry('astrology', 'major_arcana', text, info)

    def _extract_yesno(self, data: dict, filename: str):
        """Extract yes/no logic entries"""
        values = data.get('card_values', {})
        for category, info in values.items():
            cards = info.get('cards', [])
            text = f"예/아니오 {category} ({info.get('meaning', '')}): {', '.join(cards)}"
            self._add_entry('yesno', category, text, info)

        # Special combinations
        combos = data.get('special_combinations', {})
        for combo_type, combo_list in combos.items():
            for combo in combo_list:
                text = f"예/아니오 조합 {combo_type}: {' + '.join(combo.get('combo', []))} - {combo.get('meaning', '')}"
                self._add_entry('yesno', 'combo', text, combo)

    def _extract_soulmate(self, data: dict, filename: str):
        """Extract soulmate entries"""
        # Connection types
        types = data.get('connection_types', {})
        for conn_type, info in types.items():
            text = f"인연유형 {info.get('korean', conn_type)}: {info.get('description', '')} 특징: {', '.join(info.get('characteristics', []))}"
            self._add_entry('soulmate', 'type', text, info)

        # Card indicators
        indicators = data.get('soulmate_card_indicators', {})
        for indicator_type, info in indicators.items():
            cards = info.get('cards', [])
            text = f"소울메이트 지표 {indicator_type}: {', '.join(cards)} - {info.get('meaning', '')}"
            self._add_entry('soulmate', 'indicator', text, info)

        # Love combinations
        combos = data.get('card_combinations_for_love', {})
        for combo_type, combo_list in combos.items():
            for combo in combo_list:
                text = f"연애조합 {combo_type}: {' + '.join(combo.get('combo', []))} - {combo.get('korean', combo.get('meaning', ''))}"
                self._add_entry('soulmate', 'combo', text, combo)

    def _extract_shadow(self, data: dict, filename: str):
        """Extract shadow work entries"""
        shadows = data.get('major_arcana_shadows', {})
        for card, info in shadows.items():
            text = f"그림자작업 {card}: 그림자 {info.get('shadow', '')} 빛 {info.get('light', '')} 질문: {info.get('journal_prompt', '')}"
            self._add_entry('shadow', 'major_arcana', text, info)

    def _extract_moon(self, data: dict, filename: str):
        """Extract moon phase entries"""
        phases = data.get('moon_phases', {})
        for phase, info in phases.items():
            if isinstance(info, dict):
                text = f"달의위상 {info.get('korean', phase)}: {info.get('energy', '')} 좋은질문: {', '.join(info.get('best_questions', [])[:2])}"
                self._add_entry('moon', 'phase', text, info)

        # Moon in zodiac
        zodiac = data.get('moon_in_zodiac', {})
        for sign, info in zodiac.items():
            if isinstance(info, dict):
                text = f"달의별자리 {info.get('korean', sign)}: {info.get('energy', '')} 적합: {info.get('best_for', '')}"
                self._add_entry('moon', 'zodiac', text, info)

    def _extract_animals(self, data: dict, filename: str):
        """Extract spirit animal entries"""
        animals = data.get('major_arcana_animals', {})
        for card, info in animals.items():
            text = f"영적동물 {card}: {info.get('korean_animal', '')} - {info.get('meaning', '')} 메시지: {info.get('message', '')}"
            self._add_entry('animals', 'major_arcana', text, info)

    def _prepare_embeddings(self):
        """Generate or load embeddings"""
        if not self.entries:
            print("[TarotAdvancedEmbeddings] No entries to embed")
            return

        # Check cache
        if os.path.exists(self.embed_cache_path):
            try:
                cache = torch.load(self.embed_cache_path, map_location='cpu', weights_only=True)
                if cache.get('entry_count') == len(self.entries):
                    self.embeddings = cache['embeddings']
                    print(f"[TarotAdvancedEmbeddings] Loaded cached embeddings ({len(self.entries)} entries)")
                    return
            except Exception as e:
                print(f"[TarotAdvancedEmbeddings] Cache load failed: {e}")

        # Generate new embeddings
        print(f"[TarotAdvancedEmbeddings] Generating embeddings for {len(self.entries)} entries...")
        texts = [e['text'] for e in self.entries]
        self.embeddings = self.model.encode(texts, convert_to_tensor=True)

        # Save cache
        try:
            torch.save({
                'entry_count': len(self.entries),
                'embeddings': self.embeddings
            }, self.embed_cache_path)
            print(f"[TarotAdvancedEmbeddings] Saved embeddings to cache")
        except Exception as e:
            print(f"[TarotAdvancedEmbeddings] Failed to save cache: {e}")

    def search(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """
        Search for relevant entries by semantic similarity

        Args:
            query: Search query
            top_k: Number of results to return
            category: Optional filter by category

        Returns:
            List of matching entries with scores
        """
        if self.embeddings is None or len(self.entries) == 0:
            return []

        # Encode query
        query_embed = self.model.encode(query, convert_to_tensor=True)

        # Calculate similarities
        scores = util.cos_sim(query_embed, self.embeddings)[0]

        # Filter by category if specified
        if category:
            mask = torch.tensor([
                1.0 if e['category'] == category else 0.0
                for e in self.entries
            ])
            scores = scores * mask

        # Get top results
        top_results = torch.topk(scores, min(top_k, len(self.entries)))

        results = []
        for score, idx in zip(top_results.values.tolist(), top_results.indices.tolist()):
            if score > 0.1:  # Threshold
                entry = self.entries[idx].copy()
                entry['score'] = score
                results.append(entry)

        return results

    def search_by_card(self, card_name: str, top_k: int = 10) -> List[Dict]:
        """Search for all entries related to a specific card"""
        results = []
        for entry in self.entries:
            text_lower = entry['text'].lower()
            card_lower = card_name.lower()
            if card_lower in text_lower or card_name in entry.get('data', {}).get('cards', []):
                results.append(entry)

        return results[:top_k]

    def get_by_category(self, category: str) -> List[Dict]:
        """Get all entries in a category"""
        return [e for e in self.entries if e['category'] == category]


# Singleton instance
_tarot_advanced_embeddings = None


def get_tarot_advanced_embeddings() -> TarotAdvancedEmbeddings:
    """Get or create singleton instance"""
    global _tarot_advanced_embeddings
    if _tarot_advanced_embeddings is None:
        _tarot_advanced_embeddings = TarotAdvancedEmbeddings()
    return _tarot_advanced_embeddings


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT ADVANCED EMBEDDINGS TEST]")
    print("=" * 70)

    embedder = get_tarot_advanced_embeddings()

    # Test search
    print("\n[Search: 연애 타이밍]")
    results = embedder.search("연애 언제 시작될까 타이밍", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    print("\n[Search: 소울메이트]")
    results = embedder.search("소울메이트 트윈플레임 인연", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    print("\n[Search: 차크라 치유]")
    results = embedder.search("에너지 차크라 치유 명상", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}... (score: {r['score']:.3f})")

    print("\n[Search by card: The Lovers]")
    results = embedder.search_by_card("The Lovers", top_k=5)
    for r in results:
        print(f"  [{r['category']}] {r['text'][:60]}...")

    print("\n[Category stats]")
    categories = {}
    for e in embedder.entries:
        cat = e['category']
        categories[cat] = categories.get(cat, 0) + 1
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count} entries")

    print("\n" + "=" * 70)
    print(f"[TOTAL: {len(embedder.entries)} searchable entries]")
    print("=" * 70)
