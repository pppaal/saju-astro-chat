import pytest


USER_QUESTIONS = [
    "올해 이직 타이밍이 맞을까요?",
    "지금 만나는 사람과 결혼까지 갈 수 있을까요?",
    "이번 달 투자 결정을 서둘러도 될까요?",
    "건강 루틴을 어떻게 조정하는 게 좋을까요?",
    "가족과의 갈등이 언제 누그러질까요?",
    "창업을 시작해도 되는 시기인가요?",
    "해외 이동 계획을 밀어붙여도 될까요?",
    "지금 공부 방향을 바꾸는 게 맞을까요?",
    "계약서를 이번 주에 확정해도 괜찮을까요?",
    "올해 인간관계에서 가장 주의할 점은 뭔가요?",
    "Should I change jobs this quarter?",
    "Is this relationship moving toward commitment?",
    "Do I need to slow down on spending this month?",
    "What should I avoid in my current health rhythm?",
    "Is this a good time to launch my side project?",
    "How should I handle conflict with a business partner?",
    "Should I sign the offer right away?",
    "What pattern keeps repeating in my love life?",
    "How can I use this year's momentum more wisely?",
    "What is the most important caution signal right now?",
]


def _sample_saju():
    return {
        "dayMaster": {"heavenlyStem": {"name": "甲", "element": "목"}, "element": "목"},
        "pillars": {
            "month": {
                "heavenlyStem": {"name": "丙"},
                "earthlyBranch": {"name": "寅"},
            },
            "day": {
                "heavenlyStem": {"name": "甲"},
                "earthlyBranch": {"name": "子"},
            },
        },
        "fiveElements": {"wood": 35, "fire": 25, "earth": 15, "metal": 10, "water": 15},
        "currentDaeun": "丙寅",
        "currentSaeun": "甲午",
    }


def _sample_astro():
    return {
        "sun": {"sign": "Taurus", "house": 10},
        "moon": {"sign": "Cancer", "house": 7},
        "ascendant": {"sign": "Leo", "house": 1},
        "aspects": [
            {
                "from": {"name": "Sun"},
                "to": {"name": "Jupiter"},
                "type": "trine",
            }
        ],
    }


@pytest.mark.unit
def test_counselor_quality_gate_20_question_regression():
    from backend_ai.utils.text_utils import _assess_counselor_response_quality

    saju = _sample_saju()
    astro = _sample_astro()

    for index, question in enumerate(USER_QUESTIONS, start=1):
        response = (
            f"질문 초점은 '{question}' 이지만, 먼저 일간 甲 목과 현재 대운 丙寅 흐름을 기준으로 "
            "지금은 방향을 좁히고 과한 확정을 늦추는 편이 맞습니다. "
            "또한 태양 Taurus 가 10하우스에 놓이고 Moon Cancer 반응성이 커서 "
            "대외 결정보다 정서적 소모 관리가 중요합니다. "
            "Sun-Jupiter trine 이 주는 확장 기회는 분명하지만, 이번 주에는 작은 검증 단계를 "
            "먼저 거친 뒤 움직이는 쪽이 안정적입니다."
        )
        result = _assess_counselor_response_quality(response, "fusion", saju, astro)

        assert result["needs_repair"] is False, f"case-{index}: {question}"
        assert len(result["saju_hits"]) >= 1, f"case-{index}: {question}"
        assert len(result["astro_hits"]) >= 2, f"case-{index}: {question}"
