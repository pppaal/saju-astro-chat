"""
Unit tests for Signal Summary module.

Tests:
- Module exports (compatibility shim for signal_extractor)
- summarize_signals re-export
"""
import pytest


class TestModuleExports:
    """Tests for module exports."""

    def test_summarize_signals_importable(self):
        """summarize_signals should be importable from signal_summary."""
        from backend_ai.app.signal_summary import summarize_signals

        assert summarize_signals is not None
        assert callable(summarize_signals)

    def test_all_exports(self):
        """__all__ should contain summarize_signals."""
        from backend_ai.app import signal_summary

        assert hasattr(signal_summary, "__all__")
        assert "summarize_signals" in signal_summary.__all__

    def test_same_as_signal_extractor(self):
        """summarize_signals should be same as signal_extractor version."""
        from backend_ai.app.signal_summary import summarize_signals
        from backend_ai.app.signal_extractor import summarize_signals as original

        assert summarize_signals is original
