"""
Backend AI Utilities Package

Common utilities for lazy loading, data handling, error handling, etc.

Modules:
- lazy_loader: Centralized lazy loading for memory-intensive modules
- data_loader: JSON data loading with caching
- error_handler: Consistent error handling decorators and utilities
"""

# Export commonly used utilities
from .data_loader import (
    load_integration_data,
    load_jung_data,
    load_cross_analysis_cache,
    load_fusion_rules,
    load_spread_config,
    get_integration_context,
    get_lifespan_guidance,
    clear_all_caches,
    get_cache_stats,
    preload_all_data,
)

from .error_handler import (
    handle_errors,
    safe_get,
    log_error,
    ErrorContext,
)

from .json_safe import (
    safe_json_loads,
    safe_json_dumps,
    safe_json_load_file,
    validate_json_structure,
    JSONParseError,
    JSONSizeError,
)

__all__ = [
    # Data loading functions
    "load_integration_data",
    "load_jung_data",
    "load_cross_analysis_cache",
    "load_fusion_rules",
    "load_spread_config",

    # Context helpers
    "get_integration_context",
    "get_lifespan_guidance",

    # Cache management
    "clear_all_caches",
    "get_cache_stats",
    "preload_all_data",

    # Error handling
    "handle_errors",
    "safe_get",
    "log_error",
    "ErrorContext",

    # Safe JSON
    "safe_json_loads",
    "safe_json_dumps",
    "safe_json_load_file",
    "validate_json_structure",
    "JSONParseError",
    "JSONSizeError",
]
