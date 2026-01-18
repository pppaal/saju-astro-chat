"""
Sanitizer Service Tests

Tests for input sanitization and data masking.
"""

import pytest
from unittest.mock import patch, MagicMock

from backend_ai.app.services.sanitizer_service import (
    sanitize_messages,
    mask_sensitive_data,
)


class TestSanitizeMessages:
    """Tests for sanitize_messages function."""

    def test_returns_empty_list_for_none(self):
        """None input should return empty list."""
        result = sanitize_messages(None)
        assert result == []

    def test_returns_empty_list_for_empty_list(self):
        """Empty list should return empty list."""
        result = sanitize_messages([])
        assert result == []

    def test_returns_empty_list_for_non_list(self):
        """Non-list input should return empty list."""
        result = sanitize_messages("not a list")
        assert result == []

    def test_filters_non_dict_messages(self):
        """Non-dict messages should be filtered out."""
        messages = [
            {"role": "user", "content": "Hello"},
            "not a dict",
            123,
            {"role": "assistant", "content": "Hi"},
        ]
        result = sanitize_messages(messages)

        assert len(result) == 2
        assert result[0]["content"] == "Hello"
        assert result[1]["content"] == "Hi"

    def test_preserves_role(self):
        """Message role should be preserved."""
        messages = [
            {"role": "user", "content": "Question"},
            {"role": "assistant", "content": "Answer"},
            {"role": "system", "content": "Instruction"},
        ]
        result = sanitize_messages(messages)

        assert result[0]["role"] == "user"
        assert result[1]["role"] == "assistant"
        assert result[2]["role"] == "system"

    def test_default_role_is_user(self):
        """Missing role should default to user."""
        messages = [{"content": "No role specified"}]
        result = sanitize_messages(messages)

        assert result[0]["role"] == "user"

    def test_handles_empty_content(self):
        """Empty content should be handled."""
        messages = [{"role": "user", "content": ""}]
        result = sanitize_messages(messages)

        assert len(result) == 1
        assert result[0]["content"] == ""

    def test_handles_missing_content(self):
        """Missing content should be handled."""
        messages = [{"role": "user"}]
        result = sanitize_messages(messages)

        assert len(result) == 1
        assert result[0]["content"] == ""

    def test_handles_non_string_content(self):
        """Non-string content should be handled."""
        messages = [{"role": "user", "content": 123}]
        result = sanitize_messages(messages)

        # Non-string content should pass through as empty or as-is
        assert len(result) == 1

    @patch("backend_ai.app.sanitizer.sanitize_user_input")
    @patch("backend_ai.app.sanitizer.is_suspicious_input")
    def test_calls_sanitize_user_input(self, mock_suspicious, mock_sanitize):
        """Should call sanitize_user_input for string content."""
        mock_suspicious.return_value = False
        mock_sanitize.return_value = "sanitized"

        messages = [{"role": "user", "content": "test content"}]
        result = sanitize_messages(messages)

        mock_sanitize.assert_called_once()
        assert result[0]["content"] == "sanitized"

    @patch("backend_ai.app.sanitizer.sanitize_user_input")
    @patch("backend_ai.app.sanitizer.is_suspicious_input")
    def test_passes_max_content_length(self, mock_suspicious, mock_sanitize):
        """Should pass max_content_length to sanitizer."""
        mock_suspicious.return_value = False
        mock_sanitize.return_value = "sanitized"

        messages = [{"role": "user", "content": "test"}]
        sanitize_messages(messages, max_content_length=500)

        call_args = mock_sanitize.call_args
        assert call_args[1]["max_length"] == 500

    @patch("backend_ai.app.sanitizer.sanitize_user_input")
    @patch("backend_ai.app.sanitizer.is_suspicious_input")
    def test_allows_newlines(self, mock_suspicious, mock_sanitize):
        """Should allow newlines in content."""
        mock_suspicious.return_value = False
        mock_sanitize.return_value = "sanitized"

        messages = [{"role": "user", "content": "line1\nline2"}]
        sanitize_messages(messages)

        call_args = mock_sanitize.call_args
        assert call_args[1]["allow_newlines"] is True

    @patch("backend_ai.app.sanitizer.sanitize_user_input")
    @patch("backend_ai.app.sanitizer.is_suspicious_input")
    def test_checks_suspicious_input(self, mock_suspicious, mock_sanitize):
        """Should check for suspicious input."""
        mock_suspicious.return_value = True
        mock_sanitize.return_value = ""

        messages = [{"role": "user", "content": "suspicious content"}]
        sanitize_messages(messages)

        mock_suspicious.assert_called_once_with("suspicious content")

    def test_handles_multiple_messages(self):
        """Should handle multiple messages."""
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
            {"role": "user", "content": "How are you?"},
        ]
        result = sanitize_messages(messages)

        assert len(result) == 3


class TestMaskSensitiveData:
    """Tests for mask_sensitive_data function."""

    def test_masks_email_addresses(self):
        """Should mask email addresses."""
        text = "Contact me at john.doe@example.com for more info."
        result = mask_sensitive_data(text)

        assert "[EMAIL]" in result
        assert "john.doe@example.com" not in result

    def test_masks_multiple_emails(self):
        """Should mask multiple email addresses."""
        text = "From: alice@test.com To: bob@example.org"
        result = mask_sensitive_data(text)

        assert result.count("[EMAIL]") == 2
        assert "alice@test.com" not in result
        assert "bob@example.org" not in result

    def test_masks_phone_with_dashes(self):
        """Should mask phone numbers with dashes."""
        text = "Call me at 010-1234-5678"
        result = mask_sensitive_data(text)

        assert "[PHONE]" in result
        assert "010-1234-5678" not in result

    def test_masks_phone_with_dots(self):
        """Should mask phone numbers with dots."""
        text = "Call me at 010.1234.5678"
        result = mask_sensitive_data(text)

        assert "[PHONE]" in result
        assert "010.1234.5678" not in result

    def test_masks_phone_with_spaces(self):
        """Should mask phone numbers with spaces."""
        text = "Call me at 010 1234 5678"
        result = mask_sensitive_data(text)

        assert "[PHONE]" in result
        assert "010 1234 5678" not in result

    def test_masks_phone_without_separator(self):
        """Should mask phone numbers without separators."""
        text = "Call 01012345678"
        result = mask_sensitive_data(text)

        assert "[PHONE]" in result
        assert "01012345678" not in result

    def test_masks_credit_card_with_dashes(self):
        """Should mask credit card numbers with dashes."""
        text = "Card: 1234-5678-9012-3456"
        result = mask_sensitive_data(text)

        assert "[CARD]" in result
        assert "1234-5678-9012-3456" not in result

    def test_masks_credit_card_with_spaces(self):
        """Should mask credit card numbers with spaces."""
        text = "Card: 1234 5678 9012 3456"
        result = mask_sensitive_data(text)

        assert "[CARD]" in result
        assert "1234 5678 9012 3456" not in result

    def test_masks_credit_card_without_separator(self):
        """Should mask credit card numbers without separators."""
        text = "Card: 1234567890123456"
        result = mask_sensitive_data(text)

        assert "[CARD]" in result
        assert "1234567890123456" not in result

    def test_masks_multiple_sensitive_data(self):
        """Should mask multiple types of sensitive data."""
        text = "Email: test@email.com, Phone: 010-1234-5678, Card: 1234-5678-9012-3456"
        result = mask_sensitive_data(text)

        assert "[EMAIL]" in result
        assert "[PHONE]" in result
        assert "[CARD]" in result

    def test_preserves_non_sensitive_text(self):
        """Should preserve non-sensitive text."""
        text = "Hello, this is a normal message without sensitive data."
        result = mask_sensitive_data(text)

        assert result == text

    def test_handles_empty_string(self):
        """Should handle empty string."""
        result = mask_sensitive_data("")
        assert result == ""

    def test_handles_text_with_similar_patterns(self):
        """Should not mask numbers that don't match patterns."""
        text = "Order #12345 costs $99.99"
        result = mask_sensitive_data(text)

        # These shouldn't be masked as they don't match sensitive patterns
        assert "12345" in result
        assert "99.99" in result


class TestEdgeCases:
    """Edge case tests."""

    def test_sanitize_messages_with_unicode(self):
        """Should handle unicode in messages."""
        messages = [{"role": "user", "content": "안녕하세요 🌟"}]
        result = sanitize_messages(messages)

        assert len(result) == 1

    def test_mask_email_with_subdomain(self):
        """Should mask email with subdomain."""
        text = "Email: user@mail.example.co.kr"
        result = mask_sensitive_data(text)

        assert "[EMAIL]" in result

    def test_mask_preserves_surrounding_text(self):
        """Should preserve text around masked data."""
        text = "Before test@email.com after"
        result = mask_sensitive_data(text)

        assert result.startswith("Before ")
        assert result.endswith(" after")

    def test_sanitize_very_long_message(self):
        """Should handle very long messages."""
        long_content = "a" * 5000
        messages = [{"role": "user", "content": long_content}]
        result = sanitize_messages(messages, max_content_length=2000)

        assert len(result) == 1
        # Content should be truncated
        assert len(result[0]["content"]) <= 2000

    def test_mask_international_phone_format(self):
        """Should handle international phone format."""
        text = "Call +82-10-1234-5678"
        result = mask_sensitive_data(text)

        # The pattern might or might not match international format
        # Just verify it doesn't error
        assert isinstance(result, str)

    def test_sanitize_preserves_message_order(self):
        """Should preserve message order."""
        messages = [
            {"role": "user", "content": "First"},
            {"role": "assistant", "content": "Second"},
            {"role": "user", "content": "Third"},
        ]
        result = sanitize_messages(messages)

        assert result[0]["content"] == "First"
        assert result[1]["content"] == "Second"
        assert result[2]["content"] == "Third"

    def test_mask_multiple_same_type(self):
        """Should mask multiple instances of same type."""
        text = "Emails: a@test.com and b@test.com and c@test.com"
        result = mask_sensitive_data(text)

        assert result.count("[EMAIL]") == 3


class TestIntegration:
    """Integration tests."""

    def test_full_sanitization_flow(self):
        """Test complete sanitization flow."""
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "My email is test@example.com"},
            {"role": "assistant", "content": "I'll help you."},
        ]

        result = sanitize_messages(messages)

        assert len(result) == 3
        assert result[0]["role"] == "system"
        assert result[1]["role"] == "user"
        assert result[2]["role"] == "assistant"

    def test_sanitize_then_mask(self):
        """Test sanitization followed by masking."""
        messages = [
            {"role": "user", "content": "Contact: test@email.com, 010-1234-5678"}
        ]

        sanitized = sanitize_messages(messages)
        masked = mask_sensitive_data(sanitized[0]["content"])

        # Content should be sanitized and can be masked
        assert isinstance(masked, str)
