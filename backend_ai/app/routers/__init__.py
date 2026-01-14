"""
Backend AI Routers Package
Modularized route handlers for better maintainability.

Usage:
    from backend_ai.app.routers import register_all_blueprints

    app = Flask(__name__)
    register_all_blueprints(app)
"""
from flask import Flask
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

# Import blueprints with graceful fallback
_blueprints = []


try:
    from .core_routes import core_bp
    _blueprints.append((core_bp, "Core routes (index, health, capabilities)"))
except ImportError as e:
    logger.warning(f"Could not import core_routes: {e}")

try:
    from .chart_routes import chart_bp
    _blueprints.append((chart_bp, "Chart calculation (Saju, Astro)"))
except ImportError as e:
    logger.warning(f"Could not import chart_routes: {e}")

try:
    from .cache_routes import cache_bp
    _blueprints.append((cache_bp, "Cache and performance monitoring"))
except ImportError as e:
    logger.warning(f"Could not import cache_routes: {e}")

try:
    from .search_routes import search_bp
    _blueprints.append((search_bp, "RAG search (domain, hybrid)"))
except ImportError as e:
    logger.warning(f"Could not import search_routes: {e}")

try:
    from .stream_routes import stream_bp
    _blueprints.append((stream_bp, "Streaming AI fortune telling"))
except ImportError as e:
    logger.warning(f"Could not import stream_routes: {e}")

try:
    from .saju_routes import saju_bp
    _blueprints.append((saju_bp, "Saju streaming endpoints"))
except ImportError as e:
    logger.warning(f"Could not import saju_routes: {e}")

try:
    from .astrology_routes import astrology_bp
    _blueprints.append((astrology_bp, "Astrology streaming endpoints"))
except ImportError as e:
    logger.warning(f"Could not import astrology_routes: {e}")

try:
    from .health_routes import health_bp
    _blueprints.append((health_bp, "Health checks and monitoring"))
except ImportError as e:
    logger.warning(f"Could not import health_routes: {e}")

try:
    from .tarot_routes import tarot_bp
    _blueprints.append((tarot_bp, "Tarot card interpretation"))
except ImportError as e:
    logger.warning(f"Could not import tarot_routes: {e}")

try:
    from .dream_routes import dream_bp
    _blueprints.append((dream_bp, "Dream analysis"))
except ImportError as e:
    logger.warning(f"Could not import dream_routes: {e}")

try:
    from .iching_routes import iching_bp
    _blueprints.append((iching_bp, "I-Ching divination"))
except ImportError as e:
    logger.warning(f"Could not import iching_routes: {e}")

try:
    from .counseling_routes import counseling_bp
    _blueprints.append((counseling_bp, "Jungian counseling"))
except ImportError as e:
    logger.warning(f"Could not import counseling_routes: {e}")

try:
    from .rlhf_routes import rlhf_bp
    _blueprints.append((rlhf_bp, "RLHF feedback learning"))
except ImportError as e:
    logger.warning(f"Could not import rlhf_routes: {e}")




try:
    from .prediction_routes import prediction_bp
    _blueprints.append((prediction_bp, "Prediction engine"))
except ImportError as e:
    logger.warning(f"Could not import prediction_routes: {e}")

try:
    from .fortune_routes import fortune_bp
    _blueprints.append((fortune_bp, "Fortune score"))
except ImportError as e:
    logger.warning(f"Could not import fortune_routes: {e}")

try:
    from .theme_routes import theme_bp
    _blueprints.append((theme_bp, "Theme cross-filter"))
except ImportError as e:
    logger.warning(f"Could not import theme_routes: {e}")

try:
    from .compatibility_routes import compatibility_bp
    _blueprints.append((compatibility_bp, "Compatibility analysis"))
except ImportError as e:
    logger.warning(f"Could not import compatibility_routes: {e}")

try:
    from .numerology_routes import numerology_bp
    _blueprints.append((numerology_bp, "Numerology analysis"))
except ImportError as e:
    logger.warning(f"Could not import numerology_routes: {e}")

try:
    from .icp_routes import icp_bp
    _blueprints.append((icp_bp, "ICP interpersonal style"))
except ImportError as e:
    logger.warning(f"Could not import icp_routes: {e}")


# Export all blueprints
__all__ = [
    'register_all_blueprints',
    'get_all_blueprints'
]


def get_all_blueprints() -> List[Tuple[object, str]]:
    """Get all available blueprints with their descriptions.

    Returns:
        List of (blueprint, description) tuples
    """
    return _blueprints


def register_all_blueprints(app: Flask) -> None:
    """Register all routers with the Flask app.

    Args:
        app: Flask application instance
    """
    blueprints = get_all_blueprints()

    for blueprint, description in blueprints:
        try:
            app.register_blueprint(blueprint)
            logger.info(f"✓ Registered: {description} ({blueprint.name})")
        except Exception as e:
            logger.error(f"✗ Failed to register {description}: {e}")

    logger.info(f"✅ Total {len(blueprints)} routers registered")
