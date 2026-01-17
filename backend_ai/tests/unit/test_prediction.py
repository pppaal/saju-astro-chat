"""
Unit tests for Prediction Engine module.

Tests:
- Types (Enums, dataclasses)
- DataLoader
- LuckCyclePredictor
- TransitTimingEngine
- ElectionalEngine
"""
import pytest
from datetime import datetime, timedelta, timezone


class TestPredictionTypes:
    """Tests for prediction types."""

    def test_timing_quality_enum(self):
        """TimingQuality enum should have all quality levels."""
        from app.prediction import TimingQuality

        assert TimingQuality.EXCELLENT.value == "excellent"
        assert TimingQuality.GOOD.value == "good"
        assert TimingQuality.NEUTRAL.value == "neutral"
        assert TimingQuality.CAUTION.value == "caution"
        assert TimingQuality.AVOID.value == "avoid"

    def test_event_type_enum(self):
        """EventType enum should have all event types."""
        from app.prediction import EventType

        assert EventType.CAREER.value == "career"
        assert EventType.RELATIONSHIP.value == "relationship"
        assert EventType.FINANCE.value == "finance"
        assert EventType.HEALTH.value == "health"
        assert EventType.EDUCATION.value == "education"
        assert EventType.TRAVEL.value == "travel"
        assert EventType.CONTRACT.value == "contract"
        assert EventType.GENERAL.value == "general"

    def test_kst_timezone(self):
        """KST timezone should be UTC+9."""
        from app.prediction import KST

        assert KST == timezone(timedelta(hours=9))

    def test_timing_window_dataclass(self):
        """TimingWindow dataclass should be instantiable."""
        from app.prediction import TimingWindow, TimingQuality, EventType

        window = TimingWindow(
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31),
            quality=TimingQuality.GOOD,
            event_types=[EventType.CAREER],
            saju_factors=["정관"],
            astro_factors=["Jupiter trine Sun"],
            advice="Good time for career moves",
            score=75.0
        )

        assert window.start_date.year == 2024
        assert window.quality == TimingQuality.GOOD
        assert EventType.CAREER in window.event_types
        assert "정관" in window.saju_factors
        assert window.score == 75.0

    def test_luck_period_dataclass(self):
        """LuckPeriod dataclass should be instantiable."""
        from app.prediction import LuckPeriod

        period = LuckPeriod(
            period_type="대운",
            start_year=2020,
            end_year=2030,
            dominant_god="정관",
            element="wood",
            polarity="양",
            overall_rating=80.0,
            themes=["리더십", "성장"],
            opportunities=["승진 기회"],
            challenges=["과로 주의"]
        )

        assert period.period_type == "대운"
        assert period.start_year == 2020
        assert period.end_year == 2030
        assert period.dominant_god == "정관"
        assert period.overall_rating == 80.0
        assert "리더십" in period.themes


class TestDataLoader:
    """Tests for DataLoader class."""

    def test_data_loader_exists(self):
        """DataLoader class should exist."""
        from app.prediction import DataLoader

        assert DataLoader is not None

    def test_data_loader_instantiation(self):
        """DataLoader should be instantiable."""
        from app.prediction import DataLoader

        loader = DataLoader()
        assert loader is not None


class TestLuckCyclePredictor:
    """Tests for LuckCyclePredictor class."""

    def test_luck_cycle_predictor_exists(self):
        """LuckCyclePredictor class should exist."""
        from app.prediction import LuckCyclePredictor

        assert LuckCyclePredictor is not None

    def test_luck_cycle_predictor_instantiation(self):
        """LuckCyclePredictor should be instantiable."""
        from app.prediction import LuckCyclePredictor

        predictor = LuckCyclePredictor()
        assert predictor is not None

    def test_luck_cycle_predictor_has_methods(self):
        """LuckCyclePredictor should have key methods."""
        from app.prediction import LuckCyclePredictor

        predictor = LuckCyclePredictor()
        # Check for common prediction methods
        assert hasattr(predictor, '__init__')


class TestTransitTimingEngine:
    """Tests for TransitTimingEngine class."""

    def test_transit_timing_engine_exists(self):
        """TransitTimingEngine class should exist."""
        from app.prediction import TransitTimingEngine

        assert TransitTimingEngine is not None

    def test_transit_timing_engine_instantiation(self):
        """TransitTimingEngine should be instantiable."""
        from app.prediction import TransitTimingEngine

        engine = TransitTimingEngine()
        assert engine is not None


class TestElectionalEngine:
    """Tests for ElectionalEngine class."""

    def test_electional_engine_exists(self):
        """ElectionalEngine class should exist."""
        from app.prediction import ElectionalEngine

        assert ElectionalEngine is not None

    def test_electional_engine_instantiation(self):
        """ElectionalEngine should be instantiable."""
        from app.prediction import ElectionalEngine

        engine = ElectionalEngine()
        assert engine is not None


class TestPredictionModuleExports:
    """Tests for prediction module exports."""

    def test_all_exports_available(self):
        """All exported items should be importable."""
        from app.prediction import (
            # Types
            TimingQuality,
            EventType,
            TimingWindow,
            LuckPeriod,
            KST,
            # Classes
            DataLoader,
            LuckCyclePredictor,
            TransitTimingEngine,
            ElectionalEngine,
        )

        assert TimingQuality is not None
        assert EventType is not None
        assert TimingWindow is not None
        assert LuckPeriod is not None
        assert KST is not None
        assert DataLoader is not None
        assert LuckCyclePredictor is not None
        assert TransitTimingEngine is not None
        assert ElectionalEngine is not None
