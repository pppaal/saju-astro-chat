# backend_ai/app/tarot/hybrid_rag.py
"""
Tarot Hybrid RAG System (Premium YouTube-Level)
================================================
Combines:
- Structured tarot card data & spreads (RAG)
- OpenAI GPT for rich narrative interpretation
- Position-based deep readings
- Streaming support for real-time delivery
- Advanced rules: combinations, timing, court cards, elemental dignities
- Enhanced narrative templates for storytelling

유튜브 타로 리더 수준의 심층 해석 시스템
- 테마별 서브토픽 (연애 10개+, 직업 10개+)
- 포지션별 카드 해석
- 카드 조합 의미
- 타이밍 규칙
- 원소 상호작용
- 자연스러운 스토리텔링
- 스트리밍 지원
"""

from typing import List, Dict, Optional, Generator, Any

# Import sub-modules
from .prompts import TarotPromptBuilder, SYSTEM_PROMPT
from .llm import TarotLLMClient, get_tarot_llm_client, stream_tarot_response
from .llm.streaming import generate_non_streaming_response
from .context import ReadingContextBuilder, PremiumContextBuilder
from .rules_loader import AdvancedRulesLoader, get_rules_loader
from .spread_loader import SpreadLoader, get_spread_loader
from .engine import TarotPatternEngine
from .premium import TarotPatternEnginePremium, get_premium_engine, get_pattern_engine

try:
    from backend_ai.app.tarot_rag import get_tarot_rag, TarotRAG
    from backend_ai.app.tarot_advanced_embeddings import get_tarot_advanced_embeddings
except ImportError:
    from app.tarot_rag import get_tarot_rag, TarotRAG
    from app.tarot_advanced_embeddings import get_tarot_advanced_embeddings


class TarotHybridRAG:
    """
    Premium Tarot Reading System
    - Combines structured data with OpenAI GPT
    - Supports streaming for real-time delivery
    - YouTube-level depth and narrative
    - Advanced rules: combinations, timing, court cards, elemental dignities
    """

    def __init__(self, api_key: str = None):
        """
        Initialize TarotHybridRAG with all components

        Args:
            api_key: OpenAI API key (optional, uses env var if not provided)
        """
        # Initialize LLM client
        self.llm_client = get_tarot_llm_client(api_key)

        # Initialize components
        self.tarot_rag = get_tarot_rag()
        self.spread_loader = get_spread_loader()
        self.advanced_rules = get_rules_loader()
        self.advanced_embeddings = get_tarot_advanced_embeddings()
        self.pattern_engine = get_pattern_engine()
        self.premium_engine = get_premium_engine()

        # Initialize context builders
        self._init_context_builders()

        # Keep prompt builder for backwards compatibility
        self.prompt_builder = TarotPromptBuilder()

        print("[TarotHybridRAG] Initialized with all components")

    def _init_context_builders(self):
        """Initialize context builder components"""
        self.reading_context_builder = ReadingContextBuilder(
            tarot_rag=self.tarot_rag,
            spread_loader=self.spread_loader,
            advanced_rules=self.advanced_rules,
            advanced_embeddings=self.advanced_embeddings,
            pattern_engine=self.pattern_engine
        )
        self.premium_context_builder = PremiumContextBuilder(
            reading_context_builder=self.reading_context_builder,
            premium_engine=self.premium_engine
        )

    @property
    def client(self):
        """Backwards compatibility: return OpenAI client"""
        return self.llm_client.client if self.llm_client else None

    @property
    def model_name(self) -> str:
        """Get current model name"""
        return self.llm_client.model_name if self.llm_client else "gpt-4o"

    # =========================================================================
    # SEARCH & LOOKUP METHODS (delegate to loaders)
    # =========================================================================

    def search_advanced_rules(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """Semantic search across all advanced tarot rules"""
        return self.advanced_embeddings.search(query, top_k=top_k, category=category)

    def get_card_insights(self, card_name: str) -> Dict:
        """Get comprehensive insights for a specific card"""
        insights = {
            'astrology': self.advanced_rules.get_card_astrology(card_name),
            'chakras': self.advanced_rules.get_card_chakras(card_name),
            'spirit_animal': self.advanced_rules.get_spirit_animal(card_name),
            'shadow_work': self.advanced_rules.get_shadow_work_prompt(card_name),
            'lucky_items': self.advanced_rules.get_card_lucky_items(card_name),
            'meditation': self.advanced_rules.get_meditation_for_card(card_name),
            'timing': self.advanced_rules.get_timing_hint(card_name),
            'court_profile': self.advanced_rules.get_court_card_profile(card_name),
            'reversed_special': self.advanced_rules.get_reversed_special_meaning(card_name),
            'deep_meaning': self.advanced_rules.get_card_deep_meaning(card_name),
        }
        related = self.advanced_embeddings.search_by_card(card_name, top_k=5)
        insights['related_entries'] = related
        return {k: v for k, v in insights.items() if v}

    def get_card_deep_meaning(self, card_name: str) -> Optional[Dict]:
        """Get deep psychological/archetypal meaning for a card"""
        return self.advanced_rules.get_card_deep_meaning(card_name)

    def get_all_card_pair_interpretations(self, cards: List) -> List[Dict]:
        """Get interpretations for all card pairs in a reading"""
        if cards and isinstance(cards[0], str):
            cards = [{'name': card_name} for card_name in cards]
        return self.advanced_rules.get_all_card_pair_interpretations(cards)

    def analyze_elemental_balance(self, cards: List) -> Optional[Dict]:
        """Analyze elemental balance of the cards"""
        if cards and isinstance(cards[0], str):
            cards = [{'name': card_name} for card_name in cards]
        return self.advanced_rules.analyze_elemental_balance(cards)

    def get_timing_hint(self, card_name: str) -> Optional[str]:
        """Get timing hint for a card"""
        return self.advanced_rules.get_timing_hint(card_name)

    def get_jungian_archetype(self, card_name: str, is_reversed: bool = False) -> Optional[Dict]:
        """Get Jungian archetype for a card"""
        return self.advanced_rules.get_jungian_archetype(card_name, is_reversed)

    # =========================================================================
    # SPREAD METHODS
    # =========================================================================

    def get_available_themes(self) -> List[str]:
        """Get available themes with spreads"""
        return self.spread_loader.get_available_themes()

    def get_sub_topics(self, theme: str) -> List[Dict]:
        """Get sub-topics for a theme"""
        return self.spread_loader.get_sub_topics(theme)

    def get_spread_info(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get spread information"""
        return self.spread_loader.get_spread(theme, sub_topic)

    # =========================================================================
    # READING GENERATION
    # =========================================================================

    def generate_reading(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = "",
        stream: bool = False
    ) -> Any:
        """
        Generate a complete tarot reading

        Args:
            theme: Theme (love, career, etc.)
            sub_topic: Sub-topic (crush, job_search, etc.)
            drawn_cards: List of {name, isReversed} dicts
            question: Optional user question
            stream: Whether to stream the response

        Returns:
            Generated reading text or stream generator
        """
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if not spread:
            return f"스프레드를 찾을 수 없습니다: {theme}/{sub_topic}"

        prompt = self.prompt_builder.build_reading_prompt(
            spread=spread,
            drawn_cards=drawn_cards,
            question=question,
            tarot_rag=self.tarot_rag,
            advanced_rules=self.advanced_rules
        )

        if not self.llm_client.is_available:
            return "OpenAI API가 설정되지 않았습니다."

        if stream:
            return stream_tarot_response(
                client=self.llm_client,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=prompt
            )
        else:
            return generate_non_streaming_response(
                client=self.llm_client,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=prompt
            )

    def generate_quick_reading(
        self,
        card_name: str,
        is_reversed: bool = False,
        context: str = ""
    ) -> str:
        """Generate quick single card reading"""
        if not self.llm_client.is_available:
            # Fallback to RAG only
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )
            if card_data:
                return f"""
{card_name} {'(역방향)' if is_reversed else '(정방향)'}

키워드: {', '.join(card_data.get('keywords', []))}

의미: {card_data.get('meaning', '')}

조언: {card_data.get('advice', '')}
"""
            return "카드 정보를 찾을 수 없습니다."

        prompt = f"""
단일 카드 리딩:

카드: {card_name} {'(역방향)' if is_reversed else '(정방향)'}
{f'상황: {context}' if context else ''}

이 카드에 대해 간단하지만 통찰력 있는 해석을 제공해주세요.
- 카드의 핵심 메시지
- 현재 상황에 대한 조언
- 행동 제안

3-4문장으로 친근하게 해석해주세요.
"""
        try:
            response = self.llm_client.create_simple_completion(prompt)
            if response:
                return response.choices[0].message.content
            return "응답을 생성할 수 없습니다."
        except Exception as e:
            return f"오류: {str(e)}"

    # =========================================================================
    # CONTEXT BUILDING
    # =========================================================================

    def build_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = ""
    ) -> str:
        """Build RAG context string for LLM prompt"""
        return self.reading_context_builder.build_reading_context(
            theme, sub_topic, drawn_cards, question
        )

    def get_reading_context(self, theme: str, sub_topic: str, drawn_cards: List[Dict]) -> Dict:
        """Get structured context for a reading (useful for frontend)"""
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if not spread:
            return {}

        positions = spread.get('positions', [])
        card_interpretations = []

        for i, card_info in enumerate(drawn_cards):
            if i >= len(positions):
                break

            pos = positions[i]
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)

            card_data = self.tarot_rag.search_for_card(
                card_name, 'reversed' if is_reversed else 'upright'
            )
            court_profile = self.advanced_rules.get_court_card_profile(card_name)
            timing = self.advanced_rules.get_timing_hint(card_name)

            card_interpretations.append({
                'position': i + 1,
                'position_name': pos.get('name', ''),
                'position_meaning': pos.get('meaning', ''),
                'card_name': card_name,
                'is_reversed': is_reversed,
                'keywords': card_data.get('keywords', []) if card_data else [],
                'meaning': card_data.get('meaning', '') if card_data else '',
                'advice': card_data.get('advice', '') if card_data else '',
                'suit': card_data.get('suit', 'major') if card_data else 'major',
                'court_profile': court_profile,
                'timing': timing
            })

        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        return {
            'theme': theme,
            'sub_topic': sub_topic,
            'spread_name': spread.get('spread_name', ''),
            'topic_title': spread.get('korean', spread.get('title', '')),
            'card_count': spread.get('card_count', len(positions)),
            'card_interpretations': card_interpretations,
            'special_combination': combination,
            'elemental_analysis': elemental
        }

    # =========================================================================
    # ANALYSIS METHODS
    # =========================================================================

    def get_advanced_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """Get advanced analysis for cards"""
        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        court_profiles = {}
        timing_hints = {}
        for card in drawn_cards:
            card_name = card.get('name', '')
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                court_profiles[card_name] = profile
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                timing_hints[card_name] = timing

        pattern_analysis = self.pattern_engine.analyze(drawn_cards)

        return {
            'special_combination': combination,
            'elemental_analysis': elemental,
            'court_profiles': court_profiles,
            'timing_hints': timing_hints,
            'pattern_analysis': pattern_analysis,
        }

    def get_pattern_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """Get comprehensive pattern analysis for any number of cards"""
        return self.pattern_engine.analyze(drawn_cards)

    # =========================================================================
    # PREMIUM FEATURES
    # =========================================================================

    def get_premium_analysis(
        self,
        drawn_cards: List[Dict],
        birthdate: str = None,
        theme: str = None,
        moon_phase: str = None,
        include_narrative: bool = True
    ) -> Dict:
        """Get comprehensive premium analysis"""
        return self.premium_engine.analyze_premium(
            cards=drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=include_narrative
        )

    def get_birth_card(self, birthdate: str) -> Dict:
        """Calculate user's tarot birth card"""
        return self.premium_engine.calculate_birth_card(birthdate)

    def get_year_card(self, birthdate: str, target_year: int = None) -> Dict:
        """Calculate user's personal year card"""
        return self.premium_engine.calculate_year_card(birthdate, target_year)

    def get_personalized_reading(self, drawn_cards: List[Dict], birthdate: str) -> Dict:
        """Get personalized reading with birth/year card connections"""
        return self.premium_engine.personalize_reading(drawn_cards, birthdate)

    def get_multi_layer_interpretation(self, card_name: str, is_reversed: bool = False) -> Dict:
        """Get multi-layer interpretation for a single card"""
        return self.premium_engine.get_multi_layer_interpretation(
            card_name, {'is_reversed': is_reversed}
        )

    def get_reading_narrative(self, drawn_cards: List[Dict], theme: str = None) -> Dict:
        """Build narrative arc for the reading"""
        return self.premium_engine.build_narrative_arc(drawn_cards, {'theme': theme})

    def get_card_connections(self, drawn_cards: List[Dict]) -> List[str]:
        """Get narrative connections between consecutive cards"""
        return self.premium_engine.weave_card_connections(drawn_cards)

    def build_premium_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = None,
        birthdate: str = None,
        moon_phase: str = None
    ) -> str:
        """Build enhanced reading context with premium features"""
        return self.premium_context_builder.build_premium_reading_context(
            theme=theme,
            sub_topic=sub_topic,
            drawn_cards=drawn_cards,
            question=question,
            birthdate=birthdate,
            moon_phase=moon_phase
        )


# Singleton
_tarot_hybrid_rag: Optional[TarotHybridRAG] = None


def get_tarot_hybrid_rag() -> TarotHybridRAG:
    """Get or create singleton TarotHybridRAG instance"""
    global _tarot_hybrid_rag
    if _tarot_hybrid_rag is None:
        _tarot_hybrid_rag = TarotHybridRAG()
    return _tarot_hybrid_rag
