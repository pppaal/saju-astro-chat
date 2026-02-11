# backend_ai/app/tarot/context/reading_context.py
"""
Reading Context Builder
=======================
타로 리딩 컨텍스트 조립
"""

from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend_ai.app.tarot_rag import TarotRAG
    from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader
    from backend_ai.app.tarot.spread_loader import SpreadLoader
    from backend_ai.app.tarot_advanced_embeddings import TarotAdvancedEmbeddings
    from backend_ai.app.tarot.engine import TarotPatternEngine


class ReadingContextBuilder:
    """
    Build comprehensive reading context for LLM prompts
    Assembles card meanings, combinations, elements, patterns
    """

    def __init__(
        self,
        tarot_rag: 'TarotRAG',
        spread_loader: 'SpreadLoader',
        advanced_rules: 'AdvancedRulesLoader',
        advanced_embeddings: 'TarotAdvancedEmbeddings',
        pattern_engine: 'TarotPatternEngine'
    ):
        self.tarot_rag = tarot_rag
        self.spread_loader = spread_loader
        self.advanced_rules = advanced_rules
        self.advanced_embeddings = advanced_embeddings
        self.pattern_engine = pattern_engine

    def build_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = ""
    ) -> str:
        """
        Build RAG context string for LLM prompt

        Args:
            theme: Theme (love, career, etc.)
            sub_topic: Sub-topic (crush, job_search, etc.)
            drawn_cards: List of {name, isReversed} dicts
            question: Optional user question

        Returns:
            Formatted string with all relevant card meanings, rules, and insights
        """
        context_parts = []

        # Get spread configuration
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if spread:
            context_parts.append(f"[스프레드: {spread.get('spread_name', '')}]")
            context_parts.append(f"주제: {spread.get('korean', spread.get('title', ''))}")
            positions = spread.get('positions', [])
        else:
            positions = []

        # Card meanings and positions
        context_parts.append("\n## 카드별 해석:")
        context_parts.extend(
            self._build_card_meanings(drawn_cards, positions, theme)
        )

        # Special combinations
        context_parts.extend(
            self._build_combination_context(drawn_cards)
        )

        # Elemental balance
        context_parts.extend(
            self._build_elemental_context(drawn_cards)
        )

        # Jungian archetype analysis
        context_parts.extend(
            self._build_jungian_context(drawn_cards)
        )

        # Pattern engine analysis
        context_parts.extend(
            self._build_pattern_context(drawn_cards)
        )

        # Multi-card rule hints (3+ cards)
        context_parts.extend(
            self._build_multi_card_rule_context(drawn_cards, theme, spread)
        )

        # Card pair interpretations
        context_parts.extend(
            self._build_card_pair_context(drawn_cards, theme)
        )

        # Crisis detection
        if question:
            context_parts.extend(
                self._build_crisis_context(drawn_cards, question)
            )

        # Reversed card details
        context_parts.extend(
            self._build_reversed_context(drawn_cards, theme)
        )

        # Semantic search for additional context
        if question:
            context_parts.extend(
                self._build_semantic_context(question)
            )

        return "\n".join(context_parts)

    def _build_card_meanings(
        self,
        drawn_cards: List[Dict],
        positions: List[Dict],
        theme: str
    ) -> List[str]:
        """Build card meaning context"""
        parts = []

        for i, card_info in enumerate(drawn_cards):
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            orientation = "역방향" if is_reversed else "정방향"

            # Position info
            pos_name = positions[i].get('name', f'위치 {i+1}') if i < len(positions) else f'카드 {i+1}'
            pos_meaning = positions[i].get('meaning', '') if i < len(positions) else ''

            parts.append(f"\n### {pos_name}: {card_name} ({orientation})")
            if pos_meaning:
                parts.append(f"- 포지션 의미: {pos_meaning}")

            # Get card data from RAG
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )
            if card_data:
                keywords = card_data.get('keywords', [])[:5]
                meaning = card_data.get('meaning', '')
                advice = card_data.get('advice', '')
                parts.append(f"- 키워드: {', '.join(keywords)}")
                parts.append(f"- 의미: {meaning}")
                parts.append(f"- 조언: {advice}")

            # Court card profile
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                personality = profile.get('personality', {})
                parts.append(f"- 성격: {personality.get('description', '')}")

            # Timing hint
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                parts.append(f"- 타이밍: {timing}")

            # Advanced insights
            insights = self._get_card_insights(card_name)
            if insights.get('astrology'):
                astro = insights['astrology']
                if astro.get('zodiac'):
                    parts.append(f"- 점성술: {astro.get('korean_zodiac', astro.get('zodiac', ''))}")
            if insights.get('chakras'):
                chakras = insights['chakras']
                if chakras:
                    chakra_names = [c.get('korean', c.get('name', '')) for c in chakras[:2]]
                    parts.append(f"- 차크라: {', '.join(chakra_names)}")

        return parts

    def _get_card_insights(self, card_name: str) -> Dict:
        """Get comprehensive insights for a card"""
        insights = {}
        insights['astrology'] = self.advanced_rules.get_card_astrology(card_name)
        insights['chakras'] = self.advanced_rules.get_card_chakras(card_name)
        return {k: v for k, v in insights.items() if v}

    def _build_combination_context(self, drawn_cards: List[Dict]) -> List[str]:
        """Build special combination context"""
        parts = []
        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)

        if combination:
            parts.append("\n## 특별 카드 조합:")
            parts.append(f"- 조합: {', '.join(combination.get('cards', []))}")
            parts.append(f"- 의미: {combination.get('korean', combination.get('meaning', ''))}")
            if combination.get('advice'):
                parts.append(f"- 조언: {combination.get('advice')}")

        return parts

    def _build_elemental_context(self, drawn_cards: List[Dict]) -> List[str]:
        """Build elemental balance context"""
        parts = []
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        if elemental:
            element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
            counts = elemental.get('element_count', {})
            active_elements = [f"{element_korean.get(e, e)}: {c}" for e, c in counts.items() if c > 0]
            if active_elements:
                parts.append(f"\n## 원소 균형: {', '.join(active_elements)}")
                if elemental.get('dominant_meaning'):
                    parts.append(f"- {elemental.get('dominant_meaning')}")

        return parts

    def _build_jungian_context(self, drawn_cards: List[Dict]) -> List[str]:
        """Build Jungian archetype context"""
        parts = []
        parts.append("\n## 칼융 원형 분석:")

        for card_info in drawn_cards:
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            archetype = self.advanced_rules.get_jungian_archetype(card_name, is_reversed)

            if archetype and archetype.get('primary_archetype'):
                primary = archetype['primary_archetype']
                parts.append(f"\n[{card_name}]")
                parts.append(f"- 원형: {primary.get('korean', '')} ({primary.get('english', '')})")
                if archetype.get('journey_stage'):
                    parts.append(f"- 여정 단계: {archetype['journey_stage']}")
                if archetype.get('korean_insight'):
                    parts.append(f"- 통찰: {archetype['korean_insight']}")
                if is_reversed and archetype.get('shadow_message'):
                    parts.append(f"- 그림자: {archetype['shadow_message']}")

                if is_reversed:
                    shadow_prompt = self.advanced_rules.get_shadow_work_prompt(card_name)
                    if shadow_prompt:
                        parts.append(f"- 그림자 작업: {shadow_prompt.get('shadow', '')}")
                        parts.append(f"- 성찰 질문: {shadow_prompt.get('journal_prompt', '')}")

        # Individuation journey
        individuation = self.advanced_rules.get_individuation_stage(drawn_cards)
        if individuation and individuation.get('stages_present'):
            parts.append("\n## 개성화 여정:")
            for stage in individuation['stages_present'][:2]:
                parts.append(f"- {stage['stage']}: {stage['description']}")
                parts.append(f"  (카드: {', '.join(stage['matching_cards'])})")

        return parts

    def _build_pattern_context(self, drawn_cards: List[Dict]) -> List[str]:
        """Build pattern engine context"""
        parts = []
        pattern = self.pattern_engine.analyze(drawn_cards)

        if not pattern:
            return parts

        parts.append("\n## 패턴 분석:")

        # Number patterns
        if pattern.get('number_analysis', {}).get('repeated'):
            for rep in pattern['number_analysis']['repeated']:
                parts.append(f"- 숫자 {rep['number']} 반복: {rep['korean']}")

        if pattern.get('number_analysis', {}).get('sequences'):
            for seq in pattern['number_analysis']['sequences']:
                parts.append(f"- 숫자 시퀀스 {seq['numbers']}: {seq['meaning']}")

        # Major arcana ratio
        arcana = pattern.get('arcana_analysis', {})
        if arcana.get('significance') in ['highly_karmic', 'significant']:
            parts.append(f"- 메이저 아르카나 {arcana.get('major_ratio')}%: {arcana.get('messages', [''])[0]}")

        # Polarity pairs
        if pattern.get('polarity_analysis', {}).get('pairs_found'):
            for pair in pattern['polarity_analysis']['pairs_found']:
                parts.append(f"- 극성 쌍: {pair['cards'][0]} + {pair['cards'][1]} = {pair['meaning']}")

        # Energy flow
        energy = pattern.get('energy_flow', {})
        if energy.get('messages'):
            parts.append(f"- 에너지 흐름: {energy['messages'][0]}")

        # Transformation sequences
        if pattern.get('transformation', {}).get('sequences_found'):
            for seq in pattern['transformation']['sequences_found']:
                parts.append(f"- {seq['korean']}: {seq['meaning']}")

        # Synthesis
        synthesis = pattern.get('synthesis', {})
        if synthesis.get('summary'):
            parts.append(f"\n## 종합: {synthesis['summary']}")

        return parts

    def _build_multi_card_rule_context(
        self,
        drawn_cards: List[Dict],
        theme: str,
        spread: Optional[Dict]
    ) -> List[str]:
        """Build rule-based hints for 3+ card readings"""
        parts = []
        if len(drawn_cards) < 3:
            return parts

        pattern = self.pattern_engine.analyze(drawn_cards)
        hints = self.advanced_rules.get_multi_card_rule_hints(pattern, theme, spread)
        if not hints:
            return parts

        parts.append("\n## 규칙 기반 해석:")
        for msg in hints[:6]:
            parts.append(f"- {msg}")

        return parts

    def _build_card_pair_context(self, drawn_cards: List[Dict], theme: str) -> List[str]:
        """Build card pair interpretation context"""
        parts = []
        card_pairs = self.advanced_rules.get_all_card_pair_interpretations(drawn_cards)

        if card_pairs:
            parts.append("\n## 카드 쌍 해석:")
            for pair in card_pairs[:3]:
                parts.append(f"- {pair.get('card1')} + {pair.get('card2')}")
                if theme == 'love' and pair.get('love'):
                    parts.append(f"  연애: {pair.get('love')}")
                elif theme == 'career' and pair.get('career'):
                    parts.append(f"  커리어: {pair.get('career')}")
                elif theme == 'wealth' and pair.get('finance'):
                    parts.append(f"  재정: {pair.get('finance')}")
                if pair.get('advice'):
                    parts.append(f"  조언: {pair.get('advice')}")

        return parts

    def _build_crisis_context(self, drawn_cards: List[Dict], question: str) -> List[str]:
        """Build crisis detection context"""
        parts = []
        crisis = self.advanced_rules.detect_crisis_situation(drawn_cards, question)

        if crisis:
            parts.append("\n## ⚠️ 감지된 상황:")
            parts.append(f"- 유형: {crisis.get('crisis_name', '')}")
            parts.append(f"- 심각도: {crisis.get('severity', 'moderate')}")
            if crisis.get('professional_help_needed'):
                parts.append("- 전문 상담 권유 필요")

            for card_info in drawn_cards:
                card_name = card_info.get('name', '')
                crisis_support = self.advanced_rules.get_crisis_support(
                    crisis.get('crisis_type', ''), card_name
                )
                if crisis_support:
                    parts.append(f"\n[{card_name} 위기 지원]")
                    parts.append(f"- 공감: {crisis_support.get('validation', '')}")
                    parts.append(f"- 희망: {crisis_support.get('hope', '')}")
                    parts.append(f"- 행동: {crisis_support.get('action', '')}")

        return parts

    def _build_reversed_context(self, drawn_cards: List[Dict], theme: str) -> List[str]:
        """Build reversed card detail context"""
        parts = []
        major_names = [
            'Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor',
            'Hierophant', 'Lovers', 'Chariot', 'Strength', 'Hermit',
            'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death',
            'Temperance', 'Devil', 'Tower', 'Star', 'Moon', 'Sun',
            'Judgement', 'World'
        ]

        for card_info in drawn_cards:
            if not card_info.get('isReversed'):
                continue

            card_name = card_info.get('name', '')
            card_id = None

            if 'major' in card_name.lower() or card_name.startswith('The '):
                for idx, name in enumerate(major_names):
                    if name in card_name:
                        card_id = f"MAJOR_{idx}"
                        break

            if card_id:
                reverse_detail = self.advanced_rules.get_detailed_reverse_interpretation(
                    card_id, theme
                )
                if reverse_detail and reverse_detail.get('core'):
                    parts.append(f"\n[{card_name} 역방향 상세]")
                    parts.append(f"- 핵심: {reverse_detail.get('core', '')}")
                    parts.append(f"- 막힌 에너지: {reverse_detail.get('blocked_energy', '')}")
                    if reverse_detail.get('theme_interpretation'):
                        parts.append(f"- {theme}: {reverse_detail.get('theme_interpretation', '')}")

        return parts

    def _build_semantic_context(self, question: str) -> List[str]:
        """Build semantic search context"""
        parts = []
        related = self.advanced_embeddings.search(question, top_k=3)

        if related:
            parts.append("\n## 관련 지식:")
            for entry in related:
                parts.append(f"- {entry.get('text', '')[:200]}")

        return parts
