"""Input sanitization utilities to prevent prompt injection attacks."""

import os
import re
import logging
from datetime import datetime
from typing import Optional, Tuple

logger = logging.getLogger("backend_ai.sanitizer")

# Configurable limits via environment variables
MAX_USER_INPUT_LENGTH = int(os.getenv("SANITIZER_MAX_INPUT", "1200"))
MAX_DREAM_LENGTH = int(os.getenv("SANITIZER_MAX_DREAM", "2000"))
MAX_NAME_LENGTH = int(os.getenv("SANITIZER_MAX_NAME", "100"))

# Patterns that could be used for prompt injection
INJECTION_PATTERNS = [
    r'```[\s\S]*?```',           # Code blocks
    r'\[SYSTEM[^\]]*\]',          # System prompt markers
    r'\[INST[^\]]*\]',            # Instruction markers (Llama-style)
    r'<\|im_start\|>.*?<\|im_end\|>',  # ChatML markers
    r'<\|system\|>',              # System markers
    r'<\|user\|>',                # User markers
    r'<\|assistant\|>',           # Assistant markers
    r'###\s*(System|User|Assistant)',  # Role markers
    r'Human:\s*',                 # Anthropic-style markers
    r'Assistant:\s*',             # Anthropic-style markers
    r'(?i)ignore\s+(previous|above|all)\s+instructions?',  # Ignore instructions
    r'(?i)disregard\s+(previous|above|all)',  # Disregard instructions
    r'(?i)forget\s+(everything|all|previous)',  # Forget commands
    r'(?i)new\s+instructions?:',  # New instruction injection
    r'(?i)override\s+(system|instructions?)',  # Override attempts
]

# Characters that should be escaped in prompts
ESCAPE_CHARS = {
    '\\': '\\\\',
    '"': '\\"',
    '\n': ' ',  # Replace newlines with spaces in user input
    '\r': '',
    '\t': ' ',
}


def sanitize_user_input(
    text: str,
    max_length: int = None,
    allow_newlines: bool = False,
    log_sanitization: bool = True
) -> str:
    """
    Sanitize user input to prevent prompt injection attacks.

    Args:
        text: Raw user input text
        max_length: Maximum allowed length (default 1200 chars)
        allow_newlines: Whether to preserve newlines (default False)
        log_sanitization: Whether to log when sanitization occurs

    Returns:
        Sanitized text safe for prompt injection
    """
    if not text:
        return ""

    # Use configurable default if not specified
    if max_length is None:
        max_length = MAX_USER_INPUT_LENGTH

    original_text = text
    modified = False

    # 1. Remove dangerous patterns
    for pattern in INJECTION_PATTERNS:
        new_text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        if new_text != text:
            modified = True
            text = new_text

    # 2. Escape special characters
    for char, replacement in ESCAPE_CHARS.items():
        if char == '\n' and allow_newlines:
            continue
        if char in text:
            text = text.replace(char, replacement)
            modified = True

    # 3. Remove excessive whitespace
    text = re.sub(r'\s{3,}', '  ', text)

    # 4. Truncate with ellipsis if too long
    if len(text) > max_length:
        text = text[:max_length - 3] + '...'
        modified = True

    # 5. Strip leading/trailing whitespace
    text = text.strip()

    # Log if sanitization occurred
    if modified and log_sanitization:
        logger.warning(
            f"[Sanitizer] Input modified: {len(original_text)} → {len(text)} chars"
        )

    return text


def sanitize_messages(messages: list, max_content_length: int = 2000) -> list:
    """
    Sanitize a list of chat messages.

    Args:
        messages: List of message dicts with role/content
        max_content_length: Max length for each message content

    Returns:
        Sanitized list of messages
    """
    if not messages or not isinstance(messages, list):
        return []

    sanitized = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str) and content:
            if is_suspicious_input(content):
                logger.warning(f"[Sanitize] Suspicious content in {role} message")
            content = sanitize_user_input(content, max_length=max_content_length, allow_newlines=True)
        sanitized.append({"role": role, "content": content})

    return sanitized


def sanitize_dream_text(text: str, max_length: int = None) -> str:
    """
    Sanitize dream description text.
    Allows newlines for multi-paragraph dream descriptions.

    Args:
        text: Raw dream description
        max_length: Maximum length (default from SANITIZER_MAX_DREAM env var)

    Returns:
        Sanitized dream text
    """
    if max_length is None:
        max_length = MAX_DREAM_LENGTH

    return sanitize_user_input(
        text,
        max_length=max_length,
        allow_newlines=True,
        log_sanitization=True
    )


def sanitize_name(name: str, max_length: int = None) -> str:
    """
    Sanitize user name input.

    Args:
        name: User provided name
        max_length: Maximum name length (default from SANITIZER_MAX_NAME env var)

    Returns:
        Sanitized name
    """
    if not name:
        return ""

    if max_length is None:
        max_length = MAX_NAME_LENGTH

    # Remove anything that's not alphanumeric, space, or common name characters
    # Allow Korean, Japanese, Chinese characters
    sanitized = re.sub(r'[^\w\s\u3131-\uD79D\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\'-]', '', name)

    return sanitized[:max_length].strip()


def sanitize_json_value(value: str) -> str:
    """
    Sanitize a value that will be embedded in JSON.

    Args:
        value: Value to sanitize for JSON embedding

    Returns:
        JSON-safe string
    """
    if not value:
        return ""

    # Escape JSON special characters
    value = value.replace('\\', '\\\\')
    value = value.replace('"', '\\"')
    value = value.replace('\n', '\\n')
    value = value.replace('\r', '\\r')
    value = value.replace('\t', '\\t')

    return value


def validate_birth_data(
    birth_date: Optional[str],
    birth_time: Optional[str],
    birth_year: Optional[int] = None,
    strict: bool = True
) -> Tuple[bool, str]:
    """
    Validate birth data inputs with strict calendar validation.

    Args:
        birth_date: Date string (YYYY-MM-DD format expected)
        birth_time: Time string (HH:MM format expected)
        birth_year: Optional year as integer
        strict: If True, validate that date/time are real calendar values

    Returns:
        Tuple of (is_valid, error_message)
    """
    errors = []

    # Validate birth_date format
    if birth_date:
        date_pattern = r'^\d{4}-\d{2}-\d{2}$'
        if not re.match(date_pattern, birth_date):
            errors.append(f"Invalid birth_date format: {birth_date}")
        else:
            # Check reasonable year range (1900-2100)
            year = int(birth_date[:4])
            if year < 1900 or year > 2100:
                errors.append(f"Birth year out of range: {year}")

            # Strict validation: ensure date actually exists on calendar
            if strict:
                try:
                    datetime.strptime(birth_date, "%Y-%m-%d")
                except ValueError as e:
                    errors.append(f"Invalid calendar date: {birth_date} ({e})")

    # Validate birth_time format
    if birth_time:
        time_pattern = r'^\d{2}:\d{2}(:\d{2})?$'
        if not re.match(time_pattern, birth_time):
            errors.append(f"Invalid birth_time format: {birth_time}")
        elif strict:
            # Strict validation: ensure time is valid (00:00 - 23:59)
            try:
                parts = birth_time.split(":")
                hour = int(parts[0])
                minute = int(parts[1])
                second = int(parts[2]) if len(parts) > 2 else 0

                if not (0 <= hour <= 23):
                    errors.append(f"Invalid hour: {hour} (must be 0-23)")
                if not (0 <= minute <= 59):
                    errors.append(f"Invalid minute: {minute} (must be 0-59)")
                if not (0 <= second <= 59):
                    errors.append(f"Invalid second: {second} (must be 0-59)")
            except (ValueError, IndexError) as e:
                errors.append(f"Invalid time format: {birth_time} ({e})")

    # Validate birth_year if provided separately
    if birth_year is not None:
        if not isinstance(birth_year, int):
            try:
                birth_year = int(birth_year)
            except (ValueError, TypeError):
                errors.append(f"Birth year must be an integer: {birth_year}")
                birth_year = None

        if birth_year is not None and (birth_year < 1900 or birth_year > 2100):
            errors.append(f"Birth year out of range: {birth_year}")

    if errors:
        return False, "; ".join(errors)

    return True, ""


def validate_birth_date_strict(date_str: str) -> Tuple[bool, str]:
    """
    Strictly validate a birth date string.

    Ensures the date:
    - Matches YYYY-MM-DD format
    - Is a real calendar date (no Feb 30, etc.)
    - Is within reasonable range (1900-2100)
    - Is not in the future

    Args:
        date_str: Date string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not date_str:
        return False, "Birth date is required"

    # Format check
    date_pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(date_pattern, date_str):
        return False, f"Invalid format: expected YYYY-MM-DD, got {date_str}"

    # Parse and validate
    try:
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as e:
        return False, f"Invalid calendar date: {e}"

    # Year range check
    year = parsed_date.year
    if year < 1900:
        return False, f"Birth year too old: {year} (minimum 1900)"
    if year > 2100:
        return False, f"Birth year too far in future: {year} (maximum 2100)"

    # Future date check
    if parsed_date > datetime.now():
        return False, f"Birth date cannot be in the future: {date_str}"

    return True, ""


def validate_birth_time_strict(time_str: str) -> Tuple[bool, str]:
    """
    Strictly validate a birth time string.

    Ensures the time:
    - Matches HH:MM or HH:MM:SS format
    - Has valid hour (0-23), minute (0-59), second (0-59)

    Args:
        time_str: Time string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not time_str:
        return True, ""  # Birth time is optional

    # Format check
    time_pattern = r'^(\d{2}):(\d{2})(?::(\d{2}))?$'
    match = re.match(time_pattern, time_str)
    if not match:
        return False, f"Invalid format: expected HH:MM or HH:MM:SS, got {time_str}"

    hour = int(match.group(1))
    minute = int(match.group(2))
    second = int(match.group(3)) if match.group(3) else 0

    if not (0 <= hour <= 23):
        return False, f"Invalid hour: {hour} (must be 0-23)"
    if not (0 <= minute <= 59):
        return False, f"Invalid minute: {minute} (must be 0-59)"
    if not (0 <= second <= 59):
        return False, f"Invalid second: {second} (must be 0-59)"

    return True, ""


# Pre-compile patterns for performance
_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def is_suspicious_input(text: str) -> bool:
    """
    Quick check if input contains suspicious patterns.
    Use for logging/monitoring without blocking.

    Args:
        text: Text to check

    Returns:
        True if suspicious patterns detected
    """
    if not text:
        return False

    for pattern in _COMPILED_PATTERNS:
        if pattern.search(text):
            return True

    return False
