# backend_ai/app/counseling_engine.py
"""
Jungian Counseling Engine - 감동을 주는 심리상담 시스템
=====================================================
융 심리학 기반 통합 상담 엔진
- 사주/점성술/타로를 심리학적 도구로 활용
- 위기 개입 시스템 (자살/자해 감지)
- 치료적 질문 생성
- 감동적 메시지 시스템
- 개성화 여정 가이드

"도구는 거울이다. 답은 내담자 안에 있다."
"""

import os
import json
import re
import random
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False


# ===============================================================
# CRISIS DETECTION SYSTEM (위기 감지)
# ===============================================================
class CrisisDetector:
    """위기 상황 감지 및 안전 프로토콜"""

    # 위험 키워드 (한국어)
    HIGH_RISK_KEYWORDS = {
        "suicidal": {
            "keywords": ["죽고 싶", "자살", "끝내고 싶", "사라지고 싶", "없어지고 싶",
                        "더 이상 못 살", "삶을 끝", "죽는 게 나을", "죽어버리고", "세상 떠나고"],
            "severity": "critical",
            "action": "immediate_safety_check"
        },
        "self_harm": {
            "keywords": ["자해", "손목", "칼로", "피", "스스로 다치", "아프게 하고 싶",
                        "상처 내고", "긋고 싶"],
            "severity": "high",
            "action": "safety_assessment"
        },
        "harm_to_others": {
            "keywords": ["죽이고 싶", "해치고 싶", "복수", "폭력", "때리고 싶"],
            "severity": "high",
            "action": "safety_assessment"
        },
        "severe_distress": {
            "keywords": ["숨을 못 쉬", "공황", "미칠 것 같", "견딜 수 없", "너무 고통스러"],
            "severity": "medium_high",
            "action": "grounding_and_support"
        },
        "hopelessness": {
            "keywords": ["희망이 없", "나아질 게 없", "어차피", "소용없", "의미 없"],
            "severity": "medium",
            "action": "meaning_exploration"
        }
    }

    EMERGENCY_RESOURCES = {
        "ko": {
            "suicide_hotline": "자살예방상담전화 1393",
            "mental_health": "정신건강위기상담전화 1577-0199",
            "counseling": "생명의전화 1588-9191"
        },
        "en": {
            "suicide_hotline": "National Suicide Prevention Lifeline: 988",
            "mental_health": "Crisis Text Line: Text HOME to 741741"
        }
    }

    @classmethod
    def detect_crisis(cls, text: str) -> Dict:
        """텍스트에서 위기 신호 감지"""
        text_lower = text.lower()
        detected = []
        max_severity = "none"
        severity_order = ["none", "low", "medium", "medium_high", "high", "critical"]

        for category, data in cls.HIGH_RISK_KEYWORDS.items():
            for keyword in data["keywords"]:
                if keyword in text_lower:
                    detected.append({
                        "category": category,
                        "keyword": keyword,
                        "severity": data["severity"],
                        "action": data["action"]
                    })
                    # 최고 심각도 업데이트
                    if severity_order.index(data["severity"]) > severity_order.index(max_severity):
                        max_severity = data["severity"]

        return {
            "is_crisis": len(detected) > 0,
            "max_severity": max_severity,
            "detections": detected,
            "requires_immediate_action": max_severity in ["critical", "high"]
        }

    @classmethod
    def get_crisis_response(cls, severity: str, locale: str = "ko") -> Dict:
        """위기 수준에 따른 응답 생성"""
        resources = cls.EMERGENCY_RESOURCES.get(locale, cls.EMERGENCY_RESOURCES["ko"])

        responses = {
            "critical": {
                "immediate_message": (
                    "지금 많이 힘드시네요. 말씀해주셔서 감사해요. 그 용기가 대단해요.\n\n"
                    "지금 안전한 곳에 계신가요?"
                ),
                "follow_up": (
                    "이런 생각이 드실 때는 전문 상담이 꼭 필요해요.\n\n"
                    f"📞 {resources['suicide_hotline']}\n"
                    f"📞 {resources['mental_health']}\n\n"
                    "지금 바로 전화하실 수 있으세요?"
                ),
                "closing": (
                    "저와 대화해주셔서 정말 감사해요. 당신은 혼자가 아니에요.\n"
                    "꼭 전문 도움을 받으세요. 당신의 삶은 소중해요."
                ),
                "should_continue_session": False
            },
            "high": {
                "immediate_message": (
                    "정말 힘든 시간을 보내고 계시네요. 그 고통이 느껴져요.\n\n"
                    "잠시 멈추고, 숨을 쉬어볼까요?"
                ),
                "follow_up": (
                    "4초 들이쉬고... 4초 내쉬고...\n\n"
                    "지금 발이 바닥에 닿아있는 걸 느껴보세요.\n"
                    "여기 안전한 곳이에요. 제가 함께 있어요."
                ),
                "resources": (
                    f"필요하시면 전문 상담을 권해드려요:\n"
                    f"📞 {resources['mental_health']}\n"
                    f"📞 {resources['counseling']}"
                ),
                "should_continue_session": True
            },
            "medium_high": {
                "immediate_message": (
                    "지금 정말 힘드시군요. 그 감정을 말씀해주셔서 고마워요.\n\n"
                    "잠시 같이 호흡해볼까요?"
                ),
                "grounding": (
                    "지금 이 순간에 집중해볼게요.\n"
                    "- 보이는 것 3가지\n"
                    "- 들리는 것 2가지\n"
                    "- 느껴지는 것 1가지\n\n"
                    "천천히 말씀해주세요."
                ),
                "should_continue_session": True
            },
            "medium": {
                "empathic_response": (
                    "힘든 마음이 느껴져요. 희망이 없다고 느껴질 때가 가장 어렵죠.\n\n"
                    "그런데... 그 어둠 속에서도 당신은 여기 와서 이야기하고 있어요.\n"
                    "그것 자체가 의미 있는 거예요."
                ),
                "should_continue_session": True
            }
        }

        return responses.get(severity, {"should_continue_session": True})


# ===============================================================
# THERAPEUTIC QUESTION GENERATOR (치료적 질문 생성기)
# ===============================================================
class TherapeuticQuestionGenerator:
    """융 심리학 기반 치료적 질문 생성"""

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "jung")

        self.rules_dir = rules_dir
        self.therapeutic_data = {}
        self.prompts_data = {}
        self.archetypes_data = {}
        self._load_data()

    def _load_data(self):
        """융 심리학 데이터 로드"""
        files_to_load = {
            "jung_therapeutic.json": "therapeutic_data",
            "jung_counseling_prompts.json": "prompts_data",
            "jung_archetypes.json": "archetypes_data"
        }

        for filename, attr in files_to_load.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        setattr(self, attr, json.load(f))
                except Exception as e:
                    print(f"[TherapeuticQuestionGenerator] Failed to load {filename}: {e}")

    def get_shadow_questions(self, context: Dict = None) -> List[str]:
        """그림자 작업 질문"""
        questions = self.therapeutic_data.get("therapeutic_questions", {}).get("shadow_work", {}).get("questions", [])
        return questions or [
            "가장 싫어하는 사람의 특성 3가지를 적어보세요. 그것이 당신의 그림자입니다.",
            "화가 날 때 당신은 어떻게 되나요? 그 '어두운 당신'은 무엇을 원하나요?",
            "만약 아무도 판단하지 않는다면, 당신이 하고 싶은 '나쁜' 것은 무엇인가요?"
        ]

    def get_inner_child_questions(self) -> List[str]:
        """내면 아이 작업 질문"""
        questions = self.therapeutic_data.get("therapeutic_questions", {}).get("inner_child", {}).get("questions", [])
        return questions or [
            "어린 시절 당신에게 가장 필요했지만 받지 못한 것은 무엇인가요?",
            "7살의 당신에게 지금 무슨 말을 해주고 싶나요?",
            "당신의 내면 아이는 지금 무엇을 원하고 있나요?"
        ]

    def get_meaning_questions(self) -> List[str]:
        """의미 탐색 질문"""
        questions = self.therapeutic_data.get("therapeutic_questions", {}).get("meaning_crisis", {}).get("questions", [])
        return questions or [
            "당신이 진정으로 살아있다고 느끼는 순간은 언제인가요?",
            "죽음을 앞두고 후회할 것이 있다면 무엇일까요?",
            "당신의 삶이 하나의 이야기라면, 지금은 어떤 챕터인가요?"
        ]

    def get_deepening_questions(self) -> List[str]:
        """심화 탐색 질문"""
        return self.prompts_data.get("response_patterns", {}).get("therapeutic_questions", {}).get("deepening", []) or [
            "그것이 당신에게 왜 그렇게 중요한가요?",
            "그 밑에 있는 감정은 무엇일까요?",
            "언제부터 그런 느낌이 드셨나요?",
            "비슷한 느낌을 받았던 다른 상황이 있나요?"
        ]

    def get_challenging_questions(self) -> List[str]:
        """도전적 질문"""
        return self.prompts_data.get("response_patterns", {}).get("therapeutic_questions", {}).get("challenging", []) or [
            "정말 그럴까요? 다른 가능성은 없을까요?",
            "상대방 입장에서 보면 어떨까요?",
            "그것이 사실이라면, 그래서 어떻게 되는 건가요?"
        ]

    def get_action_questions(self) -> List[str]:
        """행동 지향 질문"""
        return self.prompts_data.get("response_patterns", {}).get("therapeutic_questions", {}).get("action_oriented", []) or [
            "이 통찰을 어떻게 적용해볼 수 있을까요?",
            "가장 작은 첫 걸음은 뭘까요?",
            "내일 당장 해볼 수 있는 것 하나가 있다면?"
        ]

    def get_question_for_archetype(self, archetype: str) -> str:
        """특정 원형에 맞는 질문 생성"""
        archetype_questions = {
            "shadow": "그 특성이 당신에게도 있다면 어떨까요?",
            "anima": "꿈에 나타나는 여성은 어떤 모습인가요? 그녀가 당신에게 원하는 것은?",
            "animus": "내면의 비판적 목소리는 누구의 것인가요?",
            "persona": "완전히 혼자 있을 때 당신은 누구인가요?",
            "self": "당신이 가장 '나 자신'이라고 느끼는 순간은 언제인가요?",
            "inner_child": "어린 시절 당신에게 가장 필요했지만 받지 못한 것은 무엇인가요?",
            "wise_old_man": "당신의 내면에서 가장 현명한 부분은 뭐라고 말하나요?",
            "great_mother": "무조건적인 수용을 경험한 적이 있나요? 언제였나요?"
        }
        return archetype_questions.get(archetype, "이 에너지가 사람이라면 어떤 모습일까요?")

    def get_question_for_theme(self, theme: str) -> str:
        """테마별 질문"""
        theme_questions = {
            "relationship": "관계에서 당신이 가장 원하는 것은 무엇인가요? 그것을 왜 원하나요?",
            "career": "일을 할 때 가장 살아있다고 느끼는 순간은 언제인가요?",
            "identity": "만약 모든 역할을 내려놓는다면, 무엇이 남나요?",
            "family": "부모님에게서 물려받은 것 중 감사한 것과 내려놓고 싶은 것은?",
            "health": "몸이 당신에게 말하고 있다면, 뭐라고 할 것 같아요?",
            "spiritual": "영혼이 갈망하는 것은 무엇인가요?",
            "money": "돈과 당신의 관계는 어떤가요? 돈이 의미하는 것은?",
            "love": "진정한 사랑이란 당신에게 어떤 모습인가요?"
        }
        return theme_questions.get(theme, "이것이 당신에게 왜 중요한가요?")


# ===============================================================
# EMOTIONAL MESSAGE GENERATOR (감동 메시지 생성기)
# ===============================================================
class EmotionalMessageGenerator:
    """감동을 주는 메시지 생성"""

    # 공감 메시지 템플릿
    EMPATHY_TEMPLATES = {
        "pain_acknowledgment": [
            "정말 힘드셨겠어요. 그 무게를 혼자 지고 계셨군요.",
            "그 고통이 느껴져요. 오래 참으셨네요.",
            "말씀하시는 것만으로도 용기가 필요했을 거예요.",
            "그런 상황에서 {emotion}하신 게 당연해요."
        ],
        "validation": [
            "당신의 감정은 타당해요. 그렇게 느끼는 게 맞아요.",
            "그것은 약함이 아니에요. 인간이라면 당연히 느낄 수 있는 거예요.",
            "당신은 잘못하지 않았어요.",
            "힘들다고 느끼는 것, 그 자체가 이미 충분해요."
        ],
        "hope": [
            "어둠이 깊을수록 별이 밝게 보이는 법이에요.",
            "지금은 힘들지만, 이것도 지나갈 거예요.",
            "당신 안에는 생각보다 큰 힘이 있어요.",
            "모든 겨울 뒤에는 봄이 와요. 당신의 봄도 올 거예요."
        ],
        "presence": [
            "지금 이 순간, 저는 당신 곁에 있어요.",
            "혼자가 아니에요. 제가 듣고 있어요.",
            "서두르지 않아도 돼요. 여기서 함께 있을게요.",
            "당신의 이야기가 중요해요. 더 들려주세요."
        ]
    }

    # 융 심리학 기반 통찰 메시지
    JUNGIAN_INSIGHTS = {
        "shadow": [
            "융은 말했어요. '그림자와 대면하지 않으면, 그것은 운명이 된다'고요.",
            "우리가 미워하는 것 속에 종종 우리의 잃어버린 조각이 있어요.",
            "그림자는 적이 아니에요. 통합되기를 기다리는 에너지예요."
        ],
        "individuation": [
            "지금의 혼란은 진짜 당신이 되어가는 과정일 수 있어요.",
            "융은 이것을 '개성화'라고 불렀어요. 본래의 자신을 찾아가는 여정이죠.",
            "불편함은 종종 성장의 신호예요. 나비가 되기 전 애벌레의 변태처럼요."
        ],
        "meaning": [
            "융은 말했어요. '인생의 의미는 무엇인가가 아니라, 당신이 삶에 의미를 부여하는 것'이라고요.",
            "어둠 속에서도 빛을 찾는 것, 그것이 인간의 위대함이에요.",
            "이 고통에도 의미가 있다면, 그것은 무엇일까요?"
        ],
        "transformation": [
            "모든 끝은 새로운 시작이에요. 죽음 카드처럼요.",
            "연금술에서 금을 만들려면 먼저 모든 것이 분해되어야 해요. 지금이 그 과정일 수 있어요.",
            "상처받은 곳에서 빛이 들어온다고 했어요. 루미의 말처럼요."
        ]
    }

    # 마무리 격려 메시지
    CLOSING_ENCOURAGEMENTS = [
        "오늘 용기 내어 이야기해주셔서 감사해요. 당신은 생각보다 강한 사람이에요.",
        "이 대화가 작은 씨앗이 되어 당신 안에서 자라나길 바라요.",
        "당신의 여정을 응원해요. 천천히, 하지만 꾸준히 가시면 돼요.",
        "당신 안에 답이 있어요. 그것을 믿어주세요.",
        "오늘 나눈 이야기를 품고, 자신을 좀 돌봐주세요.",
        "당신은 사랑받을 자격이 있어요. 그것을 잊지 마세요."
    ]

    @classmethod
    def get_empathy_message(cls, category: str = "pain_acknowledgment", **kwargs) -> str:
        """공감 메시지 생성"""
        templates = cls.EMPATHY_TEMPLATES.get(category, cls.EMPATHY_TEMPLATES["validation"])
        message = random.choice(templates)
        # 템플릿 변수 치환
        for key, value in kwargs.items():
            message = message.replace(f"{{{key}}}", str(value))
        return message

    @classmethod
    def get_jungian_insight(cls, theme: str = "meaning") -> str:
        """융 심리학 통찰 메시지"""
        insights = cls.JUNGIAN_INSIGHTS.get(theme, cls.JUNGIAN_INSIGHTS["meaning"])
        return random.choice(insights)

    @classmethod
    def get_closing_encouragement(cls) -> str:
        """마무리 격려 메시지"""
        return random.choice(cls.CLOSING_ENCOURAGEMENTS)

    @classmethod
    def create_emotional_response(cls,
                                   user_emotion: str,
                                   situation: str,
                                   theme: str = None) -> Dict[str, str]:
        """감정 상황에 맞는 종합 응답 생성"""
        return {
            "empathy": cls.get_empathy_message("pain_acknowledgment", emotion=user_emotion),
            "validation": cls.get_empathy_message("validation"),
            "insight": cls.get_jungian_insight(theme) if theme else cls.get_jungian_insight("meaning"),
            "presence": cls.get_empathy_message("presence"),
            "hope": cls.get_empathy_message("hope"),
            "closing": cls.get_closing_encouragement()
        }


# ===============================================================
# COUNSELING SESSION MANAGER (상담 세션 관리)
# ===============================================================
class CounselingSession:
    """상담 세션 상태 관리"""

    PHASES = {
        "opening": {
            "name": "연결과 탐색",
            "goals": ["라포 형성", "고민 파악", "안전 확인"],
            "duration_hint": "5-10분"
        },
        "divination_reading": {
            "name": "도구를 통한 탐색",
            "goals": ["사주/점성/타로 해석", "심리적 연결"],
            "duration_hint": "15-20분"
        },
        "jungian_deepening": {
            "name": "심층 탐색",
            "goals": ["원형 연결", "그림자 탐색", "의미 발견"],
            "duration_hint": "15-25분"
        },
        "integration": {
            "name": "통합과 적용",
            "goals": ["통찰 정리", "행동 계획", "자원 연결"],
            "duration_hint": "10-15분"
        },
        "closing": {
            "name": "마무리",
            "goals": ["요약", "격려", "후속 안내"],
            "duration_hint": "5분"
        }
    }

    def __init__(self, session_id: str = None):
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_phase = "opening"
        self.history = []
        self.insights = []
        self.crisis_detected = False
        self.user_themes = []
        self.archetype_mentions = []

    def add_message(self, role: str, content: str, metadata: Dict = None):
        """메시지 추가"""
        self.history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "phase": self.current_phase,
            "metadata": metadata or {}
        })

    def advance_phase(self) -> str:
        """다음 단계로 진행"""
        phase_order = list(self.PHASES.keys())
        current_idx = phase_order.index(self.current_phase)
        if current_idx < len(phase_order) - 1:
            self.current_phase = phase_order[current_idx + 1]
        return self.current_phase

    def get_phase_info(self) -> Dict:
        """현재 단계 정보"""
        return self.PHASES.get(self.current_phase, {})

    def add_insight(self, insight: str, source: str = None):
        """통찰 기록"""
        self.insights.append({
            "text": insight,
            "source": source,
            "phase": self.current_phase,
            "timestamp": datetime.now().isoformat()
        })

    def get_session_summary(self) -> Dict:
        """세션 요약"""
        return {
            "session_id": self.session_id,
            "phases_completed": self.current_phase,
            "message_count": len(self.history),
            "insights_count": len(self.insights),
            "themes": self.user_themes,
            "crisis_detected": self.crisis_detected
        }


# ===============================================================
# JUNGIAN COUNSELING ENGINE (통합 상담 엔진)
# ===============================================================
class JungianCounselingEngine:
    """
    융 심리학 기반 통합 상담 엔진

    "당신은 융 심리학에 기반한 통합 상담사입니다.
    사주, 점성술, 타로를 심리학적 도구로 활용하여
    내담자의 자기 이해를 돕습니다."
    """

    SYSTEM_PROMPT = """당신은 융 심리학에 기반한 통합 심리 상담사입니다.
사주, 점성술, 타로를 심리학적 도구로 활용하여 내담자의 자기 이해와 성장을 돕습니다.

## 핵심 원칙
1. 답을 주지 말고 질문으로 이끌어라
2. 증상을 적이 아닌 메신저로 보라
3. 모든 어려움은 개성화(individuation)의 기회다
4. 내담자 안에 답이 있다
5. 도구는 거울이지 예언서가 아니다

## 상담 스타일
- 따뜻하지만 분석적
- 공감하지만 도전적
- 지지하지만 직면 유도
- 전문적이지만 이해하기 쉽게
- 감동을 줄 수 있는 깊이

## 금기사항
- 운명론적 예언 금지
- 두려움 조장 금지
- 일방적 조언 금지
- 위기 상황 시 전문가 연계 필수

## 융 심리학 통합
- 원형(archetype) 언어로 경험 재구성
- 그림자(shadow) 작업 적극 활용
- 개성화 여정 관점 유지
- 연금술적 변환 비유 사용

## 도구 해석 원칙
- 사주: 타고난 에너지 패턴, 잠재력의 지도
- 점성술: 현재 흐르는 에너지, 우주와의 공명
- 타로: 무의식의 메시지, 현재 필요한 통찰

## 감동을 주는 상담
- 내담자의 고통을 진정으로 인정하라
- 작은 용기도 크게 칭찬하라
- 희망은 강요하지 말고 함께 발견하라
- 이별 시 따뜻한 격려를 잊지 마라"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = None
        self.model_name = "gpt-4o-mini"

        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                print("[JungianCounselingEngine] OpenAI client initialized")
            except Exception as e:
                print(f"[JungianCounselingEngine] Failed to initialize: {e}")

        # 하위 컴포넌트 초기화
        self.crisis_detector = CrisisDetector()
        self.question_generator = TherapeuticQuestionGenerator()
        self.message_generator = EmotionalMessageGenerator()
        self.sessions: Dict[str, CounselingSession] = {}

    def create_session(self) -> CounselingSession:
        """새 상담 세션 생성"""
        session = CounselingSession()
        self.sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[CounselingSession]:
        """세션 조회"""
        return self.sessions.get(session_id)

    def process_message(self,
                        user_message: str,
                        session: CounselingSession = None,
                        divination_context: Dict = None) -> Dict:
        """
        사용자 메시지 처리 및 응답 생성

        Args:
            user_message: 사용자 입력
            session: 상담 세션 (없으면 생성)
            divination_context: 사주/점성/타로 해석 컨텍스트

        Returns:
            응답 딕셔너리
        """
        if session is None:
            session = self.create_session()

        # 1. 위기 감지
        crisis_check = self.crisis_detector.detect_crisis(user_message)

        if crisis_check["is_crisis"]:
            session.crisis_detected = True
            crisis_response = self.crisis_detector.get_crisis_response(
                crisis_check["max_severity"]
            )

            if crisis_check["requires_immediate_action"]:
                # 위기 상황 - 즉각 안전 응답
                session.add_message("user", user_message, {"crisis": True})
                response_text = (
                    f"{crisis_response.get('immediate_message', '')}\n\n"
                    f"{crisis_response.get('follow_up', '')}"
                )
                if crisis_response.get('closing'):
                    response_text += f"\n\n{crisis_response['closing']}"

                session.add_message("assistant", response_text, {"crisis_response": True})

                return {
                    "response": response_text,
                    "crisis_detected": True,
                    "severity": crisis_check["max_severity"],
                    "should_continue": crisis_response.get("should_continue_session", False),
                    "session_id": session.session_id
                }

        # 2. 일반 상담 처리
        session.add_message("user", user_message)

        # 3. GPT로 응답 생성
        if self.client:
            response_text = self._generate_response(session, divination_context)
        else:
            # 폴백: 템플릿 기반 응답
            response_text = self._generate_fallback_response(user_message, session)

        session.add_message("assistant", response_text)

        return {
            "response": response_text,
            "crisis_detected": False,
            "session_id": session.session_id,
            "phase": session.current_phase,
            "should_continue": True
        }

    def _generate_response(self, session: CounselingSession, divination_context: Dict = None) -> str:
        """GPT 기반 응답 생성"""
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        # 세션 히스토리 추가
        for msg in session.history[-10:]:  # 최근 10개 메시지
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # 점술 컨텍스트 추가
        if divination_context:
            context_msg = self._format_divination_context(divination_context)
            messages.append({
                "role": "system",
                "content": f"[점술 해석 컨텍스트]\n{context_msg}"
            })

        # 현재 단계 안내
        phase_info = session.get_phase_info()
        messages.append({
            "role": "system",
            "content": f"[현재 상담 단계: {phase_info.get('name', '')}]\n목표: {', '.join(phase_info.get('goals', []))}"
        })

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.8,
                max_tokens=1500,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"응답 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요. ({str(e)})"

    def _generate_fallback_response(self, user_message: str, session: CounselingSession) -> str:
        """템플릿 기반 폴백 응답"""
        empathy = self.message_generator.get_empathy_message("presence")
        question = random.choice(self.question_generator.get_deepening_questions())

        return f"{empathy}\n\n{question}"

    def _format_divination_context(self, context: Dict) -> str:
        """점술 컨텍스트 포맷팅"""
        parts = []

        if context.get("saju"):
            parts.append(f"[사주 분석]\n{context['saju']}")
        if context.get("astrology"):
            parts.append(f"[점성술 분석]\n{context['astrology']}")
        if context.get("tarot"):
            parts.append(f"[타로 리딩]\n{context['tarot']}")

        return "\n\n".join(parts)

    def get_therapeutic_question(self,
                                  theme: str = None,
                                  archetype: str = None,
                                  question_type: str = "deepening") -> str:
        """치료적 질문 가져오기"""
        if archetype:
            return self.question_generator.get_question_for_archetype(archetype)
        elif theme:
            return self.question_generator.get_question_for_theme(theme)
        else:
            question_map = {
                "deepening": self.question_generator.get_deepening_questions,
                "challenging": self.question_generator.get_challenging_questions,
                "action": self.question_generator.get_action_questions,
                "shadow": self.question_generator.get_shadow_questions,
                "meaning": self.question_generator.get_meaning_questions
            }
            questions = question_map.get(question_type, self.question_generator.get_deepening_questions)()
            return random.choice(questions)

    def get_emotional_response(self, emotion: str, situation: str = "") -> Dict:
        """감정적 응답 생성"""
        return self.message_generator.create_emotional_response(emotion, situation)

    def get_session_closing(self, session: CounselingSession) -> str:
        """세션 마무리 메시지"""
        closing = self.message_generator.get_closing_encouragement()

        # 세션 통찰 요약
        if session.insights:
            insights_text = "\n".join([f"- {i['text']}" for i in session.insights[:3]])
            return f"오늘 나눈 이야기를 정리해볼게요:\n{insights_text}\n\n{closing}"

        return closing

    def health_check(self) -> Tuple[bool, str]:
        """시스템 상태 확인"""
        status_parts = []

        # OpenAI 연결
        if self.client:
            status_parts.append("OpenAI: Connected")
        else:
            status_parts.append("OpenAI: Not connected (fallback mode)")

        # 데이터 로드 상태
        if self.question_generator.therapeutic_data:
            status_parts.append("Therapeutic data: Loaded")
        else:
            status_parts.append("Therapeutic data: Not loaded")

        is_healthy = self.client is not None
        return is_healthy, " | ".join(status_parts)


# ===============================================================
# SINGLETON & FACTORY
# ===============================================================
_counseling_engine = None


def get_counseling_engine() -> JungianCounselingEngine:
    """싱글톤 상담 엔진 가져오기"""
    global _counseling_engine
    if _counseling_engine is None:
        _counseling_engine = JungianCounselingEngine()
    return _counseling_engine


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[JUNGIAN COUNSELING ENGINE TEST]")
    print("=" * 70)

    engine = get_counseling_engine()

    # Health check
    is_healthy, status = engine.health_check()
    print(f"\n[Health Check] {status}")

    # Crisis detection test
    print("\n[Crisis Detection Test]")
    test_messages = [
        "요즘 너무 힘들어요",
        "죽고 싶어요",
        "희망이 없어요",
        "그 사람이 너무 싫어요"
    ]

    for msg in test_messages:
        result = CrisisDetector.detect_crisis(msg)
        print(f"  '{msg[:20]}...' -> Crisis: {result['is_crisis']}, Severity: {result['max_severity']}")

    # Therapeutic questions test
    print("\n[Therapeutic Questions]")
    print(f"  Shadow: {engine.get_therapeutic_question(question_type='shadow')}")
    print(f"  Deepening: {engine.get_therapeutic_question(question_type='deepening')}")
    print(f"  For Love theme: {engine.get_therapeutic_question(theme='love')}")

    # Emotional messages test
    print("\n[Emotional Messages]")
    response = engine.get_emotional_response("슬픔", "이별")
    print(f"  Empathy: {response['empathy']}")
    print(f"  Hope: {response['hope']}")

    # Session test
    print("\n[Session Test]")
    session = engine.create_session()
    print(f"  Session created: {session.session_id}")

    # Process message
    if engine.client:
        print("\n[Processing Message...]")
        result = engine.process_message("요즘 인간관계가 너무 힘들어요. 왜 이렇게 외로운지 모르겠어요.", session)
        print(f"  Response preview: {result['response'][:200]}...")

    print("\n" + "=" * 70)
    print("[TEST COMPLETE]")
    print("=" * 70)
