"""
Unit tests for Utils Error Handler module.

Tests:
- handle_errors decorator
- safe_get function
- log_error function
- ErrorContext class
"""
import pytest
from unittest.mock import patch, MagicMock


class TestHandleErrorsDecorator:
    """Tests for handle_errors decorator."""

    def test_decorator_exists(self):
        """Test decorator exists."""
        from backend_ai.app.utils.error_handler import handle_errors

        assert callable(handle_errors)

    def test_decorator_returns_callable(self):
        """Test decorator returns callable."""
        from backend_ai.app.utils.error_handler import handle_errors

        decorator = handle_errors()
        assert callable(decorator)

    def test_decorated_function_runs_normally(self):
        """Test decorated function runs normally without error."""
        from backend_ai.app.utils.error_handler import handle_errors

        @handle_errors(default={})
        def test_func():
            return {"result": True}

        result = test_func()
        assert result == {"result": True}

    def test_decorated_function_returns_default_on_error(self):
        """Test returns default value on error."""
        from backend_ai.app.utils.error_handler import handle_errors

        @handle_errors(default="default_value")
        def test_func():
            raise ValueError("test error")

        result = test_func()
        assert result == "default_value"

    def test_decorated_function_reraises_when_specified(self):
        """Test re-raises exception when reraise=True."""
        from backend_ai.app.utils.error_handler import handle_errors

        @handle_errors(default={}, reraise=True)
        def test_func():
            raise ValueError("test error")

        with pytest.raises(ValueError):
            test_func()

    def test_decorator_with_context(self):
        """Test decorator with context parameter."""
        from backend_ai.app.utils.error_handler import handle_errors

        @handle_errors(default=None, context="TestContext")
        def test_func():
            raise ValueError("test error")

        result = test_func()
        assert result is None

    def test_decorator_with_callable_default(self):
        """Test decorator with callable default."""
        from backend_ai.app.utils.error_handler import handle_errors

        # Lambda provides callable that returns empty list
        @handle_errors(default=lambda: [])
        def test_func():
            raise ValueError("test error")

        result = test_func()
        assert result == []

    def test_decorator_preserves_function_name(self):
        """Test decorator preserves function name."""
        from backend_ai.app.utils.error_handler import handle_errors

        @handle_errors(default={})
        def my_test_function():
            return {}

        assert my_test_function.__name__ == "my_test_function"


class TestSafeGet:
    """Tests for safe_get function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.error_handler import safe_get

        assert callable(safe_get)

    def test_single_key(self):
        """Test getting single key."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"key": "value"}
        result = safe_get(data, "key")
        assert result == "value"

    def test_nested_keys(self):
        """Test getting nested keys."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"level1": {"level2": {"level3": "value"}}}
        result = safe_get(data, "level1", "level2", "level3")
        assert result == "value"

    def test_returns_default_on_missing_key(self):
        """Test returns default on missing key."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"key": "value"}
        result = safe_get(data, "missing", default="default")
        assert result == "default"

    def test_returns_default_on_missing_nested_key(self):
        """Test returns default on missing nested key."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"level1": {"level2": "value"}}
        result = safe_get(data, "level1", "missing", default={})
        assert result == {}

    def test_returns_none_default(self):
        """Test returns None as default."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"key": "value"}
        result = safe_get(data, "missing")
        assert result is None

    def test_handles_non_dict_in_path(self):
        """Test handles non-dict value in path."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"key": "value"}  # "value" is not a dict
        result = safe_get(data, "key", "nested", default="default")
        assert result == "default"

    def test_handles_none_value(self):
        """Test handles None value in path."""
        from backend_ai.app.utils.error_handler import safe_get

        data = {"key": None}
        result = safe_get(data, "key", default="default")
        assert result == "default"


class TestLogError:
    """Tests for log_error function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.error_handler import log_error

        assert callable(log_error)

    def test_logs_error(self):
        """Test logs error message."""
        from backend_ai.app.utils.error_handler import log_error

        error = ValueError("test error")
        # Should not raise
        log_error("TestContext", error)

    def test_logs_with_different_levels(self):
        """Test logs with different levels."""
        from backend_ai.app.utils.error_handler import log_error

        error = ValueError("test error")

        for level in ["debug", "info", "warning", "error"]:
            log_error("TestContext", error, log_level=level)


class TestErrorContextClass:
    """Tests for ErrorContext class."""

    def test_class_exists(self):
        """Test ErrorContext class exists."""
        from backend_ai.app.utils.error_handler import ErrorContext

        assert ErrorContext is not None

    def test_as_context_manager_success(self):
        """Test as context manager on success."""
        from backend_ai.app.utils.error_handler import ErrorContext

        with ErrorContext("Test") as ctx:
            result = 1 + 1

        assert ctx.error is None

    def test_as_context_manager_error(self):
        """Test as context manager on error."""
        from backend_ai.app.utils.error_handler import ErrorContext

        with ErrorContext("Test", default="default") as ctx:
            raise ValueError("test error")

        assert ctx.error is not None
        assert ctx.result == "default"

    def test_reraise_option(self):
        """Test reraise option."""
        from backend_ai.app.utils.error_handler import ErrorContext

        with pytest.raises(ValueError):
            with ErrorContext("Test", reraise=True):
                raise ValueError("test error")

    def test_stores_context_info(self):
        """Test stores context information."""
        from backend_ai.app.utils.error_handler import ErrorContext

        ctx = ErrorContext("MyContext", default={}, log_level="warning")

        assert ctx.context == "MyContext"
        assert ctx.default == {}
        assert ctx.log_level == "warning"
        assert ctx.reraise is False


class TestModuleImports:
    """Tests for module imports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.utils import error_handler

        assert error_handler is not None

    def test_all_exports_importable(self):
        """Test all main exports are importable."""
        from backend_ai.app.utils.error_handler import (
            handle_errors,
            safe_get,
            log_error,
            ErrorContext
        )

        assert all([handle_errors, safe_get, log_error, ErrorContext])

