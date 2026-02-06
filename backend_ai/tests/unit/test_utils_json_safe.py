"""
Unit tests for Utils JSON Safe module.

Tests:
- Exception classes
- safe_json_loads function
- safe_json_dumps function
- safe_json_load_file function
- validate_json_structure function
"""
import pytest
from unittest.mock import patch, MagicMock
import json


class TestExceptionClasses:
    """Tests for custom exception classes."""

    def test_json_parse_error_exists(self):
        """Test JSONParseError exists."""
        from backend_ai.app.utils.json_safe import JSONParseError

        assert issubclass(JSONParseError, Exception)

    def test_json_size_error_exists(self):
        """Test JSONSizeError exists."""
        from backend_ai.app.utils.json_safe import JSONSizeError, JSONParseError

        assert issubclass(JSONSizeError, JSONParseError)

    def test_json_depth_error_exists(self):
        """Test JSONDepthError exists."""
        from backend_ai.app.utils.json_safe import JSONDepthError, JSONParseError

        assert issubclass(JSONDepthError, JSONParseError)

    def test_can_raise_json_parse_error(self):
        """Test can raise JSONParseError."""
        from backend_ai.app.utils.json_safe import JSONParseError

        with pytest.raises(JSONParseError):
            raise JSONParseError("test error")

    def test_can_raise_json_size_error(self):
        """Test can raise JSONSizeError."""
        from backend_ai.app.utils.json_safe import JSONSizeError

        with pytest.raises(JSONSizeError):
            raise JSONSizeError("size limit exceeded")


class TestDefaultConstants:
    """Tests for default constants."""

    def test_default_max_size(self):
        """Test DEFAULT_MAX_SIZE constant."""
        from backend_ai.app.utils.json_safe import DEFAULT_MAX_SIZE

        assert DEFAULT_MAX_SIZE == 1_000_000

    def test_default_max_depth(self):
        """Test DEFAULT_MAX_DEPTH constant."""
        from backend_ai.app.utils.json_safe import DEFAULT_MAX_DEPTH

        assert DEFAULT_MAX_DEPTH == 50


class TestSafeJsonLoads:
    """Tests for safe_json_loads function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        assert callable(safe_json_loads)

    def test_parses_valid_json(self):
        """Test parsing valid JSON."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads('{"key": "value"}')
        assert result == {"key": "value"}

    def test_parses_json_array(self):
        """Test parsing JSON array."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads('[1, 2, 3]')
        assert result == [1, 2, 3]

    def test_returns_default_on_invalid_json(self):
        """Test returns default on invalid JSON."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads("not valid json", default={})
        assert result == {}

    def test_returns_none_default(self):
        """Test returns None as default."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads("invalid")
        assert result is None

    def test_returns_default_on_empty_string(self):
        """Test returns default on empty string."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads("", default=[])
        assert result == []

    def test_returns_default_on_whitespace(self):
        """Test returns default on whitespace only."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        result = safe_json_loads("   ", default={})
        assert result == {}

    def test_raises_on_size_limit(self):
        """Test raises on size limit exceeded."""
        from backend_ai.app.utils.json_safe import safe_json_loads, JSONSizeError

        large_text = '{"key": "' + "x" * 1000 + '"}'

        with pytest.raises(JSONSizeError):
            safe_json_loads(large_text, max_size=100, raise_on_error=True)

    def test_returns_default_on_size_limit(self):
        """Test returns default on size limit without raise."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        large_text = '{"key": "' + "x" * 1000 + '"}'
        result = safe_json_loads(large_text, max_size=100, default={})

        assert result == {}

    def test_raises_on_invalid_json(self):
        """Test raises on invalid JSON when raise_on_error=True."""
        from backend_ai.app.utils.json_safe import safe_json_loads, JSONParseError

        with pytest.raises(JSONParseError):
            safe_json_loads("not json", raise_on_error=True)

    def test_context_parameter(self):
        """Test context parameter is accepted."""
        from backend_ai.app.utils.json_safe import safe_json_loads

        # Should not raise
        result = safe_json_loads('{}', context="test_context")
        assert result == {}


class TestSafeJsonDumps:
    """Tests for safe_json_dumps function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        assert callable(safe_json_dumps)

    def test_serializes_dict(self):
        """Test serializing dict."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        result = safe_json_dumps({"key": "value"})
        assert json.loads(result) == {"key": "value"}

    def test_serializes_list(self):
        """Test serializing list."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        result = safe_json_dumps([1, 2, 3])
        assert json.loads(result) == [1, 2, 3]

    def test_returns_default_on_non_serializable(self):
        """Test returns default on non-serializable."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        # Functions are not JSON serializable
        result = safe_json_dumps(lambda x: x, default="{}")
        assert result == "{}"

    def test_raises_on_size_limit(self):
        """Test raises on output size limit."""
        from backend_ai.app.utils.json_safe import safe_json_dumps, JSONSizeError

        large_data = {"key": "x" * 1000}

        with pytest.raises(JSONSizeError):
            safe_json_dumps(large_data, max_size=100, raise_on_error=True)

    def test_returns_default_on_size_limit(self):
        """Test returns default on size limit."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        large_data = {"key": "x" * 1000}
        result = safe_json_dumps(large_data, max_size=100, default="{}")

        assert result == "{}"

    def test_passes_kwargs_to_json_dumps(self):
        """Test passes kwargs to json.dumps."""
        from backend_ai.app.utils.json_safe import safe_json_dumps

        result = safe_json_dumps({"b": 1, "a": 2}, sort_keys=True)
        assert result == '{"a": 2, "b": 1}'


class TestSafeJsonLoadFile:
    """Tests for safe_json_load_file function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.json_safe import safe_json_load_file

        assert callable(safe_json_load_file)

    def test_returns_default_on_file_not_found(self):
        """Test returns default on file not found."""
        from backend_ai.app.utils.json_safe import safe_json_load_file

        result = safe_json_load_file("/nonexistent/path.json", default={})
        assert result == {}

    def test_raises_on_file_not_found(self):
        """Test raises on file not found when raise_on_error=True."""
        from backend_ai.app.utils.json_safe import safe_json_load_file, JSONParseError

        with pytest.raises(JSONParseError):
            safe_json_load_file("/nonexistent/path.json", raise_on_error=True)


class TestValidateJsonStructure:
    """Tests for validate_json_structure function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        assert callable(validate_json_structure)

    def test_validates_expected_type_dict(self):
        """Test validates expected type dict."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        assert validate_json_structure({"key": "value"}, expected_type=dict) is True
        assert validate_json_structure([1, 2, 3], expected_type=dict) is False

    def test_validates_expected_type_list(self):
        """Test validates expected type list."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        assert validate_json_structure([1, 2, 3], expected_type=list) is True
        assert validate_json_structure({"key": "value"}, expected_type=list) is False

    def test_validates_required_keys(self):
        """Test validates required keys."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        data = {"name": "test", "value": 123}

        assert validate_json_structure(data, required_keys=["name", "value"]) is True
        assert validate_json_structure(data, required_keys=["name", "missing"]) is False

    def test_returns_true_for_valid_structure(self):
        """Test returns True for valid structure."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        data = {"name": "test"}
        assert validate_json_structure(data) is True

    def test_context_parameter(self):
        """Test context parameter is accepted."""
        from backend_ai.app.utils.json_safe import validate_json_structure

        result = validate_json_structure({}, context="test")
        assert result is True


class TestModuleImports:
    """Tests for module imports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.utils import json_safe

        assert json_safe is not None

    def test_all_functions_importable(self):
        """Test all main functions are importable."""
        from backend_ai.app.utils.json_safe import (
            safe_json_loads,
            safe_json_dumps,
            safe_json_load_file,
            validate_json_structure,
            JSONParseError,
            JSONSizeError,
            JSONDepthError
        )

        assert all([
            safe_json_loads, safe_json_dumps, safe_json_load_file,
            validate_json_structure, JSONParseError, JSONSizeError, JSONDepthError
        ])

