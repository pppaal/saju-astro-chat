import sys
import os

# Add project root to Python path for standalone execution
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import logging
import time
from collections import defaultdict
from datetime import datetime
from typing import Optional, Tuple
from uuid import uuid4

from flask import Flask, jsonify, g, request
from flask_cors import CORS

from backend_ai.app.astro_parser import calculate_astrology_data
from backend_ai.app.fusion_logic import interpret_with_ai
from backend_ai.app.saju_parser import calculate_saju_data
from backend_ai.app.dream_logic import interpret_dream
from backend_ai.app.redis_cache import get_cache
from backend_ai.model.fusion_generate import (
    _generate_with_gpt4,
    refine_with_gpt5mini,
)
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

try:
    from backend_ai.app.iching_rag import (
        cast_hexagram,
        get_hexagram_interpretation,
        perform_iching_reading,
        search_iching_wisdom,
        get_all_hexagrams_summary,
    )
    HAS_ICHING = True
except ImportError:
    HAS_ICHING = False

try:
    from backend_ai.app.persona_embeddings import get_persona_embed_rag
    HAS_PERSONA_EMBED = True
except ImportError:
    HAS_PERSONA_EMBED = False

try:
    from backend_ai.app.tarot_hybrid_rag import get_tarot_hybrid_rag
    HAS_TAROT = True
except ImportError:
    HAS_TAROT = False

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

# Agentic RAG System (Next Level Features)
try:
    from backend_ai.app.agentic_rag import (
        agentic_query,
        get_agent_orchestrator,
        get_entity_extractor,
        get_deep_traversal,
        EntityExtractor,
        DeepGraphTraversal,
        AgentOrchestrator,
    )
    HAS_AGENTIC = True
except ImportError:
    HAS_AGENTIC = False
    print("[app.py] Agentic RAG not available")

# Jungian Counseling Engine
try:
    from backend_ai.app.counseling_engine import get_counseling_engine, CrisisDetector
    HAS_COUNSELING = True
except ImportError:
    HAS_COUNSELING = False
    print("[app.py] Counseling engine not available")

# Prediction Engine (v5.0)
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

# Flask Application
app = Flask(__name__)

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
except Exception as e:  # pragma: no cover
    logger.warning(f"Sentry init skipped: {e}")

# Simple token gate + rate limiting
ADMIN_TOKEN = os.getenv("ADMIN_API_TOKEN")
RATE_LIMIT = int(os.getenv("API_RATE_PER_MIN", "60"))
RATE_WINDOW_SECONDS = 60
_rate_state = defaultdict(list)  # ip -> timestamps
UNPROTECTED_PATHS = {"/", "/health", "/health/full"}


def _client_id() -> str:
    return (
        (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
        or request.remote_addr
        or "unknown"
    )


def _check_rate() -> Tuple[bool, Optional[float]]:
    now = time.time()
    client = _client_id()
    window = [t for t in _rate_state[client] if now - t < RATE_WINDOW_SECONDS]
    _rate_state[client] = window
    if len(window) >= RATE_LIMIT:
        retry_after = max(0, RATE_WINDOW_SECONDS - (now - window[0]))
        return False, retry_after
    window.append(now)
    _rate_state[client] = window
    return True, None


def _require_auth() -> Optional[Tuple[dict, int]]:
    if not ADMIN_TOKEN:
        return None
    # Allow unauthenticated access to health endpoints for load balancers
    if request.path in UNPROTECTED_PATHS or request.method == "OPTIONS":
        return None
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    token = token or request.headers.get("X-API-KEY") or request.args.get("token")
    if token != ADMIN_TOKEN:
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
    except Exception:
        pass
    return response


# Health check
@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "ok", "message": "DestinyPal Fusion AI backend is running!"})


# Fusion endpoint with caching and performance optimization
@app.route("/ask", methods=["POST"])
def ask():
    """
    Accepts saju/astro/tarot facts + theme/locale/prompt and runs fusion logic.
    Enhanced with Redis caching and performance monitoring.
    """
    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        tarot_data = data.get("tarot") or {}
        theme = data.get("theme", "daily")
        locale = data.get("locale", "en")
        prompt = (data.get("prompt") or "")[:500]  # clamp extra instructions

        logger.info(f"[ASK] id={g.request_id} theme={theme} locale={locale}")

        facts = {
            "theme": theme,
            "saju": saju_data,
            "astro": astro_data,
            "tarot": tarot_data,
            "prompt": prompt,
            "locale": locale,
        }

        # Performance monitoring
        start_time = time.time()
        result = interpret_with_ai(facts)
        duration_ms = int((time.time() - start_time) * 1000)

        logger.info(f"[ASK] id={g.request_id} completed in {duration_ms}ms cache_hit={result.get('cached', False)}")

        # Add performance metadata
        if isinstance(result, dict):
            result["performance"] = {
                "duration_ms": duration_ms,
                "cached": result.get("cached", False)
            }

        return jsonify({"status": "success", "data": result})

    except Exception as e:
        logger.exception(f"[ERROR] id={getattr(g, 'request_id', '')} /ask failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Saju calc
@app.route("/calc_saju", methods=["POST"])
def calc_saju():
    try:
        body = request.get_json(force=True)
        birth_date = body.get("birth_date")
        birth_time = body.get("birth_time")
        gender = body.get("gender", "male")

        result = calculate_saju_data(birth_date, birth_time, gender)
        return jsonify({"status": "success", "saju": result})
    except Exception as e:
        logger.exception(f"[ERROR] /calc_saju failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Astrology calc
@app.route("/calc_astro", methods=["POST"])
def calc_astro():
    try:
        body = request.get_json(force=True)
        result = calculate_astrology_data(
            {
                "year": body.get("year"),
                "month": body.get("month"),
                "day": body.get("day"),
                "hour": body.get("hour"),
                "minute": body.get("minute"),
                "latitude": body.get("latitude"),
                "longitude": body.get("longitude"),
            }
        )
        return jsonify({"status": "success", "astro": result})
    except Exception as e:
        logger.exception(f"[ERROR] /calc_astro failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Dream interpretation endpoint
@app.route("/dream", methods=["POST"])
def dream_interpret():
    """
    Dream interpretation endpoint.
    Accepts dream text, symbols, emotions, themes, and cultural context.
    """
    try:
        data = request.get_json(force=True)
        logger.info(f"[DREAM] id={g.request_id} Processing dream interpretation")

        # Extract dream data
        birth_data = data.get("birth") or {}
        locale = data.get("locale", "en")
        facts = {
            "dream": data.get("dream", ""),
            "symbols": data.get("symbols", []),
            "emotions": data.get("emotions", []),
            "themes": data.get("themes", []),
            "context": data.get("context", []),
            "locale": locale,
            # Cultural symbols
            "koreanTypes": data.get("koreanTypes", []),
            "koreanLucky": data.get("koreanLucky", []),
            "chinese": data.get("chinese", []),
            "islamicTypes": data.get("islamicTypes", []),
            "islamicBlessed": data.get("islamicBlessed", []),
            "western": data.get("western", []),
            "hindu": data.get("hindu", []),
            "nativeAmerican": data.get("nativeAmerican", []),
            "japanese": data.get("japanese", []),
            # Optional birth data
            "birth": birth_data,
        }

        start_time = time.time()
        result = interpret_dream(facts)
        duration_ms = int((time.time() - start_time) * 1000)

        logger.info(f"[DREAM] id={g.request_id} completed in {duration_ms}ms")

        if isinstance(result, dict):
            result["performance"] = {"duration_ms": duration_ms}

        # 💾 Save to user memory (MOAT)
        if HAS_USER_MEMORY and birth_data:
            try:
                user_id = generate_user_id(birth_data)
                memory = get_user_memory(user_id)
                interpretation = result.get("interpretation", "") if isinstance(result, dict) else str(result)
                record_id = memory.save_consultation(
                    theme="dream",
                    locale=locale,
                    birth_data=birth_data,
                    fusion_result=interpretation,
                    service_type="dream",
                )
                result["user_id"] = user_id
                result["record_id"] = record_id
                logger.info(f"[DREAM] Saved to memory: {record_id}")
            except Exception as mem_e:
                logger.warning(f"[DREAM] Memory save failed: {mem_e}")

        return jsonify({"status": "success", "data": result})

    except Exception as e:
        logger.exception(f"[ERROR] id={getattr(g, 'request_id', '')} /dream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Cache stats and management
@app.route("/cache/stats", methods=["GET"])
def cache_stats():
    """Get cache statistics."""
    try:
        cache = get_cache()
        stats = cache.stats()
        return jsonify({"status": "success", "cache": stats})
    except Exception as e:
        logger.exception(f"[ERROR] /cache/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/cache/clear", methods=["POST"])
def cache_clear():
    """Clear cache (admin only)."""
    try:
        cache = get_cache()
        pattern = request.json.get("pattern", "fusion:*") if request.json else "fusion:*"
        cleared = cache.clear(pattern)
        return jsonify({"status": "success", "cleared": cleared})
    except Exception as e:
        logger.exception(f"[ERROR] /cache/clear failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Performance monitoring endpoints
@app.route("/performance/stats", methods=["GET"])
def performance_stats():
    """Get performance statistics with optimization suggestions."""
    try:
        stats = get_performance_stats()
        suggestions = suggest_optimizations(stats)
        cache_health = get_cache_health()

        return jsonify({
            "status": "success",
            "performance": stats,
            "cache_health": cache_health,
            "suggestions": suggestions
        })
    except Exception as e:
        logger.exception(f"[ERROR] /performance/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check for Railway/load balancer."""
    return jsonify({"status": "ok"})


@app.route("/health/full", methods=["GET"])
def full_health_check():
    """Comprehensive health check including performance metrics."""
    try:
        perf_stats = get_performance_stats()
        cache_health = get_cache_health()

        # Calculate overall health score
        health_score = 100

        # Penalize for low cache hit rate
        if perf_stats["cache_hit_rate"] < 30:
            health_score -= 20

        # Penalize for slow responses
        if perf_stats["avg_response_time_ms"] > 2000:
            health_score -= 15

        # Penalize for cache issues
        if cache_health["health_score"] < 80:
            health_score -= 15

        status_text = "excellent" if health_score >= 90 else "good" if health_score >= 70 else "degraded"

        return jsonify({
            "status": "success",
            "health_score": health_score,
            "status_text": status_text,
            "performance": perf_stats,
            "cache": cache_health,
            "timestamp": time.time()
        })
    except Exception as e:
        logger.exception(f"[ERROR] /health/full failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# GEMINI-LEVEL ENDPOINTS
# ===============================================================

# Real-time transit data
@app.route("/transits", methods=["GET"])
def get_transits():
    """Get current planetary transits (real-time)."""
    if not HAS_REALTIME:
        return jsonify({"status": "error", "message": "Realtime astro not available"}), 501

    try:
        locale = request.args.get("locale", "en")
        transits = get_current_transits()
        interpretation = get_transit_interpretation(transits, locale)

        return jsonify({
            "status": "success",
            "transits": transits,
            "interpretation": interpretation,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /transits failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Chart generation
@app.route("/charts/saju", methods=["POST"])
def generate_saju_chart():
    """Generate Saju Paljja table SVG."""
    if not HAS_CHARTS:
        return jsonify({"status": "error", "message": "Chart generator not available"}), 501

    try:
        data = request.get_json(force=True)
        pillars = data.get("pillars", {})
        day_master = data.get("dayMaster", {})
        five_elements = data.get("fiveElements", {})

        svg = generate_saju_table_svg(pillars, day_master, five_elements)

        return jsonify({
            "status": "success",
            "svg": svg,
            "base64": svg_to_base64(svg),
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/saju failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/charts/natal", methods=["POST"])
def generate_natal_chart():
    """Generate natal chart wheel SVG."""
    if not HAS_CHARTS:
        return jsonify({"status": "error", "message": "Chart generator not available"}), 501

    try:
        data = request.get_json(force=True)
        planets = data.get("planets", [])
        ascendant = data.get("ascendant", 0)
        size = data.get("size", 400)

        svg = generate_natal_chart_svg(planets, ascendant=ascendant, size=size)

        return jsonify({
            "status": "success",
            "svg": svg,
            "base64": svg_to_base64(svg),
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/natal failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/charts/full", methods=["POST"])
def generate_full_charts():
    """Generate complete HTML with all charts."""
    if not HAS_CHARTS:
        return jsonify({"status": "error", "message": "Chart generator not available"}), 501

    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})
        locale = data.get("locale", "en")

        html = generate_full_chart_html(saju_data, astro_data, locale)

        return jsonify({
            "status": "success",
            "html": html,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /charts/full failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# User memory endpoints
@app.route("/memory/save", methods=["POST"])
def save_consultation():
    """Save consultation to user memory."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        theme = data.get("theme", "")
        locale = data.get("locale", "en")
        result = data.get("result", "")

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)

        record_id = memory.save_consultation(
            theme=theme,
            locale=locale,
            birth_data=birth_data,
            fusion_result=result,
        )

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "record_id": record_id,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/save failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/memory/context", methods=["POST"])
def get_memory_context():
    """Get user context for personalized readings."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        theme = data.get("theme", "life_path")
        locale = data.get("locale", "en")

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)

        context = memory.build_context_for_llm(theme, locale)
        profile = memory.get_profile()
        history = memory.get_history(limit=5)

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "context": context,
            "profile": profile.__dict__ if profile else None,
            "history": history,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/context failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/memory/feedback", methods=["POST"])
def save_feedback():
    """Save user feedback for a consultation (MOAT - improves recommendations)."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        record_id = data.get("record_id", "")
        feedback = data.get("feedback", "")  # Text feedback
        rating = data.get("rating")  # 1-5 stars or thumbs up/down (1 or 5)

        if not record_id:
            return jsonify({"status": "error", "message": "record_id required"}), 400

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)
        memory.save_feedback(record_id, feedback, rating)

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "record_id": record_id,
            "message": "Feedback saved successfully",
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/feedback failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/memory/history", methods=["POST"])
def get_history():
    """Get user consultation history."""
    if not HAS_USER_MEMORY:
        return jsonify({"status": "error", "message": "User memory not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_data = data.get("birth", {})
        limit = data.get("limit", 10)

        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)
        history = memory.get_history(limit=limit)
        profile = memory.get_profile()

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "history": history,
            "consultation_count": profile.consultation_count if profile else 0,
            "dominant_themes": profile.dominant_themes if profile else [],
        })
    except Exception as e:
        logger.exception(f"[ERROR] /memory/history failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# I CHING (PREMIUM) ENDPOINTS
# ===============================================================

@app.route("/iching/cast", methods=["POST"])
def iching_cast():
    """Cast I Ching hexagram (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        result = cast_hexagram()
        return jsonify({
            "status": "success",
            "cast": result,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/cast failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/iching/interpret", methods=["POST"])
def iching_interpret():
    """Get hexagram interpretation (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        hexagram_num = data.get("hexagram", 1)
        theme = data.get("theme", "general")
        locale = data.get("locale", "ko")
        changing_lines = data.get("changingLines", [])
        saju_element = data.get("sajuElement")

        interp = get_hexagram_interpretation(
            hexagram_num=hexagram_num,
            theme=theme,
            locale=locale,
            changing_lines=changing_lines,
            saju_element=saju_element,
        )

        return jsonify({
            "status": "success",
            "interpretation": interp,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/interpret failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/iching/reading", methods=["POST"])
def iching_reading():
    """Perform complete I Ching reading (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        question = data.get("question", "")
        theme = data.get("theme", "general")
        locale = data.get("locale", "ko")
        saju_element = data.get("sajuElement")
        birth_data = data.get("birth") or {}

        reading = perform_iching_reading(
            question=question,
            theme=theme,
            locale=locale,
            saju_element=saju_element,
        )

        # 💾 Save to user memory (MOAT)
        if HAS_USER_MEMORY and birth_data:
            try:
                user_id = generate_user_id(birth_data)
                memory = get_user_memory(user_id)
                # Extract interpretation text
                interpretation = reading.get("combined_interpretation", "") if isinstance(reading, dict) else str(reading)
                hexagram_name = reading.get("hexagram", {}).get("korean_name", "") if isinstance(reading, dict) else ""
                record_id = memory.save_consultation(
                    theme=f"iching:{theme}",
                    locale=locale,
                    birth_data=birth_data,
                    fusion_result=f"[{hexagram_name}] {interpretation}",
                    key_insights=[question] if question else [],
                    service_type="iching",
                )
                reading["user_id"] = user_id
                reading["record_id"] = record_id
                logger.info(f"[ICHING] Saved to memory: {record_id}")
            except Exception as mem_e:
                logger.warning(f"[ICHING] Memory save failed: {mem_e}")

        return jsonify({
            "status": "success",
            "reading": reading,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/reading failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/iching/search", methods=["GET"])
def iching_search():
    """Search I Ching wisdom."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        query = request.args.get("q", "")
        top_k = int(request.args.get("top_k", 5))

        results = search_iching_wisdom(query, top_k=top_k)

        return jsonify({
            "status": "success",
            "results": results,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/search failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/iching/hexagrams", methods=["GET"])
def iching_hexagrams():
    """Get all 64 hexagrams summary."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        locale = request.args.get("locale", "ko")
        summaries = get_all_hexagrams_summary(locale=locale)

        return jsonify({
            "status": "success",
            "hexagrams": summaries,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/hexagrams failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# TAROT (PREMIUM) ENDPOINTS
# ===============================================================

# Theme mapping: Frontend IDs → Backend theme names
TAROT_THEME_MAPPING = {
    # Direct matches
    "love": "love",
    "career": "career",
    "health": "health",
    "spiritual": "spiritual",
    "daily": "daily",
    "monthly": "monthly",
    "life_path": "life_path",
    "family": "family",

    # Frontend uses hyphens, backend uses underscores/different names
    "love-relationships": "love",
    "career-work": "career",
    "money-finance": "wealth",  # Key mapping: frontend uses money-finance, backend uses wealth
    "well-being-health": "health",
    "spiritual-growth": "spiritual",
    "daily-reading": "daily",
    "general-insight": "life_path",  # General maps to life_path
    "decisions-crossroads": "life_path",  # Maps to life_path (contains crossroads sub_topic)
    "self-discovery": "life_path",  # Maps to life_path (contains true_self sub_topic)
}

# Sub-topic mapping for themes that use different sub_topic names
TAROT_SUBTOPIC_MAPPING = {
    # decisions-crossroads spreads → life_path sub_topics
    ("decisions-crossroads", "simple-choice"): ("life_path", "crossroads"),
    ("decisions-crossroads", "decision-cross"): ("life_path", "major_decision"),
    ("decisions-crossroads", "path-ahead"): ("life_path", "life_direction"),

    # self-discovery spreads → life_path sub_topics
    ("self-discovery", "inner-self"): ("life_path", "true_self"),
    ("self-discovery", "personal-growth"): ("life_path", "life_lessons"),

    # general-insight spreads → various themes
    ("general-insight", "quick-reading"): ("daily", "one_card"),
    ("general-insight", "past-present-future"): ("daily", "three_card"),
    ("general-insight", "celtic-cross"): ("life_path", "life_direction"),
}


def _map_tarot_theme(category: str, spread_id: str) -> tuple:
    """Map frontend theme/spread to backend theme/sub_topic"""
    # Check specific mapping first
    key = (category, spread_id)
    if key in TAROT_SUBTOPIC_MAPPING:
        return TAROT_SUBTOPIC_MAPPING[key]

    # Fall back to theme-only mapping
    mapped_theme = TAROT_THEME_MAPPING.get(category, category)
    return (mapped_theme, spread_id)


@app.route("/api/tarot/interpret", methods=["POST"])
def tarot_interpret():
    """
    Premium tarot interpretation using Hybrid RAG + Gemini.
    Supports optional saju/astrology context for enhanced readings.
    """
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT] id={g.request_id} Interpreting tarot reading")

        category = data.get("category", "general")
        spread_id = data.get("spread_id", "three_card")
        spread_title = data.get("spread_title", "Three Card Spread")
        cards = data.get("cards", [])
        user_question = data.get("user_question", "")
        language = data.get("language", "ko")

        # Optional context for enhanced readings (from destiny-map)
        saju_context = data.get("saju_context")  # e.g., day_master, five_elements
        astro_context = data.get("astro_context")  # e.g., sun_sign, moon_sign

        # Premium personalization (Tier 4-6)
        birthdate = data.get("birthdate")  # User's birthdate 'YYYY-MM-DD' for birth card
        moon_phase = data.get("moon_phase")  # Current moon phase for realtime context

        if not cards:
            return jsonify({"status": "error", "message": "No cards provided"}), 400

        start_time = time.time()
        hybrid_rag = get_tarot_hybrid_rag()

        # Convert cards to expected format
        drawn_cards = [
            {"name": c.get("name", ""), "isReversed": c.get("is_reversed", False)}
            for c in cards
        ]

        # Build enhanced context if saju/astro data is available
        enhanced_question = user_question
        if saju_context or astro_context:
            context_parts = []
            if saju_context:
                day_master = saju_context.get("day_master", {})
                if day_master:
                    context_parts.append(f"일간: {day_master.get('element', '')} {day_master.get('stem', '')}")
                five_elements = saju_context.get("five_elements", {})
                if five_elements:
                    dominant = max(five_elements.items(), key=lambda x: x[1])[0] if five_elements else None
                    if dominant:
                        context_parts.append(f"주요 오행: {dominant}")

            if astro_context:
                sun_sign = astro_context.get("sun_sign", "")
                moon_sign = astro_context.get("moon_sign", "")
                if sun_sign:
                    context_parts.append(f"태양 별자리: {sun_sign}")
                if moon_sign:
                    context_parts.append(f"달 별자리: {moon_sign}")

            if context_parts:
                enhanced_question = f"[배경: {', '.join(context_parts)}] {user_question}"

        # Generate reading using GPT-4 (same as destiny-map)
        # Apply theme/spread mapping (frontend IDs → backend names)
        mapped_theme, mapped_spread = _map_tarot_theme(category, spread_id)
        logger.info(f"[TAROT] Mapped {category}/{spread_id} → {mapped_theme}/{mapped_spread}")

        # Step 1: Build RAG context from hybrid_rag (use premium context if birthdate available)
        if birthdate:
            rag_context = hybrid_rag.build_premium_reading_context(
                theme=mapped_theme,
                sub_topic=mapped_spread,
                drawn_cards=drawn_cards,
                question=enhanced_question,
                birthdate=birthdate,
                moon_phase=moon_phase
            )
            logger.info(f"[TAROT] Using premium context with birthdate={birthdate}")
        else:
            rag_context = hybrid_rag.build_reading_context(
                theme=mapped_theme,
                sub_topic=mapped_spread,
                drawn_cards=drawn_cards,
                question=enhanced_question
            )

        # Step 2: Build premium tarot prompt with current date context
        is_korean = language == "ko"
        cards_str = ", ".join([
            f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}"
            for c in drawn_cards
        ])

        # Current date info for time-relevant advice
        now = datetime.now()
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        weekday_names_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        month_names_ko = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]

        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
            season = "봄" if now.month in [3, 4, 5] else "여름" if now.month in [6, 7, 8] else "가을" if now.month in [9, 10, 11] else "겨울"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")
            season = "Spring" if now.month in [3, 4, 5] else "Summer" if now.month in [6, 7, 8] else "Fall" if now.month in [9, 10, 11] else "Winter"

        # Try to get moon phase from advanced rules
        moon_phase_hint = ""
        try:
            moon_guidance = hybrid_rag.advanced_rules.get_current_moon_advice("waxing_crescent")  # placeholder
            if moon_guidance:
                moon_phase_hint = f"\n- 달 위상 에너지: {moon_guidance.get('energy', '')}"
        except Exception:
            pass

        tarot_prompt = f"""당신은 프리미엄 타로 마스터입니다. 깊이 있는 통찰과 영적 지혜로 해석해주세요.

## 현재 시간 정보
- 오늘 날짜: {date_str}
- 계절: {season}{moon_phase_hint}

## 리딩 정보
- 카테고리: {category}
- 스프레드: {spread_title}
- 뽑힌 카드: {cards_str}
- 질문: {enhanced_question or "일반 운세"}

## RAG 컨텍스트 (카드 의미, 조합, 규칙)
{rag_context}

## 응답 지침
1. 각 카드의 위치별 의미를 깊이 있게 해석
2. 카드 간의 상호작용과 시너지 설명
3. 실질적이고 실천 가능한 조언 제공
4. {('한국어로 자연스럽게 작성' if is_korean else 'Write in English')}
5. 800-1200자 분량으로 작성

전문적이면서도 따뜻한 어조로 해석해주세요."""

        # Step 3: Generate with GPT-4
        try:
            raw_reading = _generate_with_gpt4(tarot_prompt, max_tokens=2000, temperature=0.2)
        except Exception as llm_e:
            logger.warning(f"[TAROT] GPT-4 failed: {llm_e}, using fallback")
            raw_reading = f"카드 해석: {cards_str}. {rag_context[:500]}"

        # Step 4: Polish with GPT-4o-mini
        try:
            reading_text = refine_with_gpt5mini(raw_reading, f"tarot_{category}", language)
        except Exception as polish_e:
            logger.warning(f"[TAROT] GPT polish failed: {polish_e}")
            reading_text = raw_reading

        # Get card insights
        card_insights = []
        for i, card in enumerate(drawn_cards):
            card_name = card.get("name", "")
            is_reversed = card.get("isReversed", False)
            position = cards[i].get("position", f"Card {i+1}") if i < len(cards) else f"Card {i+1}"

            insights = hybrid_rag.get_card_insights(card_name)

            card_insight = {
                "position": position,
                "card_name": card_name,
                "is_reversed": is_reversed,
                "interpretation": reading_text[:300] if i == 0 else "",  # Just first part for first card
                "spirit_animal": insights.get("spirit_animal"),
                "chakra": None,
                "element": None,
                "shadow": insights.get("shadow_work")
            }

            # Extract chakra
            chakras = insights.get("chakras", [])
            if chakras:
                first_chakra = chakras[0]
                card_insight["chakra"] = {
                    "name": first_chakra.get("korean", first_chakra.get("name", "")),
                    "color": first_chakra.get("color", "#8a2be2"),
                    "guidance": first_chakra.get("healing_affirmation", "")
                }

            # Extract element from astrology
            astro = insights.get("astrology", {})
            if astro:
                card_insight["element"] = astro.get("element")

            card_insights.append(card_insight)

        # Get advanced analysis
        advanced = hybrid_rag.get_advanced_analysis(drawn_cards)

        # Build response
        result = {
            "overall_message": reading_text,
            "card_insights": card_insights,
            "guidance": advanced.get("elemental_analysis", {}).get("dominant_advice", "카드의 지혜에 귀 기울이세요."),
            "affirmation": "나는 우주의 지혜를 신뢰합니다.",
            "combinations": [],
            "followup_questions": hybrid_rag.advanced_rules.get_followup_questions(category, "neutral") if hasattr(hybrid_rag, 'advanced_rules') else []
        }

        # Add combination if found
        combo = advanced.get("special_combination")
        if combo:
            result["combinations"].append({
                "cards": combo.get("cards", []),
                "meaning": combo.get("korean", combo.get("meaning", ""))
            })

        # Add premium personalization if birthdate provided
        logger.info(f"[TAROT] Checking birthdate for personalization: birthdate={birthdate}")
        if birthdate:
            logger.info(f"[TAROT] Starting personalization with birthdate={birthdate}")
            try:
                birth_card = hybrid_rag.get_birth_card(birthdate)
                logger.info(f"[TAROT] Got birth_card: {birth_card.get('primary_card', 'NONE')}")
                year_card = hybrid_rag.get_year_card(birthdate)
                logger.info(f"[TAROT] Got year_card: {year_card.get('year_card', 'NONE')}")
                personalization = hybrid_rag.get_personalized_reading(drawn_cards, birthdate)
                narrative = hybrid_rag.get_reading_narrative(drawn_cards, mapped_theme)

                result["personalization"] = {
                    "birth_card": {
                        "name": birth_card.get("primary_card"),
                        "korean": birth_card.get("korean"),
                        "traits": birth_card.get("traits", [])
                    },
                    "year_card": {
                        "name": year_card.get("year_card"),
                        "korean": year_card.get("year_card_korean"),
                        "theme": year_card.get("korean"),
                        "advice": year_card.get("advice")
                    },
                    "personal_connections": personalization.get("personal_connections", [])
                }

                result["narrative"] = {
                    "opening_hook": narrative.get("opening_hook"),
                    "tone": narrative.get("tone", {}).get("mood"),
                    "resolution": narrative.get("resolution"),
                    "card_connections": hybrid_rag.get_card_connections(drawn_cards)[:5]
                }
            except Exception as pers_e:
                logger.warning(f"[TAROT] Personalization failed: {pers_e}")

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[TAROT] id={g.request_id} completed in {duration_ms}ms")
        result["performance"] = {"duration_ms": duration_ms}

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/interpret failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tarot/chat", methods=["POST"])
def tarot_chat():
    """
    Tarot chat consultation - follow-up questions about a reading.
    """
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT_CHAT] id={g.request_id} Processing chat message")

        messages = data.get("messages", [])
        context = data.get("context", {})
        language = data.get("language", "ko")

        if not messages:
            return jsonify({"status": "error", "message": "No messages provided"}), 400

        start_time = time.time()
        hybrid_rag = get_tarot_hybrid_rag()

        # Build context string from reading
        spread_title = context.get("spread_title", "")
        cards = context.get("cards", [])
        overall_message = context.get("overall_message", "")
        guidance = context.get("guidance", "")

        cards_str = ", ".join([
            f"{c.get('name', '')}{'(역방향)' if c.get('is_reversed') else ''}"
            for c in cards
        ])

        # Build conversation for Gemini
        conversation_history = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content}")

        last_user_message = messages[-1].get("content", "") if messages else ""

        # Check for specific intents
        wants_more_cards = any(kw in last_user_message.lower() for kw in ["더 뽑", "추가", "more card", "draw more"])
        asks_about_timing = any(kw in last_user_message.lower() for kw in ["언제", "시기", "when", "timing"])

        # Current date for contextual responses
        now = datetime.now()
        is_korean = language == "ko"
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")

        # Generate response using GPT-4 (same as destiny-map)
        chat_prompt = f"""당신은 전문 타로 상담사입니다. 사용자의 질문에 친근하고 통찰력 있게 답변하세요.

## 오늘 날짜: {date_str}

## 현재 리딩 정보
- 스프레드: {spread_title}
- 뽑힌 카드: {cards_str}
- 전체 메시지: {overall_message[:500]}
- 조언: {guidance}

## 대화 기록
{chr(10).join(conversation_history[-6:])}

## 현재 질문
{last_user_message}

{'사용자가 카드를 더 뽑고 싶어합니다. 현재 리딩에 집중하도록 안내하면서, 필요하다면 새 리딩을 시작하도록 권유하세요.' if wants_more_cards else ''}
{'타이밍에 대한 질문입니다. 카드에서 읽을 수 있는 시기적 힌트를 제공하세요.' if asks_about_timing else ''}

친근하게 2-3문장으로 답변하세요."""

        try:
            # Step 1: Generate with GPT-4
            raw_reply = _generate_with_gpt4(chat_prompt, max_tokens=500, temperature=0.3)
            # Step 2: Light polish with GPT-4o-mini
            reply = refine_with_gpt5mini(raw_reply, "tarot_chat", language)
        except Exception as llm_e:
            logger.warning(f"[TAROT_CHAT] GPT-4 failed: {llm_e}")
            reply = f"현재 리딩에서 {cards_str}이(가) 나왔습니다. {guidance}"

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[TAROT_CHAT] id={g.request_id} completed in {duration_ms}ms")

        return jsonify({
            "reply": reply,
            "performance": {"duration_ms": duration_ms}
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/chat failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tarot/themes", methods=["GET"])
def tarot_themes():
    """Get available tarot themes and spreads."""
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        hybrid_rag = get_tarot_hybrid_rag()
        themes = hybrid_rag.get_available_themes()

        result = []
        for theme in themes:
            sub_topics = hybrid_rag.get_sub_topics(theme)
            result.append({
                "id": theme,
                "sub_topics": sub_topics
            })

        return jsonify({
            "status": "success",
            "themes": result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/themes failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tarot/search", methods=["GET"])
def tarot_search():
    """Semantic search across tarot knowledge."""
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        query = request.args.get("q", "")
        top_k = int(request.args.get("top_k", 5))
        category = request.args.get("category")

        hybrid_rag = get_tarot_hybrid_rag()
        results = hybrid_rag.search_advanced_rules(query, top_k=top_k, category=category)

        return jsonify({
            "status": "success",
            "results": results
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/search failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# JUNGIAN COUNSELING ENDPOINTS (심리상담)
# ===============================================================

@app.route("/api/counseling/session", methods=["POST"])
def counseling_session():
    """
    Create or continue a counseling session.
    융 심리학 기반 통합 심리상담 세션.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data = request.get_json(force=True)
        message = data.get("message", "")
        session_id = data.get("session_id")
        divination_context = data.get("divination_context")  # 사주/점성/타로 컨텍스트

        if not message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        engine = get_counseling_engine()

        # 세션 가져오기 또는 생성
        session = None
        if session_id:
            session = engine.get_session(session_id)

        # 메시지 처리
        result = engine.process_message(
            user_message=message,
            session=session,
            divination_context=divination_context
        )

        return jsonify({
            "status": "success",
            "response": result["response"],
            "session_id": result["session_id"],
            "phase": result.get("phase", "opening"),
            "crisis_detected": result.get("crisis_detected", False),
            "severity": result.get("severity"),
            "should_continue": result.get("should_continue", True)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/session failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/crisis-check", methods=["POST"])
def counseling_crisis_check():
    """
    Check text for crisis indicators.
    위기 신호 감지 (자살/자해 등).
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data = request.get_json(force=True)
        text = data.get("text", "")

        if not text:
            return jsonify({"status": "error", "message": "Text is required"}), 400

        result = CrisisDetector.detect_crisis(text)

        response_data = {
            "status": "success",
            "is_crisis": result["is_crisis"],
            "max_severity": result["max_severity"],
            "requires_immediate_action": result["requires_immediate_action"]
        }

        # 위기 상황이면 리소스 정보 추가
        if result["is_crisis"]:
            response_data["resources"] = CrisisDetector.EMERGENCY_RESOURCES.get("ko", {})
            response_data["crisis_response"] = CrisisDetector.get_crisis_response(
                result["max_severity"]
            )

        return jsonify(response_data)

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/crisis-check failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/therapeutic-question", methods=["GET"])
def counseling_therapeutic_question():
    """
    Get a therapeutic question.
    치료적 질문 가져오기.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        theme = request.args.get("theme")  # love, career, identity, etc.
        archetype = request.args.get("archetype")  # shadow, anima, persona, etc.
        question_type = request.args.get("type", "deepening")  # deepening, challenging, shadow, etc.

        engine = get_counseling_engine()
        question = engine.get_therapeutic_question(
            theme=theme,
            archetype=archetype,
            question_type=question_type
        )

        return jsonify({
            "status": "success",
            "question": question,
            "theme": theme,
            "archetype": archetype,
            "type": question_type
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/therapeutic-question failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/emotional-response", methods=["POST"])
def counseling_emotional_response():
    """
    Get an emotional/empathic response.
    감동적인 공감 응답 생성.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data = request.get_json(force=True)
        emotion = data.get("emotion", "")
        situation = data.get("situation", "")

        if not emotion:
            return jsonify({"status": "error", "message": "Emotion is required"}), 400

        engine = get_counseling_engine()
        response = engine.get_emotional_response(emotion, situation)

        return jsonify({
            "status": "success",
            "responses": response
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/emotional-response failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/integrated", methods=["POST"])
def counseling_integrated():
    """
    Integrated counseling with saju/astrology/tarot context.
    사주+점성+타로 통합 심리상담.
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling module not available"}), 501

    try:
        data = request.get_json(force=True)
        message = data.get("message", "")
        session_id = data.get("session_id")

        # 점술 데이터
        saju_data = data.get("saju")
        astro_data = data.get("astro")
        tarot_data = data.get("tarot")

        if not message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        engine = get_counseling_engine()

        # 세션 가져오기 또는 생성
        session = None
        if session_id:
            session = engine.get_session(session_id)

        # 점술 컨텍스트 구성
        divination_context = {}
        if saju_data:
            divination_context["saju"] = str(saju_data)
        if astro_data:
            divination_context["astrology"] = str(astro_data)
        if tarot_data:
            divination_context["tarot"] = str(tarot_data)

        # 메시지 처리
        result = engine.process_message(
            user_message=message,
            session=session,
            divination_context=divination_context if divination_context else None
        )

        return jsonify({
            "status": "success",
            "response": result["response"],
            "session_id": result["session_id"],
            "phase": result.get("phase", "opening"),
            "crisis_detected": result.get("crisis_detected", False),
            "should_continue": result.get("should_continue", True)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/integrated failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# RLHF FEEDBACK LEARNING ENDPOINTS
# ===============================================================

@app.route("/rlhf/stats", methods=["GET"])
def rlhf_stats():
    """Get RLHF feedback statistics."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        fl = get_feedback_learning()
        stats = fl.get_stats()

        return jsonify({
            "status": "success",
            "stats": stats,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/analyze", methods=["GET"])
def rlhf_analyze():
    """Analyze feedback patterns to identify improvement areas."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme")
        days = int(request.args.get("days", 30))

        fl = get_feedback_learning()
        analysis = fl.analyze_feedback_patterns(theme=theme, days=days)

        return jsonify({
            "status": "success",
            "analysis": analysis,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/analyze failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/suggestions", methods=["GET"])
def rlhf_suggestions():
    """Get improvement suggestions based on feedback analysis."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        fl = get_feedback_learning()
        suggestions = fl.get_improvement_suggestions()

        return jsonify({
            "status": "success",
            "suggestions": suggestions,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/suggestions failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/fewshot", methods=["GET"])
def rlhf_fewshot():
    """Get Few-shot examples for a theme."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme", "life_path")
        locale = request.args.get("locale", "ko")
        top_k = int(request.args.get("top_k", 3))

        fl = get_feedback_learning()
        examples = fl.get_fewshot_examples(theme, locale, top_k)
        formatted = fl.format_fewshot_prompt(theme, locale, top_k)

        return jsonify({
            "status": "success",
            "examples": examples,
            "formatted_prompt": formatted,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/fewshot failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/export", methods=["GET"])
def rlhf_export():
    """Export training data for fine-tuning."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        min_rating = int(request.args.get("min_rating", 4))
        limit = int(request.args.get("limit", 500))

        fl = get_feedback_learning()
        training_data = fl.export_training_data(min_rating=min_rating, limit=limit)

        return jsonify({
            "status": "success",
            "count": len(training_data),
            "training_data": training_data,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/export failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/feedback", methods=["POST"])
def rlhf_record_feedback():
    """
    Record feedback directly to RLHF system with full consultation context.

    This is the enhanced version of /memory/feedback that captures
    more context for learning.
    """
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        data = request.get_json(force=True)

        record_id = data.get("record_id", "")
        user_id = data.get("user_id", "anonymous")
        rating = data.get("rating")
        feedback_text = data.get("feedback", "")

        # Full consultation context for learning
        consultation_data = {
            "theme": data.get("theme", "unknown"),
            "locale": data.get("locale", "ko"),
            "service_type": data.get("service_type", "fusion"),
            "summary": data.get("summary", ""),
            "key_insights": data.get("key_insights", []),
            "prompt": data.get("user_question", ""),
            "context": data.get("context", ""),
        }

        if not record_id or rating is None:
            return jsonify({
                "status": "error",
                "message": "record_id and rating are required"
            }), 400

        fl = get_feedback_learning()
        result = fl.record_feedback(
            record_id=record_id,
            user_id=user_id,
            rating=rating,
            feedback_text=feedback_text,
            consultation_data=consultation_data,
        )

        # Handle return value (may include badges)
        if isinstance(result, tuple):
            feedback_id, new_badges = result
        else:
            feedback_id = result
            new_badges = []

        # Also update rule weights if rules were used
        rules_used = data.get("rules_used", [])
        if rules_used and rating:
            fl.adjust_rule_weights(
                theme=consultation_data["theme"],
                rules_used=rules_used,
                rating=rating,
            )

        logger.info(f"[RLHF] Recorded feedback {feedback_id}: rating={rating}, theme={consultation_data['theme']}")

        # Build response with badge info
        response = {
            "status": "success",
            "feedback_id": feedback_id,
            "message": "Feedback recorded for RLHF learning",
        }

        # Include new badges if any were earned
        if new_badges:
            locale = data.get("locale", "ko")
            response["new_badges"] = [
                {
                    "id": b.id,
                    "name": b.name_ko if locale == "ko" else b.name_en,
                    "description": b.description_ko if locale == "ko" else b.description_en,
                    "rarity": b.rarity.value,
                    "image_path": b.image_path,
                    "points": b.points,
                }
                for b in new_badges
            ]
            response["badges_earned_count"] = len(new_badges)

        return jsonify(response)
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/feedback failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/rlhf/weights", methods=["GET"])
def rlhf_weights():
    """Get adjusted rule weights for a theme."""
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        theme = request.args.get("theme")

        fl = get_feedback_learning()
        weights = fl.get_rule_weights(theme)

        return jsonify({
            "status": "success",
            "theme": theme,
            "weights": weights,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/weights failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# BADGE SYSTEM ENDPOINTS
# ===============================================================

@app.route("/badges/all", methods=["GET"])
def badges_all():
    """Get all available badges."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        locale = request.args.get("locale", "ko")
        badge_system = get_badge_system()
        badges = badge_system.get_all_badges(locale)

        return jsonify({
            "status": "success",
            "badges": badges,
            "total": len(badges),
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/all failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/badges/user", methods=["POST"])
def badges_user():
    """Get user's badge summary."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        data = request.get_json(force=True)
        user_id = data.get("user_id", "")
        locale = data.get("locale", "ko")

        # Can also generate user_id from birth data
        if not user_id and data.get("birth"):
            from backend_ai.app.user_memory import generate_user_id
            user_id = generate_user_id(data["birth"])

        if not user_id:
            return jsonify({"status": "error", "message": "user_id or birth data required"}), 400

        badge_system = get_badge_system()
        summary = badge_system.get_user_badge_summary(user_id, locale)

        return jsonify({
            "status": "success",
            **summary,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/user failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/badges/midjourney-prompts", methods=["GET"])
def badges_midjourney():
    """Get Midjourney prompts for badge images."""
    if not HAS_BADGES:
        return jsonify({"status": "error", "message": "Badge system not available"}), 501

    try:
        prompts = get_midjourney_prompts()

        return jsonify({
            "status": "success",
            "prompts": prompts,
            "count": len(prompts),
            "usage": "Copy each prompt to Midjourney to generate badge images. Save as /public/badges/{badge_id}.png",
        })
    except Exception as e:
        logger.exception(f"[ERROR] /badges/midjourney-prompts failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# AGENTIC RAG ENDPOINTS (Next Level Features)
# ===============================================================

@app.route("/agentic/query", methods=["POST"])
def agentic_rag_query():
    """
    Execute agentic RAG query with all next-level features:
    - Entity Extraction (NER)
    - Deep Graph Traversal (Multi-hop)
    - Agentic Workflow (LangGraph-style)

    Request body:
    {
        "query": "목성이 사수자리에 있을 때 9하우스의 영향은?",
        "facts": {...},  // Optional: Saju/Astro facts
        "locale": "ko",
        "theme": "life_path"
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        query = data.get("query", "")
        facts = data.get("facts", {})
        locale = data.get("locale", "ko")
        theme = data.get("theme", "life_path")

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        result = agentic_query(
            query=query,
            facts=facts,
            locale=locale,
            theme=theme,
        )

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/query failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/agentic/extract-entities", methods=["POST"])
def agentic_extract_entities():
    """
    Extract entities from text using NER.

    Request body:
    {
        "text": "Jupiter in Sagittarius in the 9th house"
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)
        text = data.get("text", "")

        if not text:
            return jsonify({"status": "error", "message": "text is required"}), 400

        extractor = get_entity_extractor()
        entities = extractor.extract(text)
        relations = extractor.extract_relations(text)

        return jsonify({
            "status": "success",
            "entities": [
                {
                    "text": e.text,
                    "type": e.type.value,
                    "normalized": e.normalized,
                    "confidence": e.confidence,
                }
                for e in entities
            ],
            "relations": [
                {
                    "source": r[0].normalized,
                    "relation": r[1],
                    "target": r[2].normalized,
                }
                for r in relations
            ],
            "stats": {
                "entities_count": len(entities),
                "relations_count": len(relations),
                "entity_types": list(set(e.type.value for e in entities)),
            },
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/extract-entities failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/agentic/deep-traverse", methods=["POST"])
def agentic_deep_traverse():
    """
    Perform multi-hop graph traversal.

    Request body:
    {
        "start_entities": ["Jupiter", "Sagittarius"],
        "max_depth": 3,
        "max_paths": 5
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        start_entities = data.get("start_entities", [])
        max_depth = data.get("max_depth", 3)
        max_paths = data.get("max_paths", 10)

        if not start_entities:
            return jsonify({"status": "error", "message": "start_entities is required"}), 400

        traversal = get_deep_traversal()
        if not traversal:
            return jsonify({"status": "error", "message": "Graph not available for traversal"}), 501

        paths = traversal.traverse(
            start_entities=start_entities,
            max_depth=max_depth,
            max_paths=max_paths,
        )

        return jsonify({
            "status": "success",
            "paths": [
                {
                    "nodes": p.nodes,
                    "edges": p.edges,
                    "context": p.context,
                    "weight": p.total_weight,
                }
                for p in paths
            ],
            "stats": {
                "paths_count": len(paths),
                "max_path_length": max(len(p.nodes) for p in paths) if paths else 0,
                "start_entities": start_entities,
            },
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/deep-traverse failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/agentic/find-connections", methods=["POST"])
def agentic_find_connections():
    """
    Find all paths connecting two entities.

    Example: Find how Jupiter connects to Philosophy
    Jupiter → Sagittarius → 9th House → Philosophy

    Request body:
    {
        "entity1": "Jupiter",
        "entity2": "Philosophy",
        "max_depth": 4
    }
    """
    if not HAS_AGENTIC:
        return jsonify({"status": "error", "message": "Agentic RAG module not available"}), 501

    try:
        data = request.get_json(force=True)

        entity1 = data.get("entity1", "")
        entity2 = data.get("entity2", "")
        max_depth = data.get("max_depth", 4)

        if not entity1 or not entity2:
            return jsonify({"status": "error", "message": "entity1 and entity2 are required"}), 400

        traversal = get_deep_traversal()
        if not traversal:
            return jsonify({"status": "error", "message": "Graph not available for traversal"}), 501

        paths = traversal.find_connections(
            entity1=entity1,
            entity2=entity2,
            max_depth=max_depth,
        )

        return jsonify({
            "status": "success",
            "entity1": entity1,
            "entity2": entity2,
            "paths": [
                {
                    "nodes": p.nodes,
                    "edges": p.edges,
                    "context": p.context,
                    "weight": p.total_weight,
                    "path_string": " → ".join(p.nodes),
                }
                for p in paths
            ],
            "connections_found": len(paths),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /agentic/find-connections failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# PREDICTION ENGINE ENDPOINTS (v5.0)
# 대운/세운 + 트랜짓 기반 예측 시스템
# ===============================================================

@app.route("/api/prediction/luck", methods=["POST"])
def prediction_luck():
    """
    대운/세운 기반 운세 예측.
    향후 N년간의 운세 흐름 분석.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        years_ahead = data.get("years_ahead", 5)

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        forecasts = predict_luck(birth_info, years_ahead)

        return jsonify({
            "status": "success",
            "birth_info": birth_info,
            "years_ahead": years_ahead,
            "forecasts": forecasts
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/luck failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/prediction/timing", methods=["POST"])
def prediction_timing():
    """
    '언제가 좋을까?' 질문에 답변.
    최적의 날짜/시기 추천.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        question = data.get("question", "")

        if not question:
            return jsonify({"status": "error", "message": "question is required"}), 400

        # 생년월일 정보 (선택)
        birth_info = None
        if data.get("year") and data.get("month"):
            birth_info = {
                "year": data.get("year"),
                "month": data.get("month"),
                "day": data.get("day", 15),
                "hour": data.get("hour", 12),
                "gender": data.get("gender", "unknown")
            }

        result = find_best_date(question, birth_info)

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/timing failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/prediction/forecast", methods=["POST"])
def prediction_forecast():
    """
    종합 예측 - 대운/세운/트랜짓 통합 분석.
    AI 해석 포함.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        question = data.get("question")
        include_timing = data.get("include_timing", True)

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        result = get_full_forecast(birth_info, question)

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/forecast failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/prediction/daeun", methods=["POST"])
def prediction_daeun():
    """
    현재 대운 상세 정보.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_info = {
            "year": data.get("year"),
            "month": data.get("month"),
            "day": data.get("day", 15),
            "hour": data.get("hour", 12),
            "gender": data.get("gender", "unknown")
        }
        target_year = data.get("target_year")

        if not birth_info.get("year") or not birth_info.get("month"):
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        engine = get_prediction_engine()
        daeun = engine.luck_predictor.calculate_daeun(
            birth_info["year"],
            birth_info["month"],
            birth_info["day"],
            birth_info["hour"],
            birth_info["gender"],
            target_year
        )

        return jsonify({
            "status": "success",
            "daeun": {
                "period_type": daeun.period_type,
                "start_year": daeun.start_year,
                "end_year": daeun.end_year,
                "dominant_god": daeun.dominant_god,
                "element": daeun.element,
                "polarity": daeun.polarity,
                "overall_rating": round(daeun.overall_rating, 1),
                "themes": daeun.themes,
                "opportunities": daeun.opportunities,
                "challenges": daeun.challenges
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/daeun failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/prediction/seun", methods=["POST"])
def prediction_seun():
    """
    특정 연도의 세운 정보.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_year = data.get("year")
        birth_month = data.get("month")
        target_year = data.get("target_year")

        if not birth_year or not birth_month:
            return jsonify({"status": "error", "message": "year and month are required"}), 400

        engine = get_prediction_engine()
        seun = engine.luck_predictor.calculate_seun(
            birth_year,
            birth_month,
            target_year
        )

        return jsonify({
            "status": "success",
            "seun": {
                "period_type": seun.period_type,
                "year": seun.start_year,
                "dominant_god": seun.dominant_god,
                "element": seun.element,
                "polarity": seun.polarity,
                "overall_rating": round(seun.overall_rating, 1),
                "themes": seun.themes,
                "opportunities": seun.opportunities,
                "challenges": seun.challenges
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/prediction/seun failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/prediction/event-types", methods=["GET"])
def prediction_event_types():
    """
    사용 가능한 이벤트 유형 목록.
    """
    if not HAS_PREDICTION:
        return jsonify({"status": "error", "message": "Prediction engine not available"}), 501

    event_types = [
        {"id": "career", "name_ko": "직업/사업", "name_en": "Career/Business"},
        {"id": "relationship", "name_ko": "연애/결혼", "name_en": "Love/Marriage"},
        {"id": "finance", "name_ko": "재물/투자", "name_en": "Finance/Investment"},
        {"id": "health", "name_ko": "건강", "name_en": "Health"},
        {"id": "education", "name_ko": "학업/시험", "name_en": "Education/Exam"},
        {"id": "travel", "name_ko": "여행/이사", "name_en": "Travel/Moving"},
        {"id": "contract", "name_ko": "계약/협상", "name_en": "Contract/Negotiation"},
        {"id": "general", "name_ko": "일반", "name_en": "General"}
    ]

    return jsonify({
        "status": "success",
        "event_types": event_types
    })


# ===============================================================
# THEME CROSS-REFERENCE FILTER ENDPOINTS (v5.1)
# 테마별 사주+점성 교차점 분석
# ===============================================================

@app.route("/api/theme/filter", methods=["POST"])
def theme_filter():
    """
    테마별 사주+점성 교차점 필터링.
    테마에 맞는 데이터만 추출하여 반환.
    """
    if not HAS_THEME_FILTER:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data = request.get_json(force=True)
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        result = filter_data_by_theme(theme, saju_data, astro_data)

        return jsonify({
            "status": "success",
            **result
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/filter failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/theme/cross-points", methods=["POST"])
def theme_cross_points():
    """
    테마별 사주-점성 교차점 상세 분석.
    교차점, 중요 날짜, 하이라이트 포함.
    """
    if not HAS_THEME_FILTER:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data = request.get_json(force=True)
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        theme_filter_engine = get_theme_filter()
        summary = theme_filter_engine.get_theme_summary(theme, saju_data, astro_data)

        return jsonify({
            "status": "success",
            "theme": theme,
            "relevance_score": summary.get("relevance_score", 0),
            "highlights": summary.get("highlights", []),
            "intersections": summary.get("intersections", []),
            "important_dates": summary.get("important_dates", []),
            "saju_factors": summary.get("saju_factors", []),
            "astro_factors": summary.get("astro_factors", [])
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/cross-points failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/theme/prompt-context", methods=["POST"])
def theme_prompt_context():
    """
    AI 프롬프트용 테마별 컨텍스트 생성.
    필터링된 데이터를 프롬프트에 사용할 수 있는 형식으로 반환.
    """
    if not HAS_THEME_FILTER:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data = request.get_json(force=True)
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        context = get_theme_prompt_context(theme, saju_data, astro_data)

        return jsonify({
            "status": "success",
            "theme": theme,
            "prompt_context": context
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/prompt-context failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/theme/important-dates", methods=["POST"])
def theme_important_dates():
    """
    테마별 중요 날짜만 반환.
    """
    if not HAS_THEME_FILTER:
        return jsonify({"status": "error", "message": "Theme filter not available"}), 501

    try:
        data = request.get_json(force=True)
        theme = data.get("theme", "overall")
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        theme_filter_engine = get_theme_filter()
        summary = theme_filter_engine.get_theme_summary(theme, saju_data, astro_data)

        # 날짜만 추출
        dates = summary.get("important_dates", [])

        # 좋은 날짜와 주의 날짜 분리
        auspicious = [d for d in dates if d.get("is_auspicious", True)]
        caution = [d for d in dates if not d.get("is_auspicious", True)]

        return jsonify({
            "status": "success",
            "theme": theme,
            "auspicious_dates": auspicious,
            "caution_dates": caution,
            "total_count": len(dates)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/theme/important-dates failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/theme/available", methods=["GET"])
def theme_available():
    """
    사용 가능한 테마 목록.
    """
    themes = [
        {"id": "love", "name_ko": "연애/결혼", "name_en": "Love/Marriage", "icon": "💕"},
        {"id": "career", "name_ko": "직업/사업", "name_en": "Career/Business", "icon": "💼"},
        {"id": "wealth", "name_ko": "재물/투자", "name_en": "Wealth/Finance", "icon": "💰"},
        {"id": "health", "name_ko": "건강", "name_en": "Health", "icon": "🏥"},
        {"id": "family", "name_ko": "가족/관계", "name_en": "Family/Relations", "icon": "👨‍👩‍👧‍👦"},
        {"id": "education", "name_ko": "학업/시험", "name_en": "Education/Exam", "icon": "📚"},
        {"id": "overall", "name_ko": "전체 운세", "name_en": "Overall Fortune", "icon": "🔮"},
        {"id": "monthly", "name_ko": "월운", "name_en": "Monthly Fortune", "icon": "📅"},
        {"id": "yearly", "name_ko": "연운", "name_en": "Yearly Fortune", "icon": "🗓️"},
        {"id": "daily", "name_ko": "일운", "name_en": "Daily Fortune", "icon": "☀️"}
    ]

    return jsonify({
        "status": "success",
        "themes": themes
    })


# =============================================================================
# FORTUNE SCORE API (v1.0) - Real-time Saju+Astrology Unified Score
# =============================================================================

@app.route("/api/fortune/score", methods=["POST"])
def fortune_score():
    """
    실시간 통합 운세 점수 계산.
    사주 + 점성학 모든 데이터를 교차 분석하여 0-100 점수 산출.

    Request body:
    {
        "saju": { full saju data },
        "astro": { full astrology data }
    }

    Response:
    {
        "status": "success",
        "score": {
            "total": 87,
            "saju": { "total": 45, "iljin": 12, ... },
            "astro": { "total": 42, "transit": 15, ... },
            "cross_bonus": 3,
            "alerts": [...]
        }
    }
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        if not saju_data and not astro_data:
            return jsonify({
                "status": "error",
                "message": "At least one of saju or astro data is required"
            }), 400

        start_time = time.time()
        score_result = calculate_fortune_score(saju_data, astro_data)
        elapsed = time.time() - start_time

        logger.info(f"[FORTUNE] id={g.request_id} Score calculated: {score_result['total']}/100 in {elapsed:.3f}s")

        return jsonify({
            "status": "success",
            "score": score_result,
            "timestamp": datetime.utcnow().isoformat(),
            "processing_time_ms": round(elapsed * 1000, 2)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/score failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/fortune/score/breakdown", methods=["POST"])
def fortune_score_breakdown():
    """
    상세 점수 내역과 함께 점수 계산.
    각 항목별 가중치와 계산 로직을 포함.
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        engine = get_fortune_score_engine()
        breakdown = engine.calculate_score(saju_data, astro_data)

        # Add detailed breakdown info
        result = breakdown.to_dict()
        result["weights"] = {
            "saju_max": 50,
            "astro_max": 50,
            "cross_bonus_range": [-10, 10],
            "components": {
                "saju": {
                    "iljin": {"max": 12, "desc": "일진 궁합"},
                    "wolun": {"max": 10, "desc": "월운 흐름"},
                    "yongsin": {"max": 10, "desc": "용신 활성"},
                    "geokguk": {"max": 8, "desc": "격국 에너지"},
                    "sibsin": {"max": 5, "desc": "십신 균형"},
                    "hyeongchung": {"range": [-5, 5], "desc": "형충회합"},
                },
                "astro": {
                    "transit": {"range": [-10, 15], "desc": "주요 트랜짓"},
                    "moon": {"max": 10, "desc": "달 위상/사인"},
                    "planetary_hour": {"max": 8, "desc": "행성시"},
                    "voc": {"range": [-5, 0], "desc": "VOC 공허시간"},
                    "retrograde": {"range": [-5, 0], "desc": "역행 영향"},
                    "aspects": {"range": [-5, 10], "desc": "현재 aspects"},
                    "progression": {"max": 7, "desc": "progressions"},
                },
            },
        }

        return jsonify({
            "status": "success",
            "breakdown": result,
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/score/breakdown failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/fortune/daily", methods=["POST"])
def fortune_daily():
    """
    일일 운세 점수 (간단한 버전).
    생년월일만으로 빠르게 점수 계산.
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_date = data.get("birthDate")  # YYYY-MM-DD
        birth_time = data.get("birthTime")  # HH:MM (optional)

        if not birth_date:
            return jsonify({"status": "error", "message": "birthDate is required"}), 400

        # Calculate saju data from birth info
        saju_data = calculate_saju_data({
            "birthDate": birth_date,
            "birthTime": birth_time or "12:00",
        })

        # Simple astro data (minimal for daily fortune)
        astro_data = {
            "electional": {
                "moonPhase": {"phase": "Waxing Gibbous"},  # Would be calculated in real impl
                "planetaryHour": {"planet": "Sun"},
                "voidOfCourse": {"isVoid": False},
                "retrograde": [],
            }
        }

        score_result = calculate_fortune_score(saju_data, astro_data)

        # Add lucky items based on score
        total_score = score_result["total"]
        lucky_colors = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "White", "Black"]
        lucky_color = lucky_colors[total_score % len(lucky_colors)]
        lucky_number = (total_score % 9) + 1

        return jsonify({
            "status": "success",
            "fortune": {
                "overall": total_score,
                "love": min(100, max(0, total_score + (hash(birth_date + "love") % 20) - 10)),
                "career": min(100, max(0, total_score + (hash(birth_date + "career") % 20) - 10)),
                "wealth": min(100, max(0, total_score + (hash(birth_date + "wealth") % 20) - 10)),
                "health": min(100, max(0, total_score + (hash(birth_date + "health") % 20) - 10)),
                "luckyColor": lucky_color,
                "luckyNumber": lucky_number,
            },
            "alerts": score_result.get("alerts", []),
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/daily failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# System capabilities
@app.route("/capabilities", methods=["GET"])
def get_capabilities():
    """Get system capabilities (what's enabled)."""
    return jsonify({
        "status": "success",
        "capabilities": {
            "realtime_transits": HAS_REALTIME,
            "chart_generation": HAS_CHARTS,
            "user_memory": HAS_USER_MEMORY,
            "iching_premium": HAS_ICHING,
            "persona_embeddings": HAS_PERSONA_EMBED,
            "tarot_premium": HAS_TAROT,
            "rlhf_learning": HAS_RLHF,
            "badge_system": HAS_BADGES,
            "agentic_rag": HAS_AGENTIC,
            "jungian_counseling": HAS_COUNSELING,
            "prediction_engine": HAS_PREDICTION,
            "theme_cross_filter": HAS_THEME_FILTER,
            "fortune_score": HAS_FORTUNE_SCORE,
            "hybrid_rag": True,
        },
        "version": "5.2.0-fortune-score",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}")
    app.run(host="0.0.0.0", port=port, debug=True)
