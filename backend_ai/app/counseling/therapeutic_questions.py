# backend_ai/app/counseling/therapeutic_questions.py
"""
Therapeutic Question Generator
==============================
융 심리학 기반 치료적 질문 생성
- 그림자 작업 질문
- 내면 아이 작업 질문
- 원형별/테마별 질문
- 심리 유형 통찰
"""

import os
import json
from typing import Dict, List


class TherapeuticQuestionGenerator:
    """융 심리학 기반 치료적 질문 생성"""

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "jung")

        self.rules_dir = rules_dir
        self.therapeutic_data = {}
        self.prompts_data = {}
        self.archetypes_data = {}
        self.psychological_types_data = {}
        self.alchemy_data = {}
        self.cross_analysis_data = {}
        self.scenarios_data = {}
        self.integrated_data = {}
        self.personality_data = {}
        self.expanded_data = {}
        self._load_data()

    def _load_data(self):
        """융 심리학 데이터 로드 - 모든 Jung 파일 통합"""
        files_to_load = {
            "jung_therapeutic.json": "therapeutic_data",
            "jung_counseling_prompts.json": "prompts_data",
            "jung_archetypes.json": "archetypes_data",
            "jung_psychological_types.json": "psychological_types_data",
            "jung_alchemy.json": "alchemy_data",
            "jung_cross_analysis.json": "cross_analysis_data",
            "jung_counseling_scenarios.json": "scenarios_data",
            "jung_integrated_counseling.json": "integrated_data",
            "jung_personality_integration.json": "personality_data",
            "jung_expanded_counseling.json": "expanded_data",
        }

        for filename, attr in files_to_load.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        setattr(self, attr, json.load(f))
                except Exception as e:
                    print(f"[TherapeuticQuestionGenerator] Failed to load {filename}: {e}")
            else:
                setattr(self, attr, {})

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

    def get_psychological_type_insight(self, saju_data: Dict = None) -> Dict:
        """심리 유형 기반 통찰 (융의 심리 유형론 활용)"""
        if not self.psychological_types_data:
            return {}
        types = self.psychological_types_data.get("psychological_types", {})
        # 사주 데이터로부터 심리 유형 매핑 시도
        if saju_data:
            day_master = saju_data.get("dayMaster", {})
            # Support both nested { heavenlyStem: { element } } and flat { element }
            if isinstance(day_master.get("heavenlyStem"), dict):
                element = day_master.get("heavenlyStem", {}).get("element", "").lower()
            else:
                element = day_master.get("element", "").lower()
            # 오행→심리유형 매핑
            element_to_type = {
                "wood": "intuition",
                "fire": "feeling",
                "earth": "sensation",
                "metal": "thinking",
                "water": "intuition"
            }
            matched_type = element_to_type.get(element)
            if matched_type and matched_type in types:
                return types[matched_type]
        return {}

    def get_alchemy_stage(self, user_context: str = "") -> Dict:
        """연금술적 변환 단계 파악 (니그레도→알베도→루베도)"""
        if not self.alchemy_data:
            return {}
        stages = self.alchemy_data.get("alchemical_stages", {})
        keywords_map = {
            "nigredo": ["어둠", "혼란", "붕괴", "죽음", "끝", "절망", "막막"],
            "albedo": ["정화", "깨달음", "이해", "수용", "받아들"],
            "citrinitas": ["성장", "발전", "배움", "변화"],
            "rubedo": ["통합", "완성", "새로운", "시작", "탄생"]
        }
        for stage, keywords in keywords_map.items():
            if any(kw in user_context for kw in keywords):
                return stages.get(stage, {})
        return stages.get("nigredo", {})  # 기본값

    def get_scenario_guidance(self, scenario_type: str) -> Dict:
        """상담 시나리오별 가이드 (사랑, 직업, 가족 등)"""
        if not self.scenarios_data:
            return {}
        scenarios = self.scenarios_data.get("counseling_scenarios", {})
        return scenarios.get(scenario_type, {})

    def get_cross_system_insight(self, saju_data: Dict, astro_data: Dict) -> Dict:
        """사주×점성술 교차 분석 통찰"""
        if not self.cross_analysis_data:
            return {}
        cross = self.cross_analysis_data.get("cross_system_analysis", {})
        # 오행과 4원소 매핑
        element_mapping = cross.get("element_mapping", {})
        insights = []
        if saju_data:
            dm = saju_data.get("dayMaster", {})
            # Support both nested and flat dayMaster
            if isinstance(dm.get("heavenlyStem"), dict):
                day_element = dm.get("heavenlyStem", {}).get("element", "")
            else:
                day_element = dm.get("element", "")
            mapped = element_mapping.get(day_element, {})
            if mapped:
                insights.append(mapped)
        return {"insights": insights, "raw": cross}

    def get_personality_integration_guide(self, dominant_trait: str = None) -> List[str]:
        """성격 통합 가이드 (그림자 작업)"""
        if not self.personality_data:
            return []
        integration = self.personality_data.get("personality_integration", {})
        if dominant_trait:
            return integration.get(dominant_trait, {}).get("integration_path", [])
        return integration.get("general", {}).get("steps", [])
