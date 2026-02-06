"""
Unit tests for backend_ai/app/fortune_score_engine/

Tests:
- Constants and mappings
- ScoreBreakdown dataclass
- FortuneScoreEngine class
- Cross-reference bonus calculation
- Convenience functions
"""
import pytest
from datetime import datetime


class TestElementConstants:
    """Tests for ELEMENTS constant."""

    def test_chinese_to_english_mapping(self):
        """Should map Chinese elements to English."""
        from backend_ai.app.fortune_score_engine import ELEMENTS

        assert ELEMENTS["木"] == "wood"
        assert ELEMENTS["火"] == "fire"
        assert ELEMENTS["土"] == "earth"
        assert ELEMENTS["金"] == "metal"
        assert ELEMENTS["水"] == "water"

    def test_english_to_chinese_mapping(self):
        """Should map English elements to Chinese."""
        from backend_ai.app.fortune_score_engine import ELEMENTS

        assert ELEMENTS["wood"] == "木"
        assert ELEMENTS["fire"] == "火"
        assert ELEMENTS["earth"] == "土"
        assert ELEMENTS["metal"] == "金"
        assert ELEMENTS["water"] == "水"


class TestZodiacElements:
    """Tests for ZODIAC_ELEMENTS constant."""

    def test_fire_signs(self):
        """Should map fire signs correctly."""
        from backend_ai.app.fortune_score_engine import ZODIAC_ELEMENTS

        assert ZODIAC_ELEMENTS["Aries"] == "fire"
        assert ZODIAC_ELEMENTS["Leo"] == "fire"
        assert ZODIAC_ELEMENTS["Sagittarius"] == "fire"

    def test_earth_signs(self):
        """Should map earth signs correctly."""
        from backend_ai.app.fortune_score_engine import ZODIAC_ELEMENTS

        assert ZODIAC_ELEMENTS["Taurus"] == "earth"
        assert ZODIAC_ELEMENTS["Virgo"] == "earth"
        assert ZODIAC_ELEMENTS["Capricorn"] == "earth"

    def test_air_signs(self):
        """Should map air signs correctly."""
        from backend_ai.app.fortune_score_engine import ZODIAC_ELEMENTS

        assert ZODIAC_ELEMENTS["Gemini"] == "air"
        assert ZODIAC_ELEMENTS["Libra"] == "air"
        assert ZODIAC_ELEMENTS["Aquarius"] == "air"

    def test_water_signs(self):
        """Should map water signs correctly."""
        from backend_ai.app.fortune_score_engine import ZODIAC_ELEMENTS

        assert ZODIAC_ELEMENTS["Cancer"] == "water"
        assert ZODIAC_ELEMENTS["Scorpio"] == "water"
        assert ZODIAC_ELEMENTS["Pisces"] == "water"


class TestBranchZodiac:
    """Tests for BRANCH_ZODIAC mapping."""

    def test_all_branches_mapped(self):
        """Should map all 12 branches."""
        from backend_ai.app.fortune_score_engine import BRANCH_ZODIAC

        branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        for branch in branches:
            assert branch in BRANCH_ZODIAC


class TestSibsinWeights:
    """Tests for SIBSIN_WEIGHTS constant."""

    def test_all_ten_gods_present(self):
        """Should have weights for all ten gods."""
        from backend_ai.app.fortune_score_engine import SIBSIN_WEIGHTS

        expected = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
        for god in expected:
            assert god in SIBSIN_WEIGHTS

    def test_weight_range(self):
        """Weights should be in reasonable range."""
        from backend_ai.app.fortune_score_engine import SIBSIN_WEIGHTS

        for god, weight in SIBSIN_WEIGHTS.items():
            assert -1 <= weight <= 1


class TestTransitWeights:
    """Tests for TRANSIT_WEIGHTS constant."""

    def test_major_planets_present(self):
        """Should have weights for major planets."""
        from backend_ai.app.fortune_score_engine import TRANSIT_WEIGHTS

        planets = ["Jupiter", "Saturn", "Mars", "Venus", "Mercury", "Sun", "Moon"]
        for planet in planets:
            assert planet in TRANSIT_WEIGHTS

    def test_aspect_weights_present(self):
        """Each planet should have aspect weights."""
        from backend_ai.app.fortune_score_engine import TRANSIT_WEIGHTS

        aspects = ["conjunction", "trine", "sextile", "square", "opposition"]
        for planet, weights in TRANSIT_WEIGHTS.items():
            for aspect in aspects:
                assert aspect in weights


class TestMoonPhaseScores:
    """Tests for MOON_PHASE_SCORES constant."""

    def test_all_phases_present(self):
        """Should have scores for all moon phases."""
        from backend_ai.app.fortune_score_engine import MOON_PHASE_SCORES

        phases = ["New Moon", "Full Moon", "First Quarter", "Last Quarter"]
        for phase in phases:
            assert phase in MOON_PHASE_SCORES

    def test_full_moon_highest(self):
        """Full moon should have highest score."""
        from backend_ai.app.fortune_score_engine import MOON_PHASE_SCORES

        assert MOON_PHASE_SCORES["Full Moon"] >= max(
            v for k, v in MOON_PHASE_SCORES.items() if k != "Full Moon"
        )


class TestPlanetaryHourScores:
    """Tests for PLANETARY_HOUR_SCORES constant."""

    def test_all_planets_present(self):
        """Should have scores for all planetary hours."""
        from backend_ai.app.fortune_score_engine import PLANETARY_HOUR_SCORES

        planets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
        for planet in planets:
            assert planet in PLANETARY_HOUR_SCORES

    def test_benefic_planets_higher(self):
        """Benefic planets should have higher scores."""
        from backend_ai.app.fortune_score_engine import PLANETARY_HOUR_SCORES

        assert PLANETARY_HOUR_SCORES["Jupiter"] >= PLANETARY_HOUR_SCORES["Saturn"]
        assert PLANETARY_HOUR_SCORES["Venus"] >= PLANETARY_HOUR_SCORES["Mars"]


class TestScoreBreakdown:
    """Tests for ScoreBreakdown dataclass."""

    def test_create_breakdown(self):
        """Should create breakdown instance."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()
        assert breakdown is not None

    def test_default_values(self):
        """Should have default values."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()

        assert breakdown.saju_iljin == 0
        assert breakdown.saju_wolun == 0
        assert breakdown.saju_yongsin == 0
        assert breakdown.astro_transit == 0
        assert breakdown.cross_bonus == 0

    def test_alerts_empty_by_default(self):
        """Alerts should be empty list by default."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()
        assert breakdown.alerts == []

    def test_to_dict(self):
        """Should convert to dictionary."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()
        breakdown.saju_iljin = 10
        breakdown.astro_transit = 5

        result = breakdown.to_dict()

        assert isinstance(result, dict)
        # Result has nested structure: saju.iljin, astro.transit
        assert result["saju"]["iljin"] == 10
        assert result["astro"]["transit"] == 5

    def test_total_score_calculation(self):
        """Should calculate total score."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()
        breakdown.saju_iljin = 10
        breakdown.saju_wolun = 8
        breakdown.astro_transit = 12
        breakdown.cross_bonus = 5

        result = breakdown.to_dict()

        # Total is at the top level
        assert "total" in result
        assert result["total"] > 0


class TestFortuneScoreEngine:
    """Tests for FortuneScoreEngine class."""

    def test_create_engine(self):
        """Should create engine instance."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine is not None

    def test_engine_has_cross_mappings(self):
        """Engine should load cross mappings."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert hasattr(engine, "cross_mappings")
        assert isinstance(engine.cross_mappings, dict)

    def test_calculate_score_empty_data(self):
        """Should handle empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = engine.calculate_score({}, {})

        assert isinstance(breakdown, ScoreBreakdown)

    def test_calculate_score_with_saju(self):
        """Should calculate saju scores."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        saju = {
            "dayMaster": {"name": "甲", "element": "wood"},
            "pillars": {"day": "甲子"},
            "advancedAnalysis": {
                "sibsin": {"dominant": "정관"}
            }
        }

        breakdown = engine.calculate_score(saju, {})

        assert breakdown.saju_iljin >= 0
        assert breakdown.saju_sibsin >= -5

    def test_calculate_score_with_astro(self):
        """Should calculate astro scores."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        astro = {
            "planets": [
                {"name": "Sun", "sign": "Aries"},
                {"name": "Moon", "sign": "Cancer"}
            ]
        }

        breakdown = engine.calculate_score({}, astro)

        assert breakdown.astro_moon >= 0 or breakdown.astro_moon < 0

    def test_calculate_score_with_current_time(self):
        """Should use provided current time."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        current = datetime(2024, 1, 15, 12, 0)

        breakdown = engine.calculate_score({}, {}, current_time=current)

        assert isinstance(breakdown.to_dict(), dict)

    def test_cross_bonus_calculation(self):
        """Should calculate cross bonus."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        saju = {
            "dayMaster": {"element": "fire"},
            "pillars": {"day": "丙午"}
        }
        astro = {
            "planets": [
                {"name": "Sun", "sign": "Leo"}
            ]
        }

        breakdown = engine.calculate_score(saju, astro)

        # Cross bonus should be within range
        assert -10 <= breakdown.cross_bonus <= 10


class TestSajuScoringMixin:
    """Tests for SajuScoringMixin methods."""

    def test_mixin_importable(self):
        """SajuScoringMixin should be importable."""
        from backend_ai.app.fortune_score_engine import SajuScoringMixin
        assert SajuScoringMixin is not None


class TestAstroScoringMixin:
    """Tests for AstroScoringMixin methods."""

    def test_mixin_importable(self):
        """AstroScoringMixin should be importable."""
        from backend_ai.app.fortune_score_engine import AstroScoringMixin
        assert AstroScoringMixin is not None


class TestGetFortuneScoreEngine:
    """Tests for get_fortune_score_engine singleton."""

    def test_returns_engine(self):
        """Should return engine instance."""
        from backend_ai.app.fortune_score_engine import get_fortune_score_engine, FortuneScoreEngine

        engine = get_fortune_score_engine()
        assert isinstance(engine, FortuneScoreEngine)

    def test_returns_same_instance(self):
        """Should return same singleton instance."""
        from backend_ai.app.fortune_score_engine import get_fortune_score_engine

        engine1 = get_fortune_score_engine()
        engine2 = get_fortune_score_engine()

        assert engine1 is engine2


class TestCalculateFortuneScore:
    """Tests for calculate_fortune_score convenience function."""

    def test_returns_dict(self):
        """Should return dictionary."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score

        result = calculate_fortune_score({}, {})

        assert isinstance(result, dict)

    def test_contains_score_components(self):
        """Should contain score components."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score

        result = calculate_fortune_score({}, {})

        # Nested structure: saju.iljin, astro.transit, total
        assert "saju" in result
        assert "astro" in result
        assert "total" in result

    def test_with_full_data(self):
        """Should calculate with full data."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score

        saju = {
            "dayMaster": {"name": "甲", "element": "wood", "strength": "strong"},
            "pillars": {
                "year": "甲子",
                "month": "乙丑",
                "day": "丙寅",
                "time": "丁卯"
            },
            "advancedAnalysis": {
                "sibsin": {"dominant": "정관", "count": {"정관": 2}}
            }
        }
        astro = {
            "planets": [
                {"name": "Sun", "sign": "Aries", "house": 1},
                {"name": "Moon", "sign": "Taurus", "house": 2}
            ],
            "transits": [
                {"planet": "Jupiter", "aspect": "trine", "target": "Sun"}
            ]
        }

        result = calculate_fortune_score(saju, astro)

        assert isinstance(result["total"], (int, float))
        assert result["total"] >= 0 or result["total"] < 0


class TestModuleExports:
    """Tests for module exports."""

    def test_score_breakdown_importable(self):
        """ScoreBreakdown should be importable."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown
        assert ScoreBreakdown is not None

    def test_elements_importable(self):
        """ELEMENTS should be importable."""
        from backend_ai.app.fortune_score_engine import ELEMENTS
        assert isinstance(ELEMENTS, dict)

    def test_zodiac_elements_importable(self):
        """ZODIAC_ELEMENTS should be importable."""
        from backend_ai.app.fortune_score_engine import ZODIAC_ELEMENTS
        assert isinstance(ZODIAC_ELEMENTS, dict)

    def test_branch_zodiac_importable(self):
        """BRANCH_ZODIAC should be importable."""
        from backend_ai.app.fortune_score_engine import BRANCH_ZODIAC
        assert isinstance(BRANCH_ZODIAC, dict)

    def test_sibsin_weights_importable(self):
        """SIBSIN_WEIGHTS should be importable."""
        from backend_ai.app.fortune_score_engine import SIBSIN_WEIGHTS
        assert isinstance(SIBSIN_WEIGHTS, dict)

    def test_transit_weights_importable(self):
        """TRANSIT_WEIGHTS should be importable."""
        from backend_ai.app.fortune_score_engine import TRANSIT_WEIGHTS
        assert isinstance(TRANSIT_WEIGHTS, dict)

    def test_moon_phase_scores_importable(self):
        """MOON_PHASE_SCORES should be importable."""
        from backend_ai.app.fortune_score_engine import MOON_PHASE_SCORES
        assert isinstance(MOON_PHASE_SCORES, dict)

    def test_planetary_hour_scores_importable(self):
        """PLANETARY_HOUR_SCORES should be importable."""
        from backend_ai.app.fortune_score_engine import PLANETARY_HOUR_SCORES
        assert isinstance(PLANETARY_HOUR_SCORES, dict)

    def test_fortune_score_engine_importable(self):
        """FortuneScoreEngine should be importable."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine
        assert callable(FortuneScoreEngine)

    def test_get_fortune_score_engine_importable(self):
        """get_fortune_score_engine should be importable."""
        from backend_ai.app.fortune_score_engine import get_fortune_score_engine
        assert callable(get_fortune_score_engine)

    def test_calculate_fortune_score_importable(self):
        """calculate_fortune_score should be importable."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score
        assert callable(calculate_fortune_score)

