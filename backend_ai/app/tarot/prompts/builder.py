# backend_ai/app/tarot/prompts/builder.py
"""
Tarot Prompt Builder
====================
GPT 프롬프트 구성 클래스
"""

from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend_ai.app.tarot_rag import TarotRAG
    from backend_ai.app.tarot.rules_loader import AdvancedRulesLoader

try:
    from backend_ai.app.tarot_rag import SUIT_MEANINGS
except ImportError:
    from app.tarot_rag import SUIT_MEANINGS

from .system_prompts import SYSTEM_PROMPT, READING_GUIDE


class TarotPromptBuilder:
    """Build prompts for GPT based on spread and cards"""

    SYSTEM_PROMPT = SYSTEM_PROMPT

    @staticmethod
    def build_reading_prompt(
        spread: Dict,
        drawn_cards: List[Dict],
        question: str = "",
        tarot_rag: 'TarotRAG' = None,
        advanced_rules: 'AdvancedRulesLoader' = None
    ) -> str:
        """Build prompt for a complete tarot reading with advanced features"""

        spread_name = spread.get('spread_name', 'Tarot Reading')
        topic_title = spread.get('korean', spread.get('title', ''))
        positions = spread.get('positions', [])

        # Collect card names for combination checking
        card_names = [c.get('name', '') for c in drawn_cards]

        # Build advanced context
        advanced_context = ""
        if advanced_rules:
            advanced_context = TarotPromptBuilder._build_advanced_context(
                advanced_rules, card_names, drawn_cards
            )

        # Build card context
        card_context = TarotPromptBuilder._build_card_context(
            drawn_cards, positions, tarot_rag, advanced_rules
        )

        prompt = f"""
# 타로 리딩 요청

## 스프레드: {spread_name}
## 주제: {topic_title}
{f'## 질문: {question}' if question else ''}
{advanced_context}
## 뽑힌 카드들:
{''.join(card_context)}

{READING_GUIDE}
"""
        return prompt

    @staticmethod
    def _build_advanced_context(
        advanced_rules: 'AdvancedRulesLoader',
        card_names: List[str],
        drawn_cards: List[Dict]
    ) -> str:
        """Build advanced context from rules"""
        context_parts = []

        # Check for special combinations
        combination = advanced_rules.find_card_combination(card_names)
        if combination:
            context_parts.append(f"""
## 특별한 카드 조합 발견!
- 조합: {', '.join(combination.get('cards', []))}
- 카테고리: {combination.get('category', '')}
- 의미: {combination.get('korean', combination.get('meaning', ''))}
{f"- 조언: {combination.get('advice')}" if combination.get('advice') else ''}
""")

        # Analyze elemental balance
        elemental = advanced_rules.analyze_elemental_balance(drawn_cards)
        if elemental:
            element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
            counts = elemental.get('element_count', {})
            dominant = elemental.get('dominant')
            missing = elemental.get('missing', [])

            context_parts.append(f"""
## 원소 분석
- 원소 분포: {', '.join([f"{element_korean.get(e, e)} {c}장" for e, c in counts.items() if c > 0])}
""")
            if dominant and counts.get(dominant, 0) >= 3:
                context_parts.append(f"- 지배적 원소: {element_korean.get(dominant, dominant)} - {elemental.get('dominant_meaning', '')}\n")
                if elemental.get('dominant_advice'):
                    context_parts.append(f"- 원소 조언: {elemental.get('dominant_advice')}\n")

            if missing:
                missing_korean = [element_korean.get(m, m) for m in missing]
                context_parts.append(f"- 부족한 원소: {', '.join(missing_korean)}\n")
                for mm in elemental.get('missing_meanings', []):
                    context_parts.append(f"  → {mm.get('meaning', '')}\n")

        return ''.join(context_parts)

    @staticmethod
    def _build_card_context(
        drawn_cards: List[Dict],
        positions: List[Dict],
        tarot_rag: 'TarotRAG',
        advanced_rules: 'AdvancedRulesLoader'
    ) -> List[str]:
        """Build context for each card"""
        card_context = []

        for i, card_info in enumerate(drawn_cards):
            if i >= len(positions):
                break

            pos = positions[i]
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            orientation = "역방향" if is_reversed else "정방향"

            # Get card meaning from RAG
            card_meaning = ""
            if tarot_rag:
                card_meaning = TarotPromptBuilder._get_card_meaning(
                    tarot_rag, card_name, is_reversed
                )

            # Get court card profile if applicable
            court_profile = ""
            if advanced_rules:
                court_profile = TarotPromptBuilder._get_court_profile(
                    advanced_rules, card_name
                )
                # Get timing hint
                timing = advanced_rules.get_timing_hint(card_name)
                if timing:
                    card_meaning += f"\n    - 타이밍: {timing}"

            # Get Jung psychological depth
            jung_depth = ""
            if advanced_rules:
                jung_depth = TarotPromptBuilder._get_jung_depth(
                    advanced_rules, card_name
                )

            card_context.append(f"""
[카드 {i+1}] {pos['name']}
- 포지션 의미: {pos['meaning']}
- 해석 힌트: {pos.get('prompt_hint', '')}
- 뽑힌 카드: {card_name} ({orientation})
{card_meaning}{court_profile}{jung_depth}
""")

        return card_context

    @staticmethod
    def _get_card_meaning(tarot_rag: 'TarotRAG', card_name: str, is_reversed: bool) -> str:
        """Get card meaning from RAG"""
        card_data = tarot_rag.search_for_card(
            card_name,
            'reversed' if is_reversed else 'upright'
        )
        if not card_data:
            return ""

        keywords = card_data.get('keywords', [])[:5]
        meaning = card_data.get('meaning', '')
        advice = card_data.get('advice', '')
        suit = card_data.get('suit', 'major')
        suit_info = SUIT_MEANINGS.get(suit, {})

        return f"""
    - 키워드: {', '.join(keywords)}
    - 기본 의미: {meaning}
    - 조언: {advice}
    - 원소: {suit_info.get('element', '')} ({suit_info.get('korean', '')})"""

    @staticmethod
    def _get_court_profile(advanced_rules: 'AdvancedRulesLoader', card_name: str) -> str:
        """Get court card profile"""
        profile = advanced_rules.get_court_card_profile(card_name)
        if not profile:
            return ""

        personality = profile.get('personality', {})
        in_love = profile.get('in_love', {})
        in_career = profile.get('in_career', {})

        return f"""
    - [궁정 카드 프로필]
    - 성격: {personality.get('description', '')}
    - 강점: {', '.join(personality.get('strengths', [])[:3])}
    - 연애에서: {in_love.get('message', '')}
    - 커리어에서: {in_career.get('message', '')}"""

    @staticmethod
    def _get_jung_depth(advanced_rules: 'AdvancedRulesLoader', card_name: str) -> str:
        """Get Jungian psychological depth"""
        deep_meaning = advanced_rules.get_card_deep_meaning(card_name)
        if not deep_meaning:
            return ""

        archetype = deep_meaning.get('archetype', '')
        jung_insight = deep_meaning.get('jung', '')
        therapeutic_q = deep_meaning.get('therapeutic_question', '')

        if not archetype and not jung_insight:
            return ""

        return f"""
    - [심리학적 깊이]
    - 원형: {archetype}
    - 융 심리학: {jung_insight}
    - 성찰 질문: {therapeutic_q}"""

    @staticmethod
    def build_single_card_prompt(
        card_name: str,
        is_reversed: bool,
        position_name: str,
        position_meaning: str,
        context: str = ""
    ) -> str:
        """Build prompt for single card interpretation"""

        orientation = "역방향" if is_reversed else "정방향"

        return f"""
카드: {card_name} ({orientation})
포지션: {position_name} - {position_meaning}
{f'맥락: {context}' if context else ''}

이 카드 해석해줘. 3-4문장으로 핵심만, 그래서 뭘 하면 좋을지도 알려줘.
"""
