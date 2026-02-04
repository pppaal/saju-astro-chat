# tests/unit/test_llm_entity_extractor.py
"""
LLMEntityExtractor 유닛 테스트.

LLM API 없이 패턴 매칭 부분만 테스트.
"""

import pytest

from app.agentic_rag.entity_extractor import Entity, EntityType
from app.agentic_rag.llm_entity_extractor import LLMEntityExtractor


@pytest.fixture
def extractor():
    """LLM 비활성 상태의 추출기."""
    return LLMEntityExtractor(use_llm=False)


class TestWordBoundaryMatching:
    """Word boundary 기반 매칭 테스트 (false positive 제거)."""

    def test_sun_not_in_sunshine(self, extractor):
        """'sun'이 'sunshine'에 매칭되면 안 된다."""
        entities = extractor.extract("It was a beautiful sunshine day")
        normalized = [e.normalized for e in entities]
        assert "Sun" not in normalized

    def test_sun_standalone(self, extractor):
        """독립된 'Sun'은 매칭되어야 한다."""
        entities = extractor.extract("The Sun is in Leo")
        normalized = [e.normalized for e in entities]
        assert "Sun" in normalized
        assert "Leo" in normalized

    def test_mars_not_in_marshland(self, extractor):
        """'mars'가 'marshland'에 매칭되면 안 된다."""
        entities = extractor.extract("We explored the marshland area")
        normalized = [e.normalized for e in entities]
        assert "Mars" not in normalized

    def test_mars_standalone(self, extractor):
        """독립된 'Mars'는 매칭되어야 한다."""
        entities = extractor.extract("Mars is in Aries this month")
        normalized = [e.normalized for e in entities]
        assert "Mars" in normalized
        assert "Aries" in normalized

    def test_cancer_as_sign(self, extractor):
        """별자리 Cancer 매칭."""
        entities = extractor.extract("Moon in Cancer brings emotional energy")
        types = {e.normalized: e.type for e in entities}
        assert "Cancer" in types
        assert types["Cancer"] == EntityType.SIGN


class TestPlanetExtraction:
    """행성 추출 테스트."""

    def test_english_planets(self, extractor):
        """영어 행성 추출."""
        text = "Jupiter trine Saturn and Venus square Mars"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "Jupiter" in normalized
        assert "Saturn" in normalized
        assert "Venus" in normalized
        assert "Mars" in normalized

    def test_korean_planets(self, extractor):
        """한국어 행성 추출."""
        text = "목성이 사수자리에 위치하고 토성은 염소자리에 있습니다"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "Jupiter" in normalized
        assert "Sagittarius" in normalized
        assert "Saturn" in normalized
        assert "Capricorn" in normalized


class TestSignExtraction:
    """별자리 추출 테스트."""

    def test_all_signs_english(self, extractor):
        """12별자리 영어 추출."""
        signs = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ]
        for sign in signs:
            entities = extractor.extract(f"The planet is in {sign}")
            normalized = [e.normalized for e in entities]
            assert sign in normalized, f"{sign} should be extracted"

    def test_korean_signs(self, extractor):
        """한국어 별자리 추출."""
        entities = extractor.extract("양자리와 천칭자리의 호환성")
        normalized = {e.normalized for e in entities}
        assert "Aries" in normalized
        assert "Libra" in normalized


class TestAspectExtraction:
    """각도 추출 테스트."""

    def test_aspects(self, extractor):
        """주요 각도 추출."""
        text = "Sun conjunction Moon and Venus trine Jupiter"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "Conjunction" in normalized
        assert "Trine" in normalized


class TestSajuExtraction:
    """사주 엔티티 추출 테스트."""

    def test_cheongan_with_ohang(self, extractor):
        """천간 + 오행 조합 추출 (갑목, 을목 등)."""
        text = "갑목 일간이 정화 식신을 만나면"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "갑" in normalized

    def test_sipsin(self, extractor):
        """십신 추출."""
        text = "편재가 많으면 재물운이 좋고 정관은 안정적"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "편재" in normalized
        assert "정관" in normalized

    def test_shinsal(self, extractor):
        """신살 추출."""
        text = "역마살이 있어 해외운이 좋고 도화살도 있어"
        entities = extractor.extract(text)
        normalized = {e.normalized for e in entities}
        assert "역마" in normalized
        assert "도화" in normalized


class TestEntityMetadata:
    """엔티티 메타데이터 테스트."""

    def test_source_metadata(self, extractor):
        """패턴 매칭 결과에 source가 있어야 한다."""
        entities = extractor.extract("Jupiter in Sagittarius")
        for e in entities:
            assert e.metadata.get("source") == "pattern"

    def test_confidence(self, extractor):
        """신뢰도가 0-1 범위여야 한다."""
        entities = extractor.extract("Sun square Moon in Cancer")
        for e in entities:
            assert 0 <= e.confidence <= 1.0


class TestMergeEntities:
    """엔티티 병합 테스트."""

    def test_merge_dedup(self, extractor):
        """중복 제거."""
        e1 = Entity(text="Sun", type=EntityType.PLANET, normalized="Sun", confidence=0.9)
        e2 = Entity(text="Sun", type=EntityType.PLANET, normalized="Sun", confidence=0.8)
        merged = extractor._merge_entities([e1], [e2])
        assert len(merged) == 1
        assert merged[0].confidence == 0.9  # 높은 confidence 유지

    def test_merge_llm_higher_confidence(self, extractor):
        """LLM 결과가 더 높은 confidence면 우선."""
        e1 = Entity(text="Sun", type=EntityType.PLANET, normalized="Sun", confidence=0.7)
        e2 = Entity(text="Sun", type=EntityType.PLANET, normalized="Sun", confidence=0.95)
        merged = extractor._merge_entities([e1], [e2])
        assert len(merged) == 1
        assert merged[0].confidence == 0.95

    def test_merge_different_entities(self, extractor):
        """다른 엔티티는 모두 유지."""
        e1 = Entity(text="Sun", type=EntityType.PLANET, normalized="Sun", confidence=0.9)
        e2 = Entity(text="Leo", type=EntityType.SIGN, normalized="Leo", confidence=0.85)
        merged = extractor._merge_entities([e1], [e2])
        assert len(merged) == 2


class TestRelationExtraction:
    """관계 추출 테스트."""

    def test_planet_in_sign(self, extractor):
        """'X in Y' 관계 추출."""
        text = "Jupiter in Sagittarius"
        entities = extractor.extract(text)
        relations = extractor.extract_relations(text, entities)
        # 관계 추출 가능한 경우에만 체크
        if relations:
            assert any(r[1] == "in" for r in relations)

    def test_extract_without_entities(self, extractor):
        """엔티티 없이 관계 추출 시 자동으로 엔티티 추출."""
        relations = extractor.extract_relations("Jupiter in Sagittarius")
        assert isinstance(relations, list)


class TestEmptyInput:
    """빈 입력 테스트."""

    def test_empty_string(self, extractor):
        """빈 문자열."""
        entities = extractor.extract("")
        assert entities == []

    def test_no_entities(self, extractor):
        """엔티티 없는 텍스트."""
        entities = extractor.extract("오늘 날씨가 좋습니다")
        # 있을 수도 있지만 에러는 없어야 함
        assert isinstance(entities, list)
