import logging
import os
import time
from collections import defaultdict
from typing import Optional, Tuple
from uuid import uuid4

from flask import Flask, jsonify, g, request
from flask_cors import CORS

from backend_ai.app.astro_parser import calculate_astrology_data
from backend_ai.app.fusion_logic import interpret_with_ai
from backend_ai.app.saju_parser import calculate_saju_data
from backend_ai.app.redis_cache import get_cache
from backend_ai.app.performance_optimizer import (
    track_performance,
    get_performance_stats,
    get_cache_health,
    suggest_optimizations,
)

# Flask Application
app = Flask(__name__)
CORS(app)  # allow cross-origin (Next.js)

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
