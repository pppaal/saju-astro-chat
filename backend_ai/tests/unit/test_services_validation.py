"""
Unit tests for Services Validation module.

Tests:
- ValidationService class
- sanitize_user_input method
- sanitize_dream_text method
- sanitize_name method
"""
import pytest
from unittest.mock import patch


class TestValidationServiceClass:
    """Tests for ValidationService class."""

    def test_validation_service_exists(self):
        """ValidationService class should exist."""
        from app.services.validation_service import ValidationService

        assert ValidationService is not None


class TestSanitizeUserInput:
    """Tests for sanitize_user_input method."""

    def test_sanitize_user_input_method_exists(self):
        """sanitize_user_input method should exist."""
        from app.services.validation_service import ValidationService

        assert hasattr(ValidationService, 'sanitize_user_input')
        assert callable(ValidationService.sanitize_user_input)

    def test_sanitize_user_input_returns_string(self):
        """sanitize_user_input should return a string."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_user_input("Hello world")

        assert isinstance(result, str)

    def test_sanitize_user_input_normal_text(self):
        """sanitize_user_input should preserve normal text."""
        from app.services.validation_service import ValidationService

        text = "Tell me about my fortune"
        result = ValidationService.sanitize_user_input(text)

        assert "fortune" in result or result == text


class TestSanitizeDreamText:
    """Tests for sanitize_dream_text method."""

    def test_sanitize_dream_text_method_exists(self):
        """sanitize_dream_text method should exist."""
        from app.services.validation_service import ValidationService

        assert hasattr(ValidationService, 'sanitize_dream_text')
        assert callable(ValidationService.sanitize_dream_text)

    def test_sanitize_dream_text_returns_string(self):
        """sanitize_dream_text should return a string."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_dream_text("I had a dream about flying")

        assert isinstance(result, str)


class TestSanitizeName:
    """Tests for sanitize_name method."""

    def test_sanitize_name_method_exists(self):
        """sanitize_name method should exist."""
        from app.services.validation_service import ValidationService

        assert hasattr(ValidationService, 'sanitize_name')
        assert callable(ValidationService.sanitize_name)

    def test_sanitize_name_returns_string(self):
        """sanitize_name should return a string."""
        from app.services.validation_service import ValidationService

        result = ValidationService.sanitize_name("홍길동")

        assert isinstance(result, str)


class TestValidateBirthData:
    """Tests for validate_birth_data method."""

    def test_validate_birth_data_method_exists(self):
        """validate_birth_data method should exist."""
        from app.services.validation_service import ValidationService

        assert hasattr(ValidationService, 'validate_birth_data')
        assert callable(ValidationService.validate_birth_data)


class TestIsSuspiciousInput:
    """Tests for is_suspicious_input method."""

    def test_is_suspicious_input_method_exists(self):
        """is_suspicious_input method should exist."""
        from app.services.validation_service import ValidationService

        assert hasattr(ValidationService, 'is_suspicious_input')
        assert callable(ValidationService.is_suspicious_input)

    def test_is_suspicious_input_returns_bool(self):
        """is_suspicious_input should return a boolean."""
        from app.services.validation_service import ValidationService

        result = ValidationService.is_suspicious_input("normal text")

        assert isinstance(result, bool)


class TestModuleExports:
    """Tests for module exports."""

    def test_validation_service_importable(self):
        """ValidationService should be importable."""
        from app.services.validation_service import ValidationService
        assert ValidationService is not None
