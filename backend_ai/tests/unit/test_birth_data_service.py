"""
Birth Data Service Tests

Tests for birth data normalization, validation, and conversion.
"""

import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock

from backend_ai.app.services.birth_data_service import (
    BirthDataService,
    normalize_birth_data,
    extract_birth_data_from_request,
    format_birth_summary,
)


class TestBirthDataServiceNormalizeBirthData:
    """Tests for normalize_birth_data method."""

    def test_basic_normalization(self):
        """Basic birth data normalization."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30"
        )

        assert result["birth_date"] == "1990-01-15"
        assert result["birth_time"] == "14:30"
        assert result["year"] == 1990
        assert result["month"] == 1
        assert result["day"] == 15
        assert result["hour"] == 14
        assert result["minute"] == 30
        assert "birth_datetime" in result
        assert result["timezone"] == "Asia/Seoul"

    def test_with_coordinates(self):
        """Normalization with latitude and longitude."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            latitude=37.5665,
            longitude=126.9780
        )

        assert result["latitude"] == 37.5665
        assert result["longitude"] == 126.9780

    def test_with_gender_male(self):
        """Gender normalization for male."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            gender="M"
        )

        assert result["gender"] == "M"

    def test_with_gender_female(self):
        """Gender normalization for female."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            gender="F"
        )

        assert result["gender"] == "F"

    def test_gender_normalization_male_full(self):
        """MALE should normalize to M."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            gender="MALE"
        )

        assert result["gender"] == "M"

    def test_gender_normalization_female_full(self):
        """FEMALE should normalize to F."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            gender="Female"
        )

        assert result["gender"] == "F"

    def test_with_city(self):
        """Normalization with city name."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            city="Seoul"
        )

        assert result["city"] == "Seoul"

    def test_city_trimmed(self):
        """City name should be trimmed."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            city="  Seoul  "
        )

        assert result["city"] == "Seoul"

    def test_custom_timezone(self):
        """Custom timezone should be stored."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            timezone="America/New_York"
        )

        assert result["timezone"] == "America/New_York"

    def test_invalid_date_format_raises(self):
        """Invalid date format should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.normalize_birth_data(
                birth_date="invalid-date",
                birth_time="14:30"
            )
        assert "Invalid date/time format" in str(exc_info.value)

    def test_invalid_time_format_raises(self):
        """Invalid time format should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.normalize_birth_data(
                birth_date="1990-01-15",
                birth_time="invalid"
            )
        assert "Invalid date/time format" in str(exc_info.value)

    def test_invalid_latitude_raises(self):
        """Invalid latitude should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.normalize_birth_data(
                birth_date="1990-01-15",
                birth_time="14:30",
                latitude=100  # Invalid: > 90
            )
        assert "Invalid latitude" in str(exc_info.value)

    def test_invalid_longitude_raises(self):
        """Invalid longitude should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.normalize_birth_data(
                birth_date="1990-01-15",
                birth_time="14:30",
                longitude=200  # Invalid: > 180
            )
        assert "Invalid longitude" in str(exc_info.value)

    def test_invalid_gender_raises(self):
        """Invalid gender should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.normalize_birth_data(
                birth_date="1990-01-15",
                birth_time="14:30",
                gender="X"  # Invalid
            )
        assert "Invalid gender" in str(exc_info.value)

    def test_boundary_latitude_valid(self):
        """Boundary latitude values should be valid."""
        # Min latitude
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            latitude=-90
        )
        assert result["latitude"] == -90

        # Max latitude
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            latitude=90
        )
        assert result["latitude"] == 90

    def test_boundary_longitude_valid(self):
        """Boundary longitude values should be valid."""
        # Min longitude
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            longitude=-180
        )
        assert result["longitude"] == -180

        # Max longitude
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            longitude=180
        )
        assert result["longitude"] == 180


class TestBirthDataServiceParseBirthDatetime:
    """Tests for parse_birth_datetime method."""

    def test_valid_datetime(self):
        """Valid datetime should be parsed."""
        result = BirthDataService.parse_birth_datetime("1990-01-15", "14:30")

        assert isinstance(result, datetime)
        assert result.year == 1990
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 14
        assert result.minute == 30

    def test_midnight(self):
        """Midnight time should be parsed."""
        result = BirthDataService.parse_birth_datetime("1990-01-15", "00:00")
        assert result.hour == 0
        assert result.minute == 0

    def test_end_of_day(self):
        """End of day time should be parsed."""
        result = BirthDataService.parse_birth_datetime("1990-01-15", "23:59")
        assert result.hour == 23
        assert result.minute == 59

    def test_invalid_format_raises(self):
        """Invalid format should raise ValueError."""
        with pytest.raises(ValueError):
            BirthDataService.parse_birth_datetime("invalid", "14:30")


class TestBirthDataServiceValidateCoordinates:
    """Tests for validate_coordinates method."""

    def test_valid_coordinates(self):
        """Valid coordinates should pass."""
        is_valid, error = BirthDataService.validate_coordinates(37.5665, 126.9780)
        assert is_valid is True
        assert error == ""

    def test_none_latitude(self):
        """None latitude should fail."""
        is_valid, error = BirthDataService.validate_coordinates(None, 126.9780)
        assert is_valid is False
        assert "required" in error.lower()

    def test_none_longitude(self):
        """None longitude should fail."""
        is_valid, error = BirthDataService.validate_coordinates(37.5665, None)
        assert is_valid is False
        assert "required" in error.lower()

    def test_invalid_latitude_type(self):
        """Non-numeric latitude should fail."""
        is_valid, error = BirthDataService.validate_coordinates("invalid", 126.9780)
        assert is_valid is False
        assert "number" in error.lower()

    def test_latitude_out_of_range(self):
        """Out of range latitude should fail."""
        is_valid, error = BirthDataService.validate_coordinates(100, 126.9780)
        assert is_valid is False
        assert "Invalid latitude" in error

    def test_longitude_out_of_range(self):
        """Out of range longitude should fail."""
        is_valid, error = BirthDataService.validate_coordinates(37.5665, 200)
        assert is_valid is False
        assert "Invalid longitude" in error

    def test_boundary_values(self):
        """Boundary coordinate values should be valid."""
        is_valid, _ = BirthDataService.validate_coordinates(-90, -180)
        assert is_valid is True

        is_valid, _ = BirthDataService.validate_coordinates(90, 180)
        assert is_valid is True


class TestBirthDataServiceExtractBirthDataFromRequest:
    """Tests for extract_birth_data_from_request method."""

    def test_basic_extraction(self):
        """Basic request data extraction."""
        data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = BirthDataService.extract_birth_data_from_request(data)

        assert result["birth_date"] == "1990-01-15"
        assert result["birth_time"] == "14:30"

    def test_with_all_fields(self):
        """Extraction with all optional fields."""
        data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "latitude": 37.5665,
            "longitude": 126.9780,
            "timezone": "Asia/Seoul",
            "gender": "M",
            "city": "Seoul"
        }
        result = BirthDataService.extract_birth_data_from_request(data)

        assert result["latitude"] == 37.5665
        assert result["longitude"] == 126.9780
        assert result["gender"] == "M"
        assert result["city"] == "Seoul"

    def test_missing_birth_date_raises(self):
        """Missing birth_date should raise ValueError."""
        data = {
            "birth_time": "14:30"
        }
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.extract_birth_data_from_request(data)
        assert "required" in str(exc_info.value).lower()

    def test_missing_birth_time_raises(self):
        """Missing birth_time should raise ValueError."""
        data = {
            "birth_date": "1990-01-15"
        }
        with pytest.raises(ValueError) as exc_info:
            BirthDataService.extract_birth_data_from_request(data)
        assert "required" in str(exc_info.value).lower()

    def test_empty_birth_date_raises(self):
        """Empty birth_date should raise ValueError."""
        data = {
            "birth_date": "",
            "birth_time": "14:30"
        }
        with pytest.raises(ValueError):
            BirthDataService.extract_birth_data_from_request(data)

    def test_whitespace_trimmed(self):
        """Whitespace should be trimmed from values."""
        data = {
            "birth_date": "  1990-01-15  ",
            "birth_time": "  14:30  "
        }
        result = BirthDataService.extract_birth_data_from_request(data)

        assert result["birth_date"] == "1990-01-15"
        assert result["birth_time"] == "14:30"

    def test_default_timezone(self):
        """Default timezone should be Asia/Seoul."""
        data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = BirthDataService.extract_birth_data_from_request(data)
        assert result["timezone"] == "Asia/Seoul"


class TestBirthDataServiceFormatBirthSummary:
    """Tests for format_birth_summary method."""

    def test_basic_summary(self):
        """Basic birth summary format."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "1990-01-15" in result
        assert "14:30" in result

    def test_summary_with_datetime(self):
        """Summary with datetime object."""
        birth_data = {
            "birth_datetime": datetime(1990, 1, 15, 14, 30),
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "1990-01-15" in result
        assert "14:30" in result

    def test_summary_with_city(self):
        """Summary should include city."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "city": "Seoul"
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "Seoul" in result

    def test_summary_with_coordinates(self):
        """Summary should include formatted coordinates."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "latitude": 37.5665,
            "longitude": 126.9780
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "N" in result  # North
        assert "E" in result  # East

    def test_summary_with_negative_coordinates(self):
        """Summary should handle negative coordinates."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "latitude": -33.8688,
            "longitude": -70.6693
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "S" in result  # South
        assert "W" in result  # West

    def test_summary_with_gender_male(self):
        """Summary should include gender for male."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "gender": "M"
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "Male" in result

    def test_summary_with_gender_female(self):
        """Summary should include gender for female."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "gender": "F"
        }
        result = BirthDataService.format_birth_summary(birth_data)

        assert "Female" in result


class TestBirthDataServiceConvertToUtc:
    """Tests for convert_to_utc method."""

    def test_converts_seoul_to_utc(self):
        """Seoul time should be converted to UTC."""
        local_dt = datetime(1990, 1, 15, 14, 30)
        result = BirthDataService.convert_to_utc(local_dt, "Asia/Seoul")

        # Should return a datetime (UTC or original if pytz not available)
        assert isinstance(result, datetime)

    def test_handles_different_timezone(self):
        """Different timezones should be handled."""
        local_dt = datetime(1990, 1, 15, 14, 30)
        result = BirthDataService.convert_to_utc(local_dt, "America/New_York")

        assert isinstance(result, datetime)

    def test_handles_invalid_timezone(self):
        """Invalid timezone should return original datetime."""
        local_dt = datetime(1990, 1, 15, 14, 30)
        result = BirthDataService.convert_to_utc(local_dt, "Invalid/Timezone")

        # Should return original datetime on error
        assert isinstance(result, datetime)


class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    def test_normalize_birth_data_convenience(self):
        """Convenience function should work."""
        result = normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30"
        )
        assert result["birth_date"] == "1990-01-15"

    def test_extract_birth_data_from_request_convenience(self):
        """Convenience function should work."""
        data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = extract_birth_data_from_request(data)
        assert result["birth_date"] == "1990-01-15"

    def test_format_birth_summary_convenience(self):
        """Convenience function should work."""
        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = format_birth_summary(birth_data)
        assert "1990-01-15" in result


class TestEdgeCases:
    """Edge case tests."""

    def test_leap_year_date(self):
        """Leap year date should be valid."""
        result = BirthDataService.normalize_birth_data(
            birth_date="2000-02-29",
            birth_time="12:00"
        )
        assert result["month"] == 2
        assert result["day"] == 29

    def test_non_leap_year_feb_29_raises(self):
        """Feb 29 on non-leap year should raise."""
        with pytest.raises(ValueError):
            BirthDataService.normalize_birth_data(
                birth_date="1999-02-29",
                birth_time="12:00"
            )

    def test_zero_coordinates(self):
        """Zero coordinates should be valid."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            latitude=0,
            longitude=0
        )
        assert result["latitude"] == 0
        assert result["longitude"] == 0

    def test_gender_with_extra_whitespace(self):
        """Gender with whitespace should be normalized."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-15",
            birth_time="14:30",
            gender="  m  "
        )
        assert result["gender"] == "M"

    def test_december_31_end_of_year(self):
        """End of year date should be valid."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-12-31",
            birth_time="23:59"
        )
        assert result["month"] == 12
        assert result["day"] == 31

    def test_january_1_start_of_year(self):
        """Start of year date should be valid."""
        result = BirthDataService.normalize_birth_data(
            birth_date="1990-01-01",
            birth_time="00:00"
        )
        assert result["month"] == 1
        assert result["day"] == 1
