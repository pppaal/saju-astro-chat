"""
Unit tests for backend_ai/utils/env_utils.py

Tests:
- _is_truthy: 문자열 truthy 판단
- _bool_env: 환경변수 boolean 변환
- _coerce_float: float 변환
- _coerce_int: int 변환
- _get_int_env: 환경변수 int 변환
- _clamp_temperature: 온도값 범위 제한
- _select_model_and_temperature: 모델/온도 선택
"""
import pytest
from unittest.mock import patch
import os


class TestIsTruthy:
    """Tests for _is_truthy function."""

    def test_truthy_values(self):
        """Truthy string values should return True."""
        from backend_ai.utils.env_utils import _is_truthy

        assert _is_truthy("1") is True
        assert _is_truthy("true") is True
        assert _is_truthy("TRUE") is True
        assert _is_truthy("True") is True
        assert _is_truthy("yes") is True
        assert _is_truthy("YES") is True
        assert _is_truthy("on") is True
        assert _is_truthy("ON") is True

    def test_falsy_values(self):
        """Falsy string values should return False."""
        from backend_ai.utils.env_utils import _is_truthy

        assert _is_truthy("0") is False
        assert _is_truthy("false") is False
        assert _is_truthy("FALSE") is False
        assert _is_truthy("no") is False
        assert _is_truthy("off") is False
        assert _is_truthy("") is False
        assert _is_truthy("random") is False

    def test_none_value(self):
        """None should return False."""
        from backend_ai.utils.env_utils import _is_truthy

        assert _is_truthy(None) is False

    def test_bool_values(self):
        """Boolean values should return as-is."""
        from backend_ai.utils.env_utils import _is_truthy

        assert _is_truthy(True) is True
        assert _is_truthy(False) is False

    def test_numeric_values(self):
        """Numeric values should be evaluated."""
        from backend_ai.utils.env_utils import _is_truthy

        assert _is_truthy(1) is True
        assert _is_truthy(0) is False
        assert _is_truthy(0.5) is True


class TestBoolEnv:
    """Tests for _bool_env function."""

    def test_env_true(self):
        """Environment variable set to truthy value."""
        from backend_ai.utils.env_utils import _bool_env

        with patch.dict(os.environ, {"TEST_VAR": "true"}):
            assert _bool_env("TEST_VAR") is True

    def test_env_false(self):
        """Environment variable set to falsy value."""
        from backend_ai.utils.env_utils import _bool_env

        with patch.dict(os.environ, {"TEST_VAR": "false"}):
            assert _bool_env("TEST_VAR") is False

    def test_env_missing(self):
        """Missing environment variable defaults to False."""
        from backend_ai.utils.env_utils import _bool_env

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("NONEXISTENT_VAR", None)
            assert _bool_env("NONEXISTENT_VAR") is False

    def test_env_one(self):
        """Environment variable set to '1'."""
        from backend_ai.utils.env_utils import _bool_env

        with patch.dict(os.environ, {"TEST_VAR": "1"}):
            assert _bool_env("TEST_VAR") is True


class TestCoerceFloat:
    """Tests for _coerce_float function."""

    def test_valid_float_string(self):
        """Valid float string should convert."""
        from backend_ai.utils.env_utils import _coerce_float

        assert _coerce_float("3.14") == 3.14
        assert _coerce_float("0.5") == 0.5
        assert _coerce_float("-1.5") == -1.5

    def test_valid_int_string(self):
        """Integer string should convert to float."""
        from backend_ai.utils.env_utils import _coerce_float

        assert _coerce_float("42") == 42.0

    def test_invalid_string(self):
        """Invalid string should return default."""
        from backend_ai.utils.env_utils import _coerce_float

        assert _coerce_float("invalid", default=1.0) == 1.0
        assert _coerce_float("", default=0.5) == 0.5

    def test_none_value(self):
        """None should return default."""
        from backend_ai.utils.env_utils import _coerce_float

        assert _coerce_float(None, default=2.0) == 2.0


class TestCoerceInt:
    """Tests for _coerce_int function."""

    def test_valid_int_string(self):
        """Valid int string should convert."""
        from backend_ai.utils.env_utils import _coerce_int

        assert _coerce_int("42") == 42
        assert _coerce_int("-10") == -10
        assert _coerce_int("0") == 0

    def test_invalid_string(self):
        """Invalid string should return default."""
        from backend_ai.utils.env_utils import _coerce_int

        assert _coerce_int("invalid", default=100) == 100
        assert _coerce_int("3.14", default=5) == 5

    def test_none_value(self):
        """None should return default."""
        from backend_ai.utils.env_utils import _coerce_int

        assert _coerce_int(None, default=50) == 50


class TestGetIntEnv:
    """Tests for _get_int_env function."""

    def test_env_int_value(self):
        """Environment variable with int value."""
        from backend_ai.utils.env_utils import _get_int_env

        with patch.dict(os.environ, {"TEST_INT": "123"}):
            assert _get_int_env("TEST_INT", default=0) == 123

    def test_env_missing_default(self):
        """Missing environment variable uses default."""
        from backend_ai.utils.env_utils import _get_int_env

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("NONEXISTENT_INT", None)
            assert _get_int_env("NONEXISTENT_INT", default=999) == 999

    def test_env_invalid_value(self):
        """Invalid value uses default."""
        from backend_ai.utils.env_utils import _get_int_env

        with patch.dict(os.environ, {"TEST_INT": "not_a_number"}):
            assert _get_int_env("TEST_INT", default=50) == 50

    def test_clamping_min(self):
        """Value below min should be clamped."""
        from backend_ai.utils.env_utils import _get_int_env

        with patch.dict(os.environ, {"TEST_INT": "-5"}):
            result = _get_int_env("TEST_INT", default=100, min_value=1, max_value=1000)
            assert result == 1

    def test_clamping_max(self):
        """Value above max should be clamped."""
        from backend_ai.utils.env_utils import _get_int_env

        with patch.dict(os.environ, {"TEST_INT": "99999"}):
            result = _get_int_env("TEST_INT", default=100, min_value=1, max_value=1000)
            assert result == 1000


class TestClampTemperature:
    """Tests for _clamp_temperature function."""

    def test_within_range(self):
        """Temperature within range should not be clamped."""
        from backend_ai.utils.env_utils import _clamp_temperature

        assert _clamp_temperature(0.5) == 0.5
        assert _clamp_temperature(0.7) == 0.7
        assert _clamp_temperature(1.0) == 1.0

    def test_below_minimum(self):
        """Temperature below minimum should be clamped."""
        from backend_ai.utils.env_utils import _clamp_temperature

        assert _clamp_temperature(-0.5) == 0.0
        assert _clamp_temperature(-1.0) == 0.0

    def test_above_maximum(self):
        """Temperature above maximum should be clamped."""
        from backend_ai.utils.env_utils import _clamp_temperature

        assert _clamp_temperature(2.5) == 2.0
        assert _clamp_temperature(10.0) == 2.0

    def test_boundary_values(self):
        """Boundary values should be handled correctly."""
        from backend_ai.utils.env_utils import _clamp_temperature

        assert _clamp_temperature(0.0) == 0.0
        assert _clamp_temperature(2.0) == 2.0

    def test_none_uses_default(self):
        """None should return default."""
        from backend_ai.utils.env_utils import _clamp_temperature

        assert _clamp_temperature(None) == 0.75
        assert _clamp_temperature(None, default=0.5) == 0.5


class TestSelectModelAndTemperature:
    """Tests for _select_model_and_temperature function."""

    def test_default_values(self):
        """Default model and temperature selection."""
        from backend_ai.utils.env_utils import _select_model_and_temperature

        data = {}
        model, temp, ab = _select_model_and_temperature(
            data=data,
            default_model="gpt-4",
            default_temp=0.7,
            session_id=None,
            request_id="req-123"
        )
        assert model == "gpt-4"
        assert temp == 0.7
        assert ab == ""

    def test_with_override_model(self):
        """Override model should be used."""
        from backend_ai.utils.env_utils import _select_model_and_temperature

        data = {"model": "claude-3"}
        model, temp, ab = _select_model_and_temperature(
            data=data,
            default_model="gpt-4",
            default_temp=0.7,
            session_id=None,
            request_id="req-123"
        )
        assert model == "claude-3"

    def test_with_override_temperature(self):
        """Override temperature should be used."""
        from backend_ai.utils.env_utils import _select_model_and_temperature

        data = {"temperature": 0.9}
        model, temp, ab = _select_model_and_temperature(
            data=data,
            default_model="gpt-4",
            default_temp=0.7,
            session_id=None,
            request_id="req-123"
        )
        assert temp == 0.9

    def test_temperature_clamping(self):
        """Override temperature should be clamped."""
        from backend_ai.utils.env_utils import _select_model_and_temperature

        data = {"temperature": 5.0}
        model, temp, ab = _select_model_and_temperature(
            data=data,
            default_model="gpt-4",
            default_temp=0.7,
            session_id=None,
            request_id="req-123"
        )
        assert temp == 2.0

    def test_ab_variant_from_data(self):
        """AB variant from data should be used."""
        from backend_ai.utils.env_utils import _select_model_and_temperature

        data = {"ab_variant": "A"}
        model, temp, ab = _select_model_and_temperature(
            data=data,
            default_model="gpt-4",
            default_temp=0.7,
            session_id=None,
            request_id="req-123"
        )
        assert ab == "A"


class TestModuleExports:
    """Tests for module imports."""

    def test_is_truthy_importable(self):
        """_is_truthy should be importable."""
        from backend_ai.utils.env_utils import _is_truthy
        assert callable(_is_truthy)

    def test_bool_env_importable(self):
        """_bool_env should be importable."""
        from backend_ai.utils.env_utils import _bool_env
        assert callable(_bool_env)

    def test_coerce_float_importable(self):
        """_coerce_float should be importable."""
        from backend_ai.utils.env_utils import _coerce_float
        assert callable(_coerce_float)

    def test_coerce_int_importable(self):
        """_coerce_int should be importable."""
        from backend_ai.utils.env_utils import _coerce_int
        assert callable(_coerce_int)

    def test_get_int_env_importable(self):
        """_get_int_env should be importable."""
        from backend_ai.utils.env_utils import _get_int_env
        assert callable(_get_int_env)

    def test_clamp_temperature_importable(self):
        """_clamp_temperature should be importable."""
        from backend_ai.utils.env_utils import _clamp_temperature
        assert callable(_clamp_temperature)

    def test_select_model_and_temperature_importable(self):
        """_select_model_and_temperature should be importable."""
        from backend_ai.utils.env_utils import _select_model_and_temperature
        assert callable(_select_model_and_temperature)
