# backend_ai/app/fusion_logic.py
"""
Fusion Logic - Main AI Interpreter

Combines Saju, Astrology, Tarot with RAG and LLM for comprehensive readings.
Supports both GPT mode (full RAG) and Template mode (fast, no memory-heavy models).
"""

import json
import os
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from dotenv import load_dotenv

from app.performance_optimizer import track_performance
from app.redis_cache import get_cache
from app.rendering import render_template_report
from app.rule_engine import RuleEngine
from app.sanitizer import is_suspicious_input, sanitize_user_input, validate_birth_data
from app.signal_extractor import extract_signals, summarize_cross_signals, summarize_signals

# ===============================================================
# CONSTANTS
# ===============================================================
_CACHE_VERSION = "v6"  # Personalized daeun meanings, remove keywords, filter 4-5 stars
_PARALLEL_MAX_WORKERS = 8
_PARALLEL_TASK_TIMEOUT = 5  # seconds
_MAX_STRUCTURED_PROMPT_LENGTH = 50000
_MAX_CONTEXT_STORAGE = 2000
_DEFAULT_AVG_LEN = 4800

# Lazy imports for memory-heavy modules (avoid OOM on memory-limited environments)
# SentenceTransformer models use 500MB+ memory, only load when needed
_graph_rag_instance = None
_corpus_rag_instance = None

def get_graph_rag():
    """Lazy load GraphRAG to save memory in template mode."""
    global _graph_rag_instance
    if _graph_rag_instance is None:
        from saju_astro_rag import get_graph_rag as _get_rag
        _graph_rag_instance = _get_rag()
    return _graph_rag_instance

def get_corpus_rag():
    """Lazy load CorpusRAG to save memory in template mode."""
    global _corpus_rag_instance
    if _corpus_rag_instance is None:
        from corpus_rag import get_corpus_rag as _get_corpus
        _corpus_rag_instance = _get_corpus()
    return _corpus_rag_instance

def get_llm():
    """Lazy load LLM module."""
    from backend_ai.model.fusion_generate import get_llm as _get_llm
    return _get_llm()

def generate_fusion_report(*args, **kwargs):
    """Lazy load fusion report generator."""
    from backend_ai.model.fusion_generate import generate_fusion_report as _gen
    return _gen(*args, **kwargs)

# Persona semantic search (Jung/Stoic V4) - lazy loaded
HAS_PERSONA_EMBED = True  # Assume available, will fail gracefully if not
_persona_embed_rag = None

def get_persona_embed_rag():
    """Lazy load PersonaEmbedRAG to save memory."""
    global _persona_embed_rag, HAS_PERSONA_EMBED
    if _persona_embed_rag is None:
        try:
            from persona_embeddings import get_persona_embed_rag as _get_persona
            _persona_embed_rag = _get_persona()
        except ImportError:
            HAS_PERSONA_EMBED = False
            print("[fusion_logic] PersonaEmbedRAG not available")
            return None
    return _persona_embed_rag

# User memory for consultation history (MOAT feature)
try:
    from user_memory import get_user_memory, generate_user_id
    HAS_USER_MEMORY = True
except ImportError:
    HAS_USER_MEMORY = False
    print("[fusion_logic] UserMemory not available")

# RLHF Feedback Learning System
try:
    from feedback_learning import get_feedback_learning
    HAS_RLHF = True
except ImportError:
    HAS_RLHF = False
    print("[fusion_logic] RLHF FeedbackLearning not available")

# Agentic RAG System (Next Level Features) - Lazy loaded to avoid OOM
# Import deferred to first use to prevent loading SentenceTransformer on startup
HAS_AGENTIC = True  # Assume available, will fail gracefully if not
_agentic_module = None

def _get_agentic_module():
    """Lazy load agentic_rag module."""
    global _agentic_module, HAS_AGENTIC
    if _agentic_module is None:
        try:
            from . import agentic_rag as _ar
            _agentic_module = _ar
        except ImportError:
            HAS_AGENTIC = False
            print("[fusion_logic] Agentic RAG not available (lazy load)")
            return None
    return _agentic_module

def agentic_query(*args, **kwargs):
    """Lazy wrapper for agentic_query."""
    m = _get_agentic_module()
    return m.agentic_query(*args, **kwargs) if m else {"status": "error", "message": "Agentic RAG not available"}

def get_entity_extractor():
    """Lazy wrapper for get_entity_extractor."""
    m = _get_agentic_module()
    return m.get_entity_extractor() if m else None

# Theme-based Cross-Reference Filter (v5.1)
try:
    from theme_cross_filter import get_theme_filter, get_theme_prompt_context
    HAS_THEME_FILTER = True
except ImportError:
    HAS_THEME_FILTER = False
    print("[fusion_logic] Theme cross filter not available")

# Simple in-memory stats for average length per theme
report_memory: Dict[str, Dict[str, Any]] = {}

# ===============================================================
# ELEMENT & INTERPRETATION HELPERS
# ===============================================================
# Base element data (avoid duplication between Korean and English keys)
_ELEMENT_DATA = {
    "wood": {"name": "Wood/목", "traits": "growth, creativity, flexibility, ambition", "organ": "liver/gallbladder"},
    "fire": {"name": "Fire/화", "traits": "passion, charisma, intuition, energy", "organ": "heart/small intestine"},
    "earth": {"name": "Earth/토", "traits": "stability, nurturing, practicality, trust", "organ": "spleen/stomach"},
    "metal": {"name": "Metal/금", "traits": "discipline, precision, justice, focus", "organ": "lungs/large intestine"},
    "water": {"name": "Water/수", "traits": "wisdom, adaptability, depth, intuition", "organ": "kidneys/bladder"},
}

# Map Korean element names to English keys
_ELEMENT_KO_MAP = {"목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water"}

# Build ELEMENT_TRAITS with both Korean and English keys
ELEMENT_TRAITS = {**_ELEMENT_DATA, **{ko: _ELEMENT_DATA[en] for ko, en in _ELEMENT_KO_MAP.items()}}

TEN_GODS_MEANING = {
    "비견": "Peer/Competitor - independence, rivalry, partnership",
    "겁재": "Rob Wealth - boldness, risk-taking, competition",
    "식신": "Eating God - creativity, expression, enjoyment",
    "상관": "Hurting Officer - rebellion, innovation, critique",
    "편재": "Indirect Wealth - speculation, windfall, entrepreneurship",
    "정재": "Direct Wealth - stable income, savings, reliability",
    "편관": "Indirect Authority - pressure, challenge, discipline",
    "정관": "Direct Authority - status, law, organization",
    "편인": "Indirect Resource - unconventional learning, intuition",
    "정인": "Direct Resource - knowledge, nurturing, tradition",
}

ASPECT_MEANINGS = {
    "conjunction": "합 (Conjunction) - powerful blend, intensification of energies",
    "opposition": "충 (Opposition) - tension, awareness, potential for integration",
    "trine": "삼합 (Trine) - harmony, natural flow, gifts",
    "square": "사각 (Square) - friction, challenge, growth through effort",
    "sextile": "육합 (Sextile) - opportunity, cooperation, gentle support",
    "quincunx": "퀸컨스 (Quincunx) - adjustment needed, blind spots",
}

# Planet meanings for astrology interpretation
_PLANET_MEANINGS = {
    "Sun": "core identity, vitality, ego",
    "Moon": "emotions, instincts, inner needs",
    "Mercury": "communication, thinking, learning",
    "Venus": "love, beauty, values, money",
    "Mars": "action, drive, passion, conflict",
    "Jupiter": "expansion, luck, wisdom, abundance",
    "Saturn": "discipline, limits, karma, mastery",
    "Uranus": "innovation, rebellion, sudden change",
    "Neptune": "dreams, intuition, spirituality",
    "Pluto": "transformation, power, rebirth",
}

# Luck cycle labels and descriptions
_CYCLE_LABELS = {
    "daeun": ("대운 (Great Luck)", "10-year cycle, major life phases"),
    "annual": ("세운 (Annual Luck)", "yearly energy, current year themes"),
    "monthly": ("월운 (Monthly)", "monthly focus, timing for actions"),
    "iljin": ("일진 (Daily)", "daily energy, immediate timing"),
}

# Theme queries for Jung quotes
_THEME_QUERIES = {
    "love": "anima animus relationship projection love",
    "career": "persona individuation achievement work",
    "life_path": "individuation self wholeness becoming",
    "health": "shadow integration body psyche",
    "family": "mother father archetype complex family",
    "spiritual": "self collective unconscious transcendence",
    "daily": "consciousness awareness present moment",
    "monthly": "transformation change growth cycle",
    "wealth": "shadow projection value meaning",
}


# ===============================================================
# FULL DATA NATURALIZER (Enhanced)
# ===============================================================
def naturalize_facts(saju: dict, astro: dict, tarot: dict) -> tuple[str, str, str]:
    """Flatten saju/astro/tarot dicts into rich, interpretive summaries for prompts."""

    # -------------------- SAJU (Enhanced) --------------------
    s_parts = []
    facts = saju.get("facts", {})
    pillars = saju.get("pillars", {})
    day_master = saju.get("dayMaster", {})
    unse = saju.get("unse", {})
    sinsal = saju.get("sinsal", {})

    # Four Pillars with meaning
    if pillars:
        s_parts.append("\n[사주 4기둥 / Four Pillars]")
        s_parts.append(
            f"  • 연주(Year Pillar): {pillars.get('year')} - ancestral energy, social persona, outer world"
        )
        s_parts.append(
            f"  • 월주(Month Pillar): {pillars.get('month')} - parents, career path, life structure"
        )
        s_parts.append(
            f"  • 일주(Day Pillar): {pillars.get('day')} - core self, spouse relationship, inner nature"
        )
        s_parts.append(
            f"  • 시주(Hour Pillar): {pillars.get('time')} - children, later years, creative output"
        )

    # Day Master with interpretive context - CRITICAL: This is the person's core identity
    # Extract year stem to clarify it's different from day master
    year_stem = None
    if pillars and pillars.get('year'):
        year_pillar = pillars.get('year')
        if isinstance(year_pillar, dict):
            hs = year_pillar.get('heavenlyStem')
            if isinstance(hs, dict):
                year_stem = hs.get('name')

    if day_master:
        if isinstance(day_master, dict):
            dm_name = day_master.get('name', '')
            dm_element = day_master.get('element', '')
            dm_strength = day_master.get('strength', 'moderate')
            element_info = ELEMENT_TRAITS.get(dm_element, {})

            s_parts.append(f"\n{'='*50}")
            s_parts.append(f"⚠️ CRITICAL: 일간(日干) Day Master - CORE IDENTITY ⚠️")
            s_parts.append(f"{'='*50}")
            s_parts.append(f"  ★ Day Master (일간): {dm_name} ({element_info.get('name', dm_element)})")
            s_parts.append(f"  ★ This is the person's CORE SELF, NOT the year stem!")
            if year_stem and year_stem != dm_name:
                s_parts.append(f"  ★ Year stem (년간) is {year_stem} - this is DIFFERENT from day master")
            s_parts.append(f"{'='*50}")
            s_parts.append(f"  • Natural Traits: {element_info.get('traits', 'unique characteristics')}")
            s_parts.append(f"  • Strength: {dm_strength} — {'strong self-reliance' if dm_strength == 'strong' else 'benefits from support' if dm_strength == 'weak' else 'balanced energy'}")
            if element_info.get('organ'):
                s_parts.append(f"  • Body Association: {element_info.get('organ')} (wellness focus area)")
        else:
            s_parts.append(f"\n⚠️ CRITICAL: 일간(日干) Day Master: {day_master} ⚠️")

    # Five Elements Balance with interpretation
    if isinstance(facts.get("fiveElements"), dict):
        fe = facts["fiveElements"]
        s_parts.append("\n[오행 균형 / Five Elements Balance]")

        # Find dominant and weak elements
        sorted_elements = sorted(fe.items(), key=lambda x: x[1], reverse=True)
        dominant = sorted_elements[0] if sorted_elements else None
        weakest = sorted_elements[-1] if sorted_elements else None

        for elem, count in fe.items():
            elem_info = ELEMENT_TRAITS.get(elem, {})
            status = "우세" if dominant and elem == dominant[0] and count > 2 else ""
            status = "부족" if weakest and elem == weakest[0] and count == 0 else status
            s_parts.append(f"  • {elem_info.get('name', elem)}: {count} {status}")

        if dominant and dominant[1] > 3:
            s_parts.append(f"  • 우세 오행: {ELEMENT_TRAITS.get(dominant[0], {}).get('name', dominant[0])} - {ELEMENT_TRAITS.get(dominant[0], {}).get('traits', 'energy')}")
        if weakest and weakest[1] == 0:
            s_parts.append(f"  • 부족 오행: {ELEMENT_TRAITS.get(weakest[0], {}).get('name', weakest[0])} - conscious development needed")

    # Ten Gods with meanings
    if "tenGods" in facts:
        ten_gods = facts['tenGods']
        s_parts.append("\n[십성 (Ten Gods)]")
        if isinstance(ten_gods, dict):
            for god, info in ten_gods.items():
                meaning = TEN_GODS_MEANING.get(god, "special influence")
                s_parts.append(f"  • {god}: {meaning}")
        else:
            s_parts.append(f"  {ten_gods}")

    # Power Balance
    if "powerBalance" in facts:
        pb = facts['powerBalance']
        s_parts.append("\n[신강/신약 밸런스 / Power Balance]")
        if isinstance(pb, dict):
            balance_type = pb.get('type', 'balanced')
            s_parts.append(f"  • Type: {balance_type}")
            if balance_type in ["신강", "강", "strong"]:
                s_parts.append("  • Self-sufficient, leadership potential, may need to consider others")
            elif balance_type in ["신약", "약", "weak"]:
                s_parts.append("  • Collaborative nature, benefits from support, adaptable")
        else:
            s_parts.append(f"  {pb}")

    # Luck Cycles with context
    for key, (label, desc) in _CYCLE_LABELS.items():
        cycles = unse.get(key, [])
        if cycles:
            names = [c.get("name") or str(c) for c in cycles[:6]]
            s_parts.append(f"\n[{label}] ({desc})")
            s_parts.append(f"  Current/Upcoming: {', '.join(names)}")

    # Sinsal (Special Stars) with interpretation
    if sinsal and sinsal.get("hits"):
        s_parts.append("\n[신살 (Special Stars)]")
        for h in sinsal["hits"][:10]:
            name = h.get("name", "")
            desc = h.get("description", h.get("meaning", "unique influence"))
            if name:
                s_parts.append(f"  • {name}: {desc[:80]}")

    saju_text = "\n".join(s_parts) or "No saju facts."

    # -------------------- ASTRO (Enhanced) --------------------
    a_parts = []
    facts = astro.get("facts", {})
    planets = astro.get("planets", [])
    houses = astro.get("houses", [])
    aspects = astro.get("aspects", [])
    asc = astro.get("ascendant")
    mc = astro.get("mc")

    # Key Angles
    if asc or mc:
        a_parts.append("[주요 각도 / Key Angles]")
        if asc:
            asc_sign = asc.get('sign') if isinstance(asc, dict) else asc
            a_parts.append(f"  • Ascendant (ASC): {asc_sign} - first impression, physical presence, life approach")
        if mc:
            mc_sign = mc.get('sign') if isinstance(mc, dict) else mc
            a_parts.append(f"  • Midheaven (MC): {mc_sign} - career path, public image, life direction")

    # Planets with interpretive context
    if planets:
        a_parts.append("\n[행성 위치 / Planetary Positions]")
        for p in planets[:10]:
            if isinstance(p, dict):
                name = p.get('name', '')
                sign = p.get('sign', '')
                house = p.get('house', '')
                degree = p.get('degree', '')
                meaning = _PLANET_MEANINGS.get(name, 'influence')
                degree_str = f" at {degree}°" if degree else ""
                a_parts.append(f"  • {name} in {sign}{degree_str} (House {house}): {meaning}")

    # Aspects with meanings
    if aspects:
        a_parts.append("\n[주요 각 / Major Aspects]")
        for a in aspects[:12]:
            asp_type = a.get('aspect', '')
            p1 = a.get('planet1', '')
            p2 = a.get('planet2', '')
            orb = a.get('orb', '')
            meaning = ASPECT_MEANINGS.get(asp_type.lower(), 'connection')
            orb_str = f" (orb: {orb}°)" if orb else ""
            a_parts.append(f"  • {p1} {asp_type} {p2}{orb_str}: {meaning}")

    # Element Ratios with interpretation
    if facts.get("elementRatios"):
        er = facts["elementRatios"]
        a_parts.append("\n[오행 분포 / Element Distribution]")
        sorted_er = sorted(er.items(), key=lambda x: x[1], reverse=True)
        for elem, ratio in sorted_er:
            pct = round(ratio * 100) if ratio <= 1 else round(ratio)
            status = "우세" if pct > 35 else "낮음" if pct < 10 else ""
            a_parts.append(f"  • {elem}: {pct}% {status}")

    astro_text = "\n".join(a_parts) or "No astrology facts."

    # -------------------- TAROT (Enhanced) --------------------
    t_parts = []
    spread = tarot.get("spread") or {}
    drawn_cards = tarot.get("drawnCards") or tarot.get("cards") or []
    category = tarot.get("category") or tarot.get("theme")

    if category or spread:
        t_parts.append("[타로 리딩 / Tarot Reading]")
        if category:
            t_parts.append(f"  Theme: {category}")
        if spread:
            t_parts.append(f"  Spread: {spread.get('title') or spread.get('id')} ({spread.get('cardCount', len(drawn_cards))} cards)")

    if isinstance(drawn_cards, list) and drawn_cards:
        t_parts.append("\n[카드 해석 / Card Interpretations]")
        for idx, dc in enumerate(drawn_cards[:8]):
            card = dc.get("card") if isinstance(dc, dict) else None
            name = card.get("name") if isinstance(card, dict) else dc.get("name")
            is_reversed = dc.get("isReversed", False) if isinstance(dc, dict) else False
            orientation = "역방향 (Reversed)" if is_reversed else "정방향 (Upright)"

            keywords = []
            description = ""
            if isinstance(card, dict):
                meaning_block = card.get("reversed") if is_reversed else card.get("upright")
                if meaning_block and isinstance(meaning_block, dict):
                    keywords = meaning_block.get("keywords") or []
                    description = meaning_block.get("description", "")[:100]

            pos_label = ""
            if spread and spread.get("positions") and idx < len(spread["positions"]):
                pos = spread["positions"][idx]
                pos_label = pos.get("title") if isinstance(pos, dict) else str(pos)

            t_parts.append(f"  Card {idx+1}: {name} ({orientation})")
            if pos_label:
                t_parts.append(f"    Position: {pos_label}")
            if keywords:
                t_parts.append(f"    Keywords: {', '.join(keywords[:5])}")
            if description:
                t_parts.append(f"    Meaning: {description}")

    tarot_text = "\n".join(t_parts) or "No tarot facts."

    return saju_text, astro_text, tarot_text


# ===============================================================
#  PARALLEL PREPROCESSING HELPERS (v5.2 - Performance Optimization)
# ===============================================================
def _parallel_rag_query(rag, facts_data, domain):
    """Thread-safe RAG query."""
    try:
        return rag.query(facts_data, domain_priority=domain)
    except Exception as e:
        print(f"[Parallel] RAG {domain} error: {e}")
        return {}

def _parallel_jung_quotes(theme: str, locale: str) -> str:
    """Thread-safe Jung quotes retrieval.

    NOTE: Jung quotes are used as interpretive frameworks, not direct quotes.
    AI should say "칼융 심리학에 의하면" instead of "융이 말했듯이".
    """
    try:
        corpus_rag = get_corpus_rag()
        search_query = _THEME_QUERIES.get(theme, "individuation self shadow integration")
        _, formatted_quotes = corpus_rag.get_quotes_for_interpretation(
            query=search_query, locale=locale, top_k=2
        )
        return formatted_quotes or ""
    except Exception as e:
        print(f"[Parallel] Jung quotes error: {e}")
        return ""

def _parallel_user_memory(birth_data, theme, locale):
    """Thread-safe user memory retrieval."""
    if not HAS_USER_MEMORY or not birth_data:
        return "", None
    try:
        user_id = generate_user_id(birth_data)
        memory = get_user_memory(user_id)
        context = memory.build_context_for_llm(theme, locale, service_type="fusion")
        return context or "", user_id
    except Exception as e:
        print(f"[Parallel] User memory error: {e}")
        return "", None

def _parallel_rlhf_fewshot(theme, locale):
    """Thread-safe RLHF few-shot retrieval."""
    if not HAS_RLHF:
        return "", {}
    try:
        fl = get_feedback_learning()
        fewshot = fl.format_fewshot_prompt(theme, locale, top_k=2)
        weights = fl.get_rule_weights(theme)
        return fewshot or "", weights or {}
    except Exception as e:
        print(f"[Parallel] RLHF error: {e}")
        return "", {}

def _parallel_persona_semantic(user_prompt):
    """Thread-safe persona semantic search."""
    if not HAS_PERSONA_EMBED or not user_prompt:
        return ""
    try:
        persona_rag = get_persona_embed_rag()
        semantic_context = persona_rag.get_persona_context(user_prompt, top_k=2)
        parts = []
        if semantic_context.get("jung_insights"):
            parts.append("[Jung 인사이트]\n" + "\n".join(semantic_context["jung_insights"][:2]))
        if semantic_context.get("stoic_insights"):
            parts.append("[Stoic 인사이트]\n" + "\n".join(semantic_context["stoic_insights"][:2]))
        return "\n\n".join(parts) if parts else ""
    except Exception as e:
        print(f"[Parallel] Persona semantic error: {e}")
        return ""


# ===============================================================
#  MAIN INTERPRETER (Fusion Controller)
# ===============================================================
@track_performance
def interpret_with_ai(facts: dict):
    """
    saju + astro + graph + rules + LLM
    Optimized with parallel preprocessing (v5.2)
    """
    load_dotenv()
    try:
        render_mode = facts.get("render_mode", "gpt")  # "gpt" (default) or "template"
        api_key = os.getenv("OPENAI_API_KEY")
        if render_mode != "template" and not api_key:
            # Fallback to template mode if no API key
            render_mode = "template"

        locale = facts.get("locale", "en")
        raw_prompt = facts.get("prompt") or ""

        # Check if this is a structured JSON request from frontend (not user input)
        # These prompts contain schema instructions and should not be truncated
        is_structured_prompt = (
            "You MUST return a valid JSON object" in raw_prompt or
            '"lifeTimeline"' in raw_prompt or
            '"categoryAnalysis"' in raw_prompt
        )

        # v3.1: Check if frontend sent comprehensive snapshot (from buildAllDataPrompt)
        is_frontend_v3_snapshot = (
            "[COMPREHENSIVE DATA SNAPSHOT v3" in raw_prompt or
            "PART 1: 사주 (KOREAN ASTROLOGY - SAJU)" in raw_prompt
        )

        if is_structured_prompt or is_frontend_v3_snapshot:
            # For structured prompts or v3.1 snapshots from frontend, allow full length (no truncation)
            user_prompt = sanitize_user_input(raw_prompt, max_length=_MAX_STRUCTURED_PROMPT_LENGTH, allow_newlines=True)
            if is_structured_prompt:
                print(f"[FusionLogic] Structured JSON prompt detected (len={len(raw_prompt)})")
            if is_frontend_v3_snapshot:
                print(f"[FusionLogic] Frontend v3.1 snapshot detected (len={len(raw_prompt)}) - using as authoritative data")
        else:
            # Normal user input - apply strict sanitization
            user_prompt = sanitize_user_input(raw_prompt)

        theme = facts.get("theme", "life_path")

        # Lightweight monitoring (does not block request)
        if is_suspicious_input(raw_prompt):
            import logging

            logging.getLogger("backend_ai.security").warning(
                f"[Security] Suspicious input detected in fusion request"
            )

        # Validate birth data shape early (non-blocking)
        birth_data = facts.get("saju", {}).get("facts", {})
        birth_date = birth_data.get("birth_date") or birth_data.get("birthDate")
        birth_time = birth_data.get("birth_time") or birth_data.get("birthTime")
        birth_year = birth_data.get("birth_year") or birth_data.get("birthYear")

        if birth_date or birth_time or birth_year:
            is_valid, validation_error = validate_birth_data(
                birth_date, birth_time, birth_year
            )
            if not is_valid:
                import logging

                logging.getLogger("backend_ai.validation").warning(
                    f"[Validation] Invalid birth data: {validation_error}"
                )
                # Continue anyway with available data

        # Check Redis cache first
        cache = get_cache()
        cache_data = {
            "cache_version": _CACHE_VERSION,
            "theme": theme,
            "locale": locale,
            "prompt": user_prompt,
            "saju": facts.get("saju", {}),
            "astro": facts.get("astro", {}),
            "tarot": facts.get("tarot", {}),
            "render_mode": render_mode,
        }
        cached = cache.get("fusion", cache_data)
        if cached:
            cached["cached"] = True  # Mark as cache hit
            return cached

        # ====================================================================
        # TEMPLATE MODE - Fast path without RAG (prevents OOM)
        # ====================================================================
        if render_mode == "template":
            # DEBUG logging removed to avoid Windows encoding errors

            # Lightweight signal extraction (no RAG)
            signals = extract_signals(facts)
            cross_summary = summarize_cross_signals(signals)

            # Theme cross filter (if available, doesn't use SentenceTransformer)
            theme_cross_summary = {}
            if HAS_THEME_FILTER:
                try:
                    theme_filter = get_theme_filter()
                    theme_cross_summary = theme_filter.get_theme_summary(
                        theme,
                        facts.get("saju", {}),
                        facts.get("astro", {})
                    )
                except Exception as e:
                    print(f"[ThemeFilter] Error: {e}")

            # Pass locale to template renderer
            facts_with_locale = {**facts, "locale": locale}
            fusion_text = render_template_report(
                facts_with_locale, signals, cross_summary, theme_cross_summary
            )
            result = {
                "status": "success",
                "timestamp": datetime.utcnow().isoformat(),
                "theme": theme,
                "fusion_layer": fusion_text,
                "context": f"[Signals]\n{json.dumps(signals, ensure_ascii=False, indent=2)}",
                "cached": False,
                "matched_rule_ids": [],
                "user_prompt": user_prompt,
                "stats": {
                    "template_mode": True,
                    "rlhf_enabled": False,
                },
                "theme_cross": theme_cross_summary if theme_cross_summary else None,
                "cross_summary": cross_summary if cross_summary else None,
                "render_mode": "template",
            }
            cache.set("fusion", cache_data, result)
            return result

        # ====================================================================
        # GPT MODE - Full RAG processing (memory intensive)
        # ====================================================================
        rag = get_graph_rag()  # Use singleton instead of creating new instance

        # PARALLEL PREPROCESSING - Run independent tasks concurrently (optimized)
        parallel_results = {}

        with ThreadPoolExecutor(max_workers=_PARALLEL_MAX_WORKERS) as executor:
            futures = {
                executor.submit(_parallel_rag_query, rag, facts.get("saju", {}), "saju"): "rag_saju",
                executor.submit(_parallel_rag_query, rag, facts.get("astro", {}), "astro"): "rag_astro",
                executor.submit(_parallel_jung_quotes, theme, locale): "jung_quotes",
                executor.submit(_parallel_user_memory, birth_data, theme, locale): "user_memory",
                executor.submit(_parallel_rlhf_fewshot, theme, locale): "rlhf",
                executor.submit(_parallel_persona_semantic, user_prompt): "persona_semantic",
            }

            for future in as_completed(futures):
                key = futures[future]
                try:
                    parallel_results[key] = future.result(timeout=_PARALLEL_TASK_TIMEOUT)
                except Exception as e:
                    print(f"[Parallel] {key} failed: {e}")
                    parallel_results[key] = None

        # Unpack parallel results
        linked = {
            "saju": parallel_results.get("rag_saju") or {},
            "astro": parallel_results.get("rag_astro") or {},
        }
        jung_quotes_formatted = parallel_results.get("jung_quotes") or ""
        user_history_context, user_id = parallel_results.get("user_memory") or ("", None)
        rlhf_fewshot_context, rlhf_rule_weights = parallel_results.get("rlhf") or ("", {})
        persona_semantic_text = parallel_results.get("persona_semantic") or ""

        print(f"[Parallel] Completed 6 tasks concurrently")

        # rules under backend_ai/data/graph/rules/fusion
        rules_base = Path(__file__).parent.parent / "data" / "graph" / "rules"
        rule_engine = RuleEngine(str(rules_base / "fusion"))

        # Apply RLHF weights to RuleEngine before evaluation
        if HAS_RLHF:
            try:
                fl = get_feedback_learning()
                rlhf_weights = fl.get_rule_weights(theme)
                if rlhf_weights:
                    rule_engine.set_rlhf_weights(rlhf_weights)
            except Exception as e:
                print(f"[RLHF] Error setting rule weights: {e}")

        rule_eval = rule_engine.evaluate(facts)

        # Persona rules (Jung/Stoic V4) - separate for modularity
        persona_eval = {"matched_rules": [], "matched_count": 0}
        persona_rules_path = rules_base / "persona"
        if persona_rules_path.exists():
            try:
                persona_engine = RuleEngine(persona_rules_path)
                persona_eval = persona_engine.evaluate(facts, search_all=True)
                print(f"[Persona] Matched {persona_eval.get('matched_count', 0)} rules")
            except Exception as e:
                print(f"[Persona] Error loading persona rules: {e}")

        signals = extract_signals(facts)

        saju_text, astro_text, tarot_text = naturalize_facts(
            facts.get("saju", {}), facts.get("astro", {}), facts.get("tarot", {})
        )
        signal_summary = summarize_signals(signals)
        signal_highlights = (
            f"[Signal highlights]\n{signal_summary}\n\n" if signal_summary else ""
        )
        cross_summary = summarize_cross_signals(signals)
        cross_highlights = (
            f"[Saju-Astro cross]\n{cross_summary}\n\n" if cross_summary else ""
        )

        # User memory & Jung quotes - already fetched in parallel above
        jung_quotes_context = f"\n\n[Authentic Jung Quotes - Use these for interpretation]\n{jung_quotes_formatted}" if jung_quotes_formatted else ""

        # RLHF - already fetched in parallel above
        if rlhf_fewshot_context:
            rlhf_fewshot_context = f"\n\n{rlhf_fewshot_context}"

        # ===============================================================
        # AGENTIC RAG: Deep Graph Traversal & Entity Extraction
        # ===============================================================
        agentic_context = ""
        agentic_stats = {}
        if HAS_AGENTIC and user_prompt:
            try:
                # Run agentic query for enhanced context
                agentic_result = agentic_query(
                    query=user_prompt,
                    facts=facts,
                    locale=locale,
                    theme=theme,
                )

                if agentic_result.get("status") == "success":
                    # Add extracted entities
                    entities = agentic_result.get("entities", [])
                    if entities:
                        entity_str = ", ".join(
                            f"{e['normalized']}({e['type']})"
                            for e in entities[:10]
                        )
                        agentic_context += f"\n\n[Extracted Entities - NER]\n{entity_str}"

                    # Add deep traversal paths
                    paths = agentic_result.get("traversal_paths", [])
                    if paths:
                        path_strs = []
                        for p in paths[:3]:
                            if p.get("nodes"):
                                path_strs.append(" → ".join(p["nodes"][:6]))
                        if path_strs:
                            agentic_context += f"\n\n[Deep Graph Paths - Multi-hop]\n" + "\n".join(path_strs)

                    # Add graph search results context
                    graph_results = agentic_result.get("graph_results", [])
                    if graph_results:
                        graph_context_parts = []
                        for r in graph_results[:3]:
                            label = r.get("label", "")
                            desc = r.get("description", "")[:150]
                            if label and desc:
                                graph_context_parts.append(f"• {label}: {desc}")
                        if graph_context_parts:
                            agentic_context += f"\n\n[Enhanced Graph Context]\n" + "\n".join(graph_context_parts)

                    agentic_stats = agentic_result.get("stats", {})
                    print(f"[Agentic] Entities: {len(entities)}, Paths: {len(paths)}, Confidence: {agentic_result.get('confidence', 0):.2f}")

            except Exception as e:
                print(f"[Agentic] Error: {e}")

        # ===============================================================
        # THEME CROSS-REFERENCE FILTER: saju + astro cross intersections
        # ===============================================================
        theme_cross_context = ""
        theme_cross_summary = {}
        if HAS_THEME_FILTER:
            try:
                theme_filter = get_theme_filter()
                theme_cross_context = get_theme_prompt_context(
                    theme,
                    facts.get("saju", {}),
                    facts.get("astro", {})
                )
                theme_cross_summary = theme_filter.get_theme_summary(
                    theme,
                    facts.get("saju", {}),
                    facts.get("astro", {})
                )
                if theme_cross_context:
                    theme_cross_context = f"\n\n[Theme cross-reference - {theme.upper()}]\n{theme_cross_context}"
                    print(f"[ThemeFilter] Generated cross-reference for {theme}: score={theme_cross_summary.get('relevance_score', 0)}")
            except Exception as e:
                print(f"[ThemeFilter] Error: {e}")

        # Format persona insights (Jung/Stoic)
        persona_context = ""

        # Method 1: Rule-based matching (from RuleEngine)
        if persona_eval.get("matched_rules"):
            persona_texts = persona_eval["matched_rules"][:3]
            persona_context = f"\n\n[Persona Insights - Rule Based]\n" + "\n---\n".join(persona_texts)

        # Method 2: Semantic search - already fetched in parallel above
        if persona_semantic_text:
            persona_context += f"\n\n[Persona Insights - Semantic Match]\n{persona_semantic_text}"

        base_context = (
            f"[Graph/Rule matches]\n"
            f"{json.dumps(linked, ensure_ascii=False, indent=2)}\n\n"
            f"[Rule evaluation]\n"
            f"{json.dumps(rule_eval, ensure_ascii=False, indent=2)}\n\n"
            f"[Signals]\n"
            f"{json.dumps(signals, ensure_ascii=False, indent=2)}\n"
            f"{signal_highlights}"
            f"{cross_highlights}"
            f"[Fusion inputs]\n"
            f"[SAJU] {saju_text}\n[ASTRO] {astro_text}\n[TAROT] {tarot_text}"
            f"{theme_cross_context}"  # Theme cross-reference context (v5.1)
            f"{jung_quotes_context}"
            f"{persona_context}"
            f"{user_history_context}"
            f"{rlhf_fewshot_context}"  # RLHF Few-shot examples
            f"{agentic_context}"  # Agentic RAG: NER + Deep Graph Traversal
        )
        theme = facts.get("theme", "life_path")

        # Note: Template mode is handled above (early return before RAG loading)
        # This section is only reached in GPT mode

        model = get_llm()
        meta = report_memory.get(theme, {"avg_len": _DEFAULT_AVG_LEN, "calls": 0})
        prev_avg = meta["avg_len"]

        out = generate_fusion_report(
            model,
            saju_text,
            astro_text,
            theme,
            locale=locale,
            user_prompt=user_prompt,
            tarot_text=tarot_text,
            dataset_text=base_context,
        )
        fusion_text = out["fusion_layer"]
        graph_context = out["graph_context"]
        current_len = len(fusion_text)

        meta["avg_len"] = (meta["avg_len"] * meta["calls"] + current_len) / (
            meta["calls"] + 1
        )
        meta["calls"] += 1
        report_memory[theme] = meta

        adjust = (
            0.1
            if current_len < prev_avg * 0.8
            else (-0.05 if current_len > prev_avg * 1.2 else 0)
        )
        out["sample_adjust"] = adjust

        context_text = f"{base_context}\n\n[Graph context used]\n{graph_context}"

        # Extract matched rule IDs for RLHF feedback tracking
        matched_rule_ids = rule_eval.get("matched_rule_ids", [])

        result = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": fusion_text,
            "context": context_text,
            "cached": False,  # Fresh generation
            "matched_rule_ids": matched_rule_ids,  # For RLHF feedback
            "user_prompt": user_prompt,  # Original question for RLHF learning
            "stats": {
                "current_len": current_len,
                "avg_len": round(meta["avg_len"]),
                "adjust": adjust,
                "persona_rule_matched": persona_eval.get("matched_count", 0),
                "persona_semantic_enabled": HAS_PERSONA_EMBED,
                "user_history_enabled": HAS_USER_MEMORY and bool(user_history_context),
                "rlhf_enabled": HAS_RLHF,
                "rlhf_fewshot_injected": bool(rlhf_fewshot_context),
                "rlhf_rule_weights_count": len(rlhf_rule_weights) if rlhf_rule_weights else 0,
                "rlhf_weights_applied": rule_eval.get("rlhf_weights_applied", False),
                # Agentic RAG stats
                "agentic_enabled": HAS_AGENTIC,
                "agentic_entities_count": agentic_stats.get("entities_count", 0),
                "agentic_paths_count": agentic_stats.get("paths_count", 0),
                "agentic_context_injected": bool(agentic_context),
                # Theme Cross-Reference Filter stats (v5.1)
                "theme_filter_enabled": HAS_THEME_FILTER,
                "theme_cross_context_injected": bool(theme_cross_context),
                "theme_relevance_score": theme_cross_summary.get("relevance_score", 0),
                "theme_intersections_count": theme_cross_summary.get("summary", {}).get("cross_count", 0),
                "theme_important_dates_count": theme_cross_summary.get("summary", {}).get("dates_count", 0),
            },
            # Theme cross-reference summary for frontend
            "theme_cross": theme_cross_summary if theme_cross_summary else None,
            "cross_summary": cross_summary if cross_summary else None,
        }

        # Auto-save to user memory (MOAT - builds personalization data + RLHF learning)
        if HAS_USER_MEMORY and user_id and birth_data:
            try:
                memory = get_user_memory(user_id)
                record_id = memory.save_consultation(
                    theme=theme,
                    locale=locale,
                    birth_data=birth_data,
                    fusion_result=fusion_text,
                    service_type="fusion",
                    # RLHF Learning Fields - enables Few-shot selection & rule weight adjustment
                    user_prompt=user_prompt,
                    context_used=context_text[:_MAX_CONTEXT_STORAGE],  # Truncate for storage
                    matched_rule_ids=matched_rule_ids,
                )
                result["user_id"] = user_id
                result["record_id"] = record_id
                print(f"[UserMemory] Saved consultation {record_id} for user {user_id[:8]}... (RLHF context included)")
            except Exception as e:
                print(f"[UserMemory] Error saving consultation: {e}")

        # Store in Redis cache
        cache.set("fusion", cache_data, result)
        return result

    except Exception as e:
        print(f"[interpret_with_ai] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
            "fusion_layer": "",
            "context": "",
        }
