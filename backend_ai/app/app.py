import sys
import os
import json

# Load environment variables from backend_ai/.env file (explicit path with override)
from dotenv import load_dotenv
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_root, ".env"), override=True)

# Add project root to Python path for standalone execution
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import logging
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional, Tuple
from uuid import uuid4

from flask import Flask, jsonify, g, request, Response, stream_with_context
from flask_cors import CORS
from flask_compress import Compress

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

# Domain RAG (precomputed embeddings per domain)
try:
    from backend_ai.app.domain_rag import get_domain_rag, DOMAINS as DOMAIN_RAG_DOMAINS
    HAS_DOMAIN_RAG = True
except ImportError:
    HAS_DOMAIN_RAG = False
    DOMAIN_RAG_DOMAINS = []
    print("[app.py] DomainRAG not available")

# Compatibility (Saju + Astrology fusion)
try:
    from backend_ai.app.compatibility_logic import (
        interpret_compatibility,
        interpret_compatibility_group,
    )
    HAS_COMPATIBILITY = True
except ImportError:
    HAS_COMPATIBILITY = False
    print("[app.py] Compatibility logic not available")

# Hybrid RAG (Vector + BM25 + Graph + rerank)
try:
    from backend_ai.app.hybrid_rag import hybrid_search, build_rag_context
    HAS_HYBRID_RAG = True
except ImportError:
    HAS_HYBRID_RAG = False
    print("[app.py] Hybrid RAG not available")

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

# GraphRAG System
try:
    from backend_ai.app.saju_astro_rag import get_graph_rag, get_model
    HAS_GRAPH_RAG = True
except ImportError:
    HAS_GRAPH_RAG = False
    get_graph_rag = None
    get_model = None
    print("[app.py] GraphRAG not available")

# CorpusRAG System
try:
    from backend_ai.app.corpus_rag import get_corpus_rag
    HAS_CORPUS_RAG = True
except ImportError:
    HAS_CORPUS_RAG = False
    get_corpus_rag = None
    print("[app.py] CorpusRAG not available")

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


# ===============================================================
# 🚀 CROSS-ANALYSIS CACHE - Pre-loaded for instant lookups
# ===============================================================
_CROSS_ANALYSIS_CACHE = {}

def _load_cross_analysis_cache():
    """Load cross-analysis JSON files for instant lookups (no embedding search)."""
    global _CROSS_ANALYSIS_CACHE
    if _CROSS_ANALYSIS_CACHE:
        return _CROSS_ANALYSIS_CACHE

    import json
    fusion_dir = os.path.join(os.path.dirname(__file__), "..", "data", "graph", "fusion")
    fusion_dir = os.path.abspath(fusion_dir)

    if not os.path.exists(fusion_dir):
        logger.warning(f"[CROSS-CACHE] Fusion dir not found: {fusion_dir}")
        return {}

    for fname in os.listdir(fusion_dir):
        if fname.endswith(".json") and "cross" in fname.lower():
            try:
                with open(os.path.join(fusion_dir, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    key = fname.replace(".json", "")
                    _CROSS_ANALYSIS_CACHE[key] = data
                    logger.info(f"  ✅ Loaded cross-analysis: {fname}")
            except Exception as e:
                logger.warning(f"  ⚠️ Failed to load {fname}: {e}")

    logger.info(f"[CROSS-CACHE] Loaded {len(_CROSS_ANALYSIS_CACHE)} cross-analysis files")
    return _CROSS_ANALYSIS_CACHE


def get_cross_analysis_for_chart(saju_data: dict, astro_data: dict, theme: str = "chat") -> str:
    """
    Get instant cross-analysis based on user's chart data.
    Uses: 1) Cross-analysis cache (daymaster×sun), 2) GraphRAG theme rules (keyword match).
    No embedding search - all instant lookups.
    """
    cache = _load_cross_analysis_cache()
    results = []

    # Get chart elements
    daymaster = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
    dm_element = saju_data.get("dayMaster", {}).get("element", "")
    sun_sign = astro_data.get("sun", {}).get("sign", "")
    moon_sign = astro_data.get("moon", {}).get("sign", "")
    dominant = saju_data.get("dominantElement", "")

    # Map Korean sign names to English
    sign_map = {
        "양자리": "Aries", "황소자리": "Taurus", "쌍둥이자리": "Gemini",
        "게자리": "Cancer", "사자자리": "Leo", "처녀자리": "Virgo",
        "천칭자리": "Libra", "전갈자리": "Scorpio", "궁수자리": "Sagittarius",
        "염소자리": "Capricorn", "물병자리": "Aquarius", "물고기자리": "Pisces",
    }
    sun_sign_en = sign_map.get(sun_sign, sun_sign)
    moon_sign_en = sign_map.get(moon_sign, moon_sign)

    # 1. Cross-analysis cache lookup (daymaster × sun sign) - INSTANT
    if cache:
        advanced_cross = cache.get("saju_astro_advanced_cross", {})
        dm_data = advanced_cross.get("daymaster_sun_complete", {}).get(daymaster, {})
        if dm_data:
            sun_combo = dm_data.get("sun_signs", {}).get(sun_sign_en, {})
            if sun_combo:
                results.append(f"[{daymaster}+{sun_sign_en}] {sun_combo.get('insight', '')} | 추천: {', '.join(sun_combo.get('best_for', []))} | 주의: {sun_combo.get('caution', '')}")

            # Moon cross-analysis
            if moon_sign_en and moon_sign_en != sun_sign_en:
                moon_combo = dm_data.get("sun_signs", {}).get(moon_sign_en, {})
                if moon_combo:
                    results.append(f"[{daymaster}+달:{moon_sign_en}] 감정: {moon_combo.get('insight', '')[:80]}")

    # 2. GraphRAG theme rules (keyword match, no embedding) - INSTANT
    if HAS_GRAPH_RAG:
        try:
            graph_rag = get_graph_rag()

            # Map themes to rule domains
            theme_map = {
                "chat": ["career", "love", "health"],
                "focus_career": ["career"], "career": ["career"],
                "focus_love": ["love"], "love": ["love"],
                "focus_health": ["health"], "health": ["health"],
                "focus_wealth": ["wealth"], "wealth": ["wealth"],
                "focus_family": ["family"], "family": ["family"],
                "life": ["life_path"], "life_path": ["life_path"],
            }
            domains = theme_map.get(theme, ["career", "love"])

            # Build facts string for rule matching
            facts_parts = [theme, daymaster, dm_element, dominant]
            if sun_sign_en:
                facts_parts.append(sun_sign_en.lower())
            if moon_sign_en:
                facts_parts.append(moon_sign_en.lower())

            # Add planets in houses
            for planet in ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]:
                p_data = astro_data.get(planet, {})
                house = p_data.get("house")
                if house:
                    facts_parts.extend([planet, str(house), f"{planet} {house}"])

            facts_str = " ".join(filter(None, facts_parts))

            # Apply rules from each domain (instant keyword match)
            for domain in domains:
                if hasattr(graph_rag, '_apply_rules'):
                    matched = graph_rag._apply_rules(domain, facts_str)
                    if matched:
                        results.extend(matched[:2])

        except Exception as e:
            logger.warning(f"[CROSS-ANALYSIS] GraphRAG rules failed: {e}")

    return "\n".join(results[:5]) if results else ""


# ===============================================================
# 🚀 SESSION RAG CACHE - Pre-computed RAG data for fast chat
# ===============================================================
import threading
from datetime import datetime, timedelta

# In-memory session cache: session_id -> {data, created_at, last_accessed}
_SESSION_RAG_CACHE = {}
_SESSION_CACHE_LOCK = threading.Lock()
SESSION_CACHE_TTL_MINUTES = 60  # Session data expires after 60 minutes
SESSION_CACHE_MAX_SIZE = 50  # Max number of sessions to cache (LRU eviction)


def _cleanup_expired_sessions():
    """Remove expired session data."""
    now = datetime.now()
    expired = []
    with _SESSION_CACHE_LOCK:
        for sid, data in _SESSION_RAG_CACHE.items():
            if now - data.get("created_at", now) > timedelta(minutes=SESSION_CACHE_TTL_MINUTES):
                expired.append(sid)
        for sid in expired:
            del _SESSION_RAG_CACHE[sid]
    if expired:
        logger.info(f"[SESSION-CACHE] Cleaned up {len(expired)} expired sessions")


def _evict_lru_sessions(keep_count: int = SESSION_CACHE_MAX_SIZE):
    """Evict least recently used sessions to maintain cache size."""
    with _SESSION_CACHE_LOCK:
        if len(_SESSION_RAG_CACHE) <= keep_count:
            return
        # Sort by last_accessed time (oldest first)
        sorted_sessions = sorted(
            _SESSION_RAG_CACHE.items(),
            key=lambda x: x[1].get("last_accessed", x[1].get("created_at", datetime.min))
        )
        # Evict oldest sessions until we're under the limit
        evict_count = len(_SESSION_RAG_CACHE) - keep_count
        for sid, _ in sorted_sessions[:evict_count]:
            del _SESSION_RAG_CACHE[sid]
        logger.info(f"[SESSION-CACHE] LRU evicted {evict_count} sessions, {len(_SESSION_RAG_CACHE)} remaining")


def prefetch_all_rag_data(saju_data: dict, astro_data: dict, theme: str = "chat") -> dict:
    """
    Pre-fetch relevant data from ALL RAG systems for a user's chart.
    Uses parallel execution for ~2-3x speedup.

    Returns:
        Dict with all pre-fetched RAG data
    """
    start_time = time.time()
    result = {
        "graph_nodes": [],
        "graph_context": "",
        "corpus_quotes": [],
        "persona_context": {},
        "cross_analysis": "",
    }

    # Build query from chart data
    daymaster = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
    dm_element = saju_data.get("dayMaster", {}).get("element", "")
    sun_sign = astro_data.get("sun", {}).get("sign", "")
    moon_sign = astro_data.get("moon", {}).get("sign", "")
    dominant = saju_data.get("dominantElement", "")

    # Build comprehensive query for embedding search
    query_parts = [theme, daymaster, dm_element, dominant]
    if sun_sign:
        query_parts.append(sun_sign)
    if moon_sign:
        query_parts.append(moon_sign)

    # Add planets and houses
    for planet in ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]:
        p_data = astro_data.get(planet, {})
        if p_data.get("sign"):
            query_parts.append(p_data["sign"])
        if p_data.get("house"):
            query_parts.append(f"{planet} {p_data['house']}하우스")

    query = " ".join(filter(None, query_parts))
    logger.info(f"[PREFETCH] Query: {query[:100]}...")

    # Build facts dict for graph query (shared across tasks)
    facts = {
        "daymaster": daymaster,
        "element": dm_element,
        "sun_sign": sun_sign,
        "moon_sign": moon_sign,
        "theme": theme,
    }

    # Theme concepts for Jung quotes
    theme_concepts = {
        "career": "vocation calling work purpose self-realization 소명 직업 자아실현",
        "love": "anima animus relationship shadow projection 아니마 아니무스 그림자 투사",
        "health": "psyche wholeness integration healing 치유 통합 전체성",
        "life_path": "individuation self persona shadow 개성화 자아 페르소나",
        "wealth": "abundance value meaning purpose 가치 의미 목적",
        "family": "complex archetype mother father 콤플렉스 원형 부모",
    }

    # --- Pre-load RAG instances (thread-safe) ---
    # SentenceTransformer encode() is NOT thread-safe, so we must load
    # instances in main thread and run queries SEQUENTIALLY
    _graph_rag_inst = get_graph_rag() if HAS_GRAPH_RAG else None
    _corpus_rag_inst = get_corpus_rag() if HAS_CORPUS_RAG else None
    _persona_rag_inst = get_persona_embed_rag() if HAS_PERSONA_EMBED else None

    # --- Execute RAG fetches SEQUENTIALLY (thread-safe) ---
    # GraphRAG
    try:
        if _graph_rag_inst:
            graph_result = _graph_rag_inst.query(
                facts, top_k=20,
                domain_priority=theme if theme in _graph_rag_inst.rules else "career"
            )
            result["graph_nodes"] = graph_result.get("matched_nodes", [])[:15]
            result["graph_context"] = graph_result.get("context_text", "")[:2000]
            if graph_result.get("rule_summary"):
                result["graph_rules"] = graph_result.get("rule_summary", [])[:5]
            logger.info(f"[PREFETCH] GraphRAG: {len(result['graph_nodes'])} nodes")
    except Exception as e:
        logger.warning(f"[PREFETCH] GraphRAG failed: {e}")

    # CorpusRAG (Jung quotes)
    try:
        if _corpus_rag_inst:
            jung_query_parts = [theme_concepts.get(theme, theme), query[:100]]
            jung_query = " ".join(jung_query_parts)
            quotes = _corpus_rag_inst.search(jung_query, top_k=5, min_score=0.15)
            result["corpus_quotes"] = [
                {
                    "text_ko": q.get("quote_kr", ""),
                    "text_en": q.get("quote_en", ""),
                    "source": q.get("source", ""),
                    "concept": q.get("concept", ""),
                    "score": q.get("score", 0)
                }
                for q in quotes
            ]
            logger.info(f"[PREFETCH] CorpusRAG: {len(result['corpus_quotes'])} quotes")
    except Exception as e:
        logger.warning(f"[PREFETCH] CorpusRAG failed: {e}")

    # PersonaEmbedRAG
    try:
        if _persona_rag_inst:
            persona_result = _persona_rag_inst.get_persona_context(query, top_k=5)
            result["persona_context"] = {
                "jung": persona_result.get("jung_insights", [])[:5],
                "stoic": persona_result.get("stoic_insights", [])[:5],
            }
            logger.info(f"[PREFETCH] PersonaEmbedRAG: {persona_result.get('total_matched', 0)} matches")
    except Exception as e:
        logger.warning(f"[PREFETCH] PersonaEmbedRAG failed: {e}")

    # Cross-analysis (no ML, thread-safe)
    try:
        result["cross_analysis"] = get_cross_analysis_for_chart(saju_data, astro_data, theme)
    except Exception as e:
        logger.warning(f"[PREFETCH] Cross-analysis failed: {e}")

    elapsed = time.time() - start_time
    logger.info(f"[PREFETCH] All RAG data prefetched in {elapsed:.2f}s (sequential)")
    result["prefetch_time_ms"] = int(elapsed * 1000)

    return result


def get_session_rag_cache(session_id: str) -> dict:
    """Get cached RAG data for a session. Updates last_accessed for LRU."""
    with _SESSION_CACHE_LOCK:
        cache_entry = _SESSION_RAG_CACHE.get(session_id)
        if cache_entry:
            # Check if expired
            if datetime.now() - cache_entry.get("created_at", datetime.now()) > timedelta(minutes=SESSION_CACHE_TTL_MINUTES):
                del _SESSION_RAG_CACHE[session_id]
                return None
            # Update last_accessed for LRU tracking
            cache_entry["last_accessed"] = datetime.now()
            return cache_entry.get("data")
    return None


def set_session_rag_cache(session_id: str, data: dict):
    """Store RAG data in session cache with LRU eviction."""
    now = datetime.now()
    with _SESSION_CACHE_LOCK:
        _SESSION_RAG_CACHE[session_id] = {
            "data": data,
            "created_at": now,
            "last_accessed": now,
        }
    # LRU eviction if cache is too large
    if len(_SESSION_RAG_CACHE) > SESSION_CACHE_MAX_SIZE:
        _cleanup_expired_sessions()  # First remove expired
        _evict_lru_sessions()  # Then evict LRU if still over limit


# ===============================================================
# 🚀 MODEL WARMUP - Preload models on startup for faster first request
# ===============================================================
def warmup_models():
    """Preload all singleton models and caches on startup."""
    logger.info("🔥 Starting model warmup...")
    start = time.time()

    try:
        # 0. Cross-analysis cache (instant, no ML)
        _load_cross_analysis_cache()

        # 1. SentenceTransformer model + GraphRAG
        if HAS_GRAPH_RAG:
            model = get_model()
            logger.info(f"  ✅ SentenceTransformer loaded: {model.get_sentence_embedding_dimension()}d")

            # 2. GraphRAG with embeddings
            rag = get_graph_rag()
            logger.info(f"  ✅ GraphRAG loaded: {len(rag.graph.nodes())} nodes")

        # 3. Corpus RAG (Jung quotes)
        if HAS_CORPUS_RAG:
            corpus = get_corpus_rag()
            logger.info(f"  ✅ CorpusRAG loaded")

        # 4. Persona embeddings (if available)
        if HAS_PERSONA_EMBED:
            persona = get_persona_embed_rag()
            logger.info(f"  ✅ PersonaEmbedRAG loaded")

        # 5. Tarot RAG (if available)
        if HAS_TAROT:
            tarot = get_tarot_hybrid_rag()
            logger.info(f"  ✅ TarotHybridRAG loaded")

        # 6. Redis cache connection
        cache = get_cache()
        logger.info(f"  ✅ Redis cache: {'connected' if cache.enabled else 'memory fallback'}")

        elapsed = time.time() - start
        logger.info(f"🔥 Model warmup completed in {elapsed:.2f}s")

    except Exception as e:
        logger.warning(f"⚠️ Warmup error (non-fatal): {e}")


# Auto-warmup on import if WARMUP_ON_START is set (for Gunicorn/production)
if os.getenv("WARMUP_ON_START", "").lower() in ("1", "true", "yes"):
    warmup_models()

# Simple token gate + rate limiting
ADMIN_TOKEN = os.getenv("ADMIN_API_TOKEN")
RATE_LIMIT = int(os.getenv("API_RATE_PER_MIN", "60"))
RATE_WINDOW_SECONDS = 60
_rate_state = defaultdict(list)  # ip -> timestamps
UNPROTECTED_PATHS = {"/", "/health", "/health/full", "/counselor/init"}


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
    except Exception:
        pass
    return response


# Helper functions for building chart context
def _build_saju_summary(saju_data: dict) -> str:
    """Build concise saju summary for chat context."""
    if not saju_data:
        return ""
    parts = []
    if saju_data.get("dayMaster"):
        dm = saju_data["dayMaster"]
        parts.append(f"Day Master: {dm.get('heavenlyStem', '')} ({dm.get('element', '')})")
    if saju_data.get("yearPillar"):
        yp = saju_data["yearPillar"]
        parts.append(f"Year: {yp.get('heavenlyStem', '')}{yp.get('earthlyBranch', '')}")
    if saju_data.get("monthPillar"):
        mp = saju_data["monthPillar"]
        parts.append(f"Month: {mp.get('heavenlyStem', '')}{mp.get('earthlyBranch', '')}")
    if saju_data.get("dominantElement"):
        parts.append(f"Dominant: {saju_data['dominantElement']}")
    return "SAJU: " + " | ".join(parts) if parts else ""


def _build_astro_summary(astro_data: dict) -> str:
    """Build concise astro summary for chat context."""
    if not astro_data:
        return ""
    parts = []
    if astro_data.get("sun"):
        parts.append(f"Sun: {astro_data['sun'].get('sign', '')}")
    if astro_data.get("moon"):
        parts.append(f"Moon: {astro_data['moon'].get('sign', '')}")
    if astro_data.get("ascendant"):
        parts.append(f"Rising: {astro_data['ascendant'].get('sign', '')}")
    return "ASTRO: " + " | ".join(parts) if parts else ""


def _build_detailed_saju(saju_data: dict) -> str:
    """Build detailed saju context for personalized responses."""
    if not saju_data:
        return "사주 정보 없음"

    lines = []

    # Four Pillars
    if saju_data.get("yearPillar"):
        yp = saju_data["yearPillar"]
        lines.append(f"년주: {yp.get('heavenlyStem', '')}{yp.get('earthlyBranch', '')} ({yp.get('element', '')})")
    if saju_data.get("monthPillar"):
        mp = saju_data["monthPillar"]
        lines.append(f"월주: {mp.get('heavenlyStem', '')}{mp.get('earthlyBranch', '')} ({mp.get('element', '')})")
    if saju_data.get("dayPillar"):
        dp = saju_data["dayPillar"]
        lines.append(f"일주: {dp.get('heavenlyStem', '')}{dp.get('earthlyBranch', '')} ({dp.get('element', '')})")
    if saju_data.get("hourPillar"):
        hp = saju_data["hourPillar"]
        lines.append(f"시주: {hp.get('heavenlyStem', '')}{hp.get('earthlyBranch', '')} ({hp.get('element', '')})")

    # Day Master (most important)
    if saju_data.get("dayMaster"):
        dm = saju_data["dayMaster"]
        lines.append(f"일간(본인): {dm.get('heavenlyStem', '')} - {dm.get('element', '')}의 기운")

    # Five Elements balance
    if saju_data.get("fiveElements"):
        fe = saju_data["fiveElements"]
        elements = [f"{k}({v})" for k, v in fe.items() if v]
        if elements:
            lines.append(f"오행 분포: {', '.join(elements)}")

    # Dominant element
    if saju_data.get("dominantElement"):
        lines.append(f"주요 기운: {saju_data['dominantElement']}")

    # Ten Gods (if available)
    if saju_data.get("tenGods"):
        tg = saju_data["tenGods"]
        if isinstance(tg, dict):
            gods = [f"{k}: {v}" for k, v in list(tg.items())[:4]]
            if gods:
                lines.append(f"십신: {', '.join(gods)}")

    return "\n".join(lines) if lines else "사주 정보 부족"


def _build_detailed_astro(astro_data: dict) -> str:
    """Build detailed astrology context for personalized responses."""
    if not astro_data:
        return "점성술 정보 없음"

    lines = []

    # Big Three
    if astro_data.get("sun"):
        sun = astro_data["sun"]
        lines.append(f"태양(자아): {sun.get('sign', '')} {sun.get('degree', '')}°")
    if astro_data.get("moon"):
        moon = astro_data["moon"]
        lines.append(f"달(감정): {moon.get('sign', '')} {moon.get('degree', '')}°")
    if astro_data.get("ascendant"):
        asc = astro_data["ascendant"]
        lines.append(f"상승(외적): {asc.get('sign', '')} {asc.get('degree', '')}°")

    # Other planets
    for planet in ["mercury", "venus", "mars", "jupiter", "saturn"]:
        if astro_data.get(planet):
            p = astro_data[planet]
            names = {"mercury": "수성(소통)", "venus": "금성(사랑)", "mars": "화성(에너지)",
                     "jupiter": "목성(행운)", "saturn": "토성(시련)"}
            lines.append(f"{names.get(planet, planet)}: {p.get('sign', '')}")

    # Houses (if available)
    if astro_data.get("houses"):
        h = astro_data["houses"]
        if h.get("10"):
            lines.append(f"10하우스(직업): {h['10'].get('sign', '')}")
        if h.get("7"):
            lines.append(f"7하우스(관계): {h['7'].get('sign', '')}")

    return "\n".join(lines) if lines else "점성술 정보 부족"


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
        raw_prompt = data.get("prompt") or ""
        # Detect structured JSON prompts from frontend (these contain format instructions)
        is_structured_prompt = (
            "You MUST return a valid JSON object" in raw_prompt or
            '"lifeTimeline"' in raw_prompt or
            '"categoryAnalysis"' in raw_prompt
        )
        # Allow full prompt for structured requests, otherwise clamp to 500 chars
        prompt = raw_prompt if is_structured_prompt else raw_prompt[:500]
        if is_structured_prompt:
            logger.info(f"[ASK] Detected STRUCTURED JSON prompt (len={len(raw_prompt)})")

        # render_mode: "template" (AI 없이 즉시) or "gpt" (AI 사용)
        render_mode = data.get("render_mode", "gpt")
        logger.info(f"[ASK] id={g.request_id} theme={theme} locale={locale} render_mode={render_mode}")

        facts = {
            "theme": theme,
            "saju": saju_data,
            "astro": astro_data,
            "tarot": tarot_data,
            "prompt": prompt,
            "locale": locale,
            "render_mode": render_mode,  # 🔥 템플릿/AI 모드 구분
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


@app.route("/ask-stream", methods=["POST"])
def ask_stream():
    """
    Streaming version of /ask for real-time chat responses.
    Uses Server-Sent Events (SSE) for instant first-token response.

    If session_id is provided (from /counselor/init), uses pre-fetched RAG data
    for richer responses with all embedded knowledge.
    """
    try:
        # Ensure UTF-8 encoding for request data (Windows encoding fix)
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        birth_data = data.get("birth") or {}
        theme = data.get("theme", "chat")
        locale = data.get("locale", "en")
        prompt = (data.get("prompt") or "")[:1500]  # Chat prompt limit
        session_id = data.get("session_id")  # Optional: use pre-fetched RAG data
        conversation_history = data.get("history") or []  # Previous messages for context
        user_context = data.get("user_context") or {}  # Premium: persona + session summaries
        cv_text = (data.get("cv_text") or "")[:4000]  # CV/Resume text for career consultations

        logger.info(f"[ASK-STREAM] id={g.request_id} theme={theme} locale={locale} session={session_id or 'none'} history_len={len(conversation_history)} has_user_ctx={bool(user_context)} cv_len={len(cv_text)}")
        logger.info(f"[ASK-STREAM] saju dayMaster: {saju_data.get('dayMaster', {})}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        rag_context = ""
        if session_id:
            session_cache = get_session_rag_cache(session_id)
            if session_cache:
                logger.info(f"[ASK-STREAM] Using pre-fetched session data for {session_id}")
                # Use cached saju/astro if not provided in request
                if not saju_data:
                    saju_data = session_cache.get("saju_data", {})
                if not astro_data:
                    astro_data = session_cache.get("astro_data", {})

                # Build rich RAG context from pre-fetched data
                rag_data = session_cache.get("rag_data", {})

                # GraphRAG context
                if rag_data.get("graph_nodes"):
                    rag_context += "\n[📊 관련 지식 그래프]\n"
                    rag_context += "\n".join(rag_data["graph_nodes"][:8])

                # Jung quotes
                if rag_data.get("corpus_quotes"):
                    rag_context += "\n\n[📚 관련 융 심리학 인용]\n"
                    for q in rag_data["corpus_quotes"][:3]:
                        rag_context += f"• {q.get('text_ko', q.get('text_en', ''))} ({q.get('source', '')})\n"

                # Persona insights
                persona = rag_data.get("persona_context", {})
                if persona.get("jung"):
                    rag_context += "\n[🧠 분석가 관점]\n"
                    rag_context += "\n".join(f"• {i}" for i in persona["jung"][:3])
                if persona.get("stoic"):
                    rag_context += "\n\n[⚔️ 스토아 철학 관점]\n"
                    rag_context += "\n".join(f"• {i}" for i in persona["stoic"][:3])

                logger.info(f"[ASK-STREAM] RAG context from session: {len(rag_context)} chars")
            else:
                logger.warning(f"[ASK-STREAM] Session {session_id} not found or expired")

        # If saju/astro not provided but birth info is, compute minimal data
        if not saju_data and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = calculate_saju_data(
                    birth_data["date"],
                    birth_data["time"],
                    birth_data.get("gender", "male")
                )
            except Exception as e:
                logger.warning(f"[ASK-STREAM] Failed to compute saju: {e}")

        if not astro_data and birth_data.get("date") and birth_data.get("time"):
            try:
                lat = birth_data.get("lat") or birth_data.get("latitude") or 37.5665
                lon = birth_data.get("lon") or birth_data.get("longitude") or 126.9780
                # calculate_astrology_data expects a dict with year/month/day/hour/minute
                date_parts = birth_data["date"].split("-")  # "YYYY-MM-DD"
                time_parts = birth_data["time"].split(":")  # "HH:MM"
                astro_data = calculate_astrology_data({
                    "year": int(date_parts[0]),
                    "month": int(date_parts[1]),
                    "day": int(date_parts[2]),
                    "hour": int(time_parts[0]),
                    "minute": int(time_parts[1]) if len(time_parts) > 1 else 0,
                    "latitude": lat,
                    "longitude": lon,
                })
            except Exception as e:
                logger.warning(f"[ASK-STREAM] Failed to compute astro: {e}")

        # Build DETAILED chart context (not just summary)
        saju_detail = _build_detailed_saju(saju_data)
        astro_detail = _build_detailed_astro(astro_data)
        logger.info(f"[ASK-STREAM] saju_detail length: {len(saju_detail)}")
        logger.info(f"[ASK-STREAM] astro_detail length: {len(astro_detail)}")

        # Get cross-analysis (from session or instant lookup)
        cross_rules = ""
        if session_cache and session_cache.get("rag_data", {}).get("cross_analysis"):
            cross_rules = session_cache["rag_data"]["cross_analysis"]
        else:
            try:
                cross_rules = get_cross_analysis_for_chart(saju_data, astro_data, theme)
                if cross_rules:
                    logger.info(f"[ASK-STREAM] Instant cross-analysis: {len(cross_rules)} chars, theme={theme}")
            except Exception as e:
                logger.warning(f"[ASK-STREAM] Cross-analysis lookup failed: {e}")

        # Build cross-analysis section
        cross_section = ""
        if cross_rules:
            cross_section = f"\n[사주+점성 교차 해석 규칙]\n{cross_rules}\n"

        # Current date for time-relevant advice
        from datetime import datetime
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"

        # Build user context section for returning users (premium feature)
        user_context_section = ""
        if user_context:
            persona = user_context.get("persona", {})
            recent_sessions = user_context.get("recentSessions", [])

            if persona.get("sessionCount", 0) > 0 or recent_sessions:
                user_context_section = "\n[🔄 이전 상담 맥락]\n"

                # Persona memory
                if persona.get("sessionCount"):
                    user_context_section += f"• 총 {persona['sessionCount']}회 상담한 재방문 고객\n"
                if persona.get("lastTopics"):
                    topics = persona["lastTopics"][:3] if isinstance(persona["lastTopics"], list) else []
                    if topics:
                        user_context_section += f"• 주요 관심사: {', '.join(topics)}\n"
                if persona.get("emotionalTone"):
                    user_context_section += f"• 감정 상태: {persona['emotionalTone']}\n"
                if persona.get("recurringIssues"):
                    issues = persona["recurringIssues"][:2] if isinstance(persona["recurringIssues"], list) else []
                    if issues:
                        user_context_section += f"• 반복 이슈: {', '.join(issues)}\n"

                # Recent session summaries
                if recent_sessions:
                    user_context_section += "\n[최근 대화]\n"
                    for sess in recent_sessions[:2]:  # Last 2 sessions
                        if sess.get("summary"):
                            user_context_section += f"• {sess['summary']}\n"
                        elif sess.get("keyTopics"):
                            topics_str = ", ".join(sess["keyTopics"][:3]) if isinstance(sess["keyTopics"], list) else ""
                            if topics_str:
                                user_context_section += f"• 주제: {topics_str}\n"

                user_context_section += "\n→ 재방문 고객이니 '또 오셨네요' 같은 친근한 인사로 시작하고, 이전 상담 내용을 자연스럽게 참조하세요.\n"
                logger.info(f"[ASK-STREAM] User context section: {len(user_context_section)} chars")

        # Build CV/Resume section for career consultations
        cv_section = ""
        if cv_text and theme == "career":
            cv_section = f"""
[📄 사용자 이력서/CV]
{cv_text}

→ 위 이력서 내용을 참고하여 사용자의 경력, 기술, 경험에 맞는 구체적인 커리어 조언을 제공하세요.
→ 사주/점성 해석과 이력서 내용을 연결하여 개인화된 조언을 해주세요.
"""
            logger.info(f"[ASK-STREAM] CV section added: {len(cv_text)} chars")

        # Build system prompt - with or without RAG context
        if rag_context:
            # RICH prompt with all RAG data
            system_prompt = f"""사주+점성+심리학 교차분석 전문 상담사. 두 시스템을 통합하여 하나의 해석으로 답변하세요.

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요

[사주] {saju_detail}
[점성] {astro_detail}
{cross_section}
{rag_context}
{user_context_section}{cv_section}
[응답 방식]
⚠️ 중요: 먼저 질문 유형을 파악하고 그에 맞는 첫 문장을 선택하세요!

질문 유형별 첫 문장:
[자기탐색] "나/내 성격/나에 대해/어떤 사람/장단점/특징"
  → "흥미로운 질문이네요!" / "본인에 대해 알고 싶으시군요!" / "좋은 질문이에요." / "자신을 알고자 하는 마음이 멋지네요."

[운세/흐름] "운세/오늘/이번달/올해/내년/언제쯤/시기"
  → "어떤 흐름인지 궁금하시죠!" / "살펴볼게요." / "타이밍이 중요하죠." / "흐름을 함께 봐요."

[기대/설렘] "될까요/가능할까요/잘될까/좋아질까/희망"
  → "기대되시죠!" / "궁금하시죠." / "좋은 징조가 보여요." / "희망적인 마음이 느껴져요."

[힘든상황] "힘들어/어려워/안좋아/지쳐/포기/우울/슬퍼"
  → "많이 힘드셨죠..." / "괜찮으세요?" / "마음이 무거우시겠어요." / "힘든 시간을 보내고 계시네요."

[고민/걱정] "고민/걱정/불안/두려워/망설여/어떡해"
  → "고민이 많으시죠..." / "걱정되는 마음 이해해요." / "많이 생각하고 계시네요."

[연애/관계] "연애/사랑/결혼/이별/짝사랑/썸/재회/고백"
  → "설레는 마음이 느껴지네요." / "마음이 복잡하시죠." / "감정이 깊으시네요." / "사랑 이야기군요."

[커리어] "취업/이직/진로/사업/승진/퇴사/면접/합격"
  → "중요한 시기네요." / "신중하게 생각하고 계시네요." / "커리어 고민이시군요." / "좋은 기회를 찾고 계시네요."

[재물/돈] "돈/재물/투자/부동산/복권/사업자금/수입"
  → "재정 상황이 궁금하시군요." / "돈 문제는 신중해야 하죠." / "재물운을 살펴볼게요."

[건강] "건강/아파/병원/체력/다이어트/운동"
  → "건강이 제일 중요하죠." / "몸 상태가 걱정되시나요?" / "건강운을 살펴볼게요."

[가족/인간관계] "가족/부모님/자녀/친구/동료/갈등/화해"
  → "관계가 고민이시군요." / "주변 사람들과의 관계, 중요하죠." / "인연의 흐름을 볼게요."

[선택/결정] "어떻게/뭐가 나을까/선택/결정/고르기/A vs B"
  → "중요한 갈림길이시네요." / "선택의 순간이군요." / "함께 살펴볼게요."

[궁합/상성] "궁합/잘 맞을까/상성/어울려/케미"
  → "두 분의 케미가 궁금하시군요!" / "궁합을 살펴볼게요." / "흥미로운 조합이네요."

[감사/좋은일] "감사/좋은일/잘됐어/성공/축하"
  → "좋은 소식이네요!" / "축하드려요!" / "기쁜 일이 있으셨군요!" / "잘 되셨네요!"

[이사/여행] "이사/여행/유학/해외/이민"
  → "새로운 곳이 궁금하시군요!" / "변화의 시기네요." / "이동운을 살펴볼게요."

[시험/학업] "시험/공부/합격/자격증/학교"
  → "열심히 준비하고 계시네요!" / "학업운을 살펴볼게요." / "좋은 결과 있길 바라요."

❌ 절대 금지:
- "~님의 사주에서..."로 시작
- 성격 질문에 "고민이 많으시죠" (←고민 질문에만!)
- 좋은 얘기에 "힘드셨죠" / 힘든 얘기에 "축하해요"

✅ 사주와 점성을 교차 분석하여 자연스럽게 통합 해석하세요.

✅ 구체적이고 풍부한 내용:
- 성격/성향 분석, 시기별 흐름, 실용적 조언, 주의점

📌 응답 형식:
1. 본문 (200-250단어, {locale})
2. 마지막 줄에 반드시: ||FOLLOWUP||["질문1", "질문2"]
   - 방금 답변 내용과 연관된, 사용자가 궁금해할 만한 후속 질문 2개
   - 예: 성격 얘기했으면 → ["그럼 연애할 때는 어때요?", "직장에서는 어떤 스타일이에요?"]
   - 예: 시기 얘기했으면 → ["더 구체적인 날짜가 궁금해요", "그 전에 준비할 건 뭐예요?"]
   - 예: 조언 했으면 → ["반대로 하면 어떻게 돼요?", "비슷한 사례가 있어요?"]"""
        else:
            # Standard prompt (no session data)
            system_prompt = f"""사주+점성 교차분석 전문 상담사. 두 시스템을 통합하여 하나의 해석으로 답변하세요.

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요

[사주] {saju_detail}
[점성] {astro_detail}
{cross_section}
{user_context_section}{cv_section}
[응답 방식]
⚠️ 중요: 먼저 질문 유형을 파악하고 그에 맞는 첫 문장을 선택하세요!

질문 유형별 첫 문장:
[자기탐색] "나/내 성격/나에 대해/어떤 사람/장단점/특징"
  → "흥미로운 질문이네요!" / "본인에 대해 알고 싶으시군요!" / "좋은 질문이에요." / "자신을 알고자 하는 마음이 멋지네요."

[운세/흐름] "운세/오늘/이번달/올해/내년/언제쯤/시기"
  → "어떤 흐름인지 궁금하시죠!" / "살펴볼게요." / "타이밍이 중요하죠." / "흐름을 함께 봐요."

[기대/설렘] "될까요/가능할까요/잘될까/좋아질까/희망"
  → "기대되시죠!" / "궁금하시죠." / "좋은 징조가 보여요." / "희망적인 마음이 느껴져요."

[힘든상황] "힘들어/어려워/안좋아/지쳐/포기/우울/슬퍼"
  → "많이 힘드셨죠..." / "괜찮으세요?" / "마음이 무거우시겠어요." / "힘든 시간을 보내고 계시네요."

[고민/걱정] "고민/걱정/불안/두려워/망설여/어떡해"
  → "고민이 많으시죠..." / "걱정되는 마음 이해해요." / "많이 생각하고 계시네요."

[연애/관계] "연애/사랑/결혼/이별/짝사랑/썸/재회/고백"
  → "설레는 마음이 느껴지네요." / "마음이 복잡하시죠." / "감정이 깊으시네요." / "사랑 이야기군요."

[커리어] "취업/이직/진로/사업/승진/퇴사/면접/합격"
  → "중요한 시기네요." / "신중하게 생각하고 계시네요." / "커리어 고민이시군요." / "좋은 기회를 찾고 계시네요."

[재물/돈] "돈/재물/투자/부동산/복권/사업자금/수입"
  → "재정 상황이 궁금하시군요." / "돈 문제는 신중해야 하죠." / "재물운을 살펴볼게요."

[건강] "건강/아파/병원/체력/다이어트/운동"
  → "건강이 제일 중요하죠." / "몸 상태가 걱정되시나요?" / "건강운을 살펴볼게요."

[가족/인간관계] "가족/부모님/자녀/친구/동료/갈등/화해"
  → "관계가 고민이시군요." / "주변 사람들과의 관계, 중요하죠." / "인연의 흐름을 볼게요."

[선택/결정] "어떻게/뭐가 나을까/선택/결정/고르기/A vs B"
  → "중요한 갈림길이시네요." / "선택의 순간이군요." / "함께 살펴볼게요."

[궁합/상성] "궁합/잘 맞을까/상성/어울려/케미"
  → "두 분의 케미가 궁금하시군요!" / "궁합을 살펴볼게요." / "흥미로운 조합이네요."

[감사/좋은일] "감사/좋은일/잘됐어/성공/축하"
  → "좋은 소식이네요!" / "축하드려요!" / "기쁜 일이 있으셨군요!" / "잘 되셨네요!"

[이사/여행] "이사/여행/유학/해외/이민"
  → "새로운 곳이 궁금하시군요!" / "변화의 시기네요." / "이동운을 살펴볼게요."

[시험/학업] "시험/공부/합격/자격증/학교"
  → "열심히 준비하고 계시네요!" / "학업운을 살펴볼게요." / "좋은 결과 있길 바라요."

❌ 절대 금지:
- "~님의 사주에서..."로 시작
- 성격 질문에 "고민이 많으시죠" (←고민 질문에만!)
- 좋은 얘기에 "힘드셨죠" / 힘든 얘기에 "축하해요"

✅ 사주와 점성을 교차 분석하여 자연스럽게 통합 해석하세요.

✅ 구체적이고 풍부한 내용:
- 성격/성향 분석, 시기별 흐름, 실용적 조언, 주의점

📌 응답 형식:
1. 본문 (150-200단어, {locale})
2. 마지막 줄에 반드시: ||FOLLOWUP||["질문1", "질문2"]
   - 방금 답변 내용과 연관된, 사용자가 궁금해할 만한 후속 질문 2개
   - 예: 성격 얘기했으면 → ["그럼 연애할 때는 어때요?", "직장에서는 어떤 스타일이에요?"]
   - 예: 시기 얘기했으면 → ["더 구체적인 날짜가 궁금해요", "그 전에 준비할 건 뭐예요?"]"""
        def generate():
            """SSE generator for streaming response."""
            try:
                from openai import OpenAI
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

                # Build messages with conversation history (last 6 exchanges max)
                messages = [{"role": "system", "content": system_prompt}]

                # Add conversation history (limit to recent messages to save tokens)
                history_limit = 6  # 3 user + 3 assistant messages
                recent_history = conversation_history[-history_limit:] if conversation_history else []
                for msg in recent_history:
                    if msg.get("role") in ("user", "assistant") and msg.get("content"):
                        messages.append({
                            "role": msg["role"],
                            "content": msg["content"][:500]  # Truncate old messages
                        })

                # Add current user message
                messages.append({"role": "user", "content": prompt})

                stream = client.chat.completions.create(
                    model="gpt-4o-mini",  # Fast model for chat
                    messages=messages,
                    max_tokens=600,  # Detailed responses (150-250 words)
                    temperature=0.7,
                    stream=True
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        text = chunk.choices[0].delta.content
                        # SSE format: data: <content>\n\n
                        yield f"data: {text}\n\n"

                # Signal end of stream
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[ASK-STREAM] Streaming error: {e}")
                yield f"data: [ERROR] {str(e)}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] id={getattr(g, 'request_id', '')} /ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/counselor/init", methods=["POST"])
def counselor_init():
    """
    Initialize counselor session with pre-fetched RAG data.
    Call this ONCE when user enters counselor chat (before first message).

    This pre-computes all relevant RAG data (~10-20s) so subsequent
    chat messages are instant.

    Request body:
        {
            "saju": {...},      # User's saju data
            "astro": {...},     # User's astrology data
            "theme": "career",  # Optional theme (default: "chat")
        }

    Response:
        {
            "status": "success",
            "session_id": "abc123",
            "prefetch_time_ms": 15234,
            "data_summary": {
                "graph_nodes": 15,
                "corpus_quotes": 5,
                "persona_insights": 10
            }
        }
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        theme = data.get("theme", "chat")

        logger.info(f"[COUNSELOR-INIT] id={g.request_id} theme={theme}")
        logger.info(f"[COUNSELOR-INIT] saju dayMaster: {saju_data.get('dayMaster', {})}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        # Pre-fetch ALL RAG data (this is slow but only happens once)
        rag_data = prefetch_all_rag_data(saju_data, astro_data, theme)

        # Store in session cache
        set_session_rag_cache(session_id, {
            "rag_data": rag_data,
            "saju_data": saju_data,
            "astro_data": astro_data,
            "theme": theme,
        })

        return jsonify({
            "status": "success",
            "session_id": session_id,
            "prefetch_time_ms": rag_data.get("prefetch_time_ms", 0),
            "data_summary": {
                "graph_nodes": len(rag_data.get("graph_nodes", [])),
                "corpus_quotes": len(rag_data.get("corpus_quotes", [])),
                "persona_insights": len(rag_data.get("persona_context", {}).get("jung", [])) +
                                   len(rag_data.get("persona_context", {}).get("stoic", [])),
                "has_cross_analysis": bool(rag_data.get("cross_analysis")),
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] id={getattr(g, 'request_id', '')} /counselor/init failed: {e}")
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
@app.route("/api/dream/interpret-stream", methods=["POST"])
def dream_interpret_stream():
    """
    Streaming dream interpretation - returns SSE for real-time display.
    Uses GPT-4o-mini for fast streaming.
    Streams: summary → symbols → recommendations → done
    """
    try:
        data = request.get_json(force=True)
        logger.info(f"[DREAM_STREAM] id={g.request_id} Starting streaming interpretation")

        dream_text = data.get("dream", "")
        symbols = data.get("symbols", [])
        emotions = data.get("emotions", [])
        themes = data.get("themes", [])
        context = data.get("context", [])
        locale = data.get("locale", "ko")

        # Cultural symbols
        cultural_parts = []
        if data.get("koreanTypes"):
            cultural_parts.append(f"Korean Types: {', '.join(data['koreanTypes'])}")
        if data.get("koreanLucky"):
            cultural_parts.append(f"Korean Lucky: {', '.join(data['koreanLucky'])}")
        if data.get("chinese"):
            cultural_parts.append(f"Chinese: {', '.join(data['chinese'])}")
        if data.get("islamicTypes"):
            cultural_parts.append(f"Islamic Types: {', '.join(data['islamicTypes'])}")
        if data.get("western"):
            cultural_parts.append(f"Western/Jungian: {', '.join(data['western'])}")
        if data.get("hindu"):
            cultural_parts.append(f"Hindu: {', '.join(data['hindu'])}")
        if data.get("japanese"):
            cultural_parts.append(f"Japanese: {', '.join(data['japanese'])}")

        cultural_context = '\n'.join(cultural_parts) if cultural_parts else 'None'

        is_korean = locale == "ko"
        lang_instruction = "Please respond entirely in Korean (한국어로 답변해주세요)." if is_korean else "Please respond in English."

        def generate_stream():
            """Generator for SSE streaming dream interpretation"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # === SECTION 1: Summary (streaming) ===
                yield f"data: {json.dumps({'section': 'summary', 'status': 'start'})}\n\n"

                summary_prompt = f"""당신은 따뜻하고 공감 능력이 뛰어난 꿈 상담사입니다.
마치 오랜 친구에게 이야기하듯 편안하게 꿈의 메시지를 전달해주세요.

{lang_instruction}

꿈 내용:
{dream_text[:1500]}

심볼: {', '.join(symbols) if symbols else '없음'}
감정: {', '.join(emotions) if emotions else '없음'}
유형: {', '.join(themes) if themes else '없음'}
상황: {', '.join(context) if context else '없음'}
문화적 맥락: {cultural_context}

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하셨군요", "~느끼셨을 거예요")
- 꿈이 전하는 메시지를 부드럽게 해석
- 불안한 꿈이라도 긍정적 관점으로 재해석
- 3-4문장으로 자연스럽게 요약"""

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.7,
                    max_tokens=400,
                    stream=True
                )

                summary_text = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        summary_text += content
                        yield f"data: {json.dumps({'section': 'summary', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'summary', 'status': 'done', 'full_text': summary_text})}\n\n"

                # === SECTION 2: Symbol Analysis (streaming) ===
                yield f"data: {json.dumps({'section': 'symbols', 'status': 'start'})}\n\n"

                symbols_prompt = f"""당신은 따뜻한 꿈 상담사입니다. 꿈에 나타난 심볼들의 의미를 친근하게 설명해주세요.

{lang_instruction}

꿈 내용: {dream_text[:1000]}
심볼: {', '.join(symbols) if symbols else '꿈에서 추출'}
문화적 맥락: {cultural_context}

상담 스타일:
- 각 심볼을 개인의 상황과 연결하여 해석
- 문화적·심리학적 의미를 쉽게 풀어서 설명
- 부정적 심볼도 성장의 메시지로 재해석
- 번호 없이 자연스러운 대화체로 2-3개 심볼 분석"""

                symbol_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": symbols_prompt}],
                    temperature=0.7,
                    max_tokens=500,
                    stream=True
                )

                symbols_text = ""
                for chunk in symbol_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        symbols_text += content
                        yield f"data: {json.dumps({'section': 'symbols', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'symbols', 'status': 'done', 'full_text': symbols_text})}\n\n"

                # === SECTION 3: Recommendations (streaming) ===
                yield f"data: {json.dumps({'section': 'recommendations', 'status': 'start'})}\n\n"

                rec_prompt = f"""당신은 따뜻한 꿈 상담사입니다. 꿈의 메시지를 실생활에 적용할 수 있는 조언을 해주세요.

{lang_instruction}

꿈 요약: {summary_text[:500]}
감정: {', '.join(emotions) if emotions else '없음'}

상담 스타일:
- 친구에게 조언하듯 편안하고 실용적으로
- 작은 실천 가능한 행동 제안 (예: "오늘 잠깐 산책해보시는 건 어떨까요?")
- 꿈이 전하는 긍정적 메시지 강조
- 2-3가지 따뜻한 조언"""

                rec_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": rec_prompt}],
                    temperature=0.7,
                    max_tokens=300,
                    stream=True
                )

                rec_text = ""
                for chunk in rec_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        rec_text += content
                        yield f"data: {json.dumps({'section': 'recommendations', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'recommendations', 'status': 'done', 'full_text': rec_text})}\n\n"

                # === DONE ===
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[DREAM_STREAM] Error: {stream_error}")
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /api/dream/interpret-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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


@app.route("/iching/reading-stream", methods=["POST"])
def iching_reading_stream():
    """
    Streaming I Ching interpretation - returns SSE for real-time display.
    Uses GPT-4o-mini for fast streaming.
    Streams: overview → changing_lines → advice → done
    """
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[ICHING_STREAM] id={g.request_id} Starting streaming interpretation")

        # Get hexagram data from request
        hexagram_number = data.get("hexagramNumber")
        hexagram_name = data.get("hexagramName", "")
        hexagram_symbol = data.get("hexagramSymbol", "")
        judgment = data.get("judgment", "")
        image = data.get("image", "")
        core_meaning = data.get("coreMeaning", "")
        changing_lines = data.get("changingLines", [])
        resulting_hexagram = data.get("resultingHexagram")
        question = data.get("question", "")
        locale = data.get("locale", "ko")
        themes = data.get("themes", {})

        is_korean = locale == "ko"
        lang_instruction = "Please respond entirely in Korean (한국어로 답변해주세요)." if is_korean else "Please respond in English."

        def generate_stream():
            """Generator for SSE streaming I Ching interpretation"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # === SECTION 1: Overview (streaming) ===
                yield f"data: {json.dumps({'section': 'overview', 'status': 'start'})}\n\n"

                overview_prompt = f"""당신은 따뜻하고 통찰력 있는 주역 상담사입니다.
마치 오랜 스승처럼 지혜롭고 다정하게 괘의 핵심 메시지를 전달해주세요.

{lang_instruction}

괘 정보:
- 괘명: {hexagram_name} {hexagram_symbol} (제{hexagram_number}괘)
- 괘사(Judgment): {judgment}
- 상사(Image): {image}
- 핵심 의미: {core_meaning}

{f'질문: {question}' if question else '일반 점괘'}

테마별 해석 참고:
- 직업/사업: {themes.get('career', '')}
- 연애/관계: {themes.get('love', '')}
- 건강: {themes.get('health', '')}
- 재물: {themes.get('wealth', '')}
- 시기: {themes.get('timing', '')}

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하시는군요", "~의 시기입니다")
- 괘가 전하는 핵심 메시지를 부드럽게 해석
- 질문이 있다면 그에 맞춰 구체적으로 답변
- 3-4문장으로 자연스럽게 현재 상황과 연결하여 해석"""

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": overview_prompt}],
                    temperature=0.7,
                    max_tokens=500,
                    stream=True
                )

                overview_text = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        overview_text += content
                        yield f"data: {json.dumps({'section': 'overview', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'overview', 'status': 'done', 'full_text': overview_text})}\n\n"

                # === SECTION 2: Changing Lines Analysis (if any) ===
                if changing_lines:
                    yield f"data: {json.dumps({'section': 'changing', 'status': 'start'})}\n\n"

                    changing_info = "\n".join([f"- {i+1}효: {line.get('text', '')}" for i, line in enumerate(changing_lines)])
                    resulting_info = ""
                    if resulting_hexagram:
                        resulting_info = f"변화 후 괘: {resulting_hexagram.get('name', '')} {resulting_hexagram.get('symbol', '')}"

                    changing_prompt = f"""주역 상담사로서 변효(변하는 효)의 의미를 해석해주세요.

{lang_instruction}

현재 괘: {hexagram_name} {hexagram_symbol}
변효:
{changing_info}

{resulting_info}

상담 스타일:
- 변효가 의미하는 변화의 과정을 설명
- 현재에서 미래로 가는 흐름을 따뜻하게 해석
- 변화를 두려워하지 않도록 긍정적 관점 제시
- 2-3문장으로 핵심만 전달"""

                    changing_stream = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": changing_prompt}],
                        temperature=0.7,
                        max_tokens=400,
                        stream=True
                    )

                    changing_text = ""
                    for chunk in changing_stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            changing_text += content
                            yield f"data: {json.dumps({'section': 'changing', 'content': content})}\n\n"

                    yield f"data: {json.dumps({'section': 'changing', 'status': 'done', 'full_text': changing_text})}\n\n"

                # === SECTION 3: Practical Advice (streaming) ===
                yield f"data: {json.dumps({'section': 'advice', 'status': 'start'})}\n\n"

                advice_prompt = f"""주역 상담사로서 실생활에 적용할 수 있는 조언을 해주세요.

{lang_instruction}

괘: {hexagram_name} - {core_meaning}
{f'질문: {question}' if question else ''}
전체 해석: {overview_text[:300]}

상담 스타일:
- 친구에게 조언하듯 편안하고 실용적으로
- 오늘/이번 주 할 수 있는 작은 실천 제안
- 괘의 지혜를 현대적 상황에 맞게 적용
- 2-3가지 따뜻한 조언 (번호 없이 자연스럽게)"""

                advice_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": advice_prompt}],
                    temperature=0.7,
                    max_tokens=400,
                    stream=True
                )

                advice_text = ""
                for chunk in advice_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        advice_text += content
                        yield f"data: {json.dumps({'section': 'advice', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'advice', 'status': 'done', 'full_text': advice_text})}\n\n"

                # === DONE ===
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[ICHING_STREAM] Error: {stream_error}")
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /iching/reading-stream failed: {e}")
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


# ===============================================================
# 🎴 DYNAMIC FOLLOW-UP QUESTIONS GENERATOR
# ===============================================================
def generate_dynamic_followup_questions(
    interpretation: str,
    cards: list,
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: list = None
) -> list:
    """
    Generate dynamic, contextual follow-up questions based on the interpretation.
    Uses GPT to create specific, engaging questions that change with each reading.

    Args:
        interpretation: The full interpretation text
        cards: List of card dicts with 'name' and 'isReversed'
        category: Theme category (love, career, etc.)
        user_question: Original user question if any
        language: 'ko' or 'en'
        static_questions: Fallback static questions

    Returns:
        List of 5 dynamic follow-up questions
    """
    try:
        # Extract key elements from interpretation for context
        interpretation_preview = interpretation[:800] if len(interpretation) > 800 else interpretation
        card_names = [f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}" for c in cards]
        cards_str = ", ".join(card_names)

        # Detect reading tone from interpretation
        positive_keywords = ["기회", "성공", "행운", "긍정", "발전", "희망", "사랑", "축복", "성취", "기쁨",
                           "opportunity", "success", "luck", "positive", "growth", "hope", "love", "blessing", "joy"]
        challenging_keywords = ["주의", "경고", "위험", "도전", "갈등", "어려움", "장애", "시련", "조심",
                               "caution", "warning", "danger", "challenge", "conflict", "difficulty", "obstacle"]

        tone = "neutral"
        positive_count = sum(1 for k in positive_keywords if k in interpretation.lower())
        challenging_count = sum(1 for k in challenging_keywords if k in interpretation.lower())

        if positive_count > challenging_count + 2:
            tone = "positive"
        elif challenging_count > positive_count + 2:
            tone = "challenging"

        # Build GPT prompt for generating dynamic questions
        is_korean = language == "ko"

        if is_korean:
            prompt = f"""당신은 전문 타로 리더입니다. 방금 제공된 타로 해석을 바탕으로, 사용자가 더 깊이 탐구하고 싶어할 만한 후속 질문 5개를 생성하세요.

## 해석 요약
카드: {cards_str}
카테고리: {category}
리딩 톤: {tone}
{'원래 질문: ' + user_question if user_question else ''}

## 해석 내용
{interpretation_preview}

## 질문 생성 지침
1. 해석에서 언급된 구체적인 내용/상징/조언에 기반한 질문
2. 사용자가 "와, 이걸 더 알고 싶다!" 라고 느낄 만큼 흥미로운 질문
3. 단순 예/아니오가 아닌, 깊이 있는 대화를 유도하는 질문
4. 카드 이름이나 상징을 구체적으로 언급
5. 각 질문은 서로 다른 관점 제시 (시기, 조언, 숨겨진 의미, 관계, 행동)

## 응답 형식
질문 5개를 줄바꿈으로 구분해서 작성하세요. 번호나 불릿 없이 질문만 작성.

예시:
{card_names[0] if card_names else '광대'} 카드가 암시하는 새로운 시작의 구체적인 타이밍은?
이 리딩에서 경고하는 숨겨진 장애물을 극복하는 방법은?"""
        else:
            prompt = f"""You are an expert tarot reader. Based on the tarot interpretation just provided, generate 5 follow-up questions the user would want to explore deeper.

## Reading Summary
Cards: {cards_str}
Category: {category}
Reading Tone: {tone}
{'Original Question: ' + user_question if user_question else ''}

## Interpretation
{interpretation_preview}

## Question Guidelines
1. Based on specific content/symbols/advice mentioned in the interpretation
2. Intriguing enough that user thinks "I want to know more about this!"
3. Open-ended questions that lead to deeper conversation
4. Specifically mention card names or symbols
5. Each question offers a different perspective (timing, advice, hidden meaning, relationships, actions)

## Response Format
Write 5 questions separated by newlines. No numbers or bullets, just questions.

Example:
What specific timing does {card_names[0] if card_names else 'The Fool'} suggest for this new beginning?
How can I overcome the hidden obstacles this reading warns about?"""

        # Generate with GPT-4o-mini for speed
        response = _generate_with_gpt4(prompt, max_tokens=500, temperature=0.8, use_mini=True)

        # Parse response into list
        questions = [q.strip() for q in response.strip().split('\n') if q.strip() and len(q.strip()) > 10]

        # Ensure we have exactly 5 questions
        if len(questions) >= 5:
            return questions[:5]
        elif len(questions) > 0:
            # Pad with static questions if needed
            if static_questions:
                remaining = 5 - len(questions)
                questions.extend(static_questions[:remaining])
            return questions[:5]
        else:
            # Fallback to static
            return static_questions[:5] if static_questions else []

    except Exception as e:
        logger.warning(f"[TAROT] Dynamic question generation failed: {e}")
        return static_questions[:5] if static_questions else []


@app.route("/api/tarot/interpret", methods=["POST"])
def tarot_interpret():
    """
    Premium tarot interpretation using Hybrid RAG + Gemini.
    Supports optional saju/astrology context for enhanced readings.
    With caching for same card combinations.
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

        # === CACHING: Check cache for same card combination ===
        # Build cache key from cards + category + spread + language
        card_key = "_".join(sorted([
            f"{c.get('name', '')}{'_R' if c.get('is_reversed') else ''}"
            for c in cards
        ]))
        cache_key = f"tarot:interpret:{category}:{spread_id}:{language}:{card_key}"

        # Don't cache if user has specific question or personalization
        use_cache = not user_question and not birthdate and not saju_context and not astro_context
        cache = get_cache()

        if use_cache and cache:
            cached_result = cache.get(cache_key)
            if cached_result:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(f"[TAROT] id={g.request_id} CACHE HIT in {duration_ms}ms")
                cached_result["cached"] = True
                cached_result["performance"] = {"duration_ms": duration_ms, "cache_hit": True}
                return jsonify(cached_result)
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

        # === PARALLEL PROCESSING: Build RAG context and advanced analysis concurrently ===
        def build_rag_context():
            if birthdate:
                return hybrid_rag.build_premium_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question,
                    birthdate=birthdate,
                    moon_phase=moon_phase
                )
            else:
                return hybrid_rag.build_reading_context(
                    theme=mapped_theme,
                    sub_topic=mapped_spread,
                    drawn_cards=drawn_cards,
                    question=enhanced_question
                )

        def build_advanced_analysis():
            return hybrid_rag.get_advanced_analysis(drawn_cards)

        # Run both in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            rag_future = executor.submit(build_rag_context)
            advanced_future = executor.submit(build_advanced_analysis)

            rag_context = rag_future.result()
            advanced = advanced_future.result()

        if birthdate:
            logger.info(f"[TAROT] Using premium context with birthdate={birthdate} (parallel)")
        logger.info(f"[TAROT] RAG context and advanced analysis built in parallel")

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

        tarot_prompt = f"""당신은 따뜻하고 공감 능력이 뛰어난 타로 상담사입니다.
마치 오랜 친구에게 이야기하듯 편안하면서도 깊이 있게 카드의 메시지를 전달해주세요.

## 오늘: {date_str} ({season}){moon_phase_hint}

## 리딩 정보
카테고리: {category}
스프레드: {spread_title}
카드: {cards_str}
질문: {enhanced_question or "일반 운세"}

## 카드 컨텍스트
{rag_context}

## 상담 스타일
- 따뜻하고 공감하는 말투 ("~하시는군요", "카드가 이야기하고 있어요")
- 각 카드 위치별 의미를 자연스럽게 연결
- 단정적 예언 대신 가능성과 선택지 제시
- 실생활에 적용 가능한 구체적인 조언
- {('한국어로 자연스럽게' if is_korean else 'Write in English')}
- 600-800자 분량"""

        # Generate with GPT-4o-mini (fast, skip refine step)
        try:
            reading_text = _generate_with_gpt4(tarot_prompt, max_tokens=1200, temperature=0.5, use_mini=True)
        except Exception as llm_e:
            logger.warning(f"[TAROT] GPT-4o-mini failed: {llm_e}, using fallback")
            reading_text = f"카드 해석: {cards_str}. {rag_context[:500]}"

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

        # Note: advanced analysis already done in parallel above

        # Build response
        # Get static questions as fallback
        static_followup = hybrid_rag.advanced_rules.get_followup_questions(category, "neutral") if hasattr(hybrid_rag, 'advanced_rules') else []

        # Generate dynamic, contextual follow-up questions based on the interpretation
        dynamic_followup = generate_dynamic_followup_questions(
            interpretation=reading_text,
            cards=drawn_cards,
            category=category,
            user_question=enhanced_question or user_question or "",
            language=language,
            static_questions=static_followup
        )

        result = {
            "overall_message": reading_text,
            "card_insights": card_insights,
            "guidance": advanced.get("elemental_analysis", {}).get("dominant_advice", "카드의 지혜에 귀 기울이세요."),
            "affirmation": "나는 우주의 지혜를 신뢰합니다.",
            "combinations": [],
            "followup_questions": dynamic_followup
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
        result["performance"] = {"duration_ms": duration_ms, "cache_hit": False}

        # === CACHING: Store result in cache for same card combination ===
        if use_cache and cache:
            try:
                # Cache for 1 hour (3600 seconds) - same cards can have slightly varied interpretations
                cache.set(cache_key, result, ttl=3600)
                logger.info(f"[TAROT] Cached result for key: {cache_key[:50]}...")
            except Exception as cache_err:
                logger.warning(f"[TAROT] Failed to cache: {cache_err}")

        return jsonify(result)

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/interpret failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tarot/prefetch", methods=["POST"])
def tarot_prefetch():
    """
    Prefetch RAG context while user is selecting cards.
    Call this when user starts card selection to warm up the RAG system.
    """
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        category = data.get("category", "general")
        spread_id = data.get("spread_id", "three_card")

        logger.info(f"[TAROT_PREFETCH] id={g.request_id} Prefetching for {category}/{spread_id}")

        start_time = time.time()
        hybrid_rag = get_tarot_hybrid_rag()

        # Map theme/spread
        mapped_theme, mapped_spread = _map_tarot_theme(category, spread_id)

        # Pre-warm the RAG by loading theme-specific data
        # This loads embeddings and indexes into memory
        try:
            # Load theme data
            hybrid_rag._ensure_loaded()

            # Pre-compute some common lookups
            if hasattr(hybrid_rag, 'advanced_rules'):
                hybrid_rag.advanced_rules.get_followup_questions(category, "neutral")

            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"[TAROT_PREFETCH] Completed in {duration_ms}ms")

            return jsonify({
                "status": "ready",
                "category": category,
                "spread_id": spread_id,
                "mapped_theme": mapped_theme,
                "mapped_spread": mapped_spread,
                "duration_ms": duration_ms
            })

        except Exception as warm_e:
            logger.warning(f"[TAROT_PREFETCH] Warm-up failed: {warm_e}")
            return jsonify({
                "status": "partial",
                "message": str(warm_e)
            })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/prefetch failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tarot/interpret-stream", methods=["POST"])
def tarot_interpret_stream():
    """
    Streaming tarot interpretation - returns SSE for real-time display.
    Streams: overall_message → card_insights (one by one) → guidance → done
    """
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT_STREAM] id={g.request_id} Starting streaming interpretation")

        category = data.get("category", "general")
        spread_id = data.get("spread_id", "three_card")
        spread_title = data.get("spread_title", "Three Card Spread")
        cards = data.get("cards", [])
        user_question = data.get("user_question", "")
        language = data.get("language", "ko")

        if not cards:
            return jsonify({"status": "error", "message": "No cards provided"}), 400

        hybrid_rag = get_tarot_hybrid_rag()

        # Convert cards to expected format
        drawn_cards = [
            {"name": c.get("name", ""), "isReversed": c.get("is_reversed", False)}
            for c in cards
        ]

        # Map theme/spread
        mapped_theme, mapped_spread = _map_tarot_theme(category, spread_id)

        # Build context in parallel
        def build_rag():
            return hybrid_rag.build_reading_context(
                theme=mapped_theme,
                sub_topic=mapped_spread,
                drawn_cards=drawn_cards,
                question=user_question
            )

        def build_advanced():
            return hybrid_rag.get_advanced_analysis(drawn_cards)

        with ThreadPoolExecutor(max_workers=2) as executor:
            rag_future = executor.submit(build_rag)
            adv_future = executor.submit(build_advanced)
            rag_context = rag_future.result()
            advanced = adv_future.result()

        is_korean = language == "ko"
        cards_str = ", ".join([
            f"{c.get('name', '')}{'(역방향)' if c.get('isReversed') else ''}"
            for c in drawn_cards
        ])

        now = datetime.now()
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")

        def generate_stream():
            """Generator for SSE streaming interpretation"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # === SECTION 1: Overall Message (streaming) ===
                yield f"data: {json.dumps({'section': 'overall_message', 'status': 'start'})}\n\n"

                overall_prompt = f"""당신은 따뜻하고 공감 능력이 뛰어난 타로 상담사입니다.
마치 오랜 친구에게 이야기하듯 편안하게 카드의 메시지를 전달해주세요.

카드: {cards_str}
카테고리: {category}
스프레드: {spread_title}
질문: {user_question or "일반 운세"}

참고 컨텍스트:
{rag_context[:1500]}

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하시는군요", "카드가 말하고 있어요")
- 단정적 예언 대신 가능성과 선택지 제시
- 3-4문장으로 전체 메시지만 자연스럽게 요약"""

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": overall_prompt}],
                    temperature=0.7,
                    max_tokens=300,
                    stream=True
                )

                overall_text = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        overall_text += content
                        yield f"data: {json.dumps({'section': 'overall_message', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'overall_message', 'status': 'done', 'full_text': overall_text})}\n\n"

                # === SECTION 2: Card Insights (one by one, streaming each) ===
                for i, card in enumerate(drawn_cards):
                    card_name = card.get("name", "")
                    is_reversed = card.get("isReversed", False)
                    position = cards[i].get("position", f"Card {i+1}") if i < len(cards) else f"Card {i+1}"

                    yield f"data: {json.dumps({'section': 'card_insight', 'index': i, 'status': 'start', 'card_name': card_name, 'position': position})}\n\n"

                    # Get card-specific context
                    card_info = hybrid_rag.get_card_info(card_name, is_reversed)
                    insights = hybrid_rag.get_card_insights(card_name, is_reversed)

                    card_prompt = f"""당신은 따뜻한 타로 상담사입니다. 이 카드가 전하는 메시지를 친근하게 해석해주세요.

카드: {card_name}{'(역방향)' if is_reversed else ''}
위치: {position}
스프레드: {spread_title}
질문: {user_question or "일반 운세"}

카드 정보:
{json.dumps(card_info, ensure_ascii=False)[:800]}

심리학적 통찰:
{json.dumps(insights, ensure_ascii=False)[:500]}

상담 스타일:
- 이 위치에서 카드가 전하는 핵심 메시지
- 개인의 상황과 연결하여 해석
- 2-3문장으로 자연스럽게 설명"""

                    card_stream = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": card_prompt}],
                        temperature=0.7,
                        max_tokens=250,
                        stream=True
                    )

                    card_text = ""
                    for chunk in card_stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            card_text += content
                            yield f"data: {json.dumps({'section': 'card_insight', 'index': i, 'content': content})}\n\n"

                    # Include extra insights
                    extra = {
                        "spirit_animal": insights.get("jungian", {}).get("archetype"),
                        "chakra": insights.get("chakra"),
                        "element": insights.get("astrology", {}).get("element")
                    }

                    yield f"data: {json.dumps({'section': 'card_insight', 'index': i, 'status': 'done', 'full_text': card_text, 'extras': extra})}\n\n"

                # === SECTION 3: Guidance (streaming) ===
                yield f"data: {json.dumps({'section': 'guidance', 'status': 'start'})}\n\n"

                guidance_prompt = f"""당신은 따뜻한 타로 상담사입니다. 이 리딩을 바탕으로 친구에게 조언하듯 이야기해주세요.

카드: {cards_str}
전체 메시지: {overall_text[:500]}

상담 스타일:
- 실생활에서 바로 적용할 수 있는 구체적인 조언
- 부드럽고 격려하는 말투 ("~해보시는 건 어떨까요?")
- 2-3문장으로 따뜻하게 마무리"""

                guidance_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": guidance_prompt}],
                    temperature=0.7,
                    max_tokens=200,
                    stream=True
                )

                guidance_text = ""
                for chunk in guidance_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        guidance_text += content
                        yield f"data: {json.dumps({'section': 'guidance', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'guidance', 'status': 'done', 'full_text': guidance_text})}\n\n"

                # === SECTION 4: Followup Questions ===
                followup = hybrid_rag.advanced_rules.get_followup_questions(category, "neutral") if hasattr(hybrid_rag, 'advanced_rules') else []
                yield f"data: {json.dumps({'section': 'followup', 'questions': followup[:5]})}\n\n"

                # === DONE ===
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[TAROT_STREAM] Error: {stream_error}")
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/interpret-stream failed: {e}")
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

        # Get Jung psychological insights for tarot
        jung_insight = ""
        if HAS_CORPUS_RAG:
            try:
                corpus_rag = get_corpus_rag()
                last_msg = messages[-1].get("content", "") if messages else ""
                # Search for relevant Jung quotes based on user's question + card context
                card_names = [c.get('name', '') for c in context.get("cards", [])]
                jung_query = f"{last_msg} {' '.join(card_names[:3])}"
                jung_quotes = corpus_rag.search(jung_query, top_k=2, min_score=0.2)
                if jung_quotes:
                    jung_insight = "\n".join([f"• \"{q['quote'][:150]}...\" - 칼 융" for q in jung_quotes[:2]])
            except Exception as jung_e:
                logger.debug(f"[TAROT_CHAT] Jung RAG failed: {jung_e}")

        # Build context string from reading
        spread_title = context.get("spread_title", "")
        cards = context.get("cards", [])
        overall_message = context.get("overall_message", "")
        guidance = context.get("guidance", "")

        # Build detailed cards info with position, name, meaning
        cards_details = []
        for c in cards:
            name = c.get('name', '')
            is_reversed = c.get('is_reversed', False)
            position = c.get('position', '')
            meaning = c.get('meaning', '')
            keywords = c.get('keywords', [])
            keywords_str = ', '.join(keywords[:3]) if keywords else ''

            card_info = f"- {position}: {name}{'(역방향)' if is_reversed else ''}"
            if keywords_str:
                card_info += f" [{keywords_str}]"
            if meaning:
                card_info += f" - {meaning[:150]}"
            cards_details.append(card_info)

        cards_detail_str = "\n".join(cards_details) if cards_details else "카드 정보 없음"

        # Simple comma list for reference
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

        # Generate response using GPT-4o-mini for fast, counselor-like responses
        chat_prompt = f"""당신은 따뜻하고 공감 능력이 뛰어난 타로 상담사입니다.
마치 오랜 친구처럼 편안하게 대화하면서도, 카드가 전하는 메시지를 섬세하게 전달해주세요.

## 오늘: {date_str}

## 리딩 정보
스프레드: {spread_title}
핵심 메시지: {overall_message[:300] if overall_message else '(없음)'}

## 카드 상세
{cards_detail_str}

## 가이드
{guidance if guidance else '(없음)'}

## 대화
{chr(10).join(conversation_history[-6:])}

## 질문
{last_user_message}

{'💡 추가 카드를 원하시네요. 지금 카드들이 충분한 메시지를 담고 있어요. 이 리딩에 집중해보시고, 더 궁금하시면 새 리딩을 시작해보세요.' if wants_more_cards else ''}
{'⏰ 타이밍 질문이시네요. 카드에서 읽히는 시기적 흐름을 알려드릴게요.' if asks_about_timing else ''}

{'## 심리학적 통찰' + chr(10) + jung_insight if jung_insight else ''}

## 상담 스타일 가이드
- 따뜻하고 공감하는 말투 사용 ("~하시는군요", "~느끼실 수 있어요")
- 카드 의미를 질문 상황에 맞게 연결
- 단정적 예언 대신 가능성과 선택지 제시
- 실질적인 조언이나 관점 제공
- 3-4문장으로 자연스럽게 대화하듯 답변"""

        try:
            # GPT-4o-mini for fast, natural counselor responses (skip refine for speed)
            reply = _generate_with_gpt4(chat_prompt, max_tokens=400, temperature=0.5, use_mini=True)
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


@app.route("/api/tarot/chat-stream", methods=["POST"])
def tarot_chat_stream():
    """
    Streaming tarot chat consultation - real-time response using GPT-4o-mini.
    Returns Server-Sent Events (SSE) for real-time text streaming.
    """
    if not HAS_TAROT:
        return jsonify({"status": "error", "message": "Tarot module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[TAROT_CHAT_STREAM] id={g.request_id} Processing streaming chat")

        messages = data.get("messages", [])
        context = data.get("context", {})
        language = data.get("language", "ko")

        if not messages:
            return jsonify({"status": "error", "message": "No messages provided"}), 400

        # Build context (same as non-streaming)
        spread_title = context.get("spread_title", "")
        cards = context.get("cards", [])
        overall_message = context.get("overall_message", "")
        guidance = context.get("guidance", "")

        cards_details = []
        for c in cards:
            name = c.get('name', '')
            is_reversed = c.get('is_reversed', False)
            position = c.get('position', '')
            meaning = c.get('meaning', '')
            keywords = c.get('keywords', [])
            keywords_str = ', '.join(keywords[:3]) if keywords else ''
            card_info = f"- {position}: {name}{'(역방향)' if is_reversed else ''}"
            if keywords_str:
                card_info += f" [{keywords_str}]"
            if meaning:
                card_info += f" - {meaning[:150]}"
            cards_details.append(card_info)

        cards_detail_str = "\n".join(cards_details) if cards_details else "카드 정보 없음"

        conversation_history = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content}")

        last_user_message = messages[-1].get("content", "") if messages else ""

        now = datetime.now()
        is_korean = language == "ko"
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")

        chat_prompt = f"""## 오늘: {date_str}

## 리딩 정보
스프레드: {spread_title}
핵심 메시지: {overall_message[:300] if overall_message else '(없음)'}

## 카드 상세
{cards_detail_str}

## 가이드
{guidance if guidance else '(없음)'}

## 대화
{chr(10).join(conversation_history[-6:])}

## 질문
{last_user_message}"""

        system_prompt = """당신은 따뜻하고 공감 능력이 뛰어난 타로 상담사입니다.
마치 오랜 친구처럼 편안하게 대화하면서도, 카드가 전하는 메시지를 섬세하게 전달해주세요.

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하시는군요", "~느끼실 수 있어요")
- 카드 의미를 질문 상황에 맞게 연결
- 단정적 예언 대신 가능성과 선택지 제시
- 실질적인 조언이나 관점 제공
- 3-4문장으로 자연스럽게 대화하듯 답변"""

        def generate_stream():
            """Generator for SSE streaming"""
            try:
                # Use GPT-4o-mini with streaming for fast response
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": chat_prompt}
                    ],
                    temperature=0.6,
                    max_tokens=400,
                    stream=True
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        # Send each chunk as SSE data
                        yield f"data: {json.dumps({'content': content})}\n\n"

                # Send completion signal
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[TAROT_CHAT_STREAM] Streaming error: {stream_error}")
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/chat-stream failed: {e}")
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
# TAROT TOPIC DETECTION (채팅 기반 타로 주제 자동 감지)
# ===============================================================

# Sub-topic keyword mappings for each theme
_TAROT_TOPIC_KEYWORDS = {
    "career": {
        "job_search": {
            "keywords": ["취업", "구직", "일자리", "직장 구하", "취직", "입사", "신입", "첫 직장", "job", "employment"],
            "korean": "취업은 언제",
            "priority": 10
        },
        "interview": {
            "keywords": ["면접", "인터뷰", "합격", "불합격", "서류", "채용", "interview"],
            "korean": "면접 결과",
            "priority": 9
        },
        "job_change": {
            "keywords": ["이직", "퇴사", "직장 옮기", "회사 바꾸", "전직", "새 직장", "career change"],
            "korean": "이직해야 할까",
            "priority": 10
        },
        "promotion": {
            "keywords": ["승진", "진급", "승급", "임원", "팀장", "과장", "부장", "promotion"],
            "korean": "승진 가능성",
            "priority": 8
        },
        "business": {
            "keywords": ["사업", "창업", "스타트업", "자영업", "개업", "사장", "CEO", "business", "startup"],
            "korean": "사업 시작/확장",
            "priority": 9
        },
        "side_hustle": {
            "keywords": ["부업", "투잡", "알바", "아르바이트", "부수입", "side job"],
            "korean": "부업/투잡",
            "priority": 7
        },
        "career_path": {
            "keywords": ["진로", "적성", "어떤 직업", "무슨 일", "적합한 직업", "맞는 직업", "career path", "aptitude"],
            "korean": "나에게 맞는 직업",
            "priority": 8
        },
        "workplace": {
            "keywords": ["직장 생활", "회사 생활", "동료", "상사", "직장 내", "사내", "workplace"],
            "korean": "직장 내 관계/상황",
            "priority": 6
        },
        "salary": {
            "keywords": ["연봉", "급여", "월급", "임금", "돈", "인상", "협상", "salary"],
            "korean": "연봉 협상/인상",
            "priority": 7
        },
        "project": {
            "keywords": ["프로젝트", "업무", "과제", "일 잘", "성과", "project"],
            "korean": "프로젝트 성공",
            "priority": 6
        }
    },
    "love": {
        "secret_admirer": {
            "keywords": ["나를 좋아하는", "날 좋아하는", "관심 있는 사람", "누가 좋아", "secret admirer"],
            "korean": "나를 좋아하는 인연",
            "priority": 8
        },
        "current_partner": {
            "keywords": ["연인", "남친", "여친", "남자친구", "여자친구", "애인", "partner"],
            "korean": "지금 연인의 속마음",
            "priority": 9
        },
        "crush": {
            "keywords": ["짝사랑", "좋아하는 사람", "마음에 드는", "고백", "crush"],
            "korean": "짝사랑 상대의 마음",
            "priority": 8
        },
        "reconciliation": {
            "keywords": ["재회", "다시 만나", "헤어진", "전 남친", "전 여친", "돌아올", "reconciliation", "ex"],
            "korean": "헤어진 연인과의 재회",
            "priority": 9
        },
        "situationship": {
            "keywords": ["썸", "썸타는", "밀당", "관계 진전", "situationship"],
            "korean": "썸타는 상대",
            "priority": 8
        },
        "marriage": {
            "keywords": ["결혼", "결혼운", "배우자", "신랑", "신부", "혼인", "웨딩", "marriage", "wedding"],
            "korean": "결혼운",
            "priority": 10
        },
        "breakup": {
            "keywords": ["이별", "헤어질", "헤어져야", "끝내야", "그만 만나", "breakup"],
            "korean": "이별해야 할까",
            "priority": 9
        },
        "new_love": {
            "keywords": ["새로운 인연", "새 사랑", "언제 연애", "인연이 언제", "new love"],
            "korean": "새로운 사랑은 언제",
            "priority": 8
        },
        "cheating": {
            "keywords": ["바람", "외도", "불륜", "양다리", "cheating", "affair", "바람피"],
            "korean": "상대가 바람피우는지",
            "priority": 11
        },
        "soulmate": {
            "keywords": ["소울메이트", "운명", "진정한 사랑", "soulmate", "destiny"],
            "korean": "소울메이트 리딩",
            "priority": 7
        }
    },
    "wealth": {
        "money_luck": {
            "keywords": ["재물운", "금전운", "돈 운", "부자", "wealth", "money luck"],
            "korean": "재물운",
            "priority": 9
        },
        "investment": {
            "keywords": ["투자", "주식", "코인", "부동산", "펀드", "investment", "stock"],
            "korean": "투자 결정",
            "priority": 9
        },
        "debt": {
            "keywords": ["빚", "대출", "부채", "갚", "loan", "debt"],
            "korean": "빚/대출",
            "priority": 8
        },
        "windfall": {
            "keywords": ["복권", "로또", "횡재", "lottery", "windfall"],
            "korean": "횡재운",
            "priority": 7
        }
    },
    "health": {
        "general_health": {
            "keywords": ["건강", "건강운", "몸", "아프", "병", "health"],
            "korean": "건강운",
            "priority": 9
        },
        "mental_health": {
            "keywords": ["정신 건강", "스트레스", "우울", "불안", "mental health"],
            "korean": "정신 건강",
            "priority": 8
        },
        "recovery": {
            "keywords": ["회복", "치료", "완치", "recovery"],
            "korean": "회복",
            "priority": 8
        }
    },
    "family": {
        "parent": {
            "keywords": ["부모", "엄마", "아빠", "어머니", "아버지", "parent"],
            "korean": "부모님과의 관계",
            "priority": 8
        },
        "children": {
            "keywords": ["자녀", "아이", "아들", "딸", "임신", "children", "pregnancy"],
            "korean": "자녀운",
            "priority": 9
        },
        "sibling": {
            "keywords": ["형제", "자매", "오빠", "언니", "동생", "sibling"],
            "korean": "형제/자매 관계",
            "priority": 7
        }
    },
    "spiritual": {
        "life_purpose": {
            "keywords": ["삶의 목적", "인생의 의미", "왜 사는", "purpose"],
            "korean": "삶의 목적",
            "priority": 8
        },
        "karma": {
            "keywords": ["전생", "카르마", "업", "karma", "past life"],
            "korean": "전생/카르마",
            "priority": 7
        },
        "spiritual_growth": {
            "keywords": ["영적 성장", "깨달음", "명상", "spiritual"],
            "korean": "영적 성장",
            "priority": 7
        }
    },
    "life_path": {
        "general": {
            "keywords": ["인생", "앞으로", "미래", "운세", "전반적", "life", "future"],
            "korean": "인생 전반",
            "priority": 5
        },
        "decision": {
            "keywords": ["결정", "선택", "어떻게 해야", "뭘 해야", "decision"],
            "korean": "결정/선택",
            "priority": 6
        }
    }
}

# Cache for spread configurations (loaded once)
_SPREAD_CONFIG_CACHE = {}

def _load_spread_config(theme: str) -> dict:
    """Load and cache spread configuration for a theme."""
    if theme in _SPREAD_CONFIG_CACHE:
        return _SPREAD_CONFIG_CACHE[theme]

    spread_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "data", "graph", "rules", "tarot", "spreads",
        f"{theme}_spreads.json"
    )

    try:
        if os.path.exists(spread_file):
            with open(spread_file, "r", encoding="utf-8") as f:
                _SPREAD_CONFIG_CACHE[theme] = json.load(f)
                return _SPREAD_CONFIG_CACHE[theme]
    except Exception as e:
        logger.warning(f"Could not load spread file {spread_file}: {e}")

    return {}


def detect_tarot_topic(text: str) -> dict:
    """
    Analyze chat text and detect the most relevant tarot theme and sub-topic.

    Args:
        text: Chat message or conversation text to analyze

    Returns:
        {
            "theme": "career",
            "sub_topic": "job_search",
            "korean": "취업은 언제",
            "confidence": 0.85,
            "card_count": 10,
            "matched_keywords": ["취업", "직장"]
        }
    """
    text_lower = text.lower()

    # Collect all matches with scores
    all_matches = []

    # Score each theme and sub-topic
    for theme, sub_topics in _TAROT_TOPIC_KEYWORDS.items():
        for sub_topic_id, sub_topic_data in sub_topics.items():
            matched = []
            for keyword in sub_topic_data["keywords"]:
                if keyword.lower() in text_lower or keyword in text:
                    matched.append(keyword)

            if matched:
                # Calculate raw score (not capped) for comparison
                # - Base priority score (0.1 per priority point)
                # - Keyword matches (0.2 per match)
                # - Specificity bonus: longer keywords are more specific
                priority_score = sub_topic_data["priority"] * 0.1
                match_score = len(matched) * 0.2
                avg_keyword_len = sum(len(k) for k in matched) / len(matched)
                specificity_bonus = min(avg_keyword_len * 0.02, 0.2)

                raw_score = priority_score + match_score + specificity_bonus

                all_matches.append({
                    "theme": theme,
                    "sub_topic": sub_topic_id,
                    "korean": sub_topic_data["korean"],
                    "confidence": round(min(raw_score, 1.0), 2),
                    "_raw_score": raw_score,  # Internal, removed before return
                    "_priority": sub_topic_data["priority"],  # Internal
                    "matched_keywords": matched,
                })

    # Sort by raw_score (desc), then by priority (desc) for tie-breaking
    all_matches.sort(key=lambda x: (x["_raw_score"], x["_priority"]), reverse=True)

    if all_matches:
        best_match = all_matches[0]
        # Remove internal fields
        del best_match["_raw_score"]
        del best_match["_priority"]
    else:
        best_match = {
            "theme": "life_path",
            "sub_topic": "general",
            "korean": "인생 전반",
            "confidence": 0.0,
            "matched_keywords": []
        }

    # Load spread configuration to get card count (cached)
    spread_data = _load_spread_config(best_match["theme"])
    sub_topic_config = spread_data.get("sub_topics", {}).get(best_match["sub_topic"], {})

    best_match["card_count"] = sub_topic_config.get("card_count", 3)
    best_match["spread_name"] = sub_topic_config.get("spread_name", "")
    best_match["positions"] = sub_topic_config.get("positions", [])

    return best_match


@app.route("/api/tarot/detect-topic", methods=["POST"])
def tarot_detect_topic():
    """
    Detect tarot theme and sub-topic from chat conversation.
    Used when user clicks "타로 리딩 받기" from destiny-map counselor chat.

    Request body:
        {
            "messages": [
                {"role": "user", "content": "언제 취업할 수 있을까요?"},
                {"role": "assistant", "content": "..."}
            ]
        }
        OR
        {
            "text": "언제 취업할 수 있을까요?"
        }

    Response:
        {
            "status": "success",
            "detected": {
                "theme": "career",
                "sub_topic": "job_search",
                "korean": "취업은 언제",
                "confidence": 0.85,
                "card_count": 10,
                "spread_name": "Job Search Spread",
                "positions": [...],
                "matched_keywords": ["취업"]
            }
        }
    """
    try:
        data = request.get_json(force=True)

        # Support both message list and plain text
        if "messages" in data:
            # Combine recent user messages for analysis
            user_messages = [
                m.get("content", "")
                for m in data["messages"]
                if m.get("role") == "user"
            ]
            # Focus on last 3 user messages
            text = " ".join(user_messages[-3:])
        else:
            text = data.get("text", "")

        if not text:
            return jsonify({
                "status": "error",
                "message": "No text provided for analysis"
            }), 400

        detected = detect_tarot_topic(text)

        logger.info(f"[TAROT-DETECT] Detected {detected['theme']}/{detected['sub_topic']} "
                   f"(confidence: {detected['confidence']}) from: {text[:100]}...")

        return jsonify({
            "status": "success",
            "detected": detected
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/tarot/detect-topic failed: {e}")
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


@app.route("/api/search/domain", methods=["POST"])
def domain_rag_search():
    """
    Lightweight domain search over precomputed embeddings.
    body: { "domain": "destiny_map|tarot|dream|iching", "query": "...", "top_k": 5 }
    """
    if not HAS_DOMAIN_RAG:
        return jsonify({"status": "error", "message": "DomainRAG not available"}), 501

    try:
        data = request.get_json(force=True)
        domain = (data.get("domain") or "").strip()
        query = (data.get("query") or "").strip()
        top_k = int(data.get("top_k", 5))
        top_k = max(1, min(top_k, 20))

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400
        if not domain or domain not in DOMAIN_RAG_DOMAINS:
            return jsonify({
                "status": "error",
                "message": f"domain must be one of {DOMAIN_RAG_DOMAINS}",
            }), 400

        rag = get_domain_rag()
        rag.load_domain(domain)

        results = rag.search(domain, query, top_k=top_k)
        context = rag.get_context(domain, query, top_k=min(top_k, 3), max_chars=1500)

        return jsonify({
            "status": "success",
            "domain": domain,
            "query": query,
            "results": results,
            "context": context,
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/search/domain failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/search/hybrid", methods=["POST"])
def hybrid_rag_search():
    """
    Hybrid search (vector + BM25 + graph, optional rerank).
    body: { "query": "...", "top_k": 8, "rerank": true, "graph_root": "<optional>" }
    """
    if not HAS_HYBRID_RAG:
        return jsonify({"status": "error", "message": "Hybrid RAG not available"}), 501

    try:
        data = request.get_json(force=True)
        query = (data.get("query") or "").strip()
        top_k = int(data.get("top_k", 8))
        top_k = max(1, min(top_k, 30))
        rerank = bool(data.get("rerank", True))
        graph_root = data.get("graph_root")

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        results = hybrid_search(
            query=query,
            top_k=top_k,
            use_reranking=rerank,
            graph_root=graph_root,
        )
        context = build_rag_context(query, top_k=min(12, max(top_k, 6)))

        return jsonify({
            "status": "success",
            "query": query,
            "top_k": top_k,
            "rerank": rerank,
            "results": results,
            "context": context,
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/search/hybrid failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/compatibility", methods=["POST"])
def compatibility_analysis():
    """
    Relationship compatibility (Saju + Astrology fusion with GPT).
    Accepts 2~4 people; uses group mode for 3-4 people.
    """
    if not HAS_COMPATIBILITY:
        return jsonify({"status": "error", "message": "Compatibility engine not available"}), 501

    try:
        data = request.get_json(force=True)
        people = data.get("people") or []

        # Backward compatibility: allow person1/person2 fields
        if not people:
            p1 = data.get("person1") or {}
            p2 = data.get("person2") or {}
            if p1 and p2:
                people = [p1, p2]

        relationship_type = data.get("relationship_type") or data.get("relationshipType") or "lover"
        locale = data.get("locale", "ko")

        if len(people) < 2:
            return jsonify({"status": "error", "message": "At least two people are required"}), 400
        if len(people) > 4:
            return jsonify({"status": "error", "message": "Maximum 4 people supported"}), 400

        if len(people) <= 2:
            result = interpret_compatibility(people, relationship_type, locale)
        else:
            result = interpret_compatibility_group(people, relationship_type, locale)

        status_code = 200 if result.get("status") == "success" else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.exception(f"[ERROR] /api/compatibility failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/compatibility/chat", methods=["POST"])
def compatibility_chat():
    """
    Compatibility chat consultation - follow-up questions about a compatibility reading.
    """
    if not HAS_COMPATIBILITY:
        return jsonify({"status": "error", "message": "Compatibility engine not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[COMPAT_CHAT] id={g.request_id} Processing chat message")

        persons = data.get("persons", [])
        question = data.get("question", "")
        history = data.get("history", [])
        locale = data.get("locale", "ko")
        compatibility_context = data.get("compatibility_context", "")
        prompt = data.get("prompt", "")

        if not persons or len(persons) < 2:
            return jsonify({"status": "error", "message": "At least 2 persons required"}), 400

        if not question and not prompt:
            return jsonify({"status": "error", "message": "No question provided"}), 400

        start_time = time.time()
        is_korean = locale == "ko"

        # Current date for contextual responses
        now = datetime.now()
        weekday_names_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        if is_korean:
            date_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_names_ko[now.weekday()]})"
        else:
            date_str = now.strftime("%B %d, %Y (%A)")

        # Format persons info
        persons_info = []
        for i, p in enumerate(persons):
            name = p.get("name") or f"Person {i + 1}"
            birth_date = p.get("birthDate") or p.get("date", "")
            birth_time = p.get("birthTime") or p.get("time", "")
            relation = p.get("relation", "")
            persons_info.append(f"- {name}: {birth_date} {birth_time}" + (f" ({relation})" if relation else ""))

        persons_str = "\n".join(persons_info)

        # Build conversation history
        conversation_history = []
        for msg in history[-6:]:  # Last 6 messages
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role != "system":
                conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content[:300]}")

        history_str = "\n".join(conversation_history) if conversation_history else "(첫 질문)"

        # Build chat prompt - counselor style with GPT-4o-mini for speed
        if is_korean:
            system_instruction = """당신은 따뜻하고 공감 능력이 뛰어난 궁합 상담사입니다.
마치 오랜 언니/오빠처럼 편안하게 대화하면서, 두 사람의 관계에 대해 진심 어린 조언을 해주세요.

상담 스타일:
- 공감하며 경청하는 말투 ("그러시군요", "이해해요", "~하실 수 있어요")
- 사주·점성학 전문 용어는 쉽게 풀어서 설명
- 단정적 판단보다는 가능성과 노력의 방향 제시
- 관계의 강점을 먼저 짚어주고, 개선점은 건설적으로
- 3-4문장으로 자연스럽게 대화하듯 답변"""
        else:
            system_instruction = """You are a warm and empathetic relationship counselor.
Talk like a trusted friend while sharing genuine insights about their relationship.

Counseling style:
- Use empathetic, listening language
- Explain Saju/Astrology terms simply
- Focus on possibilities rather than definitive judgments
- Highlight relationship strengths first, then constructive improvements
- Answer naturally in 3-4 sentences like a conversation"""

        chat_prompt = f"""{system_instruction}

## 오늘: {date_str}

## 분석 대상
{persons_str}

## 궁합 분석 결과
{compatibility_context[:1500] if compatibility_context else '(분석 결과 없음)'}

## 대화
{history_str}

## 질문
{question or prompt}"""

        try:
            # GPT-4o-mini for fast, natural counselor responses (skip refine for speed)
            reply = _generate_with_gpt4(chat_prompt, max_tokens=400, temperature=0.5, use_mini=True)
        except Exception as llm_e:
            logger.warning(f"[COMPAT_CHAT] GPT-4 failed: {llm_e}")
            if is_korean:
                reply = "죄송합니다. 현재 AI 응답을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요."
            else:
                reply = "Sorry, unable to generate AI response at the moment. Please try again later."

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[COMPAT_CHAT] id={g.request_id} completed in {duration_ms}ms")

        return jsonify({
            "status": "success",
            "response": reply,
            "data": {
                "response": reply,
            },
            "performance": {"duration_ms": duration_ms}
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/compatibility/chat failed: {e}")
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
            "hybrid_rag": HAS_HYBRID_RAG,
            "domain_rag": HAS_DOMAIN_RAG,
            "compatibility": HAS_COMPATIBILITY,
        },
        "version": "5.2.0-fortune-score",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}, compatibility={HAS_COMPATIBILITY}, hybrid_rag={HAS_HYBRID_RAG}, domain_rag={HAS_DOMAIN_RAG}")

    # 🚀 Warmup models before accepting requests
    warmup_models()

    app.run(host="0.0.0.0", port=port, debug=True)
