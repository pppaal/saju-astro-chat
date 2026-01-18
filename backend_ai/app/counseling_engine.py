# backend_ai/app/counseling_engine.py
"""
Jungian Counseling Engine - 감동을 주는 심리상담 시스템
=====================================================
융 심리학 기반 통합 상담 엔진 (v2.0 - Enhanced with RAG)
- 사주/점성술/타로를 심리학적 도구로 활용
- 위기 개입 시스템 (자살/자해 감지)
- 치료적 질문 생성 (RuleEngine + 시맨틱 검색)
- 감동적 메시지 시스템
- 개성화 여정 가이드

"도구는 거울이다. 답은 내담자 안에 있다."
"""

import os
import json
import re
import random
import hashlib
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime

# Load .env with override to use correct API key
try:
    from dotenv import load_dotenv
    _backend_root = os.path.dirname(os.path.dirname(__file__))
    load_dotenv(os.path.join(_backend_root, ".env"), override=True)
except ImportError:
    pass

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False

# 시맨틱 검색 (SentenceTransformer)
try:
    import torch
    from sentence_transformers import util
    # Use shared model singleton from saju_astro_rag
    try:
        from backend_ai.app.saju_astro_rag import get_model as get_shared_model
    except ImportError:
        from saju_astro_rag import get_model as get_shared_model
    EMBEDDING_AVAILABLE = True
except ImportError:
    EMBEDDING_AVAILABLE = False
    torch = None
    get_shared_model = None

# RuleEngine 임포트
try:
    from app.rule_engine import RuleEngine
    RULE_ENGINE_AVAILABLE = True
except ImportError:
    try:
        from rule_engine import RuleEngine
        RULE_ENGINE_AVAILABLE = True
    except ImportError:
        RULE_ENGINE_AVAILABLE = False
        RuleEngine = None


# Import from refactored counseling package
try:
    from backend_ai.app.counseling import (
        CrisisDetector,
        TherapeuticQuestionGenerator,
        JungianRAG,
        get_jungian_rag,
    )
except ImportError:
    from app.counseling import (
        CrisisDetector,
        TherapeuticQuestionGenerator,
        JungianRAG,
        get_jungian_rag,
    )


# ===============================================================
# CONSTANTS
# ===============================================================
_THEME_KEYWORDS = {
    "relationship": ["관계", "연애", "결혼", "이별", "사랑", "짝", "소울메이트"],
    "career": ["직장", "일", "커리어", "취업", "이직", "사업", "돈", "재정"],
    "family": ["가족", "부모", "자녀", "형제", "집안", "원가족"],
    "identity": ["나", "자아", "정체성", "누구", "의미", "목적"],
    "health": ["건강", "몸", "병", "아프", "스트레스", "불안", "우울"],
    "spiritual": ["영혼", "영적", "종교", "명상", "꿈", "직관"],
}


# ===============================================================
# EMOTIONAL MESSAGE GENERATOR
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
        # 환경변수로 모델 선택 가능 (기본: gpt-4o-mini)
        # COUNSELOR_MODEL=gpt-4o 로 설정하면 프리미엄 품질
        self.model_name = os.getenv("COUNSELOR_MODEL", "gpt-4o-mini")
        print(f"[JungianCounselingEngine] Using model: {self.model_name}")

        if OPENAI_AVAILABLE and self.api_key:
            try:
                import httpx
                self.client = OpenAI(
                    api_key=self.api_key,
                    timeout=httpx.Timeout(60.0, connect=10.0)
                )
                print("[JungianCounselingEngine] OpenAI client initialized")
            except Exception as e:
                print(f"[JungianCounselingEngine] Failed to initialize: {e}")

        # 하위 컴포넌트 초기화
        self.crisis_detector = CrisisDetector()
        self.question_generator = TherapeuticQuestionGenerator()
        self.message_generator = EmotionalMessageGenerator()
        self.sessions: Dict[str, CounselingSession] = {}

        # JungianRAG 통합 (시맨틱 검색 + RuleEngine)
        self.jungian_rag = get_jungian_rag()

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
                max_tokens=3000,
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

    def get_enhanced_context(self, user_message: str, saju_data: Dict = None, astro_data: Dict = None) -> Dict:
        """
        통합 융 심리학 컨텍스트 생성 (모든 융 데이터 활용)

        Args:
            user_message: 사용자 메시지
            saju_data: 사주 분석 데이터
            astro_data: 점성술 분석 데이터

        Returns:
            통합된 융 심리학 컨텍스트
        """
        context = {}

        # 1. 심리 유형 분석
        if saju_data:
            psych_type = self.question_generator.get_psychological_type_insight(saju_data)
            if psych_type:
                context["psychological_type"] = psych_type

        # 2. 연금술적 변환 단계
        alchemy_stage = self.question_generator.get_alchemy_stage(user_message)
        if alchemy_stage:
            context["alchemy_stage"] = alchemy_stage

        # 3. 교차 시스템 통찰 (사주×점성)
        if saju_data or astro_data:
            cross_insight = self.question_generator.get_cross_system_insight(
                saju_data or {}, astro_data or {}
            )
            if cross_insight.get("insights"):
                context["cross_system"] = cross_insight

        # 4. 테마 기반 시나리오 가이드
        theme = self._detect_theme(user_message)
        if theme:
            scenario = self.question_generator.get_scenario_guidance(theme)
            if scenario:
                context["scenario_guidance"] = scenario
                context["detected_theme"] = theme

        # 5. 적절한 치료적 질문 선택
        context["therapeutic_question"] = self.get_therapeutic_question(theme=theme)

        # 6. JungianRAG 시맨틱 검색 (v2.0 추가)
        if self.jungian_rag:
            rag_context = {
                "theme": theme,
                "saju": saju_data,
                "astro": astro_data
            }
            intervention = self.jungian_rag.get_therapeutic_intervention(user_message, rag_context)

            # 시맨틱 검색으로 찾은 질문들 추가
            if intervention.get("recommended_questions"):
                context["rag_questions"] = intervention["recommended_questions"][:3]

            # 시맨틱 검색으로 찾은 통찰 추가
            if intervention.get("insights"):
                context["rag_insights"] = intervention["insights"][:3]

            # RuleEngine 매칭 결과 추가
            if intervention.get("rule_matches"):
                context["rule_matches"] = intervention["rule_matches"][:5]

        return context

    def _detect_theme(self, text: str) -> Optional[str]:
        """텍스트에서 상담 테마 감지"""
        text_lower = text.lower()
        for theme, keywords in _THEME_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return theme
        return None

    def process_with_jung_context(self,
                                   user_message: str,
                                   session: CounselingSession = None,
                                   saju_data: Dict = None,
                                   astro_data: Dict = None,
                                   tarot_data: Dict = None) -> Dict:
        """
        융 심리학 컨텍스트를 완전히 통합한 상담 처리

        Args:
            user_message: 사용자 메시지
            session: 상담 세션
            saju_data: 사주 분석 결과
            astro_data: 점성술 분석 결과
            tarot_data: 타로 리딩 결과

        Returns:
            융 통합 응답
        """
        if session is None:
            session = self.create_session()

        # 1. 위기 감지 (항상 먼저)
        crisis_check = self.crisis_detector.detect_crisis(user_message)
        if crisis_check["requires_immediate_action"]:
            return self.process_message(user_message, session)

        # 2. 통합 융 컨텍스트 생성
        jung_context = self.get_enhanced_context(user_message, saju_data, astro_data)

        # 3. 점술 컨텍스트 구성
        divination_context = {}
        if saju_data:
            divination_context["saju"] = saju_data
        if astro_data:
            divination_context["astrology"] = astro_data
        if tarot_data:
            divination_context["tarot"] = tarot_data

        # 4. GPT에 융 컨텍스트 포함하여 응답 생성
        session.add_message("user", user_message)

        if self.client:
            response_text = self._generate_jung_enhanced_response(
                session, divination_context, jung_context
            )
        else:
            response_text = self._generate_fallback_response(user_message, session)

        session.add_message("assistant", response_text)

        return {
            "response": response_text,
            "jung_context": jung_context,
            "session_id": session.session_id,
            "phase": session.current_phase,
            "crisis_detected": False,
            "should_continue": True,
        }

    def _generate_jung_enhanced_response(self,
                                          session: CounselingSession,
                                          divination_context: Dict,
                                          jung_context: Dict) -> str:
        """융 컨텍스트가 강화된 GPT 응답 생성"""
        # 기본 시스템 프롬프트
        enhanced_prompt = self.SYSTEM_PROMPT

        # 융 컨텍스트 추가
        if jung_context:
            jung_additions = []

            if jung_context.get("psychological_type"):
                ptype = jung_context["psychological_type"]
                jung_additions.append(f"[심리 유형] {ptype.get('name_ko', ptype.get('name', ''))}: {ptype.get('description', '')}")

            if jung_context.get("alchemy_stage"):
                stage = jung_context["alchemy_stage"]
                jung_additions.append(f"[연금술 단계] {stage.get('name_ko', stage.get('name', ''))}: {stage.get('therapeutic_focus', '')}")

            if jung_context.get("scenario_guidance"):
                scenario = jung_context["scenario_guidance"]
                jung_additions.append(f"[상담 시나리오] {scenario.get('approach', '')}")

            # RAG 시맨틱 검색 결과 추가 (v2.0)
            if jung_context.get("rag_questions"):
                jung_additions.append(f"[추천 질문]\n- " + "\n- ".join(jung_context["rag_questions"][:2]))

            if jung_context.get("rag_insights"):
                jung_additions.append(f"[치료적 통찰]\n- " + "\n- ".join(jung_context["rag_insights"][:2]))

            if jung_context.get("rule_matches"):
                jung_additions.append(f"[규칙 매칭]\n- " + "\n- ".join(jung_context["rule_matches"][:2]))

            if jung_additions:
                enhanced_prompt += f"\n\n## 융 심리학 컨텍스트\n" + "\n".join(jung_additions)

        messages = [{"role": "system", "content": enhanced_prompt}]

        # 세션 히스토리
        for msg in session.history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # 점술 컨텍스트
        if divination_context:
            context_msg = self._format_divination_context(divination_context)
            messages.append({"role": "system", "content": f"[점술 해석 컨텍스트]\n{context_msg}"})

        # 현재 단계
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
                max_tokens=3000,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"응답 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요. ({str(e)})"

    def health_check(self) -> Tuple[bool, str]:
        """시스템 상태 확인"""
        status_parts = []

        # OpenAI 연결
        if self.client:
            status_parts.append("OpenAI: Connected")
        else:
            status_parts.append("OpenAI: Not connected (fallback mode)")

        # 데이터 로드 상태 - 모든 융 데이터 체크
        qg = self.question_generator
        jung_data_loaded = sum([
            1 if qg.therapeutic_data else 0,
            1 if qg.archetypes_data else 0,
            1 if qg.prompts_data else 0,
            1 if qg.psychological_types_data else 0,
            1 if qg.alchemy_data else 0,
            1 if qg.cross_analysis_data else 0,
            1 if qg.scenarios_data else 0,
            1 if qg.integrated_data else 0,
            1 if qg.personality_data else 0,
            1 if qg.expanded_data else 0,
        ])
        status_parts.append(f"Jung data: {jung_data_loaded}/10 files loaded")

        # JungianRAG 상태 (v2.0)
        if self.jungian_rag:
            rag_healthy, rag_status = self.jungian_rag.health_check()
            status_parts.append(f"RAG: {rag_status}")
        else:
            status_parts.append("RAG: Not initialized")

        is_healthy = self.client is not None and jung_data_loaded >= 3
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
