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

import csv
import hashlib
import json
import logging
import os
import random
import re
import time
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from threading import RLock
from typing import Dict, List, Optional, Tuple

import networkx as nx
import torch
from sentence_transformers import SentenceTransformer, util

# ChromaDB Feature Flag: USE_CHROMADB=1 환경변수로 활성화
_USE_CHROMADB = os.environ.get("USE_CHROMADB", "0") == "1"

logger = logging.getLogger(__name__)

# ===============================================================
# QUERY CACHE (TTL + LRU with Thundering Herd Protection)
# ===============================================================
_QUERY_CACHE_SIZE = int(os.environ.get("RAG_QUERY_CACHE_SIZE", "256"))
_QUERY_CACHE_TTL = int(os.environ.get("RAG_CACHE_TTL", "300"))  # 5 minutes


class QueryCache:
    """Thread-safe LRU cache with TTL and thundering herd protection."""

    def __init__(self, maxsize: int = 256, ttl_seconds: int = 300):
        self.maxsize = maxsize
        self.ttl = ttl_seconds
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: Dict[str, float] = {}
        self._lock = RLock()
        self._hits = 0
        self._misses = 0

    def _make_key(self, facts: dict, top_k: int, domain_priority: str) -> str:
        """Generate cache key from query parameters."""
        key_data = json.dumps({
            "facts": facts,
            "top_k": top_k,
            "domain": domain_priority
        }, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(key_data.encode()).hexdigest()

    def get(self, facts: dict, top_k: int, domain_priority: str) -> Optional[dict]:
        """Get cached result if not expired, with thundering herd protection."""
        key = self._make_key(facts, top_k, domain_priority)

        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            age = time.time() - self._timestamps[key]

            # Probabilistic early expiration to prevent thundering herd
            # As we approach TTL (last 20%), probability of refresh increases
            if age > self.ttl * 0.8:
                remaining_ratio = max(0, (self.ttl - age) / (self.ttl * 0.2))
                if random.random() > remaining_ratio:
                    self._misses += 1
                    return None

            if age > self.ttl:
                del self._cache[key]
                del self._timestamps[key]
                self._misses += 1
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1
            return self._cache[key]

    def set(self, facts: dict, top_k: int, domain_priority: str, result: dict):
        """Cache a query result."""
        key = self._make_key(facts, top_k, domain_priority)

        with self._lock:
            # Evict oldest if at capacity
            while len(self._cache) >= self.maxsize:
                oldest_key, _ = self._cache.popitem(last=False)
                self._timestamps.pop(oldest_key, None)

            self._cache[key] = result
            self._timestamps[key] = time.time()

    def stats(self) -> Dict:
        """Return cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            return {
                "hits": self._hits,
                "misses": self._misses,
                "size": len(self._cache),
                "maxsize": self.maxsize,
                "hit_rate_percent": round(hit_rate, 2),
            }

    def clear(self):
        """Clear the cache."""
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()


# Global query cache instance
_query_cache = QueryCache(maxsize=_QUERY_CACHE_SIZE, ttl_seconds=_QUERY_CACHE_TTL)

# ===============================================================
# CONSTANTS
# ===============================================================
_MODEL_NAME_MULTILINGUAL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_MODEL_NAME_ENGLISH = "sentence-transformers/all-MiniLM-L6-v2"
_DEFAULT_CPU_THREADS = 4
_DEFAULT_BATCH_SIZE = 64
_GRAPH_CACHE_FILE = "graph_rag_embeds.pt"
_CORPUS_CACHE_FILE = "corpus_embeds.pt"

# Node ID fields to check in order
_NODE_ID_FIELDS = ("id", "label", "name")
# Edge source fields to check in order
_EDGE_SRC_FIELDS = ("src", "source", "source_id", "source_iching", "from", "base_ganji")
# Edge destination fields to check in order
_EDGE_DST_FIELDS = ("dst", "target", "target_id", "target_tarot", "to", "flow_ganji")
# Edge relation fields to check in order
_EDGE_REL_FIELDS = ("relation", "relation_type", "type")
# Edge description fields to check in order
_EDGE_DESC_FIELDS = ("description", "desc", "meaning_ko")

# Graph folders to load
_GRAPH_TARGET_FOLDERS = frozenset([
    "astro_database", "cross_analysis", "saju", "rules", "fusion",
    "astro", "saju_literary", "numerology", "dream", "tarot",
    "jung_psychology", "persona"
])

# Saju interpretation fields
_SAJU_INTERP_FIELDS = (
    "personality", "wealth", "relationship", "career", "health", "advice",
    "meaning", "effect", "interpretation"
)

# Ohaeng (Five Elements) interpretation fields
_OHAENG_FIELDS = (
    "nature", "personality", "interpretation", "advice", "meaning",
    "positive", "negative", "body", "disease", "career",
    "excessive", "deficient"
)

# Astro interpretation fields (personal planets)
_ASTRO_CORE_FIELDS = (
    "core", "light", "shadow", "growth", "karma", "gift",
    "meaning", "expression", "challenge", "advice",
    "attraction_style", "love_language", "career_drive"
)

# Astro synthesis fields (all planets + special points)
_ASTRO_SYNTHESIS_FIELDS = (
    # Core
    "core", "meaning", "dynamic", "gift", "challenge", "shadow",
    # Mars
    "drive", "aggression", "assertion", "competition",
    # Jupiter
    "expansion", "luck", "growth", "faith", "excess",
    # Saturn
    "lesson", "restriction", "maturity", "fear", "karma",
    # Uranus
    "awakening", "freedom", "genius", "disruption",
    # Neptune
    "inspiration", "illusion", "transcendence", "creativity",
    # Pluto
    "transformation", "power", "obsession", "regeneration",
    # Nodes
    "destiny", "comfort", "integration", "mission", "comfort_zone", "south_node",
    # Chiron
    "wound", "healing", "teacher", "healing_path", "detailed", "pain", "wound_theme", "healing_gift",
    # Lilith
    "expression", "manifestations",
    # Part of Fortune
    "fortune", "how_to_activate", "focus", "advice",
    # Vertex
    "fated_theme", "fated_encounters", "trigger", "how_to_recognize",
)

# Jiji relation types
_JIJI_RELATION_TYPES = frozenset([
    "yukchung", "yukhab", "samhab", "banghab", "hyung", "pa", "hae", "won"
])

# Saju literary fields
_SAJU_LITERARY_FIELDS = (
    "core", "meaning", "light", "shadow", "psychology",
    "life_area", "relation", "expression", "advice",
    "career", "love", "health", "wealth", "timing"
)

# Tarot interpretation fields
_TAROT_FIELDS = (
    "upright", "reversed", "keywords", "meaning", "advice",
    "symbolism", "archetype", "element", "astrology",
    "love", "career", "finance", "health", "spiritual",
    "shadow_work", "meditation", "affirmation", "timing",
    "general", "description", "interpretation", "guidance"
)

# ===============================================================
# SHARED MODEL (Singleton)
# ===============================================================
_MODEL: Optional[SentenceTransformer] = None
_MODEL_TYPE: Optional[str] = None  # "multilingual" or "english"


def _get_device() -> str:
    """Determine the best device for model inference."""
    device_pref = os.getenv("RAG_DEVICE", "auto").lower()
    if device_pref == "cuda" and torch.cuda.is_available():
        return "cuda"
    if device_pref == "auto" and torch.cuda.is_available():
        return "cuda"
    return "cpu"


def get_model(prefer_multilingual: bool = True) -> SentenceTransformer:
    """
    Get or create singleton SentenceTransformer model.

    Args:
        prefer_multilingual: If True, try to load multilingual model first.
                            Supports Korean, English, Chinese, Japanese, etc.
    """
    global _MODEL, _MODEL_TYPE
    if _MODEL is not None:
        return _MODEL

    os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
    device = _get_device()
    torch.set_default_dtype(torch.float16 if device == "cuda" else torch.float32)

    try:
        torch.set_num_threads(int(os.getenv("RAG_CPU_THREADS", str(_DEFAULT_CPU_THREADS))))
    except (ValueError, TypeError):
        torch.set_num_threads(_DEFAULT_CPU_THREADS)

    model_override = os.getenv("RAG_MODEL", "").lower()
    use_multilingual = prefer_multilingual and model_override != "english"

    if use_multilingual:
        try:
            logger.info("Loading multilingual model: %s", _MODEL_NAME_MULTILINGUAL)
            logger.info("Using device: %s", device)
            _MODEL = SentenceTransformer(_MODEL_NAME_MULTILINGUAL, device=device)
            _MODEL_TYPE = "multilingual"
            logger.info("Multilingual model loaded (ko/en/zh/ja support)")
            return _MODEL
        except Exception as e:
            logger.warning("Multilingual model failed: %s, falling back to English", e)

    logger.info("Loading English model: %s", _MODEL_NAME_ENGLISH)
    logger.info("Using device: %s", device)
    _MODEL = SentenceTransformer(_MODEL_NAME_ENGLISH, device=device)
    _MODEL_TYPE = "english"
    logger.info("English model loaded successfully")
    return _MODEL


def get_model_type() -> str:
    """Get the type of loaded model (multilingual or english)."""
    global _MODEL_TYPE
    if _MODEL_TYPE is None:
        get_model()  # Initialize if not yet loaded
    return _MODEL_TYPE or "unknown"


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
    logger.info("Encoding %d texts (batch=%d)...", len(texts), batch_size)
    embeds = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_tensor=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    logger.info("Batch encoding complete: %s", embeds.shape)
    return embeds


# ===============================================================
# HELPER FUNCTIONS
# ===============================================================
def _normalize_value(val: Optional[str]) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, str):
        stripped = val.strip()
        return stripped if stripped else None
    return val


def _get_first_field(row: Dict, fields: tuple) -> Optional[str]:
    """Get the first non-empty value from a list of field names."""
    for field in fields:
        val = _normalize_value(row.get(field))
        if val is not None:
            return val
    # Case-insensitive fallback
    lower_map = {k.lower(): k for k in row.keys()}
    for field in fields:
        key = lower_map.get(field.lower())
        if key:
            val = _normalize_value(row.get(key))
            if val is not None:
                return val
    return None


def _has_edge_columns(headers: List[str]) -> bool:
    header_set = {h.lower() for h in headers}
    has_src = any(h in header_set for h in _EDGE_SRC_FIELDS) or any(
        h.startswith("source_") or h.startswith("src_") for h in header_set
    )
    has_dst = any(h in header_set for h in _EDGE_DST_FIELDS) or any(
        h.startswith("target_") or h.startswith("dst_") for h in header_set
    )
    return has_src and has_dst


def _has_node_columns(headers: List[str]) -> bool:
    header_set = {h.lower() for h in headers}
    return any(h in header_set for h in _NODE_ID_FIELDS)


_SPECIAL_NODE_MAP = {
    "Ascendant": "Asc",
    "Midheaven": "MC",
}

_ASTRO_PLANET_CANON = {
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

_ASTRO_SIGN_CANON = {
    "aries": "Aries",
    "taurus": "Taurus",
    "gemini": "Gemini",
    "cancer": "Cancer",
    "leo": "Leo",
    "virgo": "Virgo",
    "libra": "Libra",
    "scorpio": "Scorpio",
    "sagittarius": "Sagittarius",
    "capricorn": "Capricorn",
    "aquarius": "Aquarius",
    "pisces": "Pisces",
}

_ASTRO_POINT_CANON = {
    "asc": "Asc",
    "ascendant": "Asc",
    "mc": "MC",
    "midheaven": "MC",
    "ic": "IC",
    "desc": "Desc",
    "descendant": "Desc",
    "node": "Node",
    "northnode": "NorthNode",
    "southnode": "SouthNode",
    "chiron": "Chiron",
    "vertex": "Vertex",
    "partoffortune": "PartOfFortune",
    "fortune": "PartOfFortune",
}

_SAJU_ELEMENT_ALIASES = {
    "목": "목",
    "木": "목",
    "WOOD": "목",
    "화": "화",
    "火": "화",
    "FIRE": "화",
    "토": "토",
    "土": "토",
    "EARTH": "토",
    "금": "금",
    "金": "금",
    "METAL": "금",
    "수": "수",
    "水": "수",
    "WATER": "수",
}

_ASTRO_ELEMENT_ALIASES = {
    "FIRE": "Fire",
    "불": "Fire",
    "火": "Fire",
    "EARTH": "Earth",
    "흙": "Earth",
    "土": "Earth",
    "AIR": "Air",
    "공기": "Air",
    "風": "Air",
    "WATER": "Water",
    "물": "Water",
    "水": "Water",
}

_PREFIX_NODE_LABELS = {
    "TR": "트랜짓",
    "SP": "진행",
    "SR": "솔라리턴",
    "COMP": "합성차트",
    "A": "A",
    "B": "B",
}


def _normalize_edge_node_id(node_id: Optional[str]) -> Optional[str]:
    if not node_id:
        return node_id
    mapped = _SPECIAL_NODE_MAP.get(node_id)
    if mapped:
        return mapped

    if node_id.startswith("SAJU_ELEMENT_"):
        raw_elem = node_id.split("_", 2)[-1]
        canonical = _canonical_saju_element(raw_elem)
        if canonical:
            return f"EL_{canonical}"

    if node_id.startswith("AP_"):
        name = node_id.split("_", 1)[-1]
        canon = _ASTRO_PLANET_CANON.get(name.lower())
        if canon:
            return canon
    if node_id.startswith("AS_"):
        name = node_id.split("_", 1)[-1]
        canon = _ASTRO_SIGN_CANON.get(name.lower())
        if canon:
            return canon
        planet = _ASTRO_PLANET_CANON.get(name.lower())
        if planet:
            return planet
        house_match = re.match(r"^(\d{1,2})(?:st|nd|rd|th)?_house$", name, flags=re.IGNORECASE)
        if house_match:
            return f"H{int(house_match.group(1))}"
        point = _ASTRO_POINT_CANON.get(name.replace("_", "").lower())
        if point:
            return point
    if node_id.startswith("AH_"):
        number = node_id.split("_", 1)[-1]
        if number.isdigit():
            return f"H{number}"

    if node_id.startswith("ASTRO_PLANET_"):
        name = node_id.split("_", 2)[-1]
        canon = _ASTRO_PLANET_CANON.get(name.lower())
        if canon:
            return canon
    if node_id.startswith("ASTRO_SIGN_"):
        name = node_id.split("_", 2)[-1]
        canon = _ASTRO_SIGN_CANON.get(name.lower())
        if canon:
            return canon
    if node_id.startswith("ASTRO_HOUSE_"):
        number = node_id.split("_", 2)[-1]
        if number.isdigit():
            return f"H{number}"
    if node_id.startswith("ASTRO_POINT_"):
        name = node_id.split("_", 2)[-1]
        key = name.replace("_", "").lower()
        canon = _ASTRO_POINT_CANON.get(key)
        if canon:
            return canon
    if node_id.startswith("ASTRO_NODE_"):
        name = node_id.split("_", 2)[-1]
        key = f"{name}node".replace("_", "").lower()
        canon = _ASTRO_POINT_CANON.get(key) or _ASTRO_POINT_CANON.get(name.replace("_", "").lower())
        if canon:
            return canon
    return node_id


def _canonical_saju_element(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    raw = value.split("(", 1)[0].strip()
    direct = _SAJU_ELEMENT_ALIASES.get(raw)
    if direct:
        return direct
    return _SAJU_ELEMENT_ALIASES.get(raw.upper())


def _canonical_astro_element(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    raw = value.split("(", 1)[0].strip()
    direct = _ASTRO_ELEMENT_ALIASES.get(raw)
    if direct:
        return direct
    return _ASTRO_ELEMENT_ALIASES.get(raw.upper())


def _merge_node_attrs(existing: Dict, incoming: Dict) -> Dict:
    merged = dict(existing)
    for k, v in incoming.items():
        v = _normalize_value(v)
        if v is None:
            continue
        current = _normalize_value(merged.get(k))
        if current is None:
            merged[k] = v
            continue
        if k in ("description", "desc", "content"):
            if isinstance(v, str) and isinstance(current, str) and len(v) > len(current):
                merged[k] = v
    return merged


# ===============================================================
# GRAPH RAG CLASS (NetworkX-based)
# ===============================================================
class GraphRAG:
    """
    Graph-based RAG for Saju + Astrology.
    Uses NetworkX for node/edge relationships.
    Now with pre-computed embedding cache for fast startup.
    """

    def __init__(self, base_dir: Optional[str] = None, use_cache: bool = True):
        if base_dir is None:
            base_path = Path(__file__).parent.parent / "data"
        else:
            base_path = Path(base_dir).resolve()

        self.graph_dir = base_path if base_path.name == "graph" else base_path / "graph"
        self.cache_path = self.graph_dir / _GRAPH_CACHE_FILE

        # Rules directory
        preferred_rules = self.graph_dir / "rules"
        fallback_rules = base_path / "rules"
        self.rules_dir = preferred_rules if preferred_rules.is_dir() else fallback_rules

        self.alias_map: Dict[str, str] = {}
        self._alias_priority: Dict[str, int] = {}

        # Initialize
        self.graph = nx.MultiDiGraph()
        self.rules: Dict[str, Dict] = {}
        self.embed_model = get_model()
        self.node_embeds = None
        self.node_texts: List[str] = []
        self.node_ids: List[str] = []

        if not self.graph_dir.exists():
            raise FileNotFoundError(f"[GraphRAG] Graph folder not found: {self.graph_dir}")

        self._load_all()
        self._prepare_embeddings(use_cache=use_cache)

    def _load_all(self):
        """Load all CSV nodes/edges and JSON rules."""
        # Load graph CSVs (two-pass: nodes -> aliases/synthetic -> edges)
        node_paths: List[Path] = []
        edge_paths: List[Path] = []

        for csv_path in sorted(self.graph_dir.rglob("*.csv")):
            if csv_path.name.endswith(".fixed.csv"):
                continue
            fixed_path = csv_path.with_suffix(".csv.fixed.csv")
            path = fixed_path if fixed_path.exists() else csv_path
            name = csv_path.name.lower()
            try:
                with open(path, encoding="utf-8-sig", newline="") as f:
                    reader = csv.reader(f)
                    headers = next(reader, [])
                if headers and _has_edge_columns(headers):
                    edge_paths.append(path)
                elif headers and _has_node_columns(headers):
                    node_paths.append(path)
                elif "node" in name:
                    node_paths.append(path)
                elif any(x in name for x in ("edge", "relation", "link")):
                    edge_paths.append(path)
            except Exception as e:
                logger.warning("CSV header scan failed (%s): %s", path, e)

        for path in node_paths:
            try:
                self._load_nodes(path)
            except Exception as e:
                logger.warning("CSV node load failed (%s): %s", path, e)

        self._load_cross_system_nodes()
        self._build_alias_map()

        for path in edge_paths:
            try:
                self._load_edges(path)
            except Exception as e:
                logger.warning("CSV edge load failed (%s): %s", path, e)

        # Load rules JSONs
        if self.rules_dir.exists():
            for json_path in self.rules_dir.rglob("*.json"):
                key = json_path.stem
                try:
                    loaded = json.loads(json_path.read_text(encoding="utf-8"))
                    # Accept both dict and list; wrap list for uniformity
                    if isinstance(loaded, list):
                        loaded = {"items": loaded}
                    self.rules[key] = loaded
                except Exception as e:
                    logger.warning("Rule load failed (%s): %s", json_path.name, e)

        self._backfill_node_attributes()

        logger.info("Loaded %d nodes, %d edges", len(self.graph.nodes), len(self.graph.edges))
        if self.rules:
            logger.info("Rules: %s", ", ".join(sorted(self.rules.keys())))

    def _ensure_node(self, node_id: str, **attrs):
        existing = self.graph.nodes.get(node_id)
        if existing:
            merged = _merge_node_attrs(existing, attrs)
            self.graph.add_node(node_id, **merged)
        else:
            self.graph.add_node(node_id, **attrs)

    def _add_alias(self, key: Optional[str], node_id: str, priority: int):
        key = _normalize_value(key)
        if not key:
            return
        current = self._alias_priority.get(key)
        if current is None or priority < current:
            self.alias_map[key] = node_id
            self._alias_priority[key] = priority
        upper = key.upper()
        if upper != key:
            current_upper = self._alias_priority.get(upper)
            if current_upper is None or priority < current_upper:
                self.alias_map[upper] = node_id
                self._alias_priority[upper] = priority

    def _build_alias_map(self):
        self.alias_map.clear()
        self._alias_priority.clear()

        for node_id, attrs in self.graph.nodes(data=True):
            node_type = (attrs.get("type") or "").lower()
            priority = 1 if "detailed" in node_type else 2

            # Always add node_id alias (priority-based)
            self._add_alias(node_id, node_id, priority)

            # Common label/name aliases
            for field in ("label", "name", "korean_name"):
                self._add_alias(attrs.get(field), node_id, priority)

            # Planet aliases (prefer detailed nodes)
            if "planet" in node_type:
                planet = _normalize_value(attrs.get("planet")) or _normalize_value(attrs.get("name"))
                if planet:
                    self._add_alias(planet, node_id, priority)
                    self._add_alias(f"ASTRO_PLANET_{planet}", node_id, priority)
                    self._add_alias(f"AP_{planet.lower()}", node_id, priority)

            # Sign aliases
            if "sign" in node_type:
                sign = _normalize_value(attrs.get("sign")) or _normalize_value(attrs.get("name"))
                if sign:
                    self._add_alias(sign, node_id, priority)
                    self._add_alias(f"ASTRO_SIGN_{sign}", node_id, priority)
                    self._add_alias(f"AS_{sign.lower()}", node_id, priority)

            # House aliases
            if "house" in node_type:
                house_number = _normalize_value(attrs.get("house_number")) or _normalize_value(attrs.get("house"))
                if house_number:
                    self._add_alias(f"H{house_number}", node_id, priority)
                    self._add_alias(f"ASTRO_HOUSE_{house_number}", node_id, priority)
                    self._add_alias(f"AH_{house_number}", node_id, priority)

            # Element nodes
            if node_id.startswith("EL_"):
                element = node_id.split("_", 1)[-1]
                self._add_alias(f"SAJU_ELEMENT_{element}", node_id, priority)
                hanja = _normalize_value(attrs.get("hanja"))
                if hanja:
                    self._add_alias(f"SAJU_ELEMENT_{hanja}", node_id, priority)
            if node_id.startswith("ASTRO_ELEMENT_"):
                element = _normalize_value(attrs.get("element"))
                if element:
                    self._add_alias(f"ASTRO_ELEMENT_{element}", node_id, priority)

    def _load_cross_system_nodes(self):
        mapping_path = self.graph_dir / "cross_system_mapping.json"
        if not mapping_path.exists():
            return
        try:
            mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning("Cross-system mapping load failed: %s", e)
            return

        element_map = (mapping.get("element_correspondence") or {}).get("mappings") or {}
        key_to_ko = {"wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수"}
        key_to_hanja = {"wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水"}

        for key, payload in element_map.items():
            ko = key_to_ko.get(key)
            if not ko:
                continue
            hanja = key_to_hanja.get(key)
            saju = payload.get("saju") or {}
            astro = payload.get("astrology") or {}
            combined = payload.get("combined_interpretation") or ""

            saju_desc_parts = []
            keywords = saju.get("keywords") or []
            if keywords:
                saju_desc_parts.append("키워드: " + ", ".join(keywords))
            for label, field in (("계절", "season"), ("방향", "direction"), ("감정", "emotion"), ("장기", "organs")):
                val = saju.get(field)
                if val:
                    saju_desc_parts.append(f"{label}: {val}")
            if combined:
                saju_desc_parts.append(combined)

            saju_id = f"EL_{ko}"
            self._ensure_node(
                saju_id,
                label=f"{ko}(오행)",
                description=" | ".join(saju_desc_parts),
                type="saju_element",
                element=ko,
                hanja=hanja,
                system="saju",
            )

            astro_element = _normalize_value(astro.get("element"))
            if astro_element:
                astro_desc_parts = []
                if astro.get("reason"):
                    astro_desc_parts.append(astro.get("reason"))
                astro_keywords = astro.get("keywords") or []
                if astro_keywords:
                    astro_desc_parts.append("키워드: " + ", ".join(astro_keywords))

                astro_id = f"ASTRO_ELEMENT_{astro_element}"
                self._ensure_node(
                    astro_id,
                    label=f"{astro_element} Element",
                    description=" | ".join(astro_desc_parts),
                    type="astro_element",
                    element=astro_element,
                    system="astrology",
                )

                if not self.graph.has_edge(saju_id, astro_id):
                    edge_desc = combined or astro.get("reason") or ""
                    self.graph.add_edge(saju_id, astro_id, relation="element_correspondence", desc=edge_desc, weight="1")

    def _ensure_prefixed_node(self, node_id: str) -> Optional[str]:
        if "_" not in node_id:
            return None
        prefix, base = node_id.split("_", 1)
        if prefix not in _PREFIX_NODE_LABELS:
            return None
        if self.graph.has_node(node_id):
            return node_id

        base_norm = _normalize_edge_node_id(base)
        base_resolved = self.alias_map.get(base_norm) or self.alias_map.get(base_norm.upper())
        if not base_resolved:
            base_resolved = self.alias_map.get(base) or self.alias_map.get(base.upper())
        base_id = base_resolved if base_resolved else (base_norm if base_norm in self.graph else base)
        base_attrs = self.graph.nodes.get(base_id, {})
        base_label = _normalize_value(base_attrs.get("label")) or _normalize_value(base_attrs.get("name")) or base
        base_desc = _normalize_value(base_attrs.get("description")) or _normalize_value(base_attrs.get("desc"))

        prefix_label = _PREFIX_NODE_LABELS[prefix]
        if prefix in ("A", "B"):
            label = f"{prefix_label} {base_label}"
            desc = f"{prefix_label}의 {base_label}"
        else:
            label = f"{prefix_label} {base_label}"
            desc = base_desc or f"{prefix_label} {base_label}"

        self._ensure_node(
            node_id,
            label=label,
            description=desc,
            type="synthetic",
            system="astrology",
            base=base_label,
        )
        return node_id

    def _resolve_node_id(self, raw: Optional[str]) -> Optional[str]:
        value = _normalize_value(raw)
        if value is None:
            return None

        value = _normalize_edge_node_id(value)

        if value.startswith("SAJU_ELEMENT_"):
            raw_elem = value.split("_", 2)[-1]
            canonical = _canonical_saju_element(raw_elem)
            if canonical:
                node_id = f"EL_{canonical}"
                if not self.graph.has_node(node_id):
                    self._ensure_node(node_id, label=f"{canonical}(오행)", description=f"{canonical} 오행", type="saju_element")
                return node_id

        if value.startswith("EL_"):
            elem = value.split("_", 1)[-1]
            if not self.graph.has_node(value):
                self._ensure_node(value, label=f"{elem}(ì˜¤í–‰)", description=f"{elem} ì˜¤í–‰", type="saju_element")
            return value

        if value.startswith("ASTRO_ELEMENT_"):
            raw_elem = value.split("_", 2)[-1]
            canonical = _canonical_astro_element(raw_elem)
            if canonical:
                node_id = f"ASTRO_ELEMENT_{canonical}"
                if not self.graph.has_node(node_id):
                    self._ensure_node(node_id, label=f"{canonical} Element", description=f"{canonical} 원소", type="astro_element")
                return node_id

        resolved = self.alias_map.get(value) or self.alias_map.get(value.upper())
        if resolved:
            return resolved

        prefixed = self._ensure_prefixed_node(value)
        if prefixed:
            return prefixed

        return value

    def _load_nodes(self, path: Path):
        """Load nodes from CSV."""
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                node_id = _get_first_field(row, _NODE_ID_FIELDS)
                if node_id:
                    existing = self.graph.nodes.get(node_id)
                    if existing:
                        merged = _merge_node_attrs(existing, row)
                        self.graph.add_node(node_id, **merged)
                    else:
                        self.graph.add_node(node_id, **row)

    def _load_edges(self, path: Path):
        """Load edges from CSV."""
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                src = _get_first_field(row, _EDGE_SRC_FIELDS)
                dst = _get_first_field(row, _EDGE_DST_FIELDS)
                src = self._resolve_node_id(src)
                dst = self._resolve_node_id(dst)
                if not src or not dst:
                    continue
                rel = _get_first_field(row, _EDGE_REL_FIELDS) or "link"
                desc = _get_first_field(row, _EDGE_DESC_FIELDS) or ""
                weight = _normalize_value(row.get("weight")) or "1"
                self.graph.add_edge(src, dst, relation=rel, desc=desc, weight=weight)

    def _backfill_node_attributes(self):
        """Ensure nodes created via edges have minimal label text for embeddings."""
        for node_id, attrs in list(self.graph.nodes(data=True)):
            if attrs is None:
                attrs = {}
            label = _normalize_value(attrs.get("label")) or _normalize_value(attrs.get("name"))
            if label is None:
                self.graph.nodes[node_id]["label"] = str(node_id)
            desc = _normalize_value(attrs.get("desc")) or _normalize_value(attrs.get("description")) or _normalize_value(attrs.get("content"))
            if desc is None:
                # Keep short, use label or id as fallback to avoid empty embeddings
                fallback = label if label is not None else str(node_id)
                self.graph.nodes[node_id]["desc"] = fallback

    def _prepare_embeddings(self, use_cache: bool = True):
        """Prepare node embeddings with optional caching."""
        node_text_fields = ("label", "name", "desc", "element")
        texts = []
        ids = []
        for n, d in self.graph.nodes(data=True):
            text = " ".join(filter(None, (d.get(f) for f in node_text_fields))).strip()
            texts.append(text)
            ids.append(n)

        self.node_texts = texts
        self.node_ids = ids
        if not texts:
            self.node_embeds = None
            logger.warning("No node texts for embeddings")
            return

        # Try loading from cache
        if use_cache and self.cache_path.exists():
            try:
                cache = torch.load(self.cache_path, map_location="cpu")
                if cache.get("count") == len(texts):
                    self.node_embeds = cache["embeddings"]
                    logger.info("Loaded %d embeddings from cache", self.node_embeds.size(0))
                    return
                logger.info("Cache stale (count mismatch), regenerating...")
            except Exception as e:
                logger.warning("Cache load failed: %s", e)

        # Compute embeddings
        self.node_embeds = self.embed_model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        logger.info("Created %d node embeddings", self.node_embeds.size(0))

        # Save to cache
        if use_cache:
            try:
                torch.save({"embeddings": self.node_embeds, "count": len(texts)}, self.cache_path)
                logger.info("Saved embeddings to cache: %s", self.cache_path)
            except Exception as e:
                logger.warning("Cache save failed: %s", e)

    def query(self, facts: dict, top_k: int = 8, domain_priority: str = "saju") -> Dict:
        """Query graph with facts dict.

        USE_CHROMADB=1일 때 ChromaDB HNSW 검색 사용 (O(log n)).
        그 외에는 기존 PyTorch cosine sim 전체 스캔 (O(n)).

        Results are cached with TTL for performance.
        """
        # Check cache first
        cached = _query_cache.get(facts, top_k, domain_priority)
        if cached is not None:
            logger.debug("[GraphRAG] Cache HIT")
            return cached

        # Execute query
        start_time = time.time()
        facts_str = json.dumps(facts, ensure_ascii=False)

        if _USE_CHROMADB:
            result = self._query_chromadb(facts_str, top_k, domain_priority)
        else:
            result = self._query_legacy(facts_str, top_k, domain_priority)

        # Add timing info
        result["query_time_ms"] = round((time.time() - start_time) * 1000, 2)
        result["cache_hit"] = False

        # Cache result
        _query_cache.set(facts, top_k, domain_priority, result)
        logger.debug("[GraphRAG] Cache MISS, query took %.2fms", result["query_time_ms"])

        return result

    def get_cache_stats(self) -> Dict:
        """Return query cache statistics."""
        return _query_cache.stats()

    def clear_cache(self):
        """Clear the query cache."""
        _query_cache.clear()
        logger.info("[GraphRAG] Query cache cleared")

    def _query_chromadb(self, facts_str: str, top_k: int, domain_priority: str) -> Dict:
        """ChromaDB HNSW 인덱스 기반 검색 (O(log n)) + PageRank + CrossEncoder 재순위화."""
        try:
            from app.rag.vector_store import get_vector_store
            from app.rag.graph_algorithms import GraphAlgorithms
            from app.rag.reranker import CrossEncoderReranker, USE_RERANKER
            from app.rag.hyde import HyDEGenerator, USE_HYDE

            # Phase 7b: HyDE - 쿼리를 가상 답변으로 확장
            if USE_HYDE:
                try:
                    hyde = HyDEGenerator(use_llm=False)  # LLM 없이 키워드 확장
                    expanded_query = hyde.generate_hypothesis(facts_str, domain=domain_priority)
                    query_for_embedding = expanded_query
                    logger.info("[GraphRAG] HyDE 활성화: %s...", expanded_query[:100])
                except Exception as e:
                    logger.warning("[GraphRAG] HyDE 실패, 원본 쿼리 사용: %s", e)
                    query_for_embedding = facts_str
            else:
                query_for_embedding = facts_str

            query_emb = self.embed_model.encode(
                query_for_embedding,
                convert_to_tensor=False,
                normalize_embeddings=True,
            ).tolist()

            vs = get_vector_store()
            if not vs.has_data():
                logger.warning("[GraphRAG] ChromaDB에 데이터 없음, legacy fallback")
                return self._query_legacy(facts_str, top_k, domain_priority)

            # 더 많이 검색 (재순위화를 위해)
            initial_k = top_k * 3 if USE_RERANKER else top_k * 2
            results = vs.search(
                query_embedding=query_emb,
                top_k=initial_k,
                min_score=0.1,
            )

            matched_nodes = [r["text"] for r in results]
            matched_ids = [r["metadata"].get("original_id", r["id"]) for r in results]
            matched_score = [r["score"] for r in results]

            # Phase 2: PageRank 기반 재순위화
            graph_algo = GraphAlgorithms(self.graph)
            pagerank_scores = graph_algo.pagerank

            # Personalized PageRank 계산 (검색된 노드 기반)
            valid_seed_nodes = [nid for nid in matched_ids if self.graph.has_node(nid)]
            if valid_seed_nodes:
                ppr_scores = graph_algo.personalized_pagerank(valid_seed_nodes[:5])
            else:
                ppr_scores = pagerank_scores

            # 벡터 유사도 + PageRank 결합 스코어
            combined_results = []
            for i, node_id in enumerate(matched_ids):
                vector_score = matched_score[i]
                pr_score = ppr_scores.get(node_id, 0.0)

                # 결합 점수: 벡터 유사도(70%) + PPR(30%)
                combined_score = vector_score * 0.7 + pr_score * 100 * 0.3

                combined_results.append({
                    "id": node_id,
                    "text": matched_nodes[i],
                    "vector_score": vector_score,
                    "pagerank": pr_score,
                    "combined_score": combined_score,
                })

            # 결합 스코어로 재정렬
            combined_results.sort(key=lambda x: x["combined_score"], reverse=True)

            # Phase 7a: CrossEncoder Re-ranking (최종 정밀 선택)
            if USE_RERANKER:
                try:
                    reranker = CrossEncoderReranker(model_key="multilingual", max_candidates=top_k * 2)
                    # 원본 쿼리로 재순위화 (HyDE 확장 쿼리가 아닌)
                    reranked_results = reranker.rerank_results(
                        query=facts_str,
                        results=combined_results[:top_k * 2],  # 상위 2배 후보만
                        text_key="text",
                        top_k=top_k,
                    )
                    top_results = reranked_results
                    logger.info("[GraphRAG] CrossEncoder 재순위화 완료: %d → %d", len(combined_results), len(top_results))
                except Exception as e:
                    logger.warning("[GraphRAG] CrossEncoder 재순위화 실패, PageRank 결과 사용: %s", e)
                    top_results = combined_results[:top_k]
            else:
                top_results = combined_results[:top_k]

            # 최종 결과 추출
            matched_nodes = [r["text"] for r in top_results]
            matched_ids = [r["id"] for r in top_results]
            matched_score = [r.get("score", r.get("combined_score", 0)) for r in top_results]

            # 그래프 관계 탐색 (기존 NetworkX 활용)
            edges = [
                {"src": u, "dst": v, "rel": d.get("relation"), "desc": d.get("desc", "")}
                for u, v, d in self.graph.edges(data=True)
                if u in matched_ids or v in matched_ids
            ]

            rule_summary = self._apply_rules(domain_priority, facts_str) if domain_priority in self.rules else None

            context_lines = [
                f"{matched_ids[i]} | {matched_nodes[i]} (score: {matched_score[i]:.3f})"
                for i in range(len(matched_nodes))
            ]
            edge_lines = [f"{e['src']}->{e['dst']}({e['rel']})" for e in edges[:30]]
            context_text = "\n".join(context_lines + edge_lines)

            # Phase 7 정보 추가
            backend_info = "chromadb"
            if USE_RERANKER:
                backend_info += "+reranker"
            if USE_HYDE:
                backend_info += "+hyde"

            return {
                "matched_nodes": matched_nodes,
                "matched_ids": matched_ids,
                "related_edges": edges,
                "rule_summary": rule_summary,
                "context_text": context_text,
                "stats": {
                    "nodes": len(matched_nodes),
                    "edges": len(edges),
                    "backend": backend_info,
                    "phases": "1,2,7" if (USE_RERANKER or USE_HYDE) else "1,2",
                },
            }

        except ImportError:
            logger.warning("[GraphRAG] chromadb 미설치, legacy fallback")
            return self._query_legacy(facts_str, top_k, domain_priority)
        except Exception as e:
            logger.warning("[GraphRAG] ChromaDB 검색 실패: %s, legacy fallback", e)
            return self._query_legacy(facts_str, top_k, domain_priority)

    def _query_legacy(self, facts_str: str, top_k: int, domain_priority: str) -> Dict:
        """기존 PyTorch cosine similarity 전체 스캔 (O(n))."""
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
            "stats": {"nodes": len(matched_nodes), "edges": len(edges), "backend": "legacy"},
        }

    def _apply_rules(self, domain: str, facts_str: str) -> Optional[List[str]]:
        """Apply rules from JSON based on keyword matching."""
        rulebook = self.rules.get(domain)
        if not rulebook:
            return None

        facts_lower = facts_str.lower()
        descs = []

        for key, rule in rulebook.items():
            if isinstance(rule, dict):
                cond = rule.get("when")
                msg = rule.get("text")
                if not msg:
                    continue

                # Handle different condition formats
                if isinstance(cond, list):
                    # Check if ALL conditions in the list are in facts_str
                    if all(str(c).lower() in facts_lower for c in cond):
                        descs.append(msg)
                elif isinstance(cond, str):
                    if cond.lower() in facts_lower:
                        descs.append(msg)
                elif cond is None:
                    # No condition = always apply
                    descs.append(msg)

            elif isinstance(rule, str):
                if key.lower() in facts_lower:
                    descs.append(rule)

        return descs[:5] if descs else None


# ===============================================================
# SIMPLE EMBEDDING SEARCH (Function-based)
# ===============================================================
_NODES_CACHE: Optional[List[Dict]] = None
_TEXTS_CACHE: Optional[List[str]] = None
_CORPUS_EMBEDS_CACHE = None
_CORPUS_EMBEDS_PATH: Optional[Path] = None
_GRAPH_MTIME: Optional[float] = None


def _latest_mtime(folder: Path) -> float:
    """Get latest modification time of files in folder."""
    latest = 0.0
    for f in folder.rglob("*"):
        if f.is_file():
            try:
                ts = f.stat().st_mtime
                if ts > latest:
                    latest = ts
            except OSError:
                continue
    return latest


def _load_graph_nodes(graph_root: Path) -> List[Dict]:
    """Load all nodes from CSV and JSON files."""
    all_nodes: List[Dict] = []

    # Explicitly load interpretation folders
    interpretation_folders = [
        graph_root / "astro_database" / "interpretations",
        graph_root / "saju" / "interpretations",
    ]
    for interp_folder in interpretation_folders:
        if interp_folder.is_dir():
            _load_from_folder(interp_folder, all_nodes, "interpretation")

    for sub in _GRAPH_TARGET_FOLDERS:
        if sub == "rules":
            rules_path = graph_root / sub
            if rules_path.is_dir():
                for subdir in rules_path.iterdir():
                    if subdir.is_dir():
                        _load_from_folder(subdir, all_nodes, subdir.name)
            continue

        folder = graph_root / sub
        if folder.is_dir():
            _load_from_folder(folder, all_nodes, sub)

    # Load corpus folder (Jung quotes, Stoic philosophy, etc.)
    corpus_root = graph_root.parent / "corpus"
    if corpus_root.is_dir():
        for corpus_sub in corpus_root.iterdir():
            if corpus_sub.is_dir():
                _load_from_folder(corpus_sub, all_nodes, f"corpus_{corpus_sub.name}")
                logger.info(f"Loaded corpus: {corpus_sub.name}")

    logger.info("Loaded %d nodes", len(all_nodes))
    return all_nodes


def _extract_astro_interp_fields(item: Dict, desc_parts: List[str]) -> None:
    """Extract astrology interpretation fields from an item."""
    # Core interpretation (priority)
    core = item.get("core_interpretation", "")
    if core:
        desc_parts.append(core)

    # Personality/strengths/challenges (astro planet-sign)
    for field in ("personality", "strengths", "challenges", "life_advice",
                  "career_hints", "relationship_style"):
        val = item.get(field, "")
        if val and isinstance(val, str) and len(val) > 10:
            desc_parts.append(f"{field}: {val[:150]}")

    # Aspect interpretation fields
    for field in ("positive_expression", "challenging_expression", "integration_advice"):
        val = item.get(field, "")
        if val and isinstance(val, str):
            desc_parts.append(f"{field}: {val}")

    # Ascendant fields
    for field in ("first_impression", "approach_to_life", "physical_appearance", "life_path"):
        val = item.get(field, "")
        if val and isinstance(val, str):
            desc_parts.append(f"{field}: {val}")

    # Transit fields
    for field in ("theme", "duration"):
        val = item.get(field, "")
        if val:
            desc_parts.append(f"{field}: {val}")


def _get_astro_node_type(item: Dict) -> str:
    """Determine the node type based on item content."""
    if "sign" in item and "planet" in item and "house" not in item:
        return "astro_planet_sign"
    if "house" in item and "planet" in item:
        return "astro_planet_house"
    if "aspect" in item:
        return "astro_aspect"
    if "first_impression" in item:
        return "astro_ascendant"
    if "transit_planet" in item:
        return "astro_transit"
    return "astro_interpretation"


def _extract_ko_context(item: Dict) -> str:
    """Extract Korean context from planet/sign/house/aspect info."""
    context_parts = []
    for key in ("planet", "sign", "house", "aspect"):
        info = item.get(key, {})
        if isinstance(info, dict) and info.get("ko"):
            context_parts.append(info["ko"])
    return " ".join(context_parts)


def _load_csv_nodes(path: Path, all_nodes: List[Dict], source: str) -> None:
    """Load nodes from a CSV file."""
    try:
        with open(path, newline="", encoding="utf-8-sig") as fr:
            for row in csv.DictReader(fr):
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
        logger.warning("CSV error: %s | %s", path, e)


def _process_interpretations_array(v: list, k: str, source: str, nodes: List[Dict]) -> None:
    """Process 'interpretations' array (new astro corpus format)."""
    for item in v:
        if not isinstance(item, dict):
            continue
        item_id = item.get("id", "")
        desc_parts: List[str] = []

        # Add Korean context
        context = _extract_ko_context(item)
        if context:
            desc_parts.append(context)

        _extract_astro_interp_fields(item, desc_parts)

        if desc_parts:
            nodes.append({
                "label": item_id or k,
                "description": " | ".join(desc_parts[:6]),
                "type": _get_astro_node_type(item),
                "source": source,
                "raw": item,
            })


def _process_legacy_interp_array(v: list, k: str, source: str, nodes: List[Dict]) -> None:
    """Process legacy interpretation arrays."""
    for item in v:
        if not isinstance(item, dict):
            continue
        item_id = item.get("id", "")
        interp = item.get("detailed_interpretation", {})
        if isinstance(interp, dict):
            interp_text = interp.get("ko", "") or interp.get("en", "")
        else:
            interp_text = str(interp) if interp else ""

        core_theme = item.get("core_theme", "")
        advice = item.get("advice", "")
        keywords = " ".join(item.get("keywords", []))

        desc_parts = [p for p in (core_theme, interp_text[:300], advice, keywords) if p]
        if desc_parts:
            nodes.append({
                "label": item_id or k,
                "description": " | ".join(desc_parts),
                "type": "interpretation_entry",
                "source": source,
                "raw": item,
            })


def _process_analysis_dict(v: dict, k: str, source: str, nodes: List[Dict]) -> None:
    """Process sipsung_detailed style (quantity_analysis, position_analysis)."""
    for ss_name, ss_data in v.items():
        if not isinstance(ss_data, dict):
            continue
        for level, level_data in ss_data.items():
            if isinstance(level_data, dict):
                desc_parts = [
                    f"{field}: {level_data[field]}"
                    for field in _SAJU_INTERP_FIELDS
                    if level_data.get(field)
                ]
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


def _process_jiji_relations(v: dict, k: str, source: str, nodes: List[Dict]) -> None:
    """Process jiji relations (yukchung, yukhab, samhab, etc.)."""
    for rel_name, rel_data in v.items():
        if not isinstance(rel_data, dict):
            continue
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


def _process_ohaeng(v: dict, k: str, source: str, nodes: List[Dict]) -> None:
    """Process ohaeng individual/balance."""
    for oh_name, oh_data in v.items():
        if not isinstance(oh_data, dict):
            continue
        desc_parts = []
        for field in _OHAENG_FIELDS:
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


def _process_astro_nested_dict(v: dict, k: str, source: str, nodes: List[Dict]) -> None:
    """Process astro-style nested JSON (planet_in_sign, etc.)."""
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
        return

    # Extract direct fields
    desc_parts = [str(v[field]) for field in _ASTRO_CORE_FIELDS + _ASTRO_SYNTHESIS_FIELDS if v.get(field)]

    # Handle nested dicts (synastry aspects, synthesis files, etc.)
    if not desc_parts:
        for sub_k, sub_v in v.items():
            if isinstance(sub_v, dict):
                for field in _ASTRO_SYNTHESIS_FIELDS:
                    if sub_v.get(field):
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


def _process_saju_literary_list(v: list, k: str, source: str, nodes: List[Dict]) -> None:
    """Process saju_literary style: {"ten_gods": [...], "five_elements": [...]}."""
    for item in v:
        if not isinstance(item, dict):
            continue
        desc_parts = [str(item[field]) for field in _SAJU_LITERARY_FIELDS if item.get(field)]
        if desc_parts:
            label = item.get("name") or item.get("id") or item.get("label") or k
            if item.get("hanja"):
                label = f"{label}({item['hanja']})"
            nodes.append({
                "label": label,
                "description": " | ".join(desc_parts[:6]),
                "type": "saju_literary",
                "source": source,
                "raw": item,
            })


def _load_json_nodes(path: Path, all_nodes: List[Dict], source: str) -> None:
    """Load nodes from a JSON file."""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))

        if isinstance(data, list):
            nodes = data
        elif isinstance(data, dict) and "nodes" in data:
            nodes = data["nodes"]
        elif isinstance(data, dict):
            nodes = []

            # Try to process as tarot data first
            if _process_tarot_data(data, source, nodes):
                # Tarot data processed, add to all_nodes and return
                for node in nodes:
                    if isinstance(node, dict) and node.get("description"):
                        node.setdefault("source", source)
                        all_nodes.append(node)
                return

            # Handle quotes format (Jung psychology, Stoic philosophy)
            if "quotes" in data and isinstance(data["quotes"], list):
                # Support both Jung (concept) and Stoic (philosopher) formats
                concept = data.get("concept", "") or data.get("philosopher", "")
                concept_kr = data.get("concept_kr", "") or data.get("philosopher_kr", "")
                main_work = data.get("main_work", "")
                description = data.get("description", "")

                for quote in data["quotes"]:
                    if isinstance(quote, dict):
                        en_text = quote.get("en", "")
                        kr_text = quote.get("kr", "")
                        quote_source = quote.get("source", main_work or "")
                        tags = quote.get("tags", [])
                        context = quote.get("context", "")

                        # Prefer Korean, fallback to English
                        desc = kr_text or en_text
                        if desc:
                            # Build rich description
                            desc_parts = [f"{concept_kr or concept}: {desc}"]
                            if context:
                                desc_parts.append(f"맥락: {context}")
                            if quote_source:
                                desc_parts.append(f"출처: {quote_source}")
                            if tags:
                                desc_parts.append(f"태그: {', '.join(tags[:5])}")

                            nodes.append({
                                "label": f"{concept}_{quote.get('id', '')}",
                                "description": " | ".join(desc_parts),
                                "type": "quote",
                                "source": source,
                                "tags": tags,
                                "philosopher": concept,
                                "philosopher_kr": concept_kr,
                                "raw": quote,
                            })

                # Add to all_nodes and return
                for node in nodes:
                    if isinstance(node, dict) and node.get("description"):
                        node.setdefault("source", source)
                        all_nodes.append(node)
                return

            for k, v in data.items():
                if k.startswith("$") or k == "meta":
                    continue

                # Handle "interpretations" array (new astro corpus format)
                if k == "interpretations" and isinstance(v, list) and v:
                    _process_interpretations_array(v, k, source, nodes)
                    continue

                # Handle other interpretation arrays (legacy format)
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    _process_legacy_interp_array(v, k, source, nodes)
                    continue

                # Handle sipsung_detailed style
                if k in ("quantity_analysis", "position_analysis", "balance_analysis") and isinstance(v, dict):
                    _process_analysis_dict(v, k, source, nodes)
                    continue

                # Handle combination_analysis
                if k == "combination_analysis" and isinstance(v, list):
                    for combo in v:
                        if isinstance(combo, dict) and combo.get("interpretation"):
                            nodes.append({
                                "label": combo.get("pattern", "조합"),
                                "description": f"{combo.get('condition', '')} | {combo['interpretation']} | {combo.get('advice', '')}",
                                "type": "saju_combination",
                                "source": source,
                                "raw": combo,
                            })
                    continue

                # Handle jiji_relations
                if k in _JIJI_RELATION_TYPES and isinstance(v, dict):
                    _process_jiji_relations(v, k, source, nodes)
                    continue

                # Handle ohaeng individual/balance
                if k in ("individual", "balance") and isinstance(v, dict):
                    _process_ohaeng(v, k, source, nodes)
                    continue

                # Original parsing logic
                if isinstance(v, str):
                    nodes.append({"label": k, "description": v, "type": "json_rule"})
                elif isinstance(v, dict):
                    _process_astro_nested_dict(v, k, source, nodes)
                elif isinstance(v, list):
                    _process_saju_literary_list(v, k, source, nodes)
        else:
            nodes = [data]

        for node in nodes:
            if isinstance(node, dict) and node.get("description"):
                node.setdefault("source", source)
                all_nodes.append(node)
    except Exception as e:
        logger.warning("JSON error: %s | %s", path, e)


def _process_tarot_card(item: Dict, source: str, nodes: List[Dict]) -> None:
    """Process a single tarot card entry."""
    card_name = item.get("name", "")
    if isinstance(card_name, dict):
        card_name = card_name.get("ko", "") or card_name.get("en", "")

    # Process upright interpretation
    upright = item.get("upright", {})
    if isinstance(upright, dict):
        desc_parts = [f"타로 {card_name} 정방향"]
        for field in ("general", "love", "career", "finance", "health", "meaning", "advice"):
            val = upright.get(field, "")
            if val and isinstance(val, str):
                desc_parts.append(f"{field}: {val[:200]}")
        keywords = item.get("keywords", [])
        if keywords:
            desc_parts.append(f"키워드: {', '.join(keywords[:5])}")
        if len(desc_parts) > 1:
            nodes.append({
                "label": f"tarot_{card_name}_upright",
                "description": " | ".join(desc_parts[:6]),
                "type": "tarot_card",
                "source": source,
                "orientation": "upright",
                "raw": item,
            })

    # Process reversed interpretation
    reversed_data = item.get("reversed", {})
    if isinstance(reversed_data, dict):
        desc_parts = [f"타로 {card_name} 역방향"]
        for field in ("general", "love", "career", "finance", "health", "meaning", "advice"):
            val = reversed_data.get(field, "")
            if val and isinstance(val, str):
                desc_parts.append(f"{field}: {val[:200]}")
        if len(desc_parts) > 1:
            nodes.append({
                "label": f"tarot_{card_name}_reversed",
                "description": " | ".join(desc_parts[:6]),
                "type": "tarot_card",
                "source": source,
                "orientation": "reversed",
                "raw": item,
            })


def _process_tarot_data(data: Dict, source: str, nodes: List[Dict]) -> bool:
    """Process tarot-specific data structures. Returns True if processed."""
    processed = False

    # Handle major_arcana / minor_arcana arrays
    for arcana_key in ("major_arcana", "minor_arcana"):
        arcana_list = data.get(arcana_key, [])
        if isinstance(arcana_list, list):
            for card in arcana_list:
                if isinstance(card, dict):
                    _process_tarot_card(card, source, nodes)
                    processed = True

    # Handle cards array (generic)
    cards_list = data.get("cards", [])
    if isinstance(cards_list, list):
        for card in cards_list:
            if isinstance(card, dict) and ("upright" in card or "reversed" in card):
                _process_tarot_card(card, source, nodes)
                processed = True

    # Handle card combinations
    combinations = data.get("combinations", [])
    if isinstance(combinations, list):
        for combo in combinations:
            if isinstance(combo, dict):
                card1 = combo.get("card1", "")
                card2 = combo.get("card2", "")
                meaning = combo.get("meaning", "") or combo.get("love", "") or combo.get("career", "")
                if meaning:
                    nodes.append({
                        "label": f"tarot_combo_{card1}_{card2}",
                        "description": f"타로 조합 {card1} + {card2}: {meaning[:300]}",
                        "type": "tarot_combination",
                        "source": source,
                        "raw": combo,
                    })
                    processed = True

    # Handle spreads
    for spread_key in ("spreads", "positions"):
        spreads = data.get(spread_key, [])
        if isinstance(spreads, list):
            for spread in spreads:
                if isinstance(spread, dict):
                    name = spread.get("name", "") or spread.get("spread_name", "")
                    desc = spread.get("description", "") or spread.get("meaning", "")
                    if name and desc:
                        nodes.append({
                            "label": f"tarot_spread_{name}",
                            "description": f"타로 스프레드 {name}: {desc[:300]}",
                            "type": "tarot_spread",
                            "source": source,
                            "raw": spread,
                        })
                        processed = True

    return processed


def _load_from_folder(folder: Path, all_nodes: List[Dict], source: str):
    """Load nodes from a specific folder."""
    for path in folder.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix == ".csv":
            _load_csv_nodes(path, all_nodes, source)
        elif path.suffix == ".json":
            _load_json_nodes(path, all_nodes, source)


def _handle_embed_mismatch(texts: List[str], nodes: List[Dict], embeds) -> tuple:
    """Handle embedding size mismatch by trimming or rebuilding."""
    if not hasattr(embeds, "shape") or embeds.shape[0] == len(texts):
        return texts, nodes, embeds

    strategy = os.getenv("RAG_EMBED_MISMATCH", "trim").lower()
    if strategy == "rebuild":
        logger.warning("Cached embeddings size mismatch; rebuilding cache")
        return texts, nodes, None

    min_len = min(len(texts), embeds.shape[0])
    logger.warning("Cached embeddings size mismatch; trimming cache")
    return texts[:min_len], nodes[:min_len], embeds[:min_len]


def search_graphs(query: str, top_k: int = 6, graph_root: Optional[str] = None) -> List[Dict]:
    """
    Simple embedding-based search in graph data.

    USE_CHROMADB=1일 때 ChromaDB corpus_nodes 컬렉션에서 검색.
    그 외에는 기존 PyTorch cosine sim 전체 스캔.

    Args:
        query: Natural language search query
        top_k: Number of results to return
        graph_root: Path to graph data (default: backend_ai/data/graph)

    Returns:
        List of matching nodes with scores
    """
    if _USE_CHROMADB:
        return _search_graphs_chromadb(query, top_k)

    return _search_graphs_legacy(query, top_k, graph_root)


def _search_graphs_chromadb(query: str, top_k: int = 6) -> List[Dict]:
    """ChromaDB corpus_nodes 컬렉션에서 ANN 검색."""
    try:
        from app.rag.vector_store import VectorStoreManager

        vs = VectorStoreManager(collection_name="corpus_nodes")
        if not vs.has_data():
            logger.warning("[search_graphs] ChromaDB corpus_nodes 비어있음, legacy fallback")
            return _search_graphs_legacy(query, top_k)

        q_emb = embed_text(query)
        q_list = q_emb.cpu().numpy().tolist()

        results = vs.search(
            query_embedding=q_list,
            top_k=top_k,
            min_score=0.1,
        )

        output = []
        for r in results:
            node = {
                "description": r["text"],
                "score": r["score"],
                "source": r["metadata"].get("source", ""),
                "type": r["metadata"].get("type", ""),
                "label": r["metadata"].get("label", ""),
            }
            output.append(node)

        return output

    except ImportError:
        logger.warning("[search_graphs] chromadb 미설치, legacy fallback")
        return _search_graphs_legacy(query, top_k)
    except Exception as e:
        logger.warning("[search_graphs] ChromaDB 검색 실패: %s, legacy fallback", e)
        return _search_graphs_legacy(query, top_k)


def _search_graphs_legacy(query: str, top_k: int = 6, graph_root: Optional[str] = None) -> List[Dict]:
    """기존 search_graphs 구현 (PyTorch cosine sim 전체 스캔)."""
    global _NODES_CACHE, _TEXTS_CACHE, _CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH, _GRAPH_MTIME

    graph_path = Path(graph_root) if graph_root else Path(__file__).parent.parent / "data" / "graph"

    current_mtime = _latest_mtime(graph_path)
    graph_changed = _GRAPH_MTIME is None or current_mtime > (_GRAPH_MTIME or 0)

    if _NODES_CACHE is None or graph_changed:
        _NODES_CACHE = _load_graph_nodes(graph_path)
        _TEXTS_CACHE = [n["description"] for n in _NODES_CACHE if n.get("description")]
        _CORPUS_EMBEDS_PATH = graph_path / _CORPUS_CACHE_FILE
        _CORPUS_EMBEDS_CACHE = None
        _GRAPH_MTIME = current_mtime

    if not _NODES_CACHE or not _TEXTS_CACHE:
        return []

    q_emb = embed_text(query)
    nodes = _NODES_CACHE
    texts = _TEXTS_CACHE

    if _CORPUS_EMBEDS_CACHE is None:
        if _CORPUS_EMBEDS_PATH and _CORPUS_EMBEDS_PATH.exists():
            try:
                _CORPUS_EMBEDS_CACHE = torch.load(_CORPUS_EMBEDS_PATH, map_location="cpu")
                texts, nodes, _CORPUS_EMBEDS_CACHE = _handle_embed_mismatch(texts, nodes, _CORPUS_EMBEDS_CACHE)
            except Exception as e:
                logger.warning("Failed to load embeddings cache: %s", e)
                _CORPUS_EMBEDS_CACHE = None

        if _CORPUS_EMBEDS_CACHE is None:
            _CORPUS_EMBEDS_CACHE = embed_batch(texts, batch_size=_DEFAULT_BATCH_SIZE)
            try:
                if _CORPUS_EMBEDS_PATH:
                    torch.save(_CORPUS_EMBEDS_CACHE, _CORPUS_EMBEDS_PATH)
            except Exception as e:
                logger.warning("Failed to save embeddings: %s", e)

    texts, nodes, _CORPUS_EMBEDS_CACHE = _handle_embed_mismatch(texts, nodes, _CORPUS_EMBEDS_CACHE)

    scores = util.cos_sim(q_emb, _CORPUS_EMBEDS_CACHE)[0]
    best_indices = torch.topk(scores, k=min(top_k, len(texts)))

    results = []
    for idx, score in zip(best_indices.indices, best_indices.values):
        node = dict(nodes[int(idx)])
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
