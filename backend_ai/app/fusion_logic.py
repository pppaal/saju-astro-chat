# backend_ai/app/fusion_logic.py

import os
import sys
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))

from graph_rag import GraphRAG
from rule_engine import RuleEngine
from signal_extractor import extract_signals
from backend_ai.model.fusion_generate import get_llm, generate_fusion_report
from redis_cache import get_cache
from performance_optimizer import track_performance

# Simple in-memory stats for average length per theme
report_memory: dict[str, dict] = {}


# ===============================================================
# FULL DATA NATURALIZER
# ===============================================================
def naturalize_facts(saju: dict, astro: dict, tarot: dict) -> tuple[str, str, str]:
    """Flatten saju/astro/tarot dicts into readable summaries for prompts."""
    # -------------------- SAJU --------------------
    s_parts = []
    facts = saju.get("facts", {})
    pillars = saju.get("pillars", {})
    day_master = saju.get("dayMaster", {})
    unse = saju.get("unse", {})
    sinsal = saju.get("sinsal", {})

    if pillars:
        s_parts.append(
            f"Pillars — Year: {pillars.get('year')}, Month: {pillars.get('month')}, Day: {pillars.get('day')}, Hour: {pillars.get('time')}."
        )
    if day_master:
        if isinstance(day_master, dict):
            s_parts.append(
                f"Day master: {day_master.get('name')} ({day_master.get('element')})."
            )
        else:
            s_parts.append(f"Day master: {day_master}.")

    if isinstance(facts.get("fiveElements"), dict):
        fe = facts["fiveElements"]
        fe_str = ", ".join([f"{k}:{v}" for k, v in fe.items()])
        s_parts.append(f"Five elements balance: {fe_str}.")
    if "tenGods" in facts:
        s_parts.append(f"Ten gods: {facts['tenGods']}")
    if "powerBalance" in facts:
        s_parts.append(f"Power balance: {facts['powerBalance']}")

    for key, label in [
        ("daeun", "Great luck"),
        ("annual", "Year luck"),
        ("monthly", "Month luck"),
        ("iljin", "Daily pillar"),
    ]:
        cycles = unse.get(key, [])
        if cycles:
            names = [c.get("name") or str(c) for c in cycles[:8]]
            s_parts.append(f"{label}: {', '.join(names)}")
    if sinsal and sinsal.get("hits"):
        s_names = [h.get("name") for h in sinsal["hits"] if h.get("name")]
        if s_names:
            s_parts.append(f"Sinsal: {', '.join(s_names[:15])}")
    saju_text = " ".join(s_parts) or "No saju facts."

    # -------------------- ASTRO --------------------
    a_parts = []
    facts = astro.get("facts", {})
    planets = astro.get("planets", [])
    houses = astro.get("houses", [])
    aspects = astro.get("aspects", [])
    asc = astro.get("ascendant")
    mc = astro.get("mc")
    meta = astro.get("meta", {})
    options = astro.get("options", {})

    if planets:
        for p in planets[:10]:
            if isinstance(p, dict):
                a_parts.append(f"{p.get('name')} in {p.get('sign')} house {p.get('house')}.")
    if asc:
        a_parts.append(f"Ascendant: {asc.get('sign')}.")
    if mc:
        a_parts.append(f"MC: {mc.get('sign')}.")
    if houses:
        a_parts.append(f"Houses count: {len(houses)}")
    if aspects:
        asp_str = ", ".join([f"{a['planet1']}-{a['planet2']} {a['aspect']}" for a in aspects[:10]])
        a_parts.append(f"Aspects: {asp_str}")
    if facts.get("elementRatios"):
        er = facts["elementRatios"]
        er_str = ", ".join([f"{k}:{round(v, 2)}" for k, v in er.items()])
        a_parts.append(f"Element ratios: {er_str}")
    if meta:
        a_parts.append(f"Meta: {json.dumps(meta, ensure_ascii=False)[:500]}")
    if options:
        a_parts.append(f"Options: {json.dumps(options, ensure_ascii=False)[:500]}")
    astro_text = " ".join(a_parts) or "No astrology facts."

    # -------------------- TAROT --------------------
    t_parts = []
    spread = tarot.get("spread") or {}
    drawn_cards = tarot.get("drawnCards") or tarot.get("cards") or []
    category = tarot.get("category") or tarot.get("theme")

    if category:
        t_parts.append(f"Tarot theme: {category}.")
    if spread:
        t_parts.append(f"Spread: {spread.get('title') or spread.get('id')} ({spread.get('cardCount', len(drawn_cards))} cards).")

    if isinstance(drawn_cards, list) and drawn_cards:
        max_cards = drawn_cards[:8]
        for idx, dc in enumerate(max_cards):
            card = dc.get("card") if isinstance(dc, dict) else None
            name = card.get("name") if isinstance(card, dict) else dc.get("name")
            is_reversed = dc.get("isReversed", False) if isinstance(dc, dict) else False
            orientation = "reversed" if is_reversed else "upright"
            keywords = []
            if isinstance(card, dict):
                meaning_block = card.get("reversed") if is_reversed else card.get("upright")
                if meaning_block and isinstance(meaning_block, dict):
                    keywords = meaning_block.get("keywords") or []
            pos_label = ""
            if spread and spread.get("positions") and idx < len(spread["positions"]):
                pos = spread["positions"][idx]
                pos_label = pos.get("title") if isinstance(pos, dict) else str(pos)
            kw_str = f" | keywords: {', '.join(keywords[:4])}" if keywords else ""
            pos_str = f" | position: {pos_label}" if pos_label else ""
            t_parts.append(f"Card {idx+1}: {name} ({orientation}){pos_str}{kw_str}.")

    tarot_text = " ".join(t_parts) or "No tarot facts."

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
        rule_eval = rule_engine.evaluate(facts)

        signals = extract_signals(facts)

        saju_text, astro_text, tarot_text = naturalize_facts(
            facts.get("saju", {}), facts.get("astro", {}), facts.get("tarot", {})
        )
        base_context = (
            f"[Graph/Rule matches]\n"
            f"{json.dumps(linked, ensure_ascii=False, indent=2)}\n\n"
            f"[Rule evaluation]\n"
            f"{json.dumps(rule_eval, ensure_ascii=False, indent=2)}\n\n"
            f"[Signals]\n"
            f"{json.dumps(signals, ensure_ascii=False, indent=2)}\n\n"
            f"[Fusion inputs]\n"
            f"[SAJU] {saju_text}\n[ASTRO] {astro_text}\n[TAROT] {tarot_text}"
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

        result = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": fusion_text,
            "context": context_text,
            "cached": False,  # Fresh generation
            "stats": {
                "current_len": current_len,
                "avg_len": round(meta["avg_len"]),
                "adjust": adjust,
            },
        }

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
