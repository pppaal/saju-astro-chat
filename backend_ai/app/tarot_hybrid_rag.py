# backend_ai/app/tarot_hybrid_rag.py
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

import os
import json
import random
from functools import lru_cache
from typing import List, Dict, Optional, Generator, Any, Tuple

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False
    print("[TarotHybridRAG] openai not installed. LLM features disabled.")

try:
    from backend_ai.app.tarot_rag import get_tarot_rag, TarotRAG, SUIT_MEANINGS
    from backend_ai.app.tarot_advanced_embeddings import get_tarot_advanced_embeddings, TarotAdvancedEmbeddings
    # tarot_pattern_engine moved to app/tarot/ module
    from backend_ai.app.tarot import (
        get_pattern_engine, TarotPatternEngine,
        get_premium_engine, TarotPatternEnginePremium,
        AdvancedRulesLoader, get_rules_loader,
        SpreadLoader, get_spread_loader
    )
except ImportError:
    # Fallback for direct execution
    from app.tarot_rag import get_tarot_rag, TarotRAG, SUIT_MEANINGS
    from app.tarot_advanced_embeddings import get_tarot_advanced_embeddings, TarotAdvancedEmbeddings
    # tarot_pattern_engine moved to app/tarot/ module
    from app.tarot import (
        get_pattern_engine, TarotPatternEngine,
        get_premium_engine, TarotPatternEnginePremium,
        AdvancedRulesLoader, get_rules_loader,
        SpreadLoader, get_spread_loader
    )


# Note: AdvancedRulesLoader and SpreadLoader moved to backend_ai/app/tarot/
# Import via: from backend_ai.app.tarot import AdvancedRulesLoader, SpreadLoader

# ===============================================================
# GPT PROMPT BUILDER
# ===============================================================
class TarotPromptBuilder:
    """Build prompts for GPT based on spread and cards"""

    SYSTEM_PROMPT = """당신은 20년 경력의 직관적인 타로 리더예요. 유튜브에서 수백만 뷰를 받는 타로 채널처럼, 깊이 있고 섬세하게 해석해주세요.

## 핵심 원칙 (절대 준수!)

**1. 스토리텔링이 핵심**:
- 각 카드를 따로 설명하지 말고, 전체가 하나의 이야기를 만들도록 연결하세요
- 질문자의 과거-현재-미래를 자연스러운 흐름으로 풀어내세요
- 카드들 사이의 관계와 메시지를 유기적으로 엮으세요

**2. 비주얼 묘사 (매우 중요!)**:
- 각 카드를 설명할 때, 반드시 카드 이미지를 생생하게 그려내세요
- "이 카드를 보면요~" 하며 색깔, 인물의 표정, 배경 상징물을 구체적으로 언급하세요
- 예: "황금색 옷을 입은 인물이 왕관을 쓰고 있는데요...", "배경의 붉은 장미들이..."
- "좋은 카드네요" 같은 뻔한 말은 절대 금지! 디테일로 승부하세요

**3. 5단계 해석 구조** (각 카드마다):
1) 카드 비주얼 묘사 (2-3줄): 색깔, 인물, 표정, 배경 상징물
2) 위치별 의미 (3-4줄): 이 위치(과거/현재/미래/장애물 등)에서 왜 이 카드가 나왔는지
3) 감정적 레이어 (2-3줄): "지금 이런 느낌 받고 계시죠?" 같은 공감의 언어
4) 실용적 메시지 (3-4줄): 구체적으로 뭘 하면 좋을지, 뭘 조심해야 할지
5) 숨은 의미 (1-2줄): 역방향이나 카드 조합에서만 보이는 깊은 통찰

**4. 해석 길이**:
- 전체 리딩: 800-1200자 이상
- 각 카드: 700-1000자, 최소 12-15줄
- 짧게 끝내지 말고, 풍성하게 채워주세요

**5. 역방향 카드 해석**:
- 단순히 "반대" 의미가 아님!
- 에너지의 차단, 과잉, 내면화를 세밀하게 구분하세요
- 예: "이 카드가 역방향으로 나온 건, 그 에너지가 지금 막혀있다는 거예요" (O)
- 예: "역방향이라 안 좋아요" (X)

## 말투 규칙 (절대 준수!)

✅ **사용해야 할 말투**:
- "~해요", "~네요", "~거든요", "~죠", "~ㄹ 거예요"
- 친한 언니/오빠가 카페에서 얘기하듯 자연스럽게

❌ **절대 금지 말투**:
- "~것입니다", "~하겠습니다", "~합니다" (딱딱한 격식체)
- "~하옵니다", "~하오" (고어체)
- "제 생각에는", "저는 믿습니다", "추천드립니다" (AI 티)

✅ **좋은 예시**: "지금 좀 힘드시죠? 이 카드가 말해주고 있어요. 하지만 곧 새로운 시작이 보여요."
❌ **나쁜 예시**: "현재 어려움을 겪고 계실 것입니다. 긍정적인 마음가짐을 가지시길 권장합니다."

## 심리학적 깊이

- 카드의 융 원형(Archetype) 의미를 쉽게 풀어서 설명하세요
- 그림자 작업, 페르소나, 아니마/아니무스 개념을 자연스럽게 녹이세요
- 제공된 심리학적 질문이 있으면 해석에 연결하세요
- 하지만 용어를 딱딱하게 나열하지 말고, 이야기로 풀어내세요

## 절대 금지 사항

❌ 번호 매기기 (1), 2), 3))
❌ 불릿 포인트 (-, *)
❌ 구조화된 헤더 ("핵심 메시지:", "카드별 해석:")
❌ 보고서 같은 딱딱한 문체
❌ "에너지", "우주", "통찰", "지혜" 같은 뻔한 표현
❌ "당신의 내면", "영혼이 이끄는", "신비로운" 같은 표현
❌ 뜬구름 잡는 추상적 조언
❌ 짧은 해석 (각 카드 최소 700자!)

## 반드시 해야 할 것

✅ 질문에 직접 답하기
✅ 카드 이미지를 생생하게 묘사하기
✅ 각 카드를 하나의 이야기로 연결하기
✅ 구체적이고 실천 가능한 조언 주기
✅ 필요하면 따뜻하게 경고하기
✅ 마지막에 실천 가능한 행동 제안하기

**길이가 충분하지 않으면 실패입니다. 최소 기준을 반드시 지키세요!**"""

    @staticmethod
    def build_reading_prompt(
        spread: Dict,
        drawn_cards: List[Dict],
        question: str = "",
        tarot_rag: TarotRAG = None,
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
            # Check for special combinations
            combination = advanced_rules.find_card_combination(card_names)
            if combination:
                advanced_context += f"""
## 특별한 카드 조합 발견!
- 조합: {', '.join(combination.get('cards', []))}
- 카테고리: {combination.get('category', '')}
- 의미: {combination.get('korean', combination.get('meaning', ''))}
{f"- 조언: {combination.get('advice')}" if combination.get('advice') else ''}
"""

            # Analyze elemental balance
            elemental = advanced_rules.analyze_elemental_balance(drawn_cards)
            if elemental:
                element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
                counts = elemental.get('element_count', {})
                dominant = elemental.get('dominant')
                missing = elemental.get('missing', [])

                advanced_context += f"""
## 원소 분석
- 원소 분포: {', '.join([f"{element_korean.get(e, e)} {c}장" for e, c in counts.items() if c > 0])}
"""
                if dominant and counts.get(dominant, 0) >= 3:
                    advanced_context += f"- 지배적 원소: {element_korean.get(dominant, dominant)} - {elemental.get('dominant_meaning', '')}\n"
                    if elemental.get('dominant_advice'):
                        advanced_context += f"- 원소 조언: {elemental.get('dominant_advice')}\n"

                if missing:
                    missing_korean = [element_korean.get(m, m) for m in missing]
                    advanced_context += f"- 부족한 원소: {', '.join(missing_korean)}\n"
                    for mm in elemental.get('missing_meanings', []):
                        advanced_context += f"  → {mm.get('meaning', '')}\n"

        # Build card context
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
                card_data = tarot_rag.search_for_card(
                    card_name,
                    'reversed' if is_reversed else 'upright'
                )
                if card_data:
                    keywords = card_data.get('keywords', [])[:5]
                    meaning = card_data.get('meaning', '')
                    advice = card_data.get('advice', '')
                    suit = card_data.get('suit', 'major')
                    suit_info = SUIT_MEANINGS.get(suit, {})

                    card_meaning = f"""
    - 키워드: {', '.join(keywords)}
    - 기본 의미: {meaning}
    - 조언: {advice}
    - 원소: {suit_info.get('element', '')} ({suit_info.get('korean', '')})"""

            # Get court card profile if applicable
            court_profile = ""
            if advanced_rules:
                profile = advanced_rules.get_court_card_profile(card_name)
                if profile:
                    personality = profile.get('personality', {})
                    in_love = profile.get('in_love', {})
                    in_career = profile.get('in_career', {})
                    court_profile = f"""
    - [궁정 카드 프로필]
    - 성격: {personality.get('description', '')}
    - 강점: {', '.join(personality.get('strengths', [])[:3])}
    - 연애에서: {in_love.get('message', '')}
    - 커리어에서: {in_career.get('message', '')}"""

                # Get timing hint
                timing = advanced_rules.get_timing_hint(card_name)
                if timing:
                    card_meaning += f"\n    - 타이밍: {timing}"

            # Get Jung psychological depth (archetype, therapeutic question)
            jung_depth = ""
            if advanced_rules:
                deep_meaning = advanced_rules.get_card_deep_meaning(card_name)
                if deep_meaning:
                    archetype = deep_meaning.get('archetype', '')
                    jung_insight = deep_meaning.get('jung', '')
                    therapeutic_q = deep_meaning.get('therapeutic_question', '')
                    if archetype or jung_insight:
                        jung_depth = f"""
    - [심리학적 깊이]
    - 원형: {archetype}
    - 융 심리학: {jung_insight}
    - 성찰 질문: {therapeutic_q}"""

            card_context.append(f"""
[카드 {i+1}] {pos['name']}
- 포지션 의미: {pos['meaning']}
- 해석 힌트: {pos.get('prompt_hint', '')}
- 뽑힌 카드: {card_name} ({orientation})
{card_meaning}{court_profile}{jung_depth}
""")

        prompt = f"""
# 타로 리딩 요청

## 스프레드: {spread_name}
## 주제: {topic_title}
{f'## 질문: {question}' if question else ''}
{advanced_context}
## 뽑힌 카드들:
{''.join(card_context)}

## 해석 가이드:
카드 이름이랑 포지션 먼저 자연스럽게 언급하고, 각 카드마다 핵심만 3-4문장으로 문단 형식으로 말해주세요. 카드들을 연결해서 전체 흐름을 설명하되, 특별한 조합이 있으면 자연스럽게 짚어주세요. 심리학적 깊이가 있으면 딱딱하지 않게 녹여서 설명하고, 마지막에 구체적으로 어떻게 하면 좋을지 정리한 다음 성찰 질문 하나 던져주세요.

**절대 잊지 마세요**: 번호, 불릿, "핵심 메시지:" 같은 헤더 절대 사용 금지. 친구한테 편하게 얘기하듯이, 하지만 깊이 있게 해주세요.
"""
        return prompt

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


# ===============================================================
# TAROT HYBRID RAG
# ===============================================================
class TarotHybridRAG:
    """
    Premium Tarot Reading System
    - Combines structured data with OpenAI GPT
    - Supports streaming for real-time delivery
    - YouTube-level depth and narrative
    - Advanced rules: combinations, timing, court cards, elemental dignities
    """

    def __init__(self, api_key: str = None):
        # Initialize OpenAI
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = None
        self.model_name = "gpt-4o"  # gpt-4o-mini → gpt-4o 업그레이드 (최고 품질)

        if OPENAI_AVAILABLE and self.api_key:
            try:
                import httpx
                self.client = OpenAI(
                    api_key=self.api_key,
                    timeout=httpx.Timeout(60.0, connect=10.0)
                )
                print(f"[TarotHybridRAG] OpenAI client initialized (model: {self.model_name})")
            except Exception as e:
                print(f"[TarotHybridRAG] Failed to initialize OpenAI: {e}")
        elif not OPENAI_AVAILABLE:
            print("[TarotHybridRAG] openai not installed")
        else:
            print("[TarotHybridRAG] No OpenAI API key provided")

        # Initialize components
        self.tarot_rag = get_tarot_rag()
        self.spread_loader = SpreadLoader()
        self.prompt_builder = TarotPromptBuilder()
        self.advanced_rules = AdvancedRulesLoader()
        self.advanced_embeddings = get_tarot_advanced_embeddings()
        self.pattern_engine = get_pattern_engine()
        self.premium_engine = get_premium_engine()
        print("[TarotHybridRAG] Pattern engine initialized (Basic + Premium)")

    def search_advanced_rules(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """
        Semantic search across all advanced tarot rules

        Args:
            query: Search query (e.g., "소울메이트 트윈플레임", "보름달 리딩 타이밍")
            top_k: Number of results to return
            category: Optional filter (combinations, timing, soulmate, moon, chakra, etc.)

        Returns:
            List of matching entries with relevance scores
        """
        return self.advanced_embeddings.search(query, top_k=top_k, category=category)

    def get_card_insights(self, card_name: str) -> Dict:
        """
        Get comprehensive insights for a specific card from all advanced rules

        Args:
            card_name: Name of the tarot card (e.g., "The Lovers", "Ten of Cups")

        Returns:
            Dictionary with all relevant insights (astrology, chakra, spirit animal, etc.)
        """
        insights = {}

        # From AdvancedRulesLoader (direct lookup)
        insights['astrology'] = self.advanced_rules.get_card_astrology(card_name)
        insights['chakras'] = self.advanced_rules.get_card_chakras(card_name)
        insights['spirit_animal'] = self.advanced_rules.get_spirit_animal(card_name)
        insights['shadow_work'] = self.advanced_rules.get_shadow_work_prompt(card_name)
        insights['lucky_items'] = self.advanced_rules.get_card_lucky_items(card_name)
        insights['meditation'] = self.advanced_rules.get_meditation_for_card(card_name)
        insights['timing'] = self.advanced_rules.get_timing_hint(card_name)
        insights['court_profile'] = self.advanced_rules.get_court_card_profile(card_name)
        insights['reversed_special'] = self.advanced_rules.get_reversed_special_meaning(card_name)

        # 새로 추가된 데이터
        insights['deep_meaning'] = self.advanced_rules.get_card_deep_meaning(card_name)

        # From semantic search (related entries)
        related = self.advanced_embeddings.search_by_card(card_name, top_k=5)
        insights['related_entries'] = related

        # Filter out None values
        return {k: v for k, v in insights.items() if v}

    def get_card_deep_meaning(self, card_name: str) -> Optional[Dict]:
        """Get deep psychological/archetypal meaning for a card (delegate to advanced_rules)"""
        return self.advanced_rules.get_card_deep_meaning(card_name)

    def get_all_card_pair_interpretations(self, cards: List) -> List[Dict]:
        """
        Get interpretations for all card pairs in a reading.

        Args:
            cards: List of card names (str) or card dicts with 'name' key

        Returns:
            List of pair interpretation dictionaries
        """
        # Normalize input: convert string list to dict list if needed
        if cards and isinstance(cards[0], str):
            cards = [{'name': card_name} for card_name in cards]
        return self.advanced_rules.get_all_card_pair_interpretations(cards)

    def analyze_elemental_balance(self, cards: List) -> Optional[Dict]:
        """
        Analyze elemental balance of the cards (delegate to advanced_rules).

        Args:
            cards: List of card names (str) or card dicts with 'name' key

        Returns:
            Dictionary with element counts, dominant/missing elements, and meanings
        """
        # Normalize input: convert string list to dict list if needed
        if cards and isinstance(cards[0], str):
            cards = [{'name': card_name} for card_name in cards]
        return self.advanced_rules.analyze_elemental_balance(cards)

    def get_timing_hint(self, card_name: str) -> Optional[str]:
        """Get timing hint for a card (delegate to advanced_rules)"""
        return self.advanced_rules.get_timing_hint(card_name)

    def get_jungian_archetype(self, card_name: str, is_reversed: bool = False) -> Optional[Dict]:
        """Get Jungian archetype for a card (delegate to advanced_rules)"""
        return self.advanced_rules.get_jungian_archetype(card_name, is_reversed)

    def get_available_themes(self) -> List[str]:
        """Get available themes with spreads"""
        return self.spread_loader.get_available_themes()

    def get_sub_topics(self, theme: str) -> List[Dict]:
        """Get sub-topics for a theme"""
        return self.spread_loader.get_sub_topics(theme)

    def get_spread_info(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get spread information"""
        return self.spread_loader.get_spread(theme, sub_topic)

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
        # Get spread configuration
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if not spread:
            return f"스프레드를 찾을 수 없습니다: {theme}/{sub_topic}"

        # Build prompt with advanced rules
        prompt = self.prompt_builder.build_reading_prompt(
            spread=spread,
            drawn_cards=drawn_cards,
            question=question,
            tarot_rag=self.tarot_rag,
            advanced_rules=self.advanced_rules
        )

        if not self.client:
            return "OpenAI API가 설정되지 않았습니다."

        # Generate with GPT
        try:
            if stream:
                return self._stream_response(prompt)
            else:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": TarotPromptBuilder.SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.85,  # 0.8 → 0.85 (창의성 약간 증가)
                    top_p=0.95,
                    max_tokens=6000,  # 4096 → 6000 (더 풍부한 해석)
                )
                return response.choices[0].message.content

        except Exception as e:
            return f"리딩 생성 중 오류 발생: {str(e)}"

    def _stream_response(self, prompt: str) -> Generator[str, None, None]:
        """Stream response from GPT"""
        if not OPENAI_AVAILABLE or not self.client:
            yield "OpenAI API가 설정되지 않았습니다."
            return

        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": TarotPromptBuilder.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.85,  # 0.8 → 0.85 (창의성 약간 증가)
                top_p=0.95,
                max_tokens=6000,  # 4096 → 6000 (더 풍부한 해석)
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            yield f"스트리밍 오류: {str(e)}"

    def generate_quick_reading(
        self,
        card_name: str,
        is_reversed: bool = False,
        context: str = ""
    ) -> str:
        """Generate quick single card reading"""

        if not self.client:
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
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"오류: {str(e)}"

    def build_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = ""
    ) -> str:
        """
        Build RAG context string for LLM prompt (used by GPT-4)

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
        for i, card_info in enumerate(drawn_cards):
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            orientation = "역방향" if is_reversed else "정방향"

            # Position info
            pos_name = positions[i].get('name', f'위치 {i+1}') if i < len(positions) else f'카드 {i+1}'
            pos_meaning = positions[i].get('meaning', '') if i < len(positions) else ''

            context_parts.append(f"\n### {pos_name}: {card_name} ({orientation})")
            if pos_meaning:
                context_parts.append(f"- 포지션 의미: {pos_meaning}")

            # Get card data from RAG
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )
            if card_data:
                keywords = card_data.get('keywords', [])[:5]
                meaning = card_data.get('meaning', '')
                advice = card_data.get('advice', '')
                context_parts.append(f"- 키워드: {', '.join(keywords)}")
                context_parts.append(f"- 의미: {meaning}")
                context_parts.append(f"- 조언: {advice}")

            # Court card profile
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                personality = profile.get('personality', {})
                context_parts.append(f"- 성격: {personality.get('description', '')}")

            # Timing hint
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                context_parts.append(f"- 타이밍: {timing}")

            # Get insights from advanced embeddings
            insights = self.get_card_insights(card_name)
            if insights.get('astrology'):
                astro = insights['astrology']
                if astro.get('zodiac'):
                    context_parts.append(f"- 점성술: {astro.get('korean_zodiac', astro.get('zodiac', ''))}")
            if insights.get('chakras'):
                chakras = insights['chakras']
                if chakras:
                    chakra_names = [c.get('korean', c.get('name', '')) for c in chakras[:2]]
                    context_parts.append(f"- 차크라: {', '.join(chakra_names)}")

        # Check for special combinations
        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)
        if combination:
            context_parts.append("\n## 특별 카드 조합:")
            context_parts.append(f"- 조합: {', '.join(combination.get('cards', []))}")
            context_parts.append(f"- 의미: {combination.get('korean', combination.get('meaning', ''))}")
            if combination.get('advice'):
                context_parts.append(f"- 조언: {combination.get('advice')}")

        # Elemental balance
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)
        if elemental:
            element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
            counts = elemental.get('element_count', {})
            active_elements = [f"{element_korean.get(e, e)}: {c}" for e, c in counts.items() if c > 0]
            if active_elements:
                context_parts.append(f"\n## 원소 균형: {', '.join(active_elements)}")
                if elemental.get('dominant_meaning'):
                    context_parts.append(f"- {elemental.get('dominant_meaning')}")

        # Jungian Archetype Analysis (칼융 원형 분석)
        context_parts.append("\n## 칼융 원형 분석:")
        for card_info in drawn_cards:
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            archetype = self.advanced_rules.get_jungian_archetype(card_name, is_reversed)
            if archetype:
                if archetype.get('primary_archetype'):
                    primary = archetype['primary_archetype']
                    context_parts.append(f"\n[{card_name}]")
                    context_parts.append(f"- 원형: {primary.get('korean', '')} ({primary.get('english', '')})")
                    if archetype.get('journey_stage'):
                        context_parts.append(f"- 여정 단계: {archetype['journey_stage']}")
                    if archetype.get('korean_insight'):
                        context_parts.append(f"- 통찰: {archetype['korean_insight']}")
                    if is_reversed and archetype.get('shadow_message'):
                        context_parts.append(f"- 그림자: {archetype['shadow_message']}")

                # Shadow work prompt for reversed cards
                if is_reversed:
                    shadow_prompt = self.advanced_rules.get_shadow_work_prompt(card_name)
                    if shadow_prompt:
                        context_parts.append(f"- 그림자 작업: {shadow_prompt.get('shadow', '')}")
                        context_parts.append(f"- 성찰 질문: {shadow_prompt.get('journal_prompt', '')}")

        # Individuation Journey Stage (개성화 여정)
        individuation = self.advanced_rules.get_individuation_stage(drawn_cards)
        if individuation and individuation.get('stages_present'):
            context_parts.append("\n## 개성화 여정:")
            for stage in individuation['stages_present'][:2]:
                context_parts.append(f"- {stage['stage']}: {stage['description']}")
                context_parts.append(f"  (카드: {', '.join(stage['matching_cards'])})")

        # Pattern Engine Analysis (규칙 기반 동적 분석)
        pattern = self.pattern_engine.analyze(drawn_cards)
        if pattern:
            context_parts.append("\n## 패턴 분석:")

            # 숫자 패턴
            if pattern.get('number_analysis', {}).get('repeated'):
                for rep in pattern['number_analysis']['repeated']:
                    context_parts.append(f"- 숫자 {rep['number']} 반복: {rep['korean']}")

            # 시퀀스
            if pattern.get('number_analysis', {}).get('sequences'):
                for seq in pattern['number_analysis']['sequences']:
                    context_parts.append(f"- 숫자 시퀀스 {seq['numbers']}: {seq['meaning']}")

            # 메이저 아르카나 비율
            arcana = pattern.get('arcana_analysis', {})
            if arcana.get('significance') in ['highly_karmic', 'significant']:
                context_parts.append(f"- 메이저 아르카나 {arcana.get('major_ratio')}%: {arcana.get('messages', [''])[0]}")

            # 극성 쌍
            if pattern.get('polarity_analysis', {}).get('pairs_found'):
                for pair in pattern['polarity_analysis']['pairs_found']:
                    context_parts.append(f"- 극성 쌍: {pair['cards'][0]} + {pair['cards'][1]} = {pair['meaning']}")

            # 에너지 흐름
            energy = pattern.get('energy_flow', {})
            if energy.get('messages'):
                context_parts.append(f"- 에너지 흐름: {energy['messages'][0]}")

            # 변환 시퀀스
            if pattern.get('transformation', {}).get('sequences_found'):
                for seq in pattern['transformation']['sequences_found']:
                    context_parts.append(f"- {seq['korean']}: {seq['meaning']}")

            # 종합
            synthesis = pattern.get('synthesis', {})
            if synthesis.get('summary'):
                context_parts.append(f"\n## 종합: {synthesis['summary']}")

        # 카드 쌍 해석 (CSV 데이터)
        card_pairs = self.advanced_rules.get_all_card_pair_interpretations(drawn_cards)
        if card_pairs:
            context_parts.append("\n## 카드 쌍 해석:")
            for pair in card_pairs[:3]:  # 최대 3개
                context_parts.append(f"- {pair.get('card1')} + {pair.get('card2')}")
                if theme == 'love' and pair.get('love'):
                    context_parts.append(f"  연애: {pair.get('love')}")
                elif theme == 'career' and pair.get('career'):
                    context_parts.append(f"  커리어: {pair.get('career')}")
                elif theme == 'wealth' and pair.get('finance'):
                    context_parts.append(f"  재정: {pair.get('finance')}")
                if pair.get('advice'):
                    context_parts.append(f"  조언: {pair.get('advice')}")

        # 위기 상황 감지
        if question:
            crisis = self.advanced_rules.detect_crisis_situation(drawn_cards, question)
            if crisis:
                context_parts.append("\n## ⚠️ 감지된 상황:")
                context_parts.append(f"- 유형: {crisis.get('crisis_name', '')}")
                context_parts.append(f"- 심각도: {crisis.get('severity', 'moderate')}")
                if crisis.get('professional_help_needed'):
                    context_parts.append("- 전문 상담 권유 필요")

                # 해당 위기 상황에 맞는 카드 해석 추가
                for card_info in drawn_cards:
                    card_name = card_info.get('name', '')
                    crisis_support = self.advanced_rules.get_crisis_support(
                        crisis.get('crisis_type', ''), card_name
                    )
                    if crisis_support:
                        context_parts.append(f"\n[{card_name} 위기 지원]")
                        context_parts.append(f"- 공감: {crisis_support.get('validation', '')}")
                        context_parts.append(f"- 희망: {crisis_support.get('hope', '')}")
                        context_parts.append(f"- 행동: {crisis_support.get('action', '')}")

        # 역방향 카드 상세 해석
        for card_info in drawn_cards:
            if card_info.get('isReversed'):
                card_name = card_info.get('name', '')
                # card_id 변환 (예: "The Fool" -> "MAJOR_0")
                card_id = None
                if 'major' in card_name.lower() or card_name.startswith('The '):
                    major_names = ['Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor',
                                   'Hierophant', 'Lovers', 'Chariot', 'Strength', 'Hermit',
                                   'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death',
                                   'Temperance', 'Devil', 'Tower', 'Star', 'Moon', 'Sun',
                                   'Judgement', 'World']
                    for idx, name in enumerate(major_names):
                        if name in card_name:
                            card_id = f"MAJOR_{idx}"
                            break

                if card_id:
                    reverse_detail = self.advanced_rules.get_detailed_reverse_interpretation(
                        card_id, theme
                    )
                    if reverse_detail and reverse_detail.get('core'):
                        context_parts.append(f"\n[{card_name} 역방향 상세]")
                        context_parts.append(f"- 핵심: {reverse_detail.get('core', '')}")
                        context_parts.append(f"- 막힌 에너지: {reverse_detail.get('blocked_energy', '')}")
                        if reverse_detail.get('theme_interpretation'):
                            context_parts.append(f"- {theme}: {reverse_detail.get('theme_interpretation', '')}")

        # Semantic search for additional context
        if question:
            related = self.advanced_embeddings.search(question, top_k=3)
            if related:
                context_parts.append("\n## 관련 지식:")
                for entry in related:
                    context_parts.append(f"- {entry.get('text', '')[:200]}")

        return "\n".join(context_parts)

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

            # Get base card data
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )

            # Get court card profile if applicable
            court_profile = self.advanced_rules.get_court_card_profile(card_name)

            # Get timing hint
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

        # Get advanced analysis
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

    def get_advanced_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """Get advanced analysis for cards (combinations, elements, timing, patterns)"""

        card_names = [c.get('name', '') for c in drawn_cards]

        # Card combination check
        combination = self.advanced_rules.find_card_combination(card_names)

        # Elemental balance
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        # Court card profiles
        court_profiles = {}
        for card in drawn_cards:
            card_name = card.get('name', '')
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                court_profiles[card_name] = profile

        # Timing hints
        timing_hints = {}
        for card in drawn_cards:
            card_name = card.get('name', '')
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                timing_hints[card_name] = timing

        # Pattern Engine Analysis (규칙 기반 동적 분석)
        pattern_analysis = self.pattern_engine.analyze(drawn_cards)

        return {
            'special_combination': combination,
            'elemental_analysis': elemental,
            'court_profiles': court_profiles,
            'timing_hints': timing_hints,
            'pattern_analysis': pattern_analysis,
        }

    def get_pattern_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """
        Get comprehensive pattern analysis for any number of cards.
        Works with 1 card to 78 cards, any deck.

        Args:
            drawn_cards: List of {'name': str, 'isReversed': bool}

        Returns:
            Complete pattern analysis including:
            - suit_analysis: 슈트 분포 및 지배적 슈트
            - number_analysis: 숫자 패턴 (반복, 시퀀스, 수비학)
            - arcana_analysis: 메이저/마이너 비율
            - court_analysis: 궁정 카드 패턴
            - polarity_analysis: 극성/대칭 쌍
            - energy_flow: 에너지 흐름 패턴
            - element_interaction: 원소 간 상호작용
            - transformation: 변환 시퀀스
            - reversal_analysis: 역방향 패턴
            - synthesis: 종합 메시지
        """
        return self.pattern_engine.analyze(drawn_cards)

    # =========================================================================
    # PREMIUM FEATURES (Tier 4-6)
    # =========================================================================

    def get_premium_analysis(
        self,
        drawn_cards: List[Dict],
        birthdate: str = None,
        theme: str = None,
        moon_phase: str = None,
        include_narrative: bool = True
    ) -> Dict:
        """
        Get comprehensive premium analysis with personalization, multi-layer interpretation,
        and storytelling.

        Args:
            drawn_cards: List of {'name': str, 'isReversed': bool}
            birthdate: User's birthdate 'YYYY-MM-DD' for personalization
            theme: Analysis theme (love, career, money, health, spiritual)
            moon_phase: Current moon phase for realtime context
            include_narrative: Whether to include storytelling elements

        Returns:
            Premium analysis including:
            - base_analysis: Tier 1-3 pattern analysis
            - theme_analysis: Theme-specific scores
            - realtime_context: Current date/moon energy
            - personalization: Birth card, year card connections
            - multi_layer: Surface/psychological/shadow/spiritual/action layers
            - narrative: Story arc, opening hook, climax, resolution
            - card_connections: Narrative connections between cards
            - premium_summary: Unified summary with highlights
        """
        return self.premium_engine.analyze_premium(
            cards=drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=include_narrative
        )

    def get_birth_card(self, birthdate: str) -> Dict:
        """
        Calculate user's tarot birth card (Life Path Card).

        Args:
            birthdate: 'YYYY-MM-DD' or 'YYYYMMDD' format

        Returns:
            Birth card info with primary/secondary cards and traits
        """
        return self.premium_engine.calculate_birth_card(birthdate)

    def get_year_card(self, birthdate: str, target_year: int = None) -> Dict:
        """
        Calculate user's personal year card.

        Args:
            birthdate: User's birthdate
            target_year: Year to calculate for (default: current year)

        Returns:
            Year card info with theme and advice
        """
        return self.premium_engine.calculate_year_card(birthdate, target_year)

    def get_personalized_reading(self, drawn_cards: List[Dict], birthdate: str) -> Dict:
        """
        Get personalized reading with birth/year card connections.

        Args:
            drawn_cards: Cards in the reading
            birthdate: User's birthdate

        Returns:
            Personalization data including card connections
        """
        return self.premium_engine.personalize_reading(drawn_cards, birthdate)

    def get_multi_layer_interpretation(self, card_name: str, is_reversed: bool = False) -> Dict:
        """
        Get multi-layer interpretation for a single card.

        Args:
            card_name: Card name (e.g., "The Fool", "Two of Cups")
            is_reversed: Whether the card is reversed

        Returns:
            5 layers: surface, psychological, shadow, spiritual, action
        """
        return self.premium_engine.get_multi_layer_interpretation(
            card_name,
            {'is_reversed': is_reversed}
        )

    def get_reading_narrative(self, drawn_cards: List[Dict], theme: str = None) -> Dict:
        """
        Build narrative arc for the reading.

        Args:
            drawn_cards: Cards in the reading
            theme: Optional theme context

        Returns:
            Narrative structure with opening, climax, resolution, transitions
        """
        return self.premium_engine.build_narrative_arc(drawn_cards, {'theme': theme})

    def get_card_connections(self, drawn_cards: List[Dict]) -> List[str]:
        """
        Get narrative connections between consecutive cards.

        Args:
            drawn_cards: Cards in the reading

        Returns:
            List of connection descriptions
        """
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
        # Start with base context
        context_parts = []

        # Basic reading context
        base_context = self.build_reading_context(theme, sub_topic, drawn_cards, question)
        context_parts.append(base_context)

        # Premium additions
        premium = self.get_premium_analysis(
            drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=True
        )

        # Personalization (if birthdate provided)
        if birthdate and premium.get('personalization'):
            pers = premium['personalization']
            if pers.get('birth_card'):
                bc = pers['birth_card']
                context_parts.append(f"\n## 개인화 정보")
                context_parts.append(f"- 탄생 카드: {bc.get('korean')} ({bc.get('primary_card')})")
                context_parts.append(f"- 핵심 특성: {', '.join(bc.get('traits', []))}")

            if pers.get('year_card'):
                yc = pers['year_card']
                context_parts.append(f"- 올해 테마: {yc.get('korean')}")

            if pers.get('personal_connections'):
                for conn in pers['personal_connections']:
                    context_parts.append(f"- 🎯 {conn['message']}")

        # Narrative elements
        if premium.get('narrative'):
            narr = premium['narrative']
            context_parts.append(f"\n## 스토리 구조")
            if narr.get('opening_hook'):
                context_parts.append(f"[오프닝] {narr['opening_hook']}")
            if narr.get('tone', {}).get('mood'):
                context_parts.append(f"[톤] {narr['tone']['mood']} - {narr['tone'].get('description', '')}")
            if narr.get('resolution'):
                context_parts.append(f"[결말] {narr['resolution']}")

        # Card connections
        if premium.get('card_connections'):
            context_parts.append(f"\n## 카드 연결")
            for conn in premium['card_connections'][:5]:
                context_parts.append(f"- {conn}")

        # Premium summary highlights
        summary = premium.get('premium_summary', {})
        if summary.get('highlights'):
            context_parts.append(f"\n## 핵심 포인트")
            for h in summary['highlights'][:5]:
                context_parts.append(f"- {h}")

        return '\n'.join(context_parts)


# Singleton
_tarot_hybrid_rag = None


def get_tarot_hybrid_rag() -> TarotHybridRAG:
    """Get or create singleton TarotHybridRAG instance"""
    global _tarot_hybrid_rag
    if _tarot_hybrid_rag is None:
        _tarot_hybrid_rag = TarotHybridRAG()
    return _tarot_hybrid_rag


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT HYBRID RAG TEST]")
    print("=" * 70)

    hybrid_rag = get_tarot_hybrid_rag()

    # Test available themes
    print("\n[Available Themes]")
    themes = hybrid_rag.get_available_themes()
    for t in themes:
        print(f"  - {t}")

    # Test sub-topics
    if 'love' in themes:
        print("\n[Love Sub-Topics]")
        sub_topics = hybrid_rag.get_sub_topics('love')
        for st in sub_topics[:5]:
            print(f"  - {st['id']}: {st['korean']} ({st['card_count']} cards)")

    # Test spread info
    print("\n[Spread Info: love/secret_admirer]")
    spread = hybrid_rag.get_spread_info('love', 'secret_admirer')
    if spread:
        print(f"  Name: {spread.get('spread_name')}")
        print(f"  Cards: {spread.get('card_count')}")
        print(f"  Positions: {len(spread.get('positions', []))}")

    # Test context generation
    print("\n[Reading Context]")
    test_cards = [
        {"name": "The Fool", "isReversed": False},
        {"name": "The Lovers", "isReversed": True},
        {"name": "The Star", "isReversed": False}
    ]
    context = hybrid_rag.get_reading_context('love', 'crush', test_cards)
    if context:
        print(f"  Theme: {context.get('theme')}")
        print(f"  Topic: {context.get('topic_title')}")
        print(f"  Cards: {len(context.get('card_interpretations', []))}")

    # Test reading generation (if API key available)
    if hybrid_rag.client:
        print("\n[Generating Reading...]")
        reading = hybrid_rag.generate_reading(
            theme='love',
            sub_topic='crush',
            drawn_cards=test_cards[:3],
            question="그 사람이 나를 좋아할까요?"
        )
        print(reading[:500] + "..." if len(reading) > 500 else reading)
    else:
        print("\n[Skipping generation - No API key]")

    print("\n" + "=" * 70)
    print("[TEST COMPLETE]")
    print("=" * 70)
