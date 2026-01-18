# backend_ai/app/routers/tarot/context_detector.py
"""
Question context detection for tarot interpretation.
Analyzes user questions to provide appropriate interpretation context.
"""

from typing import Tuple, Optional


# Playful/unusual question keywords
PLAYFUL_KEYWORDS_KO = [
    "개한테", "고양이한테", "강아지한테", "동물",
    "키스", "뽀뽀", "핥", "물어",
    "라면", "밥 먹", "치킨", "피자", "짜장면",
    "게임", "유튜브", "넷플릭스", "틱톡",
    "머리 염색", "문신", "타투", "피어싱",
    "술 마", "담배", "복권", "로또",
    "외계인", "귀신", "유령", "좀비",
]

PLAYFUL_KEYWORDS_EN = [
    "kiss a dog", "kiss my dog", "pet", "lotto", "lottery"
]

PLAYFUL_KEYWORDS = PLAYFUL_KEYWORDS_KO + PLAYFUL_KEYWORDS_EN


def is_playful_question(question: str) -> bool:
    """Check if the question is playful/unusual."""
    q = question.lower()
    return any(kw in q for kw in PLAYFUL_KEYWORDS)


def detect_question_context(
    question: str,
    mapped_spread: str = ""
) -> Tuple[str, bool]:
    """
    Detect question context and return appropriate interpretation guidance.

    Args:
        question: User's question
        mapped_spread: Mapped spread type for additional context

    Returns:
        Tuple of (context_instruction, is_playful)
    """
    if not question:
        return "", False

    q = question.lower()

    # Check for playful questions first
    if is_playful_question(question):
        return (
            """질문자가 가벼운/재미있는 질문을 하고 있습니다.
유머러스하게 카드를 해석하되, 카드의 상징을 실제로 연결해주세요.
예: "개한테 키스할까?" → "광대 카드가 나왔네요—이 카드는 순수한 즐거움과 자유로운 행동을 나타내요. 반려견과의 교감은 순수한 사랑의 표현이에요. 다만 위생은 챙기시길!"
진지하게 거부하거나 무시하지 말고, 재치있게 답변하세요.""",
            True
        )

    # ========== 연애/관계 ==========
    if any(kw in q for kw in ["좋아", "관심", "호감", "날 어떻게", "마음이 있", "like me", "crush"]):
        return "질문자는 상대의 감정이 궁금합니다. 상대가 질문자를 어떻게 생각하는지, 관심이 있는지, 발전 가능성은 어떤지 위주로 해석하세요.", False

    if any(kw in q for kw in ["재회", "다시 만", "헤어진", "돌아올", "연락 올", "ex", "get back"]):
        return "질문자는 헤어진 사람과의 재회를 고민합니다. 상대의 현재 마음, 재결합 가능성, 장애물, 권고사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["고백", "말할까", "표현", "먼저", "confess", "tell them"]):
        return "질문자는 고백/표현을 고민합니다. 타이밍이 맞는지, 상대가 어떻게 받아들일지, 방법 위주로 해석하세요.", False

    if any(kw in q for kw in ["결혼", "프로포즈", "약혼", "marriage", "propose"]):
        return "질문자는 결혼/프로포즈를 고민합니다. 상대와의 궁합, 시기, 결혼 후 전망 위주로 해석하세요.", False

    if any(kw in q for kw in ["이별", "헤어질", "끝낼", "break up", "end relationship"]):
        return "질문자는 이별을 고민합니다. 관계를 끝내는 것이 맞는지, 아직 가능성이 있는지, 결정 후 전망 위주로 해석하세요.", False

    if any(kw in q for kw in ["바람", "불륜", "양다리", "cheating", "affair"]):
        return "질문자는 상대의 진실성을 걱정합니다. 상대가 정직한지, 숨기는 게 있는지 솔직하게 해석하세요.", False

    if any(kw in q for kw in ["썸", "소개팅", "만남", "인연", "dating", "meeting"]):
        return "질문자는 새로운 인연을 기대합니다. 좋은 인연이 언제 올지, 어떤 사람일지, 어떻게 준비할지 해석하세요.", False

    if any(kw in q for kw in ["싸웠", "다퉜", "화해", "사과", "fight", "make up"]):
        return "질문자는 상대와 갈등 상황입니다. 화해 가능성, 누가 먼저 다가가야 할지, 관계 회복 방법 위주로 해석하세요.", False

    # ========== 직장/커리어 ==========
    if mapped_spread == "entrepreneurship" or any(kw in q for kw in ["사업", "창업", "business", "startup"]):
        return "질문자는 사업/창업에 대해 묻고 있습니다. 사업 시작 시기, 성공 가능성, 주의점 위주로 해석하세요.", False

    if mapped_spread == "job_search" or any(kw in q for kw in ["취업", "취직", "job", "employment"]):
        return "질문자는 취업에 대해 묻고 있습니다. 합격 가능성, 준비 방향, 시기 위주로 해석하세요.", False

    if mapped_spread == "career_change" or any(kw in q for kw in ["이직", "퇴사", "그만두", "quit", "resign"]):
        return "질문자는 이직/퇴사를 고민 중입니다. 현 직장 vs 새 직장, 시기, 리스크 위주로 해석하세요.", False

    if any(kw in q for kw in ["면접", "interview"]):
        return "질문자는 면접 결과가 궁금합니다. 합격 가능성, 면접관의 인상, 보완할 점 위주로 해석하세요.", False

    if any(kw in q for kw in ["승진", "promotion"]):
        return "질문자는 승진을 기대합니다. 승진 가능성, 타이밍, 경쟁자 대비 강점 위주로 해석하세요.", False

    if any(kw in q for kw in ["상사", "직장 상사", "팀장", "boss", "manager"]):
        return "질문자는 상사와의 관계를 고민합니다. 상사가 어떻게 보는지, 관계 개선법 위주로 해석하세요.", False

    if any(kw in q for kw in ["동료", "팀원", "직장 동료", "coworker", "colleague"]):
        return "질문자는 동료 관계를 고민합니다. 협업 전망, 갈등 해결법 위주로 해석하세요.", False

    # ========== 시험/학업 ==========
    if any(kw in q for kw in ["시험", "합격", "붙을", "자격증", "exam", "test", "pass"]):
        return "질문자는 시험 합격 여부가 궁금합니다. 합격 가능성, 부족한 부분, 집중할 영역 위주로 해석하세요.", False

    if any(kw in q for kw in ["수능", "입시", "대학", "college", "university"]):
        return "질문자는 입시 결과가 궁금합니다. 합격 전망, 목표 학교와의 궁합, 준비 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["공부", "성적", "학점", "study", "grade"]):
        return "질문자는 학업 성과를 고민합니다. 성적 향상 가능성, 공부 방법, 집중해야 할 부분 위주로 해석하세요.", False

    # ========== 재물/금전 ==========
    if any(kw in q for kw in ["돈", "재물", "금전", "수입", "money", "income", "wealth"]):
        return "질문자는 재물운이 궁금합니다. 돈이 들어올 시기, 재정 상태 전망, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["투자", "주식", "코인", "부동산", "invest", "stock", "crypto"]):
        return "질문자는 투자를 고민합니다. 투자 시기, 수익 가능성, 리스크 위주로 해석하세요. 구체적 투자 조언은 피하되 에너지 흐름을 설명하세요.", False

    if any(kw in q for kw in ["사야", "살까", "구매", "구입", "buy", "purchase"]):
        return "질문자는 큰 구매를 고민합니다. 지금 사도 되는지, 기다려야 할지, 숨은 변수 위주로 해석하세요.", False

    if any(kw in q for kw in ["대출", "빚", "loan", "debt"]):
        return "질문자는 대출/부채를 고민합니다. 재정 부담, 상환 전망, 주의사항 위주로 해석하세요.", False

    # ========== 건강/웰빙 ==========
    if any(kw in q for kw in ["건강", "아픔", "병원", "수술", "health", "sick", "hospital"]):
        return "질문자는 건강을 걱정합니다. 건강 상태 전망, 주의해야 할 부분, 회복 가능성 위주로 해석하세요. 의료 조언은 피하세요.", False

    if any(kw in q for kw in ["다이어트", "살 빼", "운동", "diet", "weight", "exercise"]):
        return "질문자는 체중/건강관리를 고민합니다. 성공 가능성, 동기부여, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["스트레스", "우울", "불안", "멘탈", "힘들", "stress", "anxiety", "depression"]):
        return "질문자는 정서적으로 힘든 상태입니다. 공감과 위로를 담아 해석하고, 상황이 나아질 방향을 제시하세요.", False

    if any(kw in q for kw in ["잠", "수면", "불면", "피곤", "sleep", "tired", "insomnia"]):
        return "질문자는 휴식이 필요한 상태입니다. 에너지 회복 방법, 마음 정리 방향 위주로 해석하세요.", False

    # ========== 선택/결정 ==========
    if any(kw in q for kw in ["vs", "아니면", "or", "vs"]):
        return "질문자는 양자택일 상황입니다. 각 선택지의 장단점과 카드가 어느 쪽을 가리키는지 명확히 해석하세요.", False

    if any(kw in q for kw in ["할까 말까", "해야 할까", "결정", "선택", "decide", "choice"]):
        return "질문자는 중요한 결정을 앞두고 있습니다. 각 방향의 전망과 카드가 권하는 방향을 명확히 해석하세요.", False

    if any(kw in q for kw in ["언제", "시기", "타이밍", "when", "timing"]):
        return "질문자는 적절한 타이밍이 궁금합니다. 지금이 맞는지, 기다려야 할지, 행동 시점 위주로 해석하세요.", False

    # ========== 가족/인간관계 ==========
    if any(kw in q for kw in ["부모", "엄마", "아빠", "어머니", "아버지", "parent", "mom", "dad"]):
        return "질문자는 부모님과의 관계를 고민합니다. 소통 방법, 이해받는 법, 관계 개선 위주로 해석하세요.", False

    if any(kw in q for kw in ["자녀", "아이", "아들", "딸", "child", "kid", "son", "daughter"]):
        return "질문자는 자녀에 대해 고민합니다. 자녀의 상태, 양육 방향, 관계 발전 위주로 해석하세요.", False

    if any(kw in q for kw in ["친구", "우정", "friend", "friendship"]):
        return "질문자는 친구 관계를 고민합니다. 진정한 친구인지, 관계 유지 방법 위주로 해석하세요.", False

    if any(kw in q for kw in ["형제", "언니", "오빠", "누나", "동생", "sibling", "brother", "sister"]):
        return "질문자는 형제자매 관계를 고민합니다. 갈등 해결, 관계 회복 방향 위주로 해석하세요.", False

    # ========== 이사/여행/이동 ==========
    if any(kw in q for kw in ["이사", "move", "moving"]):
        return "질문자는 이사를 고민합니다. 이사 시기, 새 집의 기운, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["여행", "휴가", "travel", "trip", "vacation"]):
        return "질문자는 여행을 계획합니다. 여행 운, 좋은 시기, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["유학", "이민", "해외", "abroad", "overseas"]):
        return "질문자는 해외 진출을 고민합니다. 해외 운, 적응 가능성, 시기 위주로 해석하세요.", False

    # ========== 일상/기타 ==========
    if any(kw in q for kw in ["오늘", "today"]):
        return "질문자는 오늘 하루의 흐름이 궁금합니다. 오늘의 에너지, 주의할 점, 행운의 포인트 위주로 해석하세요.", False

    if any(kw in q for kw in ["이번 주", "this week"]):
        return "질문자는 이번 주 흐름이 궁금합니다. 주간 에너지, 좋은 날/주의할 날, 핵심 조언 위주로 해석하세요.", False

    if any(kw in q for kw in ["이번 달", "this month"]):
        return "질문자는 이번 달 운세가 궁금합니다. 월간 흐름, 기회, 주의사항 위주로 해석하세요.", False

    if any(kw in q for kw in ["올해", "this year", "2025", "2024"]):
        return "질문자는 연간 운세가 궁금합니다. 올해의 주요 테마, 기회와 도전, 전반적 흐름 위주로 해석하세요.", False

    if any(kw in q for kw in ["반려동물", "강아지", "고양이", "펫", "pet", "dog", "cat"]):
        return "질문자는 반려동물에 대해 묻습니다. 반려동물과의 인연, 관계, 케어 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["임신", "출산", "아기", "pregnancy", "baby", "pregnant"]):
        return "질문자는 임신/출산을 기대합니다. 임신 가능성, 시기, 준비 방향 위주로 해석하세요. 민감한 주제이므로 따뜻하게 해석하세요.", False

    if any(kw in q for kw in ["계약", "서명", "contract", "sign"]):
        return "질문자는 계약을 앞두고 있습니다. 계약 성사 가능성, 주의할 조항, 타이밍 위주로 해석하세요.", False

    if any(kw in q for kw in ["소송", "법적", "재판", "lawsuit", "legal", "court"]):
        return "질문자는 법적 문제가 있습니다. 결과 전망, 주의사항, 대응 방향 위주로 해석하세요.", False

    if any(kw in q for kw in ["분실", "잃어버", "찾을", "lost", "find", "missing"]):
        return "질문자는 분실물을 찾고 있습니다. 찾을 가능성, 방향, 시간 위주로 해석하세요.", False

    # ========== 자기 성장/내면 ==========
    if any(kw in q for kw in ["나는 누구", "정체성", "본질", "내 강점", "약점", "identity", "who am i"]):
        return "질문자는 자기 자신에 대해 탐구합니다. 핵심 동기, 강점, 약점, 성장 방향 위주로 깊이 있게 해석하세요.", False

    if any(kw in q for kw in ["그림자", "내면", "무의식", "트라우마", "shadow", "subconscious"]):
        return "질문자는 내면의 숨겨진 부분을 탐구합니다. 반복되는 패턴, 무의식적 두려움, 치유 방향 위주로 섬세하게 해석하세요.", False

    if any(kw in q for kw in ["성장", "발전", "변화", "자기계발", "growth", "development"]):
        return "질문자는 성장과 발전을 원합니다. 현재 배울 점, 극복할 과제, 다음 단계 위주로 해석하세요.", False

    if any(kw in q for kw in ["메시지", "우주", "신호", "운명", "message", "universe", "destiny"]):
        return "질문자는 우주/운명의 메시지를 듣고 싶어합니다. 카드가 전하는 심오한 메시지를 영적으로 해석하세요.", False

    if any(kw in q for kw in ["직관", "영감", "꿈", "비전", "intuition", "dream", "vision"]):
        return "질문자는 직관과 영감을 구합니다. 내면의 목소리, 꿈의 의미, 직관적 가이드 위주로 해석하세요.", False

    # ========== 현재 연인/커플 ==========
    if any(kw in q for kw in ["사귀는", "연인", "남자친구", "여자친구", "남친", "여친", "boyfriend", "girlfriend"]):
        return "질문자는 현재 연인과의 관계를 묻습니다. 상대의 마음, 관계 발전 가능성, 주의점 위주로 해석하세요.", False

    if any(kw in q for kw in ["우리 관계", "앞으로", "미래", "relationship future"]):
        return "질문자는 현재 관계의 미래를 알고 싶어합니다. 관계 발전 방향, 잠재력, 도전 과제 위주로 해석하세요.", False

    # ========== 솔로/인연 찾기 ==========
    if any(kw in q for kw in ["솔로", "혼자", "짝", "배필", "single", "soulmate"]):
        return "질문자는 인연을 찾고 있습니다. 좋은 인연이 언제/어디서 올지, 어떻게 준비할지, 본인의 매력 포인트 위주로 해석하세요.", False

    # ========== 워라밸/번아웃 ==========
    if any(kw in q for kw in ["워라밸", "일과 삶", "번아웃", "지침", "work life", "burnout", "exhausted"]):
        return "질문자는 일과 삶의 균형을 고민합니다. 에너지 분배, 우선순위, 회복 방법 위주로 해석하세요.", False

    # Default: no specific context
    return "", False


def is_yes_no_question(question: str) -> bool:
    """Check if the question is a yes/no type question."""
    q = question.lower() if question else ""
    yes_no_keywords = [
        "할까", "살까", "해야", "할지", "갈까", "볼까",
        "먹을까", "만날까", "시작할까", "그만둘까", "바꿀까"
    ]
    return any(kw in q for kw in yes_no_keywords)


def get_conclusion_instruction(question: str, is_korean: bool = True) -> str:
    """Get conclusion instruction based on question type."""
    if is_yes_no_question(question):
        return '마지막에 반드시 "결론: [질문에 대한 직접적인 답]" 형식으로 답하세요. 예: "결론: 지금은 하지 마라", "결론: 해도 좋다"'
    else:
        return '마지막에 "결론:" 으로 시작하는 핵심 메시지를 제시하세요.'
