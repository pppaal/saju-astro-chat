# backend_ai/app/prediction/luck_predictor.py
"""
Luck Cycle Predictor
====================
대운/세운 기반 장기 예측기

사주의 10년 대운과 연간 세운을 분석하여
인생의 큰 흐름과 연도별 운세를 예측
"""

from datetime import datetime
from typing import Dict, List

from .types import LuckPeriod, KST
from .data_loader import DataLoader


class LuckCyclePredictor:
    """대운/세운 기반 장기 예측기"""

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
        """현재/특정 연도의 대운 계산"""
        if target_year is None:
            target_year = datetime.now(KST).year

        age = target_year - birth_year

        is_yang_year = birth_year % 2 == 0
        is_male = gender.lower() in ['male', 'm', '남', '남자']
        forward = (is_male and is_yang_year) or (not is_male and not is_yang_year)

        daeun_start_age = (birth_month % 9) + 1

        if age < daeun_start_age:
            daeun_index = 0
        else:
            daeun_index = (age - daeun_start_age) // 10 + 1

        sipsin_order = ["비견", "겁재", "식신", "상관", "편재",
                       "정재", "편관", "정관", "편인", "정인"]

        base_index = (birth_month - 1) % 10
        if forward:
            current_sipsin_index = (base_index + daeun_index) % 10
        else:
            current_sipsin_index = (base_index - daeun_index) % 10

        dominant_god = sipsin_order[current_sipsin_index]

        start_year = birth_year + daeun_start_age + (daeun_index - 1) * 10
        end_year = start_year + 9

        ohaeng = ["목", "화", "토", "금", "수"]
        element = ohaeng[current_sipsin_index % 5]
        polarity = "양" if current_sipsin_index % 2 == 0 else "음"

        effects = self.SIPSIN_BASE_EFFECTS.get(dominant_god, {})

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
        """세운 (연운) 계산"""
        if target_year is None:
            target_year = datetime.now(KST).year

        heavenly_stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
        earthly_branches = ["자", "축", "인", "묘", "진", "사",
                          "오", "미", "신", "유", "술", "해"]

        base_year = 1984
        stem_index = (target_year - base_year) % 10
        branch_index = (target_year - base_year) % 12

        stem = heavenly_stems[stem_index]
        branch = earthly_branches[branch_index]

        sipsin_from_stem = {
            "갑": "편재", "을": "정재", "병": "식신", "정": "상관", "무": "편관",
            "기": "정관", "경": "편인", "신": "정인", "임": "비견", "계": "겁재"
        }

        stem_adjusted = (stem_index + birth_month) % 10
        dominant_god = list(sipsin_from_stem.values())[stem_adjusted]

        branch_element = {
            "자": "수", "축": "토", "인": "목", "묘": "목", "진": "토", "사": "화",
            "오": "화", "미": "토", "신": "금", "유": "금", "술": "토", "해": "수"
        }
        element = branch_element[branch]

        effects = self.SIPSIN_BASE_EFFECTS.get(dominant_god, {})

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
        """장기 예측 (향후 N년)"""
        current_year = datetime.now(KST).year
        forecasts = []

        for year in range(current_year, current_year + years_ahead):
            year_daeun = self.calculate_daeun(
                birth_year, birth_month, birth_day, birth_hour, gender, year
            )
            seun = self.calculate_seun(birth_year, birth_month, year)
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

    def _analyze_luck_interaction(self, daeun: LuckPeriod, seun: LuckPeriod) -> Dict:
        """대운-세운 상호작용 분석"""
        element_relations = {
            ("목", "화"): 1.2, ("화", "토"): 1.2, ("토", "금"): 1.2,
            ("금", "수"): 1.2, ("수", "목"): 1.2,
            ("목", "토"): 0.8, ("토", "수"): 0.8, ("수", "화"): 0.8,
            ("화", "금"): 0.8, ("금", "목"): 0.8,
        }

        base_score = (daeun.overall_rating + seun.overall_rating) / 2
        relation_key = (daeun.element, seun.element)
        multiplier = element_relations.get(relation_key, 1.0)
        score = base_score * multiplier

        sipsin_synergy = self._get_sipsin_synergy(daeun.dominant_god, seun.dominant_god)
        score = score * sipsin_synergy["multiplier"]

        highlights = []
        cautions = []

        highlights.extend(daeun.opportunities[:2])
        cautions.extend(daeun.challenges[:2])
        highlights.extend(seun.opportunities[:1])
        cautions.extend(seun.challenges[:1])

        if sipsin_synergy["positive"]:
            highlights.append(sipsin_synergy["description"])
        else:
            cautions.append(sipsin_synergy["description"])

        daeun_effects = self.SIPSIN_BASE_EFFECTS.get(daeun.dominant_god, {})
        seun_effects = self.SIPSIN_BASE_EFFECTS.get(seun.dominant_god, {})

        areas = {
            "직업/사업": (daeun_effects.get("career", 50) + seun_effects.get("career", 50)) / 2,
            "연애/관계": (daeun_effects.get("relationship", 50) + seun_effects.get("relationship", 50)) / 2,
            "재물/투자": (daeun_effects.get("finance", 50) + seun_effects.get("finance", 50)) / 2,
            "건강/활력": (daeun_effects.get("health", 50) + seun_effects.get("health", 50)) / 2
        }

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
        positive_combos = {
            ("정관", "정재"): ("직장+재물 동시 상승", 1.2),
            ("정인", "정관"): ("귀인 도움으로 승진", 1.15),
            ("식신", "정재"): ("창작으로 수입 증가", 1.15),
            ("편재", "식신"): ("부업 성공 가능", 1.1),
        }

        negative_combos = {
            ("겁재", "편재"): ("재물 손실 주의", 0.85),
            ("상관", "정관"): ("직장 갈등 주의", 0.85),
            ("편관", "겁재"): ("과도한 도전 경계", 0.9),
        }

        key = (sipsin1, sipsin2)
        reverse_key = (sipsin2, sipsin1)

        if key in positive_combos:
            desc, mult = positive_combos[key]
            return {"positive": True, "description": desc, "multiplier": mult}
        if reverse_key in positive_combos:
            desc, mult = positive_combos[reverse_key]
            return {"positive": True, "description": desc, "multiplier": mult}
        if key in negative_combos:
            desc, mult = negative_combos[key]
            return {"positive": False, "description": desc, "multiplier": mult}
        if reverse_key in negative_combos:
            desc, mult = negative_combos[reverse_key]
            return {"positive": False, "description": desc, "multiplier": mult}

        return {"positive": True, "description": "평온한 흐름", "multiplier": 1.0}

    def _get_best_months(self, year: int, seun_sipsin: str) -> List[int]:
        """해당 연도의 좋은 달 추천"""
        sipsin_good_months = {
            "비견": [1, 3, 7],
            "겁재": [2, 5, 11],
            "식신": [3, 6, 9],
            "상관": [4, 8, 12],
            "편재": [2, 6, 10],
            "정재": [1, 5, 9],
            "편관": [3, 7, 11],
            "정관": [1, 4, 8],
            "편인": [2, 6, 10],
            "정인": [3, 7, 11]
        }
        return sipsin_good_months.get(seun_sipsin, [3, 6, 9, 12])
