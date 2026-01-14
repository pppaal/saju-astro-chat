"""
Tarot Service

Business logic for tarot-related operations:
- Dynamic follow-up question generation
- Tarot topic detection from chat text
- Spread configuration loading

Phase 3.4: Extracted from app.py (406 lines)
"""
import os
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


# ===============================================================
# TAROT TOPIC KEYWORDS (sub-topic keyword mappings)
# ===============================================================

_TAROT_TOPIC_KEYWORDS = {
    "career": {
        "job_search": {
            "keywords": ["취업", "구직", "일자리", "직장 구하", "취직", "입사", "신입", "첫 직장", "job", "employment"],
            "korean": "취업은 언제",
            "priority": 10
        },
        "interview": {
            "keywords": ["면접", "인터뷰", "합격", "불합격", "서류", "채용", "interview"],
            "korean": "면접 결과",
            "priority": 9
        },
        "job_change": {
            "keywords": ["이직", "퇴사", "직장 옮기", "회사 바꾸", "전직", "새 직장", "career change"],
            "korean": "이직해야 할까",
            "priority": 10
        },
        "promotion": {
            "keywords": ["승진", "진급", "승급", "임원", "팀장", "과장", "부장", "promotion"],
            "korean": "승진 가능성",
            "priority": 8
        },
        "business": {
            "keywords": ["사업", "창업", "스타트업", "자영업", "개업", "사장", "CEO", "business", "startup"],
            "korean": "사업 시작/확장",
            "priority": 9
        },
        "side_hustle": {
            "keywords": ["부업", "투잡", "알바", "아르바이트", "부수입", "side job"],
            "korean": "부업/투잡",
            "priority": 7
        },
        "career_path": {
            "keywords": ["진로", "적성", "어떤 직업", "무슨 일", "적합한 직업", "맞는 직업", "career path", "aptitude"],
            "korean": "나에게 맞는 직업",
            "priority": 8
        },
        "workplace": {
            "keywords": ["직장 생활", "회사 생활", "동료", "상사", "직장 내", "사내", "workplace"],
            "korean": "직장 내 관계/상황",
            "priority": 6
        },
        "salary": {
            "keywords": ["연봉", "급여", "월급", "임금", "돈", "인상", "협상", "salary"],
            "korean": "연봉 협상/인상",
            "priority": 7
        },
        "project": {
            "keywords": ["프로젝트", "업무", "과제", "일 잘", "성과", "project"],
            "korean": "프로젝트 성공",
            "priority": 6
        }
    },
    "love": {
        "secret_admirer": {
            "keywords": ["나를 좋아하는", "날 좋아하는", "관심 있는 사람", "누가 좋아", "secret admirer"],
            "korean": "나를 좋아하는 인연",
            "priority": 8
        },
        "current_partner": {
            "keywords": ["연인", "남친", "여친", "남자친구", "여자친구", "애인", "partner"],
            "korean": "지금 연인의 속마음",
            "priority": 9
        },
        "crush": {
            "keywords": ["짝사랑", "좋아하는 사람", "마음에 드는", "고백", "crush"],
            "korean": "짝사랑 상대의 마음",
            "priority": 8
        },
        "reconciliation": {
            "keywords": ["재회", "다시 만나", "헤어진", "전 남친", "전 여친", "돌아올", "reconciliation", "ex"],
            "korean": "헤어진 연인과의 재회",
            "priority": 9
        },
        "situationship": {
            "keywords": ["썸", "썸타는", "밀당", "관계 진전", "situationship"],
            "korean": "썸타는 상대",
            "priority": 8
        },
        "marriage": {
            "keywords": ["결혼", "결혼운", "배우자", "신랑", "신부", "혼인", "웨딩", "marriage", "wedding"],
            "korean": "결혼운",
            "priority": 10
        },
        "breakup": {
            "keywords": ["이별", "헤어질", "헤어져야", "끝내야", "그만 만나", "breakup"],
            "korean": "이별해야 할까",
            "priority": 9
        },
        "new_love": {
            "keywords": ["새로운 인연", "새 사랑", "언제 연애", "인연이 언제", "new love"],
            "korean": "새로운 사랑은 언제",
            "priority": 8
        },
        "cheating": {
            "keywords": ["바람", "외도", "불륜", "양다리", "cheating", "affair", "바람피"],
            "korean": "상대가 바람피우는지",
            "priority": 11
        },
        "soulmate": {
            "keywords": ["소울메이트", "운명", "진정한 사랑", "soulmate", "destiny"],
            "korean": "소울메이트 리딩",
            "priority": 7
        }
    },
    "wealth": {
        "money_luck": {
            "keywords": ["재물운", "금전운", "돈 운", "부자", "wealth", "money luck"],
            "korean": "재물운",
            "priority": 9
        },
        "investment": {
            "keywords": ["투자", "주식", "코인", "부동산", "펀드", "investment", "stock"],
            "korean": "투자 결정",
            "priority": 9
        },
        "debt": {
            "keywords": ["빚", "대출", "부채", "갚", "loan", "debt"],
            "korean": "빚/대출",
            "priority": 8
        },
        "windfall": {
            "keywords": ["복권", "로또", "횡재", "lottery", "windfall"],
            "korean": "횡재운",
            "priority": 7
        }
    },
    "health": {
        "general_health": {
            "keywords": ["건강", "건강운", "몸", "아프", "병", "health"],
            "korean": "건강운",
            "priority": 9
        },
        "mental_health": {
            "keywords": ["정신 건강", "스트레스", "우울", "불안", "mental health"],
            "korean": "정신 건강",
            "priority": 8
        },
        "recovery": {
            "keywords": ["회복", "치료", "완치", "recovery"],
            "korean": "회복",
            "priority": 8
        }
    },
    "family": {
        "parent": {
            "keywords": ["부모", "엄마", "아빠", "어머니", "아버지", "parent"],
            "korean": "부모님과의 관계",
            "priority": 8
        },
        "children": {
            "keywords": ["자녀", "아이", "아들", "딸", "임신", "children", "pregnancy"],
            "korean": "자녀운",
            "priority": 9
        },
        "sibling": {
            "keywords": ["형제", "자매", "오빠", "언니", "동생", "sibling"],
            "korean": "형제/자매 관계",
            "priority": 7
        }
    },
    "spiritual": {
        "life_purpose": {
            "keywords": ["삶의 목적", "인생의 의미", "왜 사는", "purpose"],
            "korean": "삶의 목적",
            "priority": 8
        },
        "karma": {
            "keywords": ["전생", "카르마", "업", "karma", "past life"],
            "korean": "전생/카르마",
            "priority": 7
        },
        "spiritual_growth": {
            "keywords": ["영적 성장", "깨달음", "명상", "spiritual"],
            "korean": "영적 성장",
            "priority": 7
        }
    },
    "life_path": {
        "general": {
            "keywords": ["인생", "앞으로", "미래", "운세", "전반적", "life", "future"],
            "korean": "인생 전반",
            "priority": 5
        },
        "decision": {
            "keywords": ["결정", "선택", "어떻게 해야", "뭘 해야", "decision"],
            "korean": "결정/선택",
            "priority": 6
        }
    }
}

# Cache for spread configurations (loaded once)
_SPREAD_CONFIG_CACHE = {}


class TarotService:
    """
    Tarot-related business logic service.

    Methods:
        - generate_dynamic_followup_questions(): Generate contextual follow-up questions
        - detect_tarot_topic(): Detect theme and sub-topic from chat text
    """

    def __init__(self):
        """Initialize TarotService."""
        self._gpt_generator = None

    def _get_gpt_generator(self):
        """Lazy load GPT generator to avoid circular imports."""
        if self._gpt_generator is None:
            from backend_ai.app.app import _generate_with_gpt4
            self._gpt_generator = _generate_with_gpt4
        return self._gpt_generator

    def _load_spread_config(self, theme: str) -> dict:
        """Load and cache spread configuration for a theme."""
        if theme in _SPREAD_CONFIG_CACHE:
            return _SPREAD_CONFIG_CACHE[theme]

        # Determine the data path
        spread_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data", "graph", "rules", "tarot", "spreads",
            f"{theme}_spreads.json"
        )

        try:
            if os.path.exists(spread_file):
                with open(spread_file, "r", encoding="utf-8") as f:
                    _SPREAD_CONFIG_CACHE[theme] = json.load(f)
                    return _SPREAD_CONFIG_CACHE[theme]
        except Exception as e:
            logger.warning(f"Could not load spread file {spread_file}: {e}")

        return {}

    def generate_dynamic_followup_questions(
        self,
        interpretation: str,
        cards: List[Dict],
        category: str,
        user_question: str = "",
        language: str = "ko",
        static_questions: Optional[List[str]] = None
    ) -> List[str]:
        """
        Generate dynamic, contextual follow-up questions based on the interpretation.
        Uses GPT to create specific, engaging questions that change with each reading.

        Args:
            interpretation: The full interpretation text
            cards: List of card dicts with 'name' and 'isReversed'
            category: Theme category (love, career, etc.)
            user_question: Original user question if any
            language: 'ko' or 'en'
            static_questions: Fallback static questions

        Returns:
            List of 5 dynamic follow-up questions
        """
        try:
            # Extract key elements from interpretation for context
            interpretation_preview = interpretation[:800] if len(interpretation) > 800 else interpretation
            card_names = [f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}" for c in cards]
            cards_str = ", ".join(card_names)

            # Detect reading tone from interpretation
            positive_keywords = ["기회", "성공", "행운", "긍정", "발전", "희망", "사랑", "축복", "성취", "기쁨",
                               "opportunity", "success", "luck", "positive", "growth", "hope", "love", "blessing", "joy"]
            challenging_keywords = ["주의", "경고", "위험", "도전", "갈등", "어려움", "장애", "시련", "조심",
                                   "caution", "warning", "danger", "challenge", "conflict", "difficulty", "obstacle"]

            tone = "neutral"
            positive_count = sum(1 for k in positive_keywords if k in interpretation.lower())
            challenging_count = sum(1 for k in challenging_keywords if k in interpretation.lower())

            if positive_count > challenging_count + 2:
                tone = "positive"
            elif challenging_count > positive_count + 2:
                tone = "challenging"

            # Build GPT prompt for generating dynamic questions
            is_korean = language == "ko"

            if is_korean:
                prompt = f"""당신은 전문 타로 리더입니다. 방금 제공된 타로 해석을 바탕으로, 사용자가 더 깊이 탐구하고 싶어할 만한 후속 질문 5개를 생성하세요.

## 해석 요약
카드: {cards_str}
카테고리: {category}
리딩 톤: {tone}
{'원래 질문: ' + user_question if user_question else ''}

## 해석 내용
{interpretation_preview}

## 질문 생성 지침
1. 해석에서 언급된 구체적인 내용/상징/조언에 기반한 질문
2. 사용자가 "와, 이걸 더 알고 싶다!" 라고 느낄 만큼 흥미로운 질문
3. 단순 예/아니오가 아닌, 깊이 있는 대화를 유도하는 질문
4. 카드 이름이나 상징을 구체적으로 언급
5. 각 질문은 서로 다른 관점 제시 (시기, 조언, 숨겨진 의미, 관계, 행동)

## 응답 형식
질문 5개를 줄바꿈으로 구분해서 작성하세요. 번호나 불릿 없이 질문만 작성.

예시:
{card_names[0] if card_names else '광대'} 카드가 암시하는 새로운 시작의 구체적인 타이밍은?
이 리딩에서 경고하는 숨겨진 장애물을 극복하는 방법은?"""
            else:
                prompt = f"""You are an expert tarot reader. Based on the tarot interpretation just provided, generate 5 follow-up questions the user would want to explore deeper.

## Reading Summary
Cards: {cards_str}
Category: {category}
Reading Tone: {tone}
{'Original Question: ' + user_question if user_question else ''}

## Interpretation
{interpretation_preview}

## Question Guidelines
1. Based on specific content/symbols/advice mentioned in the interpretation
2. Intriguing enough that user thinks "I want to know more about this!"
3. Open-ended questions that lead to deeper conversation
4. Specifically mention card names or symbols
5. Each question offers a different perspective (timing, advice, hidden meaning, relationships, actions)

## Response Format
Write 5 questions separated by newlines. No numbers or bullets, just questions.

Example:
What specific timing does {card_names[0] if card_names else 'The Fool'} suggest for this new beginning?
How can I overcome the hidden obstacles this reading warns about?"""

            # Generate with GPT-4o-mini for speed
            _generate_with_gpt4 = self._get_gpt_generator()
            response = _generate_with_gpt4(prompt, max_tokens=500, temperature=0.8, use_mini=True)

            # Parse response into list
            questions = [q.strip() for q in response.strip().split('\n') if q.strip() and len(q.strip()) > 10]

            # Ensure we have exactly 5 questions
            if len(questions) >= 5:
                return questions[:5]
            elif len(questions) > 0:
                # Pad with static questions if needed
                if static_questions:
                    remaining = 5 - len(questions)
                    questions.extend(static_questions[:remaining])
                return questions[:5]
            else:
                # Fallback to static
                return static_questions[:5] if static_questions else []

        except Exception as e:
            logger.warning(f"[TAROT] Dynamic question generation failed: {e}")
            return static_questions[:5] if static_questions else []

    def detect_tarot_topic(self, text: str) -> Dict:
        """
        Analyze chat text and detect the most relevant tarot theme and sub-topic.

        Args:
            text: Chat message or conversation text to analyze

        Returns:
            {
                "theme": "career",
                "sub_topic": "job_search",
                "korean": "취업은 언제",
                "confidence": 0.85,
                "card_count": 10,
                "matched_keywords": ["취업", "직장"]
            }
        """
        text_lower = text.lower()

        # Collect all matches with scores
        all_matches = []

        # Score each theme and sub-topic
        for theme, sub_topics in _TAROT_TOPIC_KEYWORDS.items():
            for sub_topic_id, sub_topic_data in sub_topics.items():
                matched = []
                for keyword in sub_topic_data["keywords"]:
                    if keyword.lower() in text_lower or keyword in text:
                        matched.append(keyword)

                if matched:
                    # Calculate raw score (not capped) for comparison
                    # - Base priority score (0.1 per priority point)
                    # - Keyword matches (0.2 per match)
                    # - Specificity bonus: longer keywords are more specific
                    priority_score = sub_topic_data["priority"] * 0.1
                    match_score = len(matched) * 0.2
                    avg_keyword_len = sum(len(k) for k in matched) / len(matched)
                    specificity_bonus = min(avg_keyword_len * 0.02, 0.2)

                    raw_score = priority_score + match_score + specificity_bonus

                    all_matches.append({
                        "theme": theme,
                        "sub_topic": sub_topic_id,
                        "korean": sub_topic_data["korean"],
                        "confidence": round(min(raw_score, 1.0), 2),
                        "_raw_score": raw_score,  # Internal, removed before return
                        "_priority": sub_topic_data["priority"],  # Internal
                        "matched_keywords": matched,
                    })

        # Sort by raw_score (desc), then by priority (desc) for tie-breaking
        all_matches.sort(key=lambda x: (x["_raw_score"], x["_priority"]), reverse=True)

        if all_matches:
            best_match = all_matches[0]
            # Remove internal fields
            del best_match["_raw_score"]
            del best_match["_priority"]
        else:
            best_match = {
                "theme": "life_path",
                "sub_topic": "general",
                "korean": "인생 전반",
                "confidence": 0.0,
                "matched_keywords": []
            }

        # Load spread configuration to get card count (cached)
        spread_data = self._load_spread_config(best_match["theme"])
        sub_topic_config = spread_data.get("sub_topics", {}).get(best_match["sub_topic"], {})

        best_match["card_count"] = sub_topic_config.get("card_count", 3)
        best_match["spread_name"] = sub_topic_config.get("spread_name", "")
        best_match["positions"] = sub_topic_config.get("positions", [])

        return best_match


# Module-level function exports for backward compatibility
def generate_dynamic_followup_questions(
    interpretation: str,
    cards: List[Dict],
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: Optional[List[str]] = None
) -> List[str]:
    """
    Module-level wrapper for TarotService.generate_dynamic_followup_questions().
    Provides backward compatibility with existing code.
    """
    service = TarotService()
    return service.generate_dynamic_followup_questions(
        interpretation=interpretation,
        cards=cards,
        category=category,
        user_question=user_question,
        language=language,
        static_questions=static_questions
    )


def detect_tarot_topic(text: str) -> Dict:
    """
    Module-level wrapper for TarotService.detect_tarot_topic().
    Provides backward compatibility with existing code.
    """
    service = TarotService()
    return service.detect_tarot_topic(text)
