"""
Error Handling Utilities
========================
Centralized error handling decorators and utilities.
"""

import functools
import logging
import traceback
from typing import Any, Callable, Optional, TypeVar, Union

logger = logging.getLogger("backend_ai")

T = TypeVar("T")


def handle_errors(
    default: Any = None,
    log_level: str = "warning",
    context: str = "",
    reraise: bool = False,
) -> Callable:
    """
    Decorator for consistent error handling across backend_ai modules.

    Args:
        default: Default value to return on error
        log_level: Logging level ("debug", "info", "warning", "error")
        context: Additional context for error messages
        reraise: If True, re-raise the exception after logging

    Returns:
        Decorated function with error handling

    Example:
        @handle_errors(default={}, log_level="warning")
        def _parallel_rag_query(rag, facts_data, domain):
            return rag.query(facts_data, domain_priority=domain)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., Union[T, Any]]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Union[T, Any]:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                func_name = func.__name__
                ctx = f"[{context}] " if context else ""
                msg = f"{ctx}{func_name} failed: {e}"

                log_func = getattr(logger, log_level, logger.warning)
                log_func(msg)

                if log_level == "error":
                    logger.debug(traceback.format_exc())

                if reraise:
                    raise

                # Return default (can be a callable for dynamic defaults)
                if callable(default) and not isinstance(default, type):
                    return default()
                return default

        return wrapper
    return decorator


def safe_get(data: dict, *keys: str, default: Any = None) -> Any:
    """
    Safely get nested dictionary values.

    Args:
        data: Dictionary to traverse
        *keys: Keys to traverse in order
        default: Default value if path doesn't exist

    Returns:
        Value at path or default

    Example:
        value = safe_get(facts, "saju", "facts", "dayMaster", default={})
    """
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    return current


def log_error(context: str, error: Exception, log_level: str = "error") -> None:
    """
    Log an error with consistent formatting.

    Args:
        context: Context identifier (e.g., "RAG", "Parallel", "Cache")
        error: The exception to log
        log_level: Logging level
    """
    msg = f"[{context}] Error: {error}"
    log_func = getattr(logger, log_level, logger.error)
    log_func(msg)


class ErrorContext:
    """
    Context manager for consistent error handling in code blocks.

    Example:
        with ErrorContext("RAG Query", default={}):
            result = rag.query(data)
    """

    def __init__(
        self,
        context: str,
        default: Any = None,
        log_level: str = "warning",
        reraise: bool = False,
    ):
        self.context = context
        self.default = default
        self.log_level = log_level
        self.reraise = reraise
        self.result: Any = None
        self.error: Optional[Exception] = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.error = exc_val
            log_error(self.context, exc_val, self.log_level)

            if self.reraise:
                return False  # Re-raise exception

            self.result = self.default
            return True  # Suppress exception

        return False
