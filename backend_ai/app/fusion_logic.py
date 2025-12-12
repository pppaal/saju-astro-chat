# backend_ai/app/fusion_logic.py

import os
import sys
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))

from saju_astro_rag import GraphRAG
from rule_engine import RuleEngine
from signal_extractor import extract_signals
from signal_summary import summarize_signals
from corpus_rag import get_corpus_rag
from backend_ai.model.fusion_generate import get_llm, generate_fusion_report
from redis_cache import get_cache
from performance_optimizer import track_performance

# Persona semantic search (Jung/Stoic V4)
try:
    from persona_embeddings import get_persona_embed_rag
    HAS_PERSONA_EMBED = True
except ImportError:
    HAS_PERSONA_EMBED = False
    print("[fusion_logic] PersonaEmbedRAG not available")

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

# Agentic RAG System (Next Level Features)
try:
    from agentic_rag import agentic_query, get_entity_extractor
    HAS_AGENTIC = True
except ImportError:
    HAS_AGENTIC = False
    print("[fusion_logic] Agentic RAG not available")

# Simple in-memory stats for average length per theme
report_memory: dict[str, dict] = {}


# ===============================================================
# ELEMENT & INTERPRETATION HELPERS
# ===============================================================
ELEMENT_TRAITS = {
    "木": {"name": "Wood/목", "traits": "growth, creativity, flexibility, ambition", "organ": "liver/gallbladder"},
    "火": {"name": "Fire/화", "traits": "passion, charisma, intuition, energy", "organ": "heart/small intestine"},
    "土": {"name": "Earth/토", "traits": "stability, nurturing, practicality, trust", "organ": "spleen/stomach"},
    "金": {"name": "Metal/금", "traits": "discipline, precision, justice, focus", "organ": "lungs/large intestine"},
    "水": {"name": "Water/수", "traits": "wisdom, adaptability, depth, intuition", "organ": "kidneys/bladder"},
    "wood": {"name": "Wood/목", "traits": "growth, creativity, flexibility, ambition", "organ": "liver/gallbladder"},
    "fire": {"name": "Fire/화", "traits": "passion, charisma, intuition, energy", "organ": "heart/small intestine"},
    "earth": {"name": "Earth/토", "traits": "stability, nurturing, practicality, trust", "organ": "spleen/stomach"},
    "metal": {"name": "Metal/금", "traits": "discipline, precision, justice, focus", "organ": "lungs/large intestine"},
    "water": {"name": "Water/수", "traits": "wisdom, adaptability, depth, intuition", "organ": "kidneys/bladder"},
}

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
    "conjunction": "融合 - powerful blend, intensification of energies",
    "opposition": "對沖 - tension, awareness, potential for integration",
    "trine": "三合 - harmony, natural flow, gifts",
    "square": "刑 - friction, challenge, growth through effort",
    "sextile": "六合 - opportunity, cooperation, gentle support",
    "quincunx": "不調 - adjustment needed, blind spots",
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
        s_parts.append("【사주팔자 四柱八字】")
        s_parts.append(
            f"  • 년주(Year Pillar): {pillars.get('year')} — ancestral energy, social persona, outer world"
        )
        s_parts.append(
            f"  • 월주(Month Pillar): {pillars.get('month')} — parents, career path, life structure"
        )
        s_parts.append(
            f"  • 일주(Day Pillar): {pillars.get('day')} — core self, spouse relationship, inner nature"
        )
        s_parts.append(
            f"  • 시주(Hour Pillar): {pillars.get('time')} — children, later years, creative output"
        )

    # Day Master with interpretive context
    if day_master:
        if isinstance(day_master, dict):
            dm_name = day_master.get('name', '')
            dm_element = day_master.get('element', '')
            dm_strength = day_master.get('strength', 'moderate')
            element_info = ELEMENT_TRAITS.get(dm_element, {})

            s_parts.append(f"\n【일간 日干 (Day Master)】")
            s_parts.append(f"  • Core Identity: {dm_name} ({element_info.get('name', dm_element)})")
            s_parts.append(f"  • Natural Traits: {element_info.get('traits', 'unique characteristics')}")
            s_parts.append(f"  • Strength: {dm_strength} — {'strong self-reliance' if dm_strength == 'strong' else 'benefits from support' if dm_strength == 'weak' else 'balanced energy'}")
            if element_info.get('organ'):
                s_parts.append(f"  • Body Association: {element_info.get('organ')} (wellness focus area)")
        else:
            s_parts.append(f"\n【일간 日干】Day master: {day_master}")

    # Five Elements Balance with interpretation
    if isinstance(facts.get("fiveElements"), dict):
        fe = facts["fiveElements"]
        s_parts.append(f"\n【오행 균형 Five Elements Balance】")

        # Find dominant and weak elements
        sorted_elements = sorted(fe.items(), key=lambda x: x[1], reverse=True)
        dominant = sorted_elements[0] if sorted_elements else None
        weakest = sorted_elements[-1] if sorted_elements else None

        for elem, count in fe.items():
            elem_info = ELEMENT_TRAITS.get(elem, {})
            status = "dominant ★" if dominant and elem == dominant[0] and count > 2 else ""
            status = "deficient ○" if weakest and elem == weakest[0] and count == 0 else status
            s_parts.append(f"  • {elem_info.get('name', elem)}: {count} {status}")

        if dominant and dominant[1] > 3:
            s_parts.append(f"  → Dominant {ELEMENT_TRAITS.get(dominant[0], {}).get('name', dominant[0])}: amplified {ELEMENT_TRAITS.get(dominant[0], {}).get('traits', 'energy')}")
        if weakest and weakest[1] == 0:
            s_parts.append(f"  → Missing {ELEMENT_TRAITS.get(weakest[0], {}).get('name', weakest[0])}: area for conscious development")

    # Ten Gods with meanings
    if "tenGods" in facts:
        ten_gods = facts['tenGods']
        s_parts.append(f"\n【십성 十神 (Ten Gods)】")
        if isinstance(ten_gods, dict):
            for god, info in ten_gods.items():
                meaning = TEN_GODS_MEANING.get(god, "special influence")
                s_parts.append(f"  • {god}: {meaning}")
        else:
            s_parts.append(f"  {ten_gods}")

    # Power Balance
    if "powerBalance" in facts:
        pb = facts['powerBalance']
        s_parts.append(f"\n【신강신약 Power Balance】")
        if isinstance(pb, dict):
            balance_type = pb.get('type', 'balanced')
            s_parts.append(f"  • Type: {balance_type}")
            if balance_type in ['신강', 'strong']:
                s_parts.append("  → Self-sufficient, leadership potential, may need to consider others")
            elif balance_type in ['신약', 'weak']:
                s_parts.append("  → Collaborative nature, benefits from support, adaptable")
        else:
            s_parts.append(f"  {pb}")

    # Luck Cycles with context
    cycle_labels = {
        "daeun": ("대운 大運 (Great Luck)", "10-year cycle, major life phases"),
        "annual": ("세운 歲運 (Annual Luck)", "yearly energy, current year themes"),
        "monthly": ("월운 月運 (Monthly)", "monthly focus, timing for actions"),
        "iljin": ("일진 日辰 (Daily)", "daily energy, immediate timing"),
    }
    for key, (label, desc) in cycle_labels.items():
        cycles = unse.get(key, [])
        if cycles:
            names = [c.get("name") or str(c) for c in cycles[:6]]
            s_parts.append(f"\n【{label}】({desc})")
            s_parts.append(f"  Current/Upcoming: {', '.join(names)}")

    # Sinsal (Special Stars) with interpretation
    if sinsal and sinsal.get("hits"):
        s_parts.append(f"\n【신살 神煞 (Special Stars)】")
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
        a_parts.append("【주요 앵글 Key Angles】")
        if asc:
            asc_sign = asc.get('sign') if isinstance(asc, dict) else asc
            a_parts.append(f"  • Ascendant (ASC): {asc_sign} — first impression, physical presence, life approach")
        if mc:
            mc_sign = mc.get('sign') if isinstance(mc, dict) else mc
            a_parts.append(f"  • Midheaven (MC): {mc_sign} — career path, public image, life direction")

    # Planets with interpretive context
    if planets:
        a_parts.append(f"\n【행성 배치 Planetary Positions】")
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
                degree_str = f" at {degree}°" if degree else ""
                a_parts.append(f"  • {name} in {sign}{degree_str} (House {house}): {meaning}")

    # Aspects with meanings
    if aspects:
        a_parts.append(f"\n【행성 상호작용 Major Aspects】")
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
        a_parts.append(f"\n【원소 분포 Element Distribution】")
        sorted_er = sorted(er.items(), key=lambda x: x[1], reverse=True)
        for elem, ratio in sorted_er:
            pct = round(ratio * 100) if ratio <= 1 else round(ratio)
            status = "★ dominant" if pct > 35 else "○ low" if pct < 10 else ""
            a_parts.append(f"  • {elem}: {pct}% {status}")

    astro_text = "\n".join(a_parts) or "No astrology facts."

    # -------------------- TAROT (Enhanced) --------------------
    t_parts = []
    spread = tarot.get("spread") or {}
    drawn_cards = tarot.get("drawnCards") or tarot.get("cards") or []
    category = tarot.get("category") or tarot.get("theme")

    if category or spread:
        t_parts.append("【타로 리딩 Tarot Reading】")
        if category:
            t_parts.append(f"  Theme: {category}")
        if spread:
            t_parts.append(f"  Spread: {spread.get('title') or spread.get('id')} ({spread.get('cardCount', len(drawn_cards))} cards)")

    if isinstance(drawn_cards, list) and drawn_cards:
        t_parts.append(f"\n【카드 해석 Card Interpretations】")
        for idx, dc in enumerate(drawn_cards[:8]):
            card = dc.get("card") if isinstance(dc, dict) else None
            name = card.get("name") if isinstance(card, dict) else dc.get("name")
            is_reversed = dc.get("isReversed", False) if isinstance(dc, dict) else False
            orientation = "역방향 Reversed" if is_reversed else "정방향 Upright"

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
#  MAIN INTERPRETER (Fusion Controller)
# ===============================================================
@track_performance
def interpret_with_ai(facts: dict):
    """
    saju + astro + graph + rules + LLM
    """
    load_dotenv()
    try:
        api_key = os.getenv("TOGETHER_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("LLM API key is missing.")

        locale = facts.get("locale", "en")
        user_prompt = facts.get("prompt") or ""
        theme = facts.get("theme", "life_path")

        # 🚀 Check Redis cache first
        cache = get_cache()
        cache_data = {
            "theme": theme,
            "locale": locale,
            "prompt": user_prompt,
            "saju": facts.get("saju", {}),
            "astro": facts.get("astro", {}),
            "tarot": facts.get("tarot", {}),
        }
        cached = cache.get("fusion", cache_data)
        if cached:
            cached["cached"] = True  # Mark as cache hit
            return cached

        base_dir = os.path.dirname(os.path.dirname(__file__))  # .../backend_ai
        data_base = os.path.join(base_dir, "data")
        rag = GraphRAG(data_base)
        linked = {
            "saju": rag.query(facts.get("saju", {}), domain_priority="saju"),
            "astro": rag.query(facts.get("astro", {}), domain_priority="astro"),
        }

        # rules under backend_ai/data/graph/rules/fusion
        rules_base = os.path.join(base_dir, "data", "graph", "rules")
        rule_engine = RuleEngine(os.path.join(rules_base, "fusion"))

        # 🧠 Apply RLHF weights to RuleEngine before evaluation
        if HAS_RLHF:
            try:
                fl = get_feedback_learning()
                rlhf_weights = fl.get_rule_weights(theme)
                if rlhf_weights:
                    rule_engine.set_rlhf_weights(rlhf_weights)
            except Exception as e:
                print(f"[RLHF] Error setting rule weights: {e}")

        rule_eval = rule_engine.evaluate(facts)

        # 🎭 Persona rules (Jung/Stoic V4) - separate for modularity
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

        # 📚 Get user consultation history for personalization (MOAT)
        user_history_context = ""
        user_id = None
        birth_data = facts.get("saju", {}).get("facts", {})
        if HAS_USER_MEMORY and birth_data:
            try:
                user_id = generate_user_id(birth_data)
                memory = get_user_memory(user_id)
                user_history_context = memory.build_context_for_llm(theme, locale, service_type="fusion")
                if user_history_context:
                    print(f"[UserMemory] Loaded history for user {user_id[:8]}...")
            except Exception as e:
                print(f"[UserMemory] Error loading history: {e}")

        # 🧠 Get authentic Jung quotes based on theme and signals
        jung_quotes_context = ""
        try:
            corpus_rag = get_corpus_rag()

            # Build search query from theme and key signals
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

            # Search for relevant Jung quotes
            jung_quotes, formatted_quotes = corpus_rag.get_quotes_for_interpretation(
                query=search_query,
                locale=locale,
                top_k=2
            )

            if formatted_quotes:
                jung_quotes_context = f"\n\n[Authentic Jung Quotes - Use these for interpretation]\n{formatted_quotes}"
        except Exception as e:
            print(f"[interpret_with_ai] Jung quotes retrieval error: {e}")

        # ===============================================================
        # 🧠 RLHF: Dynamic Few-shot Examples from High-Rated Consultations
        # ===============================================================
        rlhf_fewshot_context = ""
        rlhf_rule_weights = {}
        if HAS_RLHF:
            try:
                fl = get_feedback_learning()

                # Get high-rated examples for this theme
                fewshot_prompt = fl.format_fewshot_prompt(theme, locale, top_k=2)
                if fewshot_prompt:
                    rlhf_fewshot_context = f"\n\n{fewshot_prompt}"
                    print(f"[RLHF] Injected Few-shot examples for {theme}/{locale}")

                # Get adjusted rule weights
                rlhf_rule_weights = fl.get_rule_weights(theme)
                if rlhf_rule_weights and len(rlhf_rule_weights) > 1:
                    print(f"[RLHF] Using {len(rlhf_rule_weights)} adjusted rule weights")

            except Exception as e:
                print(f"[RLHF] Error getting Few-shot/weights: {e}")

        # ===============================================================
        # 🚀 AGENTIC RAG: Deep Graph Traversal & Entity Extraction
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

        # 🎭 Format persona insights (Jung/Stoic)
        persona_context = ""

        # Method 1: Rule-based matching (from RuleEngine)
        if persona_eval.get("matched_rules"):
            persona_texts = persona_eval["matched_rules"][:3]
            persona_context = f"\n\n[Persona Insights - Rule Based]\n" + "\n---\n".join(persona_texts)

        # Method 2: Semantic search (from PersonaEmbedRAG) - when user asks a question
        if HAS_PERSONA_EMBED and user_prompt:
            try:
                persona_rag = get_persona_embed_rag()
                semantic_context = persona_rag.get_persona_context(user_prompt, top_k=2)

                semantic_parts = []
                if semantic_context.get("jung_insights"):
                    semantic_parts.append("[Jung 분석가]\n" + "\n".join(semantic_context["jung_insights"][:2]))
                if semantic_context.get("stoic_insights"):
                    semantic_parts.append("[Stoic 전략가]\n" + "\n".join(semantic_context["stoic_insights"][:2]))

                if semantic_parts:
                    persona_context += f"\n\n[Persona Insights - Semantic Match]\n" + "\n\n".join(semantic_parts)
                    print(f"[Persona Semantic] Found {semantic_context.get('total_matched', 0)} insights")
            except Exception as e:
                print(f"[Persona Semantic] Error: {e}")

        base_context = (
            f"[Graph/Rule matches]\n"
            f"{json.dumps(linked, ensure_ascii=False, indent=2)}\n\n"
            f"[Rule evaluation]\n"
            f"{json.dumps(rule_eval, ensure_ascii=False, indent=2)}\n\n"
            f"[Signals]\n"
            f"{json.dumps(signals, ensure_ascii=False, indent=2)}\n"
            f"{signal_highlights}"
            f"[Fusion inputs]\n"
            f"[SAJU] {saju_text}\n[ASTRO] {astro_text}\n[TAROT] {tarot_text}"
            f"{jung_quotes_context}"
            f"{persona_context}"
            f"{user_history_context}"
            f"{rlhf_fewshot_context}"  # RLHF Few-shot examples
            f"{agentic_context}"  # Agentic RAG: NER + Deep Graph Traversal
        )
        theme = facts.get("theme", "life_path")

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
            },
        }

        # 💾 Auto-save to user memory (MOAT - builds personalization data + RLHF learning)
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

        # 🚀 Store in Redis cache
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
