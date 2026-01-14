"""
Backend AI Utilities Package

Common utilities for lazy loading, data handling, etc.

Modules:
- lazy_loader: Centralized lazy loading for memory-intensive modules
- data_loader: JSON data loading with caching
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
]
