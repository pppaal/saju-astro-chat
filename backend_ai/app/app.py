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

import logging
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, date
from pathlib import Path
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
# Lazy import fusion_generate to avoid loading SentenceTransformer on startup
# This prevents OOM on Railway free tier (512MB limit)
_fusion_generate_module = None

def _get_fusion_generate():
    """Lazy load fusion_generate module to save memory."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        from backend_ai.model import fusion_generate as _fg
        _fusion_generate_module = _fg
    return _fusion_generate_module

def _generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for _generate_with_gpt4."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)

def refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    return _get_fusion_generate().refine_with_gpt5mini(*args, **kwargs)

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

# I-Ching RAG - Lazy loaded to avoid OOM (uses saju_astro_rag -> SentenceTransformer)
HAS_ICHING = True  # Assume available, will fail gracefully if not
_iching_rag_module = None

def _get_iching_rag():
    """Lazy load iching_rag module."""
    global _iching_rag_module, HAS_ICHING
    if _iching_rag_module is None:
        try:
            from backend_ai.app import iching_rag as _ir
            _iching_rag_module = _ir
        except ImportError:
            HAS_ICHING = False
            print("[app.py] I-Ching RAG not available (lazy load)")
            return None
    return _iching_rag_module

def cast_hexagram(*args, **kwargs):
    m = _get_iching_rag()
    return m.cast_hexagram(*args, **kwargs) if m else None

def get_hexagram_interpretation(*args, **kwargs):
    m = _get_iching_rag()
    return m.get_hexagram_interpretation(*args, **kwargs) if m else None

def perform_iching_reading(*args, **kwargs):
    m = _get_iching_rag()
    return m.perform_iching_reading(*args, **kwargs) if m else None

def search_iching_wisdom(*args, **kwargs):
    m = _get_iching_rag()
    return m.search_iching_wisdom(*args, **kwargs) if m else None

def get_all_hexagrams_summary(*args, **kwargs):
    m = _get_iching_rag()
    return m.get_all_hexagrams_summary(*args, **kwargs) if m else None

# Persona Embeddings - Lazy loaded (uses SentenceTransformer)
HAS_PERSONA_EMBED = not RAG_DISABLED  # Assume available unless disabled
_persona_embed_module = None

def _get_persona_embed_module():
    global _persona_embed_module, HAS_PERSONA_EMBED
    if _persona_embed_module is None:
        try:
            from backend_ai.app import persona_embeddings as _pe
            _persona_embed_module = _pe
        except ImportError:
            HAS_PERSONA_EMBED = False
            return None
    return _persona_embed_module

def get_persona_embed_rag(*args, **kwargs):
    m = _get_persona_embed_module()
    return m.get_persona_embed_rag(*args, **kwargs) if m else None

try:
    # This import is safe (no SentenceTransformer dependency at module level)
    pass  # Placeholder - persona_embeddings now lazy loaded above
    if not RAG_DISABLED:
        HAS_PERSONA_EMBED = True  # Already set above
except ImportError:
    HAS_PERSONA_EMBED = False

# Tarot Hybrid RAG - Lazy loaded (uses tarot_rag -> SentenceTransformer)
HAS_TAROT = True  # Assume available
_tarot_hybrid_rag_module = None

def _get_tarot_hybrid_rag_module():
    global _tarot_hybrid_rag_module, HAS_TAROT
    if _tarot_hybrid_rag_module is None:
        try:
            from backend_ai.app import tarot_hybrid_rag as _thr
            _tarot_hybrid_rag_module = _thr
        except ImportError:
            HAS_TAROT = False
            return None
    return _tarot_hybrid_rag_module

def get_tarot_hybrid_rag(*args, **kwargs):
    m = _get_tarot_hybrid_rag_module()
    return m.get_tarot_hybrid_rag(*args, **kwargs) if m else None

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

# Domain RAG - Lazy loaded (uses SentenceTransformer)
HAS_DOMAIN_RAG = not RAG_DISABLED  # Assume available unless disabled
DOMAIN_RAG_DOMAINS = []  # Will be populated on first access
_domain_rag_module = None

def _get_domain_rag_module():
    global _domain_rag_module, HAS_DOMAIN_RAG, DOMAIN_RAG_DOMAINS
    if _domain_rag_module is None:
        try:
            from backend_ai.app import domain_rag as _dr
            _domain_rag_module = _dr
            DOMAIN_RAG_DOMAINS = _dr.DOMAINS
        except ImportError:
            HAS_DOMAIN_RAG = False
            print("[app.py] DomainRAG not available (lazy load)")
            return None
    return _domain_rag_module

def get_domain_rag(*args, **kwargs):
    m = _get_domain_rag_module()
    return m.get_domain_rag(*args, **kwargs) if m else None

# Compatibility (Saju + Astrology fusion) - Lazy loaded (uses saju_astro_rag)
HAS_COMPATIBILITY = True  # Assume available
_compatibility_logic_module = None

def _get_compatibility_logic():
    global _compatibility_logic_module, HAS_COMPATIBILITY
    if _compatibility_logic_module is None:
        try:
            from backend_ai.app import compatibility_logic as _cl
            _compatibility_logic_module = _cl
        except ImportError:
            HAS_COMPATIBILITY = False
            print("[app.py] Compatibility logic not available (lazy load)")
            return None
    return _compatibility_logic_module

def interpret_compatibility(*args, **kwargs):
    m = _get_compatibility_logic()
    return m.interpret_compatibility(*args, **kwargs) if m else None

def interpret_compatibility_group(*args, **kwargs):
    m = _get_compatibility_logic()
    return m.interpret_compatibility_group(*args, **kwargs) if m else None

# Hybrid RAG (Vector + BM25 + Graph + rerank) - Lazy loaded
HAS_HYBRID_RAG = True  # Assume available
_hybrid_rag_module = None

def _get_hybrid_rag_module():
    global _hybrid_rag_module, HAS_HYBRID_RAG
    if _hybrid_rag_module is None:
        try:
            from backend_ai.app import hybrid_rag as _hr
            _hybrid_rag_module = _hr
        except ImportError:
            HAS_HYBRID_RAG = False
            print("[app.py] Hybrid RAG not available (lazy load)")
            return None
    return _hybrid_rag_module

def hybrid_search(*args, **kwargs):
    m = _get_hybrid_rag_module()
    return m.hybrid_search(*args, **kwargs) if m else None

def build_rag_context(*args, **kwargs):
    m = _get_hybrid_rag_module()
    return m.build_rag_context(*args, **kwargs) if m else None

# Agentic RAG System (Next Level Features) - Lazy loaded to avoid OOM
# Import deferred to first use to prevent loading SentenceTransformer on startup
HAS_AGENTIC = True  # Assume available, will fail gracefully if not
_agentic_rag_module = None

def _get_agentic_rag():
    """Lazy load agentic_rag module."""
    global _agentic_rag_module, HAS_AGENTIC
    if _agentic_rag_module is None:
        try:
            from backend_ai.app import agentic_rag as _ar
            _agentic_rag_module = _ar
        except ImportError:
            HAS_AGENTIC = False
            print("[app.py] Agentic RAG not available (lazy load)")
            return None
    return _agentic_rag_module

def agentic_query(*args, **kwargs):
    """Lazy wrapper for agentic_query."""
    m = _get_agentic_rag()
    return m.agentic_query(*args, **kwargs) if m else None

def get_agent_orchestrator(*args, **kwargs):
    """Lazy wrapper for get_agent_orchestrator."""
    m = _get_agentic_rag()
    return m.get_agent_orchestrator(*args, **kwargs) if m else None

def get_entity_extractor(*args, **kwargs):
    """Lazy wrapper for get_entity_extractor."""
    m = _get_agentic_rag()
    return m.get_entity_extractor(*args, **kwargs) if m else None

def get_deep_traversal(*args, **kwargs):
    """Lazy wrapper for get_deep_traversal."""
    m = _get_agentic_rag()
    return m.get_deep_traversal(*args, **kwargs) if m else None

# Classes are accessed as properties
EntityExtractor = property(lambda self: _get_agentic_rag().EntityExtractor if _get_agentic_rag() else None)
DeepGraphTraversal = property(lambda self: _get_agentic_rag().DeepGraphTraversal if _get_agentic_rag() else None)
AgentOrchestrator = property(lambda self: _get_agentic_rag().AgentOrchestrator if _get_agentic_rag() else None)

# Jungian Counseling Engine - Lazy loaded (uses SentenceTransformer)
HAS_COUNSELING = True  # Assume available
_counseling_engine_module = None

def _get_counseling_engine_module():
    global _counseling_engine_module, HAS_COUNSELING
    if _counseling_engine_module is None:
        try:
            from backend_ai.app import counseling_engine as _ce
            _counseling_engine_module = _ce
        except ImportError:
            HAS_COUNSELING = False
            print("[app.py] Counseling engine not available (lazy load)")
            return None
    return _counseling_engine_module

def get_counseling_engine(*args, **kwargs):
    m = _get_counseling_engine_module()
    return m.get_counseling_engine(*args, **kwargs) if m else None

def _get_crisis_detector():
    """Get CrisisDetector class from counseling engine module."""
    m = _get_counseling_engine_module()
    return m.CrisisDetector if m else None

# Proxy class that forwards calls to the actual CrisisDetector
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

# GraphRAG System - Lazy loaded (uses SentenceTransformer)
HAS_GRAPH_RAG = not RAG_DISABLED  # Assume available unless disabled
_saju_astro_rag_module = None

def _get_saju_astro_rag_module():
    global _saju_astro_rag_module, HAS_GRAPH_RAG
    if _saju_astro_rag_module is None:
        try:
            from backend_ai.app import saju_astro_rag as _sar
            _saju_astro_rag_module = _sar
        except ImportError:
            HAS_GRAPH_RAG = False
            print("[app.py] GraphRAG not available (lazy load)")
            return None
    return _saju_astro_rag_module

def get_graph_rag(*args, **kwargs):
    m = _get_saju_astro_rag_module()
    return m.get_graph_rag(*args, **kwargs) if m else None

def get_model(*args, **kwargs):
    m = _get_saju_astro_rag_module()
    return m.get_model(*args, **kwargs) if m else None

# OpenAI Client for streaming endpoints
try:
    from openai import OpenAI
    import httpx
    _openai_key = os.getenv("OPENAI_API_KEY")
    if not _openai_key:
        print(f"[app.py] OPENAI_API_KEY not found in environment. Available env vars: {[k for k in os.environ.keys() if 'OPENAI' in k.upper() or 'API' in k.upper()]}")
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    openai_client = OpenAI(
        api_key=_openai_key,
        timeout=httpx.Timeout(60.0, connect=10.0)  # 60s total, 10s connect
    )
    OPENAI_AVAILABLE = True
    print(f"[app.py] OpenAI client initialized successfully (key length: {len(_openai_key)})")
except Exception as e:
    openai_client = None
    OPENAI_AVAILABLE = False
    print(f"[app.py] OpenAI client not available: {e}")

# CorpusRAG System - Lazy loaded (uses SentenceTransformer)
HAS_CORPUS_RAG = not RAG_DISABLED  # Assume available unless disabled
_corpus_rag_module = None

def _get_corpus_rag_module():
    global _corpus_rag_module, HAS_CORPUS_RAG
    if _corpus_rag_module is None:
        try:
            from backend_ai.app import corpus_rag as _cr
            _corpus_rag_module = _cr
        except ImportError:
            HAS_CORPUS_RAG = False
            print("[app.py] CorpusRAG not available (lazy load)")
            return None
    return _corpus_rag_module

def get_corpus_rag(*args, **kwargs):
    m = _get_corpus_rag_module()
    return m.get_corpus_rag(*args, **kwargs) if m else None

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
# 🛡️ INPUT SANITIZATION HELPERS
# ===============================================================

def sanitize_messages(messages: list, max_content_length: int = 2000) -> list:
    """Sanitize a list of chat messages."""
    if not messages or not isinstance(messages, list):
        return []
    sanitized = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str) and content:
            # Check for suspicious patterns
            if is_suspicious_input(content):
                logger.warning(f"[SANITIZE] Suspicious content in {role} message")
            content = sanitize_user_input(content, max_length=max_content_length, allow_newlines=True)
        sanitized.append({"role": role, "content": content})
    return sanitized


def mask_sensitive_data(text: str) -> str:
    """Mask potentially sensitive data in logs."""
    import re
    # Mask email addresses
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL]', text)
    # Mask phone numbers (various formats)
    text = re.sub(r'\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b', '[PHONE]', text)
    # Mask credit card numbers
    text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]', text)
    return text


# ===============================================================
# 🚀 CROSS-ANALYSIS CACHE - Pre-loaded for instant lookups
# ===============================================================
_CROSS_ANALYSIS_CACHE = {}

# ===============================================================
# 🔗 INTEGRATION ENGINE CACHE - Multimodal analysis data
# ===============================================================
_INTEGRATION_DATA_CACHE = {
    "multimodal_engine": None,
    "career_mapping": None,
    "numerology_core": None,
    "numerology_compatibility": None,
    "numerology_saju": None,
    "numerology_astro": None,
    "numerology_therapeutic": None,
}


def _load_integration_data():
    """Load integration engine and numerology data."""
    global _INTEGRATION_DATA_CACHE

    if _INTEGRATION_DATA_CACHE.get("multimodal_engine") is not None:
        return _INTEGRATION_DATA_CACHE

    base_dir = os.path.dirname(os.path.dirname(__file__))

    # Integration engine files
    integration_dir = os.path.join(base_dir, "data", "graph", "rules", "integration")
    integration_files = {
        "multimodal_engine": "multimodal_integration_engine.json",
        "career_mapping": "modern_career_mapping.json",
    }

    for key, filename in integration_files.items():
        filepath = os.path.join(integration_dir, filename)
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    _INTEGRATION_DATA_CACHE[key] = json.load(f)
                    logger.info(f"  ✅ Loaded integration: {filename}")
        except Exception as e:
            logger.warning(f"  ⚠️ Failed to load {filename}: {e}")
            _INTEGRATION_DATA_CACHE[key] = {}

    # Numerology files
    numerology_dir = os.path.join(base_dir, "data", "graph", "rules", "numerology")
    numerology_files = {
        "numerology_core": "numerology_core_rules.json",
        "numerology_compatibility": "numerology_compatibility_rules.json",
        "numerology_saju": "numerology_saju_mapping.json",
        "numerology_astro": "numerology_astro_mapping.json",
        "numerology_therapeutic": "numerology_therapeutic_questions.json",
    }

    for key, filename in numerology_files.items():
        filepath = os.path.join(numerology_dir, filename)
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    _INTEGRATION_DATA_CACHE[key] = json.load(f)
                    logger.info(f"  ✅ Loaded numerology: {filename}")
        except Exception as e:
            logger.warning(f"  ⚠️ Failed to load {filename}: {e}")
            _INTEGRATION_DATA_CACHE[key] = {}

    loaded_count = sum(1 for v in _INTEGRATION_DATA_CACHE.values() if v)
    logger.info(f"[INTEGRATION-CACHE] Loaded {loaded_count}/7 integration/numerology files")
    return _INTEGRATION_DATA_CACHE


def get_integration_context(theme: str = "life") -> Dict:
    """Get theme-specific integration context for multimodal analysis."""
    data = _load_integration_data()
    engine = data.get("multimodal_engine", {})

    result = {
        "correlation_matrix": engine.get("correlation_matrix", {}),
        "theme_focus": {},
    }

    # Get theme-specific focus areas
    question_router = engine.get("question_router", {})
    if theme in question_router:
        result["theme_focus"] = question_router[theme]

    return result


# ===============================================================
# 🧠 JUNG PSYCHOLOGY CACHE - Enhanced therapeutic data
# ===============================================================
_JUNG_DATA_CACHE = {
    "active_imagination": None,
    "lifespan_individuation": None,
    "crisis_intervention": None,
    "archetypes": None,
    "therapeutic": None,
    "cross_analysis": None,
    "psychological_types": None,
    "alchemy": None,
    "counseling_scenarios": None,
    "integrated_counseling": None,
    "counseling_prompts": None,
    "personality_integration": None,
    "expanded_counseling": None,
}


def _load_jung_data():
    """Load extended Jung psychology data for deeper therapeutic sessions."""
    global _JUNG_DATA_CACHE

    # Return cached data if already loaded
    if _JUNG_DATA_CACHE.get("active_imagination") is not None:
        return _JUNG_DATA_CACHE

    jung_dir = os.path.join(os.path.dirname(__file__), "..", "data", "graph", "rules", "jung")
    jung_dir = os.path.abspath(jung_dir)

    files_to_load = {
        "active_imagination": "jung_active_imagination.json",
        "lifespan_individuation": "jung_lifespan_individuation.json",
        "crisis_intervention": "jung_crisis_intervention.json",
        "archetypes": "jung_archetypes.json",
        "therapeutic": "jung_therapeutic.json",
        "cross_analysis": "jung_cross_analysis.json",
        "psychological_types": "jung_psychological_types.json",
        "alchemy": "jung_alchemy.json",
        "counseling_scenarios": "jung_counseling_scenarios.json",
        "integrated_counseling": "jung_integrated_counseling.json",
        "counseling_prompts": "jung_counseling_prompts.json",
        "personality_integration": "jung_personality_integration.json",
        "expanded_counseling": "jung_expanded_counseling.json",
    }

    for key, filename in files_to_load.items():
        filepath = os.path.join(jung_dir, filename)
        try:
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    _JUNG_DATA_CACHE[key] = json.load(f)
                    logger.info(f"  ✅ Loaded Jung data: {filename}")
        except Exception as e:
            logger.warning(f"  ⚠️ Failed to load {filename}: {e}")
            _JUNG_DATA_CACHE[key] = {}

    logger.info(f"[JUNG-CACHE] Loaded {sum(1 for v in _JUNG_DATA_CACHE.values() if v)} Jung psychology files")
    return _JUNG_DATA_CACHE


def get_lifespan_guidance(birth_year: int) -> dict:
    """Get age-appropriate psychological guidance based on Jung's lifespan individuation."""
    jung_data = _load_jung_data()
    lifespan = jung_data.get("lifespan_individuation", {})

    if not lifespan:
        return {}

    from datetime import datetime
    current_year = datetime.now().year
    age = current_year - birth_year

    life_stages = lifespan.get("life_stages", {})

    # Determine life stage
    if age <= 12:
        stage = "childhood"
    elif age <= 22:
        stage = "adolescence"
    elif age <= 35:
        stage = "early_adulthood"
    elif age <= 55:
        stage = "midlife"
    elif age <= 70:
        stage = "mature_adulthood"
    else:
        stage = "elder"

    stage_data = life_stages.get(stage, {})

    return {
        "age": age,
        "stage_name": stage_data.get("name_ko", stage),
        "psychological_tasks": stage_data.get("psychological_tasks", []),
        "archetypal_themes": stage_data.get("archetypal_themes", {}),
        "developmental_crises": stage_data.get("developmental_crises", []),
        "shadow_challenges": stage_data.get("shadow_challenges", stage_data.get("shadow_manifestations", [])),
        "saju_parallel": stage_data.get("saju_parallel", {}),
        "astro_parallel": stage_data.get("astro_parallel", {}),
        "guidance": stage_data.get("guidance", stage_data.get("saturn_return_guidance", stage_data.get("uranus_opposition_guidance", {}))),
    }


def get_active_imagination_prompts(context: str) -> list:
    """Get appropriate active imagination exercise prompts based on context."""
    jung_data = _load_jung_data()
    ai_data = jung_data.get("active_imagination", {})

    if not ai_data:
        return []

    prompts = []
    facilitation = ai_data.get("ai_facilitation_guide", {})

    # Get opening prompts based on context
    context_lower = context.lower()

    if any(k in context_lower for k in ["꿈", "악몽", "꿈에서"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_dream_sharing", [])
    elif any(k in context_lower for k in ["사주", "운세", "일간"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_saju_analysis", [])
    elif any(k in context_lower for k in ["점성", "별자리", "하우스"]):
        prompts = facilitation.get("opening_prompts", {}).get("after_astro_analysis", [])
    else:
        prompts = facilitation.get("opening_prompts", {}).get("general", [])

    # Add deepening and integration prompts
    deepening = facilitation.get("deepening_prompts", [])
    integration = facilitation.get("integration_prompts", [])

    return {
        "opening": prompts[:2],
        "deepening": deepening[:3],
        "integration": integration[:2],
    }


def get_crisis_resources(locale: str = "ko") -> dict:
    """Get crisis intervention resources and scripts."""
    jung_data = _load_jung_data()
    crisis = jung_data.get("crisis_intervention", {})

    if not crisis:
        return {}

    resources = crisis.get("response_protocols", {}).get("suicidal_ideation", {}).get("resources_korea", {})
    limitations = crisis.get("ai_limitations_and_boundaries", {})
    deescalation = crisis.get("de_escalation_techniques", {})

    return {
        "resources": resources,
        "limitations": limitations,
        "deescalation": deescalation,
    }

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


def normalize_day_master(saju_data: dict) -> dict:
    """
    Normalize dayMaster to flat structure { name, element }.
    Handles:
    - String: "庚" -> { name: "庚", heavenlyStem: "庚", element: "금" }
    - Nested: { heavenlyStem: { name: "庚", element: "금" }, element: "..." }
    - Flat: { name: "庚", element: "금" } or { heavenlyStem: "庚", element: "금" }
    Returns normalized saju_data with flat dayMaster.
    """
    if not saju_data or not saju_data.get("dayMaster"):
        return saju_data

    dm = saju_data.get("dayMaster", {})

    # Map stem to element
    stem_to_element = {
        "甲": "목", "乙": "목", "丙": "화", "丁": "화", "戊": "토",
        "己": "토", "庚": "금", "辛": "금", "壬": "수", "癸": "수",
        "갑": "목", "을": "목", "병": "화", "정": "화", "무": "토",
        "기": "토", "경": "금", "신": "금", "임": "수", "계": "수",
    }

    # Handle dayMaster as string (e.g., "庚" or "경")
    if isinstance(dm, str):
        element = stem_to_element.get(dm, "")
        normalized_dm = {
            "name": dm,
            "heavenlyStem": dm,
            "element": element,
        }
        saju_data = dict(saju_data)
        saju_data["dayMaster"] = normalized_dm
        logger.debug(f"[NORMALIZE] dayMaster: string -> dict: {normalized_dm}")
        return saju_data

    if not isinstance(dm, dict):
        return saju_data

    # Check if heavenlyStem is a nested object
    hs = dm.get("heavenlyStem")
    if isinstance(hs, dict):
        # Nested structure: { heavenlyStem: { name, element } }
        normalized_dm = {
            "name": hs.get("name", ""),
            "heavenlyStem": hs.get("name", ""),
            "element": hs.get("element") or dm.get("element", ""),
        }
        saju_data = dict(saju_data)  # Copy to avoid mutation
        saju_data["dayMaster"] = normalized_dm
        logger.debug(f"[NORMALIZE] dayMaster: nested -> flat: {normalized_dm}")
    elif isinstance(hs, str):
        # Already flat but with heavenlyStem as string
        normalized_dm = {
            "name": hs,
            "heavenlyStem": hs,
            "element": dm.get("element", ""),
        }
        saju_data = dict(saju_data)
        saju_data["dayMaster"] = normalized_dm
    # else: already in { name, element } format or empty

    return saju_data


def _normalize_birth_date(value: object) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        value = str(int(value))
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    text = text.replace(".", "-").replace("/", "-")
    if re.fullmatch(r"\d{8}", text):
        year, month, day = text[:4], text[4:6], text[6:8]
    else:
        parts = [p for p in text.split("-") if p]
        if len(parts) != 3:
            return None
        year, month, day = parts
        if not (year.isdigit() and month.isdigit() and day.isdigit()):
            return None
        if len(year) != 4:
            return None
        month = month.zfill(2)
        day = day.zfill(2)
    try:
        datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
    except ValueError:
        return None
    return f"{year}-{month}-{day}"


def _normalize_birth_time(value: object) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        value = str(value)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    text = text.replace(".", ":")
    if re.fullmatch(r"\d{1,2}:\d{2}(:\d{2})?", text):
        parts = text.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        second = int(parts[2]) if len(parts) > 2 else None
        if hour > 23 or minute > 59 or (second is not None and second > 59):
            return None
        if second is None:
            return f"{hour:02d}:{minute:02d}"
        return f"{hour:02d}:{minute:02d}:{second:02d}"
    if re.fullmatch(r"\d{3,4}", text):
        padded = text.zfill(4)
        hour = int(padded[:2])
        minute = int(padded[2:])
        if hour > 23 or minute > 59:
            return None
        return f"{hour:02d}:{minute:02d}"
    return None


def _normalize_birth_payload(data: dict) -> dict:
    """Normalize birth payload from nested or legacy fields."""
    if not isinstance(data, dict):
        return {}

    birth = data.get("birth")
    birth_data = birth if isinstance(birth, dict) else {}
    normalized = dict(birth_data)

    def _pick(source: dict, keys: list) -> Optional[object]:
        for key in keys:
            value = source.get(key)
            if value not in (None, ""):
                return value
        return None

    def _coerce_float(value: object) -> Optional[float]:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            try:
                return float(value)
            except ValueError:
                return None
        return None

    date_raw = _pick(birth_data, ["date"]) or _pick(data, ["birthdate", "birth_date", "birthDate"])
    time_raw = _pick(birth_data, ["time"]) or _pick(data, ["birthtime", "birth_time", "birthTime"])
    gender = _pick(birth_data, ["gender"]) or _pick(data, ["gender", "sex"])
    city = _pick(birth_data, ["city", "place"]) or _pick(
        data, ["birthplace", "birth_place", "birthPlace", "city", "place", "location"]
    )
    lat_val = _pick(birth_data, ["lat", "latitude"]) or _pick(data, ["lat", "latitude"])
    lon_val = _pick(birth_data, ["lon", "longitude"]) or _pick(data, ["lon", "longitude", "lng", "long"])

    date = _normalize_birth_date(date_raw)
    if date:
        normalized["date"] = date
    elif date_raw:
        normalized["date"] = str(date_raw).strip()

    time_val = _normalize_birth_time(time_raw)
    if time_val:
        normalized["time"] = time_val
    elif time_raw:
        normalized["time"] = str(time_raw).strip()
    if gender:
        normalized["gender"] = gender
    if city:
        normalized["city"] = city

    lat = _coerce_float(lat_val)
    lon = _coerce_float(lon_val)
    if lat is not None:
        normalized["lat"] = lat
        if "latitude" not in normalized:
            normalized["latitude"] = lat
    if lon is not None:
        normalized["lon"] = lon
        if "longitude" not in normalized:
            normalized["longitude"] = lon

    return normalized


def get_cross_analysis_for_chart(saju_data: dict, astro_data: dict, theme: str = "chat", locale: str = "ko") -> str:
    """
    Get detailed cross-analysis based on user's chart data.
    Enhanced v3: Uses ALL fusion rules with:
    - Planet + House combinations with timing/advice
    - Saju Ten Gods (십신) analysis
    - Element cross-matching (사주 오행 × 점성 원소)
    - Health, Wealth, Family, Life Path analysis
    - Actionable insights with specific timing
    - Supports both new (text_ko/advice) and legacy (text only) rule formats
    """
    cache = _load_cross_analysis_cache()
    results = []
    detailed_insights = []

    # Get chart elements (support both "heavenlyStem" and "name" for dayMaster)
    dm_data = saju_data.get("dayMaster", {})
    if isinstance(dm_data, str):
        daymaster = dm_data
        dm_element = ""
    else:
        daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "") if isinstance(dm_data, dict) else ""
        dm_element = dm_data.get("element", "") if isinstance(dm_data, dict) else ""

    # Safely get astro signs (handle both dict and non-dict cases)
    sun_data = astro_data.get("sun", {})
    sun_sign = sun_data.get("sign", "") if isinstance(sun_data, dict) else ""
    moon_data = astro_data.get("moon", {})
    moon_sign = moon_data.get("sign", "") if isinstance(moon_data, dict) else ""
    dominant = saju_data.get("dominantElement", "")

    # Extract Ten Gods (십신) from saju data
    ten_gods = saju_data.get("tenGods", {})
    if not isinstance(ten_gods, dict):
        ten_gods = {}
    dominant_god = ten_gods.get("dominant", "")  # e.g., "정관", "편관", "정재", "상관"
    # Ensure dominant_god is a string (not dict)
    if isinstance(dominant_god, dict):
        dominant_god = dominant_god.get("name", "") or dominant_god.get("ko", "") or ""
    elif not isinstance(dominant_god, str):
        dominant_god = str(dominant_god) if dominant_god else ""

    # Get element counts for imbalance detection
    element_counts = saju_data.get("elementCounts", {})

    # Map Korean sign names to English and element
    sign_map = {
        "양자리": "Aries", "황소자리": "Taurus", "쌍둥이자리": "Gemini",
        "게자리": "Cancer", "사자자리": "Leo", "처녀자리": "Virgo",
        "천칭자리": "Libra", "전갈자리": "Scorpio", "궁수자리": "Sagittarius",
        "염소자리": "Capricorn", "물병자리": "Aquarius", "물고기자리": "Pisces",
    }
    sign_element_map = {
        "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
        "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
        "Gemini": "air", "Libra": "air", "Aquarius": "air",
        "Cancer": "water", "Scorpio": "water", "Pisces": "water",
    }
    # Map saju elements to flags for health rules
    element_to_flag = {
        "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water"
    }

    sun_sign_en = sign_map.get(sun_sign, sun_sign)
    moon_sign_en = sign_map.get(moon_sign, moon_sign)
    sun_element = sign_element_map.get(sun_sign_en, "")

    # Planet-house combinations to check (used in multiple sections)
    planet_house_checks = []
    for planet in ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]:
        p_data = astro_data.get(planet, {})
        house = p_data.get("house")
        if house:
            planet_house_checks.append((planet, str(house)))

    # Load ALL fusion rules (not just career/love)
    fusion_rules = {}
    try:
        rules_dir = Path(__file__).parent.parent / "data" / "graph" / "rules" / "fusion"
        # Load all theme-specific fusion rules
        all_rule_files = [
            "career.json", "love.json", "health.json", "wealth.json",
            "family.json", "life_path.json", "daily.json", "monthly.json",
            "compatibility.json", "new_year.json", "next_year.json"
        ]
        for rule_file in all_rule_files:
            rule_path = rules_dir / rule_file
            if rule_path.exists():
                with open(rule_path, "r", encoding="utf-8") as f:
                    rules = json.load(f)
                    fusion_rules[rule_file.replace(".json", "")] = rules
        logger.debug(f"[CROSS-ANALYSIS] Loaded {len(fusion_rules)} fusion rule sets")
    except Exception as e:
        logger.warning(f"[CROSS-ANALYSIS] Failed to load fusion rules: {e}")

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

        # 1-2. 십신-행성 교차 분석 (cross_sipsin_planets.json)
        sipsin_planets = cache.get("cross_sipsin_planets", {})
        if sipsin_planets and dominant_god:
            sipsin_mapping = sipsin_planets.get("sipsin_planet_mapping", {})
            if dominant_god in sipsin_mapping:
                sp_data = sipsin_mapping[dominant_god]
                planet = sp_data.get("planet", "")
                life_areas = sp_data.get("life_areas", {})
                psych = sp_data.get("psychological_theme", "")
                # Theme-specific insight from sipsin-planet mapping
                area_text = ""
                if theme in ["focus_career", "career"] and life_areas.get("career"):
                    area_text = life_areas["career"]
                elif theme in ["focus_love", "love"] and life_areas.get("relationship"):
                    area_text = life_areas["relationship"]
                elif theme in ["focus_wealth", "wealth"] and life_areas.get("wealth"):
                    area_text = life_areas["wealth"]
                elif theme in ["focus_health", "health"] and life_areas.get("health"):
                    area_text = life_areas["health"]
                if area_text:
                    detailed_insights.append((7, f"🔗 십신×행성 [{dominant_god}↔{planet}]: {area_text} ({psych})"))

        # 1-3. 지지-하우스 교차 분석 (cross_branch_house.json)
        branch_house = cache.get("cross_branch_house", {})
        if branch_house:
            branch_mapping = branch_house.get("branch_house_mapping", {})
            # Check year, month, day, hour branches
            for pillar_key in ["yearPillar", "monthPillar", "dayPillar", "hourPillar"]:
                pillar = saju_data.get(pillar_key, {})
                if not isinstance(pillar, dict):
                    continue
                branch = pillar.get("earthlyBranch", "")
                if not isinstance(branch, str):
                    branch = str(branch) if branch else ""
                branch_ko = {"子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
                             "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해"}.get(branch, "")
                if branch_ko and branch_ko in branch_mapping:
                    bh_data = branch_mapping[branch_ko]
                    primary_house = bh_data.get("primary_house")
                    # Check if user has a planet in this house
                    for planet, house in planet_house_checks:
                        if str(primary_house) == house:
                            life_themes = bh_data.get("life_themes", {})
                            shared = bh_data.get("shared_energy", "")
                            pillar_names = {"yearPillar": "년지", "monthPillar": "월지", "dayPillar": "일지", "hourPillar": "시지"}
                            detailed_insights.append((6, f"⚡ 지지×하우스 [{pillar_names[pillar_key]} {branch}↔{planet} {house}H]: {shared}"))
                            break

        # 1-4. 천간합/지지합 분석 (cross_relations_aspects.json)
        relations_aspects = cache.get("cross_relations_aspects", {})
        if relations_aspects:
            major_aspects = relations_aspects.get("major_aspects", {})
            conj = major_aspects.get("conjunction_0", {})
            # Check for 천간합 in user's chart
            cheongan_hap = conj.get("cheongan_hap_details", {})
            year_pillar = saju_data.get("yearPillar", {})
            day_pillar = saju_data.get("dayPillar", {})
            year_stem = year_pillar.get("heavenlyStem", "") if isinstance(year_pillar, dict) else ""
            day_stem = day_pillar.get("heavenlyStem", "") if isinstance(day_pillar, dict) else ""
            # Ensure stems are strings
            if not isinstance(year_stem, str):
                year_stem = str(year_stem) if year_stem else ""
            if not isinstance(day_stem, str):
                day_stem = str(day_stem) if day_stem else ""
            # Common 합 combinations
            hap_pairs = {"갑": "기", "을": "경", "병": "신", "정": "임", "무": "계",
                         "기": "갑", "경": "을", "신": "병", "임": "정", "계": "무"}
            for stem in [year_stem, day_stem]:
                if stem and isinstance(stem, str) and stem in hap_pairs:
                    hap_key = f"{stem}{hap_pairs[stem]}합"
                    if hap_key in cheongan_hap:
                        hap_info = cheongan_hap[hap_key]
                        detailed_insights.append((5, f"☯️ 천간합 [{hap_key}]: {hap_info.get('meaning', '')} → {hap_info.get('result', '')}기운 형성"))

        # 1-5. 신살×소행성 매핑 (cross_shinsal_asteroids.json)
        shinsal_asteroids = cache.get("cross_shinsal_asteroids", {})
        if shinsal_asteroids:
            shinsal_mapping = shinsal_asteroids.get("major_shinsal_mapping", {})
            # Check user's shinsal from saju_data - handle various data structures
            raw_shinsals = saju_data.get("sinsal", []) or saju_data.get("shinsals", []) or saju_data.get("shinsalList", []) or []
            user_shinsals = []
            if isinstance(raw_shinsals, dict):
                # Handle {"luckyList": [{"name": "천을귀인"}], "unluckyList": [...]} structure
                for key in ["luckyList", "unluckyList", "twelveAll", "hits"]:
                    sublist = raw_shinsals.get(key, [])
                    if isinstance(sublist, list):
                        for item in sublist:
                            if isinstance(item, dict):
                                name = item.get("name", "") or item.get("kind", "")
                                if name:
                                    user_shinsals.append(name)
                            elif isinstance(item, str):
                                user_shinsals.append(item)
                # Also try dict keys as fallback
                if not user_shinsals:
                    user_shinsals = [k for k in raw_shinsals.keys() if not k.startswith("$")]
            elif isinstance(raw_shinsals, list):
                # Handle list of dicts or list of strings
                for item in raw_shinsals:
                    if isinstance(item, dict):
                        name = item.get("name", "") or item.get("kind", "")
                        if name:
                            user_shinsals.append(name)
                    elif isinstance(item, str):
                        user_shinsals.append(item)
            for shinsal_name in user_shinsals[:3]:  # Top 3 shinsals
                if not isinstance(shinsal_name, str):
                    continue
                if shinsal_name in shinsal_mapping:
                    ss_data = shinsal_mapping[shinsal_name]
                    astro_par = ss_data.get("astro_parallel", {})
                    primary = astro_par.get("primary", "")
                    effect = ss_data.get("effect", "")
                    house_act = ss_data.get("house_activation", [])
                    # Check if user has matching planet in activated house
                    if primary and effect:
                        detailed_insights.append((6, f"⭐ 신살×점성 [{shinsal_name}↔{primary}]: {effect}"))

        # 1-6. 격국×하우스 패턴 (cross_geokguk_house.json)
        geokguk_house = cache.get("cross_geokguk_house", {})
        if geokguk_house:
            junggyeok = geokguk_house.get("junggyeok_8types", {})
            user_geokguk = saju_data.get("geokguk", "") or saju_data.get("gyeokguk", "")
            if user_geokguk and user_geokguk in junggyeok:
                gk_data = junggyeok[user_geokguk]
                astro_par = gk_data.get("astro_parallel", {})
                chart_sig = gk_data.get("chart_signature", "")
                life_exp = gk_data.get("life_expression", "")
                primary = astro_par.get("primary", "")
                if primary and chart_sig:
                    detailed_insights.append((7, f"🏛️ 격국×차트 [{user_geokguk}↔{primary}]: {chart_sig}"))
                    if life_exp and theme in ["career", "focus_career", "life"]:
                        detailed_insights.append((6, f"   → 적성: {life_exp}"))

        # 1-7. 대운×프로그레션 (cross_luck_progression.json)
        luck_prog = cache.get("cross_luck_progression", {})
        if luck_prog:
            daeun_mapping = luck_prog.get("daeun_progression_mapping", {})
            sipsin_daeun = daeun_mapping.get("sipsin_daeun_astro", {})
            # Get current daeun sipsin
            current_daeun = saju_data.get("currentDaeun", {}) or saju_data.get("daeWoon", {})
            if isinstance(current_daeun, list) and len(current_daeun) > 0:
                current_daeun = current_daeun[0]
            daeun_sipsin = ""
            if isinstance(current_daeun, dict):
                daeun_sipsin = current_daeun.get("sipsin", "") or current_daeun.get("heavenlyGod", "")
                if daeun_sipsin and "운" not in daeun_sipsin:
                    daeun_sipsin = daeun_sipsin + "운"
            if daeun_sipsin and daeun_sipsin in sipsin_daeun:
                ld_data = sipsin_daeun[daeun_sipsin]
                saju_theme = ld_data.get("saju_theme", "")
                astro_par = ld_data.get("astro_parallel", "")
                if saju_theme:
                    detailed_insights.append((5, f"📅 대운×프로그레션 [{daeun_sipsin}]: {saju_theme}"))

        # 1-8. 60갑자×하모닉/납음 (cross_60ganji_harmonic.json)
        ganji_harmonic = cache.get("cross_60ganji_harmonic", {})
        if ganji_harmonic:
            naeum_types = ganji_harmonic.get("naeum_30_types", {})
            # Get user's day pillar naeum
            day_pillar = saju_data.get("dayPillar", {})
            day_ganji = day_pillar.get("fullStem", "") or f"{day_pillar.get('heavenlyStem', '')}{day_pillar.get('earthlyBranch', '')}"
            for naeum_name, naeum_data in naeum_types.items():
                if not isinstance(naeum_data, dict):
                    continue
                ganji_list = naeum_data.get("ganji", [])
                if any(day_ganji in g for g in ganji_list):
                    harmonic = naeum_data.get("harmonic_parallel", {})
                    personality = naeum_data.get("personality", "")
                    life_theme = naeum_data.get("life_theme", "")
                    h_primary = harmonic.get("primary", "")
                    if personality:
                        detailed_insights.append((6, f"🎵 납음×하모닉 [{naeum_name}↔{h_primary}]: {personality}"))
                    if life_theme:
                        detailed_insights.append((5, f"   → 삶의 테마: {life_theme}"))
                    break

        # 1-9. 공망×드라코닉 카르마 (cross_draconic_karma.json)
        draconic_karma = cache.get("cross_draconic_karma", {})
        if draconic_karma:
            gongmang_sn = draconic_karma.get("gongmang_south_node", {})
            branch_void = gongmang_sn.get("cross_mapping", {}).get("branch_house_void", {})
            user_gongmang = saju_data.get("gongmang", []) or saju_data.get("kongmang", [])
            if isinstance(user_gongmang, str):
                user_gongmang = [user_gongmang]
            for gm in user_gongmang[:2]:
                if not isinstance(gm, str):
                    continue
                gm_key = f"{gm}_공망"
                if gm_key in branch_void:
                    gm_data = branch_void[gm_key]
                    gm_theme = gm_data.get("theme", "")  # Use gm_theme to avoid shadowing function param
                    draconic = gm_data.get("draconic", "")
                    if gm_theme:
                        detailed_insights.append((5, f"🌙 공망×드라코닉 [{gm} 공망]: {gm_theme}"))

    # 2. Planet-House detailed analysis from ALL fusion rules
    is_ko = locale == "ko"
    text_key = "text_ko" if is_ko else "text_en"

    # Determine which domains to use based on theme (expanded for all themes)
    theme_to_domain = {
        # General chat uses multiple domains
        "chat": ["career", "love", "health", "wealth"],
        "life": ["career", "love", "life_path", "wealth"],
        "life_path": ["life_path", "career", "love"],
        # Focus themes use specific domains
        "focus_career": ["career"], "career": ["career"],
        "focus_love": ["love"], "love": ["love"],
        "focus_health": ["health"], "health": ["health"],
        "focus_wealth": ["wealth"], "wealth": ["wealth"],
        "focus_family": ["family"], "family": ["family"],
        # Time-based themes
        "daily": ["daily", "health"],
        "monthly": ["monthly", "career", "love"],
        "new_year": ["new_year", "career", "love", "health"],
        "next_year": ["next_year", "career", "wealth"],
        # Compatibility
        "compatibility": ["compatibility", "love"],
    }
    domains = theme_to_domain.get(theme, ["career", "love", "health"])

    # Helper to extract text from rule (supports both new and legacy formats)
    def get_rule_text(rule: dict, prefer_ko: bool = True) -> str:
        """Extract text from rule, supporting both new (text_ko/text_en) and legacy (text) formats."""
        if prefer_ko:
            return rule.get("text_ko", rule.get("text", rule.get("text_en", "")))
        else:
            return rule.get("text_en", rule.get("text", rule.get("text_ko", "")))

    # Theme-specific emoji mapping
    domain_emoji = {
        "career": "💼", "love": "💕", "health": "🏥", "wealth": "💰",
        "family": "👨‍👩‍👧‍👦", "life_path": "🌟", "daily": "📅", "monthly": "📆",
        "compatibility": "💑", "new_year": "🎊", "next_year": "🔮"
    }

    # Apply detailed fusion rules for ALL domains
    for domain in domains:
        if domain not in fusion_rules:
            continue
        rules = fusion_rules[domain]
        emoji = domain_emoji.get(domain, "✨")

        # A. Check planet-house rules (e.g., rule_sun_10, rule_venus_7)
        # Also check legacy format: rule_1, rule_2, etc. with "when" arrays
        for planet, house in planet_house_checks:
            # New format: rule_{planet}_{house}
            rule_key = f"rule_{planet}_{house}"
            if rule_key in rules:
                rule = rules[rule_key]
                text = get_rule_text(rule, is_ko)
                advice = rule.get("advice_ko", "")
                timing = rule.get("timing", "")
                saju_link = rule.get("saju_link", "")
                weight = rule.get("weight", 5)

                if text:
                    insight = f"{emoji} {text[:150]}"
                    if timing and is_ko:
                        insight += f"\n⏰ 시기: {timing}"
                    if advice and is_ko:
                        insight += f"\n💡 조언: {advice}"
                    if saju_link and dominant_god and dominant_god in saju_link:
                        insight += f"\n🔗 사주연결: {saju_link}"
                    detailed_insights.append((weight, insight))

            # Legacy format: search for rules with "when" arrays containing planet and house
            for rule_key, rule in rules.items():
                if not isinstance(rule, dict):
                    continue
                when = rule.get("when", [])
                if isinstance(when, list) and planet in when and house in when:
                    text = get_rule_text(rule, is_ko)
                    weight = rule.get("weight", 4)
                    if text and len(text) > 10:
                        # Translate common English patterns to Korean if needed
                        if is_ko and text.startswith(planet.capitalize()):
                            text = f"{planet.capitalize()} {house}하우스: {text.split(':', 1)[-1].strip() if ':' in text else text}"
                        insight = f"{emoji} {text[:120]}"
                        detailed_insights.append((weight, insight))
                        break  # Only one match per planet-house combo per domain

        # B. Health-specific: Element imbalance analysis
        if domain == "health" and element_counts:
            for elem_ko, elem_en in element_to_flag.items():
                count = element_counts.get(elem_ko, 0)
                # Check for depleted elements (0 count)
                if count == 0:
                    flag_key = f"{elem_en}_zero"
                    for rule_key, rule in rules.items():
                        when = rule.get("when", [])
                        if isinstance(when, list) and flag_key in when:
                            text = get_rule_text(rule, is_ko)
                            weight = rule.get("weight", 4)
                            if text:
                                ko_elem_names = {"wood": "목(木)", "fire": "화(火)", "earth": "토(土)", "metal": "금(金)", "water": "수(水)"}
                                elem_name = ko_elem_names.get(elem_en, elem_en)
                                insight = f"🏥 {elem_name} 부족: {text[:100]}" if is_ko else f"🏥 {elem_en} depleted: {text[:100]}"
                                detailed_insights.append((weight, insight))
                                break
                # Check for excess elements (high count, e.g., >= 3)
                elif count >= 3:
                    flag_key = f"{elem_en}_high"
                    for rule_key, rule in rules.items():
                        when = rule.get("when", [])
                        if isinstance(when, list) and flag_key in when:
                            text = get_rule_text(rule, is_ko)
                            weight = rule.get("weight", 3)
                            if text:
                                ko_elem_names = {"wood": "목(木)", "fire": "화(火)", "earth": "토(土)", "metal": "금(金)", "water": "수(水)"}
                                elem_name = ko_elem_names.get(elem_en, elem_en)
                                insight = f"🏥 {elem_name} 과다: {text[:100]}" if is_ko else f"🏥 {elem_en} excess: {text[:100]}"
                                detailed_insights.append((weight, insight))
                                break

        # C. Wealth-specific: Money house analysis (2, 8, 10, 11)
        if domain == "wealth":
            money_houses = ["2", "8", "10", "11"]
            for planet, house in planet_house_checks:
                if house in money_houses:
                    for rule_key, rule in rules.items():
                        when = rule.get("when", [])
                        if isinstance(when, list) and planet in when and house in when:
                            text = get_rule_text(rule, is_ko)
                            weight = rule.get("weight", 5)
                            if text:
                                insight = f"💰 {text[:120]}"
                                detailed_insights.append((weight, insight))
                                break

        # D. Check Ten Gods rules (십신 기반 분석) - for career/love domains
        if dominant_god and domain in ["career", "love"]:
            god_mapping = {
                "정관": "jeonggwan", "편관": "pyeongwan",
                "정재": "jeongje", "편재": "pyeonje",
                "상관": "sangwan", "식신": "sikshin",
                "정인": "jeongin", "편인": "pyeonin",
                "비견": "bigyeon", "겁재": "geopje",
            }
            mapped_god = god_mapping.get(dominant_god, "")
            if mapped_god:
                for rule_key, rule in rules.items():
                    if mapped_god in rule_key.lower():
                        text = get_rule_text(rule, is_ko)
                        advice = rule.get("advice_ko", "")
                        weight = rule.get("weight", 5)
                        if text:
                            insight = f"📊 십신분석 [{dominant_god}]: {text[:120]}"
                            if advice:
                                insight += f"\n💡 {advice}"
                            detailed_insights.append((weight, insight))
                            break

        # E. Check element cross-rules (사주 오행 × 점성 원소)
        if dm_element and sun_element:
            for rule_key, rule in rules.items():
                if "cross" in rule_key and dm_element in rule_key and sun_element in rule_key:
                    text = get_rule_text(rule, is_ko)
                    advice = rule.get("advice_ko", "")
                    weight = rule.get("weight", 6)
                    if text:
                        insight = f"🔮 융합분석 [{dm_element}+{sun_element}]: {text[:120]}"
                        if advice:
                            insight += f"\n💡 {advice}"
                        detailed_insights.append((weight, insight))
                        break

    # 3. GraphRAG theme rules (keyword match, no embedding) - INSTANT
    if HAS_GRAPH_RAG:
        try:
            graph_rag = get_graph_rag()

            # Build facts string for rule matching
            facts_parts = [theme, daymaster, dm_element, dominant]
            if sun_sign_en:
                facts_parts.append(sun_sign_en.lower())
            if moon_sign_en:
                facts_parts.append(moon_sign_en.lower())

            # Add planets in houses
            for planet, house in planet_house_checks:
                facts_parts.extend([planet, house, f"{planet} {house}"])

            facts_str = " ".join(filter(None, facts_parts))

            # Apply rules from each domain (instant keyword match)
            for domain in domains:
                if hasattr(graph_rag, '_apply_rules'):
                    matched = graph_rag._apply_rules(domain, facts_str)
                    if matched:
                        results.extend(matched[:2])

        except Exception as e:
            logger.warning(f"[CROSS-ANALYSIS] GraphRAG rules failed: {e}")

    # Sort detailed insights by weight (highest first) and deduplicate
    detailed_insights.sort(key=lambda x: -x[0])
    seen_texts = set()
    unique_insights = []
    for weight, insight in detailed_insights:
        # Use first 50 chars as dedup key
        key = insight[:50]
        if key not in seen_texts:
            seen_texts.add(key)
            unique_insights.append(insight)
        if len(unique_insights) >= 5:  # Take top 5 unique insights
            break

    # Combine all results: basic cross-analysis + detailed insights
    all_results = results + unique_insights

    # Log summary
    logger.info(f"[CROSS-ANALYSIS] Generated {len(all_results)} insights for theme={theme}, domains={domains}")

    return "\n\n".join(all_results[:8]) if all_results else ""


# ===============================================================
# 🎯 THEME-SPECIFIC FUSION RULES - Daily/Monthly/Yearly guidance
# ===============================================================

def get_theme_fusion_rules(saju_data: dict, astro_data: dict, theme: str, locale: str = "ko", birth_year: int = None) -> str:
    """
    Get theme-specific fusion rules based on counselor theme.
    Applies rules from daily.json, monthly.json, new_year.json, next_year.json, family.json, life_path.json.

    Returns actionable insights tailored to the specific counseling theme.
    """
    from pathlib import Path
    from datetime import datetime

    results = []
    is_ko = locale == "ko"
    now = datetime.now()

    # Theme to rule file mapping
    theme_file_map = {
        "focus_overall": ["daily", "monthly", "life_path", "new_year"],
        "focus_career": ["daily", "monthly", "career"],
        "focus_love": ["daily", "monthly", "love", "family"],
        "focus_health": ["daily", "monthly", "health"],
        "focus_wealth": ["daily", "monthly", "wealth"],
        "focus_family": ["daily", "monthly", "family"],
        "focus_2025": ["new_year", "next_year", "monthly"],
        "focus_compatibility": ["compatibility", "love", "family"],
        "chat": ["daily", "life_path"],
    }

    rule_files = theme_file_map.get(theme, ["daily", "life_path"])

    # Load fusion rules
    rules_dir = Path(__file__).parent.parent / "data" / "graph" / "rules" / "fusion"
    loaded_rules = {}
    for rf in rule_files:
        rule_path = rules_dir / f"{rf}.json"
        if rule_path.exists():
            try:
                with open(rule_path, "r", encoding="utf-8") as f:
                    loaded_rules[rf] = json.load(f)
            except Exception as e:
                logger.warning(f"[THEME-FUSION] Failed to load {rf}.json: {e}")

    # Extract chart data
    dm_data = saju_data.get("dayMaster", {})
    if not isinstance(dm_data, dict):
        dm_data = {}
    daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
    dm_element = dm_data.get("element", "")
    ten_gods = saju_data.get("tenGods", {})
    if not isinstance(ten_gods, dict):
        ten_gods = {}
    dominant_god = ten_gods.get("dominant", "")
    # Ensure dominant_god is a string (not dict)
    if isinstance(dominant_god, dict):
        dominant_god = dominant_god.get("name", "") or dominant_god.get("ko", "") or ""
    elif not isinstance(dominant_god, str):
        dominant_god = str(dominant_god) if dominant_god else ""

    # Astrology data - safely handle non-dict values
    sun_data = astro_data.get("sun", {})
    sun_sign = sun_data.get("sign", "") if isinstance(sun_data, dict) else ""
    moon_data = astro_data.get("moon", {})
    moon_sign = moon_data.get("sign", "") if isinstance(moon_data, dict) else ""

    # Calculate age if birth_year provided
    current_age = now.year - birth_year if birth_year else None

    # Helper to get localized text
    def get_text(rule):
        if is_ko:
            return rule.get("text_ko", rule.get("text", ""))
        return rule.get("text_en", rule.get("text", ""))

    def get_advice(rule):
        return rule.get("advice_ko", "") if is_ko else rule.get("advice_en", "")

    # ===============================================================
    # 1. DAILY RULES - Moon phases, planetary transits, day energy
    # ===============================================================
    if "daily" in loaded_rules:
        daily_rules = loaded_rules["daily"]

        # Check moon phase (simplified - use current day of lunar month)
        lunar_day = now.day % 30
        if lunar_day <= 3:  # New moon period
            rule = daily_rules.get("rule_new_moon_day")
            if rule:
                results.append(f"🌑 {get_text(rule)}\n💡 {get_advice(rule)}")
        elif 13 <= lunar_day <= 17:  # Full moon period
            rule = daily_rules.get("rule_full_moon_day")
            if rule:
                results.append(f"🌕 {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check daily Ten God energy (ilgan)
        if dominant_god:
            god_category = ""
            if dominant_god in ["비견", "겁재"]:
                god_category = "bigyeop"
            elif dominant_god in ["식신", "상관"]:
                god_category = "siksang"
            elif dominant_god in ["정재", "편재"]:
                god_category = "jaesung"
            elif dominant_god in ["정관", "편관"]:
                god_category = "gwansung"
            elif dominant_god in ["정인", "편인"]:
                god_category = "insung"

            if god_category:
                rule_key = f"rule_ilgan_{god_category}"
                rule = daily_rules.get(rule_key)
                if rule:
                    results.append(f"📅 오늘의 기운 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 2. MONTHLY RULES - Seasonal energy, monthly transits
    # ===============================================================
    if "monthly" in loaded_rules:
        monthly_rules = loaded_rules["monthly"]

        # Check monthly Ten God energy (wolgon)
        if dominant_god:
            god_category = ""
            if dominant_god in ["비견", "겁재"]:
                god_category = "bigyeop"
            elif dominant_god in ["식신", "상관"]:
                god_category = "siksang"
            elif dominant_god in ["정재", "편재"]:
                god_category = "jaesung"
            elif dominant_god in ["정관", "편관"]:
                god_category = "gwansung"
            elif dominant_god in ["정인", "편인"]:
                god_category = "insung"

            if god_category:
                rule_key = f"rule_wolgon_{god_category}"
                rule = monthly_rules.get(rule_key)
                if rule:
                    results.append(f"📆 이번 달 에너지 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check for eclipse month (simple approximation - eclipse seasons)
        if now.month in [3, 4, 9, 10]:  # Approximate eclipse seasons
            rule = monthly_rules.get("rule_eclipse_month")
            if rule and rule.get("weight", 0) >= 8:
                results.append(f"🌓 {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 3. NEW YEAR / 2025 RULES - Annual themes, daeun
    # ===============================================================
    if "new_year" in loaded_rules and theme in ["focus_2025", "focus_overall"]:
        new_year_rules = loaded_rules["new_year"]

        # Check daeun (10-year luck cycle) based on dominant god
        if dominant_god:
            god_category = ""
            if dominant_god in ["비견", "겁재"]:
                god_category = "bigyeop"
            elif dominant_god in ["식신", "상관"]:
                god_category = "siksang"
            elif dominant_god in ["정재", "편재"]:
                god_category = "jaesung"
            elif dominant_god in ["정관", "편관"]:
                god_category = "gwansung"
            elif dominant_god in ["정인", "편인"]:
                god_category = "insung"

            if god_category:
                rule_key = f"rule_daeun_{god_category}"
                rule = new_year_rules.get(rule_key)
                if rule:
                    results.append(f"🎊 2025년 대운 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check year pillar harmony/clash (simplified)
        # 2025 is 을사년 (乙巳年) - Wood Snake
        year_snake_compatible = ["자", "축", "신", "유"]  # Generally harmonious
        year_snake_clash = ["해"]  # 사해충

        day_pillar_data = saju_data.get("dayPillar", {})
        day_branch = day_pillar_data.get("earthlyBranch", "") if isinstance(day_pillar_data, dict) else ""
        if not isinstance(day_branch, str):
            day_branch = str(day_branch) if day_branch else ""
        branch_ko = {"子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
                     "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해"}.get(day_branch, "")

        if branch_ko in year_snake_compatible:
            rule = new_year_rules.get("rule_year_pillar_match")
            if rule:
                results.append(f"✨ 2025년 운세 조화: {get_text(rule)}\n💡 {get_advice(rule)}")
        elif branch_ko in year_snake_clash:
            rule = new_year_rules.get("rule_year_pillar_clash")
            if rule:
                results.append(f"⚡ 2025년 변화의 해: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 4. NEXT YEAR RULES - Future planning
    # ===============================================================
    if "next_year" in loaded_rules and theme in ["focus_2025"]:
        next_year_rules = loaded_rules["next_year"]

        # Seun (yearly luck) based on dominant god
        if dominant_god:
            god_category = ""
            if dominant_god in ["비견", "겁재"]:
                god_category = "bigyeop"
            elif dominant_god in ["식신", "상관"]:
                god_category = "siksang"
            elif dominant_god in ["정재", "편재"]:
                god_category = "jaesung"
            elif dominant_god in ["정관", "편관"]:
                god_category = "gwansung"
            elif dominant_god in ["정인", "편인"]:
                god_category = "insung"

            if god_category:
                rule_key = f"rule_seun_{god_category}"
                rule = next_year_rules.get(rule_key)
                if rule:
                    results.append(f"🔮 2026년 세운 전망 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 5. FAMILY RULES - Relationship dynamics
    # ===============================================================
    if "family" in loaded_rules and theme in ["focus_love", "focus_family", "focus_compatibility"]:
        family_rules = loaded_rules["family"]

        # Check moon house position for family dynamics
        moon_house = astro_data.get("moon", {}).get("house")
        if moon_house:
            house_num = str(moon_house).replace("H", "")
            rule_key = f"rule_moon_{house_num}"
            rule = family_rules.get(rule_key)
            if rule:
                results.append(f"👨‍👩‍👧‍👦 가족 관계 [달 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check venus for relationships
        venus_house = astro_data.get("venus", {}).get("house")
        if venus_house:
            house_num = str(venus_house).replace("H", "")
            rule_key = f"rule_venus_{house_num}"
            rule = family_rules.get(rule_key)
            if rule:
                results.append(f"💕 관계 에너지 [금성 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 5-1. HEALTH RULES - Element balance, 6th/12th house
    # ===============================================================
    if "health" in loaded_rules and theme == "focus_health":
        health_rules = loaded_rules["health"]

        # Check element deficiencies
        element_counts = saju_data.get("elementCounts", {})
        if not isinstance(element_counts, dict):
            element_counts = {}
        element_map = {"木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water"}

        for elem_ko, elem_en in element_map.items():
            count_val = element_counts.get(elem_ko, 0)
            count = count_val if isinstance(count_val, (int, float)) else 0
            if count == 0:
                rule_key = f"rule_{elem_en}_zero"
                rule = health_rules.get(rule_key)
                if rule:
                    results.append(f"⚕️ 오행 부족 [{elem_ko}]: {get_text(rule)}\n💡 {get_advice(rule)}")
            elif count >= 3:
                rule_key = f"rule_{elem_en}_high"
                rule = health_rules.get(rule_key)
                if rule:
                    results.append(f"⚕️ 오행 과다 [{elem_ko}]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check health houses (6, 12)
        for planet in ["mars", "saturn", "moon", "neptune", "jupiter", "pluto"]:
            planet_data = astro_data.get(planet, {})
            if not isinstance(planet_data, dict):
                continue
            house = planet_data.get("house")
            if house:
                house_num = str(house).replace("H", "")
                if house_num in ["6", "12", "1"]:
                    rule_key = f"rule_{planet}_{house_num}"
                    rule = health_rules.get(rule_key)
                    if rule:
                        results.append(f"🏥 건강 관리 [{planet} {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 5-2. WEALTH RULES - Money houses, financial potential
    # ===============================================================
    if "wealth" in loaded_rules and theme == "focus_wealth":
        wealth_rules = loaded_rules["wealth"]

        # Check money houses (2, 8, 10, 11)
        for planet in ["jupiter", "venus", "saturn", "uranus", "pluto", "moon", "mars", "mercury", "sun"]:
            planet_data = astro_data.get(planet, {})
            if not isinstance(planet_data, dict):
                continue
            house = planet_data.get("house")
            if house:
                house_num = str(house).replace("H", "")
                if house_num in ["2", "8", "10", "11"]:
                    rule_key = f"rule_{planet}_{house_num}"
                    rule = wealth_rules.get(rule_key)
                    if rule:
                        results.append(f"💰 재물운 [{planet} {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check jaesung (재성) strength
        ten_gods_count = saju_data.get("tenGodsCount", {})
        if not isinstance(ten_gods_count, dict):
            ten_gods_count = {}
        jeongjae_val = ten_gods_count.get("정재", 0)
        pyeonjae_val = ten_gods_count.get("편재", 0)
        # Ensure values are numeric
        jeongjae_count = jeongjae_val if isinstance(jeongjae_val, (int, float)) else 0
        pyeonjae_count = pyeonjae_val if isinstance(pyeonjae_val, (int, float)) else 0
        jaesung_count = jeongjae_count + pyeonjae_count
        if jaesung_count >= 2:
            rule = wealth_rules.get("rule_jaesung_strong")
            if rule:
                results.append(f"💎 재성 분석: {get_text(rule)}\n💡 {get_advice(rule)}")
        elif jaesung_count == 0:
            rule = wealth_rules.get("rule_jaesung_weak")
            if rule:
                results.append(f"💎 재성 분석: {get_text(rule)}\n💡 {get_advice(rule)}")

    # ===============================================================
    # 6. LIFE PATH RULES - Soul purpose, individuation
    # ===============================================================
    if "life_path" in loaded_rules and theme in ["focus_overall", "chat"]:
        life_path_rules = loaded_rules["life_path"]

        # Check sun house for life purpose
        sun_data = astro_data.get("sun", {})
        sun_house = sun_data.get("house") if isinstance(sun_data, dict) else None
        if sun_house:
            house_num = str(sun_house).replace("H", "")
            rule_key = f"rule_sun_{house_num}"
            rule = life_path_rules.get(rule_key)
            if rule:
                results.append(f"🌟 인생 방향 [태양 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check north node for karmic direction
        north_node = astro_data.get("northNode", {}) or astro_data.get("north_node", {})
        if not isinstance(north_node, dict):
            north_node = {}
        nn_house = north_node.get("house")
        if nn_house:
            house_num = str(nn_house).replace("H", "")
            rule_key = f"rule_north_node_{house_num}"
            rule = life_path_rules.get(rule_key)
            if rule:
                results.append(f"🧭 영혼의 성장 방향 [북교점 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

    # Limit results and format
    if results:
        logger.info(f"[THEME-FUSION] Generated {len(results)} theme-specific insights for {theme}")
        return "\n\n".join(results[:5])  # Top 5 insights

    return ""


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


def prefetch_all_rag_data(saju_data: dict, astro_data: dict, theme: str = "chat", locale: str = "ko") -> dict:
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

    # Build query from chart data (support both "heavenlyStem" and "name" for dayMaster)
    dm_data = saju_data.get("dayMaster", {})
    daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
    dm_element = dm_data.get("element", "")
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

    # Theme concepts for Jung quotes - ENHANCED with more keywords
    theme_concepts = {
        "career": "vocation calling work purpose self-realization individuation hero journey 소명 직업 자아실현 영웅 여정 사명",
        "love": "anima animus relationship shadow projection intimacy attachment 아니마 아니무스 그림자 투사 친밀감 관계 사랑",
        "health": "psyche wholeness integration healing body-mind 치유 통합 전체성 심신 회복",
        "life_path": "individuation self persona shadow meaning transformation 개성화 자아 페르소나 의미 변환 성장",
        "wealth": "abundance value meaning purpose security prosperity 가치 의미 목적 안정 풍요",
        "family": "complex archetype mother father inner child 콤플렉스 원형 부모 내면아이 가족",
        "chat": "self-discovery meaning crisis growth 자기발견 의미 위기 성장",
        "focus_career": "vocation calling work purpose self-realization 소명 직업 자아실현 진로",
    }

    # --- Pre-load RAG instances (thread-safe) ---
    # SentenceTransformer encode() is NOT thread-safe, so we must load
    # instances in main thread and run queries SEQUENTIALLY
    _graph_rag_inst = get_graph_rag() if HAS_GRAPH_RAG else None
    _corpus_rag_inst = get_corpus_rag() if HAS_CORPUS_RAG else None
    _persona_rag_inst = get_persona_embed_rag() if HAS_PERSONA_EMBED else None
    _domain_rag_inst = get_domain_rag() if HAS_DOMAIN_RAG else None

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

    # CorpusRAG (Jung quotes) - ENHANCED: fetch more quotes with diverse concepts
    try:
        if _corpus_rag_inst:
            jung_query_parts = [theme_concepts.get(theme, theme), query[:100]]
            jung_query = " ".join(jung_query_parts)
            # Primary theme-based quotes
            quotes = _corpus_rag_inst.search(jung_query, top_k=6, min_score=0.12)

            # Also fetch general wisdom quotes for variety
            general_queries = ["individuation growth 개성화 성장", "shadow integration 그림자 통합"]
            for gq in general_queries:
                try:
                    extra_quotes = _corpus_rag_inst.search(gq, top_k=2, min_score=0.15)
                    quotes.extend(extra_quotes)
                except Exception:
                    pass

            # Deduplicate and limit
            seen = set()
            unique_quotes = []
            for q in quotes:
                key = q.get("quote_kr", "") or q.get("quote_en", "")
                if key and key not in seen:
                    seen.add(key)
                    unique_quotes.append(q)
                if len(unique_quotes) >= 8:
                    break

            result["corpus_quotes"] = [
                {
                    "text_ko": q.get("quote_kr", ""),
                    "text_en": q.get("quote_en", ""),
                    "source": q.get("source", ""),
                    "concept": q.get("concept", ""),
                    "score": q.get("score", 0)
                }
                for q in unique_quotes
            ]
            logger.info(f"[PREFETCH] CorpusRAG: {len(result['corpus_quotes'])} quotes (enhanced)")
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

    # Cross-analysis (no ML, thread-safe) - pass locale for proper language
    try:
        result["cross_analysis"] = get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
    except Exception as e:
        logger.warning(f"[PREFETCH] Cross-analysis failed: {e}")

    # DomainRAG - 도메인별 전문 지식 (사주/점성 해석 원칙 등)
    try:
        if _domain_rag_inst:
            # 테마에 맞는 도메인 검색
            domain_map = {
                "career": "career", "love": "love", "health": "health",
                "wealth": "wealth", "family": "family", "life_path": "life",
                "focus_career": "career", "focus_love": "love",
            }
            domain = domain_map.get(theme, "life")
            domain_results = _domain_rag_inst.search(domain, query[:200], top_k=5)
            result["domain_knowledge"] = domain_results[:5] if domain_results else []
            logger.info(f"[PREFETCH] DomainRAG: {len(result.get('domain_knowledge', []))} results")
    except Exception as e:
        logger.warning(f"[PREFETCH] DomainRAG failed: {e}")

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

        # 6. Dream RAG (for faster dream interpretation)
        try:
            from backend_ai.app.dream_logic import get_dream_embed_rag
            dream_rag = get_dream_embed_rag()
            # Warmup query to pre-compute any lazy embeddings
            _ = dream_rag.search("꿈 해석 테스트", top_k=1)
            logger.info(f"  ✅ DreamEmbedRAG loaded and warmed up")
        except Exception as dream_err:
            logger.warning(f"  ⚠️ DreamEmbedRAG warmup failed: {dream_err}")

        # 7. Redis cache connection
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
UNPROTECTED_PATHS = {"/", "/health", "/health/full", "/counselor/init", "/api/destiny-story/generate-stream"}


def _client_id() -> str:
    return (
        (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
        or request.remote_addr
        or "unknown"
    )


_rate_cleanup_counter = 0

def _check_rate() -> Tuple[bool, Optional[float]]:
    global _rate_cleanup_counter
    now = time.time()
    client = _client_id()
    window = [t for t in _rate_state[client] if now - t < RATE_WINDOW_SECONDS]
    _rate_state[client] = window

    # Periodic cleanup of stale clients (every 100 requests)
    _rate_cleanup_counter += 1
    if _rate_cleanup_counter >= 100:
        _rate_cleanup_counter = 0
        stale_clients = [
            c for c, ts in _rate_state.items()
            if not ts or (now - max(ts)) > RATE_WINDOW_SECONDS * 2
        ]
        for c in stale_clients:
            del _rate_state[c]
        if stale_clients:
            logger.debug(f"[RATE] Cleaned up {len(stale_clients)} stale clients")

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


# ===============================================================
# GLOBAL ERROR HANDLERS - Consistent error responses
# ===============================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({
        "status": "error",
        "code": 400,
        "message": "Bad request",
        "request_id": getattr(g, "request_id", None)
    }), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "status": "error",
        "code": 404,
        "message": "Endpoint not found",
        "request_id": getattr(g, "request_id", None)
    }), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        "status": "error",
        "code": 405,
        "message": "Method not allowed",
        "request_id": getattr(g, "request_id", None)
    }), 405


@app.errorhandler(500)
def internal_error(e):
    logger.exception(f"[ERROR] Unhandled exception: {e}")
    return jsonify({
        "status": "error",
        "code": 500,
        "message": "Internal server error",
        "request_id": getattr(g, "request_id", None)
    }), 500


@app.errorhandler(Exception)
def handle_exception(e):
    """Catch-all for unhandled exceptions."""
    logger.exception(f"[ERROR] Unhandled exception: {e}")
    return jsonify({
        "status": "error",
        "code": 500,
        "message": "An unexpected error occurred",
        "request_id": getattr(g, "request_id", None)
    }), 500


# Helper functions for building chart context
def _build_saju_summary(saju_data: dict) -> str:
    """Build concise saju summary for chat context."""
    if not saju_data:
        return ""
    parts = []
    if saju_data.get("dayMaster"):
        dm = saju_data["dayMaster"]
        dm_stem = dm.get('heavenlyStem') or dm.get('name', '')
        parts.append(f"Day Master: {dm_stem} ({dm.get('element', '')})")
    if saju_data.get("yearPillar"):
        yp = saju_data["yearPillar"]
        parts.append(f"Year: {yp.get('heavenlyStem', '')}{yp.get('earthlyBranch', '')}")
    if saju_data.get("monthPillar"):
        mp = saju_data["monthPillar"]
        parts.append(f"Month: {mp.get('heavenlyStem', '')}{mp.get('earthlyBranch', '')}")
    if saju_data.get("dominantElement"):
        parts.append(f"Dominant: {saju_data['dominantElement']}")
    return "SAJU: " + " | ".join(parts) if parts else ""


def _pick_astro_planet(astro_data: dict, name: str):
    """Select a planet payload from multiple possible shapes."""
    if not astro_data or not name:
        return None

    key = name.lower()
    direct = astro_data.get(key) or astro_data.get(name)
    if isinstance(direct, dict):
        return direct

    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    fact_hit = facts.get(key) or facts.get(name)
    if isinstance(fact_hit, dict):
        return fact_hit

    planets = astro_data.get("planets")
    if isinstance(planets, list):
        for p in planets:
            if isinstance(p, dict) and str(p.get("name", "")).lower() == key:
                return p
    return None


def _pick_ascendant(astro_data: dict):
    """Select ascendant payload from multiple possible shapes."""
    if not astro_data:
        return None
    asc = astro_data.get("ascendant") or astro_data.get("asc")
    if isinstance(asc, dict):
        return asc
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    asc = facts.get("ascendant") or facts.get("asc")
    return asc if isinstance(asc, dict) else None


def _pick_astro_aspect(astro_data: dict):
    """Pick a representative aspect entry."""
    if not astro_data:
        return None
    aspects = astro_data.get("aspects")
    if not isinstance(aspects, list):
        facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
        aspects = facts.get("aspects")
    if not isinstance(aspects, list) or not aspects:
        return None
    sorted_aspects = sorted(
        [a for a in aspects if isinstance(a, dict)],
        key=lambda a: a.get("score", 0),
        reverse=True
    )
    return sorted_aspects[0] if sorted_aspects else None


def _build_astro_summary(astro_data: dict) -> str:
    """Build concise astro summary for chat context."""
    if not astro_data:
        return ""
    parts = []
    sun = _pick_astro_planet(astro_data, "sun")
    if sun:
        parts.append(f"Sun: {sun.get('sign', '')}")
    moon = _pick_astro_planet(astro_data, "moon")
    if moon:
        parts.append(f"Moon: {moon.get('sign', '')}")
    asc = _pick_ascendant(astro_data)
    if asc:
        parts.append(f"Rising: {asc.get('sign', '')}")
    return "ASTRO: " + " | ".join(parts) if parts else ""


def _build_detailed_saju(saju_data: dict) -> str:
    """Build detailed saju context for personalized responses."""
    if not saju_data:
        return "사주 정보 없음"

    lines = []
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    pillars = saju_data.get("pillars") if isinstance(saju_data.get("pillars"), dict) else facts.get("pillars", {})

    def _format_pillar(label: str, pillar: dict | str | None):
        if not pillar:
            return None
        if isinstance(pillar, str):
            return f"{label}: {pillar}"
        if not isinstance(pillar, dict):
            return None
        hs = pillar.get("heavenlyStem") or {}
        eb = pillar.get("earthlyBranch") or {}
        stem = hs.get("name") if isinstance(hs, dict) else hs
        branch = eb.get("name") if isinstance(eb, dict) else eb
        element = pillar.get("element") or (hs.get("element") if isinstance(hs, dict) else None) or (eb.get("element") if isinstance(eb, dict) else None)
        core = f"{stem or ''}{branch or ''}".strip() or pillar.get("name", "")
        return f"{label}: {core}" + (f" ({element})" if element else "")

    # Four Pillars (support facts/pillars shapes)
    year_pillar = saju_data.get("yearPillar") or facts.get("yearPillar") or (pillars.get("year") if isinstance(pillars, dict) else None)
    month_pillar = saju_data.get("monthPillar") or facts.get("monthPillar") or (pillars.get("month") if isinstance(pillars, dict) else None)
    day_pillar = saju_data.get("dayPillar") or facts.get("dayPillar") or (pillars.get("day") if isinstance(pillars, dict) else None)
    hour_pillar = saju_data.get("hourPillar") or facts.get("timePillar") or (pillars.get("time") if isinstance(pillars, dict) else None)

    for label, pillar in [("년주", year_pillar), ("월주", month_pillar), ("일주", day_pillar), ("시주", hour_pillar)]:
        formatted = _format_pillar(label, pillar)
        if formatted:
            lines.append(formatted)

    # Day Master (most important) - support both "heavenlyStem" and "name"
    dm = saju_data.get("dayMaster") or facts.get("dayMaster")
    if dm:
        dm_stem = dm.get("heavenlyStem") or dm.get("name", "")
        lines.append(f"일간(본인): {dm_stem} - {dm.get('element', '')}의 기운")

    # Five Elements balance
    fe = saju_data.get("fiveElements") or facts.get("fiveElements")
    if fe:
        elements = [f"{k}({v})" for k, v in fe.items() if v]
        if elements:
            lines.append(f"오행 분포: {', '.join(elements)}")

    # Dominant element
    dominant_element = saju_data.get("dominantElement") or facts.get("dominantElement")
    if dominant_element:
        lines.append(f"주요 기운: {dominant_element}")

    # Ten Gods (if available)
    tg = saju_data.get("tenGods") or facts.get("tenGods")
    if tg:
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
    from datetime import datetime
    now = datetime.now()
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}

    # Big Three - ESSENTIAL
    sun_sign = ""
    moon_sign = ""
    sun = _pick_astro_planet(astro_data, "sun")
    if sun:
        sun_sign = sun.get("sign", "")
        house = sun.get("house", "")
        lines.append(f"☀️ 태양(자아): {sun_sign} {sun.get('degree', '')}°" + (f" - {house}하우스" if house else ""))
    moon = _pick_astro_planet(astro_data, "moon")
    if moon:
        moon_sign = moon.get("sign", "")
        house = moon.get("house", "")
        lines.append(f"🌙 달(감정): {moon_sign} {moon.get('degree', '')}°" + (f" - {house}하우스" if house else ""))
    asc = _pick_ascendant(astro_data)
    if asc:
        lines.append(f"⬆️ 상승(외적): {asc.get('sign', '')} {asc.get('degree', '')}°")

    # Key planets with houses
    for planet, info in [("mercury", "수성(소통)"), ("venus", "금성(사랑/관계)"),
                         ("mars", "화성(에너지)"), ("jupiter", "목성(행운/확장)"),
                         ("saturn", "토성(시련/책임)")]:
        p = _pick_astro_planet(astro_data, planet)
        if p:
            house = p.get("house", "")
            lines.append(f"{info}: {p.get('sign', '')}" + (f" - {house}하우스" if house else ""))

    # Houses (if available)
    houses = astro_data.get("houses") or facts.get("houses")
    if houses:
        h = houses
        lines.append("\n🏠 주요 하우스:")
        # Handle both dict and list formats
        if isinstance(h, dict):
            if h.get("1"):
                lines.append(f"  1하우스(자아): {h['1'].get('sign', '') if isinstance(h['1'], dict) else h['1']}")
            if h.get("7"):
                lines.append(f"  7하우스(파트너): {h['7'].get('sign', '') if isinstance(h['7'], dict) else h['7']}")
            if h.get("10"):
                lines.append(f"  10하우스(커리어): {h['10'].get('sign', '') if isinstance(h['10'], dict) else h['10']}")
        elif isinstance(h, list) and len(h) >= 10:
            # List format: index 0 = 1st house, etc.
            if h[0]:
                sign = h[0].get('sign', '') if isinstance(h[0], dict) else h[0]
                lines.append(f"  1하우스(자아): {sign}")
            if len(h) > 6 and h[6]:
                sign = h[6].get('sign', '') if isinstance(h[6], dict) else h[6]
                lines.append(f"  7하우스(파트너): {sign}")
            if len(h) > 9 and h[9]:
                sign = h[9].get('sign', '') if isinstance(h[9], dict) else h[9]
                lines.append(f"  10하우스(커리어): {sign}")

    # Current transits - ADD TIMING CONTEXT for 2025
    lines.append(f"\n🔮 현재 트랜짓 ({now.year}년 {now.month}월):")
    if now.year == 2025:
        if now.month <= 3:
            lines.append("• 토성 물고기자리: 감정적 경계 학습, 영적 성숙")
            lines.append("• 목성 쌍둥이자리: 소통과 학습의 확장기")
        elif now.month <= 6:
            lines.append("• 토성 양자리 입성 (5월): 새로운 책임과 도전의 시작")
            lines.append("• 목성 쌍둥이자리 마무리: 지식 확장 완료")
        else:
            lines.append("• 토성 양자리: 자기주도적 성장의 시기")
            lines.append("• 목성 게자리 (7월~): 가정/정서적 풍요")
        lines.append("• 명왕성 물병자리: 사회적 변혁, 개인의 독립성 강조")
    else:
        lines.append("• 주요 행성 트랜짓 참고하여 해석")

    # Interpretation hints
    if sun_sign or moon_sign:
        lines.append("\n💡 해석 포인트:")
        if sun_sign:
            lines.append(f"  태양 {sun_sign}: 핵심 정체성, 삶의 목적")
        if moon_sign:
            lines.append(f"  달 {moon_sign}: 감정 패턴, 내면의 욕구")

    return "\n".join(lines) if lines else "점성술 정보 부족"


def _build_advanced_astro_context(advanced_astro: dict) -> str:
    """Build context from advanced astrology features (draconic, harmonics, progressions, etc.)."""
    if not advanced_astro:
        return ""

    lines = []

    # Draconic Chart (soul-level astrology)
    if advanced_astro.get("draconic"):
        draconic = advanced_astro["draconic"]
        if isinstance(draconic, dict):
            lines.append("\n🐉 드라코닉 차트 (영혼 레벨):")
            if draconic.get("sun"):
                lines.append(f"  • 드라코닉 태양: {draconic['sun']}")
            if draconic.get("moon"):
                lines.append(f"  • 드라코닉 달: {draconic['moon']}")
            if draconic.get("insights"):
                lines.append(f"  → {draconic['insights'][:200]}")

    # Harmonics (personality layers)
    if advanced_astro.get("harmonics"):
        harmonics = advanced_astro["harmonics"]
        if isinstance(harmonics, dict):
            lines.append("\n🎵 하모닉 분석:")
            for key, value in list(harmonics.items())[:3]:
                if value:
                    lines.append(f"  • {key}: {value[:100] if isinstance(value, str) else value}")

    # Progressions (life timing)
    if advanced_astro.get("progressions"):
        prog = advanced_astro["progressions"]
        if isinstance(prog, dict):
            lines.append("\n🔄 프로그레션 (생애 타이밍):")
            if prog.get("secondary"):
                lines.append(f"  • 세컨더리: {prog['secondary'][:150] if isinstance(prog['secondary'], str) else prog['secondary']}")
            if prog.get("solarArc"):
                lines.append(f"  • 솔라 아크: {prog['solarArc'][:150] if isinstance(prog['solarArc'], str) else prog['solarArc']}")
            if prog.get("moonPhase"):
                lines.append(f"  • 현재 달 위상: {prog['moonPhase']}")

    # Solar Return (birthday year ahead)
    if advanced_astro.get("solarReturn"):
        sr = advanced_astro["solarReturn"]
        if isinstance(sr, dict) and sr.get("summary"):
            summary = sr['summary']
            if isinstance(summary, str):
                lines.append("\n🎂 솔라 리턴 (올해 생일 차트):")
                lines.append(f"  {summary[:200]}")

    # Lunar Return (monthly energy)
    if advanced_astro.get("lunarReturn"):
        lr = advanced_astro["lunarReturn"]
        if isinstance(lr, dict) and lr.get("summary"):
            summary = lr['summary']
            if isinstance(summary, str):
                lines.append("\n🌙 루나 리턴 (이번 달 에너지):")
                lines.append(f"  {summary[:200]}")

    # Asteroids (detailed personality)
    if advanced_astro.get("asteroids"):
        asteroids = advanced_astro["asteroids"]
        if isinstance(asteroids, (list, dict)):
            lines.append("\n☄️ 소행성 분석:")
            if isinstance(asteroids, list):
                for ast in asteroids[:4]:
                    if isinstance(ast, dict):
                        interp = ast.get('interpretation', '')
                        interp_str = interp[:80] if isinstance(interp, str) else str(interp)[:80]
                        lines.append(f"  • {ast.get('name', '')}: {ast.get('sign', '')} {interp_str}")
            elif isinstance(asteroids, dict):
                for name, data in list(asteroids.items())[:4]:
                    if isinstance(data, dict):
                        interp = data.get('interpretation', '')
                        interp_str = interp[:80] if isinstance(interp, str) else str(interp)[:80]
                        lines.append(f"  • {name}: {data.get('sign', '')} {interp_str}")

    # Fixed Stars (fate/destiny points)
    if advanced_astro.get("fixedStars"):
        stars = advanced_astro["fixedStars"]
        if isinstance(stars, list) and stars:
            lines.append("\n⭐ 고정항성 (운명 포인트):")
            for star in stars[:3]:
                if isinstance(star, dict):
                    interp = star.get('interpretation', '')
                    interp_str = interp[:100] if isinstance(interp, str) else str(interp)[:100]
                    lines.append(f"  • {star.get('name', '')}: {interp_str}")

    # Eclipses (transformation points)
    if advanced_astro.get("eclipses"):
        eclipses = advanced_astro["eclipses"]
        if isinstance(eclipses, (list, dict)):
            lines.append("\n🌑 일식/월식 영향:")
            if isinstance(eclipses, list):
                for ecl in eclipses[:2]:
                    if isinstance(ecl, dict):
                        interp = ecl.get('interpretation', '')
                        interp_str = interp[:100] if isinstance(interp, str) else str(interp)[:100]
                        lines.append(f"  • {ecl.get('type', '')}: {ecl.get('date', '')} - {interp_str}")
            elif isinstance(eclipses, dict):
                if eclipses.get("solar"):
                    solar = eclipses['solar']
                    solar_str = solar[:100] if isinstance(solar, str) else str(solar)[:100]
                    lines.append(f"  • 일식: {solar_str}")
                if eclipses.get("lunar"):
                    lunar = eclipses['lunar']
                    lunar_str = lunar[:100] if isinstance(lunar, str) else str(lunar)[:100]
                    lines.append(f"  • 월식: {lunar_str}")

    # Midpoints (relationship dynamics)
    if advanced_astro.get("midpoints"):
        mp = advanced_astro["midpoints"]
        if isinstance(mp, dict):
            lines.append("\n🔗 미드포인트 (핵심 조합):")
            if mp.get("sunMoon"):
                lines.append(f"  • 태양/달: {mp['sunMoon'][:100] if isinstance(mp['sunMoon'], str) else mp['sunMoon']}")
            if mp.get("ascMc"):
                lines.append(f"  • 상승/MC: {mp['ascMc'][:100] if isinstance(mp['ascMc'], str) else mp['ascMc']}")

    # Current Transits (personalized)
    if advanced_astro.get("transits"):
        transits = advanced_astro["transits"]
        if isinstance(transits, list) and transits:
            lines.append("\n🌍 현재 개인 트랜짓:")
            for transit in transits[:5]:
                if isinstance(transit, dict):
                    lines.append(f"  • {transit.get('aspect', '')}: {transit.get('interpretation', '')[:100]}")
                elif isinstance(transit, str):
                    lines.append(f"  • {transit[:100]}")

    # Extra Points (Lilith, Part of Fortune, etc.)
    if advanced_astro.get("extraPoints"):
        extra = advanced_astro["extraPoints"]
        if isinstance(extra, dict):
            lines.append("\n🔮 특수 포인트:")
            for name, data in list(extra.items())[:4]:
                if isinstance(data, dict):
                    lines.append(f"  • {name}: {data.get('sign', '')} {data.get('interpretation', '')[:80]}")
                elif isinstance(data, str):
                    lines.append(f"  • {name}: {data[:80]}")

    if lines:
        return "\n".join(lines)
    return ""


def _add_months(src_date: date, months: int) -> date:
    """Add months to a date while keeping day within target month range."""
    year = src_date.year + (src_date.month - 1 + months) // 12
    month = (src_date.month - 1 + months) % 12 + 1
    day = min(src_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

def _format_month_name(src_date: date) -> str:
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    return month_names[src_date.month - 1]


def _format_date_ymd(src_date: date) -> str:
    return f"{src_date.year:04d}-{src_date.month:02d}-{src_date.day:02d}"


def _count_timing_markers(text: str) -> int:
    if not text:
        return 0
    pattern = re.compile(
        r"(?:\d{1,2}\s*~\s*\d{1,2}\s*월|\d{1,2}\s*월|\d{1,2}\s*주|\d{1,2}/\d{1,2}|"
        r"이번\s*달|다음\s*달|다다음\s*달|이번\s*주|다음\s*주|상반기|하반기)"
    )
    return len({m.group(0) for m in pattern.finditer(text)})


def _has_week_timing(text: str) -> bool:
    if not text:
        return False
    pattern = re.compile(
        r"(?:\d{1,2}\s*월\s*(?:\d{1,2}\s*주|1~2주차|2~3주차|3~4주차|"
        r"첫째주|둘째주|셋째주|넷째주|다섯째주))"
    )
    return bool(pattern.search(text))


def _has_caution(text: str) -> bool:
    if not text:
        return False
    caution_terms = [
        "주의",
        "경고",
        "유의",
        "조심",
        "피하",
        "위험",
        "경계",
    ]
    return any(term in text for term in caution_terms)

def _count_timing_markers_en(text: str) -> int:
    if not text:
        return 0
    pattern = re.compile(
        r"(?:\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*|\bq[1-4]\b|"
        r"\b(?:this|next)\s+(?:week|month|quarter)\b|\bweek\s*\d{1,2}\b|"
        r"\b\d{1,2}(?:st|nd|rd|th)?\s+week\b|\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b)",
        re.IGNORECASE,
    )
    return len({m.group(0).lower() for m in pattern.finditer(text)})

def _has_week_timing_en(text: str) -> bool:
    if not text:
        return False
    pattern = re.compile(
        r"(?:week\s*\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+week)",
        re.IGNORECASE,
    )
    return bool(pattern.search(text))

def _has_caution_en(text: str) -> bool:
    if not text:
        return False
    caution_terms = [
        "caution", "avoid", "watch out", "be careful", "risk", "risky",
        "hold off", "delay", "slow down", "conflict", "friction",
    ]
    lower = text.lower()
    return any(term in lower for term in caution_terms)


def _ensure_ko_prefix(text: str, locale: str) -> str:
    if locale != "ko" or not text:
        return text
    trimmed = text.lstrip(" \t\r\n\"'“”‘’")
    if trimmed.startswith("이야"):
        return trimmed
    return f"이야, {trimmed}"


def _format_korean_spacing(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"([.!?])(?=[가-힣A-Za-z0-9])", r"\1 ", text)
    text = re.sub(r"([,])(?=[가-힣A-Za-z0-9])", r"\1 ", text)
    text = re.sub(r"([가-힣])(\d)", r"\1 \2", text)
    text = re.sub(r"((?:ASC|MC|IC|DC))(\d)", r"\1 \2", text)

    unit_tokens = ("년", "월", "일", "주", "차", "시", "분", "초", "하우스", "대", "세", "살", "개월")

    def _digit_hangul(match: re.Match) -> str:
        digit = match.group(1)
        tail = match.group(2)
        for unit in unit_tokens:
            if tail.startswith(unit):
                return f"{digit}{tail}"
        return f"{digit} {tail}"

    text = re.sub(r"(\d)([가-힣])", _digit_hangul, text)
    text = re.sub(r"(\d)\s*\.\s*(\d)", r"\1.\2", text)
    text = re.sub(r"(\d)\s*,\s*(\d)", r"\1,\2", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"(\d)\s+(년|월|일|주|차|시|분|초|하우스|대|세|살|개월)", r"\1\2", text)
    return text.strip()


def _insert_addendum(text: str, addendum: str) -> str:
    if not addendum:
        return text
    if "\n\n" in text:
        parts = text.split("\n\n")
        insert_idx = max(1, len(parts) - 1)
        parts.insert(insert_idx, addendum)
        return "\n\n".join(parts)
    sentence_ends = [m.end() for m in re.finditer(r"[.!?]", text)]
    if sentence_ends:
        insert_pos = sentence_ends[0] if len(sentence_ends) == 1 else sentence_ends[1]
        prefix = text[:insert_pos]
        suffix = text[insert_pos:].lstrip()
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    if text:
        # Fallback: insert near the middle so evidence lands in-body.
        mid = max(0, len(text) // 2)
        right = text.find(" ", mid)
        left = text.rfind(" ", 0, mid)
        insert_pos = right if right != -1 else left
        if insert_pos > 0:
            prefix = text[:insert_pos]
            suffix = text[insert_pos:].lstrip()
            sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
            return f"{prefix}{sep}{addendum} {suffix}"
    last_question = text.rfind("?")
    if last_question != -1:
        prefix = text[:last_question]
        suffix = text[last_question:]
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    last_period = max(text.rfind("."), text.rfind("!"))
    if last_period != -1:
        prefix = text[:last_period + 1]
        suffix = text[last_period + 1:].lstrip()
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    return f"{text} {addendum}"


def _chunk_text(text: str, chunk_size: int = 200):
    if not text:
        return []
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

def _get_stream_chunk_size() -> int:
    return _get_int_env("ASK_STREAM_CHUNK_SIZE", 200, min_value=80, max_value=800)

def _to_sse_event(text: str) -> str:
    if text is None:
        return ""
    lines = text.splitlines()
    if not lines:
        return "data: \n\n"
    payload = "".join([f"data: {line}\n" for line in lines])
    return payload + "\n"

def _sse_error_response(message: str) -> Response:
    def generate():
        chunk_size = _get_stream_chunk_size()
        for piece in _chunk_text(message or "", chunk_size):
            yield _to_sse_event(piece)
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _has_saju_payload(saju_data: dict) -> bool:
    if not isinstance(saju_data, dict) or not saju_data:
        return False
    if saju_data.get("dayMaster"):
        return True
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    for key in ("pillars", "tenGods", "fiveElements", "dominantElement", "daeun", "unse"):
        if saju_data.get(key) or facts.get(key):
            return True
    return False


def _has_astro_payload(astro_data: dict) -> bool:
    if not isinstance(astro_data, dict) or not astro_data:
        return False
    if astro_data.get("sun") or astro_data.get("moon"):
        return True
    if astro_data.get("planets") or astro_data.get("houses") or astro_data.get("aspects"):
        return True
    if astro_data.get("ascendant") or astro_data.get("asc") or astro_data.get("rising"):
        return True
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    if facts.get("planets") or facts.get("houses") or facts.get("aspects"):
        return True
    return False


def _build_birth_format_message(locale: str) -> str:
    if locale == "ko":
        return "생년월일/시간 형식이 올바르지 않습니다. 예: 1995-02-09, 06:40"
    return "Invalid birth date/time format. Example: 1995-02-09, 06:40"


def _build_missing_payload_message(locale: str, missing_saju: bool, missing_astro: bool) -> str:
    if locale == "ko":
        if missing_saju and missing_astro:
            return (
                "사주/점성학 계산 결과가 누락되었습니다. 프런트에서 computeDestinyMap 결과를 "
                "`saju`와 `astro`로 전달해 주세요. (생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
            )
        if missing_saju:
            return (
                "사주 계산 결과가 누락되었습니다. computeDestinyMap 결과를 `saju`로 전달해 주세요. "
                "(생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
            )
        return (
            "점성학 계산 결과가 누락되었습니다. computeDestinyMap 결과를 `astro`로 전달해 주세요. "
            "(생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
        )
    if missing_saju and missing_astro:
        return (
            "Computed saju/astrology payload is missing. Please pass computeDestinyMap results in `saju` and `astro`. "
            "(This API does not compute advanced charts from birth inputs alone.)"
        )
    if missing_saju:
        return (
            "Computed saju payload is missing. Please pass computeDestinyMap results in `saju`. "
            "(This API does not compute advanced charts from birth inputs alone.)"
        )
    return (
        "Computed astrology payload is missing. Please pass computeDestinyMap results in `astro`. "
        "(This API does not compute advanced charts from birth inputs alone.)"
    )

def _summarize_five_elements(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    five = saju_data.get("fiveElements") or facts.get("fiveElements")
    if not isinstance(five, dict) or not five:
        return ""
    element_map = {
        "wood": "목",
        "fire": "화",
        "earth": "토",
        "metal": "금",
        "water": "수",
    }
    normalized = {}
    for key, value in five.items():
        ko = element_map.get(key, key)
        if isinstance(value, (int, float)):
            normalized[ko] = value
    if not normalized:
        return ""
    max_elem = max(normalized, key=normalized.get)
    min_elem = min(normalized, key=normalized.get)
    if normalized[max_elem] == normalized[min_elem]:
        return "오행은 비교적 고르게 분포된 편이에요"
    return f"오행은 {max_elem} 기운이 강하고 {min_elem} 기운이 약한 편이에요"

def _summarize_five_elements_en(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    five = saju_data.get("fiveElements") or facts.get("fiveElements")
    if not isinstance(five, dict) or not five:
        return ""
    element_map = {
        "wood": "wood",
        "fire": "fire",
        "earth": "earth",
        "metal": "metal",
        "water": "water",
        "목": "wood",
        "화": "fire",
        "토": "earth",
        "금": "metal",
        "수": "water",
        "木": "wood",
        "火": "fire",
        "土": "earth",
        "金": "metal",
        "水": "water",
    }
    normalized = {}
    for key, value in five.items():
        mapped = element_map.get(str(key).lower(), element_map.get(str(key), str(key)))
        if isinstance(value, (int, float)):
            normalized[mapped] = value
    if not normalized:
        return ""
    max_elem = max(normalized, key=normalized.get)
    min_elem = min(normalized, key=normalized.get)
    if normalized[max_elem] == normalized[min_elem]:
        return "Five Elements look fairly balanced."
    return f"Five Elements show strong {max_elem} and weaker {min_elem}."


def _pick_sibsin(saju_data: dict) -> str:
    def _pick_from_pillar(pillar: dict) -> str:
        if not isinstance(pillar, dict):
            return ""
        for key in ("heavenlyStem", "earthlyBranch"):
            val = pillar.get(key) if isinstance(pillar.get(key), dict) else {}
            sibsin = val.get("sibsin")
            if sibsin:
                return sibsin
        sibsin = pillar.get("sibsin")
        if isinstance(sibsin, dict):
            for val in sibsin.values():
                if val:
                    return val
        return ""

    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    for root in (facts, saju_data):
        pillars = root.get("pillars") if isinstance(root.get("pillars"), dict) else {}
        for key in ("day", "month", "year", "time"):
            sibsin = _pick_from_pillar(pillars.get(key))
            if sibsin:
                return sibsin
        for key in ("dayPillar", "monthPillar", "yearPillar", "timePillar"):
            sibsin = _pick_from_pillar(root.get(key))
            if sibsin:
                return sibsin
    return ""


def _planet_ko_name(name: str) -> str:
    if not name:
        return ""
    planet_map = {
        "sun": "태양",
        "moon": "달",
        "mercury": "수성",
        "venus": "금성",
        "mars": "화성",
        "jupiter": "목성",
        "saturn": "토성",
        "uranus": "천왕성",
        "neptune": "해왕성",
        "pluto": "명왕성",
    }
    return planet_map.get(name.lower(), name)

def _planet_en_name(name: str) -> str:
    if not name:
        return ""
    planet_map = {
        "sun": "Sun",
        "moon": "Moon",
        "mercury": "Mercury",
        "venus": "Venus",
        "mars": "Mars",
        "jupiter": "Jupiter",
        "saturn": "Saturn",
        "uranus": "Uranus",
        "neptune": "Neptune",
        "pluto": "Pluto",
    }
    return planet_map.get(name.lower(), name)


def _pick_any_planet(astro_data: dict):
    for key in ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"):
        hit = _pick_astro_planet(astro_data, key)
        if hit:
            return hit
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    for source in (astro_data.get("planets"), facts.get("planets")):
        if isinstance(source, list):
            for planet in source:
                if isinstance(planet, dict) and planet.get("name"):
                    return planet
    return None


def _build_saju_evidence_sentence(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    dm = saju_data.get("dayMaster") or facts.get("dayMaster") or {}
    dm_name = dm.get("heavenlyStem") or dm.get("name")
    dm_element = dm.get("element")

    pillars = saju_data.get("pillars") if isinstance(saju_data.get("pillars"), dict) else facts.get("pillars", {})
    month_pillar = None
    if isinstance(pillars, dict):
        month_pillar = pillars.get("month")
    if isinstance(month_pillar, dict):
        hs = month_pillar.get("heavenlyStem", {})
        eb = month_pillar.get("earthlyBranch", {})
        month_name = f"{hs.get('name', '')}{eb.get('name', '')}".strip()
    else:
        month_name = ""

    dm_text = ""
    if dm_name or dm_element:
        dm_text = f"{dm_name}" if dm_name else ""
        if dm_element:
            dm_text = f"{dm_text}({dm_element})" if dm_text else f"{dm_element}"

    element_summary = _summarize_five_elements(saju_data)
    sibsin = _pick_sibsin(saju_data)

    parts = []
    if dm_text:
        parts.append(f"일간 {dm_text} 흐름이 있고")
    if element_summary:
        parts.append(element_summary)
    else:
        parts.append("오행 균형은 추가 확인이 필요해요")
    if sibsin:
        parts.append(f"십성은 {sibsin} 기운이 도드라져요")
    else:
        parts.append("십성 흐름은 추가 확인이 필요해요")
    if parts:
        return "사주에서는 " + ", ".join(parts) + "."
    if month_name:
        return f"사주로 보면 월주 {month_name} 흐름이 있어서 안정과 확장의 균형을 자주 고민하게 되는 편이에요."
    return ""

def _build_saju_evidence_sentence_en(saju_data: dict) -> str:
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    dm = saju_data.get("dayMaster") or facts.get("dayMaster") or {}
    dm_name = dm.get("heavenlyStem") or dm.get("name")
    dm_element = dm.get("element")
    element_map = {
        "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
        "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
        "wood": "wood", "fire": "fire", "earth": "earth", "metal": "metal", "water": "water",
    }
    dm_element_en = element_map.get(str(dm_element), dm_element) if dm_element else ""
    dm_text = ""
    if dm_name or dm_element_en:
        dm_text = f"{dm_name}" if dm_name else ""
        if dm_element_en:
            dm_text = f"{dm_text} ({dm_element_en})" if dm_text else f"{dm_element_en}"

    element_summary = _summarize_five_elements_en(saju_data)
    sibsin = _pick_sibsin(saju_data)

    parts = []
    if dm_text:
        parts.append(f"your Day Master is {dm_text}")
    if element_summary:
        parts.append(element_summary.rstrip("."))
    else:
        parts.append("Five Elements balance needs a closer check")
    if sibsin:
        parts.append(f"Ten Gods emphasize {sibsin}")
    else:
        parts.append("Ten Gods emphasis needs confirmation")
    return "From your Four Pillars, " + ", ".join(parts) + "."


def _build_astro_evidence_sentence(astro_data: dict) -> str:
    planet = _pick_astro_planet(astro_data, "sun") or _pick_astro_planet(astro_data, "moon") or _pick_any_planet(astro_data)
    asc = _pick_ascendant(astro_data)
    aspect = _pick_astro_aspect(astro_data)

    aspect_text = ""
    if isinstance(aspect, dict):
        aspect_map = {
            "trine": "트라인",
            "square": "스퀘어",
            "conjunction": "컨정션",
            "opposition": "옵포지션",
            "sextile": "섹스타일",
        }
        from_name = _planet_ko_name(str(aspect.get("from", {}).get("name", "")))
        to_name = _planet_ko_name(str(aspect.get("to", {}).get("name", "")))
        aspect_type = aspect_map.get(str(aspect.get("type", "")).lower(), aspect.get("type", ""))
        if from_name and to_name and aspect_type:
            aspect_text = f"{from_name}-{to_name} {aspect_type} 각"

    if planet:
        planet_name = _planet_ko_name(str(planet.get("name", ""))) or "주요"
        sign = planet.get("sign", "")
        house = planet.get("house")
        house_text = f"{house}하우스" if house else "하우스"
        position_text = f"{sign} {house_text}".strip()
        aspect_clause = f", {aspect_text}이 있어" if aspect_text else ""
        return f"점성에서는 {planet_name}이라는 행성이 {position_text}에 있고{aspect_clause} 흐름이 보여요."
    if asc:
        sign = asc.get("sign", "")
        return f"점성에서는 행성 데이터가 제한적이지만 상승점이 {sign}이고 하우스 축이 분명해 행동 방식이 또렷하게 보이는 편이에요."
    return ""

def _build_astro_evidence_sentence_en(astro_data: dict) -> str:
    planet = _pick_astro_planet(astro_data, "sun") or _pick_astro_planet(astro_data, "moon") or _pick_any_planet(astro_data)
    asc = _pick_ascendant(astro_data)
    aspect = _pick_astro_aspect(astro_data)

    aspect_text = ""
    if isinstance(aspect, dict):
        aspect_map = {
            "trine": "trine",
            "square": "square",
            "conjunction": "conjunction",
            "opposition": "opposition",
            "sextile": "sextile",
        }
        from_name = _planet_en_name(str(aspect.get("from", {}).get("name", "")))
        to_name = _planet_en_name(str(aspect.get("to", {}).get("name", "")))
        aspect_type = aspect_map.get(str(aspect.get("type", "")).lower(), aspect.get("type", ""))
        if from_name and to_name and aspect_type:
            aspect_text = f"{from_name}-{to_name} {aspect_type}"

    if planet:
        planet_name = _planet_en_name(str(planet.get("name", ""))) or "a key planet"
        sign = planet.get("sign", "")
        house = planet.get("house")
        house_text = f"{house}th house" if house else "a house placement"
        position_text = f"{sign} {house_text}".strip()
        aspect_clause = f", with a {aspect_text} aspect" if aspect_text else ""
        return f"In your chart, {planet_name} in {position_text}{aspect_clause} shows up as a clear influence."
    if asc:
        sign = asc.get("sign", "")
        return f"Your Ascendant in {sign} sets a clear outer persona even when other planetary data is limited."
    return "Astrology data is limited, but keep the Sun/Moon and house axis as anchors for guidance."


def _build_missing_requirements_addendum(
    text: str,
    locale: str,
    saju_data: dict,
    astro_data: dict,
    now_date: date,
    require_saju: bool = True,
    require_astro: bool = True,
    require_timing: bool = True,
    require_caution: bool = True,
) -> str:
    if not text:
        return ""

    if locale == "ko":
        saju_tokens = [
            "일간", "오행", "십성", "대운", "세운", "월주", "일주", "년주", "시주",
            "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
        ]
        dm = (saju_data.get("dayMaster") or {}).get("name")
        dm_element = (saju_data.get("dayMaster") or {}).get("element")
        if dm:
            saju_tokens.append(str(dm))
        if dm_element:
            saju_tokens.append(str(dm_element))
        has_saju = any(token and token in text for token in saju_tokens)
        has_saju_required = "오행" in text and "십성" in text

        astro_tokens = ["태양", "달", "ASC", "상승", "행성", "하우스", "수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성"]
        sun = _pick_astro_planet(astro_data, "sun")
        moon = _pick_astro_planet(astro_data, "moon")
        asc = _pick_ascendant(astro_data)
        for p in (sun, moon, asc):
            if p and p.get("sign"):
                astro_tokens.append(str(p.get("sign")))
        has_astro = any(token and token in text for token in astro_tokens)
        has_astro_required = "행성" in text and "하우스" in text

        timing_count = _count_timing_markers(text)
        has_week_timing = _has_week_timing(text)
        has_caution = _has_caution(text)

        add_parts = []
        if require_saju and (not has_saju or not has_saju_required):
            saju_sentence = _build_saju_evidence_sentence(saju_data)
            if saju_sentence:
                add_parts.append(saju_sentence)
        if require_astro and (not has_astro or not has_astro_required):
            astro_sentence = _build_astro_evidence_sentence(astro_data)
            if astro_sentence:
                add_parts.append(astro_sentence)
        if require_timing and (timing_count < 2 or not has_week_timing):
            m1 = _add_months(now_date, 1)
            m2 = _add_months(now_date, 3)
            m3 = _add_months(now_date, 5)
            timing_sentence = (
                f"타이밍은 {m1.year}년 {m1.month}월 1~2주차, "
                f"{m2.year}년 {m2.month}월 2~3주차, "
                f"{m3.year}년 {m3.month}월 3~4주차 흐름을 중심으로 보면 좋아요."
            )
            add_parts.append(timing_sentence)
        if require_caution and not has_caution:
            m2 = _add_months(now_date, 3)
            add_parts.append(
                f"\uC8FC\uC758: {m2.year}\uB144 {m2.month}\uC6D4 2~3\uC8FC\uCC28\uCBE4\uC740 \uC911\uC694\uD55C \uACB0\uC815\uC744 \uBB34\uB9AC\uD558\uAC8C \uBC00\uC5B4\uBD99\uC774\uAE30\uBCF4\uB2E4\uB294 \uD55C \uD15C\uD3EC \uC810\uAC80\uD558\uB294 \uAC8C \uC88B\uC544 \uBCF4\uC5EC\uC694."
            )

        return " ".join([part for part in add_parts if part]).strip()

    lower = text.lower()
    saju_tokens_en = [
        "day master", "five elements", "ten gods", "daeun", "seun",
        "year pillar", "month pillar", "day pillar", "hour pillar", "four pillars",
    ]
    has_saju = any(token in lower for token in saju_tokens_en)
    has_saju_required = "five elements" in lower and "ten gods" in lower

    astro_tokens_en = [
        "sun", "moon", "ascendant", "rising", "house", "planet", "aspect", "transit",
    ]
    has_astro = any(token in lower for token in astro_tokens_en)
    has_astro_required = "planet" in lower and "house" in lower

    timing_count = _count_timing_markers_en(text)
    has_week_timing = _has_week_timing_en(text)
    has_caution = _has_caution_en(text)

    add_parts = []
    if require_saju and (not has_saju or not has_saju_required):
        saju_sentence = _build_saju_evidence_sentence_en(saju_data)
        if saju_sentence:
            add_parts.append(saju_sentence)
    if require_astro and (not has_astro or not has_astro_required):
        astro_sentence = _build_astro_evidence_sentence_en(astro_data)
        if astro_sentence:
            add_parts.append(astro_sentence)
    if require_timing and (timing_count < 2 or not has_week_timing):
        m1 = _add_months(now_date, 1)
        m2 = _add_months(now_date, 3)
        m3 = _add_months(now_date, 5)
        timing_sentence = (
            f"Timing: focus on {_format_month_name(m1)} weeks 1-2, "
            f"{_format_month_name(m2)} weeks 2-3, and "
            f"{_format_month_name(m3)} weeks 3-4 for key moves."
        )
        add_parts.append(timing_sentence)
    if require_caution and not has_caution:
        m2 = _add_months(now_date, 3)
        add_parts.append(
            f"Caution: around {_format_month_name(m2)} weeks 2-3, avoid rushing decisions and double-check details."
        )

    return " ".join([part for part in add_parts if part]).strip()


def _is_truthy(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return False


def _bool_env(name: str) -> bool:
    return _is_truthy(os.getenv(name, ""))


def _build_rag_debug_addendum(meta: dict, locale: str) -> str:
    if not isinstance(meta, dict) or not meta.get("enabled"):
        return ""

    theme = meta.get("theme", "")
    question = meta.get("question", "")
    graph_nodes = meta.get("graph_nodes", 0)
    corpus_quotes = meta.get("corpus_quotes", 0)
    persona_jung = meta.get("persona_jung", 0)
    persona_stoic = meta.get("persona_stoic", 0)
    cross_analysis = "on" if meta.get("cross_analysis") else "off"
    theme_fusion = "on" if meta.get("theme_fusion") else "off"
    lifespan = "on" if meta.get("lifespan") else "off"
    therapeutic = "on" if meta.get("therapeutic") else "off"

    model = meta.get("model", "")
    temperature = meta.get("temperature", "")
    ab_variant = meta.get("ab_variant", "")

    if locale == "ko":
        return (
            f"[RAG 근거 태그] theme={theme} | q=\"{question}\" | graph={graph_nodes} | "
            f"corpus={corpus_quotes} | persona={persona_jung + persona_stoic} | cross={cross_analysis} | fusion={theme_fusion}\n"
            f"[RAG 요약] graph_nodes={graph_nodes}; corpus_quotes={corpus_quotes}; "
            f"persona_jung={persona_jung}; persona_stoic={persona_stoic}; "
            f"cross_analysis={cross_analysis}; theme_fusion={theme_fusion}; "
            f"lifespan={lifespan}; therapeutic={therapeutic}; model={model}; temp={temperature}; ab={ab_variant}\n"
        )

    return (
        f"[RAG Evidence Tags] theme={theme} | q=\"{question}\" | graph={graph_nodes} | "
        f"corpus={corpus_quotes} | persona={persona_jung + persona_stoic} | cross={cross_analysis} | fusion={theme_fusion}\n"
        f"[RAG Summary] graph_nodes={graph_nodes}; corpus_quotes={corpus_quotes}; "
        f"persona_jung={persona_jung}; persona_stoic={persona_stoic}; "
        f"cross_analysis={cross_analysis}; theme_fusion={theme_fusion}; "
        f"lifespan={lifespan}; therapeutic={therapeutic}; model={model}; temp={temperature}; ab={ab_variant}\n"
    )


def _coerce_float(value: object, default: Optional[float] = None) -> Optional[float]:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: object, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _get_int_env(name: str, default: int, min_value: int = 1, max_value: int = 16000) -> int:
    raw = _coerce_int(os.getenv(name), default)
    if raw is None:
        return default
    return max(min_value, min(max_value, raw))


def _clamp_temperature(value: Optional[float], default: float = 0.75) -> float:
    if value is None:
        return default
    return max(0.0, min(2.0, value))


def _select_model_and_temperature(
    data: dict,
    default_model: str,
    default_temp: float,
    session_id: Optional[str],
    request_id: str,
) -> Tuple[str, float, str]:
    model = data.get("model") or data.get("model_name") or default_model
    temperature = _clamp_temperature(_coerce_float(data.get("temperature")), default_temp)

    ab_variant = str(data.get("ab_variant") or "").strip().upper()
    if not ab_variant and _bool_env("RAG_AB_MODE"):
        seed = session_id or request_id or ""
        ab_variant = "A" if (sum(ord(c) for c in seed) % 2 == 0) else "B"

    if ab_variant in ("A", "B"):
        model = os.getenv(f"RAG_AB_MODEL_{ab_variant}") or model
        temperature = _clamp_temperature(
            _coerce_float(os.getenv(f"RAG_AB_TEMP_{ab_variant}")),
            temperature,
        )
    else:
        ab_variant = ""

    return model, temperature, ab_variant


# Health check
def index():
    return jsonify({"status": "ok", "message": "DestinyPal Fusion AI backend is running!"})


# Fusion endpoint with caching and performance optimization
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

        # Input validation - check for suspicious patterns
        if is_suspicious_input(raw_prompt):
            logger.warning(f"[ASK] Suspicious input detected: {raw_prompt[:100]}...")

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

        # Detect structured JSON prompts from frontend (these contain format instructions)
        is_structured_prompt = (
            "You MUST return a valid JSON object" in raw_prompt or
            '"lifeTimeline"' in raw_prompt or
            '"categoryAnalysis"' in raw_prompt
        )
        # Allow full prompt for structured requests, otherwise sanitize and clamp
        prompt = raw_prompt if is_structured_prompt else sanitize_user_input(raw_prompt, max_length=500)
        if is_structured_prompt:
            logger.info(f"[ASK] Detected STRUCTURED JSON prompt (len={len(raw_prompt)})")

        # render_mode: "template" (AI 없이 즉시) or "gpt" (AI 사용)
        render_mode = data.get("render_mode", "gpt")
        logger.info(f"[ASK] id={g.request_id} theme={theme} locale={locale} render_mode={render_mode}")

        # DEBUG: Log saju.unse data received from frontend
        unse_data = saju_data.get("unse", {})
        logger.info(f"[ASK] saju.unse received: daeun={len(unse_data.get('daeun', []))}, annual={len(unse_data.get('annual', []))}")

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
        advanced_astro = data.get("advanced_astro") or {}  # Advanced astrology features
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "chat")
        locale = data.get("locale", "en")
        raw_prompt = data.get("prompt") or ""
        session_id = data.get("session_id")  # Optional: use pre-fetched RAG data
        conversation_history = data.get("history") or []  # Previous messages for context
        user_context = data.get("user_context") or {}  # Premium: persona + session summaries
        cv_text = (data.get("cv_text") or "")[:4000]  # CV/Resume text for career consultations

        # Input validation - sanitize user prompt
        if is_suspicious_input(raw_prompt):
            logger.warning(f"[ASK-STREAM] Suspicious input detected: {raw_prompt[:100]}...")

        # Detect if frontend already sent a fully structured prompt (from chat-stream/route.ts)
        # This includes system prompt, saju/astro data, and advanced analysis
        is_frontend_structured = (
            "당신은 따뜻하고 전문적인 운명 상담사" in raw_prompt or
            "You are a warm, professional destiny counselor" in raw_prompt or
            "[사주/점성 기본 데이터]" in raw_prompt or
            "★★★ 핵심 규칙 ★★★" in raw_prompt
        )

        prompt = sanitize_user_input(raw_prompt, max_length=8000 if is_frontend_structured else 1500, allow_newlines=True)

        debug_rag = _is_truthy(data.get("debug_rag")) or _bool_env("RAG_DEBUG_RESPONSE")
        debug_log = _is_truthy(data.get("debug_log")) or _bool_env("RAG_DEBUG_LOG") or debug_rag

        current_user_question = ""
        if "질문:" in prompt:
            current_user_question = prompt.split("질문:")[-1].strip()[:500]
        elif "Q:" in prompt:
            current_user_question = prompt.split("Q:")[-1].strip()[:500]
        else:
            current_user_question = prompt[-500:] if prompt else ""

        if is_frontend_structured:
            logger.info(f"[ASK-STREAM] Detected STRUCTURED frontend prompt (len={len(raw_prompt)})")

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

        logger.info(f"[ASK-STREAM] id={g.request_id} theme={theme} locale={locale} session={session_id or 'none'} history_len={len(conversation_history)} has_user_ctx={bool(user_context)} cv_len={len(cv_text)}")
        logger.info(f"[ASK-STREAM] saju dayMaster: {saju_data.get('dayMaster', {})}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        session_rag_data = {}
        persona_context = {}
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
                session_rag_data = rag_data

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
                persona_context = rag_data.get("persona_context", {})
                if persona_context.get("jung"):
                    rag_context += "\n[🧠 분석가 관점]\n"
                    rag_context += "\n".join(f"• {i}" for i in persona_context["jung"][:3])
                if persona_context.get("stoic"):
                    rag_context += "\n\n[⚔️ 스토아 철학 관점]\n"
                    rag_context += "\n".join(f"• {i}" for i in persona_context["stoic"][:3])

                logger.info(f"[ASK-STREAM] RAG context from session: {len(rag_context)} chars")
            else:
                logger.warning(f"[ASK-STREAM] Session {session_id} not found or expired")

        allow_birth_compute = _bool_env("ALLOW_BIRTH_ONLY")
        if allow_birth_compute and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
                logger.info(f"[ASK-STREAM] Computed simple saju from birth: {saju_data.get('dayMaster', {})}")
            except Exception as e:
                logger.warning(f"[ASK-STREAM] Failed to compute simple saju: {e}")

        has_saju_payload = _has_saju_payload(saju_data)
        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and (not has_saju_payload or not has_astro_payload):
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[ASK-STREAM] Invalid birth format for missing payload")
                    return _sse_error_response(_build_birth_format_message(locale))
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=not has_saju_payload,
                missing_astro=not has_astro_payload,
            )
            logger.warning("[ASK-STREAM] Missing computed payload(s)")
            return _sse_error_response(missing_message)

        # Build DETAILED chart context (not just summary)
        saju_detail = _build_detailed_saju(saju_data)
        astro_detail = _build_detailed_astro(astro_data)
        advanced_astro_detail = _build_advanced_astro_context(advanced_astro)
        logger.info(f"[ASK-STREAM] saju_detail length: {len(saju_detail)}")
        logger.info(f"[ASK-STREAM] astro_detail length: {len(astro_detail)}")
        if advanced_astro_detail:
            logger.info(f"[ASK-STREAM] advanced_astro_detail length: {len(advanced_astro_detail)}")

        # Get cross-analysis (from session or instant lookup)
        cross_rules = ""
        if session_cache and session_cache.get("rag_data", {}).get("cross_analysis"):
            cross_rules = session_cache["rag_data"]["cross_analysis"]
        else:
            try:
                cross_rules = get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
                if cross_rules:
                    logger.info(f"[ASK-STREAM] Instant cross-analysis: {len(cross_rules)} chars, theme={theme}")
            except Exception as e:
                logger.warning(f"[ASK-STREAM] Cross-analysis lookup failed: {e}")

        # Get Jung/Stoic insights if not from session (instant lookup)
        instant_quotes = []
        if not rag_context and HAS_CORPUS_RAG:
            try:
                _corpus_rag_inst = get_corpus_rag()
                if _corpus_rag_inst:
                    # Build query from user context
                    theme_concepts = {
                        "career": "vocation calling purpose 소명 직업 자아실현",
                        "love": "anima animus relationship 관계 사랑 그림자",
                        "health": "healing wholeness 치유 통합",
                        "life_path": "individuation meaning 개성화 의미 성장",
                        "family": "complex archetype 콤플렉스 원형 가족",
                    }
                    jung_query = f"{theme_concepts.get(theme, theme)} {prompt[:50] if prompt else ''}"
                    quotes = _corpus_rag_inst.search(jung_query, top_k=3, min_score=0.15)
                    if quotes:
                        instant_quotes = quotes
                        rag_context += "\n\n[📚 융 심리학 통찰]\n"
                        for q in quotes[:2]:
                            quote_text = q.get('quote_kr') or q.get('quote_en', '')
                            if quote_text:
                                rag_context += f"• \"{quote_text[:150]}...\" — 칼 융, {q.get('source', '')}\n"
                        logger.info(f"[ASK-STREAM] Instant Jung quotes: {len(quotes)} found")
            except Exception as e:
                logger.debug(f"[ASK-STREAM] Instant Jung quotes failed: {e}")

        # Build cross-analysis section
        cross_section = ""
        if cross_rules:
            cross_section = f"\n[사주+점성 교차 해석 규칙]\n{cross_rules}\n"

        # Current date for time-relevant advice
        now = datetime.now()
        today_date = now.date()
        six_month_date = _add_months(today_date, 6)
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"
        timing_window_str = (
            f"타이밍 기준: {_format_date_ymd(today_date)} ~ {_format_date_ymd(six_month_date)}"
            if locale == "ko"
            else f"Timing window: {_format_date_ymd(today_date)} to {_format_date_ymd(six_month_date)}"
        )

        # Build user context section for returning users (premium feature)
        user_context_section = ""
        if user_context:
            persona = user_context.get("persona", {})
            recent_sessions = user_context.get("recentSessions", [])
            personality_type = user_context.get("personalityType", {})

            # Nova Personality Type (from personality quiz)
            if personality_type.get("typeCode"):
                type_code = personality_type["typeCode"]
                type_name = personality_type.get("personaName", "")
                user_context_section = f"\n[🎭 사용자 성격 유형: {type_code}]\n"
                if type_name:
                    user_context_section += f"• 유형명: {type_name}\n"

                # Lookup archetype details for counseling approach
                archetype_hints = {
                    "RVLA": "전략적 관점에서 조언. 큰 그림과 실행 계획 제시. 직접적 소통 선호.",
                    "RVLF": "다양한 옵션과 가능성 제시. 실험적 접근 권장. 창의적 해결책 탐색.",
                    "RVHA": "비전과 의미 연결. 스토리텔링 활용. 동기부여 중심 조언.",
                    "RVHF": "영감과 새로운 관점 제시. 사회적 연결 강조. 열정적 소통.",
                    "RSLA": "명확한 단계별 실행 계획 제시. 책임과 결과 강조. 효율적 조언.",
                    "RSLF": "즉각적이고 실용적인 해결책. 현장 감각 활용. 위기 대응 관점.",
                    "RSHA": "관계와 성장 중심. 따뜻하면서도 체계적. 안정적 환경 강조.",
                    "RSHF": "참여와 소통 중심. 다양한 관점 포용. 함께하는 해결.",
                    "GVLA": "근본 원인 분석. 장기적 관점. 체계적이고 깊은 해결책.",
                    "GVLF": "데이터와 증거 기반 접근. 체계적 분석. 패턴 활용.",
                    "GVHA": "성장과 발전 중심. 장기적 관계. 멘토링 관점.",
                    "GVHF": "의미와 목적 연결. 깊은 질문. 진정성 있는 대화.",
                    "GSLA": "단계별 검증된 방법 권장. 안정적 실행 지원. 리스크 관리.",
                    "GSLF": "문제를 작게 분해. 하나씩 체계적 해결. 정밀한 접근.",
                    "GSHA": "안정과 신뢰 기반. 점진적 변화 권장. 꾸준한 지원.",
                    "GSHF": "갈등 해소와 조화 중심. 경청과 중재. 부드러운 접근.",
                }
                if type_code in archetype_hints:
                    user_context_section += f"• 상담 스타일: {archetype_hints[type_code]}\n"

                user_context_section += "\n→ 이 사용자의 성격 유형에 맞게 소통 스타일을 조절하세요.\n"
                logger.info(f"[ASK-STREAM] Personality type: {type_code}")

            if persona.get("sessionCount", 0) > 0 or recent_sessions:
                if not user_context_section:
                    user_context_section = "\n[🔄 이전 상담 맥락]\n"
                else:
                    user_context_section += "\n[🔄 이전 상담 맥락]\n"

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

        # Build CV/Resume section - use CV whenever available (for career, life_path, chat themes)
        cv_section = ""
        if cv_text:
            cv_section = f"""
[📄 사용자 이력서/CV]
{cv_text}

→ 위 이력서 내용을 참고하여 사용자의 경력, 기술, 경험에 맞는 구체적인 조언을 제공하세요.
→ 사주/점성 해석과 이력서 내용을 연결하여 개인화된 조언을 해주세요.
→ 커리어, 직업, 적성 관련 질문에는 이력서 정보를 적극 활용하세요.
"""
            logger.info(f"[ASK-STREAM] CV section added: {len(cv_text)} chars, theme={theme}")

        # ======================================================
        # 🌱 LIFESPAN GUIDANCE - Age-appropriate psychological tasks
        # ======================================================
        lifespan_section = ""
        birth_year = None
        try:
            # Extract birth year from birth_data or saju_data
            if birth_data.get("date"):
                birth_year = int(birth_data["date"].split("-")[0])
            elif saju_data.get("birthYear"):
                birth_year = int(saju_data["birthYear"])
        except (ValueError, KeyError, TypeError, AttributeError):
            pass

        if birth_year:
            lifespan_guidance = get_lifespan_guidance(birth_year)
            if lifespan_guidance and lifespan_guidance.get("stage_name"):
                stage = lifespan_guidance
                lifespan_section = f"""
[🌱 생애주기별 심리 과제: {stage['stage_name']} ({stage['age']}세)]
• 발달 과제: {', '.join(stage.get('psychological_tasks', [])[:3])}
• 핵심 원형: {stage.get('archetypal_themes', {}).get('primary', [''])[0] if isinstance(stage.get('archetypal_themes', {}).get('primary'), list) else ''}
• 흔한 위기: {', '.join(stage.get('developmental_crises', stage.get('shadow_challenges', []))[:2])}
• 사주 연결: {stage.get('saju_parallel', {}).get('theme', '')}
• 점성 연결: {stage.get('astro_parallel', {}).get('theme', '')}

→ 이 생애 단계에 맞는 조언을 해주세요. 나이에 맞지 않는 조언(예: 20대에게 '은퇴 준비')은 피하세요.
"""
                logger.info(f"[ASK-STREAM] Lifespan guidance: {stage['stage_name']} (age {stage['age']})")

        # ======================================================
        # 🎯 THEME FUSION RULES - Daily/Monthly/Yearly guidance
        # ======================================================
        theme_fusion_section = ""
        try:
            theme_fusion = get_theme_fusion_rules(saju_data, astro_data, theme, locale, birth_year)
            if theme_fusion:
                theme_fusion_section = f"""
[🎯 테마별 융합 해석]
{theme_fusion}

→ 위 테마별 해석을 상담 내용에 자연스럽게 녹여서 전달하세요.
"""
                logger.info(f"[ASK-STREAM] Theme fusion rules added: {len(theme_fusion)} chars, theme={theme}")
        except Exception as e:
            logger.warning(f"[ASK-STREAM] Theme fusion rules failed: {e}")

        # ======================================================
        # 🎨 ACTIVE IMAGINATION - Deep therapeutic prompts (optional)
        # ======================================================
        imagination_section = ""
        if prompt and any(k in prompt.lower() for k in ["깊이", "내면", "무의식", "그림자", "명상", "상상"]):
            ai_prompts = get_active_imagination_prompts(prompt)
            if ai_prompts:
                imagination_section = f"""
[🎨 적극적 상상 기법 - 심층 작업용]
• 시작 질문: {ai_prompts.get('opening', [''])[0] if ai_prompts.get('opening') else ''}
• 심화 질문: {ai_prompts.get('deepening', [''])[0] if ai_prompts.get('deepening') else ''}
• 통합 질문: {ai_prompts.get('integration', [''])[0] if ai_prompts.get('integration') else ''}

→ 사용자가 깊은 내면 작업을 원할 때만 이 질문들을 활용하세요. 강요하지 마세요.
"""
                logger.info(f"[ASK-STREAM] Active imagination prompts added")

        # ======================================================
        # 🚨 CRISIS DETECTION - Check for dangerous keywords
        # Only check the CURRENT user question, not history (to avoid false positives)
        # ======================================================
        crisis_response = None
        crisis_check = {"is_crisis": False, "max_severity": "none", "requires_immediate_action": False}
        if HAS_COUNSELING and current_user_question:
            crisis_check = CrisisDetector.detect_crisis(current_user_question)
            if crisis_check["is_crisis"]:
                logger.warning(f"[ASK-STREAM] Crisis detected! severity={crisis_check['max_severity']}")
                crisis_response = CrisisDetector.get_crisis_response(
                    crisis_check["max_severity"],
                    locale=locale
                )
                if crisis_check["requires_immediate_action"]:
                    # Return safety response immediately via SSE
                    def crisis_generator():
                        msg = crisis_response.get("immediate_message", "")
                        if crisis_response.get("follow_up"):
                            msg += "\n\n" + crisis_response["follow_up"]
                        if crisis_response.get("closing"):
                            msg += "\n\n" + crisis_response["closing"]
                        yield f"data: {msg}\n\n"
                        yield "data: [DONE]\n\n"

                    return Response(
                        stream_with_context(crisis_generator()),
                        mimetype="text/event-stream",
                        headers={
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "X-Accel-Buffering": "no",
                        }
                    )

        # Build crisis context for medium/medium_high severity (not immediate, but needs empathetic response)
        crisis_context_section = ""
        if crisis_response and not crisis_check.get("requires_immediate_action"):
            severity = crisis_check.get("max_severity", "")
            if severity == "medium_high":
                crisis_context_section = """
[⚠️ 사용자 감정 상태: 높은 스트레스]
- 공감과 안정감을 주는 톤으로 응답하세요
- 먼저 감정을 인정하고 호흡/그라운딩 기법을 안내하세요
- 점술 해석은 희망적인 관점으로 부드럽게 전달하세요
- 필요시 전문 상담 권유: 정신건강위기상담전화 1577-0199
"""
            elif severity == "medium":
                crisis_context_section = """
[⚠️ 사용자 감정 상태: 희망 저하]
- 공감과 따뜻함을 담아 응답하세요
- 작은 희망이라도 찾을 수 있도록 도와주세요
- 점술 해석에서 긍정적 가능성을 강조하세요
- "혼자가 아니에요"라는 메시지를 자연스럽게 전달하세요
"""
            logger.info(f"[ASK-STREAM] Added crisis context for severity={severity}")

        # Build therapeutic context based on question type - ENHANCED with Jung psychology
        therapeutic_section = ""
        if HAS_COUNSELING and prompt:
            prompt_lower = prompt.lower()
            # Detect question themes and add therapeutic guidance
            if any(k in prompt_lower for k in ["힘들", "우울", "지쳐", "포기", "의미없", "허무"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 의미/정서 지지]
- 먼저 감정을 충분히 인정: "정말 힘드셨겠어요... 그 무게를 혼자 지고 계셨군요"
- 융 관점: "영혼의 어두운 밤(dark night of soul)"은 변화의 전조
- 사주/점성에서 '전환점'이나 '성장기'를 찾아 희망 연결
- 그림자 작업: "이 힘듦이 당신에게 가르치려는 게 있다면?"
- 작은 액션 제안: "오늘 하나만 자신을 위해 한다면 뭘 하고 싶으세요?"
"""
            elif any(k in prompt_lower for k in ["연애", "사랑", "결혼", "이별", "짝사랑", "썸"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 관계/사랑]
- 감정의 깊이를 인정: "마음이 많이 쓰이시네요"
- 융 관점 - 아니마/아니무스 투사: "끌리는 그 특성이 혹시 내 안에도 있다면?"
- 그림자 투사: "싫은 그 점... 내 그림자는 아닐까요?"
- 사주 관성(官星)/점성 금성-7하우스 해석을 심리적 패턴과 연결
- 질문으로 마무리: "상대에게 진짜 원하는 건 뭘까요?" / "완벽한 관계란 어떤 모습이에요?"
"""
            elif any(k in prompt_lower for k in ["취업", "이직", "진로", "사업", "퇴사", "커리어"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 커리어/정체성]
- 불안감 인정: "중요한 결정 앞에서 고민이 깊으시네요"
- 융 관점 - 소명(calling): "돈을 떠나서, 진짜 하고 싶은 일은 뭐예요?"
- 페르소나 vs 자기(Self): "일하는 나 vs 진짜 나, 얼마나 다른가요?"
- 사주 식상/재성과 점성 10하우스/MC 연결하여 적성 분석
- 구체적 시기 제시: "2025년 상반기가 전환점" 식으로
- 질문: "돈 vs 보람, 지금 더 중요한 건?" / "5년 뒤 어떤 모습이고 싶으세요?"
"""
            elif any(k in prompt_lower for k in ["부모", "엄마", "아빠", "가족", "형제", "자매"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 가족/콤플렉스]
- 가족 관계의 복잡함 인정: "가족이라 더 어렵죠"
- 융 관점 - 부모 콤플렉스: 어머니/아버지 원형이 현재 관계에 미치는 영향
- 내면아이 작업: "어린 시절의 나에게 뭐라고 말해주고 싶으세요?"
- 사주 인성(印星)/관성(官星)과 4하우스/10하우스 분석
- 질문: "부모님께 진짜 하고 싶은 말은?" / "용서가 필요한 건 누구인가요?"
"""
            elif any(k in prompt_lower for k in ["불안", "걱정", "두려", "무서"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 불안/두려움]
- 불안 인정: "불안한 마음, 충분히 이해해요"
- 융 관점: 두려움은 그림자가 보내는 메시지일 수 있음
- 그라운딩: "지금 발이 바닥에 닿아있는 걸 느껴보세요"
- 질문: "그 두려움이 사람이라면, 뭐라고 말할 것 같아요?"
- 사주/점성에서 안정감을 줄 수 있는 시기나 요소 찾기
"""
            elif any(k in prompt_lower for k in ["성격", "나는", "어떤 사람", "장점", "단점"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 자기탐색]
- 호기심 표현: "자신을 알고 싶은 마음이 멋지네요"
- 융 관점 - 페르소나/그림자: 보여주는 나 vs 숨기는 나
- 사주 일간 특성과 점성 태양/상승/달 연결하여 다층적 성격 분석
- 그림자(약점)도 성장 가능성으로 재해석: "그 점이 건강하게 발휘되면?"
- 질문: "가장 '나답다'고 느낄 때는?" / "남들은 모르는 나만의 모습이 있다면?"
"""
            elif any(k in prompt_lower for k in ["꿈", "악몽", "꿈에서", "꿈을 꿨"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 꿈 해석]
- 호기심 표현: "흥미로운 꿈이네요. 무의식이 메시지를 보내고 있어요"
- 융 관점 - 꿈은 무의식의 언어: 상징적 의미 탐색
- 꿈의 감정에 주목: "그 꿈에서 어떤 감정이 들었어요?"
- 현재 상황과 연결: "요즘 삶에서 비슷한 느낌이 드는 게 있나요?"
- 적극적 상상 제안: "꿈 속 인물에게 물어본다면, 뭘 묻고 싶으세요?"
"""
            elif any(k in prompt_lower for k in ["싫어", "짜증", "미워", "혐오"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 그림자 투사]
- 감정 인정: "정말 불편하셨겠어요"
- 융 관점 - 그림자 투사: 강하게 싫은 것은 내 그림자일 수 있음
- 질문: "그 사람의 어떤 점이 가장 싫으세요?"
- 도전: "그 특성이 혹시 나한테도 조금 있다면?"
- 통합: "그 에너지를 건강하게 쓴다면 어떤 모습일까요?"
"""
            elif any(k in prompt_lower for k in ["언제", "시기", "타이밍", "몇 월", "올해", "내년"]):
                therapeutic_section = """
[🧠 심리상담 가이드: 시기/타이밍]
- 구체적 시기 제시 필수: 사주 대운/세운 + 점성 트랜짓 분석
- 월/분기 단위로 명확하게: "2025년 3-4월이 좋아요"
- 왜 그 시기인지 설명: "목성이 ~에 들어오면서..."
- 그 시기에 할 일 제안: "이 시기에 [구체적 행동]을 시작하면 좋겠어요"
- 주의할 시기도 함께: "다만 ~월은 신중하게"
"""

        rag_meta = {}
        if debug_rag or debug_log:
            rag_meta = {
                "enabled": True,
                "theme": theme,
                "question": current_user_question[:120],
                "graph_nodes": len(session_rag_data.get("graph_nodes", [])),
                "corpus_quotes": len(session_rag_data.get("corpus_quotes", [])) or len(instant_quotes),
                "persona_jung": len(persona_context.get("jung", [])),
                "persona_stoic": len(persona_context.get("stoic", [])),
                "cross_analysis": bool(cross_rules),
                "theme_fusion": bool(theme_fusion_section),
                "lifespan": bool(lifespan_section),
                "therapeutic": bool(therapeutic_section),
                "session_rag": bool(session_cache),
            }
            if debug_log:
                logger.info(
                    "[RAG-DEBUG] theme=%s q=%s graph=%s corpus=%s persona=%s cross=%s fusion=%s session=%s",
                    theme,
                    current_user_question[:80],
                    rag_meta["graph_nodes"],
                    rag_meta["corpus_quotes"],
                    rag_meta["persona_jung"] + rag_meta["persona_stoic"],
                    rag_meta["cross_analysis"],
                    rag_meta["theme_fusion"],
                    rag_meta["session_rag"],
                )
                if session_rag_data.get("graph_nodes"):
                    logger.debug("[RAG-DEBUG] graph_nodes_sample=%s", session_rag_data["graph_nodes"][:3])
                if session_rag_data.get("corpus_quotes"):
                    logger.debug("[RAG-DEBUG] corpus_quotes_sample=%s", [
                        q.get("text_ko") or q.get("text_en") for q in session_rag_data["corpus_quotes"][:2]
                    ])

        # ======================================================
        # FRONTEND STRUCTURED PROMPT - Use simplified backend system prompt
        # Frontend already sent complete prompt with all analysis data
        # Backend only adds RAG enrichment (Jung quotes, cross-analysis, etc.)
        # ======================================================
        if is_frontend_structured:
            # Build RAG-only enrichment section
            rag_enrichment_parts = []

            # 1. Cross-analysis rules (사주+점성 교차 해석)
            if cross_rules:
                rag_enrichment_parts.append(f"[🔗 사주+점성 교차 해석 규칙]\n{cross_rules[:1500]}")

            # 2. Jung/Stoic quotes from RAG
            if rag_context:
                rag_enrichment_parts.append(rag_context)

            # 3. Lifespan guidance
            if lifespan_section:
                rag_enrichment_parts.append(lifespan_section)

            # 4. Theme fusion rules
            if theme_fusion_section:
                rag_enrichment_parts.append(theme_fusion_section)

            # 5. Therapeutic guidance based on question type
            if therapeutic_section:
                rag_enrichment_parts.append(therapeutic_section)

            # 6. Crisis context if detected
            if crisis_context_section:
                rag_enrichment_parts.append(crisis_context_section)

            # 7. User context (returning users)
            if user_context_section:
                rag_enrichment_parts.append(user_context_section)

            # 8. CV section for career questions
            if cv_section:
                rag_enrichment_parts.append(cv_section)

            rag_enrichment = "\n\n".join(rag_enrichment_parts) if rag_enrichment_parts else ""

            # Simplified system prompt - frontend prompt is already comprehensive
            # Just add RAG enrichment and remind AI to use all provided data
            if locale == "en":
                system_prompt = f"""You are a Saju+Astrology integrated counselor. Speak naturally and weave the data into your sentences. Start the first sentence directly with an answer (e.g., "So," or "Right now,").

ABSOLUTELY AVOID:
- Formal greetings ("Hello", "Nice to meet you")
- Self-introductions
- Bullet lists or numbered lists
- Bold text

STYLE:
- Conversational and warm, but concise
- Use 3 short paragraphs (summary -> evidence/patterns -> timing/action + question)
- End with exactly one follow-up question

EVIDENCE REQUIRED (inline, not as a list):
- At least one Saju reference (day master / ten gods / five elements / daeun or annual fortune)
- At least one Astrology reference (Sun/Moon/ASC plus a planet+house if possible)
- Give 2-3 timing windows within 6 months using month+week phrasing, and include one caution point
- Theme lock: focus strictly on theme="{theme}". Do not drift to other domains.

{timing_window_str}

Additional knowledge:
{rag_enrichment if rag_enrichment else "(none)"}

Response length: 400-600 words, {locale}, natural spoken tone."""
            else:
                system_prompt = f"""사주+점성 통합 상담사. 친구에게 말하듯 자연스럽게, 데이터를 녹여서 해석해. 첫 문장은 '이야'로 시작해(말줄임표 가능).

🚫 절대 금지:
- "일간이 X입니다" 나열식 설명 (사용자는 이미 자기 차트 알고 있음)
- "안녕하세요" 인사
- "조심하세요" "좋아질 거예요" 뜬구름 말
- **볼드체**, 번호 매기기, 목록 나열

✅ 올바른 스타일:
- 카페에서 친구한테 얘기하듯 자연스럽게
- 데이터를 문장 속에 녹여서 (나열 X)
- 실생활과 연결해서 설명
- 해요체로 친근하게 (너무 딱딱한 문어체 금지)
- 말투는 부드럽고 다정하게, 단정 대신 '~같아/가능성' 표현 사용
- 문단 3개 내외 (핵심 요약 → 근거/패턴 → 타이밍/행동 + 질문)

✅ 근거 필수:
- 사주 근거 1개 이상(일간/대운/세운 중 1개) + 오행/십성 반드시 언급
- 점성 근거 1개 이상(태양/달/ASC 중 1개) + 행성/하우스 반드시 언급(가능하면 각 1개)
- 근거는 문장 속에 자연스럽게 포함 (나열 금지)
- 6개월 타이밍 2~3개를 월+주 단위로 제시(예: 3월 2~3주차)
- 타이밍 중 1개는 주의점/피해야 할 포인트 포함
- 테마 고정: theme="{theme}"만 다루고 다른 테마로 흐르지 말 것.
- 마지막에 후속 질문 1개

📅 {timing_window_str}

예시) "나는 어떤 사람이야?" 질문:
❌ 나쁜 답:
"당신의 일간은 신금(辛)입니다. 태양은 물병자리입니다. 특징은 다음과 같습니다:
1. 독립적
2. 분석적..."

✅ 좋은 답:
"이 차트 기준으로 보면, '머리는 차갑게(분석/전략), 돈과 기회는 빠르게(사업감각), 관계는 자존심 때문에 한 번씩 뜨겁게' 가는 타입이에요.

물병자리 ASC + 태양이라는 행성이 1하우스라 독립심 강하고 '내 방식'이 확실해요. 유행에 휘둘리기보다 새로운 관점/효율을 좋아하죠. 말이 빠르고 논리적이라 쿨하게 보이는데, 사실 사람 관찰 많이 하는 편.

사주로 보면 일간 신금(辛)이고 오행은 화가 약한 편, 십성으로는 편재가 강해서 돈의 흐름/시장 감각이 있어요. '기회 포착 → 구조 만들기 → 굴리기'에 재능. 다만 추진력의 연료가 들쭉날쭉할 수 있어요.

관계에서는 화성 사자 7하우스 역행이라 자존심·인정 욕구가 버튼. 평소 참다가 쌓이면 터지는 패턴 주의. 작은 불만을 '예의 있게' 자주 말하는 게 오히려 유리해요."

📚 추가 지식:
{rag_enrichment if rag_enrichment else "(없음)"}

📌 500-800자, {locale}, 자연스러운 구어체"""

            logger.info(f"[ASK-STREAM] Using SIMPLIFIED system prompt for frontend-structured request (RAG enrichment: {len(rag_enrichment)} chars)")

        else:
            # ======================================================
            # LEGACY PATH - Build full system prompt (for non-frontend requests)
            # ======================================================
            # Build system prompt - Enhanced counselor persona with Jung-inspired therapeutic approach
            counselor_persona = """당신은 사주+점성술 통합 상담사입니다.

⚠️ 절대 규칙:
1. 인사 금지 - "안녕하세요", "반가워요" 등 인사 절대 금지
2. 신상 소개 금지 - "일간이 X입니다", "당신은 Y 성향" 같은 기본 설명 금지. 사용자는 이미 자기 사주를 안다. 바로 질문에 답해.
3. 제공된 데이터만 사용 - 대운/세운을 지어내지 마세요. 아래 [사주 분석]에 있는 그대로만 인용
4. 첫 문장부터 사용자 질문에 대한 답변으로 시작

💬 상담 스타일:
• 상세하고 깊이 있는 분석 (400-600단어)
• 사주와 점성술 균형있게 활용하되 자연스럽게 녹여내
• 구체적 날짜/시기 제시
• '왜 그런지' 이유를 충분히 설명
• 융 심리학 인용이 있으면 해석에 자연스럽게 녹여서 깊이 더하기"""

            if locale == "en":
                counselor_persona = """You are an integrated Saju + Astrology counselor.

ABSOLUTE RULES:
1. No greetings or self-introductions.
2. Answer the user's question from the first sentence.
3. Use only provided data; do not invent 운 or placements.

STYLE:
- 3 short paragraphs (summary -> evidence/patterns -> timing/action + question)
- Provide concrete timing windows within 6 months, including one caution
- Keep the tone warm and practical
"""

            # Build advanced astrology section (only if data available)
            advanced_astro_section = ""
            if advanced_astro_detail:
                advanced_astro_section = f"""

[🔭 심층 점성 분석]
{advanced_astro_detail}
"""

        if not is_frontend_structured and rag_context:
            # RICH prompt with all RAG data
            if locale == "en":
                system_prompt = f"""{counselor_persona}

{timing_window_str}

[SAJU ANALYSIS]
{saju_detail}

[ASTROLOGY ANALYSIS]
{astro_detail}
{advanced_astro_section}{cross_section}
{rag_context}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[RESPONSE RULES]
- Include at least one Saju reference (day master / ten gods / five elements / daeun or annual fortune)
- Include at least one Astrology reference (Sun/Moon/ASC + planet+house if possible)
- 2-3 timing windows within 6 months (month+week phrasing), include one caution
- End with exactly one follow-up question
- Theme lock: focus strictly on theme="{theme}". Do not drift to other domains.
- Respond in English only
"""
            else:
                system_prompt = f"""{counselor_persona}

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요
⚠️ {timing_window_str} - 이 범위 안에서 2~3개 시기를 제시하세요

[📊 사주 분석]
{saju_detail}

[🌟 점성 분석]
{astro_detail}
{advanced_astro_section}{cross_section}
{rag_context}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[🎯 응답 스타일]
• 첫 문장부터 사용자 질문에 직접 답변 - 신상 소개 NO
• 사주와 점성술 통찰을 자연스럽게 녹여서 설명
• '왜 그런지' 이유를 상세히 풀어서 설명
• 구체적인 날짜/시기 반드시 포함
• 실천 가능한 구체적 조언 제공
• 융 심리학 인용이 있으면 1-2문장 자연스럽게 활용 (딱딱하게 인용 X)

❌ 절대 금지:
• 인사/환영 멘트 ("안녕하세요", "다시 찾아주셨네요")
• 신상 소개 ("일간이 X입니다", "당신은 Y 성향" 등)
• 대운/세운 지어내기 (위 데이터에 없는 것 언급)
• 추상적 말만 나열 (구체적 시기 없이)
• 피상적이고 짧은 답변

📌 응답 길이: 400-600단어로 충분히 상세하게 ({locale})"""
        elif not is_frontend_structured:
            # Standard prompt (no session data)
            if locale == "en":
                system_prompt = f"""{counselor_persona}

{timing_window_str}

[SAJU ANALYSIS]
{saju_detail}

[ASTROLOGY ANALYSIS]
{astro_detail}
{advanced_astro_section}{cross_section}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[RESPONSE RULES]
- Include at least one Saju reference (day master / ten gods / five elements / daeun or annual fortune)
- Include at least one Astrology reference (Sun/Moon/ASC + planet+house if possible)
- 2-3 timing windows within 6 months (month+week phrasing), include one caution
- End with exactly one follow-up question
- Theme lock: focus strictly on theme="{theme}". Do not drift to other domains.
- Respond in English only
"""
            else:
                system_prompt = f"""{counselor_persona}

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요
⚠️ {timing_window_str} - 이 범위 안에서 2~3개 시기를 제시하세요

[📊 사주 분석]
{saju_detail}

[🌟 점성 분석]
{astro_detail}
{advanced_astro_section}{cross_section}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[🎯 응답 스타일]
• 첫 문장부터 사용자 질문에 직접 답변 - 신상 소개 NO
• 사주와 점성술 통찰을 자연스럽게 녹여서 설명
• '왜 그런지' 이유를 상세히 풀어서 설명
• 구체적인 날짜/시기 반드시 포함
• 실천 가능한 구체적 조언 제공
• 융 심리학 인용이 있으면 1-2문장 자연스럽게 활용 (딱딱하게 인용 X)

❌ 절대 금지:
• 인사/환영 멘트 ("안녕하세요", "다시 찾아주셨네요")
• 신상 소개 ("일간이 X입니다", "당신은 Y 성향" 등)
• 대운/세운 지어내기 (위 데이터에 없는 것 언급)
• 추상적 말만 나열 (구체적 시기 없이)
• 피상적이고 짧은 답변

📌 응답 길이: 400-600단어로 충분히 상세하게 ({locale})"""
        # ======================================================
        # EMOTION TRACKING - Detect user's emotional state
        # ======================================================
        emotion_context = ""
        if prompt:
            prompt_lower = prompt.lower()
            # Detect emotional indicators
            emotions_detected = []
            if any(k in prompt_lower for k in ["힘들", "지쳐", "피곤", "지침"]):
                emotions_detected.append("exhausted")
            if any(k in prompt_lower for k in ["우울", "슬퍼", "눈물", "울고"]):
                emotions_detected.append("sad")
            if any(k in prompt_lower for k in ["불안", "걱정", "두려", "무서"]):
                emotions_detected.append("anxious")
            if any(k in prompt_lower for k in ["화나", "짜증", "억울", "분노"]):
                emotions_detected.append("angry")
            if any(k in prompt_lower for k in ["외로", "혼자", "고독"]):
                emotions_detected.append("lonely")
            if any(k in prompt_lower for k in ["설레", "기대", "행복", "좋아"]):
                emotions_detected.append("hopeful")
            if any(k in prompt_lower for k in ["혼란", "모르겠", "어떻게", "뭘 해야"]):
                emotions_detected.append("confused")

            if emotions_detected:
                emotion_map = {
                    "exhausted": "지침/피로",
                    "sad": "슬픔/우울",
                    "anxious": "불안/걱정",
                    "angry": "분노/답답",
                    "lonely": "외로움",
                    "hopeful": "희망/설렘",
                    "confused": "혼란/방향상실"
                }
                detected_ko = [emotion_map.get(e, e) for e in emotions_detected]
                emotion_context = f"\n[💭 감지된 감정 상태: {', '.join(detected_ko)}]\n→ 이 감정을 먼저 인정하고 공감하세요. 성급히 해결책으로 넘어가지 마세요.\n"
                logger.info(f"[ASK-STREAM] Emotion detected: {emotions_detected}")

        # Add emotion context to system prompt if detected
        if emotion_context:
            system_prompt = system_prompt.replace("[📏 응답 구조]", f"{emotion_context}\n[📏 응답 구조]")

        def generate():
            """SSE generator for streaming response."""
            try:
                from openai import OpenAI
                import httpx
                client = OpenAI(
                    api_key=os.getenv("OPENAI_API_KEY"),
                    timeout=httpx.Timeout(60.0, connect=10.0)
                )

                # Build messages with conversation history (EXPANDED: last 12 exchanges)
                messages = [{"role": "system", "content": system_prompt}]

                # Add conversation history - increased limit for better context
                history_limit = 12  # 6 user + 6 assistant messages (was 6)
                recent_history = conversation_history[-history_limit:] if conversation_history else []

                # Generate conversation summary for long sessions (>6 messages)
                conversation_summary = ""
                if len(conversation_history) > 6:
                    # Extract key topics from older messages
                    older_msgs = conversation_history[:-6]
                    topics = []
                    for m in older_msgs:
                        if m.get("role") == "user" and m.get("content"):
                            content = m["content"][:100]
                            if any(k in content for k in ["연애", "사랑", "결혼"]):
                                topics.append("연애/관계")
                            elif any(k in content for k in ["취업", "이직", "커리어", "진로"]):
                                topics.append("커리어/진로")
                            elif any(k in content for k in ["힘들", "우울", "지쳐"]):
                                topics.append("감정적 어려움")
                            elif any(k in content for k in ["나는", "성격", "어떤 사람"]):
                                topics.append("자기탐색")
                    if topics:
                        unique_topics = list(dict.fromkeys(topics))[:3]
                        conversation_summary = f"[📋 이전 대화 요약: {', '.join(unique_topics)} 주제로 대화함]\n"

                # Add summary if available
                if conversation_summary:
                    messages.append({
                        "role": "system",
                        "content": conversation_summary
                    })

                # Smart truncation: recent messages get more space
                for idx, msg in enumerate(recent_history):
                    if msg.get("role") in ("user", "assistant") and msg.get("content"):
                        # Older messages: shorter, Recent messages: longer
                        is_recent = idx >= len(recent_history) - 4
                        max_len = 800 if is_recent else 300
                        messages.append({
                            "role": msg["role"],
                            "content": msg["content"][:max_len]
                        })

                # Add current user message
                messages.append({"role": "user", "content": prompt})

                default_model = os.getenv("CHAT_MODEL") or os.getenv("FUSION_MODEL") or "gpt-4.1"
                default_temp = _clamp_temperature(_coerce_float(os.getenv("CHAT_TEMPERATURE")), 0.75)
                model_name, temperature, ab_variant = _select_model_and_temperature(
                    data,
                    default_model,
                    default_temp,
                    session_id,
                    g.request_id,
                )
                if debug_rag or debug_log:
                    rag_meta["model"] = model_name
                    rag_meta["temperature"] = temperature
                    rag_meta["ab_variant"] = ab_variant or ""
                if debug_log:
                    logger.info(
                        "[RAG-DEBUG] model=%s temp=%s ab=%s",
                        model_name,
                        temperature,
                        ab_variant or "default",
                    )
                max_tokens = _get_int_env("ASK_STREAM_MAX_TOKENS", 1600, min_value=400, max_value=4000)
                stream = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,  # Slightly more creative (was 0.7)
                    stream=True
                )

                full_text = ""

                for chunk in stream:
                    if not chunk.choices or not chunk.choices[0].delta.content:
                        continue
                    full_text += chunk.choices[0].delta.content

                full_text = _ensure_ko_prefix(full_text, locale)

                if full_text.strip().startswith("[ERROR]") or not full_text.strip():
                    yield "data: [DONE]\n\n"
                    return

                addendum = _build_missing_requirements_addendum(
                    full_text,
                    locale,
                    saju_data,
                    astro_data,
                    today_date,
                )
                if addendum:
                    full_text = _insert_addendum(full_text, addendum)

                debug_addendum = _build_rag_debug_addendum(rag_meta, locale) if debug_rag else ""
                if debug_addendum:
                    sep = "\n\n" if full_text else ""
                    full_text = f"{full_text}{sep}{debug_addendum}"

                full_text = _format_korean_spacing(full_text)
                if debug_rag and full_text:
                    full_text = full_text.rstrip() + "\n"

                if locale == "ko" and not full_text.rstrip().endswith("?"):
                    followup = "혹시 지금 가장 궁금한 포인트가 뭐예요?"
                    separator = "" if (full_text.endswith((" ", "\n", "\t")) or not full_text) else " "
                    full_text += f"{separator}{followup}"

                chunk_size = _get_stream_chunk_size()
                for piece in _chunk_text(full_text, chunk_size):
                    yield _to_sse_event(piece)

                # Signal end of stream
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[ASK-STREAM] Streaming error: {e}")
                yield f"data: [ERROR] {str(e)}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] id={getattr(g, 'request_id', '')} /ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "chat")
        locale = data.get("locale", "ko")

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

        has_saju_payload = _has_saju_payload(saju_data)
        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and (not has_saju_payload or not has_astro_payload):
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[COUNSELOR-INIT] Invalid birth format for missing payload")
                    return jsonify({"status": "error", "message": _build_birth_format_message(locale)}), 400
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=not has_saju_payload,
                missing_astro=not has_astro_payload,
            )
            logger.warning("[COUNSELOR-INIT] Missing computed payload(s)")
            return jsonify({"status": "error", "message": missing_message}), 400

        logger.info(f"[COUNSELOR-INIT] id={g.request_id} theme={theme}")
        logger.info(f"[COUNSELOR-INIT] saju dayMaster: {saju_data.get('dayMaster', {})}")
        logger.info(f"[COUNSELOR-INIT] astro_data keys: {list(astro_data.keys()) if astro_data else 'empty'}")

        allow_birth_compute = _bool_env("ALLOW_BIRTH_ONLY")
        if allow_birth_compute and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
                logger.info(f"[COUNSELOR-INIT] Computed simple saju from birth data: {saju_data.get('dayMaster', {})}")
            except Exception as e:
                logger.warning(f"[COUNSELOR-INIT] Failed to compute simple saju: {e}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        # Pre-fetch ALL RAG data (this is slow but only happens once)
        rag_data = prefetch_all_rag_data(saju_data, astro_data, theme, locale)

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

        raw_dream_text = data.get("dream", "")
        symbols = data.get("symbols", [])
        emotions = data.get("emotions", [])
        themes = data.get("themes", [])
        context = data.get("context", [])
        locale = data.get("locale", "ko")

        # Input validation - sanitize dream text
        if is_suspicious_input(raw_dream_text):
            logger.warning(f"[DREAM_STREAM] Suspicious input detected")
        dream_text = sanitize_dream_text(raw_dream_text)

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
                    model="gpt-4o",  # Upgraded for better dream interpretation quality
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
                    model="gpt-4o",  # Upgraded for better symbol interpretation
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
                    model="gpt-4o",  # Upgraded for better recommendations
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


@app.route("/api/dream/chat-stream", methods=["POST"])
def dream_chat_stream():
    """
    Streaming dream follow-up chat - Enhanced with RAG + Saju + Celestial context.
    Returns Server-Sent Events (SSE) for real-time text streaming.

    Request body:
        {
            "messages": [{"role": "user"|"assistant", "content": "..."}],
            "dream_context": {
                "dream_text": "원래 꿈 내용",
                "summary": "해석 요약",
                "symbols": ["symbol1", "symbol2"],
                "emotions": ["emotion1"],
                "themes": ["theme1"],
                "recommendations": ["recommendation1"],
                "cultural_notes": {"korean": "...", "western": "..."},
                "celestial": {...},  # Optional: moon phase, retrogrades
                "saju": {...}  # Optional: birth data for saju context
            },
            "language": "ko"|"en"
        }
    """
    try:
        data = request.get_json(force=True)
        logger.info(f"[DREAM_CHAT_STREAM] id={g.request_id} Processing enhanced streaming chat with RAG")

        raw_messages = data.get("messages", [])
        dream_context = data.get("dream_context", {})
        language = data.get("language", "ko")
        session_id = data.get("session_id")  # Optional session ID for continuity

        # Sanitize all messages
        messages = sanitize_messages(raw_messages)

        if not messages:
            return jsonify({"status": "error", "message": "No messages provided"}), 400

        # Extract dream context
        dream_text = dream_context.get("dream_text", "")
        summary = dream_context.get("summary", "")
        symbols = dream_context.get("symbols", [])
        emotions = dream_context.get("emotions", [])
        themes = dream_context.get("themes", [])
        recommendations = dream_context.get("recommendations", [])
        cultural_notes = dream_context.get("cultural_notes", {})
        celestial = dream_context.get("celestial", {})
        saju_data = dream_context.get("saju", {})

        # Get last user message for RAG search
        last_user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_message = msg.get("content", "")
                break

        # ============================================================
        # SESSION MANAGEMENT: Get or create counseling session
        # ============================================================
        counseling_engine = None
        counseling_session = None
        try:
            counseling_engine = get_counseling_engine()
            if counseling_engine and session_id:
                # Try to retrieve existing session
                counseling_session = counseling_engine.get_session(session_id)
                if counseling_session:
                    logger.info(f"[DREAM_CHAT_STREAM] Retrieved existing session: {session_id}, phase: {counseling_session.current_phase}")
                else:
                    # Create new session with provided ID
                    counseling_session = counseling_engine.create_session()
                    counseling_session.session_id = session_id
                    counseling_engine.sessions[session_id] = counseling_session
                    logger.info(f"[DREAM_CHAT_STREAM] Created new session: {session_id}")
            elif counseling_engine:
                # Create new session
                counseling_session = counseling_engine.create_session()
                logger.info(f"[DREAM_CHAT_STREAM] Created new session: {counseling_session.session_id}")
        except Exception as session_error:
            logger.warning(f"[DREAM_CHAT_STREAM] Session management failed: {session_error}")

        # ============================================================
        # CRISIS DETECTION: Use CounselingEngine's advanced crisis detection
        # ============================================================
        crisis_response = None
        try:
            # Use advanced CounselingEngine crisis detector (5-level severity)
            if not counseling_engine:
                counseling_engine = get_counseling_engine()
            if counseling_engine:
                crisis_detector = counseling_engine.crisis_detector
                crisis_check = crisis_detector.detect_crisis(last_user_message)

                if crisis_check["is_crisis"]:
                    # Get detailed crisis response
                    crisis_data = crisis_detector.get_crisis_response(
                        crisis_check["max_severity"],
                        locale=language
                    )
                    crisis_response = {
                        "type": "crisis",
                        "severity": crisis_check["max_severity"],
                        "response": crisis_data.get("immediate_message", ""),
                        "resources": crisis_data.get("resources", {}),
                        "requires_immediate_action": crisis_check["requires_immediate_action"]
                    }
                    logger.warning(f"[DREAM_CHAT_STREAM] Advanced crisis detected: severity={crisis_check['max_severity']}, immediate_action={crisis_check['requires_immediate_action']}")
            else:
                # Fallback to dream_embeddings CrisisDetector
                from backend_ai.app.dream_embeddings import CrisisDetector
                crisis_check = CrisisDetector.check_crisis(last_user_message)
                if crisis_check:
                    crisis_response = crisis_check
                    logger.warning(f"[DREAM_CHAT_STREAM] Fallback crisis detected: type={crisis_check['type']}")
        except Exception as crisis_error:
            logger.warning(f"[DREAM_CHAT_STREAM] Crisis detection failed: {crisis_error}")

        # ============================================================
        # RAG SEARCH: Find relevant dream interpretations for the question
        # ============================================================
        rag_context = ""
        therapeutic_context = ""
        counseling_context = ""

        try:
            from backend_ai.app.dream_logic import get_dream_embed_rag
            dream_rag = get_dream_embed_rag()

            # Search based on: original dream + user's current question
            search_query = f"{dream_text[:300]} {last_user_message}"
            rag_results = dream_rag.get_interpretation_context(search_query, top_k=6)

            if rag_results.get("texts"):
                rag_texts = rag_results.get("texts", [])[:5]
                korean_notes_rag = rag_results.get("korean_notes", [])[:3]
                specifics = rag_results.get("specifics", [])[:4]
                advice_rag = rag_results.get("advice", [])[:3]
                categories = rag_results.get("categories", [])

                rag_context = "\n\n[📚 지식베이스 검색 결과 - 이 정보를 활용하여 답변하세요]\n"

                if rag_texts:
                    rag_context += "\n관련 해석:\n" + "\n".join([f"• {t}" for t in rag_texts])

                if korean_notes_rag:
                    rag_context += "\n\n한국 전통 해몽:\n" + "\n".join([f"• {n}" for n in korean_notes_rag])

                if specifics:
                    rag_context += "\n\n상세 상황별 해석:\n" + "\n".join([f"• {s}" for s in specifics])

                if advice_rag:
                    rag_context += "\n\n전통 조언:\n" + "\n".join([f"• {a}" for a in advice_rag])

                if categories:
                    rag_context += f"\n\n꿈 카테고리: {', '.join(categories)}"

                logger.info(f"[DREAM_CHAT_STREAM] RAG found {len(rag_texts)} relevant texts, quality={rag_results.get('match_quality')}")

            # ============================================================
            # THERAPEUTIC QUESTIONS: Get Jung-based therapeutic questions
            # ============================================================
            therapeutic_data = dream_rag.get_therapeutic_questions(dream_text + " " + last_user_message)
            if therapeutic_data.get("therapeutic_questions"):
                therapeutic_context = "\n\n[🧠 융 심리학 치료적 질문 - 적절히 활용하세요]\n"
                therapeutic_context += f"통찰: {therapeutic_data.get('insight', '')}\n"
                therapeutic_context += "치료적 질문:\n" + "\n".join([f"• {q}" for q in therapeutic_data['therapeutic_questions'][:3]])

            # ============================================================
            # COUNSELING CONTEXT: Get scenario-based counseling insights
            # ============================================================
            counseling_data = dream_rag.get_counseling_context(last_user_message)
            if counseling_data.get("jungian_concept"):
                counseling_context = "\n\n[💭 상담 시나리오 컨텍스트]\n"
                counseling_context += f"융 개념: {counseling_data.get('jungian_concept', '')}\n"
                counseling_context += f"해석: {counseling_data.get('interpretation', '')}\n"
                if counseling_data.get("key_questions"):
                    counseling_context += "핵심 질문:\n" + "\n".join([f"• {q}" for q in counseling_data['key_questions'][:2]])
                if counseling_data.get("reframes"):
                    counseling_context += "\n리프레이밍:\n" + "\n".join([f"• {r}" for r in counseling_data['reframes']])

        except Exception as rag_error:
            logger.warning(f"[DREAM_CHAT_STREAM] RAG search failed (continuing without): {rag_error}")

        # ============================================================
        # CELESTIAL CONTEXT: Moon phase and planetary influences
        # ============================================================
        celestial_context = ""
        if celestial:
            moon_phase = celestial.get("moon_phase", {})
            moon_sign = celestial.get("moon_sign", {})
            retrogrades = celestial.get("retrogrades", [])

            if moon_phase or moon_sign:
                celestial_context = "\n\n[🌙 현재 천체 상황]\n"

                if moon_phase:
                    phase_name = moon_phase.get("korean", moon_phase.get("name", ""))
                    phase_emoji = moon_phase.get("emoji", "🌙")
                    dream_meaning = moon_phase.get("dream_meaning", "")
                    celestial_context += f"달의 위상: {phase_emoji} {phase_name}\n"
                    if dream_meaning:
                        celestial_context += f"꿈에 미치는 영향: {dream_meaning}\n"

                if moon_sign:
                    sign_korean = moon_sign.get("korean", moon_sign.get("sign", ""))
                    dream_flavor = moon_sign.get("dream_flavor", "")
                    celestial_context += f"달 별자리: {sign_korean}\n"
                    if dream_flavor:
                        celestial_context += f"꿈 성격: {dream_flavor}\n"

                if retrogrades:
                    retro_names = [r.get("korean", r.get("planet", "")) for r in retrogrades[:3]]
                    celestial_context += f"역행 중인 행성: {', '.join(retro_names)}\n"
        else:
            # Try to get current celestial data if not provided
            try:
                if HAS_REALTIME:
                    transits = get_current_transits()
                    if transits:
                        moon_phase = transits.get("moon_phase", {})
                        if moon_phase:
                            phase_name = moon_phase.get("korean", moon_phase.get("name", ""))
                            phase_emoji = moon_phase.get("emoji", "🌙")
                            celestial_context = f"\n\n[🌙 현재 달 위상: {phase_emoji} {phase_name}]\n"
            except Exception:
                pass

        # ============================================================
        # SAJU CONTEXT: User's fortune influence on dreams
        # ============================================================
        saju_context = ""
        if saju_data and saju_data.get("birth_date"):
            try:
                birth_date = saju_data.get("birth_date", "")
                birth_time = saju_data.get("birth_time", "")

                # Calculate current saju if we have birth data
                saju_result = calculate_saju_data(
                    birth_date=birth_date,
                    birth_time=birth_time or "12:00",
                    birth_city=saju_data.get("birth_city", "Seoul"),
                    timezone=saju_data.get("timezone", "Asia/Seoul"),
                    language=language
                )

                if saju_result:
                    day_master = saju_result.get("dayMaster", {})
                    current_daeun = saju_result.get("currentDaeun", {})
                    today_iljin = saju_result.get("todayIljin", {})

                    saju_context = "\n\n[🔮 사용자 사주 운세 컨텍스트]\n"

                    if day_master:
                        dm_stem = day_master.get("stem", "")
                        dm_element = day_master.get("element", "")
                        saju_context += f"일간(본질): {dm_stem} ({dm_element})\n"

                    if current_daeun:
                        daeun_info = f"{current_daeun.get('stem', '')} {current_daeun.get('branch', '')}"
                        saju_context += f"현재 대운(10년): {daeun_info}\n"

                    if today_iljin:
                        iljin_info = f"{today_iljin.get('stem', '')} {today_iljin.get('branch', '')}"
                        saju_context += f"오늘 일진: {iljin_info}\n"

                    saju_context += "→ 이 운세 흐름이 꿈의 내용과 시점에 영향을 미칩니다.\n"

                    logger.info(f"[DREAM_CHAT_STREAM] Added saju context for user")
            except Exception as saju_error:
                logger.warning(f"[DREAM_CHAT_STREAM] Saju calculation failed: {saju_error}")

        # Format basic context
        symbols_str = ", ".join(symbols) if symbols else "없음"
        emotions_str = ", ".join(emotions) if emotions else "없음"
        themes_str = ", ".join(themes) if themes else "없음"
        recommendations_str = " / ".join(recommendations) if recommendations else "없음"

        # ============================================================
        # PREVIOUS CONSULTATIONS CONTEXT (Memory/Continuity)
        # ============================================================
        previous_context = ""
        previous_consultations = dream_context.get("previous_consultations", [])
        if previous_consultations:
            previous_context = "\n\n[🔄 이전 상담 기록 - 사용자와의 연속성 유지]\n"
            for i, prev in enumerate(previous_consultations[:3], 1):
                prev_summary = prev.get("summary", "")[:150]
                prev_dream = prev.get("dreamText", "")[:100]
                prev_date = prev.get("date", "")[:10]
                if prev_summary:
                    previous_context += f"{i}. ({prev_date}) {prev_summary}\n"
                    if prev_dream:
                        previous_context += f"   이전 꿈: {prev_dream}...\n"
            previous_context += "→ 이전 상담 내용을 참고하여 연속성 있는 답변을 제공하세요.\n"

        # ============================================================
        # PERSONA MEMORY (Personalization)
        # ============================================================
        persona_context = ""
        persona_memory = dream_context.get("persona_memory", {})
        if persona_memory:
            session_count = persona_memory.get("sessionCount", 0)
            key_insights = persona_memory.get("keyInsights", [])
            emotional_tone = persona_memory.get("emotionalTone", "")

            if session_count > 1 or key_insights or emotional_tone:
                persona_context = "\n\n[👤 사용자 프로필 (개인화)]\n"
                if session_count > 1:
                    persona_context += f"상담 횟수: {session_count}회 (단골 사용자)\n"
                if emotional_tone:
                    persona_context += f"전반적 감정 톤: {emotional_tone}\n"
                if key_insights:
                    persona_context += f"핵심 인사이트: {', '.join(key_insights[:3])}\n"
                persona_context += "→ 이전 통찰을 바탕으로 개인화된 답변을 제공하세요.\n"

        # ============================================================
        # JUNGIAN ENHANCED CONTEXT (from CounselingEngine)
        # ============================================================
        jung_context_str = ""
        if counseling_engine:
            try:
                # Get enhanced Jung context from counseling engine
                jung_context = counseling_engine.get_enhanced_context(
                    user_message=last_user_message,
                    saju_data=saju_data if saju_data else None
                )

                if jung_context:
                    jung_context_str = "\n\n[🧠 융 심리학 고급 컨텍스트 - CounselingEngine]\n"

                    # Psychological Type (from Saju mapping)
                    if jung_context.get("psychological_type"):
                        ptype = jung_context["psychological_type"]
                        jung_context_str += f"심리 유형: {ptype.get('name_ko', ptype.get('name', ''))}\n"
                        jung_context_str += f"  특징: {ptype.get('description', '')[:100]}\n"

                    # Alchemical Stage (Nigredo→Albedo→Rubedo)
                    if jung_context.get("alchemy_stage"):
                        stage = jung_context["alchemy_stage"]
                        jung_context_str += f"연금술 단계: {stage.get('name_ko', stage.get('name', ''))}\n"
                        jung_context_str += f"  초점: {stage.get('therapeutic_focus', '')[:100]}\n"

                    # Scenario Guidance
                    if jung_context.get("scenario_guidance"):
                        scenario = jung_context["scenario_guidance"]
                        jung_context_str += f"상담 접근: {scenario.get('approach', '')[:100]}\n"

                    # RAG-based recommended questions
                    if jung_context.get("rag_questions"):
                        jung_context_str += "추천 치료적 질문:\n"
                        for q in jung_context["rag_questions"][:2]:
                            jung_context_str += f"  • {q}\n"

                    # RAG insights
                    if jung_context.get("rag_insights"):
                        jung_context_str += "관련 통찰:\n"
                        for insight in jung_context["rag_insights"][:2]:
                            jung_context_str += f"  • {insight[:80]}...\n"

                    jung_context_str += "→ 이 융 심리학 컨텍스트를 꿈 해석에 자연스럽게 통합하세요.\n"

                    logger.info(f"[DREAM_CHAT_STREAM] Added Jung enhanced context from CounselingEngine")
            except Exception as jung_error:
                logger.warning(f"[DREAM_CHAT_STREAM] Jung context generation failed: {jung_error}")

        # ============================================================
        # SESSION PHASE TRACKING
        # ============================================================
        session_phase_context = ""
        if counseling_session:
            try:
                # Add user message to session
                counseling_session.add_message("user", last_user_message)

                # Get current phase info
                phase_info = counseling_session.get_phase_info()
                session_phase_context = f"\n\n[📍 상담 진행 단계: {phase_info.get('name', '')}]\n"
                session_phase_context += f"목표: {', '.join(phase_info.get('goals', []))}\n"
                session_phase_context += f"→ 현재 단계의 목표에 맞춰 답변하세요.\n"

                logger.info(f"[DREAM_CHAT_STREAM] Session phase: {counseling_session.current_phase}")
            except Exception as phase_error:
                logger.warning(f"[DREAM_CHAT_STREAM] Session phase tracking failed: {phase_error}")

        # Build conversation history
        conversation_history = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                continue
            conversation_history.append(f"{'사용자' if role == 'user' else 'AI'}: {content}")

        is_korean = language == "ko"

        # ============================================================
        # BUILD ENHANCED SYSTEM PROMPT (Jung + Stoic + Korean Haemong)
        # ============================================================
        if is_korean:
            system_prompt = """전문 꿈 해석 상담사. 융 심리학 + 스토아 철학 + 한국 해몽 융합.

🚫 절대 금지:
- "좋은 꿈이에요" "조심하세요" 같은 뜬구름 말
- 모든 꿈에 적용되는 일반론
- 데이터 없이 추측

✅ 올바른 답변:
- 아래 컨텍스트(사주, 천체, 문화별 해석)를 반드시 인용
- "왜 지금 이 꿈을 꾸었는지" 현재 운세/천체로 설명
- 구체적 시기/행동 제시 (예: "이번 달은 물 근처 피하세요")

예시:
❌ 나쁜 답: "뱀은 변화를 의미해요."
✅ 좋은 답: "현재 병자(丙子) 대운에서 수(水)기운이 강한데, 뱀은 수 에너지의 상징이에요. 달이 전갈자리에 있어 깊은 변환 욕구가 꿈에 나타났습니다. 융 심리학에서 뱀은 무의식의 지혜를 상징하는데, 지금 당신에게 어떤 변화가 필요한지 스스로 물어보세요."

핵심 해석 틀:
- 한국 해몽: 길몽/흉몽, 태몽, 재물몽
- 융 심리학: 그림자, 아니마/아니무스 (치료적 질문 활용)
- 스토아: 실용적 행동 조언"""

            # Build enhanced chat prompt with all context
            chat_prompt = f"""[꿈 해석 컨텍스트]
원래 꿈: {dream_text[:600] if dream_text else "(없음)"}
해석 요약: {summary[:400] if summary else "(없음)"}
주요 심볼: {symbols_str}
감정: {emotions_str}
테마: {themes_str}
기존 조언: {recommendations_str}"""

            # Add cultural notes if available
            if cultural_notes:
                if cultural_notes.get("korean"):
                    chat_prompt += f"\n한국 해몽 해석: {cultural_notes['korean'][:200]}"
                if cultural_notes.get("western"):
                    chat_prompt += f"\n서양 심리학 해석: {cultural_notes['western'][:200]}"

            # Add RAG context
            chat_prompt += rag_context

            # Add therapeutic context (Jung-based questions from DreamRAG)
            chat_prompt += therapeutic_context

            # Add counseling context (scenario-based from DreamRAG)
            chat_prompt += counseling_context

            # Add Jung enhanced context (from CounselingEngine) ⭐ NEW
            chat_prompt += jung_context_str

            # Add session phase tracking ⭐ NEW
            chat_prompt += session_phase_context

            # Add celestial context
            chat_prompt += celestial_context

            # Add saju context
            chat_prompt += saju_context

            # Add previous consultations
            chat_prompt += previous_context

            # Add persona memory
            chat_prompt += persona_context

            # Add crisis context if detected
            crisis_instruction = ""
            if crisis_response:
                crisis_instruction = f"""

[⚠️ 위기 상황 감지 - 우선 대응 필요]
감지 유형: {crisis_response['type']}
심각도: {crisis_response['severity']}
권장 대응: {crisis_response['response']}
전문 기관: {', '.join([f"{k}: {v}" for k, v in crisis_response['resources'].items()])}

중요: 먼저 공감과 지지를 표현하고, 전문 상담 기관 연락처를 안내하세요."""

            chat_prompt += f"""

[대화 기록]
{chr(10).join(conversation_history[-6:])}

[사용자 질문]
{last_user_message}
{crisis_instruction}

위의 모든 컨텍스트(지식베이스, 천체, 사주, 이전 상담, 치료적 질문)를 활용하여:
1. 한국 해몽 관점의 구체적 해석
2. 융 심리학적 통찰 (필요시 원형 언급, 치료적 질문 활용)
3. 스토아 철학의 실용적 조언
을 자연스럽게 융합한 답변을 제공하세요."""

        else:
            system_prompt = """Expert dream counselor. Jung psychology + Stoic philosophy + Korean Haemong.

🚫 FORBIDDEN:
- "Good dream" "Be careful" vague statements
- Generic interpretations applicable to any dream
- Speculation without data

✅ CORRECT ANSWERS:
- MUST cite context below (saju fortune, celestial, cultural interpretations)
- Explain "why this dream NOW" using current fortune/celestial data
- Specific timing/actions (e.g., "avoid water activities this month")

Example:
❌ Bad: "Snake represents transformation."
✅ Good: "In your current Byeongja (丙子) major fortune, Water energy is strong - snake symbolizes this Water energy. Moon in Scorpio amplifies transformation urges in your dream. In Jungian terms, snake represents unconscious wisdom. Ask yourself: what change do you need right now?"

Core frameworks:
- Korean Haemong: auspicious/inauspicious, conception, wealth dreams
- Jungian: Shadow, Anima/Animus (use therapeutic questions)
- Stoic: practical action advice"""

            chat_prompt = f"""[Dream Interpretation Context]
Original Dream: {dream_text[:600] if dream_text else "(none)"}
Summary: {summary[:400] if summary else "(none)"}
Key Symbols: {symbols_str}
Emotions: {emotions_str}
Themes: {themes_str}
Previous Recommendations: {recommendations_str}"""

            if cultural_notes:
                if cultural_notes.get("korean"):
                    chat_prompt += f"\nKorean Traditional: {cultural_notes['korean'][:200]}"
                if cultural_notes.get("western"):
                    chat_prompt += f"\nWestern Psychology: {cultural_notes['western'][:200]}"

            chat_prompt += rag_context
            chat_prompt += therapeutic_context
            chat_prompt += counseling_context
            chat_prompt += celestial_context
            chat_prompt += saju_context
            chat_prompt += previous_context
            chat_prompt += persona_context

            # Add crisis context if detected (English)
            crisis_instruction_en = ""
            if crisis_response:
                crisis_instruction_en = f"""

[⚠️ CRISIS DETECTED - PRIORITY RESPONSE NEEDED]
Type: {crisis_response['type']}
Severity: {crisis_response['severity']}
Recommended Response: First express empathy and support, then provide professional helpline information.
Korean Crisis Lines: Suicide Prevention 1393, Mental Health Crisis 1577-0199

Important: Prioritize emotional support and professional referral."""

            chat_prompt += f"""

[Conversation History]
{chr(10).join(conversation_history[-6:])}

[User Question]
{last_user_message}
{crisis_instruction_en}

Using all context (knowledge base, celestial, saju, previous consultations, therapeutic questions), provide a response that naturally blends:
1. Korean traditional dream interpretation
2. Jungian psychological insight (use therapeutic questions when appropriate)
3. Stoic practical wisdom"""

        def generate_stream():
            """Generator for SSE streaming"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                stream = openai_client.chat.completions.create(
                    model="gpt-4o",  # Upgraded from gpt-4o-mini for better Jung psychology + Korean haemong fusion
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": chat_prompt}
                    ],
                    temperature=0.75,
                    max_tokens=2000,  # Increased for comprehensive dream interpretation responses
                    stream=True
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content})}\n\n"

                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[DREAM_CHAT_STREAM] Streaming error: {stream_error}")
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
        logger.exception(f"[ERROR] /api/dream/chat-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/dream", methods=["POST"])
@app.route("/api/dream", methods=["POST"])
def dream_interpret():
    """
    Dream interpretation endpoint.
    Accepts dream text, symbols, emotions, themes, and cultural context.
    """
    try:
        data = request.get_json(force=True)
        logger.info(f"[DREAM] id={g.request_id} Processing dream interpretation")

        # Extract dream data
        birth_data = _normalize_birth_payload(data)
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
def cache_stats():
    """Get cache statistics."""
    try:
        cache = get_cache()
        stats = cache.stats()
        return jsonify({"status": "success", "cache": stats})
    except Exception as e:
        logger.exception(f"[ERROR] /cache/stats failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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


def health_check():
    """Simple health check for Railway/load balancer."""
    return jsonify({
        "status": "ok",
        "timestamp": time.time(),
        "version": "1.0.0"
    })


def readiness_check():
    """Readiness check - indicates app is ready to receive traffic."""
    try:
        # Check if essential services are available
        checks = {
            "app": True,
            "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        }

        # Check Redis if available
        try:
            cache = get_cache()
            if cache:
                cache.ping()
                checks["redis"] = True
            else:
                checks["redis"] = False
        except Exception:
            checks["redis"] = False

        all_ready = all(checks.values())

        return jsonify({
            "ready": all_ready,
            "checks": checks,
            "timestamp": time.time()
        }), 200 if all_ready else 503
    except Exception as e:
        return jsonify({
            "ready": False,
            "error": str(e),
            "timestamp": time.time()
        }), 503


def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    try:
        perf_stats = get_performance_stats()
        cache_health = get_cache_health()

        # Format as Prometheus metrics
        metrics = []

        # Request metrics
        metrics.append(f'# HELP ai_backend_requests_total Total number of requests')
        metrics.append(f'# TYPE ai_backend_requests_total counter')
        metrics.append(f'ai_backend_requests_total {perf_stats.get("total_requests", 0)}')

        # Cache metrics
        metrics.append(f'# HELP ai_backend_cache_hit_rate Cache hit rate percentage')
        metrics.append(f'# TYPE ai_backend_cache_hit_rate gauge')
        metrics.append(f'ai_backend_cache_hit_rate {perf_stats.get("cache_hit_rate", 0)}')

        # Response time
        metrics.append(f'# HELP ai_backend_response_time_ms Average response time in milliseconds')
        metrics.append(f'# TYPE ai_backend_response_time_ms gauge')
        metrics.append(f'ai_backend_response_time_ms {perf_stats.get("avg_response_time_ms", 0)}')

        # Memory (if available)
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            metrics.append(f'# HELP ai_backend_memory_mb Memory usage in MB')
            metrics.append(f'# TYPE ai_backend_memory_mb gauge')
            metrics.append(f'ai_backend_memory_mb {memory_mb:.2f}')
        except ImportError:
            pass

        return Response('\n'.join(metrics), mimetype='text/plain')
    except Exception as e:
        return Response(f'# Error: {str(e)}', mimetype='text/plain'), 500


def full_health_check():
    """Comprehensive health check including performance metrics."""
    try:
        perf_stats = get_performance_stats()
        cache_health = get_cache_health()

        # Calculate overall health score
        health_score = 100
        issues = []

        # Penalize for low cache hit rate
        if perf_stats["cache_hit_rate"] < 30:
            health_score -= 20
            issues.append("Low cache hit rate")

        # Penalize for slow responses
        if perf_stats["avg_response_time_ms"] > 2000:
            health_score -= 15
            issues.append("Slow response times")

        # Penalize for cache issues
        if cache_health["health_score"] < 80:
            health_score -= 15
            issues.append("Cache degradation")

        # Check memory (if available)
        try:
            import psutil
            memory = psutil.Process().memory_info()
            memory_mb = memory.rss / 1024 / 1024
            if memory_mb > 450:  # Railway 512MB limit
                health_score -= 20
                issues.append(f"High memory usage: {memory_mb:.0f}MB")
        except ImportError:
            memory_mb = None

        # Check rate limit state size
        rate_state_size = len(_rate_state)
        if rate_state_size > 1000:
            issues.append(f"Large rate state: {rate_state_size} clients")

        status_text = "excellent" if health_score >= 90 else "good" if health_score >= 70 else "degraded"

        return jsonify({
            "status": "success",
            "health_score": max(0, health_score),
            "status_text": status_text,
            "issues": issues,
            "performance": perf_stats,
            "cache": cache_health,
            "memory_mb": memory_mb,
            "rate_state_clients": rate_state_size,
            "timestamp": time.time(),
            "version": "1.0.0"
        })
    except Exception as e:
        logger.exception(f"[ERROR] /health/full failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# GEMINI-LEVEL ENDPOINTS
# ===============================================================

# Real-time transit data
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
# ===============================================================
# I CHING (PREMIUM) ENDPOINTS
# ===============================================================

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


def _map_tarot_theme(category: str, spread_id: str, user_question: str = "") -> tuple:
    """Map frontend theme/spread to backend theme/sub_topic, considering user's question"""
    # Check specific mapping first
    key = (category, spread_id)
    if key in TAROT_SUBTOPIC_MAPPING:
        return TAROT_SUBTOPIC_MAPPING[key]

    # Fall back to theme-only mapping
    mapped_theme = TAROT_THEME_MAPPING.get(category, category)

    # Dynamic sub_topic selection based on user question keywords
    if user_question and mapped_theme == "career":
        q = user_question.lower()
        if any(kw in q for kw in ["사업", "창업", "자영업", "business", "startup", "entrepreneur"]):
            return (mapped_theme, "entrepreneurship")
        elif any(kw in q for kw in ["취업", "취직", "입사", "job", "employment", "hire"]):
            return (mapped_theme, "job_search")
        elif any(kw in q for kw in ["이직", "퇴사", "전직", "resign", "quit", "change job"]):
            return (mapped_theme, "career_change")
        elif any(kw in q for kw in ["승진", "promotion", "raise"]):
            return (mapped_theme, "promotion")
        elif any(kw in q for kw in ["직장", "회사", "상사", "동료", "workplace", "boss", "colleague"]):
            return (mapped_theme, "workplace")

    elif user_question and mapped_theme == "love":
        q = user_question.lower()
        if any(kw in q for kw in ["짝사랑", "고백", "crush", "confess"]):
            return (mapped_theme, "crush")
        elif any(kw in q for kw in ["헤어", "이별", "breakup", "separate"]):
            return (mapped_theme, "breakup")
        elif any(kw in q for kw in ["결혼", "약혼", "marriage", "wedding"]):
            return (mapped_theme, "marriage")
        elif any(kw in q for kw in ["재회", "다시", "reconcile", "ex"]):
            return (mapped_theme, "reconciliation")
        elif any(kw in q for kw in ["만남", "소개팅", "dating", "meet"]):
            return (mapped_theme, "new_love")

    elif user_question and mapped_theme == "wealth":
        q = user_question.lower()
        if any(kw in q for kw in ["투자", "주식", "코인", "invest", "stock", "crypto"]):
            return (mapped_theme, "investment")
        elif any(kw in q for kw in ["빚", "대출", "부채", "debt", "loan"]):
            return (mapped_theme, "debt")
        elif any(kw in q for kw in ["저축", "절약", "save", "saving"]):
            return (mapped_theme, "saving")

    return (mapped_theme, spread_id)


# ===============================================================
# 🎴 AI 특유 표현 후처리 필터
# ===============================================================
def _clean_ai_phrases(text: str) -> str:
    """
    Remove AI-sounding phrases from tarot interpretations.
    Makes output more natural and less robotic.
    """
    import re

    # AI 특유의 한국어 표현 패턴
    ai_patterns_ko = [
        (r'~하시는군요\.?', ''),
        (r'~느끼실 수 있어요\.?', ''),
        (r'~하시면 좋을 것 같습니다\.?', ''),
        (r'~해보시는 건 어떨까요\?', ''),
        (r'긍정적인 에너지가 느껴지네요\.?', ''),
        (r'좋은 결과가 있을 거예요\.?', ''),
        (r'잘 될 거예요\.?', ''),
        (r'걱정하지 마세요\.?', ''),
        (r'자신감을 가지시면 좋겠습니다\.?', ''),
        (r'~을 나타냅니다\.', '다.'),
        (r'~을 보여주고 있습니다\.', '다.'),
        (r'~라고 할 수 있습니다\.', '다.'),
        (r'희망적인 메시지를 전하고 있네요\.?', ''),
        (r'응원합니다\.?', ''),
        (r'파이팅이에요\.?', ''),
        (r'화이팅!?', ''),
    ]

    # AI 특유의 영어 표현 패턴
    ai_patterns_en = [
        (r'I hope this helps\.?', ''),
        (r'Feel free to ask.*', ''),
        (r'I\'m here to help\.?', ''),
        (r'This suggests that you should\.?', 'This suggests'),
        (r'It\'s important to remember that\.?', ''),
        (r'positive energy', 'energy'),
    ]

    result = text
    for pattern, replacement in ai_patterns_ko + ai_patterns_en:
        result = re.sub(pattern, replacement, result)

    # 연속된 공백/마침표 정리
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\.+', '.', result)
    result = result.strip()

    return result


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


# ===============================================================
# JUNGIAN COUNSELING ENDPOINTS (심리상담)
# ===============================================================

@app.route("/api/counseling/chat", methods=["POST"])
def counseling_chat():
    """
    융 심리학 기반 상담 채팅 엔드포인트
    - 위기 감지 자동화
    - RAG + RuleEngine 기반 치료적 개입
    - 사주/점성/타로 컨텍스트 통합
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling engine not available"}), 501

    try:
        data = request.get_json(force=True)
        user_message = data.get("message", "")
        session_id = data.get("session_id")

        # 사주/점성/타로 컨텍스트
        saju_data = data.get("saju")
        astro_data = data.get("astro")
        tarot_data = data.get("tarot")

        if not user_message.strip():
            return jsonify({"status": "error", "message": "Message is required"}), 400

        engine = get_counseling_engine()
        if not engine:
            return jsonify({"status": "error", "message": "Counseling engine initialization failed"}), 500

        # 세션 가져오기 또는 생성
        session = None
        if session_id:
            session = engine.get_session(session_id)

        # 융 심리학 컨텍스트 통합 처리
        result = engine.process_with_jung_context(
            user_message=user_message,
            session=session,
            saju_data=saju_data,
            astro_data=astro_data,
            tarot_data=tarot_data
        )

        return jsonify({
            "status": "success",
            "response": result["response"],
            "session_id": result["session_id"],
            "phase": result.get("phase"),
            "crisis_detected": result.get("crisis_detected", False),
            "severity": result.get("severity"),
            "should_continue": result.get("should_continue", True),
            "jung_context": result.get("jung_context", {})
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/chat failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/therapeutic-questions", methods=["POST"])
def therapeutic_questions():
    """
    융 심리학 기반 치료적 질문 생성
    - 테마별 맞춤 질문
    - 원형(archetype)별 질문
    - 시맨틱 검색 기반 질문 추천
    """
    if not HAS_COUNSELING:
        return jsonify({"status": "error", "message": "Counseling engine not available"}), 501

    try:
        data = request.get_json(force=True)
        theme = data.get("theme")
        user_message = data.get("user_message", "")
        archetype = data.get("archetype")
        question_type = data.get("question_type", "deepening")

        engine = get_counseling_engine()
        if not engine:
            return jsonify({"status": "error", "message": "Counseling engine initialization failed"}), 500

        # 기본 치료적 질문
        question = engine.get_therapeutic_question(
            theme=theme,
            archetype=archetype,
            question_type=question_type
        )

        # RAG 기반 추가 질문 (사용자 메시지가 있는 경우)
        rag_questions = []
        if user_message and engine.jungian_rag:
            intervention = engine.jungian_rag.get_therapeutic_intervention(
                user_message,
                context={"theme": theme}
            )
            rag_questions = intervention.get("recommended_questions", [])

        return jsonify({
            "status": "success",
            "question": question,
            "rag_questions": rag_questions[:3],
            "theme": theme,
            "archetype": archetype
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/therapeutic-questions failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/health", methods=["GET"])
def counseling_health():
    """상담 엔진 상태 확인"""
    if not HAS_COUNSELING:
        return jsonify({
            "status": "unavailable",
            "message": "Counseling engine not loaded"
        }), 501

    try:
        engine = get_counseling_engine()
        if not engine:
            return jsonify({
                "status": "error",
                "message": "Counseling engine initialization failed"
            }), 500

        is_healthy, status_message = engine.health_check()

        return jsonify({
            "status": "healthy" if is_healthy else "degraded",
            "message": status_message,
            "has_openai": engine.client is not None,
            "model": engine.model_name,
            "has_rag": engine.jungian_rag is not None
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/health failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===============================================================
# RLHF FEEDBACK LEARNING ENDPOINTS
# ===============================================================

# ===============================================================
# BADGE SYSTEM ENDPOINTS
# ===============================================================

# ===============================================================
# AGENTIC RAG ENDPOINTS (Next Level Features)
# ===============================================================

# ===============================================================
# PREDICTION ENGINE ENDPOINTS (v5.0)
# 대운/세운 + 트랜짓 기반 예측 시스템
# ===============================================================

# ===============================================================
# THEME ENDPOINTS - Moved to routers/theme_routes.py
# ===============================================================


# =============================================================================
# FORTUNE SCORE API (v1.0) - Real-time Saju+Astrology Unified Score
# =============================================================================

# =========================================================
# 간이 만세력 계산 (Daily Fortune용)
# =========================================================
def _calculate_simple_saju(birth_date: str, birth_time: str = "12:00") -> dict:
    """
    생년월일시로 기본 사주 데이터 계산 (만세력 간이 버전)
    """
    from datetime import datetime as dt_module

    # 천간/지지 데이터
    STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    STEM_ELEMENTS = {"甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
                     "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"}
    BRANCH_ELEMENTS = {"子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
                       "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"}

    # 십신 계산 헬퍼
    def get_sibsin(day_stem: str, target_stem: str) -> str:
        dm_idx = STEMS.index(day_stem)
        t_idx = STEMS.index(target_stem)
        diff = (t_idx - dm_idx) % 10
        sibsin_map = {0: "비견", 1: "겁재", 2: "식신", 3: "상관", 4: "편재",
                      5: "정재", 6: "편관", 7: "정관", 8: "편인", 9: "정인"}
        return sibsin_map.get(diff, "비견")

    try:
        # Parse birth date
        bd = dt_module.strptime(birth_date, "%Y-%m-%d")
        year, month, day = bd.year, bd.month, bd.day

        # Parse birth time
        hour = 12
        if birth_time:
            try:
                hour = int(birth_time.split(":")[0])
            except (ValueError, IndexError, AttributeError):
                hour = 12

        # 년주 계산 (1984=甲子 기준)
        year_offset = (year - 1984) % 60
        year_stem = STEMS[year_offset % 10]
        year_branch = BRANCHES[year_offset % 12]

        # 월주 계산 (간략화 - 실제로는 절기 고려 필요)
        month_branch_idx = (month + 1) % 12  # 寅월(1월)부터 시작
        month_branch = BRANCHES[month_branch_idx]
        # 월간 계산 (년간 기준)
        year_stem_idx = STEMS.index(year_stem)
        month_stem_idx = (year_stem_idx * 2 + month) % 10
        month_stem = STEMS[month_stem_idx]

        # 일주 계산 (JDN 기반)
        a = (14 - month) // 12
        y = year + 4800 - a
        m = month + 12 * a - 3
        jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
        day_offset = (jdn - 11) % 60  # 甲子일 보정
        day_stem = STEMS[day_offset % 10]
        day_branch = BRANCHES[day_offset % 12]

        # 시주 계산
        hour_branch_idx = ((hour + 1) // 2) % 12
        hour_branch = BRANCHES[hour_branch_idx]
        day_stem_idx = STEMS.index(day_stem)
        hour_stem_idx = (day_stem_idx * 2 + hour_branch_idx) % 10
        hour_stem = STEMS[hour_stem_idx]

        # 일간 (day master)
        dm_element = STEM_ELEMENTS[day_stem]

        # 십신 분포 계산
        sibsin_dist = {}
        for stem in [year_stem, month_stem, hour_stem]:
            s = get_sibsin(day_stem, stem)
            sibsin_dist[s] = sibsin_dist.get(s, 0) + 1

        # 오늘 일진 계산
        today = dt_module.now()
        today_jdn = today.day + (153 * ((today.month + 12 * ((14 - today.month) // 12) - 3)) + 2) // 5 + \
                    365 * (today.year + 4800 - ((14 - today.month) // 12)) + \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 4 - \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 100 + \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 400 - 32045
        today_offset = (today_jdn - 11) % 60
        today_stem = STEMS[today_offset % 10]
        today_branch = BRANCHES[today_offset % 12]
        today_element = STEM_ELEMENTS[today_stem]

        # 형충회합 간이 계산
        CHONG_PAIRS = [("子", "午"), ("丑", "未"), ("寅", "申"), ("卯", "酉"), ("辰", "戌"), ("巳", "亥")]
        HAP_PAIRS = [("子", "丑"), ("寅", "亥"), ("卯", "戌"), ("辰", "酉"), ("巳", "申"), ("午", "未")]

        natal_branches = [year_branch, month_branch, day_branch, hour_branch]
        chung_list = []
        hap_list = []
        for b in natal_branches:
            if (b, today_branch) in CHONG_PAIRS or (today_branch, b) in CHONG_PAIRS:
                chung_list.append(f"{b}-{today_branch}")
            if (b, today_branch) in HAP_PAIRS or (today_branch, b) in HAP_PAIRS:
                hap_list.append(f"{b}-{today_branch}")

        return {
            "dayMaster": {"name": day_stem, "element": dm_element},
            "pillars": {
                "year": year_stem + year_branch,
                "month": month_stem + month_branch,
                "day": day_stem + day_branch,
                "time": hour_stem + hour_branch,
            },
            "unse": {
                "iljin": [{"gan": today_stem, "ji": today_branch, "element": today_element}],
                "monthly": [{"element": STEM_ELEMENTS.get(month_stem, "土")}],
                "annual": [{"element": STEM_ELEMENTS.get(year_stem, "土")}],
            },
            "advancedAnalysis": {
                "sibsin": {"distribution": sibsin_dist},
                "hyeongchung": {"chung": chung_list, "hap": hap_list},
                "yongsin": {"primary": {"element": dm_element}},  # 간이 용신
                "geokguk": {"grade": "중"},
            },
        }
    except Exception as e:
        logger.warning(f"[SimpleSaju] Calculation error: {e}")
        # Fallback minimal data
        return {
            "dayMaster": {"name": "甲", "element": "木"},
            "pillars": {"year": "甲子", "month": "甲寅", "day": "甲午", "time": "甲子"},
            "unse": {"iljin": [{"element": "木"}], "monthly": [{"element": "木"}], "annual": [{"element": "木"}]},
            "advancedAnalysis": {
                "sibsin": {"distribution": {}},
                "hyeongchung": {"chung": [], "hap": []},
            },
        }


def domain_rag_search():
    """
    Lightweight domain search over precomputed embeddings.
    body: { "domain": "destiny_map|tarot|dream|iching", "query": "...", "top_k": 5 }
    """
    if not HAS_DOMAIN_RAG:
        return jsonify({"status": "error", "message": "DomainRAG not available"}), 501

    def _expand_tarot_query(query: str) -> str:
        """Add lightweight Korean hints when English tarot queries return empty."""
        lower = query.lower()
        extras = []
        if any(k in lower for k in ["business", "startup", "entrepreneur", "start a business", "company"]):
            extras.append("사업 창업")
        if any(k in lower for k in ["career", "job", "work", "promotion", "interview", "resume"]):
            extras.append("직장 커리어 이직")
        if any(k in lower for k in ["love", "relationship", "dating", "partner", "marriage", "breakup", "ex"]):
            extras.append("연애 관계 결혼")
        if any(k in lower for k in ["travel", "trip", "journey", "move", "relocation", "relocate"]):
            extras.append("여행 이동 이사")
        if any(k in lower for k in ["blocking", "blockage", "stuck", "progress", "obstacle", "challenge"]):
            extras.append("장애물 정체 성장")
        if any(k in lower for k in ["strength", "strengths", "talent", "ability"]):
            extras.append("강점 재능")
        if any(k in lower for k in ["money", "finance", "financial", "invest", "investment", "stock", "stocks", "crypto", "bitcoin"]):
            extras.append("재물 돈 투자")
        if any(k in lower for k in ["health", "ill", "sick", "anxiety", "stress", "depression", "mental"]):
            extras.append("건강 마음 불안")
        if any(k in lower for k in ["decision", "choice", "choose", "should i", "which", "either", "vs"]):
            extras.append("선택 결정")
        if any(k in lower for k in ["timing", "when", "soon", "next", "this year", "next year"]):
            extras.append("타이밍 시기")
        if any(k in lower for k in ["family", "parents", "child", "children"]):
            extras.append("가족 관계")
        if any(k in lower for k in ["study", "school", "exam", "test"]):
            extras.append("시험 공부")

        # Korean keywords → English hints (help when corpus is English-heavy)
        if any(k in query for k in ["사업", "창업", "자영업", "스타트업"]):
            extras.append("business startup")
        if any(k in query for k in ["직장", "커리어", "이직", "취업", "직무", "면접", "승진", "연봉", "업무"]):
            extras.append("career job work")
        if any(k in query for k in ["연애", "사랑", "관계", "결혼", "이별", "재회", "궁합", "썸", "짝사랑", "전남친", "전여친", "그 사람", "상대", "상대방", "마음", "호감"]):
            extras.append("love relationship")
        if any(k in query for k in ["돈", "재물", "금전", "재정", "투자", "주식", "코인", "부동산", "대출", "빚", "저축", "수입", "월급", "수익"]):
            extras.append("money finance investment")
        if any(k in query for k in ["건강", "몸", "우울", "불안", "스트레스", "병", "치료", "회복", "멘탈"]):
            extras.append("health stress")
        if any(k in query for k in ["결정", "선택", "갈림길", "할까", "될까", "타이밍", "시기", "언제"]):
            extras.append("decision timing")
        if any(k in query for k in ["여행", "이사", "이동", "출장"]):
            extras.append("travel move")
        if any(k in query for k in ["강점", "장점", "재능", "능력"]):
            extras.append("strength identity")
        if any(k in query for k in ["막힘", "장애물", "정체", "진전", "방해"]):
            extras.append("obstacle growth")
        if any(k in query for k in ["가족", "부모", "자녀", "아이"]):
            extras.append("family")
        if any(k in query for k in ["공부", "시험", "합격", "수능", "자격증", "유학", "학업"]):
            extras.append("study exam")
        if not extras:
            return query
        return f"{query} | {' '.join(extras)}"

    def _fallback_tarot_queries(query: str) -> list:
        """Provide compact fallback queries when expanded search still returns empty."""
        lower = query.lower()
        fallbacks = []
        if any(k in lower for k in ["business", "startup", "entrepreneur", "start a business", "company"]):
            fallbacks.extend(["business", "career"])
        if any(k in lower for k in ["career", "job", "work", "promotion", "interview", "resume"]):
            fallbacks.extend(["career", "job"])
        if any(k in lower for k in ["love", "relationship", "dating", "partner", "marriage", "breakup", "ex"]):
            fallbacks.extend(["love", "relationship"])
        if any(k in lower for k in ["money", "finance", "financial", "invest", "investment", "stock", "stocks", "crypto", "bitcoin"]):
            fallbacks.extend(["money", "finance"])
        if any(k in lower for k in ["health", "ill", "sick", "anxiety", "stress", "depression", "mental"]):
            fallbacks.extend(["health", "stress"])
        if any(k in lower for k in ["decision", "choice", "choose", "should i", "which", "either", "vs"]):
            fallbacks.extend(["decision", "timing"])
        if any(k in lower for k in ["travel", "trip", "journey", "move", "relocation", "relocate"]):
            fallbacks.extend(["travel", "journey"])
        if any(k in lower for k in ["blocking", "blockage", "stuck", "progress", "obstacle", "challenge"]):
            fallbacks.extend(["obstacle", "challenge"])
        if any(k in lower for k in ["strength", "strengths", "talent", "ability"]):
            fallbacks.extend(["strength", "identity"])
        if any(k in lower for k in ["timing", "when", "soon", "next", "this year", "next year"]):
            fallbacks.extend(["timing", "when"])
        if any(k in lower for k in ["family", "parents", "child", "children"]):
            fallbacks.extend(["family"])
        if any(k in lower for k in ["study", "school", "exam", "test"]):
            fallbacks.extend(["study", "exam"])
        if any(k in query for k in ["사업", "창업", "자영업", "스타트업"]):
            fallbacks.extend(["business", "career"])
        if any(k in query for k in ["직장", "커리어", "이직", "취업", "직무", "면접", "승진", "연봉", "업무"]):
            fallbacks.extend(["career", "job"])
        if any(k in query for k in ["연애", "사랑", "관계", "결혼", "이별", "재회", "궁합", "썸", "짝사랑", "전남친", "전여친", "그 사람", "상대", "상대방", "마음", "호감"]):
            fallbacks.extend(["love", "relationship"])
        if any(k in query for k in ["돈", "재물", "금전", "재정", "투자", "주식", "코인", "부동산", "대출", "빚", "저축", "수입", "월급", "수익"]):
            fallbacks.extend(["money", "finance"])
        if any(k in query for k in ["건강", "몸", "우울", "불안", "스트레스", "병", "치료", "회복", "멘탈"]):
            fallbacks.extend(["health", "stress"])
        if any(k in query for k in ["결정", "선택", "갈림길", "할까", "될까", "타이밍", "시기", "언제"]):
            fallbacks.extend(["decision", "timing"])
        if any(k in query for k in ["여행", "이사", "이동", "출장"]):
            fallbacks.extend(["travel", "journey"])
        if any(k in query for k in ["강점", "장점", "재능", "능력"]):
            fallbacks.extend(["strength", "identity"])
        if any(k in query for k in ["막힘", "장애물", "정체", "진전", "방해"]):
            fallbacks.extend(["obstacle", "challenge"])
        if any(k in query for k in ["가족", "부모", "자녀", "아이"]):
            fallbacks.extend(["family"])
        if any(k in query for k in ["공부", "시험", "합격", "수능", "자격증", "유학", "학업"]):
            fallbacks.extend(["study", "exam"])
        # De-dup while preserving order
        seen = set()
        deduped = []
        for item in fallbacks:
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped

    try:
        data = request.get_json(force=True)
        domain = (data.get("domain") or "").strip()
        query = (data.get("query") or "").strip()
        top_k = int(data.get("top_k", 5))
        top_k = max(1, min(top_k, 20))

        if not query:
            return jsonify({"status": "error", "message": "query is required"}), 400

        rag = get_domain_rag()
        if not rag:
            return jsonify({"status": "error", "message": "DomainRAG not available"}), 501

        if not domain or domain not in DOMAIN_RAG_DOMAINS:
            return jsonify({
                "status": "error",
                "message": f"domain must be one of {DOMAIN_RAG_DOMAINS}",
            }), 400

        rag.load_domain(domain)

        results = rag.search(domain, query, top_k=top_k)
        context = rag.get_context(domain, query, top_k=min(top_k, 3), max_chars=1500)
        expanded_query = ""

        fallback_query = ""
        if domain == "tarot" and not results:
            expanded_query = _expand_tarot_query(query)
            if expanded_query != query:
                results = rag.search(domain, expanded_query, top_k=top_k)
                context = rag.get_context(domain, expanded_query, top_k=min(top_k, 3), max_chars=1500)
        if domain == "tarot" and not results:
            for candidate in _fallback_tarot_queries(query):
                results = rag.search(domain, candidate, top_k=top_k)
                context = rag.get_context(domain, candidate, top_k=min(top_k, 3), max_chars=1500)
                if results:
                    fallback_query = candidate
                    break

        return jsonify({
            "status": "success",
            "domain": domain,
            "query": query,
            "expanded_query": expanded_query or None,
            "fallback_query": fallback_query or None,
            "results": results,
            "context": context,
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/search/domain failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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


# ===============================================================
# COMPATIBILITY ENDPOINTS - Moved to routers/compatibility_routes.py
# ===============================================================


# System capabilities
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
            "numerology": HAS_NUMEROLOGY,
            "icp": HAS_ICP,
        },
        "version": "5.3.0-numerology-icp",
    })


# ===============================================================
# NUMEROLOGY ENDPOINTS - Moved to routers/numerology_routes.py
# ===============================================================

# ===============================================================
# ICP ENDPOINTS - Moved to routers/icp_routes.py
# ===============================================================

# ===============================================================
# SESSION SUMMARY API - Auto-generate counseling session summaries
# ===============================================================

# ============================================================
# SAJU-ONLY COUNSELOR ENDPOINTS
# ============================================================

def saju_counselor_init():
    """
    Initialize saju-only counselor session with pre-fetched RAG data.
    Similar to /counselor/init but focuses only on saju knowledge.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        has_saju_payload = _has_saju_payload(saju_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and not has_saju_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[SAJU-COUNSELOR-INIT] Invalid birth format for missing payload")
                    return jsonify({"status": "error", "message": _build_birth_format_message(locale)}), 400
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=True,
                missing_astro=False,
            )
            logger.warning("[SAJU-COUNSELOR-INIT] Missing computed saju payload")
            return jsonify({"status": "error", "message": missing_message}), 400

        logger.info(f"[SAJU-COUNSELOR-INIT] id={g.request_id} theme={theme}")

        # Compute saju if not provided but birth info is available
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
                logger.info(f"[SAJU-COUNSELOR-INIT] Computed simple saju from birth: {saju_data.get('dayMaster', {})}")
            except Exception as e:
                logger.warning(f"[SAJU-COUNSELOR-INIT] Failed to compute simple saju: {e}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        start_time = time.time()

        # Pre-fetch saju-specific RAG data only (no astrology)
        rag_data = {
            "graph_nodes": [],
            "corpus_quotes": [],
            "persona_context": {},
        }

        # Load saju-specific graph rules
        if HAS_GRAPH_RAG:
            try:
                from backend_ai.app.saju_astro_rag import search_graphs
                # Query saju-specific rules
                day_master = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
                queries = [
                    f"사주 일간 {day_master} 특성",
                    f"오행 균형 분석",
                    f"대운 세운 해석",
                    f"사주 {theme} 운세",
                ]
                for q in queries:
                    nodes = search_graphs(q, top_k=3)
                    for node in nodes:
                        text = node.get("description") or node.get("label") or ""
                        if text:
                            rag_data["graph_nodes"].append(text)
            except Exception as e:
                logger.warning(f"[SAJU-COUNSELOR-INIT] Graph RAG failed: {e}")

        prefetch_time_ms = int((time.time() - start_time) * 1000)
        rag_data["prefetch_time_ms"] = prefetch_time_ms

        # Store in session cache
        set_session_rag_cache(session_id, {
            "rag_data": rag_data,
            "saju_data": saju_data,
            "astro_data": {},  # No astrology data
            "theme": theme,
            "counselor_type": "saju",
        })

        return jsonify({
            "status": "success",
            "session_id": session_id,
            "prefetch_time_ms": prefetch_time_ms,
            "data_summary": {
                "graph_nodes": len(rag_data.get("graph_nodes", [])),
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /saju/counselor/init failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def saju_ask_stream():
    """
    Streaming chat for saju-only counselor.
    Uses Server-Sent Events (SSE) for real-time responses.
    Focuses exclusively on saju interpretation without astrology.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        saju_data = data.get("saju") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")
        prompt = (data.get("prompt") or "")[:1500]
        session_id = data.get("session_id")
        conversation_history = data.get("history") or []
        user_context = data.get("user_context") or {}

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        logger.info(f"[SAJU-ASK-STREAM] id={g.request_id} theme={theme} locale={locale}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        rag_context = ""
        if session_id:
            session_cache = get_session_rag_cache(session_id)
            if session_cache:
                if not saju_data:
                    saju_data = session_cache.get("saju_data", {})

                rag_data = session_cache.get("rag_data", {})
                if rag_data.get("graph_nodes"):
                    rag_context += "\n[사주 관련 지식]\n"
                    rag_context += "\n".join(rag_data["graph_nodes"][:8])

        # Compute saju if not provided (optional fallback)
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_saju_payload(saju_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = _calculate_simple_saju(
                    birth_data["date"],
                    birth_data["time"],
                )
                saju_data = normalize_day_master(saju_data)
            except Exception as e:
                logger.warning(f"[SAJU-ASK-STREAM] Failed to compute simple saju: {e}")

        has_saju_payload = _has_saju_payload(saju_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and not has_saju_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[SAJU-ASK-STREAM] Invalid birth format for missing payload")
                    return _sse_error_response(_build_birth_format_message(locale))
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=True,
                missing_astro=False,
            )
            logger.warning("[SAJU-ASK-STREAM] Missing computed saju payload")
            return _sse_error_response(missing_message)

        # Build detailed saju context (NO astrology)
        saju_detail = _build_detailed_saju(saju_data)

        # Current date
        from datetime import datetime
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"

        # Build user context section
        user_context_section = ""
        if user_context:
            persona = user_context.get("persona", {})
            if persona.get("sessionCount", 0) > 0:
                user_context_section = f"\n[이전 상담]\n• {persona.get('sessionCount', 0)}회 방문 고객\n"

        # Build saju-focused system prompt
        if locale == "ko":
            system_prompt = f"""너는 사주(四柱) 전문 상담사다. 동양 명리학 전문가로서 상담해.

절대 규칙:
1. 인사 금지 - 바로 분석 시작
2. 사주 분석에만 집중 - 서양 점성술 언급 금지
3. 제공된 대운/세운 데이터만 사용
4. 한국 사주 용어 사용 (일간, 용신, 대운, 세운, 오행 등)

{current_date_str}

[사주 명식]
{saju_detail}

{rag_context}
{user_context_section}

응답 형식:
【일간】 일간의 특성과 현재 상태
【대운】 현재 대운 분석
【세운】 올해 세운 분석
【오행】 오행 균형과 보완 방법
【조언】 2-3개 실천 조언

200-300단어로 답변."""
        else:
            system_prompt = f"""You are a Saju (Four Pillars of Destiny) counselor specializing in Eastern fortune-telling.

RULES:
1. NO GREETING - Start directly with analysis
2. Focus ONLY on Saju - NO Western astrology
3. Use only provided daeun/seun data
4. Use proper Saju terminology

{current_date_str}

[Saju Chart]
{saju_detail}

{rag_context}
{user_context_section}

Response format:
【Day Master】 Characteristics and current state
【Major Luck】 Current major luck cycle
【Annual Luck】 This year's luck
【Five Elements】 Balance and recommendations
【Advice】 2-3 practical actions

200-300 words."""

        # Full prompt
        full_prompt = f"{system_prompt}\n\n사용자 질문: {prompt}"

        default_model = os.getenv("CHAT_MODEL") or os.getenv("FUSION_MODEL") or "gpt-4.1"
        default_temp = _clamp_temperature(_coerce_float(os.getenv("CHAT_TEMPERATURE")), 0.75)
        model_name, temperature, _ab_variant = _select_model_and_temperature(
            data,
            default_model,
            default_temp,
            session_id,
            g.request_id,
        )

        # Streaming response
        def generate():
            try:
                max_tokens = _get_int_env("SAJU_ASK_MAX_TOKENS", 700, min_value=300, max_value=2000)
                response = openai_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                full_text = ""
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        full_text += chunk.choices[0].delta.content

                if not full_text.strip():
                    yield "data: [DONE]\n\n"
                    return

                addendum = _build_missing_requirements_addendum(
                    full_text,
                    locale,
                    saju_data,
                    {},
                    now.date(),
                    require_saju=True,
                    require_astro=False,
                    require_timing=True,
                    require_caution=True,
                )
                if addendum:
                    full_text = _insert_addendum(full_text, addendum)

                full_text = _format_korean_spacing(full_text)
                if locale == "ko" and not full_text.rstrip().endswith("?"):
                    followup_inline = "지금 가장 궁금한 포인트가 뭐예요?"
                    separator = "" if (full_text.endswith((" ", "\n", "\t")) or not full_text) else " "
                    full_text += f"{separator}{followup_inline}"

                chunk_size = _get_stream_chunk_size()
                for piece in _chunk_text(full_text, chunk_size):
                    yield _to_sse_event(piece)

                # Add follow-up questions
                follow_ups = [
                    "올해 세운이 제 운세에 어떤 영향을 주나요?",
                    "제 용신은 무엇인가요?",
                    "오행 균형을 어떻게 맞출 수 있나요?",
                ] if locale == "ko" else [
                    "How does this year's luck affect me?",
                    "What is my favorable element?",
                    "How can I balance my five elements?",
                ]
                yield f"data: ||FOLLOWUP||{json.dumps(follow_ups, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[SAJU-ASK-STREAM] Streaming error: {e}")
                yield f"data: 오류가 발생했습니다: {str(e)}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /saju/ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# ASTROLOGY-ONLY COUNSELOR ENDPOINTS
# ============================================================

def astrology_counselor_init():
    """
    Initialize astrology-only counselor session with pre-fetched RAG data.
    Similar to /counselor/init but focuses only on Western astrology.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        astro_data = data.get("astro") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and not has_astro_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[ASTROLOGY-COUNSELOR-INIT] Invalid birth format for missing payload")
                    return jsonify({"status": "error", "message": _build_birth_format_message(locale)}), 400
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=False,
                missing_astro=True,
            )
            logger.warning("[ASTROLOGY-COUNSELOR-INIT] Missing computed astro payload")
            return jsonify({"status": "error", "message": missing_message}), 400

        logger.info(f"[ASTROLOGY-COUNSELOR-INIT] id={g.request_id} theme={theme}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        start_time = time.time()

        # Compute astrology if not provided but birth info is available (optional fallback)
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_astro_payload(astro_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                lat = birth_data.get("lat") or birth_data.get("latitude") or 37.5665
                lon = birth_data.get("lon") or birth_data.get("longitude") or 126.9780
                date_parts = birth_data["date"].split("-")
                time_parts = birth_data["time"].split(":")
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
                logger.warning(f"[ASTROLOGY-COUNSELOR-INIT] Failed to compute astro: {e}")

        # Pre-fetch astrology-specific RAG data only (no saju)
        rag_data = {
            "graph_nodes": [],
            "corpus_quotes": [],
        }

        # Load astrology-specific graph rules
        try:
            from backend_ai.app.graph_rag import get_graph_rag
            graph_rag = get_graph_rag()
            if graph_rag:
                sun_sign = astro_data.get("sun", {}).get("sign", "")
                moon_sign = astro_data.get("moon", {}).get("sign", "")
                queries = [
                    f"태양 {sun_sign} 특성",
                    f"달 {moon_sign} 감정",
                    f"행성 트랜짓 영향",
                    f"점성술 {theme} 해석",
                ]
                for q in queries:
                    nodes = graph_rag.search(q, top_k=3)
                    rag_data["graph_nodes"].extend([n.get("text", "") for n in nodes if n.get("text")])
        except Exception as e:
            logger.warning(f"[ASTROLOGY-COUNSELOR-INIT] Graph RAG failed: {e}")

        prefetch_time_ms = int((time.time() - start_time) * 1000)
        rag_data["prefetch_time_ms"] = prefetch_time_ms

        # Store in session cache
        set_session_rag_cache(session_id, {
            "rag_data": rag_data,
            "saju_data": {},  # No saju data
            "astro_data": astro_data,
            "theme": theme,
            "counselor_type": "astrology",
        })

        return jsonify({
            "status": "success",
            "session_id": session_id,
            "astro": astro_data,  # Return computed astro data
            "prefetch_time_ms": prefetch_time_ms,
            "data_summary": {
                "graph_nodes": len(rag_data.get("graph_nodes", [])),
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] /astrology/counselor/init failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def astrology_ask_stream():
    """
    Streaming chat for astrology-only counselor.
    Uses Server-Sent Events (SSE) for real-time responses.
    Focuses exclusively on Western astrology without saju.
    """
    try:
        import json as json_mod
        raw_data = request.get_data(as_text=False)
        data = json_mod.loads(raw_data.decode('utf-8'))

        astro_data = data.get("astro") or {}
        birth_data = _normalize_birth_payload(data)
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")
        prompt = (data.get("prompt") or "")[:1500]
        session_id = data.get("session_id")
        conversation_history = data.get("history") or []
        user_context = data.get("user_context") or {}

        logger.info(f"[ASTROLOGY-ASK-STREAM] id={g.request_id} theme={theme} locale={locale}")

        # Check for pre-fetched RAG data from session
        session_cache = None
        rag_context = ""
        if session_id:
            session_cache = get_session_rag_cache(session_id)
            if session_cache:
                if not astro_data:
                    astro_data = session_cache.get("astro_data", {})

                rag_data = session_cache.get("rag_data", {})
                if rag_data.get("graph_nodes"):
                    rag_context += "\n[점성술 관련 지식]\n"
                    rag_context += "\n".join(rag_data["graph_nodes"][:8])

        # Compute astrology if not provided (optional fallback)
        if _bool_env("ALLOW_BIRTH_ONLY") and (not _has_astro_payload(astro_data)) and birth_data.get("date") and birth_data.get("time"):
            try:
                lat = birth_data.get("lat") or birth_data.get("latitude") or 37.5665
                lon = birth_data.get("lon") or birth_data.get("longitude") or 126.9780
                date_parts = birth_data["date"].split("-")
                time_parts = birth_data["time"].split(":")
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
                logger.warning(f"[ASTROLOGY-ASK-STREAM] Failed to compute astro: {e}")

        has_astro_payload = _has_astro_payload(astro_data)
        require_computed_payload = _is_truthy(os.getenv("REQUIRE_COMPUTED_PAYLOAD", "1"))
        if require_computed_payload and not has_astro_payload:
            if birth_data.get("date") or birth_data.get("time"):
                valid_birth, _err = validate_birth_data(birth_data.get("date"), birth_data.get("time"))
                if not valid_birth:
                    logger.warning("[ASTROLOGY-ASK-STREAM] Invalid birth format for missing payload")
                    return _sse_error_response(_build_birth_format_message(locale))
            missing_message = _build_missing_payload_message(
                locale,
                missing_saju=False,
                missing_astro=True,
            )
            logger.warning("[ASTROLOGY-ASK-STREAM] Missing computed astro payload")
            return _sse_error_response(missing_message)

        # Build detailed astrology context (NO saju)
        astro_detail = _build_detailed_astro(astro_data)

        # Current date
        from datetime import datetime
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]})"

        # Build user context section
        user_context_section = ""
        if user_context:
            persona = user_context.get("persona", {})
            if persona.get("sessionCount", 0) > 0:
                user_context_section = f"\n[이전 상담]\n• {persona.get('sessionCount', 0)}회 방문 고객\n"

        # Build astrology-focused system prompt
        if locale == "ko":
            system_prompt = f"""너는 서양 점성술 전문 상담사다. 출생 차트 분석과 행성 트랜짓 전문가야.

절대 규칙:
1. 인사 금지 - 바로 분석 시작
2. 서양 점성술에만 집중 - 사주/동양 역술 언급 금지
3. 점성술 용어 사용 (별자리, 하우스, 애스펙트, 트랜짓 등)
4. 구체적인 행성 위치와 각도 언급

{current_date_str}

[출생 차트]
{astro_detail}

{rag_context}
{user_context_section}

응답 형식:
【태양/달】 태양과 달 별자리의 핵심 성격
【상승궁】 어센던트가 외적 페르소나에 미치는 영향
【트랜짓】 현재 행성 트랜짓과 그 영향
【하우스】 질문과 관련된 하우스 배치
【조언】 2-3개 실천 조언

200-300단어로 답변."""
        else:
            system_prompt = f"""You are a Western Astrology counselor specializing in birth chart analysis.

RULES:
1. NO GREETING - Start directly with analysis
2. Focus ONLY on Western Astrology - NO Eastern fortune-telling
3. Use proper astrological terminology (signs, houses, aspects, transits)
4. Include specific planetary positions

{current_date_str}

[Birth Chart]
{astro_detail}

{rag_context}
{user_context_section}

Response format:
【Sun/Moon】 Core personality from Sun and Moon signs
【Rising】 Ascendant influence
【Transits】 Current planetary transits
【Houses】 Relevant house placements
【Guidance】 2-3 practical actions

200-300 words."""

        # Full prompt
        full_prompt = f"{system_prompt}\n\n사용자 질문: {prompt}"

        default_model = os.getenv("CHAT_MODEL") or os.getenv("FUSION_MODEL") or "gpt-4.1"
        default_temp = _clamp_temperature(_coerce_float(os.getenv("CHAT_TEMPERATURE")), 0.75)
        model_name, temperature, _ab_variant = _select_model_and_temperature(
            data,
            default_model,
            default_temp,
            session_id,
            g.request_id,
        )

        # Streaming response
        def generate():
            try:
                max_tokens = _get_int_env("ASTRO_ASK_MAX_TOKENS", 700, min_value=300, max_value=2000)
                response = openai_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                full_text = ""
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        full_text += chunk.choices[0].delta.content

                if not full_text.strip():
                    yield "data: [DONE]\n\n"
                    return

                addendum = _build_missing_requirements_addendum(
                    full_text,
                    locale,
                    {},
                    astro_data,
                    now.date(),
                    require_saju=False,
                    require_astro=True,
                    require_timing=True,
                    require_caution=True,
                )
                if addendum:
                    full_text = _insert_addendum(full_text, addendum)

                full_text = _format_korean_spacing(full_text)
                if locale == "ko" and not full_text.rstrip().endswith("?"):
                    followup_inline = "지금 가장 궁금한 포인트가 뭐예요?"
                    separator = "" if (full_text.endswith((" ", "\n", "\t")) or not full_text) else " "
                    full_text += f"{separator}{followup_inline}"

                chunk_size = _get_stream_chunk_size()
                for piece in _chunk_text(full_text, chunk_size):
                    yield _to_sse_event(piece)

                # Add follow-up questions
                follow_ups = [
                    "현재 행성 트랜짓이 제게 어떤 영향을 주나요?",
                    "제 상승궁에 대해 더 알려주세요",
                    "올해 주요 점성술적 이벤트는 무엇인가요?",
                ] if locale == "ko" else [
                    "How do current transits affect me?",
                    "Tell me more about my rising sign",
                    "What are the major astrological events this year?",
                ]
                yield f"data: ||FOLLOWUP||{json.dumps(follow_ups, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"[ASTROLOGY-ASK-STREAM] Streaming error: {e}")
                yield f"data: 오류가 발생했습니다: {str(e)}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        logger.exception(f"[ERROR] /astrology/ask-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# DESTINY MATRIX STORY - AI Generated Personal Destiny Analysis
# ============================================================

@app.route("/api/destiny-story/generate-stream", methods=["POST"])
def generate_destiny_story_stream():
    """
    Generate a personalized ~20,000 character destiny story using AI.
    Combines Eastern (Saju) and Western (Astrology) wisdom with ALL RAG data:
    - GraphRAG (지식 그래프)
    - CorpusRAG (융 심리학 인용)
    - PersonaEmbedRAG (융/스토아 철학 인사이트)
    - Cross-analysis (사주×점성 교차 분석)
    - 신살, 대운, 세운 정보
    Uses streaming for real-time response.
    """
    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        locale = data.get("locale", "ko")

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        # Extract key data - handle multiple naming conventions
        day_master = saju_data.get("dayMaster", "")
        if isinstance(day_master, dict):
            # Handle various frontend formats: { name, element } or { korean, hanja } or { heavenlyStem: { name } }
            day_master = (
                day_master.get("name") or  # Frontend format
                day_master.get("korean") or
                day_master.get("hanja") or
                day_master.get("heavenlyStem", {}).get("name") if isinstance(day_master.get("heavenlyStem"), dict) else None or
                day_master.get("heavenlyStem") or
                str(day_master)
            )

        pillars = saju_data.get("pillars", {})
        year_pillar = pillars.get("year", {})
        month_pillar = pillars.get("month", {})
        day_pillar = pillars.get("day", {})
        hour_pillar = pillars.get("hour", {})

        # Astrology data - handle both nested and flat formats
        def get_sign(data, key):
            """Extract sign from various formats"""
            val = data.get(key, {})
            if isinstance(val, dict):
                return val.get("sign", "") or val.get("zodiac", "") or val.get("name", "")
            return str(val) if val else ""

        # Also check astro.facts for nested data
        astro_facts = astro_data.get("facts", {})
        planets = astro_facts.get("planets", {}) if astro_facts else {}

        sun_sign = get_sign(astro_data, "sun") or get_sign(planets, "sun")
        moon_sign = get_sign(astro_data, "moon") or get_sign(planets, "moon")
        rising_sign = get_sign(astro_data, "ascendant") or astro_data.get("rising", "") or get_sign(astro_facts, "ascendant")

        # Additional astro planets
        mercury_sign = get_sign(astro_data, "mercury") or get_sign(planets, "mercury")
        venus_sign = get_sign(astro_data, "venus") or get_sign(planets, "venus")
        mars_sign = get_sign(astro_data, "mars") or get_sign(planets, "mars")
        jupiter_sign = get_sign(astro_data, "jupiter") or get_sign(planets, "jupiter")
        saturn_sign = get_sign(astro_data, "saturn") or get_sign(planets, "saturn")

        # 신살 (Special Stars) - handle both sinsal and shinsal naming
        shinsal = saju_data.get("shinsal", []) or saju_data.get("sinsal", []) or saju_data.get("specialStars", [])
        if isinstance(shinsal, dict):
            shinsal = list(shinsal.values())

        # 대운/세운 (Life Cycles)
        unse = saju_data.get("unse", {})
        daeun = unse.get("daeun", [])  # 10년 대운
        current_daeun = unse.get("currentDaeun", {})
        annual = unse.get("annual", [])  # 세운

        # 십신 (Ten Gods)
        ten_gods = saju_data.get("tenGods", {})

        # 오행 균형 - handle both elementCounts and fiveElements naming
        element_counts = saju_data.get("elementCounts", {}) or saju_data.get("fiveElements", {})
        # Convert English keys to Korean if needed
        if element_counts:
            korean_elements = {}
            key_map = {"wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수"}
            for k, v in element_counts.items():
                korean_key = key_map.get(k.lower(), k)
                korean_elements[korean_key] = v
            if any(k in key_map for k in element_counts.keys()):
                element_counts = korean_elements

        dominant_element = saju_data.get("dominantElement", "")

        is_korean = locale == "ko"

        # Debug log all extracted data
        logger.info(f"[DESTINY_STORY] Starting with ALL RAG data:")
        logger.info(f"  - dayMaster: {day_master}")
        logger.info(f"  - pillars: year={year_pillar}, month={month_pillar}, day={day_pillar}, hour={hour_pillar}")
        logger.info(f"  - astro: sun={sun_sign}, moon={moon_sign}, rising={rising_sign}")
        logger.info(f"  - planets: mercury={mercury_sign}, venus={venus_sign}, mars={mars_sign}")
        logger.info(f"  - shinsal: {shinsal}")
        logger.info(f"  - element_counts: {element_counts}")
        logger.info(f"  - locale: {locale}")

        # ============================================
        # PRE-FETCH ALL RAG DATA (before streaming)
        # ============================================
        yield_prefix = "data: "

        # Send initial status
        logger.info("[DESTINY_STORY] Pre-fetching RAG data...")

        rag_data = prefetch_all_rag_data(saju_data, astro_data, "life_path", locale)
        prefetch_time = rag_data.get("prefetch_time_ms", 0)
        logger.info(f"[DESTINY_STORY] RAG prefetch completed in {prefetch_time}ms")

        # Extract RAG results
        graph_nodes = rag_data.get("graph_nodes", [])
        graph_context = rag_data.get("graph_context", "")
        corpus_quotes = rag_data.get("corpus_quotes", [])
        persona_context = rag_data.get("persona_context", {})
        cross_analysis = rag_data.get("cross_analysis", "")
        domain_knowledge = rag_data.get("domain_knowledge", [])

        # Format RAG data for prompt
        def format_graph_nodes(nodes, limit=10):
            if not nodes:
                return "없음"
            formatted = []
            for n in nodes[:limit]:
                if isinstance(n, str):
                    formatted.append(f"• {n}")
                elif isinstance(n, dict):
                    text = n.get("text") or n.get("content") or n.get("node", "")
                    if text:
                        formatted.append(f"• {text[:200]}")
            return "\n".join(formatted) if formatted else "없음"

        def format_quotes(quotes, limit=5):
            if not quotes:
                return "없음"
            formatted = []
            for q in quotes[:limit]:
                text = q.get("text_ko") if is_korean else q.get("text_en")
                if not text:
                    text = q.get("text_ko") or q.get("text_en", "")
                source = q.get("source", "")
                if text:
                    formatted.append(f'"{text}" - {source}')
            return "\n".join(formatted) if formatted else "없음"

        def format_persona(ctx):
            if not ctx:
                return "없음"
            parts = []
            jung = ctx.get("jung", [])
            stoic = ctx.get("stoic", [])
            if jung:
                parts.append("[융 심리학 관점]")
                for j in jung[:3]:
                    parts.append(f"• {j}")
            if stoic:
                parts.append("[스토아 철학 관점]")
                for s in stoic[:3]:
                    parts.append(f"• {s}")
            return "\n".join(parts) if parts else "없음"

        def format_shinsal(stars):
            if not stars:
                return "없음"
            return ", ".join(str(s) for s in stars[:10])

        def format_daeun(cycles):
            if not cycles:
                return "없음"
            formatted = []
            for d in cycles[:5]:
                if isinstance(d, dict):
                    age = d.get("age", "")
                    stem = d.get("stem", "")
                    branch = d.get("branch", "")
                    formatted.append(f"{age}세: {stem}{branch}")
                else:
                    formatted.append(str(d))
            return ", ".join(formatted) if formatted else "없음"

        graph_nodes_text = format_graph_nodes(graph_nodes)
        quotes_text = format_quotes(corpus_quotes)
        persona_text = format_persona(persona_context)
        shinsal_text = format_shinsal(shinsal)
        daeun_text = format_daeun(daeun)

        # Format domain knowledge
        def format_domain(knowledge):
            if not knowledge:
                return "없음"
            formatted = []
            for item in knowledge[:5]:
                if isinstance(item, str):
                    formatted.append(f"• {item[:200]}")
                elif isinstance(item, dict):
                    text = item.get("text") or item.get("content") or item.get("rule", "")
                    if text:
                        formatted.append(f"• {text[:200]}")
            return "\n".join(formatted) if formatted else "없음"

        domain_text = format_domain(domain_knowledge)

        def generate_stream():
            """Generator for SSE streaming destiny story with ALL RAG data"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # Build the comprehensive prompt with ALL RAG data
                if is_korean:
                    system_prompt = """당신은 사람의 마음을 꿰뚫어보는 상담사입니다.
사주와 점성술 데이터를 바탕으로, 마치 오랜 친구처럼 따뜻하지만 날카롭게 이야기합니다.

# 핵심 원칙:
1. "운명의 서막", "우주", "별들의 교향곡" 같은 뻔한 표현 금지. 현실적으로 써라.
2. 누가 읽어도 "어? 이거 내 얘기인데?" 하고 소름돋게 구체적으로.
3. 실제 상황 예시를 들어라. "회의 중에 말 끊기는 거 싫어하죠?", "혼자 있을 때 갑자기 불안해진 적 있죠?"
4. 장점만 나열하지 말고, 아픈 곳도 정확히 짚어라. 그래야 신뢰가 생긴다.
5. 절대 사과하거나 "데이터가 부족합니다" 같은 말 금지. 바로 본문 시작.

# 융 & 스토아 인용 (적절한 타이밍에)
- 전체 15개 섹션 중 3~5곳에서 자연스럽게 인용 (매 섹션 X, 억지로 X)
- 이런 주제일 때 인용하면 좋다:
  * 그림자/단점/문제점 → 융 ("융은 말했죠: '그림자를 인식하는 것이...'")
  * 힘든 상황/스트레스 → 스토아 ("세네카는 말했습니다: '...'")
  * 무의식/숨겨진 면 → 융
  * 조언/앞으로 방향 → 스토아
- 내용과 자연스럽게 연결될 때만. 뜬금없이 끼워넣지 말 것.

# 문체:
- 친구한테 얘기하듯 편하게, 하지만 깊이있게
- "~하시죠?", "~그랬을 거예요" 처럼 독자에게 직접 말하기
- 뻔한 위로 말고 진짜 도움되는 조언
- 때로는 따끔하게, 때로는 다독이듯이"""

                    user_prompt = f"""이 사람의 사주와 점성술 데이터를 보고 15개 섹션으로 심층 분석해줘.
뻔한 말 말고, 읽는 사람이 "와 이거 진짜 나네" 하고 소름돋게 구체적으로 써줘.
바로 "## 1. 첫인상과 실제 당신" 으로 시작해. 인사나 설명 없이 바로 본문.

═══════════════════════════════════════════════════
[사주팔자 데이터]
═══════════════════════════════════════════════════
• 일주(日主/Day Master): {day_master}
• 년주(年柱): {year_pillar.get('stem', '')} {year_pillar.get('branch', '')}
• 월주(月柱): {month_pillar.get('stem', '')} {month_pillar.get('branch', '')}
• 일주(日柱): {day_pillar.get('stem', '')} {day_pillar.get('branch', '')}
• 시주(時柱): {hour_pillar.get('stem', '')} {hour_pillar.get('branch', '')}

• 주도적 오행: {dominant_element}
• 오행 분포: 목({element_counts.get('목', 0)}) 화({element_counts.get('화', 0)}) 토({element_counts.get('토', 0)}) 금({element_counts.get('금', 0)}) 수({element_counts.get('수', 0)})

• 십신(十神): {json.dumps(ten_gods, ensure_ascii=False) if ten_gods else '없음'}

═══════════════════════════════════════════════════
[신살 정보 - 특별한 별들]
═══════════════════════════════════════════════════
{shinsal_text}

═══════════════════════════════════════════════════
[대운과 세운 - 인생의 큰 흐름]
═══════════════════════════════════════════════════
• 대운 흐름: {daeun_text}
• 현재 대운: {json.dumps(current_daeun, ensure_ascii=False) if current_daeun else '정보 없음'}

═══════════════════════════════════════════════════
[서양 점성술 데이터]
═══════════════════════════════════════════════════
• 태양(Sun): {sun_sign}
• 달(Moon): {moon_sign}
• 상승궁(Rising): {rising_sign}
• 수성(Mercury): {mercury_sign}
• 금성(Venus): {venus_sign}
• 화성(Mars): {mars_sign}
• 목성(Jupiter): {jupiter_sign}
• 토성(Saturn): {saturn_sign}

═══════════════════════════════════════════════════
[지식 그래프 - 관련 지식]
═══════════════════════════════════════════════════
{graph_nodes_text}

═══════════════════════════════════════════════════
[융 심리학 인용 - 깊이 있는 통찰]
═══════════════════════════════════════════════════
{quotes_text}

═══════════════════════════════════════════════════
[페르소나 분석 - 철학적 관점]
═══════════════════════════════════════════════════
{persona_text}

═══════════════════════════════════════════════════
[동서양 교차 분석 결과]
═══════════════════════════════════════════════════
{cross_analysis[:2000] if cross_analysis else '없음'}

═══════════════════════════════════════════════════
[도메인 전문 지식 - 해석 원칙]
═══════════════════════════════════════════════════
{domain_text}

═══════════════════════════════════════════════════
[15개 섹션 - 현실적이고 구체적으로]
═══════════════════════════════════════════════════

## 1. 첫인상과 실제 당신
사람들이 처음 보는 당신 vs 진짜 당신. 왜 오해받는지, 실제론 어떤 사람인지.

## 2. 당신의 핵심 에너지 ({day_master})
이 사람의 기본 성향. 뭘 좋아하고, 뭘 못 참고, 어떤 상황에서 빛나는지.

## 3. 솔직히 말하면 이런 점이 문제야
장점 뒤에 숨은 단점. 본인도 알지만 고치기 힘든 패턴. 구체적 상황 예시 필수.

## 4. 연애할 때 당신
좋아하는 타입, 연애 패턴, 질리는 포인트, 헤어지는 이유까지. 도화살/금성 활용.

## 5. 돈과 일, 솔직한 얘기
맞는 직업, 돈 버는 스타일, 커리어에서 주의할 점. 십신 정보 활용.

## 6. 사람 관계에서 당신의 패턴
친구/가족/동료와의 관계. 갈등 원인, 상처받는 포인트, 관계 유지법.

## 7. 겉과 속이 다른 부분
{sun_sign} 태양(보여주는 나)과 {moon_sign} 달(진짜 감정). 왜 힘든지.

## 8. 소통/사랑/행동 스타일
수성({mercury_sign}) - 말하는 방식
금성({venus_sign}) - 사랑 표현법
화성({mars_sign}) - 화낼 때, 열정 쏟을 때

## 9. 당신만의 특별한 기운 ({shinsal_text})
신살이 주는 특수 능력과 주의점. 이게 왜 당신한테 있는지.

## 10. 사주랑 별자리가 말하는 공통점
동서양 분석이 일치하는 부분. 더 확실한 당신의 특성.

## 11. 인생 타이밍 ({daeun_text})
언제 잘 풀리고, 언제 조심해야 하는지. 대운 흐름으로 보는 인생 시기.

## 12. 어린 시절이 지금에 미친 영향
왜 그런 성격이 됐는지. 어릴 때 경험이 지금 패턴에 미친 영향.

## 13. 인정하기 싫지만 이런 면도 있어요
숨기고 싶은 부분, 무의식적 두려움, 회피하는 것들. 따뜻하지만 솔직하게.

## 14. 힘들 때 당신은
스트레스 받을 때 패턴, 회복하는 방법, 도움이 되는 것들.

## 15. 앞으로 이렇게 하면 좋겠어요
구체적이고 실천 가능한 조언. 뻔한 말 말고 진짜 도움되는 것만.

═══════════════════════════════════════════════════
★★★ 작성 규칙 ★★★
1. 각 섹션을 충분히 길게 쓰되, 뻔한 말 금지.
2. "~하시죠?", "~그런 적 있죠?" 처럼 독자에게 직접 말하듯이.
3. 읽는 사람이 소름돋을 정도로 구체적인 상황 예시를 들어줘.
4. 융/스토아 인용은 전체에서 3~5번, 적절한 타이밍에 자연스럽게.
   - 단점/그림자/무의식 얘기할 때 → 융 인용
   - 힘든 상황/조언 줄 때 → 스토아 인용
   예: "융은 말했죠: '의식하지 못한 것은 운명이 된다'"
5. 제공된 [융 심리학 인용]과 [페르소나 분석] 데이터 활용."""

                else:
                    system_prompt = """You are a master destiny analyst combining Eastern Saju wisdom, Western Astrology, and Jungian psychology.
Your interpretations are eerily accurate, as if you can see through the soul of the person.
You provide deep, specific analysis that makes readers feel "This is really me..."

You have access to:
- Complete Saju data (Day Master, Four Pillars, Ten Gods, Five Elements balance)
- Western Astrology data (Sun through Saturn, Rising sign)
- Shinsal (Special Stars) information
- Daeun and Seun (Life Cycles)
- Jung psychology quotes and insights
- Stoic philosophy perspectives
- East-West cross-analysis results

Use ALL this information to write a 20,000+ character deep analysis.

Writing Style:
- Second person perspective, speaking directly to the reader (You are...)
- Poetic and literary style with rich metaphors and imagery
- Naturally weave in Jung psychology quotes for depth
- Describe specific situations and emotions to evoke empathy
- Balance positive aspects with growth opportunities
- Each chapter should be at least 1,500 characters
- Use Daeun/Seun data to predict life transitions"""

                    user_prompt = f"""Based on ALL the following data, write a comprehensive destiny analysis story with **15 chapters**, totaling at least **20,000 characters**.

═══════════════════════════════════════════════════
[SAJU (Four Pillars) DATA]
═══════════════════════════════════════════════════
• Day Master: {day_master}
• Year Pillar: {year_pillar.get('stem', '')} {year_pillar.get('branch', '')}
• Month Pillar: {month_pillar.get('stem', '')} {month_pillar.get('branch', '')}
• Day Pillar: {day_pillar.get('stem', '')} {day_pillar.get('branch', '')}
• Hour Pillar: {hour_pillar.get('stem', '')} {hour_pillar.get('branch', '')}

• Dominant Element: {dominant_element}
• Element Distribution: Wood({element_counts.get('목', 0)}) Fire({element_counts.get('화', 0)}) Earth({element_counts.get('토', 0)}) Metal({element_counts.get('금', 0)}) Water({element_counts.get('수', 0)})

• Ten Gods: {json.dumps(ten_gods, ensure_ascii=False) if ten_gods else 'None'}

═══════════════════════════════════════════════════
[SHINSAL - Special Stars]
═══════════════════════════════════════════════════
{shinsal_text}

═══════════════════════════════════════════════════
[DAEUN & SEUN - Life Cycles]
═══════════════════════════════════════════════════
• Major Cycles: {daeun_text}
• Current Cycle: {json.dumps(current_daeun, ensure_ascii=False) if current_daeun else 'Not available'}

═══════════════════════════════════════════════════
[WESTERN ASTROLOGY DATA]
═══════════════════════════════════════════════════
• Sun: {sun_sign}
• Moon: {moon_sign}
• Rising: {rising_sign}
• Mercury: {mercury_sign}
• Venus: {venus_sign}
• Mars: {mars_sign}
• Jupiter: {jupiter_sign}
• Saturn: {saturn_sign}

═══════════════════════════════════════════════════
[KNOWLEDGE GRAPH - Related Wisdom]
═══════════════════════════════════════════════════
{graph_nodes_text}

═══════════════════════════════════════════════════
[JUNG PSYCHOLOGY QUOTES - Deep Insights]
═══════════════════════════════════════════════════
{quotes_text}

═══════════════════════════════════════════════════
[PERSONA ANALYSIS - Philosophical Perspectives]
═══════════════════════════════════════════════════
{persona_text}

═══════════════════════════════════════════════════
[EAST-WEST CROSS-ANALYSIS]
═══════════════════════════════════════════════════
{cross_analysis[:2000] if cross_analysis else 'None'}

═══════════════════════════════════════════════════
[REQUIRED CHAPTER STRUCTURE - Each 1,500+ characters]
═══════════════════════════════════════════════════

## Chapter 1: The Prelude of Destiny - Your Universe
Grand opening describing your birth's cosmic alignment from both Saju and Astrology perspectives.

## Chapter 2: The Essence of Your Day Master - Core of Your Soul
Deep analysis of {day_master} and how this energy permeates your being. Apply Jung's archetype theory.

## Chapter 3: Light and Shadow - Strengths and Weaknesses
Honest exploration of your personality's shining parts and hidden shadows. Use Jung's shadow concept.

## Chapter 4: The Language of Love - Romance Patterns
How you love, who you're attracted to, relationship patterns. Use Venus, Mars, and Peach Blossom star data.

## Chapter 5: Vocation and Calling - True Path
Suitable careers, success fields, work to avoid. Use Ten Gods and planetary placements.

## Chapter 6: Dynamics of Relationships - You Among Others
How you connect with friends, family, and colleagues.

## Chapter 7: Sun and Moon Duet - Outer and Inner Self
The complex inner world created by {sun_sign} Sun and {moon_sign} Moon.

## Chapter 8: Symphony of Planets - Mercury, Venus, Mars
Communication (Mercury {mercury_sign}), Love/Values (Venus {venus_sign}), Action/Desire (Mars {mars_sign}).

## Chapter 9: Secrets of Shinsal - Special Stars' Messages
The special destiny and potential indicated by your Shinsal ({shinsal_text}).

## Chapter 10: East Meets West - Intersection of Destinies
Unique insights at the meeting point of Saju and Astrology. Use cross-analysis results.

## Chapter 11: Waves of Daeun - Seasons of Life
Major life transitions according to Daeun ({daeun_text}) and their meanings.

## Chapter 12: Childhood Echoes - Roots' Memories
How childhood patterns influence who you are today. Apply Jung's complex theory.

## Chapter 13: The Shadow Self - Hidden Fears
Courageous exploration of parts hard to acknowledge. Use Jung psychology quotes.

## Chapter 14: Crisis and Resilience - Strength in Trials
How you handle crises and sources of resilience. Include Stoic philosophy perspectives.

## Chapter 15: Journey of Individuation - True Self-Realization
Concluding with specific advice for growth and Jung's individuation process.

═══════════════════════════════════════════════════
Use ALL the data above fully. Write each chapter 1,500+ characters.
Connect as one grand narrative, naturally weaving Jung psychology quotes.
Be so specific and accurate that readers feel "This is really me!" with chills."""

                # Start streaming
                yield f"data: {json.dumps({'status': 'start', 'total_chapters': 15, 'rag_prefetch_ms': prefetch_time})}\n\n"

                stream = openai_client.chat.completions.create(
                    model="gpt-4o",  # Use GPT-4o for better quality
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.85,
                    max_tokens=16000,  # Increased for ~20,000+ characters
                    stream=True
                )

                full_text = ""
                current_chapter = 0

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_text += content

                        # Detect chapter changes
                        if "## 챕터" in content or "## Chapter" in content:
                            current_chapter += 1
                            yield f"data: {json.dumps({'chapter': current_chapter})}\n\n"

                        yield f"data: {json.dumps({'content': content})}\n\n"

                # Done
                yield f"data: {json.dumps({'status': 'done', 'total_length': len(full_text)})}\n\n"
                logger.info(f"[DESTINY_STORY] Completed: {len(full_text)} characters (RAG prefetch: {prefetch_time}ms)")

            except Exception as stream_error:
                logger.exception(f"[DESTINY_STORY] Stream error: {stream_error}")
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
        logger.exception(f"[ERROR] /api/destiny-story/generate-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}, compatibility={HAS_COMPATIBILITY}, hybrid_rag={HAS_HYBRID_RAG}, domain_rag={HAS_DOMAIN_RAG}")

    # 🚀 Warmup models before accepting requests
    warmup_models()

    app.run(host="0.0.0.0", port=port, debug=True)
