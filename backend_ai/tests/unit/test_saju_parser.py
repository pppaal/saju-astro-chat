"""
Unit tests for Saju Parser module.

Tests:
- calculate_saju_data function
- Payload passthrough behavior
- Error handling
"""
import pytest


class TestCalculateSajuData:
    """Tests for calculate_saju_data function."""

    def test_returns_payload_as_is(self):
        """Test returns payload dict as-is."""
        from backend_ai.app.saju_parser import calculate_saju_data

        payload = {
            "pillars": {"year": "甲子", "month": "乙丑"},
            "daeun": [],
            "sinsal": {},
            "annual": [],
        }

        result = calculate_saju_data(payload=payload)
        assert result == payload

    def test_preserves_all_keys(self):
        """Test preserves all keys from payload."""
        from backend_ai.app.saju_parser import calculate_saju_data

        payload = {
            "pillars": {},
            "daeun": [{"year": 2020}],
            "sinsal": {"hits": []},
            "annual": [{"year": 2024}],
            "advancedAnalysis": {},
        }

        result = calculate_saju_data(payload=payload)
        assert "pillars" in result
        assert "daeun" in result
        assert "sinsal" in result
        assert "advancedAnalysis" in result

    def test_raises_error_for_missing_payload(self):
        """Test raises error when payload is missing."""
        from backend_ai.app.saju_parser import calculate_saju_data

        with pytest.raises(ValueError) as exc_info:
            calculate_saju_data()

        assert "payload missing" in str(exc_info.value).lower()

    def test_raises_error_for_none_payload(self):
        """Test raises error when payload is None."""
        from backend_ai.app.saju_parser import calculate_saju_data

        with pytest.raises(ValueError):
            calculate_saju_data(payload=None)

    def test_raises_error_for_non_dict_payload(self):
        """Test raises error when payload is not dict."""
        from backend_ai.app.saju_parser import calculate_saju_data

        with pytest.raises(ValueError):
            calculate_saju_data(payload="string")

        with pytest.raises(ValueError):
            calculate_saju_data(payload=[1, 2, 3])

    def test_raises_error_for_empty_dict(self):
        """Test raises error for empty dict payload."""
        from backend_ai.app.saju_parser import calculate_saju_data

        # Empty dict is treated as invalid/missing payload
        with pytest.raises(ValueError):
            calculate_saju_data(payload={})

    def test_preserves_nested_structures(self):
        """Test preserves nested data structures."""
        from backend_ai.app.saju_parser import calculate_saju_data

        payload = {
            "pillars": {
                "year": {"gan": "甲", "ji": "子"},
                "month": {"gan": "乙", "ji": "丑"},
            },
            "advancedAnalysis": {
                "yongsin": {"primary": {"element": "水"}},
            },
        }

        result = calculate_saju_data(payload=payload)
        assert result["pillars"]["year"]["gan"] == "甲"
        assert result["advancedAnalysis"]["yongsin"]["primary"]["element"] == "水"

    def test_accepts_positional_args(self):
        """Test function accepts positional args (ignored)."""
        from backend_ai.app.saju_parser import calculate_saju_data

        payload = {"pillars": {}}
        # Should not raise even with positional args
        result = calculate_saju_data("arg1", "arg2", payload=payload)
        assert result == payload


class TestModuleExports:
    """Tests for module exports."""

    def test_calculate_saju_data_importable(self):
        """calculate_saju_data should be importable."""
        from backend_ai.app.saju_parser import calculate_saju_data
        assert calculate_saju_data is not None
