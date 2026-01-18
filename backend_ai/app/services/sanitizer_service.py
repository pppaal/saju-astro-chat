"""
Sanitization Service
Input sanitization and data masking for security
"""

import re
import logging

logger = logging.getLogger("backend_ai")

def sanitize_messages(messages: list, max_content_length: int = 2000) -> list:
    """Sanitize a list of chat messages."""
    from backend_ai.app.sanitizer import sanitize_user_input, is_suspicious_input

    if not messages or not isinstance(messages, list):
        return []
    sanitized = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str) and content:
            # Check for suspicious patterns
            if is_suspicious_input(content):
                logger.warning(f"[SANITIZE] Suspicious content in {role} message")
            content = sanitize_user_input(content, max_length=max_content_length, allow_newlines=True)
        sanitized.append({"role": role, "content": content})
    return sanitized


def mask_sensitive_data(text: str) -> str:
    """Mask potentially sensitive data in logs."""
    # Mask email addresses
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL]', text)
    # Mask phone numbers (various formats)
    text = re.sub(r'\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b', '[PHONE]', text)
    # Mask credit card numbers
    text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]', text)
    return text
