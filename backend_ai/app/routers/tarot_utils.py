"""
Tarot Routes Utility Functions
Helper functions for tarot route handlers.
"""
import re
from typing import Tuple

from .tarot_constants import (
    TAROT_THEME_MAPPING,
    TAROT_SUBTOPIC_MAPPING,
    PLAYFUL_KEYWORDS,
)


def map_tarot_theme(category: str, spread_id: str, user_question: str = "") -> Tuple[str, str]:
    """Map frontend theme/spread to backend theme/sub_topic, considering user's question."""
    # Check specific mapping first
    key = (category, spread_id)
    if key in TAROT_SUBTOPIC_MAPPING:
        return TAROT_SUBTOPIC_MAPPING[key]

    # Fall back to theme-only mapping
    mapped_theme = TAROT_THEME_MAPPING.get(category, category)

    # Dynamic sub_topic selection based on user question keywords
    if user_question and mapped_theme == "career":
        q = user_question.lower()
        if any(kw in q for kw in ["사업", "창업", "자영업", "business", "startup", "entrepreneur"]):
            return (mapped_theme, "entrepreneurship")
        elif any(kw in q for kw in ["취업", "취직", "입사", "job", "employment", "hire"]):
            return (mapped_theme, "job_search")
        elif any(kw in q for kw in ["이직", "퇴사", "전직", "resign", "quit", "change job"]):
            return (mapped_theme, "career_change")
        elif any(kw in q for kw in ["승진", "promotion", "raise"]):
            return (mapped_theme, "promotion")
        elif any(kw in q for kw in ["직장", "회사", "상사", "동료", "workplace", "boss", "colleague"]):
            return (mapped_theme, "workplace")

    elif user_question and mapped_theme == "love":
        q = user_question.lower()
        if any(kw in q for kw in ["짝사랑", "고백", "crush", "confess"]):
            return (mapped_theme, "crush")
        elif any(kw in q for kw in ["헤어", "이별", "breakup", "separate"]):
            return (mapped_theme, "breakup")
        elif any(kw in q for kw in ["결혼", "약혼", "marriage", "wedding"]):
            return (mapped_theme, "marriage")
        elif any(kw in q for kw in ["재회", "다시", "reconcile", "ex"]):
            return (mapped_theme, "reconciliation")
        elif any(kw in q for kw in ["만남", "소개팅", "dating", "meet"]):
            return (mapped_theme, "new_love")

    elif user_question and mapped_theme == "wealth":
        q = user_question.lower()
        if any(kw in q for kw in ["투자", "주식", "코인", "invest", "stock", "crypto"]):
            return (mapped_theme, "investment")
        elif any(kw in q for kw in ["빚", "대출", "부채", "debt", "loan"]):
            return (mapped_theme, "debt")
        elif any(kw in q for kw in ["저축", "절약", "save", "saving"]):
            return (mapped_theme, "saving")

    return (mapped_theme, spread_id)


def is_playful_question(question: str) -> bool:
    """Check if the question is playful/fun."""
    if not question:
        return False
    q = question.lower()
    return any(kw in q for kw in PLAYFUL_KEYWORDS)


def clean_ai_phrases(text: str) -> str:
    """
    Remove AI-sounding phrases from tarot interpretations.
    Makes output more natural and less robotic.
    """
    # AI 특유의 한국어 표현 패턴
    ai_patterns_ko = [
        (r'~하시는군요\.?', ''),
        (r'~느끼실 수 있어요\.?', ''),
        (r'~하시면 좋을 것 같습니다\.?', ''),
        (r'~해보시는 건 어떨까요\?', ''),
        (r'긍정적인 에너지가 느껴지네요\.?', ''),
        (r'좋은 결과가 있을 거예요\.?', ''),
        (r'잘 될 거예요\.?', ''),
        (r'걱정하지 마세요\.?', ''),
        (r'자신감을 가지시면 좋겠습니다\.?', ''),
        (r'~을 나타냅니다\.', '다.'),
        (r'~을 보여주고 있습니다\.', '다.'),
        (r'~라고 할 수 있습니다\.', '다.'),
        (r'희망적인 메시지를 전하고 있네요\.?', ''),
        (r'응원합니다\.?', ''),
        (r'파이팅이에요\.?', ''),
        (r'화이팅!?', ''),
    ]

    # AI 특유의 영어 표현 패턴
    ai_patterns_en = [
        (r'I hope this helps\.?', ''),
        (r'Feel free to ask.*', ''),
        (r'I\'m here to help\.?', ''),
        (r'This suggests that you should\.?', 'This suggests'),
        (r'It\'s important to remember that\.?', ''),
        (r'positive energy', 'energy'),
    ]

    result = text
    for pattern, replacement in ai_patterns_ko + ai_patterns_en:
        result = re.sub(pattern, replacement, result)

    # 연속된 공백/마침표 정리
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\.+', '.', result)
    result = result.strip()

    return result


def sanitize_messages(messages: list, sanitize_fn, max_content_length: int = 2000) -> list:
    """Sanitize a list of messages."""
    sanitized = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str):
            content = sanitize_fn(content, max_length=max_content_length)
        sanitized.append({"role": role, "content": content})
    return sanitized


def detect_question_context(question: str, mapped_spread: str) -> str:
    """Detect question intent and return context instruction for interpretation."""
    if not question:
        return ""

    q = question.lower()

    # Check for playful questions first
    if is_playful_question(question):
        return """질문자가 가벼운/재미있는 질문을 하고 있습니다.
유머러스하게 카드를 해석하되, 카드의 상징을 실제로 연결해주세요.
예: "개한테 키스할까?" → "광대 카드가 나왔네요—이 카드는 순수한 즐거움과 자유로운 행동을 나타내요. 반려견과의 교감은 순수한 사랑의 표현이에요. 다만 위생은 챙기시길!"
진지하게 거부하거나 무시하지 말고, 재치있게 답변하세요."""

    # Romance/Relationship contexts
    if any(kw in q for kw in ["좋아", "관심", "호감", "날 어떻게", "마음이 있", "like me", "crush"]):
        return "질문자는 상대의 감정이 궁금합니다. 상대가 질문자를 어떻게 생각하는지, 관심이 있는지, 발전 가능성은 어떤지 위주로 해석하세요."
    elif any(kw in q for kw in ["재회", "다시 만", "헤어진", "돌아올", "연락 올", "ex", "get back"]):
        return "질문자는 헤어진 사람과의 재회를 고민합니다. 상대의 현재 마음, 재결합 가능성, 장애물, 권고사항 위주로 해석하세요."
    elif any(kw in q for kw in ["고백", "말할까", "표현", "먼저", "confess", "tell them"]):
        return "질문자는 고백/표현을 고민합니다. 타이밍이 맞는지, 상대가 어떻게 받아들일지, 방법 위주로 해석하세요."
    elif any(kw in q for kw in ["결혼", "프로포즈", "약혼", "marriage", "propose"]):
        return "질문자는 결혼/프로포즈를 고민합니다. 상대와의 궁합, 시기, 결혼 후 전망 위주로 해석하세요."
    elif any(kw in q for kw in ["이별", "헤어질", "끝낼", "break up", "end relationship"]):
        return "질문자는 이별을 고민합니다. 관계를 끝내는 것이 맞는지, 아직 가능성이 있는지, 결정 후 전망 위주로 해석하세요."
    elif any(kw in q for kw in ["바람", "불륜", "양다리", "cheating", "affair"]):
        return "질문자는 상대의 진실성을 걱정합니다. 상대가 정직한지, 숨기는 게 있는지 솔직하게 해석하세요."
    elif any(kw in q for kw in ["썸", "소개팅", "만남", "인연", "dating", "meeting"]):
        return "질문자는 새로운 인연을 기대합니다. 좋은 인연이 언제 올지, 어떤 사람일지, 어떻게 준비할지 해석하세요."
    elif any(kw in q for kw in ["싸웠", "다퉜", "화해", "사과", "fight", "make up"]):
        return "질문자는 상대와 갈등 상황입니다. 화해 가능성, 누가 먼저 다가가야 할지, 관계 회복 방법 위주로 해석하세요."

    # Career contexts
    elif mapped_spread == "entrepreneurship" or any(kw in q for kw in ["사업", "창업", "business", "startup"]):
        return "질문자는 사업/창업에 대해 묻고 있습니다. 사업 시작 시기, 성공 가능성, 주의점 위주로 해석하세요."
    elif mapped_spread == "job_search" or any(kw in q for kw in ["취업", "취직", "job", "employment"]):
        return "질문자는 취업에 대해 묻고 있습니다. 합격 가능성, 준비 방향, 시기 위주로 해석하세요."
    elif mapped_spread == "career_change" or any(kw in q for kw in ["이직", "퇴사", "그만두", "quit", "resign"]):
        return "질문자는 이직/퇴사를 고민 중입니다. 현 직장 vs 새 직장, 시기, 리스크 위주로 해석하세요."
    elif any(kw in q for kw in ["면접", "interview"]):
        return "질문자는 면접 결과가 궁금합니다. 합격 가능성, 면접관의 인상, 보완할 점 위주로 해석하세요."
    elif any(kw in q for kw in ["승진", "promotion"]):
        return "질문자는 승진을 기대합니다. 승진 가능성, 타이밍, 경쟁자 대비 강점 위주로 해석하세요."

    # Study/Exam contexts
    elif any(kw in q for kw in ["시험", "합격", "붙을", "자격증", "exam", "test", "pass"]):
        return "질문자는 시험 합격 여부가 궁금합니다. 합격 가능성, 부족한 부분, 집중할 영역 위주로 해석하세요."
    elif any(kw in q for kw in ["수능", "입시", "대학", "college", "university"]):
        return "질문자는 입시 결과가 궁금합니다. 합격 전망, 목표 학교와의 궁합, 준비 방향 위주로 해석하세요."

    # Money/Finance contexts
    elif any(kw in q for kw in ["돈", "재물", "금전", "수입", "money", "income", "wealth"]):
        return "질문자는 재물운이 궁금합니다. 돈이 들어올 시기, 재정 상태 전망, 주의사항 위주로 해석하세요."
    elif any(kw in q for kw in ["투자", "주식", "코인", "부동산", "invest", "stock", "crypto"]):
        return "질문자는 투자를 고민합니다. 투자 시기, 수익 가능성, 리스크 위주로 해석하세요. 구체적 투자 조언은 피하되 에너지 흐름을 설명하세요."

    # Health contexts
    elif any(kw in q for kw in ["건강", "아픔", "병원", "수술", "health", "sick", "hospital"]):
        return "질문자는 건강을 걱정합니다. 건강 상태 전망, 주의해야 할 부분, 회복 가능성 위주로 해석하세요. 의료 조언은 피하세요."
    elif any(kw in q for kw in ["스트레스", "우울", "불안", "멘탈", "힘들", "stress", "anxiety", "depression"]):
        return "질문자는 정서적으로 힘든 상태입니다. 공감과 위로를 담아 해석하고, 상황이 나아질 방향을 제시하세요."

    # Decision contexts
    elif any(kw in q for kw in ["vs", "아니면", "or"]):
        return "질문자는 양자택일 상황입니다. 각 선택지의 장단점과 카드가 어느 쪽을 가리키는지 명확히 해석하세요."
    elif any(kw in q for kw in ["할까 말까", "해야 할까", "결정", "선택", "decide", "choice"]):
        return "질문자는 중요한 결정을 앞두고 있습니다. 각 방향의 전망과 카드가 권하는 방향을 명확히 해석하세요."
    elif any(kw in q for kw in ["언제", "시기", "타이밍", "when", "timing"]):
        return "질문자는 적절한 타이밍이 궁금합니다. 지금이 맞는지, 기다려야 할지, 행동 시점 위주로 해석하세요."

    # Daily/Time-based contexts
    elif any(kw in q for kw in ["오늘", "today"]):
        return "질문자는 오늘 하루의 흐름이 궁금합니다. 오늘의 에너지, 주의할 점, 행운의 포인트 위주로 해석하세요."
    elif any(kw in q for kw in ["이번 주", "this week"]):
        return "질문자는 이번 주 흐름이 궁금합니다. 주간 에너지, 좋은 날/주의할 날, 핵심 조언 위주로 해석하세요."
    elif any(kw in q for kw in ["이번 달", "this month"]):
        return "질문자는 이번 달 운세가 궁금합니다. 월간 흐름, 기회, 주의사항 위주로 해석하세요."
    elif any(kw in q for kw in ["올해", "this year", "2025", "2024"]):
        return "질문자는 연간 운세가 궁금합니다. 올해의 주요 테마, 기회와 도전, 전반적 흐름 위주로 해석하세요."

    return ""
