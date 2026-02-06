"""
Backend AI Custom Exception Hierarchy
======================================
Centralized exception definitions for better error handling and debugging.
Replace bare `except Exception` blocks with specific exceptions.

Usage:
    from backend_ai.app.exceptions import RAGError, CacheError, ValidationError

    try:
        result = rag.query(data)
    except RAGError as e:
        logger.warning(f"RAG query failed: {e}")
        return default_value
"""


class BackendAIError(Exception):
    """Base exception for all backend_ai errors."""

    # HTTP status code mapping for each error code (aligned with frontend ErrorCodes)
    STATUS_CODES = {
        "BAD_REQUEST": 400,
        "UNAUTHORIZED": 401,
        "FORBIDDEN": 403,
        "NOT_FOUND": 404,
        "RATE_LIMITED": 429,
        "VALIDATION_ERROR": 422,
        "PAYLOAD_TOO_LARGE": 413,
        "INTERNAL_ERROR": 500,
        "SERVICE_UNAVAILABLE": 503,
        "BACKEND_ERROR": 502,
        "TIMEOUT": 504,
        "DATABASE_ERROR": 500,
        "EXTERNAL_API_ERROR": 502,
        "INVALID_TOKEN": 401,
        "TOKEN_EXPIRED": 401,
        "INSUFFICIENT_CREDITS": 402,
        "INVALID_DATE": 400,
        "INVALID_TIME": 400,
        "INVALID_COORDINATES": 400,
        "INVALID_FORMAT": 400,
        "MISSING_FIELD": 400,
        # Backend-specific codes
        "RAG_ERROR": 500,
        "RAG_QUERY_ERROR": 500,
        "RAG_INDEX_ERROR": 500,
        "EMBEDDING_ERROR": 500,
        "LLM_ERROR": 502,
        "LLM_RATE_LIMIT": 429,
        "LLM_TIMEOUT": 504,
        "CACHE_ERROR": 500,
        "CACHE_CONNECTION_ERROR": 503,
        "CACHE_SERIALIZATION_ERROR": 500,
        "BIRTH_DATA_VALIDATION_ERROR": 422,
        "INPUT_TOO_LONG": 413,
        "SUSPICIOUS_INPUT": 400,
        "CALCULATION_ERROR": 500,
        "SAJU_CALCULATION_ERROR": 500,
        "ASTROLOGY_CALCULATION_ERROR": 500,
        "ICHING_CALCULATION_ERROR": 500,
        "NUMEROLOGY_CALCULATION_ERROR": 500,
        "SERVICE_ERROR": 500,
        "CONFIGURATION_ERROR": 500,
        "MISSING_CONFIG": 500,
        "DATA_ERROR": 500,
        "DATA_NOT_FOUND": 404,
        "DATA_CORRUPTED": 500,
        "RATE_LIMIT_ERROR": 429,
        "AUTH_ERROR": 401,
    }

    def __init__(self, message: str = "", code: str = "BACKEND_ERROR", details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

    @property
    def status_code(self) -> int:
        """Get HTTP status code for this error."""
        return self.STATUS_CODES.get(self.code, 500)

    def to_dict(self) -> dict:
        """
        Convert exception to dict for JSON response.
        Format aligned with frontend createErrorResponse():
        {
            "success": false,
            "error": {
                "code": "ERROR_CODE",
                "message": "User-friendly message",
                "status": 400
            }
        }
        """
        response = {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "status": self.status_code,
            },
        }
        # Include details only in development (similar to frontend behavior)
        import os
        if os.getenv("FLASK_ENV") == "development" and self.details:
            response["error"]["details"] = self.details
        return response

    def to_legacy_dict(self) -> dict:
        """Legacy format for backwards compatibility."""
        return {
            "error": self.code,
            "message": self.message,
            "details": self.details,
        }


# ==============================================================================
# RAG & AI Errors
# ==============================================================================

class RAGError(BackendAIError):
    """Error in RAG (Retrieval-Augmented Generation) operations."""

    def __init__(self, message: str = "RAG operation failed", details: dict = None):
        super().__init__(message, "RAG_ERROR", details)


class RAGQueryError(RAGError):
    """Error executing RAG query."""

    def __init__(self, message: str = "RAG query failed", details: dict = None):
        super().__init__(message, details)
        self.code = "RAG_QUERY_ERROR"


class RAGIndexError(RAGError):
    """Error with RAG index (missing, corrupted, etc.)."""

    def __init__(self, message: str = "RAG index error", details: dict = None):
        super().__init__(message, details)
        self.code = "RAG_INDEX_ERROR"


class EmbeddingError(RAGError):
    """Error generating embeddings."""

    def __init__(self, message: str = "Embedding generation failed", details: dict = None):
        super().__init__(message, details)
        self.code = "EMBEDDING_ERROR"


class LLMError(BackendAIError):
    """Error in LLM (Language Model) operations."""

    def __init__(self, message: str = "LLM operation failed", details: dict = None):
        super().__init__(message, "LLM_ERROR", details)


class LLMRateLimitError(LLMError):
    """LLM rate limit exceeded."""

    def __init__(self, message: str = "LLM rate limit exceeded", retry_after: float = None, details: dict = None):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, details)
        self.code = "LLM_RATE_LIMIT"
        self.retry_after = retry_after


class LLMTimeoutError(LLMError):
    """LLM request timed out."""

    def __init__(self, message: str = "LLM request timed out", details: dict = None):
        super().__init__(message, details)
        self.code = "LLM_TIMEOUT"


# ==============================================================================
# Cache Errors
# ==============================================================================

class CacheError(BackendAIError):
    """Error in cache operations."""

    def __init__(self, message: str = "Cache operation failed", details: dict = None):
        super().__init__(message, "CACHE_ERROR", details)


class CacheConnectionError(CacheError):
    """Cache connection failed (e.g., Redis unavailable)."""

    def __init__(self, message: str = "Cache connection failed", details: dict = None):
        super().__init__(message, details)
        self.code = "CACHE_CONNECTION_ERROR"


class CacheSerializationError(CacheError):
    """Error serializing/deserializing cache data."""

    def __init__(self, message: str = "Cache serialization failed", details: dict = None):
        super().__init__(message, details)
        self.code = "CACHE_SERIALIZATION_ERROR"


# ==============================================================================
# Validation Errors
# ==============================================================================

class ValidationError(BackendAIError):
    """Input validation failed."""

    def __init__(self, message: str = "Validation failed", field: str = None, details: dict = None):
        details = details or {}
        if field:
            details["field"] = field
        super().__init__(message, "VALIDATION_ERROR", details)
        self.field = field


class BirthDataValidationError(ValidationError):
    """Birth data validation failed."""

    def __init__(self, message: str = "Invalid birth data", field: str = None, details: dict = None):
        super().__init__(message, field, details)
        self.code = "BIRTH_DATA_VALIDATION_ERROR"


class InputTooLongError(ValidationError):
    """Input exceeds maximum length."""

    def __init__(self, message: str = "Input too long", max_length: int = None, actual_length: int = None, details: dict = None):
        details = details or {}
        if max_length:
            details["max_length"] = max_length
        if actual_length:
            details["actual_length"] = actual_length
        super().__init__(message, details=details)
        self.code = "INPUT_TOO_LONG"


class SuspiciousInputError(ValidationError):
    """Input contains suspicious content (potential injection)."""

    def __init__(self, message: str = "Suspicious input detected", details: dict = None):
        super().__init__(message, details=details)
        self.code = "SUSPICIOUS_INPUT"


# ==============================================================================
# Calculation Errors
# ==============================================================================

class CalculationError(BackendAIError):
    """Error in astrological/saju calculations."""

    def __init__(self, message: str = "Calculation failed", details: dict = None):
        super().__init__(message, "CALCULATION_ERROR", details)


class SajuCalculationError(CalculationError):
    """Error in Saju (Four Pillars) calculation."""

    def __init__(self, message: str = "Saju calculation failed", details: dict = None):
        super().__init__(message, details)
        self.code = "SAJU_CALCULATION_ERROR"


class AstrologyCalculationError(CalculationError):
    """Error in Western astrology calculation."""

    def __init__(self, message: str = "Astrology calculation failed", details: dict = None):
        super().__init__(message, details)
        self.code = "ASTROLOGY_CALCULATION_ERROR"


class IChingCalculationError(CalculationError):
    """Error in I-Ching hexagram calculation."""

    def __init__(self, message: str = "I-Ching calculation failed", details: dict = None):
        super().__init__(message, details)
        self.code = "ICHING_CALCULATION_ERROR"


class NumerologyCalculationError(CalculationError):
    """Error in numerology calculation."""

    def __init__(self, message: str = "Numerology calculation failed", details: dict = None):
        super().__init__(message, details)
        self.code = "NUMEROLOGY_CALCULATION_ERROR"


# ==============================================================================
# Service Errors
# ==============================================================================

class ServiceError(BackendAIError):
    """Error in service layer operations."""

    def __init__(self, message: str = "Service operation failed", details: dict = None):
        super().__init__(message, "SERVICE_ERROR", details)


class ServiceUnavailableError(ServiceError):
    """Service is temporarily unavailable."""

    def __init__(self, message: str = "Service unavailable", retry_after: float = None, details: dict = None):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, details)
        self.code = "SERVICE_UNAVAILABLE"
        self.retry_after = retry_after


class ExternalAPIError(ServiceError):
    """Error from external API (OpenAI, etc.)."""

    def __init__(self, message: str = "External API error", api_name: str = None, details: dict = None):
        details = details or {}
        if api_name:
            details["api_name"] = api_name
        super().__init__(message, details)
        self.code = "EXTERNAL_API_ERROR"
        self.api_name = api_name


# ==============================================================================
# Configuration Errors
# ==============================================================================

class ConfigurationError(BackendAIError):
    """Error in configuration."""

    def __init__(self, message: str = "Configuration error", details: dict = None):
        super().__init__(message, "CONFIGURATION_ERROR", details)


class MissingConfigError(ConfigurationError):
    """Required configuration is missing."""

    def __init__(self, message: str = "Missing configuration", config_key: str = None, details: dict = None):
        details = details or {}
        if config_key:
            details["config_key"] = config_key
        super().__init__(message, details)
        self.code = "MISSING_CONFIG"
        self.config_key = config_key


# ==============================================================================
# Data Errors
# ==============================================================================

class DataError(BackendAIError):
    """Error with data operations."""

    def __init__(self, message: str = "Data error", details: dict = None):
        super().__init__(message, "DATA_ERROR", details)


class DataNotFoundError(DataError):
    """Requested data not found."""

    def __init__(self, message: str = "Data not found", details: dict = None):
        super().__init__(message, details)
        self.code = "DATA_NOT_FOUND"


class DataCorruptedError(DataError):
    """Data is corrupted or invalid format."""

    def __init__(self, message: str = "Data corrupted", details: dict = None):
        super().__init__(message, details)
        self.code = "DATA_CORRUPTED"


# ==============================================================================
# Rate Limiting Errors
# ==============================================================================

class RateLimitError(BackendAIError):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: float = None, details: dict = None):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, "RATE_LIMIT_ERROR", details)
        self.retry_after = retry_after


# ==============================================================================
# Authentication/Authorization Errors
# ==============================================================================

class AuthError(BackendAIError):
    """Authentication or authorization error."""

    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, "AUTH_ERROR", details)


class UnauthorizedError(AuthError):
    """Unauthorized access."""

    def __init__(self, message: str = "Unauthorized", details: dict = None):
        super().__init__(message, details)
        self.code = "UNAUTHORIZED"


# ==============================================================================
# Utility for Error Mapping
# ==============================================================================

def map_exception(e: Exception) -> BackendAIError:
    """
    Map generic exceptions to specific BackendAIError subclasses.

    Args:
        e: Original exception

    Returns:
        Appropriate BackendAIError subclass
    """
    error_name = type(e).__name__.lower()

    # Network/Connection errors
    if "connection" in error_name or "network" in error_name:
        return CacheConnectionError(str(e))

    # Timeout errors
    if "timeout" in error_name:
        return LLMTimeoutError(str(e))

    # JSON errors
    if "json" in error_name or "decode" in error_name:
        return CacheSerializationError(str(e))

    # Validation errors
    if "validation" in error_name or "invalid" in error_name:
        return ValidationError(str(e))

    # Default: wrap in base error
    return BackendAIError(str(e))
