"""
Saju + Astrology RAG Engine (Unified)
=====================================
Combines graph-based (NetworkX) and embedding-based search for Saju/Astrology.

Features:
- GraphRAG class: NetworkX graph with node/edge relationships
- search_graphs function: Simple embedding-based search
- Shared SentenceTransformer model
- Cached embeddings for performance
"""

import os
import csv
import json
import hashlib
import torch
import networkx as nx
from typing import List, Dict, Optional
from functools import lru_cache
from sentence_transformers import SentenceTransformer, util


# ===============================================================
# SHARED MODEL (Singleton)
# ===============================================================
# Lighter model for faster load/encode; swap to a heavier one if quality requires.
_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_MODEL = None


def get_model() -> SentenceTransformer:
    """Get or create singleton SentenceTransformer model."""
    global _MODEL
    if _MODEL is None:
        os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
        device_pref = os.getenv("RAG_DEVICE", "auto").lower()
        device = "cpu"
        if device_pref == "cuda" and torch.cuda.is_available():
            device = "cuda"
        elif device_pref == "auto" and torch.cuda.is_available():
            device = "cuda"
        elif device_pref.startswith("cpu"):
            device = "cpu"
        if device == "cuda":
            torch.set_default_dtype(torch.float16)
        else:
            torch.set_default_dtype(torch.float32)
        # Limit CPU threads to reduce context-switch overhead on small instances
        try:
            torch.set_num_threads(int(os.getenv("RAG_CPU_THREADS", "4")))
        except Exception:
            torch.set_num_threads(4)
        print(f"[SajuAstroRAG] Loading model: {_MODEL_NAME}")
        print(f"[SajuAstroRAG] Using device: {device}")
        _MODEL = SentenceTransformer(_MODEL_NAME, device=device)
        print("[SajuAstroRAG] Model loaded successfully")
    return _MODEL


# ===============================================================
# EMBEDDING UTILITIES
# ===============================================================
@lru_cache(maxsize=2048)
def embed_text(text: str):
    """Embed single text with caching."""
    model = get_model()
    return model.encode(
        text,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )


def embed_batch(texts: List[str], batch_size: int = 16):
    """Embed multiple texts in batch for better performance."""
    model = get_model()
    print(f"[SajuAstroRAG] Encoding {len(texts)} texts (batch={batch_size})...")
    embeds = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    print(f"[SajuAstroRAG] Batch encoding complete: {embeds.shape}")
    return embeds


# ===============================================================
# GRAPH RAG CLASS (NetworkX-based)
# ===============================================================
class GraphRAG:
    """
    Graph-based RAG for Saju + Astrology.
    Uses NetworkX for node/edge relationships.
    Now with pre-computed embedding cache for fast startup.
    """

    CACHE_FILE = "graph_rag_embeds.pt"

    def __init__(self, base_dir: str = None, use_cache: bool = True):
        if base_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            base_dir = os.path.join(base_dir, "data")

        base_dir = os.path.abspath(base_dir)
        if os.path.basename(base_dir) == "graph":
            self.graph_dir = base_dir
        else:
            self.graph_dir = os.path.join(base_dir, "graph")

        # Cache path
        self.cache_path = os.path.join(self.graph_dir, self.CACHE_FILE)

        # Rules directory
        preferred_rules = os.path.join(self.graph_dir, "rules")
        fallback_rules = os.path.join(base_dir, "rules")
        self.rules_dir = preferred_rules if os.path.isdir(preferred_rules) else fallback_rules

        # Initialize
        self.graph = nx.MultiDiGraph()
        self.rules = {}
        self.embed_model = get_model()
        self.node_embeds = None
        self.node_texts = []
        self.node_ids = []

        if not os.path.exists(self.graph_dir):
            raise FileNotFoundError(f"[GraphRAG] Graph folder not found: {self.graph_dir}")

        self._load_all()
        self._prepare_embeddings(use_cache=use_cache)

    def _load_all(self):
        """Load all CSV nodes/edges and JSON rules."""
        # Load graph CSVs
        for root, _, files in os.walk(self.graph_dir):
            for file in files:
                if not file.lower().endswith(".csv"):
                    continue
                path = os.path.join(root, file)
                fixed = path + ".fixed.csv"
                if os.path.exists(fixed):
                    path = fixed
                name = file.lower()
                try:
                    if "node" in name:
                        self._load_nodes(path)
                    elif any(x in name for x in ["edge", "relation", "link"]):
                        self._load_edges(path)
                except Exception as e:
                    print(f"[GraphRAG] CSV load failed ({path}): {e}")

        # Load rules JSONs
        if os.path.exists(self.rules_dir):
            for root, _, files in os.walk(self.rules_dir):
                for file in files:
                    if not file.lower().endswith(".json"):
                        continue
                    key = os.path.splitext(file)[0]
                    path = os.path.join(root, file)
                    try:
                        with open(path, encoding="utf-8") as f:
                            loaded = json.load(f)
                            # Accept both dict and list; wrap list for uniformity
                            if isinstance(loaded, list):
                                loaded = {"items": loaded}
                            self.rules[key] = loaded
                    except Exception as e:
                        print(f"[GraphRAG] Rule load failed ({file}): {e}")

        print(f"[GraphRAG] Loaded {len(self.graph.nodes)} nodes, {len(self.graph.edges)} edges")
        if self.rules:
            print(f"[GraphRAG] Rules: {', '.join(sorted(self.rules.keys()))}")

    def _load_nodes(self, path: str):
        """Load nodes from CSV."""
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if not node_id:
                    continue
                self.graph.add_node(node_id, **row)

    def _load_edges(self, path: str):
        """Load edges from CSV."""
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                src = row.get("src") or row.get("source") or row.get("from")
                dst = row.get("dst") or row.get("target") or row.get("to")
                if not src or not dst:
                    continue
                rel = row.get("relation") or row.get("type") or "link"
                desc = row.get("description") or row.get("desc") or ""
                weight = row.get("weight") or "1"
                self.graph.add_edge(src, dst, relation=rel, desc=desc, weight=weight)

    def _prepare_embeddings(self, use_cache: bool = True):
        """Prepare node embeddings with optional caching."""
        texts = []
        ids = []
        for n, d in self.graph.nodes(data=True):
            text = " ".join(filter(None, [
                d.get("label"),
                d.get("name"),
                d.get("desc"),
                d.get("element"),
            ])).strip()
            texts.append(text)
            ids.append(n)

        self.node_texts = texts
        self.node_ids = ids
        if not texts:
            self.node_embeds = None
            print("[GraphRAG] No node texts for embeddings")
            return

        # Try loading from cache
        if use_cache and os.path.exists(self.cache_path):
            try:
                cache = torch.load(self.cache_path, map_location="cpu")
                if cache.get("count") == len(texts):
                    self.node_embeds = cache["embeddings"]
                    print(f"[GraphRAG] Loaded {self.node_embeds.size(0)} embeddings from cache")
                    return
                else:
                    print(f"[GraphRAG] Cache stale (count mismatch), regenerating...")
            except Exception as e:
                print(f"[GraphRAG] Cache load failed: {e}")

        # Compute embeddings
        self.node_embeds = self.embed_model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        print(f"[GraphRAG] Created {self.node_embeds.size(0)} node embeddings")

        # Save to cache
        if use_cache:
            try:
                torch.save({
                    "embeddings": self.node_embeds,
                    "count": len(texts),
                }, self.cache_path)
                print(f"[GraphRAG] Saved embeddings to cache: {self.cache_path}")
            except Exception as e:
                print(f"[GraphRAG] Cache save failed: {e}")

    def query(self, facts: dict, top_k: int = 8, domain_priority: str = "saju") -> Dict:
        """Query graph with facts dict."""
        facts_str = json.dumps(facts, ensure_ascii=False)

        if self.node_embeds is None or self.node_embeds.size(0) == 0:
            return {
                "matched_nodes": [],
                "related_edges": [],
                "rule_summary": None,
                "context_text": "",
                "stats": {},
            }

        # Query embedding
        query_emb = self.embed_model.encode(
            facts_str,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        cos_scores = util.cos_sim(query_emb, self.node_embeds)[0]
        top_results = torch.topk(cos_scores, k=min(top_k, self.node_embeds.size(0)))

        matched_nodes = [self.node_texts[i] for i in top_results.indices]
        matched_ids = [self.node_ids[i] for i in top_results.indices]
        matched_score = [float(cos_scores[i]) for i in top_results.indices]

        # Related edges
        edges = [
            {"src": u, "dst": v, "rel": d.get("relation"), "desc": d.get("desc", "")}
            for u, v, d in self.graph.edges(data=True)
            if u in matched_ids or v in matched_ids
        ]

        # Rule summary
        rule_summary = self._apply_rules(domain_priority, facts_str) if domain_priority in self.rules else None

        # Context text
        context_lines = [
            f"{matched_ids[i]} | {matched_nodes[i]} (score: {matched_score[i]:.3f})"
            for i in range(len(matched_nodes))
        ]
        edge_lines = [f"{e['src']}->{e['dst']}({e['rel']})" for e in edges[:30]]
        context_text = "\n".join(context_lines + edge_lines)

        return {
            "matched_nodes": matched_nodes,
            "matched_ids": matched_ids,
            "related_edges": edges,
            "rule_summary": rule_summary,
            "context_text": context_text,
            "stats": {"nodes": len(matched_nodes), "edges": len(edges)},
        }

    def _apply_rules(self, domain: str, facts_str: str) -> Optional[List[str]]:
        """Apply rules from JSON."""
        rulebook = self.rules.get(domain)
        if not rulebook:
            return None
        descs = []
        for key, rule in rulebook.items():
            if isinstance(rule, dict):
                cond = rule.get("when")
                msg = rule.get("text")
                if cond and cond in facts_str and msg:
                    descs.append(msg)
            elif isinstance(rule, str):
                if key in facts_str:
                    descs.append(rule)
        return descs[:5] if descs else None


# ===============================================================
# SIMPLE EMBEDDING SEARCH (Function-based)
# ===============================================================
_NODES_CACHE = None
_TEXTS_CACHE = None
_CORPUS_EMBEDS_CACHE = None
_CORPUS_EMBEDS_PATH = None
_GRAPH_MTIME = None
_CACHE_EMBEDS = {}


def _latest_mtime(folder: str) -> float:
    """Get latest modification time of files in folder."""
    latest = 0.0
    for root, _, files in os.walk(folder):
        for f in files:
            try:
                ts = os.path.getmtime(os.path.join(root, f))
                if ts > latest:
                    latest = ts
            except OSError:
                continue
    return latest


def _load_graph_nodes(graph_root: str) -> List[Dict]:
    """Load all nodes from CSV and JSON files."""
    all_nodes = []
    # Include interpretations folders for detailed interpretation corpus
    targets = [
        "astro_database", "cross_analysis", "saju", "rules", "fusion", "astro", "saju_literary",
        "numerology", "dream"
    ]

    # Explicitly load interpretation folders
    interpretation_folders = [
        os.path.join(graph_root, "astro_database", "interpretations"),
        os.path.join(graph_root, "saju", "interpretations"),
    ]
    for interp_folder in interpretation_folders:
        if os.path.isdir(interp_folder):
            _load_from_folder(interp_folder, all_nodes, "interpretation")

    for sub in targets:
        if sub == "rules":
            rules_path = os.path.join(graph_root, sub)
            if os.path.isdir(rules_path):
                for subdir in os.listdir(rules_path):
                    subdir_path = os.path.join(rules_path, subdir)
                    if os.path.isdir(subdir_path):
                        _load_from_folder(subdir_path, all_nodes, subdir)
            continue

        folder = os.path.join(graph_root, sub)
        if not os.path.isdir(folder):
            continue
        _load_from_folder(folder, all_nodes, sub)

    print(f"[SajuAstroRAG] Loaded {len(all_nodes)} nodes")
    return all_nodes


def _load_from_folder(folder: str, all_nodes: List[Dict], source: str):
    """Load nodes from a specific folder."""
    for root, _, files in os.walk(folder):
        for f in files:
            path = os.path.join(root, f)

            if f.endswith(".csv"):
                try:
                    with open(path, newline="", encoding="utf-8-sig") as fr:
                        reader = csv.DictReader(fr)
                        for row in reader:
                            desc = row.get("description") or row.get("content") or ""
                            label = row.get("label") or row.get("name") or ""
                            if desc.strip():
                                all_nodes.append({
                                    "label": label.strip(),
                                    "description": desc.strip(),
                                    "type": "csv_node",
                                    "source": source,
                                })
                except Exception as e:
                    print(f"[SajuAstroRAG] CSV error: {path} | {e}")

            elif f.endswith(".json"):
                try:
                    with open(path, "r", encoding="utf-8-sig") as fr:
                        data = json.load(fr)

                    if isinstance(data, list):
                        nodes = data
                    elif isinstance(data, dict) and "nodes" in data:
                        nodes = data["nodes"]
                    elif isinstance(data, dict):
                        nodes = []
                        for k, v in data.items():
                            # Skip meta fields
                            if k.startswith("$") or k == "meta":
                                continue

                            # ============================================
                            # Handle new interpretation corpus structures
                            # ============================================

                            # 1. Handle "interpretations" array (new astro corpus format)
                            if k == "interpretations" and isinstance(v, list) and len(v) > 0:
                                for item in v:
                                    if not isinstance(item, dict):
                                        continue
                                    item_id = item.get("id", "")

                                    # Build description from multiple fields
                                    desc_parts = []

                                    # Core interpretation (priority)
                                    core = item.get("core_interpretation", "")
                                    if core:
                                        desc_parts.append(core)

                                    # Personality/strengths/challenges (astro planet-sign)
                                    for field in ["personality", "strengths", "challenges", "life_advice",
                                                  "career_hints", "relationship_style"]:
                                        val = item.get(field, "")
                                        if val and isinstance(val, str) and len(val) > 10:
                                            desc_parts.append(f"{field}: {val[:150]}")

                                    # Aspect interpretation fields
                                    for field in ["positive_expression", "challenging_expression", "integration_advice"]:
                                        val = item.get(field, "")
                                        if val and isinstance(val, str):
                                            desc_parts.append(f"{field}: {val}")

                                    # Ascendant fields
                                    for field in ["first_impression", "approach_to_life", "physical_appearance", "life_path"]:
                                        val = item.get(field, "")
                                        if val and isinstance(val, str):
                                            desc_parts.append(f"{field}: {val}")

                                    # Transit fields
                                    theme = item.get("theme", "")
                                    duration = item.get("duration", "")
                                    if theme:
                                        desc_parts.append(f"theme: {theme}")
                                    if duration:
                                        desc_parts.append(f"duration: {duration}")

                                    # Planet/house/sign info for context
                                    planet_info = item.get("planet", {})
                                    sign_info = item.get("sign", {})
                                    house_info = item.get("house", {})
                                    aspect_info = item.get("aspect", {})

                                    planet_ko = planet_info.get("ko", "") if isinstance(planet_info, dict) else ""
                                    sign_ko = sign_info.get("ko", "") if isinstance(sign_info, dict) else ""
                                    house_ko = house_info.get("ko", "") if isinstance(house_info, dict) else ""
                                    aspect_ko = aspect_info.get("ko", "") if isinstance(aspect_info, dict) else ""

                                    context_parts = [p for p in [planet_ko, sign_ko, house_ko, aspect_ko] if p]
                                    if context_parts:
                                        desc_parts.insert(0, " ".join(context_parts))

                                    # Determine type based on item content
                                    if "sign" in item and "planet" in item and "house" not in item:
                                        node_type = "astro_planet_sign"
                                    elif "house" in item and "planet" in item:
                                        node_type = "astro_planet_house"
                                    elif "aspect" in item:
                                        node_type = "astro_aspect"
                                    elif "first_impression" in item:
                                        node_type = "astro_ascendant"
                                    elif "transit_planet" in item:
                                        node_type = "astro_transit"
                                    else:
                                        node_type = "astro_interpretation"

                                    if desc_parts:
                                        nodes.append({
                                            "label": item_id or k,
                                            "description": " | ".join(desc_parts[:6]),
                                            "type": node_type,
                                            "source": source,
                                            "raw": item,
                                        })
                                continue

                            # 1b. Handle other interpretation arrays (legacy format)
                            if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                                for item in v:
                                    item_id = item.get("id", "")
                                    # Get detailed interpretation text
                                    interp = item.get("detailed_interpretation", {})
                                    if isinstance(interp, dict):
                                        interp_text = interp.get("ko", "") or interp.get("en", "")
                                    else:
                                        interp_text = str(interp) if interp else ""

                                    # Also get core_theme, advice, etc.
                                    core_theme = item.get("core_theme", "")
                                    advice = item.get("advice", "")
                                    keywords = " ".join(item.get("keywords", []))

                                    desc_parts = [p for p in [core_theme, interp_text[:300], advice, keywords] if p]
                                    if desc_parts:
                                        nodes.append({
                                            "label": item_id or k,
                                            "description": " | ".join(desc_parts),
                                            "type": "interpretation_entry",
                                            "source": source,
                                            "raw": item,
                                        })
                                continue

                            # 2. Handle sipsung_detailed style (quantity_analysis, position_analysis)
                            if k in ["quantity_analysis", "position_analysis", "balance_analysis"] and isinstance(v, dict):
                                for ss_name, ss_data in v.items():
                                    if not isinstance(ss_data, dict):
                                        continue
                                    for level, level_data in ss_data.items():
                                        if isinstance(level_data, dict):
                                            # Extract all text fields
                                            desc_parts = []
                                            for field in ["personality", "wealth", "relationship", "career", "health", "advice",
                                                         "meaning", "effect", "interpretation"]:
                                                if field in level_data and level_data[field]:
                                                    desc_parts.append(f"{field}: {level_data[field]}")
                                            if desc_parts:
                                                nodes.append({
                                                    "label": f"{ss_name}_{level}",
                                                    "description": " | ".join(desc_parts[:4]),
                                                    "type": "saju_interpretation",
                                                    "source": source,
                                                    "category": k,
                                                    "raw": level_data,
                                                })
                                        elif isinstance(level_data, str):
                                            nodes.append({
                                                "label": f"{ss_name}_{level}",
                                                "description": level_data,
                                                "type": "saju_interpretation",
                                                "source": source,
                                            })
                                continue

                            # 3. Handle combination_analysis (list of patterns)
                            if k == "combination_analysis" and isinstance(v, list):
                                for combo in v:
                                    if isinstance(combo, dict):
                                        pattern = combo.get("pattern", "")
                                        interp = combo.get("interpretation", "")
                                        advice = combo.get("advice", "")
                                        condition = combo.get("condition", "")
                                        if interp:
                                            nodes.append({
                                                "label": pattern or "조합",
                                                "description": f"{condition} | {interp} | {advice}",
                                                "type": "saju_combination",
                                                "source": source,
                                                "raw": combo,
                                            })
                                continue

                            # 4. Handle jiji_relations (yukchung, yukhab, samhab, etc.)
                            if k in ["yukchung", "yukhab", "samhab", "banghab", "hyung", "pa", "hae", "won"] and isinstance(v, dict):
                                for rel_name, rel_data in v.items():
                                    if isinstance(rel_data, dict):
                                        meaning = rel_data.get("meaning", "")
                                        effects = rel_data.get("effects", {})
                                        advice = rel_data.get("advice", "")
                                        if isinstance(effects, dict):
                                            effect_texts = [f"{ek}: {ev}" for ek, ev in effects.items() if isinstance(ev, str)][:3]
                                        else:
                                            effect_texts = [str(effects)] if effects else []
                                        desc_parts = [meaning] + effect_texts + ([advice] if advice else [])
                                        if desc_parts:
                                            nodes.append({
                                                "label": f"{k}_{rel_name}",
                                                "description": " | ".join(desc_parts),
                                                "type": "jiji_relation",
                                                "source": source,
                                                "raw": rel_data,
                                            })
                                continue

                            # 5. Handle ohaeng individual/balance
                            if k in ["individual", "balance"] and isinstance(v, dict):
                                for oh_name, oh_data in v.items():
                                    if isinstance(oh_data, dict):
                                        desc_parts = []
                                        for field in ["nature", "personality", "interpretation", "advice", "meaning",
                                                     "positive", "negative", "body", "disease", "career",
                                                     "excessive", "deficient"]:
                                            val = oh_data.get(field)
                                            if val:
                                                if isinstance(val, list):
                                                    desc_parts.append(f"{field}: {', '.join(val[:3])}")
                                                else:
                                                    desc_parts.append(f"{field}: {val}")
                                        if desc_parts:
                                            nodes.append({
                                                "label": f"ohaeng_{oh_name}",
                                                "description": " | ".join(desc_parts[:5]),
                                                "type": "ohaeng_interpretation",
                                                "source": source,
                                                "raw": oh_data,
                                            })
                                continue

                            # ============================================
                            # Original parsing logic below
                            # ============================================

                            if isinstance(v, str):
                                nodes.append({"label": k, "description": v, "type": "json_rule"})
                            elif isinstance(v, dict):
                                # Handle rule files with when/text structure
                                if "text" in v and v["text"]:
                                    text_content = str(v["text"])
                                    if len(text_content) > 10:
                                        nodes.append({
                                            "label": k,
                                            "description": text_content[:500],
                                            "type": "rule",
                                            "source": source,
                                            "conditions": v.get("when", []),
                                            "weight": v.get("weight", 1),
                                        })
                                    continue

                                # Handle astro-style nested JSON (planet_in_sign, etc.)
                                desc_parts = []
                                # Include all astro interpretation fields (personal planets)
                                for field in ["core", "light", "shadow", "growth", "karma", "gift",
                                              "meaning", "expression", "challenge", "advice",
                                              "attraction_style", "love_language", "career_drive",
                                              # Mars synthesis fields
                                              "drive", "aggression", "assertion", "competition",
                                              # Jupiter synthesis fields
                                              "expansion", "luck", "faith", "excess",
                                              # Saturn synthesis fields
                                              "lesson", "restriction", "maturity", "fear",
                                              # Uranus synthesis fields
                                              "awakening", "freedom", "genius", "disruption",
                                              # Neptune synthesis fields
                                              "inspiration", "illusion", "transcendence", "creativity",
                                              # Pluto synthesis fields
                                              "transformation", "power", "obsession", "regeneration",
                                              # Nodes synthesis fields
                                              "destiny", "comfort", "integration", "mission",
                                              # Chiron interpretation fields
                                              "wound", "healing", "teacher", "healing_path", "detailed",
                                              # Chiron synthesis fields
                                              "pain", "wound_theme", "healing_gift",
                                              # Lilith interpretation fields
                                              "manifestations",
                                              # Part of Fortune fields
                                              "fortune", "how_to_activate", "focus",
                                              # Vertex interpretation fields
                                              "fated_theme", "fated_encounters", "trigger", "how_to_recognize",
                                              # Nodes synthesis fields
                                              "comfort_zone", "south_node", "lesson"]:
                                    if field in v and v[field]:
                                        desc_parts.append(str(v[field]))

                                # Also handle nested dicts (synastry aspects, synthesis files, etc.)
                                if not desc_parts:
                                    for sub_k, sub_v in v.items():
                                        if isinstance(sub_v, dict):
                                            # Handle synthesis files: Sign_Planet -> H1/H2... -> {fields}
                                            synthesis_fields = ["core", "meaning", "dynamic", "gift", "challenge",
                                                                "drive", "aggression", "assertion", "competition", "shadow",
                                                                "expansion", "luck", "growth", "faith", "excess",
                                                                "lesson", "restriction", "maturity", "fear", "karma",
                                                                "awakening", "freedom", "genius", "disruption",
                                                                "inspiration", "illusion", "transcendence", "creativity",
                                                                "transformation", "power", "obsession", "regeneration",
                                                                "destiny", "comfort", "integration", "mission",
                                                                "wound", "healing", "teacher", "healing_path", "detailed",
                                                                "pain", "wound_theme", "healing_gift",
                                                                "fortune", "how_to_activate", "focus", "advice",
                                                                "fated_theme", "fated_encounters", "trigger", "how_to_recognize",
                                                                "expression", "manifestations",
                                                                "comfort_zone", "south_node"]
                                            for field in synthesis_fields:
                                                if field in sub_v and sub_v[field]:
                                                    desc_parts.append(f"{sub_k}: {sub_v[field]}")
                                        elif isinstance(sub_v, str) and len(sub_v) > 10:
                                            desc_parts.append(sub_v)

                                if desc_parts:
                                    nodes.append({
                                        "label": k,
                                        "description": " | ".join(desc_parts[:5]),
                                        "type": "astro_interpretation",
                                        "source": source,
                                        "raw": v,
                                    })
                            elif isinstance(v, list):
                                # Handle saju_literary style: {"ten_gods": [...], "five_elements": [...]}
                                for item in v:
                                    if isinstance(item, dict):
                                        desc_parts = []
                                        for field in ["core", "meaning", "light", "shadow", "psychology",
                                                      "life_area", "relation", "expression", "advice",
                                                      "career", "love", "health", "wealth", "timing"]:
                                            if field in item and item[field]:
                                                desc_parts.append(str(item[field]))
                                        if desc_parts:
                                            label = item.get("name") or item.get("id") or item.get("label") or k
                                            # Include hanja if available
                                            if item.get("hanja"):
                                                label = f"{label}({item['hanja']})"
                                            nodes.append({
                                                "label": label,
                                                "description": " | ".join(desc_parts[:6]),
                                                "type": "saju_literary",
                                                "source": source,
                                                "raw": item,
                                            })
                    else:
                        nodes = [data]

                    for node in nodes:
                        if isinstance(node, dict) and node.get("description"):
                            node.setdefault("source", source)
                            all_nodes.append(node)
                except Exception as e:
                    print(f"[SajuAstroRAG] JSON error: {path} | {e}")


def search_graphs(query: str, top_k: int = 6, graph_root: str = None) -> List[Dict]:
    """
    Simple embedding-based search in graph data.

    Args:
        query: Natural language search query
        top_k: Number of results to return
        graph_root: Path to graph data (default: backend_ai/data/graph)

    Returns:
        List of matching nodes with scores
    """
    if graph_root is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        graph_root = os.path.join(base_dir, "data", "graph")

    global _NODES_CACHE, _TEXTS_CACHE, _CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH, _GRAPH_MTIME

    current_mtime = _latest_mtime(graph_root)
    graph_changed = _GRAPH_MTIME is None or current_mtime > (_GRAPH_MTIME or 0)

    if _NODES_CACHE is None or graph_changed:
        _NODES_CACHE = _load_graph_nodes(graph_root)
        _TEXTS_CACHE = [n["description"] for n in _NODES_CACHE if n.get("description")]
        _CORPUS_EMBEDS_PATH = os.path.join(graph_root, "corpus_embeds.pt")
        _CORPUS_EMBEDS_CACHE = None
        _GRAPH_MTIME = current_mtime

    if not _NODES_CACHE or not _TEXTS_CACHE:
        print("[SajuAstroRAG] No graph nodes found")
        return []

    # Query embedding with cache
    cache_key = hashlib.sha1(query.encode("utf-8")).hexdigest()[:16]
    q_emb = _CACHE_EMBEDS.get(cache_key)
    if q_emb is None:
        q_emb = embed_text(query)
        _CACHE_EMBEDS[cache_key] = q_emb

    # Corpus embeddings
    if _CORPUS_EMBEDS_CACHE is None:
        if _CORPUS_EMBEDS_PATH and os.path.exists(_CORPUS_EMBEDS_PATH):
            print(f"[SajuAstroRAG] Loading cached embeddings: {_CORPUS_EMBEDS_PATH}")
            _CORPUS_EMBEDS_CACHE = torch.load(_CORPUS_EMBEDS_PATH, map_location="cpu")
        else:
            _CORPUS_EMBEDS_CACHE = embed_batch(_TEXTS_CACHE, batch_size=64)
            try:
                if _CORPUS_EMBEDS_PATH:
                    torch.save(_CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH)
                    print(f"[SajuAstroRAG] Saved embeddings: {_CORPUS_EMBEDS_PATH}")
            except Exception as e:
                print(f"[SajuAstroRAG] Failed to save embeddings: {e}")

    # Search
    scores = util.cos_sim(q_emb, _CORPUS_EMBEDS_CACHE)[0]
    best_indices = torch.topk(scores, k=min(top_k, len(_NODES_CACHE)))

    results = []
    for idx, score in zip(best_indices.indices, best_indices.values):
        node = dict(_NODES_CACHE[int(idx)])
        node["score"] = round(float(score), 4)
        results.append(node)

    return results


# ===============================================================
# SINGLETON INSTANCE
# ===============================================================
_graph_rag_instance: Optional[GraphRAG] = None


def get_graph_rag() -> GraphRAG:
    """Get or create singleton GraphRAG instance."""
    global _graph_rag_instance
    if _graph_rag_instance is None:
        _graph_rag_instance = GraphRAG()
    return _graph_rag_instance


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing SajuAstroRAG...")

    # Test search_graphs
    print("\n[Test 1] search_graphs()")
    results = search_graphs("리더십과 추진력", top_k=3)
    for r in results:
        print(f"  - {r.get('label', '?')}: {r.get('score', 0):.3f}")

    # Test GraphRAG
    print("\n[Test 2] GraphRAG.query()")
    rag = get_graph_rag()
    result = rag.query({"element": "wood", "house": 1}, top_k=3)
    print(f"  Matched nodes: {len(result['matched_nodes'])}")
    print(f"  Related edges: {len(result['related_edges'])}")
