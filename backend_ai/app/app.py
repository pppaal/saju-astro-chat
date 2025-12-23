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
HAS_PERSONA_EMBED = True  # Assume available
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
HAS_DOMAIN_RAG = True  # Assume available
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

CrisisDetector = property(lambda self: _get_counseling_engine_module().CrisisDetector if _get_counseling_engine_module() else None)

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

# GraphRAG System - Lazy loaded (uses SentenceTransformer)
HAS_GRAPH_RAG = True  # Assume available
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
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    OPENAI_AVAILABLE = True
except Exception:
    openai_client = None
    OPENAI_AVAILABLE = False
    print("[app.py] OpenAI client not available")

# CorpusRAG System - Lazy loaded (uses SentenceTransformer)
HAS_CORPUS_RAG = True  # Assume available
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
    Handles both:
    - Nested: { heavenlyStem: { name: "庚", element: "금" }, element: "..." }
    - Flat: { name: "庚", element: "금" } or { heavenlyStem: "庚", element: "금" }
    Returns normalized saju_data with flat dayMaster.
    """
    if not saju_data or not saju_data.get("dayMaster"):
        return saju_data

    dm = saju_data.get("dayMaster", {})
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
    daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
    dm_element = dm_data.get("element", "")
    sun_sign = astro_data.get("sun", {}).get("sign", "")
    moon_sign = astro_data.get("moon", {}).get("sign", "")
    dominant = saju_data.get("dominantElement", "")

    # Extract Ten Gods (십신) from saju data
    ten_gods = saju_data.get("tenGods", {})
    dominant_god = ten_gods.get("dominant", "")  # e.g., "정관", "편관", "정재", "상관"

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
                branch = pillar.get("earthlyBranch", "")
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
            year_stem = saju_data.get("yearPillar", {}).get("heavenlyStem", "")
            day_stem = saju_data.get("dayPillar", {}).get("heavenlyStem", "")
            # Common 합 combinations
            hap_pairs = {"갑": "기", "을": "경", "병": "신", "정": "임", "무": "계",
                         "기": "갑", "경": "을", "신": "병", "임": "정", "계": "무"}
            for stem in [year_stem, day_stem]:
                if stem and stem in hap_pairs:
                    hap_key = f"{stem}{hap_pairs[stem]}합"
                    if hap_key in cheongan_hap:
                        hap_info = cheongan_hap[hap_key]
                        detailed_insights.append((5, f"☯️ 천간합 [{hap_key}]: {hap_info.get('meaning', '')} → {hap_info.get('result', '')}기운 형성"))

        # 1-5. 신살×소행성 매핑 (cross_shinsal_asteroids.json)
        shinsal_asteroids = cache.get("cross_shinsal_asteroids", {})
        if shinsal_asteroids:
            shinsal_mapping = shinsal_asteroids.get("major_shinsal_mapping", {})
            # Check user's shinsal from saju_data
            user_shinsals = saju_data.get("sinsal", []) or saju_data.get("shinsals", []) or []
            if isinstance(user_shinsals, dict):
                user_shinsals = list(user_shinsals.keys())
            for shinsal_name in user_shinsals[:3]:  # Top 3 shinsals
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
                gm_key = f"{gm}_공망"
                if gm_key in branch_void:
                    gm_data = branch_void[gm_key]
                    theme = gm_data.get("theme", "")
                    draconic = gm_data.get("draconic", "")
                    if theme:
                        detailed_insights.append((5, f"🌙 공망×드라코닉 [{gm} 공망]: {theme}"))

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
    daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
    dm_element = dm_data.get("element", "")
    ten_gods = saju_data.get("tenGods", {})
    dominant_god = ten_gods.get("dominant", "")

    # Astrology data
    sun_sign = astro_data.get("sun", {}).get("sign", "")
    moon_sign = astro_data.get("moon", {}).get("sign", "")

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

        day_branch = saju_data.get("dayPillar", {}).get("earthlyBranch", "")
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
        element_map = {"木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water"}

        for elem_ko, elem_en in element_map.items():
            count = element_counts.get(elem_ko, 0)
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
        jaesung_count = ten_gods_count.get("정재", 0) + ten_gods_count.get("편재", 0)
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
        sun_house = astro_data.get("sun", {}).get("house")
        if sun_house:
            house_num = str(sun_house).replace("H", "")
            rule_key = f"rule_sun_{house_num}"
            rule = life_path_rules.get(rule_key)
            if rule:
                results.append(f"🌟 인생 방향 [태양 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Check north node for karmic direction
        north_node = astro_data.get("northNode", {}) or astro_data.get("north_node", {})
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
                except:
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

    # Day Master (most important) - support both "heavenlyStem" and "name"
    if saju_data.get("dayMaster"):
        dm = saju_data["dayMaster"]
        dm_stem = dm.get('heavenlyStem') or dm.get('name', '')
        lines.append(f"일간(본인): {dm_stem} - {dm.get('element', '')}의 기운")

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
    from datetime import datetime
    now = datetime.now()

    # Big Three - ESSENTIAL
    sun_sign = ""
    moon_sign = ""
    if astro_data.get("sun"):
        sun = astro_data["sun"]
        sun_sign = sun.get('sign', '')
        house = sun.get('house', '')
        lines.append(f"☀️ 태양(자아): {sun_sign} {sun.get('degree', '')}°" + (f" - {house}하우스" if house else ""))
    if astro_data.get("moon"):
        moon = astro_data["moon"]
        moon_sign = moon.get('sign', '')
        house = moon.get('house', '')
        lines.append(f"🌙 달(감정): {moon_sign} {moon.get('degree', '')}°" + (f" - {house}하우스" if house else ""))
    if astro_data.get("ascendant"):
        asc = astro_data["ascendant"]
        lines.append(f"⬆️ 상승(외적): {asc.get('sign', '')} {asc.get('degree', '')}°")

    # Key planets with houses
    for planet, info in [("mercury", "수성(소통)"), ("venus", "금성(사랑/관계)"),
                         ("mars", "화성(에너지)"), ("jupiter", "목성(행운/확장)"),
                         ("saturn", "토성(시련/책임)")]:
        if astro_data.get(planet):
            p = astro_data[planet]
            house = p.get('house', '')
            lines.append(f"{info}: {p.get('sign', '')}" + (f" - {house}하우스" if house else ""))

    # Houses (if available)
    if astro_data.get("houses"):
        h = astro_data["houses"]
        lines.append("\n🏠 주요 하우스:")
        if h.get("1"):
            lines.append(f"  1하우스(자아): {h['1'].get('sign', '')}")
        if h.get("7"):
            lines.append(f"  7하우스(파트너): {h['7'].get('sign', '')}")
        if h.get("10"):
            lines.append(f"  10하우스(커리어): {h['10'].get('sign', '')}")

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

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

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

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

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
                cross_rules = get_cross_analysis_for_chart(saju_data, astro_data, theme, locale)
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
        except:
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
        # ======================================================
        crisis_response = None
        if HAS_COUNSELING and prompt:
            crisis_check = CrisisDetector.detect_crisis(prompt)
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
• '왜 그런지' 이유를 충분히 설명"""

        if rag_context:
            # RICH prompt with all RAG data
            system_prompt = f"""{counselor_persona}

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요

[📊 사주 분석]
{saju_detail}

[🌟 점성 분석]
{astro_detail}
{cross_section}
{rag_context}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[🎯 응답 스타일]
• 첫 문장부터 사용자 질문에 직접 답변 - 신상 소개 NO
• 사주와 점성술 통찰을 자연스럽게 녹여서 설명
• '왜 그런지' 이유를 상세히 풀어서 설명
• 구체적인 날짜/시기 반드시 포함
• 실천 가능한 구체적 조언 제공

❌ 절대 금지:
• 인사/환영 멘트 ("안녕하세요", "다시 찾아주셨네요")
• 신상 소개 ("일간이 X입니다", "당신은 Y 성향" 등)
• 대운/세운 지어내기 (위 데이터에 없는 것 언급)
• 추상적 말만 나열 (구체적 시기 없이)
• 피상적이고 짧은 답변

📌 응답 길이: 400-600단어로 충분히 상세하게 ({locale})"""
        else:
            # Standard prompt (no session data)
            system_prompt = f"""{counselor_persona}

⚠️ {current_date_str} - 과거 날짜를 미래처럼 말하지 마세요

[📊 사주 분석]
{saju_detail}

[🌟 점성 분석]
{astro_detail}
{cross_section}
{user_context_section}{cv_section}{lifespan_section}{theme_fusion_section}{imagination_section}{crisis_context_section}{therapeutic_section}

[🎯 응답 스타일]
• 첫 문장부터 사용자 질문에 직접 답변 - 신상 소개 NO
• 사주와 점성술 통찰을 자연스럽게 녹여서 설명
• '왜 그런지' 이유를 상세히 풀어서 설명
• 구체적인 날짜/시기 반드시 포함
• 실천 가능한 구체적 조언 제공

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
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

                stream = client.chat.completions.create(
                    model="gpt-4o-mini",  # Fast model for chat
                    messages=messages,
                    max_tokens=1000,  # Increased for richer responses (was 900)
                    temperature=0.75,  # Slightly more creative (was 0.7)
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
        locale = data.get("locale", "ko")

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

        logger.info(f"[COUNSELOR-INIT] id={g.request_id} theme={theme}")
        logger.info(f"[COUNSELOR-INIT] saju dayMaster: {saju_data.get('dayMaster', {})}")

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
    Enhanced Streaming I Ching interpretation with:
    - Five Element (五行) analysis
    - Seasonal harmony
    - Trigram imagery
    - Nuclear/Opposite/Reverse hexagram insights
    - Saju cross-analysis
    - Advanced changing line rules
    """
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[ICHING_STREAM] id={g.request_id} Starting enhanced streaming interpretation")

        # Get hexagram data from request
        hexagram_number = data.get("hexagramNumber")
        hexagram_name = data.get("hexagramName", "")
        hexagram_symbol = data.get("hexagramSymbol", "")
        hexagram_binary = data.get("hexagramBinary", "")
        judgment = data.get("judgment", "")
        image = data.get("image", "")
        core_meaning = data.get("coreMeaning", "")
        changing_lines = data.get("changingLines", [])
        resulting_hexagram = data.get("resultingHexagram")
        question = data.get("question", "")
        locale = data.get("locale", "ko")
        themes = data.get("themes", {})

        # Enhanced data from new analysis functions
        trigram_upper = data.get("trigramUpper", "")
        trigram_lower = data.get("trigramLower", "")
        hexagram_element = data.get("element", "")
        saju_element = data.get("sajuElement", "")  # User's day master element

        # Related hexagrams (if provided)
        nuclear_hexagram = data.get("nuclearHexagram", {})
        opposite_hexagram = data.get("oppositeHexagram", {})
        reverse_hexagram = data.get("reverseHexagram", {})

        is_korean = locale == "ko"
        lang_instruction = "Please respond entirely in Korean (한국어로 답변해주세요)." if is_korean else "Please respond in English."

        # Current date and seasonal analysis
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        weekdays_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        # Determine current season and 절기
        month = now.month
        if month in [3, 4, 5]:
            season_ko, season_element = "봄", "목(木)"
        elif month in [6, 7, 8]:
            season_ko, season_element = "여름", "화(火)"
        elif month in [9, 10, 11]:
            season_ko, season_element = "가을", "금(金)"
        else:
            season_ko, season_element = "겨울", "수(水)"

        if is_korean:
            current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]}) - {season_ko}"
        else:
            current_date_str = f"Today: {now.strftime('%B %d, %Y')} ({weekdays_en[now.weekday()]})"

        # Five Element (오행) analysis for hexagram
        wuxing_korean = {"wood": "목(木)", "fire": "화(火)", "earth": "토(土)", "metal": "금(金)", "water": "수(水)"}
        hex_element_ko = wuxing_korean.get(hexagram_element, hexagram_element) if hexagram_element else ""

        # Trigram imagery
        trigram_names = {
            "heaven": "건(乾/하늘)", "earth": "곤(坤/땅)", "thunder": "진(震/우레)",
            "water": "감(坎/물)", "mountain": "간(艮/산)", "wind": "손(巽/바람)",
            "fire": "리(離/불)", "lake": "태(兌/연못)"
        }
        upper_name = trigram_names.get(trigram_upper, trigram_upper)
        lower_name = trigram_names.get(trigram_lower, trigram_lower)

        def generate_stream():
            """Generator for SSE streaming I Ching interpretation with enhanced analysis"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # === SECTION 1: Overview with 괘상/오행/계절 분석 (streaming) ===
                yield f"data: {json.dumps({'section': 'overview', 'status': 'start'})}\n\n"

                # Build enhanced context
                trigram_context = ""
                if upper_name and lower_name:
                    trigram_context = f"""
괘상(卦象) 분석:
- 상괘: {upper_name}
- 하괘: {lower_name}
- 괘상 이미지: 위에 {upper_name.split('/')[1] if '/' in upper_name else upper_name}, 아래에 {lower_name.split('/')[1] if '/' in lower_name else lower_name}"""

                element_context = ""
                if hex_element_ko:
                    element_context = f"""
오행(五行) 분석:
- 괘의 오행: {hex_element_ko}
- 현재 계절: {season_ko} ({season_element})"""
                    # Add saju analysis if available
                    if saju_element:
                        saju_element_ko = wuxing_korean.get(saju_element, saju_element)
                        element_context += f"""
- 당신의 일간(日干): {saju_element_ko}"""

                related_context = ""
                if nuclear_hexagram.get("name") or opposite_hexagram.get("name") or reverse_hexagram.get("name"):
                    related_context = """
관련 괘(卦) 참고:"""
                    if nuclear_hexagram.get("name"):
                        related_context += f"""
- 호괘(互卦): {nuclear_hexagram.get('name', '')} - 상황의 내면에 숨겨진 의미"""
                    if opposite_hexagram.get("name"):
                        related_context += f"""
- 착괘(錯卦): {opposite_hexagram.get('name', '')} - 정반대 관점에서의 통찰"""
                    if reverse_hexagram.get("name"):
                        related_context += f"""
- 종괘(綜卦): {reverse_hexagram.get('name', '')} - 상대방 입장에서의 시각"""

                overview_prompt = f"""당신은 깊은 통찰력을 가진 주역(周易) 상담사입니다.
동양 철학과 오행(五行) 사상에 정통하며, 따뜻하고 지혜로운 스승처럼 괘의 메시지를 전달합니다.

{lang_instruction}

{current_date_str}

【괘 정보】
- 괘명: {hexagram_name} {hexagram_symbol} (제{hexagram_number}괘)
- 괘사(彖辭): {judgment}
- 상사(象辭): {image}
- 핵심 의미: {core_meaning}
{trigram_context}
{element_context}
{related_context}

{f'【질문】 {question}' if question else '【일반 점괘】'}

【테마별 해석 참고】
- 직업/사업: {themes.get('career', '')}
- 연애/관계: {themes.get('love', '')}
- 건강: {themes.get('health', '')}
- 재물: {themes.get('wealth', '')}
- 시기: {themes.get('timing', '')}

【상담 지침】
1. 괘상(卦象) 이미지를 활용하여 시각적이고 직관적으로 설명
2. 오행의 상생상극 관계를 자연스럽게 녹여서 해석
3. 현재 계절({season_ko})과 괘의 기운 조화를 언급
4. 따뜻하고 공감하는 말투 ("~하시는군요", "~의 시기입니다")
5. 질문이 있다면 그에 맞춰 구체적으로 답변
6. 4-5문장으로 깊이 있으면서도 이해하기 쉽게 해석"""

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

                    changing_info = "\n".join([f"- {line.get('index', i+1)}효: {line.get('text', '')}" for i, line in enumerate(changing_lines)])
                    resulting_info = ""
                    if resulting_hexagram:
                        resulting_info = f"변화 후 괘(지괘): {resulting_hexagram.get('name', '')} {resulting_hexagram.get('symbol', '')} - {resulting_hexagram.get('judgment', '')}"

                    # 변효 개수에 따른 전통 주역 해석 규칙
                    line_count = len(changing_lines)
                    line_nums = [line.get('index', i+1) for i, line in enumerate(changing_lines)]

                    if line_count == 1:
                        interpretation_rule = f"【단변(單變)】 {line_nums[0]}효 하나만 변하니, 본괘의 {line_nums[0]}효 효사가 핵심입니다."
                    elif line_count == 2:
                        sorted_lines = sorted(line_nums)
                        upper_line = sorted_lines[-1]
                        interpretation_rule = f"【이변(二變)】 {sorted_lines[0]}, {sorted_lines[1]}효가 변합니다. 위 효인 {upper_line}효의 효사를 중심으로 해석하세요."
                    elif line_count == 3:
                        interpretation_rule = "【삼변(三變)】 본괘와 지괘의 괘사를 함께 보되, 본괘 괘사가 중심입니다."
                    elif line_count == 4:
                        all_lines = {1, 2, 3, 4, 5, 6}
                        unchanged = sorted(all_lines - set(line_nums))
                        interpretation_rule = f"【사변(四變)】 변하지 않는 {unchanged[0]}, {unchanged[1]}효 중 아래 효인 {unchanged[0]}효의 지괘 효사를 보세요."
                    elif line_count == 5:
                        all_lines = {1, 2, 3, 4, 5, 6}
                        unchanged = list(all_lines - set(line_nums))[0]
                        interpretation_rule = f"【오변(五變)】 {unchanged}효만 변하지 않습니다. 이 불변효의 지괘 효사가 핵심입니다."
                    elif line_count == 6:
                        # 특수 케이스: 건→곤 (용구), 곤→건 (용육)
                        if hexagram_number == 1 and resulting_hexagram and resulting_hexagram.get('number') == 2:
                            interpretation_rule = "【전효변 - 용구(用九)】 '見群龍無首 吉' - 여러 용이 나타나되 우두머리가 없으니 길하다. 리더십을 내려놓고 겸손히 물러나면 길합니다."
                        elif hexagram_number == 2 and resulting_hexagram and resulting_hexagram.get('number') == 1:
                            interpretation_rule = "【전효변 - 용육(用六)】 '利永貞' - 영원히 바르게 함이 이롭다. 끝까지 바른 도를 지키면 강건함을 얻습니다."
                        else:
                            interpretation_rule = "【전효변(全爻變)】 6효가 모두 변하니, 지괘의 괘사를 중심으로 해석하세요."
                    else:
                        interpretation_rule = ""

                    # Enhanced changing line context
                    line_position_meanings = {
                        1: "초효 - 시작, 잠재력의 단계",
                        2: "이효 - 내면의 성장, 발전기",
                        3: "삼효 - 내외 경계, 전환점",
                        4: "사효 - 외부 진입, 도약기",
                        5: "오효 - 정점, 전성기",
                        6: "상효 - 극점, 마무리"
                    }
                    line_positions = "\n".join([f"- {line_position_meanings.get(line.get('index', i+1), '')}" for i, line in enumerate(changing_lines)])

                    changing_prompt = f"""당신은 주역의 변효(變爻) 해석에 정통한 상담사입니다.
전통적인 효변 해석법(朱熹 周易本義)에 따라 정확하고 깊이 있게 해석합니다.

{lang_instruction}

【본괘(本卦)】 {hexagram_name} {hexagram_symbol}

【변효(變爻) 정보】
{changing_info}

【효위(爻位) 의미】
{line_positions}

【지괘(之卦) 정보】
{resulting_info}

【전통 주역 해석 규칙 (朱熹 周易本義)】
{interpretation_rule}

【해석 지침】
1. 위 해석 규칙을 정확히 따라 해석의 중심을 잡으세요
2. 효위(爻位)가 상징하는 인생 단계와 연결하여 설명
3. 본괘에서 지괘로의 변화가 의미하는 흐름을 해석
4. 중정(中正) - 2,5효가 중앙이고 양효가 홀수자리, 음효가 짝수자리면 정위
5. 응효(應爻) 관계 - 1↔4, 2↔5, 3↔6효의 호응
6. 변화를 두려워하지 않도록 긍정적이면서도 현실적으로
7. 4-5문장으로 핵심을 전달"""

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

                # Build saju advice context if available
                saju_advice_context = ""
                if saju_element:
                    saju_element_ko = wuxing_korean.get(saju_element, saju_element)
                    saju_advice_context = f"""
【사주 연동 조언】
- 당신의 일간(日干): {saju_element_ko}
- 괘의 오행({hex_element_ko})과의 관계를 고려한 맞춤 조언 필요"""

                advice_prompt = f"""당신은 주역의 지혜를 현대 생활에 적용하는 실용적인 상담사입니다.
동양 철학의 깊은 통찰을 일상에서 실천 가능한 조언으로 전환합니다.

{lang_instruction}

{current_date_str}

【괘 정보】
괘: {hexagram_name} {hexagram_symbol}
핵심 의미: {core_meaning}
괘의 오행: {hex_element_ko}
현재 계절: {season_ko} ({season_element})
{saju_advice_context}

{f'【질문】 {question}' if question else ''}

【앞선 해석 요약】
{overview_text[:400]}

【조언 지침】
1. 오행의 상생상극을 활용한 구체적 행동 제안
   - 상생: 자연스럽게 흐르는 방향 제시
   - 상극: 극복해야 할 점과 조화 방법
2. 현재 계절({season_ko})에 맞는 시의적절한 조언
3. 오늘/이번 주 실천할 수 있는 구체적 행동 2-3가지
4. 괘상(卦象) 이미지를 비유로 활용
5. 친구에게 조언하듯 따뜻하면서도 현실적으로
6. 번호 없이 자연스러운 문장으로 연결"""

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


@app.route("/iching/changing-line", methods=["POST"])
def iching_changing_line():
    """Get detailed changing line interpretation."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        from backend_ai.app.iching_rag import get_changing_line_interpretation

        data = request.get_json() or {}
        hexagram_number = data.get("hexagramNumber")
        line_index = data.get("lineIndex")  # 1-6
        locale = data.get("locale", "ko")

        if not hexagram_number or not line_index:
            return jsonify({
                "status": "error",
                "message": "hexagramNumber and lineIndex are required"
            }), 400

        result = get_changing_line_interpretation(
            hexagram_num=int(hexagram_number),
            line_index=int(line_index),
            locale=locale
        )

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]}), 400

        return jsonify({
            "status": "success",
            **result
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/changing-line failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/iching/hexagram-lines/<int:hexagram_num>", methods=["GET"])
def iching_hexagram_lines(hexagram_num: int):
    """Get all changing line interpretations for a specific hexagram."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        from backend_ai.app.iching_rag import get_all_changing_lines_for_hexagram

        locale = request.args.get("locale", "ko")

        result = get_all_changing_lines_for_hexagram(
            hexagram_num=hexagram_num,
            locale=locale
        )

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]}), 400

        return jsonify({
            "status": "success",
            **result
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/hexagram-lines/{hexagram_num} failed: {e}")
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

        tarot_prompt = f"""당신은 10년 경력의 타로 리더입니다. 카드 상징과 이미지를 직관적으로 읽어내며, 질문자의 상황에 맞는 실질적인 통찰을 전달합니다.

## 오늘: {date_str} ({season}){moon_phase_hint}

## 리딩 정보
카테고리: {category}
스프레드: {spread_title}
카드: {cards_str}
질문: {enhanced_question or "일반 운세"}

## 카드 컨텍스트
{rag_context}

## 좋은 해석 예시
"탑 카드가 첫 위치에 나왔다. 번개가 왕관을 치고 두 사람이 추락하는 그림—지금 뭔가가 무너지고 있거나, 곧 무너질 것이다. 하지만 두 번째 위치의 별 카드를 보라. 폭풍 후 벌거벗은 여인이 물을 붓고 있다. 무너진 후에 치유가 온다. 세 번째 황제 카드는 그 잔해 위에 새로운 질서를 세우라고 한다. 지금 무너지는 게 뭐든, 그건 이미 금이 가 있었다."

## 피해야 할 AI스러운 해석
"이 카드는 변화를 나타내며, 새로운 시작의 가능성을 보여주고 있습니다. 긍정적인 에너지가 느껴지네요. 자신감을 가지고 앞으로 나아가시면 좋을 것 같습니다."

## 해석 방향
- 카드 이미지의 상징을 구체적으로 언급
- 위치별 카드가 서로 어떤 이야기를 만들어내는지 연결
- 막연한 격려 대신 구체적인 상황 해석
- 질문과 직접 연결된 통찰 제시
- {('자연스러운 한국어' if is_korean else 'Natural English')}
- 500-700자"""

        # Generate with GPT-4o-mini (fast, skip refine step)
        try:
            reading_text = _generate_with_gpt4(tarot_prompt, max_tokens=1200, temperature=0.8, use_mini=True)
            # Apply post-processing to remove AI-sounding phrases
            reading_text = _clean_ai_phrases(reading_text)
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

                overall_prompt = f"""당신은 경험 많은 타로 리더입니다. 카드의 상징과 이미지를 직관적으로 읽고, 질문자에게 실질적인 통찰을 전달합니다.

카드: {cards_str}
카테고리: {category}
스프레드: {spread_title}
질문: {user_question or "일반 운세"}

참고 컨텍스트:
{rag_context[:1500]}

좋은 예시: "절벽 끝에 선 광대가 첫 카드다. 발밑을 안 보고 하늘을 본다—뭔가 시작하려 하지만 준비가 덜 됐다. 두 번째 힘 카드는 사자의 턱을 부드럽게 잡은 여인, 억지로 밀어붙이지 말라는 뜻이다."
피할 것: "긍정적인 에너지가 느껴지네요. 좋은 변화가 올 것 같습니다."

해석 방향:
- 카드 이미지의 구체적 상징 언급 (인물, 배경, 물건)
- 카드들이 연결되어 보여주는 이야기
- 3-4문장으로 핵심만"""

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": overall_prompt}],
                    temperature=0.8,
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

                    card_prompt = f"""당신은 타로 리더입니다. 이 카드의 상징과 이미지가 현재 위치에서 무엇을 의미하는지 해석하세요.

카드: {card_name}{'(역방향)' if is_reversed else ''}
위치: {position}
스프레드: {spread_title}
질문: {user_question or "일반 운세"}

카드 정보:
{json.dumps(card_info, ensure_ascii=False)[:800]}

심리학적 통찰:
{json.dumps(insights, ensure_ascii=False)[:500]}

좋은 예시: "여사제가 두 기둥 사이에 앉아 있다—B와 J, 밝음과 어둠의 경계. 뒤의 베일 너머엔 바다가 비친다. 알고 있지만 말하지 않는 것이 있다."
피할 것: "이 카드는 직관을 나타냅니다. 내면의 목소리에 귀 기울이시면 좋겠습니다."

해석 방향:
- 카드 그림의 구체적 상징 (인물 자세, 배경, 물건)
- {position} 위치에서의 의미
- 2-3문장으로 간결하게"""

                    card_stream = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": card_prompt}],
                        temperature=0.8,
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

                guidance_prompt = f"""당신은 타로 리더입니다. 이 리딩에서 도출된 실질적인 조언을 전달하세요.

카드: {cards_str}
전체 메시지: {overall_text[:500]}

좋은 예시: "전차의 두 스핑크스가 다른 방향으로 당기고 있다—상반된 힘을 조율해야 할 때다. 어느 한쪽만 선택하지 말고, 둘 다 끌고 가라."
피할 것: "자신감을 가지시면 좋겠습니다. 좋은 결과가 있을 거예요."

조언 방향:
- 카드 상징에서 직접 도출된 구체적 행동
- 2-3문장으로 명확하게"""

                guidance_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": guidance_prompt}],
                    temperature=0.8,
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
        chat_prompt = f"""당신은 경험 많은 타로 리더입니다. 카드의 상징을 바탕으로 질문에 직접적이고 실질적인 답변을 해주세요.

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

{'💡 현재 카드들이 이미 충분한 메시지를 담고 있습니다. 이 리딩에서 더 깊이 들여다볼 부분이 있다면 질문해주세요.' if wants_more_cards else ''}
{'⏰ 시기에 대한 질문이네요. 카드의 흐름에서 읽히는 타이밍을 말씀드리겠습니다.' if asks_about_timing else ''}

{'## 심리학적 통찰' + chr(10) + jung_insight if jung_insight else ''}

## 좋은 답변 예시
"죽음 카드가 나왔다고 했는데, 실제 죽음이 아니라 변혁이다. 창백한 기수가 지나가면 왕도 쓰러진다—지위와 상관없이 변화는 온다. 지금 끝내야 할 게 뭔지 이미 알고 있을 것이다."

## 피해야 할 답변
"걱정하지 마세요. 좋은 방향으로 흘러갈 것 같습니다. 긍정적인 마음을 가지시면 좋겠어요."

## 답변 방향
- 질문에 직접 연결된 카드 상징 언급
- 구체적인 이미지 묘사
- 3-4문장으로 간결하게"""

        try:
            # GPT-4o-mini for fast, natural counselor responses (skip refine for speed)
            reply = _generate_with_gpt4(chat_prompt, max_tokens=400, temperature=0.8, use_mini=True)
            # Apply post-processing to remove AI-sounding phrases
            reply = _clean_ai_phrases(reply)
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

        system_prompt = """당신은 경험 많은 타로 리더입니다. 카드의 상징과 이미지를 바탕으로 질문에 직접적으로 답변합니다.

좋은 예시: "힘 카드에서 여인이 사자의 입을 닫는다—억지로 밀어붙이는 게 아니라 부드럽게. 지금 상황도 마찬가지다. 힘으로 해결하려 하지 마라."
피할 것: "힘 카드가 나왔네요. 내면의 힘을 믿으시면 좋겠습니다. 잘 될 거예요."

답변 스타일:
- 카드 그림의 구체적 상징 언급
- 질문과 직접 연결
- 3-4문장으로 간결하게"""

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
                    temperature=0.8,
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
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro")
        tarot_data = data.get("tarot")

        # Normalize dayMaster structure (nested -> flat)
        saju_data = normalize_day_master(saju_data)

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


@app.route("/rlhf/analytics", methods=["GET"])
def rlhf_analytics():
    """
    Get feedback analytics for counseling quality improvement.
    상담 품질 개선을 위한 피드백 분석 통계.

    Query params:
    - days: Number of days to analyze (default: 30)
    - theme: Filter by theme (optional)
    """
    if not HAS_RLHF:
        return jsonify({"status": "error", "message": "RLHF module not available"}), 501

    try:
        days = request.args.get("days", 30, type=int)
        theme_filter = request.args.get("theme")

        fl = get_feedback_learning()

        # Get feedback data
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days)

        # Aggregate statistics
        stats = {
            "total_feedbacks": 0,
            "average_rating": 0.0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "theme_breakdown": {},
            "top_positive_themes": [],
            "needs_improvement_themes": [],
            "common_feedback_keywords": [],
            "trend": "stable",
        }

        # Access feedback storage (if available)
        if hasattr(fl, '_feedback_storage') and fl._feedback_storage:
            feedbacks = fl._feedback_storage
            filtered = []

            for fb in feedbacks:
                if isinstance(fb, dict):
                    fb_date = fb.get("timestamp")
                    fb_theme = fb.get("theme", "unknown")

                    # Apply filters
                    if theme_filter and fb_theme != theme_filter:
                        continue

                    if fb_date and isinstance(fb_date, str):
                        try:
                            fb_datetime = datetime.fromisoformat(fb_date.replace("Z", "+00:00"))
                            if fb_datetime < cutoff_date:
                                continue
                        except:
                            pass

                    filtered.append(fb)

            stats["total_feedbacks"] = len(filtered)

            if filtered:
                # Calculate average rating
                ratings = [fb.get("rating", 3) for fb in filtered if fb.get("rating")]
                if ratings:
                    stats["average_rating"] = round(sum(ratings) / len(ratings), 2)

                    # Rating distribution
                    for r in ratings:
                        if 1 <= r <= 5:
                            stats["rating_distribution"][r] += 1

                # Theme breakdown
                theme_ratings = {}
                for fb in filtered:
                    t = fb.get("theme", "unknown")
                    r = fb.get("rating", 3)
                    if t not in theme_ratings:
                        theme_ratings[t] = []
                    theme_ratings[t].append(r)

                for t, rs in theme_ratings.items():
                    avg = round(sum(rs) / len(rs), 2) if rs else 0
                    stats["theme_breakdown"][t] = {
                        "count": len(rs),
                        "average_rating": avg,
                    }

                # Top positive and needs improvement
                sorted_themes = sorted(
                    [(t, d["average_rating"], d["count"]) for t, d in stats["theme_breakdown"].items()],
                    key=lambda x: (-x[1], -x[2])
                )

                stats["top_positive_themes"] = [
                    {"theme": t, "avg_rating": r, "count": c}
                    for t, r, c in sorted_themes[:3] if r >= 4.0
                ]

                stats["needs_improvement_themes"] = [
                    {"theme": t, "avg_rating": r, "count": c}
                    for t, r, c in reversed(sorted_themes) if r < 3.5
                ][:3]

                # Extract common keywords from negative feedback
                negative_texts = [
                    fb.get("feedback_text", "")
                    for fb in filtered
                    if fb.get("rating", 5) <= 2 and fb.get("feedback_text")
                ]

                keyword_counts = {}
                negative_keywords = ["애매", "부정확", "일반적", "도움", "안 됨", "별로", "아쉬", "짧", "구체"]
                for text in negative_texts:
                    text_lower = text.lower()
                    for kw in negative_keywords:
                        if kw in text_lower:
                            keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

                stats["common_feedback_keywords"] = [
                    {"keyword": k, "count": c}
                    for k, c in sorted(keyword_counts.items(), key=lambda x: -x[1])[:5]
                ]

                # Calculate trend (compare first half vs second half)
                mid = len(ratings) // 2
                if mid > 5:
                    first_half_avg = sum(ratings[:mid]) / mid
                    second_half_avg = sum(ratings[mid:]) / (len(ratings) - mid)
                    diff = second_half_avg - first_half_avg
                    if diff > 0.3:
                        stats["trend"] = "improving"
                    elif diff < -0.3:
                        stats["trend"] = "declining"
                    else:
                        stats["trend"] = "stable"

        # Quality insights
        insights = []
        if stats["average_rating"] < 3.5:
            insights.append("전반적인 만족도가 낮습니다. 상담 응답 품질 개선이 필요합니다.")
        elif stats["average_rating"] >= 4.5:
            insights.append("매우 높은 만족도를 유지하고 있습니다!")

        if stats["needs_improvement_themes"]:
            themes_str = ", ".join([t["theme"] for t in stats["needs_improvement_themes"]])
            insights.append(f"개선이 필요한 테마: {themes_str}")

        if stats["common_feedback_keywords"]:
            kws = ", ".join([k["keyword"] for k in stats["common_feedback_keywords"][:3]])
            insights.append(f"부정적 피드백에서 자주 등장하는 키워드: {kws}")

        stats["insights"] = insights

        return jsonify({
            "status": "success",
            "period_days": days,
            "theme_filter": theme_filter,
            **stats
        })

    except Exception as e:
        logger.exception(f"[ERROR] /rlhf/analytics failed: {e}")
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
            except:
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

        # Calculate saju data from birth info (simplified backend calculation)
        saju_data = _calculate_simple_saju(birth_date, birth_time or "12:00")

        # Get REAL-TIME astrology data
        realtime_transits = get_current_transits()
        moon_data = realtime_transits.get("moon", {})
        retrogrades = realtime_transits.get("retrogrades", [])
        aspects = realtime_transits.get("aspects", [])
        planets = realtime_transits.get("planets", [])

        # Determine planetary hour from current hour
        from datetime import datetime as dt_module
        current_hour = dt_module.now().hour
        planetary_hours = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
        planetary_hour_ruler = planetary_hours[current_hour % 7]

        # Build astro_data with real values
        astro_data = {
            "planets": planets,
            "transits": [{"planet": a["planet1"], "aspect": a["aspect"], "natalPlanet": a["planet2"]} for a in aspects[:5]],
            "aspects": aspects,
            "electional": {
                "moonPhase": {"phase": moon_data.get("phase_name", "Unknown")},
                "planetaryHour": {"planet": planetary_hour_ruler},
                "voidOfCourse": {"isVoid": False},  # TODO: implement VOC calculation
                "retrograde": retrogrades,
            }
        }

        score_result = calculate_fortune_score(saju_data, astro_data)

        # Extract score breakdown
        saju_breakdown = score_result.get("saju", {})
        astro_breakdown = score_result.get("astro", {})
        total_score = score_result["total"]

        # =====================================================
        # 영역별 점수 계산 (사주 십신 + 오행 + 점성술 교차 분석)
        # =====================================================

        # Get day master and current unse elements
        day_master = saju_data.get("dayMaster", {})
        dm_element = day_master.get("element", "木") if isinstance(day_master, dict) else "木"

        # Get today's pillar element from unse
        unse = saju_data.get("unse", {})
        iljin = unse.get("iljin", [{}])
        today_element = iljin[0].get("element", "木") if iljin else "木"

        # Get sibsin distribution
        adv = saju_data.get("advancedAnalysis", {})
        sibsin = adv.get("sibsin", {})
        sibsin_dist = sibsin.get("distribution", {}) or sibsin.get("counts", {})

        # 영역별 관련 십성 및 오행 (사주 전통 이론 기반)
        AREA_CONFIG = {
            "love": {
                "boost_sibsin": ["정관", "정재", "식신"],  # 정관=배우자(여), 정재=배우자(남), 식신=매력
                "penalty_sibsin": ["편관", "상관"],  # 편관=불안정, 상관=구설
                "related_elements": ["火", "木"],  # 화=열정, 목=성장
                "astro_boost": ["Venus", "Moon"],  # 금성=사랑, 달=감정
            },
            "career": {
                "boost_sibsin": ["정관", "편관", "정인"],  # 관성=직장, 인성=권위
                "penalty_sibsin": ["상관"],  # 상관=상사충돌
                "related_elements": ["金", "土"],  # 금=결단, 토=안정
                "astro_boost": ["Saturn", "Jupiter", "Sun"],  # 토성=책임, 목성=성공, 태양=명예
            },
            "wealth": {
                "boost_sibsin": ["정재", "편재", "식신"],  # 재성=재물, 식신=생산
                "penalty_sibsin": ["겁재", "비견"],  # 비겁=경쟁/손재
                "related_elements": ["土", "金"],  # 토=축적, 금=가치
                "astro_boost": ["Jupiter", "Venus"],  # 목성=확장, 금성=가치
            },
            "health": {
                "boost_sibsin": ["정인", "비견"],  # 인성=보호, 비견=체력
                "penalty_sibsin": ["편관", "상관"],  # 관성=스트레스, 상관=소모
                "related_elements": ["木", "水"],  # 목=생기, 수=유연
                "astro_boost": ["Moon", "Sun"],  # 달=리듬, 태양=활력
            },
        }

        # 오행 상생상극 관계
        ELEMENT_GENERATING = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
        ELEMENT_CONTROLLING = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}

        # 행성별 유리한/불리한 사인 (Dignity/Detriment)
        PLANET_DIGNITY = {
            "Venus": {"dignity": ["Taurus", "Libra"], "detriment": ["Scorpio", "Aries"]},
            "Mars": {"dignity": ["Aries", "Scorpio"], "detriment": ["Libra", "Taurus"]},
            "Jupiter": {"dignity": ["Sagittarius", "Pisces"], "detriment": ["Gemini", "Virgo"]},
            "Saturn": {"dignity": ["Capricorn", "Aquarius"], "detriment": ["Cancer", "Leo"]},
            "Mercury": {"dignity": ["Gemini", "Virgo"], "detriment": ["Sagittarius", "Pisces"]},
            "Sun": {"dignity": ["Leo"], "detriment": ["Aquarius"]},
            "Moon": {"dignity": ["Cancer"], "detriment": ["Capricorn"]},
        }

        # Aspect scores
        ASPECT_SCORES = {
            "conjunction": 3, "trine": 4, "sextile": 2,
            "square": -3, "opposition": -2,
        }

        # 영역별 관련 하우스/사인
        AREA_ASTRO_SIGNS = {
            "love": ["Libra", "Taurus", "Cancer", "Pisces"],  # 7H, Venus ruled, emotional
            "career": ["Capricorn", "Leo", "Aries", "Virgo"],  # 10H, Sun ruled, achievement
            "wealth": ["Taurus", "Scorpio", "Cancer", "Capricorn"],  # 2H, 8H, material
            "health": ["Virgo", "Aries", "Scorpio", "Leo"],  # 6H, vitality signs
        }

        def calc_area_score(area: str) -> int:
            config = AREA_CONFIG[area]
            score = 50  # 기본점수

            # ========== 사주 요소 (50%) ==========

            # 1. 십신 가산/감산 - 최대 ±15점
            for boost in config["boost_sibsin"]:
                if sibsin_dist.get(boost, 0) > 0:
                    score += 4 * min(sibsin_dist.get(boost, 0), 3)
            for penalty in config["penalty_sibsin"]:
                if sibsin_dist.get(penalty, 0) > 1:
                    score -= 3 * (sibsin_dist.get(penalty, 0) - 1)

            # 2. 오늘 운세 오행과 영역 관련 오행 매칭 - 최대 +12점
            if today_element in config["related_elements"]:
                score += 12

            # 3. 일간과 오늘 오행의 관계 - 최대 ±10점
            if today_element == dm_element:
                score += 4  # 비화
            elif ELEMENT_GENERATING.get(today_element) == dm_element:
                score += 10  # 생조
            elif ELEMENT_CONTROLLING.get(today_element) == dm_element:
                score -= 8  # 극입
            elif ELEMENT_GENERATING.get(dm_element) == today_element:
                score -= 4  # 설기

            # 4. 형충회합 - 최대 ±8점
            hc = adv.get("hyeongchung", {})
            if area == "love":
                score += len(hc.get("hap", [])) * 3
                score -= len(hc.get("chung", [])) * 4
            elif area == "career":
                score += len(hc.get("samhap", [])) * 2  # 삼합=큰 성과
                score -= len(hc.get("hyeong", [])) * 2  # 형=갈등

            # ========== 점성술 요소 (50%) ==========

            # 5. 관련 행성 상태 (순행/역행 + Dignity) - 최대 ±15점
            for planet in planets:
                planet_name = planet.get("name", "")
                planet_sign = planet.get("sign", "")

                if planet_name in config["astro_boost"]:
                    # 순행/역행
                    if not planet.get("retrograde"):
                        score += 3
                    else:
                        score -= 2

                    # Dignity/Detriment (행성이 유리한 사인에 있는지)
                    dignity_info = PLANET_DIGNITY.get(planet_name, {})
                    if planet_sign in dignity_info.get("dignity", []):
                        score += 5  # 본위치 = 강화
                    elif planet_sign in dignity_info.get("detriment", []):
                        score -= 3  # 불리한 위치

            # 6. 현재 행성이 영역 관련 사인에 있는지 - 최대 +10점
            area_signs = AREA_ASTRO_SIGNS.get(area, [])
            for planet in planets[:5]:  # 개인행성만 (Sun~Mars)
                if planet.get("sign") in area_signs:
                    score += 2

            # 7. 트랜짓 Aspects 분석 - 최대 ±12점
            for asp in aspects:
                p1 = asp.get("planet1", "")
                p2 = asp.get("planet2", "")
                asp_type = asp.get("aspect", "").lower()

                # 영역 관련 행성이 포함된 aspect
                if p1 in config["astro_boost"] or p2 in config["astro_boost"]:
                    asp_score = ASPECT_SCORES.get(asp_type, 0)
                    score += asp_score

            # 8. 달 위상 - 최대 ±8점 (모든 영역에 영향)
            moon_phase = moon_data.get("phase_name", "")
            moon_scores = {
                "Full Moon": 8, "Waxing Gibbous": 5, "First Quarter": 3,
                "Waxing Crescent": 2, "New Moon": -3, "Waning Crescent": -2,
                "Last Quarter": 0, "Waning Gibbous": 1,
            }
            base_moon = moon_scores.get(moon_phase, 0)
            # 연애/건강은 달 영향 더 받음
            if area in ["love", "health"]:
                score += int(base_moon * 1.2)
            else:
                score += int(base_moon * 0.7)

            # 9. 역행 영향 (영역별 차등) - 최대 -8점
            if "Mercury" in retrogrades:
                if area == "career":
                    score -= 5  # 소통/계약 문제
                elif area == "wealth":
                    score -= 4  # 거래 지연
            if "Venus" in retrogrades:
                if area == "love":
                    score -= 6  # 연애 역행
                elif area == "wealth":
                    score -= 3  # 금전 가치 혼란
            if "Mars" in retrogrades:
                if area == "career":
                    score -= 4  # 추진력 약화
                elif area == "health":
                    score -= 3  # 에너지 저하
            if "Jupiter" in retrogrades:
                if area in ["wealth", "career"]:
                    score -= 3  # 확장 지연

            return max(0, min(100, score))

        love_score = calc_area_score("love")
        career_score = calc_area_score("career")
        wealth_score = calc_area_score("wealth")
        health_score = calc_area_score("health")

        # Overall = 영역별 가중 평균 + FortuneScoreEngine cross_bonus 반영
        cross_bonus = score_result.get("cross_bonus", 0)
        overall_score = int((love_score + career_score + wealth_score + health_score) / 4 + cross_bonus)
        overall_score = max(0, min(100, overall_score))

        return jsonify({
            "status": "success",
            "fortune": {
                "overall": overall_score,
                "love": love_score,
                "career": career_score,
                "wealth": wealth_score,
                "health": health_score,
            },
            "breakdown": score_result,
            "realtime_astro": {
                "moon_phase": moon_data.get("phase_name"),
                "moon_illumination": moon_data.get("illumination"),
                "retrogrades": retrogrades,
                "planetary_hour": planetary_hour_ruler,
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
        if len(people) > 5:
            return jsonify({"status": "error", "message": "Maximum 5 people supported"}), 400

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
            "numerology": HAS_NUMEROLOGY,
            "icp": HAS_ICP,
        },
        "version": "5.3.0-numerology-icp",
    })


# ===============================================================
# NUMEROLOGY ENDPOINTS
# ===============================================================

@app.route("/api/numerology/analyze", methods=["POST"])
def numerology_analyze():
    """
    Analyze numerology profile from birth date and name.

    Request body:
    {
        "birthDate": "YYYY-MM-DD",
        "englishName": "Full Name" (optional),
        "koreanName": "한글이름" (optional),
        "locale": "ko" (optional)
    }
    """
    if not HAS_NUMEROLOGY:
        return jsonify({"error": "Numerology module not available"}), 503

    try:
        data = request.get_json() or {}
        birth_date = data.get("birthDate")
        if not birth_date:
            return jsonify({"error": "birthDate is required"}), 400

        result = analyze_numerology(
            birth_date=birth_date,
            english_name=data.get("englishName"),
            korean_name=data.get("koreanName"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[numerology_analyze] Error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/numerology/compatibility", methods=["POST"])
def numerology_compatibility():
    """
    Analyze numerology compatibility between two people.

    Request body:
    {
        "person1": {"birthDate": "YYYY-MM-DD", "name": "Name"},
        "person2": {"birthDate": "YYYY-MM-DD", "name": "Name"},
        "locale": "ko"
    }
    """
    if not HAS_NUMEROLOGY:
        return jsonify({"error": "Numerology module not available"}), 503

    try:
        data = request.get_json() or {}
        p1 = data.get("person1", {})
        p2 = data.get("person2", {})

        if not p1.get("birthDate") or not p2.get("birthDate"):
            return jsonify({"error": "Both birthDates are required"}), 400

        result = analyze_numerology_compatibility(
            person1_birth=p1["birthDate"],
            person2_birth=p2["birthDate"],
            person1_name=p1.get("name"),
            person2_name=p2.get("name"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[numerology_compatibility] Error")
        return jsonify({"error": str(e)}), 500


# ===============================================================
# ICP (INTERPERSONAL CIRCUMPLEX) ENDPOINTS
# ===============================================================

@app.route("/api/icp/analyze", methods=["POST"])
def icp_analyze():
    """
    Analyze ICP interpersonal style from saju/astrology data.

    Request body:
    {
        "sajuData": {...},  (optional)
        "astroData": {...}, (optional)
        "locale": "ko"
    }
    """
    if not HAS_ICP:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        result = analyze_icp_style(
            saju_data=data.get("sajuData"),
            astro_data=data.get("astroData"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[icp_analyze] Error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/icp/compatibility", methods=["POST"])
def icp_compatibility():
    """
    Analyze ICP compatibility between two people.

    Request body:
    {
        "person1": {"sajuData": {...}, "astroData": {...}},
        "person2": {"sajuData": {...}, "astroData": {...}},
        "locale": "ko"
    }
    """
    if not HAS_ICP:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        p1 = data.get("person1", {})
        p2 = data.get("person2", {})

        result = analyze_icp_compatibility(
            person1_saju=p1.get("sajuData"),
            person1_astro=p1.get("astroData"),
            person2_saju=p2.get("sajuData"),
            person2_astro=p2.get("astroData"),
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[icp_compatibility] Error")
        return jsonify({"error": str(e)}), 500


@app.route("/api/icp/questions", methods=["POST"])
def icp_questions():
    """
    Get therapeutic questions for an ICP style.

    Request body:
    {
        "style": "PA",  (ICP octant code)
        "locale": "ko"
    }
    """
    if not HAS_ICP:
        return jsonify({"error": "ICP module not available"}), 503

    try:
        data = request.get_json() or {}
        style = data.get("style", "LM")
        result = get_icp_questions(
            style=style,
            locale=data.get("locale", "ko")
        )
        return jsonify(result)

    except Exception as e:
        logger.exception("[icp_questions] Error")
        return jsonify({"error": str(e)}), 500


# ===============================================================
# SESSION SUMMARY API - Auto-generate counseling session summaries
# ===============================================================

@app.route("/api/counseling/session-summary", methods=["POST"])
def counseling_session_summary():
    """
    Generate a summary for a counseling session.
    상담 세션 요약 자동 생성 - 다음 세션 연속성을 위해.

    Request body:
    {
        "messages": [{"role": "user/assistant", "content": "..."}, ...],
        "saju_data": {...},  // Optional
        "astro_data": {...},  // Optional
        "locale": "ko"  // Optional
    }

    Response:
    {
        "summary": "...",
        "key_topics": ["topic1", "topic2"],
        "emotional_journey": "...",
        "recommended_followup": ["question1", "question2"],
        "jung_insights": {...}
    }
    """
    try:
        data = request.get_json(force=True)
        messages = data.get("messages", [])
        locale = data.get("locale", "ko")
        saju_data = data.get("saju_data", {})
        astro_data = data.get("astro_data", {})

        if not messages or len(messages) < 2:
            return jsonify({"status": "error", "message": "At least 2 messages required for summary"}), 400

        # Extract user messages for analysis
        user_messages = [m["content"] for m in messages if m.get("role") == "user"]
        assistant_messages = [m["content"] for m in messages if m.get("role") == "assistant"]

        # Topic extraction
        topic_keywords = {
            "연애/관계": ["연애", "사랑", "결혼", "이별", "썸", "짝사랑", "커플"],
            "커리어/진로": ["취업", "이직", "진로", "사업", "퇴사", "회사", "직장"],
            "가족": ["부모", "엄마", "아빠", "가족", "형제", "자매", "자녀"],
            "자기탐색": ["성격", "나는", "어떤 사람", "장점", "단점", "정체성"],
            "건강/스트레스": ["힘들", "우울", "지쳐", "스트레스", "불안", "걱정"],
            "재정": ["돈", "재정", "경제", "투자", "부동산"],
            "타이밍/시기": ["언제", "시기", "타이밍", "올해", "내년"],
        }

        detected_topics = []
        all_user_text = " ".join(user_messages).lower()
        for topic, keywords in topic_keywords.items():
            if any(kw in all_user_text for kw in keywords):
                detected_topics.append(topic)

        # Emotional journey extraction
        emotions_timeline = []
        emotion_map = {
            "exhausted": "지침",
            "sad": "슬픔",
            "anxious": "불안",
            "angry": "분노",
            "lonely": "외로움",
            "hopeful": "희망",
            "confused": "혼란",
            "relieved": "안도",
            "grateful": "감사",
        }

        for msg in user_messages:
            msg_lower = msg.lower()
            for eng_emotion, kr_emotion in emotion_map.items():
                if any(k in msg_lower for k in [kr_emotion, eng_emotion]):
                    if kr_emotion not in emotions_timeline:
                        emotions_timeline.append(kr_emotion)

        # Generate summary using OpenAI
        summary_text = ""
        recommended_followup = []

        if OPENAI_AVAILABLE:
            try:
                # Build conversation context
                conv_text = "\n".join([
                    f"{'사용자' if m['role'] == 'user' else '상담사'}: {m['content'][:300]}"
                    for m in messages[-10:]  # Last 10 messages
                ])

                summary_prompt = f"""다음 상담 대화를 분석하고 요약해주세요.

{conv_text}

다음 형식으로 응답해주세요:
1. 핵심 요약 (2-3문장): 이 세션에서 다룬 주요 내용
2. 감정 여정: 사용자의 감정이 어떻게 변화했는지
3. 핵심 통찰: 상담에서 발견한 중요한 인사이트
4. 다음 세션 추천 질문 (2개): 후속 상담에서 다룰 만한 주제

JSON 형식으로 응답하세요:
{{"summary": "...", "emotional_journey": "...", "key_insight": "...", "followup_questions": ["...", "..."]}}"""

                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.5,
                    max_tokens=500,
                )

                import json as json_mod
                try:
                    result = json_mod.loads(response.choices[0].message.content)
                    summary_text = result.get("summary", "")
                    emotional_journey = result.get("emotional_journey", "")
                    key_insight = result.get("key_insight", "")
                    recommended_followup = result.get("followup_questions", [])
                except:
                    summary_text = response.choices[0].message.content[:500]
                    emotional_journey = " → ".join(emotions_timeline) if emotions_timeline else "파악 불가"
                    key_insight = ""
                    recommended_followup = []

            except Exception as e:
                logger.warning(f"[SESSION-SUMMARY] OpenAI call failed: {e}")
                summary_text = f"주요 주제: {', '.join(detected_topics[:3]) if detected_topics else '일반 상담'}"
                emotional_journey = " → ".join(emotions_timeline) if emotions_timeline else "파악 불가"
                key_insight = ""
        else:
            summary_text = f"주요 주제: {', '.join(detected_topics[:3]) if detected_topics else '일반 상담'}"
            emotional_journey = " → ".join(emotions_timeline) if emotions_timeline else "파악 불가"
            key_insight = ""

        # Jung insights based on detected topics
        jung_insights = {}
        if "연애/관계" in detected_topics:
            jung_insights["archetype"] = "아니마/아니무스"
            jung_insights["theme"] = "관계 투사 작업"
        elif "자기탐색" in detected_topics:
            jung_insights["archetype"] = "페르소나/그림자"
            jung_insights["theme"] = "자기 통합"
        elif "가족" in detected_topics:
            jung_insights["archetype"] = "부모 콤플렉스"
            jung_insights["theme"] = "원가족 작업"
        elif "건강/스트레스" in detected_topics:
            jung_insights["archetype"] = "그림자"
            jung_insights["theme"] = "억압된 감정 작업"

        return jsonify({
            "status": "success",
            "summary": summary_text,
            "key_topics": detected_topics[:5],
            "emotional_journey": emotional_journey if isinstance(emotional_journey, str) else " → ".join(emotions_timeline),
            "key_insight": key_insight if 'key_insight' in dir() else "",
            "recommended_followup": recommended_followup[:2],
            "jung_insights": jung_insights,
            "message_count": len(messages),
            "user_message_count": len(user_messages),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/session-summary failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/active-imagination", methods=["POST"])
def counseling_active_imagination():
    """
    Get active imagination exercise prompts based on context.
    적극적 상상 기법 안내 프롬프트 제공.
    """
    try:
        data = request.get_json(force=True)
        context = data.get("context", "")
        archetype = data.get("archetype", "")  # shadow, anima_animus, inner_child, wise_figure

        # Load jung data
        jung_data = _load_jung_data()
        ai_data = jung_data.get("active_imagination", {})

        if not ai_data:
            return jsonify({
                "status": "error",
                "message": "Active imagination data not available"
            }), 501

        # Get relevant prompts
        facilitation = ai_data.get("ai_facilitation_guide", {})
        practice_methods = ai_data.get("practice_methods", {})

        # Determine method based on context
        method = "dialogue_with_figure"  # Default
        context_lower = context.lower()

        if any(k in context_lower for k in ["꿈", "악몽"]):
            method = "dream_continuation"
        elif any(k in context_lower for k in ["몸", "아프", "통증", "증상"]):
            method = "body_symptom_dialogue"
        elif any(k in context_lower for k in ["화나", "슬퍼", "두려", "감정"]):
            method = "emotion_personification"

        method_data = practice_methods.get(method, {})

        # Get archetype-specific questions if available
        archetype_questions = []
        if archetype and method == "dialogue_with_figure":
            archetype_data = method_data.get("archetype_specific", {}).get(archetype, {})
            archetype_questions = archetype_data.get("questions", [])

        # Build response
        response = {
            "status": "success",
            "method": method_data.get("name_ko", method),
            "description": method_data.get("description", ""),
            "steps": method_data.get("steps", []),
            "suggested_questions": method_data.get("suggested_questions", archetype_questions),
            "opening_prompts": facilitation.get("opening_prompts", {}).get("general", []),
            "deepening_prompts": facilitation.get("deepening_prompts", [])[:3],
            "integration_prompts": facilitation.get("integration_prompts", [])[:2],
            "safety_notes": facilitation.get("safety_responses", {}).get("overwhelming", []),
        }

        # Add archetype approach if applicable
        if archetype:
            archetype_data = practice_methods.get("dialogue_with_figure", {}).get("archetype_specific", {}).get(archetype, {})
            if archetype_data:
                response["archetype_approach"] = archetype_data.get("approach", "")
                response["archetype_questions"] = archetype_data.get("questions", [])

        return jsonify(response)

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/active-imagination failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/counseling/lifespan-guidance", methods=["GET"])
def counseling_lifespan_guidance():
    """
    Get age-appropriate psychological guidance.
    생애주기별 심리 발달 과제 안내.
    """
    try:
        birth_year = request.args.get("birth_year", type=int)

        if not birth_year:
            return jsonify({
                "status": "error",
                "message": "birth_year parameter required"
            }), 400

        guidance = get_lifespan_guidance(birth_year)

        if not guidance:
            return jsonify({
                "status": "error",
                "message": "Lifespan guidance data not available"
            }), 501

        return jsonify({
            "status": "success",
            **guidance
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/counseling/lifespan-guidance failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# SAJU-ONLY COUNSELOR ENDPOINTS
# ============================================================

@app.route("/saju/counselor/init", methods=["POST"])
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
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        logger.info(f"[SAJU-COUNSELOR-INIT] id={g.request_id} theme={theme}")

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
        try:
            from backend_ai.app.graph_rag import get_graph_rag
            graph_rag = get_graph_rag()
            if graph_rag:
                # Query saju-specific rules
                day_master = saju_data.get("dayMaster", {}).get("heavenlyStem", "")
                queries = [
                    f"사주 일간 {day_master} 특성",
                    f"오행 균형 분석",
                    f"대운 세운 해석",
                    f"사주 {theme} 운세",
                ]
                for q in queries:
                    nodes = graph_rag.search(q, top_k=3)
                    rag_data["graph_nodes"].extend([n.get("text", "") for n in nodes if n.get("text")])
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


@app.route("/saju/ask-stream", methods=["POST"])
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
        birth_data = data.get("birth") or {}
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

        # Compute saju if not provided
        if not saju_data and birth_data.get("date") and birth_data.get("time"):
            try:
                saju_data = calculate_saju_data(
                    birth_data["date"],
                    birth_data["time"],
                    birth_data.get("gender", "male")
                )
            except Exception as e:
                logger.warning(f"[SAJU-ASK-STREAM] Failed to compute saju: {e}")

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

        # Streaming response
        def generate():
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    temperature=0.7,
                    max_tokens=800,
                )

                collected_text = ""
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        text = chunk.choices[0].delta.content
                        collected_text += text
                        yield f"data: {text}\n\n"

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

@app.route("/astrology/counselor/init", methods=["POST"])
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
        birth_data = data.get("birth") or {}
        theme = data.get("theme", "life")
        locale = data.get("locale", "ko")

        logger.info(f"[ASTROLOGY-COUNSELOR-INIT] id={g.request_id} theme={theme}")

        # Generate session ID
        session_id = str(uuid4())[:12]

        start_time = time.time()

        # Compute astrology if not provided but birth info is available
        if not astro_data and birth_data.get("date") and birth_data.get("time"):
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


@app.route("/astrology/ask-stream", methods=["POST"])
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
        birth_data = data.get("birth") or {}
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

        # Compute astrology if not provided
        if not astro_data and birth_data.get("date") and birth_data.get("time"):
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

        # Streaming response
        def generate():
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    temperature=0.7,
                    max_tokens=800,
                )

                collected_text = ""
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        text = chunk.choices[0].delta.content
                        collected_text += text
                        yield f"data: {text}\n\n"

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Flask server starting on http://127.0.0.1:{port}")
    logger.info(f"Capabilities: realtime={HAS_REALTIME}, charts={HAS_CHARTS}, memory={HAS_USER_MEMORY}, persona={HAS_PERSONA_EMBED}, tarot={HAS_TAROT}, rlhf={HAS_RLHF}, badges={HAS_BADGES}, agentic={HAS_AGENTIC}, prediction={HAS_PREDICTION}, theme_filter={HAS_THEME_FILTER}, fortune_score={HAS_FORTUNE_SCORE}, compatibility={HAS_COMPATIBILITY}, hybrid_rag={HAS_HYBRID_RAG}, domain_rag={HAS_DOMAIN_RAG}")

    # 🚀 Warmup models before accepting requests
    warmup_models()

    app.run(host="0.0.0.0", port=port, debug=True)
