"""
Unit tests for Astro Parser module.

Tests:
- calculate_astrology_data function
- Payload passthrough behavior
- Error handling
"""
import pytest


class TestCalculateAstrologyData:
    """Tests for calculate_astrology_data function."""

    def test_returns_payload_as_is(self):
        """Test returns payload dict as-is."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        payload = {
            "planets": [{"name": "Sun", "sign": "Aries"}],
            "houses": [0, 30, 60],
            "aspects": [],
            "ascendant": {"sign": "Leo"},
        }

        result = calculate_astrology_data(payload)
        assert result == payload

    def test_preserves_all_keys(self):
        """Test preserves all keys from payload."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        payload = {
            "planets": [],
            "houses": [],
            "aspects": [],
            "ascendant": {},
            "mc": {},
            "elementRatios": {"fire": 3, "earth": 2},
        }

        result = calculate_astrology_data(payload)
        assert "planets" in result
        assert "houses" in result
        assert "elementRatios" in result

    def test_raises_error_for_none(self):
        """Test raises error when params is None."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        with pytest.raises(ValueError) as exc_info:
            calculate_astrology_data(None)

        assert "payload missing" in str(exc_info.value).lower()

    def test_raises_error_for_non_dict(self):
        """Test raises error when params is not dict."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        with pytest.raises(ValueError):
            calculate_astrology_data("string")

        with pytest.raises(ValueError):
            calculate_astrology_data([1, 2, 3])

    def test_raises_error_for_empty_call(self):
        """Test raises error when called without params."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        with pytest.raises(ValueError):
            calculate_astrology_data()

    def test_raises_error_for_empty_dict(self):
        """Test raises error for empty dict payload."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        # Empty dict is treated as invalid/missing payload
        with pytest.raises(ValueError):
            calculate_astrology_data({})

    def test_preserves_nested_structures(self):
        """Test preserves nested data structures."""
        from backend_ai.app.astro_parser import calculate_astrology_data

        payload = {
            "planets": [
                {"name": "Sun", "sign": "Aries", "house": 1, "aspects": [{"to": "Moon"}]}
            ],
            "nested": {"deep": {"data": [1, 2, 3]}},
        }

        result = calculate_astrology_data(payload)
        assert result["planets"][0]["aspects"][0]["to"] == "Moon"
        assert result["nested"]["deep"]["data"] == [1, 2, 3]


class TestModuleExports:
    """Tests for module exports."""

    def test_calculate_astrology_data_importable(self):
        """calculate_astrology_data should be importable."""
        from backend_ai.app.astro_parser import calculate_astrology_data
        assert calculate_astrology_data is not None
