#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
다차원 해석 원칙 자동 생성 스크립트
- 사주/점성술/타로의 모든 조합에 대한 해석 원칙 생성
- 무한한 질문에 대응하는 맥락별 해석 프레임워크
"""

import json
import os
from itertools import product
from typing import Dict, List, Any

# 출력 경로
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.path.abspath("c:/dev/saju-astro-chat/backend_ai/scripts")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "data", "graph", "rules")

# ==============================================================================
# 1. 사주(四柱) 해석 매트릭스 생성
# ==============================================================================

def generate_saju_matrices() -> Dict[str, Any]:
    """십신 x 질문유형 x 오행균형 다차원 매트릭스 생성"""

    sipsin_list = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
    elements = ["목", "화", "토", "금", "수"]
    pillars = ["년주", "월주", "일주", "시주"]
    question_types = ["career", "relationship", "money", "health", "family", "timing", "life_direction"]

    sipsin_archetypes = {
        "비견": {"archetype": "동료/경쟁자", "core": "독립, 자존심", "shadow": "고집, 외로움"},
        "겁재": {"archetype": "야망/탐욕", "core": "추진력, 쟁취", "shadow": "약탈, 조급함"},
        "식신": {"archetype": "내면 아이", "core": "창조, 즐거움", "shadow": "탐닉, 게으름"},
        "상관": {"archetype": "반항자/천재", "core": "독창성, 비판", "shadow": "파괴, 반항"},
        "편재": {"archetype": "모험가/투기", "core": "기회, 자유", "shadow": "불안정, 낭비"},
        "정재": {"archetype": "관리자/수호", "core": "안정, 저축", "shadow": "인색, 걱정"},
        "편관": {"archetype": "전사/도전", "core": "극복, 권위", "shadow": "압박, 통제"},
        "정관": {"archetype": "질서/규범", "core": "책임, 명예", "shadow": "경직, 억압"},
        "편인": {"archetype": "이단자/신비", "core": "직관, 독학", "shadow": "고독, 공허"},
        "정인": {"archetype": "어머니/수호", "core": "돌봄, 학문", "shadow": "의존, 나태"}
    }

    element_psychology = {
        "목": {"healthy": "성장, 계획, 인내", "shadow": "분노, 좌절", "body": "간, 눈, 근육"},
        "화": {"healthy": "열정, 기쁨, 명확성", "shadow": "조급, 소진", "body": "심장, 소장"},
        "토": {"healthy": "안정, 돌봄, 중용", "shadow": "집착, 걱정", "body": "위장, 비장"},
        "금": {"healthy": "결단, 정의, 순수", "shadow": "냉담, 슬픔", "body": "폐, 대장, 피부"},
        "수": {"healthy": "지혜, 유연, 직관", "shadow": "두려움, 우울", "body": "신장, 방광"}
    }

    pillar_meanings = {
        "년주": {"jung": "집단 무의식, 조상", "theme": "사회적 페르소나", "age": "초년"},
        "월주": {"jung": "부모 콤플렉스", "theme": "직업/사회적 성취", "age": "청년"},
        "일주": {"jung": "핵심 자기(Self)", "theme": "본질/배우자", "age": "중년"},
        "시주": {"jung": "내면 아이, 잠재성", "theme": "자녀/말년/창조", "age": "노년"}
    }

    # 질문 유형별 해석 방향
    question_focus = {
        "career": {
            "primary_sipsin": ["식신", "상관", "편관", "정관", "편재", "정재"],
            "focus": "어떤 방식으로 사회에 기여하는가",
            "advice_frame": "직업은 자기 표현의 장"
        },
        "relationship": {
            "primary_sipsin": ["정재", "편재", "정관", "편관", "비견", "겁재"],
            "focus": "어떤 방식으로 관계를 맺는가",
            "advice_frame": "관계는 자기를 비추는 거울"
        },
        "money": {
            "primary_sipsin": ["정재", "편재", "식신", "상관"],
            "focus": "어떻게 풍요를 창조하는가",
            "advice_frame": "돈은 가치의 흐름"
        },
        "health": {
            "primary_sipsin": ["비견", "겁재", "정인", "편인"],
            "focus": "몸-마음 연결",
            "advice_frame": "몸은 무의식의 언어"
        },
        "family": {
            "primary_sipsin": ["정인", "편인", "정관", "편관", "식신"],
            "focus": "원가족 패턴과 영향",
            "advice_frame": "가족은 첫 번째 거울"
        },
        "timing": {
            "focus": "대운/세운의 흐름",
            "advice_frame": "때를 읽고 행동하라"
        },
        "life_direction": {
            "focus": "용신과 격국의 방향",
            "advice_frame": "당신의 북극성은 어디인가"
        }
    }

    # 동적 상호작용 규칙
    dynamic_rules = {
        "상생": {
            "목생화": "계획이 열정으로, 비전이 행동으로",
            "화생토": "열정이 안정으로, 불꽃이 풍요로",
            "토생금": "안정이 결단으로, 돌봄이 정의로",
            "금생수": "결단이 지혜로, 정리가 흐름으로",
            "수생목": "지혜가 성장으로, 깊이가 비전으로"
        },
        "상극": {
            "목극토": "성장이 안정을 흔듬, 계획이 중심을 잃게 함",
            "토극수": "안정이 흐름을 막음, 걱정이 지혜를 가림",
            "수극화": "두려움이 열정을 끔, 지나친 생각이 행동을 막음",
            "화극금": "조급함이 결단을 해침, 열정이 정의를 왜곡",
            "금극목": "비판이 성장을 막음, 완벽주의가 시작을 지연"
        },
        "육합": {
            "자축합토": "지혜와 안정의 결합",
            "인해합목": "용기와 지혜의 결합",
            "묘술합화": "성장과 변형의 결합",
            "진유합금": "변화와 결단의 결합",
            "사신합수": "열정과 지혜의 결합",
            "오미합화": "정점과 전환의 결합"
        },
        "충": {
            "자오충": "감정 vs 의지, 내면 vs 외면",
            "축미충": "안정 vs 변화, 실용 vs 이상",
            "인신충": "시작 vs 결실, 확장 vs 수렴",
            "묘유충": "성장 vs 수확, 나아감 vs 멈춤",
            "진술충": "변화 vs 변형, 움직임 vs 정지",
            "사해충": "열정 vs 지혜, 불 vs 물"
        }
    }

    # 복합 패턴 해석
    complex_patterns = {
        "재다신약": {
            "pattern": "재물/욕망은 많으나 힘 부족",
            "career": "기회는 많으나 감당 어려움",
            "money": "돈은 들어오나 지키기 어려움",
            "health": "과로로 인한 탈진",
            "therapeutic": "모든 기회가 당신의 것은 아니다"
        },
        "관살다중": {
            "pattern": "권위/압박이 과다",
            "career": "과도한 책임, 다중 상사",
            "relationship": "권위 갈등, 통제 관계",
            "health": "스트레스성 질환",
            "therapeutic": "모든 짐을 질 필요 없다"
        },
        "상관견관": {
            "pattern": "창조적 반항과 권위의 충돌",
            "career": "조직 부적응, 독립 필요",
            "relationship": "배우자/권위자와 갈등",
            "therapeutic": "당신의 독창성을 알아보는 곳을 찾아라"
        },
        "식신생재": {
            "pattern": "창조가 풍요로",
            "career": "재능으로 수입",
            "money": "즐기면서 벌기",
            "therapeutic": "좋아하는 일이 돈이 된다"
        },
        "인성과다": {
            "pattern": "학습/돌봄 과다",
            "career": "준비만 하고 실행 못함",
            "relationship": "의존적 또는 과보호",
            "therapeutic": "알아도 행동하지 않으면 무의미"
        },
        "비겁과다": {
            "pattern": "자아/경쟁 과다",
            "career": "협업 어려움, 독립 선호",
            "relationship": "양보 어려움, 거리감",
            "therapeutic": "타인도 당신만큼 중요하다"
        }
    }

    return {
        "$schema": "saju_multidimensional_matrix_v2",
        "$description": "사주 다차원 해석 매트릭스 - 자동 생성",
        "sipsin_archetypes": sipsin_archetypes,
        "element_psychology": element_psychology,
        "pillar_meanings": pillar_meanings,
        "question_type_focus": question_focus,
        "dynamic_interaction_rules": dynamic_rules,
        "complex_patterns": complex_patterns,
        "interpretation_algorithm": {
            "step_1": "일간(일주 천간) 확인 - 핵심 정체성",
            "step_2": "용신/희신 확인 - 필요한 에너지",
            "step_3": "격국 확인 - 삶의 패턴",
            "step_4": "십신 분포 분석 - 과다/부족",
            "step_5": "질문 유형에 따른 관련 십신 우선 분석",
            "step_6": "대운/세운 현재 영향 분석",
            "step_7": "동적 상호작용 (합/충/형) 분석",
            "step_8": "융 심리학적 통찰 연결",
            "step_9": "치료적 방향 제시"
        }
    }


# ==============================================================================
# 2. 점성술 해석 매트릭스 생성
# ==============================================================================

def generate_astro_matrices() -> Dict[str, Any]:
    """행성 x 하우스 x 사인 x 애스펙트 다차원 매트릭스 생성"""

    planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]
    signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
    houses = list(range(1, 13))
    aspects = ["conjunction", "opposition", "square", "trine", "sextile"]
    question_types = ["career", "relationship", "money", "health", "family", "timing", "life_direction"]

    planet_archetypes = {
        "sun": {"archetype": "자아/영웅", "jung": "Self, 영웅", "body": "심장, 척추"},
        "moon": {"archetype": "감정/어머니", "jung": "아니마, 내면 아이", "body": "위장, 유방"},
        "mercury": {"archetype": "소통/트릭스터", "jung": "트릭스터, 헤르메스", "body": "신경계, 손"},
        "venus": {"archetype": "사랑/아름다움", "jung": "아니마, 아프로디테", "body": "신장, 목"},
        "mars": {"archetype": "행동/전사", "jung": "영웅, 아레스", "body": "근육, 혈액"},
        "jupiter": {"archetype": "확장/현자", "jung": "현자, 제우스", "body": "간, 대퇴부"},
        "saturn": {"archetype": "한계/아버지", "jung": "노현자, 크로노스", "body": "뼈, 관절"},
        "uranus": {"archetype": "해방/혁명", "jung": "프로메테우스", "body": "신경계, 발목"},
        "neptune": {"archetype": "꿈/영성", "jung": "집단 무의식", "body": "림프계, 발"},
        "pluto": {"archetype": "변형/그림자", "jung": "그림자, 하데스", "body": "생식기"},
        "chiron": {"archetype": "상처받은 치유자", "jung": "상처받은 치유자", "body": "만성 상처"}
    }

    sign_elements = {
        "aries": "화", "taurus": "토", "gemini": "공기", "cancer": "수",
        "leo": "화", "virgo": "토", "libra": "공기", "scorpio": "수",
        "sagittarius": "화", "capricorn": "토", "aquarius": "공기", "pisces": "수"
    }

    sign_modalities = {
        "cardinal": ["aries", "cancer", "libra", "capricorn"],
        "fixed": ["taurus", "leo", "scorpio", "aquarius"],
        "mutable": ["gemini", "virgo", "sagittarius", "pisces"]
    }

    house_themes = {
        1: {"theme": "자아/외모", "jung": "페르소나", "life_area": "정체성"},
        2: {"theme": "재물/가치", "jung": "자기 가치", "life_area": "자원"},
        3: {"theme": "소통/학습", "jung": "마음의 표현", "life_area": "커뮤니케이션"},
        4: {"theme": "가정/뿌리", "jung": "어머니 콤플렉스", "life_area": "가정"},
        5: {"theme": "창조/사랑", "jung": "내면 아이", "life_area": "자기표현"},
        6: {"theme": "건강/봉사", "jung": "완벽주의, 신체화", "life_area": "일상"},
        7: {"theme": "파트너십", "jung": "아니마/아니무스 투사", "life_area": "관계"},
        8: {"theme": "변형/공유자원", "jung": "그림자, 죽음재생", "life_area": "심층"},
        9: {"theme": "철학/여행", "jung": "의미 추구", "life_area": "확장"},
        10: {"theme": "경력/명성", "jung": "아버지 콤플렉스", "life_area": "사회적 역할"},
        11: {"theme": "친구/이상", "jung": "집단 연결", "life_area": "공동체"},
        12: {"theme": "무의식/영성", "jung": "개인 무의식", "life_area": "초월"}
    }

    aspect_dynamics = {
        "conjunction": {"energy": "융합/증폭", "challenge": "구분 어려움", "gift": "집중된 힘"},
        "opposition": {"energy": "대립/투사", "challenge": "분열", "gift": "균형"},
        "square": {"energy": "긴장/성장", "challenge": "갈등", "gift": "동기"},
        "trine": {"energy": "조화/흐름", "challenge": "당연시", "gift": "재능"},
        "sextile": {"energy": "기회/잠재력", "challenge": "노력 필요", "gift": "기회"}
    }

    # 트랜짓 영향력 레벨
    transit_power = {
        "sun": {"duration": "1일", "impact": "low"},
        "moon": {"duration": "2-3시간", "impact": "very_low"},
        "mercury": {"duration": "1-3주", "impact": "low"},
        "venus": {"duration": "1-4주", "impact": "low"},
        "mars": {"duration": "2-3개월", "impact": "medium_low"},
        "jupiter": {"duration": "1년", "impact": "medium"},
        "saturn": {"duration": "2-3년", "impact": "high"},
        "uranus": {"duration": "7-8년", "impact": "very_high"},
        "neptune": {"duration": "10-14년", "impact": "very_high"},
        "pluto": {"duration": "12-30년", "impact": "transformative"},
        "chiron": {"duration": "2-8년", "impact": "high"}
    }

    # 생애 주기 트리거
    life_cycles = {
        "saturn_return_1": {"age": "29-30", "theme": "첫 번째 성인기, 진정한 책임"},
        "saturn_return_2": {"age": "58-60", "theme": "두 번째 지혜기, 인생 총결산"},
        "uranus_opposition": {"age": "40-42", "theme": "중년 위기, 억압된 자기 해방"},
        "chiron_return": {"age": "50-51", "theme": "상처가 선물로 변환"},
        "jupiter_return": {"age": "12, 24, 36, 48...", "theme": "확장과 기회의 주기"},
        "progressed_moon": {"cycle": "27.5년", "theme": "감정적 진화"}
    }

    # 질문별 분석 우선순위
    question_analysis = {
        "career": {
            "primary_houses": [10, 6, 2],
            "primary_planets": ["saturn", "sun", "mars", "jupiter"],
            "key_aspects_to": ["MC", "sun", "saturn"],
            "transit_sensitivity": ["saturn_10th", "jupiter_10th", "pluto_10th"]
        },
        "relationship": {
            "primary_houses": [7, 5, 8],
            "primary_planets": ["venus", "mars", "moon"],
            "key_aspects_to": ["venus", "descendant", "moon"],
            "transit_sensitivity": ["venus_7th", "jupiter_7th", "saturn_7th"]
        },
        "money": {
            "primary_houses": [2, 8, 10],
            "primary_planets": ["venus", "jupiter", "pluto"],
            "key_aspects_to": ["venus", "jupiter", "2nd_ruler"],
            "transit_sensitivity": ["jupiter_2nd", "saturn_2nd", "uranus_2nd"]
        },
        "health": {
            "primary_houses": [6, 1, 8, 12],
            "primary_planets": ["sun", "moon", "mars", "saturn"],
            "key_aspects_to": ["ASC", "sun", "moon"],
            "transit_sensitivity": ["saturn_6th", "pluto_1st", "neptune_12th"]
        },
        "timing": {
            "analysis": ["transits", "progressions", "solar_arc", "returns"],
            "key_triggers": ["new_moon", "full_moon", "eclipses", "stations"]
        }
    }

    return {
        "$schema": "astro_multidimensional_matrix_v2",
        "$description": "점성술 다차원 해석 매트릭스 - 자동 생성",
        "planet_archetypes": planet_archetypes,
        "sign_elements": sign_elements,
        "sign_modalities": sign_modalities,
        "house_themes": house_themes,
        "aspect_dynamics": aspect_dynamics,
        "transit_power_levels": transit_power,
        "life_cycle_triggers": life_cycles,
        "question_analysis_priority": question_analysis,
        "interpretation_algorithm": {
            "step_1": "Big Three 확인: 태양/달/상승점",
            "step_2": "질문 관련 하우스 지배성 확인",
            "step_3": "해당 하우스 내 행성 분석",
            "step_4": "주요 애스펙트 분석",
            "step_5": "현재 트랜짓 영향 분석",
            "step_6": "생애 주기 맥락 고려",
            "step_7": "융 심리학적 원형 연결",
            "step_8": "사주와의 교차 분석",
            "step_9": "통합 스토리텔링 및 조언"
        }
    }


# ==============================================================================
# 3. 타로 해석 매트릭스 생성
# ==============================================================================

def generate_tarot_matrices() -> Dict[str, Any]:
    """메이저 아르카나 x 마이너 슈트 x 위치 x 질문유형 매트릭스"""

    major_arcana = [
        "fool", "magician", "high_priestess", "empress", "emperor",
        "hierophant", "lovers", "chariot", "strength", "hermit",
        "wheel", "justice", "hanged_man", "death", "temperance",
        "devil", "tower", "star", "moon", "sun", "judgement", "world"
    ]

    suits = ["wands", "cups", "swords", "pentacles"]
    court_cards = ["page", "knight", "queen", "king"]
    numbers = list(range(1, 11))  # Ace to 10

    question_types = ["career", "relationship", "money", "health", "spiritual", "timing"]

    major_arcana_journey = {
        "fool": {
            "archetype": "신성한 바보/시작",
            "jung": "무의식적 전체성, 순수",
            "upright": "새로운 시작, 순수한 가능성, 믿음의 도약",
            "reversed": "무모함, 어리석음, 방향 상실",
            "therapeutic_question": "두려움 없이 시작할 수 있는가?"
        },
        "magician": {
            "archetype": "창조자/연금술사",
            "jung": "의지력, 자아",
            "upright": "의지력, 창조력, 자원 활용",
            "reversed": "조작, 능력 낭비, 속임",
            "therapeutic_question": "당신의 도구를 어떻게 사용하고 있는가?"
        },
        "high_priestess": {
            "archetype": "직관/무의식",
            "jung": "아니마, 집단 무의식의 문",
            "upright": "직관, 숨겨진 지식, 내면의 목소리",
            "reversed": "직관 무시, 비밀, 표면적 지식",
            "therapeutic_question": "내면의 목소리에 귀 기울이고 있는가?"
        },
        "empress": {
            "archetype": "어머니/풍요",
            "jung": "태모, 창조적 여성성",
            "upright": "풍요, 돌봄, 창조, 자연",
            "reversed": "의존, 과보호, 창조적 막힘",
            "therapeutic_question": "무엇을 낳고 키우고 있는가?"
        },
        "emperor": {
            "archetype": "아버지/권위",
            "jung": "아니무스, 아버지 원형",
            "upright": "권위, 구조, 통제, 안정",
            "reversed": "독재, 경직, 권위 남용",
            "therapeutic_question": "당신의 내면 권위는 건강한가?"
        },
        "hierophant": {
            "archetype": "교사/전통",
            "jung": "현자, 초자아",
            "upright": "전통, 교육, 영적 지도, 규범",
            "reversed": "맹목적 추종, 독단, 새로운 길 거부",
            "therapeutic_question": "어떤 가르침을 따르고 있는가?"
        },
        "lovers": {
            "archetype": "선택/연합",
            "jung": "아니마-아니무스 통합",
            "upright": "사랑, 선택, 가치 정렬, 조화",
            "reversed": "불화, 잘못된 선택, 가치 혼란",
            "therapeutic_question": "무엇을 선택하고 있는가?"
        },
        "chariot": {
            "archetype": "의지/승리",
            "jung": "에고의 통합적 제어",
            "upright": "의지력, 결단, 승리, 전진",
            "reversed": "통제 상실, 방향 없음, 공격성",
            "therapeutic_question": "어디로 향하고 있는가?"
        },
        "strength": {
            "archetype": "내면의 힘",
            "jung": "본능과 의식의 조화",
            "upright": "내면의 힘, 인내, 용기, 연민",
            "reversed": "자기 의심, 통제 욕구, 약함",
            "therapeutic_question": "진정한 힘이란 무엇인가?"
        },
        "hermit": {
            "archetype": "내면의 빛",
            "jung": "현자, 내면 안내자",
            "upright": "성찰, 고독, 내면의 지혜, 안내",
            "reversed": "고립, 외로움, 지혜 거부",
            "therapeutic_question": "홀로 있을 때 무엇을 발견하는가?"
        },
        "wheel": {
            "archetype": "운명의 수레바퀴",
            "jung": "동시성, 카르마",
            "upright": "변화, 순환, 운명, 기회",
            "reversed": "저항, 나쁜 운, 통제 집착",
            "therapeutic_question": "삶의 순환을 어떻게 받아들이는가?"
        },
        "justice": {
            "archetype": "균형/진실",
            "jung": "자기 정직, 내면의 심판자",
            "upright": "정의, 균형, 진실, 책임",
            "reversed": "불공정, 회피, 정직하지 못함",
            "therapeutic_question": "진실과 마주할 준비가 되었는가?"
        },
        "hanged_man": {
            "archetype": "희생/새로운 관점",
            "jung": "에고의 포기, 초월",
            "upright": "포기, 새로운 관점, 희생, 기다림",
            "reversed": "무의미한 희생, 지연, 저항",
            "therapeutic_question": "무엇을 놓아야 하는가?"
        },
        "death": {
            "archetype": "변형/종료",
            "jung": "에고의 죽음, 재탄생",
            "upright": "변형, 종료, 새로운 시작, 전환",
            "reversed": "변화 저항, 정체, 두려움",
            "therapeutic_question": "무엇이 끝나야 새것이 오는가?"
        },
        "temperance": {
            "archetype": "균형/통합",
            "jung": "대립의 통합, 중용",
            "upright": "균형, 인내, 조절, 통합",
            "reversed": "불균형, 과잉, 극단",
            "therapeutic_question": "중용을 찾고 있는가?"
        },
        "devil": {
            "archetype": "그림자/속박",
            "jung": "그림자, 억압된 욕망",
            "upright": "속박, 중독, 물질주의, 그림자",
            "reversed": "해방, 각성, 회복",
            "therapeutic_question": "무엇에 묶여 있는가? 정말 벗어날 수 없는가?"
        },
        "tower": {
            "archetype": "파괴/각성",
            "jung": "에고 구조의 붕괴",
            "upright": "갑작스러운 변화, 파괴, 각성, 해방",
            "reversed": "두려움, 변화 회피, 서서히 무너짐",
            "therapeutic_question": "무너져야 할 것이 무엇인가?"
        },
        "star": {
            "archetype": "희망/치유",
            "jung": "자기(Self)의 빛",
            "upright": "희망, 영감, 치유, 갱신",
            "reversed": "절망, 믿음 상실, 낙담",
            "therapeutic_question": "당신의 별은 어디에 있는가?"
        },
        "moon": {
            "archetype": "환상/무의식",
            "jung": "무의식의 어둠, 그림자",
            "upright": "환상, 두려움, 직관, 무의식",
            "reversed": "혼란 해소, 두려움 직면",
            "therapeutic_question": "두려워하는 것을 직면하면 어떻게 되는가?"
        },
        "sun": {
            "archetype": "빛/기쁨",
            "jung": "의식화, 자기 실현",
            "upright": "기쁨, 성공, 활력, 명확성",
            "reversed": "내면 아이 억압, 과도한 낙관",
            "therapeutic_question": "진정한 기쁨은 어디서 오는가?"
        },
        "judgement": {
            "archetype": "부활/각성",
            "jung": "높은 부름, 자기 평가",
            "upright": "갱신, 부름에 응답, 자기 평가, 해방",
            "reversed": "자기 의심, 부름 거부, 판단 회피",
            "therapeutic_question": "당신의 부름은 무엇인가?"
        },
        "world": {
            "archetype": "완성/통합",
            "jung": "개성화 완성, 자기(Self) 실현",
            "upright": "완성, 통합, 성취, 전체성",
            "reversed": "미완성, 지연, 성취 실패",
            "therapeutic_question": "당신은 이미 완전하다는 것을 아는가?"
        }
    }

    suit_meanings = {
        "wands": {
            "element": "화",
            "theme": "열정, 창조성, 의지, 영감",
            "life_area": "직업, 야망, 에너지",
            "saju_correlation": "식신, 상관 (표현력)",
            "astro_correlation": "화성, 태양"
        },
        "cups": {
            "element": "수",
            "theme": "감정, 관계, 직관, 사랑",
            "life_area": "관계, 감정, 창의성",
            "saju_correlation": "정인, 편인 (감정)",
            "astro_correlation": "달, 금성, 해왕성"
        },
        "swords": {
            "element": "공기",
            "theme": "사고, 갈등, 진실, 결단",
            "life_area": "생각, 소통, 갈등",
            "saju_correlation": "편관, 정관 (권위/갈등)",
            "astro_correlation": "수성, 화성, 토성"
        },
        "pentacles": {
            "element": "토",
            "theme": "물질, 몸, 일, 안정",
            "life_area": "재정, 건강, 물질적 성취",
            "saju_correlation": "정재, 편재 (재물)",
            "astro_correlation": "금성, 토성"
        }
    }

    number_meanings = {
        1: {"theme": "시작, 잠재력, 씨앗", "energy": "순수한 원소 에너지"},
        2: {"theme": "균형, 선택, 이원성", "energy": "관계, 협력 또는 갈등"},
        3: {"theme": "창조, 표현, 성장", "energy": "첫 결실, 확장"},
        4: {"theme": "안정, 구조, 기반", "energy": "견고함, 때로는 정체"},
        5: {"theme": "변화, 갈등, 불안정", "energy": "위기, 도전, 성장통"},
        6: {"theme": "조화, 균형 회복, 교류", "energy": "주고받음, 치유"},
        7: {"theme": "내면 탐색, 평가, 깊이", "energy": "성찰, 재평가"},
        8: {"theme": "힘, 숙달, 움직임", "energy": "빠른 변화, 권력"},
        9: {"theme": "완성 직전, 지혜, 고독", "energy": "거의 끝, 성취 또는 걱정"},
        10: {"theme": "완성, 순환 종료, 과잉", "energy": "끝과 새로운 시작"}
    }

    spread_positions = {
        "past_present_future": {
            "1": "과거 - 형성된 패턴, 배경",
            "2": "현재 - 지금의 에너지, 도전",
            "3": "미래 - 가능한 방향, 조언"
        },
        "celtic_cross": {
            "1": "현재 상황",
            "2": "즉각적 도전",
            "3": "의식적 목표",
            "4": "무의식적 기반",
            "5": "최근 과거",
            "6": "가까운 미래",
            "7": "자기 자신",
            "8": "환경/타인",
            "9": "희망과 두려움",
            "10": "최종 결과"
        }
    }

    question_interpretation = {
        "career": {
            "key_suits": ["wands", "pentacles"],
            "key_majors": ["magician", "emperor", "chariot", "wheel", "world"],
            "focus": "능력 발휘, 방향, 성취"
        },
        "relationship": {
            "key_suits": ["cups", "swords"],
            "key_majors": ["lovers", "empress", "emperor", "devil", "star"],
            "focus": "감정, 연결, 패턴"
        },
        "money": {
            "key_suits": ["pentacles", "wands"],
            "key_majors": ["empress", "wheel", "devil", "sun", "world"],
            "focus": "자원, 가치, 안정"
        },
        "health": {
            "key_suits": ["pentacles", "cups"],
            "key_majors": ["strength", "temperance", "star", "sun"],
            "focus": "몸-마음 균형, 치유"
        },
        "spiritual": {
            "key_suits": ["cups", "swords"],
            "key_majors": ["high_priestess", "hermit", "star", "moon", "judgement", "world"],
            "focus": "의미, 성장, 깨달음"
        }
    }

    return {
        "$schema": "tarot_multidimensional_matrix_v2",
        "$description": "타로 다차원 해석 매트릭스 - 자동 생성",
        "major_arcana_journey": major_arcana_journey,
        "suit_meanings": suit_meanings,
        "number_meanings": number_meanings,
        "spread_positions": spread_positions,
        "question_interpretation": question_interpretation,
        "therapeutic_approach": {
            "principle": "타로는 무의식의 거울. 카드는 우연이 아니라 동시성.",
            "questions_to_ask": [
                "이 카드에서 가장 먼저 눈에 들어오는 것은?",
                "이 이미지가 당신의 어떤 부분을 반영하는가?",
                "이 카드의 인물이라면 무슨 말을 할까?",
                "역방향일 때 무엇이 억압되어 있는가?"
            ]
        },
        "interpretation_algorithm": {
            "step_1": "질문의 핵심 파악",
            "step_2": "스프레드 내 위치별 의미 분석",
            "step_3": "메이저/마이너 비율로 영향력 평가",
            "step_4": "슈트 분포로 에너지 흐름 파악",
            "step_5": "숫자 패턴으로 진행 단계 이해",
            "step_6": "카드 간 관계 (인접, 대각) 분석",
            "step_7": "융 심리학적 원형 연결",
            "step_8": "사주/점성술과 교차 분석",
            "step_9": "치료적 질문과 통합 조언"
        }
    }


# ==============================================================================
# 4. 현대 직업 매핑 생성
# ==============================================================================

def generate_modern_career_mapping() -> Dict[str, Any]:
    """십신/행성 → 현대 직업 매핑"""

    sipsin_careers = {
        "비견": {
            "core_competency": "독립성, 자기 주도성, 경쟁력",
            "traditional": "형제와 경쟁, 독립사업",
            "modern_jobs": [
                "1인 기업가", "프리랜서", "스타트업 창업자", "개인 트레이너",
                "독립 컨설턴트", "유튜버/크리에이터", "자영업자", "영업 전문가"
            ],
            "work_style": "혼자 일하거나 동등한 파트너십",
            "avoid": "엄격한 위계조직, 지시받는 역할"
        },
        "겁재": {
            "core_competency": "추진력, 협상력, 위기 대응",
            "traditional": "재물 경쟁, 투기",
            "modern_jobs": [
                "벤처 캐피탈리스트", "M&A 전문가", "영업 관리자", "위기관리 전문가",
                "스타트업 Co-founder", "경매사", "부동산 개발자", "이벤트 프로모터"
            ],
            "work_style": "고위험 고수익, 빠른 의사결정",
            "avoid": "안정적이고 반복적인 업무"
        },
        "식신": {
            "core_competency": "창의성, 표현력, 돌봄",
            "traditional": "음식, 예술, 교육",
            "modern_jobs": [
                "셰프/요리연구가", "콘텐츠 크리에이터", "교사/강사", "심리상담사",
                "작가", "푸드 스타일리스트", "유아교육 전문가", "힐러/테라피스트"
            ],
            "work_style": "즐기면서 일함, 창조적 표현",
            "avoid": "경쟁적이고 압박감 높은 환경"
        },
        "상관": {
            "core_competency": "비판적 사고, 혁신, 독창성",
            "traditional": "재능, 말재주",
            "modern_jobs": [
                "비평가/평론가", "변호사", "기자/언론인", "스타트업 디스럽터",
                "UX 디자이너", "크리에이티브 디렉터", "코미디언/방송인", "혁신 컨설턴트"
            ],
            "work_style": "기존 질서에 도전, 새로운 방식 제안",
            "avoid": "전통적이고 보수적인 조직"
        },
        "편재": {
            "core_competency": "기회 포착, 유연성, 모험",
            "traditional": "무역, 투기",
            "modern_jobs": [
                "트레이더", "해외 비즈니스", "여행 크리에이터", "이벤트 기획자",
                "무역상", "암호화폐 투자자", "글로벌 영업", "프리랜서 컨설턴트"
            ],
            "work_style": "자유롭고 변화무쌍, 다양한 기회 추구",
            "avoid": "한 곳에 묶여있는 정형화된 업무"
        },
        "정재": {
            "core_competency": "관리, 안정성, 꼼꼼함",
            "traditional": "재산 관리, 저축",
            "modern_jobs": [
                "회계사/세무사", "재무 관리자", "은행원", "자산 관리사",
                "공무원", "경영 지원", "품질 관리자", "데이터 분석가"
            ],
            "work_style": "체계적, 꾸준함, 장기적 관점",
            "avoid": "불확실하고 불안정한 환경"
        },
        "편관": {
            "core_competency": "리더십, 위기 대응, 결단력",
            "traditional": "무관, 권력",
            "modern_jobs": [
                "군인/경찰", "외과의사", "위기관리 전문가", "스포츠 선수",
                "CEO/임원", "특수요원", "구조대원", "프로젝트 매니저"
            ],
            "work_style": "압박감 속에서 성과, 권위적 역할",
            "avoid": "느긋하고 평화로운 환경 (권태 느낌)"
        },
        "정관": {
            "core_competency": "책임감, 조직력, 신뢰성",
            "traditional": "관직, 명예",
            "modern_jobs": [
                "고위 공무원", "대기업 관리자", "판사/검사", "교수",
                "의사", "기업 임원", "감사관", "정치인"
            ],
            "work_style": "체계적 조직 내 승진, 사회적 인정",
            "avoid": "비정형적이고 불안정한 역할"
        },
        "편인": {
            "core_competency": "직관, 연구, 비전통적 지식",
            "traditional": "학문, 예술, 종교",
            "modern_jobs": [
                "연구원", "데이터 과학자", "점성술사/역술인", "심리치료사",
                "프로그래머", "철학자/사상가", "대체의학 전문가", "작가"
            ],
            "work_style": "독립적 연구, 깊이 있는 탐구",
            "avoid": "표면적이고 사교적인 업무"
        },
        "정인": {
            "core_competency": "교육, 돌봄, 학문",
            "traditional": "스승, 학자",
            "modern_jobs": [
                "교사/교수", "의사", "상담사", "사서",
                "연구원", "멘토/코치", "편집자", "큐레이터"
            ],
            "work_style": "가르치고 돌보는 역할, 지식 전수",
            "avoid": "경쟁적이고 물질 중심적 환경"
        }
    }

    planet_careers = {
        "sun": {
            "core": "리더십, 자기표현, 창조성",
            "modern_jobs": ["CEO", "배우", "아티스트", "정치인", "기업가"]
        },
        "moon": {
            "core": "돌봄, 감정, 대중",
            "modern_jobs": ["간호사", "요리사", "호텔리어", "심리상담사", "육아전문가"]
        },
        "mercury": {
            "core": "소통, 지성, 연결",
            "modern_jobs": ["작가", "기자", "마케터", "프로그래머", "통역사"]
        },
        "venus": {
            "core": "아름다움, 관계, 가치",
            "modern_jobs": ["디자이너", "아티스트", "외교관", "금융인", "뷰티전문가"]
        },
        "mars": {
            "core": "행동, 경쟁, 용기",
            "modern_jobs": ["운동선수", "군인", "외과의사", "엔지니어", "기업가"]
        },
        "jupiter": {
            "core": "확장, 교육, 신앙",
            "modern_jobs": ["교수", "판사", "성직자", "출판인", "해외사업가"]
        },
        "saturn": {
            "core": "구조, 책임, 권위",
            "modern_jobs": ["CEO", "건축가", "정치인", "공무원", "역사학자"]
        },
        "uranus": {
            "core": "혁신, 기술, 자유",
            "modern_jobs": ["과학자", "발명가", "IT전문가", "사회운동가", "점성술사"]
        },
        "neptune": {
            "core": "영감, 영성, 예술",
            "modern_jobs": ["음악가", "영화감독", "시인", "영적치유사", "사회복지사"]
        },
        "pluto": {
            "core": "변형, 권력, 심층",
            "modern_jobs": ["심리치료사", "형사", "외과의사", "투자가", "위기관리전문가"]
        }
    }

    return {
        "$schema": "modern_career_mapping_v1",
        "$description": "십신/행성 → 현대 직업 매핑 (자동 생성)",
        "sipsin_career_mapping": sipsin_careers,
        "planet_career_mapping": planet_careers,
        "interpretation_guidance": {
            "step_1": "일간(주 에너지)과 용신(필요 에너지) 확인",
            "step_2": "가장 강한 십신 2-3개 식별",
            "step_3": "관련 현대 직업군 매핑",
            "step_4": "점성술 10하우스/MC와 교차 확인",
            "step_5": "개인의 경험과 선호 반영",
            "step_6": "대운/세운에 따른 타이밍 조언"
        }
    }


# ==============================================================================
# 5. 통합 멀티모달 해석 엔진
# ==============================================================================

def generate_integration_engine() -> Dict[str, Any]:
    """사주+점성술+타로+융 통합 해석 엔진"""

    return {
        "$schema": "multimodal_integration_engine_v1",
        "$description": "사주/점성술/타로/융 심리학 통합 해석 엔진",

        "correlation_matrix": {
            "saju_astro": {
                "일간_sun": "핵심 자아, 의지",
                "월주_moon": "감정, 내면",
                "년주_ASC": "사회적 페르소나",
                "시주_MC": "목표, 방향",
                "비겁_fire_mars": "자아, 행동력",
                "식상_mercury_venus": "표현, 창조",
                "재성_venus_2nd": "가치, 재물",
                "관성_saturn_10th": "권위, 책임",
                "인성_moon_jupiter": "지혜, 돌봄"
            },
            "saju_tarot": {
                "비견_emperor": "자기 권위",
                "식신_empress_sun": "창조, 기쁨",
                "상관_fool_tower": "혁신, 파괴",
                "재성_pentacles": "물질, 안정",
                "관성_justice_emperor": "권위, 구조",
                "인성_high_priestess_hierophant": "지혜, 전통"
            },
            "astro_tarot": {
                "sun_sun_card": "생명력, 기쁨",
                "moon_moon_card": "무의식, 직관",
                "saturn_world": "완성, 구조",
                "pluto_death_tower": "변형, 재생",
                "jupiter_wheel_star": "운명, 희망"
            }
        },

        "question_router": {
            "career": {
                "saju_focus": ["관성", "재성", "식상", "격국"],
                "astro_focus": ["10th", "6th", "MC", "saturn"],
                "tarot_focus": ["wands", "pentacles", "chariot", "world"],
                "jung_focus": ["아버지 콤플렉스", "사회적 페르소나"]
            },
            "relationship": {
                "saju_focus": ["일지", "재성/관성", "배우자궁"],
                "astro_focus": ["7th", "5th", "venus", "mars"],
                "tarot_focus": ["cups", "lovers", "two_of_cups"],
                "jung_focus": ["아니마/아니무스", "그림자 투사"]
            },
            "money": {
                "saju_focus": ["재성", "식상생재", "용신"],
                "astro_focus": ["2nd", "8th", "jupiter", "venus"],
                "tarot_focus": ["pentacles", "ace_pentacles", "empress"],
                "jung_focus": ["자기 가치", "풍요 의식"]
            },
            "health": {
                "saju_focus": ["오행 균형", "일간 강약"],
                "astro_focus": ["6th", "1st", "sun", "moon"],
                "tarot_focus": ["pentacles", "strength", "temperance"],
                "jung_focus": ["신체화", "몸-마음 연결"]
            },
            "spiritual": {
                "saju_focus": ["인성", "용신", "격국 레벨"],
                "astro_focus": ["12th", "9th", "neptune", "pluto"],
                "tarot_focus": ["major_arcana", "hermit", "star", "world"],
                "jung_focus": ["개성화", "자기(Self)", "초월"]
            }
        },

        "synthesis_template": {
            "1_identify_question_type": "질문 유형 파악 (career/relationship/money/health/spiritual/timing)",
            "2_gather_system_data": {
                "saju": "원국 분석 + 대운/세운",
                "astro": "네이탈 + 트랜짓",
                "tarot": "스프레드 결과"
            },
            "3_find_correlations": "시스템 간 상관관계 식별",
            "4_identify_patterns": "반복되는 주제/원형 파악",
            "5_jung_integration": "심리학적 통찰 연결",
            "6_synthesize_narrative": "통합 스토리텔링",
            "7_therapeutic_direction": "성장 방향 및 조언",
            "8_actionable_guidance": "구체적 행동 제안"
        },

        "response_guidelines": {
            "structure": [
                "1. 핵심 통찰 (1-2문장)",
                "2. 시스템별 분석 (사주/점성/타로)",
                "3. 통합 해석 (공통 주제)",
                "4. 심리학적 통찰",
                "5. 구체적 조언"
            ],
            "tone": {
                "empowering": "운명론이 아닌 선택의 힘",
                "nuanced": "같은 배치도 맥락에 따라 다름",
                "practical": "추상적 상징 → 실생활 조언",
                "compassionate": "판단 없이 이해"
            },
            "avoid": [
                "단정적 예언",
                "공포 조장",
                "책임 회피 (별 탓, 팔자)",
                "과도한 일반화"
            ]
        }
    }


# ==============================================================================
# Main Execution
# ==============================================================================

def main():
    """모든 해석 매트릭스 생성 및 저장"""

    print("=" * 60)
    print("다차원 해석 원칙 생성 스크립트")
    print("=" * 60)

    # 출력 디렉토리 확인/생성
    os.makedirs(os.path.join(OUTPUT_DIR, "saju"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "astro"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "tarot"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "integration"), exist_ok=True)

    # 1. 사주 매트릭스
    print("\n[1/5] 사주 다차원 매트릭스 생성...")
    saju_data = generate_saju_matrices()
    saju_path = os.path.join(OUTPUT_DIR, "saju", "saju_multidimensional_matrix.json")
    with open(saju_path, "w", encoding="utf-8") as f:
        json.dump(saju_data, f, ensure_ascii=False, indent=2)
    print(f"      저장: {saju_path}")

    # 2. 점성술 매트릭스
    print("\n[2/5] 점성술 다차원 매트릭스 생성...")
    astro_data = generate_astro_matrices()
    astro_path = os.path.join(OUTPUT_DIR, "astro", "astro_multidimensional_matrix.json")
    with open(astro_path, "w", encoding="utf-8") as f:
        json.dump(astro_data, f, ensure_ascii=False, indent=2)
    print(f"      저장: {astro_path}")

    # 3. 타로 매트릭스
    print("\n[3/5] 타로 다차원 매트릭스 생성...")
    tarot_data = generate_tarot_matrices()
    tarot_path = os.path.join(OUTPUT_DIR, "tarot", "tarot_multidimensional_matrix.json")
    with open(tarot_path, "w", encoding="utf-8") as f:
        json.dump(tarot_data, f, ensure_ascii=False, indent=2)
    print(f"      저장: {tarot_path}")

    # 4. 현대 직업 매핑
    print("\n[4/5] 현대 직업 매핑 생성...")
    career_data = generate_modern_career_mapping()
    career_path = os.path.join(OUTPUT_DIR, "integration", "modern_career_mapping.json")
    with open(career_path, "w", encoding="utf-8") as f:
        json.dump(career_data, f, ensure_ascii=False, indent=2)
    print(f"      저장: {career_path}")

    # 5. 통합 엔진
    print("\n[5/5] 통합 해석 엔진 생성...")
    integration_data = generate_integration_engine()
    integration_path = os.path.join(OUTPUT_DIR, "integration", "multimodal_integration_engine.json")
    with open(integration_path, "w", encoding="utf-8") as f:
        json.dump(integration_data, f, ensure_ascii=False, indent=2)
    print(f"      저장: {integration_path}")

    print("\n" + "=" * 60)
    print("모든 해석 매트릭스 생성 완료!")
    print("=" * 60)

    # 통계 출력
    print(f"\n생성된 파일:")
    print(f"  - 사주 매트릭스: {len(json.dumps(saju_data)):,} bytes")
    print(f"  - 점성술 매트릭스: {len(json.dumps(astro_data)):,} bytes")
    print(f"  - 타로 매트릭스: {len(json.dumps(tarot_data)):,} bytes")
    print(f"  - 직업 매핑: {len(json.dumps(career_data)):,} bytes")
    print(f"  - 통합 엔진: {len(json.dumps(integration_data)):,} bytes")


if __name__ == "__main__":
    main()
