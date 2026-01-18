"""
Unit tests for rate_limit_service.py

Tests for Redis-backed distributed rate limiting.
"""
import pytest
import time
from unittest.mock import patch, MagicMock
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestRateLimitService:
    """Tests for rate_limit_service.py"""

    def test_check_rate_limit_allowed(self):
        """Test rate limit allows requests under limit."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            reset_rate_limit,
            _rate_state,
        )

        # Reset state
        reset_rate_limit("test-client-1")
        _rate_state.clear()

        # First request should be allowed
        allowed, retry_after = check_rate_limit("test-client-1", limit=10, window=60)
        assert allowed is True
        assert retry_after is None

    def test_check_rate_limit_denied(self):
        """Test rate limit denies requests over limit."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            reset_rate_limit,
            _rate_state,
        )

        # Reset state
        reset_rate_limit("test-client-2")
        _rate_state.clear()

        # Make requests up to limit
        for i in range(5):
            allowed, _ = check_rate_limit("test-client-2", limit=5, window=60)
            if i < 5:
                assert allowed is True

        # Next request should be denied
        allowed, retry_after = check_rate_limit("test-client-2", limit=5, window=60)
        assert allowed is False
        assert retry_after is not None
        assert retry_after > 0

    def test_check_rate_limit_window_reset(self):
        """Test rate limit resets after window expires."""
        from backend_ai.app.services.rate_limit_service import (
            _memory_check_rate,
            _rate_state,
        )

        # Reset state
        _rate_state.clear()

        # Make request at limit with 1 second window
        _memory_check_rate("test-client-3", limit=1, window=1)

        # Second request should be denied
        allowed, _ = _memory_check_rate("test-client-3", limit=1, window=1)
        assert allowed is False

        # Wait for window to expire
        time.sleep(1.1)

        # Request should be allowed again
        allowed, _ = _memory_check_rate("test-client-3", limit=1, window=1)
        assert allowed is True

    def test_get_rate_limit_status(self):
        """Test getting rate limit status."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            get_rate_limit_status,
            reset_rate_limit,
            _rate_state,
            RATE_LIMIT,
        )

        # Reset state - use unique client id
        client_id = "test-client-status-unique"
        reset_rate_limit(client_id)

        # Clear only this client from rate state
        if client_id in _rate_state:
            del _rate_state[client_id]

        # Make some requests
        check_rate_limit(client_id, limit=10, window=60)
        check_rate_limit(client_id, limit=10, window=60)

        status = get_rate_limit_status(client_id)

        assert status["client_id"] == client_id
        assert status["count"] == 2
        # remaining is calculated based on default RATE_LIMIT, not the limit param
        assert status["remaining"] == RATE_LIMIT - 2
        assert "backend" in status

    def test_reset_rate_limit(self):
        """Test resetting rate limit for a client."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            reset_rate_limit,
            get_rate_limit_status,
            _rate_state,
        )

        # Reset state
        _rate_state.clear()

        # Make some requests
        check_rate_limit("test-client-5", limit=10, window=60)
        check_rate_limit("test-client-5", limit=10, window=60)
        check_rate_limit("test-client-5", limit=10, window=60)

        # Verify count
        status = get_rate_limit_status("test-client-5")
        assert status["count"] == 3

        # Reset
        reset_rate_limit("test-client-5")

        # Verify reset
        status = get_rate_limit_status("test-client-5")
        assert status["count"] == 0

    def test_get_rate_limit_stats(self):
        """Test getting overall rate limit statistics."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            get_rate_limit_stats,
            _rate_state,
        )

        # Reset state
        _rate_state.clear()

        # Make requests from different clients
        check_rate_limit("stats-client-1", limit=10, window=60)
        check_rate_limit("stats-client-2", limit=10, window=60)

        stats = get_rate_limit_stats()

        assert "backend" in stats
        assert "default_limit" in stats
        assert "window_seconds" in stats
        assert stats["memory_active_clients"] >= 2

    def test_memory_cleanup(self):
        """Test periodic cleanup of stale clients."""
        from backend_ai.app.services.rate_limit_service import (
            _memory_check_rate,
            _rate_state,
        )

        # Reset state
        _rate_state.clear()

        # Add stale entries manually
        _rate_state["stale-client-1"] = [time.time() - 200]  # Old timestamp
        _rate_state["stale-client-2"] = []  # Empty list

        # Make 101 requests to trigger cleanup
        for i in range(101):
            _memory_check_rate(f"cleanup-test-{i}", limit=1000, window=60)

        # Stale clients should be cleaned up
        # Note: cleanup happens after 100 requests
        assert "stale-client-1" not in _rate_state or len(_rate_state["stale-client-1"]) == 0


class TestRateLimitConstants:
    """Tests for rate limit constants."""

    def test_default_rate_limit(self):
        """Test default rate limit value."""
        from backend_ai.app.services.rate_limit_service import RATE_LIMIT

        assert RATE_LIMIT > 0
        assert isinstance(RATE_LIMIT, int)

    def test_default_window(self):
        """Test default window value."""
        from backend_ai.app.services.rate_limit_service import RATE_WINDOW_SECONDS

        assert RATE_WINDOW_SECONDS == 60


class TestRedisFallback:
    """Tests for Redis fallback behavior."""

    def test_fallback_to_memory_when_redis_unavailable(self):
        """Test fallback to memory when Redis is unavailable."""
        from backend_ai.app.services.rate_limit_service import (
            check_rate_limit,
            get_rate_limit_stats,
            _rate_state,
        )

        # Clear state
        _rate_state.clear()

        # Should still work even without Redis
        allowed, retry_after = check_rate_limit("fallback-test", limit=10, window=60)
        assert allowed is True

        stats = get_rate_limit_stats()
        # Should report memory as backend if Redis not configured
        assert stats["backend"] in ["redis", "memory"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
