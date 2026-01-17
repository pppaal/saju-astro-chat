# backend_ai/app/counseling/crisis_detector.py
"""
Crisis Detection System
=======================
위기 상황 감지 및 안전 프로토콜
- 자살/자해 키워드 감지
- 응급 리소스 제공
- 위기 수준별 응답 생성
"""

from typing import Dict


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
