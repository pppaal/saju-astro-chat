"""
Theme-Based Cross-Reference Filter Engine
==========================================
테마별 사주+점성술 교차점 필터링 시스템

각 테마에 맞는 데이터만 추출하여 AI에 전달
- 연애: 금성, 달, 정재/정관, 7하우스
- 직업: 토성, 목성, 편관/정관, 10하우스
- 건강: 화성, 6하우스, 식신/상관
- etc.

Version: 5.1.0
"""

import os
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum


class Theme(Enum):
    """운세 테마"""
    LOVE = "love"
    CAREER = "career"
    HEALTH = "health"
    WEALTH = "wealth"
    FAMILY = "family"
    EDUCATION = "education"
    OVERALL = "overall"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    DAILY = "daily"


@dataclass
class ThemeCrossPoint:
    """테마별 교차점"""
    theme: Theme
    saju_factors: List[Dict]
    astro_factors: List[Dict]
    intersections: List[Dict]
    important_dates: List[Dict]
    relevance_score: float


@dataclass
class ImportantDate:
    """중요 날짜"""
    date: str
    rating: int  # 1-5
    event_type: str
    saju_reason: str
    astro_reason: str
    combined_reason: str
    is_auspicious: bool


class ThemeCrossReferenceData:
    """테마별 Cross-Reference 데이터 매핑"""

    # 테마별 관련 십신
    THEME_SIPSIN = {
        Theme.LOVE: {
            "primary": ["정재", "정관", "식신"],
            "secondary": ["편재", "편관", "상관"],
            "negative": ["겁재", "편인"],
            "description": "연애/결혼 관련 십신"
        },
        Theme.CAREER: {
            "primary": ["정관", "편관", "정인"],
            "secondary": ["비견", "편인", "식신"],
            "negative": ["상관", "겁재"],
            "description": "직업/사업 관련 십신"
        },
        Theme.WEALTH: {
            "primary": ["정재", "편재", "식신"],
            "secondary": ["상관", "비견"],
            "negative": ["겁재", "편관"],
            "description": "재물/투자 관련 십신"
        },
        Theme.HEALTH: {
            "primary": ["식신", "비견", "정인"],
            "secondary": ["편인", "정재"],
            "negative": ["상관", "편관", "겁재"],
            "description": "건강/활력 관련 십신"
        },
        Theme.FAMILY: {
            "primary": ["정인", "편인", "정관"],
            "secondary": ["정재", "식신"],
            "negative": ["상관", "겁재"],
            "description": "가족/관계 관련 십신"
        },
        Theme.EDUCATION: {
            "primary": ["정인", "편인", "식신"],
            "secondary": ["정관", "상관"],
            "negative": ["겁재", "편재"],
            "description": "학업/시험 관련 십신"
        },
        Theme.OVERALL: {
            "primary": ["정관", "정재", "정인", "식신"],
            "secondary": ["편관", "편재", "편인", "상관"],
            "negative": ["겁재"],
            "description": "전체 운세"
        }
    }

    # 테마별 관련 행성
    THEME_PLANETS = {
        Theme.LOVE: {
            "primary": ["venus", "moon", "mars"],
            "secondary": ["sun", "neptune"],
            "houses": [5, 7, 8],
            "aspects": ["conjunction", "trine", "sextile"],
            "description": "연애/결혼 관련 행성"
        },
        Theme.CAREER: {
            "primary": ["saturn", "jupiter", "sun"],
            "secondary": ["mars", "mercury"],
            "houses": [2, 6, 10],
            "aspects": ["conjunction", "trine", "square"],
            "description": "직업/사업 관련 행성"
        },
        Theme.WEALTH: {
            "primary": ["jupiter", "venus", "pluto"],
            "secondary": ["saturn", "mercury"],
            "houses": [2, 8, 11],
            "aspects": ["conjunction", "trine", "sextile"],
            "description": "재물/투자 관련 행성"
        },
        Theme.HEALTH: {
            "primary": ["sun", "mars", "saturn"],
            "secondary": ["moon", "neptune"],
            "houses": [1, 6, 12],
            "aspects": ["conjunction", "opposition", "square"],
            "description": "건강/활력 관련 행성"
        },
        Theme.FAMILY: {
            "primary": ["moon", "saturn", "sun"],
            "secondary": ["venus", "jupiter"],
            "houses": [4, 10, 7],
            "aspects": ["conjunction", "trine", "opposition"],
            "description": "가족/관계 관련 행성"
        },
        Theme.EDUCATION: {
            "primary": ["mercury", "jupiter", "saturn"],
            "secondary": ["uranus", "sun"],
            "houses": [3, 9],
            "aspects": ["conjunction", "trine", "sextile"],
            "description": "학업/시험 관련 행성"
        },
        Theme.OVERALL: {
            "primary": ["sun", "moon", "jupiter", "saturn"],
            "secondary": ["mars", "venus", "mercury"],
            "houses": [1, 4, 7, 10],
            "aspects": ["conjunction", "trine", "square", "opposition"],
            "description": "전체 운세"
        }
    }

    # 십신-행성 교차 매핑
    SIPSIN_PLANET_CROSS = {
        "비견": {"planets": ["sun", "mars"], "meaning": "자아/경쟁 에너지"},
        "겁재": {"planets": ["mars", "pluto"], "meaning": "욕망/경쟁 에너지"},
        "식신": {"planets": ["venus", "jupiter"], "meaning": "표현/풍요 에너지"},
        "상관": {"planets": ["uranus", "mars"], "meaning": "반항/창조 에너지"},
        "편재": {"planets": ["jupiter", "uranus"], "meaning": "기회/변동 재물"},
        "정재": {"planets": ["venus", "saturn"], "meaning": "안정/축적 재물"},
        "편관": {"planets": ["mars", "pluto"], "meaning": "권위/압박 에너지"},
        "정관": {"planets": ["saturn", "sun"], "meaning": "명예/책임 에너지"},
        "편인": {"planets": ["uranus", "neptune"], "meaning": "영감/독창성"},
        "정인": {"planets": ["moon", "jupiter"], "meaning": "학습/보호 에너지"}
    }

    # 오행-원소 교차 매핑
    OHAENG_ELEMENT_CROSS = {
        "목": {"signs": ["aries", "sagittarius"], "element": "fire", "planets": ["jupiter", "mars"]},
        "화": {"signs": ["leo", "aries"], "element": "fire", "planets": ["sun", "mars"]},
        "토": {"signs": ["taurus", "virgo", "capricorn"], "element": "earth", "planets": ["saturn", "venus"]},
        "금": {"signs": ["libra", "aquarius"], "element": "air", "planets": ["venus", "saturn"]},
        "수": {"signs": ["cancer", "scorpio", "pisces"], "element": "water", "planets": ["moon", "neptune"]}
    }


class ThemeCrossFilter:
    """
    테마별 Cross-Reference 필터 엔진

    사주와 점성술 데이터에서 테마에 맞는 요소만 추출
    """

    def __init__(self, base_path: str = None):
        if base_path is None:
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.base_path = base_path
        self._cache: Dict[str, Any] = {}
        self._load_cross_data()

    def _load_cross_data(self):
        """Cross-reference 데이터 로드"""
        cross_files = [
            "data/graph/fusion/cross_sipsin_planets.json",
            "data/graph/fusion/cross_synastry_gunghap.json",
            "data/graph/fusion/cross_luck_progression.json",
            "data/graph/fusion/cross_electional_taegil.json",
            "data/graph/fusion/cross_relations_aspects.json",
            "data/graph/fusion/saju_astro_advanced_cross.json",
        ]

        for file_path in cross_files:
            full_path = os.path.join(self.base_path, file_path)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        key = os.path.basename(file_path).replace('.json', '')
                        self._cache[key] = json.load(f)
                except Exception as e:
                    print(f"[ThemeCrossFilter] Error loading {file_path}: {e}")

    def filter_by_theme(
        self,
        theme: str,
        saju_data: Dict,
        astro_data: Dict
    ) -> ThemeCrossPoint:
        """
        테마에 맞는 데이터만 필터링

        Args:
            theme: 테마 (love, career, health, etc.)
            saju_data: 사주 데이터
            astro_data: 점성술 데이터

        Returns:
            ThemeCrossPoint: 필터링된 교차점 데이터
        """
        theme_enum = self._get_theme_enum(theme)

        # 테마별 관련 요소 가져오기
        theme_sipsin = ThemeCrossReferenceData.THEME_SIPSIN.get(
            theme_enum,
            ThemeCrossReferenceData.THEME_SIPSIN[Theme.OVERALL]
        )
        theme_planets = ThemeCrossReferenceData.THEME_PLANETS.get(
            theme_enum,
            ThemeCrossReferenceData.THEME_PLANETS[Theme.OVERALL]
        )

        # 사주에서 테마 관련 요소 추출
        saju_factors = self._extract_saju_factors(saju_data, theme_sipsin)

        # 점성에서 테마 관련 요소 추출
        astro_factors = self._extract_astro_factors(astro_data, theme_planets)

        # 교차점 찾기
        intersections = self._find_intersections(saju_factors, astro_factors, theme_enum)

        # 중요 날짜 계산
        important_dates = self._calculate_important_dates(
            saju_data, astro_data, theme_enum
        )

        # 관련도 점수
        relevance_score = self._calculate_relevance_score(
            saju_factors, astro_factors, intersections
        )

        return ThemeCrossPoint(
            theme=theme_enum,
            saju_factors=saju_factors,
            astro_factors=astro_factors,
            intersections=intersections,
            important_dates=important_dates,
            relevance_score=relevance_score
        )

    def _get_theme_enum(self, theme: str) -> Theme:
        """문자열을 Theme enum으로 변환"""
        theme_map = {
            "love": Theme.LOVE,
            "focus_love": Theme.LOVE,
            "career": Theme.CAREER,
            "focus_career": Theme.CAREER,
            "health": Theme.HEALTH,
            "focus_health": Theme.HEALTH,
            "wealth": Theme.WEALTH,
            "money": Theme.WEALTH,
            "finance": Theme.WEALTH,
            "family": Theme.FAMILY,
            "focus_family": Theme.FAMILY,
            "education": Theme.EDUCATION,
            "overall": Theme.OVERALL,
            "focus_overall": Theme.OVERALL,
            "life": Theme.OVERALL,
            "monthly": Theme.MONTHLY,
            "fortune_monthly": Theme.MONTHLY,
            "yearly": Theme.YEARLY,
            "fortune_next_year": Theme.YEARLY,
            "fortune_new_year": Theme.YEARLY,
            "daily": Theme.DAILY,
            "fortune_today": Theme.DAILY,
        }
        return theme_map.get(theme.lower(), Theme.OVERALL)

    def _extract_saju_factors(self, saju_data: Dict, theme_sipsin: Dict) -> List[Dict]:
        """사주에서 테마 관련 요소 추출"""
        factors = []

        if not saju_data:
            return factors

        # 일간 (Day Master)
        day_master = saju_data.get("dayMaster", {})
        if day_master:
            factors.append({
                "type": "day_master",
                "value": day_master.get("stem", ""),
                "element": day_master.get("element", ""),
                "relevance": "high",
                "description": f"일간 {day_master.get('korean', '')}"
            })

        # 십신 분포
        sipsin_dist = saju_data.get("sipsinDistribution", {})
        primary_sipsin = theme_sipsin.get("primary", [])
        secondary_sipsin = theme_sipsin.get("secondary", [])

        for sipsin, count in sipsin_dist.items():
            if count > 0:
                relevance = "high" if sipsin in primary_sipsin else \
                           "medium" if sipsin in secondary_sipsin else "low"

                if relevance != "low":
                    cross_info = ThemeCrossReferenceData.SIPSIN_PLANET_CROSS.get(sipsin, {})
                    factors.append({
                        "type": "sipsin",
                        "value": sipsin,
                        "count": count,
                        "relevance": relevance,
                        "cross_planets": cross_info.get("planets", []),
                        "meaning": cross_info.get("meaning", ""),
                        "description": f"{sipsin} {count}개"
                    })

        # 오행 분포
        five_elements = saju_data.get("fiveElements", {})
        for element, count in five_elements.items():
            if count >= 2:  # 2개 이상만
                cross_info = ThemeCrossReferenceData.OHAENG_ELEMENT_CROSS.get(element, {})
                factors.append({
                    "type": "ohaeng",
                    "value": element,
                    "count": count,
                    "cross_signs": cross_info.get("signs", []),
                    "cross_planets": cross_info.get("planets", []),
                    "description": f"{element}행 {count}개"
                })

        # 격국 (있으면)
        geokguk = saju_data.get("advancedAnalysis", {}).get("geokguk", {})
        if geokguk:
            factors.append({
                "type": "geokguk",
                "value": geokguk.get("name", ""),
                "description": geokguk.get("korean", ""),
                "relevance": "high"
            })

        # 용신 (있으면)
        yongsin = saju_data.get("advancedAnalysis", {}).get("yongsin", {})
        if yongsin:
            factors.append({
                "type": "yongsin",
                "value": yongsin.get("element", ""),
                "description": f"용신: {yongsin.get('korean', '')}",
                "relevance": "high"
            })

        # 대운/세운
        daeun = saju_data.get("advancedAnalysis", {}).get("currentDaeun", {})
        if daeun:
            factors.append({
                "type": "daeun",
                "value": daeun.get("sipsin", ""),
                "period": f"{daeun.get('startAge', '')}-{daeun.get('endAge', '')}세",
                "description": f"현재 대운: {daeun.get('pillar', '')}",
                "relevance": "high" if daeun.get("sipsin") in primary_sipsin else "medium"
            })

        return factors

    def _extract_astro_factors(self, astro_data: Dict, theme_planets: Dict) -> List[Dict]:
        """점성술에서 테마 관련 요소 추출"""
        factors = []

        if not astro_data:
            return factors

        primary_planets = theme_planets.get("primary", [])
        secondary_planets = theme_planets.get("secondary", [])
        relevant_houses = theme_planets.get("houses", [])

        # 행성 배치
        planets = astro_data.get("planets", [])
        for planet in planets:
            planet_name = planet.get("name", "").lower()

            relevance = "high" if planet_name in primary_planets else \
                       "medium" if planet_name in secondary_planets else "low"

            if relevance != "low":
                house = planet.get("house", 0)
                house_relevance = "high" if house in relevant_houses else "normal"

                factors.append({
                    "type": "planet",
                    "name": planet_name,
                    "sign": planet.get("sign", ""),
                    "house": house,
                    "degree": planet.get("degree", 0),
                    "retrograde": planet.get("retrograde", False),
                    "relevance": relevance,
                    "house_relevance": house_relevance,
                    "description": f"{planet_name.title()} in {planet.get('sign', '')} ({house}H)"
                })

        # 애스펙트
        aspects = astro_data.get("aspects", [])
        relevant_aspects = theme_planets.get("aspects", [])

        for aspect in aspects:
            planet1 = aspect.get("planet1", "").lower()
            planet2 = aspect.get("planet2", "").lower()
            aspect_type = aspect.get("aspect", "").lower()

            # 테마 관련 행성이 포함된 애스펙트만
            if (planet1 in primary_planets or planet2 in primary_planets) and \
               aspect_type in relevant_aspects:
                factors.append({
                    "type": "aspect",
                    "planet1": planet1,
                    "planet2": planet2,
                    "aspect": aspect_type,
                    "orb": aspect.get("orb", 0),
                    "relevance": "high",
                    "description": f"{planet1.title()} {aspect_type} {planet2.title()}"
                })

        # 하우스 (테마 관련)
        houses = astro_data.get("houses", [])
        for i, house in enumerate(houses, 1):
            if i in relevant_houses:
                factors.append({
                    "type": "house",
                    "number": i,
                    "sign": house.get("sign", ""),
                    "degree": house.get("degree", 0),
                    "relevance": "high",
                    "description": f"{i}H in {house.get('sign', '')}"
                })

        # 트랜짓 (있으면)
        transits = astro_data.get("transits", [])
        for transit in transits[:5]:  # 상위 5개만
            t_planet = transit.get("transitPlanet", "").lower()
            if t_planet in primary_planets or t_planet in secondary_planets:
                factors.append({
                    "type": "transit",
                    "planet": t_planet,
                    "aspect": transit.get("aspect", ""),
                    "natal_planet": transit.get("natalPlanet", ""),
                    "relevance": "medium",
                    "description": f"Transit {t_planet.title()} {transit.get('aspect', '')} natal {transit.get('natalPlanet', '')}"
                })

        return factors

    def _find_intersections(
        self,
        saju_factors: List[Dict],
        astro_factors: List[Dict],
        theme: Theme
    ) -> List[Dict]:
        """사주-점성 교차점 찾기"""
        intersections = []

        # 십신-행성 교차
        for saju_f in saju_factors:
            if saju_f.get("type") == "sipsin":
                cross_planets = saju_f.get("cross_planets", [])
                for astro_f in astro_factors:
                    if astro_f.get("type") == "planet":
                        if astro_f.get("name") in cross_planets:
                            intersections.append({
                                "type": "sipsin_planet",
                                "saju": saju_f.get("value"),
                                "astro": astro_f.get("name"),
                                "meaning": f"{saju_f.get('value')}의 에너지가 {astro_f.get('name').title()}와 공명",
                                "strength": "strong" if saju_f.get("relevance") == "high" else "moderate",
                                "advice": self._get_intersection_advice(
                                    saju_f.get("value"),
                                    astro_f.get("name"),
                                    theme
                                )
                            })

        # 오행-사인 교차
        for saju_f in saju_factors:
            if saju_f.get("type") == "ohaeng":
                cross_signs = saju_f.get("cross_signs", [])
                for astro_f in astro_factors:
                    if astro_f.get("type") == "planet":
                        if astro_f.get("sign", "").lower() in [s.lower() for s in cross_signs]:
                            intersections.append({
                                "type": "ohaeng_sign",
                                "saju": f"{saju_f.get('value')}행",
                                "astro": f"{astro_f.get('name')} in {astro_f.get('sign')}",
                                "meaning": f"{saju_f.get('value')}행과 {astro_f.get('sign')} 에너지 연결",
                                "strength": "moderate"
                            })

        # 대운-트랜짓 교차
        daeun_factors = [f for f in saju_factors if f.get("type") == "daeun"]
        transit_factors = [f for f in astro_factors if f.get("type") == "transit"]

        if daeun_factors and transit_factors:
            daeun = daeun_factors[0]
            for transit in transit_factors:
                intersections.append({
                    "type": "daeun_transit",
                    "saju": f"대운 {daeun.get('value')}",
                    "astro": transit.get("description"),
                    "meaning": "대운과 트랜짓의 동시 작용",
                    "strength": "strong",
                    "timing": "현재 활성화"
                })

        return intersections

    def _get_intersection_advice(self, sipsin: str, planet: str, theme: Theme) -> str:
        """교차점별 조언"""
        advice_map = {
            (Theme.LOVE, "정재", "venus"): "안정적인 관계 형성에 좋은 시기입니다. 진지한 만남을 추구하세요.",
            (Theme.LOVE, "정관", "saturn"): "책임감 있는 파트너를 만날 수 있습니다. 결혼 운이 상승합니다.",
            (Theme.CAREER, "정관", "saturn"): "직장에서 인정받는 시기입니다. 승진 기회를 노리세요.",
            (Theme.CAREER, "편관", "mars"): "도전적인 프로젝트에 적합합니다. 경쟁에서 우위를 점하세요.",
            (Theme.WEALTH, "정재", "venus"): "안정적인 수입 증가가 예상됩니다.",
            (Theme.WEALTH, "편재", "jupiter"): "투자나 부업에서 기회가 옵니다.",
            (Theme.HEALTH, "식신", "jupiter"): "건강이 회복되는 시기입니다. 식이요법이 효과적입니다.",
        }

        key = (theme, sipsin, planet)
        return advice_map.get(key, f"{sipsin}와 {planet}의 에너지를 잘 활용하세요.")

    def _calculate_important_dates(
        self,
        saju_data: Dict,
        astro_data: Dict,
        theme: Theme
    ) -> List[Dict]:
        """테마별 중요 날짜 계산"""
        dates = []
        today = datetime.now()

        # 향후 90일 분석
        theme_planets = ThemeCrossReferenceData.THEME_PLANETS.get(
            theme,
            ThemeCrossReferenceData.THEME_PLANETS[Theme.OVERALL]
        )
        theme_sipsin = ThemeCrossReferenceData.THEME_SIPSIN.get(
            theme,
            ThemeCrossReferenceData.THEME_SIPSIN[Theme.OVERALL]
        )

        # 월운 기반 좋은 날
        monthly_luck = saju_data.get("advancedAnalysis", {}).get("monthlyLuck", [])
        for month_data in monthly_luck[:3]:
            month_sipsin = month_data.get("sipsin", "")
            if month_sipsin in theme_sipsin.get("primary", []):
                dates.append({
                    "period": month_data.get("month", ""),
                    "rating": 5,
                    "type": "월운 최적기",
                    "saju_reason": f"월운 {month_sipsin} - 테마와 일치",
                    "astro_reason": "",
                    "is_auspicious": True
                })
            elif month_sipsin in theme_sipsin.get("secondary", []):
                dates.append({
                    "period": month_data.get("month", ""),
                    "rating": 4,
                    "type": "월운 양호",
                    "saju_reason": f"월운 {month_sipsin}",
                    "astro_reason": "",
                    "is_auspicious": True
                })

        # 트랜짓 기반 좋은 날
        transits = astro_data.get("transits", [])
        for transit in transits:
            t_planet = transit.get("transitPlanet", "").lower()
            aspect = transit.get("aspect", "").lower()

            if t_planet in theme_planets.get("primary", []):
                if aspect in ["trine", "sextile", "conjunction"]:
                    dates.append({
                        "period": transit.get("exactDate", "향후"),
                        "rating": 5 if aspect == "conjunction" else 4,
                        "type": f"{t_planet.title()} {aspect}",
                        "saju_reason": "",
                        "astro_reason": f"{t_planet.title()}가 네이탈 {transit.get('natalPlanet', '')}와 {aspect}",
                        "is_auspicious": True
                    })
                elif aspect in ["square", "opposition"]:
                    dates.append({
                        "period": transit.get("exactDate", "향후"),
                        "rating": 2,
                        "type": f"{t_planet.title()} {aspect} (주의)",
                        "saju_reason": "",
                        "astro_reason": f"{t_planet.title()}가 도전적 애스펙트",
                        "is_auspicious": False
                    })

        # 특수일 (택일)
        electional = self._cache.get("cross_electional_taegil", {})
        good_days = electional.get("combined_best_dates", [])

        # 정렬 및 중복 제거
        dates = sorted(dates, key=lambda x: x.get("rating", 0), reverse=True)

        return dates[:10]  # 상위 10개

    def _calculate_relevance_score(
        self,
        saju_factors: List[Dict],
        astro_factors: List[Dict],
        intersections: List[Dict]
    ) -> float:
        """관련도 점수 계산 (0-100)"""
        score = 50.0  # 기본 점수

        # 사주 요소 점수
        high_saju = len([f for f in saju_factors if f.get("relevance") == "high"])
        medium_saju = len([f for f in saju_factors if f.get("relevance") == "medium"])
        score += high_saju * 5 + medium_saju * 2

        # 점성 요소 점수
        high_astro = len([f for f in astro_factors if f.get("relevance") == "high"])
        medium_astro = len([f for f in astro_factors if f.get("relevance") == "medium"])
        score += high_astro * 5 + medium_astro * 2

        # 교차점 점수
        strong_cross = len([i for i in intersections if i.get("strength") == "strong"])
        moderate_cross = len([i for i in intersections if i.get("strength") == "moderate"])
        score += strong_cross * 8 + moderate_cross * 4

        return min(100, max(0, score))

    def get_theme_summary(
        self,
        theme: str,
        saju_data: Dict,
        astro_data: Dict,
        locale: str = "ko"
    ) -> Dict:
        """
        테마별 요약 정보 생성

        프론트엔드에서 사용할 수 있는 구조화된 데이터 반환
        """
        cross_point = self.filter_by_theme(theme, saju_data, astro_data)

        # 하이라이트 생성
        highlights = []

        # 주요 사주 요소
        high_saju = [f for f in cross_point.saju_factors if f.get("relevance") == "high"]
        for factor in high_saju[:3]:
            highlights.append({
                "source": "saju",
                "title": factor.get("description", ""),
                "icon": "🔮"
            })

        # 주요 점성 요소
        high_astro = [f for f in cross_point.astro_factors if f.get("relevance") == "high"]
        for factor in high_astro[:3]:
            highlights.append({
                "source": "astro",
                "title": factor.get("description", ""),
                "icon": "⭐"
            })

        # 교차점
        for intersection in cross_point.intersections[:3]:
            highlights.append({
                "source": "cross",
                "title": intersection.get("meaning", ""),
                "advice": intersection.get("advice", ""),
                "icon": "🔗"
            })

        return {
            "theme": theme,
            "relevance_score": round(cross_point.relevance_score, 1),
            "highlights": highlights,
            "saju_factors": cross_point.saju_factors,
            "astro_factors": cross_point.astro_factors,
            "intersections": cross_point.intersections,
            "important_dates": cross_point.important_dates,
            "summary": {
                "saju_count": len(cross_point.saju_factors),
                "astro_count": len(cross_point.astro_factors),
                "cross_count": len(cross_point.intersections),
                "dates_count": len(cross_point.important_dates)
            }
        }

    def build_filtered_prompt_context(
        self,
        theme: str,
        saju_data: Dict,
        astro_data: Dict
    ) -> str:
        """
        AI 프롬프트용 필터링된 컨텍스트 생성

        테마에 맞는 데이터만 추출하여 프롬프트에 포함
        """
        summary = self.get_theme_summary(theme, saju_data, astro_data)

        context_parts = []

        # 테마 정보
        context_parts.append(f"## 테마: {theme.upper()}")
        context_parts.append(f"관련도 점수: {summary['relevance_score']}점/100점\n")

        # 사주 핵심 요소
        context_parts.append("### 📌 사주 핵심 요소 (테마 관련)")
        for factor in summary["saju_factors"][:5]:
            if factor.get("relevance") in ["high", "medium"]:
                context_parts.append(f"- {factor.get('description', '')} [{factor.get('relevance')}]")

        # 점성 핵심 요소
        context_parts.append("\n### ⭐ 점성술 핵심 요소 (테마 관련)")
        for factor in summary["astro_factors"][:5]:
            if factor.get("relevance") in ["high", "medium"]:
                context_parts.append(f"- {factor.get('description', '')} [{factor.get('relevance')}]")

        # 교차점
        if summary["intersections"]:
            context_parts.append("\n### 🔗 사주-점성 교차점")
            for cross in summary["intersections"][:5]:
                context_parts.append(f"- {cross.get('saju')} ↔ {cross.get('astro')}: {cross.get('meaning')}")
                if cross.get("advice"):
                    context_parts.append(f"  💡 {cross.get('advice')}")

        # 중요 날짜
        if summary["important_dates"]:
            context_parts.append("\n### 📅 테마 관련 중요 시기")
            for date in summary["important_dates"][:5]:
                emoji = "✅" if date.get("is_auspicious") else "⚠️"
                context_parts.append(f"- {emoji} {date.get('period')}: {date.get('type')} (★{date.get('rating', 3)})")
                if date.get("saju_reason"):
                    context_parts.append(f"  사주: {date.get('saju_reason')}")
                if date.get("astro_reason"):
                    context_parts.append(f"  점성: {date.get('astro_reason')}")

        return "\n".join(context_parts)


# 싱글톤 인스턴스
_theme_filter: Optional[ThemeCrossFilter] = None


def get_theme_filter() -> ThemeCrossFilter:
    """테마 필터 싱글톤 반환"""
    global _theme_filter
    if _theme_filter is None:
        _theme_filter = ThemeCrossFilter()
    return _theme_filter


# 편의 함수
def filter_data_by_theme(theme: str, saju_data: Dict, astro_data: Dict) -> Dict:
    """테마별 필터링된 데이터 반환"""
    filter_engine = get_theme_filter()
    return filter_engine.get_theme_summary(theme, saju_data, astro_data)


def get_theme_prompt_context(theme: str, saju_data: Dict, astro_data: Dict) -> str:
    """테마별 프롬프트 컨텍스트 반환"""
    filter_engine = get_theme_filter()
    return filter_engine.build_filtered_prompt_context(theme, saju_data, astro_data)
