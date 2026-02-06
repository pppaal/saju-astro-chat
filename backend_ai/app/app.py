import sys
import os
import json
import calendar
import re

# Load environment variables from backend_ai/.env file (explicit path with override)
from dotenv import load_dotenv
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_root, ".env"), override=True)

RAG_DISABLED = os.getenv("RAG_DISABLE") == "1"

# Add project root to Python path for standalone execution
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Ensure local app package dir is on sys.path for bare imports.
_app_dir = os.path.dirname(os.path.abspath(__file__))
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

import logging
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, date, timedelta
from pathlib import Path
from threading import Lock
from typing import Dict, Optional, Tuple
from uuid import uuid4

from flask import Flask, jsonify, g, request, Response, stream_with_context
from flask_cors import CORS
from flask_compress import Compress

from backend_ai.app.astro_parser import calculate_astrology_data
from backend_ai.app.fusion_logic import interpret_with_ai
from backend_ai.app.saju_parser import calculate_saju_data
from backend_ai.app.dream_logic import interpret_dream
from backend_ai.app.redis_cache import get_cache
from backend_ai.app.sanitizer import (
    sanitize_user_input,
    sanitize_dream_text,
    sanitize_name,
    validate_birth_data,
    is_suspicious_input,
)

# Phase 4.4: Utility functions moved to backend_ai/utils/
from backend_ai.utils.context_builders import (
    _build_saju_summary,
    _pick_astro_planet,
    _pick_ascendant,
    _pick_astro_aspect,
    _build_astro_summary,
    _build_detailed_saju,
    _build_detailed_astro,
    _build_advanced_astro_context,
)
from backend_ai.utils.text_utils import (
    _add_months,
    _format_month_name,
    _format_date_ymd,
    _count_timing_markers,
    _has_week_timing,
    _has_caution,
    _count_timing_markers_en,
    _has_week_timing_en,
    _has_caution_en,
    _ensure_ko_prefix,
    _format_korean_spacing,
    _insert_addendum,
    _chunk_text,
    _get_stream_chunk_size,
    _to_sse_event,
    _sse_error_response,
    _has_saju_payload,
    _has_astro_payload,
    _build_birth_format_message,
    _build_missing_payload_message,
)
from backend_ai.utils.evidence_builders import (
    _summarize_five_elements,
    _summarize_five_elements_en,
    _pick_sibsin,
    _planet_ko_name,
    _planet_en_name,
    _pick_any_planet,
    _build_saju_evidence_sentence,
    _build_saju_evidence_sentence_en,
    _build_astro_evidence_sentence,
    _build_astro_evidence_sentence_en,
    _build_missing_requirements_addendum,
    _build_rag_debug_addendum,
)
from backend_ai.utils.env_utils import (
    _is_truthy,
    _bool_env,
    _coerce_float,
    _coerce_int,
    _get_int_env,
    _clamp_temperature,
    _select_model_and_temperature,
)

# ============================================================================
# LAZY LOADERS - Moved to loaders/ package
# ============================================================================
from backend_ai.app.loaders import (
    _generate_with_gpt4,
    refine_with_gpt5mini,
    get_graph_rag,
    get_model,
    get_corpus_rag,
    get_persona_embed_rag,
    get_domain_rag,
    HAS_GRAPH_RAG,
    HAS_CORPUS_RAG,
    HAS_PERSONA_EMBED,
    HAS_DOMAIN_RAG,
    DOMAIN_RAG_DOMAINS,
    cast_hexagram,
    get_hexagram_interpretation,
    perform_iching_reading,
    search_iching_wisdom,
    get_all_hexagrams_summary,
    HAS_ICHING,
    get_tarot_hybrid_rag,
    HAS_TAROT,
    interpret_compatibility,
    interpret_compatibility_group,
    HAS_COMPATIBILITY,
    hybrid_search,
    build_rag_context,
    HAS_HYBRID_RAG,
    agentic_query,
    get_agent_orchestrator,
    get_entity_extractor,
    get_deep_traversal,
    HAS_AGENTIC,
    get_counseling_engine,
    CrisisDetector,
    HAS_COUNSELING,
)

# Services
from backend_ai.app.services.sanitizer_service import sanitize_messages, mask_sensitive_data
from backend_ai.app.services.integration_service import get_integration_context, _load_integration_data
from backend_ai.app.services.cross_analysis_service import _load_cross_analysis_cache

# Startup
from backend_ai.app.startup import warmup_models

from backend_ai.app.performance_optimizer import (
    track_performance,
    get_performance_stats,
    get_cache_health,
    suggest_optimizations,
)

# Gemini-level features
try:
    from backend_ai.app.realtime_astro import get_current_transits, get_transit_interpretation
    HAS_REALTIME = True
except ImportError:
    HAS_REALTIME = False
    # Fallback functions when realtime_astro is not available
    def get_current_transits():
        return {}
    def get_transit_interpretation(*args, **kwargs):
        return ""

try:
    from backend_ai.app.chart_generator import (
        generate_saju_table_svg,
        generate_natal_chart_svg,
        generate_full_chart_html,
        svg_to_base64,
    )
    HAS_CHARTS = True
except ImportError:
    HAS_CHARTS = False

try:
    from backend_ai.app.user_memory import get_user_memory, generate_user_id
    HAS_USER_MEMORY = True
except ImportError:
    HAS_USER_MEMORY = False

# I-Ching, Persona, Tarot - Now imported from loaders package above

# RLHF Feedback Learning System
try:
    from backend_ai.app.feedback_learning import get_feedback_learning
    HAS_RLHF = True
except ImportError:
    HAS_RLHF = False

# Badge System
try:
    from backend_ai.app.badge_system import get_badge_system, get_midjourney_prompts
    HAS_BADGES = True
except ImportError:
    HAS_BADGES = False

# Domain, Compatibility, Hybrid, Agentic, Counseling - Now imported from loaders package

# Proxy class that forwards calls to the actual CrisisDetector (kept for backwards compat)
class _CrisisDetectorProxy:
    @staticmethod
    def detect_crisis(text):
        detector = _get_crisis_detector()
        if detector:
            return detector.detect_crisis(text)
        return {"is_crisis": False, "max_severity": "none", "detections": [], "requires_immediate_action": False}

    @staticmethod
    def get_crisis_response(severity, locale="ko"):
        detector = _get_crisis_detector()
        if detector:
            return detector.get_crisis_response(severity, locale)
        return {"immediate_message": "", "follow_up": "", "closing": ""}

CrisisDetector = _CrisisDetectorProxy

# Prediction Engine (v5.0)
if os.getenv("PREDICTION_DISABLE") == "1":
    HAS_PREDICTION = False
    print("[app.py] Prediction engine disabled by PREDICTION_DISABLE")
else:
    try:
        from backend_ai.app.prediction_engine import (
            get_prediction_engine,
            predict_luck,
            find_best_date,
            get_full_forecast,
            EventType,
        )
        HAS_PREDICTION = True
    except ImportError:
        HAS_PREDICTION = False
        print("[app.py] Prediction engine not available")

# Theme Cross-Reference Filter (v5.1)
try:
    from backend_ai.app.theme_cross_filter import (
        get_theme_filter,
        filter_data_by_theme,
        get_theme_prompt_context,
    )
    HAS_THEME_FILTER = True
except ImportError:
    HAS_THEME_FILTER = False
    print("[app.py] Theme cross filter not available")

# Fortune Score Engine (v1.0) - Real-time saju+astrology scoring
try:
    from backend_ai.app.fortune_score_engine import (
        get_fortune_score_engine,
        calculate_fortune_score,
    )
    HAS_FORTUNE_SCORE = True
except ImportError:
    HAS_FORTUNE_SCORE = False
    print("[app.py] Fortune score engine not available")

# GraphRAG - Now imported from loaders package

# OpenAI Client for streaming endpoints with HTTP connection pooling
try:
    from openai import OpenAI
    import httpx
    _openai_key = os.getenv("OPENAI_API_KEY")
    if not _openai_key:
        print(f"[app.py] OPENAI_API_KEY not found in environment. Available env vars: {[k for k in os.environ.keys() if 'OPENAI' in k.upper() or 'API' in k.upper()]}")
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    # HTTP connection pooling for better performance
    # - limits: Connection pool limits (10 connections, 20 max)
    # - timeout: 60s total, 10s connect
    # - http2: Enable HTTP/2 for multiplexing
    _http_client = httpx.Client(
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        timeout=httpx.Timeout(60.0, connect=10.0),
        http2=True  # Enable HTTP/2 for better performance
    )

    openai_client = OpenAI(
        api_key=_openai_key,
        http_client=_http_client
    )
    OPENAI_AVAILABLE = True
    print(f"[app.py] OpenAI client initialized with connection pooling (key length: {len(_openai_key)})")
except Exception as e:
    openai_client = None
    OPENAI_AVAILABLE = False
    print(f"[app.py] OpenAI client not available: {e}")

# CorpusRAG - Now imported from loaders package

# Numerology System
try:
    from backend_ai.app.numerology_logic import (
        analyze_numerology,
        analyze_numerology_compatibility,
        calculate_full_numerology,
    )
    HAS_NUMEROLOGY = True
except ImportError:
    HAS_NUMEROLOGY = False
    print("[app.py] Numerology not available")

# ICP (Interpersonal Circumplex) System
try:
    from backend_ai.app.icp_logic import (
        analyze_icp_style,
        analyze_icp_compatibility,
        get_icp_questions,
        ICPAnalyzer,
    )
    HAS_ICP = True
except ImportError:
    HAS_ICP = False
    print("[app.py] ICP not available")

# ---------------------------------------------------------------------------
# Shared event loop for async operations in Flask sync context
# ---------------------------------------------------------------------------
import asyncio
import threading

_ASYNC_LOOP = None
_ASYNC_LOOP_LOCK = threading.Lock()

def _get_shared_loop():
    """Get or create a shared event loop running on a background thread."""
    global _ASYNC_LOOP
    if _ASYNC_LOOP is None or _ASYNC_LOOP.is_closed():
        with _ASYNC_LOOP_LOCK:
            if _ASYNC_LOOP is None or _ASYNC_LOOP.is_closed():
                _ASYNC_LOOP = asyncio.new_event_loop()
                t = threading.Thread(target=_ASYNC_LOOP.run_forever, daemon=True)
                t.start()
    return _ASYNC_LOOP

# Flask Application
app = Flask(__name__)

# Gzip compression - reduces response size by 30-50%
Compress(app)
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'text/plain',
    'application/json', 'application/javascript', 'application/xml'
]
app.config['COMPRESS_LEVEL'] = 6  # Balance between compression ratio and CPU usage
app.config['COMPRESS_MIN_SIZE'] = 500  # Only compress responses > 500 bytes

# Security: Request size limits to prevent DoS attacks
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max request size

# CORS configuration - restrict to specific origins for security
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://destinypal.com",
    "https://www.destinypal.com",
]
# Allow custom origins from environment variable
if os.getenv("CORS_ALLOWED_ORIGINS"):
    CORS_ORIGINS.extend(os.getenv("CORS_ALLOWED_ORIGINS").split(","))

CORS(
    app,
    origins=CORS_ORIGINS,
    allow_headers=["Content-Type", "Authorization", "X-API-KEY", "X-Request-ID"],
    methods=["GET", "POST", "OPTIONS"],
    supports_credentials=True,
    max_age=3600,
)

# Basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backend_ai")

# Optional Sentry (no-op if DSN missing)
try:
    import sentry_sdk

    if os.getenv("SENTRY_DSN"):
        sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
        logger.info("Sentry initialized for Flask backend.")
except ImportError:  # pragma: no cover
    logger.info("Sentry SDK not installed, skipping initialization")
except Exception as e:  # pragma: no cover
    # Log specific error type for debugging without exposing sensitive details
    logger.warning(f"Sentry init skipped: {type(e).__name__}")

# ===============================================================
# 🔌 REGISTER MODULAR BLUEPRINTS
# ===============================================================
# Blueprints are registered first, so they take priority over legacy routes below.
# Legacy routes are kept for backwards compatibility but will be shadowed.
try:
    from backend_ai.app.routers import register_all_blueprints
    register_all_blueprints(app)
    logger.info("✅ Modular blueprints registered successfully")
except ImportError as e:
    logger.warning(f"Could not import routers: {e}")
except Exception as e:
    logger.error(f"Failed to register blueprints: {e}")

# ===============================================================
# 🛡️ INPUT SANITIZATION - Moved to services/sanitizer_service.py
# 🚀 CROSS-ANALYSIS CACHE - Moved to services/cross_analysis_service.py
# 🔗 INTEGRATION ENGINE - Moved to services/integration_service.py
# ===============================================================

# ===============================================================
# 🧠 JUNG PSYCHOLOGY - Moved to services/jung_service.py
# 📦 SESSION CACHE - Moved to services/cache_service.py
# ===============================================================
from backend_ai.app.services.jung_service import (
    _load_jung_data,
    get_lifespan_guidance,
    get_active_imagination_prompts,
    get_crisis_resources,
)
from backend_ai.app.services.cache_service import (
    get_session_rag_cache,
    set_session_rag_cache,
    _cleanup_expired_sessions,
    _evict_lru_sessions,
    SESSION_CACHE_MAX_SIZE,
    SESSION_CACHE_TTL_MINUTES,
)
from backend_ai.app.services.normalizer_service import (
    normalize_day_master,
    _normalize_birth_date,
    _normalize_birth_time,
    _normalize_birth_payload,
)

# ============================================================================
# ChartService Wrapper Functions (Phase 4.6)
# These functions delegate to ChartService for backward compatibility
# ============================================================================

def get_cross_analysis_for_chart(saju_data: dict, astro_data: dict, theme: str = "life", locale: str = "ko") -> str:
    """Wrapper for ChartService.get_cross_analysis_for_chart()."""
    try:
        from backend_ai.services.chart_service import ChartService
        chart_service = ChartService()
        return chart_service.get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
    except ImportError as e:
        logger.warning(f"[get_cross_analysis_for_chart] ChartService not available: {e}")
        return ""
    except (ValueError, TypeError) as e:
        logger.warning(f"[get_cross_analysis_for_chart] Invalid input: {type(e).__name__}")
        return ""
    except Exception as e:
        # Log error type without potentially sensitive error message
        logger.error(f"[get_cross_analysis_for_chart] Unexpected error: {type(e).__name__}")
        return ""

def get_theme_fusion_rules(saju_data: dict, astro_data: dict, theme: str, locale: str = "ko", birth_year: int = None) -> str:
    """Wrapper for ChartService.get_theme_fusion_rules()."""
    try:
        from backend_ai.services.chart_service import ChartService
        chart_service = ChartService()
        return chart_service.get_theme_fusion_rules(saju_data, astro_data, theme, locale, birth_year)
    except ImportError as e:
        logger.warning(f"[get_theme_fusion_rules] ChartService not available: {e}")
        return ""
    except (ValueError, TypeError) as e:
        logger.warning(f"[get_theme_fusion_rules] Invalid input: {type(e).__name__}")
        return ""
    except Exception as e:
        # Log error type without potentially sensitive error message
        logger.error(f"[get_theme_fusion_rules] Unexpected error: {type(e).__name__}")
        return ""

# Functions moved to services:
# - get_active_imagination_prompts() -> services/jung_service.py
# - get_crisis_resources() -> services/jung_service.py
# - normalize_day_master() -> services/normalizer_service.py
# - _normalize_birth_date() -> services/normalizer_service.py
# - _normalize_birth_time() -> services/normalizer_service.py
# - _normalize_birth_payload() -> services/normalizer_service.py
# - _load_cross_analysis_cache() -> services/cross_analysis_service.py

# ============================================================================
# REMOVED IN PHASE 2.5: Chart analysis functions moved to ChartService
# ============================================================================
# Two functions have been moved to backend_ai/services/chart_service.py:
#   1. get_cross_analysis_for_chart() - 532 lines
#   2. get_theme_fusion_rules() - 369 lines
#
# Total lines removed: 901 lines
#
# Usage updated:
#   - prefetch_all_rag_data() now uses ChartService.get_cross_analysis_for_chart()
#   - get_theme_fusion_rules() was not called anywhere (internal helper)
#
# Original functions handled:
# - Cross-analysis: 9 types combining Saju and Astrology from GraphRAG cache
#   * Daymaster × Sun Sign
#   * Ten Gods × Planets
#   * Branch × House
#   * Relations × Aspects
#   * Shinsal × Asteroids
#   * Geokguk × House
#   * Daeun × Progressions
#   * 60 Ganji × Harmonics
#   * Gongmang × Draconic
# - Theme-specific fusion rules from JSON files:
#   * daily.json, monthly.json, new_year.json, next_year.json
#   * family.json, health.json, wealth.json, life_path.json
# - Multi-language support (Korean/English)
# - Planet-house combinations with timing/advice
# ============================================================================

# Session cache functions moved to services/cache_service.py:
# - _cleanup_expired_sessions()
# - _evict_lru_sessions()
# - get_session_rag_cache()
# - set_session_rag_cache()

def prefetch_all_rag_data(saju_data: dict, astro_data: dict, theme: str = "chat", locale: str = "ko") -> dict:
    """
    Pre-fetch relevant data from ALL RAG systems for a user's chart.
    Uses OptimizedRAGManager for better performance (target: p95 < 700ms).

    This function uses the new OptimizedRAGManager which provides:
    - Query result caching with LRU + TTL
    - Pre-warmed embedding caches
    - Connection pooling
    - Circuit breaker for resilience

    Async coroutines are dispatched to a shared background event loop
    via asyncio.run_coroutine_threadsafe(), avoiding the overhead of
    creating and destroying a new event loop on every request.

    Returns:
        Dict with all pre-fetched RAG data
    """
    try:
        from backend_ai.app.rag.optimized_manager import fetch_all_rag_data_optimized
        coro = fetch_all_rag_data_optimized(saju_data, astro_data, theme, locale)
    except ImportError:
        logger.warning("[PREFETCH] OptimizedRAGManager not available, using fallback")
        from backend_ai.app.rag_manager import prefetch_all_rag_data_async
        coro = prefetch_all_rag_data_async(saju_data, astro_data, theme, locale)

    loop = _get_shared_loop()
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout=15)

# get_session_rag_cache and set_session_rag_cache are imported from cache_service

# ===============================================================
# 🚀 MODEL WARMUP - Moved to startup/warmup.py
# ===============================================================
# Auto-warmup on import (now uses startup package)
# Use WARMUP_OPTIMIZED=1 for new OptimizedRAGManager warmup
if os.getenv("WARMUP_ON_START", "").lower() in ("1", "true", "yes"):
    if os.getenv("WARMUP_OPTIMIZED", "").lower() in ("1", "true", "yes"):
        from backend_ai.app.startup.warmup import warmup_optimized
        warmup_optimized()
    else:
        warmup_models()

# ===============================================================
# AUTH + RATE LIMITING - Using Redis-backed service
# ===============================================================
ADMIN_TOKEN = os.getenv("ADMIN_API_TOKEN")
UNPROTECTED_PATHS = {"/", "/health", "/health/full", "/counselor/init", "/api/destiny-story/generate-stream", "/api/counseling/crisis-check"}

# Import Redis-backed rate limiting service
from backend_ai.app.services.rate_limit_service import check_rate_limit

def _client_id() -> str:
    return (
        (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
        or request.remote_addr
        or "unknown"
    )

def _check_rate() -> Tuple[bool, Optional[float]]:
    """Check rate limit using Redis-backed service."""
    client = _client_id()
    return check_rate_limit(client)

def _require_auth() -> Optional[Tuple[dict, int]]:
    # Read token at request time to handle dotenv race conditions
    admin_token = os.getenv("ADMIN_API_TOKEN") or ADMIN_TOKEN
    if not admin_token:
        return None
    # Allow unauthenticated access to health endpoints for load balancers
    if request.path in UNPROTECTED_PATHS or request.method == "OPTIONS":
        return None
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    token = token or request.headers.get("X-API-KEY") or request.args.get("token")
    if token != admin_token:
        return {"status": "error", "message": "unauthorized"}, 401
    return None

@app.before_request
def before_request():
    g.request_id = str(uuid4())
    g._start_time = time.time()

    ok, retry_after = _check_rate()
    if not ok:
        logger.warning(
            f"[RATE_LIMIT] client={_client_id()} path={request.path} retry_after={retry_after}"
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "rate limit exceeded",
                    "retry_after": retry_after,
                }
            ),
            429,
        )

    auth_error = _require_auth()
    if auth_error:
        logger.warning(f"[AUTH] blocked client={_client_id()} path={request.path}")
        body, code = auth_error
        return jsonify(body), code

@app.after_request
def after_request(response):
    response.headers["X-Request-ID"] = getattr(g, "request_id", "")
    try:
        duration = time.time() - getattr(g, "_start_time", time.time())
        logger.info(
            f"[REQ] id={getattr(g, 'request_id', '')} path={request.path} "
            f"status={response.status_code} dur_ms={int(duration*1000)}"
        )
    except Exception as e:
        # Log the error type for debugging, don't silently swallow
        logger.debug(f"[REQ] Logging failed: {type(e).__name__}")
    return response

# ===============================================================
# GLOBAL ERROR HANDLERS - Unified format with frontend
# Format: { success: false, error: { code, message, status } }
# ===============================================================

from backend_ai.app.exceptions import BackendAIError

def _create_error_response(code: str, message: str, status: int, details: dict = None):
    """Create standardized error response aligned with frontend format."""
    response = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "status": status,
        },
    }
    request_id = getattr(g, "request_id", None)
    if request_id:
        response["error"]["request_id"] = request_id
    # Include details only in development
    if os.getenv("FLASK_ENV") == "development" and details:
        response["error"]["details"] = details
    return jsonify(response), status

@app.errorhandler(400)
def bad_request(e):
    return _create_error_response("BAD_REQUEST", "Invalid request. Please check your input.", 400)

@app.errorhandler(404)
def not_found(e):
    return _create_error_response("NOT_FOUND", "The requested resource was not found.", 404)

@app.errorhandler(405)
def method_not_allowed(e):
    return _create_error_response("BAD_REQUEST", "Method not allowed for this endpoint.", 405)

@app.errorhandler(413)
def payload_too_large(e):
    return _create_error_response("PAYLOAD_TOO_LARGE", "Request data is too large.", 413)

@app.errorhandler(429)
def rate_limited(e):
    return _create_error_response("RATE_LIMITED", "Too many requests. Please wait a moment.", 429)

@app.errorhandler(500)
def internal_error(e):
    logger.exception(f"[ERROR] Unhandled exception: {e}")
    return _create_error_response("INTERNAL_ERROR", "An unexpected error occurred. Please try again.", 500)

@app.errorhandler(BackendAIError)
def handle_backend_error(e):
    """Handle custom BackendAIError exceptions with unified format."""
    logger.warning(f"[BackendAIError] {e.code}: {e.message}")
    return jsonify(e.to_dict()), e.status_code

@app.errorhandler(Exception)
def handle_exception(e):
    """Catch-all for unhandled exceptions."""
    logger.exception(f"[ERROR] Unhandled exception: {e}")
    # Check if it's a BackendAIError subclass
    if isinstance(e, BackendAIError):
        return jsonify(e.to_dict()), e.status_code
    return _create_error_response("INTERNAL_ERROR", "An unexpected error occurred.", 500)

# ===============================================================
# MIGRATION SUMMARY (Phase 2-4)
# Route handlers and business logic have been moved to:
#   - Routers: core, chart, cache, counseling, dream, tarot, search, etc.
#   - Services: FortuneService, StreamingService, DreamService, etc.
# See REFACTORING_PROGRESS.md for detailed migration history.
# ===============================================================

# ===============================================================
# Phase 4: Consolidated migration notes
# All endpoints and functions have been moved to appropriate routers/services:
# - Tarot → tarot_routes.py, TarotService
# - Counseling → counseling_routes.py
# - Search → search_routes.py
# - Compatibility → compatibility_routes.py
# - Numerology → numerology_routes.py
# - ICP → icp_routes.py
# - Fortune Score → SajuCalculationService
# - Destiny Story → DestinyStoryService
# ===============================================================

def _calculate_simple_saju(birth_date: str, birth_time: str = "12:00") -> dict:
    """Delegate to SajuCalculationService.calculate_simple_saju()."""
    from backend_ai.services.saju_calculation_service import SajuCalculationService
    service = SajuCalculationService()
    return service.calculate_simple_saju(birth_date, birth_time)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}, compatibility={HAS_COMPATIBILITY}, hybrid_rag={HAS_HYBRID_RAG}, domain_rag={HAS_DOMAIN_RAG}")

    # 🚀 Use optimized warmup for better performance (p95 < 700ms target)
    try:
        from backend_ai.app.startup.warmup import warmup_optimized
        warmup_optimized()
    except ImportError:
        logger.warning("Optimized warmup not available, using legacy warmup")
        warmup_models()

    app.run(host="0.0.0.0", port=port, debug=True)
