#!/usr/bin/env python3
"""
완벽한 해석 코퍼스 자동 생성 스크립트
점성술, 타로, 꿈, 역학, 수비학 등 모든 도메인의 구체적 해석문 생성

Usage:
    python scripts/generate_interpretation_corpus.py --domain astro
    python scripts/generate_interpretation_corpus.py --domain tarot
    python scripts/generate_interpretation_corpus.py --domain dream
    python scripts/generate_interpretation_corpus.py --domain iching
    python scripts/generate_interpretation_corpus.py --domain numerology
    python scripts/generate_interpretation_corpus.py --all
"""

import os
import json
import asyncio
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import csv

# OpenAI API
try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("Warning: openai not installed. Run: pip install openai")

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "backend_ai" / "data"
GRAPH_DIR = DATA_DIR / "graph"
OUTPUT_DIR = GRAPH_DIR

# ============================================================
# 데이터 클래스 정의
# ============================================================

@dataclass
class InterpretationEntry:
    """해석 엔트리 기본 구조"""
    id: str
    category: str
    context: str
    interpretation_ko: str
    interpretation_en: str
    keywords: List[str]
    sentiment: str  # positive, neutral, negative, mixed
    life_areas: List[str]  # career, love, health, wealth, etc.


# ============================================================
# 점성술 해석 생성기
# ============================================================

class AstroInterpretationGenerator:
    """점성술 해석 코퍼스 생성"""

    PLANETS = [
        ("Sun", "태양", "자아, 생명력, 의지, 창조성"),
        ("Moon", "달", "감정, 무의식, 본능, 내면"),
        ("Mercury", "수성", "지성, 소통, 학습, 이동"),
        ("Venus", "금성", "사랑, 아름다움, 가치, 조화"),
        ("Mars", "화성", "행동, 열정, 용기, 에너지"),
        ("Jupiter", "목성", "확장, 행운, 지혜, 성장"),
        ("Saturn", "토성", "제한, 책임, 구조, 성숙"),
        ("Uranus", "천왕성", "혁명, 자유, 독창성, 변화"),
        ("Neptune", "해왕성", "직관, 영성, 환상, 초월"),
        ("Pluto", "명왕성", "변형, 재탄생, 권력, 심층")
    ]

    SIGNS = [
        ("Aries", "양자리", "Fire", "Cardinal", "개척, 용기, 독립, 리더십"),
        ("Taurus", "황소자리", "Earth", "Fixed", "안정, 감각, 인내, 가치"),
        ("Gemini", "쌍둥이자리", "Air", "Mutable", "소통, 호기심, 적응력"),
        ("Cancer", "게자리", "Water", "Cardinal", "보호, 감정, 가정, 모성"),
        ("Leo", "사자자리", "Fire", "Fixed", "창조, 자신감, 리더십"),
        ("Virgo", "처녀자리", "Earth", "Mutable", "분석, 봉사, 완벽주의"),
        ("Libra", "천칭자리", "Air", "Cardinal", "균형, 조화, 파트너십"),
        ("Scorpio", "전갈자리", "Water", "Fixed", "변형, 강렬함, 재생"),
        ("Sagittarius", "사수자리", "Fire", "Mutable", "탐험, 자유, 철학"),
        ("Capricorn", "염소자리", "Earth", "Cardinal", "야망, 책임, 성취"),
        ("Aquarius", "물병자리", "Air", "Fixed", "혁신, 이상, 독창성"),
        ("Pisces", "물고기자리", "Water", "Mutable", "직관, 영성, 동정심")
    ]

    HOUSES = [
        (1, "1하우스", "자아, 외모, 첫인상, 개성"),
        (2, "2하우스", "재물, 가치, 자원, 자존감"),
        (3, "3하우스", "소통, 학습, 형제, 이동"),
        (4, "4하우스", "가정, 뿌리, 내면, 부모"),
        (5, "5하우스", "창의, 사랑, 자녀, 즐거움"),
        (6, "6하우스", "일상, 건강, 봉사, 루틴"),
        (7, "7하우스", "파트너십, 결혼, 계약, 관계"),
        (8, "8하우스", "변형, 공유자원, 죽음, 재생"),
        (9, "9하우스", "철학, 여행, 고등교육, 신념"),
        (10, "10하우스", "직업, 명예, 사회적 지위"),
        (11, "11하우스", "우정, 희망, 집단, 미래"),
        (12, "12하우스", "무의식, 영성, 고독, 카르마")
    ]

    ASPECTS = [
        ("conjunction", "합", 0, "융합, 강화, 집중"),
        ("sextile", "육분", 60, "기회, 협력, 조화"),
        ("square", "사각", 90, "긴장, 도전, 성장"),
        ("trine", "삼합", 120, "흐름, 재능, 행운"),
        ("opposition", "대립", 180, "균형, 인식, 통합")
    ]

    def __init__(self, client: Optional['AsyncOpenAI'] = None):
        self.client = client
        self.output_dir = OUTPUT_DIR / "astro_database" / "interpretations"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_all(self):
        """모든 점성술 해석 생성"""
        print("=" * 60)
        print("점성술 해석 코퍼스 생성 시작")
        print("=" * 60)

        # 1. 행성-별자리 조합 (10 planets × 12 signs = 120)
        planet_sign = await self.generate_planet_in_sign()

        # 2. 행성-하우스 조합 (10 × 12 = 120)
        planet_house = await self.generate_planet_in_house()

        # 3. 행성-행성 애스펙트 (45 × 5 = 225)
        aspects = await self.generate_aspects()

        # 4. 별자리 상승점 해석 (12)
        ascendants = await self.generate_ascendants()

        # 5. 트랜짓 해석
        transits = await self.generate_transits()

        # 통합 저장
        all_data = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0",
                "total_entries": len(planet_sign) + len(planet_house) + len(aspects) + len(ascendants) + len(transits)
            },
            "planet_in_sign": planet_sign,
            "planet_in_house": planet_house,
            "aspects": aspects,
            "ascendants": ascendants,
            "transits": transits
        }

        output_file = self.output_dir / "complete_interpretations.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"\n저장 완료: {output_file}")
        print(f"총 {all_data['meta']['total_entries']}개 해석 생성됨")

        return all_data

    async def generate_planet_in_sign(self) -> List[Dict]:
        """행성이 별자리에 있을 때 해석"""
        results = []

        for planet_en, planet_ko, planet_meaning in self.PLANETS:
            for sign_en, sign_ko, element, modality, sign_meaning in self.SIGNS:
                entry_id = f"{planet_en}_in_{sign_en}"

                # 에너지 조화도 계산
                harmony = self._calculate_planet_sign_harmony(planet_en, sign_en, element)

                interpretation = {
                    "id": entry_id,
                    "planet": {"en": planet_en, "ko": planet_ko},
                    "sign": {"en": sign_en, "ko": sign_ko},
                    "element": element,
                    "modality": modality,
                    "harmony_level": harmony,
                    "core_theme": f"{planet_ko}의 {planet_meaning.split(',')[0]} 에너지가 {sign_ko}의 {sign_meaning.split(',')[0]} 특성으로 표현됨",
                    "detailed_interpretation": await self._generate_planet_sign_text(
                        planet_en, planet_ko, planet_meaning,
                        sign_en, sign_ko, sign_meaning, element, modality
                    ),
                    "keywords": self._extract_keywords(planet_meaning, sign_meaning),
                    "life_areas": self._get_planet_life_areas(planet_en),
                    "advice": await self._generate_advice(planet_en, sign_en)
                }
                results.append(interpretation)

        print(f"행성-별자리 해석: {len(results)}개 생성")
        return results

    async def generate_planet_in_house(self) -> List[Dict]:
        """행성이 하우스에 있을 때 해석"""
        results = []

        for planet_en, planet_ko, planet_meaning in self.PLANETS:
            for house_num, house_ko, house_meaning in self.HOUSES:
                entry_id = f"{planet_en}_in_H{house_num}"

                interpretation = {
                    "id": entry_id,
                    "planet": {"en": planet_en, "ko": planet_ko},
                    "house": {"number": house_num, "ko": house_ko},
                    "core_theme": f"{planet_ko}({planet_meaning.split(',')[0]})이 {house_ko}({house_meaning.split(',')[0]}) 영역에서 활성화",
                    "detailed_interpretation": await self._generate_planet_house_text(
                        planet_en, planet_ko, planet_meaning,
                        house_num, house_ko, house_meaning
                    ),
                    "manifestation": self._get_house_manifestation(planet_en, house_num),
                    "keywords": self._extract_keywords(planet_meaning, house_meaning),
                    "challenges": self._get_planet_house_challenges(planet_en, house_num),
                    "opportunities": self._get_planet_house_opportunities(planet_en, house_num)
                }
                results.append(interpretation)

        print(f"행성-하우스 해석: {len(results)}개 생성")
        return results

    async def generate_aspects(self) -> List[Dict]:
        """행성 간 애스펙트 해석"""
        results = []
        planet_list = self.PLANETS

        for i, (p1_en, p1_ko, p1_meaning) in enumerate(planet_list):
            for p2_en, p2_ko, p2_meaning in planet_list[i+1:]:
                for asp_en, asp_ko, angle, asp_meaning in self.ASPECTS:
                    entry_id = f"{p1_en}_{asp_en}_{p2_en}"

                    interpretation = {
                        "id": entry_id,
                        "planet1": {"en": p1_en, "ko": p1_ko},
                        "planet2": {"en": p2_en, "ko": p2_ko},
                        "aspect": {"en": asp_en, "ko": asp_ko, "angle": angle},
                        "nature": "harmonious" if asp_en in ["sextile", "trine"] else "challenging" if asp_en in ["square", "opposition"] else "neutral",
                        "core_theme": f"{p1_ko}와 {p2_ko}의 {asp_ko} - {asp_meaning.split(',')[0]}",
                        "detailed_interpretation": await self._generate_aspect_text(
                            p1_en, p1_ko, p1_meaning,
                            p2_en, p2_ko, p2_meaning,
                            asp_en, asp_ko, asp_meaning
                        ),
                        "positive_expression": self._get_aspect_positive(p1_en, p2_en, asp_en),
                        "negative_expression": self._get_aspect_negative(p1_en, p2_en, asp_en),
                        "integration_advice": self._get_aspect_integration(p1_en, p2_en, asp_en)
                    }
                    results.append(interpretation)

        print(f"애스펙트 해석: {len(results)}개 생성")
        return results

    async def generate_ascendants(self) -> List[Dict]:
        """상승점(ASC) 해석"""
        results = []

        for sign_en, sign_ko, element, modality, sign_meaning in self.SIGNS:
            entry_id = f"ASC_{sign_en}"

            interpretation = {
                "id": entry_id,
                "sign": {"en": sign_en, "ko": sign_ko},
                "element": element,
                "modality": modality,
                "core_theme": f"{sign_ko} 상승 - 세상에 보여지는 페르소나",
                "first_impression": self._get_asc_first_impression(sign_en),
                "physical_traits": self._get_asc_physical(sign_en),
                "approach_to_life": self._get_asc_approach(sign_en),
                "detailed_interpretation": await self._generate_asc_text(sign_en, sign_ko, sign_meaning),
                "ruling_planet": self._get_ruling_planet(sign_en),
                "advice": f"{sign_ko} 상승은 {sign_meaning.split(',')[0]}의 에너지로 세상과 만납니다."
            }
            results.append(interpretation)

        print(f"상승점 해석: {len(results)}개 생성")
        return results

    async def generate_transits(self) -> List[Dict]:
        """트랜짓 해석"""
        results = []

        # 주요 트랜짓: 외행성 → 내행성/포인트
        outer_planets = [p for p in self.PLANETS if p[0] in ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]]
        natal_points = self.PLANETS + [("ASC", "상승점", "자아표현"), ("MC", "천정", "커리어")]

        for transit_p, transit_ko, transit_meaning in outer_planets:
            for natal_p, natal_ko, natal_meaning in natal_points:
                for asp_en, asp_ko, angle, asp_meaning in self.ASPECTS[:5]:  # 주요 애스펙트만
                    entry_id = f"TR_{transit_p}_{asp_en}_{natal_p}"

                    interpretation = {
                        "id": entry_id,
                        "transit_planet": {"en": transit_p, "ko": transit_ko},
                        "natal_point": {"en": natal_p, "ko": natal_ko},
                        "aspect": {"en": asp_en, "ko": asp_ko},
                        "duration": self._get_transit_duration(transit_p),
                        "theme": f"트랜짓 {transit_ko}가 네이탈 {natal_ko}에 {asp_ko}",
                        "effects": await self._generate_transit_text(transit_p, natal_p, asp_en),
                        "timing_advice": self._get_transit_timing(transit_p, asp_en)
                    }
                    results.append(interpretation)

        print(f"트랜짓 해석: {len(results)}개 생성")
        return results

    # ============================================================
    # Helper Methods
    # ============================================================

    def _calculate_planet_sign_harmony(self, planet: str, sign: str, element: str) -> str:
        """행성-별자리 조화도"""
        rulerships = {
            "Sun": ["Leo"],
            "Moon": ["Cancer"],
            "Mercury": ["Gemini", "Virgo"],
            "Venus": ["Taurus", "Libra"],
            "Mars": ["Aries", "Scorpio"],
            "Jupiter": ["Sagittarius", "Pisces"],
            "Saturn": ["Capricorn", "Aquarius"],
            "Uranus": ["Aquarius"],
            "Neptune": ["Pisces"],
            "Pluto": ["Scorpio"]
        }

        detriments = {
            "Sun": ["Aquarius"],
            "Moon": ["Capricorn"],
            "Mercury": ["Sagittarius", "Pisces"],
            "Venus": ["Aries", "Scorpio"],
            "Mars": ["Taurus", "Libra"],
            "Jupiter": ["Gemini", "Virgo"],
            "Saturn": ["Cancer", "Leo"]
        }

        exaltations = {
            "Sun": ["Aries"],
            "Moon": ["Taurus"],
            "Mercury": ["Virgo"],
            "Venus": ["Pisces"],
            "Mars": ["Capricorn"],
            "Jupiter": ["Cancer"],
            "Saturn": ["Libra"]
        }

        falls = {
            "Sun": ["Libra"],
            "Moon": ["Scorpio"],
            "Mercury": ["Pisces"],
            "Venus": ["Virgo"],
            "Mars": ["Cancer"],
            "Jupiter": ["Capricorn"],
            "Saturn": ["Aries"]
        }

        if sign in rulerships.get(planet, []):
            return "domicile"  # 본좌위
        elif sign in exaltations.get(planet, []):
            return "exalted"  # 고양
        elif sign in detriments.get(planet, []):
            return "detriment"  # 손상
        elif sign in falls.get(planet, []):
            return "fall"  # 쇠약
        else:
            return "neutral"

    def _extract_keywords(self, *meanings: str) -> List[str]:
        """키워드 추출"""
        keywords = []
        for meaning in meanings:
            keywords.extend([k.strip() for k in meaning.split(',')])
        return list(set(keywords))[:8]

    def _get_planet_life_areas(self, planet: str) -> List[str]:
        """행성별 생활 영역"""
        areas = {
            "Sun": ["career", "identity", "vitality", "leadership"],
            "Moon": ["emotions", "home", "family", "habits"],
            "Mercury": ["communication", "learning", "travel", "business"],
            "Venus": ["love", "beauty", "money", "relationships"],
            "Mars": ["action", "competition", "sexuality", "conflict"],
            "Jupiter": ["luck", "growth", "education", "travel"],
            "Saturn": ["career", "responsibility", "structure", "time"],
            "Uranus": ["change", "innovation", "freedom", "technology"],
            "Neptune": ["spirituality", "creativity", "dreams", "intuition"],
            "Pluto": ["transformation", "power", "psychology", "rebirth"]
        }
        return areas.get(planet, ["general"])

    def _get_house_manifestation(self, planet: str, house: int) -> Dict[str, str]:
        """행성-하우스 발현 양상"""
        # 상세 매트릭스 - 대표적인 것들만
        base = {
            "Sun": {
                1: "강한 자아 정체성, 리더십 발휘",
                2: "자원과 재물을 통한 자아 표현",
                3: "소통과 학습에서 빛나는 존재감",
                4: "가정의 중심, 가족 리더",
                5: "창조적 자기표현, 예술적 재능",
                6: "일을 통한 자아실현",
                7: "관계에서 빛나는 존재",
                8: "깊은 변형을 통한 자아 발견",
                9: "철학과 신념의 탐구자",
                10: "사회적 성공과 명성",
                11: "집단 속 리더, 영향력 있는 존재",
                12: "내면 세계의 탐구, 영적 자아"
            },
            "Moon": {
                1: "감정이 외모에 드러남",
                2: "정서적 안정 = 물질적 안정",
                3: "감정적 소통, 직관적 학습",
                4: "가정이 감정의 중심",
                5: "창조적 감정 표현",
                6: "일상과 건강이 감정에 민감",
                7: "관계에서 정서적 안정 추구",
                8: "깊은 감정적 유대",
                9: "감정적 신념 체계",
                10: "공적 이미지의 감정적 측면",
                11: "우정에서 감정적 유대",
                12: "무의식 세계와의 연결"
            }
        }

        # 기본값
        default_text = f"{planet}의 에너지가 {house}하우스 영역에서 활성화됩니다."

        if planet in base and house in base[planet]:
            return {"ko": base[planet][house], "en": ""}
        return {"ko": default_text, "en": ""}

    def _get_planet_house_challenges(self, planet: str, house: int) -> List[str]:
        """행성-하우스 도전 과제"""
        challenges = {
            ("Saturn", 1): ["자기 표현의 억압", "자존감 문제"],
            ("Saturn", 4): ["가정 환경의 제약", "어린 시절 어려움"],
            ("Saturn", 7): ["관계에서의 두려움", "늦은 결혼"],
            ("Pluto", 1): ["정체성 위기", "과도한 통제욕"],
            ("Pluto", 8): ["강렬한 변형 경험", "권력 투쟁"],
            ("Neptune", 7): ["이상화된 관계", "현실 파악 어려움"],
            ("Mars", 12): ["숨겨진 분노", "에너지 소진"]
        }
        return challenges.get((planet, house), ["균형 유지 필요"])

    def _get_planet_house_opportunities(self, planet: str, house: int) -> List[str]:
        """행성-하우스 기회"""
        opportunities = {
            ("Jupiter", 2): ["재물운", "가치 확장"],
            ("Jupiter", 9): ["해외 기회", "고등 교육"],
            ("Jupiter", 10): ["사회적 성공", "명성 획득"],
            ("Venus", 5): ["예술적 재능", "사랑운"],
            ("Venus", 7): ["조화로운 관계", "파트너십 성공"],
            ("Sun", 10): ["커리어 성공", "리더십 발휘"],
            ("Mercury", 3): ["뛰어난 소통 능력", "학습 능력"]
        }
        return opportunities.get((planet, house), ["잠재력 개발 기회"])

    def _get_aspect_positive(self, p1: str, p2: str, aspect: str) -> str:
        """애스펙트 긍정적 표현"""
        positives = {
            ("Sun", "Moon", "conjunction"): "내면과 외면의 통합, 일관된 자아",
            ("Sun", "Moon", "trine"): "조화로운 자아상, 정서적 안정",
            ("Venus", "Mars", "conjunction"): "열정적인 사랑, 창조적 에너지",
            ("Jupiter", "Saturn", "trine"): "절제된 확장, 지속 가능한 성공",
            ("Mercury", "Jupiter", "sextile"): "낙관적 사고, 교육 기회"
        }
        return positives.get((p1, p2, aspect), "두 에너지의 건설적 결합")

    def _get_aspect_negative(self, p1: str, p2: str, aspect: str) -> str:
        """애스펙트 부정적 표현"""
        negatives = {
            ("Sun", "Saturn", "square"): "자신감 억압, 권위와의 갈등",
            ("Moon", "Pluto", "opposition"): "감정적 극단, 통제 욕구",
            ("Mars", "Saturn", "square"): "좌절된 행동력, 분노 억압",
            ("Venus", "Saturn", "square"): "사랑의 두려움, 감정 억압"
        }
        return negatives.get((p1, p2, aspect), "에너지 간 긴장이 존재할 수 있음")

    def _get_aspect_integration(self, p1: str, p2: str, aspect: str) -> str:
        """애스펙트 통합 조언"""
        return f"{p1}과 {p2}의 에너지를 의식적으로 통합하세요."

    def _get_asc_first_impression(self, sign: str) -> str:
        """상승점 첫인상"""
        impressions = {
            "Aries": "적극적이고 에너지 넘치는 인상",
            "Taurus": "안정적이고 신뢰감 있는 인상",
            "Gemini": "재치 있고 호기심 많은 인상",
            "Cancer": "따뜻하고 배려심 있는 인상",
            "Leo": "당당하고 카리스마 있는 인상",
            "Virgo": "꼼꼼하고 지적인 인상",
            "Libra": "세련되고 조화로운 인상",
            "Scorpio": "신비롭고 강렬한 인상",
            "Sagittarius": "자유롭고 낙관적인 인상",
            "Capricorn": "성숙하고 책임감 있는 인상",
            "Aquarius": "독특하고 진보적인 인상",
            "Pisces": "부드럽고 예술적인 인상"
        }
        return impressions.get(sign, "독특한 개성")

    def _get_asc_physical(self, sign: str) -> str:
        """상승점 외모 특징"""
        physical = {
            "Aries": "날카로운 이목구비, 활동적인 체형",
            "Taurus": "둥근 얼굴, 안정적인 체형",
            "Gemini": "날씬한 체형, 생기있는 눈빛",
            "Cancer": "둥근 얼굴, 부드러운 인상",
            "Leo": "풍성한 머리카락, 당당한 자세",
            "Virgo": "단정한 외모, 섬세한 이목구비",
            "Libra": "균형 잡힌 외모, 매력적인 미소",
            "Scorpio": "강렬한 눈빛, 자기장 있는 존재감",
            "Sagittarius": "큰 키, 활동적인 체형",
            "Capricorn": "뼈대가 있는 체형, 성숙한 인상",
            "Aquarius": "독특한 스타일, 개성적인 외모",
            "Pisces": "부드러운 눈빛, 몽환적인 분위기"
        }
        return physical.get(sign, "개성적인 외모")

    def _get_asc_approach(self, sign: str) -> str:
        """상승점 삶의 접근법"""
        approaches = {
            "Aries": "직접 부딪히며 개척하는 방식",
            "Taurus": "천천히 확실하게 구축하는 방식",
            "Gemini": "다양하게 경험하고 소통하는 방식",
            "Cancer": "감정적 안전을 우선시하는 방식",
            "Leo": "창조적으로 자신을 표현하는 방식",
            "Virgo": "분석하고 개선하는 방식",
            "Libra": "조화와 균형을 추구하는 방식",
            "Scorpio": "깊이 파고들어 변형하는 방식",
            "Sagittarius": "탐험하고 확장하는 방식",
            "Capricorn": "목표를 세우고 성취하는 방식",
            "Aquarius": "혁신하고 개혁하는 방식",
            "Pisces": "직관과 영감을 따르는 방식"
        }
        return approaches.get(sign, "개성적인 접근법")

    def _get_ruling_planet(self, sign: str) -> Dict[str, str]:
        """별자리 지배성"""
        rulers = {
            "Aries": ("Mars", "화성"),
            "Taurus": ("Venus", "금성"),
            "Gemini": ("Mercury", "수성"),
            "Cancer": ("Moon", "달"),
            "Leo": ("Sun", "태양"),
            "Virgo": ("Mercury", "수성"),
            "Libra": ("Venus", "금성"),
            "Scorpio": ("Pluto", "명왕성"),
            "Sagittarius": ("Jupiter", "목성"),
            "Capricorn": ("Saturn", "토성"),
            "Aquarius": ("Uranus", "천왕성"),
            "Pisces": ("Neptune", "해왕성")
        }
        en, ko = rulers.get(sign, ("Unknown", "미상"))
        return {"en": en, "ko": ko}

    def _get_transit_duration(self, planet: str) -> str:
        """트랜짓 지속 기간"""
        durations = {
            "Jupiter": "약 1년 (한 별자리당)",
            "Saturn": "약 2.5년 (한 별자리당)",
            "Uranus": "약 7년 (한 별자리당)",
            "Neptune": "약 14년 (한 별자리당)",
            "Pluto": "약 12-31년 (한 별자리당, 편차 큼)"
        }
        return durations.get(planet, "다양")

    def _get_transit_timing(self, planet: str, aspect: str) -> str:
        """트랜짓 타이밍 조언"""
        if planet in ["Jupiter"]:
            return "기회를 적극 활용하세요"
        elif planet == "Saturn":
            return "인내와 노력이 필요한 시기입니다"
        elif planet == "Uranus":
            return "갑작스러운 변화에 열려 있으세요"
        elif planet == "Neptune":
            return "직관을 따르되 현실 감각을 유지하세요"
        elif planet == "Pluto":
            return "깊은 변형의 시기, 저항하지 마세요"
        return "시기에 맞는 대응이 필요합니다"

    # ============================================================
    # LLM 텍스트 생성 (API 사용 시)
    # ============================================================

    async def _generate_planet_sign_text(self, planet_en, planet_ko, planet_meaning,
                                          sign_en, sign_ko, sign_meaning, element, modality) -> Dict[str, str]:
        """행성-별자리 상세 해석문 생성"""

        # API가 없으면 템플릿 기반 생성
        if not self.client:
            return self._template_planet_sign(planet_ko, planet_meaning, sign_ko, sign_meaning, element, modality)

        prompt = f"""당신은 전문 점성술사입니다. 다음 행성-별자리 조합에 대한 상세 해석을 작성하세요.

행성: {planet_ko} ({planet_en}) - {planet_meaning}
별자리: {sign_ko} ({sign_en}) - {sign_meaning}
원소: {element}, 양상: {modality}

다음 내용을 포함하여 300-400자의 해석문을 작성하세요:
1. 이 조합의 핵심 특성
2. 성격적 특징 (긍정/부정)
3. 삶에서의 발현 방식
4. 조언

JSON 형식으로 응답: {{"ko": "한국어 해석", "en": "English interpretation"}}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1000
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"API 오류: {e}")
            return self._template_planet_sign(planet_ko, planet_meaning, sign_ko, sign_meaning, element, modality)

    def _template_planet_sign(self, planet_ko, planet_meaning, sign_ko, sign_meaning, element, modality) -> Dict[str, str]:
        """템플릿 기반 행성-별자리 해석"""
        element_ko = {"Fire": "불", "Earth": "흙", "Air": "공기", "Water": "물"}.get(element, element)
        modality_ko = {"Cardinal": "활동궁", "Fixed": "고정궁", "Mutable": "변통궁"}.get(modality, modality)

        text = f"""{planet_ko}이 {sign_ko}에 위치하면, {planet_meaning.split(',')[0]}의 에너지가 {sign_meaning.split(',')[0]}의 방식으로 표현됩니다.

{element_ko} 원소의 {modality_ko}인 {sign_ko}는 {planet_ko}에게 {sign_meaning}의 특성을 부여합니다.

이 배치를 가진 사람은 {planet_meaning}을 {sign_meaning}의 방식으로 추구합니다. {sign_ko}의 {element_ko} 에너지는 {planet_ko}의 표현에 {"열정적이고 적극적인" if element == "Fire" else "실용적이고 안정적인" if element == "Earth" else "지적이고 소통적인" if element == "Air" else "감정적이고 직관적인"} 색채를 더합니다.

이 에너지를 잘 활용하면 {sign_meaning.split(',')[0]}을 통해 {planet_meaning.split(',')[0]}을 효과적으로 발휘할 수 있습니다."""

        return {"ko": text, "en": ""}

    async def _generate_planet_house_text(self, planet_en, planet_ko, planet_meaning,
                                           house_num, house_ko, house_meaning) -> Dict[str, str]:
        """행성-하우스 상세 해석문 생성"""

        if not self.client:
            return self._template_planet_house(planet_ko, planet_meaning, house_num, house_ko, house_meaning)

        prompt = f"""당신은 전문 점성술사입니다. 다음 행성-하우스 조합에 대한 상세 해석을 작성하세요.

행성: {planet_ko} ({planet_en}) - {planet_meaning}
하우스: {house_ko} ({house_num}번째 집) - {house_meaning}

다음 내용을 포함하여 300-400자의 해석문을 작성하세요:
1. 이 배치의 핵심 의미
2. 생활에서의 구체적 발현
3. 이 영역에서의 강점과 도전
4. 실용적 조언

JSON 형식으로 응답: {{"ko": "한국어 해석", "en": "English interpretation"}}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1000
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return self._template_planet_house(planet_ko, planet_meaning, house_num, house_ko, house_meaning)

    def _template_planet_house(self, planet_ko, planet_meaning, house_num, house_ko, house_meaning) -> Dict[str, str]:
        """템플릿 기반 행성-하우스 해석"""
        text = f"""{planet_ko}이 {house_ko}에 위치하면, {planet_meaning.split(',')[0]}의 에너지가 {house_meaning.split(',')[0]}의 영역에서 활성화됩니다.

{house_num}하우스는 {house_meaning}을 관장하는 영역으로, 여기에 {planet_ko}이 있으면 이 분야에서 {planet_ko}의 특성이 두드러지게 나타납니다.

이 배치를 가진 사람은 {house_meaning.split(',')[0]} 영역에서 {planet_meaning}의 테마를 경험합니다. {planet_ko}의 에너지를 {house_ko} 영역에서 의식적으로 활용하면 이 분야에서 성장과 발전을 이룰 수 있습니다.

{house_meaning}에 관련된 일에서 {planet_ko}적 접근법을 취하면 좋은 결과를 얻을 수 있습니다."""

        return {"ko": text, "en": ""}

    async def _generate_aspect_text(self, p1_en, p1_ko, p1_meaning,
                                     p2_en, p2_ko, p2_meaning,
                                     asp_en, asp_ko, asp_meaning) -> Dict[str, str]:
        """애스펙트 상세 해석문 생성"""

        if not self.client:
            return self._template_aspect(p1_ko, p1_meaning, p2_ko, p2_meaning, asp_ko, asp_meaning)

        prompt = f"""당신은 전문 점성술사입니다. 다음 행성 애스펙트에 대한 상세 해석을 작성하세요.

행성 1: {p1_ko} ({p1_en}) - {p1_meaning}
행성 2: {p2_ko} ({p2_en}) - {p2_meaning}
애스펙트: {asp_ko} ({asp_en}) - {asp_meaning}

다음 내용을 포함하여 300-400자의 해석문을 작성하세요:
1. 두 행성 에너지의 상호작용
2. 긍정적 발현과 부정적 발현
3. 일상에서의 표현 방식
4. 통합을 위한 조언

JSON 형식으로 응답: {{"ko": "한국어 해석", "en": "English interpretation"}}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1000
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return self._template_aspect(p1_ko, p1_meaning, p2_ko, p2_meaning, asp_ko, asp_meaning)

    def _template_aspect(self, p1_ko, p1_meaning, p2_ko, p2_meaning, asp_ko, asp_meaning) -> Dict[str, str]:
        """템플릿 기반 애스펙트 해석"""
        is_harmonious = asp_ko in ["삼합", "육분"]
        is_challenging = asp_ko in ["사각", "대립"]

        harmony_text = "조화롭게 흐르며" if is_harmonious else "긴장을 만들며" if is_challenging else "융합하며"

        text = f"""{p1_ko}와 {p2_ko}의 {asp_ko}은 두 행성의 에너지가 {harmony_text} 상호작용합니다.

{p1_ko}({p1_meaning.split(',')[0]})과 {p2_ko}({p2_meaning.split(',')[0]})이 {asp_meaning.split(',')[0]}의 관계를 형성합니다.

{"이 조화로운 애스펙트는 두 에너지가 자연스럽게 협력하여 재능으로 발현됩니다." if is_harmonious else "이 도전적인 애스펙트는 내적 긴장을 만들지만, 극복하면 큰 성장의 동력이 됩니다." if is_challenging else "이 강력한 결합은 두 에너지가 하나로 융합되어 집중된 표현을 만듭니다."}

{p1_ko}와 {p2_ko}의 에너지를 의식적으로 통합하면 {"재능을 더욱 발휘" if is_harmonious else "내면의 갈등을 성장으로 전환" if is_challenging else "강력한 집중력을 발휘"}할 수 있습니다."""

        return {"ko": text, "en": ""}

    async def _generate_asc_text(self, sign_en, sign_ko, sign_meaning) -> Dict[str, str]:
        """상승점 상세 해석문 생성"""
        text = f"""{sign_ko} 상승(ASC)은 당신이 세상에 보여주는 페르소나이자 첫인상입니다.

{sign_meaning}의 에너지가 당신의 외적 표현을 지배합니다. 사람들은 당신을 처음 만났을 때 {sign_ko}의 특성을 먼저 인식하게 됩니다.

{sign_ko} 상승은 삶에 접근하는 방식도 {sign_meaning.split(',')[0]}적입니다. 새로운 상황에서 {sign_ko}의 방식으로 반응하며, 이것이 당신의 자연스러운 대처 방식입니다.

상승 별자리의 지배성을 확인하면 이 에너지가 어디서 발현되는지 더 깊이 이해할 수 있습니다."""

        return {"ko": text, "en": ""}

    async def _generate_transit_text(self, transit_p, natal_p, aspect) -> Dict[str, str]:
        """트랜짓 해석문 생성"""
        transit_meanings = {
            "Jupiter": "확장과 기회",
            "Saturn": "제한과 구조화",
            "Uranus": "갑작스러운 변화",
            "Neptune": "영적 각성",
            "Pluto": "깊은 변형"
        }

        natal_meanings = {
            "Sun": "자아와 의지",
            "Moon": "감정과 내면",
            "Mercury": "사고와 소통",
            "Venus": "관계와 가치",
            "Mars": "행동과 욕구",
            "Jupiter": "신념과 확장",
            "Saturn": "책임과 구조",
            "ASC": "자아 표현",
            "MC": "커리어와 사회적 위치"
        }

        text = f"""트랜짓 {transit_p}이 네이탈 {natal_p}에 {aspect}을 형성할 때, {transit_meanings.get(transit_p, transit_p)}의 에너지가 {natal_meanings.get(natal_p, natal_p)}에 영향을 미칩니다.

이 시기에는 {natal_p} 영역에서 {transit_meanings.get(transit_p, '변화')}를 경험할 수 있습니다. {"조화로운 흐름" if aspect in ["trine", "sextile"] else "도전과 성장"}의 기회가 있습니다.

이 트랜짓의 에너지를 의식적으로 활용하면 의미 있는 발전을 이룰 수 있습니다."""

        return {"ko": text, "en": ""}

    async def _generate_advice(self, planet: str, sign: str) -> str:
        """조언 생성"""
        return f"이 에너지를 의식적으로 활용하여 균형 잡힌 표현을 추구하세요."


# ============================================================
# 타로 해석 생성기
# ============================================================

class TarotInterpretationGenerator:
    """타로 해석 코퍼스 생성"""

    MAJOR_ARCANA = [
        (0, "The Fool", "광대", "새로운 시작, 순수함, 모험, 신뢰"),
        (1, "The Magician", "마법사", "의지력, 창조, 기술, 집중"),
        (2, "The High Priestess", "여사제", "직관, 신비, 무의식, 지혜"),
        (3, "The Empress", "여황제", "풍요, 모성, 창조, 자연"),
        (4, "The Emperor", "황제", "권위, 구조, 아버지, 안정"),
        (5, "The Hierophant", "교황", "전통, 교육, 영적 지도, 신념"),
        (6, "The Lovers", "연인", "선택, 사랑, 조화, 관계"),
        (7, "The Chariot", "전차", "승리, 의지력, 결단, 통제"),
        (8, "Strength", "힘", "용기, 인내, 내면의 힘, 자제"),
        (9, "The Hermit", "은둔자", "내면 탐구, 지혜, 고독, 안내"),
        (10, "Wheel of Fortune", "운명의 수레바퀴", "변화, 운명, 순환, 기회"),
        (11, "Justice", "정의", "균형, 진실, 인과, 공정"),
        (12, "The Hanged Man", "매달린 사람", "희생, 새로운 관점, 기다림, 포기"),
        (13, "Death", "죽음", "변형, 끝과 시작, 전환, 재탄생"),
        (14, "Temperance", "절제", "균형, 인내, 조화, 중용"),
        (15, "The Devil", "악마", "속박, 물질주의, 그림자, 유혹"),
        (16, "The Tower", "탑", "갑작스러운 변화, 붕괴, 계시, 해방"),
        (17, "The Star", "별", "희망, 영감, 치유, 평화"),
        (18, "The Moon", "달", "환상, 두려움, 무의식, 직관"),
        (19, "The Sun", "태양", "기쁨, 성공, 활력, 명확함"),
        (20, "Judgement", "심판", "부활, 평가, 각성, 소명"),
        (21, "The World", "세계", "완성, 통합, 성취, 여행")
    ]

    SUITS = [
        ("Wands", "완드", "Fire", "창조, 열정, 의지, 영감"),
        ("Cups", "컵", "Water", "감정, 관계, 직관, 사랑"),
        ("Swords", "검", "Air", "사고, 갈등, 진실, 결정"),
        ("Pentacles", "펜타클", "Earth", "물질, 건강, 실용, 안정")
    ]

    COURT_CARDS = [
        ("Page", "페이지", "학습, 메시지, 가능성"),
        ("Knight", "기사", "행동, 추구, 모험"),
        ("Queen", "퀸", "성숙, 직관, 양육"),
        ("King", "킹", "숙달, 권위, 책임")
    ]

    def __init__(self, client: Optional['AsyncOpenAI'] = None):
        self.client = client
        self.output_dir = OUTPUT_DIR / "rules" / "tarot"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_all(self):
        """모든 타로 해석 생성"""
        print("=" * 60)
        print("타로 해석 코퍼스 생성 시작")
        print("=" * 60)

        # 1. 메이저 아르카나 (22장)
        major = await self.generate_major_arcana()

        # 2. 마이너 아르카나 (56장)
        minor = await self.generate_minor_arcana()

        # 3. 스프레드 위치별 의미
        positions = await self.generate_position_meanings()

        # 4. 카드 조합 해석
        combinations = await self.generate_combinations()

        all_data = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0",
                "total_cards": len(major) + len(minor)
            },
            "major_arcana": major,
            "minor_arcana": minor,
            "position_meanings": positions,
            "combinations": combinations
        }

        output_file = self.output_dir / "complete_interpretations.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"\n저장 완료: {output_file}")
        return all_data

    async def generate_major_arcana(self) -> List[Dict]:
        """메이저 아르카나 해석"""
        results = []

        for num, name_en, name_ko, keywords in self.MAJOR_ARCANA:
            interpretation = {
                "id": f"major_{num}",
                "number": num,
                "name": {"en": name_en, "ko": name_ko},
                "keywords": [k.strip() for k in keywords.split(',')],
                "upright": {
                    "general": await self._generate_card_text(name_ko, keywords, "upright", "general"),
                    "love": await self._generate_card_text(name_ko, keywords, "upright", "love"),
                    "career": await self._generate_card_text(name_ko, keywords, "upright", "career"),
                    "finance": await self._generate_card_text(name_ko, keywords, "upright", "finance"),
                    "health": await self._generate_card_text(name_ko, keywords, "upright", "health"),
                    "advice": await self._generate_card_advice(name_ko, keywords, "upright")
                },
                "reversed": {
                    "general": await self._generate_card_text(name_ko, keywords, "reversed", "general"),
                    "love": await self._generate_card_text(name_ko, keywords, "reversed", "love"),
                    "career": await self._generate_card_text(name_ko, keywords, "reversed", "career"),
                    "finance": await self._generate_card_text(name_ko, keywords, "reversed", "finance"),
                    "health": await self._generate_card_text(name_ko, keywords, "reversed", "health"),
                    "advice": await self._generate_card_advice(name_ko, keywords, "reversed")
                },
                "symbolism": self._get_card_symbolism(name_en),
                "archetype": self._get_card_archetype(name_en),
                "numerology": self._get_card_numerology(num)
            }
            results.append(interpretation)

        print(f"메이저 아르카나: {len(results)}장 해석 생성")
        return results

    async def generate_minor_arcana(self) -> List[Dict]:
        """마이너 아르카나 해석"""
        results = []

        for suit_en, suit_ko, element, suit_meaning in self.SUITS:
            # 숫자 카드 (Ace-10)
            for num in range(1, 11):
                num_name = "Ace" if num == 1 else str(num)
                card_id = f"{suit_en.lower()}_{num}"
                card_name_en = f"{num_name} of {suit_en}"
                card_name_ko = f"{suit_ko} {num_name if num == 1 else num}"

                interpretation = {
                    "id": card_id,
                    "suit": {"en": suit_en, "ko": suit_ko},
                    "number": num,
                    "element": element,
                    "name": {"en": card_name_en, "ko": card_name_ko},
                    "keywords": self._get_number_keywords(num, suit_en),
                    "upright": {
                        "general": await self._generate_minor_text(suit_ko, suit_meaning, num, "upright"),
                        "love": f"{suit_ko} {num}의 정방향은 {element} 에너지로 관계에서 {suit_meaning.split(',')[0]}을 의미합니다.",
                        "career": f"직업 영역에서 {suit_meaning.split(',')[0]}적인 접근이 필요합니다.",
                        "advice": f"{num}의 에너지와 {suit_ko}의 특성을 활용하세요."
                    },
                    "reversed": {
                        "general": await self._generate_minor_text(suit_ko, suit_meaning, num, "reversed"),
                        "love": f"{suit_ko} {num}의 역방향은 관계에서 {suit_meaning.split(',')[0]}의 부재나 과잉을 나타냅니다.",
                        "career": f"직업 영역에서 {suit_meaning.split(',')[0]}에 주의가 필요합니다.",
                        "advice": f"균형을 찾고 {suit_ko}의 그림자를 인식하세요."
                    },
                    "numerology_meaning": self._get_number_meaning(num)
                }
                results.append(interpretation)

            # 코트 카드
            for court_en, court_ko, court_meaning in self.COURT_CARDS:
                card_id = f"{suit_en.lower()}_{court_en.lower()}"
                card_name_en = f"{court_en} of {suit_en}"
                card_name_ko = f"{suit_ko} {court_ko}"

                interpretation = {
                    "id": card_id,
                    "suit": {"en": suit_en, "ko": suit_ko},
                    "court": {"en": court_en, "ko": court_ko},
                    "element": element,
                    "name": {"en": card_name_en, "ko": card_name_ko},
                    "keywords": [court_meaning] + suit_meaning.split(',')[:2],
                    "personality": self._get_court_personality(court_en, suit_en),
                    "upright": {
                        "as_person": f"{suit_ko}의 {court_meaning}을 체현한 인물",
                        "as_situation": f"{suit_meaning.split(',')[0]} 영역에서 {court_meaning}의 에너지",
                        "as_advice": f"{court_ko}처럼 {court_meaning}을 실천하세요"
                    },
                    "reversed": {
                        "as_person": f"{suit_ko} {court_ko}의 그림자 측면을 가진 인물",
                        "as_situation": f"{court_meaning}의 부재 또는 미성숙",
                        "as_advice": f"{court_ko}의 성숙을 향해 성장하세요"
                    }
                }
                results.append(interpretation)

        print(f"마이너 아르카나: {len(results)}장 해석 생성")
        return results

    async def generate_position_meanings(self) -> Dict:
        """스프레드 위치별 의미"""
        positions = {
            "three_card": {
                "name": "쓰리 카드 스프레드",
                "positions": [
                    {"number": 1, "name": "과거", "meaning": "현재 상황에 영향을 미친 과거의 에너지"},
                    {"number": 2, "name": "현재", "meaning": "지금 이 순간의 에너지와 상황"},
                    {"number": 3, "name": "미래", "meaning": "현재 흐름이 지속될 때의 가능한 결과"}
                ]
            },
            "celtic_cross": {
                "name": "켈틱 크로스",
                "positions": [
                    {"number": 1, "name": "현재 상황", "meaning": "현재 당신이 처한 핵심 상황"},
                    {"number": 2, "name": "도전/장애물", "meaning": "현재 상황을 방해하거나 영향을 미치는 요소"},
                    {"number": 3, "name": "근본 원인", "meaning": "상황의 깊은 뿌리, 무의식적 영향"},
                    {"number": 4, "name": "과거", "meaning": "상황에 영향을 미친 최근 과거"},
                    {"number": 5, "name": "목표/가능성", "meaning": "이룰 수 있는 최선의 결과"},
                    {"number": 6, "name": "가까운 미래", "meaning": "곧 일어날 일들"},
                    {"number": 7, "name": "당신의 태도", "meaning": "상황에 대한 당신의 접근 방식"},
                    {"number": 8, "name": "외부 영향", "meaning": "다른 사람들이나 환경의 영향"},
                    {"number": 9, "name": "희망과 두려움", "meaning": "상황에 대한 내면의 감정"},
                    {"number": 10, "name": "최종 결과", "meaning": "상황의 궁극적인 결론"}
                ]
            },
            "relationship": {
                "name": "관계 스프레드",
                "positions": [
                    {"number": 1, "name": "나", "meaning": "관계에서 당신의 에너지"},
                    {"number": 2, "name": "상대방", "meaning": "관계에서 상대방의 에너지"},
                    {"number": 3, "name": "관계의 기반", "meaning": "두 사람을 연결하는 것"},
                    {"number": 4, "name": "도전", "meaning": "관계에서 극복해야 할 것"},
                    {"number": 5, "name": "조언", "meaning": "관계를 위한 가이드"},
                    {"number": 6, "name": "잠재력", "meaning": "관계의 가능한 발전 방향"}
                ]
            }
        }

        print(f"스프레드 위치: {len(positions)}개 스프레드 정의")
        return positions

    async def generate_combinations(self) -> List[Dict]:
        """카드 조합 해석"""
        combinations = [
            {
                "cards": ["The Lovers", "The Devil"],
                "meaning": "사랑과 속박 사이의 긴장. 관계에서의 의존성이나 건강하지 않은 패턴을 검토할 때입니다."
            },
            {
                "cards": ["Death", "The Tower"],
                "meaning": "강력한 변형의 시기. 낡은 것이 무너지고 완전히 새로운 것이 올 수 있습니다."
            },
            {
                "cards": ["The Star", "The Sun"],
                "meaning": "희망과 기쁨의 조합. 매우 긍정적인 에너지로 치유와 성공이 예상됩니다."
            },
            {
                "cards": ["The Empress", "The Emperor"],
                "meaning": "여성성과 남성성의 균형. 창조적 풍요와 구조적 안정이 함께 합니다."
            },
            {
                "cards": ["The Fool", "The World"],
                "meaning": "완성과 새로운 시작. 한 사이클이 끝나고 더 높은 차원에서 새 여정이 시작됩니다."
            },
            {
                "cards": ["The High Priestess", "The Moon"],
                "meaning": "깊은 직관과 무의식의 메시지. 논리보다 내면의 목소리에 귀 기울이세요."
            },
            {
                "cards": ["Three of Swords", "Ten of Swords"],
                "meaning": "깊은 상처와 결말. 고통스럽지만, 바닥을 치면 올라갈 일만 남습니다."
            },
            {
                "cards": ["Ace of Pentacles", "Ten of Pentacles"],
                "meaning": "물질적 풍요의 시작과 완성. 재정적 성공과 안정이 기대됩니다."
            }
        ]

        print(f"카드 조합: {len(combinations)}개 정의")
        return combinations

    # Helper methods
    async def _generate_card_text(self, name_ko, keywords, direction, area) -> str:
        """카드 해석 텍스트 생성"""
        direction_text = "정방향" if direction == "upright" else "역방향"
        area_ko = {"general": "일반", "love": "사랑", "career": "직업", "finance": "재정", "health": "건강"}.get(area, area)

        if direction == "upright":
            return f"{name_ko} 카드는 {keywords.split(',')[0]}을 상징합니다. {area_ko} 영역에서 {keywords}의 에너지가 긍정적으로 작용합니다."
        else:
            return f"{name_ko} 역방향은 {keywords.split(',')[0]}의 그림자 측면을 나타냅니다. {area_ko} 영역에서 이 에너지의 부재나 과잉에 주의하세요."

    async def _generate_card_advice(self, name_ko, keywords, direction) -> str:
        """카드별 조언 생성"""
        if direction == "upright":
            return f"{name_ko}의 {keywords.split(',')[0]} 에너지를 신뢰하고 따르세요."
        else:
            return f"{name_ko}의 그림자를 인식하고, 균형을 찾기 위해 노력하세요."

    async def _generate_minor_text(self, suit_ko, suit_meaning, num, direction) -> str:
        """마이너 아르카나 텍스트 생성"""
        num_meaning = self._get_number_meaning(num)
        if direction == "upright":
            return f"{suit_ko} {num}은 {suit_meaning.split(',')[0]} 영역에서 {num_meaning}을 나타냅니다."
        else:
            return f"{suit_ko} {num} 역방향은 {suit_meaning.split(',')[0]}의 {num_meaning}이 막히거나 과잉된 상태입니다."

    def _get_card_symbolism(self, name_en: str) -> List[str]:
        """카드 상징 요소"""
        symbolism = {
            "The Fool": ["낭떠러지", "흰 장미", "작은 개", "보따리", "태양"],
            "The Magician": ["무한대 기호", "네 가지 원소", "뱀 허리띠", "붉은 망토"],
            "The High Priestess": ["달", "기둥", "베일", "석류", "두루마리"],
            "The Empress": ["밀밭", "금성 기호", "왕관", "석류", "자연"],
            "The Emperor": ["양 머리", "오브", "산", "갑옷", "왕홀"]
        }
        return symbolism.get(name_en, ["다양한 상징"])

    def _get_card_archetype(self, name_en: str) -> str:
        """카드 원형"""
        archetypes = {
            "The Fool": "순수한 영혼, 영원한 아이",
            "The Magician": "의지의 마스터, 연금술사",
            "The High Priestess": "신비의 수호자, 직관의 여사제",
            "The Empress": "대지의 어머니, 풍요의 여신",
            "The Emperor": "질서의 아버지, 건설자",
            "Death": "변형의 안내자, 문지기"
        }
        return archetypes.get(name_en, "다양한 원형")

    def _get_card_numerology(self, num: int) -> Dict[str, str]:
        """카드 수비학"""
        meanings = {
            0: "무한한 가능성, 시작 이전",
            1: "새로운 시작, 의지, 창조",
            2: "균형, 이원성, 협력",
            3: "창조, 표현, 성장",
            4: "안정, 구조, 기반",
            5: "변화, 도전, 자유",
            6: "조화, 사랑, 책임",
            7: "내면 탐구, 영적 성장",
            8: "힘, 성취, 카르마",
            9: "완성, 지혜, 봉사"
        }
        return {"number": num, "meaning": meanings.get(num % 10, "순환")}

    def _get_number_keywords(self, num: int, suit: str) -> List[str]:
        """숫자별 키워드"""
        base_keywords = {
            1: ["새로운 시작", "잠재력", "기회"],
            2: ["균형", "선택", "파트너십"],
            3: ["창조", "성장", "협력"],
            4: ["안정", "기반", "구조"],
            5: ["변화", "갈등", "도전"],
            6: ["조화", "치유", "균형"],
            7: ["평가", "인내", "반성"],
            8: ["움직임", "속도", "힘"],
            9: ["완성", "성취", "지혜"],
            10: ["완료", "순환", "새로운 단계"]
        }
        return base_keywords.get(num, ["에너지"])

    def _get_number_meaning(self, num: int) -> str:
        """숫자의 의미"""
        meanings = {
            1: "새로운 시작과 순수한 잠재력",
            2: "균형과 선택의 순간",
            3: "창조적 확장과 성장",
            4: "안정적 기반 확립",
            5: "변화와 도전의 중간 지점",
            6: "조화와 균형 회복",
            7: "내면 성찰과 인내",
            8: "힘과 움직임의 가속",
            9: "완성과 성취 직전",
            10: "순환의 완료와 새 시작 준비"
        }
        return meanings.get(num, "에너지의 흐름")

    def _get_court_personality(self, court: str, suit: str) -> Dict[str, str]:
        """코트 카드 성격"""
        personalities = {
            ("Page", "Wands"): "열정적이고 모험적인 젊은이, 새로운 아이디어에 흥분",
            ("Knight", "Wands"): "행동력 있고 대담한 모험가, 열정적 추진자",
            ("Queen", "Wands"): "자신감 있고 카리스마 있는 여성, 창조적 리더",
            ("King", "Wands"): "비전을 가진 지도자, 영감을 주는 리더",
            ("Page", "Cups"): "감수성 풍부한 몽상가, 감정적으로 열린 젊은이",
            ("Knight", "Cups"): "로맨틱한 이상주의자, 감정의 기사",
            ("Queen", "Cups"): "직관적이고 공감 능력이 뛰어난 여성, 치유자",
            ("King", "Cups"): "감정적으로 성숙한 지도자, 자비로운 왕"
        }
        return {"description": personalities.get((court, suit), "독특한 성격의 인물")}


# ============================================================
# 꿈 해석 생성기
# ============================================================

class DreamInterpretationGenerator:
    """꿈 해석 코퍼스 생성"""

    DREAM_CATEGORIES = [
        ("animals", "동물", ["뱀", "개", "고양이", "새", "물고기", "말", "늑대", "곰", "호랑이", "용"]),
        ("nature", "자연", ["물", "불", "바람", "비", "눈", "태양", "달", "별", "바다", "산"]),
        ("actions", "행동", ["날다", "떨어지다", "달리다", "쫓기다", "수영하다", "싸우다", "죽다", "태어나다"]),
        ("people", "사람", ["죽은 사람", "낯선 사람", "가족", "친구", "연인", "아이", "노인"]),
        ("places", "장소", ["집", "학교", "직장", "병원", "바다", "산", "숲", "도시", "미로"]),
        ("objects", "사물", ["돈", "열쇠", "거울", "칼", "꽃", "책", "옷", "자동차", "전화"]),
        ("emotions", "감정", ["두려움", "기쁨", "슬픔", "분노", "사랑", "불안"]),
        ("body", "신체", ["이빨", "머리카락", "눈", "손", "피", "임신", "죽음"])
    ]

    def __init__(self, client: Optional['AsyncOpenAI'] = None):
        self.client = client
        self.output_dir = OUTPUT_DIR / "rules" / "dream"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_all(self):
        """모든 꿈 해석 생성"""
        print("=" * 60)
        print("꿈 해석 코퍼스 생성 시작")
        print("=" * 60)

        symbols = await self.generate_symbol_dictionary()
        themes = await self.generate_theme_interpretations()
        jung = await self.generate_jungian_analysis()

        all_data = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0"
            },
            "symbols": symbols,
            "themes": themes,
            "jungian_analysis": jung
        }

        output_file = self.output_dir / "complete_interpretations.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"\n저장 완료: {output_file}")
        return all_data

    async def generate_symbol_dictionary(self) -> Dict:
        """꿈 상징 사전"""
        symbols = {}

        for cat_en, cat_ko, items in self.DREAM_CATEGORIES:
            symbols[cat_en] = {
                "category_ko": cat_ko,
                "symbols": {}
            }

            for item in items:
                symbols[cat_en]["symbols"][item] = {
                    "general": await self._generate_symbol_meaning(item, cat_ko),
                    "positive": await self._generate_symbol_positive(item),
                    "negative": await self._generate_symbol_negative(item),
                    "jungian": self._get_jungian_symbol(item),
                    "cultural": self._get_cultural_meaning(item),
                    "questions": self._get_reflection_questions(item)
                }

        print(f"꿈 상징 사전: {sum(len(c['symbols']) for c in symbols.values())}개 상징 생성")
        return symbols

    async def generate_theme_interpretations(self) -> List[Dict]:
        """꿈 주제별 해석"""
        themes = [
            {
                "theme": "falling",
                "ko": "떨어지는 꿈",
                "meaning": "통제력 상실에 대한 두려움, 불안정감, 실패에 대한 걱정",
                "variations": {
                    "falling_into_water": "감정적 압도, 무의식으로의 하강",
                    "falling_from_building": "사회적 지위나 성취에 대한 불안",
                    "falling_endlessly": "인생의 방향성 상실"
                },
                "advice": "현실에서 통제력을 회복할 수 있는 작은 영역을 찾으세요."
            },
            {
                "theme": "flying",
                "ko": "나는 꿈",
                "meaning": "자유에 대한 갈망, 한계 초월, 영적 상승",
                "variations": {
                    "flying_easily": "자신감, 성취감, 자유로움",
                    "flying_with_difficulty": "목표 달성의 어려움",
                    "flying_too_high": "비현실적 야망에 대한 경고"
                },
                "advice": "자유를 향한 욕구와 현실적 책임 사이의 균형을 찾으세요."
            },
            {
                "theme": "being_chased",
                "ko": "쫓기는 꿈",
                "meaning": "회피하고 있는 문제, 억압된 감정, 스트레스",
                "variations": {
                    "chased_by_monster": "직면하기 두려운 내면의 그림자",
                    "chased_by_person": "특정 관계나 상황에서의 압박",
                    "chased_by_animal": "억압된 본능적 욕구"
                },
                "advice": "꿈에서 쫓는 존재를 직면해 보세요. 그것이 무엇을 상징하는지 탐구하세요."
            },
            {
                "theme": "teeth_falling",
                "ko": "이빨이 빠지는 꿈",
                "meaning": "자신감 상실, 노화에 대한 두려움, 소통의 어려움",
                "variations": {
                    "teeth_crumbling": "점진적 자신감 하락",
                    "teeth_being_pulled": "외부 힘에 의한 상실감",
                    "losing_all_teeth": "완전한 무력감"
                },
                "advice": "자존감과 자기 표현에 대해 성찰해 보세요."
            },
            {
                "theme": "death",
                "ko": "죽음의 꿈",
                "meaning": "변형, 끝과 시작, 삶의 전환점",
                "variations": {
                    "own_death": "자아의 변형, 새로운 시작",
                    "death_of_loved_one": "관계의 변화, 분리 불안",
                    "witnessing_death": "삶의 무상함에 대한 인식"
                },
                "advice": "끝나야 할 것이 무엇인지, 새로 시작해야 할 것이 무엇인지 생각해 보세요."
            },
            {
                "theme": "water",
                "ko": "물의 꿈",
                "meaning": "감정 상태, 무의식, 정화",
                "variations": {
                    "clear_water": "감정적 명료함, 정화",
                    "murky_water": "혼란스러운 감정, 불확실성",
                    "drowning": "감정에 압도됨",
                    "swimming": "감정 영역을 탐색함"
                },
                "advice": "현재 감정 상태를 점검하고 필요한 정화 작업을 하세요."
            },
            {
                "theme": "naked_in_public",
                "ko": "공공장소에서 벗은 꿈",
                "meaning": "취약함, 진정한 자아 노출에 대한 두려움",
                "variations": {
                    "nobody_notices": "걱정이 과장되었을 수 있음",
                    "everyone_stares": "판단에 대한 두려움",
                    "comfortable_naked": "자기 수용, 진정성"
                },
                "advice": "진정한 자신을 드러내는 것에 대한 두려움을 탐구하세요."
            }
        ]

        print(f"꿈 주제: {len(themes)}개 생성")
        return themes

    async def generate_jungian_analysis(self) -> Dict:
        """융 심리학 기반 분석 프레임워크"""
        framework = {
            "archetypes": {
                "shadow": {
                    "ko": "그림자",
                    "description": "억압된 자아의 어두운 측면, 인정하기 싫은 부분",
                    "dream_signs": ["추격자", "괴물", "어둠", "적대적 인물"],
                    "integration": "그림자를 인정하고 통합하면 전체성에 가까워집니다"
                },
                "anima_animus": {
                    "ko": "아니마/아니무스",
                    "description": "내면의 이성적 측면, 남성 안의 여성성/여성 안의 남성성",
                    "dream_signs": ["이성의 인물", "연인", "안내자"],
                    "integration": "내면의 양면성을 인정하면 관계가 성숙해집니다"
                },
                "self": {
                    "ko": "자기",
                    "description": "전체성, 완전한 자아, 개성화의 목표",
                    "dream_signs": ["만다라", "원", "사위일체", "현자"],
                    "integration": "자기 실현을 향한 여정의 안내"
                },
                "persona": {
                    "ko": "페르소나",
                    "description": "사회적 가면, 외부에 보여주는 자아",
                    "dream_signs": ["옷", "가면", "역할", "공적 상황"],
                    "integration": "진정한 자아와 사회적 자아의 균형"
                },
                "wise_old_man_woman": {
                    "ko": "현명한 노인",
                    "description": "내면의 지혜, 안내자 원형",
                    "dream_signs": ["노인", "스승", "현자", "안내자"],
                    "integration": "내면의 지혜에 귀 기울이세요"
                }
            },
            "individuation": {
                "description": "융의 개성화 과정 - 의식과 무의식의 통합",
                "stages": [
                    "페르소나 인식 - 사회적 가면 벗기",
                    "그림자 직면 - 억압된 자아 인정",
                    "아니마/아니무스 통합 - 내면의 양면성 수용",
                    "자기(Self) 실현 - 전체성 달성"
                ]
            },
            "analysis_questions": [
                "이 꿈에서 어떤 원형이 나타났나요?",
                "꿈의 감정은 무엇이었나요?",
                "현재 삶의 어떤 상황과 연결되나요?",
                "꿈이 전달하려는 메시지는 무엇일까요?",
                "이 꿈의 상징이 개인적으로 어떤 의미가 있나요?"
            ]
        }

        print("융 분석 프레임워크 생성 완료")
        return framework

    async def _generate_symbol_meaning(self, symbol: str, category: str) -> str:
        """상징 의미 생성"""
        meanings = {
            "뱀": "변형, 치유, 숨겨진 두려움, 성적 에너지",
            "물": "감정, 무의식, 정화, 삶의 흐름",
            "불": "열정, 변형, 분노, 정화",
            "날다": "자유, 초월, 야망, 한계 극복",
            "떨어지다": "통제력 상실, 불안, 실패 두려움",
            "죽은 사람": "과거와의 연결, 미해결 감정, 지혜",
            "집": "자아, 심리적 상태, 안전",
            "거울": "자기 인식, 진실, 반성",
            "이빨": "자신감, 힘, 노화 두려움",
            "피": "생명력, 열정, 희생, 상실"
        }
        return meanings.get(symbol, f"{category} 영역의 상징으로, 개인적 연관성을 탐구하세요.")

    async def _generate_symbol_positive(self, symbol: str) -> str:
        """긍정적 해석"""
        positive = {
            "뱀": "변형과 재탄생, 치유 에너지",
            "물": "감정적 정화, 새로운 시작",
            "불": "열정과 창조, 정화",
            "날다": "자유와 성취, 영적 상승"
        }
        return positive.get(symbol, "잠재력과 가능성의 상징")

    async def _generate_symbol_negative(self, symbol: str) -> str:
        """부정적 해석"""
        negative = {
            "뱀": "숨겨진 위협, 배신, 두려움",
            "물": "감정적 압도, 혼란",
            "불": "파괴, 분노, 통제 불능",
            "떨어지다": "실패, 불안, 통제력 상실"
        }
        return negative.get(symbol, "주의가 필요한 영역의 상징")

    def _get_jungian_symbol(self, symbol: str) -> str:
        """융 심리학적 상징"""
        jungian = {
            "뱀": "원시적 에너지, 쿤달리니, 변형의 상징",
            "물": "무의식의 상징, 감정의 바다",
            "집": "자아(Self)의 상징, 정신의 구조",
            "그림자": "그림자 원형, 억압된 자아"
        }
        return jungian.get(symbol, "개인 무의식의 상징")

    def _get_cultural_meaning(self, symbol: str) -> Dict[str, str]:
        """문화적 의미"""
        return {
            "korean": "한국 문화에서의 의미",
            "western": "서양 문화에서의 의미",
            "eastern": "동양 문화에서의 의미"
        }

    def _get_reflection_questions(self, symbol: str) -> List[str]:
        """성찰 질문"""
        return [
            f"{symbol}이 개인적으로 어떤 의미가 있나요?",
            f"최근 {symbol}과 관련된 경험이 있나요?",
            f"꿈에서 {symbol}을 볼 때 어떤 감정이 들었나요?"
        ]


# ============================================================
# 역학(주역) 해석 생성기
# ============================================================

class IChingInterpretationGenerator:
    """주역 해석 코퍼스 생성"""

    def __init__(self, client: Optional['AsyncOpenAI'] = None):
        self.client = client
        self.output_dir = OUTPUT_DIR / "rules" / "iching"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_all(self):
        """64괘 완전 해석 생성"""
        print("=" * 60)
        print("주역 해석 코퍼스 생성 시작")
        print("=" * 60)

        hexagrams = await self.generate_hexagrams()
        lines = await self.generate_line_interpretations()

        all_data = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0",
                "total_hexagrams": 64
            },
            "hexagrams": hexagrams,
            "changing_lines": lines
        }

        output_file = self.output_dir / "complete_interpretations.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"\n저장 완료: {output_file}")
        return all_data

    async def generate_hexagrams(self) -> List[Dict]:
        """64괘 기본 해석"""
        # 64괘 정의 (일부만 예시로)
        hexagram_data = [
            (1, "乾", "건", "중천건", "창조, 하늘, 강건함", "111111"),
            (2, "坤", "곤", "중지곤", "수용, 땅, 유순함", "000000"),
            (3, "屯", "둔", "수뢰둔", "어려움의 시작, 인내", "010001"),
            (4, "蒙", "몽", "산수몽", "어리석음, 배움", "100010"),
            (5, "需", "수", "수천수", "기다림, 인내", "010111"),
            (6, "訟", "송", "천수송", "다툼, 갈등", "111010"),
            (7, "師", "사", "지수사", "군대, 지도력", "000010"),
            (8, "比", "비", "수지비", "친밀함, 협력", "010000"),
            (9, "小畜", "소축", "풍천소축", "작은 축적, 절제", "110111"),
            (10, "履", "리", "천택리", "예절, 신중함", "111011"),
            # ... 나머지 54괘
        ]

        # 64괘 전체 데이터 생성 (간략화된 버전)
        results = []
        for i in range(1, 65):
            if i <= len(hexagram_data):
                num, hanja, ko_name, full_name, meaning, binary = hexagram_data[i-1]
            else:
                num = i
                hanja = f"괘{i}"
                ko_name = f"제{i}괘"
                full_name = f"육십사괘 제{i}"
                meaning = "괘의 의미"
                binary = format(i-1, '06b')

            hexagram = {
                "number": num,
                "hanja": hanja,
                "korean_name": ko_name,
                "full_name": full_name,
                "binary": binary,
                "upper_trigram": self._get_trigram(binary[:3]),
                "lower_trigram": self._get_trigram(binary[3:]),
                "keywords": [k.strip() for k in meaning.split(',')],
                "judgment": await self._generate_judgment(ko_name, meaning),
                "image": await self._generate_image(ko_name, meaning),
                "interpretation": {
                    "general": f"{ko_name}괘는 {meaning}을 나타냅니다.",
                    "love": f"관계에서 {meaning.split(',')[0]}의 에너지가 작용합니다.",
                    "career": f"직업/사업에서 {meaning.split(',')[0]}을 고려하세요.",
                    "advice": f"{meaning}의 지혜를 따르세요."
                },
                "changing_to": self._get_changing_hexagrams(num)
            }
            results.append(hexagram)

        print(f"64괘 해석: {len(results)}개 생성")
        return results

    async def generate_line_interpretations(self) -> Dict:
        """효(爻) 변화 해석"""
        line_meanings = {
            "position_1": {
                "name": "초효",
                "meaning": "시작, 기초, 근본",
                "advice": "아직 때가 이르니 신중하게"
            },
            "position_2": {
                "name": "이효",
                "meaning": "내면, 중심, 균형",
                "advice": "중용을 지키며 내면을 닦으세요"
            },
            "position_3": {
                "name": "삼효",
                "meaning": "전환점, 위험, 경계",
                "advice": "조심하되 두려워하지 마세요"
            },
            "position_4": {
                "name": "사효",
                "meaning": "외부와의 접점, 신중함",
                "advice": "상황을 잘 살피고 행동하세요"
            },
            "position_5": {
                "name": "오효",
                "meaning": "중심, 지도자, 성공",
                "advice": "덕을 쌓고 바르게 이끄세요"
            },
            "position_6": {
                "name": "상효",
                "meaning": "완성, 극단, 전환",
                "advice": "물러날 때를 알고 겸손하세요"
            }
        }

        print("효 해석 프레임워크 생성 완료")
        return line_meanings

    def _get_trigram(self, binary: str) -> Dict[str, str]:
        """삼효괘 정보"""
        trigrams = {
            "111": {"name": "건", "element": "하늘", "nature": "강건"},
            "000": {"name": "곤", "element": "땅", "nature": "유순"},
            "100": {"name": "진", "element": "우레", "nature": "움직임"},
            "010": {"name": "감", "element": "물", "nature": "험난"},
            "001": {"name": "간", "element": "산", "nature": "그침"},
            "110": {"name": "손", "element": "바람", "nature": "들어감"},
            "011": {"name": "리", "element": "불", "nature": "밝음"},
            "101": {"name": "태", "element": "연못", "nature": "기쁨"}
        }
        return trigrams.get(binary, {"name": "미상", "element": "미상", "nature": "미상"})

    async def _generate_judgment(self, name: str, meaning: str) -> str:
        """단사(彖辭) 생성"""
        return f"{name}은 {meaning}을 나타내니, 올바름을 지키면 이롭다."

    async def _generate_image(self, name: str, meaning: str) -> str:
        """상사(象辭) 생성"""
        return f"상에서 {meaning.split(',')[0]}을 보여주니, 군자는 이를 본받아 스스로를 닦는다."

    def _get_changing_hexagrams(self, num: int) -> List[int]:
        """변괘 목록 (예시)"""
        # 각 효가 변할 때 바뀌는 괘 번호
        return [((num - 1) ^ (1 << i)) + 1 for i in range(6)]


# ============================================================
# 수비학 해석 생성기
# ============================================================

class NumerologyInterpretationGenerator:
    """수비학 해석 코퍼스 생성"""

    def __init__(self, client: Optional['AsyncOpenAI'] = None):
        self.client = client
        self.output_dir = OUTPUT_DIR / "numerology"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_all(self):
        """수비학 해석 생성"""
        print("=" * 60)
        print("수비학 해석 코퍼스 생성 시작")
        print("=" * 60)

        life_path = await self.generate_life_path_numbers()
        expression = await self.generate_expression_numbers()
        soul_urge = await self.generate_soul_urge_numbers()
        personality = await self.generate_personality_numbers()
        master_numbers = await self.generate_master_numbers()
        personal_year = await self.generate_personal_year()

        all_data = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0"
            },
            "life_path_numbers": life_path,
            "expression_numbers": expression,
            "soul_urge_numbers": soul_urge,
            "personality_numbers": personality,
            "master_numbers": master_numbers,
            "personal_year": personal_year
        }

        output_file = self.output_dir / "complete_interpretations.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"\n저장 완료: {output_file}")
        return all_data

    async def generate_life_path_numbers(self) -> Dict:
        """생명경로수 해석"""
        numbers = {
            1: {
                "name": "리더/개척자",
                "keywords": ["독립", "리더십", "창의", "야망"],
                "positive": ["리더십", "독창성", "결단력", "용기"],
                "negative": ["고집", "이기심", "공격성"],
                "career": ["CEO", "기업가", "발명가", "작가"],
                "relationship": "독립적인 파트너십을 선호하며, 존경받기를 원합니다.",
                "life_lesson": "협력의 가치를 배우고, 타인의 의견도 존중하세요.",
                "famous_people": ["스티브 잡스", "레이디 가가"]
            },
            2: {
                "name": "조력자/중재자",
                "keywords": ["협력", "외교", "감수성", "조화"],
                "positive": ["협동심", "친절함", "직관", "인내"],
                "negative": ["우유부단", "의존성", "과민함"],
                "career": ["상담사", "외교관", "중재자", "치료사"],
                "relationship": "파트너십을 중시하며, 깊은 감정적 유대를 원합니다.",
                "life_lesson": "자기 주장을 배우고, 균형을 찾으세요.",
                "famous_people": ["오바마", "마돈나"]
            },
            3: {
                "name": "창조자/소통가",
                "keywords": ["창의", "표현", "사교", "낙관"],
                "positive": ["창의성", "유머", "영감", "표현력"],
                "negative": ["산만함", "과장", "비판에 민감"],
                "career": ["예술가", "작가", "연예인", "디자이너"],
                "relationship": "재미있고 창의적인 관계를 추구합니다.",
                "life_lesson": "집중력을 기르고, 감정을 건강하게 표현하세요.",
                "famous_people": ["힐러리 클린턴", "존 레논"]
            },
            4: {
                "name": "건설자/조직가",
                "keywords": ["안정", "구조", "인내", "실용"],
                "positive": ["신뢰성", "체계성", "근면", "충성"],
                "negative": ["완고함", "융통성 부족", "지루함"],
                "career": ["건축가", "회계사", "엔지니어", "관리자"],
                "relationship": "안정적이고 신뢰할 수 있는 관계를 원합니다.",
                "life_lesson": "유연성을 기르고, 변화를 받아들이세요.",
                "famous_people": ["오프라 윈프리", "빌 게이츠"]
            },
            5: {
                "name": "모험가/자유인",
                "keywords": ["자유", "변화", "모험", "다재다능"],
                "positive": ["적응력", "다재다능", "호기심", "카리스마"],
                "negative": ["불안정", "과잉", "산만함"],
                "career": ["여행가", "기자", "마케터", "컨설턴트"],
                "relationship": "자유롭고 모험적인 관계를 선호합니다.",
                "life_lesson": "책임감을 기르고, 헌신의 가치를 배우세요.",
                "famous_people": ["에이브러햄 링컨", "안젤리나 졸리"]
            },
            6: {
                "name": "양육자/치유자",
                "keywords": ["책임", "사랑", "가정", "조화"],
                "positive": ["헌신", "동정심", "균형", "보호"],
                "negative": ["과보호", "간섭", "완벽주의"],
                "career": ["의사", "교사", "상담사", "사회복지사"],
                "relationship": "가족과 가정을 최우선으로 여깁니다.",
                "life_lesson": "자기 돌봄을 배우고, 경계를 설정하세요.",
                "famous_people": ["아인슈타인", "존 레논"]
            },
            7: {
                "name": "탐구자/현자",
                "keywords": ["분석", "영성", "지혜", "내면"],
                "positive": ["직관", "분석력", "완벽주의", "지혜"],
                "negative": ["고립", "냉소", "비밀주의"],
                "career": ["과학자", "연구자", "철학자", "심리학자"],
                "relationship": "깊은 지적/영적 연결을 원합니다.",
                "life_lesson": "감정을 개방하고, 신뢰하는 법을 배우세요.",
                "famous_people": ["다이애나 공주", "레오나르도 디카프리오"]
            },
            8: {
                "name": "성취자/권력자",
                "keywords": ["권력", "성공", "물질", "카르마"],
                "positive": ["리더십", "효율성", "야망", "실행력"],
                "negative": ["물질주의", "지배욕", "무정함"],
                "career": ["CEO", "금융가", "변호사", "정치인"],
                "relationship": "성공을 함께 나눌 파트너를 원합니다.",
                "life_lesson": "정신적 가치를 배우고, 균형을 찾으세요.",
                "famous_people": ["넬슨 만델라", "파블로 피카소"]
            },
            9: {
                "name": "인도주의자/이상가",
                "keywords": ["봉사", "이상", "동정", "완성"],
                "positive": ["관대함", "이상주의", "창의성", "지혜"],
                "negative": ["비현실", "자기희생", "실망감"],
                "career": ["인도주의자", "예술가", "교사", "치료사"],
                "relationship": "이상적이고 영감을 주는 관계를 추구합니다.",
                "life_lesson": "실용성을 배우고, 경계를 설정하세요.",
                "famous_people": ["마더 테레사", "간디"]
            }
        }

        print(f"생명경로수: {len(numbers)}개 해석 생성")
        return numbers

    async def generate_expression_numbers(self) -> Dict:
        """표현수(성명수) 해석"""
        # 생명경로수와 유사한 구조로 생성
        numbers = {}
        for i in range(1, 10):
            numbers[i] = {
                "name": f"표현수 {i}",
                "meaning": f"이름의 진동이 {i}의 에너지를 가집니다.",
                "talents": f"숫자 {i}와 관련된 재능",
                "expression_style": f"숫자 {i}의 표현 방식"
            }
        print(f"표현수: {len(numbers)}개 해석 생성")
        return numbers

    async def generate_soul_urge_numbers(self) -> Dict:
        """영혼충동수(모음수) 해석"""
        numbers = {}
        for i in range(1, 10):
            numbers[i] = {
                "name": f"영혼충동수 {i}",
                "inner_desire": f"숫자 {i}의 내면 욕구",
                "motivation": f"숫자 {i}가 이끄는 동기",
                "fulfillment": f"숫자 {i}의 영혼이 원하는 것"
            }
        print(f"영혼충동수: {len(numbers)}개 해석 생성")
        return numbers

    async def generate_personality_numbers(self) -> Dict:
        """성격수(자음수) 해석"""
        numbers = {}
        for i in range(1, 10):
            numbers[i] = {
                "name": f"성격수 {i}",
                "outer_persona": f"숫자 {i}의 외적 페르소나",
                "first_impression": f"숫자 {i}가 주는 첫인상",
                "social_style": f"숫자 {i}의 사회적 스타일"
            }
        print(f"성격수: {len(numbers)}개 해석 생성")
        return numbers

    async def generate_master_numbers(self) -> Dict:
        """마스터 넘버 해석"""
        masters = {
            11: {
                "name": "영적 메신저",
                "meaning": "영감, 직관, 영적 통찰",
                "challenge": "현실과 이상의 균형",
                "potential": "영적 교사, 힐러, 예술가",
                "reduced_to": 2
            },
            22: {
                "name": "마스터 건설자",
                "meaning": "큰 비전의 실현, 실용적 이상주의",
                "challenge": "거대한 비전의 현실화",
                "potential": "세계적 규모의 업적",
                "reduced_to": 4
            },
            33: {
                "name": "마스터 교사",
                "meaning": "무조건적 사랑, 영적 봉사",
                "challenge": "자기 희생과 자기 돌봄의 균형",
                "potential": "인류를 위한 헌신",
                "reduced_to": 6
            }
        }
        print(f"마스터 넘버: {len(masters)}개 해석 생성")
        return masters

    async def generate_personal_year(self) -> Dict:
        """개인년도 해석"""
        years = {}
        themes = [
            "새로운 시작과 자기 발견",
            "관계와 협력, 인내",
            "창의적 표현과 사교",
            "기반 구축과 노력",
            "변화와 자유, 모험",
            "책임과 가정, 균형",
            "내면 탐구와 영적 성장",
            "성취와 물질적 풍요",
            "완성과 마무리, 봉사"
        ]

        for i in range(1, 10):
            years[i] = {
                "theme": themes[i-1],
                "opportunities": f"{i}년의 기회",
                "challenges": f"{i}년의 도전",
                "advice": f"개인년도 {i}의 조언"
            }

        print(f"개인년도: {len(years)}개 해석 생성")
        return years


# ============================================================
# 메인 실행
# ============================================================

async def main():
    parser = argparse.ArgumentParser(description="해석 코퍼스 생성")
    parser.add_argument('--domain', choices=['astro', 'tarot', 'dream', 'iching', 'numerology'],
                       help='생성할 도메인')
    parser.add_argument('--all', action='store_true', help='모든 도메인 생성')
    parser.add_argument('--use-api', action='store_true', help='OpenAI API 사용')

    args = parser.parse_args()

    # OpenAI 클라이언트 설정
    client = None
    if args.use_api and HAS_OPENAI:
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            client = AsyncOpenAI(api_key=api_key)
            print("OpenAI API 활성화")
        else:
            print("Warning: OPENAI_API_KEY 환경변수 없음. 템플릿 기반 생성")

    generators = {
        'astro': AstroInterpretationGenerator,
        'tarot': TarotInterpretationGenerator,
        'dream': DreamInterpretationGenerator,
        'iching': IChingInterpretationGenerator,
        'numerology': NumerologyInterpretationGenerator
    }

    if args.all:
        for name, gen_class in generators.items():
            print(f"\n{'='*60}")
            print(f"{name.upper()} 도메인 생성 중...")
            gen = gen_class(client)
            await gen.generate_all()
    elif args.domain:
        gen = generators[args.domain](client)
        await gen.generate_all()
    else:
        print("사용법: python generate_interpretation_corpus.py --domain <도메인> 또는 --all")
        print("도메인: astro, tarot, dream, iching, numerology")


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    asyncio.run(main())
