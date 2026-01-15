"""Compatibility shim for signal summary utilities."""

try:
    from backend_ai.app.signal_extractor import summarize_signals
except ImportError:  # pragma: no cover - fallback for direct app path usage
    from signal_extractor import summarize_signals

__all__ = ["summarize_signals"]
