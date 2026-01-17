"""
Unit tests for Realtime Astro module.

Tests:
- Zodiac sign constants
- Julian day calculation
- Longitude to sign conversion
- Swiss Ephemeris calculation (if available)
- API calculation (mocked)
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone


class TestZodiacConstants:
    """Tests for zodiac sign constants."""

    def test_zodiac_signs_count(self):
        """Test 12 zodiac signs defined."""
        from backend_ai.app.realtime_astro import ZODIAC_SIGNS

        assert len(ZODIAC_SIGNS) == 12

    def test_zodiac_signs_order(self):
        """Test zodiac signs in correct order."""
        from backend_ai.app.realtime_astro import ZODIAC_SIGNS

        assert ZODIAC_SIGNS[0] == "Aries"
        assert ZODIAC_SIGNS[3] == "Cancer"
        assert ZODIAC_SIGNS[6] == "Libra"
        assert ZODIAC_SIGNS[11] == "Pisces"

    def test_zodiac_korean_count(self):
        """Test 12 Korean zodiac names defined."""
        from backend_ai.app.realtime_astro import ZODIAC_KOREAN

        assert len(ZODIAC_KOREAN) == 12

    def test_zodiac_korean_order(self):
        """Test Korean zodiac names in correct order."""
        from backend_ai.app.realtime_astro import ZODIAC_KOREAN

        assert ZODIAC_KOREAN[0] == "양자리"
        assert ZODIAC_KOREAN[3] == "게자리"
        assert ZODIAC_KOREAN[6] == "천칭자리"


class TestJulianDayCalculation:
    """Tests for _julian_day function."""

    def test_julian_day_known_date(self):
        """Test Julian day for known date."""
        from backend_ai.app.realtime_astro import _julian_day

        # J2000.0 epoch: Jan 1, 2000, 12:00 TT = JD 2451545.0
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = _julian_day(dt)

        # Should be close to 2451545.0
        assert abs(jd - 2451545.0) < 1

    def test_julian_day_different_dates(self):
        """Test Julian day increases with date."""
        from backend_ai.app.realtime_astro import _julian_day

        dt1 = datetime(2020, 1, 1, 0, 0, 0)
        dt2 = datetime(2020, 1, 2, 0, 0, 0)

        jd1 = _julian_day(dt1)
        jd2 = _julian_day(dt2)

        assert jd2 > jd1
        assert abs(jd2 - jd1 - 1.0) < 0.01


class TestLongitudeToSign:
    """Tests for _longitude_to_sign function."""

    def test_aries_at_0_degrees(self):
        """Test 0 degrees is Aries."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(0.0)

        assert sign_en == "Aries"
        assert sign_ko == "양자리"
        assert degree == 0.0

    def test_aries_at_15_degrees(self):
        """Test 15 degrees is Aries 15°."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(15.0)

        assert sign_en == "Aries"
        assert degree == 15.0

    def test_taurus_at_30_degrees(self):
        """Test 30 degrees is Taurus 0°."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(30.0)

        assert sign_en == "Taurus"
        assert sign_ko == "황소자리"
        assert degree == 0.0

    def test_leo_at_120_degrees(self):
        """Test 120 degrees is Leo 0°."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(120.0)

        assert sign_en == "Leo"

    def test_pisces_at_359_degrees(self):
        """Test 359 degrees is Pisces 29°."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(359.0)

        assert sign_en == "Pisces"
        assert degree == 29.0

    def test_wraparound_at_360(self):
        """Test 360 degrees wraps to Aries."""
        from backend_ai.app.realtime_astro import _longitude_to_sign

        sign_en, sign_ko, degree = _longitude_to_sign(360.0)

        assert sign_en == "Aries"


class TestHasSwissephFlag:
    """Tests for HAS_SWISSEPH flag."""

    def test_has_swisseph_is_boolean(self):
        """Test HAS_SWISSEPH is boolean."""
        from backend_ai.app.realtime_astro import HAS_SWISSEPH

        assert isinstance(HAS_SWISSEPH, bool)


class TestCalculatePlanetsSwisseph:
    """Tests for calculate_planets_swisseph function."""

    def test_returns_list(self):
        """Test returns a list."""
        from backend_ai.app.realtime_astro import calculate_planets_swisseph

        result = calculate_planets_swisseph()
        assert isinstance(result, list)

    def test_returns_empty_if_no_swisseph(self):
        """Test returns empty list if swisseph not available."""
        from backend_ai.app.realtime_astro import calculate_planets_swisseph, HAS_SWISSEPH

        if not HAS_SWISSEPH:
            result = calculate_planets_swisseph()
            assert result == []

    def test_planet_structure_if_available(self):
        """Test planet structure if swisseph available."""
        from backend_ai.app.realtime_astro import calculate_planets_swisseph, HAS_SWISSEPH

        if HAS_SWISSEPH:
            result = calculate_planets_swisseph()
            if result:
                planet = result[0]
                assert "name" in planet
                assert "longitude" in planet
                assert "sign" in planet
                assert "retrograde" in planet


class TestCalculatePlanetsApi:
    """Tests for calculate_planets_api function."""

    def test_returns_list(self):
        """Test returns a list."""
        from backend_ai.app.realtime_astro import calculate_planets_api

        result = calculate_planets_api()
        assert isinstance(result, list)

    def test_returns_empty_without_api_keys(self):
        """Test returns empty without API keys."""
        with patch.dict("os.environ", {"ASTRONOMY_API_ID": "", "ASTRONOMY_API_SECRET": ""}):
            from backend_ai.app.realtime_astro import calculate_planets_api

            result = calculate_planets_api()
            assert result == []

    @patch("backend_ai.app.realtime_astro.requests.get")
    def test_handles_api_error(self, mock_get):
        """Test handles API error gracefully."""
        mock_get.side_effect = Exception("API Error")

        with patch.dict("os.environ", {
            "ASTRONOMY_API_ID": "test_id",
            "ASTRONOMY_API_SECRET": "test_secret"
        }):
            from backend_ai.app.realtime_astro import calculate_planets_api

            result = calculate_planets_api()
            assert isinstance(result, list)


class TestModuleExports:
    """Tests for module exports."""

    def test_zodiac_signs_importable(self):
        """ZODIAC_SIGNS should be importable."""
        from backend_ai.app.realtime_astro import ZODIAC_SIGNS
        assert ZODIAC_SIGNS is not None

    def test_zodiac_korean_importable(self):
        """ZODIAC_KOREAN should be importable."""
        from backend_ai.app.realtime_astro import ZODIAC_KOREAN
        assert ZODIAC_KOREAN is not None

    def test_has_swisseph_importable(self):
        """HAS_SWISSEPH should be importable."""
        from backend_ai.app.realtime_astro import HAS_SWISSEPH
        assert isinstance(HAS_SWISSEPH, bool)

    def test_julian_day_importable(self):
        """_julian_day should be importable."""
        from backend_ai.app.realtime_astro import _julian_day
        assert _julian_day is not None

    def test_longitude_to_sign_importable(self):
        """_longitude_to_sign should be importable."""
        from backend_ai.app.realtime_astro import _longitude_to_sign
        assert _longitude_to_sign is not None

    def test_calculate_planets_swisseph_importable(self):
        """calculate_planets_swisseph should be importable."""
        from backend_ai.app.realtime_astro import calculate_planets_swisseph
        assert calculate_planets_swisseph is not None

    def test_calculate_planets_api_importable(self):
        """calculate_planets_api should be importable."""
        from backend_ai.app.realtime_astro import calculate_planets_api
        assert calculate_planets_api is not None
