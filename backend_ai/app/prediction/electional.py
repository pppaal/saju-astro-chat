# backend_ai/app/prediction/electional.py
"""
Electional Engine
=================
택일 엔진 - '언제가 좋을까?' 질문 답변

사주 + 점성술 통합 분석으로
최적의 날짜/시간 추천
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List

from .types import TimingQuality, EventType, TimingWindow, KST
from .data_loader import DataLoader
from .luck_predictor import LuckCyclePredictor
from .transit_engine import TransitTimingEngine

logger = logging.getLogger(__name__)


class ElectionalEngine:
    """택일 엔진"""

    def __init__(self, data_loader: DataLoader = None, openai_client=None):
        self.data_loader = data_loader or DataLoader()
        self.luck_predictor = LuckCyclePredictor(data_loader)
        self.transit_engine = TransitTimingEngine(data_loader)
        self.openai_client = openai_client

    def find_best_time(
        self,
        question: str,
        birth_info: Dict = None,
        start_date: datetime = None,
        days_range: int = 90
    ) -> Dict:
        """'언제가 좋을까?' 질문에 대한 답변"""
        event_type = self._detect_event_type(question)

        if birth_info:
            return self._analyze_yearly_periods(question, birth_info, event_type)

        now = datetime.now()
        search_start = now - timedelta(days=730)
        total_range = 1460

        timing_windows = self.transit_engine.get_timing_for_event(
            event_type, search_start, total_range
        )

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

        avoid_dates = self._get_dates_to_avoid(event_type, search_start, total_range)

        return {
            "question": question,
            "event_type": event_type.value,
            "search_period": {
                "start": search_start.strftime("%Y-%m-%d"),
                "end": (search_start + timedelta(days=total_range)).strftime("%Y-%m-%d")
            },
            "recommendations": recommendations,
            "avoid_dates": avoid_dates,
            "general_advice": self._get_general_advice(event_type)
        }

    def _analyze_yearly_periods(
        self,
        question: str,
        birth_info: Dict,
        event_type: EventType
    ) -> Dict:
        """연간 기간 분석"""
        now = datetime.now(KST)
        current_year = now.year

        is_past = self._is_past_question(question)

        if is_past:
            years = range(current_year - 2, current_year + 1)
        else:
            years = range(current_year, current_year + 3)

        periods = []
        for year in years:
            seun = self.luck_predictor.calculate_seun(
                birth_info.get("year", 1990),
                birth_info.get("month", 1),
                year
            )

            effects = self.luck_predictor.SIPSIN_BASE_EFFECTS.get(seun.dominant_god, {})
            event_score = effects.get(self._event_to_category(event_type), 50)
            best_months = self.luck_predictor._get_best_months(year, seun.dominant_god)

            quality = (
                TimingQuality.EXCELLENT if event_score >= 75 else
                TimingQuality.GOOD if event_score >= 60 else
                TimingQuality.NEUTRAL if event_score >= 45 else
                TimingQuality.CAUTION
            )

            period = {
                "year": year,
                "quality": quality.value,
                "quality_display": self._quality_to_korean(quality),
                "score": round(event_score, 1),
                "dominant_god": seun.dominant_god,
                "themes": seun.themes,
                "best_months": best_months,
                "reasons": {
                    "saju": [
                        f"{seun.dominant_god} 운: {seun.themes[0] if seun.themes else '변화'}",
                        f"오행: {seun.element}"
                    ]
                },
                "opportunities": seun.opportunities[:2],
                "challenges": seun.challenges[:1]
            }
            periods.append(period)

        periods.sort(key=lambda x: x["score"], reverse=True)
        best_period = periods[0] if periods else None

        return {
            "question": question,
            "event_type": event_type.value,
            "event_name": self._event_to_korean(event_type),
            "analysis_type": "yearly_saju",
            "periods": periods,
            "recommendation": {
                "best_year": best_period["year"] if best_period else current_year,
                "best_months": best_period["best_months"] if best_period else [3, 6, 9],
                "reason": f"{best_period['dominant_god']} 운이 {self._event_to_korean(event_type)}에 유리합니다." if best_period else "좋은 시기입니다."
            },
            "general_advice": self._get_general_advice(event_type)
        }

    def _is_past_question(self, question: str) -> bool:
        """질문이 과거에 대한 것인지 감지"""
        past_keywords = ["했", "됐", "였", "어땠", "힘들었", "좋았", "나빴"]
        return any(kw in question for kw in past_keywords)

    def _detect_event_type(self, question: str) -> EventType:
        """질문에서 이벤트 유형 감지"""
        keyword_mapping = {
            EventType.CAREER: [
                "직장", "취업", "이직", "사업", "창업", "승진", "면접", "퇴사",
                "일", "회사", "직업", "커리어", "경력", "업무", "프로젝트"
            ],
            EventType.RELATIONSHIP: [
                "결혼", "연애", "고백", "프로포즈", "소개팅", "데이트",
                "부모", "가족", "친구", "인간관계", "사이", "관계", "만남",
                "이별", "화해", "사랑", "짝", "배우자", "남편", "아내", "애인"
            ],
            EventType.FINANCE: [
                "투자", "주식", "부동산", "재테크", "대출", "돈", "재산",
                "월급", "수입", "지출", "저축", "금전", "재물", "복권", "로또",
                "사야", "살까", "구매", "구입", "비싼", "가격", "물건"
            ],
            EventType.HEALTH: [
                "수술", "치료", "병원", "건강", "다이어트", "운동",
                "아프", "질병", "몸", "체력", "피로", "스트레스"
            ],
            EventType.EDUCATION: [
                "시험", "공부", "학교", "입학", "자격증", "면허",
                "합격", "졸업", "학업", "성적", "수능", "토익", "자격"
            ],
            EventType.TRAVEL: [
                "여행", "이사", "이민", "해외", "출장", "이동", "휴가"
            ],
            EventType.CONTRACT: [
                "계약", "서명", "협상", "합의", "거래", "매매", "임대"
            ]
        }

        for event_type, keywords in keyword_mapping.items():
            for keyword in keywords:
                if keyword in question:
                    return event_type

        if self.openai_client:
            ai_result = self._detect_event_type_with_ai(question)
            if ai_result != EventType.GENERAL:
                return ai_result

        return EventType.GENERAL

    def _detect_event_type_with_ai(self, question: str) -> EventType:
        """OpenAI를 사용하여 질문 의도 파악"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """당신은 질문 분류 전문가입니다. 사용자의 질문을 분석하여 다음 카테고리 중 하나로 분류하세요.

카테고리:
- career: 직장, 취업, 이직, 사업, 창업, 승진, 경력 관련
- relationship: 연애, 결혼, 가족, 친구, 인간관계 관련
- finance: 돈, 투자, 재산, 수입, 지출 관련
- health: 건강, 수술, 치료, 다이어트, 운동 관련
- education: 공부, 시험, 학교, 자격증 관련
- travel: 여행, 이사, 이민, 출장 관련
- contract: 계약, 서명, 협상, 거래 관련
- general: 위 카테고리에 해당하지 않는 경우

반드시 카테고리 이름만 소문자로 응답하세요."""
                    },
                    {"role": "user", "content": f"질문: {question}"}
                ],
                max_tokens=20,
                temperature=0
            )

            category = response.choices[0].message.content.strip().lower()

            category_map = {
                "career": EventType.CAREER,
                "relationship": EventType.RELATIONSHIP,
                "finance": EventType.FINANCE,
                "health": EventType.HEALTH,
                "education": EventType.EDUCATION,
                "travel": EventType.TRAVEL,
                "contract": EventType.CONTRACT,
                "general": EventType.GENERAL
            }

            return category_map.get(category, EventType.GENERAL)

        except Exception as e:
            logger.warning(f"[ElectionalEngine] AI event detection failed: {e}")
            return EventType.GENERAL

    def _get_dates_to_avoid(
        self,
        event_type: EventType,
        start_date: datetime,
        days_range: int
    ) -> List[Dict]:
        """피해야 할 날짜 목록"""
        avoid_list = []
        end_date = start_date + timedelta(days=days_range)

        current = start_date
        while current < end_date:
            quality, factors = self.transit_engine._evaluate_date(current, event_type)

            if quality == TimingQuality.AVOID:
                avoid_list.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "reason": "운세 불리",
                    "factors": factors.get("astro", [])
                })

            current += timedelta(days=7)

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

    def _event_to_category(self, event_type: EventType) -> str:
        """EventType을 십신 카테고리로 변환"""
        mapping = {
            EventType.CAREER: "career",
            EventType.RELATIONSHIP: "relationship",
            EventType.FINANCE: "finance",
            EventType.HEALTH: "health",
            EventType.EDUCATION: "career",
            EventType.TRAVEL: "career",
            EventType.CONTRACT: "finance",
            EventType.GENERAL: "career"
        }
        return mapping.get(event_type, "career")

    def _event_to_korean(self, event_type: EventType) -> str:
        """EventType을 한국어로"""
        mapping = {
            EventType.CAREER: "직업/사업 운",
            EventType.RELATIONSHIP: "연애/결혼 운",
            EventType.FINANCE: "재물/투자 운",
            EventType.HEALTH: "건강 운",
            EventType.EDUCATION: "학업/시험 운",
            EventType.TRAVEL: "이동/여행 운",
            EventType.CONTRACT: "계약/협상 운",
            EventType.GENERAL: "전반적 운"
        }
        return mapping.get(event_type, "운세")

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
        }
        return advice.get(event_type, "좋은 때를 기다리며 준비하세요.")
