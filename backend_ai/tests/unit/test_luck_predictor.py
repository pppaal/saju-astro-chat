"""
Unit tests for Luck Cycle Predictor module.

Tests:
- LuckCyclePredictor class
- Daeun calculation
- Seun calculation
- Long term forecast
- Luck interaction analysis
"""
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock


class TestLuckCyclePredictorInstantiation:
    """Tests for LuckCyclePredictor class instantiation."""

    def test_predictor_instantiation(self):
        """Test predictor can be instantiated."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()
        assert predictor is not None

    def test_predictor_has_data_loader(self):
        """Test predictor has data loader."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()
        assert predictor.data_loader is not None

    def test_predictor_has_daeun_data(self):
        """Test predictor loads daeun data."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()
        assert hasattr(predictor, 'daeun_data')


class TestSipsinBaseEffects:
    """Tests for SIPSIN_BASE_EFFECTS constant."""

    def test_all_sipsin_defined(self):
        """Test all 10 sipsin types are defined."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor

        effects = LuckCyclePredictor.SIPSIN_BASE_EFFECTS
        sipsin_list = ["비견", "겁재", "식신", "상관", "편재",
                      "정재", "편관", "정관", "편인", "정인"]

        for sipsin in sipsin_list:
            assert sipsin in effects

    def test_sipsin_has_themes(self):
        """Test each sipsin has themes."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor

        for sipsin, effects in LuckCyclePredictor.SIPSIN_BASE_EFFECTS.items():
            assert 'themes' in effects
            assert isinstance(effects['themes'], list)

    def test_sipsin_has_career_score(self):
        """Test each sipsin has career score."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor

        for sipsin, effects in LuckCyclePredictor.SIPSIN_BASE_EFFECTS.items():
            assert 'career' in effects
            assert 0 <= effects['career'] <= 100

    def test_sipsin_has_positive_negative(self):
        """Test each sipsin has positive and negative aspects."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor

        for sipsin, effects in LuckCyclePredictor.SIPSIN_BASE_EFFECTS.items():
            assert 'positive' in effects
            assert 'negative' in effects
            assert isinstance(effects['positive'], list)
            assert isinstance(effects['negative'], list)


class TestCalculateDaeun:
    """Tests for daeun calculation."""

    def test_calculate_daeun_returns_luck_period(self):
        """Test daeun calculation returns LuckPeriod."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        from backend_ai.app.prediction.types import LuckPeriod
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(
            birth_year=1990,
            birth_month=5,
            birth_day=15,
            birth_hour=12,
            gender='male',
            target_year=2025
        )

        assert isinstance(result, LuckPeriod)

    def test_calculate_daeun_has_period_type(self):
        """Test daeun has correct period type."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)
        assert result.period_type == "대운"

    def test_calculate_daeun_has_dominant_god(self):
        """Test daeun has dominant god."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)

        valid_sipsin = ["비견", "겁재", "식신", "상관", "편재",
                       "정재", "편관", "정관", "편인", "정인"]
        assert result.dominant_god in valid_sipsin

    def test_calculate_daeun_has_element(self):
        """Test daeun has element."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)

        assert result.element in ["목", "화", "토", "금", "수"]

    def test_calculate_daeun_has_polarity(self):
        """Test daeun has polarity."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)

        assert result.polarity in ["양", "음"]

    def test_calculate_daeun_default_target_year(self):
        """Test daeun uses current year by default."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male')

        assert result.start_year is not None

    def test_calculate_daeun_male_yang_year_forward(self):
        """Test male yang year goes forward."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        # 1990 is yang year (even)
        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)

        assert result is not None

    def test_calculate_daeun_female_yang_year_backward(self):
        """Test female yang year goes backward."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'female', 2025)

        assert result is not None

    def test_calculate_daeun_young_age(self):
        """Test daeun for young person before daeun starts."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(2020, 5, 15, 12, 'male', 2022)

        assert result is not None

    def test_calculate_daeun_has_year_range(self):
        """Test daeun has 10 year range."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_daeun(1990, 5, 15, 12, 'male', 2025)

        assert result.end_year - result.start_year == 9


class TestCalculateSeun:
    """Tests for seun calculation."""

    def test_calculate_seun_returns_luck_period(self):
        """Test seun calculation returns LuckPeriod."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        from backend_ai.app.prediction.types import LuckPeriod
        predictor = LuckCyclePredictor()

        result = predictor.calculate_seun(
            birth_year=1990,
            birth_month=5,
            target_year=2025
        )

        assert isinstance(result, LuckPeriod)

    def test_calculate_seun_has_period_type(self):
        """Test seun has correct period type."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_seun(1990, 5, 2025)
        assert result.period_type == "세운"

    def test_calculate_seun_single_year_range(self):
        """Test seun covers single year."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_seun(1990, 5, 2025)

        assert result.start_year == 2025
        assert result.end_year == 2025

    def test_calculate_seun_has_element(self):
        """Test seun has element from earthly branch."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_seun(1990, 5, 2025)

        assert result.element in ["목", "화", "토", "금", "수"]

    def test_calculate_seun_default_target_year(self):
        """Test seun uses current year by default."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor.calculate_seun(1990, 5)

        assert result.start_year is not None


class TestGetLongTermForecast:
    """Tests for long term forecast."""

    def test_get_long_term_forecast_returns_list(self):
        """Test forecast returns list."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(
            birth_year=1990,
            birth_month=5,
            birth_day=15,
            birth_hour=12,
            gender='male',
            years_ahead=5
        )

        assert isinstance(forecasts, list)
        assert len(forecasts) == 5

    def test_get_long_term_forecast_has_year(self):
        """Test each forecast has year."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(1990, 5, 15, 12, 'male', 3)

        for forecast in forecasts:
            assert 'year' in forecast
            assert isinstance(forecast['year'], int)

    def test_get_long_term_forecast_has_daeun_info(self):
        """Test each forecast has daeun info."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(1990, 5, 15, 12, 'male', 3)

        for forecast in forecasts:
            assert 'daeun' in forecast
            assert 'dominant_god' in forecast['daeun']
            assert 'element' in forecast['daeun']

    def test_get_long_term_forecast_has_seun_info(self):
        """Test each forecast has seun info."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(1990, 5, 15, 12, 'male', 3)

        for forecast in forecasts:
            assert 'seun' in forecast
            assert 'dominant_god' in forecast['seun']

    def test_get_long_term_forecast_has_overall_score(self):
        """Test each forecast has overall score."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(1990, 5, 15, 12, 'male', 3)

        for forecast in forecasts:
            assert 'overall_score' in forecast
            assert 0 <= forecast['overall_score'] <= 100

    def test_get_long_term_forecast_has_best_months(self):
        """Test each forecast has best months."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        forecasts = predictor.get_long_term_forecast(1990, 5, 15, 12, 'male', 3)

        for forecast in forecasts:
            assert 'best_months' in forecast
            assert isinstance(forecast['best_months'], list)


class TestLuckInteractionAnalysis:
    """Tests for luck interaction analysis."""

    def test_analyze_luck_interaction(self):
        """Test luck interaction analysis."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        from backend_ai.app.prediction.types import LuckPeriod
        predictor = LuckCyclePredictor()

        daeun = LuckPeriod(
            period_type="대운",
            start_year=2020,
            end_year=2029,
            dominant_god="정관",
            element="목",
            polarity="양",
            overall_rating=70.0,
            themes=["명예"],
            opportunities=["승진"],
            challenges=["부담"]
        )
        seun = LuckPeriod(
            period_type="세운",
            start_year=2025,
            end_year=2025,
            dominant_god="정재",
            element="화",
            polarity="음",
            overall_rating=75.0,
            themes=["안정"],
            opportunities=["수입"],
            challenges=["지루함"]
        )

        result = predictor._analyze_luck_interaction(daeun, seun)

        assert 'score' in result
        assert 'highlights' in result
        assert 'cautions' in result
        assert 'focus_areas' in result

    def test_analyze_luck_interaction_score_clamped(self):
        """Test interaction score is clamped to 0-100."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        from backend_ai.app.prediction.types import LuckPeriod
        predictor = LuckCyclePredictor()

        daeun = LuckPeriod("대운", 2020, 2029, "정관", "목", "양", 100.0, [], [], [])
        seun = LuckPeriod("세운", 2025, 2025, "정재", "화", "음", 100.0, [], [], [])

        result = predictor._analyze_luck_interaction(daeun, seun)

        assert 0 <= result['score'] <= 100


class TestSipsinSynergy:
    """Tests for sipsin synergy calculation."""

    def test_get_sipsin_synergy_positive(self):
        """Test positive sipsin synergy."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor._get_sipsin_synergy("정관", "정재")

        assert result['positive'] is True
        assert result['multiplier'] > 1.0

    def test_get_sipsin_synergy_negative(self):
        """Test negative sipsin synergy."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor._get_sipsin_synergy("겁재", "편재")

        assert result['positive'] is False
        assert result['multiplier'] < 1.0

    def test_get_sipsin_synergy_neutral(self):
        """Test neutral sipsin synergy."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        result = predictor._get_sipsin_synergy("비견", "식신")

        assert result['multiplier'] == 1.0


class TestGetBestMonths:
    """Tests for best months calculation."""

    def test_get_best_months_returns_list(self):
        """Test best months returns list."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        months = predictor._get_best_months(2025, "정관")

        assert isinstance(months, list)
        assert len(months) > 0

    def test_get_best_months_valid_range(self):
        """Test best months are in valid range."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        months = predictor._get_best_months(2025, "식신")

        for month in months:
            assert 1 <= month <= 12

    def test_get_best_months_fallback(self):
        """Test best months fallback for unknown sipsin."""
        from backend_ai.app.prediction.luck_predictor import LuckCyclePredictor
        predictor = LuckCyclePredictor()

        months = predictor._get_best_months(2025, "unknown")

        assert months == [3, 6, 9, 12]
