# backend_ai/app/agentic_rag/entity_extractor.py
"""
Entity Extraction (NER) for Astrology/Saju domain.
Extracts entities like planets, signs, houses, elements from user queries.
"""

import re
from typing import Dict, List, Tuple
from dataclasses import dataclass, field
from enum import Enum


class EntityType(Enum):
    """Supported entity types for astrology/saju domain."""
    PLANET = "planet"
    SIGN = "sign"
    HOUSE = "house"
    ASPECT = "aspect"
    ELEMENT = "element"
    STEM = "stem"          # Saju 천간
    BRANCH = "branch"      # Saju 지지
    TEN_GOD = "ten_god"    # Saju 십신
    SHINSAL = "shinsal"    # Saju 신살
    TRANSIT = "transit"
    TAROT = "tarot"
    HEXAGRAM = "hexagram"


@dataclass
class Entity:
    """Extracted entity with metadata."""
    text: str
    type: EntityType
    normalized: str
    confidence: float = 1.0
    metadata: Dict = field(default_factory=dict)


class EntityExtractor:
    """
    NER-based Entity Extractor for Astrology/Saju domain.

    Extracts entities like planets, signs, houses, elements from user queries
    for dynamic graph building and precise retrieval.
    """

    def __init__(self):
        self._init_patterns()

    def _init_patterns(self):
        """Initialize entity recognition patterns."""

        # Planets (Western Astrology)
        self.planets = {
            # English
            "sun": "Sun", "moon": "Moon", "mercury": "Mercury", "venus": "Venus",
            "mars": "Mars", "jupiter": "Jupiter", "saturn": "Saturn",
            "uranus": "Uranus", "neptune": "Neptune", "pluto": "Pluto",
            "chiron": "Chiron", "lilith": "Lilith", "north node": "North_Node",
            "south node": "South_Node", "ascendant": "Ascendant", "asc": "Ascendant",
            "midheaven": "Midheaven", "mc": "Midheaven",
            # Korean
            "태양": "Sun", "달": "Moon", "수성": "Mercury", "금성": "Venus",
            "화성": "Mars", "목성": "Jupiter", "토성": "Saturn",
            "천왕성": "Uranus", "해왕성": "Neptune", "명왕성": "Pluto",
            "키론": "Chiron", "릴리스": "Lilith", "북쪽노드": "North_Node",
            "남쪽노드": "South_Node", "어센던트": "Ascendant", "상승점": "Ascendant",
            "미드헤븐": "Midheaven", "천정": "Midheaven",
        }

        # Signs (Western Astrology)
        self.signs = {
            # English
            "aries": "Aries", "taurus": "Taurus", "gemini": "Gemini",
            "cancer": "Cancer", "leo": "Leo", "virgo": "Virgo",
            "libra": "Libra", "scorpio": "Scorpio", "sagittarius": "Sagittarius",
            "capricorn": "Capricorn", "aquarius": "Aquarius", "pisces": "Pisces",
            # Korean
            "양자리": "Aries", "황소자리": "Taurus", "쌍둥이자리": "Gemini",
            "게자리": "Cancer", "사자자리": "Leo", "처녀자리": "Virgo",
            "천칭자리": "Libra", "전갈자리": "Scorpio", "사수자리": "Sagittarius",
            "염소자리": "Capricorn", "물병자리": "Aquarius", "물고기자리": "Pisces",
            "백양궁": "Aries", "금우궁": "Taurus", "쌍자궁": "Gemini",
            "거해궁": "Cancer", "사자궁": "Leo", "처녀궁": "Virgo",
            "천칭궁": "Libra", "천갈궁": "Scorpio", "인마궁": "Sagittarius",
            "마갈궁": "Capricorn", "보병궁": "Aquarius", "쌍어궁": "Pisces",
        }

        # Houses
        self.houses = {
            **{f"{i}house": f"H{i}" for i in range(1, 13)},
            **{f"{i}st house": f"H{i}" for i in [1]},
            **{f"{i}nd house": f"H{i}" for i in [2]},
            **{f"{i}rd house": f"H{i}" for i in [3]},
            **{f"{i}th house": f"H{i}" for i in range(4, 13)},
            **{f"{i}하우스": f"H{i}" for i in range(1, 13)},
            **{f"{i}궁": f"H{i}" for i in range(1, 13)},
            "first house": "H1", "second house": "H2", "third house": "H3",
            "fourth house": "H4", "fifth house": "H5", "sixth house": "H6",
            "seventh house": "H7", "eighth house": "H8", "ninth house": "H9",
            "tenth house": "H10", "eleventh house": "H11", "twelfth house": "H12",
        }

        # Aspects
        self.aspects = {
            "conjunction": "Conjunction", "합": "Conjunction", "컨정션": "Conjunction",
            "opposition": "Opposition", "충": "Opposition", "오포지션": "Opposition",
            "trine": "Trine", "삼합": "Trine", "트라인": "Trine",
            "square": "Square", "형": "Square", "스퀘어": "Square",
            "sextile": "Sextile", "육합": "Sextile", "섹스타일": "Sextile",
            "quincunx": "Quincunx", "인컨정트": "Quincunx",
        }

        # Elements
        self.elements = {
            # Western
            "fire": "Fire", "earth": "Earth", "air": "Air", "water": "Water",
            "불": "Fire", "흙": "Earth", "바람": "Air", "공기": "Air", "물": "Water",
            # Eastern (Saju)
            "wood": "Wood", "목": "Wood", "나무": "Wood",
            "화": "Fire", "금": "Metal", "metal": "Metal", "쇠": "Metal",
            "토": "Earth", "수": "Water",
        }

        # Saju 천간 (Heavenly Stems)
        self.stems = {
            "갑": "Gab", "을": "Eul", "병": "Byeong", "정": "Jeong", "무": "Mu",
            "기": "Gi", "경": "Gyeong", "신": "Sin", "임": "Im", "계": "Gye",
            "甲": "Gab", "乙": "Eul", "丙": "Byeong", "丁": "Jeong", "戊": "Mu",
            "己": "Gi", "庚": "Gyeong", "辛": "Sin", "壬": "Im", "癸": "Gye",
        }

        # Saju 지지 (Earthly Branches)
        self.branches = {
            "자": "Ja", "축": "Chuk", "인": "In", "묘": "Myo",
            "진": "Jin", "사": "Sa", "오": "O", "미": "Mi",
            "신": "Shin", "유": "Yu", "술": "Sul", "해": "Hae",
            "子": "Ja", "丑": "Chuk", "寅": "In", "卯": "Myo",
            "辰": "Jin", "巳": "Sa", "午": "O", "未": "Mi",
            "申": "Shin", "酉": "Yu", "戌": "Sul", "亥": "Hae",
            "쥐": "Ja", "소": "Chuk", "호랑이": "In", "토끼": "Myo",
            "용": "Jin", "뱀": "Sa", "말": "O", "양": "Mi",
            "원숭이": "Shin", "닭": "Yu", "개": "Sul", "돼지": "Hae",
        }

        # Saju 십신 (Ten Gods)
        self.ten_gods = {
            "비견": "Bigyeon", "겁재": "Geopjae", "식신": "Siksin", "상관": "Sanggwan",
            "편재": "Pyeonjae", "정재": "Jeongjae", "편관": "Pyeongwan", "정관": "Jeonggwan",
            "편인": "Pyeonin", "정인": "Jeongin",
            "比肩": "Bigyeon", "劫財": "Geopjae", "食神": "Siksin", "傷官": "Sanggwan",
            "偏財": "Pyeonjae", "正財": "Jeongjae", "偏官": "Pyeongwan", "正官": "Jeonggwan",
            "偏印": "Pyeonin", "正印": "Jeongin",
        }

        # 신살 (Shinsal)
        self.shinsals = {
            "역마": "Yeokma", "도화": "Dohwa", "화개": "Hwagae", "귀문": "Gwimun",
            "천을귀인": "Cheonelgwiin", "문창귀인": "Munchanggwiin", "학당귀인": "Hakdanggwiin",
            "양인": "Yangin", "백호": "Baekho", "괴강": "Goegang",
            "驛馬": "Yeokma", "桃花": "Dohwa", "華蓋": "Hwagae",
        }

        # Tarot
        self.tarots = {
            "fool": "The_Fool", "magician": "The_Magician", "high priestess": "High_Priestess",
            "empress": "The_Empress", "emperor": "The_Emperor", "hierophant": "Hierophant",
            "lovers": "The_Lovers", "chariot": "The_Chariot", "strength": "Strength",
            "hermit": "The_Hermit", "wheel": "Wheel_of_Fortune", "justice": "Justice",
            "hanged man": "Hanged_Man", "death": "Death", "temperance": "Temperance",
            "devil": "The_Devil", "tower": "The_Tower", "star": "The_Star",
            "moon": "The_Moon_Tarot", "sun": "The_Sun_Tarot", "judgement": "Judgement",
            "world": "The_World",
            # Korean
            "바보": "The_Fool", "마법사": "The_Magician", "여사제": "High_Priestess",
            "여황제": "The_Empress", "황제": "The_Emperor", "교황": "Hierophant",
            "연인": "The_Lovers", "전차": "The_Chariot", "힘": "Strength",
            "은둔자": "The_Hermit", "운명의수레바퀴": "Wheel_of_Fortune", "정의": "Justice",
            "매달린사람": "Hanged_Man", "죽음": "Death", "절제": "Temperance",
            "악마": "The_Devil", "탑": "The_Tower", "별": "The_Star",
            "달타로": "The_Moon_Tarot", "태양타로": "The_Sun_Tarot", "심판": "Judgement",
            "세계": "The_World",
        }

    def extract(self, text: str) -> List[Entity]:
        """
        Extract all entities from text.

        Args:
            text: User query or context text

        Returns:
            List of extracted entities with types and normalized forms
        """
        entities = []
        text_lower = text.lower()

        # Extract each entity type
        entity_maps = [
            (self.planets, EntityType.PLANET),
            (self.signs, EntityType.SIGN),
            (self.houses, EntityType.HOUSE),
            (self.aspects, EntityType.ASPECT),
            (self.elements, EntityType.ELEMENT),
            (self.stems, EntityType.STEM),
            (self.branches, EntityType.BRANCH),
            (self.ten_gods, EntityType.TEN_GOD),
            (self.shinsals, EntityType.SHINSAL),
            (self.tarots, EntityType.TAROT),
        ]

        seen = set()
        for entity_map, entity_type in entity_maps:
            for pattern, normalized in entity_map.items():
                if pattern in text_lower and normalized not in seen:
                    entities.append(Entity(
                        text=pattern,
                        type=entity_type,
                        normalized=normalized,
                        confidence=1.0 if len(pattern) > 2 else 0.8,
                    ))
                    seen.add(normalized)

        # Also extract using regex for patterns like "Jupiter in Sagittarius"
        patterns = [
            (r"(\w+)\s+in\s+(\w+)", "planet_in_sign"),
            (r"(\w+)\s+house\s+(\w+)", "planet_in_house"),
            (r"(\w+)\s+(\w+)\s+(\w+)", "aspect_pattern"),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    for part in match:
                        # Check if part is a known entity
                        for entity_map, entity_type in entity_maps:
                            if part in entity_map and entity_map[part] not in seen:
                                entities.append(Entity(
                                    text=part,
                                    type=entity_type,
                                    normalized=entity_map[part],
                                    confidence=0.9,
                                    metadata={"pattern": pattern_type},
                                ))
                                seen.add(entity_map[part])

        return entities

    def extract_relations(self, text: str) -> List[Tuple[Entity, str, Entity]]:
        """
        Extract entity relations from text.

        Example: "Jupiter in Sagittarius" → (Jupiter, "in", Sagittarius)

        Returns:
            List of (entity1, relation, entity2) tuples
        """
        relations = []
        entities = self.extract(text)

        # Build entity lookup
        entity_lookup = {e.text: e for e in entities}

        # Pattern: "X in Y" (planet in sign/house)
        in_pattern = re.findall(r"(\w+)\s+in\s+(\w+)", text.lower())
        for src, dst in in_pattern:
            if src in entity_lookup and dst in entity_lookup:
                relations.append((
                    entity_lookup[src],
                    "in",
                    entity_lookup[dst]
                ))

        # Pattern: "X aspect Y" (planet aspects)
        for aspect_name in self.aspects.keys():
            aspect_pattern = re.findall(rf"(\w+)\s+{aspect_name}\s+(\w+)", text.lower())
            for src, dst in aspect_pattern:
                if src in entity_lookup and dst in entity_lookup:
                    relations.append((
                        entity_lookup[src],
                        aspect_name,
                        entity_lookup[dst]
                    ))

        return relations
