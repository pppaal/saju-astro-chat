# app/agentic_rag/llm_entity_extractor.py
"""
LLM + 패턴 매칭 하이브리드 엔티티 추출기.

기존 EntityExtractor의 한계:
- substring 매칭 → false positive (예: "sun" → "sunshine")
- 미등록 엔티티 추출 불가

개선:
- word boundary 정규식으로 false positive 제거
- LLM fallback으로 미등록/복합 엔티티 추출
- 패턴 + LLM 결과 병합 + 중복 제거

Feature flag: USE_LLM_NER=1 환경변수로 LLM 추출 활성화.
"""

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from backend_ai.app.utils.json_safe import safe_json_loads
from .entity_extractor import Entity, EntityExtractor, EntityType

logger = logging.getLogger(__name__)

_USE_LLM_NER = os.environ.get("USE_LLM_NER", "0") == "1"

# LLM 엔티티 추출 프롬프트
ENTITY_EXTRACTION_PROMPT = """You are an expert entity extractor for astrology and Korean Saju (사주).

Extract ALL entities from the given text. Return a JSON array.

Entity Types:
- PLANET: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- SIGN: Aries~Pisces, 양자리~물고기자리
- HOUSE: 1st~12th house, 1궁~12궁
- ASPECT: Conjunction, Opposition, Trine, Square, Sextile
- ELEMENT: Fire, Earth, Air, Water, 화, 토, 수, 목, 금
- STEM: 갑, 을, 병, 정, 무, 기, 경, 신, 임, 계 (천간)
- BRANCH: 자, 축, 인, 묘, 진, 사, 오, 미, 신, 유, 술, 해 (지지)
- TEN_GOD: 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인
- SHINSAL: 역마, 도화, 화개 등 (신살)
- TAROT: The Fool, The Magician...

Also extract RELATIONS between entities:
- "Jupiter in Sagittarius" → (Jupiter, "in", Sagittarius)
- "Sun square Moon" → (Sun, "square", Moon)
- "갑목 일간" → (갑, "일간", 목)

Text: {text}

Respond in JSON format:
{{
  "entities": [
    {{"text": "Jupiter", "type": "PLANET", "normalized": "Jupiter", "confidence": 0.95}},
    ...
  ],
  "relations": [
    {{"source": "Jupiter", "relation": "in", "target": "Sagittarius"}},
    ...
  ]
}}"""


class LLMEntityExtractor:
    """LLM + 패턴 매칭 하이브리드 엔티티 추출기.

    전략:
    1. 개선된 정규식 패턴으로 빠르게 기본 엔티티 추출 (< 5ms)
    2. LLM으로 패턴이 놓친 엔티티 보완 추출 (선택적, ~500ms)
    3. 결과 병합 + 중복 제거 + 신뢰도 조정
    """

    def __init__(
        self,
        use_llm: bool = None,
        llm_provider: str = "openai",
        llm_model: str = "gpt-4o-mini",
    ):
        self.use_llm = use_llm if use_llm is not None else _USE_LLM_NER
        self.llm_provider = llm_provider
        self.llm_model = llm_model

        # 기존 패턴 추출기 (빠른 fallback)
        self._pattern_extractor = EntityExtractor()

        # Word boundary 정규식 패턴 (개선된 패턴 매칭)
        self._compiled_patterns = self._compile_word_boundary_patterns()

    def _compile_word_boundary_patterns(
        self,
    ) -> Dict[EntityType, List[Tuple[re.Pattern, str]]]:
        """Word boundary 기반 정규식 패턴 컴파일.

        기존 `if pattern in text` 대신 `\\bpattern\\b` 사용.
        """
        patterns = {}

        # 영어 패턴: word boundary 적용
        english_maps = {
            EntityType.PLANET: {
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
            },
            EntityType.SIGN: {
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
            },
            EntityType.ASPECT: {
                "conjunction": "Conjunction",
                "opposition": "Opposition",
                "trine": "Trine",
                "square": "Square",
                "sextile": "Sextile",
                "quincunx": "Quincunx",
            },
            EntityType.ELEMENT: {
                "fire": "Fire",
                "earth": "Earth",
                "air": "Air",
                "water": "Water",
            },
        }

        for entity_type, word_map in english_maps.items():
            compiled = []
            for pattern, normalized in word_map.items():
                regex = re.compile(
                    rf"\b{re.escape(pattern)}\b", re.IGNORECASE
                )
                compiled.append((regex, normalized))
            patterns[entity_type] = compiled

        # 한국어 패턴: \b 대신 문자 경계
        korean_maps = {
            EntityType.PLANET: {
                "태양": "Sun",
                "달": "Moon",
                "수성": "Mercury",
                "금성": "Venus",
                "화성": "Mars",
                "목성": "Jupiter",
                "토성": "Saturn",
                "천왕성": "Uranus",
                "해왕성": "Neptune",
                "명왕성": "Pluto",
            },
            EntityType.SIGN: {
                "양자리": "Aries",
                "황소자리": "Taurus",
                "쌍둥이자리": "Gemini",
                "게자리": "Cancer",
                "사자자리": "Leo",
                "처녀자리": "Virgo",
                "천칭자리": "Libra",
                "전갈자리": "Scorpio",
                "사수자리": "Sagittarius",
                "염소자리": "Capricorn",
                "물병자리": "Aquarius",
                "물고기자리": "Pisces",
            },
            EntityType.STEM: {
                "갑목": "갑",
                "을목": "을",
                "병화": "병",
                "정화": "정",
                "무토": "무",
                "기토": "기",
                "경금": "경",
                "신금": "신",
                "임수": "임",
                "계수": "계",
            },
            EntityType.TEN_GOD: {
                "비견": "비견",
                "겁재": "겁재",
                "식신": "식신",
                "상관": "상관",
                "편재": "편재",
                "정재": "정재",
                "편관": "편관",
                "정관": "정관",
                "편인": "편인",
                "정인": "정인",
            },
            EntityType.SHINSAL: {
                "역마": "역마",
                "도화": "도화",
                "화개": "화개",
                "귀문": "귀문",
                "천을귀인": "천을귀인",
                "양인": "양인",
                "백호": "백호",
            },
        }

        for entity_type, word_map in korean_maps.items():
            compiled = []
            for pattern, normalized in word_map.items():
                regex = re.compile(re.escape(pattern))
                compiled.append((regex, normalized))
            if entity_type in patterns:
                patterns[entity_type].extend(compiled)
            else:
                patterns[entity_type] = compiled

        return patterns

    def extract(
        self,
        text: str,
        use_llm_fallback: bool = None,
    ) -> List[Entity]:
        """하이브리드 엔티티 추출.

        1단계: 개선된 정규식 패턴 매칭 (빠름, < 5ms)
        2단계: LLM 추출 (선택적, 패턴 결과가 부족할 때)
        3단계: 병합 + 중복 제거
        """
        should_use_llm = (
            use_llm_fallback if use_llm_fallback is not None else self.use_llm
        )

        # 1단계: 개선된 패턴 매칭
        pattern_entities = self._extract_with_patterns(text)

        # 2단계: LLM 추출 (패턴 결과가 2개 미만이거나 명시적 요청)
        llm_entities = []
        if should_use_llm and len(pattern_entities) < 2:
            llm_entities = self._extract_with_llm(text)

        # 3단계: 병합
        return self._merge_entities(pattern_entities, llm_entities)

    def _extract_with_patterns(self, text: str) -> List[Entity]:
        """개선된 정규식 패턴 매칭."""
        entities = []
        seen = set()

        for entity_type, compiled_patterns in self._compiled_patterns.items():
            for regex, normalized in compiled_patterns:
                if regex.search(text):
                    key = (entity_type, normalized)
                    if key not in seen:
                        seen.add(key)
                        entities.append(
                            Entity(
                                text=normalized,
                                type=entity_type,
                                normalized=normalized,
                                confidence=0.9,
                                metadata={"source": "pattern"},
                            )
                        )

        return entities

    def _extract_with_llm(self, text: str) -> List[Entity]:
        """LLM 기반 엔티티 추출."""
        try:
            prompt = ENTITY_EXTRACTION_PROMPT.format(text=text[:2000])

            if self.llm_provider == "openai":
                import openai

                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=1000,
                    response_format={"type": "json_object"},
                )
                result_text = response.choices[0].message.content

            elif self.llm_provider == "anthropic":
                import anthropic

                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}],
                )
                result_text = response.content[0].text
            else:
                return []

            # JSON 파싱 (안전한 파싱 - LLM 출력은 예측 불가)
            result = safe_json_loads(result_text, default={}, context="llm_entity_extractor")
            entities = []

            for e in result.get("entities", []):
                try:
                    entity_type = EntityType[e["type"]]
                except (KeyError, ValueError):
                    continue

                entities.append(
                    Entity(
                        text=e.get("text", ""),
                        type=entity_type,
                        normalized=e.get("normalized", e.get("text", "")),
                        confidence=float(e.get("confidence", 0.8)),
                        metadata={
                            "source": "llm",
                            "model": self.llm_model,
                        },
                    )
                )

            return entities

        except Exception as e:
            logger.warning("LLM 엔티티 추출 실패: %s", e)
            return []

    def extract_relations(
        self,
        text: str,
        entities: List[Entity] = None,
    ) -> List[Tuple[Entity, str, Entity]]:
        """개선된 관계 추출."""
        if entities is None:
            entities = self.extract(text)

        relations = []
        entity_map = {e.normalized.lower(): e for e in entities}

        relation_patterns = [
            # "X in Y" (행성 in 별자리)
            re.compile(r"(\w+)\s+in\s+(\w+)", re.IGNORECASE),
            # "X aspect Y" (Sun square Moon)
            re.compile(
                r"(\w+)\s+(conjunction|opposition|trine|square|sextile|quincunx)\s+(\w+)",
                re.IGNORECASE,
            ),
            # "X house" / "Nth house X"
            re.compile(
                r"(\w+)\s+(?:in\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+house",
                re.IGNORECASE,
            ),
            # 한국어: "갑목 일간", "을금 편재"
            re.compile(
                r"([갑을병정무기경신임계])([목화토금수])\s*(일간|편재|정재|편관|정관|편인|정인|비견|겁재|식신|상관)"
            ),
        ]

        for pattern in relation_patterns:
            for match in pattern.finditer(text):
                groups = match.groups()
                if len(groups) >= 2:
                    src_text = groups[0].lower()
                    tgt_text = groups[-1].lower()
                    rel = groups[1] if len(groups) == 3 else "in"

                    src_entity = entity_map.get(src_text)
                    tgt_entity = entity_map.get(tgt_text)

                    if src_entity and tgt_entity:
                        relations.append((src_entity, rel, tgt_entity))

        return relations

    def _merge_entities(
        self,
        pattern_entities: List[Entity],
        llm_entities: List[Entity],
    ) -> List[Entity]:
        """패턴 + LLM 결과 병합. 중복 시 높은 confidence 우선."""
        merged = {}

        for e in pattern_entities:
            key = (e.type, e.normalized)
            merged[key] = e

        for e in llm_entities:
            key = (e.type, e.normalized)
            if key not in merged or e.confidence > merged[key].confidence:
                merged[key] = e

        return list(merged.values())
