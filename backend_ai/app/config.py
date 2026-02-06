"""
Backend AI Configuration Management
====================================
Centralized configuration with validation for all backend_ai settings.
Replaces scattered os.getenv() calls with a single source of truth.

Usage:
    from backend_ai.app.config import get_config, Config

    config = get_config()
    if config.RAG_DISABLED:
        print("RAG is disabled")

    # Access specific settings
    api_key = config.OPENAI_API_KEY
    cache_ttl = config.CACHE_TTL
"""

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Set
from functools import lru_cache

from dotenv import load_dotenv

logger = logging.getLogger("backend_ai")

# Load environment variables from backend_ai/.env
_backend_root = Path(__file__).parent.parent
_env_file = _backend_root / ".env"
if _env_file.exists():
    load_dotenv(_env_file, override=True)


def _bool_env(key: str, default: bool = False) -> bool:
    """Parse boolean environment variable."""
    val = os.getenv(key, "").lower()
    if val in ("1", "true", "yes", "on"):
        return True
    if val in ("0", "false", "no", "off"):
        return False
    return default


def _int_env(key: str, default: int) -> int:
    """Parse integer environment variable."""
    try:
        return int(os.getenv(key, str(default)))
    except (TypeError, ValueError):
        return default


def _float_env(key: str, default: float) -> float:
    """Parse float environment variable."""
    try:
        return float(os.getenv(key, str(default)))
    except (TypeError, ValueError):
        return default


def _list_env(key: str, default: List[str] = None, separator: str = ",") -> List[str]:
    """Parse list environment variable."""
    val = os.getenv(key, "")
    if not val:
        return default or []
    return [item.strip() for item in val.split(separator) if item.strip()]


@dataclass
class Config:
    """
    Backend AI Configuration.

    All settings are loaded from environment variables with sensible defaults.
    Required settings are validated on startup.
    """

    # ===========================================================================
    # Environment & Debug
    # ===========================================================================
    ENVIRONMENT: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    DEBUG: bool = field(default_factory=lambda: _bool_env("DEBUG", False))

    # ===========================================================================
    # API Keys (Required for full functionality)
    # ===========================================================================
    OPENAI_API_KEY: Optional[str] = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    TOGETHER_API_KEY: Optional[str] = field(default_factory=lambda: os.getenv("TOGETHER_API_KEY"))
    ANTHROPIC_API_KEY: Optional[str] = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))

    # ===========================================================================
    # Feature Flags
    # ===========================================================================
    RAG_DISABLED: bool = field(default_factory=lambda: _bool_env("RAG_DISABLE", False))
    PREDICTION_DISABLED: bool = field(default_factory=lambda: _bool_env("PREDICTION_DISABLE", False))
    USE_CHROMADB: bool = field(default_factory=lambda: _bool_env("USE_CHROMADB", False))
    WARMUP_ON_START: bool = field(default_factory=lambda: _bool_env("WARMUP_ON_START", False))
    WARMUP_OPTIMIZED: bool = field(default_factory=lambda: _bool_env("WARMUP_OPTIMIZED", False))

    # ===========================================================================
    # Cache Settings
    # ===========================================================================
    REDIS_URL: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    CACHE_TTL: int = field(default_factory=lambda: _int_env("CACHE_TTL", 86400))  # 24 hours
    CACHE_MAX_SIZE: int = field(default_factory=lambda: _int_env("CACHE_MAX_SIZE", 1000))

    # ===========================================================================
    # Rate Limiting
    # ===========================================================================
    RATE_LIMIT_REQUESTS: int = field(default_factory=lambda: _int_env("RATE_LIMIT_REQUESTS", 60))
    RATE_LIMIT_WINDOW: int = field(default_factory=lambda: _int_env("RATE_LIMIT_WINDOW", 60))  # seconds

    # ===========================================================================
    # Security
    # ===========================================================================
    ADMIN_API_TOKEN: Optional[str] = field(default_factory=lambda: os.getenv("ADMIN_API_TOKEN"))
    MAX_REQUEST_SIZE: int = field(default_factory=lambda: _int_env("MAX_REQUEST_SIZE", 5 * 1024 * 1024))  # 5MB
    MAX_DREAM_TEXT_LENGTH: int = field(default_factory=lambda: _int_env("MAX_DREAM_TEXT_LENGTH", 2000))

    # ===========================================================================
    # CORS
    # ===========================================================================
    CORS_ALLOWED_ORIGINS: List[str] = field(default_factory=lambda: _list_env(
        "CORS_ALLOWED_ORIGINS",
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://destinypal.com",
            "https://www.destinypal.com",
        ]
    ))

    # ===========================================================================
    # Paths
    # ===========================================================================
    DATA_DIR: Path = field(default_factory=lambda: Path(__file__).parent.parent / "data")
    LOG_DIR: Path = field(default_factory=lambda: Path(__file__).parent.parent / "logs")
    MODEL_CACHE_DIR: Path = field(default_factory=lambda: Path(os.getenv(
        "MODEL_CACHE_DIR",
        str(Path.home() / ".cache" / "backend_ai" / "models")
    )))

    # ===========================================================================
    # LLM Settings
    # ===========================================================================
    DEFAULT_MODEL: str = field(default_factory=lambda: os.getenv("DEFAULT_MODEL", "gpt-4o-mini"))
    DEFAULT_TEMPERATURE: float = field(default_factory=lambda: _float_env("DEFAULT_TEMPERATURE", 0.7))
    MAX_TOKENS: int = field(default_factory=lambda: _int_env("MAX_TOKENS", 4096))
    LLM_TIMEOUT: float = field(default_factory=lambda: _float_env("LLM_TIMEOUT", 60.0))

    # ===========================================================================
    # Monitoring
    # ===========================================================================
    SENTRY_DSN: Optional[str] = field(default_factory=lambda: os.getenv("SENTRY_DSN"))

    # ===========================================================================
    # Server
    # ===========================================================================
    PORT: int = field(default_factory=lambda: _int_env("PORT", 5000))
    HOST: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))

    def __post_init__(self):
        """Validate configuration after initialization."""
        self._validation_errors: List[str] = []
        self._validation_warnings: List[str] = []
        self._validate()

    def _validate(self) -> None:
        """Validate all configuration settings."""
        # Required settings for production
        if self.ENVIRONMENT == "production":
            if not self.OPENAI_API_KEY:
                self._validation_errors.append("OPENAI_API_KEY is required in production")
            if not self.ADMIN_API_TOKEN:
                self._validation_warnings.append("ADMIN_API_TOKEN not set - API is unprotected")
            if not self.SENTRY_DSN:
                self._validation_warnings.append("SENTRY_DSN not set - error tracking disabled")

        # Warnings for missing optional keys
        if not self.OPENAI_API_KEY:
            self._validation_warnings.append("OPENAI_API_KEY not set - LLM features will be limited")
        if not self.TOGETHER_API_KEY:
            self._validation_warnings.append("TOGETHER_API_KEY not set - some features may be limited")

        # Validate paths exist
        if not self.DATA_DIR.exists():
            self._validation_warnings.append(f"DATA_DIR does not exist: {self.DATA_DIR}")

        # Validate numeric ranges
        if self.CACHE_TTL < 0:
            self._validation_errors.append("CACHE_TTL must be non-negative")
        if self.RATE_LIMIT_REQUESTS < 1:
            self._validation_errors.append("RATE_LIMIT_REQUESTS must be at least 1")
        if self.MAX_REQUEST_SIZE < 1024:
            self._validation_errors.append("MAX_REQUEST_SIZE must be at least 1KB")

    def validate_required(self, strict: bool = False) -> bool:
        """
        Check if configuration is valid.

        Args:
            strict: If True, raise ConfigurationError on errors

        Returns:
            True if valid, False otherwise (or raises if strict)

        Raises:
            ConfigurationError: If strict=True and validation fails
        """
        from backend_ai.app.exceptions import ConfigurationError

        # Log warnings
        for warning in self._validation_warnings:
            logger.warning(f"[CONFIG] {warning}")

        # Handle errors
        if self._validation_errors:
            for error in self._validation_errors:
                logger.error(f"[CONFIG] {error}")

            if strict:
                raise ConfigurationError(
                    f"Configuration validation failed: {'; '.join(self._validation_errors)}",
                    details={"errors": self._validation_errors}
                )
            return False

        return True

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT.lower() in ("development", "dev", "local")

    def get_api_key(self, provider: str) -> Optional[str]:
        """Get API key for a specific provider."""
        key_map = {
            "openai": self.OPENAI_API_KEY,
            "together": self.TOGETHER_API_KEY,
            "anthropic": self.ANTHROPIC_API_KEY,
        }
        return key_map.get(provider.lower())

    def to_dict(self, include_secrets: bool = False) -> dict:
        """
        Convert config to dictionary.

        Args:
            include_secrets: If True, include API keys (use with caution)

        Returns:
            Dictionary of configuration values
        """
        secret_keys = {"OPENAI_API_KEY", "TOGETHER_API_KEY", "ANTHROPIC_API_KEY", "ADMIN_API_TOKEN"}
        result = {}

        for key, value in self.__dict__.items():
            if key.startswith("_"):
                continue
            if key in secret_keys and not include_secrets:
                result[key] = "***" if value else None
            elif isinstance(value, Path):
                result[key] = str(value)
            else:
                result[key] = value

        return result


# ==============================================================================
# Singleton Pattern
# ==============================================================================

_config_instance: Optional[Config] = None


@lru_cache(maxsize=1)
def get_config() -> Config:
    """
    Get the singleton configuration instance.

    Returns:
        Config instance with all settings loaded from environment

    Example:
        config = get_config()
        if config.is_production:
            config.validate_required(strict=True)
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
        _config_instance.validate_required(strict=False)
    return _config_instance


def reset_config() -> None:
    """
    Reset the configuration singleton.
    Useful for testing or reloading configuration.
    """
    global _config_instance
    _config_instance = None
    get_config.cache_clear()


# ==============================================================================
# Startup Validation
# ==============================================================================

def validate_startup_config() -> None:
    """
    Validate configuration at application startup.
    Call this from app.py before starting the server.

    Raises:
        ConfigurationError: If critical configuration is missing in production
    """
    config = get_config()

    # Always validate in production
    if config.is_production:
        config.validate_required(strict=True)
    else:
        config.validate_required(strict=False)

    logger.info(f"[CONFIG] Environment: {config.ENVIRONMENT}")
    logger.info(f"[CONFIG] RAG disabled: {config.RAG_DISABLED}")
    logger.info(f"[CONFIG] OpenAI available: {bool(config.OPENAI_API_KEY)}")
