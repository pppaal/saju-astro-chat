"""
Unit tests for Services modules.

Tests:
- ValidationService
- BirthDataService
"""
import pytest
from datetime import datetime


class TestValidationService:
    """Tests for ValidationService."""

    def test_sanitize_user_input_normal(self):
        """Normal text should pass through unchanged."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_user_input("Tell me about my future")
        assert result == "Tell me about my future"

    def test_sanitize_user_input_empty(self):
        """Empty input should return empty string."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_user_input("")
        assert result == ""

    def test_sanitize_user_input_max_length(self):
        """Input should be truncated to max length."""
        from app.services.validation_service import ValidationService

        long_text = "a" * 2000
        result = ValidationService.sanitize_user_input(long_text, max_length=100)
        assert len(result) <= 100

    def test_sanitize_dream_text_normal(self):
        """Dream text should be sanitized."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_dream_text("I dreamed about flying")
        assert result == "I dreamed about flying"

    def test_sanitize_name_normal(self):
        """Name should be sanitized."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_name("John Doe")
        assert result == "John Doe"

    def test_validate_birth_data_valid(self):
        """Valid birth data should pass."""
        from app.services.validation_service import ValidationService

        is_valid, error = ValidationService.validate_birth_data("1990-01-15", "14:30")
        assert is_valid is True
        assert error == ""

    def test_validate_birth_data_invalid_date(self):
        """Invalid date format should fail."""
        from app.services.validation_service import ValidationService

        is_valid, error = ValidationService.validate_birth_data("invalid", "14:30")
        assert is_valid is False
        assert error != ""

    def test_is_suspicious_input_normal(self):
        """Normal input should not be suspicious."""
        from app.services.validation_service import ValidationService

        result = ValidationService.is_suspicious_input("Tell me about my career")
        assert result is False

    def test_validate_and_sanitize_general(self):
        """General input validation and sanitization."""
        from app.services.validation_service import ValidationService

        sanitized, is_suspicious = ValidationService.validate_and_sanitize(
            "Hello world", "general"
        )
        assert sanitized == "Hello world"
        assert is_suspicious is False

    def test_validate_and_sanitize_dream(self):
        """Dream input validation and sanitization."""
        from app.services.validation_service import ValidationService

        sanitized, is_suspicious = ValidationService.validate_and_sanitize(
            "I dreamed about stars", "dream"
        )
        assert sanitized == "I dreamed about stars"
        assert is_suspicious is False

    def test_validate_and_sanitize_name(self):
        """Name input validation and sanitization."""
        from app.services.validation_service import ValidationService

        sanitized, is_suspicious = ValidationService.validate_and_sanitize(
            "Jane Doe", "name"
        )
        assert sanitized == "Jane Doe"
        assert is_suspicious is False


class TestBirthDataService:
    """Tests for BirthDataService."""

    def test_normalize_birth_data_basic(self):
        """Basic birth data normalization."""
        from app.services.birth_data_service import BirthDataService

        result = BirthDataService.normalize_birth_data(
            "1990-01-15", "14:30"
        )
        assert result["birth_date"] == "1990-01-15"
        assert result["birth_time"] == "14:30"
        assert result["year"] == 1990
        assert result["month"] == 1
        assert result["day"] == 15
        assert result["hour"] == 14
        assert result["minute"] == 30

    def test_normalize_birth_data_with_coordinates(self):
        """Birth data with coordinates."""
        from app.services.birth_data_service import BirthDataService

        result = BirthDataService.normalize_birth_data(
            "1990-01-15", "14:30",
            latitude=37.5665,
            longitude=126.9780
        )
        assert result["latitude"] == 37.5665
        assert result["longitude"] == 126.9780

    def test_normalize_birth_data_with_gender_male(self):
        """Birth data with male gender."""
        from app.services.birth_data_service import BirthDataService

        result = BirthDataService.normalize_birth_data(
            "1990-01-15", "14:30",
            gender="male"
        )
        assert result["gender"] == "M"

    def test_normalize_birth_data_with_gender_female(self):
        """Birth data with female gender."""
        from app.services.birth_data_service import BirthDataService

        result = BirthDataService.normalize_birth_data(
            "1990-01-15", "14:30",
            gender="F"
        )
        assert result["gender"] == "F"

    def test_normalize_birth_data_invalid_date(self):
        """Invalid date should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.normalize_birth_data("invalid", "14:30")

    def test_normalize_birth_data_invalid_latitude(self):
        """Invalid latitude should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.normalize_birth_data(
                "1990-01-15", "14:30",
                latitude=100
            )

    def test_normalize_birth_data_invalid_longitude(self):
        """Invalid longitude should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.normalize_birth_data(
                "1990-01-15", "14:30",
                longitude=200
            )

    def test_normalize_birth_data_invalid_gender(self):
        """Invalid gender should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.normalize_birth_data(
                "1990-01-15", "14:30",
                gender="X"
            )

    def test_parse_birth_datetime(self):
        """Parse birth datetime."""
        from app.services.birth_data_service import BirthDataService

        result = BirthDataService.parse_birth_datetime("1990-01-15", "14:30")
        assert isinstance(result, datetime)
        assert result.year == 1990
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 14
        assert result.minute == 30

    def test_parse_birth_datetime_invalid(self):
        """Invalid datetime should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.parse_birth_datetime("invalid", "14:30")

    def test_validate_coordinates_valid(self):
        """Valid coordinates should pass."""
        from app.services.birth_data_service import BirthDataService

        is_valid, error = BirthDataService.validate_coordinates(37.5, 126.9)
        assert is_valid is True
        assert error == ""

    def test_validate_coordinates_null(self):
        """Null coordinates should fail."""
        from app.services.birth_data_service import BirthDataService

        is_valid, error = BirthDataService.validate_coordinates(None, None)
        assert is_valid is False
        assert "required" in error.lower()

    def test_validate_coordinates_invalid_type(self):
        """Non-numeric coordinates should fail."""
        from app.services.birth_data_service import BirthDataService

        is_valid, error = BirthDataService.validate_coordinates("abc", 126.9)
        assert is_valid is False
        assert "numbers" in error.lower()

    def test_validate_coordinates_out_of_range_lat(self):
        """Latitude out of range should fail."""
        from app.services.birth_data_service import BirthDataService

        is_valid, error = BirthDataService.validate_coordinates(100, 126.9)
        assert is_valid is False
        assert "latitude" in error.lower()

    def test_validate_coordinates_out_of_range_lon(self):
        """Longitude out of range should fail."""
        from app.services.birth_data_service import BirthDataService

        is_valid, error = BirthDataService.validate_coordinates(37.5, 200)
        assert is_valid is False
        assert "longitude" in error.lower()

    def test_extract_birth_data_from_request(self):
        """Extract birth data from request body."""
        from app.services.birth_data_service import BirthDataService

        data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30",
            "latitude": 37.5665,
            "longitude": 126.9780,
            "gender": "M",
            "city": "Seoul"
        }
        result = BirthDataService.extract_birth_data_from_request(data)
        assert result["birth_date"] == "1990-01-15"
        assert result["latitude"] == 37.5665
        assert result["gender"] == "M"
        assert result["city"] == "Seoul"

    def test_extract_birth_data_missing_required(self):
        """Missing required fields should raise ValueError."""
        from app.services.birth_data_service import BirthDataService

        with pytest.raises(ValueError):
            BirthDataService.extract_birth_data_from_request({})

    def test_format_birth_summary_basic(self):
        """Format birth summary."""
        from app.services.birth_data_service import BirthDataService

        birth_data = {
            "birth_datetime": datetime(1990, 1, 15, 14, 30),
            "city": "Seoul",
            "latitude": 37.5665,
            "longitude": 126.9780,
            "gender": "M"
        }
        result = BirthDataService.format_birth_summary(birth_data)
        assert "1990-01-15" in result
        assert "14:30" in result
        assert "Seoul" in result
        assert "Male" in result

    def test_format_birth_summary_without_datetime(self):
        """Format birth summary without datetime object."""
        from app.services.birth_data_service import BirthDataService

        birth_data = {
            "birth_date": "1990-01-15",
            "birth_time": "14:30"
        }
        result = BirthDataService.format_birth_summary(birth_data)
        assert "1990-01-15" in result
        assert "14:30" in result

    def test_convert_to_utc(self):
        """Convert local time to UTC."""
        from app.services.birth_data_service import BirthDataService

        dt = datetime(1990, 1, 15, 14, 30)
        result = BirthDataService.convert_to_utc(dt, "Asia/Seoul")
        # Result should be datetime (UTC conversion depends on pytz)
        assert isinstance(result, datetime)


class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    def test_validation_service_functions(self):
        """Test convenience functions from validation_service module."""
        from app.services.validation_service import (
            sanitize_user_input,
            sanitize_dream_text,
            sanitize_name,
            validate_birth_data,
            is_suspicious_input
        )

        assert sanitize_user_input("Hello") == "Hello"
        assert sanitize_dream_text("Dream") == "Dream"
        assert sanitize_name("John") == "John"

        is_valid, _ = validate_birth_data("1990-01-15", "14:30")
        assert is_valid is True

        assert is_suspicious_input("Normal text") is False

    def test_birth_data_service_functions(self):
        """Test convenience functions from birth_data_service module."""
        from app.services.birth_data_service import (
            normalize_birth_data,
            extract_birth_data_from_request,
            format_birth_summary
        )

        data = normalize_birth_data("1990-01-15", "14:30")
        assert data["year"] == 1990

        request_data = {"birth_date": "1990-01-15", "birth_time": "14:30"}
        extracted = extract_birth_data_from_request(request_data)
        assert extracted["birth_date"] == "1990-01-15"

        summary = format_birth_summary({"birth_date": "1990-01-15", "birth_time": "14:30"})
        assert "1990-01-15" in summary
