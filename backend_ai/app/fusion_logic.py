# backend_ai/app/fusion_logic.py

import os
import sys
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.append(os.path.dirname(__file__))

from rule_engine import RuleEngine
from signal_extractor import extract_signals
from signal_summary import summarize_signals, summarize_cross_signals
from redis_cache import get_cache
from performance_optimizer import track_performance
from sanitizer import sanitize_user_input, sanitize_name, is_suspicious_input, validate_birth_data
from template_renderer import render_template_report

# Lazy imports for memory-heavy modules (avoid OOM on Railway free tier)
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
report_memory: dict[str, dict] = {}


# ===============================================================
# ELEMENT & INTERPRETATION HELPERS
# ===============================================================
ELEMENT_TRAITS = {
    "µ£¿": {"name": "Wood/δ¬⌐", "traits": "growth, creativity, flexibility, ambition", "organ": "liver/gallbladder"},
    "τü½": {"name": "Fire/φÖö", "traits": "passion, charisma, intuition, energy", "organ": "heart/small intestine"},
    "σ£ƒ": {"name": "Earth/φåá", "traits": "stability, nurturing, practicality, trust", "organ": "spleen/stomach"},
    "Θçæ": {"name": "Metal/Ω╕ê", "traits": "discipline, precision, justice, focus", "organ": "lungs/large intestine"},
    "µ░┤": {"name": "Water/∞êÿ", "traits": "wisdom, adaptability, depth, intuition", "organ": "kidneys/bladder"},
    "wood": {"name": "Wood/δ¬⌐", "traits": "growth, creativity, flexibility, ambition", "organ": "liver/gallbladder"},
    "fire": {"name": "Fire/φÖö", "traits": "passion, charisma, intuition, energy", "organ": "heart/small intestine"},
    "earth": {"name": "Earth/φåá", "traits": "stability, nurturing, practicality, trust", "organ": "spleen/stomach"},
    "metal": {"name": "Metal/Ω╕ê", "traits": "discipline, precision, justice, focus", "organ": "lungs/large intestine"},
    "water": {"name": "Water/∞êÿ", "traits": "wisdom, adaptability, depth, intuition", "organ": "kidneys/bladder"},
}

TEN_GODS_MEANING = {
    "δ╣äΩ▓¼": "Peer/Competitor - independence, rivalry, partnership",
    "Ω▓ü∞₧¼": "Rob Wealth - boldness, risk-taking, competition",
    "∞ï¥∞ïá": "Eating God - creativity, expression, enjoyment",
    "∞âüΩ┤Ç": "Hurting Officer - rebellion, innovation, critique",
    "φÄ╕∞₧¼": "Indirect Wealth - speculation, windfall, entrepreneurship",
    "∞áò∞₧¼": "Direct Wealth - stable income, savings, reliability",
    "φÄ╕Ω┤Ç": "Indirect Authority - pressure, challenge, discipline",
    "∞áòΩ┤Ç": "Direct Authority - status, law, organization",
    "φÄ╕∞¥╕": "Indirect Resource - unconventional learning, intuition",
    "∞áò∞¥╕": "Direct Resource - knowledge, nurturing, tradition",
}

ASPECT_MEANINGS = {
    "conjunction": "Φ₧ìσÉê - powerful blend, intensification of energies",
    "opposition": "σ░ìµ▓û - tension, awareness, potential for integration",
    "trine": "Σ╕ëσÉê - harmony, natural flow, gifts",
    "square": "σêæ - friction, challenge, growth through effort",
    "sextile": "σà¡σÉê - opportunity, cooperation, gentle support",
    "quincunx": "Σ╕ìΦ¬┐ - adjustment needed, blind spots",
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
        s_parts.append("πÇÉ∞é¼∞ú╝φîö∞₧É σ¢¢µƒ▒σà½σ¡ùπÇæ")
        s_parts.append(
            f"  ΓÇó δàä∞ú╝(Year Pillar): {pillars.get('year')} ΓÇö ancestral energy, social persona, outer world"
        )
        s_parts.append(
            f"  ΓÇó ∞¢ö∞ú╝(Month Pillar): {pillars.get('month')} ΓÇö parents, career path, life structure"
        )
        s_parts.append(
            f"  ΓÇó ∞¥╝∞ú╝(Day Pillar): {pillars.get('day')} ΓÇö core self, spouse relationship, inner nature"
        )
        s_parts.append(
            f"  ΓÇó ∞ï£∞ú╝(Hour Pillar): {pillars.get('time')} ΓÇö children, later years, creative output"
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
        s_parts.append(f"\nπÇÉ∞ÿñφûë Ω╖áφÿò Five Elements BalanceπÇæ")

        # Find dominant and weak elements
        sorted_elements = sorted(fe.items(), key=lambda x: x[1], reverse=True)
        dominant = sorted_elements[0] if sorted_elements else None
        weakest = sorted_elements[-1] if sorted_elements else None

        for elem, count in fe.items():
            elem_info = ELEMENT_TRAITS.get(elem, {})
            status = "dominant Γÿà" if dominant and elem == dominant[0] and count > 2 else ""
            status = "deficient Γùï" if weakest and elem == weakest[0] and count == 0 else status
            s_parts.append(f"  ΓÇó {elem_info.get('name', elem)}: {count} {status}")

        if dominant and dominant[1] > 3:
            s_parts.append(f"  ΓåÆ Dominant {ELEMENT_TRAITS.get(dominant[0], {}).get('name', dominant[0])}: amplified {ELEMENT_TRAITS.get(dominant[0], {}).get('traits', 'energy')}")
        if weakest and weakest[1] == 0:
            s_parts.append(f"  ΓåÆ Missing {ELEMENT_TRAITS.get(weakest[0], {}).get('name', weakest[0])}: area for conscious development")

    # Ten Gods with meanings
    if "tenGods" in facts:
        ten_gods = facts['tenGods']
        s_parts.append(f"\nπÇÉ∞ï¡∞ä▒ σìüτÑ₧ (Ten Gods)πÇæ")
        if isinstance(ten_gods, dict):
            for god, info in ten_gods.items():
                meaning = TEN_GODS_MEANING.get(god, "special influence")
                s_parts.append(f"  ΓÇó {god}: {meaning}")
        else:
            s_parts.append(f"  {ten_gods}")

    # Power Balance
    if "powerBalance" in facts:
        pb = facts['powerBalance']
        s_parts.append(f"\nπÇÉ∞ïáΩ░ò∞ïá∞ò╜ Power BalanceπÇæ")
        if isinstance(pb, dict):
            balance_type = pb.get('type', 'balanced')
            s_parts.append(f"  ΓÇó Type: {balance_type}")
            if balance_type in ['∞ïáΩ░ò', 'strong']:
                s_parts.append("  ΓåÆ Self-sufficient, leadership potential, may need to consider others")
            elif balance_type in ['∞ïá∞ò╜', 'weak']:
                s_parts.append("  ΓåÆ Collaborative nature, benefits from support, adaptable")
        else:
            s_parts.append(f"  {pb}")

    # Luck Cycles with context
    cycle_labels = {
        "daeun": ("δîÇ∞Ü┤ σñºΘüï (Great Luck)", "10-year cycle, major life phases"),
        "annual": ("∞ä╕∞Ü┤ µ¡▓Θüï (Annual Luck)", "yearly energy, current year themes"),
        "monthly": ("∞¢ö∞Ü┤ µ£êΘüï (Monthly)", "monthly focus, timing for actions"),
        "iljin": ("∞¥╝∞ºä µùÑΦ╛░ (Daily)", "daily energy, immediate timing"),
    }
    for key, (label, desc) in cycle_labels.items():
        cycles = unse.get(key, [])
        if cycles:
            names = [c.get("name") or str(c) for c in cycles[:6]]
            s_parts.append(f"\nπÇÉ{label}πÇæ({desc})")
            s_parts.append(f"  Current/Upcoming: {', '.join(names)}")

    # Sinsal (Special Stars) with interpretation
    if sinsal and sinsal.get("hits"):
        s_parts.append(f"\nπÇÉ∞ïá∞é┤ τÑ₧τà₧ (Special Stars)πÇæ")
        for h in sinsal["hits"][:10]:
            name = h.get("name", "")
            desc = h.get("description", h.get("meaning", "unique influence"))
            if name:
                s_parts.append(f"  ΓÇó {name}: {desc[:80]}")

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
        a_parts.append("πÇÉ∞ú╝∞Üö ∞ò╡Ω╕Ç Key AnglesπÇæ")
        if asc:
            asc_sign = asc.get('sign') if isinstance(asc, dict) else asc
            a_parts.append(f"  ΓÇó Ascendant (ASC): {asc_sign} ΓÇö first impression, physical presence, life approach")
        if mc:
            mc_sign = mc.get('sign') if isinstance(mc, dict) else mc
            a_parts.append(f"  ΓÇó Midheaven (MC): {mc_sign} ΓÇö career path, public image, life direction")

    # Planets with interpretive context
    if planets:
        a_parts.append(f"\nπÇÉφûë∞ä▒ δ░░∞╣ÿ Planetary PositionsπÇæ")
        planet_meanings = {
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
        for p in planets[:10]:
            if isinstance(p, dict):
                name = p.get('name', '')
                sign = p.get('sign', '')
                house = p.get('house', '')
                degree = p.get('degree', '')
                meaning = planet_meanings.get(name, 'influence')
                degree_str = f" at {degree}┬░" if degree else ""
                a_parts.append(f"  ΓÇó {name} in {sign}{degree_str} (House {house}): {meaning}")

    # Aspects with meanings
    if aspects:
        a_parts.append(f"\nπÇÉφûë∞ä▒ ∞âüφÿ╕∞₧æ∞Ü⌐ Major AspectsπÇæ")
        for a in aspects[:12]:
            asp_type = a.get('aspect', '')
            p1 = a.get('planet1', '')
            p2 = a.get('planet2', '')
            orb = a.get('orb', '')
            meaning = ASPECT_MEANINGS.get(asp_type.lower(), 'connection')
            orb_str = f" (orb: {orb}┬░)" if orb else ""
            a_parts.append(f"  ΓÇó {p1} {asp_type} {p2}{orb_str}: {meaning}")

    # Element Ratios with interpretation
    if facts.get("elementRatios"):
        er = facts["elementRatios"]
        a_parts.append(f"\nπÇÉ∞¢É∞åî δ╢äφÅ¼ Element DistributionπÇæ")
        sorted_er = sorted(er.items(), key=lambda x: x[1], reverse=True)
        for elem, ratio in sorted_er:
            pct = round(ratio * 100) if ratio <= 1 else round(ratio)
            status = "Γÿà dominant" if pct > 35 else "Γùï low" if pct < 10 else ""
            a_parts.append(f"  ΓÇó {elem}: {pct}% {status}")

    astro_text = "\n".join(a_parts) or "No astrology facts."

    # -------------------- TAROT (Enhanced) --------------------
    t_parts = []
    spread = tarot.get("spread") or {}
    drawn_cards = tarot.get("drawnCards") or tarot.get("cards") or []
    category = tarot.get("category") or tarot.get("theme")

    if category or spread:
        t_parts.append("πÇÉφâÇδí£ δª¼δö⌐ Tarot ReadingπÇæ")
        if category:
            t_parts.append(f"  Theme: {category}")
        if spread:
            t_parts.append(f"  Spread: {spread.get('title') or spread.get('id')} ({spread.get('cardCount', len(drawn_cards))} cards)")

    if isinstance(drawn_cards, list) and drawn_cards:
        t_parts.append(f"\nπÇÉ∞╣┤δô£ φò┤∞ä¥ Card InterpretationsπÇæ")
        for idx, dc in enumerate(drawn_cards[:8]):
            card = dc.get("card") if isinstance(dc, dict) else None
            name = card.get("name") if isinstance(card, dict) else dc.get("name")
            is_reversed = dc.get("isReversed", False) if isinstance(dc, dict) else False
            orientation = "∞ù¡δ░⌐φûÑ Reversed" if is_reversed else "∞áòδ░⌐φûÑ Upright"

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

def _parallel_jung_quotes(theme, locale):
    """Thread-safe Jung quotes retrieval."""
    try:
        corpus_rag = get_corpus_rag()
        theme_queries = {
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
        search_query = theme_queries.get(theme, "individuation self shadow integration")
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
            parts.append("[Jung δ╢ä∞ä¥Ω░Ç]\n" + "\n".join(semantic_context["jung_insights"][:2]))
        if semantic_context.get("stoic_insights"):
            parts.append("[Stoic ∞áäδ₧╡Ω░Ç]\n" + "\n".join(semantic_context["stoic_insights"][:2]))
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

        if is_structured_prompt:
            # For structured prompts from frontend, allow full length (no truncation)
            user_prompt = sanitize_user_input(raw_prompt, max_length=50000, allow_newlines=True)
            print(f"[FusionLogic] Structured JSON prompt detected (len={len(raw_prompt)})")
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
            "cache_version": "v6",  # 🔥 v6: Personalized daeun meanings, remove keywords, filter 4-5 stars
            "theme": theme,
            "locale": locale,
            "prompt": user_prompt,
            "saju": facts.get("saju", {}),
            "astro": facts.get("astro", {}),
            "tarot": facts.get("tarot", {}),
            "render_mode": render_mode,  # 🔥 템플릿/GPT 모드 구분 캐시
        }
        cached = cache.get("fusion", cache_data)
        if cached:
            cached["cached"] = True  # Mark as cache hit
            return cached

        # ====================================================================
        # TEMPLATE MODE - Fast path without RAG (prevents OOM on Railway)
        # ====================================================================
        if render_mode == "template":
            # DEBUG: Log saju.unse data before template rendering
            saju_for_debug = facts.get("saju", {})
            unse_for_debug = saju_for_debug.get("unse", {})
            print(f"[FusionLogic DEBUG] Template mode - saju keys: {list(saju_for_debug.keys())}")
            print(f"[FusionLogic DEBUG] unse keys: {list(unse_for_debug.keys()) if unse_for_debug else 'EMPTY'}")
            print(f"[FusionLogic DEBUG] daeun count: {len(unse_for_debug.get('daeun', []))}")
            print(f"[FusionLogic DEBUG] annual count: {len(unse_for_debug.get('annual', []))}")
            if unse_for_debug.get('daeun'):
                print(f"[FusionLogic DEBUG] daeun[0]: {unse_for_debug['daeun'][0]}")

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

            fusion_text = render_template_report(
                facts, signals, cross_summary, theme_cross_summary
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
        base_dir = os.path.dirname(os.path.dirname(__file__))  # .../backend_ai
        rag = get_graph_rag()  # Use singleton instead of creating new instance

        # PARALLEL PREPROCESSING - Run independent tasks concurrently
        parallel_results = {}

        with ThreadPoolExecutor(max_workers=6) as executor:
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
                    parallel_results[key] = future.result()
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
        rules_base = os.path.join(base_dir, "data", "graph", "rules")
        rule_engine = RuleEngine(os.path.join(rules_base, "fusion"))

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
        persona_rules_path = os.path.join(rules_base, "persona")
        if os.path.exists(persona_rules_path):
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
                                path_strs.append(" ΓåÆ ".join(p["nodes"][:6]))
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
                                graph_context_parts.append(f"ΓÇó {label}: {desc}")
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
        meta = report_memory.get(theme, {"avg_len": 4800, "calls": 0})
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
                    context_used=context_text[:2000],  # Truncate for storage
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
