# backend_ai/app/prediction/types.py
"""
Prediction Engine Types
=======================
Enums, dataclasses, and constants for the prediction engine.
"""

from datetime import datetime, timedelta, timezone
from typing import List
from dataclasses import dataclass, field
from enum import Enum

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))


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
