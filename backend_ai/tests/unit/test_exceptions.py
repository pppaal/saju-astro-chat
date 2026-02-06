"""
Unit tests for backend_ai/app/exceptions.py

Tests:
- Exception hierarchy
- Error codes
- to_dict serialization
- map_exception utility
"""
import pytest


class TestBackendAIError:
    """Tests for base BackendAIError class."""

    def test_default_message(self):
        """Default message should be empty."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError()
        assert error.message == ""
        assert str(error) == ""

    def test_custom_message(self):
        """Custom message should be stored."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError("Custom error message")
        assert error.message == "Custom error message"
        assert str(error) == "Custom error message"

    def test_default_code(self):
        """Default code should be BACKEND_ERROR."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError()
        assert error.code == "BACKEND_ERROR"

    def test_custom_code(self):
        """Custom code should be stored."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError(code="CUSTOM_CODE")
        assert error.code == "CUSTOM_CODE"

    def test_default_details(self):
        """Default details should be empty dict."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError()
        assert error.details == {}

    def test_custom_details(self):
        """Custom details should be stored."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError(details={"key": "value"})
        assert error.details == {"key": "value"}

    def test_to_dict(self):
        """to_dict should return proper structure."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError("Test error", "TEST_CODE", {"foo": "bar"})
        result = error.to_dict()

        # to_dict returns nested structure with "error" key
        assert result["success"] is False
        assert result["error"]["code"] == "TEST_CODE"
        assert result["error"]["message"] == "Test error"
        # status is included
        assert "status" in result["error"]

    def test_is_exception(self):
        """Should be a proper Exception subclass."""
        from backend_ai.app.exceptions import BackendAIError

        error = BackendAIError("Test")
        assert isinstance(error, Exception)

        # Can be raised and caught
        with pytest.raises(BackendAIError):
            raise error


class TestRAGErrors:
    """Tests for RAG-related errors."""

    def test_rag_error(self):
        """RAGError should have correct code."""
        from backend_ai.app.exceptions import RAGError

        error = RAGError()
        assert error.code == "RAG_ERROR"
        assert error.message == "RAG operation failed"

    def test_rag_query_error(self):
        """RAGQueryError should have correct code."""
        from backend_ai.app.exceptions import RAGQueryError

        error = RAGQueryError()
        assert error.code == "RAG_QUERY_ERROR"

    def test_rag_index_error(self):
        """RAGIndexError should have correct code."""
        from backend_ai.app.exceptions import RAGIndexError

        error = RAGIndexError()
        assert error.code == "RAG_INDEX_ERROR"

    def test_embedding_error(self):
        """EmbeddingError should have correct code."""
        from backend_ai.app.exceptions import EmbeddingError

        error = EmbeddingError()
        assert error.code == "EMBEDDING_ERROR"

    def test_rag_error_hierarchy(self):
        """RAG errors should inherit from RAGError."""
        from backend_ai.app.exceptions import RAGError, RAGQueryError, RAGIndexError, EmbeddingError

        assert issubclass(RAGQueryError, RAGError)
        assert issubclass(RAGIndexError, RAGError)
        assert issubclass(EmbeddingError, RAGError)


class TestLLMErrors:
    """Tests for LLM-related errors."""

    def test_llm_error(self):
        """LLMError should have correct code."""
        from backend_ai.app.exceptions import LLMError

        error = LLMError()
        assert error.code == "LLM_ERROR"

    def test_llm_rate_limit_error(self):
        """LLMRateLimitError should store retry_after."""
        from backend_ai.app.exceptions import LLMRateLimitError

        error = LLMRateLimitError(retry_after=30.0)
        assert error.code == "LLM_RATE_LIMIT"
        assert error.retry_after == 30.0
        assert error.details["retry_after"] == 30.0

    def test_llm_timeout_error(self):
        """LLMTimeoutError should have correct code."""
        from backend_ai.app.exceptions import LLMTimeoutError

        error = LLMTimeoutError()
        assert error.code == "LLM_TIMEOUT"


class TestCacheErrors:
    """Tests for cache-related errors."""

    def test_cache_error(self):
        """CacheError should have correct code."""
        from backend_ai.app.exceptions import CacheError

        error = CacheError()
        assert error.code == "CACHE_ERROR"

    def test_cache_connection_error(self):
        """CacheConnectionError should have correct code."""
        from backend_ai.app.exceptions import CacheConnectionError

        error = CacheConnectionError()
        assert error.code == "CACHE_CONNECTION_ERROR"

    def test_cache_serialization_error(self):
        """CacheSerializationError should have correct code."""
        from backend_ai.app.exceptions import CacheSerializationError

        error = CacheSerializationError()
        assert error.code == "CACHE_SERIALIZATION_ERROR"


class TestValidationErrors:
    """Tests for validation-related errors."""

    def test_validation_error(self):
        """ValidationError should have correct code."""
        from backend_ai.app.exceptions import ValidationError

        error = ValidationError()
        assert error.code == "VALIDATION_ERROR"

    def test_validation_error_with_field(self):
        """ValidationError should store field."""
        from backend_ai.app.exceptions import ValidationError

        error = ValidationError("Invalid email", field="email")
        assert error.field == "email"
        assert error.details["field"] == "email"

    def test_birth_data_validation_error(self):
        """BirthDataValidationError should have correct code."""
        from backend_ai.app.exceptions import BirthDataValidationError

        error = BirthDataValidationError()
        assert error.code == "BIRTH_DATA_VALIDATION_ERROR"

    def test_input_too_long_error(self):
        """InputTooLongError should store lengths."""
        from backend_ai.app.exceptions import InputTooLongError

        error = InputTooLongError(max_length=100, actual_length=150)
        assert error.code == "INPUT_TOO_LONG"
        assert error.details["max_length"] == 100
        assert error.details["actual_length"] == 150

    def test_suspicious_input_error(self):
        """SuspiciousInputError should have correct code."""
        from backend_ai.app.exceptions import SuspiciousInputError

        error = SuspiciousInputError()
        assert error.code == "SUSPICIOUS_INPUT"


class TestCalculationErrors:
    """Tests for calculation-related errors."""

    def test_calculation_error(self):
        """CalculationError should have correct code."""
        from backend_ai.app.exceptions import CalculationError

        error = CalculationError()
        assert error.code == "CALCULATION_ERROR"

    def test_saju_calculation_error(self):
        """SajuCalculationError should have correct code."""
        from backend_ai.app.exceptions import SajuCalculationError

        error = SajuCalculationError()
        assert error.code == "SAJU_CALCULATION_ERROR"

    def test_astrology_calculation_error(self):
        """AstrologyCalculationError should have correct code."""
        from backend_ai.app.exceptions import AstrologyCalculationError

        error = AstrologyCalculationError()
        assert error.code == "ASTROLOGY_CALCULATION_ERROR"

    def test_iching_calculation_error(self):
        """IChingCalculationError should have correct code."""
        from backend_ai.app.exceptions import IChingCalculationError

        error = IChingCalculationError()
        assert error.code == "ICHING_CALCULATION_ERROR"

    def test_numerology_calculation_error(self):
        """NumerologyCalculationError should have correct code."""
        from backend_ai.app.exceptions import NumerologyCalculationError

        error = NumerologyCalculationError()
        assert error.code == "NUMEROLOGY_CALCULATION_ERROR"


class TestServiceErrors:
    """Tests for service-related errors."""

    def test_service_error(self):
        """ServiceError should have correct code."""
        from backend_ai.app.exceptions import ServiceError

        error = ServiceError()
        assert error.code == "SERVICE_ERROR"

    def test_service_unavailable_error(self):
        """ServiceUnavailableError should store retry_after."""
        from backend_ai.app.exceptions import ServiceUnavailableError

        error = ServiceUnavailableError(retry_after=60.0)
        assert error.code == "SERVICE_UNAVAILABLE"
        assert error.retry_after == 60.0

    def test_external_api_error(self):
        """ExternalAPIError should store api_name."""
        from backend_ai.app.exceptions import ExternalAPIError

        error = ExternalAPIError(api_name="openai")
        assert error.code == "EXTERNAL_API_ERROR"
        assert error.api_name == "openai"
        assert error.details["api_name"] == "openai"


class TestConfigurationErrors:
    """Tests for configuration-related errors."""

    def test_configuration_error(self):
        """ConfigurationError should have correct code."""
        from backend_ai.app.exceptions import ConfigurationError

        error = ConfigurationError()
        assert error.code == "CONFIGURATION_ERROR"

    def test_missing_config_error(self):
        """MissingConfigError should store config_key."""
        from backend_ai.app.exceptions import MissingConfigError

        error = MissingConfigError(config_key="API_KEY")
        assert error.code == "MISSING_CONFIG"
        assert error.config_key == "API_KEY"
        assert error.details["config_key"] == "API_KEY"


class TestDataErrors:
    """Tests for data-related errors."""

    def test_data_error(self):
        """DataError should have correct code."""
        from backend_ai.app.exceptions import DataError

        error = DataError()
        assert error.code == "DATA_ERROR"

    def test_data_not_found_error(self):
        """DataNotFoundError should have correct code."""
        from backend_ai.app.exceptions import DataNotFoundError

        error = DataNotFoundError()
        assert error.code == "DATA_NOT_FOUND"

    def test_data_corrupted_error(self):
        """DataCorruptedError should have correct code."""
        from backend_ai.app.exceptions import DataCorruptedError

        error = DataCorruptedError()
        assert error.code == "DATA_CORRUPTED"


class TestRateLimitError:
    """Tests for rate limit error."""

    def test_rate_limit_error(self):
        """RateLimitError should store retry_after."""
        from backend_ai.app.exceptions import RateLimitError

        error = RateLimitError(retry_after=30.0)
        assert error.code == "RATE_LIMIT_ERROR"
        assert error.retry_after == 30.0


class TestAuthErrors:
    """Tests for authentication-related errors."""

    def test_auth_error(self):
        """AuthError should have correct code."""
        from backend_ai.app.exceptions import AuthError

        error = AuthError()
        assert error.code == "AUTH_ERROR"

    def test_unauthorized_error(self):
        """UnauthorizedError should have correct code."""
        from backend_ai.app.exceptions import UnauthorizedError

        error = UnauthorizedError()
        assert error.code == "UNAUTHORIZED"


class TestMapException:
    """Tests for map_exception utility."""

    def test_connection_error(self):
        """Connection errors should map to CacheConnectionError."""
        from backend_ai.app.exceptions import map_exception, CacheConnectionError

        class ConnectionError(Exception):
            pass

        result = map_exception(ConnectionError("test"))
        assert isinstance(result, CacheConnectionError)

    def test_timeout_error(self):
        """Timeout errors should map to LLMTimeoutError."""
        from backend_ai.app.exceptions import map_exception, LLMTimeoutError

        class TimeoutError(Exception):
            pass

        result = map_exception(TimeoutError("test"))
        assert isinstance(result, LLMTimeoutError)

    def test_json_error(self):
        """JSON errors should map to CacheSerializationError."""
        from backend_ai.app.exceptions import map_exception, CacheSerializationError

        class JSONDecodeError(Exception):
            pass

        result = map_exception(JSONDecodeError("test"))
        assert isinstance(result, CacheSerializationError)

    def test_validation_error(self):
        """Validation errors should map to ValidationError."""
        from backend_ai.app.exceptions import map_exception, ValidationError

        class InvalidDataError(Exception):
            pass

        result = map_exception(InvalidDataError("test"))
        assert isinstance(result, ValidationError)

    def test_generic_error(self):
        """Generic errors should map to BackendAIError."""
        from backend_ai.app.exceptions import map_exception, BackendAIError

        class SomeRandomError(Exception):
            pass

        result = map_exception(SomeRandomError("test"))
        assert isinstance(result, BackendAIError)
        assert result.message == "test"


class TestExceptionHierarchy:
    """Tests for exception class hierarchy."""

    def test_all_errors_inherit_from_base(self):
        """All custom errors should inherit from BackendAIError."""
        from backend_ai.app.exceptions import (
            BackendAIError, RAGError, LLMError, CacheError,
            ValidationError, CalculationError, ServiceError,
            ConfigurationError, DataError, RateLimitError, AuthError
        )

        error_classes = [
            RAGError, LLMError, CacheError, ValidationError,
            CalculationError, ServiceError, ConfigurationError,
            DataError, RateLimitError, AuthError
        ]

        for cls in error_classes:
            assert issubclass(cls, BackendAIError), f"{cls.__name__} should inherit from BackendAIError"

    def test_can_catch_all_with_base(self):
        """All errors should be catchable with BackendAIError."""
        from backend_ai.app.exceptions import BackendAIError, RAGError, LLMError

        with pytest.raises(BackendAIError):
            raise RAGError("test")

        with pytest.raises(BackendAIError):
            raise LLMError("test")


class TestModuleExports:
    """Tests for module exports."""

    def test_all_errors_importable(self):
        """All error classes should be importable."""
        from backend_ai.app.exceptions import (
            BackendAIError,
            RAGError, RAGQueryError, RAGIndexError, EmbeddingError,
            LLMError, LLMRateLimitError, LLMTimeoutError,
            CacheError, CacheConnectionError, CacheSerializationError,
            ValidationError, BirthDataValidationError, InputTooLongError, SuspiciousInputError,
            CalculationError, SajuCalculationError, AstrologyCalculationError,
            IChingCalculationError, NumerologyCalculationError,
            ServiceError, ServiceUnavailableError, ExternalAPIError,
            ConfigurationError, MissingConfigError,
            DataError, DataNotFoundError, DataCorruptedError,
            RateLimitError, AuthError, UnauthorizedError,
            map_exception
        )

        # All should be classes or functions
        assert callable(map_exception)
        assert issubclass(BackendAIError, Exception)

