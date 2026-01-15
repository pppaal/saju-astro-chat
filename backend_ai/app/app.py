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
    # ✅ Phase 2.5: Now uses ChartService
    try:
        from backend_ai.services.chart_service import ChartService
        chart_service = ChartService()
        result["cross_analysis"] = chart_service.get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
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


# ===============================================================
# Phase 4.3: Route handler functions moved to Blueprints
# These functions are now defined in:
#   - core_routes.py: index, health_check, readiness_check, get_capabilities
#   - chart_routes.py: calc_saju, calc_astro, get_transits, generate_*_chart
#   - cache_routes.py: cache_stats, cache_clear, performance_stats, prometheus_metrics, full_health_check
#   - counseling_routes.py: counseling_chat, therapeutic_questions, counseling_health
# ===============================================================


# ============================================================================
# REMOVED IN PHASE 2: ask() function moved to FortuneService
# ============================================================================
# The /ask endpoint business logic has been moved to:
#   backend_ai/services/fortune_service.py -> FortuneService.calculate_fortune()
#
# Router: backend_ai/app/routers/stream_routes.py now calls FortuneService directly
#
# Lines removed: ~70 lines (ask function)
# ============================================================================


# ============================================================================
# REMOVED IN PHASE 2.2: ask_stream() function moved to StreamingService
# ============================================================================
# The /ask-stream endpoint business logic has been moved to:
#   backend_ai/services/streaming_service.py -> StreamingService.stream_fortune()
#
# Router: backend_ai/app/routers/stream_routes.py now calls StreamingService directly
#
# Lines removed: ~994 lines (ask_stream function)
# ============================================================================

# NOTE: Function definition removed but keeping a marker for reference
# def ask_stream(): -> MOVED TO StreamingService.stream_fortune()
#
# Original function was 994 lines handling:
# - SSE streaming with OpenAI
# - RAG context integration (Jung psychology, cross-analysis)
# - Crisis detection and therapeutic guidance
# - Conversation history management
# - Lifespan guidance, theme fusion, active imagination
# - Emotion tracking and user context (persona, sessions)
# - CV/resume integration for career consultations

# Skip to next function (counselor_init)
# REMOVED IN PHASE 2: counselor_init() function moved to CounselorService
# ============================================================================
# The /counselor/init endpoint business logic has been moved to:
#   backend_ai/services/counselor_service.py -> CounselorService.initialize_session()
# Lines removed: ~104 lines (counselor_init function)
# ============================================================================


# Phase 4.3: calc_saju, calc_astro MOVED TO chart_routes.py


# Dream interpretation endpoint
# Route moved to dream_routes.py
# @app.route("/api/dream/interpret-stream", methods=["POST"])
# REMOVED IN PHASE 2.4: dream_interpret_stream() function moved to DreamRoutes
# ============================================================================
# The /api/dream/interpret-stream endpoint has been moved to:
#   backend_ai/app/routers/dream_routes.py -> dream_interpret_stream()
# Lines removed: ~178 lines (dream_interpret_stream function)
# ============================================================================


# ============================================================================
# REMOVED IN PHASE 2.3: dream_chat_stream() function moved to DreamService
# ============================================================================
# The /api/dream/chat-stream endpoint business logic has been moved to:
#   backend_ai/services/dream_service.py -> DreamService.stream_dream_chat()
#
# Router: backend_ai/app/routers/dream_routes.py now calls DreamService directly
#
# Lines removed: ~602 lines (dream_chat_stream function)
# ============================================================================

# NOTE: Function definition removed but keeping a marker for reference
# def dream_chat_stream(): -> MOVED TO DreamService.stream_dream_chat()
#
# Original function was 602 lines handling:
# - SSE streaming with OpenAI for dream interpretation chat
# - RAG search from DreamRAG (interpretation context, therapeutic questions, counseling scenarios)
# - Crisis detection (5-level severity with CounselingEngine)
# - Session management with CounselingEngine (phase tracking)
# - Celestial context (moon phase, retrogrades)
# - Saju fortune context (day master, daeun, iljin)
# - Previous consultations memory (continuity)
# - Persona memory (personalization, session count, insights)
# - Jung enhanced context from CounselingEngine (psychological type, alchemy stage, RAG questions)
# - Session phase tracking
# - Multi-language support (Korean/English)
# - Cultural notes (Korean haemong + Western psychology)
# ============================================================================
# Phase 4.2: dream_interpret MOVED TO dream_routes.py
# ============================================================================

# Phase 4.3: cache_stats, cache_clear, performance_stats, health_check, readiness_check
# MOVED TO cache_routes.py and core_routes.py


# Phase 4.3: prometheus_metrics, full_health_check MOVED TO cache_routes.py
# Phase 4.3: get_transits, generate_saju_chart MOVED TO chart_routes.py

# Phase 4.3: generate_saju_chart, generate_natal_chart MOVED TO chart_routes.py

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

# Phase 4.2: _clean_ai_phrases MOVED TO tarot_routes.py


# ===============================================================
# Phase 3.4: TAROT FUNCTIONS MOVED TO TarotService
# See: backend_ai/services/tarot_service.py
# Moved functions:
#   - generate_dynamic_followup_questions()
#   - detect_tarot_topic()
#   - _TAROT_TOPIC_KEYWORDS
#   - _load_spread_config()
# ===============================================================


# ===============================================================
# Phase 4.3: COUNSELING ENDPOINTS MOVED TO counseling_routes.py
# Moved: counseling_chat, therapeutic_questions, counseling_health
# ===============================================================


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
# Phase 4.1: _calculate_simple_saju MOVED TO SajuCalculationService
# See: backend_ai/services/saju_calculation_service.py
# =========================================================
def _calculate_simple_saju(birth_date: str, birth_time: str = "12:00") -> dict:
    """Delegate to SajuCalculationService.calculate_simple_saju()."""
    from backend_ai.services.saju_calculation_service import SajuCalculationService
    service = SajuCalculationService()
    return service.calculate_simple_saju(birth_date, birth_time)




# ===============================================================
# Phase 3.5: SEARCH FUNCTIONS MOVED TO search_routes.py
# See: backend_ai/app/routers/search_routes.py
# Moved functions:
#   - domain_rag_search() (with tarot query expansion helpers)
#   - hybrid_rag_search()
# ===============================================================


# ===============================================================
# COMPATIBILITY ENDPOINTS - Moved to routers/compatibility_routes.py
# ===============================================================


# Phase 4.3: get_capabilities MOVED TO core_routes.py


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
# ============================================================================
# REMOVED IN PHASE 3.1: generate_destiny_story_stream() moved to DestinyStoryService
# ============================================================================
# Function has been moved to backend_ai/services/destiny_story_service.py
# Router: backend_ai/app/routers/story_routes.py now calls DestinyStoryService directly
#
# Lines removed: 558 lines (generate_destiny_story_stream function)
#
# Original function handled:
# - SSE streaming for ~20,000 character destiny story generation
# - All RAG data integration (GraphRAG, CorpusRAG, PersonaEmbedRAG, Cross-analysis)
# - 15-chapter story structure with Jung psychology and Stoic philosophy
# - Multi-language support (Korean/English)
# - Saju/Astrology data extraction and formatting
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}, compatibility={HAS_COMPATIBILITY}, hybrid_rag={HAS_HYBRID_RAG}, domain_rag={HAS_DOMAIN_RAG}")

    # 🚀 Warmup models before accepting requests
    warmup_models()

    app.run(host="0.0.0.0", port=port, debug=True)
