# backend_ai/app/prediction/transit_engine.py
"""
Transit Timing Engine
=====================
트랜짓 기반 이벤트 타이밍 분석

점성술 트랜짓 + 달의 위상 + 요일별 행성 등을 종합하여
특정 이벤트에 적합한 날짜 추천
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from .types import TimingQuality, EventType, TimingWindow, KST
from .data_loader import DataLoader


class TransitTimingEngine:
    """트랜짓 기반 타이밍 엔진"""

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

    def __init__(self, data_loader: DataLoader = None):
        self.data_loader = data_loader or DataLoader()
        self.electional_rules = self.data_loader.get_electional_rules()

    def get_timing_for_event(
        self,
        event_type: EventType,
        start_date: datetime = None,
        days_range: int = 90
    ) -> List[TimingWindow]:
        """특정 이벤트에 적합한 타이밍 찾기"""
        if start_date is None:
            start_date = datetime.now(KST)

        windows = []
        all_dates = []
        current_date = start_date
        end_date = start_date + timedelta(days=days_range)

        while current_date < end_date:
            quality, factors = self._evaluate_date(current_date, event_type)

            all_dates.append({
                "date": current_date,
                "quality": quality,
                "factors": factors,
                "score": factors.get("score", 50)
            })

            if quality in [TimingQuality.EXCELLENT, TimingQuality.GOOD]:
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

        # 결과가 없으면 상위 점수 날짜로 폴백
        if not windows and all_dates:
            sorted_dates = sorted(all_dates, key=lambda x: x["score"], reverse=True)
            used_dates = set()

            for date_info in sorted_dates[:15]:
                if len(windows) >= 5:
                    break

                date = date_info["date"]
                if date in used_dates:
                    continue

                window_start = date
                window_end = date

                for offset in range(1, 3):
                    check_date = date + timedelta(days=offset)
                    if check_date not in used_dates and check_date < end_date:
                        _, check_factors = self._evaluate_date(check_date, event_type)
                        if check_factors.get("score", 0) >= date_info["score"] - 10:
                            window_end = check_date
                            used_dates.add(check_date)

                used_dates.add(date)

                score = date_info["score"]
                quality = TimingQuality.GOOD if score >= 55 else TimingQuality.NEUTRAL

                window = TimingWindow(
                    start_date=window_start,
                    end_date=window_end,
                    quality=quality,
                    event_types=[event_type],
                    astro_factors=date_info["factors"].get("astro", []),
                    saju_factors=date_info["factors"].get("saju", []),
                    advice=self._generate_timing_advice(event_type, date_info["factors"]),
                    score=score
                )
                windows.append(window)

        return sorted(windows, key=lambda w: w.score, reverse=True)[:10]

    def _evaluate_date(
        self,
        date: datetime,
        event_type: EventType
    ) -> Tuple[TimingQuality, Dict]:
        """날짜 평가"""
        factors = {"astro": [], "saju": [], "score": 55}

        # 달의 위상
        moon_phase = self._get_moon_phase(date)
        moon_score = self._evaluate_moon_phase(moon_phase, event_type)
        factors["score"] += moon_score
        factors["astro"].append(f"달: {moon_phase}")

        # 요일 효과
        weekday_score = self._evaluate_weekday(date.weekday(), event_type)
        factors["score"] += weekday_score
        if weekday_score > 0:
            weekday_names = ["월", "화", "수", "목", "금", "토", "일"]
            factors["astro"].append(f"{weekday_names[date.weekday()]}요일 유리")

        # 역행 체크
        retrograde_penalty = self._check_retrograde(date, event_type)
        factors["score"] -= retrograde_penalty
        if retrograde_penalty > 0:
            factors["astro"].append("역행 주의 기간")

        # 사주 일진 체크
        saju_bonus = self._check_saju_day(date, event_type)
        factors["score"] += saju_bonus
        if saju_bonus > 5:
            factors["saju"].append("황도길일")

        # 점수를 품질로 변환
        score = factors["score"]
        if score >= 75:
            quality = TimingQuality.EXCELLENT
        elif score >= 60:
            quality = TimingQuality.GOOD
        elif score >= 45:
            quality = TimingQuality.NEUTRAL
        elif score >= 30:
            quality = TimingQuality.CAUTION
        else:
            quality = TimingQuality.AVOID

        return quality, factors

    def _get_moon_phase(self, date: datetime) -> str:
        """달의 위상 계산"""
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
        weekday_planets = {
            6: "sun", 0: "moon", 1: "mars", 2: "mercury",
            3: "jupiter", 4: "venus", 5: "saturn"
        }

        planet = weekday_planets[weekday]
        favorable = self.EVENT_FAVORABLE_ASPECTS.get(event_type, {}).get("planets", [])

        return 10 if planet in favorable else 0

    def _check_retrograde(self, date: datetime, event_type: EventType) -> int:
        """역행 체크"""
        penalty = 0
        month = date.month

        mercury_retro_months = [4, 8, 12]
        if month in mercury_retro_months:
            if event_type in [EventType.CONTRACT, EventType.TRAVEL]:
                penalty += 8

        return penalty

    def _check_saju_day(self, date: datetime, event_type: EventType) -> int:
        """사주 일진 체크"""
        bonus = 0
        day_of_month = date.day

        hwangdo_days = [1, 7, 13, 15, 21, 27]
        if day_of_month in hwangdo_days:
            bonus += 10

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
