"""
Unit tests for Prediction Types module.

Tests:
- TimingQuality enum
- EventType enum
- TimingWindow dataclass
- LuckPeriod dataclass
- KST timezone
"""
import pytest
from datetime import datetime, timedelta, timezone


class TestKSTTimezone:
    """Tests for KST timezone constant."""

    def test_kst_exists(self):
        """KST timezone should exist."""
        from app.prediction.types import KST

        assert KST is not None

    def test_kst_offset(self):
        """KST should be UTC+9."""
        from app.prediction.types import KST

        assert KST.utcoffset(None) == timedelta(hours=9)


class TestTimingQualityEnum:
    """Tests for TimingQuality enum."""

    def test_timing_quality_exists(self):
        """TimingQuality enum should exist."""
        from app.prediction.types import TimingQuality

        assert TimingQuality is not None

    def test_timing_quality_values(self):
        """TimingQuality should have expected values."""
        from app.prediction.types import TimingQuality

        assert TimingQuality.EXCELLENT.value == "excellent"
        assert TimingQuality.GOOD.value == "good"
        assert TimingQuality.NEUTRAL.value == "neutral"
        assert TimingQuality.CAUTION.value == "caution"
        assert TimingQuality.AVOID.value == "avoid"


class TestEventTypeEnum:
    """Tests for EventType enum."""

    def test_event_type_exists(self):
        """EventType enum should exist."""
        from app.prediction.types import EventType

        assert EventType is not None

    def test_event_type_values(self):
        """EventType should have expected values."""
        from app.prediction.types import EventType

        assert EventType.CAREER.value == "career"
        assert EventType.RELATIONSHIP.value == "relationship"
        assert EventType.FINANCE.value == "finance"
        assert EventType.HEALTH.value == "health"
        assert EventType.EDUCATION.value == "education"
        assert EventType.TRAVEL.value == "travel"
        assert EventType.CONTRACT.value == "contract"
        assert EventType.GENERAL.value == "general"


class TestTimingWindowDataclass:
    """Tests for TimingWindow dataclass."""

    def test_timing_window_exists(self):
        """TimingWindow dataclass should exist."""
        from app.prediction.types import TimingWindow

        assert TimingWindow is not None

    def test_timing_window_instantiation(self):
        """TimingWindow should be instantiable."""
        from app.prediction.types import TimingWindow, TimingQuality, EventType

        now = datetime.now()
        window = TimingWindow(
            start_date=now,
            end_date=now + timedelta(days=7),
            quality=TimingQuality.GOOD,
            event_types=[EventType.CAREER]
        )

        assert window.start_date == now
        assert window.quality == TimingQuality.GOOD
        assert EventType.CAREER in window.event_types

    def test_timing_window_default_values(self):
        """TimingWindow should have correct default values."""
        from app.prediction.types import TimingWindow, TimingQuality, EventType

        now = datetime.now()
        window = TimingWindow(
            start_date=now,
            end_date=now + timedelta(days=7),
            quality=TimingQuality.NEUTRAL,
            event_types=[]
        )

        assert window.saju_factors == []
        assert window.astro_factors == []
        assert window.advice == ""
        assert window.score == 0.0


class TestLuckPeriodDataclass:
    """Tests for LuckPeriod dataclass."""

    def test_luck_period_exists(self):
        """LuckPeriod dataclass should exist."""
        from app.prediction.types import LuckPeriod

        assert LuckPeriod is not None

    def test_luck_period_instantiation(self):
        """LuckPeriod should be instantiable."""
        from app.prediction.types import LuckPeriod

        period = LuckPeriod(
            period_type="대운",
            start_year=2020,
            end_year=2030,
            dominant_god="정관",
            element="wood",
            polarity="양",
            overall_rating=75.0
        )

        assert period.period_type == "대운"
        assert period.start_year == 2020
        assert period.end_year == 2030
        assert period.dominant_god == "정관"
        assert period.overall_rating == 75.0

    def test_luck_period_default_values(self):
        """LuckPeriod should have correct default values."""
        from app.prediction.types import LuckPeriod

        period = LuckPeriod(
            period_type="세운",
            start_year=2025,
            end_year=2025,
            dominant_god="식신",
            element="fire",
            polarity="음",
            overall_rating=60.0
        )

        assert period.themes == []
        assert period.opportunities == []
        assert period.challenges == []


class TestModuleExports:
    """Tests for module exports."""

    def test_timing_quality_importable(self):
        """TimingQuality should be importable."""
        from app.prediction.types import TimingQuality
        assert TimingQuality is not None

    def test_event_type_importable(self):
        """EventType should be importable."""
        from app.prediction.types import EventType
        assert EventType is not None

    def test_timing_window_importable(self):
        """TimingWindow should be importable."""
        from app.prediction.types import TimingWindow
        assert TimingWindow is not None

    def test_luck_period_importable(self):
        """LuckPeriod should be importable."""
        from app.prediction.types import LuckPeriod
        assert LuckPeriod is not None
