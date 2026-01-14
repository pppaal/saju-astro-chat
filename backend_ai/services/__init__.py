"""
Backend AI Services Layer

This module provides business logic services that are independent of Flask routes.
Services contain the core fortune-telling, dream interpretation, and counseling logic.

Architecture:
    Request → Router → Service → Response

Services:
    - FortuneService: Fortune telling with Saju/Astrology/Tarot fusion
    - DreamService: Dream interpretation and chat
    - CounselingService: Jungian psychology counseling
    - ChartService: Saju and Astrology chart calculations

All services are stateless and can be used independently or imported by routes.
"""

__all__ = [
    'FortuneService',
    'StreamingService',
    'DreamService',
    'CounselingService',
    'ChartService',
]

# Lazy imports to avoid circular dependencies
def get_fortune_service():
    """Get FortuneService instance (lazy loaded)."""
    from .fortune_service import FortuneService
    return FortuneService()

def get_streaming_service():
    """Get StreamingService instance (lazy loaded)."""
    from .streaming_service import StreamingService
    return StreamingService()

def get_dream_service():
    """Get DreamService instance (lazy loaded)."""
    from .dream_service import DreamService
    return DreamService()

def get_counseling_service():
    """Get CounselingService instance (lazy loaded)."""
    from .counseling_service import CounselingService
    return CounselingService()

def get_chart_service():
    """Get ChartService instance (lazy loaded)."""
    from .chart_service import ChartService
    return ChartService()
