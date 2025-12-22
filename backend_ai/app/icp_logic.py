# backend_ai/app/icp_logic.py
"""
ICP (Interpersonal Circumplex) Analysis Logic
==============================================
대인관계 원형 모델 분석 - 사주/점성술 데이터 기반 ICP 스타일 분석
- 8개 옥탄트 (PA, BC, DE, FG, HI, JK, LM, NO)
- Dominance-Submission 축
- Affiliation-Hostility 축
- 사주 십신 매핑
- 점성술 행성/별자리 매핑
- 궁합 분석
- 치료적 질문
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# ===============================================================
# ICP OCTANT DEFINITIONS
# ===============================================================

ICP_OCTANTS = {
    'PA': {
        'name': 'Dominant-Assured',
        'korean': '지배적-확신형',
        'dominance': 1.0,
        'affiliation': 0.5,
        'traits': ['리더십', '자신감', '주도적', '결단력'],
        'shadow': '독선적, 통제적'
    },
    'BC': {
        'name': 'Competitive-Arrogant',
        'korean': '경쟁적-거만형',
        'dominance': 0.7,
        'affiliation': -0.7,
        'traits': ['야심', '경쟁심', '성취지향', '독립적'],
        'shadow': '냉소적, 적대적'
    },
    'DE': {
        'name': 'Cold-Distant',
        'korean': '냉담-거리형',
        'dominance': 0.0,
        'affiliation': -1.0,
        'traits': ['분석적', '객관적', '독립적', '내향적'],
        'shadow': '고립, 소외'
    },
    'FG': {
        'name': 'Submissive-Introverted',
        'korean': '복종적-내향형',
        'dominance': -0.7,
        'affiliation': -0.7,
        'traits': ['겸손', '신중', '관찰자', '조용함'],
        'shadow': '자기비하, 위축'
    },
    'HI': {
        'name': 'Submissive-Unassured',
        'korean': '복종적-불확신형',
        'dominance': -1.0,
        'affiliation': 0.0,
        'traits': ['순응', '의존적', '수용적', '온화함'],
        'shadow': '수동적, 우유부단'
    },
    'JK': {
        'name': 'Cooperative-Agreeable',
        'korean': '협력적-동조형',
        'dominance': -0.7,
        'affiliation': 0.7,
        'traits': ['협조적', '친절', '조화추구', '배려'],
        'shadow': '자기희생, 경계없음'
    },
    'LM': {
        'name': 'Warm-Friendly',
        'korean': '따뜻-친화형',
        'dominance': 0.0,
        'affiliation': 1.0,
        'traits': ['공감', '사교적', '돌봄', '친근함'],
        'shadow': '과잉관여, 의존유발'
    },
    'NO': {
        'name': 'Nurturant-Extroverted',
        'korean': '양육적-외향형',
        'dominance': 0.7,
        'affiliation': 0.7,
        'traits': ['지도력', '보호적', '격려', '관대함'],
        'shadow': '간섭, 과보호'
    }
}

# ===============================================================
# SAJU SIBSIN TO ICP MAPPING
# ===============================================================

SIBSIN_TO_ICP = {
    # 비겁 (Comparing/Competing)
    '비견': {'primary': 'PA', 'secondary': 'BC', 'weight': 0.8},
    '겁재': {'primary': 'BC', 'secondary': 'PA', 'weight': 0.9},

    # 식상 (Expressing)
    '식신': {'primary': 'LM', 'secondary': 'NO', 'weight': 0.8},
    '상관': {'primary': 'BC', 'secondary': 'DE', 'weight': 0.7},

    # 재성 (Wealth)
    '편재': {'primary': 'BC', 'secondary': 'PA', 'weight': 0.7},
    '정재': {'primary': 'JK', 'secondary': 'LM', 'weight': 0.8},

    # 관성 (Authority)
    '편관': {'primary': 'PA', 'secondary': 'BC', 'weight': 0.9},
    '정관': {'primary': 'NO', 'secondary': 'PA', 'weight': 0.8},

    # 인성 (Resource)
    '편인': {'primary': 'DE', 'secondary': 'FG', 'weight': 0.8},
    '정인': {'primary': 'LM', 'secondary': 'JK', 'weight': 0.9}
}

# ===============================================================
# ASTRO TO ICP MAPPING
# ===============================================================

PLANET_TO_ICP = {
    'sun': {'primary': 'PA', 'secondary': 'NO', 'weight': 1.0},
    'moon': {'primary': 'LM', 'secondary': 'JK', 'weight': 0.9},
    'mercury': {'primary': 'DE', 'secondary': 'BC', 'weight': 0.7},
    'venus': {'primary': 'LM', 'secondary': 'JK', 'weight': 0.8},
    'mars': {'primary': 'BC', 'secondary': 'PA', 'weight': 0.9},
    'jupiter': {'primary': 'NO', 'secondary': 'PA', 'weight': 0.8},
    'saturn': {'primary': 'DE', 'secondary': 'FG', 'weight': 0.8},
    'uranus': {'primary': 'BC', 'secondary': 'DE', 'weight': 0.6},
    'neptune': {'primary': 'FG', 'secondary': 'LM', 'weight': 0.6},
    'pluto': {'primary': 'PA', 'secondary': 'BC', 'weight': 0.7}
}

SIGN_TO_ICP = {
    'aries': {'primary': 'PA', 'secondary': 'BC'},
    'taurus': {'primary': 'JK', 'secondary': 'LM'},
    'gemini': {'primary': 'DE', 'secondary': 'BC'},
    'cancer': {'primary': 'LM', 'secondary': 'JK'},
    'leo': {'primary': 'PA', 'secondary': 'NO'},
    'virgo': {'primary': 'DE', 'secondary': 'JK'},
    'libra': {'primary': 'JK', 'secondary': 'LM'},
    'scorpio': {'primary': 'BC', 'secondary': 'PA'},
    'sagittarius': {'primary': 'NO', 'secondary': 'PA'},
    'capricorn': {'primary': 'PA', 'secondary': 'DE'},
    'aquarius': {'primary': 'DE', 'secondary': 'BC'},
    'pisces': {'primary': 'FG', 'secondary': 'LM'}
}

# ===============================================================
# ICP COMPATIBILITY MATRIX
# ===============================================================

ICP_COMPATIBILITY = {
    # Same octant
    ('PA', 'PA'): {'score': 60, 'dynamic': '권력 투쟁 가능', 'advice': '역할 분담 필요'},
    ('BC', 'BC'): {'score': 40, 'dynamic': '경쟁적 갈등', 'advice': '협력 영역 찾기'},
    ('DE', 'DE'): {'score': 55, 'dynamic': '정서적 거리감', 'advice': '감정 표현 연습'},
    ('FG', 'FG'): {'score': 50, 'dynamic': '주도권 부재', 'advice': '적극성 개발'},
    ('HI', 'HI'): {'score': 45, 'dynamic': '의존 관계', 'advice': '독립성 키우기'},
    ('JK', 'JK'): {'score': 80, 'dynamic': '조화로운 협력', 'advice': '건강한 경계 설정'},
    ('LM', 'LM'): {'score': 85, 'dynamic': '따뜻한 교감', 'advice': '개인 공간 존중'},
    ('NO', 'NO'): {'score': 65, 'dynamic': '상호 지도 욕구', 'advice': '수평적 대화'},

    # Complementary pairs (opposite on circle)
    ('PA', 'HI'): {'score': 70, 'dynamic': '리더-팔로워', 'advice': '상호 존중 필수'},
    ('BC', 'JK'): {'score': 65, 'dynamic': '주도-순응', 'advice': '균형 조절'},
    ('DE', 'LM'): {'score': 75, 'dynamic': '이성-감성 보완', 'advice': '서로의 방식 인정'},
    ('FG', 'NO'): {'score': 80, 'dynamic': '보호-의존', 'advice': '성장 기회 제공'},

    # Adjacent pairs (harmonious)
    ('PA', 'NO'): {'score': 85, 'dynamic': '강한 리더십 팀', 'advice': '방향 통일'},
    ('PA', 'BC'): {'score': 55, 'dynamic': '경쟁적 동맹', 'advice': '목표 공유'},
    ('LM', 'NO'): {'score': 90, 'dynamic': '이상적 파트너십', 'advice': '현재에 감사'},
    ('LM', 'JK'): {'score': 88, 'dynamic': '따뜻한 조화', 'advice': '경계 유지'},
    ('JK', 'HI'): {'score': 82, 'dynamic': '안정적 협력', 'advice': '주도권 교환'},
    ('FG', 'HI'): {'score': 65, 'dynamic': '수동적 관계', 'advice': '적극성 함양'},
    ('FG', 'DE'): {'score': 60, 'dynamic': '거리두기', 'advice': '연결 시도'},
    ('DE', 'BC'): {'score': 58, 'dynamic': '냉정한 관계', 'advice': '감정 표현'},

    # Challenging pairs
    ('PA', 'FG'): {'score': 55, 'dynamic': '지배-위축', 'advice': '존중과 격려'},
    ('BC', 'LM'): {'score': 50, 'dynamic': '공격-친화 충돌', 'advice': '중간 지점 찾기'},
    ('DE', 'NO'): {'score': 60, 'dynamic': '거리-친밀 갈등', 'advice': '공간 협상'},
    ('BC', 'HI'): {'score': 45, 'dynamic': '착취 위험', 'advice': '경계 설정 필수'}
}


# ===============================================================
# ICP ANALYZER CLASS
# ===============================================================

class ICPAnalyzer:
    """ICP Interpersonal Style Analyzer."""

    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data" / "graph" / "rules" / "icp"
        self.data = {}
        self._load_data()

    def _load_data(self):
        """Load all ICP JSON data files."""
        if not self.data_dir.exists():
            print(f"[ICPAnalyzer] Data directory not found: {self.data_dir}")
            return

        for json_file in self.data_dir.glob("*.json"):
            try:
                with open(json_file, encoding='utf-8') as f:
                    key = json_file.stem.replace('icp_', '')
                    self.data[key] = json.load(f)
                    print(f"[ICPAnalyzer] Loaded {key}")
            except Exception as e:
                print(f"[ICPAnalyzer] Failed to load {json_file}: {e}")

    def analyze_from_saju(self, saju_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze ICP style from Saju data.

        Args:
            saju_data: Saju analysis containing sibsin (십신) information

        Returns:
            ICP analysis result
        """
        octant_scores = {k: 0.0 for k in ICP_OCTANTS.keys()}

        # Extract sibsin from various possible locations
        sibsin_data = saju_data.get('sibsin', {})
        if not sibsin_data:
            sibsin_data = saju_data.get('ten_gods', {})
        if not sibsin_data:
            # Try to find in pillars
            pillars = saju_data.get('pillars', {})
            for pillar_name, pillar_data in pillars.items():
                if isinstance(pillar_data, dict):
                    for key in ['sibsin', 'ten_god', 'sipsin']:
                        if key in pillar_data:
                            sibsin_name = pillar_data[key]
                            if sibsin_name in SIBSIN_TO_ICP:
                                mapping = SIBSIN_TO_ICP[sibsin_name]
                                octant_scores[mapping['primary']] += mapping['weight']
                                octant_scores[mapping['secondary']] += mapping['weight'] * 0.5

        # Process sibsin_data if found
        if isinstance(sibsin_data, dict):
            for sibsin_name, sibsin_info in sibsin_data.items():
                if sibsin_name in SIBSIN_TO_ICP:
                    mapping = SIBSIN_TO_ICP[sibsin_name]
                    # Weight by count or strength if available
                    count = 1
                    if isinstance(sibsin_info, dict):
                        count = sibsin_info.get('count', 1)
                    elif isinstance(sibsin_info, (int, float)):
                        count = sibsin_info

                    octant_scores[mapping['primary']] += mapping['weight'] * count
                    octant_scores[mapping['secondary']] += mapping['weight'] * 0.5 * count

        # Normalize scores
        max_score = max(octant_scores.values()) if octant_scores.values() else 1
        if max_score > 0:
            for k in octant_scores:
                octant_scores[k] = round(octant_scores[k] / max_score, 2)

        # Find primary and secondary styles
        sorted_octants = sorted(octant_scores.items(), key=lambda x: x[1], reverse=True)
        primary_style = sorted_octants[0][0] if sorted_octants else 'LM'
        secondary_style = sorted_octants[1][0] if len(sorted_octants) > 1 else None

        return {
            'primary_style': primary_style,
            'secondary_style': secondary_style,
            'octant_scores': octant_scores,
            'primary_info': ICP_OCTANTS.get(primary_style, {}),
            'secondary_info': ICP_OCTANTS.get(secondary_style, {}) if secondary_style else None,
            'source': 'saju'
        }

    def analyze_from_astro(self, astro_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze ICP style from astrology data.

        Args:
            astro_data: Astrology analysis with planet positions

        Returns:
            ICP analysis result
        """
        octant_scores = {k: 0.0 for k in ICP_OCTANTS.keys()}

        # Process planets
        planets = astro_data.get('planets', {})
        if isinstance(planets, list):
            # Convert list to dict
            planets = {p.get('name', '').lower(): p for p in planets}

        for planet_name, planet_data in planets.items():
            planet_lower = planet_name.lower()
            if planet_lower in PLANET_TO_ICP:
                mapping = PLANET_TO_ICP[planet_lower]

                # Get sign for additional weighting
                sign = None
                if isinstance(planet_data, dict):
                    sign = planet_data.get('sign', '').lower()
                elif isinstance(planet_data, str):
                    sign = planet_data.lower()

                octant_scores[mapping['primary']] += mapping['weight']
                octant_scores[mapping['secondary']] += mapping['weight'] * 0.4

                # Add sign influence
                if sign and sign in SIGN_TO_ICP:
                    sign_mapping = SIGN_TO_ICP[sign]
                    octant_scores[sign_mapping['primary']] += 0.3
                    octant_scores[sign_mapping['secondary']] += 0.15

        # Special weight for Sun sign (identity)
        sun_sign = astro_data.get('sun_sign', '').lower()
        if not sun_sign and 'sun' in planets:
            sun_data = planets['sun']
            if isinstance(sun_data, dict):
                sun_sign = sun_data.get('sign', '').lower()

        if sun_sign and sun_sign in SIGN_TO_ICP:
            mapping = SIGN_TO_ICP[sun_sign]
            octant_scores[mapping['primary']] += 0.5
            octant_scores[mapping['secondary']] += 0.25

        # Moon sign (emotional style)
        moon_sign = astro_data.get('moon_sign', '').lower()
        if not moon_sign and 'moon' in planets:
            moon_data = planets['moon']
            if isinstance(moon_data, dict):
                moon_sign = moon_data.get('sign', '').lower()

        if moon_sign and moon_sign in SIGN_TO_ICP:
            mapping = SIGN_TO_ICP[moon_sign]
            octant_scores[mapping['primary']] += 0.4
            octant_scores[mapping['secondary']] += 0.2

        # Normalize scores
        max_score = max(octant_scores.values()) if octant_scores.values() else 1
        if max_score > 0:
            for k in octant_scores:
                octant_scores[k] = round(octant_scores[k] / max_score, 2)

        # Find primary and secondary styles
        sorted_octants = sorted(octant_scores.items(), key=lambda x: x[1], reverse=True)
        primary_style = sorted_octants[0][0] if sorted_octants else 'LM'
        secondary_style = sorted_octants[1][0] if len(sorted_octants) > 1 else None

        return {
            'primary_style': primary_style,
            'secondary_style': secondary_style,
            'octant_scores': octant_scores,
            'primary_info': ICP_OCTANTS.get(primary_style, {}),
            'secondary_info': ICP_OCTANTS.get(secondary_style, {}) if secondary_style else None,
            'source': 'astrology'
        }

    def analyze_combined(
        self,
        saju_data: Dict[str, Any] = None,
        astro_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Analyze ICP style from combined Saju and Astrology data.

        Args:
            saju_data: Saju analysis (optional)
            astro_data: Astrology analysis (optional)

        Returns:
            Combined ICP analysis
        """
        combined_scores = {k: 0.0 for k in ICP_OCTANTS.keys()}
        sources = []

        if saju_data:
            saju_result = self.analyze_from_saju(saju_data)
            for octant, score in saju_result['octant_scores'].items():
                combined_scores[octant] += score * 0.6  # 60% weight for saju
            sources.append('saju')

        if astro_data:
            astro_result = self.analyze_from_astro(astro_data)
            for octant, score in astro_result['octant_scores'].items():
                combined_scores[octant] += score * 0.4  # 40% weight for astro
            sources.append('astrology')

        # Normalize
        max_score = max(combined_scores.values()) if combined_scores.values() else 1
        if max_score > 0:
            for k in combined_scores:
                combined_scores[k] = round(combined_scores[k] / max_score, 2)

        sorted_octants = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        primary_style = sorted_octants[0][0] if sorted_octants else 'LM'
        secondary_style = sorted_octants[1][0] if len(sorted_octants) > 1 else None

        # Calculate dominance and affiliation scores
        dominance = 0
        affiliation = 0
        for octant, score in combined_scores.items():
            info = ICP_OCTANTS.get(octant, {})
            dominance += info.get('dominance', 0) * score
            affiliation += info.get('affiliation', 0) * score

        return {
            'primary_style': primary_style,
            'secondary_style': secondary_style,
            'octant_scores': combined_scores,
            'primary_info': ICP_OCTANTS.get(primary_style, {}),
            'secondary_info': ICP_OCTANTS.get(secondary_style, {}) if secondary_style else None,
            'dominance_score': round(dominance, 2),
            'affiliation_score': round(affiliation, 2),
            'sources': sources
        }

    def get_compatibility(
        self,
        style1: str,
        style2: str
    ) -> Dict[str, Any]:
        """
        Get compatibility between two ICP styles.

        Args:
            style1: First person's primary ICP octant
            style2: Second person's primary ICP octant

        Returns:
            Compatibility analysis
        """
        # Try both orderings
        key1 = (style1, style2)
        key2 = (style2, style1)

        if key1 in ICP_COMPATIBILITY:
            result = ICP_COMPATIBILITY[key1].copy()
        elif key2 in ICP_COMPATIBILITY:
            result = ICP_COMPATIBILITY[key2].copy()
        else:
            # Default compatibility
            result = {
                'score': 70,
                'dynamic': '일반적 관계',
                'advice': '상호 이해와 소통 필요'
            }

        result['person1_style'] = style1
        result['person2_style'] = style2
        result['person1_info'] = ICP_OCTANTS.get(style1, {})
        result['person2_info'] = ICP_OCTANTS.get(style2, {})

        return result

    def get_therapeutic_questions(self, style: str) -> List[str]:
        """
        Get therapeutic questions for an ICP style.

        Args:
            style: ICP octant code (e.g., 'PA', 'LM')

        Returns:
            List of therapeutic questions
        """
        questions_data = self.data.get('therapeutic_questions', {})
        octant_questions = questions_data.get('octant_specific_questions', {})

        if style in octant_questions:
            return octant_questions[style].get('exploration_questions', [])

        # Fallback questions
        return [
            "당신의 대인관계에서 가장 중요하게 여기는 것은 무엇인가요?",
            "갈등 상황에서 주로 어떻게 반응하나요?",
            "가장 편안하게 느끼는 관계 유형은 무엇인가요?"
        ]

    def get_growth_recommendations(self, style: str) -> Dict[str, Any]:
        """
        Get growth recommendations for an ICP style.

        Args:
            style: ICP octant code

        Returns:
            Growth recommendations
        """
        style_info = ICP_OCTANTS.get(style, {})

        # Generic recommendations based on octant position
        recommendations = {
            'PA': {
                'develop': '경청과 협력 능력',
                'balance': 'HI 에너지 (수용성)',
                'exercises': ['다른 사람의 의견 먼저 듣기', '통제하려는 욕구 인식하기']
            },
            'BC': {
                'develop': '공감과 협조 능력',
                'balance': 'JK 에너지 (협력)',
                'exercises': ['경쟁 대신 윈-윈 찾기', '취약함 표현 연습']
            },
            'DE': {
                'develop': '감정 표현과 친밀감',
                'balance': 'LM 에너지 (따뜻함)',
                'exercises': ['감정 일기 쓰기', '먼저 연락하기']
            },
            'FG': {
                'develop': '자기 표현과 자신감',
                'balance': 'NO 에너지 (주도성)',
                'exercises': ['의견 표현 연습', '작은 리더십 경험']
            },
            'HI': {
                'develop': '주도성과 자기 주장',
                'balance': 'PA 에너지 (확신)',
                'exercises': ['거절 연습', '자기 필요 표현하기']
            },
            'JK': {
                'develop': '건강한 경계 설정',
                'balance': 'BC 에너지 (자기주장)',
                'exercises': ['아니오 말하기', '자기 욕구 인식']
            },
            'LM': {
                'develop': '객관성과 경계',
                'balance': 'DE 에너지 (거리두기)',
                'exercises': ['혼자 시간 갖기', '과잉개입 줄이기']
            },
            'NO': {
                'develop': '수평적 관계 능력',
                'balance': 'FG 에너지 (겸손)',
                'exercises': ['조언 대신 경청', '도움 받기 연습']
            }
        }

        return recommendations.get(style, {
            'develop': '균형 잡힌 대인관계',
            'exercises': ['자기 인식 훈련', '다양한 관계 경험']
        })


# ===============================================================
# MAIN INTERFACE FUNCTIONS
# ===============================================================

def analyze_icp_style(
    saju_data: Dict[str, Any] = None,
    astro_data: Dict[str, Any] = None,
    locale: str = "ko"
) -> Dict[str, Any]:
    """
    Main ICP analysis function.

    Args:
        saju_data: Saju analysis data (optional)
        astro_data: Astrology analysis data (optional)
        locale: Language code

    Returns:
        Complete ICP analysis
    """
    try:
        analyzer = ICPAnalyzer()
        result = analyzer.analyze_combined(saju_data, astro_data)

        # Add therapeutic questions
        primary = result.get('primary_style', 'LM')
        result['therapeutic_questions'] = analyzer.get_therapeutic_questions(primary)

        # Add growth recommendations
        result['growth_recommendations'] = analyzer.get_growth_recommendations(primary)

        return {
            'status': 'success',
            'analysis': result
        }

    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'trace': traceback.format_exc()
        }


def analyze_icp_compatibility(
    person1_saju: Dict[str, Any] = None,
    person1_astro: Dict[str, Any] = None,
    person2_saju: Dict[str, Any] = None,
    person2_astro: Dict[str, Any] = None,
    locale: str = "ko"
) -> Dict[str, Any]:
    """
    Analyze ICP compatibility between two people.

    Args:
        person1_saju: Person 1's Saju data
        person1_astro: Person 1's Astrology data
        person2_saju: Person 2's Saju data
        person2_astro: Person 2's Astrology data
        locale: Language code

    Returns:
        ICP compatibility analysis
    """
    try:
        analyzer = ICPAnalyzer()

        # Get both profiles
        p1_result = analyzer.analyze_combined(person1_saju, person1_astro)
        p2_result = analyzer.analyze_combined(person2_saju, person2_astro)

        style1 = p1_result.get('primary_style', 'LM')
        style2 = p2_result.get('primary_style', 'LM')

        compatibility = analyzer.get_compatibility(style1, style2)

        return {
            'status': 'success',
            'person1_profile': p1_result,
            'person2_profile': p2_result,
            'compatibility': compatibility
        }

    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'trace': traceback.format_exc()
        }


def get_icp_questions(style: str, locale: str = "ko") -> Dict[str, Any]:
    """
    Get therapeutic questions for an ICP style.

    Args:
        style: ICP octant code
        locale: Language code

    Returns:
        Therapeutic questions and insights
    """
    try:
        analyzer = ICPAnalyzer()
        questions = analyzer.get_therapeutic_questions(style)
        growth = analyzer.get_growth_recommendations(style)
        info = ICP_OCTANTS.get(style, {})

        return {
            'status': 'success',
            'style': style,
            'style_info': info,
            'questions': questions,
            'growth': growth
        }

    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'trace': traceback.format_exc()
        }


# For testing
if __name__ == "__main__":
    # Test with sample data
    sample_saju = {
        'sibsin': {
            '비견': {'count': 2},
            '정관': {'count': 1},
            '정인': {'count': 1}
        }
    }

    sample_astro = {
        'sun_sign': 'leo',
        'moon_sign': 'cancer',
        'planets': {
            'sun': {'sign': 'leo'},
            'moon': {'sign': 'cancer'},
            'mars': {'sign': 'aries'}
        }
    }

    result = analyze_icp_style(sample_saju, sample_astro)
    print(json.dumps(result, indent=2, ensure_ascii=False))
