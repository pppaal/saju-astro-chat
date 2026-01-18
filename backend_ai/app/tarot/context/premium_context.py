# backend_ai/app/tarot/context/premium_context.py
"""
Premium Context Builder
=======================
프리미엄 기능을 포함한 향상된 컨텍스트 빌더
"""

from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend_ai.app.tarot.premium import TarotPatternEnginePremium

from .reading_context import ReadingContextBuilder


class PremiumContextBuilder:
    """
    Build enhanced reading context with premium features
    Includes personalization, narrative, and multi-layer interpretation
    """

    def __init__(
        self,
        reading_context_builder: ReadingContextBuilder,
        premium_engine: 'TarotPatternEnginePremium'
    ):
        self.base_builder = reading_context_builder
        self.premium_engine = premium_engine

    def build_premium_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = None,
        birthdate: str = None,
        moon_phase: str = None
    ) -> str:
        """
        Build enhanced reading context with premium features for LLM prompt.

        Args:
            theme: Reading theme
            sub_topic: Specific sub-topic/spread
            drawn_cards: Cards drawn
            question: User's question
            birthdate: User's birthdate for personalization
            moon_phase: Current moon phase

        Returns:
            Rich context string for LLM interpretation
        """
        context_parts = []

        # Start with base context
        base_context = self.base_builder.build_reading_context(
            theme, sub_topic, drawn_cards, question or ""
        )
        context_parts.append(base_context)

        # Get premium analysis
        premium = self.premium_engine.analyze_premium(
            cards=drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=True
        )

        # Add personalization context
        context_parts.extend(
            self._build_personalization_context(premium, birthdate)
        )

        # Add narrative context
        context_parts.extend(
            self._build_narrative_context(premium)
        )

        # Add card connections
        context_parts.extend(
            self._build_connections_context(premium)
        )

        # Add premium summary
        context_parts.extend(
            self._build_summary_context(premium)
        )

        return '\n'.join(context_parts)

    def _build_personalization_context(
        self,
        premium: Dict,
        birthdate: str
    ) -> List[str]:
        """Build personalization context"""
        parts = []

        if not birthdate or not premium.get('personalization'):
            return parts

        pers = premium['personalization']

        if pers.get('birth_card'):
            bc = pers['birth_card']
            parts.append(f"\n## 개인화 정보")
            parts.append(f"- 탄생 카드: {bc.get('korean')} ({bc.get('primary_card')})")
            parts.append(f"- 핵심 특성: {', '.join(bc.get('traits', []))}")

        if pers.get('year_card'):
            yc = pers['year_card']
            parts.append(f"- 올해 테마: {yc.get('korean')}")

        if pers.get('personal_connections'):
            for conn in pers['personal_connections']:
                parts.append(f"- 🎯 {conn['message']}")

        return parts

    def _build_narrative_context(self, premium: Dict) -> List[str]:
        """Build narrative structure context"""
        parts = []

        if not premium.get('narrative'):
            return parts

        narr = premium['narrative']
        parts.append(f"\n## 스토리 구조")

        if narr.get('opening_hook'):
            parts.append(f"[오프닝] {narr['opening_hook']}")

        if narr.get('tone', {}).get('mood'):
            parts.append(f"[톤] {narr['tone']['mood']} - {narr['tone'].get('description', '')}")

        if narr.get('resolution'):
            parts.append(f"[결말] {narr['resolution']}")

        return parts

    def _build_connections_context(self, premium: Dict) -> List[str]:
        """Build card connections context"""
        parts = []

        if not premium.get('card_connections'):
            return parts

        parts.append(f"\n## 카드 연결")
        for conn in premium['card_connections'][:5]:
            parts.append(f"- {conn}")

        return parts

    def _build_summary_context(self, premium: Dict) -> List[str]:
        """Build premium summary context"""
        parts = []

        summary = premium.get('premium_summary', {})
        if summary.get('highlights'):
            parts.append(f"\n## 핵심 포인트")
            for h in summary['highlights'][:5]:
                parts.append(f"- {h}")

        return parts
