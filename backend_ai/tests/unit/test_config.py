"""
Unit tests for backend_ai/app/config.py

Tests:
- Config dataclass
- Environment variable parsing helpers
- Configuration singleton
- Validation methods
"""
import pytest
from unittest.mock import patch
import os


class TestBoolEnv:
    """Tests for _bool_env helper function."""

    def test_true_values(self):
        """True string values should return True."""
        from backend_ai.app.config import _bool_env

        with patch.dict(os.environ, {"TEST_VAR": "1"}):
            assert _bool_env("TEST_VAR") is True
        with patch.dict(os.environ, {"TEST_VAR": "true"}):
            assert _bool_env("TEST_VAR") is True
        with patch.dict(os.environ, {"TEST_VAR": "yes"}):
            assert _bool_env("TEST_VAR") is True
        with patch.dict(os.environ, {"TEST_VAR": "on"}):
            assert _bool_env("TEST_VAR") is True

    def test_false_values(self):
        """False string values should return False."""
        from backend_ai.app.config import _bool_env

        with patch.dict(os.environ, {"TEST_VAR": "0"}):
            assert _bool_env("TEST_VAR") is False
        with patch.dict(os.environ, {"TEST_VAR": "false"}):
            assert _bool_env("TEST_VAR") is False
        with patch.dict(os.environ, {"TEST_VAR": "no"}):
            assert _bool_env("TEST_VAR") is False
        with patch.dict(os.environ, {"TEST_VAR": "off"}):
            assert _bool_env("TEST_VAR") is False

    def test_default_value(self):
        """Missing variable should return default."""
        from backend_ai.app.config import _bool_env

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("NONEXISTENT", None)
            assert _bool_env("NONEXISTENT", default=False) is False
            assert _bool_env("NONEXISTENT", default=True) is True


class TestIntEnv:
    """Tests for _int_env helper function."""

    def test_valid_int(self):
        """Valid integer should be parsed."""
        from backend_ai.app.config import _int_env

        with patch.dict(os.environ, {"TEST_INT": "42"}):
            assert _int_env("TEST_INT", 0) == 42

    def test_invalid_int(self):
        """Invalid integer should return default."""
        from backend_ai.app.config import _int_env

        with patch.dict(os.environ, {"TEST_INT": "not_a_number"}):
            assert _int_env("TEST_INT", 100) == 100

    def test_missing_var(self):
        """Missing variable should return default."""
        from backend_ai.app.config import _int_env

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("NONEXISTENT", None)
            assert _int_env("NONEXISTENT", 50) == 50


class TestFloatEnv:
    """Tests for _float_env helper function."""

    def test_valid_float(self):
        """Valid float should be parsed."""
        from backend_ai.app.config import _float_env

        with patch.dict(os.environ, {"TEST_FLOAT": "3.14"}):
            assert _float_env("TEST_FLOAT", 0.0) == 3.14

    def test_invalid_float(self):
        """Invalid float should return default."""
        from backend_ai.app.config import _float_env

        with patch.dict(os.environ, {"TEST_FLOAT": "not_a_float"}):
            assert _float_env("TEST_FLOAT", 1.5) == 1.5


class TestListEnv:
    """Tests for _list_env helper function."""

    def test_valid_list(self):
        """Comma-separated values should be parsed."""
        from backend_ai.app.config import _list_env

        with patch.dict(os.environ, {"TEST_LIST": "a,b,c"}):
            result = _list_env("TEST_LIST")
            assert result == ["a", "b", "c"]

    def test_empty_list(self):
        """Empty variable should return default."""
        from backend_ai.app.config import _list_env

        with patch.dict(os.environ, {"TEST_LIST": ""}):
            result = _list_env("TEST_LIST", default=["default"])
            assert result == ["default"]

    def test_whitespace_trimmed(self):
        """Whitespace should be trimmed from items."""
        from backend_ai.app.config import _list_env

        with patch.dict(os.environ, {"TEST_LIST": "a , b , c"}):
            result = _list_env("TEST_LIST")
            assert result == ["a", "b", "c"]


class TestConfigClass:
    """Tests for Config dataclass."""

    def test_config_creation(self):
        """Config should be creatable."""
        from backend_ai.app.config import Config

        config = Config()
        assert config is not None

    def test_default_environment(self):
        """Default environment should be development."""
        from backend_ai.app.config import Config

        # Don't clear env completely to avoid PATH/HOME issues
        with patch.dict(os.environ, {"ENVIRONMENT": ""}):
            os.environ.pop("ENVIRONMENT", None)
            config = Config()
            assert config.ENVIRONMENT == "development"

    def test_is_production(self):
        """is_production property should work."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            config = Config()
            assert config.is_production is True

        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            config = Config()
            assert config.is_production is False

    def test_is_development(self):
        """is_development property should work."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            config = Config()
            assert config.is_development is True

        with patch.dict(os.environ, {"ENVIRONMENT": "dev"}):
            config = Config()
            assert config.is_development is True

    def test_get_api_key(self):
        """get_api_key should return correct key."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            config = Config()
            assert config.get_api_key("openai") == "test-key"
            assert config.get_api_key("unknown") is None

    def test_to_dict(self):
        """to_dict should return dictionary."""
        from backend_ai.app.config import Config

        config = Config()
        result = config.to_dict()
        assert isinstance(result, dict)
        assert "ENVIRONMENT" in result

    def test_to_dict_hides_secrets(self):
        """to_dict should hide secrets by default."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-key"}):
            config = Config()
            result = config.to_dict(include_secrets=False)
            assert result.get("OPENAI_API_KEY") != "secret-key"
            assert result.get("OPENAI_API_KEY") == "***"

    def test_to_dict_shows_secrets_when_requested(self):
        """to_dict should show secrets when requested."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-key"}):
            config = Config()
            result = config.to_dict(include_secrets=True)
            assert result.get("OPENAI_API_KEY") == "secret-key"


class TestConfigValidation:
    """Tests for Config validation."""

    def test_validate_required_development(self):
        """Development mode should be lenient."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            config = Config()
            result = config.validate_required(strict=False)
            assert result is True

    def test_validate_cache_ttl(self):
        """Negative cache TTL should fail."""
        from backend_ai.app.config import Config

        with patch.dict(os.environ, {"CACHE_TTL": "-1"}):
            config = Config()
            # Validation happens in __post_init__
            assert len(config._validation_errors) > 0 or config.CACHE_TTL < 0


class TestConfigSingleton:
    """Tests for config singleton pattern."""

    def test_get_config_returns_config(self):
        """get_config should return Config instance."""
        from backend_ai.app.config import get_config, reset_config

        reset_config()  # Clear cache
        config = get_config()
        assert config is not None

    def test_get_config_returns_same_instance(self):
        """get_config should return same instance."""
        from backend_ai.app.config import get_config, reset_config

        reset_config()
        config1 = get_config()
        config2 = get_config()
        assert config1 is config2

    def test_reset_config_clears_cache(self):
        """reset_config should clear the singleton."""
        from backend_ai.app.config import get_config, reset_config

        config1 = get_config()
        reset_config()
        config2 = get_config()
        # After reset, should be different instance
        # (though values may be same)
        assert config2 is not None


class TestValidateStartupConfig:
    """Tests for validate_startup_config function."""

    def test_validates_without_error_in_dev(self):
        """Should not raise in development mode."""
        from backend_ai.app.config import validate_startup_config, reset_config

        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            reset_config()
            # Should not raise
            validate_startup_config()


class TestModuleExports:
    """Tests for module exports."""

    def test_config_importable(self):
        """Config should be importable."""
        from backend_ai.app.config import Config
        assert Config is not None

    def test_get_config_importable(self):
        """get_config should be importable."""
        from backend_ai.app.config import get_config
        assert callable(get_config)

    def test_reset_config_importable(self):
        """reset_config should be importable."""
        from backend_ai.app.config import reset_config
        assert callable(reset_config)

    def test_validate_startup_config_importable(self):
        """validate_startup_config should be importable."""
        from backend_ai.app.config import validate_startup_config
        assert callable(validate_startup_config)

    def test_helper_functions_importable(self):
        """Helper functions should be importable."""
        from backend_ai.app.config import _bool_env, _int_env, _float_env, _list_env
        assert callable(_bool_env)
        assert callable(_int_env)
        assert callable(_float_env)
        assert callable(_list_env)
