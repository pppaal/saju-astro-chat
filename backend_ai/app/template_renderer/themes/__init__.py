"""
Theme-specific rendering functions for destiny-map.
Handles theme sections, summaries, and report generation.
"""

from .sections import get_theme_sections
from .summary import get_theme_summary
from .render import render_template_report

__all__ = [
    "get_theme_sections",
    "get_theme_summary",
    "render_template_report",
]
