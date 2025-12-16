"""
Prediction Engine v5.0
사주 대운/세운 + 점성술 트랜짓 통합 예측 시스템

Features:
- 대운/세운 기반 장기 예측
- 트랜짓 기반 이벤트 타이밍
- '언제가 좋을까?' 질문 답변
- 사주-점성술 크로스 분석
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import math

# OpenAI for AI-enhanced predictions
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False


class TimingQuality(Enum):
    """타이밍 품질 등급"""
    EXCELLENT = "excellent"  # 최상 - 강력 추천
    GOOD = "good"           # 좋음 - 추천
    NEUTRAL = "neutral"     # 보통 - 진행 가능
    CAUTION = "caution"     # 주의 - 신중히
    AVOID = "avoid"         # 피함 - 비추천


class EventType(Enum):
    """이벤트 유형"""
    CAREER = "career"           # 직업/사업
    RELATIONSHIP = "relationship"  # 연애/결혼
    FINANCE = "finance"         # 재물/투자
    HEALTH = "health"           # 건강
    EDUCATION = "education"     # 학업/시험
    TRAVEL = "travel"           # 여행/이사
    CONTRACT = "contract"       # 계약/서명
    GENERAL = "general"         # 일반


@dataclass
class TimingWindow:
    """타이밍 윈도우"""
    start_date: datetime
    end_date: datetime
    quality: TimingQuality
    event_types: List[EventType]
    saju_factors: List[str] = field(default_factory=list)
    astro_factors: List[str] = field(default_factory=list)
    advice: str = ""
    score: float = 0.0


@dataclass
class LuckPeriod:
    """운세 기간"""
    period_type: str  # 대운, 세운, 월운, 일운
    start_year: int
    end_year: int
    dominant_god: str  # 주관 십신
    element: str      # 오행
    polarity: str     # 음양
    overall_rating: float  # 0-100
    themes: List[str] = field(default_factory=list)
    opportunities: List[str] = field(default_factory=list)
    challenges: List[str] = field(default_factory=list)


class DataLoader:
    """데이터 로더"""

    def __init__(self, base_path: str = None):
        if base_path is None:
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.base_path = base_path
        self._cache: Dict[str, Any] = {}

    def load_json(self, relative_path: str) -> Dict:
        """JSON 파일 로드 (캐싱)"""
        if relative_path in self._cache:
            return self._cache[relative_path]

        full_path = os.path.join(self.base_path, relative_path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self._cache[relative_path] = data
                return data
        except Exception as e:
            print(f"Error loading {full_path}: {e}")
            return {}

    def get_daeun_data(self) -> Dict:
        """대운 상세 데이터"""
        return self.load_json("data/graph/rules/saju/daeun_detailed.json")

    def get_electional_rules(self) -> Dict:
        """택일 규칙"""
        return self.load_json("data/graph/astro/electional/electional_rules.json")

    def get_cross_luck_data(self) -> Dict:
        """대운-트랜짓 크로스 데이터"""
        return self.load_json("data/graph/fusion/cross_luck_progression.json")

    def get_transit_data(self) -> Dict:
        """트랜짓 데이터"""
        return self.load_json("data/graph/astro/progressions/advanced_progressions.json")


class LuckCyclePredictor:
    """
    대운/세운 기반 장기 예측기

    사주의 10년 대운과 연간 세운을 분석하여
    인생의 큰 흐름과 연도별 운세를 예측
    """

    # 십신별 기본 영향력
    SIPSIN_BASE_EFFECTS = {
        "비견": {
            "themes": ["자아 강화", "경쟁", "독립"],
            "career": 60, "relationship": 50, "finance": 40, "health": 70,
            "positive": ["자신감 상승", "독립심 강화", "동료 운 좋음"],
            "negative": ["고집 증가", "경쟁 심화", "재물 분산"]
        },
        "겁재": {
            "themes": ["도전", "투기", "손재"],
            "career": 50, "relationship": 40, "finance": 30, "health": 60,
            "positive": ["과감한 도전", "새로운 기회"],
            "negative": ["재물 손실 주의", "배신 가능성", "무리한 투자 경계"]
        },
        "식신": {
            "themes": ["창작", "표현", "풍요"],
            "career": 70, "relationship": 75, "finance": 65, "health": 80,
            "positive": ["창의력 폭발", "의식주 풍요", "건강 양호"],
            "negative": ["나태함 주의", "과식 경계"]
        },
        "상관": {
            "themes": ["변화", "반항", "창조적 파괴"],
            "career": 55, "relationship": 45, "finance": 50, "health": 55,
            "positive": ["혁신적 아이디어", "기존 틀 탈피"],
            "negative": ["직장 갈등", "관계 충돌", "구설수"]
        },
        "편재": {
            "themes": ["횡재", "투자", "유동성"],
            "career": 65, "relationship": 60, "finance": 75, "health": 60,
            "positive": ["재물 기회", "사업 확장", "인맥 확대"],
            "negative": ["변동성 큼", "투기 손실 가능"]
        },
        "정재": {
            "themes": ["안정", "저축", "꾸준함"],
            "career": 70, "relationship": 70, "finance": 80, "health": 70,
            "positive": ["재물 축적", "안정적 성장", "결혼운 좋음"],
            "negative": ["지루함", "모험 회피"]
        },
        "편관": {
            "themes": ["권력", "압박", "도전"],
            "career": 75, "relationship": 50, "finance": 55, "health": 50,
            "positive": ["승진 기회", "권위 상승", "결단력"],
            "negative": ["스트레스 증가", "건강 관리 필요", "갈등"]
        },
        "정관": {
            "themes": ["명예", "안정", "책임"],
            "career": 85, "relationship": 75, "finance": 70, "health": 65,
            "positive": ["사회적 인정", "직장 안정", "신뢰 획득"],
            "negative": ["부담 증가", "자유 제한"]
        },
        "편인": {
            "themes": ["학문", "영감", "고독"],
            "career": 60, "relationship": 45, "finance": 45, "health": 55,
            "positive": ["통찰력 증가", "전문성 강화", "영적 성장"],
            "negative": ["고립감", "현실과 괴리", "건강 관리"]
        },
        "정인": {
            "themes": ["학업", "후원", "보호"],
            "career": 70, "relationship": 70, "finance": 60, "health": 75,
            "positive": ["귀인 만남", "학습 성취", "정신적 안정"],
            "negative": ["의존성", "나태", "실행력 부족"]
        }
    }

    def __init__(self, data_loader: DataLoader = None):
        self.data_loader = data_loader or DataLoader()
        self.daeun_data = self.data_loader.get_daeun_data()

    def calculate_daeun(
        self,
        birth_year: int,
        birth_month: int,
        birth_day: int,
        birth_hour: int,
        gender: str,
        target_year: int = None
    ) -> LuckPeriod:
        """
        현재/특정 연도의 대운 계산

        실제로는 사주팔자 계산이 필요하지만,
        여기서는 간략화된 로직 사용
        """
        if target_year is None:
            target_year = datetime.now().year

        age = target_year - birth_year

        # 대운 주기 계산 (약 10년 단위)
        # 남자 양년생/여자 음년생: 순행
        # 남자 음년생/여자 양년생: 역행
        is_yang_year = birth_year % 2 == 0
        is_male = gender.lower() in ['male', 'm', '남', '남자']

        forward = (is_male and is_yang_year) or (not is_male and not is_yang_year)

        # 대운 시작 나이 (보통 1-9세 사이)
        daeun_start_age = (birth_month % 9) + 1

        # 현재 몇 번째 대운인지
        if age < daeun_start_age:
            daeun_index = 0
        else:
            daeun_index = (age - daeun_start_age) // 10 + 1

        # 십신 순서 (간략화 - 실제로는 월주 기준으로 계산)
        sipsin_order = ["비견", "겁재", "식신", "상관", "편재",
                       "정재", "편관", "정관", "편인", "정인"]

        # 순행/역행에 따라 십신 결정
        base_index = (birth_month - 1) % 10
        if forward:
            current_sipsin_index = (base_index + daeun_index) % 10
        else:
            current_sipsin_index = (base_index - daeun_index) % 10

        dominant_god = sipsin_order[current_sipsin_index]

        # 대운 기간
        start_year = birth_year + daeun_start_age + (daeun_index - 1) * 10
        end_year = start_year + 9

        # 오행 (간략화)
        ohaeng = ["목", "화", "토", "금", "수"]
        element = ohaeng[current_sipsin_index % 5]

        # 음양
        polarity = "양" if current_sipsin_index % 2 == 0 else "음"

        # 십신별 효과 가져오기
        effects = self.SIPSIN_BASE_EFFECTS.get(dominant_god, {})

        # 전체 등급 계산
        overall = (
            effects.get("career", 50) * 0.3 +
            effects.get("relationship", 50) * 0.25 +
            effects.get("finance", 50) * 0.25 +
            effects.get("health", 50) * 0.2
        )

        return LuckPeriod(
            period_type="대운",
            start_year=start_year,
            end_year=end_year,
            dominant_god=dominant_god,
            element=element,
            polarity=polarity,
            overall_rating=overall,
            themes=effects.get("themes", []),
            opportunities=effects.get("positive", []),
            challenges=effects.get("negative", [])
        )

    def calculate_seun(
        self,
        birth_year: int,
        birth_month: int,
        target_year: int = None
    ) -> LuckPeriod:
        """
        세운 (연운) 계산
        해당 연도의 천간지지와 일주와의 관계로 판단
        """
        if target_year is None:
            target_year = datetime.now().year

        # 세운의 천간 (갑을병정무기경신임계)
        heavenly_stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
        # 세운의 지지 (자축인묘진사오미신유술해)
        earthly_branches = ["자", "축", "인", "묘", "진", "사",
                          "오", "미", "신", "유", "술", "해"]

        # 연도별 천간지지 계산 (1984년 = 갑자년 기준)
        base_year = 1984
        stem_index = (target_year - base_year) % 10
        branch_index = (target_year - base_year) % 12

        stem = heavenly_stems[stem_index]
        branch = earthly_branches[branch_index]

        # 천간으로 세운의 주요 십신 결정 (간략화)
        sipsin_from_stem = {
            "갑": "편재", "을": "정재", "병": "식신", "정": "상관", "무": "편관",
            "기": "정관", "경": "편인", "신": "정인", "임": "비견", "계": "겁재"
        }

        # 출생 월에 따른 조정
        stem_adjusted = (stem_index + birth_month) % 10
        dominant_god = list(sipsin_from_stem.values())[stem_adjusted]

        # 지지의 오행
        branch_element = {
            "자": "수", "축": "토", "인": "목", "묘": "목", "진": "토", "사": "화",
            "오": "화", "미": "토", "신": "금", "유": "금", "술": "토", "해": "수"
        }
        element = branch_element[branch]

        # 효과 계산
        effects = self.SIPSIN_BASE_EFFECTS.get(dominant_god, {})

        # 지지 특수 효과 (삼합, 방합, 형충 등은 추후 구현)
        overall = (
            effects.get("career", 50) * 0.3 +
            effects.get("relationship", 50) * 0.25 +
            effects.get("finance", 50) * 0.25 +
            effects.get("health", 50) * 0.2
        )

        return LuckPeriod(
            period_type="세운",
            start_year=target_year,
            end_year=target_year,
            dominant_god=dominant_god,
            element=element,
            polarity="양" if stem_index % 2 == 0 else "음",
            overall_rating=overall,
            themes=effects.get("themes", []),
            opportunities=effects.get("positive", []),
            challenges=effects.get("negative", [])
        )

    def get_long_term_forecast(
        self,
        birth_year: int,
        birth_month: int,
        birth_day: int,
        birth_hour: int,
        gender: str,
        years_ahead: int = 10
    ) -> List[Dict]:
        """
        장기 예측 (향후 N년)
        대운 + 세운 조합 분석
        """
        current_year = datetime.now().year
        forecasts = []

        # 현재 대운 정보
        current_daeun = self.calculate_daeun(
            birth_year, birth_month, birth_day, birth_hour, gender, current_year
        )

        for year in range(current_year, current_year + years_ahead):
            # 해당 연도가 새 대운 시작인지 확인
            year_daeun = self.calculate_daeun(
                birth_year, birth_month, birth_day, birth_hour, gender, year
            )

            # 세운 계산
            seun = self.calculate_seun(birth_year, birth_month, year)

            # 대운-세운 상호작용
            interaction = self._analyze_luck_interaction(year_daeun, seun)

            forecast = {
                "year": year,
                "daeun": {
                    "dominant_god": year_daeun.dominant_god,
                    "element": year_daeun.element,
                    "themes": year_daeun.themes,
                    "is_new_cycle": year == year_daeun.start_year,
                    "years_remaining": year_daeun.end_year - year
                },
                "seun": {
                    "dominant_god": seun.dominant_god,
                    "element": seun.element,
                    "themes": seun.themes
                },
                "overall_score": interaction["score"],
                "highlights": interaction["highlights"],
                "cautions": interaction["cautions"],
                "best_months": self._get_best_months(year, seun.dominant_god),
                "focus_areas": interaction["focus_areas"]
            }
            forecasts.append(forecast)

        return forecasts

    def _analyze_luck_interaction(
        self,
        daeun: LuckPeriod,
        seun: LuckPeriod
    ) -> Dict:
        """대운-세운 상호작용 분석"""

        # 오행 상생상극 관계
        element_relations = {
            ("목", "화"): 1.2, ("화", "토"): 1.2, ("토", "금"): 1.2,
            ("금", "수"): 1.2, ("수", "목"): 1.2,  # 상생
            ("목", "토"): 0.8, ("토", "수"): 0.8, ("수", "화"): 0.8,
            ("화", "금"): 0.8, ("금", "목"): 0.8,  # 상극
        }

        # 기본 점수 계산
        base_score = (daeun.overall_rating + seun.overall_rating) / 2

        # 오행 관계 보정
        relation_key = (daeun.element, seun.element)
        multiplier = element_relations.get(relation_key, 1.0)
        score = base_score * multiplier

        # 십신 조합 효과
        sipsin_synergy = self._get_sipsin_synergy(daeun.dominant_god, seun.dominant_god)
        score = score * sipsin_synergy["multiplier"]

        highlights = []
        cautions = []
        focus_areas = []

        # 대운 테마 반영
        highlights.extend(daeun.opportunities[:2])
        cautions.extend(daeun.challenges[:2])

        # 세운 테마 반영
        highlights.extend(seun.opportunities[:1])
        cautions.extend(seun.challenges[:1])

        # 시너지 효과 반영
        if sipsin_synergy["positive"]:
            highlights.append(sipsin_synergy["description"])
        else:
            cautions.append(sipsin_synergy["description"])

        # 집중 영역 결정
        daeun_effects = self.SIPSIN_BASE_EFFECTS.get(daeun.dominant_god, {})
        seun_effects = self.SIPSIN_BASE_EFFECTS.get(seun.dominant_god, {})

        areas = {
            "직업/사업": (daeun_effects.get("career", 50) + seun_effects.get("career", 50)) / 2,
            "연애/관계": (daeun_effects.get("relationship", 50) + seun_effects.get("relationship", 50)) / 2,
            "재물/투자": (daeun_effects.get("finance", 50) + seun_effects.get("finance", 50)) / 2,
            "건강/활력": (daeun_effects.get("health", 50) + seun_effects.get("health", 50)) / 2
        }

        # 상위 2개 영역
        sorted_areas = sorted(areas.items(), key=lambda x: x[1], reverse=True)
        focus_areas = [area for area, _ in sorted_areas[:2]]

        return {
            "score": min(100, max(0, score)),
            "highlights": list(set(highlights))[:4],
            "cautions": list(set(cautions))[:3],
            "focus_areas": focus_areas
        }

    def _get_sipsin_synergy(self, sipsin1: str, sipsin2: str) -> Dict:
        """십신 조합 시너지"""

        # 좋은 조합
        good_combos = {
            ("정관", "정인"): {"mult": 1.3, "desc": "학업/직장 동시 성취"},
            ("정재", "정관"): {"mult": 1.25, "desc": "재물과 명예 함께 상승"},
            ("식신", "정재"): {"mult": 1.2, "desc": "창작으로 재물 획득"},
            ("정인", "식신"): {"mult": 1.2, "desc": "배움과 표현의 조화"},
            ("비견", "편재"): {"mult": 1.15, "desc": "협력으로 재물 기회"},
        }

        # 주의가 필요한 조합
        caution_combos = {
            ("상관", "편관"): {"mult": 0.8, "desc": "직장/권위와 충돌 가능"},
            ("겁재", "편재"): {"mult": 0.85, "desc": "재물 변동 주의"},
            ("편인", "식신"): {"mult": 0.9, "desc": "도식(倒食) - 계획 차질"},
            ("편관", "편인"): {"mult": 0.9, "desc": "스트레스 누적 주의"},
        }

        key1 = (sipsin1, sipsin2)
        key2 = (sipsin2, sipsin1)

        if key1 in good_combos:
            combo = good_combos[key1]
            return {"multiplier": combo["mult"], "positive": True, "description": combo["desc"]}
        elif key2 in good_combos:
            combo = good_combos[key2]
            return {"multiplier": combo["mult"], "positive": True, "description": combo["desc"]}
        elif key1 in caution_combos:
            combo = caution_combos[key1]
            return {"multiplier": combo["mult"], "positive": False, "description": combo["desc"]}
        elif key2 in caution_combos:
            combo = caution_combos[key2]
            return {"multiplier": combo["mult"], "positive": False, "description": combo["desc"]}

        return {"multiplier": 1.0, "positive": True, "description": "보통의 운세 흐름"}

    def _get_best_months(self, year: int, seun_sipsin: str) -> List[int]:
        """연도 내 좋은 달 추천"""

        # 십신별 좋은 달 (간략화된 로직)
        sipsin_good_months = {
            "비견": [1, 3, 7],
            "겁재": [2, 6, 10],
            "식신": [3, 5, 9],
            "상관": [4, 8, 12],
            "편재": [2, 6, 11],
            "정재": [1, 4, 10],
            "편관": [3, 7, 11],
            "정관": [1, 5, 9],
            "편인": [2, 6, 10],
            "정인": [3, 7, 12]
        }

        return sipsin_good_months.get(seun_sipsin, [3, 6, 9, 12])


class TransitTimingEngine:
    """
    트랜짓 기반 이벤트 타이밍 엔진

    행성 트랜짓을 분석하여
    특정 이벤트에 적합한 시기 판단
    """

    # 행성 기호
    PLANETS = {
        "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀",
        "mars": "♂", "jupiter": "♃", "saturn": "♄",
        "uranus": "♅", "neptune": "♆", "pluto": "♇"
    }

    # 행성별 영향 기간 (일)
    PLANET_ORB_DAYS = {
        "moon": 1, "sun": 3, "mercury": 5, "venus": 7,
        "mars": 14, "jupiter": 30, "saturn": 60,
        "uranus": 90, "neptune": 120, "pluto": 180
    }

    # 이벤트별 유리한 행성 애스펙트
    EVENT_FAVORABLE_ASPECTS = {
        EventType.CAREER: {
            "planets": ["jupiter", "saturn", "sun"],
            "houses": [10, 6, 2],
            "aspects": ["trine", "sextile", "conjunction"]
        },
        EventType.RELATIONSHIP: {
            "planets": ["venus", "moon", "jupiter"],
            "houses": [7, 5, 1],
            "aspects": ["trine", "sextile", "conjunction"]
        },
        EventType.FINANCE: {
            "planets": ["jupiter", "venus", "pluto"],
            "houses": [2, 8, 10],
            "aspects": ["trine", "sextile"]
        },
        EventType.HEALTH: {
            "planets": ["sun", "mars", "jupiter"],
            "houses": [1, 6],
            "aspects": ["trine", "sextile"]
        },
        EventType.EDUCATION: {
            "planets": ["mercury", "jupiter", "saturn"],
            "houses": [3, 9],
            "aspects": ["trine", "sextile", "conjunction"]
        },
        EventType.TRAVEL: {
            "planets": ["jupiter", "mercury", "moon"],
            "houses": [9, 3],
            "aspects": ["trine", "sextile"]
        },
        EventType.CONTRACT: {
            "planets": ["mercury", "saturn", "jupiter"],
            "houses": [3, 7, 10],
            "aspects": ["trine", "sextile"]
        }
    }

    # 피해야 할 기간
    AVOID_PERIODS = {
        "mercury_retrograde": {
            "affects": [EventType.CONTRACT, EventType.TRAVEL, EventType.CAREER],
            "advice": "수성 역행 - 계약, 여행, 중요 결정 재고 필요"
        },
        "venus_retrograde": {
            "affects": [EventType.RELATIONSHIP, EventType.FINANCE],
            "advice": "금성 역행 - 새 연애/투자 시작 비추천"
        },
        "mars_retrograde": {
            "affects": [EventType.CAREER, EventType.HEALTH],
            "advice": "화성 역행 - 새 프로젝트 시작 주의"
        },
        "void_of_course_moon": {
            "affects": [EventType.CONTRACT, EventType.CAREER, EventType.RELATIONSHIP],
            "advice": "무효 달 - 중요 결정/시작 피하기"
        }
    }

    def __init__(self, data_loader: DataLoader = None):
        self.data_loader = data_loader or DataLoader()
        self.electional_rules = self.data_loader.get_electional_rules()

    def get_timing_for_event(
        self,
        event_type: EventType,
        start_date: datetime = None,
        days_range: int = 90
    ) -> List[TimingWindow]:
        """
        특정 이벤트에 적합한 타이밍 찾기
        """
        if start_date is None:
            start_date = datetime.now()

        windows = []
        current_date = start_date
        end_date = start_date + timedelta(days=days_range)

        while current_date < end_date:
            # 해당 날짜의 타이밍 품질 평가
            quality, factors = self._evaluate_date(current_date, event_type)

            if quality in [TimingQuality.EXCELLENT, TimingQuality.GOOD]:
                # 연속된 좋은 날짜 찾기
                window_end = current_date
                while window_end < end_date:
                    next_quality, _ = self._evaluate_date(
                        window_end + timedelta(days=1), event_type
                    )
                    if next_quality not in [TimingQuality.EXCELLENT, TimingQuality.GOOD]:
                        break
                    window_end += timedelta(days=1)

                window = TimingWindow(
                    start_date=current_date,
                    end_date=window_end,
                    quality=quality,
                    event_types=[event_type],
                    astro_factors=factors.get("astro", []),
                    saju_factors=factors.get("saju", []),
                    advice=self._generate_timing_advice(event_type, factors),
                    score=factors.get("score", 70)
                )
                windows.append(window)
                current_date = window_end + timedelta(days=1)
            else:
                current_date += timedelta(days=1)

        return sorted(windows, key=lambda w: w.score, reverse=True)[:10]

    def _evaluate_date(
        self,
        date: datetime,
        event_type: EventType
    ) -> Tuple[TimingQuality, Dict]:
        """날짜 평가"""

        factors = {"astro": [], "saju": [], "score": 50}

        # 달의 위상 (간략화된 계산)
        moon_phase = self._get_moon_phase(date)
        moon_score = self._evaluate_moon_phase(moon_phase, event_type)
        factors["score"] += moon_score
        factors["astro"].append(f"달: {moon_phase}")

        # 요일 효과
        weekday_score = self._evaluate_weekday(date.weekday(), event_type)
        factors["score"] += weekday_score

        # 역행 체크 (간략화)
        retrograde_penalty = self._check_retrograde(date, event_type)
        factors["score"] -= retrograde_penalty
        if retrograde_penalty > 0:
            factors["astro"].append("역행 주의 기간")

        # 사주 일진 체크
        saju_bonus = self._check_saju_day(date, event_type)
        factors["score"] += saju_bonus
        if saju_bonus > 10:
            factors["saju"].append("길일")

        # 점수를 품질로 변환
        score = factors["score"]
        if score >= 80:
            quality = TimingQuality.EXCELLENT
        elif score >= 65:
            quality = TimingQuality.GOOD
        elif score >= 50:
            quality = TimingQuality.NEUTRAL
        elif score >= 35:
            quality = TimingQuality.CAUTION
        else:
            quality = TimingQuality.AVOID

        return quality, factors

    def _get_moon_phase(self, date: datetime) -> str:
        """달의 위상 계산 (간략화)"""
        # 기준: 2000년 1월 6일 신월
        base_new_moon = datetime(2000, 1, 6)
        days_diff = (date - base_new_moon).days
        lunar_cycle = 29.53

        phase_day = days_diff % lunar_cycle

        if phase_day < 1.85:
            return "신월"
        elif phase_day < 7.38:
            return "초승달"
        elif phase_day < 9.23:
            return "상현달"
        elif phase_day < 14.76:
            return "차오르는 달"
        elif phase_day < 16.61:
            return "보름달"
        elif phase_day < 22.14:
            return "기우는 달"
        elif phase_day < 23.99:
            return "하현달"
        else:
            return "그믐달"

    def _evaluate_moon_phase(self, phase: str, event_type: EventType) -> int:
        """달의 위상에 따른 점수"""

        # 이벤트별 좋은 달 위상
        event_moon_prefs = {
            EventType.CAREER: {"보름달": 15, "차오르는 달": 10, "상현달": 8},
            EventType.RELATIONSHIP: {"보름달": 15, "차오르는 달": 12, "초승달": 8},
            EventType.FINANCE: {"보름달": 10, "차오르는 달": 15, "상현달": 8},
            EventType.CONTRACT: {"차오르는 달": 15, "상현달": 10, "신월": -10},
            EventType.TRAVEL: {"보름달": 12, "차오르는 달": 10, "그믐달": -5},
            EventType.HEALTH: {"보름달": 10, "차오르는 달": 8},
            EventType.EDUCATION: {"차오르는 달": 12, "상현달": 10, "신월": 8}
        }

        prefs = event_moon_prefs.get(event_type, {})
        return prefs.get(phase, 0)

    def _evaluate_weekday(self, weekday: int, event_type: EventType) -> int:
        """요일에 따른 점수"""

        # 요일별 행성 지배 (일월화수목금토)
        weekday_planets = {
            6: "sun",     # 일요일
            0: "moon",    # 월요일
            1: "mars",    # 화요일
            2: "mercury", # 수요일
            3: "jupiter", # 목요일
            4: "venus",   # 금요일
            5: "saturn"   # 토요일
        }

        planet = weekday_planets[weekday]
        favorable = self.EVENT_FAVORABLE_ASPECTS.get(event_type, {}).get("planets", [])

        if planet in favorable:
            return 10
        return 0

    def _check_retrograde(self, date: datetime, event_type: EventType) -> int:
        """역행 체크 (간략화)"""

        # 2024-2025 주요 역행 기간 (예시)
        # 실제로는 천문력 데이터 필요
        penalty = 0

        year = date.year
        month = date.month

        # 수성 역행 (연 3-4회, 각 약 3주)
        mercury_retro_months = [1, 4, 8, 12]  # 대략적인 예시
        if month in mercury_retro_months:
            if event_type in [EventType.CONTRACT, EventType.TRAVEL]:
                penalty += 15

        return penalty

    def _check_saju_day(self, date: datetime, event_type: EventType) -> int:
        """사주 일진 체크"""

        # 천덕일, 월덕일, 황도일 등 (간략화)
        # 실제로는 만세력 데이터 필요

        bonus = 0
        day_of_month = date.day

        # 황도일 (간략화 - 매월 특정일)
        hwangdo_days = [1, 7, 13, 15, 21, 27]
        if day_of_month in hwangdo_days:
            bonus += 10

        # 삼짇날 등 특수일 (음력 기준이나 여기서는 간략화)

        return bonus

    def _generate_timing_advice(self, event_type: EventType, factors: Dict) -> str:
        """타이밍 조언 생성"""

        advice_templates = {
            EventType.CAREER: "직업/사업 관련 중요 결정에 적합한 시기입니다.",
            EventType.RELATIONSHIP: "연애나 관계 발전에 좋은 시기입니다.",
            EventType.FINANCE: "재물 관련 활동에 유리한 시기입니다.",
            EventType.CONTRACT: "계약이나 협상에 적합한 시기입니다.",
            EventType.TRAVEL: "여행이나 이동에 좋은 시기입니다.",
            EventType.HEALTH: "건강 관리, 운동 시작에 좋은 시기입니다.",
            EventType.EDUCATION: "학습이나 시험에 유리한 시기입니다."
        }

        base_advice = advice_templates.get(event_type, "좋은 시기입니다.")

        if factors.get("score", 50) >= 80:
            base_advice = "⭐ 매우 " + base_advice

        return base_advice


class ElectionalEngine:
    """
    택일 엔진 - '언제가 좋을까?' 질문 답변

    사주 + 점성술 통합 분석으로
    최적의 날짜/시간 추천
    """

    def __init__(self, data_loader: DataLoader = None):
        self.data_loader = data_loader or DataLoader()
        self.luck_predictor = LuckCyclePredictor(data_loader)
        self.transit_engine = TransitTimingEngine(data_loader)

    def find_best_time(
        self,
        question: str,
        birth_info: Dict = None,
        start_date: datetime = None,
        days_range: int = 90
    ) -> Dict:
        """
        '언제가 좋을까?' 질문에 대한 답변

        Args:
            question: 질문 (예: "사업 시작 언제가 좋아?", "결혼 날짜 추천")
            birth_info: 생년월일시 정보 (선택)
            start_date: 검색 시작일
            days_range: 검색 기간 (일)

        Returns:
            최적 날짜들과 이유
        """
        if start_date is None:
            start_date = datetime.now()

        # 질문에서 이벤트 유형 파악
        event_type = self._detect_event_type(question)

        # 트랜짓 기반 좋은 날짜 찾기
        timing_windows = self.transit_engine.get_timing_for_event(
            event_type, start_date, days_range
        )

        # 사주 운세 반영 (생년월일 제공시)
        if birth_info:
            timing_windows = self._filter_by_saju(timing_windows, birth_info)

        # 결과 정리
        recommendations = []
        for window in timing_windows[:5]:
            rec = {
                "start_date": window.start_date.strftime("%Y-%m-%d"),
                "end_date": window.end_date.strftime("%Y-%m-%d"),
                "quality": window.quality.value,
                "quality_display": self._quality_to_korean(window.quality),
                "score": round(window.score, 1),
                "reasons": {
                    "astro": window.astro_factors,
                    "saju": window.saju_factors
                },
                "advice": window.advice
            }
            recommendations.append(rec)

        # 피해야 할 날짜들
        avoid_dates = self._get_dates_to_avoid(event_type, start_date, days_range)

        return {
            "question": question,
            "event_type": event_type.value,
            "search_period": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": (start_date + timedelta(days=days_range)).strftime("%Y-%m-%d")
            },
            "recommendations": recommendations,
            "avoid_dates": avoid_dates,
            "general_advice": self._get_general_advice(event_type)
        }

    def _detect_event_type(self, question: str) -> EventType:
        """질문에서 이벤트 유형 감지"""

        keyword_mapping = {
            EventType.CAREER: ["직장", "취업", "이직", "사업", "창업", "승진", "면접"],
            EventType.RELATIONSHIP: ["결혼", "연애", "고백", "프로포즈", "소개팅", "데이트"],
            EventType.FINANCE: ["투자", "주식", "부동산", "재테크", "대출", "돈"],
            EventType.HEALTH: ["수술", "치료", "병원", "건강", "다이어트", "운동"],
            EventType.EDUCATION: ["시험", "공부", "학교", "입학", "자격증", "면허"],
            EventType.TRAVEL: ["여행", "이사", "이민", "해외", "출장"],
            EventType.CONTRACT: ["계약", "서명", "협상", "합의", "거래"]
        }

        question_lower = question.lower()

        for event_type, keywords in keyword_mapping.items():
            for keyword in keywords:
                if keyword in question_lower:
                    return event_type

        return EventType.GENERAL

    def _filter_by_saju(
        self,
        windows: List[TimingWindow],
        birth_info: Dict
    ) -> List[TimingWindow]:
        """사주 운세로 필터링"""

        if not all(k in birth_info for k in ["year", "month"]):
            return windows

        year = datetime.now().year
        seun = self.luck_predictor.calculate_seun(
            birth_info["year"], birth_info["month"], year
        )

        # 세운이 좋으면 보너스
        for window in windows:
            if seun.overall_rating >= 70:
                window.score += 10
                window.saju_factors.append(f"세운 길({seun.dominant_god})")
            elif seun.overall_rating <= 40:
                window.score -= 5
                window.saju_factors.append(f"세운 주의({seun.dominant_god})")

        # 재정렬
        return sorted(windows, key=lambda w: w.score, reverse=True)

    def _get_dates_to_avoid(
        self,
        event_type: EventType,
        start_date: datetime,
        days_range: int
    ) -> List[Dict]:
        """피해야 할 날짜 목록"""

        avoid_list = []
        end_date = start_date + timedelta(days=days_range)

        # 간략화된 피해야 할 날짜 (실제로는 천문력 필요)
        # 예: 역행 기간, 무효 달, 흑도일 등

        current = start_date
        while current < end_date:
            quality, factors = self.transit_engine._evaluate_date(current, event_type)

            if quality == TimingQuality.AVOID:
                avoid_list.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "reason": "운세 불리",
                    "factors": factors.get("astro", [])
                })

            current += timedelta(days=7)  # 매주 체크

        return avoid_list[:5]

    def _quality_to_korean(self, quality: TimingQuality) -> str:
        """품질을 한국어로"""
        mapping = {
            TimingQuality.EXCELLENT: "⭐ 최상",
            TimingQuality.GOOD: "👍 좋음",
            TimingQuality.NEUTRAL: "➡️ 보통",
            TimingQuality.CAUTION: "⚠️ 주의",
            TimingQuality.AVOID: "❌ 피함"
        }
        return mapping.get(quality, "보통")

    def _get_general_advice(self, event_type: EventType) -> str:
        """이벤트 유형별 일반 조언"""

        advice = {
            EventType.CAREER: """
📊 직업/사업 관련 조언:
- 목성이 유리한 위치에 있을 때 시작이 좋습니다
- 화요일(화성의 날)은 적극적인 행동에 유리
- 수성 역행기는 중요 계약/협상 피하기
- 대운이 정관/편관일 때 승진 기회 높음
            """,
            EventType.RELATIONSHIP: """
💕 연애/결혼 관련 조언:
- 금요일(금성의 날)이 로맨스에 유리
- 보름달 무렵이 감정적 연결에 좋음
- 금성 역행기에는 새 연애 시작 주의
- 대운이 정재/정관일 때 결혼운 상승
            """,
            EventType.FINANCE: """
💰 재물/투자 관련 조언:
- 목요일(목성의 날)이 재물 관련 유리
- 차오르는 달(상현~보름)에 투자 시작
- 수성 역행기 계약 체결 주의
- 대운이 정재/편재일 때 재물 기회
            """,
            EventType.CONTRACT: """
📝 계약/협상 관련 조언:
- 수요일(수성의 날) 커뮤니케이션 유리
- 수성 역행기 피하기 (오해, 실수 가능)
- 상현달~보름 사이 계약 체결 권장
- 정인/정관 운에서 신뢰 관계 형성
            """,
            EventType.TRAVEL: """
✈️ 여행/이동 관련 조언:
- 목요일(목성의 날) 장거리 여행 유리
- 보름달 무렵 에너지 좋음
- 수성 역행기 항공편 변경/지연 가능
- 편재/식신 운에서 여행운 상승
            """,
            EventType.HEALTH: """
🏥 건강/치료 관련 조언:
- 달이 차오르는 시기 에너지 회복
- 그믐달 무렵 디톡스/제거에 유리
- 화성 역행기 수술 피하기 권장
- 식신 운에서 건강 회복력 좋음
            """,
            EventType.EDUCATION: """
📚 학업/시험 관련 조언:
- 수요일(수성의 날) 학습 효율 높음
- 상현달 시기 암기력 향상
- 정인/편인 운에서 학업 성취
- 시험은 목요일(목성) 운 좋음
            """
        }

        return advice.get(event_type, "좋은 날짜를 선택하여 진행하세요.")


class UnifiedPredictionEngine:
    """
    통합 예측 엔진

    사주 + 점성술 + 타로를 통합하여
    종합적인 예측과 타이밍 조언 제공
    """

    def __init__(self, api_key: str = None):
        self.data_loader = DataLoader()
        self.luck_predictor = LuckCyclePredictor(self.data_loader)
        self.transit_engine = TransitTimingEngine(self.data_loader)
        self.electional_engine = ElectionalEngine(self.data_loader)

        # AI 해석을 위한 OpenAI 클라이언트
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)

    def get_comprehensive_forecast(
        self,
        birth_info: Dict,
        question: str = None,
        include_timing: bool = True
    ) -> Dict:
        """
        종합 예측

        Args:
            birth_info: {"year": int, "month": int, "day": int, "hour": int, "gender": str}
            question: 특정 질문 (선택)
            include_timing: 타이밍 추천 포함 여부
        """
        result = {
            "birth_info": birth_info,
            "generated_at": datetime.now().isoformat(),
            "predictions": {}
        }

        # 1. 대운 분석
        try:
            daeun = self.luck_predictor.calculate_daeun(
                birth_info["year"],
                birth_info["month"],
                birth_info.get("day", 15),
                birth_info.get("hour", 12),
                birth_info.get("gender", "unknown")
            )
            result["predictions"]["current_daeun"] = {
                "period": f"{daeun.start_year}-{daeun.end_year}",
                "dominant_god": daeun.dominant_god,
                "element": daeun.element,
                "themes": daeun.themes,
                "opportunities": daeun.opportunities,
                "challenges": daeun.challenges,
                "overall_rating": round(daeun.overall_rating, 1)
            }
        except Exception as e:
            result["predictions"]["current_daeun"] = {"error": str(e)}

        # 2. 세운 분석
        try:
            current_year = datetime.now().year
            seun = self.luck_predictor.calculate_seun(
                birth_info["year"],
                birth_info["month"],
                current_year
            )
            result["predictions"]["current_seun"] = {
                "year": current_year,
                "dominant_god": seun.dominant_god,
                "element": seun.element,
                "themes": seun.themes,
                "opportunities": seun.opportunities,
                "challenges": seun.challenges,
                "overall_rating": round(seun.overall_rating, 1)
            }
        except Exception as e:
            result["predictions"]["current_seun"] = {"error": str(e)}

        # 3. 장기 예측 (5년)
        try:
            long_term = self.luck_predictor.get_long_term_forecast(
                birth_info["year"],
                birth_info["month"],
                birth_info.get("day", 15),
                birth_info.get("hour", 12),
                birth_info.get("gender", "unknown"),
                years_ahead=5
            )
            result["predictions"]["five_year_outlook"] = long_term
        except Exception as e:
            result["predictions"]["five_year_outlook"] = {"error": str(e)}

        # 4. 질문이 있으면 택일 분석
        if question and include_timing:
            try:
                timing = self.electional_engine.find_best_time(
                    question,
                    birth_info,
                    days_range=90
                )
                result["predictions"]["timing_recommendation"] = timing
            except Exception as e:
                result["predictions"]["timing_recommendation"] = {"error": str(e)}

        # 5. AI 해석 (선택적)
        if self.client and question:
            try:
                ai_interpretation = self._generate_ai_interpretation(result, question)
                result["ai_interpretation"] = ai_interpretation
            except Exception as e:
                result["ai_interpretation"] = {"error": str(e)}

        return result

    def answer_timing_question(self, question: str, birth_info: Dict = None) -> Dict:
        """
        '언제가 좋을까?' 질문에 직접 답변
        """
        timing = self.electional_engine.find_best_time(
            question,
            birth_info,
            days_range=90
        )

        # AI로 자연스러운 답변 생성
        if self.client:
            try:
                natural_answer = self._generate_natural_answer(question, timing)
                timing["natural_answer"] = natural_answer
            except Exception:
                pass

        return timing

    def _generate_ai_interpretation(self, data: Dict, question: str) -> str:
        """AI를 통한 자연스러운 해석 생성"""

        prompt = f"""당신은 전문 운세 상담사입니다.
사주와 점성술 분석 결과를 바탕으로 따뜻하고 실용적인 조언을 해주세요.

분석 데이터:
{json.dumps(data.get('predictions', {}), ensure_ascii=False, indent=2)[:2000]}

질문: {question}

위 데이터를 바탕으로:
1. 현재 운세 흐름을 간략히 설명
2. 질문에 대한 구체적인 답변
3. 실천 가능한 조언

응답은 친근하고 희망적인 톤으로, 300자 내외로 작성해주세요."""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 따뜻하고 통찰력 있는 운세 상담사입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=500
        )

        return response.choices[0].message.content

    def _generate_natural_answer(self, question: str, timing_data: Dict) -> str:
        """자연스러운 타이밍 답변 생성"""

        recommendations = timing_data.get("recommendations", [])
        if not recommendations:
            return "분석 결과를 생성할 수 없습니다."

        best = recommendations[0]

        prompt = f"""사용자 질문: {question}

분석 결과:
- 최적 기간: {best['start_date']} ~ {best['end_date']}
- 품질: {best['quality_display']}
- 점수: {best['score']}점
- 이유: {', '.join(best['reasons'].get('astro', []) + best['reasons'].get('saju', []))}

위 정보를 바탕으로 친근하고 자연스러운 답변을 200자 내외로 작성해주세요.
구체적인 날짜와 이유를 포함하세요."""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 친근한 운세 상담사입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=300
        )

        return response.choices[0].message.content


# 싱글톤 인스턴스
_prediction_engine: Optional[UnifiedPredictionEngine] = None


def get_prediction_engine(api_key: str = None) -> UnifiedPredictionEngine:
    """예측 엔진 싱글톤 반환"""
    global _prediction_engine
    if _prediction_engine is None:
        _prediction_engine = UnifiedPredictionEngine(api_key)
    return _prediction_engine


# 편의 함수들
def predict_luck(birth_info: Dict, years_ahead: int = 5) -> List[Dict]:
    """운세 예측"""
    engine = get_prediction_engine()
    return engine.luck_predictor.get_long_term_forecast(
        birth_info["year"],
        birth_info["month"],
        birth_info.get("day", 15),
        birth_info.get("hour", 12),
        birth_info.get("gender", "unknown"),
        years_ahead
    )


def find_best_date(question: str, birth_info: Dict = None) -> Dict:
    """최적 날짜 찾기"""
    engine = get_prediction_engine()
    return engine.answer_timing_question(question, birth_info)


def get_full_forecast(birth_info: Dict, question: str = None) -> Dict:
    """전체 예측"""
    engine = get_prediction_engine()
    return engine.get_comprehensive_forecast(birth_info, question)
