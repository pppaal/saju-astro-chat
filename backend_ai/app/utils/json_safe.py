"""
Safe JSON Parsing Utilities
===========================
Provides safe JSON parsing with size limits and error handling
to prevent DoS attacks and injection vulnerabilities.
"""

import json
import logging
from typing import Any, Optional, TypeVar, Union

logger = logging.getLogger("backend_ai")

T = TypeVar("T")

# Default limits
DEFAULT_MAX_SIZE = 1_000_000  # 1MB
DEFAULT_MAX_DEPTH = 50


class JSONParseError(Exception):
    """Raised when JSON parsing fails safely."""
    pass


class JSONSizeError(JSONParseError):
    """Raised when JSON payload exceeds size limit."""
    pass


class JSONDepthError(JSONParseError):
    """Raised when JSON exceeds maximum nesting depth."""
    pass


def safe_json_loads(
    text: str,
    default: Optional[T] = None,
    max_size: int = DEFAULT_MAX_SIZE,
    raise_on_error: bool = False,
    context: str = "",
) -> Union[Any, T]:
    """
    Safely parse JSON with size limits and error handling.

    Args:
        text: JSON string to parse
        default: Default value to return on error (if raise_on_error=False)
        max_size: Maximum allowed size in bytes (default 1MB)
        raise_on_error: If True, raise exception on error instead of returning default
        context: Additional context for error logging

    Returns:
        Parsed JSON data or default value on error

    Raises:
        JSONSizeError: If text exceeds max_size
        JSONParseError: If JSON is invalid (only if raise_on_error=True)

    Example:
        # Safe with default
        data = safe_json_loads(cached_text, default={})

        # Strict mode
        try:
            data = safe_json_loads(user_input, raise_on_error=True, max_size=100_000)
        except JSONParseError as e:
            handle_error(e)
    """
    ctx = f"[{context}] " if context else ""

    # Check size limit
    if len(text) > max_size:
        msg = f"{ctx}JSON payload too large: {len(text)} bytes (max: {max_size})"
        logger.warning(msg)
        if raise_on_error:
            raise JSONSizeError(msg)
        return default

    # Check for empty/None input
    if not text or not text.strip():
        if raise_on_error:
            raise JSONParseError(f"{ctx}Empty JSON input")
        return default

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        msg = f"{ctx}JSON parse error at position {e.pos}: {e.msg}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg) from e
        return default
    except (TypeError, ValueError) as e:
        msg = f"{ctx}JSON parse error: {e}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg) from e
        return default


def safe_json_dumps(
    data: Any,
    default: str = "{}",
    max_size: int = DEFAULT_MAX_SIZE,
    raise_on_error: bool = False,
    context: str = "",
    **kwargs,
) -> str:
    """
    Safely serialize to JSON with size limits.

    Args:
        data: Data to serialize
        default: Default string to return on error
        max_size: Maximum allowed output size
        raise_on_error: If True, raise on error
        context: Additional context for logging
        **kwargs: Additional arguments passed to json.dumps

    Returns:
        JSON string or default on error
    """
    ctx = f"[{context}] " if context else ""

    try:
        result = json.dumps(data, **kwargs)

        if len(result) > max_size:
            msg = f"{ctx}JSON output too large: {len(result)} bytes (max: {max_size})"
            logger.warning(msg)
            if raise_on_error:
                raise JSONSizeError(msg)
            return default

        return result
    except (TypeError, ValueError) as e:
        msg = f"{ctx}JSON serialize error: {e}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg) from e
        return default


def safe_json_load_file(
    filepath: str,
    default: Optional[T] = None,
    max_size: int = DEFAULT_MAX_SIZE * 10,  # 10MB for files
    raise_on_error: bool = False,
    encoding: str = "utf-8",
    context: str = "",
) -> Union[Any, T]:
    """
    Safely load JSON from a file with size limits.

    Args:
        filepath: Path to JSON file
        default: Default value on error
        max_size: Maximum file size to read
        raise_on_error: If True, raise on error
        encoding: File encoding
        context: Additional context for logging

    Returns:
        Parsed JSON data or default
    """
    import os

    ctx = f"[{context}] " if context else ""

    try:
        # Check file size before reading
        file_size = os.path.getsize(filepath)
        if file_size > max_size:
            msg = f"{ctx}JSON file too large: {filepath} ({file_size} bytes, max: {max_size})"
            logger.warning(msg)
            if raise_on_error:
                raise JSONSizeError(msg)
            return default

        with open(filepath, "r", encoding=encoding) as f:
            content = f.read()

        return safe_json_loads(
            content,
            default=default,
            max_size=max_size,
            raise_on_error=raise_on_error,
            context=context or filepath,
        )
    except FileNotFoundError:
        msg = f"{ctx}JSON file not found: {filepath}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg)
        return default
    except PermissionError:
        msg = f"{ctx}Permission denied reading JSON file: {filepath}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg)
        return default
    except OSError as e:
        msg = f"{ctx}Error reading JSON file {filepath}: {e}"
        logger.warning(msg)
        if raise_on_error:
            raise JSONParseError(msg) from e
        return default


def validate_json_structure(
    data: Any,
    required_keys: Optional[list] = None,
    expected_type: Optional[type] = None,
    context: str = "",
) -> bool:
    """
    Validate JSON data structure.

    Args:
        data: Parsed JSON data
        required_keys: List of required keys (for dict)
        expected_type: Expected type (dict, list, etc.)
        context: Additional context for logging

    Returns:
        True if valid, False otherwise
    """
    ctx = f"[{context}] " if context else ""

    # Type check
    if expected_type is not None:
        if not isinstance(data, expected_type):
            logger.warning(f"{ctx}Expected {expected_type.__name__}, got {type(data).__name__}")
            return False

    # Required keys check (only for dicts)
    if required_keys and isinstance(data, dict):
        missing = [k for k in required_keys if k not in data]
        if missing:
            logger.warning(f"{ctx}Missing required keys: {missing}")
            return False

    return True
