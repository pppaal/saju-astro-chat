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
    from .fusion_routes import fusion_bp
    _blueprints.append((fusion_bp, "Fusion analysis (Saju + Astro + Tarot)"))
except ImportError as e:
    logger.warning(f"Could not import fusion_routes: {e}")

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
    from .memory_routes import memory_bp
    _blueprints.append((memory_bp, "User memory management"))
except ImportError as e:
    logger.warning(f"Could not import memory_routes: {e}")

try:
    from .badges_routes import badges_bp
    _blueprints.append((badges_bp, "Badge system"))
except ImportError as e:
    logger.warning(f"Could not import badges_routes: {e}")

try:
    from .agentic_routes import agentic_bp
    _blueprints.append((agentic_bp, "Agentic RAG"))
except ImportError as e:
    logger.warning(f"Could not import agentic_routes: {e}")

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
